import { AppHeader } from '@/components/navigation/sidebar-nav';
import { ReceiveUsdc } from '@/components/arc/receive-usdc';
import { getUsdcSnapshot } from '@/lib/actions/arc';

export default async function ReceiveUsdcPage() {
  const snapshot = await getUsdcSnapshot();

  return (
    <div>
      <AppHeader title="Receive USDC" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <ReceiveUsdc address={snapshot.address} mode={snapshot.mode} balanceUsdc={snapshot.balanceUsdc} />
      </div>
    </div>
  );
}
