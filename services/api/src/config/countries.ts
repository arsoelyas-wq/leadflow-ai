export interface CountryConfig {
  code: string;
  name: string;
  language: string;       // Google Maps API languageCode
  googleDomain: string;   // google.com.tr, google.com, etc.
  region: 'europe' | 'middle_east' | 'americas' | 'asia';
  queries: {
    customers: string;
    business: string;
    complaint: string;
    review: string;
  };
  localComplaintSites: Array<{ id: string; name: string; domain: string }>;
  localDirectories: Array<{ id: string; name: string; domain: string }>;
}

const COUNTRIES: CountryConfig[] = [
  // ── EUROPE ────────────────────────────────────────────────────────────────────
  {
    code: 'TR', name: 'Türkiye', language: 'tr', googleDomain: 'google.com.tr', region: 'europe',
    queries: { customers: 'müşteri', business: 'işletme firma', complaint: 'şikayet', review: 'yorum değerlendirme' },
    localComplaintSites: [{ id: 'sikayetvar', name: 'Şikayetvar', domain: 'sikayetvar.com' }],
    localDirectories: [{ id: 'sahibinden', name: 'Sahibinden', domain: 'sahibinden.com' }],
  },
  {
    code: 'GB', name: 'United Kingdom', language: 'en', googleDomain: 'google.co.uk', region: 'europe',
    queries: { customers: 'customers', business: 'business company', complaint: 'complaint review', review: 'review rating' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'yell', name: 'Yell', domain: 'yell.com' },
    ],
    localDirectories: [{ id: 'checkatrade', name: 'Checkatrade', domain: 'checkatrade.com' }],
  },
  {
    code: 'DE', name: 'Deutschland', language: 'de', googleDomain: 'google.de', region: 'europe',
    queries: { customers: 'Kunden', business: 'Unternehmen Firma', complaint: 'Beschwerden Bewertung', review: 'Bewertung Erfahrungen' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'kununu', name: 'Kununu', domain: 'kununu.com' },
    ],
    localDirectories: [{ id: 'wlw', name: 'Wer-liefert-was', domain: 'wlw.de' }],
  },
  {
    code: 'FR', name: 'France', language: 'fr', googleDomain: 'google.fr', region: 'europe',
    queries: { customers: 'clients', business: 'entreprise société', complaint: 'avis négatifs plaintes', review: 'avis évaluation' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'avis-verifies', name: 'Avis Vérifiés', domain: 'avis-verifies.com' },
    ],
    localDirectories: [{ id: 'pagesjaunes', name: 'PagesJaunes', domain: 'pagesjaunes.fr' }],
  },
  {
    code: 'IT', name: 'Italia', language: 'it', googleDomain: 'google.it', region: 'europe',
    queries: { customers: 'clienti', business: 'azienda impresa', complaint: 'reclami recensioni negative', review: 'recensione valutazione' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'paginagialle', name: 'Pagine Gialle', domain: 'paginegialle.it' }],
  },
  {
    code: 'ES', name: 'España', language: 'es', googleDomain: 'google.es', region: 'europe',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamación', review: 'reseña valoración' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'paginasamarillas', name: 'Páginas Amarillas', domain: 'paginasamarillas.es' }],
  },
  {
    code: 'NL', name: 'Nederland', language: 'nl', googleDomain: 'google.nl', region: 'europe',
    queries: { customers: 'klanten', business: 'bedrijf onderneming', complaint: 'klachten slechte ervaring', review: 'beoordeling recensie' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'telefoongids', name: 'Telefoongids', domain: 'telefoongids.nl' }],
  },
  {
    code: 'BE', name: 'België', language: 'nl', googleDomain: 'google.be', region: 'europe',
    queries: { customers: 'klanten', business: 'bedrijf', complaint: 'klachten', review: 'beoordeling' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'PL', name: 'Polska', language: 'pl', googleDomain: 'google.pl', region: 'europe',
    queries: { customers: 'klienci', business: 'firma przedsiębiorstwo', complaint: 'skargi opinie negatywne', review: 'opinia ocena' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'opineo', name: 'Opineo', domain: 'opineo.pl' },
    ],
    localDirectories: [{ id: 'aleo', name: 'Aleo', domain: 'aleo.com' }],
  },
  {
    code: 'SE', name: 'Sverige', language: 'sv', googleDomain: 'google.se', region: 'europe',
    queries: { customers: 'kunder', business: 'företag', complaint: 'klagomål omdömen', review: 'omdöme betyg' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'reco', name: 'Reco', domain: 'reco.se' },
    ],
    localDirectories: [{ id: 'hitta', name: 'Hitta', domain: 'hitta.se' }],
  },
  {
    code: 'NO', name: 'Norge', language: 'no', googleDomain: 'google.no', region: 'europe',
    queries: { customers: 'kunder', business: 'bedrift', complaint: 'klager anmeldelser', review: 'anmeldelse vurdering' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'gulesider', name: 'Gule Sider', domain: 'gulesider.no' }],
  },
  {
    code: 'DK', name: 'Danmark', language: 'da', googleDomain: 'google.dk', region: 'europe',
    queries: { customers: 'kunder', business: 'virksomhed', complaint: 'klager anmeldelser', review: 'anmeldelse bedømmelse' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'FI', name: 'Suomi', language: 'fi', googleDomain: 'google.fi', region: 'europe',
    queries: { customers: 'asiakkaat', business: 'yritys', complaint: 'valitukset arvostelut', review: 'arvostelu arvio' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'fonecta', name: 'Fonecta', domain: 'fonecta.fi' }],
  },
  {
    code: 'CH', name: 'Schweiz', language: 'de', googleDomain: 'google.ch', region: 'europe',
    queries: { customers: 'Kunden', business: 'Unternehmen', complaint: 'Beschwerden Bewertung', review: 'Bewertung' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'local-ch', name: 'Local.ch', domain: 'local.ch' }],
  },
  {
    code: 'AT', name: 'Österreich', language: 'de', googleDomain: 'google.at', region: 'europe',
    queries: { customers: 'Kunden', business: 'Unternehmen', complaint: 'Beschwerden', review: 'Bewertung' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'PT', name: 'Portugal', language: 'pt', googleDomain: 'google.pt', region: 'europe',
    queries: { customers: 'clientes', business: 'empresa', complaint: 'reclamação', review: 'avaliação' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'GR', name: 'Ελλάδα', language: 'el', googleDomain: 'google.gr', region: 'europe',
    queries: { customers: 'πελάτες', business: 'εταιρεία', complaint: 'παράπονα αξιολόγηση', review: 'αξιολόγηση' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'xo', name: 'XO', domain: 'xo.gr' }],
  },
  {
    code: 'RO', name: 'România', language: 'ro', googleDomain: 'google.ro', region: 'europe',
    queries: { customers: 'clienți', business: 'companie', complaint: 'reclamații', review: 'recenzie' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [{ id: 'paginiaurii', name: 'Pagini Aurii', domain: 'paginiaurii.com' }],
  },
  {
    code: 'CZ', name: 'Česká republika', language: 'cs', googleDomain: 'google.cz', region: 'europe',
    queries: { customers: 'zákazníci', business: 'firma', complaint: 'stížnosti', review: 'recenze hodnocení' },
    localComplaintSites: [{ id: 'heureka', name: 'Heureka', domain: 'heureka.cz' }],
    localDirectories: [{ id: 'firmy', name: 'Firmy.cz', domain: 'firmy.cz' }],
  },
  {
    code: 'HU', name: 'Magyarország', language: 'hu', googleDomain: 'google.hu', region: 'europe',
    queries: { customers: 'ügyfelek', business: 'cég vállalat', complaint: 'panaszok vélemények', review: 'értékelés vélemény' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'HR', name: 'Hrvatska', language: 'hr', googleDomain: 'google.hr', region: 'europe',
    queries: { customers: 'kupci', business: 'tvrtka', complaint: 'pritužbe recenzije', review: 'recenzija ocjena' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'SK', name: 'Slovensko', language: 'sk', googleDomain: 'google.sk', region: 'europe',
    queries: { customers: 'zákazníci', business: 'firma', complaint: 'sťažnosti', review: 'recenzia' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'BG', name: 'България', language: 'bg', googleDomain: 'google.bg', region: 'europe',
    queries: { customers: 'клиенти', business: 'фирма', complaint: 'оплаквания', review: 'рецензия оценка' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'UA', name: 'Україна', language: 'uk', googleDomain: 'google.com.ua', region: 'europe',
    queries: { customers: 'клієнти', business: 'компанія', complaint: 'скарги відгуки', review: 'відгук оцінка' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'IE', name: 'Ireland', language: 'en', googleDomain: 'google.ie', region: 'europe',
    queries: { customers: 'customers', business: 'business', complaint: 'complaint review', review: 'review rating' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },

  // ── MIDDLE EAST & NORTH AFRICA ────────────────────────────────────────────────
  {
    code: 'SA', name: 'المملكة العربية السعودية', language: 'ar', googleDomain: 'google.com.sa', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة مؤسسة', complaint: 'شكوى تقييم سيء', review: 'تقييم مراجعة' },
    localComplaintSites: [{ id: 'mustahlak', name: 'مستهلك', domain: 'mustahlak.com' }],
    localDirectories: [{ id: 'yellowpages-sa', name: 'Yellow Pages SA', domain: 'yellowpages.com.sa' }],
  },
  {
    code: 'AE', name: 'الإمارات العربية المتحدة', language: 'ar', googleDomain: 'google.ae', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة مؤسسة', complaint: 'شكوى تقييم سيء', review: 'تقييم مراجعة' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [
      { id: 'dubizzle', name: 'Dubizzle', domain: 'dubizzle.com' },
      { id: 'yellowpages-ae', name: 'Yellow Pages UAE', domain: 'yellowpages.ae' },
    ],
  },
  {
    code: 'EG', name: 'مصر', language: 'ar', googleDomain: 'google.com.eg', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة مؤسسة', complaint: 'شكوى تقييم سيء', review: 'تقييم مراجعة' },
    localComplaintSites: [{ id: 'opensooq', name: 'OpenSooq', domain: 'eg.opensooq.com' }],
    localDirectories: [{ id: 'opensooq', name: 'OpenSooq', domain: 'eg.opensooq.com' }],
  },
  {
    code: 'QA', name: 'قطر', language: 'ar', googleDomain: 'google.com.qa', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة مؤسسة', complaint: 'شكوى تقييم', review: 'تقييم مراجعة' },
    localComplaintSites: [],
    localDirectories: [{ id: 'yellowpages-qa', name: 'Qatar Yellow Pages', domain: 'yellowpages.qa' }],
  },
  {
    code: 'KW', name: 'الكويت', language: 'ar', googleDomain: 'google.com.kw', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة مؤسسة', complaint: 'شكوى تقييم', review: 'تقييم مراجعة' },
    localComplaintSites: [],
    localDirectories: [{ id: 'yellowpages-kw', name: 'Kuwait Yellow Pages', domain: 'yellowpages.com.kw' }],
  },
  {
    code: 'BH', name: 'البحرين', language: 'ar', googleDomain: 'google.com.bh', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'OM', name: 'عُمان', language: 'ar', googleDomain: 'google.com.om', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'JO', name: 'الأردن', language: 'ar', googleDomain: 'google.jo', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [{ id: 'bayt', name: 'Bayt.com', domain: 'bayt.com' }],
  },
  {
    code: 'LB', name: 'لبنان', language: 'ar', googleDomain: 'google.com.lb', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى تقييم سيء', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'IQ', name: 'العراق', language: 'ar', googleDomain: 'google.iq', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [{ id: 'opensooq', name: 'OpenSooq', domain: 'iq.opensooq.com' }],
    localDirectories: [],
  },
  {
    code: 'MA', name: 'المغرب', language: 'ar', googleDomain: 'google.co.ma', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة مؤسسة', complaint: 'شكوى تقييم', review: 'تقييم مراجعة' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'DZ', name: 'الجزائر', language: 'ar', googleDomain: 'google.dz', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [{ id: 'ouedkniss', name: 'Ouedkniss', domain: 'ouedkniss.com' }],
  },
  {
    code: 'TN', name: 'تونس', language: 'ar', googleDomain: 'google.com.tn', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'LY', name: 'ليبيا', language: 'ar', googleDomain: 'google.com.ly', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'SD', name: 'السودان', language: 'ar', googleDomain: 'google.com', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'YE', name: 'اليمن', language: 'ar', googleDomain: 'google.com.ye', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'SY', name: 'سوريا', language: 'ar', googleDomain: 'google.com', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'PS', name: 'فلسطين', language: 'ar', googleDomain: 'google.ps', region: 'middle_east',
    queries: { customers: 'عملاء زبائن', business: 'شركة', complaint: 'شكوى', review: 'تقييم' },
    localComplaintSites: [],
    localDirectories: [],
  },

  // ── AMERICAS ─────────────────────────────────────────────────────────────────
  {
    code: 'US', name: 'United States', language: 'en', googleDomain: 'google.com', region: 'americas',
    queries: { customers: 'customers clients', business: 'business company', complaint: 'complaint bad review', review: 'review rating stars' },
    localComplaintSites: [
      { id: 'yelp', name: 'Yelp', domain: 'yelp.com' },
      { id: 'bbb', name: 'Better Business Bureau', domain: 'bbb.org' },
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'consumeraffairs', name: 'ConsumerAffairs', domain: 'consumeraffairs.com' },
    ],
    localDirectories: [
      { id: 'thomasnet', name: 'ThomasNet', domain: 'thomasnet.com' },
      { id: 'clutch', name: 'Clutch', domain: 'clutch.co' },
    ],
  },
  {
    code: 'CA', name: 'Canada', language: 'en', googleDomain: 'google.ca', region: 'americas',
    queries: { customers: 'customers', business: 'business company', complaint: 'complaint review', review: 'review rating' },
    localComplaintSites: [
      { id: 'yelp', name: 'Yelp', domain: 'yelp.ca' },
      { id: 'bbb', name: 'BBB Canada', domain: 'bbb.org' },
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
    ],
    localDirectories: [{ id: 'yellowpages-ca', name: 'Yellow Pages', domain: 'yellowpages.ca' }],
  },
  {
    code: 'BR', name: 'Brasil', language: 'pt', googleDomain: 'google.com.br', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negócio', complaint: 'reclamação avaliação ruim', review: 'avaliação nota' },
    localComplaintSites: [
      { id: 'reclameaqui', name: 'Reclame Aqui', domain: 'reclameaqui.com.br' },
      { id: 'consumidor', name: 'Consumidor.gov', domain: 'consumidor.gov.br' },
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
    ],
    localDirectories: [{ id: 'telelistas', name: 'Telelistas', domain: 'telelistas.net' }],
  },
  {
    code: 'MX', name: 'México', language: 'es', googleDomain: 'google.com.mx', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamación', review: 'reseña calificación' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'profeco', name: 'Profeco', domain: 'profeco.gob.mx' },
    ],
    localDirectories: [{ id: 'seccionamarilla', name: 'Sección Amarilla', domain: 'seccionamarilla.com.mx' }],
  },
  {
    code: 'AR', name: 'Argentina', language: 'es', googleDomain: 'google.com.ar', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamo', review: 'reseña calificación' },
    localComplaintSites: [
      { id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' },
      { id: 'reclamos', name: 'Reclamos.com.ar', domain: 'reclamos.com.ar' },
    ],
    localDirectories: [{ id: 'paginasamarillas-ar', name: 'Páginas Amarillas', domain: 'paginasamarillas.com.ar' }],
  },
  {
    code: 'CL', name: 'Chile', language: 'es', googleDomain: 'google.cl', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamo', review: 'reseña calificación' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'CO', name: 'Colombia', language: 'es', googleDomain: 'google.com.co', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamo', review: 'reseña calificación' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'PE', name: 'Perú', language: 'es', googleDomain: 'google.com.pe', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamo', review: 'reseña calificación' },
    localComplaintSites: [{ id: 'trustpilot', name: 'Trustpilot', domain: 'trustpilot.com' }],
    localDirectories: [],
  },
  {
    code: 'VE', name: 'Venezuela', language: 'es', googleDomain: 'google.co.ve', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa negocio', complaint: 'queja reclamo', review: 'reseña' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'EC', name: 'Ecuador', language: 'es', googleDomain: 'google.com.ec', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa', complaint: 'queja', review: 'reseña' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'BO', name: 'Bolivia', language: 'es', googleDomain: 'google.com.bo', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa', complaint: 'queja', review: 'reseña' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'PY', name: 'Paraguay', language: 'es', googleDomain: 'google.com.py', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa', complaint: 'queja', review: 'reseña' },
    localComplaintSites: [],
    localDirectories: [],
  },
  {
    code: 'UY', name: 'Uruguay', language: 'es', googleDomain: 'google.com.uy', region: 'americas',
    queries: { customers: 'clientes', business: 'empresa', complaint: 'queja', review: 'reseña' },
    localComplaintSites: [],
    localDirectories: [],
  },
];

export function getCountryByCode(code: string): CountryConfig {
  if (!code) return COUNTRIES[0];
  const upper = code.toUpperCase().trim().slice(0, 2);
  return COUNTRIES.find(c => c.code === upper) || COUNTRIES[0];
}

export function getAllCountries(): CountryConfig[] {
  return COUNTRIES;
}

export function getCountriesByRegion(region: string): CountryConfig[] {
  return COUNTRIES.filter(c => c.region === region);
}

export const REGION_LABELS: Record<string, string> = {
  europe: '🌍 Avrupa',
  middle_east: '🌙 Orta Doğu & Kuzey Afrika',
  americas: '🌎 Amerika',
  asia: '🌏 Asya',
};

export default COUNTRIES;
