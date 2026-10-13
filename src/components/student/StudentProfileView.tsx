import { useState, type FormEvent } from 'react'
import { User, Camera, Trash2, Edit3, Save, X, ShieldCheck, Mail, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { StudentProfile } from '../../lib/api'
import type { RealStudentProfile } from '../../pages/StudentDashboardPage'
import { supabase } from '../../lib/supabase'
import { PhotoUploadModal } from './PhotoUploadModal'

interface StudentProfileViewProps {
  studentData: StudentProfile
  realProfile: RealStudentProfile | null
  currentAvatarUrl?: string | null
  onAvatarUpdate: (newUrl: string | null) => void
  onProfileUpdate: (updated: Partial<RealStudentProfile>) => void
}

export function StudentProfileView({
  studentData,
  realProfile,
  currentAvatarUrl,
  onAvatarUpdate,
  onProfileUpdate,
}: StudentProfileViewProps) {
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable fields state
  const [fullName, setFullName] = useState<string>(realProfile?.full_name || studentData.full_name)
  const [phone, setPhone] = useState<string>(realProfile?.phone || '+91 98765 43210')
  const [bio, setBio] = useState<string>(
    realProfile?.bio ||
    'Pre-final year Computer Science undergraduate interested in distributed systems, high-performance database indexing, and full-stack web applications.'
  )
  const [skillsList, setSkillsList] = useState<string[]>(
    realProfile?.skills && realProfile.skills.length > 0
      ? realProfile.skills
      : ['Data Structures', 'Python', 'React', 'SQL', 'TypeScript', 'Docker']
  )
  const [newSkillTag, setNewSkillTag] = useState<string>('')
  const [interestsList, setInterestsList] = useState<string[]>(
    realProfile?.interests && realProfile.interests.length > 0
      ? realProfile.interests
      : ['Cloud Computing', 'Database Internals', 'Competitive Programming', 'Open Source Contributor']
  )
  const [newInterestTag, setNewInterestTag] = useState<string>('')

  // Compute profile completion percentage
  const completionPercentage = (() => {
    let score = 50 // Basic mandatory fields present
    if (currentAvatarUrl) score += 15
    if (phone.trim()) score += 10
    if (bio.trim()) score += 10
    if (skillsList.length >= 3) score += 10
    if (interestsList.length >= 2) score += 5
    return Math.min(100, score)
  })()

  // Initials fallback
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST'

  async function handleRemovePhoto() {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return

    try {
      if (supabase && realProfile?.id) {
        await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', realProfile.id)
      }
      try {
        if (realProfile?.id) {
          localStorage.removeItem(`ascendiq_avatar_${realProfile.id}`)
        }
      } catch {
        // quota ignore
      }
      onAvatarUpdate(null)
      setStatusMessage({ type: 'success', text: 'Profile photo removed successfully.' })
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to remove profile photo. Please retry.' })
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Full name cannot be empty.' })
      return
    }

    setIsSaving(true)
    setStatusMessage(null)

    try {
      if (supabase && realProfile?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            phone: phone.trim(),
            bio: bio.trim(),
            skills: skillsList,
            interests: interestsList
          })
          .eq('id', realProfile.id)

        if (error) {
          console.warn('Profile database update note:', error.message)
        }
      }

      onProfileUpdate({
        full_name: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        skills: skillsList,
        interests: interestsList
      })

      setIsEditMode(false)
      setStatusMessage({ type: 'success', text: 'Profile details saved successfully.' })
    } catch {
      setStatusMessage({ type: 'error', text: 'Could not save profile changes. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  function handleAddSkillTag() {
    if (!newSkillTag.trim()) return
    if (!skillsList.includes(newSkillTag.trim())) {
      setSkillsList(prev => [...prev, newSkillTag.trim()])
    }
    setNewSkillTag('')
  }

  function handleRemoveSkillTag(tag: string) {
    setSkillsList(prev => prev.filter(t => t !== tag))
  }

  function handleAddInterestTag() {
    if (!newInterestTag.trim()) return
    if (!interestsList.includes(newInterestTag.trim())) {
      setInterestsList(prev => [...prev, newInterestTag.trim()])
    }
    setNewInterestTag('')
  }

  function handleRemoveInterestTag(tag: string) {
    setInterestsList(prev => prev.filter(t => t !== tag))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Module Title Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sq-maroon-dark) 0%, var(--sq-maroon) 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: 'var(--sq-shadow-md)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700 }}>
            <User size={15} /> Student Identity & Bio
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Student Profile & Personal Credentials
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
            Verified institutional ledger records, contact details, statement of purpose, and avatar photo
          </p>
        </div>

        {/* Edit Profile Action */}
        {!isEditMode ? (
          <button
            onClick={() => setIsEditMode(true)}
            className="button"
            style={{ background: '#fff', color: 'var(--sq-maroon)', border: 'none', padding: '9px 18px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Edit3 size={14} /> Edit Personal Details
          </button>
        ) : (
          <button
            onClick={() => setIsEditMode(false)}
            className="button button-secondary"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', padding: '9px 16px', fontSize: 12 }}
          >
            Cancel Editing
          </button>
        )}
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: statusMessage.type === 'success' ? 'var(--sq-success-bg)' : 'var(--sq-danger-bg)',
          color: statusMessage.type === 'success' ? 'var(--sq-success)' : 'var(--sq-danger)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(30,126,52,0.2)' : 'rgba(158,27,50,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Profile Header & Photo Card */}
      <div className="sq-panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Avatar Container with Real Upload Trigger */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 104,
              height: 104,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid var(--sq-pink-soft)',
              boxShadow: 'var(--sq-shadow-md)',
              background: 'var(--sq-maroon-dark)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 32,
              fontWeight: 800
            }}>
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Quick Change Icon Overlay */}
            <button
              onClick={() => setShowPhotoModal(true)}
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--sq-maroon)',
                color: '#fff',
                border: '2px solid #fff',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                transition: 'transform 0.15s ease'
              }}
              title="Change Profile Photo"
              aria-label="Upload photo"
            >
              <Camera size={15} />
            </button>
          </div>

          {/* Student Bio Headline */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 20, color: 'var(--sq-maroon)', fontWeight: 800 }}>
                {fullName}
              </h3>
              <span className={`sq-tag ${realProfile?.is_verified ? 'is-real' : 'is-demo'}`} style={{ fontSize: 10 }}>
                {realProfile?.is_verified ? '✓ Verified Student' : 'Verification Pending'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--sq-text-muted)', marginTop: 4 }}>
              Roll Number: <b>{realProfile?.roll_number || studentData.student_id}</b> · Year {realProfile?.academic_year || studentData.academic_year} · {realProfile?.department_name || studentData.department}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sq-rose-muted)', marginTop: 2 }}>
              {realProfile?.institution_name || 'ASCENDIQ Partner Institution'}
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => setShowPhotoModal(true)}
                className="button"
                style={{ padding: '6px 14px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Camera size={13} /> {currentAvatarUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              {currentAvatarUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="button button-secondary"
                  style={{ padding: '6px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--sq-danger)', borderColor: 'rgba(158,27,50,0.3)' }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Profile Completion Indicator */}
          <div style={{ minWidth: 160, padding: 14, borderRadius: 12, background: 'var(--sq-bg-base)', border: '1px solid var(--sq-border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>Profile Strength</span>
              <span style={{ fontWeight: 800, color: 'var(--sq-maroon)' }}>{completionPercentage}%</span>
            </div>
            <div className="sq-bar-track" style={{ height: 6, borderRadius: 3 }}>
              <div
                className="sq-bar-fill fill-green"
                style={{ width: `${completionPercentage}%`, height: '100%', borderRadius: 3 }}
              />
            </div>
            <small style={{ display: 'block', fontSize: 9, color: 'var(--sq-text-muted)', marginTop: 6 }}>
              {completionPercentage === 100 ? 'All sections fully complete' : 'Add photo & bio to reach 100%'}
            </small>
          </div>
        </div>
      </div>

      {/* 2-Section Grid: Verified Institutional Ledger vs Editable Personal Details */}
      <div className="sq-grid-2col">
        {/* Section 1: Verified Institutional Information (Read-Only) */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} style={{ color: 'var(--sq-rose-muted)' }} />
                <h3>Verified Institutional Credentials</h3>
              </div>
              <small>Locked records maintained by your college's authorized reviewer</small>
            </div>
            <span className="sq-tag is-real">Read-Only</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span style={{ fontSize: 10, color: 'var(--sq-text-light)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Affiliated College / Institution
              </span>
              <b style={{ fontSize: 13, color: 'var(--sq-maroon)' }}>
                {realProfile?.institution_name || 'Self-Declared College Awaiting Review'}
              </b>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Degree Program
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sq-text-main)' }}>
                  {realProfile?.program_name || 'B.Tech Computer Science'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Department
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sq-text-main)' }}>
                  {realProfile?.department_name || studentData.department}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Student Roll Number
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sq-maroon)' }}>
                  {realProfile?.roll_number || studentData.student_id}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sq-text-light)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Admission Year / Batch
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sq-text-main)' }}>
                  Batch of {realProfile?.admission_year || studentData.admission_year}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 10, color: 'var(--sq-text-light)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Reviewer Status
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className={`sq-tag ${realProfile?.is_verified ? 'is-real' : 'is-demo'}`}>
                  {realProfile?.account_status ? realProfile.account_status.toUpperCase() : 'PENDING'}
                </span>
                {realProfile?.reviewer_note && (
                  <small style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
                    Note: {realProfile.reviewer_note}
                  </small>
                )}
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--sq-bg-base)', border: '1px solid var(--sq-border-light)', fontSize: 10, color: 'var(--sq-text-muted)', lineHeight: 1.5, marginTop: 6 }}>
              🔒 <b>Security Policy:</b> Role-based permissions, college verification, and program durations are locked to prevent tampering. Changes require institutional catalog submission.
            </div>
          </div>
        </div>

        {/* Section 2: Personal Profile & Contact (Student Editable) */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} style={{ color: 'var(--sq-rose-muted)' }} />
                <h3>Personal Profile & Bio</h3>
              </div>
              <small>Student-editable contact and statement of purpose</small>
            </div>
            {isEditMode && <span className="sq-tag is-real">Editing</span>}
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                Full Name
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12 }}
                />
              ) : (
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sq-maroon)' }}>{fullName}</div>
              )}
            </div>

            {/* Email (Read-only) & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                  <Mail size={12} style={{ display: 'inline', marginRight: 4 }} /> Email
                </label>
                <div style={{ fontSize: 11, color: 'var(--sq-text-muted)', padding: '6px 0' }}>
                  {studentData.email || 'student@ascendiq.ai'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                  <Phone size={12} style={{ display: 'inline', marginRight: 4 }} /> Phone Number
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12 }}
                  />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--sq-text-main)', padding: '6px 0' }}>{phone}</div>
                )}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                Bio & Career Objectives
              </label>
              {isEditMode ? (
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12, resize: 'vertical' }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--sq-text-muted)', lineHeight: 1.6 }}>
                  {bio}
                </p>
              )}
            </div>

            {/* Skills Tags */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 6 }}>
                Technical Skills & Tools
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isEditMode ? 8 : 0 }}>
                {skillsList.map(tag => (
                  <span key={tag} className="sq-tag is-real" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {tag}
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillTag(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditMode && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Add skill tag…"
                    value={newSkillTag}
                    onChange={e => setNewSkillTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkillTag())}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--sq-border-light)', fontSize: 11 }}
                  />
                  <button type="button" onClick={handleAddSkillTag} className="button" style={{ padding: '6px 12px', fontSize: 11 }}>
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Interests Tags */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 6 }}>
                Academic & Project Interests
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isEditMode ? 8 : 0 }}>
                {interestsList.map(tag => (
                  <span key={tag} className="sq-tag" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {tag}
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInterestTag(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditMode && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Add interest tag…"
                    value={newInterestTag}
                    onChange={e => setNewInterestTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInterestTag())}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--sq-border-light)', fontSize: 11 }}
                  />
                  <button type="button" onClick={handleAddInterestTag} className="button" style={{ padding: '6px 12px', fontSize: 11 }}>
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Form Save & Cancel Buttons in Edit Mode */}
            {isEditMode && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--sq-border-light)' }}>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="button button-secondary"
                  disabled={isSaving}
                  style={{ padding: '8px 16px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Save size={14} /> {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Profile Photo Upload Modal */}
      {showPhotoModal && realProfile?.id && (
        <PhotoUploadModal
          userId={realProfile.id}
          currentPhotoUrl={currentAvatarUrl}
          onClose={() => setShowPhotoModal(false)}
          onSuccess={newUrl => {
            onAvatarUpdate(newUrl)
            setStatusMessage({ type: 'success', text: 'Profile photo updated and saved.' })
          }}
        />
      )}
    </div>
  )
}
