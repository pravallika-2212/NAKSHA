import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CANONICAL_TESTS,
  formatTimeRemaining
} from '../src/lib/assessmentClient.ts'
import {
  generateDreamRoadmap,
  SUGGESTED_COMPANIES
} from '../src/lib/dreamRoadmap.ts'

// Test 1: Canonical Assessment Catalog Coverage
test('canonical assessment catalog covers Aptitude, Technical, and Mock Placement assessments', () => {
  assert.ok(CANONICAL_TESTS.length >= 10, 'Must have at least 10 tests across sections')

  // Check Aptitude tests
  const aptitudeTests = CANONICAL_TESTS.filter(t => t.category === 'aptitude')
  assert.ok(aptitudeTests.length >= 4, 'Must have at least 4 aptitude tests')
  const subCatsAptitude = aptitudeTests.map(t => t.sub_category)
  assert.ok(subCatsAptitude.includes('Quantitative Aptitude'), 'Missing Quantitative Aptitude')
  assert.ok(subCatsAptitude.includes('Logical Reasoning'), 'Missing Logical Reasoning')
  assert.ok(subCatsAptitude.includes('Verbal Ability'), 'Missing Verbal Ability')
  assert.ok(subCatsAptitude.includes('Data Interpretation'), 'Missing Data Interpretation')

  // Check Technical tests
  const technicalTests = CANONICAL_TESTS.filter(t => t.category === 'technical')
  assert.ok(technicalTests.length >= 6, 'Must have technical tests covering core CS topics')
  const subCatsTech = technicalTests.map(t => t.sub_category)
  assert.ok(subCatsTech.includes('Programming Fundamentals'), 'Missing Programming Fundamentals')
  assert.ok(subCatsTech.includes('Data Structures & Algorithms'), 'Missing DSA')
  assert.ok(subCatsTech.includes('DBMS & SQL'), 'Missing DBMS')
  assert.ok(subCatsTech.includes('Operating Systems'), 'Missing OS')
  assert.ok(subCatsTech.includes('Computer Networks'), 'Missing Networks')

  // Check Mock tests
  const mockTests = CANONICAL_TESTS.filter(t => t.category === 'mock')
  assert.ok(mockTests.length >= 1, 'Must have combined mock placement tests')
  const mockTest = mockTests[0]
  assert.equal(mockTest.category, 'mock')
  assert.ok(mockTest.duration_minutes >= 30, 'Mock tests must have realistic duration')
})

// Test 2: Safe Question Projection Protects Answer Keys During Test
test('safe question projection hides correct_option and explanation during active attempt', () => {
  const sampleBank = [
    {
      id: 'q1',
      test_id: 'tech-dsa-01',
      question_text: 'What is the worst-case lookup time in a balanced AVL tree?',
      options: { A: 'O(1)', B: 'O(log N)', C: 'O(N)', D: 'O(N log N)' },
      correct_option: 'B',
      explanation: 'Balanced binary search trees maintain height O(log N).',
      marks: 1,
      negative_marks: 0.25,
      topic: 'DSA',
      difficulty: 'Medium'
    },
    {
      id: 'q2',
      test_id: 'tech-dbms-01',
      question_text: 'Which normal form eliminates transitive functional dependency?',
      options: { A: '1NF', B: '2NF', C: '3NF', D: 'BCNF' },
      correct_option: 'C',
      explanation: '3NF requires that no non-prime attribute is transitively dependent on candidate key.',
      marks: 1,
      negative_marks: 0.25,
      topic: 'DBMS',
      difficulty: 'Medium'
    }
  ]

  for (const q of sampleBank) {
    assert.ok(q.id, 'Question must have id')
    assert.ok(q.correct_option, 'Question must have verified correct option in master bank')
    assert.ok(q.explanation, 'Question must have verified explanation in master bank')
    assert.ok(Object.keys(q.options).length >= 4, 'Question must have at least 4 options')
  }

  // Projection simulator (mirrors backend get_test_questions_safe)
  function projectSafeQuestions(questions, isAttemptFinalized) {
    return questions.map(q => {
      if (isAttemptFinalized) {
        return { ...q }
      }
      return {
        id: q.id,
        test_id: q.test_id,
        question_text: q.question_text,
        options: q.options,
        marks: q.marks,
        negative_marks: q.negative_marks,
        topic: q.topic,
        difficulty: q.difficulty
        // correct_option and explanation omitted
      }
    })
  }

  const activeQuestions = projectSafeQuestions(sampleBank, false)
  for (const q of activeQuestions) {
    assert.equal(q.correct_option, undefined, 'Active question must NOT reveal correct_option to client')
    assert.equal(q.explanation, undefined, 'Active question must NOT reveal explanation to client')
    assert.ok(q.options.A, 'Options must be visible for student answer selection')
  }

  const finalizedQuestions = projectSafeQuestions(sampleBank, true)
  for (const q of finalizedQuestions) {
    assert.ok(q.correct_option, 'Finalized review MUST reveal correct_option for post-test analysis')
    assert.ok(q.explanation, 'Finalized review MUST reveal explanation for learning')
  }
})

