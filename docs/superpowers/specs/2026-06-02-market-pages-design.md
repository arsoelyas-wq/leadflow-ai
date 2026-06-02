# Market Pages System — Design Spec

**Goal:** Per-country landing pages at `/tr`, `/de`, `/ru`, etc., each with fully independent content (hero, video, pricing, testimonials) managed from the dashboard. Zero shared content between markets.

**Architecture:** Next.js route group `(markets)/[locale]/page.tsx` + ISR + Supabase `market_pages` table + Express CRUD API + dashboard admin editor.

**Tech Stack:** Next.js 15 App Router, Supabase, Express, ISR (revalidate: 60s), TypeScript

---

## Database

```sql
CREATE TABLE market_pages (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL,
  locale           varchar(10) NOT NULL,   -- 'tr_TR', 'de_DE'
  slug             varchar(10) NOT NULL,   -- 'tr', 'de'

  is_published     boolean DEFAULT false,
  published_at     timestamptz,

  -- Hero
  hero_badge           varchar(100),
  hero_headline        varchar(300),
  hero_subheadline     text,
  hero_cta_primary_text  varchar(100),
  hero_cta_primary_url   varchar(500),
  hero_cta_secondary_text varchar(100),
  hero_cta_secondary_url  varchar(500),
  hero_image_url   text,
  hero_video_url   text,

  -- Social proof
  stats            jsonb DEFAULT '[]',
  features         jsonb DEFAULT '[]',
  testimonials     jsonb DEFAULT '[]',
  logos            jsonb DEFAULT '[]',

  -- Pricing (local)
  currency         varchar(10),
  currency_symbol  varchar(5),
  price_monthly    integer,
  price_annual     integer,
  price_cta        varchar(100),

  -- Contact
  whatsapp_number  varchar(50),
  calendly_url     varchar(500),

  -- SEO
  meta_title       varchar(200),
  meta_description varchar(500),
  og_image_url     text,

  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  UNIQUE(user_id, slug)
);
```

---

## URL Structure

| Market | URL | Status |
|--------|-----|--------|
| Türkiye | `/tr` | Phase 1 |
| Almanya | `/de` | Phase 2 |
| Rusya | `/ru` | Phase 3 |
| İngiltere | `/en` | Phase 4 |
| BAE | `/ar` | Phase 5 |

---

## File Structure

```
apps/web/app/
├── (markets)/                     # Route group — no URL prefix
│   ├── layout.tsx                 # Public layout (no auth)
│   └── [locale]/
│       └── page.tsx               # /tr, /de, /ru...
├── (dashboard)/
│   └── market-pages/
│       ├── page.tsx               # Markets list
│       └── [locale]/
│           └── page.tsx           # Market editor

apps/web/components/markets/
├── MarketHero.tsx
├── MarketStats.tsx
├── MarketFeatures.tsx
├── MarketTestimonials.tsx
├── MarketPricing.tsx
├── MarketContact.tsx
└── MarketNavbar.tsx

services/api/src/routes/market-pages.ts
```

---

## Implementation Order

1. Supabase migration (market_pages table)
2. Express API routes (GET public, CRUD authenticated)
3. Next.js public page + all section components (TR content)
4. Dashboard admin editor (full form)
5. ISR + revalidation on publish
6. SEO: generateMetadata, sitemap

---

## Design Decisions

- **ISR not SSR**: Pages cache on CDN, revalidate 60s. Fast for visitors, fresh after publish.
- **No CMS dependency**: Content stored in Supabase, edited in our own dashboard.
- **One table, one row per market**: Simple, indexed by (user_id, slug).
- **Route group `(markets)`**: Avoids URL prefix, avoids auth middleware conflict.
- **Market pages are public**: No login required, they're marketing pages.
