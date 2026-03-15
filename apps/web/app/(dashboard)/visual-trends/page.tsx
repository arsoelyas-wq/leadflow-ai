'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, Search, RefreshCw, Zap, MessageSquare, Instagram, Copy, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export default function VisualTrendPage() {
  const [keyword, setKeyword] = useState('')
  const [sector, setSector] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [trending, setTrending] = useState<any[]>([])
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsg(text)
    setTimeout(() => setCopiedMsg(null), 2000)
  }

  const loadHistory = async () => {
    const data = await api.get('/api/visual-trends/history').catch(() => ({ history: [] }))
    setHistory(data.history || [])
  }

  const loadTrending = async () => {
    const data = await api.get(`/api/visual-trends/trending${sector ? `?sector=${sector}` : ''}`).catch(() => ({ trending: [] }))
    setTrending(data.trending || [])
  }

  useEffect(() => {
    loadHistory()
    loadTrending()
  }, [])

  const analyze = async () => {
    if (!keyword) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/api/visual-trends/analyze', { keyword, sector, analyzeImages: true })
      setResult(data)
      loadHistory()
      showMsg('success', `${data.images?.length || 0} görsel bulundu, ${data.analyzedCount} analiz edildi!`)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const QUICK_KEYWORDS = ['dekorasyon', 'duvar panel', 'mobilya', 'ofis tasarım', 'iç mekan', 'aydınlatma']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles size={24} className="text-pink-400" />
          Visual Trend Catcher
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Pinterest & Google'dan trend görseller + Claude AI ile kampanya fikirleri</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Arama */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-slate-400 text-xs mb-1.5 block">Trend Arama Kelimesi *</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="örn: duvar panel, dekorasyon, mobilya..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Sektör (opsiyonel)</label>
            <input value={sector} onChange={e => setSector(e.target.value)}
              placeholder="örn: inşaat, mobilya"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        {/* Hızlı kelimeler */}
        <div className="flex flex-wrap gap-2">
          {QUICK_KEYWORDS.map(kw => (
            <button key={kw} onClick={() => setKeyword(kw)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                keyword === kw ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
              }`}>
              {kw}
            </button>
          ))}
        </div>

        <button onClick={analyze} disabled={loading || !keyword}
          className="w-full flex items-center justify-center gap-2 py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition">
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? 'Analiz ediliyor... (Claude Vision aktif)' : 'Trend Analiz Et'}
        </button>
      </div>

      {/* Sonuçlar */}
      {result && (
        <div className="space-y-6">
          {/* Trend Raporu */}
          {result.report && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-pink-400" />
                <h2 className="text-white font-semibold">AI Trend Raporu — {result.keyword}</h2>
              </div>

              {result.report.summary && (
                <p className="text-slate-300 text-sm leading-relaxed">{result.report.summary}</p>
              )}

              <div className="grid lg:grid-cols-3 gap-4">
                {/* Top Trendler */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-pink-300 text-xs font-medium mb-3">🔥 Yükselen Trendler</h3>
                  <div className="space-y-1.5">
                    {result.report.topTrends?.map((t: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-pink-500 text-xs font-bold">#{i+1}</span>
                        <span className="text-slate-300 text-xs">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Renkler & Stiller */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-blue-300 text-xs font-medium mb-3">🎨 Dominant Renkler & Stiller</h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {result.report.dominantColors?.map((c: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.report.dominantStyles?.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Fırsat */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-emerald-300 text-xs font-medium mb-3">💡 Pazar Fırsatı</h3>
                  <p className="text-slate-300 text-xs leading-relaxed">{result.report.marketOpportunity}</p>
                  {result.report.bestPostingTime && (
                    <p className="text-yellow-400 text-xs mt-2">⏰ {result.report.bestPostingTime}</p>
                  )}
                </div>
              </div>

              {/* Kampanya Fikirleri */}
              {result.report.campaignIdeas?.length > 0 && (
                <div>
                  <h3 className="text-white text-sm font-medium mb-3">🚀 Hazır Kampanya Fikirleri</h3>
                  <div className="grid lg:grid-cols-2 gap-3">
                    {result.report.campaignIdeas.map((idea: any, i: number) => (
                      <div key={i} className={`p-4 rounded-xl border ${
                        idea.channel === 'whatsapp' ? 'bg-green-500/5 border-green-500/20' : 'bg-blue-500/5 border-blue-500/20'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${idea.channel === 'whatsapp' ? 'text-green-300' : 'text-blue-300'}`}>
                            {idea.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'} — {idea.title}
                          </span>
                          <button onClick={() => copyText(idea.message)}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition">
                            <Copy size={11} />
                          </button>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">{idea.message}</p>
                        {idea.targetGroup && <p className="text-slate-500 text-xs mt-1">→ {idea.targetGroup}</p>}
                        {copiedMsg === idea.message && <p className="text-emerald-400 text-xs mt-1">✓ Kopyalandı!</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aksiyon Planı */}
              {result.report.actionPlan?.length > 0 && (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <h3 className="text-yellow-300 text-sm font-medium mb-2">📋 Bu Haftaki Aksiyon Planı</h3>
                  <div className="space-y-1">
                    {result.report.actionPlan.map((action: string, i: number) => (
                      <p key={i} className="text-slate-300 text-xs">✓ {action}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Görseller */}
          {result.images?.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">
                📸 Trend Görseller ({result.images.length})
              </h2>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {result.images.map((img: any) => (
                  <div key={img.id} className="group relative">
                    <a href={img.url || '#'} target="_blank" rel="noopener noreferrer">
                      <img src={img.imageUrl} alt={img.title}
                        className="w-full h-36 object-cover rounded-xl border border-slate-700 group-hover:border-pink-500/50 transition"
                        onError={(e: any) => e.target.style.display = 'none'} />
                    </a>
                    {img.aiAnalysis && (
                      <div className="absolute inset-0 bg-slate-900/90 rounded-xl opacity-0 group-hover:opacity-100 transition p-2 overflow-y-auto">
                        <p className="text-pink-300 text-xs font-bold">{img.aiAnalysis.trend}</p>
                        <p className="text-slate-300 text-xs mt-1">{img.aiAnalysis.style}</p>
                        {img.aiAnalysis.campaignIdea && (
                          <div className="mt-2">
                            <p className="text-green-300 text-xs">{img.aiAnalysis.campaignIdea}</p>
                            <button onClick={() => copyText(img.aiAnalysis.campaignIdea)}
                              className="mt-1 px-2 py-0.5 bg-green-600/30 text-green-300 text-xs rounded hover:bg-green-600/50 transition">
                              Kopyala
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-1">
                      <p className="text-slate-400 text-xs truncate">{img.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instagram Posts */}
          {result.instagramPosts?.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Instagram size={15} className="text-pink-400" /> Instagram Trendleri
              </h2>
              <div className="space-y-2">
                {result.instagramPosts.map((post: any, i: number) => (
                  <a key={i} href={post.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 bg-slate-900/50 hover:bg-slate-900 rounded-lg transition">
                    <Instagram size={14} className="text-pink-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white text-xs font-medium">{post.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{post.snippet}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Geçmiş Analizler */}
      {history.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-white font-semibold">Geçmiş Analizler</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {history.slice(0, 5).map(h => (
              <div key={h.id}>
                <button onClick={() => setExpandedHistory(expandedHistory === h.id ? null : h.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-700/20 transition">
                  <div className="flex items-center gap-3 text-left">
                    <Sparkles size={14} className="text-pink-400" />
                    <div>
                      <p className="text-white text-sm font-medium">{h.keyword}</p>
                      <p className="text-slate-500 text-xs">{new Date(h.analyzed_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>
                  {expandedHistory === h.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>
                {expandedHistory === h.id && h.report && (
                  <div className="px-5 pb-4 space-y-2">
                    {h.report.topTrends && (
                      <div className="flex flex-wrap gap-1">
                        {h.report.topTrends.map((t: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-pink-500/10 text-pink-300 text-xs rounded-full border border-pink-500/20">{t}</span>
                        ))}
                      </div>
                    )}
                    {h.report.summary && <p className="text-slate-400 text-xs">{h.report.summary}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}