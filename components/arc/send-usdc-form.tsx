'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/wallet/loading-state';
import { SuccessState } from '@/components/wallet/success-state';
import { ErrorState } from '@/components/wallet/error-state';
import { LinkButton } from '@/components/ui/link-button';
import { getUsdcSendQuote, sendUsdc } from '@/lib/actions/arc';
import { isWalletError, isWalletSuccess, type WalletActionResult } from '@/types/wallet-actions';

type Step = 'form' | 'confirm' | 'processing' | 'success' | 'error';

export function SendUsdcForm({
  balanceUsdc,
  mode,
}: {
  balanceUsdc: string;
  mode: 'mock' | 'testnet';
}) {
  const [step, setStep] = useState<Step>('form');
  const [recipient, setRecipient] = useState('');
  const [amountUsdc, setAmountUsdc] = useState('1.50');
  const [memo, setMemo] = useState('');
  const [formError, setFormError] = useState('');
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getUsdcSendQuote>> | null>(null);
  const [result, setResult] = useState<WalletActionResult | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());

  async function handleConfirm() {
    setFormError('');
    const nextQuote = await getUsdcSendQuote(amountUsdc, recipient);
    if (!nextQuote.ok) {
      setFormError(nextQuote.error);
      return;
    }
    setQuote(nextQuote);
    setStep('confirm');
  }

  async function handleSend() {
    setStep('processing');
    const res = await sendUsdc({
      recipient,
      amountUsdc,
      memo: memo || undefined,
      idempotencyKey,
      simulateFailure,
    });
    setResult(res);
    setStep(isWalletSuccess(res) ? 'success' : 'error');
  }

  function retry() {
    setIdempotencyKey(uuidv4());
    setStep('form');
  }

  const readyQuote = quote && quote.ok ? quote : null;

  return (
    <>
      {step === 'form' && (
        <>
          <p className="text-sm text-muted-foreground">Available: {balanceUsdc} USDC</p>
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient (Arc address)</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amountUsdc}
              onChange={(e) => setAmountUsdc(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">Memo or reference (optional)</Label>
            <Textarea id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
          </div>
          {mode === 'mock' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
              />
              Simulate failure (demo)
            </label>
          )}
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          <Button
            className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleConfirm}
            disabled={!recipient || !amountUsdc}
          >
            Send USDC
          </Button>
        </>
      )}

      {step === 'confirm' && readyQuote && (
        <>
          <Card>
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold">Confirm USDC payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span>{readyQuote.amountUsdc} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {readyQuote.mode === 'testnet' ? 'Estimated network fee' : 'Demo network fee'}
                  </span>
                  <span>{readyQuote.feeUsdc} USDC</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{readyQuote.totalUsdc} USDC</span>
                </div>
                <div className="border-t pt-2">
                  <span className="text-muted-foreground">Recipient</span>
                  <p className="mt-1 break-all font-medium">{recipient}</p>
                </div>
                {memo && (
                  <div>
                    <span className="text-muted-foreground">Reference</span>
                    <p className="mt-1">{memo}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Gas on Arc is paid in USDC from this same balance. EasternBlock shows one USDC figure.
              </p>
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

      {step === 'processing' && <LoadingState message="Sending USDC..." />}
      {step === 'success' && isWalletSuccess(result) && result.amountUsdc && (
        <SuccessState title="USDC sent" message={`${result.amountUsdc} USDC sent.`}>
          {result.feeUsdc && (
            <p className="text-sm text-muted-foreground">Network fee {result.feeUsdc} USDC</p>
          )}
          {result.explorerUrl && (
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-600 hover:underline"
            >
              View on Arc explorer
            </a>
          )}
          <LinkButton href="/transactions" variant="outline">
            View transactions
          </LinkButton>
        </SuccessState>
      )}
      {step === 'error' && (
        <ErrorState
          title="Transfer failed"
          message={isWalletError(result) ? result.error : 'Please try again.'}
          onRetry={retry}
        />
      )}
    </>
  );
}
