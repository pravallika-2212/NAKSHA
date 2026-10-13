import { ArrowLeft } from 'lucide-react'
import { TrustedReviewerPortal } from '../components/TrustedReviewerPortal'

export default function AdminReviewerPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="header is-scrolled" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255, 248, 247, 0.96)', borderBottom: '1px solid var(--border-card)' }}>
        <div className="header-inner" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" className="brand" aria-label="Ascendiq Home">
              <img src="/assets/ascendiq-logo.jpeg" alt="Ascendiq" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <span>ascendiq<small>INSTITUTION ADMINISTRATION</small></span>
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--deep-maroon)',
                textDecoration: 'none',
                background: 'var(--soft-cloud)',
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-card)'
              }}
            >
              <ArrowLeft size={14} /> Open Decision Studio
            </a>
            <a href="/" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
              Exit to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Reviewer Workspace */}
      <main style={{ flex: 1, padding: '24px 16px' }}>
        <TrustedReviewerPortal />
      </main>

      {/* Footer */}
      <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', background: '#fff', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>ASCENDIQ · College Administration & Registration Verification Workspace</span>
        <span style={{ fontSize: 10 }}>Role-Based Access Protected · Immutable Audit Logging Active</span>
      </footer>
    </div>
  )
}
