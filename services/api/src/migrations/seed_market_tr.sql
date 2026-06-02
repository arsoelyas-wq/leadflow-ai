-- Turkish Market Page Seed Data
-- UUID'yi manuel değiştirmenize gerek yok — subquery ile otomatik bulunur.
-- Sadece bu dosyanın tamamını Supabase SQL Editor'e yapıştırıp Run'a basın.

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
  'tr_TR', 'tr', true,
  '🇹🇷 Türkiye''ye Özel Platform',
  'B2B Satışlarınızı Yapay Zeka ile Otomatikleştirin',
  'LeadFlow AI ile günde 500+ potansiyel müşteriyle otomatik iletişim kurun. WhatsApp, e-posta ve LinkedIn''de aynı anda, 7/24 kesintisiz.',
  '🚀 Ücretsiz Deneyin — 14 Gün',
  'https://leadflow-ai-iwsrcmtp0-ecofriendlyhomegoods-8443s-projects.vercel.app/register',
  '▶ Demo İzle',
  'https://calendly.com/leadflow/demo',
  '[
    {"value":"2.500+","label":"Türk Şirketi Kullanıyor"},
    {"value":"%87","label":"Dönüşüm Artışı"},
    {"value":"7/24","label":"Otomatik Çalışır"},
    {"value":"14 Gün","label":"Ücretsiz Deneme"}
  ]'::jsonb,
  '[
    {"icon":"🎯","title":"Akıllı Lead Toplama","desc":"Google Maps, Instagram ve sektör veritabanlarından otomatik lead toplama. Günde 1000+ firma kaydı, hiç manuel iş yok."},
    {"icon":"🤖","title":"AI ile Kişisel Mesajlaşma","desc":"Her müşteriye özel, doğal görünen mesajlar. Spam değil, gerçek satış konuşması. Müşteri adı ve şirket bilgisiyle kişiselleştirilmiş."},
    {"icon":"📊","title":"Satış Pipeline Takibi","desc":"Tüm müşteri aşamalarını tek panelden takip edin. Sıcak lead''leri anında görün, hiçbirini kaçırmayın."},
    {"icon":"📱","title":"WhatsApp Entegrasyonu","desc":"WhatsApp Business API ile binlerce müşteriye aynı anda mesaj gönderin. Yanıtları otomatik takip edin."},
    {"icon":"📧","title":"E-posta Kampanyaları","desc":"Kişiselleştirilmiş e-posta sekansları ile müşteri ilişkilerini otomatik yönetin. Açılma oranlarını gerçek zamanlı takip edin."},
    {"icon":"🧠","title":"Karar Verici Bulma","desc":"AI ile şirketlerin karar vericilerini, CEO''larını ve satın alma direktörlerini bulun. LinkedIn entegrasyonu ile doğrudan ulaşın."}
  ]'::jsonb,
  '[
    {"name":"Ahmet Yılmaz","company":"Yılmaz Mobilya A.Ş.","role":"Genel Müdür","text":"LeadFlow AI sayesinde ayda 300+ yeni müşteriye ulaşıyoruz. Satış ekibimizin verimliliği 3 kat arttı. Bu araç olmasaydı bugünkü büyümemizi yakalayamazdık.","avatar":"AY","rating":5},
    {"name":"Fatma Kaya","company":"Kaya Tekstil","role":"Satış Direktörü","text":"WhatsApp kampanyalarımızda %45 cevap oranı elde ediyoruz. Sektör ortalaması %8 iken bu inanılmaz bir başarı. Kesinlikle tavsiye ediyorum.","avatar":"FK","rating":5},
    {"name":"Mehmet Demir","company":"Demir İnşaat","role":"Kurucu Ortak","text":"B2B satışta lead bulmak en büyük sorunumuzdu. Artık sistem otomatik çalışıyor, biz sadece kapama yapıyoruz. İlk ay yatırımımı 10 kat geri aldım.","avatar":"MD","rating":5}
  ]'::jsonb,
  'TRY', '₺', 2990, 1990, '🚀 14 Gün Ücretsiz Deneyin',
  '["Sınırsız lead toplama","WhatsApp + E-posta entegrasyonu","AI ile kişiselleştirilmiş mesajlar","Satış pipeline takibi","Karar verici bulma (AI)","Gerçek zamanlı analitik","7/24 teknik destek","API erişimi"]'::jsonb,
  '+90 555 000 00 00',
  'destek@leadflow.ai',
  'LeadFlow AI — Türkiye''nin #1 B2B Satış Otomasyon Platformu',
  'AI destekli B2B satış otomasyonu. WhatsApp, e-posta ve LinkedIn''de otomatik lead toplama ve müşteri iletişimi. 2.500+ Türk şirketi kullanıyor. 14 gün ücretsiz deneyin.'
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

-- Verify — uncomment and run separately:
-- SELECT slug, is_published, hero_headline, user_id FROM market_pages WHERE slug = 'tr';
