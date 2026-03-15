'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Eye, RefreshCw, Globe, Star, AlertTriangle, TrendingUp, Zap, ChevronDown, ChevronUp, Plus } from 'lucide-react'

export default function ShadowPage() {
  const [competitors, setCompetitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState<string | null>(null)
  const [scanningAll, setScanningAll] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<Record<string, any>>({})
  const [websiteInputs, setWebsiteInputs] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/shadow/list')
      setCompetitors(data.competitors || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const scanOne = async (id: string) => {
    setScanning(id)
    try {
      const data = await api.post(`/api/shadow/scan/${id}`, {})
      setScanResult(prev => ({ ...prev, [id]: data }))
      setExpandedId(id)
      showMsg('success', `${data.competitor} tarandı! ${data.changes.length} değişiklik`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setScanning(null) }
  }

  const scanAll = async () => {
    setScanningAll(true)
    try {
      const data = await api.post('/api/shadow/scan-all', {})
      showMsg('success', `${data.scanned} rakip tarandı, ${data.changesDetected} değişiklik`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setScanningAll(false) }
  }

  const addWebsite = async (id: string) => {
    const website = websiteInputs[id]
    if (!website) return
    try {
      await api.post(`/api/shadow/add-website/${id}`, { website })
      showMsg('success', 'Website eklendi')
      setWebsiteInputs(prev => ({ ...prev, [id]: '' }))
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Eye size={24} className="text-indigo-400" />
            Shadow Competitor Monitoring
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Rakiplerinizi sürekli izleyin — fiyat, ürün, yorum ve strateji değişikliklerini anında fark edin</p>
        </div>
        <button onClick={scanAll} disabled={scanningAll || !competitors.length}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          {scanningAll ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {scanningAll ? 'Taranıyor...' : 'Tümünü Tara'}
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : competitors.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Eye size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-2">Takip edilecek rakip yok</p>
          <p className="text-slate-500 text-sm">Rakip Hijack sayfasından rakip ekleyin</p>
        </div>
      ) : (
        <div className="space-y-4">
          {competitors.map(comp => {
            const shadowData = comp.shadow_data ? JSON.parse(comp.shadow_data) : null
            const changes = comp.shadow_changes ? JSON.parse(comp.shadow_changes) : []
            const result = scanResult[comp.id]
            const isExpanded = expandedId === comp.id

            return (
              <div key={comp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <Eye size={18} className="text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{comp.name}</p>
                        {changes.length > 0 && (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                            <AlertTriangle size={10} /> {changes.length} değişiklik
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {comp.last_scanned_at && (
                          <span className="text-slate-500 text-xs">
                            Son tarama: {new Date(comp.last_scanned_at).toLocaleString('tr-TR')}
                          </span>
                        )}
                        {shadowData?.reviews?.avg > 0 && (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs">
                            <Star size={10} /> {shadowData.reviews.avg}/5
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => scanOne(comp.id)} disabled={scanning === comp.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs transition disabled:opacity-50">
                      {scanning === comp.id ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Tara
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : comp.id)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg transition">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Website yoksa ekle */}
                {!comp.website && !comp.shadow_data && (
                  <div className="px-5 pb-4 flex items-center gap-2">
                    <Globe size={14} className="text-slate-500" />
                    <input value={websiteInputs[comp.id] || ''} onChange={e => setWebsiteInputs(prev => ({ ...prev, [comp.id]: e.target.value }))}
                      placeholder="Website ekle (daha iyi analiz için)"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500" />
                    <button onClick={() => addWebsite(comp.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition">
                      Ekle
                    </button>
                  </div>
                )}

                {/* Değişiklikler özeti */}
                {changes.length > 0 && (
                  <div className="px-5 pb-3 flex flex-wrap gap-2">
                    {changes.slice(0, 3).map((change: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs rounded-lg">
                        {change}
                      </span>
                    ))}
                  </div>
                )}

                {/* Detay Panel */}
                {isExpanded && (shadowData || result) && (
                  <div className="border-t border-slate-700 p-5 space-y-5">
                    <div className="grid lg:grid-cols-3 gap-4">
                      {/* Fiyatlar */}
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                          💰 Fiyatlar
                        </h3>
                        {(result?.data?.pricing || shadowData?.pricing || []).length > 0 ? (
                          <div className="space-y-1">
                            {(result?.data?.pricing || shadowData?.pricing || []).slice(0, 5).map((p: string, i: number) => (
                              <p key={i} className="text-emerald-300 text-sm font-medium">{p}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs">Fiyat bulunamadı</p>
                        )}
                      </div>

                      {/* Ürünler */}
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                        <h3 className="text-white text-sm font-medium mb-3">📦 Ürünler/Hizmetler</h3>
                        {(result?.data?.products || shadowData?.products || []).length > 0 ? (
                          <div className="space-y-1">
                            {(result?.data?.products || shadowData?.products || []).slice(0, 4).map((p: string, i: number) => (
                              <p key={i} className="text-slate-300 text-xs">{p}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs">Bulunamadı</p>
                        )}
                      </div>

                      {/* Tech Stack + Sosyal */}
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                        <h3 className="text-white text-sm font-medium mb-3">🔧 Teknoloji & Sosyal</h3>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(result?.data?.techStack || shadowData?.techStack || []).map((t: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{t}</span>
                          ))}
                        </div>
                        <div className="space-y-1 text-xs">
                          {(result?.data?.social || shadowData?.social)?.instagram && (
                            <p className="text-pink-400">📸 Instagram</p>
                          )}
                          {(result?.data?.social || shadowData?.social)?.linkedin && (
                            <p className="text-blue-400">💼 LinkedIn</p>
                          )}
                        </div>
                        {(result?.data?.jobPostings || shadowData?.jobPostings || []).length > 0 && (
                          <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                            <TrendingUp size={11} /> İş ilanı var — büyüyor!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Son Şikayetler */}
                    {(result?.data?.reviews?.recent || shadowData?.reviews?.recent || []).length > 0 && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                        <h3 className="text-red-300 text-sm font-medium mb-2">⚠️ Son Şikayetler (Fırsat!)</h3>
                        <div className="space-y-1">
                          {(result?.data?.reviews?.recent || shadowData?.reviews?.recent || []).slice(0, 3).map((c: string, i: number) => (
                            <p key={i} className="text-slate-400 text-xs">• {c}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Insight */}
                    {result?.aiInsight && (
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                        <h3 className="text-indigo-300 text-sm font-medium mb-3 flex items-center gap-2">
                          <Zap size={14} /> AI Strateji Analizi
                        </h3>
                        <div className="space-y-2 text-sm">
                          {result.aiInsight.insight && <p className="text-slate-300">💡 {result.aiInsight.insight}</p>}
                          {result.aiInsight.opportunity && <p className="text-emerald-300">✅ Fırsat: {result.aiInsight.opportunity}</p>}
                          {result.aiInsight.threat && <p className="text-red-300">⚠️ Tehdit: {result.aiInsight.threat}</p>}
                        </div>
                      </div>
                    )}

                    {/* Değişiklikler */}
                    {(result?.changes || changes || []).length > 0 && (
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                        <h3 className="text-yellow-300 text-sm font-medium mb-2">🔄 Tespit Edilen Değişiklikler</h3>
                        <div className="space-y-1">
                          {(result?.changes || changes || []).map((c: string, i: number) => (
                            <p key={i} className="text-slate-300 text-xs">• {c}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}