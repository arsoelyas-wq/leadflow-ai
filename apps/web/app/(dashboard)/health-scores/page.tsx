'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Heart, RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default function HealthPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/health-scores/scores').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center h-64 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div>

  const { leads = [], summary = {} } = data || {}

  const stageLabel: Record<string, string> = {
    musteri: '🏆 Müşteri', teklif_asamasi: '📋 Teklif', ilgili: '⚡ İlgili', iletisimde: '💬 Temas', yeni: '🆕 Yeni'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart size={24} className="text-pink-400" /> Müşteri Başarı Skoru
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Her lead için sağlık skoru, churn riski ve öneriler</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ort. Skor', value: `${summary.avgScore || 0}/100`, color: 'text-white' },
          { label: 'Sıcak Leadler', value: summary.hotLeads || 0, color: 'text-emerald-400' },
          { label: 'Müşteriler', value: summary.customers || 0, color: 'text-blue-400' },
          { label: 'Churn Riski', value: summary.highRisk || 0, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Lead Listesi */}
      <div className="space-y-2">
        {leads.slice(0, 30).map((lead: any) => (
          <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            {/* Skor */}
            <div className="text-center w-16 shrink-0">
              <div className={`text-xl font-bold ${lead.health.score >= 70 ? 'text-emerald-400' : lead.health.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {lead.health.score}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                <div className={`h-1.5 rounded-full ${lead.health.score >= 70 ? 'bg-emerald-500' : lead.health.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${lead.health.score}%` }} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{lead.company_name}</p>
                <span className="text-xs text-slate-400">{stageLabel[lead.health.stage]}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span>📨 {lead.health.metrics.outbound} gönderildi</span>
                <span>💬 {lead.health.metrics.inbound} cevap</span>
                <span>📅 {lead.health.metrics.daysSinceLastContact}g önce</span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className={`text-xs px-2 py-1 rounded-full border ${
                lead.health.churnRisk === 'yuksek' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
                lead.health.churnRisk === 'orta' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' :
                'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }`}>
                {lead.health.churnRisk === 'yuksek' ? '⚠️ Yüksek Risk' : lead.health.churnRisk === 'orta' ? '⚡ Orta Risk' : '✅ Düşük Risk'}
              </span>
              <p className="text-slate-500 text-xs mt-1">{lead.health.recommendation?.slice(0, 40)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}