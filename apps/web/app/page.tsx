import type { Metadata } from 'next'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingHero from '@/components/landing/LandingHero'
import LandingLogoBar from '@/components/landing/LandingLogoBar'
import LandingStats from '@/components/landing/LandingStats'
import LandingROICalculator from '@/components/landing/LandingROICalculator'
import LandingProblem from '@/components/landing/LandingProblem'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingComparisonTable from '@/components/landing/LandingComparisonTable'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingDemo from '@/components/landing/LandingDemo'
import LandingUseCases from '@/components/landing/LandingUseCases'
import LandingTestimonials from '@/components/landing/LandingTestimonials'
import LandingIntegrations from '@/components/landing/LandingIntegrations'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFAQ from '@/components/landing/LandingFAQ'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingFooter from '@/components/landing/LandingFooter'
import ChatWidget from '@/components/ChatWidget'
import ExitIntentPopup from '@/components/landing/ExitIntentPopup'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Sovlo AI — Yapay Zeka Destekli B2B Lead Intelligence Platformu',
  description: 'Google Maps\'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. 2,000+ firma ile satışlarınızı otomatize edin.',
  keywords: ['B2B lead', 'satış otomasyonu', 'WhatsApp kampanya', 'lead scraper', 'AI satış', 'CRM Türkiye', 'lead generation'],
  metadataBase: new URL(SITE_CONFIG.url),
  openGraph: {
    type: 'website',
    url: SITE_CONFIG.url,
    title: 'Sovlo AI — B2B Lead Intelligence Platformu',
    description: '2,000+ firma tarafından kullanılan AI destekli B2B satış otomasyon platformu.',
    siteName: 'Sovlo AI',
    images: [
      {
        url: '/og-image.png',   // public/og-image.png dosyasını ekleyin (1200x630px)
        width: 1200,
        height: 630,
        alt: 'Sovlo AI — B2B Lead Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@sovloai',
    title: 'Sovlo AI — B2B Lead Intelligence',
    description: '2,000+ firma tarafından kullanılan AI destekli B2B satış otomasyon platformu.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    canonical: SITE_CONFIG.url,
  },
  verification: {
    // google: 'GOOGLE_VERIFICATION_CODE',  // Search Console'dan alın
  },
}

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* Structured data — SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Sovlo AI',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: 'Yapay Zeka Destekli B2B Lead Intelligence ve Satış Otomasyon Platformu',
            url: SITE_CONFIG.url,
            offers: {
              '@type': 'Offer',
              price: '199',
              priceCurrency: 'TRY',
              priceValidUntil: '2027-01-01',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              reviewCount: '2000',
              bestRating: '5',
              worstRating: '1',
            },
          }),
        }}
      />

      <LandingNavbar />

      <main>
        {/* 1. Hero */}
        <LandingHero />

        {/* 2. Logo Bar — sektör rozetleri */}
        <LandingLogoBar />

        {/* 3. Stats */}
        <LandingStats />

        {/* 4. ROI Hesaplayıcı — dönüşüm arttırıcı */}
        <LandingROICalculator />

        {/* 5. Problem → Solution */}
        <LandingProblem />

        {/* 6. Features */}
        <LandingFeatures />

        {/* 7. Rakip Karşılaştırma */}
        <LandingComparisonTable />

        {/* 8. How It Works */}
        <LandingHowItWorks />

        {/* 9. Demo */}
        <LandingDemo />

        {/* 10. Use Cases */}
        <LandingUseCases />

        {/* 11. Testimonials */}
        <LandingTestimonials />

        {/* 12. Integrations */}
        <LandingIntegrations />

        {/* 13. Pricing */}
        <LandingPricing />

        {/* 14. FAQ */}
        <LandingFAQ />

        {/* 15. Final CTA */}
        <LandingCTA />
      </main>

      <LandingFooter />

      {/* Chat widget */}
      <ChatWidget />

      {/* Exit intent popup — çıkış niyeti yakalama */}
      <ExitIntentPopup />
    </div>
  )
}
