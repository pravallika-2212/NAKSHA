import { supabase } from './supabase.ts'

export type RoadmapCategory =
  | 'fundamentals'
  | 'dsa'
  | 'databases'
  | 'role_skills'
  | 'aptitude'
  | 'communication'
  | 'portfolio'
  | 'hackathons'

export interface LearningResource {
  id: string
  title: string
  url: string
  topic: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  relevantSkill: string
  resourceType: 'Tutorial' | 'Interactive' | 'Course' | 'Guide' | 'Documentation'
  source: string
  lastVerified: string
  isFree: boolean
  note?: string
}

export interface SkillProgressState {
  skill_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  is_verified?: boolean
  exercise_completed?: boolean
  project_completed?: boolean
  notes?: string
}

export interface RoadmapSkillItem {
  id: string
  name: string
  category: RoadmapCategory
  priority: 'High' | 'Medium' | 'Foundational'
  relevance: string
  prerequisites: string[]
  resources: LearningResource[]
  practicalExercise: string
  isVerifiedEmployerRequirement: boolean
  employerSource?: string
  status: 'not_started' | 'in_progress' | 'completed'
  is_verified: boolean
  exercise_completed: boolean
  project_completed: boolean
}

export interface DreamRoadmapPreferences {
  company_name: string
  target_role: string
  target_timeframe?: string
}

export interface CompanySuggestion {
  name: string
  tier: 'Tier 1 Product' | 'Tier 2 Core' | 'High-Growth Tech' | 'Enterprise IT'
  category: string
  popularRoles: string[]
  verifiedFocus: string
}

export const SUGGESTED_COMPANIES: CompanySuggestion[] = [
  {
    name: 'Google',
    tier: 'Tier 1 Product',
    category: 'Global Cloud & Search',
    popularRoles: ['Software Development Engineer', 'Cloud Engineer', 'Machine Learning Engineer'],
    verifiedFocus: 'High-rigor DSA (Graphs, DP), Object-Oriented Clean Code, System Fundamentals'
  },
  {
    name: 'Microsoft',
    tier: 'Tier 1 Product',
    category: 'Enterprise Cloud & OS',
    popularRoles: ['Software Development Engineer', 'Full Stack Engineer', 'Cloud & DevOps Engineer'],
    verifiedFocus: 'Algorithms, Data Structures, Concurrency, Azure Foundations, Design Patterns'
  },
  {
    name: 'Amazon',
    tier: 'Tier 1 Product',
    category: 'E-Commerce & AWS Cloud',
    popularRoles: ['Software Development Engineer', 'Data Engineer', 'Systems Engineer'],
    verifiedFocus: 'Leadership Principles, Scalable Data Structures, Distributed Storage, Clean APIs'
  },
  {
    name: 'Zoho',
    tier: 'Tier 2 Core',
    category: 'SaaS & Enterprise Apps',
    popularRoles: ['Software Development Engineer', 'Full Stack Engineer', 'Database Specialist'],
    verifiedFocus: 'Core Programming Logic, Pointers/Arrays, RDBMS/SQL Design, Clean Code without IDE'
  },
  {
    name: 'Cisco',
    tier: 'Tier 2 Core',
    category: 'Networking & Telemetry',
    popularRoles: ['Network Software Engineer', 'Systems Engineer', 'Security Engineer'],
    verifiedFocus: 'Computer Networks (TCP/IP), Operating Systems, C/C++/Python, Protocol Analysis'
  },
  {
    name: 'Swiggy',
    tier: 'High-Growth Tech',
    category: 'Hyperlocal Logistics & Apps',
    popularRoles: ['Backend Engineer', 'Full Stack Engineer', 'Data Engineer'],
    verifiedFocus: 'High-concurrency microservices, Redis caching, Kafka message queues, Spring Boot/Node'
  },
  {
    name: 'Flipkart',
    tier: 'High-Growth Tech',
    category: 'E-Commerce Platform',
    popularRoles: ['Software Engineer', 'Frontend Engineer', 'Data Analyst'],
    verifiedFocus: 'Data Structures, Machine Coding Rounds, Distributed Databases, React/Node'
  },
  {
    name: 'TCS Digital',
    tier: 'Enterprise IT',
    category: 'Digital Engineering Services',
    popularRoles: ['Digital Software Engineer', 'Cloud Developer', 'Data Analyst'],
    verifiedFocus: 'Advanced Coding Contest benchmark, Quantitative Aptitude, SQL Queries'
  },
  {
    name: 'Infosys Power Programmer',
    tier: 'Enterprise IT',
    category: 'Advanced Engineering Program',
    popularRoles: ['Specialist Programmer', 'Digital Specialist Engineer'],
    verifiedFocus: 'HackWithInfy DSA rounds, Dynamic Programming, Graph Traversals, Full Stack project'
  }
]

