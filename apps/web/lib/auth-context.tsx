'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { api } from './api'

interface User {
  id: string
  email: string
  name?: string
  company?: string
  sector?: string
  planType: string
  creditsTotal: number
  creditsUsed: number
  onboardingDone?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; name: string; company: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

const PUBLIC_PATHS = ['/login', '/register', '/onboarding']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/api/auth/me')
        .then(data => {
          setUser(data.user)
          // Onboarding tamamlanmamışsa yönlendir
          if (!data.user?.onboardingDone && !PUBLIC_PATHS.includes(pathname || '')) {
            router.push('/onboarding')
          }
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    // Login sonrası onboarding kontrolü
    if (!data.user?.onboardingDone) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  const register = async (formData: { email: string; password: string; name: string; company: string }) => {
    const data = await api.post('/api/auth/register', formData)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    // Yeni kayıt — onboarding'e gönder
    router.push('/onboarding')
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)