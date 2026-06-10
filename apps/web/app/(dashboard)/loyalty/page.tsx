'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Heart, AlertTriangle, TrendingUp, TrendingDown, Users, MessageSquare, CheckCircle, Circle, MapPin, BarChart3, DollarSign } from 'lucide-react'

const RISK_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  high: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  medium: { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  low: { bg: '#ecfdf5', border: '#a7f3d0', color: '#059669' },
}
const RISK_ICONS: Record<string, string> = { high: '🚨', medium: '⚠️', low: '✅' }

// ── HEALTH ORB — vital signs style with ECG and satellite nodes ───────────────
function HealthOrb({ size = 110, score = 0, scanning = false }: { size?: number; score?: number; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 30 : 60)
    return () => clearInterval(t)
  }, [mounted, scanning])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const pulseR = s * 0.42 + (scanning ? Math.sin(tick * 0.15) * s * 0.03 : 0)

  // ECG path
  const ecgPts: [number, number][] = []
  for (let i = 0; i <= 80; i++) {
    const t2 = (i / 80) * Math.PI * 2 + tick * 0.04
    const x = cx + Math.cos(t2) * s * 0.52
    const y = cx + Math.sin(t2) * s * 0.52
    const beat = i % 20 === 10 ? -s * 0.12 : i % 20 === 11 ? s * 0.06 : 0
    ecgPts.push([x + Math.cos(t2 + Math.PI/2) * beat, y + Math.sin(t2 + Math.PI/2) * beat])
  }
  const ecgPath = ecgPts.map((p,i) => `${i===0?'M':'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`hoGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${color}00`} />
            <stop offset="100%" stopColor={`${color}18`} />
          </radialGradient>
          <radialGradient id={`hoSphere${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor={score >= 70 ? '#6ee7b7' : score >= 40 ? '#fde68a' : '#fca5a5'} />
            <stop offset="40%" stopColor={color} />
            <stop offset="100%" stopColor={score >= 70 ? '#064e3b' : score >= 40 ? '#78350f' : '#7f1d1d'} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#hoGlow${s})`} />
        {/* ECG ring */}
        <path d={ecgPath} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
        {/* Orbit rings */}
        {[0.72, 0.9].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke={`${color}15`} strokeWidth={0.8} strokeDasharray="4 6"
            style={{ animation: `ho-ring ${8+i*4}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {/* Core sphere */}
        <circle cx={cx} cy={cx} r={pulseR} fill={`url(#hoSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.2}px ${color}bb) drop-shadow(0 0 ${s*0.4}px ${color}44)` }} />
        <ellipse cx={cx-s*0.08} cy={cx-s*0.14} rx={s*0.08} ry={s*0.05} fill="rgba(255,255,255,0.22)" style={{ filter:'blur(3px)' }} />
        {/* Score */}
        <text x={cx} y={cx-2} fill="white" fontSize={s*0.2} textAnchor="middle" dominantBaseline="middle" fontWeight="900">{score}</text>
        <text x={cx} y={cx+s*0.14} fill={color} fontSize={s*0.07} textAnchor="middle" fontWeight="700">SAĞLIK</text>
        {/* Satellite customer nodes */}
        {[0,72,144,216,288].map((deg, i) => {
          const a = (deg + tick * 0.5) * Math.PI / 180
          return <circle key={deg} cx={cx+Math.cos(a)*s*0.88} cy={cx+Math.sin(a)*s*0.88} r={4} fill={color} opacity={0.5} style={{ filter:`drop-shadow(0 0 4px ${color})` }} />
        })}
        <circle cx={cx} cy={cx} r={s*1.0} fill="none" stroke={`${color}20`} strokeWidth={1.5} strokeDasharray="6 4" />
      </svg>
      <style>{`@keyframes ho-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Customer Health Score calculation
function calcHealthScore(customer: any): number {
  const now = Date.now()
  const lastContact = customer.last_contact ? new Date(customer.last_contact).getTime() : 0
  const daysSinceContact = lastContact ? Math.floor((now - lastContact) / 86400000) : 999
  const recency = daysSinceContact <= 7 ? 100 : daysSinceContact <= 14 ? 80 : daysSinceContact <= 30 ? 50 : daysSinceContact <= 60 ? 20 : 5

  const maxPaid = 50000
  const purchase = Math.min(100, Math.round(((customer.total_paid || 0) / maxPaid) * 100))

  const replyRate = customer.total_messages > 0 ? (customer.replied_messages / customer.total_messages) * 100 : 0
  const engagement = Math.min(100, Math.round(replyRate))

  const statusMap: Record<string,number> = { won:100, qualified:70, contacted:40, new:30, lost:0 }
  const growth = statusMap[customer.status] ?? 30

  return Math.round(recency * 0.3 + purchase * 0.3 + engagement * 0.2 + growth * 0.2)
}

export default function LoyaltyPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'health' | 'predictions'>('health')
  const [customers, setCustomers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState<'all'|'healthy'|'risk'|'critical'>('all')
  const [selected, setSelected] = useState<string[]>([])

  // ── Risk Tahminleri (churn) state ──
  const [churnPredictions, setChurnPredictions] = useState<any[]>([])
  const [churnStats, setChurnStats] = useState<any>(null)
  const [churnLoading, setChurnLoading] = useState(false)
  const [churnLoaded, setChurnLoaded] = useState(false)

  useEffect(() => {
    Promise.allSettled([api.get('/api/loyalty/scores'), api.get('/api/loyalty/stats')]).then(([c, s]) => {
      if (c.status === 'fulfilled') {
        const enriched = (c.value.customers || []).map((cu: any) => ({ ...cu, healthScore: calcHealthScore(cu) }))
        setCustomers(enriched.sort((a: any,b: any) => b.healthScore - a.healthScore))
      }
      if (s.status === 'fulfilled') setStats(s.value)
      setLoading(false)
    })
  }, [])

  const loadChurn = () => {
    setChurnLoading(true)
    setChurnLoaded(true)
    Promise.allSettled([api.get('/api/churn/predictions'), api.get('/api/churn/stats')])
      .then(([p, s]) => {
        if (p.status === 'fulfilled') setChurnPredictions(p.value.predictions || [])
        if (s.status === 'fulfilled') setChurnStats(s.value)
      }).finally(() => setChurnLoading(false))
  }

  useEffect(() => {
    if (tab === 'predictions' && !churnLoaded) loadChurn()
  }, [tab, churnLoaded])

  const filtered = customers.filter(c => {
    if (segment === 'healthy') return c.healthScore >= 70
    if (segment === 'risk') return c.healthScore >= 40 && c.healthScore < 70
    if (segment === 'critical') return c.healthScore < 40
    return true
  })

  const avgScore = customers.length ? Math.round(customers.reduce((s,c) => s+c.healthScore, 0)/customers.length) : 0
  const atRisk = customers.filter(c => c.healthScore < 40).length
  const healthy = customers.filter(c => c.healthScore >= 70).length

  const segColors = { all:'#7c3aed', healthy:'#059669', risk:'#b45309', critical:'#dc2626' }

  const churnHighRisk = churnPredictions.filter(p => p.risk === 'high')
  const churnMediumRisk = churnPredictions.filter(p => p.risk === 'medium')
  const churnLowRisk = churnPredictions.filter(p => p.risk === 'low')

  return (
    <div style={{ padding:0 }}>
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,#ffffff,#ecfdf5 65%,#ffffff)', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid #d1fae5' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.025) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:24 }}>
          <HealthOrb size={95} score={avgScore} scanning={loading} />
          <div>
            <h1 style={{ color:'#0f172a', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>{t('loyalty.musteri_sagligi', 'Müşteri Sağlığı')}</h1>
            <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>{t('loyalty.agirlikli_saglik_skoru_re', 'Ağırlıklı sağlık skoru: Recency %30 + Satın Alma %30 + Etkileşim %20 + Büyüme %20')}</p>
            <div style={{ display:'flex', gap:6 }}>
              {(['all','healthy','risk','critical'] as const).map(s => (
                <button key={s} onClick={()=>setSegment(s)}
                  style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${segment===s?segColors[s]+'80':'#e2e8f0'}`, background:segment===s?`${segColors[s]}15`:'transparent', color:segment===s?segColors[s]:'#475569', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {s==='all'?`Tümü (${customers.length})`:s==='healthy'?`Sağlıklı (${healthy})`:s==='risk'?`Risk (${customers.filter(c=>c.healthScore>=40&&c.healthScore<70).length})`:`Kritik (${atRisk})`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', gap:12 }}>
            {[{label:'Ort. Skor',value:avgScore,color:'#059669'},{label: t('Sağlıklı','Sağlıklı'),value:healthy,color:'#047857'},{label:'Kritik',value:atRisk,color:'#dc2626'}].map(m => (
              <div key={m.label} style={{ textAlign:'center' }}>
                <p style={{ color:m.color, fontSize:20, fontWeight:800, margin:0 }}>{m.value}</p>
                <p style={{ color:'#475569', fontSize:10, margin:0 }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={()=>setTab('health')}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border: tab==='health' ? '1px solid #a7f3d0' : '1px solid #e2e8f0', cursor:'pointer', background: tab==='health' ? '#ecfdf5' : '#ffffff', color: tab==='health' ? '#059669' : '#475569', fontSize:13, fontWeight: tab==='health' ? 700 : 500, transition:'all 0.15s' }}>
          <Heart size={14}/> {t('loyalty.tab_health','Müşteri Sağlığı')}
        </button>
        <button onClick={()=>setTab('predictions')}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border: tab==='predictions' ? '1px solid #a7f3d0' : '1px solid #e2e8f0', cursor:'pointer', background: tab==='predictions' ? '#ecfdf5' : '#ffffff', color: tab==='predictions' ? '#059669' : '#475569', fontSize:13, fontWeight: tab==='predictions' ? 700 : 500, transition:'all 0.15s' }}>
          <TrendingDown size={14}/> {t('loyalty.tab_predictions','Risk Tahminleri')}
        </button>
      </div>

      {tab === 'health' && (<>
      {/* At-risk alert */}
      {atRisk > 0 && (
        <div style={{ marginBottom:16, padding:'12px 18px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} style={{ color:'#dc2626', flexShrink:0 }} />
          <p style={{ color:'#dc2626', fontSize:13, margin:0 }}><strong>{atRisk} müşteri kritik eşiğin altında</strong>{t('loyalty.hemen_iletisime_gecin', '— hemen iletişime geçin!')}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}><RefreshCw size={22} style={{ color:'#475569', animation:'ho-spin 1s linear infinite' }} /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.slice(0,20).map(c => {
            const color = c.healthScore >= 70 ? '#059669' : c.healthScore >= 40 ? '#b45309' : '#dc2626'
            const LabelIcon = c.healthScore >= 70 ? CheckCircle : c.healthScore >= 40 ? AlertTriangle : Circle
            const labelText = c.healthScore >= 70 ? 'Sağlıklı' : c.healthScore >= 40 ? 'Risk' : 'Kritik'
            return (
              <div key={c.id} style={{ background:'#ffffff', border:`1px solid ${color}18`, borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                {/* Score gauge */}
                <div style={{ position:'relative', width:52, height:52, flexShrink:0 }}>
                  <svg width={52} height={52}>
                    <circle cx={26} cy={26} r={22} fill="none" stroke="#f1f5f9" strokeWidth={5} />
                    <circle cx={26} cy={26} r={22} fill="none" stroke={color} strokeWidth={5}
                      strokeDasharray={2*Math.PI*22} strokeDashoffset={2*Math.PI*22*(1-c.healthScore/100)}
                      strokeLinecap="round" transform="rotate(-90 26 26)"
                      style={{ filter:`drop-shadow(0 0 4px ${color}88)`, transition:'stroke-dashoffset 0.8s' }} />
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color, fontWeight:800, fontSize:13 }}>{c.healthScore}</span>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <p style={{ color:'#0f172a', fontWeight:700, fontSize:14, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.company_name}</p>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, color, fontSize:10, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:20, padding:'1px 7px', flexShrink:0 }}><LabelIcon size={10} /> {labelText}</span>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569' }}>
                    {c.city && <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><MapPin size={11} /> {c.city}</span>}
                    {c.status && <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><BarChart3 size={11} /> {c.status}</span>}
                    {c.total_paid > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap:3, color:'#b45309' }}><DollarSign size={11} /> ₺{c.total_paid.toLocaleString()}</span>}
                  </div>
                </div>
                {c.healthScore < 50 && (
                  <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, padding:'6px 12px', flexShrink:0 }}>
                    <p style={{ color:'#dc2626', fontSize:11, margin:0, fontWeight:600 }}>{t('loyalty.acil_iletisim', 'Acil İletişim!')}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>)}

      {tab === 'predictions' && (<>
      {churnLoading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}><RefreshCw size={22} style={{ color:'#475569', animation:'ho-spin 1s linear infinite' }} /></div>
      ) : (
        <>
          {/* 3-card risk grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label: t('Yüksek Risk','Yüksek Risk'), value: churnHighRisk.length, ...RISK_STYLES.high },
              { label: 'Orta Risk', value: churnMediumRisk.length, ...RISK_STYLES.medium },
              { label: t('Düşük Risk','Düşük Risk'), value: churnLowRisk.length, ...RISK_STYLES.low },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:16, textAlign:'center' }}>
                <p style={{ color, fontSize:28, fontWeight:800, margin:'0 0 4px' }}>{value}</p>
                <p style={{ color:'#475569', fontSize:11, margin:0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* High-risk alert */}
          {churnHighRisk.length > 0 && (
            <div style={{ marginBottom:20, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:16, padding:18 }}>
              <h2 style={{ display:'flex', alignItems:'center', gap:8, color:'#dc2626', fontWeight:700, fontSize:14, margin:'0 0 12px' }}>
                <AlertTriangle size={16}/> {t('loyalty.acil_aksiyon_gereken', 'Acil Aksiyon Gereken Müşteriler')}
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {churnHighRisk.slice(0,3).map((p:any)=>(
                  <div key={p.lead.id} style={{ display:'flex', alignItems:'center', gap:12, background:'#ffffff', borderRadius:10, padding:'10px 16px' }}>
                    <span style={{ fontSize:20 }}>🚨</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:'#0f172a', fontWeight:600, fontSize:13, margin:0 }}>{p.lead.company_name}</p>
                      <p style={{ color:'#dc2626', fontSize:11, margin:0 }}>{p.daysSinceContact === 999 ? 'Hiç iletişim yok' : `${p.daysSinceContact} gündür iletişim yok`}</p>
                    </div>
                    <button style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                      <MessageSquare size={11}/> {t('loyalty.mesaj_gonder', 'Mesaj Gönder')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer risk list */}
          {churnPredictions.length === 0 ? (
            <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:16, padding:48, textAlign:'center' }}>
              <TrendingDown size={40} style={{ color:'#cbd5e1', margin:'0 auto 8px' }}/>
              <p style={{ color:'#64748b', fontSize:14, margin:0 }}>{t('churn.kazanilmis_musteri_buluna', 'Kazanılmış müşteri bulunamadı')}</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <h2 style={{ color:'#0f172a', fontWeight:700, fontSize:14, margin:'0 0 4px' }}>{t('churn.tum_musteri_risk_analizi', 'Tüm Müşteri Risk Analizi')}</h2>
              {churnPredictions.map((p:any)=>{
                const rs = RISK_STYLES[p.risk]
                return (
                  <div key={p.lead.id} style={{ background:rs.bg, border:`1px solid ${rs.border}`, borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:14 }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{RISK_ICONS[p.risk]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:'#0f172a', fontWeight:600, fontSize:13, margin:0 }}>{p.lead.company_name}</p>
                      <div style={{ display:'flex', gap:10, fontSize:11, color:'#64748b', marginTop:2 }}>
                        <span>{p.daysSinceContact === 999 ? 'İletişim yok' : `${p.daysSinceContact}g iletişimsiz`}</span>
                        {p.msgCount > 0 && <span>{p.msgCount} mesaj</span>}
                        {p.lastInvoiceStatus === 'overdue' && <span style={{ color:'#dc2626' }}>{t('churn.gecikmis_odeme', '⚠️ Gecikmiş ödeme')}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ color:rs.color, fontSize:18, fontWeight:800, margin:0 }}>{p.churnScore}</p>
                      <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>risk skoru</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      </>)}
      <style>{`@keyframes ho-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
