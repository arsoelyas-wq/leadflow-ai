'use client'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap } from 'lucide-react'
import Reveal from './Reveal'

const TRUST_POINTS = [
  '14 gün ücretsiz deneme',
  'Kredi kartı gerekmez',
  'İstediğin an iptal',
  'Ortalama kurulum: 8 dk',
]

export default function LandingCTA() {
  return (
    <section className="py-28 relative overflow-hidden bg-slate-900">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 65%)',
        }}
      />

      {/* Floating orbs */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
      />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[13px] font-semibold mb-8">
            <Zap size={13} className="fill-blue-400" />
            Bugün başla, yarın sonuç al
          </div>

          {/* Headline */}
          <h2 className="text-[40px] lg:text-[56px] xl:text-[64px] font-black leading-[1.04] tracking-[-0.035em] text-white mb-6">
            Rakiplerinden{' '}
            <span
              className="animate-gradient-x"
              style={{
                background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #60a5fa)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              1 Adım Önde Ol
            </span>
          </h2>

          <p className="text-[18px] text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            2,847+ firma Sovlo AI ile satışlarını otomatize etti.{' '}
            <strong className="text-slate-200">Sizin sıranız.</strong>
          </p>
        </Reveal>

        {/* CTA Button */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[16px] font-bold btn-glow"
            style={{ boxShadow: '0 8px 32px -6px rgba(99,102,241,0.6)' }}
          >
            14 Gün Ücretsiz Başla
            <ArrowRight size={18} />
          </Link>

          <a
            href="https://wa.me/905000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-[15px] font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-all"
          >
            💬 WhatsApp Demo Al
          </a>
        </div>

        {/* Trust points */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {TRUST_POINTS.map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="text-[13px] text-slate-400 font-medium">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
