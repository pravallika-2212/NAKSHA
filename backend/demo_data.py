"""
ASCENDIQ Synthetic Demonstration Dataset Generator
Populates realistic, compliant sample data for faculty, administrator, and TPO evaluation.
Specifically highlights Scenarios A, B, and C as required by the challenge.
All records are explicitly marked SAMPLE DATA.
"""

from typing import List, Dict, Any
from backend.analytics import (
    normalize_academic, normalize_attendance, normalize_lms,
    normalize_placement, normalize_engagement, calculate_success_score,
    calculate_risk_score, classify_student_segment, generate_recommendations
)

DEMO_STUDENTS = [
    # SCENARIO A: High academic performance, low placement readiness
    {
        "student_id": "STU-CS-101",
        "full_name": "Priya Sharma",
        "email": "priya.sharma@demo.ascendiq.ai",
        "department": "Computer Science",
        "academic_year": 3,
        "admission_year": 2023,
        "section": "A",
        "academic": {
            "semester": 6, "subject_id": "CS601", "subject_name": "Advanced Operating Systems",
            "marks_percentage": 88.5, "cgpa": 8.92, "backlog_count": 0, "previous_semester_marks": 87.0
        },
        "attendance": {"classes_held": 90, "classes_attended": 84, "percentage": 93.3},
        "lms": {"completion_rate": 95.0, "active_minutes": 140, "overdue": 0},
        "placement": {
            "aptitude_percentage": 42.0, "coding_percentage": 36.0, "mock_interview_score": 45.0,
            "technical_skill_score": 40.0, "communication_skill_score": 75.0
        },
        "engagement": {"events": 2, "clubs": 1, "hackathons": 0, "certs": 1},
        "scenario_tag": "Scenario A: High Academic, Low Placement Readiness"
    },

    # SCENARIO B: Declining attendance and academic performance
    {
        "student_id": "STU-CS-102",
        "full_name": "Rohan Verma",
        "email": "rohan.verma@demo.ascendiq.ai",
        "department": "Computer Science",
        "academic_year": 3,
        "admission_year": 2023,
        "section": "B",
        "academic": {
            "semester": 6, "subject_id": "CS602", "subject_name": "Database Internals",
            "marks_percentage": 48.0, "cgpa": 5.40, "backlog_count": 2, "previous_semester_marks": 72.0 # 24% drop!
        },
        "attendance": {"classes_held": 85, "classes_attended": 51, "percentage": 60.0}, # < 75% threshold
        "lms": {"completion_rate": 42.0, "active_minutes": 35, "overdue": 3},
        "placement": {
            "aptitude_percentage": 38.0, "coding_percentage": 32.0, "mock_interview_score": 40.0,
            "technical_skill_score": 35.0, "communication_skill_score": 50.0
        },
        "engagement": {"events": 0, "clubs": 0, "hackathons": 0, "certs": 0},
        "scenario_tag": "Scenario B: Declining Attendance and Academic Performance"
    },

    # SCENARIO C: Strong engagement, incomplete academic evidence
    {
        "student_id": "STU-DS-103",
        "full_name": "Ananya Iyer",
        "email": "ananya.iyer@demo.ascendiq.ai",
        "department": "Data Science",
        "academic_year": 2,
        "admission_year": 2024,
        "section": "A",
        "academic": None, # Missing academic record (grades withheld/pending)
        "attendance": None, # Missing attendance
        "lms": {"completion_rate": 88.0, "active_minutes": 110, "overdue": 0},
        "placement": None, # Not yet taken placement assessment
        "engagement": {"events": 4, "clubs": 2, "hackathons": 2, "certs": 2}, # High engagement
        "scenario_tag": "Scenario C: Strong Engagement, Incomplete Academic Evidence"
    },

    # 4. High Performing & Placement Ready
    {
        "student_id": "STU-CS-104",
        "full_name": "Aarav Patel",
        "email": "aarav.patel@demo.ascendiq.ai",
        "department": "Computer Science",
        "academic_year": 4,
        "admission_year": 2022,
        "section": "A",
        "academic": {
            "semester": 7, "subject_id": "CS701", "subject_name": "Distributed Systems",
            "marks_percentage": 92.0, "cgpa": 9.45, "backlog_count": 0, "previous_semester_marks": 91.0
        },
        "attendance": {"classes_held": 90, "classes_attended": 86, "percentage": 95.5},
        "lms": {"completion_rate": 98.0, "active_minutes": 180, "overdue": 0},
        "placement": {
            "aptitude_percentage": 88.0, "coding_percentage": 92.0, "mock_interview_score": 89.0,
            "technical_skill_score": 94.0, "communication_skill_score": 88.0
        },
        "engagement": {"events": 5, "clubs": 2, "hackathons": 3, "certs": 4},
        "scenario_tag": "Exemplary Cohort Lead"
    },

    # 5. Low attendance, Coursework at Risk
    {
        "student_id": "STU-AI-105",
        "full_name": "Vikram Singh",
        "email": "vikram.singh@demo.ascendiq.ai",
        "department": "Artificial Intelligence",
        "academic_year": 2,
        "admission_year": 2024,
        "section": "B",
        "academic": {
            "semester": 4, "subject_id": "AI401", "subject_name": "Machine Learning Foundations",
            "marks_percentage": 64.0, "cgpa": 6.80, "backlog_count": 0, "previous_semester_marks": 68.0
        },
        "attendance": {"classes_held": 80, "classes_attended": 56, "percentage": 70.0},
        "lms": {"completion_rate": 50.0, "active_minutes": 40, "overdue": 3},
        "placement": {
            "aptitude_percentage": 62.0, "coding_percentage": 58.0, "mock_interview_score": 60.0,
            "technical_skill_score": 65.0, "communication_skill_score": 64.0
        },
        "engagement": {"events": 1, "clubs": 0, "hackathons": 0, "certs": 0},
        "scenario_tag": "Attendance Shortage & Coursework Lag"
    },

    # 6. Strong engagement, weak assessments
    {
        "student_id": "STU-EC-106",
        "full_name": "Kavita Nair",
        "email": "kavita.nair@demo.ascendiq.ai",
        "department": "Electronics & Communication",
        "academic_year": 3,
        "admission_year": 2023,
        "section": "A",
        "academic": {
            "semester": 5, "subject_id": "EC501", "subject_name": "Digital Signal Processing",
            "marks_percentage": 47.0, "cgpa": 5.10, "backlog_count": 1, "previous_semester_marks": 52.0
        },
        "attendance": {"classes_held": 85, "classes_attended": 68, "percentage": 80.0},
        "lms": {"completion_rate": 65.0, "active_minutes": 60, "overdue": 1},
        "placement": {
            "aptitude_percentage": 48.0, "coding_percentage": 44.0, "mock_interview_score": 52.0,
            "technical_skill_score": 46.0, "communication_skill_score": 70.0
        },
        "engagement": {"events": 4, "clubs": 3, "hackathons": 2, "certs": 1},
        "scenario_tag": "High Activity, Assessment Coaching Required"
    },

    # 7. Placement ready, targeted polish
    {
        "student_id": "STU-CS-107",
        "full_name": "Siddharth Das",
        "email": "siddharth.das@demo.ascendiq.ai",
        "department": "Computer Science",
        "academic_year": 4,
        "admission_year": 2022,
        "section": "A",
        "academic": {
            "semester": 7, "subject_id": "CS702", "subject_name": "Cloud Computing Architectures",
            "marks_percentage": 76.0, "cgpa": 7.90, "backlog_count": 0, "previous_semester_marks": 75.0
        },
        "attendance": {"classes_held": 90, "classes_attended": 78, "percentage": 86.6},
        "lms": {"completion_rate": 88.0, "active_minutes": 95, "overdue": 0},
        "placement": {
            "aptitude_percentage": 76.0, "coding_percentage": 78.0, "mock_interview_score": 68.0,
            "technical_skill_score": 75.0, "communication_skill_score": 70.0
        },
        "engagement": {"events": 2, "clubs": 1, "hackathons": 1, "certs": 2},
        "scenario_tag": "Placement Ready Candidate"
    },

    # 8. Developing Student (Solid baseline)
    {
        "student_id": "STU-DS-108",
        "full_name": "Divya Reddy",
        "email": "divya.reddy@demo.ascendiq.ai",
        "department": "Data Science",
        "academic_year": 3,
        "admission_year": 2023,
        "section": "A",
        "academic": {
            "semester": 5, "subject_id": "DS501", "subject_name": "Big Data Technologies",
            "marks_percentage": 68.0, "cgpa": 7.20, "backlog_count": 0, "previous_semester_marks": 67.0
        },
        "attendance": {"classes_held": 88, "classes_attended": 75, "percentage": 85.2},
        "lms": {"completion_rate": 82.0, "active_minutes": 75, "overdue": 0},
        "placement": {
            "aptitude_percentage": 64.0, "coding_percentage": 62.0, "mock_interview_score": 65.0,
            "technical_skill_score": 66.0, "communication_skill_score": 72.0
        },
        "engagement": {"events": 2, "clubs": 1, "hackathons": 1, "certs": 1},
        "scenario_tag": "Consistent Academic Progression"
    }
]

