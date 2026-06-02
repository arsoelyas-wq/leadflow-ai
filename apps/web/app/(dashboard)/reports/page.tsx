'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function ReportPrism({ size = 90, spinning = false }: { size?: number; spinning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [angle, setAngle] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setAngle(a => (a + (spinning ? 3 : 0.5)) % 360), 16)
    return () => clearInterval(t)
  }, [mounted, spinning])
  if (!mounted) return <div style={{ width: size * 2, height: size * 2, flexShrink: 0 }} />
  const cx = size, s = size
  const rad = angle * Math.PI / 180
  const faces = [{ color: '#7c3aed', label: 'LEAD' },{ color: '#4f46e5', label: 'WIN' },{ color: '#6366f1', label: 'MSG' },{ color: '#8b5cf6', label: 'REV' }]
  return (
    <div style={{ width: s * 2, height: s * 2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2} height={s * 2}>
        <defs>
          <radialGradient id={`rpG${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(124,58,237,0)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.18)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#rpG${s})`} />
        {faces.map((f, i) => {
          const a = rad + (i * Math.PI / 2)
          const vis = Math.cos(a)
          if (vis < -0.1) return null
          const scale = 0.5 + vis * 0.5
          const x = cx + Math.cos(a) * s * 0.42
          const y = cx + Math.sin(a) * s * 0.22
          const h = s * 0.52 * scale, w = s * 0.38 * scale
          return (
            <g key={i} opacity={0.45 + vis * 0.55}>
              <polygon points={`${x},${y-h} ${x+w},${y} ${x},${y+h*0.3} ${x-w},${y}`}
                fill={f.color} style={{ filter: `drop-shadow(0 0 ${s*0.07}px ${f.color}88)` }} opacity={0.75 + vis * 0.25} />
              {vis > 0.3 && <text x={x} y={y - h * 0.25} fill="white" fontSize={s * 0.075} textAnchor="middle" dominantBaseline="middle" fontWeight="800" opacity={vis}>{f.label}</text>}
            </g>
          )
        })}
        {[0,60,120,180,240,300].map(deg => {
          const a = (deg + angle * 1.5) * Math.PI / 180
          return <circle key={deg} cx={cx + Math.cos(a) * s * 0.88} cy={cx + Math.sin(a) * s * 0.88} r={2} fill="#a78bfa" opacity={0.5} />
        })}
        <circle cx={cx} cy={cx} r={s - 2} fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth={1.5} strokeDasharray="5 7" />
      </svg>
    </div>
  )
}

function ChangeBadge({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:up?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)', border:`1px solid ${up?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:20, padding:'2px 8px', fontSize:11, color:up?'#34d399':'#f87171', fontWeight:700 }}>
      {up?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{Math.abs(value)}%
    </span>
  )
}

