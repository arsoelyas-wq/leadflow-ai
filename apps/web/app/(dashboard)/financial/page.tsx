'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, AlertTriangle, Zap, TrendingUp, TrendingDown, Brain, Users, DollarSign, BarChart3, Target, Bot } from 'lucide-react'

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

export default function FinancialPage() {
  const { t } = useI18n()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(50)

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
      <style>{`@keyframes fn-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
