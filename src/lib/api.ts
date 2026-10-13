/**
 * ASCENDIQ Frontend API Client & State Service
 * Handles communication with the FastAPI backend (/api/*)
 * and provides instant reliable fallback to built-in synthetic datasets.
 */

export interface StudentProfile {
  student_id: string;
  full_name: string;
  email: string;
  department: string;
  academic_year: number;
  admission_year: number;
  section: string;
  academic?: {
    semester: number;
    subject_id: string;
    subject_name: string;
    marks_percentage: number;
    cgpa: number;
    backlog_count: number;
    previous_semester_marks?: number;
  } | null;
  attendance?: {
    classes_held: number;
    classes_attended: number;
    percentage: number;
  } | null;
  lms?: {
    completion_rate: number;
    active_minutes: number;
    overdue: number;
  } | null;
  placement?: {
    aptitude_percentage: number;
    coding_percentage: number;
    mock_interview_score: number;
    technical_skill_score: number;
    communication_skill_score: number;
  } | null;
  engagement?: {
    events: number;
    clubs: number;
    hackathons: number;
    certs: number;
  } | null;
  success_score: number | null;
  success_status: 'available' | 'provisional' | 'insufficient_data';
  data_coverage: number;
  success_breakdown: Record<string, {
    name: string;
    observed_value: number | null;
    weight_pct: number;
    weighted_contribution: number | null;
    is_missing: boolean;
    normalization: string;
  }>;
  risk_score: number;
  risk_category: 'Low' | 'Moderate' | 'High' | 'Critical';
  risk_factors: Array<{
    category: string;
    severity: string;
    points: number;
    indicator: string;
    observed_value: string;
    threshold: string;
    explanation: string;
    rule: string;
  }>;
  segment_key: string;
  segment_label: string;
  segment_reason: string;
  recommendations: Array<{
    action_type: string;
    priority: string;
    recommended_action: string;
    evidence: string;
    responsible_role: string;
  }>;
  scenario_tag?: string;
  is_sample_data: boolean;
  interventions_history?: InterventionItem[];
  skills?: {
    technical: Array<{ name: string; score: number; status: 'mastered' | 'developing' | 'needs_attention' }>;
    soft: Array<{ name: string; score: number; status: 'mastered' | 'developing' | 'needs_attention' }>;
  } | null;
  feedback?: {
    satisfaction_score: number;
    faculty_rating: number;
    faculty_note: string;
  } | null;
  subjects?: Array<{
    code: string;
    name: string;
    marks: number;
    max_marks: number;
    attendance: number;
    credits: number;
    grade: string;
  }>;
  semester_history?: Array<{
    semester: number;
    gpa: number;
    credits: number;
    academic_year: number;
  }>;
  placement_details?: {
    composite_score: number;
    tier_eligibility: Array<{ tier: string; min_cgpa: number; min_coding: number; eligible: boolean; note: string }>;
    checklist: Array<{ task: string; completed: boolean; category: string; priority: string }>;
  };
}

