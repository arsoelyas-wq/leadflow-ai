'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Search, Copy, CheckCircle, ExternalLink, Zap, TrendingUp, MessageSquare, Instagram, Hash, ChevronRight } from 'lucide-react'

// ── CHROMA SCOPE — Unique 3D Visual Trend Scanner ───────────────────────────
// Theme: color prism + visual scanner + trend detection
// A rotating chromatic prism with orbiting color fragments
function ChromaScope({ size = 110, scanning = false, colors = [] }: { size?: number; scanning?: boolean; colors?: string[] }) {
  const [mounted, setMounted] = useState(false)
  const [scanAngle, setScanAngle] = useState(0)
  const [fragments, setFragments] = useState<Array<{ x: number; y: number; r: number; color: string; angle: number; dist: number; age: number; id: number }>>([])

  const TREND_COLORS = colors.length > 0 ? colors : ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setScanAngle(a => (a + 0.8) % 360), 16)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!scanning || !mounted) return
    const t = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const dist = 0.55 + Math.random() * 0.4
      const color = TREND_COLORS[Math.floor(Math.random() * TREND_COLORS.length)]
      setFragments(prev => [...prev.slice(-12), {
        x: 0, y: 0, r: 3 + Math.random() * 5, color, angle, dist, age: 0,
        id: Date.now() + Math.random(),
      }])
    }, 400)
    const fade = setInterval(() => setFragments(prev =>
      prev.map(f => ({ ...f, age: f.age + 1 })).filter(f => f.age < 8)
    ), 300)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [scanning, mounted, TREND_COLORS])

  if (!mounted) return <div style={{ width: size * 2.1, height: size * 2.1, flexShrink: 0 }} />

  const cx = size * 1.05, s = size

  // 6 prismatic beam directions
  const BEAMS = [0, 60, 120, 180, 240, 300]

  // Scan sweep endpoint
  const bx = cx + Math.cos(scanAngle * Math.PI / 180) * s * 0.88
  const by = cx + Math.sin(scanAngle * Math.PI / 180) * s * 0.88
  const a1 = (scanAngle - 45) * Math.PI / 180
  const sx1 = cx + Math.cos(a1) * s * 0.88, sy1 = cx + Math.sin(a1) * s * 0.88

  return (
    <div style={{ width: s * 2.1, height: s * 2.1, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.1} height={s * 2.1} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {/* Prismatic center gradient — spectral rainbow */}
          <radialGradient id={`csPrism${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.95} />
            <stop offset="20%" stopColor="#f0abfc" stopOpacity={0.8} />
            <stop offset="40%" stopColor="#818cf8" stopOpacity={0.7} />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity={0.6} />
            <stop offset="80%" stopColor="#34d399" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.3} />
          </radialGradient>
          {/* Outer ambient glow */}
          <radialGradient id={`csGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="55%" stopColor="rgba(139,92,246,0.06)" />
            <stop offset="85%" stopColor="rgba(236,72,153,0.1)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.15)" />
          </radialGradient>
          {/* Scan sweep gradient */}
          <radialGradient id={`csSweep${s}`} cx={`${cx}px`} cy={`${cx}px`} r={`${s * 0.88}px`} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(139,92,246,0.5)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </radialGradient>
          {/* Beam gradients for each color */}
          {TREND_COLORS.map((c, i) => (
            <linearGradient key={i} id={`csBeam${s}_${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={c} stopOpacity={0.8} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          ))}
          <filter id="csBlur"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="csGlowF"><feGaussianBlur stdDeviation="5" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
        </defs>

        {/* ── AMBIENT BACKGROUND GLOW ── */}
        <circle cx={cx} cy={cx} r={s} fill={`url(#csGlow${s})`} />

        {/* ── CONCENTRIC SCANNING RINGS ── */}
        {[0.3, 0.52, 0.72, 0.9].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r}
            fill="none"
            stroke={`rgba(${i % 2 === 0 ? '139,92,246' : '236,72,153'},0.12)`}
            strokeWidth={0.8}
            strokeDasharray={`${Math.PI * 2 * s * r / 20} ${Math.PI * 2 * s * r / 40}`} />
        ))}

        {/* ── PRISMATIC LIGHT BEAMS (6 directions) ── */}
        {BEAMS.map((deg, i) => {
          const a = deg * Math.PI / 180
          const x2 = cx + Math.cos(a) * s * 0.85
          const y2 = cx + Math.sin(a) * s * 0.85
          const color = TREND_COLORS[i % TREND_COLORS.length]
          return (
            <g key={deg}>
              <line x1={cx} y1={cx} x2={x2} y2={y2}
                stroke={color} strokeWidth={1.5} opacity={0.35}
                strokeDasharray="4 6"
                style={{ animation: `csBeamPulse ${1.5 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.25}s` }} />
              {/* Beam end dot */}
              <circle cx={x2} cy={y2} r={3} fill={color} opacity={0.6}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
            </g>
          )
        })}

        {/* ── SCAN SWEEP ── */}
        <path d={`M ${cx} ${cx} L ${sx1} ${sy1} A ${s * 0.88} ${s * 0.88} 0 0 1 ${bx} ${by} Z`}
          fill={`url(#csSweep${s})`} opacity={0.45} />
        <line x1={cx} y1={cx} x2={bx} y2={by}
          stroke="#8b5cf6" strokeWidth={1.8} opacity={0.9}
          style={{ filter: 'drop-shadow(0 0 4px #8b5cf6)' }} />

        {/* ── CENTRAL PRISM — the "lens" ── */}
        {/* Outer prism ring */}
        <circle cx={cx} cy={cx} r={s * 0.42}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12}
          style={{ filter: 'blur(6px)' }} />
        {/* Prism body */}
        <circle cx={cx} cy={cx} r={s * 0.38}
          fill={`url(#csPrism${s})`}
          style={{ filter: `drop-shadow(0 0 ${s * 0.25}px rgba(139,92,246,0.8)) drop-shadow(0 0 ${s * 0.5}px rgba(236,72,153,0.4))` }}
          className="cs-prism-breathe" />
        {/* Inner iris rings */}
        {[0.25, 0.18, 0.1].map((r, i) => {
          const colors = ['rgba(167,139,250,0.4)', 'rgba(236,72,153,0.3)', 'rgba(6,182,212,0.25)']
          return (
            <circle key={r} cx={cx} cy={cx} r={s * r}
              fill="none" stroke={colors[i]} strokeWidth={1.5}
              style={{ animation: `cs-spin ${6 + i * 3}s linear ${i % 2 === 0 ? '' : 'reverse'} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
          )
        })}
        {/* Center focus point */}
        <circle cx={cx} cy={cx} r={s * 0.05}
          fill="white" opacity={0.9}
          style={{ filter: 'drop-shadow(0 0 8px white)' }} />
        <circle cx={cx} cy={cx} r={s * 0.09}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1}
          style={{ animation: 'cs-ping 2s ease-in-out infinite' }} />

        {/* ── ORBITING TREND FRAGMENTS (when scanning) ── */}
        {fragments.map(f => {
          const x = cx + Math.cos(f.angle + f.age * 0.2) * s * f.dist
          const y = cx + Math.sin(f.angle + f.age * 0.2) * s * f.dist
          const opacity = Math.max(0, 1 - f.age * 0.12)
          const r = f.r * (1 - f.age * 0.08)
          return (
            <g key={f.id}>
              <rect x={x - r} y={y - r} width={r * 2} height={r * 2}
                rx={r * 0.35} fill={f.color} opacity={opacity}
                style={{ filter: `drop-shadow(0 0 ${r}px ${f.color})` }} />
            </g>
          )
        })}

        {/* ── STATIC TREND COLOR SWATCHES (outer ring) ── */}
        {TREND_COLORS.map((color, i) => {
          const deg = (i / TREND_COLORS.length) * 360 + scanAngle * 0.15
          const a = deg * Math.PI / 180
          const rx = cx + Math.cos(a) * s * 0.78
          const ry = cx + Math.sin(a) * s * 0.78
          return (
            <rect key={i} x={rx - 5} y={ry - 5} width={10} height={10}
              rx={2} fill={color} opacity={0.55}
              style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
          )
        })}

        {/* ── OUTER LUXURY RING ── */}
        <circle cx={cx} cy={cx} r={s * 1.0}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5}
          strokeDasharray="8 6" />

        {/* ── CORNER BRACKETS ── */}
        {([[6,6,1,1],[s*2.1-6,6,-1,1],[6,s*2.1-6,1,-1],[s*2.1-6,s*2.1-6,-1,-1]] as number[][])
          .map(([x,y,dx,dy],i) => {
            const len = s * 0.1
            return <g key={i}>
              <line x1={x} y1={y} x2={x+dx*len} y2={y} stroke="rgba(139,92,246,0.5)" strokeWidth={1.8} />
              <line x1={x} y1={y} x2={x} y2={y+dy*len} stroke="rgba(139,92,246,0.5)" strokeWidth={1.8} />
            </g>
          })}

        {/* ── SCAN TIP DOT ── */}
        <circle cx={bx} cy={by} r={4} fill="#a78bfa"
          style={{ filter: 'drop-shadow(0 0 6px #a78bfa)' }} />
        <circle cx={bx} cy={by} r={7} fill="none" stroke="#a78bfa" strokeWidth={1}
          opacity={0.4} style={{ animation: 'cs-ping 1.2s ease-in-out infinite' }} />
      </svg>
    </div>
  )
}

// ── TREND SCORE GAUGE ─────────────────────────────────────────────────────────
function TrendGauge({ score = 0, momentum = 'stable' }: { score: number; momentum?: string }) {
  const color = score >= 75 ? '#ec4899' : score >= 50 ? '#8b5cf6' : '#06b6d4'
  const circ = 2 * Math.PI * 32
  const momentumIcon = momentum === 'rising' ? '🚀' : momentum === 'falling' ? '📉' : '→'
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width={80} height={80}>
        <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        <circle cx={40} cy={40} r={32} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" transform="rotate(-90 40 40)"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontWeight: 800, fontSize: 16, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 14, marginTop: 1 }}>{momentumIcon}</span>
      </div>
    </div>
  )
}

// ── COLOR SWATCH ──────────────────────────────────────────────────────────────
function ColorSwatch({ colors }: { colors: string[] }) {
  const colorMap: Record<string, string> = {
    'beyaz':'#f8fafc','bej':'#d2b48c','krem':'#fffdd0','gri':'#9ca3af',
    'siyah':'#1e293b','kahverengi':'#8b5e3c','lacivert':'#1e3a5f',
    'mavi':'#3b82f6','yeşil':'#10b981','sarı':'#fbbf24','turuncu':'#f97316',
    'kırmızı':'#ef4444','pembe':'#ec4899','mor':'#8b5cf6','turkuaz':'#06b6d4',
    'doğal ahşap':'#c19a6b','doğal':'#8fbc8f','pastel':'#ddd6fe','metalik':'#94a3b8',
    'altın':'#d97706','gümüş':'#94a3b8','bakır':'#b87333',
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {colors.map((c, i) => {
        const hex = colorMap[c.toLowerCase()] || `hsl(${i * 60 + 200},60%,55%)`
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: hex, boxShadow: `0 0 6px ${hex}88`, flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: 11 }}>{c}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── CAMPAIGN CARD ─────────────────────────────────────────────────────────────
function CampaignCard({ idea }: { idea: any }) {
  const [copied, setCopied] = useState(false)
  const channelColor = idea.channel === 'whatsapp' ? '#25d366' : idea.channel === 'instagram' ? '#e1306c' : '#3b82f6'
  const channelIcon = idea.channel === 'whatsapp' ? '💬' : idea.channel === 'instagram' ? '📸' : '✉️'
  return (
    <div style={{ background: `${channelColor}08`, border: `1px solid ${channelColor}22`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16 }}>{channelIcon}</span>
          <span style={{ color: channelColor, fontWeight: 700, fontSize: 12 }}>{idea.title}</span>
          {idea.targetGroup && <span style={{ color: '#475569', fontSize: 10 }}>→ {idea.targetGroup}</span>}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(idea.message); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: `1px solid ${channelColor}40`, background: 'transparent', color: channelColor, fontSize: 11, cursor: 'pointer' }}>
          {copied ? <CheckCircle size={11} /> : <Copy size={11} />} {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{idea.message}</p>
    </div>
  )
}

// ── TREND ITEM CARD ───────────────────────────────────────────────────────────
function TrendItem({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false)
  const ai = item.aiAnalysis
  const color = item.source === 'Pinterest' ? '#e60023' : item.source === 'Instagram' ? '#e1306c' : '#8b5cf6'
  return (
    <div style={{ background: 'rgba(3,5,18,0.8)', border: `1px solid ${color}20`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${color}45`}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${color}20`}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>{item.source === 'Pinterest' ? '📌' : item.source === 'Instagram' ? '📸' : '🌐'}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
          {ai && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>{ai.trend}</span>
              {ai.score && <span style={{ background: 'rgba(236,72,153,0.12)', color: '#f9a8d4', fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>Puan: {ai.score}/10</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {item.contextUrl && (
            <a href={item.contextUrl} target="_blank" rel="noopener noreferrer"
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 11 }}>
              <ExternalLink size={11} />
            </a>
          )}
          {ai && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}
        </div>
      </div>
      {expanded && ai && (
        <div style={{ borderTop: `1px solid ${color}15`, padding: '12px 16px', background: `${color}05` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <p style={{ color: '#475569', fontSize: 10, margin: '0 0 3px', fontWeight: 600 }}>STİL</p>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{ai.style}</p>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: 10, margin: '0 0 3px', fontWeight: 600 }}>HEDEF</p>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{ai.targetAudience}</p>
            </div>
          </div>
          {ai.colors?.length > 0 && <ColorSwatch colors={ai.colors} />}
          {ai.campaignIdea && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 9, border: '1px solid rgba(16,185,129,0.2)' }}>
              <p style={{ color: '#34d399', fontSize: 11, margin: '0 0 3px', fontWeight: 700 }}>💬 Kampanya Fikri</p>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{ai.campaignIdea}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function VisualTrendPage() {
  const { t } = useI18n()
  const [keyword, setKeyword] = useState('')
  const [sector, setSector] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'trends' | 'report' | 'campaigns'>('trends')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const loadHistory = async () => {
    try { const d = await api.get('/api/visual-trends/history'); setHistory(d.history || []) } catch {}
  }

  useEffect(() => { loadHistory() }, [])

  const analyze = async () => {
    if (!keyword) return
    setLoading(true); setResult(null)
    try {
      const data = await api.post('/api/visual-trends/analyze', { keyword, sector, analyzeImages: true })
      setResult(data)
      loadHistory()
      showMsg('success', `${data.images?.length || 0} trend sinyali yakalandı, ${data.analyzedCount} AI analizi`)
      setActiveTab('trends')
    } catch (e: any) { showMsg('error', e.message) }
    finally { setLoading(false) }
  }

  const QUICK_KEYWORDS = ['dekorasyon', 'duvar panel', 'mobilya', 'ofis tasarım', 'iç mekan', 'aydınlatma', 'banyo', 'mutfak']
  const SECTORS = ['mobilya','inşaat','tekstil','elektronik','gıda','sağlık','moda','turizm']

  const report = result?.report
  const trendColors = report?.dominantColors ? [] : []
  const allImages = result?.images || []

  const tabBtn = (id: string, label: string, count?: number) => (
    <button onClick={() => setActiveTab(id as any)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === id ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : 'rgba(255,255,255,0.04)', color: activeTab === id ? '#fff' : '#64748b', boxShadow: activeTab === id ? '0 4px 16px rgba(124,58,237,0.3)' : 'none' }}>
      {label} {count !== undefined && count > 0 && <span style={{ background: activeTab === id ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.2)', color: activeTab === id ? '#fff' : '#a78bfa', fontSize: 10, padding: '1px 6px', borderRadius: 10 }}>{count}</span>}
    </button>
  )

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(3,0,20,0.98),rgba(10,5,30,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(139,92,246,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, right: -20, width: 300, height: 300, background: 'radial-gradient(circle,rgba(139,92,246,0.1) 0%,rgba(236,72,153,0.06) 50%,transparent 70%)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 28 }}>
          <ChromaScope size={100} scanning={loading} colors={report?.dominantColors?.slice(0,6)} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Visual Trend Catcher</h1>
              <span style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>AI</span>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>{t('visual_trends.pinterest_instagramdan_tr', 'Pinterest & Instagram\'dan trend sinyalleri yakala — AI ile kampanya fikirleri üret')}</p>

            {/* Search bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input value={keyword} onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && analyze()}
                  placeholder={t('visual_trends.trend_arama_kelimesi_orn', 'Trend arama kelimesi (örn: duvar panel, dekorasyon...)')}
                  maxLength={100}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${keyword ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '12px 16px 12px 44px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              </div>
              <div style={{ position: 'relative', minWidth: 160 }}>
                <select value={sector} onChange={e => setSector(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 32px 12px 14px', color: sector ? '#fff' : '#64748b', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                  <option value="">{t('visual_trends.sektor_opsiyonel', 'Sektör (opsiyonel)')}</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', fontSize: 12 }}>▾</span>
              </div>
              <button onClick={analyze} disabled={loading || !keyword}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: loading || !keyword ? 'not-allowed' : 'pointer', background: keyword && !loading ? 'linear-gradient(135deg,#5b21b6,#7c3aed,#ec4899)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !keyword ? 0.4 : 1, boxShadow: keyword && !loading ? '0 6px 24px rgba(124,58,237,0.4)' : 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {loading ? <RefreshCw size={16} style={{ animation: 'vt-spin 1s linear infinite' }} /> : <Zap size={16} />}
                {loading ? 'Taranıyor...' : 'Trend Analiz Et'}
              </button>
            </div>

            {/* Quick keywords */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {QUICK_KEYWORDS.map(kw => (
                <button key={kw} onClick={() => setKeyword(kw)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.25)', background: keyword === kw ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)', color: keyword === kw ? '#a78bfa' : '#64748b', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Trend score (when result available) */}
          {report && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <TrendGauge score={report.trendScore || 0} momentum={report.trendMomentum} />
              <span style={{ color: '#475569', fontSize: 11, textAlign: 'center' }}>Trend<br/>Skoru</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(139,92,246,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(139,92,246,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#a78bfa' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      {/* ── RESULTS ───────────────────────────────────────────────────────── */}
      {result && (
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 22, border: '1px solid rgba(255,255,255,0.05)' }}>
            {tabBtn('trends', '📌 Trend Sinyalleri', allImages.length)}
            {tabBtn('report', '📊 Trend Raporu')}
            {tabBtn('campaigns', '⚡ Kampanya Fikirleri', report?.campaignIdeas?.length)}
          </div>

          {/* ── TAB: TRENDS ─────────────────────────────────────────────── */}
          {activeTab === 'trends' && (
            <div>
              {/* Summary banner */}
              {report && (
                <div style={{ marginBottom: 20, padding: '16px 20px', background: 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(236,72,153,0.08))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <Zap size={18} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ color: '#e2e8f0', fontSize: 14, margin: '0 0 8px', lineHeight: 1.5 }}>{report.summary}</p>
                    {report.dominantColors?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ color: '#475569', fontSize: 10, margin: '0 0 5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Dominant Renkler</p>
                        <ColorSwatch colors={report.dominantColors} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top trends */}
              {report?.topTrends?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                  {report.topTrends.map((t: string, i: number) => {
                    const colors = ['#ec4899','#8b5cf6','#06b6d4','#10b981','#f59e0b']
                    const c = colors[i % colors.length]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: `${c}12`, border: `1px solid ${c}28`, borderRadius: 20 }}>
                        <TrendingUp size={12} style={{ color: c }} />
                        <span style={{ color: c, fontSize: 12, fontWeight: 600 }}>{t}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Images/trends grid */}
              {allImages.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                  {allImages.map((item: any, i: number) => <TrendItem key={i} item={item} />)}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 48, color: '#334155' }}>
                  <ChromaScope size={56} />
                  <p style={{ marginTop: 16 }}>{t('visual_trends.trend_sinyali_bulunamadi', 'Trend sinyali bulunamadı — farklı bir keyword deneyin')}</p>
                  <p style={{ fontSize: 12, color: '#1e293b', marginTop: 8 }}>
                    {!result.sourcesAvailable?.exa && !result.sourcesAvailable?.tavily
                      ? 'EXA_API_KEY veya TAVILY_API_KEY Railway\'e eklenmemiş'
                      : ''}
                  </p>
                </div>
              )}

              {/* Web results */}
              {result.webResults?.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ color: '#475569', fontSize: 12, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>{t('visual_trends.web_trend_kaynaklari', '🌐 Web Trend Kaynakları')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.webResults.slice(0, 4).map((w: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(3,5,18,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 11 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#e2e8f0', fontSize: 13, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</p>
                          <p style={{ color: '#475569', fontSize: 11, margin: 0, lineHeight: 1.4 }}>{w.snippet?.slice(0, 120)}</p>
                        </div>
                        <a href={w.url} target="_blank" rel="noopener noreferrer"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: REPORT ─────────────────────────────────────────────── */}
          {activeTab === 'report' && report && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[
                { label: '📊 Özet', content: report.summary, color: '#8b5cf6' },
                { label: '🎯 Pazar Fırsatı', content: report.marketOpportunity, color: '#10b981' },
                { label: '👥 Hedef Kitle', content: report.targetAudience, color: '#06b6d4' },
                { label: '⏰ En İyi Paylaşım', content: report.bestPostingTime, color: '#f59e0b' },
              ].map(({ label, content, color }) => content ? (
                <div key={label} style={{ background: `${color}06`, border: `1px solid ${color}20`, borderRadius: 16, padding: 18 }}>
                  <p style={{ color, fontSize: 11, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
                  <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{content}</p>
                </div>
              ) : null)}

              {report.dominantStyles?.length > 0 && (
                <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 16, padding: 18 }}>
                  <p style={{ color: '#f9a8d4', fontSize: 11, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>🎨 Dominant Stiller</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {report.dominantStyles.map((s: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(236,72,153,0.12)', color: '#f9a8d4', fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(236,72,153,0.2)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {report.actionPlan?.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 18 }}>
                  <p style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>{t('visual_trends.aksiyon_plani', '📋 Aksiyon Planı')}</p>
                  {report.actionPlan.map((a: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                      <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}.</span>
                      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.4 }}>{a}</p>
                    </div>
                  ))}
                </div>
              )}

              {report.hashtags?.length > 0 && (
                <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: 18 }}>
                  <p style={{ color: '#67e8f9', fontSize: 11, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}><Hash size={11} style={{ display: 'inline' }} /> Hashtag'ler</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {report.hashtags.map((h: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(6,182,212,0.1)', color: '#67e8f9', fontSize: 12, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CAMPAIGNS ──────────────────────────────────────────── */}
          {activeTab === 'campaigns' && report?.campaignIdeas?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                AI {report.campaignIdeas.length} kampanya fikri oluşturdu — kopyalayıp hemen kullanabilirsin
              </p>
              {report.campaignIdeas.map((idea: any, i: number) => <CampaignCard key={i} idea={idea} />)}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY SIDEBAR INLINE ────────────────────────────────────────── */}
      {!result && history.length > 0 && (
        <div>
          <h3 style={{ color: '#475569', fontSize: 12, fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>Son Analizler</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {history.map(h => (
              <button key={h.id} onClick={() => setKeyword(h.keyword)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 22, color: '#a78bfa', fontSize: 12, cursor: 'pointer' }}>
                🔮 {h.keyword}
                <span style={{ color: '#334155', fontSize: 10 }}>{new Date(h.analyzed_at).toLocaleDateString('tr-TR')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <ChromaScope size={70} scanning={false} />
          </div>
          <p style={{ color: '#334155', fontSize: 14, margin: '0 0 6px' }}>{t('visual_trends.bir_trend_keywordu_girin', 'Bir trend keywordü girin ve analizi başlatın')}</p>
          <p style={{ color: '#1e293b', fontSize: 12 }}>Pinterest + Instagram sinyalleri + AI kampanya fikirleri</p>
        </div>
      )}

      <style>{`
        @keyframes vt-spin { to { transform: rotate(360deg); } }
        @keyframes csBeamPulse { 0%,100%{opacity:0.35}50%{opacity:0.7} }
        @keyframes cs-spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes cs-ping { 0%{transform:scale(1);opacity:0.6}100%{transform:scale(2);opacity:0} }
        .cs-prism-breathe { animation: csPrismBreath 3s ease-in-out infinite; }
        @keyframes csPrismBreath {
          0%,100% { filter: drop-shadow(0 0 20px rgba(139,92,246,0.8)) drop-shadow(0 0 40px rgba(236,72,153,0.4)); }
          50%      { filter: drop-shadow(0 0 32px rgba(139,92,246,1)) drop-shadow(0 0 60px rgba(236,72,153,0.6)); }
        }
      `}</style>
    </div>
  )
}
