'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { api } from './api'

// ── LOCALE TANIMLAR ───────────────────────────────────────────────────────────
export const LOCALE_MAP: Record<string, { lang: string; country: string; name: string; flag: string }> = {
  tr_TR: { lang:'tr', country:'TR', name:'Türkçe (Türkiye)',         flag:'tr' },
  de_DE: { lang:'de', country:'DE', name:'Deutsch (Deutschland)',    flag:'de' },
  en_US: { lang:'en', country:'US', name:'English (United States)',  flag:'us' },
  en_GB: { lang:'en', country:'GB', name:'English (United Kingdom)', flag:'gb' },
  fr_FR: { lang:'fr', country:'FR', name:'Français (France)',        flag:'fr' },
  ar_AE: { lang:'ar', country:'AE', name:'العربية (الإمارات)',       flag:'ae' },
  ar_SA: { lang:'ar', country:'SA', name:'العربية (السعودية)',       flag:'sa' },
  ru_RU: { lang:'ru', country:'RU', name:'Русский (Россия)',         flag:'ru' },
  es_ES: { lang:'es', country:'ES', name:'Español (España)',         flag:'es' },
  it_IT: { lang:'it', country:'IT', name:'Italiano (Italia)',        flag:'it' },
  nl_NL: { lang:'nl', country:'NL', name:'Nederlands (Nederland)',   flag:'nl' },
  pl_PL: { lang:'pl', country:'PL', name:'Polski (Polska)',          flag:'pl' },
  zh_CN: { lang:'zh', country:'CN', name:'中文 (中国)',               flag:'cn' },
  ja_JP: { lang:'ja', country:'JP', name:'日本語 (日本)',             flag:'jp' },
}

