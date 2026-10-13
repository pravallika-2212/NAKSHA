import { supabase } from './supabase.ts'
import { api, type StudentProfile } from './api.ts'

export interface FacultyProfile {
  id: string
  faculty_id: string
  full_name: string
  email: string
  department: string
  designation: string
  subjects: string[]
  office_room?: string
  phone?: string
  office_hours?: string
  bio?: string
  avatar_url?: string
}

export interface AcademicHourRecord {
  id: string
  faculty_name: string
  record_date: string
  academic_year: number
  branch: string
  section: string
  subject: string
  topic_covered: string
  hours: number
  notes?: string
  created_at: string
}

export interface Assignment {
  id: string
  faculty_name: string
  academic_year: number
  branch: string
  section: string
  subject: string
  title: string
  instructions: string
  assigned_date: string
  due_date: string
  attachment_url?: string
  status: 'published' | 'closed' | 'draft'
  created_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  student_email?: string
  submitted_at: string
  status: 'submitted' | 'graded' | 'resubmitted'
  is_late: boolean
  submission_content: string
  file_url?: string
  marks?: number
  feedback?: string
  graded_at?: string
}

export interface ClubNotification {
  id: string
  club_id: string
  club_name: string
  faculty_name: string
  title: string
  message: string
  event_date?: string
  location?: string
  attachment_url?: string
  published_at: string
}

// Initial Faculty Profile
export const DEFAULT_FACULTY_PROFILE: FacultyProfile = {
  id: 'fac-prof-001',
  faculty_id: 'FAC-CS-042',
  full_name: 'Dr. Ramesh Sharma',
  email: 'ramesh.sharma@ascendiq.edu',
  department: 'Computer Science & Engineering',
  designation: 'Associate Professor & Senior Mentor',
  subjects: [
    'Advanced Operating Systems (CS601)',
    'Database Internals & Optimization (CS602)',
    'Cloud Systems & Distributed Computing (CS701)'
  ],
  office_room: 'Academic Block B, Room 304',
  phone: '+91 98765 43210',
  office_hours: 'Monday & Thursday, 3:00 PM - 5:00 PM',
  bio: 'Ph.D. in Computer Science with 14+ years of academic research and teaching experience. Specializes in kernel scheduling, distributed storage systems, and student success analytics mentoring.',
  avatar_url: '/logo_1.jpeg'
}

// Initial Academic Hour Records
const INITIAL_HOUR_RECORDS: AcademicHourRecord[] = [
  {
    id: 'hr-001',
    faculty_name: 'Dr. Ramesh Sharma',
    record_date: '2026-10-12',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Advanced Operating Systems (CS601)',
    topic_covered: 'Page Replacement Algorithms: LRU, Clock, and Working Set Analysis',
    hours: 2,
    notes: 'Covered simulator benchmarks; students assigned problem set 4.',
    created_at: '2026-10-12T11:30:00Z'
  },
  {
    id: 'hr-002',
    faculty_name: 'Dr. Ramesh Sharma',
    record_date: '2026-10-10',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Database Internals & Optimization (CS602)',
    topic_covered: 'B+ Tree Concurrency Control and Latching Protocols',
    hours: 1.5,
    notes: 'Live demonstration of read-write latch deadlock recovery.',
    created_at: '2026-10-10T14:00:00Z'
  },
  {
    id: 'hr-003',
    faculty_name: 'Dr. Ramesh Sharma',
    record_date: '2026-10-08',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'B',
    subject: 'Advanced Operating Systems (CS601)',
    topic_covered: 'Virtual Memory Mapping and Multi-Level Page Tables in x86-64',
    hours: 2,
    notes: 'Interactive hardware MMU walkthrough.',
    created_at: '2026-10-08T10:15:00Z'
  },
  {
    id: 'hr-004',
    faculty_name: 'Prof. Anita Desai',
    record_date: '2026-10-11',
    academic_year: 4,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Placement Preparation & Problem Solving',
    topic_covered: 'Dynamic Programming Patterns: Matrix Chain Multiplication',
    hours: 2,
    notes: 'Mock placement test conducted for Tier-1 company preparation.',
    created_at: '2026-10-11T16:00:00Z'
  }
]

