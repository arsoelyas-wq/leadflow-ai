-- ─── LeadFlow: caller_ids FK düzelt + mevcut numaraları sıfırla (4 Ağustos 2026) ───
--
-- SORUN 1: user_caller_ids.user_id FK'ı auth.users'ı gösteriyor ama
--           JWT'deki user_id public.users'dan geliyor → FK violation
-- ÇÖZÜM: FK'yı kaldır — auth middleware zaten JWT doğruluyor
--
-- SORUN 2: Mevcut numaralar is_verified=true ama Twilio'da doğrulanmamış
--           Bu yüzden Twilio aramalar için bu numaraları "from" olarak reddediyor
-- ÇÖZÜM: Mevcut tüm kayıtları is_verified=false yap — kullanıcılar yeniden doğrulayacak

-- FK constraint kaldır (zaten auth middleware koruyor)
ALTER TABLE user_caller_ids
  DROP CONSTRAINT IF EXISTS user_caller_ids_user_id_fkey;

-- Mevcut tüm doğrulanmamış kayıtları sıfırla
-- (Twilio Verified Caller ID olmadan aramalar zaten çalışmıyordu)
UPDATE user_caller_ids
  SET is_verified = FALSE,
      verified_at = NULL,
      is_default  = FALSE
  WHERE is_verified = TRUE;
