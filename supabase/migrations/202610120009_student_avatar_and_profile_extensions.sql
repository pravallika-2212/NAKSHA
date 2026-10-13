-- Migration 009: Student Profile Avatar & Personal Profile Extensions
-- Adds avatar_url, phone, bio, skills, and interests to public.profiles.
-- Configures student-avatars storage bucket with user-scoped RLS policies.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[];
alter table public.profiles add column if not exists interests text[];

-- Grant authenticated students permission to update their own editable personal fields.
-- Institutional fields (institution_id, course_id, department_id, account_status, student_id, roll_number) remain strictly protected.
grant update (full_name, avatar_url, phone, bio, skills, interests) on public.profiles to authenticated;

-- Set up dedicated student-avatars bucket (public = true for fast avatar rendering with cacheable URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-avatars', 'student-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: A student may only upload, update, or delete files within their own user_id directory
drop policy if exists "student uploads own avatar" on storage.objects;
create policy "student uploads own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "student updates own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "student deletes own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "public reads student avatar" on storage.objects;
create policy "public reads student avatar" on storage.objects for select to public, authenticated
  using (bucket_id = 'student-avatars');
