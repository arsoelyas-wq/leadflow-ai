'use client'
import { useState } from 'react'
import {
  Target, Bot, MessageSquare, BarChart3,
  Crosshair, TrendingUp, Search, Mail,
  Smartphone, Globe, Workflow, ShieldCheck,
  Zap, Eye, Video, Phone
} from 'lucide-react'
import Reveal from './Reveal'

const TABS = ['Tümü', 'Lead Bulma', 'İletişim', 'Analitik', 'AI Araçlar'] as const
type Tab = typeof TABS[number]

const FEATURES = [
  {
    icon: Target,
    title: 'Akıllı Lead Toplama',
    desc: 'Google Maps, Instagram ve 50+ kaynaktan hedef sektöre göre günde 1,000+ firma otomatik toplanır.',
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    tags: ['Lead Bulma'] as Tab[],
  },
  {
    icon: Bot,
    title: 'AI Kişiselleştirme',
    desc: 'Gelişmiş yapay zeka ile her müşteriye özel, doğal görünen mesajlar. Spam değil, gerçek konuşma.',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    tags: ['AI Araçlar', 'İletişim'] as Tab[],
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp & Email',
    desc: 'WhatsApp Business API, email ve LinkedIn\'den aynı anda kampanya yürüt. Tek platform, çoklu kanal.',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    tags: ['İletişim'] as Tab[],
  },
  {
    icon: BarChart3,
    title: 'Pipeline & CRM',
    desc: 'Tüm satış aşamalarını takip et. Sıcak leadleri anında gör, kaçan fırsatları yakalama.',
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    tags: ['Analitik'] as Tab[],
  },
  {
    icon: Crosshair,
    title: 'Karar Verici Bulma',
    desc: 'AI ile CEO, Satış Direktörü ve karar vericileri bul. LinkedIn entegrasyonu ile direkt ulaş.',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-100',
    tags: ['Lead Bulma', 'AI Araçlar'] as Tab[],
  },
  {
    icon: TrendingUp,
    title: 'Gelişmiş Analitik',
    desc: 'Kampanya performansı, dönüşüm oranları, ROI takibi. Hangi kanalın işe yaradığını bilin.',
    color: '#0891b2',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    tags: ['Analitik'] as Tab[],
  },
  {
    icon: Video,
    title: 'Video Outreach',
    desc: 'AI avatar ile kişiselleştirilmiş satış videoları oluştur, otomatik olarak gönder.',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    tags: ['İletişim', 'AI Araçlar'] as Tab[],
  },
  {
    icon: Workflow,
    title: 'Satış Otomasyonu',
    desc: 'Tetikleyici tabanlı workflow\'lar kur. Lead geldiğinde otomatik mesaj, takip ve hatırlatma.',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    tags: ['AI Araçlar'] as Tab[],
  },
  {
    icon: Globe,
    title: 'Çok Dilli Pazar Sayfaları',
    desc: '14 ülkede yerelleştirilmiş landing page\'ler oluştur. Her pazar için ayrı içerik ve fiyatlandırma.',
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    tags: ['Lead Bulma'] as Tab[],
  },
  {
    icon: Phone,
    title: 'AI Sesli Outreach',
    desc: 'Yapay zeka ile otomatik sesli aramalar yapın. Doğal ses, kişisel dokunuş, ölçeklenebilir.',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-100',
    tags: ['İletişim', 'AI Araçlar'] as Tab[],
  },
  {
    icon: Eye,
    title: 'Meta Intent & Retargeting',
    desc: 'Instagram ve Facebook\'taki potansiyel müşterileri tespit et. CAPI entegrasyonu ile hedef.',
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    tags: ['Lead Bulma', 'Analitik'] as Tab[],
  },
  {
    icon: ShieldCheck,
    title: 'KVKK & GDPR Uyumlu',
    desc: 'Türk ve AB veri mevzuatına tam uyumlu. Veri güvenliği ve şeffaflık ön planda.',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    tags: ['Tümü'] as Tab[],
  },
]

export default function LandingFeatures() {
  const [activeTab, setActiveTab] = useState<Tab>('Tümü')

  const filtered = activeTab === 'Tümü'
    ? FEATURES
    : FEATURES.filter(f => f.tags.includes(activeTab))

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
              Lead bulmadan kapatmaya, her aşamada AI destekli araçlar. Rakipleriniz manuel çalışırken siz büyüyün.
            </p>
          </div>
        </Reveal>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(({ icon: Icon, title, desc, color, bg, border }) => (
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
