import { useEffect, useState } from 'react'
import { Activity, CircleAlert, Sparkles } from 'lucide-react'
import { readableAuthError, supabase } from '../lib/supabase'

export function ScoreCalculationControl({institutionId}:{institutionId:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('')
 async function run(){if(!supabase||!institutionId)return;setBusy(true);setError('');setMessage('');const {data,error:e}=await supabase.rpc('phase5_run_scoring',{p_institution_id:institutionId});if(e)setError('Score calculation failed. Confirm migration 005, an active scoring configuration, and reviewer/admin access.');else{const result=data as {students_calculated:number;version:number;snapshots_created:number};setMessage(`Created ${result.snapshots_created} immutable snapshots for ${result.students_calculated} approved students using method v${result.version}.`)}setBusy(false)}
 return <div className="phase5-calculate"><button className="portal-secondary-button" disabled={busy||!institutionId} onClick={()=>void run()}><Sparkles size={16}/>{busy?'Calculating…':'Calculate score snapshots'}</button><p className="portal-muted">Calculates separate Student Success and Placement Readiness snapshots for approved students at this institution. Running again adds history; it does not rewrite prior calculations.</p>{error&&<p className="portal-inline-error" role="alert"><CircleAlert size={15}/>{error}</p>}{message&&<p className="portal-inline-success" role="status"><Activity size={15}/>{message}</p>}</div>
}

type PlacementBand={band:string;students:number}
export function PlacementReadinessOverview({institutionId}:{institutionId:string}){
 const [bands,setBands]=useState<PlacementBand[]>([]);const [error,setError]=useState('')
 useEffect(()=>{if(!supabase||!institutionId)return;let cancelled=false;supabase.rpc('phase5_placement_overview',{p_institution_id:institutionId}).then(({data,error:e})=>{if(cancelled)return;if(e)setError('Readiness overview is unavailable. A trusted reviewer must apply migration 005 and calculate snapshots.');else setBands((data??[]) as PlacementBand[])});return()=>{cancelled=true}},[institutionId])
 return <section className="portal-panel phase5-readiness-overview"><h2>Placement readiness evidence</h2><p className="portal-muted">Counts of latest rule-based readiness snapshots. These bands are not employer eligibility decisions.</p>{error?<p className="portal-inline-error" role="alert">{error}</p>:bands.length?<div className="portal-metric-grid portal-grid-three">{bands.map(b=><article className="portal-metric" key={b.band}><span className="portal-metric-label">{b.band.replace(/_/g,' ')}</span><b>{b.students}</b><small>students with latest snapshots</small></article>)}</div>:<p className="portal-muted">No placement readiness snapshots yet.</p>}</section>
}

type StudentSupportRow={id:string;concern:string;recommended_action:string;due_date:string|null;status:string;student_visible_summary:string;follow_up_date:string|null;created_at:string;updated_at:string}
export function StudentSupport(){
 const [rows,setRows]=useState<StudentSupportRow[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true)
 useEffect(()=>{if(!supabase){setLoading(false);return};let cancelled=false;supabase.rpc('phase5_my_interventions').then(({data,error:e})=>{if(cancelled)return;if(e)setError('Your support information is not available yet.');else setRows((data??[]) as StudentSupportRow[]);setLoading(false)});return()=>{cancelled=true}},[])
 return <section className="portal-panel phase5-student-support"><h2>Support and follow-up</h2>{loading?<p className="portal-muted">Loading…</p>:error?<p className="portal-inline-error" role="alert">{readableAuthError(error)}</p>:rows.length?<div className="phase5-support-list">{rows.map(r=><article key={r.id}><div><span className={`portal-status-pill status-${r.status}`}>{r.status.replace(/_/g,' ')}</span><small>{r.due_date?`Due ${new Date(r.due_date+'T00:00:00').toLocaleDateString()}`:'No due date'}{r.follow_up_date?` · Follow-up ${new Date(r.follow_up_date+'T00:00:00').toLocaleDateString()}`:''}</small></div><h3>{r.concern}</h3><p>{r.student_visible_summary}</p><p><b>Recommended action:</b> {r.recommended_action}</p></article>)}</div>:<p className="portal-muted">No support actions have been shared with you yet.</p>}</section>
}
