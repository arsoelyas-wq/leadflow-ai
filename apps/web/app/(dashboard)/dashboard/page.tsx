'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Users, Megaphone, TrendingUp, Zap, ArrowUpRight, Plus } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalLeads: number
  newLeads: number
  activeCampaigns: number
  replyRate: number
  credits: number
  recentLeads: Array<{
    id: string
    companyName: string
    company_name: string
    city: string
    source: string
    score: number
    status: string
    createdAt: string
  }>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics/overview')
      .then(data => setStats(data))
      .catch(() => setStats({
        totalLeads: 0, newLeads: 0, activeCampaigns: 0,
        replyRate: 0, credits: user?.creditsTotal || 50, recentLeads: []
      }))
      .finally(() => setLoading(false))
  }, [user])

  const kpis = [
    {
      label: 'Toplam Lead',
      value: stats?.totalLeads || 0,
      sub: `+${stats?.newLeads || 0} bu hafta`,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Aktif Kampanya',
      value: stats?.activeCampaigns || 0,
      sub: 'Çalışıyor',
      icon: Megaphone,
      color: 'purple',
    },
    {
      label: 'Cevap Oranı',
      value: `${stats?.replyRate || 0}%`,
      sub: 'Ortalama',
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Kalan Kredi',
      value: (user?.creditsTotal || 0) - (user?.creditsUsed || 0),
      sub: `/ ${user?.creditsTotal || 50} toplam`,
      icon: Zap,
      color: 'orange',
    },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }

  const sourceLabel: Record<string, string> = {
    google_maps: 'Google Maps',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    manual: 'Manuel',
  }

  const statusColor: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-300',
    contacted: 'bg-yellow-500/20 text-yellow-300',
    replied: 'bg-green-500/20 text-green-300',
    won: 'bg-emerald-500/20 text-emerald-300',
    lost: 'bg-red-500/20 text-red-300',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Merhaba, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">İşte bugünkü özet</p>
        </div>
        <Link
          href="/leads/scrape"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition"
        >
          <Plus size={18} />
          Lead Topla
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">{label}</span>
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{loading ? '—' : value}</p>
            <p className="text-slate-500 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Leads */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-white font-semibold">Son Leadler</h2>
          <Link href="/leads" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm">
            Tümünü gör <ArrowUpRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
        ) : stats?.recentLeads.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Henüz lead yok</p>
            <Link href="/leads/scrape" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
              İlk lead'ini topla →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {stats?.recentLeads.map(lead => (
              <div key={lead.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/30 transition">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">
                  {(lead.companyName || lead.company_name || '?')[0]}

                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{lead.companyName || lead.company_name}</p>
                  <p className="text-slate-400 text-sm">{lead.city} · {sourceLabel[lead.source] || lead.source}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{lead.score}/100</p>
                    <p className="text-slate-500 text-xs">Puan</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[lead.status] || 'bg-slate-700 text-slate-300'}`}>
                    {lead.status === 'new' ? 'Yeni' :
                     lead.status === 'contacted' ? 'İletişime Geçildi' :
                     lead.status === 'replied' ? 'Cevap Verdi' :
                     lead.status === 'won' ? 'Kazanıldı' : 'Kaybedildi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/leads/scrape" className="bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 rounded-xl p-5 transition group">
          <Users size={24} className="text-blue-400 mb-3" />
          <h3 className="text-white font-medium">Lead Topla</h3>
          <p className="text-slate-400 text-sm mt-1">Google Maps ve Instagram'dan otomatik topla</p>
        </Link>
        <Link href="/campaigns" className="bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 rounded-xl p-5 transition group">
          <Megaphone size={24} className="text-purple-400 mb-3" />
          <h3 className="text-white font-medium">Kampanya Başlat</h3>
          <p className="text-slate-400 text-sm mt-1">WhatsApp ve email ile otomatik mesaj gönder</p>
        </Link>
        <Link href="/billing" className="bg-slate-800/50 border border-slate-700 hover:border-orange-500/50 rounded-xl p-5 transition group">
          <Zap size={24} className="text-orange-400 mb-3" />
          <h3 className="text-white font-medium">Kredi Yükle</h3>
          <p className="text-slate-400 text-sm mt-1">Daha fazla lead için kredi satın al</p>
        </Link>
      </div>
    </div>
  )
}
