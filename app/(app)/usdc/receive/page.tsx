import { AppHeader } from '@/components/navigation/sidebar-nav';
import { AssetSwitcher } from '@/components/wallet/asset-switcher';
import { ReceiveUsdc } from '@/components/arc/receive-usdc';
import { getUsdcSnapshot } from '@/lib/actions/arc';

export default async function ReceiveUsdcPage() {
  const snapshot = await getUsdcSnapshot();

  return (
    <div>
      <AppHeader title="Receive" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <AssetSwitcher flow="receive" asset="usdc" />
        <ReceiveUsdc address={snapshot.address} mode={snapshot.mode} balanceUsdc={snapshot.balanceUsdc} />
      </div>
    </div>
  );
}
