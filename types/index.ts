export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

export type TransactionType = 'buy' | 'sell' | 'send' | 'receive';

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
