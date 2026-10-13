-- Phase: cohort-aware student registration and catalog verification state.
-- Additive and non-destructive. Requires migrations 001 and 002; apply in order
-- after the existing 001-005 sequence. No account or catalog rows are deleted.
begin;

alter table public.institutions
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','demo')),
  add column if not exists academic_year_start_month smallint not null default 1
    check (academic_year_start_month between 1 and 12);

-- Demo status is kept consistent with the existing is_demo flag. Real
-- institutions remain unverified until a trusted operator explicitly checks
-- and designates them; metadata alone never proves affiliation.
update public.institutions
set verification_status = case when is_demo then 'demo' else 'unverified' end
where (is_demo and verification_status <> 'demo') or (not is_demo and verification_status = 'demo');

alter table public.institution_courses
  add column if not exists degree text
    check (degree is null or length(trim(degree)) between 1 and 80);

alter table public.profiles add column if not exists roll_number text;
update public.profiles set roll_number = student_id where roll_number is null;
alter table public.profiles alter column roll_number set not null;
alter table public.profiles drop constraint if exists profiles_roll_number_length;
alter table public.profiles add constraint profiles_roll_number_length
  check (length(btrim(roll_number)) between 1 and 100);

-- Avoid silently collapsing two previously distinct values such as "A1" and
-- " A1 ". Resolve collisions manually before applying this migration.
do $$
begin
  if exists (
    select 1 from public.profiles
    group by institution_id, coalesce(admission_year, 0), lower(btrim(roll_number))
    having count(*) > 1
  ) then
    raise exception 'Cannot create cohort roll-number uniqueness: review duplicate normalized roll numbers in profiles first';
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_institution_id_student_id_key;
create unique index if not exists profiles_institution_cohort_roll_number_unique
  on public.profiles(institution_id, coalesce(admission_year, 0), lower(btrim(roll_number)));
create index if not exists profiles_institution_roll_lookup
  on public.profiles(institution_id, admission_year, lower(btrim(roll_number)));

-- Enforce current study year against program duration, admission year, and the
-- institution's configured academic-year start month. Repeating a year is
-- allowed; advancing ahead of elapsed academic years is not.
create or replace function public.handle_new_student_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := new.raw_user_meta_data;
  roll text := btrim(coalesce(nullif(meta->>'roll_number',''), meta->>'student_id',''));
  admission smallint;
  study_year smallint;
  duration smallint;
  year_start smallint;
  latest_study_year integer;
begin
  if nullif(meta->>'institution_id','') is null then return new; end if;
  if coalesce(meta->>'privacy_consent','false') <> 'true' then
    raise exception 'Privacy consent is required';
  end if;
  if length(roll) not between 1 and 100 then raise exception 'Roll number must be between 1 and 100 characters'; end if;
  if nullif(meta->>'admission_year','') is null then raise exception 'Admission year is required'; end if;
  admission := (meta->>'admission_year')::smallint;
  study_year := (meta->>'academic_year')::smallint;
  select c.duration_years, i.academic_year_start_month into duration, year_start
  from public.institutions i
  join public.institution_courses c on c.institution_id = i.id
  join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
  where i.id = (meta->>'institution_id')::uuid
    and c.id = (meta->>'course_id')::uuid
    and d.id = (meta->>'department_id')::uuid
    and i.status = 'active' and i.verification_status = 'verified' and not i.is_demo
    and c.status = 'active' and d.status = 'active';
  if duration is null then
    raise exception 'Choose an active, verified institution, program, and department';
  end if;
  if admission < 1950 or admission > extract(year from current_date)::integer then
    raise exception 'Admission year is outside the allowed range';
  end if;
  latest_study_year := greatest(1,
    extract(year from current_date)::integer - admission + 1
      - case when extract(month from current_date)::integer < year_start then 1 else 0 end);
  if study_year < 1 or study_year > duration or study_year > latest_study_year then
    raise exception 'Current study year does not match program duration and admission year';
  end if;
  insert into public.profiles (
    id, full_name, institution_id, course_id, department_id, academic_year,
    admission_year, student_id, roll_number, privacy_consent_at, account_status
  ) values (
    new.id, btrim(meta->>'full_name'), (meta->>'institution_id')::uuid,
    (meta->>'course_id')::uuid, (meta->>'department_id')::uuid,
    study_year, admission, roll, roll, now(), 'pending'
  );
  -- Student details are not retained in user_metadata/JWT claims.
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = new.id;
  return new;
