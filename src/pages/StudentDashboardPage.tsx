import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { isStudentVerificationApproved, resolveEffectiveVerificationStatus } from '../auth/portalRules'
import { StudentSuccessDashboard } from '../components/StudentSuccessDashboard'

export interface RealStudentProfile {
  id: string
  full_name: string
  roll_number: string
  academic_year: number
  admission_year?: number | null
  institution_name?: string
  department_name?: string
  program_name?: string
  account_status: string
  is_verified: boolean
  submitted_at?: string
  reviewer_note?: string | null
  avatar_url?: string | null
  phone?: string | null
  bio?: string | null
  skills?: string[] | null
  interests?: string[] | null
}

function getSectionFromPath(): string {
  const p = window.location.pathname.toLowerCase()
  if (p.includes('/student/academic')) return 'academic'
  if (p.includes('/student/attendance')) return 'attendance'
  if (p.includes('/student/lms')) return 'lms'
  if (p.includes('/student/engagement')) return 'engagement'
  if (p.includes('/student/skills')) return 'skills'
  if (p.includes('/student/career') || p.includes('/student/placement') || p.includes('/student/placement-prep') || p.includes('/student/roadmap')) return 'placement'
  if (p.includes('/student/insights')) return 'insights'
  if (p.includes('/student/profile')) return 'profile'
  return 'overview'
}

