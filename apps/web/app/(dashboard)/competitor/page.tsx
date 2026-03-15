'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Target, Search, Users, TrendingUp, Plus, Trash2, Play, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Clock, CheckCircle } from 'lucide-react'

const CHANNELS = [
  { id: 'google', label: 'Google Maps', icon: '🗺️' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'sikayetvar', label: 'Şikayetvar', icon: '😤' },
  { id: 'international', label: 'Uluslararası', icon: '🌍' },
]

export default function CompetitorPage() {
  const [tab, setTab] = useState<'list' | 'hijack' | 'leads'>('list')
  const [competitors, setCompetitors] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Yeni rakip formu
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newSector, setNewSector] = useState('')
  const [newChannels, setNewChannels] = useState(['google', 'linkedin'])
  const [autoScan, setAutoScan] = useState(true)

  // Hijack formu
  const [competitorName, setCompetitorName] = useState('')
  const [city, setCity] = useState('')
  const [targetSector, setTargetSector] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [selectedChannels, setSelectedChannels] = useState(['google', 'linkedin'])
  const [hijackResult, setHijackResult] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const loadCompetitors = async () => {
    try {
      const data = await api.get('/api/competitor/list')
      setCompetitors(data.competitors || [])
    } catch {}
  }

  const loadLeads = async () => {
    try {
      const data = await api.get('/api/competitor/leads')
      setLeads(data.leads || [])
    } catch {}
  }

  useEffect(() => {
    loadCompetitors()
    loadLeads()
  }, [])

  const addCompetitor = async () => {
    if (!newName) return
    try {
      await api.post('/api/competitor/list', {
        name: newName, city: newCity, sector: newSector,
        channels: newChannels, auto_scan: autoScan,
      })
      setNewName(''); setNewCity(''); setNewSector('')
      showMsg('success', 'Rakip eklendi!')
      loadCompetitors()
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  const deleteCompetitor = async (id: string) => {
    try {
      await api.delete(`/api/competitor/list/${id}`)
      setCompetitors(prev => prev.filter(c => c.id !== id))
      showMsg('success', 'Rakip silindi')
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  const scanCompetitor = async (id: string, name: string) => {
    setScanning(id)
    try {
      await api.post(`/api/competitor/scan/${id}`, { maxResults: 20 })
      showMsg('success', `${name} taranıyor... Yeni leadler eklenecek`)
      setTimeout(loadLeads, 5000)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setScanning(null)
    }
  }

  const scanAll = async () => {
    setLoading(true)
    try {
      const data = await api.post('/api/competitor/scan-all', {})
      showMsg('success', data.message)
      loadLeads()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHijack = async () => {
    if (!competitorName || !city) { showMsg('error', 'Rakip adı ve şehir zorunlu'); return }
    setLoading(true)
    setHijackResult(null)
    try {
      const data = await api.post('/api/competitor/hijack', {
        competitorName, city, targetSector, maxResults, channels: selectedChannels
      })
      setHijackResult(data)
      showMsg('success', data.message)
      loadLeads()
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

  const toggleChannel = (id: string, list: string[], setList: any) => {
    setList((prev: string[]) => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-red-400" />
            Rakip Hijacking
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Çok kanallı rakip analizi ve otomatik lead toplama</p>
        </div>
        {tab === 'list' && competitors.length > 0 && (
          <button onClick={scanAll} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Tümünü Tara
          </button>
        )}
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <AlertCircle size={16} />{msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'list', label: `Rakip Listesi (${competitors.length})` },
          { id: 'hijack', label: 'Hızlı Tarama' },
          { id: 'leads', label: `Bulunan Leadler (${leads.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* RAKİP LİSTESİ */}
      {tab === 'list' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Rakip Ekle */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Plus size={16} className="text-blue-400" /> Rakip Ekle
            </h2>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Rakip firma adı *"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            <div className="grid grid-cols-2 gap-3">
              <input value={newCity} onChange={e => setNewCity(e.target.value)}
                placeholder="Şehir"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input value={newSector} onChange={e => setNewSector(e.target.value)}
                placeholder="Sektör"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-2 block">Kanallar</label>
              <div className="grid grid-cols-3 gap-1.5">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => toggleChannel(ch.id, newChannels, setNewChannels)}
                    className={`flex items-center gap-1 p-2 rounded-lg border text-xs transition ${
                      newChannels.includes(ch.id) ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-slate-900/50 border-slate-700 text-slate-400'
                    }`}>
                    <span>{ch.icon}</span> {ch.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoScan} onChange={e => setAutoScan(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-700 peer-checked:bg-blue-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-slate-400 text-xs">Günlük otomatik tara</span>
              </div>
              <button onClick={addCompetitor} disabled={!newName}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                Ekle
              </button>
            </div>
          </div>

          {/* Rakip Listesi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">Takip Edilen Rakipler</h2>
            </div>
            {!competitors.length ? (
              <div className="p-12 text-center">
                <Target size={32} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Henüz rakip eklenmedi</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {competitors.map(comp => (
                  <div key={comp.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{comp.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {comp.city && <span className="text-slate-500 text-xs">📍 {comp.city}</span>}
                        {comp.sector && <span className="text-slate-500 text-xs">🏭 {comp.sector}</span>}
                        {comp.auto_scan && <span className="text-emerald-500 text-xs">⏰ Otomatik</span>}
                        <span className="text-blue-400 text-xs">{comp.total_leads_found || 0} lead</span>
                      </div>
                      {comp.last_scanned_at && (
                        <p className="text-slate-600 text-xs mt-0.5">
                          Son: {new Date(comp.last_scanned_at).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {(comp.channels || []).map((ch: string) => {
                          const channel = CHANNELS.find(c => c.id === ch)
                          return channel ? (
                            <span key={ch} className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">{channel.icon}</span>
                          ) : null
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => scanCompetitor(comp.id, comp.name)} disabled={scanning === comp.id}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition disabled:opacity-50">
                        {scanning === comp.id ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                      </button>
                      <button onClick={() => deleteCompetitor(comp.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HIZLI TARAMA */}
      {tab === 'hijack' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Hızlı Tarama</h2>
            <input value={competitorName} onChange={e => setCompetitorName(e.target.value)}
              placeholder="Rakip firma adı *"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            <div className="grid grid-cols-2 gap-3">
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Şehir *"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input value={targetSector} onChange={e => setTargetSector(e.target.value)} placeholder="Sektör"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-2 block">Kanallar</label>
              <div className="grid grid-cols-3 gap-1.5">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => toggleChannel(ch.id, selectedChannels, setSelectedChannels)}
                    className={`flex items-center gap-1 p-2 rounded-lg border text-xs transition ${
                      selectedChannels.includes(ch.id) ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-slate-900/50 border-slate-700 text-slate-400'
                    }`}>
                    <span>{ch.icon}</span> {ch.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Maksimum: {maxResults}</label>
              <input type="range" min={10} max={100} step={10} value={maxResults}
                onChange={e => setMaxResults(Number(e.target.value))} className="w-full accent-blue-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAnalyze} disabled={analyzing || !competitorName}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">
                <Search size={14} />{analyzing ? 'Analiz...' : 'Rakip Analizi'}
              </button>
              <button onClick={handleHijack} disabled={loading || !competitorName || !city}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
                <Target size={14} />{loading ? 'Aranıyor...' : 'Lead Bul'}
              </button>
            </div>
          </div>

          {/* Analiz veya Sonuç */}
          <div className="space-y-4">
            {analysis && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 max-h-80 overflow-y-auto">
                <button onClick={() => setShowAnalysis(!showAnalysis)}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm">
                  <span className="flex items-center gap-2"><TrendingUp size={15} className="text-yellow-400" />{analysis.competitor?.name || competitorName}</span>
                  {showAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showAnalysis && analysis.analysis && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {analysis.channels?.googleMaps && (
                        <div className="bg-slate-900 rounded-lg p-2 text-xs">
                          <p className="text-slate-400 mb-1">🗺️ Google</p>
                          <p className="text-white">⭐ {analysis.channels.googleMaps.rating || 'N/A'}</p>
                        </div>
                      )}
                      {analysis.channels?.sikayetvar && (
                        <div className="bg-slate-900 rounded-lg p-2 text-xs">
                          <p className="text-slate-400 mb-1">😤 Şikayetvar</p>
                          <p className="text-red-400">{analysis.channels.sikayetvar.complaintCount} şikayet</p>
                        </div>
                      )}
                    </div>
                    {analysis.analysis.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-red-400 text-xs font-medium mb-1">⚠️ Zayıf Noktalar</p>
                        {analysis.analysis.weaknesses.map((w: string, i: number) => (
                          <p key={i} className="text-slate-300 text-xs mb-0.5">• {w}</p>
                        ))}
                      </div>
                    )}
                    {analysis.analysis.suggestedWhatsApp && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2.5">
                        <p className="text-green-400 text-xs font-medium mb-1">💬 WhatsApp Taslağı</p>
                        <p className="text-slate-300 text-xs">{analysis.analysis.suggestedWhatsApp}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {hijackResult && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <p className="text-white font-semibold text-sm">{hijackResult.message}</p>
                </div>
                {hijackResult.skipped > 0 && (
                  <p className="text-slate-500 text-xs mb-3">⏭️ {hijackResult.skipped} tekrar atlandı (daha önce bulunmuş)</p>
                )}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {hijackResult.leads?.slice(0, 10).map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{lead.contact_name ? '👤' : '🏢'}</span>
                        <span className="text-white">{lead.company_name}</span>
                      </div>
                      <span className="text-blue-400">{lead.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULUNAN LEADLER */}
      {tab === 'leads' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={15} className="text-blue-400" />
              Rakip Kaynaklı Leadler
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">{leads.length}</span>
            </h2>
            <button onClick={loadLeads} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
              <RefreshCw size={14} />
            </button>
          </div>
          {!leads.length ? (
            <div className="p-12 text-center">
              <Users size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Henüz rakip kaynaklı lead yok</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
              {leads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      lead.contact_name ? 'bg-purple-500/10 text-purple-300' : 'bg-red-500/10 text-red-300'
                    }`}>
                      {lead.contact_name ? '👤' : (lead.company_name?.[0]?.toUpperCase() || '?')}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{lead.company_name}</p>
                      <p className="text-slate-500 text-xs">
                        {lead.source?.split('(')[1]?.replace(')', '') || 'Multi-channel'} · {lead.city}
                        {lead.phone && ` · 📞 ${lead.phone}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-bold">{lead.score}/100</p>
                    <p className="text-slate-600 text-xs">{new Date(lead.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}