'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  FileText, Search, RefreshCw, Globe, CheckCircle,
  XCircle, Clock, Star, ExternalLink, Send, BarChart2,
  Filter, ChevronDown, Bell, BellOff, Trash2, Shield,
  ClipboardList, Users, BookOpen
} from 'lucide-react'

const COUNTRIES = [
  { id: 'worldwide',     name: '🌍 Dünya Geneli (Worldwide)',          group: 'Global' },
  { id: 'international', name: '🌐 Uluslararası (BM / Dünya Bankası)', group: 'Global' },
  { id: 'turkey',        name: '🇹🇷 Türkiye',                          group: 'Yakın Çevre' },
  { id: 'uae',           name: '🇦🇪 BAE (Dubai / Abu Dhabi)',           group: 'Yakın Çevre' },
  { id: 'saudi',         name: '🇸🇦 Suudi Arabistan',                   group: 'Yakın Çevre' },
  { id: 'qatar',         name: '🇶🇦 Katar',                             group: 'Yakın Çevre' },
  { id: 'kuwait',        name: '🇰🇼 Kuveyt',                            group: 'Yakın Çevre' },
  { id: 'middleeast',    name: '🕌 Orta Doğu Geneli',                   group: 'Yakın Çevre' },
  { id: 'eu',            name: '🇪🇺 Avrupa Birliği (Tümü)',             group: 'Avrupa' },
  { id: 'germany',       name: '🇩🇪 Almanya',                           group: 'Avrupa' },
  { id: 'france',        name: '🇫🇷 Fransa',                            group: 'Avrupa' },
  { id: 'italy',         name: '🇮🇹 İtalya',                            group: 'Avrupa' },
  { id: 'spain',         name: '🇪🇸 İspanya',                           group: 'Avrupa' },
  { id: 'netherlands',   name: '🇳🇱 Hollanda',                          group: 'Avrupa' },
  { id: 'poland',        name: '🇵🇱 Polonya',                           group: 'Avrupa' },
  { id: 'uk',            name: '🇬🇧 İngiltere',                         group: 'Avrupa' },
  { id: 'usa',           name: '🇺🇸 ABD',                               group: 'Amerika' },
  { id: 'brazil',        name: '🇧🇷 Brezilya',                          group: 'Amerika' },
  { id: 'china',         name: '🇨🇳 Çin',                               group: 'Asya' },
  { id: 'india',         name: '🇮🇳 Hindistan',                         group: 'Asya' },
  { id: 'asia',          name: '🌏 Asya Geneli',                        group: 'Asya' },
  { id: 'russia',        name: '🇷🇺 Rusya',                             group: 'Diğer' },
  { id: 'africa',        name: '🌍 Afrika Geneli',                      group: 'Diğer' },
]

const SECTORS = [
  'Tekstil & Hazır Giyim', 'Mobilya & Dekorasyon', 'İnşaat & Yapı Malzemeleri',
  'Gıda & Tarım', 'Makine & Ekipman', 'Elektrik & Elektronik',
  'Kimya & Plastik', 'Metal & Çelik', 'Otomotiv & Parça',
  'Sağlık & İlaç', 'Savunma & Güvenlik', 'Bilişim & Yazılım',
  'Enerji & Altyapı', 'Lojistik & Taşımacılık', 'Turizm & Otelcilik',
  'Eğitim & Danışmanlık', 'Tarım Makineleri', 'Ambalaj',
]

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  applied:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  won:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  lost:      'bg-red-500/20 text-red-300 border-red-500/30',
  dismissed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif', applied: 'Başvuruldu', won: 'Kazanıldı', lost: 'Kaybedildi', dismissed: 'Reddedildi',
}

