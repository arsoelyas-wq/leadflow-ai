'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, TrendingDown, DollarSign, Users, MessageSquare, Target, Zap, ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface RevenueData {
  summary: {
    last30Leads: number
    last30Messages: number
    last30Replies: number
    replyRate: number
    leadGrowth: number
    messageGrowth: number
  }
  funnel: {
    total: number
    contacted: number
    qualified: number
    won: number
    contactRate: number
    qualifyRate: number
    winRate: number
  }
  revenue: {
    avgDealValue: number
    monthlyPotential: number
    nextMonthForecast: number
    projections: { month: string; leads: number; revenue: number; messages: number }[]
  }
  weeklyTrend: { week: string; leads: number; messages: number; replies: number }[]
  channelPerformance: { channel: string; sent: number; replies: number; replyRate: number; color: string }[]
  bestCampaign: { name: string; sent: number; replied: number; rate: number } | null
  recommendations: string[]
}

function GrowthBadge({ value }: { value: number }) {
  if (value > 0) return (
    <span className="flex items-center gap-1 text-emerald-400 text-xs">
      <ArrowUp size={11} />+{value}%
    </span>
  )
  if (value < 0) return (
    <span className="flex items-center gap-1 text-red-400 text-xs">
      <ArrowDown size={11} />{value}%
    </span>
  )
  return <span className="flex items-center gap-1 text-slate-500 text-xs"><Minus size={11} />0%</span>
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics/revenue')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return null

  const maxWeeklyLeads = Math.max(...(data.weeklyTrend?.map(w => w.leads) || [1]), 1)
  const maxWeeklyMessages = Math.max(...(data.weeklyTrend?.map(w => w.messages) || [1]), 1)
  const maxProjection = Math.max(...(data.revenue.projections?.map(p => p.revenue) || [1]), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign size={24} className="text-emerald-400" />
          Gelir Tahmini
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Son 90 günlük veriye dayalı gelir projeksiyonu</p>
      </div>

      {/* Ana KPI'lar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Son 30 Gün Lead',
            value: data.summary.last30Leads,
            growth: data.summary.leadGrowth,
            icon: Users, color: 'blue',
          },
          {
            label: 'Mesaj Gönderildi',
            value: data.summary.last30Messages,
            growth: data.summary.messageGrowth,
            icon: MessageSquare, color: 'green',
          },
          {
            label: 'Cevap Oranı',
            value: `%${data.summary.replyRate}`,
            growth: null,
            icon: TrendingUp, color: 'purple',
          },
          {
            label: 'Aylık Potansiyel',
            value: `₺${data.revenue.monthlyPotential.toLocaleString('tr-TR')}`,
            growth: null,
            icon: DollarSign, color: 'orange',
          },
        ].map(({ label, value, growth, icon: Icon, color }) => {
          const colors: any = {
            blue: 'bg-blue-500/10 text-blue-400',
            green: 'bg-green-500/10 text-green-400',
            purple: 'bg-purple-500/10 text-purple-400',
            orange: 'bg-orange-500/10 text-orange-400',
          }
          return (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg mb-3 flex items-center justify-center ${colors[color]}`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-slate-400 text-sm">{label}</p>
                {growth !== null && <GrowthBadge value={growth} />}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gelir Projeksiyonu */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-2">3 Aylık Gelir Projeksiyonu</h2>
          <p className="text-slate-500 text-xs mb-5">Ortalama anlaşma değeri: ₺{data.revenue.avgDealValue.toLocaleString('tr-TR')}</p>

          <div className="space-y-4">
            {data.revenue.projections.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300 text-sm font-medium">{p.month}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">{p.leads} lead</span>
                    <span className="text-emerald-400 font-bold">₺{p.revenue.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.max((p.revenue / maxProjection) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <p className="text-emerald-400 text-sm font-medium">
              🎯 Gelecek Ay Tahmini: ₺{data.revenue.nextMonthForecast.toLocaleString('tr-TR')}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Mevcut büyüme hızınıza göre hesaplanmıştır
            </p>
          </div>
        </div>

        {/* Satış Hunisi */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Satış Hunisi</h2>
          <div className="space-y-3">
            {[
              { label: 'Toplam Lead', value: data.funnel.total, rate: 100, color: 'bg-blue-500' },
              { label: 'İletişime Geçildi', value: data.funnel.contacted, rate: data.funnel.contactRate, color: 'bg-yellow-500' },
              { label: 'Nitelikli', value: data.funnel.qualified, rate: data.funnel.qualifyRate, color: 'bg-purple-500' },
              { label: 'Kazanıldı', value: data.funnel.won, rate: data.funnel.winRate, color: 'bg-emerald-500' },
            ].map(({ label, value, rate, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 text-xs">{label}</span>
                  <span className="text-white text-xs font-bold">{value} <span className="text-slate-500">(%{rate})</span></span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.max(rate, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">İletişim Oranı</span>
              <span className="text-white font-bold">%{data.funnel.contactRate}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Nitelendirme Oranı</span>
              <span className="text-white font-bold">%{data.funnel.qualifyRate}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Kazanma Oranı</span>
              <span className="text-emerald-400 font-bold">%{data.funnel.winRate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Haftalık Trend */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Haftalık Trend (13 Hafta)</h2>
          <div className="flex items-end gap-1 h-28">
            {data.weeklyTrend.slice(-10).map(({ week, leads, messages }) => (
              <div key={week} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: '80px' }}>
                  <div className="flex-1 bg-blue-500/60 hover:bg-blue-500 rounded-t transition-all"
                    style={{ height: `${Math.max((leads / maxWeeklyLeads) * 100, leads > 0 ? 5 : 1)}%` }} />
                  <div className="flex-1 bg-green-500/60 hover:bg-green-500 rounded-t transition-all"
                    style={{ height: `${Math.max((messages / maxWeeklyMessages) * 100, messages > 0 ? 5 : 1)}%` }} />
                </div>
                <span className="text-slate-600 text-xs">{week}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-blue-500/60 rounded-sm" />
              <span className="text-slate-400 text-xs">Lead</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-green-500/60 rounded-sm" />
              <span className="text-slate-400 text-xs">Mesaj</span>
            </div>
          </div>
        </div>

        {/* Kanal Performansı + Tavsiyeler */}
        <div className="space-y-4">
          {/* Kanal */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Kanal Performansı</h2>
            <div className="space-y-3">
              {data.channelPerformance.map(ch => (
                <div key={ch.channel}>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 text-sm">{ch.channel}</span>
                    <span className="text-white text-sm font-bold">%{ch.replyRate} <span className="text-slate-500 font-normal">cevap</span></span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(ch.replyRate, 1)}%`, backgroundColor: ch.color }} />
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">{ch.sent} gönderildi · {ch.replies} cevap</p>
                </div>
              ))}
            </div>

            {data.bestCampaign && (
              <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-xs font-medium mb-1">🏆 En İyi Kampanya</p>
                <p className="text-white text-sm">{data.bestCampaign.name}</p>
                <p className="text-slate-400 text-xs">%{data.bestCampaign.rate} cevap oranı · {data.bestCampaign.sent} gönderildi</p>
              </div>
            )}
          </div>

          {/* AI Tavsiyeler */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Zap size={15} className="text-yellow-400" /> AI Tavsiyeleri
            </h2>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-400 mt-0.5 shrink-0">→</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}