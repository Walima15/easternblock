import type {
  LightningInvoice,
  LightningPaymentResult,
} from '@/types';

export interface LightningService {
  createInvoice(amountSats: number, memo?: string): Promise<LightningInvoice>;
  payInvoice(
    paymentRequest: string,
    amountSats?: number
  ): Promise<LightningPaymentResult>;
  payLightningAddress(
    address: string,
    amountSats: number,
    memo?: string
  ): Promise<LightningPaymentResult>;
  getBalance(): Promise<number>;
  getTransaction(transactionId: string): Promise<{
    id: string;
    status: string;
    amountSats: number;
  } | null>;
  getLightningAddress(): Promise<string>;
}

import { MockLightningService } from './mock-lightning';

export function getLightningService(): LightningService {
  // TODO: Replace MockLightningService with BreezLightningService or LND in production
  return new MockLightningService();
}
