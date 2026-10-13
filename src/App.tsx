import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, BookOpenCheck, Check, CircleHelp, GraduationCap, HeartHandshake, Menu, Network, ShieldCheck, Sparkles, Target, Users, X } from 'lucide-react'
import AuthPage from './pages/AuthPages'
import VerificationPending from './pages/VerificationPending'
import DashboardPage from './pages/Dashboard'
import StudentDashboardPage from './pages/StudentDashboardPage'
import PrivacyNotice from './pages/PrivacyNotice'
import CollegeLoginPage from './pages/CollegeLoginPage'
import FacultyDashboardPage from './pages/FacultyDashboardPage'
import CollegeAdminPage from './pages/CollegeAdminPage'

import { HeroVideo } from './components/HeroVideo'
import { RoleCarousel3D } from './components/RoleCarousel3D'
import { lazy, Suspense } from 'react'

const LazyPortalRoute = lazy(() => import('./pages/Portals').then(module => ({ default: module.PortalRoute })))
function PortalRoute({ kind }: { kind: 'student' | 'faculty' | 'admin' | 'placement' }) {
  return <Suspense fallback={<main className="portal-loading" role="status">Loading secure portal…</main>}><LazyPortalRoute kind={kind}/></Suspense>
}


const logo = '/assets/ascendiq-logo.jpeg'
const features = [
  { icon: BarChart3, title: 'Student Success Score', text: 'Understand progress through a structured, explainable set of indicators with missing-data normalization.' },
  { icon: HeartHandshake, title: 'Early Risk Identification', text: 'Multi-indicator warning engine identifying attendance, academic, LMS, and placement bottlenecks.' },
  { icon: Users, title: 'Student Segmentation', text: 'Classify cohorts into 8 actionable groups to guide tailored mentoring and bootcamps.' },
  { icon: Sparkles, title: 'Explainable Analytics', text: 'Transparent breakdown of exact scores, weights, thresholds, and contributing evidence.' },
  { icon: Target, title: 'Placement Readiness', text: 'Diagnose coding and aptitude gaps to accelerate company recruitment readiness.' },
]
const steps = [
  ['01', 'Integrate data', 'Bring together approved academic, attendance, LMS, skills, and placement records.'],
  ['02', 'Understand progress', 'Transform records into transparent Student Success and distinct Risk Scores.'],
  ['03', 'Identify support needs', 'Flag specific contributing factors and segment students into actionable groups.'],
  ['04', 'Improve outcomes', 'Coordinate human-in-the-loop interventions and evaluate pre/post progress over time.'],
]
const roles = [
  { icon: GraduationCap, name: 'Students', line: 'See your progress, strengths, and personal improvement recommendations.' },
  { icon: BookOpenCheck, name: 'Faculty & Mentors', line: 'Monitor assigned cohorts, drill down into evidence, and plan interventions.' },
  { icon: Network, name: 'College Leaders', line: 'Evaluate institution-wide distributions, departments, and data quality logs.' },
  { icon: Target, name: 'Placement Teams', line: 'Spot coding skill gaps and coordinate company recruitment preparation.' },
]

