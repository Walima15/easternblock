'use server';

import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getArcService } from '@/lib/arc/arc-service';
import { validateArcRecipient, normalizeArcAddress } from '@/lib/arc/address';
import { getArcMode } from '@/lib/arc/constants';
import { MockArcService } from '@/lib/arc/mock-arc';
import {
  formatUsdcFromBaseUnits,
  parseBaseUnits,
  parseUsdcInput,
  validateUsdcTransferAmount,
} from '@/lib/arc/units';
import { calculateServiceFeeZMW } from '@/lib/bitcoin/price';
import {
  getUsdZmwQuote,
  usdcBaseUnitsToZmw,
  zmwToUsdcBaseUnits,
} from '@/lib/fx/usd-zmw';
import { getPaymentProvider } from '@/lib/payments/payment-provider';
import {
  buyUsdcSchema,
  receiveUsdcSchema,
  sellUsdcSchema,
  sendUsdcSchema,
} from '@/lib/security/validation';
import { checkIdempotency, completeIdempotency } from '@/lib/security/idempotency';
import { checkRateLimit, logAuditEvent } from '@/lib/security/rate-limit';
import { requireSessionUserId } from '@/lib/auth/session';
import {
  createPayment,
  createTransaction,
  getArcSigningKey,
  getWallet,
  getWalletByArcAddress,
  updateArcBalance,
  updatePaymentByTransactionId,
  updateTransaction,
} from '@/lib/db/local-store';
import type { WalletActionResult } from '@/types/wallet-actions';

function revalidateUsdc() {
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/settings');
  revalidatePath('/usdc/buy');
  revalidatePath('/usdc/sell');
  revalidatePath('/usdc/send');
  revalidatePath('/usdc/receive');
}

async function remembered(
  userId: string,
  key: string,
  operation: string
): Promise<WalletActionResult | null> {
  const existing = await checkIdempotency(userId, key, operation);
  if (!existing.exists) return null;
  return (existing.response as WalletActionResult) ?? { error: 'This request was already submitted.' };
}

export async function getUsdcSnapshot() {
  const userId = await requireSessionUserId();
  const wallet = getWallet(userId);
  const quote = await getUsdZmwQuote();
  const mode = getArcMode();
  let baseUnits = parseBaseUnits(wallet?.arc_balance_base_units);
  let source: 'ledger' | 'chain' = 'ledger';

  if (mode === 'testnet' && wallet?.arc_address) {
    try {
      const service = await getArcService();
      baseUnits = await service.getUsdcBalance(wallet.arc_address);
      source = 'chain';
    } catch {
      source = 'ledger';
    }
  }

  return {
    balanceUsdc: formatUsdcFromBaseUnits(baseUnits),
    balanceZmw: usdcBaseUnitsToZmw(baseUnits, quote.zmwPerUsd),
    zmwPerUsd: quote.zmwPerUsd,
    rateLabel: quote.label,
    address: wallet?.arc_address ?? '',
    mode,
    source,
  };
}

export type UsdcBuyQuote =
  | { ok: false; error: string }
  | {
      ok: true;
      amountZmw: number;
      feeZmw: number;
      netZmw: number;
      amountUsdc: string;
      amountBaseUnits: string;
      zmwPerUsd: number;
      rateLabel: string;
    };

export async function getUsdcBuyQuote(amountZmw: number): Promise<UsdcBuyQuote> {
  if (!Number.isFinite(amountZmw) || amountZmw <= 0) {
    return { ok: false, error: 'Amount must be greater than zero.' };
  }
  if (amountZmw > 1_000_000) {
    return { ok: false, error: 'Amount cannot exceed K1,000,000.' };
  }
  const quote = await getUsdZmwQuote();
  const feeZmw = calculateServiceFeeZMW(amountZmw);
  const netZmw = Math.round((amountZmw - feeZmw) * 100) / 100;
  const amountBaseUnits = zmwToUsdcBaseUnits(netZmw, quote.zmwPerUsd);
  const amountError = validateUsdcTransferAmount(amountBaseUnits);
  if (amountError) return { ok: false, error: amountError };
  return {
    ok: true,
    amountZmw,
    feeZmw,
    netZmw,
    amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits),
    amountBaseUnits: amountBaseUnits.toString(),
    zmwPerUsd: quote.zmwPerUsd,
    rateLabel: quote.label,
  };
}

