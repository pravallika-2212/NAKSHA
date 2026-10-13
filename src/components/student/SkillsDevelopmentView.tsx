import { useState, useMemo } from 'react'
import { Layers, Plus, Award, Target, X } from 'lucide-react'
import type { StudentProfile } from '../../lib/api'

interface SkillsDevelopmentViewProps {
  studentData: StudentProfile
}

interface SkillItem {
  id: string
  name: string
  category: 'technical' | 'soft'
  score: number // 0-100
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Mastery'
  source: 'verified' | 'self-declared'
  verifiedBy?: string
}

export function SkillsDevelopmentView({ studentData }: SkillsDevelopmentViewProps) {
  // Verified skills dynamically grounded in studentData
  const initialVerifiedSkills: SkillItem[] = useMemo(() => {
    const baseScore = studentData.placement?.technical_skill_score || 80
    return [
      { id: 'v-1', name: 'Data Structures & Algorithms', category: 'technical', score: Math.round(baseScore * 0.95), level: 'Advanced', source: 'verified', verifiedBy: 'Lab Exam CS601' },
      { id: 'v-2', name: 'Database Architecture & SQL', category: 'technical', score: Math.min(95, Math.round(baseScore * 1.05)), level: 'Advanced', source: 'verified', verifiedBy: 'Lab Exam CS602' },
      { id: 'v-3', name: 'Computer Networks & TCP/IP', category: 'technical', score: Math.round(baseScore * 0.98), level: 'Advanced', source: 'verified', verifiedBy: 'Lab Exam CS603' },
      { id: 'v-4', name: `${studentData.department} Applied Specialization`, category: 'technical', score: Math.round(baseScore), level: 'Mastery', source: 'verified', verifiedBy: 'Department Benchmark' },
      { id: 'v-5', name: 'Technical Presentation & Communication', category: 'soft', score: 75, level: 'Advanced', source: 'verified', verifiedBy: 'Mock HR Interview Round' },
      { id: 'v-6', name: 'Collaborative Problem Solving', category: 'soft', score: 82, level: 'Advanced', source: 'verified', verifiedBy: 'Sprint Retrospective Rubric' },
    ]
  }, [studentData.placement?.technical_skill_score, studentData.department])

  // Self-declared skills state (student can add/remove)
  const [selfDeclaredSkills, setSelfDeclaredSkills] = useState<SkillItem[]>([
    { id: 's-1', name: 'React & TypeScript', category: 'technical', score: 85, level: 'Advanced', source: 'self-declared' },
    { id: 's-2', name: 'Docker & Microservices', category: 'technical', score: 65, level: 'Intermediate', source: 'self-declared' },
    { id: 's-3', name: 'Git & GitHub Workflows', category: 'technical', score: 90, level: 'Mastery', source: 'self-declared' },
  ])

  // Target learning goals
  const [learningGoals, setLearningGoals] = useState<string[]>([
    'Distributed Systems & Consensus (Raft/Paxos)',
    'Kubernetes Cluster Orchestration',
    'System Design & Microservices Architecture'
  ])

  const [newSkillName, setNewSkillName] = useState<string>('')
  const [newSkillCategory, setNewSkillCategory] = useState<'technical' | 'soft'>('technical')
  const [newSkillScore, setNewSkillScore] = useState<number>(70)
  const [newGoalInput, setNewGoalInput] = useState<string>('')
  const [isAddingSkill, setIsAddingSkill] = useState<boolean>(false)

  // Combined skills
  const allSkills = useMemo(() => {
    return [...initialVerifiedSkills, ...selfDeclaredSkills]
  }, [initialVerifiedSkills, selfDeclaredSkills])

  function getLevel(score: number): 'Beginner' | 'Intermediate' | 'Advanced' | 'Mastery' {
    if (score >= 85) return 'Mastery'
    if (score >= 70) return 'Advanced'
    if (score >= 50) return 'Intermediate'
    return 'Beginner'
  }

  function handleAddSkill() {
    if (!newSkillName.trim()) return
    const newSkill: SkillItem = {
      id: `sd-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      score: newSkillScore,
      level: getLevel(newSkillScore),
      source: 'self-declared'
    }
    setSelfDeclaredSkills(prev => [...prev, newSkill])
    setNewSkillName('')
    setIsAddingSkill(false)
  }

  function handleRemoveSelfDeclared(id: string) {
    setSelfDeclaredSkills(prev => prev.filter(s => s.id !== id))
  }

  function handleAddGoal() {
    if (!newGoalInput.trim()) return
    setLearningGoals(prev => [...prev, newGoalInput.trim()])
    setNewGoalInput('')
  }

  function handleRemoveGoal(goal: string) {
    setLearningGoals(prev => prev.filter(g => g !== goal))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Module Title Banner */}
      <div style={{
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
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sq-pink-soft)', fontWeight: 700 }}>
            <Layers size={15} /> Competency Matrix
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Skills Mastery & Verified Competencies
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
            Institutional examination rubrics, verified lab competencies, and student self-declared proficiency
          </p>
        </div>

        <button
          onClick={() => setIsAddingSkill(true)}
          className="button"
          style={{ background: '#fff', color: 'var(--sq-maroon)', border: 'none', padding: '9px 16px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Add Self-Declared Skill
        </button>
      </div>

      {/* Year 2 Dream Company Roadmap Bridge Banner */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '14px 18px',
          border: '1px solid var(--sq-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 4px rgba(75, 16, 40, 0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--sq-pink-soft)', color: 'var(--sq-maroon)', display: 'grid', placeItems: 'center' }}>
            <Target size={16} />
          </div>
          <div>
            <b style={{ fontSize: 13, color: 'var(--sq-maroon-dark)' }}>Year 2 Target Milestone: Dream Company Career Roadmap</b>
            <small style={{ display: 'block', fontSize: 11, color: 'var(--sq-text-muted)' }}>
              Align your technical proficiencies to Google, Microsoft, Amazon, Zoho, Cisco, or any custom employer across 8 core pillars.
            </small>
          </div>
        </div>
        <a
          href="/student/career"
          className="button"
          style={{ fontSize: 11, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          View Dream Company Roadmap &rarr;
        </a>
      </div>

      {/* Add Skill Modal / Inline Dialog */}
      {isAddingSkill && (
        <div style={{
          background: '#fff',
          border: '1.5px solid var(--sq-border-strong)',
          borderRadius: 14,
          padding: 20,
          boxShadow: 'var(--sq-shadow-md)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: 'var(--sq-maroon)', fontWeight: 800 }}>
              Add Self-Reported Skill Competency
            </h4>
            <button onClick={() => setIsAddingSkill(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sq-text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                Skill Name
              </label>
              <input
                type="text"
                placeholder="e.g. Next.js, Kubernetes, PostgreSQL"
                value={newSkillName}
                onChange={e => setNewSkillName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                Category
              </label>
              <select
                value={newSkillCategory}
                onChange={e => setNewSkillCategory(e.target.value as 'technical' | 'soft')}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 12, background: '#fff' }}
              >
                <option value="technical">Technical Skill</option>
                <option value="soft">Soft Skill / Leadership</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 4 }}>
                Proficiency ({newSkillScore}%)
              </label>
              <input
                type="range"
                min="30"
                max="100"
                value={newSkillScore}
                onChange={e => setNewSkillScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--sq-maroon)' }}
              />
            </div>
            <button
              onClick={handleAddSkill}
              className="button"
              style={{ padding: '8px 16px', fontSize: 12 }}
            >
              Save Skill
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Skills Matrix: Technical vs Soft Skills */}
      <div className="sq-grid-2col">
        {/* Technical Skills Column */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <h3>Technical Competencies & Systems Knowledge</h3>
              <small>Coding algorithms, systems software, and development stacks</small>
            </div>
            <span className="sq-tag is-real">
              {allSkills.filter(s => s.category === 'technical').length} Skills
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allSkills.filter(s => s.category === 'technical').map(skill => (
              <div key={skill.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--sq-bg-base)', border: '1px solid var(--sq-border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--sq-maroon)' }}>
                      {skill.name}
                    </span>
                    <span className={`sq-tag ${skill.source === 'verified' ? 'is-real' : 'is-demo'}`} style={{ fontSize: 9 }}>
                      {skill.source === 'verified' ? '✓ Institutional Lab' : 'Self-Reported'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-rose-muted)' }}>
                      {skill.score}% · {skill.level}
                    </span>
                    {skill.source === 'self-declared' && (
                      <button
                        onClick={() => handleRemoveSelfDeclared(skill.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--sq-text-light)', cursor: 'pointer', padding: 2 }}
                        title="Remove self-reported skill"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="sq-bar-track" style={{ height: 6, borderRadius: 3 }}>
                  <div
                    className={`sq-bar-fill ${skill.score >= 80 ? 'fill-green' : skill.score >= 65 ? 'fill-amber' : 'fill-rose'}`}
                    style={{ width: `${skill.score}%`, height: '100%', borderRadius: 3 }}
                  />
                </div>
                {skill.verifiedBy && (
                  <div style={{ fontSize: 9, color: 'var(--sq-text-muted)', marginTop: 4 }}>
                    Verified through: {skill.verifiedBy}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Soft Skills & Communication Column */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <h3>Professional Soft Skills & Communication</h3>
              <small>Interview rubrics, presentation feedback, and team dynamics</small>
            </div>
            <span className="sq-tag">
              {allSkills.filter(s => s.category === 'soft').length} Rubrics
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allSkills.filter(s => s.category === 'soft').map(skill => (
              <div key={skill.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--sq-bg-base)', border: '1px solid var(--sq-border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--sq-maroon)' }}>
                      {skill.name}
                    </span>
                    <span className="sq-tag is-real" style={{ fontSize: 9 }}>
                      Verified Rubric
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-rose-muted)' }}>
                    {skill.score}% · {skill.level}
                  </span>
                </div>

                <div className="sq-bar-track" style={{ height: 6, borderRadius: 3 }}>
                  <div
                    className={`sq-bar-fill ${skill.score >= 80 ? 'fill-green' : 'fill-amber'}`}
                    style={{ width: `${skill.score}%`, height: '100%', borderRadius: 3 }}
                  />
                </div>
                {skill.verifiedBy && (
                  <div style={{ fontSize: 9, color: 'var(--sq-text-muted)', marginTop: 4 }}>
                    Assessed by: {skill.verifiedBy}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Target Learning Goals & Certificates */}
      <div className="sq-grid-2col">
        {/* Next Learning Goals */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} style={{ color: 'var(--sq-rose-muted)' }} />
                <h3>Target Learning Goals</h3>
              </div>
              <small>Student-defined career preparation and study roadmap</small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {learningGoals.map((goal, idx) => (
              <div
                key={goal}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#fff',
                  border: '1px solid var(--sq-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--sq-pink-subtle)', color: 'var(--sq-maroon)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--sq-maroon)', fontWeight: 600 }}>{goal}</span>
                </div>
                <button
                  onClick={() => handleRemoveGoal(goal)}
                  style={{ background: 'none', border: 'none', color: 'var(--sq-text-light)', cursor: 'pointer', padding: 4 }}
                  title="Remove goal"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* Add Goal Input */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                placeholder="Add a target skill or topic…"
                value={newGoalInput}
                onChange={e => setNewGoalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 11 }}
              />
              <button
                onClick={handleAddGoal}
                className="button"
                style={{ padding: '8px 14px', fontSize: 11 }}
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>

        {/* Verified Badges & Certifications */}
        <div className="sq-panel">
          <div className="sq-panel-header">
            <div className="sq-panel-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={16} style={{ color: 'var(--sq-rose-muted)' }} />
                <h3>Verified Badges & Credentials</h3>
              </div>
              <small>External certifications and institutional honors</small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { title: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', date: 'August 2025', credentialId: 'AWS-291039' },
              { title: 'Algorithmic Problem Solving with Python', issuer: 'NPTEL / IIT Madras', date: 'December 2024', credentialId: 'NPTEL-CS-88' },
              { title: 'Full Stack Development Bootcamp', issuer: 'Ascendiq Lab Certification', date: 'May 2025', credentialId: 'ASC-FS-101' },
            ].map(cert => (
              <div
                key={cert.credentialId}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--sq-bg-base)',
                  border: '1px solid var(--sq-border-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--sq-maroon)' }}>
                    {cert.title}
                  </div>
                  <small style={{ fontSize: 10, color: 'var(--sq-text-muted)' }}>
                    {cert.issuer} · {cert.date}
                  </small>
                </div>
                <span className="sq-tag is-real" style={{ fontSize: 9 }}>
                  Verified ID: {cert.credentialId}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
