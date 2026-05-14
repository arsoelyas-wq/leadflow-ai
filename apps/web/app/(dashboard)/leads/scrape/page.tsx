'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Search, Loader2, CheckCircle, ArrowLeft,
  Zap, Users, Globe, ChevronDown, AlertTriangle,
  Mail, Phone, ExternalLink, SlidersHorizontal, Sparkles
} from 'lucide-react'
import { COUNTRIES, CITIES, REGIONS } from './countries-cities'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const SECTORS = [
  'Dekorasyon', 'Mobilya', 'Tekstil', 'Gıda & Restoran', 'İnşaat & Yapı',
  'Otomotiv', 'Teknoloji & Yazılım', 'Sağlık & Klinik', 'Eğitim & Kurs',
  'Turizm & Otel', 'Güzellik & Kozmetik', 'Hukuk & Avukatlık',
  'Muhasebe & Finans', 'Sigorta', 'Gayrimenkul', 'Temizlik Hizmetleri',
  'Lojistik & Nakliye', 'Tarım & Gıda Üretimi', 'Enerji & Solar',
  'Mühendislik', 'Grafik & Tasarım', 'Fotoğrafçılık', 'Diğer',
]


const LEAD_COUNTS = [
  { value: 20,   label: '20',   badge: null,      time: '~15 sn', color: 'border-slate-600 hover:border-slate-500' },
  { value: 50,   label: '50',   badge: null,      time: '~30 sn', color: 'border-slate-600 hover:border-slate-500' },
  { value: 100,  label: '100',  badge: 'Popüler', time: '~1 dk',  color: 'border-blue-500/50 hover:border-blue-400' },
  { value: 200,  label: '200',  badge: null,      time: '~3 dk',  color: 'border-slate-600 hover:border-slate-500' },
  { value: 500,  label: '500',  badge: 'Pro',     time: '~7 dk',  color: 'border-purple-500/50 hover:border-purple-400' },
  { value: 1000, label: '1000', badge: 'Max',     time: '~15 dk', color: 'border-amber-500/50 hover:border-amber-400' },
]

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value} <span className="text-slate-500">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ScrapePage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('TR')
  const [maxResults, setMaxResults] = useState(100)
  const [customCount, setCustomCount] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // Quality filters
  const [minScore, setMinScore] = useState(0)
  const [requirePhone, setRequirePhone] = useState(false)
  const [requireWebsite, setRequireWebsite] = useState(false)
  const [discoverEmails, setDiscoverEmails] = useState(false)

  const [credits, setCredits] = useState<{ total: number; used: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)
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
  const available = credits ? credits.total - credits.used : 0
  const hasEnough = available >= effectiveCount
  const isAsync = effectiveCount > 100 || discoverEmails

  // Estimated time with email enrichment
  function estimatedTime() {
    const baseOpt = LEAD_COUNTS.find(l => l.value === maxResults)
    let base = baseOpt?.time || '~1 dk'
    if (discoverEmails && effectiveCount > 0) {
      const extraMins = Math.ceil(effectiveCount / 6 / 60 * 6) // 6 concurrent, ~1s each
      base = `+${extraMins} dk email`
    }
    return base
  }

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/scrape/job/${id}`, { headers: authH() })
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
    if (!keyword && !sector) { setError('Sektör veya arama terimi girin'); return }
    if (!city) { setError('Şehir seçin'); return }
    setLoading(true); setError('')

    try {
      const r = await fetch(`${API}/api/scrape/google-maps`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          keyword: keyword || sector,
          city, country,
          maxResults: effectiveCount,
          minScore,
          requirePhone,
          requireWebsite,
          discoverEmails,
        }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); setLoading(false); return }

      if (d.jobId) {
        setJobId(d.jobId)
        setJobStatus({ status: 'running', total: d.total, found: 0, saved: 0, enriched: 0, phase: 'Başlatılıyor...', keyword: keyword || sector, city })
        startPolling(d.jobId)
      } else {
        setJobStatus({ status: 'done', saved: d.count || 0, total: effectiveCount, found: d.count || 0, keyword: keyword || sector, city, stats: d.stats })
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası')
    }
    setLoading(false)
  }

  // ── Job progress view ──────────────────────────────────────────────────────
  if (jobStatus) {
    const pct = jobStatus.total > 0 ? Math.round((jobStatus.found / jobStatus.total) * 100) : 0
    const isDone = jobStatus.status === 'done'
    const isError = jobStatus.status === 'error'
    const stats = jobStatus.stats || { withPhone: jobStatus.withPhone || 0, withEmail: jobStatus.withEmail || 0, withWebsite: jobStatus.withWebsite || 0 }
    const totalSaved = jobStatus.saved || 0

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={() => router.push('/leads')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Leadlere Dön
        </button>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 space-y-6">
          {isDone ? (
            <>
              <div className="text-center space-y-3">
                {totalSaved === 0
                  ? <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto" />
                  : <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
                }
                <div>
                  <h2 className="text-2xl font-bold text-white">{totalSaved} Lead Toplandı</h2>
                  <p className="text-slate-400 text-sm mt-1">"{jobStatus.keyword}" · {jobStatus.city}</p>
                </div>
              </div>

              {totalSaved === 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2 text-sm">
                  <p className="text-red-300 font-medium">Sonuç bulunamadı — olası nedenler:</p>
                  <ul className="text-red-400/80 space-y-1 list-disc list-inside text-xs">
                    <li>Google Places API anahtarı tanımlı değil veya geçersiz</li>
                    <li>Google Cloud Console'da "Places API (New)" etkin değil</li>
                    <li>Günlük/aylık kota aşıldı</li>
                    <li>Fatura bilgisi Google Cloud hesabına eklenmemiş</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2">
                    Tanı: <a href={`${API.replace('https://','https://')}/api/scrape/test-key`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">/api/scrape/test-key</a> adresini ziyaret edin
                  </p>
                </div>
              )}

              {/* Quality breakdown */}
              {totalSaved > 0 && (
                <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Kalite Dağılımı</p>
                  <StatBar label="📞 Telefon" value={stats.withPhone} total={totalSaved} color="bg-blue-500" />
                  <StatBar label="📧 Email" value={stats.withEmail} total={totalSaved} color="bg-purple-500" />
                  <StatBar label="🌐 Web sitesi" value={stats.withWebsite} total={totalSaved} color="bg-emerald-500" />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => router.push('/leads')} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition text-sm">
                  Leadleri Görüntüle
                </button>
                <button onClick={() => { setJobId(null); setJobStatus(null) }} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition text-sm">
                  Yeni Arama
                </button>
              </div>
            </>
          ) : isError ? (
            <div className="text-center space-y-4">
              <AlertTriangle className="w-14 h-14 text-red-400 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-white">Hata Oluştu</h2>
                <p className="text-red-400 text-sm mt-1">{jobStatus.error || 'Bilinmeyen hata'}</p>
              </div>
              <button onClick={() => { setJobId(null); setJobStatus(null) }} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition text-sm">
                Tekrar Dene
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                  <div className="w-16 h-16 bg-blue-500/30 rounded-full flex items-center justify-center">
                    <Search className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Lead Toplanıyor...</h2>
                  <p className="text-blue-400 text-sm mt-1">{jobStatus.phase || 'İşleniyor...'}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">İlerleme</span>
                  <span className="text-white font-medium">{jobStatus.found} / {jobStatus.total}</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-2.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 text-right">{pct}% tamamlandı</p>
              </div>

              {/* Live counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Bulunan', value: jobStatus.found, color: 'text-blue-400' },
                  { label: 'Kaydedilen', value: jobStatus.saved, color: 'text-emerald-400' },
                  { label: 'Email', value: jobStatus.enriched || 0, color: 'text-purple-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 rounded-xl p-3">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 text-center">Sayfayı kapatabilirsiniz, işlem arka planda devam eder</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/leads')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Topla</h1>
          <p className="text-slate-400 text-sm mt-0.5">Google Maps'ten yüksek kaliteli potansiyel müşteri bul</p>
        </div>
        {credits && (
          <div className="ml-auto text-right">
            <div className="text-sm text-white font-medium">{available.toLocaleString()}</div>
            <div className="text-xs text-slate-500">kredi mevcut</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Lead count picker */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Kaç lead toplayalım?</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LEAD_COUNTS.map(opt => {
              const isSelected = !showCustom && maxResults === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setMaxResults(opt.value); setShowCustom(false) }}
                  className={`relative flex flex-col items-center py-3 px-1 rounded-xl border text-sm font-semibold transition-all ${isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105' : `bg-slate-800/60 text-slate-300 ${opt.color}`}`}
                >
                  {opt.badge && (
                    <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold ${opt.badge === 'Max' ? 'bg-amber-500 text-black' : opt.badge === 'Pro' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {opt.badge}
                    </span>
                  )}
                  <span className="text-lg font-bold text-white">{opt.label}</span>
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>{opt.time}</span>
                </button>
              )
            })}
          </div>
          <div>
            <button type="button" onClick={() => setShowCustom(v => !v)} className="text-xs text-slate-500 hover:text-slate-300 transition flex items-center gap-1">
              <ChevronDown className={`w-3 h-3 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
              Özel sayı gir (maks 1000)
            </button>
            {showCustom && (
              <input
                type="number" min={10} max={1000}
                value={customCount}
                onChange={e => setCustomCount(e.target.value)}
                placeholder="Örn: 350"
                className="mt-2 w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Konum</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Ülke</label>
              <input
                type="text"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder="Ülke ara..."
                className="w-full bg-slate-700 border border-slate-600 rounded-t-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder-slate-500"
              />
              <select
                value={country}
                onChange={e => { setCountry(e.target.value); setCountrySearch('') }}
                className="w-full bg-slate-700 border border-slate-600 border-t-0 rounded-b-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm"
              >
                {countrySearch
                  ? COUNTRIES
                      .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
                      .map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)
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
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Şehir</label>
              <select value={city} onChange={e => setCity(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm">
                <option value="">Seçin</option>
                {(CITIES[country] || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sector + Keyword */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Sektör / Arama Terimi</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Sektör</label>
              <select value={sector} onChange={e => setSector(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm">
                <option value="">Sektör seçin (opsiyonel)</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Özel Arama Terimi <span className="text-slate-600">— sektörün yerini alır</span></label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Örn: ahşap aksesuar toptancısı, seramik mağazası, çerçeve imalatçı..."
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
              />
              {(keyword || sector) && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Sistem "{keyword || sector} firması", "{keyword || sector} mağazası" gibi 8 varyasyonu da otomatik tarar
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quality Filters */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-white">Kalite Filtreleri</span>
              {(requirePhone || requireWebsite || minScore > 0 || discoverEmails) && (
                <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs rounded-md">Aktif</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="px-5 pb-5 space-y-4 border-t border-slate-700/50 pt-4">
              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'requirePhone', label: 'Sadece telefonlu', desc: 'Telefon numarası olmayan leadleri atla', icon: <Phone className="w-3.5 h-3.5" />, val: requirePhone, set: setRequirePhone },
                  { key: 'requireWebsite', label: 'Sadece web siteli', desc: 'Web sitesi olmayan leadleri atla', icon: <ExternalLink className="w-3.5 h-3.5" />, val: requireWebsite, set: setRequireWebsite },
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => f.set(!f.val)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${f.val ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                  >
                    <div className={`mt-0.5 ${f.val ? 'text-blue-400' : 'text-slate-500'}`}>{f.icon}</div>
                    <div>
                      <div className={`text-sm font-medium ${f.val ? 'text-blue-300' : 'text-white'}`}>{f.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Email discovery */}
              <button
                type="button"
                onClick={() => setDiscoverEmails(v => !v)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition ${discoverEmails ? 'border-purple-500/50 bg-purple-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
              >
                <div className={`p-2 rounded-lg ${discoverEmails ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
                  <Sparkles className={`w-4 h-4 ${discoverEmails ? 'text-purple-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${discoverEmails ? 'text-purple-300' : 'text-white'}`}>Email Keşfi</span>
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded font-bold">AI</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Her firmanın web sitesi taranır, iletişim sayfasından email adresi çıkarılır.
                    {discoverEmails && <span className="text-amber-400"> +~6 sn/lead ek süre.</span>}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${discoverEmails ? 'border-purple-400 bg-purple-400' : 'border-slate-600'}`}>
                  {discoverEmails && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>

              {/* Min score */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs text-slate-400">Minimum Kalite Skoru</label>
                  <span className={`text-xs font-medium ${minScore > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                    {minScore > 0 ? `${minScore}+ puan` : 'Filtre yok'}
                  </span>
                </div>
                <input
                  type="range" min={0} max={80} step={10}
                  value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>0 (hepsi)</span>
                  <span>40 (orta)</span>
                  <span>80 (sadece yüksek)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary + CTA */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-white">{effectiveCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-0.5">Hedef Lead</div>
            </div>
            <div>
              <div className={`text-xl font-bold ${hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>{effectiveCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-0.5">Kredi Kullanılacak</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">{estimatedTime()}</div>
              <div className="text-xs text-slate-400 mt-0.5">Tahmini Süre</div>
            </div>
          </div>

          {!hasEnough && credits && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Yetersiz kredi ({available} mevcut, {effectiveCount} gerekli). Paketi yükseltin.
            </div>
          )}

          {isAsync && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
              <Zap className="w-4 h-4 shrink-0" />
              {discoverEmails ? 'Email keşfi aktif — işlem biraz uzun sürebilir, arka planda devam eder.' : `${effectiveCount}+ lead arka planda toplanacak.`}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !hasEnough || (!keyword && !sector) || !city}
            className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition text-sm"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Başlatılıyor...</>
              : <><MapPin className="w-4 h-4" /> {effectiveCount.toLocaleString()} Lead Toplamayı Başlat</>
            }
          </button>
        </div>
      </form>

      {/* How it works */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Nasıl Çalışır?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Search className="w-4 h-4 text-blue-400" />, title: 'Çok Sorgu Tarama', desc: '8 farklı arama varyasyonu + bölge bazlı tarama ile maksimum sonuç' },
            { icon: <Mail className="w-4 h-4 text-purple-400" />, title: 'Email Keşfi', desc: 'Web sitesi taranır, iletişim sayfasından gerçek email adresi çıkarılır' },
            { icon: <Users className="w-4 h-4 text-emerald-400" />, title: 'Akıllı Tekilleştirme', desc: 'CRM\'inizde olanlar ve yinelemeler otomatik atlanır, 10 sinyalli skor hesaplanır' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div>
                <p className="text-xs font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
