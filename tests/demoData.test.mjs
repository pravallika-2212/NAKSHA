import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCsv, validateImportRow } from '../src/lib/csvImport.ts'

test('all synthetic CSV examples match the cohort-aware templates', () => {
  for (const category of ['academic','attendance','lms_activity','engagement','skills','placement','feedback']) {
    const { headers, rows } = parseCsv(readFileSync(`public/demo-data/${category}.csv`, 'utf8'))
    assert.ok(headers.includes('roll_number'), `${category} includes roll_number`)
    assert.ok(headers.includes('admission_year'), `${category} includes admission_year`)
    assert.deepEqual(validateImportRow(category, rows[0]), [], `${category} sample validates`)
    assert.match(rows[0].roll_number, /^DEMO-/)
  }
})

test('imports require both cohort identifiers and flexible bounded roll numbers', () => {
  const errors = validateImportRow('attendance', { roll_number:'R'.repeat(101),admission_year:'1800',period_start:'2026-10-01',period_end:'2026-10-02',classes_attended:'1',classes_held:'2' })
  assert.ok(errors.some(error => error.includes('100 characters or fewer')))
  assert.ok(errors.some(error => error.includes('valid year')))
  assert.ok(validateImportRow('attendance', { roll_number:'R-1',period_start:'2026-10-01',period_end:'2026-10-02',classes_attended:'1',classes_held:'2' }).includes('admission_year is required'))
})
