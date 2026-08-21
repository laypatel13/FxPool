-- FxPool schema — run in Supabase SQL editor

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('exporter', 'admin')),
  full_name     text not null,
  company_name  text,
  created_at    timestamptz not null default now()
);

-- ── pool_settings (admin-adjustable N) ─────────────────────
create table pool_settings (
  id                 uuid primary key default gen_random_uuid(),
  currency           text,                    -- null = global default
  bucket_width_days  int not null default 7,
  min_pool_amount    numeric(14,2) default 5000,
  updated_by         uuid references profiles(id),
  updated_at         timestamptz not null default now()
);

insert into pool_settings (currency, bucket_width_days, min_pool_amount)
values (null, 7, 5000);

-- ── pools ───────────────────────────────────────────────────
create table pools (
  id                  uuid primary key default gen_random_uuid(),
  currency            text not null,
  bucket_start_date   date not null,
  bucket_end_date     date not null,
  bucket_width_days   int not null,
  status              text not null default 'collecting'
                        check (status in ('collecting','suggested','locked','settled')),
  total_amount        numeric(14,2) not null default 0,
  locked_rate         numeric(10,4),
  executed_at         timestamptz,
  settled_at          timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_pools_currency_status on pools (currency, status);
create index idx_pools_bucket_window on pools (bucket_start_date, bucket_end_date);

-- ── invoices ────────────────────────────────────────────────
create table invoices (
  id                uuid primary key default gen_random_uuid(),
  exporter_id       uuid not null references profiles(id) on delete cascade,
  amount            numeric(14,2) not null check (amount > 0),
  currency          text not null,
  due_date          date not null,
  indicative_rate   numeric(10,4),
  status            text not null default 'pending_pool'
                       check (status in ('pending_pool','pooled','locked','settled')),
  pool_id           uuid references pools(id),
  locked_rate       numeric(10,4),
  payout_amount     numeric(14,2),
  created_at        timestamptz not null default now()
);

create index idx_invoices_exporter on invoices (exporter_id);
create index idx_invoices_pool on invoices (pool_id);

-- ── Row Level Security ─────────────────────────────────────
alter table profiles enable row level security;
alter table invoices enable row level security;
alter table pools enable row level security;
alter table pool_settings enable row level security;

-- profiles: users can read/update only their own row
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- invoices: exporters see/create only their own rows
create policy "invoices_select_own" on invoices
  for select using (auth.uid() = exporter_id);
create policy "invoices_insert_own" on invoices
  for insert with check (auth.uid() = exporter_id);

-- admins can read/write everything (checked via profiles.role)
create policy "admin_full_access_invoices" on invoices
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_full_access_pools" on pools
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_full_access_settings" on pool_settings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- NOTE: the FastAPI backend uses the Supabase service-role key, which
-- bypasses RLS entirely — these policies are the defense-in-depth layer
-- for any direct client-side Supabase access (e.g. future mobile app).
