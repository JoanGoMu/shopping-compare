-- store_extractors: AI-generated CSS selector rules cached per domain.
-- Run this in the Supabase SQL editor at:
-- https://supabase.com/dashboard/project/czrvohnvncavpoulivtt/sql

create table if not exists store_extractors (
  domain text primary key,
  selectors jsonb not null,
  sample_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  success_count int default 0,
  fail_count int default 0,
  status text default 'active'  -- active | stale | disabled
);

-- Public read: the extension fetches rules without auth
alter table store_extractors enable row level security;

create policy "Anyone can read active rules"
  on store_extractors for select
  using (status = 'active');

-- Only service role can insert/update (done server-side via admin client)
