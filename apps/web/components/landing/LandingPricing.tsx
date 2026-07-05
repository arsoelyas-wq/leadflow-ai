'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, X, ArrowRight, Zap, TrendingUp, BarChart2, Star } from 'lucide-react'
import Reveal from './Reveal'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    desc: 'Küçük ekipler ve bireysel satışçılar için',
    monthlyPrice: 79,
    annualPrice: 63,
    credits: '1,000',
    rollover: '1 ay',
    color: '#2563eb',
    popular: false,
    ctaHref: '/register?plan=starter',
    features: [
      { text: '1.000 kredi/ay (1 ay rollover)', included: true },
      { text: 'WhatsApp Kampanya — 1 numara', included: true },
      { text: 'Email Kampanya sınırsız', included: true },
      { text: 'Lead Scraper (Google Maps)', included: true },
      { text: 'AI Mesaj Kişiselleştirme', included: true },
      { text: 'Pipeline CRM', included: true },
      { text: 'QR Üretici & Teklif/Fatura', included: true },
      { text: 'AI Sesli Arama', included: false },
      { text: 'AI Video Outreach', included: false },
      { text: 'Ekip Yönetimi', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: TrendingUp,
    desc: 'Büyüyen satış ekipleri ve ajanslar için',
    monthlyPrice: 199,
    annualPrice: 159,
    credits: '5,000',
    rollover: '2 ay',
    color: '#7c3aed',
    popular: true,
    ctaHref: '/register?plan=growth',
    features: [
      { text: '5.000 kredi/ay (2 ay rollover)', included: true },
      { text: 'WhatsApp — 3 numara sınırsız', included: true },
      { text: 'Email + SMS Kampanya', included: true },
      { text: 'Sequence & Workflow Otomasyon', included: true },
      { text: 'A/B Test & Akıllı Zamanlama', included: true },
      { text: 'Meta + Google Reklam Yönetimi', included: true },
      { text: 'AI Sesli Arama (kredi ile)', included: true },
      { text: 'Ekip — 5 koltuk + Roller', included: true },
      { text: 'AI Video Outreach', included: false },
      { text: 'White-Label', included: false },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    icon: BarChart2,
    desc: 'Kurumsal ekipler ve büyük hacimler için',
    monthlyPrice: 499,
    annualPrice: 399,
    credits: '20,000',
    rollover: '3 ay',
    color: '#d97706',
    popular: false,
    ctaHref: '/register?plan=scale',
    features: [
      { text: '20.000 kredi/ay (3 ay rollover)', included: true },
      { text: 'WhatsApp — 15 numara sınırsız', included: true },
      { text: 'Sınırsız Sequence & Workflow', included: true },
      { text: 'AI Sesli Arama + Ses Klonlama', included: true },
      { text: 'AI Video Outreach (kredi ile)', included: true },
      { text: 'AI Satış Koçu & Ekip Analizi', included: true },
      { text: 'API Erişimi (10K/gün)', included: true },
      { text: 'Ekip — 25 koltuk', included: true },
      { text: 'White-Label', included: false },
      { text: 'SLA Garantisi', included: false },
    ],
  },
]

export default function LandingPricing({ cfg }: { cfg?: any }) {
  const [annual, setAnnual] = useState(false)

  const badge        = cfg?.pricing_badge       || 'Şeffaf Fiyatlandırma'
  const headline     = cfg?.pricing_headline    || 'Gizli ücret yok,'
  const headlineGradient = cfg?.pricing_headline_gradient || (cfg?.pricing_headline ? '' : 'sürpriz yok')
  const subheadline  = cfg?.pricing_subheadline || 'Kullanılmayan krediler bir sonraki aya taşınır. Rakipler sıfırlıyor — biz taşıyoruz.'

  const plans = cfg?.plans?.length
    ? cfg.plans.map((p: any, i: number) => ({
        ...PLANS[i] || PLANS[0],
        monthlyPrice: Number(p.monthly_price) || PLANS[i]?.monthlyPrice || 0,
        annualPrice:  Number(p.annual_price)  || PLANS[i]?.annualPrice  || 0,
        features: p.features?.length
          ? p.features.map((f: any) => ({ text: f.text || f, included: f.included !== false && f.inc !== false }))
          : PLANS[i]?.features || [],
      }))
    : PLANS

  return (
    <section id="fiyatlar" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-semibold mb-6">
              {badge}
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              {headline}
              {headlineGradient && <>{' '}<span className="gradient-text-blue">{headlineGradient}</span></>}
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              {subheadline}
            </p>
          </Reveal>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-[14px] font-semibold ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Aylık</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${annual ? 'bg-violet-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${annual ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[14px] font-semibold ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
              Yıllık
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                %20 indirim
              </span>
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan: any) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice
            const Icon = plan.icon
            const annualTotal = plan.annualPrice * 12
            const savings = (plan.monthlyPrice - plan.annualPrice) * 12

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
                  plan.popular
                    ? 'border-violet-200 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white text-[11px] font-bold text-center py-1.5 tracking-wide uppercase flex items-center justify-center gap-1">
                    <Star size={9} fill="currentColor" /> ÖNERİLEN
                  </div>
                )}

                <div className={`p-7 ${plan.popular ? 'pt-10' : ''}`}>
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}12`, border: `1px solid ${plan.color}25` }}>
                      <Icon size={18} style={{ color: plan.color }} />
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-slate-900">{plan.name}</div>
                      <div className="text-[12px] text-slate-400">{plan.desc}</div>
                    </div>
                  </div>

                  {/* Credit badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-4" style={{ background: `${plan.color}10`, color: plan.color, border: `1px solid ${plan.color}20` }}>
                    {plan.credits} kredi/ay · {plan.rollover} rollover
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[18px] text-slate-400 font-medium">$</span>
                    <span className="text-[44px] font-black text-slate-900 leading-none tracking-tight">
                      {price}
                    </span>
                    <span className="text-[15px] text-slate-400">/mo</span>
                  </div>

                  {annual ? (
                    <div className="text-[12px] text-emerald-600 font-semibold mb-4">
                      ${annualTotal}/yr — ${savings} tasarruf
                    </div>
                  ) : (
                    <div className="text-[12px] text-slate-400 mb-4">
                      Yıllık ${plan.annualPrice}/mo ile ${savings} tasarruf edin
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={plan.ctaHref}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold transition-all duration-200"
                    style={plan.popular ? {
                      background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                      color: 'white',
                      boxShadow: `0 6px 20px -4px ${plan.color}50`,
                    } : {
                      background: `${plan.color}10`,
                      color: plan.color,
                      border: `1px solid ${plan.color}25`,
                    }}
                  >
                    {plan.name} Başla
                    <ArrowRight size={14} />
                  </Link>

                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    14 gün ücretsiz · Kredi kartı gerekmez
                  </p>
                </div>

                {/* Features */}
                <div className="px-7 pb-7 flex-1 border-t border-slate-100 pt-5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Neler dahil</div>
                  <div className="flex flex-col gap-2.5">
                    {plan.features.map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {f.included ? (
                          <CheckCircle size={14} style={{ color: plan.color, flexShrink: 0 }} />
                        ) : (
                          <X size={14} className="text-slate-300 flex-shrink-0" />
                        )}
                        <span className={`text-[13px] ${f.included ? 'text-slate-700' : 'text-slate-400'}`}>
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Competitor comparison strip */}
        <Reveal>
          <div className="mt-8 p-5 bg-white rounded-2xl border border-slate-200 grid sm:grid-cols-4 gap-4">
            {[
              { label: 'Apollo Pro + WA aracı + Email', price: '~$300+/ay', bad: true },
              { label: 'Sovlo Growth — hepsi dahil', price: '$199/ay', bad: false },
              { label: 'Kredi rollover (rakipler sıfırlıyor)', price: '2 ay taşınır', bad: false },
              { label: 'WhatsApp mesajı', price: 'Sınırsız ücretsiz', bad: false },
            ].map(c => (
              <div key={c.label} className="flex items-start gap-2">
                <span className="text-[14px] mt-0.5">{c.bad ? '🔴' : '✅'}</span>
                <div>
                  <p className="text-[11px] text-slate-500">{c.label}</p>
                  <p className={`text-[13px] font-bold ${c.bad ? 'text-red-500' : 'text-emerald-600'}`}>{c.price}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Enterprise */}
        <div className="mt-6 p-6 lg:p-8 bg-slate-900 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-5">
          <div>
            <div className="text-[18px] font-bold text-white mb-1">Enterprise</div>
            <p className="text-[14px] text-slate-400">
              Sınırsız kredi, white-label, özel SLA, dedicated account manager. Büyük ekipler için özel fiyat.
            </p>
          </div>
          <a
            href="mailto:enterprise@sovlo.io"
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 text-[14px] font-bold hover:bg-slate-100 transition-colors"
          >
            Bize Ulaşın
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}
