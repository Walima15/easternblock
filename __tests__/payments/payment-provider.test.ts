import { describe, it, expect } from 'vitest';
import { createMockProvider } from '@/lib/payments/payment-provider';

describe('Mock payment providers', () => {
  const provider = createMockProvider('test', 'Test Provider', 'TEST');

  it('initializes payment as processing', async () => {
    const result = await provider.initializePayment({
      amountZmw: 500,
      reference: 'tx-123',
    });
    expect(result.providerReference).toMatch(/^TEST_/);
    expect(result.status).toBe('processing');
  });

  it('returns pending status when simulated', async () => {
    const init = await provider.initializePayment({
      amountZmw: 500,
      reference: 'tx-pending',
      simulatePending: true,
    });
    const status = await provider.checkPaymentStatus(init.providerReference);
    expect(status.status).toBe('pending');
  });

  it('returns failed status when simulated', async () => {
    const init = await provider.initializePayment({
      amountZmw: 500,
      reference: 'tx-fail',
      simulateFailure: true,
    });
    const status = await provider.checkPaymentStatus(init.providerReference);
    expect(status.status).toBe('failed');
  });

  it('returns completed on success', async () => {
    const init = await provider.initializePayment({
      amountZmw: 500,
      reference: 'tx-success',
    });
    const status = await provider.checkPaymentStatus(init.providerReference);
    expect(status.status).toBe('completed');
  });

  it('cancels payment', async () => {
    const init = await provider.initializePayment({
      amountZmw: 500,
      reference: 'tx-cancel',
    });
    const result = await provider.cancelPayment(init.providerReference);
    expect(result.success).toBe(true);
  });
});
