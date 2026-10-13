import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, ArrowLeft, Bell, BriefcaseBusiness, Building2, Check, ChevronDown, CircleAlert, ClipboardList, GraduationCap, LogOut, Menu, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { PortalKind, TrustedMembership } from '../auth/portalRules'
import { isStudentVerificationApproved, portalHomeFor, roleCanOpenPortal } from '../auth/portalRules'
import { readableAuthError, supabase } from '../lib/supabase'
import { DataImportWizard } from '../components/DataImportWizard'
import { PortalAnalytics } from '../components/PortalAnalytics'
import { StudentIntelligence, FacultyStudentScores } from '../components/StudentIntelligence'
import { InterventionManager } from '../components/InterventionManager'
import { PlacementReadinessOverview, ScoreCalculationControl, StudentSupport } from '../components/Phase5Actions'
import { PrivateDocumentLink } from '../components/PrivateDocumentLink'
import '../styles/portals.css'

type PortalProfile = { id: string; full_name: string; roll_number: string; institution_id: string | null; course_id: string | null; department_id: string | null; academic_year: number; admission_year: number; account_status: string }
type StudentRow = Pick<PortalProfile, 'id' | 'full_name' | 'roll_number' | 'department_id' | 'account_status'>
type InstitutionChoice = { id: string; name: string }
const roleNames: Record<PortalKind, string> = { student: 'Student', faculty: 'Faculty / Mentor', admin: 'Institution review', placement: 'Placement' }

function go(path: string) { window.location.assign(path) }
function Loading({ label = 'Loading your portal…' }: { label?: string }) {
  return <main className="portal-loading" role="status"><span className="portal-spinner"/><p>{label}</p></main>
}
function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="portal-empty"><span><Activity size={19}/></span><h3>{title}</h3><p>{children}</p></div>
}
function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: typeof Users }) {
  return <article className="portal-metric"><span className="portal-metric-icon"><Icon size={18}/></span><span className="portal-metric-label">{label}</span><b>{value}</b><small>{note}</small></article>
}
function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="portal-section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>
}

