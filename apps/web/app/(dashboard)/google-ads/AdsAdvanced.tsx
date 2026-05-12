'use client'
import { useState, useEffect, useRef } from 'react'
import {
  RefreshCw, AlertTriangle, CheckCircle, X, ChevronDown, ChevronUp,
  Target, Zap, DollarSign, Globe, FlaskConical, ArrowUpRight, ArrowDownRight,
  Sparkles, Activity, MousePointer, Eye, TrendingUp, BarChart2,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

interface AdsAdvancedProps {
  connected: boolean
}

type Section = 'conversion' | 'abtests' | 'budget' | 'landing' | 'smartbid'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'conversion', label: 'Dönüşüm Takibi', icon: '🎯' },
  { id: 'abtests', label: 'A/B Testler', icon: '🧪' },
  { id: 'budget', label: 'Bütçe Takibi', icon: '💰' },
  { id: 'landing', label: 'Açılış Sayfası', icon: '🌐' },
  { id: 'smartbid', label: 'Akıllı Teklif', icon: '⚡' },
]

export default function AdsAdvanced({ connected }: AdsAdvancedProps) {
  const [activeSection, setActiveSection] = useState<Section>('conversion')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Dönüşüm Takibi ────────────────────────────────────────────────────────
  const [conversionActions, setConversionActions] = useState<any[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importForm, setImportForm] = useState({
    conversionActionId: '',
    callerId: '',
    callStartDateTime: '',
    callDurationSeconds: 0,
  })

  // ── A/B Testler ────────────────────────────────────────────────────────────
  const [ads, setAds] = useState<any[]>([])
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [variants, setVariants] = useState<Record<string, any[]>>({})
  const [expandedAd, setExpandedAd] = useState<string | null>(null)
  const [creatingAd, setCreatingAd] = useState(false)

  // ── Bütçe Takibi ─────────────────────────────────────────────────────────
  const [budgetData, setBudgetData] = useState<{ campaigns: any[]; summary: any } | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const budgetIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Açılış Sayfası ───────────────────────────────────────────────────────
  const [landingUrl, setLandingUrl] = useState('')
  const [landingKeywords, setLandingKeywords] = useState('')
  const [landingResult, setLandingResult] = useState<any | null>(null)
  const [landingLoading, setLandingLoading] = useState(false)

  // ── Akıllı Teklif ────────────────────────────────────────────────────────
  const [bidCampaigns, setBidCampaigns] = useState<any[]>([])
  const [simulating, setSimulating] = useState<string | null>(null)
  const [simResults, setSimResults] = useState<Record<string, any>>({})
  const [simForm, setSimForm] = useState<Record<string, { scenario: string; targetValue: string }>>({})
  const [applying, setApplying] = useState<string | null>(null)
  const [expandedBid, setExpandedBid] = useState<string | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  // ── Veri Yükleme ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!connected) return
    if (activeSection === 'conversion') loadConversions()
    if (activeSection === 'abtests') loadAds()
    if (activeSection === 'budget') loadBudget()
    if (activeSection === 'smartbid') loadBidCampaigns()
  }, [activeSection, connected])

  useEffect(() => {
    if (!connected || activeSection !== 'budget') return
    budgetIntervalRef.current = setInterval(loadBudget, 300000)
    return () => {
      if (budgetIntervalRef.current) clearInterval(budgetIntervalRef.current)
    }
  }, [activeSection, connected])

  async function loadConversions() {
    try {
      const r = await fetch(`${API}/api/google-adv/conversion/status`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.actions || Array.isArray(d)) {
        setConversionActions(d.actions || d || [])
      }
    } catch {
      // sessiz hata
    }
  }

  async function submitImportCalls() {
    setImportLoading(true)
    try {
      const r = await fetch(`${API}/api/google-adv/conversion/import-calls`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(importForm),
      })
      const d = await r.json()
      if (d.ok) {
        showMsg('success', 'Çağrı dönüşümü başarıyla içe aktarıldı!')
        setShowImportModal(false)
        setImportForm({ conversionActionId: '', callerId: '', callStartDateTime: '', callDurationSeconds: 0 })
        loadConversions()
      } else {
        showMsg('error', d.error || 'İçe aktarma başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Bağlantı hatası: ' + e.message)
    }
    setImportLoading(false)
  }

  async function loadAds() {
    try {
      const r = await fetch(`${API}/api/google-adv/abtests`, { headers: authH() })
      const d = await r.json()
      const list = d.ads || d || []
      setAds([...list].sort((a: any, b: any) => (parseFloat(a.ctr || 0)) - (parseFloat(b.ctr || 0))))
    } catch {
      // sessiz hata
    }
  }

  async function generateVariant(ad: any) {
    const adId = ad.id || ad.ad_id || String(ad.headline || '')
    setGeneratingFor(adId)
    try {
      const r = await fetch(`${API}/api/google-adv/abtests/generate`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ ad }),
      })
      const d = await r.json()
      if (d.ok || d.variants) {
        setVariants(prev => ({ ...prev, [adId]: d.variants || [] }))
        setExpandedAd(adId)
      } else {
        showMsg('error', d.error || 'Varyant oluşturulamadı')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setGeneratingFor(null)
  }

  async function publishVariant(variant: any, ad: any) {
    setCreatingAd(true)
    try {
      const r = await fetch(`${API}/api/google-adv/abtests/create-ad`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ variant, ad }),
      })
      const d = await r.json()
      if (d.ok) {
        showMsg('success', 'Varyant reklam olarak eklendi (duraklatılmış)!')
      } else {
        showMsg('error', d.error || 'Yayınlama başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setCreatingAd(false)
  }

  async function loadBudget() {
    setBudgetLoading(true)
    try {
      const r = await fetch(`${API}/api/google-adv/budget-pacing`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.campaigns) {
        setBudgetData({ campaigns: d.campaigns || [], summary: d.summary || {} })
      }
    } catch {
      // sessiz hata
    }
    setBudgetLoading(false)
  }

  async function analyzeLanding() {
    if (!landingUrl.trim()) { showMsg('error', 'Lütfen bir URL girin'); return }
    setLandingLoading(true)
    setLandingResult(null)
    try {
      const r = await fetch(`${API}/api/google-adv/landing-page/analyze`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          url: landingUrl,
          keywords: landingKeywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })
      const d = await r.json()
      if (d.ok || d.score !== undefined) {
        setLandingResult(d)
      } else {
        showMsg('error', d.error || 'Analiz başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setLandingLoading(false)
  }

  async function loadBidCampaigns() {
    try {
      const r = await fetch(`${API}/api/google-adv/smart-bid/status`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.campaigns || Array.isArray(d)) {
        setBidCampaigns(d.campaigns || d || [])
      }
    } catch {
      // sessiz hata
    }
  }

  async function runSimulation(campaign: any) {
    const cId = campaign.id || campaign.campaign_id || String(campaign.name || '')
    const form = simForm[cId] || { scenario: 'TARGET_CPA', targetValue: '' }
    setSimulating(cId)
    try {
      const r = await fetch(`${API}/api/google-adv/smart-bid/simulate`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ campaignId: cId, scenario: form.scenario, targetValue: form.targetValue }),
      })
      const d = await r.json()
      if (d.ok || d.before) {
        setSimResults(prev => ({ ...prev, [cId]: d }))
      } else {
        showMsg('error', d.error || 'Simülasyon başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setSimulating(null)
  }

  async function applyBidStrategy(campaign: any) {
    const cId = campaign.id || campaign.campaign_id || String(campaign.name || '')
    const form = simForm[cId] || { scenario: 'TARGET_CPA', targetValue: '' }
    const confirmed = window.confirm('Teklif stratejisini değiştirmek istediğinize emin misiniz?')
    if (!confirmed) return
    setApplying(cId)
    try {
      const r = await fetch(`${API}/api/google-adv/smart-bid/apply`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ campaignId: cId, scenario: form.scenario, targetValue: form.targetValue }),
      })
      const d = await r.json()
      if (d.ok) {
        showMsg('success', 'Teklif stratejisi başarıyla uygulandı!')
        loadBidCampaigns()
      } else {
        showMsg('error', d.error || 'Uygulama başarısız')
      }
    } catch (e: any) {
      showMsg('error', 'Hata: ' + e.message)
    }
    setApplying(null)
  }

  // ── Yardımcı Fonksiyonlar ──────────────────────────────────────────────

  function convTypeBadge(type: string) {
    if ((type || '').includes('PHONE_CALL'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25">Telefon</span>
    if ((type || '').includes('WEBPAGE'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Web Sayfası</span>
    if ((type || '').includes('APP'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/25">Uygulama</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600/50">{type || 'Diğer'}</span>
  }

  function budgetStatusBadge(status: string) {
    const s = (status || '').toLowerCase()
    if (s.includes('fast') || s.includes('hızlı'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">Hızlı Tüketiyor</span>
    if (s.includes('slow') || s.includes('yavaş'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">Yavaş Tüketiyor</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">İyi Gidiyor</span>
  }

  function budgetBarColor(status: string) {
    const s = (status || '').toLowerCase()
    if (s.includes('fast') || s.includes('hızlı')) return 'bg-red-500'
    if (s.includes('slow') || s.includes('yavaş')) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  function scoreColor(score: number) {
    if (score >= 75) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  function scoreRingColor(score: number) {
    if (score >= 75) return 'border-emerald-500'
    if (score >= 50) return 'border-amber-500'
    return 'border-red-500'
  }

  function ctrColor(ctr: number) {
    if (ctr >= 4) return 'text-emerald-400'
    if (ctr >= 2) return 'text-amber-400'
    return 'text-red-400'
  }

  function vitalStatus(key: string, value: number | string) {
    const v = parseFloat(String(value))
    if (key === 'lcp') return v <= 2.5 ? 'iyi' : v <= 4 ? 'orta' : 'kötü'
    if (key === 'cls') return v <= 0.1 ? 'iyi' : v <= 0.25 ? 'orta' : 'kötü'
    return v <= 300 ? 'iyi' : v <= 600 ? 'orta' : 'kötü'
  }

  function vitalBadge(status: string) {
    if (status === 'iyi') return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Geçti</span>
    if (status === 'orta') return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">Orta</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">Kaldı</span>
  }

  function confidenceBadge(conf: string) {
    const c = (conf || '').toLowerCase()
    if (c.includes('high') || c.includes('yüksek'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Yüksek Güven</span>
    if (c.includes('medium') || c.includes('orta'))
      return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">Orta Güven</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">Düşük Güven</span>
  }

  function bidStrategyLabel(strategy: string) {
    if (strategy === 'TARGET_CPA') return 'Hedef EBM'
    if (strategy === 'TARGET_ROAS') return 'Hedef ROAS'
    if (strategy === 'MAXIMIZE_CLICKS') return 'Tıklamaları Maksimize Et'
    if (strategy === 'MAXIMIZE_CONVERSIONS') return 'Dönüşümleri Maksimize Et'
    return strategy || '--'
  }

  function bidStrategyBadge(strategy: string) {
    if (!strategy) return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600/50">Manuel</span>
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25">{bidStrategyLabel(strategy)}</span>
  }

  function diffArrow(before: number, after: number, higherIsBetter = true) {
    if (before === 0 && after === 0) return null
    const improved = higherIsBetter ? after > before : after < before
    const changed = Math.abs(after - before) > 0.001
    if (!changed) return null
    return improved
      ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 inline" />
      : <ArrowDownRight className="w-3.5 h-3.5 text-red-400 inline" />
  }

  // Özet hesaplamaları
  const totalConversions = conversionActions.reduce((s: number, a: any) => s + parseFloat(a.conversions || a.conversion_count || 0), 0)

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 mt-5">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${msg.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-red-500/30 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Başlık */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/25 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm">Gelişmiş Ads Araçları</h2>
          <p className="text-slate-500 text-xs">Dönüşüm, A/B test, bütçe, açılış sayfası ve akıllı teklif yönetimi</p>
        </div>
      </div>

      {/* Gezinme Haplıları */}
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

      {/* Bağlı Değil Uyarısı */}
      {!connected && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Google Ads hesabınızı bağlayın</p>
              <p className="text-slate-400 text-xs mt-0.5">Gelişmiş araçları kullanmak için Google Ads hesabınızın bağlı olması gerekiyor.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── DÖNÜŞÜM TAKİBİ ──────────────────────────────────────────────────── */}
      {activeSection === 'conversion' && connected && (
        <div className="space-y-4">
          {/* Özet Kartlar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Aktif Dönüşüm Aksiyonu</p>
              <p className="text-2xl font-semibold text-white">{conversionActions.length}</p>
              <p className="text-slate-500 text-xs mt-1">aksiyon tanımlı</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Toplam Dönüşüm</p>
              <p className="text-2xl font-semibold text-emerald-400">{totalConversions.toFixed(0)}</p>
              <p className="text-slate-500 text-xs mt-1">son dönem</p>
            </div>
          </div>

          {/* Çağrı Dönüşümü Ekle Butonu */}
          <div>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-900/20"
            >
              <Target className="w-4 h-4" />
              Çağrı Dönüşümü Ekle
            </button>
          </div>

          {/* Dönüşüm Aksiyonları */}
          {conversionActions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conversionActions.map((action: any, i: number) => (
                <div key={action.id || i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-white text-sm font-semibold leading-tight">{action.name || action.conversion_action_name || `Aksiyon ${i + 1}`}</p>
                    {convTypeBadge(action.type || action.conversion_type || '')}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className={`w-2 h-2 rounded-full ${action.status === 'ENABLED' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className="text-xs text-slate-500">{action.status === 'ENABLED' ? 'Aktif' : 'Pasif'}</span>
                    <span className="ml-auto text-xs text-slate-400">{parseFloat(action.conversions || action.conversion_count || 0).toFixed(0)} dönüşüm</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center">
              <Target className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium mb-1">Henüz dönüşüm aksiyonu yok</p>
              <p className="text-slate-500 text-xs">Smart Bidding dönüşüm verisi olmadan kör uçuş yapar. Hedef EBM veya ROAS stratejileri için en az 30 dönüşüm gereklidir. Dönüşüm takibini aktif etmek kampanya maliyetinizi önemli ölçüde düşürür.</p>
            </div>
          )}

          {/* İçe Aktarma Modalı */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                  <p className="text-white font-semibold text-sm">Çağrı Dönüşümü İçe Aktar</p>
                  <button onClick={() => setShowImportModal(false)} className="text-slate-500 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Dönüşüm Aksiyonu</label>
                    <select
                      value={importForm.conversionActionId}
                      onChange={e => setImportForm(f => ({ ...f, conversionActionId: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="">Aksiyon seçin...</option>
                      {conversionActions.map((a: any, i: number) => (
                        <option key={a.id || i} value={a.id || a.resource_name}>{a.name || `Aksiyon ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Arayan Numara</label>
                    <input
                      type="tel"
                      value={importForm.callerId}
                      onChange={e => setImportForm(f => ({ ...f, callerId: e.target.value }))}
                      placeholder="+905551234567"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Çağrı Başlangıç Tarihi</label>
                    <input
                      type="datetime-local"
                      value={importForm.callStartDateTime}
                      onChange={e => setImportForm(f => ({ ...f, callStartDateTime: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Çağrı Süresi (saniye)</label>
                    <input
                      type="number"
                      value={importForm.callDurationSeconds}
                      onChange={e => setImportForm(f => ({ ...f, callDurationSeconds: parseInt(e.target.value) || 0 }))}
                      min={0}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <button
                    onClick={submitImportCalls}
                    disabled={importLoading || !importForm.conversionActionId}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                  >
                    {importLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                    {importLoading ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── A/B TESTLER ─────────────────────────────────────────────────────────── */}
      {activeSection === 'abtests' && connected && (
        <div className="space-y-4">
          {/* Bilgi Kartı */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs">A/B testi için önce kötü performanslı reklamları test edin. Liste CTR'ye göre en kötüden en iyiye sıralanmıştır.</p>
          </div>

          {ads.length > 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
              {/* Tablo Başlığı */}
              <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2.5 border-b border-slate-700/30 bg-slate-800/40">
                {['Reklam Grubu', 'Kampanya', 'CTR', 'Gösterim', 'Tıklama', 'Dönüşüm', ''].map((h, i) => (
                  <p key={i} className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-slate-700/30">
                {ads.map((ad: any, i: number) => {
                  const adId = ad.id || ad.ad_id || String(ad.headline || i)
                  const ctr = parseFloat(ad.ctr || 0)
                  const adVariants = variants[adId]
                  const isExpanded = expandedAd === adId
                  const isGenerating = generatingFor === adId
                  return (
                    <div key={adId}>
                      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 hover:bg-slate-700/15 transition items-center">
                        <p className="text-white text-sm truncate">{ad.ad_group_name || ad.adGroup || '--'}</p>
                        <p className="text-slate-400 text-xs truncate">{ad.campaign_name || ad.campaign || '--'}</p>
                        <p className={`text-sm font-medium ${ctrColor(ctr)}`}>{ctr.toFixed(2)}%</p>
                        <p className="text-slate-400 text-xs">{parseInt(ad.impressions || 0).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">{parseInt(ad.clicks || 0).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">{parseFloat(ad.conversions || 0).toFixed(1)}</p>
                        <button
                          onClick={() => generateVariant(ad)}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition whitespace-nowrap"
                        >
                          {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                          {isGenerating ? 'Varyant Oluşturuluyor...' : 'Varyant Oluştur'}
                        </button>
                      </div>

                      {/* Varyant Paneli */}
                      {adVariants && isExpanded && (
                        <div className="mx-5 mb-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {adVariants.map((v: any, vi: number) => (
                              <div key={vi} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                                <p className="text-amber-400 text-xs font-semibold mb-3">Varyant {vi + 1}</p>
                                {v.headlines?.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs text-slate-500 mb-1.5">Başlıklar</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {v.headlines.map((h: string, hi: number) => (
                                        <span key={hi} className="px-2 py-0.5 bg-slate-700 border border-slate-600/50 rounded-md text-xs text-slate-300">{h}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {v.descriptions?.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs text-slate-500 mb-1.5">Açıklamalar</p>
                                    <div className="space-y-1">
                                      {v.descriptions.map((d: string, di: number) => (
                                        <p key={di} className="text-xs text-slate-400">{d}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <button
                                  onClick={() => publishVariant(v, ad)}
                                  disabled={creatingAd}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                                >
                                  {creatingAd ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                                  Bu Varyantı Yayınla (Duraklat)
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {adVariants && (
                        <button
                          onClick={() => setExpandedAd(isExpanded ? null : adId)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-slate-400 transition"
                        >
                          {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Varyantları Gizle</> : <><ChevronDown className="w-3.5 h-3.5" /> Varyantları Göster</>}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center">
              <FlaskConical className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Reklam bulunamadı</p>
              <p className="text-slate-500 text-xs mt-1">Google Ads bağlantısı kurulduktan sonra reklamlarınız burada görünür</p>
            </div>
          )}
        </div>
      )}

      {/* ── BÜTÇE TAKİBİ ─────────────────────────────────────────────────────────── */}
      {activeSection === 'budget' && connected && (
        <div className="space-y-4">
          {budgetLoading && !budgetData ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
                  <div className="h-2 bg-slate-700 rounded mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : budgetData ? (
            <>
              {/* Özet Kartlar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Toplam Günlük Bütçe</p>
                  <p className="text-2xl font-semibold text-white">${parseFloat(budgetData.summary?.totalBudget || budgetData.summary?.total_budget || 0).toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Bugün Harcanan</p>
                  <p className="text-2xl font-semibold text-amber-400">${parseFloat(budgetData.summary?.totalSpent || budgetData.summary?.total_spent || 0).toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-2 uppercase font-medium tracking-wide">Gün Sonu Tahmini</p>
                  <p className="text-2xl font-semibold text-blue-400">${parseFloat(budgetData.summary?.projectedSpend || budgetData.summary?.projected_spend || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Kampanya Kartları */}
              <div className="space-y-3">
                {budgetData.campaigns.map((c: any, i: number) => {
                  const budget = parseFloat(c.budget || c.daily_budget || 0)
                  const spent = parseFloat(c.spent || c.cost || 0)
                  const spentPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                  const expectedPct = parseFloat(c.expectedPct || c.expected_pct || c.expected_percent || 50)
                  const status = c.status || c.pacing_status || ''
                  return (
                    <div key={c.id || i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white text-sm font-semibold truncate">{c.name || c.campaign_name || `Kampanya ${i + 1}`}</p>
                        {budgetStatusBadge(status)}
                      </div>
                      {/* Bütçe Çubuğu */}
                      <div className="relative w-full h-3 bg-slate-700 rounded-full overflow-visible mb-2">
                        <div
                          className={`h-full rounded-full transition-all ${budgetBarColor(status)}`}
                          style={{ width: `${spentPct}%` }}
                        />
                        <div
                          className="absolute top-0 w-0.5 h-3 bg-slate-300/60 border-l border-dashed border-slate-400/60"
                          style={{ left: `${Math.min(expectedPct, 98)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">${spent.toFixed(2)} / ${budget.toFixed(2)} • %{spentPct.toFixed(0)} harcandı • %{expectedPct.toFixed(0)} beklenen bu saatte</p>
                      </div>
                      {c.recommendation && (
                        <p className="text-xs text-slate-400 italic mt-2">{c.recommendation}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center">
              <DollarSign className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Bütçe verisi yükleniyor</p>
              <p className="text-slate-500 text-xs mt-1">Bütçe takibi günlük harcamalarınızın beklenen tempoyla uyumlu olup olmadığını gösterir. Aşırı veya yetersiz harcama kampanya performansını olumsuz etkiler.</p>
            </div>
          )}
        </div>
      )}

      {/* ── AÇILIŞ SAYFASI ───────────────────────────────────────────────────────── */}
      {activeSection === 'landing' && connected && (
        <div className="space-y-4">
          {/* Girdi Satırı */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={landingUrl}
              onChange={e => setLandingUrl(e.target.value)}
              placeholder="https://siteniz.com/hedef-sayfa"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600"
            />
            <input
              type="text"
              value={landingKeywords}
              onChange={e => setLandingKeywords(e.target.value)}
              placeholder="anahtar, kelime, listesi"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600"
            />
            <button
              onClick={analyzeLanding}
              disabled={landingLoading || !landingUrl.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition whitespace-nowrap shadow-lg shadow-amber-900/20"
            >
              {landingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Analiz Et
            </button>
          </div>

          {/* Yükleniyor */}
          {landingLoading && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <p className="text-slate-300 text-sm">Sayfa analiz ediliyor... Bu işlem 10-15 saniye sürebilir</p>
            </div>
          )}

          {/* Sonuçlar */}
          {landingResult && !landingLoading && (
            <div className="space-y-4">
              {/* Genel Puan */}
              <div className="flex items-center gap-5">
                <div className={`w-20 h-20 rounded-full border-4 ${scoreRingColor(landingResult.score || 0)} flex items-center justify-center shrink-0`}>
                  <p className={`text-2xl font-bold ${scoreColor(landingResult.score || 0)}`}>{landingResult.score ?? '--'}</p>
                </div>
                <div>
                  <p className="text-white font-semibold text-base">Genel Puan</p>
                  <p className="text-slate-400 text-xs mt-0.5">{landingUrl}</p>
                </div>
              </div>

              {/* Core Web Vitals */}
              {landingResult.vitals && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'lcp', label: 'LCP', unit: 's', value: landingResult.vitals.lcp },
                    { key: 'cls', label: 'CLS', unit: '', value: landingResult.vitals.cls },
                    { key: 'fid', label: 'FID / TBT', unit: 'ms', value: landingResult.vitals.fid || landingResult.vitals.tbt },
                  ].map(({ key, label, unit, value }) => (
                    <div key={key} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500 uppercase font-medium">{label}</p>
                        {vitalBadge(vitalStatus(key, value ?? 999))}
                      </div>
                      <p className="text-white text-lg font-semibold">{value != null ? `${value}${unit}` : '--'}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Anahtar Kelime Alaka Tablosu */}
              {landingResult.keywords?.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/60">
                    <p className="text-sm font-medium text-white">Anahtar Kelime Alaka Düzeyi</p>
                  </div>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-2.5 border-b border-slate-700/30 bg-slate-800/40">
                    {['Kelime', 'Başlıkta', "H1'de", 'İçerikte', 'Puan'].map((h, i) => (
                      <p key={i} className="text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</p>
                    ))}
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {landingResult.keywords.map((kw: any, i: number) => {
                      const score = (kw.inTitle ? 1 : 0) + (kw.inH1 ? 1 : 0) + (kw.inContent ? 1 : 0)
                      const scoreCol = score === 3 ? 'text-emerald-400' : score === 2 ? 'text-amber-400' : score === 1 ? 'text-amber-500' : 'text-red-400'
                      return (
                        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 items-center">
                          <p className="text-white text-sm truncate">{kw.keyword || kw.term}</p>
                          <p className={`text-xs ${kw.inTitle ? 'text-emerald-400' : 'text-slate-600'}`}>{kw.inTitle ? '✓' : '✗'}</p>
                          <p className={`text-xs ${kw.inH1 ? 'text-emerald-400' : 'text-slate-600'}`}>{kw.inH1 ? '✓' : '✗'}</p>
                          <p className={`text-xs ${kw.inContent ? 'text-emerald-400' : 'text-slate-600'}`}>{kw.inContent ? '✓' : '✗'}</p>
                          <p className={`text-sm font-semibold ${scoreCol}`}>{'★'.repeat(score)}{'☆'.repeat(3 - score)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Öneriler */}
              {landingResult.recommendations?.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-slate-500 uppercase font-medium mb-3">İyileştirme Önerileri</p>
                  {landingResult.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-slate-300 text-xs">{rec}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Claude Analizi */}
              {landingResult.insights && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <p className="text-amber-300 text-sm font-medium">AI Analizi</p>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{landingResult.insights}</p>
                </div>
              )}
            </div>
          )}

          {/* Boş Durum */}
          {!landingResult && !landingLoading && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center">
              <Globe className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Açılış sayfası analizi</p>
              <p className="text-slate-500 text-xs mt-1">URL girerek açılış sayfanızın QS'e etkisini analiz edin. Core Web Vitals, anahtar kelime alaka düzeyi ve kullanıcı deneyimi skorunuzu öğrenin.</p>
            </div>
          )}
        </div>
      )}

      {/* ── AKILLI TEKLİF ────────────────────────────────────────────────────────── */}
      {activeSection === 'smartbid' && connected && (
        <div className="space-y-4">
          {/* Bilgi Kutusu */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase font-medium mb-2">Akıllı Teklif Stratejileri</p>
            {[
              { label: 'Hedef EBM', desc: 'Belirlediğiniz maliyetle dönüşüm alır' },
              { label: 'Hedef ROAS', desc: 'Reklam harcamasından belirlediğiniz getiriyi hedefler' },
              { label: 'Tıklamaları Maksimize Et', desc: 'Bütçenizle en fazla tıklamayı alır' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 text-xs"><span className="font-medium">{label}:</span> {desc}</p>
              </div>
            ))}
          </div>

          {bidCampaigns.length > 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
              {/* Tablo Başlığı */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2.5 border-b border-slate-700/30 bg-slate-800/40">
                {['Kampanya', 'Strateji', '30 Gün Dönüşüm', 'Ort. TBM', ''].map((h, i) => (
                  <p key={i} className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-slate-700/30">
                {bidCampaigns.map((c: any, i: number) => {
                  const cId = c.id || c.campaign_id || String(c.name || i)
                  const isExpanded = expandedBid === cId
                  const form = simForm[cId] || { scenario: 'TARGET_CPA', targetValue: '' }
                  const result = simResults[cId]
                  const isSimulating = simulating === cId
                  const isApplying = applying === cId
                  return (
                    <div key={cId}>
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 hover:bg-slate-700/15 transition items-center">
                        <p className="text-white text-sm truncate">{c.name || c.campaign_name || `Kampanya ${i + 1}`}</p>
                        <div>{bidStrategyBadge(c.bidding_strategy || c.strategy || '')}</div>
                        <p className="text-slate-400 text-xs">{parseFloat(c.conversions || 0).toFixed(0)}</p>
                        <p className="text-slate-400 text-xs">${parseFloat(c.avg_cpc || c.cpc || 0).toFixed(2)}</p>
                        <button
                          onClick={() => setExpandedBid(isExpanded ? null : cId)}
                          className="flex items-center gap-1 text-slate-400 hover:text-white transition text-xs"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          Simüle Et
                        </button>
                      </div>

                      {/* Simülasyon Paneli */}
                      {isExpanded && (
                        <div className="mx-5 mb-4 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-400 mb-1.5 block">Strateji</label>
                              <select
                                value={form.scenario}
                                onChange={e => setSimForm(f => ({ ...f, [cId]: { ...form, scenario: e.target.value } }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                              >
                                <option value="TARGET_CPA">Hedef EBM (Target CPA)</option>
                                <option value="TARGET_ROAS">Hedef ROAS</option>
                                <option value="MAXIMIZE_CLICKS">Tıklamaları Maksimize Et</option>
                              </select>
                            </div>
                            {form.scenario !== 'MAXIMIZE_CLICKS' && (
                              <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">
                                  {form.scenario === 'TARGET_CPA' ? 'Hedef EBM (TL)' : 'Hedef ROAS (x)'}
                                </label>
                                <input
                                  type="number"
                                  value={form.targetValue}
                                  onChange={e => setSimForm(f => ({ ...f, [cId]: { ...form, targetValue: e.target.value } }))}
                                  placeholder={form.scenario === 'TARGET_CPA' ? 'örn: 50' : 'örn: 3.5'}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => runSimulation(c)}
                            disabled={isSimulating}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                          >
                            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                            {isSimulating ? 'Simülasyon Çalışıyor...' : 'Simülasyonu Çalıştır'}
                          </button>

                          {/* Simülasyon Sonuçları */}
                          {result && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-500 uppercase font-medium">Sonuçlar</p>
                                {confidenceBadge(result.confidence || '')}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-700/50">
                                      <th className="text-left text-slate-500 py-2 pr-4">Metrik</th>
                                      <th className="text-right text-slate-500 py-2 pr-4">Mevcut</th>
                                      <th className="text-right text-slate-500 py-2">Tahmini</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700/30">
                                    {[
                                      { label: 'Gösterim', bk: 'impressions', ak: 'impressions', higher: true },
                                      { label: 'Tıklama', bk: 'clicks', ak: 'clicks', higher: true },
                                      { label: 'Dönüşüm', bk: 'conversions', ak: 'conversions', higher: true },
                                      { label: 'Maliyet', bk: 'cost', ak: 'cost', higher: false },
                                      { label: 'EBM', bk: 'cpa', ak: 'cpa', higher: false },
                                      { label: 'ROAS', bk: 'roas', ak: 'roas', higher: true },
                                    ].map(({ label, bk, ak, higher }) => {
                                      const bv = parseFloat(result.before?.[bk] || 0)
                                      const av = parseFloat(result.after?.[ak] || 0)
                                      return (
                                        <tr key={label}>
                                          <td className="text-slate-400 py-2 pr-4">{label}</td>
                                          <td className="text-right text-slate-300 py-2 pr-4">{bv.toFixed(2)}</td>
                                          <td className="text-right py-2">
                                            <span className={av > bv && higher ? 'text-emerald-400' : av < bv && !higher ? 'text-emerald-400' : av === bv ? 'text-slate-300' : 'text-red-400'}>
                                              {av.toFixed(2)} {diffArrow(bv, av, higher)}
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Riskler */}
                              {result.risks?.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs text-slate-500 uppercase font-medium">Riskler</p>
                                  {result.risks.map((risk: string, ri: number) => (
                                    <div key={ri} className="flex items-start gap-2">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                      <p className="text-slate-300 text-xs">{risk}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Uygula Butonu */}
                              <button
                                onClick={() => applyBidStrategy(c)}
                                disabled={isApplying}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                              >
                                {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                {isApplying ? 'Uygulanıyor...' : 'Bu Stratejiyi Uygula'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center">
              <Zap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Kampanya bulunamadı</p>
              <p className="text-slate-500 text-xs mt-1">Google Ads bağlantısı kurulduktan sonra kampanyalarınız burada görünür</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
