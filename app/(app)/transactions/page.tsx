import Link from 'next/link';
import { getAllTransactions } from '@/lib/actions/auth';
import { getBTCZMWPrice, formatZMW } from '@/lib/bitcoin/price';
import { getUsdZmwQuote } from '@/lib/fx/usd-zmw';
import {
  transactionAmountText,
  transactionAsset,
  transactionFeeText,
  transactionIsCredit,
  transactionTitle,
  transactionZmw,
} from '@/lib/transactions/present';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/wallet/empty-state';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  pending: 'secondary',
  processing: 'secondary',
  failed: 'destructive',
  cancelled: 'outline',
};

function TransactionRow({
  tx,
  btcPrice,
  zmwPerUsd,
}: {
  tx: Transaction;
  btcPrice: number;
  zmwPerUsd: number;
}) {
  const isPositive = transactionIsCredit(tx);
  const zmw = transactionZmw(tx, btcPrice, zmwPerUsd);
  const asset = transactionAsset(tx);
  const fee = transactionFeeText(tx);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{transactionTitle(tx)}</p>
            {asset === 'usdc' && (
              <Badge variant="outline" className="border-sky-300 text-sky-800 dark:text-sky-200">
                USDC
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleDateString('en-ZM', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{tx.id.slice(0, 8)}...</p>
          {tx.memo && asset === 'usdc' && (
            <p className="mt-1 text-xs text-muted-foreground">{tx.memo}</p>
          )}
          {tx.explorer_url && (
            <a
              href={tx.explorer_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-emerald-600 hover:underline"
            >
              View on Arc explorer
            </a>
          )}
        </div>
        <div className="text-right">
          <p className={`font-semibold ${isPositive ? 'text-emerald-600' : ''}`}>
            {isPositive ? '+' : '-'}
            {transactionAmountText(tx)}
          </p>
          <p className="text-sm text-muted-foreground">≈ {formatZMW(Number(zmw))}</p>
          {fee && <p className="text-xs text-muted-foreground">{fee}</p>}
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
  searchParams: Promise<{ filter?: string; asset?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const asset = params.asset ?? 'all';
  const [transactions, btcPrice, fx] = await Promise.all([
    getAllTransactions(
      filter === 'all' ? undefined : filter,
      asset === 'all' ? undefined : asset
    ),
    getBTCZMWPrice(),
    getUsdZmwQuote(),
  ]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'buy', label: 'Bought' },
    { id: 'sell', label: 'Sold' },
    { id: 'send', label: 'Sent' },
    { id: 'receive', label: 'Received' },
  ];
  const assetFilters = [
    { id: 'all', label: 'All assets' },
    { id: 'btc', label: 'Bitcoin' },
    { id: 'usdc', label: 'USDC' },
  ];

  return (
    <div>
      <AppHeader title="Transactions" />
      <div className="mx-auto max-w-lg p-4 md:max-w-2xl md:p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {filters.map((f) => (
            <Link
              key={f.id}
              href={`/transactions?filter=${f.id}${asset === 'all' ? '' : `&asset=${asset}`}`}
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
        <div className="mb-4 flex flex-wrap gap-2">
          {assetFilters.map((f) => (
            <Link
              key={f.id}
              href={`/transactions?filter=${filter}${f.id === 'all' ? '' : `&asset=${f.id}`}`}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                asset === f.id
                  ? 'bg-sky-700 text-white'
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
              <TransactionRow
                key={tx.id}
                tx={tx}
                btcPrice={btcPrice}
                zmwPerUsd={fx.zmwPerUsd}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
