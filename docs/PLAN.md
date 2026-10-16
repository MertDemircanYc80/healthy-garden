# Healthy Garden — Product Plan (condensed)

Full original plan (written under the earlier working title "Rooted"): [`Healthy_Garden_Plan_original.pdf`](./Healthy_Garden_Plan_original.pdf). This file is
the working summary AI assistants and teammates should follow. Section numbers (§) match the PDF.

> "Forest rewards you for putting your phone down. Healthy Garden rewards you for living well."

## Problem (§2)
Doomscrolling eats time, raises stress, cuts into sleep and movement. Health data is
fragmented across wearables and mostly *displayed*, not acted on. Focus apps reward one
behavior with a streak people stop caring about. Nothing ties digital habits to nature.

## Target user (§4)
18–35, owns a wearable or just a smartphone, feels they scroll too much, wants a gentle
(not guilt-based) nudge toward sleep, movement, and time outside.

## Core loop (§5)
1. **Sync** health (steps, sleep) + scroll data
2. **Evaluate** today's tasks against that data
3. **Reward** coins + sunlight
4. **Spend** coins on seeds, plants, watering can, fertilizer
5. **Grow** — care + real behavior grow the garden; neglect → dormant (never dead)
6. **Give back** — milestones point to a real tree / garden

## MVP — must be done by the end (§6)
- Sign-in or one-tap demo user
- Daily task list with live progress bars (steps, sleep, doomscroll reduction)
- Data adapter layer: mock source + one real source (file import)
- Coin wallet + transaction history
- Shop: seeds, flowers, trees, watering can, fertilizer
- Garden grid; plants grow through stages
- Garden health meter (7-day rolling)
- "Real impact" screen: mocked tree planting + certificate card

**Stretch (only after hour-16 checkpoint):** Chrome extension, seasonal/rare plants,
friends' garden, community garden map, notifications, insights chart, Open-Meteo banner.

**Out of scope:** real payments, medical advice, native iOS/Android, every wearable.

## Economy (§7) — values live in `src/lib/economy.ts`
| Task | Condition | Coins |
|---|---|---|
| First steps | 1,000 steps | 10 |
| Active day | 5,000 steps | +20 |
| Strong day | 8,000+ steps | +30 |
| Good sleep | 7+ h | +25 |
| Sleep consistency | bedtime within 30 min of target | +15 |
| Doomscroll down | ≥20% below own 7-day avg (day 1: fixed cap) | +25 |
| Offline hour | 1 h no distracting apps (max 3/day) | +15 each |

Shop: Daisy/Marigold 20–30 (3 days) · Sunflower 50 (5) · Fruit sapling 100 (7) ·
Oak 150 (10) · Watering can 50 (one-time) · Fertilizer 20 (2× growth for 24 h).

Growth: stages seed → sprout → young → mature → blooming. A plant grows each day it is
watered AND the garden has sunlight. Sunlight = completed tasks / 3 (capped at 100%).
Skipped days → dormant (grey), recovers on return. Daily coin cap prevents rewarding extremes.

## Data (§8)
Everything becomes one `DailySummary` (see `src/lib/types.ts`). Adapters in priority order:
1. **Mock** (required, seeded 14 days + demo boost) ✅ exists
2. **File import** — Apple Health export or Oura/Garmin CSV (best "it's real" proof)
3. **Aggregator API** (Terra / Open Wearables) — only if sign-up is instant
4. Native HealthKit / Health Connect — post-hackathon

Doomscroll = total minutes on selected feed sites/apps per day + sessions > 10 min.
Sources: Chrome extension (stretch) or manual input / seeded data (fallback).

## Architecture (§9–12)
Next.js (UI + API routes) → pure logic modules (task evaluator, reward ledger, garden
engine) → Supabase → Vercel. Endpoints listed in `src/app/api/`; stubs return 501.

## Screens (§13)
Onboarding (name, step goal, bedtime, data source) · Home/Garden · Tasks · Shop ·
Inventory/planting · Real Impact · (stretch) Insights.
Design: calm warm colors, big visuals, no guilt language, small celebratory animations.

## Demo script — 3 min (§17)
Hook (20s) → problem (20s) → data synced (30s) → demo-boost to complete a task live,
coins + sunlight rise (40s) → buy seed, plant, water, "skip a day" → it grows (40s) →
real tree certificate (20s) → close line (10s).
Needs: seeded demo account, **demo boost** + **skip a day** controls, backup video.

## Risks & fallbacks (§18)
| Risk | Fallback |
|---|---|
| Wearable API slow | File import + mock, say so honestly |
| Extension too slow | Manual scroll input + seeded data |
| Garden art too slow | Emoji / simple SVG scaled by stage |
| Tree partner API unavailable | Mock flow, label as prototype |
| Live demo fails | Backup video + seeded account |
| Scope creep | MVP list above is the contract |

## Ethics (§19)
Minimum data, daily summaries only, user can delete data. "Not medical advice." No
shame mechanics. Cap daily coins. Be transparent about tree partner. Only licensed assets.
