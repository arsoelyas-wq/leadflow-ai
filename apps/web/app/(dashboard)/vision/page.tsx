'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Eye, RefreshCw, Zap, Globe, ChevronDown, ChevronUp } from 'lucide-react'

export default function VisionPage() {
  const [analyzed, setAnalyzed] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [singleLead, setSingleLead] = useState('')
  const [analyzingSingle, setAnalyzingSingle] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [a, l] = await Promise.allSettled([api.get('/api/vision/analyzed'), api.get('/api/leads?limit=100')])
      if (a.status === 'fulfilled') setAnalyzed(a.value.leads || [])
      if (l.status === 'fulfilled') setLeads((l.value.leads || []).filter((l: any) => l.website))
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const analyzeAll = async () => {
    setAnalyzing(true)
    try {
      const data = await api.post('/api/vision/analyze-batch', { limit: 5 })
      showMsg('success', data.message)
      setTimeout(load, 8000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAnalyzing(false) }
  }

  const analyzeSingle = async () => {
    if (!singleLead) return
    setAnalyzingSingle(true)
    try {
      const data = await api.post('/api/vision/analyze-lead', { leadId: singleLead })
      showMsg('success', `${data.company} analiz edildi!`)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAnalyzingSingle(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Eye size={24} className="text-indigo-400" /> Vision Kişiselleştirme
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Claude Opus Vision ile web sitesi analizi → kişiselleştirilmiş mesaj</p>
        </div>
        <button onClick={analyzeAll} disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
          {analyzing ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
          {analyzing ? 'Analiz ediliyor...' : `Toplu Analiz (${leads.length} lead)`}
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Tek Analiz */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex gap-3">
        <select value={singleLead} onChange={e => setSingleLead(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
          <option value="">Website'i olan lead seçin</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} — {l.website}</option>)}
        </select>
        <button onClick={analyzeSingle} disabled={analyzingSingle || !singleLead}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm transition">
          {analyzingSingle ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />}
          {analyzingSingle ? 'Analiz...' : 'Analiz Et'}
        </button>
      </div>

      {/* Analiz Sonuçları */}
      {loading ? <div className="flex justify-center h-32 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div> :
        analyzed.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <Eye size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Henüz analiz edilmiş lead yok</p>
            <p className="text-slate-500 text-sm mt-1">Website'i olan leadler analiz edilebilir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyzed.map(lead => (
              <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{lead.company_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>🌐 {lead.website}</span>
                      {lead.analysis?.businessType && <span className="text-indigo-300">{lead.analysis.businessType}</span>}
                      {lead.analysis?.quality && <span className={lead.analysis.quality === 'premium' ? 'text-yellow-400' : 'text-slate-400'}>{lead.analysis.quality}</span>}
                    </div>
                  </div>
                  <button onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                    {expanded === lead.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {expanded === lead.id && lead.analysis && (
                  <div className="border-t border-slate-700 p-5 space-y-4">
                    <div className="grid lg:grid-cols-3 gap-4">
                      <div className="bg-slate-900/50 rounded-xl p-4 space-y-2">
                        <h3 className="text-indigo-300 text-xs font-medium">🎨 Görsel Analiz</h3>
                        <p className="text-white text-sm">{lead.analysis.style}</p>
                        <div className="flex gap-1">{(lead.analysis.primaryColors || []).map((c: string, i: number) => <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{c}</span>)}</div>
                        <p className="text-slate-400 text-xs">{lead.analysis.targetAudience}</p>
                      </div>
                      <div className="bg-slate-900/50 rounded-xl p-4 space-y-2">
                        <h3 className="text-red-300 text-xs font-medium">⚡ Pain Points</h3>
                        {(lead.analysis.painPoints || []).map((p: string, i: number) => <p key={i} className="text-slate-300 text-xs">• {p}</p>)}
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                        <h3 className="text-emerald-300 text-xs font-medium">💬 Kişisel Mesaj</h3>
                        <p className="text-white text-sm">{lead.analysis.personalizedMessage}</p>
                        <p className="text-slate-400 text-xs italic">{lead.analysis.icebreaker}</p>
                        <button onClick={() => navigator.clipboard.writeText(lead.analysis.personalizedMessage)}
                          className="px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg">
                          Kopyala
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}