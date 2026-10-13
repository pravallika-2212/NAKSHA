import { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap, CheckCircle2, Clock, Target, AlertTriangle, Sparkles,
  BarChart3, Award, User, ChevronRight, X, Menu, ShieldCheck,
  FileText, Check, Info, Compass, Layers, RefreshCw, CheckSquare
} from 'lucide-react'
import { api, type StudentProfile } from '../lib/api'
import type { RealStudentProfile } from '../pages/StudentDashboardPage'
import '../styles/studentDashboard.css'
import { AcademicPerformanceView } from './student/AcademicPerformanceView'
import { AttendanceHabitsView } from './student/AttendanceHabitsView'
import { LearningActivityView } from './student/LearningActivityView'
import { EngagementClubsView } from './student/EngagementClubsView'
import { SkillsDevelopmentView } from './student/SkillsDevelopmentView'
import { CareerReadinessView } from './student/CareerReadinessView'
import { AiInsightsView } from './student/AiInsightsView'
import { StudentProfileView } from './student/StudentProfileView'

interface StudentSuccessDashboardProps {
  initialStudentId?: string
  realStudentProfile?: RealStudentProfile | null
  initialTab?: string
  onSignOut?: () => void
  onRefreshStatus?: () => void
  onProfileUpdate?: (updated: any) => void
}

