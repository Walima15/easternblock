import { formatZMW } from '@/lib/bitcoin/price';
import { formatUsd, DEMO_PRICE_LABEL, type HoldingUsd } from '@/lib/portfolio/allocation';
import { Card, CardContent } from '@/components/ui/card';
import { RebalanceButton } from '@/components/wallet/rebalance-button';

export function PortfolioSummary({ holding }: { holding: HoldingUsd }) {
  const empty = holding.totalUsd <= 0;
  const btcWidth = empty ? 50 : Math.max(0, Math.min(100, holding.btcPct));
  const btcLabel = empty ? 50 : Math.round(holding.btcPct);
  const usdcLabel = empty ? 50 : Math.round(holding.usdcPct);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Portfolio value</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{formatUsd(holding.totalUsd)}</p>
            <p className="text-lg text-muted-foreground">{formatZMW(holding.totalZmw)}</p>
          </div>
          <p className="max-w-[9rem] text-right text-xs text-muted-foreground">{DEMO_PRICE_LABEL}</p>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-sm font-medium">
            <span className="text-sky-700 dark:text-sky-300">USDC {usdcLabel}%</span>
            <span className="text-emerald-700 dark:text-emerald-300">Bitcoin {btcLabel}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-emerald-600" aria-hidden>
            <div className="h-full bg-sky-500" style={{ width: `${100 - btcWidth}%` }} />
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-foreground/80" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {empty
              ? 'Target mix is 50/50 once you add USDC or Bitcoin. The mark in the middle is that target.'
              : 'Equal weight on purpose. The mark in the middle is a 50/50 target.'}
          </p>
        </div>
        <RebalanceButton disabled={empty} />
      </CardContent>
    </Card>
  );
}
