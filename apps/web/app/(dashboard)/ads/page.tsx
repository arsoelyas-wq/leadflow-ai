'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Megaphone, RefreshCw, Plus, Play, Pause, AlertTriangle, TrendingUp, Users, Zap, CheckCircle, Eye, Target, BarChart3, Link } from 'lucide-react'

const OBJECTIVES = [
  { key: 'OUTCOME_LEADS', label: 'Lead Toplama', icon: '🎯' },
  { key: 'OUTCOME_TRAFFIC', label: 'Web Trafiği', icon: '🌐' },
  { key: 'OUTCOME_AWARENESS', label: 'Marka Bilinirliği', icon: '📢' },
  { key: 'OUTCOME_SALES', label: 'Satış', icon: '💰' },
]

export default function AdsPage() {
  const [stats, setStats] = useState<any>(null)
  const [connection, setConnection] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [monitoring, setMonitoring] = useState(false)
  const [fetchingLeads, setFetchingLeads] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [adCopy, setAdCopy] = useState<any>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const [form, setForm] = useState({ name:'', objective:'OUTCOME_LEADS', dailyBudget:'100', targetCountries:['TR'], targetAgeMin:25, targetAgeMax:55 })
  const [copyForm, setCopyForm] = useState({ product:'', sector:'', target:'işletme sahipleri', platform:'Meta' })

  const searchParams = useSearchParams()
  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),6000) }

  // Meta OAuth callback — code'u exchange et
  useEffect(() => {
    const code = searchParams.get('meta_code')
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (code) {
      api.post('/api/ads/exchange-token', { code })
        .then(data => {
          showMsg('success', `${data.userName} — Meta hesabı bağlandı!`)
          load()
          // URL'den code'u temizle
          window.history.replaceState({}, '', '/ads')
        })
        .catch(e => showMsg('error', e.message))
    }
    if (success === 'meta_connected') showMsg('success', 'Meta hesabı bağlandı!')
    if (error) showMsg('error', 'Meta bağlantısı başarısız')
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, camp] = await Promise.allSettled([
        api.get('/api/ads/stats'),
        api.get('/api/ads/connection'),
        api.get('/api/ads/my-campaigns'),
      ])
      if (s.status==='fulfilled') setStats(s.value)
      if (c.status==='fulfilled') {
        setConnection(c.value)
        if (c.value.adAccounts?.[0]) setSelectedAccount(c.value.adAccounts[0].id)
      }
      if (camp.status==='fulfilled') setCampaigns(camp.value.campaigns||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const connectMeta = async () => {
    try {
      const data = await api.get('/api/ads/oauth-url')
      window.location.href = data.url
    } catch (e:any) { showMsg('error', e.message) }
  }

  const analyzeCampaigns = async () => {
    if (!selectedAccount) return
    setAnalyzing(true)
    try {
      const data = await api.get(`/api/ads/analyze/${selectedAccount}`)
      setAnalysis(data.analysis)
      setCampaigns(data.campaigns||[])
      showMsg('success', `${data.total} kampanya analiz edildi`)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setAnalyzing(false) }
  }

  const monitorCampaigns = async () => {
    if (!selectedAccount) return
    setMonitoring(true)
    try {
      const data = await api.get(`/api/ads/monitor/${selectedAccount}`)
      setAlerts(data.alerts||[])
      showMsg('success', `${data.monitored} kampanya izlendi, ${data.alerts?.length||0} uyarı`)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setMonitoring(false) }
  }

  const fetchLeads = async () => {
    if (!selectedAccount) return
    setFetchingLeads(true)
    try {
      const data = await api.get(`/api/ads/leads/${selectedAccount}`)
      showMsg('success', `${data.leadsAdded} yeni lead eklendi!`)
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setFetchingLeads(false) }
  }

  const createCampaign = async () => {
    if (!selectedAccount||!form.name) return
    setCreating(true)
    try {
      const data = await api.post('/api/ads/create-campaign', { ...form, adAccountId: selectedAccount })
      showMsg('success', data.message)
      setShowCreate(false)
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const generateCopy = async () => {
    setGenerating(true)
    try {
      const data = await api.post('/api/ads/generate-copy', copyForm)
      setAdCopy(data.copy)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setGenerating(false) }
  }

  const severityColor: Record<string,string> = {
    critical: 'bg-red-500/20 border-red-500/30 text-red-300',
    high: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
    medium: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
    positive: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone size={24} className="text-blue-400"/> AI Reklam Yöneticisi
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Meta hesabınızı bağlayın — AI analiz, optimizasyon, 7/24 izleme ve lead çıkarma</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Bağlantı Durumu */}
      {!connection?.connected ? (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">📘</div>
          <h2 className="text-white text-xl font-bold mb-2">Meta Reklam Hesabını Bağla</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Facebook & Instagram reklam hesabınızı bağlayın. AI kampanyalarınızı analiz etsin, optimize etsin ve leadleri otomatik çeksin.</p>
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            {[
              {icon:'🔍',label:'AI Analiz'},
              {icon:'⚡',label:'Optimizasyon'},
              {icon:'👥',label:'Lead Çıkarma'},
            ].map(({icon,label})=>(
              <div key={label} className="bg-slate-900 rounded-xl p-3 text-center">
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-slate-400 text-xs">{label}</p>
              </div>
            ))}
          </div>
          <button onClick={connectMeta}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition mx-auto">
            <Link size={16}/> Meta Hesabını Bağla
          </button>
        </div>
      ) : (
        <>
          {/* Bağlı — Dashboard */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 flex items-center gap-4">
            <CheckCircle size={20} className="text-emerald-400 flex-shrink-0"/>
            <div className="flex-1">
              <p className="text-white font-medium">{connection.userName} — Meta Bağlı</p>
              <p className="text-slate-400 text-xs">{connection.adAccounts?.length} reklam hesabı</p>
            </div>
            {connection.adAccounts?.length > 1 && (
              <select value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs">
                {connection.adAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-3">
              {[
                {label:'Kampanya',value:stats.totalCampaigns,color:'text-white',icon:'📢'},
                {label:'Aktif',value:stats.activeCampaigns,color:'text-emerald-400',icon:'▶️'},
                {label:'Uyarı',value:stats.totalAlerts,color:'text-yellow-400',icon:'⚠️'},
                {label:'Kritik',value:stats.criticalAlerts,color:'text-red-400',icon:'🚨'},
                {label:'Reklam Leadi',value:stats.leadsFromAds,color:'text-blue-400',icon:'👥'},
              ].map(({label,value,color,icon})=>(
                <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                  <p className="text-lg mb-1">{icon}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-slate-400 text-xs">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button onClick={analyzeCampaigns} disabled={analyzing||!selectedAccount}
              className="flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {analyzing?<RefreshCw size={14} className="animate-spin"/>:<BarChart3 size={14}/>}
              {analyzing?'Analiz...':'AI Analiz Et'}
            </button>
            <button onClick={monitorCampaigns} disabled={monitoring||!selectedAccount}
              className="flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {monitoring?<RefreshCw size={14} className="animate-spin"/>:<Eye size={14}/>}
              {monitoring?'İzleniyor...':'7/24 İzle'}
            </button>
            <button onClick={fetchLeads} disabled={fetchingLeads||!selectedAccount}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {fetchingLeads?<RefreshCw size={14} className="animate-spin"/>:<Users size={14}/>}
              {fetchingLeads?'Çekiliyor...':'Lead Çek'}
            </button>
            <button onClick={()=>setShowCreate(!showCreate)}
              className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
              <Plus size={14}/> Kampanya Oluştur
            </button>
          </div>

          {/* AI Analiz Sonucu */}
          {analysis && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-400"/> AI Kampanya Analizi
              </h2>
              <div className="grid lg:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${analysis.overallScore>=7?'text-emerald-400':analysis.overallScore>=5?'text-yellow-400':'text-red-400'}`}>
                    {analysis.overallScore}/10
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Genel Skor</p>
                </div>
                <div className="lg:col-span-2">
                  <p className="text-slate-300 text-sm">{analysis.summary}</p>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {analysis.issues?.length > 0 && (
                  <div>
                    <p className="text-red-400 text-xs font-medium mb-2">⚠️ Sorunlar</p>
                    <ul className="space-y-1">
                      {analysis.issues.map((i: string, idx: number) => (
                        <li key={idx} className="text-slate-300 text-xs flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5">•</span>{i}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.recommendations?.length > 0 && (
                  <div>
                    <p className="text-blue-400 text-xs font-medium mb-2">💡 Öneriler</p>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((r: string, idx: number) => (
                        <li key={idx} className="text-slate-300 text-xs flex items-start gap-1.5">
                          <span className="text-blue-400 mt-0.5">•</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uyarılar */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-400"/> Uyarılar ({alerts.length})
              </h2>
              {alerts.map((alert, i) => (
                <div key={i} className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${severityColor[alert.severity]||severityColor.medium}`}>
                  <span className="text-lg flex-shrink-0">
                    {alert.severity==='critical'?'🚨':alert.severity==='high'?'⚠️':alert.severity==='positive'?'✅':'ℹ️'}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{alert.name}</p>
                    <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Kampanya Oluştur */}
          {showCreate && (
            <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">📢 Yeni Kampanya</h2>
              <div className="grid lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Kampanya Adı *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                    placeholder="Mobilya Kampanyası Nisan 2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Günlük Bütçe (USD) *</label>
                  <input type="number" value={form.dailyBudget} onChange={e=>setForm(p=>({...p,dailyBudget:e.target.value}))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Hedef</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {OBJECTIVES.map(obj=>(
                    <button key={obj.key} onClick={()=>setForm(p=>({...p,objective:obj.key}))}
                      className={`p-3 rounded-lg border text-center transition ${form.objective===obj.key?'bg-blue-600/20 border-blue-500 text-white':'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
                      <p className="text-xl mb-1">{obj.icon}</p>
                      <p className="text-xs">{obj.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createCampaign} disabled={creating||!form.name}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                  {creating?<RefreshCw size={14} className="animate-spin"/>:<Plus size={14}/>}
                  {creating?'Oluşturuluyor...':'Kampanya Oluştur'}
                </button>
                <button onClick={()=>setShowCreate(false)} className="px-4 py-2.5 bg-slate-700 text-slate-300 text-sm rounded-xl">İptal</button>
              </div>
            </div>
          )}

          {/* Kampanya Listesi */}
          {campaigns.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-white font-semibold">📋 Kampanyalar ({campaigns.length})</h2>
              {campaigns.map((camp: any) => {
                const ins = camp.insights?.data?.[0] || {}
                return (
                  <div key={camp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm">{camp.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${camp.status==='ACTIVE'?'bg-emerald-500/20 text-emerald-300':'bg-slate-700 text-slate-400'}`}>
                          {camp.status==='ACTIVE'?'Aktif':'Pasif'}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                        {ins.impressions && <span className="text-blue-400">{parseInt(ins.impressions).toLocaleString()} gösterim</span>}
                        {ins.clicks && <span className="text-green-400">{ins.clicks} tıklama</span>}
                        {ins.ctr && <span className="text-yellow-400">CTR: %{parseFloat(ins.ctr).toFixed(2)}</span>}
                        {ins.spend && <span className="text-red-400">${ins.spend} harcama</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}