import { AlertTriangle } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>DEMO MODE</strong> — No real money or Bitcoin is being transferred.
        </span>
      </div>
    </div>
  );
}
