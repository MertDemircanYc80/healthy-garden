# AGENTS.md — instructions for AI coding assistants

You are helping a 3–4 person team build **Rooted** at a 1.5-day hackathon. Several
people (each with their own AI assistant) push to this repo at the same time. Your
job is to ship working features fast **without breaking teammates' work**.

Read this whole file before your first change. Then read `docs/PLAN.md` (the product
plan) and `docs/TASKS.md` (who is doing what).

## What Rooted is

A phone-first web app: health data (steps, sleep) + doomscrolling time → daily tasks
→ coins → buy seeds/tools → a virtual garden grows. Plants never die (they go dormant).
Milestones link to a real tree planting (mocked payment). Tone: calm, encouraging,
never guilt-based.

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
5. **Before every push:** `npm run lint && npm run build` must pass. Never push a red build to `main`.
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
  For request-time data, call `await connection()` (from `next/server`) and render the
  async component inside `<Suspense>`. See `src/app/tasks/page.tsx` for the pattern.
- `params` / `searchParams` are Promises — `await` them.

## Project map

```
src/
  app/
    page.tsx            Home / Garden screen
    tasks/page.tsx      Tasks screen  ← reference pattern for data screens
    shop/page.tsx       Shop screen
    impact/page.tsx     Real Impact screen
    api/**/route.ts     API endpoints (plan §12). Stubs return 501 until built.
  components/           Shared UI (BottomNav, Placeholder)
  lib/
    types.ts            Shared types — DailySummary is THE data contract
    economy.ts          All game numbers (tasks, rewards, prices, caps)
    tasks.ts            Task evaluator (pure functions)
    garden.ts           Garden engine (pure functions)
    today.ts            Builds today's summary + tasks for a user
    api.ts              ok()/fail()/notImplemented() + DEMO_USER_ID
  adapters/
    types.ts            DataAdapter interface
    mock.ts             Seeded 14-day demo data (REQUIRED, never remove)
    index.ts            Adapter registry
supabase/migrations/    SQL schema + seed (numbered, append-only)
extension/              Chrome doomscroll tracker (stretch)
docs/PLAN.md            Product plan (source of truth for scope)
docs/TASKS.md           Task board / ownership
```

## Ownership (avoid merge conflicts)

| Role | Owns |
|---|---|
| Frontend / UI | `src/app/**/page.tsx`, `src/components/**`, `globals.css` |
| Backend / data | `src/app/api/**`, `src/lib/tasks.ts`, `src/lib/garden.ts`, `src/lib/today.ts`, `supabase/**` |
| Integration | `src/adapters/**`, `extension/**`, `src/app/api/sync`, `src/app/api/demo` |
| Pitch / design | `docs/**`, `public/**` (sprites, assets), README |

Touching another role's files is fine for a one-line fix — mention it in the PR.

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
4. Before pushing: `git pull --rebase origin main`, then `npm run lint && npm run build`.
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
