'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Zap, Users, Copy, CheckCircle, AlertTriangle, TrendingUp, Send, Target, BarChart3, ChevronDown } from 'lucide-react'

// ── META SIGNAL ORB — Behavioral data flowing to Meta ────────────────────────
// Theme: data signals, behavioral targeting, Facebook blue → electric
function MetaSignalOrb({ size = 110, sending = false, configured = false }: { size?: number; sending?: boolean; configured?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [angle, setAngle] = useState(0)
  const [signals, setSignals] = useState<Array<{ x: number; y: number; tx: number; ty: number; age: number; id: number; color: string }>>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setAngle(a => (a + 0.6) % 360), 16)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!sending || !mounted) return
    const t = setInterval(() => {
      // Signal flies from center outward (data being sent to Meta)
      const startAngle = Math.random() * Math.PI * 2
      const colors = ['#1877f2', '#42a5f5', '#00c6ff', '#7c3aed', '#a78bfa']
      const color = colors[Math.floor(Math.random() * colors.length)]
      const dist = 0.35 + Math.random() * 0.15
      setSignals(prev => [...prev.slice(-10), {
        x: Math.cos(startAngle) * dist, y: Math.sin(startAngle) * dist,
        tx: Math.cos(startAngle) * 1.2, ty: Math.sin(startAngle) * 1.2,
        age: 0, id: Date.now() + Math.random(), color,
      }])
    }, 300)
    const fade = setInterval(() => setSignals(prev =>
      prev.map(s => ({ ...s, age: s.age + 1 })).filter(s => s.age < 8)
    ), 200)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [sending, mounted])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const metaBlue = configured ? '#1877f2' : '#334155'
  const accentBlue = configured ? '#42a5f5' : '#475569'
  const glowColor = configured ? 'rgba(24,119,242,' : 'rgba(71,85,105,'

  // "f" letter on sphere (Meta's logo representation)
  const fPath = `M ${cx-s*0.1} ${cx-s*0.18} L ${cx+s*0.08} ${cx-s*0.18} M ${cx-s*0.1} ${cx-s*0.06} L ${cx+s*0.05} ${cx-s*0.06} M ${cx-s*0.1} ${cx-s*0.18} L ${cx-s*0.1} ${cx+s*0.18}`

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`msGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${glowColor}0)`} />
            <stop offset="55%" stopColor={`${glowColor}0.07)`} />
            <stop offset="100%" stopColor={`${glowColor}0.2)`} />
          </radialGradient>
          <radialGradient id={`msSphere${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor={configured ? '#93c5fd' : '#475569'} />
            <stop offset="30%" stopColor={configured ? '#3b82f6' : '#374151'} />
            <stop offset="65%" stopColor={configured ? '#1d4ed8' : '#1f2937'} />
            <stop offset="100%" stopColor={configured ? '#1e3a8a' : '#111827'} />
          </radialGradient>
          {/* Signal trail gradient */}
          <linearGradient id={`msTrail${s}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={metaBlue} stopOpacity={0.8} />
            <stop offset="100%" stopColor={metaBlue} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#msGlow${s})`} />

        {/* Outer data rings (3 concentric) */}
        {[0.88, 0.72, 0.58].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r}
            fill="none"
            stroke={`rgba(${configured ? '24,119,242' : '71,85,105'},${0.15 - i * 0.04})`}
            strokeWidth={1}
            strokeDasharray={`${Math.PI * 2 * s * r / 20} ${Math.PI * 2 * s * r / 40}`}
            style={{ animation: `ms-ring-${i} ${8 + i * 3}s linear ${i % 2 ? 'reverse' : ''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}

        {/* Rotating data scan arc */}
        <path
          d={`M ${cx} ${cx} L ${cx + Math.cos(angle * Math.PI / 180) * s * 0.82} ${cx + Math.sin(angle * Math.PI / 180) * s * 0.82}`}
          stroke={configured ? 'rgba(66,165,245,0.7)' : 'rgba(100,116,139,0.5)'}
          strokeWidth={1.5}
          style={{ filter: configured ? 'drop-shadow(0 0 4px #42a5f5)' : 'none' }} />

        {/* Sweep sector */}
        <path
          d={`M ${cx} ${cx} L ${cx + Math.cos((angle - 40) * Math.PI / 180) * s * 0.82} ${cx + Math.sin((angle - 40) * Math.PI / 180) * s * 0.82} A ${s * 0.82} ${s * 0.82} 0 0 1 ${cx + Math.cos(angle * Math.PI / 180) * s * 0.82} ${cx + Math.sin(angle * Math.PI / 180) * s * 0.82} Z`}
          fill={configured ? 'rgba(24,119,242,0.1)' : 'rgba(71,85,105,0.08)'} />

        {/* Outgoing signal trails */}
        {signals.map(sig => {
          const progress = sig.age / 8
          const x = cx + (sig.x + (sig.tx - sig.x) * progress) * s
          const y = cx + (sig.y + (sig.ty - sig.y) * progress) * s
          const opacity = Math.max(0, 0.9 - progress * 0.9)
          const r = 3 * (1 - progress * 0.5)
          return (
            <g key={sig.id}>
              {/* Trail */}
              <line
                x1={cx + sig.x * s} y1={cx + sig.y * s}
                x2={x} y2={y}
                stroke={sig.color} strokeWidth={1.2} opacity={opacity * 0.5} />
              {/* Signal dot */}
              <circle cx={x} cy={y} r={r} fill={sig.color} opacity={opacity}
                style={{ filter: `drop-shadow(0 0 ${r * 2}px ${sig.color})` }} />
            </g>
          )
        })}

        {/* Core Meta sphere */}
        <circle cx={cx} cy={cx - s * 0.02} r={s * 0.4}
          fill={`url(#msSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${configured ? s * 0.25 : s * 0.1}px ${configured ? '#1877f299' : '#374151'})` }} />

        {/* "f" logo on sphere */}
        <path d={fPath}
          stroke={configured ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)'}
          strokeWidth={s * 0.045} strokeLinecap="round" fill="none" />

        {/* Specular */}
        <ellipse cx={cx - s * 0.1} cy={cx - s * 0.16}
          rx={s * 0.09} ry={s * 0.06}
          fill="rgba(255,255,255,0.2)" style={{ filter: 'blur(3px)' }} />

        {/* Scan tip dot */}
        <circle cx={cx + Math.cos(angle * Math.PI / 180) * s * 0.82}
          cy={cx + Math.sin(angle * Math.PI / 180) * s * 0.82}
          r={4} fill={accentBlue}
          style={{ filter: configured ? `drop-shadow(0 0 6px ${accentBlue})` : 'none' }} />

        {/* Corner brackets */}
        {([[6,6,1,1],[s*2.2-6,6,-1,1],[6,s*2.2-6,1,-1],[s*2.2-6,s*2.2-6,-1,-1]] as number[][])
          .map(([x,y,dx,dy],i) => {
            const len = s * 0.1
            return <g key={i}>
              <line x1={x} y1={y} x2={x+dx*len} y2={y} stroke={configured ? 'rgba(24,119,242,0.5)' : 'rgba(71,85,105,0.4)'} strokeWidth={1.8} />
              <line x1={x} y1={y} x2={x} y2={y+dy*len} stroke={configured ? 'rgba(24,119,242,0.5)' : 'rgba(71,85,105,0.4)'} strokeWidth={1.8} />
            </g>
          })}

        {/* Outer ring */}
        <circle cx={cx} cy={cx} r={s * 1.0}
          fill="none"
          stroke={configured ? 'rgba(24,119,242,0.18)' : 'rgba(71,85,105,0.15)'}
          strokeWidth={1.5} strokeDasharray="6 4" />

        {/* Status indicator */}
        <circle cx={cx + s * 0.3} cy={cx - s * 0.3} r={8}
          fill={configured ? '#10b981' : '#ef4444'}
          style={{ filter: `drop-shadow(0 0 6px ${configured ? '#10b981' : '#ef4444'})` }} />
        <circle cx={cx + s * 0.3} cy={cx - s * 0.3} r={13}
          fill="none" stroke={configured ? '#10b981' : '#ef4444'}
          strokeWidth={1} opacity={0.4}
          style={{ animation: 'ms-ping 2s ease-in-out infinite' }} />
      </svg>
    </div>
  )
}

// ── EVENT TYPE CONFIG ─────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'Lead',                  label: 'Lead',            icon: '👤', color: '#1877f2', desc: 'Yeni lead bildirimi' },
  { value: 'Contact',               label: 'İletişim',        icon: '📞', color: '#10b981', desc: 'İletişim kuruldu' },
  { value: 'ViewContent',           label: 'İçerik Görüntüleme', icon: '👁️', color: '#8b5cf6', desc: 'Katalog/içerik görüntülendi' },
  { value: 'InitiateCheckout',      label: 'Teklif Başladı',  icon: '📋', color: '#f59e0b', desc: 'Teklif süreci başladı' },
  { value: 'Purchase',              label: 'Satış',           icon: '💰', color: '#ef4444', desc: 'Satış gerçekleşti' },
  { value: 'CompleteRegistration',  label: 'Kayıt Tamamlandı',icon: '✅', color: '#06b6d4', desc: 'Müşteri kaydı tamamlandı' },
]

const LEAD_STATUSES = ['Tüm leadler', 'new', 'contacted', 'replied', 'won', 'lost']
const SECTORS = ['Tüm sektörler', 'mobilya', 'dekorasyon', 'inşaat', 'tekstil', 'elektronik']

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: any) {
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: `1px solid ${color}22`, borderRadius: 14, padding: '16px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, background: `radial-gradient(circle,${color}22 0%,transparent 70%)` }} />
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <p style={{ color, fontSize: 22, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
      <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{label}</p>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function MetaPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Event config
  const [eventName, setEventName]     = useState('Lead')
  const [statusFilter, setStatus]     = useState('')
  const [sectorFilter, setSector]     = useState('')
  const [testCode, setTestCode]       = useState('')
  const [batchLimit, setBatchLimit]   = useState(500)
  const [sendResult, setSendResult]   = useState<any>(null)

  // Audience config
  const [audienceName, setAudienceName] = useState('')
  const [audienceResult, setAudienceResult] = useState<any>(null)

  // Pixel code
  const [pixelCode, setPixelCode]     = useState<any>(null)
  const [showPixel, setShowPixel]     = useState(false)

  // Event history
  const [eventHistory, setEventHistory] = useState<any[]>([])

  const showMsg = (type: 'success' | 'error' | 'warning', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 8000)
  }

  const loadData = async () => {
    try {
      const [s, h] = await Promise.allSettled([
        api.get('/api/meta/stats'),
        api.get('/api/meta/event-history'),
      ])
      if (s.status === 'fulfilled') setStats(s.value)
      if (h.status === 'fulfilled') setEventHistory(h.value.events || [])
    } catch {}
  }

  useEffect(() => { loadData() }, [])

  const trackBatch = async () => {
    setSending(true); setSendResult(null)
    try {
      const data = await api.post('/api/meta/track-batch', {
        eventName,
        status: statusFilter || undefined,
        sector: sectorFilter || undefined,
        limit: batchLimit,
        testCode: testCode || undefined,
      })
      setSendResult(data)
      if (data.errors?.length > 0) {
        showMsg('warning', `${data.message} — ${data.errors[0]}`)
      } else {
        showMsg('success', data.message)
      }
      loadData()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const createAudience = async () => {
    if (!audienceName) return
    setCreating(true); setAudienceResult(null)
    try {
      const data = await api.post('/api/meta/custom-audience', {
        name: audienceName,
        status: statusFilter || undefined,
        sector: sectorFilter || undefined,
      })
      setAudienceResult(data)
      showMsg(data.metaAudienceId ? 'success' : data.metaError ? 'warning' : 'warning', data.message)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const loadPixelCode = async () => {
    try { const d = await api.get('/api/meta/pixel-code'); setPixelCode(d); setShowPixel(true) } catch {}
  }

  const configured = stats?.configured ?? false
  const selectedEvent = EVENT_TYPES.find(e => e.value === eventName) || EVENT_TYPES[0]

  const msgColors = { success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#34d399' }, error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171' }, warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24' } }

  const inp = { width: '100%', background: '#070a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 13px', color: '#fff' as const, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(3,5,24,0.98),rgba(5,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: `1px solid ${configured ? 'rgba(24,119,242,0.25)' : 'rgba(71,85,105,0.2)'}` }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `linear-gradient(${configured ? 'rgba(24,119,242,0.04)' : 'rgba(71,85,105,0.03)'} 1px,transparent 1px),linear-gradient(90deg,${configured ? 'rgba(24,119,242,0.03)' : 'rgba(71,85,105,0.02)'} 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, right: -20, width: 280, height: 280, background: `radial-gradient(circle,${configured ? 'rgba(24,119,242,0.12)' : 'rgba(71,85,105,0.08)'} 0%,transparent 70%)`, zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 28 }}>
          <MetaSignalOrb size={100} sending={sending} configured={configured} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Meta Behavioral Intent</h1>
              <span style={{ background: configured ? 'linear-gradient(135deg,#1877f2,#42a5f5)' : 'rgba(71,85,105,0.4)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                {configured ? '✓ BAĞLI' : '⚠ YAPILANDIRILMAMIS'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px' }}>
              Meta Conversions API ile leadleri Facebook hedef kitlesine dönüştür
            </p>
            {/* Config warning */}
            {!configured && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#fbbf24' }}>
                ⚠️ <strong>Railway'e ekle:</strong> META_PIXEL_ID (Facebook Pixel ID) + META_CAPI_TOKEN (System User Token)
              </div>
            )}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['📡 CAPI v19', '🔒 SHA-256 Hash', '🎯 Custom Audience', '📊 Event Dedup', configured ? '✅ Bağlı' : '⚙️ Yapılandır'].map(f => (
                <span key={f} style={{ background: configured ? 'rgba(24,119,242,0.08)' : 'rgba(71,85,105,0.06)', border: `1px solid ${configured ? 'rgba(24,119,242,0.2)' : 'rgba(71,85,105,0.15)'}`, color: '#94a3b8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 22 }}>
            <StatCard label="30 Gün Event" value={stats.total} color="#1877f2" icon="📡" />
            <StatCard label="Başarılı" value={stats.totalSuccess || 0} color="#10b981" icon="✅" />
            <StatCard label="Başarısız" value={stats.totalFailed || 0} color="#ef4444" icon="❌" />
            <StatCard label="Pixel ID" value={stats.pixelId || '—'} color="#8b5cf6" icon="🎯" />
          </div>
        )}
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msgColors[msg.type].bg, border: `1px solid ${msgColors[msg.type].border}`, color: msgColors[msg.type].text }}>
          {msg.text}
        </div>
      )}

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* LEFT: Event Sender */}
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(24,119,242,0.2)', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Send size={16} style={{ color: '#1877f2' }} />
            <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{t('meta_intent.conversion_event_gonder', 'Conversion Event Gönder')}</h2>
          </div>

          {/* Event type selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 7 }}>Event Tipi</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
              {EVENT_TYPES.map(et => (
                <button key={et.value} onClick={() => setEventName(et.value)}
                  title={et.desc}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 6px', borderRadius: 10, border: `1px solid ${eventName === et.value ? `${et.color}60` : 'rgba(255,255,255,0.07)'}`, background: eventName === et.value ? `${et.color}18` : 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 18 }}>{et.icon}</span>
                  <span style={{ color: eventName === et.value ? et.color : '#64748b', fontSize: 10, fontWeight: eventName === et.value ? 700 : 400 }}>{et.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>Lead Status</label>
              <div style={{ position: 'relative' }}>
                <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: 28 }}>
                  {LEAD_STATUSES.map(s => <option key={s} value={s === 'Tüm leadler' ? '' : s}>{s}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
              </div>
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.sektor', 'Sektör')}</label>
              <div style={{ position: 'relative' }}>
                <select value={sectorFilter} onChange={e => setSector(e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: 28 }}>
                  {SECTORS.map(s => <option key={s} value={s === 'Tüm sektörler' ? '' : s}>{s}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.gonderilecek_limit', 'Gönderilecek Limit')}</label>
              <input type="number" value={batchLimit} onChange={e => setBatchLimit(Number(e.target.value))} min={1} max={2000}
                style={inp} />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>Test Kodu (opsiyonel)</label>
              <input value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="TEST12345"
                style={inp} />
            </div>
          </div>

          <button onClick={trackBatch} disabled={sending}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px', borderRadius: 12, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1877f2,#42a5f5)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(24,119,242,0.4)', opacity: sending ? 0.8 : 1 }}>
            {sending ? <RefreshCw size={16} style={{ animation: 'ms-spin 1s linear infinite' }} /> : <Zap size={16} />}
            {sending ? 'Event Gönderiliyor...' : `${eventName} Event Toplu Gönder`}
          </button>

          {/* Send result */}
          {sendResult && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: sendResult.errors?.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(24,119,242,0.08)', border: `1px solid ${sendResult.errors?.length > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(24,119,242,0.25)'}`, borderRadius: 11 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[
                  { l: 'Toplam Lead', v: sendResult.total, c: '#94a3b8' },
                  { l: 'Başarılı', v: sendResult.success, c: '#10b981' },
                  { l: 'Başarısız', v: sendResult.failed, c: '#ef4444' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <p style={{ color: c, fontSize: 20, fontWeight: 800, margin: 0 }}>{v}</p>
                    <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{l}</p>
                  </div>
                ))}
                {sendResult.testMode && <span style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: 10, padding: '2px 8px', borderRadius: 20, alignSelf: 'center' }}>TEST MODE</span>}
              </div>
              {sendResult.errors?.length > 0 && (
                <p style={{ color: '#f87171', fontSize: 11, margin: '8px 0 0' }}>⚠️ {sendResult.errors[0]}</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Custom Audience */}
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Users size={16} style={{ color: '#8b5cf6' }} />
            <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{t('meta_intent.custom_audience_olustur', 'Custom Audience Oluştur')}</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.kitle_adi', 'Kitle Adı *')}</label>
              <input value={audienceName} onChange={e => setAudienceName(e.target.value)} placeholder={t('meta_intent.sicak_leadler_2026_q2', 'Sıcak Leadler 2026 Q2')}
                style={{ ...inp, border: `1px solid ${audienceName ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}` }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>Status Filtre</label>
                <div style={{ position: 'relative' }}>
                  <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: 28 }}>
                    {LEAD_STATUSES.map(s => <option key={s} value={s === 'Tüm leadler' ? '' : s}>{s}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
                </div>
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.sektor_filtre', 'Sektör Filtre')}</label>
                <div style={{ position: 'relative' }}>
                  <select value={sectorFilter} onChange={e => setSector(e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: 28 }}>
                    {SECTORS.map(s => <option key={s} value={s === 'Tüm sektörler' ? '' : s}>{s}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 9, fontSize: 12, color: '#64748b' }}>
              {configured
                ? '✅ META_CAPI_TOKEN + META_AD_ACCOUNT_ID varsa kitle otomatik oluşturulur'
                : '⚠️ API yapılandırılmamış — veriler hazırlanır, manuel yükleme gerekir'}
            </div>

            <button onClick={createAudience} disabled={creating || !audienceName}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', borderRadius: 12, border: 'none', cursor: creating || !audienceName ? 'not-allowed' : 'pointer', background: audienceName ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !audienceName ? 0.4 : 1, boxShadow: audienceName ? '0 6px 20px rgba(124,58,237,0.3)' : 'none', marginTop: 'auto' }}>
              {creating ? <RefreshCw size={15} style={{ animation: 'ms-spin 1s linear infinite' }} /> : <Target size={15} />}
              {creating ? 'Kitle Oluşturuluyor...' : 'Kitle Oluştur'}
            </button>
          </div>

          {/* Audience result */}
          {audienceResult && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: audienceResult.metaAudienceId ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${audienceResult.metaAudienceId ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 11 }}>
              <p style={{ color: audienceResult.metaAudienceId ? '#34d399' : '#fbbf24', fontSize: 12, margin: '0 0 8px', fontWeight: 600 }}>
                {audienceResult.metaAudienceId ? '✅ Kitle Oluşturuldu!' : '📋 Veriler Hazır'}
              </p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{audienceResult.totalContacts}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{t('meta_intent.kisi', 'Kişi')}</p></div>
                <div><p style={{ color: '#3b82f6', fontSize: 16, fontWeight: 700, margin: 0 }}>{audienceResult.phones}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>Telefon</p></div>
                <div><p style={{ color: '#10b981', fontSize: 16, fontWeight: 700, margin: 0 }}>{audienceResult.emails}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>E-posta</p></div>
              </div>
              {audienceResult.metaAudienceId && (
                <p style={{ color: '#64748b', fontSize: 10, margin: '6px 0 0', fontFamily: 'monospace' }}>ID: {audienceResult.metaAudienceId}</p>
              )}
              {audienceResult.metaError && (
                <p style={{ color: '#f87171', fontSize: 11, margin: '6px 0 0' }}>⚠️ {audienceResult.metaError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── EVENT HISTORY ─────────────────────────────────────────────────── */}
      {eventHistory.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: 22, marginBottom: 20 }}>
          <h3 style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>{t('meta_intent.son_event_gecmisi', '📊 Son Event Geçmişi')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {eventHistory.slice(0, 8).map((e: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: e.success ? 'rgba(24,119,242,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${e.success ? 'rgba(24,119,242,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 10 }}>
                <span style={{ fontSize: 16 }}>{EVENT_TYPES.find(et => et.value === e.event_name)?.icon || '📡'}</span>
                <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{e.event_name}</span>
                <span style={{ color: '#334155', fontSize: 11, flex: 1 }}>{e.lead_id ? `Lead: ${e.lead_id.slice(0, 8)}...` : ''}</span>
                <span style={{ color: e.success ? '#34d399' : '#f87171', fontSize: 10 }}>{e.success ? '✅ Başarılı' : '❌ Başarısız'}</span>
                <span style={{ color: '#1e293b', fontSize: 10 }}>{new Date(e.sent_at).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PIXEL CODE ────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPixel ? 16 : 0 }}>
          <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, margin: 0 }}>{'<>'} Meta Pixel Kodu</h3>
          <button onClick={showPixel ? () => setShowPixel(false) : loadPixelCode}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, border: '1px solid rgba(24,119,242,0.3)', background: 'rgba(24,119,242,0.08)', color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}>
            <ChevronDown size={13} style={{ transform: showPixel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {showPixel ? 'Gizle' : 'Kodu Göster'}
          </button>
        </div>
        {showPixel && pixelCode && (
          <div style={{ position: 'relative' }}>
            <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, padding: '14px 16px', color: '#94a3b8', fontSize: 11, lineHeight: 1.6, overflowX: 'auto', margin: 0 }}>
              {pixelCode.code}
            </pre>
            <button onClick={() => { navigator.clipboard.writeText(pixelCode.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(24,119,242,0.3)', background: 'rgba(0,0,0,0.6)', color: copied ? '#34d399' : '#60a5fa', fontSize: 11, cursor: 'pointer' }}>
              {copied ? <CheckCircle size={11} /> : <Copy size={11} />} {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
            {!pixelCode.configured && (
              <p style={{ color: '#f87171', fontSize: 11, marginTop: 8 }}>
                ⚠️ META_PIXEL_ID yapılandırılmamış — gerçek Pixel ID'nizi Railway'e ekleyin
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ms-spin { to { transform: rotate(360deg); } }
        @keyframes ms-ping { 0%{transform:scale(1);opacity:0.6}100%{transform:scale(2);opacity:0} }
        @keyframes ms-ring-0 { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes ms-ring-1 { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes ms-ring-2 { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