end;
$$;
revoke all on function public.handle_new_student_signup() from public, anon, authenticated;

create or replace function public.validate_student_profile_catalog()
returns trigger language plpgsql set search_path = '' as $$
declare duration smallint; year_start smallint; latest_study_year integer;
begin
  new.roll_number := btrim(new.roll_number);
  if length(new.roll_number) not between 1 and 100 then raise exception 'Roll number must be between 1 and 100 characters'; end if;
  if new.admission_year is null or new.admission_year < 1950 or new.admission_year > extract(year from current_date)::integer then
    raise exception 'Admission year is outside the allowed range';
  end if;
  select c.duration_years, i.academic_year_start_month into duration, year_start
  from public.institutions i
  join public.institution_courses c on c.institution_id = i.id
  join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
  where i.id = new.institution_id and c.id = new.course_id and d.id = new.department_id
    and i.status = 'active' and i.verification_status = 'verified' and not i.is_demo
    and c.status = 'active' and d.status = 'active';
  latest_study_year := greatest(1,
    extract(year from current_date)::integer - new.admission_year + 1
      - case when extract(month from current_date)::integer < year_start then 1 else 0 end);
  if duration is null or new.academic_year < 1 or new.academic_year > duration or new.academic_year > latest_study_year then
    raise exception 'Selected institution, program, department, admission year, or study year is invalid';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_validate_catalog on public.profiles;
create trigger profiles_validate_catalog before insert or update of
  institution_id, course_id, department_id, academic_year, admission_year, roll_number
  on public.profiles for each row execute function public.validate_student_profile_catalog();

-- Browser users cannot change the roll number, admission cohort, identifiers,
-- account status, or trusted membership. Retain the existing limited profile grants.
revoke update (student_id, admission_year) on public.profiles from authenticated;

-- Catalog readers receive only fields needed by registration. Catalog writes
-- remain trusted-operator-only, as in migration 002.
revoke all on public.institutions, public.institution_courses, public.institution_departments from anon, authenticated;
grant select (id, name, status, is_demo, verification_status, academic_year_start_month)
  on public.institutions to anon, authenticated;
grant select (id, institution_id, name, degree, duration_years, status)
  on public.institution_courses to anon, authenticated;
grant select (id, institution_id, course_id, name, status)
  on public.institution_departments to anon, authenticated;

-- Preserve private bucket behavior and its 5 MiB size/MIME limits. Adjust only
-- through a reviewed migration together with the client-side limit constant.
update storage.buckets
set public = false, file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png']
where id = 'student-verifications';

-- Allow cleanup only for the signed-in owner and only while an uploaded object
-- is not referenced by a verification row (for example, an interrupted submit).
drop policy if exists "student removes unlinked own verification file" on storage.objects;
create policy "student removes unlinked own verification file" on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-verifications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.student_verifications v where v.document_storage_path = storage.objects.name)
  );

