import { describe, expect, it } from 'vitest';
import {
  DEMO_SWAP_SPREAD,
  holdingUsd,
  planEvenSplit,
  quoteConversion,
} from '@/lib/portfolio/allocation';

const prices = { btcZmw: 2_500_000, zmwPerUsd: 27.5 };

describe('portfolio split', () => {
  it('prices an empty wallet as zero and a 100 USDC wallet as half for rebalance', () => {
    const empty = holdingUsd(0, 0n, prices);
    expect(empty.totalUsd).toBe(0);
    expect(empty.totalZmw).toBe(0);

    const plan = planEvenSplit({ balanceSats: 0, usdcBaseUnits: 100_000_000n, prices });
    expect(plan.needed).toBe(true);
    expect(plan.direction).toBe('usdc-to-btc');
    expect(plan.spendUsdcBaseUnits).toBe(50_000_000n);
    expect(plan.receiveSats).toBe(55_000);
  });

  it('leaves an even split alone', () => {
    const plan = planEvenSplit({ balanceSats: 55_000, usdcBaseUnits: 50_000_000n, prices });
    expect(plan.needed).toBe(false);
    expect(plan.reason).toMatch(/50\/50/);
    const holding = holdingUsd(55_000, 50_000_000n, prices);
    expect(holding.btcUsd).toBe(50);
    expect(holding.usdcUsd).toBe(50);
    expect(holding.totalZmw).toBe(2750);
  });

  it('applies the labelled demo spread on a manual swap', () => {
    const quote = quoteConversion({
      direction: 'usdc-to-btc',
      spendUsdcBaseUnits: 100_000_000n,
      prices,
      spread: DEMO_SWAP_SPREAD,
    });
    expect('error' in quote).toBe(false);
    if ('error' in quote) return;
    expect(quote.spendUsd).toBe(100);
    expect(quote.receiveUsd).toBe(99.5);
    expect(quote.feeUsd).toBe(0.5);
    expect(quote.receiveSats).toBe(109_450);
  });
});
