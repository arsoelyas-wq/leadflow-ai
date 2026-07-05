'use client'
import { Star, Quote, BadgeCheck } from 'lucide-react'
import Reveal from './Reveal'

const TESTIMONIALS = [
  {
    name: 'Mehmet A.',
    role: 'CEO & Kurucu',
    company: 'Tekstil Üreticisi',
    sector: 'Tekstil & Konfeksiyon',
    country: 'İstanbul',
    avatar: 'MA',
    color: '#2563eb',
    bg: 'bg-blue-100',
    quote: 'Sovlo ile aylık lead sayımız 8 kattan arttı. Satış ekibimiz artık bulma değil, kapatmaya odaklanıyor. İlk 3 ayda kendini 12 kat amorti etti.',
    result: '8x daha fazla lead/ay',
    stars: 5,
    verified: true,
  },
  {
    name: 'Sarah M.',
    role: 'Managing Director',
    company: 'Dijital Ajans',
    sector: 'B2B Dijital',
    country: 'Berlin, Almanya',
    avatar: 'SM',
    color: '#7c3aed',
    bg: 'bg-violet-100',
    quote: 'The German market expansion was seamless with Sovlo. We found decision-makers we never could have reached manually. Our pipeline grew significantly in 3 months.',
    result: 'Pipeline 3 ayda 4x büyüdü',
    stars: 5,
    verified: true,
  },
  {
    name: 'Ahmet K.',
    role: 'Co-Founder',
    company: 'B2B SaaS',
    sector: 'Yazılım',
    country: 'Ankara',
    avatar: 'AK',
    color: '#059669',
    bg: 'bg-emerald-100',
    quote: 'İlk 2 haftada 50 demo aldık. Daha önce SDR tutmayı düşünüyorduk ama Sovlo tamamen o ihtiyacı karşıladı. Maliyet olarak çok daha verimli.',
    result: '50 demo / ilk 2 hafta',
    stars: 5,
    verified: true,
  },
  {
    name: 'Fatma Y.',
    role: 'Satış Direktörü',
    company: 'İthalat & İhracat',
    sector: 'Dış Ticaret',
    country: 'İzmir',
    avatar: 'FY',
    color: '#d97706',
    bg: 'bg-amber-100',
    quote: 'Avrupa tedarikçilerine ulaşmak için Sovlo\'yu denedik. İlk ay 200+ nitelikli kontakt, ikinci aydan itibaren sözleşmeler başladı. Harika araç.',
    result: '200+ kontakt / ilk ay',
    stars: 5,
    verified: true,
  },
  {
    name: 'Burak S.',
    role: 'Franchise Koordinatörü',
    company: 'Gıda Franchisör',
    sector: 'Franchise & Gıda',
    country: 'İstanbul',
    avatar: 'BS',
    color: '#dc2626',
    bg: 'bg-rose-100',
    quote: 'Yeni franchise adayı bulmak artık çok kolay. Hedef profilde 500+ aday belirledik, 12\'si sözleşme imzaladı. ROI çok net görünüyor.',
    result: '12 yeni franchise noktası',
    stars: 5,
    verified: true,
  },
  {
    name: 'Elif D.',
    role: 'Pazarlama Müdürü',
    company: 'Medya & Reklam Ajansı',
    sector: 'Reklam & Medya',
    country: 'Bursa',
    avatar: 'ED',
    color: '#0891b2',
    bg: 'bg-cyan-100',
    quote: 'WhatsApp kampanyalarımızın açılma oranı önemli ölçüde arttı. Müşterilerimiz mesajların spam olmadığını, kişisel göründüğünü söylüyor.',
    result: 'WhatsApp kampanya açılması 3x arttı',
    stars: 5,
    verified: true,
  },
]

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
      ))}
    </div>
  )
}

export default function LandingTestimonials({ cfg }: { cfg?: any }) {
  const badge        = cfg?.testimonials_badge       || 'Müşteri Yorumları'
  const headline     = cfg?.testimonials_headline    || 'Gerçek firmalar,'
  const headlineGradient = cfg?.testimonials_headline_gradient || (cfg?.testimonials_headline ? '' : 'gerçek sonuçlar')
  const subheadline  = cfg?.testimonials_subheadline || 'Türkiye ve Avrupa\'dan 14 farklı sektörde kullanıcılarımız ne söylüyor.'

  const testimonials = cfg?.testimonials?.length
    ? cfg.testimonials.map((t: any, i: number) => ({
        ...TESTIMONIALS[i] || TESTIMONIALS[0],
        name:    t.name    || TESTIMONIALS[i]?.name    || '',
        role:    t.role    || TESTIMONIALS[i]?.role    || '',
        company: t.company || TESTIMONIALS[i]?.company || '',
        country: t.country || TESTIMONIALS[i]?.country || '',
        quote:   t.quote   || TESTIMONIALS[i]?.quote   || '',
        result:  t.result  || TESTIMONIALS[i]?.result  || '',
        stars:   t.stars   ?? TESTIMONIALS[i]?.stars   ?? 5,
        avatar:  t.name ? t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : (TESTIMONIALS[i]?.avatar || 'NA'),
      }))
    : TESTIMONIALS

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[13px] font-semibold mb-6">
              <Star size={13} className="fill-amber-500 text-amber-500" />
              {badge}
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              {headline}
              {headlineGradient && <>{' '}<span className="gradient-text-blue">{headlineGradient}</span></>}
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              {subheadline}
            </p>
          </div>
        </Reveal>

        {/* Masonry-style grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((t: any, idx: number) => (
            <div
              key={idx}
              className="break-inside-avoid bg-white rounded-2xl border border-slate-200 p-6 shadow-sm card-hover"
            >
              {/* Quote icon */}
              <Quote size={24} className="text-slate-200 mb-3" />

              {/* Stars + Verified */}
              <div className="flex items-center justify-between mb-1">
                <Stars count={t.stars} />
                {t.verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <BadgeCheck size={12} className="fill-emerald-100" />
                    Doğrulanmış müşteri
                  </span>
                )}
              </div>

              {/* Quote */}
              <p className="text-[14px] text-slate-600 leading-relaxed mt-3 mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Result badge */}
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-[12px] font-bold mb-4"
                style={{ background: `${t.color}12`, color: t.color }}
              >
                {t.result}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div
                  className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center text-[13px] font-black flex-shrink-0`}
                  style={{ color: t.color }}
                >
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-slate-900 leading-tight">{t.name}</div>
                  <div className="text-[12px] text-slate-400 truncate">
                    {t.role} · {t.company}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{t.country} · {t.sector}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <Reveal>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-[28px] font-black text-slate-900">4.8 / 5</div>
              <div className="flex justify-center mb-1"><Stars count={5} /></div>
              <div className="text-[12px] text-slate-400">Platform içi ortalama</div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden sm:block" />
            <div className="text-center">
              <div className="text-[28px] font-black text-slate-900">2,000+</div>
              <div className="text-[12px] text-slate-400">Aktif firma</div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden sm:block" />
            <div className="text-center">
              <div className="text-[28px] font-black text-slate-900">14</div>
              <div className="text-[12px] text-slate-400">Ülke</div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden sm:block" />
            <div className="text-center">
              <div className="text-[28px] font-black text-slate-900">%94</div>
              <div className="text-[12px] text-slate-400">Yenileme oranı</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
