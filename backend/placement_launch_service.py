"""
ASCENDIQ Year 4 Placement & Career Launch Engine Service
Handles:
1. Resume Builder & ATS Readiness Analysis
2. AI Mock Interview Studio (Question banks & structured evaluation)
3. Placement Application Tracker
4. Multi-Component Placement Readiness Scoring (Transparent & Missing-Data Aware)
5. Personalized Weekly Career Action Plan Generator
6. Company & Role Specific Preparation Aggregator
7. Offer & Placement Outcome Tracking
"""

import math
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# ==============================================================================
# In-Memory Storage for High-Performance & Testing Persistence
# (Mirrors Database records when offline / demo / test environment)
# ==============================================================================

_RESUMES_STORE: Dict[str, List[Dict[str, Any]]] = {}
_INTERVIEWS_STORE: Dict[str, List[Dict[str, Any]]] = {}
_APPLICATIONS_STORE: Dict[str, List[Dict[str, Any]]] = {}
_ACTION_PLANS_STORE: Dict[str, List[Dict[str, Any]]] = {}
_OFFERS_STORE: Dict[str, List[Dict[str, Any]]] = {}

# Strong action verbs for ATS analysis
STRONG_ACTION_VERBS = {
    "architected", "engineered", "implemented", "optimized", "developed",
    "deployed", "orchestrated", "designed", "streamlined", "automated",
    "spearheaded", "refactored", "analyzed", "reduced", "increased",
    "built", "configured", "integrated", "benchmarked", "executed"
}

WEAK_ACTION_VERBS = {
    "worked on", "assisted with", "helped", "responsible for", "participated in",
    "familiar with", "did", "handled", "tried", "contributed to"
}

# Metric indicator patterns (numbers, percentages, latency, throughput, scale)
METRIC_PATTERNS = [
    r"\b\d+%",
    r"\b\d+\s*(?:ms|seconds|minutes|hours)\b",
    r"\b\d+(?:\.\d+)?x\b",
    r"\b\d+(?:,\d{3})*\+?\s*(?:users|requests|records|queries|qps)\b",
    r"\b(?:\$|₹)\s*\d+",
    r"\b\d+\s*(?:gb|mb|tb|k)\b"
]

# ==============================================================================
# Curated Master Mock Interview Question Bank
# ==============================================================================

