'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Search, MapPin, Tag, Zap, CheckCircle, XCircle,
  RefreshCw, ArrowRight, Building2, Phone, Globe, Star
} from 'lucide-react'

const SECTORS = [
  'Dekorasyon', 'Mobilya', 'Tekstil', 'İnşaat', 'Gıda', 'Restoran',
  'Otel', 'Güzellik Salonu', 'Spor Salonu', 'Muhasebe', 'Avukat',
  'Diş Hekimi', 'Eczane', 'Gayrimenkul', 'Sigorta', 'Yazılım',
  'Matbaa', 'Temizlik', 'Nakliyat', 'Oto Servis',
]

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana',
  'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Eskişehir', 'Trabzon',
]

export default function ScrapePage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number; leads: any[]; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScrape = async () => {
    if (!keyword || !city) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.post('/api/scrape', { keyword, city, limit })
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lead Scraping</h1>
        <p className="text-slate-400 mt-1">Google Maps'ten otomatik lead çek</p>
      </div>

      {/* Form */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
        <h2 className="text-white font-semibold">Arama Kriterleri</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Sektör */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block flex items-center gap-1.5">
              <Tag size={13} /> Sektör / Anahtar Kelime
            </label>
            <div className="relative">
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="örn: mobilya, restoran, dişçi..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SECTORS.slice(0, 8).map(s => (
                <button key={s} onClick={() => setKeyword(s)}
                  className={`px-2 py-0.5 rounded-md text-xs transition ${
                    keyword === s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Şehir */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block flex items-center gap-1.5">
              <MapPin size={13} /> Şehir
            </label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="örn: İstanbul, Ankara..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CITIES.slice(0, 6).map(c => (
                <button key={c} onClick={() => setCity(c)}
                  className={`px-2 py-0.5 rounded-md text-xs transition ${
                    city === c ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lead sayısı */}
        <div>
          <label className="text-slate-400 text-sm mb-2 block flex items-center gap-1.5">
            <Zap size={13} /> Lead Sayısı
            <span className="text-slate-500 text-xs ml-1">({limit} kredi kullanılacak)</span>
          </label>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map(n => (
              <button key={n} onClick={() => setLimit(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  limit === n ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleScrape}
          disabled={loading || !keyword || !city}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? 'Scraping yapılıyor... (~1 dk)' : 'Lead Çek'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 flex items-center gap-4">
          <RefreshCw size={24} className="text-blue-400 animate-spin shrink-0" />
          <div>
            <p className="text-white font-medium">Google Maps taranıyor...</p>
            <p className="text-slate-400 text-sm mt-0.5">Bu işlem yaklaşık 1 dakika sürebilir, lütfen bekleyin.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Sonuç */}
      {result && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-400" />
              <div>
                <p className="text-white font-medium">{result.message}</p>
                <p className="text-slate-400 text-sm">{result.count} lead Leadler sayfasına eklendi</p>
              </div>
            </div>
            <button onClick={() => router.push('/leads')}
              className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm transition">
              Leadleri Gör <ArrowRight size={14} />
            </button>
          </div>

          {/* Preview */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h3 className="text-white font-medium text-sm">Eklenen Leadler (önizleme)</h3>
            </div>
            <div className="divide-y divide-slate-700/50">
              {result.leads.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-300 text-xs font-bold">
                      {(lead.company_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{lead.company_name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {lead.phone && <span className="flex items-center gap-1"><Phone size={10} />{lead.phone}</span>}
                        {lead.website && <span className="flex items-center gap-1"><Globe size={10} />Web sitesi var</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Star size={11} />
                      {lead.score}/100
                    </div>
                  </div>
                </div>
              ))}
              {result.leads.length > 5 && (
                <div className="px-5 py-3 text-center text-slate-500 text-sm">
                  +{result.leads.length - 5} daha...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}