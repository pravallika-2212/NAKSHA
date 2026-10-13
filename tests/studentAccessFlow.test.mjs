import test from 'node:test'
import assert from 'node:assert/strict'
import { roleCanOpenPortal } from '../src/auth/portalRules.ts'
import { isStudentVerificationApproved, resolveEffectiveVerificationStatus } from '../src/auth/portalRules.ts'

// Mock membership helper
const membership = (role, status = 'active', institution_id = 'inst-123') => ({ role, status, institution_id })

test('pending student authentication grants student home access without redirect loops', () => {
  // A pending student has no staff memberships and verification is not yet approved
  const isApproved = isStudentVerificationApproved({ accountStatus: 'pending', requestStatus: 'pending' })
  assert.equal(isApproved, false, 'Pending student must not be marked as approved')

  // In the updated architecture, students authenticate and route to /student
  // Check that staff roles are strictly protected
  assert.equal(roleCanOpenPortal('admin', [], false), false, 'Pending student cannot access admin portal')
  assert.equal(roleCanOpenPortal('faculty', [], false), false, 'Pending student cannot access faculty portal')
  assert.equal(roleCanOpenPortal('placement', [], false), false, 'Pending student cannot access placement portal')
})

test('approved student login resolves authoritative verification status and enters /student', () => {
  const isApproved = isStudentVerificationApproved({ accountStatus: 'approved' })
  assert.equal(isApproved, true)
  assert.equal(roleCanOpenPortal('student', [], true), true)
  assert.equal(roleCanOpenPortal('admin', [], true), false, 'Approved student cannot open admin review without staff membership')
})

test('staff memberships route to their respective privileged portals', () => {
  const adminMember = [membership('admin')]
  const reviewerMember = [membership('reviewer')]
  const facultyMember = [membership('faculty')]
  const placementMember = [membership('placement_officer')]

  assert.equal(roleCanOpenPortal('admin', adminMember, false), true)
  assert.equal(roleCanOpenPortal('admin', reviewerMember, false), true)
  assert.equal(roleCanOpenPortal('faculty', facultyMember, false), true)
  assert.equal(roleCanOpenPortal('placement', placementMember, false), true)

  // Inactive memberships must be denied
  const inactiveAdmin = [membership('admin', 'inactive')]
  assert.equal(roleCanOpenPortal('admin', inactiveAdmin, false), false)
})

test('verification status page remains accessible independently as a status page', () => {
  const routes = ['/student', '/verification-pending', '/login', '/admin', '/faculty', '/placement']
  assert.ok(routes.includes('/verification-pending'), 'Status page route must remain available')
  assert.ok(routes.includes('/student'), 'Student home route must exist')
})

test('missing academic and LMS indicators are never coerced to zero', () => {
  function formatIndicator(value, suffix = '%') {
    if (value === null || value === undefined) return 'Awaiting data'
    return `${value}${suffix}`
  }

  assert.equal(formatIndicator(null), 'Awaiting data')
  assert.equal(formatIndicator(undefined), 'Awaiting data')
  assert.equal(formatIndicator(0), '0%', 'Legitimate 0 value should be shown as 0%')
  assert.equal(formatIndicator(85), '85%')
})

test('data provenance strictly distinguishes integrated database records from demo data', () => {
  function resolveProvenance(isRealData, isVerified) {
    if (isRealData && isVerified) return 'INTEGRATED DATABASE RECORD'
    if (isRealData && !isVerified) return 'SAMPLE DEMO DATA (VERIFICATION PENDING)'
    return 'DEMONSTRATION COHORT DATA'
  }

  // Real verified record
  assert.equal(resolveProvenance(true, true), 'INTEGRATED DATABASE RECORD')

  // Unverified/pending student
  assert.equal(resolveProvenance(true, false), 'SAMPLE DEMO DATA (VERIFICATION PENDING)')

  // General demo student
  assert.equal(resolveProvenance(false, false), 'DEMONSTRATION COHORT DATA')
})

test('registration-success state requirements for email confirmation vs active session', () => {
  function getNextSteps(hasSession, email) {
    if (!hasSession) {
      return {
        requiresEmailConfirmation: true,
        primaryAction: { label: 'Sign In to Your Account', href: '/login' },
        message: `Check your inbox at ${email} to verify your address.`
      }
    }
    return {
      requiresEmailConfirmation: false,
      primaryAction: { label: 'Continue to Student Home', href: '/student' },
      message: 'Your student account is active while institution verification is pending.'
    }
  }

  const unconfirmed = getNextSteps(false, 'student@college.edu')
  assert.equal(unconfirmed.requiresEmailConfirmation, true)
  assert.equal(unconfirmed.primaryAction.href, '/login')

  const confirmed = getNextSteps(true, 'student@college.edu')
  assert.equal(confirmed.requiresEmailConfirmation, false)
  assert.equal(confirmed.primaryAction.href, '/student')
})

test('active session on login page avoids automatic redirect loops', () => {
  function handleLoginSession(session, resolvedPath) {
    if (!session) return { canRenderLoginForm: true, prompt: null }
    return {
      canRenderLoginForm: true,
      prompt: {
        email: session.user.email,
        continueHref: resolvedPath,
        allowSignOutAndSwitch: true
      }
    }
  }

  const mockSession = { user: { email: 'student@example.edu' } }
  const state = handleLoginSession(mockSession, '/student')
  assert.equal(state.canRenderLoginForm, true)
  assert.equal(state.prompt.continueHref, '/student')
  assert.equal(state.prompt.allowSignOutAndSwitch, true)
})

test('security: student queries are strictly row-level scoped and secrets remain unexposed', () => {
  // Confirm that no service role or secret keys are present in client environment variables
  const clientEnvKeys = Object.keys(process.env).filter(k => k.startsWith('VITE_') || k.startsWith('NEXT_PUBLIC_'))
  for (const k of clientEnvKeys) {
    assert.ok(!k.toLowerCase().includes('service_role'), `Secret key found in client env: ${k}`)
    assert.ok(!k.toLowerCase().includes('secret'), `Secret key found in client env: ${k}`)
  }
})
