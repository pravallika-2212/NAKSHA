import { useState, useMemo } from 'react'
import { CheckCircle2, AlertTriangle, Calendar, Filter, HelpCircle } from 'lucide-react'
import type { StudentProfile } from '../../lib/api'

interface AttendanceHabitsViewProps {
  studentData: StudentProfile
}

export function AttendanceHabitsView({ studentData }: AttendanceHabitsViewProps) {
  // Configurable institution threshold slider (default 75%)
  const [eligibilityThreshold, setEligibilityThreshold] = useState<number>(75)
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  const totalHeld = studentData.attendance?.classes_held || 90
  const totalAttended = studentData.attendance?.classes_attended || 84
  const overallPercentage = studentData.attendance?.percentage || Math.round((totalAttended / totalHeld) * 1000) / 10
  const absentCount = Math.max(0, totalHeld - totalAttended)
  const approvedLeaveCount = 2 // Approved institutional leaves

  // Subject-wise attendance breakdown
  const subjectAttendance = useMemo(() => {
    return [
      { code: 'CS601', name: 'Advanced Operating Systems', held: 24, attended: 22, percentage: 91.7, type: 'Lecture + Lab' },
      { code: 'CS602', name: 'Database Internals & Optimization', held: 22, attended: 19, percentage: 86.4, type: 'Theory' },
      { code: 'CS603', name: 'Computer Networks & Protocols', held: 20, attended: 19, percentage: 95.0, type: 'Theory + Lab' },
      { code: 'CS604', name: 'Compiler Design & Automata', held: 14, attended: 11, percentage: 78.6, type: 'Theory' },
      { code: 'CS605', name: 'Software Engineering Labs', held: 10, attended: 10, percentage: 100.0, type: 'Lab Session' },
    ]
  }, [])

  // Deficit recovery calculation:
  // How many consecutive upcoming classes must the student attend without absence to reach the threshold?
  // (attended + x) / (held + x) >= threshold / 100  =>  x >= (threshold*held - 100*attended) / (100 - threshold)
  const atRiskSubjects = useMemo(() => {
    return subjectAttendance.map(sub => {
      const isBelow = sub.percentage < eligibilityThreshold
      let classesNeeded = 0
      if (isBelow && eligibilityThreshold < 100) {
        const t = eligibilityThreshold / 100
        classesNeeded = Math.ceil(Math.max(0, (t * sub.held - sub.attended) / (1 - t)))
      }
      return {
        ...sub,
        isBelow,
        classesNeeded
      }
    })
  }, [subjectAttendance, eligibilityThreshold])

  // Weekly attendance trend data (last 6 weeks)
  const weeklyTrend = [
    { week: 'Wk 1', attended: 15, held: 15, pct: 100.0 },
    { week: 'Wk 2', attended: 14, held: 15, pct: 93.3 },
    { week: 'Wk 3', attended: 13, held: 15, pct: 86.7 },
    { week: 'Wk 4', attended: 15, held: 15, pct: 100.0 },
    { week: 'Wk 5', attended: 13, held: 15, pct: 86.7 },
    { week: 'Wk 6', attended: 14, held: 15, pct: 93.3 },
  ]

  // Detailed recent session log records
  const sessionRecords = useMemo(() => {
    return [
      { id: 'att-1', date: '2026-10-12', subject: 'CS601: Operating Systems', session: 'Morning Lecture (09:00 - 10:00)', status: 'Present' },
      { id: 'att-2', date: '2026-10-12', subject: 'CS603: Computer Networks', session: 'Hands-on Lab (11:00 - 13:00)', status: 'Present' },
      { id: 'att-3', date: '2026-10-11', subject: 'CS602: Database Internals', session: 'Tutorial (14:00 - 15:00)', status: 'Present' },
      { id: 'att-4', date: '2026-10-10', subject: 'CS604: Compiler Design', session: 'Lecture (10:00 - 11:00)', status: 'Absent' },
      { id: 'att-5', date: '2026-10-09', subject: 'CS601: Operating Systems', session: 'Lab Session (14:00 - 16:00)', status: 'Present' },
      { id: 'att-6', date: '2026-10-08', subject: 'CS605: Software Engineering', session: 'Sprint Review (09:00 - 10:30)', status: 'Present' },
      { id: 'att-7', date: '2026-10-07', subject: 'CS602: Database Internals', session: 'Lecture (11:30 - 12:30)', status: 'Approved Leave' },
      { id: 'att-8', date: '2026-10-06', subject: 'CS604: Compiler Design', session: 'Lecture (15:00 - 16:00)', status: 'Present' },
    ]
  }, [])

  // Filtered session records
  const filteredSessions = useMemo(() => {
    return sessionRecords.filter(item => {
      const matchesSub = selectedSubjectFilter === 'all' || item.subject.toLowerCase().includes(selectedSubjectFilter.toLowerCase())
      const matchesStatus = selectedStatusFilter === 'all' || item.status.toLowerCase() === selectedStatusFilter.toLowerCase()
      return matchesSub && matchesStatus
    })
  }, [sessionRecords, selectedSubjectFilter, selectedStatusFilter])

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
            <CheckCircle2 size={15} /> Verified Institutional Biometrics
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Attendance Habits & Exam Eligibility
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
            Lecture attendance records, institutional threshold monitoring, and deficit recovery forecasting
          </p>
        </div>

        {/* Eligibility Indicator Pill */}
        <div style={{
          background: overallPercentage >= eligibilityThreshold ? 'var(--sq-success-bg)' : 'var(--sq-danger-bg)',
          color: overallPercentage >= eligibilityThreshold ? 'var(--sq-success)' : 'var(--sq-danger)',
          padding: '8px 16px',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {overallPercentage >= eligibilityThreshold ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{overallPercentage >= eligibilityThreshold ? 'Eligible for End-Sem Exams' : 'Below Policy Threshold'}</span>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Cumulative Attendance</span>
            <span className="sq-card-icon"><CheckCircle2 size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: overallPercentage >= eligibilityThreshold ? 'var(--sq-success)' : 'var(--sq-danger)' }}>
            {overallPercentage}%
          </div>
          <div className="sq-card-sub">
            <span>{totalAttended} attended of {totalHeld} conducted</span>
          </div>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Sessions Present</span>
            <span className="sq-card-icon"><Calendar size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: 'var(--sq-success)' }}>
            {totalAttended}
          </div>
          <div className="sq-card-sub">
            <span>Verified classroom biometric taps</span>
          </div>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Absences & Leaves</span>
            <span className="sq-card-icon"><AlertTriangle size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: 'var(--sq-maroon)' }}>
            {absentCount}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sq-text-light)' }}> absent</span>
          </div>
          <div className="sq-card-sub">
            <span>{approvedLeaveCount} approved duty leaves logged</span>
          </div>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Deficit Margin</span>
            <span className="sq-card-icon"><HelpCircle size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: 'var(--sq-maroon)' }}>
            +{(overallPercentage - eligibilityThreshold).toFixed(1)}%
          </div>
          <div className="sq-card-sub">
            <span>Buffer above {eligibilityThreshold}% minimum threshold</span>
          </div>
        </div>
      </div>

      {/* Configurable Threshold & Recovery Forecaster */}
      <div className="sq-panel" style={{ background: '#FFFDFE', border: '1.5px solid var(--sq-border-light)' }}>
        <div className="sq-panel-header">
          <div className="sq-panel-title">
            <h3>Institution Eligibility Policy Simulator</h3>
            <small>Adjust target threshold to simulate examination debarment policies and recovery needs</small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)' }}>
              Current Cutoff: {eligibilityThreshold}%
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--sq-text-muted)', fontWeight: 600 }}>65% (Relaxed)</span>
          <input
            type="range"
            min="65"
            max="90"
            step="5"
            value={eligibilityThreshold}
            onChange={e => setEligibilityThreshold(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--sq-maroon)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--sq-text-muted)', fontWeight: 600 }}>90% (Strict)</span>
        </div>

        {/* Calculation explanation */}
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--sq-bg-base)', fontSize: 11, color: 'var(--sq-text-muted)', lineHeight: 1.5 }}>
          <b>Policy Explanation:</b> Attendance percentage is strictly computed as <code>(Attended Classes / Total Held Sessions) × 100</code>. Approved duty leaves are validated by the department advisor. Any subject below <b>{eligibilityThreshold}%</b> requires attendance of consecutive upcoming lectures without absence to clear exam criteria.
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown & Weekly Trend */}
      <div className="sq-grid-2col">
        {/* Subject-Wise Bars */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <h3>Subject-Wise Attendance Breakdown</h3>
              <small>Session totals compared with {eligibilityThreshold}% policy benchmark</small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {atRiskSubjects.map(sub => (
              <div key={sub.code}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>
                    {sub.code}: {sub.name}
                  </span>
                  <span style={{ fontWeight: 700, color: sub.percentage >= eligibilityThreshold ? 'var(--sq-success)' : 'var(--sq-danger)' }}>
                    {sub.percentage}% ({sub.attended}/{sub.held} sessions)
                  </span>
                </div>
                <div className="sq-bar-track" style={{ height: 8, borderRadius: 4, position: 'relative' }}>
                  <div
                    className={`sq-bar-fill ${sub.percentage >= eligibilityThreshold ? 'fill-green' : 'fill-rose'}`}
                    style={{ width: `${Math.min(100, sub.percentage)}%`, height: '100%', borderRadius: 4 }}
                  />
                  {/* Threshold marker line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${eligibilityThreshold}%`,
                      top: -2,
                      bottom: -2,
                      width: 2,
                      background: 'var(--sq-maroon)',
                      zIndex: 2
                    }}
                    title={`Policy threshold: ${eligibilityThreshold}%`}
                  />
                </div>
                {sub.isBelow && (
                  <div style={{ fontSize: 10, color: 'var(--sq-danger)', marginTop: 3, fontWeight: 600 }}>
                    ⚠ Deficit Warning: Attend next {sub.classesNeeded} classes consecutively to cross {eligibilityThreshold}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <h3>Weekly Attendance Consistency</h3>
              <small>Attendance velocity over the preceding 6 academic weeks</small>
            </div>
            <span className="sq-tag">6-Week Span</span>
          </div>

          <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '20px 10px 10px' }}>
            {weeklyTrend.map(wk => (
              <div key={wk.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 6 }}>
                  {wk.pct}%
                </span>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${wk.pct}%`,
                      background: wk.pct >= 90 ? 'linear-gradient(180deg, var(--sq-rose-soft) 0%, var(--sq-maroon) 100%)' : 'var(--sq-pink-soft)',
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
      </div>

      {/* Attendance Session Ledger Table with Filters */}
      <div className="sq-panel">
        <div className="sq-panel-header">
          <div className="sq-panel-title">
            <h3>Recent Biometric Attendance Log</h3>
            <small>Auditable classroom and laboratory attendance events</small>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={13} style={{ color: 'var(--sq-text-light)' }} />
              <select
                value={selectedSubjectFilter}
                onChange={e => setSelectedSubjectFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 11, background: '#fff' }}
              >
                <option value="all">All Subjects</option>
                <option value="Operating Systems">Operating Systems</option>
                <option value="Database">Database Internals</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Compiler Design">Compiler Design</option>
              </select>
            </div>

            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 11, background: '#fff' }}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="approved leave">Approved Leave</option>
            </select>
          </div>
        </div>

        <div className="sq-table-wrap">
          <table className="sq-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Session Details</th>
                <th>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map(sess => (
                <tr key={sess.id}>
                  <td><b>{sess.date}</b></td>
                  <td>{sess.subject}</td>
                  <td>{sess.session}</td>
                  <td>
                    <span className="sq-tag" style={{
                      background: sess.status === 'Present' ? 'var(--sq-success-bg)' : sess.status === 'Absent' ? 'var(--sq-danger-bg)' : 'var(--sq-warning-bg)',
                      color: sess.status === 'Present' ? 'var(--sq-success)' : sess.status === 'Absent' ? 'var(--sq-danger)' : 'var(--sq-warning)',
                      fontWeight: 700
                    }}>
                      {sess.status === 'Present' ? '✓ Present' : sess.status === 'Absent' ? '✗ Absent' : '★ Approved Leave'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
