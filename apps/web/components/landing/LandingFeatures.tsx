'use client'
import {
  Target, Phone, BarChart3, TrendingUp,
  Activity, CheckCircle2, Check
} from 'lucide-react'
import Reveal from './Reveal'

const META_BULLETS = [
  'Her satış anında Meta\'ya sinyal gönderir — siz uyurken bile çalışır',
  'Algoritma müşteri profilinizi öğrenir, zamanla daha doğru kişilere ulaşır',
  'Aynı bütçeyle daha fazla lead — CPL otomatik olarak düşer',
  'Autopilot: ölü kampanyayı durdurur, bütçeyi kazanana kaydırır',
  'Haftalık lookalike kitle — en iyi %20 müşterinize benzer yeni kitle',
]

const META_STATS = [
  { val: '↓ %40', lbl: 'CPL Düşüşü', sub: '3. ayda ortalama' },
  { val: '2.4×', lbl: 'ROAS Artışı', sub: '6 ay içinde' },
  { val: '↑ %60', lbl: 'CTR İyileşmesi', sub: 'Lookalike ile' },
]

const STEPS = [
  {
    num: '01',
    icon: Target,
    title: 'Müşteri Bul',
    desc: 'Google Maps, Instagram ve 50+ kaynaktan her gün hedef müşterileri otomatik toplayın. Sektör, lokasyon ve firma büyüklüğüne göre filtreleyin.',
    bullets: [
      'Günde 1,000+ potansiyel müşteri otomatik toplanır',
      'AI ile CEO ve karar verici tespiti',
      'Meta reklamdan gelen leadler anında sisteme düşer',
    ],
    accent: '#2563eb',
    accentBg: 'rgba(37,99,235,0.07)',
    accentBorder: 'rgba(37,99,235,0.18)',
    numColor: 'rgba(37,99,235,0.08)',
  },
  {
    num: '02',
    icon: Phone,
    title: 'Otomatik Ulaş',
    desc: 'Lead gelir gelmez 5 dakika içinde AI ajan arar. Ses klonunuzla doğal Türkçe görüşme yapar, WhatsApp ve email ile takibi sürdürür.',
    bullets: [
      '5 dakika kuralı — sıcak lead kaçmadan aranır',
      'Ses klonunuzla kişisel, doğal konuşma',
      'WhatsApp & email otomatik takip dizileri',
    ],
    accent: '#dc2626',
    accentBg: 'rgba(220,38,38,0.07)',
    accentBorder: 'rgba(220,38,38,0.18)',
    numColor: 'rgba(220,38,38,0.08)',
  },
  {
    num: '03',
    icon: BarChart3,
    title: 'Satışı Kapat',
    desc: 'Tüm leadleri tek ekranda takip edin. Hangi aşamada kim var, teklifiniz gönderildi mi, anlaşma kapandı mı — hepsini görün.',
    bullets: [
      'Kanban pipeline — aşama aşama görsel takip',
      'Teklif ve fatura tek tıkla oluşturma',
      'Kaçan fırsatlar için otomatik uyarı',
    ],
    accent: '#d97706',
    accentBg: 'rgba(217,119,6,0.07)',
    accentBorder: 'rgba(217,119,6,0.18)',
    numColor: 'rgba(217,119,6,0.08)',
  },
  {
    num: '04',
    icon: TrendingUp,
    title: 'Sonucu Gör, Büyü',
    desc: 'CPL, ROAS, dönüşüm oranı — neyin işe yaradığını gerçek zamanlı bilin. Meta algoritması öğrendikçe maliyetleriniz düşer, sonuçlarınız artar.',
    bullets: [
      'CPL, ROAS, CTR anlık takip paneli',
      'Hangi kanalın kazandırdığını görün',
      'Haftalık performans raporu — WhatsApp\'a düşer',
    ],
    accent: '#059669',
    accentBg: 'rgba(5,150,105,0.07)',
    accentBorder: 'rgba(5,150,105,0.18)',
    numColor: 'rgba(5,150,105,0.08)',
  },
]

