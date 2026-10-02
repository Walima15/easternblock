'use client';

import { cn } from '@/lib/utils';
import { PAYMENT_PROVIDERS, type PaymentProviderType } from '@/lib/payments/payment-provider';
import { Badge } from '@/components/ui/badge';

interface PaymentMethodCardProps {
  selected?: PaymentProviderType;
  onSelect: (provider: PaymentProviderType) => void;
  exclude?: PaymentProviderType[];
}

const providerColors: Record<PaymentProviderType, string> = {
  mtn: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20',
  airtel: 'border-red-400 bg-red-50 dark:bg-red-950/20',
  zamtel: 'border-green-400 bg-green-50 dark:bg-green-950/20',
  bank: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20',
  visa: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20',
};

export function PaymentMethodCards({
  selected,
  onSelect,
  exclude = [],
}: PaymentMethodCardProps) {
  const providers = PAYMENT_PROVIDERS.filter((p) => !exclude.includes(p.id));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Planned integrations — demo simulation only</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            className={cn(
              'relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md',
              providerColors[provider.id],
              selected === provider.id && 'ring-2 ring-emerald-500 ring-offset-2'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{provider.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{provider.description}</p>
              </div>
              {provider.planned && (
                <Badge variant="secondary" className="text-[10px]">
                  Demo
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
