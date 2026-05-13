'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Search, Loader2, CheckCircle, ArrowLeft,
  Zap, Users, Star, Globe, ChevronDown, AlertTriangle
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

// ── Data ──────────────────────────────────────────────────────────────────────
const SECTORS = [
  'Dekorasyon', 'Mobilya', 'Tekstil', 'Gıda & Restoran', 'İnşaat & Yapı',
  'Otomotiv', 'Teknoloji & Yazılım', 'Sağlık & Klinik', 'Eğitim & Kurs',
  'Turizm & Otel', 'Güzellik & Kozmetik', 'Hukuk & Avukatlık',
  'Muhasebe & Finans', 'Sigorta', 'Gayrimenkul', 'Temizlik Hizmetleri',
  'Lojistik & Nakliye', 'Tarım & Gıda Üretimi', 'Enerji & Solar',
  'Mühendislik', 'Grafik & Tasarım', 'Fotoğrafçılık', 'Diğer',
]

const COUNTRIES = [
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷' },
  { code: 'FR', name: 'Fransa', flag: '🇫🇷' },
  { code: 'DE', name: 'Almanya', flag: '🇩🇪' },
  { code: 'GB', name: 'İngiltere', flag: '🇬🇧' },
  { code: 'NL', name: 'Hollanda', flag: '🇳🇱' },
  { code: 'BE', name: 'Belçika', flag: '🇧🇪' },
]

const CITIES: Record<string, string[]> = {
  TR: ['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Gaziantep','Kayseri','Mersin','Diyarbakır','Samsun','Eskişehir','Denizli','Malatya'],
  FR: ['Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille'],
  DE: ['Berlin','Hamburg','München','Köln','Frankfurt','Stuttgart','Düsseldorf','Leipzig','Dresden','Hannover'],
  GB: ['London','Birmingham','Manchester','Leeds','Glasgow','Liverpool','Bristol','Edinburgh','Sheffield','Cardiff'],
  NL: ['Amsterdam','Rotterdam','Den Haag','Utrecht','Eindhoven','Tilburg','Groningen','Breda','Nijmegen','Leiden'],
  BE: ['Bruxelles','Antwerpen','Gent','Liège','Bruges','Namur','Leuven','Mons','Ghent','Charleroi'],
}

