export {};

export const PLAN_NAMES = ['trial', 'starter', 'growth', 'scale', 'enterprise'] as const;
export type PlanType = typeof PLAN_NAMES[number];

export interface PlanLimits {
  leads_db: number;              // -1 = unlimited
  scrape_per_month: number;
  wa_numbers: number;
  team_seats: number;
  campaigns_per_month: number;
  sequences: number;
  webhooks: number;
  microsites: number;
  proposals_per_month: number;
  invoices_per_month: number;
  ai_voice: boolean;
  ai_video: boolean;
  api_access: boolean;
  white_label: boolean;
  voice_clones: number;
  avatars: number;
}

export interface PlanConfig {
  id: PlanType;
  name: string;
  nameLocal: string;
  monthlyCredits: number;        // -1 = unlimited
  rolloverMonths: number;        // how many months unused credits carry over
  priceMonthly: number;          // ₺ kuruş (x100) — 99900 = ₺999
  priceAnnual: number;           // ₺ kuruş billed monthly when annual
  color: string;
  popular: boolean;
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    nameLocal: 'Ücretsiz',
    monthlyCredits: 100,
    rolloverMonths: 0,
    priceMonthly: 0,
    priceAnnual: 0,
    color: '#64748b',
    popular: false,
    features: [
      '100 başlangıç kredisi (tek seferlik)',
      'Lead Scraper — 20 arama/ay',
      'Pipeline CRM',
      'AI Destek Chatbot',
    ],
    limits: {
      leads_db: 50, scrape_per_month: 20, wa_numbers: 0,
      team_seats: 1, campaigns_per_month: 5, sequences: 0,
      webhooks: 0, microsites: 1, proposals_per_month: 3,
      invoices_per_month: 5, ai_voice: false, ai_video: false,
      api_access: false, white_label: false, voice_clones: 0, avatars: 0,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    nameLocal: 'Başlangıç',
    monthlyCredits: 1000,
    rolloverMonths: 1,
    priceMonthly: 99900,
    priceAnnual: 79900,
    color: '#06b6d4',
    popular: false,
    features: [
      '1.000 kredi/ay • 1 ay rollover',
      'WhatsApp Kampanya — 1 numara',
      'Email Kampanya sınırsız',
      '5.000 lead veritabanı',
      'Pipeline CRM',
      'QR Üretici sınırsız',
      'Teklif & Fatura (20/ay)',
      'Microsite (3 adet)',
      'Email destek (72s)',
    ],
    limits: {
      leads_db: 5000, scrape_per_month: 200, wa_numbers: 1,
      team_seats: 1, campaigns_per_month: 20, sequences: 3,
      webhooks: 2, microsites: 3, proposals_per_month: 20,
      invoices_per_month: 20, ai_voice: false, ai_video: false,
      api_access: false, white_label: false, voice_clones: 0, avatars: 0,
    },
  },

  growth: {
    id: 'growth',
    name: 'Growth',
    nameLocal: 'Büyüme',
    monthlyCredits: 5000,
    rolloverMonths: 2,
    priceMonthly: 299000,
    priceAnnual: 239000,
    color: '#8b5cf6',
    popular: true,
    features: [
      '5.000 kredi/ay • 2 ay rollover',
      'WhatsApp — 3 numara sınırsız',
      'Email + SMS Kampanya',
      'Sequence (20 adıma kadar)',
      'Workflow Otomasyon (10 akış)',
      'A/B Test & Akıllı Zamanlama',
      'Meta + Google Reklam Yönetimi',
      'CAPI Entegrasyonu',
      'AI Sesli Arama (kredi ile)',
      'Ekip — 5 koltuk + Roller',
      'Teklif & Fatura sınırsız',
      'Webhook (10) • Microsite (20)',
      'Öncelikli destek 24s',
    ],
    limits: {
      leads_db: 50000, scrape_per_month: 1500, wa_numbers: 3,
      team_seats: 5, campaigns_per_month: -1, sequences: 20,
      webhooks: 10, microsites: 20, proposals_per_month: -1,
      invoices_per_month: -1, ai_voice: true, ai_video: false,
      api_access: false, white_label: false, voice_clones: 0, avatars: 0,
    },
  },

