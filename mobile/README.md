# Healthy Garden — mobile

Expo (React Native) app. One screen: a fixed garden on top, a floating "island" at the bottom
with Garden, Goals, Coach, Report and Alerts.

## Run it on your phone (Expo Go)

```bash
cd mobile
npm install
npx expo start          # scan the QR code with the iPhone camera (Expo Go installed)
```

Phone and laptop on different networks? Use `npx expo start --tunnel`.

Expo Go is enough for the UI. **Apple Health (HealthKit) needs a development build** — Expo Go
can't load the HealthKit module (the app detects Expo Go and simply shows "needs the test build").

Development build, two options:
- **Mac + Xcode, cable:** `npx expo run:ios --device` (free Apple ID may be limited; a paid Apple
  Developer account always works).
- **EAS (cloud):** `npx eas-cli build --profile development --platform ios` — needs a paid Apple
  Developer account; install from the link EAS gives you. Then `npx expo start --dev-client`.

What syncs: steps, walking + running distance, active energy, exercise minutes, running and other
workouts, sleep (main night only, naps ignored), time in daylight, and meals/protein/water if a
food app writes them to Apple Health. Screen time can't be read on iOS — users type today's
feed-app minutes in Report → Feed apps today. Data is cached on the phone and uploaded to
Supabase `health_days` when `mobile/.env.local` has the Supabase URL + publishable key.

Tests for the pure health helpers: `npm run check`.

## Check it in a browser

```bash
npm run export:web && npx serve -s dist   # open at phone size; ?hour=21 shows night
```

## Structure

```
src/app/index.tsx            main garden + island
src/app/market.tsx           Market and inventory
src/components/garden/       fixed SVG garden (scene + plants)
src/components/island/       the bottom island + tab bar
src/components/sections/     Garden, Goals, Coach, Report, Alerts
src/state/AppState.tsx       data for every section (demo now, Supabase later)
src/data/demo.ts             demo content in the same shape the AI will write
src/types.ts                 shared shapes (mirror the Supabase tables)
src/theme.ts                 colours, fonts, sizes
```

## Market and saved progress

Tap the money badge in the top-right header to open the Market. Plants and supplies have Buy
buttons; unaffordable purchases are disabled. Purchases update the shared balance and
inventory immediately after a successful save. Tap any highlighted + plot in the garden
to choose a flower or tree for that exact spot. The picker uses one owned item, or
offers Buy & plant when none are owned. Buying and planting is one saved transaction;
an occupied plot or failed save never spends gold. All 24 plots are accessible buttons. Watering consumes one can per thirsty plant; bulk watering stops at
the number of cans available. Fertilizer adds half a growth stage and consumes one
unit, at most once per plant per garden day. The saved “Fertilized today” flag
blocks repeated uses after reload and clears on Next day, just like watering.
Older saves without the flag remain compatible. Fully grown plants cannot be fertilized. Counts update and persist atomically
with each action, including rapid taps and storage errors.

Progress uses AsyncStorage on iOS/Android and its localStorage backend on web, under
`healthgarden:game:v1`. Money, inventory, and garden demo progress are saved together
on this device; they do not sync through Supabase or across devices. Startup restores
the saved snapshot before showing the app. Only a missing save uses the initial 1,000
coins, an empty garden, and empty inventory. Existing saves are preserved. Unreadable saves show retry/reset options rather than being
silently replaced. Failed writes leave the previous balance and inventory intact.

For testing, open Market → **Reset saved garden** → **Confirm reset**. This restores
1,000 coins, empties the garden and inventory, and resets garden demo progress, while leaving health and
account data untouched. The demo controls have the same confirmed reset.

Run `npm run check` for purchase, persistence, concurrent mutation, failed storage, and
reset tests. Web hosting must serve `index.html` for client routes such as `/market`;
`serve -s dist` provides this fallback locally.
