import { MarketPage } from '@/lib/market-pages'

const AVATAR_BG = [
  'linear-gradient(135deg,#3b82f6,#6366f1)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
]

export default function MarketTestimonials({ page }: { page: MarketPage }) {
  if (!page.testimonials?.length) return null
  return (
    <section style={{
      padding: '100px 24px',
      background: 'linear-gradient(180deg, #030714, #040a1a)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 70 }}>
          <h2 style={{
            fontSize: 'clamp(30px,4.5vw,52px)',
            fontWeight: 900, color: '#fff',
            margin: '0 0 18px', letterSpacing: '-0.025em',
          }}>
            Müşterilerimiz Ne Diyor?
          </h2>
          <p style={{ color: '#64748b', fontSize: 19, margin: 0 }}>
            Gerçek şirketler, gerçek sonuçlar
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 24,
        }}>
          {page.testimonials.map((t, i) => (
            <div key={i} style={{
              background: 'linear-gradient(145deg, rgba(8,16,40,0.9), rgba(5,10,28,0.95))',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 22, padding: '34px 32px',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}>
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 22 }}>
                {Array.from({ length: t.rating || 5 }).map((_, j) => (
                  <svg key={j} width="18" height="18" viewBox="0 0 18 18" fill="#f59e0b">
                    <path d="M9 1l2.2 6.5H18l-5.6 4 2.2 6.5L9 14 3.4 18l2.2-6.5L0 7.5h6.8z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p style={{
                color: '#cbd5e1', fontSize: 16, lineHeight: 1.75,
                margin: '0 0 28px', fontStyle: 'italic', flex: 1,
              }}>
                "{t.text}"
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: AVATAR_BG[i % AVATAR_BG.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 16,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  flexShrink: 0,
                }}>
                  {t.avatar || t.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{t.name}</p>
                  <p style={{ color: '#64748b', fontSize: 13, margin: '3px 0 0' }}>{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
