# ASCENDIQ: Hackathon Demo Plan & Presentation Sequence
*Smart Campus Analytics: Predict, Optimize & Improve Student Success*

---

## 1. Demo Overview & Narrative Arc

**Title:** Beyond the Black Box: Explainable Student Success Intelligence Across All Four Academic Years  
**Time Limit:** 3–5 Minutes  
**Core Hook:** Traditional student management systems show fragmented data in disconnected silos, while naive AI tools produce arbitrary "black-box" risk predictions without explainability. ASCENDIQ unifies 7 core campus data dimensions, explains every score and threshold, and delivers progressive year-specific dashboards tailored to a student's actual university stage.

---

## 2. 8-Step Step-by-Step Live Demo Script

### Step 1: Student Login & Verified Dashboard Navigation (30s)
- **Action:** Open `http://localhost:5173/login`. Log in with verified student credentials (or demonstrate `/verification-pending` transition).
- **Talking Point:** "Previously, verified students were redirected to the home landing page. Now, authoritative database verification resolves instantly, routing approved students directly to their personal Student Success Dashboard at `/student` while keeping unverified submissions safely in review."

### Step 2: Progressive Year-Specific Experience (45s)
- **Action:** In the top header, toggle between **Year 1**, **Year 2**, **Year 3**, and **Year 4** using the interactive academic year switcher.
- **Talking Point:**
  - *"Year 1 (Sneha Reddy):* Helps freshmen build academic study habits, track lecture attendance consistency, avoid early backlogs, and discover student clubs. Placement is de-emphasized."
  - *"Year 2 (Ananya Iyer):* Shifts focus to practical competence—mini-projects, hackathons, and certifications."
  - *"Year 3 (Priya Sharma):* Focuses on career preparation—diagnosing coding benchmarks vs. aptitude tests and scheduling mock interviews."
  - *"Year 4 (Aarav Patel):* Unlocks the dedicated Final-Year Placement Acceleration suite with company cutoffs and recruitment checklists."

### Step 3: Integrated 7 Campus Data Dimensions (30s)
- **Action:** Point to the 8 summary cards and the 2-column detailed breakdown panels.
- **Talking Point:** "ASCENDIQ integrates all 7 vital categories in one unified view: Academics, Attendance, LMS Engagement, Extracurriculars, Skills, Placement Diagnostics, and Faculty Feedback."

### Step 4: Explainable Student Success Score Breakdown (45s)
- **Action:** Click **"Explain Score Breakdown & Weights"** on the Success Score card to open the explainability modal.
- **Talking Point:** "Our Success Score is 100% explainable. We display the exact mathematical formula, component weights adapted to the student's academic year, raw observed metrics, and exact point contributions. Notice our missing-data policy: when data is pending, we re-normalize available weights rather than unfairly penalizing students with a zero."

### Step 5: Explainable Early Warning Risk Flags (30s)
- **Action:** Switch to student **Rohan Verma** (Scenario B) using the demo switcher.
- **Talking Point:** "Risk is not simply 100 minus success score. For Rohan, we flag specific rule breaches: Attendance at 60.0% is below the 75% cutoff (+35 pts), 2 active backlogs (+25 pts), and a 24% semester marks drop. Each flag explains the triggered indicator and prompts a supportive mentor intervention."

### Step 6: Deterministic Student Segmentation (20s)
- **Action:** Highlight the Student Success Segmentation banner.
- **Talking Point:** "Students are grouped into 8 transparent, rule-based segments—such as 'Strong Academics, Placement Preparation Recommended' or 'Declining Academics with Low Attendance'—giving mentors immediate clarity on cohort needs."

### Step 7: Evidence-Grounded AI Recommendations (30s)
- **Action:** Review the Personalized AI Recommendations panel.
- **Talking Point:** "Every recommendation cites verified evidence and specifies the responsible support role. For example: Priya has an 88.5% academic grade but a 36% coding assessment score, so the system prescribes an algorithmic problem-solving bootcamp owned by the TPO."

### Step 8: Data Provenance & Transparency Disclosure (15s)
- **Action:** Point to the **`INTEGRATED DATABASE RECORD`** vs **`DEMONSTRATION COHORT DATA`** pill in the top header.
- **Talking Point:** "ASCENDIQ distinguishes verified catalog records from synthetic test cohorts. We never fabricate data or pretend an integration exists when records are pending."

---

## 3. Anticipated Judge Q&A Cheat Sheet

| Question | Winning Response |
|---|---|
| **"Why not use deep learning or black-box ML for risk prediction?"** | In higher education, punitive black-box models create algorithmic bias and alienate students. ASCENDIQ uses transparent, configurable rule-based thresholds and explainable weighted formulas that students, mentors, and accreditation boards can verify and trust. |
| **"How do you handle incomplete records from legacy college ERPs?"** | We enforce a strict missing-data policy. If coverage is below 60%, we honestly withhold the score as `insufficient_data`. Between 60% and 99%, we calculate a `provisional` score by re-normalizing available weights without silent zero-imputation. |
| **"How does the platform ensure student data privacy?"** | Supabase Row-Level Security (RLS) ensures students can only query their own verified records. Reviewer queues and placement rosters require authenticated role memberships (`admin`, `reviewer`, `faculty`). |
