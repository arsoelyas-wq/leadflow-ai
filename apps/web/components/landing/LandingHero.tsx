'use client'
import Link from 'next/link'
import { ArrowRight, CheckCircle } from 'lucide-react'
import LandingHeroDemo from './LandingHeroDemo'

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* Background dot grid */}
      <div className="absolute inset-0 dot-grid opacity-40" />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT — Value prop */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
              <span className="text-blue-700 text-[13px] font-semibold">B2B Satış Ekipleri İçin Otomasyon Platformu</span>
            </div>

            {/* Headline */}
            <h1 className="text-[42px] sm:text-[52px] lg:text-[58px] xl:text-[64px] font-black leading-[1.04] tracking-[-0.03em] text-slate-900 mb-6">
              Doğru Müşteriye,{' '}
              <span className="gradient-text-blue">Doğru Anda</span>{' '}
              Ulaş
            </h1>

            {/* Subheadline */}
            <p className="text-[17px] lg:text-[18px] text-slate-500 leading-[1.7] mb-8 max-w-lg">
              LeadFlow AI, hedef sektörünüzdeki şirketleri otomatik bulur; WhatsApp ve e-postada
              kişiye özel kampanyalarla ulaşır, sonuçları tek panelden gösterir.{' '}
              <strong className="text-slate-700 font-semibold">2,847+ B2B ekibi</strong>, satış
              sürecini günler değil dakikalar içinde kurdu.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
              >
                14 Gün Ücretsiz Başla
                <ArrowRight size={16} />
              </Link>

              <a
                href="#nasil-calisir"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-semibold hover:bg-slate-200 transition-colors"
              >
                Nasıl Çalışır?
                <ArrowRight size={16} />
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-4">
              {[
                'Kredi kartı gerekmez',
                'KVKK & GDPR uyumlu',
                'İstediğin an iptal',
              ].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[13px] text-slate-500 font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Dashboard mockup */}
          <div className="relative lg:ml-4 mt-8 lg:mt-0">
            <LandingHeroDemo />
          </div>
        </div>
      </div>
    </section>
  )
}