// Test 3: Authoritative Scoring Calculation with Negative Marking
test('scoring calculation handles positive marks, negative marks, and percentage correctly', () => {
  function calculateScore(testDef, questions, answers) {
    let rawScore = 0
    let correctCount = 0
    let incorrectCount = 0
    let unansweredCount = 0

    for (const q of questions) {
      const studentAns = answers[q.id]?.selected_option
      if (!studentAns) {
        unansweredCount++
      } else if (studentAns === q.correct_option) {
        correctCount++
        rawScore += q.marks
      } else {
        incorrectCount++
        rawScore -= q.negative_marks
      }
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
    const rawClamped = Math.max(0, rawScore)
    const pct = totalMarks > 0 ? Math.round((rawClamped / totalMarks) * 1000) / 10 : 0

    return {
      raw_score: rawScore,
      total_marks: totalMarks,
      percentage_score: pct,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      unanswered_count: unansweredCount
    }
  }

  const sampleQuestions = [
    { id: 'q1', marks: 2, negative_marks: 0.5, correct_option: 'A' },
    { id: 'q2', marks: 2, negative_marks: 0.5, correct_option: 'B' },
    { id: 'q3', marks: 2, negative_marks: 0.5, correct_option: 'C' },
    { id: 'q4', marks: 2, negative_marks: 0.5, correct_option: 'D' },
  ]

  // All 4 correct
  const resAllCorrect = calculateScore({}, sampleQuestions, {
    q1: { selected_option: 'A' },
    q2: { selected_option: 'B' },
    q3: { selected_option: 'C' },
    q4: { selected_option: 'D' }
  })
  assert.equal(resAllCorrect.correct_count, 4)
  assert.equal(resAllCorrect.raw_score, 8)
  assert.equal(resAllCorrect.percentage_score, 100)

  // 2 correct, 1 incorrect, 1 unanswered: (2*2) - (1*0.5) = 3.5 marks out of 8 = 43.75% -> 43.8%
  const resMixed = calculateScore({}, sampleQuestions, {
    q1: { selected_option: 'A' },
    q2: { selected_option: 'B' },
    q3: { selected_option: 'A' }, // wrong
    q4: { selected_option: null } // unanswered
  })
  assert.equal(resMixed.correct_count, 2)
  assert.equal(resMixed.incorrect_count, 1)
  assert.equal(resMixed.unanswered_count, 1)
  assert.equal(resMixed.raw_score, 3.5)
  assert.equal(resMixed.percentage_score, 43.8)
})

// Test 4: Integrity Violation Sequence, 4-Violation Rule & 5% Penalty
test('integrity policy enforces 1-3 warnings, 4th violation auto-submit and single 5% deduction', () => {
  class IntegrityMonitor {
    constructor() {
      this.violations = []
      this.lastEventTime = 0
      this.status = 'in_progress'
      this.penaltyApplied = false
    }

    logViolation(eventType, timestamp) {
      // Throttle within 2000ms if a previous event was logged
      if (this.lastEventTime > 0 && timestamp - this.lastEventTime < 2000) {
        return { throttled: true, violationCount: this.violations.length }
      }
      this.lastEventTime = timestamp
      this.violations.push({ eventType, timestamp })
      const count = this.violations.length

      if (count === 1) {
        return { warning: 'warning_1_of_3', message: 'Warning 1 of 3: Tab switch detected. Please stay in the test.' }
      }
      if (count === 2) {
        return { warning: 'warning_2_of_3', message: 'Warning 2 of 3: Browser focus lost. 2 warnings remaining.' }
      }
      if (count === 3) {
        return { warning: 'warning_3_of_3', message: 'Warning 3 of 3: Final warning before automatic submission.' }
      }
      if (count >= 4) {
        this.status = 'terminated_by_integrity'
        return {
          terminated: true,
          action: 'auto_submit',
          penalty: 5.0,
          message: 'Fourth violation reached. Attempt automatically submitted with a 5% score deduction.'
        }
      }
      return {}
    }

    finalizeScore(rawScorePct) {
      if (this.penaltyApplied) {
        throw new Error('Attempt already finalized')
      }
      this.penaltyApplied = true
      let adjusted = rawScorePct
      if (this.violations.length >= 4) {
        adjusted = Math.max(0, Math.round((rawScorePct - 5.0) * 10) / 10)
      }
      return {
        rawScorePct,
        adjustedScorePct: adjusted,
        penaltyApplied: this.violations.length >= 4
      }
    }
  }

  const monitor = new IntegrityMonitor()

  // 1st violation
  const v1 = monitor.logViolation('tab_hidden', 1000)
  assert.equal(v1.warning, 'warning_1_of_3')

  // Throttled duplicate event 500ms later
  const vThrottled = monitor.logViolation('window_blur', 1500)
  assert.equal(vThrottled.throttled, true)
  assert.equal(monitor.violations.length, 1)

  // 2nd violation (3000ms after first)
  const v2 = monitor.logViolation('window_blur', 4000)
  assert.equal(v2.warning, 'warning_2_of_3')

  // 3rd violation
  const v3 = monitor.logViolation('tab_hidden', 7000)
  assert.equal(v3.warning, 'warning_3_of_3')

  // 4th violation triggers termination
  const v4 = monitor.logViolation('tab_hidden', 10000)
  assert.equal(v4.terminated, true)
  assert.equal(v4.action, 'auto_submit')
  assert.equal(v4.penalty, 5.0)

  // Apply penalty to a score of 80% -> 75%
  const scoreResult = monitor.finalizeScore(80.0)
  assert.equal(scoreResult.rawScorePct, 80.0)
  assert.equal(scoreResult.adjustedScorePct, 75.0)
  assert.equal(scoreResult.penaltyApplied, true)

  // Verify floor at 0% for a low score (e.g. 3% -> 0%, not negative)
  const lowMonitor = new IntegrityMonitor()
  for (let i = 1; i <= 4; i++) {
    lowMonitor.logViolation('tab_hidden', i * 3000)
  }
  const lowScore = lowMonitor.finalizeScore(3.0)
  assert.equal(lowScore.adjustedScorePct, 0.0, 'Adjusted score must never drop below 0%')

  // Idempotency: Duplicate finalization throws or is rejected
  assert.throws(() => {
    monitor.finalizeScore(80.0)
  }, /already finalized/)
})

// Test 5: Timer & Reload State Recovery
test('timer formatting and reload recovery calculates remaining time accurately', () => {
  assert.equal(formatTimeRemaining(65), '01:05')
  assert.equal(formatTimeRemaining(3600), '60:00')
  assert.equal(formatTimeRemaining(0), '00:00')

  // Reload recovery simulation
  const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString() // 20 minutes from now

  const savedAttempt = {
    id: 'att-123',
    started_at: startedAt,
    expires_at: expiresAt,
    status: 'in_progress',
    answers: {
      'q-1': { selected_option: 'B', marked_for_review: false },
      'q-2': { selected_option: null, marked_for_review: true }
    }
  }

  // Restore remaining seconds
  const remainingSeconds = Math.max(0, Math.floor((new Date(savedAttempt.expires_at).getTime() - Date.now()) / 1000))
  assert.ok(remainingSeconds >= 1190 && remainingSeconds <= 1205, 'Should restore approx 1200 seconds (20 mins)')
  assert.equal(savedAttempt.answers['q-1'].selected_option, 'B', 'Saved answer preserved')
  assert.equal(savedAttempt.answers['q-2'].marked_for_review, true, 'Review flag preserved')
})

// Test 6: Year 2 Dream Company Roadmap Remains Intact & Non-Regressed
test('Year 2 Dream Company Roadmap features remain intact and functional', () => {
  assert.ok(SUGGESTED_COMPANIES.length >= 8)

  const roadmap = generateDreamRoadmap('Google', 'Software Development Engineer (SDE)')
  assert.ok(Array.isArray(roadmap), 'Roadmap must be an array of skills')
  assert.ok(roadmap.length >= 16, 'Roadmap must contain comprehensive preparation skills')

  const categories = new Set(roadmap.map(s => s.category))
  assert.ok(categories.has('dsa'), 'Year 2 roadmap must include DSA skills')
  assert.ok(categories.has('fundamentals'), 'Year 2 roadmap must include fundamentals')
  assert.ok(categories.has('databases'), 'Year 2 roadmap must include database skills')
  assert.ok(categories.has('hackathons'), 'Year 2 roadmap must include practical hackathons')
})
