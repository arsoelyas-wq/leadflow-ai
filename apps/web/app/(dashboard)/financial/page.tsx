'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Zap, BarChart3, MapPin, ArrowUp, ArrowDown } from 'lucide-react'

export default function FinancialPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics/financial')
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

  const maxLeads = Math.max(...(data.monthlyTrend?.map((m: any) => m.leads) || [1]), 1)
  const maxMessages = Math.max(...(data.monthlyTrend?.map((m: any) => m.messages) || [1]), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={24} className="text-emerald-400" />
          Finansal Büyüme Zekası
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Büyüme trendleri, kaynak verimliliği ve akıllı tahminler</p>
      </div>

      {/* KPI'lar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Büyüme Hızı',
            value: `${data.growth.rate > 0 ? '+' : ''}${data.growth.rate}%`,
            sub: `${data.growth.lastMonth} → ${data.growth.thisMonth} lead`,
            color: data.growth.rate > 0 ? 'text-emerald-400' : data.growth.rate < 0 ? 'text-red-400' : 'text-slate-300',
            icon: data.growth.rate > 0 ? TrendingUp : TrendingDown,
            iconColor: data.growth.rate > 0 ? 'text-emerald-400' : 'text-red-400',
          },
          {
            label: 'Aylık Hedef',
            value: `%${data.target.progress}`,
            sub: `${data.target.current}/${data.target.monthly} lead`,
            color: data.target.progress >= 100 ? 'text-emerald-400' : data.target.progress >= 50 ? 'text-yellow-400' : 'text-red-400',
            icon: Target,
            iconColor: 'text-blue-400',
          },
          {
            label: 'Lead Başına Maliyet',
            value: `${data.creditEfficiency.costPerLead} kredi`,
            sub: `${data.creditEfficiency.used} kredi kullanıldı`,
            color: 'text-slate-300',
            icon: DollarSign,
            iconColor: 'text-yellow-400',
          },
          {
            label: 'Churn Riski',
            value: data.churnRisk.total,
            sub: `${data.churnRisk.staleLeads} takılı, ${data.churnRisk.coldLeads} soğuk`,
            color: data.churnRisk.total > 10 ? 'text-red-400' : 'text-yellow-400',
            icon: AlertTriangle,
            iconColor: 'text-red-400',
          },
        ].map(({ label, value, sub, color, icon: Icon, iconColor }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <Icon size={18} className={`${iconColor} mb-3`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-sm mt-1">{label}</p>
            <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Aylık Trend */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">6 Aylık Lead & Mesaj Trendi</h2>
          <div className="flex items-end gap-2 h-32">
            {data.monthlyTrend?.map((month: any) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: '90px' }}>
                  <div className="flex-1 bg-blue-500/70 hover:bg-blue-500 rounded-t transition-all"
                    style={{ height: `${Math.max((month.leads / maxLeads) * 100, month.leads > 0 ? 5 : 1)}%` }} />
                  <div className="flex-1 bg-green-500/70 hover:bg-green-500 rounded-t transition-all"
                    style={{ height: `${Math.max((month.messages / maxMessages) * 100, month.messages > 0 ? 5 : 1)}%` }} />
                </div>
                <span className="text-slate-500 text-xs">{month.month}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500/70 rounded-sm" /><span className="text-slate-400 text-xs">Lead</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500/70 rounded-sm" /><span className="text-slate-400 text-xs">Mesaj</span></div>
          </div>
        </div>

        {/* Hedef */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Bu Ay Hedef</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke={data.target.progress >= 100 ? '#10b981' : data.target.progress >= 50 ? '#f59e0b' : '#3b82f6'}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - data.target.progress / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-2xl font-bold">%{data.target.progress}</span>
                <span className="text-slate-400 text-xs">tamamlandı</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Hedef</span><span className="text-white font-bold">{data.target.monthly} lead</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Mevcut</span><span className="text-blue-400 font-bold">{data.target.current} lead</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Kalan</span><span className="text-slate-300">{Math.max(0, data.target.monthly - data.target.current)} lead</span></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Kaynak Performansı */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" /> Kaynak ROI Analizi
          </h2>
          <div className="space-y-3">
            {data.sourcePerformance?.slice(0, 6).map((src: any) => (
              <div key={src.source}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 text-xs truncate max-w-40">{src.source}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">{src.total} lead</span>
                    <span className={`font-bold ${src.conversionRate > 10 ? 'text-emerald-400' : src.conversionRate > 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                      %{src.conversionRate}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${src.conversionRate > 10 ? 'bg-emerald-500' : src.conversionRate > 0 ? 'bg-yellow-500' : 'bg-slate-600'}`}
                    style={{ width: `${Math.max(src.conversionRate * 3, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Şehir Analizi + Churn */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MapPin size={15} className="text-purple-400" /> Şehir Performansı
            </h2>
            <div className="space-y-2">
              {data.topCities?.map((city: any) => (
                <div key={city.city} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{city.city}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">{city.total}</span>
                    <span className={city.rate > 0 ? 'text-emerald-400' : 'text-slate-500'}>%{city.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Churn Risk */}
          {data.churnRisk.total > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <h2 className="text-red-300 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={15} /> Aksiyon Gereken Leadler
              </h2>
              <div className="space-y-2 text-sm">
                {data.churnRisk.staleLeads > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">30+ gün takılı</span>
                    <span className="text-red-400 font-bold">{data.churnRisk.staleLeads}</span>
                  </div>
                )}
                {data.churnRisk.coldLeads > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">60+ gün soğuk</span>
                    <span className="text-yellow-400 font-bold">{data.churnRisk.coldLeads}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Finansal Tavsiye */}
      {data.financialAdvice && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" /> AI Finansal Büyüme Tavsiyesi
          </h2>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-2">
              {data.financialAdvice.advice?.map((a: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold text-sm shrink-0">{i + 1}.</span>
                  <p className="text-slate-300 text-sm">{a}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {data.financialAdvice.priority && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-xs font-medium mb-1">🎯 Öncelik</p>
                  <p className="text-slate-300 text-xs">{data.financialAdvice.priority}</p>
                </div>
              )}
              {data.financialAdvice.forecast && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-400 text-xs font-medium mb-1">📈 Tahmin</p>
                  <p className="text-slate-300 text-xs">{data.financialAdvice.forecast}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}