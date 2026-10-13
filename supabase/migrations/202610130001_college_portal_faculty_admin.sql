-- ASCENDIQ Migration: College Login, Faculty Dashboard & College Admin Portal
-- Adds section column, faculty profiles, academic hour records, assignments, submissions, and club notifications.

-- 1. Add section to profiles if not present
alter table if exists public.profiles add column if not exists section text default 'A';

-- 2. Faculty Profiles
create table if not exists public.faculty_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  faculty_id text not null unique check (length(trim(faculty_id)) between 2 and 50),
  full_name text not null check (length(trim(full_name)) between 2 and 180),
  email text not null check (length(trim(email)) between 5 and 255),
  department text not null check (length(trim(department)) between 2 and 180),
  designation text not null check (length(trim(designation)) between 2 and 120),
  subjects text[] default '{}',
  office_room text,
  phone text,
  office_hours text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Academic Hour Records
create table if not exists public.academic_hour_records (
  id uuid primary key default gen_random_uuid(),
  faculty_user_id uuid references auth.users(id) on delete set null,
  faculty_name text not null,
  record_date date not null,
  academic_year smallint not null check (academic_year between 1 and 4),
  branch text not null,
  section text not null,
  subject text not null,
  topic_covered text not null,
  hours numeric(3,1) not null check (hours > 0 and hours <= 12),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  faculty_user_id uuid references auth.users(id) on delete set null,
  faculty_name text not null,
  academic_year smallint not null check (academic_year between 1 and 4),
  branch text not null,
  section text not null,
  subject text not null,
  title text not null check (length(trim(title)) between 3 and 250),
  instructions text not null,
  assigned_date date not null,
  due_date date not null,
  attachment_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now()
);

-- 5. Assignment Submissions
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id text not null,
  student_name text not null,
  student_email text,
  student_user_id uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in ('submitted', 'graded', 'resubmitted')),
  is_late boolean not null default false,
  submission_content text,
  file_url text,
  marks numeric(5,2) check (marks >= 0 and marks <= 100),
  feedback text,
  graded_by uuid references auth.users(id) on delete set null,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);

-- 6. Club Notifications
create table if not exists public.club_notifications (
  id uuid primary key default gen_random_uuid(),
  club_id text not null,
  club_name text not null,
  faculty_user_id uuid references auth.users(id) on delete set null,
  faculty_name text not null,
  title text not null check (length(trim(title)) between 3 and 250),
  message text not null,
  event_date date,
  location text,
  attachment_url text,
  published_at timestamptz not null default now()
);

-- 7. Club Notification Reads
create table if not exists public.club_notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.club_notifications(id) on delete cascade,
  student_id text not null,
  read_at timestamptz not null default now(),
  unique (notification_id, student_id)
);

-- Indexes for performance
create index if not exists idx_academic_hours_faculty on public.academic_hour_records(faculty_user_id, record_date desc);
create index if not exists idx_academic_hours_target on public.academic_hour_records(branch, academic_year, section);
create index if not exists idx_assignments_target on public.assignments(branch, academic_year, section, due_date desc);
create index if not exists idx_assignment_submissions_asg on public.assignment_submissions(assignment_id, student_id);
create index if not exists idx_club_notifications_club on public.club_notifications(club_id, published_at desc);

-- Enable RLS
alter table public.faculty_profiles enable row level security;
alter table public.academic_hour_records enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.club_notifications enable row level security;
alter table public.club_notification_reads enable row level security;

-- Policies for public and authenticated read
drop policy if exists 'public reads faculty profiles' on public.faculty_profiles;
create policy 'public reads faculty profiles' on public.faculty_profiles for select to authenticated, anon using (true);

drop policy if exists 'faculty updates own profile' on public.faculty_profiles;
create policy 'faculty updates own profile' on public.faculty_profiles for update to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists 'authenticated reads hour records' on public.academic_hour_records;
create policy 'authenticated reads hour records' on public.academic_hour_records for select to authenticated using (true);

drop policy if exists 'faculty inserts hour records' on public.academic_hour_records;
create policy 'faculty inserts hour records' on public.academic_hour_records for insert to authenticated with check (true);

drop policy if exists 'authenticated reads assignments' on public.assignments;
create policy 'authenticated reads assignments' on public.assignments for select to authenticated, anon using (true);

drop policy if exists 'faculty manages assignments' on public.assignments;
create policy 'faculty manages assignments' on public.assignments for all to authenticated using (true);

drop policy if exists 'authenticated reads submissions' on public.assignment_submissions;
create policy 'authenticated reads submissions' on public.assignment_submissions for select to authenticated, anon using (true);

drop policy if exists 'students insert submissions' on public.assignment_submissions;
create policy 'students insert submissions' on public.assignment_submissions for insert to authenticated with check (true);

drop policy if exists 'students update submissions' on public.assignment_submissions;
create policy 'students update submissions' on public.assignment_submissions for update to authenticated using (true);

drop policy if exists 'authenticated reads club notifications' on public.club_notifications;
create policy 'authenticated reads club notifications' on public.club_notifications for select to authenticated, anon using (true);

drop policy if exists 'authenticated manages notification reads' on public.club_notification_reads;
create policy 'authenticated manages notification reads' on public.club_notification_reads for all to authenticated using (true);
