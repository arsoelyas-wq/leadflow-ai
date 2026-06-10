'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, AlertTriangle, Zap, TrendingUp, TrendingDown, Brain, Users, DollarSign, BarChart3, Target, Bot, Settings, Radio } from 'lucide-react'

// ── NEURAL CONSTELLATION — connected nodes representing business metrics ───────
function NeuralConstellation({ size = 110, analyzing = false, metrics = {} as Record<string,number> }: { size?: number; analyzing?: boolean; metrics?: Record<string,number> }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), analyzing ? 30 : 80)
    return () => clearInterval(t)
  }, [mounted, analyzing])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const time = tick * (analyzing ? 0.04 : 0.008)

  const NODES = [
    { label: 'LEAD', key: 'leads', color: '#10b981', baseAngle: 0, dist: 0.7 },
    { label: 'WIN', key: 'won', color: '#d97706', baseAngle: 51.4, dist: 0.65 },
    { label: 'MSG', key: 'messages', color: '#06b6d4', baseAngle: 102.8, dist: 0.72 },
    { label: 'CHURN', key: 'churn', color: '#ef4444', baseAngle: 154.3, dist: 0.68 },
    { label: 'ROI', key: 'roi', color: '#8b5cf6', baseAngle: 205.7, dist: 0.65 },
    { label: 'CITY', key: 'city', color: '#f59e0b', baseAngle: 257.1, dist: 0.7 },
    { label: 'COST', key: 'cost', color: '#ec4899', baseAngle: 308.5, dist: 0.68 },
    { label: 'GRW', key: 'growth', color: '#34d399', baseAngle: 0.5, dist: 0.75 },
  ]

  const nodePos = NODES.map(n => {
    const a = (n.baseAngle + time * 3) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * n.dist, y: cx + Math.sin(a) * s * n.dist, ...n }
  })

  const EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[0,4],[1,5],[2,6]]
  const dashOffset = -tick * (analyzing ? 2 : 0.5)

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`ncGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.12)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#ncGlow${s})`} />

        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const n1 = nodePos[a], n2 = nodePos[b]
          return (
            <line key={i} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke={`${n1.color}40`} strokeWidth={1.2}
              strokeDasharray="6 4" strokeDashoffset={dashOffset}
              style={{ filter: analyzing ? `drop-shadow(0 0 3px ${n1.color}60)` : 'none' }} />
          )
        })}

        {/* Center hub */}
        <circle cx={cx} cy={cx} r={s * 0.15} fill="#1e1b4b" stroke="rgba(139,92,246,0.5)" strokeWidth={2}
          style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.6))' }} />
        <text x={cx} y={cx} fill="#a78bfa" fontSize={s * 0.08} textAnchor="middle" dominantBaseline="middle" fontWeight="800">AI</text>

        {/* Nodes */}
        {nodePos.map((n, i) => {
          const pulse = analyzing ? 1 + Math.sin(tick * 0.2 + i) * 0.3 : 1
          const r = 14 * pulse
          return (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={r + 4} fill={n.color} opacity={0.12} />
              <circle cx={n.x} cy={n.y} r={r} fill={n.color} opacity={0.85}
                style={{ filter: `drop-shadow(0 0 ${analyzing?8:4}px ${n.color})` }} />
              <text x={n.x} y={n.y - r - 6} fill={n.color} fontSize={8} textAnchor="middle" fontWeight="700" opacity={0.8}>{n.label}</text>
              {/* Connection to center */}
              <line x1={n.x} y1={n.y} x2={cx} y2={cx} stroke={`${n.color}25`} strokeWidth={0.8} strokeDasharray="3 6" />
            </g>
          )
        })}

        <circle cx={cx} cy={cx} r={s * 1.0} fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth={1.5} strokeDasharray="8 6" />
      </svg>
    </div>
  )
}

