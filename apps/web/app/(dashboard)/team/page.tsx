'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Users, Plus, RefreshCw, Trash2, CheckCircle, BarChart2, Save, Activity, X, Zap, TrendingUp, ChevronRight, Send, Copy } from 'lucide-react'

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  card:     '#ffffff',
  cardBd:   '1px solid #e2e8f0',
  cardSh:   '0 1px 4px rgba(0,0,0,0.06)',
  cardR:    16,
  page:     '#f8fafc',
  border:   '#e2e8f0',
  divider:  '#f1f5f9',
  hover:    '#f8fafc',
  text1:    '#0f172a',
  text2:    '#334155',
  text3:    '#64748b',
  text4:    '#94a3b8',
  inpBg:    '#f8fafc',
  violet:   '#7c3aed',
  violetBg: '#f5f3ff',
  violetBd: '#ddd6fe',
  primary:  '#2563eb',
  prBg:     '#eff6ff',
  prBd:     '#bfdbfe',
  success:  '#059669',
  sucBg:    '#ecfdf5',
  sucBd:    '#a7f3d0',
  danger:   '#dc2626',
  danBg:    '#fef2f2',
  danBd:    '#fecaca',
  warn:     '#b45309',
  warnBg:   '#fffbeb',
  warnBd:   '#fde68a',
}

const card   = { background: C.card, border: C.cardBd, borderRadius: C.cardR, boxShadow: C.cardSh }
const inp    = { background: C.inpBg, border: C.cardBd, borderRadius: 9, padding: '10px 12px', color: C.text1, fontSize: 13, outline: 'none' }
const inpSm  = { background: C.inpBg, border: C.cardBd, borderRadius: 9, padding: '8px 12px', color: C.text1, fontSize: 12, outline: 'none' }
const btn    = (active?: boolean) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: active !== false ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : C.inpBg,
  color: active !== false ? '#fff' : C.text3,
  fontSize: 12, fontWeight: 700,
  boxShadow: active !== false ? '0 3px 12px rgba(124,58,237,0.25)' : 'none',
  transition: 'all 0.15s',
})