export default function StudentDashboardPage() {
  const { session, loading: sessionLoading } = useAuth()
  const [profile, setProfile] = useState<RealStudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [currentSection, setCurrentSection] = useState<string>(getSectionFromPath)

  const loadStudentProfile = useCallback(async () => {
    if (!session || !supabase) {
      setLoadingProfile(false)
      return
    }

    setLoadingProfile(true)
    setErrorMessage('')

    try {
      // First attempt query with extended profile fields
      let profileData: any = null
      const extendedRes = await supabase
        .from('profiles')
        .select('id, full_name, roll_number, academic_year, admission_year, institution_id, course_id, department_id, account_status, avatar_url, phone, bio, skills, interests')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!extendedRes.error) {
        profileData = extendedRes.data
      } else {
        // Fallback to core columns if new columns are not yet in remote schema cache
        const basicRes = await supabase
          .from('profiles')
          .select('id, full_name, roll_number, academic_year, admission_year, institution_id, course_id, department_id, account_status')
          .eq('id', session.user.id)
          .maybeSingle()
        if (basicRes.error) throw basicRes.error
        profileData = basicRes.data
      }

      const [reqRes, verifRes, membershipRes] = await Promise.all([
        supabase
          .from('student_registration_requests')
          .select('request_status, institution_name, program_name, department_name, reviewer_note, submitted_at')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('student_verifications')
          .select('id, verification_status, document_storage_path, submitted_at, reviewer_note')
          .eq('user_id', session.user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('institution_memberships')
          .select('role, status')
          .eq('user_id', session.user.id)
          .eq('status', 'active'),
      ])

      // If user has a privileged staff membership, route them to their authorized workspace
      const memberships = (membershipRes.data ?? [])
      if (memberships.some(m => m.role === 'admin' || m.role === 'reviewer')) {
        window.location.replace('/admin')
        return
      }
      if (memberships.some(m => m.role === 'faculty')) {
        window.location.replace('/faculty')
        return
      }
      if (memberships.some(m => m.role === 'placement_officer')) {
        window.location.replace('/placement')
        return
      }

      const reqData = reqRes.data
      const verifData = verifRes.data

      const isApproved = isStudentVerificationApproved({
        accountStatus: profileData?.account_status,
        requestStatus: reqData?.request_status,
        verificationStatus: verifData?.verification_status,
      })

      const effectiveStatus = resolveEffectiveVerificationStatus({
        accountStatus: profileData?.account_status,
        requestStatus: reqData?.request_status,
        verificationStatus: verifData?.verification_status,
      })

      let institutionName = reqData?.institution_name || 'Self-Declared College'
      let departmentName = reqData?.department_name || 'Department'
      let programName = reqData?.program_name || 'Program'

      if (profileData?.institution_id) {
        const { data: instData } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', profileData.institution_id)
          .maybeSingle()
        if (instData?.name) institutionName = instData.name
      }

      if (profileData?.department_id) {
        const { data: deptData } = await supabase
          .from('institution_departments')
          .select('name')
          .eq('id', profileData.department_id)
          .maybeSingle()
        if (deptData?.name) departmentName = deptData.name
      }

      if (profileData?.course_id) {
        const { data: courseData } = await supabase
          .from('institution_courses')
          .select('name')
          .eq('id', profileData.course_id)
          .maybeSingle()
        if (courseData?.name) programName = courseData.name
      }

      // Check cached avatar in localStorage as fallback
      let resolvedAvatar = profileData?.avatar_url || null
      if (!resolvedAvatar) {
        try {
          resolvedAvatar = localStorage.getItem(`ascendiq_avatar_${session.user.id}`) || null
        } catch {
          // ignore
        }
      }

      setProfile({
        id: profileData?.id || session.user.id,
        full_name: profileData?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
        roll_number: profileData?.roll_number || 'STU-VERIFIED',
        academic_year: profileData?.academic_year || 1,
        admission_year: profileData?.admission_year,
        institution_name: institutionName,
        department_name: departmentName,
        program_name: programName,
        account_status: effectiveStatus,
        is_verified: isApproved,
        submitted_at: reqData?.submitted_at || verifData?.submitted_at,
        reviewer_note: reqData?.reviewer_note || verifData?.reviewer_note,
        avatar_url: resolvedAvatar,
        phone: profileData?.phone,
        bio: profileData?.bio,
        skills: profileData?.skills,
        interests: profileData?.interests,
      })
      setLoadingProfile(false)
    } catch {
      setErrorMessage('Failed to connect to the database. Please retry.')
      setLoadingProfile(false)
    }
  }, [session])

  useEffect(() => {
    if (sessionLoading) return
    if (!session) {
      window.location.replace('/login')
      return
    }
    void loadStudentProfile()
  }, [session, sessionLoading, loadStudentProfile])

  useEffect(() => {
    function handleLocationChange() {
      setCurrentSection(getSectionFromPath())
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.assign('/')
  }

  function handleProfileUpdate(updated: Partial<RealStudentProfile>) {
    setProfile(prev => prev ? { ...prev, ...updated } : null)
  }

  if (sessionLoading || loadingProfile) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg-primary, #FFF8F7)', display: 'grid', placeItems: 'center', color: 'var(--deep-maroon, #4B1028)' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <img src="/assets/ascendiq-logo.jpeg" alt="AscendIQ" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>Loading Student Home Workspace…</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #6B4E58)', marginTop: 4 }}>
            Connecting to authenticated student profile and verification status
          </p>
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg-primary, #FFF8F7)', display: 'grid', placeItems: 'center', color: 'var(--deep-maroon, #4B1028)' }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 440, background: '#fff', borderRadius: 16, border: '1px solid var(--border-card, rgba(199,125,147,0.2))' }}>
          <AlertCircle size={36} style={{ color: '#C62828', marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>Unable to Load Student Workspace</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6B4E58)', marginTop: 8 }}>
            {errorMessage}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
            <button
              onClick={() => void loadStudentProfile()}
              className="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} /> Retry Connection
            </button>
            <button
              onClick={handleSignOut}
              className="button button-secondary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <StudentSuccessDashboard
      initialStudentId="STU-CS-101"
      realStudentProfile={profile}
      initialTab={currentSection}
      onSignOut={handleSignOut}
      onRefreshStatus={() => void loadStudentProfile()}
      onProfileUpdate={handleProfileUpdate}
    />
  )
}
