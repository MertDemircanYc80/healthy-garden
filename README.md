# 🌱 Healthy Garden

> Forest rewards you for putting your phone down. Healthy Garden rewards you for living well.
>
> **Grow Yourself. Grow Your Garden. Grow a Better World.** 🌱

Healthy Garden turns healthy habits — walking, sleeping well, scrolling less — into a living
virtual garden, with milestones that link to real-world tree planting.
Hackathon project · plan in [`docs/PLAN.md`](docs/PLAN.md) · task board in [`docs/TASKS.md`](docs/TASKS.md).

## Quick start

```bash
git clone <this-repo-url>
cd healthy-garden
npm install
cp .env.example .env.local   # fill in Supabase keys when available (app runs on mock data without them)
npm run dev                  # http://localhost:3000
```

Open it in your browser's phone view (DevTools → device toolbar) — the app is phone-first.

## What works right now

- `/tasks` — today's tasks with progress bars, from seeded mock data
- `/shop` — item list (buying not wired yet)
- `GET /api/tasks/today`, `GET /api/shop`
- Every other endpoint in `src/app/api/` is a stub returning **501** with its owner — claim it in `docs/TASKS.md`

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Vercel

## Working with AI assistants

All assistants (Claude Code, Cursor, Copilot, Codex, Gemini…) should follow
[`AGENTS.md`](AGENTS.md). `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md`
point to it.

## Team workflow (short)

1. `git pull` → claim a task in `docs/TASKS.md`
2. Branch `<role>/<feature>` → small commits
3. `npm run lint && npm run build` → PR into `main`

## Credits

_Add every third-party API, asset pack and dataset used here before submission._

**Not medical advice.** Healthy Garden is a hackathon prototype; tree-planting is mocked.
