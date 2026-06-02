import { MarketPage, getMarketUI } from '@/lib/market-pages'

export default function MarketPricing({ page }: { page: MarketPage }) {
  if (!page.price_monthly) return null
  const ui = getMarketUI(page.slug)

  const savings = page.price_annual && page.price_annual < page.price_monthly
    ? Math.round((1 - page.price_annual / page.price_monthly) * 100)
    : 0

  const sym = page.currency_symbol || '₺'

  return (
    <section style={{
      padding: '100px 24px',
      background: 'linear-gradient(180deg, #040a1a, #030714)',
    }}>
      <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(30px,4.5vw,52px)',
          fontWeight: 900, color: '#fff',
          margin: '0 0 18px', letterSpacing: '-0.025em',
        }}>
          {ui.pricing_title}
        </h2>
        <p style={{ color: '#64748b', fontSize: 19, margin: '0 0 52px' }}>{ui.pricing_sub}</p>

        <div style={{
          background: 'linear-gradient(145deg, rgba(59,130,246,0.07), rgba(99,102,241,0.04))',
          border: '1px solid rgba(59,130,246,0.22)',
          borderRadius: 26,
          padding: '52px 44px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.18),transparent 70%)', pointerEvents: 'none' }} />

          {/* Popular badge */}
          <div style={{
            position: 'absolute', top: 22, right: 22,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            color: '#fff', fontSize: 11, fontWeight: 800,
            padding: '5px 14px', borderRadius: 100,
            letterSpacing: '0.05em',
          }}>EN POPÜLER</div>

          {/* Price */}
          <div style={{ marginBottom: 36, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ color: '#60a5fa', fontSize: 28, fontWeight: 700 }}>{sym}</span>
              <span style={{ color: '#fff', fontSize: 72, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {page.price_monthly.toLocaleString()}
              </span>
              <span style={{ color: '#64748b', fontSize: 20, fontWeight: 500 }}>{ui.per_month}</span>
            </div>
            {savings > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ color: '#34d399', fontSize: 13, fontWeight: 700 }}>
                  {ui.annual_save(sym, page.price_annual, savings)}
                </span>
              </div>
            )}
          </div>

          {/* Feature list */}
          {page.price_features?.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', textAlign: 'left', position: 'relative', zIndex: 1 }}>
              {page.price_features.map((f, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '11px 0',
                  borderBottom: i < page.price_features.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                      <path d="M1 4l3.5 3.5L11 1" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ color: '#e2e8f0', fontSize: 15 }}>{f}</span>
                </li>
              ))}
            </ul>
          )}

          {/* CTA */}
          <a href={page.hero_cta_primary_url || '/register'} style={{
            display: 'block', padding: '18px 36px', borderRadius: 15,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', fontSize: 17, fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(59,130,246,0.45)',
            position: 'relative', zIndex: 1,
          }}>
            🚀 {page.price_cta || page.hero_cta_primary_text || 'Ücretsiz Deneyin'}
          </a>

          <p style={{ color: '#334155', fontSize: 13, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {ui.no_card} • {ui.cancel_anytime}
          </p>
        </div>
      </div>
    </section>
  )
}
