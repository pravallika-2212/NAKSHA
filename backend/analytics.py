"""
ASCENDIQ Analytics Engine
Implements:
1. Student Success Score (0-100) with explainable components, weight configuration,
   and documented missing-data policy (provisional / insufficient data).
2. Distinct Risk Score (0-100) with explicit rule-based indicators and threshold comparisons.
3. Student Segmentation Engine (8 canonical institutional segments).
4. Contextual Intervention Recommendation Generator.
"""

from typing import Dict, Any, List, Optional, Tuple

# Baseline configurable weights (Total = 100%)
DEFAULT_SUCCESS_WEIGHTS = {
    "academic": 35.0,
    "attendance": 20.0,
    "lms": 15.0,
    "placement": 25.0,
    "engagement": 5.0,
}

# Configurable Institutional Thresholds
THRESHOLDS = {
    "minimum_coverage": 60.0,            # Minimum data coverage to compute a provisional score
    "academic_pass_marks": 50.0,         # Minimum passing marks percentage
    "academic_strong_marks": 70.0,       # Strong academic performance threshold
    "cgpa_warning": 6.0,                 # CGPA below which warning triggers
    "attendance_mandatory": 75.0,        # Institutional minimum attendance %
    "attendance_critical": 65.0,         # Severe attendance shortage %
    "lms_completion_low": 60.0,          # LMS assignment completion threshold
    "overdue_assignments_max": 2,        # Overdue assignments warning trigger
    "placement_coding_low": 50.0,        # Coding assessment preparation threshold
    "placement_aptitude_low": 50.0,      # Aptitude preparation threshold
    "placement_strong": 70.0,            # High career readiness threshold
    "engagement_high": 60.0,             # High extracurricular engagement
}


def normalize_academic(marks: Optional[float], cgpa: Optional[float], backlogs: int = 0) -> Optional[float]:
    """
    Normalizes academic performance to 0-100.
    Prefers actual marks percentage if provided; otherwise maps CGPA (out of 10.0).
    Deducts 5 points per active backlog.
    """
    if marks is not None:
        base = float(marks)
    elif cgpa is not None:
        base = (float(cgpa) / 10.0) * 100.0
    else:
        return None
    
    score = max(0.0, min(100.0, base - (backlogs * 5.0)))
    return round(score, 2)


def normalize_attendance(classes_held: Optional[int], classes_attended: Optional[int], direct_pct: Optional[float] = None) -> Optional[float]:
    """
    Normalizes attendance to 0-100%.
    """
    if direct_pct is not None:
        return round(max(0.0, min(100.0, float(direct_pct))), 2)
    if classes_held and classes_held > 0 and classes_attended is not None:
        pct = (classes_attended / classes_held) * 100.0
        return round(max(0.0, min(100.0, pct)), 2)
    return None


def normalize_lms(completion_rate: Optional[float], active_minutes: Optional[int] = None, overdue_count: int = 0) -> Optional[float]:
    """
    Normalizes LMS learning activity to 0-100%.
    70% weight on assignment completion, 30% on platform engagement (capped at 120 mins).
    Deducts 5 points per overdue assignment.
    """
    if completion_rate is None and active_minutes is None:
        return None
    
    comp = completion_rate if completion_rate is not None else 50.0
    active_norm = min(100.0, (active_minutes / 120.0) * 100.0) if active_minutes is not None else comp
    combined = (0.70 * comp) + (0.30 * active_norm)
    final_score = max(0.0, min(100.0, combined - (overdue_count * 5.0)))
    return round(final_score, 2)


def normalize_placement(aptitude: Optional[float], coding: Optional[float], mock_interview: Optional[float],
                        technical: Optional[float] = None, communication: Optional[float] = None) -> Optional[float]:
    """
    Normalizes career readiness to 0-100% based on available assessments.
    """
    valid_scores = [s for s in [aptitude, coding, mock_interview, technical, communication] if s is not None]
    if not valid_scores:
        return None
    return round(sum(valid_scores) / len(valid_scores), 2)


def normalize_engagement(events: int = 0, clubs: int = 0, hackathons: int = 0, certs: int = 0) -> float:
    """
    Calculates verified extracurricular engagement capped at 100.
    """
    score = (events * 15.0) + (clubs * 20.0) + (hackathons * 35.0) + (certs * 30.0)
    return round(min(100.0, max(0.0, score)), 2)