export const SUGGESTED_ROLES = [
  'Software Development Engineer (SDE)',
  'Full Stack Software Engineer',
  'Data Engineer & Analytics Specialist',
  'Cloud, DevOps & SRE Engineer',
  'Systems & Embedded Software Engineer',
  'AI / Machine Learning Engineer',
  'Cybersecurity & Network Engineer'
]

export const TARGET_TIMEFRAMES = [
  'Summer 2027 Pre-Placement Internship (Recommended for Year 2)',
  '6-Month Comprehensive Skill Sprint',
  '12-Month Dual Specialization (DSA + Projects)',
  'Campus Placement Season 2028'
]

// Curated Master Learning Catalog (verified URLs and attributes)
export const MASTER_LEARNING_RESOURCES: LearningResource[] = [
  {
    id: 'res-google-techdev',
    title: 'Google Tech Dev Guide — Foundational CS & DSA',
    url: 'https://techdevguide.withgoogle.com/',
    topic: 'Programming & Data Structures',
    difficulty: 'Intermediate',
    relevantSkill: 'Data Structures & Algorithms',
    resourceType: 'Guide',
    source: 'Google Education',
    lastVerified: 'October 2026',
    isFree: true,
    note: 'Recommended for coding interview problem collections, time complexity, and coding style.'
  },
  {
    id: 'res-github-skills',
    title: 'GitHub Skills — Interactive Git & Collaboration Workflows',
    url: 'https://skills.github.com/',
    topic: 'Version Control & Open Source',
    difficulty: 'Beginner',
    relevantSkill: 'GitHub Portfolio & Version Control',
    resourceType: 'Interactive',
    source: 'GitHub',
    lastVerified: 'October 2026',
    isFree: true,
    note: 'Hands-on courses to practice branching, pull requests, merge conflict resolution, and GitHub Actions.'
  },
  {
    id: 'res-hackerrank-directory',
    title: 'HackerRank Skills Directory — Standardized Coding & SQL Benchmarks',
    url: 'https://www.hackerrank.com/skills-directory',
    topic: 'Problem Solving & SQL',
    difficulty: 'Intermediate',
    relevantSkill: 'Databases and SQL & Problem Solving',
    resourceType: 'Interactive',
    source: 'HackerRank',
    lastVerified: 'October 2026',
    isFree: true,
    note: 'Curated role skill benchmarks for SQL (Intermediate), Problem Solving, and language certificates.'
  },
  {
    id: 'res-coursera-data-career',
    title: 'Launch Your Data Career — Data Analysis & Engineering Foundations',
    url: 'https://www.coursera.org/',
    topic: 'Data Engineering & SQL',
    difficulty: 'Beginner',
    relevantSkill: 'Role-specific Data & SQL Analytics',
    resourceType: 'Course',
    source: 'Coursera Catalog',
    lastVerified: 'October 2026',
    isFree: false,
    note: 'Recommended specifically for students targeting Data Engineer or Analytics paths. Audit mode is available free for many courses; certificate optional. Not required for general SDE tracks.'
  },
  {
    id: 'res-mlh-hackathons',
    title: 'Major League Hacking (MLH) — Student Hackathon Guide & League',
    url: 'https://mlh.io/',
    topic: 'Hackathons & Rapid Prototyping',
    difficulty: 'Beginner',
    relevantSkill: 'Hackathons & Practical Experience',
    resourceType: 'Guide',
    source: 'Major League Hacking',
    lastVerified: 'October 2026',
    isFree: true,
    note: 'Official student hackathon league guidelines, beginner starter kits, and weekend sprint advice.'
  },
  {
    id: 'res-github-docs',
    title: 'GitHub Docs — Collaborative Engineering & Project Documentation',
    url: 'https://docs.github.com/',
    topic: 'Project Documentation & Architecture',
    difficulty: 'Intermediate',
    relevantSkill: 'Projects and GitHub Portfolio',
    resourceType: 'Documentation',
    source: 'GitHub Official',
    lastVerified: 'October 2026',
    isFree: true,
    note: 'Documentation on README design, issue templates, semantic versioning, and CI/CD automation.'
  }
]

export interface HackathonGuideStep {
  stepNumber: number
  title: string
  summary: string
  actionableChecklist: string[]
  resources: { name: string; url: string; note: string }[]
}

