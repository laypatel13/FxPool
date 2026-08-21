-- Migration: 001_add_agent_runs.sql
-- Add agent_runs table and extend pools/invoices for AI Agent layer

-- 1. Create agent_runs table
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  pool_id uuid references pools(id) on delete cascade,
  agent_name text not null check (agent_name in ('invoice', 'risk', 'pooling', 'compliance', 'orchestrator')),
  input jsonb,
  output jsonb,
  recommendation text,
  confidence numeric,
  created_at timestamptz not null default now()
);

create index idx_agent_runs_invoice on agent_runs (invoice_id);
create index idx_agent_runs_pool on agent_runs (pool_id);

-- 2. Extend invoices table
alter table invoices
  add column risk_score numeric,
  add column compliance_status text,
  add column agent_recommended_pool_id uuid references pools(id);

-- 3. Extend pools table
alter table pools
  add column risk_score numeric,
  add column compliance_status text;

-- 4. RLS for agent_runs (service role bypasses this, but good for defense-in-depth)
alter table agent_runs enable row level security;

-- Admin can see all agent runs
create policy "admin_full_access_agent_runs" on agent_runs
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Exporters can see agent runs for their own invoices
create policy "exporter_select_own_agent_runs" on agent_runs
  for select using (
    exists (select 1 from invoices where id = agent_runs.invoice_id and exporter_id = auth.uid())
  );
