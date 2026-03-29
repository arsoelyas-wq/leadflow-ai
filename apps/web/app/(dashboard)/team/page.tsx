'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Users, Plus, RefreshCw, Trash2, Edit2, CheckCircle, Shield, Activity, Target } from 'lucide-react'

const ROLES = [
  { key: 'admin', label: 'Yönetici', color: 'text-red-400', desc: 'Tam yetki' },
  { key: 'manager', label: 'Müdür', color: 'text-purple-400', desc: 'Raporlar dahil' },
  { key: 'sales', label: 'Satış Temsilcisi', color: 'text-blue-400', desc: 'Lead + mesaj' },
  { key: 'support', label: 'Destek', color: 'text-green-400', desc: 'Sadece mesaj' },
  { key: 'readonly', label: 'Görüntüleyici', color: 'text-slate-400', desc: 'Sadece okuma' },
]

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedMember, setSelectedMember] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [form, setForm] = useState({ name:'', email:'', role:'sales', password:'' })
  const [saving, setSaving] = useState(false)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [m, s, a, l] = await Promise.allSettled([
        api.get('/api/team/members'),
        api.get('/api/team/stats'),
        api.get('/api/team/activity'),
        api.get('/api/leads?limit=100&status=new'),
      ])
      if (m.status==='fulfilled') setMembers(m.value.members||[])
      if (s.status==='fulfilled') setStats(s.value)
      if (a.status==='fulfilled') setActivity(a.value.activity||[])
      if (l.status==='fulfilled') setLeads(l.value.leads||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const addMember = async () => {
    if (!form.name||!form.email) return
    setSaving(true)
    try {
      await api.post('/api/team/members', form)
      showMsg('success', `${form.name} ekibe eklendi!`)
      setShowAdd(false)
      setForm({name:'',email:'',role:'sales',password:''})
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/api/team/members/${id}`, { active: !active })
      showMsg('success', !active ? 'Üye aktif edildi' : 'Üye devre dışı bırakıldı')
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Üyeyi silmek istediğinize emin misiniz?')) return
    try {
      await api.delete(`/api/team/members/${id}`)
      showMsg('success', 'Üye silindi')
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const assignLeads = async () => {
    if (!selectedMember || !selectedLeads.length) return
    try {
      await api.post('/api/team/assign-leads', { memberId: selectedMember, leadIds: selectedLeads })
      showMsg('success', `${selectedLeads.length} lead atandı!`)
      setShowAssign(false)
      setSelectedLeads([])
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const getRoleInfo = (key: string) => ROLES.find(r=>r.key===key) || ROLES[2]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-blue-400"/> Ekip Yönetimi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Satış ekibini yönet — yetki ver — lead ata — performans takip et</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowAssign(!showAssign)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <Target size={14}/> Lead Ata
          </button>
          <button onClick={()=>setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
            <Plus size={14}/> Üye Ekle
          </button>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-slate-400 text-xs mt-1">Toplam Üye</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            <p className="text-slate-400 text-xs mt-1">Aktif</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-white text-xs font-medium mb-2">Rol Dağılımı</p>
            {Object.entries(stats.byRole||{}).map(([role, count]: any)=>(
              <div key={role} className="flex items-center justify-between text-xs">
                <span className={getRoleInfo(role).color}>{getRoleInfo(role).label}</span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Üye Ekle */}
      {showAdd && (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">➕ Yeni Ekip Üyesi</h2>
          <div className="grid lg:grid-cols-2 gap-3">
            {[
              {key:'name',label:'Ad Soyad *',ph:'Ahmet Yılmaz'},
              {key:'email',label:'Email *',ph:'ahmet@sirket.com'},
              {key:'password',label:'Şifre',ph:'Boş bırakılırsa LeadFlow2024!'},
            ].map(({key,label,ph})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input type={key==='password'?'password':'text'}
                  value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>
            ))}
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Rol</label>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {ROLES.map(r=><option key={r.key} value={r.key}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addMember} disabled={saving||!form.name||!form.email}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              {saving?'Ekleniyor...':'Ekle'}
            </button>
            <button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Lead Ata */}
      {showAssign && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">🎯 Lead Ata</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Ekip Üyesi</label>
              <select value={selectedMember} onChange={e=>setSelectedMember(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Seçin</option>
                {members.filter(m=>m.active).map(m=><option key={m.id} value={m.id}>{m.name} ({getRoleInfo(m.role).label})</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Leadler ({selectedLeads.length} seçili)</label>
              <div className="max-h-32 overflow-y-auto bg-slate-900 rounded-lg p-2 space-y-1">
                {leads.slice(0,20).map(l=>(
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e=>setSelectedLeads(prev=>e.target.checked?[...prev,l.id]:prev.filter(id=>id!==l.id))}
                      className="accent-purple-500"/>
                    <span className="text-white text-xs truncate">{l.company_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={assignLeads} disabled={!selectedMember||!selectedLeads.length}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              {selectedLeads.length} Lead Ata
            </button>
            <button onClick={()=>setShowAssign(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Üye Listesi */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">Ekip Üyeleri ({members.length})</h2>
        {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
        : members.length===0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
            <Users size={36} className="text-slate-600 mx-auto mb-2"/>
            <p className="text-slate-400">Henüz ekip üyesi yok</p>
          </div>
        ) : members.map(member=>{
          const actData = activity.find(a=>a.member.id===member.id)
          const roleInfo = getRoleInfo(member.role)
          return (
            <div key={member.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {member.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{member.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-700 ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                  {!member.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Pasif</span>}
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{member.email}</span>
                  {member.leads_count > 0 && <span className="text-blue-400">{member.leads_count} lead</span>}
                  {actData?.weeklyMessages > 0 && <span className="text-emerald-400">{actData.weeklyMessages} mesaj/hafta</span>}
                  {actData?.avgCoachingScore && <span className="text-yellow-400">Skor: {actData.avgCoachingScore}/10</span>}
                  {member.last_login && <span>Son giriş: {new Date(member.last_login).toLocaleDateString('tr-TR')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={()=>toggleActive(member.id, member.active)}
                  className={`p-1.5 rounded-lg transition ${member.active?'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400':'bg-slate-700 hover:bg-slate-600 text-slate-400'}`}>
                  <CheckCircle size={14}/>
                </button>
                <button onClick={()=>deleteMember(member.id)}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}