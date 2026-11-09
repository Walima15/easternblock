import { formatZMW } from '@/lib/bitcoin/price';
import { Card, CardContent } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { ArrowDownLeft, ArrowUpRight, QrCode, Send } from 'lucide-react';

interface UsdcBalanceCardProps {
  balanceUsdc: string;
  balanceZmw: number;
  zmwPerUsd: number;
  rateLabel: string;
  mode: 'mock' | 'testnet';
  source: 'ledger' | 'chain';
}

export function UsdcBalanceCard({
  balanceUsdc,
  balanceZmw,
  zmwPerUsd,
  rateLabel,
  mode,
  source,
}: UsdcBalanceCardProps) {
  const sourceLabel =
    mode === 'testnet'
      ? source === 'chain'
        ? 'On-chain USDC balance'
        : 'Demo ledger (Arc testnet could not be reached)'
      : 'Demo USDC balance';

  return (
    <Card className="border-sky-200/70 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Your USDC</p>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
            Arc
          </span>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold tracking-tight">{balanceUsdc} USDC</p>
          <p className="mt-1 text-lg text-muted-foreground">≈ {formatZMW(balanceZmw)}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {rateLabel} · 1 USDC ≈ {formatZMW(zmwPerUsd)}. {sourceLabel}. One balance, shown at 6 decimals.
        </p>
      </CardContent>
    </Card>
  );
}

export function UsdcQuickActions() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">USDC on Arc</p>
      <LinkButton href="/usdc/buy" className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700">
        <ArrowDownLeft className="mr-2 h-5 w-5" />
        Buy USDC
      </LinkButton>
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/usdc/send" variant="outline" className="h-12 text-base">
          <Send className="mr-2 h-4 w-4" />
          Send USDC
        </LinkButton>
        <LinkButton href="/usdc/receive" variant="outline" className="h-12 text-base">
          <QrCode className="mr-2 h-4 w-4" />
          Receive USDC
        </LinkButton>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/usdc/sell" variant="secondary" className="h-11">
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Sell USDC
        </LinkButton>
        <LinkButton href="/about-arc" variant="ghost" className="h-11">
          About Arc
        </LinkButton>
      </div>
    </div>
  );
}
