# Supabase setup — Healthy Garden

Owner: whoever created the team's Supabase project. Part A is done by a person in the
dashboard (a few clicks). Part B is written for that person's AI assistant (Claude Code,
Cursor…) and can be pasted to it as-is.

How the backend works:

```
iPhone app (Expo) ── anonymous sign-in ──► Supabase Auth  (no login screen, one user per install)
      │  writes health_days, garden plants, read/dismiss flags                (RLS: own rows only)
      ▼
Supabase Postgres ◄── Edge Function "analyze" (later) ── Claude API
                      reads 30 days of health_days → writes goals, insights, reports, alerts, coins
```

The schema is `supabase/migrations/20261016120000_app_schema.sql`. Ignore `supabase/web-prototype/`
(old browser prototype — never apply it).

---

## Part A — for the person (dashboard)

1. **Region:** the project should be in a US West region (we're in California). If it was created
   elsewhere and is still empty, it's fine to keep — just tell the team.
2. **Database password:** keep it in your password manager. Never paste it into chat, code, or an AI prompt.
3. **Anonymous sign-ins:** Authentication → Sign In / Providers → turn on **Anonymous Sign-Ins**.
   Also turn on **Allow manual linking** (lets us upgrade a user to Sign in with Apple later).
4. **Invite the team:** Organization settings → Team → invite each teammate (Developer role).
5. **Connect your AI to the project** (pick one):
   - Supabase MCP server (recommended): connect it in your AI tool and authorize this project; or
   - Supabase CLI: `npm i -g supabase` then `supabase login`.
6. Give your AI the prompt in Part B.

## Part B — for the AI assistant

> You are setting up the Supabase backend for **Healthy Garden** (repo:
> `https://github.com/MertDemircanYc80/healthy-garden`). Read `AGENTS.md` and this file first.
> Work only on the Supabase project the user names. Do not change app code except the
> generated types file in step 5.
>
> 1. **Confirm the project.** List projects and confirm with the user which one is Healthy Garden.
>    Note its project ref and API URL.
> 2. **Check it's empty.** List tables in `public`. If any tables exist, stop and ask the user
>    before continuing — do not drop anything.
> 3. **Apply the schema.** Apply `supabase/migrations/20261016120000_app_schema.sql` exactly as
>    written, as one migration named `app_schema`
>    (MCP: `apply_migration`; CLI: `supabase link --project-ref <ref>` then `supabase db push`).
>    Do not apply anything from `supabase/web-prototype/`.
> 4. **Verify.**
>    - Tables exist: profiles, health_days, goals, insights, reports, alerts, gardens, coin_events, ai_runs.
>    - RLS is enabled on all nine (`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`).
>    - The trigger `on_auth_user_created` exists on `auth.users`.
>    - Run the security and performance advisors and report every warning. Do not "fix" a
>      warning by disabling RLS or widening a policy — explain it to the user instead.
>    - Ask the user to confirm Anonymous Sign-Ins is on (Part A step 3). If you can, test it:
>      call `signInAnonymously()` with the publishable key, check a `profiles` row and a `gardens`
>      row were created for that user, then delete that test user.
> 5. **Generate types.** Generate TypeScript types for the `public` schema and save them to
>    `mobile/src/lib/database.types.ts`. Create a branch `backend/supabase-types`, commit only
>    that file, push, and open a PR into `main` titled "Add Supabase types".
> 6. **Hand-off message.** Give the user a short message to post in the team chat containing:
>    - Project URL
>    - Publishable key (`sb_publishable_…`, or the legacy `anon` key if that's what the project shows)
>    - Which advisors warnings remain, if any
>
>    The app will read them from `mobile/.env.local` (gitignored):
>    ```
>    EXPO_PUBLIC_SUPABASE_URL=...
>    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
>    ```
>    **Never** include the secret / `service_role` key or the database password in the message,
>    the repo, or any file — they stay in the dashboard and in Edge Function secrets only.
>
> Do NOT do these yet (they come in the next phase): Edge Functions, `ANTHROPIC_API_KEY` secret,
> pg_cron schedules, storage buckets, email/Apple auth providers, CAPTCHA.

---

## Next phase (not now)

- Edge Function `analyze`: loads a user's last 30 `health_days`, asks Claude for personal
  goals/insights/report/alerts as strict JSON, validates it, writes the rows, pays coins via
  `coin_events` (unique `ref` = no double pay). Secret: `ANTHROPIC_API_KEY` (set with
  `supabase secrets set`, never in the repo).
- Schedule it nightly per user with pg_cron + pg_net, and also call it when the app opens if
  the last run is older than 12 hours.
- Before a public launch: CAPTCHA on anonymous sign-ins, Sign in with Apple via manual linking.
