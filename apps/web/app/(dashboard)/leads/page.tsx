'use client'
import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import {
  Search, Plus, Trash2, ExternalLink, Crosshair, RefreshCw,
  Download, Flame, Globe, ChevronDown, Copy, CheckCircle2, X,
  Instagram, Users, TrendingUp, Zap, Filter, SlidersHorizontal,
  Phone, Mail, MoreHorizontal,
} from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  contact_name?: string
  phone?: string
  email?: string
  instagram?: string
  facebook?: string
  linkedin_url?: string
  youtube?: string
  twitter?: string
  website?: string
  city?: string
  sector?: string
  source: string
  score: number
  ai_grade?: string
  hot_score?: number
  rating?: number
  review_count?: number
  status: string
  created_at: string
}

// ── Avatar gradient palette ────────────────────────────────────────────────────
const GRAD: [string, string][] = [
  ['#6366f1','#8b5cf6'], ['#3b82f6','#06b6d4'], ['#10b981','#14b8a6'],
  ['#f59e0b','#ef4444'], ['#8b5cf6','#ec4899'], ['#06b6d4','#6366f1'],
  ['#14b8a6','#10b981'], ['#f97316','#f59e0b'], ['#ec4899','#8b5cf6'],
  ['#22c55e','#3b82f6'],
]
function avatarGrad(name: string): [string, string] {
  return GRAD[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % GRAD.length]
}

// ── Score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 13, circ = 2 * Math.PI * r
  const dash = Math.min(score / 100, 1) * circ
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#6366f1' : score >= 30 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
      <svg width="32" height="32" viewBox="0 0 32 32" className="absolute -rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-bold relative z-10" style={{ color }}>{score}</span>
    </div>
  )
}

