import { useState, useEffect } from 'react'
import {
  Award, AlertTriangle, CheckCircle2, Users
} from 'lucide-react'
import { api, type StudentProfile } from '../lib/api'

export function TpoPlacementDashboard() {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStudents().then(res => {
      setStudents(res.students)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const placementEligible = students.filter(s => s.placement && s.placement.coding_percentage >= 65)
  const codingGapStudents = students.filter(s => s.placement && s.placement.coding_percentage < 50)
  const aptitudeGapStudents = students.filter(s => s.placement && s.placement.aptitude_percentage < 50)

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 48, textAlign: 'center', color: 'var(--muted-light)' }}>
        Loading Placement Readiness Analytics...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span /> CAREER SERVICES & TPO DECISION INTELLIGENCE
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
            Placement Readiness & Skill Gap Analytics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Benchmark candidate qualification, identify coding bottlenecks, and plan targeted company preparation.
          </p>
        </div>
        <span style={{ fontSize: 10, background: 'var(--soft-cloud)', color: 'var(--deep-maroon)', padding: '6px 12px', borderRadius: 20, fontWeight: 700, border: '1px solid var(--baby-pink)' }}>
          Campus Hiring Season 2026
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="portal-metric" style={{ background: '#fff' }}>
          <span className="portal-metric-icon"><Users size={18} /></span>
          <span className="portal-metric-label">REGISTERED CANDIDATES</span>
          <b>{students.length}</b>
          <small>Across CSE, AI, DS & ECE</small>
        </div>

        <div className="portal-metric" style={{ background: '#E8F5E9' }}>
          <span className="portal-metric-icon" style={{ background: '#C8E6C9', color: '#1B5E20' }}><CheckCircle2 size={18} /></span>
          <span className="portal-metric-label" style={{ color: '#1B5E20' }}>PLACEMENT READY</span>
          <b style={{ color: '#1B5E20' }}>{placementEligible.length}</b>
          <small style={{ color: '#2E7D32' }}>Coding ≥ 65% benchmark</small>
        </div>

        <div className="portal-metric" style={{ background: '#FFF5F6' }}>
          <span className="portal-metric-icon" style={{ background: '#FFCDD2', color: 'var(--status-critical)' }}><AlertTriangle size={18} /></span>
          <span className="portal-metric-label" style={{ color: 'var(--status-critical)' }}>CODING GAP</span>
          <b style={{ color: 'var(--status-critical)' }}>{codingGapStudents.length}</b>
          <small style={{ color: '#900' }}>Scores &lt; 50% in algorithms</small>
        </div>

        <div className="portal-metric" style={{ background: '#fff' }}>
          <span className="portal-metric-icon" style={{ background: 'var(--soft-cloud)', color: 'var(--deep-maroon)' }}><Award size={18} /></span>
          <span className="portal-metric-label">APTITUDE SHORTAGE</span>
          <b>{aptitudeGapStudents.length}</b>
          <small>Need quantitative prep</small>
        </div>
      </div>

      {/* Visual Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Readiness Dimensions Bar Chart */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
            Average Assessment Proficiency Across Cohort
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Coding & Data Structures', value: 58.4, target: 70, color: 'var(--muted-rose)' },
              { label: 'Quantitative & Analytical Aptitude', value: 64.2, target: 70, color: 'var(--dusky-rose)' },
              { label: 'Technical Domain Core', value: 68.0, target: 70, color: 'var(--deep-maroon)' },
              { label: 'Mock Interview Performance', value: 61.5, target: 70, color: '#2E7D32' },
              { label: 'Professional Communication', value: 74.8, target: 70, color: '#3F51B5' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                  <b>{item.value}% <span style={{ color: '#888', fontWeight: 400 }}>(Goal: {item.target}%)</span></b>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: '#ECEEF3', overflow: 'hidden' }}>
                  <div style={{ width: `${item.value}%`, height: '100%', background: item.color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Readiness Segments */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEEF3', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
            Company Benchmark Tiers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 8, background: '#E8F5E9', border: '1px solid #C8E6C9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <b style={{ fontSize: 12, color: '#1B5E20' }}>Tier-1 Product & R&D Ready</b>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1B5E20' }}>{placementEligible.length} Candidates</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#2E7D32' }}>
                Coding ≥ 75%, CGPA ≥ 8.0, strong mock interview ratings. Eligible for premier recruitment drives.
              </p>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#FFF8E1', border: '1px solid #FFE082' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <b style={{ fontSize: 12, color: '#F57F17' }}>Tier-2 Technology Services Ready</b>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F57F17' }}>18 Candidates</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#795548' }}>
                Solid aptitude and foundational coding (50–65%). Recommended for standard IT and services drives.
              </p>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: 'var(--status-critical-bg)', border: '1px solid #FFCDD2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <b style={{ fontSize: 12, color: 'var(--status-critical)' }}>Intensive Coaching Required</b>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-critical)' }}>{codingGapStudents.length} Candidates</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#888' }}>
                Identified coding or aptitude gaps. Scheduled for diagnostic workshops before company registration opens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