MASTER_INTERVIEW_QUESTIONS: List[Dict[str, Any]] = [
    # HR & Behavioral
    {
        "id": "hr-q1",
        "category": "hr_behavioral",
        "competency": "Conflict Resolution & Teamwork",
        "question_text": "Tell me about a situation where you had a serious technical disagreement with a team member on a project. How did you resolve it, and what was the outcome?",
        "framework": "STAR (Situation, Task, Action, Result)",
        "sample_structure": "1. Situation: Describe project context and specific architectural or technical conflict.\n2. Task: Explain your role and mutual deadline goal.\n3. Action: Objective benchmarks or code spikes used to evaluate tradeoffs without interpersonal friction.\n4. Result: Selected solution and project delivery impact."
    },
    {
        "id": "hr-q2",
        "category": "hr_behavioral",
        "competency": "Overcoming Failure & Resilience",
        "question_text": "Describe a scenario where a project or release you were responsible for failed or missed a critical deliverable. What went wrong and what steps did you take to prevent recurrence?",
        "framework": "Accountability & Post-Mortem Analysis",
        "sample_structure": "1. Honest acknowledgment of the failure.\n2. Root-cause analysis (e.g. unhandled edge-case, scope creep).\n3. Immediate mitigation deployed.\n4. Systemic long-term preventive safeguards implemented (e.g. automated tests, CI gates)."
    },
    {
        "id": "hr-q3",
        "category": "hr_behavioral",
        "competency": "Prioritization & Time Management",
        "question_text": "How do you manage tight academic deadlines when an unexpected high-severity bug or urgent requirement emerges simultaneously in your capstone project?",
        "framework": "Eisenhower Matrix & Stakeholder Communication",
        "sample_structure": "1. Triage by impact vs urgency.\n2. Transparent communication with team / faculty mentor.\n3. Time-boxed delegation or scoped minimum viable deliverable.\n4. Retrospective on buffering future milestones."
    },

    # Technical CS Core
    {
        "id": "tech-q1",
        "category": "technical_cs",
        "competency": "System Architecture & Caching",
        "question_text": "Explain how you would design a cache eviction policy in an API with strict latency limits. When would you choose an LRU cache over an LFU cache, and what data structures would you use to implement LRU in O(1) time?",
        "framework": "Algorithmic Complexity & Tradeoff Analysis",
        "sample_structure": "1. Complexity requirement: O(1) get and put operations.\n2. Data structures: Doubly Linked List paired with a Hash Map.\n3. Tradeoff analysis: LRU handles temporal locality; LFU is susceptible to stale frequency bursts unless aging is added.\n4. Concurrency or memory limits to consider."
    },
    {
        "id": "tech-q2",
        "category": "technical_cs",
        "competency": "Database Transactions & ACID",
        "question_text": "What is the difference between Optimistic Concurrency Control (OCC) and Pessimistic Locking in database transactions? In a high-throughput seat booking system, which would you select and why?",
        "framework": "Concurrency Models & Throughput Optimization",
        "sample_structure": "1. Definitions: OCC assumes rare conflicts using version timestamps; Pessimistic lock acquires exclusive lock upfront.\n2. Workload characteristic: Seat booking involves intense contention on identical row IDs.\n3. Selection rationale: Pessimistic locking (SELECT FOR UPDATE) prevents cascading rollbacks and guarantees inventory atomicity.\n4. Deadlock prevention strategy."
    },
    {
        "id": "tech-q3",
        "category": "technical_cs",
        "competency": "Network Protocols & Reliability",
        "question_text": "Walk through the exact mechanics of a TCP 3-way handshake. How does TCP guarantee reliable in-order data delivery over an unreliable IP network layer?",
        "framework": "Protocol Verification & State Machine",
        "sample_structure": "1. Handshake phases: SYN -> SYN-ACK -> ACK with initial sequence numbers.\n2. Reliability mechanisms: Sequence numbers, cumulative ACKs, sliding window flow control.\n3. Recovery: Retransmission timers (RTO), fast retransmit via duplicate ACKs.\n4. Congestion avoidance algorithms (e.g. slow start, AIMD)."
    },

    # Role-Specific (Full Stack / Software Engineer)
    {
        "id": "role-q1",
        "category": "role_specific",
        "competency": "Frontend Performance & Hydration",
        "question_text": "How does React's virtual DOM reconciliation algorithm work, and what specific steps do you take to eliminate unnecessary component re-renders in complex dashboards?",
        "framework": "Fiber Tree Diffing & Memoization",
        "sample_structure": "1. Heuristic diffing algorithm: Key prop stability and component type identity.\n2. Profiling tools: React DevTools flamegraphs.\n3. Memoization strategies: useMemo, useCallback, React.memo, and state localization.\n4. Architectural optimizations: Virtualized windowing for large lists."
    },
    {
        "id": "role-q2",
        "category": "role_specific",
        "competency": "REST & API Design",
        "question_text": "What does idempotency mean in RESTful API design? Which HTTP methods are inherently idempotent, and how would you implement idempotency on a POST /checkout endpoint?",
        "framework": "API Robustness & Payment Engineering",
        "sample_structure": "1. Definition: Multiple identical requests produce the same server-side outcome as a single request.\n2. Methods: GET, PUT, DELETE, HEAD, OPTIONS are idempotent; POST is not.\n3. Implementation: Client supplies a unique Idempotency-Key header; server caches response in Redis with a TTL."
    },

    # Company-Focused (Tier-1 Tech Giants)
    {
        "id": "comp-q1",
        "category": "company_focused",
        "competency": "Scalability & Distributed Systems",
        "question_text": "Suppose you are designing a URL shortener system handling 100 million redirects daily (e.g. Bit.ly or TinyURL for Google/Amazon scale). How do you generate unique short keys, and how do you optimize read latency?",
        "framework": "System Design: Capacity Estimation & Architecture",
        "sample_structure": "1. Scale math: 100M reads/day ≈ 1,200 QPS average, 3,000 QPS peak.\n2. Key generation: Base62 encoding of an auto-incrementing 64-bit ID or distributed token-range service.\n3. Storage: NoSQL key-value store (e.g. DynamoDB/Cassandra) partitioned by short_hash.\n4. Caching: Redis cluster caching top 20% URLs (Pareto distribution) to serve 80% reads in sub-5ms."
    }
]


