import { randomBytes } from 'crypto';
import { validateArcRecipient, normalizeArcAddress } from './address';
import type { ArcSendParams, ArcService, ArcTransferResult } from './arc-service';
import {
  calculateUsdcNetworkFee,
  parseBaseUnits,
  validateUsdcTransferAmount,
} from './units';

function mockTxHash(): string {
  return `0x${randomBytes(32).toString('hex')}`;
}

/**
 * In-memory Arc stand-in. Balances live on the instance; the server action
 * copies the person's ledger balance in before a transfer and writes the
 * result back. A new instance is created per request so balances are not
 * shared across users in the server process.
 */
export class MockArcService implements ArcService {
  readonly mode = 'mock' as const;
  private balances = new Map<string, bigint>();

  setBalance(address: string, amountBaseUnits: bigint) {
    this.balances.set(normalizeArcAddress(address), amountBaseUnits);
  }

  async getUsdcBalance(address: string): Promise<bigint> {
    return this.balances.get(normalizeArcAddress(address)) ?? 0n;
  }

  async estimateSendFee(params: {
    fromAddress: string;
    toAddress: string;
    amountBaseUnits: bigint;
  }): Promise<bigint> {
    return calculateUsdcNetworkFee(params.amountBaseUnits);
  }

  async sendUsdc(params: ArcSendParams): Promise<ArcTransferResult> {
    const recipientError = validateArcRecipient(params.toAddress, params.fromAddress);
    if (recipientError) return { success: false, error: recipientError };
    if (params.memo && params.memo.length > 200) {
      return { success: false, error: 'Memo must be 200 characters or fewer.' };
    }
    const amountError = validateUsdcTransferAmount(params.amountBaseUnits);
    if (amountError) return { success: false, error: amountError };

    const fromKey = normalizeArcAddress(params.fromAddress);
    const balance = this.balances.get(fromKey) ?? 0n;
    const fee = calculateUsdcNetworkFee(params.amountBaseUnits);
    if (balance < params.amountBaseUnits + fee) {
      return { success: false, error: 'Insufficient USDC balance.' };
    }

    const next = balance - params.amountBaseUnits - fee;
    this.balances.set(fromKey, next);
    const toKey = normalizeArcAddress(params.toAddress);
    const recipientBalance = this.balances.get(toKey) ?? 0n;
    this.balances.set(toKey, recipientBalance + params.amountBaseUnits);

    return {
      success: true,
      txHash: mockTxHash(),
      feeBaseUnits: fee,
      balanceBaseUnits: next,
    };
  }

  async receiveUsdc(
    address: string,
    amountBaseUnits: bigint,
    memo?: string
  ): Promise<ArcTransferResult> {
    if (memo && memo.length > 200) {
      return { success: false, error: 'Memo must be 200 characters or fewer.' };
    }
    const amountError = validateUsdcTransferAmount(amountBaseUnits);
    if (amountError) return { success: false, error: amountError };
    const key = normalizeArcAddress(address);
    const next = (this.balances.get(key) ?? 0n) + amountBaseUnits;
    this.balances.set(key, next);
    return {
      success: true,
      txHash: mockTxHash(),
      feeBaseUnits: 0n,
      balanceBaseUnits: next,
    };
  }

  explorerTxUrl(txHash: string): string | null {
    void txHash;
    return null;
  }
}

export function balanceFromLedger(value: string | null | undefined): bigint {
  return parseBaseUnits(value);
}
