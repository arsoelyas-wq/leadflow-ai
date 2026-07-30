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
  priceMonthly: number;          // USD cents (x100) — 4900 = $49
  priceAnnual: number;           // USD cents billed monthly when annual
  color: string;
  popular: boolean;
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    nameLocal: 'Ücretsiz Deneme',
    monthlyCredits: 300,
    rolloverMonths: 0,
    priceMonthly: 0,
    priceAnnual: 0,
    color: '#64748b',
    popular: false,
    features: [
      '300 kredi · 3 günlük tam erişim',
      'Lead Arama — 1 kr/lead (300 lead)',
      'WhatsApp & E-posta — 1 kr/gönderim',
      'AI Mesaj Üretimi — 3 kr/üretim',
      'Ses Klonlama & Video Mesaj önizleme',
      'Kart gerekmez · Otomatik sona erer',
    ],
    limits: {
      leads_db: 300, scrape_per_month: 300, wa_numbers: 1,
      team_seats: 1, campaigns_per_month: 3, sequences: 0,
      webhooks: 0, microsites: 1, proposals_per_month: 3,
      invoices_per_month: 3, ai_voice: true, ai_video: true,
      api_access: false, white_label: false, voice_clones: 1, avatars: 1,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    nameLocal: 'Starter',
    monthlyCredits: 1000,
    rolloverMonths: 1,
    priceMonthly: 4900,
    priceAnnual: 3900,
    color: '#06b6d4',
    popular: false,
    features: [
      '1.000 kredi/ay · 1 ay rollover',
      'Lead Arama — 1 kr/lead (1.000 lead)',
      'WhatsApp 1 numara · E-posta sınırsız',
      'AI Mesaj (3 kr) · Ses Mesajı (10 kr)',
      'Video Mesaj (30 kr) · 1 ses profili',
      '5.000 lead veritabanı',
      'Pipeline CRM + Teklif & Fatura (20/ay)',
      'E-posta desteği (72s)',
    ],
    limits: {
      leads_db: 5000, scrape_per_month: 1000, wa_numbers: 1,
      team_seats: 1, campaigns_per_month: 20, sequences: 3,
      webhooks: 2, microsites: 3, proposals_per_month: 20,
      invoices_per_month: 20, ai_voice: true, ai_video: true,
      api_access: false, white_label: false, voice_clones: 1, avatars: 1,
    },
  },

  growth: {
    id: 'growth',
    name: 'Growth',
    nameLocal: 'Growth',
    monthlyCredits: 5000,
    rolloverMonths: 2,
    priceMonthly: 14900,
    priceAnnual: 11900,
    color: '#8b5cf6',
    popular: true,
    features: [
      '5.000 kredi/ay · 2 ay rollover',
      'WhatsApp 3 numara · SMS & E-posta',
      'AI Mesaj + Ses Klonlama + Video Mesaj',
      '3 ses profili · 2 avatar',
      'Sequence (20 adım) · Workflow (10 akış)',
      'A/B Test & Akıllı Zamanlama',
      'Meta + Google Reklam Yönetimi',
      'Ekip — 5 koltuk · 50.000 lead DB',
      'Öncelikli destek 24s',
    ],
    limits: {
      leads_db: 50000, scrape_per_month: 5000, wa_numbers: 3,
      team_seats: 5, campaigns_per_month: -1, sequences: 20,
      webhooks: 10, microsites: 20, proposals_per_month: -1,
      invoices_per_month: -1, ai_voice: true, ai_video: true,
      api_access: false, white_label: false, voice_clones: 3, avatars: 2,
    },
  },

  scale: {
    id: 'scale',
    name: 'Scale',
    nameLocal: 'Scale',
    monthlyCredits: 20000,
    rolloverMonths: 3,
    priceMonthly: 39900,
    priceAnnual: 31900,
    color: '#f59e0b',
    popular: false,
    features: [
      '20.000 kredi/ay · 3 ay rollover',
      'WhatsApp 15 numara · Sınırsız kampanya',
      'Ses Klonlama + Video Outreach — tam erişim',
      '10 ses profili · 5 avatar',
      'Sınırsız Sequence & Workflow',
      'AI Satış Koçu & Ekip Analizi',
      'API Erişimi (10K istek/gün)',
      'Ekip — 25 koltuk · Sınırsız lead DB',
      '7/24 Chat Destek',
    ],
    limits: {
      leads_db: -1, scrape_per_month: -1, wa_numbers: 15,
      team_seats: 25, campaigns_per_month: -1, sequences: -1,
      webhooks: -1, microsites: -1, proposals_per_month: -1,
      invoices_per_month: -1, ai_voice: true, ai_video: true,
      api_access: true, white_label: false, voice_clones: 10, avatars: 5,
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
      'Sınırsız ses klonu & avatar',
    ],
    limits: {
      leads_db: -1, scrape_per_month: -1, wa_numbers: -1,
      team_seats: -1, campaigns_per_month: -1, sequences: -1,
      webhooks: -1, microsites: -1, proposals_per_month: -1,
      invoices_per_month: -1, ai_voice: true, ai_video: true,
      api_access: true, white_label: true, voice_clones: -1, avatars: -1,
    },
  },
};

