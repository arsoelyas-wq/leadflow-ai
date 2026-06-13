const INTEGRATIONS = [
  { name: 'Google Maps', color: '#4285F4' },
  { name: 'WhatsApp Business', color: '#25D366' },
  { name: 'Meta / Facebook', color: '#1877F2' },
  { name: 'Instagram', color: '#E4405F' },
  { name: 'LinkedIn', color: '#0A66C2' },
  { name: 'Gmail / Google', color: '#EA4335' },
  { name: 'HubSpot CRM', color: '#FF7A59' },
  { name: 'Zapier', color: '#FF4A00' },
] as const

function IntegrationCard({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap">
        {name}
      </span>
    </div>
  )
}

export default function LandingIntegrations() {
  return (
    <section id="entegrasyonlar" className="py-14 bg-white overflow-hidden border-t border-slate-100">
      <p className="text-center text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-8">
        Mevcut Araçlarınızla Entegre Çalışır
      </p>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="flex animate-marquee will-change-transform gap-3 w-max px-3">
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
            <IntegrationCard key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
