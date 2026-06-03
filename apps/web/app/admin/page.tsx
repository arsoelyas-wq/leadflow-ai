'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface Overview {
  users: { total: number; new_this_week: number; by_plan: Record<string, number> }
  leads: { total: number }
  campaigns: { total: number }
  messages: { total: number }
  errors_24h: number
}

const PLAN_COLOR: Record<string, string> = { starter: '#64748b', growth: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b' }
const card: React.CSSProperties = { background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 22 }

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.overview(), adminApi.revenue()])
      .then(([o, r]) => { setData(o); setRevenue(r) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Kullanıcı', value: data?.users.total || 0, sub: `+${data?.users.new_this_week || 0} bu hafta`, icon: '👥', color: '#3b82f6' },
    { label: 'Toplam Lead', value: (data?.leads.total || 0).toLocaleString(), sub: 'Tüm hesaplar', icon: '🎯', color: '#10b981' },
    { label: 'Kampanya', value: data?.campaigns.total || 0, sub: 'Oluşturulan', icon: '📢', color: '#8b5cf6' },
    { label: 'Mesaj', value: (data?.messages.total || 0).toLocaleString(), sub: 'WhatsApp+Email', icon: '💬', color: '#06b6d4' },
    { label: 'MRR', value: `₺${(revenue?.mrr || 0).toLocaleString()}`, sub: 'Aylık gelir', icon: '💰', color: '#f59e0b' },
    { label: '24s Hata', value: data?.errors_24h || 0, sub: 'API hatası', icon: '⚠️', color: data?.errors_24h ? '#ef4444' : '#334155' },
  ]

  const quickLinks = [
    { label: '👥 Tüm Kullanıcılar', href: '/admin/users', color: '#3b82f6' },
    { label: '🎬 Banner Yönetici', href: '/admin/content/banners', color: '#f59e0b' },
    { label: '📢 Duyuru Gönder', href: '/admin/notifications', color: '#10b981' },
    { label: '📊 Analitik', href: '/admin/analytics', color: '#8b5cf6' },
    { label: '⚙️ Sistem Config', href: '/admin/system', color: '#64748b' },
    { label: '🎁 Promo Kodları', href: '/admin/promo', color: '#f97316' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.025em' }}>🛡️ Admin Overview</h1>
        <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: loading ? 20 : 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 3px' }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: '#334155' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Plan distribution */}
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>📊 Plan Dağılımı</h3>
          {loading ? <div style={{ color: '#334155' }}>Yükleniyor...</div> : (
            Object.entries(data?.users.by_plan || {}).map(([plan, count]) => {
              const pct = data!.users.total ? Math.round((count / data!.users.total) * 100) : 0
              return (
                <div key={plan} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, textTransform: 'capitalize' }}>{plan}</span>
                    <span style={{ color: '#64748b' }}>{count} kullanıcı · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: PLAN_COLOR[plan] || '#64748b', borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })
          )}
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 700 }}>ARR Tahmini</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 2 }}>₺{((revenue?.arr || 0)).toLocaleString()}/yıl</div>
          </div>
        </div>

        {/* Quick links */}
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>⚡ Hızlı Erişim</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {quickLinks.map(item => (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', padding: '11px 14px', borderRadius: 10,
                textDecoration: 'none', fontSize: 12, fontWeight: 600, color: '#94a3b8',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.15s', gap: 6,
              }}>
                {item.label}
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠️ DİKKAT: Supabase Migration</div>
            <div style={{ color: '#475569', fontSize: 11, lineHeight: 1.6 }}>
              Admin tablolarını oluşturmak için <strong style={{ color: '#94a3b8' }}>services/api/src/migrations/create_admin_tables.sql</strong> dosyasını Supabase SQL Editor'de çalıştırın.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
