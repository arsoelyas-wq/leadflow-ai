'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Globe, Plus, RefreshCw, ExternalLink, Eye, Copy, CheckCircle } from 'lucide-react'

export default function MicrositePage() {
  const [microsites, setMicrosites] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string|null>(null)
  const [form, setForm] = useState({ leadId:'', customMessage:'' })
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [m, s, l] = await Promise.allSettled([
        api.get('/api/microsite/list'),
        api.get('/api/microsite/stats'),
        api.get('/api/leads?limit=100'),
      ])
      if (m.status==='fulfilled') setMicrosites(m.value.microsites||[])
      if (s.status==='fulfilled') setStats(s.value)
      if (l.status==='fulfilled') setLeads(l.value.leads||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const create = async () => {
    if (!form.leadId) return
    setCreating(true)
    try {
      const data = await api.post('/api/microsite/create', form)
      showMsg('success', `Microsite oluşturuldu! ${data.url}`)
      setShowCreate(false)
      setForm({leadId:'',customMessage:''})
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const copy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(()=>setCopied(null), 2000)
  }

  const baseUrl = 'https://leadflow-ai-web-kappa.vercel.app/catalog/'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe size={24} className="text-cyan-400"/> Kişisel Katalog Sayfaları
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Her müşteri için AI ile özel katalog sayfası — WhatsApp'tan link gönder</p>
        </div>
        <button onClick={()=>setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-xl transition">
          <Plus size={14}/> Yeni Microsite
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Toplam',value:stats.total,color:'text-white'},
            {label:'Aktif',value:stats.active,color:'text-emerald-400'},
            {label:'Toplam Görüntüleme',value:stats.totalViews,color:'text-cyan-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">✨ Yeni Kişisel Katalog Oluştur</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Müşteri *</label>
              <select value={form.leadId} onChange={e=>setForm(p=>({...p,leadId:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                <option value="">Müşteri seçin</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.company_name} {l.city?`— ${l.city}`:''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Özel Mesaj (opsiyonel)</label>
              <input value={form.customMessage} onChange={e=>setForm(p=>({...p,customMessage:e.target.value}))}
                placeholder="Size özel hazırladık..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"/>
            </div>
          </div>
          <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-xs text-slate-400">
            💡 AI müşterinin sektörüne ve şehrine göre otomatik başlık ve içerik oluşturur
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={creating||!form.leadId}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              {creating?<RefreshCw size={13} className="animate-spin"/>:<Globe size={13}/>}
              {creating?'Oluşturuluyor...':'Oluştur'}
            </button>
            <button onClick={()=>setShowCreate(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
      : microsites.length===0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Globe size={40} className="text-slate-600 mx-auto mb-3"/>
          <p className="text-slate-400">Henüz katalog sayfası yok</p>
          <p className="text-slate-500 text-sm mt-1">Müşteri seçin ve AI ile kişisel katalog oluşturun</p>
        </div>
      ) : (
        <div className="space-y-3">
          {microsites.map(ms=>(
            <div key={ms.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{ms.leads?.company_name}</p>
                <p className="text-slate-400 text-sm mt-0.5">{ms.headline}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Eye size={10}/> {ms.views} görüntüleme</span>
                  <span>{new Date(ms.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={baseUrl+ms.slug} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition">
                  <ExternalLink size={11}/> Görüntüle
                </a>
                <button onClick={()=>copy(baseUrl+ms.slug, ms.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs rounded-lg transition">
                  {copied===ms.id?<CheckCircle size={11}/>:<Copy size={11}/>}
                  {copied===ms.id?'Kopyalandı':'Link Kopyala'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}