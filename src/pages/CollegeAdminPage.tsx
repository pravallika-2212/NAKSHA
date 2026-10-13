import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Users, FileText, Clock, Bell,
  ShieldCheck, Search, ArrowRight, BookOpen, Layers
} from 'lucide-react'
import { collegeService, type Assignment, type AcademicHourRecord, type ClubNotification } from '../lib/collegeService'
import { api, type StudentProfile } from '../lib/api'
import { TrustedReviewerPortal } from '../components/TrustedReviewerPortal'

type AdminTab = 'overview' | 'branches' | 'assignments' | 'faculty' | 'clubs' | 'verifications'

export default function CollegeAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [hourRecords, setHourRecords] = useState<AcademicHourRecord[]>([])
  const [clubNotifs, setClubNotifs] = useState<ClubNotification[]>([])
  const [, setLoading] = useState(true)

  // Branch-wise selection
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Science & Engineering')
  const [searchFaculty, setSearchFaculty] = useState<string>('')
  const [searchAssignment, setSearchAssignment] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      collegeService.getCollegeAdminStats(),
      api.getStudents(),
      collegeService.getAssignments(),
      collegeService.getHourRecords(),
      collegeService.getClubNotifications()
    ]).then(([st, studRes, asgs, hrs, notifs]) => {
      if (cancelled) return
      setStats(st)
      setStudents(studRes.students || [])
      setAssignments(asgs)
      setHourRecords(hrs)
      setClubNotifs(notifs)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // Branch-specific student filtering
  const branchStudents = useMemo(() => {
    return students.filter(s =>
      s.department.toLowerCase().includes(selectedBranch.toLowerCase()) ||
      selectedBranch.toLowerCase().includes(s.department.toLowerCase())
    )
  }, [students, selectedBranch])

  const branchAssignments = useMemo(() => {
    return assignments.filter(a =>
      a.branch.toLowerCase().includes(selectedBranch.toLowerCase()) ||
      selectedBranch.toLowerCase().includes(a.branch.toLowerCase())
    )
  }, [assignments, selectedBranch])

  const branchHours = useMemo(() => {
    return hourRecords.filter(h =>
      h.branch.toLowerCase().includes(selectedBranch.toLowerCase()) ||
      selectedBranch.toLowerCase().includes(h.branch.toLowerCase())
    )
  }, [hourRecords, selectedBranch])

  // Faculty Directory List
  const facultyMembers = useMemo(() => {
    return [
      { id: 'FAC-CS-042', name: 'Dr. Ramesh Sharma', dept: 'Computer Science & Engineering', designation: 'Associate Professor & CS Chair', hours: 48, assignments: 3, classes: 'Year 3 (A, B) & Year 4 (A)' },
      { id: 'FAC-CS-019', name: 'Prof. Anita Desai', dept: 'Computer Science & Engineering', designation: 'Professor & TPO Lead', hours: 36, assignments: 2, classes: 'Year 4 (A, B)' },
      { id: 'FAC-AI-011', name: 'Dr. Vikramaditya Rao', dept: 'Artificial Intelligence & Data Science', designation: 'Associate Professor & AI Lab Head', hours: 42, assignments: 2, classes: 'Year 2 (A) & Year 3 (A)' },
      { id: 'FAC-EC-027', name: 'Dr. Sunita Kulkarni', dept: 'Electronics & Communication Engineering', designation: 'Professor & Hardware Systems Lead', hours: 38, assignments: 1, classes: 'Year 3 (A, B)' },
      { id: 'FAC-ME-008', name: 'Prof. Rajesh Nair', dept: 'Mechanical Engineering', designation: 'Assistant Professor & Design Chair', hours: 30, assignments: 1, classes: 'Year 2 (A)' },
    ]
  }, [])

  const filteredFaculty = useMemo(() => {
    if (!searchFaculty.trim()) return facultyMembers
    const q = searchFaculty.toLowerCase()
    return facultyMembers.filter(f => f.name.toLowerCase().includes(q) || f.dept.toLowerCase().includes(q) || f.id.toLowerCase().includes(q))
  }, [facultyMembers, searchFaculty])

  const filteredAssignments = useMemo(() => {
    if (!searchAssignment.trim()) return assignments
    const q = searchAssignment.toLowerCase()
    return assignments.filter(a => a.title.toLowerCase().includes(q) || a.branch.toLowerCase().includes(q) || a.faculty_name.toLowerCase().includes(q))
  }, [assignments, searchAssignment])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="header is-scrolled" style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255, 248, 247, 0.98)', borderBottom: '1px solid var(--border-card)' }}>
        <div className="header-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <a href="/" className="brand" aria-label="Ascendiq Home">
              <img src="/assets/ascendiq-logo.jpeg" alt="Ascendiq Logo" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <span>ascendiq<small>COLLEGE ADMIN PORTAL</small></span>
            </a>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#1E40AF' }}>
              <ShieldCheck size={13} color="#2563EB" />
              Verified Institution Leader Access
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="/faculty"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--deep-maroon)',
                textDecoration: 'none',
                background: 'var(--soft-cloud)',
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-card)'
              }}
            >
              <BookOpen size={14} /> Faculty Workspace
            </a>
            <a
              href="/college/login"
              style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '6px 12px' }}
            >
              Switch Role / Logout
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ maxWidth: 1280, margin: '20px auto', width: '100%', padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Banner with Global Tab Navigation */}
        <div style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93C5FD', fontWeight: 700 }}>
                <Building2 size={14} /> ASCENDIQ Engineering Institute &bull; Institutional Overview
              </div>
              <h1 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 800, color: '#F8FAFC' }}>
                College Administration &amp; Academic Governance
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#CBD5E1' }}>
                Comprehensive cross-departmental analytics, branch activity monitoring, assignment compliance, and registration audits.
              </p>
            </div>

            {/* Verification Queue Quick Notice */}
            <button
              onClick={() => setActiveTab('verifications')}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '10px 16px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left'
              }}
            >
              <ShieldCheck size={20} color="#FBBF24" />
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#FBBF24', fontWeight: 700 }}>Verification Queue</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>3 Pending Requests</div>
              </div>
              <ArrowRight size={14} color="#93C5FD" />
            </button>
          </div>

          {/* Admin Navigation Tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { id: 'overview', label: 'A. College Overview', icon: Building2 },
              { id: 'branches', label: 'B. Branch-wise Overview', icon: Layers },
              { id: 'assignments', label: 'C. Assignment Monitoring', icon: FileText },
              { id: 'faculty', label: 'D. Faculty Activity', icon: Users },
              { id: 'clubs', label: 'E. Club Activity', icon: Bell },
              { id: 'verifications', label: 'F. Registration Audits', icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#0F172A' : '#F8FAFC',
                    background: isSelected ? '#F8FAFC' : 'rgba(255,255,255,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={15} color={isSelected ? '#0F172A' : '#93C5FD'} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB A: COLLEGE OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <Users size={14} color="var(--deep-maroon)" /> Total Registered Students
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 6 }}>
                  {stats?.totalStudents || 42}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verified active database records</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <BookOpen size={14} color="#0284C7" /> Total Faculty Members
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0284C7', marginTop: 6 }}>
                  {stats?.totalFaculty || 54}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Appointed across all departments</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <Building2 size={14} color="#166534" /> Active Academic Branches
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#166534', marginTop: 6 }}>
                  {stats?.totalBranches || 4}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CSE, AIDS, ECE, MECH</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <Clock size={14} color="#7C3AED" /> Recorded Academic Hours
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#7C3AED', marginTop: 6 }}>
                  {hourRecords.reduce((s, h) => s + Number(h.hours), 0)} hrs
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Teaching effort documented</div>
              </div>
            </div>

            {/* Middle Row: Year Breakdown & Assignment Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
              
              {/* Student Counts by Academic Year */}
              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Student Distribution by Academic Year
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Year 1 (Freshmen Cohort)', count: stats?.studentsByYear?.year1 || 8, pct: 20 },
                    { label: 'Year 2 (Sophomore Cohort)', count: stats?.studentsByYear?.year2 || 10, pct: 25 },
                    { label: 'Year 3 (Junior Cohort)', count: stats?.studentsByYear?.year3 || 14, pct: 35 },
                    { label: 'Year 4 (Senior / Placement Cohort)', count: stats?.studentsByYear?.year4 || 10, pct: 20 },
                  ].map(y => (
                    <div key={y.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        <span>{y.label}</span>
                        <span>{y.count} Students ({y.pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--soft-cloud)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${y.pct * 2.5}%`, background: 'var(--deep-maroon)', borderRadius: 9999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment & Compliance Summary */}
              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Assignments &amp; Submission Progress
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Published Tasks</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>{assignments.length}</div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Submissions</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#166534', marginTop: 4 }}>{stats?.totalSubmissions || 2}</div>
                  </div>
                </div>

                <div style={{ marginTop: 16, background: '#FFF8F7', border: '1px solid var(--border-light)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                    <span>Institution-wide Submission Rate</span>
                    <span style={{ color: 'var(--deep-maroon)' }}>{stats?.overallSubmissionRate || 68}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--soft-cloud)', borderRadius: 9999, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${stats?.overallSubmissionRate || 68}%`, background: 'var(--deep-maroon)' }} />
                  </div>
                </div>
              </div>

            </div>

            {/* Department Summary Table */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Active Academic Branches Summary
                </h3>
                <button
                  onClick={() => setActiveTab('branches')}
                  style={{ background: 'none', border: 'none', color: 'var(--deep-maroon)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Inspect Branch Details &rarr;
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border-card)', color: 'var(--deep-maroon)' }}>
                      <th style={{ padding: '10px 14px' }}>Branch / Department</th>
                      <th style={{ padding: '10px 14px' }}>Code</th>
                      <th style={{ padding: '10px 14px' }}>Faculty Count</th>
                      <th style={{ padding: '10px 14px' }}>Students Enrolled</th>
                      <th style={{ padding: '10px 14px' }}>Published Assignments</th>
                      <th style={{ padding: '10px 14px' }}>Teaching Hours Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.branches || []).map((b: any) => (
                      <tr key={b.code} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--deep-maroon)' }}>{b.name}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{b.code}</td>
                        <td style={{ padding: '12px 14px' }}>{b.facultyCount}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{b.studentsCount}</td>
                        <td style={{ padding: '12px 14px' }}>{b.assignmentsCount}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{b.hoursLogged} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB B: BRANCH-WISE OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'branches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Branch Selector */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Select Department to Inspect
              </label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                style={{ width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 15, fontWeight: 800, color: 'var(--deep-maroon)', background: 'var(--bg-primary)' }}
              >
                <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                <option value="Artificial Intelligence & Data Science">Artificial Intelligence &amp; Data Science</option>
                <option value="Electronics & Communication Engineering">Electronics &amp; Communication Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
              </select>
            </div>

            {/* Branch KPI Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Students</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>{branchStudents.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Registered in {selectedBranch}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Assignments</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0284C7', marginTop: 4 }}>{branchAssignments.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Targeted to branch cohorts</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recorded Hours</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#166534', marginTop: 4 }}>
                  {branchHours.reduce((s, h) => s + Number(h.hours), 0)} hrs
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Logged by branch faculty</div>
              </div>
            </div>

            {/* Students by Year and Section in this Branch */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                Cohort Roster for {selectedBranch}
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border-card)', color: 'var(--deep-maroon)' }}>
                      <th style={{ padding: '10px 14px' }}>Roll Number</th>
                      <th style={{ padding: '10px 14px' }}>Student Name</th>
                      <th style={{ padding: '10px 14px' }}>Year</th>
                      <th style={{ padding: '10px 14px' }}>Section</th>
                      <th style={{ padding: '10px 14px' }}>Attendance</th>
                      <th style={{ padding: '10px 14px' }}>CGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchStudents.map(st => (
                      <tr key={st.student_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{st.student_id}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--deep-maroon)' }}>{st.full_name}</td>
                        <td style={{ padding: '10px 14px' }}>Year {st.academic_year}</td>
                        <td style={{ padding: '10px 14px' }}>Section {st.section || 'A'}</td>
                        <td style={{ padding: '10px 14px' }}>{(st.attendance?.percentage || 85).toFixed(1)}%</td>
                        <td style={{ padding: '10px 14px' }}>{(st.academic?.cgpa || 8.0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB C: ASSIGNMENT MONITORING */}
        {/* ========================================================================= */}
        {activeTab === 'assignments' && (
          <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Institution-Wide Assignment Monitoring
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Inspect assignment status, faculty ownership, eligible student volume, and submission completion rates.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="text"
                  placeholder="Filter by title, faculty, or branch..."
                  value={searchAssignment}
                  onChange={e => setSearchAssignment(e.target.value)}
                  style={{ padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, width: 260, background: 'var(--bg-primary)' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border-card)', color: 'var(--deep-maroon)' }}>
                    <th style={{ padding: '10px 14px' }}>Assignment Title</th>
                    <th style={{ padding: '10px 14px' }}>Faculty Instructor</th>
                    <th style={{ padding: '10px 14px' }}>Target Cohort</th>
                    <th style={{ padding: '10px 14px' }}>Due Date</th>
                    <th style={{ padding: '10px 14px' }}>Eligible</th>
                    <th style={{ padding: '10px 14px' }}>Submitted</th>
                    <th style={{ padding: '10px 14px' }}>Pending</th>
                    <th style={{ padding: '10px 14px' }}>Progress %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(asg => {
                    const eligible = 24
                    const subCount = asg.id === 'asg-live-101' ? 1 : asg.id === 'asg-live-102' ? 1 : 0
                    const pending = Math.max(0, eligible - subCount)
                    const pct = Math.round((subCount / eligible) * 100)
                    return (
                      <tr key={asg.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--deep-maroon)' }}>{asg.title}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{asg.faculty_name}</td>
                        <td style={{ padding: '12px 14px' }}>Year {asg.academic_year} &bull; {asg.branch.slice(0, 15)}... (Sec {asg.section})</td>
                        <td style={{ padding: '12px 14px', fontSize: 12 }}>{asg.due_date}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{eligible}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#166534' }}>{subCount}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#9A3412' }}>{pending}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--soft-cloud)', borderRadius: 9999, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--deep-maroon)' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB D: FACULTY & ACADEMIC ACTIVITY */}
        {/* ========================================================================= */}
        {activeTab === 'faculty' && (
          <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Faculty Directory &amp; Teaching Load Overview
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Teaching assignments, documented hours, and active coursework responsibility
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="text"
                  placeholder="Search faculty by name or ID..."
                  value={searchFaculty}
                  onChange={e => setSearchFaculty(e.target.value)}
                  style={{ padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, width: 240, background: 'var(--bg-primary)' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border-card)', color: 'var(--deep-maroon)' }}>
                    <th style={{ padding: '10px 14px' }}>Faculty ID</th>
                    <th style={{ padding: '10px 14px' }}>Faculty Name</th>
                    <th style={{ padding: '10px 14px' }}>Department</th>
                    <th style={{ padding: '10px 14px' }}>Designation</th>
                    <th style={{ padding: '10px 14px' }}>Assigned Classes</th>
                    <th style={{ padding: '10px 14px' }}>Logged Hours</th>
                    <th style={{ padding: '10px 14px' }}>Tasks Published</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{f.id}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--deep-maroon)' }}>{f.name}</td>
                      <td style={{ padding: '12px 14px' }}>{f.dept}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12 }}>{f.designation}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12 }}>{f.classes}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{f.hours} hrs</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{f.assignments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB E: CLUB ACTIVITY */}
        {/* ========================================================================= */}
        {activeTab === 'clubs' && (
          <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
              Campus Societies &amp; Student Clubs Overview
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { name: 'ACM Student Chapter', category: 'Computing & Research', faculty: 'Dr. Ramesh Sharma', members: 48, events: 4 },
                { name: 'ASCENDIQ Open Source Society', category: 'Software Development', faculty: 'Dr. Ramesh Sharma', members: 62, events: 6 },
                { name: 'Robotics & Automation Club', category: 'Hardware & IoT', faculty: 'Dr. Sunita Kulkarni', members: 35, events: 3 }
              ].map(c => (
                <div key={c.name} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>{c.category}</div>
                  <h4 style={{ margin: '4px 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>{c.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Advisor: <b>{c.faculty}</b></div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-light)', fontSize: 12, fontWeight: 700 }}>
                    <span>{c.members} Active Members</span>
                    <span>&bull;</span>
                    <span>{c.events} Events Hosted</span>
                  </div>
                </div>
              ))}
            </div>

            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--deep-maroon)' }}>
              Recent Club Announcements Broadcast by Faculty
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clubNotifs.map(n => (
                <div key={n.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ color: 'var(--deep-maroon)' }}>{n.title}</b>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.published_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dusky-rose)', fontWeight: 700, margin: '2px 0 6px' }}>{n.club_name} &bull; Broadcast by {n.faculty_name}</div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB F: REGISTRATION AUDITS & VERIFICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'verifications' && (
          <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 16 }}>
            <TrustedReviewerPortal />
          </div>
        )}

      </div>

      <footer style={{ marginTop: 40, padding: '18px 24px', borderTop: '1px solid var(--border-light)', background: '#fff', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>ASCENDIQ &bull; Institution Administration &amp; Governance Center</span>
        <span>Verified Decision Intelligence Active &bull; Role Scoping Protected</span>
      </footer>
    </div>
  )
}
