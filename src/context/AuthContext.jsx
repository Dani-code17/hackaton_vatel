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

  /**
   * Inscription publique : passe par l'Edge Function `signup` (compte confirmé
   * immédiatement, service_role côté serveur). Repli sur l'API Auth standard si
   * la fonction n'est pas déployée. Seuls les rôles élève et parent sont acceptés.
   */
  const signUp = useCallback(async ({ email, password, fullName, role = 'eleve' }) => {
    const payload = {
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      role: role === 'parent' ? 'parent' : 'eleve',
    }

    const { data: created, error: functionError } = await supabase.functions.invoke('signup', {
      body: payload,
    })

    if (functionError || created?.error) {
      const message = created?.error ?? functionError?.message ?? ''
      const functionMissing = /not found|404|Failed to send/i.test(String(message))
      if (!functionMissing) throw new Error(message || 'Inscription impossible')

      const { error } = await supabase.auth.signUp({
        email: payload.email,
        password,
        options: { data: { full_name: payload.fullName, role: payload.role } },
      })
      if (error) throw error
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password,
    })
    if (signInError) throw signInError
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
      signUp,
      signOut,
      refresh,
    }),
    [session, profile, school, loading, signIn, signUp, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
