import type { Transaction } from '@/types';
import { formatUsdcFromBaseUnits } from '@/lib/arc/units';
import { convertSatsToZMW, formatSats } from '@/lib/bitcoin/price';
import { usdcBaseUnitsToZmw } from '@/lib/fx/usd-zmw';

export function transactionAsset(tx: Transaction): 'btc' | 'usdc' {
  return tx.asset === 'usdc' ? 'usdc' : 'btc';
}

export function transactionTitle(tx: Transaction): string {
  if (tx.type === 'swap') {
    if (tx.memo?.includes('Keep 50/50')) return 'Rebalanced to 50/50';
    return transactionAsset(tx) === 'usdc' ? 'Swapped into USDC' : 'Swapped into Bitcoin';
  }
  if (transactionAsset(tx) === 'usdc') {
    const titles: Record<string, string> = {
      buy: 'USDC Purchased',
      sell: 'USDC Sold',
      send: 'USDC Sent',
      receive: 'USDC Received',
    };
    return titles[tx.type] ?? 'USDC';
  }
  const titles: Record<string, string> = {
    buy: 'Bitcoin Purchased',
    sell: 'Bitcoin Sold',
    send: 'Bitcoin Sent',
    receive: 'Bitcoin Received',
  };
  return titles[tx.type] ?? tx.type;
}

export function transactionAmountText(tx: Transaction): string {
  if (tx.type === 'swap' && tx.counter_asset) {
    const spent =
      tx.counter_asset === 'usdc'
        ? `${formatUsdcFromBaseUnits(BigInt(tx.counter_usdc_base_units || '0'))} USDC`
        : formatSats(tx.counter_sats ?? tx.amount_sats);
    const received =
      transactionAsset(tx) === 'usdc'
        ? `${formatUsdcFromBaseUnits(BigInt(tx.amount_usdc_base_units || tx.counter_usdc_base_units || '0'))} USDC`
        : formatSats(tx.amount_sats);
    return `${spent} → ${received}`;
  }
  if (transactionAsset(tx) === 'usdc') {
    return `${formatUsdcFromBaseUnits(BigInt(tx.amount_usdc_base_units || '0'))} USDC`;
  }
  return formatSats(tx.amount_sats);
}

export function transactionSign(tx: Transaction): string {
  if (tx.type === 'swap') return '';
  return transactionIsCredit(tx) ? '+' : '−';
}

export function transactionZmw(tx: Transaction, btcPrice: number, zmwPerUsd: number): number {
  if (tx.amount_zmw != null && transactionAsset(tx) === 'usdc') return Number(tx.amount_zmw);
  if (transactionAsset(tx) === 'usdc') {
    return usdcBaseUnitsToZmw(BigInt(tx.amount_usdc_base_units || '0'), zmwPerUsd);
  }
  if (tx.amount_zmw != null) return Number(tx.amount_zmw);
  return convertSatsToZMW(tx.amount_sats, btcPrice);
}

export function transactionIsCredit(tx: Transaction): boolean {
  return tx.type === 'buy' || tx.type === 'receive';
}

export function transactionFeeText(tx: Transaction): string | null {
  if (transactionAsset(tx) !== 'usdc' || !tx.fee_usdc_base_units) return null;
  const fee = BigInt(tx.fee_usdc_base_units);
  if (fee <= 0n) return null;
  return `Fee ${formatUsdcFromBaseUnits(fee)} USDC`;
}
