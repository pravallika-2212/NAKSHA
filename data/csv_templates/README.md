# ASCENDIQ Canonical Data Ingestion Templates

This directory contains standardized, validated CSV templates for the ASCENDIQ Student Success Intelligence Platform data integration pipeline.

## 1. Schema Specifications

### `students.csv` (Student Master Directory)
- **student_id** (string, required): Institutional student identifier (e.g., `STU-CS-101`). Unique key.
- **academic_year** (string, required): Current level of study (e.g., `Year 1`, `Year 2`, `Year 3`, `Year 4`).
- **department** (string, required): Department or school name (e.g., `Computer Science & Engineering`).
- **section** (string, optional): Cohort section code (e.g., `A`, `B`, `C`).

### `academics.csv` (Semester Examination & Progression Records)
- **student_id** (string, required): References master student record.
- **semester** (integer, required): 1 to 8.
- **subject_id** (string, required): Course catalog code (e.g., `CS601`).
- **marks_percentage** (float, required): 0.0 to 100.0%.
- **cgpa** (float, required): Cumulative Grade Point Average on a 10.0 scale (0.0 to 10.0).
- **backlog_count** (integer, required): Count of unresolved backlogs (>= 0).

### `attendance.csv` (Class Attendance Records)
- **student_id** (string, required): References master student record.
- **subject_id** (string, required): Subject code.
- **reporting_period** (string, required): Academic term/semester (e.g., `Fall 2025`).
- **classes_held** (integer, required): Total number of lecture/lab sessions held (> 0).
- **classes_attended** (integer, required): Total classes attended by student (0 <= attended <= held).

### `lms_activity.csv` (Learning Management System Engagement)
- **student_id** (string, required): References master student record.
- **reporting_period** (string, required): Academic term.
- **logins** (integer, required): Platform session count during the reporting period.
- **assignments_assigned** (integer, required): Total course assignments published.
- **assignments_completed** (integer, required): Completed and submitted tasks.
- **overdue_assignments** (integer, required): Unsubmitted past-deadline tasks.

### `engagement.csv` (Co-curricular & Extracurricular Participation)
- **student_id** (string, required): References master student record.
- **reporting_period** (string, required): Academic term.
- **events_attended** (integer, required): Technical talks, seminars, and campus workshops attended.
- **club_participation** (integer, required): Active club memberships (0 or 1).
- **hackathons_participated** (integer, required): Competitive hackathons or project showcases.
- **verified_certifications** (integer, required): Verified industry credentials (e.g., AWS, Coursera, NPTEL).

### `placement_readiness.csv` (Career & Employability Benchmarks)
- **student_id** (string, required): References master student record.
- **reporting_period** (string, required): Assessment window.
- **aptitude_percentage** (float, required): Quantitative & reasoning percentile (0.0 to 100.0).
- **coding_percentage** (float, required): DSA / competitive programming benchmark (0.0 to 100.0).
- **mock_interview_score** (float, optional): Panel evaluation score (0.0 to 100.0).
- **technical_skill_score** (float, optional): Domain tech stack evaluation (0.0 to 100.0).
- **communication_skill_score** (float, optional): Soft skills & verbal proficiency (0.0 to 100.0).

### `feedback.csv` (Authorized Faculty & Student Feedback)
- **student_id** (string, required): References master student record.
- **reporting_period** (string, required): Feedback window.
- **satisfaction_score** (float, optional): Aggregated student learning satisfaction (0.0 to 100.0).
- **faculty_feedback_rating** (float, optional): Structured faculty assessment of student responsiveness (0.0 to 100.0).

---

## 2. Validation & Quality Rules

1. **Deterministic Bounds**: Percentages must be in range `[0.0, 100.0]`; CGPA in `[0.0, 10.0]`; counts `>= 0`.
2. **Attendance Consistency**: `classes_attended <= classes_held`. Records violating this rule are rejected with row-level error codes.
3. **No Phantom Zero Imputation**: Missing indicators are flagged as missing. They are NEVER converted silently to zero.
4. **Data Coverage**: Success Scores require minimum 60% data coverage. If coverage is between 60% and 99%, the score is marked `provisional` with re-normalized weights. If below 60%, the score is withheld as `insufficient_data`.
