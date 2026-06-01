'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import Sidebar from '../../components/Sidebar'
import TopBar from '../../components/TopBar'
import PWAInstallBanner from '../../components/PWAInstallBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { lang } = useI18n()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#060a14', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:32, height:32, border:'2px solid #3b82f6', borderTopColor:'transparent', borderRadius:'50%', animation:'ls-spin .8s linear infinite' }}/>
        <style>{`@keyframes ls-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ minHeight:'100vh', background:'#060a14', display:'flex' }}>
      <Sidebar />

      <div style={{ flex:1, marginLeft:248, display:'flex', flexDirection:'column', minHeight:'100vh' }}>

        {/* ── ÜSTTEKI BAR: Ülke & Dil ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '10px 28px',
          background: 'rgba(6,10,20,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          gap: 8,
        }}>
          <TopBar />
        </div>

        {/* ── SAYFA İÇERİĞİ ── */}
        <main style={{ flex:1, padding:'24px 28px', overflowX:'hidden' }} lang={lang}>
          {children}
        </main>
      </div>

      <PWAInstallBanner />
    </div>
  )
}
