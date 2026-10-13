import test from 'node:test'
import assert from 'node:assert/strict'
import { cohortRollNumberKey, getPermittedStudyYears, institutionNameError, isValidRollNumber, normalizeInstitutionName, normalizeRollNumber } from '../src/lib/registrationRules.ts'

test('institution names are trimmed and required with the specified empty-field message', () => {
  assert.equal(normalizeInstitutionName('  Example College  '), 'Example College')
  assert.equal(institutionNameError('   '), 'Please enter your institution name.')
  assert.equal(institutionNameError('A'), 'Institution name must be between 2 and 180 characters.')
  assert.equal(institutionNameError('  Example College  '), null)
})

test('roll numbers are trimmed and accept varied formats up to 100 characters', () => {
  assert.equal(normalizeRollNumber('  24/CS-A  '), '24/CS-A')
  assert.equal(isValidRollNumber(' 24/CS-A '), true)
  assert.equal(isValidRollNumber('   '), false)
  assert.equal(isValidRollNumber('R'.repeat(101)), false)
})

test('study years respect duration, admission cohort, and configured academic-year start', () => {
  const october = new Date(2026, 9, 12)
  assert.deepEqual(getPermittedStudyYears(4, 2024, 7, october), [1, 2, 3])
  assert.deepEqual(getPermittedStudyYears(4, 2025, 11, october), [1])
  assert.deepEqual(getPermittedStudyYears(2, 2022, 1, october), [1, 2])
})

test('study-year options are empty for invalid duration, start month, or cohort', () => {
  assert.deepEqual(getPermittedStudyYears(0, 2024, 1, new Date(2026, 9, 12)), [])
  assert.deepEqual(getPermittedStudyYears(4, 2024, 13, new Date(2026, 9, 12)), [])
  assert.deepEqual(getPermittedStudyYears(4, 2027, 1, new Date(2026, 9, 12)), [])
})

test('roll-number uniqueness scope includes institution and admission cohort', () => {
  assert.equal(cohortRollNumberKey('inst-a', 2024, ' 24/CS-A '), cohortRollNumberKey('inst-a', 2024, '24/cs-a'))
  assert.notEqual(cohortRollNumberKey('inst-a', 2024, 'R-1'), cohortRollNumberKey('inst-a', 2025, 'R-1'))
  assert.notEqual(cohortRollNumberKey('inst-a', 2024, 'R-1'), cohortRollNumberKey('inst-b', 2024, 'R-1'))
})
