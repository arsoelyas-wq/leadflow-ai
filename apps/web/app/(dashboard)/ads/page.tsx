'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import MetaOptimizer from './MetaOptimizer'
import AdsROI from './AdsROI'
import {
  RefreshCw, Users, CheckCircle, Link, Target, BarChart2,
  ArrowUpRight, X, ChevronRight, ChevronDown, Sparkles,
  AlertTriangle, Activity, Zap, TrendingUp, DollarSign, Download, Brain,
  Megaphone, Globe, ShoppingCart, Radio, Code2,
  Copy, Send, User, Phone, Eye, FileText, XCircle
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const GOALS = [
  { id: 'LEADS', label: 'Lead Toplama', desc: 'WhatsApp/form ile potansiyel müşteri topla', detail: 'Meta Lead Form veya Messenger ile müşteri adayı bilgilerini toplar. AI otomatik lead çekme + 5dk kuralı ile anında arama.', Icon: Users, color: '#2563eb', estimate: '₺15-40 / lead' },
  { id: 'AWARENESS', label: 'Marka Bilinirliği', desc: 'Binlerce kişiye markanı göster', detail: 'Hedef kitlenin feed ve hikayelerinde markanız görünür. Erişim ve frekans optimizasyonu yapılır.', Icon: Megaphone, color: '#7c3aed', estimate: '₺2-8 / 1000 gösterim' },
  { id: 'TRAFFIC', label: 'Web Trafiği', desc: 'Siteye veya kataloğa trafik çek', detail: 'Landing page, ürün sayfası veya online kataloğunuza tıklama optimizasyonu. Link tıklama bazlı faturalandırma.', Icon: Globe, color: '#059669', estimate: '₺1-5 / tıklama' },
  { id: 'SALES', label: 'Satış & Dönüşüm', desc: 'Doğrudan satış veya teklif oluştur', detail: 'Satın alma veya teklif formu doldurma hedefli. CAPI ile dönüşüm takibi + değer bazlı optimizasyon.', Icon: ShoppingCart, color: '#dc2626', estimate: '₺30-100 / dönüşüm' },
]

const AI_MSGS = [
  'Türk pazarını analiz ediyorum...',
  'Hedef kitle belirliyorum...',
  'Reklam metinleri yazıyorum...',
  'Bütçe optimizasyonu yapıyorum...',
  'Kampanya planı hazırlanıyor...',
]

interface AdResult {
  campaign: string; source: string; leads: number
  won: number; revenue: number; winRate: number; avgDeal: number
}

const EVENT_LABELS: Record<string, string> = {
  Lead: 'Yeni Lead', Contact: 'İletişim', InitiateCheckout: 'Teklif', Purchase: 'Satış', ViewContent: 'Görüntüleme',
}

function AlgorithmTrainingBanner({ platform, eventsToday, eventsTotal, lastAt, eventTypes, capiEnabled }: {
  platform: 'meta' | 'google'
  eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[]; capiEnabled?: boolean
}) {
  const isMeta = platform === 'meta'
  const isActive = eventsTotal > 0 || !!capiEnabled

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

  const STEPS = isMeta
    ? ['Lead', 'Contact', 'InitiateCheckout', 'Purchase']
    : ['Lead', 'Contact', 'Purchase']

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${isActive ? 'bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/8 to-blue-600/5 animate-pulse pointer-events-none" />
      )}
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: status */}
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Brain size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-slate-900 font-semibold text-sm">
                {isMeta ? 'Meta' : 'Google'} Algoritması Eğitiliyor
              </h3>
              {isActive ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  AKTİF
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  BEKLEMEDE
                </span>
              )}
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {isActive
                ? 'Her müşteri kazandığınızda veriler otomatik iletiliyor — reklamlarınız zamanla daha ucuz ve etkili hale geliyor'
                : 'Ayarlar > Meta Dönüşüm bölümünden sistemi aktifleştirin — her satış algoritmayı eğitecek'}
            </p>
            {/* Event type pills */}
            {isActive && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-slate-500 text-[10px]">Öğrenilen:</span>
                {STEPS.map(step => {
                  const done = eventTypes.includes(step)
                  return (
                    <span key={step} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${done ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {done && <span className="w-1 h-1 bg-blue-500 rounded-full" />}
                      {EVENT_LABELS[step] || step}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {/* Right: counters */}
        {isActive && (
          <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0 pl-12 sm:pl-0">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{eventsToday}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Bugün</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-600">{eventsTotal}</p>
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

export default function AdsPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'campaigns'>('campaigns')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [leadsToday, setLeadsToday] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Ad results (attribution)
  const [adResults, setAdResults] = useState<AdResult[]>([])
  const [adSummary, setAdSummary] = useState<any>(null)

  // Meta CAPI algorithm training status
  const [capiStatus, setCapiStatus] = useState<{ eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[] }>({ eventsToday: 0, eventsTotal: 0, lastAt: null, eventTypes: [] })

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [desc, setDesc] = useState('')
  const [goal, setGoal] = useState('LEADS')
  const [budget, setBudget] = useState('200')
  const [avgDeal, setAvgDeal] = useState('')
  const [draft, setDraft] = useState<any>(null)
  const [creatives, setCreatives] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [aiMsgIdx, setAiMsgIdx] = useState(0)
  const [launching, setLaunching] = useState(false)
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Feature states
  const [accountHealth, setAccountHealth] = useState<any>(null)
  const [fatigue, setFatigue] = useState<any>(null)
  const [refreshAlerts, setRefreshAlerts] = useState<any[]>([])
  const [successMetrics, setSuccessMetrics] = useState<any>(null)
  const [onboardingData, setOnboardingData] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    if (typeof window === 'undefined') { loadAll(); return }
    const params = new URLSearchParams(window.location.search)
    const metaCode = params.get('meta_code')
    const code = params.get('code')
    if (metaCode) exchangeToken(metaCode)
    else if (code && params.get('state') === 'meta') exchangeToken(code)
    else loadAll()
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/ads/exchange-token`, { method: 'POST', headers: authH(), body: JSON.stringify({ code }) })
      const d = await r.json()
      if (d.success) {
        const msg = d.capiAutoSetup ? `Meta + CAPI otomatik kuruldu! (${d.pixelIds?.length || 0} Pixel bulundu)` : 'Meta hesabı bağlandı!'
        showMsg('success', msg)
        window.history.replaceState({}, '', window.location.pathname)
        loadAll()
      } else {
        showMsg('error', d.error || 'Meta bağlantısı başarısız')
        loadAll()
      }
    } catch { showMsg('error', 'Meta bağlantı hatası'); loadAll() }
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [connRes, campRes, actRes, attrRes, capiEvRes] = await Promise.allSettled([
        fetch(`${API}/api/ads/connection`, { headers: authH() }),
        fetch(`${API}/api/ads/my-campaigns`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/activity`, { headers: authH() }),
        fetch(`${API}/api/meta-capi/attribution`, { headers: authH() }),
        fetch(`${API}/api/meta-capi/events`, { headers: authH() }),
      ])
      if (connRes.status === 'fulfilled') { const d = await connRes.value.json(); setConnected(d.connected) }
      if (campRes.status === 'fulfilled') { const d = await campRes.value.json(); setCampaigns(d.campaigns || []) }
      if (actRes.status === 'fulfilled') { const d = await actRes.value.json(); setActivities(d.activities || []); setLeadsToday(d.leads_today || 0) }
      if (attrRes.status === 'fulfilled') { const d = await attrRes.value.json(); setAdResults(d.rows || []); setAdSummary(d.summary || null) }
      if (capiEvRes.status === 'fulfilled') {
        const d = await capiEvRes.value.json()
        const events: any[] = d.events || (Array.isArray(d) ? d : [])
        const todayStr = new Date().toDateString()
        const eventsToday = events.filter((e: any) => new Date(e.fired_at).toDateString() === todayStr && e.success).length
        const eventTypes = [...new Set(events.filter((e: any) => e.success).map((e: any) => e.event_name))] as string[]
        setCapiStatus({ eventsTotal: events.filter((e: any) => e.success).length, eventsToday, lastAt: events[0]?.fired_at || null, eventTypes })
      }
    } catch {}
    setLoading(false)

    // Load new features in background
    Promise.allSettled([
      fetch(`${API}/api/meta-opt/account-health`, { headers: authH() }).then(r => r.json()),
      fetch(`${API}/api/meta-opt/creative-fatigue`, { headers: authH() }).then(r => r.json()),
      fetch(`${API}/api/meta-opt/creative-refresh-alerts`, { headers: authH() }).then(r => r.json()),
      fetch(`${API}/api/ads-intelligence/success-metrics`, { headers: authH() }).then(r => r.json()),
      fetch(`${API}/api/ads-intelligence/onboarding-status`, { headers: authH() }).then(r => r.json()),
    ]).then(([h, f, cr, sm, ob]) => {
      if (h.status === 'fulfilled') setAccountHealth(h.value)
      if (f.status === 'fulfilled') setFatigue(f.value)
      if (cr.status === 'fulfilled') setRefreshAlerts(cr.value?.alerts || [])
      if (sm.status === 'fulfilled') setSuccessMetrics(sm.value)
      if (ob.status === 'fulfilled') setOnboardingData(ob.value)
    })
  }

  function openWizard() {
    setWizardOpen(true); setStep(1); setDesc(''); setGoal('LEADS')
    setBudget('200'); setAvgDeal(''); setDraft(null); setAiMsgIdx(0)
  }
  function closeWizard() {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current)
    setWizardOpen(false)
  }

  async function extractLeads() {
    setExtracting(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/extract-leads`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.ok || d.saved !== undefined) { showMsg('success', `${d.saved ?? 0} yeni lead eklendi`); loadAll() }
      else showMsg('error', d.error || 'Lead çekim başarısız')
    } catch { showMsg('error', 'Lead çekim başarısız') }
    setExtracting(false)
  }

  async function runAiStep() {
    setStep(5); setAiMsgIdx(0)
    let idx = 0
    animIntervalRef.current = setInterval(() => {
      idx++
      if (idx < AI_MSGS.length) setAiMsgIdx(idx)
      else { if (animIntervalRef.current) clearInterval(animIntervalRef.current) }
    }, 1600)

    let apiDone = false
    let animDone = false
    let draftData: any = null

    const advanceIfBoth = () => { if (apiDone && animDone && draftData) setStep(6) }

    setTimeout(() => { animDone = true; advanceIfBoth() }, AI_MSGS.length * 1600)

    try {
      const r = await fetch(`${API}/api/ads-intelligence/ai-create-campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ businessDescription: desc, goal, dailyBudget: Number(budget), currency: 'TRY', avgDealValue: avgDeal ? Number(avgDeal) : 0 }),
      })
      const d = await r.json()
      if (d.ok && d.draft) { draftData = d.draft; setDraft(d.draft); apiDone = true; advanceIfBoth() }
      else {
        if (animIntervalRef.current) clearInterval(animIntervalRef.current)
        const fb = { campaign_name: `${goal === 'LEADS' ? 'Lead' : goal === 'AWARENESS' ? 'Bilinirlik' : goal === 'TRAFFIC' ? 'Trafik' : 'Satis'} Kampanyası`, budget, target_audience: desc.slice(0, 200), ad_copies: [{ headline: '', primary_text: '', description: '', cta: 'Daha Fazla' }] }
        setDraft(fb); setStep(6)
        showMsg('success', 'Reklam metinlerini kendiniz yazabilirsiniz')
      }
    } catch {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current)
      const fb = { campaign_name: `${goal} Kampanyası`, budget, target_audience: desc.slice(0, 200), ad_copies: [{ headline: '', primary_text: '', description: '', cta: 'Daha Fazla' }] }
      setDraft(fb); setStep(6)
      showMsg('success', 'Reklam metinlerini kendiniz yazabilirsiniz')
    }
  }

  async function launchCampaign() {
    if (!draft || !connected) { showMsg('error', 'Meta hesabınızı bağlayın'); return }
    setLaunching(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/launch-campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ draftId: draft.id, campaignPlan: draft }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message || 'Kampanya başlatıldı!'); closeWizard(); loadAll() }
      else showMsg('error', d.error || 'Kampanya başlatılamadı')
    } catch { showMsg('error', 'Bağlantı hatası') }
    setLaunching(false)
  }

  function connectMeta() {
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID || ''
    const redirect = encodeURIComponent(`${window.location.origin}/ads`)
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirect}&scope=ads_read,leads_retrieval,ads_management&state=meta&response_type=code`
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white">
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-white border-emerald-200 text-emerald-600' : 'bg-white border-red-200 text-red-600'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900">Meta Ads</h1>
                {connected ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-semibold"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Bağlı</span>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-[10px] font-medium">Bağlı Değil</span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-0.5">AI kampanya oluşturma, CAPI algoritma eğitimi, lead otomasyonu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!connected && (
              <button onClick={connectMeta} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/25">
                <Link className="w-4 h-4" /> Meta Bağla
              </button>
            )}
            <button onClick={loadAll} className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab bar — single tab, CAPI moved to lead detail */}

      {tab === 'campaigns' && (
        <>
        {/* Algorithm Training Banner */}
        <AlgorithmTrainingBanner
          platform="meta"
          eventsToday={capiStatus.eventsToday}
          eventsTotal={capiStatus.eventsTotal}
          lastAt={capiStatus.lastAt}
          eventTypes={capiStatus.eventTypes}
          capiEnabled={accountHealth?.score >= 80}
        />

        {/* 3 Action Cards — Premium Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={openWizard}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/15 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-slate-900 font-bold text-base">AI Kampanya</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">İşletmeni anlat, AI kampanya oluştursun</p>
              <div className="mt-4 flex items-center gap-1.5 text-blue-600 text-xs font-bold group-hover:gap-3 transition-all">
                Oluştur <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>

          <button onClick={extractLeads} disabled={extracting || !connected}
            className="group relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/15 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
                {extracting ? <RefreshCw className="w-5 h-5 text-white animate-spin" /> : <Users className="w-5 h-5 text-white" />}
              </div>
              <h3 className="text-slate-900 font-bold text-base">Lead Çek</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                {extracting ? "Meta'dan çekiliyor..." : "Reklam formlarından otomatik al"}
              </p>
              {leadsToday > 0 && !extracting && (
                <div className="mt-4 flex items-center gap-1.5 text-purple-600 text-xs font-bold">
                  Bugün {leadsToday} lead <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </button>

          <button onClick={() => setShowAdvanced(true)}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-300 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-slate-900 font-bold text-base">Performans</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">ROI analizi, uyarılar ve optimizasyon</p>
              <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-xs font-bold group-hover:gap-3 transition-all">
                İncele <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        </div>

        {/* ── ONBOARDING PROGRESS ── */}
        {onboardingData && !onboardingData.onboarded && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">🚀 Kurulum İlerlemesi</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">%{onboardingData.progress}</span>
              </div>
              {onboardingData.progress < 100 && (
                <button onClick={async () => { try { await fetch(`${API}/api/ads-intelligence/onboarding-run`, { method: 'POST', headers: authH() }); loadAll(); showMsg('success', 'Onboarding çalıştırıldı!') } catch {} }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700">Otomatik Kur →</button>
              )}
            </div>
            <div className="h-2 bg-blue-100 rounded-full mb-3">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${onboardingData.progress}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(onboardingData.steps || []).map((s: any) => {
                const stepLinks: Record<string, string> = { connect: '', extract: '', capi: '/settings', campaign: '' };
                const stepActions: Record<string, string> = { extract: 'Lead Çek', capi: 'CAPI Ayarla', campaign: 'Kampanya Oluştur' };
                return (
                  <div key={s.id} className={`flex items-center gap-1.5 text-[10px] font-medium ${s.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {s.done ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                    {s.label}
                    {!s.done && stepActions[s.id] && (
                      s.id === 'capi' ? (
                        <a href="/settings" className="ml-1 text-[9px] font-bold text-blue-600 hover:underline">{stepActions[s.id]} →</a>
                      ) : s.id === 'extract' ? (
                        <button onClick={extractLeads} className="ml-1 text-[9px] font-bold text-blue-600 hover:underline">{stepActions[s.id]} →</button>
                      ) : s.id === 'campaign' ? (
                        <button onClick={openWizard} className="ml-1 text-[9px] font-bold text-blue-600 hover:underline">{stepActions[s.id]} →</button>
                      ) : null
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ACCOUNT HEALTH + CREATIVE FATIGUE ── */}
        {accountHealth && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Health Score */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-900">🏥 Hesap Sağlığı</span>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${
                  accountHealth.score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                  accountHealth.score >= 60 ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>{accountHealth.grade}</div>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-3 bg-slate-100 rounded-full">
                  <div className={`h-full rounded-full transition-all ${
                    accountHealth.score >= 80 ? 'bg-emerald-500' : accountHealth.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${accountHealth.score}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700">{accountHealth.score}/100</span>
              </div>
              {accountHealth.wastedSpend > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                  <span className="text-xs font-bold text-red-600">⚠️ ₺{accountHealth.wastedSpend.toFixed(0)} israf tespit edildi</span>
                </div>
              )}
              {(accountHealth.issues || []).slice(0, 4).map((issue: any, i: number) => {
                const fixMap: Record<string, { label: string; desc: string; href: string; steps: string[] }> = {
                  'no_capi': { label: 'CAPI Aktifleştir', desc: 'Meta algoritmasının doğru öğrenmesi için CAPI bağlantısı gerekli', href: '/settings#meta-capi', steps: ['Ayarlar → Meta Dönüşüm', 'Pixel ID girin', 'Access Token girin', 'CAPI toggle açın → Kaydet'] },
                  'no_pixel': { label: 'Pixel Ekle', desc: 'Web sitenize Pixel ekleyerek ziyaretçileri takip edin', href: '/settings#meta-capi', steps: ['Ayarlar → Meta Dönüşüm', 'Meta Business → Events Manager → Pixel ID kopyalayın', 'Pixel ID alanına yapıştırın → Kaydet'] },
                  'wasted_spend': { label: 'Kampanyayı Durdur', desc: 'Sonuç üretmeyen kampanyayı durdurun veya optimize edin', href: '', steps: ['Meta Ads Manager\'da bu kampanyayı bulun', 'Durdurun veya hedeflemeyi daraltın'] },
                  'low_ctr': { label: 'Reklam İyileştir', desc: 'Reklam görseli veya metni ilgi çekici değil', href: '', steps: ['Reklam görselini değiştirin', 'Başlık ve açıklamayı güncelleyin', 'A/B test başlatın'] },
                  'ad_fatigue': { label: 'Kreatif Yenile', desc: 'Aynı kişiler reklamı çok fazla görüyor', href: '', steps: ['Yeni reklam görseli yükleyin', 'Hedef kitleyi genişletin', 'Eski reklamı durdurun'] },
                };
                const fix = fixMap[issue.type];
                return (
                  <div key={i} className={`text-xs mb-2 rounded-xl overflow-hidden border ${issue.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="mt-0.5">{issue.severity === 'critical' ? '🔴' : '🟡'}</span>
                        <div>
                          <span className={`font-semibold ${issue.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>{issue.message}</span>
                          {fix && <p className="text-[10px] text-slate-500 mt-0.5">{fix.desc}</p>}
                        </div>
                      </div>
                      {fix?.href && (
                        <a href={fix.href}
                          className={`flex-shrink-0 ml-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            issue.severity === 'critical' ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-amber-500 text-white hover:bg-amber-400'
                          }`}>
                          {fix.label} <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {fix?.steps && (
                      <div className={`px-3 pb-2.5 pt-0 ${issue.severity === 'critical' ? 'border-t border-red-100' : 'border-t border-amber-100'}`}>
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {fix.steps.map((step, si) => (
                            <span key={si} className="flex items-center gap-1 text-[10px] text-slate-600">
                              {si > 0 && <ChevronRight className="w-2.5 h-2.5 text-slate-400" />}
                              <span className={`px-1.5 py-0.5 rounded ${issue.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'}`}>{step}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {accountHealth.costPerLead > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  Ort. Lead Maliyeti: <span className="font-bold text-slate-700">₺{accountHealth.costPerLead}</span>
                </div>
              )}
            </div>

            {/* Creative Fatigue + Refresh */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <span className="text-sm font-bold text-slate-900 block mb-4">⚡ Reklam Sağlığı</span>
              {fatigue && fatigue.fatigued?.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {fatigue.fatigued.slice(0, 3).map((f: any, i: number) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[60%]">{f.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.fatigueScore >= 70 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>Yorgunluk: {f.fatigueScore}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{f.reasons?.[0]}</p>
                      <span className="text-[10px] font-semibold text-amber-700 mt-1 block">{f.action}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
                  <span className="text-xs font-medium text-emerald-600">✅ Tüm reklamlar sağlıklı ({fatigue?.healthy || 0} aktif)</span>
                </div>
              )}
              {refreshAlerts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Yenileme Gerekli</span>
                  {refreshAlerts.slice(0, 2).map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg p-2">
                      <span className="text-slate-700 truncate max-w-[60%]">{a.name}</span>
                      <span className={`text-[10px] font-bold ${a.urgency === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>{a.daysActive} gün</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUCCESS METRICS (Sovlo Değeri) ── */}
        {successMetrics && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-bold text-slate-900">💎 Sovlo ile Kazanımlarınız</span>
                <p className="text-xs text-slate-500 mt-0.5">{successMetrics.period}</p>
              </div>
              <button onClick={async () => { setSendingReport(true); try { await fetch(`${API}/api/ads-intelligence/send-weekly-report`, { method: 'POST', headers: authH() }); showMsg('success', 'Rapor WhatsApp\'tan gönderildi!') } catch {} setSendingReport(false) }}
                disabled={sendingReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50">
                {sendingReport ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Rapor Gönder
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Lead', value: successMetrics.leads?.current || 0, sub: `${successMetrics.leads?.growth > 0 ? '+' : ''}${successMetrics.leads?.growth || 0}%`, color: successMetrics.leads?.growth >= 0 ? 'text-emerald-600' : 'text-red-500' },
                { label: 'Meta Lead', value: successMetrics.metaLeads || 0, sub: 'CAPI', color: 'text-blue-600' },
                { label: 'Satış', value: successMetrics.revenue?.wonCount || 0, sub: `%${successMetrics.revenue?.convRate || 0}`, color: 'text-violet-600' },
                { label: 'CAPI Event', value: successMetrics.quality?.capiSuccess || 0, sub: 'başarılı', color: 'text-teal-600' },
                { label: 'Tahmin', value: successMetrics.prediction?.nextMonthLeads || 0, sub: 'sonraki ay', color: 'text-amber-600' },
              ].map(m => (
                <div key={m.label} className="bg-white/70 rounded-xl p-3 text-center">
                  <p className={`text-lg font-extrabold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-slate-500">{m.label}</p>
                  <p className={`text-[9px] font-semibold ${m.color}`}>{m.sub}</p>
                </div>
              ))}
            </div>
            {successMetrics.sovloValue?.message && (
              <p className="text-xs text-emerald-700 mt-3 bg-white/50 rounded-lg p-2">{successMetrics.sovloValue.message}</p>
            )}
          </div>
        )}

        {/* CAPI section removed — quality signals now on lead detail page */}

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
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${act.severity === 'critical' ? 'bg-red-500' : act.type === 'new_leads' ? 'bg-emerald-500' : act.type === 'campaign_launched' ? 'bg-blue-500' : 'bg-slate-400'}`} />
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
              <span className="text-sm font-medium text-slate-900">Aktif Kampanyalar</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">{campaigns.length}</span>
            </div>
            <div className="space-y-0">
              {campaigns.slice(0, 5).map((camp: any) => {
                const spend = Number(camp.insights?.data?.[0]?.spend || 0)
                const hasRoi = camp.roi_percent !== null && camp.roi_percent !== undefined
                return (
                  <div key={camp.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{camp.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {camp.status === 'ACTIVE' ? 'Aktif' : camp.status || 'Taslak'}{camp.objective ? ` · ${camp.objective}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {spend > 0 && (
                        <div className="text-right text-xs hidden sm:block">
                          <div className="text-slate-900">${spend.toFixed(0)}</div>
                          <div className="text-slate-500">harcama</div>
                        </div>
                      )}
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

        {/* Ad Results — plain Turkish, no tech jargon */}
        {adSummary && (adSummary.totalLeads > 0 || adResults.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{t('ads.reklam_sonuclarim', 'Reklam Sonuçlarım')}</h2>
              <span className="text-xs text-slate-500">{t('ads.reklamlardan_gelen_leadle', 'Reklamlardan gelen leadlerin satışa dönüşüm takibi')}</span>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{adSummary.totalLeads}</p>
                <p className="text-xs text-slate-600 mt-1">Reklamdan Gelen Lead</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{adSummary.totalWon}</p>
                <p className="text-xs text-slate-600 mt-1">{t('ads.musteriye_donen', 'Müşteriye Dönen')}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {adSummary.totalRevenue > 0 ? `₺${adSummary.totalRevenue.toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-slate-600 mt-1">{t('ads.toplam_kazanc', 'Toplam Kazanç')}</p>
              </div>
            </div>

            {/* Per-campaign breakdown */}
            {adResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{t('ads.kampanya_bazinda', 'Kampanya Bazında')}</span>
                  <button onClick={async () => {
                    const res = await fetch(`${API}/api/meta-capi/audience/won`, { headers: authH() })
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'musteri-listesi.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition">
                    <Download className="w-3.5 h-3.5" /> Müşteri Listesini İndir
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {adResults.slice(0, 8).map((row, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {row.campaign !== '—' ? row.campaign : row.source}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.leads} lead geldi</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {row.won > 0 && (
                          <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {row.won} müşteri
                          </div>
                        )}
                        {row.revenue > 0 && (
                          <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
                            ₺{row.revenue.toLocaleString()}
                          </div>
                        )}
                        {row.won === 0 && (
                          <span className="text-xs text-slate-400">{t('ads.henuz_musteri_yok', 'Henüz müşteri yok')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced section toggle */}
        <div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition py-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Gelişmiş Araçlar (Optimizer & ROI Dashboard)
          </button>
          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <MetaOptimizer connected={connected} />
              <AdsROI connected={connected} />
            </div>
          )}
        </div>
        </>
      )}

      </div>

      {/* Campaign Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm">AI Kampanya Oluştur</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {step <= 3 ? `Adım ${step}/6` : step === 4 ? 'Kreatif Yükle' : step === 5 ? 'AI Hazırlıyor' : 'Önizleme'}
                  </p>
                </div>
              </div>
              <button onClick={closeWizard} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1 px-6 pt-3 shrink-0">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div key={s} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${s <= step ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-100'}`} />
                  <span className={`text-[8px] ${s <= step ? 'text-blue-600 font-semibold' : 'text-slate-300'}`}>
                    {['İşletme', 'Hedef', 'Bütçe', 'Kreatif', 'AI', 'Yayınla'][s - 1]}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Step 1: İşletme */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">İşletmenizi Tanıtın</h2>
                    <p className="text-sm text-slate-500 mt-1">Ne sattığınızı, kime sattığınızı ve sektörünüzü anlatın</p>
                  </div>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Örn: İstanbul'da mutfak dolabı satan bir firmayız. 30-55 yaş ev yenileyen müşterilere ulaşmak istiyoruz. Ortalama sipariş değerimiz 15.000 TL..."
                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm resize-none focus:outline-none focus:border-blue-400 focus:bg-white transition"
                  />
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-[11px] text-blue-700 font-medium">💡 Ne kadar detay verirseniz AI o kadar iyi kampanya oluşturur. Hedef kitle yaşı, şehri, bütçe aralığı gibi bilgiler ekleyin.</p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    disabled={desc.trim().length < 20}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    Devam <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2 — Kampanya Tipi */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Kampanya Tipi Seçin</h2>
                    <p className="text-sm text-slate-500 mt-1">Hedefinize göre en uygun kampanya tipini seçin</p>
                  </div>
                  <div className="space-y-2.5">
                    {GOALS.map(g => (
                      <button key={g.id} onClick={() => setGoal(g.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${goal === g.id ? 'border-blue-400 bg-blue-50/50 shadow-md shadow-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${g.color}15` }}>
                            <g.Icon className="w-5 h-5" style={{ color: g.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{g.label}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${g.color}12`, color: g.color }}>{g.estimate}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{g.desc}</p>
                            {goal === g.id && (
                              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">{g.detail}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${goal === g.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                            {goal === g.id && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep(3)} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/25">
                    Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('ads.butce_ve_deger', 'Bütçe ve Değer')}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('ads.gunluk_reklam_butceni_bel', 'Günlük reklam bütçeni belirle')}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-600 mb-2 block">{t('ads.gunluk_butce_try', 'Günlük Bütçe (TRY)')}</label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {['100', '200', '500', '1000'].map(v => (
                          <button
                            key={v}
                            onClick={() => setBudget(v)}
                            className={`py-2 text-sm rounded-lg border transition ${budget === v ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                          >
                            ₺{v}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition"
                        placeholder={t('ads.ozel_tutar_girebilirsin', 'Özel tutar girebilirsin...')}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-2 block">
                        Ortalama Müşteri Değeri (TRY) <span className="text-slate-400">{t('ads.roi_hesabi_icin', '— ROI hesabı için')}</span>
                      </label>
                      <input
                        type="number"
                        value={avgDeal}
                        onChange={e => setAvgDeal(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition"
                        placeholder={t('ads.orn_5000', 'Örn: 5000')}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(4)}
                    disabled={!budget || Number(budget) < 10}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    Devam <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 4: Kreatif Yükleme */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Reklam Kreatifleri</h2>
                    <p className="text-sm text-slate-500 mt-1">Fotoğraf veya video yükleyin — otomatik Meta&apos;ya aktarılır</p>
                  </div>

                  {/* Upload Zone */}
                  <label className="relative flex flex-col items-center justify-center h-36 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl cursor-pointer transition-all hover:bg-blue-50/30 group">
                    <input type="file" accept="image/*,video/*" multiple className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        setUploading(true);
                        for (const file of Array.from(files)) {
                          try {
                            const form = new FormData();
                            form.append('file', file);
                            const token = localStorage.getItem('token');
                            const r = await fetch(`${API}/api/meta-opt/upload-creative`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form });
                            const d = await r.json();
                            if (d.ok) setCreatives(prev => [{ ...d, filename: file.name, preview: URL.createObjectURL(file) }, ...prev]);
                            else showMsg('error', d.error || 'Yükleme başarısız');
                          } catch { showMsg('error', 'Yükleme hatası'); }
                        }
                        setUploading(false);
                        e.target.value = '';
                      }}
                    />
                    {uploading ? (
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-2 group-hover:bg-blue-200 transition">
                        <ArrowUpRight className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-slate-700">{uploading ? 'Yükleniyor...' : 'Fotoğraf veya Video Yükle'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, MP4 — maks. 50MB — çoklu seçim desteklenir</p>
                  </label>

                  {/* Uploaded Creatives */}
                  {creatives.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">{creatives.length} kreatif yüklendi</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">✓ Meta&apos;ya aktarıldı</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {creatives.map((c, i) => (
                          <div key={i} className="relative group">
                            {c.type === 'video' ? (
                              <div className="h-20 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                                <Eye className="w-5 h-5 text-slate-400" />
                              </div>
                            ) : (
                              <img src={c.preview || c.metaUrl} alt="" className="h-20 w-full object-cover rounded-xl border border-slate-200" />
                            )}
                            <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                            <span className={`absolute bottom-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded ${c.type === 'video' ? 'bg-violet-500 text-white' : 'bg-blue-500 text-white'}`}>
                              {c.type === 'video' ? 'VIDEO' : 'IMG'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-[11px] text-amber-700 font-medium">💡 Kreatif eklemezseniz AI metinle kampanya oluşturur. Görsel eklerseniz dönüşüm oranı ortalama %60 artar.</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">
                      ← Geri
                    </button>
                    <button
                      onClick={runAiStep}
                      disabled={uploading}
                      className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> AI ile Oluştur
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: AI Animation (was step 4) */}
              {step === 5 && (
                <div className="py-10 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-lg">{t('ads.kampanya_hazirlaniyor', 'Kampanya Hazırlanıyor')}</p>
                    <p className="text-blue-600 text-sm mt-2 min-h-[20px]">{AI_MSGS[aiMsgIdx]}</p>
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {AI_MSGS.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= aiMsgIdx ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 6: Full Preview & Edit & Launch */}
              {step === 6 && draft && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Önizleme & Düzenle</h2>
                      <p className="text-xs text-slate-500 mt-0.5">AI tarafından oluşturuldu — istediğiniz alanı düzenleyebilirsiniz</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">AI Taslak</span>
                  </div>

                  {/* Kampanya Bilgileri */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Kampanya Adı</label>
                      <input value={draft.campaign_name || ''} onChange={e => setDraft({...draft, campaign_name: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Günlük Bütçe</label>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-sm text-slate-400 mr-1">₺</span>
                          <input type="number" value={typeof draft.budget === 'object' ? draft.budget.daily_budget || draft.budget.amount || '' : draft.budget || budget}
                            onChange={e => setDraft({...draft, budget: e.target.value})}
                            className="flex-1 text-sm text-slate-900 focus:outline-none bg-transparent" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Hedef</label>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">{goal === 'LEADS' ? 'Lead Toplama' : goal === 'AWARENESS' ? 'Marka Bilinirliği' : goal === 'TRAFFIC' ? 'Web Trafiği' : 'Satış'}</div>
                      </div>
                    </div>
                    {draft.target_audience && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Hedef Kitle</label>
                        <textarea value={typeof draft.target_audience === 'object' ? (draft.target_audience.description || JSON.stringify(draft.target_audience)) : draft.target_audience}
                          onChange={e => setDraft({...draft, target_audience: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 h-14 resize-none focus:outline-none focus:border-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Facebook Reklam Önizleme */}
                  {draft.ad_copies?.[0] && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Reklam Önizleme</label>
                        <span className="text-[9px] text-slate-400">Tıklayarak düzenleyin</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {/* FB Header */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">S</div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">İşletmeniz</p>
                            <p className="text-[10px] text-slate-400">Sponsorlu</p>
                          </div>
                        </div>
                        {/* Primary Text — editable */}
                        <div className="px-3 py-2">
                          <textarea value={draft.ad_copies[0].primary_text || draft.ad_copies[0].body || ''}
                            onChange={e => { const copies = [...draft.ad_copies]; copies[0] = {...copies[0], primary_text: e.target.value, body: e.target.value}; setDraft({...draft, ad_copies: copies}) }}
                            className="w-full text-xs text-slate-800 leading-relaxed resize-none focus:outline-none focus:bg-blue-50/30 rounded p-1 min-h-[48px] transition"
                            placeholder="Reklam metni..." />
                        </div>
                        {/* Image placeholder */}
                        <div className="bg-gradient-to-br from-slate-100 to-slate-50 h-36 flex items-center justify-center border-y border-slate-100">
                          {creatives.length > 0 && creatives[0].preview ? (
                            <img src={creatives[0].preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <Eye className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                              <p className="text-[10px] text-slate-400">Reklam görseli alanı</p>
                            </div>
                          )}
                        </div>
                        {/* Headline + CTA */}
                        <div className="px-3 py-2.5 bg-slate-50/50 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <input value={draft.ad_copies[0].headline || draft.ad_copies[0].title || ''}
                              onChange={e => { const copies = [...draft.ad_copies]; copies[0] = {...copies[0], headline: e.target.value, title: e.target.value}; setDraft({...draft, ad_copies: copies}) }}
                              className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none focus:bg-blue-50/30 rounded px-1 py-0.5 transition"
                              placeholder="Başlık..." />
                            <input value={draft.ad_copies[0].description || draft.ad_copies[0].link_description || ''}
                              onChange={e => { const copies = [...draft.ad_copies]; copies[0] = {...copies[0], description: e.target.value, link_description: e.target.value}; setDraft({...draft, ad_copies: copies}) }}
                              className="w-full text-[10px] text-slate-500 bg-transparent focus:outline-none focus:bg-blue-50/30 rounded px-1 py-0.5 transition mt-0.5"
                              placeholder="Alt açıklama..." />
                          </div>
                          <div className="px-3 py-1.5 bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shrink-0">
                            {draft.ad_copies[0].cta || 'Daha Fazla'}
                          </div>
                        </div>
                        {/* Character counts */}
                        <div className="flex gap-4 px-3 py-1.5 border-t border-slate-100 text-[9px] text-slate-400">
                          <span>Başlık: {(draft.ad_copies[0].headline || draft.ad_copies[0].title || '').length}/40</span>
                          <span>Metin: {(draft.ad_copies[0].primary_text || draft.ad_copies[0].body || '').length}/125</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Multiple ad copies */}
                  {draft.ad_copies?.length > 1 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-blue-700 mb-2">+{draft.ad_copies.length - 1} alternatif reklam metni</p>
                      {draft.ad_copies.slice(1).map((copy: any, i: number) => (
                        <div key={i} className="bg-white rounded-lg p-2 mb-1.5 last:mb-0">
                          <input value={copy.headline || copy.title || ''} onChange={e => { const copies = [...draft.ad_copies]; copies[i+1] = {...copies[i+1], headline: e.target.value, title: e.target.value}; setDraft({...draft, ad_copies: copies}) }}
                            className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none mb-0.5" placeholder="Başlık..." />
                          <textarea value={copy.primary_text || copy.body || ''} onChange={e => { const copies = [...draft.ad_copies]; copies[i+1] = {...copies[i+1], primary_text: e.target.value, body: e.target.value}; setDraft({...draft, ad_copies: copies}) }}
                            className="w-full text-[10px] text-slate-600 bg-transparent focus:outline-none resize-none h-8" placeholder="Metin..." />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta connection */}
                  {!connected && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-blue-800 text-xs font-semibold">Kampanyayı yayınlamak için Meta hesabınızı bağlayın</span>
                      </div>
                      <button onClick={async () => { try { const d = await fetch(`${API}/api/ads/oauth-url`, { headers: authH() }).then(r => r.json()); if (d.url) window.location.href = d.url } catch {} }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-xl text-sm font-bold transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Meta ile Bağlan
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep(4)} className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">
                      ← Geri
                    </button>
                    <button onClick={closeWizard} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">
                      Taslak Kaydet
                    </button>
                    <button
                      onClick={launchCampaign}
                      disabled={!connected || launching}
                      className={`flex-1 py-3 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg ${connected ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                    >
                      {launching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {launching ? 'Yayınlanıyor...' : connected ? 'Meta\'da Yayınla' : 'Önce Meta Bağlayın'}
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