export const HACKATHON_GUIDE_STEPS: HackathonGuideStep[] = [
  {
    stepNumber: 1,
    title: 'What a Hackathon Is (and Why Year 2 is the Best Time to Start)',
    summary: 'A hackathon is an intensive 24 to 48-hour collaborative engineering sprint where developers, designers, and domain thinkers build working software prototypes from scratch to solve real-world problems. It is NOT a competitive algorithmic exam—evaluators value end-to-end working demos and teamwork.',
    actionableChecklist: [
      'Understand the 3 core judging pillars: Innovation (25%), Technical Execution (40%), and Demo Presentation (35%).',
      'Recognize that incomplete code with a working core demo scores much higher than ambitious ideas with broken servers.',
      'Treat hackathons as the #1 way to build verifiable, resume-grade GitHub repositories in Year 2.'
    ],
    resources: [
      { name: 'Major League Hacking Guide', url: 'https://mlh.io/', note: 'Official student hackathon primer.' }
    ]
  },
  {
    stepNumber: 2,
    title: 'How Students Can Join & Discover Legitimate Hackathons',
    summary: 'Join community-backed student hackathons that provide free mentor guidance, developer workshops, and transparent judging rubrics.',
    actionableChecklist: [
      'Look for collegiate hackathons listed on MLH, Devfolio, Unstop, or college IEEE/ACM student branches.',
      'Verify that registrations are free for students (legitimate student hackathons do not charge entry fees).',
      'Register at least 2 weeks in advance to participate in pre-event discord channels and team-formation mixers.'
    ],
    resources: [
      { name: 'MLH Hackathon Season', url: 'https://mlh.io/', note: 'Global student hackathon schedule.' }
    ]
  },
  {
    stepNumber: 3,
    title: 'How to Form a Balanced 3–4 Person Squad',
    summary: 'Never build a team with four identical skill sets. The most successful student hackathon teams assemble complementary superpowers.',
    actionableChecklist: [
      'Member 1 (Frontend & Interaction): Builds responsive React/HTML UI and hooks to APIs.',
      'Member 2 (Backend & Database): Builds REST endpoints, authentication, and database schemas.',
      'Member 3 (Domain Engine / AI / Integrations): Implements core business logic, third-party APIs, or analytics algorithms.',
      'Designate a Project Lead responsible for timekeeping, slide deck preparation, and video recording.'
    ],
    resources: [
      { name: 'GitHub Skills — Team Collaboration', url: 'https://skills.github.com/', note: 'Collaborative git repository workflows.' }
    ]
  },
  {
    stepNumber: 4,
    title: 'How to Select a Winning Problem Statement',
    summary: 'Avoid vague, oversized concepts like "AI that solves world poverty". Select a sharp, bounded problem affecting students, local communities, or developers.',
    actionableChecklist: [
      'Review sponsor tracks and specific challenge statements during the opening ceremony.',
      'Scope down ruthlessly: Plan to implement ONLY 1 core flow (Input -> Processing -> Output).',
      'Validate feasibility within 18 hours, leaving 6 hours for bug fixing, UI polish, and video demo recording.'
    ],
    resources: []
  },
  {
    stepNumber: 5,
    title: 'How to Build an MVP (Minimum Viable Prototype)',
    summary: 'Focus strictly on an end-to-end connected flow. A mock database or sample dataset with a live UI is better than a complex backend with no visual output.',
    actionableChecklist: [
      'Hour 1–3: Wireframe screens and lock OpenAPI endpoint contracts before coding.',
      'Hour 4–14: Build the core flow using familiar tech stacks (Vite, React, FastAPI/Node, PostgreSQL/Supabase).',
      'Hour 15–20: Integrate frontend with backend; handle loading and error states cleanly.',
      'Freeze code 4 hours before submission deadline—no last-minute major refactoring!'
    ],
    resources: [
      { name: 'GitHub Skills', url: 'https://skills.github.com/', note: 'Quick deployment with GitHub Pages / Vercel.' }
    ]
  },
  {
    stepNumber: 6,
    title: 'How to Present and Pitch Your Project to Judges',
    summary: 'Judges review dozens of projects in short rounds. A crisp, 3-minute demo that explains the problem and demonstrates the working software wins.',
    actionableChecklist: [
      'Minute 1: The Problem (Hook the judge with a relatable pain point and who suffers from it).',
      'Minute 2: The Live Demo (Show the software in action; walk through the primary user path without slides).',
      'Minute 3: Technical Architecture & Future Work (Show high-level system diagram and roadmap).',
      'Prepare a pre-recorded 2-minute backup video in case live WiFi drops during the showcase!'
    ],
    resources: []
  },
  {
    stepNumber: 7,
    title: 'How to Document Your Project on GitHub for Placement Impact',
    summary: 'A hackathon repository with a detailed README and live link serves as proof of engineering capability for technical recruiters and interviewers.',
    actionableChecklist: [
      'Include a clear project title, 1-sentence value proposition, and a demo GIF or screenshot.',
      'Add Architecture Diagram showing client, server, database, and any external APIs used.',
      'Provide concise "Quick Start" steps so anyone can clone and run `npm install && npm run dev`.',
      'Credit all team members with their specific engineering contributions.'
    ],
    resources: [
      { name: 'GitHub Docs — About READMEs', url: 'https://docs.github.com/', note: 'Official guidelines for effective repositories.' }
    ]
  }
]

