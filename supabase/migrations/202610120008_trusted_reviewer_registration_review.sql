-- Migration 008: Trusted Reviewer Registration Review & Catalog Matching Engine
-- Enables authorized institution reviewers to inspect, verify, match, and audit
-- student registration requests submitted via manual college entry.
-- Safe, additive migration. Apply after migration 007.

begin;

-- 1. Extend allowed status values for registration requests to include
-- 'under_review' and 'needs_more_information'
alter table public.student_registration_requests
  drop constraint if exists student_registration_requests_request_status_check;

alter table public.student_registration_requests
  add constraint student_registration_requests_request_status_check
  check (request_status in ('pending', 'under_review', 'matched', 'approved', 'rejected', 'needs_more_information'));

-- 2. Allow active reviewers and administrators to read all registration requests
drop policy if exists "reviewers read student registration requests" on public.student_registration_requests;
create policy "reviewers read student registration requests"
  on public.student_registration_requests for select to authenticated
  using (
    exists (
      select 1 from public.institution_memberships m
      where m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role in ('admin', 'reviewer')
    )
  );

-- 3. Stored function: Retrieve pending registration queue for authorized reviewers
create or replace function public.get_pending_registration_queue(
  p_institution_filter text default null,
  p_status_filter text default null
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  institution_name text,
  program_name text,
  department_name text,
  admission_year smallint,
  current_study_year smallint,
  roll_number text,
  request_status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  reviewer_note text,
  document_storage_path text,
  verification_id uuid
)
language plpgsql security definer set search_path = '' as $$
declare
  v_reviewer uuid := (select auth.uid());
  v_is_reviewer boolean;
begin
  if v_reviewer is null then
    raise exception 'Authentication required to access the review queue';
  end if;

  select exists (
    select 1 from public.institution_memberships m
    where m.user_id = v_reviewer
      and m.status = 'active'
      and m.role in ('admin', 'reviewer')
  ) into v_is_reviewer;

  if not v_is_reviewer then
    raise exception 'Not authorized: Reviewer or Admin role required';
  end if;

  return query
  select
    r.user_id,
    p.full_name,
    u.email::text,
    r.institution_name,
    r.program_name,
    r.department_name,
    r.admission_year,
    r.current_study_year,
    r.roll_number,
    r.request_status,
    r.submitted_at,
    r.reviewed_at,
    r.reviewed_by,
    r.reviewer_note,
    v.document_storage_path,
    v.id as verification_id
  from public.student_registration_requests r
  join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  left join lateral (
    select sv.id, sv.document_storage_path
    from public.student_verifications sv
    where sv.user_id = r.user_id
    order by sv.submitted_at desc
    limit 1
  ) v on true
  where (p_status_filter is null or r.request_status = p_status_filter)
    and (p_institution_filter is null or lower(r.institution_name) like '%' || lower(p_institution_filter) || '%')
  order by r.submitted_at asc;
end;
$$;

revoke all on function public.get_pending_registration_queue(text, text) from public, anon;
grant execute on function public.get_pending_registration_queue(text, text) to authenticated;

