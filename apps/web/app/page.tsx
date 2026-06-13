import type { Metadata } from 'next'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingHero from '@/components/landing/LandingHero'
import LandingLogoBar from '@/components/landing/LandingLogoBar'
import LandingProblem from '@/components/landing/LandingProblem'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingTestimonials from '@/components/landing/LandingTestimonials'
import LandingIntegrations from '@/components/landing/LandingIntegrations'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFAQ from '@/components/landing/LandingFAQ'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingFooter from '@/components/landing/LandingFooter'
import ChatWidget from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'LeadFlow AI — Yapay Zeka Destekli B2B Lead Intelligence Platformu',
  description: 'Google Maps\'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. 2,847+ firma ile satışlarınızı otomatize edin.',
  keywords: ['B2B lead', 'satış otomasyonu', 'WhatsApp kampanya', 'lead scraper', 'AI satış', 'CRM Türkiye'],
  openGraph: {
    type: 'website',
    title: 'LeadFlow AI — B2B Lead Intelligence Platformu',
    description: '2,847+ firma tarafından kullanılan AI destekli B2B satış otomasyon platformu.',
    siteName: 'LeadFlow AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LeadFlow AI — B2B Lead Intelligence',
    description: '2,847+ firma tarafından kullanılan AI destekli B2B satış otomasyon platformu.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://leadflow-ai-web-kappa.vercel.app',
  },
}

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'LeadFlow AI',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: 'Yapay Zeka Destekli B2B Lead Intelligence ve Satış Otomasyon Platformu',
            offers: {
              '@type': 'Offer',
              price: '99',
              priceCurrency: 'TRY',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '2847',
            },
          }),
        }}
      />

      <LandingNavbar />

      <main>
        {/* 1. Hero — değer önerisi, tek bakışta ne/kime/neden */}
        <LandingHero />

        {/* 2. Logo Bar — sosyal kanıt + büyüme rakamları */}
        <LandingLogoBar />

        {/* 3. Problem → Solution — kısa, editoryal karşılaştırma */}
        <LandingProblem />

        {/* 4. Capabilities — küratörlü özellik seti */}
        <LandingFeatures />

        {/* 5. How It Works — 3 adım, net akış */}
        <LandingHowItWorks />

        {/* 6. Integrations — mevcut araçlarla uyum (hafif şerit) */}
        <LandingIntegrations />

        {/* 7. Proof & Trust — testimonial + güven sinyalleri, fiyatlandırmaya yakın */}
        <LandingTestimonials />

        {/* 8. Pricing — şeffaf, 3 plan */}
        <LandingPricing />

        {/* 9. FAQ — kalan tereddütleri kaldır */}
        <LandingFAQ />

        {/* 10. Final CTA — kapanış */}
        <LandingCTA />
      </main>

      <LandingFooter />

      {/* Chat widget — destek erişimi */}
      <ChatWidget />
    </div>
  )
}
