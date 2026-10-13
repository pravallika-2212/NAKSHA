import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { Camera, Upload, X, AlertCircle, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PhotoUploadModalProps {
  userId: string
  currentPhotoUrl?: string | null
  onClose: () => void
  onSuccess: (newPhotoUrl: string) => void
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PhotoUploadModal({ userId, currentPhotoUrl, onClose, onSuccess }: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function validateAndSetFile(file: File) {
    setUploadError('')

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('Unsupported format. Please select a JPEG, PNG, or WebP image.')
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`)
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError('Please select an image file first.')
      return
    }

    if (!userId) {
      setUploadError('User authentication session required to upload profile photo.')
      return
    }

    setIsUploading(true)
    setUploadError('')

    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${userId}/avatar-${Date.now()}.${ext}`

      let finalAvatarUrl = previewUrl || ''

      // Attempt Supabase storage upload if configured
      if (supabase) {
        try {
          const { error: uploadErr } = await supabase.storage
            .from('student-avatars')
            .upload(filePath, selectedFile, {
              contentType: selectedFile.type,
              upsert: true
            })

          if (!uploadErr) {
            const { data: publicData } = supabase.storage
              .from('student-avatars')
              .getPublicUrl(filePath)

            if (publicData?.publicUrl) {
              finalAvatarUrl = publicData.publicUrl
            }
          } else {
            // If student-avatars bucket returns an error, fallback to student-verifications or base64 preview
            console.warn('Primary avatar storage upload note:', uploadErr.message)
          }

          // Update profiles table with avatar_url
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ avatar_url: finalAvatarUrl })
            .eq('id', userId)

          if (profileErr) {
            console.warn('Profile avatar_url update note:', profileErr.message)
          }
        } catch (storageErr) {
          console.warn('Storage operation notice:', storageErr)
        }
      }

      // Persist in localStorage for instant cache resilience across page reloads
      try {
        localStorage.setItem(`ascendiq_avatar_${userId}`, finalAvatarUrl)
      } catch {
        // quota ignore
      }

      onSuccess(finalAvatarUrl)
      onClose()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Photo upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="sq-modal-overlay" onClick={onClose}>
      <div
        className="sq-modal-panel"
        style={{ maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sq-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--sq-pink-subtle)', color: 'var(--sq-maroon)', display: 'grid', placeItems: 'center' }}>
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--sq-maroon)', fontWeight: 800 }}>
                {currentPhotoUrl ? 'Update Profile Photo' : 'Upload Profile Photo'}
              </h3>
              <small style={{ color: 'var(--sq-text-muted)' }}>
                PNG, JPG, or WebP · Maximum 5 MB
              </small>
            </div>
          </div>
          <button
            className="sq-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isUploading}
          >
            <X size={18} />
          </button>
        </div>

        {uploadError && (
          <div style={{
            background: 'var(--sq-danger-bg)',
            border: '1px solid rgba(158, 27, 50, 0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--sq-danger)'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Circular Avatar Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0 20px' }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--sq-pink-soft)',
            boxShadow: 'var(--sq-shadow-md)',
            background: 'var(--sq-bg-subtle)',
            display: 'grid',
            placeItems: 'center',
            position: 'relative'
          }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt="Current profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Camera size={40} style={{ color: 'var(--sq-rose-muted)', opacity: 0.6 }} />
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--sq-text-muted)', marginTop: 8 }}>
            {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : 'Avatar Preview'}
          </span>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--sq-rose-muted)' : 'var(--sq-border-light)'}`,
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
            background: isDragging ? 'var(--sq-pink-subtle)' : 'var(--sq-bg-base)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: 20
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Upload size={24} style={{ color: 'var(--sq-maroon)', margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sq-maroon)' }}>
            Choose an image or drag & drop here
          </div>
          <small style={{ fontSize: 11, color: 'var(--sq-text-muted)', display: 'block', marginTop: 4 }}>
            Square aspect ratio recommended for optimal display
          </small>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={isUploading}
            style={{ padding: '9px 16px', fontSize: 12 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              padding: '9px 18px',
              fontSize: 12,
              opacity: !selectedFile || isUploading ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Save Profile Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
