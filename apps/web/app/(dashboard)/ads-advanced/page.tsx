'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Zap, RefreshCw, AlertTriangle, TrendingUp, Search, Target, BarChart3, Eye, Plus, CheckCircle, Brain } from 'lucide-react'

const TABS = [
  { key:'smart', label:'Smart Launch', icon:'🚀' },
  { key:'monitor', label:'7/24 Monitor', icon:'👁️' },
  { key:'capi', label:'CAPI', icon:'📡' },
  { key:'competitor', label:'Rakip Reklamlar', icon:'🕵️' },
  { key:'roas', label:'ROAS Tahmini', icon:'📈' },
  { key:'keywords', label:'Keyword Intel', icon:'🔍' },
  { key:'bid', label:'Bid Sentinel', icon:'⚔️' },
  { key:'retargeting', label:'Retargeting', icon:'🎯' },
]

export default function AdsAdvancedPage() {
  const [tab, setTab] = useState('smart')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [monitorAlerts, setMonitorAlerts] = useState<any[]>([])
  const [capiStats, setCapiStats] = useState<any>(null)
  const [competitorAds, setCompetitorAds] = useState<any[]>([])
  const [competitorAnalysis, setCompetitorAnalysis] = useState<any>(null)
  const [roasPrediction, setRoasPrediction] = useState<any>(null)
  const [keywordAnalysis, setKeywordAnalysis] = useState<any>(null)
  const [bidAnalysis, setBidAnalysis] = useState<any>(null)
  const [retargetingAudiences, setRetargetingAudiences] = useState<any[]>([])
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  // Form states
  const [smartForm, setSmartForm] = useState({ product:'', sector:'', budget:'10', targetCountries:['TR'] })
  const [monitorForm, setMonitorForm] = useState({ adAccountId:'', minCtr:'0.5', maxCpm:'50' })
  const [capiForm, setCapiForm] = useState({ eventName:'Lead', phone:'', email:'', value:'0' })
  const [competitorForm, setCompetitorForm] = useState({ keywords:'', country:'TR' })
  const [retargetForm, setRetargetForm] = useState({ audienceName:'LeadFlow Retargeting', days:'30' })
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),6000) }

  useEffect(()=>{
    api.get('/api/ads-advanced/advanced/stats').then(d=>setStats(d)).catch(()=>{})
    api.get('/api/ads-advanced/monitor/alerts').then(d=>setMonitorAlerts(d.alerts||[])).catch(()=>{})
    api.get('/api/ads-advanced/capi/stats').then(d=>setCapiStats(d)).catch(()=>{})
    api.get('/api/ads-advanced/retargeting/audiences').then(d=>setRetargetingAudiences(d.audiences||[])).catch(()=>{})
    api.get('/api/leads?limit=200').then(d=>setLeads(d.leads||[])).catch(()=>{})
  },[])

  const runSmartLaunch = async () => {
    setLoading(true)
    try {
      const d = await api.post('/api/ads-advanced/smart-launch', smartForm)
      showMsg('success', d.message)
      setStats((p:any)=>({...p, metaConnected: true}))
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const startMonitor = async () => {
    setLoading(true)
    try {
      await api.post('/api/ads-advanced/monitor/start', { adAccountId: monitorForm.adAccountId, alertThresholds: { minCtr: parseFloat(monitorForm.minCtr), maxCpm: parseFloat(monitorForm.maxCpm) }})
      showMsg('success', '7/24 izleme başladı!')
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const sendCapiEvent = async () => {
    setLoading(true)
    try {
      const d = await api.post('/api/ads-advanced/capi/event', capiForm)
      showMsg('success', d.message)
      api.get('/api/ads-advanced/capi/stats').then(d=>setCapiStats(d))
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const searchCompetitorAds = async () => {
    setLoading(true)
    try {
      const d = await api.get(`/api/ads-advanced/competitor-ads?keywords=${competitorForm.keywords}&country=${competitorForm.country}`)
      setCompetitorAds(d.ads||[])
      showMsg('success', `${d.total} rakip reklam bulundu`)
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const analyzeCompetitorAds = async () => {
    if (!competitorAds.length) return
    setLoading(true)
    try {
      const d = await api.post('/api/ads-advanced/competitor-ads/analyze', { ads: competitorAds })
      setCompetitorAnalysis(d.analysis)
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const predictRoas = async () => {
    setLoading(true)
    try {
      const d = await api.post('/api/ads-advanced/predict-roas', {})
      setRoasPrediction(d.prediction)
      showMsg('success', `${d.campaignsAnalyzed} kampanya analiz edildi`)
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const analyzeKeywords = async () => {
    setLoading(true)
    try {
      const d = await api.post('/api/ads-advanced/keyword-intelligence', {})
      setKeywordAnalysis(d.analysis)
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const analyzeBid = async () => {
    setLoading(true)
    try {
      const d = await api.post('/api/ads-advanced/bid-sentinel/analyze', {})
      setBidAnalysis(d.analysis)
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  const setupRetargeting = async () => {
    setLoading(true)
    try {
      const selectedLeadData = leads.filter(l=>selectedLeads.includes(l.id))
      const d = await api.post('/api/ads-advanced/retargeting/setup', { ...retargetForm, leads: selectedLeadData })
      showMsg('success', d.message)
      api.get('/api/ads-advanced/retargeting/audiences').then(d=>setRetargetingAudiences(d.audiences||[]))
    } catch(e:any){showMsg('error',e.message)} finally{setLoading(false)}
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain size={24} className="text-purple-400"/> Gelişmiş Reklam Yönetimi
        </h1>
        <p className="text-slate-400 mt-1 text-sm">AI destekli profesyonel reklam optimizasyonu — Smart Launch, CAPI, ROAS, Bid Yönetimi</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            {l:'CAPI Events',v:stats.capiEvents,c:'text-blue-400'},
            {l:'ROAS Tahmin',v:stats.roasPredictions,c:'text-green-400'},
            {l:'Rakip Reklam',v:stats.competitorAds,c:'text-orange-400'},
            {l:'Retargeting',v:stats.retargetingAudiences,c:'text-purple-400'},
            {l:'Meta',v:stats.metaConnected?'✅':'❌',c:stats.metaConnected?'text-emerald-400':'text-red-400'},
          ].map(({l,v,c})=>(
            <div key={l} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${c}`}>{v}</p>
              <p className="text-slate-400 text-xs mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Seçici */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition ${tab===t.key?'bg-purple-600 border-purple-500 text-white':'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

        {/* 1. Smart Launch */}
        {tab==='smart' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><Zap size={16} className="text-yellow-400"/> Smart Ad Launch — AI ile Tek Tuşta Reklam</h2>
            <p className="text-slate-400 text-sm">Ürününüzü yazın — AI hedef kitle, reklam metni ve kampanya ayarlarını otomatik belirler</p>
            <div className="grid lg:grid-cols-2 gap-4">
              {[
                {k:'product',l:'Ürün / Hizmet *',p:'Mobilya, Tadilat, Yazılım...'},
                {k:'sector',l:'Sektör',p:'İnşaat, Tekstil, Gıda...'},
                {k:'budget',l:'Günlük Bütçe (USD)',p:'10'},
              ].map(({k,l,p})=>(
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                  <input value={(smartForm as any)[k]} onChange={e=>setSmartForm(prev=>({...prev,[k]:e.target.value}))}
                    placeholder={p} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"/>
                </div>
              ))}
            </div>
            <button onClick={runSmartLaunch} disabled={loading||!smartForm.product}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition font-medium">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>}
              {loading?'AI Kampanya Oluşturuyor...':'🚀 Smart Launch Başlat'}
            </button>
          </div>
        )}

        {/* 2. Monitor */}
        {tab==='monitor' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><Eye size={16} className="text-blue-400"/> 7/24 Ad Monitor</h2>
            <p className="text-slate-400 text-sm">Her 15 dakikada kampanyalarınızı kontrol eder — CTR düşerse, CPM yükselirse anında uyarır</p>
            <div className="grid lg:grid-cols-3 gap-3">
              {[
                {k:'adAccountId',l:'Ad Account ID',p:'act_xxxxxxxxx'},
                {k:'minCtr',l:'Min CTR Eşiği (%)',p:'0.5'},
                {k:'maxCpm',l:'Max CPM Eşiği ($)',p:'50'},
              ].map(({k,l,p})=>(
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                  <input value={(monitorForm as any)[k]} onChange={e=>setMonitorForm(prev=>({...prev,[k]:e.target.value}))}
                    placeholder={p} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
              ))}
            </div>
            <button onClick={startMonitor} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<Eye size={14}/>}
              7/24 İzlemeyi Başlat
            </button>
            {monitorAlerts.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="text-white text-sm font-medium">⚠️ Son Uyarılar</h3>
                {monitorAlerts.map((a:any)=>(
                  <div key={a.id} className={`border rounded-xl px-4 py-2.5 text-sm ${a.alert_type==='low_ctr'?'bg-red-500/10 border-red-500/20 text-red-300':'bg-orange-500/10 border-orange-500/20 text-orange-300'}`}>
                    <span className="font-medium">{a.campaign_name}</span> — {a.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. CAPI */}
        {tab==='capi' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">📡 Conversion API (CAPI)</h2>
            <p className="text-slate-400 text-sm">Meta CAPI ile server-side conversion tracking — reklam maliyetini %30-50 düşürür</p>
            {capiStats && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{capiStats.total}</p>
                  <p className="text-slate-400 text-xs">Toplam Event</p>
                </div>
                <div className="bg-slate-900 rounded-xl p-3">
                  <p className="text-white text-xs font-medium mb-1">Event Türleri</p>
                  {Object.entries(capiStats.byEvent||{}).map(([k,v]:any)=>(
                    <p key={k} className="text-slate-300 text-xs">{k}: {v}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Event Türü</label>
                <select value={capiForm.eventName} onChange={e=>setCapiForm(p=>({...p,eventName:e.target.value}))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                  {['Lead','Purchase','CompleteRegistration','AddToCart','InitiateCheckout','ViewContent'].map(e=>(
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
              {[
                {k:'phone',l:'Telefon (hash\'lenir)',p:'05001234567'},
                {k:'email',l:'Email (hash\'lenir)',p:'info@sirket.com'},
                {k:'value',l:'Değer (₺)',p:'1000'},
              ].map(({k,l,p})=>(
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                  <input value={(capiForm as any)[k]} onChange={e=>setCapiForm(prev=>({...prev,[k]:e.target.value}))}
                    placeholder={p} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
              ))}
            </div>
            <button onClick={sendCapiEvent} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
              CAPI Event Gönder
            </button>
          </div>
        )}

        {/* 4. Competitor Ads */}
        {tab==='competitor' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">🕵️ Competitor Ad Mirroring</h2>
            <p className="text-slate-400 text-sm">Meta Ad Library'den rakip reklamları çek — AI ile analiz et — kendi stratejini geliştir</p>
            <div className="grid lg:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Anahtar Kelime / Rakip İsmi</label>
                <input value={competitorForm.keywords} onChange={e=>setCompetitorForm(p=>({...p,keywords:e.target.value}))}
                  placeholder="mobilya, dekorasyon, tadilat..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"/>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ülke</label>
                <select value={competitorForm.country} onChange={e=>setCompetitorForm(p=>({...p,country:e.target.value}))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                  {['TR','DE','US','AE','SA'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={searchCompetitorAds} disabled={loading||!competitorForm.keywords}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                {loading?<RefreshCw size={14} className="animate-spin"/>:<Search size={14}/>}
                Rakip Reklamları Ara
              </button>
              {competitorAds.length>0 && (
                <button onClick={analyzeCompetitorAds} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                  <Brain size={14}/> AI ile Analiz Et
                </button>
              )}
            </div>
            {competitorAds.length>0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {competitorAds.map((ad:any,i:number)=>(
                  <div key={i} className="bg-slate-900 rounded-lg p-3">
                    <p className="text-white text-xs font-medium">{ad.pageName}</p>
                    {ad.title && <p className="text-blue-300 text-xs mt-0.5">{ad.title}</p>}
                    {ad.body && <p className="text-slate-400 text-xs mt-0.5 truncate">{ad.body}</p>}
                  </div>
                ))}
              </div>
            )}
            {competitorAnalysis && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-2">
                <p className="text-orange-300 font-medium text-sm">🤖 AI Analizi</p>
                <p className="text-white text-sm font-medium">{competitorAnalysis.suggestedAngle}</p>
                <p className="text-slate-300 text-xs">💡 Hook: {competitorAnalysis.hookIdea}</p>
                {competitorAnalysis.opportunities?.map((o:string,i:number)=>(
                  <p key={i} className="text-emerald-300 text-xs">✓ {o}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. ROAS */}
        {tab==='roas' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><TrendingUp size={16} className="text-green-400"/> Predictive ROAS Optimizer</h2>
            <p className="text-slate-400 text-sm">Son 30 günlük verileri analiz eder — AI ile sonraki 30 günün ROAS'ını tahmin eder</p>
            <button onClick={predictRoas} disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<BarChart3 size={14}/>}
              {loading?'Analiz ediliyor...':'ROAS Tahmini Yap'}
            </button>
            {roasPrediction && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{roasPrediction.predicted30DayRoas}x</p>
                    <p className="text-slate-400 text-xs mt-1">Tahmini ROAS</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">%{roasPrediction.confidenceScore}</p>
                    <p className="text-slate-400 text-xs mt-1">Güven Skoru</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-yellow-400">{roasPrediction.budgetRecommendation}</p>
                    <p className="text-slate-400 text-xs mt-1">Bütçe Önerisi</p>
                  </div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-300 text-sm font-medium mb-2">📋 Aksiyon Planı</p>
                  {roasPrediction.actionPlan?.map((a:string,i:number)=>(
                    <p key={i} className="text-slate-300 text-sm">✓ {a}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Keywords */}
        {tab==='keywords' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><Search size={16} className="text-blue-400"/> Keyword Intelligence</h2>
            <p className="text-slate-400 text-sm">Google Ads arama terimlerini analiz eder — negatif liste önerir — boşa harcanan bütçeyi kurtarır</p>
            <button onClick={analyzeKeywords} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<Search size={14}/>}
              Keyword Analizi Yap
            </button>
            {keywordAnalysis && (
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-300 text-sm font-medium mb-2">❌ Negatif Anahtar Kelimeler</p>
                  {keywordAnalysis.negativeKeywords?.map((k:string,i:number)=>(
                    <span key={i} className="inline-block px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded mr-1 mb-1">{k}</span>
                  ))}
                  {keywordAnalysis.estimatedWastedBudget && (
                    <p className="text-red-400 text-xs mt-2">Tahmini israf: {keywordAnalysis.estimatedWastedBudget}</p>
                  )}
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-emerald-300 text-sm font-medium mb-2">✅ Pozitif Anahtar Kelimeler</p>
                  {keywordAnalysis.positiveKeywords?.map((k:string,i:number)=>(
                    <span key={i} className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded mr-1 mb-1">{k}</span>
                  ))}
                  <p className="text-slate-300 text-xs mt-2">{keywordAnalysis.insight}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Bid Sentinel */}
        {tab==='bid' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">⚔️ AI Bid-War Sentinel</h2>
            <p className="text-slate-400 text-sm">Açık artırma verilerini analiz eder — rakipleri tespit eder — teklif stratejisi önerir</p>
            <button onClick={analyzeBid} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<AlertTriangle size={14}/>}
              Bid Analizi Yap
            </button>
            {bidAnalysis && (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl border text-sm font-medium ${bidAnalysis.urgencyLevel==='high'?'bg-red-500/20 border-red-500/30 text-red-300':bidAnalysis.urgencyLevel==='medium'?'bg-yellow-500/20 border-yellow-500/30 text-yellow-300':'bg-green-500/20 border-green-500/30 text-green-300'}`}>
                  Aciliyet: {bidAnalysis.urgencyLevel?.toUpperCase()} — {bidAnalysis.bidStrategy}
                </div>
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-white text-sm font-medium mb-2">Rakipler</p>
                  {bidAnalysis.mainCompetitors?.map((c:string,i:number)=>(
                    <p key={i} className="text-slate-300 text-xs">• {c}</p>
                  ))}
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  {bidAnalysis.actionItems?.map((a:string,i:number)=>(
                    <p key={i} className="text-blue-300 text-xs">→ {a}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. Retargeting */}
        {tab==='retargeting' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><Target size={16} className="text-purple-400"/> Dynamic Retargeting Cycle</h2>
            <p className="text-slate-400 text-sm">Lead listesini Meta'ya yükle — Custom Audience oluştur — sadece tanıdığın kişilere reklam ver</p>
            <div className="grid lg:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Kitle Adı</label>
                <input value={retargetForm.audienceName} onChange={e=>setRetargetForm(p=>({...p,audienceName:e.target.value}))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"/>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Leadler ({selectedLeads.length} seçili)</label>
                <div className="flex gap-2">
                  <button onClick={()=>setSelectedLeads(leads.map(l=>l.id))}
                    className="px-3 py-2 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600">Tümünü Seç</button>
                  <button onClick={()=>setSelectedLeads([])}
                    className="px-3 py-2 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600">Temizle</button>
                </div>
              </div>
            </div>
            <button onClick={setupRetargeting} disabled={loading||!selectedLeads.length}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {loading?<RefreshCw size={14} className="animate-spin"/>:<Target size={14}/>}
              {loading?'Yükleniyor...':'Meta\'ya Yükle & Kitle Oluştur'}
            </button>
            {retargetingAudiences.length>0 && (
              <div className="space-y-2">
                <h3 className="text-white text-sm font-medium">Retargeting Kitleleri</h3>
                {retargetingAudiences.map((a:any)=>(
                  <div key={a.id} className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <p className="text-white text-sm">{a.audience_name}</p>
                      <p className="text-slate-400 text-xs">{a.size} kişi — {a.platform}</p>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}