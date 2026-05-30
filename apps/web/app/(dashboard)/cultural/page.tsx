'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Copy, CheckCircle, Globe, Zap, Languages, Clock, ChevronDown, Search, MessageSquare } from 'lucide-react'

// ── CULTURAL GLOBE — 3D Globe with Neural Cultural Connections ──────────────
// Theme: world map, cultural bridges, language nodes, global communication
function CulturalGlobe({ size = 110, activeCountries = [], rotating = false }: { size?: number; activeCountries?: string[]; rotating?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [angle, setAngle] = useState(0)
  const [connections, setConnections] = useState<Array<{ from: number[]; to: number[]; color: string; age: number; id: number }>>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setAngle(a => (a + 0.3) % 360), 16)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!rotating || !mounted) return
    const t = setInterval(() => {
      const x1 = (Math.random() - 0.5) * 1.4, y1 = (Math.random() - 0.5) * 1.4
      const x2 = (Math.random() - 0.5) * 1.4, y2 = (Math.random() - 0.5) * 1.4
      const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899']
      const color = colors[Math.floor(Math.random() * colors.length)]
      setConnections(prev => [...prev.slice(-5), { from: [x1, y1], to: [x2, y2], color, age: 0, id: Date.now() + Math.random() }])
    }, 1200)
    const fade = setInterval(() => setConnections(prev => prev.map(c => ({ ...c, age: c.age + 1 })).filter(c => c.age < 6)), 400)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [rotating, mounted])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size

  // Globe latitude lines (ellipses)
  const latLines = [-0.7, -0.4, 0, 0.4, 0.7].map(lat => ({
    ry: s * 0.38 * Math.cos(Math.asin(lat)),
    y: cx + lat * s * 0.38,
    opacity: 0.12 + Math.abs(lat) * 0.05,
  }))

  // Longitude lines (animated rotation)
  const lonLines = [0, 30, 60, 90, 120, 150].map(deg => {
    const a = (deg + angle) * Math.PI / 180
    return { angle: a, isVisible: Math.cos(a) > -0.2 }
  })

  // Country node positions (approximate on globe surface)
  const COUNTRY_NODES: Record<string, [number, number]> = {
    TR: [0.3, -0.1], DE: [0.05, -0.35], AE: [0.45, 0.1],
    US: [-0.45, -0.2], SA: [0.38, 0.15], GB: [-0.05, -0.38],
    FR: [0.0, -0.32], KZ: [0.55, -0.2], BR: [-0.3, 0.35],
    JP: [0.7, -0.15], IN: [0.55, 0.1], CN: [0.65, -0.1],
    RU: [0.5, -0.35], EG: [0.3, 0.1], ZA: [0.2, 0.5],
  }

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {/* Globe sphere gradient — deep ocean blue */}
          <radialGradient id={`cgSphere${s}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="25%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#0284c7" />
            <stop offset="80%" stopColor="#0c4a6e" />
            <stop offset="100%" stopColor="#001524" />
          </radialGradient>
          {/* Outer glow */}
          <radialGradient id={`cgGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(6,182,212,0)" />
            <stop offset="60%" stopColor="rgba(6,182,212,0.06)" />
            <stop offset="85%" stopColor="rgba(139,92,246,0.1)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.18)" />
          </radialGradient>
          {/* Atmosphere glow ring */}
          <radialGradient id={`cgAtmo${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="rgba(6,182,212,0)" />
            <stop offset="90%" stopColor="rgba(6,182,212,0.25)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </radialGradient>
          <filter id="cgNodeGlow"><feGaussianBlur stdDeviation="2" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <filter id="cgConnGlow"><feGaussianBlur stdDeviation="1.5"/></filter>
        </defs>

        {/* ── AMBIENT GLOW ── */}
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#cgGlow${s})`} />

        {/* ── ATMOSPHERE RING ── */}
        <circle cx={cx} cy={cx} r={s * 0.44}
          fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth={s * 0.04}
          style={{ filter: 'blur(4px)' }} />

        {/* ── GLOBE SPHERE ── */}
        <circle cx={cx} cy={cx} r={s * 0.4}
          fill={`url(#cgSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.2}px rgba(6,182,212,0.6)) drop-shadow(0 0 ${s*0.4}px rgba(6,182,212,0.25))` }} />

        {/* ── LATITUDE LINES ── */}
        {latLines.map(({ ry, y, opacity }, i) => (
          <ellipse key={i} cx={cx} cy={y} rx={s * 0.4} ry={Math.max(1, ry)}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.6} opacity={opacity} />
        ))}

        {/* ── LONGITUDE LINES (rotating) ── */}
        {lonLines.map(({ angle: a, isVisible }, i) => isVisible ? (
          <ellipse key={i} cx={cx} cy={cx} rx={Math.abs(Math.cos(a)) * s * 0.4} ry={s * 0.4}
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.6}
            opacity={0.5 + 0.5 * Math.cos(a)} />
        ) : null)}

        {/* ── NEURAL CULTURAL CONNECTIONS ── */}
        {connections.map(conn => {
          const x1 = cx + conn.from[0] * s * 0.38
          const y1 = cx + conn.from[1] * s * 0.38
          const x2 = cx + conn.to[0] * s * 0.38
          const y2 = cx + conn.to[1] * s * 0.38
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - s * 0.12
          const opacity = Math.max(0, 0.8 - conn.age * 0.12)
          return (
            <g key={conn.id}>
              <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none" stroke={conn.color} strokeWidth={1.2} opacity={opacity}
                style={{ filter: `drop-shadow(0 0 4px ${conn.color})` }} />
              <circle cx={x2} cy={y2} r={3} fill={conn.color} opacity={opacity}
                style={{ filter: `drop-shadow(0 0 6px ${conn.color})` }} />
            </g>
          )
        })}

        {/* ── COUNTRY NODES ── */}
        {Object.entries(COUNTRY_NODES).map(([code, [nx, ny]]) => {
          const x = cx + nx * s * 0.38
          const y = cx + ny * s * 0.38
          const isActive = activeCountries.includes(code)
          const nodeColor = isActive ? '#fbbf24' : 'rgba(6,182,212,0.6)'
          const nodeR = isActive ? 4 : 2.5
          // Only show nodes on visible side (rough check)
          const visible = nx * Math.cos(angle * Math.PI / 180) + 0.3 > -0.2
          if (!visible) return null
          return (
            <g key={code}>
              <circle cx={x} cy={y} r={nodeR + 3} fill={nodeColor} opacity={0.15} />
              <circle cx={x} cy={y} r={nodeR}
                fill={isActive ? '#fbbf24' : '#38bdf8'}
                style={{ filter: isActive ? `drop-shadow(0 0 6px #fbbf24)` : 'none' }} />
              {isActive && (
                <circle cx={x} cy={y} r={nodeR + 5}
                  fill="none" stroke="#fbbf24" strokeWidth={0.8} opacity={0.4}
                  style={{ animation: 'cg-ping 1.5s ease-in-out infinite' }} />
              )}
            </g>
          )
        })}

        {/* ── SPECULAR HIGHLIGHT ── */}
        <ellipse cx={cx - s * 0.12} cy={cx - s * 0.16}
          rx={s * 0.1} ry={s * 0.07}
          fill="rgba(255,255,255,0.22)" style={{ filter: 'blur(5px)' }} />
        <ellipse cx={cx - s * 0.18} cy={cx - s * 0.22}
          rx={s * 0.03} ry={s * 0.02}
          fill="rgba(255,255,255,0.7)" style={{ filter: 'blur(1px)' }} />

        {/* ── ROTATING LANGUAGE TICKER RING ── */}
        <text style={{ fontFamily: 'monospace', fontSize: s * 0.065, fill: 'rgba(6,182,212,0.55)' }}>
          <textPath href={`#cg-ring-path-${s}`} startOffset={`${(angle * 0.5) % 100}%`}>
            {'مرحبا • Hello • Hola • Bonjour • こんにちは • Привет • Merhaba • Hallo • '}
          </textPath>
        </text>
        <path id={`cg-ring-path-${s}`}
          d={`M ${cx - s * 0.52} ${cx} A ${s * 0.52} ${s * 0.52} 0 1 1 ${cx + s * 0.52} ${cx}`}
          fill="none" />

        {/* ── CORNER BRACKETS ── */}
        {([[6,6,1,1],[s*2.2-6,6,-1,1],[6,s*2.2-6,1,-1],[s*2.2-6,s*2.2-6,-1,-1]] as number[][])
          .map(([x,y,dx,dy],i) => {
            const len = s * 0.1
            return <g key={i}>
              <line x1={x} y1={y} x2={x+dx*len} y2={y} stroke="rgba(6,182,212,0.45)" strokeWidth={1.8} />
              <line x1={x} y1={y} x2={x} y2={y+dy*len} stroke="rgba(6,182,212,0.45)" strokeWidth={1.8} />
            </g>
          })}

        {/* ── OUTER DASHED RING ── */}
        <circle cx={cx} cy={cx} r={s * 1.03}
          fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth={1.2} strokeDasharray="5 7" />
      </svg>
    </div>
  )
}

