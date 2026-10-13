import test from 'node:test'
import assert from 'node:assert/strict'
import { portalHomeFor, roleCanOpenPortal } from '../src/auth/portalRules.ts'

const membership = (role, status = 'active', institution_id = 'inst-a') => ({ role, status, institution_id })

test('approved student access grants student navigation only', () => {
  assert.equal(roleCanOpenPortal('student', [], true), true)
  assert.equal(roleCanOpenPortal('student', [], false), false)
  assert.equal(roleCanOpenPortal('faculty', [], true), false)
  assert.equal(portalHomeFor([], true), '/student')
  assert.equal(portalHomeFor([], false), '/verification-pending')
})

test('faculty access requires an active trusted faculty membership', () => {
  assert.equal(roleCanOpenPortal('faculty', [membership('faculty')], false), true)
  assert.equal(roleCanOpenPortal('faculty', [membership('faculty', 'inactive')], false), false)
  assert.equal(roleCanOpenPortal('admin', [membership('faculty')], false), false)
  assert.equal(portalHomeFor([membership('faculty')], false), '/faculty')
})

test('reviewer and admin memberships route to institution review', () => {
  assert.equal(roleCanOpenPortal('admin', [membership('reviewer')], false), true)
  assert.equal(roleCanOpenPortal('admin', [membership('admin')], false), true)
  assert.equal(portalHomeFor([membership('reviewer')], false), '/admin')
})

test('placement access requires an active placement officer membership', () => {
  assert.equal(roleCanOpenPortal('placement', [membership('placement_officer')], false), true)
  assert.equal(roleCanOpenPortal('placement', [membership('admin')], false), false)
  assert.equal(portalHomeFor([membership('placement_officer')], false), '/placement')
})

test('inactive staff memberships do not authorize portals', () => {
  const inactive = [membership('admin', 'inactive')]
  assert.equal(roleCanOpenPortal('admin', inactive, false), false)
  assert.equal(portalHomeFor(inactive, false), '/verification-pending')
})

test('student verification approval recognizes profile, request, or verification status', async () => {
  const { isStudentVerificationApproved, resolveEffectiveVerificationStatus } = await import('../src/auth/portalRules.ts')
  
  // Directly approved profile
  assert.equal(isStudentVerificationApproved({ accountStatus: 'approved' }), true)
  assert.equal(resolveEffectiveVerificationStatus({ accountStatus: 'approved' }), 'approved')

  // Request status 'matched' (from migration 008 review RPC)
  assert.equal(isStudentVerificationApproved({ requestStatus: 'matched' }), true)
  assert.equal(resolveEffectiveVerificationStatus({ requestStatus: 'matched' }), 'approved')

  // Request status 'approved'
  assert.equal(isStudentVerificationApproved({ requestStatus: 'approved' }), true)
  assert.equal(resolveEffectiveVerificationStatus({ requestStatus: 'approved' }), 'approved')

  // Verification document row approved
  assert.equal(isStudentVerificationApproved({ verificationStatus: 'approved' }), true)
  assert.equal(resolveEffectiveVerificationStatus({ verificationStatus: 'approved' }), 'approved')

  // In-flight or pending states are strictly NOT approved
  assert.equal(isStudentVerificationApproved({ accountStatus: 'pending', requestStatus: 'pending' }), false)
  assert.equal(resolveEffectiveVerificationStatus({ accountStatus: 'pending', requestStatus: 'pending' }), 'pending')

  assert.equal(isStudentVerificationApproved({ requestStatus: 'under_review' }), false)
  assert.equal(resolveEffectiveVerificationStatus({ requestStatus: 'under_review' }), 'under_review')

  assert.equal(isStudentVerificationApproved({ requestStatus: 'needs_more_information' }), false)
  assert.equal(resolveEffectiveVerificationStatus({ requestStatus: 'needs_more_information' }), 'needs_more_information')

  assert.equal(isStudentVerificationApproved({ requestStatus: 'rejected' }), false)
  assert.equal(resolveEffectiveVerificationStatus({ requestStatus: 'rejected' }), 'rejected')
})

