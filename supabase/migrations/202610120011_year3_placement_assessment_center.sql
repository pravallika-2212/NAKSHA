-- Migration 011: Year 3 Placement Preparation & Assessment Center
-- Defines tables for assessment test catalog, student test attempts,
-- recorded answers, and integrity audit events with user-scoped Row Level Security.

create table if not exists public.assessment_tests (
  id text primary key,
  title text not null,
  category text not null check (category in ('aptitude', 'technical', 'mock')),
  sub_category text not null,
  description text not null,
  duration_minutes integer not null default 30,
  question_count integer not null default 15,
  total_marks numeric not null default 15,
  marks_per_question numeric not null default 1.0,
  negative_marks numeric not null default 0.0,
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  created_at timestamptz default now()
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null references public.assessment_tests(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'auto_submitted_timeout', 'terminated_by_integrity')),
  started_at timestamptz default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  submission_reason text default 'manual_submission',
  raw_score numeric,
  adjusted_score numeric,
  percentage_score numeric,
  total_questions integer not null,
  correct_count integer default 0,
  incorrect_count integer default 0,
  unanswered_count integer default 0,
  violation_count integer default 0,
  penalty_applied boolean default false,
  time_spent_seconds integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  selected_option text,
  marked_for_review boolean default false,
  is_correct boolean,
  updated_at timestamptz default now(),
  constraint uq_attempt_question unique (attempt_id, question_id)
);

create table if not exists public.assessment_integrity_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('tab_hidden', 'fullscreen_exit', 'window_blur')),
  violation_number integer not null,
  details text,
  logged_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.assessment_tests enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.assessment_integrity_events enable row level security;

-- Policies for assessment_tests (public/authenticated read)
drop policy if exists "anyone can read active tests" on public.assessment_tests;
create policy "anyone can read active tests" on public.assessment_tests
  for select to authenticated, anon
  using (true);

-- Policies for assessment_attempts (students manage only their own attempts)
drop policy if exists "students select own attempts" on public.assessment_attempts;
create policy "students select own attempts" on public.assessment_attempts
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "students insert own attempts" on public.assessment_attempts;
create policy "students insert own attempts" on public.assessment_attempts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "students update own attempts" on public.assessment_attempts;
create policy "students update own attempts" on public.assessment_attempts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for assessment_answers
drop policy if exists "students select own answers" on public.assessment_answers;
create policy "students select own answers" on public.assessment_answers
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "students insert own answers" on public.assessment_answers;
create policy "students insert own answers" on public.assessment_answers
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "students update own answers" on public.assessment_answers;
create policy "students update own answers" on public.assessment_answers
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for assessment_integrity_events
drop policy if exists "students select own integrity events" on public.assessment_integrity_events;
create policy "students select own integrity events" on public.assessment_integrity_events
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "students insert own integrity events" on public.assessment_integrity_events;
create policy "students insert own integrity events" on public.assessment_integrity_events
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Grant permissions to authenticated
grant select on public.assessment_tests to authenticated, anon;
grant select, insert, update on public.assessment_attempts to authenticated;
grant select, insert, update on public.assessment_answers to authenticated;
grant select, insert on public.assessment_integrity_events to authenticated;