# Generate more students for realistic distributions
NAMES_POOL = [
    ("Aditya", "Joshi", "Computer Science"), ("Meera", "Menon", "Data Science"),
    ("Rajesh", "Kulkarni", "Artificial Intelligence"), ("Sneha", "Mukherjee", "Computer Science"),
    ("Naveen", "Kumar", "Electronics & Communication"), ("Pooja", "Chawla", "Data Science"),
    ("Karan", "Malhotra", "Computer Science"), ("Tanvi", "Bose", "Artificial Intelligence"),
    ("Rishi", "Sundaram", "Computer Science"), ("Swati", "Pandey", "Data Science"),
    ("Gaurav", "Saxena", "Electronics & Communication"), ("Bhavna", "Tripathi", "Computer Science"),
    ("Harsh", "Vardhan", "Artificial Intelligence"), ("Riya", "Sen", "Data Science"),
    ("Arjun", "Kapoor", "Computer Science"), ("Deepika", "Rao", "Electronics & Communication")
]

for i, (first, last, dept) in enumerate(NAMES_POOL, start=109):
    sid = f"STU-{dept[:2].upper()}-{i}"
    marks = 55.0 + ((i * 7) % 38)
    cgpa = round(marks / 10.0, 2)
    held = 80 + (i % 15)
    att_pct = 62.0 + ((i * 11) % 36)
    attended = int((att_pct / 100.0) * held)
    coding = 40.0 + ((i * 13) % 55)
    apt = 45.0 + ((i * 9) % 50)
    overdue = 2 if att_pct < 70 else (1 if att_pct < 80 else 0)
    backlogs = 1 if marks < 55 else 0

    DEMO_STUDENTS.append({
        "student_id": sid,
        "full_name": f"{first} {last}",
        "email": f"{first.lower()}.{last.lower()}@demo.ascendiq.ai",
        "department": dept,
        "academic_year": 2 + (i % 3),
        "admission_year": 2024 - (i % 3),
        "section": "A" if (i % 2 == 0) else "B",
        "academic": {
            "semester": 4 + (i % 4), "subject_id": f"SUB{i}", "subject_name": f"{dept} Core {i}",
            "marks_percentage": marks, "cgpa": cgpa, "backlog_count": backlogs,
            "previous_semester_marks": marks + (-5.0 if i % 3 == 0 else 2.0)
        },
        "attendance": {"classes_held": held, "classes_attended": attended, "percentage": round(att_pct, 1)},
        "lms": {"completion_rate": min(100.0, att_pct + 5.0), "active_minutes": 60 + (i % 60), "overdue": overdue},
        "placement": {
            "aptitude_percentage": apt, "coding_percentage": coding, "mock_interview_score": round((apt+coding)/2, 1),
            "technical_skill_score": coding, "communication_skill_score": 65.0 + (i % 25)
        },
        "engagement": {"events": i % 4, "clubs": i % 2, "hackathons": i % 3, "certs": i % 2},
        "scenario_tag": "Cohort Member"
    })


