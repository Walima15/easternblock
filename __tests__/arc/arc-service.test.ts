import { describe, expect, it } from 'vitest';
import { arcTestnet } from 'viem/chains';
import { validateArcRecipient } from '@/lib/arc/address';
import { MockArcService } from '@/lib/arc/mock-arc';
import { TestnetArcService, createViemArcChain } from '@/lib/arc/testnet-arc';
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_RPC_URL,
  ARC_USDC_ADDRESS,
  arcTestnetTxUrl,
} from '@/lib/arc/constants';
import {
  calculateUsdcNetworkFee,
  formatUsdcFromBaseUnits,
  nativeGasUnitsToUsdcBaseUnits,
  parseUsdcInput,
  selectUsdcDisplayBalance,
  validateUsdcTransferAmount,
} from '@/lib/arc/units';
import { sendUsdcSchema } from '@/lib/security/validation';
import { DEMO_USD_ZMW_RATE, usdcBaseUnitsToZmw, zmwToUsdcBaseUnits } from '@/lib/fx/usd-zmw';

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const ZERO = '0x0000000000000000000000000000000000000000';

describe('USDC decimals', () => {
  it('parses and formats 6-decimal amounts', () => {
    expect(parseUsdcInput('1.5')).toBe(1_500_000n);
    expect(parseUsdcInput('0.000001')).toBe(1n);
    expect(parseUsdcInput('10,000.00')).toBe(10_000_000_000n);
    expect(parseUsdcInput('0.0000001')).toBeNull();
    expect(parseUsdcInput('1.2.3')).toBeNull();
    expect(parseUsdcInput('-1')).toBeNull();
    expect(formatUsdcFromBaseUnits(1_500_000n)).toBe('1.50');
    expect(formatUsdcFromBaseUnits(1_234_567n)).toBe('1.234567');
    expect(formatUsdcFromBaseUnits(10_000_000_000n)).toBe('10,000.00');
    expect(parseUsdcInput(formatUsdcFromBaseUnits(1_234_567n))).toBe(1_234_567n);
  });

  it('converts native 18-decimal gas units into the same 6-decimal amount', () => {
    const oneUsdcNative = 10n ** 18n;
    const oneUsdcErc20 = 10n ** 6n;
    expect(nativeGasUnitsToUsdcBaseUnits(oneUsdcNative)).toBe(oneUsdcErc20);
    expect(nativeGasUnitsToUsdcBaseUnits(2_000_000_000_000_000n)).toBe(2_000n);
    expect(nativeGasUnitsToUsdcBaseUnits(10n ** 12n - 1n)).toBe(0n);
  });

  it('shows one USDC balance and does not add the gas balance', () => {
    const erc20 = 25_000_000n;
    const native = erc20 * 10n ** 12n;
    const displayed = selectUsdcDisplayBalance({ erc20BaseUnits: erc20, nativeGasUnits: native });
    expect(displayed).toBe(erc20);
    expect(displayed).not.toBe(erc20 + native);
    expect(formatUsdcFromBaseUnits(displayed)).toBe('25.00');
    expect(formatUsdcFromBaseUnits(native)).not.toBe('25.00');
    expect(
      selectUsdcDisplayBalance({
        erc20BaseUnits: 5_000_000n,
        nativeGasUnits: 9_000_000n * 10n ** 12n,
      })
    ).toBe(5_000_000n);
  });

  it('prices the demo kwacha conversion from 6-decimal units', () => {
    expect(DEMO_USD_ZMW_RATE).toBe(27.5);
    const netZmw = 492.5;
    const bought = zmwToUsdcBaseUnits(netZmw, DEMO_USD_ZMW_RATE);
    expect(bought).toBe(17_909_090n);
    expect(usdcBaseUnitsToZmw(bought, DEMO_USD_ZMW_RATE)).toBe(492.49);
  });
});

