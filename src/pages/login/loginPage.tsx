import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, loading: authLoading, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // if already logged in, redirect immediately
  useEffect(() => {
    if (!authLoading && user) {
      redirectByRole(user.role)
    }
  }, [user, authLoading])

  const redirectByRole = (role: string) => {
    const from = location.state?.from?.pathname
    if (from) {
      navigate(from, { replace: true })
      return
    }

    if (role === 'admin' || role === 'superadmin') {
      navigate('/employee/home', { replace: true })
    } else {
      navigate('/employee/home', { replace: true })
    }
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    try {
      console.log('LoginPage: 1. Initiating login with email:', email)
      const { error: loginError, data } = await login(email, password)
      console.log('LoginPage: 2. Login result:', { error: loginError, userId: data?.user?.id })

      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }

      // Check if the user has a profile in our public.users table
      if (data?.user) {
        console.log('LoginPage: 3. Querying profile for user ID:', data.user.id)
        const { data: profile, error: profileError } = await supabase
          .schema('hr')
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        console.log('LoginPage: 4. Profile query result:', { profile, profileError })

        if (!profile || profileError) {
          setError('Your account is missing a profile or role. Please contact the administrator.')
          await logout()
          setLoading(false)
          return
        }
        console.log('LoginPage: 5. Profile verification successful')
      }
    } catch (err: any) {
      console.error('LoginPage: 6. Exception occurred:', err)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background p-8 justify-center items-center text-center">
      <div className="mb-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-display font-bold text-2xl mb-6 shadow-lg shadow-primary/20">
          HR
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">HadiR Login</h1>
        <p className="text-muted-foreground">Sign in to your account to continue.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm text-left">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-foreground/80">Email Address</label>
          <input 
            type="email" 
            placeholder="nama@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-muted border border-transparent rounded-lg px-4 py-3 focus:border-primary focus:bg-background outline-none transition-all"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium mb-1.5 text-foreground/80">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-muted border border-transparent rounded-lg px-4 py-3 pr-10 focus:border-primary focus:bg-background outline-none transition-all"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-[13px] text-destructive">
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading || !email || !password}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3.5 font-medium mt-4 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </div>
  )
}