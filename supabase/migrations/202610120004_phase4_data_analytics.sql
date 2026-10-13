-- Phase 4: institution-scoped data categories, safe CSV imports, and aggregates.
-- Requires migrations 001, 002, and 003. Additive; no existing records are dropped.

begin;

create table if not exists public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year text not null check (length(trim(academic_year)) between 4 and 20),
  term_code text not null check (length(trim(term_code)) between 1 and 40),
  term_name text not null check (length(trim(term_name)) between 1 and 100),
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (institution_id, academic_year, term_code),
  check (end_date >= start_date)
);

create table if not exists public.academic_subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  subject_code text,
  subject_name text not null check (length(trim(subject_name)) between 1 and 160),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (institution_id, id)
);
create unique index if not exists academic_subjects_name_unique
  on public.academic_subjects (institution_id, lower(subject_name));
create unique index if not exists academic_subjects_code_unique
  on public.academic_subjects (institution_id, subject_code)
  where subject_code is not null and length(trim(subject_code)) > 0;

create table if not exists public.data_imports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  category text not null check (category in ('academic','attendance','lms_activity','engagement','skills','placement','feedback')),
  status text not null default 'preview' check (status in ('preview','completed')),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id),
  total_rows integer not null default 0 check (total_rows >= 0),
  accepted_rows integer not null default 0 check (accepted_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (institution_id, category, content_sha256),
  unique (institution_id, id)
);

create table if not exists public.data_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.data_imports(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  row_fingerprint text not null,
  status text not null default 'preview' check (status in ('preview','invalid','duplicate','imported','rejected')),
  mapped_row jsonb not null,
  validation_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_errors) = 'array'),
  student_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (import_id, row_number)
);
create index if not exists data_import_rows_job_status on public.data_import_rows(import_id, status, row_number);
create index if not exists data_imports_institution_recent on public.data_imports(institution_id, created_at desc);

create table if not exists public.academic_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  term_id uuid not null,
  subject_id uuid not null,
  marks_obtained numeric(9,2) not null check (marks_obtained >= 0),
  max_marks numeric(9,2) not null check (max_marks > 0 and marks_obtained <= max_marks),
  grade text check (grade is null or length(grade) <= 20),
  gpa numeric(5,2) check (gpa is null or gpa between 0 and 10),
  cgpa numeric(5,2) check (cgpa is null or cgpa between 0 and 10),
  recorded_on date not null,
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (institution_id, student_profile_id, term_id, subject_id),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade,
  foreign key (institution_id, term_id) references public.academic_terms(institution_id, id),
  foreign key (institution_id, subject_id) references public.academic_subjects(institution_id, id)
);
create index if not exists academic_records_institution_date on public.academic_records(institution_id, recorded_on desc);
create index if not exists academic_records_student_term on public.academic_records(student_profile_id, term_id);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  period_start date not null,
  period_end date not null,
  classes_attended integer not null check (classes_attended >= 0),
  classes_held integer not null check (classes_held > 0 and classes_attended <= classes_held),
  source_name text not null check (length(trim(source_name)) between 1 and 120),
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_profile_id, period_start, period_end),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade,
  check (period_end >= period_start)
);
create index if not exists attendance_institution_period on public.attendance_records(institution_id, period_end desc);
create index if not exists attendance_student_period on public.attendance_records(student_profile_id, period_end desc);

create table if not exists public.lms_activity (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  course_label text not null check (length(trim(course_label)) between 1 and 160),
  period_start date not null,
  period_end date not null,
  sessions_count integer check (sessions_count is null or sessions_count >= 0),
  minutes_active integer check (minutes_active is null or minutes_active >= 0),
  assignments_completed integer,
  assignments_total integer,
  source_name text not null check (length(trim(source_name)) between 1 and 120),
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_profile_id, course_label, period_start, period_end),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade,
  check (period_end >= period_start),
  check ((assignments_completed is null and assignments_total is null) or (assignments_completed >= 0 and assignments_total >= 0 and assignments_completed <= assignments_total))
);
create index if not exists lms_activity_institution_period on public.lms_activity(institution_id, period_end desc);
create index if not exists lms_activity_student_period on public.lms_activity(student_profile_id, period_end desc);
-- Keep unspecified LMS counts missing; these columns were nullable in the initial schema design.
alter table public.lms_activity alter column sessions_count drop not null, alter column sessions_count drop default;
alter table public.lms_activity alter column minutes_active drop not null, alter column minutes_active drop default;