export interface InterventionItem {
  id: string;
  student_id: string;
  student_name: string;
  concern: string;
  evidence_summary: string;
  recommended_action: string;
  status: 'recommended' | 'planned' | 'in_progress' | 'completed' | 'follow_up_required';
  assigned_to: string;
  due_date?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
  outcome?: string | null;
  pre_success_score?: number | null;
  pre_risk_score?: number | null;
  post_success_score?: number | null;
  post_risk_score?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsOverview {
  is_sample_data: boolean;
  cohort_summary: {
    total_students: number;
    complete_profiles: number;
    provisional_profiles: number;
    insufficient_data_profiles: number;
    average_success_score: number;
    placement_ready_count: number;
    active_interventions: number;
    data_completeness_pct: number;
  };
  risk_distribution: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  segment_distribution: Record<string, number>;
  department_distribution: Record<string, number>;
  recent_import_count: number;
}

const FALLBACK_DEMO_STUDENTS: StudentProfile[] = [
  {
    student_id: "STU-CS-101",
    full_name: "Priya Sharma",
    email: "priya.sharma@demo.ascendiq.ai",
    department: "Computer Science",
    academic_year: 3,
    admission_year: 2023,
    section: "A",
    academic: {
      semester: 6, subject_id: "CS601", subject_name: "Advanced Operating Systems",
      marks_percentage: 88.5, cgpa: 8.92, backlog_count: 0, previous_semester_marks: 87.0
    },
    attendance: { classes_held: 90, classes_attended: 84, percentage: 93.3 },
    lms: { completion_rate: 95.0, active_minutes: 140, overdue: 0 },
    placement: {
      aptitude_percentage: 42.0, coding_percentage: 36.0, mock_interview_score: 45.0,
      technical_skill_score: 40.0, communication_skill_score: 75.0
    },
    engagement: { events: 2, clubs: 1, hackathons: 0, certs: 1 },
    success_score: 68.6,
    success_status: "available",
    data_coverage: 100.0,
    success_breakdown: {
      academic: { name: "Academic Performance", observed_value: 88.5, weight_pct: 35.0, weighted_contribution: 31.0, is_missing: false, normalization: "Normalized marks (minus backlog penalty)" },
      attendance: { name: "Attendance", observed_value: 93.3, weight_pct: 20.0, weighted_contribution: 18.7, is_missing: false, normalization: "Percentage of classes attended" },
      lms: { name: "LMS Engagement", observed_value: 95.0, weight_pct: 15.0, weighted_contribution: 14.3, is_missing: false, normalization: "Coursework completion rate and active time" },
      placement: { name: "Career Readiness", observed_value: 47.6, weight_pct: 25.0, weighted_contribution: 11.9, is_missing: false, normalization: "Assessment aggregate (aptitude, coding, interviews)" },
      engagement: { name: "Extracurricular Engagement", observed_value: 60.0, weight_pct: 5.0, weighted_contribution: 3.0, is_missing: false, normalization: "Verified participation points (capped at 100)" }
    },
    risk_score: 35.0,
    risk_category: "Moderate",
    risk_factors: [
      {
        category: "placement", severity: "high", points: 20.0,
        indicator: "Coding & Technical Skill Gap", observed_value: "36.0%", threshold: "50.0%",
        explanation: "Coding assessment result (36.0%) is below campus placement benchmark of 50.0%.",
        rule: "Coding assessment < 50% triggers High Risk (+20 pts)"
      },
      {
        category: "placement", severity: "moderate", points: 15.0,
        indicator: "Aptitude Assessment Gap", observed_value: "42.0%", threshold: "50.0%",
        explanation: "Aptitude score (42.0%) requires structured practice before placement season.",
        rule: "Aptitude assessment < 50% triggers Moderate Risk (+15 pts)"
      }
    ],
    segment_key: "strong_academics_low_placement",
    segment_label: "Strong Academics, Placement Preparation Recommended",
    segment_reason: "High academic performance (88.5/100) paired with an opportunity to improve technical coding (36.0%).",
    recommendations: [
      {
        action_type: "Technical Coding Bootcamp & Mock Practice",
        priority: "High",
        recommended_action: "Enroll in weekly algorithmic problem-solving labs and schedule diagnostic mock interviews to build interview confidence.",
        evidence: "Coding assessment result (36.0%) is below campus placement benchmark of 50.0%.",
        responsible_role: "Training & Placement Officer (TPO)"
      },
      {
        action_type: "Targeted Placement Coaching",
        priority: "High",
        recommended_action: "Leverage student's high conceptual aptitude to quickly accelerate hands-on coding and live technical interview communication.",
        evidence: "High academic grades with lower coding assessment results.",
        responsible_role: "Placement Coordinator / Industry Mentor"
      }
    ],
    scenario_tag: "Scenario A: High Academic, Low Placement Readiness",
    is_sample_data: true,
    skills: {
      technical: [
        { name: "Algorithms & Problem Solving", score: 48, status: "needs_attention" },
        { name: "Core Java & Python", score: 72, status: "developing" },
        { name: "Advanced Operating Systems", score: 92, status: "mastered" },
        { name: "Database System Internals", score: 88, status: "mastered" }
      ],
      soft: [
        { name: "Technical Communication", score: 75, status: "mastered" },
        { name: "Team Leadership", score: 78, status: "mastered" }
      ]
    },
    feedback: {
      satisfaction_score: 88,
      faculty_rating: 92,
      faculty_note: "Exceptional analytical thinking in OS labs. Strongly advised to focus on daily LeetCode/HackerRank coding challenges to convert academic strength into Tier-1 placements."
    },
    subjects: [
      { code: "CS601", name: "Advanced Operating Systems", marks: 92, max_marks: 100, attendance: 95, credits: 4, grade: "A+" },
      { code: "CS602", name: "Database System Internals", marks: 89, max_marks: 100, attendance: 93, credits: 4, grade: "A" },
      { code: "CS603", name: "Compiler Design", marks: 86, max_marks: 100, attendance: 92, credits: 4, grade: "A" },
      { code: "CS604", name: "Computer Networks & Security", marks: 87, max_marks: 100, attendance: 93, credits: 3, grade: "A" }
    ],
    semester_history: [
      { semester: 1, gpa: 8.65, credits: 24, academic_year: 1 },
      { semester: 2, gpa: 8.80, credits: 24, academic_year: 1 },
      { semester: 3, gpa: 8.95, credits: 24, academic_year: 2 },
      { semester: 4, gpa: 8.90, credits: 24, academic_year: 2 },
      { semester: 5, gpa: 9.00, credits: 22, academic_year: 3 },
      { semester: 6, gpa: 8.92, credits: 22, academic_year: 3 }
    ],
    placement_details: {
      composite_score: 47.6,
      tier_eligibility: [
        { tier: "Tier-1 Product Companies (₹18-40 LPA)", min_cgpa: 8.5, min_coding: 80, eligible: false, note: "CGPA cleared (8.92), but coding diagnostic (36%) is below the 80% cutoff." },
        { tier: "Tier-2 Technology Core (₹10-18 LPA)", min_cgpa: 7.5, min_coding: 65, eligible: false, note: "CGPA cleared, coding assessment requires +29% progress." },
        { tier: "Global Consulting & IT Services", min_cgpa: 6.5, min_coding: 50, eligible: false, note: "Within 14 points of reaching institutional 50% cutoff." }
      ],
      checklist: [
        { task: "Enroll in Algorithmic Problem Solving Lab", completed: true, category: "Preparation", priority: "High" },
        { task: "Quantitative Aptitude Diagnostic Mock", completed: true, category: "Diagnostic", priority: "High" },
        { task: "Complete 50 LeetCode Medium Problems", completed: false, category: "Practice", priority: "Critical" },
        { task: "Technical Mock Interview Round 1", completed: false, category: "Interview", priority: "High" },
        { task: "Peer Mock Interview with Alumni", completed: false, category: "Interview", priority: "Medium" }
      ]
    }
  },
  {
    student_id: "STU-CS-102",
    full_name: "Rohan Verma",
    email: "rohan.verma@demo.ascendiq.ai",
    department: "Computer Science",
    academic_year: 3,
    admission_year: 2023,
    section: "B",
    academic: {
      semester: 6, subject_id: "CS602", subject_name: "Database Internals",
      marks_percentage: 48.0, cgpa: 5.40, backlog_count: 2, previous_semester_marks: 72.0
    },
    attendance: { classes_held: 85, classes_attended: 51, percentage: 60.0 },
    lms: { completion_rate: 42.0, active_minutes: 35, overdue: 3 },
    placement: {
      aptitude_percentage: 38.0, coding_percentage: 32.0, mock_interview_score: 40.0,
      technical_skill_score: 35.0, communication_skill_score: 50.0
    },
    engagement: { events: 0, clubs: 0, hackathons: 0, certs: 0 },
    success_score: 44.8,
    success_status: "available",
    data_coverage: 100.0,
    success_breakdown: {
      academic: { name: "Academic Performance", observed_value: 38.0, weight_pct: 35.0, weighted_contribution: 13.3, is_missing: false, normalization: "Normalized marks minus 10 pts backlog penalty" },
      attendance: { name: "Attendance", observed_value: 60.0, weight_pct: 20.0, weighted_contribution: 12.0, is_missing: false, normalization: "Percentage of classes attended" },
      lms: { name: "LMS Engagement", observed_value: 32.0, weight_pct: 15.0, weighted_contribution: 4.8, is_missing: false, normalization: "Low completion rate minus overdue penalties" },
      placement: { name: "Career Readiness", observed_value: 39.0, weight_pct: 25.0, weighted_contribution: 9.8, is_missing: false, normalization: "Assessment aggregate" },
      engagement: { name: "Extracurricular Engagement", observed_value: 0.0, weight_pct: 5.0, weighted_contribution: 0.0, is_missing: false, normalization: "No co-curricular records" }
    },
    risk_score: 85.0,
    risk_category: "Critical",
    risk_factors: [
      {
        category: "attendance", severity: "critical", points: 35.0,
        indicator: "Severe Attendance Shortage", observed_value: "60.0%", threshold: "65.0%",
        explanation: "Observed attendance of 60.0% is critically below institutional minimum of 75.0%.",
        rule: "Attendance < 65% triggers Critical Risk (+35 pts)"
      },
      {
        category: "academic", severity: "critical", points: 30.0,
        indicator: "Failing Academic Performance", observed_value: "38.0/100", threshold: "50.0/100",
        explanation: "Academic score 38.0 is below the passing cutoff of 50.0.",
        rule: "Academic marks < 50 triggers Critical Risk (+30 pts)"
      },
      {
        category: "academic", severity: "high", points: 25.0,
        indicator: "Active Backlogs", observed_value: "2 backlog(s)", threshold: "0 backlogs",
        explanation: "Student has 2 un-cleared backlog subject(s), delaying academic progression.",
        rule: "Backlogs >= 2 (+25 pts)"
      },
      {
        category: "academic", severity: "high", points: 20.0,
        indicator: "Steep Semester Academic Decline", observed_value: "-24.0% drop", threshold: ">= 10% decline",
        explanation: "Performance declined by 24.0% compared to the prior semester.",
        rule: "Semester marks drop >= 10% triggers High Risk (+20 pts)"
      },
      {
        category: "lms", severity: "high", points: 20.0,
        indicator: "Multiple Overdue Coursework Submissions", observed_value: "3 overdue", threshold: ">= 2 overdue",
        explanation: "3 assignments remain pending past their submission deadline.",
        rule: "Overdue assignments >= 2 triggers High Risk (+20 pts)"
      }
    ],
    segment_key: "declining_academics_low_attendance",
    segment_label: "Declining Academics with Low Attendance",
    segment_reason: "Attendance is below 75% coinciding with falling subject marks (24% drop) and 2 backlogs.",
    recommendations: [
      {
        action_type: "Attendance Check-In & Academic Support",
        priority: "High",
        recommended_action: "Schedule a one-on-one advising conversation to review recent attendance patterns, uncover hurdles, and formulate an attendance recovery contract.",
        evidence: "Observed attendance of 60.0% is critically below institutional minimum of 75.0%.",
        responsible_role: "Faculty Mentor / Class Advisor"
      },
      {
        action_type: "Remedial Coaching & Subject Revision",
        priority: "High",
        recommended_action: "Review mid-term assessments in weak subjects and assign peer tutoring or targeted tutorial hours before end-term examinations.",
        evidence: "Academic score 38.0 is below the passing cutoff of 50.0.",
        responsible_role: "Department Subject Faculty"
      },
      {
        action_type: "Coursework Catch-up Plan",
        priority: "Medium",
        recommended_action: "Help Rohan establish a structured 2-week schedule to submit pending assignments and clarify difficult topics.",
        evidence: "3 assignments remain pending past their submission deadline.",
        responsible_role: "Course Instructor / Teaching Assistant"
      }
    ],
    scenario_tag: "Scenario B: Declining Attendance and Academic Performance",
    is_sample_data: true,
    skills: {
      technical: [
        { name: "Database Internals & SQL", score: 38, status: "needs_attention" },
        { name: "Algorithms & Problem Solving", score: 32, status: "needs_attention" },
        { name: "Web Application Foundations", score: 55, status: "developing" },
        { name: "Python Scripting", score: 45, status: "needs_attention" }
      ],
      soft: [
        { name: "Classroom Consistency & Attendance", score: 40, status: "needs_attention" },
        { name: "Academic Communication", score: 50, status: "developing" }
      ]
    },
    feedback: {
      satisfaction_score: 62,
      faculty_rating: 58,
      faculty_note: "Significant attendance deficit across database labs and mid-terms. Mandatory academic recovery plan and peer tutoring assigned."
    },
    subjects: [
      { code: "CS602", name: "Database System Internals", marks: 48, max_marks: 100, attendance: 60, credits: 4, grade: "F" },
      { code: "CS601", name: "Advanced Operating Systems", marks: 45, max_marks: 100, attendance: 58, credits: 4, grade: "F" },
      { code: "CS603", name: "Web Application Development", marks: 68, max_marks: 100, attendance: 72, credits: 3, grade: "C" },
      { code: "CS604", name: "Computer Networks", marks: 55, max_marks: 100, attendance: 64, credits: 3, grade: "D" }
    ],
    semester_history: [
      { semester: 1, gpa: 7.40, credits: 24, academic_year: 1 },
      { semester: 2, gpa: 7.10, credits: 24, academic_year: 1 },
      { semester: 3, gpa: 6.80, credits: 24, academic_year: 2 },
      { semester: 4, gpa: 6.20, credits: 24, academic_year: 2 },
      { semester: 5, gpa: 5.80, credits: 22, academic_year: 3 },
      { semester: 6, gpa: 5.40, credits: 22, academic_year: 3 }
    ],
    placement_details: {
      composite_score: 38.5,
      tier_eligibility: [
        { tier: "Tier-1 Product Companies", min_cgpa: 8.5, min_coding: 80, eligible: false, note: "2 active backlogs. Institutional placement policy requires 0 backlogs." },
        { tier: "Tier-2 Technology Core", min_cgpa: 7.5, min_coding: 65, eligible: false, note: "Backlogs present (2). Must clear in supplementary cycle." },
        { tier: "Global Consulting & IT Services", min_cgpa: 6.5, min_coding: 50, eligible: false, note: "Requires backlog clearance and CGPA ≥ 6.0." }
      ],
      checklist: [
        { task: "Attend Mandatory Attendance Recovery Counseling", completed: true, category: "Recovery", priority: "Critical" },
        { task: "Register for CS601 & CS602 Supplementary Examinations", completed: false, category: "Academic", priority: "Critical" },
        { task: "Submit 3 Overdue Coursework Assignments", completed: false, category: "LMS", priority: "High" },
        { task: "Sign Remedial Learning Agreement with Mentor", completed: false, category: "Advising", priority: "High" }
      ]
    }
  },
  {
    student_id: "STU-DS-103",
    full_name: "Ananya Iyer",
    email: "ananya.iyer@demo.ascendiq.ai",
    department: "Data Science",
    academic_year: 2,
    admission_year: 2024,
    section: "A",
    academic: null,
    attendance: null,
    lms: { completion_rate: 88.0, active_minutes: 110, overdue: 0 },
    placement: null,
    engagement: { events: 4, clubs: 2, hackathons: 2, certs: 2 },
    success_score: null,
    success_status: "insufficient_data",
    data_coverage: 20.0,
    success_breakdown: {
      academic: { name: "Academic Performance", observed_value: null, weight_pct: 35.0, weighted_contribution: null, is_missing: true, normalization: "Exam records pending upload" },
      attendance: { name: "Attendance", observed_value: null, weight_pct: 20.0, weighted_contribution: null, is_missing: true, normalization: "Attendance sheet pending upload" },
      lms: { name: "LMS Engagement", observed_value: 88.0, weight_pct: 15.0, weighted_contribution: null, is_missing: false, normalization: "Valid LMS activity verified" },
      placement: { name: "Career Readiness", observed_value: null, weight_pct: 25.0, weighted_contribution: null, is_missing: true, normalization: "Assessment scheduled for term 6" },
      engagement: { name: "Extracurricular Engagement", observed_value: 85.0, weight_pct: 5.0, weighted_contribution: null, is_missing: false, normalization: "Verified active hackathon/club participation" }
    },
    risk_score: 0.0,
    risk_category: "Low",
    risk_factors: [],
    segment_key: "insufficient_data",
    segment_label: "Insufficient Data for Reliable Classification",
    segment_reason: "Data completeness is 20.0%, which is below the mandatory threshold of 60.0%. Full assessment withheld to protect student fairness.",
    recommendations: [
      {
        action_type: "Data Ingestion & Verification Request",
        priority: "Medium",
        recommended_action: "Request updated semester grade sheets and attendance logs from the college administration to complete the analytical profile.",
        evidence: "Data completeness below 60%.",
        responsible_role: "Department Academic Coordinator"
      }
    ],
    scenario_tag: "Scenario C: Strong Engagement, Incomplete Academic Evidence",
    is_sample_data: true,
    skills: {
      technical: [
        { name: "Python for Data Science", score: 82, status: "mastered" },
        { name: "SQL & Relational Queries", score: 78, status: "developing" },
        { name: "Data Wrangling (Pandas/NumPy)", score: 85, status: "mastered" },
        { name: "Statistical Inference", score: 74, status: "developing" }
      ],
      soft: [
        { name: "Hackathon Teamwork", score: 88, status: "mastered" },
        { name: "Project Pitch & Demo", score: 85, status: "mastered" }
      ]
    },
    feedback: {
      satisfaction_score: 90,
      faculty_rating: 86,
      faculty_note: "Outstanding hackathon initiative. Awaiting official semester grade sheet integration from college ERP."
    },
    subjects: [],
    semester_history: [
      { semester: 1, gpa: 8.20, credits: 22, academic_year: 1 },
      { semester: 2, gpa: 8.40, credits: 22, academic_year: 1 }
    ],
    placement_details: {
      composite_score: 0,
      tier_eligibility: [
        { tier: "Tier-1 Product Companies", min_cgpa: 8.5, min_coding: 80, eligible: false, note: "Year 2 student. Official campus placement drives start in Year 4." }
      ],
      checklist: [
        { task: "Connect ERP Official Grade Synchronization", completed: false, category: "Data", priority: "High" },
        { task: "Submit Biometric Attendance Validation", completed: false, category: "Data", priority: "High" },
        { task: "Register for Inter-College Data Science Hackathon", completed: true, category: "Competition", priority: "Medium" }
      ]
    }
  },
  {
    student_id: "STU-CS-104",
    full_name: "Aarav Patel",
    email: "aarav.patel@demo.ascendiq.ai",
    department: "Computer Science",
    academic_year: 4,
    admission_year: 2022,
    section: "A",
    academic: {
      semester: 7, subject_id: "CS701", subject_name: "Distributed Systems",
      marks_percentage: 92.0, cgpa: 9.45, backlog_count: 0, previous_semester_marks: 91.0
    },
    attendance: { classes_held: 90, classes_attended: 86, percentage: 95.5 },
    lms: { completion_rate: 98.0, active_minutes: 180, overdue: 0 },
    placement: {
      aptitude_percentage: 88.0, coding_percentage: 92.0, mock_interview_score: 89.0,
      technical_skill_score: 94.0, communication_skill_score: 88.0
    },
    engagement: { events: 5, clubs: 2, hackathons: 3, certs: 4 },
    success_score: 91.8,
    success_status: "available",
    data_coverage: 100.0,
    success_breakdown: {
      academic: { name: "Academic Performance", observed_value: 92.0, weight_pct: 35.0, weighted_contribution: 32.2, is_missing: false, normalization: "Normalized marks" },
      attendance: { name: "Attendance", observed_value: 95.5, weight_pct: 20.0, weighted_contribution: 19.1, is_missing: false, normalization: "Percentage of classes attended" },
      lms: { name: "LMS Engagement", observed_value: 98.0, weight_pct: 15.0, weighted_contribution: 14.7, is_missing: false, normalization: "High completion rate" },
      placement: { name: "Career Readiness", observed_value: 90.2, weight_pct: 25.0, weighted_contribution: 22.6, is_missing: false, normalization: "Assessment aggregate" },
      engagement: { name: "Extracurricular Engagement", observed_value: 100.0, weight_pct: 5.0, weighted_contribution: 5.0, is_missing: false, normalization: "Leadership participation" }
    },
    risk_score: 0.0,
    risk_category: "Low",
    risk_factors: [],
    segment_key: "strong_academics_strong_placement",
    segment_label: "High Performing & Placement Ready",
    segment_reason: "Excellent academic standing (92.0/100) and high career readiness (90.2/100).",
    recommendations: [
      {
        action_type: "Tier-1 Placement Fast-Track & Mentorship",
        priority: "Low",
        recommended_action: "Recommend student for prime campus recruitment slots, research assistantships, and mentoring junior student cohorts.",
        evidence: "Consistently superior metric profile across all institutional dimensions.",
        responsible_role: "Dean of Academic Affairs / Placement Director"
      }
    ],
    scenario_tag: "Year 4 Placement Acceleration & Corporate Recruitment",
    is_sample_data: true,
    skills: {
      technical: [
        { name: "Distributed Systems & Cloud", score: 95, status: "mastered" },
        { name: "Algorithms & Data Structures", score: 92, status: "mastered" },
        { name: "Full-Stack System Design", score: 89, status: "mastered" },
        { name: "PostgreSQL & Database Engines", score: 94, status: "mastered" }
      ],
      soft: [
        { name: "Technical Interview Presentation", score: 90, status: "mastered" },
        { name: "Cross-Functional Collaboration", score: 88, status: "mastered" }
      ]
    },
    feedback: {
      satisfaction_score: 95,
      faculty_rating: 96,
      faculty_note: "Outstanding capstone design. Nominated for Department Distinction and Tier-1 Placement Fast-Track."
    },
    subjects: [
      { code: "CS701", name: "Distributed Systems", marks: 94, max_marks: 100, attendance: 96, credits: 4, grade: "A+" },
      { code: "CS702", name: "Cloud Computing Architectures", marks: 91, max_marks: 100, attendance: 95, credits: 4, grade: "A+" },
      { code: "CS703", name: "Machine Learning at Scale", marks: 89, max_marks: 100, attendance: 94, credits: 3, grade: "A" },
      { code: "CS704", name: "Cybersecurity & Cryptography", marks: 94, max_marks: 100, attendance: 97, credits: 3, grade: "A+" }
    ],
    semester_history: [
      { semester: 1, gpa: 9.10, credits: 24, academic_year: 1 },
      { semester: 2, gpa: 9.30, credits: 24, academic_year: 1 },
      { semester: 3, gpa: 9.40, credits: 24, academic_year: 2 },
      { semester: 4, gpa: 9.50, credits: 24, academic_year: 2 },
      { semester: 5, gpa: 9.45, credits: 22, academic_year: 3 },
      { semester: 6, gpa: 9.50, credits: 22, academic_year: 3 },
      { semester: 7, gpa: 9.45, credits: 20, academic_year: 4 }
    ],
    placement_details: {
      composite_score: 91.5,
      tier_eligibility: [
        { tier: "Tier-1 Product Companies (₹18-40 LPA)", min_cgpa: 8.5, min_coding: 80, eligible: true, note: "Cleared all institutional cutoffs." },
        { tier: "Tier-2 Technology Core (₹10-18 LPA)", min_cgpa: 7.5, min_coding: 65, eligible: true, note: "Exceeds all benchmarks." },
        { tier: "Global Consulting & IT Services", min_cgpa: 6.5, min_coding: 50, eligible: true, note: "Pre-qualified." }
      ],
      checklist: [
        { task: "Technical Resume Review & Institutional Sign-off", completed: true, category: "Profile", priority: "High" },
        { task: "Mock Coding & Algorithmic Interview 1", completed: true, category: "Interview", priority: "High" },
        { task: "Mock System Design & Behavioral Round", completed: true, category: "Interview", priority: "High" },
        { task: "Placement Drive Portal Registration", completed: true, category: "Process", priority: "Critical" },
        { task: "Company Specific Coding Assessment Practice", completed: true, category: "Preparation", priority: "Medium" }
      ]
    }
  },
  {
    student_id: "STU-CS-105",
    full_name: "Sneha Reddy",
    email: "sneha.reddy@demo.ascendiq.ai",
    department: "Computer Science",
    academic_year: 1,
    admission_year: 2025,
    section: "A",
    academic: {
      semester: 2,
      subject_id: "CS102",
      subject_name: "Data Structures & Fundamentals",
      marks_percentage: 84.0,
      cgpa: 8.50,
      backlog_count: 0,
      previous_semester_marks: 82.5
    },
    attendance: { classes_held: 80, classes_attended: 74, percentage: 92.5 },
    lms: { completion_rate: 94.0, active_minutes: 155, overdue: 0 },
    placement: {
      aptitude_percentage: 58.0,
      coding_percentage: 52.0,
      mock_interview_score: 55.0,
      technical_skill_score: 50.0,
      communication_skill_score: 72.0
    },
    engagement: { events: 3, clubs: 2, hackathons: 0, certs: 1 },
    success_score: 82.4,
    success_status: "available",
    data_coverage: 100.0,
    success_breakdown: {
      academic: { name: "Academic Foundation", observed_value: 84.0, weight_pct: 40.0, weighted_contribution: 33.6, is_missing: false, normalization: "Semester 1 & 2 continuous evaluation" },
      attendance: { name: "Attendance Discipline", observed_value: 92.5, weight_pct: 20.0, weighted_contribution: 18.5, is_missing: false, normalization: "Percentage of foundational lectures attended" },
      lms: { name: "LMS Learning Habits", observed_value: 94.0, weight_pct: 15.0, weighted_contribution: 14.1, is_missing: false, normalization: "Timely homework and lab prep completion" },
      placement: { name: "Aptitude Awareness", observed_value: 53.4, weight_pct: 10.0, weighted_contribution: 5.3, is_missing: false, normalization: "Early diagnostic logic assessments" },
      engagement: { name: "Orientation & Clubs", observed_value: 75.0, weight_pct: 15.0, weighted_contribution: 11.2, is_missing: false, normalization: "Active participation in college orientation and clubs" }
    },
    risk_score: 10.0,
    risk_category: "Low",
    risk_factors: [],
    segment_key: "foundation_building",
    segment_label: "Strong Academic Foundation & Active Adaptation",
    segment_reason: "High attendance (92.5%) and strong foundational programming marks with zero backlogs in first year.",
    recommendations: [
      {
        action_type: "Department Coding Club Onboarding",
        priority: "Low",
        recommended_action: "Participate in bi-weekly first-year coding circles to build algorithmic problem-solving confidence early.",
        evidence: "Foundational programming marks at 84.0% with strong attendance.",
        responsible_role: "First-Year Mentor / Peer Tutor"
      },
      {
        action_type: "Orientation & Club Leadership",
        priority: "Low",
        recommended_action: "Explore technical student chapters (ACM/IEEE) to develop communication and project collaboration skills.",
        evidence: "Verified active club participation.",
        responsible_role: "Faculty Advisor"
      }
    ],
    scenario_tag: "Year 1 Foundation & Academic Habit Formation",
    is_sample_data: true,
    skills: {
      technical: [
        { name: "C / C++ Programming", score: 85, status: "mastered" },
        { name: "Discrete Mathematics", score: 80, status: "developing" },
        { name: "Digital Logic Design", score: 82, status: "developing" },
        { name: "Linux & Shell Basics", score: 72, status: "developing" }
      ],
      soft: [
        { name: "University Classroom Engagement", score: 88, status: "mastered" },
        { name: "Peer Collaboration & Study Groups", score: 85, status: "mastered" }
      ]
    },
    feedback: {
      satisfaction_score: 92,
      faculty_rating: 90,
      faculty_note: "Adaptable, punctual, and highly consistent in tutorial submissions. Excellent first-year trajectory."
    },
    subjects: [
      { code: "CS101", name: "Problem Solving with C", marks: 88, max_marks: 100, attendance: 95, credits: 4, grade: "A+" },
      { code: "CS102", name: "Data Structures Fundamentals", marks: 84, max_marks: 100, attendance: 92, credits: 4, grade: "A" },
      { code: "MA101", name: "Calculus & Linear Algebra", marks: 80, max_marks: 100, attendance: 90, credits: 4, grade: "A" },
      { code: "PH101", name: "Engineering Physics & Lab", marks: 85, max_marks: 100, attendance: 94, credits: 3, grade: "A" }
    ],
    semester_history: [
      { semester: 1, gpa: 8.40, credits: 22, academic_year: 1 },
      { semester: 2, gpa: 8.55, credits: 22, academic_year: 1 }
    ],
    placement_details: {
      composite_score: 55.0,
      tier_eligibility: [
        { tier: "Tier-1 Product Companies", min_cgpa: 8.5, min_coding: 80, eligible: false, note: "Early stage: Placement drives commence in Year 4." },
        { tier: "Tier-2 Technology Core", min_cgpa: 7.5, min_coding: 65, eligible: false, note: "Foundation stage." }
      ],
      checklist: [
        { task: "Complete First-Year University Orientation", completed: true, category: "Foundation", priority: "Low" },
        { task: "Attend Academic Advising Session with Faculty Mentor", completed: true, category: "Advising", priority: "Medium" },
        { task: "Set up GitHub Academic Profile & Personal Workspace", completed: true, category: "Skills", priority: "Low" },
        { task: "Register for Technical Student Club (ACM/IEEE)", completed: true, category: "Co-curricular", priority: "Low" }
      ]
    }
  }
];

class ApiClient {
  private baseUrl = '/api';

