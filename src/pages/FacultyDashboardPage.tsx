import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  BookOpen, Clock, FileText, CheckSquare, Bell, User,
  Calendar, Plus, Filter,
  CheckCircle2, AlertCircle, ExternalLink,
  Sparkles, Building2
} from 'lucide-react'
import { collegeService, type FacultyProfile, type AcademicHourRecord, type Assignment, type AssignmentSubmission, type ClubNotification } from '../lib/collegeService'
import { type StudentProfile } from '../lib/api'

type FacultyTab = 'classes' | 'hours' | 'assignments' | 'submissions' | 'clubs' | 'profile'

const BRANCHES = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication Engineering',
  'Mechanical Engineering'
]

const SECTIONS = ['A', 'B', 'C']
const ACADEMIC_YEARS = [1, 2, 3, 4]

export default function FacultyDashboardPage() {
  const [activeTab, setActiveTab] = useState<FacultyTab>('classes')
  const [profile, setProfile] = useState<FacultyProfile | null>(null)
  const [, setLoading] = useState(true)

  // Filters for My Classes
  const [selectedYear, setSelectedYear] = useState<number>(3)
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Science & Engineering')
  const [selectedSection, setSelectedSection] = useState<string>('A')
  const [selectedSubject, setSelectedSubject] = useState<string>('Advanced Operating Systems (CS601)')

  // Data states
  const [roster, setRoster] = useState<StudentProfile[]>([])
  const [hourRecords, setHourRecords] = useState<AcademicHourRecord[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([])
  const [clubNotifs, setClubNotifs] = useState<ClubNotification[]>([])

  // Modals & form states
  const [notice, setNotice] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Evaluation modal
  const [evaluatingSub, setEvaluatingSub] = useState<AssignmentSubmission | null>(null)
  const [evalMarks, setEvalMarks] = useState<number>(85)
  const [evalFeedback, setEvalFeedback] = useState<string>('')

  // Initial load
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    collegeService.getFacultyProfile().then(prof => {
      if (cancelled) return
      setProfile(prof)
      if (prof.subjects && prof.subjects.length > 0) {
        setSelectedSubject(prof.subjects[0])
      }
    })

    Promise.all([
      collegeService.getHourRecords(),
      collegeService.getAssignments(),
      collegeService.getSubmissions(),
      collegeService.getClubNotifications()
    ]).then(([hrs, asgs, subs, notifs]) => {
      if (cancelled) return
      setHourRecords(hrs)
      setAssignments(asgs)
      setSubmissions(subs)
      setClubNotifs(notifs)
      if (asgs.length > 0) {
        setSelectedAssignmentId(asgs[0].id)
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // Load student roster whenever class selection changes
  useEffect(() => {
    let cancelled = false
    collegeService.getClassRoster(selectedYear, selectedBranch, selectedSection).then(list => {
      if (!cancelled) {
        setRoster(list)
      }
    })
    return () => { cancelled = true }
  }, [selectedYear, selectedBranch, selectedSection])

  // Clear notice after 4 seconds
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  // --- Hour Details Form Submit ---
  async function handleAddHourRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setNotice('')
    const form = new FormData(e.currentTarget)
    const topic = String(form.get('topic') || '').trim()
    const hours = Number(form.get('hours'))
    const date = String(form.get('date') || '')
    const notes = String(form.get('notes') || '').trim()

    if (!topic) { setError('Enter the topic covered.'); return }
    if (!hours || hours <= 0) { setError('Enter valid duration in hours.'); return }

    setIsSubmitting(true)
    try {
      const created = await collegeService.addHourRecord({
        faculty_name: profile?.full_name || 'Dr. Ramesh Sharma',
        record_date: date || new Date().toISOString().slice(0, 10),
        academic_year: selectedYear,
        branch: selectedBranch,
        section: selectedSection,
        subject: selectedSubject,
        topic_covered: topic,
        hours,
        notes: notes || undefined
      })
      setHourRecords(prev => [created, ...prev])
      setNotice(`Academic hour record saved: "${topic}" (${hours} hrs)`)
      ;(e.target as HTMLFormElement).reset()
    } catch {
      setError('Could not save hour record.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Assignment Creation Form Submit ---
  async function handleCreateAssignment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setNotice('')
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') || '').trim()
    const instructions = String(form.get('instructions') || '').trim()
    const dueDate = String(form.get('due_date') || '')
    const attachmentUrl = String(form.get('attachment_url') || '').trim()

    if (!title) { setError('Enter assignment title.'); return }
    if (!instructions) { setError('Enter assignment instructions.'); return }
    if (!dueDate) { setError('Specify submission deadline date.'); return }

    setIsSubmitting(true)
    try {
      const created = await collegeService.createAssignment({
        faculty_name: profile?.full_name || 'Dr. Ramesh Sharma',
        academic_year: selectedYear,
        branch: selectedBranch,
        section: selectedSection,
        subject: selectedSubject,
        title,
        instructions,
        assigned_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate,
        attachment_url: attachmentUrl || undefined,
        status: 'published'
      })
      setAssignments(prev => [created, ...prev])
      setSelectedAssignmentId(created.id)
      setNotice(`Assignment "${title}" published for Year ${selectedYear} - ${selectedBranch} (Sec ${selectedSection}).`)
      setActiveTab('assignments')
      ;(e.target as HTMLFormElement).reset()
    } catch {
      setError('Could not create assignment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Grade Submission ---
  async function handleGradeSubmission(e: FormEvent) {
    e.preventDefault()
    if (!evaluatingSub) return
    setIsSubmitting(true)
    try {
      const updated = await collegeService.gradeSubmission(evaluatingSub.id, evalMarks, evalFeedback)
      if (updated) {
        setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s))
        setNotice(`Graded ${updated.student_name}: ${updated.marks}/100`)
      }
      setEvaluatingSub(null)
    } catch {
      setError('Could not save evaluation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Club Notification Submit ---
  async function handleCreateClubNotif(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setNotice('')
    const form = new FormData(e.currentTarget)
    const clubId = String(form.get('club_id') || 'club-1')
    const title = String(form.get('title') || '').trim()
    const message = String(form.get('message') || '').trim()
    const eventDate = String(form.get('event_date') || '')
    const location = String(form.get('location') || '').trim()
    const attachmentUrl = String(form.get('attachment_url') || '').trim()

    if (!title || !message) { setError('Enter both notification title and announcement message.'); return }

    const clubName = clubId === 'club-1' ? 'ACM Student Chapter' : clubId === 'club-2' ? 'ASCENDIQ Open Source Society' : 'Robotics & Automation Club'

    setIsSubmitting(true)
    try {
      const created = await collegeService.createClubNotification({
        club_id: clubId,
        club_name: clubName,
        faculty_name: profile?.full_name || 'Dr. Ramesh Sharma',
        title,
        message,
        event_date: eventDate || undefined,
        location: location || undefined,
        attachment_url: attachmentUrl || undefined
      })
      setClubNotifs(prev => [created, ...prev])
      setNotice(`Notification broadcast to participants of ${clubName}.`)
      ;(e.target as HTMLFormElement).reset()
    } catch {
      setError('Could not publish club announcement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Profile Edit Submit ---
  async function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setNotice('')
    const form = new FormData(e.currentTarget)
    const fullName = String(form.get('full_name') || '').trim()
    const designation = String(form.get('designation') || '').trim()
    const officeRoom = String(form.get('office_room') || '').trim()
    const phone = String(form.get('phone') || '').trim()
    const officeHours = String(form.get('office_hours') || '').trim()
    const bio = String(form.get('bio') || '').trim()

    if (!fullName) { setError('Full name is required.'); return }

    setIsSubmitting(true)
    try {
      const updated = await collegeService.updateFacultyProfile({
        full_name: fullName,
        designation,
        office_room: officeRoom,
        phone,
        office_hours: officeHours,
        bio
      })
      setProfile(updated)
      setNotice('Faculty profile successfully updated.')
    } catch {
      setError('Could not update faculty profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculations for current selected assignment in Submission Tracking
  const currentAssignment = useMemo(() => {
    return assignments.find(a => a.id === selectedAssignmentId) || assignments[0]
  }, [assignments, selectedAssignmentId])

  const assignmentSubmissions = useMemo(() => {
    if (!currentAssignment) return []
    return submissions.filter(s => s.assignment_id === currentAssignment.id)
  }, [currentAssignment, submissions])

  const submissionStats = useMemo(() => {
    const totalEligible = roster.length > 0 ? roster.length : 24
    const submittedCount = assignmentSubmissions.length
    const pendingCount = Math.max(0, totalEligible - submittedCount)
    const lateCount = assignmentSubmissions.filter(s => s.is_late).length
    const rate = totalEligible > 0 ? Math.round((submittedCount / totalEligible) * 100) : 0
    return { totalEligible, submittedCount, pendingCount, lateCount, rate }
  }, [roster, assignmentSubmissions])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="header is-scrolled" style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255, 248, 247, 0.98)', borderBottom: '1px solid var(--border-card)' }}>
        <div className="header-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <a href="/" className="brand" aria-label="Ascendiq Home">
              <img src="/assets/ascendiq-logo.jpeg" alt="Ascendiq Logo" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <span>ascendiq<small>FACULTY PORTAL</small></span>
            </a>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF0F3', border: '1px solid #F6C8D3', padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: 'var(--deep-maroon)' }}>
              <BookOpen size={13} color="var(--dusky-rose)" />
              {profile?.full_name || 'Faculty Member'} ({profile?.faculty_id || 'FAC-CS-042'})
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="/dashboard"
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
              <Sparkles size={14} /> Decision Analytics
            </a>
            <a
              href="/college/login"
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 8
              }}
            >
              Switch Role / Logout
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: 1280, margin: '20px auto', width: '100%', padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Banner with Global Tab Navigation */}
        <div style={{
          background: 'linear-gradient(135deg, #4B1028 0%, #300817 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(75, 16, 40, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F6C8D3', fontWeight: 700 }}>
                <Building2 size={14} /> {profile?.department || 'Computer Science & Engineering'}
              </div>
              <h1 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 800, color: '#FFF8F7' }}>
                {profile?.full_name ? `Welcome, ${profile.full_name}` : 'Faculty Workspace'}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#F0A9BC' }}>
                Course instruction, teaching logs, targeted student assignments, and campus society advisorship.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.08)', padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontSize: 10, color: '#F6C8D3', textTransform: 'uppercase', fontWeight: 700 }}>Classes</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>4</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontSize: 10, color: '#F6C8D3', textTransform: 'uppercase', fontWeight: 700 }}>Assignments</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{assignments.length}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontSize: 10, color: '#F6C8D3', textTransform: 'uppercase', fontWeight: 700 }}>Hours Logged</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{hourRecords.reduce((s, h) => s + Number(h.hours), 0)}</div>
              </div>
            </div>
          </div>

          {/* 6 Core Functional Tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { id: 'classes', label: '1. My Classes', icon: BookOpen },
              { id: 'hours', label: '2. Hour Details', icon: Clock },
              { id: 'assignments', label: '3. Assignments', icon: FileText },
              { id: 'submissions', label: '4. Submission Tracking', icon: CheckSquare },
              { id: 'clubs', label: '5. Club Notifications', icon: Bell },
              { id: 'profile', label: '6. My Profile', icon: User }
            ].map(tab => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FacultyTab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? 'var(--deep-maroon)' : '#FFF8F7',
                    background: isSelected ? '#FFF8F7' : 'rgba(255,255,255,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={15} color={isSelected ? 'var(--deep-maroon)' : '#F6C8D3'} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Global Alert Notices */}
        {notice && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 18px', color: '#065F46', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="#10B981" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 10, padding: '12px 18px', color: '#C53030', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="#EF4444" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MY CLASSES */}
        {/* ========================================================================= */}
        {activeTab === 'classes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Filter Selector Panel */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Filter size={16} color="var(--deep-maroon)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Select Authorized Teaching Class
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Changing Year, Branch, or Section automatically refreshes the student roster and teaching history.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {/* Academic Year */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Academic Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)', fontWeight: 600, color: 'var(--deep-maroon)' }}
                  >
                    {ACADEMIC_YEARS.map(yr => (
                      <option key={yr} value={yr}>Year {yr} ({yr === 1 ? 'Freshmen' : yr === 2 ? 'Sophomore' : yr === 3 ? 'Junior' : 'Senior / Final Year'})</option>
                    ))}
                  </select>
                </div>

                {/* Branch / Department */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Branch / Department
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)', fontWeight: 600, color: 'var(--deep-maroon)' }}
                  >
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)', fontWeight: 600, color: 'var(--deep-maroon)' }}
                  >
                    {SECTIONS.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Subject / Course
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)', fontWeight: 600, color: 'var(--deep-maroon)' }}
                  >
                    {(profile?.subjects || ['Advanced Operating Systems (CS601)']).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Class Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>Current Class Overview</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                  Year {selectedYear} &bull; {selectedBranch} &bull; Sec {selectedSection}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Course: <b>{selectedSubject}</b>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>Enrolled Cohort Size</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                  {roster.length} Students
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Verified institutional student profiles loaded
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>Quick Actions</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setActiveTab('hours')}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-card)', fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)', cursor: 'pointer' }}
                  >
                    Record Hours
                  </button>
                  <button
                    onClick={() => setActiveTab('assignments')}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'var(--deep-maroon)', border: 'none', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                  >
                    New Assignment
                  </button>
                </div>
              </div>
            </div>

            {/* Live Student Class Roster Table */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                    Student Class Roster
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Authorized students registered under Year {selectedYear}, {selectedBranch}, Section {selectedSection}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: 6 }}>
                  Total: {roster.length} Students
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border-card)', color: 'var(--deep-maroon)' }}>
                      <th style={{ padding: '10px 14px' }}>Roll Number</th>
                      <th style={{ padding: '10px 14px' }}>Student Name</th>
                      <th style={{ padding: '10px 14px' }}>Section</th>
                      <th style={{ padding: '10px 14px' }}>Attendance</th>
                      <th style={{ padding: '10px 14px' }}>CGPA</th>
                      <th style={{ padding: '10px 14px' }}>Status / Standing</th>
                      <th style={{ padding: '10px 14px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(st => {
                      const att = st.attendance?.percentage || 85.0
                      const cgpa = st.academic?.cgpa || 8.0
                      return (
                        <tr key={st.student_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{st.student_id}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--deep-maroon)' }}>{st.full_name}</td>
                          <td style={{ padding: '10px 14px' }}>Sec {st.section || selectedSection}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ color: att >= 75 ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                              {att.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>{cgpa.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: att >= 75 ? '#dcfce7' : '#fee2e2',
                              color: att >= 75 ? '#166534' : '#991b1b'
                            }}>
                              {att >= 75 ? 'Good Standing' : 'Attendance Risk'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <a
                              href={`/dashboard?student=${st.student_id}`}
                              style={{ fontSize: 11, fontWeight: 700, color: 'var(--deep-maroon)', textDecoration: 'none', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                            >
                              Inspect Analytics &rarr;
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HOUR DETAILS */}
        {/* ========================================================================= */}
        {activeTab === 'hours' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Record Academic Hours Form */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={18} color="var(--deep-maroon)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Record Academic Hour
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Log lecture, tutorial, or lab hours conducted for your authorized classes. Saved directly to verified academic records.
              </p>

              <form onSubmit={handleAddHourRecord} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Class Target
                  </label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 8 }}>
                    Year {selectedYear} &bull; {selectedBranch} &bull; Sec {selectedSection}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Subject
                  </label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 8 }}>
                    {selectedSubject}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Date Conducted
                    </label>
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Hours / Duration
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="8"
                      name="hours"
                      required
                      defaultValue="1.5"
                      style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Topic Covered *
                  </label>
                  <input
                    type="text"
                    name="topic"
                    required
                    placeholder="e.g. Virtual Memory Paging & Working Set Model"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Optional Teaching Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Student queries addressed, lab exercises executed, or homework assigned..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 8 }}>
                  Note: Academic hour records document syllabus completion and teaching effort. This does not automatically mark individual student attendance.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--deep-maroon)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4
                  }}
                >
                  <Plus size={16} /> Save Academic Hour Record
                </button>
              </form>
            </div>

            {/* Teaching History Table */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                    Teaching History &amp; Hour Records
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Authorized logs for {profile?.full_name || 'Dr. Ramesh Sharma'}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--deep-maroon)', background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: 8 }}>
                  {hourRecords.reduce((s, h) => s + Number(h.hours), 0)} Total Hours Logged
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {hourRecords.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>
                        <span>{rec.record_date}</span>
                        <span>&bull;</span>
                        <span>Year {rec.academic_year} &bull; Sec {rec.section}</span>
                        <span>&bull;</span>
                        <span>{rec.branch}</span>
                      </div>
                      <h4 style={{ margin: '4px 0 2px', fontSize: 14, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                        {rec.topic_covered}
                      </h4>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        {rec.subject}
                      </div>
                      {rec.notes && (
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                          "{rec.notes}"
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ display: 'inline-block', background: 'var(--deep-maroon)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>
                        {rec.hours} hrs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ASSIGNMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'assignments' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 440px) 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Create Assignment Form */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <FileText size={18} color="var(--deep-maroon)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Create &amp; Publish Assignment
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Assignments appear automatically <b>only in the student dashboard of the selected cohort</b>.
              </p>

              <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: 'var(--dusky-rose)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Target Audience:</div>
                  <div style={{ fontWeight: 800, color: 'var(--deep-maroon)' }}>
                    Year {selectedYear} &bull; {selectedBranch} &bull; Section {selectedSection}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Subject: {selectedSubject}</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Virtual Memory Page Replacement Simulator"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Detailed Instructions &amp; Requirements *
                  </label>
                  <textarea
                    name="instructions"
                    required
                    rows={4}
                    placeholder="Specify project requirements, guidelines, test cases, and expected deliverable format..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Submission Due Date *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    defaultValue={new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Attachment / Course Reference URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="attachment_url"
                    placeholder="https://ascendiq.edu/courseware/spec.pdf"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--deep-maroon)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4
                  }}
                >
                  <Plus size={16} /> Publish Assignment to Class
                </button>
              </form>
            </div>

            {/* List of Published Assignments */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                    Published Class Assignments
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Assignments currently accessible to enrolled students
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  {assignments.length} Total
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {assignments.map(asg => {
                  const isSelected = asg.id === selectedAssignmentId
                  const subCount = submissions.filter(s => s.assignment_id === asg.id).length
                  return (
                    <div
                      key={asg.id}
                      style={{
                        background: isSelected ? '#FFF8F7' : 'var(--bg-primary)',
                        border: isSelected ? '2px solid var(--deep-maroon)' : '1px solid var(--border-light)',
                        borderRadius: 14,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>
                            <span>Year {asg.academic_year} &bull; Sec {asg.section}</span>
                            <span>&bull;</span>
                            <span>{asg.branch}</span>
                          </div>
                          <h4 style={{ margin: '4px 0 2px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                            {asg.title}
                          </h4>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                            {asg.subject} &bull; Assigned: {asg.assigned_date}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#166534' }}>
                            Due: {asg.due_date}
                          </span>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {asg.instructions}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)' }}>
                          {subCount} Submissions Received
                        </span>
                        <button
                          onClick={() => {
                            setSelectedAssignmentId(asg.id)
                            setActiveTab('submissions')
                          }}
                          style={{
                            background: 'var(--deep-maroon)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          Track Submissions &rarr;
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SUBMISSION TRACKING */}
        {/* ========================================================================= */}
        {activeTab === 'submissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top Assignment Picker */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Select Assignment to Monitor
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={e => setSelectedAssignmentId(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 14, fontWeight: 700, color: 'var(--deep-maroon)', minWidth: 320, background: 'var(--bg-primary)' }}
                  >
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>{a.title} ({a.subject} - Due {a.due_date})</option>
                    ))}
                  </select>
                </div>

                {currentAssignment && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Deadline</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--deep-maroon)' }}>{currentAssignment.due_date}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Submission Progress Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eligible Students</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>{submissionStats.totalEligible}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Class cohort roster</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Submitted</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#166534', marginTop: 4 }}>{submissionStats.submittedCount}</div>
                <div style={{ fontSize: 11, color: '#166534' }}>{submissionStats.rate}% completion</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', textTransform: 'uppercase' }}>Pending Work</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#9A3412', marginTop: 4 }}>{submissionStats.pendingCount}</div>
                <div style={{ fontSize: 11, color: '#9A3412' }}>Not yet submitted</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>Submitted Late</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#991B1B', marginTop: 4 }}>{submissionStats.lateCount}</div>
                <div style={{ fontSize: 11, color: '#991B1B' }}>After deadline</div>
              </div>
            </div>

            {/* Submission Progress Bar */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                <span>Submission Completion Rate</span>
                <span>{submissionStats.rate}% ({submissionStats.submittedCount} of {submissionStats.totalEligible})</span>
              </div>
              <div style={{ height: 10, background: 'var(--soft-cloud)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${submissionStats.rate}%`, background: 'var(--deep-maroon)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Student-Wise Submission Roster List */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                Cohort Submission Roster
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border-card)', color: 'var(--deep-maroon)' }}>
                      <th style={{ padding: '10px 14px' }}>Roll Number</th>
                      <th style={{ padding: '10px 14px' }}>Student Name</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Timestamp</th>
                      <th style={{ padding: '10px 14px' }}>Submitted Work / Link</th>
                      <th style={{ padding: '10px 14px' }}>Score</th>
                      <th style={{ padding: '10px 14px' }}>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(st => {
                      const sub = assignmentSubmissions.find(s => s.student_id === st.student_id)
                      const isSub = Boolean(sub)
                      return (
                        <tr key={st.student_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700 }}>{st.student_id}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--deep-maroon)' }}>{st.full_name}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {isSub ? (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 9999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: sub!.is_late ? '#FEF2F2' : '#F0FDF4',
                                color: sub!.is_late ? '#991B1B' : '#166534'
                              }}>
                                {sub!.is_late ? 'Late Submission' : sub!.status === 'graded' ? 'Graded' : 'Submitted'}
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#FFFBEB', color: '#B45309' }}>
                                Not Submitted
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                            {sub ? new Date(sub.submitted_at).toLocaleString() : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                            {sub ? (
                              <div>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {sub.submission_content}
                                </p>
                                {sub.file_url && (
                                  <a href={sub.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--dusky-rose)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <ExternalLink size={11} /> View Attachment
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Pending student response</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--deep-maroon)' }}>
                            {sub?.marks !== undefined ? `${sub.marks}/100` : '—'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {sub ? (
                              <button
                                onClick={() => {
                                  setEvaluatingSub(sub)
                                  setEvalMarks(sub.marks || 85)
                                  setEvalFeedback(sub.feedback || '')
                                }}
                                style={{
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border-card)',
                                  color: 'var(--deep-maroon)',
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {sub.status === 'graded' ? 'Edit Marks' : 'Evaluate Work'}
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Awaiting work</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assessment / Grading Modal */}
            {evaluatingSub && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                        Evaluate Submission
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {evaluatingSub.student_name} ({evaluatingSub.student_id})
                      </div>
                    </div>
                    <button onClick={() => setEvaluatingSub(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 12 }}>
                    <b>Submitted Answer:</b>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {evaluatingSub.submission_content}
                    </p>
                  </div>

                  <form onSubmit={handleGradeSubmission} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Marks Awarded (out of 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={evalMarks}
                        onChange={e => setEvalMarks(Number(e.target.value))}
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 14, fontWeight: 700, background: 'var(--bg-primary)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Feedback &amp; Qualitative Assessment
                      </label>
                      <textarea
                        rows={3}
                        value={evalFeedback}
                        onChange={e => setEvalFeedback(e.target.value)}
                        placeholder="Constructive feedback for the student on technical correctness and improvement areas..."
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, background: 'var(--bg-primary)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setEvaluatingSub(null)}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--soft-cloud)', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--deep-maroon)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        Save Evaluation
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CLUB NOTIFICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'clubs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 440px) 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Create Club Announcement Form */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Bell size={18} color="var(--deep-maroon)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  Publish Club Announcement
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Notifies <b>relevant club participants only</b> in their student dashboard with an unread badge indicator.
              </p>

              <form onSubmit={handleCreateClubNotif} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Authorized Student Society / Club *
                  </label>
                  <select
                    name="club_id"
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, fontWeight: 700, background: 'var(--bg-primary)', color: 'var(--deep-maroon)' }}
                  >
                    <option value="club-1">ACM Student Chapter (Computing &amp; Research)</option>
                    <option value="club-2">ASCENDIQ Open Source Society (Software Dev)</option>
                    <option value="club-3">Robotics &amp; Automation Club (Hardware &amp; IoT)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Announcement Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Technical Talk: High-Throughput Distributed Consensus Systems"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Notification Message *
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    placeholder="Enter event agenda, speaker bio, eligibility, or meeting preparation details..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Event Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="event_date"
                      style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Location / Room (Optional)
                    </label>
                    <input
                      type="text"
                      name="location"
                      placeholder="Auditorium 2 or Lab 4"
                      style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Resource Attachment URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="attachment_url"
                    placeholder="https://ascendiq.edu/clubs/flyer.pdf"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--deep-maroon)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4
                  }}
                >
                  <Plus size={16} /> Broadcast Club Notification
                </button>
              </form>
            </div>

            {/* Published Notifications List */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 22, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                    Published Society Announcements
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Broadcast messages visible only to enrolled club members
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                  {clubNotifs.length} Notices
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {clubNotifs.map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 14,
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', textTransform: 'uppercase' }}>
                          {notif.club_name}
                        </span>
                        <h4 style={{ margin: '3px 0', fontSize: 16, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                          {notif.title}
                        </h4>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: '#fff', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                        {new Date(notif.published_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {notif.message}
                    </p>

                    {(notif.event_date || notif.location) && (
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
                        {notif.event_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={13} color="var(--dusky-rose)" /> Date: {notif.event_date}
                          </span>
                        )}
                        {notif.location && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={13} color="var(--dusky-rose)" /> Venue: {notif.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MY PROFILE */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && profile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* Left Profile Card */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <div style={{ width: 100, height: 100, margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--dusky-rose)', boxShadow: '0 6px 16px rgba(75,16,40,0.15)' }}>
                <img
                  src={profile.avatar_url || '/logo_1.jpeg'}
                  alt={profile.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                {profile.full_name}
              </h2>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dusky-rose)', marginBottom: 8 }}>
                {profile.designation}
              </div>
              <div style={{ display: 'inline-block', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                Faculty ID: {profile.faculty_id}
              </div>

              <div style={{ marginTop: 20, textAlign: 'left', borderTop: '1px solid var(--border-light)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Department:</span>
                  <b>{profile.department}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Email Address:</span>
                  <b>{profile.email}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Office Room:</span>
                  <span>{profile.office_room || 'Academic Block B, Room 304'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Office Hours:</span>
                  <span>{profile.office_hours || 'Mon & Thu, 3:00 PM - 5:00 PM'}</span>
                </div>
              </div>
            </div>

            {/* Right Profile Edit Form */}
            <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 16, padding: 26, boxShadow: '0 4px 12px rgba(75, 16, 40, 0.04)' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--deep-maroon)' }}>
                Faculty Profile Details
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                Update your professional bio, contact details, and institutional office hours. Core role permissions cannot be self-modified.
              </p>

              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      defaultValue={profile.full_name}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Designation *
                    </label>
                    <input
                      type="text"
                      name="designation"
                      required
                      defaultValue={profile.designation}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Office Room
                    </label>
                    <input
                      type="text"
                      name="office_room"
                      defaultValue={profile.office_room}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={profile.phone}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Office Hours
                  </label>
                  <input
                    type="text"
                    name="office_hours"
                    defaultValue={profile.office_hours}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 13, background: 'var(--bg-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Professional Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    defaultValue={profile.bio}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-card)', fontSize: 12, background: 'var(--bg-primary)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--deep-maroon)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <CheckSquare size={16} /> Save Profile Changes
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

      <footer style={{ marginTop: 40, padding: '18px 24px', borderTop: '1px solid var(--border-light)', background: '#fff', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>ASCENDIQ &bull; Faculty Decision &amp; Class Operations Workspace</span>
        <span>Secure Role Scoping &bull; Immutable Audit Logs Active</span>
      </footer>
    </div>
  )
}
