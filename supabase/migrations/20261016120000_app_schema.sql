-- Healthy Garden — database for the Expo app.
--
-- Identity: every install signs in with Supabase Anonymous Sign-Ins (no login screen), so
-- auth.uid() is the user. Row Level Security keeps each user's rows private.
-- Writers:
--   app (authenticated role)        → health_days, garden plants, read/dismiss flags, own goals
--   AI analysis (Edge Function, service role, bypasses RLS) → goals, insights, reports, alerts, coins
-- Shapes mirror mobile/src/types.ts. Change the schema with a NEW migration file.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Los_Angeles',
  bedtime_target time,
  coach_tone text not null default 'gentle' check (coach_tone in ('gentle', 'direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.gardens (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------- health data (one row per day)
create table public.health_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,                       -- the user's local calendar day
  steps integer check (steps >= 0),
  walking_running_km numeric(6, 2) check (walking_running_km >= 0),
  active_energy_kcal integer check (active_energy_kcal >= 0),
  active_minutes integer check (active_minutes between 0 and 1440),
  running_minutes integer check (running_minutes between 0 and 1440),
  workout_minutes integer check (workout_minutes between 0 and 1440),
  sleep_minutes integer check (sleep_minutes between 0 and 1440),
  bedtime time,
  wake_time time,
  daylight_minutes integer check (daylight_minutes between 0 and 1440),
  screen_minutes integer check (screen_minutes between 0 and 1440),
  feed_minutes integer check (feed_minutes between 0 and 1440),
  long_sessions integer check (long_sessions >= 0),
  driving_minutes integer check (driving_minutes between 0 and 1440),
  app_usage jsonb,                          -- {"Instagram": 42, "TikTok": 18}
  nutrition jsonb,                          -- {"energyKcal":1820,"proteinG":95,"carbsG":210,"fatG":60,"waterMl":1500}
  source text not null default 'healthkit', -- healthkit | health_export | shortcut | manual | demo
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------- AI outputs
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,                 -- Monday of the goal's week
  title text not null,
  metric text not null,                     -- steps | sleep_minutes | bedtime | feed_minutes | daylight_minutes | ...
  target numeric not null,
  unit text not null default '',
  direction text not null check (direction in ('at_least', 'at_most')),
  reason text not null,                     -- why this goal is personal, from the user's own data
  reward_coins integer not null default 15 check (reward_coins between 0 and 100),
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  source text not null default 'ai' check (source in ('ai', 'user')),
  created_at timestamptz not null default now()
);
create index goals_user_week on public.goals (user_id, week_start);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pattern', 'suggestion', 'praise')),
  title text not null,
  body text not null,
  evidence text,                            -- the data behind it, in plain words
  action text,                              -- one concrete thing to try
  metric text,
  status text not null default 'new' check (status in ('new', 'remind', 'dismissed')),
  remind_at timestamptz,
  model text,
  created_at timestamptz not null default now()
);
create index insights_user_created on public.insights (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  score integer not null check (score between 0 and 100),
  score_change integer not null default 0,
  summary text not null,
  metrics jsonb not null default '[]',      -- ReportMetric[] (mobile/src/types.ts)
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, period_start)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('nudge', 'heads_up', 'celebrate')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_sent_at timestamptz
);
create index alerts_user_created on public.alerts (user_id, created_at desc);

-- ---------------------------------------------------------------- garden + coins
create table public.gardens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),   -- changed only by the server
  streak integer not null default 0 check (streak >= 0), -- changed only by the server
  plants jsonb not null default '[]',                    -- Plant[] (mobile/src/types.ts)
  updated_at timestamptz not null default now()
);

-- Every coin change, with a unique ref so a reward can never be paid twice
-- (e.g. ref = 'goal:<goal_id>:2026-10-16').
create table public.coin_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);

-- Log of AI analysis runs (debugging, cost tracking). No client access.
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,                       -- daily | weekly | manual
  status text not null default 'started' check (status in ('started', 'ok', 'error')),
  days_used integer,
  error text,
  created_at timestamptz not null default now()
);

-- Create profile + garden for every new (anonymous) user.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- updated_at helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger health_days_touch before update on public.health_days for each row execute function public.touch_updated_at();
create trigger gardens_touch before update on public.gardens for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- Row Level Security
alter table public.profiles enable row level security;
alter table public.health_days enable row level security;
alter table public.goals enable row level security;
alter table public.insights enable row level security;
alter table public.reports enable row level security;
alter table public.alerts enable row level security;
alter table public.gardens enable row level security;
alter table public.coin_events enable row level security;
alter table public.ai_runs enable row level security; -- no policies: server only

-- profiles: read + edit your own
create policy "profiles: read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- health_days: full control of your own days
create policy "health: read own" on public.health_days for select to authenticated using ((select auth.uid()) = user_id);
create policy "health: insert own" on public.health_days for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "health: update own" on public.health_days for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "health: delete own" on public.health_days for delete to authenticated using ((select auth.uid()) = user_id);

-- goals: read own; users may add/edit/delete only goals they created themselves
create policy "goals: read own" on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals: insert own user goals" on public.goals for insert to authenticated with check ((select auth.uid()) = user_id and source = 'user');
create policy "goals: update own" on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals: delete own user goals" on public.goals for delete to authenticated using ((select auth.uid()) = user_id and source = 'user');

-- insights / reports / alerts: written by the AI, read by the user
create policy "insights: read own" on public.insights for select to authenticated using ((select auth.uid()) = user_id);
create policy "insights: update own" on public.insights for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reports: read own" on public.reports for select to authenticated using ((select auth.uid()) = user_id);
create policy "alerts: read own" on public.alerts for select to authenticated using ((select auth.uid()) = user_id);
create policy "alerts: update own" on public.alerts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- gardens: read own; the app may only change the plants (coins/streak are server-side)
create policy "gardens: read own" on public.gardens for select to authenticated using ((select auth.uid()) = user_id);
create policy "gardens: update own" on public.gardens for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- coin_events: read own history only
create policy "coins: read own" on public.coin_events for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- column-level limits
-- RLS limits rows; these grants limit which columns the app may change.
revoke insert, update, delete on public.gardens from anon, authenticated;
grant update (plants) on public.gardens to authenticated;

revoke update on public.goals from anon, authenticated;
grant update (status, title, target) on public.goals to authenticated;

revoke update on public.insights from anon, authenticated;
grant update (status, remind_at) on public.insights to authenticated;

revoke update on public.alerts from anon, authenticated;
grant update (read_at) on public.alerts to authenticated;

revoke insert, update, delete on public.reports, public.coin_events, public.ai_runs from anon, authenticated;
revoke all on public.ai_runs from anon, authenticated;
revoke all on public.coin_events from anon;

-- The signed-out role never touches app data.
revoke all on public.profiles, public.health_days, public.goals, public.insights, public.reports, public.alerts, public.gardens from anon;
