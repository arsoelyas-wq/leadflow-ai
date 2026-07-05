'use client'
import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useAuth } from '@/lib/auth-context'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Zap, RefreshCw, Download, TrendingUp, Star, BarChart2, History, Gift, CreditCard, ChevronRight } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanInfo {
  id: string; name: string; nameLocal: string
  monthlyCredits: number; rolloverMonths: number
  priceMonthly: number; priceAnnual: number
  color: string; popular: boolean; features: string[]
}

interface TopupPackage {
  id: string; name: string; credits: number; price: number
  badge?: string; popular: boolean; pricePerCredit: number
}

interface CreditBalance {
  monthly: number; used: number; rollover: number; remaining: number
  plan: string; renewsAt?: string; usagePercent: number
  transactions: TxRecord[]
}

interface TxRecord {
  id: string; action: string; amount: number; description: string; created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

const CREDIT_ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  lead_scrape:          { label: 'Lead Scraping',          color: '#06b6d4', icon: '🔍' },
  ai_message:           { label: 'AI Kişiselleştirme',     color: '#8b5cf6', icon: '🤖' },
  email_enrichment:     { label: 'İletişim Bul',           color: '#10b981', icon: '📧' },
  decision_maker:       { label: 'Karar Verici',           color: '#3b82f6', icon: '👤' },
  competitor_analysis:  { label: 'Rakip Analizi',          color: '#f59e0b', icon: '📊' },
  voice_call_per_min:   { label: 'AI Sesli Arama',         color: '#ec4899', icon: '📞' },
  video_generate:       { label: 'AI Video',               color: '#ef4444', icon: '🎬' },
  ai_coach:             { label: 'Satış Koçu',             color: '#6366f1', icon: '🏋️' },
  topup:                { label: 'Kredi Satın Alındı',     color: '#10b981', icon: '💳' },
  subscription:         { label: 'Abonelik',               color: '#10b981', icon: '⭐' },
  monthly_refresh:      { label: 'Aylık Yenileme',         color: '#10b981', icon: '🔄' },
  battlecard:           { label: 'Rakip Kartı',            color: '#f97316', icon: '⚔️' },
  proposal_pdf:         { label: 'Teklif PDF',             color: '#64748b', icon: '📄' },
  qr_generate:          { label: 'QR Kod',                 color: '#64748b', icon: '⬛' },
}

const PLAN_COLORS: Record<string, string> = {
  trial: '#64748b', starter: '#06b6d4', growth: '#8b5cf6',
  scale: '#f59e0b', enterprise: '#ec4899',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return '₺' + (cents / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 })
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

