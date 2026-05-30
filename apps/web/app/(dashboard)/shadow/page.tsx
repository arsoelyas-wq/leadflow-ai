'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Eye, Copy, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

// ── SHADOW ORB — Covert surveillance 3D animation ─────────────────────────────
function ShadowOrb({ size = 100, scanning = false }: { size?: number; scanning?: boolean }) {
  const [beamAngle, setBeamAngle] = useState(0)
  const [particles, setParticles] = useState<Array<{ x: number; y: number; age: number; id: number }>>([])

  useEffect(() => {
    const t = setInterval(() => setBeamAngle(a => (a + 1.5) % 360), 16)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!scanning) return
    const t = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const r = (0.3 + Math.random() * 0.5) * size * 0.5
      setParticles(prev => [...prev.slice(-8), { x: size + Math.cos(angle) * r, y: size + Math.sin(angle) * r, age: 0, id: Date.now() + Math.random() }])
    }, 600)
    const fade = setInterval(() => setParticles(prev => prev.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < 6)), 300)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [scanning, size])

  const cx = size, s = size
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
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981'
  const label = score >= 70 ? 'Yüksek' : score >= 40 ? 'Orta' : 'Düşük'
  const circ = 2 * Math.PI * 28
  return (
    <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
      <svg width={70} height={70}>
        <circle cx={35} cy={35} r={28} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
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

  const shadowData = comp.shadow_data || {}
  const changes: any[] = comp.shadow_changes || []
  const priceHistory: any[] = comp.shadow_price_history || []
  const threatScore = comp.threat_score || 0
  const isScanning = scanning === comp.id
  const aiInsight = shadowData.aiInsight || null

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    setTilt({ x: ((e.clientY - rect.top - rect.height/2) / (rect.height/2)) * 3.5, y: (-(e.clientX - rect.left - rect.width/2) / (rect.width/2)) * 3.5 })
  }

  const sev: Record<string, string> = { danger: '#ef4444', warning: '#f59e0b', info: '#8b5cf6' }

  return (
    <div ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x:0, y:0 }) }}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: hovered ? 'transform 0.05s ease' : 'transform 0.4s ease' }}>
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 19, zIndex: 0, background: hovered ? 'linear-gradient(135deg,#7c3aed,#a78bfa,#4f46e5,#7c3aed)' : `linear-gradient(135deg,${threatScore>=70?'#ef444430':'#7c3aed28'},#4f46e520)`, backgroundSize: '300% 300%', animation: hovered ? 'sh-border 2s linear infinite' : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(5,0,20,0.97),rgba(8,2,24,0.98))', borderRadius: 18, overflow: 'hidden' }}>

        {/* Header row */}
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThreatGauge score={threatScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{comp.name}</p>
              {changes.length > 0 && <span style={{ background: 'rgba(245,158,11,0.14)', color: '#fbbf24', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(245,158,11,0.28)' }}>{changes.length} değişiklik</span>}
              {threatScore >= 70 && <span style={{ background: 'rgba(239,68,68,0.14)', color: '#f87171', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(239,68,68,0.28)' }}>⚠️ Yüksek Tehdit</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
              {comp.city && <span>📍 {comp.city}</span>}
              {comp.sector && <span>🏭 {comp.sector}</span>}
              {shadowData.reviews?.avg ? <span style={{ color: '#f59e0b' }}>⭐ {shadowData.reviews.avg}/5 ({shadowData.reviews.count})</span> : null}
              {shadowData.techStack?.length ? <span>🔧 {shadowData.techStack.slice(0,2).join(', ')}</span> : null}
              {comp.last_scanned_at && <span>📡 {new Date(comp.last_scanned_at).toLocaleDateString('tr-TR')}</span>}
            </div>
            {changes.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                {changes.slice(0,3).map((c: any, i: number) => (
                  <span key={i} style={{ background: `${sev[c.severity]||'#8b5cf6'}18`, color: sev[c.severity]||'#a78bfa', fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${sev[c.severity]||'#8b5cf6'}28` }}>
                    {c.label.slice(0,42)}{c.label.length>42?'…':''}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <button onClick={() => onScan(comp.id)} disabled={isScanning}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.35)', cursor: isScanning?'not-allowed':'pointer', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>
              {isScanning ? <RefreshCw size={12} style={{ animation: 'sh-spin 1s linear infinite' }} /> : <Eye size={12} />}
              {isScanning ? 'Taranıyor...' : 'Tara'}
            </button>
            <button onClick={() => setExpanded(!expanded)}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div style={{ borderTop: '1px solid rgba(124,58,237,0.1)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {!comp.website && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={webInput} onChange={e => setWebInput(e.target.value)} placeholder="Website ekle (daha iyi analiz için)"
                  style={{ flex: 1, background: '#07091c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
                <button onClick={async () => { await api.post(`/api/shadow/add-website/${comp.id}`, { website: webInput }); window.location.reload() }} disabled={!webInput}
                  style={{ padding: '8px 14px', borderRadius: 9, border: 'none', cursor: !webInput?'not-allowed':'pointer', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>Ekle</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 10 }}>
              {shadowData.pricing?.length > 0 && (
                <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: 13 }}>
                  <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>💰 Fiyatlar</p>
                  {shadowData.pricing.slice(0,6).map((p: string, i: number) => <p key={i} style={{ color: '#e2e8f0', fontSize: 12, margin: '0 0 3px' }}>{p}</p>)}
                </div>
              )}
              {shadowData.products?.length > 0 && (
                <div style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 12, padding: 13 }}>
                  <p style={{ color: '#818cf8', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>📦 Ürünler</p>
                  {shadowData.products.slice(0,6).map((p: string, i: number) => <p key={i} style={{ color: '#e2e8f0', fontSize: 12, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</p>)}
                </div>
              )}
              {shadowData.complaints?.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: 13 }}>
                  <p style={{ color: '#f87171', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>⚠️ Şikayetler — Fırsat!</p>
                  {shadowData.complaints.slice(0,4).map((c: string, i: number) => <p key={i} style={{ color: '#fca5a5', fontSize: 11, margin: '0 0 4px', lineHeight: 1.4 }}>• {c.slice(0,62)}{c.length>62?'…':''}</p>)}
                </div>
              )}
              {((shadowData.social?.instagram || shadowData.social?.facebook || (shadowData.techStack?.length||0)>0 || (shadowData.jobPostings?.length||0)>0)) && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 13 }}>
                  <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>🔧 Dijital Varlık</p>
                  {shadowData.social?.instagram && <p style={{ color: '#e2e8f0', fontSize: 11, margin: '0 0 3px' }}>📸 Instagram</p>}
                  {shadowData.social?.facebook && <p style={{ color: '#e2e8f0', fontSize: 11, margin: '0 0 3px' }}>📘 Facebook</p>}
                  {(shadowData.techStack||[]).slice(0,4).map((t: string, i: number) => <p key={i} style={{ color: '#64748b', fontSize: 11, margin: '0 0 2px' }}>⚙️ {t}</p>)}
                  {(shadowData.jobPostings?.length||0)>0 && <p style={{ color: '#fbbf24', fontSize: 11, marginTop: 6 }}>📋 {shadowData.jobPostings.length} iş ilanı — büyüme sinyali!</p>}
                </div>
              )}
            </div>

            {/* AI Insight */}
            {aiInsight && (
              <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.06))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16 }}>
                <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>⚡ AI Stratejik Analiz</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ key:'insight',label:'📊 Gözlem',color:'#a78bfa'},{key:'opportunity',label:'✅ Fırsat',color:'#34d399'},{key:'threat',label:'🔴 Tehdit',color:'#f87171'},{key:'action',label:'⚡ Aksiyon',color:'#fbbf24'}].map(({ key,label,color }) => aiInsight[key] ? (
                    <div key={key} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '10px 12px' }}>
                      <p style={{ color, fontSize: 9, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                      <p style={{ color: '#cbd5e1', fontSize: 12, margin: 0, lineHeight: 1.4 }}>{aiInsight[key]}</p>
                    </div>
                  ) : null)}
                </div>
                {aiInsight.action && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button onClick={() => { navigator.clipboard.writeText(aiInsight.action); setCopied(true); setTimeout(()=>setCopied(false),2000) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', background: 'transparent', color: '#a78bfa', fontSize: 11, cursor: 'pointer' }}>
                      {copied ? <CheckCircle size={11} /> : <Copy size={11} />} Aksiyonu Kopyala
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Price history chart */}
            {priceHistory.length > 1 && (
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 14 }}>
                <p style={{ color: '#334155', fontSize: 10, fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>📈 Tehdit Skoru Geçmişi (son 14 gün)</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
                  {priceHistory.slice(-14).map((h: any, i: number) => {
                    const c = (h.score||0)>=70?'#ef4444':(h.score||0)>=40?'#f59e0b':'#10b981'
                    return <div key={i} title={`${h.date}: ${h.score}`} style={{ flex: 1, background: c, height: `${Math.max(4,(h.score||0))}%`, borderRadius: 3, opacity: 0.7 }} />
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#1e293b', fontSize: 9 }}>{priceHistory.slice(-14)[0]?.date}</span>
                  <span style={{ color: '#1e293b', fontSize: 9 }}>{priceHistory[priceHistory.length-1]?.date}</span>
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
  const [competitors, setCompetitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success'|'error'; text: string }|null>(null)

  const showMsg = (type: 'success'|'error', text: string) => { setMsg({ type, text }); setTimeout(()=>setMsg(null),6000) }
  const load = async () => { setLoading(true); try { const d = await api.get('/api/shadow/list'); setCompetitors(d.competitors||[]) } catch {} finally { setLoading(false) } }
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
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(5,0,20,0.98),rgba(8,2,25,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(124,58,237,0.18)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div style={{ position: 'absolute', top: -50, right: -30, width: 280, height: 280, background: 'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 22, right: 200, zIndex: 1, opacity: 0.5 }}><FloatOrb size={16} delay="0s" color="#7c3aed" /></div>
        <div style={{ position: 'absolute', top: 65, right: 260, zIndex: 1, opacity: 0.4 }}><FloatOrb size={10} delay="1.2s" color="#a78bfa" /></div>
        <div style={{ position: 'absolute', bottom: 28, right: 215, zIndex: 1, opacity: 0.4 }}><FloatOrb size={12} delay="2s" color="#4f46e5" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ShadowOrb size={100} scanning={scanning !== null} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Shadow Competitor Monitoring</h1>
                <span style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>PRO</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px', maxWidth: 500 }}>Rakiplerinizi sürekli izleyin — fiyat, ürün, yorum ve strateji değişikliklerini anında fark edin</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {['🎯 Tehdit Skoru','💰 Fiyat Takibi','📊 Trend Grafik','⚡ WhatsApp Alarm','🤖 AI Strateji','🌍 75 Ülke'].map(f => (
                  <span key={f} style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', color: '#94a3b8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={scanAll} disabled={scanning==='all'||!competitors.length}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.35)', cursor: scanning==='all'||!competitors.length?'not-allowed':'pointer', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontSize: 13, fontWeight: 700, opacity: !competitors.length?0.4:1, flexShrink: 0 }}>
            {scanning==='all' ? <RefreshCw size={14} style={{ animation: 'sh-spin 1s linear infinite' }} /> : <Eye size={14} />}
            Tümünü Tara
          </button>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { label:'Rakip İzleniyor', value:competitors.length, color:'#7c3aed', icon:'👁️' },
            { label:'Yüksek Tehdit',   value:highThreat,         color:'#ef4444', icon:'🚨' },
            { label:'Değişiklik',      value:totalChanges,        color:'#f59e0b', icon:'⚡' },
            { label:'Ort. Tehdit',     value:avgThreat,           color:'#8b5cf6', icon:'🎯' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, background: `radial-gradient(circle,${color}20 0%,transparent 70%)` }} />
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <p style={{ color, fontSize: 24, fontWeight: 800, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type==='success'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border: `1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, color: msg.type==='success'?'#34d399':'#f87171' }}>
          {msg.text}
        </div>
      )}

      {/* ── COMPETITOR LIST ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
          <RefreshCw size={22} style={{ color: '#475569', animation: 'sh-spin 1s linear infinite' }} />
        </div>
      ) : competitors.length === 0 ? (
        <div style={{ background: 'linear-gradient(135deg,rgba(5,0,20,0.98),rgba(8,2,25,0.99))', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 20, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><ShadowOrb size={60} /></div>
          <p style={{ color: '#475569', fontSize: 14, margin: '0 0 8px' }}>Henüz izlenen rakip yok</p>
          <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>Rakip Hijacking'de rakip eklediğinizde burada otomatik görünür</p>
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
