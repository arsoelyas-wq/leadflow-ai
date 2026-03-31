'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { RefreshCw, Plus, BarChart3, Eye, Users, AlertTriangle, CheckCircle, LogOut, Link, Play, Pause } from 'lucide-react'

const OBJECTIVES = [
  { key: 'OUTCOME_LEADS', label: 'Lead Toplama', icon: 'ðŸŽ¯' },
  { key: 'OUTCOME_TRAFFIC', label: 'Web TrafiÄŸi', icon: 'ðŸŒ' },
  { key: 'OUTCOME_AWARENESS', label: 'Marka BilinirliÄŸi', icon: 'ðŸ“¢' },
  { key: 'OUTCOME_SALES', label: 'SatÄ±ÅŸ', icon: 'ðŸ’°' },
]

export default function AdsPage() {
  const searchParams = useSearchParams()

  // Meta state
  const [metaConn, setMetaConn] = useState<any>(null)
  const [metaCampaigns, setMetaCampaigns] = useState<any[]>([])
  const [metaAnalysis, setMetaAnalysis] = useState<any>(null)
  const [metaAlerts, setMetaAlerts] = useState<any[]>([])
  const [selectedMetaAccount, setSelectedMetaAccount] = useState('')
  const [analyzingMeta, setAnalyzingMeta] = useState(false)
  const [monitoringMeta, setMonitoringMeta] = useState(false)
  const [fetchingLeads, setFetchingLeads] = useState(false)
  const [showMetaCreate, setShowMetaCreate] = useState(false)
  const [creatingMeta, setCreatingMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ name:'', objective:'OUTCOME_AWARENESS', dailyBudget:'10', targetCountries:['TR'], targetAgeMin:25, targetAgeMax:55 })

  // Google state
  const [googleConn, setGoogleConn] = useState<any>(null)
  const [googleCampaigns, setGoogleCampaigns] = useState<any[]>([])
  const [googleAnalysis, setGoogleAnalysis] = useState<any>(null)
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState('')
  const [analyzingGoogle, setAnalyzingGoogle] = useState(false)
  const [showGoogleCreate, setShowGoogleCreate] = useState(false)
  const [creatingGoogle, setCreatingGoogle] = useState(false)
  const [googleForm, setGoogleForm] = useState({ name:'', budget:'10' })

  // AI Copy
  const [showCopy, setShowCopy] = useState(false)
  const [adCopy, setAdCopy] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [copyForm, setCopyForm] = useState({ product:'', sector:'', target:'iÅŸletme sahipleri', platform:'Meta' })

  const [activeTab, setActiveTab] = useState<'meta'|'google'>('meta')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),6000) }

  const load = async () => {
    setLoading(true)
    try {
      const [m, g, mc] = await Promise.allSettled([
        api.get('/api/ads/connection'),
        api.get('/api/google-ads/connection'),
        api.get('/api/ads/my-campaigns'),
      ])
      if (m.status==='fulfilled') {
        setMetaConn(m.value)
        if (m.value.adAccounts?.[0]) setSelectedMetaAccount(m.value.adAccounts[0].id)
      }
      if (g.status==='fulfilled') {
        setGoogleConn(g.value)
        if (g.value.adAccounts?.[0]) setSelectedGoogleAccount(g.value.adAccounts[0].id)
      }
      if (mc.status==='fulfilled') setMetaCampaigns(mc.value.campaigns||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const metaCode = searchParams.get('meta_code')
    const googleCode = searchParams.get('google_code')
    const error = searchParams.get('error')

    if (metaCode) {
      api.post('/api/ads/exchange-token', { code: metaCode })
        .then(d => { showMsg('success', `${d.userName} â€” Meta baÄŸlandÄ±!`); load(); window.history.replaceState({}, '', '/ads') })
        .catch(e => showMsg('error', e.message))
    }
    if (googleCode) {
      api.post('/api/google-ads/exchange-token', { code: decodeURIComponent(googleCode) })
        .then(d => { showMsg('success', `${d.userName} â€” Google Ads baÄŸlandÄ±!`); load(); window.history.replaceState({}, '', '/ads') })
        .catch(e => showMsg('error', e.message))
    }
    if (error) showMsg('error', 'BaÄŸlantÄ± baÅŸarÄ±sÄ±z')
  }, [])

  const connectMeta = async () => {
    try { const d = await api.get('/api/ads/oauth-url'); window.location.href = d.url }
    catch (e:any) { showMsg('error', e.message) }
  }

  const connectGoogle = async () => {
    try { const d = await api.get('/api/google-ads/oauth-url'); window.location.href = d.url }
    catch (e:any) { showMsg('error', e.message) }
  }

  const disconnectMeta = async () => {
    try {
      await api.delete('/api/ads/connection')
      setMetaConn(null)
      showMsg('success', 'Meta baÄŸlantÄ±sÄ± kesildi')
    } catch (e:any) { showMsg('error', e.message) }
  }

  const disconnectGoogle = async () => {
    try {
      await api.delete('/api/google-ads/connection')
      setGoogleConn(null)
      showMsg('success', 'Google Ads baÄŸlantÄ±sÄ± kesildi')
    } catch (e:any) { showMsg('error', e.message) }
  }

  const analyzeMeta = async () => {
    if (!selectedMetaAccount) return
    setAnalyzingMeta(true)
    try {
      const d = await api.get(`/api/ads/analyze/${selectedMetaAccount}`)
      setMetaAnalysis(d.analysis)
      showMsg('success', `${d.total} kampanya analiz edildi`)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setAnalyzingMeta(false) }
  }

  const monitorMeta = async () => {
    if (!selectedMetaAccount) return
    setMonitoringMeta(true)
    try {
      const d = await api.get(`/api/ads/monitor/${selectedMetaAccount}`)
      setMetaAlerts(d.alerts||[])
      showMsg('success', `${d.monitored} kampanya izlendi`)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setMonitoringMeta(false) }
  }

  const fetchMetaLeads = async () => {
    if (!selectedMetaAccount) return
    setFetchingLeads(true)
    try {
      const d = await api.get(`/api/ads/leads/${selectedMetaAccount}`)
      showMsg('success', `${d.leadsAdded} yeni lead eklendi!`)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setFetchingLeads(false) }
  }

  const createMetaCampaign = async () => {
    if (!selectedMetaAccount || !metaForm.name) return
    setCreatingMeta(true)
    try {
      const d = await api.post('/api/ads/create-campaign', { ...metaForm, adAccountId: selectedMetaAccount })
      showMsg('success', d.message)
      setShowMetaCreate(false)
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreatingMeta(false) }
  }

  const analyzeGoogle = async () => {
    if (!selectedGoogleAccount) return
    setAnalyzingGoogle(true)
    try {
      const d = await api.get(`/api/google-ads/analyze/${selectedGoogleAccount}`)
      setGoogleAnalysis(d.analysis)
      setGoogleCampaigns(d.campaigns||[])
      showMsg('success', 'Google Ads analiz tamamlandÄ±')
    } catch (e:any) { showMsg('error', e.message) }
    finally { setAnalyzingGoogle(false) }
  }

  const createGoogleCampaign = async () => {
    if (!selectedGoogleAccount || !googleForm.name) return
    setCreatingGoogle(true)
    try {
      const d = await api.post('/api/google-ads/create-campaign', { customerId: selectedGoogleAccount, ...googleForm })
      showMsg('success', d.message)
      setShowGoogleCreate(false)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreatingGoogle(false) }
  }

  const generateCopy = async () => {
    setGenerating(true)
    try {
      const d = await api.post('/api/ads/generate-copy', copyForm)
      setAdCopy(d.copy)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setGenerating(false) }
  }

  const severityColor: Record<string,string> = {
    critical: 'bg-red-500/20 border-red-500/30 text-red-300',
    high: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
    positive: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ðŸ“¢ AI Reklam YÃ¶neticisi</h1>
          <p className="text-slate-400 mt-1 text-sm">Meta & Google Ads â€” AI analiz, optimizasyon, 7/24 izleme</p>
        </div>
        <button onClick={()=>setShowCopy(!showCopy)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition">
          âœ¨ AI Reklam Metni
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* BaÄŸlantÄ± KartlarÄ± */}
      <div className="grid grid-cols-2 gap-4">
        {/* Meta */}
        <div className={`border rounded-xl p-4 ${metaConn?.connected?'bg-blue-500/5 border-blue-500/30':'bg-slate-800/50 border-slate-700'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${metaConn?.connected?'bg-blue-600':'bg-slate-700'}`}>ðŸ“˜</div>
            <div className="flex-1">
              <p className="text-white font-medium">Meta Ads</p>
              <p className={`text-xs ${metaConn?.connected?'text-emerald-400':'text-slate-400'}`}>
                {metaConn?.connected ? `âœ… ${metaConn.userName}` : 'BaÄŸlÄ± deÄŸil'}
              </p>
            </div>
          </div>
          {metaConn?.connected ? (
            <div className="space-y-2">
              {metaConn.adAccounts?.length > 1 && (
                <select value={selectedMetaAccount} onChange={e=>setSelectedMetaAccount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs">
                  {metaConn.adAccounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={analyzeMeta} disabled={analyzingMeta}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg transition">
                  {analyzingMeta?<RefreshCw size={10} className="animate-spin"/>:<BarChart3 size={10}/>} Analiz
                </button>
                <button onClick={monitorMeta} disabled={monitoringMeta}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 text-xs rounded-lg transition">
                  {monitoringMeta?<RefreshCw size={10} className="animate-spin"/>:<Eye size={10}/>} Ä°zle
                </button>
                <button onClick={fetchMetaLeads} disabled={fetchingLeads}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded-lg transition">
                  {fetchingLeads?<RefreshCw size={10} className="animate-spin"/>:<Users size={10}/>} Lead
                </button>
                <button onClick={()=>setShowMetaCreate(!showMetaCreate)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition">
                  <Plus size={10}/> Kampanya
                </button>
                <button onClick={disconnectMeta}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition ml-auto">
                  <LogOut size={10}/> Ã‡Ä±kÄ±ÅŸ
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectMeta}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
              <Link size={13}/> Meta HesabÄ±nÄ± BaÄŸla
            </button>
          )}
        </div>

        {/* Google */}
        <div className={`border rounded-xl p-4 ${googleConn?.connected?'bg-yellow-500/5 border-yellow-500/30':'bg-slate-800/50 border-slate-700'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${googleConn?.connected?'bg-yellow-600':'bg-slate-700'}`}>ðŸ”</div>
            <div className="flex-1">
              <p className="text-white font-medium">Google Ads</p>
              <p className={`text-xs ${googleConn?.connected?'text-emerald-400':'text-slate-400'}`}>
                {googleConn?.connected ? `âœ… ${googleConn.userName}` : 'BaÄŸlÄ± deÄŸil'}
              </p>
            </div>
          </div>
          {googleConn?.connected ? (
            <div className="space-y-2">
              {googleConn.adAccounts?.length > 1 && (
                <select value={selectedGoogleAccount} onChange={e=>setSelectedGoogleAccount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs">
                  {googleConn.adAccounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={analyzeGoogle} disabled={analyzingGoogle}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 text-xs rounded-lg transition">
                  {analyzingGoogle?<RefreshCw size={10} className="animate-spin"/>:<BarChart3 size={10}/>} Analiz
                </button>
                <button onClick={()=>setShowGoogleCreate(!showGoogleCreate)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition">
                  <Plus size={10}/> Kampanya
                </button>
                <button onClick={disconnectGoogle}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition ml-auto">
                  <LogOut size={10}/> Ã‡Ä±kÄ±ÅŸ
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectGoogle}
              className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition">
              <Link size={13}/> Google Ads BaÄŸla
            </button>
          )}
        </div>
      </div>

      {/* AI Reklam Metni */}
      {showCopy && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">âœ¨ AI Reklam Metni Ãœretici</h2>
          <div className="grid lg:grid-cols-2 gap-3">
            {[{k:'product',l:'ÃœrÃ¼n/Hizmet *',p:'Mobilya, Tadilat...'},{k:'sector',l:'SektÃ¶r',p:'Ä°nÅŸaat, Tekstil...'},{k:'target',l:'Hedef Kitle',p:'Ä°ÅŸletme sahipleri...'}].map(({k,l,p})=>(
              <div key={k}>
                <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                <input value={(copyForm as any)[k]} onChange={e=>setCopyForm(prev=>({...prev,[k]:e.target.value}))}
                  placeholder={p} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
              </div>
            ))}
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Platform</label>
              <select value={copyForm.platform} onChange={e=>setCopyForm(p=>({...p,platform:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {['Meta','Google','Instagram'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button onClick={generateCopy} disabled={generating||!copyForm.product}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {generating?<RefreshCw size={14} className="animate-spin"/>:'âœ¨'} {generating?'Ãœretiliyor...':'Metin Ãœret'}
          </button>
          {adCopy && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 space-y-2">
                <p className="text-slate-400 text-xs">BaÅŸlÄ±k</p><p className="text-white font-semibold">{adCopy.headline}</p>
                <p className="text-slate-400 text-xs">AÃ§Ä±klama</p><p className="text-slate-300 text-sm">{adCopy.description}</p>
                <span className="inline-block px-3 py-1 bg-purple-600 text-white text-xs rounded-lg">{adCopy.cta}</span>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 space-y-2">
                <p className="text-slate-400 text-xs">Anahtar Kelimeler</p>
                <div className="flex flex-wrap gap-1">{adCopy.keywords?.map((k:string)=><span key={k} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{k}</span>)}</div>
                <p className="text-slate-400 text-xs">Strateji</p>
                <p className="text-slate-300 text-xs">{adCopy.targetingTips}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab SeÃ§ici */}
      {(metaConn?.connected || googleConn?.connected) && (
        <div className="flex gap-2">
          <button onClick={()=>setActiveTab('meta')}
            className={`px-4 py-2 text-sm rounded-xl border transition ${activeTab==='meta'?'bg-blue-600 border-blue-500 text-white':'border-slate-700 text-slate-400 hover:text-white'}`}>
            ðŸ“˜ Meta Ads
          </button>
          <button onClick={()=>setActiveTab('google')}
            className={`px-4 py-2 text-sm rounded-xl border transition ${activeTab==='google'?'bg-yellow-600 border-yellow-500 text-white':'border-slate-700 text-slate-400 hover:text-white'}`}>
            ðŸ” Google Ads
          </button>
        </div>
      )}

      {/* Meta Tab Ä°Ã§eriÄŸi */}
      {activeTab==='meta' && metaConn?.connected && (
        <div className="space-y-4">
          {/* Meta Kampanya OluÅŸtur */}
          {showMetaCreate && (
            <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">ðŸ“˜ Yeni Meta KampanyasÄ±</h2>
              <div className="grid lg:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Kampanya AdÄ± *</label>
                  <input value={metaForm.name} onChange={e=>setMetaForm(p=>({...p,name:e.target.value}))}
                    placeholder="Mobilya KampanyasÄ±" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">GÃ¼nlÃ¼k BÃ¼tÃ§e (USD)</label>
                  <input type="number" value={metaForm.dailyBudget} onChange={e=>setMetaForm(p=>({...p,dailyBudget:e.target.value}))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {OBJECTIVES.map(obj=>(
                  <button key={obj.key} onClick={()=>setMetaForm(p=>({...p,objective:obj.key}))}
                    className={`p-2.5 rounded-lg border text-center transition ${metaForm.objective===obj.key?'bg-blue-600/20 border-blue-500 text-white':'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
                    <p className="text-lg">{obj.icon}</p><p className="text-xs">{obj.label}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={createMetaCampaign} disabled={creatingMeta||!metaForm.name}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                  {creatingMeta?'OluÅŸturuluyor...':'Kampanya OluÅŸtur'}
                </button>
                <button onClick={()=>setShowMetaCreate(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">Ä°ptal</button>
              </div>
            </div>
          )}

          {/* Meta Analiz */}
          {metaAnalysis && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-blue-400"/> Meta Analizi</h3>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${metaAnalysis.overallScore>=7?'text-emerald-400':metaAnalysis.overallScore>=5?'text-yellow-400':'text-red-400'}`}>{metaAnalysis.overallScore}/10</p>
                  <p className="text-slate-400 text-xs mt-1">Genel Skor</p>
                </div>
                <div className="lg:col-span-2 space-y-1">
                  <p className="text-slate-300 text-sm">{metaAnalysis.summary}</p>
                  {metaAnalysis.recommendations?.map((r:string,i:number)=>(
                    <p key={i} className="text-blue-300 text-xs">ðŸ’¡ {r}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Meta UyarÄ±lar */}
          {metaAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2"><AlertTriangle size={14} className="text-orange-400"/> UyarÄ±lar ({metaAlerts.length})</h3>
              {metaAlerts.map((a:any,i:number)=>(
                <div key={i} className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${severityColor[a.severity]||'bg-slate-800 border-slate-700 text-slate-300'}`}>
                  <span>{a.severity==='critical'?'ðŸš¨':a.severity==='positive'?'âœ…':'âš ï¸'}</span>
                  <div><p className="font-medium text-sm">{a.name}</p><p className="text-xs opacity-80">{a.message}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Meta Kampanya Listesi */}
          {metaCampaigns.filter(c=>c.platform==='meta').length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-sm">ðŸ“‹ Meta Kampanyalar</h3>
              {metaCampaigns.filter(c=>c.platform==='meta').map((c:any)=>(
                <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                      <span className={c.status==='active'?'text-emerald-400':'text-slate-500'}>{c.status==='active'?'Aktif':'Pasif'}</span>
                      <span>â‚º{c.daily_budget}/gÃ¼n</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Google Tab Ä°Ã§eriÄŸi */}
      {activeTab==='google' && googleConn?.connected && (
        <div className="space-y-4">
          {showGoogleCreate && (
            <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">ðŸ” Yeni Google Ads KampanyasÄ±</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Kampanya AdÄ± *</label>
                  <input value={googleForm.name} onChange={e=>setGoogleForm(p=>({...p,name:e.target.value}))}
                    placeholder="Mobilya KampanyasÄ±" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"/>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">GÃ¼nlÃ¼k BÃ¼tÃ§e (USD)</label>
                  <input type="number" value={googleForm.budget} onChange={e=>setGoogleForm(p=>({...p,budget:e.target.value}))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createGoogleCampaign} disabled={creatingGoogle||!googleForm.name}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                  {creatingGoogle?'OluÅŸturuluyor...':'OluÅŸtur'}
                </button>
                <button onClick={()=>setShowGoogleCreate(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">Ä°ptal</button>
              </div>
            </div>
          )}

          {googleAnalysis && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-yellow-400"/> Google Ads Analizi</h3>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${googleAnalysis.overallScore>=7?'text-emerald-400':googleAnalysis.overallScore>=5?'text-yellow-400':'text-red-400'}`}>{googleAnalysis.overallScore}/10</p>
                  <p className="text-slate-400 text-xs mt-1">Genel Skor</p>
                </div>
                <div className="lg:col-span-2 space-y-1">
                  <p className="text-slate-300 text-sm">{googleAnalysis.summary}</p>
                  {googleAnalysis.recommendations?.map((r:string,i:number)=>(
                    <p key={i} className="text-yellow-300 text-xs">ðŸ’¡ {r}</p>
                  ))}
                  {googleAnalysis.keywordSuggestion && <p className="text-blue-300 text-xs">ðŸ”‘ {googleAnalysis.keywordSuggestion}</p>}
                </div>
              </div>
            </div>
          )}

          {googleCampaigns.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-sm">ðŸ“‹ Google Kampanyalar</h3>
              {googleCampaigns.map((c:any,i:number)=>(
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                      <span className={c.status==='ENABLED'?'text-emerald-400':'text-slate-500'}>{c.status}</span>
                      {c.impressions>0 && <span className="text-blue-400">{c.impressions} gÃ¶sterim</span>}
                      {c.clicks>0 && <span className="text-green-400">{c.clicks} tÄ±klama</span>}
                      {c.spend>0 && <span className="text-red-400">${c.spend.toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ä°kisi de baÄŸlÄ± deÄŸilse */}
      {!metaConn?.connected && !googleConn?.connected && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-4">ðŸ“¢</p>
          <h2 className="text-white text-xl font-bold mb-2">Reklam HesabÄ±nÄ± BaÄŸla</h2>
          <p className="text-slate-400 mb-6">Meta veya Google Ads hesabÄ±nÄ±zÄ± baÄŸlayÄ±n â€” AI ile analiz, optimize et, lead Ã§ek</p>
        </div>
      )}
    </div>
  )
}