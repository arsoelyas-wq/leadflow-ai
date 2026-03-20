'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Target, RefreshCw, Zap, Users, Code, BarChart3 } from 'lucide-react'

export default function MetaPage() {
  const [stats, setStats] = useState<any>(null)
  const [pixelCode, setPixelCode] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [eventName, setEventName] = useState('Lead')
  const [status, setStatus] = useState('')
  const [audienceName, setAudienceName] = useState('')
  const [audienceResult, setAudienceResult] = useState<any>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/meta/stats').then(setStats),
      api.get('/api/meta/pixel-code').then(setPixelCode),
      api.get('/api/leads?limit=100').then(d => setLeads(d.leads || [])),
    ]).finally(() => setLoading(false))
  }, [])

  const trackBatch = async () => {
    setTracking(true)
    try {
      const data = await api.post('/api/meta/track-batch', { eventName, status: status || undefined })
      showMsg('success', data.message)
      api.get('/api/meta/stats').then(setStats)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setTracking(false) }
  }

  const createAudience = async () => {
    try {
      const data = await api.post('/api/meta/custom-audience', { name: audienceName, status: status || undefined })
      setAudienceResult(data)
      showMsg('success', `${data.totalContacts} kişilik kitle hazır!`)
    } catch (e: any) { showMsg('error', e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target size={24} className="text-blue-400" /> Meta Behavioral Intent
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Meta Conversions API, Custom Audience ve Pixel entegrasyonu</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {!stats?.configured && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <p className="text-yellow-300 text-sm">⚠️ Meta Pixel yapılandırılmamış. Railway'e <code className="bg-slate-800 px-1 rounded">META_PIXEL_ID</code> ekleyin.</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
            <p className="text-slate-400 text-xs mt-1">30 Günde Gönderilen Event</p>
          </div>
          {Object.entries(stats.byEvent || {}).slice(0, 2).map(([event, count]: any) => (
            <div key={event} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{count}</p>
              <p className="text-slate-400 text-xs mt-1">{event}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Event Gönder */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Zap size={16} className="text-blue-400" /> Conversion Event Gönder
          </h2>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Event Tipi</label>
            <select value={eventName} onChange={e => setEventName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
              {['Lead', 'Contact', 'ViewContent', 'InitiateCheckout', 'Purchase', 'CompleteRegistration'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Lead Filtresi (opsiyonel)</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Tüm leadler</option>
              {['new', 'contacted', 'replied', 'won'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={trackBatch} disabled={tracking}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {tracking ? <RefreshCw size={14} className="animate-spin" /> : <Target size={14} />}
            {tracking ? 'Gönderiliyor...' : 'Toplu Event Gönder'}
          </button>
        </div>

        {/* Custom Audience */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Users size={16} className="text-purple-400" /> Custom Audience Oluştur
          </h2>
          <input value={audienceName} onChange={e => setAudienceName(e.target.value)}
            placeholder="Kitle adı (örn: Sıcak Leadler 2024)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
          <button onClick={createAudience} disabled={!audienceName}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            <Users size={14} /> Kitle Oluştur
          </button>
          {audienceResult && (
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl text-sm space-y-1">
              <p className="text-white font-medium">{audienceResult.audienceName}</p>
              <p className="text-slate-400">{audienceResult.totalContacts} kişi · {audienceResult.phones} telefon · {audienceResult.emails} email</p>
              <p className="text-yellow-300 text-xs mt-2">{audienceResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pixel Kodu */}
      {pixelCode && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Code size={16} className="text-slate-400" /> Meta Pixel Kodu
          </h2>
          <pre className="bg-slate-900 rounded-lg p-4 text-slate-300 text-xs overflow-x-auto">{pixelCode.code}</pre>
          <p className="text-slate-500 text-xs mt-2">Bu kodu sitenizin &lt;head&gt; bölümüne ekleyin</p>
        </div>
      )}
    </div>
  )
}