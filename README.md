# EasternBlock

**Bitcoin and USDC made simple for Zambia.**

Demo Bitcoin Lightning wallet for Zambia, with USDC on Circle's Arc network. No real money, Bitcoin, or USDC is transferred unless you deliberately point the server at Arc testnet.

## Stack

- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- Local JSON file store (`data/demo-db.json`) — **no external database required**
- Mock Lightning, Arc, and payment providers (adapter pattern for production)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

No Supabase or database setup needed. Demo data is stored locally in `data/demo-db.json`.

## Demo flows

1. Register at `/signup`
2. Buy, send, receive, and sell Bitcoin (simulated)
3. Buy, send, receive, and sell USDC on Arc (simulated unless testnet mode is on)
4. View transaction history (Bitcoin and USDC share one list; USDC rows are tagged)
5. Read About Arc at `/about-arc`
6. Admin dashboard: include `"admin"` in your profile name

## USDC on Arc

Each account gets an Arc address stored in the local JSON file, next to the Lightning wallet. The dashboard shows one USDC balance beside the Bitcoin balance, plus a kwacha figure.

The kwacha figure uses a **fixed demo rate** of 1 USDC = K27.50 (`lib/fx/usd-zmw.ts`). It is labelled “Demo rate” in the app. Replace `DemoUsdZmwRateProvider` when a live feed is available. USDC is treated as one US dollar.

### Decimals

Arc’s native gas token is USDC with **18 decimals**. The ERC-20 USDC interface uses **6 decimals**. They are the same balance. EasternBlock reads and sends through the ERC-20 interface only and shows a single 6-decimal balance. It does not add the 18-decimal gas balance on top.

### Modes

| `ARC_MODE` | What it does |
| --- | --- |
| `mock` (default) | No keys and no network. Balances live in `data/demo-db.json`. Send, receive, buy, and sell all work in the demo. |
| `testnet` | viem talks to Arc Testnet. Balance is `balanceOf` on the USDC contract. Send signs an ERC-20 `transfer`. Buy and sell still use the mock mobile-money and bank providers and do not mint or burn testnet USDC. |

Mainnet is not wired up.

Checked against [docs.arc.io](https://docs.arc.io/arc/references/connect-to-arc) and the [contract address list](https://docs.arc.io/arc/references/contract-addresses) on 9 Nov 2026:

| | Arc Testnet |
| --- | --- |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://explorer.testnet.arc.io` |
| USDC | `0x3600000000000000000000000000000000000000` (6 decimals) |
| Faucet | [faucet.circle.com](https://faucet.circle.com) |

`viem` ships this network as `arcTestnet`. The testnet client refuses to start if that chain id drifts from `5042002`.

### Environment

```bash
# default — leave unset
ARC_MODE=mock

# optional real testnet
ARC_MODE=testnet
ARC_RPC_URL=https://rpc.testnet.arc.io
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

Testnet setup:

1. Set `ARC_MODE=testnet` and restart the app.
2. Sign up or open the dashboard. EasternBlock creates a demo signing key in the local JSON store. Do not use that pattern in production.
3. Copy the Arc address from Receive USDC or Settings.
4. Request test USDC at [faucet.circle.com](https://faucet.circle.com) (Arc Testnet). Limits are shown on the faucet and can change.
5. Send USDC to another `0x` address. Completed testnet transfers link to `https://explorer.testnet.arc.io/tx/...`.

There is **no ARC token and no ARC airdrop**. The About Arc page says so in plain language.

Sends validate the address, reject `0x000…0` and the USDC contract itself, cap the amount (0.01 to 10,000 USDC), and use the same idempotency key, rate limit, and audit log pattern as Bitcoin sends. An optional memo is stored on the EasternBlock transaction.

## Testing

```bash
npm test
npm run build
npm run lint
```

## Reset demo data

Delete `data/demo-db.json` and restart the app.

## Important

**DEMO MODE** — EasternBlock is not authorized for real financial services.
