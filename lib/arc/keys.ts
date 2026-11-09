import { createHash, randomBytes } from 'crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Stable demo address. Not a key, and not used to sign anything. */
export function mockArcAddressForUser(userId: string): string {
  let seed = `easternblock-arc-v1:${userId}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const hex = createHash('sha256').update(seed).digest('hex').slice(0, 40);
    const address = `0x${hex}`;
    if (address !== ZERO_ADDRESS) return address;
    seed = `${seed}:${attempt}`;
  }
  return `0x${randomBytes(20).toString('hex')}`;
}

/**
 * Demo-only testnet key. Stored in the local JSON file so the sample app can
 * sign. Production must use a KMS or a wallet the person controls.
 */
export function generateTestnetKeypair(): { address: string; privateKey: `0x${string}` } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}
