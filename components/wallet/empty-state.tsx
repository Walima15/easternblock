import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title = 'Nothing here yet',
  message = 'Your activity will appear here.',
  className,
}: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 text-center', className)}>
      <Inbox className="h-10 w-10 text-muted-foreground/50" />
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
