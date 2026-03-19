'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Star, RefreshCw, Zap, TrendingUp, Award, ChevronDown, ChevronUp } from 'lucide-react'

export default function QualityV2Page() {
  const [topLeads, setTopLeads] = useState<any[]>([])
  const [distribution, setDistribution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async (grade = '') => {
    setLoading(true)
    try {
      const [top, dist] = await Promise.allSettled([
        api.get(`/api/quality-v2/top?limit=50${grade ? `&grade=${grade}` : ''}`),
        api.get('/api/quality-v2/distribution'),
      ])
      if (top.status === 'fulfilled') setTopLeads(top.value.leads || [])
      if (dist.status === 'fulfilled') setDistribution(dist.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const scoreAll = async () => {
    setScoring(true)
    try {
      const data = await api.post('/api/quality-v2/score-all', { limit: 50 })
      showMsg('success', data.message)
      setTimeout(() => load(gradeFilter), 5000)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setScoring(false) }
  }

  const scoreSingle = async (leadId: string) => {
    try {
      const data = await api.post(`/api/quality-v2/score/${leadId}`, {})
      showMsg('success', `${data.company}: ${data.scoring?.score}/100 (${data.scoring?.grade})`)
      load(gradeFilter)
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  const gradeColor: Record<string, string> = {
    A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    B: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    C: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    D: 'bg-red-500/20 text-red-300 border-red-500/40',
  }

  const priorityColor: Record<string, string> = {
    yuksek: 'text-emerald-400',
    orta: 'text-yellow-400',
    dusuk: 'text-slate-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star size={24} className="text-yellow-400" />
            Lead Quality Engine v2
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Claude AI ile 15+ faktör analizi — A/B/C/D sınıflandırma, öncelik sıralaması</p>
        </div>
        <button onClick={scoreAll} disabled={scoring}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
          {scoring ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
          {scoring ? 'Skorlanıyor...' : 'Tümünü Skorla'}
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Dağılım */}
      {distribution && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Ortalama Skor', value: `${distribution.avgScore}/100`, color: 'text-white', bg: 'bg-slate-800/50' },
            { label: 'A Sınıfı', value: distribution.distribution.A, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
            { label: 'B Sınıfı', value: distribution.distribution.B, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
            { label: 'C Sınıfı', value: distribution.distribution.C, color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' },
            { label: 'Yüksek Öncelik', value: distribution.priorities.yuksek, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} border border-slate-700 rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grade Filter */}
      <div className="flex gap-2">
        {['', 'A', 'B', 'C', 'D'].map(g => (
          <button key={g} onClick={() => { setGradeFilter(g); load(g) }}
            className={`px-4 py-1.5 rounded-lg text-sm border transition ${
              gradeFilter === g ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}>
            {g || 'Tümü'}
          </button>
        ))}
      </div>

      {/* Lead Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : topLeads.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Star size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-3">Henüz skorlanmış lead yok</p>
          <button onClick={scoreAll} disabled={scoring}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition">
            Tümünü Skorla
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {topLeads.map((lead: any) => (
            <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-3">
                {/* Skor */}
                <div className="text-center w-14 shrink-0">
                  <div className={`text-2xl font-bold ${
                    lead.score >= 80 ? 'text-emerald-400' :
                    lead.score >= 60 ? 'text-blue-400' :
                    lead.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{lead.score || 0}</div>
                  <div className="text-slate-500 text-xs">/ 100</div>
                </div>

                {/* Grade */}
                {lead.ai_grade && (
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border shrink-0 ${gradeColor[lead.ai_grade] || gradeColor.D}`}>
                    {lead.ai_grade}
                  </span>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{lead.company_name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    {lead.contact_name && <span>{lead.contact_name}</span>}
                    {lead.city && <span>{lead.city}</span>}
                    {lead.ai_priority && (
                      <span className={`font-medium ${priorityColor[lead.ai_priority]}`}>
                        {lead.ai_priority === 'yuksek' ? '🔥 Yüksek' : lead.ai_priority === 'orta' ? '⚡ Orta' : '💤 Düşük'} öncelik
                      </span>
                    )}
                  </div>
                </div>

                {/* Score bar */}
                <div className="w-24 shrink-0">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${
                      lead.score >= 80 ? 'bg-emerald-500' :
                      lead.score >= 60 ? 'bg-blue-500' :
                      lead.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} style={{ width: `${lead.score || 0}%` }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => scoreSingle(lead.id)}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition" title="Yeniden Skorla">
                    <RefreshCw size={13} />
                  </button>
                  <button onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                    {expanded === lead.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {/* Detay */}
              {expanded === lead.id && lead.scoringData && (
                <div className="border-t border-slate-700 p-5 space-y-4">
                  <div className="grid lg:grid-cols-3 gap-4">
                    {/* Breakdown */}
                    {lead.scoringData.breakdown && (
                      <div className="bg-slate-900/50 rounded-xl p-4">
                        <h3 className="text-white text-xs font-medium mb-3">📊 Skor Dağılımı</h3>
                        {Object.entries(lead.scoringData.breakdown).map(([key, val]: any) => (
                          <div key={key} className="flex justify-between mb-1.5">
                            <span className="text-slate-400 text-xs">{key}</span>
                            <span className="text-white text-xs font-medium">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Güçlü/Zayıf */}
                    <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                      {lead.scoringData.strengths?.length > 0 && (
                        <div>
                          <h3 className="text-emerald-400 text-xs font-medium mb-2">✅ Güçlü Yönler</h3>
                          {lead.scoringData.strengths.map((s: string, i: number) => (
                            <p key={i} className="text-slate-300 text-xs">• {s}</p>
                          ))}
                        </div>
                      )}
                      {lead.scoringData.weaknesses?.length > 0 && (
                        <div>
                          <h3 className="text-red-400 text-xs font-medium mb-2">⚠️ Zayıf Yönler</h3>
                          {lead.scoringData.weaknesses.map((w: string, i: number) => (
                            <p key={i} className="text-slate-300 text-xs">• {w}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Öneri */}
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <h3 className="text-yellow-400 text-xs font-medium mb-2">💡 AI Önerisi</h3>
                      <p className="text-slate-300 text-xs leading-relaxed">{lead.scoringData.recommendation}</p>
                      {lead.scoringData.estimatedValue && (
                        <div className="mt-3 p-2 bg-slate-800 rounded-lg">
                          <p className="text-slate-400 text-xs">Tahmini değer</p>
                          <p className="text-white text-sm font-medium capitalize">{lead.scoringData.estimatedValue}</p>
                        </div>
                      )}
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