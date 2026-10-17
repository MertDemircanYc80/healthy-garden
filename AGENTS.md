# AGENTS.md — instructions for AI coding assistants

You are helping a 3–4 person team build **Healthy Garden** at a 1.5-day hackathon. Several
people (each with their own AI assistant) push to this repo at the same time. Your
job is to ship working features fast **without breaking teammates' work**.

Read this whole file before your first change. Then read `docs/PLAN.md` (the product
plan) and `docs/TASKS.md` (who is doing what).

## What Healthy Garden is

An iPhone app: health data (Apple Health — steps, sleep, running, meals; screen time;
driving) is analysed by AI, which sets **personal** goals and suggestions for each user.
Hitting them brings sunlight and coins, and a calm illustrated garden grows. Plants never
die (they rest). Tone: calm, encouraging, never guilt-based. Not medical advice.

## Where things are (read this first)

| Path | What | Status |
|---|---|---|
| `mobile/` | **The product.** Expo app: fixed garden + bottom island (Garden, Goals, Coach, Report, Alerts). Has its own `mobile/AGENTS.md` — read it before touching mobile code. | UI done on demo data |
| `supabase/migrations/` | Database for the app (anonymous auth + RLS). Setup: `docs/SUPABASE_SETUP.md` | Ready to apply |
| `src/` (root Next.js) | First **web prototype** (game engine, Apple Health export parser, Shortcuts ingest). Reference code; port pieces into `mobile/` when needed. | Frozen — don't add features |
| `supabase/web-prototype/` | Old prototype SQL. Never apply. | Archived |

Phase order: (1) app look ✅ → (2) Supabase + anonymous sign-in → (3) HealthKit sync
(development build) → (4) AI analysis Edge Function → (5) notifications.

## Golden rules

1. **Stay in your lane.** Work only on the task you (your human) claimed in
   `docs/TASKS.md` and the folders that task owns (see "Ownership" below). If you need
   a change outside your lane, tell your human so they can coordinate — don't just do it.
2. **Shared contracts are frozen-by-default.** `src/lib/types.ts`, `src/lib/economy.ts`,
   `src/adapters/types.ts`, the API response shape in `src/lib/api.ts`, and existing
   migrations in `supabase/migrations/` are used by everyone. Only *add* to them
   (new optional fields, new types). Renaming/removing anything requires your human to
   announce it to the team first.
3. **MVP first.** Scope is in `docs/PLAN.md` → "MVP". Do not build stretch features
   (seasonal events, friends, maps, notifications) until the hour-16 checkpoint passes.
   Do not add real payments, native apps, medical advice, or new wearables.
4. **Never commit secrets.** Keys go in `.env.local` (gitignored). Only `.env.example`
   is committed, with empty values.
5. **Before every push:** in `mobile/`: `npm run typecheck`. At the root (only if you touched
   the web prototype): `npm run lint && npm run check && npm run build`. Never push a red build to `main`.
6. **Small, frequent commits** on a feature branch; open a PR to `main` (see Git workflow).
7. **Don't add dependencies casually.** Ask your human first; prefer what's already here.
   Approved if needed: `@supabase/supabase-js`, `recharts`.
8. **Demo safety.** The mock adapter must keep working forever — it is the fallback
   for the live demo. Never make a screen depend *only* on a real data source.

## Stack

- **Next.js 16 (App Router, Turbopack, `cacheComponents: true`)** + React 19 + TypeScript
- **Tailwind CSS v4** (theme tokens in `src/app/globals.css`)
- **Supabase** (Postgres + auth) — schema in `supabase/migrations/`
- **Vercel** for hosting
- Chrome extension (Manifest V3) in `extension/` (stretch)

⚠️ Next.js 16 differs from older versions you may know. Before using a Next API, check
`node_modules/next/dist/docs/`. Known gotchas in this repo:
- `export const dynamic = "force-dynamic"` is **not allowed** (cacheComponents is on).
  For request-time server data, call `await connection()` (from `next/server`) and render
  the async component inside `<Suspense>`.
- Previously visited routes stay mounted but hidden, so tests must target visible elements.
- `params` / `searchParams` are Promises — `await` them.

## Project map

