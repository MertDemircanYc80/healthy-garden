# Healthy Garden · jury preview

[Türkçe çekim rehberi ve AI durumu](DEMO_TR.md) · [Türkçe veri açıklaması](../datasets/README_TR.md)

Branch: **`demo/jury-month`**. The original version stays on `main`. Do not merge this preview just to try it.

## Try without changing an existing checkout

A separate Git worktree is the safest path for teammates who have local work:

```bash
cd /path/to/healthy-garden
# Inspect current work; leave it here.
git status
git fetch origin
git worktree add --detach ../healthy-garden-jury origin/demo/jury-month
cd ../healthy-garden-jury/mobile
npm ci
npx expo start --go --clear
```

This creates a second folder and leaves the current branch, commits and uncommitted files in the original folder alone. The preview runs on Expo SDK 57. Open a compatible Expo Go on the phone; the Mac and phone must be on the same network. If needed, stop the server and use `npx expo start --go --tunnel --clear`.

For a fresh clone:

```bash
git clone --branch demo/jury-month --single-branch https://github.com/MertDemircanYc80/healthy-garden.git healthy-garden-jury
cd healthy-garden-jury/mobile
npm ci
npx expo start --go --clear
```

On a physical iPhone, sign in to the same Expo account in Expo Go and the CLI (`npx expo whoami`, `npx expo login` if needed). Keep the server running. `exp://…` is the Expo Go connection; `exp+healthy-garden://…` expects a separate native development build.

## What changed

- Empty first launch: no sample health records, goals, coach cards, notifications, plants or starter gold.
- Bigger 7 × 5 garden. Tap a plot to plant. Choose **Water**, then tap a plant directly in the illustration. One water refill is consumed per plant; repeated taps never charge twice for the same day.
- Full-screen Report: movement, sleep, daylight, activity, sedentary classification, feed time, total screen time and food energy. Each card opens its own history with 7/30-day views and prior-week averages. No data is shown as a dash, not a fabricated zero.
- Isolated save key `healthgarden:jury:v1`. The old `healthgarden:game:v1` save is not read or overwritten. Reset affects only this branch’s demo garden, inventory and replay.
- Original seeded demo modules remain available as a regression fallback, but are not loaded into the new app state.

## Presenter controls

Tap **30-day demo** under the garden title.

1. **Load first 7 days**. Report fills with one week and 70 daily gold. Goals, coach and garden stay empty.
2. **Analyze the first week**. Four personal targets and concise coach insights appear. The source says whether this is prepared AI or a live request.
3. **Open day 8**. Report shows an illustrative 14:00 snapshot. Sleep is complete; cumulative metrics are partial. Goals update, but no reward is paid yet.
4. **Finish day 8**. Final totals arrive. Each met goal pays twice its plan reward, once per date, plus 10 daily gold. A feed limit can be on track at 14:00 and fail by day’s end.
5. Close controls. Tap a + plot and buy/plant a daisy (20 gold). In Market buy a water refill (5 gold). Return to the garden, choose **Water**, and tap the plant. The soil darkens and water droplets appear.
6. Open controls and **Open day 9**. A watered plant grows overnight according to the day’s completed goals. Unwatered plants rest; they never die.
7. Continue **Finish day / Open next day**. Days 14, 21, 28 and 30 refresh the prepared analysis automatically. Weekly goals apply from the following day. With a live gateway, failed requests leave earned gold and the previous plan safe; retry or select the prepared checkpoint.
8. Finish **day 30**. The final day pays too; the replay cannot advance beyond it. Inspect 30-day charts, total gold earned, missed goals and the grown garden.

Daily gold and completed goals are paid explicitly as observed days finish. Care is manual; water and flowers must be purchased. Buy enough water refills and care for plants as you advance. The first week earns 70 daily gold. In the prepared fixture, day 8 adds 50 goal gold and 10 daily gold.

## Published demo video

The finished [1:15 demo with sound](../media/healthy-garden-demo.mp4) and [media kit](../media/README.md) use actual app interactions, a concise care montage and original subtle sound design. This replaces the earlier 2:45 edit.

