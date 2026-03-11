'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, Users, Megaphone, Zap, MessageSquare, Mail, Target } from 'lucide-react'

interface Overview {
  totalLeads: number
  newLeads: number
  replyRate: number
  activeCampaigns: number
  credits: number
  totalSent: number
  totalReplied: number
  sourceBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
  channelStats: { whatsapp: number; email: number }
  topCampaigns: { name: string; total_sent: number; total_replied: number; channel: string }[]
}

const statusLabel: Record<string, string> = {
  new: 'Yeni', contacted: 'İletişime Geçildi', qualified: 'Nitelikli',
  replied: 'Cevap Verdi', offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi'
}
const statusColor: Record<string, string> = {
  new: 'bg-blue-500', contacted: 'bg-yellow-500', qualified: 'bg-cyan-500',
  replied: 'bg-green-500', offered: 'bg-purple-500', won: 'bg-emerald-500', lost: 'bg-red-500'
}
const sourceLabel: Record<string, string> = {
  'Google Maps': 'Google Maps', 'google_maps': 'Google Maps',
  'WhatsApp Gelen': 'WhatsApp Gelen', 'manual': 'Manuel', 'instagram': 'Instagram'
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics/overview')
      .then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total = Math.max(data?.totalLeads || 1, 1)
  const conversionRate = data?.totalSent
    ? Math.round(((data?.totalReplied || 0) / data.totalSent) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analitik</h1>
        <p className="text-slate-400 mt-1 text-sm">Detaylı performans raporu</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Lead', value: data?.totalLeads || 0, sub: `+${data?.newLeads || 0} bu hafta`, icon: Users, color: 'blue' },
          { label: 'Gönderilen', value: data?.totalSent || 0, sub: `${data?.activeCampaigns || 0} aktif kampanya`, icon: Megaphone, color: 'green' },
          { label: 'Cevap Oranı', value: `%${conversionRate}`, sub: `${data?.totalReplied || 0} cevap`, icon: TrendingUp, color: 'purple' },
          { label: 'Kalan Kredi', value: data?.credits || 0, sub: 'kullanılabilir', icon: Zap, color: 'orange' },
        ].map(({ label, value, sub, icon: Icon, color }) => {
          const c: any = {
            blue: 'bg-blue-500/10 text-blue-400',
            green: 'bg-green-500/10 text-green-400',
            purple: 'bg-purple-500/10 text-purple-400',
            orange: 'bg-orange-500/10 text-orange-400',
          }
          return (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg mb-3 flex items-center justify-center ${c[color]}`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-slate-400 text-sm mt-0.5">{label}</p>
              <p className="text-slate-500 text-xs mt-1">{sub}</p>
            </div>
          )
        })}
      </div>

      {/* Kanal İstatistikleri */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
            <MessageSquare size={22} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{data?.channelStats?.whatsapp || 0}</p>
            <p className="text-slate-400 text-sm">WhatsApp Mesajı</p>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Mail size={22} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{data?.channelStats?.email || 0}</p>
            <p className="text-slate-400 text-sm">Email Gönderildi</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Kaynak Dağılımı */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Kaynak Dağılımı</h2>
          <div className="space-y-4">
            {Object.entries(data?.sourceBreakdown || {}).map(([src, count]) => (
              <div key={src}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300 text-sm">{sourceLabel[src] || src}</span>
                  <span className="text-slate-400 text-sm">{count} — %{Math.round((count / total) * 100)}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.max((count / total) * 100, 2)}%` }} />
                </div>
              </div>
            ))}
            {!Object.keys(data?.sourceBreakdown || {}).length && (
              <p className="text-slate-500 text-sm text-center py-6">Henüz veri yok</p>
            )}
          </div>
        </div>

        {/* Lead Durumu */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Lead Durumu</h2>
          <div className="space-y-4">
            {Object.entries(data?.statusBreakdown || {}).map(([st, count]) => (
              <div key={st}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300 text-sm">{statusLabel[st] || st}</span>
                  <span className="text-slate-400 text-sm">{count} — %{Math.round((count / total) * 100)}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className={`${statusColor[st] || 'bg-slate-500'} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.max((count / total) * 100, 2)}%` }} />
                </div>
              </div>
            ))}
            {!Object.keys(data?.statusBreakdown || {}).length && (
              <p className="text-slate-500 text-sm text-center py-6">Henüz veri yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Satış Hunisi */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-6">Satış Hunisi</h2>
        <div className="flex items-end gap-3 h-44">
          {['new', 'contacted', 'qualified', 'replied', 'offered', 'won'].map(st => {
            const count = data?.statusBreakdown?.[st] || 0
            const pct = (count / total) * 100
            return (
              <div key={st} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-white text-sm font-bold">{count}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div className={`w-full rounded-t-lg ${statusColor[st] || 'bg-slate-600'} transition-all opacity-80 hover:opacity-100`}
                    style={{ height: `${Math.max(pct, count > 0 ? 6 : 2)}%` }} />
                </div>
                <span className="text-slate-400 text-xs text-center leading-tight">{statusLabel[st]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Kampanyalar */}
      {data?.topCampaigns && data.topCampaigns.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Target size={16} className="text-blue-400" />
            En İyi Kampanyalar
          </h2>
          <div className="space-y-3">
            {data.topCampaigns.map((c, i) => {
              const rate = c.total_sent > 0 ? Math.round((c.total_replied / c.total_sent) * 100) : 0
              return (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{c.name}</p>
                      <p className="text-slate-500 text-xs">{c.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-white font-semibold">{c.total_sent}</p>
                      <p className="text-slate-500 text-xs">Gönderildi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-emerald-400 font-semibold">%{rate}</p>
                      <p className="text-slate-500 text-xs">Cevap</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}