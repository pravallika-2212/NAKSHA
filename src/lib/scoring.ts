export type ScoreComponent = { value:number|null; weight:number; period_days:number; normalization:string }
export type CalculatedIndicator = { score:number|null; status:'available'|'provisional'|'insufficient_data'; coverage:number; contributions:Record<string,number|null> }
export const defaultSuccessWeights = { academic:40, attendance:25, lms:15, skills:10, engagement:10 }
export const defaultReadinessWeights = { skills:60, assessment:40 }

export function calculateWeightedIndicator(values:Record<string,number|null|undefined>,weights:Record<string,number>,minimumCoverage=60):CalculatedIndicator{
  const totalWeight=Object.values(weights).reduce((a,b)=>a+b,0)
  const available=Object.entries(weights).filter(([key,w])=>w>0&&values[key]!==null&&values[key]!==undefined&&Number.isFinite(values[key]))
  const availableWeight=available.reduce((a,[,w])=>a+w,0)
  const coverage=totalWeight?Math.round(availableWeight/totalWeight*10000)/100:0
  const score=availableWeight&&coverage>=minimumCoverage?Math.round(available.reduce((sum,[key,w])=>sum+(values[key] as number)*w,0)/availableWeight*100)/100:null
  const status:CalculatedIndicator['status']=coverage<minimumCoverage?'insufficient_data':availableWeight<totalWeight?'provisional':'available'
  return {score,status,coverage,contributions:Object.fromEntries(Object.keys(weights).map(key=>{
    const value=values[key];const weight=weights[key]??0
    return [key,value==null||!availableWeight||coverage<minimumCoverage?null:Math.round(value*weight/availableWeight*100)/100]
  }))}
}

export function successRiskFlags(input:{academic:number|null;attendance:number|null;engagementDropPercent:number|null;skill:number|null;coverage:number;thresholds?:Partial<Record<'academicLow'|'attendanceLow'|'engagementDropPercent'|'skillGap'|'minimumCoverage',number>>}){
  const t={academicLow:50,attendanceLow:75,engagementDropPercent:20,skillGap:60,minimumCoverage:60,...input.thresholds}
  const flags:{key:string;evidence:number|string;threshold:number;period:string}[]=[]
  if(input.coverage<t.minimumCoverage)flags.push({key:'insufficient_data',evidence:input.coverage,threshold:t.minimumCoverage,period:'current calculation coverage'})
  if(input.academic!==null&&input.academic<t.academicLow)flags.push({key:'academic_support',evidence:input.academic,threshold:t.academicLow,period:'configured academic lookback'})
  if(input.attendance!==null&&input.attendance<t.attendanceLow)flags.push({key:'attendance_support',evidence:input.attendance,threshold:t.attendanceLow,period:'configured attendance lookback'})
  if(input.engagementDropPercent!==null&&input.engagementDropPercent>=t.engagementDropPercent)flags.push({key:'engagement_decline',evidence:input.engagementDropPercent,threshold:t.engagementDropPercent,period:'latest 30 days vs previous 30 days'})
  if(input.skill!==null&&input.skill<t.skillGap)flags.push({key:'skill_development',evidence:input.skill,threshold:t.skillGap,period:'configured skill lookback'})
  return flags
}

export function classifySegment(input:{academic:number|null;engagement:number|null;skill:number|null;readiness:number|null;readinessStatus?:'available'|'provisional'|'insufficient_data';coverage:number;previousAcademic?:number|null;thresholds?:Partial<Record<'minimumCoverage'|'academicLow'|'highEngagementAcademicLow'|'academicStrong'|'readinessStrong'|'readinessLow'|'skillGap'|'academicImprovementPoints',number>>}){
  const t={minimumCoverage:60,academicLow:50,highEngagementAcademicLow:55,academicStrong:70,readinessStrong:70,readinessLow:50,skillGap:60,academicImprovementPoints:5,...input.thresholds}
  if(input.coverage<t.minimumCoverage)return 'insufficient_data'
  if(input.academic!==null&&input.academic<t.highEngagementAcademicLow&&input.engagement!==null&&input.engagement>=70)return 'high_engagement_academic_support'
  if(input.academic!==null&&input.academic>=t.academicStrong&&input.readinessStatus==='available'&&input.readiness!==null&&input.readiness>=t.readinessStrong)return 'strong_academics_and_placement_readiness'
  if(input.academic!==null&&input.academic>=t.academicStrong&&input.readinessStatus==='available'&&input.readiness!==null&&input.readiness<t.readinessLow)return 'strong_academics_needs_placement_preparation'
  if(input.academic!==null&&input.academic<t.academicLow)return 'academic_support_may_help'
  if(input.readiness!==null&&input.readiness<t.readinessLow)return 'placement_preparation_may_help'
  if(input.skill!==null&&input.skill<t.skillGap)return 'skills_development_may_help'
  if(input.academic!==null&&input.previousAcademic!=null&&input.academic>input.previousAcademic+t.academicImprovementPoints)return 'improving_academics'
  return 'developing'
}
