'use client'
import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import {
  Search, Plus, Trash2, ExternalLink, Crosshair, RefreshCw,
  Download, Flame, Globe, ChevronDown, Copy, CheckCircle2, X,
  Instagram, Users, TrendingUp, Zap, SlidersHorizontal,
  Phone, Star, MapPin,
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

// ── Avatar color palette ───────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#eef2ff', text: '#4338ca' },
  { bg: '#f0fdf4', text: '#15803d' },
  { bg: '#fff7ed', text: '#c2410c' },
  { bg: '#fdf4ff', text: '#7e22ce' },
  { bg: '#ecfdf5', text: '#065f46' },
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#f0f9ff', text: '#0369a1' },
  { bg: '#f7fee7', text: '#3f6212' },
]
function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length]
}

// ── Score badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const c = score >= 75
    ? { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
    : score >= 50
    ? { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' }
    : score >= 30
    ? { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }
    : { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {score}
    </span>
  )
}

// ── Status system ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  new:       { label: 'Yeni',           bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', border: '#bfdbfe' },
  contacted: { label: 'İletişimde',     bg: '#fffbeb', text: '#92400e', dot: '#f59e0b', border: '#fde68a' },
  qualified: { label: 'Nitelikli',      bg: '#ecfeff', text: '#155e75', dot: '#06b6d4', border: '#a5f3fc' },
  replied:   { label: 'Cevap Verdi',    bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', border: '#bbf7d0' },
  offered:   { label: 'Teklif Verildi', bg: '#fdf4ff', text: '#7e22ce', dot: '#a855f7', border: '#e9d5ff' },
  won:       { label: 'Kazanıldı',      bg: '#dcfce7', text: '#14532d', dot: '#16a34a', border: '#86efac' },
  lost:      { label: 'Kaybedildi',     bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', border: '#fecaca' },
}
const STATUS_KEYS = ['new','contacted','qualified','replied','offered','won','lost']

function StatusPill({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CFG[status] || { label: status, bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', border: '#e2e8f0' }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap"
        style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
        {cfg.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[165px]">
          {STATUS_KEYS.map(s => {
            const c = STATUS_CFG[s]
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                <span style={{ color: s === status ? c.text : '#64748b' }} className={s === status ? 'font-semibold' : ''}>
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

// ── Source tag ─────────────────────────────────────────────────────────────────
function SourceTag({ source }: { source: string }) {
  const s = (source || '').toLowerCase()
  const c = s.includes('apify') || s.includes('google')
    ? { label: 'Google Maps', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
    : s.includes('osm')
    ? { label: 'OpenStreetMap', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
    : s.includes('yelp')
    ? { label: 'Yelp', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
    : s.includes('here')
    ? { label: 'HERE', bg: '#ecfeff', text: '#155e75', border: '#a5f3fc' }
    : s.includes('registry')
    ? { label: 'Sicil', bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' }
    : { label: source, bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {c.label}
    </span>
  )
}

// ── Social icons ───────────────────────────────────────────────────────────────
function FbSvg() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07z"/></svg> }
function LiSvg() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg> }
function YtSvg() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.6 12 3.6 12 3.6s-7.55 0-9.38.46A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 11.87 0 11.87s0 3.84.5 5.68a3.02 3.02 0 0 0 2.12 2.14C4.45 20.14 12 20.14 12 20.14s7.55 0 9.38-.45a3.02 3.02 0 0 0 2.12-2.14c.5-1.84.5-5.68.5-5.68s0-3.84-.5-5.68zM9.54 15.57V8.17l6.28 3.7-6.28 3.7z"/></svg> }
function TwSvg() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> }

function SocialLinks({ lead }: { lead: Lead }) {
  const items = [
    lead.facebook     && { href: lead.facebook, icon: <FbSvg />, bg: '#1877f2', title: 'Facebook' },
    lead.instagram    && { href: lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@','')}`, icon: <Instagram size={10} />, bg: '#e1306c', title: 'Instagram' },
    lead.youtube      && { href: lead.youtube, icon: <YtSvg />, bg: '#ff0000', title: 'YouTube' },
    lead.linkedin_url && { href: lead.linkedin_url, icon: <LiSvg />, bg: '#0a66c2', title: 'LinkedIn' },
    lead.twitter      && { href: lead.twitter, icon: <TwSvg />, bg: '#000000', title: 'X' },
  ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; bg: string; title: string }>

  if (!items.length) return <span className="text-slate-300 text-sm">—</span>
  return (
    <div className="flex items-center gap-1">
      {items.map(({ href, icon, bg, title }) => (
        <a key={title} href={href} target="_blank" rel="noreferrer" title={title}
          className="w-5 h-5 rounded flex items-center justify-center text-white hover:opacity-80 transition-opacity"
          style={{ background: bg }}>
          {icon}
        </a>
      ))}
    </div>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(value).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1500) }}
      className="opacity-0 group-hover/row:opacity-100 transition ml-1 text-slate-400 hover:text-slate-600">
      {ok ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Trash2 size={16} className="text-red-500" />
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition"><X size={16} /></button>
        </div>
        <h3 className="text-slate-900 font-semibold text-base mb-1.5">Lead'leri Sil</h3>
        <p className="text-slate-500 text-sm mb-6">
          <span className="text-slate-900 font-medium">{count} lead</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">İptal</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition">Sil</button>
        </div>
      </div>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, accent, iconBg }: { icon: any; value: number | string; label: string; accent: string; iconBg: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:shadow-sm transition-shadow">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div>
        <div className="text-slate-900 font-bold text-xl leading-none">{typeof value === 'number' ? value.toLocaleString('tr-TR') : value}</div>
        <div className="text-slate-500 text-xs mt-0.5">{label}</div>
      </div>
    </div>
  )
}

const PAGE_SIZES = [20, 50, 100]

// ── Main page ──────────────────────────────────────────────────────────────────
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
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
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
      setLeads(data.leads); setTotal(data.total)
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
    const d = new Date(l.created_at); const today = new Date()
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }).length

  const totalPages = Math.ceil(total / pageSize)
  const hasFilters = !!(search || status || sector || grade || list)

  return (
    <div className="space-y-5 pb-8">
      {deleteModal && <DeleteModal count={selected.length} onConfirm={bulkDelete} onCancel={() => setDeleteModal(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lead Veritabanı</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total.toLocaleString('tr-TR')} kayıt{hasFilters ? ' · filtrelendi' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 shadow-sm cursor-pointer">
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {selected.length > 0 ? `${selected.length} Lead` : 'Excel'}
          </button>
          <Link href="/decision-maker"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium transition shadow-sm">
            <Crosshair size={14} /> KV Bul
          </Link>
          <Link href="/leads/scrape"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <Plus size={14} /> Lead Topla
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users}      value={total}    label="Toplam Lead"   accent="#4f46e5" iconBg="#eef2ff" />
        <StatCard icon={Zap}        value={newToday} label="Bugün Eklenen"  accent="#16a34a" iconBg="#f0fdf4" />
        <StatCard icon={TrendingUp} value={leads.filter(l=>l.status==='won').length}   label="Kazanılan"    accent="#d97706" iconBg="#fffbeb" />
        <StatCard icon={Flame}      value={leads.filter(l=>(l.hot_score||0)>=30).length} label="Sıcak Lead" accent="#dc2626" iconBg="#fef2f2" />
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
          msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Search + filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Firma adı ara..."
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 text-sm placeholder-slate-400 outline-none transition-all" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm border font-medium transition cursor-pointer ${
              showFilters || hasFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}>
            <SlidersHorizontal size={13} />
            Filtrele
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
          </button>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-slate-500 text-xs">Göster:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="bg-transparent text-slate-700 text-sm outline-none cursor-pointer">
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none cursor-pointer">
              <option value="">Tüm Durumlar</option>
              {STATUS_KEYS.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
            </select>
            {sectors.length > 0 && (
              <select value={sector} onChange={e => { setSector(e.target.value); setPage(1) }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none cursor-pointer">
                <option value="">Tüm Sektörler</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={grade} onChange={e => { setGrade(e.target.value); setPage(1) }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none cursor-pointer">
              <option value="">Tüm Kaliteler</option>
              {['A','B','C','D'].map(g => <option key={g} value={g}>{g} Kalite</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setStatus(''); setSector(''); setGrade(''); setList(''); setPage(1) }}
                className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition cursor-pointer">
                × Temizle
              </button>
            )}
          </div>
        )}

        {lists.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-slate-400 text-xs font-medium">Liste:</span>
            {[{ label: 'Tümü', value: '' }, ...lists.map(l => ({ label: l, value: l }))].map(item => (
              <button key={item.value} onClick={() => { setList(item.value); setPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border cursor-pointer ${
                  list === item.value
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                {item.value ? `📁 ${item.label}` : item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex-wrap">
          <span className="text-indigo-700 text-sm font-semibold">{selected.length} lead seçili</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={bulkFindDMs} disabled={bulkDmRunning}
              className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer">
              {bulkDmRunning ? <RefreshCw size={11} className="animate-spin" /> : <Crosshair size={11} />}
              {bulkDmRunning && bulkDmProgress ? `${bulkDmProgress.completed}/${bulkDmProgress.total}` : 'KV Bul'}
            </button>
            {(['contacted','won','lost'] as const).map(s => (
              <button key={s} onClick={() => bulkStatus(s)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg transition shadow-sm cursor-pointer">
                → {STATUS_CFG[s]?.label}
              </button>
            ))}
            <button onClick={() => setDeleteModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Trash2 size={11} /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Column headers */}
        <div className="grid items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: '36px 2.2fr 1.3fr 1.4fr 100px 1fr 90px 130px 70px 32px' }}>
          <div>
            <input type="checkbox" checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : leads.map(l => l.id))}
              className="accent-indigo-600 w-3.5 h-3.5 rounded cursor-pointer" />
          </div>
          {['FİRMA', 'TELEFON', 'E-POSTA', 'SOSYAL', 'KARAR VERİCİ', 'PUAN', 'DURUM', 'TARİH', ''].map((h, i) => (
            <div key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-slate-500 text-sm">Yükleniyor...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users size={24} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-medium">Henüz lead yok</p>
              <p className="text-slate-400 text-sm mt-0.5">Lead toplamaya başlayın</p>
            </div>
            <Link href="/leads/scrape"
              className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition">
              + Lead Topla
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leads.map(lead => {
              const av = getAvatarColor(lead.company_name)
              const initials = lead.company_name.slice(0, 2).toUpperCase()
              const domain = lead.website
                ? lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
                : null
              const grade = lead.ai_grade
              const gradeC = grade ? { A: { bg:'#dcfce7',text:'#15803d',border:'#bbf7d0' }, B: { bg:'#ede9fe',text:'#6d28d9',border:'#ddd6fe' }, C: { bg:'#fef3c7',text:'#92400e',border:'#fde68a' }, D: { bg:'#fee2e2',text:'#991b1b',border:'#fecaca' } }[grade] : null

              return (
                <div key={lead.id}
                  className="group/row grid items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors"
                  style={{ gridTemplateColumns: '36px 2.2fr 1.3fr 1.4fr 100px 1fr 90px 130px 70px 32px' }}>

                  {/* Checkbox */}
                  <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)}
                    className="accent-indigo-600 w-3.5 h-3.5 rounded cursor-pointer opacity-40 group-hover/row:opacity-100 checked:opacity-100 transition-opacity" />

                  {/* Company */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: av.bg, color: av.text }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 text-sm font-semibold truncate">{lead.company_name}</span>
                        {(lead.hot_score || 0) >= 30 && <Flame size={11} className="text-red-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {lead.city && (
                          <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                            <MapPin size={9} /> {lead.city}
                          </span>
                        )}
                        {lead.sector && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">{lead.sector}</span>
                        )}
                      </div>
                      <div className="mt-1"><SourceTag source={lead.source} /></div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    {lead.phone ? (
                      <div className="flex items-center">
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          className="text-slate-700 hover:text-indigo-600 text-sm font-mono transition-colors">
                          {lead.phone}
                        </a>
                        <CopyBtn value={lead.phone} />
                      </div>
                    ) : (
                      <button onClick={() => findPhone(lead)} disabled={!!findingDM}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 text-xs rounded-lg transition disabled:opacity-50 cursor-pointer">
                        {findingDM === lead.id+'_ph' ? <RefreshCw size={9} className="animate-spin" /> : <Phone size={9} />}
                        Bul
                      </button>
                    )}
                    {domain && (
                      <a href={lead.website!.startsWith('http') ? lead.website! : `https://${lead.website}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-600 mt-0.5 transition-colors">
                        <Globe size={8} /> {domain.slice(0,22)}
                      </a>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    {lead.email ? (
                      <div className="flex items-center">
                        <a href={`mailto:${lead.email}`}
                          className="text-slate-600 hover:text-indigo-600 text-xs transition-colors truncate max-w-[140px]">
                          {lead.email}
                        </a>
                        <CopyBtn value={lead.email} />
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                    {lead.rating && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Star size={9} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-slate-400">{lead.rating.toFixed(1)}{lead.review_count ? ` (${lead.review_count})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Social */}
                  <SocialLinks lead={lead} />

                  {/* Decision Maker */}
                  <div>
                    {lead.contact_name ? (
                      <div>
                        <p className="text-indigo-700 text-xs font-semibold leading-tight">{lead.contact_name}</p>
                        {lead.email && <p className="text-slate-400 text-[10px] mt-0.5 truncate max-w-[110px]">{lead.email}</p>}
                      </div>
                    ) : (
                      <button onClick={() => findDecisionMaker(lead)} disabled={!!findingDM}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs rounded-lg transition disabled:opacity-50 cursor-pointer">
                        {findingDM === lead.id ? <RefreshCw size={9} className="animate-spin" /> : <Crosshair size={9} />}
                        KV Bul
                      </button>
                    )}
                  </div>

                  {/* Score + Grade */}
                  <div className="flex items-center gap-1.5">
                    <ScoreBadge score={lead.score} />
                    {gradeC && grade && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                        style={{ background: gradeC.bg, color: gradeC.text, borderColor: gradeC.border }}>
                        {grade}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <StatusPill status={lead.status} onChange={s => changeStatus(lead, s)} />

                  {/* Date */}
                  <div className="text-slate-400 text-[11px]">
                    {new Date(lead.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit' })}
                  </div>

                  {/* Detail link */}
                  <Link href={`/leads/${lead.id}`}
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600">
                    <ExternalLink size={13} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-slate-500 text-xs">
              {((page-1)*pageSize+1).toLocaleString('tr-TR')}–{Math.min(page*pageSize,total).toLocaleString('tr-TR')} / {total.toLocaleString('tr-TR')} kayıt
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: '«', action: () => setPage(1), disabled: page === 1 },
                { label: '‹', action: () => setPage(p => Math.max(1,p-1)), disabled: page === 1 },
                { label: '›', action: () => setPage(p => p+1), disabled: page >= totalPages },
                { label: '»', action: () => setPage(totalPages), disabled: page >= totalPages },
              ].map(({ label, action, disabled }) => (
                <button key={label} onClick={action} disabled={disabled}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm cursor-pointer">
                  {label}
                </button>
              ))}
              <span className="text-slate-400 text-xs px-2">{page}/{totalPages}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
