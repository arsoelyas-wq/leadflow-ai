/**
 * Site-wide constants — update these before going live.
 * WhatsApp: tam numara, başında + olmadan (örn. 905xxxxxxxxx)
 * DemoVideoId: YouTube video ID (URL'nin ?v= kısmındaki değer)
 */
export const SITE_CONFIG = {
  // ── İLETİŞİM ───────────────────────────────────────────────────
  whatsappNumber: '905XXXXXXXXXX',   // <-- GERÇEk WhatsApp Business numaranızı girin
  email: 'destek@sovlo.io',

  // ── SOSYAL MEDYA ───────────────────────────────────────────────
  linkedIn: 'https://linkedin.com/company/sovlo-ai',
  twitter: 'https://twitter.com/sovloai',

  // ── DEMO VİDEO ─────────────────────────────────────────────────
  // YouTube video ID'sini girin (https://youtube.com/watch?v=BURAYA)
  demoVideoId: '',   // <-- YouTube video hazırlandıktan sonra buraya girin

  // ── MARKA ──────────────────────────────────────────────────────
  name: 'Sovlo AI',
  url: 'https://sovlo.io',
  tagline: 'Yapay Zeka Destekli B2B Lead Intelligence Platformu',
} as const

/** wa.me linki döndürür */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${SITE_CONFIG.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
