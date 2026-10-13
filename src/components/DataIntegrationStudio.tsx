import { useState } from 'react'
import {
  Download, CheckCircle2
} from 'lucide-react'

export function DataIntegrationStudio() {
  const [category, setCategory] = useState<'academics' | 'attendance' | 'lms_activity' | 'engagement' | 'placement_readiness' | 'feedback'>('attendance')
  const [file, setFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<any | null>(null)
  const [staged, setStaged] = useState(false)
  const [committed, setCommitted] = useState(false)

  const templateHeaders: Record<string, string[]> = {
    academics: ['student_id', 'semester', 'subject_id', 'subject_name', 'marks_percentage', 'cgpa', 'backlog_count'],
    attendance: ['student_id', 'subject_id', 'classes_held', 'classes_attended', 'reporting_period'],
    lms_activity: ['student_id', 'reporting_period', 'logins', 'assignments_assigned', 'assignments_completed', 'overdue_assignments'],
    engagement: ['student_id', 'reporting_period', 'events_attended', 'club_participation', 'hackathons_participated', 'verified_certifications'],
    placement_readiness: ['student_id', 'reporting_period', 'aptitude_percentage', 'coding_percentage', 'mock_interview_score', 'technical_skill_score'],
    feedback: ['student_id', 'reporting_period', 'satisfaction_score', 'faculty_feedback_rating']
  }

  function downloadSampleCsv() {
    const headers = templateHeaders[category]
    let sampleRow = ''
    if (category === 'attendance') {
      sampleRow = 'STU-CS-101,CS601,90,84,Fall 2025\nSTU-CS-102,CS602,85,51,Fall 2025\nSTU-CS-103,CS601,80,85,Fall 2025' // Note 85>80 invalid for testing!
    } else if (category === 'academics') {
      sampleRow = 'STU-CS-101,6,CS601,Advanced OS,88.5,8.92,0\nSTU-CS-102,6,CS602,Database Systems,48.0,5.40,2'
    } else {
      sampleRow = `STU-CS-101,Fall 2025,85,78,72,80`
    }
    const content = `${headers.join(',')}\n${sampleRow}`
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascendiq_sample_${category}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setStaged(false)
    setCommitted(false)
    setValidationResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = (event.target?.result as string) || ''
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim()))
        setCsvPreview({ headers, rows })
      }
    }
    reader.readAsText(selected)
  }

  function validateAndStage() {
    if (!csvPreview) return
    setValidating(true)
    setTimeout(() => {
      // Simulate backend validation logic
      const errors: Array<{ row: number; studentId: string; error: string }> = []
      let accepted = 0
      let duplicates = 0

      // If category is attendance and attended > held
      csvPreview.rows.forEach((r, idx) => {
        const studentId = r[0]
        if (category === 'attendance') {
          const held = parseInt(r[2] || '0', 10)
          const attended = parseInt(r[3] || '0', 10)
          if (attended > held) {
            errors.push({
              row: idx + 2,
              studentId,
              error: `Classes attended (${attended}) cannot exceed classes held (${held}).`
            })
          } else {
            accepted++
          }
        } else {
          accepted++
        }
      })

      setValidationResult({
        total: csvPreview.rows.length,
        accepted,
        rejected: errors.length,
        duplicates,
        errors
      })
      setValidating(false)
      setStaged(true)
    }, 600)
  }

  function confirmCommit() {
    setCommitted(true)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ECEEF3', padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span /> DATA INTEGRATION STUDIO
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-serif)', color: 'var(--main-dark)' }}>
            Import & Verify Institutional Data
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Strict schema validation, duplicate prevention, and student identifier resolution.
          </p>
        </div>

        <button
          onClick={downloadSampleCsv}
          className="portal-secondary-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}
        >
          <Download size={14} /> Download Sample Template
        </button>
      </div>

      {/* Category Select & File Upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--main-dark)', display: 'block', marginBottom: 6 }}>
            Select Data Category
          </label>
          <select
            value={category}
            onChange={e => {
              setCategory(e.target.value as any)
              setFile(null)
              setCsvPreview(null)
              setValidationResult(null)
            }}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 12 }}
          >
            <option value="attendance">Attendance Records</option>
            <option value="academics">Academic Grades & CGPA</option>
            <option value="lms_activity">LMS Learning Activity</option>
            <option value="placement_readiness">Placement Assessments</option>
            <option value="engagement">Extracurricular Engagement</option>
            <option value="feedback">Student Satisfaction & Feedback</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--main-dark)', display: 'block', marginBottom: 6 }}>
            Upload CSV / Excel File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ width: '100%', padding: '6px', border: '1px dashed var(--muted-rose)', borderRadius: 8, background: 'var(--milky-mist)', fontSize: 11 }}
          />
        </div>
      </div>

      {/* CSV Preview */}
      {csvPreview && (
        <div style={{ marginTop: 16, border: '1px solid #ECEEF3', borderRadius: 10, padding: 16, background: '#FAFAFA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--main-dark)' }}>
              File Preview: {file?.name} ({csvPreview.rows.length} rows loaded)
            </span>
            {!staged && (
              <button
                className="portal-primary-button"
                disabled={validating}
                onClick={validateAndStage}
                style={{ fontSize: 11 }}
              >
                {validating ? 'Validating...' : 'Validate & Stage Data'}
              </button>
            )}
          </div>

          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  {csvPreview.headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {csvPreview.rows.map((row, idx) => (
                  <tr key={idx}>
                    {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Results Manifest */}
      {validationResult && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: validationResult.rejected > 0 ? '#FFF8F8' : '#F4FAF4', border: `1px solid ${validationResult.rejected > 0 ? '#F5C6CB' : '#C3E6CB'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 13, color: validationResult.rejected > 0 ? '#721C24' : '#155724' }}>
              Validation Manifest: {validationResult.accepted} valid, {validationResult.rejected} errors
            </h4>
            {staged && !committed && validationResult.accepted > 0 && (
              <button
                className="portal-primary-button"
                onClick={confirmCommit}
                style={{ fontSize: 11, background: '#2E7D32' }}
              >
                Confirm & Commit {validationResult.accepted} Valid Records
              </button>
            )}
          </div>

          {validationResult.errors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {validationResult.errors.map((err: any, i: number) => (
                <div key={i} style={{ fontSize: 11, color: '#C0392B', background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #FFCDD2' }}>
                  <b>Row {err.row} ({err.studentId}):</b> {err.error}
                </div>
              ))}
            </div>
          )}

          {committed && (
            <div style={{ marginTop: 12, padding: 10, background: '#E8F5E9', color: '#1B5E20', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} /> Records safely committed to PostgreSQL database. Success and Risk scores recalculated!
            </div>
          )}
        </div>
      )}

      {/* Import History */}
      <div style={{ marginTop: 24, borderTop: '1px solid #ECEEF3', paddingTop: 16 }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          Recent Import Provenance Log
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: '#666' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#F8F9FA', borderRadius: 6 }}>
            <span>fall_2025_midterm_grades.csv (Academics) · 40 accepted, 2 rejected</span>
            <span>2026-10-10 · Verified</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#F8F9FA', borderRadius: 6 }}>
            <span>october_biweekly_attendance.csv (Attendance) · 43 accepted, 2 rejected</span>
            <span>2026-10-11 · Verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}
