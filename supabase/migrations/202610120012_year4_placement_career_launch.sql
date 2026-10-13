-- ==============================================================================
-- ASCENDIQ Migration 012: Year 4 Placement & Career Launch Engine
-- Tables, RLS Policies, and Indexes for:
-- 1. Resumes & ATS Scoring
-- 2. Mock Interviews & Structured Feedback
-- 3. Placement Application Tracker
-- 4. Personalized Career Action Plans
-- 5. Offer & Placement Outcome Tracker
-- ==============================================================================

-- 1. Student Resumes & ATS Readiness
CREATE TABLE IF NOT EXISTS public.student_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_role VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    education JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    ats_score_estimate NUMERIC(5, 2),
    ats_breakdown JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_student_resumes_user ON public.student_resumes(user_id);

-- 2. Mock Interviews & AI Feedback Sessions
CREATE TABLE IF NOT EXISTS public.student_mock_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interview_type VARCHAR(100) NOT NULL, -- hr_behavioral, technical_cs, role_specific, company_focused
    target_company VARCHAR(255),
    target_role VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    overall_score NUMERIC(5, 2),
    overall_feedback JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_mock_interviews_user ON public.student_mock_interviews(user_id);

-- 3. Placement Application Tracker
CREATE TABLE IF NOT EXISTS public.student_placement_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    job_link TEXT,
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    deadline DATE,
    interview_date TIMESTAMPTZ,
    resume_version_id UUID REFERENCES public.student_resumes(id) ON DELETE SET NULL,
    resume_title VARCHAR(255),
    notes TEXT,
    next_action VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_student_placement_applications_user ON public.student_placement_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_placement_applications_status ON public.student_placement_applications(status);

-- 4. Personalized Career Action Plans
CREATE TABLE IF NOT EXISTS public.student_career_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium', -- High, Medium, Low
    due_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    related_component VARCHAR(100) NOT NULL, -- resume, technical, aptitude, interview, skills
    notes TEXT,
    is_ai_recommended BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_student_career_action_plans_user ON public.student_career_action_plans(user_id);

-- 5. Offer and Placement Outcome Tracker
CREATE TABLE IF NOT EXISTS public.student_placement_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    outcome_status VARCHAR(50) NOT NULL DEFAULT 'Under Consideration', -- Accepted, Declined, Under Consideration, Deferred
    compensation_details TEXT, -- optional & private to owning student
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_student_placement_offers_user ON public.student_placement_offers(user_id);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- Strictly limits read/write access to the owning authenticated student.
-- ==============================================================================

ALTER TABLE public.student_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_placement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_career_action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_placement_offers ENABLE ROW LEVEL SECURITY;

-- Resumes RLS
DROP POLICY IF EXISTS "Students manage own resumes" ON public.student_resumes;
CREATE POLICY "Students manage own resumes"
ON public.student_resumes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Mock Interviews RLS
DROP POLICY IF EXISTS "Students manage own mock interviews" ON public.student_mock_interviews;
CREATE POLICY "Students manage own mock interviews"
ON public.student_mock_interviews
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Placement Applications RLS
DROP POLICY IF EXISTS "Students manage own placement applications" ON public.student_placement_applications;
CREATE POLICY "Students manage own placement applications"
ON public.student_placement_applications
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Career Action Plans RLS
DROP POLICY IF EXISTS "Students manage own action plans" ON public.student_career_action_plans;
CREATE POLICY "Students manage own action plans"
ON public.student_career_action_plans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Placement Offers RLS (Private to owning student)
DROP POLICY IF EXISTS "Students manage own placement offers" ON public.student_placement_offers;
CREATE POLICY "Students manage own placement offers"
ON public.student_placement_offers
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
