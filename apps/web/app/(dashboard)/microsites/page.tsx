'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Globe, Plus, RefreshCw, ExternalLink, Eye, Copy, CheckCircle, Trash2, ToggleLeft, ToggleRight, Sparkles, Zap, ChevronRight, Send, Bot, Link2, Bell, BarChart2, Flame, Thermometer, Snowflake, MapPin, Lightbulb, PenLine, Palette, Package } from 'lucide-react'

const tx1 = '#0f172a', tx2 = '#475569', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'
const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const inp = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

const APP_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '').replace('https://leadflow-ai-production.up.railway.app', 'https://leadflow-ai-web-kappa.vercel.app')
  : 'https://leadflow-ai-web-kappa.vercel.app'
const CATALOG_BASE = `${APP_URL}/catalog/`

// ── Quantum Orbital Sphere (same as catalog page) ────────────────────────────
function QuantumOrb({ size = 64 }: { size?: number }) {
  const s = size
  const ring = (extra: number) => s + extra * 2
  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: s * 2.2, height: s * 2.2, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)', animation: 'msOrbGlow 3s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: ring(s * 0.55), height: ring(s * 0.55), borderRadius: '50%', border: '1.5px solid rgba(6,182,212,0.55)', animation: 'msRing1 4s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
      </div>
      <div style={{ position: 'absolute', width: ring(s * 0.4), height: ring(s * 0.4), borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.5)', animation: 'msRing2 6s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
      </div>
      <div style={{ position: 'absolute', width: ring(s * 0.28), height: ring(s * 0.28), borderRadius: '50%', border: '1px solid rgba(20,184,166,0.45)', animation: 'msRing3 9s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -2.5, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', boxShadow: '0 0 8px #14b8a6' }} />
      </div>
      <div style={{ width: s, height: s, borderRadius: '50%', position: 'relative', zIndex: 2, background: `radial-gradient(circle at 38% 32%, #a5f3fc, #0891b2 40%, #0c1a3a 75%)`, boxShadow: `0 0 ${s * 0.4}px rgba(6,182,212,0.6), 0 0 ${s * 0.8}px rgba(6,182,212,0.2)`, animation: 'msCoreBreath 4s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', top: '18%', left: '22%', width: '28%', height: '18%', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(3px)', transform: 'rotate(-30deg)' }} />
      </div>
    </div>
  )
}

function FloatOrb({ size = 20, delay = '0s', color = '#06b6d4' }: { size?: number; delay?: string; color?: string }) {
  return (
    <div className="ms-float-orb" style={{ animationDelay: delay, width: size * 1.8, height: size * 1.8, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: size * 1.8, height: size * 1.8, borderRadius: '50%', border: `1px solid ${color}50`, animation: `msRing1 ${3 + size / 10}s linear infinite` }} />
      <div style={{ width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color}44)`, boxShadow: `0 0 ${size * 0.5}px ${color}66` }} />
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
  const heatColor = heat === 'hot' ? '#dc2626' : heat === 'warm' ? '#b45309' : tx2
  const HeatIcon = heat === 'hot' ? Flame : heat === 'warm' ? Thermometer : Snowflake
  const heatLabel = heat === 'hot' ? 'Sıcak' : heat === 'warm' ? 'Ilık' : 'Soğuk'

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
      <div style={{ position: 'relative', zIndex: 1, ...card, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg,rgba(13,148,136,0.1),rgba(124,58,237,0.1))', border: '1px solid #cffafe', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 0 20px rgba(6,182,212,0.18)' : 'none', transition: 'box-shadow 0.3s' }}>
            {hovered ? <QuantumOrb size={32} /> : <Globe size={22} style={{ color: accentTeal }} />}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ color: tx1, fontWeight: 700, fontSize: 15, margin: 0 }}>{ms.leads?.company_name}</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: heatColor, background: `${heatColor}14`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${heatColor}33` }}><HeatIcon size={11} /> {heatLabel}</span>
              {!ms.active && <span style={{ fontSize: 10, color: tx2, background: surf, padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>Pasif</span>}
            </div>
            <p style={{ color: tx2, fontSize: 13, margin: '0 0 6px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.headline}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: tx2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={11} /> {ms.views} görüntüleme</span>
              {ms.leads?.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {ms.leads.city}</span>}
              <span>{new Date(ms.created_at).toLocaleDateString()}</span>
              <span style={{ color: tx3, fontFamily: 'monospace', fontSize: 11 }}>/{ms.slug.slice(0, 20)}{ms.slug.length > 20 ? '…' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={CATALOG_BASE + ms.slug} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e2e8f0', background: surf, color: tx2, fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>
              <ExternalLink size={12} /> Önizle
            </a>
            <button onClick={() => onCopy(CATALOG_BASE + ms.slug, ms.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied === ms.id ? 'rgba(5,150,105,0.12)' : 'rgba(13,148,136,0.1)', color: copied === ms.id ? accentEmerald : accentTeal, fontSize: 12 }}>
              {copied === ms.id ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied === ms.id ? 'Kopyalandı' : 'Link Kopyala'}
            </button>
            <button onClick={handleSend} disabled={sending || !ms.leads?.phone}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: !ms.leads?.phone ? 'not-allowed' : 'pointer', background: 'rgba(5,150,105,0.1)', color: accentEmerald, fontSize: 12, opacity: !ms.leads?.phone ? 0.4 : 1 }}>
              {sending ? <RefreshCw size={12} style={{ animation: 'msSpin 1s linear infinite' }} /> : <Send size={12} />}
              WA Gönder
            </button>
            <button onClick={() => onToggle(ms.id, ms.active)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: ms.active ? 'rgba(5,150,105,0.1)' : '#f1f5f9', color: ms.active ? accentEmerald : tx2, fontSize: 12 }}>
              {ms.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {ms.active ? 'Aktif' : 'Pasif'}
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                <Trash2 size={13} />
              </button>
            ) : (
              <button onClick={() => onDelete(ms.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.18)', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
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
  const { t } = useI18n()
  const [microsites, setMicrosites] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ leadId: '', customMessage: '' })
  const [catalogItems, setCatalogItems] = useState<{ emoji: string; name: string; price: string; desc: string }[]>([])
  const EMOJIS = ['📦','🛋️','💡','📱','🍳','🌿','🖥️','⚽','🚗','💊','🎨','🏗️','🧸','👗','💎','🔧','🪟','🛏️']
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
      const data = await api.post('/api/microsite/create', { ...form, catalogItems })
      showMsg('success', `Katalog oluşturuldu! Link: ${data.url}`)
      setShowCreate(false)
      setForm({ leadId: '', customMessage: '' })
      setCatalogItems([])
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
    { Icon: Bot, label: 'AI içerik analiz ediyor' },
    { Icon: PenLine, label: 'Kişisel başlık yazılıyor' },
    { Icon: Palette, label: 'Sayfa tasarlanıyor' },
    { Icon: Link2, label: 'Link oluşturuluyor' },
  ]

  const STAT_CONFIG = [
    { label: t('Toplam Katalog','Toplam Katalog'), key: 'total',      color: accentTeal, glow: 'rgba(13,148,136,0.18)',   Icon: Globe },
    { label: t('Aktif','Aktif'),                   key: 'active',     color: accentEmerald, glow: 'rgba(5,150,105,0.18)',  Icon: CheckCircle },
    { label: t('Toplam Görüntüleme','Toplam Görüntüleme'), key: 'totalViews', color: '#7c3aed', glow: 'rgba(124,58,237,0.18)', Icon: Eye },
    { label: t('Sıcak Lead','Sıcak Lead'),         key: 'hotLeads',   color: '#dc2626', glow: 'rgba(220,38,38,0.18)',   Icon: Flame },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#ecfeff 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #cffafe' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 100, zIndex: 1, opacity: 0.6 }}><FloatOrb size={18} delay="0s" color="#06b6d4" /></div>
        <div style={{ position: 'absolute', top: 50, right: 160, zIndex: 1, opacity: 0.5 }}><FloatOrb size={12} delay="1s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', bottom: 20, right: 70, zIndex: 1, opacity: 0.5 }}><FloatOrb size={14} delay="2s" color="#14b8a6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <QuantumOrb size={64} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: tx1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{t('microsites.kisisel_katalog_sayfalari', 'Kişisel Katalog Sayfaları')}</h1>
                <span style={{ background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>AI</span>
              </div>
              <p style={{ color: tx2, fontSize: 14, margin: 0, maxWidth: 520 }}>{t('microsites.her_musteri_icin_ai_ile_k', 'Her müşteri için AI ile kişisel katalog sayfası — WhatsApp\'tan link gönder, açtığında haber al')}</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 24px rgba(8,145,178,0.3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Plus size={16} /> {t('Yeni Katalog','Yeni Katalog')}
          </button>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { Icon: Bot, title: t('AI İçerik','AI İçerik'), desc: t('Sektöre özel otomatik','Sektöre özel otomatik'), color: accentTeal },
            { Icon: Link2, title: t('Kişisel Link','Kişisel Link'), desc: t('Benzersiz slug oluşur','Benzersiz slug oluşur'), color: '#7c3aed' },
            { Icon: Bell, title: t('Anlık Bildirim','Anlık Bildirim'), desc: t('Lead açınca WA gelir','Lead açınca WA gelir'), color: accentEmerald },
            { Icon: BarChart2, title: t('Engagement Skoru','Engagement Skoru'), desc: t('3+ görüntüleme = sıcak','3+ görüntüleme = sıcak'), color: '#dc2626' },
          ].map(({ Icon, title, desc, color }, idx) => (
            <div key={title} style={{ background: surf, borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative' }}>
              {idx < 3 && <ChevronRight size={14} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', color: tx3, zIndex: 3 }} />}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon size={24} style={{ color }} /></div>
              <p style={{ color: tx1, fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>{title}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${msg.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {STAT_CONFIG.map(({ label, key, color, glow, Icon }) => (
            <div key={key} style={{ ...card, border: `1px solid ${color}33`, padding: '20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: `radial-gradient(circle,${glow} 0%,transparent 70%)` }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, position: 'relative' }}><Icon size={22} style={{ color }} /></div>
              <p style={{ color, fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1, position: 'relative' }}>{stats[key]}</p>
              <p style={{ color: tx2, fontSize: 12, margin: 0, position: 'relative' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE FORM ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div style={{ ...card, padding: 28, marginBottom: 24 }}>
          {creating ? (
            /* Creating animation */
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><QuantumOrb size={72} /></div>
              <h2 style={{ color: tx1, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>AI Katalog Oluşturuyor{'.'.repeat(dotCount)}</h2>
              <p style={{ color: tx2, fontSize: 14, margin: '0 0 32px' }}>{t('microsites.musteriye_ozel_icerik_haz', 'Müşteriye özel içerik hazırlanıyor')}</p>
              <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {CREATION_STAGES.map(({ Icon, label }, idx) => {
                  const isDone = idx < creatingStage
                  const isActive = idx === creatingStage
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? 'rgba(5,150,105,0.12)' : isActive ? 'rgba(6,182,212,0.14)' : surf, border: `1px solid ${isDone ? 'rgba(5,150,105,0.4)' : isActive ? 'rgba(6,182,212,0.4)' : '#e2e8f0'}`, animation: isActive ? 'msPulse 1.5s ease-in-out infinite' : 'none' }}>
                        {isDone ? <CheckCircle size={16} style={{ color: accentEmerald }} /> : <Icon size={16} style={{ color: isActive ? accentTeal : tx3 }} />}
                      </div>
                      <p style={{ color: isDone ? accentEmerald : isActive ? accentTeal : tx3, fontSize: 13, fontWeight: isActive ? 600 : 400, margin: 0 }}>
                        {label}{isActive && <span style={{ color: accentTeal }}>{'.'.repeat(dotCount)}</span>}
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
                <Sparkles size={18} style={{ color: accentTeal }} />
                <h2 style={{ color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{t('microsites.yeni_kisisel_katalog_olus', 'Yeni Kişisel Katalog Oluştur')}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>{t('microsites.musteri', 'Müşteri *')}</label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.leadId} onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}
                      style={{ ...inp, width: '100%', border: `1px solid ${form.leadId ? '#99f6e4' : '#e2e8f0'}`, color: form.leadId ? tx1 : tx3, appearance: 'none', cursor: 'pointer' }}>
                      <option value="">Müşteri seçin ({leads.length} kişi)</option>
                      {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}{l.city ? ` — ${l.city}` : ''}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: tx3, pointerEvents: 'none' }}>▾</span>
                  </div>
                </div>
                <div>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>{t('microsites.ozel_mesaj_opsiyonel', 'Özel Mesaj (opsiyonel)')}</label>
                  <input value={form.customMessage} onChange={e => setForm(p => ({ ...p, customMessage: e.target.value }))}
                    placeholder={t('microsites.sizin_icin_ozel_fiyat_haz', 'Sizin için özel fiyat hazırladık...')}
                    style={{ ...inp, width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 10, marginBottom: 20, fontSize: 12, color: tx2 }}>
                <Lightbulb size={14} style={{ color: accentTeal, flexShrink: 0, marginTop: 1 }} />
                <span>AI müşterinin sektörüne ve şehrine göre otomatik kişisel başlık, alt başlık ve içerik oluşturur</span>
              </div>

              {/* ── ÜRÜN KATALOĞU ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ color: tx2, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={14} /> Ürün Kataloğu <span style={{ color: tx3, fontWeight: 400, fontSize: 11 }}>({catalogItems.length}/8 ürün)</span>
                  </label>
                  {catalogItems.length < 8 && (
                    <button onClick={() => setCatalogItems(p => [...p, { emoji: '📦', name: '', price: '', desc: '' }])}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(13,148,136,0.3)', background: 'rgba(13,148,136,0.08)', color: accentTeal, fontSize: 12, cursor: 'pointer' }}>
                      <Plus size={12} /> Ürün Ekle
                    </button>
                  )}
                </div>
                {catalogItems.length === 0 && (
                  <div style={{ padding: '20px', background: surf, border: '1px dashed #e2e8f0', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ color: tx2, fontSize: 13, margin: '0 0 10px' }}>{t('microsites.urun_katalogu_opsiyonel_e', 'Ürün kataloğu opsiyonel — eklemezseniz AI içerik oluşturur')}</p>
                    <button onClick={() => setCatalogItems([{ emoji: '📦', name: '', price: '', desc: '' }])}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(13,148,136,0.25)', background: 'rgba(13,148,136,0.06)', color: accentTeal, fontSize: 12, cursor: 'pointer' }}>
                      <Plus size={12} /> İlk Ürünü Ekle
                    </button>
                  </div>
                )}
                {catalogItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 1fr 32px', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                    {/* Emoji picker */}
                    <div style={{ position: 'relative' }}>
                      <select value={item.emoji} onChange={e => setCatalogItems(p => p.map((x, j) => j === i ? { ...x, emoji: e.target.value } : x))}
                        style={{ width: 44, height: 38, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: tx1, fontSize: 18, textAlign: 'center', outline: 'none', cursor: 'pointer', appearance: 'none', padding: '0 4px' }}>
                        {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    {/* Name */}
                    <input value={item.name} onChange={e => setCatalogItems(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder={t('microsites.urun_adi', 'Ürün adı *')}
                      style={{ ...inp, padding: '9px 12px', height: 38 }} />
                    {/* Price */}
                    <input value={item.price} onChange={e => setCatalogItems(p => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      placeholder="₺ Fiyat"
                      style={{ ...inp, padding: '9px 12px', height: 38 }} />
                    {/* Description */}
                    <input value={item.desc} onChange={e => setCatalogItems(p => p.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                      placeholder={t('microsites.kisa_aciklama', 'Kısa açıklama')}
                      style={{ ...inp, padding: '9px 12px', height: 38 }} />
                    {/* Remove */}
                    <button onClick={() => setCatalogItems(p => p.filter((_, j) => j !== i))}
                      style={{ width: 32, height: 38, borderRadius: 8, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={create} disabled={!form.leadId}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12, border: 'none', cursor: !form.leadId ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !form.leadId ? 0.4 : 1, boxShadow: form.leadId ? '0 6px 20px rgba(8,145,178,0.3)' : 'none' }}>
                  <Zap size={15} /> AI ile Oluştur
                </button>
                <button onClick={() => setShowCreate(false)}
                  style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'transparent', color: tx2, fontSize: 14, cursor: 'pointer' }}>
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
          <RefreshCw size={24} style={{ color: tx2, animation: 'msSpin 1s linear infinite' }} />
        </div>
      ) : microsites.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><QuantumOrb size={56} /></div>
          <p style={{ color: tx2, fontSize: 15, margin: '0 0 20px' }}>{t('microsites.henuz_katalog_sayfasi_yok', 'Henüz katalog sayfası yok')}</p>
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
        @keyframes msRing1 {
          from { transform: rotateX(75deg) rotateY(0deg) rotateZ(0deg); }
          to   { transform: rotateX(75deg) rotateY(0deg) rotateZ(360deg); }
        }
        @keyframes msRing2 {
          from { transform: rotateX(30deg) rotateY(60deg) rotateZ(0deg); }
          to   { transform: rotateX(30deg) rotateY(60deg) rotateZ(360deg); }
        }
        @keyframes msRing3 {
          from { transform: rotateX(-50deg) rotateY(20deg) rotateZ(0deg); }
          to   { transform: rotateX(-50deg) rotateY(20deg) rotateZ(360deg); }
        }
        @keyframes msCoreBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 32px rgba(6,182,212,0.6), 0 0 64px rgba(6,182,212,0.2); }
          50%       { transform: scale(1.07); box-shadow: 0 0 48px rgba(6,182,212,0.85), 0 0 96px rgba(6,182,212,0.3); }
        }
        @keyframes msOrbGlow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.05); }
        }
        .ms-float-orb { animation: msFloatAnim 4s ease-in-out infinite; }
        @keyframes msFloatAnim {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }

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
