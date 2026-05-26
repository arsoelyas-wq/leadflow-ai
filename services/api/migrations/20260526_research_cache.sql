-- Global cross-user company research cache
-- Keyed by normalized company name + country, shared across all users
-- TTL: 14 days (expired rows cleaned up automatically)

create table if not exists company_research_cache (
  id          uuid        primary key default gen_random_uuid(),
  company_key text        not null unique,          -- normalized: "acme corp|TR"
  research_data jsonb     not null,
  cached_at   timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days'
);

create index if not exists idx_research_cache_key     on company_research_cache (company_key);
create index if not exists idx_research_cache_expires on company_research_cache (expires_at);
