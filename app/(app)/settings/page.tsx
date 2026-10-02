import { getProfile, getWallet, logout } from '@/lib/actions/auth';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProfileForm } from '@/components/auth/profile-form';

export default async function SettingsPage() {
  const [profile, wallet] = await Promise.all([getProfile(), getWallet()]);

  return (
    <div>
      <AppHeader title="Settings" />
      <div className="mx-auto max-w-lg space-y-6 p-4 md:max-w-xl md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              fullName={profile?.full_name ?? ''}
              phoneNumber={profile?.phone_number ?? ''}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lightning address</span>
              <span className="font-mono text-xs">{wallet?.lightning_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Country</span>
              <span>{profile?.country ?? 'Zambia'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>ZMW (Zambian Kwacha)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Change your password through the forgot password flow.</p>
            <LinkButton variant="outline" href="/forgot-password">
              Change password
            </LinkButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identity Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkButton variant="outline" href="/kyc">
              Go to KYC
            </LinkButton>
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-2 text-sm text-muted-foreground">
          <span className="block">Help & Support</span>
          <span className="block">Terms of Service</span>
          <span className="block">Privacy Policy</span>
        </div>

        <form action={logout}>
          <Button type="submit" variant="destructive" className="w-full">
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}
