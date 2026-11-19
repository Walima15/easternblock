'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parseBaseUnits, formatUsdcFromBaseUnits, parseUsdcInput } from '@/lib/arc/units';
import { getBTCZMWPrice, convertSatsToZMW } from '@/lib/bitcoin/price';
import { getUsdZmwQuote, usdcBaseUnitsToZmw } from '@/lib/fx/usd-zmw';
import {
  DEMO_PRICE_LABEL,
  DEMO_SWAP_SPREAD,
  planEvenSplit,
  quoteConversion,
  type SwapDirection,
} from '@/lib/portfolio/allocation';
import { requireSessionUserId } from '@/lib/auth/session';
import { checkIdempotency, completeIdempotency } from '@/lib/security/idempotency';
import { checkRateLimit, logAuditEvent } from '@/lib/security/rate-limit';
import {
  createTransaction,
  getWallet,
  updateArcBalance,
  updateWalletBalance,
} from '@/lib/db/local-store';
import type { WalletActionResult } from '@/types/wallet-actions';

const swapSchema = z.object({
  idempotencyKey: z.string().uuid(),
  intent: z.enum(['swap', 'rebalance']),
  direction: z.enum(['btc-to-usdc', 'usdc-to-btc']).optional(),
  amountSats: z.number().int().positive().optional(),
  amountUsdc: z.string().optional(),
});

function revalidateWallet() {
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/swap');
  revalidatePath('/send');
  revalidatePath('/receive');
  revalidatePath('/usdc/send');
  revalidatePath('/usdc/receive');
}

export async function rebalanceToEven(input: unknown): Promise<WalletActionResult> {
  const parsed = swapSchema.safeParse({ ...(typeof input === 'object' && input ? input : {}), intent: 'rebalance' });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  return executeSwap(parsed.data);
}

export async function swapAssets(input: unknown): Promise<WalletActionResult> {
  const parsed = swapSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  return executeSwap(parsed.data);
}

async function executeSwap(input: z.infer<typeof swapSchema>): Promise<WalletActionResult> {
  const userId = await requireSessionUserId();
  const rateLimit = await checkRateLimit(`swap:${userId}`);
  if (!rateLimit.allowed) return { error: 'Too many requests. Please wait.' };

  const wallet = await getWallet(userId);
  if (!wallet) return { error: 'Wallet not found' };

  const [btcZmw, fx] = await Promise.all([getBTCZMWPrice(), getUsdZmwQuote()]);
  const prices = { btcZmw, zmwPerUsd: fx.zmwPerUsd };
  const usdcBaseUnits = parseBaseUnits(wallet.arc_balance_base_units);

  let direction: SwapDirection;
  let spendSats = 0;
  let spendUsdcBaseUnits = 0n;
  let receiveSats = 0;
  let receiveUsdcBaseUnits = 0n;
  let memo: string;

  if (input.intent === 'rebalance') {
    const plan = planEvenSplit({
      balanceSats: wallet.balance_sats,
      usdcBaseUnits,
      prices,
    });
    if (!plan.needed) {
      return { success: true, message: plan.reason };
    }
    direction = plan.direction;
    spendSats = plan.spendSats;
    spendUsdcBaseUnits = plan.spendUsdcBaseUnits;
    receiveSats = plan.receiveSats;
    receiveUsdcBaseUnits = plan.receiveUsdcBaseUnits;
    memo = `Keep 50/50 · ${DEMO_PRICE_LABEL}. No spread on rebalance.`;
  } else {
    if (!input.direction) return { error: 'Choose which way to swap.' };
    direction = input.direction;
    if (direction === 'btc-to-usdc') {
      if (!input.amountSats) return { error: 'Enter an amount of sats.' };
      spendSats = input.amountSats;
    } else {
      const parsedAmount = parseUsdcInput(input.amountUsdc ?? '');
      if (parsedAmount == null) return { error: 'Enter a USDC amount such as 10.00.' };
      spendUsdcBaseUnits = parsedAmount;
    }
    const quote = quoteConversion({
      direction,
      spendSats,
      spendUsdcBaseUnits,
      prices,
      spread: DEMO_SWAP_SPREAD,
    });
    if ('error' in quote) return { error: quote.error };
    receiveSats = quote.receiveSats;
    receiveUsdcBaseUnits = quote.receiveUsdcBaseUnits;
    memo = `${DEMO_PRICE_LABEL}. Includes a 0.5% demo spread.`;
  }

  if (direction === 'btc-to-usdc' && wallet.balance_sats < spendSats) {
    return { error: 'Insufficient Bitcoin balance.' };
  }
  if (direction === 'usdc-to-btc' && usdcBaseUnits < spendUsdcBaseUnits) {
    return { error: 'Insufficient USDC balance.' };
  }

  const existing = await checkIdempotency(userId, input.idempotencyKey, input.intent);
  if (existing.exists) {
    return (existing.response as WalletActionResult) ?? { success: true, duplicate: true };
  }

  const nextSats = direction === 'btc-to-usdc' ? wallet.balance_sats - spendSats : wallet.balance_sats + receiveSats;
  const nextUsdc = direction === 'btc-to-usdc' ? usdcBaseUnits + receiveUsdcBaseUnits : usdcBaseUnits - spendUsdcBaseUnits;

  await updateWalletBalance(wallet.id, nextSats);
  await updateArcBalance(wallet.id, nextUsdc.toString());

  const receivedAsset = direction === 'btc-to-usdc' ? 'usdc' : 'btc';
  const amountZmw =
    receivedAsset === 'usdc'
      ? usdcBaseUnitsToZmw(receiveUsdcBaseUnits, fx.zmwPerUsd)
      : convertSatsToZMW(receiveSats, btcZmw);

  const transaction = await createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'swap',
    status: 'completed',
    asset: receivedAsset,
    amount_sats: receivedAsset === 'btc' ? receiveSats : spendSats,
    amount_usdc_base_units: (receivedAsset === 'usdc' ? receiveUsdcBaseUnits : spendUsdcBaseUnits).toString(),
    amount_zmw: amountZmw,
    fee_sats: 0,
    fee_usdc_base_units: null,
    payment_method: null,
    recipient: null,
    sender: null,
    memo,
    external_reference: null,
    counter_asset: direction === 'btc-to-usdc' ? 'btc' : 'usdc',
    counter_sats: direction === 'btc-to-usdc' ? spendSats : receiveSats,
    counter_usdc_base_units: (direction === 'btc-to-usdc' ? receiveUsdcBaseUnits : spendUsdcBaseUnits).toString(),
  });

  await logAuditEvent({
    userId,
    action: input.intent === 'rebalance' ? 'rebalance_50_50' : 'swap_assets',
    resourceType: 'transaction',
    resourceId: transaction.id,
    metadata: { direction, demoPrice: true },
  });

  const response: WalletActionResult = {
    success: true,
    transactionId: transaction.id,
    message:
      input.intent === 'rebalance'
        ? 'Rebalanced toward 50/50 at the demo price.'
        : `Swapped at the demo price. ${DEMO_PRICE_LABEL}.`,
    amountSats: receivedAsset === 'btc' ? receiveSats : spendSats,
    amountUsdc: formatUsdcFromBaseUnits(receivedAsset === 'usdc' ? receiveUsdcBaseUnits : spendUsdcBaseUnits),
    newBalance: nextSats,
    newUsdcBalance: formatUsdcFromBaseUnits(nextUsdc),
  };
  await completeIdempotency(userId, input.idempotencyKey, transaction.id, response);
  revalidateWallet();
  return response;
}
