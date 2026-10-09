import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>
  logout: () => ReturnType<typeof supabase.auth.signOut>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (authUserId: string) => {
      try {
        console.log('[useAuth] 1. Initiating profile fetch for:', authUserId)
        const { data, error } = await supabase
          .schema('hr')
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .single()
        
        console.log('[useAuth] 2. Profile fetch result:', { data, error })
        
        if (error) {
          console.error('[useAuth] 3. Fetch profile query error:', error)
          throw error
        }
        
        if (data) {
          localStorage.setItem(`profile_${authUserId}`, JSON.stringify(data))
          if (mounted) setUser(data)
          return data
        }
        return null
      } catch (err) {
        console.error('[useAuth] 4. Fetch profile exception:', err)
        const cached = localStorage.getItem(`profile_${authUserId}`)
        console.log('[useAuth] 5. Fallback to cache:', cached)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (mounted) setUser(parsed)
          return parsed
        }
        if (mounted) setUser(prev => prev ? prev : null)
        return null
      }
    }

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user) {
          // Check for cached profile first to avoid UI blocking if network is slow
          const cached = localStorage.getItem(`profile_${data.session.user.id}`)
          if (cached) {
            setUser(JSON.parse(cached))
          }
          await fetchProfile(data.session.user.id)
        } else {
          if (mounted) setUser(null)
        }
      } catch (err) {
        console.error('Init session error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return
        if (session?.user) {
          // Trigger profile fetch in background (non-blocking) to avoid auth deadlock
          fetchProfile(session.user.id).catch((err) => {
            console.error('onAuthStateChange profile fetch failed:', err)
          })
        } else {
          if (mounted) setUser(null)
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}