// ── Grade badge ────────────────────────────────────────────────────────────────
const GRADE_STYLE: Record<string, { bg: string; text: string }> = {
  A: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
  B: { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
  C: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
  D: { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
}

// ── Status system ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  new:       { label: 'Yeni',           color: 'rgba(99,102,241,0.18)', dot: '#818cf8' },
  contacted: { label: 'İletişimde',     color: 'rgba(245,158,11,0.18)', dot: '#fbbf24' },
  qualified: { label: 'Nitelikli',      color: 'rgba(6,182,212,0.18)',  dot: '#22d3ee' },
  replied:   { label: 'Cevap Verdi',    color: 'rgba(34,197,94,0.18)',  dot: '#4ade80' },
  offered:   { label: 'Teklif Verildi', color: 'rgba(168,85,247,0.18)', dot: '#c084fc' },
  won:       { label: 'Kazanıldı',      color: 'rgba(16,185,129,0.18)', dot: '#34d399' },
  lost:      { label: 'Kaybedildi',     color: 'rgba(239,68,68,0.18)',  dot: '#f87171' },
}
const STATUS_KEYS = ['new','contacted','qualified','replied','offered','won','lost']

function StatusPill({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CFG[status] || { label: status, color: 'rgba(255,255,255,0.08)', dot: '#94a3b8' }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: cfg.color }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
        <span style={{ color: cfg.dot }}>{cfg.label}</span>
        <ChevronDown size={9} style={{ color: cfg.dot, opacity: 0.7 }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#1a1d2a] border border-white/8 rounded-xl shadow-2xl py-1.5 min-w-[160px]">
          {STATUS_KEYS.map(s => {
            const c = STATUS_CFG[s]
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 transition-colors text-left">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                <span className={s === status ? 'font-semibold' : ''} style={{ color: s === status ? c.dot : '#94a3b8' }}>
                  {c.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Source badge ───────────────────────────────────────────────────────────────
function SourceTag({ source }: { source: string }) {
  const s = (source || '').toLowerCase()
  const cfg = s.includes('apify') || s.includes('google')
    ? { label: 'Google Maps', bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', dot: '#3b82f6' }
    : s.includes('osm')
    ? { label: 'OpenStreetMap', bg: 'rgba(34,197,94,0.12)', color: '#4ade80', dot: '#22c55e' }
    : s.includes('yelp')
    ? { label: 'Yelp', bg: 'rgba(239,68,68,0.12)', color: '#f87171', dot: '#ef4444' }
    : s.includes('here')
    ? { label: 'HERE', bg: 'rgba(6,182,212,0.12)', color: '#22d3ee', dot: '#06b6d4' }
    : s.includes('registry')
    ? { label: 'Sicil', bg: 'rgba(168,85,247,0.12)', color: '#c084fc', dot: '#a855f7' }
    : { label: source, bg: 'rgba(255,255,255,0.06)', color: '#64748b', dot: '#475569' }

  return (
    <span style={{ background: cfg.bg }} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap">
      <span className="w-1 h-1 rounded-full" style={{ background: cfg.dot }} />
      <span style={{ color: cfg.color }}>{cfg.label}</span>
    </span>
  )
}

// ── Social icons ───────────────────────────────────────────────────────────────
function FbSvg() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07z"/></svg> }
function LiSvg() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg> }
function YtSvg() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.6 12 3.6 12 3.6s-7.55 0-9.38.46A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 11.87 0 11.87s0 3.84.5 5.68a3.02 3.02 0 0 0 2.12 2.14C4.45 20.14 12 20.14 12 20.14s7.55 0 9.38-.45a3.02 3.02 0 0 0 2.12-2.14c.5-1.84.5-5.68.5-5.68s0-3.84-.5-5.68zM9.54 15.57V8.17l6.28 3.7-6.28 3.7z"/></svg> }
function TwSvg() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> }

function SocialLinks({ lead }: { lead: Lead }) {
  const items = [
    lead.facebook    && { href: lead.facebook,    icon: <FbSvg />,       bg: '#1877f2', title: 'Facebook' },
    lead.instagram   && { href: lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@','')}`, icon: <Instagram size={11} />, bg: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)', title: 'Instagram' },
    lead.youtube     && { href: lead.youtube,     icon: <YtSvg />,       bg: '#ff0000', title: 'YouTube' },
    lead.linkedin_url && { href: lead.linkedin_url, icon: <LiSvg />,     bg: '#0a66c2', title: 'LinkedIn' },
    lead.twitter     && { href: lead.twitter,     icon: <TwSvg />,       bg: '#000000', title: 'X/Twitter' },
  ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; bg: string; title: string }>

  if (!items.length) return <span className="text-[#2d3348] text-xs">—</span>

  return (
    <div className="flex items-center gap-1">
      {items.map(({ href, icon, bg, title }) => (
        <a key={title} href={href} target="_blank" rel="noreferrer" title={title}
          className="w-5 h-5 rounded-md flex items-center justify-center text-white/90 hover:opacity-85 transition-opacity shrink-0"
          style={{ background: bg }}>
          {icon}
        </a>
      ))}
    </div>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ value, className = '' }: { value: string; className?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(value).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1500) }}
      className={`opacity-0 group-hover/row:opacity-100 transition text-[#3d4458] hover:text-[#94a3b8] ml-1 ${className}`}>
      {ok ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#13151f] border border-white/8 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <button onClick={onCancel} className="text-[#3d4458] hover:text-[#94a3b8] transition"><X size={16} /></button>
        </div>
        <h3 className="text-white font-semibold text-base mb-1.5">Lead'leri Sil</h3>
        <p className="text-[#64748b] text-sm mb-6">
          <span className="text-white font-medium">{count} lead</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/8 text-[#94a3b8] rounded-xl text-sm font-medium transition">İptal</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500/90 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition">Sil</button>
        </div>
      </div>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, accent }: { icon: any; value: number | string; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#111318] border border-white/[0.06] rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div>
        <div className="text-white font-semibold text-base leading-none">{typeof value === 'number' ? value.toLocaleString('tr-TR') : value}</div>
        <div className="text-[#475569] text-xs mt-0.5">{label}</div>
      </div>
    </div>
  )
}

const PAGE_SIZES = [20, 50, 100]

// ── Main ───────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { t } = useI18n()

  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sector, setSector] = useState('')
  const [grade, setGrade] = useState('')
  const [sectors, setSectors] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<string[]>([])
  const [findingDM, setFindingDM] = useState<string | null>(null)
  const [bulkDmRunning, setBulkDmRunning] = useState(false)
  const [bulkDmProgress, setBulkDmProgress] = useState<{ completed: number; total: number } | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [list, setList] = useState('')
  const [lists, setLists] = useState<string[]>([])
  const [deleteModal, setDeleteModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if (search) p.set('search', search)
      if (status) p.set('status', status)
      if (sector) p.set('sector', sector)
      if (grade)  p.set('grade', grade)
      if (list)   p.set('list', list)
      const data = await api.get(`/api/leads?${p}`)
      setLeads(data.leads)
      setTotal(data.total)
    } catch { setLeads([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { api.get('/api/leads/sectors').then(d => setSectors(d.sectors || [])).catch(() => {}) }, [])
  useEffect(() => { api.get('/api/leads/lists').then(d => setLists(d.lists || [])).catch(() => {}) }, [])
  useEffect(() => { load() }, [page, pageSize, status, sector, grade, list])
  useEffect(() => { const t = setTimeout(load, 380); return () => clearTimeout(t) }, [search])

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const allSelected = leads.length > 0 && selected.length === leads.length

  const bulkDelete = async () => {
    await Promise.all(selected.map(id => api.delete(`/api/leads/${id}`)))
    setSelected([]); setDeleteModal(false); load()
  }

  const bulkStatus = async (newStatus: string) => {
    await api.post('/api/leads/bulk-status', { ids: selected, status: newStatus })
    setSelected([]); load()
  }

  const changeStatus = async (lead: Lead, newStatus: string) => {
    try {
      await api.patch(`/api/leads/${lead.id}`, { status: newStatus })
      setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))
    } catch (e: any) { showMsg('error', e.message) }
  }

  const findPhone = async (lead: Lead) => {
    setFindingDM(lead.id + '_ph')
    try {
      const data = await api.post('/api/persons/find-phone', { companyName: lead.company_name, website: lead.website || '', city: lead.city || '', leadId: lead.id })
      if (data.bestPhone) { showMsg('success', `${lead.company_name}: ${data.bestPhone}`); load() }
      else showMsg('error', `${lead.company_name}: Telefon bulunamadı`)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setFindingDM(null) }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const p = new URLSearchParams()
      if (selected.length > 0) { p.set('ids', selected.join(',')) }
      else { if (search) p.set('search', search); if (status) p.set('status', status); if (sector) p.set('sector', sector) }
      const token = localStorage.getItem('token') || ''
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
      const resp = await fetch(`${API}/api/leads/export?${p}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!resp.ok) throw new Error('Export başarısız')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `sovlo-leads-${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setExporting(false) }
  }

  const findDecisionMaker = async (lead: Lead) => {
    setFindingDM(lead.id)
    try {
      const data = await api.post('/api/decision-maker-finder/find', { leadId: lead.id })
      if (data.found > 0) { showMsg('success', `${lead.company_name}: Karar verici bulundu`); load() }
      else showMsg('error', `${lead.company_name}: Karar verici bulunamadı`)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setFindingDM(null) }
  }

  const bulkFindDMs = async () => {
    if (!selected.length) return
    setBulkDmRunning(true); setBulkDmProgress({ completed: 0, total: selected.length })
    try {
      const data = await api.post('/api/decision-maker-finder/bulk', { leadIds: selected })
      if (!data.jobId) throw new Error('Job başlatılamadı')
      const iv = setInterval(async () => {
        try {
          const job = await api.get(`/api/decision-maker-finder/job/${data.jobId}`)
          setBulkDmProgress({ completed: job.completed, total: job.total })
          if (job.status === 'done' || job.status === 'error') {
            clearInterval(iv); setBulkDmRunning(false); setBulkDmProgress(null); setSelected([]); load()
            const found = (job.results || []).filter((r: any) => r.found).length
            showMsg('success', `${found}/${job.total} firmada karar verici bulundu`)
          }
        } catch { clearInterval(iv); setBulkDmRunning(false) }
      }, 3000)
    } catch (e: any) { showMsg('error', e.message); setBulkDmRunning(false); setBulkDmProgress(null) }
  }

  const newToday = leads.filter(l => {
    const d = new Date(l.created_at)
    const today = new Date()
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }).length

  const totalPages = Math.ceil(total / pageSize)
  const hasFilters = !!(search || status || sector || grade || list)

  return (
    <div className="space-y-4 pb-8">
      {deleteModal && <DeleteModal count={selected.length} onConfirm={bulkDelete} onCancel={() => setDeleteModal(false)} />}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Lead Veritabanı</h1>
          <p className="text-[#475569] text-sm mt-0.5">{total.toLocaleString('tr-TR')} kayıt{hasFilters ? ' (filtrelendi)' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/8 border border-white/8 text-[#94a3b8] hover:text-white px-3.5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {selected.length > 0 ? `${selected.length} Lead` : 'Excel'}
          </button>
          <Link href="/decision-maker"
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/8 border border-white/8 text-[#94a3b8] hover:text-white px-3.5 py-2 rounded-xl text-sm font-medium transition">
            <Crosshair size={14} /> KV Bul
          </Link>
          <Link href="/leads/scrape"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <Plus size={14} /> Lead Topla
          </Link>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users}      value={total}    label="Toplam Lead"  accent="#6366f1" />
        <StatCard icon={Zap}        value={newToday} label="Bugün Eklenen" accent="#10b981" />
        <StatCard icon={TrendingUp} value={leads.filter(l=>l.status==='won').length}   label="Kazanılan"   accent="#f59e0b" />
        <StatCard icon={Flame}      value={leads.filter(l=>(l.hot_score||0)>=30).length} label="Sıcak Lead" accent="#ef4444" />
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
          msg.type === 'success' ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' : 'bg-red-500/8 border-red-500/20 text-red-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Search + filters ── */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4458]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Firma adı ara..."
              className="w-full bg-white/[0.04] border border-white/[0.06] hover:border-white/10 focus:border-[#6366f1]/50 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-[#3d4458] outline-none transition-colors" />
          </div>

          {/* Filter button */}
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition ${
              showFilters || hasFilters
                ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8]'
                : 'bg-white/[0.04] border-white/[0.06] text-[#64748b] hover:text-[#94a3b8]'
            }`}>
            <SlidersHorizontal size={13} />
            Filtrele
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] ml-0.5" />}
          </button>

          {/* Page size */}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
            <span className="text-[#475569] text-xs">Göster:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="bg-transparent text-[#94a3b8] text-sm outline-none cursor-pointer">
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.05]">
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5 text-sm text-[#94a3b8] outline-none">
              <option value="">Tüm Durumlar</option>
              {STATUS_KEYS.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
            </select>
            {sectors.length > 0 && (
              <select value={sector} onChange={e => { setSector(e.target.value); setPage(1) }}
                className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5 text-sm text-[#94a3b8] outline-none">
                <option value="">Tüm Sektörler</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={grade} onChange={e => { setGrade(e.target.value); setPage(1) }}
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5 text-sm text-[#94a3b8] outline-none">
              <option value="">Tüm Kaliteler</option>
              {['A','B','C','D'].map(g => <option key={g} value={g}>{g} Kalite</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setStatus(''); setSector(''); setGrade(''); setList(''); setPage(1) }}
                className="text-xs text-[#6366f1] hover:text-[#818cf8] transition px-2 py-1.5">
                Temizle
              </button>
            )}
          </div>
        )}

        {/* List pills */}
        {lists.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.05]">
            <span className="text-[#3d4458] text-xs">Liste:</span>
            {[{ label: 'Tümü', value: '' }, ...lists.map(l => ({ label: l, value: l }))].map(item => (
              <button key={item.value} onClick={() => { setList(item.value); setPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                  list === item.value
                    ? 'bg-[#6366f1]/15 border-[#6366f1]/30 text-[#818cf8]'
                    : 'bg-white/[0.03] border-white/[0.06] text-[#475569] hover:text-[#94a3b8]'
                }`}>
                {item.value ? `📁 ${item.label}` : item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk actions ── */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-[#6366f1]/8 border border-[#6366f1]/20 rounded-xl px-4 py-2.5 flex-wrap">
          <span className="text-[#818cf8] text-sm font-medium">{selected.length} lead seçili</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={bulkFindDMs} disabled={bulkDmRunning}
              className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-50">
              {bulkDmRunning ? <RefreshCw size={11} className="animate-spin" /> : <Crosshair size={11} />}
              {bulkDmRunning && bulkDmProgress ? `${bulkDmProgress.completed}/${bulkDmProgress.total}` : 'KV Bul'}
            </button>
            {(['contacted','won','lost'] as const).map(s => (
              <button key={s} onClick={() => bulkStatus(s)}
                className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-[#94a3b8] text-xs rounded-lg transition">
                → {STATUS_CFG[s]?.label}
              </button>
            ))}
            <button onClick={() => setDeleteModal(true)}
              className="px-3 py-1.5 bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 text-red-400 text-xs rounded-lg transition flex items-center gap-1.5">
              <Trash2 size={11} /> Sil
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid items-center gap-3 px-4 py-2.5 border-b border-white/[0.05] bg-[#111318]/60"
          style={{ gridTemplateColumns: '36px 2fr 1.2fr 1.3fr 100px 1fr 90px 120px 70px 36px' }}>
          <div>
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : leads.map(l => l.id))}
              className="accent-[#6366f1] w-3.5 h-3.5 rounded" />
          </div>
          {['FİRMA','TELEFON','E-POSTA','SOSYAL','KARAR VERİCİ','PUAN','DURUM','TARİH',''].map((h, i) => (
            <div key={i} className="text-[10px] font-semibold text-[#2d3348] uppercase tracking-widest">{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <Users size={20} className="text-[#3d4458]" />
            </div>
            <p className="text-[#3d4458] text-sm">Henüz lead yok</p>
            <Link href="/leads/scrape"
              className="text-[#6366f1] hover:text-[#818cf8] text-sm transition">Lead topla →</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {leads.map(lead => {
              const [g1, g2] = avatarGrad(lead.company_name)
              const initials = lead.company_name.slice(0, 2).toUpperCase()
              const grade = lead.ai_grade
              const gradeStyle = grade ? GRADE_STYLE[grade] : null
              const domain = lead.website
                ? lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
                : null

              return (
                <div key={lead.id}
                  className="group/row grid items-center gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors"
                  style={{ gridTemplateColumns: '36px 2fr 1.2fr 1.3fr 100px 1fr 90px 120px 70px 36px' }}>

                  {/* Checkbox */}
                  <input type="checkbox" checked={selected.includes(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="accent-[#6366f1] w-3.5 h-3.5 rounded opacity-40 group-hover/row:opacity-100 checked:opacity-100 transition-opacity" />

                  {/* Company */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium truncate leading-tight">{lead.company_name}</span>
                        {(lead.hot_score || 0) >= 30 && <Flame size={10} className="text-red-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {lead.city && <span className="text-[#3d4458] text-[10px]">{lead.city}</span>}
                        {lead.sector && (
                          <span className="text-[10px] text-[#3d4458] bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.04] truncate max-w-20">{lead.sector}</span>
                        )}
                      </div>
                      <div className="mt-1">
                        <SourceTag source={lead.source} />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    {lead.phone ? (
                      <div className="flex items-center">
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          className="text-[#94a3b8] hover:text-[#c7d2fe] text-sm font-mono transition-colors leading-tight">
                          {lead.phone}
                        </a>
                        <CopyBtn value={lead.phone} />
                      </div>
                    ) : (
                      <button onClick={() => findPhone(lead)} disabled={!!findingDM}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-[#475569] hover:text-[#94a3b8] text-xs rounded-lg transition disabled:opacity-50">
                        {findingDM === lead.id+'_ph' ? <RefreshCw size={9} className="animate-spin" /> : <Phone size={9} />}
                        Bul
                      </button>
                    )}
                    {domain && (
                      <a href={lead.website!.startsWith('http') ? lead.website! : `https://${lead.website}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-[#2d3348] hover:text-[#475569] text-[10px] mt-1 transition-colors">
                        <Globe size={8} /> {domain.slice(0, 20)}
                      </a>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    {lead.email ? (
                      <div className="flex items-center">
                        <a href={`mailto:${lead.email}`}
                          className="text-[#64748b] hover:text-[#94a3b8] text-xs transition-colors truncate max-w-40">
                          {lead.email}
                        </a>
                        <CopyBtn value={lead.email} />
                      </div>
                    ) : (
                      <span className="text-[#2d3348] text-xs">—</span>
                    )}
                    {lead.rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <span className="text-[#64748b] text-[10px]">{lead.rating.toFixed(1)}{lead.review_count ? ` (${lead.review_count})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Social */}
                  <SocialLinks lead={lead} />

                  {/* Decision Maker */}
                  <div>
                    {lead.contact_name ? (
                      <div>
                        <p className="text-[#c084fc] text-xs font-medium leading-tight">{lead.contact_name}</p>
                        {lead.email && <p className="text-[#3d4458] text-[10px] mt-0.5 truncate max-w-28">{lead.email}</p>}
                      </div>
                    ) : (
                      <button onClick={() => findDecisionMaker(lead)} disabled={!!findingDM}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/8 hover:bg-purple-500/15 border border-purple-500/15 text-[#7c3aed] hover:text-purple-300 text-xs rounded-lg transition disabled:opacity-50">
                        {findingDM === lead.id ? <RefreshCw size={9} className="animate-spin" /> : <Crosshair size={9} />}
                        KV Bul
                      </button>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2">
                    <ScoreRing score={lead.score} />
                    {gradeStyle && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: gradeStyle.bg, color: gradeStyle.text }}>
                        {grade}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <StatusPill status={lead.status} onChange={s => changeStatus(lead, s)} />

                  {/* Date */}
                  <div className="text-[#2d3348] text-[11px]">
                    {new Date(lead.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit' })}
                  </div>

                  {/* Link */}
                  <Link href={`/leads/${lead.id}`}
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity text-[#3d4458] hover:text-[#94a3b8]">
                    <ExternalLink size={13} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05] bg-[#111318]/40">
            <span className="text-[#3d4458] text-xs">
              {((page-1)*pageSize+1).toLocaleString('tr-TR')} – {Math.min(page*pageSize,total).toLocaleString('tr-TR')} / <span className="text-[#64748b]">{total.toLocaleString('tr-TR')}</span>
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: '«', action: () => setPage(1), disabled: page === 1 },
                { label: '‹', action: () => setPage(p => Math.max(1,p-1)), disabled: page === 1 },
                { label: '›', action: () => setPage(p => p+1), disabled: page >= totalPages },
                { label: '»', action: () => setPage(totalPages), disabled: page >= totalPages },
              ].map(({ label, action, disabled }) => (
                <button key={label} onClick={action} disabled={disabled}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-[#64748b] hover:text-white text-xs disabled:opacity-30 disabled:cursor-not-allowed transition">
                  {label}
                </button>
              ))}
              <span className="text-[#3d4458] text-xs px-2">{page} / {totalPages}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
