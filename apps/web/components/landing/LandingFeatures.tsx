import {
  Target, Bot, MessageSquare, BarChart3,
  TrendingUp, ShieldCheck, Zap
} from 'lucide-react'
import Reveal from './Reveal'

const FEATURES = [
  {
    icon: Target,
    title: 'Akıllı Lead Toplama',
    desc: 'Google Maps, Instagram ve 50+ kaynaktan hedef sektöre göre günde yüzlerce firma otomatik tespit edilir.',
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp & Email Kampanyaları',
    desc: 'WhatsApp Business API, email ve LinkedIn\'den aynı anda kampanya yürütün. Tek platform, çoklu kanal.',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Bot,
    title: 'Kişiselleştirilmiş Mesajlaşma',
    desc: 'Her müşteriye özel, doğal görünen mesajlar. Şablon değil — gerçek bir teklif gibi okunur.',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    icon: BarChart3,
    title: 'Pipeline & CRM',
    desc: 'Tüm satış aşamalarını tek ekranda takip edin. Sıcak leadleri anında görün, fırsat kaçırmayın.',
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: TrendingUp,
    title: 'Gelişmiş Analitik',
    desc: 'Kampanya performansı, dönüşüm oranları ve ROI takibi. Hangi kanalın işe yaradığını net görün.',
    color: '#0891b2',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
  {
    icon: ShieldCheck,
    title: 'KVKK & GDPR Uyumlu',
    desc: 'Türk ve AB veri mevzuatına tam uyumlu altyapı. Veri güvenliği ve şeffaflık her adımda ön planda.',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
]

export default function LandingFeatures() {
  return (
    <section id="ozellikler" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-[13px] font-semibold mb-6">
              <Zap size={13} />
              Özellikler
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Satışın her adımı{' '}
              <span className="gradient-text-blue">otomatik</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Lead bulmaktan kapatmaya, tüm süreç tek platformda işler. Rakipleriniz
              manuel çalışırken siz büyüyün.
            </p>
          </div>
        </Reveal>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm card-hover group"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="text-[16px] font-bold text-slate-900 mb-2 leading-snug">{title}</h3>
              <p className="text-[14px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
