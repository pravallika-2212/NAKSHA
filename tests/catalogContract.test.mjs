import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CATALOG_QUERY_CONTRACT, hasOnlyDemoInstitutions, resolveCatalogRows } from '../src/lib/catalogContract.ts'
import { catalogFailureMessage, classifyCatalogFailure } from '../src/lib/catalogErrors.ts'
import { getPermittedStudyYears } from '../src/lib/registrationRules.ts'
import { getPublicSupabaseConfig } from '../src/lib/supabase.ts'

test('institution query contract selects its public fields and active verified/demo records', () => {
  assert.deepEqual(CATALOG_QUERY_CONTRACT.institutions.columns, [
    'id', 'name', 'is_demo', 'verification_status', 'academic_year_start_month',
  ])
  assert.equal(CATALOG_QUERY_CONTRACT.institutions.status, 'active')
  assert.deepEqual(CATALOG_QUERY_CONTRACT.institutions.verificationStatuses, ['verified', 'demo'])
})

test('course and department query contracts include parent IDs and active status', () => {
  assert.deepEqual(CATALOG_QUERY_CONTRACT.courses.columns, [
    'id', 'institution_id', 'name', 'degree', 'duration_years',
  ])
  assert.equal(CATALOG_QUERY_CONTRACT.courses.institutionIdColumn, 'institution_id')
  assert.equal(CATALOG_QUERY_CONTRACT.courses.status, 'active')
  assert.deepEqual(CATALOG_QUERY_CONTRACT.departments.columns, [
    'id', 'institution_id', 'course_id', 'name',
  ])
  assert.equal(CATALOG_QUERY_CONTRACT.departments.institutionIdColumn, 'institution_id')
  assert.equal(CATALOG_QUERY_CONTRACT.departments.courseIdColumn, 'course_id')
  assert.equal(CATALOG_QUERY_CONTRACT.departments.status, 'active')
})

test('a successful empty result differs from a rejected Supabase query', () => {
  assert.deepEqual(resolveCatalogRows(null, null), [])
  assert.deepEqual(resolveCatalogRows([{ id: 'course-1' }], null), [{ id: 'course-1' }])
  const error = { code: '42501', message: 'permission denied' }
  assert.throws(() => resolveCatalogRows(null, error), caught => caught === error)
})

test('catalog errors distinguish permissions, schema, connectivity, and unknown failures', () => {
  assert.equal(classifyCatalogFailure({ code: '42501', message: 'permission denied' }), 'permission')
  assert.equal(classifyCatalogFailure({ code: '42703', message: 'column does not exist' }), 'schema')
  assert.equal(classifyCatalogFailure(new Error('Failed to fetch')), 'network')
  assert.equal(classifyCatalogFailure({ code: 'XX000', message: 'unexpected error' }), 'unknown')
  assert.match(catalogFailureMessage({ code: '42501', message: 'permission denied' }, 'institutions'), /read access/i)
})

test('demo-only catalogs remain detectable and demo signup protection remains server-side', () => {
  assert.equal(hasOnlyDemoInstitutions([]), false)
  assert.equal(hasOnlyDemoInstitutions([{ is_demo: true }, { is_demo: true }]), true)
  assert.equal(hasOnlyDemoInstitutions([{ is_demo: true }, { is_demo: false }]), false)
  assert.deepEqual(getPermittedStudyYears(3, 2024, 1, new Date(2026, 9, 12)), [1, 2, 3])

  const migration = readFileSync(new URL('../supabase/migrations/202610120002_catalog_metadata.sql', import.meta.url), 'utf8')
  assert.match(migration, /prevent_demo_student_signup/)
  assert.match(migration, /i\.is_demo/)
})

test('Supabase configuration accepts only the public URL and anon key and requires both', () => {
  assert.equal(getPublicSupabaseConfig(undefined), null)
  assert.equal(getPublicSupabaseConfig({ VITE_SUPABASE_URL: 'https://project.example' }), null)
  assert.equal(getPublicSupabaseConfig({ VITE_SUPABASE_ANON_KEY: 'public-key' }), null)
  assert.deepEqual(getPublicSupabaseConfig({
    VITE_SUPABASE_URL: ' https://project.example/ ',
    VITE_SUPABASE_ANON_KEY: ' public-key ',
  }), { url: 'https://project.example/', key: 'public-key' })

  const clientSource = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8')
  assert.match(clientSource, /VITE_SUPABASE_URL/)
  assert.match(clientSource, /VITE_SUPABASE_ANON_KEY/)
  assert.doesNotMatch(clientSource, /SERVICE_ROLE|service_role|secret_key/i)
})