describe('Arc address and amount validation', () => {
  it('rejects the zero address, the token contract, and malformed addresses', () => {
    expect(validateArcRecipient(ZERO)).toMatch(/zero address/);
    expect(validateArcRecipient(ARC_USDC_ADDRESS)).toMatch(/token contract/);
    expect(validateArcRecipient('0x1234')).toMatch(/valid Arc address/);
    expect(validateArcRecipient(RECIPIENT)).toBeNull();
    expect(validateArcRecipient(RECIPIENT, RECIPIENT)).toMatch(/own Arc wallet/);
  });

  it('enforces send limits', () => {
    expect(validateUsdcTransferAmount(0n)).toMatch(/greater than zero/);
    expect(validateUsdcTransferAmount(1n)).toMatch(/at least 0.01/);
    expect(validateUsdcTransferAmount(10_000_000_000n + 1n)).toMatch(/10,000/);
    expect(validateUsdcTransferAmount(1_500_000n)).toBeNull();
  });

  it('validates the send schema', () => {
    const result = sendUsdcSchema.safeParse({
      recipient: RECIPIENT,
      amountUsdc: '1.50',
      memo: 'rent',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('MockArcService', () => {
  it('receives and sends USDC without double-counting the fee', async () => {
    const service = new MockArcService();
    const wallet = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
    const received = await service.receiveUsdc(wallet, parseUsdcInput('25')!, 'opening');
    expect(received.success).toBe(true);
    expect(await service.getUsdcBalance(wallet)).toBe(25_000_000n);

    const amount = parseUsdcInput('1.5')!;
    const fee = calculateUsdcNetworkFee(amount);
    expect(fee).toBe(10_000n);

    const sent = await service.sendUsdc({
      fromAddress: wallet,
      toAddress: RECIPIENT,
      amountBaseUnits: amount,
      memo: 'rent',
    });
    expect(sent.success).toBe(true);
    expect(sent.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(sent.feeBaseUnits).toBe(fee);
    expect(sent.balanceBaseUnits).toBe(25_000_000n - amount - fee);
    expect(await service.getUsdcBalance(wallet)).toBe(25_000_000n - amount - fee);
    expect(await service.getUsdcBalance(RECIPIENT)).toBe(amount);
    expect(service.explorerTxUrl(sent.txHash!)).toBeNull();
  });

  it('rejects invalid sends and leaves the balance untouched', async () => {
    const service = new MockArcService();
    const wallet = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
    service.setBalance(wallet, parseUsdcInput('5')!);

    expect((await service.sendUsdc({
      fromAddress: wallet,
      toAddress: ZERO,
      amountBaseUnits: parseUsdcInput('1')!,
    })).success).toBe(false);

    expect((await service.sendUsdc({
      fromAddress: wallet,
      toAddress: 'not-an-address',
      amountBaseUnits: parseUsdcInput('1')!,
    })).success).toBe(false);

    expect((await service.sendUsdc({
      fromAddress: wallet,
      toAddress: RECIPIENT,
      amountBaseUnits: parseUsdcInput('10001')!,
    })).success).toBe(false);

    expect((await service.sendUsdc({
      fromAddress: wallet,
      toAddress: RECIPIENT,
      amountBaseUnits: parseUsdcInput('4.999')!,
    })).error).toMatch(/Insufficient/);

    expect(await service.getUsdcBalance(wallet)).toBe(5_000_000n);
  });
});

describe('TestnetArcService', () => {
  it('matches the documented Arc testnet chain', () => {
    expect(arcTestnet.id).toBe(ARC_TESTNET_CHAIN_ID);
    expect(arcTestnet.id).toBe(5042002);
    expect(arcTestnet.rpcUrls.default.http[0]).toBe(ARC_TESTNET_RPC_URL);
    expect(arcTestnet.blockExplorers?.default.url).toBe(ARC_TESTNET_EXPLORER_URL);
    expect(arcTestnet.nativeCurrency.decimals).toBe(18);
    expect(arcTestnet.nativeCurrency.symbol).toBe('USDC');
    expect(ARC_USDC_ADDRESS).toBe('0x3600000000000000000000000000000000000000');
    expect(createViemArcChain({ rpcUrl: ARC_TESTNET_RPC_URL, usdcAddress: ARC_USDC_ADDRESS })).toBeTruthy();
    expect(() => createViemArcChain({ usdcAddress: 'not-an-address' })).toThrow();
  });

  it('reads only the ERC-20 balance and does not subtract the gas fee twice', async () => {
    const calls: string[] = [];
    let balance = 10_000_000n;
    const feeNative = 2_000n * 10n ** 12n;
    const service = new TestnetArcService({
      async balanceOf() {
        calls.push('balanceOf');
        return balance;
      },
      async estimateTransferFeeBaseUnits() {
        calls.push('estimate');
        return 2_000n;
      },
      async transfer({ amount }) {
        calls.push('transfer');
        balance = balance - amount - 2_000n;
        return {
          hash: `0x${'ab'.repeat(32)}`,
          feeNativeUnits: feeNative,
          status: 'success' as const,
        };
      },
    });

    const result = await service.sendUsdc({
      fromAddress: '0x2222222222222222222222222222222222222222',
      toAddress: RECIPIENT,
      amountBaseUnits: 1_000_000n,
      privateKey: `0x${'11'.repeat(32)}`,
      memo: 'invoice 14',
    });

    expect(result.success).toBe(true);
    expect(result.feeBaseUnits).toBe(2_000n);
    expect(result.balanceBaseUnits).toBe(8_998_000n);
    expect(calls.filter((call) => call === 'balanceOf')).toHaveLength(2);
    expect(calls).not.toContain('getBalance');
    expect(service.explorerTxUrl(result.txHash!)).toBe(
      `${ARC_TESTNET_EXPLORER_URL}/tx/${result.txHash}`
    );
    expect(arcTestnetTxUrl('0xabc')).toBeNull();
  });

  it('does not offer a second balance when a transfer is rejected', async () => {
    const service = new TestnetArcService({
      async balanceOf() {
        return 1_000_000n;
      },
      async estimateTransferFeeBaseUnits() {
        return 2_000n;
      },
      async transfer() {
        return {
          hash: `0x${'cd'.repeat(32)}`,
          feeNativeUnits: 2_000n * 10n ** 12n,
          status: 'reverted' as const,
        };
      },
    });

    const result = await service.sendUsdc({
      fromAddress: '0x2222222222222222222222222222222222222222',
      toAddress: RECIPIENT,
      amountBaseUnits: 100_000n,
      privateKey: `0x${'11'.repeat(32)}`,
    });
    expect(result.success).toBe(false);
    expect(result.balanceBaseUnits).toBe(1_000_000n);
    expect((await service.receiveUsdc()).success).toBe(false);
  });
});
