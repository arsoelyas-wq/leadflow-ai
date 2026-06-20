'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  RefreshCw, Phone, ExternalLink, TrendingUp, Trophy, BarChart3,
  AlertTriangle, Clock, User, ArrowRight, Target, Search,
  ChevronDown, PhoneCall, Globe, MapPin, Star, Zap,
  ArrowUpRight, Timer, ChevronRight, Filter, Layers,
} from 'lucide-react'

// ── Stage config ────────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'new',         label: 'Yeni Lead',   short: 'Yeni',     accent: '#94a3b8', dotClass: 'bg-slate-400',   gradient: 'from-slate-400/20 to-slate-400/5'  },
  { key: 'contacted',   label: 'İletişimde',  short: 'İletişim',  accent: '#60a5fa', dotClass: 'bg-blue-400',    gradient: 'from-blue-400/20 to-blue-400/5'    },
  { key: 'replied',     label: 'Cevap Verdi', short: 'Cevap',     accent: '#22d3ee', dotClass: 'bg-cyan-400',    gradient: 'from-cyan-400/20 to-cyan-400/5'    },
  { key: 'proposal',    label: 'Teklif',      short: 'Teklif',    accent: '#fbbf24', dotClass: 'bg-amber-400',   gradient: 'from-amber-400/20 to-amber-400/5'  },
  { key: 'negotiation', label: 'Pazarlık',    short: 'Pazarlık',  accent: '#fb923c', dotClass: 'bg-orange-400',  gradient: 'from-orange-400/20 to-orange-400/5'},
  { key: 'won',         label: 'Kazanıldı',   short: 'Kazandı',   accent: '#34d399', dotClass: 'bg-emerald-400', gradient: 'from-emerald-400/20 to-emerald-400/5'},
  { key: 'lost',        label: 'Kaybedildi',  short: 'Kaybetti',  accent: '#f87171', dotClass: 'bg-red-400',     gradient: 'from-red-400/20 to-red-400/5'      },
]

const STAGE_ORDER: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.key, i]))

// ── Helpers ─────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-amber-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600', 'bg-orange-600',
]
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h * 31
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(name: string) {
  return (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}
function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-blue-400'
  if (score >= 30) return 'text-amber-400'
  return 'text-slate-500'
}
function daysLabel(days: number) {
  if (days === 0) return 'Bugün'
  if (days === 1) return 'Dün'
  return `${days}g`
}

