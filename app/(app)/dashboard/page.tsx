import { getWallet, getRecentTransactions } from '@/lib/actions/auth';
import { getUsdcSnapshot } from '@/lib/actions/arc';
import { getBTCZMWPrice } from '@/lib/bitcoin/price';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { BalanceCard, QuickActions, TransactionList } from '@/components/wallet/balance-card';
import { UsdcBalanceCard, UsdcQuickActions } from '@/components/wallet/usdc-balance-card';
import Link from 'next/link';

export default async function DashboardPage() {
  const [wallet, transactions, btcPrice, usdc] = await Promise.all([
    getWallet(),
    getRecentTransactions(5),
    getBTCZMWPrice(),
    getUsdcSnapshot(),
  ]);

  return (
    <div>
      <AppHeader title="Dashboard" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-2xl md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <BalanceCard balanceSats={wallet?.balance_sats ?? 0} btcPrice={btcPrice} />
          <UsdcBalanceCard
            balanceUsdc={usdc.balanceUsdc}
            balanceZmw={usdc.balanceZmw}
            zmwPerUsd={usdc.zmwPerUsd}
            rateLabel={usdc.rateLabel}
            mode={usdc.mode}
            source={usdc.source}
          />
        </div>
        <QuickActions />
        <UsdcQuickActions />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-emerald-600 hover:underline">
              View all
            </Link>
          </div>
          <TransactionList
            transactions={transactions}
            btcPrice={btcPrice}
            zmwPerUsd={usdc.zmwPerUsd}
          />
        </div>
      </div>
    </div>
  );
}
