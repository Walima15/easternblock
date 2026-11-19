import { AppHeader } from '@/components/navigation/sidebar-nav';
import { AssetSwitcher } from '@/components/wallet/asset-switcher';
import { BuyUsdcForm } from '@/components/arc/buy-usdc-form';
import { getUsdcBuyQuote, getUsdcSnapshot } from '@/lib/actions/arc';

export default async function BuyUsdcPage() {
  const [snapshot, quote] = await Promise.all([getUsdcSnapshot(), getUsdcBuyQuote(500)]);

  return (
    <div>
      <AppHeader title="Add money" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <AssetSwitcher flow="buy" asset="usdc" />
        <BuyUsdcForm
          balanceUsdc={snapshot.balanceUsdc}
          mode={snapshot.mode}
          initialQuote={quote.ok ? quote : null}
        />
      </div>
    </div>
  );
}
