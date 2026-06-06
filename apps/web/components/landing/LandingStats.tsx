'use client'
import { useEffect, useRef, useState } from 'react'
import { TrendingUp, Globe, Zap, Users } from 'lucide-react'

const STATS = [
  {
    value: 2847,
    suffix: '+',
    label: 'Aktif Firma',
    sub: 'platformu kullanan işletme',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    value: 87,
    suffix: '%',
    prefix: '',
    label: 'Dönüşüm Artışı',
    sub: 'ortalama kampanya iyileşmesi',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    value: 50,
    suffix: '+',
    label: 'Lead Kaynağı',
    sub: 'Google Maps, Instagram ve daha fazlası',
    icon: Zap,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    value: 14,
    suffix: '',
    label: 'Desteklenen Ülke',
    sub: 'Türkiye, AB, Körfez ve daha fazlası',
    icon: Globe,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
]

function Counter({ target, suffix = '', duration = 1800 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const step = target / (duration / 16)
          let current = 0
          const timer = setInterval(() => {
            current = Math.min(current + step, target)
            setCount(Math.floor(current))
            if (current >= target) clearInterval(timer)
          }, 16)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span ref={ref}>
      {count.toLocaleString('tr-TR')}
      {suffix}
    </span>
  )
}

export default function LandingStats() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {STATS.map(({ value, suffix = '', label, sub, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-slate-100 bg-white card-hover shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>

              <div>
                <div className={`text-[36px] lg:text-[40px] font-black tracking-[-0.035em] ${color}`}>
                  <Counter target={value} suffix={suffix} />
                </div>
                <div className="text-[16px] font-bold text-slate-900 mt-0.5">{label}</div>
                <div className="text-[13px] text-slate-400 mt-1 leading-snug">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
