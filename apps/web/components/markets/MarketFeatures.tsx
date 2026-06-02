import { MarketPage, getMarketUI } from '@/lib/market-pages'

export default function MarketFeatures({ page }: { page: MarketPage }) {
  if (!page.features?.length) return null
  const ui = getMarketUI(page.slug)
  return (
    <section style={{
      padding: '100px 24px',
      background: 'linear-gradient(180deg, #040a1a, #030714)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 70 }}>
          <h2 style={{
            fontSize: 'clamp(30px,4.5vw,52px)',
            fontWeight: 900, color: '#fff',
            margin: '0 0 18px', letterSpacing: '-0.025em',
          }}>
            {ui.features_title}
          </h2>
          <p style={{ color: '#64748b', fontSize: 19, margin: 0, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            {ui.features_sub}
          </p>
        </div>

        {/* Features grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24,
        }}>
          {page.features.map((f, i) => (
            <div key={i} style={{
              background: 'linear-gradient(145deg, rgba(8,16,40,0.9), rgba(5,10,28,0.95))',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 22, padding: '34px 32px',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'default',
            }}>
              <div style={{ fontSize: 44, marginBottom: 22, lineHeight: 1 }}>{f.icon}</div>
              <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