def calculate_success_score(
    academic_score: Optional[float],
    attendance_score: Optional[float],
    lms_score: Optional[float],
    placement_score: Optional[float],
    engagement_score: Optional[float],
    weights: Optional[Dict[str, float]] = None,
    minimum_coverage: float = THRESHOLDS["minimum_coverage"]
) -> Dict[str, Any]:
    """
    Calculates the explainable Student Success Score on a 0-100 scale.
    Implements the documented missing-data policy:
    - Never silently imputes missing as 0.
    - Re-normalizes available weight if coverage >= minimum_coverage.
    - Returns coverage % and status (available, provisional, insufficient_data).
    """
    w = weights or DEFAULT_SUCCESS_WEIGHTS
    total_configured_weight = sum(w.values())

    raw_values = {
        "academic": academic_score,
        "attendance": attendance_score,
        "lms": lms_score,
        "placement": placement_score,
        "engagement": engagement_score,
    }

    available_components = {k: v for k, v in raw_values.items() if v is not None and w.get(k, 0) > 0}
    available_weight = sum(w[k] for k in available_components.keys())

    coverage_pct = round((available_weight / total_configured_weight) * 100.0, 1) if total_configured_weight > 0 else 0.0

    if coverage_pct < minimum_coverage:
        final_score = None
        status = "insufficient_data"
    elif available_weight < total_configured_weight:
        # Provisional score: renormalized over available weight
        weighted_sum = sum(val * w[k] for k, val in available_components.items())
        final_score = round(weighted_sum / available_weight, 1)
        status = "provisional"
    else:
        # Full score
        weighted_sum = sum(val * w[k] for k, val in available_components.items())
        final_score = round(weighted_sum / total_configured_weight, 1)
        status = "available"

    # Detail breakdown for transparency and explainability
    breakdown = {}
    for key, weight in w.items():
        val = raw_values.get(key)
        if val is None or final_score is None:
            contrib = None
        else:
            contrib = round(val * (weight / available_weight), 2)
        
        breakdown[key] = {
            "name": key.replace("_", " ").title(),
            "observed_value": val,
            "weight_pct": weight,
            "weighted_contribution": contrib,
            "is_missing": val is None,
            "normalization": "Normalized to 0-100 scale"
        }

    return {
        "score": final_score,
        "status": status,
        "coverage_pct": coverage_pct,
        "minimum_coverage": minimum_coverage,
        "formula": "Weighted Sum of Normalized Indicators (Academic 35%, Attendance 20%, LMS 15%, Placement 25%, Engagement 5%)",
        "components": breakdown
    }


