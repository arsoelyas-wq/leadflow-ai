'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, X, ArrowRight, Zap, TrendingUp, Crown } from 'lucide-react'
import Reveal from './Reveal'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    desc: 'Küçük ekipler ve bireysel satışçılar için',
    monthlyPrice: 99,
    annualPrice: 79,
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    cta: 'Ücretsiz Başla',
    ctaHref: '/register',
    popular: false,
    features: [
      { text: '500 kredi / ay', included: true },
      { text: 'WhatsApp kampanya', included: true },
      { text: 'Email kampanya', included: true },
      { text: 'Lead scraper (Google Maps)', included: true },
      { text: 'AI mesaj kişiselleştirme', included: true },
      { text: 'Pipeline yönetimi', included: true },
      { text: 'Temel analitik', included: true },
      { text: 'Video outreach', included: false },
      { text: 'AI sesli arama', included: false },
      { text: 'Whitelabel', included: false },
      { text: 'API erişimi', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: TrendingUp,
    desc: 'Büyüyen satış ekipleri ve ajanslar için',
    monthlyPrice: 199,
    annualPrice: 159,
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    cta: 'Growth Başla',
    ctaHref: '/register?plan=growth',
    popular: true,
    features: [
      { text: '2,000 kredi / ay', included: true },
      { text: 'WhatsApp kampanya', included: true },
      { text: 'Email & SMS kampanya', included: true },
      { text: 'Lead scraper (50+ kaynak)', included: true },
      { text: 'AI mesaj kişiselleştirme', included: true },
      { text: 'Pipeline + CRM', included: true },
      { text: 'Gelişmiş analitik & ROI', included: true },
      { text: 'Video outreach (AI avatar)', included: true },
      { text: 'AI sesli arama', included: false },
      { text: 'Whitelabel', included: false },
      { text: 'API erişimi', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Crown,
    desc: 'Kurumsal ekipler ve büyük hacimler için',
    monthlyPrice: 399,
    annualPrice: 319,
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    cta: 'Pro Başla',
    ctaHref: '/register?plan=pro',
    popular: false,
    features: [
      { text: '10,000 kredi / ay', included: true },
      { text: 'WhatsApp kampanya', included: true },
      { text: 'Email, SMS & LinkedIn', included: true },
      { text: 'Lead scraper (sınırsız)', included: true },
      { text: 'AI + karar verici bulma', included: true },
      { text: 'Pipeline + Tam CRM', included: true },
      { text: 'Gelişmiş analitik & raporlama', included: true },
      { text: 'Video outreach (AI avatar)', included: true },
      { text: 'AI sesli arama', included: true },
      { text: 'Whitelabel', included: true },
      { text: 'API + Webhook erişimi', included: true },
    ],
  },
]

export default function LandingPricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="fiyatlar" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-semibold mb-6">
              Şeffaf Fiyatlandırma
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Gizli ücret yok,{' '}
              <span className="gradient-text-blue">sürpriz yok</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Her plan 14 gün ücretsiz deneme ile başlar. İstediğiniz zaman yükseltin veya iptal edin.
            </p>
          </Reveal>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-[14px] font-semibold ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Aylık</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${annual ? 'bg-blue-600' : 'bg-slate-200'}`}
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

        {/* Plans */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {PLANS.map(plan => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice
            const Icon = plan.icon

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
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white text-[11px] font-bold text-center py-1.5 tracking-wide uppercase">
                    En Popüler
                  </div>
                )}

                <div className={`p-7 ${plan.popular ? 'pt-10' : ''}`}>
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${plan.bg} border ${plan.border} flex items-center justify-center`}>
                      <Icon size={18} style={{ color: plan.color }} />
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-slate-900">{plan.name}</div>
                      <div className="text-[12px] text-slate-400">{plan.desc}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[15px] text-slate-400 font-medium">₺</span>
                    <span className="text-[44px] font-black text-slate-900 leading-none tracking-tight">
                      {price}
                    </span>
                    <span className="text-[15px] text-slate-400">/ay</span>
                  </div>

                  {annual && (
                    <div className="text-[12px] text-emerald-600 font-semibold mb-4">
                      Yıllık ₺{plan.annualPrice * 12} — ₺{(plan.monthlyPrice - plan.annualPrice) * 12} tasarruf
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={plan.ctaHref}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold transition-all duration-200 mt-5"
                    style={plan.popular ? {
                      background: `linear-gradient(135deg, ${plan.color}, ${plan.color}bb)`,
                      color: 'white',
                      boxShadow: `0 6px 20px -4px ${plan.color}50`,
                    } : {
                      background: `${plan.color}10`,
                      color: plan.color,
                      border: `1px solid ${plan.color}25`,
                    }}
                  >
                    {plan.cta}
                    <ArrowRight size={14} />
                  </Link>

                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    14 gün ücretsiz · Kredi kartı gerekmez
                  </p>
                </div>

                {/* Features */}
                <div className="px-7 pb-7 flex-1 border-t border-slate-100 pt-5 mt-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Neler dahil
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {f.included ? (
                          <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
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

        {/* Enterprise */}
        <div className="mt-8 p-6 lg:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-5">
          <div>
            <div className="text-[18px] font-bold text-slate-900 mb-1">Enterprise</div>
            <p className="text-[14px] text-slate-500">
              Büyük ekipler, sınırsız kredi, özel destek, SLA ve kurumsal güvenlik için bizimle konuşun.
            </p>
          </div>
          <a
            href="mailto:destek@leadflow.ai"
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 transition-colors"
          >
            Bize Ulaşın
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}
