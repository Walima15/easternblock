import { convertSatsToZMW, convertZMWToSats } from '@/lib/bitcoin/price';

/** Shown wherever a BTC/USDC conversion uses the sample rate. */
export const DEMO_PRICE_LABEL = 'Demo price, not a live market';
/** Taken from the amount received on a manual swap. Rebalance uses no spread. */
export const DEMO_SWAP_SPREAD = 0.005;

export interface PriceContext {
  btcZmw: number;
  zmwPerUsd: number;
}

export type SwapDirection = 'btc-to-usdc' | 'usdc-to-btc';

export interface HoldingUsd {
  btcUsd: number;
  usdcUsd: number;
  totalUsd: number;
  totalZmw: number;
  btcPct: number;
  usdcPct: number;
}

export interface SwapQuote {
  direction: SwapDirection;
  spendSats: number;
  spendUsdcBaseUnits: bigint;
  receiveSats: number;
  receiveUsdcBaseUnits: bigint;
  spendUsd: number;
  receiveUsd: number;
  feeUsd: number;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function btcUsdValue(sats: number, prices: PriceContext): number {
  if (sats <= 0 || prices.btcZmw <= 0 || prices.zmwPerUsd <= 0) return 0;
  return convertSatsToZMW(sats, prices.btcZmw) / prices.zmwPerUsd;
}

export function usdcUsdValue(baseUnits: bigint): number {
  if (baseUnits <= 0n) return 0;
  return Number(baseUnits) / 1_000_000;
}

export function usdToSats(usd: number, prices: PriceContext): number {
  if (usd <= 0 || prices.zmwPerUsd <= 0) return 0;
  return convertZMWToSats(usd * prices.zmwPerUsd, prices.btcZmw);
}

export function usdToUsdcBaseUnits(usd: number): bigint {
  if (usd <= 0) return 0n;
  return BigInt(Math.round(usd * 1_000_000));
}

export function holdingUsd(
  balanceSats: number,
  usdcBaseUnits: bigint,
  prices: PriceContext
): HoldingUsd {
  const btcUsd = round2(btcUsdValue(balanceSats, prices));
  const usdcUsd = round2(usdcUsdValue(usdcBaseUnits));
  const totalUsd = round2(btcUsd + usdcUsd);
  const btcPct = totalUsd <= 0 ? 0 : (btcUsd / totalUsd) * 100;
  const usdcPct = totalUsd <= 0 ? 0 : (usdcUsd / totalUsd) * 100;
  return {
    btcUsd,
    usdcUsd,
    totalUsd,
    totalZmw: round2(totalUsd * prices.zmwPerUsd),
    btcPct,
    usdcPct,
  };
}

export function quoteConversion(input: {
  direction: SwapDirection;
  spendSats?: number;
  spendUsdcBaseUnits?: bigint;
  prices: PriceContext;
  spread?: number;
}): SwapQuote | { error: string } {
  const spread = input.spread ?? 0;
  const spendSats = input.direction === 'btc-to-usdc' ? Math.floor(input.spendSats ?? 0) : 0;
  const spendUsdcBaseUnits = input.direction === 'usdc-to-btc' ? input.spendUsdcBaseUnits ?? 0n : 0n;
  const spendUsd =
    input.direction === 'btc-to-usdc'
      ? btcUsdValue(spendSats, input.prices)
      : usdcUsdValue(spendUsdcBaseUnits);

  if (spendUsd <= 0) return { error: 'Enter an amount to swap.' };

  const receiveUsd = spendUsd * (1 - spread);
  const feeUsd = round2(spendUsd - receiveUsd);
  if (input.direction === 'btc-to-usdc') {
    const receiveUsdcBaseUnits = usdToUsdcBaseUnits(receiveUsd);
    if (receiveUsdcBaseUnits < 10_000n) {
      return { error: 'That amount is too small to swap at the demo price.' };
    }
    return {
      direction: input.direction,
      spendSats,
      spendUsdcBaseUnits: 0n,
      receiveSats: 0,
      receiveUsdcBaseUnits,
      spendUsd: round2(spendUsd),
      receiveUsd: round2(receiveUsd),
      feeUsd,
    };
  }

  const receiveSats = usdToSats(receiveUsd, input.prices);
  if (receiveSats < 1) return { error: 'That amount is too small to swap at the demo price.' };
  return {
    direction: input.direction,
    spendSats: 0,
    spendUsdcBaseUnits,
    receiveSats,
    receiveUsdcBaseUnits: 0n,
    spendUsd: round2(spendUsd),
    receiveUsd: round2(receiveUsd),
    feeUsd,
  };
}

export function planEvenSplit(input: {
  balanceSats: number;
  usdcBaseUnits: bigint;
  prices: PriceContext;
}): SwapQuote & { needed: boolean; reason: string } {
  const holding = holdingUsd(input.balanceSats, input.usdcBaseUnits, input.prices);
  const empty: SwapQuote & { needed: boolean; reason: string } = {
    needed: false,
    reason: 'Add USDC or Bitcoin before rebalancing.',
    direction: 'btc-to-usdc',
    spendSats: 0,
    spendUsdcBaseUnits: 0n,
    receiveSats: 0,
    receiveUsdcBaseUnits: 0n,
    spendUsd: 0,
    receiveUsd: 0,
    feeUsd: 0,
  };
  if (holding.totalUsd < 0.02) return empty;

  const target = holding.totalUsd / 2;
  const drift = Math.abs(holding.btcUsd - target) / holding.totalUsd;
  if (drift < 0.01) {
    return { ...empty, reason: 'Already within 1% of a 50/50 split.' };
  }

  if (holding.btcUsd > target) {
    const spendUsd = holding.btcUsd - target;
    let spendSats = usdToSats(spendUsd, input.prices);
    if (spendSats > input.balanceSats) spendSats = input.balanceSats;
    const quote = quoteConversion({
      direction: 'btc-to-usdc',
      spendSats,
      prices: input.prices,
      spread: 0,
    });
    if ('error' in quote) return { ...empty, reason: quote.error };
    return { ...quote, needed: true, reason: 'Move Bitcoin into USDC to reach 50/50.' };
  }

  const spendUsd = holding.usdcUsd - target;
  let spendUsdcBaseUnits = usdToUsdcBaseUnits(spendUsd);
  if (spendUsdcBaseUnits > input.usdcBaseUnits) spendUsdcBaseUnits = input.usdcBaseUnits;
  const quote = quoteConversion({
    direction: 'usdc-to-btc',
    spendUsdcBaseUnits,
    prices: input.prices,
    spread: 0,
  });
  if ('error' in quote) return { ...empty, reason: quote.error };
  return { ...quote, needed: true, reason: 'Move USDC into Bitcoin to reach 50/50.' };
}
