'use client'
import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://leadflow-ai-production.up.railway.app'

// ── 3D CSS Cube ───────────────────────────────────────────────────────────────
function Cube3D({ size = 64 }: { size?: number }) {
  const h = size / 2
  return (
    <div style={{ perspective: `${size * 5}px`, width: size, height: size }}>
      <div className="cat-cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }}>
        {[
          { t: `translateZ(${h}px)`,                  bg: 'rgba(6,182,212,0.15)',  b: 'rgba(6,182,212,0.5)' },
          { t: `translateZ(-${h}px) rotateY(180deg)`, bg: 'rgba(139,92,246,0.15)', b: 'rgba(139,92,246,0.5)' },
          { t: `translateX(-${h}px) rotateY(-90deg)`, bg: 'rgba(20,184,166,0.15)', b: 'rgba(20,184,166,0.5)' },
          { t: `translateX(${h}px) rotateY(90deg)`,   bg: 'rgba(59,130,246,0.15)', b: 'rgba(59,130,246,0.5)' },
          { t: `translateY(-${h}px) rotateX(90deg)`,  bg: 'rgba(16,185,129,0.15)', b: 'rgba(16,185,129,0.5)' },
          { t: `translateY(${h}px) rotateX(-90deg)`,  bg: 'rgba(245,158,11,0.15)', b: 'rgba(245,158,11,0.5)' },
        ].map((f, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: f.t, background: f.bg, border: `1px solid ${f.b}` }} />
        ))}
      </div>
    </div>
  )
}