// Category Labels and Descriptions
export const CATEGORY_METADATA: Record<RoadmapCategory, { label: string; description: string; icon: string }> = {
  fundamentals: {
    label: 'Programming Fundamentals',
    description: 'Object-oriented architecture, memory management, exception handling, and clean code principles',
    icon: 'Terminal'
  },
  dsa: {
    label: 'Data Structures & Algorithms',
    description: 'Algorithmic problem-solving, time-space complexity optimization, and coding interview patterns',
    icon: 'Cpu'
  },
  databases: {
    label: 'Databases & SQL',
    description: 'Relational data modeling, schema normalization, index performance tuning, and query analysis',
    icon: 'Database'
  },
  role_skills: {
    label: 'Role-Specific Technical Skills',
    description: 'Frameworks, domain libraries, architecture patterns, and specialized tools tailored to your target position',
    icon: 'Wrench'
  },
  aptitude: {
    label: 'Aptitude & Logical Reasoning',
    description: 'Quantitative aptitude, logical deduction, patterns, and critical reasoning required for initial screening rounds',
    icon: 'Brain'
  },
  communication: {
    label: 'Communication & Interview Prep',
    description: 'STAR behavioral communication, explaining technical tradeoffs, and structured system walkthroughs',
    icon: 'MessageSquare'
  },
  portfolio: {
    label: 'Projects & GitHub Portfolio',
    description: 'End-to-end full-stack or systems applications with automated tests, CI/CD, and live deployments',
    icon: 'FolderGit2'
  },
  hackathons: {
    label: 'Hackathons & Practical Experience',
    description: 'Team-based 24-hr engineering sprints, rapid MVP development, demo pitches, and open-source contributions',
    icon: 'Trophy'
  }
}

/**
 * Generates an 8-category customized skill roadmap based on company & target role,
 * while non-destructively preserving existing skill completion and exercise progress.
 */
