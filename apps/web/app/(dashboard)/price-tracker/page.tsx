'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Plus, ExternalLink, Trash2, Target, TrendingDown, TrendingUp, Bell, CheckCircle, X, Eye, Radio, Lightbulb } from 'lucide-react'

// ── PRICE SPHERE — Luxury Gold Financial Orb (Bloomberg/Wall Street aesthetic) ─
// Gold metallic sphere + 3 orbital rings + candlestick elements + holographic glow
function PriceSphere({ size = 100, direction = 'flat' }: { size?: number; direction?: 'up' | 'down' | 'flat' }) {
  const [mounted, setMounted] = useState(false)
  const [angle, setAngle] = useState(0)
  const [candleData, setCandleData] = useState([
    { o: 55, c: 62, h: 66, l: 52 }, { o: 62, c: 58, h: 64, l: 55 },
    { o: 58, c: 70, h: 73, l: 56 }, { o: 70, c: 65, h: 72, l: 62 },
    { o: 65, c: 75, h: 78, l: 63 },
  ])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setAngle(a => (a + 0.4) % 360)
      if (Math.random() < 0.1) {
        setCandleData(prev => {
          const last = prev[prev.length - 1]
          const o = last.c, c = o + (Math.random() - 0.48) * 12
          const h = Math.max(o, c) + Math.random() * 5, l = Math.min(o, c) - Math.random() * 5
          return [...prev.slice(-4), { o, c: Math.round(c), h: Math.round(h), l: Math.round(l) }]
        })
      }
    }, 30)
    return () => clearInterval(t)
  }, [mounted])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  // Accent color: emerald for drops, crimson for rises, gold for flat
  const accent = direction === 'down' ? '#10b981' : direction === 'up' ? '#ef4444' : '#d97706'
  const gold = '#d97706'
  const goldLight = '#fbbf24'

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {/* Deep luxury glow */}
          <radialGradient id={`luxGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="50%" stopColor={`${accent}0a`} />
            <stop offset="80%" stopColor={`${gold}12`} />
            <stop offset="100%" stopColor={`${gold}20`} />
          </radialGradient>
          {/* Metallic gold sphere gradient */}
          <radialGradient id={`luxSphere${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#fff8e1" />
            <stop offset="15%" stopColor="#fde68a" />
            <stop offset="40%" stopColor={goldLight} />
            <stop offset="65%" stopColor={gold} />
            <stop offset="85%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#1c0a00" />
          </radialGradient>
          {/* Ring gradient */}
          <linearGradient id={`luxRing${s}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gold} stopOpacity={0} />
            <stop offset="30%" stopColor={gold} stopOpacity={0.6} />
            <stop offset="70%" stopColor={accent} stopOpacity={0.8} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
          {/* Candle up/down */}
          <linearGradient id={`luxUp${s}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" /><stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id={`luxDn${s}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" /><stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* ── DEEP AMBIENT GLOW ── */}
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#luxGlow${s})`} />

        {/* ── HOLOGRAPHIC FLOOR PROJECTION ── */}
        <ellipse cx={cx} cy={cx + s * 0.62} rx={s * 0.72} ry={s * 0.14}
          fill="none" stroke={`${gold}25`} strokeWidth={1}
          style={{ filter: `drop-shadow(0 0 8px ${gold}40)` }} />
        <ellipse cx={cx} cy={cx + s * 0.62} rx={s * 0.48} ry={s * 0.09}
          fill="none" stroke={`${accent}30`} strokeWidth={0.7} />

        {/* ── ORBITAL RING 1 — equatorial (gold) ── */}
        <ellipse cx={cx} cy={cx - s * 0.04} rx={s * 0.88} ry={s * 0.22}
          fill="none" stroke={`url(#luxRing${s})`} strokeWidth={1.8}
          style={{ animation: 'pt-ring1 8s linear infinite', transformOrigin: `${cx}px ${cx}px` }} />
        {/* Particle on ring 1 */}
        <circle cx={cx + Math.cos(angle * Math.PI / 180) * s * 0.88}
          cy={cx - s * 0.04 + Math.sin(angle * Math.PI / 180) * s * 0.22}
          r={3.5} fill={goldLight} style={{ filter: `drop-shadow(0 0 6px ${goldLight})` }} />

        {/* ── ORBITAL RING 2 — tilted 60° (accent) ── */}
        <ellipse cx={cx} cy={cx} rx={s * 0.72} ry={s * 0.36}
          fill="none" stroke={`${accent}50`} strokeWidth={1.2}
          style={{ animation: 'pt-ring2 12s linear infinite', transformOrigin: `${cx}px ${cx}px` }} />
        <circle cx={cx + Math.cos((angle * 1.3 + 120) * Math.PI / 180) * s * 0.72}
          cy={cx + Math.sin((angle * 1.3 + 120) * Math.PI / 180) * s * 0.36}
          r={2.5} fill={accent} style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />

        {/* ── ORBITAL RING 3 — vertical (gold thin) ── */}
        <ellipse cx={cx} cy={cx} rx={s * 0.18} ry={s * 0.82}
          fill="none" stroke={`${gold}30`} strokeWidth={0.8}
          style={{ animation: 'pt-ring3 16s linear infinite', transformOrigin: `${cx}px ${cx}px` }} />

        {/* ── CORE GOLD SPHERE ── */}
        <circle cx={cx} cy={cx - s * 0.04} r={s * 0.42}
          fill={`url(#luxSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${s * 0.3}px ${gold}bb) drop-shadow(0 0 ${s * 0.55}px ${gold}44) drop-shadow(0 0 ${s * 0.1}px rgba(255,255,200,0.8))` }} />

        {/* Specular highlight — large soft */}
        <ellipse cx={cx - s * 0.1} cy={cx - s * 0.16}
          rx={s * 0.14} ry={s * 0.09}
          fill="rgba(255,255,255,0.35)" style={{ filter: 'blur(4px)' }} />
        {/* Specular — small sharp */}
        <ellipse cx={cx - s * 0.15} cy={cx - s * 0.2}
          rx={s * 0.04} ry={s * 0.025}
          fill="rgba(255,255,255,0.8)" style={{ filter: 'blur(1px)' }} />

        {/* Direction arrow overlay on sphere */}
        {direction !== 'flat' && (
          <g transform={`translate(${cx},${cx - s * 0.04})`}
            style={{ animation: 'pt-pulse 2s ease-in-out infinite' }}>
            <polygon
              points={direction === 'down'
                ? `0,${s*0.14} ${s*0.09},-${s*0.06} -${s*0.09},-${s*0.06}`
                : `0,-${s*0.14} ${s*0.09},${s*0.06} -${s*0.09},${s*0.06}`}
              fill={accent} opacity={0.85}
              style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
          </g>
        )}

        {/* ── CANDLESTICK CHART (bottom section) ── */}
        {candleData.map((c, i) => {
          const barW = s * 0.07, gap = s * 0.1
          const chartBaseX = cx - (candleData.length * (barW + gap)) / 2 + barW / 2
          const x = chartBaseX + i * (barW + gap)
          const chartTop = cx + s * 0.38, chartH = s * 0.38
          const scale = (v: number) => chartTop + chartH - (v / 100) * chartH
          const isUp = c.c >= c.o
          const bodyY = scale(Math.max(c.o, c.c)), bodyH = Math.max(2, Math.abs(scale(c.o) - scale(c.c)))
          const wickColor = isUp ? '#10b981' : '#ef4444'
          return (
            <g key={i}>
              {/* Wick */}
              <line x1={x} y1={scale(c.h)} x2={x} y2={scale(c.l)} stroke={wickColor} strokeWidth={1} opacity={0.7} />
              {/* Body */}
              <rect x={x - barW / 2} y={bodyY} width={barW} height={bodyH}
                fill={isUp ? `url(#luxUp${s})` : `url(#luxDn${s})`} rx={1.5}
                style={{ filter: `drop-shadow(0 0 3px ${wickColor}80)` }} />
            </g>
          )
        })}

        {/* ── PRICE GRID LINES (below chart) ── */}
        {[0, 0.33, 0.67, 1].map((r, i) => (
          <line key={i}
            x1={cx - s * 0.58} y1={cx + s * 0.38 + r * s * 0.38}
            x2={cx + s * 0.58} y2={cx + s * 0.38 + r * s * 0.38}
            stroke={`${gold}12`} strokeWidth={0.6} strokeDasharray="3 5" />
        ))}

        {/* ── LUXURY CORNER BRACKETS ── */}
        {([[6, 6, 1, 1], [s * 2.2 - 6, 6, -1, 1], [6, s * 2.2 - 6, 1, -1], [s * 2.2 - 6, s * 2.2 - 6, -1, -1]] as number[][])
          .map(([x, y, dx, dy], i) => {
            const len = s * 0.12
            return <g key={i}>
              <line x1={x} y1={y} x2={x + dx * len} y2={y} stroke={gold} strokeWidth={2} opacity={0.5} />
              <line x1={x} y1={y} x2={x} y2={y + dy * len} stroke={gold} strokeWidth={2} opacity={0.5} />
              <circle cx={x} cy={y} r={2} fill={gold} opacity={0.6} />
            </g>
          })}

        {/* ── OUTER LUXURY RING ── */}
        <circle cx={cx} cy={cx} r={s * 1.03} fill="none" stroke={`${gold}20`} strokeWidth={1.5} strokeDasharray="6 4" />
        <circle cx={cx} cy={cx} r={s * 1.03}
          fill="none" stroke={`${accent}15`} strokeWidth={3}
          style={{ animation: 'pt-ping 3s ease-in-out infinite' }} />

        {/* ── FLOATING PRICE LABELS ── */}
        {[
          { deg: 30, label: direction === 'down' ? '↓' : direction === 'up' ? '↑' : '→', r: s * 0.92 },
          { deg: 150, label: '₺', r: s * 0.88 },
          { deg: 270, label: '$', r: s * 0.9 },
        ].map(({ deg, label, r: radius }) => {
          const a = deg * Math.PI / 180
          return <text key={deg}
            x={cx + Math.cos(a) * radius} y={cx + Math.sin(a) * radius}
            fill={gold} fontSize={s * 0.1} fontWeight="700" textAnchor="middle" dominantBaseline="middle"
            opacity={0.5} style={{ fontFamily: 'monospace' }}>{label}</text>
        })}
      </svg>
    </div>
  )
}

