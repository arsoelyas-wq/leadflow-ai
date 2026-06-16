'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MarketPage, MARKET_SLUGS } from '@/lib/market-pages'

export default function MarketNavbar({ page }: { page: MarketPage }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const market = MARKET_SLUGS[page.slug]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(3,7,20,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href={`/${page.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#fff',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          }}>L</div>
          <span style={{ color: '#fff', fontSize: 19, fontWeight: 800, letterSpacing: '-0.025em' }}>Sovlo AI</span>
        </Link>

        {/* Right: market badge + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {market && (
            <span style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{market.flag}</span>
              <span>{market.name}</span>
            </span>
          )}
          <a href={page.hero_cta_primary_url || '/register'} style={{
            padding: '10px 22px', borderRadius: 11,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(59,130,246,0.35)',
            transition: 'all 0.2s',
          }}>
            {page.hero_cta_primary_text || 'Başla'}
          </a>
        </div>
      </div>
    </nav>
  )
}
