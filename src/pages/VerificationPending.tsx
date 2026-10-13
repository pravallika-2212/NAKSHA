import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, LogOut, ShieldAlert, UploadCloud } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { isStudentVerificationApproved, resolveEffectiveVerificationStatus, portalHomeFor, type TrustedMembership } from '../auth/portalAccess'
import { readableAuthError, supabase } from '../lib/supabase'
import { MAX_ID_PROOF_BYTES } from '../lib/registrationRules'
import { PrivateDocumentLink } from '../components/PrivateDocumentLink'

type Profile = { full_name: string; account_status: string; institution_id: string | null }
type Verification = { id: string; verification_status: string; document_storage_path: string | null; submitted_at: string; reviewer_note: string | null }
type RegistrationRequestInfo = { institution_name: string; program_name: string; department_name: string; request_status: string; reviewer_note: string | null; submitted_at: string }

const statusCopy: Record<string,{title:string;body:string;icon:typeof Clock3}> = {
  pending: { title:'Verification is pending', body:'Your details are waiting for an authorized institution reviewer. You can sign out and return later to check for an update.', icon:Clock3 },
  under_review: { title:'Verification is under review', body:'An authorized college administrator is currently inspecting your enrollment records and student identity document.', icon:Clock3 },
  approved: { title:'Your account is approved', body:'Your college has verified your credentials and approved your account! You now have full access to your student success dashboard.', icon:CheckCircle2 },
  matched: { title:'Your account is approved & matched', body:'Your college has verified your credentials and linked your academic records. You now have full access to your student success dashboard.', icon:CheckCircle2 },
  rejected: { title:'Verification needs attention', body:'An authorized reviewer could not approve the current submission. Please review the explanation below or contact your college administrator.', icon:ShieldAlert },
  needs_more_information: { title:'More information is needed', body:'Your institution reviewer has requested an updated submission. Please review their note and upload an updated document below.', icon:FileCheck2 },
}

