'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Search, Loader2, CheckCircle, ArrowLeft, Zap,
  Globe, ChevronDown, AlertTriangle, SlidersHorizontal,
  Info,
} from 'lucide-react'
import { COUNTRIES, CITIES, REGIONS } from './countries-cities'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

function getTimeEstimate(count: number): string {
  if (count <= 20)   return '~20 sn'
  if (count <= 50)   return '~40 sn'
  if (count <= 100)  return '~1.5 dk'
  if (count <= 200)  return '~3 dk'
  if (count <= 300)  return '~5 dk'
  if (count <= 500)  return '~7 dk'
  if (count <= 750)  return '~11 dk'
  return '~15 dk'
}

const LEAD_COUNTS = [
  { value: 20,   label: '20',   badge: null,      color: 'border-slate-600 hover:border-slate-500' },
  { value: 50,   label: '50',   badge: null,      color: 'border-slate-600 hover:border-slate-500' },
  { value: 100,  label: '100',  badge: 'Popüler', color: 'border-blue-500/50 hover:border-blue-400' },
  { value: 200,  label: '200',  badge: null,      color: 'border-slate-600 hover:border-slate-500' },
  { value: 500,  label: '500',  badge: 'Pro',     color: 'border-purple-500/50 hover:border-purple-400' },
  { value: 1000, label: '1000', badge: 'Max',     color: 'border-amber-500/50 hover:border-amber-400' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadFinderPage() {
  const router = useRouter()

  // Form state
  const [keyword, setKeyword]         = useState('')
  const [city, setCity]               = useState('')
  const [country, setCountry]         = useState('TR')
  const [countrySearch, setCountrySearch] = useState('')
  const [maxResults, setMaxResults]   = useState(100)
  const [showCustom, setShowCustom]   = useState(false)
  const [customCount, setCustomCount] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [radiusKm, setRadiusKm]       = useState(20)

  // Quality filters
  const [requirePhone,      setRequirePhone]      = useState(false)
  const [requireWebsite,    setRequireWebsite]    = useState(false)
  const [enrichEmail,       setEnrichEmail]       = useState(false)
  const [includeInstagram,  setIncludeInstagram]  = useState(false)
  const [minScore,          setMinScore]          = useState(0)

  // Credits & status
  const [credits,    setCredits]    = useState<{ total: number; used: number } | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [jobStatus,  setJobStatus]  = useState<any>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchCredits()
    setCity(CITIES['TR'][0])
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => { setCity(CITIES[country]?.[0] || '') }, [country])

  async function fetchCredits() {
    try {
      const r = await fetch(`${API}/api/credits/balance`, { headers: authH() })
      const d = await r.json()
      setCredits({ total: d.credits_total || d.total || 0, used: d.credits_used || d.used || 0 })
    } catch {}
  }

  const effectiveCount = showCustom && customCount ? Math.min(Number(customCount), 1000) : maxResults
  const available      = credits ? credits.total - credits.used : 0
  const hasEnough      = available >= effectiveCount
  const isAsync        = effectiveCount > 50 || enrichEmail

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/lead-finder/job/${id}`, { headers: authH() })
        const d = await r.json()
        setJobStatus(d)
        if (d.status === 'done' || d.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)
          fetchCredits()
        }
      } catch {}
    }, 2000)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!keyword) { setError('Arama terimi girin'); return }
    if (!city)    { setError('Şehir seçin'); return }

    setLoading(true); setError('')

    // Optimistic job state while waiting for API
    setJobStatus({
      status: 'running',
      found: 0, saved: 0, skipped: 0, total: effectiveCount,
      query: keyword, city, phase: 'Bağlanıyor...',
    })

    try {
      const r = await fetch(`${API}/api/lead-finder/search`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          query: keyword,
          city, country,
          targetCount: effectiveCount,
          radiusKm,
          requirePhone,
          requireWebsite,
          enrichEmail,
          includeInstagram,
          sector: keyword,
        }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); setJobStatus(null); setLoading(false); return }

      if (d.async) {
        startPolling(d.jobId)
      } else {
        // Sync response — build a fake "done" job status
        setJobStatus({
          status: 'done',
          sources: Object.fromEntries(
            Object.entries(d.sourceBreakdown || {}).map(([k, v]) => [k, { status: 'done', count: v as number }])
          ),
          found: d.saved, saved: d.saved, skipped: d.skipped || 0,
          total: effectiveCount, query: keyword, city,
          phase: `${d.saved} lead kaydedildi`,
        })
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası')
      setJobStatus(null)
    }
    setLoading(false)
  }

  // ── Progress view ──────────────────────────────────────────────────────────

  if (jobStatus) {
    const isDone     = jobStatus.status === 'done'
    const isError    = jobStatus.status === 'error'
    const totalSaved = jobStatus.saved || 0
    const skipped    = jobStatus.skipped || 0
    const totalFound = jobStatus.found || 0

    const pct = jobStatus.total > 0
      ? Math.min(100, Math.round((isDone ? jobStatus.total : totalFound) / jobStatus.total * 100))
      : 0

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={() => { router.push('/leads') }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Leadlere Dön
        </button>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            {isDone ? (
              <div className="text-center space-y-2">
                {totalSaved === 0
                  ? <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
                  : <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />}
                <h2 className="text-2xl font-bold text-white">{totalSaved} Lead Toplandı</h2>
                <p className="text-slate-400 text-sm">"{jobStatus.query}" · {jobStatus.city}</p>
              </div>
            ) : isError ? (
              <div className="text-center space-y-2">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">Hata Oluştu</h2>
                <p className="text-red-400 text-sm">{jobStatus.error}</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                  <div className="w-14 h-14 bg-blue-500/30 rounded-full flex items-center justify-center">
                    <Search className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-white">Lead Aranıyor...</h2>
                <p className="text-blue-400 text-sm">{jobStatus.phase}</p>
              </div>
            )}
          </div>

          {/* Progress / stats */}
          <div className="p-6 space-y-4">
            {!isDone && !isError && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">İlerleme</span>
                  <span className="text-white font-medium">{pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-2.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                <p className="text-xs text-slate-500 text-center">Sayfadan ayrılabilirsiniz — işlem arka planda devam eder</p>
              </div>
            )}

            {/* Source breakdown totals */}
            {totalFound > 0 && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-blue-400">{totalFound}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Ham bulunan</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-emerald-400">{totalSaved}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Kaydedilen</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-amber-400">{skipped}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tekrar atlandı</p>
                </div>
              </div>
            )}

            {/* Duplicate warning */}
            {isDone && skipped > 0 && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">{skipped} tekrar lead atlandı</p>
                  <p className="text-amber-400/70 text-xs mt-0.5">Bu leadler zaten CRM'inizde kayıtlı. Kredi harcanmadı.</p>
                </div>
              </div>
            )}

            {/* Zero result guidance */}
            {isDone && totalSaved === 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-red-300 font-medium">Sonuç bulunamadı — olası nedenler:</p>
                <ul className="text-red-400/80 space-y-1 list-disc list-inside text-xs">
                  <li>Google Places API anahtarı geçersiz veya kotası dolmuş</li>
                  <li>Bu şehir/sektör kombinasyonu için yeterli veri yok</li>
                  <li>Arama terimi çok spesifik — daha genel bir kelime deneyin</li>
                  <li>Tüm sonuçlar zaten CRM'inizde kayıtlı ({skipped} tekrar)</li>
                </ul>
              </div>
            )}

            {/* Action buttons */}
            {(isDone || isError) && (
              <div className="flex gap-3">
                {totalSaved > 0 && (
                  <button onClick={() => router.push('/leads')}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition text-sm">
                    Leadleri Görüntüle →
                  </button>
                )}
                <button onClick={() => { setJobStatus(null); if (pollRef.current) clearInterval(pollRef.current) }}
                  className={`${totalSaved > 0 ? '' : 'flex-1 '} py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition text-sm`}>
                  Yeni Arama
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Form view ──────────────────────────────────────────────────────────────

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium px-3 py-1 rounded-full">
          <Search size={12} /> Akıllı Çoklu Kaynak Arama
        </div>
        <h1 className="text-3xl font-bold text-white">Lead Bul</h1>
        <p className="text-slate-400 text-sm">Google Maps öncelikli · Gerektiğinde ek kaynaklar devreye girer</p>
      </div>

      {/* Credit indicator */}
      {credits && (
        <div className="flex items-center gap-2 justify-center">
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-full px-4 py-1.5 text-sm">
            <Zap size={13} className={hasEnough ? 'text-blue-400' : 'text-red-400'} />
            <span className={hasEnough ? 'text-slate-300' : 'text-red-400'}>
              {available.toLocaleString()} kredi kaldı
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">

        {/* Keyword */}
        <div className="space-y-2">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Search size={14} /> Ne arıyorsunuz?
          </label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="mobilya mağazası, restoran, avukat..."
            className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Country + City */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
              <Globe size={14} /> Ülke
            </label>
            <div className="space-y-1">
              <input
                type="text"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder="Ülke ara..."
                className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <select
                value={country}
                onChange={e => { setCountry(e.target.value); setCountrySearch('') }}
                className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                size={1}
              >
                {filteredCountries
                  ? filteredCountries.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))
                  : REGIONS.map(region => {
                      const group = COUNTRIES.filter(c => c.region === region)
                      return group.length > 0 ? (
                        <optgroup key={region} label={`── ${region} ──`}>
                          {group.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                        </optgroup>
                      ) : null
                    })
                }
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
              <MapPin size={14} /> Şehir
            </label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 h-[calc(100%-2rem)]"
            >
              {(CITIES[country] || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Lead count */}
        <div className="space-y-3">
          <label className="text-slate-300 text-sm font-medium">Kaç lead istiyorsunuz?</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {LEAD_COUNTS.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => { setMaxResults(opt.value); setShowCustom(false); setCustomCount('') }}
                className={`relative py-2.5 px-1 rounded-xl border text-center transition ${
                  !showCustom && maxResults === opt.value
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : `${opt.color} text-slate-400 bg-slate-800/40`
                }`}
              >
                {opt.badge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {opt.badge}
                  </span>
                )}
                <p className="text-sm font-bold">{opt.label}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{getTimeEstimate(opt.value)}</p>
              </button>
            ))}
          </div>

          {/* Custom count */}
          <div
            onClick={() => { setShowCustom(true) }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-text transition ${
              showCustom
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-dashed border-slate-600 hover:border-slate-500 bg-slate-800/20'
            }`}
          >
            <span className="text-slate-400 text-sm shrink-0">✏️ Özel sayı:</span>
            <input
              type="number"
              value={customCount}
              onFocus={() => setShowCustom(true)}
              onChange={e => { setCustomCount(e.target.value); setShowCustom(true) }}
              placeholder="Örn: 300"
              min={10} max={2000}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500"
            />
            {showCustom && customCount && (
              <span className="text-xs text-slate-400 shrink-0">{getTimeEstimate(Number(customCount))}</span>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className="space-y-2">
          <label className="text-slate-300 text-sm font-medium">Kaynaklar</label>
          <div className="grid grid-cols-2 gap-2">
            {/* Google Maps — always active */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/40 bg-blue-500/5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <MapPin size={15} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Google Maps</p>
                <p className="text-[10px] text-slate-400">Birincil kaynak</p>
              </div>
              <span className="ml-auto text-[10px] font-medium text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full shrink-0">Aktif</span>
            </div>

            {/* Instagram — optional toggle */}
            <button
              type="button"
              onClick={() => setIncludeInstagram(s => !s)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                includeInstagram
                  ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/10 to-purple-500/10'
                  : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                includeInstagram ? 'bg-gradient-to-br from-pink-500/30 to-purple-500/30' : 'bg-slate-700/50'
              }`}>
                <span className="text-base">📸</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Instagram</p>
                <p className="text-[10px] text-slate-400">Bio'dan email/tel çeker</p>
              </div>
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                includeInstagram ? 'bg-pink-500 border-pink-500' : 'border-slate-600'
              }`}>
                {includeInstagram && <span className="text-white text-[9px] font-bold">✓</span>}
              </div>
            </button>
          </div>
          {includeInstagram && (
            <p className="text-[10px] text-pink-400/70 flex items-center gap-1">
              <Info size={10} />
              Instagram, Google'da olmayan işletmeleri bulur. Takipçi sayısı &amp; bio iletişim bilgisi çeker.
            </p>
          )}
        </div>

        {/* Advanced filters */}
        <button
          type="button"
          onClick={() => setShowFilters(s => !s)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
        >
          <SlidersHorizontal size={14} />
          Gelişmiş filtreler
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="space-y-4 pt-1">
            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Telefon zorunlu', state: requirePhone, set: setRequirePhone, icon: '📞' },
                { label: 'Web sitesi zorunlu', state: requireWebsite, set: setRequireWebsite, icon: '🌐' },
                { label: 'Email keşfet', state: enrichEmail, set: setEnrichEmail, icon: '📧', slow: true },
              ].map(({ label, state, set, icon, slow }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set((s: boolean) => !s)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition ${
                    state
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-800/40 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${state ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                    {state && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span>{icon} {label}</span>
                  {slow && <span className="text-xs opacity-60 ml-auto">yavaş</span>}
                </button>
              ))}
            </div>

            {/* Radius + Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-xs">Arama yarıçapı: {radiusKm} km</label>
                <input
                  type="range" min={5} max={50} value={radiusKm}
                  onChange={e => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 text-xs">Min. puan: {minScore}</label>
                <input
                  type="range" min={0} max={80} step={10} value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            {/* Source info */}
            <div className="bg-slate-900/40 rounded-xl p-3 space-y-2">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Info size={11} /> Gelecekte eklenecek kaynaklar:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'OpenStreetMap', cls: 'bg-emerald-500/20 text-emerald-400' },
                  { label: 'Yelp', cls: 'bg-red-500/20 text-red-400' },
                  { label: 'Foursquare', cls: 'bg-indigo-500/20 text-indigo-400' },
                  { label: 'HERE Maps', cls: 'bg-purple-500/20 text-purple-400' },
                  { label: 'Resmi Sicil', cls: 'bg-amber-500/20 text-amber-400' },
                ].map(({ label, cls }) => (
                  <span key={label} className={`px-2 py-1 rounded-lg text-xs font-medium opacity-50 ${cls}`}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !hasEnough || !keyword || !city}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-base transition flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Bağlanıyor...</>
            : <>
                <Search size={18} />
                {effectiveCount} Lead Bul
                {isAsync && <span className="text-xs opacity-70 ml-1">(arka planda)</span>}
              </>
          }
        </button>

        {!hasEnough && credits && (
          <p className="text-center text-sm text-red-400">
            Yetersiz kredi — {effectiveCount} gerekli, {available} mevcut.{' '}
            <a href="/settings/billing" className="underline hover:text-red-300">Kredi yükle →</a>
          </p>
        )}

        {/* Expected time */}
        {keyword && city && hasEnough && (
          <p className="text-center text-xs text-slate-500">
            Tahmini süre: {getTimeEstimate(effectiveCount)}
            {isAsync ? ' · Arka planda çalışır, sayfadan ayrılabilirsiniz' : ''}
          </p>
        )}
      </form>
    </div>
  )
}
