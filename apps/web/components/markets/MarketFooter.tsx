import { MarketPage, MARKET_SLUGS, getMarketUI } from '@/lib/market-pages'

export default function MarketFooter({ page }: { page: MarketPage }) {
  const market = MARKET_SLUGS[page.slug]
  const ui = getMarketUI(page.slug)
  const year = new Date().getFullYear()

  return (
    <footer style={{
      background: 'rgba(255,255,255,0.02)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, color: '#fff',
          }}>L</div>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Sovlo AI</span>
          {market && (
            <span style={{ color: '#334155', fontSize: 13 }}>— {market.flag} {market.name}</span>
          )}
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 28 }}>
          <a href="/privacy" style={{ color: '#334155', fontSize: 13, textDecoration: 'none' }}>{ui.privacy}</a>
          <a href="/terms" style={{ color: '#334155', fontSize: 13, textDecoration: 'none' }}>{ui.terms}</a>
          {page.whatsapp_number && (
            <a href={`https://wa.me/${page.whatsapp_number.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noreferrer"
              style={{ color: '#22c55e', fontSize: 13, textDecoration: 'none' }}>WhatsApp</a>
          )}
        </div>

        <p style={{ color: '#1e293b', fontSize: 13, margin: 0 }}>
          © {year} Sovlo AI. {ui.copyright}
        </p>
      </div>
    </footer>
  )
}
