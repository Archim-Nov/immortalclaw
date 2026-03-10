create extension if not exists pgcrypto;

create table if not exists public.world_snapshots (
  world_key text primary key,
  version integer not null,
  tick integer not null,
  updated_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null
);

create table if not exists public.cultivator_records (
  cultivator_id text primary key,
  tick integer not null,
  updated_at timestamptz not null default timezone('utc', now()),
  snapshot jsonb not null
);

create table if not exists public.world_actions (
  id uuid primary key default gen_random_uuid(),
  tick integer not null,
  cultivator_id text not null,
  action_id text not null,
  accepted boolean not null,
  summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null
);

create index if not exists world_actions_tick_idx on public.world_actions (tick desc);
create index if not exists world_actions_cultivator_idx on public.world_actions (cultivator_id, created_at desc);

create table if not exists public.world_events (
  id uuid primary key default gen_random_uuid(),
  tick integer not null,
  event_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null
);

create index if not exists world_events_tick_idx on public.world_events (tick desc);

create table if not exists public.tick_runs (
  id uuid primary key default gen_random_uuid(),
  tick integer not null,
  advanced_ticks integer not null,
  trigger text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null
);

create index if not exists tick_runs_recorded_at_idx on public.tick_runs (recorded_at desc);

create table if not exists public.world_locks (
  lock_name text primary key,
  owner_id text not null,
  acquired_at timestamptz not null default timezone('utc', now())
);
