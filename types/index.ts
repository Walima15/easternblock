export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

export type TransactionType = 'buy' | 'sell' | 'send' | 'receive';

export type Asset = 'btc' | 'usdc';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PaymentProviderType =
  | 'mtn'
  | 'airtel'
  | 'zamtel'
  | 'bank'
  | 'visa';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  country: string;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  wallet_type: 'lightning';
  lightning_address: string;
  balance_sats: number;
  /** Arc address that holds this person's USDC. */
  arc_address: string;
  /** USDC balance in ERC-20 base units (6 decimals), stored as a decimal string. */
  arc_balance_base_units: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount_sats: number;
  amount_zmw: number | null;
  fee_sats: number;
  payment_method: PaymentProviderType | null;
  recipient: string | null;
  sender: string | null;
  memo: string | null;
  external_reference: string | null;
  /** Missing on older Bitcoin rows. Treat anything other than usdc as Bitcoin. */
  asset?: Asset;
  /** USDC amount in 6-decimal base units. Null on Bitcoin rows. */
  amount_usdc_base_units?: string | null;
  /** Network fee in 6-decimal base units, when the row is a USDC send. */
  fee_usdc_base_units?: string | null;
  tx_hash?: string | null;
  /** Set for Arc testnet transactions. Mock rows leave this empty. */
  explorer_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  transaction_id: string;
  provider: PaymentProviderType;
  provider_reference: string | null;
  amount_zmw: number;
  currency: string;
  status: PaymentStatus;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface LightningInvoice {
  paymentRequest: string;
  amountSats: number;
  memo?: string;
  expiresAt: Date;
}

export interface LightningPaymentResult {
  success: boolean;
  transactionId: string;
  feeSats: number;
  error?: string;
}

export interface PaymentInitResult {
  providerReference: string;
  status: PaymentStatus;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  providerReference: string;
}
