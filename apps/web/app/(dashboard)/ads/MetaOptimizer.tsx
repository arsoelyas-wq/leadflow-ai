'use client'
import { useState, useEffect } from 'react'
import { Sparkles, Copy, Check, Activity, Eye, MousePointer, AlertTriangle, CheckCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

type Section = 'creative' | 'audience' | 'health' | 'budget' | 'wizard'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'creative', label: 'Yaratıcı İçerik', icon: '🎨' },
  { id: 'audience', label: 'Kitle & Yerleşim', icon: '👥' },
  { id: 'health', label: 'Kampanya Sağlığı', icon: '🔔' },
  { id: 'budget', label: 'Bütçe Optimizasyon', icon: '💰' },
  { id: 'wizard', label: 'AI Kampanya Oluştur', icon: '🚀' },
]

export default function MetaOptimizer({ connected }: { connected: boolean }) {
  const [activeSection, setActiveSection] = useState<Section>('creative')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Creative state
  const [ads, setAds] = useState<any[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [generatedVariants, setGeneratedVariants] = useState<Record<string, any[]>>({})
  const [genForm, setGenForm] = useState<Record<string, { goal: string; targetAudience: string }>>({})

  // Audience state
  const [audienceData, setAudienceData] = useState<{ ageGender: any[]; placements: any[] } | null>(null)
  const [audLoading, setAudLoading] = useState(false)
  const [audTab, setAudTab] = useState<'age' | 'placement'>('age')

  // Health state
  const [healthData, setHealthData] = useState<{ campaigns: any[]; alerts: any[] } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Budget state
  const [budgetData, setBudgetData] = useState<{ campaigns: any[]; recommendations: any[]; summary: string } | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [wizardData, setWizardData] = useState({ product: '', budget: '50', goal: 'OUTCOME_LEADS', location: 'Türkiye', targetAge: '18-45', targetGender: 'ALL', language: 'Türkçe' })
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(45)
  const [plan, setPlan] = useState<any | null>(null)
  const [planning, setPlanning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<any | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Fetch creative
  useEffect(() => {
    if (activeSection !== 'creative') return
    fetch(`${API}/api/meta-opt/creative-performance`, { headers: authH() })
      .then(r => r.json())
      .then(d => setAds((d.ads || d || []).sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))))
      .catch(() => {})
  }, [activeSection])

  // Fetch audience
  useEffect(() => {
    if (activeSection !== 'audience') return
    setAudLoading(true)
    fetch(`${API}/api/meta-opt/audience-breakdown`, { headers: authH() })
      .then(r => r.json())
      .then(d => setAudienceData(d))
      .catch(() => {})
      .finally(() => setAudLoading(false))
  }, [activeSection])

  // Fetch health
  useEffect(() => {
    if (activeSection !== 'health') return
    setHealthLoading(true)
    fetch(`${API}/api/meta-opt/campaign-health`, { headers: authH() })
      .then(r => r.json())
      .then(d => setHealthData(d))
      .catch(() => {})
      .finally(() => setHealthLoading(false))
  }, [activeSection])

  // Fetch budget
  useEffect(() => {
    if (activeSection !== 'budget') return
    setBudgetLoading(true)
    fetch(`${API}/api/meta-opt/budget-optimizer`, { headers: authH() })
      .then(r => r.json())
      .then(d => setBudgetData(d))
      .catch(() => {})
      .finally(() => setBudgetLoading(false))
  }, [activeSection])

  async function generateVariants(adId: string) {
    const form = genForm[adId] || { goal: '', targetAudience: '' }
    setGenerating(adId)
    try {
      const r = await fetch(`${API}/api/meta-opt/creative-generate`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ adId, ...form }),
      })
      const d = await r.json()
      setGeneratedVariants(prev => ({ ...prev, [adId]: d.variants || d || [] }))
    } catch {
      showMsg('error', 'Varyant üretilemedi')
    } finally {
      setGenerating(null)
    }
  }

  async function applyBudget(campaignId: string, newDailyBudgetCents: number) {
    setApplying(campaignId)
    try {
      const r = await fetch(`${API}/api/meta-opt/budget-optimizer/apply`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ campaignId, newDailyBudgetCents }),
      })
      if (!r.ok) throw new Error()
      setAppliedIds(prev => new Set([...prev, campaignId]))
      showMsg('success', 'Bütçe başarıyla uygulandı')
    } catch {
      showMsg('error', 'Bütçe uygulanamadı')
    } finally {
      setApplying(null)
    }
  }

  async function analyzeWithAI() {
    setPlanning(true)
    try {
      const r = await fetch(`${API}/api/meta-opt/ai-campaign/plan`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ ...wizardData, ageMin, ageMax }),
      })
      const d = await r.json()
      if (!d.ok || !d.plan) { showMsg('error', d.error || 'AI plan oluşturulamadı'); return; }
      setPlan(d.plan)
      setWizardStep(3)
    } catch {
      showMsg('error', 'AI plan oluşturulamadı')
    } finally {
      setPlanning(false)
    }
  }

  async function createCampaign() {
    setCreating(true)
    try {
      const r = await fetch(`${API}/api/meta-opt/ai-campaign/create`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ plan, wizardData }),
      })
      const d = await r.json()
      if (!d.ok && !d.campaignId) { showMsg('error', d.error || 'Kampanya oluşturulamadı'); return; }
      setCreated(d)
      setWizardStep(4)
    } catch {
      showMsg('error', 'Kampanya oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }

  function scoreColor(s: number) {
    if (s >= 70) return 'text-emerald-400'
    if (s >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  function scoreBg(s: number) {
    if (s >= 70) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    if (s >= 40) return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    return 'bg-red-500/20 text-red-300 border-red-500/40'
  }

  function ringColor(s: number) {
    if (s >= 70) return '#10b981'
    if (s >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Section nav */}
      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeSection === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700/50'}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── SECTION 1: Yaratıcı İçerik ── */}
      {activeSection === 'creative' && (
        <div className="space-y-4">
          {/* Summary chips */}
          {ads.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Reklam', value: ads.length, icon: <Eye size={14} /> },
                { label: 'Aktif', value: ads.filter((a: any) => a.status === 'ACTIVE').length, icon: <Activity size={14} /> },
                { label: 'Ortalama CTR', value: `%${(ads.reduce((s: number, a: any) => s + (a.ctr || 0), 0) / (ads.length || 1)).toFixed(2)}`, icon: <MousePointer size={14} /> },
                { label: 'Ortalama Frekans', value: (ads.reduce((s: number, a: any) => s + (a.frequency || 0), 0) / (ads.length || 1)).toFixed(1), icon: <AlertTriangle size={14} /> },
              ].map(chip => (
                <div key={chip.label} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-slate-400">{chip.icon}</span>
                  <div>
                    <div className="text-xs text-slate-400">{chip.label}</div>
                    <div className="text-base font-bold text-white">{chip.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ad cards */}
          {ads.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center text-slate-400">
              Aktif reklamlarınız yüklenecek — Meta bağlantısı gerekli
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map((ad: any) => {
                const freq = ad.frequency || 0
                const score = ad.score ?? 0
                const variants = generatedVariants[ad.id] || []
                const form = genForm[ad.id] || { goal: '', targetAudience: '' }
                const showForm = generating === ad.id || variants.length > 0 || form.goal || form.targetAudience

                return (
                  <div key={ad.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ad.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className="font-semibold text-white text-sm truncate">{ad.name || 'Reklam'}</span>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg border ${scoreBg(score)}`}>{score}/100</span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        { label: 'CTR', value: `%${(ad.ctr || 0).toFixed(2)}` },
                        { label: 'CPM', value: `$${(ad.cpm || 0).toFixed(2)}` },
                        { label: 'Frekans', value: (ad.frequency || 0).toFixed(1) },
                        { label: 'Lead', value: ad.leads ?? ad.conversions ?? '—' },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-900/40 rounded-lg p-2 text-center">
                          <div className="text-slate-400">{m.label}</div>
                          <div className="text-white font-semibold mt-0.5">{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Frequency warning */}
                    {freq >= 5 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40">⚠️ Ad Yorgunluğu</span>
                    ) : freq >= 3 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">Dikkat</span>
                    ) : null}

                    {/* Variant generate */}
                    <div className="space-y-3">
                      {!showForm ? (
                        <button
                          onClick={() => setGenForm(prev => ({ ...prev, [ad.id]: { goal: '', targetAudience: '' } }))}
                          className="w-full text-sm py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                        >
                          AI Varyant Üret
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/60"
                            placeholder="Hedef (örn. Lead toplama)"
                            value={form.goal}
                            onChange={e => setGenForm(prev => ({ ...prev, [ad.id]: { ...form, goal: e.target.value } }))}
                          />
                          <input
                            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/60"
                            placeholder="Hedef kitle (örn. 25-34 yaş girişimciler)"
                            value={form.targetAudience}
                            onChange={e => setGenForm(prev => ({ ...prev, [ad.id]: { ...form, targetAudience: e.target.value } }))}
                          />
                          <button
                            onClick={() => generateVariants(ad.id)}
                            disabled={generating === ad.id}
                            className="w-full text-sm py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
                          >
                            {generating === ad.id ? 'Üretiliyor...' : 'Üret'}
                          </button>
                        </div>
                      )}

                      {/* Variants */}
                      {variants.length > 0 && (
                        <div className="space-y-2">
                          {variants.map((v: any, i: number) => (
                            <div key={i} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 space-y-1">
                              <div className="text-sm font-semibold text-white">{v.headline}</div>
                              <div className="text-xs text-slate-400">{v.primaryText}</div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30">{v.callToAction}</span>
                                <button
                                  onClick={() => copyText(`${v.headline}\n${v.primaryText}`)}
                                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                  {copiedText === `${v.headline}\n${v.primaryText}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  Kopyala
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 2: Kitle & Yerleşim ── */}
      {activeSection === 'audience' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            {(['age', 'placement'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAudTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${audTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}`}
              >
                {tab === 'age' ? 'Yaş & Cinsiyet' : 'Yerleşim'}
              </button>
            ))}
          </div>

          {audLoading && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center text-slate-400 animate-pulse">Yükleniyor...</div>
          )}

          {!audLoading && !audienceData && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center text-slate-400">Kitle verisi bulunamadı</div>
          )}

          {!audLoading && audienceData && audTab === 'age' && (
            <div className="space-y-3">
              {(() => {
                const groups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
                const best = audienceData.ageGender.reduce((best: any, cur: any) => (!best || (cur.ctr || 0) > (best.ctr || 0) ? cur : best), null)
                return groups.map(age => {
                  const maleRow = audienceData.ageGender.find((r: any) => r.age === age && r.gender === 'male')
                  const femaleRow = audienceData.ageGender.find((r: any) => r.age === age && r.gender === 'female')
                  const imp = (maleRow?.impressions || 0) + (femaleRow?.impressions || 0)
                  const spend = (maleRow?.spend || 0) + (femaleRow?.spend || 0)
                  const ctr = ((maleRow?.ctr || 0) + (femaleRow?.ctr || 0)) / 2
                  const isBest = best?.age === age
                  return (
                    <div key={age} className={`bg-slate-800/40 border rounded-xl p-4 space-y-2 ${isBest ? 'border-emerald-500/50' : 'border-slate-700/50'}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-white">{age}</span>
                        {isBest && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">En İyi</span>}
                        <div className="flex gap-3 text-xs text-slate-400">
                          <span>{imp.toLocaleString()} gösterim</span>
                          <span>${spend.toFixed(2)}</span>
                          <span>%{ctr.toFixed(2)} CTR</span>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-900/60">
                        {imp > 0 && (
                          <>
                            <div style={{ width: `${((maleRow?.impressions || 0) / imp) * 100}%` }} className="bg-blue-500 rounded-l-full" />
                            <div style={{ width: `${((femaleRow?.impressions || 0) / imp) * 100}%` }} className="bg-pink-500 rounded-r-full" />
                          </>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Erkek {maleRow ? `%${(((maleRow.impressions || 0) / (imp || 1)) * 100).toFixed(0)}` : '—'}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />Kadın {femaleRow ? `%${(((femaleRow.impressions || 0) / (imp || 1)) * 100).toFixed(0)}` : '—'}</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {!audLoading && audienceData && audTab === 'placement' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const icons: Record<string, string> = { facebook: '📘', instagram: '📸', messenger: '💬', audience_network: '🌐' }
                const labels: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', messenger: 'Messenger', audience_network: 'Audience Network' }
                const best = audienceData.placements.reduce((b: any, c: any) => (!b || (c.ctr || 0) > (b.ctr || 0) ? c : b), null)
                return audienceData.placements.map((p: any) => (
                  <div key={p.platform} className={`bg-slate-800/40 border rounded-2xl p-5 space-y-3 ${best?.platform === p.platform ? 'border-emerald-500/50' : 'border-slate-700/50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icons[p.platform] || '📱'}</span>
                      <span className="font-semibold text-white">{labels[p.platform] || p.platform}</span>
                      {best?.platform === p.platform && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">En İyi</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        { label: 'Gösterim', value: (p.impressions || 0).toLocaleString() },
                        { label: 'Harcama', value: `$${(p.spend || 0).toFixed(2)}` },
                        { label: 'CTR', value: `%${(p.ctr || 0).toFixed(2)}` },
                        { label: 'CPM', value: `$${(p.cpm || 0).toFixed(2)}` },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-900/40 rounded-lg p-2 text-center">
                          <div className="text-slate-400">{m.label}</div>
                          <div className="text-white font-semibold mt-0.5">{m.value}</div>
                        </div>
                      ))}
                    </div>
                    {p.positions && p.positions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.positions.map((pos: string) => (
                          <span key={pos} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">{pos}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 3: Kampanya Sağlığı ── */}
      {activeSection === 'health' && (
        <div className="space-y-4">
          {healthLoading && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center text-slate-400 animate-pulse">Yükleniyor...</div>
          )}

          {!healthLoading && !healthData && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center text-slate-400">
              Kampanya verisi yüklenemedi — Meta API&apos;niz test modunda olabilir
            </div>
          )}

          {!healthLoading && healthData && (
            <>
              {/* Alert banner */}
              {healthData.alerts && healthData.alerts.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <AlertTriangle size={16} />
                    {healthData.alerts.length} Uyarı Tespit Edildi
                  </div>
                  <ul className="space-y-1">
                    {healthData.alerts.map((a: any, i: number) => (
                      <li key={i} className="text-xs text-amber-200/80">• {a.message || a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Campaign cards */}
              <div className="space-y-4">
                {healthData.campaigns.map((c: any) => {
                  const score = c.healthScore ?? c.health_score ?? 0
                  const freq = c.frequency || 0
                  const radius = 20
                  const circumference = 2 * Math.PI * radius
                  const offset = circumference - (score / 100) * circumference
                  return (
                    <div key={c.id || c.campaignId} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className="font-semibold text-white flex-1">{c.name}</span>
                        {/* Circular score */}
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
                            <circle cx="24" cy="24" r={radius} fill="none" stroke={ringColor(score)} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                          </svg>
                          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor(score)}`}>{score}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {[
                          { label: 'Gösterim', value: (c.impressions || 0).toLocaleString() },
                          { label: 'CTR', value: `%${(c.ctr || 0).toFixed(2)}` },
                          { label: 'Frekans', value: (freq).toFixed(1) },
                          { label: 'Günlük', value: `$${(c.dailyBudget || c.daily_budget || 0).toFixed(0)}` },
                        ].map(m => (
                          <div key={m.label} className="bg-slate-900/40 rounded-lg p-2 text-center">
                            <div className="text-slate-400">{m.label}</div>
                            <div className="text-white font-semibold mt-0.5">{m.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Frequency badge */}
                      <div>
                        {freq > 5 ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40">🔴 Yorgunluk ({'>'} 5)</span>
                        ) : freq >= 3 ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">🟡 Dikkat (3-5)</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🟢 İyi ({'<'} 3)</span>
                        )}
                      </div>

                      {c.recommendation && (
                        <p className="text-xs text-slate-400 italic">{c.recommendation}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SECTION 4: Bütçe Optimizasyon ── */}
      {activeSection === 'budget' && (
        <div className="space-y-4">
          {budgetLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 animate-pulse h-24" />
              ))}
            </div>
          )}

          {!budgetLoading && !budgetData && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center text-slate-400">Bütçe verisi yüklenemedi</div>
          )}

          {!budgetLoading && budgetData && (
            <>
              {/* Claude summary */}
              {budgetData.summary && (
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 flex gap-3">
                  <Sparkles size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300 leading-relaxed">{budgetData.summary}</p>
                </div>
              )}

              {/* Campaign table */}
              {budgetData.campaigns && budgetData.campaigns.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/50 text-slate-400 text-xs">
                          <th className="text-left px-4 py-3">Kampanya</th>
                          <th className="text-right px-4 py-3">Günlük Bütçe</th>
                          <th className="text-right px-4 py-3">30g Harcama</th>
                          <th className="text-right px-4 py-3">CPL</th>
                          <th className="text-right px-4 py-3">Öneri</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetData.campaigns.map((c: any, i: number) => {
                          const rec = (budgetData.recommendations || []).find((r: any) => r.campaignId === (c.id || c.campaignId))
                          return (
                            <tr key={c.id || i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                              <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                              <td className="px-4 py-3 text-right text-slate-300">${(c.dailyBudget || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-slate-300">${(c.spend30d || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-slate-300">${(c.cpl || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right">
                                {rec ? (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.action === 'INCREASE' ? 'bg-emerald-500/20 text-emerald-300' : rec.action === 'DECREASE' ? 'bg-red-500/20 text-red-300' : 'bg-slate-600/40 text-slate-400'}`}>
                                    {rec.action === 'INCREASE' ? 'Artır' : rec.action === 'DECREASE' ? 'Azalt' : 'Duraklat'}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendation cards */}
              {budgetData.recommendations && budgetData.recommendations.length > 0 && (
                <div className="space-y-3">
                  {budgetData.recommendations.map((rec: any) => {
                    const isApplied = appliedIds.has(rec.campaignId)
                    return (
                      <div key={rec.campaignId} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rec.action === 'INCREASE' ? 'bg-emerald-500/20 text-emerald-300' : rec.action === 'DECREASE' ? 'bg-red-500/20 text-red-300' : 'bg-slate-600/40 text-slate-400'}`}>
                              {rec.action === 'INCREASE' ? 'Artır' : rec.action === 'DECREASE' ? 'Azalt' : 'Duraklat'}
                            </span>
                            {rec.reason && <p className="text-sm text-slate-300 mt-2">{rec.reason}</p>}
                            {rec.expectedImpact && <p className="text-xs text-slate-400 italic">{rec.expectedImpact}</p>}
                          </div>
                          <button
                            onClick={() => !isApplied && applyBudget(rec.campaignId, rec.newDailyBudgetCents)}
                            disabled={isApplied || applying === rec.campaignId}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isApplied ? 'bg-slate-700/40 text-slate-500 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                          >
                            {isApplied ? 'Uygulandı' : applying === rec.campaignId ? 'Uygulanıyor...' : 'Uygula'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SECTION 5: AI Kampanya Oluştur ── */}
      {activeSection === 'wizard' && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4] as const).map(step => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= step ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-500'}`}>{step}</div>
                {step < 4 && <div className={`h-0.5 w-8 ${wizardStep > step ? 'bg-blue-600' : 'bg-slate-700/60'}`} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-slate-400">
              {wizardStep === 1 ? 'Ürün Bilgileri' : wizardStep === 2 ? 'Hedef Kitle' : wizardStep === 3 ? 'AI Planı İncele' : 'Tamamlandı'}
            </span>
          </div>

          {/* Step 1 */}
          {wizardStep === 1 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-5">
              <h3 className="font-semibold text-white">Ürün Bilgileri</h3>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Ürün / Hizmet</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/60 resize-none"
                  placeholder="Ürün veya hizmetinizi açıklayın..."
                  value={wizardData.product}
                  onChange={e => setWizardData(prev => ({ ...prev, product: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Günlük Bütçe: ${wizardData.budget}</label>
                <input
                  type="range" min={10} max={500} step={10}
                  value={wizardData.budget}
                  onChange={e => setWizardData(prev => ({ ...prev, budget: e.target.value }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500"><span>$10</span><span>$500</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Kampanya Hedefi</label>
                <select
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/60"
                  value={wizardData.goal}
                  onChange={e => setWizardData(prev => ({ ...prev, goal: e.target.value }))}
                >
                  <option value="OUTCOME_LEADS">Lead Toplama (OUTCOME_LEADS)</option>
                  <option value="OUTCOME_SALES">Satış (OUTCOME_SALES)</option>
                  <option value="OUTCOME_AWARENESS">Farkındalık (OUTCOME_AWARENESS)</option>
                </select>
              </div>
              <button
                onClick={() => setWizardStep(2)}
                disabled={!wizardData.product.trim()}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium transition-colors"
              >
                Devam →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {wizardStep === 2 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-5">
              <h3 className="font-semibold text-white">Hedef Kitle</h3>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Konum</label>
                <input
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/60"
                  placeholder="Türkiye"
                  value={wizardData.location}
                  onChange={e => setWizardData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Yaş Aralığı: {ageMin} — {ageMax}</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-8">Min</span>
                    <input type="range" min={18} max={65} value={ageMin} onChange={e => setAgeMin(Number(e.target.value))} className="flex-1 accent-blue-600" />
                    <span className="text-xs text-slate-300 w-6">{ageMin}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-8">Max</span>
                    <input type="range" min={18} max={65} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} className="flex-1 accent-blue-600" />
                    <span className="text-xs text-slate-300 w-6">{ageMax}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Cinsiyet</label>
                <div className="flex gap-3">
                  {[{ v: 'ALL', l: 'Tümü' }, { v: 'MALE', l: 'Erkek' }, { v: 'FEMALE', l: 'Kadın' }].map(opt => (
                    <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={opt.v}
                        checked={wizardData.targetGender === opt.v}
                        onChange={e => setWizardData(prev => ({ ...prev, targetGender: e.target.value }))}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-slate-300">{opt.l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Dil</label>
                <input
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/60"
                  value={wizardData.language}
                  onChange={e => setWizardData(prev => ({ ...prev, language: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setWizardStep(1)} className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">← Geri</button>
                <button
                  onClick={analyzeWithAI}
                  disabled={planning}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  {planning ? 'AI kampanya planı hazırlanıyor...' : 'AI ile Analiz Et →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {wizardStep === 3 && plan && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-white text-lg">{plan.campaignName || 'Kampanya Planı'}</h3>
                <div className="flex gap-3 flex-wrap">
                  {plan.estimatedCPL && <span className="text-xs px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">Tahmini CPL: ${plan.estimatedCPL}</span>}
                  {plan.estimatedLeadsPerDay && <span className="text-xs px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">~{plan.estimatedLeadsPerDay} lead/gün</span>}
                </div>
                {(plan.strategyRationale || plan.rationale) && <p className="text-sm text-slate-300 leading-relaxed">{plan.strategyRationale || plan.rationale}</p>}

                {/* Ad previews */}
                {plan.ads && plan.ads.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Reklam Önizlemeleri</div>
                    {plan.ads.map((ad: any, i: number) => (
                      <div key={i} className="bg-slate-700 rounded-xl overflow-hidden">
                        <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 text-xs text-slate-400">
                          <span>📘</span><span>Sponsorlu</span>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="font-semibold text-white text-sm">{ad.headline}</div>
                          <div className="text-slate-300 text-xs leading-relaxed">{ad.primaryText}</div>
                          <button className="mt-2 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold">{ad.callToAction || 'Daha Fazla Bilgi'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {plan.warnings && plan.warnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-1">
                    {plan.warnings.map((w: string, i: number) => (
                      <div key={i} className="text-xs text-amber-200/80">⚠️ {w}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setWizardStep(2)} className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">← Geri</button>
                <button
                  onClick={createCampaign}
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-lg transition-colors"
                >
                  {creating ? 'Kampanya oluşturuluyor...' : 'Kampanyayı Oluştur'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {wizardStep === 4 && created && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 space-y-4 text-center">
              <div className="text-4xl">✅</div>
              <h3 className="text-xl font-bold text-emerald-300">Kampanya Oluşturuldu!</h3>
              {created.campaignId && (
                <div className="bg-slate-900/60 rounded-xl px-4 py-2 inline-block">
                  <span className="text-xs text-slate-400">Kampanya ID: </span>
                  <span className="text-sm text-white font-mono">{created.campaignId}</span>
                </div>
              )}
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Not: Kampanya duraklatılmış olarak oluşturuldu — Meta Ads Manager&apos;dan aktif edin
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => { setWizardStep(1); setPlan(null); setCreated(null); setWizardData({ product: '', budget: '50', goal: 'OUTCOME_LEADS', location: 'Türkiye', targetAge: '18-45', targetGender: 'ALL', language: 'Türkçe' }) }}
                  className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
                >
                  Yeni Kampanya Oluştur
                </button>
                <button
                  onClick={() => setActiveSection('health')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  Kampanya Sağlığını Görüntüle
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
