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

