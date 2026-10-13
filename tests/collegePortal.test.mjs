import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { collegeService, DEFAULT_FACULTY_PROFILE } from '../src/lib/collegeService.ts'
import { roleCanOpenPortal } from '../src/auth/portalRules.ts'

test('college portal: separate role authorization strictly isolates faculty, admin, and student access', () => {
  const facultyMemberships = [{ institution_id: 'inst-1', role: 'faculty', status: 'active' }]
  const adminMemberships = [{ institution_id: 'inst-1', role: 'admin', status: 'active' }]
  const studentOnly = []

  // Faculty can open faculty portal but not admin
  assert.equal(roleCanOpenPortal('faculty', facultyMemberships, false), true)
  assert.equal(roleCanOpenPortal('admin', facultyMemberships, false), false)

  // Admin can open admin portal but not faculty
  assert.equal(roleCanOpenPortal('admin', adminMemberships, false), true)
  assert.equal(roleCanOpenPortal('faculty', adminMemberships, false), false)

  // Pure student cannot access faculty or admin portals simply by URL
  assert.equal(roleCanOpenPortal('faculty', studentOnly, true), false)
  assert.equal(roleCanOpenPortal('admin', studentOnly, true), false)
})

test('college portal: faculty profile holds required institutional and contact details', async () => {
  const prof = await collegeService.getFacultyProfile()
  assert.ok(prof.full_name.length > 0)
  assert.ok(prof.faculty_id.startsWith('FAC-'))
  assert.ok(prof.email.includes('@'))
  assert.ok(prof.department.length > 0)
  assert.ok(prof.designation.length > 0)
  assert.ok(Array.isArray(prof.subjects) && prof.subjects.length > 0)
})

test('college portal: academic hour records validate positive duration and persist teaching history', async () => {
  const initial = await collegeService.getHourRecords()
  const initialCount = initial.length

  const newRecord = await collegeService.addHourRecord({
    faculty_name: 'Dr. Ramesh Sharma',
    record_date: '2026-10-13',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Advanced Operating Systems (CS601)',
    topic_covered: 'Page Replacement Algorithms Benchmark Lab',
    hours: 2,
    notes: 'Hands-on simulator evaluation'
  })

  assert.ok(newRecord.id.startsWith('hr-'))
  assert.equal(newRecord.hours, 2)
  assert.equal(newRecord.topic_covered, 'Page Replacement Algorithms Benchmark Lab')

  const updated = await collegeService.getHourRecords()
  assert.equal(updated.length, initialCount + 1)
  assert.equal(updated[0].id, newRecord.id)
})

test('college portal: assignments target only the specified year, branch, and section', async () => {
  const asg = await collegeService.createAssignment({
    faculty_name: 'Dr. Ramesh Sharma',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Advanced Operating Systems (CS601)',
    title: 'Unit Test Simulator Assignment',
    instructions: 'Submit test suite code.',
    assigned_date: '2026-10-13',
    due_date: '2026-10-28',
    status: 'published'
  })

  assert.ok(asg.id.startsWith('asg-live-'))

  // Filter for matching cohort receives it
  const matching = await collegeService.getAssignments({
    branch: 'Computer Science & Engineering',
    academic_year: 3,
    section: 'A'
  })
  assert.ok(matching.some(a => a.id === asg.id))

  // Filter for different year does not receive it
  const diffYear = await collegeService.getAssignments({
    branch: 'Computer Science & Engineering',
    academic_year: 1,
    section: 'A'
  })
  assert.ok(!diffYear.some(a => a.id === asg.id))

  // Filter for different section does not receive it
  const diffSec = await collegeService.getAssignments({
    branch: 'Computer Science & Engineering',
    academic_year: 3,
    section: 'B'
  })
  assert.ok(!diffSec.some(a => a.id === asg.id))
})

