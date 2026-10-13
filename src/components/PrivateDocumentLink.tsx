import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function PrivateDocumentLink({ path, label = 'Open ID proof' }: { path: string; label?: string }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function requestLink() {
    if (!supabase) return
    setBusy(true); setError('')
    const { data, error: linkError } = await supabase.storage.from('student-verifications').createSignedUrl(path, 60)
    if (linkError) setError('You are not authorized to open this private document, or it is no longer available.')
    else setUrl(data.signedUrl)
    setBusy(false)
  }
  return <span className="private-document-link">{url
    ? <a href={url} target="_blank" rel="noopener noreferrer">Open secure link (60 sec)</a>
    : <button type="button" disabled={busy} onClick={() => void requestLink()}>{busy ? 'Preparing link…' : label}</button>}
    {error && <small role="alert">{error}</small>}
  </span>
}
