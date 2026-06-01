'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from './api'

// ── ÇEVIRI VERİSİ ─────────────────────────────────────────────────────────────
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  tr: {
    // Genel
    'save': 'Kaydet', 'cancel': 'İptal', 'delete': 'Sil', 'edit': 'Düzenle',
    'search': 'Ara', 'loading': 'Yükleniyor...', 'error': 'Hata', 'success': 'Başarılı',
    'back': 'Geri', 'next': 'İleri', 'close': 'Kapat', 'add': 'Ekle', 'new': 'Yeni',
    // Dashboard
    'dashboard.greeting': 'Hoş geldin',
    'dashboard.summary': 'İşte bugünkü özet',
    'dashboard.live': 'Canlı',
    'dashboard.new_campaign': 'Yeni Kampanya',
    'dashboard.total_leads': 'Toplam Lead',
    'dashboard.pipeline': 'Pipeline Değeri',
    'dashboard.reply_rate': 'Cevap Oranı',
    'dashboard.credits': 'Kalan Kredi',
    'dashboard.trend': 'Mesaj Gönderim Trendi',
    'dashboard.funnel': 'Lead Hunisi',
    'dashboard.campaigns': 'Kampanyalar',
    'dashboard.activity': 'Son Aktivite',
    'dashboard.leads': 'Son Leadler',
    // Sidebar
    'nav.dashboard': 'Ana Sayfa',
    'nav.customers': 'Müşteriler',
    'nav.sales': 'Satış',
    'nav.communication': 'İletişim',
    'nav.marketing': 'Pazarlama',
    'nav.market': 'Pazar Analizi',
    'nav.growth': 'Büyüme & Finans',
    'nav.system': 'Sistem',
    // Header
    'header.market': 'Pazar',
    'header.comm_lang': 'İletişim Dili',
  },
  en: {
    'save': 'Save', 'cancel': 'Cancel', 'delete': 'Delete', 'edit': 'Edit',
    'search': 'Search', 'loading': 'Loading...', 'error': 'Error', 'success': 'Success',
    'back': 'Back', 'next': 'Next', 'close': 'Close', 'add': 'Add', 'new': 'New',
    'dashboard.greeting': 'Welcome',
    'dashboard.summary': "Here's today's overview",
    'dashboard.live': 'Live',
    'dashboard.new_campaign': 'New Campaign',
    'dashboard.total_leads': 'Total Leads',
    'dashboard.pipeline': 'Pipeline Value',
    'dashboard.reply_rate': 'Reply Rate',
    'dashboard.credits': 'Remaining Credits',
    'dashboard.trend': 'Message Delivery Trend',
    'dashboard.funnel': 'Lead Funnel',
    'dashboard.campaigns': 'Campaigns',
    'dashboard.activity': 'Recent Activity',
    'dashboard.leads': 'Recent Leads',
    'nav.dashboard': 'Dashboard',
    'nav.customers': 'Customers',
    'nav.sales': 'Sales',
    'nav.communication': 'Communication',
    'nav.marketing': 'Marketing',
    'nav.market': 'Market Analysis',
    'nav.growth': 'Growth & Finance',
    'nav.system': 'System',
    'header.market': 'Market',
    'header.comm_lang': 'Comm. Language',
  },
  de: {
    'save': 'Speichern', 'cancel': 'Abbrechen', 'delete': 'Löschen', 'edit': 'Bearbeiten',
    'search': 'Suchen', 'loading': 'Laden...', 'error': 'Fehler', 'success': 'Erfolg',
    'back': 'Zurück', 'next': 'Weiter', 'close': 'Schließen', 'add': 'Hinzufügen', 'new': 'Neu',
    'dashboard.greeting': 'Willkommen',
    'dashboard.summary': 'Hier ist die heutige Übersicht',
    'dashboard.live': 'Live',
    'dashboard.new_campaign': 'Neue Kampagne',
    'dashboard.total_leads': 'Gesamt Leads',
    'dashboard.pipeline': 'Pipeline-Wert',
    'dashboard.reply_rate': 'Antwortrate',
    'dashboard.credits': 'Verbleibende Credits',
    'dashboard.trend': 'Nachrichtenversand-Trend',
    'dashboard.funnel': 'Lead-Trichter',
    'dashboard.campaigns': 'Kampagnen',
    'dashboard.activity': 'Letzte Aktivitäten',
    'dashboard.leads': 'Letzte Leads',
    'nav.dashboard': 'Startseite',
    'nav.customers': 'Kunden',
    'nav.sales': 'Vertrieb',
    'nav.communication': 'Kommunikation',
    'nav.marketing': 'Marketing',
    'nav.market': 'Marktanalyse',
    'nav.growth': 'Wachstum & Finanzen',
    'nav.system': 'System',
    'header.market': 'Markt',
    'header.comm_lang': 'Komm. Sprache',
  },
  fr: {
    'save': 'Enregistrer', 'cancel': 'Annuler', 'delete': 'Supprimer', 'edit': 'Modifier',
    'search': 'Rechercher', 'loading': 'Chargement...', 'error': 'Erreur', 'success': 'Succès',
    'back': 'Retour', 'next': 'Suivant', 'close': 'Fermer', 'add': 'Ajouter', 'new': 'Nouveau',
    'dashboard.greeting': 'Bienvenue',
    'dashboard.summary': "Voici le résumé d'aujourd'hui",
    'dashboard.live': 'En direct',
    'dashboard.new_campaign': 'Nouvelle campagne',
    'dashboard.total_leads': 'Total Leads',
    'dashboard.pipeline': 'Valeur Pipeline',
    'dashboard.reply_rate': 'Taux de réponse',
    'dashboard.credits': 'Crédits restants',
    'dashboard.trend': 'Tendance d\'envoi',
    'dashboard.funnel': 'Entonnoir Leads',
    'dashboard.campaigns': 'Campagnes',
    'dashboard.activity': 'Activité récente',
    'dashboard.leads': 'Leads récents',
    'nav.dashboard': 'Tableau de bord',
    'nav.customers': 'Clients',
    'nav.sales': 'Ventes',
    'nav.communication': 'Communication',
    'nav.marketing': 'Marketing',
    'nav.market': 'Analyse de marché',
    'nav.growth': 'Croissance & Finance',
    'nav.system': 'Système',
    'header.market': 'Marché',
    'header.comm_lang': 'Langue comm.',
  },
  ar: {
    'save': 'حفظ', 'cancel': 'إلغاء', 'delete': 'حذف', 'edit': 'تعديل',
    'search': 'بحث', 'loading': 'جارٍ التحميل...', 'error': 'خطأ', 'success': 'نجاح',
    'back': 'رجوع', 'next': 'التالي', 'close': 'إغلاق', 'add': 'إضافة', 'new': 'جديد',
    'dashboard.greeting': 'مرحباً',
    'dashboard.summary': 'ملخص اليوم',
    'dashboard.live': 'مباشر',
    'dashboard.new_campaign': 'حملة جديدة',
    'dashboard.total_leads': 'إجمالي العملاء',
    'dashboard.pipeline': 'قيمة المبيعات',
    'dashboard.reply_rate': 'معدل الرد',
    'dashboard.credits': 'الرصيد المتبقي',
    'dashboard.trend': 'اتجاه الإرسال',
    'dashboard.funnel': 'قمع العملاء',
    'dashboard.campaigns': 'الحملات',
    'dashboard.activity': 'النشاط الأخير',
    'dashboard.leads': 'العملاء الأخيرون',
    'nav.dashboard': 'لوحة التحكم',
    'nav.customers': 'العملاء',
    'nav.sales': 'المبيعات',
    'nav.communication': 'التواصل',
    'nav.marketing': 'التسويق',
    'nav.market': 'تحليل السوق',
    'nav.growth': 'النمو والمالية',
    'nav.system': 'النظام',
    'header.market': 'السوق',
    'header.comm_lang': 'لغة التواصل',
  },
}

