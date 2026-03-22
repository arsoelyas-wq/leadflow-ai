'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Workflow, Play, Square, RefreshCw, Zap, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function WorkflowPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState('cold_outreach')
  const [starting, setStarting] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [e, t, s, l] = await Promise.allSettled([
        api.get('/api/workflow/list'),
        api.get('/api/workflow/types'),
        api.get('/api/workflow/stats'),
        api.get('/api/leads?limit=100&status=new'),
      ])
      if (e.status==='fulfilled') setEnrollments(e.value.enrollments||[])
      if (t.status==='fulfilled') setTypes(t.value.types||[])
      if (s.status==='fulfilled') setStats(s.value)
      if (l.status==='fulfilled') setLeads(l.value.leads||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const startBatch = async () => {
    if (!selectedLeads.length && !confirm('Tüm yeni leadler için workflow başlatılsın mı?')) return
    setStarting(true)
    try {
      const data = await api.post('/api/workflow/start-batch', {
        leadIds: selectedLeads.length ? selectedLeads : undefined,
        workflowType: selectedType,
      })
      showMsg('success', data.message)
      setTimeout(load, 2000)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setStarting(false) }
  }

  const stopWorkflow = async (id:string) => {
    try {
      await api.delete(`/api/workflow/${id}`)
      showMsg('success', 'Workflow durduruldu')
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const statusIcon: Record<string,any> = {
    active: <Clock size={14} className="text-blue-400"/>,
    completed: <CheckCircle size={14} className="text-emerald-400"/>,
    failed: <XCircle size={14} className="text-red-400"/>,
    cancelled: <XCircle size={14} className="text-slate-400"/>,
  }

  const statusColor: Record<string,string> = {
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Workflow size={24} className="text-purple-400"/> Otonom Workflow Engine
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Lead gelince otomatik workflow başlat — sıfır insan müdahalesi</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {label:'Aktif',value:stats.active,color:'text-blue-400'},
            {label:'Tamamlanan',value:stats.completed,color:'text-emerald-400'},
            {label:'Başarısız',value:stats.failed,color:'text-red-400'},
            {label:'Toplam',value:stats.total,color:'text-white'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Workflow Başlat */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">🚀 Workflow Başlat</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Workflow Tipi</label>
            <select value={selectedType} onChange={e=>setSelectedType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              {types.map(t=><option key={t.key} value={t.key}>{t.name} ({t.steps} adım)</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Lead Seç ({selectedLeads.length} seçili — boş bırakırsan tüm yeni leadler)</label>
            <div className="max-h-28 overflow-y-auto bg-slate-900 rounded-lg p-2 space-y-1">
              {leads.slice(0,30).map(l=>(
                <label key={l.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedLeads.includes(l.id)}
                    onChange={e=>setSelectedLeads(prev=>e.target.checked?[...prev,l.id]:prev.filter(id=>id!==l.id))}
                    className="accent-purple-500"/>
                  <span className="text-white text-xs truncate">{l.company_name}</span>
                  {l.phone && <span className="text-slate-500 text-xs">{l.phone}</span>}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button onClick={startBatch} disabled={starting}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {starting?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>}
          {starting?'Başlatılıyor...':selectedLeads.length?`${selectedLeads.length} Lead İçin Başlat`:'Tüm Yeni Leadler İçin Başlat'}
        </button>
      </div>

      {/* Workflow Listesi */}
      <div className="space-y-2">
        <h2 className="text-white font-semibold">Aktif & Geçmiş Workflow'lar ({enrollments.length})</h2>
        {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
        : enrollments.length===0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
            <Workflow size={36} className="text-slate-600 mx-auto mb-2"/>
            <p className="text-slate-400">Henüz workflow yok</p>
          </div>
        ) : enrollments.map(e=>(
          <div key={e.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3 flex items-center gap-4">
            {statusIcon[e.status]}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{e.leads?.company_name}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>{types.find(t=>t.key===e.workflow_type)?.name||e.workflow_type}</span>
                <span>Adım {e.current_step+1}</span>
                {e.next_step_at && e.status==='active' && <span>Sonraki: {new Date(e.next_step_at).toLocaleDateString('tr-TR')}</span>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[e.status]||statusColor.cancelled}`}>
              {e.status==='active'?'Aktif':e.status==='completed'?'Tamamlandı':e.status==='failed'?'Başarısız':'İptal'}
            </span>
            {e.status==='active' && (
              <button onClick={()=>stopWorkflow(e.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                <Square size={13}/>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}