// ── ÇEVİRİLER ────────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  tr: {
    // Genel
    'save':'Kaydet','cancel':'İptal','delete':'Sil','edit':'Düzenle','search':'Ara',
    'loading':'Yükleniyor...','back':'Geri','close':'Kapat','add':'Ekle','new':'Yeni',
    // Dashboard
    'dashboard.greeting':'Hoş geldin',
    'dashboard.summary':'İşte bugünkü özet',
    'dashboard.live':'Canlı',
    'dashboard.new_campaign':'Yeni Kampanya',
    'dashboard.total_leads':'Toplam Lead',
    'dashboard.pipeline':'Pipeline Değeri',
    'dashboard.reply_rate':'Cevap Oranı',
    'dashboard.credits':'Kalan Kredi',
    'dashboard.trend':'Mesaj Gönderim Trendi',
    'dashboard.funnel':'Lead Hunisi',
    'dashboard.campaigns':'Kampanyalar',
    'dashboard.activity':'Son Aktivite',
    'dashboard.leads':'Son Leadler',
    // Sidebar nav grup başlıkları
    'nav.customers':'Müşteriler',
    'nav.sales':'Satış',
    'nav.communication':'İletişim',
    'nav.marketing':'Pazarlama',
    'nav.market':'Pazar Analizi',
    'nav.growth':'Büyüme & Finans',
    'nav.system':'Sistem',
    // Sidebar nav item isimleri
    'nav.leads':'Müşterilerim',
    'nav.lead_machine':'Yeni Müşteri Bul',
    'nav.decision_maker':'Karar Vericiler',
    'nav.network':'Bağlantı Ağım',
    'nav.health_scores':'Müşteri Sinyali',
    'nav.pipeline':'Satış Akışım',
    'nav.proposals':'Tekliflerim',
    'nav.products':'Ürün Listem',
    'nav.microsites':'Dijital Vitrinim',
    'nav.qr_codes':'QR Araçları',
    'nav.workflow':'Oto-Pilot',
    'nav.agent':'Satış Ajanım',
    'nav.inbox':'Mesaj Merkezim',
    'nav.campaigns':'WhatsApp Yayını',
    'nav.email':'E-posta Yayını',
    'nav.sms':'SMS Yayını',
    'nav.voice':'Sesli Ajan',
    'nav.video':'Video Klonum',
    'nav.ads':'Meta Reklamlarım',
    'nav.google_ads':'Google Reklamlarım',
    'nav.ads_advanced':'Reklam Otopilotu',
    'nav.meta_intent':'Akıllı Kitle',
    'nav.competitor':'Rakip Radarım',
    'nav.shadow':'Rakip İzleme',
    'nav.price_tracker':'Fiyat Alarmı',
    'nav.visual_trends':'Trend Alarmı',
    'nav.cultural':'Yerel Uyum',
    'nav.analytics':'Analizlerim',
    'nav.reports':'Raporlarım',
    'nav.revenue':'Gelir Öngörüsü',
    'nav.financial':'Para Akışım',
    'nav.loyalty':'Sadakat Puanım',
    'nav.referral':'Tavsiye Ağım',
    'nav.debt_collector':'Alacaklarım',
    'nav.automations':'Otomasyon Merkezim',
    'nav.wa_numbers':'WhatsApp Hatlarım',
    'nav.developer':'API Erişimim',
    'nav.whitelabel':'White-Label',
    'nav.monitoring':'Sistem Monitörüm',
    'nav.billing':'Aboneliğim',
    'nav.settings':'Ayarlarım',
    'nav.platforms':'Ülke & Platformlar',
    'nav.dashboard':'Ana Sayfa',
    // Özel araçlar
    'nav.tenders':'İhale Radarım',
    'nav.export':'İhracat Zekam',
    'nav.team':'Ekip Merkezim',
    // TopBar
    'topbar.market':'Pazar',
    'topbar.comm_lang':'Dil',
    'topbar.search_country':'Ülke ara...',
    'topbar.all_regions':'Tümü',
    'topbar.ui_lang':'Arayüz dili',
    'topbar.effect':'Arayüz ve AI mesaj dilini değiştirir',
    'topbar.market_effect':'Seçilen pazar, AI mesaj ve arama kaynaklarını belirler',
    'topbar.share_link':'Paylaşılabilir Link',
    'topbar.copied':'Kopyalandı!',
  },
  de: {
    'save':'Speichern','cancel':'Abbrechen','delete':'Löschen','edit':'Bearbeiten','search':'Suchen',
    'loading':'Laden...','back':'Zurück','close':'Schließen','add':'Hinzufügen','new':'Neu',
    'dashboard.greeting':'Willkommen',
    'dashboard.summary':'Hier ist Ihre heutige Übersicht',
    'dashboard.live':'Live',
    'dashboard.new_campaign':'Neue Kampagne',
    'dashboard.total_leads':'Gesamt Leads',
    'dashboard.pipeline':'Pipeline-Wert',
    'dashboard.reply_rate':'Antwortrate',
    'dashboard.credits':'Verbleibende Credits',
    'dashboard.trend':'Nachrichtenversand-Trend',
    'dashboard.funnel':'Lead-Trichter',
    'dashboard.campaigns':'Kampagnen',
    'dashboard.activity':'Letzte Aktivitäten',
    'dashboard.leads':'Letzte Leads',
    'nav.customers':'Kunden',
    'nav.sales':'Vertrieb',
    'nav.communication':'Kommunikation',
    'nav.marketing':'Marketing',
    'nav.market':'Marktanalyse',
    'nav.growth':'Wachstum & Finanzen',
    'nav.system':'System',
    'nav.leads':'Meine Kunden','nav.lead_machine':'Neue Kunden finden','nav.decision_maker':'Entscheider',
    'nav.network':'Mein Netzwerk','nav.health_scores':'Kundensignal','nav.pipeline':'Mein Vertriebsfluss',
    'nav.proposals':'Meine Angebote','nav.products':'Meine Produktliste','nav.microsites':'Mein digitaler Auftritt',
    'nav.qr_codes':'QR-Tools','nav.workflow':'Autopilot','nav.agent':'Mein Vertriebsagent',
    'nav.inbox':'Nachrichtencenter','nav.campaigns':'WhatsApp-Broadcast','nav.email':'E-Mail-Broadcast',
    'nav.sms':'SMS-Broadcast','nav.voice':'Sprachagent','nav.video':'Mein Video-Klon',
    'nav.ads':'Meine Meta-Anzeigen','nav.google_ads':'Meine Google-Anzeigen','nav.ads_advanced':'Anzeigen-Autopilot',
    'nav.meta_intent':'Intelligente Zielgruppe','nav.competitor':'Mein Konkurrenten-Radar','nav.shadow':'Wettbewerbsüberwachung',
    'nav.price_tracker':'Preisalarm','nav.visual_trends':'Trend-Alarm','nav.cultural':'Lokale Anpassung',
    'nav.analytics':'Meine Analysen','nav.reports':'Meine Berichte','nav.revenue':'Umsatzprognose',
    'nav.financial':'Mein Geldfluss','nav.loyalty':'Meine Treuepunkte','nav.referral':'Mein Empfehlungsnetz',
    'nav.debt_collector':'Meine Forderungen','nav.automations':'Mein Automatisierungszentrum',
    'nav.wa_numbers':'Meine WhatsApp-Leitungen','nav.developer':'Mein API-Zugang','nav.whitelabel':'White-Label',
    'nav.monitoring':'Systemmonitor','nav.billing':'Mein Abonnement','nav.settings':'Meine Einstellungen',
    'nav.platforms':'Land & Plattformen','nav.dashboard':'Startseite',
    'nav.tenders':'Mein Ausschreibungs-Radar','nav.export':'Meine Export-KI','nav.team':'Mein Team-Center',
    'topbar.market':'Markt','topbar.comm_lang':'Sprache','topbar.search_country':'Land suchen...',
    'topbar.all_regions':'Alle','topbar.ui_lang':'Oberflächensprache',
    'topbar.effect':'Ändert die Oberflächen- und KI-Nachrichtensprache',
    'topbar.market_effect':'Der gewählte Markt bestimmt KI-Nachrichten und Suchquellen',
    'topbar.share_link':'Teilbarer Link','topbar.copied':'Kopiert!',
  },
  en: {
    'save':'Save','cancel':'Cancel','delete':'Delete','edit':'Edit','search':'Search',
    'loading':'Loading...','back':'Back','close':'Close','add':'Add','new':'New',
    'dashboard.greeting':'Welcome',
    'dashboard.summary':"Here's today's overview",
    'dashboard.live':'Live',
    'dashboard.new_campaign':'New Campaign',
    'dashboard.total_leads':'Total Leads',
    'dashboard.pipeline':'Pipeline Value',
    'dashboard.reply_rate':'Reply Rate',
    'dashboard.credits':'Remaining Credits',
    'dashboard.trend':'Message Delivery Trend',
    'dashboard.funnel':'Lead Funnel',
    'dashboard.campaigns':'Campaigns',
    'dashboard.activity':'Recent Activity',
    'dashboard.leads':'Recent Leads',
    'nav.customers':'Customers',
    'nav.sales':'Sales',
    'nav.communication':'Communication',
    'nav.marketing':'Marketing',
    'nav.market':'Market Analysis',
    'nav.growth':'Growth & Finance',
    'nav.system':'System',
    'nav.leads':'My Customers','nav.lead_machine':'Find New Customers','nav.decision_maker':'Decision Makers',
    'nav.network':'My Network','nav.health_scores':'Customer Signal','nav.pipeline':'My Sales Flow',
    'nav.proposals':'My Proposals','nav.products':'My Product List','nav.microsites':'My Digital Storefront',
    'nav.qr_codes':'QR Tools','nav.workflow':'Autopilot','nav.agent':'My Sales Agent',
    'nav.inbox':'Message Center','nav.campaigns':'WhatsApp Broadcast','nav.email':'Email Broadcast',
    'nav.sms':'SMS Broadcast','nav.voice':'Voice Agent','nav.video':'My Video Clone',
    'nav.ads':'My Meta Ads','nav.google_ads':'My Google Ads','nav.ads_advanced':'Ad Autopilot',
    'nav.meta_intent':'Smart Audience','nav.competitor':'My Competitor Radar','nav.shadow':'Market Surveillance',
    'nav.price_tracker':'Price Alert','nav.visual_trends':'Trend Alert','nav.cultural':'Local Adaptation',
    'nav.analytics':'My Analytics','nav.reports':'My Reports','nav.revenue':'Revenue Forecast',
    'nav.financial':'My Cash Flow','nav.loyalty':'My Loyalty Score','nav.referral':'My Referral Network',
    'nav.debt_collector':'My Receivables','nav.automations':'My Automation Center',
    'nav.wa_numbers':'My WhatsApp Lines','nav.developer':'My API Access','nav.whitelabel':'White-Label',
    'nav.monitoring':'System Monitor','nav.billing':'My Subscription','nav.settings':'My Settings',
    'nav.platforms':'Country & Platforms','nav.dashboard':'Home',
    'nav.tenders':'My Tender Radar','nav.export':'My Export AI','nav.team':'My Team Center',
    'topbar.market':'Market','topbar.comm_lang':'Language','topbar.search_country':'Search country...',
    'topbar.all_regions':'All','topbar.ui_lang':'Interface language',
    'topbar.effect':'Changes the interface and AI message language',
    'topbar.market_effect':'The selected market determines AI messages and search sources',
    'topbar.share_link':'Shareable Link','topbar.copied':'Copied!',
  },
  fr: {
    'save':'Enregistrer','cancel':'Annuler','delete':'Supprimer','edit':'Modifier','search':'Rechercher',
    'loading':'Chargement...','back':'Retour','close':'Fermer','add':'Ajouter','new':'Nouveau',
    'dashboard.greeting':'Bienvenue','dashboard.summary':"Voici le résumé d'aujourd'hui",'dashboard.live':'En direct',
    'dashboard.new_campaign':'Nouvelle campagne','dashboard.total_leads':'Total Leads',
    'dashboard.pipeline':'Valeur Pipeline','dashboard.reply_rate':'Taux de réponse',
    'dashboard.credits':'Crédits restants','dashboard.trend':"Tendance d'envoi",
    'dashboard.funnel':'Entonnoir Leads','dashboard.campaigns':'Campagnes',
    'dashboard.activity':'Activité récente','dashboard.leads':'Leads récents',
    'nav.customers':'Clients','nav.sales':'Ventes','nav.communication':'Communication',
    'nav.marketing':'Marketing','nav.market':'Analyse de marché','nav.growth':'Croissance & Finance','nav.system':'Système',
    'nav.leads':'Mes clients','nav.lead_machine':'Trouver des clients','nav.decision_maker':'Décideurs',
    'nav.dashboard':'Accueil','nav.tenders':'Mon Radar Appels d\'offres','nav.export':'Mon IA Export','nav.team':'Mon Centre Équipe',
    'topbar.market':'Marché','topbar.comm_lang':'Langue','topbar.search_country':'Rechercher pays...',
    'topbar.all_regions':'Tous','topbar.ui_lang':'Langue interface',
    'topbar.effect':'Change la langue de l\'interface et des messages IA',
    'topbar.market_effect':'Le marché sélectionné détermine les messages IA et les sources de recherche',
    'topbar.share_link':'Lien partageable','topbar.copied':'Copié!',
  },
  ar: {
    'save':'حفظ','cancel':'إلغاء','delete':'حذف','edit':'تعديل','search':'بحث',
    'loading':'جارٍ التحميل...','back':'رجوع','close':'إغلاق','add':'إضافة','new':'جديد',
    'dashboard.greeting':'مرحباً','dashboard.summary':'ملخص اليوم','dashboard.live':'مباشر',
    'dashboard.new_campaign':'حملة جديدة','dashboard.total_leads':'إجمالي العملاء',
    'dashboard.pipeline':'قيمة خط الأنابيب','dashboard.reply_rate':'معدل الرد',
    'dashboard.credits':'الرصيد المتبقي','dashboard.trend':'اتجاه الإرسال',
    'dashboard.funnel':'قمع العملاء','dashboard.campaigns':'الحملات',
    'dashboard.activity':'النشاط الأخير','dashboard.leads':'العملاء الأخيرون',
    'nav.customers':'العملاء','nav.sales':'المبيعات','nav.communication':'التواصل',
    'nav.marketing':'التسويق','nav.market':'تحليل السوق','nav.growth':'النمو والمالية','nav.system':'النظام',
    'nav.leads':'عملائي','nav.lead_machine':'إيجاد عملاء','nav.decision_maker':'صانعو القرار',
    'nav.dashboard':'الرئيسية','nav.tenders':'رادار المناقصات','nav.export':'ذكاء التصدير','nav.team':'مركز الفريق',
    'topbar.market':'السوق','topbar.comm_lang':'اللغة','topbar.search_country':'بحث عن دولة...',
    'topbar.all_regions':'الكل','topbar.ui_lang':'لغة الواجهة',
    'topbar.effect':'تغيير لغة الواجهة ورسائل الذكاء الاصطناعي',
    'topbar.market_effect':'السوق المختار يحدد رسائل الذكاء الاصطناعي ومصادر البحث',
    'topbar.share_link':'رابط قابل للمشاركة','topbar.copied':'تم النسخ!',
  },
}

