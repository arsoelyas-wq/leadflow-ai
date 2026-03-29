'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Megaphone, Plus, RefreshCw, Play, Pause, TrendingUp, Target, Zap, CheckCircle, ExternalLink } from 'lucide-react'

const OBJECTIVES = [
  { key: 'OUTCOME_LEADS', label: 'Lead Toplama', desc: 'WhatsApp/form ile lead al' },
  { key: 'OUTCOME_TRAFFIC', label: 'Web Trafiği', desc: 'Sitenize ziyaretçi çek' },
  { key: 'OUTCOME_AWARENESS', label: 'Marka Bilinirliği', desc: 'Daha çok kişiye ulaş' },
  { key: 'OUTCOME_SALES', label: 'Satış', desc: 'Direkt satış hedefle' },
]

const COUNTRIES = [
  { key: 'TR', label: 'Türkiye' },
  { key: 'DE', label: 'Almanya' },
  { key: 'US', label: 'Amerika' },
  { key: 'AE', label: 'BAE' },
  { key: 'SA', label: 'Suudi Arabistan' },
  { key: 'GB', label: 'İngiltere' },
]

export default function AdsPage() {
  const [stats, setStats] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [metaAccount, setMetaAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [adCopy, setAdCopy] = useState<any>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const [form, setForm] = useState({
    name: '', objective: 'OUTCOME_LEADS', dailyBudget: '100',
    targetCountries: ['TR'], targetAgeMin: 25, targetAgeMax: 55,
  })

  const [copyForm, setCopyForm] = useState({
    product: '', sector: '', target: 'işletme sahipleri ve yöneticiler', platform: 'Meta'
  })

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, m] = await Promise.allSettled([
        api.get('/api/ads/stats'),
        api.get('/api/ads/my-campaigns'),
        api.get('/api/ads/meta/account'),
      ])
      if (s.status==='fulfilled') setStats(s.value)
      if (c.status==='fulfilled') setCampaigns(c.value.campaigns||[])
      if (m.status==='fulfilled') setMetaAccount(m.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const generateCopy = async () => {
    if (!copyForm.product) return
    setGenerating(true)
    try {
      const data = await api.post('/api/ads/generate-copy', copyForm)
      setAdCopy(data.copy)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setGenerating(false) }
  }

  const createCampaign = async () => {
    if (!form.name || !form.dailyBudget) return
    setCreating(true)
    try {
      const data = await api.post('/api/ads/meta/create-campaign', form)
      showMsg('success', data.message)
      setShowCreate(false)
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const toggleStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'PAUSED' : 'ACTIVE'
      await api.patch(`/api/ads/meta/campaign/${campaignId}/status`, { status: newStatus })
      showMsg('success', newStatus === 'ACTIVE' ? 'Kampanya başlatıldı' : 'Kampanya durduruldu')
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const toggleCountry = (key: string) => {
    setForm(p => ({
      ...p,
      targetCountries: p.targetCountries.includes(key)
        ? p.targetCountries.filter(c => c !== key)
        : [...p.targetCountries, key]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone size={24} className="text-blue-400"/> Meta & Google Reklam Yönetimi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">AI destekli profesyonel reklam — doğru hedef kitleye doğru mesaj</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowCopy(!showCopy)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition">
            <Zap size={14}/> AI Reklam Metni
          </button>
          <button onClick={()=>setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
            <Plus size={14}/> Meta Kampanya
          </button>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Bağlantı Durumu */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${stats?.metaConnected?'bg-blue-500/5 border-blue-500/20':'bg-slate-800/50 border-slate-700'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${stats?.metaConnected?'bg-blue-600':'bg-slate-700'}`}>📘</div>
          <div>
            <p className="text-white font-medium text-sm">Meta Ads</p>
            {stats?.metaConnected ? (
              <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={10}/> Bağlı</p>
            ) : (
              <p className="text-slate-400 text-xs">META_PAGE_TOKEN gerekli</p>
            )}
          </div>
          {metaAccount?.accounts?.[0] && (
            <div className="ml-auto text-right">
              <p className="text-white text-xs font-medium">{metaAccount.accounts[0].name}</p>
              <p className="text-slate-400 text-xs">{metaAccount.accounts[0].currency}</p>
            </div>
          )}
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xl">🔍</div>
          <div>
            <p className="text-white font-medium text-sm">Google Ads</p>
            <p className="text-slate-400 text-xs">GOOGLE_ADS_TOKEN gerekli</p>
          </div>
          <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-blue-400 text-xs hover:underline">
            Bağlan <ExternalLink size={10}/>
          </a>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {label:'Toplam Kampanya',value:stats.total,color:'text-white'},
            {label:'Aktif',value:stats.active,color:'text-emerald-400'},
            {label:'Meta',value:stats.meta,color:'text-blue-400'},
            {label:'Google',value:stats.google,color:'text-yellow-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Reklam Metni */}
      {showCopy && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Zap size={16} className="text-purple-400"/> AI Reklam Metni Üretici
          </h2>
          <div className="grid lg:grid-cols-2 gap-3">
            {[
              {key:'product',label:'Ürün/Hizmet *',ph:'Mobilya, Tadilat, Yazılım...'},
              {key:'sector',label:'Sektör',ph:'İnşaat, Tekstil, Gıda...'},
              {key:'target',label:'Hedef Kitle',ph:'İşletme sahipleri, Ev hanımları...'},
            ].map(({key,label,ph})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input value={(copyForm as any)[key]} onChange={e=>setCopyForm(p=>({...p,[key]:e.target.value}))}
                  placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
              </div>
            ))}
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Platform</label>
              <select value={copyForm.platform} onChange={e=>setCopyForm(p=>({...p,platform:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                {['Meta','Google','Instagram','LinkedIn'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button onClick={generateCopy} disabled={generating||!copyForm.product}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {generating?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>}
            {generating?'Üretiliyor...':'Reklam Metni Üret'}
          </button>

          {adCopy && (
            <div className="grid lg:grid-cols-2 gap-4 mt-2">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-300 text-xs font-medium mb-3">📢 Üretilen Reklam</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-slate-400 text-xs">Başlık</p>
                    <p className="text-white font-semibold">{adCopy.headline}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Açıklama</p>
                    <p className="text-slate-300 text-sm">{adCopy.description}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Eylem Butonu</p>
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded-lg">{adCopy.cta}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium mb-3">🎯 Hedefleme Önerileri</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Anahtar Kelimeler</p>
                    <div className="flex flex-wrap gap-1">
                      {adCopy.keywords?.map((k: string) => (
                        <span key={k} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{k}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Strateji</p>
                    <p className="text-slate-300 text-xs">{adCopy.targetingTips}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kampanya Oluştur */}
      {showCreate && (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">📢 Yeni Meta Kampanyası</h2>
          {!stats?.metaConnected && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300 text-xs">
              ⚠️ Meta bağlantısı için Railway'e META_AD_ACCOUNT_ID eklenmelidir
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Kampanya Adı *</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="Mobilya Kampanyası Mart 2026"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Günlük Bütçe (TL) *</label>
              <input type="number" value={form.dailyBudget} onChange={e=>setForm(p=>({...p,dailyBudget:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Hedef</label>
            <div className="grid grid-cols-2 gap-2">
              {OBJECTIVES.map(obj=>(
                <button key={obj.key} onClick={()=>setForm(p=>({...p,objective:obj.key}))}
                  className={`p-3 rounded-lg border text-left transition ${form.objective===obj.key?'bg-blue-600/20 border-blue-500 text-white':'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
                  <p className="text-sm font-medium">{obj.label}</p>
                  <p className="text-xs opacity-70">{obj.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Hedef Ülkeler</label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c=>(
                <button key={c.key} onClick={()=>toggleCountry(c.key)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition ${form.targetCountries.includes(c.key)?'bg-blue-600 border-blue-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {key:'targetAgeMin',label:'Min Yaş'},
              {key:'targetAgeMax',label:'Max Yaş'},
            ].map(({key,label})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input type="number" value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:parseInt(e.target.value)}))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={createCampaign} disabled={creating||!form.name||!form.dailyBudget}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {creating?<RefreshCw size={14} className="animate-spin"/>:<Plus size={14}/>}
              {creating?'Oluşturuluyor...':'Kampanya Oluştur'}
            </button>
            <button onClick={()=>setShowCreate(false)} className="px-4 py-2.5 bg-slate-700 text-slate-300 text-sm rounded-xl">İptal</button>
          </div>
        </div>
      )}

      {/* Kampanya Listesi */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">Kampanyalarım ({campaigns.length})</h2>
        {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
        : campaigns.length===0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
            <Megaphone size={36} className="text-slate-600 mx-auto mb-2"/>
            <p className="text-slate-400">Henüz kampanya yok</p>
            <p className="text-slate-500 text-sm mt-1">Meta Ads hesabınızı bağlayın ve ilk kampanyanızı oluşturun</p>
          </div>
        ) : campaigns.map(camp=>(
          <div key={camp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="text-xl">{camp.platform==='meta'?'📘':'🔍'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{camp.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${camp.status==='active'?'bg-emerald-500/20 text-emerald-300':'bg-slate-700 text-slate-400'}`}>
                  {camp.status==='active'?'Aktif':'Durduruldu'}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                <span>Bütçe: ₺{camp.daily_budget}/gün</span>
                <span>{camp.objective}</span>
                {camp.impressions > 0 && <span className="text-blue-400">{camp.impressions} gösterim</span>}
                {camp.clicks > 0 && <span className="text-green-400">{camp.clicks} tıklama</span>}
                {camp.spend > 0 && <span className="text-red-400">₺{camp.spend} harcama</span>}
              </div>
            </div>
            {camp.campaign_id && (
              <button onClick={()=>toggleStatus(camp.campaign_id, camp.status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition ${camp.status==='active'?'bg-red-500/20 hover:bg-red-500/30 text-red-300':'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'}`}>
                {camp.status==='active'?<><Pause size={11}/>Durdur</>:<><Play size={11}/>Başlat</>}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}