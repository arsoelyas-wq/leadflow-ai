'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Heart, RefreshCw } from 'lucide-react'

// ── Per-language text ─────────────────────────────────────────────────────────
const HS: Record<string, Record<string, string>> = {
  tr: {
    title: 'Müşteri Başarı Skoru',
    subtitle: 'Her lead için sağlık skoru, churn riski ve öneriler',
    avg: 'Ort. Skor', hot: 'Sıcak Leadler', customers: 'Müşteriler', churn: 'Churn Riski',
    sent: 'gönderildi', replied: 'cevap', ago: 'g önce',
    high: 'Yüksek Risk', mid: 'Orta Risk', low: 'Düşük Risk',
    stage_musteri: '🏆 Müşteri', stage_teklif: '📋 Teklif', stage_ilgili: '⚡ İlgili',
    stage_iletisimde: '💬 Temas', stage_yeni: '🆕 Yeni',
  },
  de: {
    title: 'Kundenerfolgs-Score',
    subtitle: 'Gesundheitsscore, Abwanderungsrisiko und Empfehlungen für jeden Lead',
    avg: 'Ø Score', hot: 'Heiße Leads', customers: 'Kunden', churn: 'Abwanderungsrisiko',
    sent: 'gesendet', replied: 'Antworten', ago: 'T. vorhin',
    high: 'Hohes Risiko', mid: 'Mittleres Risiko', low: 'Niedriges Risiko',
    stage_musteri: '🏆 Kunde', stage_teklif: '📋 Angebot', stage_ilgili: '⚡ Interessiert',
    stage_iletisimde: '💬 Kontakt', stage_yeni: '🆕 Neu',
  },
  ru: {
    title: 'Оценка успеха клиента',
    subtitle: 'Оценка здоровья, риск оттока и рекомендации для каждого лида',
    avg: 'Ср. оценка', hot: 'Горячие лиды', customers: 'Клиенты', churn: 'Риск оттока',
    sent: 'отправлено', replied: 'ответов', ago: 'д. назад',
    high: 'Высокий риск', mid: 'Средний риск', low: 'Низкий риск',
    stage_musteri: '🏆 Клиент', stage_teklif: '📋 Предложение', stage_ilgili: '⚡ Заинтересован',
    stage_iletisimde: '💬 Контакт', stage_yeni: '🆕 Новый',
  },
  en: {
    title: 'Customer Success Score',
    subtitle: 'Health score, churn risk and recommendations for every lead',
    avg: 'Avg Score', hot: 'Hot Leads', customers: 'Customers', churn: 'Churn Risk',
    sent: 'sent', replied: 'replies', ago: 'd ago',
    high: 'High Risk', mid: 'Medium Risk', low: 'Low Risk',
    stage_musteri: '🏆 Customer', stage_teklif: '📋 Proposal', stage_ilgili: '⚡ Interested',
    stage_iletisimde: '💬 Contact', stage_yeni: '🆕 New',
  },
  fr: {
    title: 'Score de réussite client',
    subtitle: 'Score de santé, risque de désabonnement et recommandations pour chaque lead',
    avg: 'Score moy.', hot: 'Leads chauds', customers: 'Clients', churn: 'Risque désabonnement',
    sent: 'envoyé', replied: 'réponses', ago: 'j. avant',
    high: 'Risque élevé', mid: 'Risque moyen', low: 'Risque faible',
    stage_musteri: '🏆 Client', stage_teklif: '📋 Devis', stage_ilgili: '⚡ Intéressé',
    stage_iletisimde: '💬 Contact', stage_yeni: '🆕 Nouveau',
  },
  ar: {
    title: 'نقاط نجاح العميل',
    subtitle: 'نقاط الصحة، خطر المغادرة والتوصيات لكل عميل',
    avg: 'متوسط النقاط', hot: 'عملاء ساخنون', customers: 'عملاء', churn: 'خطر المغادرة',
    sent: 'أُرسل', replied: 'ردود', ago: 'ي. مضت',
    high: 'خطر عالٍ', mid: 'خطر متوسط', low: 'خطر منخفض',
    stage_musteri: '🏆 عميل', stage_teklif: '📋 عرض', stage_ilgili: '⚡ مهتم',
    stage_iletisimde: '💬 تواصل', stage_yeni: '🆕 جديد',
  },
}

export default function HealthPage() {
  const { lang } = useI18n()
  const L = HS[lang] || HS.tr

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/health-scores/scores').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center h-64 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div>

  const { leads = [], summary = {} } = data || {}

  const stageLabel: Record<string, string> = {
    musteri: L.stage_musteri,
    teklif_asamasi: L.stage_teklif,
    ilgili: L.stage_ilgili,
    iletisimde: L.stage_iletisimde,
    yeni: L.stage_yeni,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart size={24} className="text-pink-400" /> {L.title}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">{L.subtitle}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: L.avg,      value: `${(summary as any).avgScore || 0}/100`, color: 'text-white' },
          { label: L.hot,      value: (summary as any).hotLeads || 0,          color: 'text-emerald-400' },
          { label: L.customers,value: (summary as any).customers || 0,         color: 'text-blue-400' },
          { label: L.churn,    value: (summary as any).highRisk || 0,           color: 'text-red-400' },
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
                <span>📨 {lead.health.metrics.outbound} {L.sent}</span>
                <span>💬 {lead.health.metrics.inbound} {L.replied}</span>
                <span>📅 {lead.health.metrics.daysSinceLastContact}{L.ago}</span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className={`text-xs px-2 py-1 rounded-full border ${
                lead.health.churnRisk === 'yuksek' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
                lead.health.churnRisk === 'orta' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' :
                'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }`}>
                {lead.health.churnRisk === 'yuksek' ? `⚠️ ${L.high}` :
                 lead.health.churnRisk === 'orta'   ? `⚡ ${L.mid}`  : `✅ ${L.low}`}
              </span>
              <p className="text-slate-500 text-xs mt-1">{lead.health.recommendation?.slice(0, 40)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
