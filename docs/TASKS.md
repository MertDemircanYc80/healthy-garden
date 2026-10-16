# Task board

**How to use:** put your name in "Owner" when you start a task (commit + push that
change right away so others see it). Move it to Done in the PR that finishes it.
Roles and folder ownership are in `AGENTS.md`.

## Team

| Role | Person |
|---|---|
| Frontend / UI lead | _TBD_ |
| Backend / data lead | _TBD_ |
| Integration lead | _TBD_ |
| Pitch / design lead | _TBD_ |

## Status (Oct 16)
The full core loop runs **in the browser** (no backend needed): onboarding → tasks → collect
coins → shop → plant → water/fertilize → skip a day → grow → real-tree certificate.
Logic: `src/lib/game/engine.ts` (pure, tested by `npm run check`). Storage: localStorage via
`src/components/GameProvider.tsx`. **Backend next step:** persist `GameState` in Supabase
(task 2–5 + replace load()/save() in GameProvider) — screens don't need to change.

## Checkpoint (hour 16)
Complete a task → earn coins → buy a seed → plant it → see it grow. If not working,
cut every stretch item.

## Phase 1 — Foundations (hours 2–8)

| # | Task | Role | Owner | Status |
|---|---|---|---|---|
| 1 | Repo scaffold, shared types, economy, mock adapter, API stubs | all | Mert | ✅ Done |
| 2 | Create Supabase project, run `0001_init.sql`, share keys privately | backend | | Todo |
| 3 | Supabase client helper (`src/lib/supabase.ts`) | backend | | Todo |
| 4 | `POST /api/sync` → upsert `daily_summaries` | backend | | Todo |
| 5 | `GET /api/wallet` (balance from ledger + history) | backend | | Todo |
| 6 | Vercel project linked to repo, share preview URL | integration | | Todo |
| 7 | Wireframes for 5 core screens (30 min max) | design | | Todo |
| 8 | Plant sprites/emoji for 5 stages × 4 plants | design | | Todo |

## Phase 2 — Core loop (hours 8–16)

| # | Task | Role | Owner | Status |
|---|---|---|---|---|
| 9 | `POST /api/tasks/evaluate` — idempotent payouts + daily coin cap | backend | | Todo |
| 10 | `POST /api/shop/buy` + inventory | backend | | Todo |
| 11 | `GET /api/garden`, `plant`, `water`, `fertilize` | backend | | Todo |
| 12 | Daily growth run (on page load) using `lib/garden.ts` | backend | | Todo |
| 13 | Garden grid UI: render plants by stage, dormant = grey | frontend | Mert + Claude | ✅ Done (local storage) |
| 14 | Planting flow: pick seed → tap cell; tap plant → water/fertilize | frontend | Mert + Claude | ✅ Done (local storage) |
| 15 | Shop buy button + coin balance in header | frontend | Mert + Claude | ✅ Done (local storage) |
| 16 | Garden health meter + sunlight on home | frontend | Mert + Claude | ✅ Done (local storage) |
| 17 | `POST /api/demo/boost` + "skip a day" control | integration | Mert + Claude | ✅ Done (local storage) |
| 18 | Onboarding (name, step goal, bedtime, data source) | frontend | Mert + Claude | ✅ Done (local storage) |

## Phase 3 — Real data & impact (hours 22–30)

| # | Task | Role | Owner | Status |
|---|---|---|---|---|
| 19 | File import adapter (Apple Health XML or CSV) | integration | | Todo |
| 20 | Manual scroll-time input (fallback) | integration | | Todo (offline-hour logging already works) |
| 21 | Real Impact screen + mocked redeem + certificate card | frontend + backend | Mert + Claude | ✅ Done |
| 22 | Chrome extension (stretch) | integration | | Todo |
| 23 | Open-Meteo "good day for a walk" banner (stretch) | frontend | | Todo |

## Phase 4 — Polish & demo (hours 30–36)

| # | Task | Role | Owner | Status |
|---|---|---|---|---|
| 24 | Growth / coin / planting animations | frontend | | Todo |
| 25 | Seeded demo account with a good-looking garden | backend | Mert + Claude | ✅ Done |
| 26 | Test on a real phone + poor connection | all | | Todo |
| 27 | Backup demo video | design | | Todo |
| 28 | Slides + pitch, rehearse 2× with timer | design | | Todo |
| 29 | README: credits for APIs, assets, datasets | design | | Todo |

## Done
(move finished rows here)
