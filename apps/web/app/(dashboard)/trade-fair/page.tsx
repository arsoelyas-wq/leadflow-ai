'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Globe, Plus, RefreshCw, Users, Send, CheckCircle, Calendar, MapPin } from 'lucide-react'

export default function TradeFairPage() {
  const [fairs, setFairs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [selectedFair, setSelectedFair] = useState<any>(null)
  const [exhibitors, setExhibitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [sending, setSending] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [form, setForm] = useState({ name:'', country:'', city:'', start_date:'', end_date:'', sector:'', venue:'', stand_no:'' })

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [f, s] = await Promise.allSettled([api.get('/api/trade-fair/fairs'), api.get('/api/trade-fair/stats')])
      if (f.status==='fulfilled') setFairs(f.value.fairs||[])
      if (s.status==='fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const loadExhibitors = async (fairId: string) => {
    const data = await api.get(`/api/trade-fair/exhibitors/${fairId}`)
    setExhibitors(data.exhibitors||[])
  }

  const addFair = async () => {
    if (!form.name || !form.start_date) return
    try {
      await api.post('/api/trade-fair/fairs', form)
      showMsg('success','Fuar eklendi!')
      setShowAdd(false)
      setForm({name:'',country:'',city:'',start_date:'',end_date:'',sector:'',venue:'',stand_no:''})
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const scrapeExhibitors = async () => {
    if (!selectedFair) return
    setScraping(true)
    try {
      const data = await api.post('/api/trade-fair/scrape-exhibitors', { fairId: selectedFair.id })
      showMsg('success', data.message)
      setTimeout(()=>loadExhibitors(selectedFair.id), 5000)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setScraping(false) }
  }

  const sendPreMessages = async () => {
    if (!selectedFair) return
    setSending(true)
    try {
      const data = await api.post('/api/trade-fair/send-pre-messages', { fairId: selectedFair.id })
      showMsg('success', data.message)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const sendPostMessages = async () => {
    if (!selectedFair) return
    setSending(true)
    try {
      const data = await api.post('/api/trade-fair/send-post-messages', { fairId: selectedFair.id })
      showMsg('success', data.message)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const markMeeting = async (exhibitorId: string) => {
    await api.patch(`/api/trade-fair/exhibitors/${exhibitorId}/meeting`, {})
    loadExhibitors(selectedFair.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe size={24} className="text-cyan-400"/> Fuar Asistanı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Fuar öncesi randevu — fuar sonrası teşekkür — tam otomasyon</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-xl transition">
          <Plus size={14}/> Fuar Ekle
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            {label:'Fuarlar',value:stats.totalFairs},
            {label:'Katılımcılar',value:stats.totalExhibitors},
            {label:'Ön Mesaj',value:stats.preSent},
            {label:'Görüşme',value:stats.meetings},
            {label:'Teşekkür',value:stats.postSent},
          ].map(({label,value})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-cyan-400">{value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fuar Ekle */}
      {showAdd && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Yeni Fuar</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {key:'name',label:'Fuar Adı *',placeholder:'IDEX 2025'},
              {key:'country',label:'Ülke',placeholder:'Türkiye'},
              {key:'city',label:'Şehir',placeholder:'İstanbul'},
              {key:'sector',label:'Sektör',placeholder:'Mobilya'},
              {key:'venue',label:'Mekan',placeholder:'TÜYAP'},
              {key:'stand_no',label:'Stand No',placeholder:'A-123'},
            ].map(({key,label,placeholder})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  placeholder={placeholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"/>
              </div>
            ))}
            {[
              {key:'start_date',label:'Başlangıç Tarihi *'},
              {key:'end_date',label:'Bitiş Tarihi'},
            ].map(({key,label})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input type="date" value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"/>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addFair} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition">Kaydet</button>
            <button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fuar Listesi */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold">Fuarlar ({fairs.length})</h2>
          {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
          : fairs.length===0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
              <Globe size={36} className="text-slate-600 mx-auto mb-2"/>
              <p className="text-slate-400">Fuar yok</p>
            </div>
          ) : fairs.map(fair=>(
            <div key={fair.id} onClick={()=>{ setSelectedFair(fair); loadExhibitors(fair.id) }}
              className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition ${selectedFair?.id===fair.id?'border-cyan-500':'border-slate-700 hover:border-slate-500'}`}>
              <p className="text-white font-medium">{fair.name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Calendar size={10}/>{fair.start_date}</span>
                {fair.city && <span className="flex items-center gap-1"><MapPin size={10}/>{fair.city}</span>}
                {fair.stand_no && <span>Stand: {fair.stand_no}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Seçili Fuar Detayı */}
        {selectedFair && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={scrapeExhibitors} disabled={scraping}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                {scraping?<RefreshCw size={12} className="animate-spin"/>:<Users size={12}/>}
                {scraping?'Taranıyor...':'Katılımcıları Bul'}
              </button>
              <button onClick={sendPreMessages} disabled={sending}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                {sending?<RefreshCw size={12} className="animate-spin"/>:<Send size={12}/>}
                Ön Mesaj Gönder
              </button>
              <button onClick={sendPostMessages} disabled={sending}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                {sending?<RefreshCw size={12} className="animate-spin"/>:<Send size={12}/>}
                Teşekkür Gönder
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {exhibitors.length===0 ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                  <p className="text-slate-400 text-sm">Katılımcı bulunamadı — "Katılımcıları Bul" butonuna tıklayın</p>
                </div>
              ) : exhibitors.map(ex=>(
                <div key={ex.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{ex.company_name}</p>
                    <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                      {ex.phone && <span>{ex.phone}</span>}
                      {ex.country && <span>{ex.country}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ex.pre_message_sent && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">Ön ✓</span>}
                    {ex.meeting_scheduled && <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">Görüşme ✓</span>}
                    {ex.post_message_sent && <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">Son ✓</span>}
                    {!ex.meeting_scheduled && (
                      <button onClick={()=>markMeeting(ex.id)}
                        className="p-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition">
                        <CheckCircle size={12}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}