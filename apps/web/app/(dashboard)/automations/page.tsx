'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Zap, Copy, CheckCircle, RefreshCw, ExternalLink, Settings } from 'lucide-react'

export default function AutomationsPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [settings, setSettings] = useState<any>({ zapierUrl:'', makeUrl:'', n8nUrl:'', autoSendNewLeads:false })
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  useEffect(()=>{
    Promise.allSettled([
      api.get('/api/automations/webhook-url'),
      api.get('/api/automations/settings'),
      api.get('/api/automations/logs'),
      api.get('/api/automations/stats'),
    ]).then(([w, s, l, st])=>{
      if (w.status==='fulfilled') setWebhookUrl(w.value.url||'')
      if (s.status==='fulfilled' && s.value.settings) setSettings(s.value.settings)
      if (l.status==='fulfilled') setLogs(l.value.logs||[])
      if (st.status==='fulfilled') setStats(st.value)
    })
  },[])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/automations/settings', {
        zapierUrl: settings.zapierUrl,
        makeUrl: settings.makeUrl,
        n8nUrl: settings.n8nUrl,
        autoSendNewLeads: settings.autoSendNewLeads,
      })
      showMsg('success', 'Otomasyon ayarları kaydedildi!')
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(()=>setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={24} className="text-yellow-400"/> Otomasyon Entegrasyonu
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Zapier, Make (Integromat) veya n8n ile bağlanın — tüm araçlarınızı entegre edin</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Toplam İşlem',value:stats.total,color:'text-white'},
            {label:'Gelen',value:stats.incoming,color:'text-blue-400'},
            {label:'Giden',value:stats.outgoing,color:'text-green-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Webhook URL */}
      <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400"/> Gelen Webhook URL'niz
        </h2>
        <p className="text-slate-400 text-sm mb-3">Bu URL'yi Zapier, Make veya n8n'e yapıştırın — gelen veriler otomatik lead olarak eklenir</p>
        <div className="flex gap-2">
          <code className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-emerald-400 text-xs font-mono overflow-x-auto">
            {webhookUrl || 'Yükleniyor...'}
          </code>
          <button onClick={()=>copy(webhookUrl)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded-lg transition flex-shrink-0">
            {copied?<CheckCircle size={13}/>:<Copy size={13}/>}
            {copied?'Kopyalandı':'Kopyala'}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
          <div className="bg-slate-900 rounded-lg p-2">
            <p className="text-white font-medium mb-1">Beklenen Format</p>
            <code className="text-emerald-400 text-xs">{"{ name, phone, email, company, source }"}</code>
          </div>
          <div className="bg-slate-900 rounded-lg p-2">
            <p className="text-white font-medium mb-1">Zapier</p>
            <p>Webhook → POST bu URL'ye</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2">
            <p className="text-white font-medium mb-1">Make</p>
            <p>HTTP → Make a request → POST</p>
          </div>
        </div>
      </div>

      {/* Giden Webhook Ayarları */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Settings size={16} className="text-slate-400"/> Giden Webhook Ayarları
        </h2>
        <p className="text-slate-400 text-sm">Yeni lead eklendiğinde otomatik olarak Zapier/Make'e bildirim gönderin</p>
        <div className="space-y-3">
          {[
            {k:'zapierUrl',l:'Zapier Webhook URL',p:'https://hooks.zapier.com/hooks/catch/...'},
            {k:'makeUrl',l:'Make (Integromat) Webhook URL',p:'https://hook.eu1.make.com/...'},
            {k:'n8nUrl',l:'n8n Webhook URL',p:'https://n8n.io/webhook/...'},
          ].map(({k,l,p})=>(
            <div key={k}>
              <label className="text-slate-400 text-xs mb-1 block">{l}</label>
              <input value={(settings as any)[k]||''} onChange={e=>setSettings((prev:any)=>({...prev,[k]:e.target.value}))}
                placeholder={p}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"/>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={settings.autoSendNewLeads||false}
            onChange={e=>setSettings((p:any)=>({...p,autoSendNewLeads:e.target.checked}))}
            className="accent-yellow-500"/>
          <div>
            <p className="text-white text-sm">Yeni lead eklendiğinde otomatik gönder</p>
            <p className="text-slate-500 text-xs">Her yeni lead Zapier/Make'e otomatik iletilir</p>
          </div>
        </label>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {saving?<RefreshCw size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
          {saving?'Kaydediliyor...':'Kaydet'}
        </button>
      </div>

      {/* Entegrasyon Rehberi */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {name:'Zapier', url:'https://zapier.com', desc:'7000+ uygulama entegrasyonu', icon:'⚡', color:'border-orange-500/30 bg-orange-500/5'},
          {name:'Make', url:'https://make.com', desc:'Görsel otomasyon akışları', icon:'🔄', color:'border-purple-500/30 bg-purple-500/5'},
          {name:'n8n', url:'https://n8n.io', desc:'Açık kaynak otomasyon', icon:'🔧', color:'border-blue-500/30 bg-blue-500/5'},
        ].map(p=>(
          <div key={p.name} className={`border rounded-xl p-4 ${p.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{p.icon}</span>
              <p className="text-white font-medium">{p.name}</p>
            </div>
            <p className="text-slate-400 text-xs mb-3">{p.desc}</p>
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 text-xs hover:underline">
              <ExternalLink size={10}/> {p.url.replace('https://','')}
            </a>
          </div>
        ))}
      </div>

      {/* Loglar */}
      {logs.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">📋 Son İşlemler</h2>
          <div className="space-y-2">
            {logs.slice(0,10).map((log:any,i:number)=>(
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-0.5 rounded ${log.type==='incoming'?'bg-blue-500/20 text-blue-300':'bg-green-500/20 text-green-300'}`}>
                  {log.type==='incoming'?'Gelen':'Giden'}
                </span>
                <span className="text-slate-400">{log.source || log.destination}</span>
                <span className="text-slate-500 ml-auto">{new Date(log.received_at||log.sent_at).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}