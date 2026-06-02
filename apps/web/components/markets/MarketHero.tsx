import { MarketPage } from '@/lib/market-pages'

export default function MarketHero({ page }: { page: MarketPage }) {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      background: `
        radial-gradient(ellipse 120% 80% at 50% -20%, rgba(59,130,246,0.22) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 80% 60%, rgba(99,102,241,0.12) 0%, transparent 50%),
        linear-gradient(180deg, #030714 0%, #040a1a 100%)
      `,
      padding: '130px 24px 90px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.025) 1px,transparent 1px)',
        backgroundSize: '52px 52px', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>

          {/* Badge */}
          {page.hero_badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 18px', borderRadius: 100,
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.28)',
              marginBottom: 30,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
              <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.01em' }}>{page.hero_badge}</span>
            </div>
          )}

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(38px, 6.5vw, 76px)',
            fontWeight: 900, lineHeight: 1.06,
            letterSpacing: '-0.035em',
            margin: '0 0 26px',
            background: 'linear-gradient(135deg, #fff 25%, #bfdbfe 55%, #a5b4fc 85%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {page.hero_headline || 'B2B Satışlarınızı Otomatikleştirin'}
          </h1>

          {/* Subheadline */}
          {page.hero_subheadline && (
            <p style={{
              fontSize: 'clamp(17px, 2.2vw, 21px)',
              color: '#94a3b8', lineHeight: 1.72,
              margin: '0 0 44px',
              maxWidth: 660, marginLeft: 'auto', marginRight: 'auto',
            }}>
              {page.hero_subheadline}
            </p>
          )}

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <a href={page.hero_cta_primary_url || '/register'} style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '17px 34px', borderRadius: 15,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: '#fff', fontSize: 17, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 10px 30px rgba(59,130,246,0.45)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}>
              🚀 {page.hero_cta_primary_text || 'Ücretsiz Deneyin'}
            </a>
            {page.hero_cta_secondary_text && (
              <a href={page.hero_cta_secondary_url || '#'} style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '17px 34px', borderRadius: 15,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0', fontSize: 17, fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                ▶ {page.hero_cta_secondary_text}
              </a>
            )}
          </div>

          {/* Media: video > image > default dashboard mockup */}
          {page.hero_video_url ? (
            <div style={{
              borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 50px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              maxWidth: 960, margin: '0 auto',
            }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
                <iframe
                  src={toEmbedUrl(page.hero_video_url)}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          ) : page.hero_image_url ? (
            <div style={{
              borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 50px 100px rgba(0,0,0,0.7)',
              maxWidth: 960, margin: '0 auto',
            }}>
              <img src={page.hero_image_url} alt={page.hero_headline} style={{ width: '100%', display: 'block' }} />
            </div>
          ) : (
            <DashboardMockup />
          )}
        </div>
      </div>
    </section>
  )
}

// Convert YouTube watch URL to embed URL
function toEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'www.youtube.com/embed/')
  if (url.includes('vimeo.com/')) return url.replace('vimeo.com/', 'player.vimeo.com/video/')
  return url
}

function DashboardMockup() {
  const stats = [
    { label: 'Toplam Lead',     value: '2.121', color: '#10b981' },
    { label: 'Aktif Kampanya',  value: '14',    color: '#3b82f6' },
    { label: 'Mesaj Gönderildi',value: '8.450', color: '#8b5cf6' },
    { label: 'Dönüşüm Oranı',  value: '%23',   color: '#f59e0b' },
  ]
  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden',
      border: '1px solid rgba(59,130,246,0.12)',
      boxShadow: '0 50px 100px rgba(0,0,0,0.7), 0 0 60px rgba(59,130,246,0.08)',
      background: 'rgba(5,10,25,0.85)',
      backdropFilter: 'blur(20px)',
      padding: '28px',
      maxWidth: 900, margin: '0 auto',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {['#ff5f57','#ffbd2e','#28c840'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
        ))}
      </div>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '18px 16px', textAlign: 'center',
          }}>
            <p style={{ color: s.color, fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ color: '#334155', fontSize: 12, margin: '5px 0 0', fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>
      {/* Mini chart */}
      <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {[40,65,45,80,55,90,70,95,60,88,75,100].map((h, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 4,
            height: `${h}%`,
            background: `linear-gradient(to top, rgba(59,130,246,0.6), rgba(99,102,241,0.3))`,
            transition: 'height 0.5s',
          }} />
        ))}
      </div>
    </div>
  )
}
