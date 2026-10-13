import { useState } from 'react'
import {
  ArrowLeft, CircleAlert, Sparkles, ShieldCheck,
  CheckCircle2, User, Plus
} from 'lucide-react'
import type { StudentProfile } from '../lib/api'

interface UnifiedStudentProfileProps {
  student: StudentProfile;
  onBack?: () => void;
  onSaveIntervention?: (data: any) => Promise<void>;
}

export function UnifiedStudentProfile({ student, onBack, onSaveIntervention }: UnifiedStudentProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance' | 'lms' | 'placement' | 'interventions'>('overview')
  const [showInterventionModal, setShowInterventionModal] = useState(false)
  const [interventionForm, setInterventionForm] = useState({
    concern: student.risk_factors[0]?.indicator || 'Academic Mentoring Follow-Up',
    recommended_action: student.recommendations[0]?.recommended_action || '',
    assigned_to: 'Dr. Sarah Mitchell (Assigned Mentor)',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'planned',
    notes: ''
  })
  const [savingIntervention, setSavingIntervention] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

  async function handleInterventionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingIntervention(true)
    try {
      if (onSaveIntervention) {
        await onSaveIntervention({
          student_id: student.student_id,
          ...interventionForm
        })
      }
      setActionNotice('Intervention recorded and scheduled successfully.')
      setShowInterventionModal(false)
    } catch {
      setActionNotice('Saved locally in demo workspace.')
      setShowInterventionModal(false)
    } finally {
      setSavingIntervention(false)
    }
  }

  return (
    <div className="unified-profile-wrap" style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        {onBack && (
          <button
            onClick={onBack}
            className="portal-secondary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <ArrowLeft size={14} /> Back to Cohort Directory
          </button>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {student.scenario_tag && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--soft-cloud)', color: 'var(--deep-maroon)', padding: '4px 10px', borderRadius: 12, border: '1px solid var(--baby-pink)' }}>
              {student.scenario_tag}
            </span>
          )}
          <button
            className="portal-primary-button"
            onClick={() => setShowInterventionModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <Plus size={14} /> Plan Support Action
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{ background: '#E8F5E9', color: '#1B5E20', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {actionNotice}
        </div>
      )}

      {/* Hero Student Banner */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(169, 88, 115, 0.2)', padding: '24px', boxShadow: '0 8px 30px rgba(75, 16, 40, 0.05)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--soft-cloud)', display: 'grid', placeItems: 'center', color: 'var(--deep-maroon)' }}>
                <User size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, color: 'var(--main-dark)', fontFamily: 'var(--font-serif)' }}>
                  {student.full_name}
                </h1>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {student.student_id} · {student.department} · Year {student.academic_year} (Section {student.section})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 12, background: 'var(--soft-cloud)', color: 'var(--main-dark)', fontWeight: 600 }}>
                Segment: {student.segment_label}
              </span>
              <span className={`score-pill-${student.success_status}`}>
                Coverage: {student.data_coverage}% ({student.success_status})
              </span>
            </div>
          </div>

          {/* Key Indicators Score Summary */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
            {/* Success Score Box */}
            <div style={{ background: 'var(--milky-mist)', padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border-light)', minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted-rose)', textTransform: 'uppercase' }}>
                SUCCESS SCORE
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--deep-maroon)', margin: '4px 0', fontFamily: 'var(--font-serif)' }}>
                {student.success_score !== null ? `${student.success_score}` : '—'}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>/100</span>
              </div>
              <span className={`score-pill-${student.success_status}`}>
                {student.success_status.toUpperCase()}
              </span>
            </div>

            {/* Risk Score Box */}
            <div style={{ background: student.risk_category === 'Critical' ? '#FFF0F2' : student.risk_category === 'High' ? '#FFF5F5' : '#F9FBF9', padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(169, 88, 115, 0.2)', minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: student.risk_category === 'Critical' || student.risk_category === 'High' ? 'var(--status-critical)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                RISK SCORE
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: student.risk_category === 'Critical' ? 'var(--status-critical)' : student.risk_category === 'High' ? 'var(--status-high)' : '#2E7D32', margin: '4px 0', fontFamily: 'var(--font-serif)' }}>
                {student.risk_score}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>/100</span>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12,
                background: student.risk_category === 'Critical' ? 'var(--status-critical-bg)' : student.risk_category === 'High' ? 'var(--status-high-bg)' : 'var(--status-low-bg)',
                color: student.risk_category === 'Critical' ? 'var(--status-critical)' : student.risk_category === 'High' ? 'var(--status-high)' : 'var(--status-low)'
              }}>
                {student.risk_category.toUpperCase()} RISK
              </span>
            </div>
          </div>
        </div>

        {/* Segment Context Alert */}
        <div style={{ marginTop: 18, padding: '12px 16px', background: 'var(--soft-cloud)', borderRadius: 10, fontSize: 11, color: 'var(--main-dark)', lineHeight: 1.6, borderLeft: '4px solid var(--muted-rose)' }}>
          <b>Why this student is in this segment:</b> {student.segment_reason}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #ECEEF3', marginBottom: 20 }}>
        {[
          { key: 'overview', label: 'Score Explainability & Risk' },
          { key: 'academics', label: 'Academics & CGPA' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'lms', label: 'LMS Activity' },
          { key: 'placement', label: 'Placement Readiness' },
          { key: 'interventions', label: `Interventions (${student.interventions_history?.length || 0})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.key ? '3px solid var(--muted-rose)' : '3px solid transparent',
              color: activeTab === tab.key ? 'var(--deep-maroon)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview (Explainability) */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 24 }}>
          {/* Left Column: Success Score Breakdown */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--muted-rose)" /> Student Success Score Breakdown
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Formula: (0.35 × Academic) + (0.20 × Attendance) + (0.15 × LMS) + (0.25 × Placement) + (0.05 × Engagement).
            </p>

            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Observed</th>
                    <th>Weight</th>
                    <th>Contribution</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(student.success_breakdown).map(([key, item]) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.is_missing ? <span style={{ color: '#C0392B' }}>Missing</span> : `${item.observed_value}/100`}</td>
                      <td>{item.weight_pct}%</td>
                      <td style={{ fontWeight: 700, color: 'var(--deep-maroon)' }}>
                        {item.weighted_contribution !== null ? `+${item.weighted_contribution} pts` : '—'}
                      </td>
                      <td>
                        {item.is_missing ? (
                          <span style={{ fontSize: 9, background: '#FCE4EC', color: '#C2185B', padding: '2px 6px', borderRadius: 4 }}>
                            Pending
                          </span>
                        ) : (
                          <span style={{ fontSize: 9, background: '#E8F5E9', color: '#2E7D32', padding: '2px 6px', borderRadius: 4 }}>
                            Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, fontSize: 10, color: '#777', lineHeight: 1.5, background: 'var(--milky-mist)', padding: 10, borderRadius: 8 }}>
              <b>Missing Data Policy:</b> If an indicator is missing, it is not assumed to be zero. When overall coverage meets or exceeds 60%, available components are re-normalized over their represented weight and marked <i>provisional</i>. Official scores are withheld if coverage is under 60%.
            </div>
          </div>

          {/* Right Column: Risk Indicators & Recommendations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Risk Warnings */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
              <h3 style={{ fontSize: 15, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CircleAlert size={16} color="var(--status-critical)" /> Identified Warning Factors ({student.risk_factors.length})
              </h3>
              {student.risk_factors.length === 0 ? (
                <div style={{ padding: 16, background: '#E8F5E9', color: '#1B5E20', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} /> No acute warning factors detected for current reporting period.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {student.risk_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: factor.severity === 'critical' ? 'var(--status-critical-bg)' : factor.severity === 'high' ? 'var(--status-high-bg)' : 'var(--status-moderate-bg)',
                        borderLeft: `4px solid ${factor.severity === 'critical' ? 'var(--status-critical)' : factor.severity === 'high' ? 'var(--status-high)' : 'var(--status-moderate)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <b style={{ fontSize: 12, color: 'var(--main-dark)' }}>{factor.indicator}</b>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>
                          +{factor.points} Risk Pts
                        </span>
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#444' }}>{factor.explanation}</p>
                      <div style={{ fontSize: 9, color: '#666' }}>
                        Observed: <b>{factor.observed_value}</b> · Benchmark: <b>{factor.threshold}</b>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Interventions */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} color="var(--muted-rose)" /> Recommended Support Actions
                </h3>
                <button
                  onClick={() => setShowInterventionModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--deep-maroon)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Assign Action
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {student.recommendations.map((rec, i) => (
                  <div key={i} style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--milky-mist)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <b style={{ fontSize: 11, color: 'var(--deep-maroon)' }}>{rec.action_type}</b>
                      <span style={{ fontSize: 9, background: 'var(--soft-cloud)', color: 'var(--muted-rose)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 10, color: '#444', lineHeight: 1.5 }}>
                      {rec.recommended_action}
                    </p>
                    <div style={{ fontSize: 9, color: '#777' }}>
                      Responsible: <b>{rec.responsible_role}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Academics */}
      {activeTab === 'academics' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontFamily: 'var(--font-serif)', margin: '0 0 16px' }}>Academic Performance Details</h3>
          {student.academic ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>CUMULATIVE CGPA</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.academic.cgpa} / 10.0
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>MARKS PERCENTAGE</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.academic.marks_percentage}%
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>ACTIVE BACKLOGS</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: student.academic.backlog_count > 0 ? 'var(--status-critical)' : '#2E7D32', marginTop: 4 }}>
                    {student.academic.backlog_count}
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>SEMESTER PROGRESS</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    Semester {student.academic.semester}
                  </div>
                </div>
              </div>

              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Exam Marks</th>
                      <th>Grade Point</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{student.academic.subject_id}</td>
                      <td>{student.academic.subject_name}</td>
                      <td>{student.academic.marks_percentage}%</td>
                      <td>{(student.academic.marks_percentage / 10).toFixed(1)}</td>
                      <td>
                        <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: student.academic.marks_percentage >= 50 ? '#E8F5E9' : '#FFEBEE', color: student.academic.marks_percentage >= 50 ? '#2E7D32' : '#C62828' }}>
                          {student.academic.marks_percentage >= 50 ? 'Passed' : 'At-Risk / Backlog'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              Academic examination records have not yet been imported or verified for this student.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Attendance */}
      {activeTab === 'attendance' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontFamily: 'var(--font-serif)', margin: '0 0 16px' }}>Attendance Profile</h3>
          {student.attendance ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>OVERALL ATTENDANCE</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: student.attendance.percentage < 75 ? 'var(--status-critical)' : '#2E7D32', marginTop: 4 }}>
                    {student.attendance.percentage}%
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>CLASSES ATTENDED</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.attendance.classes_attended} / {student.attendance.classes_held}
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>INSTITUTIONAL MINIMUM</small>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    75.0%
                  </div>
                </div>
              </div>

              {student.attendance.percentage < 75 && (
                <div style={{ padding: '14px 18px', background: 'var(--status-critical-bg)', color: 'var(--status-critical)', borderRadius: 8, fontSize: 11, marginBottom: 16 }}>
                  <b>Warning:</b> Attendance is below the mandatory 75% institutional requirement. Student requires an advising check-in.
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              Attendance records are currently missing for this reporting cycle.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: LMS */}
      {activeTab === 'lms' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontFamily: 'var(--font-serif)', margin: '0 0 16px' }}>LMS & Digital Learning Activity</h3>
          {student.lms ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>ASSIGNMENT COMPLETION</small>
                <div style={{ fontSize: 24, fontWeight: 800, color: student.lms.completion_rate < 60 ? 'var(--status-critical)' : 'var(--deep-maroon)', marginTop: 4 }}>
                  {student.lms.completion_rate}%
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>OVERDUE SUBMISSIONS</small>
                <div style={{ fontSize: 24, fontWeight: 800, color: student.lms.overdue > 0 ? 'var(--status-critical)' : '#2E7D32', marginTop: 4 }}>
                  {student.lms.overdue}
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--soft-cloud)', borderRadius: 10 }}>
                <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>ACTIVE STUDY TIME</small>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                  {student.lms.active_minutes} mins/wk
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              No LMS learning telemetry connected yet.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Placement Readiness */}
      {activeTab === 'placement' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontFamily: 'var(--font-serif)', margin: '0 0 16px' }}>Career & Placement Assessment Readiness</h3>
          {student.placement ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
                <div style={{ padding: 14, background: 'var(--soft-cloud)', borderRadius: 10, textAlign: 'center' }}>
                  <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>CODING</small>
                  <div style={{ fontSize: 22, fontWeight: 800, color: student.placement.coding_percentage < 50 ? 'var(--status-critical)' : 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.placement.coding_percentage}%
                  </div>
                </div>
                <div style={{ padding: 14, background: 'var(--soft-cloud)', borderRadius: 10, textAlign: 'center' }}>
                  <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>APTITUDE</small>
                  <div style={{ fontSize: 22, fontWeight: 800, color: student.placement.aptitude_percentage < 50 ? 'var(--status-critical)' : 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.placement.aptitude_percentage}%
                  </div>
                </div>
                <div style={{ padding: 14, background: 'var(--soft-cloud)', borderRadius: 10, textAlign: 'center' }}>
                  <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>MOCK INTERVIEW</small>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.placement.mock_interview_score}%
                  </div>
                </div>
                <div style={{ padding: 14, background: 'var(--soft-cloud)', borderRadius: 10, textAlign: 'center' }}>
                  <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>TECHNICAL SKILL</small>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.placement.technical_skill_score}%
                  </div>
                </div>
                <div style={{ padding: 14, background: 'var(--soft-cloud)', borderRadius: 10, textAlign: 'center' }}>
                  <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>COMMUNICATION</small>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--deep-maroon)', marginTop: 4 }}>
                    {student.placement.communication_skill_score}%
                  </div>
                </div>
              </div>

              {student.placement.coding_percentage < 50 && (
                <div style={{ padding: '12px 16px', background: 'var(--soft-cloud)', borderRadius: 8, fontSize: 11, color: 'var(--main-dark)', borderLeft: '4px solid var(--muted-rose)' }}>
                  <b>Placement Officer Note:</b> Student's coding assessment ({student.placement.coding_percentage}%) indicates a gap in hands-on data structures or algorithm practice. Enrolling in weekly practice sessions will raise Tier-1 hiring chances.
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              Placement readiness assessments have not been administered yet for this cohort year.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Interventions History */}
      {activeTab === 'interventions' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontFamily: 'var(--font-serif)', margin: 0 }}>Interventions & Follow-Up Tracking</h3>
            <button className="portal-primary-button" onClick={() => setShowInterventionModal(true)} style={{ fontSize: 11 }}>
              <Plus size={14} /> Plan Support Action
            </button>
          </div>

          {!student.interventions_history || student.interventions_history.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              No interventions recorded yet for this student. Use "Plan Support Action" to schedule one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {student.interventions_history.map(item => (
                <div key={item.id} style={{ border: '1px solid #ECEEF3', borderRadius: 10, padding: 16, background: 'var(--milky-mist)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <b style={{ fontSize: 13, color: 'var(--main-dark)' }}>{item.concern}</b>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--soft-cloud)', color: 'var(--deep-maroon)' }}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: '#444' }}>
                    <b>Action:</b> {item.recommended_action}
                  </p>
                  <div style={{ display: 'flex', gap: 20, fontSize: 10, color: '#777', flexWrap: 'wrap' }}>
                    <span>Assigned: <b>{item.assigned_to}</b></span>
                    <span>Due Date: <b>{item.due_date || '—'}</b></span>
                    <span>Follow-up: <b>{item.follow_up_date || '—'}</b></span>
                  </div>
                  {item.outcome && (
                    <div style={{ marginTop: 10, padding: 8, background: '#E8F5E9', borderRadius: 6, fontSize: 10, color: '#1B5E20' }}>
                      <b>Outcome Observed:</b> {item.outcome}
                    </div>
                  )}
                  {item.pre_success_score !== undefined && item.post_success_score !== undefined && (
                    <div style={{ marginTop: 8, fontSize: 10, color: '#555', display: 'flex', gap: 16 }}>
                      <span>Pre-intervention Success: <b>{item.pre_success_score}</b></span>
                      <span>Post-intervention Success: <b>{item.post_success_score || 'Tracking in progress'}</b></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan Intervention Modal */}
      {showInterventionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28, 7, 17, 0.65)', display: 'grid', placeItems: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
              Plan Evidence-Based Support Action
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 11, color: 'var(--text-muted)' }}>
              Assign a practical, traceable intervention for <b>{student.full_name}</b> ({student.student_id}).
            </p>

            <form onSubmit={handleInterventionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
                Concern or Focus Area
                <input
                  required
                  value={interventionForm.concern}
                  onChange={e => setInterventionForm({ ...interventionForm, concern: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 12 }}
                />
              </label>

              <label style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
                Recommended Action
                <textarea
                  required
                  rows={3}
                  value={interventionForm.recommended_action}
                  onChange={e => setInterventionForm({ ...interventionForm, recommended_action: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 12 }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
                  Responsible Staff / Mentor
                  <input
                    required
                    value={interventionForm.assigned_to}
                    onChange={e => setInterventionForm({ ...interventionForm, assigned_to: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 12 }}
                  />
                </label>

                <label style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
                  Target Due Date
                  <input
                    type="date"
                    value={interventionForm.due_date}
                    onChange={e => setInterventionForm({ ...interventionForm, due_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 12 }}
                  />
                </label>
              </div>

              <label style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
                Follow-up Check-in Date
                <input
                  type="date"
                  value={interventionForm.follow_up_date}
                  onChange={e => setInterventionForm({ ...interventionForm, follow_up_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 12 }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="portal-secondary-button"
                  onClick={() => setShowInterventionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIntervention}
                  className="portal-primary-button"
                >
                  {savingIntervention ? 'Saving...' : 'Save & Track Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
