-- ── banks ───────────────────────────────────────────────────
create table banks (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  code               text unique not null,           -- short code, e.g. 'HDFC', 'ICICI'
  status             text not null default 'active'
                       check (status in ('active','inactive','suspended')),
  supported_currencies text[] not null default '{}',  -- e.g. {'USD','EUR','GBP'}
  api_endpoint       text,                             -- optional, for real quote/webhook integration
  api_key_ref        text,                             -- reference/secret name, never the raw key
  contact_email      text,
  contact_name       text,
  created_at         timestamptz not null default now()
);

-- ── bank_capacity (per bank, per currency limits) ──────────
create table bank_capacity (
  id                 uuid primary key default gen_random_uuid(),
  bank_id            uuid not null references banks(id) on delete cascade,
  currency           text not null,
  max_exposure       numeric(14,2) not null,          -- hard cap this bank will take
  current_exposure   numeric(14,2) not null default 0, -- running total of locked+unsettled pools
  min_pool_amount    numeric(14,2) default 5000,       -- overrides pool_settings per bank if set
  updated_at         timestamptz not null default now(),
  unique (bank_id, currency)
);

-- ── bank_quotes (RFQ log — what each bank offered for a pool) ─
create table bank_quotes (
  id                 uuid primary key default gen_random_uuid(),
  pool_id            uuid references pools(id) on delete cascade,
  bank_id            uuid not null references banks(id),
  quoted_rate        numeric(10,4) not null,
  source             text not null default 'internal_formula'
                       check (source in ('internal_formula','bank_api','manual')),
  valid_until        timestamptz,
  created_at         timestamptz not null default now()
);

-- ── bank_users (staff who log in as a bank) ────────────────
create table bank_users (
  id                 uuid primary key references auth.users(id) on delete cascade,
  bank_id            uuid not null references banks(id) on delete cascade,
  full_name          text not null,
  created_at         timestamptz not null default now()
);

-- ── pools: add bank linkage ─────────────────────────────────
alter table pools add column bank_id uuid references banks(id);
alter table pools add column routing_confidence numeric(5,2);   -- agent's confidence in the routing decision
alter table pools add column routing_reasoning text;             -- agent's stated reasoning, shown to admin

create index idx_pools_bank_currency_status on pools (bank_id, currency, status);

-- ── RLS for bank users ──────────────────────────────────────
alter table banks enable row level security;
alter table bank_capacity enable row level security;
alter table bank_quotes enable row level security;
alter table bank_users enable row level security;

-- Admin policies (mirroring existing)
create policy admin_full_access_banks on banks for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'admin'
);
create policy admin_full_access_bank_capacity on bank_capacity for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'admin'
);
create policy admin_full_access_bank_quotes on bank_quotes for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'admin'
);
create policy admin_full_access_bank_users on bank_users for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'admin'
);

-- Bank user policies
create policy bank_read_banks on banks for select to authenticated using (
  id = (select bank_id from bank_users where id = auth.uid())
);
create policy bank_read_capacity on bank_capacity for select to authenticated using (
  bank_id = (select bank_id from bank_users where id = auth.uid())
);
create policy bank_read_pools on pools for select to authenticated using (
  bank_id = (select bank_id from bank_users where id = auth.uid())
);
create policy bank_read_invoices on invoices for select to authenticated using (
  pool_id in (select id from pools where bank_id = (select bank_id from bank_users where id = auth.uid()))
);
create policy bank_read_quotes on bank_quotes for select to authenticated using (
  bank_id = (select bank_id from bank_users where id = auth.uid())
);
create policy bank_write_quotes on bank_quotes for insert to authenticated with check (
  bank_id = (select bank_id from bank_users where id = auth.uid())
);
create policy bank_read_bank_users on bank_users for select to authenticated using (
  bank_id = (select bank_id from bank_users where id = auth.uid())
);
