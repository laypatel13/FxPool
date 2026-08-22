-- FxPool V2 — bank-owned pools. Run after schema.sql + 001 + 002.
-- Existing rows are attached to a platform placeholder bank so the migration is non-destructive.

create extension if not exists pgcrypto;

-- ── banks ───────────────────────────────────────────────────
create table if not exists banks (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'active', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into banks (code, name, status)
values ('FXPOOL-LEGACY', 'Legacy platform pools (pre-V2)', 'active')
on conflict (code) do nothing;

-- ── invitation codes (controlled onboarding) ────────────────
create table if not exists invitation_codes (
  id          uuid primary key default gen_random_uuid(),
  bank_id     uuid not null references banks(id) on delete cascade,
  code        text not null unique,
  kind        text not null check (kind in ('exporter', 'bank_user')),
  status      text not null default 'active'
                check (status in ('active', 'used', 'revoked')),
  created_at  timestamptz not null default now()
);

-- ── profiles: bank role + denormalized bank_id ──────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('exporter', 'admin', 'bank'));

alter table profiles add column if not exists bank_id uuid references banks(id);

-- ── exporter ↔ bank (designed for multi-bank later) ─────────
create table if not exists exporter_bank_relationships (
  id           uuid primary key default gen_random_uuid(),
  exporter_id  uuid not null references profiles(id) on delete cascade,
  bank_id      uuid not null references banks(id) on delete cascade,
  status       text not null default 'active'
                 check (status in ('pending', 'active', 'suspended', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (exporter_id, bank_id)
);

create index if not exists idx_ebr_bank on exporter_bank_relationships (bank_id, status);
create index if not exists idx_ebr_exporter on exporter_bank_relationships (exporter_id, status);

-- ── pools: bank ownership + per-pool config ─────────────────
alter table pools add column if not exists bank_id uuid references banks(id);
alter table pools add column if not exists name text;
alter table pools add column if not exists minimum_amount numeric(14,2);
alter table pools add column if not exists target_amount numeric(14,2);
alter table pools add column if not exists maximum_amount numeric(14,2);
alter table pools add column if not exists eligible_exporter_ids uuid[];
alter table pools add column if not exists updated_at timestamptz not null default now();

update pools
set bank_id = (select id from banks where code = 'FXPOOL-LEGACY' limit 1)
where bank_id is null;

update pools set name = coalesce(name, currency || ' window') where name is null;
update pools set minimum_amount = coalesce(minimum_amount, 50000);
update pools set target_amount = coalesce(target_amount, 100000);
update pools set maximum_amount = coalesce(maximum_amount, 150000);

update pools set status = 'target_reached' where status = 'suggested';
update pools set status = 'hedged' where status = 'locked';

alter table pools drop constraint if exists pools_status_check;
alter table pools add constraint pools_status_check
  check (status in (
    'draft', 'collecting', 'target_reached', 'hedging',
    'hedged', 'settled', 'cancelled', 'expired'
  ));

alter table pools alter column bank_id set not null;

create index if not exists idx_pools_bank_status on pools (bank_id, status, currency);

-- ── invoices: bank derived server-side + extraction fields ──
alter table invoices add column if not exists bank_id uuid references banks(id);
alter table invoices add column if not exists invoice_number text;
alter table invoices add column if not exists issue_date date;
alter table invoices add column if not exists buyer_name text;
alter table invoices add column if not exists buyer_country text;
alter table invoices add column if not exists payment_terms text;
alter table invoices add column if not exists document_url text;
alter table invoices add column if not exists extracted_data jsonb;
alter table invoices add column if not exists validation_status text;
alter table invoices add column if not exists pool_match_status text not null default 'none';
alter table invoices add column if not exists match_score numeric;
alter table invoices add column if not exists match_reason text;
alter table invoices add column if not exists recommended_alternatives jsonb;
alter table invoices add column if not exists updated_at timestamptz not null default now();

update invoices i
set bank_id = p.bank_id
from pools p
where i.pool_id = p.id and i.bank_id is null;

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in (
    'pending_pool', 'recommended', 'pooled', 'pool_not_filled', 'locked', 'settled'
  ));

create index if not exists idx_invoices_bank on invoices (bank_id);

-- ── agent_runs names ────────────────────────────────────────
alter table agent_runs drop constraint if exists agent_runs_agent_name_check;
alter table agent_runs add constraint agent_runs_agent_name_check
  check (agent_name in (
    'invoice', 'risk', 'pooling', 'compliance', 'orchestrator', 'document', 'matching'
  ));

-- ── atomic join (capacity race protection) ──────────────────
create or replace function try_join_pool(p_pool_id uuid, p_invoice_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_inv invoices%rowtype;
  v_pool pools%rowtype;
  v_new_total numeric;
  v_status text;
begin
  select * into v_inv from invoices where id = p_invoice_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invoice_not_found');
  end if;
  if v_inv.pool_id is not null and v_inv.status = 'pooled' then
    return jsonb_build_object('ok', false, 'error', 'already_assigned');
  end if;

  select * into v_pool from pools where id = p_pool_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'pool_not_found');
  end if;

  if v_pool.status not in ('collecting', 'target_reached', 'draft') then
    return jsonb_build_object('ok', false, 'error', 'pool_not_open');
  end if;
  if v_pool.status = 'draft' then
    return jsonb_build_object('ok', false, 'error', 'pool_not_open');
  end if;
  if v_inv.bank_id is distinct from v_pool.bank_id then
    return jsonb_build_object('ok', false, 'error', 'bank_mismatch');
  end if;
  if upper(v_inv.currency) <> upper(v_pool.currency) then
    return jsonb_build_object('ok', false, 'error', 'currency_mismatch');
  end if;

  v_new_total := coalesce(v_pool.total_amount, 0) + v_inv.amount;
  if v_pool.maximum_amount is not null and v_new_total > v_pool.maximum_amount then
    return jsonb_build_object('ok', false, 'error', 'capacity');
  end if;

  v_status := 'collecting';
  if v_pool.target_amount is not null and v_new_total >= v_pool.target_amount then
    v_status := 'target_reached';
  elsif v_pool.minimum_amount is not null and v_new_total >= v_pool.minimum_amount then
    v_status := 'collecting';
  end if;
  if v_pool.maximum_amount is not null and v_new_total >= v_pool.maximum_amount then
    v_status := 'target_reached';
  end if;

  update pools
     set total_amount = v_new_total,
         status = v_status,
         updated_at = now()
   where id = p_pool_id;

  update invoices
     set pool_id = p_pool_id,
         status = 'pooled',
         pool_match_status = 'assigned',
         exporter_confirmed = true,
         updated_at = now()
   where id = p_invoice_id;

  return jsonb_build_object('ok', true, 'total_amount', v_new_total, 'status', v_status);
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────
alter table banks enable row level security;
alter table invitation_codes enable row level security;
alter table exporter_bank_relationships enable row level security;

create policy "admin_full_banks" on banks for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "bank_select_own_bank" on banks for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'bank' and bank_id = banks.id)
);
create policy "exporter_select_own_bank" on banks for select using (
  exists (
    select 1 from exporter_bank_relationships r
    where r.exporter_id = auth.uid() and r.bank_id = banks.id and r.status = 'active'
  )
);

create policy "admin_full_invites" on invitation_codes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "bank_own_invites" on invitation_codes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'bank' and bank_id = invitation_codes.bank_id)
);

create policy "admin_full_ebr" on exporter_bank_relationships for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "bank_own_ebr" on exporter_bank_relationships for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'bank' and bank_id = exporter_bank_relationships.bank_id)
);
create policy "exporter_own_ebr" on exporter_bank_relationships for select using (
  exporter_id = auth.uid()
);

drop policy if exists "admin_full_access_pools" on pools;
create policy "admin_full_access_pools" on pools for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "bank_own_pools" on pools for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'bank' and bank_id = pools.bank_id)
);
create policy "exporter_eligible_pools" on pools for select using (
  exists (
    select 1 from exporter_bank_relationships r
    where r.exporter_id = auth.uid()
      and r.bank_id = pools.bank_id
      and r.status = 'active'
  )
);

drop policy if exists "admin_full_access_invoices" on invoices;
create policy "admin_full_access_invoices" on invoices for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "bank_own_invoices" on invoices for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'bank' and bank_id = invoices.bank_id)
);

-- pool_settings remain templates only (admin write already exists)
