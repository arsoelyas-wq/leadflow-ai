'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Heart, AlertTriangle, TrendingUp, Users, MessageSquare } from 'lucide-react'

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
  const [customers, setCustomers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState<'all'|'healthy'|'risk'|'critical'>('all')
  const [selected, setSelected] = useState<string[]>([])

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

  const filtered = customers.filter(c => {
    if (segment === 'healthy') return c.healthScore >= 70
    if (segment === 'risk') return c.healthScore >= 40 && c.healthScore < 70
    if (segment === 'critical') return c.healthScore < 40
    return true
  })

  const avgScore = customers.length ? Math.round(customers.reduce((s,c) => s+c.healthScore, 0)/customers.length) : 0
  const atRisk = customers.filter(c => c.healthScore < 40).length
  const healthy = customers.filter(c => c.healthScore >= 70).length

  const segColors = { all:'#8b5cf6', healthy:'#10b981', risk:'#f59e0b', critical:'#ef4444' }

  return (
    <div style={{ padding:0 }}>
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(2,8,4,0.98),rgba(3,8,22,0.99))', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid rgba(16,185,129,0.18)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:24 }}>
          <HealthOrb size={95} score={avgScore} scanning={loading} />
          <div>
            <h1 style={{ color:'#fff', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>{t('loyalty.musteri_sagligi', 'Müşteri Sağlığı')}</h1>
            <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>{t('loyalty.agirlikli_saglik_skoru_re', 'Ağırlıklı sağlık skoru: Recency %30 + Satın Alma %30 + Etkileşim %20 + Büyüme %20')}</p>
            <div style={{ display:'flex', gap:6 }}>
              {(['all','healthy','risk','critical'] as const).map(s => (
                <button key={s} onClick={()=>setSegment(s)}
                  style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${segment===s?segColors[s]+'80':'rgba(255,255,255,0.08)'}`, background:segment===s?`${segColors[s]}18`:'transparent', color:segment===s?segColors[s]:'#64748b', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {s==='all'?`Tümü (${customers.length})`:s==='healthy'?`Sağlıklı (${healthy})`:s==='risk'?`Risk (${customers.filter(c=>c.healthScore>=40&&c.healthScore<70).length})`:`Kritik (${atRisk})`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', gap:12 }}>
            {[{label:'Ort. Skor',value:avgScore,color:'#10b981'},{label: t('Sağlıklı','Sağlıklı'),value:healthy,color:'#34d399'},{label:'Kritik',value:atRisk,color:'#ef4444'}].map(m => (
              <div key={m.label} style={{ textAlign:'center' }}>
                <p style={{ color:m.color, fontSize:20, fontWeight:800, margin:0 }}>{m.value}</p>
                <p style={{ color:'#475569', fontSize:10, margin:0 }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-risk alert */}
      {atRisk > 0 && (
        <div style={{ marginBottom:16, padding:'12px 18px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} style={{ color:'#f87171', flexShrink:0 }} />
          <p style={{ color:'#fca5a5', fontSize:13, margin:0 }}><strong>{atRisk} müşteri kritik eşiğin altında</strong>{t('loyalty.hemen_iletisime_gecin', '— hemen iletişime geçin!')}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}><RefreshCw size={22} style={{ color:'#475569', animation:'ho-spin 1s linear infinite' }} /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.slice(0,20).map(c => {
            const color = c.healthScore >= 70 ? '#10b981' : c.healthScore >= 40 ? '#f59e0b' : '#ef4444'
            const label = c.healthScore >= 70 ? '✅ Sağlıklı' : c.healthScore >= 40 ? '⚠️ Risk' : '🔴 Kritik'
            return (
              <div key={c.id} style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:`1px solid ${color}18`, borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                {/* Score gauge */}
                <div style={{ position:'relative', width:52, height:52, flexShrink:0 }}>
                  <svg width={52} height={52}>
                    <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
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
                    <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.company_name}</p>
                    <span style={{ color, fontSize:10, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:20, padding:'1px 7px', flexShrink:0 }}>{label}</span>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569' }}>
                    {c.city && <span>📍 {c.city}</span>}
                    {c.status && <span>📊 {c.status}</span>}
                    {c.total_paid > 0 && <span style={{ color:'#f59e0b' }}>💰 ₺{c.total_paid.toLocaleString()}</span>}
                  </div>
                </div>
                {c.healthScore < 50 && (
                  <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, padding:'6px 12px', flexShrink:0 }}>
                    <p style={{ color:'#f87171', fontSize:11, margin:0, fontWeight:600 }}>{t('loyalty.acil_iletisim', 'Acil İletişim!')}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes ho-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
