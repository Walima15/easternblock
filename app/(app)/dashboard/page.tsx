import { getWallet, getRecentTransactions } from '@/lib/actions/auth';
import { getUsdcSnapshot } from '@/lib/actions/arc';
import { getBTCZMWPrice } from '@/lib/bitcoin/price';
import { parseBaseUnits, parseUsdcInput } from '@/lib/arc/units';
import { holdingUsd } from '@/lib/portfolio/allocation';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { BalanceCard, TransactionList } from '@/components/wallet/balance-card';
import { UsdcBalanceCard } from '@/components/wallet/usdc-balance-card';
import { PortfolioSummary } from '@/components/wallet/portfolio-summary';
import { EnsureArcAccount } from '@/components/wallet/ensure-arc-account';
import { LinkButton } from '@/components/ui/link-button';
import Link from 'next/link';

export default async function DashboardPage() {
  const [wallet, transactions, btcPrice, usdc] = await Promise.all([
    getWallet(),
    getRecentTransactions(5),
    getBTCZMWPrice(),
    getUsdcSnapshot(),
  ]);

  const balanceSats = wallet?.balance_sats ?? 0;
  const usdcBase = parseUsdcInput(usdc.balanceUsdc) ?? parseBaseUnits(wallet?.arc_balance_base_units);
  const holding = holdingUsd(balanceSats, usdcBase, {
    btcZmw: btcPrice,
    zmwPerUsd: usdc.zmwPerUsd,
  });

  return (
    <div>
      <AppHeader title="Dashboard" />
      <EnsureArcAccount mode={usdc.mode} />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-2xl md:p-6">
        <PortfolioSummary holding={holding} />
        <div className="grid gap-4 md:grid-cols-2">
          <UsdcBalanceCard
            balanceUsdc={usdc.balanceUsdc}
            balanceZmw={usdc.balanceZmw}
            zmwPerUsd={usdc.zmwPerUsd}
            rateLabel={usdc.rateLabel}
            mode={usdc.mode}
            source={usdc.source}
          />
          <BalanceCard balanceSats={balanceSats} btcPrice={btcPrice} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LinkButton href="/usdc/buy" className="h-11 bg-emerald-600 hover:bg-emerald-700">
            Add USDC
          </LinkButton>
          <LinkButton href="/buy" variant="outline" className="h-11">
            Add Bitcoin
          </LinkButton>
          <LinkButton href="/usdc/send" variant="outline" className="h-11">
            Send USDC
          </LinkButton>
          <LinkButton href="/send" variant="outline" className="h-11">
            Send Bitcoin
          </LinkButton>
          <LinkButton href="/swap" variant="secondary" className="h-11">
            Swap
          </LinkButton>
          <LinkButton href="/transactions" variant="secondary" className="h-11">
            Activity
          </LinkButton>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
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