export function StudentSuccessDashboard({
  initialStudentId = 'STU-CS-101',
  realStudentProfile,
  initialTab = 'overview',
  onSignOut,
  onRefreshStatus,
  onProfileUpdate
}: StudentSuccessDashboardProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId)
  const [studentData, setStudentData] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedYear, setSelectedYear] = useState<number>(3)
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(realStudentProfile?.avatar_url || null)
  const [showExplainModal, setShowExplainModal] = useState<boolean>(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [allDemoStudents, setAllDemoStudents] = useState<StudentProfile[]>([])
  const [refreshTimestamp, setRefreshTimestamp] = useState<string>('')

  // Sync activeTab when initialTab prop updates
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Sync avatar from realStudentProfile or localStorage
  useEffect(() => {
    if (realStudentProfile?.avatar_url) {
      setAvatarUrl(realStudentProfile.avatar_url)
    } else if (realStudentProfile?.id) {
      try {
        const cached = localStorage.getItem(`ascendiq_avatar_${realStudentProfile.id}`)
        if (cached) setAvatarUrl(cached)
      } catch {
        // ignore
      }
    }
  }, [realStudentProfile])

  function handleAvatarUpdate(newUrl: string | null) {
    setAvatarUrl(newUrl)
    if (realStudentProfile?.id) {
      try {
        if (newUrl) {
          localStorage.setItem(`ascendiq_avatar_${realStudentProfile.id}`, newUrl)
        } else {
          localStorage.removeItem(`ascendiq_avatar_${realStudentProfile.id}`)
        }
      } catch {
        // ignore
      }
    }
    if (onProfileUpdate) {
      onProfileUpdate({ avatar_url: newUrl })
    }
  }

  function handleNavigate(tabId: string, path: string) {
    setActiveTab(tabId)
    setIsSidebarOpen(false)
    window.history.pushState(null, '', path)
  }

  useEffect(() => {
    function onPopState() {
      const p = window.location.pathname.toLowerCase()
      if (p.includes('/student/academic')) setActiveTab('academic')
      else if (p.includes('/student/attendance')) setActiveTab('attendance')
      else if (p.includes('/student/lms')) setActiveTab('lms')
      else if (p.includes('/student/engagement')) setActiveTab('engagement')
      else if (p.includes('/student/skills')) setActiveTab('skills')
      else if (p.includes('/student/career') || p.includes('/student/placement')) setActiveTab('placement')
      else if (p.includes('/student/insights')) setActiveTab('insights')
      else if (p.includes('/student/profile')) setActiveTab('profile')
      else setActiveTab('overview')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Load demo cohort roster for switcher
  useEffect(() => {
    api.getStudents().then(res => {
      setAllDemoStudents(res.students)
    }).catch(() => {})
    const now = new Date()
    setRefreshTimestamp(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }, [])

  // Load student profile
  useEffect(() => {
    setLoading(true)
    api.getStudent(selectedStudentId).then(profile => {
      // If we have an authenticated real profile, overlay verified identity
      if (realStudentProfile && realStudentProfile.full_name) {
        const merged: StudentProfile = {
          ...profile,
          student_id: realStudentProfile.roll_number || profile.student_id,
          full_name: realStudentProfile.full_name,
          department: realStudentProfile.department_name || profile.department,
          academic_year: realStudentProfile.academic_year || profile.academic_year,
          admission_year: realStudentProfile.admission_year || profile.admission_year,
          is_sample_data: false
        }
        setStudentData(merged)
        setSelectedYear(realStudentProfile.academic_year || profile.academic_year)
      } else {
        setStudentData(profile)
        setSelectedYear(profile.academic_year)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [selectedStudentId, realStudentProfile])

  // Year objective descriptors
  const yearFocus = useMemo(() => {
    switch (selectedYear) {
      case 1:
        return {
          title: 'Year 1: Foundation & University Adaptation',
          objective: 'Build rigorous academic study habits, maintain lecture attendance, and avoid early backlogs.',
          priorityCards: ['academic', 'attendance', 'lms', 'engagement'],
          placementNotice: 'Introductory Stage: Placement assessments commence in Year 3. Focus on foundation and coding logic.'
        }
      case 2:
        return {
          title: 'Year 2: Skill Development & Consistency',
          objective: 'Strengthen core computer science concepts, participate in hackathons, and build GitHub mini-projects.',
          priorityCards: ['academic', 'skills', 'lms', 'engagement'],
          placementNotice: 'Skill Development Stage: Explore practical certifications and preliminary coding aptitude.'
        }
      case 3:
        return {
          title: 'Year 3: Career Preparation & Applied Learning',
          objective: 'Bridge academic theory with industry requirements; diagnose coding benchmarks vs. aptitude.',
          priorityCards: ['placement', 'skills', 'academic', 'attendance'],
          placementNotice: 'Pre-Placement Stage: Mock interviews, algorithmic problem-solving, and internship readiness are active.'
        }
      case 4:
      default:
        return {
          title: 'Year 4: Final-Year Placement Acceleration',
          objective: 'Meet company eligibility benchmarks, complete technical interviews, and secure campus placement offers.',
          priorityCards: ['placement', 'academic', 'attendance', 'skills'],
          placementNotice: 'Active Placement Drive: Review company cutoffs, interview rounds, and institutional verification.'
        }
    }
  }, [selectedYear])

  // Year-specific weighting profiles
  const yearWeights = useMemo(() => {
    switch (selectedYear) {
      case 1:
        return { academic: 40, attendance: 25, lms: 20, engagement: 10, skills: 5, placement: 0 }
      case 2:
        return { academic: 35, attendance: 20, lms: 15, skills: 15, engagement: 10, placement: 5 }
      case 3:
        return { academic: 30, attendance: 15, lms: 10, skills: 15, placement: 20, engagement: 5, feedback: 5 }
      case 4:
      default:
        return { academic: 25, attendance: 15, lms: 5, placement: 30, skills: 15, engagement: 5, feedback: 5 }
    }
  }, [selectedYear])

  if (loading || !studentData) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div className="sq-provenance-dot" style={{ width: 18, height: 18, animation: 'pulse 1s infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--sq-text-muted)' }}>Loading student intelligence workspace…</span>
      </div>
    )
  }

  const isRealData = Boolean(realStudentProfile?.is_verified)

  return (
    <div className="sq-dashboard-shell">
      {/* Desktop Persistent Sidebar */}
      <aside className={`sq-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <a href="/" className="sq-sidebar-brand">
          <img src="/assets/ascendiq-logo.jpeg" alt="AscendIQ Logo" />
          <div className="sq-brand-text">
            <b>ascendiq<span style={{ color: 'var(--sq-pink-soft)' }}>.</span></b>
            <small>STUDENT DASHBOARD</small>
          </div>
        </a>

        <div className="sq-sidebar-nav">
          <div className="sq-nav-group-title">Analytics Navigation</div>

          {[
            { id: 'overview', path: '/student/overview', label: 'Overview', icon: BarChart3 },
            { id: 'academic', path: '/student/academic', label: 'Academic Performance', icon: GraduationCap },
            { id: 'attendance', path: '/student/attendance', label: 'Attendance Habits', icon: CheckCircle2 },
            { id: 'lms', path: '/student/lms', label: 'Learning Activity (LMS)', icon: Clock },
            { id: 'engagement', path: '/student/engagement', label: 'Engagement & Clubs', icon: Award },
            { id: 'skills', path: '/student/skills', label: 'Skills Development', icon: Layers },
            {
              id: 'placement',
              path: selectedYear === 2 ? '/student/career' : selectedYear === 3 ? '/student/placement-prep' : selectedYear === 4 ? '/student/placement' : '/student/career',
              label: selectedYear === 2 ? 'Dream Company Roadmap' : selectedYear === 3 ? 'Placement Preparation' : selectedYear === 4 ? 'Placement Acceleration' : 'Career Readiness',
              icon: selectedYear === 2 ? Compass : selectedYear === 3 ? CheckSquare : Target,
              badge: selectedYear === 2 ? 'Year 2' : selectedYear === 3 ? 'Year 3' : selectedYear === 4 ? 'Year 4' : undefined
            },
            { id: 'insights', path: '/student/insights', label: 'AI Insights & Support', icon: Sparkles },
            { id: 'profile', path: '/student/profile', label: 'Student Profile', icon: User },
          ].map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                className={`sq-nav-item ${isActive ? 'is-active' : ''}`}
                onClick={() => handleNavigate(item.id, item.path)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge && <span className="sq-nav-badge">{item.badge}</span>}
              </button>
            )
          })}

          <div className="sq-nav-group-title" style={{ marginTop: 12 }}>Resources & Portals</div>
          <a href="/verification-pending" className="sq-nav-item">
            <ShieldCheck size={16} />
            <span>Verification Status</span>
          </a>
          <a href="/privacy" className="sq-nav-item">
            <FileText size={16} />
            <span>Data Privacy Notice</span>
          </a>
        </div>

        {/* Sidebar Footer with Monogram / Uploaded Avatar */}
        <div className="sq-sidebar-footer">
          <div
            className="sq-user-avatar"
            style={{ overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => handleNavigate('profile', '/student/profile')}
            title="View & Edit Profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={studentData.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              studentData.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div
            className="sq-user-info"
            style={{ cursor: 'pointer' }}
            onClick={() => handleNavigate('profile', '/student/profile')}
            title="View & Edit Profile"
          >
            <span className="sq-user-name">{studentData.full_name}</span>
            <span className="sq-user-role">Year {studentData.academic_year} · {studentData.department}</span>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="sq-signout-btn"
              title="Sign out of student portal"
              aria-label="Sign out"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="sq-main">
        {/* Top Sticky Header */}
        <header className="sq-topbar">
          <div className="sq-topbar-left">
            <button
              className="sq-mobile-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Navigation Drawer"
            >
              <Menu size={18} />
            </button>

            <div className="sq-breadcrumbs">
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => handleNavigate('overview', '/student/overview')}
              >
                Student Home
              </span>
              <ChevronRight size={12} />
              <b>
                {activeTab === 'overview' ? 'Overview' :
                 activeTab === 'academic' ? 'Academic Performance' :
                 activeTab === 'attendance' ? 'Attendance Habits' :
                 activeTab === 'lms' ? 'Learning Activity (LMS)' :
                 activeTab === 'engagement' ? 'Engagement & Clubs' :
                 activeTab === 'skills' ? 'Skills Development' :
                 activeTab === 'placement' ? (selectedYear === 2 ? 'Dream Company Roadmap' : selectedYear === 3 ? 'Placement Preparation' : selectedYear === 4 ? 'Placement Acceleration' : 'Career Readiness') :
                 activeTab === 'insights' ? 'AI Insights & Support' :
                 activeTab === 'profile' ? 'Student Profile' : 'Overview'}
              </b>
            </div>
          </div>

          <div className="sq-topbar-right">
            {/* Provenance Badge */}
            <span className={`sq-provenance-badge ${isRealData ? 'is-real' : 'is-demo'}`}>
              <span className="sq-provenance-dot" />
              {isRealData
                ? 'INTEGRATED DATABASE RECORD'
                : realStudentProfile
                  ? 'SAMPLE DEMO DATA (VERIFICATION PENDING)'
                  : 'DEMONSTRATION COHORT DATA'}
            </span>

            {/* Topbar User Avatar Icon linking to profile */}
            <button
              onClick={() => handleNavigate('profile', '/student/profile')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              title="Open Student Profile"
              aria-label="Student Profile"
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--sq-maroon)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontWeight: 700,
                border: '1.5px solid var(--sq-pink-soft)'
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={studentData.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  studentData.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                )}
              </div>
            </button>

            {/* Demo Cohort Scenario Selector */}
            <div className="sq-demo-selector">
              <span>Switch Student:</span>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                aria-label="Select demonstration student profile"
              >
                {allDemoStudents.map(s => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.full_name} (Year {s.academic_year} · {s.department})
                  </option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: 10, color: 'var(--sq-text-light)' }}>
              Refreshed: {refreshTimestamp}
            </span>
          </div>
        </header>

        {/* Dashboard Body Container */}
        <main className="sq-body">
          {/* Verification Status Banner for Pending Students */}
          {realStudentProfile && !realStudentProfile.is_verified && (
            <section className="sq-verification-banner" style={{
              background: realStudentProfile.account_status === 'rejected' ? '#FFEBEE' : realStudentProfile.account_status === 'needs_more_information' ? '#FFF3E0' : '#FFFDE7',
              border: `1px solid ${realStudentProfile.account_status === 'rejected' ? '#FFCDD2' : realStudentProfile.account_status === 'needs_more_information' ? '#FFE0B2' : '#FFF59D'}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
              boxShadow: '0 2px 8px rgba(75, 16, 40, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      background: realStudentProfile.account_status === 'rejected' ? '#C62828' : realStudentProfile.account_status === 'needs_more_information' ? '#E65100' : '#B78103',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      borderRadius: 6,
                      textTransform: 'uppercase'
                    }}>
                      {realStudentProfile.account_status === 'rejected' ? 'Verification Rejected' : realStudentProfile.account_status === 'needs_more_information' ? 'Action Required' : 'Institution Verification Pending'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
                      Current Status: <b style={{ textTransform: 'capitalize', color: 'var(--sq-text-main)' }}>{realStudentProfile.account_status.replace(/_/g, ' ')}</b>
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#300817', margin: '0 0 6px 0' }}>
                    Your student account is active. Your institution, program, and department are awaiting verification.
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--sq-text-muted)', margin: '0 0 12px 0' }}>
                    An authorized college reviewer must match your self-declared enrollment details to official catalog records. You have unrestricted access to explore your permitted Student Home dashboard while verification is in progress.
                  </p>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(199, 125, 147, 0.25)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 10,
                    fontSize: 11
                  }}>
                    <div>
                      <span style={{ color: 'var(--sq-text-light)', display: 'block', fontSize: 10, fontWeight: 700 }}>CLAIMED INSTITUTION</span>
                      <b style={{ color: 'var(--sq-maroon)' }}>{realStudentProfile.institution_name || 'Self-Declared College'}</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--sq-text-light)', display: 'block', fontSize: 10, fontWeight: 700 }}>CLAIMED PROGRAM & DEPT</span>
                      <b>{realStudentProfile.program_name || 'Course'} · {realStudentProfile.department_name || 'Department'}</b>
                    </div>
                    {realStudentProfile.submitted_at && (
                      <div>
                        <span style={{ color: 'var(--sq-text-light)', display: 'block', fontSize: 10, fontWeight: 700 }}>REGISTRATION DATE</span>
                        <b>{new Date(realStudentProfile.submitted_at).toLocaleDateString()}</b>
                      </div>
                    )}
                  </div>

                  {realStudentProfile.reviewer_note && (
                    <div style={{ marginTop: 10, padding: 10, background: '#FFF8E1', borderRadius: 8, border: '1px solid #FFE082', fontSize: 12 }}>
                      <b style={{ color: '#E65100' }}>Reviewer Feedback:</b> {realStudentProfile.reviewer_note}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'center' }}>
                  <a
                    href="/verification-pending"
                    className="button"
                    style={{ fontSize: 12, padding: '8px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  >
                    <ShieldCheck size={14} /> View Verification Details
                  </a>
                  {onRefreshStatus && (
                    <button
                      type="button"
                      onClick={onRefreshStatus}
                      className="button button-secondary"
                      style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <RefreshCw size={12} /> Recheck Status
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Individual Module Subviews */}
          {activeTab === 'academic' && (
            <AcademicPerformanceView
              studentData={studentData}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceHabitsView studentData={studentData} />
          )}

          {activeTab === 'lms' && (
            <LearningActivityView studentData={studentData} />
          )}

          {activeTab === 'engagement' && (
            <EngagementClubsView studentData={studentData} />
          )}

          {activeTab === 'skills' && (
            <SkillsDevelopmentView studentData={studentData} />
          )}

          {activeTab === 'placement' && (
            <CareerReadinessView
              studentData={studentData}
              selectedYear={selectedYear}
              userId={realStudentProfile?.id}
            />
          )}

          {activeTab === 'insights' && (
            <AiInsightsView studentData={studentData} />
          )}

          {activeTab === 'profile' && (
            <StudentProfileView
              studentData={studentData}
              realProfile={realStudentProfile || null}
              currentAvatarUrl={avatarUrl}
              onAvatarUpdate={handleAvatarUpdate}
              onProfileUpdate={onProfileUpdate || (() => {})}
            />
          )}

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Header Card with Student Details & Year Switcher */}
              <section className="sq-header-card">
            <div className="sq-header-top">
              <div className="sq-header-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className="sq-tag">
                    {studentData.department}
                  </span>
                  <span className="sq-tag" style={{ background: 'var(--sq-pink-soft)', color: 'var(--sq-maroon)' }}>
                    Semester {studentData.academic?.semester || (selectedYear * 2)}
                  </span>
                  {realStudentProfile?.is_verified ? (
                    <span className="sq-tag" style={{ background: '#E8F5E9', color: '#2E7D32', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Verified College Affiliation
                    </span>
                  ) : null}
                  <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
                    Roll: <b>{studentData.student_id}</b>
                  </span>
                </div>
                <h1>Welcome back, {studentData.full_name.split(' ')[0]}</h1>
                <p>
                  <span>Cohort Admission: {studentData.admission_year || '2023'}</span>
                  <span>·</span>
                  <span>Academic Cycle: 2026-2027</span>
                  <span>·</span>
                  <span style={{ color: 'var(--sq-maroon)', fontWeight: 700 }}>
                    Official Year: Year {studentData.academic_year}
                  </span>
                </p>
              </div>

              {/* Progressive Academic Year Switcher */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Progressive Academic Year View
                </span>
                <div className="sq-year-tabs" role="tablist" aria-label="Progressive Academic Year Selection">
                  {[1, 2, 3, 4].map(y => (
                    <button
                      key={y}
                      role="tab"
                      aria-selected={selectedYear === y}
                      className={`sq-year-tab ${selectedYear === y ? 'is-active' : ''}`}
                      onClick={() => setSelectedYear(y)}
                    >
                      Year {y}
                      {studentData.academic_year === y && (
                        <span className="sq-verified-year-indicator">CURRENT</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progressive Year Focus Highlight Strip */}
            <div className="sq-year-focus-strip">
              <div className="sq-year-focus-info">
                <span className="sq-year-focus-pill">{yearFocus.title}</span>
                <span className="sq-year-objective">
                  <b>Focus:</b> {yearFocus.objective}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--sq-rose-muted)', fontWeight: 600 }}>
                {yearFocus.placementNotice}
              </span>
            </div>
          </section>

          {/* 8 Key Summary Cards Grid */}
          <section className="sq-summary-grid">
            {/* 1. Student Success Score */}
            <div className="sq-summary-card sq-score-card highlight-card">
              <div className="sq-card-header">
                <span className="sq-card-label">Student Success Score</span>
                <span className={`sq-score-status-pill is-${studentData.success_status === 'available' ? 'available' : studentData.success_status === 'provisional' ? 'provisional' : 'insufficient'}`}>
                  {studentData.success_status}
                </span>
              </div>
              <div className="sq-score-gauge-wrap">
                <span className="sq-score-big">
                  {studentData.success_score !== null ? studentData.success_score : '—'}
                </span>
                <span className="sq-score-denom">/ 100</span>
              </div>
              <div className="sq-card-sub" style={{ marginTop: 4 }}>
                <Info size={12} style={{ color: 'var(--sq-rose-muted)' }} />
                <span>{studentData.data_coverage}% data coverage ({Object.keys(studentData.success_breakdown || {}).length} categories)</span>
              </div>
              <button
                className="sq-explain-link"
                onClick={() => setShowExplainModal(true)}
              >
                Explain Score Breakdown & Weights <ChevronRight size={13} />
              </button>
            </div>

            {/* 2. Academic Performance */}
            <div className="sq-summary-card">
              <div className="sq-card-header">
                <span className="sq-card-label">Academic CGPA</span>
                <span className="sq-card-icon"><GraduationCap size={16} /></span>
              </div>
              <div className="sq-card-val">
                {studentData.academic?.cgpa !== undefined && studentData.academic?.cgpa !== null ? studentData.academic.cgpa.toFixed(2) : 'Pending'}
              </div>
              <div className="sq-card-sub">
                <span>{studentData.academic?.marks_percentage || 0}% marks average</span>
                <span>·</span>
                <b style={{ color: (studentData.academic?.backlog_count || 0) > 0 ? 'var(--sq-danger)' : 'var(--sq-success)' }}>
                  {studentData.academic?.backlog_count || 0} backlogs
                </b>
              </div>
            </div>

            {/* 3. Attendance */}
            <div className="sq-summary-card">
              <div className="sq-card-header">
                <span className="sq-card-label">Lecture Attendance</span>
                <span className="sq-card-icon"><CheckCircle2 size={16} /></span>
              </div>
              <div className="sq-card-val">
                {studentData.attendance?.percentage !== undefined && studentData.attendance?.percentage !== null ? `${studentData.attendance.percentage}%` : 'Pending'}
              </div>
              <div className="sq-card-sub">
                <span style={{ color: (studentData.attendance?.percentage || 0) >= 75 ? 'var(--sq-success)' : 'var(--sq-danger)', fontWeight: 700 }}>
                  {(studentData.attendance?.percentage || 0) >= 75 ? '✓ Compliant' : '⚠ Below 75% Cutoff'}
                </span>
                <span>·</span>
                <span>{studentData.attendance?.classes_attended || 0}/{studentData.attendance?.classes_held || 0} classes</span>
              </div>
            </div>

            {/* 4. Learning Activity (LMS) */}
            <div className="sq-summary-card">
              <div className="sq-card-header">
                <span className="sq-card-label">LMS Coursework</span>
                <span className="sq-card-icon"><Clock size={16} /></span>
              </div>
              <div className="sq-card-val">
                {studentData.lms?.completion_rate !== undefined && studentData.lms?.completion_rate !== null ? `${studentData.lms.completion_rate}%` : 'Pending'}
              </div>
              <div className="sq-card-sub">
                <span>{studentData.lms?.active_minutes || 0} mins active/week</span>
                <span>·</span>
                <span style={{ color: (studentData.lms?.overdue || 0) > 0 ? 'var(--sq-danger)' : 'var(--sq-success)', fontWeight: 600 }}>
                  {studentData.lms?.overdue || 0} overdue
                </span>
              </div>
            </div>

            {/* 5. Co-Curricular Engagement */}
            <div className="sq-summary-card">
              <div className="sq-card-header">
                <span className="sq-card-label">Campus Engagement</span>
                <span className="sq-card-icon"><Award size={16} /></span>
              </div>
              <div className="sq-card-val">
                {studentData.engagement ? (studentData.engagement.events * 15 + studentData.engagement.clubs * 20 + studentData.engagement.hackathons * 35 + studentData.engagement.certs * 30) : 0}
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sq-text-light)' }}> pts</span>
              </div>
              <div className="sq-card-sub">
                <span>{studentData.engagement?.hackathons || 0} hackathons</span>
                <span>·</span>
                <span>{studentData.engagement?.certs || 0} certs</span>
                <span>·</span>
                <span>{studentData.engagement?.clubs || 0} clubs</span>
              </div>
            </div>

            {/* 6. Placement Readiness (Priority for Year 3 & 4) */}
            <div className={`sq-summary-card ${selectedYear >= 3 ? 'highlight-card' : ''}`}>
              <div className="sq-card-header">
                <span className="sq-card-label">
                  {selectedYear === 4 ? 'Placement Readiness (Yr 4)' : selectedYear === 3 ? 'Pre-Placement Prep (Yr 3)' : 'Aptitude Diagnostic'}
                </span>
                <span className="sq-card-icon"><Target size={16} /></span>
              </div>
              <div className="sq-card-val">
                {studentData.placement ? `${studentData.placement.coding_percentage}%` : 'Diagnostic'}
              </div>
              <div className="sq-card-sub">
                <span>Coding: {studentData.placement?.coding_percentage || 0}%</span>
                <span>·</span>
                <span>Aptitude: {studentData.placement?.aptitude_percentage || 0}%</span>
              </div>
            </div>

            {/* 7. Student Risk Status */}
            <div className="sq-summary-card">
              <div className="sq-card-header">
                <span className="sq-card-label">Advising Risk Status</span>
                <span className="sq-card-icon"><AlertTriangle size={16} /></span>
              </div>
              <div className="sq-card-val">
                <span className={`sq-risk-pill risk-${(studentData.risk_category || 'low').toLowerCase()}`}>
                  {studentData.risk_category || 'Low'} Concern
                </span>
              </div>
              <div className="sq-card-sub">
                <span>{studentData.risk_score} risk points</span>
                <span>·</span>
                <span>{studentData.risk_factors?.length || 0} warning signals</span>
              </div>
            </div>

            {/* 8. Skills Index */}
            <div className="sq-summary-card">
              <div className="sq-card-header">
                <span className="sq-card-label">Skills Mastery Index</span>
                <span className="sq-card-icon"><Layers size={16} /></span>
              </div>
              <div className="sq-card-val">
                {studentData.placement?.technical_skill_score || 75}%
              </div>
              <div className="sq-card-sub">
                <span>Technical: {studentData.placement?.technical_skill_score || 0}%</span>
                <span>·</span>
                <span>Soft Skills: {studentData.placement?.communication_skill_score || 0}%</span>
              </div>
            </div>
          </section>

          {/* Student Segmentation Banner */}
          <section style={{ background: '#fff', border: '1px solid var(--sq-border-light)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sq-pink-subtle)', color: 'var(--sq-maroon)', display: 'grid', placeItems: 'center' }}>
                <Compass size={20} />
              </div>
              <div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sq-rose-muted)' }}>
                  Student Success Segmentation
                </span>
                <h4 style={{ margin: 0, fontSize: 14, color: 'var(--sq-maroon)', fontWeight: 800 }}>
                  {studentData.segment_label}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--sq-text-muted)' }}>
                  {studentData.segment_reason}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--sq-text-light)', background: 'var(--sq-bg-base)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)' }}>
              Deterministic Institutional Segment
            </span>
          </section>

          {/* Year-Specific Content & Progressive Deep Dives */}
          {selectedYear === 4 && (
            /* Dedicated Final-Year Placement Acceleration View */
            <section style={{ marginBottom: 24 }}>
              <div className="sq-panel" style={{ border: '1.5px solid var(--sq-rose-muted)', background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDFE 100%)' }}>
                <div className="sq-panel-header">
                  <div className="sq-panel-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="sq-tag" style={{ background: 'var(--sq-maroon)', color: '#fff' }}>FINAL YEAR EXCLUSIVE</span>
                      <h3>Campus Placement Readiness & Recruitment Pipeline</h3>
                    </div>
                    <small>Real-time corporate eligibility benchmarks, diagnostic test results, and mock interview feedback</small>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="sq-provenance-badge is-real">Tier-1 Drive Open</span>
                  </div>
                </div>

                <div className="sq-grid-2col" style={{ marginBottom: 16 }}>
                  {/* Readiness Breakdown Bars */}
                  <div>
                    <h4 style={{ fontSize: 12, color: 'var(--sq-maroon)', marginBottom: 12, fontWeight: 700 }}>
                      Placement Readiness Score Components
                    </h4>

                    {[
                      { label: 'Technical Coding Assessment', val: studentData.placement?.coding_percentage || 0, benchmark: 'Target: ≥ 50%' },
                      { label: 'Quantitative Aptitude Test', val: studentData.placement?.aptitude_percentage || 0, benchmark: 'Target: ≥ 50%' },
                      { label: 'Technical Mock Interview', val: studentData.placement?.mock_interview_score || 0, benchmark: 'Target: ≥ 60%' },
                      { label: 'Domain Technical Knowledge', val: studentData.placement?.technical_skill_score || 0, benchmark: 'Target: ≥ 70%' },
                      { label: 'Communication & HR Round', val: studentData.placement?.communication_skill_score || 0, benchmark: 'Target: ≥ 70%' },
                    ].map(bar => (
                      <div key={bar.label} className="sq-bar-row">
                        <div className="sq-bar-header">
                          <span style={{ color: 'var(--sq-text-main)' }}>{bar.label}</span>
                          <span style={{ color: 'var(--sq-rose-muted)' }}>{bar.val}% <small style={{ color: '#888' }}>({bar.benchmark})</small></span>
                        </div>
                        <div className="sq-bar-track">
                          <div
                            className={`sq-bar-fill ${bar.val >= 70 ? 'fill-green' : bar.val >= 50 ? 'fill-amber' : 'fill-rose'}`}
                            style={{ width: `${Math.min(100, bar.val)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Company Benchmark Eligibility */}
                  <div>
                    <h4 style={{ fontSize: 12, color: 'var(--sq-maroon)', marginBottom: 12, fontWeight: 700 }}>
                      Verified Company Tier Eligibility Criteria
                    </h4>

                    {(studentData.placement_details?.tier_eligibility || [
                      { tier: 'Tier-1 Product Companies (₹18-40 LPA)', min_cgpa: 8.5, min_coding: 80, eligible: (studentData.academic?.cgpa || 0) >= 8.5 && (studentData.placement?.coding_percentage || 0) >= 80, note: 'Requires CGPA ≥ 8.5 and Coding ≥ 80%' },
                      { tier: 'Tier-2 Technology Core (₹10-18 LPA)', min_cgpa: 7.5, min_coding: 65, eligible: (studentData.academic?.cgpa || 0) >= 7.5 && (studentData.placement?.coding_percentage || 0) >= 65, note: 'Requires CGPA ≥ 7.5 and Coding ≥ 65%' },
                      { tier: 'Global IT Services & Consulting (₹4.5-9 LPA)', min_cgpa: 6.5, min_coding: 50, eligible: (studentData.academic?.cgpa || 0) >= 6.5 && (studentData.placement?.coding_percentage || 0) >= 50, note: 'Requires CGPA ≥ 6.5 and Coding ≥ 50%' },
                    ]).map(tier => (
                      <div
                        key={tier.tier}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: tier.eligible ? 'var(--sq-success-bg)' : '#FFF8F7',
                          border: `1px solid ${tier.eligible ? 'rgba(30, 126, 52, 0.25)' : 'var(--sq-border-light)'}`,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: tier.eligible ? 'var(--sq-success)' : 'var(--sq-maroon)' }}>
                            {tier.tier}
                          </div>
                          <small style={{ fontSize: 10, color: 'var(--sq-text-muted)' }}>{tier.note}</small>
                        </div>
                        <span className={`sq-tag ${tier.eligible ? 'is-real' : ''}`} style={{ fontSize: 10 }}>
                          {tier.eligible ? '✓ Eligible' : 'In Progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prioritized Placement Preparation Checklist */}
                <div style={{ borderTop: '1px solid var(--sq-border-light)', paddingTop: 14 }}>
                  <h4 style={{ fontSize: 12, color: 'var(--sq-maroon)', marginBottom: 10, fontWeight: 700 }}>
                    Prioritized Final-Year Placement Checklist
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    {(studentData.placement_details?.checklist || [
                      { task: 'Institutional Resume Verification & Sign-off', completed: true, category: 'Profile' },
                      { task: 'Mock Technical Interview (Data Structures & Systems)', completed: true, category: 'Interview' },
                      { task: 'Algorithmic Problem-Solving Speed Drills', completed: (studentData.placement?.coding_percentage || 0) >= 50, category: 'Preparation' },
                      { task: 'Mock Behavioral & Leadership Round', completed: true, category: 'Interview' },
                    ]).map(chk => (
                      <div
                        key={chk.task}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: '#fff',
                          border: '1px solid var(--sq-border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 11
                        }}
                      >
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: chk.completed ? 'var(--sq-success-bg)' : 'var(--sq-bg-subtle)',
                          color: chk.completed ? 'var(--sq-success)' : 'var(--sq-rose-muted)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}>
                          {chk.completed ? <Check size={12} /> : <Clock size={12} />}
                        </div>
                        <span style={{ color: chk.completed ? 'var(--sq-text-muted)' : 'var(--sq-maroon)', textDecoration: chk.completed ? 'line-through' : 'none' }}>
                          {chk.task}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Main 2-Column Analytics Grid */}
          <div className="sq-grid-2col">
            {/* Column 1: Academic Progression & Subject Performance */}
            <div className="sq-panel">
              <div className="sq-panel-header">
                <div className="sq-panel-title">
                  <h3>Subject-Wise Performance & Course Credits</h3>
                  <small>Verified semester grade records and marks distribution</small>
                </div>
                <span className="sq-tag">
                  CGPA: {studentData.academic?.cgpa || '8.92'}
                </span>
              </div>

              {studentData.subjects && studentData.subjects.length > 0 ? (
                <div className="sq-table-wrap">
                  <table className="sq-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Marks</th>
                        <th>Attendance</th>
                        <th>Credits</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData.subjects.map(sub => (
                        <tr key={sub.code}>
                          <td><b>{sub.code}</b></td>
                          <td>{sub.name}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: sub.marks >= 75 ? 'var(--sq-success)' : sub.marks >= 50 ? 'var(--sq-warning)' : 'var(--sq-danger)' }}>
                              {sub.marks}/{sub.max_marks}
                            </span>
                          </td>
                          <td>{sub.attendance}%</td>
                          <td>{sub.credits}</td>
                          <td>
                            <span className="sq-tag" style={{
                              background: sub.grade.includes('A') ? 'var(--sq-success-bg)' : sub.grade === 'F' ? 'var(--sq-danger-bg)' : 'var(--sq-bg-subtle)',
                              color: sub.grade.includes('A') ? 'var(--sq-success)' : sub.grade === 'F' ? 'var(--sq-danger)' : 'var(--sq-maroon)'
                            }}>
                              {sub.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--sq-bg-base)', borderRadius: 10, fontSize: 12, color: 'var(--sq-text-muted)' }}>
                  <GraduationCap size={24} style={{ margin: '0 auto 8px', color: 'var(--sq-rose-muted)' }} />
                  <div>Subject breakdown awaiting official institution semester grade integration.</div>
                  <small style={{ color: '#888' }}>Verified overall CGPA ({studentData.academic?.cgpa || 'N/A'}) is recorded in academic ledger.</small>
                </div>
              )}

              {/* Multi-Semester GPA Progression */}
              {studentData.semester_history && studentData.semester_history.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--sq-border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)' }}>
                      Multi-Semester GPA Progression
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--sq-text-muted)' }}>
                      {studentData.semester_history.length} Semesters Recorded
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                    {studentData.semester_history.map(sem => (
                      <div
                        key={sem.semester}
                        style={{
                          flex: 1,
                          minWidth: 64,
                          padding: '10px 8px',
                          borderRadius: 8,
                          background: 'var(--sq-bg-base)',
                          border: '1px solid var(--sq-border-light)',
                          textAlign: 'center'
                        }}
                      >
                        <small style={{ fontSize: 9, color: 'var(--sq-text-muted)', display: 'block' }}>Sem {sem.semester}</small>
                        <b style={{ fontSize: 14, color: 'var(--sq-maroon)', display: 'block', margin: '2px 0' }}>{sem.gpa.toFixed(2)}</b>
                        <span style={{ fontSize: 8, color: 'var(--sq-rose-muted)' }}>{sem.credits} credits</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Technical & Soft Skills Mastery */}
            <div className="sq-panel">
              <div className="sq-panel-header">
                <div className="sq-panel-title">
                  <h3>Skills Mastery & Verified Competencies</h3>
                  <small>Diagnostic assessments, coding labs, and soft-skill rubrics</small>
                </div>
                <span className="sq-tag">
                  {studentData.skills?.technical.length || 4} Verified Skills
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Core Technical Competencies
                </h4>
                {(studentData.skills?.technical || [
                  { name: 'Algorithms & Problem Solving', score: studentData.placement?.coding_percentage || 45, status: 'developing' },
                  { name: 'Operating Systems & Concurrency', score: 88, status: 'mastered' },
                  { name: 'Database Architecture & SQL', score: 82, status: 'mastered' },
                  { name: 'Python & Software Engineering', score: 76, status: 'mastered' },
                ]).map(sk => (
                  <div key={sk.name} className="sq-bar-row">
                    <div className="sq-bar-header">
                      <span>{sk.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>{sk.score}%</span>
                    </div>
                    <div className="sq-bar-track">
                      <div
                        className={`sq-bar-fill ${sk.score >= 80 ? 'fill-maroon' : sk.score >= 50 ? 'fill-rose' : 'fill-pink'}`}
                        style={{ width: `${sk.score}%` }}
                      />
                    </div>
                  </div>
                ))}

                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Professional & Soft Skills
                </h4>
                {(studentData.skills?.soft || [
                  { name: 'Technical Interview Articulation', score: studentData.placement?.communication_skill_score || 75, status: 'mastered' },
                  { name: 'Peer Collaboration & Code Reviews', score: 85, status: 'mastered' },
                ]).map(sk => (
                  <div key={sk.name} className="sq-bar-row">
                    <div className="sq-bar-header">
                      <span>{sk.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>{sk.score}%</span>
                    </div>
                    <div className="sq-bar-track">
                      <div
                        className="sq-bar-fill fill-green"
                        style={{ width: `${sk.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Faculty Advisory & Feedback */}
              {studentData.feedback && (
                <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--sq-bg-base)', border: '1px solid var(--sq-border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-maroon)', textTransform: 'uppercase' }}>
                      Faculty Mentor Feedback
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sq-success)' }}>
                      ★ {studentData.feedback.faculty_rating}% Rating
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--sq-text-muted)', fontStyle: 'italic', lineHeight: 1.45 }}>
                    "{studentData.feedback.faculty_note}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Explainable Risk Signals & Personalized Recommendations */}
          <div className="sq-grid-2col" style={{ marginTop: 24 }}>
            {/* Risk Warnings Panel */}
            <div className="sq-panel">
              <div className="sq-panel-header">
                <div className="sq-panel-title">
                  <h3>Early Warning Signals & Risk Rules</h3>
                  <small>Transparent threshold evaluation to trigger proactive student advising</small>
                </div>
                <span className={`sq-risk-pill risk-${(studentData.risk_category || 'low').toLowerCase()}`}>
                  {studentData.risk_category} Risk
                </span>
              </div>

              {studentData.risk_factors && studentData.risk_factors.length > 0 ? (
                studentData.risk_factors.map(rf => (
                  <div key={rf.indicator} className={`sq-risk-card severity-${rf.severity.toLowerCase()}`}>
                    <div className="sq-risk-header">
                      <span style={{ color: 'var(--sq-maroon)' }}>{rf.indicator}</span>
                      <span className="sq-tag" style={{ background: '#fff' }}>
                        +{rf.points} pts
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--sq-text-main)', margin: '3px 0' }}>
                      {rf.explanation}
                    </div>
                    <div className="sq-risk-rule">
                      <b>Rule:</b> {rf.rule} (Observed: {rf.observed_value} vs Cutoff: {rf.threshold})
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--sq-success-bg)', borderRadius: 10, color: 'var(--sq-success)' }}>
                  <CheckCircle2 size={24} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: 13 }}>No Critical Early Warnings Active</div>
                  <small style={{ color: 'var(--sq-text-muted)' }}>
                    Attendance, course progress, and academic marks are meeting institutional thresholds.
                  </small>
                </div>
              )}
            </div>

            {/* Personalized Recommendations Panel */}
            <div className="sq-panel">
              <div className="sq-panel-header">
                <div className="sq-panel-title">
                  <h3>Personalized AI Recommendations</h3>
                  <small>Evidence-grounded action items to accelerate academic & career success</small>
                </div>
                <span className="sq-tag">
                  {studentData.recommendations?.length || 0} Actions
                </span>
              </div>

              {studentData.recommendations && studentData.recommendations.length > 0 ? (
                studentData.recommendations.map(rec => (
                  <div key={rec.recommended_action} className="sq-rec-card">
                    <div className="sq-rec-top">
                      <span className="sq-rec-action">{rec.action_type}</span>
                      <span className={`sq-tag ${rec.priority === 'High' ? 'is-demo' : ''}`}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <div className="sq-rec-evidence">
                      {rec.recommended_action}
                    </div>
                    <div className="sq-rec-meta">
                      <span>Evidence: {rec.evidence}</span>
                      <span>·</span>
                      <span>Owner: {rec.responsible_role}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--sq-bg-base)', borderRadius: 10, fontSize: 12, color: 'var(--sq-text-muted)' }}>
                  <Sparkles size={24} style={{ margin: '0 auto 8px', color: 'var(--sq-rose-muted)' }} />
                  <div>All current recommendations completed!</div>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </main>
      </div>

      {/* Explainable Student Success Score Modal */}
      {showExplainModal && (
        <div className="sq-modal-overlay" onClick={() => setShowExplainModal(false)}>
          <div className="sq-modal-panel" onClick={e => e.stopPropagation()}>
            <div className="sq-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--sq-maroon)', fontWeight: 800 }}>
                  Explainable Student Success Score Methodology
                </h3>
                <small style={{ color: 'var(--sq-text-muted)' }}>
                  Mathematical formula, component weighting, and missing-data normalization
                </small>
              </div>
              <button
                className="sq-close-btn"
                onClick={() => setShowExplainModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 10, background: 'var(--sq-bg-subtle)', border: '1px solid var(--sq-border-light)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                Formula & Year {selectedYear} Weighting Profile:
              </div>
              <div style={{ fontSize: 11, color: 'var(--sq-text-muted)', lineHeight: 1.5 }}>
                Success Score = ∑ [ (Observed Normalized Metric × Configured Component Weight) / ∑ Available Weights ]
                <div style={{ marginTop: 4, fontWeight: 600, color: 'var(--sq-maroon)' }}>
                  Year {selectedYear} Configured Weights: Academic {yearWeights.academic}%, Attendance {yearWeights.attendance}%, LMS {yearWeights.lms}%, Placement {yearWeights.placement}%, Skills {yearWeights.skills}%, Engagement {yearWeights.engagement}%
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--sq-rose-muted)', marginTop: 4 }}>
                <b>Missing Data Policy:</b> If a category has no recorded data, its configured weight is re-normalized across available categories. Missing records are NEVER silently treated as zero.
              </div>
            </div>

            {/* Components Breakdown Table */}
            <div className="sq-table-wrap">
              <table className="sq-table">
                <thead>
                  <tr>
                    <th>Indicator Group</th>
                    <th>Observed Raw</th>
                    <th>Configured Weight</th>
                    <th>Score Contribution</th>
                    <th>Coverage Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(studentData.success_breakdown || {}).map(([key, item]) => (
                    <tr key={key}>
                      <td><b>{item.name}</b></td>
                      <td>
                        {item.observed_value !== null ? `${item.observed_value}` : <i style={{ color: '#999' }}>Missing</i>}
                      </td>
                      <td>{item.weight_pct}%</td>
                      <td>
                        <b style={{ color: 'var(--sq-maroon)' }}>
                          {item.weighted_contribution !== null ? `+${item.weighted_contribution.toFixed(1)} pts` : '—'}
                        </b>
                      </td>
                      <td>
                        <span className={`sq-tag ${item.is_missing ? 'is-demo' : 'is-real'}`} style={{ fontSize: 10 }}>
                          {item.is_missing ? 'Pending Upload' : 'Verified Available'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--sq-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
                Overall Data Coverage: <b>{studentData.data_coverage}%</b>
              </span>
              <button
                className="sq-tag"
                style={{ background: 'var(--sq-maroon)', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px' }}
                onClick={() => setShowExplainModal(false)}
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
