import {
  Trophy, TrendingUp, Clock, Play, Award, FileText, ChevronRight
} from 'lucide-react'
import type { AssessmentProgressData, AssessmentAttempt } from '../../../lib/assessmentClient'

interface MyProgressViewProps {
  progressData: AssessmentProgressData
  onReviewAttempt: (attempt: AssessmentAttempt) => void
  onStartTest: (testId: string) => void
}

export function MyProgressView({
  progressData,
  onReviewAttempt,
  onStartTest
}: MyProgressViewProps) {
  const hasAttempts = progressData.tests_completed > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Key Summary Performance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Tests Completed</span>
            <span className="sq-card-icon"><Trophy size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: 'var(--sq-maroon)' }}>
            {progressData.tests_completed}
          </div>
          <small style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
            Total Attempted: {progressData.total_questions_attempted} questions
          </small>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Latest Test Score</span>
            <span className="sq-card-icon"><TrendingUp size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: progressData.latest_score !== null ? 'var(--sq-maroon-dark)' : 'var(--sq-text-light)' }}>
            {progressData.latest_score !== null ? `${progressData.latest_score}%` : '—'}
          </div>
          <small style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
            Highest: {progressData.highest_score !== null ? `${progressData.highest_score}%` : '—'}
          </small>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Average Performance</span>
            <span className="sq-card-icon"><Award size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: progressData.average_score !== null && progressData.average_score >= 70 ? 'var(--sq-success)' : 'var(--sq-warning)' }}>
            {progressData.average_score !== null ? `${progressData.average_score}%` : '—'}
          </div>
          <small style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
            Overall Accuracy: {progressData.accuracy_percentage !== null ? `${progressData.accuracy_percentage}%` : '—'}
          </small>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Preparation Time</span>
            <span className="sq-card-icon"><Clock size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: 'var(--sq-maroon)' }}>
            {progressData.total_time_spent_minutes}m
          </div>
          <small style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
            Active timed assessments logged
          </small>
        </div>
      </div>

      {/* Recommended Next Practice Activity Banner */}
      {progressData.recommended_next_test && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF8F7 0%, #FFF 100%)',
            border: '1.5px solid var(--sq-border-light)',
            borderRadius: 14,
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-maroon)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
              Recommended Next Practice Activity
            </span>
            <h4 style={{ margin: '2px 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              {progressData.recommended_next_test.title}
            </h4>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--sq-text-muted)' }}>
              {progressData.recommended_next_test.description}
            </p>
          </div>

          <button
            onClick={() => onStartTest(progressData.recommended_next_test!.id)}
            className="button"
            style={{ fontSize: 12, padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <Play size={14} /> Start Recommended Test
          </button>
        </div>
      )}

      {/* Topic Strengths & Weaknesses Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Strengths */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--sq-success)' }}>
              ✓ Topic Strengths (≥75% Accuracy)
            </h4>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progressData.topic_strengths.length > 0 ? (
              progressData.topic_strengths.map(s => (
                <div key={s.topic} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{s.topic}</span>
                  <span style={{ color: 'var(--sq-success)', fontWeight: 700 }}>{s.accuracy}% ({s.attempted} questions)</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 12, color: 'var(--sq-text-light)' }}>
                {hasAttempts ? 'Complete more diverse tests to establish strong mastery topics.' : 'No tests taken yet.'}
              </span>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--sq-danger)' }}>
              ! Improvement Areas (≤50% Accuracy)
            </h4>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progressData.topic_weaknesses.length > 0 ? (
              progressData.topic_weaknesses.map(w => (
                <div key={w.topic} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{w.topic}</span>
                  <span style={{ color: 'var(--sq-danger)', fontWeight: 700 }}>{w.accuracy}% ({w.attempted} questions)</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 12, color: 'var(--sq-text-light)' }}>
                {hasAttempts ? 'Great work! No topics currently below 50% accuracy threshold.' : 'No tests taken yet.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score Trend Chart (SVG line) */}
      {progressData.score_trend.length > 0 && (
        <div className="sq-panel">
          <div className="sq-panel-header">
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              Score Trend Across Assessment Attempts
            </h4>
            <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
              {progressData.score_trend.length} Recorded Attempts
            </span>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ height: 160, width: '100%', position: 'relative' }}>
              <svg viewBox="0 0 500 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Horizontal reference grid lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#eee" strokeDasharray="3 3" />
                <text x="502" y="24" fontSize="9" fill="#999">100%</text>

                <line x1="0" y1="60" x2="500" y2="60" stroke="#eee" strokeDasharray="3 3" />
                <text x="502" y="64" fontSize="9" fill="#999">70%</text>

                <line x1="0" y1="100" x2="500" y2="100" stroke="#eee" strokeDasharray="3 3" />
                <text x="502" y="104" fontSize="9" fill="#999">40%</text>

                {/* Plot line */}
                {(() => {
                  const pts = progressData.score_trend
                  if (pts.length === 1) {
                    const y = 140 - (pts[0].percentage / 100) * 120 - 10
                    return <circle cx="250" cy={y} r="5" fill="var(--sq-maroon)" />
                  }

                  const coords = pts.map((pt, i) => {
                    const x = (i / (pts.length - 1)) * 480 + 10
                    const y = 140 - (pt.percentage / 100) * 120 - 10
                    return `${x},${y}`
                  })

                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke="var(--sq-maroon)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={coords.join(' ')}
                      />
                      {pts.map((pt, i) => {
                        const x = (i / (pts.length - 1)) * 480 + 10
                        const y = 140 - (pt.percentage / 100) * 120 - 10
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="4" fill="#fff" stroke="var(--sq-maroon)" strokeWidth="2.5" />
                            <text x={x} y={y - 8} fontSize="9" fontWeight="700" textAnchor="middle" fill="var(--sq-maroon)">
                              {pt.percentage}%
                            </text>
                          </g>
                        )
                      })}
                    </>
                  )
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Previous Test Attempts Table */}
      <div className="sq-panel">
        <div className="sq-panel-header">
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
            Assessment Attempt History
          </h4>
          <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
            Stored in official audit ledger
          </span>
        </div>

        {hasAttempts ? (
          <div className="sq-table-wrap">
            <table className="sq-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Assessment Title</th>
                  <th>Category</th>
                  <th>Raw Score</th>
                  <th>Penalty</th>
                  <th>Final Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {progressData.attempt_history.map(att => (
                  <tr key={att.id}>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
                        {new Date(att.submitted_at || att.started_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <b>{att.test_title}</b>
                    </td>
                    <td>
                      <span className="sq-tag" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                        {att.category}
                      </span>
                    </td>
                    <td>
                      {att.raw_score} / {att.total_marks}
                    </td>
                    <td>
                      {att.penalty_applied ? (
                        <span style={{ color: 'var(--sq-danger)', fontWeight: 700, fontSize: 11 }}>-5.0%</span>
                      ) : (
                        <span style={{ color: 'var(--sq-text-light)', fontSize: 11 }}>None</span>
                      )}
                    </td>
                    <td>
                      <b style={{ color: 'var(--sq-maroon)' }}>
                        {att.adjusted_score ?? att.percentage_score}%
                      </b>
                    </td>
                    <td>
                      <span
                        className="sq-tag"
                        style={{
                          fontSize: 10,
                          background: att.status === 'completed' ? '#E8F5E9' : '#FFEBEE',
                          color: att.status === 'completed' ? '#2E7D32' : '#C62828'
                        }}
                      >
                        {att.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => onReviewAttempt(att)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--sq-maroon)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 11,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        Review Solutions <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--sq-text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>No Assessment Attempts Recorded</div>
            <p style={{ margin: '4px auto 0', fontSize: 11, maxWidth: 360 }}>
              Start an Aptitude, Technical, or Combined Mock Placement test to track your performance diagnostics here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
