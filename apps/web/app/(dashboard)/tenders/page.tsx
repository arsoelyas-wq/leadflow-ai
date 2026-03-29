'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  FileText, Search, RefreshCw, Globe, TrendingUp,
  CheckCircle, XCircle, Clock, Star, ChevronDown,
  ChevronUp, ExternalLink, Send, BarChart2, Filter
} from 'lucide-react'

const SOURCES = [
  { id: 'ekap', label: 'EKAP', flag: '🇹🇷' },
  { id: 'ted', label: 'TED Europa', flag: '🇪🇺' },
  { id: 'ungm', label: 'UNGM (BM)', flag: '🇺🇳' },
  { id: 'worldbank', label: 'World Bank', flag: '🌍' },
  { id: 'middleeast', label: 'Orta Doğu', flag: '🇦🇪' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  applied: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  won: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  lost: 'bg-red-500/20 text-red-300 border-red-500/30',
  dismissed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  applied: 'Başvuruldu',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
  dismissed: 'Reddedildi',
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/40'
  if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/40'
  return 'bg-red-500/20 border-red-500/40'
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [selectedTender, setSelectedTender] = useState<any>(null)
  const [generatingProposal, setGeneratingProposal] = useState(false)
  const [proposal, setProposal] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState('')
  const [showScan, setShowScan] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [scanForm, setScanForm] = useState({
    keyword: '',
    user_profile: '',
    sources: ['ekap', 'ted', 'ungm', 'worldbank', 'middleeast'],
  })

  const [filter, setFilter] = useState({ source: '', country: '', min_score: '' })

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter.source) params.set('source', filter.source)
      if (filter.country) params.set('country', filter.country)
      if (filter.min_score) params.set('min_score', filter.min_score)

      const [t, s, sc] = await Promise.allSettled([
        api.get(`/api/tenders?${params}`),
        api.get('/api/tenders/stats/summary'),
        api.get('/api/tenders/scans/history'),
      ])
      if (t.status === 'fulfilled') setTenders(t.value.tenders || [])
      if (s.status === 'fulfilled') setStats(s.value)
      if (sc.status === 'fulfilled') setScans(sc.value.scans || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startScan = async () => {
    if (!scanForm.keyword) return showMsg('error', 'Anahtar kelime zorunlu')
    if (scanForm.sources.length === 0) return showMsg('error', 'En az bir kaynak seçin')
    setScanning(true)
    try {
      await api.post('/api/tenders/scan', scanForm)
      showMsg('success', `"${scanForm.keyword}" için tarama başlatıldı. 1-2 dakika içinde sonuçlar gelecek.`)
      setShowScan(false)
      setTimeout(() => load(), 60000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setScanning(false) }
  }

  const toggleSource = (id: string) => {
    setScanForm(p => ({
      ...p,
      sources: p.sources.includes(id) ? p.sources.filter(s => s !== id) : [...p.sources, id],
    }))
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/tenders/${id}`, { status })
      setTenders(p => p.map(t => t.id === id ? { ...t, status } : t))
      if (selectedTender?.id === id) setSelectedTender((p: any) => ({ ...p, status }))
      showMsg('success', 'Durum güncellendi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const generateProposal = async () => {
    if (!companyInfo.trim()) return showMsg('error', 'Firma bilgisi zorunlu')
    setGeneratingProposal(true)
    setProposal(null)
    try {
      const data = await api.post(`/api/tenders/${selectedTender.id}/proposal`, { company_info: companyInfo })
      setProposal(data.proposal)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setGeneratingProposal(false) }
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText size={24} className="text-violet-400" /> İhale Avcısı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            EKAP · TED Europa · UNGM · World Bank · Orta Doğu — AI ile otomatik ihale taraması
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <Clock size={14} /> Geçmiş
          </button>
          <button onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowScan(!showScan)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl transition">
            <Search size={14} /> İhale Tara
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-white' },
            { label: 'Aktif', value: stats.active, color: 'text-emerald-400' },
            { label: 'Yüksek Skor', value: stats.highScore, color: 'text-violet-400' },
            { label: 'Başvuruldu', value: stats.applied, color: 'text-blue-400' },
            { label: 'Kazanıldı', value: stats.won, color: 'text-purple-400' },
            { label: 'Tarama', value: stats.totalScans, color: 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tarama Formu */}
      {showScan && (
        <div className="bg-slate-800/50 border border-violet-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Search size={16} className="text-violet-400" /> Yeni İhale Taraması
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Anahtar Kelime *</label>
              <input
                value={scanForm.keyword}
                onChange={e => setScanForm(p => ({ ...p, keyword: e.target.value }))}
                placeholder="tekstil, mobilya, inşaat..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Firma Profili (AI Skorlama için)</label>
              <input
                value={scanForm.user_profile}
                onChange={e => setScanForm(p => ({ ...p, user_profile: e.target.value }))}
                placeholder="tekstil ihracatı yapan Türk firması..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Kaynaklar</label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => (
                <button key={s.id}
                  onClick={() => toggleSource(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition ${scanForm.sources.includes(s.id) ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                  {s.flag} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={startScan} disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              {scanning ? 'Taranıyor...' : 'Taramayı Başlat'}
            </button>
            <button onClick={() => setShowScan(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Tarama Geçmişi */}
      {showHistory && scans.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Clock size={14} className="text-slate-400" /> Tarama Geçmişi
          </h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {scans.map(scan => (
              <div key={scan.id} className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${scan.status === 'completed' ? 'bg-emerald-400' : scan.status === 'running' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-white text-sm font-medium">"{scan.keyword}"</span>
                  <span className="text-slate-400 text-xs">{scan.sources?.join(', ')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{scan.tenders_found || 0} ihale</span>
                  <span>{new Date(scan.started_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 items-center">
        <Filter size={14} className="text-slate-400" />
        <select value={filter.source} onChange={e => setFilter(p => ({ ...p, source: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none">
          <option value="">Tüm Kaynaklar</option>
          {SOURCES.map(s => <option key={s.id} value={s.label}>{s.flag} {s.label}</option>)}
        </select>
        <select value={filter.min_score} onChange={e => setFilter(p => ({ ...p, min_score: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none">
          <option value="">Tüm Skorlar</option>
          <option value="75">75+ Yüksek</option>
          <option value="60">60+ Orta</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition">
          Filtrele
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* İhale Listesi */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold">İhaleler ({tenders.length})</h2>
          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <RefreshCw size={20} className="animate-spin text-slate-400" />
            </div>
          ) : tenders.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
              <FileText size={36} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">İhale bulunamadı</p>
              <p className="text-slate-500 text-xs mt-1">"İhale Tara" butonuna tıklayın</p>
            </div>
          ) : tenders.map(tender => (
            <div key={tender.id}
              onClick={() => { setSelectedTender(tender); setProposal(null) }}
              className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition ${selectedTender?.id === tender.id ? 'border-violet-500' : 'border-slate-700 hover:border-slate-500'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-snug line-clamp-2">{tender.title}</p>
                  <p className="text-slate-400 text-xs mt-1 truncate">{tender.institution}</p>
                </div>
                <div className={`flex-shrink-0 px-2 py-1 rounded-lg border text-xs font-bold ${scoreBg(tender.ai_score)}`}>
                  <span className={scoreColor(tender.ai_score)}>{tender.ai_score}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{tender.source}</span>
                <span className="text-xs text-slate-400">🌍 {tender.country}</span>
                {tender.budget_text && <span className="text-xs text-emerald-400">💰 {tender.budget_text}</span>}
                {tender.deadline && (
                  <span className="text-xs text-orange-400">
                    ⏰ {new Date(tender.deadline).toLocaleDateString('tr-TR')}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[tender.status] || STATUS_COLORS.active}`}>
                  {STATUS_LABELS[tender.status] || tender.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Seçili İhale Detayı */}
        {selectedTender ? (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-white font-semibold text-sm leading-snug">{selectedTender.title}</h2>
                {selectedTender.source_url && (
                  <a href={selectedTender.source_url} target="_blank" rel="noreferrer"
                    className="flex-shrink-0 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Kurum', value: selectedTender.institution },
                  { label: 'Kaynak', value: selectedTender.source },
                  { label: 'Ülke', value: selectedTender.country },
                  { label: 'Para Birimi', value: selectedTender.currency },
                  { label: 'Bütçe', value: selectedTender.budget_text || '—' },
                  { label: 'Son Başvuru', value: selectedTender.deadline ? new Date(selectedTender.deadline).toLocaleDateString('tr-TR') : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-slate-500">{label}</p>
                    <p className="text-slate-200">{value}</p>
                  </div>
                ))}
              </div>

              {/* AI Analizi */}
              {selectedTender.ai_summary && (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 space-y-1.5">
                  <p className="text-violet-300 text-xs font-semibold flex items-center gap-1">
                    <Star size={10} /> AI Analizi — Skor: <span className={`font-bold ${scoreColor(selectedTender.ai_score)}`}>{selectedTender.ai_score}/100</span>
                  </p>
                  <p className="text-slate-300 text-xs">{selectedTender.ai_summary}</p>
                  <p className="text-slate-400 text-xs">{selectedTender.ai_recommendation}</p>
                </div>
              )}

              {/* Durum Aksiyonları */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => updateStatus(selectedTender.id, 'applied')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs rounded-lg transition">
                  <Send size={11} /> Başvuruldu
                </button>
                <button onClick={() => updateStatus(selectedTender.id, 'won')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs rounded-lg transition">
                  <CheckCircle size={11} /> Kazanıldı
                </button>
                <button onClick={() => updateStatus(selectedTender.id, 'dismissed')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/20 hover:bg-slate-600/30 border border-slate-500/30 text-slate-400 text-xs rounded-lg transition">
                  <XCircle size={11} /> Reddet
                </button>
              </div>
            </div>

            {/* AI Teklif Taslağı */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <FileText size={14} className="text-violet-400" /> AI Teklif Taslağı
              </h3>
              <textarea
                value={companyInfo}
                onChange={e => setCompanyInfo(e.target.value)}
                placeholder="Firma adı, sektör, deneyim, sertifikalar, referanslar... (AI bu bilgileri kullanarak teklif yazar)"
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-violet-500 resize-none"
              />
              <button onClick={generateProposal} disabled={generatingProposal}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition w-full justify-center">
                {generatingProposal ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                {generatingProposal ? 'Teklif Hazırlanıyor...' : 'AI Teklif Taslağı Oluştur'}
              </button>

              {proposal && (
                <div className="bg-slate-900/80 border border-slate-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-violet-300 text-xs font-semibold">Teklif Taslağı</p>
                    <button onClick={() => navigator.clipboard.writeText(proposal)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition">
                      Kopyala
                    </button>
                  </div>
                  <pre className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {proposal}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center flex flex-col items-center justify-center">
            <BarChart2 size={36} className="text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm">Detay görmek için bir ihale seçin</p>
          </div>
        )}
      </div>
    </div>
  )
}