'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const API_URL = 'https://leadflow-ai-production.up.railway.app'

// ── Quantum Orbital Sphere ─────────────────────────────────────────────────────
// Far more impressive than a cube — rotating rings + glowing core + particles
function QuantumOrb({ size = 80 }: { size?: number }) {
  const s = size
  const ring = (extra: number) => s + extra * 2
  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow */}
      <div style={{ position: 'absolute', width: s * 2.2, height: s * 2.2, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)', animation: 'orbGlow 3s ease-in-out infinite' }} />

      {/* Ring 1 — equatorial, fast */}
      <div style={{ position: 'absolute', width: ring(s * 0.55), height: ring(s * 0.55), borderRadius: '50%', border: '1.5px solid rgba(6,182,212,0.55)', animation: 'ring1 4s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
      </div>

      {/* Ring 2 — tilted 60°, medium */}
      <div style={{ position: 'absolute', width: ring(s * 0.4), height: ring(s * 0.4), borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.5)', animation: 'ring2 6s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
      </div>

      {/* Ring 3 — tilted 30°, slow */}
      <div style={{ position: 'absolute', width: ring(s * 0.28), height: ring(s * 0.28), borderRadius: '50%', border: '1px solid rgba(20,184,166,0.45)', animation: 'ring3 9s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -2.5, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', boxShadow: '0 0 8px #14b8a6' }} />
      </div>

      {/* Core sphere */}
      <div style={{
        width: s, height: s, borderRadius: '50%', position: 'relative', zIndex: 2,
        background: `radial-gradient(circle at 38% 32%, #a5f3fc, #0891b2 40%, #0c1a3a 75%)`,
        boxShadow: `0 0 ${s * 0.4}px rgba(6,182,212,0.6), 0 0 ${s * 0.8}px rgba(6,182,212,0.2), inset 0 0 ${s * 0.3}px rgba(255,255,255,0.08)`,
        animation: 'coreBreath 4s ease-in-out infinite',
      }}>
        {/* Specular highlight */}
        <div style={{ position: 'absolute', top: '18%', left: '22%', width: '28%', height: '18%', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(3px)', transform: 'rotate(-30deg)' }} />
      </div>
    </div>
  )
}

function SmallOrb({ size = 28, color = '#06b6d4', delay = '0s' }: { size?: number; color?: string; delay?: string }) {
  return (
    <div className="cat-float-orb" style={{ animationDelay: delay, width: size * 1.8, height: size * 1.8, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: size * 1.8, height: size * 1.8, borderRadius: '50%', border: `1px solid ${color}50`, animation: `ring1 ${3 + size / 10}s linear infinite` }} />
      <div style={{ width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color}44)`, boxShadow: `0 0 ${size * 0.5}px ${color}66` }} />
    </div>
  )
}

// ── Main Catalog Page ─────────────────────────────────────────────────────────
export default function CatalogPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [ms, setMs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/api/microsite/view/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.microsite) { setNotFound(true); setLoading(false); return }
        setMs(data.microsite)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  const phone = ms?.leads?.phone?.replace(/\D/g, '') || ''
  const waPhone = phone.startsWith('0') ? `90${phone.slice(1)}` : phone.startsWith('90') ? phone : `90${phone}`
  const waMessage = encodeURIComponent(`Merhaba! Kataloğunuzu inceledim, bilgi almak istiyorum.`)
  const waUrl = phone ? `https://wa.me/${waPhone}?text=${waMessage}` : ''

  const features: any[] = ms?.features || [
    { icon: '🎯', title: 'Kişiselleştirilmiş', desc: 'Sadece sizin ihtiyaçlarınıza göre seçildi' },
    { icon: '⚡', title: 'Hızlı Teslimat', desc: 'Türkiye genelinde hızlı kargo imkânı' },
    { icon: '💎', title: 'Premium Kalite', desc: 'En yüksek kalite standartlarında ürünler' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000814,#050510)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
      <QuantumOrb size={60} />
      <p style={{ color: '#64748b', fontSize: 14, fontFamily: 'system-ui,sans-serif' }}>Katalog yükleniyor...</p>
      <CatalogStyles />
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000814,#050510)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ fontSize: 56 }}>🔒</div>
      <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Sayfa Bulunamadı</h1>
      <p style={{ color: '#475569', fontSize: 14 }}>Bu katalog linki aktif değil veya süresi dolmuş.</p>
      <CatalogStyles />
    </div>
  )

  const lead = ms.leads

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#000814 0%,#020b1f 60%,#000510 100%)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <CatalogStyles />

      {/* ── AMBIENT BG ──────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.025) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', top: '5%', right: '8%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(6,182,212,0.06) 0%,transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 65%)' }} />
      </div>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, background: 'rgba(0,8,20,0.8)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(6,182,212,0.1)', padding: '14px 32px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#0891b2,#7c3aed)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>L</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Sovlo AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 24, padding: '5px 16px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#06b6d4', display: 'inline-block', animation: 'catBlink 2s ease-in-out infinite' }} />
            <span style={{ color: '#67e8f9', fontSize: 12, fontWeight: 600 }}>Kişisel Koleksiyon</span>
          </div>
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 940, margin: '0 auto', padding: '72px 32px 56px' }}>
        {/* Floating small orbs */}
        <div style={{ position: 'absolute', top: 40, right: 30, opacity: 0.6 }}><SmallOrb size={18} color="#06b6d4" delay="0s" /></div>
        <div style={{ position: 'absolute', top: 100, right: 100, opacity: 0.4 }}><SmallOrb size={12} color="#8b5cf6" delay="1.5s" /></div>
        <div style={{ position: 'absolute', top: 60, left: 10, opacity: 0.4 }}><SmallOrb size={14} color="#14b8a6" delay="0.8s" /></div>

        <div style={{ textAlign: 'center' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 20px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.22)', borderRadius: 30, marginBottom: 32 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#06b6d4', display: 'inline-block', animation: 'catBlink 2s ease-in-out infinite' }} />
            <span style={{ color: '#67e8f9', fontSize: 13, fontWeight: 600 }}>{lead?.company_name} için özel hazırlandı</span>
            {ms.badge && <span style={{ background: 'rgba(6,182,212,0.18)', color: '#06b6d4', fontSize: 10, padding: '2px 9px', borderRadius: 12, fontWeight: 700, letterSpacing: 0.5 }}>{ms.badge}</span>}
          </div>

          {/* Quantum Orb — the main 3D element */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <QuantumOrb size={76} />
          </div>

          {/* Headline */}
          <h1 style={{ color: '#fff', fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 900, margin: '0 0 18px', lineHeight: 1.15, letterSpacing: -0.8 }}>
            {ms.headline}
          </h1>
          <p style={{ color: '#64748b', fontSize: 'clamp(14px, 2vw, 18px)', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.65 }}>
            {ms.subheadline}
          </p>

          {/* Primary CTA button */}
          {phone && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '15px 36px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: 16, borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 32px rgba(22,163,74,0.4), 0 2px 8px rgba(0,0,0,0.3)', letterSpacing: 0.3 }}>
                <span style={{ fontSize: 22 }}>💬</span> WhatsApp ile Yazın
              </a>
              <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>{ms.cta_subtext || 'Ücretsiz danışmanlık için bizi arayın'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── INTRO MESSAGE ───────────────────────────────────────────────── */}
      {(ms.custom_message || ms.intro) && (
        <div style={{ position: 'relative', zIndex: 5, maxWidth: 940, margin: '0 auto 52px', padding: '0 32px' }}>
          <div style={{ position: 'relative', borderRadius: 20, overflow: 'visible' }}>
            <div style={{ position: 'absolute', inset: -1.5, borderRadius: 21.5, background: 'linear-gradient(135deg,rgba(6,182,212,0.5),rgba(139,92,246,0.35),rgba(6,182,212,0.5))', backgroundSize: '200% 200%', animation: 'catBorderMove 4s linear infinite' }} />
            <div style={{ position: 'relative', background: 'linear-gradient(135deg,rgba(2,8,22,0.97),rgba(4,7,20,0.99))', borderRadius: 19, padding: '26px 30px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <SmallOrb size={22} color="#06b6d4" delay="0s" />
              <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.75, margin: 0 }}>{ms.custom_message || ms.intro}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT CATALOG ─────────────────────────────────────────────── */}
      {ms.catalog_items && ms.catalog_items.length > 0 && (
        <div style={{ position: 'relative', zIndex: 5, maxWidth: 940, margin: '0 auto 52px', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.3))' }} />
            <span style={{ color: '#67e8f9', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Ürün Kataloğu</span>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,rgba(6,182,212,0.3),transparent)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {ms.catalog_items.map((item: any, i: number) => {
              const clrs = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#14b8a6']
              const c = clrs[i % clrs.length]
              return (
                <div key={i} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: -1.5, borderRadius: 17.5, background: `linear-gradient(135deg,${c}55,${c}20,${c}55)`, backgroundSize: '200% 200%', animation: 'catBorderMove 4s linear infinite', zIndex: 0 }} />
                  <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(2,8,22,0.98),rgba(5,8,20,0.99))', borderRadius: 15, padding: '20px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: `${c}15`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        {item.emoji || '📦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 5px' }}>{item.name}</p>
                        {item.desc && <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 9px', lineHeight: 1.45 }}>{item.desc}</p>}
                        {item.price && (
                          <span style={{ color: c, fontWeight: 700, fontSize: 14, background: `${c}12`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${c}25` }}>{item.price}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── FEATURE CARDS ───────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 940, margin: '0 auto 52px', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {features.map(({ icon, title, desc }: any, i: number) => {
            const clrs = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
            const c = clrs[i % clrs.length]
            return (
              <div key={title} style={{ background: `linear-gradient(135deg,${c}07,rgba(3,7,20,0.95))`, border: `1px solid ${c}20`, borderRadius: 18, padding: '24px 18px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: `radial-gradient(circle,${c}18 0%,transparent 70%)` }} />
                <div style={{ fontSize: 34, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 8px' }}>{title}</h3>
                <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── BIG CTA ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 940, margin: '0 auto 64px', padding: '0 32px' }}>
        <div style={{ position: 'relative', borderRadius: 26, overflow: 'visible' }}>
          <div style={{ position: 'absolute', inset: -2, borderRadius: 28, background: 'linear-gradient(135deg,#06b6d4,#8b5cf6,#14b8a6,#3b82f6,#06b6d4)', backgroundSize: '300% 300%', animation: 'catBorderMove 3s linear infinite' }} />
          <div style={{ position: 'relative', background: 'linear-gradient(135deg,rgba(0,6,18,0.98),rgba(3,5,18,0.99))', borderRadius: 24, padding: '52px 36px', textAlign: 'center' }}>

            {/* Big Orb in CTA */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <QuantumOrb size={56} />
            </div>

            <h2 style={{ color: '#fff', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: -0.3 }}>
              {ms.cta_text || 'Hemen İletişime Geçin'}
            </h2>
            <p style={{ color: '#475569', fontSize: 15, margin: '0 0 36px', lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              {ms.cta_subtext || 'Size özel fiyat teklifi için bizi arayın — ücretsiz danışmanlık'}
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {phone ? (
                <>
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 34px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: 15, borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(22,163,74,0.45)', letterSpacing: 0.3 }}>
                    <span style={{ fontSize: 20 }}>💬</span> WhatsApp ile Yazın
                  </a>
                  <a href={`tel:+${waPhone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 28px', background: 'rgba(6,182,212,0.08)', color: '#67e8f9', fontWeight: 700, fontSize: 15, borderRadius: 14, textDecoration: 'none', border: '1px solid rgba(6,182,212,0.28)', letterSpacing: 0.3 }}>
                    <span style={{ fontSize: 18 }}>📞</span> Ara
                  </a>
                </>
              ) : (
                <p style={{ color: '#475569', fontSize: 14 }}>İletişim için satış temsilcinize ulaşın</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', paddingBottom: 44 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
          <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#0891b2,#7c3aed)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 10 }}>L</span>
          </div>
          <span style={{ color: '#475569', fontSize: 12 }}>Powered by Sovlo AI</span>
        </div>
      </div>
    </div>
  )
}

function CatalogStyles() {
  return (
    <style>{`
      /* Orbital ring animations */
      @keyframes ring1 {
        from { transform: rotateX(75deg) rotateY(0deg) rotateZ(0deg); }
        to   { transform: rotateX(75deg) rotateY(0deg) rotateZ(360deg); }
      }
      @keyframes ring2 {
        from { transform: rotateX(30deg) rotateY(60deg) rotateZ(0deg); }
        to   { transform: rotateX(30deg) rotateY(60deg) rotateZ(360deg); }
      }
      @keyframes ring3 {
        from { transform: rotateX(-50deg) rotateY(20deg) rotateZ(0deg); }
        to   { transform: rotateX(-50deg) rotateY(20deg) rotateZ(360deg); }
      }
      @keyframes coreBreath {
        0%, 100% { transform: scale(1);   box-shadow: 0 0 32px rgba(6,182,212,0.6), 0 0 64px rgba(6,182,212,0.2); }
        50%       { transform: scale(1.06); box-shadow: 0 0 48px rgba(6,182,212,0.8), 0 0 96px rgba(6,182,212,0.3); }
      }
      @keyframes orbGlow {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50%       { opacity: 1.0; transform: scale(1.05); }
      }
      @keyframes catBlink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.35; }
      }
      @keyframes catBorderMove {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .cat-float-orb { animation: catFloatOrb 4s ease-in-out infinite; }
      @keyframes catFloatOrb {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-10px); }
      }
      * { box-sizing: border-box; }
    `}</style>
  )
}
