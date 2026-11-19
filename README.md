# EasternBlock

**EasternBlock — USDC made simple for Zambia, with Bitcoin included.**

USDC-first demo wallet for Zambia. Digital dollars run on Circle's Arc network, and Bitcoin on Lightning is included beside them at equal weight. No real USDC, Bitcoin, or kwacha moves unless you deliberately point the server at Arc testnet.

## Stack

- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- Browser store for demo data (httpOnly cookie plus a localStorage backup) — **no external database and no paid service**
- Mock Lightning, Arc, and payment providers (adapter pattern for production)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

No Supabase or database setup needed. Demo accounts stay in the browser, so signup and balances work on Netlify's read-only filesystem.

## Demo flows

1. Register at `/signup`
2. Add, send, receive, and cash out USDC on Arc (simulated unless testnet mode is on)
3. Do the same for Bitcoin on Lightning. Both assets use the switcher on Send, Receive, Add money, and Cash out
4. Open Swap to move between them, or use Keep 50/50. The price is labelled as a demo rate
5. View activity for both assets
6. Read About Arc at `/about-arc`
7. Admin dashboard: include `"admin"` in your profile name

## USDC on Arc

Each account gets an Arc address stored in the local JSON file, next to the Lightning wallet. The dashboard shows one USDC balance beside the Bitcoin balance, plus a kwacha figure.

The kwacha figure uses a **fixed demo rate** of 1 USDC = K27.50 (`lib/fx/usd-zmw.ts`). It is labelled “Demo rate” in the app. Replace `DemoUsdZmwRateProvider` when a live feed is available. USDC is treated as one US dollar.

### Decimals

Arc’s native gas token is USDC with **18 decimals**. The ERC-20 USDC interface uses **6 decimals**. They are the same balance. EasternBlock reads and sends through the ERC-20 interface only and shows a single 6-decimal balance. It does not add the 18-decimal gas balance on top.

### Modes

| `ARC_MODE` | What it does |
| --- | --- |
| unset or `mock` (default) | No keys and no network. Balances live in this browser. Send, receive, buy, and sell all work in the demo. |
| `testnet` | viem talks to Arc Testnet. Balance is `balanceOf` on the USDC contract. Send signs an ERC-20 `transfer`. Buy and sell still use the mock mobile-money and bank providers and do not mint or burn testnet USDC. |

Mainnet is not wired up.

Checked against [docs.arc.network](https://docs.arc.network) on 19 Nov 2026. That index points at [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc), [contract addresses](https://docs.arc.io/arc/references/contract-addresses), and [EVM differences](https://docs.arc.io/arc/references/evm-differences):

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
2. Sign up or open the dashboard. EasternBlock creates a demo signing key in the httpOnly browser cookie. It is not copied into localStorage. Do not use that pattern in production.
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

## Where demo data lives

`data/demo-db.json` is only for Vitest and for `DEMO_STORE=file`. The running app does not use it. Each browser keeps its own database in an httpOnly cookie named `ebdb_*`. A `localStorage` key, `easternblock.demo.v1`, mirrors accounts and activity so a missing cookie can be restored. That backup does not include Arc signing keys.

Clear the site cookies and that localStorage key to reset the demo. No new hosted database is required.

## Reset demo data

Clear this site's cookies and `localStorage`, or delete `data/demo-db.json` if you were running tests.

## Important

**DEMO MODE** — EasternBlock is not authorized for real financial services.
