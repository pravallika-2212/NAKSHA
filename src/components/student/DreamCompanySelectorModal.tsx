import { useState, useMemo } from 'react'
import { Search, X, Check, Building, Briefcase, Calendar, Sparkles } from 'lucide-react'
import {
  SUGGESTED_COMPANIES,
  SUGGESTED_ROLES,
  TARGET_TIMEFRAMES,
  type DreamRoadmapPreferences
} from '../../lib/dreamRoadmap'

interface DreamCompanySelectorModalProps {
  initialPreferences?: DreamRoadmapPreferences | null
  onSave: (prefs: DreamRoadmapPreferences) => Promise<void>
  onClose: () => void
}

export function DreamCompanySelectorModal({
  initialPreferences,
  onSave,
  onClose
}: DreamCompanySelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>(
    initialPreferences?.company_name || 'Google'
  )
  const [customCompanyName, setCustomCompanyName] = useState<string>('')
  const [isCustomCompany, setIsCustomCompany] = useState<boolean>(false)

  const [selectedRole, setSelectedRole] = useState<string>(
    initialPreferences?.target_role || SUGGESTED_ROLES[0]
  )
  const [customRoleName, setCustomRoleName] = useState<string>('')
  const [isCustomRole, setIsCustomRole] = useState<boolean>(false)

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(
    initialPreferences?.target_timeframe || TARGET_TIMEFRAMES[0]
  )

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Filter suggested companies
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return SUGGESTED_COMPANIES
    const q = searchQuery.toLowerCase().trim()
    return SUGGESTED_COMPANIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.popularRoles.some(r => r.toLowerCase().includes(q))
    )
  }, [searchQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    const finalCompany = isCustomCompany
      ? customCompanyName.trim()
      : selectedCompany.trim()

    if (!finalCompany) {
      setErrorMessage('Please specify or select a target dream company.')
      return
    }

    const finalRole = isCustomRole
      ? customRoleName.trim()
      : selectedRole.trim()

    if (!finalRole) {
      setErrorMessage('Please specify or select a target engineering role.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        company_name: finalCompany,
        target_role: finalRole,
        target_timeframe: selectedTimeframe
      })
      onClose()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save roadmap preferences.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="sq-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dream-company-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(48, 8, 23, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
    >
      <div
        className="sq-modal-panel"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 680,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(75, 16, 40, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--sq-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FFF8F7 0%, #FFF 100%)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sq-maroon)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              <Sparkles size={14} /> Year 2 Career Milestone
            </div>
            <h2 id="dream-company-modal-title" style={{ margin: '4px 0 0', fontSize: 18, color: 'var(--sq-maroon-dark)', fontWeight: 800 }}>
              Which company would you like to work for, and what role are you targeting?
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--sq-text-muted)',
              padding: 6,
              borderRadius: 8
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {errorMessage && (
            <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
              {errorMessage}
            </div>
          )}

          {/* Section 1: Target Company */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 8 }}>
              <Building size={15} /> 1. Select or Enter Your Dream Company
            </label>

            {/* Custom Company Option Toggle */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setIsCustomCompany(false)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: !isCustomCompany ? '2px solid var(--sq-maroon)' : '1px solid var(--sq-border-light)',
                  background: !isCustomCompany ? 'var(--sq-bg-base)' : '#fff',
                  color: !isCustomCompany ? 'var(--sq-maroon)' : 'var(--sq-text-muted)'
                }}
              >
                Suggested Tech Leaders
              </button>
              <button
                type="button"
                onClick={() => setIsCustomCompany(true)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isCustomCompany ? '2px solid var(--sq-maroon)' : '1px solid var(--sq-border-light)',
                  background: isCustomCompany ? 'var(--sq-bg-base)' : '#fff',
                  color: isCustomCompany ? 'var(--sq-maroon)' : 'var(--sq-text-muted)'
                }}
              >
                Custom Company Name
              </button>
            </div>

            {isCustomCompany ? (
              <div>
                <input
                  type="text"
                  placeholder="e.g. Stripe, Atlassian, Oracle, Adobe, or your target startup..."
                  value={customCompanyName}
                  onChange={e => setCustomCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--sq-border-medium)',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                <small style={{ color: 'var(--sq-text-muted)', fontSize: 11, display: 'block', marginTop: 4 }}>
                  You can specify any company worldwide. ASCENDIQ will generate a personalized roadmap tailored to this employer.
                </small>
              </div>
            ) : (
              <div>
                {/* Search Box */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--sq-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search suggested employers (Google, Microsoft, Zoho, Cisco...)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: 8,
                      border: '1px solid var(--sq-border-light)',
                      fontSize: 12,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Company Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 10,
                    maxHeight: 180,
                    overflowY: 'auto',
                    padding: 2
                  }}
                >
                  {filteredCompanies.map(c => {
                    const isSelected = selectedCompany === c.name
                    return (
                      <div
                        key={c.name}
                        onClick={() => setSelectedCompany(c.name)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid var(--sq-maroon)' : '1px solid var(--sq-border-light)',
                          background: isSelected ? 'var(--sq-bg-base)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--sq-maroon-dark)' }}>{c.name}</span>
                          {isSelected && <Check size={14} style={{ color: 'var(--sq-maroon)' }} />}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--sq-rose-muted)', fontWeight: 600 }}>{c.tier}</span>
                        <span style={{ fontSize: 10, color: 'var(--sq-text-muted)' }}>{c.category}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Target Role */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 8 }}>
              <Briefcase size={15} /> 2. Select Your Target Role
            </label>

            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <select
                disabled={isCustomRole}
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--sq-border-medium)',
                  fontSize: 12,
                  background: isCustomRole ? '#f9f9f9' : '#fff'
                }}
              >
                {SUGGESTED_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsCustomRole(!isCustomRole)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  cursor: 'pointer',
                  border: isCustomRole ? '2px solid var(--sq-maroon)' : '1px solid var(--sq-border-light)',
                  background: isCustomRole ? 'var(--sq-bg-base)' : '#fff',
                  color: isCustomRole ? 'var(--sq-maroon)' : 'var(--sq-text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                {isCustomRole ? 'Use Dropdown' : '+ Custom Role'}
              </button>
            </div>

            {isCustomRole && (
              <input
                type="text"
                placeholder="e.g. Distributed Systems Engineer, Quantitative Dev, Mobile Engineer..."
                value={customRoleName}
                onChange={e => setCustomRoleName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--sq-border-medium)',
                  fontSize: 12,
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            )}
          </div>

          {/* Section 3: Target Timeframe */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--sq-maroon)', marginBottom: 6 }}>
              <Calendar size={15} /> 3. Target Preparation Timeframe (Optional)
            </label>
            <select
              value={selectedTimeframe}
              onChange={e => setSelectedTimeframe(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--sq-border-medium)',
                fontSize: 12,
                boxSizing: 'border-box'
              }}
            >
              {TARGET_TIMEFRAMES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--sq-bg-base)',
              border: '1px solid var(--sq-border-light)',
              fontSize: 11,
              color: 'var(--sq-text-main)',
              lineHeight: 1.5
            }}
          >
            <b>Non-Destructive Regeneration:</b> When you change your dream company or role, your completed skills and exercise logs in Data Structures, Programming Fundamentals, and Databases are <b>fully preserved</b>.
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--sq-border-light)'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid var(--sq-border-medium)',
                background: '#fff',
                color: 'var(--sq-text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--sq-maroon)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Sparkles size={14} />
              {isSubmitting ? 'Saving...' : 'Generate Personalized Roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
