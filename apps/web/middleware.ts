import { NextRequest, NextResponse } from 'next/server'

// Desteklenen locale'ler
const LOCALES = ['tr_TR','en_US','en_GB','de_DE','fr_FR','ar_AE','ar_SA','ru_RU','es_ES','it_IT','nl_NL','pl_PL','zh_CN','ja_JP']
const DEFAULT_LOCALE = 'tr_TR'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const url  = req.nextUrl

  // Admin paths bypass locale/auth logic — they have their own auth
  if (url.pathname.startsWith('/admin')) return res

  // 1. URL'den locale oku (?locale=de_DE)
  const urlLocale = url.searchParams.get('locale')
  if (urlLocale && LOCALES.includes(urlLocale)) {
    res.cookies.set('lf_locale', urlLocale, {
      path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax',
    })
    const [lang, country] = urlLocale.split('_')
    res.cookies.set('lf_lang',    lang,    { path:'/', maxAge:365*864e2, sameSite:'lax' })
    res.cookies.set('lf_country', country, { path:'/', maxAge:365*864e2, sameSite:'lax' })
    return res
  }

  // 2. Cookie yoksa browser Accept-Language header'ından tespit et
  const existingLocale = req.cookies.get('lf_locale')?.value
  if (!existingLocale) {
    const acceptLang = req.headers.get('accept-language') || ''
    const detected  = detectLocale(acceptLang)
    res.cookies.set('lf_locale',  detected, { path:'/', maxAge:365*864e2, sameSite:'lax' })
    const [lang, country] = detected.split('_')
    res.cookies.set('lf_lang',    lang,    { path:'/', maxAge:365*864e2, sameSite:'lax' })
    res.cookies.set('lf_country', country, { path:'/', maxAge:365*864e2, sameSite:'lax' })
  }

  return res
}

function detectLocale(acceptLang: string): string {
  const map: Record<string, string> = {
    'tr': 'tr_TR', 'de': 'de_DE', 'en': 'en_US',
    'fr': 'fr_FR', 'ar': 'ar_AE', 'ru': 'ru_RU',
    'es': 'es_ES', 'it': 'it_IT', 'nl': 'nl_NL',
    'pl': 'pl_PL', 'zh': 'zh_CN', 'ja': 'ja_JP',
  }
  const primary = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase()
  return map[primary] || DEFAULT_LOCALE
}

export const config = {
  // Exclude: API routes, Next.js internals, static files, AND all market slugs (tr, de, ru, en, ar, fr, es, nl, pl, us)
  matcher: ['/((?!api|_next/static|_next/image|favicon|icons|manifest|tr|de|ru|en|ar|fr|es|nl|pl|us).*)'],
}
