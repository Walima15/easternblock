'use client';

import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { formatSats, formatZMW } from '@/lib/bitcoin/price';
import { formatUsdcFromBaseUnits, parseUsdcInput } from '@/lib/arc/units';
import {
  DEMO_PRICE_LABEL,
  DEMO_SWAP_SPREAD,
  formatUsd,
  quoteConversion,
  type SwapDirection,
} from '@/lib/portfolio/allocation';
import { swapAssets } from '@/lib/actions/swap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { RebalanceButton } from '@/components/wallet/rebalance-button';
import { isWalletError, isWalletSuccess } from '@/types/wallet-actions';

export function SwapForm({
  balanceSats,
  usdcBaseUnits,
  btcZmw,
  zmwPerUsd,
}: {
  balanceSats: number;
  usdcBaseUnits: string;
  btcZmw: number;
  zmwPerUsd: number;
}) {
  const [direction, setDirection] = useState<SwapDirection>('usdc-to-btc');
  const [amount, setAmount] = useState('25');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [key, setKey] = useState(() => uuidv4());
  const prices = useMemo(() => ({ btcZmw, zmwPerUsd }), [btcZmw, zmwPerUsd]);

  const quote = useMemo(() => {
    if (direction === 'usdc-to-btc') {
      const base = parseUsdcInput(amount);
      if (base == null) return { error: 'Enter a USDC amount such as 10.00.' };
      return quoteConversion({
        direction,
        spendUsdcBaseUnits: base,
        prices,
        spread: DEMO_SWAP_SPREAD,
      });
    }
    const sats = Number.parseInt(amount, 10);
    if (!Number.isFinite(sats) || sats <= 0) return { error: 'Enter an amount of sats.' };
    return quoteConversion({ direction, spendSats: sats, prices, spread: DEMO_SWAP_SPREAD });
  }, [amount, direction, prices]);

  async function onSwap() {
    if ('error' in quote) {
      toast.error(quote.error);
      return;
    }
    setPending(true);
    const result = await swapAssets({
      intent: 'swap',
      idempotencyKey: key,
      direction,
      amountSats: direction === 'btc-to-usdc' ? Number.parseInt(amount, 10) : undefined,
      amountUsdc: direction === 'usdc-to-btc' ? amount : undefined,
    });
    setPending(false);
    if (isWalletError(result)) {
      toast.error(result.error);
      return;
    }
    if (isWalletSuccess(result)) {
      setDone(result.message ?? 'Swap complete.');
      setKey(uuidv4());
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Swap recorded</h2>
          <p className="text-sm text-muted-foreground">{done}</p>
          <LinkButton href="/dashboard" className="w-full">Back to dashboard</LinkButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Swap direction">
        <button
          type="button"
          role="tab"
          aria-selected={direction === 'usdc-to-btc'}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${direction === 'usdc-to-btc' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => {
            setDirection('usdc-to-btc');
            setAmount('25');
          }}
        >
          USDC → Bitcoin
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={direction === 'btc-to-usdc'}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${direction === 'btc-to-usdc' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => {
            setDirection('btc-to-usdc');
            setAmount('50000');
          }}
        >
          Bitcoin → USDC
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="swap-amount">
          {direction === 'usdc-to-btc' ? 'USDC to swap' : 'Sats to swap'}
        </Label>
        <Input
          id="swap-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Available{' '}
          {direction === 'usdc-to-btc'
            ? `${formatUsdcFromBaseUnits(BigInt(usdcBaseUnits || '0'))} USDC`
            : formatSats(balanceSats)}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          {'error' in quote ? (
            <p className="text-muted-foreground">{quote.error}</p>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You spend</span>
                <span>{formatUsd(quote.spendUsd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Demo spread (0.5%)</span>
                <span>{formatUsd(quote.feeUsd)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>You receive</span>
                <span>
                  {quote.direction === 'usdc-to-btc'
                    ? formatSats(quote.receiveSats)
                    : `${formatUsdcFromBaseUnits(quote.receiveUsdcBaseUnits)} USDC`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                About {formatZMW(quote.receiveUsd * zmwPerUsd)}. {DEMO_PRICE_LABEL}.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Button
        className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
        onClick={onSwap}
        disabled={pending || 'error' in quote}
      >
        {pending ? 'Swapping…' : 'Swap at demo price'}
      </Button>
      <RebalanceButton />
    </div>
  );
}
