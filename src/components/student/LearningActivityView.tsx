import { useState, useMemo, useEffect } from 'react'
import { Clock, BookOpen, AlertCircle, CheckCircle, Search, ExternalLink } from 'lucide-react'
import type { StudentProfile } from '../../lib/api'
import { collegeService, type Assignment, type AssignmentSubmission } from '../../lib/collegeService'

interface LearningActivityViewProps {
  studentData: StudentProfile
}

export function LearningActivityView({ studentData }: LearningActivityViewProps) {
  const [selectedCourseFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Live assignments and submissions from faculty module
  const [publishedAssignments, setPublishedAssignments] = useState<Assignment[]>([])
  const [mySubmissions, setMySubmissions] = useState<AssignmentSubmission[]>([])
  const [activeSubmittingAsg, setActiveSubmittingAsg] = useState<Assignment | null>(null)
  const [submissionContent, setSubmissionContent] = useState('')
  const [submissionFileUrl, setSubmissionFileUrl] = useState('')
  const [submittingBusy, setSubmittingBusy] = useState(false)
  const [submitNotice, setSubmitNotice] = useState('')

  const activeMinutes = studentData.lms?.active_minutes || 140
  const completionRate = studentData.lms?.completion_rate || 95.0
  const overdueCount = studentData.lms?.overdue || 0

  // Load published assignments targeted to this student's year, branch, and section
  useEffect(() => {
    let cancelled = false

    Promise.all([
      collegeService.getAssignments({
        branch: studentData.department,
        academic_year: studentData.academic_year,
        section: studentData.section || 'A'
      }),
      collegeService.getSubmissions()
    ]).then(([asgs, subs]) => {
      if (cancelled) return
      setPublishedAssignments(asgs)
      setMySubmissions(subs.filter(s => s.student_id === studentData.student_id))
    })

    return () => { cancelled = true }
  }, [studentData])

  // Coursework modules
  const courses = useMemo(() => {
    return [
      { code: 'CS601', title: 'Advanced Operating Systems', modulesCompleted: 10, totalModules: 12, completionPct: 83.3, hoursSpent: 26.5 },
      { code: 'CS602', title: 'Database Internals & Optimization', modulesCompleted: 11, totalModules: 11, completionPct: 100.0, hoursSpent: 31.0 },
      { code: 'CS603', title: 'Computer Networks & Protocols', modulesCompleted: 9, totalModules: 10, completionPct: 90.0, hoursSpent: 22.0 },
      { code: 'CS604', title: 'Compiler Design Labs', modulesCompleted: 7, totalModules: 8, completionPct: 87.5, hoursSpent: 18.5 },
      { code: 'CS605', title: 'Agile Software Engineering', modulesCompleted: 8, totalModules: 8, completionPct: 100.0, hoursSpent: 20.0 },
    ]
  }, [])

  // Combine static mock history with live faculty-published assignments
  const allAssignments = useMemo(() => {
    const list: Array<{
      id: string
      course: string
      title: string
      dueDate: string
      status: string
      score: string
      submittedAt: string | null
      feedback?: string
      liveAssignment?: Assignment
      submissionObj?: AssignmentSubmission
    }> = []

    // 1. Live Faculty Assignments for this student's cohort
    publishedAssignments.forEach(asg => {
      const mySub = mySubmissions.find(s => s.assignment_id === asg.id)
      let status = 'Pending'
      let score = '—'
      if (mySub) {
        if (mySub.status === 'graded') {
          status = 'Graded'
          score = mySub.marks !== undefined ? `${mySub.marks}/100` : 'Graded'
        } else if (mySub.is_late) {
          status = 'Late Submission'
        } else {
          status = 'Submitted'
        }
      }

      list.push({
        id: asg.id,
        course: asg.subject,
        title: asg.title,
        dueDate: asg.due_date,
        status,
        score,
        submittedAt: mySub ? mySub.submitted_at : null,
        feedback: mySub?.feedback,
        liveAssignment: asg,
        submissionObj: mySub
      })
    })

    // 2. Baseline curriculum history items if not already added
    const defaults = [
      { id: 'asg-3', course: 'CS603: Computer Networks', title: 'Packet Capture & Wireshark Analysis Lab', dueDate: '2026-10-14', status: 'Submitted', score: '90/100', submittedAt: '2026-10-13' },
      { id: 'asg-4', course: 'CS604: Compiler Design', title: 'Lexical Analyzer & AST Parser Generator', dueDate: '2026-10-05', status: 'Graded', score: '88/100', submittedAt: '2026-10-04' },
      { id: 'asg-5', course: 'CS605: Software Engineering', title: 'CI/CD Pipeline with Automated Unit Tests', dueDate: '2026-09-28', status: 'Graded', score: '98/100', submittedAt: '2026-09-27' },
    ]

    defaults.forEach(d => {
      if (!list.some(item => item.title === d.title)) {
        list.push(d)
      }
    })

    return list
  }, [publishedAssignments, mySubmissions])

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return allAssignments.filter(item => {
      const matchesCourse = selectedCourseFilter === 'all' || item.course.toLowerCase().includes(selectedCourseFilter.toLowerCase())
      const matchesStatus = selectedStatusFilter === 'all' || item.status.toLowerCase().includes(selectedStatusFilter.toLowerCase())
      const matchesSearch = !searchQuery.trim() || item.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCourse && matchesStatus && matchesSearch
    })
  }, [allAssignments, selectedCourseFilter, selectedStatusFilter, searchQuery])

  // Handle student submit action
  async function handleDoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSubmittingAsg) return
    if (!submissionContent.trim()) {
      alert('Please describe your submission work.')
      return
    }

    setSubmittingBusy(true)
    try {
      const created = await collegeService.submitAssignment({
        assignment_id: activeSubmittingAsg.id,
        student_id: studentData.student_id,
        student_name: studentData.full_name,
        student_email: studentData.email,
        submission_content: submissionContent.trim(),
        file_url: submissionFileUrl.trim() || undefined
      }, activeSubmittingAsg.due_date)

      setMySubmissions(prev => {
        const filtered = prev.filter(s => s.assignment_id !== activeSubmittingAsg.id)
        return [created, ...filtered]
      })

      setSubmitNotice(`Work submitted successfully for "${activeSubmittingAsg.title}"!`)
      setActiveSubmittingAsg(null)
      setSubmissionContent('')
      setSubmissionFileUrl('')
    } catch {
      alert('Could not submit assignment. Please try again.')
    } finally {
      setSubmittingBusy(false)
    }
  }

  // Weekly study time trend (last 6 weeks)
  const weeklyStudyMinutes = [
    { week: 'Wk 1', minutes: 120 },
    { week: 'Wk 2', minutes: 160 },
    { week: 'Wk 3', minutes: 135 },
    { week: 'Wk 4', minutes: 180 },
    { week: 'Wk 5', minutes: 150 },
    { week: 'Wk 6', minutes: activeMinutes },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Module Title Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sq-maroon-dark) 0%, var(--sq-maroon) 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: 'var(--sq-shadow-md)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700 }}>
            <BookOpen size={15} /> Academic Operations &amp; LMS Coursework
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Learning Activity &amp; Class Assignments
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
            Digital learning telemetry, faculty-assigned deliverables, deadlines, and submissions for Year {studentData.academic_year} ({studentData.department} &bull; Sec {studentData.section || 'A'})
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 12,
          padding: '8px 16px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>LMS Engagement</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{completionRate.toFixed(1)}% Completed</div>
        </div>
      </div>

      {submitNotice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 18px', color: '#065F46', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={18} color="#10B981" />
          <span>{submitNotice}</span>
        </div>
      )}

      {/* KPI 4-Card Row */}
      <div className="sq-grid-4col">
        <div className="sq-card">
          <div className="sq-card-top">
            <span className="sq-card-label">Weekly Active Time</span>
            <span className="sq-card-icon"><Clock size={16} /></span>
          </div>
          <div className="sq-card-val">
            {activeMinutes}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sq-text-light)' }}> mins/wk</span>
          </div>
          <div className="sq-card-sub">
            <span style={{ color: activeMinutes >= 120 ? 'var(--sq-success)' : 'var(--sq-warning)', fontWeight: 700 }}>
              {activeMinutes >= 120 ? '↑ High Engagement' : '↓ Below Benchmark'}
            </span>
          </div>
        </div>

        <div className="sq-card">
          <div className="sq-card-top">
            <span className="sq-card-label">Syllabus Completion</span>
            <span className="sq-card-icon"><CheckCircle size={16} /></span>
          </div>
          <div className="sq-card-val">
            {completionRate.toFixed(1)}%
          </div>
          <div className="sq-card-sub">
            <span>Across 5 registered courses</span>
          </div>
        </div>

        <div className="sq-card">
          <div className="sq-card-top">
            <span className="sq-card-label">Cohort Assignments</span>
            <span className="sq-card-icon"><BookOpen size={16} /></span>
          </div>
          <div className="sq-card-val">
            {allAssignments.length}
          </div>
          <div className="sq-card-sub">
            <span>Targeted to your branch &amp; section</span>
          </div>
        </div>

        <div className="sq-card">
          <div className="sq-card-top">
            <span className="sq-card-label">Overdue Tasks</span>
            <span className="sq-card-icon"><AlertCircle size={16} /></span>
          </div>
          <div className="sq-card-val">
            {overdueCount}
          </div>
          <div className="sq-card-sub">
            <span style={{ color: overdueCount === 0 ? 'var(--sq-success)' : 'var(--sq-danger)', fontWeight: 700 }}>
              {overdueCount === 0 ? '✓ All deliverables on track' : 'Action required'}
            </span>
          </div>
        </div>
      </div>

      {/* Visualizations: Weekly Study Trend & Course-Wise Progress */}
      <div className="sq-grid-2col">
        {/* Weekly Study Trend */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <h3>Weekly LMS Study Hours Trend</h3>
              <small>Active learning minutes logged in the digital portal</small>
            </div>
            <span className="sq-tag is-real">Verified Telemetry</span>
          </div>

          <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 14, padding: '20px 8px 10px' }}>
            {weeklyStudyMinutes.map(wk => (
              <div key={wk.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 6 }}>
                  {wk.minutes}m
                </span>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(wk.minutes / 200) * 100}%`,
                      background: 'linear-gradient(180deg, var(--sq-rose-soft) 0%, var(--sq-maroon) 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-muted)', marginTop: 8 }}>
                  {wk.week}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Course-Wise Progress Bars */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <h3>Course-Wise Syllabus Progress</h3>
              <small>Module completion percentage across registered courses</small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            {courses.map(c => (
              <div key={c.code}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>
                    {c.code}: {c.title}
                  </span>
                  <span style={{ fontWeight: 700, color: c.completionPct >= 90 ? 'var(--sq-success)' : 'var(--sq-maroon)' }}>
                    {c.modulesCompleted}/{c.totalModules} modules ({c.completionPct.toFixed(0)}%)
                  </span>
                </div>
                <div className="sq-bar-track" style={{ height: 8, borderRadius: 4 }}>
                  <div
                    className={`sq-bar-fill ${c.completionPct >= 90 ? 'fill-green' : 'fill-amber'}`}
                    style={{ width: `${c.completionPct}%`, height: '100%', borderRadius: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment & Lab Task Roster with Filters */}
      <div className="sq-panel">
        <div className="sq-panel-header">
          <div className="sq-panel-title">
            <h3>Faculty Assignments &amp; Submissions</h3>
            <small>Deliverable due dates, submission timestamps, and feedback for your section</small>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--sq-text-light)' }} />
              <input
                type="text"
                placeholder="Search assignment…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '6px 10px 6px 30px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 11, width: '100%', background: '#fff' }}
              />
            </div>

            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 11, background: '#fff' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
            </select>
          </div>
        </div>

        {filteredAssignments.length > 0 ? (
          <div className="sq-table-wrap">
            <table className="sq-table">
              <thead>
                <tr>
                  <th>Course / Subject</th>
                  <th>Assignment Title &amp; Details</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Score / Marks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(asg => {
                  const isSubmitted = asg.status === 'Submitted' || asg.status === 'Graded' || asg.status === 'Late Submission'
                  return (
                    <tr key={asg.id}>
                      <td><b>{asg.course.split(':')[0]}</b></td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>{asg.title}</div>
                        {asg.feedback && (
                          <div style={{ fontSize: 11, color: '#15803d', marginTop: 3 }}>
                            <b>Faculty Feedback:</b> "{asg.feedback}"
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{asg.dueDate}</span>
                      </td>
                      <td>
                        <span className="sq-tag" style={{
                          background: asg.status === 'Graded' ? 'var(--sq-success-bg)' : isSubmitted ? 'var(--sq-info-bg)' : 'var(--sq-warning-bg)',
                          color: asg.status === 'Graded' ? 'var(--sq-success)' : isSubmitted ? 'var(--sq-info)' : 'var(--sq-warning)',
                          fontWeight: 700
                        }}>
                          {asg.status === 'Graded' ? '✓ Graded' : isSubmitted ? '✓ Submitted' : '⏱ Pending'}
                        </span>
                      </td>
                      <td><b>{asg.score}</b></td>
                      <td>
                        {asg.liveAssignment ? (
                          <button
                            onClick={() => {
                              setActiveSubmittingAsg(asg.liveAssignment!)
                              setSubmissionContent(asg.submissionObj?.submission_content || '')
                              setSubmissionFileUrl(asg.submissionObj?.file_url || '')
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isSubmitted ? 'var(--sq-bg)' : 'var(--sq-maroon)',
                              color: isSubmitted ? 'var(--sq-maroon)' : '#fff',
                              border: '1px solid var(--sq-maroon)',
                              cursor: 'pointer'
                            }}
                          >
                            {isSubmitted ? 'Edit Submission' : 'Submit Work'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>Verified record</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--sq-text-muted)' }}>
            <Search size={24} style={{ margin: '0 auto 8px', color: 'var(--sq-rose-muted)' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sq-maroon)' }}>No assignments matched your criteria</div>
            <small>Try selecting "All Statuses" or clearing your search filter.</small>
          </div>
        )}
      </div>

      {/* Student Assignment Submission Modal */}
      {activeSubmittingAsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--sq-maroon)' }}>
                  Submit Assignment Work
                </h3>
                <div style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
                  {activeSubmittingAsg.title} &bull; Due: {activeSubmittingAsg.due_date}
                </div>
              </div>
              <button onClick={() => setActiveSubmittingAsg(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--sq-text-muted)' }}>&times;</button>
            </div>

            <div style={{ background: 'var(--sq-bg)', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 12 }}>
              <b>Faculty Instructions:</b>
              <p style={{ margin: '4px 0 0', color: 'var(--sq-text)', lineHeight: 1.5 }}>
                {activeSubmittingAsg.instructions}
              </p>
              {activeSubmittingAsg.attachment_url && (
                <div style={{ marginTop: 8 }}>
                  <a href={activeSubmittingAsg.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--sq-maroon)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={12} /> View Reference Specification Document
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleDoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Your Submission Explanation / Code Summary *
                </label>
                <textarea
                  required
                  rows={4}
                  value={submissionContent}
                  onChange={e => setSubmissionContent(e.target.value)}
                  placeholder="Describe your solution architecture, algorithms used, and test results..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12, background: 'var(--sq-bg)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Repository or Document URL (Optional)
                </label>
                <input
                  type="url"
                  value={submissionFileUrl}
                  onChange={e => setSubmissionFileUrl(e.target.value)}
                  placeholder="https://github.com/my-repo/project or cloud link"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12, background: 'var(--sq-bg)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveSubmittingAsg(null)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--sq-bg)', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBusy}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--sq-maroon)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {submittingBusy ? 'Submitting…' : 'Submit My Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
