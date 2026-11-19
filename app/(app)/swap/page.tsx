import { getWallet } from '@/lib/actions/auth';
import { getBTCZMWPrice } from '@/lib/bitcoin/price';
import { getUsdZmwQuote } from '@/lib/fx/usd-zmw';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { SwapForm } from '@/components/wallet/swap-form';
import { DEMO_PRICE_LABEL } from '@/lib/portfolio/allocation';

export default async function SwapPage() {
  const [wallet, btcZmw, fx] = await Promise.all([getWallet(), getBTCZMWPrice(), getUsdZmwQuote()]);

  return (
    <div>
      <AppHeader title="Swap" />
      <div className="mx-auto max-w-lg space-y-4 p-4 md:max-w-xl md:p-6">
        <div>
          <h2 className="text-lg font-semibold">Move between USDC and Bitcoin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {DEMO_PRICE_LABEL}. USDC is treated as one US dollar. Keep 50/50 uses the same rate with no spread.
          </p>
        </div>
        <SwapForm
          balanceSats={wallet?.balance_sats ?? 0}
          usdcBaseUnits={wallet?.arc_balance_base_units ?? '0'}
          btcZmw={btcZmw}
          zmwPerUsd={fx.zmwPerUsd}
        />
      </div>
    </div>
  );
}