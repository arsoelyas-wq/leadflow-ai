'use client'
import { Search, Send, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'

const STEPS = [
  {
    step: '01',
    icon: Search,
    title: 'Hedef Sektör & Lokasyon Seç',
    desc: 'Hangi sektör, hangi şehir, hangi büyüklükte firma istediğinizi belirleyin. LeadFlow geri kalanını halleder.',
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    detail: [
      'Google Maps scraping',
      'Instagram firma tespiti',
      '50+ veri kaynağı',
      'AI kalite skoru',
    ],
  },
  {
    step: '02',
    icon: Send,
    title: 'AI Kampanya Oluşturur',
    desc: 'Yapay zeka, her lead\'e özel mesaj yazar. Spam değil, gerçek bir iş teklifiymiş gibi görünen kişisel iletişim.',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    detail: [
      'Kişiselleştirilmiş mesaj',
      'WhatsApp Business API',
      'Email + LinkedIn',
      'Otomatik takip sekansı',
    ],
  },
  {
    step: '03',
    icon: TrendingUp,
    title: 'Sonuçları İzle & Büyü',
    desc: 'Canlı dashboard\'da cevapları, dönüşümleri ve ROI\'yi takip et. Hangi mesaj işe yarıyor, hemen gör.',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    detail: [
      'Gerçek zamanlı analitik',
      'Pipeline takibi',
      'A/B test desteği',
      'ROI raporu',
    ],
  },
]

export default function LandingHowItWorks() {
  return (
    <section id="nasil-calisir" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[13px] font-semibold mb-6">
              Nasıl Çalışır?
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              3 adımda tam{' '}
              <span className="gradient-text-blue">otomasyon</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Kurulum yok, teknik bilgi yok. Hesap açın, hedefi belirleyin, LeadFlow başlasın.
            </p>
          </div>
        </Reveal>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connector lines (desktop only) */}
          <div className="hidden lg:block absolute top-14 left-[33%] right-[33%] h-px"
            style={{ background: 'linear-gradient(to right, transparent, #cbd5e1, transparent)' }} />

          {STEPS.map(({ step, icon: Icon, title, desc, color, bg, border, detail }, i) => (
            <div key={step} className="relative">
              {/* Step card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm h-full flex flex-col">
                {/* Step number + icon */}
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <span
                    className="text-[42px] font-black leading-none tracking-tighter"
                    style={{ color: `${color}18` }}
                  >
                    {step}
                  </span>
                </div>

                <h3 className="text-[18px] font-bold text-slate-900 mb-3 leading-snug">{title}</h3>
                <p className="text-[14px] text-slate-500 leading-relaxed mb-5">{desc}</p>

                {/* Detail list */}
                <div className="mt-auto flex flex-col gap-2">
                  {detail.map((d, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[13px] text-slate-600 font-medium">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow between steps (mobile) */}
              {i < STEPS.length - 1 && (
                <div className="flex lg:hidden justify-center my-3">
                  <ArrowRight size={16} className="text-slate-300 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
          >
            Hemen Başla — Ücretsiz
            <ArrowRight size={15} />
          </Link>
          <p className="mt-3 text-[13px] text-slate-400">
            Ortalama kurulum süresi: <strong className="text-slate-600">8 dakika</strong>
          </p>
        </div>
      </div>
    </section>
  )
}
