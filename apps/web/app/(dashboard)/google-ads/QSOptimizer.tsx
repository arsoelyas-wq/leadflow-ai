'use client'
import { useState } from 'react'
import {
  RefreshCw, AlertTriangle, CheckCircle, X, ChevronDown, ChevronUp,
  BarChart2, Search, TrendingUp, Smartphone, Monitor,
  Tablet, Clock, FileText, Sparkles, Copy, Check, Target, Zap,
  ArrowUpRight, ArrowDownRight, Minus, DollarSign,
  Eye, MousePointer, Activity, Calendar, LayoutGrid,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

interface QSOptimizerProps {
  connected: boolean
}

type Section = 'qs' | 'searchterms' | 'impressionshare' | 'competitors' | 'devices' | 'schedule' | 'report'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'qs', label: 'QS Analizi', icon: '📊' },
  { id: 'searchterms', label: 'Arama Terimleri', icon: '🔍' },
  { id: 'impressionshare', label: 'Gösterim Payı', icon: '📈' },
  { id: 'competitors', label: 'Rakipler', icon: '🏆' },
  { id: 'devices', label: 'Cihazlar', icon: '📱' },
  { id: 'schedule', label: 'Zaman Planı', icon: '⏰' },
  { id: 'report', label: 'Haftalık Rapor', icon: '📄' },
]

