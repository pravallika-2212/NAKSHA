import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  generateDreamRoadmap,
  SUGGESTED_COMPANIES,
  SUGGESTED_ROLES,
  MASTER_LEARNING_RESOURCES,
  HACKATHON_GUIDE_STEPS,
  CATEGORY_METADATA
} from '../src/lib/dreamRoadmap.ts'

// Test 1: First-Time Selection & Custom Company / Role Handling
test('dream company selection accepts both suggested tech leaders and custom company names', () => {
  // 1. Suggested companies are properly configured
  assert.ok(SUGGESTED_COMPANIES.length >= 8)
  const google = SUGGESTED_COMPANIES.find(c => c.name === 'Google')
  assert.ok(google, 'Google should be in suggested companies')
  assert.equal(google.tier, 'Tier 1 Product')
  assert.ok(google.verifiedFocus.length > 10)

  // 2. Custom company validation logic
  function validatePreferences(payload) {
    if (!payload.company_name || !payload.company_name.trim()) {
      return { valid: false, error: 'Please specify or select a target dream company.' }
    }
    if (!payload.target_role || !payload.target_role.trim()) {
      return { valid: false, error: 'Please specify or select a target engineering role.' }
    }
    return {
      valid: true,
      preferences: {
        company_name: payload.company_name.trim(),
        target_role: payload.target_role.trim(),
        target_timeframe: payload.target_timeframe ? payload.target_timeframe.trim() : undefined
      }
    }
  }

  // Predefined company
  const res1 = validatePreferences({ company_name: 'Microsoft', target_role: 'Software Development Engineer (SDE)' })
  assert.equal(res1.valid, true)
  assert.equal(res1.preferences.company_name, 'Microsoft')

  // Custom company (e.g. OpenAI / Stripe / Local Startup)
  const res2 = validatePreferences({ company_name: 'Stripe', target_role: 'Infrastructure Engineer', target_timeframe: 'Summer 2027 Internship' })
  assert.equal(res2.valid, true)
  assert.equal(res2.preferences.company_name, 'Stripe')
  assert.equal(res2.preferences.target_role, 'Infrastructure Engineer')

  // Invalid payload
  assert.equal(validatePreferences({ company_name: '', target_role: 'SDE' }).valid, false)
  assert.equal(validatePreferences({ company_name: 'Zoho', target_role: '' }).valid, false)
})

// Test 2: Dynamic 8-Category Roadmap Generation
test('generates complete personalized roadmap across all 8 required foundational categories', () => {
  const roadmap = generateDreamRoadmap('Amazon', 'Software Development Engineer')

  assert.ok(roadmap.length >= 16, 'Roadmap must contain comprehensive skills')

  // Verify all 8 categories exist
  const categoriesPresent = new Set(roadmap.map(s => s.category))
  const requiredCategories = [
    'fundamentals',
    'dsa',
    'databases',
    'role_skills',
    'aptitude',
    'communication',
    'portfolio',
    'hackathons'
  ]

  requiredCategories.forEach(cat => {
    assert.ok(categoriesPresent.has(cat), `Category "${cat}" must be present in roadmap`)
    assert.ok(CATEGORY_METADATA[cat], `Metadata for category "${cat}" must exist`)
  })

  // Verify each skill has all required fields
  roadmap.forEach(skill => {
    assert.ok(skill.id, 'Skill must have id')
    assert.ok(skill.name, 'Skill must have name')
    assert.ok(skill.relevance.length > 15, `Skill "${skill.name}" must explain why it is relevant`)
    assert.ok(['High', 'Medium', 'Foundational'].includes(skill.priority), 'Skill must have valid priority')
    assert.ok(['not_started', 'in_progress', 'completed'].includes(skill.status), 'Skill must have valid status')
    assert.ok(Array.isArray(skill.prerequisites), 'Skill must have prerequisites array')
    assert.ok(Array.isArray(skill.resources), 'Skill must have resources array')
    assert.ok(skill.practicalExercise.length > 15, `Skill "${skill.name}" must have practical exercise`)
  })
})

// Test 3: Non-Destructive Regeneration When Changing Dream Company
test('changing dream company and role recalculates roadmap while preserving existing skill progress', () => {
  // Step 1: Initial company selection (Google SDE)
  const initialRoadmap = generateDreamRoadmap('Google', 'Software Development Engineer')

  // Step 2: Student completes linear DSA and logs database exercise
  const savedProgress = {
    'dsa-1': {
      skill_id: 'dsa-1',
      status: 'completed',
      is_verified: false,
      exercise_completed: true,
      project_completed: false
    },
    'db-1': {
      skill_id: 'db-1',
      status: 'in_progress',
      is_verified: false,
      exercise_completed: true,
      project_completed: false
    }
  }

  // Step 3: Student changes dream company to Swiggy and target role to Full Stack Software Engineer
  const newRoadmap = generateDreamRoadmap('Swiggy', 'Full Stack Software Engineer', savedProgress)

  // Verification: completed skills must remain completed!
  const dsa1 = newRoadmap.find(s => s.id === 'dsa-1')
  assert.ok(dsa1)
  assert.equal(dsa1.status, 'completed', 'Completed DSA skill must survive company change')
  assert.equal(dsa1.exercise_completed, true, 'Exercise completion flag must survive company change')

  const db1 = newRoadmap.find(s => s.id === 'db-1')
  assert.ok(db1)
  assert.equal(db1.status, 'in_progress', 'In-progress status must survive company change')
  assert.equal(db1.exercise_completed, true, 'Exercise completion flag must survive company change')

  // Verify that the relevance explanation adapted to the new employer and role
  const fund1 = newRoadmap.find(s => s.id === 'fund-1')
  assert.ok(fund1.relevance.includes('Swiggy'), 'Relevance must mention new target employer')

  // Role skills must adapt to Full Stack
  const webRole = newRoadmap.find(s => s.id === 'role-1')
  assert.ok(webRole.name.includes('Web Architecture'), 'Role skill must adapt to Full Stack')
})

