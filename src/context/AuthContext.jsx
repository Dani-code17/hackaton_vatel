import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setSchool(null)
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Chargement du profil impossible', error)
      setProfile(null)
      setSchool(null)
      return null
    }

    setProfile(data)

    if (data?.school_id) {
      const { data: schoolRow } = await supabase
        .from('schools')
        .select('id, name, model, meal_price, city')
        .eq('id', data.school_id)
        .maybeSingle()
      setSchool(schoolRow ?? null)
    } else {
      setSchool(null)
    }

    return data
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await loadProfile(nextSession?.user?.id)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refresh = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id)
  }, [loadProfile, session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      school,
      loading,
      signIn,
      signOut,
      refresh,
    }),
    [session, profile, school, loading, signIn, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