```
src/
  app/
    page.tsx              Home: 3D garden (2D grid fallback without WebGL) + plant/plot sheets
    tasks/page.tsx        Tasks screen
    shop/page.tsx         Shop screen
    impact/page.tsx       Real Impact screen
    data/page.tsx         Data sources: Apple Health import, iPhone Shortcuts sync, privacy/delete
    api/ingest/route.ts   POST health totals + app/driving events (Bearer sync token); DELETE all
    api/summaries/route.ts GET synced data as DailySummary[]
    api/**/route.ts       Other endpoints from plan §12 (stubs return 501)
  components/
    GameProvider.tsx      Holds GameState, saves to localStorage; screens use useGame()
    AppShell.tsx          Provider + onboarding gate + nav + demo panel + auto-sync
    garden3d/             three.js garden: Garden3D (canvas/camera/lights), Scenery, Plants, shared
    ui.tsx                Shared UI: PageHeader, Button, Bar, Sheet, Toasts
    Plant.tsx             2D emoji plant art (sheets, fallback grid)
  lib/
    game/engine.ts        THE GAME: whole core loop as pure functions (state in → state out)
    data/samples.ts       Raw data model (HealthSample, DeviceEvent, DailyMetrics)
    data/aggregate.ts     Raw data → DailySummary (dedupe, sleep nights, sessions, driving)
    data/appleHealth.ts   Streaming Apple Health export.xml parser (+ .worker.ts)
    data/client.ts        Browser: import worker, sync fetch, token
    server/               ingest validation/auth + storage (Supabase or dev memory)
    types.ts              Shared types — DailySummary is THE data contract
    economy.ts            All game numbers (tasks, rewards, prices, species, caps)
    tasks.ts / garden.ts  Task evaluator / growth rules (pure)
  adapters/mock.ts        Seeded demo data (REQUIRED, never remove)
scripts/check-*.ts        `npm run check` — game loop + data pipeline tests
supabase/migrations/      SQL schema + seed (numbered, append-only)
docs/DATA_SOURCES.md      How real data gets in (read before touching data code)
docs/PLAN.md / TASKS.md   Product plan / task board
```

## Ownership (avoid merge conflicts)

| Role | Owns |
|---|---|
| Frontend / UI | `src/app/**/page.tsx`, `src/components/**` (incl. `garden3d/`), `globals.css` |
| Backend / data | `src/app/api/**`, `src/lib/tasks.ts`, `src/lib/garden.ts`, `src/lib/today.ts`, `supabase/**` |
| Integration | `src/lib/data/**`, `src/lib/server/**`, `src/app/api/ingest`, `src/app/api/summaries`, `src/app/data/**`, `extension/**` |
| Pitch / design | `docs/**`, `public/**` (sprites, assets), README |

Touching another role's files is fine for a one-line fix — mention it in the PR.

## How the app works today (read before changing anything)

- All game rules live in `src/lib/game/engine.ts`. Every action is
  `(state, …args) => { ok, state, message } | { ok: false, state, error }`. Screens call
  `run((s) => action(s, …))` from `useGame()`; the provider saves state and shows a toast.
- New rule or feature → add a pure function to the engine + a check in `scripts/check-loop.ts`,
  then call it from a screen. Run `npm run check`.
- Persistence is localStorage (`GameProvider.tsx` load/save). Moving to Supabase means
  replacing load()/save() (and optionally running engine actions in API routes) — not
  rewriting screens.
- The 🧪 Demo panel is the stage control for judging. Keep it working.
- Real data: every source becomes `DailySummary` via `src/lib/data/aggregate.ts`, then
  `importSummaries()` in the engine. Read `docs/DATA_SOURCES.md` first. Never send health data
  or the sync token in URLs; keep Apple Health parsing in the browser.
- 3D garden: plants are procedural (no downloaded models). New species = add to
  `SHOP_ITEMS` + `ShopItemId`, a component in `garden3d/Plants.tsx`, and a `Species` case.
  Share geometries/materials through `garden3d/shared.ts` (`GEO`, `mat()`) — don't create
  materials inside render.

## Conventions

- **TypeScript strict.** No `any` unless unavoidable (then comment why).
- **API responses** always `{ ok: true, data }` or `{ ok: false, error }` via `ok()`/`fail()`.
- **Game logic stays pure** (`lib/tasks.ts`, `lib/garden.ts`): no DB or fetch inside;
  routes load data, call the pure function, then save. This keeps it testable and demo-safe.
- **Coins:** the balance is always the sum of `wallet_transactions` (ledger). Never store a balance.
- **Payouts are idempotent:** one completion per (user, task, date) — enforced by a DB unique key.
- **Numbers live in `economy.ts`**, never hard-coded in components or routes.
- **Styling:** Tailwind classes using theme tokens (`bg-leaf`, `text-muted`, `bg-card`,
  `bg-soil`, `text-sun`), not raw hex. Phone width first (the app is a 480px column).
- **Copy:** encouraging, no shame ("Your garden is resting" not "You failed").
- **Assets:** only ones we have rights to (emoji, Kenney, hand-drawn SVG). Credit them in README.
- **Privacy:** store daily totals only — never raw browsing history or URLs.

## Git workflow

1. `git pull origin main` before starting anything.
2. Branch: `git checkout -b <role>/<short-feature>` e.g. `backend/wallet-api`, `ui/garden-grid`.
3. Commit often: `feat: …`, `fix: …`, `chore: …`, `docs: …`.
4. Before pushing: `git pull --rebase origin main`, then `npm run lint && npm run check && npm run build`.
5. Push and open a PR into `main`. Keep PRs small (one feature). Merge quickly once the build is green.
6. In `docs/TASKS.md`, move your task to "Done" in the same PR.

If a rebase hits conflicts in a file you don't own, stop and ask your human — don't
guess at someone else's code.

## Definition of done (per feature)

- Works on a phone-sized screen, with the mock adapter, with no console errors.
- Handles empty states (new user, no data, no plants) and errors gracefully.
- Lint + build pass. Task moved to Done in `docs/TASKS.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
