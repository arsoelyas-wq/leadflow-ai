'use client'
import {
  Target, Phone, MessageSquare, BarChart3,
  Workflow, TrendingUp, Zap, Activity, CheckCircle2
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

const FEATURES = [
  {
    icon: Target,
    title: 'Akıllı Lead Toplama',
    desc: 'Google Maps ve 50+ kaynaktan günde 1,000+ hedef firma otomatik toplanır. Sektör ve lokasyona göre filtrele.',
    color: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-100',
  },
  {
    icon: Phone,
    title: 'AI Sesli Ajan',
    desc: 'Lead gelir gelmez 5 dakika içinde AI ajan otomatik arar. Ses klonunuzla Türkçe konuşur, randevu ayarlar.',
    color: '#dc2626', bg: 'bg-red-50', border: 'border-red-100',
  },
  {
    icon: BarChart3,
    title: 'Pipeline & CRM',
    desc: 'Sıcak leadleri anında gör, satış aşamalarını takip et, teklif gönder. Fırsatları asla kaçırma.',
    color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-100',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp & Email',
    desc: 'WhatsApp Business API ve email ile aynı anda kişiselleştirilmiş kampanya. Tek platform, çoklu kanal.',
    color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-100',
  },
  {
    icon: Workflow,
    title: 'Satış Otomasyonu',
    desc: 'Lead geldiğinde otomatik mesaj, takip hatırlatması ve workflow — insan müdahalesi gerekmez.',
    color: '#7c3aed', bg: 'bg-violet-50', border: 'border-violet-100',
  },
  {
    icon: TrendingUp,
    title: 'Gerçek Zamanlı Analitik',
    desc: 'CPL, ROAS, CTR anlık takip. Hangi kampanyanın kazandığını görün, bütçeyi doğru yere kaydırın.',
    color: '#0891b2', bg: 'bg-cyan-50', border: 'border-cyan-100',
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
          <div className="mb-6 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0F2D6B 0%, #1040A5 45%, #1A3A7A 100%)' }}>
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            {/* Glow */}
            <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 60%)', transform: 'translate(30%, 30%)' }} />

            <div className="relative p-8 lg:p-12">
              <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12 items-center">

                {/* Left: copy */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 0 0 rgba(74,222,128,0.7)', animation: 'metaPulse 2s ease-in-out infinite' }} />
                    <span className="text-[11.5px] font-bold text-green-400 tracking-widest uppercase">7/24 Algoritma Eğitimi Aktif</span>
                  </div>
                  <h3 className="text-[28px] lg:text-[36px] font-black text-white leading-[1.1] tracking-tight mb-4">
                    Her Satışınız Meta'ya<br />Ders Verir
                  </h3>
                  <p className="text-blue-200 text-[15.5px] leading-relaxed mb-8 max-w-lg">
                    Sovlo, her satış ve görüşmeyi sunucu tarafından anında Meta'ya sinyal olarak iletir.
                    Algoritma müşteri profilinizi öğrenir —{' '}
                    <strong className="text-white font-semibold">reklam giderek daha ucuza, daha doğru kişilere ulaşır.</strong>
                  </p>
                  <div className="space-y-3">
                    {META_BULLETS.map(bullet => (
                      <div key={bullet} className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[14px] text-blue-100 leading-snug">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: stats */}
                <div className="mt-10 lg:mt-0 grid grid-cols-3 lg:grid-cols-1 gap-4">
                  {META_STATS.map(s => (
                    <div key={s.lbl} className="rounded-2xl p-5 text-center lg:text-left" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div className="text-[32px] lg:text-[38px] font-black text-white leading-none tracking-tight mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                      <div className="text-[13px] font-bold text-blue-200 mb-0.5">{s.lbl}</div>
                      <div className="text-[11px] text-blue-400">{s.sub}</div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </Reveal>

        {/* Supporting features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <Reveal key={title}>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm card-hover group h-full">
                <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={18} style={{ color }} />
                </div>
                <h3 className="text-[16px] font-bold text-slate-900 mb-2 leading-snug">{title}</h3>
                <p className="text-[14px] text-slate-500 leading-relaxed">{desc}</p>
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
