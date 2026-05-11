'use client'
import { useState, useEffect, useRef } from 'react'
import {
  X, CheckCircle, ChevronRight, Sparkles, Target, Phone,
  Users, Globe, Megaphone, DollarSign, MapPin, Languages,
  RefreshCw, AlertTriangle, ArrowLeft, Rocket, Edit3,
  TrendingUp, MousePointer, Eye, BarChart2, ShoppingCart,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

// ─── Google Ad Preview ────────────────────────────────────────────────────────
interface GoogleAdPreviewProps {
  headlines: string[]
  descriptions: string[]
  displayUrl: string
}

function GoogleAdPreview({ headlines, descriptions, displayUrl }: GoogleAdPreviewProps) {
  const h = (headlines || []).slice(0, 3).map(h => h.slice(0, 30))
  const d = (descriptions || []).slice(0, 2).map(d => d.slice(0, 90))
  const headlineText = h.join(' | ')
  const domainDisplay = displayUrl
    ? displayUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : 'example.com'

  return (
    <div className="bg-[#202124] border border-[#3c4043] rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-medium text-[#9aa0a6] border border-[#3c4043] rounded px-1.5 py-0.5 leading-none">
          Reklam
        </span>
        <span className="text-[#9aa0a6] text-xs truncate">{domainDisplay}</span>
      </div>
      <p className="text-[#8ab4f8] text-base font-medium leading-snug hover:underline cursor-pointer">
        {headlineText || 'Reklam Başlığı | İkinci Başlık | Üçüncü Başlık'}
      </p>
      {d.map((desc, i) => (
        <p key={i} className="text-[#bdc1c6] text-sm leading-relaxed">
          {desc}
        </p>
      ))}
      {d.length === 0 && (
        <p className="text-[#bdc1c6] text-sm leading-relaxed">
          Reklam açıklamanız burada görünecek. Ürün ve hizmetlerinizi en iyi şekilde tanıtın.
        </p>
      )}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignWizardProps {
  onClose: () => void
  onSuccess: (campaign: any) => void
  businessProfile?: any
}

const STEP_LABELS = ['İşletme', 'Hedef', 'Bütçe', 'AI Analiz', 'İncele']

const GOALS = [
  {
    value: 'sales',
    label: 'Satış Al',
    description: 'Ürün/hizmet satışlarını artır',
    Icon: ShoppingCart,
    color: 'amber',
  },
  {
    value: 'calls',
    label: 'Arama Al',
    description: 'Müşterilerden telefon araması al',
    Icon: Phone,
    color: 'emerald',
  },
  {
    value: 'leads',
    label: 'Müşteri Adayı',
    description: 'Form dolduranları topla',
    Icon: Users,
    color: 'blue',
  },
  {
    value: 'traffic',
    label: 'Web Trafiği',
    description: 'Siteye ziyaretçi çek',
    Icon: Globe,
    color: 'purple',
  },
  {
    value: 'awareness',
    label: 'Marka Bilinirliği',
    description: 'Daha fazla kişiye ulaş',
    Icon: Megaphone,
    color: 'rose',
  },
]

const GOAL_COLORS: Record<string, string> = {
  amber: 'border-amber-500 bg-amber-500/10',
  emerald: 'border-emerald-500 bg-emerald-500/10',
  blue: 'border-blue-500 bg-blue-500/10',
  purple: 'border-purple-500 bg-purple-500/10',
  rose: 'border-rose-500 bg-rose-500/10',
}

const GOAL_ICON_COLORS: Record<string, string> = {
  amber: 'text-amber-400 bg-amber-500/15',
  emerald: 'text-emerald-400 bg-emerald-500/15',
  blue: 'text-blue-400 bg-blue-500/15',
  purple: 'text-purple-400 bg-purple-500/15',
  rose: 'text-rose-400 bg-rose-500/15',
}

const ANALYSIS_STEPS = [
  'İşletmeniz analiz ediliyor...',
  'En iyi anahtar kelimeler araştırılıyor...',
  'Uzman reklam metinleri yazılıyor...',
  'Optimal teklifler hesaplanıyor...',
  'Kampanya planı tamamlanıyor...',
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignWizard({ onClose, onSuccess, businessProfile }: CampaignWizardProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    businessDescription: businessProfile?.company?.description || '',
    product: businessProfile?.product?.name || '',
    differentiator: '',
    goal: '',
    goalLabel: '',
    location: 'Türkiye',
    language: 'tr',
    dailyBudget: 50,
    websiteUrl: businessProfile?.company?.website || '',
    finalUrl: businessProfile?.company?.website || '',
  })
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to top on step change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [step])

  // Step 4: run analysis automatically
  useEffect(() => {
    if (step === 4) {
      runAnalysis()
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [step])

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setAnalysisStepIdx(0)

    // Animate through steps
    intervalRef.current = setInterval(() => {
      setAnalysisStepIdx(prev => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return prev
        }
        return prev + 1
      })
    }, 2000)

    try {
      const r = await fetch(`${API}/api/google-campaign/analyze-business`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(data),
      })
      const result = await r.json()
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (result && result.ok && result.plan) {
        setAnalysisStepIdx(ANALYSIS_STEPS.length - 1)
        setPlan(result.plan)
        setTimeout(() => {
          setLoading(false)
          setStep(5)
        }, 600)
      } else {
        setLoading(false)
        setError(result?.error || 'Analiz tamamlanamadı. Lütfen tekrar deneyin.')
      }
    } catch (e: any) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
      setError(e.message || 'Sunucuya bağlanılamadı.')
    }
  }

  async function launchCampaign() {
    setCreating(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/google-campaign/create`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ campaignPlan: plan, finalUrl: data.finalUrl, goal: data.goal }),
      })
      const result = await r.json()
      if (result && result.ok) {
        onSuccess(result.campaign || result)
        onClose()
      } else {
        setError(result?.error || 'Kampanya oluşturulamadı.')
      }
    } catch (e: any) {
      setError(e.message || 'Sunucuya bağlanılamadı.')
    }
    setCreating(false)
  }

  function selectGoal(goal: typeof GOALS[0]) {
    setData(d => ({ ...d, goal: goal.value, goalLabel: goal.label }))
    setTimeout(() => setStep(3), 200)
  }

  function canGoNext() {
    if (step === 1) return data.businessDescription.trim() !== '' && data.product.trim() !== ''
    if (step === 2) return data.goal !== ''
    if (step === 3) return data.dailyBudget >= 5 && data.finalUrl.trim() !== ''
    return true
  }

  const estimatedClicks = Math.round(data.dailyBudget / 1.5)
  const estimatedImpressions = estimatedClicks * 12

  // ── Step Progress ──────────────────────────────────────────────────────────
  function StepCircle({ n }: { n: number }) {
    const done = step > n
    const current = step === n
    if (done) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )
    }
    if (current) {
      return (
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
          <div className="relative w-8 h-8 rounded-full bg-amber-600 border-2 border-amber-400 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{n}</span>
          </div>
        </div>
      )
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
        <span className="text-slate-500 text-xs font-medium">{n}</span>
      </div>
    )
  }

  // ── Input helpers ──────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition'
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold text-lg">Yeni Google Ads Kampanyası</h2>
              <p className="text-slate-500 text-xs mt-0.5">AI destekli kampanya oluşturma sihirbazı</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading || creating}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-0">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <StepCircle n={n} />
                  <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${step === n ? 'text-amber-400' : step > n ? 'text-slate-400' : 'text-slate-600'}`}>
                    {STEP_LABELS[i]}
                  </span>
                </div>
                {i < 4 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-all ${step > n ? 'bg-amber-500' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── STEP 1: Business Profile ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-base mb-1">İşletmenizi Tanımlayın</h3>
                <p className="text-slate-500 text-sm">AI, bu bilgiler sayesinde size özel reklam metinleri ve anahtar kelimeler oluşturacak.</p>
              </div>

              <div>
                <label className={labelCls}>İşletme Açıklaması *</label>
                <textarea
                  rows={4}
                  placeholder="İşletmenizi kısaca tanımlayın. Ne yapıyorsunuz, kimler için?"
                  className={`${inputCls} resize-none`}
                  value={data.businessDescription}
                  onChange={e => setData(d => ({ ...d, businessDescription: e.target.value }))}
                />
                {data.businessDescription.trim() === '' && (
                  <p className="text-red-400 text-xs mt-1">Bu alan zorunludur.</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Ana Ürün veya Hizmet *</label>
                <input
                  type="text"
                  placeholder="Örn: Hukuk danışmanlığı, CRM yazılımı, diş tedavisi..."
                  className={inputCls}
                  value={data.product}
                  onChange={e => setData(d => ({ ...d, product: e.target.value }))}
                />
                {data.product.trim() === '' && (
                  <p className="text-red-400 text-xs mt-1">Bu alan zorunludur.</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Rakiplerinizden Farkınız</label>
                <input
                  type="text"
                  placeholder="Örn: 10 yıllık deneyim, %100 para iade garantisi, 7/24 destek..."
                  className={inputCls}
                  value={data.differentiator}
                  onChange={e => setData(d => ({ ...d, differentiator: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelCls}>Web Siteniz</label>
                <input
                  type="url"
                  placeholder="https://www.siteniz.com"
                  className={inputCls}
                  value={data.websiteUrl}
                  onChange={e => setData(d => ({ ...d, websiteUrl: e.target.value, finalUrl: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Campaign Goal ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Kampanya Hedefiniz</h3>
                <p className="text-slate-500 text-sm">Hedefi seçin, bir sonraki adıma otomatik geçelim.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((goal, i) => {
                  const isSelected = data.goal === goal.value
                  const colorKey = goal.color
                  return (
                    <button
                      key={goal.value}
                      onClick={() => selectGoal(goal)}
                      className={`
                        relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                        ${isSelected
                          ? GOAL_COLORS[colorKey]
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}
                        ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}
                      `}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${GOAL_ICON_COLORS[colorKey]}`}>
                        <goal.Icon className="w-4.5 h-4.5 w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold">{goal.label}</p>
                        <p className="text-slate-400 text-xs mt-0.5 leading-snug">{goal.description}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5">
                          <CheckCircle className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Target & Budget ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Hedef & Bütçe</h3>
                <p className="text-slate-500 text-sm">Reklamların nerede, kime ve ne kadar harcamayla gösterileceğini belirleyin.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Hedef Konum</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Türkiye"
                    className={inputCls}
                    value={data.location}
                    onChange={e => setData(d => ({ ...d, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    <span className="flex items-center gap-1.5"><Languages className="w-3.5 h-3.5" /> Reklam Dili</span>
                  </label>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={data.language}
                    onChange={e => setData(d => ({ ...d, language: e.target.value }))}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="de">Almanca</option>
                    <option value="ar">Arapça</option>
                    <option value="ru">Rusça</option>
                  </select>
                </div>
              </div>

              {/* Budget Slider */}
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Günlük Bütçe
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-amber-400 text-2xl font-bold">${data.dailyBudget}</span>
                    <span className="text-slate-500 text-xs">/gün</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={data.dailyBudget}
                  onChange={e => setData(d => ({ ...d, dailyBudget: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>$5</span>
                  <span>$500</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MousePointer className="w-3 h-3 text-amber-400" />
                    ~{estimatedClicks} tıklama/gün
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-400" />
                    ~{estimatedImpressions.toLocaleString()} gösterim/gün
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <span className="text-slate-400 text-xs">Tahmini aylık harcama</span>
                  <span className="text-amber-400 text-sm font-semibold">${(data.dailyBudget * 30).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Hedef URL — Müşteri nereye gitsin?</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.siteniz.com/hedef-sayfa"
                  className={inputCls}
                  value={data.finalUrl}
                  onChange={e => setData(d => ({ ...d, finalUrl: e.target.value }))}
                />
                <p className="text-slate-600 text-xs mt-1.5">Reklama tıklayanlar bu sayfaya yönlendirilecek.</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: AI Analysis ── */}
          {step === 4 && (
            <div className="space-y-6 py-4">
              {error ? (
                // Error state
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 text-sm font-medium">Analiz Başarısız</p>
                      <p className="text-slate-400 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={runAnalysis}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" /> Tekrar Dene
                  </button>
                </div>
              ) : (
                <>
                  {/* Animated icon */}
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                        <Sparkles className={`w-9 h-9 text-amber-400 ${loading ? 'animate-pulse' : ''}`} />
                      </div>
                      {loading && (
                        <>
                          <div className="absolute -inset-2 rounded-3xl border border-amber-400/20 animate-ping" />
                          <div className="absolute -inset-4 rounded-3xl border border-amber-400/10 animate-ping animation-delay-300" />
                        </>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">AI Kampanya Analizi</p>
                      <p className="text-slate-500 text-sm mt-1">İşletmeniz için en iyi kampanya planı hazırlanıyor...</p>
                    </div>
                  </div>

                  {/* Analysis steps list */}
                  <div className="space-y-2.5 max-w-sm mx-auto w-full">
                    {ANALYSIS_STEPS.map((label, i) => {
                      const done = i < analysisStepIdx
                      const active = i === analysisStepIdx && loading
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            done
                              ? 'bg-emerald-500/8 border-emerald-500/20'
                              : active
                              ? 'bg-amber-500/8 border-amber-500/25'
                              : 'bg-slate-800/40 border-slate-700/50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            done ? 'bg-emerald-500/20' : active ? 'bg-amber-500/20' : 'bg-slate-700'
                          }`}>
                            {done ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : active ? (
                              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-600 block" />
                            )}
                          </div>
                          <span className={`text-sm ${
                            done ? 'text-emerald-300' : active ? 'text-amber-300' : 'text-slate-600'
                          }`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 5: Review & Launch ── */}
          {step === 5 && plan && (
            <div className="space-y-5">
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Kampanya Planınız Hazır</h3>
                <p className="text-slate-500 text-sm">AI tarafından oluşturulan kampanyayı inceleyin ve başlatın.</p>
              </div>

              {/* Campaign Summary */}
              <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Kampanya Adı</p>
                    <p className="text-white font-semibold text-sm">{plan.campaign_name || 'AI Kampanyası'}</p>
                  </div>
                  {plan.bid_strategy && (
                    <span className="text-xs px-2.5 py-1 bg-amber-500/15 border border-amber-500/25 text-amber-300 rounded-lg whitespace-nowrap shrink-0">
                      {plan.bid_strategy}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Günlük bütçe: <strong className="text-white">${data.dailyBudget}</strong></span>
                </div>

                {/* Expected Results */}
                {plan.budget_recommendation && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      {
                        label: 'Tıklama/Gün',
                        value: plan.budget_recommendation.clicks_per_day || estimatedClicks,
                        icon: MousePointer,
                        color: 'text-amber-400',
                        border: 'border-amber-500/20',
                      },
                      {
                        label: 'Gösterim/Gün',
                        value: plan.budget_recommendation.impressions_per_day
                          ? Number(plan.budget_recommendation.impressions_per_day).toLocaleString()
                          : estimatedImpressions.toLocaleString(),
                        icon: Eye,
                        color: 'text-blue-400',
                        border: 'border-blue-500/20',
                      },
                      {
                        label: 'Dönüşüm/Ay',
                        value: plan.budget_recommendation.conversions_per_month || '—',
                        icon: TrendingUp,
                        color: 'text-emerald-400',
                        border: 'border-emerald-500/20',
                      },
                      {
                        label: 'Tahmini CPC',
                        value: plan.budget_recommendation.estimated_cpc
                          ? `$${plan.budget_recommendation.estimated_cpc}`
                          : `$${(data.dailyBudget / estimatedClicks).toFixed(2)}`,
                        icon: BarChart2,
                        color: 'text-purple-400',
                        border: 'border-purple-500/20',
                      },
                    ].map(({ label, value, icon: Icon, color, border }) => (
                      <div key={label} className={`p-3 bg-slate-800 border ${border} rounded-xl`}>
                        <Icon className={`w-3.5 h-3.5 ${color} mb-1.5`} />
                        <p className={`text-base font-semibold ${color}`}>{value}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ad Groups */}
              {plan.ad_groups && plan.ad_groups.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" /> Reklam Grupları
                  </p>
                  {plan.ad_groups.slice(0, 2).map((group: any, gi: number) => {
                    const headlines: string[] = group.headlines || group.ads?.[0]?.headlines || []
                    const descriptions: string[] = group.descriptions || group.ads?.[0]?.descriptions || []
                    const keywords: string[] = group.keywords || []
                    const extraKw = keywords.length > 6 ? keywords.length - 6 : 0
                    return (
                      <div key={gi} className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700/50">
                          <p className="text-white text-sm font-medium">{group.name || group.ad_group_name || `Grup ${gi + 1}`}</p>
                        </div>
                        <div className="p-4 space-y-3">
                          {/* Keywords */}
                          {keywords.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-2">Anahtar Kelimeler</p>
                              <div className="flex flex-wrap gap-1.5">
                                {keywords.slice(0, 6).map((kw: string, ki: number) => (
                                  <span key={ki} className="px-2.5 py-1 bg-slate-700 border border-slate-600/60 rounded-lg text-xs text-slate-300">
                                    {kw}
                                  </span>
                                ))}
                                {extraKw > 0 && (
                                  <span className="px-2.5 py-1 bg-slate-700/50 border border-slate-700 rounded-lg text-xs text-slate-500">
                                    +{extraKw} daha
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Ad Preview */}
                          {(headlines.length > 0 || descriptions.length > 0) && (
                            <div>
                              <p className="text-xs text-slate-500 mb-2">Reklam Önizleme</p>
                              <GoogleAdPreview
                                headlines={headlines}
                                descriptions={descriptions}
                                displayUrl={data.finalUrl || data.websiteUrl}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Expert Notes */}
              {(plan.expert_notes || plan.quality_score_tips) && (
                <div className="bg-amber-500/6 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <p className="text-amber-300 text-sm font-medium">AI Uzman Notları</p>
                  </div>
                  {plan.expert_notes && (
                    <p className="text-slate-300 text-sm leading-relaxed">{plan.expert_notes}</p>
                  )}
                  {plan.quality_score_tips && plan.quality_score_tips.length > 0 && (
                    <ul className="space-y-1.5 mt-2">
                      {plan.quality_score_tips.slice(0, 3).map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0 mt-1.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Error box */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/25 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={launchCampaign}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-900/20"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Kampanya Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" /> Kampanyayı Başlat
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setStep(1); setError('') }}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Kampanyayı Düzenle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Navigation ── */}
        {step !== 4 && (
          <div className="px-6 py-4 border-t border-slate-700 shrink-0 flex items-center justify-between gap-3">
            {step <= 3 ? (
              <>
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 1}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" /> Geri
                </button>

                {step === 2 ? (
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
                  >
                    İleri <ChevronRight className="w-4 h-4" />
                  </button>
                ) : step === 3 ? (
                  <button
                    onClick={() => setStep(4)}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
                  >
                    <Sparkles className="w-4 h-4" /> AI ile Analiz Et
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
                  >
                    İleri <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : step === 5 ? (
              <button
                onClick={() => { setStep(3); setError('') }}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" /> Geri
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
