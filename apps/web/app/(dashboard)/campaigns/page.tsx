'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Play, Pause, BarChart2, MessageSquare } from 'lucide-react'
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

const channelIcon: Record<string, string> = {
  whatsapp: '💬',
  email: '📧',
  instagram: '📸',
  multi: '🔀',
}

const statusColor: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  active: 'bg-green-500/20 text-green-300',
  paused: 'bg-yellow-500/20 text-yellow-300',
  completed: 'bg-blue-500/20 text-blue-300',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/campaigns')
      .then(data => setCampaigns(data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const endpoint = currentStatus === 'active'
      ? `/api/campaigns/${id}/pause`
      : `/api/campaigns/${id}/start`
    await api.post(endpoint, {})
    const data = await api.get('/api/campaigns')
    setCampaigns(data.campaigns || [])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kampanyalar</h1>
          <p className="text-slate-400 mt-1">{campaigns.length} kampanya</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition"
        >
          <Plus size={18} />
          Yeni Kampanya
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <MessageSquare size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Henüz kampanya yok</h3>
          <p className="text-slate-400 text-sm mb-6">İlk kampanyanızı oluşturun ve leadlerinize otomatik mesaj gönderin</p>
          <Link href="/campaigns/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg transition">
            <Plus size={16} /> Kampanya Oluştur
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => {
            const replyRate = campaign.totalSent > 0
              ? Math.round((campaign.totalReplied / campaign.totalSent) * 100)
              : 0
            return (
              <div key={campaign.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl">
                    {channelIcon[campaign.channel] || '📢'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-semibold">{campaign.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[campaign.status]}`}>
                        {campaign.status === 'draft' ? 'Taslak' :
                         campaign.status === 'active' ? 'Aktif' :
                         campaign.status === 'paused' ? 'Duraklatıldı' : 'Tamamlandı'}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-400">
                      <span>{campaign.totalSent} gönderildi</span>
                      <span>{campaign.totalReplied} cevap</span>
                      <span>%{replyRate} oran</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/campaigns/${campaign.id}`} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition">
                      <BarChart2 size={16} />
                    </Link>
                    {campaign.status !== 'completed' && (
                      <button
                        onClick={() => toggleCampaign(campaign.id, campaign.status)}
                        className={`p-2 rounded-lg transition ${
                          campaign.status === 'active'
                            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
                            : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                        }`}
                      >
                        {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    )}
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
