'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Play, Pause, BarChart2, MessageSquare, Search, Trash2, TrendingUp, Send, Users } from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  totalSent: number
  totalReplied: number
  createdAt: string
}

const CHANNEL_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  whatsapp: { icon: '💬', label: 'WhatsApp', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  email: { icon: '📧', label: 'Email', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  sms: { icon: '📱', label: 'SMS', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  instagram: { icon: '📸', label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  multi: { icon: '🔀', label: 'Çoklu', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Taslak', cls: 'bg-slate-700 text-slate-300' },
  active: { label: 'Aktif', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  paused: { label: 'Duraklatıldı', cls: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  completed: { label: 'Tamamlandı', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const load = async () => {
    setLoading(true)
    api.get('/api/campaigns')
      .then(data => setCampaigns(data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const endpoint = currentStatus === 'active' ? `/api/campaigns/${id}/pause` : `/api/campaigns/${id}/start`
    await api.post(endpoint, {})
    load()
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    try { await api.delete(`/api/campaigns/${id}`); load() } catch {}
  }

  const totalSent = campaigns.reduce((s, c) => s + (c.totalSent || 0), 0)
  const totalReplied = campaigns.reduce((s, c) => s + (c.totalReplied || 0), 0)
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0
  const activeCnt = campaigns.filter(c => c.status === 'active').length

  const filtered = campaigns.filter(c => {
    const ms = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const mc = filterChannel === 'all' || c.channel === filterChannel
    const mst = filterStatus === 'all' || c.status === filterStatus
    return ms && mc && mst
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kampanyalar</h1>
          <p className="text-slate-400 mt-1 text-sm">{campaigns.length} kampanya · {activeCnt} aktif</p>
        </div>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition">
          <Plus size={18} /> Yeni Kampanya
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kampanya', value: campaigns.length, icon: BarChart2, color: 'text-blue-400' },
          { label: 'Toplam Gönderim', value: totalSent.toLocaleString('tr-TR'), icon: Send, color: 'text-emerald-400' },
          { label: 'Toplam Yanıt', value: totalReplied.toLocaleString('tr-TR'), icon: TrendingUp, color: 'text-cyan-400' },
          { label: 'Ort. Yanıt Oranı', value: `%${avgReplyRate}`, icon: Users, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <p className="text-slate-400 text-xs">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Kampanya ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
        </div>
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500">
          <option value="all">Tüm Kanallar</option>
          {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500">
          <option value="all">Tüm Durumlar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <MessageSquare size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">
            {campaigns.length === 0 ? 'Henüz kampanya yok' : 'Sonuç bulunamadı'}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {campaigns.length === 0
              ? 'İlk kampanyanızı oluşturun ve leadlerinize otomatik mesaj gönderin'
              : 'Arama kriterlerinizi değiştirin'}
          </p>
          {campaigns.length === 0 && (
            <Link href="/campaigns/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition">
              <Plus size={16} /> Kampanya Oluştur
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => {
            const ch = CHANNEL_CONFIG[campaign.channel] || CHANNEL_CONFIG.multi
            const st = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft
            const replyRate = campaign.totalSent > 0 ? Math.round((campaign.totalReplied / campaign.totalSent) * 100) : 0
            return (
              <div key={campaign.id}
                className={`bg-slate-800/50 border rounded-xl p-5 transition hover:border-slate-500 ${ch.border}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${ch.bg} border ${ch.border} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                    {ch.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <h3 className="text-white font-semibold">{campaign.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ch.bg} ${ch.color}`}>{ch.label}</span>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{campaign.totalSent.toLocaleString('tr-TR')} gönderildi</span>
                        <span className="text-emerald-400 font-medium">%{replyRate} yanıt oranı</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                          style={{ width: `${replyRate}%` }} />
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs">
                      {campaign.totalReplied} yanıt · {new Date(campaign.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/campaigns/${campaign.id}`}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition" title="Analitik">
                      <BarChart2 size={15} />
                    </Link>
                    {campaign.status !== 'completed' && (
                      <button onClick={() => toggleCampaign(campaign.id, campaign.status)}
                        className={`p-2 rounded-lg transition ${campaign.status === 'active' ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'}`}
                        title={campaign.status === 'active' ? 'Duraklat' : 'Başlat'}>
                        {campaign.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                    )}
                    <button onClick={() => deleteCampaign(campaign.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Sil">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