  async getOverview(): Promise<AnalyticsOverview> {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/overview`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    // Client fallback summary
    return {
      is_sample_data: true,
      cohort_summary: {
        total_students: FALLBACK_DEMO_STUDENTS.length,
        complete_profiles: FALLBACK_DEMO_STUDENTS.filter(s => s.data_coverage >= 100).length,
        provisional_profiles: 0,
        insufficient_data_profiles: FALLBACK_DEMO_STUDENTS.filter(s => s.data_coverage < 60).length,
        average_success_score: 68.4,
        placement_ready_count: 2,
        active_interventions: 2,
        data_completeness_pct: 75.0
      },
      risk_distribution: {
        critical: 1,
        high: 0,
        moderate: 1,
        low: 2
      },
      segment_distribution: {
        "strong_academics_low_placement": 1,
        "declining_academics_low_attendance": 1,
        "insufficient_data": 1,
        "strong_academics_strong_placement": 1
      },
      department_distribution: {
        "Computer Science": 3,
        "Data Science": 1
      },
      recent_import_count: 2
    };
  }

  async getStudents(filters?: {
    department?: string;
    academic_year?: number;
    segment_key?: string;
    risk_category?: string;
    search?: string;
  }): Promise<{ total: number; students: StudentProfile[] }> {
    try {
      const params = new URLSearchParams();
      if (filters?.department) params.append('department', filters.department);
      if (filters?.academic_year) params.append('academic_year', String(filters.academic_year));
      if (filters?.segment_key) params.append('segment_key', filters.segment_key);
      if (filters?.risk_category) params.append('risk_category', filters.risk_category);
      if (filters?.search) params.append('search', filters.search);

      const res = await fetch(`${this.baseUrl}/students?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    let list = [...FALLBACK_DEMO_STUDENTS];
    if (filters?.department) list = list.filter(s => s.department === filters.department);
    if (filters?.segment_key) list = list.filter(s => s.segment_key === filters.segment_key);
    if (filters?.risk_category) list = list.filter(s => s.risk_category.toLowerCase() === filters.risk_category?.toLowerCase());
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(s => s.full_name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q));
    }

