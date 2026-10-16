# Data sources — how Healthy Garden gets real data

A web app **cannot read Apple Health or Screen Time directly**. For the hackathon we use
paths that work today without App Store approval; native apps come later. Everything ends
up as the same `DailySummary` (`src/lib/types.ts`), so screens and game rules never change.

```
Apple Health export.zip ──(browser Web Worker)──┐
iOS Shortcuts ──POST /api/ingest──► Supabase ───┼──► buildSummaries() ──► DailySummary ──► game
Chrome extension (todo) ──POST /api/ingest──────┘          src/lib/data/aggregate.ts
Demo data (mock adapter) ───────────────────────────────────────────────────────────┘
```

## What we collect and from where

| Metric | Hackathon path | `DailySummary` field | Later (native) |
|---|---|---|---|
| Steps | Health export, Shortcut | `steps` | HealthKit / Health Connect |
| Walking + running distance | Health export, Shortcut | `walkingRunningKm` | same |
| Running | Health export (running workouts), Shortcut | `runningMinutes` | same |
| All workouts | Health export | `workoutMinutes` | same |
| Active energy | Health export, Shortcut | `activeEnergyKcal` | same |
| Sleep, bedtime, wake | Health export, Shortcut | `sleepMinutes`, `bedtime`, `wakeTime` | same |
| Time outdoors | Health export ("Time in Daylight", Apple Watch) | `outdoorMinutes` | same |
| Food | Health export / Shortcut, **only if** the user logs meals in an app that writes to Health | `nutrition` | same |
| Feed-app time | Shortcut automations: app **Is Opened / Is Closed** | `scrollMinutes`, `longSessions`, `appUsage` | iOS: Screen Time API gives threshold events only (see below); Android: UsageStatsManager |
| Driving | Shortcut automations: **Driving Focus** or **CarPlay/Bluetooth** on/off | `drivingMinutes` | Core Motion (automotive activity) |
| Browser feed time | Chrome extension (todo) | `scrollMinutes` | — |

Known limits (say these honestly to judges):
- Shortcuts can only read Health while the phone is **unlocked**; schedule the daily one for a time the user is active.
- iOS Screen Time data is sandboxed: even a native app can't send per-app minutes to a server, only react to
  thresholds ("passed 60 min"). Our app-open/close automations are the practical workaround.
- iPhone and Apple Watch both record steps; the aggregator keeps the higher source per day instead of adding them.
- Aggregator services: Terra starts around $399/month (not viable now); Open Wearables is open source and
  self-hosted but needs a mobile SDK for Apple Health — good for Garmin/Oura/Whoop after the hackathon.

## 1. Apple Health export (works now, no backend)

Data tab → "Choose export.zip". Parsed in a Web Worker (`src/lib/data/appleHealth.worker.ts`),
only the last 60 days are kept, nothing is uploaded. Parser: `src/lib/data/appleHealth.ts`.

## 2. `/api/ingest` (iOS Shortcuts, extension, future native app)

Auth: header `Authorization: Bearer hg_…` — the token is created in the Data tab. Only its SHA-256
hash is stored. Never put it in a URL.

Storage: Supabase when `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
(run `supabase/migrations/0002_ingest.sql`), otherwise an in-memory store in `npm run dev` only.
Production without Supabase answers 503.

**Daily totals** (one request per day; repeated sends merge):
```json
{ "date": "2026-10-16", "steps": 5234, "walkingRunningKm": 4.1, "activeEnergyKcal": 420,
  "sleepHours": 7.2, "bedtime": "23:40", "wakeTime": "07:05", "runningMinutes": 25,
  "dietaryEnergyKcal": 1820, "proteinG": 95, "carbsG": 210, "fatG": 60, "waterMl": 1500 }
```
Also accepted: `walkingRunningMi`, `sleepMinutes`, `exerciseMinutes`, `workoutMinutes`, `outdoorMinutes`.
Numbers may be strings like `"5,234"`.

**Events** (one per automation run, or a batch):
```json
{ "event": "app_open",  "app": "Instagram", "at": "2026-10-16T21:05:00-07:00" }
{ "event": "app_close", "app": "Instagram", "at": "2026-10-16T21:27:00-07:00" }
{ "events": [ { "event": "driving_start", "at": "…" }, { "event": "driving_end", "at": "…" } ] }
```
`at` must include the phone's offset (Shortcuts: Format Date → ISO 8601).

**Read back:** `GET /api/summaries?from=YYYY-MM-DD&to=YYYY-MM-DD` (same header) → `DailySummary[]`.
**Delete everything:** `DELETE /api/ingest` (same header).

Quick test:
```bash
curl -X POST localhost:3000/api/ingest -H "Authorization: Bearer hg_testtoken1234567890abcdef" \
  -d '{"date":"2026-10-16","steps":5234,"sleepHours":7.2}'
curl "localhost:3000/api/summaries?from=2026-10-10&to=2026-10-16" -H "Authorization: Bearer hg_testtoken1234567890abcdef"
```

## 3. iOS Shortcuts setup

Step-by-step instructions are in the app (Data tab → iPhone Shortcuts). Build them once on a team
phone, then share via iCloud links for the demo. Three shortcuts:
1. **Daily health totals** — Find Health Samples (Steps, Walking+Running Distance, Active Energy, Dietary Energy, Sleep) → Calculate Statistics (Sum) → Dictionary → Get Contents of URL (POST JSON). Automation: daily at a set time, Run Immediately.
2. **Feed apps** — Automation → App → Is Opened / Is Closed → POST `app_open` / `app_close`.
3. **Driving** — Automation → Driving Focus (or CarPlay) on/off → POST `driving_start` / `driving_end`.

The phone must reach the server: use the Vercel URL (or the laptop's Wi-Fi IP with `npm run dev -- -H 0.0.0.0`).

## Adding a source

Produce `HealthSample[]`, `DailyMetrics` per day, or `DeviceEvent[]` (`src/lib/data/samples.ts`), run
`buildSummaries()`, and hand the result to `importSummaries()` in the game engine. Add a case to
`scripts/check-data.ts`.
