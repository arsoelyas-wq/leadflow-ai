'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { Search, Filter, Plus, Trash2, Mail, Phone, Instagram, ExternalLink } from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  contact_name?: string
  phone?: string
  email?: string
  instagram?: string
  city?: string
  source: string
  score: number
  status: string
  created_at: string
}

const STATUS_OPTS = ['', 'new', 'contacted', 'replied', 'offered', 'won', 'lost']
const SOURCE_OPTS = ['', 'google_maps', 'instagram', 'linkedin', 'manual']

const statusLabel: Record<string, string> = {
  new: 'Yeni', contacted: 'İletişime Geçildi', replied: 'Cevap Verdi',
  offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi'
}
const statusColor: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-300',
  contacted: 'bg-yellow-500/20 text-yellow-300',
  replied: 'bg-green-500/20 text-green-300',
  offered: 'bg-purple-500/20 text-purple-300',
  won: 'bg-emerald-500/20 text-emerald-300',
  lost: 'bg-red-500/20 text-red-300',
}
const sourceLabel: Record<string, string> = {
  google_maps: 'Google Maps', instagram: 'Instagram',
  linkedin: 'LinkedIn', manual: 'Manuel'
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (source) params.set('source', source)
      const data = await api.get(`/api/leads?${params}`)
      setLeads(data.leads)
      setTotal(data.total)
    } catch (e) {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, status, source])
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leadler</h1>
          <p className="text-slate-400 mt-1">{total} lead bulundu</p>
        </div>
        <Link href="/leads/scrape"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition">
          <Plus size={18} /> Lead Topla
        </Link>
      </div>

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
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">Tüm Kaynaklar</option>
          {SOURCE_OPTS.filter(Boolean).map(s => (
            <option key={s} value={s}>{sourceLabel[s]}</option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/30 rounded-lg px-4 py-3">
          <span className="text-blue-300 text-sm">{selected.length} seçili</span>
          <div className="flex gap-2 ml-auto">
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
              <th className="p-4 text-slate-400 text-sm font-medium">İletişim</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Kaynak</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Puan</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Durum</th>
              <th className="p-4 text-slate-400 text-sm font-medium">Tarih</th>
              <th className="p-4 w-10"></th>
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
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {lead.company_name[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{lead.company_name}</p>
                      {lead.city && <p className="text-slate-400 text-xs">{lead.city}</p>}
                    </div>
                  </div>
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
                  <span className="text-slate-300 text-sm">{sourceLabel[lead.source] || lead.source}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-700 rounded-full h-1.5">
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