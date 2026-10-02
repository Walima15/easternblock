'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { QrDisplay } from '@/components/wallet/qr-display';
import { LoadingState } from '@/components/wallet/loading-state';
import { SuccessState } from '@/components/wallet/success-state';
import {
  createReceiveInvoice,
  simulateReceiveBitcoin,
} from '@/lib/actions/wallet';
import { formatSats } from '@/lib/bitcoin/price';
import { isWalletSuccess } from '@/types/wallet-actions';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

export default function ReceivePage() {
  const [amountSats, setAmountSats] = useState('');
  const [memo, setMemo] = useState('');
  const [invoice, setInvoice] = useState<{
    paymentRequest: string;
    amountSats: number;
    memo?: string;
  } | null>(null);
  const [lightningAddress, setLightningAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [received, setReceived] = useState<number | null>(null);
  const idempotencyKey = useState(() => uuidv4())[0];

  async function handleGenerate() {
    setLoading(true);
    const res = await createReceiveInvoice({
      amountSats: amountSats ? parseInt(amountSats, 10) : undefined,
      memo: memo || undefined,
    });
    setLoading(false);
    if ('error' in res) return;
    setLightningAddress(res.lightningAddress);
    setInvoice(res.invoice);
  }

  async function handleSimulateReceive() {
    if (!amountSats) return;
    setSimulating(true);
    const res = await simulateReceiveBitcoin({
      amountSats: parseInt(amountSats, 10),
      memo: memo || undefined,
      idempotencyKey,
    });
    setSimulating(false);
    if (isWalletSuccess(res) && typeof res.amountSats === 'number') {
      setReceived(res.amountSats);
    }
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(lightningAddress);
    toast.success('Lightning address copied');
  }

  return (
    <div>
      <AppHeader title="Receive Bitcoin" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        {received ? (
          <SuccessState
            title="Bitcoin received"
            message={`${formatSats(received)} added to your wallet (demo).`}
          />
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (sats, optional)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amountSats}
                onChange={(e) => setAmountSats(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">Memo (optional)</Label>
              <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
            <Button
              className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Invoice'}
            </Button>

            {loading && <LoadingState message="Generating invoice..." />}

            {invoice && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  <h3 className="font-semibold">Lightning Invoice</h3>
                  <QrDisplay value={invoice.paymentRequest} label={invoice.paymentRequest} />
                  {amountSats && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleSimulateReceive}
                      disabled={simulating}
                    >
                      {simulating ? 'Processing...' : `Simulate receiving ${formatSats(parseInt(amountSats, 10))}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {lightningAddress && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  <h3 className="font-semibold">Your Lightning Address</h3>
                  <p className="break-all font-mono text-sm">{lightningAddress}</p>
                  <QrDisplay value={`lightning:${lightningAddress}`} />
                  <Button variant="outline" className="w-full" onClick={copyAddress}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy address
                  </Button>
                </CardContent>
              </Card>
            )}

            {!invoice && !lightningAddress && (
              <p className="text-center text-sm text-muted-foreground">
                Generate an invoice or view your Lightning address to receive Bitcoin.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
