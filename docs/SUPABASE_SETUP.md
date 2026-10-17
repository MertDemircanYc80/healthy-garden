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

## Part C — AI coach (Edge Function `analyze`) — after Part B is done

Code: `supabase/functions/analyze/index.ts` + `supabase/functions/_shared/analysis/`.
Tests: `cd supabase/functions && deno test --allow-env _shared/analysis/` (no keys needed).

How it works: loads the user's last ~30 `health_days` → computes numbered facts in code (averages,
week-over-week change, late-night vs sleep, feed time vs bedtime, weekday vs weekend…) → asks Claude
(`claude-sonnet-5-5`, Structured Outputs) to write goals / insights / report summary / alerts that may
only cite those facts → validates everything (ranges, rounding, no medical or diet-restriction
language, patterns must cite a real fact) → writes `goals`, `insights`, `reports`, `alerts`, `ai_runs`.
Goals change once a week (Monday) unless none exist. Without `ANTHROPIC_API_KEY` it still writes a
sensible starter plan (no AI).

For the person:
1. Create an Anthropic API key (console.anthropic.com → API keys). Put a monthly spend limit on it.
2. Make up a long random `CRON_SECRET` (e.g. a password-manager password).
3. Give both to your AI **only through the CLI prompt below / the dashboard** — never in chat with
   teammates or in the repo.

For the AI assistant:
> 1. Set secrets (the user types the values, don't echo them):
>    `supabase secrets set ANTHROPIC_API_KEY=... CRON_SECRET=...`
> 2. Deploy: `supabase functions deploy analyze --no-verify-jwt`
>    (the function verifies user tokens itself so the scheduler can call it with `x-cron-secret`).
> 3. Smoke test as a user: sign in anonymously with the publishable key, insert 5 `health_days`
>    rows for that user, call `POST /functions/v1/analyze` with the user's access token, check that
>    `goals`, `insights`, `reports` and an `ai_runs` row (`status = ok`) appeared. Delete the test user.
> 4. Schedule it (SQL editor; store the secret in Vault, not in the SQL):
>    ```sql
>    create extension if not exists pg_cron;
>    create extension if not exists pg_net;
>    select vault.create_secret('<CRON_SECRET>', 'cron_secret');
>    select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
>    -- nightly at 04:00 UTC (9 pm in California) and Monday 13:00 UTC with new weekly goals
>    select cron.schedule('analyze-nightly', '0 4 * * *', $$
>      select net.http_post(
>        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/analyze',
>        headers := jsonb_build_object('content-type', 'application/json',
>          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
>        body := '{"weekly": false}'::jsonb);
>    $$);
>    select cron.schedule('analyze-weekly', '0 13 * * 1', $$
>      select net.http_post(
>        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/analyze',
>        headers := jsonb_build_object('content-type', 'application/json',
>          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
>        body := '{"weekly": true}'::jsonb);
>    $$);
>    ```
> 5. Report back which steps succeeded. Never print the secret values.

## Later

- Coins: a `settle` step that pays `reward_coins` into `coin_events` (unique `ref` = no double pay)
  when a day's goal is met, and updates `gardens.coins` / `streak`.
- Before a public launch: CAPTCHA on anonymous sign-ins, Sign in with Apple via manual linking.

### Approved improvements: health access checks

Apply `supabase/migrations/20261017010000_health_access.sql` after the app schema.
It preserves ownership RLS, limits client-writable columns, protects record identities,
restricts edits of coach-generated goals, and validates new health totals.
Run `supabase/tests/health_access.sql` using the SQL editor in a development project:
it creates two synthetic users inside a transaction and rolls all fixtures back.
It checks cross-user reads/inserts/updates/deletes, anonymous access, ownership changes,
and malformed totals. The migration and SQL checks have not yet been run on the hosted
project; mobile validation tests do not substitute for these database tests.

Apply `supabase/migrations/20261017020000_health_privacy.sql` next. It adds
owner-only deletion/reconnect RPCs and blocks new health-derived writes while deletion
has disabled syncing (including coach work already in flight). Run
`supabase/tests/health_privacy.sql` in a development project to check isolation,
anonymous denial, deletion, reconnect and upsert compatibility. These SQL tests still
require a connected PostgreSQL/Supabase management session; they are not part of the
mobile JavaScript checks. No service-role key is needed by the app.
