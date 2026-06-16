'use client'
import { useState } from 'react'
import { ShoppingBag, Code, Users, Building2, Store, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'

const CASES = [
  {
    id: 'ecommerce',
    label: 'E-Ticaret',
    icon: ShoppingBag,
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    headline: 'Tedarikçi ve bayi ağınızı otomatik büyütün',
    pain: 'Yeni bayi, distribütör veya toptan müşteri bulmak zaman ve para harcıyor. Manuel araştırma sonuç vermiyor.',
    solution: 'Google Maps\'ten hedef sektördeki firmaları otomatik toplayın. WhatsApp ve email ile kişiselleştirilmiş teklif gönderin.',
    result: '%340 dönüşüm artışı, aylık 120+ yeni bayi başvurusu',
    steps: ['Sektör & şehir filtrele', 'Lead\'leri otomatik tara', 'Toplu teklif gönder', 'Sipariş al'],
  },
  {
    id: 'saas',
    label: 'SaaS / Yazılım',
    icon: Code,
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    headline: 'Demo sayınızı 3 katına çıkarın',
    pain: 'Potansiyel müşterilere ulaşmak, satış ekibi kurmak veya ajans tutmak pahalı ve yavaş.',
    solution: 'LinkedIn\'den karar vericileri bulun, AI ile kişiselleştirilmiş ürün tantıtımı yapın, demo rezervasyonu alın.',
    result: '2x demo artışı, SDR maliyetini %80 azaltma',
    steps: ['Karar vericiyi bul', 'Ürün faydası anlat', 'Demo al', 'Sözleşme imzala'],
  },
  {
    id: 'agency',
    label: 'Ajans',
    icon: Users,
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    headline: 'Yeni müşteri kazanımını otomatize edin',
    pain: 'Müşteri adayı bulmak, teklif hazırlamak ve takip etmek, iş yapılabilecek zamanı yiyor.',
    solution: 'Hedef sektördeki firmaları otomatik bulun, hizmetlerinizi tanıtan kişisel email gönderisi yapın, teklif sürecini kısaltın.',
    result: 'Ayda 60 saat tasarruf, %40 daha fazla teklif verme kapasitesi',
    steps: ['Potansiyel müşteriyi bul', 'Hizmet sunumu gönder', 'Teklif hazırla', 'Anlaşmayı kapat'],
  },
  {
    id: 'kobi',
    label: 'KOBİ',
    icon: Building2,
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    headline: 'SDR ekibi maliyeti olmadan kurumsal büyüme',
    pain: 'Satış temsilcisi işe almak ve eğitmek pahalı; mevcut ekip zaten yoğun.',
    solution: 'Sovlo, tam zamanlı satış asistanı gibi çalışır. Hedef kitleye ulaşır, ilgilileri filtreler, sıcak leadleri ekibinize yönlendirir.',
    result: 'SDR maliyetinin onda biri, 3x daha fazla aktif lead',
    steps: ['Hedef tanımla', 'AI tara & filtrele', 'Sıcak lead\'i al', 'Satışı kapat'],
  },
  {
    id: 'franchise',
    label: 'Franchise',
    icon: Store,
    color: '#dc2626',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    headline: 'Yeni franchise ortağı bulmayı otomatize edin',
    pain: 'Girişimci adaylarına ulaşmak, sistematik takip ve nitelik değerlendirmesi zaman alıyor.',
    solution: 'Potansiyel franchise adaylarını coğrafi ve demografik filtreyle bulun. Otomatik bilgi paketi ve başvuru sürecini başlatın.',
    result: 'Yıllık 12+ yeni franchise noktası açılışı',
    steps: ['Coğrafi hedef seç', 'Aday profilini bul', 'Bilgi paketi gönder', 'Görüşme yap'],
  },
] as const

export default function LandingUseCases() {
  const [active, setActive] = useState(0)
  const c = CASES[active]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold mb-6">
              Her Sektör İçin
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Sizin için{' '}
              <span className="gradient-text-blue">özelleştirilmiş</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              E-ticaretten SaaS'a, ajanslardan KOBİ'lere — her iş modeli için kanıtlanmış stratejiler.
            </p>
          </div>
        </Reveal>

        {/* Tab navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CASES.map((c, i) => {
            const Icon = c.icon
            return (
              <button
                key={c.id}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  active === i
                    ? 'text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={active === i ? { background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` } : {}}
              >
                <Icon size={14} />
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div key={c.id} className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left */}
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${c.bg} border ${c.border} text-[12px] font-semibold mb-5`}
              style={{ color: c.color }}>
              <c.icon size={13} />
              {c.label}
            </div>

            <h3 className="text-[26px] lg:text-[30px] font-black text-slate-900 leading-[1.2] tracking-[-0.02em] mb-5">
              {c.headline}
            </h3>

            <div className="mb-6">
              <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Problem</div>
              <p className="text-[15px] text-slate-600 leading-relaxed">{c.pain}</p>
            </div>

            <div className="mb-6">
              <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Çözüm</div>
              <p className="text-[15px] text-slate-700 leading-relaxed font-medium">{c.solution}</p>
            </div>

            <div className="p-4 rounded-xl border mb-8" style={{ borderColor: `${c.color}30`, background: `${c.color}08` }}>
              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: c.color }}>Sonuç</div>
              <div className="text-[15px] font-semibold text-slate-800">{c.result}</div>
            </div>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-[14px] font-bold btn-glow"
              style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)` }}
            >
              {c.label} için başla
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Right — steps */}
          <div className="flex flex-col gap-3">
            {c.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)` }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <span className="text-[15px] font-semibold text-slate-800">{step}</span>
                {i < c.steps.length - 1 && (
                  <ArrowRight size={14} className="text-slate-300 ml-auto flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
