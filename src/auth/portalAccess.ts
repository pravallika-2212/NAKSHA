import { supabase } from '../lib/supabase'
import { isStudentVerificationApproved, resolveEffectiveVerificationStatus, type TrustedMembership } from './portalRules'

export { isStudentVerificationApproved, portalHomeFor, resolveEffectiveVerificationStatus } from './portalRules'
export type { TrustedMembership } from './portalRules'

export async function resolveStudentVerificationState(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const [profileResult, requestResult, verificationResult] = await Promise.all([
    supabase.from('profiles').select('id,account_status,institution_id,course_id,department_id,full_name').eq('id', userId).maybeSingle(),
    supabase.from('student_registration_requests').select('request_status,institution_name,program_name,department_name,reviewer_note,submitted_at').eq('user_id', userId).maybeSingle(),
    supabase.from('student_verifications').select('id,verification_status,document_storage_path,submitted_at,reviewer_note').eq('user_id', userId).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (profileResult.error) throw profileResult.error

  const accountStatus = profileResult.data?.account_status
  const requestStatus = requestResult.data?.request_status
  const verificationStatus = verificationResult.data?.verification_status

  const isApproved = isStudentVerificationApproved({ accountStatus, requestStatus, verificationStatus })
  const effectiveStatus = resolveEffectiveVerificationStatus({ accountStatus, requestStatus, verificationStatus })

  return {
    isApproved,
    effectiveStatus,
    profile: profileResult.data,
    registrationRequest: requestResult.data,
    verification: verificationResult.data,
  }
}

export async function resolvePortalHome(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const [membershipResult, _studentState] = await Promise.all([
    supabase.from('institution_memberships')
      .select('institution_id,role,status')
      .eq('user_id', userId)
      .eq('status', 'active'),
    resolveStudentVerificationState(userId),
  ])
  if (membershipResult.error) throw membershipResult.error
  const memberships = (membershipResult.data ?? []) as TrustedMembership[]
  
  // Trusted staff roles navigate to their authorized portals
  if (memberships.some(row => row.status === 'active' && (row.role === 'admin' || row.role === 'reviewer'))) return '/admin'
  if (memberships.some(row => row.status === 'active' && row.role === 'faculty')) return '/faculty'
  if (memberships.some(row => row.status === 'active' && row.role === 'placement_officer')) return '/placement'

  // Authenticated students always enter the student experience (/student);
  // institution verification status is displayed as a banner on their permitted dashboard.
  return '/student'
}
