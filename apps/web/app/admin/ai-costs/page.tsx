'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const PERIOD_OPTIONS = [7, 14, 30, 90]

// ── Service definitions grouped by category ────────────────────────────────
const SERVICE_GROUPS: {
  label: string; icon: string; services: {
    key: string; name: string; icon: string; color: string;
    desc: string; price: string; payUrl: string; manageUrl: string;
  }[];
}[] = [
  {
    label: 'Yapay Zeka & LLM', icon: '🧠',
    services: [
      { key: 'anthropic',   name: 'Anthropic Claude', icon: '🟣', color: '#8b5cf6', desc: 'Chat, analiz, otomasyon',       price: 'Haiku $0.80 · Sonnet $3 / 1M tok',   payUrl: 'https://console.anthropic.com/settings/billing',      manageUrl: 'https://console.anthropic.com' },
      { key: 'elevenlabs',  name: 'ElevenLabs',       icon: '🎙️', color: '#06b6d4', desc: 'Ses klonlama, TTS, çağrı',      price: '$0.30 / 1K karakter',                 payUrl: 'https://elevenlabs.io/app/subscription',              manageUrl: 'https://elevenlabs.io/app' },
      { key: 'perplexity',  name: 'Perplexity AI',    icon: '🔮', color: '#f97316', desc: 'Web arama, haber, araştırma',   price: '$0.005 / arama',                      payUrl: 'https://www.perplexity.ai/settings/api',              manageUrl: 'https://www.perplexity.ai/settings/api' },
      { key: 'groq',        name: 'Groq',             icon: '⚡', color: '#eab308', desc: 'Hızlı LLM inference',           price: 'Llama-3: $0.05 / 1M tok',            payUrl: 'https://console.groq.com/settings/billing',           manageUrl: 'https://console.groq.com' },
      { key: 'heygen',      name: 'HeyGen',           icon: '🎬', color: '#ec4899', desc: 'AI avatar video üretimi',       price: '$29/ay (Creator)',                    payUrl: 'https://app.heygen.com/subscription',                 manageUrl: 'https://app.heygen.com' },
      { key: 'vapi',        name: 'Vapi',             icon: '📞', color: '#3b82f6', desc: 'Sesli AI ajan, telefon',        price: '$0.05 / dk konuşma',                  payUrl: 'https://dashboard.vapi.ai/billing',                   manageUrl: 'https://dashboard.vapi.ai' },
      { key: 'cartesia',    name: 'Cartesia TTS',     icon: '🔊', color: '#14b8a6', desc: 'Gerçekçi TTS seslendirme',      price: '$65 / 1M karakter',                   payUrl: 'https://play.cartesia.ai/billing',                    manageUrl: 'https://play.cartesia.ai' },
      { key: 'azure_speech',name: 'Azure Speech',     icon: '🌐', color: '#0ea5e9', desc: 'Microsoft konuşma tanıma/TTS',  price: '$1 / 1M karakter',                    payUrl: 'https://portal.azure.com/#blade/Microsoft_Azure_Billing/BudgetsBlade', manageUrl: 'https://portal.azure.com' },
      { key: 'replicate',   name: 'Replicate',        icon: '🤖', color: '#6366f1', desc: 'Açık kaynak AI modelleri',      price: 'Kullanıma göre değişir',              payUrl: 'https://replicate.com/account/billing',               manageUrl: 'https://replicate.com/account' },
      { key: 'runpod',      name: 'RunPod',           icon: '🖥️', color: '#a855f7', desc: 'GPU hesaplama, XTTS sesi',      price: '$0.19 / saat (A40)',                  payUrl: 'https://www.runpod.io/console/billing',               manageUrl: 'https://www.runpod.io/console' },
    ],
  },
  {
    label: 'Scraping & Arama', icon: '🔍',
    services: [
      { key: 'google_places', name: 'Google Places',  icon: '📍', color: '#ef4444', desc: 'Lead scraping, harita verileri', price: '$0.017 / istek',                    payUrl: 'https://console.cloud.google.com/billing',            manageUrl: 'https://console.cloud.google.com/apis/credentials' },
      { key: 'apify',         name: 'Apify',          icon: '🕷️', color: '#34d399', desc: 'Web scraping, otomasyon',        price: '$49/ay (Starter)',                   payUrl: 'https://console.apify.com/billing',                   manageUrl: 'https://console.apify.com' },
      { key: 'brave',         name: 'Brave Search',   icon: '🦁', color: '#f97316', desc: 'Gizlilik odaklı web arama',      price: '$3 / 1K sorgu',                      payUrl: 'https://api.search.brave.com/app/subscriptions',      manageUrl: 'https://api.search.brave.com/app' },
      { key: 'exa',           name: 'Exa AI Search',  icon: '🔎', color: '#8b5cf6', desc: 'AI destekli web arama',          price: '$0.0025 / arama',                    payUrl: 'https://dashboard.exa.ai/billing',                    manageUrl: 'https://dashboard.exa.ai' },
      { key: 'serper',        name: 'Serper',         icon: '🔍', color: '#06b6d4', desc: 'Google SERP API',                price: '$50 / 50K sorgu',                    payUrl: 'https://serper.dev/billing',                          manageUrl: 'https://serper.dev' },
      { key: 'tavily',        name: 'Tavily',         icon: '📰', color: '#10b981', desc: 'AI araştırma ve haber arama',    price: '$0.001 / arama',                     payUrl: 'https://app.tavily.com/home',                         manageUrl: 'https://app.tavily.com' },
      { key: 'foursquare',    name: 'Foursquare',     icon: '📌', color: '#f43f5e', desc: 'Mekan verisi, POI',              price: '$0.005 / API çağrısı',               payUrl: 'https://location.foursquare.com/developer/dashboard',  manageUrl: 'https://location.foursquare.com/developer' },
      { key: 'here',          name: 'Here Maps',      icon: '🗺️', color: '#0ea5e9', desc: 'Harita, geocoding, rota',        price: '250K istek/ay ücretsiz',             payUrl: 'https://platform.here.com/billing',                   manageUrl: 'https://platform.here.com' },
      { key: 'yelp',          name: 'Yelp',           icon: '⭐', color: '#ef4444', desc: 'İşletme değerlendirme verileri', price: 'Fusion API — ücretsiz tier',         payUrl: 'https://www.yelp.com/developers/manage_api_keys',     manageUrl: 'https://www.yelp.com/developers' },
      { key: 'hunter',        name: 'Hunter.io',      icon: '📧', color: '#f59e0b', desc: 'Email bulucu, doğrulama',        price: '$49/ay (Starter 500 arama)',         payUrl: 'https://hunter.io/billing',                           manageUrl: 'https://hunter.io/api-keys' },
    ],
  },
  {
    label: 'Sosyal Medya & Outreach', icon: '📱',
    services: [
      { key: 'linkedin',  name: 'LinkedIn OAuth',    icon: '💼', color: '#0077b5', desc: 'LinkedIn giriş & veri',         price: 'Ücretsiz (kota sınırlı)',             payUrl: 'https://www.linkedin.com/developers/apps',            manageUrl: 'https://www.linkedin.com/developers/apps' },
      { key: 'linkdapi',  name: 'LinkdAPI',          icon: '🔗', color: '#6366f1', desc: 'LinkedIn scraping API',         price: '$99/ay (Pro)',                        payUrl: 'https://linkdapi.com/pricing',                        manageUrl: 'https://linkdapi.com/dashboard' },
      { key: 'meta',      name: 'Meta (FB/IG/WA)',   icon: '📘', color: '#1877f2', desc: 'Facebook, Instagram, WA Graph', price: 'Ücretsiz (CAPI + Pixel)',             payUrl: 'https://developers.facebook.com/apps',                manageUrl: 'https://developers.facebook.com/apps' },
      { key: 'wati',      name: 'WATI WhatsApp',     icon: '💬', color: '#25d366', desc: 'WhatsApp Business API',         price: '$49/ay (Growth)',                     payUrl: 'https://app.wati.io/settings/subscription',           manageUrl: 'https://app.wati.io' },
      { key: 'twilio',    name: 'Twilio',            icon: '📲', color: '#f22f46', desc: 'SMS, sesli arama, doğrulama',   price: '$0.0085 / SMS · $0.014 / dk',        payUrl: 'https://console.twilio.com/us1/billing',              manageUrl: 'https://console.twilio.com' },
    ],
  },
  {
    label: 'Ödeme & Altyapı', icon: '💳',
    services: [
      { key: 'stripe',   name: 'Stripe',            icon: '💳', color: '#6366f1', desc: 'Abonelik, ödeme işlemleri',    price: '%2.9 + $0.30 / işlem',               payUrl: 'https://dashboard.stripe.com/settings/billing',       manageUrl: 'https://dashboard.stripe.com' },
      { key: 'resend',   name: 'Resend Email',       icon: '📧', color: '#10b981', desc: 'İşlemsel email gönderimi',     price: 'Ücretsiz 3K · Pro $20/ay 50K',       payUrl: 'https://resend.com/billing',                          manageUrl: 'https://resend.com/api-keys' },
      { key: 'supabase', name: 'Supabase',           icon: '🗄️', color: '#3ecf8e', desc: 'PostgreSQL veritabanı, auth',  price: 'Pro $25/ay',                          payUrl: 'https://supabase.com/dashboard/project/sivrmewtljftzlwmppub/settings/billing', manageUrl: 'https://supabase.com/dashboard/project/sivrmewtljftzlwmppub' },
      { key: 'redis',    name: 'Redis',             icon: '🔴', color: '#dc2626', desc: 'Cache, session, queue',        price: 'Upstash: $0.2 / 100K komut',         payUrl: 'https://console.upstash.com',                         manageUrl: 'https://console.upstash.com' },
      { key: 'vapid',    name: 'Push Bildirimleri',  icon: '🔔', color: '#f59e0b', desc: 'Web push notifications',       price: 'Ücretsiz (VAPID)',                    payUrl: 'https://vapidkeys.com',                               manageUrl: 'https://vapidkeys.com' },
    ],
  },
  {
    label: 'İş Verisi & Analitik', icon: '📊',
    services: [
      { key: 'google_ads',      name: 'Google Ads',         icon: '📢', color: '#fbbc04', desc: 'Reklam veri entegrasyonu',    price: 'Kampanyaya göre',                     payUrl: 'https://ads.google.com',                              manageUrl: 'https://ads.google.com' },
      { key: 'google_sheets',   name: 'Google Sheets',      icon: '📊', color: '#34a853', desc: 'Veri senkronizasyonu',        price: 'Ücretsiz (kota sınırlı)',             payUrl: 'https://console.cloud.google.com/billing',            manageUrl: 'https://console.cloud.google.com/apis/credentials' },
      { key: 'opencorporates',  name: 'OpenCorporates',     icon: '🏢', color: '#0ea5e9', desc: 'Küresel şirket kayıtları',   price: '$399/ay (Basic)',                     payUrl: 'https://opencorporates.com/info/api',                 manageUrl: 'https://opencorporates.com/users/account' },
      { key: 'uk_companies',    name: 'UK Companies House', icon: '🇬🇧', color: '#1d4ed8', desc: 'İngiltere şirket verisi',    price: 'Ücretsiz',                            payUrl: 'https://developer.company-information.service.gov.uk', manageUrl: 'https://developer.company-information.service.gov.uk' },
      { key: 'pagespeed',       name: 'PageSpeed API',      icon: '⚡', color: '#f97316', desc: 'Web performans analizi',      price: 'Ücretsiz',                            payUrl: 'https://console.cloud.google.com/apis/credentials',   manageUrl: 'https://console.cloud.google.com/apis/credentials' },
    ],
  },
]

