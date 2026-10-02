import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PendingState({
  title = 'Processing',
  message = 'Please wait while we process your request.',
  className,
}: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-8 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <Clock className="h-8 w-8 animate-pulse text-blue-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
