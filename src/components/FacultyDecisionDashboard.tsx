import { useState, useEffect, useMemo } from 'react'
import {
  Users, AlertTriangle, Briefcase, CheckCircle2,
  Search, Filter, ArrowRight
} from 'lucide-react'
import { api, type StudentProfile, type AnalyticsOverview } from '../lib/api'
import { UnifiedStudentProfile } from './UnifiedStudentProfile'

interface FacultyDecisionDashboardProps {
  initialStudentId?: string;
  onSelectStudentId?: (id: string) => void;
}

export function FacultyDecisionDashboard({ initialStudentId, onSelectStudentId }: FacultyDecisionDashboardProps) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedSegment, setSelectedSegment] = useState('')
  const [selectedRisk, setSelectedRisk] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      api.getOverview(),
      api.getStudents()
    ]).then(([ov, st]) => {
      if (cancelled) return
      setOverview(ov)
      setStudents(st.students)
      if (initialStudentId) {
        const found = st.students.find(s => s.student_id.toLowerCase() === initialStudentId.toLowerCase())
        if (found) setSelectedStudent(found)
      } else {
        setSelectedStudent(null)
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [initialStudentId])

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedDept && s.department !== selectedDept) return false
      if (selectedYear && s.academic_year !== selectedYear) return false
      if (selectedSegment && s.segment_key !== selectedSegment) return false
      if (selectedRisk && s.risk_category.toLowerCase() !== selectedRisk.toLowerCase()) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!s.full_name.toLowerCase().includes(q) && !s.student_id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [students, selectedDept, selectedYear, selectedSegment, selectedRisk, search])

  const departments = useMemo(() => {
    return Array.from(new Set(students.map(s => s.department)))
  }, [students])

  if (selectedStudent) {
    return (
      <UnifiedStudentProfile
        student={selectedStudent}
        onBack={() => {
          setSelectedStudent(null)
          onSelectStudentId?.('')
        }}
        onSaveIntervention={async (data) => {
          await api.createIntervention(data)
          // reload student
          const updated = await api.getStudent(selectedStudent.student_id)
          setSelectedStudent(updated)
        }}
      />
    )
  }

  return (
    <div className="faculty-dashboard-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            <span /> FACULTY DECISION INTELLIGENCE
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
            Cohort Success & Early Warning Analytics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Evidence-based student progress, transparent risk factors, and coordinated support interventions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 10, background: 'var(--soft-cloud)', color: 'var(--deep-maroon)', padding: '6px 12px', borderRadius: 20, fontWeight: 700, border: '1px solid var(--baby-pink)' }}>
            Institutional Benchmark: 75% Attendance · 50% Coding Cutoff
          </span>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 18, background: '#fff', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
          Loading cohort metrics from intelligence engine...
        </div>
      )}

      {/* KPI Overview Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {/* Total Cohort */}
          <div className="portal-metric" style={{ background: '#fff' }}>
            <span className="portal-metric-icon"><Users size={18} /></span>
            <span className="portal-metric-label">TOTAL COHORT</span>
            <b>{overview.cohort_summary.total_students}</b>
            <small>{overview.cohort_summary.complete_profiles} Complete profiles ({overview.cohort_summary.data_completeness_pct}%)</small>
          </div>

          {/* High & Critical Risk */}
          <div
            className="portal-metric"
            style={{ background: '#FFF5F6', cursor: 'pointer', border: '1px solid rgba(192, 57, 43, 0.2)' }}
            onClick={() => setSelectedRisk('Critical')}
            title="Click to filter critical risk students"
          >
            <span className="portal-metric-icon" style={{ background: '#FDE8EC', color: 'var(--status-critical)' }}><AlertTriangle size={18} /></span>
            <span className="portal-metric-label" style={{ color: 'var(--status-critical)' }}>STUDENTS AT RISK</span>
            <b style={{ color: 'var(--status-critical)' }}>
              {overview.risk_distribution.critical + overview.risk_distribution.high}
            </b>
            <small style={{ color: '#900' }}>
              {overview.risk_distribution.critical} Critical · {overview.risk_distribution.high} High warning
            </small>
          </div>

          {/* Placement Preparation */}
          <div
            className="portal-metric"
            style={{ background: '#fff', cursor: 'pointer' }}
            onClick={() => setSelectedSegment('strong_academics_low_placement')}
            title="Click to view students needing placement prep"
          >
            <span className="portal-metric-icon"><Briefcase size={18} /></span>
            <span className="portal-metric-label">PLACEMENT READY</span>
            <b>{overview.cohort_summary.placement_ready_count}</b>
            <small>Coding score ≥ 65% benchmark</small>
          </div>

          {/* Active Interventions */}
          <div className="portal-metric" style={{ background: '#fff' }}>
            <span className="portal-metric-icon" style={{ background: '#E8F5E9', color: '#2E7D32' }}><CheckCircle2 size={18} /></span>
            <span className="portal-metric-label">ACTIVE INTERVENTIONS</span>
            <b>{overview.cohort_summary.active_interventions}</b>
            <small>Scheduled faculty follow-ups</small>
          </div>
        </div>
      )}

      {/* Visual Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18, marginBottom: 24 }}>
        {/* Risk Distribution & Success Histogram */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
              Risk Level vs Success Score Distribution
            </h3>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Authoritative Database Metrics</span>
          </div>

          {/* Risk Level Horizontal Bar */}
          {overview && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 6, fontWeight: 700 }}>
                <span style={{ color: 'var(--status-critical)' }}>Critical ({overview.risk_distribution.critical})</span>
                <span style={{ color: 'var(--status-high)' }}>High ({overview.risk_distribution.high})</span>
                <span style={{ color: 'var(--status-moderate)' }}>Moderate ({overview.risk_distribution.moderate})</span>
                <span style={{ color: 'var(--status-low)' }}>Low ({overview.risk_distribution.low})</span>
              </div>
              <div style={{ height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#eee' }}>
                <div style={{ width: `${(overview.risk_distribution.critical / overview.cohort_summary.total_students) * 100}%`, background: 'var(--status-critical)' }} title="Critical" />
                <div style={{ width: `${(overview.risk_distribution.high / overview.cohort_summary.total_students) * 100}%`, background: 'var(--status-high)' }} title="High" />
                <div style={{ width: `${(overview.risk_distribution.moderate / overview.cohort_summary.total_students) * 100}%`, background: 'var(--status-moderate)' }} title="Moderate" />
                <div style={{ width: `${(overview.risk_distribution.low / overview.cohort_summary.total_students) * 100}%`, background: '#4CAF50' }} title="Low" />
              </div>
            </div>
          )}

          {/* Mini Comparative Trend Graph */}
          <div style={{ background: 'var(--milky-mist)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
              <b>Average Cohort Trajectory</b>
              <span style={{ color: '#2E7D32', fontWeight: 700 }}>Avg Success: {overview?.cohort_summary.average_success_score}/100</span>
            </div>
            <svg viewBox="0 0 400 60" style={{ width: '100%', height: 60 }}>
              <path d="M 0 45 Q 100 35, 200 28 T 400 15" fill="none" stroke="var(--muted-rose)" strokeWidth="3" />
              <path d="M 0 55 Q 100 48, 200 45 T 400 38" fill="none" stroke="#2E7D32" strokeWidth="2" strokeDasharray="4,4" />
              <circle cx="200" cy="28" r="4" fill="var(--deep-maroon)" />
              <circle cx="400" cy="15" r="4" fill="var(--deep-maroon)" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888', marginTop: 4 }}>
              <span>Semester 1</span>
              <span>Semester 3</span>
              <span>Semester 5</span>
              <span>Semester 7 (Current)</span>
            </div>
          </div>
        </div>

        {/* Segment Distribution */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
            Student Segments ({Object.keys(overview?.segment_distribution || {}).length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'strong_academics_low_placement', label: 'Strong Academics, Placement Gap', color: 'var(--muted-rose)' },
              { key: 'declining_academics_low_attendance', label: 'Declining Academics & Attendance', color: 'var(--status-critical)' },
              { key: 'insufficient_data', label: 'Insufficient Data (Provisional)', color: '#888' },
              { key: 'strong_academics_strong_placement', label: 'High Performing & Placement Ready', color: '#2E7D32' },
            ].map(item => {
              const count = overview?.segment_distribution[item.key] || 0
              return (
                <div
                  key={item.key}
                  onClick={() => setSelectedSegment(selectedSegment === item.key ? '' : item.key)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: selectedSegment === item.key ? 'var(--soft-cloud)' : '#F9FBF9',
                    border: selectedSegment === item.key ? '1px solid var(--muted-rose)' : '1px solid #ECEEF3',
                    cursor: 'pointer',
                    fontSize: 11
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--main-dark)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, background: '#fff', padding: '2px 8px', borderRadius: 12, border: '1px solid #ddd' }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cohort Student Directory with Filters */}
      <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
              Authorized Cohort Directory ({filteredStudents.length} Students)
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Click any student row to inspect transparent score evidence, risk indicators, and intervention history.
            </p>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8F9FC', padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E5EC' }}>
            <Search size={14} color="#888" />
            <input
              type="text"
              placeholder="Search by student ID or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11, width: 200 }}
            />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={12} /> Filter:
          </span>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid #D0D5DD' }}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid #D0D5DD' }}
          >
            <option value="">All Academic Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid #D0D5DD' }}
          >
            <option value="">All Risk Categories</option>
            <option value="Critical">Critical Risk</option>
            <option value="High">High Risk</option>
            <option value="Moderate">Moderate Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          <select
            value={selectedSegment}
            onChange={e => setSelectedSegment(e.target.value)}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid #D0D5DD' }}
          >
            <option value="">All Segments</option>
            <option value="strong_academics_low_placement">Strong Academics, Placement Gap</option>
            <option value="declining_academics_low_attendance">Declining Academics & Attendance</option>
            <option value="insufficient_data">Insufficient Data (Provisional)</option>
            <option value="strong_academics_strong_placement">High Performing & Ready</option>
          </select>

          {(selectedDept || selectedRisk || selectedSegment || search) && (
            <button
              onClick={() => { setSelectedDept(''); setSelectedRisk(''); setSelectedSegment(''); setSearch('') }}
              style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--deep-maroon)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Students Table */}
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Year</th>
                <th>Success Score</th>
                <th>Risk Status</th>
                <th>Student Segment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.slice(0, 15).map(s => (
                <tr
                  key={s.student_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedStudent(s)
                    onSelectStudentId?.(s.student_id)
                  }}
                >
                  <td style={{ fontWeight: 700, color: 'var(--deep-maroon)' }}>
                    {s.student_id}
                  </td>
                  <td>
                    <b>{s.full_name}</b>
                    {s.scenario_tag && (
                      <span style={{ display: 'block', fontSize: 9, color: 'var(--muted-rose)', fontWeight: 600 }}>
                        {s.scenario_tag}
                      </span>
                    )}
                  </td>
                  <td>{s.department}</td>
                  <td>Year {s.academic_year}</td>
                  <td>
                    {s.success_score !== null ? (
                      <span style={{ fontWeight: 700 }}>
                        {s.success_score}/100{' '}
                        <small style={{ fontSize: 9, color: '#888' }}>({s.success_status})</small>
                      </span>
                    ) : (
                      <span className="score-pill-insufficient">Insufficient data</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: s.risk_category === 'Critical' ? 'var(--status-critical-bg)' : s.risk_category === 'High' ? 'var(--status-high-bg)' : 'var(--status-low-bg)',
                      color: s.risk_category === 'Critical' ? 'var(--status-critical)' : s.risk_category === 'High' ? 'var(--status-high)' : 'var(--status-low)'
                    }}>
                      {s.risk_category}
                    </span>
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {s.segment_label}
                  </td>
                  <td>
                    <button
                      className="portal-secondary-button"
                      style={{ fontSize: 10, padding: '4px 8px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedStudent(s)
                        onSelectStudentId?.(s.student_id)
                      }}
                    >
                      Inspect Profile <ArrowRight size={11} style={{ display: 'inline', marginLeft: 3 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length > 15 && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#777' }}>
            Showing 15 of {filteredStudents.length} students. Use the search bar above to narrow down.
          </div>
        )}
      </section>
    </div>
  )
}
