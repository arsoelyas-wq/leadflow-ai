'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Download, TrendingUp, TrendingDown, Users, MessageSquare, Target, Zap, ArrowUpRight, ArrowDownRight, Megaphone, Smartphone, Trophy, Mail, DollarSign, BarChart3, CheckCircle } from 'lucide-react'

// ── DATA FLOW SPHERE — animated data streams from center ─────────────────────
function DataFlowSphere({ size = 110, active = false }: { size?: number; active?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  const [packets, setPackets] = useState<Array<{axis: number; progress: number; id: number; color: string}>>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setTick(p => p + 1)
      if (active || Math.random() < 0.4) {
        const axis = Math.floor(Math.random() * 6)
        const colors = ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#ef4444','#3b82f6']
        setPackets(prev => [...prev.slice(-10), { axis, progress: 0, id: Date.now() + Math.random(), color: colors[axis] }])
      }
      setPackets(prev => prev.map(p => ({ ...p, progress: p.progress + 0.08 })).filter(p => p.progress < 1))
    }, 80)
    return () => clearInterval(t)
  }, [mounted, active])

  if (!mounted) return <div style={{ width: size * 2, height: size * 2, flexShrink: 0 }} />

  const cx = size, s = size
  const AXES = [0, 60, 120, 180, 240, 300].map(deg => deg * Math.PI / 180)
  const LABELS = ['LEAD', 'MSG', 'WIN', 'DEAL', 'CONV', 'ROI']
  const COLORS = ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#ef4444','#3b82f6']

  return (
    <div style={{ width: s * 2, height: s * 2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2} height={s * 2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`dfGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="60%" stopColor="rgba(16,185,129,0.07)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.15)" />
          </radialGradient>
          <radialGradient id={`dfSphere${s}`} cx="38%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="35%" stopColor="#10b981" />
            <stop offset="70%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#001a0e" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#dfGlow${s})`} />
        {/* Rings */}
        {[0.55, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth={0.8} strokeDasharray="4 6"
            style={{ animation: `df-ring ${8+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {/* Axis lines */}
        {AXES.map((a, i) => (
          <line key={i} x1={cx} y1={cx} x2={cx + Math.cos(a) * s * 0.88} y2={cx + Math.sin(a) * s * 0.88}
            stroke={`${COLORS[i]}30`} strokeWidth={0.8} strokeDasharray="3 5" />
        ))}
        {/* Data packets */}
        {packets.map(pk => {
          const a = AXES[pk.axis]
          const x = cx + Math.cos(a) * s * 0.88 * pk.progress
          const y = cx + Math.sin(a) * s * 0.88 * pk.progress
          const op = Math.max(0, 1 - pk.progress * 0.8)
          return (
            <g key={pk.id}>
              <circle cx={x} cy={y} r={3.5} fill={pk.color} opacity={op} style={{ filter: `drop-shadow(0 0 5px ${pk.color})` }} />
            </g>
          )
        })}
        {/* Axis end dots + labels */}
        {AXES.map((a, i) => {
          const ex = cx + Math.cos(a) * s * 0.88, ey = cx + Math.sin(a) * s * 0.88
          const lx = cx + Math.cos(a) * s * 1.0, ly = cx + Math.sin(a) * s * 1.0
          return (
            <g key={i}>
              <circle cx={ex} cy={ey} r={4} fill={COLORS[i]} style={{ filter: `drop-shadow(0 0 6px ${COLORS[i]})` }} />
              <text x={lx} y={ly} fill={COLORS[i]} fontSize={s * 0.075} textAnchor="middle" dominantBaseline="middle" fontWeight="700" opacity={0.7}>{LABELS[i]}</text>
            </g>
          )
        })}
        {/* Core sphere */}
        <circle cx={cx} cy={cx} r={s * 0.35} fill={`url(#dfSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.22}px rgba(16,185,129,0.8)) drop-shadow(0 0 ${s*0.45}px rgba(16,185,129,0.3))` }} />
        <ellipse cx={cx-s*0.08} cy={cx-s*0.12} rx={s*0.09} ry={s*0.06} fill="rgba(255,255,255,0.22)" style={{ filter: 'blur(3px)' }} />
        <circle cx={cx} cy={cx} r={4} fill="white" opacity={0.9} />
        {/* Outer ring */}
        <circle cx={cx} cy={cx} r={s-2} fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth={1.5} strokeDasharray="6 4" />
      </svg>
      <style>{`@keyframes df-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── MINI TREND LINE ───────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 60, height = 24 }: any) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v: number, i: number) => `${(i/(data.length-1))*width},${height - ((v-min)/range)*height}`).join(' ')
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 3px ${color})` }} /></svg>
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, Icon, trend, sparkData }: any) {
  const up = trend > 0
  return (
    <div style={{ background: '#ffffff', border: `1px solid ${color}22`, borderRadius: 16, padding: '18px 16px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ position: 'absolute', top: -20, right: -10, width: 70, height: 70, background: `radial-gradient(circle,${color}18 0%,transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div><Icon size={20} style={{ color }} /></div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: up ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)', border: `1px solid ${up?'rgba(5,150,105,0.3)':'rgba(220,38,38,0.3)'}`, borderRadius: 20, padding: '2px 8px' }}>
            {up ? <ArrowUpRight size={11} style={{ color: '#059669' }} /> : <ArrowDownRight size={11} style={{ color: '#dc2626' }} />}
            <span style={{ color: up ? '#059669' : '#dc2626', fontSize: 11, fontWeight: 700 }}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p style={{ color, fontSize: 26, fontWeight: 800, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {sub && <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{sub}</p>}
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  )
}

// ── REPORT PRISM — animated rotating prism (LEAD/WIN/MSG/REV faces) ──────────
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

// ── CHANGE BADGE — up/down % indicator ────────────────────────────────────────
function ChangeBadge({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:up?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)', border:`1px solid ${up?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:20, padding:'2px 8px', fontSize:11, color:up?'#34d399':'#f87171', fontWeight:700 }}>
      {up?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{Math.abs(value)}%
    </span>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { t } = useI18n()
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [tab, setTab] = useState<'overview' | 'reports' | 'growth' | 'forecast'>('overview')
  const [financial, setFinancial] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [finLoading, setFinLoading] = useState(false)

  // Reports tab state
  const [reportWeekly, setReportWeekly] = useState<any>(null)
  const [reportMonthly, setReportMonthly] = useState<any>(null)
  const [reportView, setReportView] = useState<'weekly'|'monthly'>('weekly')
  const [reportLoading, setReportLoading] = useState(true)
  const [reportLoaded, setReportLoaded] = useState(false)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [goalLeads, setGoalLeads] = useState(50)
  const [goalRevenue, setGoalRevenue] = useState(50000)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.get(`/api/analytics/overview?period=${period}`)
      setData(d); setLastRefresh(new Date())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [period])

  const loadFinancial = async () => {
    if (financial) return
    setFinLoading(true)
    try {
      const [f, r] = await Promise.allSettled([
        api.get('/api/analytics/financial'),
        api.get('/api/analytics/revenue'),
      ])
      if (f.status === 'fulfilled') setFinancial(f.value)
      if (r.status === 'fulfilled') setRevenue(r.value)
    } catch {} finally { setFinLoading(false) }
  }

  useEffect(() => { if (tab === 'growth' || tab === 'forecast') loadFinancial() }, [tab])

  const loadReports = () => {
    setReportLoaded(true)
    Promise.allSettled([api.get('/api/reports/weekly'), api.get('/api/reports/monthly')]).then(([w, m]) => {
      if (w.status === 'fulfilled') setReportWeekly(w.value)
      if (m.status === 'fulfilled') setReportMonthly(m.value)
      setReportLoading(false)
    })
  }

  useEffect(() => {
    if (tab === 'reports' && !reportLoaded) loadReports()
  }, [tab, reportLoaded])

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Metrik','Değer'],
      ['Toplam Lead', data.totalLeads],
      ['Yeni Lead', data.newLeads],
      ['Aktif Kampanya', data.activeCampaigns],
      ['Cevap Oranı %', data.replyRate],
      ['WA Gönderilen', data.channelStats?.whatsapp],
      ['Email Gönderilen', data.channelStats?.email],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `leadflow-analitik-${period}-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  const statuses = data?.statusBreakdown || {}
  const total = data?.totalLeads || 1
  const funnelSteps = [
    { label: 'Yeni Lead', key: 'new', color: '#0d9488' },
    { label: 'İletişim', key: 'contacted', color: '#7c3aed' },
    { label: 'Nitelikli', key: 'qualified', color: '#b45309' },
    { label: 'Kazanılan', key: 'won', color: '#059669' },
  ]

  const reportD = reportView === 'weekly' ? reportWeekly : reportMonthly
  const fmtCurrency = (n: number) => n >= 1000 ? `₺${(n/1000).toFixed(1)}K` : `₺${n}`
  const reportSources = reportD?.sourceBreakdown ? Object.entries(reportD.sourceBreakdown).sort((a:any,b:any)=>b[1]-a[1]).slice(0,5) : []

  const exportReportsCSV = () => {
    if (!reportD) return
    const rows = [['Metrik','Değer'],['Yeni Lead',reportD.newLeads],['Kazanılan',reportD.wonLeads],['Dönüşüm %',reportD.conversionRate],['Gelir',reportD.totalRevenue||0]]
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r=>r.join(',')).join('\n'))
    a.download = `rapor-${reportView}-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  return (
    <div style={{ padding: 0 }}>
      {/* ── HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#ecfdf5 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #d1fae5' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.025) 1px,transparent 1px)', backgroundSize: '36px 36px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DataFlowSphere size={90} active={loading} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#0f172a', fontSize: 26, fontWeight: 800, margin: 0 }}>{t('analytics.title','Analitik Dashboard')}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', animation: 'df-ping 2s ease-in-out infinite' }} />
                  <span style={{ color: '#047857', fontSize: 11, fontWeight: 600 }}>{t('analytics.canli', 'Canlı')}</span>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: 14, margin: '0 0 14px' }}>
                {lastRefresh ? `Son güncelleme: ${lastRefresh.toLocaleTimeString()}` : 'Veriler yükleniyor...'}
              </p>
              {/* Period selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['7d','30d','90d'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${period===p?'rgba(5,150,105,0.5)':'#e2e8f0'}`, background: period===p?'rgba(5,150,105,0.12)':'transparent', color: period===p?'#047857':'#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {p === '7d' ? t('analytics.last7d','Son 7 Gün') : p === '30d' ? t('analytics.last30d','Son 30 Gün') : t('analytics.last90d','Son 90 Gün')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.08)', color: '#047857', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={13} /> CSV İndir
            </button>
            <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'df-spin 1s linear infinite' : 'none' }} /> Yenile
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB BAR */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#f8fafc', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid #f1f5f9' }}>
        {[
          { id: 'overview', label: 'Genel Bakış', Icon: BarChart3 },
          { id: 'reports', label: 'Raporlar', Icon: Trophy },
          { id: 'growth', label: 'Büyüme', Icon: TrendingUp },
          { id: 'forecast', label: 'Tahmin', Icon: DollarSign },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === tb.id ? '#ffffff' : 'transparent', color: tab === tb.id ? '#047857' : '#94a3b8', boxShadow: tab === tb.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            <tb.Icon size={13} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (<>
      {/* ── STAT CARDS */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label={t('analytics.total_leads','Toplam Lead')} value={data.totalLeads} sub={`+${data.newLeads} ${t('analytics.new_leads','yeni')}`} color="#059669" Icon={Users} trend={12} />
          <StatCard label={t('analytics.conversion','Cevap Oranı')} value={`${data.replyRate}%`} sub={t('analytics.campaigns','kampanya bazlı')} color="#7c3aed" Icon={MessageSquare} trend={data.replyRate > 10 ? 5 : -8} />
          <StatCard label={t('analytics.campaigns','Aktif Kampanya')} value={data.activeCampaigns} sub={t('analytics.overview','devam eden')} color="#0d9488" Icon={Megaphone} />
          <StatCard label={t('billing.credits_remaining','Kalan Kredi')} value={data.credits} sub={t('analytics.export','kullanılabilir')} color="#b45309" Icon={Zap} />
        </div>
      )}

      {/* ── CHANNEL + FUNNEL */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Channel comparison */}
          <div style={{ background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 18, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 18px' }}><Smartphone size={15} style={{ color: '#7c3aed' }} /> {t('analytics.kanal_karsilastirmasi', 'Kanal Karşılaştırması')}</h3>
            {[
              { label: 'WhatsApp', value: data.channelStats?.whatsapp || 0, color: '#25d366', Icon: MessageSquare },
              { label: 'Email', value: data.channelStats?.email || 0, color: '#2563eb', Icon: Mail },
            ].map(ch => {
              const total2 = (data.channelStats?.whatsapp || 0) + (data.channelStats?.email || 0) || 1
              const pct = Math.round((ch.value / total2) * 100)
              return (
                <div key={ch.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0f172a', fontSize: 13 }}><ch.Icon size={13} style={{ color: ch.color }} /> {ch.label}</span>
                    <span style={{ color: ch.color, fontWeight: 700, fontSize: 13 }}>{ch.value.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: 3, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${ch.color}60` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Funnel */}
          <div style={{ background: '#ffffff', border: '1px solid #d1fae5', borderRadius: 18, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 18px' }}><Target size={15} style={{ color: '#059669' }} /> {t('analytics.satis_hunisi', 'Satış Hunisi')}</h3>
            {funnelSteps.map((step, i) => {
              const count = statuses[step.key] || 0
              const pct = Math.round((count / total) * 100)
              const width = 100 - i * 15
              return (
                <div key={step.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#475569', fontSize: 12 }}>{step.label}</span>
                    <span style={{ color: step.color, fontSize: 12, fontWeight: 700 }}>{count} (%{pct})</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg,${step.color}80,${step.color})`, borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TOP CAMPAIGNS */}
      {data?.topCampaigns?.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}><Trophy size={15} style={{ color: '#b45309' }} /> {t('analytics.en_iyi_kampanyalar', 'En İyi Kampanyalar')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.topCampaigns.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 700, fontSize: 13, width: 20 }}>#{i+1}</span>
                <span style={{ color: '#0f172a', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>{c.total_sent?.toLocaleString()} gönderim</span>
                <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>%{c.total_sent ? Math.round((c.total_replied||0)/c.total_sent*100) : 0} yanıt</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}

      {tab === 'reports' && (<>
      {/* ── REPORTS CONTROLS (no separate hero — uses main hero) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '14px 18px', background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Trophy size={18} style={{ color: '#7c3aed' }} />
          <div>
            <p style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>Performans Raporları</p>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>Haftalık & aylık satış karşılaştırması</p>
          </div>
          <div style={{ display: 'flex', gap: 5, marginLeft: 16 }}>
            {(['weekly','monthly'] as const).map(v => (
              <button key={v} onClick={() => setReportView(v)} style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${reportView===v?'rgba(124,58,237,0.4)':'#e2e8f0'}`, background: reportView===v?'rgba(124,58,237,0.1)':'transparent', color: reportView===v?'#7c3aed':'#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {v==='weekly'?'Haftalık':'Aylık'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async()=>{setReportGenerating(true);await new Promise(r=>setTimeout(r,1500));setReportGenerating(false)}} disabled={reportGenerating}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            <RefreshCw size={12} style={{ animation: reportGenerating?'rp-spin 1s linear infinite':'none' }} />{reportGenerating?'Oluşturuluyor...':'Rapor Oluştur'}
          </button>
          <button onClick={exportReportsCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 11, cursor: 'pointer' }}>
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      {reportLoading ? (
        <div style={{ display:'flex', justifyContent:'center', height:100, alignItems:'center' }}>
          <RefreshCw size={22} style={{ color:'#475569', animation:'rp-spin 1s linear infinite' }} />
        </div>
      ) : reportD && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label:'Yeni Lead', value:reportD.newLeads, color:'#8b5cf6', Icon: Users, trend:reportD.prevNewLeads?Math.round(((reportD.newLeads-reportD.prevNewLeads)/(reportD.prevNewLeads||1))*100):0 },
              { label: t('Kazanılan','Kazanılan'), value:reportD.wonLeads, color:'#10b981', Icon: Trophy, trend:0 },
              { label: t('Dönüşüm','Dönüşüm'), value:`%${reportD.conversionRate}`, color:'#06b6d4', Icon: Target },
              { label:'Gelir', value:fmtCurrency(reportD.totalRevenue||0), color:'#f59e0b', Icon: DollarSign },
            ].map(m => (
              <div key={m.label} style={{ background:'#ffffff', border:`1px solid ${m.color}20`, borderRadius:16, padding:'18px 16px' }}>
                <div style={{ marginBottom:8 }}><m.Icon size={20} style={{ color: m.color }} /></div>
                <p style={{ color:m.color, fontSize:24, fontWeight:800, margin:'0 0 4px' }}>{m.value}</p>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <p style={{ color:'#0f172a', fontSize:12, fontWeight:600, margin:0 }}>{m.label}</p>
                  {(m as any).trend !== undefined && (m as any).trend !== 0 && <ChangeBadge value={(m as any).trend} />}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <div style={{ background:'#ffffff', border:'1px solid rgba(245,158,11,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><Target size={15} style={{ color:'#7c3aed' }} /> Hedef Takibi</h3>
              {[
                { label:'Lead Hedefi', current:reportD.newLeads, goal:goalLeads, setGoal:setGoalLeads, color:'#8b5cf6' },
                { label:'Gelir Hedefi (TL)', current:reportD.totalRevenue||0, goal:goalRevenue, setGoal:setGoalRevenue, color:'#f59e0b' },
              ].map(g => {
                const pct = Math.min(100, Math.round((g.current/g.goal)*100))
                return (
                  <div key={g.label} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <span style={{ color:'#475569', fontSize:12 }}>{g.label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <input type="number" value={g.goal} onChange={e=>g.setGoal(Number(e.target.value))}
                          style={{ width:70, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'3px 7px', color:'#0f172a', fontSize:11, outline:'none' }} />
                        {pct>=100 && <span style={{ display:'inline-flex', alignItems:'center', gap:3, color:'#047857', fontSize:10, fontWeight:700 }}><CheckCircle size={11} /> {t('reports.asildi', 'Aşıldı!')}</span>}
                      </div>
                    </div>
                    <div style={{ height:7, background:'#e2e8f0', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?'#10b981':g.color, borderRadius:3, boxShadow:`0 0 8px ${g.color}60`, transition:'width 0.8s' }} />
                    </div>
                    <p style={{ color:'#64748b', fontSize:11, margin:'3px 0 0' }}>{g.current.toLocaleString()} / {g.goal.toLocaleString()} (%{pct})</p>
                  </div>
                )
              })}
            </div>

            <div style={{ background:'#ffffff', border:'1px solid rgba(99,102,241,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 }}><BarChart3 size={15} style={{ color:'#4f46e5' }} /> {t('reports.en_iyi_kaynaklar', 'En İyi Kaynaklar')}</h3>
              {reportSources.map(([src, cnt]: any, i: number) => {
                const colors = ['#7c3aed','#4f46e5','#06b6d4','#10b981','#f59e0b']
                const max = (reportSources[0] as any)?.[1] || 1
                return (
                  <div key={src} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:'#475569', fontSize:12 }}>{src}</span>
                      <span style={{ color:colors[i], fontSize:12, fontWeight:700 }}>{cnt}</span>
                    </div>
                    <div style={{ height:5, background:'#f1f5f9', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${Math.round((cnt/max)*100)}%`, background:colors[i], borderRadius:3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.06))', border:'1px solid rgba(124,58,237,0.2)', borderRadius:16, padding:18 }}>
            <p style={{ display:'flex', alignItems:'center', gap:6, color:'#7c3aed', fontSize:11, fontWeight:700, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:1 }}><Zap size={12} /> {t('reports.ai_ozet', 'AI Özet')}</p>
            <p style={{ color:'#0f172a', fontSize:13, margin:0, lineHeight:1.6 }}>
              {reportView==='weekly' ? `Bu hafta ${reportD.newLeads} yeni lead eklendi, ${reportD.wonLeads} deal kazanıldı. Dönüşüm oranı %${reportD.conversionRate}${reportD.conversionRate>15?' — mükemmel!':reportD.conversionRate>8?' — iyi gidiyor':' — geliştirme gerekli'}. ${reportD.totalRevenue>0?`Toplam ${fmtCurrency(reportD.totalRevenue)} gelir gerçekleşti.`:'Fatura geliri henüz yok.'}` : `Bu ay ${reportD.newLeads} lead ve ${reportD.wonLeads} kazanım. Aylık hedeflerinizi gözden geçirin.`}
            </p>
          </div>
        </>
      )}
      </>)}

      {/* ═══════════ BÜYÜME TAB ═══════════ */}
      {tab === 'growth' && (
        <div>
          {finLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><RefreshCw size={20} style={{ color: '#047857', animation: 'df-spin 1s linear infinite' }} /></div>
          ) : financial ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: '30 Gün Lead', value: financial.growth?.thisMonth || financial.monthlyLeads || 0, color: '#047857', Icon: Users },
                  { label: 'Churn Riski', value: financial.churnRisk?.total ?? financial.churnRisk ?? 0, color: '#dc2626', Icon: TrendingDown },
                  { label: 'Kredi Verimi', value: `%${financial.creditEfficiency?.efficiency ?? financial.creditEfficiency ?? 0}`, color: '#2563eb', Icon: Target },
                  { label: 'Büyüme', value: `${(financial.growth?.rate ?? financial.growthRate ?? 0) > 0 ? '+' : ''}${financial.growth?.rate ?? financial.growthRate ?? 0}%`, color: (financial.growth?.rate ?? financial.growthRate ?? 0) >= 0 ? '#047857' : '#dc2626', Icon: TrendingUp },
                ].map(({ label, value, color, Icon }) => (
                  <div key={label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <Icon size={16} style={{ color, marginBottom: 6 }} />
                    <p style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, margin: 0 }}>{value}</p>
                    <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Kaynak ROI */}
              {financial.sourcePerformance?.length > 0 && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Kaynak ROI</p>
                  {financial.sourcePerformance.slice(0, 6).map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ color: '#64748b', fontSize: 11, width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source || s.name}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, s.rate || s.roi || 0)}%`, height: '100%', borderRadius: 4, background: ['#047857','#2563eb','#7c3aed','#b45309','#dc2626','#059669'][i] || '#047857' }} />
                      </div>
                      <span style={{ color: '#0f172a', fontSize: 11, fontWeight: 700, width: 40, textAlign: 'right' }}>{s.rate || s.roi || 0}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Öneriler */}
              {financial.financialAdvice?.advice?.length > 0 && (
                <div style={{ background: '#f0fdfa', border: '1px solid #a7f3d0', borderRadius: 14, padding: '16px 18px' }}>
                  <p style={{ color: '#047857', fontSize: 12, fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={13} /> AI Büyüme Önerileri</p>
                  {financial.financialAdvice.advice.map((a: string, i: number) => (
                    <p key={i} style={{ color: '#475569', fontSize: 12, margin: '0 0 6px', lineHeight: 1.6, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#047857', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {a}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}><p style={{ color: '#94a3b8', fontSize: 13 }}>Veri yüklenemedi</p></div>
          )}
        </div>
      )}

      {/* ═══════════ TAHMİN TAB ═══════════ */}
      {tab === 'forecast' && (
        <div>
          {finLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><RefreshCw size={20} style={{ color: '#047857', animation: 'df-spin 1s linear infinite' }} /></div>
          ) : revenue ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Bu Ay Potansiyel', value: revenue.revenue?.monthlyPotential?.toLocaleString('tr-TR') || '0', color: '#047857', Icon: DollarSign },
                  { label: 'Win Rate', value: `%${revenue.funnel?.winRate || 0}`, color: '#2563eb', Icon: CheckCircle },
                  { label: 'Ort. Deal', value: revenue.revenue?.avgDealValue?.toLocaleString('tr-TR') || '0', color: '#7c3aed', Icon: Target },
                ].map(({ label, value, color, Icon }) => (
                  <div key={label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <Icon size={16} style={{ color, marginBottom: 6 }} />
                    <p style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, margin: 0 }}>{value}</p>
                    <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* 3 Aylık Projeksiyon */}
              {revenue.revenue?.projections?.length > 0 && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>3 Aylık Gelir Projeksiyonu</p>
                  {revenue.revenue.projections.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ color: '#64748b', fontSize: 12, width: 60, flexShrink: 0 }}>T+{i + 1}</span>
                      <div style={{ flex: 1, height: 10, borderRadius: 5, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (p.revenue / Math.max(1, revenue.revenue.projections[2]?.revenue || 1)) * 100)}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, #047857, #059669)` }} />
                      </div>
                      <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 700, width: 80, textAlign: 'right' }}>{p.revenue?.toLocaleString('tr-TR') || 0}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Huni */}
              {revenue.funnel && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Satış Hunisi</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { label: 'İletişim Oranı', value: `%${revenue.funnel.contactRate || 0}`, color: '#0d9488' },
                      { label: 'Nitelendirme', value: `%${revenue.funnel.qualifyRate || 0}`, color: '#7c3aed' },
                      { label: 'Kazanma', value: `%${revenue.funnel.winRate || 0}`, color: '#059669' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '12px', background: `${color}08`, borderRadius: 10, border: `1px solid ${color}20` }}>
                        <p style={{ color, fontSize: 20, fontWeight: 800, margin: 0 }}>{value}</p>
                        <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}><p style={{ color: '#94a3b8', fontSize: 13 }}>Veri yüklenemedi</p></div>
          )}
        </div>
      )}

      <style>{`
        @keyframes df-spin { to { transform: rotate(360deg); } }
        @keyframes df-ping { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes rp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