const ALL_SERVICE_KEYS = SERVICE_GROUPS.flatMap(g => g.services.map(s => s.key))

const STATUS_BADGE: Record<string, { short: string; color: string; bg: string }> = {
  ok:             { short: '✅ Aktif',   color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  billing_error:  { short: '🚨 Bakiye', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  quota_exceeded: { short: '⚠️ Kota',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  missing:        { short: '❌ Eksik',  color: '#475569', bg: 'rgba(71,85,105,0.12)'   },
  invalid_key:    { short: '🔑 Hatalı', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  error:          { short: '⚠️ Hata',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
}

function fmt$(n: number) {
  if (n >= 1) return '$' + n.toFixed(2)
  if (n >= 0.001) return '$' + n.toFixed(4)
  return '$' + n.toFixed(6)
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: color || '#8b5cf6', fontSize: 26, fontWeight: 900, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ color: '#475569', fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function MiniServiceCard({ svc, status, cost, days, checking }: {
  svc: { key: string; name: string; icon: string; color: string; desc: string; price: string; payUrl: string; manageUrl: string };
  status: any; cost: number; days: number; checking: boolean;
}) {
  const st    = status || { status: checking ? 'checking' : 'missing' }
  const badge = STATUS_BADGE[st.status] || STATUS_BADGE.error
  const hasIssue = ['billing_error', 'quota_exceeded', 'missing', 'invalid_key', 'error'].includes(st.status)

  let payLabel = '💳 Öde'
  if (st.status === 'billing_error') payLabel = '💳 Yükle'
  else if (st.status === 'quota_exceeded') payLabel = '⬆️ Yükselt'
  else if (st.status === 'missing' || st.status === 'invalid_key') payLabel = '🔑 Ekle'

  const borderColor = st.status === 'ok'
    ? `${svc.color}25`
    : st.status === 'missing' ? 'rgba(71,85,105,0.2)'
    : 'rgba(248,113,113,0.25)'

  return (
    <div style={{
      padding: '14px 14px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Top row: icon + name + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{svc.icon}</span>
          <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{svc.name}</span>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
          background: checking ? 'rgba(255,255,255,0.04)' : badge.bg,
          color: checking ? '#334155' : badge.color,
        }}>
          {checking ? '⏳' : badge.short}
        </span>
      </div>

      {/* Desc */}
      <div style={{ color: '#475569', fontSize: 11 }}>{svc.desc}</div>

      {/* ElevenLabs quota bar */}
      {svc.key === 'elevenlabs' && st.chars_limit > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#475569', fontSize: 10 }}>{st.chars_used?.toLocaleString('tr-TR')} / {st.chars_limit?.toLocaleString('tr-TR')}</span>
            <span style={{ color: st.pct_used >= 90 ? '#fb923c' : '#64748b', fontSize: 10, fontWeight: 700 }}>%{st.pct_used}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(st.pct_used, 100)}%`, background: st.pct_used >= 100 ? '#ef4444' : st.pct_used >= 80 ? '#fb923c' : svc.color, borderRadius: 2 }} />
          </div>
          {st.reset_date && <div style={{ color: '#334155', fontSize: 10, marginTop: 3 }}>Yenileme: {st.reset_date}</div>}
        </div>
      )}

      {/* Status error message */}
      {hasIssue && st.message && !checking && (
        <div style={{ color: badge.color, fontSize: 10, opacity: 0.8 }}>{st.message}</div>
      )}

      {/* Bottom: price + cost + buttons */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace', marginBottom: 7 }}>{svc.price}</div>
        {cost > 0 && (
          <div style={{ color: svc.color, fontSize: 11, fontWeight: 700, marginBottom: 7 }}>
            Son {days}g: {fmt$(cost)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 5 }}>
          <a href={svc.payUrl} target="_blank" rel="noreferrer" style={{
            flex: 1, textAlign: 'center', padding: '5px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            textDecoration: 'none',
            background: hasIssue ? badge.color : svc.color,
            color: '#fff',
          }}>
            {hasIssue ? payLabel : '💳 Öde'}
          </a>
          <a href={svc.manageUrl} target="_blank" rel="noreferrer" style={{
            padding: '5px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textDecoration: 'none',
            background: 'rgba(255,255,255,0.05)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            ⚙️
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AdminAICostsPage() {
  const [costs,    setCosts]    = useState<any>(null)
  const [status,   setStatus]   = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [checking, setChecking] = useState(false)
  const [days,     setDays]     = useState(30)

  useEffect(() => {
    setLoading(true)
    adminApi.aiCosts(days).catch(() => null).then(c => { setCosts(c); setLoading(false) })
  }, [days])

  useEffect(() => {
    if (status) return
    setChecking(true)
    adminApi.aiStatus().catch(() => null).then(s => { setStatus(s); setChecking(false) })
  }, [])

  function refreshStatus() {
    setStatus(null); setChecking(true)
    adminApi.aiStatus(true).catch(() => null).then(s => { setStatus(s); setChecking(false) })
  }

  const card: React.CSSProperties = {
    background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 20, marginBottom: 14,
  }

  const hasRealData    = costs?.has_data === true
  const byService: Record<string, any> = costs?.by_service || {}
  const byFeature: Record<string, any> = costs?.by_feature || {}
  const dailyTrend: { day: string; cost_usd: number }[] = costs?.daily_trend || []
  const maxDay         = Math.max(...dailyTrend.map((d: any) => d.cost_usd), 0.001)
  const serviceEntries = Object.entries(byService).sort(([, a]: any, [, b]: any) => b.cost_usd - a.cost_usd)
  const totalSvcCost   = serviceEntries.reduce((s, [, v]: any) => s + v.cost_usd, 0)
  const featureEntries = Object.entries(byFeature).sort(([, a]: any, [, b]: any) => b.cost_usd - a.cost_usd).slice(0, 10)

  const FEATURE_LABELS: Record<string, string> = {
    ai_chat: 'Satış Asistanı', ai_agent_reply: 'AI Otomasyon', lead_analysis: 'Lead Analizi',
    lead_scrape: 'Lead Scraping', competitor: 'Rakip Analizi', voice_call: 'Sesli Arama',
    video_gen: 'Video Üretimi', email_send: 'Email Gönderimi',
  }

  const criticalCount = status
    ? Object.entries(status).filter(([k, s]: any) => k !== 'cached' && ['billing_error', 'invalid_key', 'quota_exceeded'].includes(s?.status)).length
    : 0
  const missingCount = status
    ? Object.entries(status).filter(([k, s]: any) => k !== 'cached' && s?.status === 'missing').length
    : 0
  const activeCount = status
    ? Object.entries(status).filter(([k, s]: any) => k !== 'cached' && s?.status === 'ok').length
    : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            🤖 AI Maliyet & Servis Merkezi
          </h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
            Tüm API servislerinin gerçek durumu · {ALL_SERVICE_KEYS.length} servis
            {criticalCount > 0 && <span style={{ marginLeft: 10, color: '#f87171', fontWeight: 700 }}>⚠️ {criticalCount} kritik sorun</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={refreshStatus} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            🔄 Yenile
          </button>
          {PERIOD_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: days === d ? '#7c3aed' : 'rgba(255,255,255,0.05)', color: days === d ? '#fff' : '#64748b' }}>
              {d}g
            </button>
          ))}
        </div>
      </div>

      {/* Critical alert */}
      {criticalCount > 0 && (
        <div style={{ ...card, padding: '12px 18px', borderColor: 'rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.05)', marginBottom: 14 }}>
          <p style={{ color: '#f87171', fontWeight: 700, fontSize: 13, margin: '0 0 5px' }}>🚨 {criticalCount} serviste kritik sorun</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {status && Object.entries(status)
              .filter(([k, s]: any) => k !== 'cached' && ['billing_error', 'invalid_key', 'quota_exceeded'].includes(s?.status))
              .map(([svcKey, s]: any) => {
                const meta = SERVICE_GROUPS.flatMap(g => g.services).find(x => x.key === svcKey)
                return <span key={svcKey} style={{ color: '#fca5a5', fontSize: 12 }}>{meta?.icon} {meta?.name}: {s.message}</span>
              })}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
        <StatCard icon="💰" label={`Toplam Maliyet (${days}g)`}       value={loading ? '—' : fmt$(costs?.total_cost_usd || 0)}       color="#f59e0b" />
        <StatCard icon="📞" label="Toplam API Çağrısı"                value={loading ? '—' : (costs?.total_calls || 0).toLocaleString()} sub={costs?.failed_calls ? `${costs.failed_calls} hatalı` : undefined} color="#8b5cf6" />
        <StatCard icon="✅" label="Aktif Servis"                      value={checking ? '—' : String(activeCount)}                   color="#10b981" />
        <StatCard icon="❌" label="Eksik Anahtar"                    value={checking ? '—' : String(missingCount)}                   color="#64748b" />
        <StatCard icon="📅" label="Günlük Ort. Maliyet"              value={loading ? '—' : fmt$(costs?.total_cost_usd ? costs.total_cost_usd / days : 0)} color="#06b6d4" />
      </div>

      {/* Service groups */}
      {SERVICE_GROUPS.map(group => (
        <div key={group.label} style={card}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
            {group.icon} {group.label}
            <span style={{ marginLeft: 10, color: '#334155', fontWeight: 500, fontSize: 11 }}>
              {group.services.filter(s => status?.[s.key]?.status === 'ok').length}/{group.services.length} aktif
            </span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {group.services.map(svc => (
              <MiniServiceCard
                key={svc.key}
                svc={svc}
                status={status?.[svc.key] || null}
                cost={byService[svc.key]?.cost_usd || 0}
                days={days}
                checking={checking && !status}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Daily trend + breakdown */}
      {dailyTrend.length > 0 && (
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>📈 Günlük Maliyet Trendi (USD)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
            {dailyTrend.map((d: any) => (
              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: '1 1 0' }}>
                {d.cost_usd > 0 && <span style={{ color: '#475569', fontSize: 9 }}>{fmt$(d.cost_usd)}</span>}
                <div title={`${d.day}: ${fmt$(d.cost_usd)}`} style={{ width: '100%', maxWidth: 24, borderRadius: '2px 2px 0 0', height: `${Math.max(3, (d.cost_usd / maxDay) * 68)}px`, background: 'linear-gradient(180deg,#8b5cf6,#6d28d9)' }} />
                <span style={{ color: '#334155', fontSize: 8, writingMode: 'vertical-rl' }}>{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service + Feature breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>🔧 Servis Bazlı Maliyet</h3>
          {serviceEntries.length === 0
            ? <p style={{ color: '#334155', fontSize: 12 }}>Migration SQL çalıştırıldıktan sonra görünür</p>
            : serviceEntries.map(([svcKey, stats]: any) => {
              const meta = SERVICE_GROUPS.flatMap(g => g.services).find(x => x.key === svcKey) || { name: svcKey, icon: '⚙️', color: '#94a3b8' }
              const pct  = totalSvcCost > 0 ? (stats.cost_usd / totalSvcCost) * 100 : 0
              return (
                <div key={svcKey} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#cbd5e1', fontSize: 12 }}>{meta.icon} {meta.name}</span>
                    <span style={{ color: meta.color, fontSize: 12, fontWeight: 700 }}>{fmt$(stats.cost_usd)}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 2 }} />
                  </div>
                  <div style={{ color: '#334155', fontSize: 10, marginTop: 1 }}>{stats.calls} çağrı · %{pct.toFixed(1)}</div>
                </div>
              )
            })}
        </div>

        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>⚡ Özellik Bazlı Maliyet</h3>
          {featureEntries.length === 0
            ? <p style={{ color: '#334155', fontSize: 12 }}>Deploy sonrası özellik bazlı maliyet burada görünür</p>
            : featureEntries.map(([feat, stats]: any) => {
              const maxFeat = featureEntries[0]?.[1]?.cost_usd || 1
              return (
                <div key={feat} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{FEATURE_LABELS[feat] || feat}</span>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{fmt$(stats.cost_usd)}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(stats.cost_usd / maxFeat) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 2 }} />
                  </div>
                  <div style={{ color: '#334155', fontSize: 10, marginTop: 1 }}>{stats.calls} çağrı</div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Top users */}
      {costs?.top_users?.length > 0 && (
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>👑 En Fazla AI Maliyeti Üreten Kullanıcılar</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['#', 'Kullanıcı', 'Plan', 'Çağrı', 'Maliyet ($)'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.top_users.map((u: any, i: number) => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: 12 }}>#{i + 1}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{u.name || u.email}</div>
                    <div style={{ color: '#475569', fontSize: 11 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#c084fc', fontWeight: 700 }}>{u.plan}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 12 }}>{u.calls.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', color: '#fbbf24', fontSize: 13, fontWeight: 800 }}>{fmt$(u.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Migration notice */}
      {!hasRealData && (
        <div style={{ ...card, borderColor: 'rgba(139,92,246,0.3)' }}>
          <h3 style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>🚀 Maliyet Takibini Aktifleştir</h3>
          <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 5px' }}>
            1. <a href="https://supabase.com/dashboard/project/sivrmewtljftzlwmppub/sql/new" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>Supabase SQL Editor</a> →{' '}
            <code style={{ color: '#a78bfa', fontSize: 11 }}>services/api/migrations/20260704_ai_cost_logs.sql</code> çalıştırın
          </p>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
            2. Deploy sonrası her API çağrısı token + USD maliyetiyle loglanır
          </p>
        </div>
      )}
    </div>
  )
}
