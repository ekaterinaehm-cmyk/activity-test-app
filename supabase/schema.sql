-- Run this once in your Supabase project SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  locale text not null,
  answers jsonb not null,
  interpretation text,
  status text not null default 'pending',  -- pending|sent|interpret_failed|email_failed|interpret_done_no_email
  ip text,
  sent_at timestamptz
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_email_idx on public.submissions (email);
create index if not exists submissions_status_idx on public.submissions (status);

create table if not exists public.rate_limits (
  ip text not null,
  ts timestamptz not null default now()
);
create index if not exists rate_limits_ip_ts_idx on public.rate_limits (ip, ts desc);

-- Row Level Security: keep everything off-limits to the anon key.
-- Only the service-role key (server-side) should ever touch these tables.
alter table public.submissions enable row level security;
alter table public.rate_limits enable row level security;
-- (No policies = anon/authenticated roles get nothing. Service role bypasses RLS.)

-- Optional housekeeping: keep rate_limits trimmed.
-- Schedule via Supabase cron (pg_cron) if you want automatic cleanup:
-- select cron.schedule('rate-limits-cleanup', '*/30 * * * *',
--   $$ delete from public.rate_limits where ts < now() - interval '2 hours' $$);
