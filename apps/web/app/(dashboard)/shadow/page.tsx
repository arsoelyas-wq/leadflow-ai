'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Eye, Copy, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Zap, Target, MapPin, Factory, Star, Wrench, Radio, DollarSign, Package, Instagram, Facebook, Settings, Briefcase, BarChart3, TrendingUp, AlertCircle } from 'lucide-react'

// ── SHADOW ORB — Covert surveillance 3D animation ─────────────────────────────
function ShadowOrb({ size = 100, scanning = false }: { size?: number; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [beamAngle, setBeamAngle] = useState(0)
  const [particles, setParticles] = useState<Array<{ x: number; y: number; age: number; id: number }>>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setBeamAngle(a => (a + 1.5) % 360), 16)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!scanning || !mounted) return
    const t = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const r = (0.3 + Math.random() * 0.5) * size * 0.5
      setParticles(prev => [...prev.slice(-8), { x: size + Math.cos(angle) * r, y: size + Math.sin(angle) * r, age: 0, id: Date.now() + Math.random() }])
    }, 600)
    const fade = setInterval(() => setParticles(prev => prev.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < 6)), 300)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [scanning, size, mounted])

  const cx = size, s = size
  if (!mounted) return <div style={{ width: s*2, height: s*2, flexShrink: 0 }} />
  const bx = cx + Math.cos(beamAngle * Math.PI / 180) * s * 0.85
  const by = cx + Math.sin(beamAngle * Math.PI / 180) * s * 0.85
  const a1 = (beamAngle - 55) * Math.PI / 180
  const sx1 = cx + Math.cos(a1) * s * 0.85, sy1 = cx + Math.sin(a1) * s * 0.85

  return (
    <div style={{ width: s * 2, height: s * 2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2} height={s * 2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`sg${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(124,58,237,0)" />
            <stop offset="65%" stopColor="rgba(124,58,237,0.07)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.18)" />
          </radialGradient>
          <radialGradient id={`sphere${size}`} cx="38%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="40%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#1a0038" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cx} r={cx} fill={`url(#sg${size})`} />
        {[0.35, 0.58, 0.78, 0.95].map(r => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth={0.8} strokeDasharray="4 7" />
        ))}
        <line x1={0} y1={cx} x2={s*2} y2={cx} stroke="rgba(124,58,237,0.09)" strokeWidth={0.6} />
        <line x1={cx} y1={0} x2={cx} y2={s*2} stroke="rgba(124,58,237,0.09)" strokeWidth={0.6} />

        {/* Sweep sector */}
        <path d={`M ${cx} ${cx} L ${sx1} ${sy1} A ${s*0.85} ${s*0.85} 0 0 1 ${bx} ${by} Z`} fill="rgba(124,58,237,0.18)" />

        {/* Beam */}
        <line x1={cx} y1={cx} x2={bx} y2={by} stroke="#8b5cf6" strokeWidth={1.8} opacity={0.9} />
        <circle cx={bx} cy={by} r={2.5} fill="#a78bfa" opacity={0.9} />

        {/* Core sphere */}
        <circle cx={cx} cy={cx} r={s * 0.38} fill={`url(#sphere${size})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.25}px rgba(124,58,237,0.9)) drop-shadow(0 0 ${s*0.5}px rgba(124,58,237,0.3))` }} />
        <ellipse cx={cx - s*0.08} cy={cx - s*0.1} rx={s*0.08} ry={s*0.05} fill="rgba(255,255,255,0.22)" style={{ filter: 'blur(3px)' }} />

        {/* Hex dots on sphere */}
        {[0,60,120,180,240,300].map(deg => {
          const r2 = s * 0.27, a = deg * Math.PI / 180
          return <circle key={deg} cx={cx + Math.cos(a)*r2} cy={cx + Math.sin(a)*r2} r={1.5} fill="#a78bfa" opacity={0.45} />
        })}

        {/* Center crosshair */}
        <circle cx={cx} cy={cx} r={4.5} fill="none" stroke="#7c3aed" strokeWidth={1} opacity={0.6} />
        <circle cx={cx} cy={cx} r={1.5} fill="#8b5cf6" />

        {/* Particles */}
        {particles.map(p => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={2.5} fill="#a78bfa" opacity={Math.max(0, 0.8 - p.age * 0.13)} />
            <circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#7c3aed" strokeWidth={0.7} opacity={Math.max(0, 0.35 - p.age * 0.06)} />
          </g>
        ))}

        {/* Corner brackets */}
        {([[4,4,1,1],[s*2-4,4,-1,1],[4,s*2-4,1,-1],[s*2-4,s*2-4,-1,-1]] as number[][]).map(([x,y,dx,dy], i) => {
          const len = s * 0.11
          return <g key={i}>
            <line x1={x} y1={y} x2={x+dx*len} y2={y} stroke="#7c3aed" strokeWidth={1.8} opacity={0.6} />
            <line x1={x} y1={y} x2={x} y2={y+dy*len} stroke="#7c3aed" strokeWidth={1.8} opacity={0.6} />
          </g>
        })}

        <circle cx={cx} cy={cx} r={cx-1.5} fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth={1.5} />
      </svg>
    </div>
  )
}