### Optional 2:45 narrated recording

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | Empty garden → Report | Health records often stay in separate apps. Healthy Garden turns a daily picture into small actions. |
| 0:20–0:45 | Load 7 days → Sleep / Feed details | This is a transparent hybrid replay: public wearable records plus a fictional phone, daylight and food scenario. |
| 0:45–1:05 | Analyze → Coach → Goals | The first week becomes personal, achievable goals. In this recording we show prepared AI output; the live model gateway is optional. |
| 1:05–1:30 | Day 8 partial → complete | Progress follows the data. A limit is only confirmed at day’s end; success earns gold once. Some targets are missed. |
| 1:30–1:55 | Buy daisy + refill → tap to water → day 9 | Earned gold becomes care. Water directly in the garden and see growth the next day. |
| 1:55–2:25 | Cut to later weeks; show new analyses and charts | The next weeks change the picture. Goals adapt, sleep remains uneven, and consistent care grows the garden. |
| 2:25–2:45 | Day 30 report + garden | One month, visible progress. The prototype demonstrates the loop; it is not proof of a health intervention. |

Record the full daily sequence, then cut/time-lapse routine day changes. Do not claim fictional screen readings were measured or cached output was a live AI call.

## Optional live AI and terminal weeks

The free-tier Gemini gateway and terminal controller are ready. Follow **[AI_TERMINAL_TR.md](AI_TERMINAL_TR.md)** for the full setup and recording guide. In `mobile/`, run `npm run demo:setup` and enter your own Gemini key at the hidden prompt. Keep `npm run coach` and `npm start -- --clear` open in two terminals. A third terminal drives `npm run demo -- week 1`, then `week 2`, `week 3`, `week 4`, `week 5` (last two days). `next`/`finish` allow normal-speed daily footage. Terminal reset requires `reset --yes`.

Default provider/model: Gemini / `gemini-3.8-flash`, using Google's Interactions REST API with a JSON response schema. [Pricing](https://ai.google.dev/gemini-api/docs/pricing), [structured output](https://ai.google.dev/gemini-api/docs/structured-output). Free access is quota/account dependent; no paid-provider fallback is automatic. Optional existing Anthropic support remains: set `COACH_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, and an appropriate `ANALYZE_MODEL` in the local server env.

The key stays in gitignored `.env.coach.local`; only the LAN URL and local demo access code go in Expo's public env. Commands, receipts and generated plan cache stay in gitignored `.demo-control.local.json`. Run on one presenter device at a time: commands are broadcast to installations using the same local access code; the latest receipt is what the terminal displays. This is a local demo helper, not deployed Supabase ingestion or a multi-user production service.

A week import settles remaining days using the preceding plan before installing the new plan, atomically preserving purchases, plant care and reward receipts. Applied command IDs prevent duplicate payouts after polling/reload. The server uses only bundled days through the cutoff, validates the response and provides preceding goals/results for weekly adaptation. Cloud failure leaves the replay unchanged. Rehearsal fallback is explicit: `week N --prepared`. Cached live results are labeled **saved result**; newly received answers say **live response**. A genuine provider request still needs a valid user key; automated integration checks use mock providers.

## Real integrations and limits

- HealthKit reader already supports steps, sleep, activity, daylight and dietary energy. A native Healthy Garden build is required. Expo Go remains a reliable demo path.
- MyFitnessPal can write dietary energy and nutrients to Apple Health with permission. Healthy Garden reads from HealthKit; a direct MyFitnessPal API is not implemented. [MyFitnessPal support](https://support.myfitnesspal.com/hc/en-us/articles/360032271092-Apple-Health-connection-and-syncing).
- Automatic iOS per-app Screen Time access is not implemented; manual feed minutes remain available under Report → Data sources. [Apple Family Controls](https://developer.apple.com/documentation/familycontrols) is a separate integration requiring native setup and entitlements.
- Dietary energy is kept distinct from calories burned. Sedentary classification is not literal sitting time. Missing readings are not replaced with zero.
- All sample records, prepared packets, raw-source hashes and attribution are committed. See `datasets/README.md`.

## Validation

```bash
cd mobile
npm ci
npm run typecheck
npm run check
npx expo-doctor
npm run export:web
```

A browser check of the exported app covers the empty screens, baseline import, analysis, day-8 progress and reward, report drill-down, purchase/plant/direct watering, and persistence after reload. The domain test replays all 30 days, checks the final payout and changing plans, and grows a watered plant to bloom. A real iPhone/HealthKit session and a live AI provider call require a device build/key and are not implied by these tests.
