'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Kanban, RefreshCw, ArrowRight, Phone, Building2 } from 'lucide-react'

const STAGES = [
  { key: 'new', label: 'Yeni Lead', color: 'border-slate-500', bg: 'bg-slate-500/10' },
  { key: 'contacted', label: 'İletişimde', color: 'border-blue-500', bg: 'bg-blue-500/10' },
  { key: 'replied', label: 'Cevap Verdi', color: 'border-cyan-500', bg: 'bg-cyan-500/10' },
  { key: 'proposal', label: 'Teklif', color: 'border-yellow-500', bg: 'bg-yellow-500/10' },
  { key: 'negotiation', label: 'Pazarlık', color: 'border-orange-500', bg: 'bg-orange-500/10' },
  { key: 'won', label: 'Kazanıldı ✓', color: 'border-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'lost', label: 'Kaybedildi', color: 'border-red-500', bg: 'bg-red-500/10' },
]

export default function PipelinePage() {
  const [board, setBoard] = useState<Record<string, any[]>>({})
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState<string|null>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),4000) }

  const load = async () => {
    setLoading(true)
    try {
      const [b, s] = await Promise.allSettled([
        api.get('/api/pipeline/board'),
        api.get('/api/pipeline/stats'),
      ])
      if (b.status==='fulfilled') setBoard(b.value.board||{})
      if (s.status==='fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const moveLead = async (leadId: string, newStage: string) => {
    setMoving(leadId)
    try {
      await api.patch('/api/pipeline/move', { leadId, newStage })
      showMsg('success', `Lead ${STAGES.find(s=>s.key===newStage)?.label} aşamasına taşındı`)
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setMoving(null) }
  }

  const sourceIcon: Record<string, string> = {
    google_maps: '🗺️', instagram: '📸', facebook: '📘',
    tiktok: '🎵', referral: '🤝', manual: '✍️',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Kanban size={24} className="text-blue-400"/> Pipeline & Satış Takibi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Leadleri aşamalar arasında taşı — her geçişte otomatik mesaj gönderilir</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
          <RefreshCw size={14}/> Yenile
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:'Toplam',value:stats.total,color:'text-white'},
            {label:'Aktif',value:stats.inProgress||stats.total-stats.won-stats.lost,color:'text-blue-400'},
            {label:'Kazanıldı',value:stats.won,color:'text-emerald-400'},
            {label:'Kaybedildi',value:stats.lost,color:'text-red-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      {loading ? <div className="flex justify-center h-32 items-center"><RefreshCw size={24} className="animate-spin text-slate-400"/></div> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage=>(
            <div key={stage.key} className={`flex-shrink-0 w-64 rounded-xl border ${stage.color} ${stage.bg} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-sm font-medium">{stage.label}</p>
                <span className="text-slate-400 text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                  {board[stage.key]?.length || 0}
                </span>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {(board[stage.key] || []).map(lead=>(
                  <div key={lead.id} className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <p className="text-white text-xs font-medium leading-tight">{lead.company_name}</p>
                      <span className="text-xs flex-shrink-0">{sourceIcon[lead.source]||'📍'}</span>
                    </div>
                    {lead.phone && (
                      <p className="text-slate-400 text-xs flex items-center gap-1 mb-2">
                        <Phone size={9}/> {lead.phone}
                      </p>
                    )}
                    {lead.ai_grade && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${lead.ai_grade==='A'?'bg-emerald-500/20 text-emerald-300':lead.ai_grade==='B'?'bg-blue-500/20 text-blue-300':'bg-slate-600 text-slate-400'}`}>
                        {lead.ai_grade}
                      </span>
                    )}
                    {/* Aşama değiştir */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STAGES.filter(s=>s.key!==stage.key).slice(0,3).map(s=>(
                        <button key={s.key} onClick={()=>moveLead(lead.id, s.key)}
                          disabled={moving===lead.id}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-xs rounded transition">
                          <ArrowRight size={8}/> {s.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}