'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingCart,
  Send,
  QrCode,
  ArrowDownLeft,
  Settings,
  Shield,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/buy', label: 'Buy Bitcoin', icon: ShoppingCart },
  { href: '/sell', label: 'Sell Bitcoin', icon: ArrowDownLeft },
  { href: '/send', label: 'Send', icon: Send },
  { href: '/receive', label: 'Receive', icon: QrCode },
  { href: '/transactions', label: 'Transactions', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/kyc', label: 'KYC', icon: Shield },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          <span className="text-emerald-600">Eastern</span>Block
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="md:hidden">
        <Link href="/dashboard" className="text-lg font-bold">
          <span className="text-emerald-600">Eastern</span>Block
        </Link>
      </div>
      {title && (
        <h1 className="hidden text-lg font-semibold md:block">{title}</h1>
      )}
      <Link
        href="/settings"
        className="text-sm text-muted-foreground hover:text-foreground md:hidden"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
}
