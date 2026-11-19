import { gunzipSync, gzipSync } from 'zlib';
import {
  emptyDemoDatabase,
  type DemoDatabase,
} from './demo-types';

/** Stay under the 4KB-per-cookie browser limit after the name and attributes. */
export const COOKIE_CHUNK_SIZE = 3000;
export const MAX_COOKIE_CHUNKS = 6;
export const COOKIE_PREFIX = 'ebdb_';
export const COOKIE_COUNT_NAME = 'ebdb_n';

const MAX_PAYLOAD = COOKIE_CHUNK_SIZE * MAX_COOKIE_CHUNKS;

export function parseDemoDatabase(value: unknown): DemoDatabase | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<DemoDatabase>;
  if (!Array.isArray(record.users) || !Array.isArray(record.wallets)) return null;
  if (!Array.isArray(record.profiles) || !Array.isArray(record.transactions)) return null;

  return {
    users: record.users,
    profiles: record.profiles,
    wallets: record.wallets,
    transactions: record.transactions,
    payments: Array.isArray(record.payments) ? record.payments : [],
    idempotency_keys: Array.isArray(record.idempotency_keys) ? record.idempotency_keys : [],
    audit_logs: Array.isArray(record.audit_logs) ? record.audit_logs : [],
    arc_keys: Array.isArray(record.arc_keys) ? record.arc_keys : [],
  };
}

/** Drop bulky logs before the database is stored in a cookie. */
export function pruneDemoDatabase(db: DemoDatabase): DemoDatabase {
  return {
    ...db,
    transactions: [...db.transactions]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-80),
    payments: [...db.payments].slice(-80),
    idempotency_keys: [...db.idempotency_keys].slice(-20),
    audit_logs: [...db.audit_logs].slice(-10),
  };
}

/**
 * localStorage backup. Signing keys stay in the httpOnly cookie only.
 * A restored backup can log in again; Arc testnet creates a new demo key if the cookie is gone.
 */
export function toBrowserBackup(db: DemoDatabase): DemoDatabase {
  return {
    ...pruneDemoDatabase(db),
    arc_keys: [],
  };
}

export function compressDemoDatabase(db: DemoDatabase): string {
  const json = JSON.stringify(pruneDemoDatabase(db));
  return gzipSync(Buffer.from(json, 'utf8')).toString('base64url');
}

export function decompressDemoDatabase(payload: string): DemoDatabase | null {
  if (!payload || payload.length > MAX_PAYLOAD) return null;
  try {
    const json = gunzipSync(Buffer.from(payload, 'base64url')).toString('utf8');
    return parseDemoDatabase(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

export function splitCookiePayload(payload: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < payload.length; index += COOKIE_CHUNK_SIZE) {
    chunks.push(payload.slice(index, index + COOKIE_CHUNK_SIZE));
  }
  return chunks.length > 0 ? chunks : [''];
}

export function joinCookiePayload(chunks: string[]): string {
  return chunks.join('');
}

/**
 * Compress and, if needed, drop the oldest activity until the payload fits
 * in a handful of cookies. Accounts themselves are never dropped.
 */
export function encodeDemoDatabaseForCookie(db: DemoDatabase): string[] {
  let working = pruneDemoDatabase(db);
  let payload = compressDemoDatabase(working);

  while (payload.length > MAX_PAYLOAD && working.transactions.length > 5) {
    const nextLength = Math.max(5, Math.floor(working.transactions.length / 2));
    working = {
      ...working,
      transactions: working.transactions.slice(-nextLength),
      payments: working.payments.slice(-nextLength),
      idempotency_keys: [],
      audit_logs: [],
    };
    payload = compressDemoDatabase(working);
  }

  if (payload.length > MAX_PAYLOAD) {
    working = {
      ...working,
      transactions: working.transactions.slice(-5),
      payments: [],
      idempotency_keys: [],
      audit_logs: [],
    };
    payload = compressDemoDatabase(working);
  }

  if (payload.length > MAX_PAYLOAD) {
    throw new Error('Demo wallet is too large to store in this browser.');
  }

  const chunks = splitCookiePayload(payload);
  if (chunks.length > MAX_COOKIE_CHUNKS) {
    throw new Error('Demo wallet is too large to store in this browser.');
  }
  return chunks;
}

export function decodeCookieChunks(chunks: Array<string | undefined>): DemoDatabase | null {
  if (chunks.some((chunk) => chunk == null)) return null;
  return decompressDemoDatabase(joinCookiePayload(chunks as string[]));
}

export function databaseIsEmpty(db: DemoDatabase): boolean {
  return db.users.length === 0 && db.wallets.length === 0 && db.transactions.length === 0;
}

export { emptyDemoDatabase };