  scale: {
    id: 'scale',
    name: 'Scale',
    nameLocal: 'Kurumsal',
    monthlyCredits: 20000,
    rolloverMonths: 3,
    priceMonthly: 799000,
    priceAnnual: 639000,
    color: '#f59e0b',
    popular: false,
    features: [
      '20.000 kredi/ay • 3 ay rollover',
      'WhatsApp — 15 numara sınırsız',
      'Sınırsız Sequence & Workflow',
      'AI Sesli Arama + Ses Klonlama',
      'AI Video Outreach (kredi ile)',
      'Avatar Kütüphanesi (5 avatar)',
      'AI Satış Koçu & Ekip Analizi',
      'Churn Tahmini & ROAS',
      'API Erişimi (10K/gün)',
      'Ekip — 25 koltuk',
      '7/24 Chat Destek',
    ],
    limits: {
      leads_db: -1, scrape_per_month: -1, wa_numbers: 15,
      team_seats: 25, campaigns_per_month: -1, sequences: -1,
      webhooks: -1, microsites: -1, proposals_per_month: -1,
      invoices_per_month: -1, ai_voice: true, ai_video: true,
      api_access: true, white_label: false, voice_clones: 3, avatars: 5,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    nameLocal: 'Enterprise',
    monthlyCredits: -1,
    rolloverMonths: -1,
    priceMonthly: 0,
    priceAnnual: 0,
    color: '#ec4899',
    popular: false,
    features: [
      'Sınırsız kredi',
      'Sınırsız ekip & WA numarası',
      'White-Label & Özel Domain',
      'Dedicated Account Manager',
      'SLA %99.9 uptime garantisi',
      'Özel entegrasyon & API',
      'Dedicated Slack / Telefon desteği',
      '10 ses klonu • Sınırsız avatar',
    ],
    limits: {
      leads_db: -1, scrape_per_month: -1, wa_numbers: -1,
      team_seats: -1, campaigns_per_month: -1, sequences: -1,
      webhooks: -1, microsites: -1, proposals_per_month: -1,
      invoices_per_month: -1, ai_voice: true, ai_video: true,
      api_access: true, white_label: true, voice_clones: 10, avatars: -1,
    },
  },
};

// ── Credit cost per action ────────────────────────────────────────────────────

export const CREDIT_COSTS: Record<string, number> = {
  // Paid actions
  lead_scrape:          5,   // 1 lead Google Maps'ten çekildi
  ai_message:           1,   // 1 AI kişiselleştirilmiş mesaj
  email_enrichment:     3,   // 1 email/telefon bulma (Exa/enrichment)
  decision_maker:       5,   // 1 karar verici profil (Exa)
  competitor_analysis: 10,   // 1 rakip raporu
  voice_call_per_min:  15,   // 1 dakika AI sesli arama (ElevenLabs + Vapi)
  video_generate:      80,   // 1 AI video üretimi (HeyGen/MuseTalk)
  ai_coach:             5,   // 1 AI satış koçu analizi
  battlecard:          10,   // 1 rakip kartı
  roas_prediction:      5,   // 1 ROAS tahmini
  proposal_pdf:         2,   // 1 teklif PDF (Puppeteer)
  qr_generate:          1,   // 1 QR kod

  // Free actions (self-hosted infra)
  whatsapp_message:     0,   // SINIRSIZ — self-hosted Baileys
  email_send:           0,   // SINIRSIZ — kullanıcı SMTP
  sms_send:             0,   // SINIRSIZ — kullanıcı hesabı
  capi_event:           0,   // SINIRSIZ — Meta/Google CAPI

  // Legacy aliases
  ai_analysis:          3,
  ai_video:            80,
  voice_call:          15,
};

// ── Credit topup packages ─────────────────────────────────────────────────────

export const TOPUP_PACKAGES: Record<string, { credits: number; price: number; name: string; badge?: string; popular?: boolean }> = {
  mini:     { credits: 500,    price: 49900,   name: 'Mini',     badge: undefined },
  standard: { credits: 2000,   price: 149000,  name: 'Standart', badge: 'Popüler', popular: true },
  pro:      { credits: 10000,  price: 599000,  name: 'Pro',      badge: 'En Avantajlı' },
  mega:     { credits: 50000,  price: 2490000, name: 'Mega',     badge: undefined },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const PLAN_ORDER = ['trial', 'starter', 'growth', 'scale', 'enterprise'] as const;

export function getPlanRank(planType: string): number {
  return PLAN_ORDER.indexOf(planType as PlanType);
}

export function hasPlanAccess(userPlan: string, requiredPlan: PlanType): boolean {
  return getPlanRank(userPlan) >= getPlanRank(requiredPlan);
}

export function checkLimit(userPlan: string, metric: keyof PlanLimits): number | boolean {
  const plan = PLANS[userPlan as PlanType] || PLANS.trial;
  return plan.limits[metric];
}

module.exports = { PLANS, PLAN_NAMES, CREDIT_COSTS, TOPUP_PACKAGES, PLAN_ORDER, getPlanRank, hasPlanAccess, checkLimit };
