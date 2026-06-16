import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingFooter from '@/components/landing/LandingFooter'
import ChatWidget from '@/components/ChatWidget'
import Reveal from '@/components/landing/Reveal'
import ContactSection from '@/components/landing/ContactSection'

export const metadata: Metadata = {
  title: 'İletişim — Sovlo AI',
  description: 'Sovlo AI ekibiyle iletişime geçin. Satış, destek veya ortaklık talepleri için formu doldurun ya da canlı sohbet ile anında yanıt alın.',
  alternates: {
    canonical: 'https://sovlo.io/contact',
  },
}

export default function ContactPage() {
  return (
    <div className="bg-white text-slate-900">
      <LandingNavbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white pt-32 pb-12 lg:pt-40 lg:pb-16">
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 60%)' }}
          />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
                <MessageCircle size={14} className="text-blue-600" />
                <span className="text-blue-700 text-[13px] font-semibold">Bize Ulaşın</span>
              </div>
              <h1 className="text-[36px] sm:text-[44px] lg:text-[52px] font-black leading-[1.08] tracking-[-0.03em] text-slate-900 mb-4">
                Size Nasıl{' '}
                <span className="gradient-text-blue">Yardımcı Olabiliriz?</span>
              </h1>
              <p className="text-[17px] text-slate-500 leading-[1.7]">
                Sorularınız, satış talepleriniz veya ortaklık önerileriniz için bize ulaşın.
                Ekibimiz en kısa sürede size geri dönüş yapacak.
              </p>
            </Reveal>
          </div>
        </section>

        <ContactSection />
      </main>

      <LandingFooter />
      <ChatWidget />
    </div>
  )
}
