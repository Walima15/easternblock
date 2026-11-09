'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { QrDisplay } from '@/components/wallet/qr-display';
import { SuccessState } from '@/components/wallet/success-state';
import { simulateReceiveUsdc } from '@/lib/actions/arc';
import { ARC_FAUCET_URL } from '@/lib/arc/constants';
import { isWalletError, isWalletSuccess, type WalletActionResult } from '@/types/wallet-actions';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

export function ReceiveUsdc({
  address,
  mode,
  balanceUsdc,
}: {
  address: string;
  mode: 'mock' | 'testnet';
  balanceUsdc: string;
}) {
  const [amountUsdc, setAmountUsdc] = useState('10');
  const [memo, setMemo] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<WalletActionResult | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    toast.success('Arc address copied');
  }

  async function handleSimulate() {
    setSimulating(true);
    const res = await simulateReceiveUsdc({
      amountUsdc,
      memo: memo || undefined,
      idempotencyKey,
    });
    setSimulating(false);
    setResult(res);
    if (!isWalletSuccess(res)) setIdempotencyKey(uuidv4());
  }

  if (isWalletSuccess(result) && result.amountUsdc) {
    return (
      <SuccessState
        title="USDC received"
        message={`${result.amountUsdc} USDC added to your wallet (demo).`}
      />
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="font-semibold">Your Arc address</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this address to receive USDC on Arc. Balance: {balanceUsdc} USDC.
            </p>
          </div>
          <p className="break-all font-mono text-sm">{address}</p>
          <QrDisplay value={address} label={address} shareTitle="EasternBlock USDC" />
          <Button variant="outline" className="w-full" onClick={copyAddress}>
            <Copy className="mr-2 h-4 w-4" />
            Copy address
          </Button>
        </CardContent>
      </Card>

      {mode === 'testnet' ? (
        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <h3 className="font-semibold">Need test USDC?</h3>
            <p className="text-muted-foreground">
              Arc testnet reads the real token balance. Request test USDC from the Circle faucet, then send it to the address above.
            </p>
            <a
              href={ARC_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-emerald-600 hover:underline"
            >
              {ARC_FAUCET_URL}
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="font-semibold">Simulate a receive</h3>
            <p className="text-sm text-muted-foreground">
              Demo mode does not watch the chain. Add sample USDC to this wallet to try a receive.
            </p>
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
              <Label htmlFor="memo">Memo (optional)</Label>
              <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
            {isWalletError(result) && (
              <p className="text-sm text-destructive" role="alert">
                {result.error}
              </p>
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSimulate}
              disabled={simulating || !amountUsdc}
            >
              {simulating ? 'Processing...' : 'Simulate receiving USDC'}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
