import {
  completeIdempotencyRecord,
  createIdempotency,
  getIdempotency,
} from '@/lib/db/local-store';

export async function checkIdempotency(
  userId: string,
  key: string,
  operation: string
): Promise<{ exists: boolean; transactionId?: string; response?: unknown }> {
  const existing = getIdempotency(userId, key);

  if (existing) {
    return {
      exists: true,
      transactionId: existing.transaction_id ?? undefined,
      response: existing.response,
    };
  }

  createIdempotency(userId, key, operation);
  return { exists: false };
}

export async function completeIdempotency(
  userId: string,
  key: string,
  transactionId: string,
  response: unknown
) {
  completeIdempotencyRecord(userId, key, transactionId, response);
}