export default function QSOptimizer({ connected }: QSOptimizerProps) {
  const [activeSection, setActiveSection] = useState<Section>('qs')
  const [loading, setLoading] = useState<string | null>(null)
  const [qsData, setQsData] = useState<{ keywords: any[]; summary: any } | null>(null)
  const [improvements, setImprovements] = useState<any[]>([])
  const [searchTerms, setSearchTerms] = useState<any[]>([])
  const [searchTermStats, setSearchTermStats] = useState<any>(null)
  const [impressionShare, setImpressionShare] = useState<any[]>([])
  const [competitors, setCompetitors] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [deviceRecs, setDeviceRecs] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [stFilter, setStFilter] = useState<'all' | 'keyword' | 'negative' | 'review'>('all')
  const [processedTerms, setProcessedTerms] = useState<Set<string>>(new Set())

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // ── Load Functions ───────────────────────────────────────────────────────────

  async function loadQS() {
    setLoading('qs')
    try {
      const r = await fetch(`${API}/api/google-optimizer/quality-scores`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.keywords) {
        setQsData({ keywords: d.keywords || [], summary: d.summary || {} })
      } else {
        showMsg('error', d.error || 'QS verileri alınamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Bağlantı hatası: ' + e.message)
    }
    setLoading(null)
  }

  async function runImproveQS() {
    if (!qsData) return
    const lowQS = qsData.keywords.filter((k: any) => (k.quality_score || k.qs || 0) < 7)
    if (lowQS.length === 0) return showMsg('error', 'Tüm kelimeler zaten QS 7+')
    setLoading('improve')
    try {
      const r = await fetch(`${API}/api/google-optimizer/improve-qs`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ keywords: lowQS }),
      })
      const d = await r.json()
      if (d.ok || d.improvements) {
        setImprovements(d.improvements || [])
        showMsg('success', `${d.improvements?.length || 0} kelime için iyileştirme önerisi hazırlandı!`)
      } else {
        showMsg('error', d.error || 'İyileştirme başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function mineSearchTerms() {
    setLoading('searchterms')
    try {
      const r = await fetch(`${API}/api/google-optimizer/search-terms/mine`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({}),
      })
      const d = await r.json()
      if (d.ok || d.search_terms) {
        setSearchTerms(d.search_terms || [])
        setSearchTermStats(d.stats || null)
        showMsg('success', `${d.search_terms?.length || 0} arama terimi bulundu`)
      } else {
        showMsg('error', d.error || 'Arama terimleri alınamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function applySearchTerm(action: 'keyword' | 'negative', term: any) {
    setLoading('apply_' + (term.search_term || term.term))
    try {
      const r = await fetch(`${API}/api/google-optimizer/search-terms/apply`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ action, term }),
      })
      const d = await r.json()
      if (d.ok) {
        setProcessedTerms(prev => new Set([...prev, term.search_term || term.term]))
        showMsg('success', action === 'keyword' ? 'Anahtar kelime eklendi!' : 'Negatif kelime eklendi!')
      } else {
        showMsg('error', d.error || 'İşlem başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function loadImpressionShare() {
    setLoading('impressionshare')
    try {
      const r = await fetch(`${API}/api/google-optimizer/impression-share`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.campaigns) {
        setImpressionShare(d.campaigns || [])
      } else {
        showMsg('error', d.error || 'Gösterim payı alınamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function loadCompetitors() {
    setLoading('competitors')
    try {
      const r = await fetch(`${API}/api/google-optimizer/auction-insights`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.competitors) {
        setCompetitors(d.competitors || [])
      } else {
        showMsg('error', d.error || 'Rakip verileri alınamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function loadDevices() {
    setLoading('devices')
    try {
      const r = await fetch(`${API}/api/google-optimizer/device-performance`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.devices) {
        setDevices(d.devices || [])
        setDeviceRecs(d.recommendations || [])
      } else {
        showMsg('error', d.error || 'Cihaz verileri alınamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function loadSchedule() {
    setLoading('schedule')
    try {
      const r = await fetch(`${API}/api/google-optimizer/schedule-performance`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.schedule) {
        setSchedule(d.schedule || d)
      } else {
        showMsg('error', d.error || 'Zaman verileri alınamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  async function generateReport() {
    setLoading('report')
    try {
      const r = await fetch(`${API}/api/google-optimizer/weekly-report`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({}),
      })
      const d = await r.json()
      if (d.ok || d.report) {
        setReport(d.report || d)
        showMsg('success', 'Haftalık rapor oluşturuldu!')
      } else {
        showMsg('error', d.error || 'Rapor oluşturulamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLoading(null)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function qsColor(qs: number) {
    if (qs <= 4) return 'text-red-400 bg-red-500/15 border-red-500/30'
    if (qs <= 6) return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
  }

  function qsTextColor(qs: number) {
    if (qs <= 4) return 'text-red-400'
    if (qs <= 6) return 'text-amber-400'
    return 'text-emerald-400'
  }

  function componentIcon(rating: string) {
    if (rating === 'ABOVE_AVERAGE') return <Check className="w-3.5 h-3.5 text-emerald-400" />
    if (rating === 'BELOW_AVERAGE') return <X className="w-3.5 h-3.5 text-red-400" />
    if (rating === 'AVERAGE') return <Minus className="w-3.5 h-3.5 text-amber-400" />
    return <Minus className="w-3.5 h-3.5 text-slate-600" />
  }

  function stRecommendationBadge(rec: string) {
    if (rec === 'ADD_AS_KEYWORD' || rec === 'keyword')
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Kelime Ekle</span>
    if (rec === 'ADD_AS_NEGATIVE' || rec === 'negative')
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">Negatif Ekle</span>
    if (rec === 'REVIEW' || rec === 'review')
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">İncele</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700 text-slate-500 border border-slate-600/50">Yeterli</span>
  }

  function threatBadge(level: string) {
    if (level === 'high' || level === 'HIGH')
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">Yüksek</span>
    if (level === 'medium' || level === 'MEDIUM')
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">Orta</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Düşük</span>
  }

  function deviceIcon(device: string) {
    const d = (device || '').toLowerCase()
    if (d.includes('mobile') || d.includes('mobil')) return <Smartphone className="w-5 h-5 text-amber-400" />
    if (d.includes('tablet')) return <Tablet className="w-5 h-5 text-blue-400" />
    return <Monitor className="w-5 h-5 text-emerald-400" />
  }

  function deviceBidBadge(rec: string | undefined) {
    if (!rec) return null
    if (rec.includes('+')) return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Teklifi Artır {rec}</span>
    if (rec.includes('-')) return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25">Teklifi Düşür {rec}</span>
    if (rec.toLowerCase().includes('hariç') || rec.toLowerCase().includes('exclu')) return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-700 text-slate-400 border border-slate-600/50">Hariç Tut</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-700 text-slate-400 border border-slate-600/50">{rec}</span>
  }

  function heatColor(count: number) {
    if (count === 0) return 'bg-slate-800 text-slate-600'
    if (count <= 1) return 'bg-amber-900/30 text-amber-600'
    if (count <= 3) return 'bg-amber-600/30 text-amber-400'
    return 'bg-emerald-600/30 text-emerald-400'
  }

  // QS summary calculations
  const keywords = qsData?.keywords || []
  const avgQS = keywords.length > 0
    ? Math.round(keywords.reduce((s: number, k: any) => s + (k.quality_score || k.qs || 0), 0) / keywords.length * 10) / 10
    : 0
  const belowSix = keywords.filter((k: any) => (k.quality_score || k.qs || 0) < 6).length
  const belowSeven = keywords.filter((k: any) => (k.quality_score || k.qs || 0) < 7).length
  const healthScore = keywords.length > 0
    ? Math.round((keywords.filter((k: any) => (k.quality_score || k.qs || 0) >= 7).length / keywords.length) * 100)
    : 0
  const savingsPotential = keywords.reduce((s: number, k: any) => {
    const qs = k.quality_score || k.qs || 0
    const spend = parseFloat(k.spend || k.cost || 0)
    if (qs < 7) return s + spend * 0.15
    return s
  }, 0)

  // Filtered search terms
  const filteredTerms = searchTerms.filter(t => {
    if (stFilter === 'all') return true
    const rec = (t.recommendation || t.action || '').toLowerCase()
    if (stFilter === 'keyword') return rec.includes('keyword') || rec === 'add_as_keyword'
    if (stFilter === 'negative') return rec.includes('negative') || rec === 'add_as_negative'
    if (stFilter === 'review') return rec.includes('review') || rec === 'review'
    return true
  })

  const toAddKw = searchTerms.filter(t => {
    const rec = (t.recommendation || t.action || '').toLowerCase()
    return rec.includes('keyword') || rec === 'add_as_keyword'
  }).length
  const toAddNeg = searchTerms.filter(t => {
    const rec = (t.recommendation || t.action || '').toLowerCase()
    return rec.includes('negative') || rec === 'add_as_negative'
  }).length
  const negSavings = searchTerms
    .filter(t => {
      const rec = (t.recommendation || t.action || '').toLowerCase()
      return rec.includes('negative') || rec === 'add_as_negative'
    })
    .reduce((s: number, t: any) => s + parseFloat(t.cost || t.spend || 0), 0)

  const filterTabs: { key: 'all' | 'keyword' | 'negative' | 'review'; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'keyword', label: 'Anahtar Kelime Ekle' },
    { key: 'negative', label: 'Negatif Ekle' },
    { key: 'review', label: 'İncele' },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 mt-5">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${msg.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-red-500/30 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/25 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm">QS Optimizer & Analiz</h2>
          <p className="text-slate-500 text-xs">AI destekli kalite puanı ve performans optimizasyonu</p>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeSection === s.id
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20'
                : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-base leading-none">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Not Connected State */}
      {!connected && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Google Ads hesabınızı bağlayın</p>
              <p className="text-slate-400 text-xs mt-0.5">QS Optimizer, Arama Terimleri, Gösterim Payı ve diğer optimizasyon araçlarını kullanmak için Google Ads hesabınızın bağlı olması gerekiyor.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── QS SECTION ─────────────────────────────────────────────────────────── */}
      {activeSection === 'qs' && connected && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {qsData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Average QS */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Ortalama QS</p>
                <p className={`text-3xl font-bold ${qsTextColor(avgQS)}`}>{avgQS > 0 ? avgQS : '--'}</p>
                <p className="text-slate-600 text-xs mt-1">/ 10</p>
              </div>
              {/* Below 6 */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">QS 6 Altı</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-red-400">{belowSix}</span>
                  <span className="text-slate-500 text-xs mb-1">kelime</span>
                </div>
                <p className="text-red-400/70 text-xs mt-1">CPC'nizi artırıyor</p>
              </div>
              {/* Health Score */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Hesap Sağlığı</p>
                <p className={`text-3xl font-bold ${healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{healthScore}%</p>
                <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${healthScore >= 70 ? 'bg-emerald-500' : healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>
              {/* Savings */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Tasarruf Potansiyeli</p>
                <p className="text-3xl font-bold text-emerald-400">${savingsPotential.toFixed(0)}</p>
                <p className="text-slate-500 text-xs mt-1">tasarruf mümkün</p>
              </div>
            </div>
          )}

          {/* AI Düzelt Button */}
          {qsData && (
            <div className="flex items-center gap-3">
              <button
                onClick={runImproveQS}
                disabled={loading === 'improve' || belowSeven === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-900/20"
              >
                {loading === 'improve' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading === 'improve' ? 'AI Analiz Ediyor...' : `AI ile Düzelt (${belowSeven} kelime)`}
              </button>
              {improvements.length > 0 && (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  {improvements.length} iyileştirme hazır
                </span>
              )}
            </div>
          )}

          {/* Keyword Table */}
          {qsData ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/60">
                <p className="text-sm font-medium text-white">{keywords.length} Anahtar Kelime</p>
              </div>
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2.5 border-b border-slate-700/30 bg-slate-800/40">
                {['Kelime', 'Eşleme', 'QS', 'CTR', 'Alaka', 'Açılış', 'Gösterim', 'Harcama', ''].map((h, i) => (
                  <p key={i} className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-slate-700/30">
                {keywords.map((kw: any, i: number) => {
                  const kwId = kw.id || kw.keyword_text || String(i)
                  const qs = kw.quality_score || kw.qs || 0
                  const isExpanded = expandedKeyword === kwId
                  const imp = improvements.find(
                    (imp: any) => imp.keyword === kw.keyword_text || imp.keyword === kw.text || imp.keyword_id === kw.id
                  )
                  return (
                    <div key={kwId}>
                      <div
                        className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 hover:bg-slate-700/15 transition cursor-pointer items-center"
                        onClick={() => setExpandedKeyword(isExpanded ? null : kwId)}
                      >
                        <p className="text-white text-sm font-medium truncate">{kw.keyword_text || kw.text || kw.keyword}</p>
                        <p className="text-slate-400 text-xs truncate">{kw.match_type || kw.matchType || '--'}</p>
                        <div>
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${qsColor(qs)}`}>
                            {qs || '--'}
                          </span>
                        </div>
                        <div>{componentIcon(kw.expected_ctr || kw.expectedCtr)}</div>
                        <div>{componentIcon(kw.ad_relevance || kw.adRelevance)}</div>
                        <div>{componentIcon(kw.landing_page_experience || kw.landingPageExperience)}</div>
                        <p className="text-slate-400 text-xs">{parseInt(kw.impressions || 0).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">${parseFloat(kw.cost || kw.spend || 0).toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>
                      {/* Expanded improvement panel */}
                      {isExpanded && (
                        <div className="mx-5 mb-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
                          {imp ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-300 text-sm font-medium">AI İyileştirme Önerileri</span>
                                {imp.expected_qs_after && (
                                  <span className="ml-auto text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg">
                                    QS → {imp.expected_qs_after} bekleniyor
                                  </span>
                                )}
                              </div>
                              {imp.tip && (
                                <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                                  <p className="text-xs text-slate-500 mb-1 uppercase font-medium">İpucu</p>
                                  <p className="text-slate-300 text-sm">{imp.tip}</p>
                                </div>
                              )}
                              {imp.new_headlines?.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2 uppercase font-medium">Yeni Başlıklar</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {imp.new_headlines.map((h: string, hi: number) => (
                                      <button
                                        key={hi}
                                        onClick={() => copyText(h)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-xs text-slate-300 hover:text-white transition group"
                                      >
                                        {copiedText === h ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />}
                                        {h}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {imp.new_descriptions?.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2 uppercase font-medium">Yeni Açıklamalar</p>
                                  {imp.new_descriptions.map((d: string, di: number) => (
                                    <div key={di} className="flex items-start gap-2 p-2.5 bg-slate-800 border border-slate-700 rounded-lg mb-1.5 group">
                                      <p className="text-slate-300 text-sm flex-1">{d}</p>
                                      <button onClick={() => copyText(d)} className="shrink-0 p-1 text-slate-600 hover:text-slate-400 transition">
                                        {copiedText === d ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {imp.negative_keywords?.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2 uppercase font-medium">Negatif Kelime Önerileri</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {imp.negative_keywords.map((nk: string, ni: number) => (
                                      <span key={ni} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{nk}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-slate-500 text-sm">
                                {belowSeven > 0
                                  ? '"AI ile Düzelt" butonuna tıklayarak bu kelime için öneri alın.'
                                  : 'Bu kelime QS 7+ - iyileştirme önerisi gerekmez.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {keywords.length === 0 && (
                  <div className="py-10 text-center">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                    <p className="text-slate-500 text-sm">Anahtar kelime verisi bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-4">QS verilerini analiz edin</p>
              <button
                onClick={loadQS}
                disabled={loading === 'qs'}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition mx-auto"
              >
                {loading === 'qs' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {loading === 'qs' ? 'Yükleniyor...' : 'QS Verilerini Çek'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH TERMS SECTION ────────────────────────────────────────────────── */}
      {activeSection === 'searchterms' && connected && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Arama Terimleri</h3>
              <p className="text-slate-500 text-xs mt-0.5">Hangi aramalarda göründüğünüzü keşfedin ve optimize edin</p>
            </div>
            <button
              onClick={mineSearchTerms}
              disabled={loading === 'searchterms'}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {loading === 'searchterms' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading === 'searchterms' ? 'Taranıyor...' : 'Arama Terimlerini Tara'}
            </button>
          </div>

          {searchTerms.length > 0 ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-1 uppercase font-medium">Bulunan</p>
                  <p className="text-2xl font-bold text-white">{searchTerms.length}</p>
                  <p className="text-slate-500 text-xs mt-0.5">arama terimi</p>
                </div>
                <div className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-1 uppercase font-medium">Kelime Ekle</p>
                  <p className="text-2xl font-bold text-emerald-400">{toAddKw}</p>
                  <p className="text-slate-500 text-xs mt-0.5">potansiyel kelime</p>
                </div>
                <div className="bg-slate-800/40 border border-red-500/20 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-1 uppercase font-medium">Negatif Ekle</p>
                  <p className="text-2xl font-bold text-red-400">{toAddNeg}</p>
                  <p className="text-emerald-400 text-xs mt-0.5">Potansiyel tasarruf: ${negSavings.toFixed(2)}</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 w-fit overflow-x-auto">
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStFilter(tab.key)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${stFilter === tab.key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-2.5 border-b border-slate-700/30 bg-slate-800/60">
                  {['Arama Terimi', 'Gösterim', 'Tıklama', 'Harcama', 'Dönüşüm', 'CTR', 'Öneri', 'İşlem'].map((h, i) => (
                    <p key={i} className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-slate-700/30">
                  {filteredTerms.map((term: any, i: number) => {
                    const termKey = term.search_term || term.term || String(i)
                    const rec = term.recommendation || term.action || ''
                    const isProcessed = processedTerms.has(termKey)
                    const isApplying = loading === 'apply_' + termKey
                    return (
                      <div key={termKey} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-slate-700/10 transition ${isProcessed ? 'opacity-50' : ''}`}>
                        <p className="text-white text-sm truncate">{termKey}</p>
                        <p className="text-slate-400 text-xs">{parseInt(term.impressions || 0).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">{parseInt(term.clicks || 0).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">${parseFloat(term.cost || term.spend || 0).toFixed(2)}</p>
                        <p className="text-slate-400 text-xs">{term.conversions || 0}</p>
                        <p className="text-slate-400 text-xs">{parseFloat(term.ctr || 0).toFixed(2)}%</p>
                        <div>{stRecommendationBadge(rec)}</div>
                        <div className="flex items-center gap-1">
                          {isProcessed ? (
                            <span className="text-xs text-slate-600 flex items-center gap-1"><Check className="w-3 h-3" /> Yapıldı</span>
                          ) : isApplying ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <>
                              {(rec.toLowerCase().includes('keyword') || rec === 'add_as_keyword') && (
                                <button onClick={() => applySearchTerm('keyword', term)} className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 rounded-lg text-xs transition">Ekle</button>
                              )}
                              {(rec.toLowerCase().includes('negative') || rec === 'add_as_negative') && (
                                <button onClick={() => applySearchTerm('negative', term)} className="px-2 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 rounded-lg text-xs transition">Negatif</button>
                              )}
                              {!rec.toLowerCase().includes('keyword') && !rec.toLowerCase().includes('negative') && (
                                <button onClick={() => setProcessedTerms(prev => new Set([...prev, termKey]))} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-400 rounded-lg text-xs transition">Yoksay</button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-1">Arama terimlerini tarayın</p>
              <p className="text-slate-600 text-xs">Reklamlarınızın hangi aramalarda göründüğünü keşfedin</p>
            </div>
          )}
        </div>
      )}

      {/* ── IMPRESSION SHARE SECTION ─────────────────────────────────────────────── */}
      {activeSection === 'impressionshare' && connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Gösterim Payı</h3>
              <p className="text-slate-500 text-xs mt-0.5">Kampanyalarınızın kaçırdığı fırsatları görün</p>
            </div>
            <button
              onClick={loadImpressionShare}
              disabled={loading === 'impressionshare'}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {loading === 'impressionshare' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {loading === 'impressionshare' ? 'Yükleniyor...' : 'Verileri Çek'}
            </button>
          </div>

          {impressionShare.length > 0 ? (
            <div className="space-y-3">
              {impressionShare.map((camp: any, i: number) => {
                const captured = parseFloat(camp.impression_share || camp.impressionShare || 0)
                const lostBudget = parseFloat(camp.lost_budget || camp.lostBudget || 0)
                const lostRank = parseFloat(camp.lost_rank || camp.lostRank || 0)
                return (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{camp.campaign_name || camp.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${camp.status === 'ENABLED' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-700/50'}`}>
                          {camp.status === 'ENABLED' ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p className={`text-2xl font-bold ${captured >= 70 ? 'text-emerald-400' : captured >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{captured.toFixed(1)}%</p>
                    </div>
                    {/* Visual Bar */}
                    <div>
                      <div className="w-full h-3 bg-slate-700/60 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full rounded-l-full transition-all" style={{ width: `${Math.min(captured, 100)}%` }} />
                        <div className="bg-red-500/70 h-full transition-all" style={{ width: `${Math.min(lostBudget, 100 - captured)}%` }} />
                        <div className="bg-amber-500/70 h-full rounded-r-full transition-all" style={{ width: `${Math.min(lostRank, 100 - captured - lostBudget)}%` }} />
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Yakalanan: {captured.toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1.5 text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-500/70 inline-block" />
                          Bütçe kaybı: {lostBudget.toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500/70 inline-block" />
                          Sıra kaybı: {lostRank.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Recommendation */}
                    {camp.recommendation && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-amber-300 text-xs">{camp.recommendation}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-1">Gösterim payı verisi yok</p>
              <p className="text-slate-600 text-xs">Kampanyalarınızın pazar payını analiz edin</p>
            </div>
          )}
        </div>
      )}

      {/* ── COMPETITORS SECTION ──────────────────────────────────────────────────── */}
      {activeSection === 'competitors' && connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Rakip Analizi</h3>
              <p className="text-slate-500 text-xs mt-0.5">Açık artırma verileriyle rakiplerinizi takip edin</p>
            </div>
            <button
              onClick={loadCompetitors}
              disabled={loading === 'competitors'}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {loading === 'competitors' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {loading === 'competitors' ? 'Yükleniyor...' : 'Rakip Verilerini Çek'}
            </button>
          </div>

          {competitors.length > 0 ? (
            <div className="space-y-4">
              {/* Table */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-2.5 border-b border-slate-700/30 bg-slate-800/60">
                  {['Rakip Domain', 'Gösterim Payı', 'Örtüşme', 'Üstte Çıkma', 'Sayfa Başı', 'Tehdit'].map((h, i) => (
                    <p key={i} className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-slate-700/30">
                  {competitors.map((comp: any, i: number) => {
                    const is = parseFloat(comp.impression_share || comp.impressionShare || 0)
                    const overlap = parseFloat(comp.overlap_rate || comp.overlapRate || 0)
                    return (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 items-center hover:bg-slate-700/10 transition">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium shrink-0">
                            {(comp.domain || comp.competitor || '?')[0].toUpperCase()}
                          </div>
                          <p className="text-white text-sm truncate">{comp.domain || comp.competitor}</p>
                        </div>
                        <p className="text-white font-semibold text-sm">{is.toFixed(1)}%</p>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${overlap}%` }} />
                            </div>
                            <span className="text-slate-400 text-xs w-10 text-right">{overlap.toFixed(0)}%</span>
                          </div>
                        </div>
                        <p className="text-slate-400 text-xs">{parseFloat(comp.outranking_share || comp.outrankingShare || 0).toFixed(1)}%</p>
                        <p className="text-slate-400 text-xs">{parseFloat(comp.top_of_page_rate || comp.topOfPageRate || 0).toFixed(1)}%</p>
                        <div>{threatBadge(comp.threat_level || comp.threatLevel || 'low')}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Insight Card */}
              {competitors[0] && (
                <div className="bg-slate-800/40 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <p className="text-amber-300 text-sm font-medium">AI Rakip Analizi</p>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    En güçlü rakibiniz <span className="text-white font-semibold">{competitors[0].domain || competitors[0].competitor}</span>{' '}
                    {parseFloat(competitors[0].impression_share || competitors[0].impressionShare || 0).toFixed(1)}% gösterim payıyla öne çıkıyor.
                    Örtüşme oranı {parseFloat(competitors[0].overlap_rate || competitors[0].overlapRate || 0).toFixed(0)}% — aynı açık artırmalarda sık karşılaşıyorsunuz.
                    {competitors[0].recommendation && ` ${competitors[0].recommendation}`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <Target className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-1">Rakip verisi yok</p>
              <p className="text-slate-600 text-xs">Açık artırma analizini çalıştırın</p>
            </div>
          )}
        </div>
      )}

      {/* ── DEVICES SECTION ──────────────────────────────────────────────────────── */}
      {activeSection === 'devices' && connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Cihaz Performansı</h3>
              <p className="text-slate-500 text-xs mt-0.5">Mobil, masaüstü ve tablet teklif optimizasyonu</p>
            </div>
            <button
              onClick={loadDevices}
              disabled={loading === 'devices'}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {loading === 'devices' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              {loading === 'devices' ? 'Yükleniyor...' : 'Performans Çek'}
            </button>
          </div>

          {devices.length > 0 ? (
            <div className="space-y-4">
              {/* Device Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {devices.map((dev: any, i: number) => {
                  const convRate = parseFloat(dev.conversion_rate || dev.conversionRate || 0)
                  const rec = dev.bid_adjustment_recommendation || dev.recommendation
                  return (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700/60 rounded-xl flex items-center justify-center">
                          {deviceIcon(dev.device || dev.type)}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm capitalize">{dev.device || dev.type}</p>
                          {rec && <div className="mt-1">{deviceBidBadge(rec)}</div>}
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-2xl font-bold text-white">{convRate.toFixed(1)}%</p>
                          <p className="text-slate-500 text-xs">Dönüşüm oranı</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Gösterim', value: parseInt(dev.impressions || 0).toLocaleString(), icon: Eye },
                          { label: 'Tıklama', value: parseInt(dev.clicks || 0).toLocaleString(), icon: MousePointer },
                          { label: 'Dönüşüm', value: dev.conversions || 0, icon: CheckCircle },
                          { label: 'Harcama', value: `$${parseFloat(dev.cost || dev.spend || 0).toFixed(2)}`, icon: DollarSign },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label} className="bg-slate-800/60 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Icon className="w-3 h-3 text-slate-600" />
                              <p className="text-slate-500 text-xs">{label}</p>
                            </div>
                            <p className="text-white text-sm font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                      {dev.cpa && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
                          <p className="text-slate-500 text-xs">CPA</p>
                          <p className="text-white font-semibold text-sm">${parseFloat(dev.cpa).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Recommendations Panel */}
              {deviceRecs.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <p className="text-white font-medium text-sm">AI Teklif Önerileri</p>
                  </div>
                  <div className="space-y-2">
                    {deviceRecs.map((rec: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                        {deviceIcon(rec.device || rec.type || '')}
                        <div className="flex-1">
                          <p className="text-white text-sm">{rec.action || rec.recommendation}</p>
                          {rec.reason && <p className="text-slate-500 text-xs mt-0.5">{rec.reason}</p>}
                        </div>
                        {rec.adjustment && <span className={`text-sm font-bold ${rec.adjustment.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>{rec.adjustment}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <Smartphone className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-1">Cihaz performans verisi yok</p>
              <p className="text-slate-600 text-xs">Mobil, masaüstü ve tablet karşılaştırması yapın</p>
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE SECTION ─────────────────────────────────────────────────────── */}
      {activeSection === 'schedule' && connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Zaman Planı Analizi</h3>
              <p className="text-slate-500 text-xs mt-0.5">En iyi saatler ve günlerde reklam gösterin</p>
            </div>
            <button
              onClick={loadSchedule}
              disabled={loading === 'schedule'}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {loading === 'schedule' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              {loading === 'schedule' ? 'Yükleniyor...' : 'Zaman Verilerini Çek'}
            </button>
          </div>

          {schedule ? (
            <div className="space-y-4">
              {/* Hourly Heatmap */}
              {schedule.hourly && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <p className="text-sm font-medium text-white mb-4">Saatlik Dönüşüm Haritası</p>
                  <div className="grid grid-cols-8 gap-1.5">
                    {Array.from({ length: 24 }, (_, h) => {
                      const hourData = schedule.hourly.find((hd: any) => (hd.hour === h || hd.hour_of_day === h))
                      const convs = parseInt(hourData?.conversions || 0)
                      return (
                        <div
                          key={h}
                          className={`rounded-lg p-2 text-center ${heatColor(convs)}`}
                          title={`Saat ${h}:00 — ${convs} dönüşüm`}
                        >
                          <p className="text-xs font-medium">{h}</p>
                          <p className="text-xs mt-0.5">{convs}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    {[
                      { color: 'bg-slate-800', label: '0' },
                      { color: 'bg-amber-900/30', label: 'Az' },
                      { color: 'bg-amber-600/30', label: 'Orta' },
                      { color: 'bg-emerald-600/30', label: 'Yüksek' },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={`w-3 h-3 rounded ${l.color}`} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of Week */}
              {schedule.daily && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <p className="text-sm font-medium text-white mb-4">Günlük Dönüşüm Dağılımı</p>
                  {(() => {
                    const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
                    const maxConvs = Math.max(...schedule.daily.map((d: any) => parseInt(d.conversions || 0)), 1)
                    return (
                      <div className="space-y-2">
                        {schedule.daily.map((day: any, i: number) => {
                          const convs = parseInt(day.conversions || 0)
                          const pct = (convs / maxConvs) * 100
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-slate-500 text-xs w-8 shrink-0">{DAY_NAMES[day.day_of_week ?? i] || day.day || DAY_NAMES[i]}</span>
                              <div className="flex-1 h-6 bg-slate-700/40 rounded-lg overflow-hidden">
                                <div
                                  className={`h-full rounded-lg transition-all ${pct > 80 ? 'bg-emerald-500/60' : pct > 40 ? 'bg-amber-500/60' : 'bg-slate-600/60'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-3 w-28 shrink-0">
                                <span className="text-white text-xs font-medium">{convs} dön.</span>
                                <span className="text-slate-500 text-xs">${parseFloat(day.cost || day.spend || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Recommendations */}
              {schedule.recommendations?.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <p className="text-white font-medium text-sm">AI Zaman Önerileri</p>
                  </div>
                  <div className="space-y-2">
                    {schedule.recommendations.map((rec: any, i: number) => {
                      const positive = rec.type === 'increase' || rec.action?.toLowerCase().includes('artır')
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                          {positive
                            ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            : <X className="w-4 h-4 text-red-400 shrink-0" />}
                          <p className="text-slate-300 text-sm">{rec.recommendation || rec.action || rec.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-1">Zaman planı verisi yok</p>
              <p className="text-slate-600 text-xs">En iyi saatler ve günlerde bütçenizi kullanın</p>
            </div>
          )}
        </div>
      )}

      {/* ── REPORT SECTION ───────────────────────────────────────────────────────── */}
      {activeSection === 'report' && connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Haftalık Performans Raporu</h3>
              <p className="text-slate-500 text-xs mt-0.5">AI tarafından hazırlanan kapsamlı haftalık analiz</p>
            </div>
            <button
              onClick={generateReport}
              disabled={loading === 'report'}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {loading === 'report' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading === 'report' ? 'Rapor Oluşturuluyor...' : 'Rapor Oluştur'}
            </button>
          </div>

          {loading === 'report' && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <div className="relative w-14 h-14 mx-auto mb-4">
                <div className="absolute inset-0 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-amber-400 animate-pulse" />
                </div>
                <div className="absolute -inset-2 rounded-3xl border border-amber-400/20 animate-ping" />
              </div>
              <p className="text-white font-medium">Rapor hazırlanıyor...</p>
              <p className="text-slate-500 text-sm mt-1">Bu işlem 10-30 saniye sürebilir</p>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <p className="text-slate-400 text-xs uppercase font-medium tracking-wide">Haftalık Rapor</p>
                    </div>
                    <h3 className="text-white text-xl font-bold leading-snug">{report.headline || report.title || 'Google Ads Haftalık Analiz'}</h3>
                    {report.period && <p className="text-slate-500 text-xs mt-1">{report.period}</p>}
                  </div>
                  {report.overall_score != null && (
                    <div className={`shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 ${
                      report.overall_score >= 70 ? 'bg-emerald-500/15 border-emerald-500/40' :
                      report.overall_score >= 40 ? 'bg-amber-500/15 border-amber-500/40' :
                      'bg-red-500/15 border-red-500/40'
                    }`}>
                      <span className={`text-2xl font-bold ${report.overall_score >= 70 ? 'text-emerald-400' : report.overall_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {report.overall_score}
                      </span>
                      <span className="text-slate-500 text-xs">/100</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              {report.key_metrics?.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-amber-400" /> Temel Metrikler
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {report.key_metrics.map((m: any, i: number) => (
                      <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">{m.label || m.metric}</p>
                        <p className="text-white font-semibold">{m.value}</p>
                        {m.change != null && (
                          <div className={`flex items-center gap-1 mt-1 text-xs ${parseFloat(m.change) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {parseFloat(m.change) >= 0
                              ? <ArrowUpRight className="w-3 h-3" />
                              : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(parseFloat(m.change)).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements Made */}
              {report.improvements_made?.length > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                  <p className="text-sm font-medium text-emerald-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Bu Hafta Yapılanlar
                  </p>
                  <div className="space-y-2">
                    {report.improvements_made.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {report.warnings?.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                  <p className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Uyarılar
                  </p>
                  <div className="space-y-2">
                    {report.warnings.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Week Focus */}
              {report.next_week_focus?.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" /> Önümüzdeki Hafta Odak Noktaları
                  </p>
                  <div className="space-y-2">
                    {report.next_week_focus.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimated Impact */}
              {report.estimated_impact && (
                <div className="bg-slate-800/40 border border-amber-500/20 rounded-2xl p-5">
                  <p className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Tahmini Etki
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">{report.estimated_impact}</p>
                </div>
              )}
            </div>
          )}

          {!report && !loading && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm mb-1">Haftalık rapor henüz oluşturulmadı</p>
              <p className="text-slate-600 text-xs">AI, geçen haftanın verilerini analiz edip kapsamlı bir rapor hazırlar</p>
            </div>
          )}
        </div>
      )}

      {/* Placeholder for sections when not connected */}
      {!connected && activeSection !== 'qs' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-400 text-sm">Bu bölümü kullanmak için Google Ads hesabınızı bağlayın</p>
        </div>
      )}
    </div>
  )
}
