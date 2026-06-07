'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  RefreshCw, Trash2, Zap, Search, BarChart3, Plus, Copy, CheckCircle, Target,
  MapPin, Star, Linkedin, Facebook, Instagram, MessageCircleWarning, Flame, Globe2,
  Radar, Users, Phone, Briefcase, TrendingDown, TrendingUp, MessageCircle,
} from 'lucide-react'

// ── Light theme tokens (dashboard/page.tsx ile aynı tasarım dili) ─────────────
const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'

const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

// ── RADAR SCANNER 3D Animation ────────────────────────────────────────────────
function RadarScanner({ size = 120, scanning = false }: { size?: number; scanning?: boolean }) {
  const [blips, setBlips] = useState<{ x: number; y: number; age: number; id: number }[]>([])

  useEffect(() => {
    if (!scanning) return
    const t = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const r = (0.2 + Math.random() * 0.75) * size * 0.44
      const x = size * 0.5 + Math.cos(angle) * r
      const y = size * 0.5 + Math.sin(angle) * r
      setBlips(prev => [...prev.slice(-6), { x, y, age: 0, id: Date.now() }])
    }, 900)
    const fade = setInterval(() => setBlips(prev => prev.map(b => ({ ...b, age: b.age + 1 })).filter(b => b.age < 5)), 400)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [scanning, size])

  const cx = size / 2

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`radarGlow_${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(13,148,136,0)" />
            <stop offset="70%" stopColor="rgba(13,148,136,0.04)" />
            <stop offset="100%" stopColor="rgba(13,148,136,0.10)" />
          </radialGradient>
          <radialGradient id={`sweepGrad_${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(13,148,136,0.22)" />
            <stop offset="100%" stopColor="rgba(13,148,136,0)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={cx} fill={`url(#radarGlow_${size})`} />
        {[0.28, 0.55, 0.78, 1.0].map(r => (
          <circle key={r} cx={cx} cy={cx} r={cx * r} fill="none" stroke="rgba(13,148,136,0.16)" strokeWidth={0.8} />
        ))}
        <line x1={0} y1={cx} x2={size} y2={cx} stroke="rgba(13,148,136,0.10)" strokeWidth={0.6} />
        <line x1={cx} y1={0} x2={cx} y2={size} stroke="rgba(13,148,136,0.10)" strokeWidth={0.6} />
        <line x1={cx * 0.29} y1={cx * 0.29} x2={cx * 1.71} y2={cx * 1.71} stroke="rgba(13,148,136,0.06)" strokeWidth={0.5} />
        <line x1={cx * 1.71} y1={cx * 0.29} x2={cx * 0.29} y2={cx * 1.71} stroke="rgba(13,148,136,0.06)" strokeWidth={0.5} />

        <path
          d={`M ${cx} ${cx} L ${cx + cx * 0.95} ${cx} A ${cx * 0.95} ${cx * 0.95} 0 0 0 ${cx + cx * 0.95 * Math.cos(-Math.PI / 3)} ${cx + cx * 0.95 * Math.sin(-Math.PI / 3)} Z`}
          fill={`url(#sweepGrad_${size})`} opacity={0.5}
          style={{ transformOrigin: `${cx}px ${cx}px`, animation: 'radarSweep 3s linear infinite' }}
        />
        <line x1={cx} y1={cx} x2={cx + cx * 0.95} y2={cx}
          stroke="#0d9488" strokeWidth={1.5} opacity={0.6}
          style={{ transformOrigin: `${cx}px ${cx}px`, animation: 'radarSweep 3s linear infinite' }}
        />

        <circle cx={cx} cy={cx} r={3} fill="#0d9488" opacity={0.8} />
        <circle cx={cx} cy={cx} r={6} fill="none" stroke="#0d9488" strokeWidth={0.8} opacity={0.4} />

        {blips.map(b => (
          <g key={b.id}>
            <circle cx={b.x} cy={b.y} r={3} fill="#0d9488" opacity={Math.max(0, 0.85 - b.age * 0.17)} />
            <circle cx={b.x} cy={b.y} r={7} fill="none" stroke="#0d9488" strokeWidth={0.8} opacity={Math.max(0, 0.4 - b.age * 0.08)} />
          </g>
        ))}

        {([[2, 2, 1, 1], [size - 2, 2, -1, 1], [2, size - 2, 1, -1], [size - 2, size - 2, -1, -1]] as number[][]).map(([x, y, dx, dy], i) => {
          const len = size * 0.1
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={x + dx * len} y2={y} stroke="#0d9488" strokeWidth={1.5} opacity={0.45} />
              <line x1={x} y1={y} x2={x} y2={y + dy * len} stroke="#0d9488" strokeWidth={1.5} opacity={0.45} />
            </g>
          )
        })}

        <circle cx={cx} cy={cx} r={cx - 1} fill="none" stroke="rgba(13,148,136,0.25)" strokeWidth={1.5} />
      </svg>
    </div>
  )
}

