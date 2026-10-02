'use server';

import { revalidatePath } from 'next/cache';
import {
  getBTCZMWPrice,
  convertZMWToSats,
  convertSatsToZMW,
  calculateServiceFeeZMW,
  calculateLightningFeeSats,
} from '@/lib/bitcoin/price';
import { getPaymentProvider } from '@/lib/payments/payment-provider';
import { mockLightningService } from '@/lib/lightning/mock-lightning';
import {
  buySchema,
  sellSchema,
  sendSchema,
  receiveSchema,
  isLightningInvoice,
  isLightningAddress,
} from '@/lib/security/validation';
import {
  checkIdempotency,
  completeIdempotency,
} from '@/lib/security/idempotency';
import { checkRateLimit, logAuditEvent } from '@/lib/security/rate-limit';
import { requireSessionUserId } from '@/lib/auth/session';
import {
  createPayment,
  createTransaction,
  getAdminStats as getAdminStatsFromStore,
  getProfile,
  getWallet,
  updatePaymentByTransactionId,
  updateTransaction,
  updateWalletBalance,
} from '@/lib/db/local-store';
import { v4 as uuidv4 } from 'uuid';
import type { WalletActionResult } from '@/types/wallet-actions';

async function requireUser() {
  const userId = await requireSessionUserId();
  return { userId };
}

export async function buyBitcoin(input: unknown): Promise<WalletActionResult> {
  const parsed = buySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { userId } = await requireUser();
  const rateLimit = await checkRateLimit(`buy:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const idempotency = await checkIdempotency(
    userId,
    parsed.data.idempotencyKey,
    'buy'
  );
  if (idempotency.exists) {
    return (idempotency.response as WalletActionResult) ?? { success: true, duplicate: true };
  }

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const btcPrice = await getBTCZMWPrice();
  const feeZmw = calculateServiceFeeZMW(parsed.data.amountZmw);
  const netZmw = parsed.data.amountZmw - feeZmw;
  const amountSats = convertZMWToSats(netZmw, btcPrice);

  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'buy',
    status: 'pending',
    amount_sats: amountSats,
    amount_zmw: parsed.data.amountZmw,
    fee_sats: 0,
    payment_method: parsed.data.provider,
    recipient: null,
    sender: null,
    memo: null,
    external_reference: null,
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
    revalidatePath('/dashboard');
    return response;
  }

  if (statusResult.status === 'failed') {
    updateTransaction(transaction.id, { status: 'failed' });
    updatePaymentByTransactionId(transaction.id, { status: 'failed' });
    const response = {
      success: false as const,
      error: 'Payment failed. Please try again.',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidatePath('/dashboard');
    return response;
  }

  const newBalance = wallet.balance_sats + amountSats;
  updateWalletBalance(wallet.id, newBalance);
  updateTransaction(transaction.id, {
    status: 'completed',
    external_reference: initResult.providerReference,
  });
  updatePaymentByTransactionId(transaction.id, { status: 'completed' });

  await logAuditEvent({
    userId,
    action: 'buy_bitcoin',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: { amountSats, amountZmw: parsed.data.amountZmw },
  });

  const response = {
    success: true as const,
    transactionId: transaction.id,
    amountSats,
    amountZmw: parsed.data.amountZmw,
    newBalance,
  };
  await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return response;
}

export async function sellBitcoin(input: unknown): Promise<WalletActionResult> {
  const parsed = sellSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { userId } = await requireUser();
  const rateLimit = await checkRateLimit(`sell:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const idempotency = await checkIdempotency(
    userId,
    parsed.data.idempotencyKey,
    'sell'
  );
  if (idempotency.exists) {
    return (idempotency.response as WalletActionResult) ?? { success: true, duplicate: true };
  }

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };
  if (wallet.balance_sats < parsed.data.amountSats) {
    return { error: 'Insufficient balance' };
  }

  const btcPrice = await getBTCZMWPrice();
  const amountZmw = convertSatsToZMW(parsed.data.amountSats, btcPrice);

  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'sell',
    status: 'pending',
    amount_sats: parsed.data.amountSats,
    amount_zmw: amountZmw,
    fee_sats: 0,
    payment_method: parsed.data.provider,
    recipient: null,
    sender: null,
    memo: null,
    external_reference: null,
  });

  updateTransaction(transaction.id, { status: 'processing' });

  if (parsed.data.simulateFailure) {
    updateTransaction(transaction.id, { status: 'failed' });
    const response = {
      success: false as const,
      error: 'Sale failed. Please try again.',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    return response;
  }

  const newBalance = wallet.balance_sats - parsed.data.amountSats;
  updateWalletBalance(wallet.id, newBalance);
  updateTransaction(transaction.id, { status: 'completed' });

  await logAuditEvent({
    userId,
    action: 'sell_bitcoin',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: { amountSats: parsed.data.amountSats, amountZmw },
  });

  const response = {
    success: true as const,
    transactionId: transaction.id,
    amountSats: parsed.data.amountSats,
    amountZmw,
    newBalance,
    message: `K${amountZmw.toFixed(2)} will be sent to your selected destination in DEMO MODE.`,
  };
  await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return response;
}

