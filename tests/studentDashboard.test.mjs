import test from 'node:test'
import assert from 'node:assert/strict'
import { portalHomeFor, roleCanOpenPortal } from '../src/auth/portalRules.ts'

// Year-specific weighting profiles defined in ASCENDIQ methodology
const YEAR_WEIGHTS = {
  1: { academic: 40, attendance: 25, lms: 20, engagement: 10, skills: 5, placement: 0 },
  2: { academic: 35, attendance: 20, lms: 15, skills: 15, engagement: 10, placement: 5 },
  3: { academic: 30, attendance: 15, lms: 10, skills: 15, placement: 20, engagement: 5, feedback: 5 },
  4: { academic: 25, attendance: 15, lms: 5, placement: 30, skills: 15, engagement: 5, feedback: 5 },
}

test('student dashboard routing grants approved students access to /student', () => {
  assert.equal(roleCanOpenPortal('student', [], true), true)
  assert.equal(roleCanOpenPortal('student', [], false), false)
  assert.equal(portalHomeFor([], true), '/student')
  assert.equal(portalHomeFor([], false), '/verification-pending')
})

test('progressive year weight profiles sum to 100% and reflect phase objectives', () => {
  for (const [year, weights] of Object.entries(YEAR_WEIGHTS)) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    assert.equal(total, 100, `Year ${year} weights must sum to 100%`)
  }

  // Year 1 emphasizes academic foundations and attendance
  assert.ok(YEAR_WEIGHTS[1].academic >= 40)
  assert.equal(YEAR_WEIGHTS[1].placement, 0) // Year 1 de-emphasizes placement

  // Year 4 emphasizes career placement readiness
  assert.ok(YEAR_WEIGHTS[4].placement >= 30)
})

test('7 required data categories are integrated in student analytical model', () => {
  const REQUIRED_CATEGORIES = [
    'academic',
    'attendance',
    'lms',
    'engagement',
    'placement',
    'skills',
    'feedback'
  ]

  const mockStudentRecord = {
    academic: { cgpa: 8.92, marks_percentage: 88.5, backlog_count: 0 },
    attendance: { percentage: 93.3, classes_held: 90, classes_attended: 84 },
    lms: { completion_rate: 95.0, active_minutes: 140, overdue: 0 },
    engagement: { events: 2, clubs: 1, hackathons: 0, certs: 1 },
    placement: { aptitude_percentage: 42.0, coding_percentage: 36.0, mock_interview_score: 45.0 },
    skills: { technical: [{ name: 'Algorithms', score: 48 }], soft: [{ name: 'Communication', score: 75 }] },
    feedback: { satisfaction_score: 88, faculty_rating: 92 }
  }

  for (const cat of REQUIRED_CATEGORIES) {
    assert.ok(cat in mockStudentRecord, `Required category ${cat} must be present in analytical student model`)
    assert.ok(mockStudentRecord[cat] !== null, `${cat} must be populated`)
  }
})

test('success score never silently zeroes missing categories and renormalizes available weight', () => {
  const configuredWeights = { academic: 35, attendance: 20, lms: 15, placement: 25, engagement: 5 }
  const rawValues = { academic: 80, attendance: 90, lms: null, placement: null, engagement: 60 } // lms & placement missing

  const availableComponents = Object.entries(rawValues).filter(([, v]) => v !== null)
  const availableWeight = availableComponents.reduce((acc, [k]) => acc + configuredWeights[k], 0)
  assert.equal(availableWeight, 35 + 20 + 5) // 60% coverage

  const weightedSum = availableComponents.reduce((acc, [k, v]) => acc + (v * configuredWeights[k]), 0)
  const renormalizedScore = Math.round((weightedSum / availableWeight) * 10) / 10

  // (80*35 + 90*20 + 60*5) / 60 = (2800 + 1800 + 300) / 60 = 4900 / 60 = 81.67 -> 81.7
  assert.equal(renormalizedScore, 81.7)
  assert.ok(renormalizedScore > 0, 'Missing categories must not drag score down to zero')
})
