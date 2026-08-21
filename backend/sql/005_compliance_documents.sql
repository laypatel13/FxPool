-- Migration: 005_compliance_documents.sql

create type document_entity_type as enum ('profile', 'invoice');
create type document_category as enum (
    'business_kyc',
    'individual_kyc',
    'commercial',
    'shipment',
    'service_export',
    'payment_proof',
    'hedging_proof',
    'other'
);
create type document_status as enum ('pending', 'verified', 'rejected');

create table documents (
    id uuid primary key default gen_random_uuid(),
    uploader_id uuid not null references profiles(id) on delete cascade,
    entity_type document_entity_type not null,
    entity_id uuid not null,
    category document_category not null,
    document_name text not null,
    file_url text not null,
    status document_status not null default 'pending',
    verified_at timestamptz,
    verified_by uuid references profiles(id),
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_documents_entity on documents(entity_type, entity_id);
create index idx_documents_uploader on documents(uploader_id);

alter table documents enable row level security;

-- Exporters can read and insert their own documents
create policy "documents_select_own" on documents
  for select using (auth.uid() = uploader_id);
create policy "documents_insert_own" on documents
  for insert with check (auth.uid() = uploader_id);

-- Admins can read, update, and manage all documents
create policy "admin_full_access_documents" on documents
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