-- 4. Stored function: Review, match catalog records, and record decision audit trail
create or replace function public.review_student_registration_request(
  p_target_user_id uuid,
  p_decision text,
  p_notes text default null,
  p_matched_institution_id uuid default null,
  p_matched_course_id uuid default null,
  p_matched_department_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reviewer uuid := (select auth.uid());
  v_is_reviewer boolean;
  v_target_request public.student_registration_requests%rowtype;
  v_target_profile public.profiles%rowtype;
  v_verification_id uuid;
  v_clean_note text := left(btrim(coalesce(p_notes, '')), 2000);
begin
  if v_reviewer is null then
    raise exception 'Authentication required';
  end if;

  if v_reviewer = p_target_user_id then
    raise exception 'Self-review is strictly forbidden';
  end if;

  select exists (
    select 1 from public.institution_memberships m
    where m.user_id = v_reviewer
      and m.status = 'active'
      and m.role in ('admin', 'reviewer')
  ) into v_is_reviewer;

  if not v_is_reviewer then
    raise exception 'Not authorized: Reviewer or Admin role required';
  end if;

  if p_decision not in ('under_review', 'approved', 'rejected', 'needs_more_information') then
    raise exception 'Invalid verification decision: %', p_decision;
  end if;

  if p_decision in ('rejected', 'needs_more_information') and length(v_clean_note) < 3 then
    raise exception 'A descriptive reason (at least 3 characters) is required for % decisions', p_decision;
  end if;

  select * into v_target_request from public.student_registration_requests
  where user_id = p_target_user_id;
  if not found then
    raise exception 'Registration request not found for user %', p_target_user_id;
  end if;

  select * into v_target_profile from public.profiles
  where id = p_target_user_id;
  if not found then
    raise exception 'Profile not found for user %', p_target_user_id;
  end if;

  select id into v_verification_id from public.student_verifications
  where user_id = p_target_user_id
  order by submitted_at desc limit 1;

  if p_decision = 'under_review' then
    update public.student_registration_requests
    set request_status = 'under_review',
        reviewed_by = v_reviewer,
        reviewed_at = now()
    where user_id = p_target_user_id;

    if v_verification_id is not null then
      update public.student_verifications
      set verification_status = 'under_review',
          reviewed_by = v_reviewer,
          reviewed_at = now()
      where id = v_verification_id;
    end if;

    return jsonb_build_object(
      'success', true,
      'status', 'under_review',
      'user_id', p_target_user_id,
      'message', 'Request marked as under review'
    );
  end if;

  if p_decision = 'approved' then
    if p_matched_institution_id is null or p_matched_course_id is null or p_matched_department_id is null then
      raise exception 'Approved requests require matching to verified catalog institution, program, and department IDs';
    end if;

    -- Verify matched catalog records exist and are active
    if not exists (
      select 1 from public.institutions i
      join public.institution_courses c on c.institution_id = i.id
      join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
      where i.id = p_matched_institution_id
        and c.id = p_matched_course_id
        and d.id = p_matched_department_id
        and i.status = 'active'
        and c.status = 'active'
        and d.status = 'active'
    ) then
      raise exception 'The selected institution, program, or department is not active in the verified catalog';
    end if;

    -- Update student profile with verified catalog links and approve account
    update public.profiles
    set institution_id = p_matched_institution_id,
        course_id = p_matched_course_id,
        department_id = p_matched_department_id,
        account_status = 'approved',
        updated_at = now()
    where id = p_target_user_id;

    -- Update registration request
    update public.student_registration_requests
    set request_status = 'matched',
        reviewed_by = v_reviewer,
        reviewed_at = now(),
        reviewer_note = nullif(v_clean_note, '')
    where user_id = p_target_user_id;

    -- Update or create verification row
    if v_verification_id is not null then
      update public.student_verifications
      set verification_status = 'approved',
          reviewed_by = v_reviewer,
          reviewed_at = now(),
          reviewer_note = nullif(v_clean_note, '')
      where id = v_verification_id;

      insert into public.verification_reviews (verification_id, reviewer_id, decision, notes)
      values (v_verification_id, v_reviewer, 'approved', nullif(v_clean_note, ''));
    end if;

    return jsonb_build_object(
      'success', true,
      'status', 'approved',
      'user_id', p_target_user_id,
      'institution_id', p_matched_institution_id,
      'message', 'Student approved and matched to verified institution catalog'
    );
  end if;

  -- Rejection or More Information Required
  update public.student_registration_requests
  set request_status = p_decision,
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      reviewer_note = v_clean_note
  where user_id = p_target_user_id;

  update public.profiles
  set account_status = p_decision,
      updated_at = now()
  where id = p_target_user_id;

  if v_verification_id is not null then
    update public.student_verifications
    set verification_status = p_decision,
        reviewed_by = v_reviewer,
        reviewed_at = now(),
        reviewer_note = v_clean_note
    where id = v_verification_id;

    insert into public.verification_reviews (verification_id, reviewer_id, decision, notes)
    values (v_verification_id, v_reviewer, p_decision, v_clean_note);
  end if;

  return jsonb_build_object(
    'success', true,
    'status', p_decision,
    'user_id', p_target_user_id,
    'notes', v_clean_note,
    'message', 'Verification decision successfully recorded and audited'
  );
end;
$$;

revoke all on function public.review_student_registration_request(uuid, text, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.review_student_registration_request(uuid, text, text, uuid, uuid, uuid) to authenticated;

commit;
