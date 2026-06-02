// Market Pages — shared types and utilities

export interface MarketStat {
  value: string   // "2.500+"
  label: string   // "Türk Şirketi"
}

export interface MarketFeature {
  icon: string    // "🎯"
  title: string
  desc: string
}

export interface MarketTestimonial {
  name: string
  company: string
  role: string
  text: string
  avatar: string   // initials e.g. "AY"
  rating: number   // 1-5
}

export interface MarketLogo {
  name: string
  url: string
}

export interface MarketPage {
  id: string
  user_id: string
  locale: string         // 'tr_TR', 'de_DE', 'ru_RU'
  slug: string           // 'tr', 'de', 'ru'
  is_published: boolean
  published_at: string | null

  // Hero
  hero_badge: string
  hero_headline: string
  hero_subheadline: string
  hero_cta_primary_text: string
  hero_cta_primary_url: string
  hero_cta_secondary_text: string
  hero_cta_secondary_url: string
  hero_image_url: string
  hero_video_url: string
  hero_video_thumbnail: string

  // Social proof
  stats: MarketStat[]
  features: MarketFeature[]
  testimonials: MarketTestimonial[]
  logos: MarketLogo[]

  // Pricing
  currency: string
  currency_symbol: string
  price_monthly: number
  price_annual: number
  price_cta: string
  price_features: string[]

  // Contact
  whatsapp_number: string
  calendly_url: string
  email_contact: string

  // SEO
  meta_title: string
  meta_description: string
  og_image_url: string

  created_at: string
  updated_at: string
}

// All supported markets — add new slugs here to enable new markets
export const MARKET_SLUGS: Record<string, {
  locale: string
  flag: string
  name: string
  currency: string
  symbol: string
}> = {
  tr: { locale: 'tr_TR', flag: '🇹🇷', name: 'Türkiye',      currency: 'TRY', symbol: '₺'   },
  de: { locale: 'de_DE', flag: '🇩🇪', name: 'Almanya',       currency: 'EUR', symbol: '€'   },
  ru: { locale: 'ru_RU', flag: '🇷🇺', name: 'Rusya',         currency: 'RUB', symbol: '₽'   },
  en: { locale: 'en_GB', flag: '🇬🇧', name: 'İngiltere',     currency: 'GBP', symbol: '£'   },
  ar: { locale: 'ar_AE', flag: '🇦🇪', name: 'BAE',           currency: 'AED', symbol: 'د.إ' },
  fr: { locale: 'fr_FR', flag: '🇫🇷', name: 'Fransa',        currency: 'EUR', symbol: '€'   },
  es: { locale: 'es_ES', flag: '🇪🇸', name: 'İspanya',       currency: 'EUR', symbol: '€'   },
  nl: { locale: 'nl_NL', flag: '🇳🇱', name: 'Hollanda',      currency: 'EUR', symbol: '€'   },
  pl: { locale: 'pl_PL', flag: '🇵🇱', name: 'Polonya',       currency: 'PLN', symbol: 'zł'  },
  us: { locale: 'en_US', flag: '🇺🇸', name: 'ABD',           currency: 'USD', symbol: '$'   },
}

// Fetch a published market page — used by ISR pages
export async function fetchMarketPage(slug: string): Promise<MarketPage | null> {
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
  try {
    const res = await fetch(`${API}/api/market-pages/public/${slug}`, {
      next: { revalidate: 60 },   // ISR: revalidate every 60 seconds
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.page || null
  } catch {
    return null
  }
}
