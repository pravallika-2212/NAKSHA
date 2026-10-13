# ASCENDIQ: Student Success Intelligence Platform
## Company-Level Technology Challenge Presentation & Demo Script

---

### Slide 1: Title & Executive Vision
- **Product Name**: ASCENDIQ
- **Tagline**: Predict. Optimize. Improve.
- **Category**: Student Success Analytics & Decision Intelligence
- **Mission**: Transform fragmented campus data into an explainable, unified view of student progress to enable timely, evidence-based academic and placement interventions.

---

### Slide 2: The Core Problem: The Fragmented Campus
- **The Challenge**: Indian universities and technical institutions collect massive amounts of student data across disparate silos:
  - Examination marks in SIS/ERP
  - Attendance registers in biometric/manual rosters
  - Assignment submissions in Moodle/Google Classroom
  - Placement coding scores on HackerRank/LeetCode
  - Co-curricular participation in paper club logs
- **The Consequence**: Students fall through the cracks. Faculty discover attendance deficits or placement unreadiness too late (often during semester-end detention lists or 7th-semester campus recruitment failures).
- **The 5 Critical Questions ASCENDIQ Answers**:
  1. *Which students need attention?*
  2. *What evidence indicates they need attention?*
  3. *Which factors (academics, attendance, LMS, placement) contribute?*
  4. *What practical intervention should be scheduled?*
  5. *Did the student improve after the intervention?*

---

### Slide 3: System Architecture & Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind-compatible CSS Variables with custom design tokens, Lucide icons, glassmorphism, and responsive layout.
- **Cinematic Presentation Layer**: Edge-to-edge MotionSites.ai hero background video with dark burgundy/pink overlay, interactive 3D role carousel (Student, Faculty, TPO).
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 ORM, Pydantic v2 data validation models, Uvicorn ASGI server.
- **Analytical Engine**: Pandas & NumPy vectorized calculations, transparent deterministic scoring, multi-indicator risk engine, coverage validator, and 8 canonical segments.
- **Database**: PostgreSQL / SQLite with migration support and relational integrity.

---

### Slide 4: Data Integration Studio & Quality Engine
- **Multi-Source Ingestion**:
  - `students.csv`, `academics.csv`, `attendance.csv`, `lms_activity.csv`, `engagement.csv`, `placement_readiness.csv`, `feedback.csv`
- **Validation Rules**:
  - Bounds checking: marks/percentages in `[0, 100]`, CGPA in `[0, 10]`, counts `>= 0`.
  - Consistency verification: `classes_attended <= classes_held` enforced.
  - Foreign key resolution and duplicate row prevention.
- **Missing Data Policy**:
  - Never convert missing data to zero!
  - Explicit coverage computation.
  - Re-normalized weights for coverage between 60% and 99% (`provisional`).
  - Score withheld if coverage < 60% (`insufficient_data`).

---

### Slide 5: Student Success vs. Risk Score Engine
- **Success Score (0–100)**:
  - 35% Academic Performance + 20% Attendance + 15% LMS Engagement + 25% Career Readiness + 5% Co-Curricular Engagement.
- **Separate Risk Score (0–100)**:
  - *Risk is NOT 100 minus Success!*
  - Independent risk indicators: CGPA decay, backlogs, <75% attendance alert, overdue LMS tasks, coding proficiency gaps (<50%), aptitude percentile deficits (<50%).
  - Categories: Low (0–29), Moderate (30–49), High (50–69), Critical (70–100).
- **Explainability**: Every alert cites exact numerical values, institutional thresholds, and underlying data sources.

---

### Slide 6: Live Demonstration Scenarios

#### Scenario A: High Academic Performance, Low Placement Readiness
- **Student**: Priya Sharma (`STU-CS-101`)
- **Profile**: CGPA 8.92 (Top 5% of class), 91.5% Attendance, 100% LMS Completion.
- **The Warning**: Placement coding benchmark is only **38.0%** (Threshold: 50.0%).
- **Segment**: *Strong Academics, Low Placement Readiness*.
- **Intervention**: TPO schedules DSA Bootcamp & Mock Technical Interview.

#### Scenario B: Declining Attendance and Academic Performance
- **Student**: Rohan Verma (`STU-CS-102`)
- **Profile**: 57.6% Attendance (<75% regulatory warning), CGPA 5.40, 2 Active Backlogs, 4 Overdue LMS assignments.
- **The Warning**: Critical Risk Score of **75/100**.
- **Segment**: *Declining Academics, Low Attendance*.
- **Intervention**: Academic Mentor schedules parent-student counseling & remedial coursework.

#### Scenario C: Strong Engagement, Incomplete Academic Evidence
- **Student**: Ananya Iyer (`STU-CS-103`)
- **Profile**: Active in hackathons and club leadership; 2nd-year transfer. Semester 4 examination scores and LMS records not yet uploaded.
- **The System Behavior**: Data coverage is **45%** (<60% minimum threshold).
- **The Result**: System refuses to guess a phantom score; outputs **Score Withheld (`insufficient_data`)** and prompts faculty to import Semester 4 records.

---

### Slide 7: Intervention & Closed-Loop Tracking
- **Actionable Workflow**:
  1. Faculty clicks "Schedule Intervention" from student profile or alert card.
  2. Pre-populated concern based on diagnosed root cause.
  3. Assign responsible faculty member, due date, and follow-up review date.
  4. Track status: `Recommended` -> `Planned` -> `In Progress` -> `Completed` -> `Follow-up Required`.
  5. Compare before-and-after metrics objectively without unproven causal claims.

---

### Slide 8: Responsible AI & Ethical Safeguards
- Zero automated disciplinary action; human review required at every step.
- Non-stigmatizing, growth-oriented segmentation labels.
- Least-privilege data access: Students see self-progress; Faculty see authorized cohorts; TPO sees placement benchmarks; Confidential notes restricted.
- Complete audit logging on intervention modifications.

---

### Slide 9: Verification & Test Results
- **Unit & Integration Tests**:
  - `node --experimental-strip-types --test tests/*.test.mjs`: **30/30 passed (100%)**
  - `python -m pytest backend/tests`: **11/11 passed (100%)**
  - Vite Production Build (`npm run build`): **Compiled cleanly in 2.6s**
- **Live Server Verification**:
  - FastAPI running on port 8000 with interactive docs at `/docs`.
  - Vite dev server running on port 5173 with proxy to backend.
