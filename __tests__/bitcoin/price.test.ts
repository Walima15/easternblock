import { describe, it, expect } from 'vitest';
import {
  convertZMWToSats,
  convertSatsToZMW,
  getBTCZMWPrice,
  calculateServiceFeeZMW,
} from '@/lib/bitcoin/price';

describe('Bitcoin price conversion', () => {
  const btcPrice = 2_500_000;

  it('converts ZMW to sats correctly', () => {
    const sats = convertZMWToSats(2500, btcPrice);
    expect(sats).toBe(100_000);
  });

  it('converts sats to ZMW correctly', () => {
    const zmw = convertSatsToZMW(100_000, btcPrice);
    expect(zmw).toBe(2500);
  });

  it('returns mock BTC/ZMW price', async () => {
    const price = await getBTCZMWPrice();
    expect(price).toBeGreaterThan(0);
  });

  it('calculates service fee', () => {
    const fee = calculateServiceFeeZMW(500);
    expect(fee).toBeGreaterThan(0);
    expect(fee).toBeLessThan(500);
  });

  it('handles zero amounts', () => {
    expect(convertZMWToSats(0, btcPrice)).toBe(0);
    expect(convertSatsToZMW(0, btcPrice)).toBe(0);
  });
});
