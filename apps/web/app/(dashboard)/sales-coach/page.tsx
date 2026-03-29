'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { GraduationCap, Play, RefreshCw, Star, TrendingUp, AlertTriangle, CheckCircle, Zap } from 'lucide-react'

export default function SalesCoachPage() {
  const [reports, setReports] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [weeklyReport, setWeeklyReport] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedLead, setSelectedLead] = useState('')
  const [agentName, setAgentName] = useState('')
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [r, l, s, w, ld] = await Promise.allSettled([
        api.get('/api/coaching/reports'),
        api.get('/api/coaching/leaderboard'),
        api.get('/api/coaching/stats'),
        api.get('/api/coaching/weekly-report'),
        api.get('/api/leads?limit=100'),
      ])
      if (r.status==='fulfilled') setReports(r.value.reports||[])
      if (l.status==='fulfilled') setLeaderboard(l.value.leaderboard||[])
      if (s.status==='fulfilled') setStats(s.value)
      if (w.status==='fulfilled') setWeeklyReport(w.value)
      if (ld.status==='fulfilled') setLeads(ld.value.leads||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const analyze = async () => {
    if (!selectedLead) return
    setAnalyzing(true)
    try {
      const data = await api.post('/api/coaching/analyze', { leadId: selectedLead, agentName })
      showMsg('success', 'Analiz tamamlandı!')
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setAnalyzing(false) }
  }

  const analyzeBatch = async () => {
    setAnalyzing(true)
    try {
      await api.post('/api/coaching/analyze-batch', { agentName, limit: 10 })
      showMsg('success', '10 konuşma analiz ediliyor...')
      setTimeout(load, 15000)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setAnalyzing(false) }
  }

  const scoreColor = (s: number) => s >= 8 ? 'text-emerald-400' : s >= 6 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap size={24} className="text-purple-400"/> Satış Koçu & Denetçi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">WhatsApp + tüm kanal konuşmalarını AI ile analiz et — patron için rapor</p>
        </div>
        <button onClick={analyzeBatch} disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {analyzing?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>}
          {analyzing?'Analiz ediliyor...':'10 Konuşma Analiz Et'}
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {label:'Toplam Analiz',value:stats.total,color:'text-white'},
            {label:'Ortalama Skor',value:`${stats.avgScore}/10`,color:'text-yellow-400'},
            {label:'Başarılı',value:stats.positive,color:'text-emerald-400'},
            {label:'Kaybedilen',value:stats.negative,color:'text-red-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Haftalık Rapor */}
      {weeklyReport?.totalAnalyzed > 0 && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-400"/> Haftalık Özet
          </h2>
          <div className="grid lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-1">Ortalama Skor</p>
              <p className={`text-2xl font-bold ${scoreColor(weeklyReport.avgScore)}`}>{weeklyReport.avgScore}/10</p>
            </div>
            {weeklyReport.topMissedOpportunity && (
              <div className="lg:col-span-2">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><AlertTriangle size={10}/> En Çok Kaçırılan Fırsat</p>
                <p className="text-white text-sm">{weeklyReport.topMissedOpportunity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tek Analiz */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-sm">🔍 Tek Konuşma Analiz</h2>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Lead Seç</label>
            <select value={selectedLead} onChange={e=>setSelectedLead(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500">
              <option value="">Lead seçin</option>
              {leads.map(l=><option key={l.id} value={l.id}>{l.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Satış Temsilcisi Adı</label>
            <input value={agentName} onChange={e=>setAgentName(e.target.value)}
              placeholder="Ahmet, Mehmet..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"/>
          </div>
          <button onClick={analyze} disabled={analyzing||!selectedLead}
            className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
            {analyzing?<RefreshCw size={12} className="animate-spin"/>:<Play size={12}/>}
            Analiz Et
          </button>
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-3">🏆 Satış Sıralaması</h2>
          {leaderboard.length===0 ? <p className="text-slate-400 text-xs">Henüz analiz yok</p> :
          leaderboard.map((agent, i) => (
            <div key={agent.name} className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
              <span className={`text-sm font-bold ${i===0?'text-yellow-400':i===1?'text-slate-300':'text-slate-500'}`}>#{i+1}</span>
              <div className="flex-1">
                <p className="text-white text-xs font-medium">{agent.name}</p>
                <p className="text-slate-400 text-xs">{agent.totalAnalyzed} analiz</p>
              </div>
              <span className={`text-sm font-bold ${scoreColor(agent.avgScore)}`}>{agent.avgScore}/10</span>
            </div>
          ))}
        </div>

        {/* Son Raporlar */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-3">📋 Son Analizler</h2>
          {loading ? <RefreshCw size={16} className="animate-spin text-slate-400"/> :
          reports.length===0 ? <p className="text-slate-400 text-xs">Analiz yok</p> :
          reports.slice(0,5).map(r => (
            <div key={r.id} className="py-2 border-b border-slate-700 last:border-0">
              <div className="flex items-center justify-between">
                <p className="text-white text-xs font-medium truncate">{r.leads?.company_name}</p>
                <span className={`text-xs font-bold ${scoreColor(r.analysis_score)}`}>{r.analysis_score}/10</span>
              </div>
              {r.missed_opportunity && (
                <p className="text-red-400 text-xs mt-0.5 truncate">⚠️ {r.missed_opportunity}</p>
              )}
              {r.suggestion && (
                <p className="text-blue-400 text-xs mt-0.5 truncate">💡 {r.suggestion}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}