export default function VerificationPending() {
  const { session, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [verification, setVerification] = useState<Verification | null>(null)
  const [registrationRequest, setRegistrationRequest] = useState<RegistrationRequestInfo | null>(null)
  const [document, setDocument] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!supabase || !session) { setLoadingProfile(false); return }
    let cancelled = false
    Promise.all([
      supabase.from('profiles').select('full_name,account_status,institution_id').eq('id',session.user.id).maybeSingle(),
      supabase.from('student_verifications').select('id,verification_status,document_storage_path,submitted_at,reviewer_note').eq('user_id',session.user.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle(),
      supabase.from('student_registration_requests').select('institution_name,program_name,department_name,request_status,reviewer_note,submitted_at').eq('user_id',session.user.id).maybeSingle(),
      supabase.from('institution_memberships').select('institution_id,role,status').eq('user_id',session.user.id).eq('status','active'),
    ]).then(([profileResult, verificationResult, reqResult, membershipResult]) => {
      if (cancelled) return
      if (profileResult.error || verificationResult.error || reqResult.error) {
        setError('We encountered a database error loading your verification status. Please retry.')
      }
      
      const activeMemberships = (membershipResult.data ?? []) as TrustedMembership[]
      if (activeMemberships.some(m => m.status === 'active' && (m.role === 'admin' || m.role === 'reviewer'))) {
        window.location.replace('/admin')
        return
      }
      
      const isApproved = isStudentVerificationApproved({
        accountStatus: profileResult.data?.account_status,
        requestStatus: reqResult.data?.request_status,
        verificationStatus: verificationResult.data?.verification_status,
      })
      if (isApproved) {
        window.location.replace('/student')
        return
      }
      if (!profileResult.data && activeMemberships.length) {
        window.location.replace(portalHomeFor(activeMemberships, false))
        return
      }
      setProfile(profileResult.data as Profile | null)
      setVerification(verificationResult.data as Verification | null)
      setRegistrationRequest(reqResult.data as RegistrationRequestInfo | null)
      setLoadingProfile(false)
    }).catch((cause) => {
      if (!cancelled) {
        setError(`We could not reach Supabase (${cause instanceof Error ? cause.message : 'network error'}). Check your connection and retry.`)
        setLoadingProfile(false)
      }
    })
    return () => { cancelled = true }
  }, [session])

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('')
    if (!supabase || !session) return
    if (!document) { setError('Choose a PDF, JPG, or PNG file first.'); return }
    if (document.size > MAX_ID_PROOF_BYTES || !['application/pdf','image/jpeg','image/png'].includes(document.type)) { setError('Choose a PDF, JPG, or PNG under 5 MiB.'); return }
    setBusy(true)
    try {
      const ext = document.name.split('.').pop()?.toLowerCase() || 'bin'
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('student-verifications').upload(path,document,{contentType:document.type,upsert:false})
      if(uploadError) throw uploadError
      const { data, error: rowError } = await supabase.rpc('submit_student_verification_document', { p_document_path: path })
      if(rowError) { await supabase.storage.from('student-verifications').remove([path]); throw rowError }
      setVerification(data as Verification); setProfile(prev=>prev?{...prev,account_status:'pending'}:prev); setDocument(null); setNotice('Your private document was submitted for institution review. Uploading does not verify your identity.')
    } catch(cause) { setError(readableAuthError(cause instanceof Error?cause.message:'upload failed')) }
    finally { setBusy(false) }
  }
  async function signOut() { if(supabase) await supabase.auth.signOut(); window.location.assign('/') }

  if(loading || loadingProfile) return <main className="status-page"><div className="status-card"><span className="loading-pulse"/>Loading your account status…</div></main>
  if(!session) return <main className="status-page"><div className="status-card"><img className="status-logo" src="/assets/ascendiq-logo.jpeg" alt="Ascendiq"/><span className="status-icon"><Clock3/></span><div className="eyebrow eyebrow-light"><span/> EMAIL CONFIRMATION</div><h1>Check your inbox.</h1><p>If you just registered, follow the confirmation link we sent. Then log in to submit optional verification documents and check your institution’s review status.</p><a className="button" href="/login">Go to log in <ArrowRight size={16}/></a><a className="status-home" href="/">Back to Ascendiq</a></div></main>

  const status = resolveEffectiveVerificationStatus({
    accountStatus: profile?.account_status,
    requestStatus: registrationRequest?.request_status,
    verificationStatus: verification?.verification_status,
  })
  const info = statusCopy[status] ?? statusCopy.pending
  const canSubmitDocument = (status === 'pending' && !verification?.document_storage_path) || status === 'needs_more_information'
  const activeNote = verification?.reviewer_note || registrationRequest?.reviewer_note
  const StatusIcon = info.icon

  return (
    <main className="status-page">
      <div className="status-card">
        <a href="/" aria-label="AscendIQ home">
          <img className="status-logo" src="/assets/ascendiq-logo.jpeg" alt="AscendIQ"/>
        </a>
        <span className={`status-icon state-${status}`}><StatusIcon/></span>
        <div className="eyebrow eyebrow-light"><span/> STUDENT VERIFICATION</div>
        <h1>{info.title}</h1>
        <p>{info.body}</p>

        {registrationRequest && (
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 10, padding: 12, margin: '12px 0', textAlign: 'left', fontSize: 12, border: '1px solid var(--border-card)' }}>
            <div style={{ fontWeight: 700, color: 'var(--deep-maroon)', marginBottom: 4 }}>Self-Declared Registration Details</div>
            <div><b>Institution:</b> {registrationRequest.institution_name}</div>
            <div><b>Program:</b> {registrationRequest.program_name} · <b>Dept:</b> {registrationRequest.department_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Submitted on: {new Date(registrationRequest.submitted_at).toLocaleDateString()}</div>
          </div>
        )}

        {profile?.institution_id===null && status !== 'approved' && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Your institution, program, and department are waiting for a college administrator to match them to verified catalog records.
          </p>
        )}

        {profile?.full_name && <div className="status-greeting">For {profile.full_name}</div>}

        {activeNote && (
          <div style={{ background: '#FFFDE7', border: '1px solid #FFF59D', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 12, textAlign: 'left' }}>
            <b style={{ color: '#F57F17' }}>College Reviewer Note:</b>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-primary)' }}>{activeNote}</p>
          </div>
        )}

        {verification && (
          <div className="submission-summary">
            <span>Identity Document</span>
            <b>{new Date(verification.submitted_at).toLocaleDateString()}</b>
            <small>{verification.document_storage_path ? 'Private ID document attached' : 'No document attached'}</small>
            {verification.document_storage_path && (
              <PrivateDocumentLink path={verification.document_storage_path} label="View my uploaded ID proof"/>
            )}
          </div>
        )}

        {error && <div className="form-message form-error" role="alert">{error}</div>}
        {notice && <div className="form-message form-success" role="status">{notice}</div>}

        {canSubmitDocument && (
          <form className="status-upload" onSubmit={submitDocument}>
            <label>
              Upload or Update Student ID Proof
              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setDocument(e.target.files?.[0]??null)}/>
              <small>Private PDF, JPG, or PNG · up to 5 MiB. Uploading is not verification.</small>
            </label>
            <button className="button" type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit document'} <UploadCloud size={16}/>
            </button>
          </form>
        )}

        {status === 'approved' && (
          <div style={{ marginTop: 14 }}>
            <a href="/student" className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8 }}>
              Enter Student Success Dashboard <ArrowRight size={16}/>
            </a>
          </div>
        )}

        <button className="status-signout" onClick={signOut}><LogOut size={15}/> Sign out {session?.user.email ? `(${session.user.email})` : ''} / Switch account</button>
        <a className="status-home" href="/">Back to AscendIQ</a>
        <div className="status-footnote">Only an authorized reviewer can change your verification status.</div>
      </div>
    </main>
  )
}