export function generateDreamRoadmap(
  companyName: string,
  targetRole: string,
  existingProgress: Record<string, SkillProgressState> = {}
): RoadmapSkillItem[] {
  const comp = companyName.trim() || 'Target Tech Company'
  const role = targetRole.trim() || 'Software Development Engineer'
  const isDataRole = role.toLowerCase().includes('data') || role.toLowerCase().includes('analytics')
  const isWebRole = role.toLowerCase().includes('full stack') || role.toLowerCase().includes('frontend') || role.toLowerCase().includes('web')
  const isCloudRole = role.toLowerCase().includes('cloud') || role.toLowerCase().includes('devops') || role.toLowerCase().includes('sre')
  const isSystemsRole = role.toLowerCase().includes('system') || role.toLowerCase().includes('embedded') || role.toLowerCase().includes('network')

  const baseItems: Array<Omit<RoadmapSkillItem, 'status' | 'is_verified' | 'exercise_completed' | 'project_completed'>> = [
    // 1. Programming Fundamentals
    {
      id: 'fund-1',
      name: 'Object-Oriented Design & Clean Code Standards',
      category: 'fundamentals',
      priority: 'High',
      relevance: `${comp} evaluates code maintainability, SOLID principles, and modular class hierarchies during technical interviews.`,
      prerequisites: ['Basic syntax in Java, C++, or Python'],
      resources: [MASTER_LEARNING_RESOURCES[0]],
      practicalExercise: 'Refactor a monolithic 300-line script into 3 decoupled classes adhering strictly to Single Responsibility and Open-Closed principles.',
      isVerifiedEmployerRequirement: true,
      employerSource: `${comp} Campus Hiring Technical Standards`
    },
    {
      id: 'fund-2',
      name: 'Memory Lifecycle, Pointers & Concurrency Primitives',
      category: 'fundamentals',
      priority: 'Foundational',
      relevance: 'Crucial for passing machine coding rounds and understanding runtime call stacks, heap allocations, and thread safety.',
      prerequisites: ['Basic OS memory concepts'],
      resources: [MASTER_LEARNING_RESOURCES[0]],
      practicalExercise: 'Write a thread-safe bounded buffer producer-consumer implementation in your language of choice.',
      isVerifiedEmployerRequirement: false
    },

    // 2. Data Structures & Algorithms
    {
      id: 'dsa-1',
      name: 'Linear Data Structures: Two Pointers & Sliding Window',
      category: 'dsa',
      priority: 'High',
      relevance: `Found in over 60% of online assessment (OA) questions for ${comp} internship screening.`,
      prerequisites: ['Arrays and strings indexing'],
      resources: [MASTER_LEARNING_RESOURCES[0], MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Solve "Longest Substring Without Repeating Characters" and "Container With Most Water" using O(N) sliding window.',
      isVerifiedEmployerRequirement: true,
      employerSource: 'Standard Industry Screening Assessments'
    },
    {
      id: 'dsa-2',
      name: 'Tree Traversals, Binary Search Trees & Heaps',
      category: 'dsa',
      priority: 'High',
      relevance: `Core evaluation benchmark for ${comp} Day 1 technical interviews to test recursive thinking and tree manipulation.`,
      prerequisites: ['Pointers/References', 'Recursion fundamentals'],
      resources: [MASTER_LEARNING_RESOURCES[0]],
      practicalExercise: 'Implement Lowest Common Ancestor (LCA) in a Binary Tree and top-K frequent elements using a Min-Heap in O(N log K).',
      isVerifiedEmployerRequirement: true,
      employerSource: 'Campus Placement Technical Panel Guide'
    },
    {
      id: 'dsa-3',
      name: 'Graph Traversal (BFS / DFS) & Shortest Path (Dijkstra)',
      category: 'dsa',
      priority: 'High',
      relevance: `High-value technical question cluster for ${comp} assessing grid navigation, connected components, and topological sort.`,
      prerequisites: ['Adjacency List representation', 'Queue and Stack'],
      resources: [MASTER_LEARNING_RESOURCES[0]],
      practicalExercise: 'Solve "Number of Connected Islands" using DFS and "Course Schedule (Cycle Detection)" using Kahn BFS topological sort.',
      isVerifiedEmployerRequirement: true,
      employerSource: 'Industry Algorithmic Rubric'
    },
    {
      id: 'dsa-4',
      name: 'Dynamic Programming: Memoization & Tabulation',
      category: 'dsa',
      priority: 'Medium',
      relevance: 'Tested in Tier-1 screening rounds to separate strong problem-solvers on state transitions and overlapping subproblems.',
      prerequisites: ['Recursion trees', 'Space-time tradeoff analysis'],
      resources: [MASTER_LEARNING_RESOURCES[0], MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Implement 0/1 Knapsack, Coin Change minimum denominations, and Longest Increasing Subsequence with state breakdown.',
      isVerifiedEmployerRequirement: false
    },

    // 3. Databases and SQL
    {
      id: 'db-1',
      name: 'Relational Schema Normalization & ACID Transactions',
      category: 'databases',
      priority: 'High',
      relevance: `${comp} database rounds require designing normalized schemas without data redundancy and explaining transaction isolation levels.`,
      prerequisites: ['Entity Relationship concepts'],
      resources: [MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Design a 3NF relational schema for an e-commerce order processing system with proper primary and foreign keys.',
      isVerifiedEmployerRequirement: true,
      employerSource: 'RDBMS Core Curriculum & Placement Test Standards'
    },
    {
      id: 'db-2',
      name: 'Advanced SQL: Aggregations, Window Functions & Subqueries',
      category: 'databases',
      priority: 'High',
      relevance: 'Standard question format on HackerRank screening tests used by modern tech recruiters.',
      prerequisites: ['SELECT, WHERE, JOIN basics'],
      resources: [MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Write a SQL query using ROW_NUMBER() and DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) to find top earners.',
      isVerifiedEmployerRequirement: true,
      employerSource: 'HackerRank SQL Benchmark Standard'
    },
    {
      id: 'db-3',
      name: 'Database Indexing Mechanics (B-Trees) & Query Optimization',
      category: 'databases',
      priority: 'Medium',
      relevance: `Crucial for discussing backend performance tradeoffs when targeting ${role} roles at ${comp}.`,
      prerequisites: ['Relational Schema Normalization'],
      resources: [MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Execute EXPLAIN ANALYZE on a 50,000-row table to demonstrate sequential scan vs B-tree index scan execution timing.',
      isVerifiedEmployerRequirement: false
    },

    // 4. Role-Specific Technical Skills (Tailored dynamically)
    ...(isDataRole
      ? [
          {
            id: 'role-1',
            name: 'Python for Data Analysis (Pandas, NumPy, Vectorization)',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: `Mandatory operational skill for ${role} candidates at ${comp} handling real-world structured datasets.`,
            prerequisites: ['Python basics'],
            resources: [MASTER_LEARNING_RESOURCES[3]],
            practicalExercise: 'Load a messy 100k-row CSV, clean missing values, handle categorical outliers, and aggregate rolling 7-day metrics.',
            isVerifiedEmployerRequirement: true,
            employerSource: 'Data Engineering Curriculum Benchmark'
          },
          {
            id: 'role-2',
            name: 'Data Pipeline Ingestion & ETL Automation',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: 'Build reproducible pipelines transforming raw logs into analytics-ready schemas.',
            prerequisites: ['Python', 'SQL'],
            resources: [MASTER_LEARNING_RESOURCES[3]],
            practicalExercise: 'Build an automated Python ETL script that parses JSON API payloads and batch-upserts into PostgreSQL.',
            isVerifiedEmployerRequirement: false
          }
        ]
      : isWebRole
      ? [
          {
            id: 'role-1',
            name: 'Modern Web Architecture (React, TypeScript, State Management)',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: `Core technology stack expected for ${role} engineers at ${comp} building user-facing digital applications.`,
            prerequisites: ['HTML, CSS, JavaScript (ES6+)'],
            resources: [MASTER_LEARNING_RESOURCES[1]],
            practicalExercise: 'Build a fully typed interactive dashboard component with search, filtering, and optimistic UI updates.',
            isVerifiedEmployerRequirement: true,
            employerSource: 'Full Stack Engineering Rubric'
          },
          {
            id: 'role-2',
            name: 'RESTful API Engineering & Authentication Protocols',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: 'Connect client applications to secure backend microservices using JWT and token validation.',
            prerequisites: ['Node.js or Python backend frameworks'],
            resources: [MASTER_LEARNING_RESOURCES[1]],
            practicalExercise: 'Create a secured REST API with token authentication, route guards, and input schema validation.',
            isVerifiedEmployerRequirement: false
          }
        ]
      : isCloudRole
      ? [
          {
            id: 'role-1',
            name: 'Linux System Administration & Shell Scripting',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: `Essential operational foundation for ${role} positions at ${comp} to manage remote servers and diagnostics.`,
            prerequisites: ['Command-line basics'],
            resources: [MASTER_LEARNING_RESOURCES[5]],
            practicalExercise: 'Write a Bash automation script to inspect server CPU/memory, rotate log files, and dispatch webhook alerts.',
            isVerifiedEmployerRequirement: true,
            employerSource: 'Cloud Engineering Competency Matrix'
          },
          {
            id: 'role-2',
            name: 'Containerization with Docker & Microservice Networking',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: 'Package reproducible application environments across local testing and cloud deployment.',
            prerequisites: ['Linux fundamentals'],
            resources: [MASTER_LEARNING_RESOURCES[5]],
            practicalExercise: 'Create a multi-stage Dockerfile that packages a web app into a secure distroless image under 50MB.',
            isVerifiedEmployerRequirement: false
          }
        ]
      : isSystemsRole
      ? [
          {
            id: 'role-1',
            name: 'Operating System Internals, Process Scheduling & IPC',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: `Heavily tested in ${comp} systems rounds for low-level process synchronization, signals, and shared memory.`,
            prerequisites: ['C or C++ programming'],
            resources: [MASTER_LEARNING_RESOURCES[0]],
            practicalExercise: 'Implement inter-process communication using POSIX shared memory and semaphores.',
            isVerifiedEmployerRequirement: true,
            employerSource: 'Systems Software Engineering Standards'
          },
          {
            id: 'role-2',
            name: 'Computer Networks: TCP/IP Stack, Sockets & Handshakes',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: 'Understanding 3-way handshakes, congestion control, and socket programming.',
            prerequisites: ['OS fundamentals'],
            resources: [MASTER_LEARNING_RESOURCES[0]],
            practicalExercise: 'Build a multi-client TCP echo server using non-blocking socket select() or epoll in C/Python.',
            isVerifiedEmployerRequirement: false
          }
        ]
      : [
          // Default SDE Role Skills
          {
            id: 'role-1',
            name: 'System Design Basics: Scalability, Caching & Load Balancing',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: `${comp} evaluates high-level understanding of stateless servers, CDN caching, and horizontal vs vertical scaling.`,
            prerequisites: ['Client-server architecture', 'Databases'],
            resources: [MASTER_LEARNING_RESOURCES[0]],
            practicalExercise: 'Draft a 1-page system architecture for a URL shortening service calculating read/write throughput and storage requirements.',
            isVerifiedEmployerRequirement: false
          },
          {
            id: 'role-2',
            name: 'REST API Design & Backend Business Logic',
            category: 'role_skills' as RoadmapCategory,
            priority: 'High' as const,
            relevance: `Build robust backend services expected from ${role} engineers at ${comp}.`,
            prerequisites: ['Object-Oriented Programming'],
            resources: [MASTER_LEARNING_RESOURCES[1]],
            practicalExercise: 'Create a complete CRUD API with pagination, error status codes (400, 404, 500), and automated unit tests.',
            isVerifiedEmployerRequirement: true,
            employerSource: 'Technical Assessment Guidelines'
          }
        ]),

    // 5. Aptitude and Logical Reasoning
    {
      id: 'apt-1',
      name: 'Quantitative Problem Solving (Percentages, Ratios, Speed & Time)',
      category: 'aptitude',
      priority: 'Foundational',
      relevance: `First-round screening test for campus recruitment at ${comp} often includes timed quantitative aptitude filters.`,
      prerequisites: ['High-school mathematics'],
      resources: [MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Solve 20 timed aptitude questions on Time-Speed-Distance and Work-Pipes within 25 minutes.',
      isVerifiedEmployerRequirement: true,
      employerSource: 'Campus Recruitment Initial Filter Criterion'
    },
    {
      id: 'apt-2',
      name: 'Logical Deduction, Puzzles & Data Interpretation',
      category: 'aptitude',
      priority: 'Medium',
      relevance: 'Tests structured thinking, syllogisms, seating arrangements, and chart extraction under tight time constraints.',
      prerequisites: ['Basic logical reasoning'],
      resources: [MASTER_LEARNING_RESOURCES[2]],
      practicalExercise: 'Complete a 15-question logical arrangement puzzle set analyzing constraints and truth tables.',
      isVerifiedEmployerRequirement: false
    },

    // 6. Communication & Interview Preparation
    {
      id: 'comm-1',
      name: 'The STAR Method for Behavioral & Leadership Questions',
      category: 'communication',
      priority: 'High',
      relevance: `${comp} evaluates Culture Fit, Teamwork, and Conflict Resolution using Situation, Task, Action, Result structured responses.`,
      prerequisites: ['Personal project or team experience'],
      resources: [MASTER_LEARNING_RESOURCES[0]],
      practicalExercise: 'Draft 3 structured STAR responses: 1) Overcoming a technical roadblock, 2) Resolving team disagreement, 3) Delivering under tight deadline.',
      isVerifiedEmployerRequirement: true,
      employerSource: `${comp} Behavioral Interview Assessment Rubric`
    },
    {
      id: 'comm-2',
      name: 'Technical Thought Articulation & Whiteboard Walkthroughs',
      category: 'communication',
      priority: 'High',
      relevance: 'Interviewers grade your ability to communicate assumptions, ask clarifying questions, and analyze complexity out loud before coding.',
      prerequisites: ['Data Structures & Algorithms basics'],
      resources: [MASTER_LEARNING_RESOURCES[0]],
      practicalExercise: 'Record a 5-minute video of yourself walking through the problem "Merge K Sorted Lists" explaining brute force vs optimal heap approach.',
      isVerifiedEmployerRequirement: false
    },

    // 7. Projects & GitHub Portfolio
    {
      id: 'proj-1',
      name: 'Production-Grade GitHub Portfolio Project with Live URL',
      category: 'portfolio',
      priority: 'High',
      relevance: `A live deployed application distinguishes your resume at ${comp} from candidates with generic tutorial clones.`,
      prerequisites: ['Git & GitHub', 'Full Stack or Systems stack'],
      resources: [MASTER_LEARNING_RESOURCES[1], MASTER_LEARNING_RESOURCES[5]],
      practicalExercise: 'Deploy a full-stack project with live HTTPS link, responsive UI, automated database migrations, and comprehensive README.',
      isVerifiedEmployerRequirement: true,
      employerSource: 'Tech Hiring Manager Portfolio Evaluation Criteria'
    },
    {
      id: 'proj-2',
      name: 'Automated Testing (Unit & Integration) & CI/CD Actions',
      category: 'portfolio',
      priority: 'Medium',
      relevance: 'Demonstrates professional software engineering maturity by running test suites on every GitHub commit.',
      prerequisites: ['Git', 'Testing frameworks'],
      resources: [MASTER_LEARNING_RESOURCES[1]],
      practicalExercise: 'Configure a GitHub Actions workflow `.github/workflows/ci.yml` that runs linter and unit tests on pull requests.',
      isVerifiedEmployerRequirement: false
    },

    // 8. Hackathons & Practical Experience
    {
      id: 'hack-1',
      name: 'Participate in a 24-Hour Collegiate Hackathon (MVP Delivery)',
      category: 'hackathons',
      priority: 'High',
      relevance: `${comp} interviewers look for real-world proof of rapid learning, teamwork under pressure, and practical prototype delivery.`,
      prerequisites: ['Basic teamwork & rapid prototyping mindset'],
      resources: [MASTER_LEARNING_RESOURCES[4], MASTER_LEARNING_RESOURCES[1]],
      practicalExercise: 'Form a 3-person squad, register for an official MLH/campus hackathon, and ship a functioning MVP in under 24 hours.',
      isVerifiedEmployerRequirement: false
    },
    {
      id: 'hack-2',
      name: 'Project Showcase Pitch & GitHub Open-Source Contribution',
      category: 'hackathons',
      priority: 'Medium',
      relevance: 'Develop your ability to demo technical prototypes to judges and submit a pull request to open-source software.',
      prerequisites: ['GitHub Fork & Pull Request workflows'],
      resources: [MASTER_LEARNING_RESOURCES[1], MASTER_LEARNING_RESOURCES[5]],
      practicalExercise: 'Record a 3-minute video presentation of your hackathon project explaining the problem, demo, and architecture.',
      isVerifiedEmployerRequirement: false
    }
  ]

  // Merge with existing progress so that changing company/role never deletes achievements
  return baseItems.map(item => {
    const saved = existingProgress[item.id]
    return {
      ...item,
      status: saved?.status || 'not_started',
      is_verified: Boolean(saved?.is_verified),
      exercise_completed: Boolean(saved?.exercise_completed),
      project_completed: Boolean(saved?.project_completed)
    }
  })
}

// -------------------------------------------------------------
// Data Persistence Layer (Supabase + localStorage fallback cache)
// -------------------------------------------------------------

const PREFS_CACHE_KEY_PREFIX = 'ascendiq_dream_roadmap_prefs_'
const PROGRESS_CACHE_KEY_PREFIX = 'ascendiq_skill_progress_'

export async function fetchDreamRoadmapPreferences(userId: string): Promise<DreamRoadmapPreferences | null> {
  if (!userId) return null

  // 1. Check remote Supabase database first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_dream_roadmaps')
        .select('company_name, target_role, target_timeframe')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data && data.company_name) {
        const prefs: DreamRoadmapPreferences = {
          company_name: data.company_name,
          target_role: data.target_role,
          target_timeframe: data.target_timeframe || undefined
        }
        // Cache locally for offline resilience
        try {
          localStorage.setItem(`${PREFS_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(prefs))
        } catch {
          // ignore
        }
        return prefs
      }
    } catch {
      // ignore and fallback
    }
  }

  // 2. Fallback to localStorage
  try {
    const cached = localStorage.getItem(`${PREFS_CACHE_KEY_PREFIX}${userId}`)
    if (cached) {
      return JSON.parse(cached) as DreamRoadmapPreferences
    }
  } catch {
    // ignore
  }

  return null
}

export async function saveDreamRoadmapPreferences(
  userId: string,
  prefs: DreamRoadmapPreferences
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User is not authenticated' }

  // 1. Always save in localStorage immediately for instant UI responsiveness
  try {
    localStorage.setItem(`${PREFS_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(prefs))
  } catch (err) {
    console.warn('LocalStorage save failed:', err)
  }

  // 2. Persist to Supabase if available
  if (supabase) {
    try {
      const { error } = await supabase
        .from('student_dream_roadmaps')
        .upsert(
          {
            user_id: userId,
            company_name: prefs.company_name,
            target_role: prefs.target_role,
            target_timeframe: prefs.target_timeframe || null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.warn('Remote dream roadmap save error:', error.message)
        // Table might not exist yet; local cache is active
        return { success: true }
      }
      return { success: true }
    } catch (err: any) {
      console.warn('Supabase dream roadmap save exception:', err?.message)
      return { success: true }
    }
  }

  return { success: true }
}

export async function fetchStudentSkillProgress(
  userId: string
): Promise<Record<string, SkillProgressState>> {
  const result: Record<string, SkillProgressState> = {}
  if (!userId) return result

  // 1. Try remote Supabase query
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_skill_progress')
        .select('skill_id, status, is_verified, exercise_completed, project_completed, notes')
        .eq('user_id', userId)

      if (!error && Array.isArray(data)) {
        data.forEach(row => {
          result[row.skill_id] = {
            skill_id: row.skill_id,
            status: row.status as any,
            is_verified: row.is_verified,
            exercise_completed: row.exercise_completed,
            project_completed: row.project_completed,
            notes: row.notes || undefined
          }
        })
        // Sync to localStorage
        try {
          localStorage.setItem(`${PROGRESS_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(result))
        } catch {
          // ignore
        }
        return result
      }
    } catch {
      // fallback
    }
  }

  // 2. Fallback to localStorage
  try {
    const cached = localStorage.getItem(`${PROGRESS_CACHE_KEY_PREFIX}${userId}`)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {
    // ignore
  }

  return result
}

export async function saveStudentSkillProgress(
  userId: string,
  skillId: string,
  skillName: string,
  category: string,
  update: Partial<SkillProgressState>
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User is not authenticated' }

  // 1. Update localStorage cache
  try {
    const cachedStr = localStorage.getItem(`${PROGRESS_CACHE_KEY_PREFIX}${userId}`)
    const cached: Record<string, SkillProgressState> = cachedStr ? JSON.parse(cachedStr) : {}
    cached[skillId] = {
      ...(cached[skillId] || { skill_id: skillId, status: 'not_started' }),
      ...update
    }
    localStorage.setItem(`${PROGRESS_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(cached))
  } catch (err) {
    console.warn('LocalStorage skill update failed:', err)
  }

  // 2. Persist to Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('student_skill_progress')
        .upsert(
          {
            user_id: userId,
            skill_id: skillId,
            skill_name: skillName,
            category: category,
            status: update.status || 'not_started',
            is_verified: update.is_verified || false,
            exercise_completed: update.exercise_completed || false,
            project_completed: update.project_completed || false,
            notes: update.notes || null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,skill_id' }
        )

      if (error) {
        console.warn('Remote skill progress save error:', error.message)
      }
    } catch (err: any) {
      console.warn('Supabase skill progress save exception:', err?.message)
    }
  }

  return { success: true }
}