create table if not exists public.engagement_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  metric_name text not null check (length(trim(metric_name)) between 1 and 120),
  metric_value numeric(12,4) not null check (metric_value between -1000000000 and 1000000000),
  unit text not null check (length(trim(unit)) between 1 and 40),
  source_name text not null check (length(trim(source_name)) between 1 and 120),
  period_start date not null,
  period_end date not null,
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_profile_id, metric_name, unit, source_name, period_start, period_end),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade,
  check (period_end >= period_start)
);
create index if not exists engagement_institution_period on public.engagement_records(institution_id, period_end desc);
create index if not exists engagement_student_period on public.engagement_records(student_profile_id, period_end desc);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  skill_name text not null check (length(trim(skill_name)) between 1 and 120),
  skill_category text not null check (length(trim(skill_category)) between 1 and 80),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (institution_id, id)
);
create unique index if not exists skills_name_category_unique on public.skills(institution_id, lower(skill_name), lower(skill_category));

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  assessment_name text not null check (length(trim(assessment_name)) between 1 and 160),
  assessment_date date not null,
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (institution_id, id)
);
create unique index if not exists assessments_name_date_unique on public.assessments(institution_id, lower(assessment_name), assessment_date);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  assessment_id uuid not null,
  student_profile_id uuid not null,
  score numeric(9,2) not null check (score >= 0),
  max_score numeric(9,2) not null check (max_score > 0 and score <= max_score),
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (assessment_id, student_profile_id),
  foreign key (institution_id, assessment_id) references public.assessments(institution_id, id),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade
);
create index if not exists assessment_results_institution on public.assessment_results(institution_id, assessment_id);
create index if not exists assessment_results_student on public.assessment_results(student_profile_id, created_at desc);

create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  skill_id uuid not null,
  assessment_id uuid,
  proficiency numeric(5,2) not null check (proficiency between 0 and 100),
  assessed_at date not null,
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_profile_id, skill_id, assessed_at),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade,
  foreign key (institution_id, skill_id) references public.skills(institution_id, id),
  foreign key (institution_id, assessment_id) references public.assessments(institution_id, id)
);
create index if not exists student_skills_institution_date on public.student_skills(institution_id, assessed_at desc);
create index if not exists student_skills_student_date on public.student_skills(student_profile_id, assessed_at desc);

create table if not exists public.placement_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  source_reference text not null check (length(trim(source_reference)) between 1 and 120),
  record_type text not null check (record_type in ('eligibility','assessment','interview','offer','outcome')),
  status text not null check (length(trim(status)) between 1 and 80),
  event_date date not null,
  score numeric(5,2) check (score is null or score between 0 and 100),
  detail text check (detail is null or length(detail) <= 2000),
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (institution_id, source_reference),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade
);
create index if not exists placement_institution_date on public.placement_records(institution_id, event_date desc);
create index if not exists placement_student_date on public.placement_records(student_profile_id, event_date desc);

create table if not exists public.feedback_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_profile_id uuid not null,
  feedback_type text not null check (feedback_type in ('student','mentor','instructor','other')),
  author_role text not null check (author_role in ('student','faculty','placement_officer','admin','imported')),
  feedback_text text not null check (length(trim(feedback_text)) between 1 and 4000),
  rating smallint check (rating is null or rating between 1 and 5),
  submitted_at timestamptz not null,
  source_name text not null check (length(trim(source_name)) between 1 and 120),
  source_import_id uuid references public.data_imports(id) on delete set null,
  source_import_row_id uuid unique references public.data_import_rows(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (institution_id, student_profile_id) references public.profiles(institution_id, id) on delete cascade
);
create index if not exists feedback_institution_date on public.feedback_records(institution_id, submitted_at desc);
create index if not exists feedback_student_date on public.feedback_records(student_profile_id, submitted_at desc);

-- Trusted scope predicates used by RLS. Role assignments must be provisioned by a trusted operator.
create or replace function public.phase4_member(p_institution_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.institution_memberships m
    where m.user_id = (select auth.uid()) and m.institution_id = p_institution_id
      and m.status = 'active' and m.role = any(p_roles));
