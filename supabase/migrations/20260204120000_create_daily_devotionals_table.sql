create table if not exists public.daily_devotionals (
  date text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

alter table public.daily_devotionals enable row level security;
