import { useState, useEffect, useMemo } from 'react'
import {
  Brain, Cpu, Trophy, BarChart3, Play,
  ShieldCheck, RefreshCw
} from 'lucide-react'
import type { StudentProfile } from '../../../lib/api'
import {
  fetchAssessmentTests,
  startAssessmentAttempt,
  fetchAssessmentAttempt,
  fetchStudentProgress,
  type AssessmentTestDef,
  type AssessmentAttempt,
  type AssessmentQuestion,
  type AssessmentProgressData
} from '../../../lib/assessmentClient'
import { fetchDreamRoadmapPreferences, type DreamRoadmapPreferences } from '../../../lib/dreamRoadmap'
import { PreTestAcknowledgmentModal } from './PreTestAcknowledgmentModal'
import { ActiveAssessmentRoom } from './ActiveAssessmentRoom'
import { AssessmentResultView } from './AssessmentResultView'
import { MyProgressView } from './MyProgressView'

interface Year3AssessmentCenterProps {
  studentData: StudentProfile
  userId?: string
}

type AssessmentTab = 'aptitude' | 'technical' | 'mock' | 'progress'

export function Year3AssessmentCenter({ studentData, userId }: Year3AssessmentCenterProps) {
  const currentUserId = userId || studentData.student_id || 'STU-CS-101'

  const [activeTab, setActiveTab] = useState<AssessmentTab>('aptitude')
  const [tests, setTests] = useState<AssessmentTestDef[]>([])
  const [progressData, setProgressData] = useState<AssessmentProgressData | null>(null)
  const [dreamPrefs, setDreamPrefs] = useState<DreamRoadmapPreferences | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Active Flow States
  const [selectedTestForModal, setSelectedTestForModal] = useState<AssessmentTestDef | null>(null)
  const [activeRoomState, setActiveRoomState] = useState<{
    attempt: AssessmentAttempt
    questions: AssessmentQuestion[]
  } | null>(null)

  const [reviewResultState, setReviewResultState] = useState<{
    attempt: AssessmentAttempt
    questions: AssessmentQuestion[]
  } | null>(null)

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load test catalog, dream company context, and student progress on mount
  useEffect(() => {
    let mounted = true
    setIsLoading(true)

    Promise.all([
      fetchAssessmentTests(),
      fetchStudentProgress(currentUserId),
      fetchDreamRoadmapPreferences(currentUserId)
    ])
      .then(([allTests, prog, prefs]) => {
        if (!mounted) return
        setTests(allTests)
        setProgressData(prog)
        setDreamPrefs(prefs)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [currentUserId])

  // Filter tests by active tab category
  const currentCategoryTests = useMemo(() => {
    if (activeTab === 'progress') return []
    return tests.filter(t => t.category === activeTab)
  }, [tests, activeTab])

  // Start attempt from pre-test modal
  async function handleConfirmStartTest() {
    if (!selectedTestForModal) return
    const testToStart = selectedTestForModal
    setSelectedTestForModal(null)
    setIsLoading(true)

    try {
      const room = await startAssessmentAttempt(currentUserId, testToStart.id)
      setActiveRoomState(room)
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Could not initialize assessment attempt' })
      setTimeout(() => setStatusMessage(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle completion from room
  function handleAttemptCompleted(finalizedAttempt: AssessmentAttempt, fullQuestions: AssessmentQuestion[]) {
    setActiveRoomState(null)
    setReviewResultState({
      attempt: finalizedAttempt,
      questions: fullQuestions
    })
    // Refresh progress data in background
    fetchStudentProgress(currentUserId).then(p => setProgressData(p)).catch(() => {})
  }

  // Review an old attempt from MyProgress table
  async function handleReviewOldAttempt(attempt: AssessmentAttempt) {
    try {
      const full = await fetchAssessmentAttempt(attempt.id, currentUserId)
      setReviewResultState(full)
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Could not load historical attempt review' })
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }

  // 1. If currently inside active test taking room, render ActiveAssessmentRoom
  if (activeRoomState) {
    return (
      <ActiveAssessmentRoom
        initialAttempt={activeRoomState.attempt}
        initialQuestions={activeRoomState.questions}
        studentId={currentUserId}
        onComplete={handleAttemptCompleted}
        onExit={() => setActiveRoomState(null)}
      />
    )
  }

  // 2. If viewing a completed attempt's solutions, render AssessmentResultView
  if (reviewResultState) {
    return (
      <AssessmentResultView
        attempt={reviewResultState.attempt}
        questions={reviewResultState.questions}
        onReturn={() => setReviewResultState(null)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status feedback banner */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            background: statusMessage.type === 'error' ? '#FFEBEE' : '#E8F5E9',
            color: statusMessage.type === 'error' ? '#C62828' : '#2E7D32',
            border: `1px solid ${statusMessage.type === 'error' ? '#FFCDD2' : '#C8E6C9'}`,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Module Header Banner */}
      <div
        style={{
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
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700 }}>
            <ShieldCheck size={15} /> Year 3 Placement Preparation & Assessment Center
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Pre-Placement Diagnostic Assessment Center
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.78)', maxWidth: 640 }}>
            Timed objective assessments for Aptitude, Core Technical competencies, and Combined Mock tests with official browser integrity monitoring.
          </p>
        </div>

        {dreamPrefs && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 12,
              padding: '8px 16px',
              textAlign: 'right'
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>Target Employer Context</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
              {dreamPrefs.company_name} · {dreamPrefs.target_role}
            </div>
          </div>
        )}
      </div>

      {/* 4 Functional Section Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--sq-border-light)', paddingBottom: 4 }}>
        {[
          { id: 'aptitude', label: '1. Aptitude Tests', icon: Brain },
          { id: 'technical', label: '2. Technical Tests', icon: Cpu },
          { id: 'mock', label: '3. Mock Placement Tests', icon: Trophy },
          { id: 'progress', label: '4. My Progress', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AssessmentTab)}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: isActive ? 'var(--sq-maroon)' : 'transparent',
                color: isActive ? '#fff' : 'var(--sq-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Section Content */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--sq-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px', color: 'var(--sq-maroon)' }} />
          <div>Loading assessment catalog…</div>
        </div>
      ) : activeTab === 'progress' ? (
        progressData ? (
          <MyProgressView
            progressData={progressData}
            onReviewAttempt={handleReviewOldAttempt}
            onStartTest={(testId) => {
              const t = tests.find(x => x.id === testId)
              if (t) setSelectedTestForModal(t)
            }}
          />
        ) : (
          <div style={{ padding: 30, textAlign: 'center' }}>No progress data available.</div>
        )
      ) : (
        /* Test Catalog Grid for Aptitude, Technical, and Mock tabs */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
              Showing {currentCategoryTests.length} verified assessments in{' '}
              <b style={{ color: 'var(--sq-maroon)' }}>{activeTab.toUpperCase()}</b>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {currentCategoryTests.map(test => (
              <div
                key={test.id}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '20px 24px',
                  border: '1px solid var(--sq-border-light)',
                  boxShadow: '0 2px 8px rgba(75, 16, 40, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="sq-tag" style={{ background: 'var(--sq-bg-base)', color: 'var(--sq-maroon)' }}>
                      {test.sub_category}
                    </span>
                    <span
                      className="sq-tag"
                      style={{
                        background: test.difficulty === 'Hard' ? '#FFEBEE' : test.difficulty === 'Medium' ? '#FFF3E0' : '#E8F5E9',
                        color: test.difficulty === 'Hard' ? '#C62828' : test.difficulty === 'Medium' ? '#E65100' : '#2E7D32',
                        fontWeight: 700
                      }}
                    >
                      {test.difficulty}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
                    {test.title}
                  </h4>

                  <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--sq-text-muted)', lineHeight: 1.5 }}>
                    {test.description}
                  </p>

                  {/* Attributes breakdown */}
                  <div
                    style={{
                      background: 'var(--sq-bg-base)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                      fontSize: 11
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--sq-text-light)', display: 'block', fontSize: 10 }}>Time Limit</span>
                      <b>{test.duration_minutes} Mins</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--sq-text-light)', display: 'block', fontSize: 10 }}>Questions</span>
                      <b>{test.question_count} MCQs</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--sq-text-light)', display: 'block', fontSize: 10 }}>Negative Marks</span>
                      <b style={{ color: test.negative_marks > 0 ? 'var(--sq-danger)' : 'var(--sq-success)' }}>
                        {test.negative_marks > 0 ? `-${test.negative_marks}` : 'None'}
                      </b>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--sq-border-light)', paddingTop: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--sq-text-light)' }}>
                    Authoritative Proctored Test
                  </span>

                  <button
                    onClick={() => setSelectedTestForModal(test)}
                    className="button"
                    style={{ fontSize: 12, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Play size={13} /> Start Assessment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Test Acknowledgment Modal */}
      {selectedTestForModal && (
        <PreTestAcknowledgmentModal
          test={selectedTestForModal}
          onConfirm={handleConfirmStartTest}
          onCancel={() => setSelectedTestForModal(null)}
        />
      )}
    </div>
  )
}
