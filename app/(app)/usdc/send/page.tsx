import { AppHeader } from '@/components/navigation/sidebar-nav';
import { AssetSwitcher } from '@/components/wallet/asset-switcher';
import { SendUsdcForm } from '@/components/arc/send-usdc-form';
import { getUsdcSnapshot } from '@/lib/actions/arc';

export default async function SendUsdcPage() {
  const snapshot = await getUsdcSnapshot();

  return (
    <div>
      <AppHeader title="Send" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <AssetSwitcher flow="send" asset="usdc" />
        <SendUsdcForm balanceUsdc={snapshot.balanceUsdc} mode={snapshot.mode} />
      </div>
    </div>
  );
}
