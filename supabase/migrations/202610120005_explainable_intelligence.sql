-- Phase 5: transparent, versioned student indicators and assigned interventions.
-- Requires Phase 4 (004). Additive; snapshots are immutable history.
begin;

create table if not exists public.phase5_scoring_configs (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  version integer not null check(version > 0),
  is_active boolean not null default true,
  success_weights jsonb not null default '{"academic":40,"attendance":25,"lms":15,"skills":10,"engagement":10}'::jsonb,
  readiness_weights jsonb not null default '{"skills":60,"assessment":40}'::jsonb,
  thresholds jsonb not null default '{"minimum_coverage":60,"academic_low":50,"attendance_low":75,"skill_gap":60,"engagement_drop_percent":20,"academic_improvement_points":5,"high_engagement_academic_low":55,"segment_academic_strong":70,"segment_readiness_strong":70,"segment_readiness_low":50}'::jsonb,
  engagement_metric_names text[] not null default array[]::text[],
  algorithm_version text not null default 'phase5-prototype-v1',
  lms_reference_minutes integer not null default 600 check(lms_reference_minutes > 0),
  academic_lookback_days integer not null default 365 check(academic_lookback_days > 0),
  attendance_lookback_days integer not null default 90 check(attendance_lookback_days > 0),
  engagement_lookback_days integer not null default 90 check(engagement_lookback_days > 0),
  skill_lookback_days integer not null default 180 check(skill_lookback_days > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  primary key(institution_id,version),
  check(jsonb_typeof(success_weights)='object' and jsonb_typeof(readiness_weights)='object' and jsonb_typeof(thresholds)='object')
);
create unique index if not exists phase5_one_active_config_per_institution on public.phase5_scoring_configs(institution_id) where is_active;

create table if not exists public.phase5_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  score_type text not null check(score_type in ('student_success','placement_readiness')),
  score numeric(5,2) check(score is null or score between 0 and 100),
  score_status text not null check(score_status in ('available','provisional','insufficient_data')),
  data_coverage numeric(5,2) not null check(data_coverage between 0 and 100),
  minimum_coverage numeric(5,2) not null check(minimum_coverage between 1 and 100),
  components jsonb not null check(jsonb_typeof(components)='object'),
  risk_flags jsonb not null default '[]'::jsonb check(jsonb_typeof(risk_flags)='array'),
  segment_key text not null,
  segment_reasons jsonb not null default '[]'::jsonb check(jsonb_typeof(segment_reasons)='array'),
  calculation_version integer not null,
  algorithm_version text not null,
  reporting_cutoff date not null,
  calculated_at timestamptz not null default now(),
  foreign key(institution_id,student_profile_id) references public.profiles(institution_id,id) on delete cascade,
  foreign key(institution_id,calculation_version) references public.phase5_scoring_configs(institution_id,version)
);
create index if not exists phase5_snapshots_latest_student on public.phase5_score_snapshots(institution_id,student_profile_id,score_type,calculated_at desc);
create index if not exists phase5_snapshots_institution_type on public.phase5_score_snapshots(institution_id,score_type,calculated_at desc);

create table if not exists public.phase5_interventions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  created_by uuid not null references auth.users(id),
  assigned_mentor uuid not null references auth.users(id),
  concern text not null check(length(trim(concern)) between 1 and 160),
  evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),
  recommended_action text not null check(length(trim(recommended_action)) between 1 and 2000),
  due_date date,
  status text not null default 'open' check(status in ('open','in_progress','completed','cancelled')),
  student_visible_summary text not null check(length(trim(student_visible_summary)) between 1 and 1200),
  private_notes text check(private_notes is null or length(private_notes)<=4000),
  follow_up_date date,
  outcome text check(outcome is null or length(outcome)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(institution_id,student_profile_id) references public.profiles(institution_id,id) on delete cascade
);
create index if not exists phase5_interventions_student on public.phase5_interventions(institution_id,student_profile_id,status,due_date);
create index if not exists phase5_interventions_mentor on public.phase5_interventions(institution_id,assigned_mentor,status,due_date);

