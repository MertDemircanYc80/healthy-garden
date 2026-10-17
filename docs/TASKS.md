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

## Mobile app board (current — work here)

| # | Task | Role | Owner | Status |
|---|---|---|---|---|
| M1 | Expo app: fixed garden + island with Garden/Goals/Coach/Report/Alerts (demo data) | frontend | Mert + Claude | ✅ Done |
| M2 | Supabase: apply `20261016120000_app_schema.sql`, anonymous sign-ins, types (docs/SUPABASE_SETUP.md) | backend | | Todo |
| M3 | App ↔ Supabase: anonymous sign-in on launch, load sections from tables, save plants | backend + frontend | | Todo |
| M4 | HealthKit sync (development build, `@kingstinct/react-native-healthkit`, background delivery) → `health_days` | integration | Mert + Claude | ✅ Code done — needs a development build on an iPhone to test |
| M5 | Edge Function `analyze` with Claude → goals, insights, report, alerts | backend | Mert + Claude | ✅ Code + tests done — deploy per docs/SUPABASE_SETUP.md Part C |
| M6 | Screen time: manual entry ✅ (Report → Feed apps today). Later: Family Controls thresholds | integration | | Partly done |
| M7 | Push notifications for alerts | frontend | | Todo |
| M8 | Shop + planting in the island (port from web prototype engine) | frontend | | Todo |
| M9 | Development build on a team iPhone (EAS or Xcode) so Apple Health works | integration | | Todo |
| M10 | Coins: pay goal rewards into `coin_events`, update garden coins/streak | backend | | Todo |
| M12 | Move the coin badge below the floating settings icon without moving settings | frontend | Codex (user requested) | ✅ Done |
| M13 | Market screen, purchases, persistent shared money/inventory, and test reset | frontend | Codex (user requested) | ✅ Done |
| D1 | Demo mode: sample persona (37 days), coach output, Next day simulation | all | Mert + Claude | ✅ Done |
| D2 | Real Claude output for the demo (`docs/SUBMISSION.md` → Real AI output) | backend | | Todo — needs an Anthropic API key |
| D3 | Record the demo video (script in `docs/SUBMISSION.md`) | design | | Todo |
| D4 | Submission text + screenshots (`docs/screens/`) | design | | Todo |
| D5 | Fresh-clone test on Mac and Windows with the README steps | all | | Todo |

## Web prototype board (frozen — kept for reference)

## Status (Oct 16)
The full core loop runs **in the browser** (no backend needed): onboarding → tasks → collect
coins → shop → plant → water/fertilize → skip a day → grow → real-tree certificate.
Garden is a 3D Hay Day-style scene. Real data: Apple Health export import works now;
iPhone Shortcuts sync works locally and needs Supabase for production (docs/DATA_SOURCES.md).
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
| 2 | Create Supabase project, run migrations `0001`–`0003`, share keys privately | backend | | Todo |
| 3 | Supabase client helper (`src/lib/supabase.ts`) | backend | | Todo |
| 4 | `/api/ingest` + `/api/summaries` (Shortcuts sync) | integration | Mert + Claude | ✅ Done (needs Supabase env + migration 0002) |
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
| 19 | Apple Health export.zip import (in-browser) | integration | Mert + Claude | ✅ Done |
| 20 | Manual scroll-time input (fallback) | integration | | Todo (offline-hour logging already works) |
| 21 | Real Impact screen + mocked redeem + certificate card | frontend + backend | Mert + Claude | ✅ Done |
| 22 | Chrome extension (stretch) | integration | | Todo |
| 23 | Open-Meteo "good day for a walk" banner (stretch) | frontend | | Todo |

| 30 | Build the 3 iOS Shortcuts on a team iPhone (Data tab has steps), share iCloud links | integration | | Todo |
| 31 | 3D Hay Day-style garden (procedural plants, 9 species) | frontend | Mert + Claude | ✅ Done |
| 32 | 3D polish: planting particles, harvest/bloom celebration, camera fly-in | frontend | | Todo |

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

| M14 | Restore money icon to original top-right header position, retaining Market navigation | frontend | Codex (user requested) | ✅ Done |

| M15 | Empty 100-gold start, planting, and limited water/fertilizer inventory | frontend | Codex (user requested) | ✅ Done |

| M16 | Highlight selectable empty plots, plant picker with buy-and-plant, and 1,000 starting gold | frontend | Codex (user requested) | ✅ Done |

| M17 | Persist and enforce one fertilizer use per plant per day | frontend | Codex (user requested) | ✅ Done |

| M18 | Jury demo: empty default, larger interactive garden, full-screen daily reports, sourced 30-day replay, adaptive coach and goal rewards | frontend + integration | Mert + Codex (user requested) | ✅ Done — preview on `demo/jury-month`; validation and teammate setup in `docs/JURY_DEMO.md` |

| M19 | Free-tier Gemini coach + authenticated terminal week imports for the jury replay | integration | Mert + Codex (user requested) | ✅ Done — `docs/AI_TERMINAL_TR.md`; typecheck/check/lint, iOS/web exports and terminal-to-mobile browser replay passed with mock providers; real Gemini call requires the user key |

| M20 | Cross-platform jury setup, daily gold + stronger goal rewards, recorded demo and promo assets | frontend + integration + design | Mert + Codex (user requested) | ✅ Done — Mac/Windows EN/TR guides, 10 daily gold + doubled goal rewards with safe migration, actual app recording and 4 promo PNGs in `media/`; mobile checks/lint + web/iOS exports and full browser replay passed |

| M21 | Tighten demo pacing and add original subtle UI/ambient sound design | design | Mert + Codex (user requested) | In progress — preserve real app footage and the existing visual theme |
