import { useState } from 'react'
import { ShieldAlert, X, Play } from 'lucide-react'
import type { AssessmentTestDef } from '../../../lib/assessmentClient'

interface PreTestAcknowledgmentModalProps {
  test: AssessmentTestDef
  onConfirm: () => void
  onCancel: () => void
}

export function PreTestAcknowledgmentModal({
  test,
  onConfirm,
  onCancel
}: PreTestAcknowledgmentModalProps) {
  const [agreed, setAgreed] = useState<boolean>(false)

  return (
    <div
      className="sq-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(48, 8, 23, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16
      }}
    >
      <div
        className="sq-modal-panel"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 620,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(75, 16, 40, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--sq-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FFF8F7 0%, #FFF 100%)'
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', textTransform: 'uppercase' }}>
              Official Assessment Protocol
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              {test.title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sq-text-muted)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Key Parameters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              background: 'var(--sq-bg-base)',
              padding: 14,
              borderRadius: 10
            }}
          >
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', textTransform: 'uppercase' }}>Duration</span>
              <b style={{ display: 'block', fontSize: 14, color: 'var(--sq-maroon)' }}>{test.duration_minutes} Minutes</b>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', textTransform: 'uppercase' }}>Total Questions</span>
              <b style={{ display: 'block', fontSize: 14, color: 'var(--sq-maroon)' }}>{test.question_count} Questions</b>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', textTransform: 'uppercase' }}>Scoring Rule</span>
              <b style={{ display: 'block', fontSize: 13, color: test.negative_marks > 0 ? 'var(--sq-danger)' : 'var(--sq-success)' }}>
                {test.negative_marks > 0 ? `+${test.marks_per_question} / -${test.negative_marks}` : `+${test.marks_per_question} (No Negative)`}
              </b>
            </div>
          </div>

          {/* Test Instructions */}
          <div style={{ fontSize: 12, color: 'var(--sq-text-main)', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 8px' }}>
              <b>Scoring Formula:</b> Raw Score = (Correct Answers × {test.marks_per_question}) - (Incorrect Answers × {test.negative_marks}).
            </p>
            {test.instructions && <p style={{ margin: '0 0 8px', color: 'var(--sq-text-muted)' }}>{test.instructions}</p>}
          </div>

          {/* Test-Taking Integrity Policy Box */}
          <div
            style={{
              border: '1.5px solid #FFCDD2',
              background: '#FFEBEE',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C62828', fontWeight: 800, fontSize: 13 }}>
              <ShieldAlert size={16} /> Automated Test-Taking Integrity Policy
            </div>

            <p style={{ margin: 0, fontSize: 11, color: '#B71C1C', lineHeight: 1.5 }}>
              To ensure placement preparation integrity, browser events such as <b>tab switching</b>, <b>minimizing window</b>, or <b>exiting full-screen mode</b> are continuously audited.
            </p>

            <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#333', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#C62828' }}>Violation Escalation Sequence:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><b>Violation 1:</b> System Warning 1 of 3 displayed.</li>
                <li><b>Violation 2:</b> System Warning 2 of 3 displayed with audit timestamp.</li>
                <li><b>Violation 3:</b> Final Warning 3 of 3 displayed.</li>
                <li>
                  <b>Violation 4:</b> Immediate automatic submission of test attempt with an irreversible{' '}
                  <b style={{ color: '#C62828' }}>5-percentage-point deduction penalty</b> applied to your final score.
                </li>
              </ul>
            </div>

            <small style={{ fontSize: 10, color: '#888', lineHeight: 1.4, display: 'block' }}>
              * Browser monitoring cannot reliably observe external operating system applications or mobile devices. Interrupted connections can be resumed by refreshing the page within your authoritative countdown window.
            </small>
          </div>

          {/* Agreement Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--sq-text-main)',
              lineHeight: 1.4,
              padding: '8px 4px'
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: 'var(--sq-maroon)' }}
            />
            <span>
              I understand the assessment rules, scoring formula, and the 4-violation integrity policy including the 5% penalty. I agree to complete this assessment independently.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--sq-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid var(--sq-border-medium)',
              background: '#fff',
              color: 'var(--sq-text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!agreed}
            onClick={onConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: agreed ? 'var(--sq-maroon)' : 'var(--sq-border-medium)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: agreed ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Play size={14} /> Begin Timed Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
