/**
 * Arc network facts checked against docs.arc.io on 9 Nov 2026:
 * - https://docs.arc.io/arc/references/connect-to-arc
 * - https://docs.arc.io/arc/references/contract-addresses
 *
 * Native gas USDC uses 18 decimals. The ERC-20 interface uses 6.
 * They are the same balance. This app shows the 6-decimal figure only.
 * Mainnet sends are intentionally not wired up.
 */

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_MAINNET_CHAIN_ID = 5042;

export const ARC_TESTNET_RPC_URL = 'https://rpc.testnet.arc.io';
export const ARC_MAINNET_RPC_URL = 'https://rpc.mainnet.arc.io';

export const ARC_TESTNET_EXPLORER_URL = 'https://explorer.testnet.arc.io';
export const ARC_MAINNET_EXPLORER_URL = 'https://explorer.arc.io';

/** Optional ERC-20 interface for native USDC. Same address on mainnet and testnet. 6 decimals. */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

export const ARC_FAUCET_URL = 'https://faucet.circle.com';

export const USDC_DECIMALS = 6;
export const NATIVE_USDC_DECIMALS = 18;

/** 20 gwei. Arc's mempool rejects a lower maxFeePerGas. */
export const ARC_MIN_MAX_FEE_PER_GAS = 20n * 1_000_000_000n;

export const MIN_USDC_BASE_UNITS = 10_000n; // 0.01 USDC
export const MAX_USDC_BASE_UNITS = 10_000_000_000n; // 10,000 USDC
export const DEMO_MIN_USDC_FEE_BASE_UNITS = 10_000n; // 0.01 USDC

export type ArcMode = 'mock' | 'testnet';

export function getArcMode(): ArcMode {
  return process.env.ARC_MODE === 'testnet' ? 'testnet' : 'mock';
}

export function arcTestnetTxUrl(txHash: string): string | null {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return null;
  return `${ARC_TESTNET_EXPLORER_URL}/tx/${txHash}`;
}