$$;
create or replace function public.phase4_student_access(p_institution_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = p_student_id
      and p.institution_id = p_institution_id and p.id = (select auth.uid()))
    or public.phase4_member(p_institution_id, array['admin','reviewer']::text[])
    or (public.phase4_member(p_institution_id, array['faculty']::text[]) and exists (
      select 1 from public.faculty_student_assignments a
      where a.institution_id = p_institution_id and a.faculty_user_id = (select auth.uid())
        and a.student_profile_id = p_student_id and a.status = 'active'));
$$;
create or replace function public.phase4_import_access(p_import_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.data_imports i where i.id = p_import_id
    and public.phase4_member(i.institution_id, array['admin','reviewer']::text[]));
$$;
revoke all on function public.phase4_member(uuid,text[]) from public, anon;
revoke all on function public.phase4_student_access(uuid,uuid) from public, anon;
revoke all on function public.phase4_import_access(uuid) from public, anon;
grant execute on function public.phase4_member(uuid,text[]) to authenticated;
grant execute on function public.phase4_student_access(uuid,uuid) to authenticated;
grant execute on function public.phase4_import_access(uuid) to authenticated;

-- All raw student data and import staging are RLS protected. Browsers receive read-only access.
do $$ declare t text; begin
  foreach t in array array['academic_terms','academic_subjects','data_imports','data_import_rows',
    'academic_records','attendance_records','lms_activity','engagement_records','skills',
    'assessments','assessment_results','student_skills','placement_records','feedback_records'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

do $$ declare item text[]; begin
  foreach item slice 1 in array array[
    array['phase4_catalog_terms_read','academic_terms'],array['phase4_catalog_subjects_read','academic_subjects'],
    array['phase4_imports_read','data_imports'],array['phase4_import_rows_read','data_import_rows'],
    array['phase4_academic_read','academic_records'],array['phase4_attendance_read','attendance_records'],
    array['phase4_lms_read','lms_activity'],array['phase4_engagement_read','engagement_records'],
    array['phase4_skills_read','skills'],array['phase4_assessments_read','assessments'],
    array['phase4_assessment_results_read','assessment_results'],array['phase4_student_skills_read','student_skills'],
    array['phase4_placement_read','placement_records'],array['phase4_feedback_read','feedback_records']
  ] loop execute format('drop policy if exists %I on public.%I',item[1],item[2]); end loop;
end $$;

create policy phase4_catalog_terms_read on public.academic_terms for select to authenticated
  using (public.phase4_member(institution_id, array['admin','reviewer','faculty','placement_officer']::text[])
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.institution_id=academic_terms.institution_id));
create policy phase4_catalog_subjects_read on public.academic_subjects for select to authenticated
  using (public.phase4_member(institution_id, array['admin','reviewer','faculty','placement_officer']::text[])
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.institution_id=academic_subjects.institution_id));
create policy phase4_imports_read on public.data_imports for select to authenticated
  using (public.phase4_member(institution_id, array['admin','reviewer']::text[]));
create policy phase4_import_rows_read on public.data_import_rows for select to authenticated
  using (public.phase4_import_access(import_id));
create policy phase4_academic_read on public.academic_records for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));
create policy phase4_attendance_read on public.attendance_records for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));
create policy phase4_lms_read on public.lms_activity for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));
create policy phase4_engagement_read on public.engagement_records for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));
create policy phase4_skills_read on public.skills for select to authenticated
  using (public.phase4_member(institution_id, array['admin','reviewer','faculty','placement_officer']::text[])
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.institution_id=skills.institution_id));
create policy phase4_assessments_read on public.assessments for select to authenticated
  using (public.phase4_member(institution_id, array['admin','reviewer','faculty','placement_officer']::text[])
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.institution_id=assessments.institution_id));
create policy phase4_assessment_results_read on public.assessment_results for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));
create policy phase4_student_skills_read on public.student_skills for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));
create policy phase4_placement_read on public.placement_records for select to authenticated
  using (public.phase4_member(institution_id, array['admin','reviewer','placement_officer']::text[])
    or exists(select 1 from public.profiles p where p.id=student_profile_id and p.id=(select auth.uid()) and p.institution_id=placement_records.institution_id));
create policy phase4_feedback_read on public.feedback_records for select to authenticated
  using (public.phase4_student_access(institution_id, student_profile_id));