// Initial Assignments
const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg-live-101',
    faculty_name: 'Dr. Ramesh Sharma',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Advanced Operating Systems (CS601)',
    title: 'Virtual Memory Page Replacement Simulator',
    instructions: 'Implement an optimal versus LRU and Clock page replacement simulator in C/C++ or Python. Measure page fault rate on synthetic memory trace references and write a 2-page benchmark comparison report.',
    assigned_date: '2026-10-08',
    due_date: '2026-10-25',
    attachment_url: 'https://ascendiq.edu/courseware/cs601/page_sim_spec.pdf',
    status: 'published',
    created_at: '2026-10-08T09:00:00Z'
  },
  {
    id: 'asg-live-102',
    faculty_name: 'Dr. Ramesh Sharma',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'A',
    subject: 'Database Internals & Optimization (CS602)',
    title: 'B+ Tree Index Concurrency Benchmarking',
    instructions: 'Analyze multi-threaded read/write throughput using crabbing latch protocols versus optimistic lock coupling. Submit code and output chart.',
    assigned_date: '2026-10-02',
    due_date: '2026-10-18',
    attachment_url: 'https://ascendiq.edu/courseware/cs602/bplus_bench.pdf',
    status: 'published',
    created_at: '2026-10-02T10:00:00Z'
  },
  {
    id: 'asg-live-103',
    faculty_name: 'Dr. Ramesh Sharma',
    academic_year: 3,
    branch: 'Computer Science & Engineering',
    section: 'B',
    subject: 'Advanced Operating Systems (CS601)',
    title: 'Kernel Thread Synchronization & Deadlock Monitor',
    instructions: 'Implement a user-space pthread synchronization monitor with circular wait detection. Include test cases showing proper lock acquisition order.',
    assigned_date: '2026-10-05',
    due_date: '2026-10-22',
    attachment_url: 'https://ascendiq.edu/courseware/cs601/thread_sync.pdf',
    status: 'published',
    created_at: '2026-10-05T14:00:00Z'
  }
]

// Initial Submissions
const INITIAL_SUBMISSIONS: AssignmentSubmission[] = [
  {
    id: 'sub-001',
    assignment_id: 'asg-live-101',
    student_id: 'STU-CS-101',
    student_name: 'Priya Sharma',
    student_email: 'priya.sharma@demo.ascendiq.ai',
    submitted_at: '2026-10-12T16:20:00Z',
    status: 'submitted',
    is_late: false,
    submission_content: 'Implemented LRU with doubly-linked list and hash map cache. Clock algorithm uses 8-bit reference counters. Source code uploaded to repository at github.com/priya-sharma/os-page-sim.',
    file_url: 'https://ascendiq.edu/submissions/STU-CS-101_asg1.zip',
    marks: undefined,
    feedback: undefined
  },
  {
    id: 'sub-002',
    assignment_id: 'asg-live-102',
    student_id: 'STU-CS-101',
    student_name: 'Priya Sharma',
    student_email: 'priya.sharma@demo.ascendiq.ai',
    submitted_at: '2026-10-14T11:45:00Z',
    status: 'graded',
    is_late: false,
    submission_content: 'Benchmark executed with 16 worker threads on 10M keys. Optimistic lock coupling outperformed lock coupling by 34% on read-heavy workloads.',
    file_url: 'https://ascendiq.edu/submissions/STU-CS-101_bplus.pdf',
    marks: 95,
    feedback: 'Outstanding latency analysis and clear graph presentations. Well done!'
  }
]

// Initial Club Notifications
const INITIAL_CLUB_NOTIFICATIONS: ClubNotification[] = [
  {
    id: 'club-notif-001',
    club_id: 'club-1',
    club_name: 'ACM Student Chapter',
    faculty_name: 'Dr. Ramesh Sharma',
    title: 'ACM Technical Talk: High-Throughput Distributed Consensus Systems',
    message: 'Join us this Friday for a guest lecture by Industry Principal Architect on Raft and Paxos consensus implementations in production distributed databases.',
    event_date: '2026-10-17',
    location: 'Auditorium 2 & Live Virtual Stream',
    attachment_url: 'https://ascendiq.edu/clubs/acm_talk_oct2026.pdf',
    published_at: '2026-10-12T09:30:00Z'
  },
  {
    id: 'club-notif-002',
    club_id: 'club-2',
    club_name: 'ASCENDIQ Open Source Society',
    faculty_name: 'Dr. Ramesh Sharma',
    title: 'Hacktoberfest Campus Sprint: Mentorship & Pull Request Review Lab',
    message: 'Bring your laptops! Faculty mentors and core student contributors will review your open source contributions and guide bug triage for beginner to advanced projects.',
    event_date: '2026-10-21',
    location: 'Computer Systems Lab 4',
    attachment_url: 'https://ascendiq.edu/clubs/hacktoberfest_guide.pdf',
    published_at: '2026-10-11T14:15:00Z'
  }
]

