-- Domain bazlı trial takibi
-- Her firma domain'i için sadece bir kez ücretsiz trial hakkı

CREATE TABLE IF NOT EXISTS domain_trials (
  domain          TEXT PRIMARY KEY,
  first_user_id   TEXT NOT NULL,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  account_count   INTEGER DEFAULT 1,
  CONSTRAINT domain_trials_domain_check CHECK (domain <> '')
);

CREATE INDEX IF NOT EXISTS idx_domain_trials_domain ON domain_trials(domain);