function apiRequest(path: string, opts?: RequestInit) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : ''
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  }).then(async r => {
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'İstek başarısız')
    return d
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CreditRing({ pct, remaining, rollover }: { pct: number; remaining: number; rollover: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444'
  const fill = circ * (1 - pct / 100)

  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#0f172a', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{formatNum(remaining)}</span>
        <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', marginTop: 2 }}>KREDİ</span>
        {rollover > 0 && <span style={{ color, fontSize: 8, fontWeight: 700, marginTop: 1 }}>+{formatNum(rollover)} rollover</span>}
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, string> = { trial: 'Ücretsiz', starter: 'Starter', growth: 'Growth', scale: 'Scale', enterprise: 'Enterprise' }
  const color = PLAN_COLORS[plan] || '#64748b'
  return (
    <span style={{ background: `${color}15`, border: `1px solid ${color}30`, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
      {labels[plan] || plan}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'plans' | 'topup' | 'usage' | 'history' | 'promo'

export default function BillingPage() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('plans')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null)
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [topups, setTopups] = useState<TopupPackage[]>([])
  const [history, setHistory] = useState<TxRecord[]>([])
  const [enterprise, setEnterprise] = useState<any>(null)
  const [comparison, setComparison] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── Load data ───────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const [bal, pln, hist] = await Promise.allSettled([
        apiRequest('/api/credits/balance'),
        apiRequest('/api/payments/plans'),
        apiRequest('/api/payments/history'),
      ])
      if (bal.status === 'fulfilled') setBalance(bal.value)
      if (pln.status === 'fulfilled') {
        setPlans(pln.value.subscriptionPlans || [])
        setTopups(pln.value.topupPackages || [])
        if (pln.value.enterprise)  setEnterprise(pln.value.enterprise)
        if (pln.value.comparison)  setComparison(pln.value.comparison)
      }
      if (hist.status === 'fulfilled') setHistory(hist.value.payments || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadAll()
    const payment = searchParams.get('payment')
    const success  = searchParams.get('success')
    if (payment === 'success' || success === 'true') {
      setMsg({ type: 'ok', text: '✓ Ödeme başarılı! Krediniz hesabınıza eklendi.' })
    } else if (payment === 'cancelled') {
      setMsg({ type: 'err', text: 'Ödeme iptal edildi.' })
    }
  }, [loadAll, searchParams])

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleSubscribe(planId: string) {
    setLoadingBtn(`sub_${planId}`)
    try {
      const data = await apiRequest('/api/payments/subscribe', {
        method: 'POST', body: JSON.stringify({ planId, billing }),
      })
      if (data.url) window.location.href = data.url
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Hata oluştu' })
    }
    setLoadingBtn(null)
  }

  async function handleTopup(packageId: string) {
    setLoadingBtn(`topup_${packageId}`)
    try {
      const data = await apiRequest('/api/payments/topup', {
        method: 'POST', body: JSON.stringify({ packageId }),
      })
      if (data.url) window.location.href = data.url
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Hata oluştu' })
    }
    setLoadingBtn(null)
  }

  async function redeemPromo() {
    if (!promoCode.trim()) return
    setLoadingBtn('promo')
    setPromoResult(null)
    try {
      const data = await apiRequest('/api/admin/promo/redeem', {
        method: 'POST', body: JSON.stringify({ code: promoCode.toUpperCase() }),
      })
      setPromoResult({ type: 'ok', text: data.message || 'Promo kodu uygulandı!' })
      setPromoCode('')
      loadAll()
    } catch (e: any) {
      setPromoResult({ type: 'err', text: e.message || 'Geçersiz kod' })
    }
    setLoadingBtn(null)
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const rem     = balance?.remaining ?? 0
  const monthly = balance?.monthly   ?? 0
  const used    = balance?.used      ?? 0
  const rollover = balance?.rollover ?? 0
  const pct     = monthly > 0 ? Math.max(0, Math.min(100, Math.round(((monthly - used) / monthly) * 100))) : 0
  const pctColor = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444'
  const currentPlan = balance?.plan || (user as any)?.planType || 'trial'

  // ── Render ───────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'plans',   label: 'Planlar',    icon: CreditCard },
    { id: 'topup',   label: 'Kredi Al',   icon: Zap },
    { id: 'usage',   label: 'Kullanım',   icon: BarChart2 },
    { id: 'history', label: 'Geçmiş',     icon: History },
    { id: 'promo',   label: 'Promo',      icon: Gift },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <CreditRing pct={pct} remaining={rem} rollover={rollover} />

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: 0 }}>Abonelik & Kredi</h1>
              <PlanBadge plan={currentPlan} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: isMobile ? 10 : 16, marginBottom: 12 }}>
              {[
                { label: 'Aylık Tahsis', value: monthly.toLocaleString('tr-TR'), color: '#64748b' },
                { label: 'Kalan Kredi', value: rem.toLocaleString('tr-TR'), color: pctColor },
                { label: 'Bu Ay Kullanıldı', value: used.toLocaleString('tr-TR'), color: '#f59e0b' },
              ].map(m => (
                <div key={m.label}>
                  <p style={{ color: m.color, fontSize: 18, fontWeight: 900, margin: 0 }}>{m.value}</p>
                  <p style={{ color: '#94a3b8', fontSize: 10, margin: '2px 0 0', fontWeight: 600 }}>{m.label}</p>
                </div>
              ))}
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
            {pct <= 15 && (
              <p style={{ color: '#dc2626', fontSize: 11, margin: '6px 0 0', fontWeight: 600 }}>
                Krediniz kritik seviyede — hemen topup yapın
              </p>
            )}
            {balance?.renewsAt && (
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '4px 0 0' }}>
                Yenileme: {new Date(balance.renewsAt).toLocaleDateString('tr-TR')}
                {rollover > 0 && ` · ${rollover.toLocaleString()} rollover kredi mevcut`}
              </p>
            )}
          </div>

          <button onClick={loadAll}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} color="#64748b" />
          </button>
        </div>
      </div>

      {/* ── Alert ──────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 16, padding: '12px 18px', background: msg.type === 'ok' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'ok' ? '#a7f3d0' : '#fca5a5'}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: msg.type === 'ok' ? '#059669' : '#dc2626', fontSize: 13, margin: 0, fontWeight: 600 }}>{msg.text}</p>
          <button onClick={() => setMsg(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 14, maxWidth: '100%', overflowX: 'auto', marginBottom: 20, border: '1px solid #e2e8f0' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: active ? '#fff' : 'transparent', color: active ? '#0f172a' : '#64748b', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ══ PLANLAR ════════════════════════════════════════════════════════════ */}
      {tab === 'plans' && (
        <div>
          {/* Annual toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Aylık</span>
            <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#8b5cf6' : '#e2e8f0', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: billing === 'annual' ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 12, color: billing === 'annual' ? '#8b5cf6' : '#64748b', fontWeight: 600 }}>
              Yıllık <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>%20 İndirim</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
            {plans.map(plan => {
              const price = billing === 'annual' ? plan.priceAnnual : plan.priceMonthly
              const isCurrent = currentPlan === plan.id
              const isLoading = loadingBtn === `sub_${plan.id}`

              return (
                <div key={plan.id} style={{ position: 'relative', background: '#fff', border: `2px solid ${isCurrent ? plan.color : `${plan.color}25`}`, borderRadius: 20, padding: 24, transition: 'border-color 0.2s' }}>
                  {plan.popular && !isCurrent && (
                    <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: '0 0 12px 12px', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={9} fill="currentColor" />  ÖNERİLEN
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: '0 0 12px 12px', whiteSpace: 'nowrap' as const }}>
                      AKTİF PLANIN
                    </div>
                  )}

                  <div style={{ marginTop: isCurrent || plan.popular ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ color: '#0f172a', fontSize: 17, fontWeight: 800, margin: '0 0 2px' }}>{plan.nameLocal}</h3>
                        <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>
                          {plan.monthlyCredits === -1 ? 'Sınırsız kredi' : `${plan.monthlyCredits.toLocaleString('tr-TR')} kredi/ay`}
                          {plan.rolloverMonths > 0 && ` · ${plan.rolloverMonths}ay rollover`}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      {price > 0 ? (
                        <>
                          <span style={{ color: plan.color, fontSize: 26, fontWeight: 900 }}>{formatPrice(price)}</span>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>/ay</span>
                          {billing === 'annual' && (
                            <p style={{ color: '#64748b', fontSize: 10, margin: '2px 0 0' }}>Billed annually: {formatPrice(price * 12)}/yr</p>
                          )}
                        </>
                      ) : (
                        <span style={{ color: plan.color, fontSize: 26, fontWeight: 900 }}>Ücretsiz</span>
                      )}
                    </div>

                    <div style={{ marginBottom: 20, minHeight: 140 }}>
                      {plan.features.map(f => (
                        <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                          <CheckCircle size={12} color={plan.color} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ color: '#475569', fontSize: 11, lineHeight: 1.4 }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    {plan.id !== 'trial' && (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isLoading || isCurrent}
                        style={{
                          width: '100%', padding: '11px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
                          background: isCurrent ? '#f1f5f9' : plan.popular ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` : `${plan.color}15`,
                          color: isCurrent ? '#94a3b8' : plan.popular ? '#fff' : plan.color,
                          fontSize: 13, fontWeight: 700, cursor: isLoading || isCurrent ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          boxShadow: plan.popular && !isCurrent ? `0 4px 14px ${plan.color}35` : 'none',
                        }}>
                        {isLoading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronRight size={13} />}
                        {isCurrent ? 'Mevcut Plan' : isLoading ? 'Yönlendiriliyor...' : `${plan.nameLocal} Seç`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Enterprise card */}
            {enterprise && (
              <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '2px solid #334155', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>{enterprise.title || 'Enterprise'}</h3>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 16px' }}>{enterprise.desc || ''}</p>
                  <span style={{ color: enterprise.color || '#ec4899', fontSize: 26, fontWeight: 900 }}>{enterprise.price_label || 'Özel Fiyat'}</span>
                  <div style={{ marginTop: 16 }}>
                    {(enterprise.features || []).map((f: string) => (
                      <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                        <CheckCircle size={12} color={enterprise.color || '#ec4899'} />
                        <span style={{ color: '#cbd5e1', fontSize: 11 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <a href={enterprise.cta_url || 'mailto:enterprise@sovlo.io'}
                  style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 12, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  <ChevronRight size={13} /> {enterprise.cta_text || 'Bizimle İletişime Geçin'}
                </a>
              </div>
            )}
          </div>

          {/* Competitor comparison */}
          {comparison && (
            <div style={{ marginTop: 24, padding: '20px 24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16 }}>
              <p style={{ color: '#64748b', fontSize: 12, fontWeight: 700, margin: '0 0 12px' }}>{comparison.title || 'Neden Sovlo?'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {(comparison.items || []).map((c: any) => (
                  <div key={c.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 12 }}>{c.icon}</span>
                    <div>
                      <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{c.label}</p>
                      <p style={{ color: '#0f172a', fontSize: 12, fontWeight: 700, margin: '2px 0 0' }}>{c.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ KREDİ SATIN AL ═════════════════════════════════════════════════════ */}
      {tab === 'topup' && (
        <div>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 20 }}>
            Abonelik kredinize ek olarak her zaman kredi satın alabilirsiniz. Satın alınan krediler sona ermez.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {topups.map(pkg => {
              const priceStr = formatPrice(pkg.price)
              const perCr   = (pkg.price / pkg.credits / 100).toFixed(2)
              const isLoad  = loadingBtn === `topup_${pkg.id}`

              return (
                <div key={pkg.id} style={{ background: '#fff', border: `2px solid ${pkg.popular ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: 18, padding: 22, position: 'relative' }}>
                  {pkg.badge && (
                    <div style={{ position: 'absolute', top: -1, right: 16, background: pkg.popular ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: '0 0 10px 10px' }}>
                      {pkg.badge}
                    </div>
                  )}
                  <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>{pkg.name}</p>
                  <p style={{ color: '#0f172a', fontSize: 28, fontWeight: 900, margin: '0 0 2px' }}>{pkg.credits.toLocaleString('tr-TR')}</p>
                  <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 16px' }}>kredi · ₺{perCr}/kredi</p>
                  <p style={{ color: pkg.popular ? '#8b5cf6' : '#0f172a', fontSize: 22, fontWeight: 900, margin: '0 0 16px' }}>{priceStr}</p>

                  <div style={{ marginBottom: 16 }}>
                    {[
                      `${Math.floor(pkg.credits / 5).toLocaleString('tr-TR')} lead scrape`,
                      `${pkg.credits.toLocaleString('tr-TR')} AI mesaj`,
                      `${Math.floor(pkg.credits / 15).toLocaleString('tr-TR')} dk sesli arama`,
                    ].map(f => (
                      <div key={f} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
                        <CheckCircle size={11} color={pkg.popular ? '#8b5cf6' : '#10b981'} />
                        <span style={{ color: '#475569', fontSize: 11 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => handleTopup(pkg.id)} disabled={isLoad}
                    style={{ width: '100%', padding: '10px', borderRadius: 11, border: 'none', fontFamily: 'inherit', background: pkg.popular ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#f1f5f9', color: pkg.popular ? '#fff' : '#0f172a', fontSize: 13, fontWeight: 700, cursor: isLoad ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: pkg.popular ? '0 4px 14px rgba(139,92,246,0.35)' : 'none' }}>
                    {isLoad ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
                    {isLoad ? 'Yönlendiriliyor...' : 'Satın Al'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Credit cost table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: 0 }}>Kredi Maliyet Tablosu</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                { action: 'Lead Scraping (Google Maps)', cost: 5, free: false },
                { action: 'AI Mesaj Kişiselleştirme', cost: 1, free: false },
                { action: 'Email/Telefon Bulma', cost: 3, free: false },
                { action: 'Karar Verici Profili', cost: 5, free: false },
                { action: 'Rakip Analizi Raporu', cost: 10, free: false },
                { action: 'AI Sesli Arama (dk)', cost: 15, free: false },
                { action: 'AI Video Üretimi', cost: 80, free: false },
                { action: 'WhatsApp Mesajı', cost: 0, free: true },
                { action: 'Email Gönderimi', cost: 0, free: true },
                { action: 'QR Kod Üretimi', cost: 1, free: false },
              ].map((item, i) => (
                <div key={item.action} style={{ padding: '11px 20px', borderBottom: i < 9 ? '1px solid #f1f5f9' : 'none', borderRight: i % 2 === 0 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569', fontSize: 12 }}>{item.action}</span>
                  <span style={{ color: item.free ? '#10b981' : '#0f172a', fontSize: 12, fontWeight: 700 }}>
                    {item.free ? 'Ücretsiz' : `${item.cost} kr`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ KULLANIM ═══════════════════════════════════════════════════════════ */}
      {tab === 'usage' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
            <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>Bu Ay Kredi Kullanımı</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { key: 'lead_scrape', pct: 45 },
                { key: 'ai_message', pct: 28 },
                { key: 'email_enrichment', pct: 15 },
                { key: 'voice_call_per_min', pct: 8 },
                { key: 'competitor_analysis', pct: 4 },
              ].map(item => {
                const info = CREDIT_ACTION_LABELS[item.key]
                const spent = Math.round(used * item.pct / 100)
                return (
                  <div key={item.key} style={{ padding: '14px 16px', background: `${info?.color ?? '#64748b'}08`, border: `1px solid ${info?.color ?? '#64748b'}18`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 14 }}>{info?.icon}</span>
                        <span style={{ color: '#64748b', fontSize: 11 }}>{info?.label}</span>
                      </div>
                      <span style={{ color: info?.color, fontWeight: 800, fontSize: 13 }}>{spent}</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${item.pct}%`, background: info?.color, borderRadius: 2 }} />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 10, margin: '4px 0 0' }}>Toplam kullanımın %{item.pct}&apos;i</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Son işlemler */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: 0 }}>Son Kredi Hareketleri</h3>
            </div>
            {(balance?.transactions || []).slice(0, 10).length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Henüz hareket yok</div>
            ) : (balance?.transactions || []).slice(0, 10).map((t, i) => {
              const info = CREDIT_ACTION_LABELS[t.action] || { label: t.action, color: '#64748b', icon: '📌' }
              const isPositive = t.amount > 0
              return (
                <div key={t.id || i} style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${info.color}15`, border: `1px solid ${info.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {info.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#0f172a', fontSize: 12, fontWeight: 600, margin: 0 }}>{t.description || info.label}</p>
                    <p style={{ color: '#94a3b8', fontSize: 10, margin: '2px 0 0' }}>{new Date(t.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                  <span style={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: 800, fontSize: 13 }}>
                    {isPositive ? '+' : ''}{t.amount} kr
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ GEÇMİŞ ════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: 0 }}>Ödeme Geçmişi</h3>
            {history.length > 0 && (
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Download size={11} /> CSV İndir
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🧾</div>
              <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Henüz ödeme geçmişi yok</p>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Bir plan seçin veya kredi satın alın</p>
            </div>
          ) : history.map((p: any, i: number) => (
            <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} color="#10b981" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#0f172a', fontWeight: 600, fontSize: 13, margin: 0 }}>{p.description || 'Kredi Paketi'}</p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '2px 0 0' }}>
                  {new Date(p.date || p.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} · {(p.credits || p.amount || 0).toLocaleString('tr-TR')} kredi
                </p>
              </div>
              <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>Tamamlandı</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ PROMO ══════════════════════════════════════════════════════════════ */}
      {tab === 'promo' && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 18, padding: '28px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef9c3', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>🎁</div>
            <h3 style={{ color: '#0f172a', fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>Promo Kodu Kullan</h3>
            <p style={{ color: '#475569', fontSize: 13, margin: '0 0 22px' }}>Kodunuzu girin ve kredinizi anında alın. Tek kullanımlık veya sınırlı kullanım hakkı olabilir.</p>

            {promoResult && (
              <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: promoResult.type === 'ok' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${promoResult.type === 'ok' ? '#a7f3d0' : '#fca5a5'}`, color: promoResult.type === 'ok' ? '#059669' : '#dc2626', fontSize: 13, fontWeight: 600 }}>
                {promoResult.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && redeemPromo()}
                placeholder="LAUNCH50, SOVLO100..."
                maxLength={30}
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 16px', color: '#0f172a', fontSize: 15, outline: 'none', fontFamily: 'inherit', letterSpacing: '0.08em', fontWeight: 700 }}
              />
              <button
                onClick={redeemPromo}
                disabled={loadingBtn === 'promo' || !promoCode.trim()}
                style={{ padding: '13px 20px', borderRadius: 12, border: 'none', background: loadingBtn === 'promo' || !promoCode.trim() ? '#f1f5f9' : 'linear-gradient(135deg,#f59e0b,#f97316)', color: loadingBtn === 'promo' || !promoCode.trim() ? '#94a3b8' : '#fff', cursor: loadingBtn === 'promo' || !promoCode.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                {loadingBtn === 'promo' ? '⏳' : '✓ Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
