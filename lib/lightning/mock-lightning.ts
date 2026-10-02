import { v4 as uuidv4 } from 'uuid';
import type { LightningInvoice, LightningPaymentResult } from '@/types';
import type { LightningService } from './lightning-service';

/**
 * Mock Lightning service for DEMO MODE.
 * TODO: Replace with Breez SDK, LND, or another production Lightning provider.
 * TODO: Implement secure key management — never store private keys in the database.
 */
export class MockLightningService implements LightningService {
  private balanceSats = 0;
  private lightningAddress = 'demo@easternblock.app';
  private transactions = new Map<
    string,
    { status: string; amountSats: number }
  >();

  setBalance(sats: number) {
    this.balanceSats = sats;
  }

  setLightningAddress(address: string) {
    this.lightningAddress = address;
  }

  async createInvoice(
    amountSats: number,
    memo?: string
  ): Promise<LightningInvoice> {
    await this.simulateDelay();
    const id = uuidv4().replace(/-/g, '').slice(0, 32);
    const paymentRequest = `lnbc${amountSats}n1demo${id}${memo ? `_${Buffer.from(memo).toString('base64url')}` : ''}`;
    return {
      paymentRequest,
      amountSats,
      memo,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  async payInvoice(
    paymentRequest: string,
    amountSats?: number
  ): Promise<LightningPaymentResult> {
    await this.simulateDelay();

    if (paymentRequest.includes('fail')) {
      return {
        success: false,
        transactionId: '',
        feeSats: 0,
        error: 'Payment failed — insufficient liquidity (demo)',
      };
    }

    if (paymentRequest.includes('pending')) {
      return {
        success: false,
        transactionId: uuidv4(),
        feeSats: 0,
        error: 'Payment is still processing',
      };
    }

    const parsedAmount = amountSats ?? this.parseInvoiceAmount(paymentRequest);
    const feeSats = Math.max(10, Math.floor(parsedAmount * 0.001));
    const txId = uuidv4();

    this.transactions.set(txId, {
      status: 'completed',
      amountSats: parsedAmount,
    });

    return { success: true, transactionId: txId, feeSats };
  }

  async payLightningAddress(
    address: string,
    amountSats: number,
    _memo?: string
  ): Promise<LightningPaymentResult> {
    await this.simulateDelay();

    if (address.includes('fail')) {
      return {
        success: false,
        transactionId: '',
        feeSats: 0,
        error: 'Payment to Lightning address failed (demo)',
      };
    }

    const feeSats = Math.max(10, Math.floor(amountSats * 0.001));
    const txId = uuidv4();
    this.transactions.set(txId, { status: 'completed', amountSats });

    return { success: true, transactionId: txId, feeSats };
  }

  async getBalance(): Promise<number> {
    return this.balanceSats;
  }

  async getTransaction(transactionId: string) {
    const tx = this.transactions.get(transactionId);
    if (!tx) return null;
    return { id: transactionId, ...tx };
  }

  async getLightningAddress(): Promise<string> {
    return this.lightningAddress;
  }

  private parseInvoiceAmount(paymentRequest: string): number {
    const match = paymentRequest.match(/lnbc(\d+)n/);
    return match ? parseInt(match[1], 10) : 1000;
  }

  private simulateDelay(ms = 800): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const mockLightningService = new MockLightningService();
