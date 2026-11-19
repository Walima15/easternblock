import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Payment, Profile, Transaction, Wallet } from '@/types';
import { getArcMode } from '@/lib/arc/constants';
import { mockArcAddressForUser, generateTestnetKeypair } from '@/lib/arc/keys';
import { emptyDemoDatabase, type DemoDatabase, type IdempotencyRecord } from '@/lib/db/demo-types';

/**
 * Demo accounts live in the browser.
 * Inside a Next.js request the database is an httpOnly cookie, so signup,
 * login, balances, and history survive Netlify's read-only filesystem.
 * Vitest and DEMO_STORE=file keep using data/demo-db.json.
 * Signing keys stay in that cookie. They are never written to localStorage.
 */

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'demo-db.json');

function fileStoreEnabled() {
  return process.env.VITEST === 'true' || process.env.DEMO_STORE === 'file';
}

function normalizeDb(db: DemoDatabase): DemoDatabase {
  if (!db.arc_keys) db.arc_keys = [];
  if (!db.audit_logs) db.audit_logs = [];
  if (!db.idempotency_keys) db.idempotency_keys = [];
  if (!db.payments) db.payments = [];
  if (!db.profiles) db.profiles = [];
  if (!db.transactions) db.transactions = [];
  if (!db.users) db.users = [];
  if (!db.wallets) db.wallets = [];
  return db;
}

function readFileDb(): DemoDatabase {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    const db = emptyDemoDatabase();
    writeFileDb(db);
    return db;
  }
  return normalizeDb(JSON.parse(readFileSync(DB_PATH, 'utf-8')) as DemoDatabase);
}

function writeFileDb(db: DemoDatabase) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function rethrowIfNextControlFlow(error: unknown) {
  if (!error || typeof error !== 'object') return;
  const digest = 'digest' in error ? String((error as { digest?: unknown }).digest) : '';
  const message = error instanceof Error ? error.message : '';
  if (digest === 'DYNAMIC_SERVER_USAGE' || message.includes('Dynamic server usage')) {
    throw error;
  }
}

function isCookieWriteBlocked(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Cookies can only be modified');
}

async function readDb(): Promise<DemoDatabase> {
  if (fileStoreEnabled()) return readFileDb();
  try {
    const { readRequestDatabase } = await import('./request-db');
    return normalizeDb(await readRequestDatabase());
  } catch (error) {
    rethrowIfNextControlFlow(error);
    try {
      return readFileDb();
    } catch {
      return emptyDemoDatabase();
    }
  }
}

async function writeDb(db: DemoDatabase) {
  if (fileStoreEnabled()) {
    writeFileDb(db);
    return;
  }
  try {
    const { persistRequestDatabase } = await import('./request-db');
    await persistRequestDatabase(db);
  } catch (error) {
    rethrowIfNextControlFlow(error);
    if (isCookieWriteBlocked(error)) return;
    throw error;
  }
}

export async function readDemoDatabase(): Promise<DemoDatabase> {
  return await readDb();
}

export async function replaceDemoDatabase(db: DemoDatabase) {
  const next = normalizeDb(db);
  if (fileStoreEnabled()) {
    writeFileDb(next);
    return;
  }
  const { replaceRequestDatabase } = await import('./request-db');
  await replaceRequestDatabase(next);
}

function now() {
  return new Date().toISOString();
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const test = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuf, test);
}

function lightningUsername(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
}

function createArcAccount(userId: string): { address: string; privateKey: string | null } {
  if (getArcMode() === 'testnet') {
    const account = generateTestnetKeypair();
    return { address: account.address, privateKey: account.privateKey };
  }
  return { address: mockArcAddressForUser(userId), privateKey: null };
}

/**
 * Fill a mock Arc address without creating a testnet key.
 * Key generation happens in createUser or saveArcKey, both of which can set cookies.
 */
function attachArcWallet(db: DemoDatabase, wallet: Wallet, userId: string): boolean {
  let changed = false;
  if (!db.arc_keys) db.arc_keys = [];
  if (wallet.arc_balance_base_units == null || wallet.arc_balance_base_units === '') {
    wallet.arc_balance_base_units = '0';
    changed = true;
  }

  if (getArcMode() === 'testnet') {
    const key = db.arc_keys.find((entry) => entry.user_id === userId);
    if (key && wallet.arc_address !== key.address) {
      wallet.arc_address = key.address;
      changed = true;
    }
  } else if (!wallet.arc_address) {
    wallet.arc_address = mockArcAddressForUser(userId);
    changed = true;
  }

  return changed;
}

