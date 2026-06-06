'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { X, Info, Zap, Bell } from 'lucide-react'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
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
    const newDismissed = new Set([...dismissed, id])
    setDismissed(newDismissed)
    localStorage.setItem('dismissed_banners', JSON.stringify([...newDismissed]))
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

  if (visible.length === 0) return null

  const bgColor  = isDark ? 'rgba(59,130,246,0.07)' : '#eff6ff'
  const bdColor  = isDark ? 'rgba(59,130,246,0.18)' : '#bfdbfe'
  const titleClr = isDark ? '#f1f5f9' : '#1e40af'
  const msgClr   = isDark ? '#94a3b8' : '#3b82f6'
  const closeClr = isDark ? '#475569' : '#93c5fd'

  return (
    <div style={{ marginBottom: 16 }}>
      {visible.map(b => (
        <div key={b.id} style={{
          background: bgColor,
          border: `1px solid ${bdColor}`,
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          position: 'relative',
        }}>
          {b.image_url ? (
            <img
              src={b.image_url}
              alt={b.title}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={16} color="#3b82f6" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
            {b.title && (
              <div style={{ color: titleClr, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                {b.title}
              </div>
            )}
            {b.message && (
              <div style={{ color: msgClr, fontSize: 13, lineHeight: 1.5 }}>
                {b.message}
              </div>
            )}
          </div>

          {b.cta_text && b.cta_url && (
            <a
              href={b.cta_url}
              onClick={() => trackClick(b.id)}
              style={{
                padding: '8px 16px', borderRadius: 9,
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              {b.cta_text}
            </a>
          )}

          <button
            onClick={() => dismiss(b.id)}
            style={{
              position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 7,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: closeClr, transition: 'all 0.15s', padding: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
