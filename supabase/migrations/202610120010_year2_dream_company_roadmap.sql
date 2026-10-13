-- Migration 010: Year 2 Student Dream Company Roadmap & Skill Progress
-- Persists dream company preferences, target roles, and personalized skill roadmap progress per authenticated student.

create table if not exists public.student_dream_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  target_role text not null,
  target_timeframe text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_student_dream_roadmaps_user unique (user_id)
);

create table if not exists public.student_skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  skill_name text not null,
  category text not null,
  status text not null check (status in ('not_started', 'in_progress', 'completed')),
  is_verified boolean default false,
  exercise_completed boolean default false,
  project_completed boolean default false,
  notes text,
  updated_at timestamptz default now(),
  constraint uq_student_skill_progress_user_skill unique (user_id, skill_id)
);

-- Enable Row Level Security
alter table public.student_dream_roadmaps enable row level security;
alter table public.student_skill_progress enable row level security;

-- RLS Policies for student_dream_roadmaps
drop policy if exists "student selects own dream roadmap" on public.student_dream_roadmaps;
create policy "student selects own dream roadmap" on public.student_dream_roadmaps
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "student inserts own dream roadmap" on public.student_dream_roadmaps;
create policy "student inserts own dream roadmap" on public.student_dream_roadmaps
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "student updates own dream roadmap" on public.student_dream_roadmaps;
create policy "student updates own dream roadmap" on public.student_dream_roadmaps
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "student deletes own dream roadmap" on public.student_dream_roadmaps;
create policy "student deletes own dream roadmap" on public.student_dream_roadmaps
  for delete to authenticated
  using (auth.uid() = user_id);

-- RLS Policies for student_skill_progress
drop policy if exists "student selects own skill progress" on public.student_skill_progress;
create policy "student selects own skill progress" on public.student_skill_progress
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "student inserts own skill progress" on public.student_skill_progress;
create policy "student inserts own skill progress" on public.student_skill_progress
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "student updates own skill progress" on public.student_skill_progress;
create policy "student updates own skill progress" on public.student_skill_progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "student deletes own skill progress" on public.student_skill_progress;
create policy "student deletes own skill progress" on public.student_skill_progress
  for delete to authenticated
  using (auth.uid() = user_id);

-- Grant table access to authenticated
grant select, insert, update, delete on public.student_dream_roadmaps to authenticated;
grant select, insert, update, delete on public.student_skill_progress to authenticated;
