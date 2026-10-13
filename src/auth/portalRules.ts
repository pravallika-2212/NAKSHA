export type PortalKind = 'student' | 'faculty' | 'admin' | 'placement'
export type TrustedMembership = {
  institution_id: string
  role: 'reviewer' | 'admin' | 'faculty' | 'placement_officer'
  status: 'active' | 'inactive'
}

export function portalHomeFor(memberships: TrustedMembership[], hasApprovedStudentAccess: boolean) {
  if (memberships.some(row => row.status === 'active' && (row.role === 'admin' || row.role === 'reviewer'))) return '/admin'
  if (memberships.some(row => row.status === 'active' && row.role === 'faculty')) return '/faculty'
  if (memberships.some(row => row.status === 'active' && row.role === 'placement_officer')) return '/placement'
  return hasApprovedStudentAccess ? '/student' : '/verification-pending'
}

export function isStudentVerificationApproved(input: {
  accountStatus?: string | null
  requestStatus?: string | null
  verificationStatus?: string | null
}): boolean {
  return (
    input.accountStatus === 'approved' ||
    input.requestStatus === 'matched' ||
    input.requestStatus === 'approved' ||
    input.verificationStatus === 'approved'
  )
}

export function resolveEffectiveVerificationStatus(input: {
  accountStatus?: string | null
  requestStatus?: string | null
  verificationStatus?: string | null
}): 'approved' | 'rejected' | 'needs_more_information' | 'under_review' | 'pending' {
  if (isStudentVerificationApproved(input)) return 'approved'
  if (input.accountStatus === 'rejected' || input.requestStatus === 'rejected' || input.verificationStatus === 'rejected') return 'rejected'
  if (input.accountStatus === 'needs_more_information' || input.requestStatus === 'needs_more_information' || input.verificationStatus === 'needs_more_information') return 'needs_more_information'
  if (input.requestStatus === 'under_review' || input.verificationStatus === 'under_review') return 'under_review'
  return 'pending'
}

export function roleCanOpenPortal(kind: PortalKind, memberships: TrustedMembership[], hasApprovedStudentAccess: boolean) {
  if (kind === 'student') return hasApprovedStudentAccess
  const roles = memberships.filter(row => row.status === 'active').map(row => row.role)
  if (kind === 'admin') return roles.includes('admin') || roles.includes('reviewer')
  if (kind === 'faculty') return roles.includes('faculty')
  return roles.includes('placement_officer')
}


