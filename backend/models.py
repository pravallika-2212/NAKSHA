"""
ASCENDIQ Backend Database Models (SQLAlchemy)
Defines normalized schemas for students, academic records, attendance,
LMS activity, engagement, placement readiness, feedback, scores, and interventions.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    Text, ForeignKey, JSON
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), unique=True, nullable=False, index=True) # e.g. STU-2024-001
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    academic_year = Column(Integer, nullable=False) # 1, 2, 3, 4
    admission_year = Column(Integer, nullable=False)
    department = Column(String(100), nullable=False, index=True) # e.g. Computer Science
    section = Column(String(10), nullable=False, default="A")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    academics = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
    attendance = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    lms_activity = relationship("LmsRecord", back_populates="student", cascade="all, delete-orphan")
    engagement = relationship("EngagementRecord", back_populates="student", cascade="all, delete-orphan")
    placement = relationship("PlacementRecord", back_populates="student", cascade="all, delete-orphan")
    feedback = relationship("FeedbackRecord", back_populates="student", cascade="all, delete-orphan")
    score_snapshots = relationship("ScoreSnapshot", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")


class AcademicRecord(Base):
    __tablename__ = "academic_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False) # 1..8
    subject_id = Column(String(50), nullable=False)
    subject_name = Column(String(100), nullable=False)
    marks_percentage = Column(Float, nullable=False)
    cgpa = Column(Float, nullable=False)
    backlog_count = Column(Integer, default=0)
    reporting_period = Column(String(50), nullable=False) # e.g. "Fall 2025"
    recorded_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="academics")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    subject_id = Column(String(50), nullable=False)
    classes_held = Column(Integer, nullable=False)
    classes_attended = Column(Integer, nullable=False)
    attendance_percentage = Column(Float, nullable=False)
    reporting_period = Column(String(50), nullable=False)
    recorded_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="attendance")


class LmsRecord(Base):
    __tablename__ = "lms_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    reporting_period = Column(String(50), nullable=False)
    logins_count = Column(Integer, default=0)
    assignments_assigned = Column(Integer, default=0)
    assignments_completed = Column(Integer, default=0)
    overdue_assignments = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    active_minutes = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="lms_activity")


class EngagementRecord(Base):
    __tablename__ = "engagement_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    reporting_period = Column(String(50), nullable=False)
    events_attended = Column(Integer, default=0)
    club_participation = Column(Integer, default=0)
    hackathons_participated = Column(Integer, default=0)
    verified_certifications = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="engagement")


class PlacementRecord(Base):
    __tablename__ = "placement_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    reporting_period = Column(String(50), nullable=False)
    aptitude_percentage = Column(Float, nullable=True)
    coding_percentage = Column(Float, nullable=True)
    mock_interview_score = Column(Float, nullable=True)
    technical_skill_score = Column(Float, nullable=True)
    communication_skill_score = Column(Float, nullable=True)
    overall_readiness_score = Column(Float, nullable=True)
    recorded_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="placement")


class FeedbackRecord(Base):
    __tablename__ = "feedback_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    reporting_period = Column(String(50), nullable=False)
    satisfaction_score = Column(Float, nullable=True) # 1-5 or 1-100
    faculty_feedback_rating = Column(Float, nullable=True)
    needs_support_flag = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="feedback")


class ScoreSnapshot(Base):
    __tablename__ = "score_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    calculation_version = Column(String(20), default="1.0.0")
    
    # Success Score
    success_score = Column(Float, nullable=True) # 0-100
    success_status = Column(String(30), nullable=False) # available, provisional, insufficient_data
    data_coverage = Column(Float, nullable=False) # 0-100%
    components_breakdown = Column(JSON, nullable=False)
    
    # Risk Score
    risk_score = Column(Float, nullable=False) # 0-100
    risk_category = Column(String(20), nullable=False) # Low, Moderate, High, Critical
    risk_factors = Column(JSON, nullable=False) # List of contributing risk explanations
    
    # Segment & Recommendations
    segment_key = Column(String(60), nullable=False)
    segment_label = Column(String(100), nullable=False)
    recommended_interventions = Column(JSON, nullable=False)
    
    calculated_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="score_snapshots")


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    concern = Column(String(200), nullable=False)
    evidence_summary = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(30), default="recommended") # recommended, planned, in_progress, completed, follow_up_required
    assigned_to = Column(String(100), nullable=False) # Faculty/Advisor name or email
    due_date = Column(String(20), nullable=True)
    follow_up_date = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    
    # Pre & Post Intervention Metric Tracking (descriptive comparison)
    pre_success_score = Column(Float, nullable=True)
    pre_risk_score = Column(Float, nullable=True)
    post_success_score = Column(Float, nullable=True)
    post_risk_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    student = relationship("Student", back_populates="interventions")
    audits = relationship("InterventionAudit", back_populates="intervention", cascade="all, delete-orphan")


class InterventionAudit(Base):
    __tablename__ = "intervention_audits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    intervention_id = Column(String(36), ForeignKey("interventions.id"), nullable=False, index=True)
    changed_by = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False) # created, updated, status_changed
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=utc_now)

    intervention = relationship("Intervention", back_populates="audits")


class DataImportJob(Base):
    __tablename__ = "data_import_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(50), nullable=False) # academics, attendance, lms, engagement, placement, feedback
    filename = Column(String(200), nullable=False)
    file_sha256 = Column(String(64), nullable=True)
    status = Column(String(30), default="completed") # pending, staged, completed, failed
    total_rows = Column(Integer, default=0)
    accepted_rows = Column(Integer, default=0)
    rejected_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    unmatched_ids = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

    validation_errors = relationship("DataImportError", back_populates="import_job", cascade="all, delete-orphan")


class DataImportError(Base):
    __tablename__ = "data_import_errors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    import_job_id = Column(String(36), ForeignKey("data_import_jobs.id"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    student_id = Column(String(50), nullable=True)
    column_name = Column(String(50), nullable=True)
    raw_value = Column(String(200), nullable=True)
    error_message = Column(Text, nullable=False)

    import_job = relationship("DataImportJob", back_populates="validation_errors")