export type UsdcSellQuote =
  | { ok: false; error: string }
  | {
      ok: true;
      amountUsdc: string;
      amountBaseUnits: string;
      amountZmw: number;
      zmwPerUsd: number;
      rateLabel: string;
    };

export async function getUsdcSellQuote(amountUsdc: string): Promise<UsdcSellQuote> {
  const amountBaseUnits = parseUsdcInput(amountUsdc);
  if (amountBaseUnits == null) return { ok: false, error: 'Enter a USDC amount such as 10.00.' };
  const amountError = validateUsdcTransferAmount(amountBaseUnits);
  if (amountError) return { ok: false, error: amountError };
  const quote = await getUsdZmwQuote();
  return {
    ok: true,
    amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits),
    amountBaseUnits: amountBaseUnits.toString(),
    amountZmw: usdcBaseUnitsToZmw(amountBaseUnits, quote.zmwPerUsd),
    zmwPerUsd: quote.zmwPerUsd,
    rateLabel: quote.label,
  };
}

export type UsdcSendQuote =
  | { ok: false; error: string }
  | {
      ok: true;
      amountUsdc: string;
      feeUsdc: string;
      totalUsdc: string;
      amountBaseUnits: string;
      feeBaseUnits: string;
      mode: 'mock' | 'testnet';
    };

export async function getUsdcSendQuote(amountUsdc: string, recipient?: string): Promise<UsdcSendQuote> {
  const amountBaseUnits = parseUsdcInput(amountUsdc);
  if (amountBaseUnits == null) return { ok: false, error: 'Enter a USDC amount such as 10.00.' };
  const amountError = validateUsdcTransferAmount(amountBaseUnits);
  if (amountError) return { ok: false, error: amountError };

  const userId = await requireSessionUserId();
  const wallet = getWallet(userId);
  if (!wallet) return { ok: false, error: 'Wallet not found' };
  if (recipient) {
    const recipientError = validateArcRecipient(recipient, wallet.arc_address);
    if (recipientError) return { ok: false, error: recipientError };
  }

  const service = await getArcService();
  const feeBaseUnits = await service.estimateSendFee({
    fromAddress: wallet.arc_address,
    toAddress: recipient ?? '0x1111111111111111111111111111111111111111',
    amountBaseUnits,
  });

  const total = amountBaseUnits + feeBaseUnits;
  return {
    ok: true,
    amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits),
    feeUsdc: formatUsdcFromBaseUnits(feeBaseUnits),
    totalUsdc: formatUsdcFromBaseUnits(total),
    amountBaseUnits: amountBaseUnits.toString(),
    feeBaseUnits: feeBaseUnits.toString(),
    mode: service.mode,
  };
}