const LEAD_COUNTS = [
  { value: 20,   label: '20',    badge: null,     time: '~15 sn',  color: 'border-slate-600 hover:border-slate-500' },
  { value: 50,   label: '50',    badge: null,     time: '~30 sn',  color: 'border-slate-600 hover:border-slate-500' },
  { value: 100,  label: '100',   badge: 'Popüler', time: '~1 dk',  color: 'border-blue-500/50 hover:border-blue-400' },
  { value: 200,  label: '200',   badge: null,     time: '~3 dk',   color: 'border-slate-600 hover:border-slate-500' },
  { value: 500,  label: '500',   badge: 'Pro',    time: '~7 dk',   color: 'border-purple-500/50 hover:border-purple-400' },
  { value: 1000, label: '1000',  badge: 'Max',    time: '~15 dk',  color: 'border-amber-500/50 hover:border-amber-400' },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScrapePage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('TR')
  const [maxResults, setMaxResults] = useState(100)
  const [customCount, setCustomCount] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [credits, setCredits] = useState<{ total: number; used: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchCredits()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    // Reset city when country changes
    setCity(CITIES[country]?.[0] || '')
  }, [country])

  async function fetchCredits() {
    try {
      const r = await fetch(`${API}/api/credits`, { headers: authH() })
      const d = await r.json()
      setCredits({ total: d.credits_total || d.total || 0, used: d.credits_used || d.used || 0 })
    } catch {}
  }

  const effectiveCount = showCustom && customCount ? Math.min(Number(customCount), 1000) : maxResults
  const available = credits ? credits.total - credits.used : 0
  const hasEnough = available >= effectiveCount

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/scrape/job/${id}`, { headers: authH() })
        const d = await r.json()
        setJobStatus(d)
        if (d.status === 'done' || d.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)
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
          city,
          country,
          maxResults: effectiveCount,
        }),
      })
      const d = await r.json()

      if (d.error) { setError(d.error); setLoading(false); return }

      if (d.jobId) {
        // Large async job
        setJobId(d.jobId)
        setJobStatus({ status: 'running', total: d.total, found: 0, saved: 0, keyword: keyword || sector, city })
        startPolling(d.jobId)
        setLoading(false)
      } else {
        // Sync done
        setJobStatus({ status: 'done', saved: d.count || 0, total: effectiveCount, found: d.count || 0, keyword: keyword || sector, city })
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası')
      setLoading(false)
    }
  }

  // ── Job progress view ──────────────────────────────────────────────────────
  if (jobId && jobStatus) {
    const pct = jobStatus.total > 0 ? Math.round((jobStatus.found / jobStatus.total) * 100) : 0
    const isDone = jobStatus.status === 'done'
    const isError = jobStatus.status === 'error'

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => router.push('/leads')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Leadlere Dön
        </button>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 space-y-6 text-center">
          {isDone ? (
            <>
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-white">{jobStatus.saved} Lead Toplandı!</h2>
                <p className="text-slate-400 mt-2">"{jobStatus.keyword}" · {jobStatus.city}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/leads')}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition"
                >
                  Leadleri Görüntüle
                </button>
                <button
                  onClick={() => { setJobId(null); setJobStatus(null) }}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition"
                >
                  Yeni Arama
                </button>
              </div>
            </>
          ) : isError ? (
            <>
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-white">Hata Oluştu</h2>
                <p className="text-red-400 mt-2 text-sm">{jobStatus.error || 'Bilinmeyen hata'}</p>
              </div>
              <button
                onClick={() => { setJobId(null); setJobStatus(null) }}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition"
              >
                Tekrar Dene
              </button>
            </>
          ) : (
            <>
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                <div className="w-20 h-20 bg-blue-500/30 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Lead Toplanıyor...</h2>
                <p className="text-slate-400 mt-1 text-sm">"{jobStatus.keyword}" · {jobStatus.city}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">İlerleme</span>
                  <span className="text-white font-medium">{jobStatus.found} / {jobStatus.total}</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{pct}% tamamlandı</span>
                  <span>{jobStatus.saved > 0 ? `${jobStatus.saved} kaydedildi` : 'Kaydediliyor...'}</span>
                </div>
              </div>

              {/* Live counter */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Bulunan', value: jobStatus.found, color: 'text-blue-400' },
                  { label: 'Kaydedilen', value: jobStatus.saved, color: 'text-emerald-400' },
                  { label: 'Hedef', value: jobStatus.total, color: 'text-slate-300' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 rounded-xl p-3">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500">Sayfayı kapatabilirsiniz, işlem arka planda devam eder</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/leads')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Topla</h1>
          <p className="text-slate-400 text-sm mt-0.5">Google Maps'ten otomatik potansiyel müşteri bul</p>
        </div>
        {credits && (
          <div className="ml-auto text-right">
            <div className="text-sm text-white font-medium">{available.toLocaleString()} kredi</div>
            <div className="text-xs text-slate-500">kullanılabilir</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
                  className={`relative flex flex-col items-center py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : `bg-slate-800/60 text-slate-300 ${opt.color}`}`}
                >
                  {opt.badge && (
                    <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${opt.badge === 'Max' ? 'bg-amber-500 text-black' : opt.badge === 'Pro' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {opt.badge}
                    </span>
                  )}
                  <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-white'}`}>{opt.label}</span>
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>{opt.time}</span>
                </button>
              )
            })}
          </div>
          {/* Custom count */}
          <div>
            <button
              type="button"
              onClick={() => setShowCustom(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 transition flex items-center gap-1"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
              Özel sayı gir (maks 1000)
            </button>
            {showCustom && (
              <input
                type="number"
                min={10} max={1000}
                value={customCount}
                onChange={e => setCustomCount(e.target.value)}
                placeholder="Örn: 350"
                className="mt-2 w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            )}
          </div>
        </div>

        {/* Country + City */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Konum</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Ülke</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Şehir</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm"
              >
                <option value="">Seçin</option>
                {(CITIES[country] || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sector + Keyword */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Sektör / Arama</span>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Sektör</label>
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm"
            >
              <option value="">Sektör seçin (opsiyonel)</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Özel Arama Terimi <span className="text-slate-600">— sektörü geçersiz kılar</span>
            </label>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Örn: ahşap aksesuar toptancısı, çerçeve imalatçı, seramik mağazası..."
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
            />
            {(keyword || sector) && (
              <p className="text-xs text-slate-500 mt-1.5">
                Sistem ayrıca "{keyword || sector} firması", "{keyword || sector} mağazası" gibi varyasyonları da tarar
              </p>
            )}
          </div>
        </div>

        {/* Summary + CTA */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-white">{effectiveCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-0.5">Hedef Lead</div>
            </div>
            <div>
              <div className={`text-xl font-bold ${hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                {effectiveCount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Kredi Kullanılacak</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">
                {LEAD_COUNTS.find(l => l.value === maxResults)?.time || '~15 dk'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Tahmini Süre</div>
            </div>
          </div>

          {!hasEnough && credits && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Yetersiz kredi ({available} mevcut, {effectiveCount} gerekli). Paketi yükseltin.
            </div>
          )}

          {effectiveCount > 100 && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
              <Zap className="w-4 h-4 shrink-0" />
              {effectiveCount}+ lead arka planda toplanacak. İşlem başladıktan sonra sayfayı kapatabilirsiniz.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !hasEnough || (!keyword && !sector) || !city}
            className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition text-sm"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Başlatılıyor...</>
            ) : (
              <><MapPin className="w-4 h-4" /> {effectiveCount.toLocaleString()} Lead Toplamayı Başlat</>
            )}
          </button>
        </div>
      </form>

      {/* How it works */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
        <p className="text-xs text-slate-500 font-medium mb-3">Nasıl çalışır?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Search className="w-4 h-4 text-blue-400" />, title: 'Akıllı Tarama', desc: 'Google Maps\'te 8 farklı arama varyasyonu kullanılır' },
            { icon: <Star className="w-4 h-4 text-amber-400" />, title: 'Kalite Skoru', desc: 'Telefon, web sitesi ve rating\'e göre 0-100 puan' },
            { icon: <Users className="w-4 h-4 text-emerald-400" />, title: 'Tekilleştirme', desc: 'CRM\'inizde olanlar otomatik atlanır' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="mt-0.5">{item.icon}</div>
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