// ── Component ───────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { t } = useI18n()
  const [board, setBoard]             = useState<Record<string, any[]>>({})
  const [stageAnalytics, setAnalytics]= useState<Record<string, any>>({})
  const [stats, setStats]             = useState<any>(null)
  const [funnel, setFunnel]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [moving, setMoving]           = useState<string | null>(null)
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [view, setView]               = useState<'kanban' | 'funnel'>('kanban')
  const [search, setSearch]           = useState('')
  const [dragId, setDragId]           = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/pipeline/board')
      setBoard(data.board || {})
      setAnalytics(data.stageAnalytics || {})
      setStats(data.stats || null)
      setFunnel(data.funnel || [])
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

  // Drag & Drop
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
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/30 to-violet-600/30 border border-blue-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            {t('pipeline.title', 'Pipeline & Satış Takibi')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 ml-[42px]">Kartları sürükleyerek aşama değiştir</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/80 border border-slate-700 rounded-xl p-0.5">
            {(['kanban', 'funnel'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  v === view ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                }`}>
                {v === 'kanban' ? <><Layers size={13} /> Kanban</> : <><Filter size={13} /> Huni</>}
              </button>
            ))}
          </div>
          <button onClick={load}
            className="p-2.5 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium animate-[bounceIn_0.3s_ease-out] ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Lead',  value: stats.total,        sub: 'pipeline geneli',       Icon: BarChart3,  iconBg: 'bg-slate-500/15',   iconColor: 'text-slate-400'   },
            { label: 'Aktif Süreç',  value: stats.inProgress,   sub: 'işlem devam ediyor',    Icon: TrendingUp, iconBg: 'bg-blue-500/15',    iconColor: 'text-blue-400'    },
            { label: 'Kazanıldı',    value: stats.won,          sub: 'başarıyla kapandı',     Icon: Trophy,     iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
            { label: 'Win Rate',     value: `${stats.winRate}%`, sub: `${stats.lost} kaybedildi`, Icon: Target,  iconBg: 'bg-amber-500/15',   iconColor: 'text-amber-400'   },
          ].map(({ label, value, sub, Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 hover:border-slate-600 transition group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xl font-bold leading-tight">{value}</p>
                  <p className="text-slate-500 text-[11px]">{label}</p>
                </div>
              </div>
              <p className="text-slate-600 text-[10px] mt-2 ml-[52px]">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottleneck alert ── */}
      {stats?.bottleneck && stageAnalytics[stats.bottleneck]?.avgDays > 3 && (
        <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Timer size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-sm font-medium">Darboğaz Tespiti</p>
            <p className="text-amber-400/60 text-xs">
              <span className="font-semibold text-amber-400">{STAGES.find(s => s.key === stats.bottleneck)?.label}</span> aşamasında lead'ler ortalama{' '}
              <span className="font-semibold text-amber-400">{stageAnalytics[stats.bottleneck]?.avgDays} gün</span> bekliyor
            </p>
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Lead ara — firma adı veya kişi..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
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

        /* ═══════ Funnel View ═══════ */
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-lg">Dönüşüm Hunisi</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">Toplam: <span className="text-white font-semibold">{stats?.total || 0}</span></span>
              <span className="text-slate-500">Win: <span className="text-emerald-400 font-bold">{stats?.winRate || 0}%</span></span>
            </div>
          </div>

          <div className="space-y-4">
            {STAGES.slice(0, 6).map((stage, i) => {
              const analytics = stageAnalytics[stage.key] || {}
              const count   = analytics.count || 0
              const maxCount = Math.max(...STAGES.slice(0, 6).map(s => stageAnalytics[s.key]?.count || 0), 1)
              const pct     = Math.round((count / maxCount) * 100)
              const fe      = funnel.find((f: any) => f.stage === stage.key)
              const isBottleneck = stats?.bottleneck === stage.key

              return (
                <div key={stage.key} className={`p-4 rounded-xl border transition ${
                  isBottleneck ? 'border-amber-500/30 bg-amber-500/5' : 'border-transparent hover:bg-slate-700/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stage.dotClass}`} />
                      <span className="text-white font-semibold text-sm">{stage.label}</span>
                      {i > 0 && fe?.rate !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-lg">
                          <ArrowUpRight size={10} /> {fe.rate}% dönüşüm
                        </span>
                      )}
                      {isBottleneck && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                          <Timer size={10} /> Darboğaz
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {analytics.avgDays > 0 && (
                        <span className="text-[11px] text-slate-500">ort. {analytics.avgDays}g</span>
                      )}
                      <span className="text-white font-bold text-sm">{count}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/40 rounded-full h-3.5 overflow-hidden">
                    <div className="h-3.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 3 : 0)}%`,
                        background: `linear-gradient(90deg, ${stage.accent}cc, ${stage.accent}44)`,
                      }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary cards */}
          <div className="border-t border-slate-700/60 mt-6 pt-6 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Giriş',   value: stageAnalytics['new']?.count || 0,        color: 'text-slate-300'   },
              { label: 'Aktif',    value: stats?.inProgress || 0,                    color: 'text-blue-400'    },
              { label: 'Kazanıldı', value: stageAnalytics['won']?.count || 0,        color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/40 rounded-xl py-4">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      ) : (

        /* ═══════ Kanban Board ═══════ */
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1" style={{ minHeight: '520px' }}>
          {STAGES.map(stage => {
            const allCards   = board[stage.key] || []
            const cards      = filterCards(allCards)
            const isDrop     = dragOverCol === stage.key
            const analytics  = stageAnalytics[stage.key] || {}
            const isBottleneck = stats?.bottleneck === stage.key
            const rottenCnt  = allCards.filter(isRotten).length

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-[272px] flex flex-col rounded-2xl border transition-all duration-200 ${
                  isDrop ? 'border-blue-500/50 shadow-xl shadow-blue-500/10 scale-[1.01]'
                  : isBottleneck ? 'border-amber-500/30'
                  : 'border-slate-700/50'
                } bg-slate-800/30`}
                onDragOver={e => handleDragOver(e, stage.key)}
                onDrop={e => handleDrop(e, stage.key)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Accent bar */}
                <div className="h-[3px] rounded-t-2xl shrink-0"
                  style={{ background: `linear-gradient(90deg, ${stage.accent}cc 0%, ${stage.accent}11 100%)` }} />

                {/* Column header */}
                <div className="px-3.5 py-3 border-b border-slate-700/40 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.dotClass} shrink-0`} />
                      <span className="text-[13px] font-semibold text-white">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rottenCnt > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" />{rottenCnt}
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: `${stage.accent}15`, color: stage.accent }}>
                        {analytics.count || 0}
                      </span>
                    </div>
                  </div>
                  {/* Analytics bar */}
                  {(analytics.avgScore > 0 || analytics.avgDays > 0) && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                      {analytics.avgScore > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={9} className="text-slate-600" /> ort.{analytics.avgScore}
                        </span>
                      )}
                      {analytics.avgDays > 0 && (
                        <span className={`flex items-center gap-1 ${isBottleneck ? 'text-amber-400' : ''}`}>
                          <Clock size={9} /> {analytics.avgDays}g
                        </span>
                      )}
                      {analytics.hasMore && (
                        <span className="text-blue-400">+{(analytics.count || 0) - allCards.length} daha</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
                  {cards.length === 0 && (
                    <div className={`flex items-center justify-center h-20 rounded-xl border-2 border-dashed transition-all ${
                      isDrop ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-700/25'
                    }`}>
                      <p className="text-slate-600 text-xs">
                        {isDrop ? 'Buraya bırak' : allCards.length === 0 ? 'Buraya sürükle' : 'Sonuç yok'}
                      </p>
                    </div>
                  )}

                  {cards.map((lead: any) => {
                    const rotten     = isRotten(lead)
                    const isDragging = dragId === lead.id
                    const avBg       = avatarColor(lead.company_name || '')
                    const ins        = initials(lead.company_name || '')
                    const isExpanded = expandedCard === lead.id
                    const domain     = lead.website ? lead.website.replace(/^https?:\/\//, '').split('/')[0] : null

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setExpandedCard(isExpanded ? null : lead.id)}
                        className={`group bg-slate-800/80 border rounded-xl overflow-hidden select-none cursor-grab active:cursor-grabbing transition-all duration-150 ${
                          isDragging
                            ? 'opacity-20 scale-95'
                            : rotten
                            ? 'border-amber-500/25 hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-500/5 hover:-translate-y-0.5'
                            : 'border-slate-700/50 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/40 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="p-3">
                          {/* Row 1: Avatar + Name + Score */}
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${avBg} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                              {ins}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-[13px] font-semibold leading-snug truncate">{lead.company_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lead.sector && <p className="text-slate-500 text-[10px] truncate">{lead.sector}</p>}
                                {lead.city && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
                                    <MapPin size={8} /> {lead.city?.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(lead.score || 0) > 0 && (
                              <span className={`text-sm font-bold shrink-0 ${scoreColor(lead.score)}`}>{lead.score}</span>
                            )}
                          </div>

                          {/* Row 2: Contact info */}
                          {(lead.phone || domain) && (
                            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                              {lead.phone && (
                                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition truncate">
                                  <PhoneCall size={10} /> {lead.phone}
                                </a>
                              )}
                              {domain && (
                                <a href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`}
                                  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-400 transition truncate max-w-[110px]">
                                  <Globe size={9} /> {domain}
                                </a>
                              )}
                            </div>
                          )}

                          {/* Row 3: Badges */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                            <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              rotten ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-700/40 text-slate-500'
                            }`}>
                              <Clock className="w-2.5 h-2.5" /> {daysLabel(lead.daysInStage)}
                            </span>
                            {rotten && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                                <AlertTriangle className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {lead.contact_name && (
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
                                <User className="w-2.5 h-2.5 shrink-0" /> {lead.contact_name}
                              </span>
                            )}
                            <Link href={`/leads/${lead.id}`} onClick={e => e.stopPropagation()}
                              className="ml-auto opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-blue-400">
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Expanded: move buttons + WhatsApp */}
                          {isExpanded && (
                            <div className="mt-3 pt-2.5 border-t border-slate-700/40 space-y-2 animate-[bounceIn_0.2s_ease-out]">
                              {lead.phone && (
                                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                  target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition">
                                  <Phone size={11} /> WhatsApp
                                </a>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {nextStages(stage.key).map(s => (
                                  <button key={s.key}
                                    onClick={e => { e.stopPropagation(); moveLead(lead.id, s.key) }}
                                    disabled={moving === lead.id}
                                    className={`flex-1 flex items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] rounded-lg font-semibold transition-all disabled:opacity-40 min-w-0 ${
                                      s.key === 'won'
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                        : s.key === 'lost'
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                                        : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300 border border-slate-600/40'
                                    }`}
                                  >
                                    <ArrowRight className="w-2.5 h-2.5 shrink-0" /> {s.short}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Load more */}
                  {analytics.hasMore && !search && (
                    <button
                      onClick={() => showMsg('success', 'Tüm leadleri görmek için Lead Veritabanına gidin')}
                      className="w-full py-2.5 text-[11px] text-slate-500 hover:text-blue-400 border border-dashed border-slate-700/40 hover:border-blue-500/30 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <ChevronDown size={12} /> +{(analytics.count || 0) - allCards.length} daha göster
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 text-[11px] text-slate-600 pb-1 flex-wrap">
        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-400" /> 7+ gün bekliyor</span>
        <span className="flex items-center gap-1.5"><Timer className="w-3 h-3 text-amber-400" /> Darboğaz tespiti</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-blue-600 inline-flex items-center justify-center text-white text-[7px] font-bold">AB</span>
          Firma rengi otomatik
        </span>
        <span>Karta tıkla → aksiyonlar • Sürükle-bırak → aşama değiştir</span>
      </div>
    </div>
  )
}
