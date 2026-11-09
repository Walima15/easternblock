import { AppHeader } from '@/components/navigation/sidebar-nav';
import { SendUsdcForm } from '@/components/arc/send-usdc-form';
import { getUsdcSnapshot } from '@/lib/actions/arc';

export default async function SendUsdcPage() {
  const snapshot = await getUsdcSnapshot();

  return (
    <div>
      <AppHeader title="Send USDC" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <SendUsdcForm balanceUsdc={snapshot.balanceUsdc} mode={snapshot.mode} />
      </div>
    </div>
  );
}
