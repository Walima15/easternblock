import { DemoBanner } from '@/components/wallet/demo-banner';
import { SidebarNav } from '@/components/navigation/sidebar-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarNav />
      <div className="flex flex-1 flex-col">
        <DemoBanner />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