function scoreColor(s: number) { return s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400' }
function scoreBg(s: number) { return s >= 80 ? 'bg-emerald-500/20 border-emerald-500/40' : s >= 60 ? 'bg-yellow-500/20 border-yellow-500/40' : 'bg-red-500/20 border-red-500/40' }

const groupedCountries = COUNTRIES.reduce((acc, c) => {
  if (!acc[c.group]) acc[c.group] = []
  acc[c.group].push(c)
  return acc
}, {} as Record<string, typeof COUNTRIES>)

const SOURCE_LABELS: Record<string, string> = {
  'worldwide': ['EKAP', 'TED Europa', 'UNGM', 'World Bank', 'Google'],
  'turkey': ['EKAP', 'Google TR'],
  'eu': ['TED Europa'],
  'germany': ['TED Europa', 'Google DE'],
  'france': ['TED Europa', 'Google FR'],
  'italy': ['TED Europa', 'Google IT'],
  'spain': ['TED Europa', 'Google ES'],
  'netherlands': ['TED Europa', 'Google NL'],
  'poland': ['TED Europa', 'Google PL'],
  'uk': ['Google UK'],
  'usa': ['SAM.gov', 'Google USA'],
  'uae': ['Google BAE'],
  'saudi': ['Google SA'],
  'qatar': ['Google QA'],
  'kuwait': ['Google KW'],
  'middleeast': ['Google Orta Doğu'],
  'international': ['UNGM (BM)', 'World Bank'],
  'africa': ['World Bank', 'Google Afrika'],
  'asia': ['World Bank', 'Google Asya'],
  'russia': ['Google RU'],
  'china': ['Google CN'],
  'india': ['Google IN'],
  'brazil': ['Google BR'],
} as any

export default function TendersPage() {
  const [tenders, setTenders]               = useState<any[]>([])
  const [stats, setStats]                   = useState<any>(null)
  const [scans, setScans]                   = useState<any[]>([])
  const [prefs, setPrefs]                   = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [scanning, setScanning]             = useState(false)
  const [selectedTender, setSelectedTender] = useState<any>(null)
  const [activeTab, setActiveTab]           = useState<'info' | 'requirements' | 'proposal'>('info')
  const [generatingProposal, setGeneratingProposal] = useState(false)
  const [proposal, setProposal]             = useState<string | null>(null)
  const [companyInfo, setCompanyInfo]       = useState('')
  const [showScan, setShowScan]             = useState(false)
  const [showHistory, setShowHistory]       = useState(false)
  const [showPrefs, setShowPrefs]           = useState(false)
  const [msg, setMsg]                       = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [scanForm, setScanForm] = useState({
    keyword: '', country: 'worldwide', sector: '', user_profile: '', save_pref: false,
  })
  const [filterCountry, setFilterCountry] = useState('')
  const [filterScore, setFilterScore]     = useState('')
  const [filterStatus, setFilterStatus]   = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (filterCountry) params.set('country', filterCountry)
      if (filterScore)   params.set('min_score', filterScore)
      if (filterStatus)  params.set('status', filterStatus)

      const [t, s, sc, pr] = await Promise.allSettled([
        api.get(`/api/tenders?${params}`),
        api.get('/api/tenders/stats/summary'),
        api.get('/api/tenders/scans/history'),
        api.get('/api/tenders/prefs'),
      ])
      if (t.status  === 'fulfilled') setTenders(t.value.tenders || [])
      if (s.status  === 'fulfilled') setStats(s.value)
      if (sc.status === 'fulfilled') setScans(sc.value.scans || [])
      if (pr.status === 'fulfilled') setPrefs(pr.value.prefs || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startScan = async () => {
    if (!scanForm.keyword) return showMsg('error', 'Anahtar kelime zorunlu')
    setScanning(true)
    try {
      const countryLabel = COUNTRIES.find(c => c.id === scanForm.country)?.name || scanForm.country
      await api.post('/api/tenders/scan', scanForm)
      showMsg('success', `"${scanForm.keyword}" için ${countryLabel} taraması başlatıldı. ${scanForm.save_pref ? 'Her gün otomatik taranacak.' : '1-2 dk içinde sonuçlar gelecek.'}`)
      setShowScan(false)
      setTimeout(() => load(), 70000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setScanning(false) }
  }

  const deletePref = async (id: string) => {
    await api.delete(`/api/tenders/prefs/${id}`)
    setPrefs(p => p.filter(x => x.id !== id))
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/tenders/${id}`, { status })
      setTenders(p => p.map(t => t.id === id ? { ...t, status } : t))
      if (selectedTender?.id === id) setSelectedTender((p: any) => ({ ...p, status }))
      showMsg('success', 'Durum güncellendi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const generateProposal = async () => {
    if (!companyInfo.trim()) return showMsg('error', 'Firma bilgisi zorunlu')
    setGeneratingProposal(true); setProposal(null)
    try {
      const data = await api.post(`/api/tenders/${selectedTender.id}/proposal`, { company_info: companyInfo })
      setProposal(data.proposal)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setGeneratingProposal(false) }
  }

  const selectedCountryLabel = COUNTRIES.find(c => c.id === scanForm.country)?.name || '🌍 Dünya Geneli'
  const sourcesForCountry = (SOURCE_LABELS[scanForm.country] || ['Google']) as string[]

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText size={24} className="text-violet-400" /> İhale Avcısı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            23 ülke · Otomatik günlük tarama · AI katılım şartları · Teklif taslağı
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPrefs(!showPrefs)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <Bell size={14} /> Otomatik ({prefs.length})
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <Clock size={14} /> Geçmiş
          </button>
          <button onClick={() => load()}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowScan(!showScan)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl transition font-medium">
            <Search size={14} /> İhale Tara
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Toplam',      value: stats.total,      color: 'text-white' },
            { label: 'Aktif',       value: stats.active,     color: 'text-emerald-400' },
            { label: 'Yüksek Skor', value: stats.highScore,  color: 'text-violet-400' },
            { label: 'Başvuruldu',  value: stats.applied,    color: 'text-blue-400' },
            { label: 'Kazanıldı',   value: stats.won,        color: 'text-purple-400' },
            { label: 'Tarama',      value: stats.totalScans, color: 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Otomatik Tarama Tercihleri */}
      {showPrefs && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Bell size={14} className="text-violet-400" /> Otomatik Günlük Taramalar
          </h2>
          {prefs.length === 0 ? (
            <p className="text-slate-500 text-xs">Henüz otomatik tarama yok. Tarama yaparken "Her gün otomatik tara" kutusunu işaretleyin.</p>
          ) : prefs.map(pref => (
            <div key={pref.id} className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell size={12} className="text-violet-400" />
                <span className="text-white text-sm font-medium">"{pref.keyword}"</span>
                <span className="text-slate-400 text-xs">{COUNTRIES.find(c => c.id === pref.country)?.name || pref.country}</span>
                {pref.sector && <span className="text-slate-500 text-xs">· {pref.sector}</span>}
              </div>
              <button onClick={() => deletePref(pref.id)}
                className="p-1 text-slate-500 hover:text-red-400 transition">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tarama Formu */}
      {showScan && (
        <div className="bg-slate-800/50 border border-violet-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Search size={16} className="text-violet-400" /> Yeni İhale Taraması
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Anahtar Kelime *</label>
              <input value={scanForm.keyword} onChange={e => setScanForm(p => ({ ...p, keyword: e.target.value }))}
                placeholder="tekstil, mobilya, inşaat..." onKeyDown={e => e.key === 'Enter' && startScan()}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Firma Profili (AI Skorlama için)</label>
              <input value={scanForm.user_profile} onChange={e => setScanForm(p => ({ ...p, user_profile: e.target.value }))}
                placeholder="tekstil ihracatı yapan Türk firması, 20 yıl deneyim..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">🌍 Ülke / Bölge *</label>
              <div className="relative">
                <select value={scanForm.country} onChange={e => setScanForm(p => ({ ...p, country: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 appearance-none cursor-pointer">
                  {Object.entries(groupedCountries).map(([group, countries]) => (
                    <optgroup key={group} label={`── ${group} ──`}>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">📦 Sektör</label>
              <div className="relative">
                <select value={scanForm.sector} onChange={e => setScanForm(p => ({ ...p, sector: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 appearance-none cursor-pointer">
                  <option value="">Tüm Sektörler</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Kaynaklar göstergesi */}
          <div className="bg-slate-900/50 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-slate-500 text-xs">Taranacak:</span>
            {sourcesForCountry.map((s: string) => (
              <span key={s} className="text-xs px-2 py-0.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-full">{s}</span>
            ))}
          </div>

          {/* Otomatik tarama checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={scanForm.save_pref}
              onChange={e => setScanForm(p => ({ ...p, save_pref: e.target.checked }))}
              className="w-4 h-4 rounded accent-violet-500" />
            <div>
              <span className="text-white text-sm font-medium">Her gün otomatik tara ve bildir</span>
              <p className="text-slate-500 text-xs">Sabah 07:00'de yeni ihaleler taranır, yeni fırsat bulunursa bildirim alırsınız</p>
            </div>
          </label>

          <div className="flex gap-2">
            <button onClick={startScan} disabled={scanning}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition font-medium">
              {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              {scanning ? 'Taranıyor...' : 'Taramayı Başlat'}
            </button>
            <button onClick={() => setShowScan(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-600 transition">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Tarama Geçmişi */}
      {showHistory && scans.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Clock size={14} className="text-slate-400" /> Tarama Geçmişi
          </h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {scans.map(scan => (
              <div key={scan.id} className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${scan.status === 'completed' ? 'bg-emerald-400' : scan.status === 'running' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-white text-sm font-medium">"{scan.keyword}"</span>
                  <span className="text-slate-500 text-xs">{scan.sources?.join(', ')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-emerald-400 font-medium">{scan.tenders_found || 0} ihale</span>
                  <span>{new Date(scan.started_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 items-center flex-wrap">
        <Filter size={14} className="text-slate-400" />
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none">
          <option value="">Tüm Ülkeler</option>
          {COUNTRIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filterScore} onChange={e => setFilterScore(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none">
          <option value="">Tüm Skorlar</option>
          <option value="75">75+ Yüksek</option>
          <option value="60">60+ Orta</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none">
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="applied">Başvuruldu</option>
          <option value="won">Kazanıldı</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition">
          Filtrele
        </button>
        {(filterCountry || filterScore || filterStatus) && (
          <button onClick={() => { setFilterCountry(''); setFilterScore(''); setFilterStatus(''); setTimeout(load, 100); }}
            className="px-2 py-1.5 text-slate-500 hover:text-slate-300 text-xs transition">
            Temizle ✕
          </button>
        )}
      </div>

      {/* Ana İçerik */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* İhale Listesi */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold">İhaleler ({tenders.length})</h2>
          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <RefreshCw size={20} className="animate-spin text-slate-400" />
            </div>
          ) : tenders.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
              <Globe size={36} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Henüz ihale yok</p>
              <p className="text-slate-500 text-xs mt-1">"İhale Tara" → Ülke seç → Sektör seç</p>
            </div>
          ) : tenders.map(tender => (
            <div key={tender.id}
              onClick={() => { setSelectedTender(tender); setProposal(null); setActiveTab('info') }}
              className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition ${selectedTender?.id === tender.id ? 'border-violet-500' : 'border-slate-700 hover:border-slate-500'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-snug line-clamp-2">{tender.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{tender.institution}</p>
                </div>
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-bold ${scoreBg(tender.ai_score)}`}>
                  <span className={scoreColor(tender.ai_score)}>{tender.ai_score}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{tender.source}</span>
                <span className="text-xs text-slate-400">🌍 {tender.country}</span>
                {tender.budget_text && <span className="text-xs text-emerald-400 font-medium">💰 {tender.budget_text}</span>}
                {tender.deadline && <span className="text-xs text-orange-400">⏰ {new Date(tender.deadline).toLocaleDateString('tr-TR')}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[tender.status] || STATUS_COLORS.active}`}>
                  {STATUS_LABELS[tender.status] || tender.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Seçili İhale Detayı */}
        {selectedTender ? (
          <div className="space-y-4">
            {/* Tab Başlıkları */}
            <div className="flex gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
              {[
                { id: 'info',         label: 'Detay',     icon: Globe },
                { id: 'requirements', label: 'Katılım',   icon: Shield },
                { id: 'proposal',     label: 'Teklif',    icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${activeTab === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {/* TAB: Detay */}
            {activeTab === 'info' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-white font-semibold text-sm leading-snug">{selectedTender.title}</h2>
                  {selectedTender.source_url && (
                    <a href={selectedTender.source_url} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                      <ExternalLink size={12} className="text-slate-400" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Kurum',       value: selectedTender.institution },
                    { label: 'Kaynak',      value: selectedTender.source },
                    { label: 'Ülke',        value: selectedTender.country },
                    { label: 'Para Birimi', value: selectedTender.currency },
                    { label: 'Bütçe',       value: selectedTender.budget_text || '—' },
                    { label: 'Son Başvuru', value: selectedTender.deadline ? new Date(selectedTender.deadline).toLocaleDateString('tr-TR') : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-slate-500">{label}</p>
                      <p className="text-slate-200 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedTender.ai_summary && (
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 space-y-1.5">
                    <p className="text-violet-300 text-xs font-semibold flex items-center gap-1">
                      <Star size={10} /> AI Analizi — Skor:
                      <span className={`font-bold ml-1 ${scoreColor(selectedTender.ai_score)}`}>{selectedTender.ai_score}/100</span>
                    </p>
                    <p className="text-slate-300 text-xs">{selectedTender.ai_summary}</p>
                    <p className="text-slate-400 text-xs italic">{selectedTender.ai_recommendation}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => updateStatus(selectedTender.id, 'applied')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs rounded-lg transition">
                    <Send size={11} /> Başvuruldu
                  </button>
                  <button onClick={() => updateStatus(selectedTender.id, 'won')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs rounded-lg transition">
                    <CheckCircle size={11} /> Kazanıldı
                  </button>
                  <button onClick={() => updateStatus(selectedTender.id, 'dismissed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/20 hover:bg-slate-600/30 border border-slate-500/30 text-slate-400 text-xs rounded-lg transition">
                    <XCircle size={11} /> Reddet
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Katılım Şartları */}
            {activeTab === 'requirements' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Shield size={14} className="text-violet-400" /> AI Katılım Şartları Analizi
                </h3>

                {selectedTender.requirements || selectedTender.eligibility || selectedTender.documents ? (
                  <div className="space-y-3">
                    {selectedTender.requirements && (
                      <div className="bg-slate-900/50 rounded-lg p-3 space-y-1">
                        <p className="text-violet-300 text-xs font-semibold flex items-center gap-1">
                          <ClipboardList size={11} /> Genel Şartlar
                        </p>
                        <p className="text-slate-300 text-xs leading-relaxed">{selectedTender.requirements}</p>
                      </div>
                    )}
                    {selectedTender.eligibility && (
                      <div className="bg-slate-900/50 rounded-lg p-3 space-y-1">
                        <p className="text-blue-300 text-xs font-semibold flex items-center gap-1">
                          <Users size={11} /> Kimler Başvurabilir
                        </p>
                        <p className="text-slate-300 text-xs leading-relaxed">{selectedTender.eligibility}</p>
                      </div>
                    )}
                    {selectedTender.documents && (
                      <div className="bg-slate-900/50 rounded-lg p-3 space-y-1">
                        <p className="text-emerald-300 text-xs font-semibold flex items-center gap-1">
                          <BookOpen size={11} /> İstenen Belgeler
                        </p>
                        <p className="text-slate-300 text-xs leading-relaxed">{selectedTender.documents}</p>
                      </div>
                    )}
                    {selectedTender.source_url && (
                      <a href={selectedTender.source_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs rounded-lg hover:bg-violet-500/20 transition w-fit">
                        <ExternalLink size={11} /> Resmi İhale Sayfasında Tam Şartları Gör
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Shield size={28} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Katılım şartları analiz edilmedi</p>
                    <p className="text-slate-500 text-xs mt-1">Yeni taramalarda otomatik analiz yapılır</p>
                    {selectedTender.source_url && (
                      <a href={selectedTender.source_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition">
                        <ExternalLink size={11} /> Kaynak Siteye Git
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Teklif Taslağı */}
            {activeTab === 'proposal' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <FileText size={14} className="text-violet-400" /> AI Teklif Taslağı
                </h3>
                <textarea value={companyInfo} onChange={e => setCompanyInfo(e.target.value)}
                  placeholder="Firma adı, sektör, deneyim yılı, sertifikalar (ISO, CE...), referanslar, kapasite... AI bu bilgileri kullanarak katılım şartlarına uygun profesyonel teklif mektubu yazar."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-violet-500 resize-none" />
                <button onClick={generateProposal} disabled={generatingProposal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition w-full justify-center font-medium">
                  {generatingProposal ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                  {generatingProposal ? 'Teklif Hazırlanıyor...' : 'AI ile Teklif Taslağı Oluştur'}
                </button>
                {proposal && (
                  <div className="bg-slate-900/80 border border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-violet-300 text-xs font-semibold">✅ Teklif Taslağı Hazır</p>
                      <button onClick={() => navigator.clipboard.writeText(proposal)}
                        className="text-xs text-slate-400 hover:text-white transition px-2 py-1 bg-slate-700 rounded">
                        📋 Kopyala
                      </button>
                    </div>
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                      {proposal}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-48">
            <BarChart2 size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">Bir ihale seçin</p>
            <p className="text-slate-500 text-xs mt-1">Detay · Katılım Şartları · Teklif Taslağı</p>
          </div>
        )}
      </div>
    </div>
  )
}