'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Search, Zap, RefreshCw, Plus, Instagram, Facebook, Globe, ShoppingBag, BookOpen, Users, TrendingUp, Target, ArrowRight, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SOURCES = [
  { id: 'web', label: 'Web Genel', icon: '🌐', desc: 'Google aramasından işletme bul', color: 'blue' },
  { id: 'instagram', label: 'Instagram', icon: '📸', desc: 'Instagram işletme hesapları', color: 'pink' },
  { id: 'facebook', label: 'Facebook', icon: '📘', desc: 'Facebook sayfa sahipleri', color: 'blue' },
  { id: 'altinrehber', label: 'Altın Rehber', icon: '📒', desc: 'Türkiye sektör dizini', color: 'yellow' },
  { id: 'sahibinden', label: 'Sahibinden', icon: '🏠', desc: 'Hizmet ilanı verenler', color: 'orange' },
  { id: 'trendyol', label: 'Trendyol', icon: '🛍️', desc: 'E-ticaret mağaza sahipleri', color: 'orange' },
]

const SECTORS = [
  'Mobilya','Dekorasyon','Tadilat','İnşaat','Tekstil','Gıda','Restoran',
  'Kafe','Otel','Güzellik Salonu','Spor Salonu','Otomotiv','Elektronik',
  'Muhasebe','Hukuk','Sağlık','Eğitim','Temizlik','Nakliyat','Çiçekçi'
]

const CITIES = [
  'Istanbul','Ankara','Izmir','Bursa','Antalya','Adana',
  'Gaziantep','Konya','Kayseri','Mersin','Eskişehir','Trabzon'
]

