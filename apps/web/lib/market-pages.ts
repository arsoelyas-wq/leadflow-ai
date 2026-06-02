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

// Per-market UI string translations (for static component texts)
export const MARKET_UI: Record<string, {
  no_card: string
  cancel_anytime: string
  trust_badges: string[]
  privacy: string
  terms: string
  copyright: string
  cta_sub: string
  features_title: string
  features_sub: string
  testimonials_title: string
  testimonials_sub: string
  pricing_title: string
  pricing_sub: string
  cta_title: string
  cta_desc: string
  per_month: string
  annual_save: (sym: string, price: number, pct: number) => string
}> = {
  tr: {
    no_card: 'Kredi kartı gerekmez',
    cancel_anytime: 'İstediğiniz zaman iptal',
    trust_badges: ['🔒 SSL Güvenli', '⚡ 14 Gün Ücretsiz', '🚫 Kart Gerekmez', '✅ İstediğin an iptal'],
    privacy: 'Gizlilik Politikası', terms: 'Kullanım Şartları',
    copyright: 'Tüm hakları saklıdır.',
    cta_sub: '14 gün ücretsiz deneyin. Kredi kartı gerekmez. İstediğiniz zaman iptal edin.',
    features_title: 'Neden LeadFlow AI?',
    features_sub: 'Rakipleriniz manuel çalışırken siz otomatik büyüyün',
    testimonials_title: 'Müşterilerimiz Ne Diyor?',
    testimonials_sub: 'Gerçek şirketler, gerçek sonuçlar',
    pricing_title: 'Basit Fiyatlandırma',
    pricing_sub: 'Gizli ücret yok. İstediğiniz zaman iptal.',
    cta_title: 'Hemen Başlayın',
    cta_desc: '14 gün ücretsiz deneyin. Kredi kartı gerekmez. İstediğiniz zaman iptal edin.',
    per_month: '/ay',
    annual_save: (sym, price, pct) => `Yıllık ödemede ${sym}${price.toLocaleString()}/ay — %${pct} tasarruf!`,
  },
  de: {
    no_card: 'Keine Kreditkarte erforderlich',
    cancel_anytime: 'Jederzeit kündbar',
    trust_badges: ['🔒 SSL-verschlüsselt', '⚡ 14 Tage kostenlos', '🚫 Keine Kreditkarte', '✅ Jederzeit kündbar'],
    privacy: 'Datenschutz', terms: 'Nutzungsbedingungen',
    copyright: 'Alle Rechte vorbehalten.',
    cta_sub: '14 Tage kostenlos testen. Keine Kreditkarte erforderlich. Jederzeit kündbar.',
    features_title: 'Warum LeadFlow AI?',
    features_sub: 'Während Ihre Konkurrenz manuell arbeitet, wachsen Sie automatisch',
    testimonials_title: 'Was unsere Kunden sagen',
    testimonials_sub: 'Echte Unternehmen, echte Ergebnisse',
    pricing_title: 'Einfache Preise',
    pricing_sub: 'Keine versteckten Kosten. Jederzeit kündbar.',
    cta_title: 'Jetzt starten',
    cta_desc: '14 Tage kostenlos testen. Keine Kreditkarte. Jederzeit kündbar.',
    per_month: '/Monat',
    annual_save: (sym, price, pct) => `Jährlich: ${sym}${price}/Monat — ${pct}% sparen!`,
  },
  ru: {
    no_card: 'Без кредитной карты',
    cancel_anytime: 'Отмена в любое время',
    trust_badges: ['🔒 SSL защита', '⚡ 14 дней бесплатно', '🚫 Без карты', '✅ Отмена в любое время'],
    privacy: 'Конфиденциальность', terms: 'Условия использования',
    copyright: 'Все права защищены.',
    cta_sub: '14 дней бесплатно. Без кредитной карты. Отмена в любое время.',
    features_title: 'Почему LeadFlow AI?',
    features_sub: 'Пока конкуренты работают вручную, вы растёте автоматически',
    testimonials_title: 'Что говорят клиенты?',
    testimonials_sub: 'Реальные компании, реальные результаты',
    pricing_title: 'Простые цены',
    pricing_sub: 'Никаких скрытых платежей. Отмена в любое время.',
    cta_title: 'Начните прямо сейчас',
    cta_desc: '14 дней бесплатно. Без карты. Отмена в любое время.',
    per_month: '/мес',
    annual_save: (sym, price, pct) => `Годовой план: ${sym}${price}/мес — экономия ${pct}%!`,
  },
  en: {
    no_card: 'No credit card required',
    cancel_anytime: 'Cancel anytime',
    trust_badges: ['🔒 SSL Secure', '⚡ 14 Days Free', '🚫 No Credit Card', '✅ Cancel Anytime'],
    privacy: 'Privacy Policy', terms: 'Terms of Service',
    copyright: 'All rights reserved.',
    cta_sub: 'Start free for 14 days. No credit card required. Cancel anytime.',
    features_title: 'Why LeadFlow AI?',
    features_sub: 'While competitors work manually, you grow automatically',
    testimonials_title: 'What Our Customers Say',
    testimonials_sub: 'Real companies, real results',
    pricing_title: 'Simple Pricing',
    pricing_sub: 'No hidden fees. Cancel anytime.',
    cta_title: 'Get Started Now',
    cta_desc: '14 days free. No credit card. Cancel anytime.',
    per_month: '/month',
    annual_save: (sym, price, pct) => `Annual plan: ${sym}${price}/month — save ${pct}%!`,
  },
  ar: {
    no_card: 'لا حاجة لبطاقة ائتمان',
    cancel_anytime: 'إلغاء في أي وقت',
    trust_badges: ['🔒 SSL آمن', '⚡ 14 يوم مجاناً', '🚫 بدون بطاقة', '✅ إلغاء في أي وقت'],
    privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام',
    copyright: 'جميع الحقوق محفوظة.',
    cta_sub: 'جرب مجاناً لمدة 14 يوماً. بدون بطاقة ائتمان. إلغاء في أي وقت.',
    features_title: 'لماذا LeadFlow AI؟',
    features_sub: 'بينما يعمل منافسوك يدوياً، أنت تنمو تلقائياً',
    testimonials_title: 'ماذا يقول عملاؤنا؟',
    testimonials_sub: 'شركات حقيقية، نتائج حقيقية',
    pricing_title: 'تسعير بسيط',
    pricing_sub: 'لا رسوم مخفية. إلغاء في أي وقت.',
    cta_title: 'ابدأ الآن',
    cta_desc: '14 يوم مجاناً. بدون بطاقة ائتمان. إلغاء في أي وقت.',
    per_month: '/شهر',
    annual_save: (sym, price, pct) => `الخطة السنوية: ${sym}${price}/شهر — وفر ${pct}%!`,
  },
  fr: {
    no_card: 'Sans carte bancaire',
    cancel_anytime: 'Résiliation à tout moment',
    trust_badges: ['🔒 SSL Sécurisé', '⚡ 14 Jours Gratuits', '🚫 Sans Carte', '✅ Résiliation libre'],
    privacy: 'Confidentialité', terms: 'Conditions d\'utilisation',
    copyright: 'Tous droits réservés.',
    cta_sub: 'Essayez gratuitement 14 jours. Sans carte bancaire. Résiliation à tout moment.',
    features_title: 'Pourquoi LeadFlow AI ?',
    features_sub: 'Pendant que vos concurrents travaillent manuellement, vous grandissez automatiquement',
    testimonials_title: 'Ce que disent nos clients',
    testimonials_sub: 'Des entreprises réelles, des résultats réels',
    pricing_title: 'Tarifs simples',
    pricing_sub: 'Aucun frais caché. Résiliation à tout moment.',
    cta_title: 'Commencez maintenant',
    cta_desc: '14 jours gratuits. Sans carte. Résiliation à tout moment.',
    per_month: '/mois',
    annual_save: (sym, price, pct) => `Annuel: ${sym}${price}/mois — économisez ${pct}%!`,
  },
}

// Get UI strings for a market, fallback to Turkish
export function getMarketUI(slug: string) {
  return MARKET_UI[slug] || MARKET_UI['tr']
}

// Fetch a published market page — server-side only, uses service key to bypass RLS
export async function fetchMarketPage(slug: string): Promise<MarketPage | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    // Use service key (server-side only — never exposed to browser)
    // SUPABASE_SERVICE_KEY must be set in Vercel environment variables (Settings → Env Vars)
    const serviceKey = (
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    )

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sivrmewtljftzlwmppub.supabase.co',
      serviceKey
    )
    const { data, error } = await sb
      .from('market_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (error || !data) return null
    return data as MarketPage
  } catch {
    return null
  }
}
