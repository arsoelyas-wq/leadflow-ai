'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/admin', icon: '🎯', label: 'Genel Bakış', exact: true },
  { group: 'KULLANICILAR' },
  { href: '/admin/users', icon: '👥', label: 'Kullanıcılar' },
  { href: '/admin/support', icon: '🎧', label: 'Destek & İletişim' },
  { href: '/admin/revenue', icon: '💰', label: 'Gelir & Finans' },
  { group: 'İÇERİK & UI' },
  { href: '/admin/content', icon: '🌍', label: 'Pazar Sayfaları' },
  { href: '/admin/content/banners', icon: '🎬', label: 'Banner & Video' },
  { href: '/admin/notifications', icon: '📢', label: 'Duyuru Gönder' },
  { href: '/admin/promo', icon: '🎁', label: 'Promo Kodları' },
  { group: 'ANALİTİK' },
  { href: '/admin/analytics', icon: '📊', label: 'Platform Analitik' },
  { href: '/admin/ai-costs', icon: '🤖', label: 'AI Maliyet Merkezi' },
  { group: 'SİSTEM' },
  { href: '/admin/churn', icon: '📉', label: 'Churn & Toplu İşlem' },
  { href: '/admin/reports', icon: '📤', label: 'Raporlar & Export' },
  { href: '/admin/system', icon: '⚙️', label: 'Sistem & Config' },
  { href: '/admin/flags', icon: '🚩', label: 'Feature Flags' },
  { href: '/admin/partners', icon: '🤝', label: 'Affiliate & Reseller' },
  { href: '/admin/security', icon: '🔐', label: 'Audit & Güvenlik' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminEmail, setAdminEmail] = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (pathname === '/admin/login') { setChecked(true); return }
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/admin/login'); return }
    setAdminEmail(localStorage.getItem('admin_email') || '')
    setChecked(true)
  }, [pathname])

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_email')
    router.push('/admin/login')
  }

  if (!checked || pathname === '/admin/login') {
    return (
      <div style={{ background: '#020712', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
        {children}
      </div>
    )
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || (pathname.startsWith(href + '/') && href !== '/admin')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020712', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* ── SIDEBAR ── */}
      <nav style={{
        width: 220, background: 'rgba(5,8,20,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>A</div>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>Admin OS</div>
              <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>LEADFLOW AI</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '8px 8px' }}>
          {NAV.map((item, i) => {
            if ('group' in item) return (
              <div key={i} style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#334155', padding: '14px 10px 4px' }}>
                {item.group}
              </div>
            )
            const active = isActive(item.href!, item.exact)
            return (
              <Link key={i} href={item.href!} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 8, textDecoration: 'none', marginBottom: 1,
                background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: active ? '#fca5a5' : '#64748b',
                fontSize: 13, fontWeight: active ? 600 : 400,
                boxShadow: active ? 'inset 0 0 0 1px rgba(239,68,68,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 11, color: '#334155', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{adminEmail}</div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>
            ↩ Çıkış Yap
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', minHeight: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
