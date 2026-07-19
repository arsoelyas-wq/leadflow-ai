-- business_profiles tablosu ve onboarding_done kolonu
-- Bu migration eksik tabloları/kolonları oluşturur (IF NOT EXISTS — güvenli, tekrar çalıştırılabilir)

-- 1. users tablosuna onboarding_done kolonu ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;

-- 2. business_profiles tablosu
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  company JSONB DEFAULT '{}',
  product JSONB DEFAULT '{}',
  target JSONB DEFAULT '{}',
  sales_style JSONB DEFAULT '{}',
  faq JSONB DEFAULT '[]',
  objections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. user_settings tablosuna onboarding kolonları
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS website TEXT;

-- 4. voice_settings tablosu (business-profile route'u kullanıyor)
CREATE TABLE IF NOT EXISTS voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  agent_name TEXT,
  company_name TEXT,
  product_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_settings_user_id ON voice_settings(user_id);
