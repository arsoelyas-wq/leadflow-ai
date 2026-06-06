'use client'

const LOGOS = [
  'Türk Tekstil A.Ş.', 'Metro Yapı Ltd.', 'Digital GmbH',
  'SaaS Startup TR', 'E-Ticaret Pro', 'Fintexco Ltd.',
  'Pazarlama360', 'TechSoft A.Ş.', 'GlobalTrade TR',
  'Ankara Dijital', 'İstanbul SaaS', 'EuroAgency GmbH',
]

function LogoItem({ name }: { name: string }) {
  const colors = [
    'text-blue-700 bg-blue-50 border-blue-100',
    'text-violet-700 bg-violet-50 border-violet-100',
    'text-emerald-700 bg-emerald-50 border-emerald-100',
    'text-slate-700 bg-slate-50 border-slate-200',
    'text-rose-700 bg-rose-50 border-rose-100',
    'text-amber-700 bg-amber-50 border-amber-100',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className={`flex-shrink-0 px-5 py-2.5 rounded-xl border text-[13px] font-semibold tracking-tight whitespace-nowrap ${colors[idx]}`}>
      {name}
    </div>
  )
}

export default function LandingLogoBar() {
  const doubled = [...LOGOS, ...LOGOS]

  return (
    <section className="py-14 border-y border-slate-100 bg-slate-50/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="text-center text-[13px] text-slate-400 font-medium tracking-wide uppercase">
          2,847+ firma tarafından güvenilir
        </p>
      </div>

      <div className="relative">
        {/* Fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgb(248,250,252), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgb(248,250,252), transparent)' }} />

        {/* Marquee */}
        <div className="flex animate-marquee will-change-transform gap-3 w-max">
          {doubled.map((name, i) => (
            <LogoItem key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  )
}
