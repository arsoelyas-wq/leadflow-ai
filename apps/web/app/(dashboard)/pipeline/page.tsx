'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  Kanban, RefreshCw, Phone, Flame, ChevronRight,
  TrendingUp, Trophy, XCircle, BarChart3, ArrowRight,
  AlertTriangle, Clock, User, ExternalLink,
} from 'lucide-react'

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'new',         label: 'Yeni Lead',    short: 'Yeni',      color: 'border-slate-500',   bg: 'bg-slate-500/8',   dot: 'bg-slate-400'   },
  { key: 'contacted',   label: 'İletişimde',   short: 'İletişim',  color: 'border-blue-500',    bg: 'bg-blue-500/8',    dot: 'bg-blue-400'    },
  { key: 'replied',     label: 'Cevap Verdi',  short: 'Cevap',     color: 'border-cyan-500',    bg: 'bg-cyan-500/8',    dot: 'bg-cyan-400'    },
  { key: 'proposal',    label: 'Teklif',       short: 'Teklif',    color: 'border-yellow-500',  bg: 'bg-yellow-500/8',  dot: 'bg-yellow-400'  },
  { key: 'negotiation', label: 'Pazarlık',     short: 'Pazarlık',  color: 'border-orange-500',  bg: 'bg-orange-500/8',  dot: 'bg-orange-400'  },
  { key: 'won',         label: 'Kazanıldı ✓',  short: 'Kazanıldı', color: 'border-emerald-500', bg: 'bg-emerald-500/8', dot: 'bg-emerald-400' },
  { key: 'lost',        label: 'Kaybedildi',   short: 'Kaybetti',  color: 'border-red-500',     bg: 'bg-red-500/8',     dot: 'bg-red-400'     },
]

const STAGE_ORDER: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.key, i]))

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-300',
  B: 'bg-blue-500/20 text-blue-300',
  C: 'bg-yellow-500/20 text-yellow-300',
  D: 'bg-red-500/20 text-red-300',
}

