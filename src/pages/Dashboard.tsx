import { useState } from 'react'
import {
  Users, GraduationCap, Briefcase, Database, ShieldCheck
} from 'lucide-react'
import { DemoScenarioBanner } from '../components/DemoScenarioBanner'
import { FacultyDecisionDashboard } from '../components/FacultyDecisionDashboard'
import { StudentSuccessDashboard } from '../components/StudentSuccessDashboard'
import { DataIntegrationStudio } from '../components/DataIntegrationStudio'
import { TpoPlacementDashboard } from '../components/TpoPlacementDashboard'
import { TrustedReviewerPortal } from '../components/TrustedReviewerPortal'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'faculty' | 'student' | 'tpo' | 'integration' | 'reviewer'>('faculty')
  const [activeScenarioStudentId, setActiveScenarioStudentId] = useState<string>('')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Interactive Demonstration Banner */}
      <DemoScenarioBanner
        activeStudentId={activeScenarioStudentId}
        onSelectStudent={(sid) => {
          setActiveScenarioStudentId(sid)
          setActiveTab('faculty')
        }}
        onResetCohort={() => {
          setActiveScenarioStudentId('')
          setActiveTab('faculty')
        }}
      />

      {/* Top Application Header */}
      <header className="header is-scrolled" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255, 248, 247, 0.96)', borderBottom: '1px solid var(--border-card)' }}>
        <div className="header-inner" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" className="brand" aria-label="Ascendiq Home">
              <img src="/assets/ascendiq-logo.jpeg" alt="Ascendiq" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <span>ascendiq<small>SMART CAMPUS ANALYTICS</small></span>
            </a>
          </div>

          {/* Role Navigation Switcher */}
          <nav style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'faculty', label: 'Faculty Decision Dashboard', icon: Users },
              { id: 'student', label: 'Student Progress', icon: GraduationCap },
              { id: 'tpo', label: 'TPO Placement Analytics', icon: Briefcase },
              { id: 'integration', label: 'Data Integration Studio', icon: Database },
              { id: 'reviewer', label: 'Trusted Reviewer Queue', icon: ShieldCheck },
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'var(--deep-maroon)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              )
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
              Exit to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 16px' }}>
        {activeTab === 'faculty' && (
          <FacultyDecisionDashboard
            initialStudentId={activeScenarioStudentId}
            onSelectStudentId={setActiveScenarioStudentId}
          />
        )}

        {activeTab === 'student' && (
          <StudentSuccessDashboard initialStudentId={activeScenarioStudentId || 'STU-CS-101'} />
        )}

        {activeTab === 'tpo' && (
          <TpoPlacementDashboard />
        )}

        {activeTab === 'integration' && (
          <DataIntegrationStudio />
        )}

        {activeTab === 'reviewer' && (
          <TrustedReviewerPortal />
        )}
      </main>

      {/* Bottom Footer */}
      <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', background: '#fff', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>ASCENDIQ · Student Success Intelligence Platform · Explainable Decision Support</span>
        <span style={{ fontSize: 10 }}>Human-in-the-Loop Interventions · Privacy & Fairness Preserved</span>
      </footer>
    </div>
  )
}
