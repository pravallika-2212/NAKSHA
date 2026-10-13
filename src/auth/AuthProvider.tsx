import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = { session: Session | null; loading: boolean; configured: boolean }
const AuthContext = createContext<AuthState>({ session: null, loading: false, configured: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setLoading(false) }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (!error) setSession(data.session)
      setLoading(false)
    }).catch(() => { if (active) setLoading(false) })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const value = useMemo(() => ({ session, loading, configured: Boolean(supabase) }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
