'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { useIsMobile } from '@/hooks/useMediaQuery'
import Sidebar from '../../components/Sidebar'
import TopBar from '../../components/TopBar'
import PWAInstallBanner from '../../components/PWAInstallBanner'
import DashboardSupportChat from '../../components/DashboardSupportChat'
import MobileBottomNav from '../../components/MobileBottomNav'
import { LifeBuoy, Menu } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { lang } = useI18n()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setIsImpersonating(localStorage.getItem('is_impersonating') === 'true')
  }, [])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '2.5px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'ls-spin .7s linear infinite',
        }}/>
        <style>{`@keyframes ls-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
    }}>
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 232,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* Admin impersonation banner */}
        {isImpersonating && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            padding: '8px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              🔴 ADMIN MOD: {user?.email} olarak giriş yapıldı
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('is_impersonating')
                localStorage.removeItem('token')
                window.location.href = '/admin/users'
              }}
              style={{
                padding: '4px 12px', borderRadius: 7,
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#dc2626', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Admin&apos;e Dön
            </button>
          </div>
        )}

        {/* Sticky TopBar */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '10px 16px' : '10px 32px',
          background: 'rgba(248,250,252,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          gap: 8,
        }}>
          {/* Hamburger — sadece mobil */}
          {isMobile ? (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 40, height: 40, borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, color: '#475569',
                fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <Menu size={18} />
            </button>
          ) : <div />}

          {/* Sağ aksiyonlar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Support button */}
            <button
              onClick={() => setSupportOpen(v => !v)}
              title="Destek"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: isMobile ? '8px 10px' : '5px 10px',
                borderRadius: 8, cursor: 'pointer',
                border: supportOpen ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                background: supportOpen ? '#eff6ff' : '#ffffff',
                color: supportOpen ? '#1d4ed8' : '#475569',
                fontSize: 12, fontWeight: 500,
                transition: 'all 0.15s', fontFamily: 'inherit',
                boxShadow: supportOpen ? '0 0 0 3px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <LifeBuoy size={13} style={{ opacity: 0.8 }} />
              {!isMobile && <span>Destek</span>}
            </button>
            <TopBar />
          </div>
        </div>

        {/* Main content */}
        <main
          className="dash-main"
          style={{ flex: 1, padding: '28px 32px', overflowX: 'hidden' }}
          lang={lang}
        >
          {children}
        </main>
      </div>

      <PWAInstallBanner />
      {isMobile && (
        <MobileBottomNav onMenuOpen={() => setSidebarOpen(true)} />
      )}

      {/* Dashboard support chat panel */}
      {supportOpen && user && (
        <DashboardSupportChat
          user={user}
          onClose={() => setSupportOpen(false)}
        />
      )}
    </div>
  )
}