-- Keep verification-record writes behind a trusted, owner-checked RPC. The
-- uploaded object must already exist in the owner's private folder.
revoke insert, update, delete on public.student_verifications from authenticated;
create or replace function public.submit_student_verification_document(p_document_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); profile_status text; existing_id uuid; existing_path text; result public.student_verifications%rowtype;
begin
  if uid is null or p_document_path is null or (storage.foldername(p_document_path))[1] is distinct from uid::text then
    raise exception 'Not authorized to submit this verification document';
  end if;
  select p.account_status into profile_status from public.profiles p where p.id = uid;
  if profile_status is null or profile_status not in ('pending','needs_more_information') then
    raise exception 'This account cannot submit a verification document in its current status';
  end if;
  if not exists (
    select 1 from storage.objects o where o.bucket_id='student-verifications' and o.name=p_document_path
  ) then raise exception 'The private upload was not found'; end if;
  select v.id,v.document_storage_path into existing_id,existing_path
  from public.student_verifications v where v.user_id=uid and v.verification_status='pending'
  order by v.submitted_at desc limit 1 for update;
  if existing_id is not null then
    if existing_path is not null then raise exception 'A pending document is already submitted'; end if;
    update public.student_verifications set document_storage_path=p_document_path,submitted_at=now()
    where id=existing_id returning * into result;
  else
    insert into public.student_verifications(user_id,document_storage_path)
    values(uid,p_document_path) returning * into result;
  end if;
  return jsonb_build_object('id',result.id,'verification_status',result.verification_status,
    'document_storage_path',result.document_storage_path,'submitted_at',result.submitted_at,'reviewer_note',result.reviewer_note);
end;
$$;
revoke all on function public.submit_student_verification_document(text) from public, anon;
grant execute on function public.submit_student_verification_document(text) to authenticated;

create or replace function public.submit_verification_review(target_verification uuid, decision text, notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare reviewer uuid := (select auth.uid()); student uuid; institution uuid;
begin
  if reviewer is null or decision not in ('approved','rejected','needs_more_information') then
    raise exception 'Not authorized to review this submission';
  end if;
  if decision in ('rejected','needs_more_information') and length(btrim(coalesce(notes,''))) < 3 then
    raise exception 'A clear reason is required for this decision';
  end if;
  select p.id, p.institution_id into student, institution
  from public.student_verifications v join public.profiles p on p.id = v.user_id
  where v.id = target_verification;
  if student is null or student = reviewer or not public.is_institution_reviewer(institution) then
    raise exception 'Not authorized to review this submission';
  end if;
  update public.student_verifications
  set verification_status = decision, reviewed_by = reviewer, reviewed_at = now(), reviewer_note = left(btrim(notes),2000)
  where id = target_verification;
  insert into public.verification_reviews(verification_id,reviewer_id,decision,notes)
  values(target_verification,reviewer,decision,left(btrim(notes),2000));
end;
$$;
revoke all on function public.submit_verification_review(uuid,text,text) from public, anon;
grant execute on function public.submit_verification_review(uuid,text,text) to authenticated;

-- Cohort-aware matching preserves Phase 4 imports when institutions reuse
-- roll numbers in different admission years.
create or replace function public.phase4_stage_import(p_institution_id uuid, p_category text,
  p_content_sha256 text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_import uuid; v_row jsonb; v_no integer; v_student uuid; v_errors jsonb; v_status text;
  v_seen text[] := array[]::text[]; v_fp text; v_total integer := 0; v_invalid integer := 0; v_dupes integer := 0;
  v_roll text; v_admission text;
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
    v_roll := btrim(coalesce(v_row->>'roll_number',''));
    v_admission := btrim(coalesce(v_row->>'admission_year',''));
    if v_fp = any(v_seen) then v_status := 'duplicate'; v_dupes := v_dupes + 1;
    else
      v_seen := array_append(v_seen,v_fp);
      if v_roll = '' or length(v_roll) > 100 then
        v_errors := v_errors || jsonb_build_array('A valid roll_number is required.');
      elsif v_admission !~ '^(19[5-9][0-9]|20[0-9]{2}|2100)$' then
        v_errors := v_errors || jsonb_build_array('A valid admission_year is required to identify the cohort.');
      else
        select p.id into v_student from public.profiles p where p.institution_id=p_institution_id
          and lower(btrim(p.roll_number))=lower(v_roll)
          and p.admission_year=v_admission::smallint and p.account_status='approved';
        if v_student is null then v_errors := v_errors || jsonb_build_array('No approved student matches this institution, roll_number, and admission_year.'); end if;
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

commit;