create table if not exists public.phase5_intervention_audit (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.phase5_interventions(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  changed_by uuid not null references auth.users(id),
  action text not null check(action in ('created','updated')),
  before_state jsonb,
  after_state jsonb not null,
  changed_at timestamptz not null default now()
);
create index if not exists phase5_intervention_audit_history on public.phase5_intervention_audit(intervention_id,changed_at desc);

-- Create a version-1 default for existing and future institutions. Adjustments are trusted SQL operations.
insert into public.phase5_scoring_configs(institution_id,version)
select i.id,1 from public.institutions i on conflict(institution_id,version) do nothing;
create or replace function public.phase5_seed_config_for_institution()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.phase5_scoring_configs(institution_id,version) values(new.id,1) on conflict do nothing;
  return new;
end $$;
drop trigger if exists phase5_seed_config_after_institution on public.institutions;
create trigger phase5_seed_config_after_institution after insert on public.institutions
for each row execute function public.phase5_seed_config_for_institution();
revoke all on function public.phase5_seed_config_for_institution() from public,anon,authenticated;

alter table public.phase5_scoring_configs enable row level security;
alter table public.phase5_score_snapshots enable row level security;
alter table public.phase5_interventions enable row level security;
alter table public.phase5_intervention_audit enable row level security;
revoke all on public.phase5_scoring_configs,public.phase5_score_snapshots,public.phase5_interventions,public.phase5_intervention_audit from anon,authenticated;
grant select on public.phase5_scoring_configs,public.phase5_score_snapshots,public.phase5_interventions,public.phase5_intervention_audit to authenticated;
drop policy if exists phase5_config_read on public.phase5_scoring_configs;
create policy phase5_config_read on public.phase5_scoring_configs for select to authenticated using(
  public.phase4_member(institution_id,array['admin','reviewer','faculty','placement_officer']::text[])
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.institution_id=phase5_scoring_configs.institution_id));
drop policy if exists phase5_snapshots_read on public.phase5_score_snapshots;
create policy phase5_snapshots_read on public.phase5_score_snapshots for select to authenticated using(
  public.phase4_student_access(institution_id,student_profile_id));
drop policy if exists phase5_interventions_staff_read on public.phase5_interventions;
create policy phase5_interventions_staff_read on public.phase5_interventions for select to authenticated using(
  public.phase4_member(institution_id,array['admin','reviewer']::text[])
  or (public.phase4_member(institution_id,array['faculty']::text[]) and exists(select 1 from public.faculty_student_assignments a
    where a.institution_id=phase5_interventions.institution_id and a.faculty_user_id=(select auth.uid())
      and a.student_profile_id=phase5_interventions.student_profile_id and a.status='active')));
drop policy if exists phase5_intervention_audit_staff_read on public.phase5_intervention_audit;
create policy phase5_intervention_audit_staff_read on public.phase5_intervention_audit for select to authenticated using(
  public.phase4_member(institution_id,array['admin','reviewer']::text[])
  or exists(select 1 from public.phase5_interventions v where v.id=intervention_id and v.assigned_mentor=(select auth.uid())
    and public.phase4_member(institution_id,array['faculty']::text[])
    and exists(select 1 from public.faculty_student_assignments a where a.institution_id=v.institution_id and a.faculty_user_id=(select auth.uid()) and a.student_profile_id=v.student_profile_id and a.status='active')));

