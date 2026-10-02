'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/wallet/loading-state';
import { SuccessState } from '@/components/wallet/success-state';
import { ErrorState } from '@/components/wallet/error-state';
import { sendBitcoin, getSendQuote } from '@/lib/actions/wallet';
import { formatSats } from '@/lib/bitcoin/price';
import { LinkButton } from '@/components/ui/link-button';
import {
  isWalletError,
  isWalletSuccess,
  type WalletActionResult,
} from '@/types/wallet-actions';

type Step = 'form' | 'confirm' | 'processing' | 'success' | 'error';

export default function SendPage() {
  const [step, setStep] = useState<Step>('form');
  const [recipient, setRecipient] = useState('');
  const [amountSats, setAmountSats] = useState('10000');
  const [memo, setMemo] = useState('');
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getSendQuote>> | null>(null);
  const [result, setResult] = useState<WalletActionResult | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const idempotencyKey = useState(() => uuidv4())[0];

  async function handleConfirm() {
    const q = await getSendQuote(parseInt(amountSats, 10));
    setQuote(q);
    setStep('confirm');
  }

  async function handleSend() {
    setStep('processing');
    const res = await sendBitcoin({
      recipient,
      amountSats: parseInt(amountSats, 10),
      memo: memo || undefined,
      idempotencyKey,
      simulateFailure,
    });
    setResult(res);
    setStep(isWalletSuccess(res) ? 'success' : 'error');
  }

  return (
    <div>
      <AppHeader title="Send Bitcoin" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        {step === 'form' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient (Lightning invoice or address)</Label>
              <Input
                id="recipient"
                placeholder="user@example.com or lnbc..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (sats)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={amountSats}
                onChange={(e) => setAmountSats(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">Memo (optional)</Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
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
              onClick={handleConfirm}
              disabled={!recipient || !amountSats}
            >
              Send Bitcoin
            </Button>
          </>
        )}

        {step === 'confirm' && quote && (
          <>
            <Card>
              <CardContent className="space-y-3 p-6">
                <h3 className="text-lg font-semibold">Confirm Payment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span>{formatSats(quote.amountSats)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated fee</span>
                    <span>{formatSats(quote.feeSats)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatSats(quote.totalSats)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground">Recipient</span>
                    <p className="mt-1 break-all font-medium">{recipient}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button className="h-12 w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSend}>
              Confirm
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('form')}>
              Back
            </Button>
          </>
        )}

        {step === 'processing' && <LoadingState message="Sending Bitcoin..." />}
        {step === 'success' && isWalletSuccess(result) && typeof result.amountSats === 'number' && (
          <SuccessState
            title="Payment successful"
            message={`${formatSats(result.amountSats)} sent.`}
          >
            {typeof result.externalReference === 'string' && (
              <p className="text-xs text-muted-foreground">
                Transaction ID: {result.externalReference}
              </p>
            )}
            <LinkButton href="/dashboard" variant="outline">
              Back to dashboard
            </LinkButton>
          </SuccessState>
        )}
        {step === 'error' && (
          <ErrorState
            title="Payment failed"
            message={isWalletError(result) ? result.error : 'Please try again.'}
            onRetry={() => setStep('form')}
          />
        )}
      </div>
    </div>
  );
}
