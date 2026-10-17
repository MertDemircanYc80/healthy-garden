# Submission kit

## Checklist

- [ ] Demo video (2–3 min, phone screen recording + voice-over) — script below
- [ ] GitHub link: https://github.com/MertDemircanYc80/healthy-garden (public)
- [ ] Short description (below) and long description (README "How it works")
- [ ] Screenshots: `docs/screens/` (garden, goals, coach, report, alerts, demo week)
- [ ] Optional: regenerate the demo coach with real Claude output before recording (see "Real AI output")
- [ ] Everyone ran the app from a fresh clone with the README's 3 steps

## Short description (≈50 words)

Healthy Garden turns your phone and watch data into a garden that grows with you. An AI coach
reads your sleep, steps, runs, time outside, meals and scrolling, then sets small personal goals
backed by your own numbers. Hit them, earn sunlight and coins, and watch your garden bloom.

## Demo video script (≈2:30)

Record the iPhone screen (Control Center → Screen Recording) with Expo Go open on the app.
Tip: set the phone to Do Not Disturb, full battery icon, morning light theme (record before 5 pm).

| Time | On screen | Say |
|---|---|---|
| 0:00 | Home, garden | "We scroll for hours, sleep less, move less — and health apps only show us charts. Healthy Garden turns your own data into a garden that grows when you do." |
| 0:15 | Tap **Sample data** pill, close | "This is a demo persona: thirty days of real-shaped phone and watch data. On an iPhone it comes straight from Apple Health — steps, sleep, runs, daylight, meals." |
| 0:30 | **Coach** tab | "Our AI coach first computes facts from the data, then writes suggestions that can only cite those facts. Here it found that after late nights this person slept almost an hour and a half less, and that heavy-scrolling days end later." |
| 0:55 | **Goals** tab | "So the goals are personal and small: a bit more walking, seven hours of sleep, less time in feed apps, lights out 15 minutes earlier. Each one explains why, with the user's own numbers." |
| 1:15 | **Report** tab, scroll | "The weekly report shows the trend and today's data. Screen time can't be read by iPhone apps, so users add it in one tap." |
| 1:30 | **Garden** → Water plants → Sample data → **Next day** (×2–3) | "Hitting goals brings sunlight and coins. Watered plants grow overnight; skipped ones rest — they never die. Watch a few days go by…" |
| 2:00 | **Alerts** tab | "Every morning you get a short, kind summary — never guilt." |
| 2:10 | Home, garden in bloom | "Healthy Garden: grow yourself, grow your garden. Built with Expo, Supabase and Claude — code on GitHub." |

## Real AI output for the demo

`mobile/src/data/demo-coach.json` holds what the coach wrote for the demo persona. It is
currently produced by the rule-based coach (no API key). To use real Claude output, someone with
an Anthropic API key runs (the key stays in their terminal, never in the repo):

```bash
cd supabase/functions
ANTHROPIC_API_KEY=sk-ant-... npx deno run --allow-read --allow-write --allow-env --allow-net _shared/analysis/demo_generate.ts
cd ../../mobile && npm run check     # make sure the demo week still passes
```

Commit the updated `demo-coach.json`. The Demo week sheet then says "written by: Claude (…)".

## Regenerating the demo persona

`cd mobile && npm run demo:data` rewrites `src/data/demo-health.json` and
`supabase/seed/demo_health_days.csv` from `scripts/make-demo-data.ts` (seeded, so the output is
the same every time). Then rerun the coach generator above.
