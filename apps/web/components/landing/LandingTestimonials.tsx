'use client'
import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Mehmet Arslan',
    role: 'CEO',
    company: 'Türk Tekstil A.Ş.',
    sector: 'Tekstil & Konfeksiyon',
    country: 'İstanbul',
    avatar: 'MA',
    color: '#2563eb',
    bg: 'bg-blue-100',
    quote: 'LeadFlow AI sayesinde aylık 3,000+ lead topluyoruz ve %40 dönüşüm sağladık. Satış ekibimizin verimliliği 3 kat arttı. Gerçekten oyun değiştirici.',
    result: '3,000+ lead/ay',
    stars: 5,
  },
  {
    name: 'Sarah Mueller',
    role: 'Managing Director',
    company: 'Digital Solutions GmbH',
    sector: 'Dijital Ajans',
    country: 'Berlin, Almanya',
    avatar: 'SM',
    color: '#7c3aed',
    bg: 'bg-violet-100',
    quote: 'The German market expansion was seamless with LeadFlow. We found decision-makers we never could have reached manually. Our pipeline grew 280% in 3 months.',
    result: '%280 pipeline artışı',
    stars: 5,
  },
  {
    name: 'Ahmet Kaya',
    role: 'Co-Founder',
    company: 'SaaS Startup TR',
    sector: 'B2B SaaS',
    country: 'Ankara',
    avatar: 'AK',
    color: '#059669',
    bg: 'bg-emerald-100',
    quote: 'İlk 2 haftada 50 demo aldık. Daha önce SDR tutmayı düşünüyorduk ama LeadFlow tamamen o ihtiyacı karşıladı. Maliyetimiz %80 düştü.',
    result: '50 demo / ilk 2 hafta',
    stars: 5,
  },
  {
    name: 'Fatma Yılmaz',
    role: 'Satış Direktörü',
    company: 'EuroTrade İthalat Ltd.',
    sector: 'İthalat & İhracat',
    country: 'İzmir',
    avatar: 'FY',
    color: '#d97706',
    bg: 'bg-amber-100',
    quote: 'Avrupa\'daki tedarikçilere ulaşmak için LeadFlow\'u denedik. İlk ay 200+ kaliteli kontakt, ikinci ay sözleşmeler başladı. Harika araç.',
    result: '200+ kontakt / ilk ay',
    stars: 5,
  },
  {
    name: 'Burak Şahin',
    role: 'Franchise Koordinatörü',
    company: 'FastFood Franchise Grup',
    sector: 'Franchise & Gıda',
    country: 'İstanbul',
    avatar: 'BŞ',
    color: '#dc2626',
    bg: 'bg-rose-100',
    quote: 'Yeni franchise adayı bulmak artık çok kolay. LeadFlow ile hedef profilde 500+ aday belirledik, 12\'si sözleşme imzaladı. ROI muhteşem.',
    result: '12 yeni franchise noktası',
    stars: 5,
  },
  {
    name: 'Elif Demirtaş',
    role: 'Genel Müdür',
    company: 'Medya Ajansı Pro',
    sector: 'Reklam & Medya',
    country: 'Bursa',
    avatar: 'ED',
    color: '#0891b2',
    bg: 'bg-cyan-100',
    quote: 'WhatsApp kampanyalarımızın açılma oranı %67\'ye çıktı. Müşterilerimiz mesajların spam olmadığını, kişisel göründüğünü söylüyor. AI kişiselleştirmesi harika çalışıyor.',
    result: '%67 açılma oranı',
    stars: 5,
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

export default function LandingTestimonials() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[13px] font-semibold mb-6">
            <Star size={13} className="fill-amber-500 text-amber-500" />
            Müşteri Yorumları
          </div>
          <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
            Gerçek firmalar,{' '}
            <span className="gradient-text-blue">gerçek sonuçlar</span>
          </h2>
          <p className="text-[17px] text-slate-500 leading-relaxed">
            Türkiye, Almanya ve daha fazla ülkeden 2,847+ firma bize güveniyor.
          </p>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="break-inside-avoid bg-white rounded-2xl border border-slate-200 p-6 shadow-sm card-hover"
            >
              {/* Quote icon */}
              <Quote size={24} className="text-slate-200 mb-3" />

              {/* Stars */}
              <Stars count={t.stars} />

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
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-[28px] font-black text-slate-900">4.9 / 5</div>
            <div className="flex justify-center mb-1"><Stars count={5} /></div>
            <div className="text-[12px] text-slate-400">Ortalama puan</div>
          </div>
          <div className="w-px h-12 bg-slate-200 hidden sm:block" />
          <div className="text-center">
            <div className="text-[28px] font-black text-slate-900">2,847+</div>
            <div className="text-[12px] text-slate-400">Aktif firma</div>
          </div>
          <div className="w-px h-12 bg-slate-200 hidden sm:block" />
          <div className="text-center">
            <div className="text-[28px] font-black text-slate-900">14</div>
            <div className="text-[12px] text-slate-400">Ülke</div>
          </div>
          <div className="w-px h-12 bg-slate-200 hidden sm:block" />
          <div className="text-center">
            <div className="text-[28px] font-black text-slate-900">%98</div>
            <div className="text-[12px] text-slate-400">Tavsiye oranı</div>
          </div>
        </div>
      </div>
    </section>
  )
}
