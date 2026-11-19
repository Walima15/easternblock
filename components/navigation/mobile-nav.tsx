'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, Send, QrCode, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home, also: [] as string[] },
  { href: '/usdc/buy', label: 'Add', icon: ShoppingCart, also: ['/buy'] },
  { href: '/usdc/send', label: 'Send', icon: Send, also: ['/send'] },
  { href: '/usdc/receive', label: 'Receive', icon: QrCode, also: ['/receive'] },
  { href: '/transactions', label: 'Activity', icon: History, also: [] as string[] },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon, also }) => {
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            also.some((path) => pathname === path || pathname.startsWith(`${path}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors',
                active
                  ? 'text-emerald-600'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