export default function ReportsPage() {
  const { t } = useI18n()
  const [weekly, setWeekly] = useState<any>(null)
  const [monthly, setMonthly] = useState<any>(null)
  const [view, setView] = useState<'weekly'|'monthly'>('weekly')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [goalLeads, setGoalLeads] = useState(50)
  const [goalRevenue, setGoalRevenue] = useState(50000)

  useEffect(() => {
    Promise.allSettled([api.get('/api/reports/weekly'), api.get('/api/reports/monthly')]).then(([w, m]) => {
      if (w.status === 'fulfilled') setWeekly(w.value)
      if (m.status === 'fulfilled') setMonthly(m.value)
      setLoading(false)
    })
  }, [])

  const d = view === 'weekly' ? weekly : monthly
  const fmtCurrency = (n: number) => n >= 1000 ? `₺${(n/1000).toFixed(1)}K` : `₺${n}`

  const exportCSV = () => {
    if (!d) return
    const rows = [['Metrik','Değer'],['Yeni Lead',d.newLeads],['Kazanılan',d.wonLeads],['Dönüşüm %',d.conversionRate],['Gelir',d.totalRevenue||0]]
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r=>r.join(',')).join('\n'))
    a.download = `rapor-${view}-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  const sources = d?.sourceBreakdown ? Object.entries(d.sourceBreakdown).sort((a:any,b:any)=>b[1]-a[1]).slice(0,5) : []

  return (
    <div style={{ padding: 0 }}>
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(5,3,22,0.98),rgba(8,5,22,0.99))', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid rgba(124,58,237,0.2)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.03) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <ReportPrism size={82} spinning={generating} />
            <div>
              <h1 style={{ color:'#fff', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>{t('reports.performans_raporlari', 'Performans Raporları')}</h1>
              <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>{t('reports.haftalik_aylik_satis_kars', 'Haftalık & aylık satış — karşılaştırmalı analiz')}</p>
              <div style={{ display:'flex', gap:6 }}>
                {(['weekly','monthly'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} style={{ padding:'6px 18px', borderRadius:20, border:`1px solid ${view===v?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.08)'}`, background:view===v?'rgba(124,58,237,0.18)':'transparent', color:view===v?'#a78bfa':'#64748b', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {v==='weekly'?'Haftalık':'Aylık'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={async()=>{setGenerating(true);await new Promise(r=>setTimeout(r,1500));setGenerating(false)}} disabled={generating}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:11, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:12, fontWeight:700 }}>
              <RefreshCw size={13} style={{ animation:generating?'rp-spin 1s linear infinite':'none' }} />{generating?'Oluşturuluyor...':'Rapor Oluştur'}
            </button>
            <button onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:11, border:'1px solid rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.08)', color:'#a78bfa', fontSize:12, cursor:'pointer' }}>
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}>
          <RefreshCw size={22} style={{ color:'#475569', animation:'rp-spin 1s linear infinite' }} />
        </div>
      ) : d && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label:'Yeni Lead', value:d.newLeads, color:'#8b5cf6', icon:'👥', trend:d.prevNewLeads?Math.round(((d.newLeads-d.prevNewLeads)/(d.prevNewLeads||1))*100):0 },
              { label:'Kazanılan', value:d.wonLeads, color:'#10b981', icon:'🏆', trend:0 },
              { label:'Dönüşüm', value:`%${d.conversionRate}`, color:'#06b6d4', icon:'🎯' },
              { label:'Gelir', value:fmtCurrency(d.totalRevenue||0), color:'#f59e0b', icon:'💰' },
            ].map(m => (
              <div key={m.label} style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:`1px solid ${m.color}20`, borderRadius:16, padding:'18px 16px' }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{m.icon}</div>
                <p style={{ color:m.color, fontSize:24, fontWeight:800, margin:'0 0 4px' }}>{m.value}</p>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <p style={{ color:'#fff', fontSize:12, fontWeight:600, margin:0 }}>{m.label}</p>
                  {(m as any).trend !== undefined && (m as any).trend !== 0 && <ChangeBadge value={(m as any).trend} />}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(245,158,11,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🎯 Hedef Takibi</h3>
              {[
                { label:'Lead Hedefi', current:d.newLeads, goal:goalLeads, setGoal:setGoalLeads, color:'#8b5cf6' },
                { label:'Gelir Hedefi (TL)', current:d.totalRevenue||0, goal:goalRevenue, setGoal:setGoalRevenue, color:'#f59e0b' },
              ].map(g => {
                const pct = Math.min(100, Math.round((g.current/g.goal)*100))
                return (
                  <div key={g.label} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <span style={{ color:'#94a3b8', fontSize:12 }}>{g.label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <input type="number" value={g.goal} onChange={e=>g.setGoal(Number(e.target.value))}
                          style={{ width:70, background:'#060a1c', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'3px 7px', color:'#fff', fontSize:11, outline:'none' }} />
                        {pct>=100 && <span style={{ color:'#34d399', fontSize:10, fontWeight:700 }}>{t('reports.asildi', '✅ Aşıldı!')}</span>}
                      </div>
                    </div>
                    <div style={{ height:7, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?'#10b981':g.color, borderRadius:3, boxShadow:`0 0 8px ${g.color}60`, transition:'width 0.8s' }} />
                    </div>
                    <p style={{ color:'#475569', fontSize:11, margin:'3px 0 0' }}>{g.current.toLocaleString('tr-TR')} / {g.goal.toLocaleString('tr-TR')} (%{pct})</p>
                  </div>
                )
              })}
            </div>

            <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(99,102,241,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>{t('reports.en_iyi_kaynaklar', '📊 En İyi Kaynaklar')}</h3>
              {sources.map(([src, cnt]: any, i: number) => {
                const colors = ['#7c3aed','#4f46e5','#06b6d4','#10b981','#f59e0b']
                const max = (sources[0] as any)?.[1] || 1
                return (
                  <div key={src} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:'#94a3b8', fontSize:12 }}>{src}</span>
                      <span style={{ color:colors[i], fontSize:12, fontWeight:700 }}>{cnt}</span>
                    </div>
                    <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${Math.round((cnt/max)*100)}%`, background:colors[i], borderRadius:3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.06))', border:'1px solid rgba(124,58,237,0.2)', borderRadius:16, padding:18 }}>
            <p style={{ color:'#a78bfa', fontSize:11, fontWeight:700, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:1 }}>{t('reports.ai_ozet', '⚡ AI Özet')}</p>
            <p style={{ color:'#cbd5e1', fontSize:13, margin:0, lineHeight:1.6 }}>
              {view==='weekly' ? `Bu hafta ${d.newLeads} yeni lead eklendi, ${d.wonLeads} deal kazanıldı. Dönüşüm oranı %${d.conversionRate}${d.conversionRate>15?' — mükemmel!':d.conversionRate>8?' — iyi gidiyor':' — geliştirme gerekli'}. ${d.totalRevenue>0?`Toplam ${fmtCurrency(d.totalRevenue)} gelir gerçekleşti.`:'Fatura geliri henüz yok.'}` : `Bu ay ${d.newLeads} lead ve ${d.wonLeads} kazanım. Aylık hedeflerinizi gözden geçirin.`}
            </p>
          </div>
        </>
      )}
      <style>{`@keyframes rp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
