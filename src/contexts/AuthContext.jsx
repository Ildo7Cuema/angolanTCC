import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Refresh proactivo: verifica a cada 4 minutos se o JWT vai expirar em breve
    const refreshInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) return

      const expiresAt = currentSession.expires_at // unix timestamp (segundos)
      const now = Math.floor(Date.now() / 1000)
      // Se faltam menos de 5 minutos para expirar, fazer refresh agora
      if (expiresAt && expiresAt - now < 300) {
        await supabase.auth.refreshSession()
      }
    }, 4 * 60 * 1000) // 4 minutos

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  const signUp = async (email, password, fullName, familyMeta = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          father_name: familyMeta.fatherName || '',
          mother_name: familyMeta.motherName || '',
          other_relatives: familyMeta.otherRelatives || '',
        },
      },
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    // Record login event for access statistics (non-blocking, silent on error)
    if (!error && data?.user) {
      supabase
        .from('login_logs')
        .insert({ user_id: data.user.id })
        .then(() => {})
        .catch(() => {})
    }
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
