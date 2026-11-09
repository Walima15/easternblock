import { getArcMode, type ArcMode } from './constants';
import { MockArcService } from './mock-arc';

export interface ArcSendParams {
  fromAddress: string;
  toAddress: string;
  amountBaseUnits: bigint;
  memo?: string;
  /** Testnet only. Never log this. */
  privateKey?: string;
}

export interface ArcTransferResult {
  success: boolean;
  txHash?: string;
  /** Fee in ERC-20 base units (6 decimals), for display. Already reflected in the post balance. */
  feeBaseUnits?: bigint;
  /** Single USDC balance after the call, in 6-decimal base units. */
  balanceBaseUnits?: bigint;
  error?: string;
}

/**
 * Arc USDC adapter. Mock is the default so the demo runs with no keys.
 * Testnet reads and sends through the ERC-20 interface only.
 */
export interface ArcService {
  readonly mode: ArcMode;
  getUsdcBalance(address: string): Promise<bigint>;
  estimateSendFee(params: {
    fromAddress: string;
    toAddress: string;
    amountBaseUnits: bigint;
  }): Promise<bigint>;
  sendUsdc(params: ArcSendParams): Promise<ArcTransferResult>;
  receiveUsdc(address: string, amountBaseUnits: bigint, memo?: string): Promise<ArcTransferResult>;
  explorerTxUrl(txHash: string): string | null;
}

export async function getArcService(): Promise<ArcService> {
  if (getArcMode() === 'testnet') {
    const { createTestnetArcService } = await import('./testnet-arc');
    return createTestnetArcService();
  }
  return new MockArcService();
}
