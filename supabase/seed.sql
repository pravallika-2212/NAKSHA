-- Synthetic catalog rows for safely previewing the registration dropdowns.
-- These are fictional examples, not real institutions, official codes, or offerings.
-- Demo institutions are selectable for UI testing but blocked by the signup trigger.
-- Idempotent and insert-only: stable IDs and ON CONFLICT DO NOTHING never
-- overwrite or delete existing catalog records. Apply migration 006 first.

begin;

insert into public.institutions (
  id, name, code, institution_type, state, district, status, is_demo,
  verification_status, academic_year_start_month, catalog_source_url, catalog_verified_at
)
values (
  'a1100000-0000-4000-8000-000000000001',
  'DEMO ONLY - AscendIQ Sample Institute',
  null,
  'other',
  null,
  null,
  'active',
  true,
  'demo',
  1,
  null,
  null
)
on conflict (id) do nothing;

insert into public.institution_courses (id, institution_id, name, duration_years, status)
values
  ('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','DEMO ONLY - Sample Program A',4,'active'),
  ('a1200000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000001','DEMO ONLY - Sample Program B',3,'active')
on conflict (id) do nothing;

insert into public.institution_departments (id, institution_id, course_id, name, status)
values
  ('a1300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','DEMO ONLY - Sample Department A1','active'),
  ('a1300000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','DEMO ONLY - Sample Department A2','active'),
  ('a1300000-0000-4000-8000-000000000003','a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002','DEMO ONLY - Sample Department B1','active')
on conflict (id) do nothing;

commit;
