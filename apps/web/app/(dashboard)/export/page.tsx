'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Globe2, RefreshCw, TrendingUp, Zap, ChevronDown, ChevronUp, Send } from 'lucide-react'

export default function ExportPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [singleLead, setSingleLead] = useState('')
  const [result, setResult] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [o, l] = await Promise.allSettled([
        api.get('/api/export/opportunities'),
        api.get('/api/leads?limit=100'),
      ])
      if (o.status === 'fulfilled') setOpportunities(o.value.leads || [])
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const analyzeBatch = async () => {
    setAnalyzing(true)
    try {
      const data = await api.post('/api/export/analyze-batch', {})
      showMsg('success', data.message)
      setTimeout(load, 5000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAnalyzing(false) }
  }

  const analyzeSingle = async () => {
    if (!singleLead) return
    try {
      const data = await api.post('/api/export/analyze-lead', { leadId: singleLead })
      setResult(data)
      showMsg('success', `${data.lead} analiz edildi!`)
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const readinessColor = (score: number) =>
    score >= 7 ? 'text-emerald-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe2 size={24} className="text-emerald-400" /> Global İhracat Zekası
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Sektöre göre ihracat fırsatları, pazar analizi ve aksiyon planı</p>
        </div>
        <button onClick={analyzeBatch} disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
          {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {analyzing ? 'Analiz ediliyor...' : 'Toplu Analiz'}
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Tek Analiz */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex gap-3">
        <select value={singleLead} onChange={e => setSingleLead(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
          <option value="">Lead seçin</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} {l.sector ? `— ${l.sector}` : ''}</option>)}
        </select>
        <button onClick={analyzeSingle} disabled={!singleLead}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
          Analiz Et
        </button>
      </div>

      {/* Tek analiz sonucu */}
      {result?.analysis && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{result.lead} — İhracat Analizi</h3>
            <span className={`text-2xl font-bold ${readinessColor(result.analysis.exportReadiness)}`}>
              {result.analysis.exportReadiness}/10
            </span>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-3">
              <p className="text-emerald-300 text-xs font-medium mb-2">🌍 Top Pazarlar</p>
              {result.analysis.topMarkets?.map((m: string, i: number) => <p key={i} className="text-white text-xs">• {m}</p>)}
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <p className="text-yellow-300 text-xs font-medium mb-2">⚡ Hızlı Kazanımlar</p>
              {result.analysis.quickWins?.map((q: string, i: number) => <p key={i} className="text-white text-xs">• {q}</p>)}
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <p className="text-blue-300 text-xs font-medium mb-2">💰 Tahmini Gelir</p>
              <p className="text-white text-sm font-bold">{result.analysis.estimatedRevenue}</p>
              <p className="text-slate-400 text-xs mt-2">İlk Adım: {result.analysis.firstStep}</p>
            </div>
          </div>
          {result.analysis.outreachMessage && (
            <div className="p-3 bg-slate-900 rounded-lg flex items-start justify-between gap-2">
              <p className="text-slate-300 text-sm">{result.analysis.outreachMessage}</p>
              <button onClick={() => navigator.clipboard.writeText(result.analysis.outreachMessage)}
                className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded shrink-0">Kopyala</button>
            </div>
          )}
          {result.targetMarkets?.slice(0, 3).map((m: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg text-xs">
              <p className="text-white font-medium w-28">{m.country}</p>
              <span className={`px-2 py-0.5 rounded-full ${m.demand === 'çok yüksek' ? 'bg-red-500/20 text-red-300' : m.demand === 'yüksek' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{m.demand}</span>
              <p className="text-slate-400">{m.avgOrderSize}</p>
              <p className="text-blue-300 flex-1">{m.tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fırsatlar Listesi */}
      {loading ? <div className="flex justify-center h-32 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div> :
        opportunities.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <Globe2 size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Analiz edilmiş lead yok</p>
            <p className="text-slate-500 text-sm mt-1">Toplu Analiz butonuna tıklayın</p>
          </div>
        ) : (
          <div className="space-y-2">
            {opportunities.map(lead => (
              <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{lead.company_name}</p>
                    <p className="text-slate-400 text-xs">{lead.sector} · {lead.city}</p>
                  </div>
                  {lead.analysis?.exportReadiness && (
                    <div className="text-center">
                      <p className={`text-xl font-bold ${readinessColor(lead.analysis.exportReadiness)}`}>
                        {lead.analysis.exportReadiness}/10
                      </p>
                      <p className="text-slate-500 text-xs">Hazırlık</p>
                    </div>
                  )}
                  {lead.analysis?.estimatedRevenue && (
                    <p className="text-emerald-400 text-sm font-medium">{lead.analysis.estimatedRevenue}</p>
                  )}
                  <button onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                    {expanded === lead.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                {expanded === lead.id && lead.analysis && (
                  <div className="border-t border-slate-700 px-5 py-4 space-y-2">
                    {lead.analysis.topMarkets && (
                      <div className="flex gap-2 flex-wrap">
                        {lead.analysis.topMarkets.map((m: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg">{m}</span>
                        ))}
                      </div>
                    )}
                    {lead.analysis.firstStep && <p className="text-slate-300 text-sm">→ {lead.analysis.firstStep}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}