'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import MetaOptimizer from './MetaOptimizer'
import AdsROI from './AdsROI'
import {
  RefreshCw, Users, CheckCircle, Link, Target, BarChart2,
  ArrowUpRight, X, ChevronRight, ChevronDown, Sparkles,
  AlertTriangle, Activity, Zap, TrendingUp, DollarSign, Download, Brain
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const GOALS = [
  { id: 'LEADS', label: 'Lead Toplama', desc: 'Form dolduran müşteri adayları', icon: '👥' },
  { id: 'AWARENESS', label: 'Marka Farkındalığı', desc: 'Daha fazla kişiye ulaş', icon: '📣' },
  { id: 'TRAFFIC', label: 'Web Trafiği', desc: 'Siteye ziyaretçi çek', icon: '🌐' },
  { id: 'SALES', label: 'Satış', desc: 'Ürün ve hizmet sat', icon: '💰' },
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

function AlgorithmTrainingBanner({ platform, eventsToday, eventsTotal, lastAt, eventTypes }: {
  platform: 'meta' | 'google'
  eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[]
}) {
  const isMeta = platform === 'meta'
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

  const STEPS = isMeta
    ? ['Lead', 'Contact', 'InitiateCheckout', 'Purchase']
    : ['Lead', 'Contact', 'Purchase']

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${isActive ? 'bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-blue-950/60 border-blue-500/25' : 'bg-slate-800/40 border-slate-700/50'}`}>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/8 to-blue-600/5 animate-pulse pointer-events-none" />
      )}
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: status */}
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
            <Brain size={18} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-white font-semibold text-sm">
                {isMeta ? 'Meta' : 'Google'} Algoritması Eğitiliyor
              </h3>
              {isActive ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/25">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  AKTİF
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                  BEKLEMEDE
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
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
                    <span key={step} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${done ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                      {done && <span className="w-1 h-1 bg-blue-400 rounded-full" />}
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
              <p className="text-xl font-bold text-blue-400">{eventsToday}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Bugün</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-400">{eventsTotal}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Toplam</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{relativeTime(lastAt)}</p>
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
  const [aiMsgIdx, setAiMsgIdx] = useState(0)
  const [launching, setLaunching] = useState(false)
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && searchParams.get('state') === 'meta') exchangeToken(code)
    else loadAll()
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/ads/exchange-token`, { method: 'POST', headers: authH(), body: JSON.stringify({ code }) })
      const d = await r.json()
      if (d.success) { showMsg('success', 'Meta bağlandı!'); window.history.replaceState({}, '', window.location.pathname); loadAll() }
    } catch {}
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
    setStep(4); setAiMsgIdx(0)
    let idx = 0
    animIntervalRef.current = setInterval(() => {
      idx++
      if (idx < AI_MSGS.length) setAiMsgIdx(idx)
      else { if (animIntervalRef.current) clearInterval(animIntervalRef.current) }
    }, 1600)

    let apiDone = false
    let animDone = false
    let draftData: any = null

    const advanceIfBoth = () => { if (apiDone && animDone && draftData) setStep(5) }

    setTimeout(() => { animDone = true; advanceIfBoth() }, AI_MSGS.length * 1600)

    try {
      const r = await fetch(`${API}/api/ads-intelligence/ai-create-campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ businessDescription: desc, goal, dailyBudget: Number(budget), currency: 'TRY', avgDealValue: avgDeal ? Number(avgDeal) : 0 }),
      })
      const d = await r.json()
      if (d.ok && d.draft) { draftData = d.draft; setDraft(d.draft); apiDone = true; advanceIfBoth() }
      else { showMsg('error', d.error || 'AI kampanya planı oluşturulamadı'); closeWizard() }
    } catch { showMsg('error', 'Bağlantı hatası'); closeWizard() }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-red-500/30 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Meta Ads</h1>
            <p className="text-slate-400 text-sm mt-0.5">{t('ads.kampanya_yonetimi_ve_lead', 'Kampanya yönetimi ve lead otomasyonu')}</p>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-medium">{t('ads.meta_bagli', 'Meta Bağlı')}</span>
              </div>
            ) : (
              <button onClick={connectMeta} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition">
                <Link className="w-4 h-4" /> Meta Bağla
              </button>
            )}
            <button onClick={loadAll} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Algorithm Training Banner */}
        <AlgorithmTrainingBanner
          platform="meta"
          eventsToday={capiStatus.eventsToday}
          eventsTotal={capiStatus.eventsTotal}
          lastAt={capiStatus.lastAt}
          eventTypes={capiStatus.eventTypes}
        />

        {/* 3 Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={openWizard}
            className="group relative bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/30 hover:border-blue-400/50 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold text-lg">AI Kampanya</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">{t('ads.isletmeni_anlat_ai_sana_o', 'İşletmeni anlat, AI sana özel kampanya oluştursun')}</p>
            <div className="mt-4 flex items-center gap-1 text-blue-400 text-xs font-medium">
              Oluştur <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={extractLeads}
            disabled={extracting || !connected}
            className="group relative bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 hover:border-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition">
              {extracting ? <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" /> : <Users className="w-6 h-6 text-purple-400" />}
            </div>
            <h3 className="text-white font-semibold text-lg">{t('ads.lead_cek', 'Lead Çek')}</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              {extracting ? "Meta'dan lead'ler çekiliyor..." : "Reklam formlarından lead'leri otomatik al"}
            </p>
            {leadsToday > 0 && !extracting && (
              <div className="mt-4 flex items-center gap-1 text-purple-400 text-xs font-medium">
                Bugün {leadsToday} lead <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            )}
          </button>

          <button
            onClick={() => setShowAdvanced(true)}
            className="group relative bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/30 hover:border-emerald-400/50 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition">
              <BarChart2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-semibold text-lg">Performans</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">{t('ads.roi_analizi_akilli_uyaril', 'ROI analizi, akıllı uyarılar ve optimizasyon')}</p>
            <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs font-medium">
              İncele <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* ── META CAPI & HEDEFLEME ── */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Meta CAPI & Hedefleme</span>
                <p className="text-xs text-slate-500">{t('ads.conversion_api_ile_leadle', 'Conversion API ile leadleri hedef kitleye dönüştür')}</p>
              </div>
            </div>
            <a href="/meta-intent"
              className="flex items-center gap-1 text-blue-400 text-xs font-medium hover:text-blue-300 transition">
              Tam Ekran <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <a href="/meta-intent"
              className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl p-3 transition group block">
              <div className="text-lg mb-1">📡</div>
              <p className="text-white text-xs font-semibold">{t('ads.event_gonder', 'Event Gönder')}</p>
              <p className="text-slate-500 text-xs">Leadleri CAPI ile bildir</p>
            </a>
            <a href="/meta-intent"
              className="bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl p-3 transition group block">
              <div className="text-lg mb-1">🎯</div>
              <p className="text-white text-xs font-semibold">Custom Audience</p>
              <p className="text-slate-500 text-xs">{t('ads.lead_listenden_kitle_olus', 'Lead listenden kitle oluştur')}</p>
            </a>
            <a href="/meta-intent"
              className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-xl p-3 transition group block">
              <div className="text-lg mb-1">{'<>'}</div>
              <p className="text-white text-xs font-semibold">Pixel Kodu</p>
              <p className="text-slate-500 text-xs">Site takip kodunu al</p>
            </a>
          </div>
        </div>

        {/* Activity Feed */}
        {activities.length > 0 && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-white">Son Aktiviteler</span>
            </div>
            <div className="space-y-0">
              {activities.slice(0, 5).map((act: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${act.severity === 'critical' ? 'bg-red-400' : act.type === 'new_leads' ? 'bg-emerald-400' : act.type === 'campaign_launched' ? 'bg-blue-400' : 'bg-slate-500'}`} />
                  <span className="text-sm text-slate-300 flex-1">{act.message}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{act.time_ago}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign List */}
        {campaigns.length > 0 && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-white">Aktif Kampanyalar</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs">{campaigns.length}</span>
            </div>
            <div className="space-y-0">
              {campaigns.slice(0, 5).map((camp: any) => {
                const spend = Number(camp.insights?.data?.[0]?.spend || 0)
                const hasRoi = camp.roi_percent !== null && camp.roi_percent !== undefined
                return (
                  <div key={camp.id} className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{camp.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {camp.status === 'ACTIVE' ? 'Aktif' : camp.status || 'Taslak'}{camp.objective ? ` · ${camp.objective}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {spend > 0 && (
                        <div className="text-right text-xs hidden sm:block">
                          <div className="text-white">${spend.toFixed(0)}</div>
                          <div className="text-slate-500">harcama</div>
                        </div>
                      )}
                      {hasRoi && (
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${camp.roi_percent >= 0 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'}`}>
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
              <h2 className="text-base font-semibold text-white">{t('ads.reklam_sonuclarim', 'Reklam Sonuçlarım')}</h2>
              <span className="text-xs text-slate-500">{t('ads.reklamlardan_gelen_leadle', 'Reklamlardan gelen leadlerin satışa dönüşüm takibi')}</span>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{adSummary.totalLeads}</p>
                <p className="text-xs text-slate-400 mt-1">Reklamdan Gelen Lead</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{adSummary.totalWon}</p>
                <p className="text-xs text-slate-400 mt-1">{t('ads.musteriye_donen', 'Müşteriye Dönen')}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {adSummary.totalRevenue > 0 ? `₺${adSummary.totalRevenue.toLocaleString('tr-TR')}` : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{t('ads.toplam_kazanc', 'Toplam Kazanç')}</p>
              </div>
            </div>

            {/* Per-campaign breakdown */}
            {adResults.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-700/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{t('ads.kampanya_bazinda', 'Kampanya Bazında')}</span>
                  <button onClick={async () => {
                    const res = await fetch(`${API}/api/meta-capi/audience/won`, { headers: authH() })
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'musteri-listesi.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
                    <Download className="w-3.5 h-3.5" /> Müşteri Listesini İndir
                  </button>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {adResults.slice(0, 8).map((row, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {row.campaign !== '—' ? row.campaign : row.source}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.leads} lead geldi</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {row.won > 0 && (
                          <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {row.won} müşteri
                          </div>
                        )}
                        {row.revenue > 0 && (
                          <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-semibold text-amber-400">
                            ₺{row.revenue.toLocaleString('tr-TR')}
                          </div>
                        )}
                        {row.won === 0 && (
                          <span className="text-xs text-slate-600">{t('ads.henuz_musteri_yok', 'Henüz müşteri yok')}</span>
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
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition py-1"
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
      </div>

      {/* Campaign Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white">{t('ads.ai_kampanya_olustur', 'AI Kampanya Oluştur')}</span>
              </div>
              <button onClick={closeWizard} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1.5 px-6 pt-4">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-500 ${s <= step ? 'bg-blue-500' : 'bg-slate-700'}`} />
              ))}
            </div>

            <div className="p-6">
              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t('ads.isletmeni_anlat', 'İşletmeni Anlat')}</h2>
                    <p className="text-sm text-slate-400 mt-1">{t('ads.ne_sattigini_ve_kime_satt', 'Ne sattığını ve kime sattığını kısaca yaz')}</p>
                  </div>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder={t('ads.orn_istanbulda_mutfak_dol', 'Örn: İstanbul\'da mutfak dolabı satan bir firmayız. 30-55 yaş ev yenileyen müşterilere ulaşmak istiyoruz. Ortalama sipariş değerimiz 15.000 TL...')}
                    className="w-full h-36 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    onClick={() => setStep(2)}
                    disabled={desc.trim().length < 20}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition"
                  >
                    Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Kampanya Hedefi</h2>
                    <p className="text-sm text-slate-400 mt-1">Ne elde etmek istiyorsun?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${goal === g.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                      >
                        <div className="text-2xl mb-2">{g.icon}</div>
                        <div className="text-sm font-medium text-white">{g.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5 leading-snug">{g.desc}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep(3)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition">
                    Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t('ads.butce_ve_deger', 'Bütçe ve Değer')}</h2>
                    <p className="text-sm text-slate-400 mt-1">{t('ads.gunluk_reklam_butceni_bel', 'Günlük reklam bütçeni belirle')}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block">{t('ads.gunluk_butce_try', 'Günlük Bütçe (TRY)')}</label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {['100', '200', '500', '1000'].map(v => (
                          <button
                            key={v}
                            onClick={() => setBudget(v)}
                            className={`py-2 text-sm rounded-lg border transition ${budget === v ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'}`}
                          >
                            ₺{v}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                        placeholder={t('ads.ozel_tutar_girebilirsin', 'Özel tutar girebilirsin...')}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block">
                        Ortalama Müşteri Değeri (TRY) <span className="text-slate-600">{t('ads.roi_hesabi_icin', '— ROI hesabı için')}</span>
                      </label>
                      <input
                        type="number"
                        value={avgDeal}
                        onChange={e => setAvgDeal(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                        placeholder={t('ads.orn_5000', 'Örn: 5000')}
                      />
                    </div>
                  </div>
                  <button
                    onClick={runAiStep}
                    disabled={!budget || Number(budget) < 10}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> AI ile Oluştur
                  </button>
                </div>
              )}

              {/* Step 4: AI Animation */}
              {step === 4 && (
                <div className="py-10 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 bg-blue-500/30 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{t('ads.kampanya_hazirlaniyor', 'Kampanya Hazırlanıyor')}</p>
                    <p className="text-blue-400 text-sm mt-2 min-h-[20px]">{AI_MSGS[aiMsgIdx]}</p>
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {AI_MSGS.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= aiMsgIdx ? 'bg-blue-400' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Preview & Launch */}
              {step === 5 && draft && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t('ads.kampanya_onizleme', 'Kampanya Önizleme')}</h2>
                    <p className="text-sm text-slate-400 mt-1">{t('ads.ai_planini_incele_ve_yayi', 'AI planını incele ve yayınla')}</p>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl divide-y divide-slate-700/40 max-h-60 overflow-y-auto">
                    <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                      <span className="text-slate-400">{t('ads.kampanya_adi', 'Kampanya Adı')}</span>
                      <span className="text-white font-medium truncate ml-4 max-w-[60%] text-right">{draft.campaign_name || 'AI Kampanya'}</span>
                    </div>
                    {draft.target_audience && (
                      <div className="flex justify-between items-start px-4 py-2.5 text-xs">
                        <span className="text-slate-400 shrink-0">Hedef Kitle</span>
                        <span className="text-white ml-4 text-right max-w-[65%]">
                          {typeof draft.target_audience === 'object'
                            ? (draft.target_audience.description || draft.target_audience.age_range || JSON.stringify(draft.target_audience))
                            : draft.target_audience}
                        </span>
                      </div>
                    )}
                    {draft.budget && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                        <span className="text-slate-400">{t('ads.gunluk_butce', 'Günlük Bütçe')}</span>
                        <span className="text-white">{typeof draft.budget === 'object' ? `₺${draft.budget.daily_budget || draft.budget.amount}` : `₺${draft.budget}`}</span>
                      </div>
                    )}
                    {draft.ad_copies?.[0] && (
                      <div className="px-4 py-3 space-y-2">
                        <p className="text-xs text-slate-400">{t('ads.reklam_metni_onizleme', 'Reklam Metni Önizleme')}</p>
                        <div className="bg-slate-900/60 rounded-lg p-3">
                          <p className="text-sm font-medium text-white leading-snug">
                            {(draft.ad_copies[0].headline || draft.ad_copies[0].title || '').slice(0, 40)}
                          </p>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {(draft.ad_copies[0].primary_text || draft.ad_copies[0].body || '').slice(0, 125)}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-slate-600">
                            <span>Başlık: {(draft.ad_copies[0].headline || draft.ad_copies[0].title || '').length}/40</span>
                            <span>Metin: {(draft.ad_copies[0].primary_text || draft.ad_copies[0].body || '').length}/125</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!connected && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-300 text-xs">{t('ads.yayinlamak_icin_meta_hesa', 'Yayınlamak için Meta hesabınızı bağlayın')}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={closeWizard} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition">
                      Kaydet & Kapat
                    </button>
                    <button
                      onClick={launchCampaign}
                      disabled={!connected || launching}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
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
