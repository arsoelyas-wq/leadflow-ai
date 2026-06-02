import Link from 'next/link'

export default function MarketNotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#030714',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <p style={{ fontSize: 80, margin: '0 0 24px', lineHeight: 1 }}>🌍</p>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          Bu Sayfa Yayında Değil
        </h1>
        <p style={{ color: '#64748b', fontSize: 17, margin: '0 0 36px', lineHeight: 1.6 }}>
          Bu ülke için henüz bir pazarlama sayfası yayınlanmamış veya sayfa kaldırılmış.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '14px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 15,
          }}>
            Ücretsiz Deneyin
          </Link>
          <Link href="/" style={{
            padding: '14px 28px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontWeight: 600, textDecoration: 'none', fontSize: 15,
          }}>
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