export default function LandingFeatures({ cfg }: { cfg?: any }) {
  return (
    <section id="ozellikler" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <Reveal>
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[13px] font-semibold mb-6">
              <Activity size={13} />
              7/24 Aktif
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Meta Reklamınız{' '}
              <span className="gradient-text-blue">Kendi Kendine Öğrenir</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Her satışınız algoritmayı eğitir. Zamanla doğru müşterilere daha ucuza ulaşırsınız.
            </p>
          </div>
        </Reveal>

        {/* META ALGORITHM HERO CARD */}
        <Reveal>
          <div className="mb-10 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0F2D6B 0%, #1040A5 45%, #1A3A7A 100%)' }}>
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 60%)', transform: 'translate(30%, 30%)' }} />

            <div className="relative p-6 sm:p-8 lg:p-12">
              <div className="flex flex-col lg:grid lg:grid-cols-[1fr_260px] lg:gap-12 lg:items-center">
                {/* Copy */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ animation: 'metaPulse 2s ease-in-out infinite' }} />
                    <span className="text-[11px] font-bold text-green-400 tracking-widest uppercase">7/24 Algoritma Eğitimi Aktif</span>
                  </div>
                  <h3 className="text-[24px] sm:text-[28px] lg:text-[34px] font-black text-white leading-[1.1] tracking-tight mb-3">
                    Her Satışınız Meta'ya Ders Verir
                  </h3>
                  <p className="text-blue-200 text-[14px] sm:text-[15px] leading-relaxed mb-6 max-w-lg">
                    Sovlo, her satış ve görüşmeyi sunucu tarafından anında Meta'ya sinyal olarak iletir.
                    Algoritma müşteri profilinizi öğrenir —{' '}
                    <strong className="text-white font-semibold">reklam giderek daha ucuza, daha doğru kişilere ulaşır.</strong>
                  </p>
                  <div className="space-y-2.5">
                    {META_BULLETS.map(bullet => (
                      <div key={bullet} className="flex items-start gap-2.5">
                        <CheckCircle2 size={15} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[13.5px] text-blue-100 leading-snug">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Stats — horizontal scroll on mobile, vertical on desktop */}
                <div className="mt-6 lg:mt-0 grid grid-cols-3 lg:grid-cols-1 gap-3">
                  {META_STATS.map(s => (
                    <div key={s.lbl} className="rounded-xl p-3 sm:p-4 lg:p-5 text-center lg:text-left" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div className="text-[22px] sm:text-[28px] lg:text-[36px] font-black text-white leading-none tracking-tight mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                      <div className="text-[11px] sm:text-[12px] font-bold text-blue-200 mb-0.5">{s.lbl}</div>
                      <div className="hidden sm:block text-[10px] text-blue-400">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 4-step cards — 1 col mobile, 2×2 on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {STEPS.map(({ num, icon: Icon, title, desc, bullets, accent, accentBg, accentBorder, numColor }) => (
            <Reveal key={num}>
              <div className="relative bg-white rounded-2xl border border-slate-100 p-7 shadow-sm overflow-hidden h-full" style={{ transition: 'box-shadow .2s, transform .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 36px rgba(0,0,0,0.09)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = '' }}
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: accent }} />

                {/* Faint background number */}
                <div className="absolute bottom-3 right-5 text-[100px] font-black leading-none select-none pointer-events-none" style={{ color: numColor, letterSpacing: '-0.05em' }}>{num}</div>

                <div className="relative">
                  {/* Step badge + icon */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accentBg, border: `1.5px solid ${accentBorder}` }}>
                      <Icon size={20} style={{ color: accent }} />
                    </div>
                    <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: accent }}>Adım {num}</span>
                  </div>

                  <h3 className="text-[20px] font-black text-slate-900 mb-3 tracking-tight">{title}</h3>
                  <p className="text-[14.5px] text-slate-500 leading-relaxed mb-5">{desc}</p>

                  <div className="space-y-2.5">
                    {bullets.map(b => (
                      <div key={b} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: accentBg }}>
                          <Check size={11} style={{ color: accent }} strokeWidth={3} />
                        </div>
                        <span className="text-[13.5px] text-slate-600 leading-snug">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes metaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7); }
          50% { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
        }
      `}</style>
    </section>
  )
}
