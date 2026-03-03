'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Search, MapPin, Instagram, Loader2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

const sectors = [
  'Dekorasyon', 'Tekstil', 'Gida', 'Insaat', 'Otomotiv',
  'Teknoloji', 'Saglik', 'Egitim', 'Turizm', 'Diger'
]

const cities = [
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya',
  'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin'
]

export default function ScrapePage() {
  const router = useRouter()
  const [source, setSource] = useState<'google_maps' | 'instagram'>('google_maps')
  const [form, setForm] = useState({
    sector: '',
    city: '',
    customSearch: '',
    maxResults: 50,
    hashtags: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const keyword = form.customSearch || form.sector
      await api.post('/api/scrape/google-maps', {
        keyword,
        city: form.city,
        maxResults: form.maxResults,
      })
      setSuccess(true)
      setTimeout(() => router.push('/leads'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Hata olustu')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Scraping baslatildi!</h2>
          <p className="text-slate-400 mt-2">Leadler toplaniyor, yonlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lead Topla</h1>
        <p className="text-slate-400 mt-1">Otomatik olarak yeni potansiyel musteri bul</p>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setSource('google_maps')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
            source === 'google_maps' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin size={16} />
          Google Maps
        </button>
        <button
          onClick={() => setSource('instagram')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
            source === 'instagram' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Instagram size={16} />
          Instagram
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Sektor</label>
            <select
              value={form.sector}
              onChange={e => setForm({...form, sector: e.target.value})}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm"
            >
              <option value="">Secin</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Sehir</label>
            <select
              value={form.city}
              onChange={e => setForm({...form, city: e.target.value})}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm"
            >
              <option value="">Secin</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {source === 'google_maps' && (
          <div>
            <label className="block text-sm text-slate-300 mb-2">Ozel Arama Terimi (opsiyonel)</label>
            <input
              value={form.customSearch}
              onChange={e => setForm({...form, customSearch: e.target.value})}
              placeholder="or: seramik toptancisi, ahsap aksesuar"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-sm"
            />
          </div>
        )}

        {source === 'instagram' && (
          <div>
            <label className="block text-sm text-slate-300 mb-2">Hashtagler (virgülle ayir)</label>
            <input
              value={form.hashtags}
              onChange={e => setForm({...form, hashtags: e.target.value})}
              placeholder="dekorasyontoptancisi, homedecor, evdekorasyonu"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Maksimum Lead Sayisi: <span className="text-blue-400">{form.maxResults}</span>
          </label>
          <input
            type="range"
            min={10} max={200} step={10}
            value={form.maxResults}
            onChange={e => setForm({...form, maxResults: Number(e.target.value)})}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10</span><span>200</span>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
          <p className="text-blue-300">
            <strong>{form.maxResults} lead</strong> toplanacak = <strong>{form.maxResults} kredi</strong> kullanilacak
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Baslatiliyor...</>
          ) : (
            <><Search size={18} /> Lead Topmayi Baslat</>
          )}
        </button>
      </form>
    </div>
  )
}