import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  COOKIE_COUNT_NAME,
  COOKIE_PREFIX,
  decodeCookieChunks,
  encodeDemoDatabaseForCookie,
  MAX_COOKIE_CHUNKS,
} from './demo-codec';
import { emptyDemoDatabase, type DemoDatabase } from './demo-types';

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

interface CookieWriter extends CookieReader {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: 'lax' | 'strict' | 'none';
      secure?: boolean;
      path?: string;
      maxAge?: number;
    }
  ): void;
  delete(name: string): void;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

interface RequestState {
  db: DemoDatabase;
}

const loadRequestState = cache(async (): Promise<RequestState> => {
  const jar = await cookies();
  return { db: readJar(jar) ?? emptyDemoDatabase() };
});

export async function readRequestDatabase(): Promise<DemoDatabase> {
  return (await loadRequestState()).db;
}

export async function persistRequestDatabase(db: DemoDatabase): Promise<void> {
  const state = await loadRequestState();
  if (db !== state.db) {
    state.db.users = db.users;
    state.db.profiles = db.profiles;
    state.db.wallets = db.wallets;
    state.db.transactions = db.transactions;
    state.db.payments = db.payments;
    state.db.idempotency_keys = db.idempotency_keys;
    state.db.audit_logs = db.audit_logs;
    state.db.arc_keys = db.arc_keys;
  }
  const jar = await cookies();
  writeJar(jar, state.db);
}

export async function replaceRequestDatabase(db: DemoDatabase): Promise<void> {
  const state = await loadRequestState();
  state.db = db;
  const jar = await cookies();
  writeJar(jar, state.db);
}

function readJar(jar: CookieReader): DemoDatabase | null {
  const count = Number(jar.get(COOKIE_COUNT_NAME)?.value ?? '');
  if (!Number.isInteger(count) || count < 1 || count > MAX_COOKIE_CHUNKS) return null;
  const chunks = Array.from({ length: count }, (_, index) => jar.get(`${COOKIE_PREFIX}${index}`)?.value);
  return decodeCookieChunks(chunks);
}

function writeJar(jar: CookieWriter, db: DemoDatabase) {
  const chunks = encodeDemoDatabaseForCookie(db);
  const previous = Number(jar.get(COOKIE_COUNT_NAME)?.value ?? '0');
  chunks.forEach((chunk, index) => {
    jar.set(`${COOKIE_PREFIX}${index}`, chunk, cookieOptions);
  });
  jar.set(COOKIE_COUNT_NAME, String(chunks.length), cookieOptions);
  const stale = Number.isInteger(previous) ? previous : 0;
  for (let index = chunks.length; index < stale && index < MAX_COOKIE_CHUNKS; index += 1) {
    jar.delete(`${COOKIE_PREFIX}${index}`);
  }
}