function Brand({ light = false }: { light?: boolean }) {
  return <a className={`brand ${light ? 'brand-light' : ''}`} href="/" aria-label="Ascendiq home"><img src={logo} alt="Ascendiq silver emblem" /><span>ascendiq<span className="brand-dot">.</span><small>STUDENT SUCCESS INTELLIGENCE</small></span></a>
}
function Button({ children, href = '/dashboard', secondary = false }: { children: React.ReactNode; href?: string; secondary?: boolean }) {
  return <a className={`button ${secondary ? 'button-secondary' : ''}`} href={href}>{children}<ArrowRight size={16} /></a>
}
function ScoreRing() {
  return <div className="score-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ring-track" cx="50" cy="50" r="42"/><circle className="ring-value" cx="50" cy="50" r="42"/></svg><div className="ring-label"><b>82</b><span>out of 100</span></div></div>
}
function Chart() {
  return <svg className="chart" viewBox="0 0 400 130" role="img" aria-label="Illustrative academic progress trend rising over six months"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#A95873" stopOpacity=".2"/><stop offset="100%" stopColor="#A95873" stopOpacity="0"/></linearGradient></defs><path d="M0 98 C36 84 45 92 77 73 S126 87 155 58 S201 76 235 46 S280 60 309 31 S361 44 400 13 L400 130 L0 130Z" fill="url(#chartFill)"/><path d="M0 98 C36 84 45 92 77 73 S126 87 155 58 S201 76 235 46 S280 60 309 31 S361 44 400 13" fill="none" stroke="#A95873" strokeWidth="3" strokeLinecap="round" className="chart-line"/>{[[77,73],[155,58],[235,46],[309,31],[400,13]].map(([cx,cy])=><circle key={cx} cx={cx} cy={cy} r="4" fill="#fff" stroke="#A95873" strokeWidth="2"/>)}</svg>
}
function DashboardPreview({ hero = false }: { hero?: boolean }) {
  return <div className={`dashboard ${hero ? 'dashboard-hero' : ''}`}><div className="dashboard-top"><div><div className="dash-kicker"><span className="live-dot"/> COHORT SUCCESS PREVIEW</div><h3>Priya Sharma (STU-CS-101)</h3></div><span className="demo-pill">Scenario A Demo</span></div><div className="dash-main"><div className="metric-card score-card"><div className="metric-caption">STUDENT SUCCESS SCORE <CircleHelp size={13}/></div><div className="score-content"><ScoreRing/><div><div className="metric-number">68.6<span>/100</span></div><div className="metric-change"><ArrowUpRight size={14}/> High Academic Standing</div><p>Based on 5 verified indicators</p></div></div><div className="score-foot"><span><i className="dot cobalt"/>Academic 88.5%</span><span><i className="dot peach"/>Attendance 93.3%</span><span><i className="dot lavender"/>Coding 36.0%</span></div></div><div className="metric-card attendance-card"><div className="metric-caption">ATTENDANCE <span className="tiny-period">THIS TERM</span></div><div className="metric-number">93.3<span>%</span></div><div className="mini-bars" aria-label="Attendance by month"><i style={{height:'88%'}}/><i style={{height:'92%'}}/><i style={{height:'95%'}}/><i style={{height:'91%'}}/><i style={{height:'94%'}}/><i style={{height:'96%'}}/></div><div className="axis"><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span><span>JAN</span></div></div><div className="metric-card progress-card"><div className="metric-caption">ACADEMIC MARKS PROGRESS <span className="tiny-period">6 SEMESTERS</span></div><div className="progress-head"><b>CGPA 8.92 / 10.0</b><span>Passed all subjects</span></div><Chart/><div className="axis"><span>SEM 1</span><span>SEM 2</span><span>SEM 3</span><span>SEM 4</span><span>SEM 5</span><span>SEM 6</span></div></div><div className="metric-card readiness-card"><div className="metric-caption">PLACEMENT READINESS <span className="readiness-tag" style={{ background: '#FFF3CD', color: '#856404' }}>PREPARATION RECOMMENDED</span></div><div className="readiness-number">47.6<span>%</span></div><div className="readiness-track"><i style={{ width: '47.6%', background: 'linear-gradient(90deg, #C77D93, #4B1028)' }}/></div><div className="readiness-footer"><span>Coding Skill Gap: 36%</span><b>Inspect breakdown <ArrowRight size={12}/></b></div></div></div><div className="dashboard-foot"><span><ShieldCheck size={14}/> Explainable Decision Intelligence</span><span>Non-PII Demonstration Record</span></div></div>
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return <header className={`header ${scrolled ? 'is-scrolled' : ''}`}><div className="header-inner"><Brand/><nav className={open ? 'nav-open' : ''} aria-label="Main navigation"><a href="#features" onClick={() => setOpen(false)}>Features</a><a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a><a href="#institutions" onClick={() => setOpen(false)}>Workspaces</a><a href="/dashboard" onClick={() => setOpen(false)}>Analytics Dashboard</a><div className="mobile-nav-actions"><a href="/login">Student Login</a><a href="/college/login">College Login</a><Button href="/dashboard">Launch Platform</Button></div></nav><div className="header-actions">
          <a className="login-link" href="/login">Student Login</a>
          <a className="login-link" href="/college/login" style={{ marginLeft: 8, padding: '6px 12px', background: 'var(--soft-cloud)', borderRadius: 8, border: '1px solid var(--border-card)', color: 'var(--deep-maroon)', fontWeight: 700 }}>College Portal</a>
          <Button href="/dashboard">Launch Platform</Button>
        </div><button className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></header>
}