const inMemoryStore = new Map<string, string>()

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    } else {
      const raw = inMemoryStore.get(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch (err) {
    console.warn(`Storage load error for ${key}:`, err)
  }
  return fallback
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
    inMemoryStore.set(key, serialized)
  } catch (err) {
    console.warn(`Storage save error for ${key}:`, err)
  }
}

export const collegeService = {
  // --- Faculty Profile ---
  async getFacultyProfile(_facultyId?: string): Promise<FacultyProfile> {
    const stored = loadFromStorage<FacultyProfile>('ascendiq_faculty_profile', DEFAULT_FACULTY_PROFILE)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('faculty_profiles')
          .select('*')
          .limit(1)
          .maybeSingle()
        if (!error && data) {
          return {
            ...stored,
            id: data.id,
            faculty_id: data.faculty_id,
            full_name: data.full_name,
            email: data.email,
            department: data.department,
            designation: data.designation,
            subjects: data.subjects || stored.subjects,
            office_room: data.office_room || stored.office_room,
            phone: data.phone || stored.phone,
            office_hours: data.office_hours || stored.office_hours,
            bio: data.bio || stored.bio,
            avatar_url: data.avatar_url || stored.avatar_url
          }
        }
      } catch {
        // use local storage fallback
      }
    }
    return stored
  },

  async updateFacultyProfile(updates: Partial<FacultyProfile>): Promise<FacultyProfile> {
    const current = await this.getFacultyProfile()
    const updated: FacultyProfile = { ...current, ...updates }
    saveToStorage('ascendiq_faculty_profile', updated)
    if (supabase) {
      try {
        await supabase
          .from('faculty_profiles')
          .upsert({
            faculty_id: updated.faculty_id,
            full_name: updated.full_name,
            email: updated.email,
            department: updated.department,
            designation: updated.designation,
            subjects: updated.subjects,
            office_room: updated.office_room,
            phone: updated.phone,
            office_hours: updated.office_hours,
            bio: updated.bio,
            avatar_url: updated.avatar_url,
            updated_at: new Date().toISOString()
          }, { onConflict: 'faculty_id' })
      } catch {
        // fallback active
      }
    }
    return updated
  },

  // --- Hour Details ---
  async getHourRecords(filters?: { branch?: string; academic_year?: number; section?: string }): Promise<AcademicHourRecord[]> {
    let records = loadFromStorage<AcademicHourRecord[]>('ascendiq_hour_records', INITIAL_HOUR_RECORDS)
    if (filters?.branch && filters.branch !== 'all') {
      records = records.filter(r => r.branch.toLowerCase().includes(filters.branch!.toLowerCase()))
    }
    if (filters?.academic_year) {
      records = records.filter(r => r.academic_year === filters.academic_year)
    }
    if (filters?.section && filters.section !== 'all') {
      records = records.filter(r => r.section.toUpperCase() === filters.section!.toUpperCase())
    }
    return records.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
  },

  async addHourRecord(record: Omit<AcademicHourRecord, 'id' | 'created_at'>): Promise<AcademicHourRecord> {
    const current = loadFromStorage<AcademicHourRecord[]>('ascendiq_hour_records', INITIAL_HOUR_RECORDS)
    const newRecord: AcademicHourRecord = {
      ...record,
      id: 'hr-' + Date.now(),
      created_at: new Date().toISOString()
    }
    const updated = [newRecord, ...current]
    saveToStorage('ascendiq_hour_records', updated)
    if (supabase) {
      try {
        await supabase.from('academic_hour_records').insert({
          faculty_name: newRecord.faculty_name,
          record_date: newRecord.record_date,
          academic_year: newRecord.academic_year,
          branch: newRecord.branch,
          section: newRecord.section,
          subject: newRecord.subject,
          topic_covered: newRecord.topic_covered,
          hours: newRecord.hours,
          notes: newRecord.notes
        })
      } catch {
        // local fallback preserved
      }
    }
    return newRecord
  },

  // --- Assignments ---
  async getAssignments(filters?: { branch?: string; academic_year?: number; section?: string }): Promise<Assignment[]> {
    let assignments = loadFromStorage<Assignment[]>('ascendiq_assignments', INITIAL_ASSIGNMENTS)
    if (filters?.branch && filters.branch !== 'all') {
      assignments = assignments.filter(a => a.branch.toLowerCase().includes(filters.branch!.toLowerCase()))
    }
    if (filters?.academic_year) {
      assignments = assignments.filter(a => a.academic_year === filters.academic_year)
    }
    if (filters?.section && filters.section !== 'all') {
      assignments = assignments.filter(a => a.section.toUpperCase() === filters.section!.toUpperCase())
    }
    return assignments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async createAssignment(asg: Omit<Assignment, 'id' | 'created_at'>): Promise<Assignment> {
    const current = loadFromStorage<Assignment[]>('ascendiq_assignments', INITIAL_ASSIGNMENTS)
    const newAsg: Assignment = {
      ...asg,
      id: 'asg-live-' + Date.now(),
      created_at: new Date().toISOString()
    }
    const updated = [newAsg, ...current]
    saveToStorage('ascendiq_assignments', updated)
    if (supabase) {
      try {
        await supabase.from('assignments').insert({
          id: newAsg.id,
          faculty_name: newAsg.faculty_name,
          academic_year: newAsg.academic_year,
          branch: newAsg.branch,
          section: newAsg.section,
          subject: newAsg.subject,
          title: newAsg.title,
          instructions: newAsg.instructions,
          assigned_date: newAsg.assigned_date,
          due_date: newAsg.due_date,
          attachment_url: newAsg.attachment_url,
          status: newAsg.status
        })
      } catch {
        // local fallback
      }
    }
    return newAsg
  },

  // --- Submissions ---
  async getSubmissions(assignmentId?: string): Promise<AssignmentSubmission[]> {
    let submissions = loadFromStorage<AssignmentSubmission[]>('ascendiq_submissions', INITIAL_SUBMISSIONS)
    if (assignmentId) {
      submissions = submissions.filter(s => s.assignment_id === assignmentId)
    }
    return submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
  },

  async submitAssignment(submission: Omit<AssignmentSubmission, 'id' | 'submitted_at' | 'status' | 'is_late'>, dueDateStr?: string): Promise<AssignmentSubmission> {
    const current = loadFromStorage<AssignmentSubmission[]>('ascendiq_submissions', INITIAL_SUBMISSIONS)
    const submittedAt = new Date().toISOString()
    let isLate = false
    if (dueDateStr) {
      const due = new Date(dueDateStr).getTime()
      if (new Date(submittedAt).getTime() > due) {
        isLate = true
      }
    }

    const existingIndex = current.findIndex(s => s.assignment_id === submission.assignment_id && s.student_id === submission.student_id)
    const newSub: AssignmentSubmission = {
      ...submission,
      id: existingIndex >= 0 ? current[existingIndex].id : 'sub-' + Date.now(),
      submitted_at: submittedAt,
      status: existingIndex >= 0 ? 'resubmitted' : 'submitted',
      is_late: isLate
    }

    let updated: AssignmentSubmission[]
    if (existingIndex >= 0) {
      updated = [...current]
      updated[existingIndex] = newSub
    } else {
      updated = [newSub, ...current]
    }
    saveToStorage('ascendiq_submissions', updated)
    return newSub
  },

  async gradeSubmission(submissionId: string, marks: number, feedback: string): Promise<AssignmentSubmission | null> {
    const current = loadFromStorage<AssignmentSubmission[]>('ascendiq_submissions', INITIAL_SUBMISSIONS)
    const idx = current.findIndex(s => s.id === submissionId)
    if (idx === -1) return null

    current[idx].marks = marks
    current[idx].feedback = feedback
    current[idx].status = 'graded'
    current[idx].graded_at = new Date().toISOString()

    saveToStorage('ascendiq_submissions', current)
    return current[idx]
  },

  // --- Club Notifications ---
  async getClubNotifications(clubId?: string): Promise<ClubNotification[]> {
    let notifs = loadFromStorage<ClubNotification[]>('ascendiq_club_notifications', INITIAL_CLUB_NOTIFICATIONS)
    if (clubId && clubId !== 'all') {
      notifs = notifs.filter(n => n.club_id === clubId)
    }
    return notifs.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
  },

  async createClubNotification(notif: Omit<ClubNotification, 'id' | 'published_at'>): Promise<ClubNotification> {
    const current = loadFromStorage<ClubNotification[]>('ascendiq_club_notifications', INITIAL_CLUB_NOTIFICATIONS)
    const newNotif: ClubNotification = {
      ...notif,
      id: 'club-notif-' + Date.now(),
      published_at: new Date().toISOString()
    }
    const updated = [newNotif, ...current]
    saveToStorage('ascendiq_club_notifications', updated)
    return newNotif
  },

  async getReadNotificationIds(studentId: string): Promise<string[]> {
    return loadFromStorage<string[]>('ascendiq_read_notifs_' + studentId, [])
  },

  async markNotificationRead(studentId: string, notificationId: string): Promise<void> {
    const current = await this.getReadNotificationIds(studentId)
    if (!current.includes(notificationId)) {
      saveToStorage('ascendiq_read_notifs_' + studentId, [...current, notificationId])
    }
  },

  // --- Class Roster matching Year, Branch, Section ---
  async getClassRoster(academicYear: number, branch: string, section: string): Promise<StudentProfile[]> {
    try {
      const res = await api.getStudents()
      const all = res.students || []
      const branchLower = branch.toLowerCase()

      const matched = all.filter(s => {
        const yrMatches = s.academic_year === academicYear
        const branchMatches = s.department.toLowerCase().includes(branchLower) || branchLower.includes(s.department.toLowerCase())
        const sectionMatches = (s.section || 'A').toUpperCase() === section.toUpperCase()
        return yrMatches && branchMatches && sectionMatches
      })

      if (matched.length > 0) return matched
      const fallback = all.filter(s => s.academic_year === academicYear && (s.department.toLowerCase().includes(branchLower) || branchLower.includes(s.department.toLowerCase())))
      return fallback.length > 0 ? fallback : all.slice(0, 5)
    } catch {
      return []
    }
  },

  // --- Institution-wide & Branch Statistics for College Admin ---
  async getCollegeAdminStats(): Promise<{
    totalStudents: number
    totalFaculty: number
    totalBranches: number
    studentsByYear: { year1: number; year2: number; year3: number; year4: number }
    totalAssignments: number
    totalSubmissions: number
    totalPendingSubmissions: number
    overallSubmissionRate: number
    totalAcademicHours: number
    totalClubAnnouncements: number
    pendingVerifications: number
    branches: Array<{
      name: string
      code: string
      studentsCount: number
      facultyCount: number
      assignmentsCount: number
      hoursLogged: number
    }>
  }> {
    let allStudents: StudentProfile[] = []
    try {
      const res = await api.getStudents()
      allStudents = res.students || []
    } catch {
      allStudents = []
    }

    const assignments = await this.getAssignments()
    const submissions = await this.getSubmissions()
    const hourRecords = await this.getHourRecords()
    const clubNotifs = await this.getClubNotifications()

    const yr1 = allStudents.filter(s => s.academic_year === 1).length
    const yr2 = allStudents.filter(s => s.academic_year === 2).length
    const yr3 = allStudents.filter(s => s.academic_year === 3).length
    const yr4 = allStudents.filter(s => s.academic_year === 4).length

    const totalHours = hourRecords.reduce((sum, h) => sum + Number(h.hours), 0)

    const branchesList = [
      { name: 'Computer Science & Engineering', code: 'CSE', defaultFaculty: 18 },
      { name: 'Artificial Intelligence & Data Science', code: 'AIDS', defaultFaculty: 12 },
      { name: 'Electronics & Communication Engineering', code: 'ECE', defaultFaculty: 14 },
      { name: 'Mechanical Engineering', code: 'MECH', defaultFaculty: 10 }
    ]

    const branchSummaries = branchesList.map(b => {
      const bStudents = allStudents.filter(s => s.department.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(s.department.toLowerCase()))
      const bAssignments = assignments.filter(a => a.branch.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(a.branch.toLowerCase()))
      const bHours = hourRecords
        .filter(h => h.branch.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(h.branch.toLowerCase()))
        .reduce((sum, h) => sum + Number(h.hours), 0)

      return {
        name: b.name,
        code: b.code,
        studentsCount: bStudents.length > 0 ? bStudents.length : Math.round(allStudents.length * 0.35),
        facultyCount: b.defaultFaculty,
        assignmentsCount: bAssignments.length,
        hoursLogged: bHours
      }
    })

    const submittedCount = submissions.length
    const estimatedEligible = Math.max(submittedCount, assignments.length * 15)
    const pendingCount = Math.max(0, estimatedEligible - submittedCount)
    const rate = estimatedEligible > 0 ? Math.round((submittedCount / estimatedEligible) * 100) : 0

    return {
      totalStudents: allStudents.length > 0 ? allStudents.length : 42,
      totalFaculty: 54,
      totalBranches: branchesList.length,
      studentsByYear: {
        year1: yr1 || 8,
        year2: yr2 || 10,
        year3: yr3 || 14,
        year4: yr4 || 10
      },
      totalAssignments: assignments.length,
      totalSubmissions: submittedCount,
      totalPendingSubmissions: pendingCount,
      overallSubmissionRate: rate,
      totalAcademicHours: totalHours,
      totalClubAnnouncements: clubNotifs.length,
      pendingVerifications: 3,
      branches: branchSummaries
    }
  }
}
