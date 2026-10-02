import { getWallet, getRecentTransactions } from '@/lib/actions/auth';
import { getBTCZMWPrice } from '@/lib/bitcoin/price';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { BalanceCard, QuickActions, TransactionList } from '@/components/wallet/balance-card';
import Link from 'next/link';

export default async function DashboardPage() {
  const [wallet, transactions, btcPrice] = await Promise.all([
    getWallet(),
    getRecentTransactions(5),
    getBTCZMWPrice(),
  ]);

  return (
    <div>
      <AppHeader title="Dashboard" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-2xl md:p-6">
        <BalanceCard balanceSats={wallet?.balance_sats ?? 0} btcPrice={btcPrice} />
        <QuickActions />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-emerald-600 hover:underline">
              View all
            </Link>
          </div>
          <TransactionList transactions={transactions} btcPrice={btcPrice} />
        </div>
      </div>
    </div>
  );
}