function FloatOrb({ size = 14, delay = '0s', color = '#7c3aed' }: any) {
  return (
    <div className="sh-float" style={{ animationDelay: delay, width: size*1.8, height: size*1.8, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: size*1.8, height: size*1.8, borderRadius: '50%', border: `1px solid ${color}50` }} />
      <div style={{ width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color}44)`, boxShadow: `0 0 ${size*.5}px ${color}66` }} />
    </div>
  )
}

// ── THREAT GAUGE ──────────────────────────────────────────────────────────────
function ThreatGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#dc2626' : score >= 40 ? '#b45309' : '#059669'
  const label = score >= 70 ? 'Yüksek' : score >= 40 ? 'Orta' : 'Düşük'
  const circ = 2 * Math.PI * 28
  return (
    <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
      <svg width={70} height={70}>
        <circle cx={35} cy={35} r={28} fill="none" stroke="#e2e8f0" strokeWidth={5} />
        <circle cx={35} cy={35} r={28} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" transform="rotate(-90 35 35)"
          style={{ filter: `drop-shadow(0 0 5px ${color}66)`, transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>{score}</span>
        <span style={{ color: '#475569', fontSize: 9, marginTop: 1 }}>{label}</span>
      </div>
    </div>
  )
}

// ── COMPETITOR CARD ───────────────────────────────────────────────────────────
function CompetitorCard({ comp, onScan, scanning }: any) {
  const [expanded, setExpanded] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [webInput, setWebInput] = useState('')
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Old code stored as JSON.stringify (string), new code stores as object — handle both
  const parseSafe = (v: any, fallback: any) => {
    if (!v) return fallback
    if (typeof v === 'string') { try { return JSON.parse(v) } catch { return fallback } }
    return v
  }
  const shadowData = parseSafe(comp.shadow_data, {})
  const changes: any[] = parseSafe(comp.shadow_changes, [])
  const priceHistory: any[] = parseSafe(comp.shadow_price_history, [])
  const threatScore = comp.threat_score || 0
  const isScanning = scanning === comp.id
  const aiInsight = shadowData.aiInsight || null

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    setTilt({ x: ((e.clientY - rect.top - rect.height/2) / (rect.height/2)) * 3.5, y: (-(e.clientX - rect.left - rect.width/2) / (rect.width/2)) * 3.5 })
  }

  const sev: Record<string, string> = { danger: '#dc2626', warning: '#b45309', info: '#7c3aed' }

  return (
    <div ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x:0, y:0 }) }}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: hovered ? 'transform 0.05s ease' : 'transform 0.4s ease' }}>
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 19, zIndex: 0, background: hovered ? 'linear-gradient(135deg,#7c3aed,#a78bfa,#4f46e5,#7c3aed)' : `linear-gradient(135deg,${threatScore>=70?'#ef444430':'#7c3aed28'},#4f46e520)`, backgroundSize: '300% 300%', animation: hovered ? 'sh-border 2s linear infinite' : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        {/* Header row */}
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThreatGauge score={threatScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 15, margin: 0 }}>{comp.name}</p>
              {changes.length > 0 && <span style={{ background: '#fffbeb', color: '#b45309', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: '1px solid #fde68a' }}>{changes.length} değişiklik</span>}
              {threatScore >= 70 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: '1px solid #fecaca' }}><AlertTriangle size={11} /> Yüksek Tehdit</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
              {comp.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {comp.city}</span>}
              {comp.sector && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Factory size={12} /> {comp.sector}</span>}
              {shadowData.reviews?.avg ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b45309' }}><Star size={12} /> {shadowData.reviews.avg}/5 ({shadowData.reviews.count})</span> : null}
              {shadowData.techStack?.length ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Wrench size={12} /> {shadowData.techStack.slice(0,2).join(', ')}</span> : null}
              {comp.last_scanned_at && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Radio size={12} /> {new Date(comp.last_scanned_at).toLocaleDateString()}</span>}
            </div>
            {changes.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                {changes.slice(0,3).map((c: any, i: number) => (
                  <span key={i} style={{ background: `${sev[c.severity]||'#7c3aed'}18`, color: sev[c.severity]||'#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${sev[c.severity]||'#7c3aed'}28` }}>
                    {c.label.slice(0,42)}{c.label.length>42?'…':''}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <button onClick={() => onScan(comp.id)} disabled={isScanning}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #ddd6fe', cursor: isScanning?'not-allowed':'pointer', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 600 }}>
              {isScanning ? <RefreshCw size={12} style={{ animation: 'sh-spin 1s linear infinite' }} /> : <Eye size={12} />}
              {isScanning ? 'Taranıyor...' : 'Tara'}
            </button>
            <button onClick={() => setExpanded(!expanded)}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div style={{ borderTop: '1px solid #ede9fe', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {!comp.website && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={webInput} onChange={e => setWebInput(e.target.value)} placeholder="Website ekle (daha iyi analiz için)"
                  style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', color: '#0f172a', fontSize: 12, outline: 'none' }} />
                <button onClick={async () => { await api.post(`/api/shadow/add-website/${comp.id}`, { website: webInput }); window.location.reload() }} disabled={!webInput}
                  style={{ padding: '8px 14px', borderRadius: 9, border: 'none', cursor: !webInput?'not-allowed':'pointer', background: '#ede9fe', color: '#7c3aed', fontSize: 12, fontWeight: 600 }}>Ekle</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 10 }}>
              {shadowData.pricing?.length > 0 && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 12, padding: 13 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#7c3aed', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}><DollarSign size={12} /> Fiyatlar</p>
                  {shadowData.pricing.slice(0,6).map((p: string, i: number) => <p key={i} style={{ color: '#0f172a', fontSize: 12, margin: '0 0 3px' }}>{p}</p>)}
                </div>
              )}
              {shadowData.products?.length > 0 && (
                <div style={{ background: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 13 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4f46e5', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}><Package size={12} /> Ürünler</p>
                  {shadowData.products.slice(0,6).map((p: string, i: number) => <p key={i} style={{ color: '#0f172a', fontSize: 12, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</p>)}
                </div>
              )}
              {shadowData.complaints?.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 13 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}><AlertTriangle size={12} /> Şikayetler — Fırsat!</p>
                  {shadowData.complaints.slice(0,4).map((c: string, i: number) => <p key={i} style={{ color: '#b91c1c', fontSize: 11, margin: '0 0 4px', lineHeight: 1.4 }}>• {c.slice(0,62)}{c.length>62?'…':''}</p>)}
                </div>
              )}
              {((shadowData.social?.instagram || shadowData.social?.facebook || (shadowData.techStack?.length||0)>0 || (shadowData.jobPostings?.length||0)>0)) && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 13 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}><Wrench size={12} /> Dijital Varlık</p>
                  {shadowData.social?.instagram && <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0f172a', fontSize: 11, margin: '0 0 3px' }}><Instagram size={12} /> Instagram</p>}
                  {shadowData.social?.facebook && <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0f172a', fontSize: 11, margin: '0 0 3px' }}><Facebook size={12} /> Facebook</p>}
                  {(shadowData.techStack||[]).slice(0,4).map((t: string, i: number) => <p key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: 11, margin: '0 0 2px' }}><Settings size={12} /> {t}</p>)}
                  {(shadowData.jobPostings?.length||0)>0 && <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#b45309', fontSize: 11, marginTop: 6 }}><Briefcase size={12} /> {shadowData.jobPostings.length} iş ilanı — büyüme sinyali!</p>}
                </div>
              )}
            </div>

            {/* AI Insight */}
            {aiInsight && (
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#eef2ff)', border: '1px solid #ede9fe', borderRadius: 14, padding: 16 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#7c3aed', fontSize: 10, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}><Zap size={12} /> AI Stratejik Analiz</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ key:'insight',label:'Gözlem',Icon:BarChart3,color:'#7c3aed'},{key:'opportunity',label:'Fırsat',Icon:CheckCircle,color:'#059669'},{key:'threat',label:'Tehdit',Icon:AlertCircle,color:'#dc2626'},{key:'action',label:'Aksiyon',Icon:Zap,color:'#b45309'}].map(({ key,label,Icon,color }) => aiInsight[key] ? (
                    <div key={key} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '10px 12px' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontSize: 9, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}><Icon size={11} /> {label}</p>
                      <p style={{ color: '#0f172a', fontSize: 12, margin: 0, lineHeight: 1.4 }}>{aiInsight[key]}</p>
                    </div>
                  ) : null)}
                </div>
                {aiInsight.action && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button onClick={() => { navigator.clipboard.writeText(aiInsight.action); setCopied(true); setTimeout(()=>setCopied(false),2000) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid #ddd6fe', background: '#ffffff', color: '#7c3aed', fontSize: 11, cursor: 'pointer' }}>
                      {copied ? <CheckCircle size={11} /> : <Copy size={11} />} Aksiyonu Kopyala
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Price history chart */}
            {priceHistory.length > 1 && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: 10, fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}><TrendingUp size={12} /> Tehdit Skoru Geçmişi (son 14 gün)</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
                  {priceHistory.slice(-14).map((h: any, i: number) => {
                    const c = (h.score||0)>=70?'#dc2626':(h.score||0)>=40?'#b45309':'#059669'
                    return <div key={i} title={`${h.date}: ${h.score}`} style={{ flex: 1, background: c, height: `${Math.max(4,(h.score||0))}%`, borderRadius: 3, opacity: 0.85 }} />
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#475569', fontSize: 9 }}>{priceHistory.slice(-14)[0]?.date}</span>
                  <span style={{ color: '#475569', fontSize: 9 }}>{priceHistory[priceHistory.length-1]?.date}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ShadowPage() {
  const { t } = useI18n()
  const [competitors, setCompetitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success'|'error'; text: string }|null>(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [addForm, setAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [adding, setAdding] = useState(false)

  const showMsg = (type: 'success'|'error', text: string) => { setMsg({ type, text }); setTimeout(()=>setMsg(null),6000) }
  const load = async () => {
    setLoading(true)
    try {
      const d = await api.get('/api/shadow/list')
      setCompetitors(d.competitors || [])
      if (d.migrationNeeded) setMigrationNeeded(true)
    } catch {} finally { setLoading(false) }
  }

  const addCompetitor = async () => {
    if (!newName) return
    setAdding(true)
    try {
      await api.post('/api/competitor/list', { name: newName, city: newCity, channels: ['google','linkedin'] })
      setNewName(''); setNewCity(''); setAddForm(false)
      showMsg('success', `${newName} eklendi!`)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAdding(false) }
  }
  useEffect(() => { load() }, [])

  const scan = async (id: string) => {
    setScanning(id)
    try { await api.post(`/api/shadow/scan/${id}`, {}); showMsg('success','Tarama tamamlandı!'); load() }
    catch (e: any) { showMsg('error', e.message) }
    finally { setScanning(null) }
  }

  const scanAll = async () => {
    setScanning('all')
    try { await api.post('/api/shadow/scan-all', {}); showMsg('success','Tüm rakipler arka planda taranıyor...'); setTimeout(load, 30000) }
    catch (e: any) { showMsg('error', e.message) }
    finally { setScanning(null) }
  }

  const highThreat = competitors.filter(c=>(c.threat_score||0)>=70).length
  const totalChanges = competitors.reduce((s,c)=>s+(c.shadow_changes?.length||0),0)
  const avgThreat = competitors.length ? Math.round(competitors.reduce((s,c)=>s+(c.threat_score||0),0)/competitors.length) : 0

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#f5f3ff 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #ede9fe' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.025) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div style={{ position: 'absolute', top: -50, right: -30, width: 280, height: 280, background: 'radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 22, right: 200, zIndex: 1, opacity: 0.5 }}><FloatOrb size={16} delay="0s" color="#7c3aed" /></div>
        <div style={{ position: 'absolute', top: 65, right: 260, zIndex: 1, opacity: 0.4 }}><FloatOrb size={10} delay="1.2s" color="#a78bfa" /></div>
        <div style={{ position: 'absolute', bottom: 28, right: 215, zIndex: 1, opacity: 0.4 }}><FloatOrb size={12} delay="2s" color="#4f46e5" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ShadowOrb size={100} scanning={scanning !== null} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#0f172a', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Shadow Competitor Monitoring</h1>
                <span style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>PRO</span>
              </div>
              <p style={{ color: '#475569', fontSize: 14, margin: '0 0 14px', maxWidth: 500 }}>{t('shadow.rakiplerinizi_surekli_izl', 'Rakiplerinizi sürekli izleyin — fiyat, ürün, yorum ve strateji değişikliklerini anında fark edin')}</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {['🎯 Tehdit Skoru','💰 Fiyat Takibi','📊 Trend Grafik','⚡ WhatsApp Alarm','🤖 AI Strateji','🌍 75 Ülke'].map(f => (
                  <span key={f} style={{ background: '#f5f3ff', border: '1px solid #ede9fe', color: '#7c3aed', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => setAddForm(!addForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: '1px solid #ddd6fe', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#ffffff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(124,58,237,0.25)' }}>
              + Rakip Ekle
            </button>
            <button onClick={scanAll} disabled={scanning==='all'||!competitors.length}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: '1px solid #ddd6fe', cursor: scanning==='all'||!competitors.length?'not-allowed':'pointer', background: '#f5f3ff', color: '#7c3aed', fontSize: 13, fontWeight: 600, opacity: !competitors.length?0.4:1 }}>
              {scanning==='all' ? <RefreshCw size={13} style={{ animation: 'sh-spin 1s linear infinite' }} /> : <Eye size={13} />}
              Tümünü Tara
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { label: t('Rakip İzleniyor','Rakip İzleniyor'), value:competitors.length, color:'#7c3aed', Icon:Eye },
            { label: t('Yüksek Tehdit','Yüksek Tehdit'),   value:highThreat,         color:'#dc2626', Icon:AlertTriangle },
            { label: t('Değişiklik','Değişiklik'),      value:totalChanges,        color:'#b45309', Icon:Zap },
            { label:'Ort. Tehdit',     value:avgThreat,           color:'#7c3aed', Icon:Target },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ background: '#ffffff', borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, background: `radial-gradient(circle,${color}18 0%,transparent 70%)` }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Icon size={20} style={{ color }} /></div>
              <p style={{ color, fontSize: 24, fontWeight: 800, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type==='success'?'#ecfdf5':'#fef2f2', border: `1px solid ${msg.type==='success'?'#a7f3d0':'#fecaca'}`, color: msg.type==='success'?'#059669':'#dc2626' }}>
          {msg.text}
        </div>
      )}

      {/* ── ADD FORM ──────────────────────────────────────────────────────── */}
      {addForm && (
        <div style={{ marginBottom: 20, background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 16, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ color: '#7c3aed', fontWeight: 700, fontSize: 14, margin: '0 0 16px' }}>+ Yeni Rakip Ekle</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('shadow.rakip_firma_adi', 'Rakip Firma Adı *')}</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('shadow.orn_dekonil', 'örn: Dekonil')}
                style={{ width: '100%', background: '#ffffff', border: `1px solid ${newName ? '#c4b5fd' : '#e2e8f0'}`, borderRadius: 9, padding: '9px 12px', color: '#0f172a', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('shadow.sehir_opsiyonel', 'Şehir (opsiyonel)')}</label>
              <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder={t('shadow.istanbul', 'İstanbul')}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '9px 12px', color: '#0f172a', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addCompetitor} disabled={adding || !newName}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', cursor: adding||!newName?'not-allowed':'pointer', background: newName ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : '#f1f5f9', color: newName ? '#ffffff' : '#94a3b8', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
              {adding ? <RefreshCw size={13} style={{ animation: 'sh-spin 1s linear infinite' }} /> : null}
              {adding ? 'Ekleniyor...' : 'Ekle ve İzlemeye Başla'}
            </button>
            <button onClick={() => setAddForm(false)} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#475569', fontSize: 13, cursor: 'pointer' }}>{t('shadow.iptal', 'İptal')}</button>
          </div>
        </div>
      )}

      {/* ── MIGRATION WARNING ─────────────────────────────────────────────── */}
      {migrationNeeded && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, fontSize: 12, background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', lineHeight: 1.7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> <strong>Supabase migration gerekli</strong></span> — SQL Editor aç ve şunu çalıştır:
          <div style={{ marginTop: 8, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
{`ALTER TABLE competitors ADD COLUMN IF NOT EXISTS shadow_data JSONB;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS shadow_changes JSONB;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS shadow_price_history JSONB DEFAULT '[]';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS threat_score INTEGER DEFAULT 0;`}
          </div>
        </div>
      )}

      {/* ── COMPETITOR LIST ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
          <RefreshCw size={22} style={{ color: '#475569', animation: 'sh-spin 1s linear infinite' }} />
        </div>
      ) : competitors.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 20, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><ShadowOrb size={60} /></div>
          <p style={{ color: '#475569', fontSize: 14, margin: '0 0 12px' }}>{t('shadow.henuz_izlenen_rakip_yok', 'Henüz izlenen rakip yok')}</p>
          <button onClick={() => setAddForm(true)}
            style={{ padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#ffffff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(124,58,237,0.25)' }}>
            + İlk Rakibi Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...competitors].sort((a,b)=>(b.threat_score||0)-(a.threat_score||0)).map(comp => (
            <CompetitorCard key={comp.id} comp={comp} onScan={scan} scanning={scanning} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes sh-border { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }
        @keyframes sh-spin { to { transform: rotate(360deg); } }
        .sh-float { animation: sh-float-anim 4s ease-in-out infinite; }
        @keyframes sh-float-anim { 0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-8px);opacity:.8} }
      `}</style>
    </div>
  )
}
