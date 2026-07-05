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
import SupportWidget from '@/components/SupportWidget'
import ExitIntentPopup from '@/components/landing/ExitIntentPopup'
import { SITE_CONFIG } from '@/lib/site-config'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

async function getLandingConfig() {
  try {
    const res = await fetch(`${API}/api/market-pages/public/home`, {
      next: { revalidate: 60 },
    })
    const data = await res.json()
    return data?.page || null
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getLandingConfig()

  const title       = cfg?.meta_title       || 'Sovlo AI — Yapay Zeka Destekli B2B Lead Intelligence Platformu'
  const description = cfg?.meta_description || 'Google Maps\'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. 2,000+ firma ile satışlarınızı otomatize edin.'
  const keywords    = cfg?.meta_keywords    || 'B2B lead, satış otomasyonu, WhatsApp kampanya, lead scraper, AI satış, CRM Türkiye'
  const ogTitle     = cfg?.meta_og_title    || title
  const ogDesc      = cfg?.meta_og_description || description
  const twitterSite = cfg?.footer_twitter_url?.replace('https://twitter.com/', '@') || '@sovloai'

  return {
    title,
    description,
    keywords: keywords.split(',').map((k: string) => k.trim()),
    metadataBase: new URL(SITE_CONFIG.url),
    openGraph: {
      type: 'website',
      url: SITE_CONFIG.url,
      title: ogTitle,
      description: ogDesc,
      siteName: `${cfg?.nav_logo_name || 'Sovlo'} ${cfg?.nav_logo_suffix || 'AI'}`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      site: twitterSite,
      title: ogTitle,
      description: ogDesc,
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large' },
    },
    alternates: { canonical: SITE_CONFIG.url },
  }
}

export default async function LandingPage() {
  const cfg = await getLandingConfig()

  return (
    <div className="bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: `${cfg?.nav_logo_name || 'Sovlo'} ${cfg?.nav_logo_suffix || 'AI'}`,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: cfg?.meta_description || 'Yapay Zeka Destekli B2B Lead Intelligence ve Satış Otomasyon Platformu',
            url: SITE_CONFIG.url,
            offers: { '@type': 'Offer', price: (cfg?.plans?.[1]?.monthly_price || 199).toString(), priceCurrency: 'TRY', priceValidUntil: '2027-01-01' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: (cfg?.stats?.[0]?.value || '2000').replace(/[^0-9]/g, '') || '2000', bestRating: '5', worstRating: '1' },
          }),
        }}
      />

      <LandingNavbar cfg={cfg} />

      <main>
        <LandingHero cfg={cfg} />
        <LandingLogoBar />
        <LandingStats cfg={cfg} />
        <LandingROICalculator cfg={cfg} />
        <LandingProblem cfg={cfg} />
        <LandingFeatures cfg={cfg} />
        <LandingComparisonTable />
        <LandingHowItWorks cfg={cfg} />
        <LandingDemo cfg={cfg} />
        <LandingUseCases cfg={cfg} />
        <LandingTestimonials cfg={cfg} />
        <LandingIntegrations cfg={cfg} />
        <LandingPricing cfg={cfg} />
        <LandingFAQ cfg={cfg} />
        <LandingCTA cfg={cfg} />
      </main>

      <LandingFooter cfg={cfg} />
      <SupportWidget />
      <ExitIntentPopup cfg={cfg} />
    </div>
  )
}
