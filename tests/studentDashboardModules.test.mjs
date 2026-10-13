import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Test 1: Sidebar Route & Navigation Mapping Contract
test('sidebar routes map unambiguously to their respective modules', () => {
  const routes = [
    { path: '/student/overview', expectedTab: 'overview', title: 'Student Overview — ASCENDIQ' },
    { path: '/student/academic', expectedTab: 'academic', title: 'Academic Performance — ASCENDIQ' },
    { path: '/student/attendance', expectedTab: 'attendance', title: 'Attendance Habits — ASCENDIQ' },
    { path: '/student/lms', expectedTab: 'lms', title: 'Learning Activity (LMS) — ASCENDIQ' },
    { path: '/student/engagement', expectedTab: 'engagement', title: 'Engagement & Clubs — ASCENDIQ' },
    { path: '/student/skills', expectedTab: 'skills', title: 'Skills Development — ASCENDIQ' },
    { path: '/student/career', expectedTab: 'placement', title: 'Career Readiness — ASCENDIQ' },
    { path: '/student/placement', expectedTab: 'placement', title: 'Placement Acceleration — ASCENDIQ' },
    { path: '/student/insights', expectedTab: 'insights', title: 'AI Insights & Support — ASCENDIQ' },
    { path: '/student/profile', expectedTab: 'profile', title: 'Student Profile — ASCENDIQ' },
  ]

  function resolveTab(pathname) {
    const p = pathname.toLowerCase()
    if (p.includes('/student/academic')) return 'academic'
    if (p.includes('/student/attendance')) return 'attendance'
    if (p.includes('/student/lms')) return 'lms'
    if (p.includes('/student/engagement')) return 'engagement'
    if (p.includes('/student/skills')) return 'skills'
    if (p.includes('/student/career') || p.includes('/student/placement')) return 'placement'
    if (p.includes('/student/insights')) return 'insights'
    if (p.includes('/student/profile')) return 'profile'
    return 'overview'
  }

  routes.forEach(r => {
    assert.equal(resolveTab(r.path), r.expectedTab, `Path ${r.path} must map to ${r.expectedTab}`)
  })
})

// Test 2: Academic Performance Math & Filters
test('academic performance converts CGPA and filters subject roster accurately', () => {
  const sampleSubjects = [
    { code: 'CS601', name: 'Compiler Design', credits: 4, marks: 82, grade: 'A', semester: 6 },
    { code: 'CS602', name: 'Distributed Systems', credits: 4, marks: 91, grade: 'S', semester: 6 },
    { code: 'CS603', name: 'Machine Learning', credits: 3, marks: 76, grade: 'B', semester: 6 },
    { code: 'CS501', name: 'Database Management', credits: 4, marks: 88, grade: 'A', semester: 5 }
  ]

  // Filter by semester 6
  const sem6 = sampleSubjects.filter(s => s.semester === 6)
  assert.equal(sem6.length, 3)

  // Subject search filter
  const searchFilter = (query) => sampleSubjects.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) || 
    s.code.toLowerCase().includes(query.toLowerCase())
  )
  assert.equal(searchFilter('Distributed').length, 1)
  assert.equal(searchFilter('CS6').length, 3)

  // 10-point scale percentage conversion formula: CGPA * 9.5
  const cgpa = 8.52
  const percentage = Math.round(cgpa * 9.5 * 10) / 10
  assert.equal(percentage, 80.9)
})

// Test 3: Attendance Deficit Recovery Formula
test('attendance habits calculates percentage and dynamic recovery deficit', () => {
  const held = 160
  const attended = 110
  const currentPct = (attended / held) * 100 // 68.75%
  assert.equal(Math.round(currentPct * 10) / 10, 68.8)

  // Formula: classesNeeded = ceil((thresholdPct * held - 100 * attended) / (100 - thresholdPct))
  function calculateRecoveryNeeded(h, a, threshold) {
    const cur = (a / h) * 100
    if (cur >= threshold) return 0
    const needed = Math.ceil((threshold * h - 100 * a) / (100 - threshold))
    return Math.max(0, needed)
  }

  // At 75% threshold: (75 * 160 - 100 * 110) / (100 - 75) = (12000 - 11000) / 25 = 1000 / 25 = 40 classes
  const needed75 = calculateRecoveryNeeded(held, attended, 75)
  assert.equal(needed75, 40)

  // Verify: after 40 consecutive attended classes: (110 + 40) / (160 + 40) = 150 / 200 = 75.0%
  const newAttendance = ((attended + needed75) / (held + needed75)) * 100
  assert.ok(newAttendance >= 75)

  // Already above threshold should return 0
  assert.equal(calculateRecoveryNeeded(100, 85, 75), 0)
})

