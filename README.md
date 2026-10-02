# EasternBlock

**Bitcoin made simple for Zambia.**

Demo Bitcoin Lightning wallet for Zambia. No real money or Bitcoin is transferred.

## Stack

- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- Local JSON file store (`data/demo-db.json`) — **no external database required**
- Mock Lightning & payment providers (adapter pattern for production)

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
3. View transaction history
4. Admin dashboard: include `"admin"` in your profile name

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
