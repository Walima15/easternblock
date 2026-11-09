import { AppHeader } from '@/components/navigation/sidebar-nav';
import { SellUsdcForm } from '@/components/arc/sell-usdc-form';
import { getUsdcSellQuote, getUsdcSnapshot } from '@/lib/actions/arc';

export default async function SellUsdcPage() {
  const [snapshot, quote] = await Promise.all([getUsdcSnapshot(), getUsdcSellQuote('10')]);

  return (
    <div>
      <AppHeader title="Sell USDC" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <SellUsdcForm
          balanceUsdc={snapshot.balanceUsdc}
          mode={snapshot.mode}
          initialQuote={quote.ok ? quote : null}
        />
      </div>
    </div>
  );
}