export async function createUser(email: string, password: string, fullName: string) {
  const db = await readDb();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'An account with this email already exists' };
  }

  const userId = uuidv4();
  const profileId = uuidv4();
  const walletId = uuidv4();
  const timestamp = now();
  const arc = createArcAccount(userId);

  db.users.push({ id: userId, email: email.toLowerCase(), password_hash: hashPassword(password) });
  db.profiles.push({
    id: profileId,
    user_id: userId,
    full_name: fullName,
    phone_number: null,
    country: 'Zambia',
    kyc_status: 'not_started',
    created_at: timestamp,
    updated_at: timestamp,
  });
  db.wallets.push({
    id: walletId,
    user_id: userId,
    wallet_type: 'lightning',
    lightning_address: `${lightningUsername(email)}@easternblock.app`,
    balance_sats: 0,
    arc_address: arc.address,
    arc_balance_base_units: '0',
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (arc.privateKey) {
    db.arc_keys.push({ user_id: userId, address: arc.address, private_key: arc.privateKey });
  }

  await writeDb(db);
  return { userId };
}

export async function authenticateUser(email: string, password: string) {
  const db = await readDb();
  const user = db.users.find((u) => u.email === email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  return { id: user.id, email: user.email };
}

export async function getUserById(userId: string) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export async function getProfile(userId: string) {
  return (await readDb()).profiles.find((p) => p.user_id === userId) ?? null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone_number'>>
) {
  const db = await readDb();
  const profile = db.profiles.find((p) => p.user_id === userId);
  if (!profile) return { error: 'Profile not found' };
  if (updates.full_name !== undefined) profile.full_name = updates.full_name;
  if (updates.phone_number !== undefined) profile.phone_number = updates.phone_number;
  profile.updated_at = now();
  await writeDb(db);
  return { success: true };
}

export async function getWallet(userId: string) {
  const db = await readDb();
  const wallet =
    db.wallets.find((w) => w.user_id === userId && w.wallet_type === 'lightning') ??
    db.wallets.find((w) => w.user_id === userId);
  if (!wallet) return null;
  attachArcWallet(db, wallet, userId);
  return wallet;
}

export async function getWalletByArcAddress(address: string) {
  const normalized = address.toLowerCase();
  return (await readDb()).wallets.find((w) => w.arc_address?.toLowerCase() === normalized) ?? null;
}

/** Server-side only. Do not return this from a server action. */
export async function getArcSigningKey(userId: string): Promise<string | null> {
  const db = await readDb();
  return db.arc_keys.find((entry) => entry.user_id === userId)?.private_key ?? null;
}

export async function updateWalletBalance(walletId: string, balanceSats: number) {
  const db = await readDb();
  const wallet = db.wallets.find((w) => w.id === walletId);
  if (!wallet) return;
  wallet.balance_sats = balanceSats;
  wallet.updated_at = now();
  await writeDb(db);
}

export async function updateArcBalance(walletId: string, balanceBaseUnits: string) {
  const db = await readDb();
  const wallet = db.wallets.find((w) => w.id === walletId);
  if (!wallet) return;
  wallet.arc_balance_base_units = balanceBaseUnits;
  wallet.updated_at = now();
  await writeDb(db);
}

export async function createTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
) {
  const db = await readDb();
  const transaction: Transaction = {
    ...data,
    asset: data.asset ?? 'btc',
    amount_usdc_base_units: data.amount_usdc_base_units ?? null,
    fee_usdc_base_units: data.fee_usdc_base_units ?? null,
    tx_hash: data.tx_hash ?? null,
    explorer_url: data.explorer_url ?? null,
    counter_asset: data.counter_asset ?? null,
    counter_sats: data.counter_sats ?? null,
    counter_usdc_base_units: data.counter_usdc_base_units ?? null,
    id: uuidv4(),
    created_at: now(),
    updated_at: now(),
  };
  db.transactions.push(transaction);
  await writeDb(db);
  return transaction;
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'created_at'>>
) {
  const db = await readDb();
  const transaction = db.transactions.find((t) => t.id === transactionId);
  if (!transaction) return null;
  Object.assign(transaction, updates, { updated_at: now() });
  await writeDb(db);
  return transaction;
}

export async function createPayment(data: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) {
  const db = await readDb();
  const payment: Payment = {
    ...data,
    id: uuidv4(),
    created_at: now(),
    updated_at: now(),
  };
  db.payments.push(payment);
  await writeDb(db);
  return payment;
}

export async function updatePaymentByTransactionId(
  transactionId: string,
  updates: Partial<Omit<Payment, 'id' | 'created_at'>>
) {
  const db = await readDb();
  const payment = db.payments.find((p) => p.transaction_id === transactionId);
  if (!payment) return null;
  Object.assign(payment, updates, { updated_at: now() });
  await writeDb(db);
  return payment;
}

export async function getTransactions(userId: string, type?: string, asset?: string) {
  let txs = (await readDb())
    .transactions.filter((t) => t.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (type && type !== 'all') {
    txs = txs.filter((t) => t.type === type);
  }
  if (asset === 'usdc') {
    txs = txs.filter((t) => t.asset === 'usdc' || t.counter_asset === 'usdc');
  } else if (asset === 'btc') {
    txs = txs.filter((t) => t.asset !== 'usdc' || t.counter_asset === 'btc');
  }
  return txs;
}

export async function getRecentTransactions(userId: string, limit = 5) {
  return (await getTransactions(userId)).slice(0, limit);
}

export async function getIdempotency(userId: string, key: string) {
  return (await readDb()).idempotency_keys.find((k) => k.user_id === userId && k.key === key) ?? null;
}

export async function createIdempotency(userId: string, key: string, operation: string) {
  const db = await readDb();
  const record: IdempotencyRecord = {
    id: uuidv4(),
    user_id: userId,
    key,
    operation,
    transaction_id: null,
    response: null,
    created_at: now(),
  };
  db.idempotency_keys.push(record);
  await writeDb(db);
}

export async function completeIdempotencyRecord(
  userId: string,
  key: string,
  transactionId: string,
  response: unknown
) {
  const db = await readDb();
  const record = db.idempotency_keys.find((k) => k.user_id === userId && k.key === key);
  if (!record) return;
  record.transaction_id = transactionId;
  record.response = response;
  await writeDb(db);
}

export async function addAuditLog(params: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await readDb();
  db.audit_logs.push({
    id: uuidv4(),
    user_id: params.userId ?? null,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    metadata: params.metadata ?? null,
    created_at: now(),
  });
  await writeDb(db);
}

export async function getAdminStats() {
  const db = await readDb();
  const all = db.transactions;
  const completed = all.filter((t) => t.status === 'completed');
  const pending = all.filter((t) => t.status === 'pending' || t.status === 'processing');
  const failed = all.filter((t) => t.status === 'failed');

  return {
    totalUsers: db.profiles.length,
    totalTransactions: all.length,
    btcVolumeSats: completed
      .filter((t) => t.type !== 'swap' && t.asset !== 'usdc')
      .reduce((sum, t) => sum + t.amount_sats, 0),
    usdcVolumeBaseUnits: completed
      .filter((t) => t.type !== 'swap' && t.asset === 'usdc')
      .reduce((sum, t) => sum + BigInt(t.amount_usdc_base_units || '0'), 0n)
      .toString(),
    zmwVolume: completed
      .filter((t) => t.type !== 'swap')
      .reduce((sum, t) => sum + (Number(t.amount_zmw) || 0), 0),
    pendingCount: pending.length,
    failedCount: failed.length,
    recentTransactions: [...all]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10),
  };
}

export async function saveArcKey(userId: string, address: string, privateKey: string) {
  const db = await readDb();
  const wallet = db.wallets.find((entry) => entry.user_id === userId);
  if (!wallet) return { error: 'Wallet not found' as const };
  if (!db.arc_keys) db.arc_keys = [];
  const existing = db.arc_keys.find((entry) => entry.user_id === userId);
  if (existing) {
    existing.address = address;
    existing.private_key = privateKey;
  } else {
    db.arc_keys.push({ user_id: userId, address, private_key: privateKey });
  }
  wallet.arc_address = address;
  wallet.updated_at = now();
  await writeDb(db);
  return { ok: true as const, address };
}

export async function resetDemoDatabase() {
  await replaceDemoDatabase(emptyDemoDatabase());
}
