import { describe, expect, it } from 'vitest';
import {
  compressDemoDatabase,
  decodeCookieChunks,
  decompressDemoDatabase,
  encodeDemoDatabaseForCookie,
  splitCookiePayload,
  toBrowserBackup,
} from '@/lib/db/demo-codec';
import { emptyDemoDatabase, type DemoDatabase } from '@/lib/db/demo-types';

function sample(): DemoDatabase {
  const db = emptyDemoDatabase();
  db.users.push({ id: 'user-1', email: 'ada@example.com', password_hash: 'salt:hash' });
  db.wallets.push({
    id: 'wallet-1',
    user_id: 'user-1',
    wallet_type: 'lightning',
    lightning_address: 'ada@easternblock.app',
    balance_sats: 50_000,
    arc_address: '0x1111111111111111111111111111111111111111',
    arc_balance_base_units: '25000000',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
  });
  db.arc_keys.push({
    user_id: 'user-1',
    address: '0x1111111111111111111111111111111111111111',
    private_key: '0xabc',
  });
  db.transactions.push({
    id: 'tx-1',
    user_id: 'user-1',
    wallet_id: 'wallet-1',
    type: 'buy',
    status: 'completed',
    amount_sats: 0,
    amount_zmw: 100,
    fee_sats: 0,
    payment_method: 'mtn',
    recipient: null,
    sender: null,
    memo: null,
    external_reference: null,
    asset: 'usdc',
    amount_usdc_base_units: '25000000',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
  });
  return db;
}

describe('browser demo codec', () => {
  it('round-trips a database through cookie chunks', () => {
    const chunks = encodeDemoDatabaseForCookie(sample());
    const restored = decodeCookieChunks(chunks);
    expect(restored?.users[0]?.email).toBe('ada@example.com');
    expect(restored?.wallets[0]?.balance_sats).toBe(50_000);
    expect(restored?.wallets[0]?.arc_balance_base_units).toBe('25000000');
    expect(restored?.arc_keys[0]?.private_key).toBe('0xabc');
    expect(decompressDemoDatabase(compressDemoDatabase(sample()))?.transactions).toHaveLength(1);
  });

  it('splits and rejoins without dropping characters', () => {
    const payload = 'abc'.repeat(4000);
    const chunks = splitCookiePayload(payload);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(payload);
    expect(chunks.every((chunk) => chunk.length <= 3000)).toBe(true);
  });

  it('omits signing keys from the localStorage backup', () => {
    const backup = toBrowserBackup(sample());
    expect(backup.users).toHaveLength(1);
    expect(backup.arc_keys).toEqual([]);
  });

  it('rejects a payload that is not a database', () => {
    expect(decompressDemoDatabase('not-gzip')).toBeNull();
    expect(decodeCookieChunks([undefined])).toBeNull();
  });
});
