# Healthy Garden — mobile app (Expo)

Read the repo-root `AGENTS.md` first (team rules, ownership, git workflow). This file adds
the mobile-specific rules. The Expo guidance below came with the template and still applies.

## Product rules for this app
- The garden (`src/components/garden/`) is a FIXED illustration: same angle, same place, no
  pan/zoom/rotate, no 3D. Keep it calm and simple. Plants are drawn in SVG per species + stage.
- Everything else lives in the bottom island. Collapsed it shows a peek; expanded it covers at
  most ~60% of the screen so the back of the garden stays visible.
- No login screen. Each install will sign in anonymously to Supabase (later).
- Screens read data only through `useApp()` (`src/state/AppState.tsx`). Right now it serves
  demo data from `src/data/demo.ts`; later it loads Supabase tables with the same shapes
  (`src/types.ts` mirrors `supabase/migrations/*_app_schema.sql`).
- Design tokens are in `src/theme.ts` (pine island, moss accent, sun yellow for rewards,
  Fraunces for display text, system font for body). Don't hard-code new colours.
- Copy: sentence case, plain words, encouraging, never shaming. Health content always says
  it is not medical advice.
- Before pushing: `npm run typecheck`. To check visuals without a phone: `npm run export:web`,
  serve `dist/`, open at 390×844 (`?hour=10&tab=goals&open=1` sets time/tab for screenshots).

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Healthy Garden has ONE main route (`src/app/index.tsx`). Sections (Garden, Goals, Coach, Report, Alerts) are not routes — they live inside the bottom island (`src/components/island/Island.tsx`). Add a new section there, not as a new screen.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
