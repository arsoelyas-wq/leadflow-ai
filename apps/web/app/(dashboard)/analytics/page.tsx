'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Download, TrendingUp, TrendingDown, Users, MessageSquare, Target, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'

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
function StatCard({ label, value, sub, color, icon, trend, sparkData }: any) {
  const up = trend > 0
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: `1px solid ${color}22`, borderRadius: 16, padding: '18px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, right: -10, width: 70, height: 70, background: `radial-gradient(circle,${color}25 0%,transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}>{icon}</div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${up?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius: 20, padding: '2px 8px' }}>
            {up ? <ArrowUpRight size={11} style={{ color: '#34d399' }} /> : <ArrowDownRight size={11} style={{ color: '#f87171' }} />}
            <span style={{ color: up ? '#34d399' : '#f87171', fontSize: 11, fontWeight: 700 }}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p style={{ color, fontSize: 26, fontWeight: 800, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {sub && <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{sub}</p>}
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { t } = useI18n()
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.get(`/api/analytics/overview?period=${period}`)
      setData(d); setLastRefresh(new Date())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [period])

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
    { label: 'Yeni Lead', key: 'new', color: '#06b6d4' },
    { label: 'İletişim', key: 'contacted', color: '#8b5cf6' },
    { label: 'Nitelikli', key: 'qualified', color: '#f59e0b' },
    { label: 'Kazanılan', key: 'won', color: '#10b981' },
  ]

  return (
    <div style={{ padding: 0 }}>
      {/* ── HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,12,4,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(16,185,129,0.18)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)', backgroundSize: '36px 36px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DataFlowSphere size={90} active={loading} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0 }}>{t('analytics.title','Analitik Dashboard')}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'df-ping 2s ease-in-out infinite' }} />
                  <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>{t('analytics.canli', 'Canlı')}</span>
                </div>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px' }}>
                {lastRefresh ? `Son güncelleme: ${lastRefresh.toLocaleTimeString()}` : 'Veriler yükleniyor...'}
              </p>
              {/* Period selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['7d','30d','90d'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${period===p?'rgba(16,185,129,0.5)':'rgba(255,255,255,0.08)'}`, background: period===p?'rgba(16,185,129,0.15)':'transparent', color: period===p?'#34d399':'#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {p === '7d' ? t('analytics.last7d','Son 7 Gün') : p === '30d' ? t('analytics.last30d','Son 30 Gün') : t('analytics.last90d','Son 90 Gün')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#34d399', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={13} /> CSV İndir
            </button>
            <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'df-spin 1s linear infinite' : 'none' }} /> Yenile
            </button>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label={t('analytics.total_leads','Toplam Lead')} value={data.totalLeads} sub={`+${data.newLeads} ${t('analytics.new_leads','yeni')}`} color="#10b981" icon="👥" trend={12} />
          <StatCard label={t('analytics.conversion','Cevap Oranı')} value={`${data.replyRate}%`} sub={t('analytics.campaigns','kampanya bazlı')} color="#8b5cf6" icon="💬" trend={data.replyRate > 10 ? 5 : -8} />
          <StatCard label={t('analytics.campaigns','Aktif Kampanya')} value={data.activeCampaigns} sub={t('analytics.overview','devam eden')} color="#06b6d4" icon="📢" />
          <StatCard label={t('billing.credits_remaining','Kalan Kredi')} value={data.credits} sub={t('analytics.export','kullanılabilir')} color="#f59e0b" icon="⚡" />
        </div>
      )}

      {/* ── CHANNEL + FUNNEL */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Channel comparison */}
          <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 18, padding: 22 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 18px' }}>{t('analytics.kanal_karsilastirmasi', '📱 Kanal Karşılaştırması')}</h3>
            {[
              { label: 'WhatsApp', value: data.channelStats?.whatsapp || 0, color: '#25d366', icon: '💬' },
              { label: 'Email', value: data.channelStats?.email || 0, color: '#3b82f6', icon: '✉️' },
            ].map(ch => {
              const total2 = (data.channelStats?.whatsapp || 0) + (data.channelStats?.email || 0) || 1
              const pct = Math.round((ch.value / total2) * 100)
              return (
                <div key={ch.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#e2e8f0', fontSize: 13 }}>{ch.icon} {ch.label}</span>
                    <span style={{ color: ch.color, fontWeight: 700, fontSize: 13 }}>{ch.value.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: 3, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${ch.color}60` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Funnel */}
          <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 18, padding: 22 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 18px' }}>{t('analytics.satis_hunisi', '🎯 Satış Hunisi')}</h3>
            {funnelSteps.map((step, i) => {
              const count = statuses[step.key] || 0
              const pct = Math.round((count / total) * 100)
              const width = 100 - i * 15
              return (
                <div key={step.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{step.label}</span>
                    <span style={{ color: step.color, fontSize: 12, fontWeight: 700 }}>{count} (%{pct})</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
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
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>{t('analytics.en_iyi_kampanyalar', '🏆 En İyi Kampanyalar')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.topCampaigns.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#334155', fontWeight: 700, fontSize: 13, width: 20 }}>#{i+1}</span>
                <span style={{ color: '#e2e8f0', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>{c.total_sent?.toLocaleString()} gönderim</span>
                <span style={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}>%{c.total_sent ? Math.round((c.total_replied||0)/c.total_sent*100) : 0} yanıt</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes df-spin { to { transform: rotate(360deg); } }
        @keyframes df-ping { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
