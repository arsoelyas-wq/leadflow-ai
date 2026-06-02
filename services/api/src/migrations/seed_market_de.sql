-- German Market Page Seed Data (🇩🇪 Deutschland)
-- Kein manuelles Ersetzen notwendig — Subquery findet User automatisch.
-- Paste into Supabase SQL Editor → Run

INSERT INTO market_pages (
  user_id, locale, slug, is_published,
  hero_badge, hero_headline, hero_subheadline,
  hero_cta_primary_text, hero_cta_primary_url,
  hero_cta_secondary_text, hero_cta_secondary_url,
  stats, features, testimonials,
  currency, currency_symbol, price_monthly, price_annual, price_cta,
  price_features,
  whatsapp_number, email_contact,
  meta_title, meta_description
)
SELECT
  u.id,
  'de_DE', 'de', true,
  '🇩🇪 Exklusiv für den deutschen Markt',
  'B2B-Vertrieb automatisieren mit Künstlicher Intelligenz',
  'LeadFlow AI kontaktiert täglich 500+ potenzielle Kunden automatisch — via WhatsApp, E-Mail und LinkedIn. Gleichzeitig. 24/7. Ohne Aufwand.',
  '🚀 Kostenlos testen — 14 Tage',
  'https://leadflow-ai-iwsrcmtp0-ecofriendlyhomegoods-8443s-projects.vercel.app/register',
  '▶ Demo ansehen',
  'https://calendly.com/leadflow/demo',
  '[
    {"value":"2.500+","label":"Unternehmen nutzen LeadFlow"},
    {"value":"87%","label":"Mehr Conversions"},
    {"value":"24/7","label":"Vollautomatisch"},
    {"value":"14 Tage","label":"Kostenlos testen"}
  ]'::jsonb,
  '[
    {"icon":"🎯","title":"Intelligente Lead-Generierung","desc":"Automatische Lead-Sammlung aus Google Maps, LinkedIn und Branchendatenbanken. Täglich 1.000+ neue Firmenkontakte — komplett ohne manuelle Arbeit."},
    {"icon":"🤖","title":"KI-gestützte Personalisierung","desc":"Jede Nachricht wird individuell auf den Empfänger zugeschnitten. Kein Spam, echte Verkaufsgespräche. Mit Namen, Firmeninfos und relevantem Kontext."},
    {"icon":"📊","title":"Vertriebs-Pipeline Tracking","desc":"Alle Kundenstatus auf einem Blick. Erkennen Sie heiße Leads sofort und verpassen Sie keine Abschlüsse mehr."},
    {"icon":"📱","title":"WhatsApp Business Integration","desc":"Senden Sie tausende personalisierte WhatsApp-Nachrichten gleichzeitig über die offizielle Business API. Antworten werden automatisch verfolgt."},
    {"icon":"📧","title":"E-Mail-Kampagnen & Sequenzen","desc":"Automatisierte E-Mail-Sequenzen für jeden Funnel-Schritt. Öffnungsraten in Echtzeit überwachen und optimieren."},
    {"icon":"🧠","title":"Entscheidungsträger finden","desc":"KI identifiziert Geschäftsführer, Einkaufsleiter und Direktoren in Zielunternehmen. Direkter Kontakt via LinkedIn-Integration."}
  ]'::jsonb,
  '[
    {"name":"Thomas Müller","company":"Müller GmbH & Co. KG","role":"Geschäftsführer","text":"Mit LeadFlow AI erreichen wir monatlich 400+ neue Geschäftskunden automatisch. Unsere Vertriebseffizienz hat sich verdreifacht. Absolut empfehlenswert für den DACH-Markt.","avatar":"TM","rating":5},
    {"name":"Sabine Weber","company":"Weber Industrietechnik","role":"Vertriebsleiterin","text":"Unsere WhatsApp-Kampagnen erzielen eine Antwortrate von 42%. Der Branchenschnitt liegt bei 8%. Das ist beeindruckend und hat unseren Umsatz deutlich gesteigert.","avatar":"SW","rating":5},
    {"name":"Klaus Schmidt","company":"Schmidt Maschinenbau","role":"Gründer","text":"Das größte Problem im B2B-Vertrieb war immer die Lead-Generierung. Jetzt läuft alles automatisch und wir konzentrieren uns nur noch auf Abschlüsse.","avatar":"KS","rating":5}
  ]'::jsonb,
  'EUR', '€', 89, 59, '🚀 14 Tage kostenlos starten',
  '["Unbegrenzte Lead-Generierung","WhatsApp + E-Mail Integration","KI-Personalisierung","Vertriebs-Pipeline Tracking","Entscheidungsträger-Finder (KI)","Echtzeit-Analysen","DSGVO-konform","24/7 Support auf Deutsch"]'::jsonb,
  '+49 800 000 0000',
  'support-de@leadflow.ai',
  'LeadFlow AI — Die führende B2B-Vertriebsautomatisierung für Deutschland',
  'KI-gestützte B2B-Vertriebsautomatisierung für den deutschen Markt. WhatsApp, E-Mail und LinkedIn vollautomatisch. DSGVO-konform. 2.500+ Unternehmen nutzen LeadFlow. 14 Tage kostenlos testen.'
FROM users u
WHERE u.email = 'ecofriendlyhomegoods@gmail.com'
ON CONFLICT (user_id, slug) DO UPDATE SET
  is_published = EXCLUDED.is_published,
  hero_badge = EXCLUDED.hero_badge,
  hero_headline = EXCLUDED.hero_headline,
  hero_subheadline = EXCLUDED.hero_subheadline,
  hero_cta_primary_text = EXCLUDED.hero_cta_primary_text,
  hero_cta_primary_url = EXCLUDED.hero_cta_primary_url,
  hero_cta_secondary_text = EXCLUDED.hero_cta_secondary_text,
  hero_cta_secondary_url = EXCLUDED.hero_cta_secondary_url,
  stats = EXCLUDED.stats,
  features = EXCLUDED.features,
  testimonials = EXCLUDED.testimonials,
  currency = EXCLUDED.currency,
  currency_symbol = EXCLUDED.currency_symbol,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  price_cta = EXCLUDED.price_cta,
  price_features = EXCLUDED.price_features,
  whatsapp_number = EXCLUDED.whatsapp_number,
  email_contact = EXCLUDED.email_contact,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  updated_at = now();

-- Verify:
-- SELECT slug, locale, is_published, hero_headline FROM market_pages WHERE slug = 'de';
