import type { PaymentInitResult, PaymentStatus, PaymentStatusResult } from '@/types';

export interface PaymentProvider {
  readonly name: string;
  readonly displayName: string;
  initializePayment(params: {
    amountZmw: number;
    phoneNumber?: string;
    reference: string;
    simulateFailure?: boolean;
    simulatePending?: boolean;
  }): Promise<PaymentInitResult>;
  checkPaymentStatus(providerReference: string): Promise<PaymentStatusResult>;
  cancelPayment(providerReference: string): Promise<{ success: boolean }>;
}

export type PaymentProviderType = 'mtn' | 'airtel' | 'zamtel' | 'bank' | 'visa';

import { mockMtnProvider } from './mock-mtn';
import { mockAirtelProvider } from './mock-airtel';
import { mockZamtelProvider } from './mock-zamtel';
import { mockBankProvider } from './mock-bank';
import { mockVisaProvider } from './mock-visa';

export function getPaymentProvider(type: PaymentProviderType): PaymentProvider {
  switch (type) {
    case 'mtn':
      return mockMtnProvider;
    case 'airtel':
      return mockAirtelProvider;
    case 'zamtel':
      return mockZamtelProvider;
    case 'bank':
      return mockBankProvider;
    case 'visa':
      return mockVisaProvider;
    default:
      throw new Error(`Unknown payment provider: ${type}`);
  }
}

export const PAYMENT_PROVIDERS: {
  id: PaymentProviderType;
  name: string;
  description: string;
  planned: boolean;
}[] = [
  { id: 'mtn', name: 'MTN Mobile Money', description: 'Pay with MTN MoMo', planned: true },
  { id: 'airtel', name: 'Airtel Money', description: 'Pay with Airtel Money', planned: true },
  { id: 'zamtel', name: 'Zamtel Money', description: 'Pay with Zamtel Money', planned: true },
  { id: 'bank', name: 'Bank Account', description: 'Pay via bank transfer', planned: true },
  { id: 'visa', name: 'Visa Card', description: 'Pay with Visa card', planned: true },
];

function createMockProvider(
  name: string,
  displayName: string,
  prefix: string
): PaymentProvider {
  const payments = new Map<
    string,
    { status: PaymentStatus; simulateFailure?: boolean; simulatePending?: boolean }
  >();

  return {
    name,
    displayName,
    async initializePayment({ amountZmw, reference, simulateFailure, simulatePending }) {
      await new Promise((r) => setTimeout(r, 500));
      const providerReference = `${prefix}_${reference}_${Date.now()}`;
      const status: PaymentStatus = simulatePending ? 'pending' : 'processing';
      payments.set(providerReference, { status, simulateFailure, simulatePending });
      return { providerReference, status };
    },
    async checkPaymentStatus(providerReference: string): Promise<PaymentStatusResult> {
      await new Promise((r) => setTimeout(r, 1000));
      const payment = payments.get(providerReference);
      if (!payment) {
        return { status: 'failed', providerReference };
      }
      if (payment.simulateFailure) {
        payment.status = 'failed';
        return { status: 'failed', providerReference };
      }
      if (payment.simulatePending) {
        return { status: 'pending', providerReference };
      }
      payment.status = 'completed';
      return { status: 'completed', providerReference };
    },
    async cancelPayment(providerReference: string) {
      const payment = payments.get(providerReference);
      if (payment) payment.status = 'cancelled';
      return { success: true };
    },
  };
}

export { createMockProvider };
