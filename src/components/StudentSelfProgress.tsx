import { useState, useEffect } from 'react'
import {
  GraduationCap, Sparkles, CheckCircle2,
  Clock, ShieldCheck, Target
} from 'lucide-react'
import { api, type StudentProfile } from '../lib/api'

export function StudentSelfProgress() {
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Default to student S101 (Priya) for demonstration
    api.getStudent('STU-CS-101').then(res => {
      setStudent(res)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading || !student) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading your personal progress workspace...</div>
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: 20 }}>
      {/* Student Banner */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ECEEF3', padding: 24, marginBottom: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              <span /> YOUR STUDENT SUCCESS DASHBOARD
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
              Welcome back, {student.full_name.split(' ')[0]}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {student.department} · Year {student.academic_year} · Roll Number: {student.student_id}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ background: 'var(--milky-mist)', padding: '12px 20px', borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted-rose)', textTransform: 'uppercase' }}>YOUR SUCCESS SCORE</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--deep-maroon)', fontFamily: 'var(--font-serif)' }}>
                {student.success_score} <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>/100</span>
              </div>
              <span className={`score-pill-${student.success_status}`} style={{ fontSize: 9 }}>
                {student.success_status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--soft-cloud)', borderRadius: 8, fontSize: 11, color: 'var(--main-dark)' }}>
          <ShieldCheck size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2, color: 'var(--muted-rose)' }} />
          <b>Student Note:</b> The Success Score is an explainable progress indicator reflecting recent academic, attendance, and preparation milestones. It is not an evaluation of your intelligence or future potential.
        </div>
      </div>

      {/* 4 Dimension Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="portal-metric" style={{ background: '#fff' }}>
          <span className="portal-metric-icon"><GraduationCap size={18} /></span>
          <span className="portal-metric-label">ACADEMIC CGPA</span>
          <b>{student.academic?.cgpa || '8.92'}</b>
          <small>{student.academic?.marks_percentage || 88.5}% average marks</small>
        </div>

        <div className="portal-metric" style={{ background: '#fff' }}>
          <span className="portal-metric-icon" style={{ background: '#E8F5E9', color: '#2E7D32' }}><CheckCircle2 size={18} /></span>
          <span className="portal-metric-label">ATTENDANCE</span>
          <b>{student.attendance?.percentage || 93.3}%</b>
          <small>{student.attendance?.classes_attended} / {student.attendance?.classes_held} classes</small>
        </div>

        <div className="portal-metric" style={{ background: '#fff' }}>
          <span className="portal-metric-icon"><Clock size={18} /></span>
          <span className="portal-metric-label">LMS COMPLETION</span>
          <b>{student.lms?.completion_rate || 95}%</b>
          <small>0 overdue assignments</small>
        </div>

        <div className="portal-metric" style={{ background: '#fff' }}>
          <span className="portal-metric-icon" style={{ background: 'var(--soft-cloud)', color: 'var(--deep-maroon)' }}><Target size={18} /></span>
          <span className="portal-metric-label">CODING READINESS</span>
          <b>{student.placement?.coding_percentage || 36}%</b>
          <small>Target: ≥ 50% for Tier-1</small>
        </div>
      </div>

      {/* Suggested Next Steps */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--muted-rose)" /> Personal Improvement Opportunities
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {student.recommendations.map((rec, i) => (
            <div key={i} style={{ padding: '12px 16px', background: 'var(--milky-mist)', border: '1px solid var(--border-light)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <b style={{ fontSize: 12, color: 'var(--deep-maroon)' }}>{rec.action_type}</b>
                <span style={{ fontSize: 9, background: 'var(--soft-cloud)', color: 'var(--muted-rose)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  Recommended Focus
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                {rec.recommended_action}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
