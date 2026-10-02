import Link from 'next/link';
import { getAllTransactions } from '@/lib/actions/auth';
import { getBTCZMWPrice, formatSats, formatZMW, convertSatsToZMW } from '@/lib/bitcoin/price';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/wallet/empty-state';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

const typeLabels: Record<string, string> = {
  buy: 'Bitcoin Purchased',
  sell: 'Bitcoin Sold',
  send: 'Bitcoin Sent',
  receive: 'Bitcoin Received',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  pending: 'secondary',
  processing: 'secondary',
  failed: 'destructive',
  cancelled: 'outline',
};

function TransactionRow({ tx, btcPrice }: { tx: Transaction; btcPrice: number }) {
  const isPositive = tx.type === 'buy' || tx.type === 'receive';
  const zmw = tx.amount_zmw ?? convertSatsToZMW(tx.amount_sats, btcPrice);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{typeLabels[tx.type] ?? tx.type}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleDateString('en-ZM', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{tx.id.slice(0, 8)}...</p>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${isPositive ? 'text-emerald-600' : ''}`}>
            {isPositive ? '+' : '-'}
            {formatSats(tx.amount_sats)}
          </p>
          <p className="text-sm text-muted-foreground">≈ {formatZMW(Number(zmw))}</p>
          <Badge variant={statusVariant[tx.status] ?? 'outline'} className="mt-2 capitalize">
            {tx.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const [transactions, btcPrice] = await Promise.all([
    getAllTransactions(filter === 'all' ? undefined : filter),
    getBTCZMWPrice(),
  ]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'buy', label: 'Bought' },
    { id: 'sell', label: 'Sold' },
    { id: 'send', label: 'Sent' },
    { id: 'receive', label: 'Received' },
  ];

  return (
    <div>
      <AppHeader title="Transactions" />
      <div className="mx-auto max-w-lg p-4 md:max-w-2xl md:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <Link
              key={f.id}
              href={`/transactions?filter=${f.id}`}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} btcPrice={btcPrice} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
