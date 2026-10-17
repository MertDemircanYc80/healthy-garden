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
npm run export:web && npx serve dist   # open at phone size; ?hour=21 shows night
```

## Structure

```
src/app/index.tsx            the one screen: garden + island
src/components/garden/       fixed SVG garden (scene + plants)
src/components/island/       the bottom island + tab bar
src/components/sections/     Garden, Goals, Coach, Report, Alerts
src/state/AppState.tsx       data for every section (demo now, Supabase later)
src/data/demo.ts             demo content in the same shape the AI will write
src/types.ts                 shared shapes (mirror the Supabase tables)
src/theme.ts                 colours, fonts, sizes
```
