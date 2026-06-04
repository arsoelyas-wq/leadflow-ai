'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface Banner {
  id: string
  type: string
  title: string
  message: string
  cta_text: string
  cta_url: string
  image_url: string
  video_url: string
  target_plan: string
  target_slug: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

export default function AdminBanner({ type = 'dashboard', slug }: { type?: string; slug?: string }) {
  const { user } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const plan = user?.planType || 'starter'
    const params = new URLSearchParams({ type })
    if (slug) params.set('slug', slug)
    if (plan) params.set('plan', plan)

    fetch(`${API}/api/admin/content/banners/active?${params}`)
      .then(r => r.json())
      .then(d => setBanners(d.banners || []))
      .catch(() => {})

    // Load dismissed banners from localStorage
    try {
      const d = JSON.parse(localStorage.getItem('dismissed_banners') || '[]')
      setDismissed(new Set(d))
    } catch {}
  }, [user, type, slug])

  const dismiss = (id: string) => {
    const newDismissed = new Set([...dismissed, id])
    setDismissed(newDismissed)
    localStorage.setItem('dismissed_banners', JSON.stringify([...newDismissed]))
    // Track click
    fetch(`${API}/api/admin/content/banners/${id}/dismiss`, { method: 'POST' }).catch(() => {})
  }

  const trackClick = (id: string) => {
    fetch(`${API}/api/admin/content/banners/${id}/click`, { method: 'POST' }).catch(() => {})
  }

  const visible = banners.filter(b => !dismissed.has(b.id))
  if (visible.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      {visible.map(b => (
        <div key={b.id} style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.05))',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
        }}>
          {b.image_url && (
            <img src={b.image_url} alt={b.title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {b.title && <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{b.title}</div>}
            {b.message && <div style={{ color: '#94a3b8', fontSize: 13 }}>{b.message}</div>}
          </div>
          {b.cta_text && b.cta_url && (
            <a href={b.cta_url} onClick={() => trackClick(b.id)}
              style={{ padding: '8px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
              {b.cta_text}
            </a>
          )}
          <button onClick={() => dismiss(b.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
        </div>
      ))}
    </div>
  )
}
