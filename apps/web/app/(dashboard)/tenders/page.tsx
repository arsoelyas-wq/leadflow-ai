'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { FileText, Search, RefreshCw, Globe, CheckCircle, Clock, Star, ExternalLink, Bell, Trash2, X, Play, ChevronDown, BarChart2, AlertTriangle, TrendingUp, Copy, Download, Zap } from 'lucide-react'

// ── TENDER ORB — global sphere with orbiting tender nodes ─────────────────────
function TenderOrb({ size = 110, scanning = false, tenderCount = 0 }: { size?: number; scanning?: boolean; tenderCount?: number }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 20 : 45)
    return () => clearInterval(t)
  }, [mounted, scanning])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const rot = tick * (scanning ? 1.5 : 0.4)

  // Globe meridians
  const meridians = [0, 60, 120].map(deg => {
    const a = (deg + rot * 0.3) * Math.PI / 180
    const pts: string[] = []
    for (let lat = -80; lat <= 80; lat += 10) {
      const r2 = Math.cos(lat * Math.PI / 180)
      const x = cx + Math.cos(a) * s * 0.38 * r2
      const y = cx + Math.sin(lat * Math.PI / 180) * s * 0.38
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  })

  // Parallels
  const parallels = [-40, 0, 40].map((lat, i) => {
    const r2 = Math.cos(lat * Math.PI / 180)
    return { rx: s * 0.38 * r2, ry: s * 0.1 * r2, cy: cx + Math.sin(lat * Math.PI / 180) * s * 0.38 }
  })

  // Orbiting tender nodes
  const nodes = [0, 72, 144, 216, 288].map((deg, i) => {
    const a = (deg + rot * 0.8) * Math.PI / 180
    const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4']
    return { x: cx + Math.cos(a) * s * 0.82, y: cx + Math.sin(a) * s * 0.62, color: colors[i], active: i < Math.min(tenderCount, 5) }
  })

  // Scanning ring
  const scanAngle = (rot * 3) % 360
  const scanX = cx + Math.cos(scanAngle * Math.PI / 180) * s * 0.38
  const scanY = cx + Math.sin(scanAngle * Math.PI / 180) * s * 0.38

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`toGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
          </radialGradient>
          <radialGradient id={`toSphere${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="35%" stopColor="#7c3aed" />
            <stop offset="70%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0d0a1e" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#toGlow${s})`} />
        {[0.6, 0.78, 0.95].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth={0.8}
            strokeDasharray="5 7" style={{ animation: `to-ring ${8+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {/* Globe meridians */}
        {meridians.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke="rgba(139,92,246,0.25)" strokeWidth={0.8} />
        ))}
        {/* Globe parallels */}
        {parallels.map((p, i) => (
          <ellipse key={i} cx={cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth={0.8} />
        ))}
        {/* Core sphere */}
        <circle cx={cx} cy={cx} r={s * 0.38} fill={`url(#toSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${s * 0.2}px #7c3aed99)` }} />
        {/* Scanning line */}
        {scanning && (
          <line x1={cx} y1={cx} x2={scanX} y2={scanY} stroke="#f59e0b" strokeWidth={2} opacity={0.6}
            style={{ filter: 'drop-shadow(0 0 6px #f59e0b)' }} />
        )}
        {/* Highlight */}
        <ellipse cx={cx - s * 0.08} cy={cx - s * 0.16} rx={s * 0.1} ry={s * 0.06} fill="rgba(255,255,255,0.18)" style={{ filter: 'blur(3px)' }} />
        {/* Globe text */}
        <text x={cx} y={cx + 3} fill="white" fontSize={s * 0.1} textAnchor="middle" dominantBaseline="middle" fontWeight="900">🌍</text>
        {/* Orbiting tender nodes */}
        {nodes.map((node, i) => (
          <g key={i}>
            <line x1={cx} y1={cx} x2={node.x} y2={node.y} stroke={`${node.color}25`} strokeWidth={0.8} strokeDasharray="3 5" />
            <circle cx={node.x} cy={node.y} r={node.active ? 11 : 7}
              fill={`${node.color}${node.active ? '25' : '12'}`} stroke={`${node.color}${node.active ? '70' : '30'}`} strokeWidth={1.5}
              style={{ filter: node.active ? `drop-shadow(0 0 5px ${node.color}80)` : 'none' }} />
            {node.active && <text x={node.x} y={node.y} fill={node.color} fontSize={7} textAnchor="middle" dominantBaseline="middle" fontWeight="800">📄</text>}
          </g>
        ))}
      </svg>
      <style>{`@keyframes to-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { id:'worldwide',name:'🌍 Dünya Geneli',group:'Global' },{ id:'international',name:'🌐 BM / Dünya Bankası',group:'Global' },
  { id:'turkey',name:'🇹🇷 Türkiye',group:'Yakın' },{ id:'uae',name:'🇦🇪 BAE (Dubai)',group:'Yakın' },{ id:'saudi',name:'🇸🇦 Suudi Arabistan',group:'Yakın' },
  { id:'qatar',name:'🇶🇦 Katar',group:'Yakın' },{ id:'kuwait',name:'🇰🇼 Kuveyt',group:'Yakın' },{ id:'middleeast',name:'🕌 Orta Doğu',group:'Yakın' },
  { id:'eu',name:'🇪🇺 AB (Tümü)',group:'Avrupa' },{ id:'germany',name:'🇩🇪 Almanya',group:'Avrupa' },{ id:'france',name:'🇫🇷 Fransa',group:'Avrupa' },
  { id:'italy',name:'🇮🇹 İtalya',group:'Avrupa' },{ id:'spain',name:'🇪🇸 İspanya',group:'Avrupa' },{ id:'netherlands',name:'🇳🇱 Hollanda',group:'Avrupa' },
  { id:'poland',name:'🇵🇱 Polonya',group:'Avrupa' },{ id:'uk',name:'🇬🇧 İngiltere',group:'Avrupa' },
  { id:'usa',name:'🇺🇸 ABD',group:'Amerika' },{ id:'brazil',name:'🇧🇷 Brezilya',group:'Amerika' },
  { id:'china',name:'🇨🇳 Çin',group:'Asya' },{ id:'india',name:'🇮🇳 Hindistan',group:'Asya' },{ id:'asia',name:'🌏 Asya Geneli',group:'Asya' },
  { id:'russia',name:'🇷🇺 Rusya',group:'Diğer' },{ id:'africa',name:'🌍 Afrika',group:'Diğer' },
]

const SECTORS = [
  'Tekstil & Hazır Giyim','Mobilya & Dekorasyon','İnşaat & Yapı Malzemeleri','Gıda & Tarım',
  'Makine & Ekipman','Elektrik & Elektronik','Kimya & Plastik','Metal & Çelik',
  'Otomotiv & Parça','Sağlık & İlaç','Savunma & Güvenlik','Bilişim & Yazılım',
  'Enerji & Altyapı','Lojistik & Taşımacılık','Ambalaj','Tarım Makineleri',
]

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label:'Aktif',        color:'#34d399', bg:'rgba(16,185,129,0.12)' },
  applied:   { label:'Başvuruldu',   color:'#60a5fa', bg:'rgba(59,130,246,0.12)' },
  won:       { label:'Kazanıldı',    color:'#c084fc', bg:'rgba(139,92,246,0.12)' },
  lost:      { label:'Kaybedildi',   color:'#f87171', bg:'rgba(239,68,68,0.12)'  },
  dismissed: { label:'Reddedildi',   color:'#64748b', bg:'rgba(100,116,139,0.12)' },
}

function scoreColor(s: number) { return s >= 80 ? '#10b981' : s >= 65 ? '#f59e0b' : '#ef4444' }
function riskColor(r: string) { return r === 'Düşük' ? '#10b981' : r === 'Orta' ? '#f59e0b' : '#ef4444' }

function DaysLeft({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 864e5)
  if (days < 0) return <span style={{ color:'#ef4444', fontSize:10, fontWeight:700 }}>⏰ Süresi doldu</span>
  if (days <= 3) return <span style={{ color:'#ef4444', fontSize:10, fontWeight:700, animation:'tender-pulse 1s ease-in-out infinite' }}>⚠️ {days} gün kaldı!</span>
  if (days <= 7) return <span style={{ color:'#f59e0b', fontSize:10, fontWeight:700 }}>⏰ {days} gün</span>
  return <span style={{ color:'#64748b', fontSize:10 }}>📅 {days} gün</span>
}

// ── SCAN MODAL ────────────────────────────────────────────────────────────────
function ScanModal({ onClose, onStarted }: { onClose: () => void; onStarted: (scanId: string) => void }) {
  const [form, setForm] = useState({ keyword:'', country:'worldwide', sector:'', user_profile:'', save_pref:false })
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const grouped = COUNTRIES.reduce((acc, c) => { if (!acc[c.group]) acc[c.group] = []; acc[c.group].push(c); return acc }, {} as Record<string, typeof COUNTRIES>)
  const inp = { width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const }

  const start = async () => {
    if (!form.keyword.trim()) { setError('Anahtar kelime zorunlu'); return }
    setScanning(true); setError('')
    try {
      const data: any = await api.post('/api/tenders/scan', form)
      onStarted(data.scanId || '')
      onClose()
    } catch (e: any) { setError(e.message || 'Hata oluştu'); setScanning(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'linear-gradient(135deg,#0a0c14,#0d1120)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:22, padding:30, width:520, maxWidth:'94vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>🔍 İhale Tarama Başlat</h2>
            <p style={{ color:'#475569', fontSize:12, margin:'4px 0 0' }}>EKAP · TED Europa · World Bank · Exa.ai · Tavily</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Anahtar Kelime *</label>
            <input value={form.keyword} onChange={e => setForm(p => ({ ...p, keyword:e.target.value }))}
              placeholder="örn: tekstil, mobilya, inşaat malzemeleri..." style={inp}
              onKeyDown={e => e.key === 'Enter' && start()} />
          </div>
          <div>
            <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Ülke / Bölge</label>
            <select value={form.country} onChange={e => setForm(p => ({ ...p, country:e.target.value }))} style={{ ...inp, height:44 }}>
              {Object.entries(grouped).map(([grp, countries]) => (
                <optgroup key={grp} label={grp}>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Sektör (opsiyonel)</label>
            <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector:e.target.value }))} style={{ ...inp, height:44 }}>
              <option value="">Sektör seçin...</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>
              Firma Profili <span style={{ color:'#334155' }}>(AI skoru için — ne üretiyorsunuz?)</span>
            </label>
            <textarea value={form.user_profile} onChange={e => setForm(p => ({ ...p, user_profile:e.target.value }))}
              placeholder="örn: 50 kişilik tekstil ihracatçısı, AB kalite belgelerimiz var, yıllık 3M EUR ihracat kapasitesi"
              rows={2} style={{ ...inp, resize:'vertical' as const }} />
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <div onClick={() => setForm(p => ({ ...p, save_pref:!p.save_pref }))}
              style={{ width:38, height:20, borderRadius:10, background:form.save_pref?'#7c3aed':'rgba(100,116,139,0.3)', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:2, left:form.save_pref?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
            </div>
            <div>
              <p style={{ color:'#fff', fontSize:13, margin:0 }}>Her gün otomatik tara</p>
              <p style={{ color:'#475569', fontSize:11, margin:0 }}>Yeni ihaleler bulunduğunda bildirim al</p>
            </div>
          </label>
          {error && <p style={{ color:'#f87171', fontSize:12, background:'rgba(239,68,68,0.08)', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>}
          <button onClick={start} disabled={scanning || !form.keyword}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:14, fontWeight:700, cursor:scanning||!form.keyword?'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' }}>
            {scanning ? <RefreshCw size={15} style={{ animation:'tender-spin 1s linear infinite' }} /> : <Search size={15} />}
            {scanning ? 'Tarama Başlatılıyor...' : 'Taramayı Başlat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SCAN PROGRESS BAR ─────────────────────────────────────────────────────────
function ScanProgress({ scanId, onComplete }: { scanId: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(5)
  const [status, setStatus] = useState('running')
  const [found, setFound] = useState(0)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data: any = await api.get(`/api/tenders/scans/${scanId}/status`)
        setProgress(data.progress || 0)
        setFound(data.tenders_found || 0)
        setStatus(data.status)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
          if (data.status === 'completed') setTimeout(onComplete, 1500)
        }
      } catch { clearInterval(interval) }
    }, 4000)
    return () => clearInterval(interval)
  }, [scanId])

  if (status === 'completed') return (
    <div style={{ padding:'14px 20px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
      <CheckCircle size={16} color="#10b981" />
      <p style={{ color:'#34d399', fontSize:13, margin:0, fontWeight:600 }}>✅ Tarama tamamlandı — {found} yeni ihale bulundu! Sayfayı yeniliyorum...</p>
    </div>
  )
  if (status === 'failed') return (
    <div style={{ padding:'14px 20px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12 }}>
      <p style={{ color:'#f87171', fontSize:13, margin:0 }}>❌ Tarama başarısız oldu</p>
    </div>
  )

  return (
    <div style={{ padding:'16px 20px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <RefreshCw size={14} color="#a78bfa" style={{ animation:'tender-spin 1s linear infinite' }} />
          <p style={{ color:'#a78bfa', fontSize:13, margin:0, fontWeight:600 }}>İhale taraması devam ediyor...</p>
        </div>
        <span style={{ color:'#a78bfa', fontSize:12, fontWeight:700 }}>{progress}%</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius:3, transition:'width 0.5s', boxShadow:'0 0 10px rgba(124,58,237,0.5)' }} />
      </div>
      <p style={{ color:'#475569', fontSize:11, margin:'8px 0 0' }}>EKAP · TED Europa · World Bank · Exa.ai · Tavily — ~60 saniye</p>
    </div>
  )
}

// ── TENDER DETAIL PANEL ────────────────────────────────────────────────────────
function TenderDetail({ tender, onUpdate, onClose }: { tender: any; onUpdate: (id: string, status: string) => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'info'|'requirements'|'proposal'>('info')
  const [generating, setGenerating] = useState(false)
  const [proposal, setProposal] = useState<string | null>(tender.proposal_draft || null)
  const [companyInfo, setCompanyInfo] = useState('')
  const [copied, setCopied] = useState(false)
  const sc = tender.ai_score || 60

  const generateProposal = async () => {
    if (!companyInfo.trim()) return
    setGenerating(true); setProposal(null)
    try {
      const data: any = await api.post(`/api/tenders/${tender.id}/proposal`, { company_info: companyInfo })
      setProposal(data.proposal)
    } catch {}
    setGenerating(false)
  }

  const copyProposal = () => { if (proposal) { navigator.clipboard?.writeText(proposal); setCopied(true); setTimeout(() => setCopied(false), 2000) } }

  const inp = { width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const }
  const statusMeta = STATUS_META[tender.status] || STATUS_META.active

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'linear-gradient(135deg,rgba(3,6,22,0.98),rgba(5,5,20,0.99))', borderLeft:'1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.06)', border:'none', color:'#64748b', cursor:'pointer', width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} /></button>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:44, height:44, borderRadius:11, background:`${scoreColor(sc)}20`, border:`1px solid ${scoreColor(sc)}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:scoreColor(sc), fontSize:15, fontWeight:900 }}>{sc}</span>
          </div>
          <div style={{ flex:1, minWidth:0, paddingRight:32 }}>
            <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:'0 0 4px', lineHeight:1.4 }}>{tender.title}</p>
            <p style={{ color:'#64748b', fontSize:11, margin:0 }}>{tender.institution}</p>
          </div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          <span style={{ background:statusMeta.bg, border:`1px solid ${statusMeta.color}30`, color:statusMeta.color, fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{statusMeta.label}</span>
          <span style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', color:'#a78bfa', fontSize:10, padding:'2px 8px', borderRadius:20 }}>{tender.source}</span>
          <span style={{ background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)', color:'#22d3ee', fontSize:10, padding:'2px 8px', borderRadius:20 }}>{tender.country}</span>
          {tender.budget_text && <span style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#fbbf24', fontSize:10, padding:'2px 8px', borderRadius:20 }}>💰 {tender.budget_text}</span>}
          {tender.deadline && <span style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', fontSize:10, padding:'2px 8px', borderRadius:20 }}><DaysLeft deadline={tender.deadline} /></span>}
          {tender.risk_level && <span style={{ background:`${riskColor(tender.risk_level)}12`, border:`1px solid ${riskColor(tender.risk_level)}30`, color:riskColor(tender.risk_level), fontSize:10, padding:'2px 8px', borderRadius:20 }}>⚡ Risk: {tender.risk_level}</span>}
        </div>
      </div>

      {/* Status actions */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:6, flexWrap:'wrap' }}>
        {['applied','won','lost','dismissed'].map(s => (
          <button key={s} onClick={() => onUpdate(tender.id, s)} disabled={tender.status === s}
            style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${STATUS_META[s]?.color}30`, background:tender.status===s?`${STATUS_META[s]?.color}20`:'transparent', color:STATUS_META[s]?.color, fontSize:10, fontWeight:600, cursor:tender.status===s?'default':'pointer', opacity:tender.status===s?1:0.7 }}>
            {STATUS_META[s]?.label}
          </button>
        ))}
        {tender.source_url && (
          <a href={tender.source_url} target="_blank" rel="noopener noreferrer"
            style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, border:'1px solid rgba(6,182,212,0.3)', color:'#22d3ee', fontSize:10, textDecoration:'none' }}>
            <ExternalLink size={11} /> Kaynağa Git
          </a>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, padding:'10px 20px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        {[{id:'info',label:'📋 Bilgi'},{id:'requirements',label:'✅ Şartlar'},{id:'proposal',label:'✍️ Teklif'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding:'6px 14px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:activeTab===t.id?'rgba(139,92,246,0.15)':'transparent', color:activeTab===t.id?'#a78bfa':'#64748b', borderBottom:activeTab===t.id?'2px solid #7c3aed':'2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {activeTab === 'info' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {tender.ai_summary && (
              <div style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:11, padding:'12px 14px' }}>
                <p style={{ color:'#a78bfa', fontSize:11, fontWeight:700, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:1 }}>AI Özet</p>
                <p style={{ color:'#e2e8f0', fontSize:12, margin:0, lineHeight:1.6 }}>{tender.ai_summary}</p>
              </div>
            )}
            {tender.ai_recommendation && (
              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:11, padding:'12px 14px' }}>
                <p style={{ color:'#34d399', fontSize:11, fontWeight:700, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:1 }}>Öneri</p>
                <p style={{ color:'#94a3b8', fontSize:12, margin:0, lineHeight:1.6 }}>{tender.ai_recommendation}</p>
              </div>
            )}
            {tender.match_reason && (
              <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:11, padding:'12px 14px' }}>
                <p style={{ color:'#fbbf24', fontSize:11, fontWeight:700, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:1 }}>Firma Uyumu</p>
                <p style={{ color:'#94a3b8', fontSize:12, margin:0, lineHeight:1.6 }}>{tender.match_reason}</p>
              </div>
            )}
            {tender.notes && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:11, padding:'12px 14px' }}>
                <p style={{ color:'#64748b', fontSize:11, fontWeight:700, margin:'0 0 5px' }}>NOTLAR</p>
                <p style={{ color:'#94a3b8', fontSize:12, margin:0, lineHeight:1.6 }}>{tender.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requirements' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { title:'Katılım Şartları', content:tender.requirements, color:'#06b6d4', icon:'📋' },
              { title:'Kimler Başvurabilir', content:tender.eligibility, color:'#10b981', icon:'👥' },
              { title:'Gerekli Belgeler', content:tender.documents, color:'#f59e0b', icon:'📄' },
            ].filter(s => s.content).map(section => (
              <div key={section.title} style={{ background:`${section.color}08`, border:`1px solid ${section.color}20`, borderRadius:11, padding:'12px 14px' }}>
                <p style={{ color:section.color, fontSize:11, fontWeight:700, margin:'0 0 6px' }}>{section.icon} {section.title}</p>
                <p style={{ color:'#94a3b8', fontSize:12, margin:0, lineHeight:1.7 }}>{section.content}</p>
              </div>
            ))}
            {!tender.requirements && !tender.eligibility && !tender.documents && (
              <p style={{ color:'#334155', textAlign:'center', padding:24, fontSize:13 }}>AI analizi henüz yapılmadı</p>
            )}
          </div>
        )}

        {activeTab === 'proposal' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {!proposal ? (
              <>
                <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:11, padding:'12px 14px' }}>
                  <p style={{ color:'#a78bfa', fontSize:12, margin:0, lineHeight:1.6 }}>
                    🤖 Claude Opus ile profesyonel ihale teklif mektubu oluşturun. Firma bilgilerinizi girin, teklif hazır olsun.
                  </p>
                </div>
                <div>
                  <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Firma Bilgileri</label>
                  <textarea value={companyInfo} onChange={e => setCompanyInfo(e.target.value)}
                    placeholder="Firma adı, sektör, kapasite, AB sertifikaları, referanslar, ihracat deneyimi..."
                    rows={4} style={{ ...inp, resize:'vertical' as const }} />
                </div>
                <button onClick={generateProposal} disabled={generating || !companyInfo.trim()}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:generating||!companyInfo.trim()?'not-allowed':'pointer', boxShadow:'0 3px 14px rgba(124,58,237,0.35)' }}>
                  {generating ? <RefreshCw size={14} style={{ animation:'tender-spin 1s linear infinite' }} /> : <Zap size={14} />}
                  {generating ? 'Teklif Yazılıyor...' : 'Teklif Taslağı Oluştur'}
                </button>
              </>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
                  <button onClick={copyProposal} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.08)', color:'#34d399', fontSize:11, cursor:'pointer' }}>
                    {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                  <button onClick={() => setProposal(null)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', fontSize:11, cursor:'pointer' }}>Yeniden Yaz</button>
                </div>
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:11, padding:'16px 18px', maxHeight:400, overflowY:'auto' }}>
                  <pre style={{ color:'#e2e8f0', fontSize:12, margin:0, whiteSpace:'pre-wrap', lineHeight:1.8, fontFamily:'inherit' }}>{proposal}</pre>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TendersPage() {
  const [tenders, setTenders] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [prefs, setPrefs] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTender, setSelectedTender] = useState<any>(null)
  const [showScan, setShowScan] = useState(false)
  const [activeScanId, setActiveScanId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tenders'|'alerts'|'analytics'|'prefs'>('tenders')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [msg, setMsg] = useState<{ type:'success'|'error'; text:string } | null>(null)

  const showMsg = (type: 'success'|'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000) }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit:'200' })
    if (filterCountry) params.set('country', filterCountry)
    if (filterScore) params.set('min_score', filterScore)
    if (filterStatus) params.set('status', filterStatus)
    const [t, s, pr, al, an] = await Promise.allSettled([
      api.get(`/api/tenders?${params}`),
      api.get('/api/tenders/stats/summary'),
      api.get('/api/tenders/prefs'),
      api.get('/api/tenders/deadline-alerts'),
      api.get('/api/tenders/win-analytics'),
    ])
    if (t.status === 'fulfilled') setTenders((t.value as any).tenders || [])
    if (s.status === 'fulfilled') setStats(s.value)
    if (pr.status === 'fulfilled') setPrefs((pr.value as any).prefs || [])
    if (al.status === 'fulfilled') setAlerts((al.value as any).alerts || [])
    if (an.status === 'fulfilled') setAnalytics(an.value)
    setLoading(false)
  }, [filterCountry, filterScore, filterStatus])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/tenders/${id}`, { status })
      setTenders(p => p.map(t => t.id === id ? { ...t, status } : t))
      if (selectedTender?.id === id) setSelectedTender((p: any) => ({ ...p, status }))
    } catch (e: any) { showMsg('error', e.message) }
  }

  const deletePref = async (id: string) => {
    await api.delete(`/api/tenders/prefs/${id}`)
    setPrefs(p => p.filter(x => x.id !== id))
  }

  const scoreColors = { bg: (s: number) => `${scoreColor(s)}20`, border: (s: number) => `${scoreColor(s)}40` }
  const card = { background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16 }

  return (
    <div style={{ padding:0, display:'flex', flexDirection:'column', height:'100%' }}>
      {showScan && <ScanModal onClose={() => setShowScan(false)} onStarted={id => { setActiveScanId(id); setShowScan(false) }} />}

      {/* Hero */}
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(8,3,22,0.98),rgba(3,8,22,0.99))', borderRadius:20, padding:'28px 28px', marginBottom:20, border:'1px solid rgba(139,92,246,0.2)', flexShrink:0 }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(139,92,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.02) 1px,transparent 1px)', backgroundSize:'40px 40px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:22 }}>
          <TenderOrb size={85} scanning={!!activeScanId} tenderCount={tenders.length} />
          <div style={{ flex:1 }}>
            <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:'0 0 4px' }}>İhale Avcısı</h1>
            <p style={{ color:'#64748b', fontSize:13, margin:'0 0 16px' }}>23 ülke · EKAP · TED Europa · World Bank · Exa.ai · AI analiz · Teklif taslağı</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
              {[{l:'Toplam',v:stats?.total||0,c:'#94a3b8'},{l:'Aktif',v:stats?.active||0,c:'#10b981'},{l:'Yüksek Skor',v:stats?.highScore||0,c:'#8b5cf6'},{l:'Başvuruldu',v:stats?.applied||0,c:'#3b82f6'},{l:'Kazanıldı',v:stats?.won||0,c:'#c084fc'},{l:'Tarama',v:stats?.totalScans||0,c:'#f59e0b'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:17, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#334155', fontSize:10, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <button onClick={() => setShowScan(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 18px rgba(124,58,237,0.4)' }}>
              <Search size={15} /> İhale Tara
            </button>
            <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#64748b', fontSize:12, cursor:'pointer' }}>
              <RefreshCw size={13} style={{ animation:loading?'tender-spin 1s linear infinite':'none' }} /> Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Scan Progress */}
      {activeScanId && (
        <div style={{ marginBottom:16, flexShrink:0 }}>
          <ScanProgress scanId={activeScanId} onComplete={() => { setActiveScanId(null); load() }} />
        </div>
      )}

      {/* Alert bar */}
      {alerts.length > 0 && activeTab === 'tenders' && (
        <div style={{ marginBottom:14, padding:'12px 18px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <AlertTriangle size={15} color="#ef4444" />
          <p style={{ color:'#f87171', fontSize:13, margin:0 }}><strong>{alerts.length} ihale</strong> son 7 gün içinde kapanıyor — hemen kontrol edin!</p>
          <button onClick={() => setActiveTab('alerts')} style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:7, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:11, cursor:'pointer' }}>Görüntüle</button>
        </div>
      )}

      {msg && <div style={{ marginBottom:12, padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10, flexShrink:0 }}><p style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, margin:0 }}>{msg.text}</p></div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.3)', padding:4, borderRadius:12, width:'fit-content', marginBottom:16, border:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        {[{id:'tenders',label:`📋 İhaleler (${tenders.length})`},{id:'alerts',label:`⏰ Vadesi Yaklaşan${alerts.length>0?` (${alerts.length})`:''}`,},{id:'analytics',label:'📊 Analitik'},{id:'prefs',label:`🔔 Otomatik (${prefs.length})`}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===t.id?'linear-gradient(135deg,#4c1d95,#7c3aed)':'transparent', color:activeTab===t.id?'#fff':'#64748b', boxShadow:activeTab===t.id?'0 3px 12px rgba(124,58,237,0.3)':'none', whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TENDERS TAB */}
      {activeTab === 'tenders' && (
        <div style={{ display:'flex', gap:0, flex:1, minHeight:0 }}>
          {/* Left: tender list */}
          <div style={{ flex: selectedTender ? '0 0 420px' : '1', display:'flex', flexDirection:'column', gap:0, overflowY:'auto', paddingRight: selectedTender ? 16 : 0 }}>
            {/* Filters */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexShrink:0, flexWrap:'wrap' }}>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                style={{ background:'rgba(3,8,22,0.9)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'7px 12px', color:'#fff', fontSize:12, outline:'none', cursor:'pointer' }}>
                <option value="">Tüm Ülkeler</option>
                {COUNTRIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={filterScore} onChange={e => setFilterScore(e.target.value)}
                style={{ background:'rgba(3,8,22,0.9)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'7px 12px', color:'#fff', fontSize:12, outline:'none', cursor:'pointer' }}>
                <option value="">Tüm Skorlar</option>
                <option value="80">80+ (Yüksek)</option>
                <option value="65">65+ (İyi)</option>
                <option value="50">50+ (Orta)</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ background:'rgba(3,8,22,0.9)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'7px 12px', color:'#fff', fontSize:12, outline:'none', cursor:'pointer' }}>
                <option value="">Tüm Durumlar</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={load} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Filtrele
              </button>
            </div>

            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', height:120, alignItems:'center' }}><RefreshCw size={24} style={{ color:'#475569', animation:'tender-spin 1s linear infinite' }} /></div>
            ) : tenders.length === 0 ? (
              <div style={{ textAlign:'center', padding:56, ...card }}>
                <div style={{ fontSize:44, marginBottom:14 }}>📋</div>
                <h3 style={{ color:'#fff', fontSize:16, fontWeight:700, margin:'0 0 8px' }}>Henüz ihale yok</h3>
                <p style={{ color:'#475569', fontSize:13, margin:'0 0 20px' }}>Anahtar kelimenizi girin, tarama başlatın</p>
                <button onClick={() => setShowScan(true)}
                  style={{ padding:'11px 24px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  İlk Taramayı Başlat
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {tenders.map(tender => {
                  const sc = tender.ai_score || 60
                  const sm = STATUS_META[tender.status] || STATUS_META.active
                  const isSelected = selectedTender?.id === tender.id
                  return (
                    <div key={tender.id} onClick={() => setSelectedTender(isSelected ? null : tender)}
                      style={{ ...card, padding:'14px 16px', cursor:'pointer', border:`1px solid ${isSelected ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`, background:isSelected?'rgba(139,92,246,0.06)':'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', display:'flex', alignItems:'flex-start', gap:12, transition:'all 0.15s' }}>
                      {/* Score circle */}
                      <div style={{ width:44, height:44, borderRadius:11, background:scoreColors.bg(sc), border:`1px solid ${scoreColors.border(sc)}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ color:scoreColor(sc), fontSize:14, fontWeight:900, lineHeight:1 }}>{sc}</span>
                        <span style={{ color:'#334155', fontSize:8 }}>puan</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:'0 0 5px', lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{tender.title}</p>
                        <p style={{ color:'#475569', fontSize:11, margin:'0 0 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tender.institution}</p>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                          <span style={{ background:sm.bg, border:`1px solid ${sm.color}30`, color:sm.color, fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:600 }}>{sm.label}</span>
                          <span style={{ background:'rgba(139,92,246,0.1)', color:'#a78bfa', fontSize:10, padding:'2px 6px', borderRadius:6 }}>{tender.source}</span>
                          {tender.budget_text && <span style={{ color:'#fbbf24', fontSize:10 }}>💰 {tender.budget_text}</span>}
                          <DaysLeft deadline={tender.deadline} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          {selectedTender && (
            <div style={{ flex:1, ...card, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <TenderDetail tender={selectedTender} onUpdate={updateStatus} onClose={() => setSelectedTender(null)} />
            </div>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign:'center', padding:48, ...card }}>
              <CheckCircle size={32} color="#10b981" style={{ margin:'0 auto 12px', display:'block' }} />
              <p style={{ color:'#34d399', fontSize:14, margin:0 }}>Vadesi yaklaşan ihale yok — tüm ihaleler güvende</p>
            </div>
          ) : alerts.map((t: any) => (
            <div key={t.id} onClick={() => { setSelectedTender(t); setActiveTab('tenders') }}
              style={{ ...card, padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, border:'1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Clock size={18} color="#ef4444" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:'0 0 3px' }}>{t.title}</p>
                <p style={{ color:'#475569', fontSize:11, margin:0 }}>{t.country} · Skor: {t.ai_score}</p>
              </div>
              <DaysLeft deadline={t.deadline} />
            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { l:'Toplam Başvuru', v:analytics?.totalApplied||0, c:'#06b6d4' },
              { l:'Kazanılan', v:analytics?.wonCount||0, c:'#10b981' },
              { l:'Kazanma Oranı', v:`%${analytics?.winRate||0}`, c:'#8b5cf6' },
              { l:'Ort. Skor', v:analytics?.avgScore||0, c:'#f59e0b' },
            ].map(m => (
              <div key={m.l} style={{ ...card, padding:'18px 16px', textAlign:'center' }}>
                <p style={{ color:m.c, fontSize:26, fontWeight:900, margin:0 }}>{m.v}</p>
                <p style={{ color:'#475569', fontSize:11, margin:'4px 0 0' }}>{m.l}</p>
              </div>
            ))}
          </div>
          {analytics?.byCountry?.length > 0 && (
            <div style={{ ...card, padding:22 }}>
              <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🌍 Ülke Bazlı Kazanma Oranı</h3>
              {analytics.byCountry.map((r: any) => (
                <div key={r.country} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'#94a3b8', fontSize:12 }}>{r.country}</span>
                    <span style={{ color:'#10b981', fontSize:12, fontWeight:700 }}>%{r.rate} ({r.won}/{r.applied})</span>
                  </div>
                  <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
                    <div style={{ height:'100%', width:`${r.rate}%`, background:`linear-gradient(90deg,#10b981,#34d399)`, borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {(!analytics || analytics.totalApplied === 0) && (
            <div style={{ ...card, padding:40, textAlign:'center', color:'#475569' }}>
              <BarChart2 size={32} style={{ margin:'0 auto 12px', display:'block', color:'#334155' }} />
              <p style={{ fontSize:13, margin:0 }}>Analitik için ihalelere başvurun ve sonuçları işaretleyin</p>
            </div>
          )}
        </div>
      )}

      {/* PREFS TAB */}
      {activeTab === 'prefs' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>
          {prefs.length === 0 ? (
            <div style={{ ...card, padding:40, textAlign:'center', color:'#475569' }}>
              <Bell size={28} style={{ margin:'0 auto 12px', display:'block', color:'#334155' }} />
              <p style={{ fontSize:14, margin:'0 0 8px', color:'#94a3b8' }}>Otomatik tarama kaydı yok</p>
              <p style={{ fontSize:12, margin:'0 0 16px' }}>Tarama başlatırken "Her gün otomatik tara" seçeneğini işaretleyin</p>
              <button onClick={() => setShowScan(true)} style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Yeni Tarama Ekle</button>
            </div>
          ) : prefs.map(pref => (
            <div key={pref.id} style={{ ...card, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:9, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Bell size={16} color="#8b5cf6" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:'0 0 2px' }}>{pref.keyword}</p>
                <div style={{ display:'flex', gap:8, fontSize:11, color:'#475569' }}>
                  <span>{COUNTRIES.find(c => c.id === pref.country)?.name || pref.country}</span>
                  {pref.sector && <span>· {pref.sector}</span>}
                  <span style={{ color:'#10b981' }}>· Günlük aktif</span>
                </div>
              </div>
              <button onClick={() => deletePref(pref.id)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.06)', color:'#f87171', cursor:'pointer' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes tender-spin{to{transform:rotate(360deg)}}
        @keyframes tender-pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>
    </div>
  )
}