function FloatTarget({ size = 16, delay = '0s', color = '#0d9488' }: { size?: number; delay?: string; color?: string }) {
  return (
    <div className="rdr-float" style={{ animationDelay: delay, width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
        <circle cx={size / 2} cy={size / 2} r={2.5} fill={color} opacity={0.6} />
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={color} strokeWidth={0.6} opacity={0.4} />
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={color} strokeWidth={0.6} opacity={0.4} />
      </svg>
    </div>
  )
}

// ── Channel config ─────────────────────────────────────────────────────────────
const ALL_CHANNELS = [
  { id: 'google',         label: 'Google Maps',       Icon: MapPin,                color: '#4285f4' },
  { id: 'google_reviews', label: 'Google Yorumları',  Icon: Star,                  color: '#d19405' },
  { id: 'linkedin',       label: 'LinkedIn',          Icon: Linkedin,              color: '#0077b5' },
  { id: 'facebook',       label: 'Facebook',          Icon: Facebook,              color: '#1877f2' },
  { id: 'instagram',      label: 'Instagram',         Icon: Instagram,             color: '#e1306c' },
  { id: 'social_reviews', label: 'Sosyal Şikayetler', Icon: MessageCircleWarning,  color: '#dc2626' },
  { id: 'complaints',     label: 'Şikayet Siteleri',  Icon: Flame,                 color: '#ea580c' },
  { id: 'international',  label: 'Uluslararası B2B',  Icon: Globe2,                color: '#7c3aed' },
]

type CountryConf = { code: string; name: string; region: string }

const REGION_LABELS: Record<string, string> = {
  europe: 'Avrupa', middle_east: 'Orta Doğu & MENA', americas: 'Amerika', asia: 'Asya',
}

// ── Module-level: Country select & Channel picker (re-render kimliği korunur) ──
function CountrySelect({ value, onChange, countryGroups }: { value: string; onChange: (v: string) => void; countryGroups: Record<string, CountryConf[]> }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}>
        {Object.entries(countryGroups).map(([region, cs]) => (
          <optgroup key={region} label={REGION_LABELS[region] || region}>
            {cs.map((c: CountryConf) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </optgroup>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: tx2, pointerEvents: 'none' }}>▾</span>
    </div>
  )
}

function ChannelPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ALL_CHANNELS.map(ch => {
        const active = selected.includes(ch.id)
        return (
          <button key={ch.id} onClick={() => onToggle(ch.id)} title={ch.label} aria-pressed={active}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${active ? `${ch.color}55` : '#e2e8f0'}`, background: active ? `${ch.color}14` : surf, color: active ? ch.color : tx2, fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
            <ch.Icon size={12} /> {ch.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Lead Row ───────────────────────────────────────────────────────────────────
function LeadRow({ lead }: { lead: any }) {
  const [copied, setCopied] = useState(false)
  const channel = lead.source?.match(/\(([^)]+)\)/)?.[1] || ''
  const ch = ALL_CHANNELS.find(c => channel.toLowerCase().includes(c.id.replace('_', ' '))) || ALL_CHANNELS[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', background: surf, border: '1px solid #f1f5f9', borderRadius: 11, transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${ch.color}55`}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#f1f5f9'}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${ch.color}15`, border: `1px solid ${ch.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ch.Icon size={16} style={{ color: ch.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: tx1, fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {lead.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 11 }}><Phone size={11} /> {lead.phone}</span>}
          {lead.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 11 }}><MapPin size={11} /> {lead.city}</span>}
          <span style={{ color: ch.color, fontSize: 10, fontWeight: 600 }}>{channel}</span>
        </div>
      </div>
      <span style={{ background: lead.score >= 70 ? '#ecfdf5' : '#fffbeb', color: lead.score >= 70 ? accentEmerald : '#b45309', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{lead.score}%</span>
      {lead.phone && (
        <button onClick={() => { navigator.clipboard.writeText(lead.phone); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          aria-label="Telefonu kopyala"
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', cursor: 'pointer', background: copied ? '#ecfdf5' : '#ffffff', color: copied ? accentEmerald : tx2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
        </button>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompetitorPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'list' | 'hijack' | 'leads' | 'analyze'>('list')
  const [competitors, setCompetitors] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [groupedLeads, setGroupedLeads] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [countries, setCountries] = useState<CountryConf[]>([])

  const [newName, setNewName] = useState(''); const [newCity, setNewCity] = useState('')
  const [newSector, setNewSector] = useState(''); const [newCountry, setNewCountry] = useState('TR')
  const [newChannels, setNewChannels] = useState(['google', 'google_reviews', 'linkedin', 'social_reviews'])
  const [autoScan, setAutoScan] = useState(true); const [adding, setAdding] = useState(false)

  const [hName, setHName] = useState(''); const [hCity, setHCity] = useState('')
  const [hSector, setHSector] = useState(''); const [hCountry, setHCountry] = useState('TR')
  const [hChannels, setHChannels] = useState(['google', 'google_reviews', 'linkedin', 'social_reviews'])
  const [hijacking, setHijacking] = useState(false); const [hijackResult, setHijackResult] = useState<any>(null)

  const [aName, setAName] = useState(''); const [aCity, setACity] = useState('')
  const [aCountry, setACountry] = useState('TR'); const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [filterComp, setFilterComp] = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const load = async () => {
    setLoading(true)
    try {
      const [c, l, cnt] = await Promise.allSettled([
        api.get('/api/competitor/list'),
        api.get('/api/competitor/leads'),
        api.get('/api/competitor/countries'),
      ])
      if (c.status === 'fulfilled') setCompetitors(c.value.competitors || [])
      if (l.status === 'fulfilled') { setLeads(l.value.leads || []); setGroupedLeads(l.value.grouped || {}) }
      if (cnt.status === 'fulfilled') setCountries(cnt.value.countries || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const addCompetitor = async () => {
    if (!newName) return
    setAdding(true)
    try {
      await api.post('/api/competitor/list', { name: newName, city: newCity, sector: newSector, channels: newChannels, auto_scan: autoScan, country: newCountry })
      showMsg('success', `${newName} eklendi!`); setNewName(''); setNewCity(''); setNewSector(''); load()
    } catch (e: any) { showMsg('error', e.message) } finally { setAdding(false) }
  }

  const deleteComp = async (id: string, name: string) => {
    try { await api.delete(`/api/competitor/list/${id}`); setCompetitors(prev => prev.filter(c => c.id !== id)); showMsg('success', `${name} silindi`) }
    catch (e: any) { showMsg('error', e.message) }
  }

  const scanComp = async (comp: any) => {
    setScanning(comp.id)
    try { await api.post(`/api/competitor/scan/${comp.id}`, { maxResults: 20 }); showMsg('success', `${comp.name} taranıyor...`); setTimeout(load, 5000) }
    catch (e: any) { showMsg('error', e.message) } finally { setScanning(null) }
  }

  const scanAll = async () => {
    setScanning('all')
    try { const d = await api.post('/api/competitor/scan-all', {}); showMsg('success', d.message); load() }
    catch (e: any) { showMsg('error', e.message) } finally { setScanning(null) }
  }

  const hijack = async () => {
    if (!hName || !hCity) return
    setHijacking(true); setHijackResult(null)
    try {
      const data = await api.post('/api/competitor/hijack', { competitorName: hName, city: hCity, targetSector: hSector, channels: hChannels, country: hCountry, maxResults: 30 })
      setHijackResult(data); showMsg('success', data.message); load()
    } catch (e: any) { showMsg('error', e.message) } finally { setHijacking(false) }
  }

  const analyze = async () => {
    if (!aName) return
    setAnalyzing(true); setAnalysis(null)
    try { const d = await api.post('/api/competitor/analyze', { competitorName: aName, city: aCity, country: aCountry }); setAnalysis(d) }
    catch (e: any) { showMsg('error', e.message) } finally { setAnalyzing(false) }
  }

  const toggleCh = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])

  const countryGroups = countries.reduce((acc: Record<string, CountryConf[]>, c) => {
    if (!acc[c.region]) acc[c.region] = []; acc[c.region].push(c); return acc
  }, {})

  const tabBtn = (active: boolean) => ({
    padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' as const, fontSize: 13, fontWeight: 600,
    background: active ? 'linear-gradient(135deg,#0f766e,#0d9488)' : 'transparent',
    color: active ? '#ffffff' : tx2,
    boxShadow: active ? '0 4px 16px rgba(13,148,136,0.25)' : 'none',
  })

  const STATS = [
    { label: 'Takip Edilen',  value: competitors.length,                                            color: accentTeal,    Icon: Target },
    { label: 'Taranan',       value: competitors.filter(c => c.last_scanned_at).length,             color: '#2563eb',     Icon: Radar },
    { label: 'Bulunan Lead',  value: leads.length,                                                   color: '#7c3aed',     Icon: Users },
    { label: t('competitor.aktif_ulke', 'Aktif Ülke'), value: [...new Set(competitors.map(c => c.country || 'TR'))].length, color: '#b45309', Icon: Globe2 },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#f0fdfa 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(13,148,136,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(13,148,136,0.04) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div style={{ position: 'absolute', top: -50, right: -30, width: 280, height: 280, background: 'radial-gradient(circle,rgba(13,148,136,0.07) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 200, zIndex: 1, opacity: 0.6 }}><FloatTarget size={18} delay="0s" /></div>
        <div style={{ position: 'absolute', top: 55, right: 250, zIndex: 1, opacity: 0.5 }}><FloatTarget size={12} delay="1s" color="#2563eb" /></div>
        <div style={{ position: 'absolute', bottom: 25, right: 210, zIndex: 1, opacity: 0.5 }}><FloatTarget size={14} delay="1.8s" color="#7c3aed" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <RadarScanner size={110} scanning={scanning !== null} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: tx1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Rakip Hijacking</h1>
                <span style={{ background: 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#ffffff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>GLOBAL</span>
                <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: accentEmerald, fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>{t('competitor.75_ulke', '75 Ülke')}</span>
              </div>
              <p style={{ color: tx2, fontSize: 14, margin: '0 0 14px', maxWidth: 480 }}>{t('competitor.rakiplerin_musterilerini', 'Rakiplerin müşterilerini tespit edin — Google yorumları, sosyal şikayetler, LinkedIn, B2B dizinler — 75 ülkede')}</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {[
                  { Icon: Star, label: 'Google Yorumları' },
                  { Icon: MessageCircleWarning, label: 'Şikayet Avcısı' },
                  { Icon: Linkedin, label: 'LinkedIn' },
                  { Icon: Globe2, label: '75 Ülke' },
                  { Icon: Radar, label: 'Otomatik Tarama' },
                ].map(f => (
                  <span key={f.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: surf, border: '1px solid #f1f5f9', color: tx2, fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                    <f.Icon size={11} /> {f.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={scanAll} disabled={scanning === 'all' || !competitors.length}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: `1px solid ${accentEmerald}40`, cursor: scanning === 'all' || !competitors.length ? 'not-allowed' : 'pointer', background: '#ecfdf5', color: accentEmerald, fontSize: 13, fontWeight: 700, opacity: !competitors.length ? 0.4 : 1, flexShrink: 0 }}>
            {scanning === 'all' ? <RefreshCw size={14} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Target size={14} />}
            Tümünü Tara
          </button>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {STATS.map(({ label, value, color, Icon }) => (
            <div key={label} style={{ ...card, padding: '14px 12px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p style={{ color: tx1, fontSize: 24, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: surf, padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 22, border: '1px solid #f1f5f9' }}>
        {[
          { id: 'list',    label: `Rakip Listesi (${competitors.length})`, Icon: Target },
          { id: 'hijack',  label: t('competitor.hizli_tarama', 'Hızlı Tarama'), Icon: Zap },
          { id: 'leads',   label: `Bulunan Leadler (${leads.length})`, Icon: Users },
          { id: 'analyze', label: 'Rakip Analizi', Icon: BarChart3 },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)} style={{ ...tabBtn(tab === tb.id), display: 'flex', alignItems: 'center', gap: 6 }}>
            <tb.Icon size={14} /> {tb.label}
          </button>
        ))}
      </div>

      {/* ── TAB: LIST ─────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Plus size={16} style={{ color: accentTeal }} />
              <h2 style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0 }}>Rakip Ekle</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('competitor.rakip_firma_adi', 'Rakip firma adı *')} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder={t('competitor.sehir_bolge', 'Şehir / Bölge')} style={inputStyle} />
                <input value={newSector} onChange={e => setNewSector(e.target.value)} placeholder={t('competitor.sektor', 'Sektör')} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>{t('competitor.ulke', 'Ülke')}</label>
                <CountrySelect value={newCountry} onChange={setNewCountry} countryGroups={countryGroups} />
              </div>
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 7 }}>{t('competitor.tarama_kanallari', 'Tarama Kanalları')}</label>
                <ChannelPicker selected={newChannels} onToggle={id => toggleCh(newChannels, setNewChannels, id)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div role="switch" aria-checked={autoScan} tabIndex={0}
                  onClick={() => setAutoScan(!autoScan)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAutoScan(!autoScan) } }}
                  style={{ width: 40, height: 22, borderRadius: 11, background: autoScan ? 'linear-gradient(135deg,#0f766e,#0d9488)' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer', outline: 'none' }}>
                  <div style={{ position: 'absolute', top: 3, left: autoScan ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                </div>
                <span style={{ color: tx2, fontSize: 12, cursor: 'pointer' }} onClick={() => setAutoScan(!autoScan)}>{t('competitor.gunluk_otomatik_tara', 'Günlük otomatik tara')}</span>
              </div>
              <button onClick={addCompetitor} disabled={adding || !newName}
                style={{ padding: '11px', borderRadius: 11, border: 'none', cursor: adding || !newName ? 'not-allowed' : 'pointer', background: newName ? 'linear-gradient(135deg,#0f766e,#0d9488)' : surf, color: newName ? '#ffffff' : tx3, fontSize: 14, fontWeight: 700, boxShadow: newName ? '0 6px 20px rgba(13,148,136,0.25)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {adding ? <RefreshCw size={14} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Plus size={14} />}
                {adding ? 'Ekleniyor...' : 'Rakip Ekle'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', height: 80, alignItems: 'center' }}>
                <RefreshCw size={22} style={{ color: tx3, animation: 'rdrSpin 1s linear infinite' }} />
              </div>
            ) : competitors.length === 0 ? (
              <div style={{ ...card, padding: 48, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><RadarScanner size={80} /></div>
                <p style={{ color: tx3, fontSize: 14, margin: 0 }}>{t('competitor.henuz_rakip_eklenmedi', 'Henüz rakip eklenmedi')}</p>
              </div>
            ) : competitors.map(comp => {
              const countryName = countries.find(c => c.code === (comp.country || 'TR'))?.name || comp.country || 'TR'
              return (
                <div key={comp.id} style={{ ...card, borderRadius: 16, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Target size={18} style={{ color: accentEmerald }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0 }}>{comp.name}</p>
                        {comp.auto_scan && <span style={{ background: '#ecfdf5', color: accentEmerald, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Otomatik</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: tx2, alignItems: 'center' }}>
                        {comp.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {comp.city}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe2 size={11} /> {countryName}</span>
                        {comp.sector && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={11} /> {comp.sector}</span>}
                        {(comp.total_leads_found || 0) > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: accentEmerald }}><Users size={11} /> {comp.total_leads_found} lead</span>}
                        {comp.last_scanned_at && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Radar size={11} /> {new Date(comp.last_scanned_at).toLocaleDateString()}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                        {(comp.channels || []).slice(0, 6).map((ch: string) => {
                          const c = ALL_CHANNELS.find(x => x.id === ch)
                          return c ? (
                            <span key={ch} title={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: `${c.color}12`, color: c.color, borderRadius: 6, border: `1px solid ${c.color}25` }}>
                              <c.Icon size={11} />
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => scanComp(comp)} disabled={scanning === comp.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: `1px solid ${accentEmerald}40`, cursor: scanning === comp.id ? 'not-allowed' : 'pointer', background: '#ecfdf5', color: accentEmerald, fontSize: 12, fontWeight: 600 }}>
                        {scanning === comp.id ? <RefreshCw size={12} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Zap size={12} />}
                        Tara
                      </button>
                      <button onClick={() => deleteComp(comp.id, comp.name)} aria-label={`${comp.name} sil`}
                        style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid #fecaca', cursor: 'pointer', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB: HIJACK ───────────────────────────────────────────────────── */}
      {tab === 'hijack' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Zap size={16} style={{ color: accentTeal }} />
              <h2 style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0 }}>{t('competitor.hizli_hijack', 'Hızlı Hijack')}</h2>
              <span style={{ color: tx3, fontSize: 12 }}>listeye eklemeden tek seferlik</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={hName} onChange={e => setHName(e.target.value)} placeholder={t('competitor.rakip_firma_adi', 'Rakip firma adı *')} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={hCity} onChange={e => setHCity(e.target.value)} placeholder={t('competitor.sehir', 'Şehir *')} style={inputStyle} />
                <input value={hSector} onChange={e => setHSector(e.target.value)} placeholder={t('competitor.sektor', 'Sektör')} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>{t('competitor.ulke', 'Ülke')}</label>
                <CountrySelect value={hCountry} onChange={setHCountry} countryGroups={countryGroups} />
              </div>
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 7 }}>Kanallar</label>
                <ChannelPicker selected={hChannels} onToggle={id => toggleCh(hChannels, setHChannels, id)} />
              </div>
              <button onClick={hijack} disabled={hijacking || !hName || !hCity}
                style={{ padding: '13px', borderRadius: 11, border: 'none', cursor: hijacking || !hName || !hCity ? 'not-allowed' : 'pointer', background: hName && hCity ? 'linear-gradient(135deg,#0f766e,#0d9488)' : surf, color: hName && hCity ? '#ffffff' : tx3, fontSize: 14, fontWeight: 700, boxShadow: hName && hCity ? '0 6px 20px rgba(13,148,136,0.25)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {hijacking ? <RefreshCw size={16} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Target size={16} />}
                {hijacking ? 'Taranıyor...' : 'Hijack Başlat'}
              </button>
            </div>
          </div>

          <div style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column' }}>
            {hijacking ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
                <RadarScanner size={100} scanning={true} />
                <p style={{ color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{t('competitor.taraniyor', 'Taranıyor...')}</p>
                <p style={{ color: tx2, fontSize: 13 }}>{t('competitor.google_sosyal_medya_ve_si', 'Google, sosyal medya ve şikayet siteleri')}</p>
              </div>
            ) : hijackResult ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12 }}>
                  <CheckCircle size={18} style={{ color: accentEmerald }} />
                  <div>
                    <p style={{ color: accentEmerald, fontWeight: 700, fontSize: 14, margin: 0 }}>{hijackResult.count} yeni lead!</p>
                    <p style={{ color: tx2, fontSize: 12, margin: 0 }}>{hijackResult.skipped} tekrar atlandı · {hijackResult.competitor}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
                  {(hijackResult.leads || []).map((lead: any, i: number) => <LeadRow key={i} lead={lead} />)}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <RadarScanner size={90} />
                <p style={{ color: tx3, fontSize: 13, marginTop: 14, textAlign: 'center' }}>{t('competitor.formu_doldurun_ve_taramay', 'Formu doldurun ve taramayı başlatın')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: LEADS ────────────────────────────────────────────────────── */}
      {tab === 'leads' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <select value={filterComp} onChange={e => setFilterComp(e.target.value)}
                style={{ ...inputStyle, minWidth: 220, appearance: 'none', paddingRight: 32 }}>
                <option value="">Tüm rakipler ({leads.length})</option>
                {Object.keys(groupedLeads).map(name => (
                  <option key={name} value={name}>{name} ({groupedLeads[name].length})</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: tx2, pointerEvents: 'none' }}>▾</span>
            </div>
          </div>
          {leads.length === 0 ? (
            <div style={{ ...card, padding: 48, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><RadarScanner size={80} /></div>
              <p style={{ color: tx3, fontSize: 14 }}>{t('competitor.henuz_lead_bulunamadi', 'Henüz lead bulunamadı')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(filterComp ? groupedLeads[filterComp] || [] : leads).map((lead: any) => <LeadRow key={lead.id} lead={lead} />)}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ANALYZE ──────────────────────────────────────────────────── */}
      {tab === 'analyze' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <BarChart3 size={16} style={{ color: accentTeal }} />
              <h2 style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0 }}>Rakip Analizi</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={aName} onChange={e => setAName(e.target.value)} placeholder={t('competitor.rakip_firma_adi', 'Rakip firma adı *')} style={inputStyle} />
              <input value={aCity} onChange={e => setACity(e.target.value)} placeholder={t('competitor.sehir', 'Şehir')} style={inputStyle} />
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>{t('competitor.ulke', 'Ülke')}</label>
                <CountrySelect value={aCountry} onChange={setACountry} countryGroups={countryGroups} />
              </div>
              <button onClick={analyze} disabled={analyzing || !aName}
                style={{ padding: '12px', borderRadius: 11, border: 'none', cursor: analyzing || !aName ? 'not-allowed' : 'pointer', background: aName ? 'linear-gradient(135deg,#0f766e,#0d9488)' : surf, color: aName ? '#ffffff' : tx3, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {analyzing ? <RefreshCw size={14} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Search size={14} />}
                {analyzing ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
              </button>
            </div>
          </div>

          <div style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column' }}>
            {analyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
                <RadarScanner size={100} scanning={true} />
                <p style={{ color: tx1, fontWeight: 700, fontSize: 15 }}>AI analiz ediyor...</p>
                <p style={{ color: tx2, fontSize: 13 }}>Google Maps, Trustpilot, LinkedIn, sosyal medya</p>
              </div>
            ) : analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{analysis.competitor?.name || aName}</h3>
                  {analysis.analysis?.threatLevel && (() => {
                    const level = analysis.analysis.threatLevel
                    const meta = level === 'high' ? { bg: '#fef2f2', dot: '#dc2626', text: '#dc2626', label: 'Yüksek Tehdit' }
                      : level === 'medium' ? { bg: '#fffbeb', dot: '#b45309', text: '#b45309', label: 'Orta Tehdit' }
                      : { bg: '#ecfdf5', dot: accentEmerald, text: accentEmerald, label: 'Düşük Tehdit' }
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.bg, color: meta.text, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
                        {meta.label}
                      </span>
                    )
                  })()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[
                    { label: 'Google Maps', rating: analysis.channels?.googleMaps?.rating },
                    { label: 'Trustpilot', rating: analysis.channels?.trustpilot?.rating },
                    { label: t('competitor.sikayetvar', 'Şikayetvar'), complaints: analysis.channels?.sikayetvar?.complaintCount },
                  ].map(({ label, rating, complaints }) => (
                    <div key={label} style={{ background: surf, border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                      <p style={{ color: tx2, fontSize: 10, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                      {rating ? (
                        <p style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Star size={13} style={{ color: '#d19405' }} /> {rating}
                        </p>
                      ) : complaints ? (
                        <p style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0 }}>{complaints} şikayet</p>
                      ) : (
                        <p style={{ color: tx3, fontSize: 15, fontWeight: 700, margin: 0 }}>—</p>
                      )}
                    </div>
                  ))}
                </div>
                {analysis.analysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {([
                      { label: t('competitor.zayif_yonleri', 'Zayıf Yönleri'), items: analysis.analysis.weaknesses, color: '#dc2626', Icon: TrendingDown },
                      { label: t('competitor.firsatlar', 'Fırsatlar'), items: analysis.analysis.opportunities, color: accentEmerald, Icon: TrendingUp },
                    ] as {label:string;items:string[];color:string;Icon:typeof TrendingUp}[]).map(({ label, items, color, Icon }) => (
                      <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 12, padding: 14 }}>
                        <p style={{ color, fontSize: 12, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={13} /> {label}</p>
                        {(items || []).map((item: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                            <span style={{ color: `${color}90`, fontSize: 10, marginTop: 2 }}>▸</span>
                            <p style={{ color: tx2, fontSize: 12, margin: 0, lineHeight: 1.4 }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {analysis.analysis?.suggestedWhatsApp && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: 16 }}>
                    <p style={{ color: accentEmerald, fontSize: 12, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageCircle size={13} /> {t('competitor.whatsapp_mesaj_taslagi', 'WhatsApp Mesaj Taslağı')}
                    </p>
                    <p style={{ color: tx2, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{analysis.analysis.suggestedWhatsApp}</p>
                    <button onClick={() => navigator.clipboard.writeText(analysis.analysis.suggestedWhatsApp)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${accentEmerald}40`, background: '#ffffff', color: accentEmerald, fontSize: 11, cursor: 'pointer' }}>
                      <Copy size={11} /> Kopyala
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
                <RadarScanner size={90} />
                <p style={{ color: tx3, fontSize: 13 }}>{t('competitor.rakip_adini_girin_ve_anal', 'Rakip adını girin ve analiz başlatın')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rdr-float { animation: rdrFloatAnim 4s ease-in-out infinite; }
        @keyframes rdrFloatAnim { 0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-8px);opacity:.8} }
        @keyframes rdrSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