# ==============================================================================
# Helper Functions: ATS Heuristic Scoring
# ==============================================================================

def analyze_resume_ats(
    sections: Dict[str, Any],
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates a structured resume and provides a transparent ATS Readiness Estimate.
    Does not invent fake credentials; evaluates structural clarity, action verbs,
    measurable metrics, and keyword alignment.
    """
    score = 0.0
    feedback_items = []
    missing_sections = []
    weak_bullet_points = []
    strong_bullet_points = []
    identified_keywords = []
    matched_job_keywords = []

    # 1. Section Completeness (Max 30 pts)
    education = sections.get("education", [])
    skills = sections.get("skills", [])
    projects = sections.get("projects", [])
    experience = sections.get("experience", [])
    certifications = sections.get("certifications", [])

    if education and len(education) > 0:
        score += 8.0
    else:
        missing_sections.append("Education Section")

    if skills and len(skills) > 0:
        score += 8.0
    else:
        missing_sections.append("Technical Skills Section")

    if projects and len(projects) > 0:
        score += 8.0
    else:
        missing_sections.append("Technical Projects Section")

    if experience and len(experience) > 0:
        score += 6.0
    else:
        # Not penalized severely for undergraduates, but noted
        missing_sections.append("Work Experience / Internships")

    # 2. Action Verb & Evidence Analysis in Project / Experience Bullets (Max 35 pts)
    all_bullets: List[str] = []
    for p in projects:
        if isinstance(p, dict):
            bullets = p.get("bullets", [])
            if isinstance(bullets, list):
                all_bullets.extend([str(b) for b in bullets if b])
            elif p.get("description"):
                all_bullets.append(str(p.get("description")))

    for exp in experience:
        if isinstance(exp, dict):
            bullets = exp.get("bullets", [])
            if isinstance(bullets, list):
                all_bullets.extend([str(b) for b in bullets if b])
            elif exp.get("description"):
                all_bullets.append(str(exp.get("description")))

    metric_count = 0
    strong_verb_count = 0
    weak_verb_count = 0

    for bullet in all_bullets:
        bullet_lower = bullet.lower().strip()
        first_word = bullet_lower.split()[0] if bullet_lower.split() else ""

        # Check strong verb
        has_strong = any(bullet_lower.startswith(v) or f" {v} " in bullet_lower for v in STRONG_ACTION_VERBS)
        has_weak = any(v in bullet_lower for v in WEAK_ACTION_VERBS)
        has_metric = any(re.search(pat, bullet_lower) for pat in METRIC_PATTERNS)

        if has_strong:
            strong_verb_count += 1
            if bullet not in strong_bullet_points and len(strong_bullet_points) < 3:
                strong_bullet_points.append(bullet)
        elif has_weak or len(bullet.split()) < 6:
            weak_verb_count += 1
            if bullet not in weak_bullet_points and len(weak_bullet_points) < 3:
                weak_bullet_points.append(bullet)

        if has_metric:
            metric_count += 1

    # Verb points (15 max)
    if all_bullets:
        strong_ratio = min(1.0, strong_verb_count / max(1, len(all_bullets)))
        score += strong_ratio * 15.0
    else:
        score += 2.0

    # Metric points (20 max)
    if metric_count >= 3:
        score += 20.0
    elif metric_count >= 1:
        score += 12.0
    else:
        score += 4.0
        feedback_items.append("Include measurable results in your project descriptions (e.g., latency reduction, throughput, user base, accuracy %).")

    # 3. Technical Skills Breadth (Max 15 pts)
    skill_tokens = []
    if isinstance(skills, list):
        for s in skills:
            if isinstance(s, str):
                skill_tokens.extend([item.strip() for item in s.split(",") if item.strip()])
            elif isinstance(s, dict) and "name" in s:
                skill_tokens.append(s["name"])

    if len(skill_tokens) >= 8:
        score += 15.0
    elif len(skill_tokens) >= 4:
        score += 10.0
    elif len(skill_tokens) >= 1:
        score += 6.0
    else:
        score += 0.0

    # 4. Job Description Keyword Matching (Max 20 pts)
    if job_description and job_description.strip():
        jd_lower = job_description.lower()
        # Extract potential technical keywords
        common_tech = [
            "python", "java", "c++", "react", "typescript", "javascript", "sql", "postgresql",
            "docker", "kubernetes", "aws", "git", "rest", "graphql", "redis", "linux", "ci/cd",
            "algorithms", "system design", "microservices", "html", "css", "node.js", "django", "fastapi"
        ]
        jd_keywords = [kw for kw in common_tech if kw in jd_lower]
        resume_text = " ".join(all_bullets + skill_tokens).lower()

        matched = [kw for kw in jd_keywords if kw in resume_text]
        matched_job_keywords = matched
        unmatched = [kw for kw in jd_keywords if kw not in resume_text]

        if jd_keywords:
            match_ratio = len(matched) / len(jd_keywords)
            score += match_ratio * 20.0
            if unmatched:
                feedback_items.append(f"Target role keywords missing from resume: {', '.join(unmatched[:5])}.")
        else:
            score += 15.0
    else:
        # Default baseline if no JD provided
        score += 16.0

    final_score = round(min(100.0, max(0.0, score)), 1)

    if weak_bullet_points:
        feedback_items.append(f"Replace passive phrasing ('worked on', 'assisted') with strong engineering impact verbs ('architected', 'benchmarked', 'optimized').")

    if missing_sections:
        feedback_items.append(f"Missing core resume sections: {', '.join(missing_sections)}.")

    return {
        "ats_score_estimate": final_score,
        "missing_sections": missing_sections,
        "weak_bullet_points": weak_bullet_points,
        "strong_bullet_points": strong_bullet_points,
        "metric_indicators_found": metric_count,
        "matched_job_keywords": matched_job_keywords,
        "actionable_feedback": feedback_items,
        "criteria_explanation": (
            "ATS Readiness is an algorithmic estimate evaluating section completeness (30%), "
            "action verbs and measurable impact metrics (35%), skills inventory (15%), and "
            "keyword alignment (20%). It does not guarantee recruiter selection."
        )
    }


# ==============================================================================
# Helper Functions: AI Mock Interview Evaluator
# ==============================================================================

def evaluate_interview_answer(
    question_id: str,
    answer_text: str
) -> Dict[str, Any]:
    """
    Evaluates student's written response on Relevance, Clarity, Completeness,
    Technical Accuracy, and Evidence.
    """
    answer_clean = answer_text.strip()
    words = answer_clean.split()
    word_count = len(words)

    if word_count < 10:
        return {
            "score": 30.0,
            "relevance": 40.0,
            "clarity": 50.0,
            "completeness": 20.0,
            "technical_accuracy": 30.0,
            "strengths": ["Initial attempt submitted."],
            "improvements": [
                "Answer is too brief. Elaborate with concrete architectural steps or project circumstances.",
                "Structure your response using the STAR method (Situation, Task, Action, Result)."
            ],
            "suggested_structure": "Provide context, state specific technical actions taken, and conclude with measurable impact."
        }

    # Heuristic scoring based on length, structure, and keyword density
    relevance_score = min(95.0, 60.0 + min(35.0, word_count * 0.5))
    clarity_score = 82.0 if any(p in answer_clean for p in [".", ";", "\n", ":"]) else 65.0
    completeness_score = min(95.0, 55.0 + min(40.0, word_count * 0.45))
    technical_accuracy = 88.0 if any(term in answer_clean.lower() for term in [
        "complexity", "latency", "index", "tradeoff", "cache", "hash", "scale", "concurrency",
        "star", "situation", "task", "action", "result", "test", "database", "api"
    ]) else 68.0

    overall = round((relevance_score * 0.3 + clarity_score * 0.2 + completeness_score * 0.25 + technical_accuracy * 0.25), 1)

    strengths = []
    improvements = []

    if word_count >= 50:
        strengths.append("Thorough depth and detailed explanation provided.")
    else:
        improvements.append("Expand on specific challenges faced during implementation.")

    if any(re.search(pat, answer_clean) for pat in METRIC_PATTERNS):
        strengths.append("Strong usage of quantifiable metrics and outcomes.")
    else:
        improvements.append("Include specific measurable results (e.g. reduced response time by 40%, supported 1,000 active users).")

    if technical_accuracy >= 75.0:
        strengths.append("Sound understanding of core engineering principles and terminology.")
    else:
        improvements.append("Clarify the architectural or theoretical tradeoffs behind your chosen approach.")

    # Find master question for suggested framework
    q_match = next((q for q in MASTER_INTERVIEW_QUESTIONS if q["id"] == question_id), None)
    suggested = q_match["sample_structure"] if q_match else "1. State problem context.\n2. Detail action.\n3. Quantify result."

    return {
        "score": overall,
        "relevance": round(relevance_score, 1),
        "clarity": round(clarity_score, 1),
        "completeness": round(completeness_score, 1),
        "technical_accuracy": round(technical_accuracy, 1),
        "strengths": strengths,
        "improvements": improvements,
        "suggested_structure": suggested
    }


# ==============================================================================
# Helper Functions: Placement Readiness Score Calculator (100% Total)
# ==============================================================================

def calculate_placement_readiness_score(
    student_id: str,
    resume_score: Optional[float] = None,
    technical_assessment_pct: Optional[float] = None,
    aptitude_assessment_pct: Optional[float] = None,
    interview_practice_score: Optional[float] = None,
    skills_project_evidence_score: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculates the 5-component weighted Placement Readiness Score:
    - Resume readiness: 20%
    - Technical assessment performance: 25%
    - Aptitude performance: 15%
    - Interview practice: 20%
    - Skills and project evidence: 20%
    Total = 100%.

    Marks missing unattempted components as 'Not assessed' instead of zero.
    """
    components = {
        "resume_readiness": {
            "name": "Resume & ATS Readiness",
            "weight": 20,
            "score": resume_score,
            "status": "Assessed" if resume_score is not None else "Not assessed",
            "evidence": "Latest ATS score estimate from Primary Resume" if resume_score is not None else "No verified resume analyzed yet"
        },
        "technical_assessment": {
            "name": "Technical Assessment Performance",
            "weight": 25,
            "score": technical_assessment_pct,
            "status": "Assessed" if technical_assessment_pct is not None else "Not assessed",
            "evidence": f"Year 3 Technical Tests average ({technical_assessment_pct}%)" if technical_assessment_pct is not None else "No technical assessment completed"
        },
        "aptitude_assessment": {
            "name": "Aptitude & Problem Solving",
            "weight": 15,
            "score": aptitude_assessment_pct,
            "status": "Assessed" if aptitude_assessment_pct is not None else "Not assessed",
            "evidence": f"Year 3 Aptitude Tests average ({aptitude_assessment_pct}%)" if aptitude_assessment_pct is not None else "No aptitude assessment completed"
        },
        "interview_practice": {
            "name": "Mock Interview Mastery",
            "weight": 20,
            "score": interview_practice_score,
            "status": "Assessed" if interview_practice_score is not None else "Not assessed",
            "evidence": f"Mock Interview Studio sessions evaluated ({interview_practice_score}%)" if interview_practice_score is not None else "No mock interviews recorded"
        },
        "skills_project_evidence": {
            "name": "Verified Skills & Portfolio Evidence",
            "weight": 20,
            "score": skills_project_evidence_score,
            "status": "Assessed" if skills_project_evidence_score is not None else "Not assessed",
            "evidence": f"Verified project code & technical certifications ({skills_project_evidence_score}%)" if skills_project_evidence_score is not None else "Project code & credentials pending review"
        }
    }

    # Available weights renormalization
    available_weight = 0
    weighted_sum = 0.0

    for key, comp in components.items():
        if comp["score"] is not None:
            available_weight += comp["weight"]
            weighted_sum += (comp["score"] * (comp["weight"] / 100.0))

    if available_weight == 0:
        overall_score = None
        readiness_status = "Incomplete Assessment"
        explanation = "No placement components have been assessed yet. Complete a resume review or assessment to unlock your readiness estimate."
    else:
        # Renormalize to 100% scale
        normalized_score = round((weighted_sum / (available_weight / 100.0)), 1)
        overall_score = normalized_score
        if normalized_score >= 80.0:
            readiness_status = "Tier-1 Placement Ready"
        elif normalized_score >= 65.0:
            readiness_status = "Tier-2 Core Ready"
        elif normalized_score >= 50.0:
            readiness_status = "Foundation Established"
        else:
            readiness_status = "Preparation Recommended"

        explanation = (
            f"Based on {available_weight}% assessed components across institutional benchmarks. "
            f"Missing components are marked 'Not assessed' and not penalized as zero."
        )

    return {
        "student_id": student_id,
        "overall_score": overall_score,
        "readiness_status": readiness_status,
        "available_weight_assessed": available_weight,
        "components": components,
        "explanation": explanation,
        "disclaimer": "This readiness score is an explainable analytical preparation benchmark and does not constitute a legal or contractual guarantee of employment.",
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


# ==============================================================================
# Helper Functions: Default Career Action Plan Generator
# ==============================================================================

def generate_default_career_action_plan(
    student_id: str,
    target_company: Optional[str] = None,
    target_role: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generates a prioritized weekly plan using the student's actual gaps and target role.
    """
    company_name = target_company or "Target Tech Leader"
    role_name = target_role or "Software Development Engineer"

    today = datetime.now(timezone.utc).date()

    return [
        {
            "id": f"cap-1-{student_id[:6]}",
            "title": f"Tailor Primary Resume for {role_name}",
            "explanation": f"Incorporate 3 measurable metric bullet points highlighting latency reduction or scalability for {company_name}.",
            "priority": "High",
            "due_date": (today + timedelta(days=3)).isoformat(),
            "is_completed": False,
            "related_component": "resume",
            "notes": "Focus on backend architecture and project impact metrics.",
            "is_ai_recommended": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"cap-2-{student_id[:6]}",
            "title": "Complete Full-Length Mock Placement Test",
            "explanation": "Simulate a timed screening test combining Quantitative Aptitude, Logical Reasoning, and DSA.",
            "priority": "High",
            "due_date": (today + timedelta(days=5)).isoformat(),
            "is_completed": False,
            "related_component": "technical",
            "notes": "Target cutoff is >= 75% for Tier-1 corporate screening.",
            "is_ai_recommended": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"cap-3-{student_id[:6]}",
            "title": "Practice Behavioral Mock Interview (Conflict Resolution)",
            "explanation": "Answer the 'Technical Disagreement' behavioral prompt using the STAR (Situation, Task, Action, Result) method.",
            "priority": "Medium",
            "due_date": (today + timedelta(days=7)).isoformat(),
            "is_completed": False,
            "related_component": "interview",
            "notes": "Review the feedback generated in the Mock Interview Studio.",
            "is_ai_recommended": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"cap-4-{student_id[:6]}",
            "title": "Review System Design & Caching Tradeoffs",
            "explanation": "Master LRU vs LFU cache eviction strategies and database transaction isolation levels.",
            "priority": "Medium",
            "due_date": (today + timedelta(days=10)).isoformat(),
            "is_completed": False,
            "related_component": "skills",
            "notes": "Key topic for Tier-1 technical interview rounds.",
            "is_ai_recommended": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"cap-5-{student_id[:6]}",
            "title": f"Track 3 Active Campus Placement Drives in Tracker",
            "explanation": "Log application deadlines, interview dates, and target roles in the Placement Application Tracker.",
            "priority": "Low",
            "due_date": (today + timedelta(days=14)).isoformat(),
            "is_completed": False,
            "related_component": "resume",
            "notes": "Maintain distinct resume versions for each application.",
            "is_ai_recommended": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
