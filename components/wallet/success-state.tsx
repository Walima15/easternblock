import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SuccessState({
  title,
  message,
  children,
  className,
}: {
  title: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-8 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
      </div>
      {children}
    </div>
  );
}