// ── CONTEXT ───────────────────────────────────────────────────────────────────
interface I18nContextType {
  lang: string
  countryCode: string
  setLang: (l: string) => void
  setCountry: (c: string, defaultLang?: string) => void
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: 'tr', countryCode: 'TR',
  setLang: () => {}, setCountry: () => {},
  t: (k, f) => f || k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang,        setLangState]    = useState('tr')
  const [countryCode, setCountryState] = useState('TR')

  useEffect(() => {
    const savedLang    = localStorage.getItem('lf_lang')    || 'tr'
    const savedCountry = localStorage.getItem('lf_country') || 'TR'
    setLangState(savedLang)
    setCountryState(savedCountry)
  }, [])

  const setLang = (l: string) => {
    setLangState(l)
    localStorage.setItem('lf_lang', l)
    // Sync to backend (fire-and-forget)
    api.patch('/api/platforms/my-country', { language_code: l }).catch(() => {})
  }

  const setCountry = (c: string, defaultLang?: string) => {
    setCountryState(c)
    localStorage.setItem('lf_country', c)
    const newLang = defaultLang || lang
    setLangState(newLang)
    localStorage.setItem('lf_lang', newLang)
    api.patch('/api/platforms/my-country', { country_code: c }).catch(() => {})
  }

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['tr']?.[key] || fallback || key
  }

  return (
    <I18nContext.Provider value={{ lang, countryCode, setLang, setCountry, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
