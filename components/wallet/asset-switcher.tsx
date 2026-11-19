'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export type AssetFlow = 'send' | 'receive' | 'buy' | 'sell';

const routes: Record<AssetFlow, { usdc: string; btc: string }> = {
  send: { usdc: '/usdc/send', btc: '/send' },
  receive: { usdc: '/usdc/receive', btc: '/receive' },
  buy: { usdc: '/usdc/buy', btc: '/buy' },
  sell: { usdc: '/usdc/sell', btc: '/sell' },
};

export function AssetSwitcher({ flow, asset }: { flow: AssetFlow; asset: 'usdc' | 'btc' }) {
  const href = routes[flow];
  const options = [
    { id: 'usdc' as const, href: href.usdc, label: 'USDC', hint: 'Arc' },
    { id: 'btc' as const, href: href.btc, label: 'Bitcoin', hint: 'Lightning' },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Asset">
      {options.map((option) => {
        const active = option.id === asset;
        return (
          <Link
            key={option.id}
            href={option.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'rounded-lg px-3 py-2 text-center transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="block text-xs">{option.hint}</span>
          </Link>
        );
      })}
    </div>
  );
}
