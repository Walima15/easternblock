/**
 * Bitcoin price service for EasternBlock.
 * MVP uses mock BTC/ZMW price. Replace with real API (e.g. exchange rate feed) in production.
 */

const MOCK_BTC_ZMW_PRICE = 2_500_000; // 1 BTC = K2,500,000 ZMW (demo rate)
const SATS_PER_BTC = 100_000_000;

export async function getBTCZMWPrice(): Promise<number> {
  // TODO: Replace with real price API integration
  // Example: fetch from exchange or price aggregator with BTC_PRICE_API_KEY
  return MOCK_BTC_ZMW_PRICE;
}

export function convertZMWToSats(zmw: number, btcZmwPrice: number): number {
  if (zmw <= 0 || btcZmwPrice <= 0) return 0;
  const btc = zmw / btcZmwPrice;
  return Math.floor(btc * SATS_PER_BTC);
}

export function convertSatsToZMW(sats: number, btcZmwPrice: number): number {
  if (sats <= 0 || btcZmwPrice <= 0) return 0;
  const btc = sats / SATS_PER_BTC;
  return Math.round((btc * btcZmwPrice) * 100) / 100;
}

export function formatZMW(amount: number): string {
  return `K${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSats(sats: number): string {
  return `${sats.toLocaleString()} sats`;
}

export function formatBTC(sats: number): string {
  const btc = sats / SATS_PER_BTC;
  return `${btc.toFixed(8)} BTC`;
}

export const SERVICE_FEE_PERCENT = 0.015; // 1.5% demo fee

export function calculateServiceFeeZMW(amountZmw: number): number {
  return Math.round(amountZmw * SERVICE_FEE_PERCENT * 100) / 100;
}

export function calculateLightningFeeSats(amountSats: number): number {
  // Demo flat fee structure
  if (amountSats < 1000) return 10;
  if (amountSats < 10000) return 50;
  if (amountSats < 100000) return 100;
  return 200;
}
