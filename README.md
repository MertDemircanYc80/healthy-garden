# 🌱 Healthy Garden

> Forest rewards you for putting your phone down. Healthy Garden rewards you for living well.
>
> **Grow Yourself. Grow Your Garden. Grow a Better World.** 🌱

Healthy Garden turns healthy habits — walking, sleeping well, scrolling less — into a living
virtual garden, with milestones that link to real-world tree planting.
Hackathon project · plan in [`docs/PLAN.md`](docs/PLAN.md) · task board in [`docs/TASKS.md`](docs/TASKS.md).

## Quick start (the app)

```bash
git clone https://github.com/MertDemircanYc80/healthy-garden
cd healthy-garden/mobile
npm install
npx expo start      # scan the QR code with your iPhone (Expo Go app)
```

The phone app lives in [`mobile/`](mobile/README.md). Database setup: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

## Web prototype (earlier, frozen)

The root Next.js app is the first browser prototype — run it with `npm install && npm run dev`
at the repo root. It contains reusable pieces (game engine, Apple Health export parser).

### What the web prototype does

The whole core loop, on a phone-sized screen, with no backend:

- **Onboarding** (name, step goal, bedtime, data source) — or "load the demo garden"
- **Tasks** — today's steps / sleep / scroll in one place, live progress, collect coins (idempotent, 200/day cap)
- **Shop** — seeds, saplings, watering can, fertilizer
- **Garden** — a 3D Hay Day-style island (drag to rotate, pinch to zoom): tap the soil to plant, tap a plant to water/fertilize; 9 species (daisy, marigold, lavender, tulip, sunflower, rose, fruit tree, cherry blossom, oak) grow through 5 stages and rest (never die) when skipped
- **Data** — import an Apple Health export (steps, walking/running, workouts, sleep, energy, daylight, food); iPhone Shortcuts sync for daily totals, feed-app time and driving (see `docs/DATA_SOURCES.md`)
- **Real impact** — every 500 coins unlocks a (mocked) real tree + certificate
- **🧪 Demo panel** — +1,000 steps, +1 h sleep, −30 min scroll, offline hour, skip to tomorrow, load demo garden, reset

Game state is saved in the browser (localStorage). Shortcuts sync needs Supabase in production (`npm run dev` uses an in-memory store). `npm run check` runs the game-loop and data-pipeline tests.

**Demo tip:** "Load demo garden" starts at 460 coins — complete one task live and the first real tree unlocks.

## Stack

App: Expo SDK 57 (matches the App Store Expo Go) · React Native · Expo Router · react-native-svg · Supabase (anonymous auth, Postgres, Edge Functions) · Claude API for analysis.
Web prototype: Next.js 16 · Tailwind v4.

## Working with AI assistants

All assistants (Claude Code, Cursor, Copilot, Codex, Gemini…) should follow
[`AGENTS.md`](AGENTS.md). `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md`
point to it.

## Team workflow (short)

1. `git pull` → claim a task in `docs/TASKS.md`
2. Branch `<role>/<feature>` → small commits
3. `npm run lint && npm run build` → PR into `main`

## Credits

All 3D models are procedural (generated in code). Libraries: Next.js, React, three.js,
@react-three/fiber, @react-three/drei, fflate, Supabase JS. _Add any other API, asset or dataset here before submission._

**Not medical advice.** Healthy Garden is a hackathon prototype; tree-planting is mocked.
