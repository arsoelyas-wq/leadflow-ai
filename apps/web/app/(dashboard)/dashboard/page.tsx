'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { api } from '@/lib/api'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Megaphone, MessageSquare, Zap, TrendingUp, TrendingDown,
  ArrowRight, BarChart2, Bell, Wifi, WifiOff, Plus, ChevronRight,
  AlertCircle, CheckCircle, Target, DollarSign, Activity, RefreshCw,
  Clock, X
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── MINI SPARKLINE ────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#3b82f6', height = 28 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length || data.every(v => v === 0)) return <div style={{ height }} />
  const w = 72, h = height, pad = 2
  const max = Math.max(...data) || 1
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v / max) * (h - pad * 2))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display:'block' }}>
      <defs>
        <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ filter:`drop-shadow(0 0 3px ${color}66)` }}/>
    </svg>
  )
}

// ── AREA CHART ────────────────────────────────────────────────────────────────
function AreaChart({ data }: { data: { date: string; sent: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number|null>(null)
  if (!data.length) return null
  const W = 560, H = 120, PX = 8, PY = 12
  const max = Math.max(...data.map(d => d.sent), 1)
  const pts = data.map((d, i) => {
    const x = PX + (i / (data.length - 1)) * (W - PX * 2)
    const y = PY + (1 - d.sent / max) * (H - PY * 2)
    return { x, y, ...d }
  })
  const linePath = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)} ${H} L${pts[0].x.toFixed(1)} ${H} Z`

  return (
    <div style={{ position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, display:'block' }}
        onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.25}/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0,33,66,100].map(pct => {
          const y = PY + (1 - pct/100) * (H - PY*2)
          return <line key={pct} x1={PX} y1={y} x2={W-PX} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>
        })}
        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)"/>
        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          style={{ filter:'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }}/>
        {/* Hover zones + dots */}
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)}>
            <rect x={p.x - (W/data.length)/2} y={0} width={W/data.length} height={H} fill="transparent"/>
            <circle cx={p.x} cy={p.y} r={hoverIdx===i ? 5 : 3.5} fill={hoverIdx===i?'#fff':'#3b82f6'}
              stroke="#060a14" strokeWidth={2}
              style={{ filter:hoverIdx===i?'drop-shadow(0 0 6px #3b82f6)':'none', transition:'all 0.15s' }}/>
          </g>
        ))}
      </svg>
      {/* X labels */}
      <div style={{ display:'flex', justifyContent:'space-between', paddingLeft:PX, paddingRight:PX, marginTop:4 }}>
        {pts.map((p, i) => (
          <span key={i} style={{ color: hoverIdx===i ? '#93c5fd' : '#334155', fontSize:11, fontWeight: hoverIdx===i ? 700 : 400, transition:'color 0.15s' }}>
            {p.date}
          </span>
        ))}
      </div>
      {/* Tooltip */}
      {hoverIdx !== null && (
        <div style={{ position:'absolute', top:0, left:pts[hoverIdx].x / W * 100 + '%', transform:'translateX(-50%)', background:'rgba(15,23,42,0.95)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:8, padding:'6px 10px', pointerEvents:'none', whiteSpace:'nowrap' }}>
          <p style={{ color:'#93c5fd', fontSize:11, margin:0, fontWeight:700 }}>{pts[hoverIdx].date}</p>
          <p style={{ color:'#fff', fontSize:13, margin:'2px 0 0', fontWeight:800 }}>{pts[hoverIdx].sent} mesaj</p>
        </div>
      )}
    </div>
  )
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = '100%', r = 6 }: { h?: number; w?: number|string; r?: number }) {
  return (
    <div style={{ height:h, width:w, borderRadius:r, background:'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize:'200% 100%', animation:'sk-shine 1.5s infinite' }}/>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(() => {
    api.get('/api/dashboard').then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [])

  // Click outside notifications
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Supabase Realtime
  useEffect(() => {
    if (!user?.id) return
    const addNotif = (text: string, type: string) => {
      setNotifications(p => [{ id: Date.now(), text, type, time: new Date() }, ...p].slice(0, 12))
      setNewCount(c => c + 1)
      setTimeout(fetchData, 800)
    }
    const channel = supabase.channel(`dash-${user.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`user_id=eq.${user.id}` }, (p: any) => {
        if (p.new.direction === 'in') addNotif(`Yeni mesaj: "${(p.new.content||'').slice(0,45)}..."`, 'message')
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'leads', filter:`user_id=eq.${user.id}` }, (p: any) => {
        addNotif(`Yeni lead: ${p.new.company_name || p.new.phone}`, 'lead')
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'campaigns', filter:`user_id=eq.${user.id}` }, (p: any) => {
        if (p.new.status === 'completed') addNotif(`Kampanya tamamlandı: "${p.new.name}"`, 'campaign')
      })
      .subscribe((s: string) => setRealtimeConnected(s === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const stats    = data?.stats
  const funnel   = data?.funnel   || []
  const insights = data?.insights || []
  const maxFunnel = Math.max(...funnel.map((f: any) => f.count), 1)
  const maxSent   = Math.max(...(data?.dailyStats?.map((d: any) => d.sent) || [1]), 1)
  const sparkData = data?.dailyStats?.map((d: any) => d.sent) || []

  const card = { background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16 } as const

  // Insight icon/color map
  const insightMeta: Record<string,{ color:string; bg:string; Icon:any }> = {
    action:  { color:'#60a5fa', bg:'rgba(59,130,246,0.08)',  Icon:Target },
    warning: { color:'#fbbf24', bg:'rgba(245,158,11,0.08)',  Icon:AlertCircle },
    credit:  { color:'#f87171', bg:'rgba(239,68,68,0.08)',   Icon:Zap },
    success: { color:'#34d399', bg:'rgba(16,185,129,0.08)',  Icon:CheckCircle },
  }

  const notifColorMap: Record<string,string> = { message:'#3b82f6', lead:'#10b981', campaign:'#8b5cf6' }
  const notifIconMap: Record<string,any>     = { message:MessageSquare, lead:Users, campaign:Megaphone }

  const statusStyle: Record<string,{ color:string; bg:string }> = {
    active:    { color:'#34d399', bg:'rgba(16,185,129,0.12)'  },
    paused:    { color:'#fbbf24', bg:'rgba(245,158,11,0.12)'  },
    completed: { color:'#60a5fa', bg:'rgba(59,130,246,0.12)'  },
    draft:     { color:'#64748b', bg:'rgba(100,116,139,0.12)' },
  }
  const statusLabel = (s: string) => t(`status.${s}`, s)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <style>{`
        @keyframes sk-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>
            {t('dashboard.greeting')}, {user?.name?.split(' ')[0]}
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
            <p style={{ color:'#475569', fontSize:13, margin:0 }}>{t('dashboard.daily_summary', 'İşte bugünkü özet')}</p>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, background:realtimeConnected?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)', border:`1px solid ${realtimeConnected?'rgba(16,185,129,0.25)':'rgba(100,116,139,0.2)'}` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:realtimeConnected?'#10b981':'#475569', animation:realtimeConnected?'pulse-dot 2s infinite':'none' }}/>
              <span style={{ color:realtimeConnected?'#34d399':'#475569', fontSize:11, fontWeight:600 }}>{realtimeConnected ? t('dashboard.live') : t('dashboard.connecting', 'Bağlanıyor...')}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Notification Bell */}
          <div ref={notifRef} style={{ position:'relative' }}>
            <button onClick={() => { setShowNotifs(!showNotifs); setNewCount(0) }}
              style={{ width:40, height:40, borderRadius:11, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', transition:'all 0.15s' }}>
              <Bell size={16} color="#64748b"/>
              {newCount > 0 && (
                <span style={{ position:'absolute', top:-5, right:-5, width:18, height:18, background:'#3b82f6', borderRadius:'50%', color:'#fff', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #060a14' }}>{newCount}</span>
              )}
            </button>
            {showNotifs && (
              <div style={{ position:'absolute', right:0, top:46, width:320, background:'linear-gradient(135deg,#0d111f,#090d1a)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, boxShadow:'0 24px 60px rgba(0,0,0,0.6)', zIndex:200, overflow:'hidden', animation:'fadeIn 0.18s ease' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{t('dashboard.notifications','Bildirimler')}</span>
                  <button onClick={() => setNotifications([])} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:11, padding:0 }}>{t('dashboard.clear','Temizle')}</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding:'28px 16px', textAlign:'center', color:'#334155', fontSize:13 }}>{t('dashboard.no_notifs','Henüz bildirim yok')}</div>
                ) : (
                  <div style={{ maxHeight:280, overflowY:'auto' }}>
                    {notifications.map(n => {
                      const NIcon = notifIconMap[n.type] || Bell
                      const nc = notifColorMap[n.type] || '#64748b'
                      return (
                        <div key={n.id} style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'flex-start' }}>
                          <div style={{ width:28, height:28, borderRadius:8, background:`${nc}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <NIcon size={13} color={nc}/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ color:'#e2e8f0', fontSize:12, margin:0, lineHeight:1.5 }}>{n.text}</p>
                            <p style={{ color:'#334155', fontSize:10, margin:'3px 0 0' }}>{n.time.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link href="/campaigns/new" style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 16px rgba(59,130,246,0.35)', transition:'all 0.15s' }}>
            <Zap size={14}/> {t('dashboard.new_campaign')}
          </Link>
        </div>
      </div>

      {/* ── AI INSIGHTS ── */}
      {!loading && insights.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {insights.slice(0,2).map((ins: any, i: number) => {
            const m = insightMeta[ins.type] || insightMeta.action
            const InsIcon = m.Icon
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:m.bg, border:`1px solid ${m.color}22`, borderRadius:12, animation:'fadeIn 0.3s ease' }}>
                <InsIcon size={16} color={m.color} style={{ flexShrink:0 }}/>
                <p style={{ color:'#94a3b8', fontSize:13, margin:0, flex:1 }}>{ins.text}</p>
                <Link href={ins.href} style={{ display:'flex', alignItems:'center', gap:4, color:m.color, fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap', padding:'5px 12px', borderRadius:8, background:`${m.color}15`, border:`1px solid ${m.color}25` }}>
                  {ins.action} <ChevronRight size={12}/>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {loading ? (
          [0,1,2,3].map(i => (
            <div key={i} style={{ ...card, padding:20 }}>
              <Skeleton h={12} w={80} r={4}/><div style={{ marginTop:12 }}/>
              <Skeleton h={28} w={100} r={6}/><div style={{ marginTop:8 }}/>
              <Skeleton h={10} w={60} r={4}/><div style={{ marginTop:12 }}/>
              <Skeleton h={28} w="100%" r={4}/>
            </div>
          ))
        ) : [
          {
            label: t('dashboard.total_leads'), value: stats?.totalLeads?.toLocaleString() || '0',
            sub: `+${stats?.weekLeads || 0} ${t('this_week','bu hafta')}`,
            trend: stats?.weekGrowth || 0, icon: Users, color: '#3b82f6',
            sparkColor: '#3b82f6',
          },
          {
            label: t('dashboard.pipeline'),
            value: `₺${((stats?.pipelineValue || 0)/1000).toFixed(0)}K`,
            sub: `${stats?.activeCampaigns || 0} ${t('active','aktif')} kampanya`,
            trend: null, icon: DollarSign, color: '#10b981',
            sparkColor: '#10b981',
          },
          {
            label: t('dashboard.reply_rate'), value: `%${stats?.replyRate || 0}`,
            sub: `${stats?.totalSent || 0} ${t('sent','gönderildi')}`,
            trend: null, icon: TrendingUp, color: '#8b5cf6',
            sparkColor: '#8b5cf6',
          },
          {
            label: t('dashboard.credits'), value: (stats?.credits || 0).toLocaleString(),
            sub: stats?.planType || 'starter',
            trend: null, icon: Zap, color: '#f59e0b',
            sparkColor: '#f59e0b',
          },
        ].map(({ label, value, sub, trend, icon: Icon, color, sparkColor }) => (
          <div key={label} style={{ ...card, padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ color:'#475569', fontSize:12, fontWeight:600 }}>{label}</span>
              <div style={{ width:34, height:34, borderRadius:9, background:`${color}14`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={15} color={color}/>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:8 }}>
              <div>
                <p style={{ color:'#fff', fontSize:26, fontWeight:900, margin:0, letterSpacing:'-1px' }}>{value}</p>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                  {trend !== null && trend !== undefined && (
                    <span style={{ display:'flex', alignItems:'center', gap:2, color: trend >= 0 ? '#34d399' : '#f87171', fontSize:11, fontWeight:700 }}>
                      {trend >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                      {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                  )}
                  <span style={{ color:'#334155', fontSize:11 }}>{sub}</span>
                </div>
              </div>
              <Sparkline data={sparkData} color={sparkColor}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHART + FUNNEL ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:16 }}>
        {/* Area Chart */}
        <div style={{ ...card, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <h2 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{t('dashboard.trend')}</h2>
            <span style={{ color:'#334155', fontSize:12 }}>{t('dashboard.last7d', 'Son 7 gün')}</span>
          </div>
          {loading ? (
            <Skeleton h={120} r={8}/>
          ) : data?.dailyStats?.some((d: any) => d.sent > 0) ? (
            <AreaChart data={data.dailyStats}/>
          ) : (
            <div style={{ height:120, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
              <BarChart2 size={28} color="#1e293b"/>
              <p style={{ color:'#334155', fontSize:13, margin:0 }}>{t('dashboard.no_messages')}</p>
              <Link href="/campaigns/new" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                {t('dashboard.start_campaign')} <ArrowRight size={12}/>
              </Link>
            </div>
          )}
        </div>

        {/* Lead Funnel */}
        <div style={{ ...card, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{t('dashboard.funnel')}</h2>
            <Link href="/pipeline" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>{t('page.all', 'Tümü')}<ChevronRight size={12}/></Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[0,1,2,3,4].map(i => <Skeleton key={i} h={22} r={6}/>)}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {funnel.map((f: any, i: number) => {
                const pct = Math.round((f.count / maxFunnel) * 100)
                const funnelColors = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#34d399']
                const color = funnelColors[i] || '#3b82f6'
                return (
                  <div key={f.key}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:'#94a3b8', fontSize:12 }}>{t(`pipeline.stage.${f.key}`, f.label)}</span>
                      <span style={{ color, fontSize:12, fontWeight:700 }}>{f.count.toLocaleString()}</span>
                    </div>
                    <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, boxShadow:`0 0 8px ${color}40`, transition:'width 0.8s ease' }}/>
                    </div>
                  </div>
                )
              })}
              {!funnel.length && (
                <p style={{ color:'#334155', fontSize:12, textAlign:'center', padding:'20px 0' }}>Lead ekleyin</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CAMPAIGNS + ACTIVITY ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
        {/* Campaigns */}
        <div style={{ ...card, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{t('dashboard.campaigns')}</h2>
            <Link href="/campaigns" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>{t('page.all', 'Tümü')}<ChevronRight size={12}/></Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{[0,1,2].map(i => <Skeleton key={i} h={62} r={10}/>)}</div>
          ) : data?.recentCampaigns?.length ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {data.recentCampaigns.map((c: any) => {
                const ss = statusStyle[c.status] || statusStyle.draft
                const replyRate = c.total_sent > 0 ? Math.round((c.total_replied||0)/c.total_sent*100) : 0
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, textDecoration:'none', transition:'all 0.15s' }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:`${ss.color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {c.channel==='whatsapp' ? <MessageSquare size={15} color={ss.color}/> : <Megaphone size={15} color={ss.color}/>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                      <p style={{ color:'#475569', fontSize:11, margin:0 }}>{c.total_sent||0} {t('campaigns.sent','gönderildi')} · {replyRate}% {t('campaigns.replied','cevap')}</p>
                    </div>
                    <span style={{ color:ss.color, background:ss.bg, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, flexShrink:0 }}>{statusLabel(c.status)}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'28px 0' }}>
              <Megaphone size={26} color="#1e293b"/>
              <p style={{ color:'#334155', fontSize:13, margin:0 }}>Kampanya yok</p>
              <Link href="/campaigns/new" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none' }}>{t('page.create', 'Oluştur') + ' →'}</Link>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div style={{ ...card, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{t('dashboard.activity')}</h2>
            <Activity size={14} color="#475569"/>
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>{[0,1,2,3].map(i=><Skeleton key={i} h={38} r={8}/>)}</div>
          ) : (data?.recentMessages||[]).length ? (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {data.recentMessages.slice(0,6).map((m: any, i: number) => (
                <div key={m.id||i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems:'flex-start' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6', marginTop:5, flexShrink:0, boxShadow:'0 0 6px #3b82f666' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#94a3b8', fontSize:12, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.4 }}>
                      {(m.content||'').slice(0,55)}{(m.content||'').length>55?'...':''}
                    </p>
                    <p style={{ color:'#334155', fontSize:10, margin:'2px 0 0', display:'flex', alignItems:'center', gap:3 }}>
                      <Clock size={9}/> {new Date(m.sent_at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'24px 0' }}>
              <Activity size={24} color="#1e293b"/>
              <p style={{ color:'#334155', fontSize:12, margin:0 }}>{t('dashboard.no_activity', 'Henüz aktivite yok')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT LEADS ── */}
      <div style={{ ...card, padding:'20px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{t('dashboard.leads')}</h2>
          <Link href="/leads" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
            {t('dashboard.see_all','Tümünü gör')} <ArrowRight size={12}/>
          </Link>
        </div>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{[0,1,2,3].map(i=><Skeleton key={i} h={48} r={8}/>)}</div>
        ) : data?.recentLeads?.length ? (
          <div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 80px 100px', gap:12, padding:'0 10px 8px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              {[t('leads.col_company','Şirket / Kişi'),t('leads.col_source','Kaynak'),t('leads.col_score','Puan'),t('leads.col_status','Durum')].map(h => (
                <span key={h} style={{ color:'#334155', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</span>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column' }}>
              {data.recentLeads.map((lead: any, i: number) => {
                const score = lead.score || 0
                const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#64748b'
                const ls = statusStyle[lead.status] || statusStyle.draft
                return (
                  <Link key={lead.id} href={`/leads/${lead.id}`}
                    style={{ display:'grid', gridTemplateColumns:'1fr 120px 80px 100px', gap:12, padding:'10px', borderBottom: i < data.recentLeads.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems:'center', textDecoration:'none', borderRadius:8, transition:'background 0.12s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'#93c5fd', fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {((lead.company_name||lead.contact_name||'?')[0]).toUpperCase()}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {lead.company_name || lead.contact_name}
                        </p>
                        <p style={{ color:'#334155', fontSize:11, margin:'1px 0 0' }}>{lead.city||'—'}</p>
                      </div>
                    </div>
                    <span style={{ color:'#475569', fontSize:12 }}>{lead.source||'—'}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${score}%`, background:scoreColor, borderRadius:2 }}/>
                      </div>
                      <span style={{ color:scoreColor, fontSize:11, fontWeight:700, width:24, flexShrink:0 }}>{score}</span>
                    </div>
                    <span style={{ color:ls.color, background:ls.bg, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, width:'fit-content' }}>
                      {statusLabel(lead.status||'new')}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'28px 0' }}>
            <Users size={28} color="#1e293b"/>
            <p style={{ color:'#334155', fontSize:13, margin:0 }}>{t('leads.no_leads', 'Henüz lead yok')}</p>
            <Link href="/lead-machine" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none' }}>Lead bul →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