function FloatTicker({ size = 12, delay = '0s', color = '#10b981' }: any) {
  return (
    <div className="pt-float" style={{ animationDelay: delay, display: 'flex', alignItems: 'center', gap: 3 }}>
      <div style={{ width: size, height: size, borderRadius: 3, background: `${color}30`, border: `1px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 4, height: 4, borderRadius: 1, background: color, boxShadow: `0 0 5px ${color}` }} />
      </div>
    </div>
  )
}

// ── MINI PRICE CHART ──────────────────────────────────────────────────────────
function MiniChart({ history, color, width = 80, height = 28 }: any) {
  if (!history || history.length < 2) return null
  const prices = history.map((h: any) => h.price || h)
  const min = Math.min(...prices), max = Math.max(...prices)
  const range = max - min || 1
  const pts: Array<{x: number; y: number}> = prices.map((p: number, i: number) => ({
    x: (i / (prices.length - 1)) * width,
    y: height - ((p - min) / range) * height,
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = d + ` L ${width} ${height} L 0 ${height} Z`
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`mc${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#mc${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.5} fill={color} />
    </svg>
  )
}

// ── PRICE CARD ─────────────────────────────────────────────────────────────────
function PriceCard({ tracker, onCheck, onDelete, onTargetUpdate, checking }: any) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [showTargetEdit, setShowTargetEdit] = useState(false)
  const [targetInput, setTargetInput] = useState(String(tracker.target_price || ''))
  const [confirm, setConfirm] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const changePct = tracker.change_pct || 0
  const isDown = changePct < -0.5
  const isUp = changePct > 0.5
  const color = isDown ? '#059669' : isUp ? '#dc2626' : '#b45309'
  const currency = tracker.currency || 'TRY'
  const history = tracker.price_history || []

  const targetGap = tracker.target_price && tracker.current_price
    ? ((tracker.current_price - tracker.target_price) / tracker.current_price) * 100
    : null

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    setTilt({ x: ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 3, y: (-(e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 3 })
  }

  const formatPrice = (p: number | null) => p ? p.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '—'

  return (
    <div ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); setConfirm(false) }}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: hovered ? 'transform 0.05s' : 'transform 0.4s' }}>
      {/* Holographic border */}
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 19, zIndex: 0, background: hovered ? `linear-gradient(135deg,${color},${color}88,${color}44,${color}88,${color})` : `linear-gradient(135deg,${color}33,${color}11)`, backgroundSize: '300% 300%', animation: hovered ? 'pt-border 2s linear infinite' : 'none', boxShadow: hovered ? `0 0 28px ${color}25` : 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Price change indicator */}
          <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: `${color}12`, border: `1px solid ${color}28`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {isDown ? <TrendingDown size={20} style={{ color }} /> : isUp ? <TrendingUp size={20} style={{ color }} /> : <span style={{ fontSize: 18 }}>→</span>}
            {(isDown || isUp) && (
              <span style={{ color, fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                {isDown ? '' : '+'}{changePct.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tracker.name}</p>
              {tracker.competitor_name && <span style={{ color: '#475569', fontSize: 11 }}>· {tracker.competitor_name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color, fontWeight: 800, fontSize: 18 }}>{formatPrice(tracker.current_price)} {currency}</span>
              {tracker.initial_price && tracker.initial_price !== tracker.current_price && (
                <span style={{ color: '#94a3b8', fontSize: 11, textDecoration: 'line-through' }}>{formatPrice(tracker.initial_price)}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
              {tracker.target_price && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: targetGap !== null && targetGap <= 0 ? '#059669' : '#b45309' }}>
                  <Target size={12} /> Hedef: {formatPrice(tracker.target_price)} {targetGap !== null && targetGap > 0 ? `(%${targetGap.toFixed(1)} uzak)` : targetGap !== null && targetGap <= 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle size={11} /> TUTTURULDU!</span> : ''}
                </span>
              )}
              {tracker.last_checked && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Radio size={12} /> {new Date(tracker.last_checked).toLocaleDateString()}</span>}
            </div>
          </div>

          {/* Mini chart */}
          <div style={{ flexShrink: 0 }}>
            <MiniChart history={history} color={color} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={() => onCheck(tracker.id)} disabled={checking === tracker.id}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: checking === tracker.id ? 'not-allowed' : 'pointer', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {checking === tracker.id ? <RefreshCw size={13} style={{ animation: 'pt-spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
            </button>
            <button onClick={() => setShowTargetEdit(!showTargetEdit)}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={13} />
            </button>
            <a href={tracker.url} target="_blank" rel="noopener noreferrer"
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              <ExternalLink size={13} />
            </a>
            {!confirm ? (
              <button onClick={() => setConfirm(true)}
                style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} />
              </button>
            ) : (
              <button onClick={() => onDelete(tracker.id)}
                style={{ padding: '5px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 700 }}>Sil?</button>
            )}
          </div>
        </div>

        {/* Target price edit */}
        {showTargetEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
            <input value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="Hedef fiyat (alarm için)"
              style={{ flex: 1, background: '#ffffff', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 11px', color: '#0f172a', fontSize: 12, outline: 'none' }} />
            <button onClick={() => { onTargetUpdate(tracker.id, targetInput); setShowTargetEdit(false) }}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fffbeb', color: '#b45309', fontSize: 12, fontWeight: 600 }}>
              <Bell size={12} style={{ display: 'inline', marginRight: 4 }} />Kaydet
            </button>
            <button onClick={() => setShowTargetEdit(false)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Target progress bar */}
        {tracker.target_price && tracker.current_price && targetGap !== null && targetGap > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: '#475569' }}>
              <span>Hedefe uzaklık</span><span style={{ color: '#b45309' }}>{targetGap.toFixed(1)}%</span>
            </div>
            <div style={{ height: 3, background: '#e2e8f0', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${Math.min(100, 100 - targetGap)}%`, background: `linear-gradient(90deg,#059669,#b45309)`, borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PriceTrackerPage() {
  const { t } = useI18n()
  const [trackers, setTrackers] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, priceDrops: 0, priceRises: 0 })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ url: '', name: '', competitorName: '', targetPrice: '' })
  const [adding, setAdding] = useState(false)
  const [sphereDir, setSphereDir] = useState<'up' | 'down' | 'flat'>('flat')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const load = async () => {
    setLoading(true)
    try {
      const [trackersRes, alertsRes, statsRes] = await Promise.allSettled([
        api.get('/api/price-tracker/list'),
        api.get('/api/price-tracker/alerts'),
        api.get('/api/price-tracker/stats'),
      ])
      if (trackersRes.status === 'fulfilled') { setTrackers(trackersRes.value.trackers || []); updateSphereDir(trackersRes.value.trackers || []) }
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.alerts || [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
    } catch {} finally { setLoading(false) }
  }

  const updateSphereDir = (trs: any[]) => {
    const drops = trs.filter(tracker => (tracker.change_pct || 0) < -0.5).length
    const rises = trs.filter(tracker => (tracker.change_pct || 0) > 0.5).length
    setSphereDir(drops > rises ? 'down' : rises > drops ? 'up' : 'flat')
  }

  useEffect(() => { load() }, [])

  const addTracker = async () => {
    if (!form.url) return
    setAdding(true)
    try {
      const data = await api.post('/api/price-tracker/add', form)
      showMsg('success', data.message || 'Eklendi!')
      setForm({ url: '', name: '', competitorName: '', targetPrice: '' })
      setShowAdd(false)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAdding(false) }
  }

  const checkOne = async (id: string) => {
    setChecking(id)
    try {
      const data = await api.post(`/api/price-tracker/check/${id}`, {})
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setChecking(null) }
  }

  const checkAll = async () => {
    setChecking('all')
    try {
      await api.post('/api/price-tracker/check-all', {})
      showMsg('success', 'Tüm fiyatlar kontrol ediliyor...')
      setTimeout(load, 15000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setChecking(null) }
  }

  const deleteTracker = async (id: string) => {
    try { await api.delete(`/api/price-tracker/${id}`); setTrackers(prev => prev.filter(tracker => tracker.id !== id)); showMsg('success', 'Silindi') }
    catch (e: any) { showMsg('error', e.message) }
  }

  const updateTarget = async (id: string, targetPrice: string) => {
    try {
      await api.patch(`/api/price-tracker/${id}/target`, { targetPrice })
      showMsg('success', 'Hedef fiyat güncellendi — alarm kuruldu!')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const drops = trackers.filter(tracker => (tracker.change_pct || 0) < -0.5)
  const rises = trackers.filter(tracker => (tracker.change_pct || 0) > 0.5)

  const inp = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: '#0f172a' as const, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#fffbeb 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #fde68a' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.025) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div style={{ position: 'absolute', top: -50, right: -20, width: 280, height: 280, background: 'radial-gradient(circle,rgba(16,185,129,0.05) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 22, right: 210, zIndex: 1, opacity: 0.5 }}><FloatTicker size={14} delay="0s" color="#10b981" /></div>
        <div style={{ position: 'absolute', top: 65, right: 270, zIndex: 1, opacity: 0.4 }}><FloatTicker size={10} delay="0.8s" color="#f59e0b" /></div>
        <div style={{ position: 'absolute', bottom: 28, right: 225, zIndex: 1, opacity: 0.4 }}><FloatTicker size={12} delay="1.6s" color="#ef4444" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <PriceSphere size={100} direction={sphereDir} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#0f172a', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Rakip Fiyat Takibi</h1>
                <span style={{ background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>7/24</span>
              </div>
              <p style={{ color: '#475569', fontSize: 14, margin: '0 0 14px', maxWidth: 500 }}>{t('price_tracker.rakiplerin_fiyatlarini_72', 'Rakiplerin fiyatlarını 7/24 izle — hedef fiyata düşünce WhatsApp\'a alarm al')}</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {['📉 Fiyat Düşüş Alarmı', '🎯 Hedef Fiyat', '📊 Trend Grafiği', '⚡ WhatsApp Bildirim', '🌍 Her Site'].map(f => (
                  <span key={f} style={{ background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={checkAll} disabled={checking === 'all' || !trackers.length}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: '1px solid #a7f3d0', cursor: checking === 'all' || !trackers.length ? 'not-allowed' : 'pointer', background: '#ecfdf5', color: '#059669', fontSize: 13, fontWeight: 600, opacity: !trackers.length ? 0.4 : 1 }}>
              {checking === 'all' ? <RefreshCw size={13} style={{ animation: 'pt-spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
              Tümünü Kontrol Et
            </button>
            <button onClick={() => setShowAdd(!showAdd)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}>
              <Plus size={15} /> URL Ekle
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { label: 'Takip Edilen', value: stats.total, color: '#0d9488', Icon: Eye },
            { label: t('Fiyat Düşüşü','Fiyat Düşüşü'), value: stats.priceDrops, color: '#059669', Icon: TrendingDown },
            { label: t('Fiyat Artışı','Fiyat Artışı'), value: stats.priceRises, color: '#dc2626', Icon: TrendingUp },
            { label: 'Aktif Alarm', value: trackers.filter(tracker => tracker.target_price).length, color: '#b45309', Icon: Target },
          ].map((m) => (
            <div key={m.label} style={{ background: '#ffffff', borderRadius: 12, padding: '14px 12px', border: `1px solid ${m.color}22`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, background: `radial-gradient(circle,${m.color}20 0%,transparent 70%)` }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><m.Icon size={20} style={{ color: m.color }} /></div>
              <p style={{ color: m.color, fontSize: 24, fontWeight: 800, margin: '0 0 2px', lineHeight: 1 }}>{m.value}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? '#059669' : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      {/* ── ADD FORM ──────────────────────────────────────────────────────── */}
      {showAdd && (
        <div style={{ marginBottom: 22, background: '#ffffff', border: '1px solid #d1fae5', borderRadius: 18, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Plus size={15} style={{ color: '#059669' }} />
            <h3 style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>{t('price_tracker.yeni_urun_fiyati_takip_et', 'Yeni Ürün Fiyatı Takip Et')}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('price_tracker.urun_url_trendyol_amazon', 'Ürün URL * (Trendyol, Amazon, rakip site...)')}</label>
              <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://www.trendyol.com/..." style={{ ...inp, border: `1px solid ${form.url ? '#6ee7b7' : '#e2e8f0'}` }} />
            </div>
            <div>
              <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('price_tracker.urun_adi', 'Ürün Adı')}</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('price_tracker.koltuk_takimi_31', 'Koltuk Takımı 3+1')} style={inp} />
            </div>
            <div>
              <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('price_tracker.rakip_adi', 'Rakip Adı')}</label>
              <input value={form.competitorName} onChange={e => setForm(p => ({ ...p, competitorName: e.target.value }))} placeholder="Trendyol, Dekonil..." style={inp} />
            </div>
            <div>
              <label style={{ color: '#475569', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}><Target size={11} /> Hedef Fiyat (alarm)</label>
              <input value={form.targetPrice} onChange={e => setForm(p => ({ ...p, targetPrice: e.target.value }))} placeholder="₺4.500" style={inp} type="number" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addTracker} disabled={adding || !form.url}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 11, border: 'none', cursor: adding || !form.url ? 'not-allowed' : 'pointer', background: form.url ? 'linear-gradient(135deg,#065f46,#10b981)' : '#f1f5f9', color: form.url ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 700, opacity: !form.url ? 0.4 : 1 }}>
              {adding ? <RefreshCw size={13} style={{ animation: 'pt-spin 1s linear infinite' }} /> : <Plus size={13} />}
              {adding ? 'Fiyat tespit ediliyor...' : 'Takibe Al'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '10px 16px', borderRadius: 11, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#475569', fontSize: 13, cursor: 'pointer' }}>{t('price_tracker.iptal', 'İptal')}</button>
          </div>
          <p style={{ color: '#475569', fontSize: 11, marginTop: 10 }}>{t('price_tracker.url_ekledikten_sonra_otom', '💡 URL ekledikten sonra otomatik fiyat tespit edilir. Hedef fiyat girersen, o fiyata düştüğünde WhatsApp\'a anında bildirim gelir.')}</p>
        </div>
      )}

      {/* ── PRICE DROPS HIGHLIGHT ─────────────────────────────────────────── */}
      {drops.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingDown size={18} style={{ color: '#059669' }} />
          <span style={{ color: '#059669', fontSize: 13, fontWeight: 600 }}>{drops.length} üründe fiyat düştü — rakiplerden ucuz fırsat!</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {drops.slice(0, 3).map((tr: any) => (
              <span key={tr.id} style={{ background: '#d1fae5', color: '#047857', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                {tr.name.slice(0, 20)}: {tr.change_pct?.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── TRACKER LIST ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
          <RefreshCw size={22} style={{ color: '#475569', animation: 'pt-spin 1s linear infinite' }} />
        </div>
      ) : trackers.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><PriceSphere size={60} direction="flat" /></div>
          <p style={{ color: '#475569', fontSize: 14, margin: '0 0 16px' }}>{t('price_tracker.henuz_takip_edilen_urun_y', 'Henüz takip edilen ürün yok')}</p>
          <button onClick={() => setShowAdd(true)} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            + İlk URL'i Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Sort: drops first, then flats, then rises */}
          {[...trackers].sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0)).map((tr: any) => (
            <PriceCard key={tr.id} tracker={tr} onCheck={checkOne} onDelete={deleteTracker} onTargetUpdate={updateTarget} checking={checking} />
          ))}
        </div>
      )}

      {/* ── RECENT ALERTS ─────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ color: '#475569', fontSize: 13, fontWeight: 600, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>{t('price_tracker.son_fiyat_degisimleri', 'Son Fiyat Değişimleri')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.slice(0, 10).map((a: any) => {
              const isDown = a.direction === 'down'
              const color = isDown ? '#059669' : '#dc2626'
              const pct = a.old_price ? Math.abs((a.new_price - a.old_price) / a.old_price * 100).toFixed(1) : '0'
              const curr = a.price_trackers?.currency || 'TRY'
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: `${color}06`, border: `1px solid ${color}18`, borderRadius: 11 }}>
                  {isDown ? <TrendingDown size={18} style={{ color }} /> : <TrendingUp size={18} style={{ color }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>{a.price_trackers?.name || '?'}</span>
                    <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>{a.price_trackers?.competitor_name}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color, fontSize: 13, fontWeight: 700 }}>
                      {a.old_price?.toLocaleString()} → {a.new_price?.toLocaleString()} {curr}
                      <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>({isDown ? '-' : '+'}{pct}%)</span>
                    </div>
                    <div style={{ color: '#475569', fontSize: 11 }}>{new Date(a.checked_at).toLocaleString()}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pt-border { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }
        @keyframes pt-spin { to { transform: rotate(360deg); } }
        @keyframes pt-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.92)} }
        @keyframes pt-ping { 0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0} }
        @keyframes pt-ring1 { from{transform:rotateX(78deg) rotateZ(0deg)} to{transform:rotateX(78deg) rotateZ(360deg)} }
        @keyframes pt-ring2 { from{transform:rotateX(30deg) rotateY(60deg) rotateZ(0deg)} to{transform:rotateX(30deg) rotateY(60deg) rotateZ(360deg)} }
        @keyframes pt-ring3 { from{transform:rotateY(0deg) rotateZ(0deg)} to{transform:rotateY(360deg) rotateZ(0deg)} }
        .pt-float { animation: pt-float-anim 3s ease-in-out infinite; }
        @keyframes pt-float-anim { 0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:.8} }
      `}</style>
    </div>
  )
}
