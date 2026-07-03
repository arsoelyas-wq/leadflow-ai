'use client'

// Gerçek sektör rozetleri — müşteri sektörlerini gösterir, sahte şirket ismi değil
const SECTORS = [
  { label: 'Tekstil & Konfeksiyon',    color: 'text-blue-700 bg-blue-50 border-blue-100' },
  { label: 'İnşaat & Gayrimenkul',     color: 'text-violet-700 bg-violet-50 border-violet-100' },
  { label: 'İthalat & İhracat',        color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  { label: 'B2B SaaS',                 color: 'text-slate-700 bg-slate-50 border-slate-200' },
  { label: 'Dijital Ajans',            color: 'text-rose-700 bg-rose-50 border-rose-100' },
  { label: 'E-Ticaret',                color: 'text-amber-700 bg-amber-50 border-amber-100' },
  { label: 'Finans & Muhasebe',        color: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
  { label: 'Lojistik & Nakliye',       color: 'text-orange-700 bg-orange-50 border-orange-100' },
  { label: 'Sağlık & Medikal',         color: 'text-teal-700 bg-teal-50 border-teal-100' },
  { label: 'Franchise & Bayilik',      color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  { label: 'Hukuk & Danışmanlık',      color: 'text-pink-700 bg-pink-50 border-pink-100' },
  { label: 'Gıda & Restoran',          color: 'text-lime-700 bg-lime-50 border-lime-100' },
]

function SectorBadge({ label, color }: { label: string; color: string }) {
  return (
    <div className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[13px] font-semibold tracking-tight whitespace-nowrap ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
      {label}
    </div>
  )
}

export default function LandingLogoBar() {
  const doubled = [...SECTORS, ...SECTORS]

  return (
    <section className="py-14 border-y border-slate-100 bg-slate-50/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="text-center text-[13px] text-slate-400 font-medium tracking-wide uppercase">
          Her sektörden 2,000+ firma tarafından kullanılıyor
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
          {doubled.map((s, i) => (
            <SectorBadge key={`${s.label}-${i}`} label={s.label} color={s.color} />
          ))}
        </div>
      </div>
    </section>
  )
}
