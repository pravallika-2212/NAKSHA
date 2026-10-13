import { useState, useEffect, useMemo } from 'react'
import {
  Target, Building, Sparkles, CheckCircle2, Circle,
  Filter, ExternalLink, BookOpen, Trophy,
  RefreshCw, Layers, Terminal, Cpu, Database, Wrench,
  Brain, MessageSquare, FolderGit2, Check, Info
} from 'lucide-react'
import type { StudentProfile } from '../../lib/api'
import {
  generateDreamRoadmap,
  fetchDreamRoadmapPreferences,
  saveDreamRoadmapPreferences,
  fetchStudentSkillProgress,
  saveStudentSkillProgress,
  MASTER_LEARNING_RESOURCES,
  HACKATHON_GUIDE_STEPS,
  CATEGORY_METADATA,
  type RoadmapCategory,
  type RoadmapSkillItem,
  type DreamRoadmapPreferences,
  type SkillProgressState
} from '../../lib/dreamRoadmap'
import { DreamCompanySelectorModal } from './DreamCompanySelectorModal'

interface Year2DreamRoadmapViewProps {
  studentData: StudentProfile
  userId?: string
}

export function Year2DreamRoadmapView({ studentData, userId }: Year2DreamRoadmapViewProps) {
  const currentUserId = userId || studentData.student_id || 'guest-student-year2'

  // Preferences & Roadmap State
  const [preferences, setPreferences] = useState<DreamRoadmapPreferences | null>(null)
  const [skillProgressMap, setSkillProgressMap] = useState<Record<string, SkillProgressState>>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [showSelectorModal, setShowSelectorModal] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  // Active View Tab: 'roadmap' | 'resources' | 'hackathons'
  const [activeSubTab, setActiveSubTab] = useState<'roadmap' | 'resources' | 'hackathons'>('roadmap')

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<RoadmapCategory | 'all'>('all')
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'High' | 'Medium' | 'Foundational'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all')

  // Load preferences and skill progress on mount
  useEffect(() => {
    let mounted = true
    setIsLoading(true)

    Promise.all([
      fetchDreamRoadmapPreferences(currentUserId),
      fetchStudentSkillProgress(currentUserId)
    ])
      .then(([prefs, progress]) => {
        if (!mounted) return
        setPreferences(prefs)
        setSkillProgressMap(progress)
        setIsLoading(false)
        // If first time visiting and no dream company saved, open modal
        if (!prefs) {
          setShowSelectorModal(true)
        }
      })
      .catch(() => {
        if (!mounted) return
        setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [currentUserId])

  // Generate dynamic roadmap grounded in preferences and existing progress
  const roadmapSkills: RoadmapSkillItem[] = useMemo(() => {
    const comp = preferences?.company_name || 'Target Tech Company'
    const role = preferences?.target_role || 'Software Development Engineer'
    return generateDreamRoadmap(comp, role, skillProgressMap)
  }, [preferences, skillProgressMap])

  // Overall Progress Calculations
  const stats = useMemo(() => {
    const total = roadmapSkills.length
    const completed = roadmapSkills.filter(s => s.status === 'completed').length
    const inProgress = roadmapSkills.filter(s => s.status === 'in_progress').length
    const notStarted = total - completed - inProgress
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const verifiedEmployerCount = roadmapSkills.filter(s => s.isVerifiedEmployerRequirement).length
    const exercisesDone = roadmapSkills.filter(s => s.exercise_completed).length

    return { total, completed, inProgress, notStarted, percentage, verifiedEmployerCount, exercisesDone }
  }, [roadmapSkills])

  // Filtered skills list
  const filteredSkills = useMemo(() => {
    return roadmapSkills.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
      if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false
      return true
    })
  }, [roadmapSkills, selectedCategory, selectedPriority, selectedStatus])

  // Save new dream company & role
  async function handleSavePreferences(newPrefs: DreamRoadmapPreferences) {
    setPreferences(newPrefs)
    await saveDreamRoadmapPreferences(currentUserId, newPrefs)
    setStatusMessage({
      type: 'success',
      text: `Roadmap regenerated for ${newPrefs.company_name} · ${newPrefs.target_role}. Completed skills are preserved.`
    })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  // Update status of an individual skill
  async function handleUpdateSkillStatus(skill: RoadmapSkillItem, newStatus: 'not_started' | 'in_progress' | 'completed') {
    const update: Partial<SkillProgressState> = {
      skill_id: skill.id,
      status: newStatus
    }

    setSkillProgressMap(prev => ({
      ...prev,
      [skill.id]: {
        ...(prev[skill.id] || { skill_id: skill.id, status: 'not_started' }),
        ...update
      }
    }))

    await saveStudentSkillProgress(currentUserId, skill.id, skill.name, skill.category, update)
  }

  // Toggle practical exercise completion
  async function handleToggleExercise(skill: RoadmapSkillItem) {
    const newDone = !skill.exercise_completed
    const update: Partial<SkillProgressState> = {
      skill_id: skill.id,
      exercise_completed: newDone
    }

    setSkillProgressMap(prev => ({
      ...prev,
      [skill.id]: {
        ...(prev[skill.id] || { skill_id: skill.id, status: 'not_started' }),
        ...update
      }
    }))

    await saveStudentSkillProgress(currentUserId, skill.id, skill.name, skill.category, update)
  }

  function getCategoryIcon(cat: RoadmapCategory) {
    switch (cat) {
      case 'fundamentals': return <Terminal size={14} />
      case 'dsa': return <Cpu size={14} />
      case 'databases': return <Database size={14} />
      case 'role_skills': return <Wrench size={14} />
      case 'aptitude': return <Brain size={14} />
      case 'communication': return <MessageSquare size={14} />
      case 'portfolio': return <FolderGit2 size={14} />
      case 'hackathons': return <Trophy size={14} />
      default: return <Layers size={14} />
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--sq-text-muted)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px', color: 'var(--sq-maroon)' }} />
        <div>Loading your Year 2 Dream Company Roadmap…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Feedback Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            background: statusMessage.type === 'success' ? '#E8F5E9' : '#E3F2FD',
            color: statusMessage.type === 'success' ? '#2E7D32' : '#1565C0',
            border: `1px solid ${statusMessage.type === 'success' ? '#A5D6A7' : '#90CAF9'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={16} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--sq-maroon-dark) 0%, var(--sq-maroon) 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: 'var(--sq-shadow-md)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700 }}>
            <Target size={15} /> Year 2 Specialized Career Gateway
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Year 2 Dream Company Career Roadmap
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.78)', maxWidth: 640 }}>
            Build pre-placement technical depth before campus drives open in Year 3. Master core algorithms, verified database standards, GitHub portfolio repositories, and student hackathons.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowSelectorModal(true)}
            style={{
              background: 'var(--sq-pink-soft)',
              color: 'var(--sq-maroon-dark)',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
          >
            <Building size={14} />
            {preferences ? 'Change Dream Company' : 'Set Dream Company'}
          </button>
        </div>
      </div>

      {/* Dream Company Card */}
      {preferences ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '20px 24px',
            border: '1px solid var(--sq-border-light)',
            boxShadow: '0 2px 8px rgba(75, 16, 40, 0.04)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
              Target Employer
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--sq-maroon)' }}>
                {preferences.company_name}
              </span>
              <span className="sq-tag" style={{ background: 'var(--sq-pink-soft)', color: 'var(--sq-maroon)' }}>
                Dream Target
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
              Target Engineering Role
            </span>
            <b style={{ fontSize: 14, color: 'var(--sq-text-main)' }}>
              {preferences.target_role}
            </b>
          </div>

          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
              Preparation Horizon
            </span>
            <span style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
              {preferences.target_timeframe || 'Summer 2027 Internship Track'}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button
              onClick={() => setShowSelectorModal(true)}
              style={{
                background: 'var(--sq-bg-base)',
                color: 'var(--sq-maroon)',
                border: '1px solid var(--sq-border-medium)',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Sparkles size={13} /> Edit Target
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: 'var(--sq-bg-base)',
            border: '2px dashed var(--sq-border-medium)',
            borderRadius: 14,
            padding: '32px 24px',
            textAlign: 'center'
          }}
        >
          <Building size={36} style={{ color: 'var(--sq-maroon)', margin: '0 auto 10px', opacity: 0.8 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
            Choose Your Year 2 Dream Company
          </h3>
          <p style={{ margin: '0 auto 16px', fontSize: 12, color: 'var(--sq-text-muted)', maxWidth: 480 }}>
            Select your dream employer (Google, Microsoft, Amazon, Zoho, Cisco, or any custom organization) to receive an 8-pillar personalized roadmap.
          </p>
          <button
            onClick={() => setShowSelectorModal(true)}
            className="button"
            style={{ fontSize: 12, padding: '10px 20px', cursor: 'pointer' }}
          >
            Select Company & Target Role
          </button>
        </div>
      )}

      {/* Overall Roadmap Progress Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: '20px 24px',
          border: '1px solid var(--sq-border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              Roadmap Mastery & Self-Reported Progress
            </h3>
            <small style={{ color: 'var(--sq-text-muted)' }}>
              Self-reported completion across all 8 foundational pillars · Assessment verification commences in Year 3
            </small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
              Completed: <b style={{ color: 'var(--sq-success)' }}>{stats.completed}</b> / {stats.total}
            </span>
            <span style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
              In Progress: <b style={{ color: 'var(--sq-warning)' }}>{stats.inProgress}</b>
            </span>
            <span style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
              Exercises: <b style={{ color: 'var(--sq-maroon)' }}>{stats.exercisesDone}</b> done
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--sq-maroon)',
                background: 'var(--sq-pink-soft)',
                padding: '4px 10px',
                borderRadius: 6
              }}
            >
              {stats.percentage}% Ready
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 10, background: 'var(--sq-bg-subtle)', borderRadius: 6, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${stats.percentage}%`,
              background: 'linear-gradient(90deg, var(--sq-rose-muted) 0%, var(--sq-maroon) 100%)',
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* Disclaimer Note on Employer Criteria */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--sq-text-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--sq-bg-base)',
            padding: '8px 12px',
            borderRadius: 6
          }}
        >
          <Info size={13} style={{ flexShrink: 0, color: 'var(--sq-maroon)' }} />
          <span>
            <b>Standard Transparency Policy:</b> Skills labeled <b style={{ color: '#2E7D32' }}>✓ Employer Standard</b> match publicly verified campus recruitment rubrics. All other skills represent curriculum recommendations for engineering competence.
          </span>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--sq-border-light)', paddingBottom: 4 }}>
        {[
          { id: 'roadmap', label: '8-Pillar Skill Roadmap', count: roadmapSkills.length },
          { id: 'resources', label: 'Verified Learning Resources', count: MASTER_LEARNING_RESOURCES.length },
          { id: 'hackathons', label: 'Learn About Hackathons (Year 2 Guide)', count: HACKATHON_GUIDE_STEPS.length }
        ].map(tab => {
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: isActive ? 'var(--sq-maroon)' : 'transparent',
                color: isActive ? '#fff' : 'var(--sq-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--sq-bg-base)',
                  color: isActive ? '#fff' : 'var(--sq-text-muted)'
                }}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* SUB-TAB 1: 8-Pillar Skill Roadmap */}
      {activeSubTab === 'roadmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category Filter Bar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: selectedCategory === 'all' ? '1.5px solid var(--sq-maroon)' : '1px solid var(--sq-border-light)',
                background: selectedCategory === 'all' ? 'var(--sq-pink-soft)' : '#fff',
                color: selectedCategory === 'all' ? 'var(--sq-maroon-dark)' : 'var(--sq-text-main)'
              }}
            >
              All Pillars ({roadmapSkills.length})
            </button>

            {(Object.keys(CATEGORY_METADATA) as RoadmapCategory[]).map(catKey => {
              const meta = CATEGORY_METADATA[catKey]
              const count = roadmapSkills.filter(s => s.category === catKey).length
              const isSelected = selectedCategory === catKey
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: isSelected ? '1.5px solid var(--sq-maroon)' : '1px solid var(--sq-border-light)',
                    background: isSelected ? 'var(--sq-pink-soft)' : '#fff',
                    color: isSelected ? 'var(--sq-maroon-dark)' : 'var(--sq-text-main)'
                  }}
                >
                  {getCategoryIcon(catKey)}
                  <span>{meta.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>
                </button>
              )
            })}
          </div>

          {/* Secondary Priority & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sq-text-muted)' }}>
                <Filter size={13} /> Priority:
                <select
                  value={selectedPriority}
                  onChange={e => setSelectedPriority(e.target.value as any)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--sq-border-light)', fontSize: 11 }}
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium</option>
                  <option value="Foundational">Foundational</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sq-text-muted)' }}>
                Status:
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as any)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--sq-border-light)', fontSize: 11 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <span style={{ fontSize: 11, color: 'var(--sq-text-light)' }}>
              Showing {filteredSkills.length} of {roadmapSkills.length} recommended skills
            </span>
          </div>

          {/* Skills Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredSkills.map(skill => {
              return (
                <div
                  key={skill.id}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '18px 20px',
                    border: '1px solid var(--sq-border-light)',
                    boxShadow: '0 1px 4px rgba(75, 16, 40, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span
                          className="sq-tag"
                          style={{
                            background: skill.priority === 'High' ? '#FFEBEE' : skill.priority === 'Medium' ? '#FFF3E0' : '#E8F5E9',
                            color: skill.priority === 'High' ? '#C62828' : skill.priority === 'Medium' ? '#E65100' : '#2E7D32',
                            fontWeight: 700
                          }}
                        >
                          {skill.priority} Priority
                        </span>

                        <span className="sq-tag" style={{ background: 'var(--sq-bg-base)', color: 'var(--sq-maroon)' }}>
                          {CATEGORY_METADATA[skill.category].label}
                        </span>

                        {skill.isVerifiedEmployerRequirement ? (
                          <span
                            className="sq-tag"
                            style={{ background: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }}
                            title={skill.employerSource}
                          >
                            ✓ Employer Standard
                          </span>
                        ) : (
                          <span className="sq-tag" style={{ background: '#F5F5F5', color: '#757575' }}>
                            Curriculum Recommendation
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '4px 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
                        {skill.name}
                      </h4>

                      <p style={{ margin: 0, fontSize: 12, color: 'var(--sq-text-muted)', lineHeight: 1.5 }}>
                        <b>Why Relevant:</b> {skill.relevance}
                      </p>
                    </div>

                    {/* Status Dropdown Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select
                        value={skill.status}
                        onChange={e => handleUpdateSkillStatus(skill, e.target.value as any)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: `1.5px solid ${
                            skill.status === 'completed'
                              ? '#2E7D32'
                              : skill.status === 'in_progress'
                              ? '#E65100'
                              : 'var(--sq-border-medium)'
                          }`,
                          background:
                            skill.status === 'completed'
                              ? '#E8F5E9'
                              : skill.status === 'in_progress'
                              ? '#FFF3E0'
                              : '#fff',
                          color:
                            skill.status === 'completed'
                              ? '#1B5E20'
                              : skill.status === 'in_progress'
                              ? '#E65100'
                              : 'var(--sq-text-muted)'
                        }}
                      >
                        <option value="not_started">○ Not Started</option>
                        <option value="in_progress">◐ In Progress</option>
                        <option value="completed">● Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {skill.prerequisites && skill.prerequisites.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--sq-text-light)' }}>
                      <b>Prerequisites:</b> {skill.prerequisites.join(' · ')}
                    </div>
                  )}

                  {/* Practical Exercise Box */}
                  <div
                    style={{
                      background: 'var(--sq-bg-base)',
                      borderRadius: 8,
                      border: '1px solid var(--sq-border-light)',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Terminal size={13} /> Practical Hands-On Exercise
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleExercise(skill)}
                        style={{
                          background: skill.exercise_completed ? '#E8F5E9' : '#fff',
                          color: skill.exercise_completed ? '#2E7D32' : 'var(--sq-text-muted)',
                          border: `1px solid ${skill.exercise_completed ? '#A5D6A7' : 'var(--sq-border-medium)'}`,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {skill.exercise_completed ? <Check size={12} /> : <Circle size={12} />}
                        {skill.exercise_completed ? 'Exercise Logged' : 'Mark Exercise Done'}
                      </button>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--sq-text-main)', lineHeight: 1.4 }}>
                      {skill.practicalExercise}
                    </div>
                  </div>

                  {/* Verified Learning Resources List */}
                  {skill.resources && skill.resources.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--sq-text-light)', fontWeight: 600 }}>
                        Learning Material:
                      </span>
                      {skill.resources.map(res => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#fff',
                            border: '1px solid var(--sq-border-medium)',
                            color: 'var(--sq-maroon)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 600
                          }}
                        >
                          <BookOpen size={12} />
                          {res.title}
                          <ExternalLink size={11} style={{ opacity: 0.6 }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Verified Learning Resource Catalog */}
      {activeSubTab === 'resources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: '#fff',
              border: '1px solid var(--sq-border-light)'
            }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              Curated Master Resource Catalog
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--sq-text-muted)' }}>
              Direct learning portals, interactive coding tracks, and documentation platforms verified for Year 2 undergraduate skill acquisition.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {MASTER_LEARNING_RESOURCES.map(res => (
              <div
                key={res.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '18px 20px',
                  border: '1px solid var(--sq-border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: '0 1px 4px rgba(75, 16, 40, 0.03)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="sq-tag" style={{ background: 'var(--sq-bg-base)', color: 'var(--sq-maroon)' }}>
                      {res.resourceType}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--sq-text-light)' }}>
                      Verified: {res.lastVerified}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
                    {res.title}
                  </h4>

                  <div style={{ fontSize: 11, color: 'var(--sq-text-muted)', marginBottom: 8 }}>
                    <b>Topic:</b> {res.topic} · <b>Difficulty:</b> {res.difficulty} · <b>Source:</b> {res.source}
                  </div>

                  {res.note && (
                    <div style={{ fontSize: 11, color: 'var(--sq-text-main)', background: 'var(--sq-bg-base)', padding: '8px 10px', borderRadius: 6, lineHeight: 1.4 }}>
                      {res.note}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--sq-border-light)', paddingTop: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: res.isFree ? 'var(--sq-success)' : 'var(--sq-warning)' }}>
                    {res.isFree ? '✓ 100% Free / Open Access' : 'Optional / Audit Mode Available'}
                  </span>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-secondary"
                    style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    Visit Portal <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Learn About Hackathons (Year 2 Guide) */}
      {activeSubTab === 'hackathons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '20px 24px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #FFF8F7 0%, #FFF 100%)',
              border: '1px solid var(--sq-border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sq-maroon)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              <Trophy size={14} /> Practical Experience Accelerator
            </div>
            <h3 style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
              The Undergraduate Hackathon Playbook for Second-Year Students
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--sq-text-muted)', maxWidth: 680 }}>
              Participating in collegiate hackathons is the single highest-return activity in Year 2. It transforms classroom theory into deployable GitHub repositories, proves rapid adaptability to technical recruiters, and develops communication under pressure.
            </p>
          </div>

          {/* Step-by-Step Hackathon Roadmap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {HACKATHON_GUIDE_STEPS.map(step => (
              <div
                key={step.stepNumber}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '20px 24px',
                  border: '1px solid var(--sq-border-light)',
                  boxShadow: '0 1px 4px rgba(75, 16, 40, 0.03)',
                  display: 'flex',
                  gap: 16
                }}
              >
                {/* Step Number Circle */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--sq-maroon)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {step.stepNumber}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon-dark)' }}>
                    {step.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--sq-text-muted)', lineHeight: 1.5 }}>
                    {step.summary}
                  </p>

                  {/* Checklist */}
                  <div style={{ background: 'var(--sq-bg-base)', padding: '12px 16px', borderRadius: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 6 }}>
                      Execution Checklist:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--sq-text-main)', lineHeight: 1.6 }}>
                      {step.actionableChecklist.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* External Resource Links */}
                  {step.resources && step.resources.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--sq-text-light)', fontWeight: 600 }}>Official Guides:</span>
                      {step.resources.map((r, idx) => (
                        <a
                          key={idx}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#fff',
                            border: '1px solid var(--sq-border-medium)',
                            color: 'var(--sq-maroon)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 600
                          }}
                        >
                          {r.name}
                          <ExternalLink size={11} style={{ opacity: 0.6 }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Dialog for Changing or Initializing Dream Company */}
      {showSelectorModal && (
        <DreamCompanySelectorModal
          initialPreferences={preferences}
          onSave={handleSavePreferences}
          onClose={() => setShowSelectorModal(false)}
        />
      )}
    </div>
  )
}
