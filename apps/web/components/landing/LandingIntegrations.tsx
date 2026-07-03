'use client'
import React from 'react'
import { Puzzle } from 'lucide-react'
import Reveal from './Reveal'

// SVG brand icons — inline paths (Simple Icons, MIT license)
function IconGoogleMaps() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#4285F4" d="M12 0C7.802 0 4 3.403 4 7.602 4 11.8 7.469 16.812 12 24c4.531-7.188 8-12.2 8-16.398C20 3.403 16.199 0 12 0zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>
  )
}

function IconMeta() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function IconGmail() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z"/>
    </svg>
  )
}

function IconOutlook() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#0078D4" d="M24 7.387v10.478L18.04 14.9l-5.04 4.657V7.387l5.04 2.958L24 7.387zM13 4h8.956L13 8.956V4zM0 4.8v14.4A1.6 1.6 0 0 0 1.6 20.8h9.6V3.2H1.6A1.6 1.6 0 0 0 0 4.8zm7.2 10.4a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z"/>
    </svg>
  )
}

function IconGoogleAds() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#4285F4" d="M1.552 16.222L7.892 5.03A1.552 1.552 0 0 1 10.258 4.68l.014.024L4.01 15.798a1.552 1.552 0 0 1-2.458.424zm8.995 1.346l-3.47-6.01 3.47-6.011h6.94l3.47 6.01-3.47 6.011zm11.899-1.077A1.55 1.55 0 0 1 20.134 17H13.82l6.342-10.986a1.552 1.552 0 0 1 2.284 2.077z"/>
    </svg>
  )
}

function IconHubSpot() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#FF7A59" d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.978V3.08A2.2 2.2 0 0 0 17.233.88h-.027a2.2 2.2 0 0 0-2.196 2.2v.027a2.198 2.198 0 0 0 1.267 1.978V7.93a6.231 6.231 0 0 0-2.962 1.306L5.765 3.98a2.45 2.45 0 1 0-1.17 1.492l7.373 5.145A6.23 6.23 0 0 0 10.8 14.4c0 3.448 2.795 6.243 6.243 6.243S23.286 17.848 23.286 14.4a6.246 6.246 0 0 0-5.122-6.47zm-1.12 9.313a3.19 3.19 0 1 1 0-6.38 3.19 3.19 0 0 1 0 6.38z"/>
    </svg>
  )
}

function IconZapier() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#FF4A00" d="M14.25 9.75l-2.25-6-2.25 6H3.75l5.25 3.75L7.5 19.5 12 15.75l4.5 3.75-1.5-6L20.25 9.75H14.25z"/>
    </svg>
  )
}

function IconCalendly() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#006BFF" d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H5V8h14v13z"/>
      <circle fill="#006BFF" cx="12" cy="14" r="3"/>
    </svg>
  )
}

const INTEGRATIONS = [
  { name: 'Google Maps',        color: '#4285F4', bg: '#EBF2FF', Icon: IconGoogleMaps },
  { name: 'Meta / Facebook',    color: '#1877F2', bg: '#E8F0FE', Icon: IconMeta },
  { name: 'Instagram',          color: '#E4405F', bg: '#FEE8EE', Icon: IconInstagram },
  { name: 'WhatsApp Business',  color: '#25D366', bg: '#E8FBF0', Icon: IconWhatsApp },
  { name: 'LinkedIn',           color: '#0A66C2', bg: '#E6F0FB', Icon: IconLinkedIn },
  { name: 'Gmail / Google',     color: '#EA4335', bg: '#FEE8E7', Icon: IconGmail },
  { name: 'Outlook / Microsoft',color: '#0078D4', bg: '#E6F2FB', Icon: IconOutlook },
  { name: 'Google Ads',         color: '#4285F4', bg: '#EBF2FF', Icon: IconGoogleAds },
  { name: 'HubSpot CRM',        color: '#FF7A59', bg: '#FFF0EB', Icon: IconHubSpot },
  { name: 'Zapier',             color: '#FF4A00', bg: '#FFF1EB', Icon: IconZapier },
  { name: 'Calendly',           color: '#006BFF', bg: '#E5F0FF', Icon: IconCalendly },
] as const

function IntegrationCard({ name, bg, Icon }: { name: string; color: string; bg: string; Icon: () => React.ReactElement }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-default group">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon />
      </div>
      <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap group-hover:text-slate-900 transition-colors">
        {name}
      </span>
    </div>
  )
}

export default function LandingIntegrations() {
  const row1 = INTEGRATIONS.slice(0, 6)
  const row2 = INTEGRATIONS.slice(6)

  return (
    <section id="entegrasyonlar" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[13px] font-semibold mb-6">
              <Puzzle size={13} />
              Entegrasyonlar
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Kullandığınız araçlarla{' '}
              <span className="gradient-text-blue">tam uyum</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Mevcut iş akışınıza hemen dahil olur. Sıfırdan başlamak yok.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Row 1 — left to right */}
      <div className="relative mb-4">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="flex animate-marquee will-change-transform gap-3 w-max px-3">
          {[...row1, ...row1].map((item, i) => (
            <IntegrationCard key={`r1-${i}`} {...item} />
          ))}
        </div>
      </div>

      {/* Row 2 — right to left */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="flex animate-marquee-reverse will-change-transform gap-3 w-max px-3">
          {[...row2, ...row2].map((item, i) => (
            <IntegrationCard key={`r2-${i}`} {...item} />
          ))}
        </div>
      </div>

      {/* More */}
      <div className="max-w-7xl mx-auto px-6 mt-8 text-center">
        <p className="text-[14px] text-slate-400 font-medium">
          Ve <span className="text-blue-600 font-bold">Zapier</span> ile 5,000+ uygulamaya
          bağlanın — ihtiyacınız olan her şey bir tık ötede.
        </p>
      </div>
    </section>
  )
}