// ── Credit cost per action ────────────────────────────────────────────────────
// Pricing logic: credits gate usage; infra costs are covered by margins.
// Lead/WA/email at 1 credit keeps us competitive with Apollo ($0.049/lead).
// AI generation at 3 credits covers Claude API cost (~$0.015/call) at all plans.
// Voice/video use RunPod serverless (self-hosted GPU) — very low real cost.

export const CREDIT_COSTS: Record<string, number> = {
  // ── Core outreach (1 credit each — competitive, high volume expected) ──────
  lead_scrape:          1,   // 1 lead via Google Places
  whatsapp_message:     1,   // 1 WhatsApp gönderimi (self-hosted Baileys)
  email_send:           1,   // 1 e-posta gönderimi (kullanıcı SMTP)

  // ── AI generation (Claude API — higher cost, moderate volume) ─────────────
  ai_message:           3,   // 1 AI kişiselleştirilmiş mesaj üretimi
  ai_coach:             3,   // 1 AI satış koçu analizi
  lead_score:           2,   // 1 lead AI skoru / segmentasyon
  competitor_analysis:  5,   // 1 rakip analizi raporu
  battlecard:           5,   // 1 rakip kartı
  roas_prediction:      5,   // 1 ROAS tahmini
  email_enrichment:     3,   // 1 email/telefon bulma (Exa/enrichment)
  decision_maker:       5,   // 1 karar verici profil

  // ── Voice cloning (RunPod leadflow-klonlama — self-hosted GPU) ────────────
  voice_clone_setup:   20,   // Ses profili oluşturma (tek seferlik kurulum)
  voice_message:       10,   // 1 klonlanmış ses mesajı (~30 sn)

  // ── Video messaging (RunPod leadflow-musetalk — self-hosted GPU) ──────────
  avatar_setup:        50,   // Avatar yüz profili hazırlama (tek seferlik)
  video_generate:      30,   // 1 kişiselleştirilmiş video mesaj (~30 sn)
  video_batch_10:     250,   // 10 video toplu paket (%17 bulk indirim)

  // ── Misc utilities ────────────────────────────────────────────────────────
  proposal_pdf:         2,   // 1 teklif PDF
  qr_generate:          1,   // 1 QR kod

  // ── Legacy aliases (backward compat) ──────────────────────────────────────
  ai_analysis:          5,
  ai_video:            30,
  voice_call:          10,
  voice_call_per_min:  10,   // kept for old callers — now maps to voice_message
  sms_send:             1,
  capi_event:           0,   // Meta/Google CAPI — always free
};

// ── Credit topup packages ─────────────────────────────────────────────────────
// Prices in USD cents. Per-credit value intentionally higher than plan rate
// to incentivise subscription. Topups never expire.

export const TOPUP_PACKAGES: Record<string, { credits: number; price: number; name: string; badge?: string; popular?: boolean }> = {
  boost:    { credits: 500,   price: 2900,   name: 'Boost',    badge: undefined },
  power:    { credits: 2000,  price: 9900,   name: 'Power',    badge: 'Popüler', popular: true },
  pro:      { credits: 10000, price: 44900,  name: 'Pro',      badge: 'En Avantajlı' },
  mega:     { credits: 50000, price: 199000, name: 'Mega',     badge: undefined },
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
