import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Payment, Profile, Transaction, Wallet } from '@/types';
import { getArcMode } from '@/lib/arc/constants';
import { mockArcAddressForUser, generateTestnetKeypair } from '@/lib/arc/keys';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'demo-db.json');

interface DemoUser {
  id: string;
  email: string;
  password_hash: string;
}

interface IdempotencyRecord {
  id: string;
  user_id: string;
  key: string;
  operation: string;
  transaction_id: string | null;
  response: unknown;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Demo testnet signing key. Never send this to the browser. */
interface ArcKeyRecord {
  user_id: string;
  address: string;
  private_key: string;
}

interface DemoDatabase {
  users: DemoUser[];
  profiles: Profile[];
  wallets: Wallet[];
  transactions: Transaction[];
  payments: Payment[];
  idempotency_keys: IdempotencyRecord[];
  audit_logs: AuditLog[];
  arc_keys: ArcKeyRecord[];
}

function emptyDb(): DemoDatabase {
  return {
    users: [],
    profiles: [],
    wallets: [],
    transactions: [],
    payments: [],
    idempotency_keys: [],
    audit_logs: [],
    arc_keys: [],
  };
}

function readDb(): DemoDatabase {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    const db = emptyDb();
    writeDb(db);
    return db;
  }
  const db = JSON.parse(readFileSync(DB_PATH, 'utf-8')) as DemoDatabase;
  if (!db.arc_keys) db.arc_keys = [];
  return db;
}

function writeDb(db: DemoDatabase) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
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

/** Fill in an Arc address for wallets created before USDC support. Returns true when the file should be saved. */
function attachArcWallet(db: DemoDatabase, wallet: Wallet, userId: string): boolean {
  let changed = false;
  if (!db.arc_keys) db.arc_keys = [];
  if (wallet.arc_balance_base_units == null || wallet.arc_balance_base_units === '') {
    wallet.arc_balance_base_units = '0';
    changed = true;
  }

  if (getArcMode() === 'testnet') {
    let key = db.arc_keys.find((entry) => entry.user_id === userId);
    if (!key) {
      const account = generateTestnetKeypair();
      key = { user_id: userId, address: account.address, private_key: account.privateKey };
      db.arc_keys.push(key);
      wallet.arc_address = account.address;
      changed = true;
    } else if (wallet.arc_address !== key.address) {
      wallet.arc_address = key.address;
      changed = true;
    }
  } else if (!wallet.arc_address) {
    wallet.arc_address = mockArcAddressForUser(userId);
    changed = true;
  }

  return changed;
}

export function createUser(email: string, password: string, fullName: string) {
  const db = readDb();
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

  writeDb(db);
  return { userId };
}

export function authenticateUser(email: string, password: string) {
  const db = readDb();
  const user = db.users.find((u) => u.email === email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  return { id: user.id, email: user.email };
}

export function getUserById(userId: string) {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export function getProfile(userId: string) {
  return readDb().profiles.find((p) => p.user_id === userId) ?? null;
}

export function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone_number'>>
) {
  const db = readDb();
  const profile = db.profiles.find((p) => p.user_id === userId);
  if (!profile) return { error: 'Profile not found' };
  if (updates.full_name !== undefined) profile.full_name = updates.full_name;
  if (updates.phone_number !== undefined) profile.phone_number = updates.phone_number;
  profile.updated_at = now();
  writeDb(db);
  return { success: true };
}

export function getWallet(userId: string) {
  const db = readDb();
  const wallet =
    db.wallets.find((w) => w.user_id === userId && w.wallet_type === 'lightning') ??
    db.wallets.find((w) => w.user_id === userId);
  if (!wallet) return null;
  if (attachArcWallet(db, wallet, userId)) {
    wallet.updated_at = now();
    writeDb(db);
  }
  return wallet;
}

export function getWalletByArcAddress(address: string) {
  const normalized = address.toLowerCase();
  return readDb().wallets.find((w) => w.arc_address?.toLowerCase() === normalized) ?? null;
}

/** Server-side only. Do not return this from a server action. */
export function getArcSigningKey(userId: string): string | null {
  const db = readDb();
  return db.arc_keys.find((entry) => entry.user_id === userId)?.private_key ?? null;
}

export function updateWalletBalance(walletId: string, balanceSats: number) {
  const db = readDb();
  const wallet = db.wallets.find((w) => w.id === walletId);
  if (!wallet) return;
  wallet.balance_sats = balanceSats;
  wallet.updated_at = now();
  writeDb(db);
}

export function updateArcBalance(walletId: string, balanceBaseUnits: string) {
  const db = readDb();
  const wallet = db.wallets.find((w) => w.id === walletId);
  if (!wallet) return;
  wallet.arc_balance_base_units = balanceBaseUnits;
  wallet.updated_at = now();
  writeDb(db);
}

export function createTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
) {
  const db = readDb();
  const transaction: Transaction = {
    ...data,
    asset: data.asset ?? 'btc',
    amount_usdc_base_units: data.amount_usdc_base_units ?? null,
    fee_usdc_base_units: data.fee_usdc_base_units ?? null,
    tx_hash: data.tx_hash ?? null,
    explorer_url: data.explorer_url ?? null,
    id: uuidv4(),
    created_at: now(),
    updated_at: now(),
  };
  db.transactions.push(transaction);
  writeDb(db);
  return transaction;
}

