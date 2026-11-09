'use client';

import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentMethodCards } from '@/components/payments/payment-method-cards';
import { LoadingState } from '@/components/wallet/loading-state';
import { SuccessState } from '@/components/wallet/success-state';
import { ErrorState } from '@/components/wallet/error-state';
import { PendingState } from '@/components/wallet/pending-state';
import { LinkButton } from '@/components/ui/link-button';
import { getUsdcSellQuote, sellUsdc } from '@/lib/actions/arc';
import { formatZMW } from '@/lib/bitcoin/price';
import type { PaymentProviderType } from '@/lib/payments/payment-provider';
import { isWalletError, isWalletPending, isWalletSuccess, type WalletActionResult } from '@/types/wallet-actions';

type Quote = Awaited<ReturnType<typeof getUsdcSellQuote>>;
type Step = 'form' | 'processing' | 'success' | 'error' | 'pending';

export function SellUsdcForm({
  balanceUsdc,
  mode,
  initialQuote,
}: {
  balanceUsdc: string;
  mode: 'mock' | 'testnet';
  initialQuote: Extract<Quote, { ok: true }> | null;
}) {
  const [step, setStep] = useState<Step>('form');
  const [amountUsdc, setAmountUsdc] = useState(initialQuote?.amountUsdc ?? '10');
  const [provider, setProvider] = useState<PaymentProviderType>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('0971234567');
  const [quote, setQuote] = useState<Quote | null>(initialQuote);
  const [result, setResult] = useState<WalletActionResult | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());
  const parsed = useMemo(() => amountUsdc.trim(), [amountUsdc]);
  const readyQuote = quote && quote.ok ? quote : null;

  async function refreshQuote() {
    if (!parsed) {
      setQuote(null);
      return null;
    }
    const next = await getUsdcSellQuote(parsed);
    setQuote(next);
    return next;
  }

  async function handleSell() {
    const next = await refreshQuote();
    if (!next?.ok) return;
    setStep('processing');
    const res = await sellUsdc({
      amountUsdc: parsed,
      provider,
      phoneNumber,
      idempotencyKey,
      simulateFailure,
    });
    setResult(res);
    if (isWalletPending(res)) setStep('pending');
    else setStep(isWalletSuccess(res) ? 'success' : 'error');
  }

  return (
    <>
      {step === 'form' && (
        <>
          <p className="text-sm text-muted-foreground">Available: {balanceUsdc} USDC</p>
          {mode === 'testnet' && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
              This payout is simulated. Selling does not move USDC on Arc testnet.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="usdc">Amount (USDC)</Label>
            <Input
              id="usdc"
              inputMode="decimal"
              value={amountUsdc}
              onChange={(e) => setAmountUsdc(e.target.value)}
              onBlur={refreshQuote}
            />
          </div>
          {readyQuote && (
            <Card>
              <CardContent className="space-y-1 p-4">
                <p className="text-sm text-muted-foreground">You receive approximately</p>
                <p className="text-2xl font-bold">{formatZMW(readyQuote.amountZmw)}</p>
                <p className="text-xs text-muted-foreground">
                  {readyQuote.rateLabel}: 1 USDC = {formatZMW(readyQuote.zmwPerUsd)}
                </p>
              </CardContent>
            </Card>
          )}
          {quote && !quote.ok && (
            <p className="text-sm text-destructive" role="alert">
              {quote.error}
            </p>
          )}
          <div className="space-y-2">
            <Label>Destination</Label>
            <PaymentMethodCards selected={provider} onSelect={setProvider} exclude={['visa']} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone / account</Label>
            <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
            />
            Simulate failure (demo)
          </label>
          <Button
            className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSell}
            disabled={!parsed}
          >
            Sell USDC
          </Button>
        </>
      )}
      {step === 'processing' && <LoadingState message="Processing sale..." />}
      {step === 'pending' && (
        <PendingState title="Payout is still processing" message="Your USDC has not been sold yet." />
      )}
      {step === 'success' && isWalletSuccess(result) && result.message && (
        <SuccessState title="Sale successful" message={result.message}>
          <LinkButton href="/dashboard" variant="outline">
            Back to dashboard
          </LinkButton>
        </SuccessState>
      )}
      {step === 'error' && (
        <ErrorState
          title="Sale failed"
          message={isWalletError(result) ? result.error : 'Please try again.'}
          onRetry={() => {
            setIdempotencyKey(uuidv4());
            setStep('form');
          }}
        />
      )}
    </>
  );
}