// ── TEAM ORB ──────────────────────────────────────────────────────────────────
function TeamOrb({ size = 110, members = [], scanning = false }: { size?: number; members?: any[]; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick]       = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 22 : 50)
    return () => clearInterval(t)
  }, [mounted, scanning])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const rot = tick * (scanning ? 1.0 : 0.4)
  const roleColors: Record<string, string> = { admin:'#ef4444', manager:'#8b5cf6', sales:'#3b82f6', support:'#10b981', readonly:'#64748b' }
  const statusColors: Record<string, string> = { online:'#10b981', break:'#f59e0b', offline:'#94a3b8' }

  const orbNodes = members.slice(0, 6).map((m, i) => {
    const a = (i * (360 / Math.max(members.length, 1)) + rot) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.74, y: cx + Math.sin(a) * s * 0.74, m }
  })

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`toHub${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="35%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </radialGradient>
        </defs>
        {[0.56, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth={0.8}
            strokeDasharray="5 8" style={{ animation:`to-ring ${9+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin:`${cx}px ${cx}px` }} />
        ))}
        {orbNodes.map((node, i) => (
          <g key={i}>
            <line x1={cx} y1={cx} x2={node.x} y2={node.y} stroke={`${roleColors[node.m.role]||'#8b5cf6'}30`} strokeWidth={0.8} strokeDasharray="3 5" />
            <circle cx={node.x} cy={node.y} r={16} fill={`${roleColors[node.m.role]||'#8b5cf6'}18`} stroke={`${roleColors[node.m.role]||'#8b5cf6'}60`} strokeWidth={1.5} />
            <text x={node.x} y={node.y} fill={roleColors[node.m.role]||'#8b5cf6'} fontSize={9} textAnchor="middle" dominantBaseline="middle" fontWeight="800">
              {node.m.name?.charAt(0)?.toUpperCase()}
            </text>
            <circle cx={node.x + 10} cy={node.y - 10} r={4} fill={statusColors[node.m.status||'offline']} />
          </g>
        ))}
        <circle cx={cx} cy={cx} r={s * 0.38} fill={`url(#toHub${s})`} style={{ filter:'drop-shadow(0 0 12px rgba(124,58,237,0.4))' }} />
        <text x={cx} y={cx} fill="white" fontSize={s * 0.16} textAnchor="middle" dominantBaseline="middle" fontWeight="900">TM</text>
      </svg>
      <style>{`@keyframes to-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes tm-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const ROLES = [
  { key:'admin',    label:'Yönetici',        color:'#dc2626', bg:'#fef2f2', bd:'#fecaca' },
  { key:'manager',  label:'Müdür',           color:'#7c3aed', bg:'#f5f3ff', bd:'#ddd6fe' },
  { key:'sales',    label:'Satış Temsilcisi',color:'#2563eb', bg:'#eff6ff', bd:'#bfdbfe' },
  { key:'support',  label:'Destek',          color:'#059669', bg:'#ecfdf5', bd:'#a7f3d0' },
  { key:'readonly', label:'Görüntüleyici',   color:'#64748b', bg:'#f8fafc', bd:'#e2e8f0' },
]
const BADGE_DEFS: Record<string, string> = {
  top_seller:'En İyi Satıcı', speed_master:'Hız Ustası', streak_7:'7 Günlük Seri',
  closer:'Kapanış Ustası', coach_star:'Koçluk Yıldızı', consistent:'Tutarlı',
}
const STATUS = [
  { key:'online',  label:'Çevrimiçi',  color:'#059669', bg:'#ecfdf5' },
  { key:'break',   label:'Mola',       color:'#b45309', bg:'#fffbeb' },
  { key:'offline', label:'Çevrimdışı', color:'#64748b', bg:'#f8fafc' },
]

function roleInfo(key: string) { return ROLES.find(r => r.key === key) || ROLES[2] }
function scoreColor(s: number) { return s>=80?'#059669':s>=60?'#b45309':s>=40?'#ea580c':'#dc2626' }

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size*0.38, c = size*0.5, circ = 2*Math.PI*r
  const dash = circ * (score/100)
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#f1f5f9" strokeWidth={4} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c} fill={scoreColor(score)} fontSize={size*0.22} textAnchor="middle" dominantBaseline="middle" fontWeight="900">{score}</text>
    </svg>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value/max)*100)) : 0
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:C.text4, fontSize:10 }}>{value}/{max}</span>
        <span style={{ color, fontSize:10, fontWeight:700 }}>%{pct}</span>
      </div>
      <div style={{ height:5, background:'#f1f5f9', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.6s' }} />
      </div>
    </div>
  )
}

// ── ADD MEMBER MODAL ──────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onAdded }: { onClose:()=>void; onAdded:()=>void }) {
  const [form, setForm] = useState({ name:'', email:'', role:'sales', password:'', wa_phone:'', target_leads_monthly:30, target_conversion_rate:25 })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const fi = { ...inp, width:'100%', boxSizing:'border-box' as const, fontSize:13, padding:'10px 12px' }

  const submit = async () => {
    if (!form.name || !form.email || !form.role) { setError('Ad, email ve rol zorunludur'); return }
    setSaving(true); setError('')
    try { await api.post('/api/team/members', form); onAdded(); onClose() }
    catch(e:any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#ffffff', border:`1px solid ${C.violetBd}`, borderRadius:20, padding:28, width:480, maxWidth:'94vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <h2 style={{ color:C.text1, fontSize:17, fontWeight:800, margin:0 }}>Yeni Ekip Üyesi</h2>
            <p style={{ color:C.text3, fontSize:12, margin:'4px 0 0' }}>Takımınıza yeni bir üye ekleyin</p>
          </div>
          <button onClick={onClose} style={{ background:C.hover, border:C.cardBd, borderRadius:8, padding:'6px', cursor:'pointer', display:'flex', alignItems:'center', color:C.text3 }}><X size={16}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>Ad Soyad *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={fi} placeholder="Ahmet Yılmaz"/></div>
            <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>Email *</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={fi} placeholder="ahmet@firma.com"/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>Rol *</label>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{ ...fi, height:44, cursor:'pointer' }}>
                {ROLES.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>Şifre</label><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="••••••••" style={fi} /></div>
          </div>
          <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>WhatsApp (bildirim için)</label><input value={form.wa_phone} onChange={e=>setForm(p=>({...p,wa_phone:e.target.value}))} placeholder="905551234567" style={fi} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>Aylık Lead Hedefi</label><input type="number" value={form.target_leads_monthly} onChange={e=>setForm(p=>({...p,target_leads_monthly:Number(e.target.value)}))} style={fi} /></div>
            <div><label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:5 }}>Dönüşüm Hedefi (%)</label><input type="number" value={form.target_conversion_rate} onChange={e=>setForm(p=>({...p,target_conversion_rate:Number(e.target.value)}))} style={fi} /></div>
          </div>
          {error && <p style={{ color:C.danger, fontSize:12, background:C.danBg, border:`1px solid ${C.danBd}`, padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>}
          <button onClick={submit} disabled={saving}
            style={{ padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 18px rgba(124,58,237,0.3)', opacity:saving?0.8:1 }}>
            {saving?<RefreshCw size={14} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Plus size={14}/>}
            {saving?'Ekleniyor...':'Üye Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ANA SAYFA ─────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [members,        setMembers]        = useState<any[]>([])
  const [activity,       setActivity]       = useState<any[]>([])
  const [leaderboard,    setLeaderboard]    = useState<any[]>([])
  const [loadBalance,    setLoadBalance]    = useState<any>(null)
  const [stats,          setStats]          = useState<any>(null)
  const [leads,          setLeads]          = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeTab,      setActiveTab]      = useState<'team'|'activity'|'leaderboard'|'kpi'|'coaching'|'analytics'>('team')
  const [trend,          setTrend]          = useState<any>(null)
  const [benchmark,      setBenchmark]      = useState<any>(null)
  const [trendDays,      setTrendDays]      = useState(30)
  const [trendMember,    setTrendMember]    = useState('')
  const [reportSettings, setReportSettings] = useState({ weekly_enabled:true, alert_threshold:50 })
  const [sendingReport,  setSendingReport]  = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [showAdd,        setShowAdd]        = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedLeads,  setSelectedLeads]  = useState<string[]>([])
  const [msg,            setMsg]            = useState<{type:'success'|'error';text:string}|null>(null)
  const [autoAssigning,  setAutoAssigning]  = useState(false)
  const [coaching,       setCoaching]       = useState<Record<string,string>>({})
  const [sendingCoaching,setSendingCoaching]= useState<string|null>(null)
  const [weeklyReport,   setWeeklyReport]   = useState<string|null>(null)
  const [generatingReport,setGeneratingReport] = useState(false)
  const [transferForm,   setTransferForm]   = useState({ from:'', to:'' })

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [m, st, ac, lb, ld, lbal] = await Promise.allSettled([
      api.get('/api/team/members'),
      api.get('/api/team/stats'),
      api.get('/api/team/activity'),
      api.get('/api/team/leaderboard'),
      api.get('/api/leads?limit=50&status=new'),
      api.get('/api/team/load-balance'),
    ])
    if (m.status==='fulfilled') setMembers((m.value as any).members||[])
    if (st.status==='fulfilled') setStats(st.value)
    if (ac.status==='fulfilled') setActivity((ac.value as any).activity||[])
    if (lb.status==='fulfilled') setLeaderboard((lb.value as any).leaderboard||[])
    if (ld.status==='fulfilled') setLeads((ld.value as any).leads||[])
    if (lbal.status==='fulfilled') setLoadBalance(lbal.value)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    const params = new URLSearchParams({ days: String(trendDays) })
    if (trendMember) params.set('memberId', trendMember)
    const [tr, b, s] = await Promise.allSettled([
      api.get(`/api/ti-reports/trend?${params}`),
      api.get('/api/ti-reports/benchmark'),
      api.get('/api/ti-reports/settings'),
    ])
    if (tr.status==='fulfilled') setTrend(tr.value)
    if (b.status==='fulfilled') setBenchmark(b.value)
    if (s.status==='fulfilled') { const d = s.value as any; setReportSettings(d.settings||d) }
    setLoadingAnalytics(false)
  }, [trendDays, trendMember])

  useEffect(() => { if (activeTab==='analytics') loadAnalytics() }, [activeTab, loadAnalytics])

  const deleteMember  = async (id:string) => { if (!confirm('Üye silinsin mi?')) return; await api.delete(`/api/team/members/${id}`); setMembers(p=>p.filter(m=>m.id!==id)) }
  const toggleActive  = async (id:string, active:boolean) => { await api.patch(`/api/team/members/${id}`, { active: !active }); setMembers(p=>p.map(m=>m.id===id?{...m,active:!active}:m)) }
  const autoAssign    = async () => {
    if (!selectedLeads.length) return showMsg('error','Lead seçin')
    setAutoAssigning(true)
    try { const d:any = await api.post('/api/team/auto-assign', { leadIds: selectedLeads, rule:'round_robin' }); showMsg('success', d.message); setSelectedLeads([]); loadAll() }
    catch(e:any) { showMsg('error', e.message) }
    setAutoAssigning(false)
  }
  const bulkTransfer  = async () => {
    if (!transferForm.from || !transferForm.to) return showMsg('error','İki üye seçin')
    try { const d:any = await api.post('/api/team/bulk-transfer', { fromMemberId: transferForm.from, toMemberId: transferForm.to }); showMsg('success', d.message); loadAll() }
    catch(e:any) { showMsg('error', e.message) }
  }
  const sendCoaching  = async (memberId:string) => {
    setSendingCoaching(memberId)
    try { const d:any = await api.post('/api/team/send-coaching', { memberId }); setCoaching(prev=>({...prev,[memberId]:d.message})); showMsg('success', d.sent?'Koçluk mesajı WhatsApp\'tan gönderildi':'Mesaj oluşturuldu (WA numarası yok)') }
    catch(e:any) { showMsg('error', e.message) }
    setSendingCoaching(null)
  }
  const generateReport = async () => {
    setGeneratingReport(true)
    try { const d:any = await api.post('/api/team/weekly-report', {}); setWeeklyReport(d.report) }
    catch(e:any) { showMsg('error', e.message) }
    setGeneratingReport(false)
  }

  const TABS = [
    {id:'team',        label:'Ekip'},
    {id:'activity',    label:'Aktivite'},
    {id:'leaderboard', label:'Liderlik'},
    {id:'kpi',         label:'KPI'},
    {id:'coaching',    label:'Koçluk'},
    {id:'analytics',   label:'Analitik'},
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {showAdd && <AddMemberModal onClose={()=>setShowAdd(false)} onAdded={()=>{ loadAll(); setShowAdd(false) }} />}

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#f5f3ff 0%,#eff6ff 100%)', border:`1px solid ${C.violetBd}`, borderRadius:20, padding:'24px 28px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 2px 2px, rgba(124,58,237,0.06) 1px, transparent 0)', backgroundSize:'28px 28px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
          <TeamOrb size={80} members={members} scanning={loading} />
          <div style={{ flex:1, minWidth:200 }}>
            <h1 style={{ color:C.text1, fontSize:22, fontWeight:800, margin:'0 0 4px' }}>{t('team.title','Ekip Yönetimi')}</h1>
            <p style={{ color:C.text3, fontSize:12, margin:'0 0 18px' }}>Ekibi yönet · Otomatik lead dağıt · AI koçluk · Performans takibi</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {[
                { l:'Toplam Üye',   v:stats?.total||0,               c:C.text2,    bg:'#ffffff',  bd:C.border },
                { l:'Aktif',        v:stats?.active||0,              c:C.success,  bg:C.sucBg,    bd:C.sucBd },
                { l:'Çevrimiçi',    v:stats?.online||0,              c:'#0891b2',  bg:'#ecfeff',  bd:'#a5f3fc' },
                { l:'Bekleyen Lead',v:leads.length,                   c:C.warn,     bg:C.warnBg,   bd:C.warnBd },
                { l:'Yük Uyarısı',  v:loadBalance?.warnings?.length||0, c:loadBalance?.warnings?.length?C.danger:C.text4, bg:loadBalance?.warnings?.length?C.danBg:'#f8fafc', bd:loadBalance?.warnings?.length?C.danBd:C.border },
              ].map(m=>(
                <div key={m.l} style={{ background:m.bg, border:`1px solid ${m.bd}`, borderRadius:10, padding:'8px 14px', textAlign:'center', minWidth:80 }}>
                  <p style={{ color:m.c, fontSize:20, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:C.text4, fontSize:10, margin:'2px 0 0', fontWeight:500 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <button onClick={()=>setShowAdd(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(124,58,237,0.3)', whiteSpace:'nowrap' }}>
              <Plus size={14} /> Üye Ekle
            </button>
            <button onClick={loadAll}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 14px', borderRadius:10, border:C.cardBd, background:'#ffffff', color:C.text3, fontSize:12, cursor:'pointer', fontWeight:500 }}>
              <RefreshCw size={12} style={{ animation:loading?'tm-spin 1s linear infinite':'none' }} /> Yenile
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION ── */}
      {msg && (
        <div style={{ padding:'10px 16px', background:msg.type==='success'?C.sucBg:C.danBg, border:`1px solid ${msg.type==='success'?C.sucBd:C.danBd}`, borderRadius:10 }}>
          <p style={{ color:msg.type==='success'?C.success:C.danger, fontSize:12, margin:0, fontWeight:600 }}>{msg.text}</p>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:2, background:C.inpBg, padding:4, borderRadius:12, width:'fit-content', border:C.cardBd }}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
            style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', transition:'all 0.15s',
              background:activeTab===tab.id?'#ffffff':'transparent',
              color:activeTab===tab.id?C.violet:C.text3,
              boxShadow:activeTab===tab.id?'0 1px 4px rgba(0,0,0,0.08)':'none',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════ EKİP TAB ════════════════ */}
      {activeTab === 'team' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {loadBalance?.warnings?.length > 0 && (
            <div style={{ padding:'12px 18px', background:C.danBg, border:`1px solid ${C.danBd}`, borderRadius:12 }}>
              <p style={{ color:C.danger, fontSize:12, fontWeight:700, margin:'0 0 4px' }}>Yük Dengesizliği Tespit Edildi</p>
              {loadBalance.warnings.map((w:any,i:number) => <p key={i} style={{ color:C.text3, fontSize:11, margin:0 }}>{w.warning}</p>)}
            </div>
          )}

          {/* Lead atama */}
          <div style={{ ...card, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ color:C.text2, fontSize:12, fontWeight:600 }}>{leads.length} bekleyen lead</span>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {leads.slice(0,6).map(l=>(
                  <button key={l.id} onClick={()=>setSelectedLeads(p=>p.includes(l.id)?p.filter(x=>x!==l.id):[...p,l.id])} style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${selectedLeads.includes(l.id)?C.violetBd:C.border}`, background:selectedLeads.includes(l.id)?C.violetBg:'#ffffff', color:selectedLeads.includes(l.id)?C.violet:C.text3, fontSize:11, cursor:'pointer' }}>
                    {l.company_name?.substring(0,20)}
                  </button>
                ))}
                {leads.length > 6 && <span style={{ color:C.text4, fontSize:11 }}>+{leads.length-6} daha</span>}
              </div>
              {selectedLeads.length > 0 && (
                <button onClick={autoAssign} disabled={autoAssigning}
                  style={{ ...btn(), marginLeft:'auto', whiteSpace:'nowrap' }}>
                  {autoAssigning?<RefreshCw size={11} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Zap size={11}/>}
                  {selectedLeads.length} Lead Dağıt
                </button>
              )}
            </div>
          </div>

          {/* Üye listesi */}
          {loading ? (
            <div style={{ textAlign:'center', padding:48, color:C.text4 }}>
              <RefreshCw size={24} style={{ animation:'tm-spin 1s linear infinite', display:'block', margin:'0 auto 10px', color:C.violet }} />
              <p style={{ margin:0, fontSize:13 }}>Yükleniyor...</p>
            </div>
          ) : members.length === 0 ? (
            <div style={{ ...card, padding:52, textAlign:'center' }}>
              <div style={{ width:56, height:56, borderRadius:16, background:C.violetBg, border:`1px solid ${C.violetBd}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <Users size={26} color={C.violet} />
              </div>
              <h3 style={{ color:C.text1, fontSize:16, fontWeight:700, margin:'0 0 8px' }}>Henüz ekip üyesi yok</h3>
              <p style={{ color:C.text3, fontSize:13, margin:'0 0 20px' }}>İlk ekip üyenizi ekleyerek başlayın</p>
              <button onClick={()=>setShowAdd(true)} style={{ padding:'10px 22px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(124,58,237,0.3)' }}>
                Üye Ekle
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {members.map(member => {
                const ri  = roleInfo(member.role)
                const st  = STATUS.find(s=>s.key===(member.status||'offline'))
                return (
                  <div key={member.id} style={{ ...card, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      {/* Avatar */}
                      <div style={{ width:46, height:46, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.bd}`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:18, flexShrink:0, position:'relative' }}>
                        {member.name?.charAt(0)?.toUpperCase()}
                        <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderRadius:'50%', background:st?.color||'#94a3b8', border:'2px solid #ffffff' }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                          <p style={{ color:C.text1, fontWeight:700, fontSize:14, margin:0 }}>{member.name}</p>
                          <span style={{ background:ri.bg, border:`1px solid ${ri.bd}`, color:ri.color, fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{ri.label}</span>
                          <span style={{ background:st?.bg||'#f8fafc', color:st?.color||'#64748b', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{st?.label||'Çevrimdışı'}</span>
                          {!member.active && <span style={{ background:C.danBg, color:C.danger, fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>Pasif</span>}
                          {(member.badges||[]).slice(0,2).map((b:string)=>(
                            <span key={b} style={{ background:C.warnBg, border:`1px solid ${C.warnBd}`, color:C.warn, fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{BADGE_DEFS[b]||b}</span>
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:14, fontSize:11, color:C.text3, flexWrap:'wrap' }}>
                          <span>{member.email}</span>
                          {member.wa_phone && <span style={{ color:C.success }}>WA: {member.wa_phone}</span>}
                          {member.leads_count > 0 && <span>{member.leads_count} lead</span>}
                          {member.last_login && <span>Son giriş: {new Date(member.last_login).toLocaleDateString('tr-TR')}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button onClick={()=>setSelectedMember(member)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:`1px solid ${C.violetBd}`, background:C.violetBg, color:C.violet, fontSize:11, cursor:'pointer', fontWeight:600 }}>
                          <ChevronRight size={13} /> Detay
                        </button>
                        <button onClick={()=>toggleActive(member.id, member.active)}
                          style={{ padding:'7px 10px', borderRadius:9, border:`1px solid ${member.active?C.sucBd:C.danBd}`, background:member.active?C.sucBg:C.danBg, color:member.active?C.success:C.danger, cursor:'pointer' }}>
                          <CheckCircle size={13} />
                        </button>
                        <button onClick={()=>deleteMember(member.id)} style={{ padding:'7px 10px', borderRadius:9, border:`1px solid ${C.danBd}`, background:C.danBg, color:C.danger, cursor:'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Toplu Transfer */}
          <div style={{ ...card, padding:'16px 18px' }}>
            <h3 style={{ color:C.text2, fontSize:13, fontWeight:700, margin:'0 0 12px' }}>Lead Toplu Transfer</h3>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <select value={transferForm.from} onChange={e=>setTransferForm(p=>({...p,from:e.target.value}))} style={{ ...inpSm, height:38, flex:1, cursor:'pointer' }}>
                <option value="">Kimden?</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span style={{ color:C.text4, fontSize:16 }}>→</span>
              <select value={transferForm.to} onChange={e=>setTransferForm(p=>({...p,to:e.target.value}))} style={{ ...inpSm, height:38, flex:1, cursor:'pointer' }}>
                <option value="">Kime?</option>
                {members.filter(m=>m.id!==transferForm.from).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={bulkTransfer} disabled={!transferForm.from||!transferForm.to}
                style={{ ...btn(), flexShrink:0, opacity:!transferForm.from||!transferForm.to?0.5:1 }}>Transfer Et</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ AKTİVİTE TAB ════════════════ */}
      {activeTab === 'activity' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {activity.length === 0 ? (
            <div style={{ ...card, padding:48, textAlign:'center' }}>
              <Activity size={28} style={{ margin:'0 auto 12px', display:'block', color:C.text4 }} />
              <p style={{ fontSize:13, margin:0, color:C.text3 }}>Aktivite verisi yok</p>
            </div>
          ) : activity.map((a:any) => {
            const ri = roleInfo(a.member.role)
            return (
              <div key={a.member.id} style={{ ...card, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.bd}`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:18, flexShrink:0 }}>
                    {a.member.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:C.text1, fontWeight:700, fontSize:13, margin:'0 0 3px' }}>{a.member.name}</p>
                    <p style={{ color:C.text3, fontSize:11, margin:0 }}>{ri.label}</p>
                  </div>
                  {a.avgCoachingScore && <div style={{ textAlign:'right' }}>
                    <p style={{ color:scoreColor(a.avgCoachingScore), fontWeight:800, fontSize:18, margin:0 }}>{a.avgCoachingScore}</p>
                    <p style={{ color:C.text4, fontSize:10, margin:0 }}>Ort. Skor</p>
                  </div>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {[
                    { l:'Haftalık Mesaj', v:a.weeklyMessages, c:'#0891b2', bg:'#ecfeff', bd:'#a5f3fc' },
                    { l:'Aktif Lead',     v:a.activeLeads,    c:C.warn,    bg:C.warnBg,  bd:C.warnBd },
                    { l:'Bu Ay Kapandı', v:a.wonThisMonth,   c:C.success, bg:C.sucBg,   bd:C.sucBd },
                    { l:'Dönüşüm %',     v:`%${a.convRate||0}`, c:C.violet, bg:C.violetBg, bd:C.violetBd },
                  ].map(m=>(
                    <div key={m.l} style={{ background:m.bg, border:`1px solid ${m.bd}`, borderRadius:10, padding:'10px', textAlign:'center' }}>
                      <p style={{ color:m.c, fontWeight:800, fontSize:16, margin:0 }}>{m.v}</p>
                      <p style={{ color:C.text4, fontSize:10, margin:'2px 0 0' }}>{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ════════════════ LİDERLİK TAB ════════════════ */}
      {activeTab === 'leaderboard' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ ...card, padding:22 }}>
            <h3 style={{ color:C.text1, fontSize:14, fontWeight:700, margin:'0 0 18px' }}>Bu Ay Liderlik Tablosu</h3>
            {leaderboard.map((m:any, i:number) => {
              const ri = roleInfo(m.role)
              const medalColors = ['#b45309','#64748b','#c2410c']
              const medalBgs    = ['#fffbeb','#f8fafc','#fff7ed']
              const medalBds    = ['#fde68a','#e2e8f0','#fed7aa']
              const medals = ['🥇','🥈','🥉']
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:i<leaderboard.length-1?`1px solid ${C.divider}`:'none' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:medalBgs[i]||C.inpBg, border:`1px solid ${medalBds[i]||C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {medals[i] || <span style={{ color:C.text3, fontSize:13, fontWeight:700 }}>#{i+1}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <p style={{ color:C.text1, fontWeight:700, fontSize:13, margin:0 }}>{m.name}</p>
                      <span style={{ background:ri.bg, border:`1px solid ${ri.bd}`, color:ri.color, fontSize:10, padding:'2px 7px', borderRadius:20 }}>{ri.label}</span>
                      {(m.badges||[]).map((b:string)=>(
                        <span key={b} style={{ background:C.warnBg, border:`1px solid ${C.warnBd}`, color:C.warn, fontSize:10, padding:'2px 6px', borderRadius:20 }}>{BADGE_DEFS[b]||b}</span>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:C.text3 }}>
                      <span>{m.wonCount} kapandı</span>
                      <span>%{m.convRate} dönüşüm</span>
                      {m.revenue>0 && <span style={{ color:C.success }}>₺{m.revenue.toLocaleString()}</span>}
                      {m.avgScore>0 && <span>Skor: {m.avgScore}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ color:medalColors[i]||C.text3, fontWeight:900, fontSize:22, margin:0 }}>{m.totalScore}</p>
                    <p style={{ color:C.text4, fontSize:10, margin:0 }}>toplam puan</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ ...card, padding:18 }}>
            <h3 style={{ color:C.text1, fontSize:13, fontWeight:700, margin:'0 0 12px' }}>Rozet Sistemi</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {Object.entries(BADGE_DEFS).map(([key, label])=>(
                <div key={key} style={{ background:C.warnBg, border:`1px solid ${C.warnBd}`, borderRadius:10, padding:'10px 12px' }}>
                  <p style={{ color:C.warn, fontSize:12, fontWeight:700, margin:0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ KPI TAB ════════════════ */}
      {activeTab === 'kpi' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={generateReport} disabled={generatingReport} style={{ ...btn(), padding:'9px 18px' }}>
              {generatingReport?<RefreshCw size={13} style={{ animation:'tm-spin 1s linear infinite' }}/>:<BarChart2 size={13}/>}
              Haftalık Rapor Oluştur
            </button>
          </div>

          {weeklyReport && (
            <div style={{ ...card, padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <h3 style={{ color:C.text1, fontSize:13, fontWeight:700, margin:0 }}>Haftalık Ekip Raporu</h3>
                <button onClick={()=>navigator.clipboard?.writeText(weeklyReport)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:C.cardBd, background:C.inpBg, color:C.text3, fontSize:11, cursor:'pointer' }}>
                  <Copy size={11} /> Kopyala
                </button>
              </div>
              <pre style={{ color:C.text2, fontSize:12, margin:0, whiteSpace:'pre-wrap', lineHeight:1.8, fontFamily:'inherit' }}>{weeklyReport}</pre>
            </div>
          )}

          {activity.map((a:any)=>{
            const m = members.find(mb=>mb.id===a.member.id) || a.member
            const ri = roleInfo(m.role)
            return (
              <div key={m.id} style={{ ...card, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.bd}`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:17, flexShrink:0 }}>
                    {m.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color:C.text1, fontWeight:700, fontSize:13, margin:0 }}>{m.name}</p>
                    <p style={{ color:C.text3, fontSize:11, margin:0 }}>{ri.label}</p>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div>
                    <p style={{ color:C.text3, fontSize:11, margin:'0 0 5px' }}>Aylık Lead Hedefi: {m.target_leads_monthly||30}</p>
                    <ProgressBar value={a.wonThisMonth||0} max={m.target_leads_monthly||30} color={C.success} />
                  </div>
                  <div>
                    <p style={{ color:C.text3, fontSize:11, margin:'0 0 5px' }}>Dönüşüm Hedefi: %{m.target_conversion_rate||25}</p>
                    <ProgressBar value={a.convRate||0} max={m.target_conversion_rate||25} color={C.violet} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ════════════════ KOÇLUK TAB ════════════════ */}
      {activeTab === 'coaching' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ padding:'12px 16px', background:C.violetBg, border:`1px solid ${C.violetBd}`, borderRadius:12 }}>
            <p style={{ color:C.violet, fontSize:12, margin:0 }}>
              <strong>AI Koçluk:</strong> WhatsApp konuşma analizine dayalı kişiselleştirilmiş koçluk mesajı üretir ve WA numarası tanımlıysa direkt iletir.
            </p>
          </div>
          {members.map(member=>{
            const ri  = roleInfo(member.role)
            const act = activity.find(a=>a.member.id===member.id)
            return (
              <div key={member.id} style={{ ...card, padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:coaching[member.id]?14:0 }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.bd}`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:18, flexShrink:0 }}>
                    {member.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:C.text1, fontWeight:700, fontSize:13, margin:'0 0 3px' }}>{member.name}</p>
                    <div style={{ display:'flex', gap:8, fontSize:11, color:C.text3, flexWrap:'wrap' }}>
                      <span>{ri.label}</span>
                      {act?.avgCoachingScore && <span style={{ color:scoreColor(act.avgCoachingScore) }}>Ort: {act.avgCoachingScore}/100</span>}
                      {member.wa_phone ? <span style={{ color:C.success }}>WA: {member.wa_phone}</span> : <span style={{ color:C.danger }}>WA numarası yok</span>}
                    </div>
                  </div>
                  <button onClick={()=>sendCoaching(member.id)} disabled={sendingCoaching===member.id}
                    style={{ ...btn(), flexShrink:0, cursor:sendingCoaching===member.id?'not-allowed':'pointer', opacity:sendingCoaching===member.id?0.8:1 }}>
                    {sendingCoaching===member.id?<RefreshCw size={12} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Send size={12}/>}
                    {sendingCoaching===member.id?'Hazırlanıyor...':'AI Koçluk Gönder'}
                  </button>
                </div>
                {coaching[member.id] && (
                  <div style={{ padding:'12px 14px', background:C.violetBg, border:`1px solid ${C.violetBd}`, borderRadius:10 }}>
                    <p style={{ color:C.violet, fontSize:11, fontWeight:700, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.8 }}>Oluşturulan Koçluk Mesajı</p>
                    <p style={{ color:C.text2, fontSize:12, margin:0, lineHeight:1.7 }}>{coaching[member.id]}</p>
                    <button onClick={()=>navigator.clipboard?.writeText(coaching[member.id])}
                      style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, padding:'4px 8px', borderRadius:6, border:C.cardBd, background:'#ffffff', color:C.text3, fontSize:10, cursor:'pointer' }}>
                      <Copy size={10} /> Kopyala
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ════════════════ ANALİTİK TAB ════════════════ */}
      {activeTab === 'analytics' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <select value={trendDays} onChange={e=>setTrendDays(Number(e.target.value))} style={{ ...inpSm, height:38, cursor:'pointer' }}>
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
            <select value={trendMember} onChange={e=>setTrendMember(e.target.value)} style={{ ...inpSm, height:38, cursor:'pointer' }}>
              <option value="">Tüm Ekip</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={loadAnalytics} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:`1px solid ${C.violetBd}`, background:C.violetBg, color:C.violet, fontSize:11, fontWeight:600, cursor:'pointer' }}>
              <RefreshCw size={12} style={{ animation:loadingAnalytics?'tm-spin 1s linear infinite':'none' }} /> Yenile
            </button>
            <button onClick={async()=>{ setSendingReport(true); try { await api.post('/api/ti-reports/send-weekly',{}); showMsg('success','Haftalık rapor gönderildi') } catch(e:any) { showMsg('error',e.message) } setSendingReport(false) }} disabled={sendingReport}
              style={{ ...btn(), marginLeft:'auto' }}>
              {sendingReport?<RefreshCw size={11} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Send size={11}/>}
              Haftalık Rapor Gönder
            </button>
          </div>

          {/* Trend Grafiği */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <h3 style={{ color:C.text1, fontSize:13, fontWeight:700, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={14} color={C.violet} /> Koçluk Skoru Trendi
            </h3>
            {loadingAnalytics ? (
              <div style={{ display:'flex', justifyContent:'center', height:120, alignItems:'center' }}><RefreshCw size={20} style={{ color:C.text4, animation:'tm-spin 1s linear infinite' }} /></div>
            ) : (() => {
              const points = (trend?.trend||[]).filter((p:any) => p.overall !== null)
              if (!points.length) return (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:120, color:C.text3, gap:8, flexDirection:'column' }}>
                  <BarChart2 size={24} color={C.text4} />
                  <p style={{ margin:0, fontSize:13 }}>Henüz analiz verisi yok — WhatsApp konuşmalarını analiz edin</p>
                </div>
              )
              const W=560, H=160, PAD=20
              const vals = points.map((p:any)=>p.overall)
              const minV = Math.max(0, Math.min(...vals)-10), maxV = Math.min(100, Math.max(...vals)+10)
              const range = maxV-minV||1
              const tx = (i:number) => PAD+(i/(points.length-1||1))*(W-PAD*2)
              const ty = (v:number) => H-PAD-((v-minV)/range)*(H-PAD*2)
              const path = points.map((p:any,i:number)=>`${i===0?'M':'L'}${tx(i).toFixed(1)},${ty(p.overall).toFixed(1)}`).join(' ')
              const benchY = ty(trend?.benchmarks?.overall||68)
              return (
                <div>
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:160 }}>
                    {[25,50,75].map(v=>{
                      const y=ty(Math.min(maxV,Math.max(minV,v))); if(y<PAD||y>H-PAD) return null
                      return <line key={v} x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="#f1f5f9" strokeWidth={1}/>
                    })}
                    {benchY>=PAD && benchY<=H-PAD && <>
                      <line x1={PAD} y1={benchY} x2={W-PAD} y2={benchY} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 4" opacity={0.7}/>
                      <text x={W-PAD+4} y={benchY+4} fill="#b45309" fontSize={9}>Ref</text>
                    </>}
                    <path d={path} fill="none" stroke={C.violet} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                    {points.map((p:any,i:number)=>(
                      <g key={i}>
                        <circle cx={tx(i)} cy={ty(p.overall)} r={4} fill={C.violet} stroke="#ffffff" strokeWidth={2}/>
                        <text x={tx(i)} y={ty(p.overall)-10} textAnchor="middle" fill="#6d28d9" fontSize={9} fontWeight="700">{p.overall}</text>
                      </g>
                    ))}
                  </svg>
                  <div style={{ display:'flex', gap:16, marginTop:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:12, height:3, borderRadius:2, background:C.violet }}/><span style={{ color:C.text3, fontSize:10 }}>Genel Skor</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:12, height:0, borderTop:'2px dashed #f59e0b' }}/><span style={{ color:C.text3, fontSize:10 }}>Benchmark</span></div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Benchmark */}
          {benchmark && (
            <div style={{ ...card, padding:'18px 20px' }}>
              <h3 style={{ color:C.text1, fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Sektör Benchmark Karşılaştırması</h3>
              {benchmark.total_analyses === 0 ? (
                <p style={{ color:C.text3, fontSize:13 }}>Henüz analiz yok — WhatsApp konuşmalarını analiz ettikten sonra sektör karşılaştırması görünür</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(benchmark.comparison||[]).map((c:any) => {
                    const labels: Record<string,string> = { overall:'Genel Skor', professionalism:'Profesyonellik', sales_technique:'Satış Tekniği', empathy:'Empati', closing:'Kapanış' }
                    return (
                      <div key={c.metric} style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <span style={{ color:C.text3, fontSize:12, width:130, flexShrink:0 }}>{labels[c.metric]||c.metric}</span>
                        <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, position:'relative' }}>
                          <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${c.user}%`, background:scoreColor(c.user), borderRadius:3 }} />
                          <div style={{ position:'absolute', top:-3, left:`${c.benchmark}%`, width:2, height:12, background:'#f59e0b', borderRadius:1 }} title={`Benchmark: ${c.benchmark}`} />
                        </div>
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <span style={{ color:scoreColor(c.user), fontWeight:700, fontSize:12, width:30, textAlign:'right' }}>{c.user}</span>
                          <span style={{ color:c.status==='above'?C.success:C.danger, fontSize:10, padding:'1px 6px', borderRadius:20, background:c.status==='above'?C.sucBg:C.danBg, border:`1px solid ${c.status==='above'?C.sucBd:C.danBd}` }}>
                            {c.diff >= 0 ? '+' : ''}{c.diff}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop:6, padding:'8px 12px', background:C.warnBg, border:`1px solid ${C.warnBd}`, borderRadius:9 }}>
                    <span style={{ color:C.warn, fontSize:11 }}>{benchmark.total_analyses} konuşma analiz edildi · Sarı çizgi = sektör ortalaması</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rapor Ayarları */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <h3 style={{ color:C.text1, fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Rapor Ayarları</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                <div onClick={()=>setReportSettings(p=>({...p,weekly_enabled:!p.weekly_enabled}))}
                  style={{ width:38, height:20, borderRadius:10, background:reportSettings.weekly_enabled?C.violet:'#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left:reportSettings.weekly_enabled?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <p style={{ color:C.text1, fontSize:13, margin:0 }}>Haftalık otomatik rapor</p>
                  <p style={{ color:C.text3, fontSize:11, margin:0 }}>Her Pazartesi email ile gönderilir</p>
                </div>
              </label>
              <div>
                <label style={{ color:C.text3, fontSize:11, display:'block', marginBottom:5 }}>Uyarı Eşiği: {reportSettings.alert_threshold}/100 altındaki skorlar için uyarı</label>
                <input type="range" min={20} max={80} value={reportSettings.alert_threshold} onChange={e=>setReportSettings(p=>({...p,alert_threshold:Number(e.target.value)}))} style={{ width:'100%', accentColor:C.violet }} />
              </div>
              <button onClick={async()=>{ try { await api.patch('/api/ti-reports/settings',reportSettings); showMsg('success','Ayarlar kaydedildi') } catch(e:any) { showMsg('error',e.message) } }}
                style={{ ...btn(), width:'fit-content' }}>
                Ayarları Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MEMBER DETAIL MODAL ════════════════ */}
      {selectedMember && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelectedMember(null) }}>
          <div style={{ background:'#ffffff', border:`1px solid ${C.violetBd}`, borderRadius:20, padding:28, width:520, maxWidth:'94vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:50, height:50, borderRadius:'50%', background:roleInfo(selectedMember.role).bg, border:`2px solid ${roleInfo(selectedMember.role).bd}`, display:'flex', alignItems:'center', justifyContent:'center', color:roleInfo(selectedMember.role).color, fontWeight:900, fontSize:20 }}>
                  {selectedMember.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 style={{ color:C.text1, fontSize:16, fontWeight:800, margin:0 }}>{selectedMember.name}</h2>
                  <p style={{ color:C.text3, fontSize:12, margin:'3px 0 0' }}>{selectedMember.email}</p>
                </div>
              </div>
              <button onClick={()=>setSelectedMember(null)} style={{ background:C.hover, border:C.cardBd, borderRadius:8, padding:'6px', cursor:'pointer', display:'flex', alignItems:'center', color:C.text3 }}><X size={16}/></button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:6 }}>Rol</label>
                <select defaultValue={selectedMember.role}
                  onChange={async e=>{ await api.patch(`/api/team/members/${selectedMember.id}`, { role:e.target.value }); loadAll(); setSelectedMember((p:any)=>({...p,role:e.target.value})) }}
                  style={{ width:'100%', ...inp, fontSize:13, cursor:'pointer' }}>
                  {ROLES.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:6 }}>WhatsApp Numarası</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input defaultValue={selectedMember.wa_phone||''} id="wa-phone-edit" placeholder="905551234567"
                    style={{ flex:1, ...inp, fontSize:13 }} />
                  <button onClick={async()=>{ const el=document.getElementById('wa-phone-edit') as HTMLInputElement; await api.patch(`/api/team/members/${selectedMember.id}`, { wa_phone:el.value }); showMsg('success','Kaydedildi'); loadAll() }}
                    style={{ padding:'10px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <Save size={13}/>
                  </button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:6 }}>Aylık Lead Hedefi</label>
                  <input type="number" defaultValue={selectedMember.target_leads_monthly||30} id="target-leads"
                    style={{ width:'100%', ...inp, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ color:C.text3, fontSize:11, fontWeight:600, display:'block', marginBottom:6 }}>Dönüşüm Hedefi (%)</label>
                  <input type="number" defaultValue={selectedMember.target_conversion_rate||25} id="target-conv"
                    style={{ width:'100%', ...inp, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
              </div>
              <button onClick={async()=>{
                const tl=(document.getElementById('target-leads') as HTMLInputElement)?.value
                const tc=(document.getElementById('target-conv') as HTMLInputElement)?.value
                await api.patch(`/api/team/members/${selectedMember.id}`, { target_leads_monthly:Number(tl), target_conversion_rate:Number(tc) })
                showMsg('success','Hedefler güncellendi'); loadAll()
              }} style={{ padding:'10px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 12px rgba(124,58,237,0.25)' }}>
                Değişiklikleri Kaydet
              </button>
              <button onClick={()=>{ router.push('/team'); setSelectedMember(null) }}
                style={{ padding:'10px', borderRadius:11, border:`1px solid ${C.violetBd}`, background:C.violetBg, color:C.violet, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Tam Detay ve Analiz Sayfası
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
