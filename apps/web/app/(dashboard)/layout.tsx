'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar from '../../components/Sidebar'
import TopBar from '../../components/TopBar'
import PWAInstallBanner from '../../components/PWAInstallBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#060a14', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:32, height:32, border:'2px solid #3b82f6', borderTopColor:'transparent', borderRadius:'50%', animation:'ls-spin 0.8s linear infinite' }}/>
        <style>{`@keyframes ls-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ minHeight:'100vh', background:'#060a14', display:'flex' }}>
      <Sidebar />

      {/* Ülke & Dil seçici — sağ üst, her sayfada görünür */}
      <div style={{ position:'fixed', top:14, right:20, zIndex:50, display:'flex', alignItems:'center', gap:8 }}>
        <TopBar />
      </div>

      <main style={{ flex:1, marginLeft:248, padding:'28px 32px', overflowX:'hidden', minHeight:'100vh' }}>
        {children}
      </main>

      <PWAInstallBanner />
    </div>
  )
}
