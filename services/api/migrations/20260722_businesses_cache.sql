-- Global shared business pool
-- Every lead scraped from any source gets upserted here
-- Used later for cache-first serving (3 months from now)

CREATE TABLE IF NOT EXISTS businesses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id      TEXT        UNIQUE NOT NULL,          -- gp_<place_id>, apify_<id>, osm_<id>, etc.
  company_name     TEXT        NOT NULL,
  phone            TEXT,
  website          TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT        DEFAULT 'TR',
  sector_normalized TEXT,                                -- normalized from query: 'restoran', 'avukat', etc.
  lat              NUMERIC,
  lng              NUMERIC,
  rating           NUMERIC,
  review_count     INT,
  category         TEXT,
  maps_url         TEXT,
  opening_hours    TEXT,
  source           TEXT,
  last_fetched_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups for future cache-first serving
CREATE INDEX IF NOT EXISTS businesses_city_sector   ON businesses(city, sector_normalized);
CREATE INDEX IF NOT EXISTS businesses_country_sector ON businesses(country, sector_normalized);
CREATE INDEX IF NOT EXISTS businesses_created_at    ON businesses(created_at DESC);

-- No RLS needed — this is internal data, not user-facing
-- Service key only access
