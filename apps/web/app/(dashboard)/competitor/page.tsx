'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Trash2, Zap, Globe, Search, BarChart3, Plus, Copy, CheckCircle, Target } from 'lucide-react'

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
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="70%" stopColor="rgba(16,185,129,0.06)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.15)" />
          </radialGradient>
          <radialGradient id={`sweepGrad_${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.45)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={cx} fill={`url(#radarGlow_${size})`} />
        {[0.28, 0.55, 0.78, 1.0].map(r => (
          <circle key={r} cx={cx} cy={cx} r={cx * r} fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth={0.8} />
        ))}
        <line x1={0} y1={cx} x2={size} y2={cx} stroke="rgba(16,185,129,0.12)" strokeWidth={0.6} />
        <line x1={cx} y1={0} x2={cx} y2={size} stroke="rgba(16,185,129,0.12)" strokeWidth={0.6} />
        <line x1={cx * 0.29} y1={cx * 0.29} x2={cx * 1.71} y2={cx * 1.71} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <line x1={cx * 1.71} y1={cx * 0.29} x2={cx * 0.29} y2={cx * 1.71} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />

        <path
          d={`M ${cx} ${cx} L ${cx + cx * 0.95} ${cx} A ${cx * 0.95} ${cx * 0.95} 0 0 0 ${cx + cx * 0.95 * Math.cos(-Math.PI / 3)} ${cx + cx * 0.95 * Math.sin(-Math.PI / 3)} Z`}
          fill={`url(#sweepGrad_${size})`} opacity={0.4}
          style={{ transformOrigin: `${cx}px ${cx}px`, animation: 'radarSweep 3s linear infinite' }}
        />
        <line x1={cx} y1={cx} x2={cx + cx * 0.95} y2={cx}
          stroke="#10b981" strokeWidth={1.5} opacity={0.85}
          style={{ transformOrigin: `${cx}px ${cx}px`, animation: 'radarSweep 3s linear infinite' }}
        />

        <circle cx={cx} cy={cx} r={3} fill="#10b981" opacity={0.9} />
        <circle cx={cx} cy={cx} r={6} fill="none" stroke="#10b981" strokeWidth={0.8} opacity={0.5} />

        {blips.map(b => (
          <g key={b.id}>
            <circle cx={b.x} cy={b.y} r={3} fill="#10b981" opacity={Math.max(0, 1 - b.age * 0.2)} />
            <circle cx={b.x} cy={b.y} r={7} fill="none" stroke="#10b981" strokeWidth={0.8} opacity={Math.max(0, 0.5 - b.age * 0.1)} />
          </g>
        ))}

        {([[2, 2, 1, 1], [size - 2, 2, -1, 1], [2, size - 2, 1, -1], [size - 2, size - 2, -1, -1]] as number[][]).map(([x, y, dx, dy], i) => {
          const len = size * 0.1
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={x + dx * len} y2={y} stroke="#10b981" strokeWidth={1.5} opacity={0.7} />
              <line x1={x} y1={y} x2={x} y2={y + dy * len} stroke="#10b981" strokeWidth={1.5} opacity={0.7} />
            </g>
          )
        })}

        <circle cx={cx} cy={cx} r={cx - 1} fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth={1.5} />
      </svg>
    </div>
  )
}

function FloatTarget({ size = 16, delay = '0s', color = '#10b981' }: { size?: number; delay?: string; color?: string }) {
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
  { id: 'google',         label: 'Google Maps',       icon: '🗺️', color: '#4285f4' },
  { id: 'google_reviews', label: 'Google Yorumları',  icon: '⭐', color: '#fbbc04' },
  { id: 'linkedin',       label: 'LinkedIn',          icon: '💼', color: '#0077b5' },
  { id: 'facebook',       label: 'Facebook',          icon: '📘', color: '#1877f2' },
  { id: 'instagram',      label: 'Instagram',         icon: '📸', color: '#e1306c' },
  { id: 'social_reviews', label: 'Sosyal Şikayetler', icon: '😤', color: '#ef4444' },
  { id: 'complaints',     label: 'Şikayet Siteleri',  icon: '🔥', color: '#f97316' },
  { id: 'international',  label: 'Uluslararası B2B',  icon: '🌍', color: '#8b5cf6' },
]

