-- Migration: 002_add_exporter_confirmed.sql
-- Add exporter_confirmed column to invoices table

alter table invoices
  add column exporter_confirmed boolean not null default false;
