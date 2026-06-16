'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import {
  Search, Plus, Trash2, Mail, Phone, ExternalLink, Crosshair, RefreshCw,
  Download, Tag, Flame, Star, Globe, ChevronDown, Copy, CheckCircle2, X,
  Instagram, MapPin, Building2,
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

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  B: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  C: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  D: 'bg-red-500/20 text-red-300 border-red-500/40',
}

const STATUS_OPTS = ['', 'new', 'contacted', 'qualified', 'replied', 'offered', 'won', 'lost']
const STATUS_COLOR: Record<string, string> = {
  new:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  contacted: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  qualified: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  replied:   'bg-green-500/20 text-green-300 border-green-500/30',
  offered:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  won:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  lost:      'bg-red-500/20 text-red-300 border-red-500/30',
}

const PAGE_SIZES = [20, 50, 100]

// ── Social icon helpers ────────────────────────────────────────────────────────

function FbIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}

function LiIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

function YtIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.6 12 3.6 12 3.6s-7.55 0-9.38.46A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 11.87 0 11.87s0 3.84.5 5.68a3.02 3.02 0 0 0 2.12 2.14C4.45 20.14 12 20.14 12 20.14s7.55 0 9.38-.45a3.02 3.02 0 0 0 2.12-2.14c.5-1.84.5-5.68.5-5.68s0-3.84-.5-5.68zM9.54 15.57V8.17l6.28 3.7-6.28 3.7z" />
    </svg>
  )
}

function TwIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function SocialIcons({ lead }: { lead: Lead }) {
  const icons = [
    lead.facebook    && { href: lead.facebook,    label: 'Facebook',  Icon: FbIcon,    color: 'text-blue-400 hover:text-blue-300' },
    lead.instagram   && { href: lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@','')}`, label: 'Instagram', Icon: Instagram, color: 'text-pink-400 hover:text-pink-300' },
    lead.youtube     && { href: lead.youtube,     label: 'YouTube',   Icon: YtIcon,    color: 'text-red-400 hover:text-red-300' },
    lead.linkedin_url && { href: lead.linkedin_url, label: 'LinkedIn', Icon: LiIcon,   color: 'text-sky-400 hover:text-sky-300' },
    lead.twitter     && { href: lead.twitter,     label: 'Twitter/X', Icon: TwIcon,    color: 'text-slate-300 hover:text-white' },
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: any; color: string }>

  if (icons.length === 0) return <span className="text-slate-600 text-xs">—</span>

  return (
    <div className="flex items-center gap-1.5">
      {icons.map(({ href, label, Icon, color }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" title={label}
          className={`transition ${color}`}>
          <Icon size={13} />
        </a>
      ))}
    </div>
  )
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition ml-1 text-slate-500 hover:text-slate-300">
      {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
    </button>
  )
}

function StatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const statusLabel = (s: string) => t(`leads.status.${s}`, s)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition hover:opacity-80 ${STATUS_COLOR[status] || 'bg-slate-700 text-slate-300 border-slate-600'}`}
      >
        {statusLabel(status)}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 min-w-32">
          {STATUS_OPTS.filter(Boolean).map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 transition ${s === status ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}>
              {statusLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const s = (source || '').toLowerCase()
  if (s.includes('apify') || s.includes('google')) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <MapPin size={8} /> Google Maps
    </span>
  )
  if (s.includes('osm')) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
      <MapPin size={8} /> OpenStreetMap
    </span>
  )
  if (s.includes('yelp')) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      <MapPin size={8} /> Yelp
    </span>
  )
  if (s.includes('here')) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
      <MapPin size={8} /> HERE
    </span>
  )
  if (s.includes('registry') || s.includes('oc_')) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
      <Building2 size={8} /> Sicil
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-400 border border-slate-600">
      <MapPin size={8} /> {source}
    </span>
  )
}

// ── Delete confirmation modal ──────────────────────────────────────────────────

function DeleteModal({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition"><X size={18} /></button>
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">Leadleri Sil</h3>
        <p className="text-slate-400 text-sm mb-6">
          <span className="text-white font-semibold">{count} lead</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition">
            İptal
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition">
            Sil
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { t } = useI18n()
  const statusLabel = (s: string) => t(`leads.status.${s}`, s)

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
  const [dmResults, setDmResults] = useState<Record<string, any>>({})
  const [bulkDmRunning, setBulkDmRunning] = useState(false)
  const [bulkDmProgress, setBulkDmProgress] = useState<{ completed: number; total: number } | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [list, setList] = useState('')
  const [lists, setLists] = useState<string[]>([])
  const [deleteModal, setDeleteModal] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (sector) params.set('sector', sector)
      if (grade)  params.set('grade', grade)
      if (list)   params.set('list', list)
      const data = await api.get(`/api/leads?${params}`)
      setLeads(data.leads)
      setTotal(data.total)
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const loadSectors = async () => {
    try {
      const data = await api.get('/api/leads/sectors')
      setSectors(data.sectors || [])
    } catch {}
  }

  const loadLists = async () => {
    try {
      const data = await api.get('/api/leads/lists')
      setLists(data.lists || [])
    } catch {}
  }

  useEffect(() => { loadSectors(); loadLists() }, [])
  useEffect(() => { load() }, [page, pageSize, status, sector, grade, list])
  useEffect(() => {
    const timer = setTimeout(load, 400)
    return () => clearTimeout(timer)
  }, [search])

  const toggleSelect = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selectAll = () =>
    setSelected(selected.length === leads.length ? [] : leads.map(l => l.id))

  const bulkDelete = async () => {
    await Promise.all(selected.map(id => api.delete(`/api/leads/${id}`)))
    setSelected([])
    setDeleteModal(false)
    load()
  }

  const bulkStatus = async (newStatus: string) => {
    await api.post('/api/leads/bulk-status', { ids: selected, status: newStatus })
    setSelected([])
    load()
  }

  const changeStatus = async (lead: Lead, newStatus: string) => {
    try {
      await api.patch(`/api/leads/${lead.id}`, { status: newStatus })
      setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))
    } catch (e: any) { showMsg('error', e.message) }
  }

  const findPhone = async (lead: Lead) => {
    setFindingDM(lead.id + '_phone')
    try {
      const data = await api.post('/api/persons/find-phone', {
        companyName: lead.company_name, website: lead.website || '',
        city: lead.city || '', leadId: lead.id,
      })
      if (data.bestPhone) {
        showMsg('success', `${lead.company_name}: ${data.bestPhone} bulundu!`)
        load()
      } else {
        showMsg('error', `${lead.company_name}: Telefon bulunamadı`)
      }
    } catch (e: any) { showMsg('error', e.message) }
    finally { setFindingDM(null) }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (selected.length > 0) {
        params.set('ids', selected.join(','))
      } else {
        if (search) params.set('search', search)
        if (status) params.set('status', status)
        if (sector) params.set('sector', sector)
        if (grade)  params.set('grade', grade)
      }
      const token = localStorage.getItem('token') || ''
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
      const resp = await fetch(`${API}/api/leads/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error('Export başarısız')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sovlo-leads-${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setExporting(false) }
  }

  const findDecisionMaker = async (lead: Lead) => {
    setFindingDM(lead.id)
    try {
      const data = await api.post('/api/decision-maker-finder/find', { leadId: lead.id })
      setDmResults(prev => ({ ...prev, [lead.id]: data }))
      if (data.found > 0) load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setFindingDM(null) }
  }

  const bulkFindDMs = async () => {
    if (!selected.length) return
    setBulkDmRunning(true)
    setBulkDmProgress({ completed: 0, total: selected.length })
    try {
      const data = await api.post('/api/decision-maker-finder/bulk', { leadIds: selected })
      if (!data.jobId) throw new Error('Job başlatılamadı')
      const jobId = data.jobId
      const iv = setInterval(async () => {
        try {
          const job = await api.get(`/api/decision-maker-finder/job/${jobId}`)
          setBulkDmProgress({ completed: job.completed, total: job.total })
          if (job.status === 'done' || job.status === 'error') {
            clearInterval(iv)
            setBulkDmRunning(false)
            setBulkDmProgress(null)
            setSelected([])
            load()
            const found = (job.results || []).filter((r: any) => r.found).length
            showMsg('success', `${found}/${job.total} firmada karar verici bulundu`)
          }
        } catch { clearInterval(iv); setBulkDmRunning(false) }
      }, 3000)
    } catch (e: any) {
      showMsg('error', e.message)
      setBulkDmRunning(false)
      setBulkDmProgress(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-5">
      {deleteModal && (
        <DeleteModal
          count={selected.length}
          onConfirm={bulkDelete}
          onCancel={() => setDeleteModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('leads.title','Leadler')}</h1>
          <p className="text-slate-400 mt-0.5 text-sm">{total.toLocaleString()} lead kayıtlı</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-2 bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl font-medium transition text-sm border border-emerald-500/30">
            {exporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            {selected.length > 0 ? `${selected.length} Lead İndir` : 'Excel İndir'}
          </button>
          <Link href="/decision-maker"
            className="flex items-center gap-2 bg-purple-600/80 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl font-medium transition text-sm border border-purple-500/30">
            <Crosshair size={15} /> KV Bul
          </Link>
          <Link href="/leads/scrape"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-medium transition text-sm">
            <Plus size={15} /> Lead Topla
          </Link>
        </div>
      </div>

      {/* Message toast */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Filters row */}
      <div className="flex gap-2.5 flex-wrap">
        <div className="flex-1 min-w-52 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Firma adı ara..."
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition">
          <option value="">Tüm Durumlar</option>
          {STATUS_OPTS.filter(Boolean).map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        {sectors.length > 0 && (
          <div className="relative">
            <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={sector} onChange={e => { setSector(e.target.value); setPage(1) }}
              className="bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition">
              <option value="">Tüm Sektörler</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div className="relative">
          <Star size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={grade} onChange={e => { setGrade(e.target.value); setPage(1) }}
            className="bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition">
            <option value="">Tüm Kaliteler</option>
            {['A','B','C','D'].map(g => <option key={g} value={g}>{g} Kalite</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2">
          <span className="text-slate-400 text-xs whitespace-nowrap">Sayfa:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="bg-transparent text-sm text-slate-300 focus:outline-none">
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* List filter pills */}
      {lists.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-xs">Liste:</span>
          <button onClick={() => { setList(''); setPage(1) }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
              !list ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
            }`}>
            Tümü
          </button>
          {lists.map(l => (
            <button key={l} onClick={() => { setList(list === l ? '' : l); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border flex items-center gap-1 ${
                list === l ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}>
              📁 {l}
            </button>
          ))}
        </div>
      )}

      {/* Bulk actions bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-blue-300 text-sm font-medium">{selected.length} lead seçili</span>
          {total > pageSize && (
            <span className="text-slate-500 text-xs">(Tüm {total} lead için: tüm sayfalara bakın)</span>
          )}
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={bulkFindDMs} disabled={bulkDmRunning}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-60">
              {bulkDmRunning ? <RefreshCw size={12} className="animate-spin" /> : <Crosshair size={12} />}
              {bulkDmRunning && bulkDmProgress
                ? `KV Aranıyor ${bulkDmProgress.completed}/${bulkDmProgress.total}`
                : 'KV Bul'}
            </button>
            {['contacted','replied','won','lost'].map(s => (
              <button key={s} onClick={() => bulkStatus(s)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition">
                → {statusLabel(s)}
              </button>
            ))}
            <button onClick={() => setDeleteModal(true)}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-lg transition flex items-center gap-1.5">
              <Trash2 size={12} /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/60">
                <th className="p-3.5 w-10">
                  <input type="checkbox" checked={selected.length === leads.length && leads.length > 0}
                    onChange={selectAll} className="accent-blue-500 w-3.5 h-3.5" />
                </th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Firma</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Telefon</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">E-posta</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Sosyal</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Karar Verici</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Puan</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Durum</th>
                <th className="p-3.5 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">Tarih</th>
                <th className="p-3.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {loading ? (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500">Yükleniyor...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500">
                  Lead bulunamadı. <Link href="/leads/scrape" className="text-blue-400 hover:underline">Lead topla →</Link>
                </td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-700/20 transition group">
                  {/* Checkbox */}
                  <td className="p-3.5">
                    <input type="checkbox" checked={selected.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)} className="accent-blue-500 w-3.5 h-3.5" />
                  </td>

                  {/* Firma */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-slate-600/50 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {lead.company_name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-medium text-sm truncate max-w-36">{lead.company_name}</p>
                          {(lead.hot_score || 0) >= 30 && <Flame size={11} className="text-red-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {lead.city && (
                            <span className="text-slate-500 text-xs">{lead.city}</span>
                          )}
                          {lead.sector && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded border border-indigo-500/20">
                              <Tag size={8} />{lead.sector}
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <SourceBadge source={lead.source} />
                        </div>
                        {lead.rating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star size={9} className="text-amber-400 fill-amber-400" />
                            <span className="text-amber-400 text-[10px] font-medium">{lead.rating.toFixed(1)}</span>
                            {lead.review_count && <span className="text-slate-600 text-[10px]">({lead.review_count})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Telefon */}
                  <td className="p-3.5">
                    {lead.phone ? (
                      <div className="group/ph flex items-center">
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          className="text-slate-200 text-sm hover:text-green-400 transition font-mono whitespace-nowrap">
                          {lead.phone}
                        </a>
                        <CopyBtn value={lead.phone} />
                      </div>
                    ) : (
                      <button onClick={() => findPhone(lead)} disabled={!!findingDM}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500/8 hover:bg-green-500/15 border border-green-500/20 text-green-500 text-xs rounded-lg transition disabled:opacity-50">
                        {findingDM === lead.id + '_phone' ? <RefreshCw size={10} className="animate-spin" /> : <Phone size={10} />}
                        Bul
                      </button>
                    )}
                    {lead.website && (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-[10px] mt-1 transition">
                        <Globe size={9} />
                        <span className="truncate max-w-24">{lead.website.replace(/^https?:\/\/(www\.)?/,'').split('/')[0]}</span>
                      </a>
                    )}
                  </td>

                  {/* Email */}
                  <td className="p-3.5">
                    {lead.email ? (
                      <div className="group/em flex items-center">
                        <a href={`mailto:${lead.email}`}
                          className="text-slate-300 text-xs hover:text-blue-400 transition truncate max-w-36">
                          {lead.email}
                        </a>
                        <CopyBtn value={lead.email} />
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Sosyal Medya */}
                  <td className="p-3.5">
                    <SocialIcons lead={lead} />
                  </td>

                  {/* Karar Verici */}
                  <td className="p-3.5">
                    {lead.contact_name ? (
                      <div>
                        <p className="text-purple-300 text-sm font-medium">{lead.contact_name}</p>
                        {lead.email && <p className="text-slate-500 text-xs truncate max-w-28">{lead.email}</p>}
                      </div>
                    ) : dmResults[lead.id] ? (
                      <div>
                        {dmResults[lead.id].found > 0 ? (
                          <div>
                            <p className="text-emerald-400 text-xs font-medium">
                              {dmResults[lead.id].bestName || dmResults[lead.id].decisionMakers?.[0]?.fullName}
                            </p>
                            {dmResults[lead.id].bestTitle && (
                              <p className="text-slate-500 text-xs truncate max-w-28">{dmResults[lead.id].bestTitle}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs">Bulunamadı</p>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => findDecisionMaker(lead)} disabled={!!findingDM}
                        className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-400 text-xs rounded-lg transition disabled:opacity-50">
                        {findingDM === lead.id ? <RefreshCw size={11} className="animate-spin" /> : <Crosshair size={11} />}
                        KV Bul
                      </button>
                    )}
                  </td>

                  {/* Puan */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      {lead.ai_grade && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${GRADE_COLOR[lead.ai_grade] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                          {lead.ai_grade}
                        </span>
                      )}
                      <div className="w-10 bg-slate-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(lead.score,100)}%` }} />
                      </div>
                      <span className="text-white text-xs font-semibold w-6 text-right">{lead.score}</span>
                    </div>
                  </td>

                  {/* Durum */}
                  <td className="p-3.5">
                    <StatusBadge status={lead.status} onChange={s => changeStatus(lead, s)} />
                  </td>

                  {/* Tarih */}
                  <td className="p-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5">
                    <Link href={`/leads/${lead.id}`} className="text-slate-500 hover:text-white transition opacity-0 group-hover:opacity-100">
                      <ExternalLink size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/60 bg-slate-800/30">
            <p className="text-slate-400 text-sm">
              {((page-1)*pageSize+1).toLocaleString()}–{Math.min(page*pageSize,total).toLocaleString()} / <span className="text-white font-medium">{total.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs rounded-lg transition">«</button>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page === 1}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">← Önceki</button>
              <span className="text-slate-400 text-sm px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p+1)} disabled={page >= totalPages}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">Sonraki →</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs rounded-lg transition">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
