"""
ASCENDIQ Backend Tests
Validates:
1. Student Success Score formula and missing-data coverage normalization.
2. Distinct Risk Score indicators, thresholds, and severity categories.
3. Student Segmentation logic for Scenarios A, B, and C.
4. Data Ingestion validation engine (bounds, formats, duplicates).
5. FastAPI REST endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app, DATABASE_STUDENTS
from backend.analytics import (
    calculate_success_score, calculate_risk_score,
    classify_student_segment, normalize_academic, normalize_attendance
)
from backend.ingestion import process_import, parse_csv_content

client = TestClient(app)


def test_success_score_complete_record():
    # 100% complete record
    res = calculate_success_score(
        academic_score=80.0,
        attendance_score=90.0,
        lms_score=85.0,
        placement_score=70.0,
        engagement_score=60.0
    )
    assert res["status"] == "available"
    assert res["coverage_pct"] == 100.0
    # Weighted sum: 80*0.35 + 90*0.20 + 85*0.15 + 70*0.25 + 60*0.05 = 28 + 18 + 12.75 + 17.5 + 3 = 79.25 -> 79.3
    assert abs(res["score"] - 79.3) < 0.2


def test_success_score_missing_policy_provisional():
    # Missing placement score (weight 25%), available weight = 75% -> coverage = 75% >= 60%
    res = calculate_success_score(
        academic_score=80.0,
        attendance_score=90.0,
        lms_score=80.0,
        placement_score=None,
        engagement_score=50.0
    )
    assert res["status"] == "provisional"
    assert res["coverage_pct"] == 75.0
    assert res["score"] is not None
    # Must renormalize over 75 weight: (80*35 + 90*20 + 80*15 + 50*5) / 75 = (2800 + 1800 + 1200 + 250) / 75 = 6050 / 75 = 80.67
    assert abs(res["score"] - 80.7) < 0.2


def test_success_score_insufficient_data():
    # Only LMS and Engagement present -> available weight = 20% < 60%
    res = calculate_success_score(
        academic_score=None,
        attendance_score=None,
        lms_score=80.0,
        placement_score=None,
        engagement_score=50.0
    )
    assert res["status"] == "insufficient_data"
    assert res["score"] is None
    assert res["coverage_pct"] == 20.0


def test_risk_score_critical_signals():
    # Severe attendance shortage (60%) and 2 backlogs and overdue assignments
    res = calculate_risk_score(
        academic_score=48.0,
        attendance_score=60.0,
        lms_completion=45.0,
        overdue_assignments=3,
        backlogs=2,
        semester_marks_drop=15.0
    )
    assert res["risk_category"] == "Critical"
    assert res["risk_score"] >= 75.0
    assert len(res["risk_factors"]) >= 4


def test_segmentation_scenario_a():
    # Scenario A: High academic (88), low placement coding (36)
    seg_key, seg_label, _ = classify_student_segment(
        academic_score=88.0,
        attendance_score=93.0,
        placement_score=45.0,
        engagement_score=30.0,
        coding_score=36.0,
        data_coverage=100.0
    )
    assert seg_key == "strong_academics_low_placement"


def test_segmentation_scenario_b():
    # Scenario B: Declining marks, low attendance (60%)
    seg_key, seg_label, _ = classify_student_segment(
        academic_score=48.0,
        attendance_score=60.0,
        placement_score=40.0,
        engagement_score=0.0,
        semester_marks_drop=24.0,
        data_coverage=100.0
    )
    assert seg_key == "declining_academics_low_attendance"


def test_segmentation_scenario_c():
    # Scenario C: Incomplete data (coverage 30%)
    seg_key, seg_label, _ = classify_student_segment(
        academic_score=None,
        attendance_score=None,
        placement_score=None,
        engagement_score=85.0,
        data_coverage=30.0
    )
    assert seg_key == "insufficient_data"


def test_api_overview():
    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cohort_summary"]["total_students"] > 0
    assert "risk_distribution" in data


def test_api_student_profile():
    resp = client.get("/api/students/STU-CS-101")
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Priya Sharma"
    assert data["segment_key"] == "strong_academics_low_placement"


def test_api_create_intervention():
    payload = {
        "student_id": "STU-CS-101",
        "concern": "Mock test practice required",
        "recommended_action": "Schedule 2 mock technical interviews",
        "assigned_to": "Prof. Rao",
        "due_date": "2026-11-20",
        "status": "planned"
    }
    resp = client.post("/api/analytics/interventions", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "STU-CS-101"
    assert data["id"].startswith("int-")


def test_ingestion_validation():
    csv_text = "student_id,classes_held,classes_attended,subject_id\nSTU-001,50,45,CS101\nSTU-002,40,48,CS101\n"
    headers, rows = parse_csv_content(csv_text)
    mapping = {"student_id": "student_id", "classes_held": "classes_held", "classes_attended": "classes_attended", "subject_id": "subject_id"}
    result = process_import("attendance", rows, mapping)
    assert result["total_rows"] == 2
    assert result["accepted_count"] == 1 # STU-001 valid
    assert result["rejected_count"] == 1 # STU-002 attended > held


def test_get_assessment_tests():
    resp = client.get("/api/assessments/tests")
    assert resp.status_code == 200
    tests = resp.json()
    assert len(tests) >= 9
    categories = {t["category"] for t in tests}
    assert "aptitude" in categories
    assert "technical" in categories
    assert "mock" in categories


def test_start_assessment_attempt_without_answer_keys():
    resp = client.post("/api/assessments/start", json={
        "student_id": "STU-CS-101",
        "test_id": "apt-quant-01"
    })
    assert resp.status_code == 200
    data = resp.json()
    attempt = data["attempt"]
    questions = data["questions"]
    assert attempt["status"] == "in_progress"
    assert attempt["duration_minutes"] == 15
    assert len(questions) == 5
    # Verify answers are NOT exposed to frontend during active test taking
    for q in questions:
        assert "correct_option" not in q
        assert "explanation" not in q
        assert len(q["options"]) == 4


def test_save_assessment_answer_and_retrieve_attempt():
    start_resp = client.post("/api/assessments/start", json={
        "student_id": "STU-CS-101",
        "test_id": "tech-dsa-01"
    })
    att_id = start_resp.json()["attempt"]["id"]

    # Save answer for question 1
    ans_resp = client.post(f"/api/assessments/attempts/{att_id}/answers", json={
        "student_id": "STU-CS-101",
        "question_id": "q-dsa-1",
        "selected_option": "B",
        "marked_for_review": False
    })
    assert ans_resp.status_code == 200

    # Retrieve attempt state (reload recovery)
    get_resp = client.get(f"/api/assessments/attempts/{att_id}?student_id=STU-CS-101")
    assert get_resp.status_code == 200
    attempt_state = get_resp.json()["attempt"]
    assert attempt_state["answers"]["q-dsa-1"]["selected_option"] == "B"

    # Reject unauthorized access by different student
    unauth_resp = client.get(f"/api/assessments/attempts/{att_id}?student_id=STU-CS-999")
    assert unauth_resp.status_code == 403


def test_integrity_monitoring_and_penalty():
    start_resp = client.post("/api/assessments/start", json={
        "student_id": "STU-CS-101",
        "test_id": "tech-dbms-01"
    })
    att_id = start_resp.json()["attempt"]["id"]

    # Answer all questions correctly
    client.post(f"/api/assessments/attempts/{att_id}/answers", json={
        "student_id": "STU-CS-101", "question_id": "q-dbms-1", "selected_option": "C"
    })
    client.post(f"/api/assessments/attempts/{att_id}/answers", json={
        "student_id": "STU-CS-101", "question_id": "q-dbms-2", "selected_option": "B"
    })
    client.post(f"/api/assessments/attempts/{att_id}/answers", json={
        "student_id": "STU-CS-101", "question_id": "q-dbms-3", "selected_option": "B"
    })
    client.post(f"/api/assessments/attempts/{att_id}/answers", json={
        "student_id": "STU-CS-101", "question_id": "q-dbms-4", "selected_option": "B"
    })
    client.post(f"/api/assessments/attempts/{att_id}/answers", json={
        "student_id": "STU-CS-101", "question_id": "q-dbms-5", "selected_option": "B"
    })

    # Violations 1, 2, 3
    import time
    ev1 = client.post(f"/api/assessments/attempts/{att_id}/integrity-event", json={
        "student_id": "STU-CS-101", "event_type": "tab_hidden"
    }).json()
    assert ev1["violation_count"] == 1
    assert ev1["attempt_active"] is True

    time.sleep(2.1)
    ev2 = client.post(f"/api/assessments/attempts/{att_id}/integrity-event", json={
        "student_id": "STU-CS-101", "event_type": "fullscreen_exit"
    }).json()
    assert ev2["violation_count"] == 2
    assert ev2["attempt_active"] is True

    time.sleep(2.1)
    ev3 = client.post(f"/api/assessments/attempts/{att_id}/integrity-event", json={
        "student_id": "STU-CS-101", "event_type": "tab_hidden"
    }).json()
    assert ev3["violation_count"] == 3
    assert ev3["attempt_active"] is True

    # Violation 4: must trigger auto-submit and apply 5 percentage points penalty!
    time.sleep(2.1)
    ev4 = client.post(f"/api/assessments/attempts/{att_id}/integrity-event", json={
        "student_id": "STU-CS-101", "event_type": "tab_hidden"
    }).json()
    assert ev4["violation_count"] == 4
    assert ev4["auto_submitted"] is True

    # Check finalized attempt
    get_res = client.get(f"/api/assessments/attempts/{att_id}?student_id=STU-CS-101").json()
    att = get_res["attempt"]
    assert att["status"] == "terminated_by_integrity"
    assert att["penalty_applied"] is True
    # 5/5 correct = 100%, minus 5% penalty = 95.0%
    assert att["percentage_score"] == 100.0
    assert att["adjusted_score"] == 95.0

    # Ensure answers are now visible in review
    questions = get_res["questions"]
    assert "correct_option" in questions[0]
    assert "explanation" in questions[0]


def test_student_progress_summary():
    resp = client.get("/api/assessments/student/STU-CS-101/progress")
    assert resp.status_code == 200
    prog = resp.json()
    assert prog["tests_completed"] >= 1
    assert prog["highest_score"] is not None
    assert prog["average_score"] is not None
    assert len(prog["attempt_history"]) >= 1



# ==============================================================================
# Year 4 Placement & Career Launch Engine Tests
# ==============================================================================

def test_year4_resume_ats_analysis_and_persistence():
    payload = {
        "student_id": "STU-CS-101",
        "title": "Software Engineer Backend",
        "target_role": "Full Stack Software Engineer",
        "education": [{"institution": "NIT", "degree": "B.Tech", "field_of_study": "CS", "start_year": "2023", "end_year": "2027", "grade_or_cgpa": "8.92"}],
        "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "Redis", "Git", "TypeScript"],
        "projects": [{
            "title": "Campus Analytics",
            "technologies": ["FastAPI", "PostgreSQL"],
            "bullets": [
                "Architected distributed analytics engine handling 10,000+ records with sub-100ms latency.",
                "Optimized database indexing improving throughput by 4.2x."
            ]
        }],
        "experience": [{
            "company": "CloudScale",
            "role": "SWE Intern",
            "start_date": "May 2025",
            "end_date": "July 2025",
            "bullets": ["Streamlined microservice CI/CD pipelines reducing deployment latency by 45%."]
        }],
        "is_primary": True,
        "job_description_match": "Looking for a Software Engineer with Python, FastAPI, and Docker."
    }

    resp = client.post("/api/career-launch/resumes", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "STU-CS-101"
    assert data["ats_score_estimate"] >= 80.0
    assert "ats_breakdown" in data
    assert len(data["ats_breakdown"]["matched_job_keywords"]) >= 2

    # Verify retrieval
    get_resp = client.get("/api/career-launch/resumes?student_id=STU-CS-101")
    assert get_resp.status_code == 200
    resumes = get_resp.json()
    assert len(resumes) >= 1
    assert any(r["id"] == data["id"] for r in resumes)


def test_year4_mock_interview_studio_flow():
    # 1. Fetch questions catalog
    q_resp = client.get("/api/career-launch/interviews/questions?category=technical_cs")
    assert q_resp.status_code == 200
    questions = q_resp.json()
    assert len(questions) >= 3

    # 2. Start session
    start_resp = client.post("/api/career-launch/interviews/start", json={
        "student_id": "STU-CS-101",
        "interview_type": "technical_cs",
        "target_company": "Google",
        "target_role": "SDE-1"
    })
    assert start_resp.status_code == 200
    session = start_resp.json()
    assert session["status"] == "in_progress"
    assert len(session["questions"]) == 3

    # 3. Submit answer to question 1
    q1 = session["questions"][0]
    ans_resp = client.post(f"/api/career-launch/interviews/{session['id']}/answer", json={
        "student_id": "STU-CS-101",
        "question_id": q1["id"],
        "answer_text": "We designed an LRU cache using a Doubly Linked List and Hash Map to achieve O(1) time complexity. We bounded cache size to 512MB and benchmarked latency reduction at 40%."
    })
    assert ans_resp.status_code == 200
    ans_data = ans_resp.json()
    feedback = ans_data["evaluated_answer"]["feedback"]
    assert feedback["score"] >= 70.0
    assert len(feedback["strengths"]) > 0


def test_year4_placement_application_lifecycle():
    app_payload = {
        "student_id": "STU-CS-101",
        "company_name": "Google",
        "job_title": "Software Engineer University Graduate",
        "status": "Interview",
        "deadline": "2026-11-20",
        "notes": "Round 2 technical coding"
    }

    resp = client.post("/api/career-launch/applications", json=app_payload)
    assert resp.status_code == 200
    created = resp.json()
    assert created["company_name"] == "Google"
    assert created["status"] == "Interview"

    get_resp = client.get("/api/career-launch/applications?student_id=STU-CS-101")
    assert get_resp.status_code == 200
    apps = get_resp.json()
    assert any(a["id"] == created["id"] for a in apps)


def test_year4_placement_readiness_score():
    resp = client.get("/api/career-launch/readiness-score/STU-CS-101")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_score" in data
    assert "components" in data
    assert "resume_readiness" in data["components"]
    assert "technical_assessment" in data["components"]
    assert "aptitude_assessment" in data["components"]
    assert "interview_practice" in data["components"]
    assert "skills_project_evidence" in data["components"]
    assert data["components"]["resume_readiness"]["weight"] == 20
    assert data["components"]["technical_assessment"]["weight"] == 25
    assert data["components"]["aptitude_assessment"]["weight"] == 15
    assert data["components"]["interview_practice"]["weight"] == 20
    assert data["components"]["skills_project_evidence"]["weight"] == 20


def test_year4_action_plan_and_offers():
    # Action plan
    plan_resp = client.get("/api/career-launch/action-plan/STU-CS-101")
    assert plan_resp.status_code == 200
    tasks = plan_resp.json()
    assert len(tasks) >= 3

    # Toggle task
    t_id = tasks[0]["id"]
    toggle_resp = client.put(f"/api/career-launch/action-plan/STU-CS-101/task/{t_id}/toggle")
    assert toggle_resp.status_code == 200
    toggled = toggle_resp.json()
    assert toggled["is_completed"] is True

    # Offer
    offer_payload = {
        "student_id": "STU-CS-101",
        "company_name": "Microsoft",
        "role_title": "SDE-1",
        "offer_date": "2026-10-12",
        "outcome_status": "Accepted",
        "compensation_details": "₹24,00,000 CTC (Private)"
    }
    off_resp = client.post("/api/career-launch/offers", json=offer_payload)
    assert off_resp.status_code == 200
    created_offer = off_resp.json()
    assert created_offer["company_name"] == "Microsoft"

    offers_resp = client.get("/api/career-launch/offers/STU-CS-101")
    assert offers_resp.status_code == 200
    assert any(o["id"] == created_offer["id"] for o in offers_resp.json())