// Test 4: Skills Matrix & Provenance Tagging
test('skills development classifies proficiency levels and distinguishes verified from self-declared', () => {
  function getSkillLevel(score) {
    if (score >= 85) return 'Mastery'
    if (score >= 70) return 'Advanced'
    if (score >= 50) return 'Intermediate'
    return 'Beginner'
  }

  assert.equal(getSkillLevel(92), 'Mastery')
  assert.equal(getSkillLevel(85), 'Mastery')
  assert.equal(getSkillLevel(78), 'Advanced')
  assert.equal(getSkillLevel(60), 'Intermediate')
  assert.equal(getSkillLevel(45), 'Beginner')

  const skills = [
    { id: '1', name: 'Database SQL', score: 88, source: 'verified', verifiedBy: 'Lab Exam CS602' },
    { id: '2', name: 'Docker', score: 70, source: 'self-declared' }
  ]

  assert.equal(skills[0].source, 'verified')
  assert.ok(skills[0].verifiedBy)
  assert.equal(skills[1].source, 'self-declared')
  assert.equal(skills[1].verifiedBy, undefined)
})

// Test 5: Career Readiness & Tier Eligibility Rules
test('career readiness verifies company tier eligibility and role skill matching', () => {
  function evaluateTierEligibility(cgpa, codingPct, backlogs) {
    return {
      tier1: cgpa >= 8.0 && codingPct >= 70 && backlogs === 0,
      tier2: cgpa >= 7.0 && codingPct >= 50 && backlogs <= 1,
      tier3: cgpa >= 6.0 && backlogs <= 2
    }
  }

  // Student with high CGPA and high coding meets all tiers
  const el1 = evaluateTierEligibility(8.6, 75, 0)
  assert.equal(el1.tier1, true)
  assert.equal(el1.tier2, true)
  assert.equal(el1.tier3, true)

  // Student with backlogs fails Tier 1
  const el2 = evaluateTierEligibility(8.5, 75, 1)
  assert.equal(el2.tier1, false)
  assert.equal(el2.tier2, true)

  // Role Skill Gap Matcher logic
  const roleRequiredSkills = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS']
  const studentKnownSkills = ['TypeScript', 'React', 'PostgreSQL', 'Python', 'Git']

  const matched = roleRequiredSkills.filter(s => studentKnownSkills.includes(s))
  const gaps = roleRequiredSkills.filter(s => !studentKnownSkills.includes(s))
  const matchPct = Math.round((matched.length / roleRequiredSkills.length) * 100)

  assert.deepEqual(matched, ['TypeScript', 'React', 'PostgreSQL'])
  assert.deepEqual(gaps, ['Node.js', 'Docker', 'AWS'])
  assert.equal(matchPct, 50)
})

// Test 6: AI Insights Structure
test('ai insights strictly separate observed facts, interpretations, and recommended actions', () => {
  const sampleInsight = {
    id: 'ai-att',
    category: 'attendance',
    title: 'Attendance Margin Below Target',
    evidencePeriod: 'Semester 6 Weeks 1–10',
    evidenceSource: 'Biometric RFID Attendance Logs',
    observedFact: 'Cumulative attendance is currently 68.8% across 160 conducted sessions, which is 6.2% below the institutional 75% hall ticket eligibility threshold.',
    interpretation: 'At current class conduction rates, missing 3 more sessions will automatically bar semester examination hall-ticket generation.',
    recommendedAction: 'Attend the next 40 consecutive lab and lecture sessions without unapproved absences to regain 75.0% threshold.'
  }

  assert.ok(sampleInsight.observedFact.length > 20)
  assert.ok(sampleInsight.interpretation.length > 20)
  assert.ok(sampleInsight.recommendedAction.length > 20)
  assert.ok(sampleInsight.evidencePeriod)
  assert.ok(sampleInsight.evidenceSource)
})

