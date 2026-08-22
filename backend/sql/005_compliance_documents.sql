-- 005_compliance_documents.sql
-- Run this in the Supabase SQL editor to add compliance documents

create table if not exists compliance_documents (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('profile', 'invoice')),
  entity_id uuid not null,
  category text not null check (category in ('business_kyc', 'individual_kyc', 'commercial', 'shipment', 'service_export', 'payment_proof', 'hedging_proof', 'other')),
  document_name text not null,
  file_url text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid references profiles(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table compliance_documents enable row level security;

create policy "exporter_select_own_documents" on compliance_documents
  for select using (uploader_id = auth.uid());

create policy "exporter_insert_own_documents" on compliance_documents
  for insert with check (uploader_id = auth.uid());

create policy "admin_bank_select_documents" on compliance_documents
  for select using (
    exists (
      select 1 from profiles 
      where id = auth.uid() and role in ('admin', 'bank')
    )
  );

create policy "admin_update_documents" on compliance_documents
  for update using (
    exists (
      select 1 from profiles 
      where id = auth.uid() and role = 'admin'
    )
  );
