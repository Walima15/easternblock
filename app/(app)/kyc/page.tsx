import { getProfile } from '@/lib/actions/auth';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_started: { label: 'Not Started', variant: 'secondary' },
  pending: { label: 'Pending Review', variant: 'outline' },
  verified: { label: 'Verified', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export default async function KycPage() {
  const profile = await getProfile();
  const status = statusLabels[profile?.kyc_status ?? 'not_started'];

  return (
    <div>
      <AppHeader title="Identity Verification" />
      <div className="mx-auto max-w-lg p-4 md:max-w-xl md:p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="mt-4">Identity Verification</CardTitle>
            <CardDescription>
              Verify your identity to unlock full features when EasternBlock launches in production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="font-medium">Status</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p>
                KYC verification is not available in demo mode. In production, a licensed KYC
                provider will be integrated here to verify your identity securely.
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1">
                <li>Government-issued ID</li>
                <li>Selfie verification</li>
                <li>Proof of address</li>
              </ul>
            </div>

            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled>
              Start Verification (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
