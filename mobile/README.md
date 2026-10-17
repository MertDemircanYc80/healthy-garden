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

## Supabase connection

The app and readiness check share `src/lib/supabase-client.ts`. Copy `.env.example` to
`mobile/.env.local` and fill in `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use only a publishable/anon key; never a
secret/service-role key. Environment files are ignored; the empty example is committed.
The factory trims whitespace and rejects partial configuration. When both values are
absent, the personal garden and local health data remain available without cloud syncing.
The app adds the native URL polyfill and retains its existing AsyncStorage auth sessions.

From `mobile/`, using Node.js 22.18 or newer:

```bash
npm run check:connection
npm run typecheck
npm run check
```

`check:connection` verifies public-key access to the Auth API, anonymous sign-in settings,
and denial of signed-out access to `health_days`. It uses bounded network requests and
exits unsuccessfully for missing/invalid configuration or incomplete backend setup.
It does not create accounts or write data, and does not prove authenticated uploads or
cross-user isolation. `check:supabase` is a compatibility alias for the same check.
`npm run check` includes offline client-configuration tests.

For a new backend, follow [the Supabase setup guide](../docs/SUPABASE_SETUP.md), including
its health access and privacy migrations. Do not rerun the initial schema over existing
app tables or apply the archived web-prototype migrations. Personal goals and garden
progress stay local; health totals sync when enabled. Native-device validation remains
separate from these Node.js checks.

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

## Approved improvements (October 2026)

The personal garden follows local calendar dates and keeps the existing saved gold,
plants and inventory. The sample garden has separate local storage and is the only mode
with an **Advance sample day** button. Every app launch opens the personal garden;
sample mode is only selected for the current session. Open the date/settings badge to switch modes or replay
**How to play**. New gardens start with 1,000 gold and no plants or supplies.

Personal goals are calculated locally from recorded totals from the preceding seven days:
steps, active minutes, feed minutes and daylight. Targets remain fixed through the week.
At least one preceding day with a metric is required. Missing values do not count as zero.
Movement rewards settle when reached; feed-time limits settle after the local date ends.
Reward keys and gold are saved together, so refreshes and retries do not duplicate rewards.
No AI request is needed for these local goal calculations. Sample coach content stays in
the sample garden; personal mode never presents that persona's report as your own.

**Report → Your data and privacy** explains storage, disconnects syncing and offers
confirmed deletion. Local health updates use a durable AsyncStorage queue (localStorage
on web); the latest 35 days and pending uploads are retained. Failed uploads are retried
on startup, foregrounding and **Retry upload**. Local save failures preserve your input.
Health data deletion preserves gold, inventory, plants and minimal reward-deduplication
keys; it clears local totals/targets and cloud health-derived records for the current
anonymous account. Cloud deletion/reconnect require the migrations in
`docs/SUPABASE_SETUP.md`. Apple Health originals are not removed.

### Verification

Run `npm run typecheck`, `npm run check`, and `npm run export:web` in `mobile/`.
Checks cover input validation, concurrent/offline health updates, daily care rollover,
DST/backward clocks, automatic local-midnight timers without health data, resume/timezone changes, separate sample progress and once-only rewards (including failed saves).
SQL isolation/deletion tests live in `supabase/tests/`; they require a Supabase database.

For a visual check at 320×568 and 390×844, complete or skip the guide, plant a plot,
open Market, switch tabs, view Report/privacy, and switch to/from the sample garden.
The full 24-plant sample garden was measured in the web development build with a temporary
render counter: four tab switches (Goals, Coach, Report, Garden) caused **4 GardenScene
renders before and 0 after** memoization/stable callbacks. The counter was removed after
measurement. Plant artwork is memoized, and plot lookups are indexed by coordinate.
This is a render-count result, not a native-device frame-rate benchmark.

## Garden sounds

The speaker button below the top-right money badge mutes/unmutes garden effects.
The choice is saved separately from the garden in AsyncStorage (`healthgarden:sound-muted:v1`),
which uses localStorage on web; resetting the garden does not reset this preference.
Sounds default to on once the saved preference has loaded. A failed preference save shows
an inline retry message.

Successful watering (including Water all), fertilizing and planting (including Buy & plant)
play soft sine-based clips, 0.34–0.62 seconds long, at 28% playback volume.
Raised-cosine fades and a fourth-order low-pass filter remove sharp edges and crackle. Failed actions and
shop-only purchases stay silent. One queue plays each effect to completion; rapid actions
never overlap. Muting clears pending sounds and fades the current clip out over about 48ms.
Backgrounding clears playback. iOS silent mode is respected, and no microphone permissions
or background audio service are enabled. Audio problems never roll back a saved garden action.

Assets in `assets/sounds/` are original synthesized Foley, created for this repository without
external recordings. Regenerate them with `python3 scripts/make-garden-sounds.py`.
Playback uses Expo SDK 57's `expo-audio`. Expo Go includes it; an existing custom development
build needs rebuilding after adding the native module.

To test: plant in an empty plot, buy a watering can/fertilizer and care for the plant.
Try rapid successful actions on different plants, then mute and refresh. The speaker should
stay muted and plant care should still work. Unmute to restore effects. `npm run check`
covers serialization, mute persistence, cancellation and storage/audio failure handling.
