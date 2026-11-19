'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pullDemoBackup, restoreDemoBackup } from '@/lib/actions/persistence';

const STORAGE_KEY = 'easternblock.demo.v1';

/** Keep a localStorage copy so a lost cookie can be restored on this browser. */
export async function refreshBrowserBackup() {
  if (typeof window === 'undefined') return;
  try {
    const remote = await pullDemoBackup();
    if (remote) {
      localStorage.setItem(STORAGE_KEY, remote);
      return;
    }
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) await restoreDemoBackup(local);
  } catch {
    // The cookie is the live copy. The backup is best-effort.
  }
}

export function BrowserBackup() {
  const pathname = usePathname();

  useEffect(() => {
    void refreshBrowserBackup();
  }, [pathname]);

  return null;
}
