-- user_phone_numbers — is_default kolonu ekle (30 Ağustos 2026)
ALTER TABLE user_phone_numbers ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- İlk satın alınan numarayı varsayılan yap (eğer hiç is_default=true yoksa)
UPDATE user_phone_numbers un
SET    is_default = TRUE
WHERE  status     = 'active'
  AND  is_default = FALSE
  AND  NOT EXISTS (
    SELECT 1 FROM user_phone_numbers un2
    WHERE  un2.user_id  = un.user_id
      AND  un2.is_default = TRUE
      AND  un2.status     = 'active'
  )
  AND  id IN (
    SELECT DISTINCT ON (user_id) id
    FROM   user_phone_numbers
    WHERE  status = 'active'
    ORDER  BY user_id, purchased_at ASC
  );
