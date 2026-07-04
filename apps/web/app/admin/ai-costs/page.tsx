'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const PERIOD_OPTIONS = [7, 14, 30, 90]

const SERVICE_META: Record<string, {
  label: string; icon: string; color: string; desc: string; price: string;
  payUrl: string; manageUrl: string;
}> = {
  anthropic: {
    label: 'Anthropic Claude', icon: '🧠', color: '#8b5cf6',
    desc: 'Sohbet, analiz, otomasyon, lead değerlendirme',
    price: 'Haiku: $0.80/$4 · Sonnet: $3/$15 · Opus: $15/$75 (1M token)',
    payUrl: 'https://console.anthropic.com/settings/billing',
    manageUrl: 'https://console.anthropic.com',
  },
  elevenlabs: {
    label: 'ElevenLabs', icon: '🎙️', color: '#06b6d4',
    desc: 'Ses klonlama, TTS, sesli arama',
    price: '$0.30 / 1000 karakter (~$0.0003/char)',
    payUrl: 'https://elevenlabs.io/app/subscription',
    manageUrl: 'https://elevenlabs.io/app',
  },
  perplexity: {
    label: 'Perplexity AI', icon: '🔍', color: '#f97316',
    desc: 'Web arama, rakip analizi, güncel haberler',
    price: '$0.005 / arama',
    payUrl: 'https://www.perplexity.ai/settings/api',
    manageUrl: 'https://www.perplexity.ai/settings/api',
  },
  google_places: {
    label: 'Google Places', icon: '📍', color: '#ef4444',
    desc: 'Lead scraping — Google Maps işletme verileri',
    price: '$0.017 / istek',
    payUrl: 'https://console.cloud.google.com/billing',
    manageUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  resend: {
    label: 'Resend Email', icon: '📧', color: '#10b981',
    desc: 'Email kampanyaları ve bildirim gönderimi',
    price: 'Ücretsiz: 3K/ay · Pro: $20/ay (50K email)',
    payUrl: 'https://resend.com/billing',
    manageUrl: 'https://resend.com/api-keys',
  },
  stripe: {
    label: 'Stripe', icon: '💳', color: '#6366f1',
    desc: 'Ödeme altyapısı, abonelik yönetimi',
    price: '%2.9 + $0.30 / işlem',
    payUrl: 'https://dashboard.stripe.com/settings/billing',
    manageUrl: 'https://dashboard.stripe.com',
  },
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  ok:             { label: '✅ Aktif',            bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  billing_error:  { label: '🚨 Bakiye Tükendi',   bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
  quota_exceeded: { label: '⚠️ Kota Doldu',       bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  missing:        { label: '❌ Anahtar Yok',      bg: 'rgba(100,116,139,0.15)', text: '#64748b' },
  invalid_key:    { label: '🔑 Geçersiz Anahtar', bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
  error:          { label: '⚠️ Hata',             bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
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

function ServiceCard({ svc, status, costs, days, checking }: {
  svc: string; status: any; costs: number; days: number; checking: boolean;
}) {
  const meta = SERVICE_META[svc]
  if (!meta) return null
  const st      = status || { status: checking ? 'checking' : 'missing' }
  const badge   = STATUS_BADGE[st.status] || STATUS_BADGE.error
  const hasIssue = ['billing_error', 'quota_exceeded', 'missing', 'invalid_key', 'error'].includes(st.status)

  let borderColor = `${meta.color}30`
  if (st.status === 'billing_error' || st.status === 'invalid_key') borderColor = 'rgba(248,113,113,0.3)'
  else if (st.status === 'quota_exceeded') borderColor = 'rgba(251,146,60,0.3)'
  else if (st.status === 'missing') borderColor = 'rgba(100,116,139,0.2)'

  let payLabel = '💳 Ödeme Yönet'
  if (st.status === 'billing_error') payLabel = '💳 Bakiye Yükle'
  else if (st.status === 'quota_exceeded') payLabel = '⬆️ Paketi Yükselt'
  else if (st.status === 'missing' || st.status === 'invalid_key') payLabel = '🔑 API Key Ekle'

  return (
    <div style={{
      padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{meta.icon}</span>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{meta.label}</div>
            <div style={{ color: '#475569', fontSize: 11, marginTop: 1 }}>{meta.desc}</div>
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          background: checking ? 'rgba(255,255,255,0.05)' : badge.bg,
          color: checking ? '#475569' : badge.text,
        }}>
          {checking ? '⏳ Kontrol...' : badge.label}
        </span>
      </div>

      {st.message && !checking && (
        <div style={{ color: hasIssue ? badge.text : '#64748b', fontSize: 12, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          {st.message}
        </div>
      )}

      {/* ElevenLabs quota bar */}
      {svc === 'elevenlabs' && st.chars_limit > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>Karakter kullanımı</span>
            <span style={{ color: st.pct_used >= 90 ? '#fb923c' : '#94a3b8', fontSize: 11, fontWeight: 700 }}>%{st.pct_used}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.4s',
              width: `${Math.min(st.pct_used, 100)}%`,
              background: st.pct_used >= 100 ? '#ef4444' : st.pct_used >= 80 ? '#fb923c' : meta.color,
            }} />
          </div>
          {st.reset_date && <div style={{ color: '#334155', fontSize: 10, marginTop: 4 }}>Yenileme: {st.reset_date}</div>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: 5 }}>
          {meta.price}
        </span>
        {costs > 0 && (
          <span style={{ color: meta.color, fontSize: 12, fontWeight: 700 }}>Son {days}g: {fmt$(costs)}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <a href={meta.payUrl} target="_blank" rel="noreferrer" style={{
          flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          textDecoration: 'none',
          background: hasIssue ? badge.text : meta.color,
          color: '#fff',
        }}>
          {payLabel}
        </a>
        <a href={meta.manageUrl} target="_blank" rel="noreferrer" style={{
          padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          textDecoration: 'none',
          background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          ⚙️ Yönet
        </a>
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
    setStatus(null)
    setChecking(true)
    adminApi.aiStatus(true).catch(() => null).then(s => { setStatus(s); setChecking(false) })
  }

  const card: React.CSSProperties = {
    background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 22, marginBottom: 16,
  }

  const hasRealData    = costs?.has_data === true
  const dailyTrend: { day: string; cost_usd: number }[] = costs?.daily_trend || []
  const maxDay         = Math.max(...dailyTrend.map((d: any) => d.cost_usd), 0.001)
  const byService: Record<string, any> = costs?.by_service || {}
  const byFeature: Record<string, any> = costs?.by_feature || {}
  const serviceEntries = Object.entries(byService).sort(([, a]: any, [, b]: any) => b.cost_usd - a.cost_usd)
  const totalServiceCost = serviceEntries.reduce((s, [, v]: any) => s + v.cost_usd, 0)
  const featureEntries = Object.entries(byFeature).sort(([, a]: any, [, b]: any) => b.cost_usd - a.cost_usd).slice(0, 10)

  const FEATURE_LABELS: Record<string, string> = {
    ai_chat: 'Satış Asistanı', ai_agent_reply: 'AI Otomasyon Yanıt',
    lead_analysis: 'Lead Analizi', lead_scrape: 'Lead Scraping',
    competitor: 'Rakip Analizi', voice_call: 'Sesli Arama',
    video_gen: 'Video Üretimi', email_send: 'Email Gönderimi',
    decision_maker: 'Karar Verici Bulma', message_generate: 'Mesaj Üretimi',
  }

  const criticalServices = status
    ? Object.entries(status).filter(([k, s]: any) => k !== 'cached' && ['billing_error', 'invalid_key', 'quota_exceeded'].includes(s?.status)).length
    : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            🤖 AI Maliyet & Servis Merkezi
          </h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
            Tüm API servislerin gerçek durumu, kota ve maliyeti
            {criticalServices > 0 && (
              <span style={{ marginLeft: 10, color: '#f87171', fontWeight: 700 }}>
                ⚠️ {criticalServices} serviste sorun var!
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={refreshStatus} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            🔄 Yenile
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIOD_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: days === d ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                color: days === d ? '#fff' : '#64748b',
              }}>
                {d}g
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Critical alert banner */}
      {criticalServices > 0 && (
        <div style={{ ...card, padding: '14px 20px', borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.06)', marginBottom: 16 }}>
          <p style={{ color: '#f87171', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>
            🚨 {criticalServices} API serviste kritik sorun tespit edildi
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {status && Object.entries(status)
              .filter(([k, s]: any) => k !== 'cached' && ['billing_error', 'invalid_key', 'quota_exceeded'].includes(s?.status))
              .map(([svc, s]: any) => (
                <span key={svc} style={{ color: '#fca5a5', fontSize: 12 }}>
                  {SERVICE_META[svc]?.icon} {SERVICE_META[svc]?.label}: {s.message}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard icon="💰" label={`Toplam Maliyet (${days}g)`} value={loading ? '—' : fmt$(costs?.total_cost_usd || 0)} color="#f59e0b" />
        <StatCard icon="📞" label="Toplam API Çağrısı" value={loading ? '—' : (costs?.total_calls || 0).toLocaleString()} sub={costs?.failed_calls ? `${costs.failed_calls} hatalı` : undefined} color="#8b5cf6" />
        <StatCard icon="✅" label="Başarı Oranı" value={loading ? '—' : `%${costs?.success_rate ?? 100}`} color="#10b981" />
        <StatCard icon="📅" label="Günlük Ort. Maliyet" value={loading ? '—' : fmt$(costs?.total_cost_usd ? costs.total_cost_usd / days : 0)} sub="son dönem ortalaması" color="#06b6d4" />
      </div>

      {/* Service status grid */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
            🔌 API Servis Durumları — Gerçek Zamanlı
          </h3>
          <span style={{ color: '#334155', fontSize: 11 }}>
            {checking ? '⏳ Kontrol ediliyor...' : status?.cached ? '🕐 Önbellekten (5dk)' : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {Object.keys(SERVICE_META).map(svc => (
            <ServiceCard
              key={svc} svc={svc}
              status={status?.[svc] || null}
              costs={byService[svc]?.cost_usd || 0}
              days={days}
              checking={checking && !status}
            />
          ))}
        </div>
      </div>

      {/* Daily trend */}
      {dailyTrend.length > 0 && (
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>📈 Günlük Maliyet Trendi (USD)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
            {dailyTrend.map((d: any) => (
              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '1 1 0' }}>
                {d.cost_usd > 0 && <span style={{ color: '#475569', fontSize: 9 }}>{fmt$(d.cost_usd)}</span>}
                <div
                  title={`${d.day}: ${fmt$(d.cost_usd)}`}
                  style={{
                    width: '100%', maxWidth: 28, borderRadius: '3px 3px 0 0',
                    height: `${Math.max(4, (d.cost_usd / maxDay) * 72)}px`,
                    background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)',
                  }}
                />
                <span style={{ color: '#334155', fontSize: 9, writingMode: 'vertical-rl' }}>{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service + Feature breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>🔧 Servis Bazlı Maliyet</h3>
          {serviceEntries.length === 0
            ? <p style={{ color: '#334155', fontSize: 13 }}>Migration SQL çalıştırıldıktan sonra görünür</p>
            : serviceEntries.map(([svc, stats]: any) => {
              const meta = SERVICE_META[svc] || { label: svc, icon: '⚙️', color: '#94a3b8' }
              const pct  = totalServiceCost > 0 ? (stats.cost_usd / totalServiceCost) * 100 : 0
              return (
                <div key={svc} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#cbd5e1', fontSize: 12 }}>{meta.icon} {meta.label}</span>
                    <span style={{ color: meta.color, fontSize: 12, fontWeight: 700 }}>{fmt$(stats.cost_usd)}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ color: '#334155', fontSize: 10, marginTop: 2 }}>
                    {stats.calls} çağrı · %{pct.toFixed(1)}{stats.tokens > 0 && ` · ${stats.tokens.toLocaleString()} token`}
                  </div>
                </div>
              )
            })}
        </div>

        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>⚡ Özellik Bazlı Maliyet</h3>
          {featureEntries.length === 0
            ? <p style={{ color: '#334155', fontSize: 13 }}>Deploy sonrası her özelliğin maliyeti burada görünür</p>
            : featureEntries.map(([feat, stats]: any) => {
              const maxFeat = featureEntries[0]?.[1]?.cost_usd || 1
              return (
                <div key={feat} style={{ marginBottom: 10 }}>
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
      <div style={card}>
        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>
          👑 En Fazla AI Maliyeti Üreten Kullanıcılar
        </h3>
        {!costs?.top_users?.length
          ? <p style={{ color: '#334155', fontSize: 13 }}>Migration + deploy sonrası kullanıcı bazlı maliyet burada görünür</p>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['#', 'Kullanıcı', 'Plan', 'Çağrı', 'Gerçek Maliyet ($)'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costs.top_users.map((u: any, i: number) => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
                    <td style={{ padding: '9px 10px', color: '#334155', fontSize: 12 }}>#{i + 1}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{u.name || u.email}</div>
                      <div style={{ color: '#475569', fontSize: 11 }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#c084fc', fontWeight: 700 }}>{u.plan}</span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#94a3b8', fontSize: 12 }}>{u.calls.toLocaleString()}</td>
                    <td style={{ padding: '9px 10px', color: '#fbbf24', fontSize: 13, fontWeight: 800 }}>{fmt$(u.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Migration notice */}
      {!hasRealData && (
        <div style={{ ...card, borderColor: 'rgba(139,92,246,0.3)' }}>
          <h3 style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>🚀 Maliyet Takibini Aktifleştir</h3>
          <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 6px' }}>
            1.{' '}
            <a href="https://supabase.com/dashboard/project/sivrmewtljftzlwmppub/sql/new" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>
              Supabase SQL Editor
            </a>{' '}
            — <code style={{ color: '#a78bfa', fontSize: 11 }}>services/api/migrations/20260704_ai_cost_logs.sql</code> çalıştırın
          </p>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
            2. Backend deploy edildiğinde her API çağrısı token + USD maliyetiyle loglanmaya başlar
          </p>
        </div>
      )}
    </div>
  )
}
