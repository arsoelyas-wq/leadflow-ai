-- Market Pages Table
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query

CREATE TABLE IF NOT EXISTS market_pages (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL,
  locale           varchar(10) NOT NULL,
  slug             varchar(10) NOT NULL,
  is_published     boolean DEFAULT false,
  published_at     timestamptz,

  hero_badge           varchar(200),
  hero_headline        varchar(500),
  hero_subheadline     text,
  hero_cta_primary_text  varchar(200),
  hero_cta_primary_url   text,
  hero_cta_secondary_text varchar(200),
  hero_cta_secondary_url  text,
  hero_image_url   text,
  hero_video_url   text,
  hero_video_thumbnail text,

  stats            jsonb DEFAULT '[]'::jsonb,
  features         jsonb DEFAULT '[]'::jsonb,
  testimonials     jsonb DEFAULT '[]'::jsonb,
  logos            jsonb DEFAULT '[]'::jsonb,

  currency         varchar(10) DEFAULT 'TRY',
  currency_symbol  varchar(5)  DEFAULT '₺',
  price_monthly    integer DEFAULT 0,
  price_annual     integer DEFAULT 0,
  price_cta        varchar(200),
  price_features   jsonb DEFAULT '[]'::jsonb,

  whatsapp_number  varchar(50),
  calendly_url     text,
  email_contact    varchar(200),

  meta_title       varchar(300),
  meta_description varchar(600),
  og_image_url     text,

  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  CONSTRAINT market_pages_user_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_market_pages_slug ON market_pages (slug);
CREATE INDEX IF NOT EXISTS idx_market_pages_published ON market_pages (is_published);

-- Verify:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'market_pages';
