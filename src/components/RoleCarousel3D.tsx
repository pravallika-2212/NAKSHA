import { useState } from 'react'
import { GraduationCap, Users, Briefcase, ArrowRight } from 'lucide-react'

export function RoleCarousel3D() {
  const [activeIdx, setActiveIdx] = useState(1) // Default to Faculty

  const roles = [
    {
      id: 'student',
      title: 'Student Portal',
      subtitle: 'Self-Progress & Skills',
      icon: GraduationCap,
      description: 'Explore your personal Student Success Score breakdown, attendance status, coursework milestones, and constructive improvement actions.',
      href: '/student',
      badge: 'Personal Growth'
    },
    {
      id: 'faculty',
      title: 'Faculty & Mentors',
      subtitle: 'Early Warning & Interventions',
      icon: Users,
      description: 'Identify at-risk students through transparent rule-based indicators, inspect multidimensional evidence, assign interventions, and monitor progress over time.',
      href: '/faculty',
      badge: 'Decision Intelligence'
    },
    {
      id: 'placement',
      title: 'College Leadership & TPO',
      subtitle: 'Cohort Readiness & Audit',
      icon: Briefcase,
      description: 'Analyze institution-wide readiness distributions, technical skill gaps, company benchmark segments, and data-provenance audits.',
      href: '/admin',
      badge: 'Strategic Analytics'
    }
  ]

  return (
    <div className="role-carousel-container" aria-label="3D Role Selection Carousel">
      <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 14 }}>
        <span /> SELECT YOUR WORKSPACE
      </div>
      <div className="role-carousel-track">
        {roles.map((role, idx) => {
          const Icon = role.icon
          const isActive = idx === activeIdx
          return (
            <article
              key={role.id}
              className={`role-card-3d ${isActive ? 'active-card' : ''}`}
              onClick={() => setActiveIdx(idx)}
              style={{
                transform: isActive
                  ? 'translateY(-10px) scale(1.05)'
                  : idx < activeIdx
                  ? 'rotateY(8deg) scale(0.96)'
                  : 'rotateY(-8deg) scale(0.96)',
                zIndex: isActive ? 10 : 2
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="role-card-icon">
                    <Icon size={24} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted-rose)', background: 'var(--soft-cloud)', padding: '3px 8px', borderRadius: 12 }}>
                    {role.badge}
                  </span>
                </div>
                <div className="role-card-subtitle">{role.subtitle}</div>
                <h3 className="role-card-title">{role.title}</h3>
                <p className="role-card-desc">{role.description}</p>
              </div>

              <div>
                <a className="role-card-action" href={role.href}>
                  Enter Workspace <ArrowRight size={15} />
                </a>
              </div>
            </article>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
        {roles.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              width: i === activeIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: i === activeIdx ? 'var(--baby-pink)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            aria-label={`Select ${roles[i].title}`}
          />
        ))}
      </div>
    </div>
  )
}
