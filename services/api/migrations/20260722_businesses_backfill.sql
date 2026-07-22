-- Backfill: mevcut tüm leads → businesses cache
-- Her unique business için MD5 tabanlı external_id üretir
-- Aynı firmayı birden fazla kullanıcı çektiyse en yüksek skoru alır

INSERT INTO businesses (
  external_id,
  company_name,
  phone,
  website,
  city,
  country,
  sector_normalized,
  maps_url,
  opening_hours,
  source,
  last_fetched_at,
  created_at
)
SELECT DISTINCT ON (ext_id)
  ext_id                                    AS external_id,
  company_name,
  phone,
  website,
  city,
  COALESCE(country, 'TR')                   AS country,
  sector                                    AS sector_normalized,
  maps_url,
  opening_hours,
  COALESCE(source, 'lead_finder')           AS source,
  COALESCE(created_at, NOW())               AS last_fetched_at,
  COALESCE(created_at, NOW())               AS created_at
FROM (
  SELECT
    -- maps_url varsa ondan, yoksa firma+şehir+telefon hash'inden
    CASE
      WHEN maps_url IS NOT NULL AND maps_url <> ''
        THEN 'maps_' || MD5(LOWER(TRIM(maps_url)))
      ELSE
        'legacy_' || MD5(
          LOWER(TRIM(COALESCE(company_name, ''))) || '|' ||
          LOWER(TRIM(COALESCE(city, '')))         || '|' ||
          LOWER(TRIM(COALESCE(phone, '')))
        )
    END                         AS ext_id,
    company_name,
    phone,
    website,
    city,
    'TR'                        AS country,
    sector,
    maps_url,
    opening_hours,
    source,
    score,
    created_at
  FROM leads
  WHERE
    company_name IS NOT NULL
    AND TRIM(company_name) <> ''
    AND deleted_at IS NULL
) sub
ORDER BY ext_id, score DESC NULLS LAST
ON CONFLICT (external_id) DO UPDATE SET
  phone           = COALESCE(EXCLUDED.phone,    businesses.phone),
  website         = COALESCE(EXCLUDED.website,  businesses.website),
  maps_url        = COALESCE(EXCLUDED.maps_url, businesses.maps_url),
  opening_hours   = COALESCE(EXCLUDED.opening_hours, businesses.opening_hours),
  last_fetched_at = GREATEST(EXCLUDED.last_fetched_at, businesses.last_fetched_at);

-- Sonuç özeti
SELECT
  COUNT(*)                                          AS toplam_business,
  COUNT(DISTINCT city)                              AS benzersiz_sehir,
  COUNT(DISTINCT sector_normalized)                 AS benzersiz_sektor,
  COUNT(*) FILTER (WHERE phone    IS NOT NULL)      AS telefonlu,
  COUNT(*) FILTER (WHERE website  IS NOT NULL)      AS websiteli,
  COUNT(*) FILTER (WHERE maps_url IS NOT NULL)      AS maps_bagli
FROM businesses;
