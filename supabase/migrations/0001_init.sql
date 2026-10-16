-- Rooted: initial schema (plan §11).
-- Run in Supabase: SQL Editor -> paste -> Run. Or: supabase db push.
-- Change the schema with a NEW numbered migration file, never by editing this one.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bedtime_target text not null default '23:00',   -- "HH:MM"
  step_goal int not null default 8000,
  data_source text not null default 'mock',
  created_at timestamptz not null default now()
);

create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  steps int not null default 0,
  sleep_minutes int not null default 0,
  bedtime text,
  wake_time text,
  active_minutes int not null default 0,
  scroll_minutes int not null default 0,
  long_sessions int not null default 0,
  source text not null,
  unique (user_id, date)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  condition_type text not null,
  threshold numeric not null,
  reward_coins int not null
);

create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_key text not null references tasks(key),
  date date not null,
  coins_awarded int not null,
  created_at timestamptz not null default now(),
  unique (user_id, task_key, date)          -- idempotent payouts: one per task per day
);

create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount int not null,                      -- + earned, - spent
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists shop_items (
  id text primary key,                      -- matches ShopItemId in src/lib/types.ts
  name text not null,
  type text not null check (type in ('flower','tree','tool','consumable')),
  price int not null,
  growth_days int,
  sprite text
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_id text not null references shop_items(id),
  quantity int not null default 0 check (quantity >= 0),
  unique (user_id, item_id)
);

create table if not exists garden_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_id text not null references shop_items(id),
  grid_x int not null,
  grid_y int not null,
  growth_points numeric not null default 0,
  stage text not null default 'seed',
  is_dormant boolean not null default false,
  watered_today boolean not null default false,
  fertilized_until timestamptz,
  planted_at timestamptz not null default now(),
  unique (user_id, grid_x, grid_y)
);

create table if not exists real_impact (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('tree','garden')),
  partner text not null,
  status text not null default 'mocked',
  certificate_url text,
  created_at timestamptz not null default now()
);

-- Wallet balance is always derived from the ledger, never stored.
create or replace view wallet_balances as
  select user_id, coalesce(sum(amount), 0)::int as balance
  from wallet_transactions group by user_id;

-- Seed: tasks and shop (keep in sync with src/lib/economy.ts)
insert into tasks (key, title, condition_type, threshold, reward_coins) values
  ('first_steps','First steps','steps',1000,10),
  ('active_day','Active day','steps',5000,20),
  ('strong_day','Strong day','steps',8000,30),
  ('good_sleep','Good sleep','sleep_minutes',420,25),
  ('sleep_consistency','Sleep consistency','bedtime_window_minutes',30,15),
  ('doomscroll_down','Doomscroll down','scroll_reduction',0.2,25),
  ('offline_hour','Offline hour','offline_hours',1,15)
on conflict (key) do nothing;

insert into shop_items (id, name, type, price, growth_days, sprite) values
  ('daisy_seed','Daisy seed','flower',20,3,'🌼'),
  ('marigold_seed','Marigold seed','flower',30,3,'🏵️'),
  ('sunflower_seed','Sunflower seed','flower',50,5,'🌻'),
  ('fruit_sapling','Fruit sapling','tree',100,7,'🍎'),
  ('oak_sapling','Oak sapling','tree',150,10,'🌳'),
  ('watering_can','Watering can','tool',50,null,'🚿'),
  ('fertilizer','Fertilizer','consumable',20,null,'🧪')
on conflict (id) do nothing;

-- Demo user (one-tap demo sign-in)
insert into users (id, name, bedtime_target, step_goal)
values ('00000000-0000-0000-0000-000000000001','Demo','23:00',8000)
on conflict (id) do nothing;
