import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'

// Demo users for quick login
const demoUsers = [
  { username: 'admin', password: 'admin123', role: 'Süper Admin', color: 'nox' },
  { username: 'muhasebe', password: 'muhasebe123', role: 'Muhasebe', color: 'blue' },
  { username: 'satis', password: 'satis123', role: 'Satış', color: 'purple' },
  { username: 'viewer', password: 'viewer123', role: 'Görüntüleyici', color: 'orange' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, checkAuth } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    checkAuth()
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate, checkAuth])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username || !password) {
      toast.error('Kullanıcı adı ve şifre gerekli')
      return
    }
    
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    
    if (result.success) {
      toast.success('Giriş başarılı!')
      navigate('/')
    } else {
      toast.error(result.error)
    }
  }
  
  const handleDemoLogin = (user) => {
    setUsername(user.username)
    setPassword(user.password)
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-nox-900/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-dark-800/20 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-nox-900/50 border border-nox-800 mb-4">
            <span className="text-4xl font-bold text-nox-400">N</span>
          </div>
          <h1 className="text-3xl font-bold text-dark-50">NOX ERP</h1>
          <p className="text-dark-400 mt-2">Kurumsal Kaynak Planlama Sistemi</p>
        </div>
        
        {/* Login form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Kullanıcı Adı</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-11"
                  placeholder="Kullanıcı adınızı girin"
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div>
              <label className="label">Şifre</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-11 pr-11"
                  placeholder="Şifrenizi girin"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPassword ? (
                    <HiOutlineEyeOff className="w-5 h-5" />
                  ) : (
                    <HiOutlineEye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
          
          {/* Demo users */}
          <div className="mt-8 pt-6 border-t border-dark-800">
            <p className="text-sm text-dark-500 text-center mb-4">
              Demo Kullanıcılar (tıklayarak doldurun)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((user) => (
                <button
                  key={user.username}
                  onClick={() => handleDemoLogin(user)}
                  className="p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 border border-dark-700 
                           transition-all duration-200 text-left group"
                >
                  <p className="text-sm font-medium text-dark-200 group-hover:text-dark-50">
                    {user.username}
                  </p>
                  <p className="text-xs text-dark-500">{user.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-dark-500 text-sm mt-6">
          © 2024 NOX ERP. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  )
}