function Layout({ kind, memberships, children, institutionName, hasStudentProfile }: { kind: PortalKind; memberships: TrustedMembership[]; children: ReactNode; institutionName?: string; hasStudentProfile: boolean }) {
  const { session } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const accessible = useMemo(() => {
    const rows = memberships.filter(row => row.status === 'active')
    const links: { kind: PortalKind; path: string; title: string }[] = []
    if (rows.some(row => row.role === 'admin' || row.role === 'reviewer')) links.push({ kind: 'admin', path: '/admin', title: 'Institution review' })
    if (rows.some(row => row.role === 'faculty')) links.push({ kind: 'faculty', path: '/faculty', title: 'Faculty / Mentor' })
    if (rows.some(row => row.role === 'placement_officer')) links.push({ kind: 'placement', path: '/placement', title: 'Placement' })
    if (hasStudentProfile) links.push({ kind: 'student', path: '/student', title: 'My progress' })
    return links
  }, [kind, memberships, hasStudentProfile])
  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    go('/login')
  }
  useEffect(() => {
    if (!drawerOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [drawerOpen])
  return <div className="portal-shell">
    {drawerOpen && <button className="portal-drawer-scrim" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}/>}
    <aside className={`portal-sidebar ${drawerOpen ? 'portal-sidebar-open' : ''}`} aria-label="Portal navigation">
      <a className="portal-brand" href="/" aria-label="Ascendiq home"><img src="/assets/ascendiq-logo.jpeg" alt=""/><span>ascendiq<small>STUDENT SUCCESS, IN FOCUS</small></span></a>
      <div className="portal-workspace"><span>YOUR WORKSPACE</span><b>{roleNames[kind]}</b><small>{institutionName ?? 'Ascendiq'}</small></div>
      <nav className="portal-nav">
        {accessible.map(link => <a key={link.path} className={link.kind === kind ? 'portal-nav-active' : ''} href={link.path} aria-current={link.kind === kind ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>
          {link.kind === 'student' ? <GraduationCap size={17}/> : link.kind === 'faculty' ? <Users size={17}/> : link.kind === 'admin' ? <Building2 size={17}/> : <BriefcaseBusiness size={17}/>}{link.title}
        </a>)}
        <a href="/verification-pending" onClick={() => setDrawerOpen(false)}><ShieldCheck size={17}/>Verification status</a>
      </nav>
      <div className="portal-sidebar-bottom"><span className="portal-secure-dot"/> Role and records are checked by Supabase</div>
    </aside>
    <div className="portal-main-wrap">
      <header className="portal-topbar">
        <button className="portal-mobile-menu" aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={drawerOpen} onClick={() => setDrawerOpen(!drawerOpen)}>{drawerOpen ? <X size={19}/> : <Menu size={19}/>}</button>
        <div className="portal-topbar-context"><span>ASCENDIQ</span><b>{roleNames[kind]}</b></div>
        <div className="portal-topbar-actions"><div className="portal-notification" aria-label="No new notifications"><Bell size={17}/><span/></div>
          <details className="portal-profile-wrap"><summary className="portal-profile-button"><span className="portal-avatar">{session?.user.email?.slice(0, 1).toUpperCase() ?? 'A'}</span><span className="portal-profile-email">{session?.user.email ?? 'Account'}</span><ChevronDown size={15}/></summary>
            <div className="portal-profile-menu"><p>{session?.user.email}</p><button onClick={signOut}><LogOut size={15}/> Sign out</button></div>
          </details>
        </div>
      </header>
      <main className="portal-content">{children}<footer className="portal-footer">Ascendiq · Respectful, institution-scoped student support</footer></main>
    </div>
  </div>
}

function PageIntro({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="portal-page-intro"><span>{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div>
}

function usePortalContext(kind: PortalKind) {
  const { session, loading: sessionLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberships, setMemberships] = useState<TrustedMembership[]>([])
  const [profile, setProfile] = useState<PortalProfile | null>(null)
  const [institutions, setInstitutions] = useState<InstitutionChoice[]>([])
  useEffect(() => {
    if (sessionLoading) return
    if (!session) { go('/login'); return }
    if (!supabase) { setError('Supabase is not configured. Add the project URL and public key, then reload.'); setLoading(false); return }
    const client = supabase
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      supabase.from('institution_memberships').select('institution_id,role,status').eq('user_id', session.user.id).eq('status', 'active'),
      supabase.from('profiles').select('id,full_name,roll_number,institution_id,course_id,department_id,academic_year,admission_year,account_status').eq('id', session.user.id).maybeSingle(),
      supabase.from('student_registration_requests').select('request_status').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('student_verifications').select('verification_status').eq('user_id', session.user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(async ([memberResult, profileResult, requestResult, verifResult]) => {
      if (cancelled) return
      if (memberResult.error) throw memberResult.error
      if (profileResult.error) throw profileResult.error
      const rows = (memberResult.data ?? []) as TrustedMembership[]
      const ownProfile = profileResult.data as PortalProfile | null
      const approvedStudent = isStudentVerificationApproved({
        accountStatus: ownProfile?.account_status,
        requestStatus: requestResult.data?.request_status,
        verificationStatus: verifResult.data?.verification_status,
      })
      setMemberships(rows)
      setProfile(ownProfile)
      if (!roleCanOpenPortal(kind, rows, approvedStudent)) {
        go(portalHomeFor(rows, approvedStudent))
        return
      }
      const ids = [...new Set([...rows.map(row => row.institution_id), ...(ownProfile?.institution_id ? [ownProfile.institution_id] : [])])]
      if (ids.length) {
        const names = await client.from('institutions').select('id,name').in('id', ids)
        if (cancelled) return
        if (names.error) throw names.error
        setInstitutions((names.data ?? []) as InstitutionChoice[])
      }
      if (!cancelled) setLoading(false)
    }).catch(cause => {
      if (!cancelled) { setError(readableAuthError(cause instanceof Error ? cause.message : 'request failed')); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [kind, session, sessionLoading])
  return { session, loading: sessionLoading || loading, error, memberships, profile, institutions }
}

function PortalFrame({ kind, context, children }: { kind: PortalKind; context: ReturnType<typeof usePortalContext>; children: (institutionName?: string, institutionId?: string) => ReactNode }) {
  if (context.loading) return <Loading/>
  if (context.error) return <main className="portal-error-page"><CircleAlert size={25}/><h1>We couldn’t load this portal</h1><p>{context.error}</p><button className="portal-primary-button" onClick={() => window.location.reload()}>Try again</button></main>
  const institutionId = kind === 'student' ? context.profile?.institution_id ?? undefined : context.memberships.find(row => row.status === 'active' && (kind === 'admin' ? row.role === 'admin' || row.role === 'reviewer' : kind === 'faculty' ? row.role === 'faculty' : row.role === 'placement_officer'))?.institution_id
  const institutionName = context.institutions.find(row => row.id === institutionId)?.name
  const hasApprovedStudentAccess = isStudentVerificationApproved({ accountStatus: context.profile?.account_status })
  return <Layout kind={kind} memberships={context.memberships} institutionName={institutionName} hasStudentProfile={hasApprovedStudentAccess}>{children(institutionName, institutionId)}</Layout>
}

export function StudentPortal() {
  const context = usePortalContext('student')
  const [catalog, setCatalog] = useState<{ institution?: string; course?: string; department?: string }>({})
  useEffect(() => {
    if (!supabase || !context.profile?.institution_id || !context.profile.course_id || !context.profile.department_id) return
    let cancelled = false
    Promise.all([
      supabase.from('institutions').select('name').eq('id', context.profile.institution_id).maybeSingle(),
      supabase.from('institution_courses').select('name').eq('id', context.profile.course_id).eq('institution_id', context.profile.institution_id).maybeSingle(),
      supabase.from('institution_departments').select('name').eq('id', context.profile.department_id).eq('institution_id', context.profile.institution_id).maybeSingle(),
    ]).then(([institution, course, department]) => {
      if (!cancelled) setCatalog({ institution: institution.data?.name, course: course.data?.name, department: department.data?.name })
    })
    return () => { cancelled = true }
  }, [context.profile])
  return <PortalFrame kind="student" context={context}>{(_, institutionId) => <>
    <PageIntro eyebrow="STUDENT SPACE" title={`Welcome${context.profile?.full_name ? `, ${context.profile.full_name.split(' ')[0]}` : ''}`} detail="Your account and current verification status, in one place."/>
    <div className="portal-grid portal-grid-two">
      <section className="portal-panel"><SectionHeading title="Your profile" detail="Information linked to your student account."/>
        {context.profile ? <dl className="portal-profile-details"><div><dt>Institution</dt><dd>{catalog.institution ?? 'Institution record'}</dd></div><div><dt>Program</dt><dd>{catalog.course ?? 'Program record'}</dd></div><div><dt>Department</dt><dd>{catalog.department ?? 'Department record'}</dd></div><div><dt>Admission year</dt><dd>{context.profile.admission_year}</dd></div><div><dt>Current year</dt><dd>Year {context.profile.academic_year}</dd></div><div><dt>Roll number</dt><dd>{context.profile.roll_number}</dd></div></dl> : <EmptyState title="Profile not available">Your student profile is not available yet. Check your verification status or contact your institution.</EmptyState>}
      </section>
      <section className="portal-panel"><SectionHeading title="Verification" detail="Your institution’s review status."/><div className={`portal-status-pill status-${context.profile?.account_status ?? 'pending'}`}><span/>{(context.profile?.account_status ?? 'pending').replace(/_/g, ' ')}</div><p className="portal-muted">Verification decisions are made by authorized institution reviewers. You cannot change your own status.</p><a className="portal-text-link" href="/verification-pending">View verification details <ArrowLeft size={14}/></a></section>
    </div>
    <SectionHeading title="Your progress" detail="Academic, attendance, engagement, and skills records will appear when your institution connects validated data."/>
    <PortalAnalytics institutionId={institutionId} canFilter={false}/>
    {context.profile?.institution_id&&<StudentIntelligence institutionId={context.profile.institution_id} studentProfileId={context.profile.id}/>}
    <StudentSupport/>
  </>}</PortalFrame>
}

export function FacultyPortal() {
  const context = usePortalContext('faculty')
  const facultyMemberships = context.memberships.filter(row => row.status === 'active' && row.role === 'faculty')
  const [institutionId, setInstitutionId] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!institutionId && facultyMemberships[0]) setInstitutionId(facultyMemberships[0].institution_id) }, [facultyMemberships, institutionId])
  const load = useCallback(async () => {
    if (!supabase || !institutionId) return
    setLoading(true); setError('')
    let query = supabase.from('profiles').select('id,full_name,roll_number,department_id,account_status', { count: 'exact' }).eq('institution_id', institutionId)
    if (search.trim()) query = query.ilike('full_name', `%${search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_')}%`)
    const { data, count: total, error: queryError } = await query.order('full_name').range(page * 10, page * 10 + 9)
    if (queryError) setError(readableAuthError(queryError.message))
    else { setStudents((data ?? []) as StudentRow[]); setCount(total ?? 0) }
    setLoading(false)
  }, [institutionId, page, search])
  useEffect(() => { void load() }, [load])
  const institutionName = context.institutions.find(row => row.id === institutionId)?.name
  return <PortalFrame kind="faculty" context={context}>{() => <>
    <PageIntro eyebrow="FACULTY / MENTOR" title="Your assigned students" detail="Student access is limited to active assignments for your institution."/>
    {facultyMemberships.length > 1 && <label className="portal-filter">Institution<select value={institutionId} onChange={event => { setInstitutionId(event.target.value); setPage(0) }}>{facultyMemberships.map(item => <option key={item.institution_id} value={item.institution_id}>{context.institutions.find(row => row.id === item.institution_id)?.name ?? 'Institution'}</option>)}</select></label>}
    <div className="portal-metric-grid portal-grid-three"><MetricCard label="Assigned students" value={count} note="Count respects assignment and institution policies." icon={Users}/><MetricCard label="Students needing attention" value="Not available" note="Academic and attendance indicators are not connected." icon={CircleAlert}/><MetricCard label="Interventions" value="Not implemented" note="Intervention assignments are planned for a later phase." icon={ClipboardList}/></div>
    <section className="portal-panel portal-panel-gap"><SectionHeading title="Student list" detail={institutionName ? `Authorized assignments at ${institutionName}.` : 'Authorized assignments for your institution.'} action={<label className="portal-search"><Search size={15}/><input value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} placeholder="Search assigned students" aria-label="Search assigned students"/></label>}/>
      {error && <div className="portal-inline-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></div>}
      {loading ? <Loading label="Loading assigned students…"/> : students.length ? <><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Roll number</th><th>Account status</th></tr></thead><tbody>{students.map(student => <tr key={student.id}><td>{student.full_name}</td><td>{student.roll_number}</td><td><span className={`portal-status-pill status-${student.account_status}`}>{student.account_status.replace(/_/g, ' ')}</span></td></tr>)}</tbody></table></div><Pagination page={page} count={count} onChange={setPage}/></> : <EmptyState title={search ? 'No matching assigned students' : 'No students assigned'}>{search ? 'Try a different search term.' : 'A trusted institution administrator must assign students before they appear here.'}</EmptyState>}
    </section>
    <div className="portal-panel-gap"><PortalAnalytics institutionId={institutionId}/></div><FacultyStudentScores institutionId={institutionId} students={students}/><div className="portal-panel-gap"><InterventionManager institutionId={institutionId} students={students}/></div>
  </>}</PortalFrame>
}

type QueueStudent = StudentRow & { verificationId?: string; submittedAt?: string; documentPath?: string | null }
export function AdminPortal() {
  const context = usePortalContext('admin')
  const reviewerMemberships = context.memberships.filter(row => row.status === 'active' && (row.role === 'admin' || row.role === 'reviewer'))
  const [institutionId, setInstitutionId] = useState('')
  const [queue, setQueue] = useState<QueueStudent[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [departmentCount, setDepartmentCount] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { if (!institutionId && reviewerMemberships[0]) setInstitutionId(reviewerMemberships[0].institution_id) }, [reviewerMemberships, institutionId])
  const load = useCallback(async () => {
    if (!supabase || !institutionId) return
    setLoading(true); setError(''); setNotice('')
    const [pending, approved, departments] = await Promise.all([
      supabase.from('profiles').select('id,full_name,roll_number,department_id,account_status', { count: 'exact' }).eq('institution_id', institutionId).in('account_status', ['pending', 'needs_more_information']).order('created_at', { ascending: true }).range(page * 10, page * 10 + 9),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('account_status', 'approved'),
      supabase.from('institution_departments').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('status', 'active'),
    ])
    if (pending.error || approved.error || departments.error) {
      setError(readableAuthError(pending.error?.message ?? approved.error?.message ?? departments.error?.message ?? 'request failed'))
      setLoading(false); return
    }
    const base = (pending.data ?? []) as StudentRow[]
    let withVerification: QueueStudent[] = base
    if (base.length) {
      const verifications = await supabase.from('student_verifications').select('id,user_id,submitted_at,document_storage_path').in('user_id', base.map(row => row.id)).in('verification_status', ['pending', 'needs_more_information']).order('submitted_at', { ascending: false })
      if (verifications.error) { setError(readableAuthError(verifications.error.message)); setLoading(false); return }
      const latest = new Map<string, { id: string; submitted_at: string; document_storage_path: string | null }>()
      for (const item of verifications.data ?? []) if (!latest.has(item.user_id)) latest.set(item.user_id, { id: item.id, submitted_at: item.submitted_at, document_storage_path: item.document_storage_path })
      withVerification = base.map(row => ({ ...row, verificationId: latest.get(row.id)?.id, submittedAt: latest.get(row.id)?.submitted_at, documentPath: latest.get(row.id)?.document_storage_path }))
    }
    setQueue(withVerification); setPendingCount(pending.count ?? 0); setApprovedCount(approved.count ?? 0); setDepartmentCount(departments.count ?? 0); setLoading(false)
  }, [institutionId, page])
  useEffect(() => { void load() }, [load])
  async function decide(row: QueueStudent, decision: 'approved' | 'rejected' | 'needs_more_information') {
    if (!supabase || !row.verificationId) return
    let notes: string | null = null
    if (decision !== 'approved') {
      const prompt = decision === 'rejected' ? 'Enter the reason for rejecting this verification:' : 'Enter what information is needed:'
      notes = window.prompt(prompt)?.trim() ?? null
      if (!notes || notes.length < 3) return
    }
    setBusyId(row.id); setError(''); setNotice('')
    const { error: result } = await supabase.rpc('submit_verification_review', { target_verification: row.verificationId, decision, notes })
    if (result) setError(readableAuthError(result.message))
    else { setNotice(`Review saved for ${row.full_name}.`); await load() }
    setBusyId('')
  }
  const institutionName = context.institutions.find(row => row.id === institutionId)?.name
  return <PortalFrame kind="admin" context={context}>{() => <>
    <PageIntro eyebrow="COLLEGE ADMINISTRATION" title="Institution overview" detail="Institution-scoped review access. Each query is filtered by your trusted membership and enforced by database policies."/>
    {reviewerMemberships.length > 1 && <label className="portal-filter">Institution<select value={institutionId} onChange={event => { setInstitutionId(event.target.value); setPage(0) }}>{reviewerMemberships.map(item => <option key={item.institution_id} value={item.institution_id}>{context.institutions.find(row => row.id === item.institution_id)?.name ?? 'Institution'}</option>)}</select></label>}
    <div className="portal-metric-grid portal-grid-three"><MetricCard label="Approved students" value={approvedCount} note="Approved student profiles at this institution." icon={Users}/><MetricCard label="Verification queue" value={pendingCount} note="Pending and more-information requests." icon={ShieldCheck}/><MetricCard label="Active departments" value={departmentCount ?? '—'} note="Active catalog departments. No cross-institution totals." icon={Building2}/></div>
    <section className="portal-panel portal-panel-gap"><SectionHeading title="Verification queue" detail={institutionName ?? 'Your authorized institution'} action={<button className="portal-secondary-button" onClick={() => void load()}>Refresh</button>}/>
      {error && <div className="portal-inline-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></div>}{notice && <p className="portal-inline-success" role="status"><Check size={15}/>{notice}</p>}
      {loading ? <Loading label="Loading institution review queue…"/> : queue.length ? <><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Roll number</th><th>Status</th><th>Submitted</th><th>Student ID proof</th><th>Review</th></tr></thead><tbody>{queue.map(row => <tr key={row.id}><td>{row.full_name}</td><td>{row.roll_number}</td><td>{row.account_status.replace(/_/g, ' ')}</td><td>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : 'No submission'}</td><td>{row.documentPath?<PrivateDocumentLink path={row.documentPath}/>:<span className="portal-muted">No document</span>}</td><td>{row.verificationId ? <div className="portal-row-actions"><button disabled={Boolean(busyId)} onClick={() => void decide(row, 'approved')}>Approve</button><button disabled={Boolean(busyId)} onClick={() => void decide(row, 'rejected')}>Reject</button><button disabled={Boolean(busyId)} onClick={() => void decide(row, 'needs_more_information')}>Request info</button></div> : <span className="portal-muted">No review record</span>}</td></tr>)}</tbody></table></div><Pagination page={page} count={pendingCount} onChange={setPage}/></> : <EmptyState title="The verification queue is clear">New requests for this institution will appear here. Only an authorized reviewer or administrator can make a decision.</EmptyState>}
    </section>
    <div className="portal-panel-gap"><PortalAnalytics institutionId={institutionId}/></div><section className="portal-panel portal-panel-gap"><SectionHeading title="Scoring snapshots" detail="Run after reviewing the configured method and after validated imports are available."/><ScoreCalculationControl institutionId={institutionId}/></section><section className="portal-panel portal-panel-gap"><SectionHeading title="Institution data import" detail="CSV imports are matched by the institution and the student's roll number plus admission year. Existing records are not overwritten."/><DataImportWizard institutionId={institutionId}/></section>
  </>}</PortalFrame>
}

export function PlacementPortal() {
  const context = usePortalContext('placement')
  return <PortalFrame kind="placement" context={context}>{(_, institutionId) => <>
    <PageIntro eyebrow="CAREER SERVICES" title="Placement workspace" detail="A permission-scoped workspace for your institution. Candidate data will appear when validated placement records and criteria exist."/>
    <div className="portal-metric-grid portal-grid-three"><MetricCard label="Placement readiness" value="Not available" note="No validated readiness calculation exists yet." icon={BriefcaseBusiness}/><MetricCard label="Eligible candidates" value="Not available" note="Eligibility criteria have not been configured." icon={Users}/><MetricCard label="Recruitment activity" value="No data" note="No recruitment-drive records are connected." icon={ClipboardList}/></div>
    <div className="portal-panel-gap"><PortalAnalytics institutionId={institutionId}/></div>
    {institutionId&&<PlacementReadinessOverview institutionId={institutionId}/>}
    <section className="portal-panel portal-panel-gap"><SectionHeading title="Candidate list" detail="Candidate records are not available until approved data is connected."/><EmptyState title="No placement records yet">No candidate shortlist, skill-gap summary, offer, or outcome data is implemented. This page will not show fabricated placement statistics.</EmptyState></section>
    <div className="portal-grid portal-grid-two portal-panel-gap"><section className="portal-panel"><SectionHeading title="Skills gaps"/><EmptyState title="No validated skills data">Skills and assessment records are not connected yet.</EmptyState></section><section className="portal-panel"><SectionHeading title="Recruitment drives"/><EmptyState title="No drives configured">Recruitment drives and shortlists are not implemented in this phase.</EmptyState></section></div>
  </>}</PortalFrame>
}

function Pagination({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / 10))
  return <div className="portal-pagination"><span>Page {page + 1} of {pages} · {count} records</span><div><button disabled={page === 0} onClick={() => onChange(Math.max(0, page - 1))}>Previous</button><button disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>
}

export function PortalRoute({ kind }: { kind: PortalKind }) {
  if (kind === 'student') return <StudentPortal/>
  if (kind === 'faculty') return <FacultyPortal/>
  if (kind === 'admin') return <AdminPortal/>
  return <PlacementPortal/>
}