// ── CONTEXT ───────────────────────────────────────────────────────────────────
interface I18nCtx {
  locale: string       // tr_TR, de_DE ...
  lang: string         // tr, de, en ...
  countryCode: string  // TR, DE, US ...
  setLocale: (locale: string) => void
  t: (key: string, fallback?: string) => string
  getShareUrl: (path?: string) => string
}

const I18nContext = createContext<I18nCtx>({
  locale:'tr_TR', lang:'tr', countryCode:'TR',
  setLocale:()=>{}, t:(k,f)=>f||k, getShareUrl:()=>'',
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('tr_TR')

  useEffect(() => {
    // Priority: URL param → localStorage → cookie → default
    const urlLocale  = new URLSearchParams(window.location.search).get('locale')
    const lsLocale   = localStorage.getItem('lf_locale')
    const cookieMap  = Object.fromEntries(document.cookie.split(';').map(c => c.trim().split('=')))
    const ckLocale   = cookieMap['lf_locale']
    const resolved   = (urlLocale && LOCALE_MAP[urlLocale]) ? urlLocale
                     : (lsLocale  && LOCALE_MAP[lsLocale])  ? lsLocale
                     : (ckLocale  && LOCALE_MAP[ckLocale])  ? ckLocale
                     : 'tr_TR'
    setLocaleState(resolved)
    localStorage.setItem('lf_locale', resolved)
  }, [])

  const setLocale = useCallback((newLocale: string) => {
    if (!LOCALE_MAP[newLocale]) return
    setLocaleState(newLocale)
    localStorage.setItem('lf_locale', newLocale)
    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('locale', newLocale)
    window.history.replaceState({}, '', url.toString())
    // Sync to backend
    const { lang, country } = LOCALE_MAP[newLocale]
    api.patch('/api/platforms/my-country', { country_code: country, language_code: lang }).catch(()=>{})
  }, [])

  const t = useCallback((key: string, fallback?: string): string => {
    const info = LOCALE_MAP[locale] || LOCALE_MAP['tr_TR']
    const l    = info.lang
    return T[l]?.[key] || T['tr']?.[key] || fallback || key
  }, [locale])

  const getShareUrl = useCallback((path?: string): string => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const p    = path || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard')
    return `${base}${p}?locale=${locale}`
  }, [locale])

  const info = LOCALE_MAP[locale] || LOCALE_MAP['tr_TR']

  return (
    <I18nContext.Provider value={{
      locale, lang: info.lang, countryCode: info.country,
      setLocale, t, getShareUrl,
    }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