export async function sendBitcoin(input: unknown): Promise<WalletActionResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { userId } = await requireUser();
  const rateLimit = await checkRateLimit(`send:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const idempotency = await checkIdempotency(
    userId,
    parsed.data.idempotencyKey,
    'send'
  );
  if (idempotency.exists) {
    return (idempotency.response as WalletActionResult) ?? { success: true, duplicate: true };
  }

  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const feeSats = calculateLightningFeeSats(parsed.data.amountSats);
  const totalSats = parsed.data.amountSats + feeSats;

  if (wallet.balance_sats < totalSats) {
    return { error: 'Insufficient balance' };
  }

  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'send',
    status: 'pending',
    amount_sats: parsed.data.amountSats,
    amount_zmw: null,
    fee_sats: feeSats,
    payment_method: null,
    recipient: parsed.data.recipient,
    sender: null,
    memo: parsed.data.memo ?? null,
    external_reference: null,
  });

  updateTransaction(transaction.id, { status: 'processing' });

  mockLightningService.setBalance(wallet.balance_sats);
  let paymentResult;

  if (isLightningInvoice(parsed.data.recipient)) {
    paymentResult = await mockLightningService.payInvoice(
      parsed.data.recipient,
      parsed.data.amountSats
    );
  } else if (isLightningAddress(parsed.data.recipient)) {
    paymentResult = await mockLightningService.payLightningAddress(
      parsed.data.recipient,
      parsed.data.amountSats,
      parsed.data.memo
    );
  } else {
    updateTransaction(transaction.id, { status: 'failed' });
    return { error: 'Invalid Lightning invoice or address' };
  }

  if (parsed.data.simulateFailure) {
    paymentResult = {
      success: false,
      transactionId: '',
      feeSats: 0,
      error: 'Payment failed (demo)',
    };
  }

  if (!paymentResult.success) {
    updateTransaction(transaction.id, { status: 'failed' });
    const response = {
      success: false as const,
      error: paymentResult.error ?? 'Payment failed. Please try again.',
      transactionId: transaction.id,
    };
    await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
    revalidatePath('/dashboard');
    return response;
  }

  const newBalance = wallet.balance_sats - totalSats;
  updateWalletBalance(wallet.id, newBalance);
  updateTransaction(transaction.id, {
    status: 'completed',
    external_reference: paymentResult.transactionId,
  });

  await logAuditEvent({
    userId,
    action: 'send_bitcoin',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: { amountSats: parsed.data.amountSats, recipient: parsed.data.recipient },
  });

  const response = {
    success: true as const,
    transactionId: transaction.id,
    externalReference: paymentResult.transactionId,
    amountSats: parsed.data.amountSats,
    feeSats,
    newBalance,
  };
  await completeIdempotency(userId, parsed.data.idempotencyKey, transaction.id, response);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return response;
}

export async function createReceiveInvoice(input: unknown) {
  const parsed = receiveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const userId = await requireSessionUserId();
  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const amountSats = parsed.data.amountSats ?? 0;
  mockLightningService.setLightningAddress(wallet.lightning_address);

  const invoice =
    amountSats > 0
      ? await mockLightningService.createInvoice(amountSats, parsed.data.memo)
      : null;

  return {
    success: true,
    lightningAddress: wallet.lightning_address,
    invoice: invoice
      ? {
          paymentRequest: invoice.paymentRequest,
          amountSats: invoice.amountSats,
          memo: invoice.memo,
        }
      : null,
  };
}

export async function simulateReceiveBitcoin(input: {
  amountSats: number;
  memo?: string;
  idempotencyKey: string;
}): Promise<WalletActionResult> {
  const userId = await requireSessionUserId();
  const wallet = getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const idempotency = await checkIdempotency(userId, input.idempotencyKey, 'receive');
  if (idempotency.exists) {
    return (idempotency.response as WalletActionResult) ?? { success: true, duplicate: true };
  }

  const transaction = createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'receive',
    status: 'processing',
    amount_sats: input.amountSats,
    amount_zmw: null,
    fee_sats: 0,
    payment_method: null,
    recipient: null,
    sender: 'demo-sender@easternblock.app',
    memo: input.memo ?? 'Demo receive',
    external_reference: null,
  });

  await new Promise((r) => setTimeout(r, 1000));

  const newBalance = wallet.balance_sats + input.amountSats;
  updateWalletBalance(wallet.id, newBalance);
  updateTransaction(transaction.id, {
    status: 'completed',
    external_reference: uuidv4(),
  });

  const response = {
    success: true as const,
    transactionId: transaction.id,
    amountSats: input.amountSats,
    newBalance,
  };
  await completeIdempotency(userId, input.idempotencyKey, transaction.id, response);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return response;
}

export async function getBuyQuote(amountZmw: number) {
  const btcPrice = await getBTCZMWPrice();
  const feeZmw = calculateServiceFeeZMW(amountZmw);
  const netZmw = amountZmw - feeZmw;
  const amountSats = convertZMWToSats(netZmw, btcPrice);
  return { amountZmw, feeZmw, netZmw, amountSats, btcPrice };
}

export async function getSellQuote(amountSats: number) {
  const btcPrice = await getBTCZMWPrice();
  const amountZmw = convertSatsToZMW(amountSats, btcPrice);
  return { amountSats, amountZmw, btcPrice };
}

export async function getSendQuote(amountSats: number) {
  const feeSats = calculateLightningFeeSats(amountSats);
  return { amountSats, feeSats, totalSats: amountSats + feeSats };
}

export async function getAdminStats() {
  const userId = await requireSessionUserId();
  const profile = getProfile(userId);
  const isAdmin = profile?.full_name?.toLowerCase().includes('admin');
  if (!isAdmin) return null;
  return getAdminStatsFromStore();
}