export async function buyUsdc(input: unknown): Promise<WalletActionResult> {
  const parsed = buyUsdcSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const userId = await requireSessionUserId();
  const rateLimit = await checkRateLimit(`buy-usdc:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const quote = await getUsdcBuyQuote(parsed.data.amountZmw);
  if (!quote.ok) return { error: quote.error };

  const rememberedResult = await remembered(userId, parsed.data.idempotencyKey, 'buy_usdc');
  if (rememberedResult) return rememberedResult;

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const mode = getArcMode();
  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'buy',
    status: 'pending',
    amount_sats: 0,
    amount_zmw: parsed.data.amountZmw,
    fee_sats: 0,
    payment_method: parsed.data.provider,
    recipient: null,
    sender: null,
    memo: mode === 'testnet' ? 'Demo kwacha ramp. Testnet USDC is not minted by this app.' : null,
    external_reference: null,
    asset: 'usdc',
    amount_usdc_base_units: quote.amountBaseUnits,
  });

  const provider = getPaymentProvider(parsed.data.provider);
  const initResult = await provider.initializePayment({
    amountZmw: parsed.data.amountZmw,
    phoneNumber: parsed.data.phoneNumber,
    reference: transaction.id,
    simulateFailure: parsed.data.simulateFailure,
    simulatePending: parsed.data.simulatePending,
  });

  createPayment({
    user_id: userId,
    transaction_id: transaction.id,
    provider: parsed.data.provider,
    provider_reference: initResult.providerReference,
    amount_zmw: parsed.data.amountZmw,
    currency: 'ZMW',
    status: initResult.status,
    phone_number: parsed.data.phoneNumber ?? null,
  });

  updateTransaction(transaction.id, { status: 'processing' });
  const statusResult = await provider.checkPaymentStatus(initResult.providerReference);

  if (statusResult.status === 'pending') {
    const response: WalletActionResult = {
      success: false,
      pending: true,
      transactionId: transaction.id,
      message: 'Payment is still processing. Please wait.',
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  }

  if (statusResult.status === 'failed') {
    updateTransaction(transaction.id, { status: 'failed' });
    updatePaymentByTransactionId(transaction.id, { status: 'failed' });
    const response: WalletActionResult = {
      success: false,
      error: 'Payment failed. Please try again.',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  }

  let newUsdcBalance = formatUsdcFromBaseUnits(parseBaseUnits(wallet.arc_balance_base_units));
  if (mode === 'mock') {
    const service = new MockArcService();
    service.setBalance(wallet.arc_address, parseBaseUnits(wallet.arc_balance_base_units));
    const received = await service.receiveUsdc(wallet.arc_address, BigInt(quote.amountBaseUnits));
    if (!received.success || received.balanceBaseUnits == null) {
      updateTransaction(transaction.id, { status: 'failed' });
      const response: WalletActionResult = {
        success: false,
        error: received.error ?? 'Could not credit USDC.',
        transactionId: transaction.id,
      };
      await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
      return response;
    }
    updateArcBalance(wallet.id, received.balanceBaseUnits.toString());
    newUsdcBalance = formatUsdcFromBaseUnits(received.balanceBaseUnits);
  }

  updateTransaction(transaction.id, {
    status: 'completed',
    external_reference: initResult.providerReference,
  });
  updatePaymentByTransactionId(transaction.id, { status: 'completed' });

  await logAuditEvent({
    userId,
    action: 'buy_usdc',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: {
      amountUsdc: quote.amountUsdc,
      amountZmw: parsed.data.amountZmw,
      provider: parsed.data.provider,
      mode,
    },
  });

  const response: WalletActionResult = {
    success: true,
    transactionId: transaction.id,
    amountUsdc: quote.amountUsdc,
    amountZmw: parsed.data.amountZmw,
    newUsdcBalance,
    message:
      mode === 'testnet'
        ? 'Kwacha payment recorded in demo mode. Arc testnet does not mint USDC here. Add test USDC from faucet.circle.com. Your on-chain balance is unchanged.'
        : `${quote.amountUsdc} USDC added to your wallet.`,
  };
  await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
  revalidateUsdc();
  return response;
}

export async function sellUsdc(input: unknown): Promise<WalletActionResult> {
  const parsed = sellUsdcSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const userId = await requireSessionUserId();
  const rateLimit = await checkRateLimit(`sell-usdc:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const quote = await getUsdcSellQuote(parsed.data.amountUsdc);
  if (!quote.ok) return { error: quote.error };

  const rememberedResult = await remembered(userId, parsed.data.idempotencyKey, 'sell_usdc');
  if (rememberedResult) return rememberedResult;

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const mode = getArcMode();
  if (mode === 'mock') {
    const balance = parseBaseUnits(wallet.arc_balance_base_units);
    if (balance < BigInt(quote.amountBaseUnits)) {
      const response: WalletActionResult = { error: 'Insufficient USDC balance.' };
      await completeIdempotency(userId, parsed.data.idempotencyKey, uuidv4(), response);
      return response;
    }
  } else {
    try {
      const service = await getArcService();
      const chainBalance = await service.getUsdcBalance(wallet.arc_address);
      if (chainBalance < BigInt(quote.amountBaseUnits)) {
        const response: WalletActionResult = { error: 'Insufficient USDC balance on Arc.' };
        await completeIdempotency(userId, parsed.data.idempotencyKey, uuidv4(), response);
        return response;
      }
    } catch {
      const response: WalletActionResult = {
        error: 'Could not reach Arc testnet. Check ARC_RPC_URL and try again.',
      };
      await completeIdempotency(userId, parsed.data.idempotencyKey, uuidv4(), response);
      return response;
    }
  }

  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'sell',
    status: 'pending',
    amount_sats: 0,
    amount_zmw: quote.amountZmw,
    fee_sats: 0,
    payment_method: parsed.data.provider,
    recipient: null,
    sender: null,
    memo: mode === 'testnet' ? 'Demo kwacha payout. On-chain USDC was not moved.' : null,
    external_reference: null,
    asset: 'usdc',
    amount_usdc_base_units: quote.amountBaseUnits,
  });

  updateTransaction(transaction.id, { status: 'processing' });

  const provider = getPaymentProvider(parsed.data.provider);
  const initResult = await provider.initializePayment({
    amountZmw: quote.amountZmw,
    phoneNumber: parsed.data.phoneNumber,
    reference: transaction.id,
    simulateFailure: parsed.data.simulateFailure,
    simulatePending: parsed.data.simulatePending,
  });

  createPayment({
    user_id: userId,
    transaction_id: transaction.id,
    provider: parsed.data.provider,
    provider_reference: initResult.providerReference,
    amount_zmw: quote.amountZmw,
    currency: 'ZMW',
    status: initResult.status,
    phone_number: parsed.data.phoneNumber ?? null,
  });

  const statusResult = await provider.checkPaymentStatus(initResult.providerReference);

  if (statusResult.status === 'pending') {
    const response: WalletActionResult = {
      success: false,
      pending: true,
      transactionId: transaction.id,
      message: 'Payout is still processing. Please wait.',
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  }

  if (statusResult.status === 'failed') {
    updateTransaction(transaction.id, { status: 'failed' });
    updatePaymentByTransactionId(transaction.id, { status: 'failed' });
    const response: WalletActionResult = {
      success: false,
      error: 'Payout failed. Your USDC was not sold.',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  }

  let newUsdcBalance = formatUsdcFromBaseUnits(parseBaseUnits(wallet.arc_balance_base_units));
  if (mode === 'mock') {
    const next = parseBaseUnits(wallet.arc_balance_base_units) - BigInt(quote.amountBaseUnits);
    updateArcBalance(wallet.id, next.toString());
    newUsdcBalance = formatUsdcFromBaseUnits(next);
  }

  updateTransaction(transaction.id, {
    status: 'completed',
    external_reference: initResult.providerReference,
  });
  updatePaymentByTransactionId(transaction.id, { status: 'completed' });

  await logAuditEvent({
    userId,
    action: 'sell_usdc',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: {
      amountUsdc: quote.amountUsdc,
      amountZmw: quote.amountZmw,
      provider: parsed.data.provider,
      mode,
    },
  });

  const response: WalletActionResult = {
    success: true,
    transactionId: transaction.id,
    amountUsdc: quote.amountUsdc,
    amountZmw: quote.amountZmw,
    newUsdcBalance,
    message:
      mode === 'testnet'
        ? `Demo payout of K${quote.amountZmw.toFixed(2)} recorded. Your on-chain USDC stays in the wallet.`
        : `K${quote.amountZmw.toFixed(2)} will be sent to your selected destination in DEMO MODE.`,
  };
  await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
  revalidateUsdc();
  return response;
}

export async function sendUsdc(input: unknown): Promise<WalletActionResult> {
  const parsed = sendUsdcSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const userId = await requireSessionUserId();
  const rateLimit = await checkRateLimit(`send-usdc:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const recipientError = validateArcRecipient(parsed.data.recipient, wallet.arc_address);
  if (recipientError) return { error: recipientError };
  const amountBaseUnits = parseUsdcInput(parsed.data.amountUsdc);
  if (amountBaseUnits == null) return { error: 'Enter a USDC amount such as 10.00.' };
  const amountError = validateUsdcTransferAmount(amountBaseUnits);
  if (amountError) return { error: amountError };

  const rememberedResult = await remembered(userId, parsed.data.idempotencyKey, 'send_usdc');
  if (rememberedResult) return rememberedResult;

  const mode = getArcMode();
  const quote = await getUsdZmwQuote();
  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'send',
    status: 'pending',
    amount_sats: 0,
    amount_zmw: usdcBaseUnitsToZmw(amountBaseUnits, quote.zmwPerUsd),
    fee_sats: 0,
    payment_method: null,
    recipient: normalizeArcAddress(parsed.data.recipient),
    sender: wallet.arc_address,
    memo: parsed.data.memo ?? null,
    external_reference: null,
    asset: 'usdc',
    amount_usdc_base_units: amountBaseUnits.toString(),
  });

  updateTransaction(transaction.id, { status: 'processing' });

  if (parsed.data.simulateFailure) {
    updateTransaction(transaction.id, { status: 'failed' });
    const response: WalletActionResult = {
      success: false,
      error: 'Transfer failed (demo).',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  }

  try {
    const service = await getArcService();
    if (service.mode === 'mock') {
      (service as MockArcService).setBalance(
        wallet.arc_address,
        parseBaseUnits(wallet.arc_balance_base_units)
      );
    }
    const privateKey = mode === 'testnet' ? getArcSigningKey(userId) ?? undefined : undefined;
    const result = await service.sendUsdc({
      fromAddress: wallet.arc_address,
      toAddress: parsed.data.recipient,
      amountBaseUnits,
      memo: parsed.data.memo,
      privateKey,
    });

    if (!result.success || result.balanceBaseUnits == null) {
      updateTransaction(transaction.id, {
        status: 'failed',
        tx_hash: result.txHash ?? null,
        explorer_url: result.txHash ? service.explorerTxUrl(result.txHash) : null,
      });
      const response: WalletActionResult = {
        success: false,
        error: result.error ?? 'Transfer failed. Please try again.',
        transactionId: transaction.id,
      };
      await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
      revalidateUsdc();
      return response;
    }

    if (service.mode === 'mock') {
      updateArcBalance(wallet.id, result.balanceBaseUnits.toString());
      const recipientWallet = getWalletByArcAddress(parsed.data.recipient);
      if (recipientWallet && recipientWallet.id !== wallet.id) {
        const credited = parseBaseUnits(recipientWallet.arc_balance_base_units) + amountBaseUnits;
        updateArcBalance(recipientWallet.id, credited.toString());
        createTransaction({
          user_id: recipientWallet.user_id,
          wallet_id: recipientWallet.id,
          type: 'receive',
          status: 'completed',
          amount_sats: 0,
          amount_zmw: usdcBaseUnitsToZmw(amountBaseUnits, quote.zmwPerUsd),
          fee_sats: 0,
          payment_method: null,
          recipient: recipientWallet.arc_address,
          sender: wallet.arc_address,
          memo: parsed.data.memo ?? null,
          external_reference: result.txHash ?? null,
          asset: 'usdc',
          amount_usdc_base_units: amountBaseUnits.toString(),
          tx_hash: result.txHash ?? null,
        });
      }
    }

    const explorerUrl = result.txHash ? service.explorerTxUrl(result.txHash) : null;
    updateTransaction(transaction.id, {
      status: 'completed',
      external_reference: result.txHash ?? null,
      tx_hash: result.txHash ?? null,
      explorer_url: explorerUrl,
      fee_usdc_base_units: result.feeBaseUnits?.toString() ?? null,
    });

    await logAuditEvent({
      userId,
      action: 'send_usdc',
      resourceType: 'transaction',
      resourceId: transaction.id,
      metadata: {
        amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits),
        recipient: normalizeArcAddress(parsed.data.recipient),
        txHash: result.txHash,
        mode,
      },
    });

    const response: WalletActionResult = {
      success: true,
      transactionId: transaction.id,
      externalReference: result.txHash,
      explorerUrl,
      amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits),
      feeUsdc: formatUsdcFromBaseUnits(result.feeBaseUnits ?? 0n),
      newUsdcBalance: formatUsdcFromBaseUnits(result.balanceBaseUnits),
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  } catch {
    updateTransaction(transaction.id, { status: 'failed' });
    const response: WalletActionResult = {
      success: false,
      error: 'Could not reach Arc. Please try again.',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidateUsdc();
    return response;
  }
}

export async function simulateReceiveUsdc(input: unknown): Promise<WalletActionResult> {
  const parsed = receiveUsdcSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const userId = await requireSessionUserId();
  const rateLimit = await checkRateLimit(`receive-usdc:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  if (getArcMode() === 'testnet') {
    return {
      error: 'On Arc testnet, receive USDC by transfer. The Circle faucet is at faucet.circle.com.',
    };
  }

  const amountBaseUnits = parseUsdcInput(parsed.data.amountUsdc);
  if (amountBaseUnits == null) return { error: 'Enter a USDC amount such as 10.00.' };
  const amountError = validateUsdcTransferAmount(amountBaseUnits);
  if (amountError) return { error: amountError };

  const rememberedResult = await remembered(userId, parsed.data.idempotencyKey, 'receive_usdc');
  if (rememberedResult) return rememberedResult;

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const service = new MockArcService();
  service.setBalance(wallet.arc_address, parseBaseUnits(wallet.arc_balance_base_units));
  const received = await service.receiveUsdc(wallet.arc_address, amountBaseUnits, parsed.data.memo);
  if (!received.success || received.balanceBaseUnits == null) {
    const response: WalletActionResult = { error: received.error ?? 'Could not receive USDC.' };
    await completeIdempotency(userId, parsed.data.idempotencyKey, uuidv4(), response);
    return response;
  }

  updateArcBalance(wallet.id, received.balanceBaseUnits.toString());
  const quote = await getUsdZmwQuote();
  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'receive',
    status: 'completed',
    amount_sats: 0,
    amount_zmw: usdcBaseUnitsToZmw(amountBaseUnits, quote.zmwPerUsd),
    fee_sats: 0,
    payment_method: null,
    recipient: wallet.arc_address,
    sender: 'demo-sender',
    memo: parsed.data.memo ?? 'Demo receive',
    external_reference: received.txHash ?? null,
    asset: 'usdc',
    amount_usdc_base_units: amountBaseUnits.toString(),
    tx_hash: received.txHash ?? null,
  });

  await logAuditEvent({
    userId,
    action: 'receive_usdc',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: { amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits) },
  });

  const response: WalletActionResult = {
    success: true,
    transactionId: transaction.id,
    amountUsdc: formatUsdcFromBaseUnits(amountBaseUnits),
    newUsdcBalance: formatUsdcFromBaseUnits(received.balanceBaseUnits),
  };
  await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
  revalidateUsdc();
  return response;
}
