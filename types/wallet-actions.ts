export type WalletActionResult =
  | { error: string }
  | { success: true; duplicate?: boolean; amountSats?: number; amountZmw?: number; newBalance?: number; transactionId?: string; externalReference?: string; message?: string }
  | { success: false; pending?: boolean; error?: string; message?: string; transactionId?: string };

export function isWalletError(
  result: WalletActionResult | null | undefined
): result is { error: string } {
  return result != null && 'error' in result && typeof result.error === 'string';
}

export function isWalletSuccess(
  result: WalletActionResult | null | undefined
): result is Extract<WalletActionResult, { success: true }> {
  return result != null && 'success' in result && result.success === true;
}

export function isWalletPending(
  result: WalletActionResult | null | undefined
): result is { success: false; pending: true; message?: string; transactionId?: string } {
  return result != null && 'pending' in result && result.pending === true;
}