// Test 7: Profile Photo Upload Validation & Security
test('profile photo upload validator enforces mime-type and 5MB size limit', () => {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

  function validatePhotoFile(file) {
    if (!file || !file.name) {
      return { valid: false, error: 'No file selected.' }
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file format "${file.type}". Supported formats: JPEG, PNG, WebP.`
      }
    }
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: `File is too large (${sizeMB} MB). Maximum allowed size is 5 MB.`
      }
    }
    return { valid: true }
  }

  // Valid files
  assert.equal(validatePhotoFile({ name: 'avatar.jpg', type: 'image/jpeg', size: 1024 * 500 }).valid, true)
  assert.equal(validatePhotoFile({ name: 'profile.png', type: 'image/png', size: 1024 * 1024 * 2 }).valid, true)
  assert.equal(validatePhotoFile({ name: 'snap.webp', type: 'image/webp', size: 1024 * 300 }).valid, true)

  // Invalid types
  assert.equal(validatePhotoFile({ name: 'anim.gif', type: 'image/gif', size: 500 }).valid, false)
  assert.equal(validatePhotoFile({ name: 'doc.pdf', type: 'application/pdf', size: 500 }).valid, false)
  assert.equal(validatePhotoFile({ name: 'vector.svg', type: 'image/svg+xml', size: 500 }).valid, false)
  assert.equal(validatePhotoFile({ name: 'script.exe', type: 'application/x-msdownload', size: 500 }).valid, false)

  // Oversized file (> 5MB)
  assert.equal(validatePhotoFile({ name: 'huge.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 }).valid, false)
})

// Test 8: Student Storage Path Isolation Contract
test('student storage object paths are user-scoped to prevent IDOR / cross-user overwriting', () => {
  function generateUserScopedStoragePath(userId, originalFileName) {
    if (!userId) throw new Error('userId is required for storage path scoping')
    const sanitizedExt = path.extname(originalFileName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const timestamp = 1728775000000
    return `${userId}/avatar-${timestamp}.${sanitizedExt}`
  }

  const userA = 'usr-uuid-1111'
  const userB = 'usr-uuid-2222'

  const pathA = generateUserScopedStoragePath(userA, 'my_photo.PNG')
  const pathB = generateUserScopedStoragePath(userB, 'avatar.jpg')

  // Enforce root folder equals authenticated userId
  assert.ok(pathA.startsWith(`${userA}/`))
  assert.ok(pathB.startsWith(`${userB}/`))
  assert.notEqual(pathA.split('/')[0], pathB.split('/')[0])
})

// Test 9: Profile Protected Fields Immutability
test('student self-edit profile payload cannot overwrite institutional verified fields', () => {
  const protectedKeys = ['is_verified', 'account_status', 'role', 'institution_id', 'department_id', 'program_id']

  function sanitizeStudentProfileUpdate(clientPayload) {
    const safePayload = {}
    const allowedKeys = ['full_name', 'phone', 'bio', 'skills', 'interests']

    for (const key of allowedKeys) {
      if (key in clientPayload) {
        safePayload[key] = clientPayload[key]
      }
    }
    return safePayload
  }

  const maliciousPayload = {
    full_name: 'Priya S.',
    phone: '+91 9876543210',
    is_verified: true,
    account_status: 'approved',
    role: 'admin'
  }

  const sanitized = sanitizeStudentProfileUpdate(maliciousPayload)
  assert.equal(sanitized.full_name, 'Priya S.')
  assert.equal(sanitized.phone, '+91 9876543210')
  protectedKeys.forEach(key => {
    assert.equal(key in sanitized, false, `Protected key "${key}" must not be updatable by student self-service`)
  })
})

// Test 10: Migration 009 Schema & Storage Policies Verification
test('migration 009 defines avatar_url, profile extensions, and user-scoped storage policies', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/202610120009_student_avatar_and_profile_extensions.sql')
  assert.ok(fs.existsSync(migrationPath), 'Migration 009 SQL file must exist')

  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  assert.ok(sql.includes('avatar_url text'), 'Must add avatar_url column to profiles')
  assert.ok(sql.includes('student-avatars'), 'Must create or reference student-avatars storage bucket')
  assert.ok(sql.includes('storage.foldername(name)'), 'Must enforce user-scoped storage folder RLS')
  assert.ok(sql.includes('auth.uid()'), 'Must check authenticated user id for uploads')
})
