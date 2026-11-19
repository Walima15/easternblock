import type { Payment, Profile, Transaction, Wallet } from '@/types';

export interface DemoUser {
  id: string;
  email: string;
  password_hash: string;
}

export interface IdempotencyRecord {
  id: string;
  user_id: string;
  key: string;
  operation: string;
  transaction_id: string | null;
  response: unknown;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Demo testnet signing key. Never send this to the browser or commit it. */
export interface ArcKeyRecord {
  user_id: string;
  address: string;
  private_key: string;
}

export interface DemoDatabase {
  users: DemoUser[];
  profiles: Profile[];
  wallets: Wallet[];
  transactions: Transaction[];
  payments: Payment[];
  idempotency_keys: IdempotencyRecord[];
  audit_logs: AuditLog[];
  arc_keys: ArcKeyRecord[];
}

export function emptyDemoDatabase(): DemoDatabase {
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
