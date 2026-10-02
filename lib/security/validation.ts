import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const buySchema = z.object({
  amountZmw: z.number().positive('Amount must be greater than zero').max(1_000_000),
  provider: z.enum(['mtn', 'airtel', 'zamtel', 'bank', 'visa']),
  phoneNumber: z.string().optional(),
  idempotencyKey: z.string().uuid(),
  simulateFailure: z.boolean().optional(),
  simulatePending: z.boolean().optional(),
});

export const sellSchema = z.object({
  amountSats: z.number().int().positive('Amount must be greater than zero'),
  provider: z.enum(['mtn', 'airtel', 'zamtel', 'bank']),
  phoneNumber: z.string().optional(),
  idempotencyKey: z.string().uuid(),
  simulateFailure: z.boolean().optional(),
});

export const sendSchema = z.object({
  recipient: z.string().min(3, 'Recipient is required'),
  amountSats: z.number().int().positive('Amount must be greater than zero'),
  memo: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid(),
  simulateFailure: z.boolean().optional(),
});

export const receiveSchema = z.object({
  amountSats: z.number().int().positive().optional(),
  memo: z.string().max(200).optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phoneNumber: z
    .string()
    .regex(/^(\+260|0)?[0-9]{9}$/, 'Enter a valid Zambian phone number')
    .optional()
    .or(z.literal('')),
});

export function isLightningInvoice(value: string): boolean {
  return value.toLowerCase().startsWith('lnbc') || value.toLowerCase().startsWith('lntb');
}

export function isLightningAddress(value: string): boolean {
  return /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

export function sanitizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('260')) return `+${digits}`;
  if (digits.startsWith('0')) return `+260${digits.slice(1)}`;
  return `+260${digits}`;
}
