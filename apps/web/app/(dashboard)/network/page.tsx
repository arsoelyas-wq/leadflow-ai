'use client'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { Network, RefreshCw, Plus, Trash2, Users, ArrowLeft, Search } from 'lucide-react'

interface Node {
  id:       string
  label:    string
  city?:    string
  sector?:  string
  score:    number
  grade?:   string
  status:   string
  hotScore: number
}

interface Edge {
  id:     string
  source: string
  target: string
  type:   string
  label:  string
  notes?: string
}

const GRADE_COLOR: Record<string, string> = {
  A: 'border-emerald-500 bg-emerald-500/20',
  B: 'border-blue-500 bg-blue-500/20',
  C: 'border-yellow-500 bg-yellow-500/20',
  D: 'border-red-500 bg-red-500/20',
}

const CONN_TYPE_COLOR: Record<string, string> = {
  referral:     'text-purple-400 border-purple-500/30 bg-purple-500/10',
  knows:        'text-blue-400 border-blue-500/30 bg-blue-500/10',
  same_network: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  customer_ref: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
}

export default function NetworkPage() {
  const { t } = useI18n()
  const [nodes, setNodes]         = useState<Node[]>([])
  const [edges, setEdges]         = useState<Edge[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  // Add connection modal
  const [addOpen, setAddOpen]     = useState(false)
  const [allLeads, setAllLeads]   = useState<any[]>([])
  const [form, setForm]           = useState({ leadId: '', connectedTo: '', type: 'referral', notes: '' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/network')
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
    } catch {} finally { setLoading(false) }
  }

  const loadAllLeads = async () => {
    try {
      const data = await api.get('/api/leads?limit=200')
      setAllLeads(data.leads || [])
    } catch {}
  }

  useEffect(() => { load(); loadAllLeads() }, [])

  const addConnection = async () => {
    if (!form.leadId || !form.connectedTo) return
    setSaving(true)
    try {
      await api.post('/api/network/connect', {
        leadId:         form.leadId,
        connectedTo:    form.connectedTo,
        connectionType: form.type,
        notes:          form.notes || undefined,
      })
      setAddOpen(false)
      setForm({ leadId: '', connectedTo: '', type: 'referral', notes: '' })
      load()
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const removeEdge = async (id: string) => {
    if (!confirm('Bu bağlantıyı sil?')) return
    await api.delete(`/api/network/${id}`)
    load()
  }

  const filteredNodes = nodes.filter(n =>
    !search || n.label.toLowerCase().includes(search.toLowerCase()) ||
    (n.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.sector || '').toLowerCase().includes(search.toLowerCase())
  )

  const nodeEdges = (nodeId: string) =>
    edges.filter(e => e.source === nodeId || e.target === nodeId)

  const getNode = (id: string) => nodes.find(n => n.id === id)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Network size={22} className="text-cyan-400" /> Ağ Haritası
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">{nodes.length} firma · {edges.length} bağlantı</p>
          </div>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Bağlantı Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Firma', value: nodes.length, color: 'text-white' },
          { label: 'Bağlantı',    value: edges.length, color: 'text-cyan-400' },
          { label: 'Sıcak Lead',  value: nodes.filter(n => n.hotScore >= 30).length, color: 'text-red-400' },
          { label: 'A Sınıfı',    value: nodes.filter(n => n.grade === 'A').length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Firma adı, şehir veya sektör ara..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
      </div>

      {/* Connection List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={20} className="animate-spin text-slate-500" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 border border-slate-700 rounded-xl">
          <Network size={48} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-white font-semibold mb-2">Henüz Ağ Bağlantısı Yok</h2>
          <p className="text-slate-400 text-sm mb-6">
            Leadleriniz arasında referans, tanışıklık veya ortak ağ bağlantıları ekleyin.<br />
            Bu bağlantılar satışlarınızı hızlandırır.
          </p>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition mx-auto">
            <Plus size={16} /> İlk Bağlantıyı Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNodes.map(node => {
            const myEdges = nodeEdges(node.id)
            if (myEdges.length === 0) return null
            return (
              <div key={node.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                {/* Node Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-white font-bold shrink-0 ${GRADE_COLOR[node.grade || ''] || 'border-slate-600 bg-slate-700'}`}>
                    {node.label[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/leads/${node.id}`} className="text-white font-semibold hover:text-cyan-400 transition truncate block">
                      {node.label}
                    </Link>
                    <p className="text-slate-500 text-xs">{[node.city, node.sector].filter(Boolean).join(' · ')}</p>
                  </div>
                  {node.grade && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${GRADE_COLOR[node.grade] || ''}`}>
                      {node.grade}
                    </span>
                  )}
                </div>

                {/* Connections */}
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  {myEdges.map(edge => {
                    const isSource = edge.source === node.id
                    const peerId = isSource ? edge.target : edge.source
                    const peer = getNode(peerId)
                    return (
                      <div key={edge.id} className="flex items-center gap-3">
                        <span className="text-slate-600 text-sm shrink-0">{isSource ? '→' : '←'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${CONN_TYPE_COLOR[edge.type] || 'text-slate-400 border-slate-600 bg-slate-700'}`}>
                          {edge.label}
                        </span>
                        {peer ? (
                          <Link href={`/leads/${peer.id}`} className="text-slate-300 hover:text-white text-xs transition flex-1 min-w-0 truncate">
                            {peer.label}
                          </Link>
                        ) : (
                          <span className="text-slate-500 text-xs flex-1">Silinmiş lead</span>
                        )}
                        {edge.notes && (
                          <span className="text-slate-600 text-xs truncate max-w-32">{edge.notes}</span>
                        )}
                        <button onClick={() => removeEdge(edge.id)}
                          className="text-slate-700 hover:text-red-400 transition shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Isolated nodes */}
          {filteredNodes.filter(n => nodeEdges(n.id).length === 0).length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-3 flex items-center gap-1.5">
                <Users size={12} /> Bağlantısız Firmalar ({filteredNodes.filter(n => nodeEdges(n.id).length === 0).length})
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredNodes.filter(n => nodeEdges(n.id).length === 0).slice(0, 20).map(n => (
                  <Link key={n.id} href={`/leads/${n.id}`}
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-xs rounded-lg transition">
                    {n.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Connection Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
              <Network size={18} className="text-cyan-400" /> Yeni Bağlantı Ekle
            </h2>

            {msg && <p className="text-red-400 text-xs mb-3 bg-red-500/10 px-3 py-2 rounded-lg">{msg}</p>}

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Kaynak Firma</label>
                <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                  <option value="">Firma seçin...</option>
                  {allLeads.map(l => (
                    <option key={l.id} value={l.id}>{l.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Bağlı Firma</label>
                <select value={form.connectedTo} onChange={e => setForm(f => ({ ...f, connectedTo: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                  <option value="">Firma seçin...</option>
                  {allLeads.filter(l => l.id !== form.leadId).map(l => (
                    <option key={l.id} value={l.id}>{l.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Bağlantı Türü</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                  <option value="referral">Referans</option>
                  <option value="knows">Tanıyor</option>
                  <option value="same_network">Ortak Ağ</option>
                  <option value="customer_ref">Müşteri Referansı</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Not (opsiyonel)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Örn: Aynı sanayi sitesindeler"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setAddOpen(false); setMsg(null) }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition">
                İptal
              </button>
              <button onClick={addConnection} disabled={saving || !form.leadId || !form.connectedTo}
                className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition">
                {saving ? 'Kaydediliyor...' : 'Bağlantı Kur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
