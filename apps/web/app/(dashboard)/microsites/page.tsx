'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Globe, Plus, RefreshCw, ExternalLink, Eye, Copy, CheckCircle, Trash2, ToggleLeft, ToggleRight, Sparkles, Zap, ChevronRight, Send } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '').replace('https://leadflow-ai-production.up.railway.app', 'https://leadflow-ai-web-kappa.vercel.app')
  : 'https://leadflow-ai-web-kappa.vercel.app'
const CATALOG_BASE = `${APP_URL}/catalog/`

// ── 3D CSS Cube (same system as AR page) ────────────────────────────────────
function Cube3D({ size = 64 }: { size?: number }) {
  const h = size / 2
  return (
    <div style={{ perspective: `${size * 5}px`, width: size, height: size }}>
      <div className="ms-cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }}>
        {[
          { transform: `translateZ(${h}px)`,                  bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.45)' },
          { transform: `translateZ(-${h}px) rotateY(180deg)`, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)' },
          { transform: `translateX(-${h}px) rotateY(-90deg)`, bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.4)' },
          { transform: `translateX(${h}px) rotateY(90deg)`,   bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
          { transform: `translateY(-${h}px) rotateX(90deg)`,  bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)' },
          { transform: `translateY(${h}px) rotateX(-90deg)`,  bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)'  },
        ].map((f, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: f.transform, background: f.bg, border: `1px solid ${f.border}` }} />
        ))}
      </div>
    </div>
  )
}

function FloatCube({ size = 20, delay = '0s', color = '#06b6d4' }: { size?: number; delay?: string; color?: string }) {
  const h = size / 2
  return (
    <div className="ms-float-cube" style={{ animationDelay: delay, width: size, height: size }}>
      <div className="ms-cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', perspective: `${size * 8}px` }}>
        {[
          `translateZ(${h}px)`, `translateZ(-${h}px) rotateY(180deg)`,
          `translateX(-${h}px) rotateY(-90deg)`, `translateX(${h}px) rotateY(90deg)`,
          `translateY(-${h}px) rotateX(90deg)`, `translateY(${h}px) rotateX(-90deg)`,
        ].map((t, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: t, background: `${color}18`, border: `1px solid ${color}55` }} />
        ))}
      </div>
    </div>
  )
}

