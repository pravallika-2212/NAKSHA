"""
ASCENDIQ Data Ingestion & Quality Engine
Parses CSV and Excel files, maps columns to canonical fields,
performs rigorous schema & boundary validation, detects duplicates and unmatched IDs,
and produces row-level error manifests and import summaries without data corruption.
"""

from typing import Dict, Any, List, Tuple, Optional
import io
import csv
import re
from datetime import datetime, timezone

# Canonical Schemas per category
CANONICAL_SCHEMAS = {
    "students": {
        "required": ["student_id", "full_name", "department", "academic_year", "admission_year"],
        "optional": ["email", "section"]
    },
    "academics": {
        "required": ["student_id", "semester", "subject_id", "marks_percentage", "cgpa"],
        "optional": ["subject_name", "backlog_count", "reporting_period"]
    },
    "attendance": {
        "required": ["student_id", "subject_id", "classes_held", "classes_attended"],
        "optional": ["reporting_period", "attendance_percentage"]
    },
    "lms_activity": {
        "required": ["student_id", "reporting_period"],
        "optional": ["logins", "assignments_assigned", "assignments_completed", "overdue_assignments", "active_minutes"]
    },
    "engagement": {
        "required": ["student_id", "reporting_period"],
        "optional": ["events_attended", "club_participation", "hackathons_participated", "verified_certifications"]
    },
    "placement_readiness": {
        "required": ["student_id", "reporting_period"],
        "optional": ["aptitude_percentage", "coding_percentage", "mock_interview_score", "technical_skill_score", "communication_skill_score"]
    },
    "feedback": {
        "required": ["student_id", "reporting_period"],
        "optional": ["satisfaction_score", "faculty_feedback_rating", "needs_support_flag"]
    }
}


def parse_csv_content(content_text: str) -> Tuple[List[str], List[Dict[str, str]]]:
    """
    Parses CSV text handling BOM, CRLF, and quoted fields.
    """
    # Strip UTF-8 BOM if present
    if content_text.startswith('\ufeff'):
        content_text = content_text[1:]
    
    reader = csv.reader(io.StringIO(content_text))
    rows = list(reader)
    if not rows:
        return [], []
    
    headers = [h.strip() for h in rows[0]]
    data_rows = []
    for r in rows[1:]:
        if not any(r): # skip blank rows
            continue
        # pad or truncate row to header length
        row_dict = {}
        for idx, h in enumerate(headers):
            row_dict[h] = r[idx].strip() if idx < len(r) else ""
        data_rows.append(row_dict)
    
    return headers, data_rows


def auto_map_columns(incoming_headers: List[str], category: str) -> Dict[str, str]:
    """
    Suggests best-effort canonical mapping from headers based on regex / similarity.
    """
    schema = CANONICAL_SCHEMAS.get(category, {})
    all_fields = schema.get("required", []) + schema.get("optional", [])
    mapping = {}

    for field in all_fields:
        normalized_field = field.lower().replace("_", "")
        for header in incoming_headers:
            clean_header = header.lower().replace("_", "").replace(" ", "").replace("-", "")
            if clean_header == normalized_field:
                mapping[field] = header
                break
            elif normalized_field in clean_header or clean_header in normalized_field:
                if field not in mapping:
                    mapping[field] = header

    return mapping


