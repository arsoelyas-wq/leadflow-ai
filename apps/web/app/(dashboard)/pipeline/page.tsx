'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  RefreshCw, Phone, Flame, ExternalLink,
  TrendingUp, Trophy, BarChart3, AlertTriangle,
  Clock, User, ArrowRight, Target, Search,
} from 'lucide-react'

// ── Stage config ───────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'new',         label: 'Yeni Lead',   short: 'Yeni',      accent: '#94a3b8', dot: 'bg-slate-400',   badgeBg: 'bg-slate-500/15 text-slate-300'    },
  { key: 'contacted',   label: 'İletişimde',  short: 'İletişim',  accent: '#60a5fa', dot: 'bg-blue-400',    badgeBg: 'bg-blue-500/15 text-blue-300'      },
  { key: 'replied',     label: 'Cevap Verdi', short: 'Cevap',     accent: '#22d3ee', dot: 'bg-cyan-400',    badgeBg: 'bg-cyan-500/15 text-cyan-300'      },
  { key: 'proposal',    label: 'Teklif',      short: 'Teklif',    accent: '#fbbf24', dot: 'bg-amber-400',   badgeBg: 'bg-amber-500/15 text-amber-300'    },
  { key: 'negotiation', label: 'Pazarlık',    short: 'Pazarlık',  accent: '#fb923c', dot: 'bg-orange-400',  badgeBg: 'bg-orange-500/15 text-orange-300'  },
  { key: 'won',         label: 'Kazanıldı',   short: 'Kazandı',   accent: '#34d399', dot: 'bg-emerald-400', badgeBg: 'bg-emerald-500/15 text-emerald-300' },
  { key: 'lost',        label: 'Kaybedildi',  short: 'Kaybetti',  accent: '#f87171', dot: 'bg-red-400',     badgeBg: 'bg-red-500/15 text-red-300'        },
]

const STAGE_ORDER: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.key, i]))

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  B: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  C: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  D: 'bg-red-500/15 text-red-300 border-red-500/25',
}

const SOURCE_EMOJI: Record<string, string> = {
  google_maps: '🗺', instagram: '📷', facebook: '📘',
  tiktok: '🎵', referral: '🤝', manual: '✍', apify: '🤖',
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-amber-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-orange-600', 'bg-pink-600', 'bg-teal-600',
]

