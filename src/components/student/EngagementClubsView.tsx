import { useState, useMemo, useEffect } from 'react'
import { Award, Users, Calendar, HeartHandshake, Bell, CheckCircle2, Building2, ExternalLink, Check } from 'lucide-react'
import type { StudentProfile } from '../../lib/api'
import { collegeService, type ClubNotification } from '../../lib/collegeService'

interface EngagementClubsViewProps {
  studentData: StudentProfile
}

export function EngagementClubsView({ studentData }: EngagementClubsViewProps) {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [selectedYearFilter] = useState<string>('all')

  const engagement = studentData.engagement || { events: 2, clubs: 1, hackathons: 0, certs: 1 }
  const totalScore = (engagement.events * 15) + (engagement.clubs * 20) + (engagement.hackathons * 35) + (engagement.certs * 30)

  // Registered clubs for this student
  const registeredClubs = useMemo(() => {
    return [
      { id: 'club-1', name: 'ACM Student Chapter', role: 'Technical Core Member', category: 'Computing & Research', joinedDate: 'August 2024', status: 'Active' },
      { id: 'club-2', name: 'ASCENDIQ Open Source Society', role: 'Peer Contributor', category: 'Software Development', joinedDate: 'January 2025', status: 'Active' },
    ]
  }, [])

  const enrolledClubIds = useMemo(() => registeredClubs.map(c => c.id), [registeredClubs])

  // Live club notifications
  const [notifications, setNotifications] = useState<ClubNotification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  

  useEffect(() => {
    let cancelled = false
    collegeService.getClubNotifications().then(all => {
      if (cancelled) return
      // Scope strictly to enrolled clubs only!
      const permitted = all.filter(n => enrolledClubIds.includes(n.club_id))
      setNotifications(permitted)
    })

    collegeService.getReadNotificationIds(studentData.student_id).then(rIds => {
      if (!cancelled) setReadIds(rIds)
    })

    return () => { cancelled = true }
  }, [studentData.student_id, enrolledClubIds])

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length
  }, [notifications, readIds])

  async function handleMarkRead(notifId: string) {
    await collegeService.markNotificationRead(studentData.student_id, notifId)
    setReadIds(prev => [...new Set([...prev, notifId])])
  }

  // Co-curricular activities and participation history
  const activities = useMemo(() => {
    return [
      { id: 'act-1', title: 'National Smart India Hackathon 2025', type: 'Hackathon', role: 'Team Lead / Full Stack Developer', date: '2025-09-15', year: 3, recognition: 'Regional Finalist', verified: true },
      { id: 'act-2', title: 'ACM International Collegiate Programming Contest (ICPC) Prelims', type: 'Coding Contest', role: 'Contestant', date: '2025-11-20', year: 3, recognition: 'Rank 42 (Zone)', verified: true },
      { id: 'act-3', title: 'Cloud Infrastructure & Kubernetes Hands-on Workshop', type: 'Workshop', role: 'Participant', date: '2026-02-10', year: 3, recognition: 'Certificate of Mastery', verified: true },
      { id: 'act-4', title: 'Freshers Mentorship & Peer Orientation Program', type: 'Volunteering', role: 'Student Volunteer Mentor', date: '2026-08-01', year: 4, recognition: 'Letter of Commendation', verified: true },
      { id: 'act-5', title: 'Annual Institution TechFest "Cognizance 2025"', type: 'Campus Event', role: 'Organizing Committee Lead', date: '2025-03-22', year: 2, recognition: 'Appreciation Certificate', verified: true },
    ]
  }, [])

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesType = selectedTypeFilter === 'all' || act.type.toLowerCase().includes(selectedTypeFilter.toLowerCase())
      const matchesYear = selectedYearFilter === 'all' || String(act.year) === selectedYearFilter
      return matchesType && matchesYear
    })
  }, [activities, selectedTypeFilter, selectedYearFilter])

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
            <Award size={15} /> Campus Life &amp; Leadership
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>
            Engagement, Societies &amp; Co-Curriculars
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
            Student club memberships, faculty announcements, hackathons, and campus leadership roles
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 12,
          padding: '8px 16px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: 10, color: 'var(--sq-pink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>Engagement Index</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{totalScore} Points</div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Active Club Memberships</span>
            <span className="sq-card-icon"><Users size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: 'var(--sq-maroon)' }}>
            {registeredClubs.length}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sq-text-light)' }}> societies</span>
          </div>
          <div className="sq-card-sub">
            <span>Verified student council affiliations</span>
          </div>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Society Notices</span>
            <span className="sq-card-icon"><Bell size={16} /></span>
          </div>
          <div className="sq-card-val" style={{ color: unreadCount > 0 ? '#b91c1c' : 'var(--sq-maroon)' }}>
            {notifications.length}
            {unreadCount > 0 && (
              <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 9999, marginLeft: 6, fontWeight: 800 }}>
                {unreadCount} Unread
              </span>
            )}
          </div>
          <div className="sq-card-sub">
            <span>Faculty advisor broadcasts</span>
          </div>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Workshops &amp; Events</span>
            <span className="sq-card-icon"><Calendar size={16} /></span>
          </div>
          <div className="sq-card-val">
            {engagement.events || 2}
          </div>
          <div className="sq-card-sub">
            <span>Peer learning and technical bootcamps</span>
          </div>
        </div>

        <div className="sq-summary-card">
          <div className="sq-card-header">
            <span className="sq-card-label">Volunteer Leadership</span>
            <span className="sq-card-icon"><HeartHandshake size={16} /></span>
          </div>
          <div className="sq-card-val">
            1
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sq-text-light)' }}> leadership role</span>
          </div>
          <div className="sq-card-sub">
            <span>Student Mentor &amp; TechFest Lead</span>
          </div>
        </div>
      </div>

      {/* Society Announcements & Notifications (Scoped to enrolled clubs) */}
      <div className="sq-panel">
        <div className="sq-panel-header">
          <div className="sq-panel-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3>Society Announcements &amp; Broadcasts</h3>
              {unreadCount > 0 && (
                <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999 }}>
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <small>Direct notices published by authorized faculty advisors for your clubs</small>
          </div>
        </div>

        {notifications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map(notif => {
              const isRead = readIds.includes(notif.id)
              return (
                <div
                  key={notif.id}
                  style={{
                    background: isRead ? 'var(--sq-bg-base)' : '#FFF8F7',
                    border: isRead ? '1px solid var(--sq-border-light)' : '1.5px solid var(--sq-maroon)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sq-rose-muted)', textTransform: 'uppercase' }}>
                          {notif.club_name}
                        </span>
                        {!isRead && (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 9999 }}>
                            UNREAD
                          </span>
                        )}
                      </div>
                      <h4 style={{ margin: '4px 0 2px', fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon)' }}>
                        {notif.title}
                      </h4>
                      <div style={{ fontSize: 11, color: 'var(--sq-text-muted)' }}>
                        Published by {notif.faculty_name} &bull; {new Date(notif.published_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!isRead ? (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          style={{
                            background: 'var(--sq-maroon)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Check size={12} /> Mark Read
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--sq-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} color="#15803d" /> Read
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: 'var(--sq-text)', lineHeight: 1.5 }}>
                    {notif.message}
                  </p>

                  {(notif.event_date || notif.location || notif.attachment_url) && (
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--sq-text-muted)', paddingTop: 6, borderTop: '1px solid var(--sq-border-light)', flexWrap: 'wrap' }}>
                      {notif.event_date && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} color="var(--sq-rose-muted)" /> Event: {notif.event_date}
                        </span>
                      )}
                      {notif.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={12} color="var(--sq-rose-muted)" /> Location: {notif.location}
                        </span>
                      )}
                      {notif.attachment_url && (
                        <a href={notif.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--sq-maroon)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={12} /> View Document
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--sq-text-muted)', background: 'var(--sq-bg-base)', borderRadius: 10 }}>
            No recent notices broadcast for your enrolled societies.
          </div>
        )}
      </div>

      {/* Registered Societies Grid */}
      <div className="sq-panel">
        <div className="sq-panel-header">
          <div className="sq-panel-title">
            <h3>Registered Student Organizations &amp; Chapters</h3>
            <small>Active institutional societies and student chapter affiliations</small>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {registeredClubs.map(club => (
            <div
              key={club.id}
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                background: 'var(--sq-bg-base)',
                border: '1px solid var(--sq-border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sq-rose-muted)', textTransform: 'uppercase' }}>
                    {club.category}
                  </span>
                  <h4 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--sq-maroon)' }}>
                    {club.name}
                  </h4>
                </div>
                <span className="sq-tag is-real">
                  {club.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--sq-text-muted)' }}>
                Role: <b style={{ color: 'var(--sq-maroon)' }}>{club.role}</b>
              </div>
              <div style={{ fontSize: 11, color: 'var(--sq-text-light)', borderTop: '1px solid var(--sq-border-light)', paddingTop: 6 }}>
                Affiliated since {club.joinedDate}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Co-Curricular & Hackathon Activity Log */}
      <div className="sq-panel">
        <div className="sq-panel-header">
          <div className="sq-panel-title">
            <h3>Co-Curricular History &amp; Campus Leadership</h3>
            <small>Hackathons, coding challenges, volunteer programs, and technical paper reviews</small>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--sq-border-light)', fontSize: 11, background: '#fff' }}
            >
              <option value="all">All Activity Types</option>
              <option value="hackathon">Hackathons</option>
              <option value="contest">Contests</option>
              <option value="workshop">Workshops</option>
              <option value="volunteering">Volunteering</option>
              <option value="campus event">Campus Events</option>
            </select>
          </div>
        </div>

        <div className="sq-table-wrap">
          <table className="sq-table">
            <thead>
              <tr>
                <th>Event / Activity Title</th>
                <th>Category</th>
                <th>Role Performed</th>
                <th>Date</th>
                <th>Year</th>
                <th>Recognition / Award</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map(act => (
                <tr key={act.id}>
                  <td><b>{act.title}</b></td>
                  <td>
                    <span className="sq-tag" style={{ background: 'var(--sq-bg-base)', color: 'var(--sq-maroon)', fontWeight: 600 }}>
                      {act.type}
                    </span>
                  </td>
                  <td>{act.role}</td>
                  <td>{act.date}</td>
                  <td>Year {act.year}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--sq-maroon)' }}>
                      {act.recognition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
