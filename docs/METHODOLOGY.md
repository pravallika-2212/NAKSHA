# ASCENDIQ: Student Success & Risk Scoring Methodology

## 1. Executive Overview

ASCENDIQ is an explainable decision-intelligence platform designed to identify students who may benefit from academic or career support early, explain the contributing indicators, recommend targeted interventions, and monitor progress over time.

A central principle of ASCENDIQ is that **Student Success is multifaceted and cannot be reduced to examination scores alone**, nor can risk be treated as merely the inverse of success.

---

## 2. Student Success Score (0–100 Scale)

The Student Success Score provides an aggregate, normalized evaluation of a student's observable learning progression, engagement, and career preparation.

### Component Breakdown & Configurable Weights

| Component | Default Weight | Data Sources | Normalization Formula |
|---|---|---|---|
| **Academic Performance** | 35% | Semester exams, CGPA, backlogs | `Academic Score = (CGPA / 10.0) * 100` with backlog deduction |
| **Attendance** | 20% | Lecture & laboratory registers | `Attendance Score = (Classes Attended / Classes Held) * 100` |
| **LMS Engagement** | 15% | LMS logs, assignments | `LMS Score = 0.6 * CompletionRate + 0.4 * (100 - OverduePenalty)` |
| **Career Readiness** | 25% | Aptitude, DSA/Coding benchmarks | `Career Score = 0.5 * Coding + 0.3 * Aptitude + 0.2 * SoftSkills` |
| **Co-Curricular Engagement** | 5% | Hackathons, clubs, certifications | Capped score out of 100 based on verified milestone counts |

### Baseline Formula (Complete Records)
```
Success Score = (0.35 × Academic) + (0.20 × Attendance) + (0.15 × LMS) + (0.25 × Career) + (0.05 × Engagement)
```

---

## 3. Strict Missing-Data Policy

A missing indicator is **never silently converted to zero**. Doing so falsely penalizes students whose departments haven't scheduled assessments or whose co-curricular records are pending.

1. **Coverage Calculation**:
   ```
   Data Coverage (%) = Sum of configured weights for available components
   ```
2. **Coverage Thresholds**:
   - **Coverage < 60%**: The official score is withheld and marked as `insufficient_data`. No synthetic or imputed score is presented.
   - **60% ≤ Coverage < 100%**: The score is computed by re-normalizing the available components over the represented weight:
     ```
     Provisional Score = (Sum of available weighted components) / (Represented Weight)
     ```
     The score is explicitly marked as `provisional` with a visible warning and an explanation of which records are missing.
   - **Coverage = 100%**: The score is certified as `complete`.

---

## 4. Distinct Risk Score Engine (0–100 Scale)

**Critical Design Rule**: Risk Score is **NOT** `100 - Success Score`.

A student with a 9.2 CGPA who has missed coding assessments has high placement risk despite strong academic metrics. Similarly, a student with borderline marks but perfect attendance and strong problem-solving skills has a very different risk profile.

### Multi-Indicator Risk Architecture

Each warning indicator is evaluated against explicit, transparent institutional thresholds:

| Domain | Indicator | Warning Threshold | Risk Weight |
|---|---|---|---|
| **Academic** | CGPA | CGPA < 6.5 (Moderate), < 5.5 (Critical) | 25 pts |
| **Academic** | Backlog Count | ≥ 1 backlogs | 15 pts |
| **Attendance** | Class Attendance | < 75% (Mandatory regulatory threshold) | 25 pts |
| **LMS Engagement** | Overdue Assignments | ≥ 2 overdue assignments | 15 pts |
| **Placement** | Coding Benchmark | < 50% DSA assessment score | 20 pts |
| **Placement** | Aptitude Percentile | < 50% aptitude percentile | 10 pts |

### Risk Classifications
- **Low Risk (0–29)**: Progressing on schedule.
- **Moderate Risk (30–49)**: Early warning indicators detected; advisory check-in suggested.
- **High Risk (50–69)**: Multiple critical indicators present; structured intervention recommended.
- **Critical Risk (70–100)**: Immediate multi-stakeholder intervention required (academic mentor + HOD).

---

## 5. Canonical Student Segments

ASCENDIQ categorizes students into 8 transparent, rule-based segments to guide advisor workflows:

1. **Strong Academics, Low Placement Readiness**: CGPA ≥ 7.5, Coding < 50%. Needs technical interview & DSA bootcamps.
2. **Strong Academics, Strong Placement Readiness**: CGPA ≥ 7.5, Coding ≥ 65%. On track for tier-1 placement opportunities.
3. **Declining Academics, Low Attendance**: CGPA < 6.5, Attendance < 75%. Needs immediate faculty check-in.
4. **Low Attendance, Assignments at Risk**: Attendance < 75%, Overdue Assignments ≥ 2. Needs academic counseling and schedule assistance.
5. **Strong Engagement, Weak Assessments**: Co-curricular score ≥ 60%, Exam Marks < 60%. Needs foundational concept revision.
6. **Low Engagement, Declining Academic Performance**: Engagement < 30%, CGPA < 6.0. Comprehensive support needed.
7. **Placement-Ready, Incomplete Application Preparation**: Coding ≥ 65%, Aptitude < 50% or soft skills pending.
8. **Insufficient Data for Reliable Classification**: Coverage < 60%. Flagged for department data ingestion.

---

## 6. Responsible AI & Ethical Boundaries

1. **Human-in-the-Loop**: The platform NEVER automatically triggers punitive actions, disciplinary notices, or academic exclusions. All recommendations require faculty or advisor review and approval.
2. **Descriptive, Not Predictive Determinism**: ASCENDIQ does not claim to "predict future life failure or dropout". It diagnoses current observable risk indicators to enable timely human assistance.
3. **Neutral, Non-Stigmatizing Language**: Students are categorized with supportive labels such as *"Placement Preparation Recommended"* rather than stigmatizing terms.
4. **Auditability**: Every intervention, status update, and note creates an immutable audit trail with timestamp and responsible faculty identifier.