function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h * 31
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [board, setBoard]             = useState<Record<string, any[]>>({})
  const [stats, setStats]             = useState<any>(null)
  const [funnel, setFunnel]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [moving, setMoving]           = useState<string | null>(null)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [view, setView]               = useState<'kanban' | 'funnel'>('kanban')
  const [search, setSearch]           = useState('')
  const [dragId, setDragId]           = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/pipeline/board')
      setBoard(data.board || {}); setStats(data.stats || null); setFunnel(data.funnel || [])
    } catch (e: any) { showMsg('error', e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const moveLead = async (leadId: string, newStage: string) => {
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
    } catch (e: any) { showMsg('error', e.message); load() }
    finally { setMoving(null) }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.effectAllowed = 'move'; setDragId(id) }
  const handleDragOver  = (e: React.DragEvent, col: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col) }
  const handleDrop      = (e: React.DragEvent, col: string) => { e.preventDefault(); setDragOverCol(null); if (dragId) moveLead(dragId, col); setDragId(null) }
  const handleDragEnd   = () => { setDragId(null); setDragOverCol(null) }

  const nextStages = (cur: string) => {
    const idx = STAGE_ORDER[cur] ?? 0
    const fwd  = STAGES.filter(s => STAGE_ORDER[s.key] > idx && !['won','lost'].includes(s.key)).slice(0, 2)
    const term = STAGES.filter(s => ['won','lost'].includes(s.key) && s.key !== cur)
    return [...fwd, ...term]
  }

  const isRotten   = (lead: any) => lead.daysInStage > 7 && !['won','lost'].includes(lead.status)
  const filterCards = (cards: any[]) => !search ? cards : cards.filter(c =>
    (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            Pipeline & Satış Takibi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 ml-10">Kartları sürükleyerek aşama değiştir — workflow otomatik tetiklenir</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/80 border border-slate-700 rounded-xl p-1">
            {(['kanban', 'funnel'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${v === view ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                {v === 'kanban' ? '⊞ Kanban' : '▽ Huni'}
              </button>
            ))}
          </div>
          <button onClick={load}
            className="p-2 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Toplam Lead',  value: stats.total,        sub: 'pipeline geneli',  Icon: BarChart3,  iconCls: 'text-slate-400',   bgCls: 'bg-slate-700/60'      },
            { label: 'Aktif Deal',   value: stats.inProgress,   sub: 'işlem devam ediyor', Icon: TrendingUp, iconCls: 'text-blue-400',  bgCls: 'bg-blue-500/15'       },
            { label: 'Kazanıldı',    value: stats.won,          sub: 'başarıyla kapandı', Icon: Trophy,    iconCls: 'text-emerald-400', bgCls: 'bg-emerald-500/15'    },
            { label: 'Win Rate',     value: `%${stats.winRate}`, sub: `${stats.lost} kaybedildi`, Icon: Target, iconCls: 'text-amber-400', bgCls: 'bg-amber-500/15' },
          ].map(({ label, value, sub, Icon, iconCls, bgCls }) => (
            <div key={label} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3 hover:border-slate-600 transition group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgCls} group-hover:scale-105 transition-transform`}>
                <Icon className={`w-5 h-5 ${iconCls}`} />
              </div>
              <div>
                <p className="text-white text-xl font-bold leading-tight">{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
                <p className="text-slate-600 text-[10px]">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Lead ara — firma adı veya kişi..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-800/60 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg leading-none">×</button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : view === 'funnel' ? (

        /* ── Funnel View ── */
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white font-bold text-lg">Dönüşüm Hunisi</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">Toplam: <span className="text-white font-semibold">{stats?.total || 0} lead</span></span>
              <span className="text-slate-500">Win rate: <span className="text-emerald-400 font-bold">%{stats?.winRate || 0}</span></span>
            </div>
          </div>
          <div className="space-y-5">
            {STAGES.slice(0, 6).map((stage, i) => {
              const count    = board[stage.key]?.length || 0
              const maxCount = Math.max(...STAGES.slice(0, 6).map(s => board[s.key]?.length || 0), 1)
              const pct      = Math.round((count / maxCount) * 100)
              const fe       = funnel.find(f => f.stage === stage.key)
              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                      <span className="text-slate-200 font-medium">{stage.label}</span>
                      {i > 0 && fe?.rate !== undefined && (
                        <span className="text-xs text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-lg">{fe.rate}% dönüşüm</span>
                      )}
                    </div>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full transition-all duration-700 ${stage.dot}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-slate-700/60 mt-8 pt-6 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Giriş (Yeni)',  value: board['new']?.length || 0,  color: 'text-slate-300' },
              { label: 'Aktif Süreç',   value: stats?.inProgress || 0,     color: 'text-blue-400'  },
              { label: 'Kazanıldı',     value: board['won']?.length || 0,  color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/40 rounded-xl py-4">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      ) : (

        /* ── Kanban Board ── */
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '560px' }}>
          {STAGES.map(stage => {
            const allCards   = board[stage.key] || []
            const cards      = filterCards(allCards)
            const isDrop     = dragOverCol === stage.key
            const rottenCnt  = allCards.filter(isRotten).length
            const avgScore   = allCards.length ? Math.round(allCards.reduce((s: number, c: any) => s + (c.score || 0), 0) / allCards.length) : 0

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-[268px] flex flex-col rounded-2xl border transition-all duration-200 ${
                  isDrop ? 'border-blue-500/50 shadow-xl shadow-blue-500/10 scale-[1.008]' : 'border-slate-700/60'
                } bg-slate-800/40 backdrop-blur-sm`}
                onDragOver={e => handleDragOver(e, stage.key)}
                onDrop={e => handleDrop(e, stage.key)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Accent bar */}
                <div className="h-[3px] rounded-t-2xl flex-shrink-0"
                  style={{ background: `linear-gradient(90deg, ${stage.accent}dd 0%, ${stage.accent}22 100%)` }} />

                {/* Column header */}
                <div className="px-3.5 py-3 border-b border-slate-700/50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.dot} flex-shrink-0`} />
                      <span className="text-[13px] font-semibold text-white">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rottenCnt > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400 text-[11px] font-medium">
                          <AlertTriangle className="w-3 h-3" />{rottenCnt}
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${stage.badgeBg}`}>
                        {allCards.length}
                      </span>
                    </div>
                  </div>
                  {/* Avg score bar */}
                  {avgScore > 0 && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-slate-700/50 rounded-full h-1 overflow-hidden">
                        <div className="h-1 rounded-full bg-slate-500/80 transition-all duration-500"
                          style={{ width: `${Math.min(avgScore, 100)}%` }} />
                      </div>
                      <span className="text-slate-600 text-[10px] shrink-0">ort.{avgScore}</span>
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-2.5 space-y-2 overflow-y-auto" style={{ maxHeight: '580px' }}>
                  {cards.length === 0 && (
                    <div className={`flex items-center justify-center h-20 rounded-xl border-2 border-dashed transition-all ${
                      isDrop ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-700/30'
                    }`}>
                      <p className="text-slate-600 text-xs">
                        {isDrop ? 'Buraya bırak' : allCards.length === 0 ? 'Buraya sürükle' : 'Arama sonucu yok'}
                      </p>
                    </div>
                  )}

                  {cards.map((lead: any) => {
                    const rotten     = isRotten(lead)
                    const isDragging = dragId === lead.id
                    const hot        = (lead.hot_score || 0)
                    const avBg       = avatarColor(lead.company_name || '')
                    const ins        = initials(lead.company_name || '')

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`group bg-slate-800 border rounded-xl overflow-hidden select-none cursor-grab active:cursor-grabbing transition-all duration-150 ${
                          isDragging
                            ? 'opacity-25 scale-95 shadow-none'
                            : rotten
                            ? 'border-orange-500/30 hover:border-orange-500/60 hover:shadow-md hover:shadow-orange-500/10 hover:-translate-y-0.5'
                            : 'border-slate-700/60 hover:border-slate-500/80 hover:shadow-lg hover:shadow-slate-900/60 hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Hot stripe */}
                        {hot >= 50 && (
                          <div className="h-[2px] bg-gradient-to-r from-red-500 via-orange-400 to-transparent" />
                        )}

                        <div className="p-3">
                          {/* Avatar + name */}
                          <div className="flex items-start gap-2.5 mb-2.5">
                            <div className={`w-8 h-8 rounded-lg ${avBg} flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5`}>
                              {ins}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-[13px] font-semibold leading-snug truncate">{lead.company_name}</p>
                              {lead.sector && <p className="text-slate-500 text-[10px] truncate">{lead.sector}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {hot >= 30 && (
                                <Flame className={`w-3.5 h-3.5 ${hot >= 60 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
                              )}
                              {lead.source && <span className="text-[11px]">{SOURCE_EMOJI[lead.source] || ''}</span>}
                              <Link href={`/leads/${lead.id}`} onClick={e => e.stopPropagation()}
                                className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-blue-400 ml-0.5">
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>

                          {/* Contact */}
                          {(lead.contact_name || lead.phone) && (
                            <div className="space-y-1 mb-2.5">
                              {lead.contact_name && (
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3 h-3 text-slate-600 shrink-0" />
                                  <p className="text-slate-400 text-[11px] truncate">{lead.contact_name}</p>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                                    <p className="text-slate-400 text-[11px] truncate">{lead.phone}</p>
                                  </div>
                                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                    target="_blank" rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="opacity-0 group-hover:opacity-100 transition shrink-0 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                    WA
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Score bar */}
                          {(lead.score || 0) > 0 && (
                            <div className="mb-2.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-600">Skor</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{lead.score}</span>
                              </div>
                              <div className="w-full bg-slate-700/50 rounded-full h-1 overflow-hidden">
                                <div className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                                  style={{ width: `${Math.min(lead.score, 100)}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Badges */}
                          <div className="flex items-center gap-1 flex-wrap mb-2.5">
                            {lead.ai_grade && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold ${GRADE_STYLE[lead.ai_grade] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                                {lead.ai_grade}
                              </span>
                            )}
                            <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              rotten ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-700/60 text-slate-500'
                            }`}>
                              <Clock className="w-2.5 h-2.5" />
                              {lead.daysInStage === 0 ? 'Bugün' : `${lead.daysInStage}g`}
                            </span>
                            {rotten && (
                              <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-medium">
                                <AlertTriangle className="w-2.5 h-2.5" /> Bekliyor
                              </span>
                            )}
                          </div>

                          {/* Move buttons */}
                          <div className="flex flex-wrap gap-1">
                            {nextStages(stage.key).map(s => (
                              <button key={s.key}
                                onClick={() => moveLead(lead.id, s.key)}
                                disabled={moving === lead.id}
                                className={`flex items-center gap-0.5 px-2 py-1 text-[10px] rounded-lg font-semibold transition-all disabled:opacity-40 ${
                                  s.key === 'won'
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20'
                                    : s.key === 'lost'
                                    ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20'
                                    : 'bg-slate-700/70 hover:bg-slate-600 text-slate-300 border border-slate-600/50'
                                }`}
                              >
                                <ArrowRight className="w-2.5 h-2.5" /> {s.short}
                              </button>
                            ))}
                          </div>
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
      <div className="flex items-center gap-5 text-xs text-slate-600 pb-1">
        <span className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-red-400" /> Sıcak lead</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-orange-400" /> 7+ gün bekliyor</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-blue-600 inline-flex items-center justify-center text-white text-[8px] font-bold">AB</span>
          Şirket rengi otomatik
        </span>
        <span>Kartları sürükle → bırak ile aşama değiştir</span>
      </div>
    </div>
  )
}
