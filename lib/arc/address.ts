import { ARC_USDC_ADDRESS } from './constants';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function isArcAddress(value: string): boolean {
  return ADDRESS_RE.test(value.trim());
}

export function isZeroAddress(value: string): boolean {
  return value.trim().toLowerCase() === ZERO_ADDRESS;
}

export function validateArcRecipient(value: string, ownAddress?: string): string | null {
  const trimmed = value.trim();
  if (!isArcAddress(trimmed)) {
    return 'Enter a valid Arc address. It starts with 0x and has 40 hex characters.';
  }
  if (isZeroAddress(trimmed)) {
    return 'You cannot send USDC to the zero address.';
  }
  if (trimmed.toLowerCase() === ARC_USDC_ADDRESS.toLowerCase()) {
    return 'That address is the USDC token contract, not a wallet.';
  }
  if (ownAddress && trimmed.toLowerCase() === ownAddress.toLowerCase()) {
    return 'Choose a different address. This one is your own Arc wallet.';
  }
  return null;
}

export function normalizeArcAddress(value: string): string {
  return value.trim().toLowerCase();
}