const SOURCE_ICON: Record<string, string> = {
  google_maps: '🗺️', instagram: '📸', facebook: '📘',
  tiktok: '🎵', referral: '🤝', manual: '✍️', apify: '🤖',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [board, setBoard]       = useState<Record<string, any[]>>({})
  const [stats, setStats]       = useState<any>(null)
  const [funnel, setFunnel]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [moving, setMoving]     = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [view, setView]         = useState<'kanban' | 'funnel'>('kanban')

  // Drag state
  const [dragId, setDragId]       = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/pipeline/board')
      setBoard(data.board || {})
      setStats(data.stats || null)
      setFunnel(data.funnel || [])
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const moveLead = async (leadId: string, newStage: string) => {
    // Optimistic update
    const fromStage = Object.keys(board).find(k => board[k].some((l: any) => l.id === leadId))
    if (!fromStage || fromStage === newStage) return
    const lead = board[fromStage].find((l: any) => l.id === leadId)
    if (!lead) return

    setBoard(prev => ({
      ...prev,
      [fromStage]: prev[fromStage].filter((l: any) => l.id !== leadId),
      [newStage]:  [{ ...lead, status: newStage, daysInStage: 0 }, ...(prev[newStage] || [])],
    }))

    setMoving(leadId)
    try {
      await api.patch('/api/pipeline/move', { leadId, newStage })
      showMsg('success', `→ ${STAGES.find(s => s.key === newStage)?.label}`)
    } catch (e: any) {
      showMsg('error', e.message)
      load() // revert on error
    } finally {
      setMoving(null)
    }
  }

  // ── HTML5 Drag & Drop ────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragId(leadId)
  }

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(colKey)
  }

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    setDragOverCol(null)
    if (dragId) moveLead(dragId, colKey)
    setDragId(null)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverCol(null)
  }

  // ── Forward-only stage buttons ────────────────────────────────────────────
  const nextStages = (currentKey: string) => {
    const idx = STAGE_ORDER[currentKey] ?? 0
    const forward = STAGES.filter(s => STAGE_ORDER[s.key] > idx && s.key !== 'won' && s.key !== 'lost').slice(0, 2)
    const terminals = STAGES.filter(s => (s.key === 'won' || s.key === 'lost') && s.key !== currentKey)
    return [...forward, ...terminals]
  }

  // ── Rot warning (>7 days in stage, not won/lost) ──────────────────────────
  const isRotten = (lead: any) =>
    lead.daysInStage > 7 && !['won', 'lost'].includes(lead.status)

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Kanban size={22} className="text-blue-400" /> Pipeline & Satış Takibi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Kartları sürükleyerek aşama değiştir — otomatik akış tetiklenir</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            {(['kanban', 'funnel'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {v === 'kanban' ? '⊞ Kanban' : '▽ Huni'}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* ── Revenue Stats ── */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Toplam Lead',  value: stats.total,      color: 'text-white',        icon: <BarChart3 size={16} className="text-slate-400" /> },
            { label: 'Aktif Deal',   value: stats.inProgress, color: 'text-blue-400',     icon: <TrendingUp size={16} className="text-blue-400" /> },
            { label: 'Kazanıldı',    value: stats.won,        color: 'text-emerald-400',  icon: <Trophy size={16} className="text-emerald-400" /> },
            { label: `Win Rate %${stats.winRate}`, value: stats.lost + ' kaybedildi', color: 'text-slate-300', icon: <XCircle size={16} className="text-red-400" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
              <div>
                <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : view === 'funnel' ? (

        /* ── Conversion Funnel View ── */
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-sm mb-4">Dönüşüm Hunisi</h2>
          {STAGES.slice(0, 6).map((stage, i) => {
            const count = board[stage.key]?.length || 0
            const total = board['new']?.length || 1
            const pct = Math.round((count / (total || 1)) * 100)
            const funnelEntry = funnel.find(f => f.stage === stage.key)
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-slate-300 text-sm">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {i > 0 && funnelEntry && (
                      <span className="text-slate-500">
                        {funnelEntry.rate}% dönüşüm
                      </span>
                    )}
                    <span className="text-white font-semibold w-6 text-right">{count}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${stage.dot} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                </div>
              </div>
            )
          })}
          <div className="border-t border-slate-700 pt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Toplam Yeni: {board['new']?.length || 0}</span>
            <span className="text-emerald-400 font-medium">
              Toplam Kazanılan: {board['won']?.length || 0}
              {stats?.winRate > 0 && ` (%${stats.winRate} win rate)`}
            </span>
          </div>
        </div>

      ) : (

        /* ── Kanban Board ── */
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '520px' }}>
          {STAGES.map(stage => {
            const cards = board[stage.key] || []
            const isDropTarget = dragOverCol === stage.key
            const rottenCount = cards.filter(isRotten).length

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-[240px] rounded-xl border-2 transition-all duration-150 flex flex-col ${
                  isDropTarget
                    ? `${stage.color} bg-slate-700/30 scale-[1.01] shadow-lg`
                    : `border-slate-700 bg-slate-800/40`
                }`}
                onDragOver={e => handleDragOver(e, stage.key)}
                onDrop={e => handleDrop(e, stage.key)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Column header */}
                <div className={`px-3 py-2.5 rounded-t-xl border-b border-slate-700 ${stage.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                      <p className="text-white text-xs font-semibold">{stage.label}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rottenCount > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400 text-xs">
                          <AlertTriangle size={10} /> {rottenCount}
                        </span>
                      )}
                      <span className="text-slate-400 text-xs bg-slate-900/50 px-1.5 py-0.5 rounded-full font-medium">
                        {cards.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[560px]">
                  {cards.length === 0 && (
                    <div className={`flex items-center justify-center h-16 rounded-lg border-2 border-dashed transition ${
                      isDropTarget ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/50'
                    }`}>
                      <p className="text-slate-600 text-xs">Buraya sürükle</p>
                    </div>
                  )}

                  {cards.map((lead: any) => {
                    const rotten = isRotten(lead)
                    const isDragging = dragId === lead.id

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-slate-800 rounded-xl p-3 border transition-all duration-150 select-none group cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? 'opacity-30 scale-95'
                            : rotten
                            ? 'border-orange-500/50 hover:border-orange-500/80'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {/* Card top row */}
                        <div className="flex items-start gap-1.5 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold leading-tight truncate">
                              {lead.company_name}
                            </p>
                            {lead.sector && (
                              <p className="text-slate-500 text-[10px] truncate mt-0.5">{lead.sector}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {(lead.hot_score || 0) >= 30 && (
                              <Flame size={11} className="text-red-400" />
                            )}
                            <span className="text-[10px]">{SOURCE_ICON[lead.source] || '📍'}</span>
                            <Link href={`/leads/${lead.id}`}
                              onClick={e => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-white">
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                        </div>

                        {/* Contact info */}
                        {lead.contact_name && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <User size={9} className="text-slate-500 shrink-0" />
                            <p className="text-slate-400 text-[10px] truncate">{lead.contact_name}</p>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <Phone size={9} className="text-slate-500 shrink-0" />
                            <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-slate-400 hover:text-green-400 text-[10px] transition">
                              {lead.phone}
                            </a>
                          </div>
                        )}

                        {/* Badges row */}
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                          {lead.ai_grade && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${GRADE_COLOR[lead.ai_grade] || 'bg-slate-700 text-slate-400'}`}>
                              {lead.ai_grade}
                            </span>
                          )}
                          {/* Days in stage */}
                          <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded ${
                            rotten
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-slate-700 text-slate-500'
                          }`}>
                            <Clock size={8} />
                            {lead.daysInStage === 0 ? 'Bugün' : `${lead.daysInStage}g`}
                            {rotten && ' ⚠️'}
                          </span>
                        </div>

                        {/* Rotten warning */}
                        {rotten && (
                          <p className="text-orange-400 text-[9px] mb-2 leading-tight">
                            {lead.daysInStage} gündür bu aşamada — aksiyon al!
                          </p>
                        )}

                        {/* Forward-only stage buttons */}
                        <div className="flex flex-wrap gap-1">
                          {nextStages(stage.key).map(s => (
                            <button
                              key={s.key}
                              onClick={() => moveLead(lead.id, s.key)}
                              disabled={moving === lead.id}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded transition disabled:opacity-40 font-medium ${
                                s.key === 'won'
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400'
                                  : s.key === 'lost'
                                  ? 'bg-red-500/15 hover:bg-red-500/30 text-red-400'
                                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                              }`}
                            >
                              <ArrowRight size={7} /> {s.short}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
        <span className="flex items-center gap-1"><Flame size={11} className="text-red-400" /> Sıcak lead</span>
        <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-orange-400" /> 7+ gün bekliyor</span>
        <span>Kartları sürükle → bırak ile aşama değiştir</span>
      </div>
    </div>
  )
}
