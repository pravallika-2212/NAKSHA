import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, validateImportRow } from '../src/lib/csvImport.ts'

test('CSV parser handles BOM, CRLF, and escaped quotes', () => {
  const result = parseCsv('\uFEFFstudent_id,feedback_text\r\nS-1,"Helpful, said ""thanks"""\r\n')
  assert.equal(result.rows[0].student_id, 'S-1')
  assert.equal(result.rows[0].feedback_text, 'Helpful, said "thanks"')
})

test('CSV parser rejects duplicate headers, ragged rows, and unclosed quotes', () => {
  assert.throws(() => parseCsv('a,A\n1,2'))
  assert.throws(() => parseCsv('a,b\n1'))
  assert.throws(() => parseCsv('a\n"unfinished'))
})

test('attendance validation checks required columns, bounds, and dates', () => {
  const invalid = validateImportRow('attendance', { roll_number:'S1', admission_year:'2024', period_start:'2026-10-04', period_end:'2026-10-01', classes_attended:'8', classes_held:'6' })
  assert.ok(invalid.some(x => x.includes('period_end must not be before')))
  assert.ok(invalid.some(x => x.includes('classes_attended cannot exceed')))
  assert.deepEqual(validateImportRow('attendance', { roll_number:'S1', admission_year:'2024', period_start:'2026-10-01', period_end:'2026-10-04', classes_attended:'3', classes_held:'6' }), [])
})

test('blank optional source fields remain missing and do not fail validation', () => {
  assert.deepEqual(validateImportRow('engagement', { roll_number:'S1',admission_year:'2024',metric_name:'sessions',metric_value:'4',unit:'sessions',source_name:'',period_start:'2026-10-01',period_end:'2026-10-07' }), [])
})

test('assessment score and maximum must be provided together',()=>{
 const errors=validateImportRow('skills',{roll_number:'S1',admission_year:'2024',skill_name:'SQL',proficiency:'75',assessed_at:'2026-10-05',assessment_name:'Skills Check',assessment_score:'8',assessment_max_score:''})
 assert.ok(errors.includes('assessment_name, assessment_score, and assessment_max_score must be supplied together'))
 assert.deepEqual(validateImportRow('skills',{roll_number:'S1',admission_year:'2024',skill_name:'SQL',proficiency:'75',assessed_at:'2026-10-05',assessment_name:'Skills Check',assessment_score:'8',assessment_max_score:'10'}),[])
})
