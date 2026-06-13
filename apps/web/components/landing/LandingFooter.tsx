'use client'
import Link from 'next/link'
import { Zap, Mail, MessageSquare, Linkedin, Twitter, ExternalLink } from 'lucide-react'

const PRODUCT_LINKS = [
  { label: 'Lead Scraper', href: '#ozellikler' },
  { label: 'AI Kampanya', href: '#ozellikler' },
  { label: 'WhatsApp Outreach', href: '#ozellikler' },
  { label: 'Pipeline CRM', href: '#ozellikler' },
  { label: 'Video Outreach', href: '#ozellikler' },
  { label: 'Entegrasyonlar', href: '#entegrasyonlar' },
  { label: 'Fiyatlar', href: '#fiyatlar' },
]

const COMPANY_LINKS = [
  { label: 'Hakkımızda', href: '/about' },
  { label: 'İletişim', href: '/contact' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'Blog', href: '/blog' },
  { label: 'Kariyer', href: '/careers' },
  { label: 'Ortaklar', href: '/partners' },
  { label: 'API Dokümantasyon', href: '/docs' },
]

const LEGAL_LINKS = [
  { label: 'Gizlilik Politikası', href: '/privacy' },
  { label: 'Kullanım Koşulları', href: '/terms' },
  { label: 'KVKK Aydınlatma', href: '/kvkk' },
  { label: 'Çerez Politikası', href: '/cookies' },
  { label: 'GDPR', href: '/gdpr' },
]

const MARKET_LINKS = [
  { label: '🇹🇷 Türkiye', href: '/tr' },
  { label: '🇩🇪 Almanya', href: '/de' },
  { label: '🇺🇸 Amerika', href: '/en' },
  { label: '🇦🇪 Körfez', href: '/ae' },
  { label: '🇷🇺 Rusya', href: '/ru' },
]

export default function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-slate-400">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Zap size={15} className="text-white fill-white" />
              </div>
              <span className="text-white text-[17px] font-bold">LeadFlow AI</span>
            </Link>

            <p className="text-[14px] leading-relaxed mb-5 max-w-xs">
              Yapay zeka destekli B2B lead intelligence ve satış otomasyon platformu.
              14 ülkede 2,847+ firma tarafından kullanılıyor.
            </p>

            {/* Contact */}
            <div className="flex flex-col gap-2 mb-6">
              <a href="mailto:destek@leadflow.ai" className="flex items-center gap-2 text-[13px] hover:text-white transition-colors w-fit">
                <Mail size={13} />
                destek@leadflow.ai
              </a>
              <a href="https://wa.me/905000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] hover:text-white transition-colors w-fit">
                <MessageSquare size={13} />
                WhatsApp Destek
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3">
              {[
                { icon: Linkedin, href: 'https://linkedin.com/company/leadflow-ai', label: 'LinkedIn' },
                { icon: Twitter, href: 'https://twitter.com/leadflowai', label: 'X/Twitter' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <Icon size={14} className="text-slate-400 hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Ürün</div>
            <div className="flex flex-col gap-2.5">
              {PRODUCT_LINKS.map(l => (
                <a key={l.label} href={l.href} className="text-[13px] hover:text-white transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Şirket</div>
            <div className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map(l => (
                <a key={l.label} href={l.href} className="text-[13px] hover:text-white transition-colors flex items-center gap-1.5">
                  {l.label}
                  {l.href === '/docs' && <ExternalLink size={10} />}
                </a>
              ))}
            </div>
          </div>

          {/* Markets */}
          <div>
            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Pazarlar</div>
            <div className="flex flex-col gap-2.5 mb-6">
              {MARKET_LINKS.map(l => (
                <Link key={l.label} href={l.href} className="text-[13px] hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Yasal</div>
            <div className="flex flex-col gap-2">
              {LEGAL_LINKS.map(l => (
                <Link key={l.label} href={l.href} className="text-[12px] hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-slate-600">
              © {year} LeadFlow AI. Tüm hakları saklıdır.
            </p>

            {/* Compliance badges */}
            <div className="flex flex-wrap items-center gap-3">
              {[
                { label: 'KVKK Uyumlu', color: 'bg-slate-800 text-slate-400' },
                { label: 'GDPR Uyumlu', color: 'bg-slate-800 text-slate-400' },
                { label: 'SSL Şifreli', color: 'bg-slate-800 text-slate-400' },
                { label: '99.9% Uptime', color: 'bg-slate-800 text-slate-400' },
              ].map(b => (
                <span key={b.label} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${b.color}`}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
