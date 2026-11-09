/**
 * Kwacha value of one US dollar (and therefore of one USDC in this demo).
 * This is a fixed sample rate, not a market price. Swap the provider when a
 * live feed, such as a Bank of Zambia rate, is available.
 */
export const DEMO_USD_ZMW_RATE = 27.5;

export interface UsdZmwQuote {
  zmwPerUsd: number;
  source: 'demo' | 'live';
  label: string;
}

export interface UsdZmwRateProvider {
  getQuote(): Promise<UsdZmwQuote>;
}

export class DemoUsdZmwRateProvider implements UsdZmwRateProvider {
  async getQuote(): Promise<UsdZmwQuote> {
    return {
      zmwPerUsd: DEMO_USD_ZMW_RATE,
      source: 'demo',
      label: 'Demo rate',
    };
  }
}

export function getUsdZmwRateProvider(): UsdZmwRateProvider {
  return new DemoUsdZmwRateProvider();
}

export async function getUsdZmwQuote(): Promise<UsdZmwQuote> {
  return getUsdZmwRateProvider().getQuote();
}

/** Convert ERC-20 base units (6 decimals) to kwacha at the given demo or live rate. */
export function usdcBaseUnitsToZmw(baseUnits: bigint, zmwPerUsd: number): number {
  if (baseUnits <= 0n || zmwPerUsd <= 0) return 0;
  const rateCents = BigInt(Math.round(zmwPerUsd * 100));
  const cents = (baseUnits * rateCents) / 1_000_000n;
  return Number(cents) / 100;
}

/** Convert kwacha into ERC-20 base units. USDC is treated as one US dollar. */
export function zmwToUsdcBaseUnits(zmw: number, zmwPerUsd: number): bigint {
  if (zmw <= 0 || zmwPerUsd <= 0) return 0n;
  const zmwCents = BigInt(Math.round(zmw * 100));
  const rateCents = BigInt(Math.round(zmwPerUsd * 100));
  if (rateCents <= 0n) return 0n;
  return (zmwCents * 1_000_000n) / rateCents;
}
