'use server';

import { parseDemoDatabase, databaseIsEmpty, toBrowserBackup } from '@/lib/db/demo-codec';
import { readDemoDatabase, replaceDemoDatabase } from '@/lib/db/local-store';

/** Browser backup of the demo database. Signing keys are not included. */
export async function pullDemoBackup(): Promise<string | null> {
  const db = await readDemoDatabase();
  if (databaseIsEmpty(db)) return null;
  return JSON.stringify(toBrowserBackup(db));
}

/**
 * Restore a browser backup only when this browser has no cookie database yet.
 * Private keys in the payload are ignored.
 */
export async function restoreDemoBackup(serialized: string): Promise<{ ok: boolean }> {
  if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > 400_000) {
    return { ok: false };
  }
  const current = await readDemoDatabase();
  if (!databaseIsEmpty(current)) return { ok: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return { ok: false };
  }
  const next = parseDemoDatabase(parsed);
  if (!next || next.users.length === 0) return { ok: false };
  const usersLookReal = next.users.every(
    (user) =>
      user &&
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.password_hash === 'string'
  );
  if (!usersLookReal) return { ok: false };
  next.arc_keys = [];
  await replaceDemoDatabase(next);
  return { ok: true };
}
