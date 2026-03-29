'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Radar, RefreshCw, Search, TrendingUp, AlertTriangle, Info, Zap } from 'lucide-react'

const SECTORS = ['Mobilya','Tekstil','İnşaat','Gıda','Elektronik','Otomotiv','Turizm','Tarım']

export default function CrisisRadarPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [analysis, setAnalysis] = useState('')
  const [sector, setSector] = useState('Mobilya')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [autoSectors, setAutoSectors] = useState<string[]>(['Mobilya'])
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [a, s] = await Promise.allSettled([api.get('/api/crisis/alerts'), api.get('/api/crisis/stats')])
      if (a.status==='fulfilled') setAlerts(a.value.alerts||[])
      if (s.status==='fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const scan = async () => {
    setScanning(true)
    setAnalysis('')
    try {
      const data = await api.get(`/api/crisis/scan?sector=${encodeURIComponent(sector)}`)
      setAlerts(prev => [...(data.alerts||[]), ...prev].slice(0,30))
      setAnalysis(data.analysis||'')
      showMsg('success', `${data.total} gelişme tespit edildi`)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setScanning(false) }
  }

  const saveAutoScan = async () => {
    try {
      await api.post('/api/crisis/auto-scan', { sectors: autoSectors, active: true })
      showMsg('success', 'Otomatik tarama kaydedildi!')
    } catch (e:any) { showMsg('error', e.message) }
  }

  const typeIcon = (type: string) => type==='opportunity' ? '🟢' : type==='crisis' ? '🔴' : '🔵'
  const typeColor = (type: string) => type==='opportunity' ? 'text-emerald-400' : type==='crisis' ? 'text-red-400' : 'text-blue-400'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radar size={24} className="text-orange-400"/> Kriz & Fırsat Radarı
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Sektörünüzdeki gelişmeleri 7/24 izle — AI ile strateji önerileri al</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Toplam Gelişme',value:stats.total,color:'text-white'},
            {label:'Fırsatlar',value:stats.opportunities,color:'text-emerald-400'},
            {label:'Riskler',value:stats.crises,color:'text-red-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Manuel Tarama */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">🔍 Manuel Tarama</h2>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Sektör</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SECTORS.map(s=>(
                <button key={s} onClick={()=>setSector(s)}
                  className={`px-2 py-1 text-xs rounded-lg border transition ${sector===s?'bg-orange-600 border-orange-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={scan} disabled={scanning}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {scanning?<RefreshCw size={14} className="animate-spin"/>:<Search size={14}/>}
            {scanning?'Taranıyor...':'Şimdi Tara'}
          </button>
          {analysis && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-orange-300 text-xs font-medium mb-2">🤖 AI Strateji Önerisi</p>
              <p className="text-white text-sm">{analysis}</p>
            </div>
          )}
        </div>

        {/* Otomatik Tarama */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">⚡ Otomatik Tarama (Her 6 Saat)</h2>
          <div className="flex flex-wrap gap-1.5">
            {SECTORS.map(s=>(
              <button key={s} onClick={()=>setAutoSectors(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}
                className={`px-2 py-1 text-xs rounded-lg border transition ${autoSectors.includes(s)?'bg-blue-600 border-blue-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={saveAutoScan}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
            <Zap size={14}/> Otomatik Taramayı Kaydet
          </button>
        </div>
      </div>

      {/* Alarmlar */}
      <div className="space-y-2">
        <h2 className="text-white font-semibold">📡 Son Gelişmeler ({alerts.length})</h2>
        {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
        : alerts.length===0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
            <Radar size={36} className="text-slate-600 mx-auto mb-2"/>
            <p className="text-slate-400">Henüz gelişme tespit edilmedi</p>
          </div>
        ) : alerts.map((alert, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{typeIcon(alert.type)}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${typeColor(alert.type)}`}>{alert.title}</p>
              <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                <span>{alert.sector}</span>
                {alert.scanned_at && <span>{new Date(alert.scanned_at).toLocaleDateString('tr-TR')}</span>}
              </div>
            </div>
            {alert.link && (
              <a href={alert.link} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 text-xs hover:underline flex-shrink-0">Habere Git →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}