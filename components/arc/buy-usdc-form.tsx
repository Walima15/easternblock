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
import { buyUsdc, getUsdcBuyQuote } from '@/lib/actions/arc';
import { formatZMW } from '@/lib/bitcoin/price';
import type { PaymentProviderType } from '@/lib/payments/payment-provider';
import {
  isWalletError,
  isWalletPending,
  isWalletSuccess,
  type WalletActionResult,
} from '@/types/wallet-actions';

type Quote = Awaited<ReturnType<typeof getUsdcBuyQuote>>;
type Step = 'amount' | 'payment' | 'confirm' | 'processing' | 'success' | 'error' | 'pending';

export function BuyUsdcForm({
  balanceUsdc,
  mode,
  initialQuote,
}: {
  balanceUsdc: string;
  mode: 'mock' | 'testnet';
  initialQuote: Extract<Quote, { ok: true }> | null;
}) {
  const [step, setStep] = useState<Step>('amount');
  const [amountZmw, setAmountZmw] = useState(initialQuote ? String(initialQuote.amountZmw) : '500');
  const [provider, setProvider] = useState<PaymentProviderType>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('0971234567');
  const [quote, setQuote] = useState<Quote | null>(initialQuote);
  const [result, setResult] = useState<WalletActionResult | null>(null);
  const [demoMode, setDemoMode] = useState<'normal' | 'fail' | 'pending'>('normal');
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());
  const parsedAmount = useMemo(() => parseFloat(amountZmw), [amountZmw]);
  const readyQuote = quote && quote.ok ? quote : null;

  async function refreshQuote() {
    if (!(parsedAmount > 0)) {
      setQuote(null);
      return null;
    }
    const next = await getUsdcBuyQuote(parsedAmount);
    setQuote(next);
    return next;
  }

  async function handlePay() {
    setStep('processing');
    const res = await buyUsdc({
      amountZmw: parseFloat(amountZmw),
      provider,
      phoneNumber: ['mtn', 'airtel', 'zamtel'].includes(provider) ? phoneNumber : undefined,
      idempotencyKey,
      simulateFailure: demoMode === 'fail',
      simulatePending: demoMode === 'pending',
    });
    setResult(res);
    if (isWalletPending(res)) setStep('pending');
    else if (isWalletSuccess(res)) setStep('success');
    else setStep('error');
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">USDC balance: {balanceUsdc} USDC</p>
      {mode === 'testnet' && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
          Testnet mode does not mint USDC. A kwacha payment is recorded, and test USDC comes from faucet.circle.com.
        </p>
      )}

      {step === 'amount' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ZMW)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">K</span>
              <Input
                id="amount"
                type="number"
                min="1"
                className="pl-8 text-lg"
                value={amountZmw}
                onChange={(e) => setAmountZmw(e.target.value)}
                onBlur={refreshQuote}
              />
            </div>
          </div>
          {readyQuote && (
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You pay</span>
                  <span>{formatZMW(readyQuote.amountZmw)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You receive</span>
                  <span className="font-semibold">{readyQuote.amountUsdc} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{readyQuote.rateLabel}</span>
                  <span>1 USDC = {formatZMW(readyQuote.zmwPerUsd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>{formatZMW(readyQuote.feeZmw)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatZMW(readyQuote.amountZmw)}</span>
                </div>
              </CardContent>
            </Card>
          )}
          {quote && !quote.ok && (
            <p className="text-sm text-destructive" role="alert">
              {quote.error}
            </p>
          )}
          <Button
            className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={async () => {
              const next = await refreshQuote();
              if (next?.ok) setStep('payment');
            }}
            disabled={!amountZmw || parsedAmount <= 0}
          >
            Continue
          </Button>
        </>
      )}

      {step === 'payment' && (
        <>
          <PaymentMethodCards selected={provider} onSelect={setProvider} />
          {['mtn', 'airtel', 'zamtel'].includes(provider) && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="097XXXXXXX"
              />
            </div>
          )}
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Demo test options</summary>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="usdc-demo" checked={demoMode === 'normal'} onChange={() => setDemoMode('normal')} />
                Normal success
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="usdc-demo" checked={demoMode === 'fail'} onChange={() => setDemoMode('fail')} />
                Simulate payment failure
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="usdc-demo" checked={demoMode === 'pending'} onChange={() => setDemoMode('pending')} />
                Simulate payment pending
              </label>
            </div>
          </details>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('amount')}>
              Back
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setStep('confirm')}>
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 'confirm' && readyQuote && (
        <>
          <Card>
            <CardContent className="space-y-3 p-6">
              <h3 className="font-semibold capitalize">{provider} payment</h3>
              {phoneNumber && <p className="text-sm text-muted-foreground">Phone: {phoneNumber}</p>}
              <p className="text-2xl font-bold">{formatZMW(readyQuote.amountZmw)}</p>
              <p className="text-sm">You will receive {readyQuote.amountUsdc} USDC</p>
              <p className="text-xs text-muted-foreground">
                {readyQuote.rateLabel}: 1 USDC = {formatZMW(readyQuote.zmwPerUsd)}. This is not a live market rate.
              </p>
            </CardContent>
          </Card>
          <Button className="h-12 w-full bg-emerald-600 hover:bg-emerald-700" onClick={handlePay}>
            Pay {formatZMW(readyQuote.amountZmw)}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep('payment')}>
            Back
          </Button>
        </>
      )}

      {step === 'processing' && <LoadingState message="Processing payment..." />}
      {step === 'pending' && (
        <PendingState title="Payment is still processing" message="Please wait and check your transaction history." />
      )}
      {step === 'success' && isWalletSuccess(result) && result.amountUsdc && (
        <SuccessState title="USDC purchase successful" message={result.message ?? `${result.amountUsdc} USDC added.`}>
          <LinkButton href="/dashboard" className="bg-emerald-600 hover:bg-emerald-700">
            Back to dashboard
          </LinkButton>
        </SuccessState>
      )}
      {step === 'error' && (
        <ErrorState
          title="Payment failed"
          message={isWalletError(result) ? result.error : 'Please try again.'}
          onRetry={() => {
            setIdempotencyKey(uuidv4());
            setStep('amount');
          }}
        />
      )}
    </>
  );
}
