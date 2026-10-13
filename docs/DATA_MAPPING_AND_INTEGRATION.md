# ASCENDIQ: Data Mapping and Integration Note
*Unified Campus Analytics Data Schema & Integration Ledger*

---

## 1. Overview & Data Architecture

ASCENDIQ connects heterogeneous campus databases across student identity, academic registries, LMS platforms, attendance gates, and training & placement portals.

### Dual Data Engine Architecture:
1. **Supabase PostgreSQL (`iddgakcvvhuvbsbpmhkx.supabase.co`):**
   - Authoritative source for identity authentication, role memberships, student registration verification, and college catalog hierarchy (`institutions`, `institution_courses`, `institution_departments`).
2. **FastAPI Analytics Engine (`port 8000` / SQLite / In-Memory Cache):**
   - Normalized analytics store processing real-time Success Scores, Risk Scores, cohort aggregations, and human-in-the-loop intervention tracking.

---

## 2. Comprehensive Indicator Mapping Table

| Indicator | Source System / Table | Source Fields | Normalization / Aggregation Method | Period & Granularity | Data Provenance State |
|---|---|---|---|---|---|
| **Identity & Enrollment** | Supabase `profiles`, `student_registration_requests` | `id`, `full_name`, `roll_number`, `academic_year`, `account_status` | Direct lookup; filtered by `auth.uid() = id` | Academic Year / Semester | **Real Database Record** |
| **Catalog Affiliation** | Supabase `institutions`, `institution_courses`, `institution_departments` | `id`, `name`, `status` | Inner join via `institution_id`, `course_id`, `department_id` | Institutional catalog | **Real Database Record** |
| **Identity Document** | Supabase Storage (`student-verifications`) | Private file storage path | Storage signed URL generated via `createSignedUrl` | At submission | **Real Storage Bucket** |
| **Academic CGPA** | Backend `AcademicRecord` / ERP export | `cgpa`, `marks_percentage`, `backlog_count` | `CGPA` (out of 10.0) mapped to 100; penalize 5 pts per active backlog | Semester / Cumulative | Integrated / Demonstration |
| **Subject Performance** | Course Examination Ledger | `subject_code`, `marks`, `max_marks`, `grade`, `credits` | Sum of credits and grade points; percentage = `(marks / max_marks) * 100` | Per Course / Semester | Integrated / Demonstration |
| **Lecture Attendance** | Biometric / LMS Attendance Logs | `classes_held`, `classes_attended`, `percentage` | `(classes_attended / classes_held) * 100`; evaluated vs. 75% cutoff | Weekly / Term-to-date | Integrated / Demonstration |
| **LMS Learning Activity** | Canvas / Moodle Integration API | `completion_rate`, `active_minutes`, `overdue_assignments` | 70% coursework completion + 30% active time cap (120 mins) minus 5 pts/overdue | Rolling 30 Days | Integrated / Demonstration |
| **Campus Engagement** | Student Affairs / Club Registry | `events_attended`, `clubs_joined`, `hackathons_won`, `certifications` | Weighted point sum: Events (+15), Clubs (+20), Hackathons (+35), Certs (+30) | Academic Year | Integrated / Demonstration |
| **Placement Coding** | CodeChef / HackerRank Assessment API | `coding_score_pct`, `problems_solved` | Percentage score mapped against Tier-1 (80%) and Tier-2 (50%) benchmarks | Diagnostic assessment | Integrated / Demonstration |
| **Placement Aptitude** | Campus Assessment Portal | `aptitude_score_pct`, `logical_reasoning`, `quant` | Aggregate percentage across quantitative, logical, and verbal sections | Diagnostic assessment | Integrated / Demonstration |
| **Mock Interviews** | TPO Interview Rubric Ledger | `mock_interview_score`, `technical_score`, `comm_score` | Standardized rubric score out of 100 assessed by industry panel | Per Interview Round | Integrated / Demonstration |
| **Feedback Ratings** | Institutional Feedback Survey | `satisfaction_score`, `faculty_feedback_score`, `advisory_notes` | Averaged score on 0–100 scale | End of Semester | Integrated / Demonstration |

---

## 3. Data Provenance & Disclosure Policy

To uphold scientific integrity and protect student fairness, the dashboard enforces strict UI indicators:

1. **`INTEGRATED DATABASE RECORD`:**
   - Displayed when an authenticated student's profile is loaded from verified Supabase records.
2. **`DEMONSTRATION COHORT DATA`:**
   - Displayed when exploring sample cohort profiles (Priya Sharma, Rohan Verma, Ananya Iyer, Aarav Patel, Sneha Reddy).
3. **`Pending Upload / Insufficient Data`:**
   - Displayed when a category (e.g. exam records in Ananya Iyer's profile) has not yet been imported. Missing data is highlighted openly rather than hidden or fabricated.

---

## 4. Refresh Behavior & Caching

- **Identity & Verification Status:** Queried directly from Supabase upon session load and refreshed in real-time when a reviewer takes an administrative action.
- **Analytics & Calculations:** Re-computed on-demand by the scoring engine whenever underlying records change.
- **Client Cache:** Stored in memory per session; refreshed upon page reload or manual profile switch.
