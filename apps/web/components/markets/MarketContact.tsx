import { MarketPage, getMarketUI } from '@/lib/market-pages'

export default function MarketContact({ page }: { page: MarketPage }) {
  const ui = getMarketUI(page.slug)
  return (
    <section style={{
      padding: '100px 24px',
      background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(59,130,246,0.1) 0%, transparent 60%), #030714',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(30px,4.5vw,52px)',
          fontWeight: 900, color: '#fff',
          margin: '0 0 20px', letterSpacing: '-0.025em',
        }}>
          {ui.cta_title}
        </h2>
        <p style={{
          color: '#64748b', fontSize: 19, lineHeight: 1.7,
          margin: '0 0 52px',
          maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {ui.cta_desc}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <a href={page.hero_cta_primary_url || '/register'} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '20px 40px', borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', fontSize: 18, fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 12px 35px rgba(59,130,246,0.5)',
          }}>
            🚀 {page.hero_cta_primary_text || 'Ücretsiz Başla'}
          </a>
          {page.hero_cta_secondary_url && (
            <a href={page.hero_cta_secondary_url} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '20px 40px', borderRadius: 16,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', fontSize: 18, fontWeight: 600,
              textDecoration: 'none',
            }}>
              📅 {page.hero_cta_secondary_text || 'Demo Al'}
            </a>
          )}
        </div>

        {/* Contact links */}
        <div style={{ display: 'flex', gap: 36, justifyContent: 'center', flexWrap: 'wrap' }}>
          {page.whatsapp_number && (
            <a href={`https://wa.me/${page.whatsapp_number.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#22c55e', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#22c55e">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.117 1.527 5.843L.057 23.997l6.304-1.477A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.929 0-3.73-.523-5.27-1.428l-.378-.224-3.92.918.963-3.769-.248-.387A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              {page.whatsapp_number}
            </a>
          )}
          {page.email_contact && (
            <a href={`mailto:${page.email_contact}`}
              style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#60a5fa', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {page.email_contact}
            </a>
          )}
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginTop: 52 }}>
          {ui.trust_badges.map(b => (
            <span key={b} style={{ color: '#334155', fontSize: 14, fontWeight: 600 }}>{b}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
