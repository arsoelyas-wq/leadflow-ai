'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'

const LOGOS = [
  'Türk Tekstil A.Ş.', 'Metro Yapı Ltd.', 'Digital GmbH',
  'SaaS Startup TR', 'E-Ticaret Pro', 'Fintexco Ltd.',
  'Pazarlama360', 'TechSoft A.Ş.', 'GlobalTrade TR',
  'Ankara Dijital', 'İstanbul SaaS', 'EuroAgency GmbH',
]

const PROOF_STATS = [
  { target: 2847, prefix: '', suffix: '+', label: 'Aktif Firma' },
  { target: 87, prefix: '%', suffix: '', label: 'Dönüşüm Artışı' },
  { target: 14, prefix: '', suffix: '', label: 'Ülkede Aktif' },
]

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getReducedMotionServerSnapshot() {
  return false
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot)
}

function Counter({ target, prefix = '', suffix = '', duration = 1500 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const value = reduced ? target : animatedValue

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      const steps = Math.max(1, Math.round(duration / 16))
      const increment = target / steps
      let current = 0
      const tick = () => {
        current += increment
        if (current >= target) {
          setAnimatedValue(target)
          return
        }
        setAnimatedValue(Math.floor(current))
        raf = requestAnimationFrame(tick)
      }
      tick()
      observer.disconnect()
    }, { threshold: 0.4 })
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, duration, reduced])

  return (
    <span ref={ref} aria-label={`${prefix}${target.toLocaleString('tr-TR')}${suffix}`}>
      <span aria-hidden="true">{prefix}{value.toLocaleString('tr-TR')}{suffix}</span>
    </span>
  )
}

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
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-x-10 sm:gap-x-16 gap-y-4 flex-wrap text-center mb-10">
          {PROOF_STATS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-x-10 sm:gap-x-16">
              <div>
                <div className="text-[28px] sm:text-[32px] font-black text-slate-900 leading-none">
                  <Counter target={s.target} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="text-[13px] text-slate-500 font-medium mt-1">{s.label}</div>
              </div>
              {i < PROOF_STATS.length - 1 && (
                <div className="hidden sm:block w-px h-10 bg-slate-200" />
              )}
            </div>
          ))}
        </div>
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
