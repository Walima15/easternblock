'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { rebalanceToEven } from '@/lib/actions/swap';
import { Button } from '@/components/ui/button';
import { isWalletError, isWalletSuccess } from '@/types/wallet-actions';

export function RebalanceButton({ disabled = false }: { disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const [key, setKey] = useState(() => uuidv4());

  async function onClick() {
    setPending(true);
    const result = await rebalanceToEven({ idempotencyKey: key, intent: 'rebalance' });
    setPending(false);
    if (isWalletError(result)) {
      toast.error(result.error);
      return;
    }
    if (isWalletSuccess(result)) {
      toast.success(result.message ?? 'Rebalanced toward 50/50.');
      setKey(uuidv4());
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={disabled || pending}
    >
      {pending ? 'Rebalancing…' : 'Keep 50/50'}
    </Button>
  );
}
