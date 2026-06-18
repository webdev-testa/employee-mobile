import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <div className="min-h-screen bg-[#F0FAFF] flex items-center justify-center p-6 font-sans selection:bg-[#4DC8F5]/30">
      <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-sm border border-[#C8E8F5] p-8 lg:p-10">
        
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0D2D3D] text-white font-['Syne'] font-bold text-xl mb-4 tracking-tight">
            HR
          </div>
          <h1 className="font-['Syne'] text-[24px] font-bold tracking-tight text-[#1A3A4A]">HadiR Login</h1>
          <p className="text-[13.5px] text-[#4A7A8A] mt-1.5">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] text-[#4A7A8A] font-medium">Email address</label>
            <Input 
              type="email" 
              placeholder="nama@drmeow.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="h-10 rounded-[10px] text-[13.5px] border-[#C8E8F5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-[#4A7A8A] font-medium">Password</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-10 pl-3.5 pr-10 rounded-[10px] text-[13.5px] border-[#C8E8F5]"
              />
              <Button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                variant="ghost"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ABAC8] hover:text-[#4A7A8A] bg-transparent hover:bg-transparent border-none w-auto h-auto p-0 cursor-pointer shadow-none active:translate-y-[-50%]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-[#F5E8E4] border border-[#e8b4aa] text-[12.5px] text-[#F5A940]">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !email || !password}
            variant="orange"
            className="w-full h-10 mt-2 rounded-[10px] text-[13.5px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Log in'}
          </Button>
        </form>

      </div>
    </div>
  )
}