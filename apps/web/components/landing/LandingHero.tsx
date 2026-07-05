'use client'
import Link from 'next/link'
import { ArrowRight, Play, CheckCircle } from 'lucide-react'
import LandingHeroDemo from './LandingHeroDemo'

function trackCTA(label: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', 'cta_click', { cta_label: label, page: 'landing' })
  }
}

export default function LandingHero({ cfg }: { cfg?: any }) {
  const badge      = cfg?.hero_badge      || 'Yapay Zeka Destekli B2B Lead Platformu'
  const headline   = cfg?.hero_headline   || 'Doğru Müşteriye,'
  const gradient   = cfg?.hero_headline_gradient || 'Doğru Anda'
  const suffix     = cfg?.hero_headline_suffix   || 'Ulaş'
  const firmCount  = cfg?.hero_firm_count  || '2,000+'
  const sub        = (cfg?.hero_subheadline || 'Google Maps\'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. {firmCount} firma Sovlo AI ile satışlarını otomatize ediyor.').replace('{firmCount}', firmCount)
  const cta1Text   = cfg?.hero_cta_primary_text   || '14 Gün Ücretsiz Başla'
  const cta1Url    = cfg?.hero_cta_primary_url    || '/register'
  const cta2Text   = cfg?.hero_cta_secondary_text || 'Demo İzle'
  const cta2Url    = cfg?.hero_cta_secondary_url  || '#demo'
  const bullets    = cfg?.hero_trust_bullets || ['Kredi kartı gerekmez', '2,000+ aktif firma', 'İstediğin an iptal']

  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-14 sm:pt-24 sm:pb-18 lg:pt-36 lg:pb-28">
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 60%)' }} />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
              <span className="text-blue-700 text-[13px] font-semibold">{badge}</span>
            </div>

            <h1 className="text-[34px] sm:text-[46px] lg:text-[58px] xl:text-[64px] font-black leading-[1.06] tracking-[-0.03em] text-slate-900 mb-5">
              {headline}{' '}
              <span className="gradient-text-blue">{gradient}</span>{' '}
              {suffix}
            </h1>

            <p className="text-[15px] sm:text-[17px] lg:text-[18px] text-slate-500 leading-[1.7] mb-8 max-w-lg" dangerouslySetInnerHTML={{ __html: sub.replace(firmCount, `<strong class="text-slate-700 font-semibold">${firmCount}</strong>`) }} />

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-8">
              <Link href={cta1Url} onClick={() => trackCTA('hero_register')} className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow">
                {cta1Text} <ArrowRight size={16} />
              </Link>
              <a href={cta2Url} onClick={() => trackCTA('hero_demo_watch')} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-semibold hover:bg-slate-200 transition-colors">
                <div className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
                  <Play size={10} className="text-slate-700 fill-slate-700 ml-0.5" />
                </div>
                {cta2Text}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {bullets.map((t: string) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[13px] text-slate-500 font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative lg:ml-4 mt-8 lg:mt-0">
            <LandingHeroDemo />
          </div>
        </div>
      </div>
    </section>
  )
}