function Footer() {
  return <footer className="footer" id="about"><div className="footer-main"><div><Brand light/><p className="footer-summary">Every student has potential. ASCENDIQ helps institutions see it, nurture it, and turn fragmented campus data into meaningful student outcomes.</p></div><div className="footer-col"><b>Workspaces</b><a href="/dashboard">Decision Dashboard</a><a href="/student">Student Progress</a><a href="/faculty">Faculty & Mentors</a><a href="/admin">Data Integration</a></div><div className="footer-col"><b>Trust & Responsible AI</b><a href="#trust">Scoring Methodology</a><a href="/privacy">Privacy Principles</a><a href="#trust">Human-in-the-Loop Interventions</a></div></div><div className="footer-bottom"><span>© 2026 ASCENDIQ · Smart Campus Analytics</span><span>Technology Challenge Submission</span></div></footer>
}

function Landing() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('visible'))
      return
    }
    const io = new IntersectionObserver(items => items.forEach(i => {
      if (i.isIntersecting) {
        i.target.classList.add('visible')
        io.unobserve(i.target)
      }
    }), { threshold: .12 })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Header/>
      <main>
        {/* Hero Section with MotionSites.ai Background Video */}
        <section className="hero">
          <HeroVideo />
          <div className="hero-orb orb-one"/>
          <div className="hero-orb orb-two"/>
          
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span/> PREDICT · OPTIMIZE · IMPROVE</div>
              <h1>Turn student potential into <em>career success.</em></h1>
              <p className="hero-lede">
                Integrate disconnected academic, attendance, LMS, engagement, and placement records into a unified, explainable view of student progress—so faculty and leadership can take timely, evidence-based action.
              </p>
              <div className="hero-buttons">
                <Button href="/dashboard">Launch Analytics Platform</Button>
                <Button secondary href="#workspaces">Explore 3D Workspaces <ArrowDown size={15}/></Button>
              </div>
              <div className="hero-note">
                <span className="note-avatars"><i>✦</i><i>↗</i><i>◍</i></span>
                Built for students, faculty mentors, academic deans, and placement officers.
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-halo"/>
              <div className="float-chip chip-top">
                <span className="chip-icon lavender-bg"><Sparkles size={15}/></span>
                <span><small>DECISION SUPPORT</small><b>5 Core Questions</b></span>
                <ArrowUpRight size={15}/>
              </div>
              <div className="visual-main">
                <DashboardPreview hero/>
              </div>
              <div className="float-chip chip-bottom">
                <span className="chip-icon peach-bg"><Target size={16}/></span>
                <span><small>EARLY WARNING</small><b>Actionable Interventions</b></span>
                <span className="check-mark"><Check size={13}/></span>
              </div>
              <div className="connector c1"/>
              <div className="connector c2"/>
            </div>
          </div>

          {/* 3D Role-Selection Carousel */}
          <div id="workspaces" style={{ position: 'relative', zIndex: 10, paddingBottom: 40 }}>
            <RoleCarousel3D />
          </div>

          <div className="hero-bottom">
            <span><ShieldCheck size={15}/> Explainable Analytics. Transparent Indicators. Human Decisions.</span>
            <span>SCROLL TO EXPLORE <ArrowDown size={14}/></span>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="trust-strip">
          <p>A unified, explainable view across the student journey</p>
          <div>
            <span><GraduationCap/> ACADEMIC PROGRESS</span>
            <i/>
            <span><Users/> ATTENDANCE & LMS ENGAGEMENT</span>
            <i/>
            <span><Target/> PLACEMENT READINESS</span>
          </div>
        </section>

        {/* Platform Preview Section */}
        <section className="preview-section section-pad" id="preview">
          <div className="section-heading reveal">
            <div>
              <div className="eyebrow eyebrow-light"><span/> A CONNECTED VIEW OF PROGRESS</div>
              <h2>Complex campus signals.<br/><em>Clearer next steps.</em></h2>
            </div>
            <p>
              Transform fragmented spreadsheets and logs into transparent Student Success Scores, separate risk flags, and targeted interventions.
            </p>
          </div>
          <div className="preview-frame reveal">
            <DashboardPreview/>
            <div className="preview-aside">
              <span className="aside-mark"><Sparkles/></span>
              <p className="eyebrow eyebrow-light">EXPLAINABLE BY DESIGN</p>
              <h3>From scattered records to timely support.</h3>
              <p>
                Every score is accompanied by its underlying evidence, component weights, threshold rules, and missing data coverage—never a black box.
              </p>
              <a href="/dashboard">Launch Decision Workspace <ArrowRight size={15}/></a>
            </div>
          </div>
          <div className="preview-caption">
            <span><i className="live-dot"/> Real Analytics Engine</span>
            <span>FastAPI Backend · PostgreSQL Schema · Responsive React Interface</span>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section section-pad" id="features">
          <div className="section-heading centered reveal">
            <div className="eyebrow eyebrow-light"><span/> BUILT AROUND STUDENT SUCCESS</div>
            <h2>Decision intelligence that empowers<br/><em>human support.</em></h2>
            <p>Designed around the five critical questions institutional leaders must answer.</p>
          </div>
          <div className="feature-grid">
            {features.map((f, i) => (
              <article className={`feature-card reveal feature-${i + 1}`} key={f.title}>
                <span className="feature-icon"><f.icon size={21}/></span>
                <span className="feature-index">0{i + 1}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <a href="/dashboard" aria-label={`Explore ${f.title}`}><ArrowUpRight size={16}/></a>
              </article>
            ))}
          </div>
        </section>

        {/* 4-Step Process */}
        <section className="process-section section-pad" id="how-it-works">
          <div className="process-intro reveal">
            <div className="eyebrow"><span/> FROM INFORMATION TO ACTION</div>
            <h2>A structured workflow,<br/><em>step by step.</em></h2>
            <p>Ascendiq turns raw multi-source campus data into coordinated, measurable support.</p>
            <Button secondary href="/dashboard">Explore Scenarios</Button>
          </div>
          <div className="steps">
            {steps.map(([n, title, text], i) => (
              <article className="step reveal" key={n}>
                <span className="step-number">{n}</span>
                {i < 3 && <span className="step-line"/>}
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Workspaces by Role */}
        <section className="roles-section section-pad" id="institutions">
          <div className="section-heading reveal">
            <div>
              <div className="eyebrow eyebrow-light"><span/> PURPOSE-BUILT WORKSPACES</div>
              <h2>Made for the stakeholders<br/>behind <em>student success.</em></h2>
            </div>
            <p>Role-scoped views with appropriate data boundaries and tailored action tools.</p>
          </div>
          <div className="roles-grid">
            {roles.map((role, i) => (
              <article className={`role-card reveal role-${i}`} key={role.name}>
                <div className="role-top">
                  <span className="role-icon"><role.icon size={20}/></span>
                  <span className="role-num">0{i + 1}</span>
                </div>
                <div>
                  <h3>{role.name}</h3>
                  <p>{role.line}</p>
                </div>
                <a href="/dashboard" style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--deep-maroon)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Open Workspace <ArrowRight size={12} />
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Responsible AI & Trust Section */}
        <section className="trust-section section-pad" id="trust">
          <div className="trust-copy reveal">
            <div className="eyebrow"><span/> RESPONSIBLE DECISION INTELLIGENCE</div>
            <h2>Analytics with<br/><em>care and context.</em></h2>
            <p>
              Student analytics must support intervention rather than punishment. Ascendiq is engineered around transparency, explicit missing data policies, least-privilege role boundaries, and people remaining at the center of every decision.
            </p>
            <a className="text-link" href="/dashboard">Inspect Decision Engine <ArrowRight size={16}/></a>
          </div>
          <div className="principles reveal">
            {[
              ['Transparent Indicators', 'Every score outputs its normalized component contributions, lookback window, and exact weighting.'],
              ['Explicit Missing-Data Policy', 'Missing records are never assumed to be zero. Scores are marked provisional or withheld if coverage is under 60%.'],
              ['Separate Risk Scoring', 'Risk is not 100 minus Success. It uses independent warning indicators (attendance < 75%, backlogs, coding gaps).'],
              ['Human-in-the-Loop Interventions', 'The platform proposes evidence-based recommendations; authorized faculty approve, schedule, and track actions.'],
              ['No Unwarranted Causal Claims', 'Before-and-after progress is presented descriptively without claiming automated causal certainty.']
            ].map(([h, p], i) => (
              <div className="principle" key={h}>
                <span className="principle-icon">{i === 3 ? <HeartHandshake size={19}/> : i === 1 ? <ShieldCheck size={19}/> : <Check size={18}/>}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
                <span className="principle-plus">+</span>
              </div>
            ))}
            <div className="principle-note">
              Engineered for the Student Success Analytics Technology Challenge.
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="closing-cta">
          <div className="cta-stars">✦ <span>·</span> ✦</div>
          <div className="cta-content">
            <img src={logo} alt="Ascendiq Logo"/>
            <div className="eyebrow">PREDICT · OPTIMIZE · IMPROVE</div>
            <h2>Every student deserves<br/>a <em>clearer path forward.</em></h2>
            <p>
              Experience the live demonstration dataset with Scenarios A, B, and C across 40+ synthetic students.
            </p>
            <Button href="/dashboard">Launch Platform</Button>
            <small>FastAPI Backend · PostgreSQL Data Model · React Dashboard</small>
          </div>
        </section>
      </main>
      <Footer/>
    </>
  )
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'

  useEffect(() => {
    const labels: { [key: string]: string } = {
      '/': 'ASCENDIQ — Smart Campus Analytics',
      '/login': 'Log in — ASCENDIQ',
      '/register': 'Register — ASCENDIQ',
      '/dashboard': 'Decision Dashboard — ASCENDIQ',
      '/student': 'Student Workspace — ASCENDIQ',
      '/faculty': 'Faculty Decision Workspace — ASCENDIQ',
      '/admin': 'Institution Review — ASCENDIQ',
      '/placement': 'Placement Workspace — ASCENDIQ',
      '/privacy': 'Privacy Notice — ASCENDIQ',
      '/student/overview': 'Student Overview — ASCENDIQ',
      '/student/academic': 'Academic Performance — ASCENDIQ',
      '/student/attendance': 'Attendance Habits — ASCENDIQ',
      '/student/lms': 'Learning Activity (LMS) — ASCENDIQ',
      '/student/engagement': 'Engagement & Clubs — ASCENDIQ',
      '/student/skills': 'Skills Development — ASCENDIQ',
      '/student/career': 'Career Readiness & Roadmap — ASCENDIQ',
      '/student/roadmap': 'Year 2 Dream Company Roadmap — ASCENDIQ',
      '/student/placement-prep': 'Year 3 Placement Preparation & Assessment Center — ASCENDIQ',
      '/student/placement': 'Placement Acceleration — ASCENDIQ',
      '/student/insights': 'AI Insights & Support — ASCENDIQ',
      '/student/profile': 'Student Profile — ASCENDIQ'
    }
    document.title = labels[path] ?? 'ASCENDIQ — Smart Campus Analytics'
  }, [path])

  if (path === '/') return <Landing/>
  if (path === '/dashboard') return <DashboardPage/>
  if (path === '/college/login' || path === '/college-login') return <CollegeLoginPage/>
  if (path === '/faculty' || path === '/college/faculty') return <FacultyDashboardPage/>
  if (path === '/admin' || path === '/college/admin') return <CollegeAdminPage/>
  if (path === '/student' || path.startsWith('/student/')) return <StudentDashboardPage/>
  
  if (path === '/placement') return <DashboardPage/>
  if (path === '/portal/student') return <StudentDashboardPage/>
  if (path === '/portal/faculty') return <PortalRoute kind="faculty"/>
  if (path === '/portal/admin') return <CollegeAdminPage/>
  if (path === '/portal/placement') return <PortalRoute kind="placement"/>
  if (path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password') {
    return <AuthPage type={path.slice(1) as 'login' | 'register' | 'forgot-password' | 'reset-password'}/>
  }
  if (path === '/verification-pending') return <VerificationPending/>
  if (path === '/privacy') return <PrivacyNotice/>

  return <Landing/>
}
