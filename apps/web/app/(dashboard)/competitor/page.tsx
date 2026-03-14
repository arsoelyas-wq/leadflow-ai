'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Target, Search, Users, TrendingUp, MessageSquare, AlertCircle, ChevronDown, ChevronUp, Globe, Instagram, Linkedin, Facebook } from 'lucide-react'

const CHANNELS = [
  { id: 'google', label: 'Google Maps', icon: '🗺️', desc: 'Yerel firmalar' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', desc: 'B2B firmalar' },
  { id: 'facebook', label: 'Facebook', icon: '📘', desc: 'Sosyal medya' },
  { id: 'instagram', label: 'Instagram', icon: '📸', desc: 'Sosyal medya' },
  { id: 'sikayetvar', label: 'Şikayetvar', icon: '😤', desc: 'TR şikayetler' },
  { id: 'international', label: 'Uluslararası', icon: '🌍', desc: 'Kompass, Europages' },
]

export default function CompetitorPage() {
  const [competitorName, setCompetitorName] = useState('')
  const [city, setCity] = useState('')
  const [targetSector, setTargetSector] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [selectedChannels, setSelectedChannels] = useState(['google', 'linkedin', 'sikayetvar'])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const toggleChannel = (id: string) => {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleHijack = async () => {
    if (!competitorName || !city) { showMsg('error', 'Rakip firma adı ve şehir zorunlu'); return }
    if (!selectedChannels.length) { showMsg('error', 'En az bir kanal seçin'); return }
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/api/competitor/hijack', {
        competitorName, city, targetSector, maxResults, channels: selectedChannels
      })
      setResult(data)
      showMsg('success', data.message)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!competitorName) return
    setAnalyzing(true)
    try {
      const data = await api.post('/api/competitor/analyze', { competitorName, city })
      setAnalysis(data)
      setShowAnalysis(true)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target size={24} className="text-red-400" />
          Rakip Hijacking
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Çok kanallı rakip analizi — Google Maps, LinkedIn, Facebook, Instagram, Şikayetvar ve daha fazlası</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <AlertCircle size={16} />
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Rakip Bilgileri</h2>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Rakip Firma Adı *</label>
            <input value={competitorName} onChange={e => setCompetitorName(e.target.value)}
              placeholder="örn: Çınar Duvar Panelleri"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Şehir *</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="örn: Bursa"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Hedef Sektör (opsiyonel)</label>
            <input value={targetSector} onChange={e => setTargetSector(e.target.value)}
              placeholder="örn: inşaat, mobilya, tekstil..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>

          {/* Kanal Seçimi */}
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Kanallar</label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map(ch => (
                <button key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition ${
                    selectedChannels.includes(ch.id)
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}>
                  <span>{ch.icon}</span>
                  <div className="text-left">
                    <p className="font-medium">{ch.label}</p>
                    <p className="text-slate-500 text-xs">{ch.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Maksimum Sonuç: {maxResults}</label>
            <input type="range" min={10} max={100} step={10}
              value={maxResults} onChange={e => setMaxResults(Number(e.target.value))}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-slate-600 text-xs mt-1">
              <span>10</span><span>100</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleAnalyze} disabled={analyzing || !competitorName}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">
              <Search size={14} />
              {analyzing ? 'Analiz...' : 'Rakip Analizi'}
            </button>
            <button onClick={handleHijack} disabled={loading || !competitorName || !city}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
              <Target size={14} />
              {loading ? 'Aranıyor...' : 'Lead Bul'}
            </button>
          </div>
        </div>

        {/* Rakip Analizi */}
        {analysis && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4 overflow-y-auto max-h-[600px]">
            <button onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full flex items-center justify-between text-white font-semibold">
              <span className="flex items-center gap-2">
                <TrendingUp size={16} className="text-yellow-400" />
                {analysis.competitor?.name || competitorName}
              </span>
              {showAnalysis ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAnalysis && (
              <div className="space-y-4">
                {/* Kanal verileri */}
                <div className="grid grid-cols-2 gap-2">
                  {analysis.channels?.googleMaps && (
                    <div className="bg-slate-900 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">🗺️ Google Maps</p>
                      <p className="text-white text-xs font-medium">⭐ {analysis.channels.googleMaps.rating || 'N/A'}</p>
                      <p className="text-slate-500 text-xs">{analysis.channels.googleMaps.reviewCount} yorum</p>
                    </div>
                  )}
                  {analysis.channels?.sikayetvar && (
                    <div className="bg-slate-900 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">😤 Şikayetvar</p>
                      <p className="text-red-400 text-xs font-medium">{analysis.channels.sikayetvar.complaintCount} şikayet</p>
                    </div>
                  )}
                  {analysis.channels?.trustpilot && (
                    <div className="bg-slate-900 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">⭐ Trustpilot</p>
                      <p className="text-white text-xs font-medium">{analysis.channels.trustpilot.rating || 'N/A'}/5</p>
                    </div>
                  )}
                  {analysis.channels?.linkedin && (
                    <div className="bg-slate-900 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">💼 LinkedIn</p>
                      <p className="text-white text-xs font-medium truncate">{analysis.channels.linkedin.name}</p>
                    </div>
                  )}
                </div>

                {analysis.analysis && (
                  <>
                    <div>
                      <p className="text-red-400 text-xs font-medium mb-1.5">⚠️ Zayıf Noktalar</p>
                      {analysis.analysis.weaknesses?.map((w: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300 mb-1">
                          <span className="text-red-500">•</span> {w}
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-emerald-400 text-xs font-medium mb-1.5">✅ Fırsatlar</p>
                      {analysis.analysis.opportunities?.map((o: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300 mb-1">
                          <span className="text-emerald-500">•</span> {o}
                        </div>
                      ))}
                    </div>

                    {analysis.analysis.customerComplaints?.length > 0 && (
                      <div>
                        <p className="text-orange-400 text-xs font-medium mb-1.5">😤 Müşteri Şikayetleri</p>
                        {analysis.analysis.customerComplaints.map((c: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-300 mb-1">
                            <span className="text-orange-500">•</span> {c}
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis.analysis.suggestedWhatsApp && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <p className="text-green-400 text-xs font-medium mb-1.5">💬 Önerilen WhatsApp</p>
                        <p className="text-slate-300 text-xs leading-relaxed">{analysis.analysis.suggestedWhatsApp}</p>
                      </div>
                    )}

                    {analysis.analysis.suggestedEmail && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-blue-400 text-xs font-medium mb-1.5">📧 Email Konusu</p>
                        <p className="text-slate-300 text-xs">{analysis.analysis.suggestedEmail}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sonuçlar */}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={15} className="text-blue-400" />
              Bulunan Leadler
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                {result.count}
              </span>
            </h2>
            {result.channelStats && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(result.channelStats).map(([ch, count]: any) => (
                  <span key={ch} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                    {ch}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
            {result.leads?.map((lead: any) => (
              <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-300 text-xs font-bold">
                    {lead.company_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{lead.company_name}</p>
                    <p className="text-slate-500 text-xs">{lead.source?.split('(')[1]?.replace(')', '') || 'Multi-channel'} · {lead.city}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold">{lead.score}/100</p>
                  <p className="text-slate-500 text-xs">{lead.phone ? '📞' : '🌐'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}