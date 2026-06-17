'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Search, Loader2, CheckCircle, ArrowLeft, Zap,
  Globe, ChevronDown, AlertTriangle, SlidersHorizontal,
  Phone, Mail, Folder, Pencil, Clock, Target, Building2,
} from 'lucide-react'
import { COUNTRIES, CITIES, REGIONS } from './countries-cities'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

function getTimeEstimate(count: number, cityCount = 1): string {
  const base = count <= 20 ? 20 : count <= 50 ? 40 : count <= 100 ? 90
             : count <= 200 ? 180 : count <= 300 ? 300 : count <= 500 ? 420
             : count <= 750 ? 660 : 900
  const total = base + (cityCount - 1) * 12
  if (total < 60)  return `~${total} sn`
  const m = Math.ceil(total / 60)
  return m < 60 ? `~${m} dk` : `~${(m / 60).toFixed(1)} sa`
}

const LEAD_COUNTS = [
  { value: 20,   label: '20',   badge: null,      color: 'border-slate-600 hover:border-slate-500' },
  { value: 50,   label: '50',   badge: null,      color: 'border-slate-600 hover:border-slate-500' },
  { value: 100,  label: '100',  badge: 'Popüler', color: 'border-blue-500/50 hover:border-blue-400' },
  { value: 200,  label: '200',  badge: null,      color: 'border-slate-600 hover:border-slate-500' },
  { value: 500,  label: '500',  badge: 'Pro',     color: 'border-purple-500/50 hover:border-purple-400' },
  { value: 1000, label: '1000', badge: 'Max',     color: 'border-amber-500/50 hover:border-amber-400' },
]

const RADIUS_PRESETS = [
  { label: 'Yakın',  km: 5,  desc: '5 km'  },
  { label: 'Orta',   km: 20, desc: '20 km' },
  { label: 'Geniş',  km: 50, desc: '50 km' },
]