type CountryConf = { code: string; name: string; region: string }

// ── Lead Row ───────────────────────────────────────────────────────────────────
function LeadRow({ lead }: { lead: any }) {
  const [copied, setCopied] = useState(false)
  const channel = lead.source?.match(/\(([^)]+)\)/)?.[1] || ''
  const ch = ALL_CHANNELS.find(c => channel.toLowerCase().includes(c.id.replace('_', ' '))) || ALL_CHANNELS[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', background: 'rgba(3,8,22,0.6)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 11, transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.3)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.1)'}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${ch.color}15`, border: `1px solid ${ch.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{ch.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
          {lead.phone && <span style={{ color: '#64748b', fontSize: 11 }}>📞 {lead.phone}</span>}
          {lead.city && <span style={{ color: '#64748b', fontSize: 11 }}>📍 {lead.city}</span>}
          <span style={{ color: `${ch.color}aa`, fontSize: 10, fontWeight: 600 }}>{channel}</span>
        </div>
      </div>
      <span style={{ background: lead.score >= 70 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: lead.score >= 70 ? '#34d399' : '#fbbf24', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{lead.score}%</span>
      {lead.phone && (
        <button onClick={() => { navigator.clipboard.writeText(lead.phone); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', color: copied ? '#34d399' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

  const REGION_LABELS: Record<string, string> = {
    europe: '🌍 Avrupa', middle_east: '🌙 Orta Doğu & MENA', americas: '🌎 Amerika', asia: '🌏 Asya',
  }

  const inp = { width: '100%', background: '#060b1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 13px', color: '#fff' as const, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inp, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}>
          {Object.entries(countryGroups).map(([region, cs]) => (
            <optgroup key={region} label={REGION_LABELS[region] || region}>
              {cs.map((c: CountryConf) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
      </div>
    )
  }

  function ChannelPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALL_CHANNELS.map(ch => (
          <button key={ch.id} onClick={() => onToggle(ch.id)} title={ch.label}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${selected.includes(ch.id) ? `${ch.color}55` : 'rgba(255,255,255,0.06)'}`, background: selected.includes(ch.id) ? `${ch.color}14` : 'rgba(0,0,0,0.3)', color: selected.includes(ch.id) ? ch.color : '#64748b', fontSize: 11, fontWeight: selected.includes(ch.id) ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
            {ch.icon} {ch.label}
          </button>
        ))}
      </div>
    )
  }

  const tabBtn = (active: boolean) => ({
    padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' as const, fontSize: 13, fontWeight: 600,
    background: active ? 'linear-gradient(135deg,#065f46,#10b981)' : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : '#64748b',
    boxShadow: active ? '0 4px 16px rgba(16,185,129,0.25)' : 'none',
  })

  const STATS = [
    { label: 'Takip Edilen',  value: competitors.length,                                                  color: '#10b981', icon: '🎯' },
    { label: 'Taranan',       value: competitors.filter(c => c.last_scanned_at).length,                  color: '#06b6d4', icon: '📡' },
    { label: 'Bulunan Lead',  value: leads.length,                                                        color: '#8b5cf6', icon: '👥' },
    { label: 'Aktif Ülke',    value: [...new Set(competitors.map(c => c.country || 'TR'))].length,       color: '#f59e0b', icon: '🌍' },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,8,20,0.98),rgba(2,8,18,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(16,185,129,0.15)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div style={{ position: 'absolute', top: -50, right: -30, width: 280, height: 280, background: 'radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 200, zIndex: 1, opacity: 0.5 }}><FloatTarget size={18} delay="0s" /></div>
        <div style={{ position: 'absolute', top: 55, right: 250, zIndex: 1, opacity: 0.4 }}><FloatTarget size={12} delay="1s" color="#06b6d4" /></div>
        <div style={{ position: 'absolute', bottom: 25, right: 210, zIndex: 1, opacity: 0.4 }}><FloatTarget size={14} delay="1.8s" color="#8b5cf6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <RadarScanner size={110} scanning={scanning !== null} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Rakip Hijacking</h1>
                <span style={{ background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>GLOBAL</span>
                <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>75 Ülke</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px', maxWidth: 480 }}>Rakiplerin müşterilerini tespit edin — Google yorumları, sosyal şikayetler, LinkedIn, B2B dizinler — 75 ülkede</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {['⭐ Google Yorumları', '😤 Şikayet Avcısı', '💼 LinkedIn', '🌍 75 Ülke', '📡 Otomatik Tarama'].map(f => (
                  <span key={f} style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#94a3b8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={scanAll} disabled={scanning === 'all' || !competitors.length}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)', cursor: scanning === 'all' || !competitors.length ? 'not-allowed' : 'pointer', background: 'rgba(16,185,129,0.08)', color: '#34d399', fontSize: 13, fontWeight: 700, opacity: !competitors.length ? 0.4 : 1, flexShrink: 0 }}>
            {scanning === 'all' ? <RefreshCw size={14} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Target size={14} />}
            Tümünü Tara
          </button>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {STATS.map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 60, height: 60, background: `radial-gradient(circle,${color}20 0%,transparent 70%)` }} />
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <p style={{ color, fontSize: 24, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{label}</p>
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

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 22, border: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { id: 'list',    label: `🎯 Rakip Listesi (${competitors.length})` },
          { id: 'hijack',  label: '⚡ Hızlı Tarama' },
          { id: 'leads',   label: `👥 Bulunan Leadler (${leads.length})` },
          { id: 'analyze', label: '🔬 Rakip Analizi' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={tabBtn(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: LIST ─────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(4,8,18,0.99))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Plus size={16} style={{ color: '#10b981' }} />
              <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Rakip Ekle</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Rakip firma adı *" style={inp} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Şehir / Bölge" style={inp} />
                <input value={newSector} onChange={e => setNewSector(e.target.value)} placeholder="Sektör" style={inp} />
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Ülke</label>
                <CountrySelect value={newCountry} onChange={setNewCountry} />
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 7 }}>Tarama Kanalları</label>
                <ChannelPicker selected={newChannels} onToggle={id => toggleCh(newChannels, setNewChannels, id)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div onClick={() => setAutoScan(!autoScan)} style={{ width: 40, height: 22, borderRadius: 11, background: autoScan ? 'linear-gradient(135deg,#065f46,#10b981)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 3, left: autoScan ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>Günlük otomatik tara</span>
              </label>
              <button onClick={addCompetitor} disabled={adding || !newName}
                style={{ padding: '11px', borderRadius: 11, border: 'none', cursor: adding || !newName ? 'not-allowed' : 'pointer', background: newName ? 'linear-gradient(135deg,#065f46,#10b981)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !newName ? 0.4 : 1, boxShadow: newName ? '0 6px 20px rgba(16,185,129,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {adding ? <RefreshCw size={14} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Plus size={14} />}
                {adding ? 'Ekleniyor...' : 'Rakip Ekle'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', height: 80, alignItems: 'center' }}>
                <RefreshCw size={22} style={{ color: '#475569', animation: 'rdrSpin 1s linear infinite' }} />
              </div>
            ) : competitors.length === 0 ? (
              <div style={{ background: 'rgba(2,8,20,0.98)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 48, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><RadarScanner size={80} /></div>
                <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Henüz rakip eklenmedi</p>
              </div>
            ) : competitors.map(comp => {
              const countryName = countries.find(c => c.code === (comp.country || 'TR'))?.name || comp.country || 'TR'
              return (
                <div key={comp.id} style={{ background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(4,8,18,0.99))', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 16, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Target size={18} style={{ color: '#10b981' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{comp.name}</p>
                        {comp.auto_scan && <span style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Otomatik</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
                        {comp.city && <span>📍 {comp.city}</span>}
                        <span>🌍 {countryName}</span>
                        {comp.sector && <span>🏭 {comp.sector}</span>}
                        {(comp.total_leads_found || 0) > 0 && <span style={{ color: '#10b981' }}>👥 {comp.total_leads_found} lead</span>}
                        {comp.last_scanned_at && <span>📡 {new Date(comp.last_scanned_at).toLocaleDateString('tr-TR')}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                        {(comp.channels || []).slice(0, 6).map((ch: string) => {
                          const c = ALL_CHANNELS.find(x => x.id === ch)
                          return c ? <span key={ch} style={{ background: `${c.color}12`, color: c.color, fontSize: 10, padding: '2px 6px', borderRadius: 6, border: `1px solid ${c.color}25` }}>{c.icon}</span> : null
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => scanComp(comp)} disabled={scanning === comp.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(16,185,129,0.3)', cursor: scanning === comp.id ? 'not-allowed' : 'pointer', background: 'rgba(16,185,129,0.08)', color: '#34d399', fontSize: 12, fontWeight: 600 }}>
                        {scanning === comp.id ? <RefreshCw size={12} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Zap size={12} />}
                        Tara
                      </button>
                      <button onClick={() => deleteComp(comp.id, comp.name)} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(127,29,29,0.25)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <div style={{ background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(4,8,18,0.99))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Zap size={16} style={{ color: '#10b981' }} />
              <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Hızlı Hijack</h2>
              <span style={{ color: '#475569', fontSize: 12 }}>listeye eklemeden tek seferlik</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={hName} onChange={e => setHName(e.target.value)} placeholder="Rakip firma adı *" style={inp} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={hCity} onChange={e => setHCity(e.target.value)} placeholder="Şehir *" style={inp} />
                <input value={hSector} onChange={e => setHSector(e.target.value)} placeholder="Sektör" style={inp} />
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Ülke</label>
                <CountrySelect value={hCountry} onChange={setHCountry} />
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 7 }}>Kanallar</label>
                <ChannelPicker selected={hChannels} onToggle={id => toggleCh(hChannels, setHChannels, id)} />
              </div>
              <button onClick={hijack} disabled={hijacking || !hName || !hCity}
                style={{ padding: '13px', borderRadius: 11, border: 'none', cursor: hijacking || !hName || !hCity ? 'not-allowed' : 'pointer', background: hName && hCity ? 'linear-gradient(135deg,#065f46,#10b981)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !hName || !hCity ? 0.4 : 1, boxShadow: hName && hCity ? '0 6px 20px rgba(16,185,129,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {hijacking ? <RefreshCw size={16} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Target size={16} />}
                {hijacking ? 'Taranıyor...' : 'Hijack Başlat'}
              </button>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(4,8,18,0.99))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column' }}>
            {hijacking ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
                <RadarScanner size={100} scanning={true} />
                <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Taranıyor...</p>
                <p style={{ color: '#64748b', fontSize: 13 }}>Google, sosyal medya ve şikayet siteleri</p>
              </div>
            ) : hijackResult ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12 }}>
                  <Target size={18} style={{ color: '#10b981' }} />
                  <div>
                    <p style={{ color: '#34d399', fontWeight: 700, fontSize: 14, margin: 0 }}>✅ {hijackResult.count} yeni lead!</p>
                    <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{hijackResult.skipped} tekrar atlandı · {hijackResult.competitor}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
                  {(hijackResult.leads || []).map((lead: any, i: number) => <LeadRow key={i} lead={lead} />)}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <RadarScanner size={90} />
                <p style={{ color: '#475569', fontSize: 13, marginTop: 14, textAlign: 'center' }}>Formu doldurun ve taramayı başlatın</p>
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
                style={{ ...inp, minWidth: 220, appearance: 'none', paddingRight: 32 }}>
                <option value="">Tüm rakipler ({leads.length})</option>
                {Object.keys(groupedLeads).map(name => (
                  <option key={name} value={name}>{name} ({groupedLeads[name].length})</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
            </div>
          </div>
          {leads.length === 0 ? (
            <div style={{ background: 'rgba(2,8,20,0.98)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 48, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><RadarScanner size={80} /></div>
              <p style={{ color: '#475569', fontSize: 14 }}>Henüz lead bulunamadı</p>
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
          <div style={{ background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(4,8,18,0.99))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <BarChart3 size={16} style={{ color: '#10b981' }} />
              <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Rakip Analizi</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={aName} onChange={e => setAName(e.target.value)} placeholder="Rakip firma adı *" style={inp} />
              <input value={aCity} onChange={e => setACity(e.target.value)} placeholder="Şehir" style={inp} />
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Ülke</label>
                <CountrySelect value={aCountry} onChange={setACountry} />
              </div>
              <button onClick={analyze} disabled={analyzing || !aName}
                style={{ padding: '12px', borderRadius: 11, border: 'none', cursor: analyzing || !aName ? 'not-allowed' : 'pointer', background: aName ? 'linear-gradient(135deg,#065f46,#10b981)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !aName ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {analyzing ? <RefreshCw size={14} style={{ animation: 'rdrSpin 1s linear infinite' }} /> : <Search size={14} />}
                {analyzing ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
              </button>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(4,8,18,0.99))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column' }}>
            {analyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
                <RadarScanner size={100} scanning={true} />
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>AI analiz ediyor...</p>
                <p style={{ color: '#64748b', fontSize: 13 }}>Google Maps, Trustpilot, LinkedIn, sosyal medya</p>
              </div>
            ) : analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{analysis.competitor?.name || aName}</h3>
                  {analysis.analysis?.threatLevel && (
                    <span style={{ background: analysis.analysis.threatLevel === 'high' ? 'rgba(239,68,68,0.15)' : analysis.analysis.threatLevel === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: analysis.analysis.threatLevel === 'high' ? '#f87171' : analysis.analysis.threatLevel === 'medium' ? '#fbbf24' : '#34d399', fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                      {analysis.analysis.threatLevel === 'high' ? '🔴 Yüksek Tehdit' : analysis.analysis.threatLevel === 'medium' ? '🟡 Orta Tehdit' : '🟢 Düşük Tehdit'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[
                    { label: 'Google Maps', value: analysis.channels?.googleMaps?.rating ? `⭐ ${analysis.channels.googleMaps.rating}` : '—' },
                    { label: 'Trustpilot', value: analysis.channels?.trustpilot?.rating ? `⭐ ${analysis.channels.trustpilot.rating}` : '—' },
                    { label: 'Şikayetvar', value: analysis.channels?.sikayetvar?.complaintCount ? `${analysis.channels.sikayetvar.complaintCount} şikayet` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                      <p style={{ color: '#64748b', fontSize: 10, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                      <p style={{ color: value === '—' ? '#334155' : '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
                {analysis.analysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {([
                      { label: '🔴 Zayıf Yönleri', items: analysis.analysis.weaknesses, color: '#ef4444' },
                      { label: '🟢 Fırsatlar', items: analysis.analysis.opportunities, color: '#10b981' },
                    ] as {label:string;items:string[];color:string}[]).map(({ label, items, color }) => (
                      <div key={label} style={{ background: `${color}06`, border: `1px solid ${color}20`, borderRadius: 12, padding: 14 }}>
                        <p style={{ color, fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>{label}</p>
                        {(items || []).map((item: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                            <span style={{ color: `${color}90`, fontSize: 10, marginTop: 2 }}>▸</span>
                            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.4 }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {analysis.analysis?.suggestedWhatsApp && (
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
                    <p style={{ color: '#34d399', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>💬 WhatsApp Mesaj Taslağı</p>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{analysis.analysis.suggestedWhatsApp}</p>
                    <button onClick={() => navigator.clipboard.writeText(analysis.analysis.suggestedWhatsApp)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'transparent', color: '#34d399', fontSize: 11, cursor: 'pointer' }}>
                      <Copy size={11} /> Kopyala
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
                <RadarScanner size={90} />
                <p style={{ color: '#475569', fontSize: 13 }}>Rakip adını girin ve analiz başlatın</p>
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
