'use client'
import ChatWidget from '@/components/ChatWidget'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Zap, MessageSquare, Mail, BarChart3, Users, Target,
  CheckCircle, ArrowRight, Star, Shield, Globe, ChevronRight,
  TrendingUp, Clock, Bot, Search
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

// Default config (fallback if DB unavailable)
const DEFAULT_CONFIG = {
  hero_badge: 'Yapay Zeka Destekli B2B Lead Platformu',
  hero_headline: 'Doğru Müşteriye\nDoğru Anda Ulaş',
  hero_subheadline: "Google Maps'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. Rakiplerinden önce müşteri kazan.",
  hero_cta_primary_text: 'Hemen Başla — Ücretsiz',
  hero_cta_primary_url: '/register',
  hero_cta_secondary_text: 'Demo İzle',
  hero_cta_secondary_url: '#demo',
  stats: [
    { value: '2.847+', label: 'Aktif Kullanıcı' },
    { value: '%87', label: 'Dönüşüm Artışı' },
    { value: '7/24', label: 'Otomatik Çalışır' },
    { value: '₺0', label: 'Başlangıç Ücreti' }
  ],
  features: [
    { icon: '🎯', title: 'Akıllı Lead Toplama', desc: 'Google Maps, Instagram ve 50+ kaynaktan otomatik lead toplama. Günde 1000+ firma.', color: '#3b82f6' },
    { icon: '🤖', title: 'AI Kişiselleştirme', desc: 'Her müşteriye özel, doğal görünen mesajlar. Claude AI ile satış konuşması otomatize.', color: '#8b5cf6' },
    { icon: '📱', title: 'WhatsApp & Email', desc: 'WhatsApp Business API, email ve LinkedIn\'den aynı anda ulaş.', color: '#10b981' },
    { icon: '📊', title: 'Pipeline & Takip', desc: 'Tüm satış aşamalarını takip et. Sıcak leadleri anında gör.', color: '#f59e0b' },
    { icon: '🧠', title: 'Karar Verici Bulma', desc: 'AI ile CEO ve karar vericileri bul. LinkedIn entegrasyonu.', color: '#ef4444' },
    { icon: '📈', title: 'Gelişmiş Analitik', desc: 'Kampanya performansı, dönüşüm oranları, ROI takibi.', color: '#06b6d4' }
  ],
  price_monthly: 99,
  price_annual: 79,
  price_cta: 'Ücretsiz Dene',
  price_features: ['500 Kredi/ay', 'WhatsApp Kampanya', 'Lead Scraper', 'AI Analiz', '14 gün ücretsiz'],
  meta_title: 'LeadFlow AI — B2B Satış Otomasyon Platformu',
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [count, setCount] = useState(0)
  const [cfg, setCfg] = useState<any>(DEFAULT_CONFIG)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load config from DB (admin-editable)
  useEffect(() => {
    fetch(`${API}/api/market-pages/public/home`)
      .then(r => r.json())
      .then(d => { if (d.page) setCfg({ ...DEFAULT_CONFIG, ...d.page }) })
      .catch(() => {}) // use defaults on error
  }, [])

  useEffect(() => {
    const target = 2847
    const duration = 2000
    const step = target / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setCount(Math.floor(current))
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [])

  const heroLines = (cfg.hero_headline || '').split('\n')
  const stats = Array.isArray(cfg.stats) ? cfg.stats : DEFAULT_CONFIG.stats
  const features = Array.isArray(cfg.features) ? cfg.features : DEFAULT_CONFIG.features
  const priceFeatures = Array.isArray(cfg.price_features) ? cfg.price_features : DEFAULT_CONFIG.price_features

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #060b1a 0%, #0a0f1e 50%, #060b1a 100%)', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: scrolled ? 'rgba(6,11,26,0.95)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.3s ease', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#fff" />
            </div>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>LeadFlow AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Özellikler', 'Nasıl Çalışır', 'Fiyatlar'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace('ı','i').replace('ş','s').replace('ç','c')}`} style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>{item}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e2e8f0', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Giriş Yap</Link>
            <Link href={cfg.hero_cta_primary_url || '/register'} style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 15px rgba(59,130,246,0.35)' }}>Ücretsiz Başla</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {cfg.hero_badge && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
            <span style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600 }}>{cfg.hero_badge}</span>
          </div>
        )}

        <h1 style={{ fontSize: 'clamp(40px,7vw,80px)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.035em', margin: '0 0 24px', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          {heroLines.map((line: string, i: number) => (
            <span key={i} style={{ display: 'block', background: i === 0 ? 'linear-gradient(135deg,#fff,#94a3b8)' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {line}
            </span>
          ))}
        </h1>

        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, margin: '0 auto 44px', maxWidth: 600 }}>
          {cfg.hero_subheadline}
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={cfg.hero_cta_primary_url || '/register'} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 30px rgba(59,130,246,0.4)' }}>
            🚀 {cfg.hero_cta_primary_text || 'Hemen Başla — Ücretsiz'}
          </Link>
          {cfg.hero_cta_secondary_text && (
            <a href={cfg.hero_cta_secondary_url || '#demo'} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 32px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
              ▶ {cfg.hero_cta_secondary_text}
            </a>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap', marginTop: 64 }}>
          {stats.map((s: any, i: number) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{i === 0 ? count.toLocaleString()+'+' : s.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="özellikler" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.025em' }}>Neden LeadFlow AI?</h2>
          <p style={{ color: '#64748b', fontSize: 18, margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>Rakipleriniz manuel çalışırken siz otomatik büyüyün</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          {features.map((f: any, i: number) => (
            <div key={i} style={{ background: 'linear-gradient(145deg,rgba(8,16,40,0.8),rgba(5,10,28,0.9))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '32px 30px' }}>
              <div style={{ fontSize: 40, marginBottom: 18 }}>{f.icon}</div>
              <h3 style={{ color: '#fff', fontSize: 19, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="fiyatlar" style={{ padding: '100px 24px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.025em' }}>Basit Fiyatlandırma</h2>
          <p style={{ color: '#64748b', fontSize: 18, margin: '0 0 48px' }}>Gizli ücret yok. İstediğiniz zaman iptal.</p>

          <div style={{ background: 'linear-gradient(145deg,rgba(59,130,246,0.07),rgba(99,102,241,0.04))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 24, padding: '48px 40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 20, right: 20, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 100 }}>EN POPÜLER</div>
            <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600, marginBottom: 12 }}>Starter Plan</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              <span style={{ color: '#60a5fa', fontSize: 24 }}>₺</span>
              <span style={{ color: '#fff', fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{cfg.price_monthly || '99'}</span>
              <span style={{ color: '#64748b', fontSize: 18 }}>/ay</span>
            </div>
            {cfg.price_annual && cfg.price_annual < cfg.price_monthly && (
              <div style={{ color: '#34d399', fontSize: 13, fontWeight: 700, marginBottom: 28 }}>Yıllık ödemede ₺{cfg.price_annual}/ay — tasarruf et!</div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', textAlign: 'left' }}>
              {priceFeatures.map((f: string, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < priceFeatures.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={12} color="#10b981" />
                  </div>
                  <span style={{ color: '#e2e8f0', fontSize: 14 }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link href={cfg.hero_cta_primary_url || '/register'} style={{ display: 'block', padding: '16px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 25px rgba(59,130,246,0.4)' }}>
              🚀 {cfg.price_cta || 'Ücretsiz Dene'}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 900, color: '#fff', margin: '0 0 18px', letterSpacing: '-0.025em' }}>
          Rakiplerinden 1 Adım Önde Ol
        </h2>
        <p style={{ color: '#64748b', fontSize: 19, margin: '0 0 44px' }}>14 gün ücretsiz dene. Kredi kartı gerekmez.</p>
        <Link href={cfg.hero_cta_primary_url || '/register'} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '18px 40px', borderRadius: 16, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontSize: 18, fontWeight: 700, textDecoration: 'none', boxShadow: '0 12px 35px rgba(59,130,246,0.45)' }}>
          Hemen Ücretsiz Başla <ArrowRight size={20} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>© {new Date().getFullYear()} LeadFlow AI. Tüm hakları saklıdır. · <a href="/privacy" style={{ color: '#475569', textDecoration: 'none' }}>Gizlilik</a> · <a href="/terms" style={{ color: '#475569', textDecoration: 'none' }}>Şartlar</a></p>
      </footer>

      <ChatWidget />
    </div>
  )
}