export function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'created_at'>>
) {
  const db = readDb();
  const transaction = db.transactions.find((t) => t.id === transactionId);
  if (!transaction) return null;
  Object.assign(transaction, updates, { updated_at: now() });
  writeDb(db);
  return transaction;
}

export function createPayment(data: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) {
  const db = readDb();
  const payment: Payment = {
    ...data,
    id: uuidv4(),
    created_at: now(),
    updated_at: now(),
  };
  db.payments.push(payment);
  writeDb(db);
  return payment;
}

export function updatePaymentByTransactionId(
  transactionId: string,
  updates: Partial<Omit<Payment, 'id' | 'created_at'>>
) {
  const db = readDb();
  const payment = db.payments.find((p) => p.transaction_id === transactionId);
  if (!payment) return null;
  Object.assign(payment, updates, { updated_at: now() });
  writeDb(db);
  return payment;
}

export function getTransactions(userId: string, type?: string, asset?: string) {
  let txs = readDb()
    .transactions.filter((t) => t.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (type && type !== 'all') {
    txs = txs.filter((t) => t.type === type);
  }
  if (asset === 'usdc') {
    txs = txs.filter((t) => t.asset === 'usdc');
  } else if (asset === 'btc') {
    txs = txs.filter((t) => t.asset !== 'usdc');
  }
  return txs;
}

export function getRecentTransactions(userId: string, limit = 5) {
  return getTransactions(userId).slice(0, limit);
}

export function getIdempotency(userId: string, key: string) {
  return readDb().idempotency_keys.find((k) => k.user_id === userId && k.key === key) ?? null;
}

export function createIdempotency(userId: string, key: string, operation: string) {
  const db = readDb();
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
  writeDb(db);
}

export function completeIdempotencyRecord(
  userId: string,
  key: string,
  transactionId: string,
  response: unknown
) {
  const db = readDb();
  const record = db.idempotency_keys.find((k) => k.user_id === userId && k.key === key);
  if (!record) return;
  record.transaction_id = transactionId;
  record.response = response;
  writeDb(db);
}

export function addAuditLog(params: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = readDb();
  db.audit_logs.push({
    id: uuidv4(),
    user_id: params.userId ?? null,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    metadata: params.metadata ?? null,
    created_at: now(),
  });
  writeDb(db);
}

export function getAdminStats() {
  const db = readDb();
  const all = db.transactions;
  const completed = all.filter((t) => t.status === 'completed');
  const pending = all.filter((t) => t.status === 'pending' || t.status === 'processing');
  const failed = all.filter((t) => t.status === 'failed');

  return {
    totalUsers: db.profiles.length,
    totalTransactions: all.length,
    btcVolumeSats: completed
      .filter((t) => t.asset !== 'usdc')
      .reduce((sum, t) => sum + t.amount_sats, 0),
    usdcVolumeBaseUnits: completed
      .filter((t) => t.asset === 'usdc')
      .reduce((sum, t) => sum + BigInt(t.amount_usdc_base_units || '0'), 0n)
      .toString(),
    zmwVolume: completed.reduce((sum, t) => sum + (Number(t.amount_zmw) || 0), 0),
    pendingCount: pending.length,
    failedCount: failed.length,
    recentTransactions: [...all]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10),
  };
}

export function resetDemoDatabase() {
  writeDb(emptyDb());
}
