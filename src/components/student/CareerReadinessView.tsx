import { useState, useEffect } from 'react'
import { Target, Compass, CheckSquare } from 'lucide-react'
import type { StudentProfile } from '../../lib/api'
import { Year2DreamRoadmapView } from './Year2DreamRoadmapView'
import { Year3AssessmentCenter } from './assessment/Year3AssessmentCenter'
import { Year4PlacementLaunchDashboard } from './Year4PlacementLaunchDashboard'

interface CareerReadinessViewProps {
  studentData: StudentProfile
  selectedYear: number
  userId?: string
}

export function CareerReadinessView({ studentData, selectedYear, userId }: CareerReadinessViewProps) {
  // If Year 2 -> 'roadmap', Year 3 -> 'assessment', Year 4 -> 'placement'
  const [activeMode, setActiveMode] = useState<'roadmap' | 'assessment' | 'placement'>(
    selectedYear === 2 ? 'roadmap' : selectedYear === 3 ? 'assessment' : 'placement'
  )

  useEffect(() => {
    if (selectedYear === 2) {
      setActiveMode('roadmap')
    } else if (selectedYear === 3) {
      setActiveMode('assessment')
    } else if (selectedYear === 4) {
      setActiveMode('placement')
    }
  }, [selectedYear])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Career Gateway Phase Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          background: '#fff',
          padding: 6,
          borderRadius: 12,
          border: '1px solid var(--sq-border-light)',
          boxShadow: '0 1px 4px rgba(75, 16, 40, 0.03)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMode('roadmap')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: activeMode === 'roadmap' ? 'var(--sq-maroon)' : 'transparent',
            color: activeMode === 'roadmap' ? '#fff' : 'var(--sq-text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Compass size={15} />
          <span>Year 2 Dream Roadmap</span>
          <span
            className="sq-nav-badge"
            style={{
              background: activeMode === 'roadmap' ? 'rgba(255, 255, 255, 0.25)' : 'var(--sq-bg-base)',
              color: activeMode === 'roadmap' ? '#fff' : 'var(--sq-maroon)'
            }}
          >
            Year 2 Focus
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('assessment')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: activeMode === 'assessment' ? 'var(--sq-maroon)' : 'transparent',
            color: activeMode === 'assessment' ? '#fff' : 'var(--sq-text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckSquare size={15} />
          <span>Year 3 Placement Preparation</span>
          <span
            className="sq-nav-badge"
            style={{
              background: activeMode === 'assessment' ? 'rgba(255, 255, 255, 0.25)' : 'var(--sq-bg-base)',
              color: activeMode === 'assessment' ? '#fff' : 'var(--sq-maroon)'
            }}
          >
            Assessment Center
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('placement')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: activeMode === 'placement' ? 'var(--sq-maroon)' : 'transparent',
            color: activeMode === 'placement' ? '#fff' : 'var(--sq-text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Target size={15} />
          <span>Year 4 Placement & Career Launch</span>
          <span
            className="sq-nav-badge"
            style={{
              background: activeMode === 'placement' ? 'rgba(255, 255, 255, 0.25)' : 'var(--sq-bg-base)',
              color: activeMode === 'placement' ? '#fff' : 'var(--sq-maroon)'
            }}
          >
            Placement Acceleration
          </span>
        </button>
      </div>

      {activeMode === 'roadmap' ? (
        <Year2DreamRoadmapView studentData={studentData} userId={userId} />
      ) : activeMode === 'assessment' ? (
        <Year3AssessmentCenter studentData={studentData} userId={userId} />
      ) : (
        <Year4PlacementLaunchDashboard studentData={studentData} userId={userId} />
      )}
    </div>
  )
}
