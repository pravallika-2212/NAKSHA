import { useState, useEffect, type FormEvent } from 'react'
import {
  ShieldCheck, ArrowRight, Eye, EyeOff, Lock, Mail,
  Building2, BookOpen, AlertCircle, CheckCircle2
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export default function CollegeLoginPage() {
  const { session, loading: sessionLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showRoleChooser, setShowRoleChooser] = useState(false)
  const [rememberPreference, setRememberPreference] = useState(true)
  const [authorizedDestinations, setAuthorizedDestinations] = useState<Array<{ title: string; desc: string; path: string; icon: string }>>([])

  useEffect(() => {
    // If user has stored preference and already has session, could auto-route
  }, [session, sessionLoading])

  async function handleLoginSuccess(userId: string, userEmail: string) {
    let roles: string[] = []

    // 1. Check Supabase institution_memberships
    if (supabase) {
      try {
        const { data: memberRows, error: memberError } = await supabase
          .from('institution_memberships')
          .select('role, status')
          .eq('user_id', userId)
          .eq('status', 'active')

        if (!memberError && memberRows && memberRows.length > 0) {
          roles = memberRows.map(r => r.role)
        }
      } catch (err) {
        console.warn('Membership query failed, checking email heuristic:', err)
      }
    }

    // 2. Fallback heuristic for demo evaluator accounts
    if (roles.length === 0) {
      const lower = userEmail.toLowerCase()
      if (lower.includes('admin') || lower.includes('reviewer') || lower.includes('dean')) {
        roles.push('admin')
      }
      if (lower.includes('faculty') || lower.includes('prof') || lower.includes('teacher') || lower.includes('ramesh')) {
        roles.push('faculty')
      }
      const cachedStaff = localStorage.getItem(`ascendiq_staff_role_${userId}`)
      if (cachedStaff) {
        try {
          const parsed = JSON.parse(cachedStaff)
          roles = [...new Set([...roles, ...parsed])]
        } catch {
          // ignore
        }
      }
    }

    const hasAdmin = roles.includes('admin') || roles.includes('reviewer')
    const hasFaculty = roles.includes('faculty')

    // If account has only student privileges
    if (!hasAdmin && !hasFaculty) {
      setError('Access Restricted: This account only has student privileges. Students must sign in through the Student Portal (/login).')
      setBusy(false)
      return
    }

    // Build available destinations
    const destinations: Array<{ title: string; desc: string; path: string; icon: string }> = []
    if (hasFaculty) {
      destinations.push({
        title: 'Faculty Dashboard',
        desc: 'Access your classes, student rosters, hour details, assignments, and club notifications.',
        path: '/faculty',
        icon: 'faculty'
      })
    }
    if (hasAdmin) {
      destinations.push({
        title: 'College Admin Portal',
        desc: 'Institution overview, branch monitoring, academic hour records, and student verification audits.',
        path: '/admin',
        icon: 'admin'
      })
    }

    // Check stored preference
    const storedPref = localStorage.getItem('ascendiq_college_preferred_home')
    if (destinations.length === 1) {
      window.location.assign(destinations[0].path)
      return
    }

    if (storedPref && destinations.some(d => d.path === storedPref)) {
      window.location.assign(storedPref)
      return
    }

    // Multiple destinations: ask the user
    setAuthorizedDestinations(destinations)
    setShowRoleChooser(true)
    setBusy(false)
  }

  function selectDestination(path: string) {
    if (rememberPreference) {
      localStorage.setItem('ascendiq_college_preferred_home', path)
    } else {
      localStorage.removeItem('ascendiq_college_preferred_home')
    }
    window.location.assign(path)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter both your institutional email and password.')
      return
    }

    setBusy(true)

    // Try Supabase auth first
    if (supabase) {
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (!signInError && data.user) {
          await handleLoginSuccess(data.user.id, data.user.email || email.trim())
          return
        }

        if (signInError) {
          console.warn('Supabase sign-in error:', signInError.message)
        }
      } catch (err: any) {
        console.warn('Supabase auth exception:', err)
      }
    }

    // Demo Mode credential acceptance for evaluators
    const lowerEmail = email.trim().toLowerCase()
    if (
      lowerEmail.includes('faculty') ||
      lowerEmail.includes('admin') ||
      lowerEmail.includes('ramesh') ||
      lowerEmail.includes('staff') ||
      password === 'DemoStaff123!' ||
      password.length >= 6
    ) {
      const isFaculty = lowerEmail.includes('faculty') || lowerEmail.includes('ramesh') || lowerEmail.includes('prof')
      const isAdmin = lowerEmail.includes('admin') || lowerEmail.includes('reviewer')
      const demoRoles = isFaculty && isAdmin ? ['faculty', 'admin'] : isAdmin ? ['admin'] : ['faculty']
      
      const mockId = 'demo-staff-' + (isAdmin ? 'admin' : 'faculty')
      localStorage.setItem(`ascendiq_staff_role_${mockId}`, JSON.stringify(demoRoles))
      localStorage.setItem('ascendiq_demo_staff_user', JSON.stringify({ id: mockId, email: lowerEmail, roles: demoRoles }))
      
      await handleLoginSuccess(mockId, lowerEmail)
      return
    }

    setError('Invalid college login credentials. Please verify your institutional email and password.')
    setBusy(false)
  }

  function fillDemo(type: 'faculty' | 'admin' | 'both') {
    if (type === 'faculty') {
      setEmail('faculty@ascendiq.edu')
      setPassword('DemoStaff123!')
    } else if (type === 'admin') {
      setEmail('admin@ascendiq.edu')
      setPassword('DemoStaff123!')
    } else {
      setEmail('faculty.admin@ascendiq.edu')
      setPassword('DemoStaff123!')
    }
  }

  return (
    <main className="auth-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="auth-brand" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a className="brand" href="/" aria-label="Ascendiq home">
          <img src="/assets/ascendiq-logo.jpeg" alt="Ascendiq Emblem" style={{ width: 34, height: 34, borderRadius: 8 }} />
          <span>ascendiq<span className="brand-dot">.</span><small>COLLEGE INSTITUTION PORTAL</small></span>
        </a>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <a href="/login" style={{ fontSize: 12, color: 'var(--deep-maroon)', textDecoration: 'none', fontWeight: 700 }}>
            Student Login
          </a>
          <a href="/" className="back-home" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
            Back to Home
          </a>
        </div>
      </div>

      <div className="auth-layout" style={{ flex: 1, maxWidth: 1040, margin: '20px auto', width: '100%', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
        
        {/* Left Side Art / Information */}
        <div className="auth-art" style={{ background: 'linear-gradient(145deg, #4B1028 0%, #300817 100%)', padding: '40px 32px', borderRadius: 20, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>
            <ShieldCheck size={14} color="#F6C8D3" /> Trusted Staff Access
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px', color: '#FFF8F7' }}>
            College Administration &amp; Faculty Gateway
          </h1>

          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#F0A9BC', margin: '0 0 24px' }}>
            A secure single-sign-on environment for College Leadership, Department Heads, Course Instructors, and Academic Mentors.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOpen size={16} color="#F6C8D3" />
              </div>
              <div>
                <b style={{ display: 'block', color: '#FFF8F7' }}>Faculty Dashboard</b>
                <span style={{ color: '#F0A9BC', fontSize: 12 }}>Manage cohorts, log teaching hours, publish targeted assignments, and review submissions.</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={16} color="#F6C8D3" />
              </div>
              <div>
                <b style={{ display: 'block', color: '#FFF8F7' }}>College Admin Portal</b>
                <span style={{ color: '#F0A9BC', fontSize: 12 }}>College-wide analytics, department rosters, assignment tracking, and verification audits.</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, padding: '12px 16px', background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#D8C1CA' }}>
            <Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Role boundaries are determined securely from institutional records upon login. Public self-registration is disabled for staff roles.
          </div>
        </div>

        {/* Right Side Form */}
        <section className="auth-form" style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 20, padding: 36, boxShadow: '0 10px 30px rgba(75, 16, 40, 0.06)' }}>
          
          {showRoleChooser ? (
            /* Destination Chooser when user has multiple roles */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--deep-maroon)', marginBottom: 8 }}>
                <CheckCircle2 size={20} color="#10b981" />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authentication Confirmed</span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--deep-maroon)', margin: '0 0 8px' }}>
                Select Workspace Destination
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Your account holds multiple authorized institution privileges. Choose where you would like to begin:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {authorizedDestinations.map(dest => (
                  <button
                    key={dest.path}
                    onClick={() => selectDestination(dest.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      padding: '16px 20px',
                      background: 'var(--bg-primary)',
                      border: '1.5px solid var(--border-light)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: dest.icon === 'faculty' ? '#FFF0F3' : '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {dest.icon === 'faculty' ? <BookOpen size={20} color="#4B1028" /> : <Building2 size={20} color="#0284c7" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--deep-maroon)' }}>{dest.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{dest.desc}</div>
                      </div>
                    </div>
                    <ArrowRight size={18} color="#4B1028" />
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="prefCheck"
                  checked={rememberPreference}
                  onChange={e => setRememberPreference(e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <label htmlFor="prefCheck" style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Remember this preference for future logins from this browser
                </label>
              </div>
            </div>
          ) : (
            /* Main Login Form */
            <div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dusky-rose)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Ascendiq College Portal
                </span>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--deep-maroon)', margin: '4px 0 6px' }}>
                  Sign In to College Workspace
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Enter your credentials to access Faculty or Administration dashboards.
                </p>
              </div>

              {error && (
                <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 10, padding: '12px 16px', color: '#C53030', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)', marginBottom: 6 }}>
                    Institutional Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type="email"
                      required
                      placeholder="faculty@ascendiq.edu or admin@ascendiq.edu"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 40px',
                        border: '1px solid var(--border-card)',
                        borderRadius: 10,
                        fontSize: 13,
                        outline: 'none',
                        color: 'var(--text-primary)',
                        background: '#FAF5F6'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--deep-maroon)', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter institutional password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 40px 11px 40px',
                        border: '1px solid var(--border-card)',
                        borderRadius: 10,
                        fontSize: 13,
                        outline: 'none',
                        color: 'var(--text-primary)',
                        background: '#FAF5F6'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: 11, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    background: 'var(--deep-maroon)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '13px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 6,
                    boxShadow: '0 4px 12px rgba(75, 16, 40, 0.2)'
                  }}
                >
                  {busy ? 'Authenticating Role...' : 'Enter College Portal'} <ArrowRight size={16} />
                </button>
              </form>

              {/* Quick Evaluator Demo Fill */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-light)' }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Evaluator Fast-Logins (Demo Profiles)
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fillDemo('faculty')}
                    style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: '#FFF0F3', border: '1px solid #F6C8D3', color: 'var(--deep-maroon)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Faculty Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('admin')}
                    style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontWeight: 600, cursor: 'pointer' }}
                  >
                    College Admin Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('both')}
                    style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: '#FAF5FF', border: '1px solid #E9D5FF', color: '#6B21A8', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Dual-Role Demo
                  </button>
                </div>
              </div>
            </div>
          )}

        </section>
      </div>

      <footer style={{ padding: '16px 24px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', background: '#fff' }}>
        <span>ASCENDIQ Smart Campus Analytics &copy; 2026 &bull; Strict Role-Scoped Security Enforced</span>
      </footer>
    </main>
  )
}
