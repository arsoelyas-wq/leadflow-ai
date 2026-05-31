'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Users, Plus, RefreshCw, Trash2, CheckCircle, Target, MessageSquare, BarChart2, ArrowLeft, Save, Activity, Shield, Edit2, X, Star, Trophy, Zap, TrendingUp, Phone, ChevronRight, Send, Award, AlertTriangle, Copy } from 'lucide-react'

// ── TEAM ORB — orbiting member nodes ─────────────────────────────────────────
function TeamOrb({ size = 110, members = [], scanning = false }: { size?: number; members?: any[]; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
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
  const statusColors: Record<string, string> = { online:'#10b981', break:'#f59e0b', offline:'#475569' }

  const orbNodes = members.slice(0, 6).map((m, i) => {
    const a = (i * (360 / Math.max(members.length, 1)) + rot) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.74, y: cx + Math.sin(a) * s * 0.74, m }
  })

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`toGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" /><stop offset="100%" stopColor="rgba(139,92,246,0.16)" />
          </radialGradient>
          <radialGradient id={`toHub${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" /><stop offset="35%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#toGlow${s})`} />
        {[0.56, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(139,92,246,0.09)" strokeWidth={0.8}
            strokeDasharray="5 8" style={{ animation:`to-ring ${9+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin:`${cx}px ${cx}px` }} />
        ))}
        {orbNodes.map((node, i) => (
          <g key={i}>
            <line x1={cx} y1={cx} x2={node.x} y2={node.y} stroke={`${roleColors[node.m.role]||'#8b5cf6'}22`} strokeWidth={0.8} strokeDasharray="3 5" />
            <circle cx={node.x} cy={node.y} r={16} fill={`${roleColors[node.m.role]||'#8b5cf6'}22`} stroke={`${roleColors[node.m.role]||'#8b5cf6'}55`} strokeWidth={1.5}
              style={{ filter:`drop-shadow(0 0 5px ${roleColors[node.m.role]||'#8b5cf6'}66)` }} />
            <text x={node.x} y={node.y} fill="white" fontSize={9} textAnchor="middle" dominantBaseline="middle" fontWeight="800">
              {node.m.name?.charAt(0)?.toUpperCase()}
            </text>
            <circle cx={node.x + 10} cy={node.y - 10} r={4} fill={statusColors[node.m.status||'offline']}
              style={{ filter:`drop-shadow(0 0 3px ${statusColors[node.m.status||'offline']})` }} />
          </g>
        ))}
        <circle cx={cx} cy={cx} r={s * 0.38} fill={`url(#toHub${s})`} style={{ filter:'drop-shadow(0 0 16px #7c3aed99)' }} />
        <text x={cx} y={cx} fill="white" fontSize={s * 0.15} textAnchor="middle" dominantBaseline="middle" fontWeight="900">👥</text>
      </svg>
      <style>{`@keyframes to-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes tm-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const ROLES = [
  { key:'admin',    label:'Yönetici',         color:'#ef4444', bg:'rgba(239,68,68,0.1)'   },
  { key:'manager',  label:'Müdür',             color:'#8b5cf6', bg:'rgba(139,92,246,0.1)' },
  { key:'sales',    label:'Satış Temsilcisi',  color:'#3b82f6', bg:'rgba(59,130,246,0.1)'  },
  { key:'support',  label:'Destek',            color:'#10b981', bg:'rgba(16,185,129,0.1)'  },
  { key:'readonly', label:'Görüntüleyici',     color:'#64748b', bg:'rgba(100,116,139,0.1)' },
]
const BADGE_DEFS: Record<string, string> = {
  top_seller:'🏆 En İyi Satıcı', speed_master:'⚡ Hız Ustası', streak_7:'🔥 7 Günlük Seri',
  closer:'🎯 Kapanış Ustası', coach_star:'⭐ Koçluk Yıldızı', consistent:'💪 Tutarlı',
}
const STATUS = [
  { key:'online', label:'Çevrimiçi', color:'#10b981' },
  { key:'break',  label:'Mola',      color:'#f59e0b' },
  { key:'offline',label:'Çevrimdışı',color:'#475569' },
]

function roleInfo(key: string) { return ROLES.find(r => r.key === key) || ROLES[2] }
function scoreColor(s: number) { return s>=80?'#10b981':s>=60?'#f59e0b':s>=40?'#f97316':'#ef4444' }

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size*0.38, c = size*0.5, circ = 2*Math.PI*r
  const dash = circ * (score/100)
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
        style={{ filter:`drop-shadow(0 0 4px ${scoreColor(score)}88)` }} />
      <text x={c} y={c} fill={scoreColor(score)} fontSize={size*0.22} textAnchor="middle" dominantBaseline="middle" fontWeight="900">{score}</text>
    </svg>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value/max)*100)) : 0
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:'#64748b', fontSize:10 }}>{value}/{max}</span>
        <span style={{ color, fontSize:10, fontWeight:700 }}>%{pct}</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, boxShadow:`0 0 6px ${color}60`, transition:'width 0.6s' }} />
      </div>
    </div>
  )
}

// ── ADD MEMBER MODAL ──────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onAdded }: { onClose:()=>void; onAdded:()=>void }) {
  const [form, setForm] = useState({ name:'', email:'', role:'sales', password:'', wa_phone:'', target_leads_monthly:30, target_conversion_rate:25 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inp = { width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const }

  const submit = async () => {
    if (!form.name || !form.email || !form.role) { setError('Ad, email, rol zorunlu'); return }
    setSaving(true); setError('')
    try { await api.post('/api/team/members', form); onAdded(); onClose() }
    catch(e:any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'linear-gradient(135deg,#0a0c14,#0d1120)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:22, padding:30, width:480, maxWidth:'94vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>👥 Yeni Ekip Üyesi</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer' }}><X size={18}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Ad Soyad *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} /></div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Email *</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Rol *</label>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{ ...inp, height:44, cursor:'pointer' }}>
                {ROLES.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Şifre</label><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="LeadFlow2024!" style={inp} /></div>
          </div>
          <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>WhatsApp Numarası (bildirim için)</label><input value={form.wa_phone} onChange={e=>setForm(p=>({...p,wa_phone:e.target.value}))} placeholder="905551234567" style={inp} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Aylık Lead Hedefi</label><input type="number" value={form.target_leads_monthly} onChange={e=>setForm(p=>({...p,target_leads_monthly:Number(e.target.value)}))} style={inp} /></div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Dönüşüm Hedefi (%)</label><input type="number" value={form.target_conversion_rate} onChange={e=>setForm(p=>({...p,target_conversion_rate:Number(e.target.value)}))} style={inp} /></div>
          </div>
          {error && <p style={{ color:'#f87171', fontSize:12, background:'rgba(239,68,68,0.1)', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>}
          <button onClick={submit} disabled={saving}
            style={{ padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 18px rgba(124,58,237,0.35)' }}>
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
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loadBalance, setLoadBalance] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'team'|'activity'|'leaderboard'|'kpi'|'coaching'|'analytics'>('team')
  const [trend, setTrend] = useState<any>(null)
  const [benchmark, setBenchmark] = useState<any>(null)
  const [trendDays, setTrendDays] = useState(30)
  const [trendMember, setTrendMember] = useState('')
  const [reportSettings, setReportSettings] = useState({ weekly_enabled:true, alert_threshold:50 })
  const [sendingReport, setSendingReport] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [coaching, setCoaching] = useState<Record<string,string>>({})
  const [sendingCoaching, setSendingCoaching] = useState<string|null>(null)
  const [weeklyReport, setWeeklyReport] = useState<string|null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [transferForm, setTransferForm] = useState({ from:'', to:'' })

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
    const [t, b, s] = await Promise.allSettled([
      api.get(`/api/ti-reports/trend?${params}`),
      api.get('/api/ti-reports/benchmark'),
      api.get('/api/ti-reports/settings'),
    ])
    if (t.status==='fulfilled') setTrend(t.value)
    if (b.status==='fulfilled') setBenchmark(b.value)
    if (s.status==='fulfilled') { const d = s.value as any; setReportSettings(d.settings||d) }
    setLoadingAnalytics(false)
  }, [trendDays, trendMember])

  useEffect(() => { if (activeTab==='analytics') loadAnalytics() }, [activeTab, loadAnalytics])

  const deleteMember = async (id:string) => {
    if (!confirm('Üye silinsin mi?')) return
    await api.delete(`/api/team/members/${id}`)
    setMembers(p=>p.filter(m=>m.id!==id))
  }

  const toggleActive = async (id:string, active:boolean) => {
    await api.patch(`/api/team/members/${id}`, { active: !active })
    setMembers(p=>p.map(m=>m.id===id?{...m,active:!active}:m))
  }

  const autoAssign = async () => {
    if (!selectedLeads.length) return showMsg('error','Lead seçin')
    setAutoAssigning(true)
    try {
      const d:any = await api.post('/api/team/auto-assign', { leadIds: selectedLeads, rule:'round_robin' })
      showMsg('success', d.message)
      setSelectedLeads([]); loadAll()
    } catch(e:any) { showMsg('error', e.message) }
    setAutoAssigning(false)
  }

  const bulkTransfer = async () => {
    if (!transferForm.from || !transferForm.to) return showMsg('error','İki üye seçin')
    try {
      const d:any = await api.post('/api/team/bulk-transfer', { fromMemberId: transferForm.from, toMemberId: transferForm.to })
      showMsg('success', d.message); loadAll()
    } catch(e:any) { showMsg('error', e.message) }
  }

  const sendCoaching = async (memberId:string) => {
    setSendingCoaching(memberId)
    try {
      const d:any = await api.post('/api/team/send-coaching', { memberId })
      setCoaching(prev=>({...prev,[memberId]:d.message}))
      showMsg('success', d.sent?'Koçluk mesajı WhatsApp\'tan gönderildi':'Mesaj oluşturuldu (WA numarası yok)')
    } catch(e:any) { showMsg('error', e.message) }
    setSendingCoaching(null)
  }

  const generateReport = async () => {
    setGeneratingReport(true)
    try {
      const d:any = await api.post('/api/team/weekly-report', {})
      setWeeklyReport(d.report)
    } catch(e:any) { showMsg('error', e.message) }
    setGeneratingReport(false)
  }

  const card = { background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16 } as const
  const inp = { background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'8px 12px', color:'#fff', fontSize:12, outline:'none' }

  return (
    <div style={{ padding:0, display:'flex', flexDirection:'column', gap:0 }}>
      {showAdd && <AddMemberModal onClose={()=>setShowAdd(false)} onAdded={()=>{ loadAll(); setShowAdd(false) }} />}

      {/* HERO */}
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(8,3,22,0.98),rgba(3,8,22,0.99))', borderRadius:20, padding:'28px 28px', marginBottom:20, border:'1px solid rgba(139,92,246,0.2)', flexShrink:0 }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(139,92,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.02) 1px,transparent 1px)', backgroundSize:'40px 40px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:22 }}>
          <TeamOrb size={86} members={members} scanning={loading} />
          <div style={{ flex:1 }}>
            <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:'0 0 5px' }}>Ekip Yönetimi</h1>
            <p style={{ color:'#64748b', fontSize:13, margin:'0 0 16px' }}>Ekibi yönet · Otomatik lead dağıt · AI koçluk · Performans takibi · Liderlik tablosu</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
              {[
                { l:'Toplam Üye', v:stats?.total||0, c:'#94a3b8' },
                { l:'Aktif',      v:stats?.active||0, c:'#10b981' },
                { l:'Çevrimiçi', v:stats?.online||0, c:'#34d399' },
                { l:'Bekleyen Lead', v:leads.length, c:'#f59e0b' },
                { l:'Yük Uyarısı',  v:loadBalance?.warnings?.length||0, c:loadBalance?.warnings?.length?'#ef4444':'#64748b' },
              ].map(m=>(
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:18, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#334155', fontSize:10, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <button onClick={()=>setShowAdd(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(124,58,237,0.35)' }}>
              <Plus size={14} /> Üye Ekle
            </button>
            <button onClick={loadAll}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'#64748b', fontSize:12, cursor:'pointer' }}>
              <RefreshCw size={12} style={{ animation:loading?'tm-spin 1s linear infinite':'none' }} /> Yenile
            </button>
          </div>
        </div>
      </div>

      {msg && <div style={{ marginBottom:12, padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.28)':'rgba(239,68,68,0.28)'}`, borderRadius:10, flexShrink:0 }}>
        <p style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, margin:0 }}>{msg.text}</p>
      </div>}

      {/* TABS */}
      <div style={{ display:'flex', gap:3, background:'rgba(0,0,0,0.32)', padding:4, borderRadius:12, width:'fit-content', marginBottom:18, border:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        {[{id:'team',label:'👥 Ekip'},{id:'activity',label:'⚡ Aktivite'},{id:'leaderboard',label:'🏆 Liderlik'},{id:'kpi',label:'🎯 KPI'},{id:'coaching',label:'🎓 Koçluk'},{id:'analytics',label:'📈 Analitik'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id as any)}
            style={{ padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===t.id?'linear-gradient(135deg,#4c1d95,#7c3aed)':'transparent', color:activeTab===t.id?'#fff':'#64748b', boxShadow:activeTab===t.id?'0 3px 12px rgba(124,58,237,0.28)':'none', whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── EKİP TAB ── */}
      {activeTab === 'team' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          {/* Yük dengesizliği uyarısı */}
          {loadBalance?.warnings?.length > 0 && (
            <div style={{ padding:'12px 18px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12 }}>
              <p style={{ color:'#f87171', fontSize:12, fontWeight:700, margin:'0 0 4px' }}>⚠️ Yük Dengesizliği Tespit Edildi</p>
              {loadBalance.warnings.map((w:any,i:number) => <p key={i} style={{ color:'#94a3b8', fontSize:11, margin:0 }}>{w.warning}</p>)}
            </div>
          )}

          {/* Hızlı lead atama */}
          <div style={{ ...card, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ color:'#64748b', fontSize:12, fontWeight:600 }}>📋 {leads.length} bekleyen lead</span>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {leads.slice(0,6).map(l=>(
                  <button key={l.id} onClick={()=>setSelectedLeads(p=>p.includes(l.id)?p.filter(x=>x!==l.id):[...p,l.id])}
                    style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${selectedLeads.includes(l.id)?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.08)'}`, background:selectedLeads.includes(l.id)?'rgba(124,58,237,0.15)':'transparent', color:selectedLeads.includes(l.id)?'#a78bfa':'#64748b', fontSize:11, cursor:'pointer' }}>
                    {l.company_name?.substring(0,20)}
                  </button>
                ))}
                {leads.length > 6 && <span style={{ color:'#334155', fontSize:11 }}>+{leads.length-6} daha</span>}
              </div>
              {selectedLeads.length > 0 && (
                <button onClick={autoAssign} disabled={autoAssigning}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', marginLeft:'auto' }}>
                  {autoAssigning?<RefreshCw size={11} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Zap size={11}/>}
                  {selectedLeads.length} Lead Otomatik Dağıt
                </button>
              )}
            </div>
          </div>

          {/* Member cards */}
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'#475569' }}><RefreshCw size={22} style={{ animation:'tm-spin 1s linear infinite', display:'block', margin:'0 auto 10px' }} /></div>
          ) : members.length === 0 ? (
            <div style={{ ...card, padding:52, textAlign:'center' }}>
              <Users size={36} color="#334155" style={{ margin:'0 auto 14px', display:'block' }} />
              <h3 style={{ color:'#fff', fontSize:16, fontWeight:700, margin:'0 0 8px' }}>Ekip yok</h3>
              <p style={{ color:'#475569', fontSize:13, margin:'0 0 20px' }}>İlk ekip üyenizi ekleyin</p>
              <button onClick={()=>setShowAdd(true)} style={{ padding:'10px 22px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                <Plus size={14} style={{ display:'inline', marginRight:6 }} /> Üye Ekle
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {members.map(member => {
                const ri = roleInfo(member.role)
                const act = activity.find(a=>a.member.id===member.role)
                const st = STATUS.find(s=>s.key===(member.status||'offline'))
                return (
                  <div key={member.id} style={{ ...card, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      {/* Avatar */}
                      <div style={{ width:48, height:48, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.color}40`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:20, flexShrink:0, position:'relative' }}>
                        {member.name?.charAt(0)?.toUpperCase()}
                        <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderRadius:'50%', background:st?.color||'#475569', border:'2px solid rgba(3,8,22,0.97)', boxShadow:`0 0 6px ${st?.color||'#475569'}` }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>{member.name}</p>
                          <span style={{ background:ri.bg, border:`1px solid ${ri.color}30`, color:ri.color, fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{ri.label}</span>
                          <span style={{ background:`${st?.color||'#475569'}15`, color:st?.color||'#475569', fontSize:10, padding:'2px 7px', borderRadius:20 }}>● {st?.label||'Çevrimdışı'}</span>
                          {!member.active && <span style={{ background:'rgba(239,68,68,0.12)', color:'#f87171', fontSize:10, padding:'2px 7px', borderRadius:20 }}>Pasif</span>}
                          {(member.badges||[]).slice(0,2).map((b:string)=>(
                            <span key={b} style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24', fontSize:9, padding:'2px 6px', borderRadius:20 }}>{BADGE_DEFS[b]||b}</span>
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569' }}>
                          <span>{member.email}</span>
                          {member.wa_phone && <span style={{ color:'#10b981' }}>📞 {member.wa_phone}</span>}
                          {member.leads_count > 0 && <span>📋 {member.leads_count} lead</span>}
                          {member.last_login && <span>Son giriş: {new Date(member.last_login).toLocaleDateString('tr-TR')}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button onClick={()=>setSelectedMember(member)}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'1px solid rgba(139,92,246,0.3)', background:'rgba(139,92,246,0.08)', color:'#a78bfa', fontSize:11, cursor:'pointer' }}>
                          <ChevronRight size={13} /> Detay
                        </button>
                        <button onClick={()=>toggleActive(member.id, member.active)}
                          style={{ padding:'7px 10px', borderRadius:9, border:`1px solid ${member.active?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.2)'}`, background:'transparent', color:member.active?'#34d399':'#f87171', cursor:'pointer' }}>
                          <CheckCircle size={13} />
                        </button>
                        <button onClick={()=>deleteMember(member.id)}
                          style={{ padding:'7px 10px', borderRadius:9, border:'1px solid rgba(239,68,68,0.2)', background:'transparent', color:'#f87171', cursor:'pointer' }}>
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
            <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>🔄 Lead Toplu Transfer</h3>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <select value={transferForm.from} onChange={e=>setTransferForm(p=>({...p,from:e.target.value}))} style={{ ...inp, height:38, flex:1 }}>
                <option value="">Kimden?</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span style={{ color:'#64748b', fontSize:14 }}>→</span>
              <select value={transferForm.to} onChange={e=>setTransferForm(p=>({...p,to:e.target.value}))} style={{ ...inp, height:38, flex:1 }}>
                <option value="">Kime?</option>
                {members.filter(m=>m.id!==transferForm.from).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={bulkTransfer} disabled={!transferForm.from||!transferForm.to}
                style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0, opacity:!transferForm.from||!transferForm.to?0.5:1 }}>
                Transfer Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AKTİVİTE TAB ── */}
      {activeTab === 'activity' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
          {activity.length === 0 ? (
            <div style={{ ...card, padding:40, textAlign:'center', color:'#475569' }}>
              <Activity size={28} style={{ margin:'0 auto 12px', display:'block', color:'#334155' }} />
              <p style={{ fontSize:13, margin:0 }}>Aktivite verisi yok</p>
            </div>
          ) : activity.map((a:any) => {
            const ri = roleInfo(a.member.role)
            return (
              <div key={a.member.id} style={{ ...card, padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.color}40`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:18, flexShrink:0 }}>
                    {a.member.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:'0 0 3px' }}>{a.member.name}</p>
                    <p style={{ color:'#475569', fontSize:11, margin:0 }}>{ri.label}</p>
                  </div>
                  {a.avgCoachingScore && <div style={{ textAlign:'right' }}>
                    <p style={{ color:scoreColor(a.avgCoachingScore), fontWeight:800, fontSize:18, margin:0 }}>{a.avgCoachingScore}</p>
                    <p style={{ color:'#334155', fontSize:10, margin:0 }}>Ort. Skor</p>
                  </div>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {[
                    { l:'Haftalık Mesaj', v:a.weeklyMessages, c:'#06b6d4' },
                    { l:'Aktif Lead', v:a.activeLeads, c:'#f59e0b' },
                    { l:'Bu Ay Kapandı', v:a.wonThisMonth, c:'#10b981' },
                    { l:'Dönüşüm %', v:`%${a.convRate||0}`, c:'#8b5cf6' },
                  ].map(m=>(
                    <div key={m.l} style={{ background:`${m.c}08`, border:`1px solid ${m.c}18`, borderRadius:10, padding:'10px', textAlign:'center' }}>
                      <p style={{ color:m.c, fontWeight:800, fontSize:16, margin:0 }}>{m.v}</p>
                      <p style={{ color:'#475569', fontSize:10, margin:'2px 0 0' }}>{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LİDERLİK TAB ── */}
      {activeTab === 'leaderboard' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          <div style={{ ...card, padding:22 }}>
            <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 18px' }}>🏆 Bu Ay Liderlik Tablosu</h3>
            {leaderboard.map((m:any, i:number) => {
              const ri = roleInfo(m.role)
              const medalColors = ['#f59e0b','#94a3b8','#f97316']
              const medals = ['🥇','🥈','🥉']
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:i<leaderboard.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${medalColors[i]||'#334155'}18`, border:`1px solid ${medalColors[i]||'#334155'}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {medals[i] || `#${i+1}`}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0 }}>{m.name}</p>
                      <span style={{ background:ri.bg, color:ri.color, fontSize:10, padding:'2px 7px', borderRadius:20 }}>{ri.label}</span>
                      {(m.badges||[]).map((b:string)=>(
                        <span key={b} style={{ background:'rgba(245,158,11,0.1)', color:'#fbbf24', fontSize:9, padding:'2px 6px', borderRadius:20 }}>{BADGE_DEFS[b]||b}</span>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569' }}>
                      <span>🏆 {m.wonCount} kapandı</span>
                      <span>📊 %{m.convRate} dönüşüm</span>
                      {m.revenue>0 && <span style={{ color:'#10b981' }}>💰 ₺{m.revenue.toLocaleString('tr-TR')}</span>}
                      {m.avgScore>0 && <span>⭐ Skor: {m.avgScore}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ color:medalColors[i]||'#64748b', fontWeight:900, fontSize:22, margin:0 }}>{m.totalScore}</p>
                    <p style={{ color:'#334155', fontSize:10, margin:0 }}>toplam puan</p>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Rozet tanımları */}
          <div style={{ ...card, padding:18 }}>
            <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>🎖️ Rozet Sistemi</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {Object.entries(BADGE_DEFS).map(([key, label])=>(
                <div key={key} style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, padding:'10px 12px' }}>
                  <p style={{ color:'#fbbf24', fontSize:12, fontWeight:700, margin:0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI TAB ── */}
      {activeTab === 'kpi' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          <div style={{ display:'flex', gap:12, marginBottom:4 }}>
            <button onClick={generateReport} disabled={generatingReport}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              {generatingReport?<RefreshCw size={13} style={{ animation:'tm-spin 1s linear infinite' }}/>:<BarChart2 size={13}/>}
              Haftalık Rapor Oluştur
            </button>
          </div>

          {weeklyReport && (
            <div style={{ ...card, padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:0 }}>📊 Haftalık Ekip Raporu</h3>
                <button onClick={()=>navigator.clipboard?.writeText(weeklyReport)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', fontSize:11, cursor:'pointer' }}>
                  <Copy size={11} /> Kopyala
                </button>
              </div>
              <pre style={{ color:'#e2e8f0', fontSize:12, margin:0, whiteSpace:'pre-wrap', lineHeight:1.8, fontFamily:'inherit' }}>{weeklyReport}</pre>
            </div>
          )}

          {activity.map((a:any)=>{
            const m = members.find(mb=>mb.id===a.member.id) || a.member
            const ri = roleInfo(m.role)
            return (
              <div key={m.id} style={{ ...card, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.color}40`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:17, flexShrink:0 }}>
                    {m.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0 }}>{m.name}</p>
                    <p style={{ color:'#64748b', fontSize:11, margin:0 }}>{ri.label}</p>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div>
                    <p style={{ color:'#64748b', fontSize:11, margin:'0 0 5px' }}>Aylık Lead Hedefi: {m.target_leads_monthly||30}</p>
                    <ProgressBar value={a.wonThisMonth||0} max={m.target_leads_monthly||30} color="#10b981" />
                  </div>
                  <div>
                    <p style={{ color:'#64748b', fontSize:11, margin:'0 0 5px' }}>Dönüşüm Hedefi: %{m.target_conversion_rate||25}</p>
                    <ProgressBar value={a.convRate||0} max={m.target_conversion_rate||25} color="#8b5cf6" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── KOÇLUK TAB ── */}
      {activeTab === 'coaching' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
          <div style={{ ...card, padding:'14px 18px', marginBottom:4 }}>
            <p style={{ color:'#a78bfa', fontSize:12, margin:0 }}>
              🎓 <strong>AI Koçluk:</strong> WhatsApp konuşma analizine dayalı kişiselleştirilmiş koçluk mesajı üretir ve WA numarası tanımlıysa direkt iletir.
            </p>
          </div>
          {members.map(member=>{
            const ri = roleInfo(member.role)
            const act = activity.find(a=>a.member.id===member.id)
            return (
              <div key={member.id} style={{ ...card, padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:coaching[member.id]?14:0 }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:ri.bg, border:`2px solid ${ri.color}40`, display:'flex', alignItems:'center', justifyContent:'center', color:ri.color, fontWeight:900, fontSize:18, flexShrink:0 }}>
                    {member.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:'0 0 3px' }}>{member.name}</p>
                    <div style={{ display:'flex', gap:8, fontSize:11, color:'#475569' }}>
                      <span>{ri.label}</span>
                      {act?.avgCoachingScore && <span style={{ color:scoreColor(act.avgCoachingScore) }}>⭐ Ort: {act.avgCoachingScore}/100</span>}
                      {member.wa_phone ? <span style={{ color:'#10b981' }}>✅ WA: {member.wa_phone}</span> : <span style={{ color:'#f87171' }}>❌ WA numarası yok</span>}
                    </div>
                  </div>
                  <button onClick={()=>sendCoaching(member.id)} disabled={sendingCoaching===member.id}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:11, fontWeight:700, cursor:sendingCoaching===member.id?'not-allowed':'pointer', flexShrink:0 }}>
                    {sendingCoaching===member.id?<RefreshCw size={12} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Send size={12}/>}
                    {sendingCoaching===member.id?'Hazırlanıyor...':'AI Koçluk Gönder'}
                  </button>
                </div>
                {coaching[member.id] && (
                  <div style={{ padding:'12px 14px', background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:10 }}>
                    <p style={{ color:'#c4b5fd', fontSize:11, fontWeight:700, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:1 }}>Oluşturulan Koçluk Mesajı</p>
                    <p style={{ color:'#e2e8f0', fontSize:12, margin:0, lineHeight:1.7 }}>{coaching[member.id]}</p>
                    <button onClick={()=>navigator.clipboard?.writeText(coaching[member.id])}
                      style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, padding:'4px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,0.07)', background:'transparent', color:'#64748b', fontSize:10, cursor:'pointer' }}>
                      <Copy size={10} /> Kopyala
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── ANALİTİK TAB ── */}
      {activeTab === 'analytics' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          {/* Filtreler */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
            <select value={trendDays} onChange={e=>setTrendDays(Number(e.target.value))} style={{ ...inp, height:38 }}>
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
            <select value={trendMember} onChange={e=>setTrendMember(e.target.value)} style={{ ...inp, height:38 }}>
              <option value="">Tüm Ekip</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={loadAnalytics} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'1px solid rgba(139,92,246,0.3)', background:'rgba(139,92,246,0.08)', color:'#a78bfa', fontSize:11, fontWeight:600, cursor:'pointer' }}>
              <RefreshCw size={12} style={{ animation:loadingAnalytics?'tm-spin 1s linear infinite':'none' }} /> Yenile
            </button>
            <button onClick={async()=>{ setSendingReport(true); try { await api.post('/api/ti-reports/send-weekly',{}); showMsg('success','Haftalık rapor gönderildi') } catch(e:any) { showMsg('error',e.message) } setSendingReport(false) }} disabled={sendingReport}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', marginLeft:'auto' }}>
              {sendingReport?<RefreshCw size={11} style={{ animation:'tm-spin 1s linear infinite' }}/>:<Send size={11}/>}
              Haftalık Rapor Gönder
            </button>
          </div>

          {/* Trend Grafiği */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={14} color="#8b5cf6" /> Koçluk Skoru Trendi
            </h3>
            {loadingAnalytics ? (
              <div style={{ display:'flex', justifyContent:'center', height:120, alignItems:'center' }}><RefreshCw size={20} style={{ color:'#475569', animation:'tm-spin 1s linear infinite' }} /></div>
            ) : (() => {
              const points = (trend?.trend||[]).filter((p:any) => p.overall !== null)
              if (!points.length) return (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:120, color:'#334155', gap:8 }}>
                  <BarChart2 size={24} /> Henüz analiz verisi yok — WhatsApp konuşmalarını analiz edin
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
                      return <line key={v} x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>
                    })}
                    {benchY>=PAD && benchY<=H-PAD && <>
                      <line x1={PAD} y1={benchY} x2={W-PAD} y2={benchY} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 4" opacity={0.5}/>
                      <text x={W-PAD+4} y={benchY+4} fill="#f59e0b" fontSize={9}>Ref</text>
                    </>}
                    <path d={path} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ filter:'drop-shadow(0 0 4px #8b5cf680)' }}/>
                    {points.map((p:any,i:number)=>(
                      <g key={i}>
                        <circle cx={tx(i)} cy={ty(p.overall)} r={4} fill="#8b5cf6" stroke="rgba(3,8,22,0.97)" strokeWidth={2}/>
                        <text x={tx(i)} y={ty(p.overall)-10} textAnchor="middle" fill="#c4b5fd" fontSize={9}>{p.overall}</text>
                      </g>
                    ))}
                  </svg>
                  <div style={{ display:'flex', gap:16, marginTop:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:12, height:3, borderRadius:2, background:'#8b5cf6' }}/><span style={{ color:'#64748b', fontSize:10 }}>Genel Skor</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:12, height:1, borderTop:'1px dashed #f59e0b' }}/><span style={{ color:'#64748b', fontSize:10 }}>Benchmark</span></div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Benchmark Karşılaştırma */}
          {benchmark && (
            <div style={{ ...card, padding:'18px 20px' }}>
              <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>🎯 Sektör Benchmark Karşılaştırması</h3>
              {benchmark.total_analyses === 0 ? (
                <p style={{ color:'#475569', fontSize:13 }}>Henüz analiz yok — WhatsApp konuşmalarını analiz ettikten sonra sektör karşılaştırması görünür</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(benchmark.comparison||[]).map((c:any) => {
                    const labels: Record<string,string> = { overall:'Genel Skor', professionalism:'Profesyonellik', sales_technique:'Satış Tekniği', empathy:'Empati', closing:'Kapanış' }
                    return (
                      <div key={c.metric} style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <span style={{ color:'#64748b', fontSize:12, width:130, flexShrink:0 }}>{labels[c.metric]||c.metric}</span>
                        <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, position:'relative' }}>
                          <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${c.user}%`, background:scoreColor(c.user), borderRadius:3 }} />
                          <div style={{ position:'absolute', top:-3, left:`${c.benchmark}%`, width:2, height:12, background:'#f59e0b', borderRadius:1 }} title={`Benchmark: ${c.benchmark}`} />
                        </div>
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <span style={{ color:scoreColor(c.user), fontWeight:700, fontSize:12, width:30, textAlign:'right' }}>{c.user}</span>
                          <span style={{ color:c.status==='above'?'#10b981':'#ef4444', fontSize:10, padding:'1px 6px', borderRadius:20, background:c.status==='above'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)' }}>
                            {c.diff >= 0 ? '+' : ''}{c.diff}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop:6, padding:'8px 12px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:9 }}>
                    <span style={{ color:'#fbbf24', fontSize:11 }}>📊 {benchmark.total_analyses} konuşma analiz edildi · ▌ Sarı çizgi = sektör ortalaması</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rapor Ayarları */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>⚙️ Rapor Ayarları</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                <div onClick={()=>setReportSettings(p=>({...p,weekly_enabled:!p.weekly_enabled}))}
                  style={{ width:38, height:20, borderRadius:10, background:reportSettings.weekly_enabled?'#7c3aed':'rgba(100,116,139,0.3)', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left:reportSettings.weekly_enabled?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                </div>
                <div>
                  <p style={{ color:'#fff', fontSize:13, margin:0 }}>Haftalık otomatik rapor</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>Her Pazartesi email ile gönderilir</p>
                </div>
              </label>
              <div>
                <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Uyarı Eşiği: {reportSettings.alert_threshold}/100 altındaki skorlar için uyarı</label>
                <input type="range" min={20} max={80} value={reportSettings.alert_threshold} onChange={e=>setReportSettings(p=>({...p,alert_threshold:Number(e.target.value)}))} style={{ width:'100%', accentColor:'#7c3aed' }} />
              </div>
              <button onClick={async()=>{ try { await api.patch('/api/ti-reports/settings',reportSettings); showMsg('success','Ayarlar kaydedildi') } catch(e:any) { showMsg('error',e.message) } }}
                style={{ padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', width:'fit-content' }}>
                Ayarları Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelectedMember(null) }}>
          <div style={{ background:'linear-gradient(135deg,#0a0c14,#0d1120)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:22, padding:28, width:520, maxWidth:'94vw', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:50, height:50, borderRadius:'50%', background:roleInfo(selectedMember.role).bg, border:`2px solid ${roleInfo(selectedMember.role).color}50`, display:'flex', alignItems:'center', justifyContent:'center', color:roleInfo(selectedMember.role).color, fontWeight:900, fontSize:20 }}>
                  {selectedMember.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:0 }}>{selectedMember.name}</h2>
                  <p style={{ color:'#64748b', fontSize:12, margin:'3px 0 0' }}>{selectedMember.email}</p>
                </div>
              </div>
              <button onClick={()=>setSelectedMember(null)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer' }}><X size={18}/></button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Rol değiştir */}
              <div>
                <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:6 }}>Rol</label>
                <select defaultValue={selectedMember.role}
                  onChange={async e=>{ await api.patch(`/api/team/members/${selectedMember.id}`, { role:e.target.value }); loadAll(); setSelectedMember((p:any)=>({...p,role:e.target.value})) }}
                  style={{ width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', cursor:'pointer' }}>
                  {ROLES.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              {/* WA numarası */}
              <div>
                <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:6 }}>WhatsApp Numarası</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input defaultValue={selectedMember.wa_phone||''} id="wa-phone-edit" placeholder="905551234567"
                    style={{ flex:1, background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }} />
                  <button onClick={async()=>{ const el=document.getElementById('wa-phone-edit') as HTMLInputElement; await api.patch(`/api/team/members/${selectedMember.id}`, { wa_phone:el.value }); showMsg('success','Kaydedildi'); loadAll() }}
                    style={{ padding:'10px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <Save size={13}/>
                  </button>
                </div>
              </div>
              {/* Hedefler */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:6 }}>Aylık Lead Hedefi</label>
                  <input type="number" defaultValue={selectedMember.target_leads_monthly||30} id="target-leads"
                    style={{ width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:6 }}>Dönüşüm Hedefi (%)</label>
                  <input type="number" defaultValue={selectedMember.target_conversion_rate||25} id="target-conv"
                    style={{ width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                </div>
              </div>
              <button onClick={async()=>{
                const tl=(document.getElementById('target-leads') as HTMLInputElement)?.value
                const tc=(document.getElementById('target-conv') as HTMLInputElement)?.value
                await api.patch(`/api/team/members/${selectedMember.id}`, { target_leads_monthly:Number(tl), target_conversion_rate:Number(tc) })
                showMsg('success','Hedefler güncellendi'); loadAll()
              }}
                style={{ padding:'10px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4c1d95,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Değişiklikleri Kaydet
              </button>
              <button onClick={()=>{ router.push('/team'); setSelectedMember(null) }}
                style={{ padding:'10px', borderRadius:11, border:'1px solid rgba(139,92,246,0.3)', background:'transparent', color:'#a78bfa', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Tam Detay & Analiz Sayfası
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