def calculate_risk_score(
    academic_score: Optional[float],
    attendance_score: Optional[float],
    lms_completion: Optional[float],
    overdue_assignments: int = 0,
    backlogs: int = 0,
    semester_marks_drop: Optional[float] = None, # e.g. 15% drop from previous semester
    coding_score: Optional[float] = None,
    aptitude_score: Optional[float] = None,
    communication_score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Calculates a distinct 0-100 Risk Score based on explicit warning signals.
    Does NOT derive risk as (100 - Success Score).
    Returns severity level, risk factors with evidence, thresholds, and exact rule explanations.
    """
    risk_factors: List[Dict[str, Any]] = []
    total_risk_points = 0.0

    # 1. Attendance Risk Indicators
    if attendance_score is not None:
        if attendance_score < THRESHOLDS["attendance_critical"]:
            pts = 35.0
            total_risk_points += pts
            risk_factors.append({
                "category": "attendance",
                "severity": "critical",
                "points": pts,
                "indicator": "Severe Attendance Shortage",
                "observed_value": f"{attendance_score}%",
                "threshold": f"{THRESHOLDS['attendance_critical']}%",
                "explanation": f"Observed attendance of {attendance_score}% is critically below institutional minimum of {THRESHOLDS['attendance_mandatory']}%.",
                "rule": "Attendance < 65% triggers Critical Risk (+35 pts)"
            })
        elif attendance_score < THRESHOLDS["attendance_mandatory"]:
            pts = 25.0
            total_risk_points += pts
            risk_factors.append({
                "category": "attendance",
                "severity": "high",
                "points": pts,
                "indicator": "Attendance Below Institutional Requirement",
                "observed_value": f"{attendance_score}%",
                "threshold": f"{THRESHOLDS['attendance_mandatory']}%",
                "explanation": f"Observed attendance ({attendance_score}%) is below the mandatory 75% requirement.",
                "rule": "Attendance < 75% triggers High Risk (+25 pts)"
            })

    # 2. Academic Risk Indicators
    if academic_score is not None:
        if academic_score < THRESHOLDS["academic_pass_marks"]:
            pts = 30.0
            total_risk_points += pts
            risk_factors.append({
                "category": "academic",
                "severity": "critical",
                "points": pts,
                "indicator": "Failing Academic Performance",
                "observed_value": f"{academic_score}/100",
                "threshold": f"{THRESHOLDS['academic_pass_marks']}/100",
                "explanation": f"Academic score {academic_score} is below the passing cutoff of {THRESHOLDS['academic_pass_marks']}.",
                "rule": "Academic marks < 50 triggers Critical Risk (+30 pts)"
            })
        elif academic_score < 60.0:
            pts = 15.0
            total_risk_points += pts
            risk_factors.append({
                "category": "academic",
                "severity": "moderate",
                "points": pts,
                "indicator": "Marginal Academic Standing",
                "observed_value": f"{academic_score}/100",
                "threshold": "60/100",
                "explanation": f"Academic performance ({academic_score}) is close to academic warning threshold.",
                "rule": "Academic marks between 50-60 triggers Moderate Risk (+15 pts)"
            })

    if backlogs > 0:
        pts = 25.0 if backlogs >= 2 else 15.0
        total_risk_points += pts
        risk_factors.append({
            "category": "academic",
            "severity": "high" if backlogs >= 2 else "moderate",
            "points": pts,
            "indicator": "Active Backlogs",
            "observed_value": f"{backlogs} backlog(s)",
            "threshold": "0 backlogs",
            "explanation": f"Student has {backlogs} un-cleared backlog subject(s), delaying academic progression.",
            "rule": f"Backlogs >= 2 (+25 pts) or 1 backlog (+15 pts)"
        })

    if semester_marks_drop is not None and semester_marks_drop >= 10.0:
        pts = 20.0
        total_risk_points += pts
        risk_factors.append({
            "category": "academic",
            "severity": "high",
            "points": pts,
            "indicator": "Steep Semester Academic Decline",
            "observed_value": f"-{semester_marks_drop}% drop",
            "threshold": ">= 10% decline",
            "explanation": f"Performance declined by {semester_marks_drop}% compared to the prior semester.",
            "rule": "Semester marks drop >= 10% triggers High Risk (+20 pts)"
        })

    # 3. LMS Risk Indicators
    if overdue_assignments >= THRESHOLDS["overdue_assignments_max"]:
        pts = 20.0
        total_risk_points += pts
        risk_factors.append({
            "category": "lms",
            "severity": "high",
            "points": pts,
            "indicator": "Multiple Overdue Coursework Submissions",
            "observed_value": f"{overdue_assignments} overdue",
            "threshold": f">= {THRESHOLDS['overdue_assignments_max']} overdue",
            "explanation": f"{overdue_assignments} assignments remain pending past their submission deadline.",
            "rule": "Overdue assignments >= 2 triggers High Risk (+20 pts)"
        })
    elif lms_completion is not None and lms_completion < THRESHOLDS["lms_completion_low"]:
        pts = 15.0
        total_risk_points += pts
        risk_factors.append({
            "category": "lms",
            "severity": "moderate",
            "points": pts,
            "indicator": "Low LMS Assignment Completion",
            "observed_value": f"{lms_completion}%",
            "threshold": f"{THRESHOLDS['lms_completion_low']}%",
            "explanation": f"Only {lms_completion}% of assigned coursework was completed.",
            "rule": "LMS completion < 60% triggers Moderate Risk (+15 pts)"
        })

    # 4. Placement Readiness Risk Indicators
    if coding_score is not None and coding_score < THRESHOLDS["placement_coding_low"]:
        pts = 20.0
        total_risk_points += pts
        risk_factors.append({
            "category": "placement",
            "severity": "high",
            "points": pts,
            "indicator": "Coding & Technical Skill Gap",
            "observed_value": f"{coding_score}%",
            "threshold": f"{THRESHOLDS['placement_coding_low']}%",
            "explanation": f"Coding assessment result ({coding_score}%) is below campus placement benchmark.",
            "rule": "Coding assessment < 50% triggers High Risk (+20 pts)"
        })

    if aptitude_score is not None and aptitude_score < THRESHOLDS["placement_aptitude_low"]:
        pts = 15.0
        total_risk_points += pts
        risk_factors.append({
            "category": "placement",
            "severity": "moderate",
            "points": pts,
            "indicator": "Aptitude Assessment Gap",
            "observed_value": f"{aptitude_score}%",
            "threshold": f"{THRESHOLDS['placement_aptitude_low']}%",
            "explanation": f"Aptitude score ({aptitude_score}%) requires structured practice before placement season.",
            "rule": "Aptitude assessment < 50% triggers Moderate Risk (+15 pts)"
        })

    # Final Risk Score clamped to 100
    final_risk_score = round(min(100.0, total_risk_points), 1)

    # Risk Category classification
    if final_risk_score >= 75.0:
        category = "Critical"
    elif final_risk_score >= 55.0:
        category = "High"
    elif final_risk_score >= 30.0:
        category = "Moderate"
    else:
        category = "Low"

    return {
        "risk_score": final_risk_score,
        "risk_category": category,
        "risk_factors_count": len(risk_factors),
        "risk_factors": risk_factors
    }


def classify_student_segment(
    academic_score: Optional[float],
    attendance_score: Optional[float],
    placement_score: Optional[float],
    engagement_score: Optional[float],
    coding_score: Optional[float] = None,
    overdue_assignments: int = 0,
    semester_marks_drop: Optional[float] = None,
    data_coverage: float = 100.0
) -> Tuple[str, str, str]:
    """
    Classifies a student into one of the 8 institutional segments using transparent rules.
    Returns: (segment_key, segment_label, reason)
    """
    # 8. Insufficient Data
    if data_coverage < THRESHOLDS["minimum_coverage"]:
        return (
            "insufficient_data",
            "Insufficient Data for Reliable Classification",
            f"Data completeness is {data_coverage}%, which is below the mandatory threshold of {THRESHOLDS['minimum_coverage']}%. Full assessment withheld to protect student fairness."
        )

    # 3. Declining academics, low attendance
    if (attendance_score is not None and attendance_score < THRESHOLDS["attendance_mandatory"]) and (
        (academic_score is not None and academic_score < 60.0) or (semester_marks_drop is not None and semester_marks_drop >= 10.0)
    ):
        return (
            "declining_academics_low_attendance",
            "Declining Academics with Low Attendance",
            "Attendance is below 75% coinciding with falling or marginal subject marks. Immediate faculty check-in recommended."
        )

    # 4. Low attendance, assignments at risk
    if (attendance_score is not None and attendance_score < THRESHOLDS["attendance_mandatory"]) and overdue_assignments >= 2:
        return (
            "low_attendance_assignments_at_risk",
            "Low Attendance & Coursework at Risk",
            f"Attendance is below {THRESHOLDS['attendance_mandatory']}% with {overdue_assignments} overdue assignments requiring an organized catch-up plan."
        )

    # 1. Strong academics, low placement readiness
    if (academic_score is not None and academic_score >= THRESHOLDS["academic_strong_marks"]) and (
        (placement_score is not None and placement_score < 55.0) or (coding_score is not None and coding_score < 50.0)
    ):
        return (
            "strong_academics_low_placement",
            "Strong Academics, Placement Preparation Recommended",
            f"High academic performance ({academic_score}/100) paired with an opportunity to improve technical coding ({coding_score if coding_score is not None else placement_score}%)."
        )

    # 2. Strong academics, strong placement readiness
    if (academic_score is not None and academic_score >= THRESHOLDS["academic_strong_marks"]) and (
        placement_score is not None and placement_score >= THRESHOLDS["placement_strong"]
    ):
        return (
            "strong_academics_strong_placement",
            "High Performing & Placement Ready",
            f"Excellent academic standing ({academic_score}/100) and high career readiness ({placement_score}/100). Prime candidate for leadership and honors opportunities."
        )

    # 5. Strong engagement, weak assessments
    if (engagement_score is not None and engagement_score >= THRESHOLDS["engagement_high"]) and (
        (academic_score is not None and academic_score < THRESHOLDS["academic_pass_marks"]) or (placement_score is not None and placement_score < 50.0)
    ):
        return (
            "strong_engagement_weak_assessments",
            "High Campus Engagement, Assessment Support Needed",
            "Active in clubs and events, but assessment scores indicate a need for academic focus and exam coaching."
        )

    # 6. Low engagement, declining academic performance
    if (engagement_score is not None and engagement_score < 25.0) and (
        academic_score is not None and academic_score < 55.0
    ):
        return (
            "low_engagement_declining_academics",
            "Low Engagement & Academic Review Needed",
            "Low extracurricular/co-curricular participation coupled with vulnerable academic grades."
        )

    # 7. Placement-ready, incomplete application preparation
    if (placement_score is not None and placement_score >= 65.0) and (
        academic_score is not None and academic_score >= 60.0
    ):
        return (
            "placement_ready_incomplete_prep",
            "Placement Ready (Targeted Polish Recommended)",
            "Strong core technical foundations; recommended for mock interviews and resume fine-tuning."
        )

    # Default fallback
    return (
        "developing_progress",
        "Developing Across Multiple Areas",
        "Student is progressing steadily across indicators with standard academic mentoring."
    )


def generate_recommendations(
    risk_factors: List[Dict[str, Any]],
    segment_key: str,
    student_name: str = "the student"
) -> List[Dict[str, Any]]:
    """
    Generates actionable, evidence-based practical intervention recommendations.
    Ensures human review remains in the loop; never makes automatic disciplinary decisions.
    """
    recommendations = []
    seen_types = set()

    # Rule-based suggestions based on identified risk indicators
    for factor in risk_factors:
        cat = factor.get("category")
        if cat == "attendance" and "attendance" not in seen_types:
            seen_types.add("attendance")
            recommendations.append({
                "action_type": "Attendance Check-In & Academic Support",
                "priority": "High" if factor.get("severity") == "critical" else "Medium",
                "recommended_action": f"Schedule a one-on-one advising conversation to review recent attendance patterns, uncover any transportation or health hurdles, and formulate an attendance recovery contract.",
                "evidence": factor.get("explanation"),
                "responsible_role": "Faculty Mentor / Class Advisor"
            })
        elif cat == "academic" and "academic" not in seen_types:
            seen_types.add("academic")
            recommendations.append({
                "action_type": "Remedial Coaching & Subject Revision",
                "priority": "High",
                "recommended_action": f"Review mid-term assessments in weak subjects and assign peer tutoring or targeted tutorial hours before end-term examinations.",
                "evidence": factor.get("explanation"),
                "responsible_role": "Department Subject Faculty"
            })
        elif cat == "lms" and "lms" not in seen_types:
            seen_types.add("lms")
            recommendations.append({
                "action_type": "Coursework Catch-up Plan",
                "priority": "Medium",
                "recommended_action": f"Help {student_name} establish a structured 2-week schedule to submit pending assignments and clarify difficult topics.",
                "evidence": factor.get("explanation"),
                "responsible_role": "Course Instructor / Teaching Assistant"
            })
        elif cat == "placement" and "placement" not in seen_types:
            seen_types.add("placement")
            recommendations.append({
                "action_type": "Technical Coding Bootcamp & Mock Practice",
                "priority": "High",
                "recommended_action": f"Enroll student in weekly algorithmic problem-solving labs and schedule diagnostic mock interviews to build interview confidence.",
                "evidence": factor.get("explanation"),
                "responsible_role": "Training & Placement Officer (TPO)"
            })

    # Segment-specific interventions
    if segment_key == "strong_academics_low_placement" and "placement" not in seen_types:
        recommendations.append({
            "action_type": "Targeted Placement Coaching",
            "priority": "High",
            "recommended_action": "Leverage student's high conceptual aptitude to quickly accelerate hands-on coding and live technical interview communication.",
            "evidence": "High academic grades with lower coding assessment results.",
            "responsible_role": "Placement Coordinator / Industry Mentor"
        })
    elif segment_key == "insufficient_data":
        recommendations.append({
            "action_type": "Data Ingestion & Verification Request",
            "priority": "Medium",
            "recommended_action": "Request updated semester grade sheets and attendance logs from the college administration to complete the analytical profile.",
            "evidence": "Data completeness below 60%.",
            "responsible_role": "Department Academic Coordinator"
        })

    if not recommendations:
        recommendations.append({
            "action_type": "Routine Academic Check-in",
            "priority": "Low",
            "recommended_action": "Continue regular semester mentoring check-ins to support steady academic and career development.",
            "evidence": "No urgent risk indicators flagged.",
            "responsible_role": "Assigned Mentor"
        })

    return recommendations
