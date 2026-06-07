'use client'
import { useEffect, useState } from 'react'
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
  const [isImpersonating, setIsImpersonating] = useState(false)

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
      <Sidebar />

      <div style={{
        flex: 1,
        marginLeft: 232,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
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
          justifyContent: 'flex-end',
          padding: '10px 32px',
          background: 'rgba(248,250,252,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          gap: 8,
        }}>
          <TopBar />
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
    </div>
  )
}
