'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Heart, RefreshCw, Zap, Sparkles, MessageSquare } from 'lucide-react'

export default function EmotionalIQPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [selectedLead, setSelectedLead] = useState('')
  const [baseMessage, setBaseMessage] = useState('')
  const [result, setResult] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [l, s] = await Promise.allSettled([
        api.get('/api/leads?limit=100'),
        api.get('/api/emotional/status'),
      ])
      if (l.status==='fulfilled') setLeads(l.value.leads||[])
      if (s.status==='fulfilled') setStatus(s.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const scanBatch = async () => {
    setScanning(true)
    try {
      await api.post('/api/emotional/scan-batch', { limit: 20 })
      showMsg('success', '20 lead taranıyor...')
      setTimeout(load, 10000)
    } catch (e:any) { showMsg('error',e.message) }
    finally { setScanning(false) }
  }

  const generateOpener = async () => {
    if (!selectedLead || !baseMessage) return
    setGenerating(true)
    setResult(null)
    try {
      const data = await api.post('/api/emotional/generate-opener', { leadId: selectedLead, baseMessage })
      setResult(data)
    } catch (e:any) { showMsg('error',e.message) }
    finally { setGenerating(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart size={24} className="text-pink-400"/> Duygusal Zeka Katmanı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Sosyal medya analizi ile empati mesajları — robotik his tamamen yok</p>
        </div>
        <button onClick={scanBatch} disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {scanning?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>}
          {scanning?'Taranıyor...':'20 Lead Tara'}
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Status */}
      {status && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-pink-400">{status.scanned}</p>
            <p className="text-slate-400 text-xs mt-1">Taranan Lead</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{status.active ? '✅ Aktif' : '❌ Pasif'}</p>
            <p className="text-slate-400 text-xs mt-1">Sistem Durumu</p>
          </div>
        </div>
      )}

      {/* Mesaj Güçlendirici */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-400"/> Mesaj Güçlendirici
        </h2>
        <p className="text-slate-400 text-sm">Normal bir mesajı AI ile kişiselleştirilmiş empati mesajına dönüştür</p>
        
        <div>
          <label className="text-slate-400 text-xs mb-1.5 block">Lead Seç</label>
          <select value={selectedLead} onChange={e=>setSelectedLead(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500">
            <option value="">Lead seçin</option>
            {leads.map(l=><option key={l.id} value={l.id}>{l.company_name} {l.city?`— ${l.city}`:''}</option>)}
          </select>
        </div>

        <div>
          <label className="text-slate-400 text-xs mb-1.5 block">Ana Mesajınız</label>
          <textarea value={baseMessage} onChange={e=>setBaseMessage(e.target.value)}
            placeholder="Merhaba, size özel bir teklifimiz var..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500 resize-none"/>
        </div>

        <button onClick={generateOpener} disabled={generating||!selectedLead||!baseMessage}
          className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {generating?<RefreshCw size={14} className="animate-spin"/>:<Sparkles size={14}/>}
          {generating?'Üretiliyor...':'Mesajı Güçlendir'}
        </button>

        {/* Sonuç */}
        {result && (
          <div className="space-y-3 mt-2">
            {result.context?.events?.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-300 text-xs font-medium mb-1">🔍 Tespit Edilen Gelişmeler</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.context.events.map((e:string,i:number)=>(
                    <span key={i} className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full">{e}</span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-900 rounded-xl">
                <p className="text-slate-400 text-xs mb-2">Orijinal Mesaj</p>
                <p className="text-white text-sm">{result.original}</p>
              </div>
              <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                <p className="text-pink-300 text-xs mb-2 flex items-center gap-1">
                  <Sparkles size={10}/> Güçlendirilmiş Mesaj
                  {result.improved && <span className="ml-auto text-emerald-400">✓ İyileştirildi</span>}
                </p>
                <p className="text-white text-sm">{result.enhanced}</p>
                <button onClick={()=>navigator.clipboard.writeText(result.enhanced)}
                  className="mt-2 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600 transition">
                  Kopyala
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nasıl Çalışır */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-400"/> Nasıl Çalışır?
        </h2>
        <div className="space-y-2 text-slate-400 text-sm">
          <p>1. Sistem lead'in adı ve şirketi ile Google News'te haber arar</p>
          <p>2. Ödül, terfi, yıl dönümü, yeni açılış gibi olayları tespit eder</p>
          <p>3. Claude AI bu bilgiyle empati cümlesi üretir</p>
          <p>4. Mesajınızın başına kişisel giriş eklenir</p>
          <p className="text-pink-400">→ Sonuç: Hiçbir satışçının 1000 kişi için yapamayacağı kişisel dikkat</p>
        </div>
      </div>
    </div>
  )
}