// ── COUNTRY SELECTOR (with search + regions) ──────────────────────────────────
function CountrySelector({ selected, onSelect, multi = false, label = 'Ülke Seç' }: {
  selected: string | string[]; onSelect: (v: any) => void; multi?: boolean; label?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [countries, setCountries] = useState<any[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/api/cultural/profiles').then(d => setCountries(d.countries || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  const REGION_LABELS: Record<string, string> = {
    europe: '🌍 Avrupa', middle_east: '🌙 Orta Doğu & MENA',
    americas: '🌎 Amerika', asia: '🌏 Asya',
  }

  const grouped = filtered.reduce((acc: any, c: any) => {
    if (!acc[c.region]) acc[c.region] = []
    acc[c.region].push(c)
    return acc
  }, {})

  const selectedArr = Array.isArray(selected) ? selected : (selected ? [selected] : [])

  const toggle = (code: string) => {
    if (!multi) { onSelect(code); setOpen(false); return }
    const arr = selectedArr.includes(code) ? selectedArr.filter(x => x !== code) : [...selectedArr, code]
    onSelect(arr)
  }

  const displayText = selectedArr.length === 0 ? label
    : selectedArr.length === 1
      ? (countries.find(c => c.code === selectedArr[0])?.name || selectedArr[0])
      : `${selectedArr.length} ülke seçili`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#060a1c', border: `1px solid ${open ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 11, color: selectedArr.length > 0 ? '#fff' : '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
        <span>{displayText}</span>
        <ChevronDown size={14} style={{ color: '#475569', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50, background: '#070a1c', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', maxHeight: 340, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ülke ara..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px 7px 32px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {Object.entries(grouped).map(([region, cs]: any) => (
              <div key={region}>
                <div style={{ padding: '6px 12px 3px', color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {REGION_LABELS[region] || region}
                </div>
                {cs.map((c: any) => {
                  const isSelected = selectedArr.includes(c.code)
                  return (
                    <div key={c.code} onClick={() => toggle(c.code)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', background: isSelected ? 'rgba(6,182,212,0.12)' : 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(6,182,212,0.12)' : 'transparent' }}>
                      {multi && (
                        <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${isSelected ? '#06b6d4' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? '#06b6d4' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <span style={{ color: '#000', fontSize: 10, fontWeight: 800 }}>✓</span>}
                        </div>
                      )}
                      <span style={{ color: isSelected ? '#67e8f9' : '#94a3b8', fontSize: 12, flex: 1 }}>{c.name}</span>
                      {c.hasDetailedProfile && <span style={{ color: '#334155', fontSize: 9 }}>★</span>}
                      <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace' }}>{c.code}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CULTURAL TIPS CARD ────────────────────────────────────────────────────────
function CulturalCard({ profile, countryCode }: { profile: any; countryCode: string }) {
  if (!profile) return null
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.06),rgba(139,92,246,0.04))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {profile.emoji || '🌍'}
        </div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{profile.language}</p>
          <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>"{profile.greetingFormal || profile.greeting}"</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#67e8f9' }}>
            <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />{profile.businessHours}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '8px 12px' }}>
          <p style={{ color: '#475569', fontSize: 9, fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 1 }}>İletişim</p>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{profile.communication}</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '8px 12px' }}>
          <p style={{ color: '#475569', fontSize: 9, fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 1 }}>Karar Stili</p>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{profile.decisionStyle}</p>
        </div>
      </div>
      {profile.tips?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ color: '#475569', fontSize: 9, fontWeight: 700, margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: 1 }}>✅ İpuçları</p>
          {profile.tips.slice(0, 3).map((t: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
              <span style={{ color: '#06b6d4', fontSize: 10, flexShrink: 0 }}>▸</span>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.4 }}>{t}</p>
            </div>
          ))}
        </div>
      )}
      {profile.avoidTopics?.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 9, padding: '8px 12px' }}>
          <p style={{ color: '#f87171', fontSize: 10, fontWeight: 700, margin: '0 0 4px' }}>⚠️ Kaçın</p>
          <p style={{ color: '#fca5a5', fontSize: 11, margin: 0 }}>{profile.avoidTopics.join(' · ')}</p>
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CulturalPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]) // multi-select
  const [selectedCountry, setSelectedCountry] = useState('DE')
  const [message, setMessage] = useState('')
  const [adapting, setAdapting] = useState(false)
  const [result, setResult] = useState<any>(null)       // single result
  const [batchResults, setBatchResults] = useState<any[]>([]) // batch results
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [leadListOpen, setLeadListOpen] = useState(false)
  const leadListRef = useRef<HTMLDivElement>(null)

  // Campaign translation
  const [campaignMsg, setCampaignMsg] = useState('')
  const [campaignCountries, setCampaignCountries] = useState<string[]>(['DE', 'AE', 'US'])
  const [translating, setTranslating] = useState(false)
  const [translations, setTranslations] = useState<any>(null)

  // Profile preview
  const [previewProfile, setPreviewProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  // Load ALL leads (no limit)
  useEffect(() => {
    api.get('/api/leads?limit=2000').then(d => setLeads(d.leads || [])).catch(() => {})
  }, [])

  // Close lead list on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (leadListRef.current && !leadListRef.current.contains(e.target as Node)) setLeadListOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Check URL params for pre-selected lead (from lead detail page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const preLeadId = params.get('leadId')
    const preCountry = params.get('country')
    if (preLeadId) setSelectedLeads([preLeadId])
    if (preCountry) setSelectedCountry(preCountry)
  }, [])

  // Auto-load profile when country changes
  useEffect(() => {
    setLoadingProfile(true)
    api.get(`/api/cultural/profiles`).then(d => {
      // Profile will be loaded on demand
      setLoadingProfile(false)
    }).catch(() => setLoadingProfile(false))
    // Load preview profile via adapt endpoint with dummy call avoided
    // Just show from static data or via profiles endpoint
  }, [selectedCountry])

  const adapt = async () => {
    if (selectedLeads.length === 0 || !selectedCountry || !message) return
    setAdapting(true); setResult(null); setBatchResults([])
    try {
      if (selectedLeads.length === 1) {
        // Single lead
        const data = await api.post('/api/cultural/adapt', { leadId: selectedLeads[0], targetCountry: selectedCountry, message })
        setResult(data)
        setPreviewProfile(data.profile)
        showMsg('success', 'Mesaj kültüre uyarlandı!')
      } else {
        // Batch: multiple leads
        const data = await api.post('/api/cultural/adapt-batch', { leadIds: selectedLeads, targetCountry: selectedCountry, message })
        setBatchResults(data.results || [])
        setPreviewProfile(data.profile)
        showMsg('success', `${data.totalProcessed} lead için mesaj uyarlandı!`)
      }
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAdapting(false) }
  }

  const translateCampaign = async () => {
    if (!campaignMsg || campaignCountries.length === 0) return
    setTranslating(true); setTranslations(null)
    try {
      const data = await api.post('/api/cultural/translate-campaign', { message: campaignMsg, countries: campaignCountries })
      setTranslations(data.translations)
      showMsg('success', `${Object.keys(data.translations).length} dile çevrildi!`)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setTranslating(false) }
  }

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field); setTimeout(() => setCopiedField(null), 2500)
  }

  const inp = { width: '100%', background: '#060a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  const allSelectedCountries = [...(selectedCountry ? [selectedCountry] : []), ...campaignCountries]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,8,24,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(6,182,212,0.18)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -50, right: -20, width: 280, height: 280, background: 'radial-gradient(circle,rgba(6,182,212,0.1) 0%,rgba(139,92,246,0.06) 50%,transparent 70%)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 28 }}>
          <CulturalGlobe size={100} activeCountries={allSelectedCountries} rotating={adapting || translating} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Kültürel Uyum & Çeviri</h1>
              <span style={{ background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>75 ÜLKE</span>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px' }}>50+ dil, kültürel uyum, global kampanya çevirisi — AI ile saniyeler içinde</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['🌍 75 Ülke', '🤖 AI Profil', '💬 Mesaj Uyarla', '📱 Kampanya Çevir', '⚡ Anında'].map(f => (
                <span key={f} style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', color: '#94a3b8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(6,182,212,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(6,182,212,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#67e8f9' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* LEFT: Lead Cultural Adaptation */}
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Globe size={16} style={{ color: '#06b6d4' }} />
            <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Lead İçin Kültürel Uyarlama</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Multi-lead selector with search */}
            <div ref={leadListRef}>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>
                Lead Seç * ({leads.length} toplam)
                {selectedLeads.length > 1 && <span style={{ color: '#06b6d4', marginLeft: 8, fontWeight: 700 }}>{selectedLeads.length} lead seçili — toplu işlem</span>}
              </label>
              <button onClick={() => setLeadListOpen(!leadListOpen)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#060a1c', border: `1px solid ${selectedLeads.length > 0 ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 11, color: selectedLeads.length > 0 ? '#fff' : '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                <span>{selectedLeads.length === 0 ? 'Lead seçin' : selectedLeads.length === 1 ? (leads.find(l => l.id === selectedLeads[0])?.company_name || '1 lead seçili') : `${selectedLeads.length} lead seçili`}</span>
                <ChevronDown size={14} style={{ color: '#475569', transform: leadListOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {leadListOpen && (
                <div style={{ position: 'relative', zIndex: 50, background: '#070a1c', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
                  {/* Search */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                        placeholder={`${leads.length} lead içinde ara...`}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px 6px 30px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                      <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    </div>
                    {selectedLeads.length > 0 && (
                      <button onClick={() => setSelectedLeads([])}
                        style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>
                        Temizle
                      </button>
                    )}
                  </div>
                  {/* Lead list */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {leads.filter(l => !leadSearch || l.company_name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.city?.toLowerCase().includes(leadSearch.toLowerCase())).slice(0, 100).map(l => {
                      const isSelected = selectedLeads.includes(l.id)
                      return (
                        <div key={l.id} onClick={() => setSelectedLeads(prev => isSelected ? prev.filter(x => x !== l.id) : [...prev, l.id])}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', background: isSelected ? 'rgba(6,182,212,0.1)' : 'transparent' }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(6,182,212,0.1)' : 'transparent' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${isSelected ? '#06b6d4' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? '#06b6d4' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isSelected && <span style={{ color: '#000', fontSize: 9, fontWeight: 900 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: isSelected ? '#67e8f9' : '#e2e8f0', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</p>
                            {(l.city || l.sector) && <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{l.city}{l.sector ? ` · ${l.sector}` : ''}</p>}
                          </div>
                          {l.country && <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace', flexShrink: 0 }}>{l.country}</span>}
                        </div>
                      )
                    })}
                    {leads.filter(l => !leadSearch || l.company_name?.toLowerCase().includes(leadSearch.toLowerCase())).length > 100 && (
                      <p style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: 10 }}>
                        {leads.filter(l => !leadSearch || l.company_name?.toLowerCase().includes(leadSearch.toLowerCase())).length - 100} daha var — aramayı daralt
                      </p>
                    )}
                  </div>
                </div>
              )}
              {/* Selected lead chips */}
              {selectedLeads.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {selectedLeads.slice(0, 5).map(id => {
                    const l = leads.find(x => x.id === id)
                    return l ? (
                      <span key={id} onClick={() => setSelectedLeads(prev => prev.filter(x => x !== id))}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9', fontSize: 10, padding: '2px 8px', borderRadius: 20, cursor: 'pointer' }}>
                        {l.company_name.slice(0, 20)} ✕
                      </span>
                    ) : null
                  })}
                  {selectedLeads.length > 5 && <span style={{ color: '#475569', fontSize: 10, padding: '2px 6px' }}>+{selectedLeads.length - 5} daha</span>}
                </div>
              )}
            </div>

            {/* Country selector */}
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Hedef Ülke *</label>
              <CountrySelector selected={selectedCountry} onSelect={setSelectedCountry} label="Ülke seçin" />
            </div>

            {/* Message */}
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Uyarlanacak Mesaj *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                placeholder="Türkçe mesajınızı buraya yazın, AI kültüre uyarlar..."
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              <p style={{ color: '#334155', fontSize: 10, margin: '4px 0 0', textAlign: 'right' }}>{message.length}/2000</p>
            </div>

            <button onClick={adapt} disabled={adapting || selectedLeads.length === 0 || !selectedCountry || !message}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, border: 'none', cursor: adapting || selectedLeads.length === 0 || !message ? 'not-allowed' : 'pointer', background: selectedLeads.length > 0 && message ? 'linear-gradient(135deg,#0891b2,#7c3aed)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: selectedLeads.length === 0 || !message ? 0.4 : 1, boxShadow: selectedLeads.length > 0 && message ? '0 6px 20px rgba(8,145,178,0.35)' : 'none' }}>
              {adapting ? <RefreshCw size={15} style={{ animation: 'cg-spin 1s linear infinite' }} /> : <Zap size={15} />}
              {adapting ? (selectedLeads.length > 1 ? `${selectedLeads.length} Lead Uyarlanıyor...` : 'Kültüre Uyarlanıyor...') : selectedLeads.length > 1 ? `${selectedLeads.length} Lead İçin Uyarla` : 'Kültüre Uyarla'}
            </button>
          </div>

          {/* Result */}
          {result?.adapted && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(6,182,212,0.1)' }}>
              {/* Adapted message */}
              <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#67e8f9', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>✅ Uyarlanmış Mesaj</span>
                  <button onClick={() => copy(result.adapted.adaptedMessage, 'adapted')}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 7, border: '1px solid rgba(6,182,212,0.3)', background: 'transparent', color: '#67e8f9', fontSize: 11, cursor: 'pointer' }}>
                    {copiedField === 'adapted' ? <CheckCircle size={11} /> : <Copy size={11} />} Kopyala
                  </button>
                </div>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{result.adapted.adaptedMessage}</p>
                {result.adapted.translatedMessage && (
                  <p style={{ color: '#475569', fontSize: 11, margin: '8px 0 0', fontStyle: 'italic' }}>TR: {result.adapted.translatedMessage}</p>
                )}
              </div>

              {/* Best send time */}
              {result.adapted.bestSendTime && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 11, padding: '4px 12px', borderRadius: 20 }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{result.adapted.bestSendTime}
                  </span>
                  {result.adapted.greetingStyle && (
                    <span style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: 11, padding: '4px 12px', borderRadius: 20 }}>
                      {result.adapted.greetingStyle}
                    </span>
                  )}
                </div>
              )}

              {/* Cultural tips */}
              {result.adapted.culturalTips?.length > 0 && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 12 }}>
                  <p style={{ color: '#34d399', fontSize: 10, fontWeight: 700, margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: 1 }}>💡 Kültürel İpuçları</p>
                  {result.adapted.culturalTips.map((t: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: '#34d399', fontSize: 10 }}>▸</span>
                      <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{t}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Batch results */}
          {batchResults.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(6,182,212,0.1)' }}>
              <p style={{ color: '#67e8f9', fontSize: 12, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>✅ Toplu Uyarlama Sonuçları ({batchResults.length} lead)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                {batchResults.map((r: any, i: number) => (
                  <div key={i} style={{ background: r.success ? 'rgba(6,182,212,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${r.success ? 'rgba(6,182,212,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: r.success ? '#67e8f9' : '#f87171', fontWeight: 700, fontSize: 12 }}>{r.leadName}</span>
                      {r.success && (
                        <button onClick={() => copy(r.adapted?.adaptedMessage || '', `batch_${i}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(6,182,212,0.3)', background: 'transparent', color: '#67e8f9', fontSize: 10, cursor: 'pointer' }}>
                          {copiedField === `batch_${i}` ? <CheckCircle size={10} /> : <Copy size={10} />} Kopyala
                        </button>
                      )}
                    </div>
                    {r.success ? (
                      <p style={{ color: '#e2e8f0', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{r.adapted?.adaptedMessage}</p>
                    ) : (
                      <p style={{ color: '#f87171', fontSize: 11, margin: 0 }}>Hata: {r.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cultural profile preview */}
          {result?.profile && <div style={{ marginTop: 14 }}><CulturalCard profile={result.profile} countryCode={selectedCountry} /></div>}
        </div>

        {/* RIGHT: Campaign Translation */}
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Languages size={16} style={{ color: '#8b5cf6' }} />
            <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Kampanya Çevirisi</h2>
            <span style={{ color: '#475569', fontSize: 12 }}>— tek mesajı 10 dile çevir</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Kampanya Mesajı *</label>
              <textarea value={campaignMsg} onChange={e => setCampaignMsg(e.target.value)} rows={4}
                placeholder="Çevrilecek kampanya mesajını yazın..."
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>
                Hedef Ülkeler ({campaignCountries.length} seçili, max 10)
              </label>
              <CountrySelector selected={campaignCountries} onSelect={setCampaignCountries} multi label="Ülke seçin (çoklu)" />
            </div>

            {/* Selected countries chips */}
            {campaignCountries.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {campaignCountries.slice(0, 8).map(code => (
                  <span key={code} style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa', fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}
                    onClick={() => setCampaignCountries(prev => prev.filter(c => c !== code))}>
                    {code} ✕
                  </span>
                ))}
              </div>
            )}

            <button onClick={translateCampaign} disabled={translating || !campaignMsg || campaignCountries.length === 0}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, border: 'none', cursor: translating || !campaignMsg || campaignCountries.length === 0 ? 'not-allowed' : 'pointer', background: campaignMsg && campaignCountries.length > 0 ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !campaignMsg || campaignCountries.length === 0 ? 0.4 : 1, boxShadow: campaignMsg && campaignCountries.length > 0 ? '0 6px 20px rgba(124,58,237,0.35)' : 'none' }}>
              {translating ? <RefreshCw size={15} style={{ animation: 'cg-spin 1s linear infinite' }} /> : <Languages size={15} />}
              {translating ? 'Çevriliyor...' : `${campaignCountries.length} Dile Çevir`}
            </button>
          </div>

          {/* Translation results */}
          {translations && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(139,92,246,0.1)', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
              {Object.entries(translations).map(([code, t]: [string, any]) => (
                <div key={code} style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 12 }}>{code}</span>
                      <span style={{ color: '#334155', fontSize: 11 }}>{t.language}</span>
                      {t.greeting && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>{t.greeting}</span>}
                    </div>
                    <button onClick={() => copy(t.message, `tr_${code}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7, border: '1px solid rgba(139,92,246,0.3)', background: 'transparent', color: copiedField === `tr_${code}` ? '#34d399' : '#a78bfa', fontSize: 11, cursor: 'pointer' }}>
                      {copiedField === `tr_${code}` ? <CheckCircle size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{t.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cg-spin { to { transform: rotate(360deg); } }
        @keyframes cg-ping { 0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0} }
      `}</style>
    </div>
  )
}
