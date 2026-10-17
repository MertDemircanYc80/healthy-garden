-- Healthy Garden: data ingestion from iOS Shortcuts / extension / future native app.
-- Identity for now = a personal sync token the app generates; we store only its SHA-256 hash.
-- (When real auth lands, add user_id and link devices to users.)

create table if not exists ingest_devices (
  token_hash text primary key,
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Pre-aggregated daily numbers (what a Shortcut sends), one row per day per source.
create table if not exists daily_metrics (
  token_hash text not null references ingest_devices(token_hash) on delete cascade,
  date date not null,
  source text not null default 'shortcut',
  metrics jsonb not null,                    -- DailyMetrics (src/lib/data/samples.ts)
  updated_at timestamptz not null default now(),
  primary key (token_hash, date, source)
);

-- App open/close and driving start/end events. Durations are computed when read.
create table if not exists device_events (
  id bigint generated always as identity primary key,
  token_hash text not null references ingest_devices(token_hash) on delete cascade,
  kind text not null check (kind in ('app_open','app_close','driving_start','driving_end')),
  app text,
  at timestamptz not null,
  at_local text not null,                    -- original ISO string with offset (keeps the user's local day)
  received_at timestamptz not null default now()
);
create index if not exists device_events_token_at on device_events (token_hash, at);

-- Only the server (service role key) touches these tables.
alter table ingest_devices enable row level security;
alter table daily_metrics enable row level security;
alter table device_events enable row level security;