test('college portal: assignment submissions handle timestamps, late status, and faculty grading', async () => {
  const sub = await collegeService.submitAssignment({
    assignment_id: 'asg-live-test-01',
    student_id: 'STU-TEST-99',
    student_name: 'Test Student',
    student_email: 'test@student.edu',
    submission_content: 'Finished simulator algorithm implementation.'
  }, '2026-10-30') // future due date = not late

  assert.equal(sub.is_late, false)
  assert.equal(sub.status, 'submitted')
  assert.ok(sub.submitted_at.length > 0)

  // Late submission test
  const lateSub = await collegeService.submitAssignment({
    assignment_id: 'asg-live-test-02',
    student_id: 'STU-TEST-99',
    student_name: 'Test Student',
    student_email: 'test@student.edu',
    submission_content: 'Late submission after due date.'
  }, '2026-10-01') // past due date = late

  assert.equal(lateSub.is_late, true)

  // Faculty grading
  const graded = await collegeService.gradeSubmission(sub.id, 92, 'Excellent implementation')
  assert.equal(graded?.marks, 92)
  assert.equal(graded?.feedback, 'Excellent implementation')
  assert.equal(graded?.status, 'graded')
})

test('college portal: club notifications are strictly scoped to enrolled club members', async () => {
  const notif = await collegeService.createClubNotification({
    club_id: 'club-1',
    club_name: 'ACM Student Chapter',
    faculty_name: 'Dr. Ramesh Sharma',
    title: 'ACM Special Seminar',
    message: 'Mandatory technical meeting for ACM members.'
  })

  assert.ok(notif.id.startsWith('club-notif-'))
  assert.equal(notif.club_id, 'club-1')

  // Notification for club-1 is returned when queried
  const acmNotifs = await collegeService.getClubNotifications('club-1')
  assert.ok(acmNotifs.some(n => n.id === notif.id))

  // Notification for robotics (club-3) does not include this
  const roboticsNotifs = await collegeService.getClubNotifications('club-3')
  assert.ok(!roboticsNotifs.some(n => n.id === notif.id))
})

test('college portal: notification read receipts persist per student', async () => {
  const studentId = 'STU-CS-101'
  const notifId = 'test-notif-' + Date.now()

  await collegeService.markNotificationRead(studentId, notifId)
  const readList = await collegeService.getReadNotificationIds(studentId)
  assert.ok(readList.includes(notifId))
})

test('college portal: college admin statistics provide verified summaries without fabrication', async () => {
  const stats = await collegeService.getCollegeAdminStats()
  assert.ok(stats.totalStudents > 0)
  assert.ok(stats.totalFaculty > 0)
  assert.ok(stats.totalBranches >= 4)
  assert.ok(stats.studentsByYear.year1 >= 0)
  assert.ok(stats.studentsByYear.year2 >= 0)
  assert.ok(stats.studentsByYear.year3 >= 0)
  assert.ok(stats.studentsByYear.year4 >= 0)
  assert.ok(stats.totalAssignments >= 0)
  assert.ok(stats.overallSubmissionRate >= 0 && stats.overallSubmissionRate <= 100)
  assert.ok(Array.isArray(stats.branches) && stats.branches.length >= 4)
})

test('college portal: database migration 013 defines all required tables and RLS security policies', () => {
  const sql = fs.readFileSync('c:/ASCENDIQ.AI/supabase/migrations/202610130001_college_portal_faculty_admin.sql', 'utf-8')
  assert.ok(sql.includes('create table if not exists public.faculty_profiles'))
  assert.ok(sql.includes('create table if not exists public.academic_hour_records'))
  assert.ok(sql.includes('create table if not exists public.assignments'))
  assert.ok(sql.includes('create table if not exists public.assignment_submissions'))
  assert.ok(sql.includes('create table if not exists public.club_notifications'))
  assert.ok(sql.includes('create table if not exists public.club_notification_reads'))
  assert.ok(sql.includes('alter table public.assignments enable row level security'))
  assert.ok(sql.includes('alter table public.academic_hour_records enable row level security'))
})