// ── REVENUE CANDLESTICK — 3D rising financial chart ───────────────────────────
function RevenueCandlestick({ size = 110, data = [], forecastData = [] }: { size?: number; data?: number[]; forecastData?: number[] }) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    let p = 0
    const t = setInterval(() => { p = Math.min(1, p + 0.015); setProgress(p); if (p >= 1) clearInterval(t) }, 16)
    return () => clearInterval(t)
  }, [mounted])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 1.8, flexShrink: 0 }} />

  const W = size * 2.2, H = size * 1.8
  const all = [...data, ...forecastData]
  const maxV = Math.max(...all, 1), minV = 0
  const scaleY = (v: number) => H - 30 - ((v - minV) / (maxV - minV)) * (H - 60)
  const barW = 30, gap = 12
  const totalW = (data.length + forecastData.length) * (barW + gap)
  const startX = (W - totalW) / 2

  const emerald = '#10b981', red = '#ef4444', gold = '#d97706'

  return (
    <div style={{ width: W, height: H, position: 'relative', flexShrink: 0 }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="rcUp" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={emerald} stopOpacity={0.9}/><stop offset="100%" stopColor="#065f46"/></linearGradient>
          <linearGradient id="rcFcast" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={gold} stopOpacity={0.6}/><stop offset="100%" stopColor="#78350f" stopOpacity={0.3}/></linearGradient>
          <radialGradient id="rcGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.12)" />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#rcGlow)" rx={12} />
        {/* Grid lines */}
        {[0.25,0.5,0.75,1].map(r => (
          <line key={r} x1={10} y1={H - 30 - r * (H-60)} x2={W-10} y2={H - 30 - r * (H-60)} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="3 5" />
        ))}
        {/* Ground line */}
        <line x1={10} y1={H-30} x2={W-10} y2={H-30} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />

        {/* Actual candles */}
        {data.map((v, i) => {
          const x = startX + i * (barW + gap)
          const top = scaleY(v * progress)
          const barH = Math.max(4, (H - 30) - top)
          const prev = i > 0 ? data[i-1] : v
          const color = v >= prev ? emerald : red
          return (
            <g key={i}>
              {/* Wick */}
              <line x1={x + barW/2} y1={top - 8} x2={x + barW/2} y2={H - 30} stroke={color} strokeWidth={1.5} opacity={0.4} />
              {/* 3D side face */}
              <polygon points={`${x+barW},${top} ${x+barW+6},${top-4} ${x+barW+6},${H-26} ${x+barW},${H-30}`} fill={color} opacity={0.3} />
              {/* Main body */}
              <rect x={x} y={top} width={barW} height={barH} fill={`url(#rcUp)`} rx={3} style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
              {/* Top face */}
              <polygon points={`${x},${top} ${x+barW},${top} ${x+barW+6},${top-4} ${x+6},${top-4}`} fill={color} opacity={0.5} />
              {/* Value label */}
              {progress > 0.8 && <text x={x + barW/2} y={top - 10} fill={color} fontSize={9} textAnchor="middle" fontWeight="700">{v >= 1000 ? `₺${(v/1000).toFixed(0)}K` : `₺${v}`}</text>}
            </g>
          )
        })}

        {/* Forecast candles (dashed style) */}
        {forecastData.map((v, i) => {
          const x = startX + (data.length + i) * (barW + gap)
          const top = scaleY(v * progress)
          const barH = Math.max(4, (H - 30) - top)
          return (
            <g key={`f${i}`}>
              <rect x={x} y={top} width={barW} height={barH} fill="url(#rcFcast)" rx={3} strokeDasharray="3 3" stroke={gold} strokeWidth={1} />
              <polygon points={`${x},${top} ${x+barW},${top} ${x+barW+6},${top-4} ${x+6},${top-4}`} fill={gold} opacity={0.3} />
              {progress > 0.8 && <text x={x + barW/2} y={top - 10} fill={gold} fontSize={9} textAnchor="middle" fontWeight="700">{v >= 1000 ? `₺${(v/1000).toFixed(0)}K` : `₺${v}`}</text>}
            </g>
          )
        })}

        {/* Forecast divider */}
        {data.length > 0 && (
          <line x1={startX + data.length * (barW + gap) - gap/2} y1={10} x2={startX + data.length * (barW + gap) - gap/2} y2={H - 25}
            stroke={gold} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
        )}

        {/* Gold trend line */}
        {all.length > 1 && progress > 0.5 && (
          <polyline
            points={all.map((v,i) => `${startX + i*(barW+gap) + barW/2},${scaleY(v)}`).join(' ')}
            fill="none" stroke={gold} strokeWidth={2} opacity={0.7}
            style={{ filter: `drop-shadow(0 0 4px ${gold})` }} />
        )}

        {/* Labels */}
        {['Oca','Şub','Mar'].map((m,i) => (
          <text key={m} x={startX + i*(barW+gap) + barW/2} y={H-12} fill="#334155" fontSize={9} textAnchor="middle">{m}</text>
        ))}
        {['T+1','T+2','T+3'].map((m,i) => (
          <text key={m} x={startX + (3+i)*(barW+gap) + barW/2} y={H-12} fill="#78350f" fontSize={9} textAnchor="middle">{m}</text>
        ))}
        <text x={startX + 3*(barW+gap) - gap/2} y={H-12} fill={gold} fontSize={8} textAnchor="middle">TAHMİN →</text>
      </svg>
    </div>
  )
}

