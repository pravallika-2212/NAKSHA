-- ============================================================
-- SOURCE: supabase/migrations/202610120001_phase2_identity.sql
-- ============================================================
-- Ascendiq Phase 2: catalog, student profile, verification and least-privilege access.
-- Apply using the Supabase SQL Editor or `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 180),
  status text not null default 'inactive' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.institution_courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 180),
  duration_years smallint not null check (duration_years between 1 and 12),
  status text not null default 'inactive' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (institution_id, id)
);

create table if not exists public.institution_departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid not null,
  name text not null check (length(trim(name)) between 2 and 180),
  status text not null default 'inactive' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  foreign key (institution_id, course_id) references public.institution_courses(institution_id, id) on delete cascade,
  unique (institution_id, course_id, name),
  unique (institution_id, course_id, id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 180),
  institution_id uuid not null references public.institutions(id),
  course_id uuid not null,
  department_id uuid not null,
  academic_year smallint not null check (academic_year between 1 and 12),
  admission_year smallint check (admission_year between 1950 and 2200),
  student_id text not null check (length(trim(student_id)) between 1 and 100),
  privacy_consent_at timestamptz not null default now(),
  account_status text not null default 'pending' check (account_status in ('pending','approved','rejected','needs_more_information')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (institution_id, course_id) references public.institution_courses(institution_id, id),
  foreign key (institution_id, course_id, department_id) references public.institution_departments(institution_id, course_id, id),
  unique (institution_id, student_id)
);

create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  role text not null check (role in ('reviewer','admin')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (user_id, institution_id)
);

create table if not exists public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_storage_path text,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected','needs_more_information')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewer_note text check (reviewer_note is null or length(reviewer_note) <= 2000),
  constraint verification_document_owner_path check (
    document_storage_path is null or split_part(document_storage_path, '/', 1) = user_id::text
  )
);

create index if not exists institution_courses_active_lookup on public.institution_courses(institution_id, name) where status = 'active';
create index if not exists institution_departments_active_lookup on public.institution_departments(institution_id, course_id, name) where status = 'active';
create index if not exists profiles_institution_status_lookup on public.profiles(institution_id, account_status);
create index if not exists student_verifications_user_status_lookup on public.student_verifications(user_id, verification_status);
create index if not exists institution_memberships_active_lookup on public.institution_memberships(user_id, institution_id) where status = 'active';
create unique index if not exists one_pending_verification_per_student on public.student_verifications(user_id) where verification_status = 'pending';

create or replace function public.is_institution_reviewer(target_institution uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.institution_memberships m
    where m.user_id = (select auth.uid())
      and m.institution_id = target_institution
      and m.status = 'active'
      and m.role in ('reviewer','admin')
  );
$$;

create or replace function public.can_review_verification_document(object_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.student_verifications v
    join public.profiles p on p.id = v.user_id
    where v.document_storage_path = object_path
      and public.is_institution_reviewer(p.institution_id)
  );
$$;

revoke all on function public.is_institution_reviewer(uuid) from public, anon;
grant execute on function public.is_institution_reviewer(uuid) to authenticated;
revoke all on function public.can_review_verification_document(text) from public, anon;
grant execute on function public.can_review_verification_document(text) to authenticated;

create or replace function public.handle_new_student_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := new.raw_user_meta_data;
begin
  if coalesce(meta->>'privacy_consent','false') <> 'true' then
    raise exception 'Privacy consent is required';
  end if;
  if not exists (
    select 1 from public.institutions i
    join public.institution_courses c on c.institution_id = i.id
    join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
    where i.id = (meta->>'institution_id')::uuid
      and c.id = (meta->>'course_id')::uuid
      and d.id = (meta->>'department_id')::uuid
      and i.status = 'active' and c.status = 'active' and d.status = 'active'
      and (meta->>'academic_year')::smallint between 1 and c.duration_years
  ) then
    raise exception 'Selected institution, program, department, or academic year is not active';
  end if;
  insert into public.profiles (
    id, full_name, institution_id, course_id, department_id, academic_year,
    admission_year, student_id, privacy_consent_at, account_status
  ) values (
    new.id,
    trim(meta->>'full_name'),
    (meta->>'institution_id')::uuid,
    (meta->>'course_id')::uuid,
    (meta->>'department_id')::uuid,
    (meta->>'academic_year')::smallint,
    nullif(meta->>'admission_year','')::smallint,
    trim(meta->>'student_id'),
    now(),
    'pending'
  );
  -- Signup metadata is only a transport for this trigger. Do not leave student
  -- identifiers or academic details in user_metadata/JWT claims after copying.
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_student_profile on auth.users;
create trigger on_auth_user_created_student_profile
  after insert on auth.users
  for each row execute function public.handle_new_student_signup();
revoke all on function public.handle_new_student_signup() from public, anon, authenticated;

create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

create or replace function public.validate_student_profile_catalog()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.institutions i
    join public.institution_courses c on c.institution_id = i.id
    join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
    where i.id = new.institution_id and c.id = new.course_id and d.id = new.department_id
      and i.status = 'active' and c.status = 'active' and d.status = 'active'
      and new.academic_year between 1 and c.duration_years
  ) then
    raise exception 'Selected institution, program, department, or academic year is not active';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_validate_catalog on public.profiles;
create trigger profiles_validate_catalog before insert or update of institution_id, course_id, department_id, academic_year on public.profiles
  for each row execute function public.validate_student_profile_catalog();

create or replace function public.sync_verification_profile_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set account_status = new.verification_status where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists verification_status_to_profile on public.student_verifications;
create trigger verification_status_to_profile after insert or update on public.student_verifications
  for each row execute function public.sync_verification_profile_status();

alter table public.institutions enable row level security;
alter table public.institution_courses enable row level security;
alter table public.institution_departments enable row level security;
alter table public.profiles enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.student_verifications enable row level security;

drop policy if exists "active institutions readable" on public.institutions;
create policy "active institutions readable" on public.institutions for select to anon, authenticated using (status = 'active');
drop policy if exists "active courses readable" on public.institution_courses;
create policy "active courses readable" on public.institution_courses for select to anon, authenticated using (status = 'active' and exists (select 1 from public.institutions i where i.id = institution_id and i.status = 'active'));
drop policy if exists "active departments readable" on public.institution_departments;
create policy "active departments readable" on public.institution_departments for select to anon, authenticated using (status = 'active' and exists (select 1 from public.institutions i where i.id = institution_id and i.status = 'active'));

drop policy if exists "own profile or institution reviewer reads profile" on public.profiles;
create policy "own profile or institution reviewer reads profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_institution_reviewer(institution_id));
drop policy if exists "student updates own profile fields" on public.profiles;
create policy "student updates own profile fields" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and account_status in ('pending','needs_more_information'))
  with check (id = (select auth.uid()) and account_status in ('pending','needs_more_information'));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, course_id, department_id, academic_year, admission_year, student_id) on public.profiles to authenticated;

drop policy if exists "user reads own institution membership" on public.institution_memberships;
create policy "user reads own institution membership" on public.institution_memberships for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.institution_memberships from anon, authenticated;
grant select on public.institution_memberships to authenticated;

drop policy if exists "student reads own verification" on public.student_verifications;
create policy "student reads own verification" on public.student_verifications for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = user_id and public.is_institution_reviewer(p.institution_id)));
drop policy if exists "student submits own verification" on public.student_verifications;
create policy "student submits own verification" on public.student_verifications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and verification_status = 'pending'
    and reviewed_at is null and reviewed_by is null and reviewer_note is null
    and exists (select 1 from public.profiles p where p.id = user_id and p.account_status in ('pending','needs_more_information'))
  );
drop policy if exists "institution reviewer updates verification" on public.student_verifications;
revoke all on public.student_verifications from anon, authenticated;
grant select, insert on public.student_verifications to authenticated;

create table if not exists public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.student_verifications(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','rejected','needs_more_information')),
  notes text check (notes is null or length(notes) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.verification_reviews enable row level security;
drop policy if exists "reviewers read their institution review history" on public.verification_reviews;
create policy "reviewers read their institution review history" on public.verification_reviews for select to authenticated
  using (exists (select 1 from public.student_verifications v join public.profiles p on p.id = v.user_id where v.id = verification_id and public.is_institution_reviewer(p.institution_id)));
revoke all on public.verification_reviews from anon, authenticated;
grant select on public.verification_reviews to authenticated;

create or replace function public.submit_verification_review(target_verification uuid, decision text, notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  reviewer uuid := (select auth.uid());
  student uuid;
  institution uuid;
begin
  if reviewer is null or decision not in ('approved','rejected','needs_more_information') then
    raise exception 'Not authorized to review this submission';
  end if;
  select p.id, p.institution_id into student, institution
    from public.student_verifications v join public.profiles p on p.id = v.user_id
    where v.id = target_verification;
  if student is null or student = reviewer or not public.is_institution_reviewer(institution) then
    raise exception 'Not authorized to review this submission';
  end if;
  update public.student_verifications
    set verification_status = decision, reviewed_by = reviewer, reviewed_at = now(), reviewer_note = left(notes, 2000)
    where id = target_verification;
  insert into public.verification_reviews (verification_id, reviewer_id, decision, notes)
    values (target_verification, reviewer, decision, left(notes, 2000));
end;
$$;
revoke all on function public.submit_verification_review(uuid, text, text) from public, anon;
grant execute on function public.submit_verification_review(uuid, text, text) to authenticated;

grant select on public.institutions, public.institution_courses, public.institution_departments to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-verifications','student-verifications',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf','image/jpeg','image/png'];

drop policy if exists "student uploads own verification file" on storage.objects;
create policy "student uploads own verification file" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-verifications' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "student or reviewer reads verification file" on storage.objects;
create policy "student or reviewer reads verification file" on storage.objects for select to authenticated
  using (bucket_id = 'student-verifications' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_review_verification_document(name)));

-- Catalog records are managed by institution administrators through trusted SQL/admin tooling.
revoke insert, update, delete on public.institutions, public.institution_courses, public.institution_departments from anon, authenticated;



-- ============================================================
-- SOURCE: supabase/migrations/202610120002_catalog_metadata.sql
-- ============================================================
-- Phase 2B catalog fields for verified real entries vs explicitly synthetic demos.
-- Additive migration: preserve existing catalog and student data.

alter table public.institutions
  add column if not exists code text,
  add column if not exists institution_type text not null default 'other'
    check (institution_type in ('college','university','other')),
  add column if not exists state text,
  add column if not exists district text,
  add column if not exists is_demo boolean not null default false,
  add column if not exists catalog_source_url text,
  add column if not exists catalog_verified_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists institutions_code_unique
  on public.institutions (code) where code is not null and length(trim(code)) > 0;
create index if not exists institutions_active_name_lookup
  on public.institutions (name) where status = 'active';

create or replace function public.touch_institution_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists institutions_updated_at on public.institutions;
create trigger institutions_updated_at before update on public.institutions
  for each row execute function public.touch_institution_updated_at();

-- Synthetic demo rows can be selected to inspect the UI, but never used to create profiles.
create or replace function public.prevent_demo_student_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if nullif(new.raw_user_meta_data->>'institution_id','') is not null
    and exists (
      select 1 from public.institutions i
      where i.id = (new.raw_user_meta_data->>'institution_id')::uuid and i.is_demo
    ) then
    raise exception 'Demo catalog records cannot be used for student registration';
  end if;
  return new;
end;
$$;
drop trigger if exists a_prevent_demo_student_signup on auth.users;
create trigger a_prevent_demo_student_signup before insert on auth.users
  for each row execute function public.prevent_demo_student_signup();
revoke all on function public.prevent_demo_student_signup() from public, anon, authenticated;

-- Auth-created staff accounts have no student catalog metadata and therefore do
-- not receive a student profile. A trusted administrator adds their membership.
create or replace function public.handle_new_student_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := new.raw_user_meta_data;
begin
  if nullif(meta->>'institution_id','') is null then
    return new;
  end if;
  if coalesce(meta->>'privacy_consent','false') <> 'true' then
    raise exception 'Privacy consent is required';
  end if;
  if not exists (
    select 1 from public.institutions i
    join public.institution_courses c on c.institution_id = i.id
    join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
    where i.id = (meta->>'institution_id')::uuid
      and c.id = (meta->>'course_id')::uuid
      and d.id = (meta->>'department_id')::uuid
      and i.status = 'active' and not i.is_demo
      and c.status = 'active' and d.status = 'active'
      and (meta->>'academic_year')::smallint between 1 and c.duration_years
  ) then
    raise exception 'Selected institution, program, department, or academic year is not active for student registration';
  end if;
  insert into public.profiles (
    id, full_name, institution_id, course_id, department_id, academic_year,
    admission_year, student_id, privacy_consent_at, account_status
  ) values (
    new.id, trim(meta->>'full_name'), (meta->>'institution_id')::uuid,
    (meta->>'course_id')::uuid, (meta->>'department_id')::uuid,
    (meta->>'academic_year')::smallint, nullif(meta->>'admission_year','')::smallint,
    trim(meta->>'student_id'), now(), 'pending'
  );
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = new.id;
  return new;
end;
$$;
revoke all on function public.handle_new_student_signup() from public, anon, authenticated;

create or replace function public.validate_student_profile_catalog()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.institutions i
    join public.institution_courses c on c.institution_id = i.id
    join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
    where i.id = new.institution_id and c.id = new.course_id and d.id = new.department_id
      and i.status = 'active' and not i.is_demo and c.status = 'active' and d.status = 'active'
      and new.academic_year between 1 and c.duration_years
  ) then
    raise exception 'Selected institution, program, department, or academic year is not active for registration';
  end if;
  return new;
end;
$$;

-- Departments must belong to active institutions and active programs to be publicly visible.
drop policy if exists "active departments readable" on public.institution_departments;
create policy "active departments readable" on public.institution_departments for select to anon, authenticated
  using (
    status = 'active'
    and exists (select 1 from public.institutions i where i.id = institution_id and i.status = 'active')
    and exists (select 1 from public.institution_courses c where c.id = course_id and c.institution_id = institution_id and c.status = 'active')
  );

-- Restrict anonymous/authenticated reads to only the fields needed by registration.
-- Existing migration policies continue to filter to active institutions/courses/departments.
revoke all on public.institutions, public.institution_courses, public.institution_departments from anon, authenticated;
grant select (id, name, status, is_demo) on public.institutions to anon, authenticated;
grant select (id, institution_id, name, duration_years, status) on public.institution_courses to anon, authenticated;
grant select (id, institution_id, course_id, name, status) on public.institution_departments to anon, authenticated;



-- ============================================================
-- SOURCE: supabase/migrations/202610120003_phase3_portal_access.sql
-- ============================================================
-- Phase 3: additive role memberships and faculty-to-student authorization.
-- Apply after migrations 001 and 002. No existing rows are deleted.

begin;

alter table public.institution_memberships
  drop constraint if exists institution_memberships_role_check;
alter table public.institution_memberships
  add constraint institution_memberships_role_check
  check (role in ('reviewer', 'admin', 'faculty', 'placement_officer'));

-- Required as the target key for the institution-scoped assignment foreign key.
create unique index if not exists profiles_institution_profile_unique
  on public.profiles (institution_id, id);

create table if not exists public.faculty_student_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  faculty_user_id uuid not null,
  student_profile_id uuid not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (institution_id, faculty_user_id, student_profile_id),
  foreign key (faculty_user_id, institution_id)
    references public.institution_memberships(user_id, institution_id) on delete cascade,
  foreign key (institution_id, student_profile_id)
    references public.profiles(institution_id, id) on delete cascade
);

create index if not exists faculty_assignments_active_by_faculty
  on public.faculty_student_assignments (faculty_user_id, institution_id, student_profile_id)
  where status = 'active';

alter table public.faculty_student_assignments enable row level security;

drop policy if exists "faculty reads own assignments" on public.faculty_student_assignments;
create policy "faculty reads own assignments"
  on public.faculty_student_assignments for select to authenticated
  using (
    faculty_user_id = (select auth.uid())
    and status = 'active'
    and exists (
      select 1 from public.institution_memberships m
      where m.user_id = (select auth.uid())
        and m.institution_id = faculty_student_assignments.institution_id
        and m.role = 'faculty'
        and m.status = 'active'
    )
  );

revoke all on public.faculty_student_assignments from anon, authenticated;
grant select on public.faculty_student_assignments to authenticated;
-- Assignment writes are deliberately unavailable to browser roles. A trusted
-- institution operator provisions membership and assignments through SQL/admin tooling.

drop policy if exists "faculty reads assigned student profiles" on public.profiles;
create policy "faculty reads assigned student profiles"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.faculty_student_assignments a
      join public.institution_memberships m
        on m.user_id = a.faculty_user_id and m.institution_id = a.institution_id
      where a.student_profile_id = profiles.id
        and a.institution_id = profiles.institution_id
        and a.faculty_user_id = (select auth.uid())
        and a.status = 'active'
        and m.role = 'faculty'
        and m.status = 'active'
    )
  );

drop policy if exists "faculty reads assigned student verifications" on public.student_verifications;
create policy "faculty reads assigned student verifications"
  on public.student_verifications for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      join public.faculty_student_assignments a
        on a.student_profile_id = p.id and a.institution_id = p.institution_id
      join public.institution_memberships m
        on m.user_id = a.faculty_user_id and m.institution_id = a.institution_id
      where p.id = student_verifications.user_id
        and a.faculty_user_id = (select auth.uid())
        and a.status = 'active'
        and m.role = 'faculty'
        and m.status = 'active'
    )
  );

commit;


-- ============================================================
-- SOURCE: supabase/migrations/202610120004_phase4_data_analytics.sql
-- ============================================================
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


-- ============================================================
-- SOURCE: supabase/migrations/202610120005_explainable_intelligence.sql
-- ============================================================
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


-- ============================================================
-- SOURCE: supabase/migrations/202610120006_student_registration_identity.sql
-- ============================================================
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


-- ============================================================
-- SOURCE: supabase/migrations/202610120007_manual_institution_registration.sql
-- ============================================================
-- Manual institution entry creates a pending registration request, never a
-- trusted institution or catalog row. Apply after migrations 001-006.
begin;

-- A profile can exist while its institution/program are awaiting trusted
-- catalog matching. Existing linked profiles and their foreign keys remain.
alter table public.profiles alter column institution_id drop not null;
alter table public.profiles alter column course_id drop not null;
alter table public.profiles alter column department_id drop not null;

create table if not exists public.student_registration_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution_name text not null check (length(btrim(institution_name)) between 2 and 180),
  program_name text not null check (length(btrim(program_name)) between 2 and 180),
  department_name text not null check (length(btrim(department_name)) between 2 and 180),
  admission_year smallint not null check (admission_year between 1950 and 2200),
  current_study_year smallint not null check (current_study_year between 1 and 12),
  roll_number text not null check (length(btrim(roll_number)) between 1 and 100),
  request_status text not null default 'pending'
    check (request_status in ('pending','matched','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewer_note text check (reviewer_note is null or length(reviewer_note) <= 2000)
);

comment on table public.student_registration_requests is
  'Unverified student-submitted institution/program details. These values are not catalog records and do not authorize access.';
comment on column public.student_registration_requests.request_status is
  'Only a trusted operator may mark a request matched or rejected after independent catalog verification.';

create unique index if not exists student_registration_requests_roll_cohort_unique
  on public.student_registration_requests
    (lower(btrim(institution_name)), admission_year, lower(btrim(roll_number)));
create index if not exists student_registration_requests_pending_recent
  on public.student_registration_requests (submitted_at)
  where request_status = 'pending';

alter table public.student_registration_requests enable row level security;
revoke all on public.student_registration_requests from public, anon, authenticated;
grant select on public.student_registration_requests to authenticated;
drop policy if exists "students read own registration request" on public.student_registration_requests;
create policy "students read own registration request"
  on public.student_registration_requests for select to authenticated
  using (user_id = (select auth.uid()));
-- No browser-role INSERT/UPDATE/DELETE grants or review policy are provided.
-- The security-definer signup trigger creates requests; a trusted operator
-- reviews/matches them through privileged database tooling.

-- Temporary API capability check lets the UI disable this flow until this
-- migration is installed, avoiding Auth users with no corresponding profile.
create or replace function public.manual_institution_registration_ready()
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select true;
$$;
revoke all on function public.manual_institution_registration_ready() from public, anon, authenticated;
grant execute on function public.manual_institution_registration_ready() to anon, authenticated;

-- Keep the existing verified catalog signup path for older clients. When no
-- institution UUID is supplied, store the names as a pending request only.
create or replace function public.handle_new_student_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := new.raw_user_meta_data;
  roll text := btrim(coalesce(nullif(meta->>'roll_number',''), meta->>'student_id',''));
  institution_name text := btrim(coalesce(meta->>'institution_name',''));
  program_name text := btrim(coalesce(meta->>'program_name',''));
  department_name text := btrim(coalesce(meta->>'department_name',''));
  admission smallint;
  study_year smallint;
  duration smallint;
  year_start smallint;
  latest_study_year integer;
begin
  -- Staff accounts without student registration metadata remain unchanged.
  if nullif(meta->>'institution_id','') is null
     and institution_name = '' then
    return new;
  end if;
  if coalesce(meta->>'privacy_consent','false') <> 'true' then
    raise exception 'Privacy consent is required';
  end if;
  if length(roll) not between 1 and 100 then
    raise exception 'Roll number must be between 1 and 100 characters';
  end if;
  if nullif(meta->>'full_name','') is null
     or length(btrim(meta->>'full_name')) not between 2 and 180 then
    raise exception 'Enter a valid full name';
  end if;
  if nullif(meta->>'admission_year','') is null then
    raise exception 'Admission year is required';
  end if;
  admission := (meta->>'admission_year')::smallint;
  study_year := (meta->>'academic_year')::smallint;
  if study_year is null then
    raise exception 'Current year of study is required';
  end if;
  if admission < 1950 or admission > extract(year from current_date)::integer then
    raise exception 'Admission year is outside the allowed range';
  end if;

  if nullif(meta->>'institution_id','') is not null then
    -- Existing catalog-linked signups must still resolve to an active,
    -- independently verified non-demo institution and its active program.
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
  else
    -- Manual values are claims, never catalog entries. Do not let an exact
    -- existing demo name be used as a substitute for a real institution.
    if exists (
      select 1 from public.institutions i
      where i.is_demo and lower(btrim(i.name)) = lower(institution_name)
    ) then
      raise exception 'Demo institution entries cannot be used for student registration';
    end if;
    if length(institution_name) not between 2 and 180 then
      raise exception 'Enter a valid institution name';
    end if;
    if length(program_name) not between 2 and 180 then
      raise exception 'Enter a valid program name';
    end if;
    if length(department_name) not between 2 and 180 then
      raise exception 'Enter a valid department name';
    end if;
    if study_year < 1 or study_year > 12 then
      raise exception 'Current study year must be between 1 and 12 while institution details are pending verification';
    end if;

    insert into public.student_registration_requests (
      user_id, institution_name, program_name, department_name,
      admission_year, current_study_year, roll_number
    ) values (
      new.id, institution_name, program_name, department_name,
      admission, study_year, roll
    );
    insert into public.profiles (
      id, full_name, institution_id, course_id, department_id, academic_year,
      admission_year, student_id, roll_number, privacy_consent_at, account_status
    ) values (
      new.id, btrim(meta->>'full_name'), null, null, null, study_year,
      admission, roll, roll, now(), 'pending'
    );
  end if;

  -- Student details are not retained in auth metadata/JWT claims.
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = new.id;
  return new;
end;
$$;
revoke all on function public.handle_new_student_signup() from public, anon, authenticated;

-- Permit only a complete, server-created unlinked request profile. Once a
-- trusted operator links real catalog IDs, enforce the usual verified program
-- and study-year rules below.
create or replace function public.validate_student_profile_catalog()
returns trigger language plpgsql set search_path = '' as $$
declare
  duration smallint;
  year_start smallint;
  latest_study_year integer;
begin
  new.roll_number := btrim(new.roll_number);
  if length(new.roll_number) not between 1 and 100 then
    raise exception 'Roll number must be between 1 and 100 characters';
  end if;
  if new.institution_id is null and new.course_id is null and new.department_id is null then
    if not exists (
      select 1 from public.student_registration_requests r
      where r.user_id = new.id
        and r.request_status = 'pending'
        and r.admission_year = new.admission_year
        and r.current_study_year = new.academic_year
        and lower(btrim(r.roll_number)) = lower(new.roll_number)
    ) then
      raise exception 'An unlinked profile requires a pending institution registration request';
    end if;
    return new;
  end if;
  if new.institution_id is null or new.course_id is null or new.department_id is null then
    raise exception 'Institution, program, and department catalog IDs must be linked together';
  end if;
  if new.admission_year is null or new.admission_year < 1950
     or new.admission_year > extract(year from current_date)::integer then
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
  if duration is null or new.academic_year < 1 or new.academic_year > duration
     or new.academic_year > latest_study_year then
    raise exception 'Selected institution, program, department, admission year, or study year is invalid';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_validate_catalog on public.profiles;
create trigger profiles_validate_catalog before insert or update of
  institution_id, course_id, department_id, academic_year, admission_year, roll_number
  on public.profiles for each row execute function public.validate_student_profile_catalog();

commit;


-- ============================================================
-- SOURCE: supabase/seed.sql
-- ============================================================
-- Synthetic catalog rows for safely previewing the registration dropdowns.
-- These are fictional examples, not real institutions, official codes, or offerings.
-- Demo institutions are selectable for UI testing but blocked by the signup trigger.
-- Idempotent and insert-only: stable IDs and ON CONFLICT DO NOTHING never
-- overwrite or delete existing catalog records. Apply migration 006 first.

begin;

insert into public.institutions (
  id, name, code, institution_type, state, district, status, is_demo,
  verification_status, academic_year_start_month, catalog_source_url, catalog_verified_at
)
values (
  'a1100000-0000-4000-8000-000000000001',
  'DEMO ONLY - AscendIQ Sample Institute',
  null,
  'other',
  null,
  null,
  'active',
  true,
  'demo',
  1,
  null,
  null
)
on conflict (id) do nothing;

insert into public.institution_courses (id, institution_id, name, duration_years, status)
values
  ('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','DEMO ONLY - Sample Program A',4,'active'),
  ('a1200000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000001','DEMO ONLY - Sample Program B',3,'active')
on conflict (id) do nothing;

insert into public.institution_departments (id, institution_id, course_id, name, status)
values
  ('a1300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','DEMO ONLY - Sample Department A1','active'),
  ('a1300000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','DEMO ONLY - Sample Department A2','active'),
  ('a1300000-0000-4000-8000-000000000003','a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002','DEMO ONLY - Sample Department B1','active')
on conflict (id) do nothing;

commit;


