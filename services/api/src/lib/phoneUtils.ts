export {};

/**
 * Telefon numarasını standart formata normalize eder.
 * Tüm rakam-dışı karakterleri siler, Türkiye numaralarına 90 ekler.
 * Örnekler:
 *   '+90 505 452 95 68' → '905054529568'
 *   '0505 452 9568'     → '905054529568'
 *   '5054529568'        → '905054529568' (Türkiye varsayımı)
 *   '905054529568'      → '905054529568'
 *   '+1 555 123 4567'   → '15551234567'  (yabancı numara korunur)
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Türkiye numarası: 10 haneli (05xx) veya 11 haneli (90xxx)
  if (digits.length === 10 && digits.startsWith('5')) {
    return '90' + digits; // 5054529568 → 905054529568
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '9' + digits;  // 05054529568 → 905054529568
  }
  return digits; // 905054529568 veya yabancı numara olduğu gibi
}

/** Son 10 hanesini karşılaştırarak iki telefonu eşleştirir */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizePhone(a);
  const db = normalizePhone(b);
  if (!da || !db || da.length < 7 || db.length < 7) return false;
  return da.slice(-10) === db.slice(-10);
}

/** Normalize edilmiş telefon doğrulaması (Türkiye ve uluslararası) */
export function isValidPhone(phone: string | null | undefined): boolean {
  const n = normalizePhone(phone);
  return n.length >= 7 && n.length <= 15;
}
