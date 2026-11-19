import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { BrowserBackup } from '@/components/demo/browser-backup';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const brandLine = 'EasternBlock — USDC made simple for Zambia, with Bitcoin included';

export const metadata: Metadata = {
  title: brandLine,
  description: brandLine,
  openGraph: {
    title: brandLine,
    description: brandLine,
    siteName: 'EasternBlock',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: brandLine,
    description: brandLine,
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <BrowserBackup />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
