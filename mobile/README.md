# Healthy Garden · jury preview

This branch (`demo/jury-month`) starts with an empty 7 × 5 garden, no sample records, no goals/coach/alerts, and 0 gold. It uses Expo SDK 57; do not upgrade the SDK to try this preview.

```bash
npm ci
npm start -- --clear
```

`npm start` explicitly selects **Expo Go**. Scan the new QR, keep the terminal running, and use the same network and Expo account on the phone and computer. If your network blocks local access, use `npx expo start --go --tunnel --clear`.

Tap **30-day demo** under the garden title to load the first week. Analyze it, then open day 8, complete days, earn gold, buy plants/refills and grow the garden. Choose **Water**, then tap a plant directly in the illustration. Water refills cost 5 gold; a daisy costs 20 gold. One refill waters one plant, once per day. Fertilizer remains limited to one use per plant per day.

Report opens full-screen. Tap any metric for 7/30-day history and the previous week. The 14:00 demo snapshot is explicitly partial; sleep has already ended. No goal payout occurs before day completion. Missing data stays empty.

This is a hybrid replay: 30 days of public PMData wearable readings plus clearly marked fictional screen, daylight and nutrition data. Prepared AI analysis works without a key; an optional local live-AI gateway is available. Read the [data provenance](../datasets/README.md) before recording or presenting it.

**Full instructions, safe teammate commands, live AI setup and a 2:45 video script:** [docs/JURY_DEMO.md](../docs/JURY_DEMO.md).

## Saved progress

This preview uses `healthgarden:jury:v1`. It does not overwrite the original `healthgarden:game:v1` garden. Purchases, supplies, plants, goals, analysis checkpoints and daily reward receipts are saved as one serialized snapshot. A failed save leaves the prior state intact. Returning to the empty state requires confirmation. Actual health/account data is not deleted by a demo reset.

The original seeded demo modules are retained as a regression fallback and are not used as startup app data on this branch.

## Real data

Expo Go cannot read HealthKit. A Healthy Garden native development build is needed for Apple Health. The existing reader supports steps, sleep, workouts, activity, daylight and dietary energy. Compatible food apps can write nutrition to Apple Health; no direct MyFitnessPal API is claimed. Per-app Screen Time integration is not implemented. Manual feed minutes remain under Report → Data sources & connections.

## Checks

```bash
npm run typecheck
npm run check
npx expo-doctor
npm run export:web
```

`npm run check` covers the health pipeline, original demo fallback, purchases and supply limits, full 30-day replay, daily payout idempotency, storage failures/reload, final-day rewards and an authenticated live-coach gateway with a mocked provider. No real provider call is made by tests.

For web previews, serve `dist/` with an SPA fallback for `/market`. The garden screenshot parameters `?hour=10&tab=report&open=1` still work.
