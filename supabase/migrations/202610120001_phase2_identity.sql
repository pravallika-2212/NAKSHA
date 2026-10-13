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