-- Import preview is staged in a private table, matched only by trusted institutional student ID.
create or replace function public.phase4_stage_import(p_institution_id uuid, p_category text,
  p_content_sha256 text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_import uuid; v_row jsonb; v_no integer; v_student uuid; v_errors jsonb; v_status text;
  v_seen text[] := array[]::text[]; v_fp text; v_total integer := 0; v_invalid integer := 0; v_dupes integer := 0;
begin
  if auth.uid() is null or not public.phase4_member(p_institution_id,array['admin','reviewer']::text[]) then
    raise exception 'Not authorized to import data for this institution'; end if;
  if p_category not in ('academic','attendance','lms_activity','engagement','skills','placement','feedback')
    or p_content_sha256 !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Invalid import category, file hash, or row count'; end if;
  insert into public.data_imports(institution_id,category,content_sha256,created_by,total_rows)
    values(p_institution_id,p_category,p_content_sha256,auth.uid(),jsonb_array_length(p_rows)) returning id into v_import;
  for v_row,v_no in select value,(ordinality)::integer from jsonb_array_elements(p_rows) with ordinality loop
    v_total := v_total + 1; v_fp := md5(v_row::text);
    v_errors := coalesce(v_row->'_client_errors','[]'::jsonb); v_student := null; v_status := 'preview';
    if v_fp = any(v_seen) then v_status := 'duplicate'; v_dupes := v_dupes + 1;
    else
      v_seen := array_append(v_seen,v_fp);
      if nullif(trim(v_row->>'student_id'),'') is null then
        v_errors := v_errors || jsonb_build_array('student_id is required.');
      else
        select p.id into v_student from public.profiles p where p.institution_id=p_institution_id
          and p.student_id=trim(v_row->>'student_id') and p.account_status='approved';
        if v_student is null then v_errors := v_errors || jsonb_build_array('No approved student matches this institution and student_id.'); end if;
      end if;
      if v_errors <> '[]'::jsonb then v_status := 'invalid'; v_invalid := v_invalid + 1; end if;
    end if;
    insert into public.data_import_rows(import_id,row_number,row_fingerprint,status,mapped_row,validation_errors,student_profile_id)
      values(v_import,v_no,v_fp,v_status,v_row - '_client_errors',v_errors,v_student);
  end loop;
  update public.data_imports set rejected_rows=v_invalid,duplicate_rows=v_dupes where id=v_import;
  return jsonb_build_object('import_id',v_import,'total_rows',v_total,'invalid_rows',v_invalid,'duplicate_rows',v_dupes);
exception when unique_violation then raise exception 'This exact file was already staged or imported for this category.';
end $$;
revoke all on function public.phase4_stage_import(uuid,text,text,jsonb) from public, anon;
grant execute on function public.phase4_stage_import(uuid,text,text,jsonb) to authenticated;

create or replace function public.phase4_commit_import(p_import_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.data_imports%rowtype; r record; n integer; v_term uuid; v_subject uuid;
  v_skill uuid; v_assessment uuid; v_ok integer := 0; v_bad integer := 0; v_dup integer := 0;
begin
  select * into j from public.data_imports where id=p_import_id for update;
  if not found or auth.uid() is null or j.created_by <> auth.uid()
     or not public.phase4_member(j.institution_id,array['admin','reviewer']::text[]) then
    raise exception 'Import not found or not authorized'; end if;
  if j.status <> 'preview' then raise exception 'This import has already been completed'; end if;
  for r in select * from public.data_import_rows where import_id=j.id and status='preview' order by row_number loop
    begin
      case j.category
      when 'academic' then
        insert into public.academic_terms(institution_id,academic_year,term_code,term_name,start_date,end_date)
        values(j.institution_id,r.mapped_row->>'academic_year',r.mapped_row->>'term_code',r.mapped_row->>'term_name',
          (r.mapped_row->>'term_start')::date,(r.mapped_row->>'term_end')::date)
        on conflict(institution_id,academic_year,term_code) do nothing;
        select id into v_term from public.academic_terms where institution_id=j.institution_id and academic_year=r.mapped_row->>'academic_year' and term_code=r.mapped_row->>'term_code';
        insert into public.academic_subjects(institution_id,subject_code,subject_name)
        values(j.institution_id,nullif(r.mapped_row->>'subject_code',''),r.mapped_row->>'subject_name')
        on conflict do nothing;
        select id into v_subject from public.academic_subjects where institution_id=j.institution_id and lower(subject_name)=lower(r.mapped_row->>'subject_name') limit 1;
        insert into public.academic_records(institution_id,student_profile_id,term_id,subject_id,marks_obtained,max_marks,grade,gpa,cgpa,recorded_on,source_import_id,source_import_row_id)
        values(j.institution_id,r.student_profile_id,v_term,v_subject,(r.mapped_row->>'marks_obtained')::numeric,(r.mapped_row->>'max_marks')::numeric,
          nullif(r.mapped_row->>'grade',''),nullif(r.mapped_row->>'gpa','')::numeric,nullif(r.mapped_row->>'cgpa','')::numeric,(r.mapped_row->>'recorded_on')::date,j.id,r.id) on conflict do nothing;
      when 'attendance' then
        insert into public.attendance_records(institution_id,student_profile_id,period_start,period_end,classes_attended,classes_held,source_name,source_import_id,source_import_row_id)
        values(j.institution_id,r.student_profile_id,(r.mapped_row->>'period_start')::date,(r.mapped_row->>'period_end')::date,
          (r.mapped_row->>'classes_attended')::integer,(r.mapped_row->>'classes_held')::integer,coalesce(nullif(r.mapped_row->>'source_name',''),'CSV import'),j.id,r.id) on conflict do nothing;
      when 'lms_activity' then
        insert into public.lms_activity(institution_id,student_profile_id,course_label,period_start,period_end,sessions_count,minutes_active,assignments_completed,assignments_total,source_name,source_import_id,source_import_row_id)
        values(j.institution_id,r.student_profile_id,r.mapped_row->>'course_label',(r.mapped_row->>'period_start')::date,(r.mapped_row->>'period_end')::date,
          nullif(r.mapped_row->>'sessions_count','')::integer,nullif(r.mapped_row->>'minutes_active','')::integer,nullif(r.mapped_row->>'assignments_completed','')::integer,nullif(r.mapped_row->>'assignments_total','')::integer,
          coalesce(nullif(r.mapped_row->>'source_name',''),'CSV import'),j.id,r.id) on conflict do nothing;
      when 'engagement' then
        insert into public.engagement_records(institution_id,student_profile_id,metric_name,metric_value,unit,source_name,period_start,period_end,source_import_id,source_import_row_id)
        values(j.institution_id,r.student_profile_id,r.mapped_row->>'metric_name',(r.mapped_row->>'metric_value')::numeric,r.mapped_row->>'unit',coalesce(nullif(r.mapped_row->>'source_name',''),'CSV import'),
          (r.mapped_row->>'period_start')::date,(r.mapped_row->>'period_end')::date,j.id,r.id) on conflict do nothing;
      when 'skills' then
        insert into public.skills(institution_id,skill_name,skill_category) values(j.institution_id,r.mapped_row->>'skill_name',coalesce(nullif(r.mapped_row->>'skill_category',''),'Other')) on conflict do nothing;
        select id into v_skill from public.skills where institution_id=j.institution_id and lower(skill_name)=lower(r.mapped_row->>'skill_name') and lower(skill_category)=lower(coalesce(nullif(r.mapped_row->>'skill_category',''),'Other'));
        insert into public.student_skills(institution_id,student_profile_id,skill_id,proficiency,assessed_at,source_import_id,source_import_row_id)
          values(j.institution_id,r.student_profile_id,v_skill,(r.mapped_row->>'proficiency')::numeric,(r.mapped_row->>'assessed_at')::date,j.id,r.id) on conflict do nothing;
        if nullif(r.mapped_row->>'assessment_name','') is not null or nullif(r.mapped_row->>'assessment_score','') is not null or nullif(r.mapped_row->>'assessment_max_score','') is not null then
          if nullif(r.mapped_row->>'assessment_name','') is null or nullif(r.mapped_row->>'assessment_score','') is null or nullif(r.mapped_row->>'assessment_max_score','') is null then raise exception 'Assessment name, score, and maximum are all required together'; end if;
          insert into public.assessments(institution_id,assessment_name,assessment_date,source_import_id)
            values(j.institution_id,r.mapped_row->>'assessment_name',(r.mapped_row->>'assessed_at')::date,j.id) on conflict do nothing;
          select id into v_assessment from public.assessments where institution_id=j.institution_id and lower(assessment_name)=lower(r.mapped_row->>'assessment_name') and assessment_date=(r.mapped_row->>'assessed_at')::date;
          insert into public.assessment_results(institution_id,assessment_id,student_profile_id,score,max_score,source_import_id)
            values(j.institution_id,v_assessment,r.student_profile_id,(r.mapped_row->>'assessment_score')::numeric,(r.mapped_row->>'assessment_max_score')::numeric,j.id) on conflict do nothing;
        end if;
      when 'placement' then
        insert into public.placement_records(institution_id,student_profile_id,source_reference,record_type,status,event_date,score,detail,source_import_id,source_import_row_id)
          values(j.institution_id,r.student_profile_id,r.mapped_row->>'source_reference',r.mapped_row->>'record_type',r.mapped_row->>'status',(r.mapped_row->>'event_date')::date,
            nullif(r.mapped_row->>'score','')::numeric,nullif(r.mapped_row->>'detail',''),j.id,r.id) on conflict do nothing;
      when 'feedback' then
        insert into public.feedback_records(institution_id,student_profile_id,feedback_type,author_role,feedback_text,rating,submitted_at,source_name,source_import_id,source_import_row_id)
          values(j.institution_id,r.student_profile_id,r.mapped_row->>'feedback_type',r.mapped_row->>'author_role',r.mapped_row->>'feedback_text',nullif(r.mapped_row->>'rating','')::smallint,
            (r.mapped_row->>'submitted_at')::timestamptz,coalesce(nullif(r.mapped_row->>'source_name',''),'CSV import'),j.id,r.id) on conflict do nothing;
      end case;
      get diagnostics n = row_count;
      if n > 0 then update public.data_import_rows set status='imported' where id=r.id; v_ok:=v_ok+1;
      else update public.data_import_rows set status='duplicate' where id=r.id; v_dup:=v_dup+1; end if;
    exception when others then
      update public.data_import_rows set status='rejected',validation_errors=jsonb_build_array('One or more values failed database validation. Correct the row and retry in a new import.') where id=r.id;
      v_bad:=v_bad+1;
    end;
  end loop;
  select count(*) into v_bad from public.data_import_rows where import_id=j.id and status in ('invalid','rejected');
  select count(*) into v_dup from public.data_import_rows where import_id=j.id and status='duplicate';
  select count(*) into v_ok from public.data_import_rows where import_id=j.id and status='imported';
  update public.data_imports set status='completed',accepted_rows=v_ok,rejected_rows=v_bad,duplicate_rows=v_dup,completed_at=now() where id=j.id;
  return jsonb_build_object('import_id',j.id,'total_rows',j.total_rows,'accepted_rows',v_ok,'rejected_rows',v_bad,'duplicate_rows',v_dup);
end $$;
revoke all on function public.phase4_commit_import(uuid) from public,anon;
grant execute on function public.phase4_commit_import(uuid) to authenticated;

-- Aggregates execute with caller privileges so table RLS enforces student/faculty/institution scope.
create or replace function public.phase4_analytics(p_institution_id uuid, p_start date default null,
  p_end date default null, p_academic_year text default null, p_term_id uuid default null, p_department_id uuid default null, p_course_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.phase4_member(p_institution_id,array['admin','reviewer','faculty','placement_officer']::text[])
    and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.institution_id=p_institution_id) then
    raise exception 'Not authorized for this institution'; end if;
  if (p_start is not null and p_end is not null and p_start > p_end) then raise exception 'Invalid date range'; end if;
  select jsonb_build_object(
    'academic', coalesce((select jsonb_agg(x) from (select t.academic_year,t.term_name,
      round(avg(100*r.marks_obtained/nullif(r.max_marks,0)),2) as average_percent,count(*) as record_count
      from public.academic_records r join public.academic_terms t on t.id=r.term_id and t.institution_id=r.institution_id
      join public.profiles p on p.id=r.student_profile_id
      where r.institution_id=p_institution_id and (p_start is null or r.recorded_on>=p_start)
        and (p_end is null or r.recorded_on<=p_end) and (p_academic_year is null or t.academic_year=p_academic_year)
        and (p_term_id is null or t.id=p_term_id) and (p_department_id is null or p.department_id=p_department_id)
        and (p_course_id is null or p.course_id=p_course_id)
      group by t.academic_year,t.term_name order by min(t.start_date)) x), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(x) from (select a.period_end,
      round(100.0*sum(a.classes_attended)/nullif(sum(a.classes_held),0),2) as attendance_percent,
      sum(a.classes_held) as classes_held from public.attendance_records a join public.profiles p on p.id=a.student_profile_id
      where a.institution_id=p_institution_id and (p_start is null or a.period_end>=p_start)
        and (p_end is null or a.period_start<=p_end) and (p_department_id is null or p.department_id=p_department_id)
        and (p_course_id is null or p.course_id=p_course_id)
      group by a.period_end order by a.period_end) x), '[]'::jsonb),
    'lms', coalesce((select jsonb_agg(x) from (select l.period_end,sum(l.sessions_count) as sessions,
      sum(l.minutes_active) as minutes_active,sum(l.assignments_completed) as assignments_completed,
      sum(l.assignments_total) as assignments_total from public.lms_activity l
      join public.profiles p on p.id=l.student_profile_id where l.institution_id=p_institution_id
      and (p_start is null or l.period_end>=p_start) and (p_end is null or l.period_start<=p_end)
      and (p_department_id is null or p.department_id=p_department_id) and (p_course_id is null or p.course_id=p_course_id)
      group by l.period_end order by l.period_end) x), '[]'::jsonb),
    'engagement', coalesce((select jsonb_agg(x) from (select e.metric_name,e.unit,e.period_end,avg(e.metric_value) as average_value,count(*) as observations
      from public.engagement_records e join public.profiles p on p.id=e.student_profile_id where e.institution_id=p_institution_id
      and (p_start is null or e.period_end>=p_start) and (p_end is null or e.period_start<=p_end)
      and (p_department_id is null or p.department_id=p_department_id) and (p_course_id is null or p.course_id=p_course_id)
      group by e.metric_name,e.unit,e.period_end order by e.period_end) x), '[]'::jsonb),
    'skills', coalesce((select jsonb_agg(x) from (select s.skill_category,count(*) as observations,
      round(avg(ss.proficiency),2) as average_proficiency from public.student_skills ss
      join public.skills s on s.id=ss.skill_id and s.institution_id=ss.institution_id
      join public.profiles p on p.id=ss.student_profile_id where ss.institution_id=p_institution_id
      and (p_start is null or ss.assessed_at>=p_start) and (p_end is null or ss.assessed_at<=p_end)
      and (p_department_id is null or p.department_id=p_department_id) and (p_course_id is null or p.course_id=p_course_id)
      group by s.skill_category order by s.skill_category) x), '[]'::jsonb),
    'placement', coalesce((select jsonb_agg(x) from (select pr.record_type,pr.status,count(*) as records
      from public.placement_records pr join public.profiles p on p.id=pr.student_profile_id
      where pr.institution_id=p_institution_id and (p_start is null or pr.event_date>=p_start)
      and (p_end is null or pr.event_date<=p_end) and (p_department_id is null or p.department_id=p_department_id)
      and (p_course_id is null or p.course_id=p_course_id) group by pr.record_type,pr.status order by pr.record_type,pr.status) x), '[]'::jsonb),
    'data_quality', case when public.phase4_member(p_institution_id,array['admin','reviewer']::text[]) then
      coalesce((select jsonb_agg(jsonb_build_object('category',d.category,'imports',d.import_count,'rows',d.total_rows,
        'accepted',d.accepted_rows,'rejected',d.rejected_rows,'duplicates',d.duplicate_rows,'last_import',d.last_import))
        from (select i.category,count(*) import_count,sum(i.total_rows) total_rows,sum(i.accepted_rows) accepted_rows,
          sum(i.rejected_rows) rejected_rows,sum(i.duplicate_rows) duplicate_rows,max(i.completed_at) last_import
          from public.data_imports i where i.institution_id=p_institution_id group by i.category) d), '[]'::jsonb)
      else '[]'::jsonb end
  ) into result;
  return result;
end $$;
revoke all on function public.phase4_analytics(uuid,date,date,text,uuid,uuid,uuid) from public, anon;
grant execute on function public.phase4_analytics(uuid,date,date,text,uuid,uuid,uuid) to authenticated;

commit;
