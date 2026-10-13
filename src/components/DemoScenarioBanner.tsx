import { Sparkles, AlertTriangle, ShieldCheck, Database } from 'lucide-react'

interface DemoScenarioBannerProps {
  onSelectStudent?: (studentId: string) => void;
  onResetCohort?: () => void;
  activeStudentId?: string;
}

export function DemoScenarioBanner({ onSelectStudent, onResetCohort, activeStudentId }: DemoScenarioBannerProps) {
  return (
    <aside className="demo-banner" role="complementary" aria-label="Demonstration mode notice">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="demo-banner-badge">SAMPLE DATA</span>
        <span style={{ color: 'var(--muted-light)', fontSize: 11 }}>
          Company Challenge Interactive Demo Mode · Synthetic Non-PII Cohort Records
        </span>
      </div>

      <div className="demo-scenarios-btns">
        <span style={{ fontSize: 10, color: 'var(--muted-light)', marginRight: 4 }}>
          Jump to scenario:
        </span>
        <button
          className="demo-scenario-btn"
          style={{
            background: activeStudentId === 'STU-CS-101' ? 'var(--baby-pink)' : undefined,
            color: activeStudentId === 'STU-CS-101' ? 'var(--dark-merlot)' : undefined
          }}
          onClick={() => onSelectStudent?.('STU-CS-101')}
          title="High Academic, Low Placement Readiness"
        >
          <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
          Scenario A: Priya (Placement Gap)
        </button>
        <button
          className="demo-scenario-btn"
          style={{
            background: activeStudentId === 'STU-CS-102' ? 'var(--baby-pink)' : undefined,
            color: activeStudentId === 'STU-CS-102' ? 'var(--dark-merlot)' : undefined
          }}
          onClick={() => onSelectStudent?.('STU-CS-102')}
          title="Declining Attendance & Academics"
        >
          <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
          Scenario B: Rohan (At-Risk)
        </button>
        <button
          className="demo-scenario-btn"
          style={{
            background: activeStudentId === 'STU-DS-103' ? 'var(--baby-pink)' : undefined,
            color: activeStudentId === 'STU-DS-103' ? 'var(--dark-merlot)' : undefined
          }}
          onClick={() => onSelectStudent?.('STU-DS-103')}
          title="Strong Engagement, Incomplete Evidence"
        >
          <ShieldCheck size={11} style={{ display: 'inline', marginRight: 4 }} />
          Scenario C: Ananya (Provisional Data)
        </button>
        <button
          className="demo-scenario-btn"
          onClick={() => onResetCohort?.()}
          title="View Full Cohort Analytics"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <Database size={11} style={{ display: 'inline', marginRight: 4 }} />
          All Cohort (40+ Students)
        </button>
      </div>
    </aside>
  )
}
