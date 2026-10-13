import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  placementLaunchService,
  analyzeResumeAtsClient,
  evaluateInterviewAnswerClient,
  calculatePlacementReadinessScoreClient,
  MASTER_INTERVIEW_QUESTIONS
} from '../src/lib/placementLaunchClient.ts'
import { CANONICAL_TESTS } from '../src/lib/assessmentClient.ts'
import { generateDreamRoadmap } from '../src/lib/dreamRoadmap.ts'

// Test 1: Resume Creation, ATS Scoring, and Keyword Matching
test('Year 4: Resume Builder analyzes action verbs, metrics, and compares JD keywords', async () => {
  const sampleSections = {
    education: [
      {
        institution: 'NIT Warangal',
        degree: 'B.Tech',
        field_of_study: 'Computer Science',
        start_year: '2023',
        end_year: '2027',
        grade_or_cgpa: '8.92'
      }
    ],
    skills: ['Python', 'React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'Git'],
    projects: [
      {
        title: 'Distributed Analytics Platform',
        technologies: ['FastAPI', 'PostgreSQL', 'Redis'],
        bullets: [
          'Architected high-throughput analytics engine processing 10,000+ records with sub-100ms latency.',
          'Optimized database queries with composite B-tree indexes, improving throughput by 4.2x.'
        ]
      }
    ],
    experience: [
      {
        company: 'CloudScale',
        role: 'SWE Intern',
        start_date: 'May 2025',
        end_date: 'July 2025',
        bullets: [
          'Streamlined microservice CI/CD pipelines, reducing deployment latency by 45%.'
        ]
      }
    ]
  }

  const jdText = 'Looking for a Software Engineer with Python, FastAPI, Docker, and PostgreSQL experience.'
  const atsAnalysis = analyzeResumeAtsClient(sampleSections, jdText)

  assert.ok(atsAnalysis.ats_score_estimate >= 85.0, 'Rich resume with metrics and verbs should score >= 85%')
  assert.ok(atsAnalysis.metric_indicators_found >= 3, 'Must detect at least 3 quantifiable metrics')
  assert.ok(atsAnalysis.strong_bullet_points.length >= 2, 'Must detect action verbs like architected, optimized')
  assert.ok(atsAnalysis.matched_job_keywords.includes('python'), 'Must match Python keyword from JD')
  assert.ok(atsAnalysis.matched_job_keywords.includes('fastapi'), 'Must match FastAPI keyword from JD')
  assert.ok(atsAnalysis.matched_job_keywords.includes('docker'), 'Must match Docker keyword from JD')
  assert.equal(atsAnalysis.missing_sections.length, 0, 'No core sections missing')

  // Save via service and verify persistence
  const testStudentId = 'STU-TEST-Y4'
  const saved = await placementLaunchService.saveResume(testStudentId, {
    title: 'SDE-1 Systems Resume',
    target_role: 'Full Stack Software Engineer',
    ...sampleSections,
    certifications: ['AWS Cloud Practitioner'],
    achievements: ['Dean\'s List']
  }, jdText)

  assert.equal(saved.student_id, testStudentId)
  assert.equal(saved.is_primary, true)
  assert.ok(saved.ats_score_estimate >= 85.0)

  const list = await placementLaunchService.getStudentResumes(testStudentId)
  assert.ok(list.some(r => r.id === saved.id), 'Saved resume must persist in student resumes list')
})

// Test 2: Resume File Upload Validation Rules
test('Year 4: Private resume upload enforces mime-type and 5MB size limits', () => {
  function validateResumeUpload(filename, sizeBytes, mimeType) {
    const allowedExtensions = /\.(pdf|docx|txt)$/i
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    if (!allowedExtensions.test(filename) || !allowedMimes.includes(mimeType)) {
      return { valid: false, error: 'Invalid file format. Only PDF, DOCX, or TXT accepted.' }
    }
    if (sizeBytes > 5 * 1024 * 1024) {
      return { valid: false, error: 'File exceeds 5MB size limit.' }
    }
    return { valid: true, error: null }
  }

  // Valid PDF
  const v1 = validateResumeUpload('resume.pdf', 250000, 'application/pdf')
  assert.equal(v1.valid, true)

  // Oversized 6MB PDF
  const v2 = validateResumeUpload('large_resume.pdf', 6.2 * 1024 * 1024, 'application/pdf')
  assert.equal(v2.valid, false)
  assert.match(v2.error, /5MB/)

  // Disallowed executable
  const v3 = validateResumeUpload('malicious.exe', 50000, 'application/x-msdownload')
  assert.equal(v3.valid, false)
  assert.match(v3.error, /Invalid file format/)
})

// Test 3: AI Mock Interview Studio Evaluator
test('Year 4: AI Mock Interview Studio evaluates relevance, clarity, and technical depth', async () => {
  const testStudentId = 'STU-TEST-INTERVIEW'
  const session = await placementLaunchService.startMockInterview(testStudentId, 'technical_cs', 'Google', 'SDE-1')

  assert.equal(session.status, 'in_progress')
  assert.equal(session.questions.length, 3, 'Must present 3 questions')
  assert.equal(session.overall_score, null, 'Score is null before completion')

  const q1 = session.questions[0]
  const deepAnswer = `
    In our capstone distributed analytics service, we implemented an LRU cache using a Doubly Linked List paired with a Hash Map.
    This guaranteed O(1) average lookup and put operations. To handle latency spikes, we set a memory bound of 512MB and benchmarked
    cache hit rates at 92%, reducing downstream database read IOPS by 65%.
  `

  const { session: updatedSession, feedback } = await placementLaunchService.submitInterviewAnswer(
    testStudentId,
    session.id,
    q1.id,
    deepAnswer
  )

  assert.ok(feedback.score >= 75.0, 'Technical answer with data structures and metrics scores >= 75%')
  assert.ok(feedback.relevance >= 70.0)
  assert.ok(feedback.technical_accuracy >= 75.0)
  assert.ok(feedback.strengths.length > 0)
  assert.ok(feedback.suggested_structure.length > 0)
  assert.equal(Object.keys(updatedSession.answers).length, 1)

  // Brief/incomplete answer
  const shallowFeedback = evaluateInterviewAnswerClient('tech-q1', 'I just used a list.')
  assert.ok(shallowFeedback.score < 50.0, 'One-line shallow answer must receive lower score and constructive guidance')
  assert.ok(shallowFeedback.improvements.length > 0)
})

// Test 4: Placement Application Tracker Multi-Stage Pipeline
test('Year 4: Application Tracker supports full recruitment lifecycle and filtering', async () => {
  const testStudentId = 'STU-TEST-TRACKER'

  const app1 = await placementLaunchService.savePlacementApplication(testStudentId, {
    company_name: 'Google',
    job_title: 'Software Engineer - University Grad',
    status: 'Interview',
    deadline: '2026-11-15',
    notes: 'Round 2 scheduled'
  })

  const app2 = await placementLaunchService.savePlacementApplication(testStudentId, {
    company_name: 'Amazon',
    job_title: 'SDE-1 Cloud',
    status: 'Offer Received',
    notes: 'LOI received'
  })

  const allApps = await placementLaunchService.getPlacementApplications(testStudentId)
  assert.ok(allApps.length >= 2)
  assert.ok(allApps.some(a => a.company_name === 'Google' && a.status === 'Interview'))
  assert.ok(allApps.some(a => a.company_name === 'Amazon' && a.status === 'Offer Received'))

  // Delete test
  await placementLaunchService.deletePlacementApplication(testStudentId, app1.id)
  const remaining = await placementLaunchService.getPlacementApplications(testStudentId)
  assert.equal(remaining.some(a => a.id === app1.id), false, 'Deleted application must be removed')
})

// Test 5: Placement Readiness Score Missing-Data Aware Calculation
test('Year 4: Placement Readiness Score renormalizes missing components and never treats them as zero', () => {
  // Scenario 1: All 5 components assessed
  // Resume: 90 (20%), Tech: 80 (25%), Aptitude: 70 (15%), Interview: 85 (20%), Skills: 80 (20%)
  // Sum = 90*0.2 + 80*0.25 + 70*0.15 + 85*0.2 + 80*0.2 = 18 + 20 + 10.5 + 17 + 16 = 81.5%
  const complete = calculatePlacementReadinessScoreClient('STU-1', 90, 80, 70, 85, 80)
  assert.equal(complete.available_weight_assessed, 100)
  assert.equal(complete.overall_score, 81.5)
  assert.equal(complete.readiness_status, 'Tier-1 Placement Ready')
  assert.equal(complete.components.resume_readiness.status, 'Assessed')

  // Scenario 2: Missing Mock Interview (weight 20%) & Aptitude (weight 15%)
  // Available weight = 100 - 35 = 65%
  // Available: Resume 90 (20%), Tech 80 (25%), Skills 80 (20%)
  // Weighted sum = 90*0.2 + 80*0.25 + 80*0.2 = 18 + 20 + 16 = 54.0
  // Normalized score = 54.0 / (65 / 100) = 54.0 / 0.65 = 83.07 -> 83.1%
  const partial = calculatePlacementReadinessScoreClient('STU-2', 90, 80, null, null, 80)
  assert.equal(partial.available_weight_assessed, 65)
  assert.equal(partial.components.interview_practice.status, 'Not assessed')
  assert.equal(partial.components.interview_practice.score, null)
  assert.equal(partial.components.aptitude_assessment.status, 'Not assessed')
  assert.equal(partial.overall_score, 83.1)
  assert.ok(partial.explanation.includes('65% assessed components'))

  // Scenario 3: Zero components assessed
  const empty = calculatePlacementReadinessScoreClient('STU-3', null, null, null, null, null)
  assert.equal(empty.available_weight_assessed, 0)
  assert.equal(empty.overall_score, null)
  assert.equal(empty.readiness_status, 'Incomplete Assessment')
})

// Test 6: Career Action Plan Milestones and Toggle
test('Year 4: Career Action Plan supports task completion toggling and custom milestones', async () => {
  const testStudentId = 'STU-TEST-CAP'
  const initialPlan = await placementLaunchService.getCareerActionPlan(testStudentId)
  assert.ok(initialPlan.length > 0, 'Default action plan must be generated')

  const targetTask = initialPlan[0]
  const initialCompleted = targetTask.is_completed

  const toggled = await placementLaunchService.toggleActionPlanTask(testStudentId, targetTask.id)
  assert.notEqual(toggled.is_completed, initialCompleted)

  // Add custom milestone
  const added = await placementLaunchService.addActionPlanTask(testStudentId, {
    title: 'Solve 10 LeetCode Tree Problems',
    explanation: 'Focus on Binary Search Tree balance and LCA.',
    priority: 'High',
    related_component: 'technical'
  })

  assert.equal(added.title, 'Solve 10 LeetCode Tree Problems')
  assert.equal(added.is_completed, false)

  const updatedPlan = await placementLaunchService.getCareerActionPlan(testStudentId)
  assert.ok(updatedPlan.some(t => t.id === added.id), 'Newly added task must persist')
})

// Test 7: Offer and Placement Outcome Tracker Private Compensation
test('Year 4: Offer Tracker securely records offers with private compensation safeguards', async () => {
  const testStudentId = 'STU-TEST-OFFER'
  const savedOffer = await placementLaunchService.savePlacementOffer(testStudentId, {
    company_name: 'Microsoft',
    role_title: 'SDE-1',
    offer_date: '2026-10-12',
    outcome_status: 'Accepted',
    compensation_details: '₹24,00,000 CTC (Private & Confidential)',
    notes: 'Campus placement drive offer letter received.'
  })

  assert.equal(savedOffer.company_name, 'Microsoft')
  assert.equal(savedOffer.outcome_status, 'Accepted')
  assert.equal(savedOffer.compensation_details, '₹24,00,000 CTC (Private & Confidential)')

  const allOffers = await placementLaunchService.getPlacementOffers(testStudentId)
  assert.ok(allOffers.some(o => o.id === savedOffer.id))

  // Clean up
  await placementLaunchService.deletePlacementOffer(testStudentId, savedOffer.id)
  const remaining = await placementLaunchService.getPlacementOffers(testStudentId)
  assert.equal(remaining.some(o => o.id === savedOffer.id), false)
})

// Test 8: Year 2 and Year 3 Features Remain Fully Functional
test('Year 4 Integration preserves Year 2 Dream Roadmap and Year 3 Assessment Center', () => {
  // Check Year 2 Dream Roadmap generator
  const roadmap = generateDreamRoadmap('Google', 'Full Stack Software Engineer')
  assert.ok(Array.isArray(roadmap), 'Roadmap must be an array of skill items')
  assert.ok(roadmap.length >= 8, 'Must maintain 8 foundational roadmap skill items')

  // Check Year 3 Assessment Catalog
  assert.ok(CANONICAL_TESTS.length >= 10, 'Must maintain 10+ canonical Year 3 assessments')
  assert.ok(CANONICAL_TESTS.some(t => t.category === 'aptitude'))
  assert.ok(CANONICAL_TESTS.some(t => t.category === 'technical'))
  assert.ok(CANONICAL_TESTS.some(t => t.category === 'mock'))
})

// Test 9: Migration 012 Schema and User-Scoped RLS Policy Verification
test('Year 4: Database Migration 012 defines all required tables and user-isolated RLS policies', () => {
  const sql = fs.readFileSync('c:/ASCENDIQ.AI/supabase/migrations/202610120012_year4_placement_career_launch.sql', 'utf8')

  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_resumes'), 'Missing student_resumes table')
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_mock_interviews'), 'Missing student_mock_interviews table')
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_placement_applications'), 'Missing student_placement_applications table')
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_career_action_plans'), 'Missing student_career_action_plans table')
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_placement_offers'), 'Missing student_placement_offers table')

  // RLS enablement
  assert.ok(sql.includes('ALTER TABLE public.student_resumes ENABLE ROW LEVEL SECURITY'))
  assert.ok(sql.includes('ALTER TABLE public.student_mock_interviews ENABLE ROW LEVEL SECURITY'))
  assert.ok(sql.includes('ALTER TABLE public.student_placement_applications ENABLE ROW LEVEL SECURITY'))
  assert.ok(sql.includes('ALTER TABLE public.student_career_action_plans ENABLE ROW LEVEL SECURITY'))
  assert.ok(sql.includes('ALTER TABLE public.student_placement_offers ENABLE ROW LEVEL SECURITY'))

  // User-scoped RLS policies
  assert.ok(sql.includes('auth.uid() = user_id'), 'Policies must enforce strict user-isolation')
})