export default function LeadMachinePage() {
  const [selectedSources, setSelectedSources] = useState<string[]>(['web'])
  const [keyword, setKeyword] = useState('')
  const [customKeyword, setCustomKeyword] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>(['Istanbul'])
  const [limitPerCombination, setLimitPerCombination] = useState(15)
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  // Referral
  const [showReferral, setShowReferral] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [referralForm, setReferralForm] = useState({ referrerLeadId:'', companyName:'', contactName:'', phone:'', email:'', sector:'' })
  const [referralLoading, setReferralLoading] = useState(false)
  const router = useRouter()

  const showMsg = (type: 'success'|'error', text: string) => {
    setMsg({type,text}); setTimeout(()=>setMsg(null), 6000)
  }

  const loadStats = async () => {
    try {
      const data = await api.get('/api/sources/stats')
      setStats(data)
    } catch {}
  }

  const loadLeads = async () => {
    try {
      const data = await api.get('/api/leads?limit=100')
      setLeads(data.leads || [])
    } catch {}
  }

  useEffect(() => { loadStats(); loadLeads() }, [])

  const toggleSource = (id: string) => {
    setSelectedSources(prev => prev.includes(id) ? prev.filter(s=>s!==id) : [...prev, id])
  }

  const toggleCity = (city: string) => {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c=>c!==city) : [...prev, city])
  }

  const finalKeyword = customKeyword || keyword

  const quickScrape = async () => {
    if (!finalKeyword || !selectedSources.length) return
    setLoading(true)
    try {
      const results = []
      for (const source of selectedSources) {
        for (const city of selectedCities) {
          const data = await api.post('/api/sources/scrape', {
            source, keyword: finalKeyword, city, limit: limitPerCombination
          })
          results.push({ source, city, ...data })
        }
      }
      const totalAdded = results.reduce((a,r) => a + (r.added||0), 0)
      const totalFound = results.reduce((a,r) => a + (r.found||0), 0)
      setResult({ results, totalAdded, totalFound })
      showMsg('success', `${totalAdded} yeni lead eklendi!`)
      loadStats()
      // 2 saniye sonra leads sayfasına git
      if (totalAdded > 0) setTimeout(() => router.push('/leads'), 3000)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setLoading(false) }
  }

  const batchScrape = async () => {
    if (!finalKeyword || !selectedSources.length) return
    setBatchLoading(true)
    try {
      const data = await api.post('/api/sources/scrape-batch', {
        sources: selectedSources,
        keywords: [finalKeyword],
        cities: selectedCities,
        limitPerCombination
      })
      showMsg('success', data.message)
      setTimeout(loadStats, 10000)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setBatchLoading(false) }
  }

  const addReferral = async () => {
    if (!referralForm.companyName || !referralForm.phone) return
    setReferralLoading(true)
    try {
      const data = await api.post('/api/sources/referral', referralForm)
      showMsg('success', data.message)
      setReferralForm({ referrerLeadId:'', companyName:'', contactName:'', phone:'', email:'', sector:'' })
      setShowReferral(false)
      loadStats()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setReferralLoading(false) }
  }

  const sourceStats = stats?.stats || {}
  const totalLeads = stats?.total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-emerald-400"/> Lead Makinesi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Tüm kanallardan otomatik lead — arka planda workflow çalışır
          </p>
        </div>
        <button onClick={()=>setShowReferral(!showReferral)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition">
          <Users size={14}/> Referans Ekle
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.type==='success'?'✅':'❌'} {msg.text}
        </div>
      )}

      {/* Kaynak İstatistikleri */}
      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {SOURCES.map(s => (
            <div key={s.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-xl">{s.icon}</p>
              <p className="text-white font-bold text-lg mt-1">{sourceStats[s.id]||0}</p>
              <p className="text-slate-500 text-xs truncate">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sol: Ayarlar */}
        <div className="lg:col-span-1 space-y-4">

          {/* Kaynak Seçimi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Globe size={14} className="text-blue-400"/> Lead Kaynağı Seç
            </h3>
            <div className="space-y-2">
              {SOURCES.map(s => (
                <label key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition border ${selectedSources.includes(s.id)?'bg-slate-700 border-slate-500':'border-transparent hover:bg-slate-800'}`}>
                  <input type="checkbox" checked={selectedSources.includes(s.id)}
                    onChange={()=>toggleSource(s.id)} className="accent-emerald-500"/>
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <p className="text-white text-xs font-medium">{s.label}</p>
                    <p className="text-slate-500 text-xs">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Sektör Seçimi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3">🎯 Sektör / Anahtar Kelime</h3>
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto">
              {SECTORS.map(s => (
                <button key={s} onClick={()=>setKeyword(s)}
                  className={`px-2 py-1 text-xs rounded-lg border transition ${keyword===s?'bg-emerald-600 border-emerald-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
            <input value={customKeyword} onChange={e=>setCustomKeyword(e.target.value)}
              placeholder="Veya özel kelime girin..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"/>
            {(keyword||customKeyword) && (
              <p className="text-emerald-400 text-xs mt-2">✓ Seçili: "{finalKeyword}"</p>
            )}
          </div>

          {/* Şehir Seçimi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3">📍 Şehir Seç</h3>
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map(c => (
                <button key={c} onClick={()=>toggleCity(c)}
                  className={`px-2 py-1 text-xs rounded-lg border transition ${selectedCities.includes(c)?'bg-blue-600 border-blue-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-2">⚙️ Limit: {limitPerCombination} lead</h3>
            <input type="range" min={5} max={50} value={limitPerCombination}
              onChange={e=>setLimitPerCombination(parseInt(e.target.value))}
              className="w-full accent-emerald-500"/>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5</span><span>50</span>
            </div>
          </div>
        </div>

        {/* Sağ: Arama */}
        <div className="lg:col-span-2 space-y-4">

          {/* Özet */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-yellow-400"/> Arama Özeti
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-slate-900 rounded-xl">
                <p className="text-2xl font-bold text-emerald-400">{selectedSources.length}</p>
                <p className="text-slate-400 text-xs">Kaynak</p>
              </div>
              <div className="text-center p-3 bg-slate-900 rounded-xl">
                <p className="text-2xl font-bold text-blue-400">{selectedCities.length}</p>
                <p className="text-slate-400 text-xs">Şehir</p>
              </div>
              <div className="text-center p-3 bg-slate-900 rounded-xl">
                <p className="text-2xl font-bold text-purple-400">
                  {selectedSources.length * selectedCities.length * limitPerCombination}
                </p>
                <p className="text-slate-400 text-xs">Max Lead</p>
              </div>
            </div>

            {finalKeyword && selectedSources.length > 0 ? (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-sm text-slate-300 mb-4">
                <span className="text-emerald-400 font-medium">"{finalKeyword}"</span> için{' '}
                <span className="text-blue-400">{selectedCities.join(', ')}</span> şehirlerinde{' '}
                <span className="text-pink-400">{selectedSources.map(s=>SOURCES.find(src=>src.id===s)?.label).join(', ')}</span> kaynakları taranacak
              </div>
            ) : (
              <div className="p-3 bg-slate-900 rounded-xl text-sm text-slate-500 mb-4">
                Sektör ve kaynak seçin
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={quickScrape}
                disabled={loading || !finalKeyword || !selectedSources.length}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-xl transition font-medium">
                {loading?<RefreshCw size={16} className="animate-spin"/>:<Search size={16}/>}
                {loading?'Aranıyor...':'Hemen Ara'}
              </button>
              <button onClick={batchScrape}
                disabled={batchLoading || !finalKeyword || !selectedSources.length}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm rounded-xl transition font-medium">
                {batchLoading?<RefreshCw size={16} className="animate-spin"/>:<Zap size={16}/>}
                {batchLoading?'Arka Planda...':'Arka Planda Çalıştır'}
              </button>
            </div>
          </div>

          {/* Sonuç */}
          {result && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold text-sm mb-3">📊 Sonuçlar</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-3xl font-bold text-emerald-400">{result.totalAdded}</p>
                  <p className="text-slate-400 text-xs">Lead Eklendi</p>
                </div>
                <div className="text-center p-3 bg-slate-900 rounded-xl">
                  <p className="text-3xl font-bold text-slate-300">{result.totalFound}</p>
                  <p className="text-slate-400 text-xs">Toplam Bulundu</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {result.results?.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg text-xs">
                    <span className="text-slate-300">{SOURCES.find(s=>s.id===r.source)?.icon} {r.source} / {r.city}</span>
                    <div className="flex gap-3">
                      <span className="text-emerald-400">{r.added} eklendi</span>
                      <span className="text-slate-500">{r.duplicate} tekrar</span>
                    </div>
                  </div>
                ))}
              </div>
              {result.totalAdded > 0 && (
                <Link href="/leads"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition mt-2">
                  <ExternalLink size={14}/> Leadsları Görüntüle ({result.totalAdded} yeni)
                  <ArrowRight size={14}/>
                </Link>
              )}
            </div>
          )}

          {/* Referans Formu */}
          {showReferral && (
            <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Users size={14} className="text-purple-400"/> Referans ile Lead Ekle
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Referans Veren Müşteri</label>
                  <select value={referralForm.referrerLeadId}
                    onChange={e=>setReferralForm(p=>({...p,referrerLeadId:e.target.value}))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none">
                    <option value="">Seçin (opsiyonel)</option>
                    {leads.map(l=><option key={l.id} value={l.id}>{l.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Sektör</label>
                  <input value={referralForm.sector}
                    onChange={e=>setReferralForm(p=>({...p,sector:e.target.value}))}
                    placeholder="Mobilya, Tekstil..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"/>
                </div>
                {[
                  {key:'companyName',label:'Şirket Adı *',ph:'ABC Ltd.'},
                  {key:'contactName',label:'Kişi Adı',ph:'Ahmet Bey'},
                  {key:'phone',label:'Telefon *',ph:'05001234567'},
                  {key:'email',label:'Email',ph:'info@abc.com'},
                ].map(({key,label,ph})=>(
                  <div key={key}>
                    <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                    <input value={(referralForm as any)[key]}
                      onChange={e=>setReferralForm(p=>({...p,[key]:e.target.value}))}
                      placeholder={ph}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"/>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addReferral} disabled={referralLoading||!referralForm.companyName||!referralForm.phone}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                  {referralLoading?<RefreshCw size={12} className="animate-spin"/>:<Plus size={12}/>}
                  {referralLoading?'Ekleniyor...':'Lead Ekle'}
                </button>
                <button onClick={()=>setShowReferral(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition">
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}