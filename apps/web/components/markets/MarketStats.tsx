import { MarketPage } from '@/lib/market-pages'

export default function MarketStats({ page }: { page: MarketPage }) {
  if (!page.stats?.length) return null
  return (
    <section style={{
      background: 'rgba(59,130,246,0.04)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '44px 24px',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', justifyContent: 'center',
        gap: 'clamp(24px,6vw,80px)',
        flexWrap: 'wrap',
      }}>
        {page.stats.map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: 'clamp(32px,4.5vw,48px)',
              fontWeight: 900, color: '#fff', margin: 0,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg,#fff,#93c5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{stat.value}</p>
            <p style={{ fontSize: 14, color: '#64748b', margin: '5px 0 0', fontWeight: 600 }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