def validate_row(category: str, row: Dict[str, Any], known_student_ids: Optional[set] = None) -> List[str]:
    """
    Validates a single mapped row against canonical rules.
    Returns a list of human-readable error descriptions.
    """
    errors = []
    student_id = str(row.get("student_id", "")).strip()

    # Student ID check
    if not student_id:
        errors.append("Missing required student_id identifier.")
    elif known_student_ids is not None and category != "students" and student_id not in known_student_ids:
        errors.append(f"Student ID '{student_id}' does not match any registered student master record.")

    # Category-specific validation
    if category == "students":
        try:
            year = int(row.get("academic_year", 0))
            if not (1 <= year <= 6):
                errors.append(f"Academic year must be between 1 and 6 (got {year}).")
        except (ValueError, TypeError):
            errors.append(f"Academic year must be an integer (got '{row.get('academic_year')}').")

        try:
            adm_year = int(row.get("admission_year", 0))
            if not (2010 <= adm_year <= 2030):
                errors.append(f"Admission year must be between 2010 and 2030 (got {adm_year}).")
        except (ValueError, TypeError):
            errors.append(f"Admission year must be a 4-digit year (got '{row.get('admission_year')}').")

    elif category == "academics":
        # Marks percentage (0-100)
        try:
            marks = float(row.get("marks_percentage", 0))
            if not (0.0 <= marks <= 100.0):
                errors.append(f"Marks percentage must be between 0.0 and 100.0 (got {marks}).")
        except (ValueError, TypeError):
            errors.append(f"Marks percentage must be a valid number (got '{row.get('marks_percentage')}').")

        # CGPA (0-10)
        try:
            cgpa = float(row.get("cgpa", 0))
            if not (0.0 <= cgpa <= 10.0):
                errors.append(f"CGPA must be on a 10.0 scale (got {cgpa}).")
        except (ValueError, TypeError):
            errors.append(f"CGPA must be a valid decimal (got '{row.get('cgpa')}').")

        # Semester
        try:
            sem = int(row.get("semester", 0))
            if not (1 <= sem <= 12):
                errors.append(f"Semester must be between 1 and 12 (got {sem}).")
        except (ValueError, TypeError):
            errors.append(f"Semester must be an integer (got '{row.get('semester')}').")

        # Backlogs
        if row.get("backlog_count"):
            try:
                b = int(row.get("backlog_count", 0))
                if b < 0:
                    errors.append(f"Backlog count cannot be negative (got {b}).")
            except (ValueError, TypeError):
                errors.append(f"Backlog count must be an integer.")

    elif category == "attendance":
        try:
            held = int(row.get("classes_held", 0))
            attended = int(row.get("classes_attended", 0))
            if held < 0:
                errors.append(f"Classes held cannot be negative (got {held}).")
            if attended < 0:
                errors.append(f"Classes attended cannot be negative (got {attended}).")
            if attended > held:
                errors.append(f"Classes attended ({attended}) cannot exceed classes held ({held}).")
        except (ValueError, TypeError):
            errors.append("Classes held and attended must both be positive integers.")

    elif category == "placement_readiness":
        for metric in ["aptitude_percentage", "coding_percentage", "mock_interview_score", "technical_skill_score", "communication_skill_score"]:
            val = row.get(metric)
            if val is not None and str(val).strip() != "":
                try:
                    num = float(val)
                    if not (0.0 <= num <= 100.0):
                        errors.append(f"{metric} must be between 0.0 and 100.0 (got {num}).")
                except (ValueError, TypeError):
                    errors.append(f"{metric} must be a valid number.")

    return errors


def process_import(
    category: str,
    raw_rows: List[Dict[str, str]],
    mapping: Dict[str, str],
    known_student_ids: Optional[set] = None
) -> Dict[str, Any]:
    """
    Applies column mapping, validates each row, flags duplicates and errors,
    and returns accepted vs rejected records with detailed diagnostics.
    """
    accepted_rows = []
    rejected_rows = []
    validation_errors = []
    seen_keys = set()
    duplicate_count = 0
    unmatched_count = 0

    for idx, raw in enumerate(raw_rows, start=1):
        # Map incoming row into canonical fields
        mapped_row = {}
        for canonical_col, incoming_col in mapping.items():
            if incoming_col and incoming_col in raw:
                mapped_row[canonical_col] = raw[incoming_col]
            else:
                mapped_row[canonical_col] = None

        student_id = str(mapped_row.get("student_id", "")).strip()

        # Check Unmatched IDs
        if known_student_ids is not None and category != "students" and student_id and student_id not in known_student_ids:
            unmatched_count += 1

        # Check Duplicates within same import
        dedup_key = (student_id, mapped_row.get("subject_id") or mapped_row.get("reporting_period") or mapped_row.get("semester") or idx)
        if dedup_key in seen_keys:
            duplicate_count += 1
            validation_errors.append({
                "row_number": idx,
                "student_id": student_id,
                "error": f"Duplicate record detected for student '{student_id}' in this reporting period."
            })
            rejected_rows.append({"row_number": idx, "row": mapped_row, "reason": "Duplicate row"})
            continue
        
        seen_keys.add(dedup_key)

        # Validate
        errors = validate_row(category, mapped_row, known_student_ids)
        if errors:
            for err in errors:
                validation_errors.append({
                    "row_number": idx,
                    "student_id": student_id,
                    "error": err
                })
            rejected_rows.append({"row_number": idx, "row": mapped_row, "errors": errors})
        else:
            accepted_rows.append({"row_number": idx, "row": mapped_row})

    return {
        "category": category,
        "total_rows": len(raw_rows),
        "accepted_count": len(accepted_rows),
        "rejected_count": len(rejected_rows),
        "duplicate_count": duplicate_count,
        "unmatched_count": unmatched_count,
        "validation_errors": validation_errors,
        "accepted_records": [r["row"] for r in accepted_rows],
        "rejected_records": rejected_rows,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
