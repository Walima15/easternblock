'use client';

import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentMethodCards } from '@/components/payments/payment-method-cards';
import { LoadingState } from '@/components/wallet/loading-state';
import { SuccessState } from '@/components/wallet/success-state';
import { ErrorState } from '@/components/wallet/error-state';
import { sellBitcoin, getSellQuote } from '@/lib/actions/wallet';
import { formatZMW } from '@/lib/bitcoin/price';
import type { PaymentProviderType } from '@/lib/payments/payment-provider';
import { LinkButton } from '@/components/ui/link-button';
import {
  isWalletError,
  isWalletSuccess,
  type WalletActionResult,
} from '@/types/wallet-actions';

type Step = 'form' | 'processing' | 'success' | 'error';

export default function SellPage() {
  const [step, setStep] = useState<Step>('form');
  const [amountSats, setAmountSats] = useState('10000');
  const [provider, setProvider] = useState<PaymentProviderType>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('0971234567');
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getSellQuote>> | null>(null);
  const parsedSats = useMemo(() => parseInt(amountSats, 10), [amountSats]);

  async function refreshQuote() {
    if (parsedSats > 0) {
      setQuote(await getSellQuote(parsedSats));
    } else {
      setQuote(null);
    }
  }

  const [result, setResult] = useState<WalletActionResult | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const idempotencyKey = useState(() => uuidv4())[0];

  async function handleSell() {
    await refreshQuote();
    setStep('processing');
    const res = await sellBitcoin({
      amountSats: parseInt(amountSats, 10),
      provider,
      phoneNumber,
      idempotencyKey,
      simulateFailure,
    });
    setResult(res);
    setStep(isWalletSuccess(res) ? 'success' : 'error');
  }

  return (
    <div>
      <AppHeader title="Sell Bitcoin" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        {step === 'form' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="sats">Amount (sats)</Label>
              <Input
                id="sats"
                type="number"
                min="1"
                value={amountSats}
                onChange={(e) => setAmountSats(e.target.value)}
                onBlur={refreshQuote}
              />
            </div>
            {quote && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">You receive approximately</p>
                  <p className="text-2xl font-bold">{formatZMW(quote.amountZmw)}</p>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              <Label>Destination</Label>
              <PaymentMethodCards
                selected={provider}
                onSelect={setProvider}
                exclude={['visa']}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone / account</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
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
              disabled={!amountSats || parseInt(amountSats, 10) <= 0}
            >
              Sell Bitcoin
            </Button>
          </>
        )}
        {step === 'processing' && <LoadingState message="Processing sale..." />}
        {step === 'success' && isWalletSuccess(result) && typeof result.message === 'string' && (
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
            onRetry={() => setStep('form')}
          />
        )}
      </div>
    </div>
  );
}