    return { total: list.length, students: list };
  }

  async getStudent(studentId: string): Promise<StudentProfile> {
    try {
      const res = await fetch(`${this.baseUrl}/students/${studentId}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const found = FALLBACK_DEMO_STUDENTS.find(s => s.student_id.toLowerCase() === studentId.toLowerCase());
    if (found) return found;
    return FALLBACK_DEMO_STUDENTS[0];
  }

  async getInterventions(): Promise<InterventionItem[]> {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/interventions`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return [];
  }

  async createIntervention(data: {
    student_id: string;
    concern: string;
    recommended_action: string;
    assigned_to: string;
    due_date?: string;
    follow_up_date?: string;
    status: string;
    notes?: string;
  }): Promise<InterventionItem> {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/interventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    return {
      id: `int-${Date.now()}`,
      student_id: data.student_id,
      student_name: "Student",
      concern: data.concern,
      evidence_summary: "Logged via Ascendiq decision workspace",
      recommended_action: data.recommended_action,
      status: data.status as any,
      assigned_to: data.assigned_to,
      due_date: data.due_date,
      follow_up_date: data.follow_up_date,
      notes: data.notes,
      outcome: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async updateIntervention(id: string, updates: Partial<InterventionItem>): Promise<InterventionItem> {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/interventions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return updates as any;
  }
}

export const api = new ApiClient();
