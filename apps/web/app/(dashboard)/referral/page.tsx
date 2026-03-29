'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Users, Play, RefreshCw, Plus, CheckCircle, Gift, TrendingUp } from 'lucide-react'

export default function ReferralPage() {
  const [settings, setSettings] = useState<any>({ active: true, days_after_sale: 15, reward_description: '%10 indirim', auto_run: true })
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [showAddLead, setShowAddLead] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [form, setForm] = useState({ referrerLeadId:'', companyName:'', contactName:'', phone:'', email:'', sector:'' })

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [s, st, l] = await Promise.allSettled([
        api.get('/api/referral/settings'),
        api.get('/api/referral/stats'),
        api.get('/api/leads?limit=100&status=won'),
      ])
      if (s.status==='fulfilled' && s.value.settings) setSettings(s.value.settings)
      if (st.status==='fulfilled') setStats(st.value)
      if (l.status==='fulfilled') setLeads(l.value.leads||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/referral/settings', settings)
      showMsg('success','Ayarlar kaydedildi!')
    } catch (e:any) { showMsg('error',e.message) }
    finally { setSaving(false) }
  }

  const runNow = async () => {
    setRunning(true)
    try {
      await api.post('/api/referral/run-now', {})
      showMsg('success','Referral kampanyası başlatıldı!')
      setTimeout(load, 5000)
    } catch (e:any) { showMsg('error',e.message) }
    finally { setRunning(false) }
  }

  const addLead = async () => {
    try {
      await api.post('/api/referral/add-lead', form)
      showMsg('success','Referans lead eklendi!')
      setShowAddLead(false)
      setForm({referrerLeadId:'',companyName:'',contactName:'',phone:'',email:'',sector:''})
      load()
    } catch (e:any) { showMsg('error',e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift size={24} className="text-purple-400"/> Smart Referral Loop
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Memnun müşterilerden otomatik referans — organik büyüme</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowAddLead(!showAddLead)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <Plus size={14}/> Referans Lead Ekle
          </button>
          <button onClick={runNow} disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {running?<RefreshCw size={14} className="animate-spin"/>:<Play size={14}/>}
            {running?'Çalışıyor...':'Şimdi Çalıştır'}
          </button>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Gönderilen',value:stats.sent,color:'text-blue-400'},
            {label:'Gelen Referans',value:stats.referralsReceived,color:'text-purple-400'},
            {label:'Kazanılan',value:stats.referralsWon,color:'text-emerald-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ayarlar */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">⚙️ Referral Ayarları</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Satıştan kaç gün sonra gönderilsin?</label>
            <input type="number" value={settings.days_after_sale}
              onChange={e=>setSettings((p:any)=>({...p,days_after_sale:parseInt(e.target.value)}))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"/>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Ödül açıklaması</label>
            <input value={settings.reward_description}
              onChange={e=>setSettings((p:any)=>({...p,reward_description:e.target.value}))}
              placeholder="%10 indirim, ücretsiz kargo..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"/>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.active}
              onChange={e=>setSettings((p:any)=>({...p,active:e.target.checked}))} className="accent-purple-500"/>
            <span className="text-white text-sm">Aktif</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.auto_run}
              onChange={e=>setSettings((p:any)=>({...p,auto_run:e.target.checked}))} className="accent-purple-500"/>
            <span className="text-white text-sm">Otomatik çalıştır (her gün)</span>
          </label>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
          {saving?<RefreshCw size={13} className="animate-spin"/>:<CheckCircle size={13}/>}
          {saving?'Kaydediliyor...':'Kaydet'}
        </button>
      </div>

      {/* Referans Lead Ekle */}
      {showAddLead && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold">➕ Referans ile Gelen Lead</h2>
          <div className="grid lg:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Referans Veren Müşteri</label>
              <select value={form.referrerLeadId} onChange={e=>setForm(p=>({...p,referrerLeadId:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Seçin (opsiyonel)</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </div>
            {[
              {key:'companyName',label:'Şirket Adı *',ph:'ABC Ltd.'},
              {key:'contactName',label:'Kişi Adı',ph:'Ahmet Bey'},
              {key:'phone',label:'Telefon *',ph:'05001234567'},
              {key:'email',label:'Email',ph:'info@abc.com'},
              {key:'sector',label:'Sektör',ph:'Mobilya'},
            ].map(({key,label,ph})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addLead} disabled={!form.companyName||!form.phone}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              Ekle
            </button>
            <button onClick={()=>setShowAddLead(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Kazanılan Müşteriler */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users size={16} className="text-emerald-400"/> Kazanılan Müşteriler ({leads.length})
        </h2>
        {leads.length===0 ? (
          <p className="text-slate-400 text-sm">Henüz kazanılan müşteri yok</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {leads.map(l=>(
              <div key={l.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-900 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{l.company_name}</p>
                  <p className="text-slate-400 text-xs">{l.phone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${l.referral_sent?'bg-emerald-500/20 text-emerald-300':'bg-slate-700 text-slate-400'}`}>
                  {l.referral_sent?'✓ Gönderildi':'Bekliyor'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}