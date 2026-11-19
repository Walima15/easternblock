import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('file demo store', () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'eb-demo-'));

  afterAll(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a user without a browser cookie when DEMO_STORE=file', async () => {
    process.chdir(dir);
    process.env.DEMO_STORE = 'file';
    const { createUser, authenticateUser, getWallet, resetDemoDatabase } = await import(
      '@/lib/db/local-store'
    );
    await resetDemoDatabase();
    const created = await createUser('ada@example.com', 'correct-horse', 'Ada Admin');
    expect('userId' in created).toBe(true);
    const user = await authenticateUser('ada@example.com', 'correct-horse');
    expect(user?.email).toBe('ada@example.com');
    const wallet = user ? await getWallet(user.id) : null;
    expect(wallet?.balance_sats).toBe(0);
    expect(wallet?.arc_address.startsWith('0x')).toBe(true);
    expect(wallet?.arc_balance_base_units).toBe('0');
    const duplicate = await createUser('ada@example.com', 'correct-horse', 'Ada');
    expect('error' in duplicate).toBe(true);
    delete process.env.DEMO_STORE;
  });
});
