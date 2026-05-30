'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Plus, ExternalLink, Trash2, Target, TrendingDown, TrendingUp, Bell, CheckCircle, X } from 'lucide-react'

// ── PRICE SPHERE — Financial market 3D animation ──────────────────────────────
// Theme: stock market / price monitoring — emerald green drops, red rises
function PriceSphere({ size = 100, direction = 'flat' }: { size?: number; direction?: 'up' | 'down' | 'flat' }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  const [chartPoints, setChartPoints] = useState<number[]>([50, 52, 48, 55, 51, 47, 53, 49, 56, 52, 45, 50])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setTick(p => p + 1)
      setChartPoints(prev => {
        const last = prev[prev.length - 1]
        const delta = (Math.random() - 0.48) * 6
        const next = Math.max(10, Math.min(90, last + delta))
        return [...prev.slice(-11), next]
      })
    }, 1200)
    return () => clearInterval(t)
  }, [mounted])

  const cx = size, s = size
  const color = direction === 'down' ? '#10b981' : direction === 'up' ? '#ef4444' : '#f59e0b'
  const glowColor = direction === 'down' ? 'rgba(16,185,129,' : direction === 'up' ? 'rgba(239,68,68,' : 'rgba(245,158,11,'

  // Build chart path from points
  const chartW = s * 0.7, chartH = s * 0.35
  const chartX = cx - chartW / 2, chartY = cx + s * 0.05
  const pts = chartPoints.map((y, i) => ({
    x: chartX + (i / (chartPoints.length - 1)) * chartW,
    y: chartY + chartH - (y / 100) * chartH,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = pathD + ` L ${pts[pts.length - 1].x.toFixed(1)} ${(chartY + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(chartY + chartH).toFixed(1)} Z`

  if (!mounted) return <div style={{ width: s * 2, height: s * 2, flexShrink: 0 }} />

  return (
    <div style={{ width: s * 2, height: s * 2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2} height={s * 2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`pg${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${glowColor}0)`} />
            <stop offset="60%" stopColor={`${glowColor}0.07)`} />
            <stop offset="100%" stopColor={`${glowColor}0.18)`} />
          </radialGradient>
          <radialGradient id={`ps${size}`} cx="38%" cy="32%" r="60%">
            <stop offset="0%" stopColor={direction === 'down' ? '#6ee7b7' : direction === 'up' ? '#fca5a5' : '#fde68a'} />
            <stop offset="40%" stopColor={color} />
            <stop offset="100%" stopColor={direction === 'down' ? '#064e3b' : direction === 'up' ? '#7f1d1d' : '#78350f'} />
          </radialGradient>
          <linearGradient id={`pa${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={cx} cy={cx} r={cx} fill={`url(#pg${size})`} />

        {/* Grid lines */}
        {[0.3, 0.55, 0.78, 0.96].map(r => (
          <ellipse key={r} cx={cx} cy={cx * 0.75} rx={s * r} ry={s * r * 0.4}
            fill="none" stroke={`${color}18`} strokeWidth={0.7} strokeDasharray="3 5" />
        ))}
        <line x1={0} y1={cx} x2={s * 2} y2={cx} stroke={`${color}10`} strokeWidth={0.6} />
        <line x1={cx} y1={0} x2={cx} y2={s * 2} stroke={`${color}10`} strokeWidth={0.6} />

        {/* Core sphere */}
        <circle cx={cx} cy={cx * 0.72} r={s * 0.36}
          fill={`url(#ps${size})`}
          style={{ filter: `drop-shadow(0 0 ${s * 0.22}px ${color}cc) drop-shadow(0 0 ${s * 0.45}px ${color}44)` }} />
        <ellipse cx={cx - s * 0.07} cy={cx * 0.6} rx={s * 0.08} ry={s * 0.05}
          fill="rgba(255,255,255,0.22)" style={{ filter: 'blur(2px)' }} />

        {/* Price arrow on sphere */}
        {direction !== 'flat' && (
          <g transform={`translate(${cx}, ${cx * 0.72}) ${direction === 'up' ? 'rotate(0)' : 'rotate(180)'}`}
            style={{ animation: 'pt-pulse 1.5s ease-in-out infinite' }}>
            <polygon points={`0,-${s * 0.12} ${s * 0.07},${s * 0.06} -${s * 0.07},${s * 0.06}`}
              fill={color} opacity={0.9} />
          </g>
        )}

        {/* Live chart area fill */}
        <path d={areaD} fill={`url(#pa${size})`} />

        {/* Live chart line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }} />

        {/* Chart data point (latest) */}
        {pts.length > 0 && (
          <>
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3}
              fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={6}
              fill="none" stroke={color} strokeWidth={1} opacity={0.5}
              style={{ animation: 'pt-ping 1.5s ease-in-out infinite' }} />
          </>
        )}

        {/* Horizontal chart grid lines */}
        {[0, 0.33, 0.66, 1].map(r => (
          <line key={r} x1={chartX} y1={chartY + r * chartH} x2={chartX + chartW} y2={chartY + r * chartH}
            stroke={`${color}15`} strokeWidth={0.5} strokeDasharray="2 4" />
        ))}

        {/* Corner brackets */}
        {([[4, 4, 1, 1], [s * 2 - 4, 4, -1, 1], [4, s * 2 - 4, 1, -1], [s * 2 - 4, s * 2 - 4, -1, -1]] as number[][])
          .map(([x, y, dx, dy], i) => {
            const len = s * 0.1
            return <g key={i}>
              <line x1={x} y1={y} x2={x + dx * len} y2={y} stroke={color} strokeWidth={1.5} opacity={0.5} />
              <line x1={x} y1={y} x2={x} y2={y + dy * len} stroke={color} strokeWidth={1.5} opacity={0.5} />
            </g>
          })}

        {/* Outer ring */}
        <circle cx={cx} cy={cx} r={cx - 1.5} fill="none" stroke={`${color}28`} strokeWidth={1.5} />

        {/* Tick indicators */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const r2 = cx - 8, a = deg * Math.PI / 180
          return <circle key={deg} cx={cx + Math.cos(a) * r2} cy={cx + Math.sin(a) * r2}
            r={1.5} fill={color} opacity={0.3 + (tick % 8 === deg / 45 ? 0.6 : 0)} />
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
  const color = isDown ? '#10b981' : isUp ? '#ef4444' : '#f59e0b'
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

      <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(3,8,20,0.97),rgba(5,6,18,0.98))', borderRadius: 18, padding: '18px 20px' }}>
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
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tracker.name}</p>
              {tracker.competitor_name && <span style={{ color: '#475569', fontSize: 11 }}>· {tracker.competitor_name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color, fontWeight: 800, fontSize: 18 }}>{formatPrice(tracker.current_price)} {currency}</span>
              {tracker.initial_price && tracker.initial_price !== tracker.current_price && (
                <span style={{ color: '#334155', fontSize: 11, textDecoration: 'line-through' }}>{formatPrice(tracker.initial_price)}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
              {tracker.target_price && (
                <span style={{ color: targetGap !== null && targetGap <= 0 ? '#10b981' : '#f59e0b' }}>
                  🎯 Hedef: {formatPrice(tracker.target_price)} {targetGap !== null && targetGap > 0 ? `(%${targetGap.toFixed(1)} uzak)` : targetGap !== null && targetGap <= 0 ? '✅ TUTTURULDU!' : ''}
                </span>
              )}
              {tracker.last_checked && <span>📡 {new Date(tracker.last_checked).toLocaleDateString('tr-TR')}</span>}
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
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={13} />
            </button>
            <a href={tracker.url} target="_blank" rel="noopener noreferrer"
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              <ExternalLink size={13} />
            </a>
            {!confirm ? (
              <button onClick={() => setConfirm(true)}
                style={{ width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(127,29,29,0.25)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} />
              </button>
            ) : (
              <button onClick={() => onDelete(tracker.id)}
                style={{ padding: '5px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, fontWeight: 700 }}>Sil?</button>
            )}
          </div>
        </div>

        {/* Target price edit */}
        {showTargetEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="Hedef fiyat (alarm için)"
              style={{ flex: 1, background: '#07091c', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
            <button onClick={() => { onTargetUpdate(tracker.id, targetInput); setShowTargetEdit(false) }}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>
              <Bell size={12} style={{ display: 'inline', marginRight: 4 }} />Kaydet
            </button>
            <button onClick={() => setShowTargetEdit(false)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Target progress bar */}
        {tracker.target_price && tracker.current_price && targetGap !== null && targetGap > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: '#475569' }}>
              <span>Hedefe uzaklık</span><span style={{ color: '#f59e0b' }}>{targetGap.toFixed(1)}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${Math.min(100, 100 - targetGap)}%`, background: `linear-gradient(90deg,#10b981,#f59e0b)`, borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PriceTrackerPage() {
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
      const [t, a, s] = await Promise.allSettled([
        api.get('/api/price-tracker/list'),
        api.get('/api/price-tracker/alerts'),
        api.get('/api/price-tracker/stats'),
      ])
      if (t.status === 'fulfilled') { setTrackers(t.value.trackers || []); updateSphereDir(t.value.trackers || []) }
      if (a.status === 'fulfilled') setAlerts(a.value.alerts || [])
      if (s.status === 'fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  const updateSphereDir = (trs: any[]) => {
    const drops = trs.filter(t => (t.change_pct || 0) < -0.5).length
    const rises = trs.filter(t => (t.change_pct || 0) > 0.5).length
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
    try { await api.delete(`/api/price-tracker/${id}`); setTrackers(prev => prev.filter(t => t.id !== id)); showMsg('success', 'Silindi') }
    catch (e: any) { showMsg('error', e.message) }
  }

  const updateTarget = async (id: string, targetPrice: string) => {
    try {
      await api.patch(`/api/price-tracker/${id}/target`, { targetPrice })
      showMsg('success', 'Hedef fiyat güncellendi — alarm kuruldu!')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const drops = trackers.filter(t => (t.change_pct || 0) < -0.5)
  const rises = trackers.filter(t => (t.change_pct || 0) > 0.5)

  const inp = { width: '100%', background: '#070a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 13px', color: '#fff' as const, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(2,8,20,0.98),rgba(5,6,18,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(16,185,129,0.15)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div style={{ position: 'absolute', top: -50, right: -20, width: 280, height: 280, background: 'radial-gradient(circle,rgba(16,185,129,0.09) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 22, right: 210, zIndex: 1, opacity: 0.5 }}><FloatTicker size={14} delay="0s" color="#10b981" /></div>
        <div style={{ position: 'absolute', top: 65, right: 270, zIndex: 1, opacity: 0.4 }}><FloatTicker size={10} delay="0.8s" color="#f59e0b" /></div>
        <div style={{ position: 'absolute', bottom: 28, right: 225, zIndex: 1, opacity: 0.4 }}><FloatTicker size={12} delay="1.6s" color="#ef4444" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <PriceSphere size={100} direction={sphereDir} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Rakip Fiyat Takibi</h1>
                <span style={{ background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>7/24</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px', maxWidth: 500 }}>Rakiplerin fiyatlarını 7/24 izle — hedef fiyata düşünce WhatsApp'a alarm al</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {['📉 Fiyat Düşüş Alarmı', '🎯 Hedef Fiyat', '📊 Trend Grafiği', '⚡ WhatsApp Bildirim', '🌍 Her Site'].map(f => (
                  <span key={f} style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#94a3b8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={checkAll} disabled={checking === 'all' || !trackers.length}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.25)', cursor: checking === 'all' || !trackers.length ? 'not-allowed' : 'pointer', background: 'rgba(16,185,129,0.08)', color: '#34d399', fontSize: 13, fontWeight: 600, opacity: !trackers.length ? 0.4 : 1 }}>
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
            { label: 'Takip Edilen', value: stats.total, color: '#06b6d4', icon: '👁️' },
            { label: 'Fiyat Düşüşü', value: stats.priceDrops, color: '#10b981', icon: '📉' },
            { label: 'Fiyat Artışı', value: stats.priceRises, color: '#ef4444', icon: '📈' },
            { label: 'Aktif Alarm', value: trackers.filter(t => t.target_price).length, color: '#f59e0b', icon: '🎯' },
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
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#34d399' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      {/* ── ADD FORM ──────────────────────────────────────────────────────── */}
      {showAdd && (
        <div style={{ marginBottom: 22, background: 'linear-gradient(135deg,rgba(3,8,20,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 18, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Plus size={15} style={{ color: '#10b981' }} />
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Yeni Ürün Fiyatı Takip Et</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Ürün URL * (Trendyol, Amazon, rakip site...)</label>
              <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://www.trendyol.com/..." style={{ ...inp, border: `1px solid ${form.url ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}` }} />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Ürün Adı</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Koltuk Takımı 3+1" style={inp} />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Rakip Adı</label>
              <input value={form.competitorName} onChange={e => setForm(p => ({ ...p, competitorName: e.target.value }))} placeholder="Trendyol, Dekonil..." style={inp} />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>🎯 Hedef Fiyat (alarm)</label>
              <input value={form.targetPrice} onChange={e => setForm(p => ({ ...p, targetPrice: e.target.value }))} placeholder="₺4.500" style={inp} type="number" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addTracker} disabled={adding || !form.url}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 11, border: 'none', cursor: adding || !form.url ? 'not-allowed' : 'pointer', background: form.url ? 'linear-gradient(135deg,#065f46,#10b981)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, fontWeight: 700, opacity: !form.url ? 0.4 : 1 }}>
              {adding ? <RefreshCw size={13} style={{ animation: 'pt-spin 1s linear infinite' }} /> : <Plus size={13} />}
              {adding ? 'Fiyat tespit ediliyor...' : 'Takibe Al'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '10px 16px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>İptal</button>
          </div>
          <p style={{ color: '#334155', fontSize: 11, marginTop: 10 }}>💡 URL ekledikten sonra otomatik fiyat tespit edilir. Hedef fiyat girersen, o fiyata düştüğünde WhatsApp'a anında bildirim gelir.</p>
        </div>
      )}

      {/* ── PRICE DROPS HIGHLIGHT ─────────────────────────────────────────── */}
      {drops.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>📉</span>
          <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>{drops.length} üründe fiyat düştü — rakiplerden ucuz fırsat!</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {drops.slice(0, 3).map((t: any) => (
              <span key={t.id} style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.25)' }}>
                {t.name.slice(0, 20)}: {t.change_pct?.toFixed(1)}%
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
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,20,0.98),rgba(5,6,18,0.99))', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><PriceSphere size={60} direction="flat" /></div>
          <p style={{ color: '#475569', fontSize: 14, margin: '0 0 16px' }}>Henüz takip edilen ürün yok</p>
          <button onClick={() => setShowAdd(true)} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            + İlk URL'i Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Sort: drops first, then flats, then rises */}
          {[...trackers].sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0)).map((t: any) => (
            <PriceCard key={t.id} tracker={t} onCheck={checkOne} onDelete={deleteTracker} onTargetUpdate={updateTarget} checking={checking} />
          ))}
        </div>
      )}

      {/* ── RECENT ALERTS ─────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>Son Fiyat Değişimleri</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.slice(0, 10).map((a: any) => {
              const isDown = a.direction === 'down'
              const color = isDown ? '#10b981' : '#ef4444'
              const pct = a.old_price ? Math.abs((a.new_price - a.old_price) / a.old_price * 100).toFixed(1) : '0'
              const curr = a.price_trackers?.currency || 'TRY'
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: `${color}06`, border: `1px solid ${color}18`, borderRadius: 11 }}>
                  <span style={{ fontSize: 18 }}>{isDown ? '📉' : '📈'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{a.price_trackers?.name || '?'}</span>
                    <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>{a.price_trackers?.competitor_name}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color, fontSize: 13, fontWeight: 700 }}>
                      {a.old_price?.toLocaleString('tr-TR')} → {a.new_price?.toLocaleString('tr-TR')} {curr}
                      <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>({isDown ? '-' : '+'}{pct}%)</span>
                    </div>
                    <div style={{ color: '#334155', fontSize: 11 }}>{new Date(a.checked_at).toLocaleString('tr-TR')}</div>
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
        @keyframes pt-pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes pt-ping { 0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0} }
        .pt-float { animation: pt-float-anim 3s ease-in-out infinite; }
        @keyframes pt-float-anim { 0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:.8} }
      `}</style>
    </div>
  )
}
