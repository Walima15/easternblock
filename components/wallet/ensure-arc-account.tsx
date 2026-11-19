'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ensureArcAccount } from '@/lib/actions/arc';

export function EnsureArcAccount({ mode }: { mode: 'mock' | 'testnet' }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (mode !== 'testnet' || started.current) return;
    started.current = true;
    void ensureArcAccount().then((result) => {
      if (result && 'address' in result && result.address) router.refresh();
    });
  }, [mode, router]);

  return null;
}
