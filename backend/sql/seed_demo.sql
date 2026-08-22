-- Demo banks + invitation codes for the V2 hackathon flow.
-- Run after 003_bank_owned_v2.sql.
-- Then sign up (invitation codes bind the user to the bank; do not type a bank name):
--   Admin: role=admin, no code
--   Bank SBI: role=bank, invite SBI-BANK-DEMO
--   Bank HDFC: role=bank, invite HDFC-BANK-DEMO
--   Exporter A1: role=exporter, invite SBI-EXP-A1
--   Exporter B1: role=exporter, invite HDFC-EXP-B1
--
-- Isolation check: A1 USD invoice must only see SBI pools, never HDFC pools.

insert into banks (code, name, status) values
  ('SBI-GIFT', 'State Bank of India — GIFT City', 'active'),
  ('HDFC-GIFT', 'HDFC Bank — GIFT City', 'active')
on conflict (code) do update set name = excluded.name, status = 'active', updated_at = now();

insert into invitation_codes (bank_id, code, kind, status)
select id, 'SBI-BANK-DEMO', 'bank_user', 'active' from banks where code = 'SBI-GIFT'
on conflict (code) do nothing;

insert into invitation_codes (bank_id, code, kind, status)
select id, 'HDFC-BANK-DEMO', 'bank_user', 'active' from banks where code = 'HDFC-GIFT'
on conflict (code) do nothing;

insert into invitation_codes (bank_id, code, kind, status)
select id, 'SBI-EXP-A1', 'exporter', 'active' from banks where code = 'SBI-GIFT'
on conflict (code) do nothing;

insert into invitation_codes (bank_id, code, kind, status)
select id, 'SBI-EXP-A2', 'exporter', 'active' from banks where code = 'SBI-GIFT'
on conflict (code) do nothing;

insert into invitation_codes (bank_id, code, kind, status)
select id, 'HDFC-EXP-B1', 'exporter', 'active' from banks where code = 'HDFC-GIFT'
on conflict (code) do nothing;

insert into invitation_codes (bank_id, code, kind, status)
select id, 'HDFC-EXP-B2', 'exporter', 'active' from banks where code = 'HDFC-GIFT'
on conflict (code) do nothing;
