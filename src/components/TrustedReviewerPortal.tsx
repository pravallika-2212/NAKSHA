import { useState, useEffect, useMemo } from 'react'
import {
  Search, Filter, CheckCircle2, XCircle,
  HelpCircle, Clock, Eye, AlertTriangle, FileText,
  Building, GraduationCap, ArrowRight,
  RefreshCw, ChevronRight, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PrivateDocumentLink } from './PrivateDocumentLink'

export interface RegistrationRequest {
  user_id: string;
  full_name: string;
  email: string;
  institution_name: string;
  program_name: string;
  department_name: string;
  admission_year: number;
  current_study_year: number;
  roll_number: string;
  request_status: 'pending' | 'under_review' | 'needs_more_information' | 'approved' | 'rejected' | 'matched';
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reviewer_note?: string | null;
  document_storage_path?: string | null;
  verification_id?: string | null;
}

export interface VerificationAuditEntry {
  id: string;
  request_id: string;
  student_name: string;
  reviewer_id: string;
  previous_status: string;
  new_status: string;
  notes: string;
  timestamp: string;
}

// Verified official institution catalog options for matching
export interface CatalogInstitution {
  id: string;
  name: string;
  programs: Array<{
    id: string;
    name: string;
    departments: Array<{ id: string; name: string }>;
  }>;
}

const DEFAULT_VERIFIED_CATALOG: CatalogInstitution[] = [
  {
    id: 'a1100000-0000-4000-8000-000000000001',
    name: 'ASCENDIQ Engineering Institute (Verified Campus)',
    programs: [
      {
        id: 'a1200000-0000-4000-8000-000000000001',
        name: 'Bachelor of Technology (B.Tech - 4 Years)',
        departments: [
          { id: 'a1300000-0000-4000-8000-000000000001', name: 'Computer Science & Engineering' },
          { id: 'a1300000-0000-4000-8000-000000000002', name: 'Artificial Intelligence & Data Science' },
          { id: 'a1300000-0000-4000-8000-000000000003', name: 'Electronics & Communication Engineering' },
        ]
      },
      {
        id: 'a1200000-0000-4000-8000-000000000002',
        name: 'Master of Technology (M.Tech - 2 Years)',
        departments: [
          { id: 'a1300000-0000-4000-8000-000000000004', name: 'Advanced Computer Systems' },
        ]
      }
    ]
  }
]

// Synthetic initial demonstration queue for verification walkthrough
const SYNTHETIC_DEMO_QUEUE: RegistrationRequest[] = [
  {
    user_id: 'usr-demo-req-001',
    full_name: 'Aditya K. Nair',
    email: 'aditya.nair@sample-student.edu',
    institution_name: 'ASCENDIQ Institute of Technology (Self-Declared)',
    program_name: 'B.Tech Computer Science',
    department_name: 'Computer Science',
    admission_year: 2023,
    current_study_year: 3,
    roll_number: '23CS-8891',
    request_status: 'pending',
    submitted_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    document_storage_path: 'usr-demo-req-001/student_id_proof.png'
  },
  {
    user_id: 'usr-demo-req-002',
    full_name: 'Meera Venkat',
    email: 'meera.venkat@sample-student.edu',
    institution_name: 'National College of Engineering',
    program_name: 'B.Tech AI & Data Science',
    department_name: 'Artificial Intelligence',
    admission_year: 2024,
    current_study_year: 2,
    roll_number: '24AI-0142',
    request_status: 'under_review',
    submitted_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    reviewed_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    reviewed_by: 'reviewer-admin-01',
    reviewer_note: 'Cross-verifying admission roll list with HOD office.',
    document_storage_path: 'usr-demo-req-002/id_card_front.pdf'
  },
  {
    user_id: 'usr-demo-req-003',
    full_name: 'Karthik S. Rao',
    email: 'karthik.rao@sample-student.edu',
    institution_name: 'City Tech University',
    program_name: 'B.Tech Electronics',
    department_name: 'Electronics & Communication',
    admission_year: 2022,
    current_study_year: 4,
    roll_number: '22EC-4410',
    request_status: 'needs_more_information',
    submitted_at: new Date(Date.now() - 96 * 3600000).toISOString(),
    reviewed_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    reviewed_by: 'reviewer-admin-01',
    reviewer_note: 'The uploaded student ID scan is blurred. Please upload a clear photo of your student identity badge or fee receipt.',
    document_storage_path: 'usr-demo-req-003/blurred_id.jpg'
  },
  {
    user_id: 'usr-demo-req-004',
    full_name: 'Tanvi Deshmukh',
    email: 'tanvi.d@sample-student.edu',
    institution_name: 'ASCENDIQ Engineering Institute',
    program_name: 'B.Tech Computer Science',
    department_name: 'Computer Science & Engineering',
    admission_year: 2023,
    current_study_year: 3,
    roll_number: '23CS-1090',
    request_status: 'approved',
    submitted_at: new Date(Date.now() - 120 * 3600000).toISOString(),
    reviewed_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    reviewed_by: 'reviewer-admin-01',
    reviewer_note: 'ID card and admission register verified against CS Dept catalog.',
    document_storage_path: 'usr-demo-req-004/id_proof_verified.png'
  },
  {
    user_id: 'usr-demo-req-005',
    full_name: 'Unknown Applicant (Spam Check)',
    email: 'spammer99@temporary-mail.org',
    institution_name: 'Random High School',
    program_name: 'General Studies',
    department_name: 'None',
    admission_year: 2021,
    current_study_year: 1,
    roll_number: 'TEST-000',
    request_status: 'rejected',
    submitted_at: new Date(Date.now() - 150 * 3600000).toISOString(),
    reviewed_at: new Date(Date.now() - 100 * 3600000).toISOString(),
    reviewed_by: 'reviewer-admin-01',
    reviewer_note: 'Not an accredited higher education institution or enrolled university student.',
    document_storage_path: null
  }
]

