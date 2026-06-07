'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { X, Bell } from 'lucide-react'

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

const MIN_MESSAGE_LEN = 20

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

    try {
      const d = JSON.parse(localStorage.getItem('dismissed_banners') || '[]')
      setDismissed(new Set(d))
    } catch {}
  }, [user, type, slug])

  const dismiss = (id: string) => {
    const next = new Set([...dismissed, id])
    setDismissed(next)
    localStorage.setItem('dismissed_banners', JSON.stringify([...next]))
    fetch(`${API}/api/admin/content/banners/${id}/dismiss`, { method: 'POST' }).catch(() => {})
  }

  const trackClick = (id: string) => {
    fetch(`${API}/api/admin/content/banners/${id}/click`, { method: 'POST' }).catch(() => {})
  }

  const visible = banners.filter(b =>
    !dismissed.has(b.id) &&
    b.message &&
    b.message.trim().length >= MIN_MESSAGE_LEN
  )

  // Enterprise banners stay quiet — show only the single most relevant one
  const b = visible[0]
  if (!b) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 44,
      padding: '0 14px',
      marginBottom: 16,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: '#f8fafc', border: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Bell size={13} color="#64748b" />
      </div>

      <p style={{
        flex: 1,
        minWidth: 0,
        margin: 0,
        color: '#0f172a',
        fontSize: 13,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {b.title && <strong style={{ fontWeight: 700, marginRight: 6 }}>{b.title}</strong>}
        <span style={{ color: '#64748b' }}>{b.message}</span>
      </p>

      {b.cta_text && b.cta_url && (
        <a
          href={b.cta_url}
          onClick={() => trackClick(b.id)}
          style={{
            padding: '6px 14px',
            borderRadius: 7,
            background: '#0f172a',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {b.cta_text}
        </a>
      )}

      <button
        onClick={() => dismiss(b.id)}
        style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8', transition: 'all 0.15s', padding: 0, flexShrink: 0,
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#475569' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}