-- Score snapshots are append-only: no browser insert/update/delete privileges or RPC exists for student users.
create or replace function public.phase5_run_scoring(p_institution_id uuid,p_cutoff date default current_date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.phase5_scoring_configs%rowtype; st record; ac numeric; att numeric; lms numeric; sk numeric; eng numeric;
  assess numeric; cov numeric; total numeric; ready_cov numeric; ready numeric; success_status text; ready_status text;
  components jsonb; flags jsonb; segment text; reasons jsonb; prev_ac numeric; threshold numeric; n integer:=0;
  wa numeric; wat numeric; wl numeric; ws numeric; we numeric; wrs numeric; wra numeric; min_cov numeric; lms_now numeric; lms_before numeric;
begin
  if auth.uid() is null or not public.phase4_member(p_institution_id,array['admin','reviewer']::text[]) then
    raise exception 'Only an active institution reviewer or admin may calculate scores'; end if;
  select * into cfg from public.phase5_scoring_configs where institution_id=p_institution_id and is_active for share;
  if not found then raise exception 'No active scoring configuration exists'; end if;
  wa:=(cfg.success_weights->>'academic')::numeric; wat:=(cfg.success_weights->>'attendance')::numeric;
  wl:=(cfg.success_weights->>'lms')::numeric; ws:=(cfg.success_weights->>'skills')::numeric; we:=(cfg.success_weights->>'engagement')::numeric;
  wrs:=(cfg.readiness_weights->>'skills')::numeric; wra:=(cfg.readiness_weights->>'assessment')::numeric;
  min_cov:=(cfg.thresholds->>'minimum_coverage')::numeric;
  if wa is null or wat is null or wl is null or ws is null or we is null or wrs is null or wra is null or min_cov is null
    or not (cfg.thresholds ?& array['academic_low','attendance_low','skill_gap','engagement_drop_percent','academic_improvement_points','high_engagement_academic_low','segment_academic_strong','segment_readiness_strong','segment_readiness_low'])
    or wa<0 or wat<0 or wl<0 or ws<0 or we<0 or wrs<0 or wra<0 or wa+wat+wl+ws+we<>100 or wrs+wra<>100 or min_cov<=0 or min_cov>100 then
    raise exception 'Scoring config is incomplete: weights must be non-negative and total 100 for each score; coverage must be 1–100'; end if;
  for st in select p.id,p.institution_id from public.profiles p where p.institution_id=p_institution_id and p.account_status='approved' loop
    select avg(100*r.marks_obtained/nullif(r.max_marks,0)) into ac from public.academic_records r
      where r.institution_id=p_institution_id and r.student_profile_id=st.id and r.recorded_on between p_cutoff-cfg.academic_lookback_days and p_cutoff;
    select 100.0*sum(a.classes_attended)/nullif(sum(a.classes_held),0) into att from public.attendance_records a
      where a.institution_id=p_institution_id and a.student_profile_id=st.id and a.period_end between p_cutoff-cfg.attendance_lookback_days and p_cutoff;
    select avg(least(100.0*l.minutes_active/cfg.lms_reference_minutes,100)) into lms from public.lms_activity l
      where l.institution_id=p_institution_id and l.student_profile_id=st.id and l.period_end between p_cutoff-cfg.engagement_lookback_days and p_cutoff and l.minutes_active is not null;
    select avg(ss.proficiency) into sk from public.student_skills ss where ss.institution_id=p_institution_id and ss.student_profile_id=st.id
      and ss.assessed_at between p_cutoff-cfg.skill_lookback_days and p_cutoff;
    select avg(e.metric_value) into eng from public.engagement_records e where e.institution_id=p_institution_id and e.student_profile_id=st.id
      and e.unit='score_0_100' and e.metric_name=any(cfg.engagement_metric_names) and e.metric_value between 0 and 100
      and e.period_end between p_cutoff-cfg.engagement_lookback_days and p_cutoff;
    select avg(100.0*ar.score/nullif(ar.max_score,0)) into assess from public.assessment_results ar
      join public.assessments a on a.id=ar.assessment_id and a.institution_id=ar.institution_id
      where ar.institution_id=p_institution_id and ar.student_profile_id=st.id and a.assessment_date between p_cutoff-cfg.skill_lookback_days and p_cutoff;
    select avg(least(100.0*l.minutes_active/cfg.lms_reference_minutes,100)) into lms_now from public.lms_activity l
      where l.institution_id=p_institution_id and l.student_profile_id=st.id and l.period_end between p_cutoff-29 and p_cutoff and l.minutes_active is not null;
    select avg(least(100.0*l.minutes_active/cfg.lms_reference_minutes,100)) into lms_before from public.lms_activity l
      where l.institution_id=p_institution_id and l.student_profile_id=st.id and l.period_end between p_cutoff-60 and p_cutoff-31 and l.minutes_active is not null;
    cov:=case when ac is not null then wa else 0 end+case when att is not null then wat else 0 end+
      case when lms is not null then wl else 0 end+case when sk is not null then ws else 0 end+case when eng is not null then we else 0 end;
    total:=case when cov=0 then null else round((coalesce(ac*wa,0)+coalesce(att*wat,0)+coalesce(lms*wl,0)+coalesce(sk*ws,0)+coalesce(eng*we,0))/cov,2) end;
    success_status:=case when cov<min_cov then 'insufficient_data' when cov<wa+wat+wl+ws+we then 'provisional' else 'available' end;
    ready_cov:=case when sk is not null then wrs else 0 end+case when assess is not null then wra else 0 end;
    ready:=case when ready_cov=0 then null else round((coalesce(sk*wrs,0)+coalesce(assess*wra,0))/ready_cov,2) end;
    ready_status:=case when ready_cov<min_cov then 'insufficient_data' when ready_cov<wrs+wra then 'provisional' else 'available' end;
    components:=jsonb_build_object(
      'academic',jsonb_build_object('value',ac,'weight',wa,'period_days',cfg.academic_lookback_days,'normalization','marks_obtained / max_marks × 100'),
      'attendance',jsonb_build_object('value',att,'weight',wat,'period_days',cfg.attendance_lookback_days,'normalization','classes_attended / classes_held × 100'),
      'lms',jsonb_build_object('value',lms,'weight',wl,'period_days',cfg.engagement_lookback_days,'normalization','minutes_active / reference_minutes × 100, capped at 100'),
      'skills',jsonb_build_object('value',sk,'weight',ws,'period_days',cfg.skill_lookback_days,'normalization','mean source proficiency on 0–100 scale'),
      'engagement',jsonb_build_object('value',eng,'weight',we,'period_days',cfg.engagement_lookback_days,'normalization','mean configured metric name(s), exact unit score_0_100','approved_metric_names',to_jsonb(cfg.engagement_metric_names)));
    flags:='[]'::jsonb;
    if cov<min_cov then flags:=flags||jsonb_build_array(jsonb_build_object('key','insufficient_data','message','Insufficient validated data for a score','coverage',cov,'required',min_cov)); end if;
    threshold:=(cfg.thresholds->>'academic_low')::numeric;
    if ac is not null and ac<threshold then flags:=flags||jsonb_build_array(jsonb_build_object('key','academic_support','message','Academic performance may benefit from support','value',ac,'threshold',threshold,'period_days',cfg.academic_lookback_days)); end if;
    threshold:=(cfg.thresholds->>'attendance_low')::numeric;
    if att is not null and att<threshold then flags:=flags||jsonb_build_array(jsonb_build_object('key','attendance_support','message','Attendance may benefit from support','value',att,'threshold',threshold,'period_days',cfg.attendance_lookback_days)); end if;
    if sk is not null and sk<(cfg.thresholds->>'skill_gap')::numeric then flags:=flags||jsonb_build_array(jsonb_build_object('key','skill_development','message','One or more skill areas may benefit from practice','value',sk,'threshold',(cfg.thresholds->>'skill_gap')::numeric,'period_days',cfg.skill_lookback_days)); end if;
    threshold:=(cfg.thresholds->>'engagement_drop_percent')::numeric;
    if lms_before>0 and lms_now is not null and lms_now<=lms_before*(1-threshold/100) then
      flags:=flags||jsonb_build_array(jsonb_build_object('key','engagement_decline','message','Recent LMS activity has declined and may benefit from a check-in','previous_period_value',lms_before,'current_period_value',lms_now,'drop_percent',round(100*(lms_before-lms_now)/lms_before,2),'period_days',30));
    end if;
    select (s.components->'academic'->>'value')::numeric into prev_ac from public.phase5_score_snapshots s where s.institution_id=p_institution_id and s.student_profile_id=st.id and s.score_type='student_success' order by s.calculated_at desc,s.id desc limit 1;
    threshold:=(cfg.thresholds->>'academic_improvement_points')::numeric;
    if prev_ac is not null and ac is not null and ac>prev_ac+threshold then
      flags:=flags||jsonb_build_array(jsonb_build_object('key','academic_improving','message','Academic performance has improved since the previous snapshot','previous',prev_ac,'current',ac,'threshold_points',threshold));
    end if;
    segment:=case
      when cov<min_cov then 'insufficient_data'
      when ac is not null and ac<(cfg.thresholds->>'high_engagement_academic_low')::numeric and lms>=70 then 'high_engagement_academic_support'
      when ac is not null and ac>=(cfg.thresholds->>'segment_academic_strong')::numeric and ready_status='available' and ready>=(cfg.thresholds->>'segment_readiness_strong')::numeric then 'strong_academics_and_placement_readiness'
      when ac is not null and ac>=(cfg.thresholds->>'segment_academic_strong')::numeric and ready_status='available' and ready<(cfg.thresholds->>'segment_readiness_low')::numeric then 'strong_academics_needs_placement_preparation'
      when ac is not null and ac<(cfg.thresholds->>'academic_low')::numeric then 'academic_support_may_help'
      when ready is not null and ready<(cfg.thresholds->>'segment_readiness_low')::numeric then 'placement_preparation_may_help'
      when sk is not null and sk<(cfg.thresholds->>'skill_gap')::numeric then 'skills_development_may_help'
      when prev_ac is not null and ac>prev_ac+(cfg.thresholds->>'academic_improvement_points')::numeric then 'improving_academics'
      else 'developing'
    end;
    reasons:=jsonb_build_array(jsonb_build_object('academic_value',ac,'placement_readiness_value',ready,'skills_value',sk,'engagement_value',lms,
      'data_coverage_percent',round(100*cov/nullif(wa+wat+wl+ws+we,0),2),'previous_academic_value',prev_ac,'thresholds',cfg.thresholds,
      'priority_rule','Insufficient data, engagement with academic support, strong combined indicators, academic support, placement preparation, skills development, improvement, then developing.'));
    insert into public.phase5_score_snapshots(institution_id,student_profile_id,score_type,score,score_status,data_coverage,minimum_coverage,components,risk_flags,segment_key,segment_reasons,calculation_version,algorithm_version,reporting_cutoff)
    values(p_institution_id,st.id,'student_success',case when cov>=min_cov then total else null end,success_status,
      round(100*cov/nullif(wa+wat+wl+ws+we,0),2),min_cov,components,flags,segment,reasons,cfg.version,cfg.algorithm_version,p_cutoff);

    insert into public.phase5_score_snapshots(institution_id,student_profile_id,score_type,score,score_status,data_coverage,minimum_coverage,components,risk_flags,segment_key,segment_reasons,calculation_version,algorithm_version,reporting_cutoff)
    values(p_institution_id,st.id,'placement_readiness',case when ready_cov>=min_cov then ready else null end,ready_status,
      round(100*ready_cov/nullif(wrs+wra,0),2),min_cov,jsonb_build_object(
       'skills',jsonb_build_object('value',sk,'weight',wrs,'period_days',cfg.skill_lookback_days,'normalization','mean source proficiency on 0–100 scale'),
       'assessment',jsonb_build_object('value',assess,'weight',wra,'period_days',cfg.skill_lookback_days,'normalization','score / max_score × 100')),
      case when ready_cov<min_cov then jsonb_build_array(jsonb_build_object('key','insufficient_data','message','Insufficient validated data for placement-readiness indicator','coverage',ready_cov,'required',min_cov))
        when sk is not null and sk<(cfg.thresholds->>'skill_gap')::numeric then jsonb_build_array(jsonb_build_object('key','skill_gap','message','Career skill evidence may benefit from development','value',sk,'threshold',(cfg.thresholds->>'skill_gap')::numeric,'period_days',cfg.skill_lookback_days)) else '[]'::jsonb end,
      case when ready_cov<min_cov then 'insufficient_data' when ready<(cfg.thresholds->>'segment_readiness_low')::numeric then 'placement_preparation_may_help' else 'placement_data_available' end,
      jsonb_build_array(jsonb_build_object('skills',sk,'assessment',assess,'note','This indicator is not an employer eligibility decision.')),cfg.version,cfg.algorithm_version,p_cutoff);
    n:=n+1;
  end loop;
  return jsonb_build_object('students_calculated',n,'version',cfg.version,'cutoff',p_cutoff,'snapshots_created',n*2);
end $$;
revoke all on function public.phase5_run_scoring(uuid,date) from public,anon;
grant execute on function public.phase5_run_scoring(uuid,date) to authenticated;

create or replace function public.phase5_save_intervention(p_intervention_id uuid,p_student_profile_id uuid,p_institution_id uuid,
  p_concern text,p_evidence jsonb,p_recommended_action text,p_due_date date,p_status text,
  p_student_visible_summary text,p_private_notes text,p_follow_up_date date,p_outcome text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  if auth.uid() is null or not public.phase4_member(p_institution_id,array['faculty']::text[]) or not exists(
    select 1 from public.faculty_student_assignments a where a.institution_id=p_institution_id and a.faculty_user_id=auth.uid()
    and a.student_profile_id=p_student_profile_id and a.status='active') then raise exception 'Only the assigned faculty mentor may manage this intervention'; end if;
  if p_status not in ('open','in_progress','completed','cancelled') or jsonb_typeof(coalesce(p_evidence,'{}'::jsonb))<>'object' then raise exception 'Invalid intervention status or evidence'; end if;
  if p_intervention_id is null then
    insert into public.phase5_interventions(institution_id,student_profile_id,created_by,assigned_mentor,concern,evidence,recommended_action,due_date,status,student_visible_summary,private_notes,follow_up_date,outcome)
    values(p_institution_id,p_student_profile_id,auth.uid(),auth.uid(),p_concern,coalesce(p_evidence,'{}'::jsonb),p_recommended_action,p_due_date,p_status,p_student_visible_summary,p_private_notes,p_follow_up_date,p_outcome)
    returning id into result_id;
  else
    update public.phase5_interventions set concern=p_concern,evidence=coalesce(p_evidence,'{}'::jsonb),recommended_action=p_recommended_action,due_date=p_due_date,
      status=p_status,student_visible_summary=p_student_visible_summary,private_notes=p_private_notes,follow_up_date=p_follow_up_date,outcome=p_outcome,updated_at=now()
    where id=p_intervention_id and institution_id=p_institution_id and student_profile_id=p_student_profile_id and assigned_mentor=auth.uid()
    returning id into result_id;
    if result_id is null then raise exception 'Intervention not found or no longer assigned to you'; end if;
  end if;
  return result_id;
end $$;
revoke all on function public.phase5_save_intervention(uuid,uuid,uuid,text,jsonb,text,date,text,text,text,date,text) from public,anon;
grant execute on function public.phase5_save_intervention(uuid,uuid,uuid,text,jsonb,text,date,text,text,text,date,text) to authenticated;

create or replace function public.phase5_audit_intervention()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.phase5_intervention_audit(intervention_id,institution_id,changed_by,action,before_state,after_state)
    values(new.id,new.institution_id,auth.uid(),'created',null,to_jsonb(new));
  else
    insert into public.phase5_intervention_audit(intervention_id,institution_id,changed_by,action,before_state,after_state)
    values(new.id,new.institution_id,auth.uid(),'updated',to_jsonb(old),to_jsonb(new));
  end if;
  return new;
end $$;
drop trigger if exists phase5_intervention_audit_trigger on public.phase5_interventions;
create trigger phase5_intervention_audit_trigger after insert or update on public.phase5_interventions for each row execute function public.phase5_audit_intervention();
revoke all on function public.phase5_audit_intervention() from public,anon,authenticated;

create or replace function public.phase5_my_interventions()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'concern',i.concern,'recommended_action',i.recommended_action,
    'due_date',i.due_date,'status',i.status,'student_visible_summary',i.student_visible_summary,'follow_up_date',i.follow_up_date,
    'created_at',i.created_at,'updated_at',i.updated_at) order by i.due_date nulls last,i.created_at desc),'[]'::jsonb)
  from public.phase5_interventions i where i.student_profile_id=auth.uid() and i.student_visible_summary is not null;
$$;
revoke all on function public.phase5_my_interventions() from public,anon;
grant execute on function public.phase5_my_interventions() to authenticated;

create or replace function public.phase5_placement_overview(p_institution_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.phase4_member(p_institution_id,array['placement_officer','admin','reviewer']::text[]) then raise exception 'Not authorized for placement overview'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('band',b.band,'students',b.n) order by b.band),'[]'::jsonb) into result from (
      select case when s.score_status='insufficient_data' then 'insufficient_data' when s.score<50 then 'below_50' when s.score<70 then '50_to_69' else '70_plus' end band,count(*) n
      from public.phase5_score_snapshots s where s.institution_id=p_institution_id and s.score_type='placement_readiness'
      and s.id in(select distinct on (student_profile_id) id from public.phase5_score_snapshots where institution_id=p_institution_id and score_type='placement_readiness' order by student_profile_id,calculated_at desc,id desc)
      group by 1) b;
  return result;
end
$$;
revoke all on function public.phase5_placement_overview(uuid) from public,anon;
grant execute on function public.phase5_placement_overview(uuid) to authenticated;

commit;
