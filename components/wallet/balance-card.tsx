import Link from 'next/link';
import { formatSats, formatZMW, convertSatsToZMW } from '@/lib/bitcoin/price';
import { Card, CardContent } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { ArrowDownLeft, ArrowUpRight, Send, QrCode } from 'lucide-react';
import type { Transaction } from '@/types';
import { EmptyState } from './empty-state';

interface BalanceCardProps {
  balanceSats: number;
  btcPrice: number;
}

export function BalanceCard({ balanceSats, btcPrice }: BalanceCardProps) {
  const zmwEquivalent = convertSatsToZMW(balanceSats, btcPrice);

  return (
    <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">Your Bitcoin</p>
        <div className="mt-2">
          <p className="text-3xl font-bold tracking-tight">{formatSats(balanceSats)}</p>
          <p className="mt-1 text-lg text-muted-foreground">≈ {formatZMW(zmwEquivalent)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickActions() {
  return (
    <div className="space-y-3">
      <LinkButton href="/buy" className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700">
        <ArrowDownLeft className="mr-2 h-5 w-5" />
        Buy Bitcoin
      </LinkButton>
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/send" variant="outline" className="h-12 text-base">
          <Send className="mr-2 h-4 w-4" />
          Send
        </LinkButton>
        <LinkButton href="/receive" variant="outline" className="h-12 text-base">
          <QrCode className="mr-2 h-4 w-4" />
          Receive
        </LinkButton>
      </div>
      <LinkButton href="/sell" variant="secondary" className="h-11 w-full">
        <ArrowUpRight className="mr-2 h-4 w-4" />
        Sell Bitcoin
      </LinkButton>
    </div>
  );
}

export function TransactionList({
  transactions,
  btcPrice,
}: {
  transactions: Transaction[];
  btcPrice: number;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        message="Buy, send, or receive Bitcoin to get started."
      />
    );
  }

  const typeLabels: Record<string, string> = {
    buy: 'Bitcoin purchased',
    sell: 'Bitcoin sold',
    send: 'Bitcoin sent',
    receive: 'Bitcoin received',
  };

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isPositive = tx.type === 'buy' || tx.type === 'receive';
        const zmw = tx.amount_zmw ?? convertSatsToZMW(tx.amount_sats, btcPrice);

        return (
          <Link
            key={tx.id}
            href={`/transactions?id=${tx.id}`}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium capitalize">{typeLabels[tx.type] ?? tx.type}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.created_at).toLocaleDateString('en-ZM', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${isPositive ? 'text-emerald-600' : ''}`}>
                {isPositive ? '+' : '-'}
                {formatSats(tx.amount_sats)}
              </p>
              <p className="text-xs text-muted-foreground">≈ {formatZMW(Number(zmw))}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
