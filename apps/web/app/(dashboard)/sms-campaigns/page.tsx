'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Smartphone, Send, RefreshCw, Settings } from 'lucide-react'

export default function SMSPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  useEffect(()=>{
    Promise.allSettled([
      api.get('/api/leads?limit=200'),
      api.get('/api/sms/stats'),
    ]).then(([l,s])=>{
      if (l.status==='fulfilled') setLeads((l.value.leads||[]).filter((lead:any)=>lead.phone))
      if (s.status==='fulfilled') setStats(s.value)
    })
  },[])

  const send = async () => {
    if (!message || !selectedLeads.length) return
    setSending(true)
    try {
      const d = await api.post('/api/sms/send', { message, leadIds: selectedLeads })
      showMsg('success', d.message)
      setSelectedLeads([])
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Smartphone size={24} className="text-green-400"/> SMS Kampanyası
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Twilio ile toplu SMS — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER gerekli</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats?.totalSent||0}</p>
          <p className="text-slate-400 text-xs mt-1">Gönderilen SMS</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${stats?.configured?'text-emerald-400':'text-red-400'}`}>
            {stats?.configured?'✅ Bağlı':'❌ Bağlı Değil'}
          </p>
          <p className="text-slate-400 text-xs mt-1">Twilio Durumu</p>
        </div>
      </div>

      {!stats?.configured && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-sm">
          ⚠️ Twilio bağlantısı için Railway'e şunları ekleyin:
          <code className="block mt-1 text-xs bg-slate-900 p-2 rounded">
            TWILIO_ACCOUNT_SID = ACxxxxxxx<br/>
            TWILIO_AUTH_TOKEN = xxxxxxx<br/>
            TWILIO_PHONE_NUMBER = +1xxxxxxxxx
          </code>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold">📱 SMS İçeriği</h2>
          <textarea value={message} onChange={e=>setMessage(e.target.value)}
            placeholder="{isim}, size özel teklifimiz var! Detaylar için: ..."
            rows={5}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 resize-none"/>
          <p className="text-slate-500 text-xs">{message.length}/160 karakter — {"{isim}"} değişkeni kullanabilirsiniz</p>
          <button onClick={send} disabled={sending||!message||!selectedLeads.length}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {sending?<RefreshCw size={14} className="animate-spin"/>:<Send size={14}/>}
            {sending?'Gönderiliyor...':`${selectedLeads.length} Kişiye Gönder`}
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">👥 Alıcılar ({leads.length})</h2>
            <button onClick={()=>setSelectedLeads(selectedLeads.length===leads.length?[]:leads.map((l:any)=>l.id))}
              className="text-green-400 text-xs hover:underline">
              {selectedLeads.length===leads.length?'Kaldır':'Tümünü Seç'}
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {leads.map((lead:any)=>(
              <label key={lead.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 rounded-lg cursor-pointer">
                <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                  onChange={e=>setSelectedLeads(prev=>e.target.checked?[...prev,lead.id]:prev.filter(id=>id!==lead.id))}
                  className="accent-green-500"/>
                <div>
                  <p className="text-white text-xs font-medium">{lead.company_name}</p>
                  <p className="text-slate-400 text-xs">{lead.phone}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}