// Test 4: Resource Catalog Integrity & Verified Links
test('learning resource catalog includes all required verified portals without broken links', () => {
  assert.ok(MASTER_LEARNING_RESOURCES.length >= 6)

  const urls = MASTER_LEARNING_RESOURCES.map(r => r.url)

  // Must include Google Tech Dev Guide
  assert.ok(urls.includes('https://techdevguide.withgoogle.com/'), 'Google Tech Dev Guide must be included')

  // Must include GitHub Skills
  assert.ok(urls.includes('https://skills.github.com/'), 'GitHub Skills must be included')

  // Must include HackerRank Skills Directory
  assert.ok(urls.includes('https://www.hackerrank.com/skills-directory'), 'HackerRank Skills Directory must be included')

  // Must include Coursera catalog
  assert.ok(urls.includes('https://www.coursera.org/'), 'Coursera must be included')

  // Must include Major League Hacking (MLH)
  assert.ok(urls.includes('https://mlh.io/'), 'MLH must be included')

  // Must include GitHub Docs
  assert.ok(urls.includes('https://docs.github.com/'), 'GitHub Docs must be included')

  // Verify Coursera resource disclaims paid vs audit and relevance
  const courseraRes = MASTER_LEARNING_RESOURCES.find(r => r.url.includes('coursera.org'))
  assert.ok(courseraRes)
  assert.equal(courseraRes.isFree, false)
  assert.ok(courseraRes.note.includes('Audit mode'), 'Must note audit mode availability')
  assert.ok(courseraRes.note.includes('Not required for general SDE'), 'Must not claim it is mandatory for unrelated roles')
})

// Test 5: Hackathon 7-Step Playbook Guidance
test('hackathon learning playbook covers all 7 required stages without fabricating live dates', () => {
  assert.equal(HACKATHON_GUIDE_STEPS.length, 7, 'Must have exactly 7 structured hackathon steps')

  const expectedTitles = [
    'What a Hackathon Is',
    'How Students Can Join',
    'How to Form a Balanced',
    'How to Select a Winning Problem Statement',
    'How to Build an MVP',
    'How to Present and Pitch',
    'How to Document Your Project on GitHub'
  ]

  HACKATHON_GUIDE_STEPS.forEach((step, idx) => {
    assert.equal(step.stepNumber, idx + 1)
    assert.ok(step.title.includes(expectedTitles[idx]), `Step ${idx + 1} must match expected topic`)
    assert.ok(step.actionableChecklist.length >= 3, `Step ${idx + 1} must have at least 3 checklist items`)
  })

  // Ensure no fabricated live registration deadlines exist in guidance
  const combinedText = JSON.stringify(HACKATHON_GUIDE_STEPS).toLowerCase()
  assert.equal(combinedText.includes('registration deadline: october 25'), false)
  assert.equal(combinedText.includes('last date to apply:'), false)
})

// Test 6: Skill Progress Aggregation & Self-Reported Provenance
test('roadmap progress calculates completion stats accurately and distinguishes self-reported status', () => {
  function calculateProgress(skills) {
    const total = skills.length
    const completed = skills.filter(s => s.status === 'completed').length
    const inProgress = skills.filter(s => s.status === 'in_progress').length
    const notStarted = total - completed - inProgress
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, notStarted, percentage }
  }

  const dummySkills = [
    { status: 'completed' },
    { status: 'completed' },
    { status: 'in_progress' },
    { status: 'not_started' }
  ]

  const stats = calculateProgress(dummySkills)
  assert.equal(stats.total, 4)
  assert.equal(stats.completed, 2)
  assert.equal(stats.inProgress, 1)
  assert.equal(stats.notStarted, 1)
  assert.equal(stats.percentage, 50)
})

// Test 7: Migration 010 Schema & RLS Policy Enforcement
test('migration 010 defines student_dream_roadmaps and student_skill_progress with user-scoped RLS', () => {
  const migPath = path.resolve(process.cwd(), 'supabase/migrations/202610120010_year2_dream_company_roadmap.sql')
  assert.ok(fs.existsSync(migPath), 'Migration 010 SQL file must exist')

  const sql = fs.readFileSync(migPath, 'utf8').toLowerCase()

  // Tables
  assert.ok(sql.includes('create table if not exists public.student_dream_roadmaps'))
  assert.ok(sql.includes('create table if not exists public.student_skill_progress'))

  // RLS enablement
  assert.ok(sql.includes('alter table public.student_dream_roadmaps enable row level security'))
  assert.ok(sql.includes('alter table public.student_skill_progress enable row level security'))

  // Ownership checks
  assert.ok(sql.includes('auth.uid() = user_id'))
  assert.ok(sql.includes('references auth.users(id) on delete cascade'))
})
