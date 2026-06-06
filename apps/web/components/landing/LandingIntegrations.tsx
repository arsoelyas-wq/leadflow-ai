'use client'
import { Puzzle } from 'lucide-react'

const INTEGRATIONS = [
  { name: 'Google Maps', color: '#4285F4', icon: '📍' },
  { name: 'Meta / Facebook', color: '#1877F2', icon: '📘' },
  { name: 'Instagram', color: '#E4405F', icon: '📸' },
  { name: 'WhatsApp Business', color: '#25D366', icon: '💬' },
  { name: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  { name: 'Gmail / Google', color: '#EA4335', icon: '📧' },
  { name: 'Outlook / Microsoft', color: '#0078D4', icon: '📩' },
  { name: 'Green API', color: '#25D366', icon: '🟢' },
  { name: 'HeyGen AI', color: '#7C3AED', icon: '🎬' },
  { name: 'Twilio SMS', color: '#F22F46', icon: '📱' },
  { name: 'Google Ads', color: '#FBBC05', icon: '📢' },
  { name: 'HubSpot CRM', color: '#FF7A59', icon: '🔶' },
  { name: 'Zapier', color: '#FF4A00', icon: '⚡' },
  { name: 'Calendly', color: '#006BFF', icon: '📅' },
  { name: 'Perplexity AI', color: '#20B2AA', icon: '🔍' },
  { name: 'Claude AI', color: '#CC785C', icon: '🤖' },
] as const

function IntegrationCard({ name, color, icon }: { name: string; color: string; icon: string }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200 group">
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap group-hover:text-slate-900 transition-colors">
        {name}
      </span>
    </div>
  )
}

export default function LandingIntegrations() {
  const row1 = INTEGRATIONS.slice(0, 8)
  const row2 = INTEGRATIONS.slice(8)

  return (
    <section id="entegrasyonlar" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[13px] font-semibold mb-6">
            <Puzzle size={13} />
            Entegrasyonlar
          </div>
          <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
            Kullandığınız araçlarla{' '}
            <span className="gradient-text-blue">tam uyum</span>
          </h2>
          <p className="text-[17px] text-slate-500 leading-relaxed">
            50+ entegrasyon ile mevcut iş akışınıza hemen dahil olur. Sıfırdan başlamak yok.
          </p>
        </div>
      </div>

      {/* Row 1 — left to right */}
      <div className="relative mb-4">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="flex animate-marquee will-change-transform gap-3 w-max px-3">
          {[...row1, ...row1].map((item, i) => (
            <IntegrationCard key={`r1-${i}`} {...item} />
          ))}
        </div>
      </div>

      {/* Row 2 — right to left */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="flex animate-marquee-reverse will-change-transform gap-3 w-max px-3">
          {[...row2, ...row2].map((item, i) => (
            <IntegrationCard key={`r2-${i}`} {...item} />
          ))}
        </div>
      </div>

      {/* More count */}
      <div className="max-w-7xl mx-auto px-6 mt-8 text-center">
        <p className="text-[14px] text-slate-400 font-medium">
          ve{' '}
          <span className="text-blue-600 font-bold">34+ daha fazla</span>{' '}
          entegrasyon — Zapier üzerinden sınırsız genişletme
        </p>
      </div>
    </section>
  )
}
