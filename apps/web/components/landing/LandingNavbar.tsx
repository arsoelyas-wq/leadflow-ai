'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronRight } from 'lucide-react'
import { SparkIcon } from '@/components/SovloLogo'

const DEFAULT_NAV_LINKS = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'Fiyatlar', href: '#fiyatlar' },
  { label: 'Entegrasyonlar', href: '#entegrasyonlar' },
  { label: 'İletişim', href: '/contact' },
]

const NAV_LINK_CLASS = 'px-4 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all duration-150'
const MOBILE_NAV_LINK_CLASS = 'px-4 py-3 text-[15px] font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all'

export default function LandingNavbar({ cfg }: { cfg?: any }) {
  const NAV_LINKS = cfg?.nav_links?.length ? cfg.nav_links : DEFAULT_NAV_LINKS
  const logoName   = cfg?.nav_logo_name   || 'Sovlo'
  const logoSuffix = cfg?.nav_logo_suffix || 'AI'
  const loginText  = cfg?.nav_login_text  || 'Giriş Yap'
  const loginUrl   = cfg?.nav_login_url   || '/login'
  const ctaText    = cfg?.nav_cta_text    || 'Ücretsiz Başla'
  const ctaUrl     = cfg?.nav_cta_url     || '/register'
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16 lg:h-[70px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group select-none">
              {/* Animated Spark icon */}
              <div className="relative flex-shrink-0">
                {/* Glow halo — pulses behind the icon */}
                <div
                  className="absolute inset-0 rounded-full logo-spark-glow"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
                    filter: 'blur(8px)',
                    margin: '-4px',
                  }}
                />
                <div className="relative transition-transform duration-200 group-hover:scale-105">
                  <SparkIcon size={40} />
                </div>
              </div>

              {/* Wordmark */}
              <div className="flex items-baseline gap-[3px]">
                <span className="font-extrabold text-[20px] leading-none tracking-[-0.03em] text-slate-900">{logoName}</span>
                <span className="font-extrabold text-[20px] leading-none tracking-[-0.03em] text-sky-500">{logoSuffix}</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link: any) => (
                link.href.startsWith('/') ? (
                  <Link key={link.label} href={link.href} className={NAV_LINK_CLASS}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} className={NAV_LINK_CLASS}>
                    {link.label}
                  </a>
                )
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href={loginUrl} className="px-4 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
                {loginText}
              </Link>
              <Link href={ctaUrl} className="flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl btn-glow group/cta">
                {ctaText}
                <ChevronRight size={14} className="transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Menüyü aç/kapat"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 w-[min(300px,85vw)] h-full bg-white shadow-2xl transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100">
            <span className="font-bold text-slate-900">Menü</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex flex-col p-4 gap-1">
            {NAV_LINKS.map((link: any) => (
              link.href.startsWith('/') ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={MOBILE_NAV_LINK_CLASS}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={MOBILE_NAV_LINK_CLASS}
                >
                  {link.label}
                </a>
              )
            ))}

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-center text-[15px] font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-center text-[15px] font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl"
              >
                Ücretsiz Başla
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
