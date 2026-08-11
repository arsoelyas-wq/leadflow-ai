'use client'
import Link from 'next/link'
import { Mail, MessageSquare, Linkedin, Twitter } from 'lucide-react'
import { SITE_CONFIG, whatsappUrl } from '@/lib/site-config'
import { SparkIcon } from '@/components/SovloLogo'

const PRODUCT_LINKS = [
  { label: 'Lead Scraper',        href: '#ozellikler' },
  { label: 'AI Kampanya',         href: '#ozellikler' },
  { label: 'WhatsApp Outreach',   href: '#ozellikler' },
  { label: 'Pipeline CRM',        href: '#ozellikler' },
  { label: 'Entegrasyonlar',      href: '#entegrasyonlar' },
  { label: 'Fiyatlar',            href: '#fiyatlar' },
]

// Sadece mevcut sayfalar — 404 veren linkler kaldırıldı
const COMPANY_LINKS = [
  { label: 'Nasıl Çalışır',  href: '#nasil-calisir' },
  { label: 'Özellikler',     href: '#ozellikler' },
  { label: 'Fiyatlar',       href: '#fiyatlar' },
  { label: 'SSS',            href: '#' },
  { label: 'İletişim',       href: `mailto:${SITE_CONFIG.email}` },
]

const LEGAL_LINKS = [
  { label: 'Gizlilik Politikası', href: '/privacy' },
  { label: 'Kullanım Koşulları',  href: '/terms' },
  { label: 'KVKK Aydınlatma',     href: '/kvkk-aydinlatma' },
  { label: 'Çerez Politikası',    href: '/cookies' },
  { label: 'GDPR',                href: '/gdpr' },
]

export default function LandingFooter({ cfg }: { cfg?: any }) {
  const year        = new Date().getFullYear()
  const companyDesc = cfg?.footer_company_desc      || 'Yapay zeka destekli B2B lead intelligence ve satış otomasyon platformu. 14 sektörde 2,000+ firma tarafından kullanılıyor.'
  const contactEmail = cfg?.footer_contact_email    || SITE_CONFIG.email
  const linkedinUrl  = cfg?.footer_linkedin_url     || SITE_CONFIG.linkedIn
  const twitterUrl   = cfg?.footer_twitter_url      || SITE_CONFIG.twitter
  const copyright    = cfg?.footer_copyright        || `© ${year} Sovlo AI. Tüm hakları saklıdır.`

  return (
    <footer className="bg-slate-900 text-slate-400">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
              <div className="relative flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', filter: 'blur(6px)', margin: '-3px', opacity: 0.7 }}
                />
                <div className="relative">
                  <SparkIcon size={36} />
                </div>
              </div>
              <div className="flex items-baseline gap-[3px]">
                <span className="font-extrabold text-[18px] leading-none tracking-[-0.03em] text-white">Sovlo</span>
                <span className="font-extrabold text-[18px] leading-none tracking-[-0.03em] text-sky-400">AI</span>
              </div>
            </Link>

            <p className="text-[14px] leading-relaxed mb-5 max-w-xs">
              {companyDesc}
            </p>

            {/* Contact */}
            <div className="flex flex-col gap-2 mb-6">
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-2 text-[13px] hover:text-white transition-colors w-fit"
              >
                <Mail size={13} />
                {contactEmail}
              </a>
              <a
                href={whatsappUrl('Merhaba, Sovlo AI hakkında bilgi almak istiyorum.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13px] hover:text-white transition-colors w-fit"
              >
                <MessageSquare size={13} />
                WhatsApp Destek
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3">
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <Linkedin size={14} className="text-slate-400 hover:text-white" />
              </a>
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <Twitter size={14} className="text-slate-400 hover:text-white" />
              </a>
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

          {/* Company + Legal */}
          <div>
            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Şirket</div>
            <div className="flex flex-col gap-2.5 mb-6">
              {COMPANY_LINKS.map(l => (
                <a key={l.label} href={l.href} className="text-[13px] hover:text-white transition-colors">
                  {l.label}
                </a>
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
              {copyright}
            </p>

            {/* Compliance badges */}
            <div className="flex flex-wrap items-center gap-3">
              {[
                { label: 'KVKK Uyumlu', color: 'bg-slate-800 text-slate-400' },
                { label: 'GDPR Uyumlu', color: 'bg-slate-800 text-slate-400' },
                { label: 'SSL Şifreli',  color: 'bg-slate-800 text-slate-400' },
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
