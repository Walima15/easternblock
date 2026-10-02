import { describe, it, expect } from 'vitest';
import { MockLightningService } from '@/lib/lightning/mock-lightning';

describe('MockLightningService', () => {
  const service = new MockLightningService();

  it('creates a Lightning invoice', async () => {
    const invoice = await service.createInvoice(10000, 'Test payment');
    expect(invoice.paymentRequest).toMatch(/^lnbc/);
    expect(invoice.amountSats).toBe(10000);
    expect(invoice.memo).toBe('Test payment');
  });

  it('pays a Lightning invoice successfully', async () => {
    const invoice = await service.createInvoice(5000);
    const result = await service.payInvoice(invoice.paymentRequest, 5000);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeTruthy();
    expect(result.feeSats).toBeGreaterThan(0);
  });

  it('fails payment for fail invoice', async () => {
    const result = await service.payInvoice('lnbc1000n1demofail', 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('pays Lightning address', async () => {
    const result = await service.payLightningAddress('user@easternblock.app', 3000);
    expect(result.success).toBe(true);
  });

  it('returns lightning address', async () => {
    service.setLightningAddress('test@easternblock.app');
    const address = await service.getLightningAddress();
    expect(address).toBe('test@easternblock.app');
  });
});
