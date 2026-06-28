'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import QSOptimizer from './QSOptimizer'
import AdsAdvanced from './AdsAdvanced'
import {
  RefreshCw, Users, CheckCircle, Link, Target, BarChart2,
  ArrowUpRight, X, ChevronRight, ChevronDown, Sparkles,
  AlertTriangle, Activity, Zap, Globe, TrendingUp, Brain,
  Phone, ShoppingCart
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const GOALS = [
  { id: 'LEADS', label: 'Lead Formu', desc: 'Form dolduran müşteri adayları al', Icon: Users },
  { id: 'CALLS', label: 'Telefon Araması', desc: 'Doğrudan ara butonu göster', Icon: Phone },
  { id: 'TRAFFIC', label: 'Site Trafiği', desc: 'Web sitene ziyaretçi çek', Icon: Globe },
  { id: 'SALES', label: 'Satış / Dönüşüm', desc: 'Ürün veya hizmet sat', Icon: ShoppingCart },
]

const AI_MSGS = [
  'Web sitenizi analiz ediyorum...',
  'Anahtar kelimeler belirleniyor...',
  'Reklam metinleri yazılıyor...',
  'Kalite Skoru optimize ediliyor...',
  'Google kampanya planı hazırlanıyor...',
]

function qsColor(score: number) {
  if (score >= 7) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 4) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

const GEVENT_LABELS: Record<string, string> = {
  Lead: 'Yeni Lead', Contact: 'İletişim', Purchase: 'Satış',
}

function GoogleAlgorithmBanner({ eventsToday, eventsTotal, lastAt, eventTypes }: {
  eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[]
}) {
  const isActive = eventsTotal > 0

  function relativeTime(iso: string | null) {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Az önce'
    if (m < 60) return `${m} dk önce`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} saat önce`
    return `${Math.floor(h / 24)} gün önce`
  }

  const STEPS = ['Lead', 'Contact', 'Purchase']

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${isActive ? 'bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/40 via-blue-100/40 to-emerald-100/40 animate-pulse pointer-events-none" />
      )}
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Brain size={18} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-slate-900 font-semibold text-sm">Google Algoritması Eğitiliyor</h3>
              {isActive ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  AKTİF
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">BEKLEMEDE</span>
              )}
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {isActive
                ? 'Google Smart Bidding her dönüşümden öğreniyor — reklamlarınız daha doğru kişilere, daha düşük maliyetle ulaşıyor'
                : 'Ayarlar > Google Dönüşüm bölümünden sistemi aktifleştirin — her satış Smart Bidding\'i eğitecek'}
            </p>
            {isActive && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-slate-500 text-[10px]">Öğrenilen:</span>
                {STEPS.map(step => {
                  const done = eventTypes.includes(step)
                  return (
                    <span key={step} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${done ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {done && <span className="w-1 h-1 bg-emerald-500 rounded-full" />}
                      {GEVENT_LABELS[step] || step}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0 pl-12 sm:pl-0">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">{eventsToday}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Bugün</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{eventsTotal}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Toplam</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">{relativeTime(lastAt)}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Son eğitim</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GoogleAdsPage() {
  const { t } = useI18n()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [leadsToday, setLeadsToday] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [qsData, setQsData] = useState<any[]>([])
  const [showQs, setShowQs] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [goal, setGoal] = useState('LEADS')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('150')
  const [avgDeal, setAvgDeal] = useState('')
  const [draft, setDraft] = useState<any>(null)
  const [aiMsgIdx, setAiMsgIdx] = useState(0)
  const [keywordsLoading, setKeywordsLoading] = useState(false)
  const [launching, setLaunching] = useState(false)
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Google conversion results
  const [gResults, setGResults] = useState<any[]>([])
  const [gSummary, setGSummary] = useState<any>(null)

  // Google CAPI algorithm training status
  const [gcapiStatus, setGcapiStatus] = useState<{ eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[] }>({ eventsToday: 0, eventsTotal: 0, lastAt: null, eventTypes: [] })

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    // window.location.search is always accurate; useSearchParams() can be empty
    // on static pages before Next.js hydration completes
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const gcode = params.get('gcode')
    const googleSuccess = params.get('google_success')
    const errorParam = params.get('error')

    if (errorParam) {
      const errMsg = errorParam === 'denied' ? 'Google Ads bağlantısı iptal edildi.' : decodeURIComponent(errorParam)
      showMsg('error', errMsg)
      window.history.replaceState({}, '', '/google-ads')
      loadAll()
    } else if (code) {
      exchangeToken(code)
    } else if (gcode) {
      exchangeToken(gcode)
    } else if (googleSuccess) {
      const t = params.get('_t')
      if (t) localStorage.setItem('token', decodeURIComponent(t))
      showMsg('success', 'Google Ads bağlandı!')
      window.history.replaceState({}, '', '/google-ads')
      loadAll()
    } else {
      loadAll()
    }
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/google-ads/exchange-token`, {
        method: 'POST', headers: authH(), body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (d.success || d.ok) {
        showMsg('success', 'Google Ads bağlandı!')
        window.history.replaceState({}, '', '/google-ads')
        loadAll()
      } else showMsg('error', d.error || 'Token değişimi başarısız')
    } catch { showMsg('error', 'Bağlantı hatası') }
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [connRes, campRes, actRes, attrRes, gcapiEvRes] = await Promise.allSettled([
        fetch(`${API}/api/google-ads/connection`, { headers: authH() }),
        fetch(`${API}/api/google-campaign/campaigns-with-roi`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/activity`, { headers: authH() }),
        fetch(`${API}/api/google-capi/attribution`, { headers: authH() }),
        fetch(`${API}/api/google-capi/events`, { headers: authH() }),
      ])
      if (connRes.status === 'fulfilled') { const d = await connRes.value.json(); setConnected(d.connected) }
      if (campRes.status === 'fulfilled') { const d = await campRes.value.json(); setCampaigns(d.campaigns || []) }
      if (actRes.status === 'fulfilled') {
        const d = await actRes.value.json()
        setActivities((d.activities || []).filter((a: any) => a.platform === 'google' || a.type === 'new_leads'))
        setLeadsToday(d.leads_today || 0)
      }
      if (attrRes.status === 'fulfilled') { const d = await attrRes.value.json(); setGResults(d.rows || []); setGSummary(d.summary || null) }
      if (gcapiEvRes.status === 'fulfilled') {
        const d = await gcapiEvRes.value.json()
        const events: any[] = d.events || (Array.isArray(d) ? d : [])
        const todayStr = new Date().toDateString()
        const eventsToday = events.filter((e: any) => new Date(e.fired_at).toDateString() === todayStr && e.success).length
        const eventTypes = [...new Set(events.filter((e: any) => e.success).map((e: any) => e.event_name))] as string[]
        setGcapiStatus({ eventsTotal: events.filter((e: any) => e.success).length, eventsToday, lastAt: events[0]?.fired_at || null, eventTypes })
      }
    } catch {}
    setLoading(false)
  }

  async function loadQs() {
    setShowQs(true)
    try {
      const r = await fetch(`${API}/api/google-optimizer/quality-scores`, { headers: authH() })
      const d = await r.json()
      setQsData(d.keywords || d.qualityScores || d || [])
    } catch {}
  }

  function openWizard() {
    setWizardOpen(true); setStep(1); setWebsiteUrl(''); setDesc('')
    setGoal('LEADS'); setLocation(''); setBudget('150'); setAvgDeal('')
    setDraft(null); setAiMsgIdx(0); setKeywordsLoading(false)
  }
  function closeWizard() {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current)
    setWizardOpen(false)
  }

  async function extractLeads() {
    setExtracting(true)
    try {
      const r = await fetch(`${API}/api/google-intelligence/extract-leads`, { headers: authH() })
      const d = await r.json()
      if (d.ok || d.new_leads !== undefined || d.total_found !== undefined) {
        showMsg('success', `${d.new_leads ?? d.total_found ?? 0} yeni lead eklendi`)
        loadAll()
      } else showMsg('error', d.error || 'Lead çekim başarısız')
    } catch { showMsg('error', 'Lead çekim başarısız') }
    setExtracting(false)
  }

  async function goToKeywords() {
    setStep(3); setKeywordsLoading(true)
    setAiMsgIdx(0)

    let idx = 0
    animIntervalRef.current = setInterval(() => {
      idx++
      if (idx < AI_MSGS.length) setAiMsgIdx(idx)
      else { if (animIntervalRef.current) clearInterval(animIntervalRef.current) }
    }, 1400)

    try {
      const r = await fetch(`${API}/api/google-campaign/ai-create-simple`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          websiteUrl: websiteUrl || undefined,
          businessDescription: desc,
          goal,
          location: location || 'Türkiye',
          dailyBudget: Number(budget),
          avgDealValue: avgDeal ? Number(avgDeal) : 0,
        }),
      })
      const d = await r.json()
      if (d.ok && d.draft) { setDraft(d.draft) }
      else {
        const fb = {
          campaign_name: `${goal === 'LEADS' ? 'Lead' : goal === 'SALES' ? 'Satis' : 'Trafik'} Kampanyası`,
          budget_recommendation: { daily_budget: Number(budget) },
          ad_groups: [{ name: 'Genel', keywords: [], ads: [{ headlines: ['', '', ''], descriptions: ['', ''] }] }],
          negative_keywords: [],
        }
        setDraft(fb)
        showMsg('success', 'Anahtar kelime ve reklam metinlerini kendiniz yazabilirsiniz')
      }
    } catch {
      const fb = {
        campaign_name: `${goal} Kampanyası`,
        budget_recommendation: { daily_budget: Number(budget) },
        ad_groups: [{ name: 'Genel', keywords: [], ads: [{ headlines: ['', '', ''], descriptions: ['', ''] }] }],
        negative_keywords: [],
      }
      setDraft(fb)
      showMsg('success', 'Anahtar kelime ve reklam metinlerini kendiniz yazabilirsiniz')
    }
    finally {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current)
      setKeywordsLoading(false)
    }
  }

  async function launchCampaign() {
    if (!draft || !connected) { showMsg('error', 'Google Ads hesabınızı bağlayın'); return }
    setLaunching(true)
    try {
      const r = await fetch(`${API}/api/google-campaign/create`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          campaignPlan: draft,
          goal,
          finalUrl: websiteUrl || '',
        }),
      })
      const d = await r.json()
      if (d.ok || d.campaignId || d.success) {
        showMsg('success', 'Google kampanya oluşturuldu!')
        closeWizard(); loadAll()
      } else showMsg('error', d.error || 'Kampanya oluşturulamadı')
    } catch { showMsg('error', 'Bağlantı hatası') }
    setLaunching(false)
  }

  async function connectGoogle() {
    try {
      const r = await fetch(`${API}/api/google-ads/oauth-url`, { headers: authH() })
      const d = await r.json()
      if (d.url) window.location.href = d.url
    } catch { window.location.href = `${API}/api/google-ads/auth` }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white">
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-white border-emerald-200 text-emerald-600' : 'bg-white border-red-200 text-red-600'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Google Ads</h1>
            <p className="text-slate-600 text-sm mt-0.5">{t('google_ads.arama_kampanyalari_ve_lea', 'Arama kampanyaları ve lead otomasyonu')}</p>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-emerald-700 text-xs font-medium">Google Bağlı</span>
                </div>
                <button onClick={connectGoogle} className="text-[10px] text-slate-400 hover:text-blue-600 transition">Tekrar Bağlan</button>
              </div>
            ) : (
              <button onClick={connectGoogle} className="flex items-center gap-2 px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google ile Bağlan
              </button>
            )}
            <button onClick={loadAll} className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Algorithm Training Banner */}
        <GoogleAlgorithmBanner
          eventsToday={gcapiStatus.eventsToday}
          eventsTotal={gcapiStatus.eventsTotal}
          lastAt={gcapiStatus.lastAt}
          eventTypes={gcapiStatus.eventTypes}
        />

        {/* 3 Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={openWizard}
            className="group relative bg-white border border-amber-200 hover:border-amber-300 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-slate-900 font-semibold text-lg">AI Kampanya</h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">{t('google_ads.siteni_veya_isletmeni_anl', 'Siteni veya işletmeni anlat, Google kampanyası oluştursun')}</p>
            <div className="mt-4 flex items-center gap-1 text-amber-600 text-xs font-medium">
              Oluştur <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={extractLeads}
            disabled={extracting || !connected}
            className="group relative bg-white border border-purple-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition">
              {extracting ? <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" /> : <Users className="w-6 h-6 text-purple-600" />}
            </div>
            <h3 className="text-slate-900 font-semibold text-lg">{t('google_ads.lead_cek', 'Lead Çek')}</h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              {extracting ? "Google Ads'dan lead'ler çekiliyor..." : "Kampanyalardan lead'leri otomatik al"}
            </p>
            {leadsToday > 0 && !extracting && (
              <div className="mt-4 flex items-center gap-1 text-purple-600 text-xs font-medium">
                Bugün {leadsToday} lead <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            )}
          </button>

          <button
            onClick={showQs ? () => setShowQs(false) : loadQs}
            className="group relative bg-white border border-emerald-200 hover:border-emerald-300 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-slate-900 font-semibold text-lg">AI Optimizasyon</h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">{t('google_ads.kalite_skoru_analizi_ve_a', 'Kalite Skoru analizi ve anahtar kelime önerileri')}</p>
            <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-medium">
              {showQs ? 'Gizle' : 'Analiz Et'} <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Quality Score Panel */}
        {showQs && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-900">Kalite Skoru (Quality Score)</span>
            </div>
            {qsData.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">{t('google_ads.kalite_skoru_verisi_bulun', 'Kalite skoru verisi bulunamadı. Aktif kampanya gerekli.')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="text-left pb-2 font-medium">Anahtar Kelime</th>
                      <th className="text-center pb-2 font-medium">KS</th>
                      <th className="text-left pb-2 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qsData.slice(0, 8).map((kw: any, i: number) => {
                      const qs = Number(kw.quality_score || kw.qualityScore || kw.score || 0)
                      return (
                        <tr key={i} className="py-2">
                          <td className="py-2 pr-4 text-slate-700 max-w-[200px] truncate">{kw.keyword || kw.text || kw.name || '—'}</td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-md border font-semibold ${qsColor(qs)}`}>{qs || '—'}</span>
                          </td>
                          <td className="py-2 text-slate-600">
                            {qs >= 7 ? 'İyi' : qs >= 4 ? 'Orta — optimize et' : qs > 0 ? 'Düşük — acil aksiyon' : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Activity Feed */}
        {activities.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">Son Aktiviteler</span>
            </div>
            <div className="space-y-0">
              {activities.slice(0, 5).map((act: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${act.severity === 'critical' ? 'bg-red-500' : act.type === 'new_leads' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm text-slate-700 flex-1">{act.message}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{act.time_ago}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign List */}
        {campaigns.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">Google Kampanyalar</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">{campaigns.length}</span>
            </div>
            <div className="space-y-0">
              {campaigns.slice(0, 5).map((camp: any) => {
                const hasRoi = camp.roi_percent !== null && camp.roi_percent !== undefined
                return (
                  <div key={camp.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{camp.name || camp.campaign_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {camp.status === 'active' || camp.status === 'ENABLED' ? 'Aktif' : camp.status || 'Taslak'}
                        {camp.leads_count > 0 ? ` · ${camp.leads_count} lead` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {hasRoi && (
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${camp.roi_percent >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          {camp.roi_percent >= 0 ? '+' : ''}{camp.roi_percent}% ROI
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Google Conversion Results */}
        {gSummary && (gSummary.totalLeads > 0 || gResults.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{t('google_ads.reklam_sonuclarim', 'Reklam Sonuçlarım')}</h2>
              <span className="text-xs text-slate-500">{t('google_ads.google_reklamlarindan_gel', 'Google reklamlarından gelen leadlerin satışa dönüşümü')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{gSummary.totalLeads}</p>
                <p className="text-xs text-slate-600 mt-1">Reklamdan Gelen Lead</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{gSummary.totalWon}</p>
                <p className="text-xs text-slate-600 mt-1">{t('google_ads.musteriye_donen', 'Müşteriye Dönen')}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {gSummary.totalRevenue > 0 ? `₺${gSummary.totalRevenue.toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-slate-600 mt-1">{t('google_ads.toplam_kazanc', 'Toplam Kazanç')}</p>
              </div>
            </div>
            {gResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-900">{t('google_ads.kampanya_bazinda', 'Kampanya Bazında')}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {gResults.slice(0, 6).map((row: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{row.campaign}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.leads} lead · gclid %{row.gclidPct}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {row.won > 0 && <span className="text-emerald-600 text-sm font-medium">{row.won} müşteri</span>}
                        {row.revenue > 0 && (
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
                            ₺{row.revenue.toLocaleString()}
                          </span>
                        )}
                        {row.won === 0 && <span className="text-xs text-slate-400">{t('google_ads.henuz_musteri_yok', 'Henüz müşteri yok')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced section */}
        <div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition py-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Gelişmiş Araçlar (QS Optimizer & Advanced)
          </button>
          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <QSOptimizer connected={connected} />
              <AdsAdvanced connected={connected} />
            </div>
          )}
        </div>
      </div>

      {/* Campaign Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-900">Google AI Kampanya</span>
              </div>
              <button onClick={closeWizard} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-6 pt-4">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-500 ${s <= step ? 'bg-amber-500' : 'bg-slate-200'}`} />
              ))}
            </div>

            <div className="p-6">
              {/* Step 1: Website or Description */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('google_ads.isletmeni_anlat', 'İşletmeni Anlat')}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('google_ads.web_siteni_gir_veya_acikl', 'Web siteni gir veya açıklama yaz')}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-600 mb-1.5 block">Web Sitesi URL <span className="text-slate-400">{t('google_ads.istege_bagli', '— isteğe bağlı')}</span></label>
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 gap-2 focus-within:border-amber-500 transition">
                        <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={e => setWebsiteUrl(e.target.value)}
                          className="flex-1 bg-transparent text-slate-900 text-sm placeholder-slate-400 focus:outline-none"
                          placeholder="https://sirketiniz.com"
                        />
                      </div>
                    </div>
                    <div className="text-center text-xs text-slate-500">— veya —</div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1.5 block">{t('google_ads.isletme_aciklamasi', 'İşletme Açıklaması')}</label>
                      <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder={t('google_ads.orn_ankarada_cati_tamiri', 'Örn: Ankara\'da çatı tamiri yapıyoruz. Konut sahiplerine ulaşmak istiyoruz, ortalama iş bedeli 8.000 TL...')}
                        className="w-full h-28 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm resize-none focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1.5 block">Hedef Konum <span className="text-slate-400">{t('google_ads.istege_bagli', '— isteğe bağlı')}</span></label>
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
                        placeholder={t('google_ads.istanbul_ankara_bos_birak', 'İstanbul, Ankara... (boş bırakırsan Türkiye)')}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!websiteUrl && desc.trim().length < 15}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition"
                  >
                    Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 2: Goal */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Kampanya Hedefi</h2>
                    <p className="text-sm text-slate-600 mt-1">Google'da ne elde etmek istiyorsun?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${goal === g.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <g.Icon className="w-6 h-6 mb-2 text-amber-600" />
                        <div className="text-sm font-medium text-slate-900">{g.label}</div>
                        <div className="text-xs text-slate-600 mt-0.5 leading-snug">{g.desc}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={goToKeywords} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Anahtar Kelimeleri Oluştur
                  </button>
                </div>
              )}

              {/* Step 3: Keywords Preview */}
              {step === 3 && (
                <div className="space-y-4">
                  {keywordsLoading ? (
                    <div className="py-10 text-center space-y-6">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 bg-amber-200 rounded-full animate-ping" />
                        <div className="relative w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-amber-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-900 font-semibold text-lg">{t('google_ads.kampanya_hazirlaniyor', 'Kampanya Hazırlanıyor')}</p>
                        <p className="text-amber-600 text-sm mt-2 min-h-[20px]">{AI_MSGS[aiMsgIdx]}</p>
                      </div>
                      <div className="flex justify-center gap-1.5">
                        {AI_MSGS.map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i <= aiMsgIdx ? 'bg-amber-500' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Anahtar Kelimeler</h2>
                        <p className="text-sm text-slate-600 mt-1">{t('google_ads.aiin_onerdigi_arama_terim', 'AI\'ın önerdiği arama terimleri')}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-52 overflow-y-auto">
                        {draft?.ad_groups?.[0]?.keywords || draft?.keywords ? (
                          <div className="flex flex-wrap gap-2">
                            {(draft.ad_groups?.[0]?.keywords || draft.keywords || []).slice(0, 15).map((kw: any, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs">
                                {typeof kw === 'string' ? kw : kw.keyword || kw.text || String(kw)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-600 text-sm text-center py-4">{t('google_ads.anahtar_kelimeler_planin', 'Anahtar kelimeler planın içinde. Devam edebilirsin.')}</p>
                        )}
                        {draft?.campaign_name && (
                          <p className="mt-3 text-xs text-slate-500 border-t border-slate-200 pt-3">Kampanya: <span className="text-slate-700">{draft.campaign_name}</span></p>
                        )}
                      </div>
                      <button onClick={() => setStep(4)} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition">
                        Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: Budget */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('google_ads.gunluk_butce', 'Günlük Bütçe')}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('google_ads.google_ads_icin_gunluk_ha', 'Google Ads için günlük harcama limiti')}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {['100', '150', '300', '500'].map(v => (
                        <button
                          key={v}
                          onClick={() => setBudget(v)}
                          className={`py-2 text-sm rounded-lg border transition ${budget === v ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                        >
                          ₺{v}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-amber-500 transition"
                      placeholder={t('google_ads.ozel_tutar', 'Özel tutar...')}
                    />
                    <div>
                      <label className="text-xs text-slate-600 mb-1.5 block">{t('google_ads.ortalama_musteri_degeri_t', 'Ortalama Müşteri Değeri (TRY)')}<span className="text-slate-400">{t('google_ads.roi_icin', '— ROI için')}</span></label>
                      <input
                        type="number"
                        value={avgDeal}
                        onChange={e => setAvgDeal(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-amber-500 transition"
                        placeholder={t('google_ads.orn_8000', 'Örn: 8000')}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(5)}
                    disabled={!budget || Number(budget) < 10}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition"
                  >
                    İncelemeye Geç <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 5: Confirmation */}
              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Onay Listesi</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('google_ads.kampanyani_yayina_almadan', 'Kampanyanı yayına almadan önce kontrol et')}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {[
                      { label: t('Kampanya adı','Kampanya adı'), value: draft?.campaign_name || 'AI Kampanya', ok: true },
                      { label: 'Hedef', value: GOALS.find(g => g.id === goal)?.label || goal, ok: true },
                      { label: t('Günlük bütçe','Günlük bütçe'), value: `₺${budget}`, ok: Number(budget) >= 10 },
                      { label: t('Google hesabı','Google hesabı'), value: connected ? 'Bağlı' : 'Bağlı değil', ok: connected },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-slate-600">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-900">{item.value}</span>
                          {item.ok
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!connected && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-amber-700 text-xs">{t('google_ads.google_hesabinizi_baglayi', 'Google hesabınızı bağlayın ve sonra yayınlayın')}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={closeWizard} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">
                      Kaydet & Kapat
                    </button>
                    <button
                      onClick={launchCampaign}
                      disabled={!connected || launching}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {launching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {launching ? 'Yayınlanıyor...' : 'Yayınla'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
