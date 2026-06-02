import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchMarketPage, MARKET_SLUGS } from '@/lib/market-pages'
import MarketNavbar from '@/components/markets/MarketNavbar'
import MarketHero from '@/components/markets/MarketHero'
import MarketStats from '@/components/markets/MarketStats'
import MarketFeatures from '@/components/markets/MarketFeatures'
import MarketTestimonials from '@/components/markets/MarketTestimonials'
import MarketPricing from '@/components/markets/MarketPricing'
import MarketContact from '@/components/markets/MarketContact'
import MarketFooter from '@/components/markets/MarketFooter'

// Pages are generated on-demand, then cached (ISR)
// Dynamic params allowed: unknown slugs return 404
export const dynamicParams = true

// ISR: revalidate every 60 seconds — stays fresh after admin publishes
export const revalidate = 60

// Dynamic SEO per market
export async function generateMetadata(
  { params }: { params: { locale: string } }
): Promise<Metadata> {
  const page = await fetchMarketPage(params.locale)
  const market = MARKET_SLUGS[params.locale]

  if (!page) {
    return {
      title: `LeadFlow AI — ${market?.name || params.locale.toUpperCase()}`,
      description: 'B2B Satış Otomasyon Platformu',
    }
  }

  return {
    title: page.meta_title || `LeadFlow AI — ${market?.name}`,
    description: page.meta_description || 'B2B Satış Otomasyon Platformu',
    openGraph: {
      title: page.meta_title || 'LeadFlow AI',
      description: page.meta_description || '',
      images: page.og_image_url ? [{ url: page.og_image_url }] : [],
      locale: page.locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.meta_title || 'LeadFlow AI',
      description: page.meta_description || '',
      images: page.og_image_url ? [page.og_image_url] : [],
    },
    alternates: {
      canonical: `/${params.locale}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function MarketPublicPage(
  { params }: { params: { locale: string } }
) {
  // Only known slugs
  if (!MARKET_SLUGS[params.locale]) notFound()

  // Fetch from API — ISR cached for 60s
  const page = await fetchMarketPage(params.locale)
  if (!page) notFound()

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'LeadFlow AI',
            applicationCategory: 'BusinessApplication',
            description: page.meta_description,
            offers: page.price_monthly ? {
              '@type': 'Offer',
              price: page.price_monthly,
              priceCurrency: page.currency,
            } : undefined,
          }),
        }}
      />

      <MarketNavbar page={page} />
      <main>
        <MarketHero page={page} />
        <MarketStats page={page} />
        <MarketFeatures page={page} />
        <MarketTestimonials page={page} />
        <MarketPricing page={page} />
        <MarketContact page={page} />
      </main>
      <MarketFooter page={page} />
    </>
  )
}
