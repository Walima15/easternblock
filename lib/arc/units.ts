import {
  DEMO_MIN_USDC_FEE_BASE_UNITS,
  MAX_USDC_BASE_UNITS,
  MIN_USDC_BASE_UNITS,
  NATIVE_USDC_DECIMALS,
  USDC_DECIMALS,
} from './constants';

const USDC_SCALE = 10n ** BigInt(USDC_DECIMALS);
const NATIVE_TO_ERC20_SCALE = 10n ** BigInt(NATIVE_USDC_DECIMALS - USDC_DECIMALS);

/**
 * Convert Arc's native 18-decimal gas units into ERC-20 base units (6 decimals).
 * Use this only to display a fee. Never add the result to an ERC-20 balance:
 * both numbers describe the same USDC.
 */
export function nativeGasUnitsToUsdcBaseUnits(nativeUnits: bigint): bigint {
  if (nativeUnits <= 0n) return 0n;
  return nativeUnits / NATIVE_TO_ERC20_SCALE;
}

/**
 * The balance to show a person. `erc20BaseUnits` comes from the USDC
 * contract (6 decimals). `nativeGasUnits` is accepted so a caller that also
 * read the gas balance can pass it in and we still ignore it.
 */
export function selectUsdcDisplayBalance(params: {
  erc20BaseUnits: bigint;
  nativeGasUnits?: bigint;
}): bigint {
  return params.erc20BaseUnits;
}

export function parseBaseUnits(value: string | null | undefined): bigint {
  if (!value || !/^\d+$/.test(value)) return 0n;
  return BigInt(value);
}

/** Parse a human USDC amount into 6-decimal base units. Returns null when the text is not a valid amount. */
export function parseUsdcInput(value: string): bigint | null {
  const trimmed = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > USDC_DECIMALS) return null;
  try {
    const base = BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(USDC_DECIMALS, '0') || '0');
    return base;
  } catch {
    return null;
  }
}

/** Format 6-decimal base units. At least two decimal places, up to six, with thousands separators. */
export function formatUsdcFromBaseUnits(baseUnits: bigint): string {
  const negative = baseUnits < 0n;
  const absolute = negative ? -baseUnits : baseUnits;
  const whole = absolute / USDC_SCALE;
  const fraction = absolute % USDC_SCALE;
  let frac = fraction.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  if (frac.length < 2) frac = frac.padEnd(2, '0');
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${wholeText}.${frac}`;
}

export function formatUsdc(baseUnits: bigint): string {
  return `${formatUsdcFromBaseUnits(baseUnits)} USDC`;
}

/**
 * Demo network fee charged by the mock adapter.
 * 0.01 USDC, or 0.1% of the amount when that is larger.
 * On testnet the real fee is the gas actually paid, converted with
 * nativeGasUnitsToUsdcBaseUnits, and it is not added on top of this.
 */
export function calculateUsdcNetworkFee(amountBaseUnits: bigint): bigint {
  if (amountBaseUnits <= 0n) return DEMO_MIN_USDC_FEE_BASE_UNITS;
  const proportional = amountBaseUnits / 1000n;
  return proportional > DEMO_MIN_USDC_FEE_BASE_UNITS ? proportional : DEMO_MIN_USDC_FEE_BASE_UNITS;
}

export function validateUsdcTransferAmount(amount: bigint): string | null {
  if (amount <= 0n) return 'Enter a USDC amount greater than zero.';
  if (amount < MIN_USDC_BASE_UNITS) return 'Amount must be at least 0.01 USDC.';
  if (amount > MAX_USDC_BASE_UNITS) return 'Amount cannot exceed 10,000 USDC per transfer.';
  return null;
}
