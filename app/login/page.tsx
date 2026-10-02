import { DemoBanner } from '@/components/wallet/demo-banner';
import { LoginCard } from '@/components/auth/auth-forms';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <LoginCard />
      </div>
    </div>
  );
}