export function TrustedReviewerPortal() {
  const [requests, setRequests] = useState<RegistrationRequest[]>(SYNTHETIC_DEMO_QUEUE)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null)

  // Catalog Matching Selection
  const [selectedInstId, setSelectedInstId] = useState<string>(DEFAULT_VERIFIED_CATALOG[0].id)
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEFAULT_VERIFIED_CATALOG[0].programs[0].id)
  const [selectedDeptId, setSelectedDeptId] = useState<string>(DEFAULT_VERIFIED_CATALOG[0].programs[0].departments[0].id)

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false)
  const [modalDecision, setModalDecision] = useState<'approved' | 'rejected' | 'needs_more_information' | 'under_review'>('approved')
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionSubmitting, setDecisionSubmitting] = useState(false)

  // Audit Log
  const [auditLog, setAuditLog] = useState<VerificationAuditEntry[]>([
    {
      id: 'aud-001',
      request_id: 'usr-demo-req-004',
      student_name: 'Tanvi Deshmukh',
      reviewer_id: 'Dr. Sarah Mitchell (Administrator)',
      previous_status: 'under_review',
      new_status: 'approved',
      notes: 'Matched to B.Tech Computer Science & Engineering. Roll number 23CS-1090 verified.',
      timestamp: new Date(Date.now() - 48 * 3600000).toLocaleString()
    },
    {
      id: 'aud-002',
      request_id: 'usr-demo-req-003',
      student_name: 'Karthik S. Rao',
      reviewer_id: 'Dr. Sarah Mitchell (Administrator)',
      previous_status: 'under_review',
      new_status: 'needs_more_information',
      notes: 'Requested clearer photo of college identity card or enrollment receipt.',
      timestamp: new Date(Date.now() - 24 * 3600000).toLocaleString()
    }
  ])

  // Try loading live data from Supabase RPC
  async function loadLiveQueue() {
    if (!supabase) return
    setLoading(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('get_pending_registration_queue')
      if (rpcError) {
        setIsDemoMode(true)
        // If access was denied due to missing reviewer role, explain clearly
        if (rpcError.message?.toLowerCase().includes('authorized') || rpcError.message?.toLowerCase().includes('permission') || rpcError.message?.toLowerCase().includes('denied')) {
          setError('Reviewer queue requires an authorized Reviewer or Administrator account. Displaying demo queue.')
        }
      } else if (data && data.length > 0) {
        setRequests(data)
        setIsDemoMode(false)
      } else {
        setIsDemoMode(false)
        setRequests([])
      }
    } catch {
      setIsDemoMode(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLiveQueue()
  }, [])

  // KPI Calculations
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.request_status === 'pending').length,
      under_review: requests.filter(r => r.request_status === 'under_review').length,
      needs_info: requests.filter(r => r.request_status === 'needs_more_information').length,
      approved: requests.filter(r => r.request_status === 'approved' || r.request_status === 'matched').length,
      rejected: requests.filter(r => r.request_status === 'rejected').length,
    }
  }, [requests])

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== 'all' && r.request_status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = r.full_name.toLowerCase().includes(q)
        const matchesRoll = r.roll_number.toLowerCase().includes(q)
        const matchesInst = r.institution_name.toLowerCase().includes(q)
        const matchesEmail = r.email.toLowerCase().includes(q)
        if (!matchesName && !matchesRoll && !matchesInst && !matchesEmail) return false
      }
      return true
    })
  }, [requests, statusFilter, searchQuery])

  // Open Decision Modal
  function handleOpenDecision(decision: 'approved' | 'rejected' | 'needs_more_information' | 'under_review') {
    setModalDecision(decision)
    setDecisionNote(
      decision === 'approved' ? 'Identity verified and matched with institutional catalog records.' : ''
    )
    setDecisionModalOpen(true)
  }

  // Submit Review Decision
  async function handleSubmitDecision() {
    if (!selectedRequest) return
    if ((modalDecision === 'rejected' || modalDecision === 'needs_more_information') && decisionNote.trim().length < 3) {
      setError('A descriptive explanation (minimum 3 characters) is required for this decision.')
      return
    }

    setDecisionSubmitting(true)
    setError('')
    setNotice('')

    try {
      if (!isDemoMode && supabase) {
        const { error: rpcErr } = await supabase.rpc('review_student_registration_request', {
          p_target_user_id: selectedRequest.user_id,
          p_decision: modalDecision,
          p_notes: decisionNote.trim(),
          p_matched_institution_id: modalDecision === 'approved' ? selectedInstId : null,
          p_matched_course_id: modalDecision === 'approved' ? selectedProgramId : null,
          p_matched_department_id: modalDecision === 'approved' ? selectedDeptId : null
        })
        if (rpcErr) throw rpcErr
      }

      // Update local state
      const updatedList = requests.map(r => {
        if (r.user_id === selectedRequest.user_id) {
          return {
            ...r,
            request_status: modalDecision,
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'Dr. Sarah Mitchell (Administrator)',
            reviewer_note: decisionNote.trim()
          }
        }
        return r
      })

      setRequests(updatedList)
      setSelectedRequest(prev => prev ? {
        ...prev,
        request_status: modalDecision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Dr. Sarah Mitchell (Administrator)',
        reviewer_note: decisionNote.trim()
      } : null)

      // Record in immutable audit trail
      const newAudit: VerificationAuditEntry = {
        id: `aud-${Date.now()}`,
        request_id: selectedRequest.user_id,
        student_name: selectedRequest.full_name,
        reviewer_id: 'Dr. Sarah Mitchell (Administrator)',
        previous_status: selectedRequest.request_status,
        new_status: modalDecision,
        notes: decisionNote.trim(),
        timestamp: new Date().toLocaleString()
      }
      setAuditLog(prev => [newAudit, ...prev])

      if (isDemoMode) {
        setNotice(`[Demo Preview] Simulated decision recorded in memory for ${selectedRequest.full_name}: marked ${modalDecision.toUpperCase().replace(/_/g, ' ')}. (To persist to the live database, log in with an authorized reviewer account.)`)
      } else {
        setNotice(`Decision successfully persisted to database: ${selectedRequest.full_name} is now approved and matched to verified catalog records.`)
      }
      setDecisionModalOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review decision. Please check database permissions.')
    } finally {
      setDecisionSubmitting(false)
    }
  }

  // Active matched department list
  const currentInstitution = DEFAULT_VERIFIED_CATALOG.find(i => i.id === selectedInstId) || DEFAULT_VERIFIED_CATALOG[0]
  const currentProgram = currentInstitution.programs.find(p => p.id === selectedProgramId) || currentInstitution.programs[0]

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 20px', fontFamily: 'inherit' }}>
      {/* Top Banner Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isDemoMode ? 'rgba(199, 125, 147, 0.12)' : 'rgba(75, 16, 40, 0.08)',
        border: '1px solid var(--border-card)',
        borderRadius: 10,
        padding: '10px 16px',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: isDemoMode ? 'var(--muted-rose)' : 'var(--deep-maroon)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: 6,
            letterSpacing: '0.05em'
          }}>
            {isDemoMode ? 'SAMPLE DEMO DATA' : 'LIVE DATABASE'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
            {isDemoMode
              ? 'Reviewer Verification Queue (Demo Mode). Interactive registration requests and live catalog matching enabled.'
              : 'Connected to Supabase PostgreSQL institution verification queue.'}
          </span>
        </div>

        <button
          onClick={loadLiveQueue}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid var(--border-card)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh Queue
        </button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          <span /> TRUSTED REVIEWER & COLLEGE ADMINISTRATION
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark-merlot)', margin: '0 0 6px 0' }}>
          Student Registration Verification Queue
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Inspect self-declared student registrations, verify proof of enrollment, match against verified institutional catalogs, and maintain an immutable decision audit trail.
        </p>
      </div>

      {notice && (
        <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {error && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div
          onClick={() => setStatusFilter('all')}
          style={{
            background: statusFilter === 'all' ? 'var(--soft-cloud)' : '#fff',
            border: `1px solid ${statusFilter === 'all' ? 'var(--deep-maroon)' : 'var(--border-card)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>
            <span>TOTAL REQUESTS</span>
            <Building size={14} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark-merlot)', marginTop: 4 }}>
            {stats.total}
          </div>
          <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>All incoming submissions</small>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          style={{
            background: statusFilter === 'pending' ? 'var(--soft-cloud)' : '#fff',
            border: `1px solid ${statusFilter === 'pending' ? 'var(--deep-maroon)' : 'var(--border-card)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#B78103', fontSize: 11, fontWeight: 700 }}>
            <span>PENDING INITIAL REVIEW</span>
            <Clock size={14} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#B78103', marginTop: 4 }}>
            {stats.pending}
          </div>
          <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Awaiting reviewer inspection</small>
        </div>

        <div
          onClick={() => setStatusFilter('under_review')}
          style={{
            background: statusFilter === 'under_review' ? 'var(--soft-cloud)' : '#fff',
            border: `1px solid ${statusFilter === 'under_review' ? 'var(--deep-maroon)' : 'var(--border-card)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1565C0', fontSize: 11, fontWeight: 700 }}>
            <span>UNDER REVIEW</span>
            <Eye size={14} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1565C0', marginTop: 4 }}>
            {stats.under_review}
          </div>
          <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Assigned to reviewer</small>
        </div>

        <div
          onClick={() => setStatusFilter('needs_more_information')}
          style={{
            background: statusFilter === 'needs_more_information' ? 'var(--soft-cloud)' : '#fff',
            border: `1px solid ${statusFilter === 'needs_more_information' ? 'var(--deep-maroon)' : 'var(--border-card)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#E65100', fontSize: 11, fontWeight: 700 }}>
            <span>NEEDS CLARIFICATION</span>
            <HelpCircle size={14} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#E65100', marginTop: 4 }}>
            {stats.needs_info}
          </div>
          <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Waiting for student upload</small>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          style={{
            background: statusFilter === 'approved' ? 'var(--soft-cloud)' : '#fff',
            border: `1px solid ${statusFilter === 'approved' ? 'var(--deep-maroon)' : 'var(--border-card)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#2E7D32', fontSize: 11, fontWeight: 700 }}>
            <span>APPROVED & LINKED</span>
            <CheckCircle2 size={14} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2E7D32', marginTop: 4 }}>
            {stats.approved}
          </div>
          <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Verified catalog access granted</small>
        </div>

        <div
          onClick={() => setStatusFilter('rejected')}
          style={{
            background: statusFilter === 'rejected' ? 'var(--soft-cloud)' : '#fff',
            border: `1px solid ${statusFilter === 'rejected' ? 'var(--deep-maroon)' : 'var(--border-card)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#C62828', fontSize: 11, fontWeight: 700 }}>
            <span>REJECTED</span>
            <XCircle size={14} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#C62828', marginTop: 4 }}>
            {stats.rejected}
          </div>
          <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ineligible or invalid ID</small>
        </div>
      </div>

      {/* Main Review Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRequest ? '1fr 420px' : '1fr', gap: 20 }}>
        {/* Left: Queue Table & Filter Controls */}
        <div style={{ background: '#fff', border: '1px solid var(--border-card)', borderRadius: 12, padding: 20 }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by student name, roll #, email, or college..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card)',
                  fontSize: 12,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={13} style={{ color: 'var(--text-muted)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  background: '#fff'
                }}
              >
                <option value="all">All Statuses ({requests.length})</option>
                <option value="pending">Pending Review ({stats.pending})</option>
                <option value="under_review">Under Review ({stats.under_review})</option>
                <option value="needs_more_information">Needs Info ({stats.needs_info})</option>
                <option value="approved">Approved ({stats.approved})</option>
                <option value="rejected">Rejected ({stats.rejected})</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredRequests.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Building size={32} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px 0' }}>No registration requests found</h3>
              <p style={{ fontSize: 12, margin: 0 }}>Try adjusting your search criteria or filter options.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>STUDENT</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>CLAIMED INSTITUTION</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>PROGRAM & DEPT</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>STATUS</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>ID DOCUMENT</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => {
                    const isSelected = selectedRequest?.user_id === req.user_id
                    return (
                      <tr
                        key={req.user_id}
                        onClick={() => setSelectedRequest(req)}
                        style={{
                          borderBottom: '1px solid var(--border-card)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--soft-cloud)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--dark-merlot)' }}>{req.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Roll: {req.roll_number} · Year {req.current_study_year}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{req.institution_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Admitted: {req.admission_year}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div>{req.program_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.department_name}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              req.request_status === 'approved' ? '#E8F5E9' :
                              req.request_status === 'rejected' ? '#FFEBEE' :
                              req.request_status === 'needs_more_information' ? '#FFF3E0' :
                              req.request_status === 'under_review' ? '#E3F2FD' : '#FFFDE7',
                            color:
                              req.request_status === 'approved' ? '#2E7D32' :
                              req.request_status === 'rejected' ? '#C62828' :
                              req.request_status === 'needs_more_information' ? '#E65100' :
                              req.request_status === 'under_review' ? '#1565C0' : '#F57F17'
                          }}>
                            {req.request_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {req.document_storage_path ? (
                            <span style={{ color: 'var(--deep-maroon)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <FileText size={12} /> ID Proof Attached
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No Document</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRequest(req)
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-card)',
                              borderRadius: 6,
                              padding: '5px 10px',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: 'var(--deep-maroon)'
                            }}
                          >
                            Inspect <ChevronRight size={12} style={{ display: 'inline' }} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Request Details, ID Preview & Catalog Matching Panel */}
        {selectedRequest && (
          <div style={{
            background: '#fff',
            border: '1px solid var(--border-card)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-card)', paddingBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ fontSize: 9 }}>REQUEST DOSSIER</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark-merlot)', margin: '2px 0 0 0' }}>
                  {selectedRequest.full_name}
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedRequest.email}</span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Submission Claims */}
            <div style={{ background: 'var(--soft-cloud)', borderRadius: 8, padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--deep-maroon)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={13} /> Self-Declared Student Registration Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Roll / Student ID</span>
                  <div style={{ fontWeight: 600 }}>{selectedRequest.roll_number}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Admission Year</span>
                  <div style={{ fontWeight: 600 }}>{selectedRequest.admission_year} (Year {selectedRequest.current_study_year})</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Claimed Institution</span>
                  <div style={{ fontWeight: 600 }}>{selectedRequest.institution_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Claimed Program</span>
                  <div>{selectedRequest.program_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Claimed Department</span>
                  <div>{selectedRequest.department_name}</div>
                </div>
              </div>
            </div>

            {/* Supporting ID Document Verification */}
            <div style={{ border: '1px solid var(--border-card)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-merlot)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={13} /> Private Student ID Card Proof
              </div>
              {selectedRequest.document_storage_path ? (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                    Protected under private storage. Generates a temporary 60-second time-restricted authorization token.
                  </p>
                  <PrivateDocumentLink path={selectedRequest.document_storage_path} label="View Private Student ID (60s signed link)" />
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#C62828', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} /> No ID proof was submitted with this registration request.
                </div>
              )}
            </div>

            {/* Official Catalog Matching Dropdown */}
            <div style={{ border: '1px solid var(--baby-pink)', background: 'rgba(246, 200, 211, 0.1)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--deep-maroon)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={14} /> Match to Verified Catalog
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                Upon approval, this student profile will be bound to the selected verified institution catalog rows.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>INSTITUTION</label>
                  <select
                    value={selectedInstId}
                    onChange={(e) => setSelectedInstId(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-card)', fontSize: 11, background: '#fff' }}
                  >
                    {DEFAULT_VERIFIED_CATALOG.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>DEGREE PROGRAM</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-card)', fontSize: 11, background: '#fff' }}
                  >
                    {currentInstitution.programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>DEPARTMENT</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-card)', fontSize: 11, background: '#fff' }}
                  >
                    {currentProgram.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Reviewer Note Display (if previously reviewed) */}
            {selectedRequest.reviewer_note && (
              <div style={{ background: '#FFFDE7', border: '1px solid #FFF59D', borderRadius: 8, padding: 10, fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: '#F57F17' }}>Latest Reviewer Note:</span>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-primary)' }}>{selectedRequest.reviewer_note}</p>
              </div>
            )}

            {/* Review Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => handleOpenDecision('approved')}
                  style={{
                    background: '#2E7D32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <CheckCircle2 size={13} /> Approve & Match
                </button>

                <button
                  onClick={() => handleOpenDecision('under_review')}
                  style={{
                    background: '#1565C0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Eye size={13} /> Mark In Review
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => handleOpenDecision('needs_more_information')}
                  style={{
                    background: '#FFF3E0',
                    color: '#E65100',
                    border: '1px solid #FFE0B2',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <HelpCircle size={13} /> Request Info
                </button>

                <button
                  onClick={() => handleOpenDecision('rejected')}
                  style={{
                    background: '#FFEBEE',
                    color: '#C62828',
                    border: '1px solid #FFCDD2',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <XCircle size={13} /> Reject Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decision Modal / Confirmation Dialog */}
      {decisionModalOpen && selectedRequest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 480,
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark-merlot)', margin: '0 0 6px 0' }}>
              Confirm Review Decision
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              You are recording an administrative decision for <b>{selectedRequest.full_name}</b> ({selectedRequest.roll_number}).
            </p>

            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
              background:
                modalDecision === 'approved' ? '#E8F5E9' :
                modalDecision === 'rejected' ? '#FFEBEE' :
                modalDecision === 'needs_more_information' ? '#FFF3E0' : '#E3F2FD',
              color:
                modalDecision === 'approved' ? '#2E7D32' :
                modalDecision === 'rejected' ? '#C62828' :
                modalDecision === 'needs_more_information' ? '#E65100' : '#1565C0'
            }}>
              Decision Action: {modalDecision.toUpperCase().replace(/_/g, ' ')}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--dark-merlot)', marginBottom: 6 }}>
                {modalDecision === 'approved' ? 'Approval Notes (Optional)' : 'Required Reason / Guidance for Student'}
              </label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  modalDecision === 'rejected' ? 'State clear institutional reason for rejection...' :
                  modalDecision === 'needs_more_information' ? 'Explain what additional proof is needed (e.g., photo of fee receipt, college ID card)...' :
                  'Verified against department admission register.'
                }
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--border-card)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDecisionModalOpen(false)}
                disabled={decisionSubmitting}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-card)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={decisionSubmitting}
                style={{
                  background: 'var(--deep-maroon)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {decisionSubmitting ? 'Recording Decision...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immutable Verification Audit Trail Section */}
      <div style={{ marginTop: 32, background: '#fff', border: '1px solid var(--border-card)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark-merlot)', margin: '0 0 2px 0' }}>
              Verification Decision Audit Trail
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Immutable institutional record of reviewer approvals, rejections, notes, and catalog bindings.
            </p>
          </div>
          <span style={{ fontSize: 10, background: 'var(--soft-cloud)', padding: '4px 8px', borderRadius: 6, fontWeight: 700, color: 'var(--deep-maroon)' }}>
            AUDIT PROTECTED
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>TIMESTAMP</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>STUDENT</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>REVIEWER</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>STATUS TRANSITION</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>REVIEWER REASON / NOTES</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                  <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{entry.timestamp}</td>
                  <td style={{ padding: '10px', fontWeight: 700 }}>{entry.student_name}</td>
                  <td style={{ padding: '10px' }}>{entry.reviewer_id}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{entry.previous_status}</span>
                    <ArrowRight size={10} style={{ display: 'inline', margin: '0 4px' }} />
                    <span style={{
                      fontWeight: 700,
                      color:
                        entry.new_status === 'approved' ? '#2E7D32' :
                        entry.new_status === 'rejected' ? '#C62828' :
                        entry.new_status === 'needs_more_information' ? '#E65100' : '#1565C0'
                    }}>
                      {entry.new_status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-primary)' }}>{entry.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