const SECTOR_CHIPS = [
  { l: 'Restoran',    v: 'restoran',          icon: '🍽' },
  { l: 'Kafe',        v: 'kafe',              icon: '☕' },
  { l: 'Dişçi',       v: 'dişçi kliniği',     icon: '🦷' },
  { l: 'Avukat',      v: 'avukat bürosu',     icon: '⚖️' },
  { l: 'Mobilya',     v: 'mobilya mağazası',  icon: '🛋' },
  { l: 'İnşaat',      v: 'inşaat firması',    icon: '🔨' },
  { l: 'Kuaför',      v: 'kuaför',            icon: '💇' },
  { l: 'Oto Galeri',  v: 'oto galeri',        icon: '🚗' },
  { l: 'Yazılım',     v: 'yazılım şirketi',   icon: '💻' },
  { l: 'Tekstil',     v: 'tekstil firması',   icon: '👗' },
  { l: 'Otel',        v: 'otel',              icon: '🏨' },
  { l: 'Eczane',      v: 'eczane',            icon: '💊' },
  { l: 'Spor Salonu', v: 'spor salonu',       icon: '🏋' },
  { l: 'Lojistik',    v: 'nakliye firması',   icon: '📦' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadFinderPage() {
  const { t } = useI18n()
  const router = useRouter()

  // Form state
  const [keyword, setKeyword]             = useState('')
  const [country, setCountry]             = useState('TR')
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [citySearch, setCitySearch]       = useState('')
  const [cityOpen, setCityOpen]           = useState(false)
  const cityRef = useRef<HTMLDivElement>(null)
  const [maxResults, setMaxResults]       = useState(100)
  const [showCustom, setShowCustom]       = useState(false)
  const [customCount, setCustomCount]     = useState('')
  const [showFilters, setShowFilters]     = useState(false)
  const [radiusKm, setRadiusKm]           = useState(20)

  // Quality filters
  const [requirePhone,   setRequirePhone]   = useState(false)
  const [requireWebsite, setRequireWebsite] = useState(false)
  const [enrichEmail,    setEnrichEmail]    = useState(false)
  const [minScore,       setMinScore]       = useState(0)

  // List naming
  const [listName, setListName] = useState('')

  // Credits & status
  const [credits,        setCredits]       = useState<{ total: number; used: number } | null>(null)
  const [loading,        setLoading]       = useState(false)
  const [error,          setError]         = useState('')
  const [jobStatus,      setJobStatus]     = useState<any>(null)
  const [currentJobId,   setCurrentJobId]  = useState<string | null>(null)
  const [previewLeads,   setPreviewLeads]  = useState<any[]>([])
  const [loadingPreview, setLoadingPreview]= useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchCredits()
    setSelectedCities([CITIES['TR'][0]])
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    const first = CITIES[country]?.[0]
    setSelectedCities(first ? [first] : [])
    setCitySearch('')
    setCityOpen(false)
  }, [country])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
  const isAsync        = effectiveCount > 50 || enrichEmail || selectedCities.length > 1

  const availableCities  = CITIES[country] || []
  const filteredCityList = citySearch
    ? availableCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    : availableCities
  const toggleCity       = (c: string) => setSelectedCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const selectAllCities  = () => setSelectedCities([...availableCities])
  const cityLabel        = selectedCities.length === 0 ? 'Şehir seçin...'
                         : selectedCities.length === 1 ? selectedCities[0]
                         : `${selectedCities[0]} +${selectedCities.length - 1} şehir daha`

  async function fetchPreview(jid: string | null, ids?: string[]) {
    setLoadingPreview(true)
    try {
      if (jid) {
        const r = await fetch(`${API}/api/lead-finder/job/${jid}/leads`, { headers: authH() })
        const d = await r.json()
        setPreviewLeads(d.leads || [])
      } else if (ids?.length) {
        const params = new URLSearchParams({ ids: ids.join(','), limit: '20' })
        const r = await fetch(`${API}/api/leads?${params}`, { headers: authH() })
        const d = await r.json()
        setPreviewLeads(d.leads || [])
      }
    } catch {}
    setLoadingPreview(false)
  }

  function startPolling(id: string) {
    setCurrentJobId(id)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/lead-finder/job/${id}`, { headers: authH() })
        const d = await r.json()
        setJobStatus(d)
        if (d.status === 'done' || d.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)
          fetchCredits()
          if (d.status === 'done') fetchPreview(id)
        }
      } catch {}
    }, 2000)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!keyword)                    { setError('Arama terimi girin'); return }
    if (selectedCities.length === 0) { setError('En az bir şehir seçin'); return }

    setLoading(true); setError('')

    const cityDisplay = selectedCities.join(', ')

    setJobStatus({
      status: 'running',
      found: 0, saved: 0, skipped: 0, total: effectiveCount,
      query: keyword, city: cityDisplay, phase: 'Bağlanıyor...',
    })

    try {
      const r = await fetch(`${API}/api/lead-finder/search`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          query: keyword,
          cities: selectedCities,
          city: selectedCities[0],
          country,
          targetCount: effectiveCount,
          radiusKm,
          requirePhone,
          requireWebsite,
          enrichEmail,
          minScore: minScore > 0 ? minScore : undefined,
          sector: keyword,
          listName: listName.trim() || undefined,
        }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); setJobStatus(null); setLoading(false); return }

      if (d.async) {
        startPolling(d.jobId)
      } else {
        setJobStatus({
          status: 'done',
          sources: Object.fromEntries(
            Object.entries(d.sourceBreakdown || {}).map(([k, v]) => [k, { status: 'done', count: v as number }])
          ),
          found: d.saved, saved: d.saved, skipped: d.skipped || 0,
          total: effectiveCount, query: keyword, city: cityDisplay,
          phase: `${d.saved} lead kaydedildi`,
          listName: listName.trim() || undefined,
        })
        if (d.savedLeadIds?.length) fetchPreview(null, d.savedLeadIds)
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
                <h2 className="text-xl font-bold text-white">{t('leads.hata_olustu', 'Hata Oluştu')}</h2>
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
                <h2 className="text-lg font-bold text-white">{t('leads.lead_araniyor', 'Lead Aranıyor...')}</h2>
                <p className="text-blue-400 text-sm">{jobStatus.phase}</p>
              </div>
            )}
          </div>

          {/* Progress / stats */}
          <div className="p-6 space-y-4">
            {!isDone && !isError && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t('leads.ilerleme', 'İlerleme')}</span>
                  <span className="text-white font-medium">{pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-2.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                <p className="text-xs text-slate-500 text-center">{t('leads.sayfadan_ayrilabilirsiniz', 'Sayfadan ayrılabilirsiniz — işlem arka planda devam eder')}</p>
              </div>
            )}

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
                  <p className="text-xs text-slate-500 mt-0.5">{t('leads.tekrar_atlandi', 'Tekrar atlandı')}</p>
                </div>
              </div>
            )}

            {isDone && skipped > 0 && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">{skipped} tekrar lead atlandı</p>
                  <p className="text-amber-400/70 text-xs mt-0.5">{t('leads.bu_leadler_zaten_crminizd', 'Bu leadler zaten CRM\'inizde kayıtlı. Kredi harcanmadı.')}</p>
                </div>
              </div>
            )}

            {isDone && totalSaved === 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-red-300 font-medium">{t('leads.sonuc_bulunamadi_olasi_ne', 'Sonuç bulunamadı — olası nedenler:')}</p>
                <ul className="text-red-400/80 space-y-1 list-disc list-inside text-xs">
                  <li>{t('leads.google_places_api_anahtar', 'Google Places API anahtarı geçersiz veya kotası dolmuş')}</li>
                  <li>{t('leads.bu_sehirsektor_kombinasyo', 'Bu şehir/sektör kombinasyonu için yeterli veri yok')}</li>
                  <li>{t('leads.arama_terimi_cok_spesifik', 'Arama terimi çok spesifik — daha genel bir kelime deneyin')}</li>
                  <li>Tüm sonuçlar zaten CRM'inizde kayıtlı ({skipped} tekrar)</li>
                </ul>
              </div>
            )}

            {(isDone || isError) && (
              <div className="flex gap-3">
                {totalSaved > 0 && (
                  <button onClick={() => router.push('/leads')}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition text-sm">
                    Leadleri Görüntüle →
                  </button>
                )}
                <button onClick={() => { setJobStatus(null); setPreviewLeads([]); setCurrentJobId(null); if (pollRef.current) clearInterval(pollRef.current) }}
                  className={`${totalSaved > 0 ? '' : 'flex-1 '} py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition text-sm`}>
                  Yeni Arama
                </button>
              </div>
            )}

            {isDone && (loadingPreview || previewLeads.length > 0) && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">
                    {loadingPreview ? 'Önizleme yükleniyor...' : `İlk ${previewLeads.length} lead`}
                  </p>
                  {jobStatus?.listName && (
                    <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Folder size={10} /> {jobStatus.listName}
                    </span>
                  )}
                </div>
                {!loadingPreview && previewLeads.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-900/50">
                          <th className="px-3 py-2 text-left text-slate-400 font-medium">Firma</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-medium">Telefon</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-medium">Web</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-medium">{t('leads.sehir', 'Şehir')}</th>
                          <th className="px-3 py-2 text-right text-slate-400 font-medium">Puan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewLeads.map((lead, i) => (
                          <tr key={lead.id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-900/20'}`}>
                            <td className="px-3 py-2 text-white font-medium max-w-[160px] truncate">{lead.company_name}</td>
                            <td className="px-3 py-2 text-slate-300">{lead.phone || <span className="text-slate-600">—</span>}</td>
                            <td className="px-3 py-2 text-slate-400 truncate max-w-[100px]">
                              {lead.website ? <span className="text-blue-400">{lead.website.replace(/^https?:\/\//, '').split('/')[0]}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-400">{lead.city || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-semibold ${lead.score >= 50 ? 'text-emerald-400' : lead.score >= 30 ? 'text-blue-400' : 'text-slate-500'}`}>
                                {lead.score}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

  const timeEst = keyword && selectedCities.length > 0
    ? getTimeEstimate(effectiveCount, selectedCities.length)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium px-3 py-1 rounded-full">
          <Target size={12} /> AI Destekli Lead Tarayıcı
        </div>
        <h1 className="text-3xl font-bold text-white">Hedef Müşterinizi Bulun</h1>
        <p className="text-slate-400 text-sm">Türkiye ve dünya genelinde B2B leadleri saniyeler içinde keşfedin</p>
      </div>

      {/* ── Credit indicator ── */}
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

      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">

        {/* ── 1. Keyword ── */}
        <div className="space-y-2">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Search size={14} className="text-slate-400" /> Ne arıyorsunuz?
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={t('leads.mobilya_magazasi_restoran', 'mobilya mağazası, restoran, avukat...')}
              className="w-full bg-slate-900/60 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          {/* Sector chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SECTOR_CHIPS.map(({ l, v, icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setKeyword(v)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer flex items-center gap-1 ${
                  keyword === v
                    ? 'bg-blue-600/25 border-blue-500/50 text-blue-300'
                    : 'bg-slate-800/60 border-slate-600/60 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <span>{icon}</span> {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Country + City ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Country */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
              <Globe size={14} className="text-slate-400" /> Ülke
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder={t('leads.ulke_ara', 'Ülke ara...')}
                className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <select
                value={country}
                onChange={e => { setCountry(e.target.value); setCountrySearch('') }}
                className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
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

          {/* City multi-select */}
          <div className="space-y-2" ref={cityRef}>
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" /> Şehir
              </label>
              {selectedCities.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedCities.length > 1 && (
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                      {selectedCities.length} şehir
                    </span>
                  )}
                  <button type="button" onClick={() => setSelectedCities([])} className="text-[11px] text-slate-400 hover:text-white transition">
                    Temizle
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setCityOpen(s => !s)}
                className="w-full bg-slate-900/60 border border-slate-600 hover:border-slate-500 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between transition focus:outline-none"
              >
                <span className={selectedCities.length ? 'text-white' : 'text-slate-500'}>{cityLabel}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${cityOpen ? 'rotate-180' : ''}`} />
              </button>

              {cityOpen && (
                <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/80">
                    <Search size={13} className="text-slate-500 shrink-0" />
                    <input
                      value={citySearch}
                      onChange={e => setCitySearch(e.target.value)}
                      placeholder={t('leads.sehir_ara', 'Şehir ara...')}
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                      autoFocus
                    />
                    <button type="button" onClick={selectAllCities} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition whitespace-nowrap">{t('leads.tumu', 'Tümü')}</button>
                    <span className="text-slate-700">·</span>
                    <button type="button" onClick={() => setSelectedCities([])} className="text-[11px] text-slate-400 hover:text-white transition whitespace-nowrap">Temizle</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1.5 grid grid-cols-2 gap-0.5">
                    {filteredCityList.map(c => {
                      const active = selectedCities.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCity(c)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition ${
                            active ? 'bg-blue-600/25 text-blue-200' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition ${
                            active ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                          }`}>
                            {active && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                          </div>
                          <span className="truncate">{c}</span>
                        </button>
                      )
                    })}
                    {filteredCityList.length === 0 && (
                      <p className="col-span-2 text-center text-slate-500 text-xs py-4">{t('leads.sonuc_bulunamadi', 'Sonuç bulunamadı')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedCities.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {selectedCities.map(c => (
                  <span key={c} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs rounded-lg">
                    {c}
                    <button type="button" onClick={() => toggleCity(c)} className="text-blue-400 hover:text-white leading-none ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Lead count ── */}
        <div className="space-y-3">
          <label className="text-slate-300 text-sm font-medium">{t('leads.kac_lead_istiyorsunuz', 'Kaç lead istiyorsunuz?')}</label>
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
                <p className="text-[10px] opacity-60 mt-0.5">{getTimeEstimate(opt.value, selectedCities.length)}</p>
              </button>
            ))}
          </div>

          {/* Custom count */}
          <div
            onClick={() => setShowCustom(true)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-text transition ${
              showCustom
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-dashed border-slate-600 hover:border-slate-500 bg-slate-800/20'
            }`}
          >
            <Pencil size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-400 text-sm shrink-0">{t('leads.ozel_sayi', 'Özel sayı:')}</span>
            <input
              type="number"
              value={customCount}
              onFocus={() => setShowCustom(true)}
              onChange={e => { setCustomCount(e.target.value); setShowCustom(true) }}
              placeholder={t('leads.orn_300', 'Örn: 300')}
              min={10} max={2000}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500"
            />
            {showCustom && customCount && (
              <span className="text-xs text-slate-400 shrink-0">{getTimeEstimate(Number(customCount))}</span>
            )}
          </div>
        </div>

        {/* ── 4. Source info ── */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-800/30">
          <MapPin size={12} className="text-blue-400 shrink-0" />
          <span className="text-xs text-slate-400">Google Maps verisi · Çoklu kaynak doğrulama · Gerçek zamanlı tarama</span>
        </div>

        {/* ── 5. Advanced filters ── */}
        <div>
          <button
            type="button"
            onClick={() => setShowFilters(s => !s)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition"
          >
            <SlidersHorizontal size={14} />
            Gelişmiş filtreler
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-4 space-y-4">
              {/* Filter toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { label: 'Telefon zorunlu',    state: requirePhone,   set: setRequirePhone,   icon: <Phone size={13} /> },
                  { label: 'Web sitesi zorunlu', state: requireWebsite, set: setRequireWebsite, icon: <Globe size={13} /> },
                  { label: 'Email keşfet',        state: enrichEmail,    set: setEnrichEmail,    icon: <Mail  size={13} />, slow: true },
                ] as const).map(({ label, state, set, icon, slow }: any) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set((s: boolean) => !s)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm transition ${
                      state
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-800/40 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                      state ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                    }`}>
                      {state && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-slate-400">{icon}</span>
                    <span>{label}</span>
                    {slow && <span className="text-xs opacity-50 ml-auto">{t('leads.yavas', 'yavaş')}</span>}
                  </button>
                ))}
              </div>

              {/* Radius presets + Min score */}
              <div className="grid grid-cols-2 gap-4">
                {/* Radius */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs font-medium">Arama yarıçapı</label>
                  <div className="flex gap-1.5">
                    {RADIUS_PRESETS.map(p => (
                      <button
                        key={p.km}
                        type="button"
                        onClick={() => setRadiusKm(p.km)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${
                          radiusKm === p.km
                            ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                            : 'bg-slate-800/40 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="block font-semibold">{p.label}</span>
                        <span className="block text-[10px] opacity-60 mt-0.5">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min score */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs font-medium flex justify-between">
                    <span>Min. kalite puanı</span>
                    <span className="text-slate-300">{minScore === 0 ? 'Tümü' : `${minScore}+`}</span>
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Tümü', val: 0 },
                      { label: '30+',  val: 30 },
                      { label: '50+',  val: 50 },
                      { label: '70+',  val: 70 },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setMinScore(p.val)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${
                          minScore === p.val
                            ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                            : 'bg-slate-800/40 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 6. Liste Adı ── */}
        <div className="space-y-2">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Folder size={14} className="text-slate-400" /> Liste Adı
            <span className="text-slate-500 text-xs font-normal">{t('leads.istege_bagli', '(isteğe bağlı)')}</span>
          </label>
          <input
            value={listName}
            onChange={e => setListName(e.target.value)}
            placeholder={t('leads.orn_istanbul_restauranlar', 'Örn: İstanbul Restauranlar Mayıs 2026')}
            className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
          />
          {listName.trim() && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Folder size={10} className="text-blue-400" />
              Bu leadler "{listName.trim()}" listesine kaydedilecek ve CRM'de filtrelenebilecek.
            </p>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* ── Time estimate info ── */}
        {timeEst && hasEnough && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-700/60">
            <Clock size={14} className="text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-300">
                <span className="font-semibold text-white">{effectiveCount} lead</span>
                {' '}· Tahmini süre:{' '}
                <span className="font-semibold text-blue-400">{timeEst}</span>
              </span>
              {isAsync && (
                <p className="text-xs text-slate-500 mt-0.5">Arka planda çalışır — sayfadan ayrılabilirsiniz</p>
              )}
            </div>
            {selectedCities.length > 1 && (
              <span className="text-xs text-slate-500 shrink-0">{selectedCities.length} şehir</span>
            )}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={loading || !hasEnough || !keyword || selectedCities.length === 0}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-base transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" />{t('leads.baglaniyor', 'Bağlanıyor...')}</>
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
            <a href="/settings/billing" className="underline hover:text-red-300">{t('leads.kredi_yukle', 'Kredi yükle →')}</a>
          </p>
        )}
      </form>
    </div>
  )
}