def build_processed_student(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes all analytical indicators, scores, risk, segment, and recommendations for a student.
    """
    acad_raw = raw.get("academic")
    att_raw = raw.get("attendance")
    lms_raw = raw.get("lms")
    place_raw = raw.get("placement")
    eng_raw = raw.get("engagement")

    # Normalize components
    acad_norm = normalize_academic(
        marks=acad_raw["marks_percentage"] if acad_raw else None,
        cgpa=acad_raw["cgpa"] if acad_raw else None,
        backlogs=acad_raw["backlog_count"] if acad_raw else 0
    ) if acad_raw else None

    att_norm = normalize_attendance(
        classes_held=att_raw["classes_held"] if att_raw else None,
        classes_attended=att_raw["classes_attended"] if att_raw else None,
        direct_pct=att_raw["percentage"] if att_raw else None
    ) if att_raw else None

    lms_norm = normalize_lms(
        completion_rate=lms_raw["completion_rate"] if lms_raw else None,
        active_minutes=lms_raw["active_minutes"] if lms_raw else None,
        overdue_count=lms_raw["overdue"] if lms_raw else 0
    ) if lms_raw else None

    place_norm = normalize_placement(
        aptitude=place_raw["aptitude_percentage"] if place_raw else None,
        coding=place_raw["coding_percentage"] if place_raw else None,
        mock_interview=place_raw["mock_interview_score"] if place_raw else None,
        technical=place_raw["technical_skill_score"] if place_raw else None,
        communication=place_raw["communication_skill_score"] if place_raw else None
    ) if place_raw else None

    eng_norm = normalize_engagement(
        events=eng_raw["events"] if eng_raw else 0,
        clubs=eng_raw["clubs"] if eng_raw else 0,
        hackathons=eng_raw["hackathons"] if eng_raw else 0,
        certs=eng_raw["certs"] if eng_raw else 0
    ) if eng_raw else 0.0

    # Success Score
    success_res = calculate_success_score(
        academic_score=acad_norm,
        attendance_score=att_norm,
        lms_score=lms_norm,
        placement_score=place_norm,
        engagement_score=eng_norm
    )

    # Risk Score
    marks_drop = None
    if acad_raw and acad_raw.get("previous_semester_marks"):
        prev = acad_raw["previous_semester_marks"]
        curr = acad_raw["marks_percentage"]
        if prev > curr:
            marks_drop = round(prev - curr, 1)

    risk_res = calculate_risk_score(
        academic_score=acad_norm,
        attendance_score=att_norm,
        lms_completion=lms_raw["completion_rate"] if lms_raw else None,
        overdue_assignments=lms_raw["overdue"] if lms_raw else 0,
        backlogs=acad_raw["backlog_count"] if acad_raw else 0,
        semester_marks_drop=marks_drop,
        coding_score=place_raw["coding_percentage"] if place_raw else None,
        aptitude_score=place_raw["aptitude_percentage"] if place_raw else None
    )

    # Segment
    segment_key, segment_label, segment_reason = classify_student_segment(
        academic_score=acad_norm,
        attendance_score=att_norm,
        placement_score=place_norm,
        engagement_score=eng_norm,
        coding_score=place_raw["coding_percentage"] if place_raw else None,
        overdue_assignments=lms_raw["overdue"] if lms_raw else 0,
        semester_marks_drop=marks_drop,
        data_coverage=success_res["coverage_pct"]
    )

    # Recommendations
    recs = generate_recommendations(
        risk_factors=risk_res["risk_factors"],
        segment_key=segment_key,
        student_name=raw["full_name"]
    )

    return {
        **raw,
        "success_score": success_res["score"],
        "success_status": success_res["status"],
        "data_coverage": success_res["coverage_pct"],
        "success_breakdown": success_res["components"],
        "risk_score": risk_res["risk_score"],
        "risk_category": risk_res["risk_category"],
        "risk_factors": risk_res["risk_factors"],
        "segment_key": segment_key,
        "segment_label": segment_label,
        "segment_reason": segment_reason,
        "recommendations": recs,
        "is_sample_data": True
    }


def get_all_demo_data() -> List[Dict[str, Any]]:
    return [build_processed_student(s) for s in DEMO_STUDENTS]
