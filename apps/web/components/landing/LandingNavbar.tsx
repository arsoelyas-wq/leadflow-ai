'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, Menu, X, ChevronRight } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'Fiyatlar', href: '#fiyatlar' },
]

export default function LandingNavbar() {
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
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <span className="text-slate-900 text-[17px] font-800 tracking-tight font-bold">
                LeadFlow <span className="gradient-text-blue">AI</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all duration-150"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl btn-glow"
              >
                Ücretsiz Başla
                <ChevronRight size={14} />
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
          className={`absolute top-0 right-0 w-[300px] h-full bg-white shadow-2xl transition-transform duration-300 ${
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
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-[15px] font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              >
                {link.label}
              </a>
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
