-- Atomik kredi güncelleme fonksiyonları (race condition önler)

CREATE OR REPLACE FUNCTION increment_credits_used(user_id uuid, amount int)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users
  SET credits_used = credits_used + amount
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION decrement_credits_used(user_id uuid, amount int)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users
  SET credits_used = GREATEST(0, credits_used - amount)
  WHERE id = user_id;
$$;

-- Test kullanıcısı: bozuk credits_used değerini sıfırla
-- Eğer bir kullanıcının credits_used > credits_total ise düzelt:
UPDATE users
SET credits_used = 0
WHERE credits_used > credits_total;
