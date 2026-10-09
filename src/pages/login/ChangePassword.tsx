import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Loader2, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password minimal harus 6 karakter')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi telah berakhir, silakan login kembali.')

      // 2. Update the password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      })
      if (authError) throw authError

      // 3. Update the must_change_password column in hr.users
      const { error: dbError } = await supabase
        .schema('hr')
        .from('users')
        .update({ must_change_password: false })
        .eq('id', user.id)

      if (dbError) throw dbError

      // 4. Force a reload of the profile in localStorage/Auth state
      const { data: profile } = await supabase
        .schema('hr')
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profile) {
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profile))
      }

      toast.success('Password berhasil diperbarui!')
      // Redirect to home page
      window.location.href = '/employee/home'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui password')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F0FAFF] flex items-center justify-center p-6 font-sans selection:bg-[#4DC8F5]/30">
      <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-sm border border-[#C8E8F5] p-8 lg:p-10">
        
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F5A940]/10 text-[#F5A940] mb-4">
            <Key size={24} />
          </div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-[#1A3A4A]">Atur Password Baru</h1>
          <p className="text-[13px] text-[#4A7A8A] mt-2 leading-relaxed">
            Demi keamanan akun Anda, silakan ubah password sementara Anda sebelum melanjutkan.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] text-[#4A7A8A] font-medium">Password Baru</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Masukkan password baru"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 pl-3.5 pr-10 rounded-[10px] text-[13.5px] border-[#C8E8F5]"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ABAC8] hover:text-[#4A7A8A] bg-transparent border-none cursor-pointer p-0"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-[#4A7A8A] font-medium">Konfirmasi Password Baru</label>
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="h-10 rounded-[10px] text-[13.5px] border-[#C8E8F5]"
            />
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-[#F5E8E4] border border-[#e8b4aa] text-[12.5px] text-[#F5A940]">
              {error}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Button 
              type="submit" 
              disabled={loading || !password || !confirmPassword}
              variant="orange"
              className="w-full h-10 rounded-[10px] text-[13.5px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center bg-[#F5A940] text-white hover:bg-[#d58925]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Simpan & Masuk'}
            </Button>

            <Button 
              type="button"
              onClick={handleLogout}
              variant="ghost"
              className="w-full h-10 rounded-[10px] text-[13.5px] text-[#8ABAC8] hover:text-[#4A7A8A] bg-transparent border-none hover:bg-[#F0FAFF]"
            >
              Kembali ke Login
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
