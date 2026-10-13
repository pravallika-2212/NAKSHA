import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Clock, AlertTriangle, ShieldAlert,
  ChevronLeft, ChevronRight, Flag, Send, RotateCcw
} from 'lucide-react'
import {
  saveAssessmentAnswer,
  logIntegrityEvent,
  submitAssessmentAttempt,
  type AssessmentAttempt,
  type AssessmentQuestion
} from '../../../lib/assessmentClient'

interface ActiveAssessmentRoomProps {
  initialAttempt: AssessmentAttempt
  initialQuestions: AssessmentQuestion[]
  studentId: string
  onComplete: (finalizedAttempt: AssessmentAttempt, fullQuestions: AssessmentQuestion[]) => void
  onExit: () => void
}

export function ActiveAssessmentRoom({
  initialAttempt,
  initialQuestions,
  studentId,
  onComplete,
  onExit
}: ActiveAssessmentRoomProps) {
  const [attempt] = useState<AssessmentAttempt>(initialAttempt)
  const [questions] = useState<AssessmentQuestion[]>(initialQuestions)
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  // Answers State: question_id -> { selected_option, marked_for_review }
  const [answers, setAnswers] = useState<Record<string, { selected_option: string | null; marked_for_review: boolean }>>(
    initialAttempt.answers || {}
  )

  // Timer state (seconds remaining)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const expiresAt = new Date(initialAttempt.expires_at).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((expiresAt - now) / 1000))
  })

  // Warning & Dialog States
  const [activeWarning, setActiveWarning] = useState<{ level: number; message: string } | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const lastEventTimeRef = useRef<number>(0)
  const isTerminatedRef = useRef<boolean>(false)

  const currentQuestion = questions[currentIndex] || questions[0]
  const currentAnswer = answers[currentQuestion?.id] || { selected_option: null, marked_for_review: false }

  // Finalize Submission Handler
  const handleFinalSubmit = useCallback(async (reason: string = 'manual_submission') => {
    if (isTerminatedRef.current) return
    isTerminatedRef.current = true
    setIsSubmitting(true)

    try {
      const result = await submitAssessmentAttempt(attempt.id, studentId, reason)
      onComplete(result.attempt, result.questions)
    } catch (err: any) {
      console.warn('Submission error:', err)
      // Retry once with timeout reason
      try {
        const result = await submitAssessmentAttempt(attempt.id, studentId, 'fallback_submission')
        onComplete(result.attempt, result.questions)
      } catch {
        onExit()
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [attempt.id, studentId, onComplete, onExit])

  // Authoritative countdown timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleFinalSubmit('auto_submitted_timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [handleFinalSubmit])

  // Integrity Event Listener (visibilitychange & window blur)
  useEffect(() => {
    async function handleVisibilityChange() {
      if (document.hidden && !isTerminatedRef.current) {
        const now = Date.now()
        // Throttle rapid repeated triggers
        if (now - lastEventTimeRef.current < 2000) return
        lastEventTimeRef.current = now

        try {
          const res = await logIntegrityEvent(attempt.id, studentId, 'tab_hidden', 'Assessment tab lost focus/hidden')
          if (res.auto_submitted) {
            setActiveWarning({
              level: 4,
              message: '4th Integrity Violation Detected: Test automatically terminated. 5-percentage-point deduction applied.'
            })
            setTimeout(() => {
              handleFinalSubmit('terminated_by_integrity')
            }, 3000)
          } else if (res.warning_level > 0) {
            setActiveWarning({
              level: res.warning_level,
              message: res.warning_message
            })
          }
        } catch {
          // ignore network glitch
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [attempt.id, studentId, handleFinalSubmit])

  // Save selected option
  async function handleSelectOption(optionId: string) {
    const updated = {
      ...currentAnswer,
      selected_option: optionId
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: updated
    }))

    try {
      await saveAssessmentAnswer(attempt.id, studentId, currentQuestion.id, optionId, updated.marked_for_review)
    } catch {
      // offline/retry
    }
  }

  // Toggle Mark for Review
  async function handleToggleReview() {
    const newMarked = !currentAnswer.marked_for_review
    const updated = {
      ...currentAnswer,
      marked_for_review: newMarked
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: updated
    }))

    try {
      await saveAssessmentAnswer(attempt.id, studentId, currentQuestion.id, currentAnswer.selected_option, newMarked)
    } catch {
      // ignore
    }
  }

  // Clear current response
  async function handleClearResponse() {
    const updated = {
      ...currentAnswer,
      selected_option: null
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: updated
    }))

    try {
      await saveAssessmentAnswer(attempt.id, studentId, currentQuestion.id, null, updated.marked_for_review)
    } catch {
      // ignore
    }
  }

  // Navigation: Next & Previous
  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Palette counts
  const summaryCounts = useMemo(() => {
    let answered = 0
    let marked = 0
    let unanswered = 0

    questions.forEach(q => {
      const a = answers[q.id]
      if (a?.marked_for_review) {
        marked++
      } else if (a?.selected_option) {
        answered++
      } else {
        unanswered++
      }
    })

    return { answered, marked, unanswered, total: questions.length }
  }, [questions, answers])

  // Format Time Remaining
  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsRemaining / 60)
    const s = secondsRemaining % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [secondsRemaining])

  const isLowTime = secondsRemaining <= 120 // < 2 minutes

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        background: '#FAF6F5',
        overflow: 'hidden'
      }}
    >
      {/* Top Test Control Bar */}
      <header
        style={{
          background: 'var(--sq-maroon-dark)',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
        }}
      >
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700 }}>
            {attempt.sub_category} · {(attempt as any).difficulty || 'Standard'}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
            {attempt.test_title}
          </h3>
        </div>

        {/* Countdown Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              background: isLowTime ? '#D32F2F' : 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}
          >
            <Clock size={16} />
            <span>{formattedTime}</span>
          </div>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            style={{
              background: 'var(--sq-pink-soft)',
              color: 'var(--sq-maroon-dark)',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Send size={13} />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Assessment Body: Left Question Workspace + Right Palette */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Active Question Card & Options */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {/* Question Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid var(--sq-border-light)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    background: 'var(--sq-maroon)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800
                  }}
                >
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="sq-tag" style={{ background: 'var(--sq-bg-base)', color: 'var(--sq-maroon)' }}>
                  {currentQuestion.topic}
                </span>
              </div>

              <div style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
                Marks: <b style={{ color: 'var(--sq-success)' }}>+{attempt.marks_per_question}</b>
                {attempt.negative_marks > 0 && (
                  <span style={{ color: 'var(--sq-danger)', marginLeft: 6 }}>
                    / -{attempt.negative_marks}
                  </span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--sq-maroon-dark)',
                lineHeight: 1.6,
                marginBottom: 24
              }}
            >
              {currentQuestion.question_text}
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentQuestion.options.map(opt => {
                const isSelected = currentAnswer.selected_option === opt.id

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid var(--sq-maroon)' : '1px solid var(--sq-border-medium)',
                      background: isSelected ? '#FFF8F7' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--sq-maroon)' : '1.5px solid var(--sq-border-medium)',
                        background: isSelected ? 'var(--sq-maroon)' : '#fff',
                        color: isSelected ? '#fff' : 'var(--sq-text-muted)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 12,
                        fontWeight: 800
                      }}
                    >
                      {opt.id}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--sq-text-main)', fontWeight: isSelected ? 600 : 400 }}>
                      {opt.text}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Question Action Bar */}
          <div
            style={{
              paddingTop: 20,
              marginTop: 24,
              borderTop: '1px solid var(--sq-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={handleToggleReview}
                style={{
                  background: currentAnswer.marked_for_review ? '#FFF3E0' : '#fff',
                  color: currentAnswer.marked_for_review ? '#E65100' : 'var(--sq-text-muted)',
                  border: `1px solid ${currentAnswer.marked_for_review ? '#FFB74D' : 'var(--sq-border-medium)'}`,
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Flag size={13} />
                <span>{currentAnswer.marked_for_review ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              {currentAnswer.selected_option && (
                <button
                  type="button"
                  onClick={handleClearResponse}
                  style={{
                    background: '#fff',
                    color: 'var(--sq-text-light)',
                    border: '1px solid var(--sq-border-light)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Clear Response</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  background: '#fff',
                  color: currentIndex === 0 ? 'var(--sq-border-medium)' : 'var(--sq-text-main)',
                  border: '1px solid var(--sq-border-medium)',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                style={{
                  background: 'var(--sq-maroon)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: currentIndex === questions.length - 1 ? 0.5 : 1
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </main>

        {/* Right: Question Navigation Palette */}
        <aside
          style={{
            width: 280,
            background: '#fff',
            borderLeft: '1px solid var(--sq-border-light)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              Question Palette
            </h4>

            {/* Status Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E7D32' }} />
                <span>Answered ({summaryCounts.answered})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E65100' }} />
                <span>Review ({summaryCounts.marked})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#BDBDBD' }} />
                <span>Unvisited ({summaryCounts.unanswered})</span>
              </div>
            </div>

            {/* Grid of Question Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {questions.map((q, idx) => {
                const a = answers[q.id]
                const isCur = idx === currentIndex
                const isAns = Boolean(a?.selected_option)
                const isRev = Boolean(a?.marked_for_review)

                let bg = '#EEEEEE'
                let color = '#555'

                if (isRev) {
                  bg = '#FFF3E0'
                  color = '#E65100'
                } else if (isAns) {
                  bg = '#E8F5E9'
                  color = '#2E7D32'
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      height: 38,
                      borderRadius: 8,
                      border: isCur ? '2px solid var(--sq-maroon)' : '1px solid transparent',
                      background: bg,
                      color: color,
                      fontSize: 12,
                      fontWeight: isCur ? 800 : 600,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Integrity Monitoring Status Badge */}
          <div
            style={{
              marginTop: 'auto',
              padding: '12px',
              borderRadius: 8,
              background: 'var(--sq-bg-base)',
              border: '1px solid var(--sq-border-light)',
              fontSize: 11,
              lineHeight: 1.4,
              color: 'var(--sq-text-muted)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sq-maroon)', fontWeight: 700, marginBottom: 4 }}>
              <ShieldAlert size={14} /> Integrity Audit Active
            </div>
            Tab visibility and window focus are actively recorded. 4th violation applies a 5% deduction penalty.
          </div>
        </aside>
      </div>

      {/* Warning Dialog for Integrity Violations */}
      {activeWarning && (
        <div
          className="sq-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              padding: '24px',
              border: '2px solid #D32F2F',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
          >
            <AlertTriangle size={36} style={{ color: '#D32F2F', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#B71C1C' }}>
              {activeWarning.level >= 4 ? 'Assessment Terminated' : `Test Integrity Warning (${activeWarning.level} of 3)`}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#444', lineHeight: 1.5 }}>
              {activeWarning.message}
            </p>

            {activeWarning.level < 4 && (
              <button
                type="button"
                onClick={() => setActiveWarning(null)}
                style={{
                  background: 'var(--sq-maroon)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                I Understand & Return to Test
              </button>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div
          className="sq-modal-overlay"
          onClick={() => setShowSubmitConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(48, 8, 23, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 460,
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(75, 16, 40, 0.25)'
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              Submit Assessment?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--sq-text-muted)' }}>
              Are you sure you want to finalize your attempt? Answers will be scored and detailed explanations will be provided.
            </p>

            {/* Summary statistics */}
            <div
              style={{
                background: 'var(--sq-bg-base)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                textAlign: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)' }}>Answered</span>
                <b style={{ display: 'block', color: 'var(--sq-success)', fontSize: 15 }}>{summaryCounts.answered}</b>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)' }}>Marked</span>
                <b style={{ display: 'block', color: 'var(--sq-warning)', fontSize: 15 }}>{summaryCounts.marked}</b>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)' }}>Unanswered</span>
                <b style={{ display: 'block', color: 'var(--sq-danger)', fontSize: 15 }}>{summaryCounts.unanswered}</b>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
                style={{
                  background: '#fff',
                  border: '1px solid var(--sq-border-medium)',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: 'var(--sq-text-muted)'
                }}
              >
                Back to Test
              </button>
              <button
                type="button"
                onClick={() => handleFinalSubmit('manual_submission')}
                disabled={isSubmitting}
                style={{
                  background: 'var(--sq-maroon)',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Finalizing...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