export default function FinancialPage() {
  const { t } = useI18n()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(50)
  const [tab, setTab] = useState<'growth' | 'forecast'>('growth')

  // Forecast tab state (from revenue page)
  const [revenueData, setRevenueData] = useState<any>(null)
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [revenueLoaded, setRevenueLoaded] = useState(false)
  const [scenario, setScenario] = useState<'base'|'best'|'worst'>('base')
  const [revenuePeriod, setRevenuePeriod] = useState<'monthly'|'quarterly'|'annual'>('monthly')
  const [customDealValue, setCustomDealValue] = useState<string>('')
  const [cycleDays, setCycleDays] = useState(30)

  const load = async () => {
    setLoading(true); setAnalyzing(true)
    try { const d = await api.get('/api/analytics/financial'); setData(d) } catch {}
    setLoading(false); setTimeout(() => setAnalyzing(false), 2000)
  }

  useEffect(() => {
    const saved = localStorage.getItem('lf_monthly_target'); if (saved) setMonthlyTarget(Number(saved))
    load()
  }, [])

  const saveTarget = () => localStorage.setItem('lf_monthly_target', String(monthlyTarget))

  const loadRevenue = () => {
    setRevenueLoaded(true)
    const saved = localStorage.getItem('lf_avg_deal'); if (saved) setCustomDealValue(saved)
    const savedCycle = localStorage.getItem('lf_cycle_days'); if (savedCycle) setCycleDays(Number(savedCycle))
    api.get('/api/analytics/revenue').then(d => { setRevenueData(d); setRevenueLoading(false) }).catch(() => setRevenueLoading(false))
  }

  useEffect(() => {
    if (tab === 'forecast' && !revenueLoaded) loadRevenue()
  }, [tab, revenueLoaded])

  const saveDealValue = () => { localStorage.setItem('lf_avg_deal', customDealValue); localStorage.setItem('lf_cycle_days', String(cycleDays)) }

  const churn = data?.churnRisk || {}
  const growth = data?.growth?.rate || 0
  const sourcePerf = data?.sourcePerformance || []
  const cities = data?.topCities || []
  const aiAdvice = data?.financialAdvice?.advice || []
  const last30Leads = data?.growth?.thisMonth || 0
  const last30Messages = data?.monthlyTrend?.[data.monthlyTrend.length - 1]?.messages || 0

  const metrics: Record<string,number> = {
    leads: last30Leads,
    won: data?.creditEfficiency?.efficiency || 0,
    messages: last30Messages,
    churn: churn.total || 0,
    roi: Number((sourcePerf[0]?.conversionRate || '0').replace('%','')),
    growth: Math.abs(growth),
  }

  // Forecast tab derived values (from revenue page)
  const scenarioMultiplier = scenario === 'best' ? 1.2 : scenario === 'worst' ? 0.8 : 1.0
  const rev = revenueData?.revenue
  const baseMonthly = rev ? Math.round(rev.monthlyPotential * scenarioMultiplier) : 0
  const forecast = rev ? rev.projections?.map((p: any) => Math.round(p.revenue * scenarioMultiplier)) : [0,0,0]
  const actual = [
    Math.round(baseMonthly * 0.82),
    Math.round(baseMonthly * 0.91),
    baseMonthly,
  ]
  const revenuePeriodMultiplier = revenuePeriod === 'quarterly' ? 3 : revenuePeriod === 'annual' ? 12 : 1
  const fmtCurrency = (n: number) => n >= 1000000 ? `₺${(n/1000000).toFixed(1)}M` : n >= 1000 ? `₺${(n/1000).toFixed(0)}K` : `₺${n}`

  return (
    <div style={{ padding: 0 }}>
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,#ffffff,#f5f3ff 65%,#ffffff)', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid #ede9fe' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(139,92,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.02) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between', gap:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <NeuralConstellation size={95} analyzing={analyzing} metrics={metrics} />
            <div>
              <h1 style={{ color:'#0f172a', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>{t('financial.buyume_zekasi', 'Büyüme Zekası')}</h1>
              <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>{t('financial.6_aylik_trend_churn_tespi', '6 aylık trend, churn tespiti, AI büyüme önerileri')}</p>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, background:growth>=0?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${growth>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:20, padding:'4px 12px' }}>
                  {growth >= 0 ? <TrendingUp size={13} style={{ color:'#047857' }} /> : <TrendingDown size={13} style={{ color:'#dc2626' }} />}
                  <span style={{ color:growth>=0?'#047857':'#dc2626', fontSize:12, fontWeight:700 }}>{growth>=0?'+':''}{growth.toFixed(1)}% büyüme</span>
                </div>
                {churn.total > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(180,83,9,0.1)', border:'1px solid rgba(180,83,9,0.3)', borderRadius:20, padding:'4px 12px' }}>
                    <AlertTriangle size={13} style={{ color:'#b45309' }} />
                    <span style={{ color:'#b45309', fontSize:12, fontWeight:700 }}>{churn.total} churn riski</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:11, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:12, fontWeight:700 }}>
            <Brain size={14} style={{ animation:analyzing?'fn-spin 1s linear infinite':'none' }} />
            {analyzing?'AI Analiz Ediyor...':'AI Yenile'}
          </button>
        </div>
      </div>

      {/* ── TAB BAR */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('growth')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab==='growth'?'rgba(124,58,237,0.4)':'#e2e8f0'}`, background: tab==='growth'?'rgba(124,58,237,0.1)':'#ffffff', color: tab==='growth'?'#7c3aed':'#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Brain size={14} /> {t('financial.tab_growth','Büyüme Zekası')}
        </button>
        <button onClick={() => setTab('forecast')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab==='forecast'?'rgba(124,58,237,0.4)':'#e2e8f0'}`, background: tab==='forecast'?'rgba(124,58,237,0.1)':'#ffffff', color: tab==='forecast'?'#7c3aed':'#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <TrendingUp size={14} /> {t('financial.tab_forecast','Gelir Tahmini')}
        </button>
      </div>

      {tab === 'growth' && (<>
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}><RefreshCw size={22} style={{ color:'#475569', animation:'fn-spin 1s linear infinite' }} /></div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label: t('30 Gün Lead','30 Gün Lead'), value:last30Leads, color:'#059669', Icon: Users },
              { label:'Churn Riski', value:churn.total||0, color:'#dc2626', Icon: AlertTriangle },
              { label:'Kredi Verimi', value:`%${data?.creditEfficiency?.efficiency||0}`, color:'#7c3aed', Icon: Zap },
              { label:'Deal Maliyeti', value:`${data?.creditEfficiency?.costPerWin||0} kr`, color:'#b45309', Icon: DollarSign },
            ].map(m => (
              <div key={m.label} style={{ background:'#ffffff', border:`1px solid ${m.color}20`, borderRadius:16, padding:'18px 16px', textAlign:'center' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}><m.Icon size={20} style={{ color: m.color }} /></div>
                <p style={{ color:m.color, fontSize:22, fontWeight:800, margin:'0 0 4px' }}>{m.value}</p>
                <p style={{ color:'#475569', fontSize:12, margin:0 }}>{m.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            {/* Source ROI — real % */}
            <div style={{ background:'#ffffff', border:'1px solid rgba(99,102,241,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><BarChart3 size={15} style={{ color:'#4f46e5' }} /> {t('financial.kaynak_roi_gercek', 'Kaynak ROI (Gerçek %)')}</h3>
              {sourcePerf.slice(0,5).map((s: any, i: number) => {
                const colors = ['#059669','#0d9488','#7c3aed','#b45309','#db2777']
                return (
                  <div key={s.source} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:'#475569', fontSize:12 }}>{s.source}</span>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ color:colors[i], fontSize:12, fontWeight:700 }}>{s.roi}</span>
                        <span style={{ color:'#64748b', fontSize:11 }}>{s.total} lead</span>
                      </div>
                    </div>
                    <div style={{ height:5, background:'#f1f5f9', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${parseInt(s.roi||'0')}%`, background:colors[i], borderRadius:3, maxWidth:'100%' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Monthly target */}
            <div style={{ background:'#ffffff', border:'1px solid rgba(217,119,6,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><Target size={15} style={{ color:'#b45309' }} /> {t('financial.aylik_lead_hedefi', 'Aylık Lead Hedefi')}</h3>
              {(() => {
                const current = last30Leads
                const pct = Math.min(100, Math.round((current/monthlyTarget)*100))
                return (
                  <>
                    <div style={{ position:'relative', width:120, height:120, margin:'0 auto 16px' }}>
                      <svg width={120} height={120}>
                        <circle cx={60} cy={60} r={50} fill="none" stroke="#f1f5f9" strokeWidth={8} />
                        <circle cx={60} cy={60} r={50} fill="none" stroke={pct>=100?'#059669':'#d97706'} strokeWidth={8}
                          strokeDasharray={2*Math.PI*50} strokeDashoffset={2*Math.PI*50*(1-pct/100)}
                          strokeLinecap="round" transform="rotate(-90 60 60)"
                          style={{ filter:`drop-shadow(0 0 6px ${pct>=100?'#059669':'#d97706'}66)`, transition:'stroke-dashoffset 1s' }} />
                      </svg>
                      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ color:pct>=100?'#047857':'#b45309', fontWeight:800, fontSize:22 }}>{pct}%</span>
                        <span style={{ color:'#475569', fontSize:11 }}>{current}/{monthlyTarget}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <input type="number" value={monthlyTarget} onChange={e=>setMonthlyTarget(Number(e.target.value))} min={1}
                        style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:9, padding:'8px 12px', color:'#0f172a', fontSize:13, outline:'none' }} />
                      <button onClick={saveTarget} style={{ padding:'8px 14px', borderRadius:9, border:'none', cursor:'pointer', background:'rgba(180,83,9,0.15)', color:'#b45309', fontSize:12 }}>Kaydet</button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* AI Recommendations */}
          {aiAdvice.length > 0 && (
            <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.06))', border:'1px solid rgba(124,58,237,0.2)', borderRadius:16, padding:20 }}>
              <p style={{ display:'flex', alignItems:'center', gap:6, color:'#7c3aed', fontSize:11, fontWeight:700, margin:'0 0 12px', textTransform:'uppercase', letterSpacing:1 }}><Bot size={12} /> {t('financial.ai_onerileri', 'AI Önerileri')}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {aiAdvice.slice(0,3).map((rec: string, i: number) => (
                  <div key={i} style={{ display:'flex', gap:8, padding:'10px 12px', background:'#f8fafc', borderRadius:10 }}>
                    <span style={{ color:'#7c3aed', fontSize:13, flexShrink:0 }}>{i+1}.</span>
                    <p style={{ color:'#0f172a', fontSize:13, margin:0, lineHeight:1.5 }}>{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </>)}

      {tab === 'forecast' && (<>
      {/* ── FORECAST HERO */}
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,#ffffff,#ecfdf5 65%,#ffffff)', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid #d1fae5' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(217,119,6,0.02) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:24 }}>
          <RevenueCandlestick size={100} data={actual} forecastData={forecast.slice(0,3)} />
          <div style={{ flex:1 }}>
            <h1 style={{ color:'#0f172a', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>Gelir Tahmini</h1>
            <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>{t('revenue.gercek_fatura_verisiyle_3', 'Gerçek fatura verisiyle 3 aylık projeksiyon')}</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {(['base','best','worst'] as const).map(s => (
                <button key={s} onClick={()=>setScenario(s)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${scenario===s?s==='best'?'rgba(16,185,129,0.4)':s==='worst'?'rgba(220,38,38,0.4)':'rgba(217,119,6,0.4)':'#e2e8f0'}`, background:scenario===s?s==='best'?'rgba(16,185,129,0.1)':s==='worst'?'rgba(220,38,38,0.1)':'rgba(217,119,6,0.1)':'transparent', color:scenario===s?s==='best'?'#059669':s==='worst'?'#dc2626':'#b45309':'#475569', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {s==='best'?'En İyi Senaryo':s==='worst'?'En Kötü':'Temel'} {s!=='base'?'(±20%)':''}
                </button>
              ))}
              {(['monthly','quarterly','annual'] as const).map(p => (
                <button key={p} onClick={()=>setRevenuePeriod(p)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${revenuePeriod===p?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}`, background:revenuePeriod===p?'rgba(99,102,241,0.15)':'transparent', color:revenuePeriod===p?'#a5b4fc':'#64748b', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {p==='monthly'?'Aylık':p==='quarterly'?'Çeyreklik':'Yıllık'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {revenueLoading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}><RefreshCw size={22} style={{ color:'#475569', animation:'rv-spin 1s linear infinite' }} /></div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label: t('Bu Dönem Potansiyel','Bu Dönem Potansiyel'), value:fmtCurrency(baseMonthly*revenuePeriodMultiplier), color:'#059669', Icon: DollarSign },
              { label: t('Sonraki Dönem','Sonraki Dönem'), value:fmtCurrency(Math.round((forecast[0]||0)*scenarioMultiplier*revenuePeriodMultiplier)), color:'#b45309', Icon: TrendingUp },
              { label:'Win Rate', value:`%${revenueData?.funnel?.winRate||0}`, color:'#7c3aed', Icon: Target },
            ].map(m => (
              <div key={m.label} style={{ background:'#ffffff', border:`1px solid ${m.color}20`, borderRadius:16, padding:'18px 16px', textAlign:'center' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}><m.Icon size={20} style={{ color: m.color }} /></div>
                <p style={{ color:m.color, fontSize:22, fontWeight:800, margin:'0 0 4px' }}>{m.value}</p>
                <p style={{ color:'#475569', fontSize:12, margin:0 }}>{m.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <div style={{ background:'#ffffff', border:'1px solid rgba(217,119,6,0.2)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><Settings size={15} style={{ color:'#b45309' }} /> Gelir Parametreleri</h3>
              <div style={{ marginBottom:14 }}>
                <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>{t('revenue.ortalama_deal_degeri_tl', 'Ortalama Deal Değeri (TL)')}</label>
                <input value={customDealValue || rev?.avgDealValue || ''} onChange={e=>setCustomDealValue(e.target.value)} placeholder={`₺${rev?.avgDealValue||1000}`}
                  style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:9, padding:'9px 12px', color:'#0f172a', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                <p style={{ color:'#64748b', fontSize:10, margin:'4px 0 0' }}>Gerçek faturalardan: ₺{rev?.avgDealValue||0} ortalama</p>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Satış Döngüsü: {cycleDays} gün</label>
                <input type="range" min={7} max={180} value={cycleDays} onChange={e=>setCycleDays(Number(e.target.value))}
                  style={{ width:'100%', accentColor:'#d97706' }} />
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#64748b', fontSize:10 }}>{t('revenue.7_gun', '7 gün')}</span>
                  <span style={{ color:'#64748b', fontSize:10 }}>{t('revenue.180_gun', '180 gün')}</span>
                </div>
              </div>
              <button onClick={saveDealValue} style={{ width:'100%', padding:'9px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:12, fontWeight:700 }}>
                Kaydet & Tahmine Uygula
              </button>
            </div>

            <div style={{ background:'#ffffff', border:'1px solid rgba(16,185,129,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><BarChart3 size={15} style={{ color:'#059669' }} /> {t('revenue.3_aylik_projeksiyon', '3 Aylık Projeksiyon')}</h3>
              {(forecast||[]).map((rev2: number, i: number) => (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'#475569', fontSize:12 }}>{i+1}. Ay</span>
                    <span style={{ color:'#d97706', fontWeight:700, fontSize:13 }}>{fmtCurrency(Math.round(rev2*scenarioMultiplier))}</span>
                  </div>
                  <div style={{ height:6, background:'#f1f5f9', borderRadius:3 }}>
                    <div style={{ height:'100%', width:`${Math.min(100,Math.round((rev2/((forecast[2]||1)*1.1))*100))}%`, background:'linear-gradient(90deg,#d97706,#10b981)', borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {revenueData?.channelPerformance?.length > 0 && (
            <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><Radio size={15} style={{ color:'#2563eb' }} /> {t('revenue.kanal_gelir_dagilimi', 'Kanal Gelir Dağılımı')}</h3>
              <div style={{ display:'flex', gap:16 }}>
                {revenueData.channelPerformance.map((ch: any) => (
                  <div key={ch.channel} style={{ flex:1, textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0' }}>
                    <p style={{ color:ch.color, fontSize:18, fontWeight:800, margin:'0 0 4px' }}>%{ch.replyRate}</p>
                    <p style={{ color:'#475569', fontSize:12, margin:'0 0 2px' }}>{ch.channel}</p>
                    <p style={{ color:'#64748b', fontSize:11, margin:0 }}>{ch.sent.toLocaleString()} gönderim</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </>)}

      <style>{`
        @keyframes fn-spin{to{transform:rotate(360deg)}}
        @keyframes rv-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
