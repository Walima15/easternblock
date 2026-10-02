import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function OfflineState({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-8 text-center', className)}>
      <WifiOff className="h-10 w-10 text-muted-foreground" />
      <div>
        <h3 className="font-semibold">You appear to be offline</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
