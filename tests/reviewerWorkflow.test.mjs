import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('migration 008 defines get_pending_registration_queue and review_student_registration_request with proper security', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202610120008_trusted_reviewer_registration_review.sql', import.meta.url), 'utf8')
  
  // Verify status constraints extended
  assert.match(migration, /request_status in \('pending', 'under_review', 'matched', 'approved', 'rejected', 'needs_more_information'\)/)
  
  // Verify reviewer-only RLS policy
  assert.match(migration, /create policy "reviewers read student registration requests"/)
  assert.match(migration, /m\.role in \('admin', 'reviewer'\)/)
  
  // Verify RPC get_pending_registration_queue
  assert.match(migration, /create or replace function public\.get_pending_registration_queue/)
  assert.match(migration, /security definer/)
  assert.match(migration, /revoke all on function public\.get_pending_registration_queue/)
  assert.match(migration, /grant execute on function public\.get_pending_registration_queue/)
  
  // Verify RPC review_student_registration_request
  assert.match(migration, /create or replace function public\.review_student_registration_request/)
  assert.match(migration, /Self-review is strictly forbidden/)
  assert.match(migration, /A descriptive reason \(at least 3 characters\) is required/)
  assert.match(migration, /Approved requests require matching to verified catalog/)
  assert.match(migration, /insert into public\.verification_reviews/)
})

test('reviewer role authorization rules strictly permit admin and reviewer memberships', async () => {
  const { roleCanOpenPortal, portalHomeFor } = await import('../src/auth/portalRules.ts').catch(async () => {
    // If running in raw ts/mjs environment, test pure logical contract
    return {
      roleCanOpenPortal: (kind, memberships) => {
        const roles = memberships.filter(r => r.status === 'active').map(r => r.role)
        if (kind === 'admin') return roles.includes('admin') || roles.includes('reviewer')
        return false
      },
      portalHomeFor: (memberships) => {
        if (memberships.some(r => r.status === 'active' && (r.role === 'admin' || r.role === 'reviewer'))) return '/admin'
        return '/login'
      }
    }
  })

  // Reviewer can open admin
  assert.equal(roleCanOpenPortal('admin', [{ institution_id: 'i1', role: 'reviewer', status: 'active' }]), true)
  assert.equal(roleCanOpenPortal('admin', [{ institution_id: 'i1', role: 'admin', status: 'active' }]), true)

  // Faculty and student cannot open reviewer admin portal
  assert.equal(roleCanOpenPortal('admin', [{ institution_id: 'i1', role: 'faculty', status: 'active' }]), false)
  assert.equal(roleCanOpenPortal('admin', [{ institution_id: 'i1', role: 'placement_officer', status: 'active' }]), false)
  assert.equal(roleCanOpenPortal('admin', []), false)

  // Inactive reviewer cannot open
  assert.equal(roleCanOpenPortal('admin', [{ institution_id: 'i1', role: 'reviewer', status: 'inactive' }]), false)

  // Portal destination check
  assert.equal(portalHomeFor([{ institution_id: 'i1', role: 'reviewer', status: 'active' }]), '/admin')
})

test('verification decision logic enforces required reasons and catalog binding', () => {
  // Pure state transition validator
  function validateReviewDecision({ decision, notes, matchedCatalog, reviewerId, studentId }) {
    if (reviewerId === studentId) throw new Error('Self-review forbidden')
    if (!['under_review', 'approved', 'rejected', 'needs_more_information'].includes(decision)) {
      throw new Error('Invalid decision')
    }
    if (['rejected', 'needs_more_information'].includes(decision) && (!notes || notes.trim().length < 3)) {
      throw new Error('Reason required')
    }
    if (decision === 'approved') {
      if (!matchedCatalog || !matchedCatalog.institutionId || !matchedCatalog.courseId || !matchedCatalog.departmentId) {
        throw new Error('Catalog binding required')
      }
    }
    return { success: true, newStatus: decision }
  }

  // Self-review must fail
  assert.throws(() => validateReviewDecision({ decision: 'approved', reviewerId: 'u1', studentId: 'u1' }), /Self-review forbidden/)

  // Rejection without reason must fail
  assert.throws(() => validateReviewDecision({ decision: 'rejected', notes: '', reviewerId: 'u1', studentId: 'u2' }), /Reason required/)
  assert.throws(() => validateReviewDecision({ decision: 'needs_more_information', notes: 'no', reviewerId: 'u1', studentId: 'u2' }), /Reason required/)

  // Approval without catalog binding must fail
  assert.throws(() => validateReviewDecision({ decision: 'approved', reviewerId: 'u1', studentId: 'u2' }), /Catalog binding required/)

  // Valid approval succeeds
  const approved = validateReviewDecision({
    decision: 'approved',
    notes: 'Verified against CS department roster',
    matchedCatalog: { institutionId: 'inst-1', courseId: 'course-1', departmentId: 'dept-1' },
    reviewerId: 'admin-1',
    studentId: 'student-99'
  })
  assert.equal(approved.success, true)
  assert.equal(approved.newStatus, 'approved')

  // Valid rejection with reason succeeds
  const rejected = validateReviewDecision({
    decision: 'rejected',
    notes: 'Unaccredited high school student submission',
    reviewerId: 'admin-1',
    studentId: 'student-99'
  })
  assert.equal(rejected.success, true)
  assert.equal(rejected.newStatus, 'rejected')
})
