'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import {
  LayoutDashboard, Users, Megaphone, BarChart3,
  Settings, CreditCard, LogOut, Zap, Activity,
  Bot, Smartphone, Package,
  TrendingUp, Sparkles, Video, FileText,
  Code, Building2, Phone, Globe, Globe2,
  Workflow, ScrollText, Gift, TrendingDown,
  Inbox, Kanban, QrCode, FileBarChart, Brain,
  ChevronDown, Star, DollarSign, Wallet,
  UsersRound, BarChart2, Network, Crosshair, Heart, Target,
  ShieldCheck, LineChart, MessageSquare,
  ChevronRight, Sparkle, Users2, Crown,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: any
  plan?: 'growth' | 'pro' | 'enterprise'
  badge?: string
}

interface NavGroup {
  id: string
  label: string
  icon: any
  items: NavItem[]
  defaultOpen?: boolean
}

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  growth:     { label: 'Growth', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  pro:        { label: 'Pro',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  enterprise: { label: 'Ent',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}

const groups: NavGroup[] = [
  {
    id: 'customers', label: 'nav.customers', icon: Users,
    items: [
      { href: '/leads',          label: 'nav.leads',          icon: Users },
      { href: '/lead-machine',   label: 'nav.lead_machine',   icon: Target },
      { href: '/decision-maker', label: 'nav.decision_maker', icon: Crosshair, plan: 'pro' },
      { href: '/network',        label: 'nav.network',        icon: Network },
      { href: '/health-scores',  label: 'nav.health_scores',  icon: Heart,     plan: 'pro' },
    ],
  },
  {
    id: 'sales', label: 'nav.sales', icon: Kanban,
    items: [
      { href: '/pipeline',   label: 'nav.pipeline',   icon: Kanban },
      { href: '/proposals',  label: 'nav.proposals',  icon: FileText },
      { href: '/products',   label: 'nav.products',   icon: Package,  badge: 'AI' },
      { href: '/microsites', label: 'nav.microsites', icon: Globe },
      { href: '/qr-codes',   label: 'nav.qr_codes',   icon: QrCode },
      { href: '/workflow',   label: 'nav.workflow',    icon: Workflow, plan: 'growth', badge: 'Yeni' },
      { href: '/agent',      label: 'nav.agent',       icon: Bot,      plan: 'pro',    badge: 'AI' },
    ],
  },
  {
    id: 'communication', label: 'nav.communication', icon: MessageSquare,
    items: [
      { href: '/inbox',           label: 'nav.inbox',     icon: Inbox },
      { href: '/campaigns',       label: 'nav.campaigns', icon: Megaphone },
      { href: '/email-campaigns', label: 'nav.email',     icon: Megaphone },
      { href: '/sms-campaigns',   label: 'nav.sms',       icon: Smartphone },
      { href: '/voice-outreach',  label: 'nav.voice',     icon: Phone,    plan: 'pro',    badge: 'AI' },
      { href: '/video-outreach',  label: 'nav.video',     icon: Video,    plan: 'growth', badge: 'AI' },
    ],
  },
  {
    id: 'marketing', label: 'nav.marketing', icon: Target,
    items: [
      { href: '/ads',          label: 'nav.ads',          icon: BarChart2 },
      { href: '/google-ads',   label: 'nav.google_ads',   icon: BarChart2 },
      { href: '/ads-advanced', label: 'nav.ads_advanced', icon: Brain,  plan: 'pro', badge: 'AI' },
      { href: '/meta-intent',  label: 'nav.meta_intent',  icon: Users2, plan: 'pro', badge: 'AI' },
    ],
  },
  {
    id: 'market', label: 'nav.market', icon: TrendingUp,
    items: [
      { href: '/competitor',    label: 'nav.competitor',    icon: Target,      plan: 'growth' },
      { href: '/shadow',        label: 'nav.shadow',        icon: ShieldCheck, plan: 'pro' },
      { href: '/price-tracker', label: 'nav.price_tracker', icon: TrendingDown },
      { href: '/visual-trends', label: 'nav.visual_trends', icon: Sparkles,    plan: 'growth' },
      { href: '/cultural',      label: 'nav.cultural',      icon: Globe,       plan: 'pro' },
    ],
  },
  {
    id: 'growth', label: 'nav.growth', icon: LineChart,
    items: [
      { href: '/analytics',      label: 'nav.analytics',      icon: BarChart3 },
      { href: '/reports',        label: 'nav.reports',        icon: FileBarChart },
      { href: '/revenue',        label: 'nav.revenue',        icon: DollarSign,  plan: 'growth' },
      { href: '/financial',      label: 'nav.financial',      icon: TrendingUp,  plan: 'pro', badge: 'AI' },
      { href: '/loyalty',        label: 'nav.loyalty',        icon: Star },
      { href: '/referral',       label: 'nav.referral',       icon: Gift },
      { href: '/debt-collector', label: 'nav.debt_collector', icon: FileText },
    ],
  },
  {
    id: 'system', label: 'nav.system', icon: Settings,
    items: [
      { href: '/automations',        label: 'nav.automations',  icon: Zap },
      { href: '/wa-numbers',         label: 'nav.wa_numbers',   icon: Smartphone },
      { href: '/developer',          label: 'nav.developer',    icon: Code,      plan: 'pro' },
      { href: '/whitelabel',         label: 'nav.whitelabel',   icon: Building2, plan: 'enterprise' },
      { href: '/monitoring',         label: 'nav.monitoring',   icon: Activity },
      { href: '/billing',            label: 'nav.billing',      icon: CreditCard },
      { href: '/settings/platforms', label: 'nav.platforms',    icon: Globe2 },
      { href: '/market-pages',       label: 'nav.market_pages', icon: Globe2 },
      { href: '/settings',           label: 'nav.settings',     icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { t } = useI18n()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(g => [g.id, g.defaultOpen ?? false]))
  )
  const [ctaDismissed, setCtaDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCtaDismissed(localStorage.getItem('cta_dismissed') === '1')
    }
  }, [])

  const dismissCta = () => {
    setCtaDismissed(true)
    if (typeof window !== 'undefined') localStorage.setItem('cta_dismissed', '1')
  }

  const toggle = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))

  const creditsLeft  = (user?.creditsTotal ?? 0) - (user?.creditsUsed ?? 0)
  const creditsPct   = user?.creditsTotal ? Math.max(0, (creditsLeft / user.creditsTotal) * 100) : 0
  const creditColor  = creditsPct > 40 ? '#3b82f6' : creditsPct > 15 ? '#f59e0b' : '#ef4444'
  const isActiveGroup = (g: NavGroup) => g.items.some(i => pathname === i.href)

  return (
    <aside style={{
      width: 248,
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
      boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
    }}>

      {/* ── LOGO ── */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          flexShrink: 0,
        }}>
          <Zap size={15} color="white" fill="white" />
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <span style={{ color: '#0f172a', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>
            LeadFlow
          </span>
          <span style={{
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800,
            fontSize: 15,
          }}> AI</span>
        </div>
      </div>

      {/* ── KREDİ ÇUBUĞU ── */}
      {user && (
        <div style={{
          margin: '10px 12px 0',
          padding: '10px 12px',
          background: '#f8fafc',
          borderRadius: 10,
          border: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wallet size={10} /> {t('billing.credits_remaining', 'Kalan Kredi')}
            </span>
            <span style={{ color: creditColor, fontSize: 11, fontWeight: 700 }}>
              {creditsLeft.toLocaleString('tr-TR')} / {user.creditsTotal?.toLocaleString('tr-TR')}
            </span>
          </div>
          <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: `${creditsPct}%`,
              background: creditColor,
              borderRadius: 2,
              transition: 'width 0.5s',
              boxShadow: `0 0 6px ${creditColor}50`,
            }} />
          </div>
          {creditsPct < 20 && (
            <Link href="/billing" style={{
              marginTop: 6,
              display: 'flex', alignItems: 'center', gap: 4,
              color: '#f59e0b', fontSize: 11, textDecoration: 'none', fontWeight: 600,
            }}>
              <Zap size={10} /> {t('billing.buy_credits', 'Kredi satın al')}
            </Link>
          )}
        </div>
      )}

      {/* ── NAVİGASYON ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', scrollbarWidth: 'none' }}>

        {/* Ana Sayfa */}
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 9,
          marginBottom: 4, textDecoration: 'none',
          fontSize: 13.5, fontWeight: 600, transition: 'all 0.15s',
          background: pathname === '/dashboard' ? '#eff6ff' : 'transparent',
          color: pathname === '/dashboard' ? '#1d4ed8' : '#64748b',
          border: pathname === '/dashboard' ? '1px solid #bfdbfe' : '1px solid transparent',
        }}>
          <LayoutDashboard size={15} />
          {t('nav.dashboard', 'Ana Sayfa')}
        </Link>

        {/* Özel Araçlar */}
        <div style={{ marginBottom: 6 }}>
          <p style={{
            color: '#cbd5e1', fontSize: 9.5, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '0 10px', marginBottom: 5,
          }}>
            {t('nav.special_tools', 'ÖZEL ARAÇLAR')}
          </p>
          {[
            {
              href: '/tenders',
              label: 'nav.tenders', subKey: 'nav.tenders_sub',
              icon: ScrollText, color: '#d97706',
              bg: '#fffbeb', border: '#fde68a', badge: 'PRO',
            },
            {
              href: '/export',
              label: 'nav.export', subKey: 'nav.export_sub',
              icon: Globe2, color: '#059669',
              bg: '#ecfdf5', border: '#a7f3d0', badge: 'ENT',
            },
            {
              href: '/team',
              label: 'nav.team', subKey: 'nav.team_sub',
              icon: UsersRound, color: '#2563eb',
              bg: '#eff6ff', border: '#bfdbfe', badge: 'PRO',
            },
          ].map(item => {
            const isActive = pathname === item.href || (item.href === '/team' && pathname === '/team-intelligence')
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 10,
                marginBottom: 4, textDecoration: 'none', transition: 'all 0.15s',
                background: isActive ? item.border : item.bg,
                border: `1px solid ${isActive ? item.color + '60' : item.border}`,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: `${item.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={13} color={item.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: item.color, fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                    {t(item.label, item.label)}
                  </p>
                  <p style={{ color: `${item.color}90`, fontSize: 10, margin: '1px 0 0', lineHeight: 1 }}>
                    {t(item.subKey, '')}
                  </p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                  background: `${item.color}15`, color: item.color,
                  border: `1px solid ${item.color}25`, flexShrink: 0,
                }}>
                  {item.badge}
                </span>
              </Link>
            )
          })}
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '2px 0 6px' }} />

        {/* ── GRUPLAR ── */}
        {groups.map(group => {
          const isOpen = openGroups[group.id]
          const hasActive = isActiveGroup(group)
          const GroupIcon = group.icon

          return (
            <div key={group.id} style={{ marginBottom: 1 }}>
              <button
                onClick={() => toggle(group.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  background: hasActive && !isOpen ? 'rgba(37,99,235,0.04)' : 'transparent',
                  color: hasActive ? '#475569' : '#94a3b8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GroupIcon size={11} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t(group.label, group.label)}
                  </span>
                </div>
                <ChevronDown
                  size={10}
                  style={{
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {isOpen && (
                <div style={{
                  marginLeft: 6, marginTop: 1,
                  paddingLeft: 10,
                  borderLeft: '1px solid #f1f5f9',
                  paddingBottom: 3,
                }}>
                  {group.items.map(({ href, label, icon: Icon, plan, badge }) => {
                    const active = pathname === href
                    const locked = plan && (
                      (plan === 'enterprise' && !['enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'pro'        && !['pro','enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'growth'     && !['growth','pro','enterprise'].includes(user?.planType ?? ''))
                    )
                    const pm = plan ? PLAN_META[plan] : null

                    return (
                      <Link
                        key={href}
                        href={href}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '5px 8px', borderRadius: 8, marginBottom: 1,
                          textDecoration: 'none', transition: 'all 0.12s',
                          background: active ? '#eff6ff' : 'transparent',
                          border: active ? '1px solid #bfdbfe' : '1px solid transparent',
                          color: active ? '#1d4ed8' : locked ? '#cbd5e1' : '#64748b',
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = '#f8fafc'
                            ;(e.currentTarget as HTMLElement).style.color = locked ? '#cbd5e1' : '#334155'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = active ? '#1d4ed8' : locked ? '#cbd5e1' : '#64748b'
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <Icon size={13} style={{ flexShrink: 0 }} />
                          <span style={{
                            fontSize: 12.5,
                            fontWeight: active ? 600 : 400,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {t(label, label)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                          {badge && !active && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe',
                            }}>
                              {badge}
                            </span>
                          )}
                          {locked && pm && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: pm.bg, color: pm.color, border: `1px solid ${pm.border}`,
                            }}>
                              {pm.label}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── UPGRADE CTA ── */}
      {(!user?.planType || user.planType === 'starter') && !ctaDismissed && (
        <div style={{ margin: '0 10px 10px', flexShrink: 0, position: 'relative' }}>
          <button
            onClick={dismissCta}
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 1,
              width: 20, height: 20, borderRadius: 6,
              border: 'none', background: '#f1f5f9',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/billing" style={{
            display: 'block',
            background: 'linear-gradient(135deg,#f5f3ff,#eff6ff)',
            border: '1px solid #e0e7ff',
            borderRadius: 12, padding: '12px 14px',
            textDecoration: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, paddingRight: 16 }}>
              <Crown size={13} color="#7c3aed" />
              <span style={{ color: '#1e1b4b', fontSize: 12, fontWeight: 700 }}>
                {t('cta.title', "Pro'ya Geç")}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, margin: '0 0 7px' }}>
              {t('cta.desc', 'AI araçlar, gelişmiş reklam ve rakip izleme özelliklerini aç.')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 11, fontWeight: 600 }}>
              <Sparkle size={10} /> {t('cta.button', 'Planları İncele')} <ChevronRight size={10} />
            </div>
          </Link>
        </div>
      )}

      {/* ── KULLANICI ── */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
        background: '#fafafa',
      }}>
        <div style={{
          width: 30, height: 30,
          background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#0f172a', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={() => { logout(); router.push('/login') }}
          title={t('nav.logout', 'Çıkış Yap')}
          style={{
            padding: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: '#94a3b8',
            borderRadius: 7, transition: 'all 0.15s', flexShrink: 0, fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#ef4444'
            ;(e.currentTarget as HTMLElement).style.background = '#fef2f2'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#94a3b8'
            ;(e.currentTarget as HTMLElement).style.background = 'none'
          }}
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  )
}
