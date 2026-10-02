import { describe, it, expect } from 'vitest';
import {
  signupSchema,
  loginSchema,
  buySchema,
  sendSchema,
  isLightningInvoice,
  isLightningAddress,
} from '@/lib/security/validation';

describe('Authentication validation', () => {
  it('validates signup input', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      fullName: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak signup password', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      fullName: 'John Doe',
    });
    expect(result.success).toBe(false);
  });

  it('validates login input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });
});

describe('Transaction validation', () => {
  it('validates buy schema', () => {
    const result = buySchema.safeParse({
      amountZmw: 500,
      provider: 'mtn',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('validates send schema', () => {
    const result = sendSchema.safeParse({
      recipient: 'user@example.com',
      amountSats: 10000,
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('detects Lightning invoice', () => {
    expect(isLightningInvoice('lnbc1000n1demo')).toBe(true);
    expect(isLightningInvoice('user@example.com')).toBe(false);
  });

  it('detects Lightning address', () => {
    expect(isLightningAddress('user@easternblock.app')).toBe(true);
    expect(isLightningAddress('invalid')).toBe(false);
  });
});
