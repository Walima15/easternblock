import { getAdminStats } from '@/lib/actions/wallet';
import { formatSats, formatZMW } from '@/lib/bitcoin/price';
import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const stats = await getAdminStats();

  if (!stats) {
    redirect('/dashboard');
  }

  return (
    <div>
      <AppHeader title="Admin Dashboard" />
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">
          Demo admin dashboard. Include &quot;admin&quot; in your profile name to access.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Total Transactions', value: stats.totalTransactions },
            { label: 'BTC Volume', value: formatSats(stats.btcVolumeSats) },
            { label: 'ZMW Volume', value: formatZMW(stats.zmwVolume) },
            { label: 'Pending', value: stats.pendingCount },
            { label: 'Failed', value: stats.failedCount },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              stats.recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div>
                    <span className="capitalize">{tx.type}</span>
                    <span className="ml-2 text-muted-foreground">
                      {formatSats(tx.amount_sats)}
                    </span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {tx.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
