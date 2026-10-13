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