function FloatCube({ size = 20, delay = '0s', color = '#06b6d4' }: { size?: number; delay?: string; color?: string }) {
  const h = size / 2
  return (
    <div className="cat-float-cube" style={{ animationDelay: delay, width: size, height: size }}>
      <div className="cat-cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', perspective: `${size * 8}px` }}>
        {[
          `translateZ(${h}px)`, `translateZ(-${h}px) rotateY(180deg)`,
          `translateX(-${h}px) rotateY(-90deg)`, `translateX(${h}px) rotateY(90deg)`,
          `translateY(-${h}px) rotateX(90deg)`, `translateY(${h}px) rotateX(-90deg)`,
        ].map((t, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: t, background: `${color}18`, border: `1px solid ${color}55` }} />
        ))}
      </div>
    </div>
  )
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: any; index: number }) {
  const [hovered, setHovered] = useState(false)
  const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const color = colors[index % colors.length]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', transform: hovered ? 'translateY(-4px)' : 'none', boxShadow: hovered ? `0 16px 40px ${color}22` : 'none' }}>
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 17, background: hovered ? `linear-gradient(135deg,${color},#8b5cf6,${color})` : `${color}33`, backgroundSize: '200% 200%', animation: hovered ? 'catBorder 2s linear infinite' : 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(5,10,28,0.98),rgba(8,8,22,0.99))', borderRadius: 15, padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {product.emoji || '📦'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{product.name}</p>
            {product.description && <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 8px', lineHeight: 1.4 }}>{product.description}</p>}
            {product.price && (
              <span style={{ color, fontWeight: 700, fontSize: 14, background: `${color}12`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${color}25` }}>{product.price}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Catalog Page ─────────────────────────────────────────────────────────
export default function CatalogPage({ params }: { params: { slug: string } }) {
  const [ms, setMs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => {
    fetch(`${API_URL}/api/microsite/view/${params.slug}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.microsite) { setNotFound(true); setLoading(false); return }
        setMs(data.microsite)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [params.slug])

  const phone = ms?.leads?.phone?.replace(/\D/g, '') || ''
  const waPhone = phone.startsWith('0') ? `90${phone.slice(1)}` : phone.startsWith('90') ? phone : `90${phone}`
  const waMessage = encodeURIComponent(`Merhaba! Kataloğunuzu inceledim, bilgi almak istiyorum.`)
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`

  const features: any[] = ms?.features || [
    { icon: '🎯', title: 'Kişiselleştirilmiş', desc: 'Sadece sizin ihtiyaçlarınıza göre seçildi' },
    { icon: '⚡', title: 'Hızlı Teslimat', desc: 'Türkiye genelinde hızlı kargo imkânı' },
    { icon: '💎', title: 'Premium Kalite', desc: 'En yüksek kalite standartlarında ürünler' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000814,#050510)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <Cube3D size={80} />
      <p style={{ color: '#64748b', fontSize: 14 }}>Katalog yükleniyor...</p>
      <CatalogStyles />
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000814,#050510)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 56 }}>🔒</div>
      <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Sayfa Bulunamadı</h1>
      <p style={{ color: '#475569', fontSize: 14 }}>Bu katalog linki aktif değil veya süresi dolmuş.</p>
      <CatalogStyles />
    </div>
  )

  const lead = ms.leads

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000814 0%,#03071a 50%,#000510 100%)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <CatalogStyles />

      {/* ── GRID BACKGROUND ─────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.03) 1px,transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, background: 'radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, background: 'rgba(0,8,20,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(6,182,212,0.12)', padding: '14px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#0891b2,#7c3aed)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>L</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>LeadFlow AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 20, padding: '5px 14px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', display: 'inline-block', animation: 'catPulse 2s ease-in-out infinite' }} />
            <span style={{ color: '#67e8f9', fontSize: 12, fontWeight: 600 }}>Kişisel Koleksiyon</span>
          </div>
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 900, margin: '0 auto', padding: '64px 28px 48px' }}>
        {/* Floating cubes */}
        <div style={{ position: 'absolute', top: 30, right: 20, opacity: 0.5 }}><FloatCube size={22} delay="0s" color="#06b6d4" /></div>
        <div style={{ position: 'absolute', top: 80, right: 80, opacity: 0.4 }}><FloatCube size={14} delay="1.2s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', top: 40, left: 20, opacity: 0.4 }}><FloatCube size={16} delay="0.6s" color="#14b8a6" /></div>

        <div style={{ textAlign: 'center' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 30, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', display: 'inline-block', animation: 'catPulse 2s ease-in-out infinite' }} />
            <span style={{ color: '#67e8f9', fontSize: 13, fontWeight: 600 }}>{lead?.company_name} için özel hazırlandı</span>
            {ms.badge && <span style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>{ms.badge}</span>}
          </div>

          {/* Main 3D element */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <Cube3D size={88} />
          </div>

          {/* Headline */}
          <h1 style={{ color: '#fff', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.15, letterSpacing: -0.5 }}>
            {ms.headline}
          </h1>
          <p style={{ color: '#64748b', fontSize: 'clamp(14px, 2vw, 18px)', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.6 }}>
            {ms.subheadline}
          </p>

          {/* CTA */}
          {phone && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: 16, borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(22,163,74,0.35)', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>💬</span> WhatsApp ile Yazın
            </a>
          )}
          {phone && <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{ms.cta_subtext || 'Ücretsiz danışmanlık için bizi arayın'}</p>}
        </div>
      </div>

      {/* ── INTRO CARD ──────────────────────────────────────────────────── */}
      {(ms.custom_message || ms.intro) && (
        <div style={{ position: 'relative', zIndex: 5, maxWidth: 900, margin: '0 auto 48px', padding: '0 28px' }}>
          <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: -1.5, borderRadius: 21, background: 'linear-gradient(135deg,rgba(6,182,212,0.4),rgba(139,92,246,0.3))', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(3,7,18,0.97),rgba(5,8,22,0.99))', borderRadius: 19, padding: '24px 28px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>✨</div>
              <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{ms.custom_message || ms.intro}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 900, margin: '0 auto 48px', padding: '0 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {features.map(({ icon, title, desc }: any, i: number) => {
            const colors = ['#06b6d4', '#8b5cf6', '#10b981']
            const c = colors[i % 3]
            return (
              <div key={title} style={{ background: `linear-gradient(135deg,${c}08,rgba(5,10,25,0.9))`, border: `1px solid ${c}22`, borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>{title}</h3>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── BIG CTA SECTION ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 900, margin: '0 auto 60px', padding: '0 28px' }}>
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden' }}>
          {/* Animated border */}
          <div style={{ position: 'absolute', inset: -2, borderRadius: 26, background: 'linear-gradient(135deg,#06b6d4,#8b5cf6,#14b8a6,#3b82f6,#06b6d4)', backgroundSize: '300% 300%', animation: 'catBorder 3s linear infinite', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(0,8,20,0.97),rgba(5,5,18,0.99))', borderRadius: 22, padding: '48px 32px', textAlign: 'center' }}>
            {/* 3D element in CTA */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <Cube3D size={60} />
            </div>
            <h2 style={{ color: '#fff', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, margin: '0 0 10px' }}>
              {ms.cta_text || 'Hemen İletişime Geçin'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
              {ms.cta_subtext || 'Size özel fiyat teklifi için bizi arayın — ücretsiz danışmanlık'}
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {phone ? (
                <>
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: 15, borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(22,163,74,0.4)' }}>
                    <span style={{ fontSize: 20 }}>💬</span> WhatsApp ile Yazın
                  </a>
                  <a href={`tel:+${waPhone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: 'rgba(6,182,212,0.1)', color: '#67e8f9', fontWeight: 700, fontSize: 15, borderRadius: 14, textDecoration: 'none', border: '1px solid rgba(6,182,212,0.3)' }}>
                    <span style={{ fontSize: 18 }}>📞</span> Ara
                  </a>
                </>
              ) : (
                <div style={{ color: '#475569', fontSize: 14 }}>İletişim için satış temsilcinize ulaşın</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '0 0 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, background: 'linear-gradient(135deg,#0891b2,#7c3aed)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 9 }}>L</span>
          </div>
          <span style={{ color: '#334155', fontSize: 12 }}>Powered by LeadFlow AI</span>
        </div>
      </div>
    </div>
  )
}

function CatalogStyles() {
  return (
    <style>{`
      @keyframes catCubeSpin {
        0%   { transform: rotateX(15deg) rotateY(0deg); }
        100% { transform: rotateX(15deg) rotateY(360deg); }
      }
      .cat-cube-spin { animation: catCubeSpin 10s linear infinite; }

      @keyframes catFloat {
        0%, 100% { transform: translateY(0px) rotateX(15deg) rotateY(0deg); }
        50%       { transform: translateY(-12px) rotateX(15deg) rotateY(180deg); }
      }
      .cat-float-cube { animation: catFloat 4s ease-in-out infinite; }

      @keyframes catBorder {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes catPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }

      * { box-sizing: border-box; }
    `}</style>
  )
}