// ── Microsite Card ─────────────────────────────────────────────────────────────
function MicrositeCard({ ms, onCopy, onDelete, onToggle, onSend, copied }: any) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 3
    const y = (-(e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 3
    setTilt({ x, y })
  }

  const heat = ms.views >= 5 ? 'hot' : ms.views >= 2 ? 'warm' : 'cold'
  const heatColor = heat === 'hot' ? '#ef4444' : heat === 'warm' ? '#f59e0b' : '#475569'
  const heatLabel = heat === 'hot' ? '🔥 Sıcak' : heat === 'warm' ? '🌡️ Ilık' : '❄️ Soğuk'

  const handleSend = async () => {
    setSending(true)
    await onSend(ms)
    setSending(false)
  }

  return (
    <div ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); setConfirmDelete(false) }}
      onMouseMove={handleMouseMove}
      style={{ transition: hovered ? 'transform 0.05s ease' : 'transform 0.3s ease', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, position: 'relative' }}>
      {/* Holographic border */}
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 18, zIndex: 0, background: hovered ? 'linear-gradient(135deg,#06b6d4,#8b5cf6,#14b8a6,#3b82f6,#06b6d4)' : `linear-gradient(135deg,${heatColor}33,#8b5cf633)`, backgroundSize: '300% 300%', animation: hovered ? 'msBorder 2s linear infinite' : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(5,10,25,0.97),rgba(8,8,20,0.98))', borderRadius: 17, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(139,92,246,0.12))', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 0 20px rgba(6,182,212,0.25)' : 'none', transition: 'box-shadow 0.3s' }}>
            {hovered ? <Cube3D size={32} /> : <span style={{ fontSize: 22 }}>🌐</span>}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{ms.leads?.company_name}</p>
              <span style={{ fontSize: 11, fontWeight: 600, color: heatColor, background: `${heatColor}18`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${heatColor}33` }}>{heatLabel}</span>
              {!ms.active && <span style={{ fontSize: 10, color: '#475569', background: 'rgba(71,85,105,0.15)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(71,85,105,0.3)' }}>Pasif</span>}
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 6px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.headline}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#475569' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={11} /> {ms.views} görüntüleme</span>
              {ms.leads?.city && <span>📍 {ms.leads.city}</span>}
              <span>{new Date(ms.created_at).toLocaleDateString('tr-TR')}</span>
              <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11 }}>/{ms.slug.slice(0, 20)}{ms.slug.length > 20 ? '…' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={CATALOG_BASE + ms.slug} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>
              <ExternalLink size={12} /> Önizle
            </a>
            <button onClick={() => onCopy(CATALOG_BASE + ms.slug, ms.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied === ms.id ? 'rgba(16,185,129,0.15)' : 'rgba(6,182,212,0.1)', color: copied === ms.id ? '#34d399' : '#67e8f9', fontSize: 12 }}>
              {copied === ms.id ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied === ms.id ? 'Kopyalandı' : 'Link Kopyala'}
            </button>
            <button onClick={handleSend} disabled={sending || !ms.leads?.phone}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: !ms.leads?.phone ? 'not-allowed' : 'pointer', background: 'rgba(16,185,129,0.12)', color: '#34d399', fontSize: 12, opacity: !ms.leads?.phone ? 0.4 : 1 }}>
              {sending ? <RefreshCw size={12} style={{ animation: 'msSpin 1s linear infinite' }} /> : <Send size={12} />}
              WA Gönder
            </button>
            <button onClick={() => onToggle(ms.id, ms.active)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: ms.active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: ms.active ? '#34d399' : '#64748b', fontSize: 12 }}>
              {ms.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {ms.active ? 'Aktif' : 'Pasif'}
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(127,29,29,0.3)', color: '#fca5a5' }}>
                <Trash2 size={13} />
              </button>
            ) : (
              <button onClick={() => onDelete(ms.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 700 }}>
                Sil?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MicrositePage() {
  const [microsites, setMicrosites] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ leadId: '', customMessage: '' })
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dotCount, setDotCount] = useState(0)
  const [creatingStage, setCreatingStage] = useState(0)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [m, s, l] = await Promise.allSettled([
        api.get('/api/microsite/list'),
        api.get('/api/microsite/stats'),
        api.get('/api/leads?limit=200'),
      ])
      if (m.status === 'fulfilled') setMicrosites(m.value.microsites || [])
      if (s.status === 'fulfilled') setStats(s.value)
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Dots animation during creation
  useEffect(() => {
    if (!creating) return
    const t = setInterval(() => setDotCount(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [creating])

  // Stage animation during creation
  useEffect(() => {
    if (!creating) { setCreatingStage(0); return }
    const stages = [0, 1, 2, 3]
    let idx = 0
    const t = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1)
      setCreatingStage(idx)
    }, 2000)
    return () => clearInterval(t)
  }, [creating])

  const create = async () => {
    if (!form.leadId) return
    setCreating(true)
    try {
      const data = await api.post('/api/microsite/create', form)
      showMsg('success', `✅ Katalog oluşturuldu! Link: ${data.url}`)
      setShowCreate(false)
      setForm({ leadId: '', customMessage: '' })
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const copy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2500)
  }

  const deleteMs = async (id: string) => {
    try {
      await api.delete(`/api/microsite/${id}`)
      showMsg('success', 'Katalog silindi')
      setMicrosites(prev => prev.filter(m => m.id !== id))
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const toggleMs = async (id: string, current: boolean) => {
    try {
      await api.patch(`/api/microsite/${id}/toggle`, {})
      setMicrosites(prev => prev.map(m => m.id === id ? { ...m, active: !current } : m))
    } catch (e: any) { showMsg('error', e.message) }
  }

  const sendWhatsApp = async (ms: any) => {
    try {
      const phone = ms.leads?.phone
      if (!phone) return showMsg('error', 'Lead telefon numarası yok')
      const url = `${CATALOG_BASE}${ms.slug}`
      const message = `Merhaba ${ms.leads?.contact_name || ms.leads?.company_name}! 🌟\n\nSizin için özel bir katalog sayfası hazırladık:\n${url}\n\nÜrünlerimizi incelemenizi rica ederiz.`
      await api.post('/api/whatsapp/send', { phone, message })
      showMsg('success', `WhatsApp gönderildi: ${phone}`)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const CREATION_STAGES = [
    { icon: '🤖', label: 'AI içerik analiz ediyor' },
    { icon: '✍️', label: 'Kişisel başlık yazılıyor' },
    { icon: '🎨', label: 'Sayfa tasarlanıyor' },
    { icon: '🔗', label: 'Link oluşturuluyor' },
  ]

  const STAT_CONFIG = [
    { label: 'Toplam Katalog', key: 'total',      color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',   icon: '🌐' },
    { label: 'Aktif',          key: 'active',     color: '#10b981', glow: 'rgba(16,185,129,0.3)',  icon: '✅' },
    { label: 'Toplam Görüntüleme', key: 'totalViews', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', icon: '👁️' },
    { label: 'Sıcak Lead',     key: 'hotLeads',   color: '#ef4444', glow: 'rgba(239,68,68,0.3)',   icon: '🔥' },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,10,30,0.98),rgba(5,5,20,0.98))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(6,182,212,0.15)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(6,182,212,0.1) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 100, zIndex: 1, opacity: 0.6 }}><FloatCube size={18} delay="0s" color="#06b6d4" /></div>
        <div style={{ position: 'absolute', top: 50, right: 160, zIndex: 1, opacity: 0.5 }}><FloatCube size={12} delay="1s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', bottom: 20, right: 70, zIndex: 1, opacity: 0.5 }}><FloatCube size={14} delay="2s" color="#14b8a6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Cube3D size={64} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Kişisel Katalog Sayfaları</h1>
                <span style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>AI</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0, maxWidth: 520 }}>Her müşteri için AI ile kişisel katalog sayfası — WhatsApp'tan link gönder, açtığında haber al</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 24px rgba(8,145,178,0.35)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Yeni Katalog
          </button>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { icon: '🤖', title: 'AI İçerik', desc: 'Sektöre özel otomatik', color: '#06b6d4' },
            { icon: '🔗', title: 'Kişisel Link', desc: 'Benzersiz slug oluşur', color: '#8b5cf6' },
            { icon: '🔔', title: 'Anlık Bildirim', desc: 'Lead açınca WA gelir', color: '#10b981' },
            { icon: '📊', title: 'Engagement Skoru', desc: '3+ görüntüleme = sıcak', color: '#ef4444' },
          ].map(({ icon, title, desc, color }, idx) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative' }}>
              {idx < 3 && <ChevronRight size={14} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', color: '#334155', zIndex: 3 }} />}
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>{title}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#34d399' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {STAT_CONFIG.map(({ label, key, color, glow, icon }) => (
            <div key={key} style={{ background: 'linear-gradient(135deg,rgba(5,10,25,0.97),rgba(8,8,20,0.98))', border: `1px solid ${color}33`, borderRadius: 16, padding: '20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: `radial-gradient(circle,${glow} 0%,transparent 70%)` }} />
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <p style={{ color, fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1 }}>{stats[key]}</p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE FORM ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div style={{ background: 'linear-gradient(135deg,rgba(5,10,25,0.97),rgba(8,8,20,0.98))', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 20, padding: 28, marginBottom: 24 }}>
          {creating ? (
            /* Creating animation */
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Cube3D size={72} /></div>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>AI Katalog Oluşturuyor{'.'.repeat(dotCount)}</h2>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 32px' }}>Müşteriye özel içerik hazırlanıyor</p>
              <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {CREATION_STAGES.map(({ icon, label }, idx) => {
                  const isDone = idx < creatingStage
                  const isActive = idx === creatingStage
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDone ? 'rgba(16,185,129,0.5)' : isActive ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.07)'}`, animation: isActive ? 'msPulse 1.5s ease-in-out infinite' : 'none' }}>
                        {isDone ? '✅' : icon}
                      </div>
                      <p style={{ color: isDone ? '#34d399' : isActive ? '#67e8f9' : '#334155', fontSize: 13, fontWeight: isActive ? 600 : 400, margin: 0 }}>
                        {label}{isActive && <span style={{ color: '#67e8f9' }}>{'.'.repeat(dotCount)}</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Create form */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <Sparkles size={18} style={{ color: '#06b6d4' }} />
                <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Yeni Kişisel Katalog Oluştur</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Müşteri *</label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.leadId} onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}
                      style={{ width: '100%', background: '#070b1a', border: `1px solid ${form.leadId ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', color: form.leadId ? '#fff' : '#64748b', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                      <option value="">Müşteri seçin ({leads.length} kişi)</option>
                      {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}{l.city ? ` — ${l.city}` : ''}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Özel Mesaj (opsiyonel)</label>
                  <input value={form.customMessage} onChange={e => setForm(p => ({ ...p, customMessage: e.target.value }))}
                    placeholder="Sizin için özel fiyat hazırladık..."
                    style={{ width: '100%', background: '#070b1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#64748b' }}>
                💡 AI müşterinin sektörüne ve şehrine göre otomatik kişisel başlık, alt başlık ve içerik oluşturur
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={create} disabled={!form.leadId}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12, border: 'none', cursor: !form.leadId ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !form.leadId ? 0.4 : 1, boxShadow: form.leadId ? '0 6px 20px rgba(8,145,178,0.3)' : 'none' }}>
                  <Zap size={15} /> AI ile Oluştur
                </button>
                <button onClick={() => setShowCreate(false)}
                  style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
                  İptal
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MICROSITE LIST ────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
          <RefreshCw size={24} style={{ color: '#475569', animation: 'msSpin 1s linear infinite' }} />
        </div>
      ) : microsites.length === 0 ? (
        <div style={{ background: 'linear-gradient(135deg,rgba(5,10,25,0.97),rgba(8,8,20,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Cube3D size={56} /></div>
          <p style={{ color: '#475569', fontSize: 15, margin: '0 0 20px' }}>Henüz katalog sayfası yok</p>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '11px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(8,145,178,0.3)' }}>
            İlk Kataloğu Oluştur
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {microsites.map(ms => (
            <MicrositeCard key={ms.id} ms={ms} copied={copied} onCopy={copy} onDelete={deleteMs} onToggle={toggleMs} onSend={sendWhatsApp} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes msCubeSpin {
          0%   { transform: rotateX(15deg) rotateY(0deg); }
          100% { transform: rotateX(15deg) rotateY(360deg); }
        }
        .ms-cube-spin { animation: msCubeSpin 10s linear infinite; }

        @keyframes msFloat {
          0%, 100% { transform: translateY(0px) rotateX(15deg) rotateY(0deg); }
          50%       { transform: translateY(-10px) rotateX(15deg) rotateY(180deg); }
        }
        .ms-float-cube { animation: msFloat 4s ease-in-out infinite; }

        @keyframes msBorder {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes msSpin { to { transform: rotate(360deg); } }

        @keyframes msPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(6,182,212,0); }
        }
      `}</style>
    </div>
  )
}
