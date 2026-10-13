import { ShieldAlert, ArrowLeft, RotateCcw } from 'lucide-react'
import type { AssessmentAttempt, AssessmentQuestion } from '../../../lib/assessmentClient'

interface AssessmentResultViewProps {
  attempt: AssessmentAttempt
  questions: AssessmentQuestion[]
  onReturn: () => void
  onRetake?: () => void
}

export function AssessmentResultView({
  attempt,
  questions,
  onReturn,
  onRetake
}: AssessmentResultViewProps) {
  const isTerminated = attempt.status === 'terminated_by_integrity'
  const isTimeout = attempt.status === 'auto_submitted_timeout'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onReturn}
          className="button button-secondary"
          style={{ fontSize: 12, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Back to Placement Preparation Center
        </button>
        {onRetake && (
          <button
            onClick={onRetake}
            className="button"
            style={{ fontSize: 12, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <RotateCcw size={14} /> Retake Test
          </button>
        )}
      </div>

      {/* Main Score Overview Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--sq-maroon-dark) 0%, var(--sq-maroon) 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#fff',
          boxShadow: 'var(--sq-shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700, letterSpacing: '0.06em' }}>
              Official Assessment Results
            </div>
            <h2 style={{ margin: '4px 0 6px', fontSize: 24, fontWeight: 800 }}>
              {attempt.test_title}
            </h2>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
              Submitted: {new Date(attempt.submitted_at || attempt.started_at).toLocaleString()} · Category: {attempt.sub_category}
            </div>
          </div>

          {/* Big Score Dial */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 14,
              padding: '16px 24px',
              textAlign: 'center',
              minWidth: 140
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--sq-pink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>
              Final Adjusted Score
            </span>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '2px 0' }}>
              {attempt.adjusted_score ?? attempt.percentage_score ?? 0}%
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)' }}>
              Raw: {attempt.raw_score} / {attempt.total_marks} marks
            </span>
          </div>
        </div>

        {/* Penalty Notification if applied */}
        {attempt.penalty_applied && (
          <div
            style={{
              background: '#FFEBEE',
              color: '#C62828',
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ShieldAlert size={16} />
            <span>
              Integrity Policy Enforcement: 4th violation reached during test. A 5-percentage-point deduction was applied (Raw: {attempt.percentage_score}% &rarr; Adjusted: {attempt.adjusted_score}%).
            </span>
          </div>
        )}

        {isTerminated && !attempt.penalty_applied && (
          <div style={{ background: '#FFF3E0', color: '#E65100', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
            Assessment terminated due to integrity event logs.
          </div>
        )}

        {isTimeout && (
          <div style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 11 }}>
            Note: Authoritative test duration expired; attempt was automatically finalized by backend.
          </div>
        )}

        {/* 4 Performance Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>Correct</span>
            <b style={{ display: 'block', fontSize: 18, color: '#A5D6A7' }}>{attempt.correct_count}</b>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>Incorrect</span>
            <b style={{ display: 'block', fontSize: 18, color: '#EF9A9A' }}>{attempt.incorrect_count}</b>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>Unanswered</span>
            <b style={{ display: 'block', fontSize: 18, color: '#E0E0E0' }}>{attempt.unanswered_count}</b>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>Time Spent</span>
            <b style={{ display: 'block', fontSize: 18, color: '#fff' }}>
              {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
            </b>
          </div>
        </div>
      </div>

      {/* Detailed Question Review & Solutions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
            Detailed Solutions & Answer Explanations
          </h3>
          <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
            {questions.length} Questions Evaluated
          </span>
        </div>

        {questions.map((q, idx) => {
          const studentAns = attempt.answers?.[q.id]?.selected_option
          const isCorrect = studentAns === q.correct_option
          const isUnanswered = !studentAns

          return (
            <div
              key={q.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '20px 24px',
                border: `1.5px solid ${isCorrect ? '#C8E6C9' : isUnanswered ? 'var(--sq-border-light)' : '#FFCDD2'}`,
                boxShadow: '0 1px 4px rgba(75, 16, 40, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sq-maroon)' }}>
                    Question {idx + 1}
                  </span>
                  <span className="sq-tag" style={{ background: 'var(--sq-bg-base)', color: 'var(--sq-maroon)' }}>
                    {q.topic}
                  </span>
                </div>

                <div>
                  {isCorrect ? (
                    <span className="sq-tag" style={{ background: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }}>
                      ✓ Correct (+{attempt.marks_per_question})
                    </span>
                  ) : isUnanswered ? (
                    <span className="sq-tag" style={{ background: '#F5F5F5', color: '#757575' }}>
                      ○ Unanswered (0)
                    </span>
                  ) : (
                    <span className="sq-tag" style={{ background: '#FFEBEE', color: '#C62828', fontWeight: 700 }}>
                      ✗ Incorrect (-{attempt.negative_marks})
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sq-maroon-dark)', lineHeight: 1.5 }}>
                {q.question_text}
              </div>

              {/* Options Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                {q.options.map(opt => {
                  const isUserPick = studentAns === opt.id
                  const isKey = q.correct_option === opt.id

                  let optBorder = '1px solid var(--sq-border-light)'
                  let optBg = '#FAF6F5'
                  let badge = null

                  if (isKey) {
                    optBorder = '2px solid #2E7D32'
                    optBg = '#E8F5E9'
                    badge = <span style={{ fontSize: 10, color: '#2E7D32', fontWeight: 700 }}>[Correct Answer]</span>
                  } else if (isUserPick) {
                    optBorder = '2px solid #C62828'
                    optBg = '#FFEBEE'
                    badge = <span style={{ fontSize: 10, color: '#C62828', fontWeight: 700 }}>[Your Selection]</span>
                  }

                  return (
                    <div
                      key={opt.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: optBorder,
                        background: optBg,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <div>
                        <b>{opt.id}.</b> {opt.text}
                      </div>
                      {badge}
                    </div>
                  )
                })}
              </div>

              {/* Verified Explanation */}
              {q.explanation && (
                <div
                  style={{
                    background: '#F9FBE7',
                    border: '1px solid #E6EE9C',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 11,
                    color: '#33691E',
                    lineHeight: 1.5
                  }}
                >
                  <b>Explanation:</b> {q.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
