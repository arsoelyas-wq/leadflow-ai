'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, Users, Megaphone, Zap } from 'lucide-react'

interface Overview {
  totalLeads: number
  newLeads: number
  replyRate: number
  activeCampaigns: number
  credits: number
  sourceBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
}

const sourceLabel: Record<string, string> = {
  google_maps: 'Google Maps', instagram: 'Instagram',
  linkedin: 'LinkedIn', manual: 'Manuel'
}
const statusLabel: Record<string, string> = {
  new: 'Yeni', contacted: 'İletişime Geçildi', replied: 'Cevap Verdi',
  offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi'
}
const statusColor: Record<string, string> = {
  new: 'bg-blue-500', contacted: 'bg-yellow-500', replied: 'bg-green-500',
  offered: 'bg-purple-500', won: 'bg-emerald-500', lost: 'bg-red-500'
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
      <div className="text-slate-400">Yükleniyor...</div>
    </div>
  )

  const total = data?.totalLeads || 1

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analitik</h1>
        <p className="text-slate-400 mt-1">Performans özeti</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Lead', value: data?.totalLeads || 0, icon: Users, color: 'blue' },
          { label: 'Bu Hafta', value: data?.newLeads || 0, icon: TrendingUp, color: 'green' },
          { label: 'Cevap Oranı', value: `${data?.replyRate || 0}%`, icon: Megaphone, color: 'purple' },
          { label: 'Kalan Kredi', value: data?.credits || 0, icon: Zap, color: 'orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className={`w-9 h-9 rounded-lg mb-3 flex items-center justify-center
              ${color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                color === 'green' ? 'bg-green-500/10 text-green-400' :
                color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                'bg-orange-500/10 text-orange-400'}`}>
              <Icon size={16} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-slate-400 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Kaynak Dağılımı */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-6">Kaynak Dağılımı</h2>
          <div className="space-y-4">
            {Object.entries(data?.sourceBreakdown || {}).map(([src, count]) => (
              <div key={src}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 text-sm">{sourceLabel[src] || src}</span>
                  <span className="text-slate-400 text-sm">{count} ({Math.round((count / total) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(count / total) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(data?.sourceBreakdown || {}).length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Henüz veri yok</p>
            )}
          </div>
        </div>

        {/* Durum Dağılımı */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-6">Lead Durumu</h2>
          <div className="space-y-4">
            {Object.entries(data?.statusBreakdown || {}).map(([st, count]) => (
              <div key={st}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 text-sm">{statusLabel[st] || st}</span>
                  <span className="text-slate-400 text-sm">{count} ({Math.round((count / total) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className={`${statusColor[st] || 'bg-slate-500'} h-2 rounded-full transition-all`}
                    style={{ width: `${(count / total) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(data?.statusBreakdown || {}).length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Henüz veri yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-6">Satış Hunisi</h2>
        <div className="flex items-end gap-2 h-40">
          {['new', 'contacted', 'replied', 'offered', 'won'].map(st => {
            const count = data?.statusBreakdown?.[st] || 0
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={st} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-white text-sm font-bold">{count}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div className={`w-full rounded-t-lg ${statusColor[st] || 'bg-slate-600'} transition-all`}
                    style={{ height: `${Math.max(4, pct)}%`, minHeight: count > 0 ? '8px' : '4px' }} />
                </div>
                <span className="text-slate-400 text-xs text-center">{statusLabel[st]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}