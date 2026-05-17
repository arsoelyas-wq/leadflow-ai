'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { Search, Plus, Trash2, Mail, Phone, Instagram, ExternalLink, Crosshair, RefreshCw, Download, Tag, Flame } from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  contact_name?: string
  phone?: string
  email?: string
  instagram?: string
  website?: string
  city?: string
  sector?: string
  source: string
  score: number
  ai_grade?: string
  hot_score?: number
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
const statusLabel: Record<string, string> = {
  new: 'Yeni', contacted: 'İletişime Geçildi', qualified: 'Nitelikli',
  replied: 'Cevap Verdi', offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi'
}
const statusColor: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-300',
  contacted: 'bg-yellow-500/20 text-yellow-300',
  qualified: 'bg-cyan-500/20 text-cyan-300',
  replied: 'bg-green-500/20 text-green-300',
  offered: 'bg-purple-500/20 text-purple-300',
  won: 'bg-emerald-500/20 text-emerald-300',
  lost: 'bg-red-500/20 text-red-300',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sector, setSector] = useState('')
  const [sectors, setSectors] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [findingDM, setFindingDM] = useState<string | null>(null)
  const [dmResults, setDmResults] = useState<Record<string, any>>({})
  const [bulkDmRunning, setBulkDmRunning] = useState(false)
  const [bulkDmProgress, setBulkDmProgress] = useState<{ completed: number; total: number } | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [list, setList] = useState('')
  const [lists, setLists] = useState<string[]>([])
  
  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (sector) params.set('sector', sector)
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
  useEffect(() => { load() }, [page, status, sector, list])
  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
  }, [search])

  const toggleSelect = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selectAll = () =>
    setSelected(selected.length === leads.length ? [] : leads.map(l => l.id))

  const bulkDelete = async () => {
    if (!confirm(`${selected.length} lead silinsin mi?`)) return
    await Promise.all(selected.map(id => api.delete(`/api/leads/${id}`)))
    setSelected([])
    load()
  }

  const bulkStatus = async (newStatus: string) => {
    await api.post('/api/leads/bulk-status', { ids: selected, status: newStatus })
    setSelected([])
    load()
  }

  // Telefon bul
  const findPhone = async (lead: Lead) => {
    setFindingDM(lead.id + '_phone')
    try {
      const data = await api.post('/api/persons/find-phone', {
        companyName: lead.company_name,
        website: (lead as any).website || '',
        city: lead.city || '',
        leadId: lead.id,
      })
      if (data.bestPhone) {
        showMsg('success', `${lead.company_name}: ${data.bestPhone} bulundu! 📱`)
        load()
      } else {
        showMsg('error', `${lead.company_name}: Telefon bulunamadı`)
      }
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setFindingDM(null)
    }
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
      a.download = `leadflow-leads-${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setExporting(false)
    }
  }

  // Tek lead için karar verici bul (LinkdAPI chain)
  const findDecisionMaker = async (lead: Lead) => {
    setFindingDM(lead.id)
    try {
      const data = await api.post('/api/decision-maker-finder/find', { leadId: lead.id })
      setDmResults(prev => ({ ...prev, [lead.id]: data }))
      if (data.found > 0) load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setFindingDM(null)
    }
  }

  // Toplu karar verici bul
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leadler</h1>
          <p className="text-slate-400 mt-1">{total} lead bulundu</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm">
            {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {selected.length > 0 ? `${selected.length} Seçiliyi İndir` : 'Excel İndir'}
          </button>
          <Link href="/decision-maker"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm">
            <Crosshair size={16} /> Karar Verici Bul
          </Link>
          <Link href="/leads/scrape"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm">
            <Plus size={16} /> Lead Topla
          </Link>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-60 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Firma adı ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">Tüm Durumlar</option>
          {STATUS_OPTS.filter(Boolean).map(s => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
        {sectors.length > 0 && (
          <div className="relative">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={sector} onChange={e => { setSector(e.target.value); setPage(1) }}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
              <option value="">Tüm Sektörler</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Saved lists filter */}
      {lists.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-sm">📁 Listeler:</span>
          <button
            onClick={() => { setList(''); setPage(1) }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
              !list ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
            }`}
          >
            Tümü
          </button>
          {lists.map(l => (
            <button
              key={l}
              onClick={() => { setList(list === l ? '' : l); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border flex items-center gap-1 ${
                list === l ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              📁 {l}
            </button>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/30 rounded-lg px-4 py-3 flex-wrap">
          <span className="text-blue-300 text-sm font-medium">{selected.length} seçili</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={bulkFindDMs} disabled={bulkDmRunning}
              className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 text-xs rounded-lg transition flex items-center gap-1 disabled:opacity-60">
              {bulkDmRunning ? <RefreshCw size={12} className="animate-spin" /> : <Crosshair size={12} />}
              {bulkDmRunning && bulkDmProgress ? `KV Aranıyor ${bulkDmProgress.completed}/${bulkDmProgress.total}` : 'KV Bul'}
            </button>
            {['contacted', 'replied', 'won', 'lost'].map(s => (
              <button key={s} onClick={() => bulkStatus(s)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition">
                → {statusLabel[s]}
              </button>
            ))}
            <button onClick={bulkDelete}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-lg transition flex items-center gap-1">
              <Trash2 size={12} /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="p-4 w-10">
                <input type="checkbox" checked={selected.length === leads.length && leads.length > 0}
                  onChange={selectAll} className="accent-blue-500" />
              </th>
              <th className="p-4 text-slate-400 text-sm font-medium">Firma</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Karar Verici</th>
              <th className="p-4 text-slate-400 text-sm font-medium">İletişim</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Puan</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Durum</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Tarih</th>
              <th className="p-4 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-12 text-center text-slate-500">Yükleniyor...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={8} className="p-12 text-center text-slate-500">
                Lead bulunamadı. <Link href="/leads/scrape" className="text-blue-400">Lead topla →</Link>
              </td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                <td className="p-4">
                  <input type="checkbox" checked={selected.includes(lead.id)}
                    onChange={() => toggleSelect(lead.id)} className="accent-blue-500" />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {lead.company_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-medium text-sm">{lead.company_name}</p>
                        {(lead.hot_score || 0) >= 30 && (
                          <Flame size={12} className="text-red-400 shrink-0" title="Sıcak lead!" />
                        )}
                      </div>
                      {lead.city && <p className="text-slate-400 text-xs">{lead.city}</p>}
                      {lead.sector && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 text-xs rounded">
                          <Tag size={9} />{lead.sector}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Karar Verici */}
                <td className="p-4">
                  {lead.contact_name ? (
                    <div>
                      <p className="text-purple-300 text-sm font-medium">{lead.contact_name}</p>
                      {lead.email && <p className="text-slate-500 text-xs truncate max-w-32">{lead.email}</p>}
                    </div>
                  ) : dmResults[lead.id] ? (
                    <div>
                      {dmResults[lead.id].found > 0 ? (
                        <div>
                          <p className="text-emerald-400 text-xs font-medium">
                            {dmResults[lead.id].bestName || dmResults[lead.id].decisionMakers?.[0]?.fullName}
                          </p>
                          {dmResults[lead.id].bestTitle && (
                            <p className="text-slate-500 text-xs truncate max-w-32">{dmResults[lead.id].bestTitle}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs">Bulunamadı</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => findDecisionMaker(lead)}
                        disabled={!!findingDM}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs rounded-lg transition disabled:opacity-50"
                        title="Karar verici bul"
                      >
                        {findingDM === lead.id
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <Crosshair size={11} />}
                        KV
                      </button>
                      <button
                        onClick={() => findPhone(lead)}
                        disabled={!!findingDM}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs rounded-lg transition disabled:opacity-50"
                        title="Telefon bul"
                      >
                        {findingDM === lead.id + '_phone'
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <Phone size={11} />}
                        📱
                      </button>
                    </div>
                  )}
                </td>

                <td className="p-4">
                  <div className="flex gap-2 items-center">
                    {lead.phone && (
                      <span className="group relative">
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          className="text-slate-400 hover:text-green-400 transition">
                          <Phone size={14} />
                        </a>
                        <span className="absolute bottom-6 left-0 bg-slate-900 border border-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10">
                          {lead.phone}
                        </span>
                      </span>
                    )}
                    {lead.email && <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-blue-400 transition"><Mail size={14} /></a>}
                    {lead.instagram && <a href={`https://instagram.com/${lead.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pink-400 transition"><Instagram size={14} /></a>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {lead.ai_grade && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${GRADE_COLOR[lead.ai_grade] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                        {lead.ai_grade}
                      </span>
                    )}
                    <div className="w-12 bg-slate-700 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${lead.score}%` }} />
                    </div>
                    <span className="text-white text-sm font-medium">{lead.score}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[lead.status] || 'bg-slate-700 text-slate-300'}`}>
                    {statusLabel[lead.status] || lead.status}
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-xs">
                  {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td className="p-4">
                  <Link href={`/leads/${lead.id}`} className="text-slate-400 hover:text-white transition">
                    <ExternalLink size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-700">
            <p className="text-slate-400 text-sm">{total} sonuçtan {(page-1)*20+1}–{Math.min(page*20, total)} gösteriliyor</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">← Önceki</button>
              <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= total}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">Sonraki →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}