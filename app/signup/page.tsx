import { DemoBanner } from '@/components/wallet/demo-banner';
import { SignupCard } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <SignupCard />
      </div>
    </div>
  );
}
