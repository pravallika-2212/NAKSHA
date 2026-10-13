import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('registration uses manual institution text and sends names rather than catalog UUIDs', () => {
  const source = readFileSync(new URL('../src/pages/AuthPages.tsx', import.meta.url), 'utf8')
  assert.match(source, /label="Institution Name"/)
  assert.match(source, /Enter your college or institution name/)
  assert.doesNotMatch(source, /getActiveInstitutions|institution_id: institutionId|<select value=\{institutionId\}/)
  assert.match(source, /institution_name: institutionName/)
  assert.match(source, /program_name: programName/)
  assert.match(source, /department_name: departmentName/)
  assert.match(source, /manual_institution_registration_ready/)
})

test('manual signup migration stores unverified names in a private request, not the catalog', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202610120007_manual_institution_registration.sql', import.meta.url), 'utf8')
  assert.match(migration, /create table if not exists public\.student_registration_requests/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /using \(user_id = \(select auth\.uid\(\)\)\)/)
  assert.match(migration, /revoke all on public\.student_registration_requests from public, anon, authenticated/)
  assert.match(migration, /insert into public\.student_registration_requests/)
  assert.match(migration, /exists \(\s*select 1 from public\.institutions i\s*where i\.is_demo/)
  assert.doesNotMatch(migration, /insert into public\.institutions/i)
  assert.match(migration, /profiles_validate_catalog/)
  assert.match(migration, /request_status = 'pending'/)
})
