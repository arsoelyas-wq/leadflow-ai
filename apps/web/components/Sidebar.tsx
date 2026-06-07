'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import {
  LayoutDashboard, Users, Megaphone, BarChart3,
  Settings, LogOut, Zap, Wallet, Package,
  TrendingUp, FileText, Globe2, Workflow, ScrollText,
  Inbox, Kanban, FileBarChart, Target, Network,
  ChevronDown, UsersRound, Crown, Sparkle, ChevronRight,
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
  items: NavItem[]
}

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  growth:     { label: 'Growth', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  pro:        { label: 'Pro',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  enterprise: { label: 'Ent',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}

const CORE_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/leads',     label: 'nav.leads',     icon: Users },
  { href: '/campaigns', label: 'nav.campaigns', icon: Megaphone },
  { href: '/inbox',     label: 'nav.inbox',     icon: Inbox },
  { href: '/pipeline',  label: 'nav.pipeline',  icon: Kanban },
]

const GROUPS: NavGroup[] = [
  {
    id: 'sales', label: 'nav.sales',
    items: [
      { href: '/network',   label: 'nav.network',   icon: Network },
      { href: '/proposals', label: 'nav.proposals', icon: FileText },
      { href: '/workflow',  label: 'nav.workflow',  icon: Workflow, plan: 'growth', badge: 'Yeni' },
      { href: '/products',  label: 'nav.products',  icon: Package,  badge: 'AI' },
    ],
  },
  {
    id: 'intelligence', label: 'nav.intelligence',
    items: [
      { href: '/lead-machine', label: 'nav.lead_machine', icon: Target,       badge: 'AI' },
      { href: '/analytics',    label: 'nav.analytics',    icon: BarChart3 },
      { href: '/reports',      label: 'nav.reports',      icon: FileBarChart },
      { href: '/financial',    label: 'nav.financial',    icon: TrendingUp,   plan: 'pro', badge: 'AI' },
    ],
  },
]

const SPECIAL_TOOLS = [
  { href: '/tenders', label: 'nav.tenders', icon: ScrollText, color: '#d97706', badge: 'PRO' },
  { href: '/export',  label: 'nav.export',  icon: Globe2,     color: '#059669', badge: 'ENT' },
  { href: '/team',    label: 'nav.team',    icon: UsersRound, color: '#2563eb', badge: 'PRO' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { t } = useI18n()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [ctaDismissed, setCtaDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCtaDismissed(localStorage.getItem('cta_dismissed') === '1')
    }
  }, [])

  // Auto-open the group containing the active route
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev }
      GROUPS.forEach(g => {
        if (g.items.some(i => pathname === i.href)) next[g.id] = true
      })
      return next
    })
  }, [pathname])

  const dismissCta = () => {
    setCtaDismissed(true)
    if (typeof window !== 'undefined') localStorage.setItem('cta_dismissed', '1')
  }

  const toggle = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))

  const creditsLeft  = (user?.creditsTotal ?? 0) - (user?.creditsUsed ?? 0)
  const creditsPct   = user?.creditsTotal ? Math.max(0, (creditsLeft / user.creditsTotal) * 100) : 0
  const creditColor  = creditsPct > 40 ? '#3b82f6' : creditsPct > 15 ? '#f59e0b' : '#ef4444'

  // Apollo-style nav item: 3px left accent border instead of full fill
  const itemStyle = (active: boolean, accent = '#2563eb', dim = false) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 9,
    padding: '7px 10px 7px 9px',
    borderRadius: 7,
    marginBottom: 1,
    textDecoration: 'none' as const,
    transition: 'background 0.12s, color 0.12s',
    borderLeft: active ? `3px solid ${accent}` : '3px solid transparent',
    background: active ? '#f0f6ff' : 'transparent',
    color: active ? accent : dim ? '#cbd5e1' : '#64748b',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
  })

  return (
    <aside style={{
      width: 232,
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
    }}>

      {/* ── LOGO ── */}
      <div style={{
        padding: '16px 16px 14px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30,
          background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(37,99,235,0.28)',
          flexShrink: 0,
        }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <span style={{ color: '#0f172a', fontWeight: 800, fontSize: 14.5, letterSpacing: '-0.3px' }}>
            LeadFlow
          </span>
          <span style={{
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800,
            fontSize: 14.5,
          }}> AI</span>
        </div>
      </div>

      {/* ── KREDİ ÇUBUĞU ── */}
      {user && (
        <div style={{
          margin: '10px 12px 0',
          padding: '9px 11px',
          background: '#f8fafc',
          borderRadius: 9,
          border: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wallet size={10} /> {t('billing.credits_remaining', 'Kalan Kredi')}
            </span>
            <span style={{ color: creditColor, fontSize: 11, fontWeight: 700 }}>
              {creditsLeft.toLocaleString('tr-TR')}
            </span>
          </div>
          <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: `${creditsPct}%`,
              background: creditColor,
              borderRadius: 2,
              transition: 'width 0.5s',
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
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', scrollbarWidth: 'none' }}>

        {/* CORE — her zaman görünür */}
        {CORE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={itemStyle(active)}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t(label, label)}
              </span>
            </Link>
          )
        })}

        <div style={{ height: 1, background: '#f1f5f9', margin: '8px 2px' }} />

        {/* ÖZEL ARAÇLAR — kompakt pill */}
        {SPECIAL_TOOLS.map(({ href, label, icon: Icon, color, badge }) => {
          const active = pathname === href || (href === '/team' && pathname === '/team-intelligence')
          return (
            <Link key={href} href={href} style={itemStyle(active, color)}>
              <div style={{
                width: 21, height: 21, borderRadius: 6,
                background: `${color}16`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={11} color={color} />
              </div>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t(label, label)}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                background: `${color}14`, color, flexShrink: 0,
              }}>
                {badge}
              </span>
            </Link>
          )
        })}

        <div style={{ height: 1, background: '#f1f5f9', margin: '8px 2px' }} />

        {/* ── GRUPLAR ── */}
        {GROUPS.map(group => {
          const isOpen = openGroups[group.id]
          const hasActive = group.items.some(i => pathname === i.href)

          return (
            <div key={group.id} style={{ marginBottom: 2 }}>
              <button
                onClick={() => toggle(group.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px 6px 9px', borderRadius: 7, border: 'none',
                  cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'inherit',
                  background: 'transparent',
                  color: hasActive ? '#475569' : '#94a3b8',
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {t(group.label, group.label)}
                </span>
                <ChevronDown
                  size={11}
                  style={{
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {isOpen && (
                <div style={{ marginTop: 1 }}>
                  {group.items.map(({ href, label, icon: Icon, plan, badge }) => {
                    const active = pathname === href
                    const locked = plan && (
                      (plan === 'enterprise' && !['enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'pro'        && !['pro','enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'growth'     && !['growth','pro','enterprise'].includes(user?.planType ?? ''))
                    )
                    const pm = plan ? PLAN_META[plan] : null

                    return (
                      <Link key={href} href={href} style={itemStyle(active, '#2563eb', !!locked)}>
                        <Icon size={13} style={{ flexShrink: 0 }} />
                        <span style={{
                          flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t(label, label)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {badge && !active && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: '#eff6ff', color: '#3b82f6',
                            }}>
                              {badge}
                            </span>
                          )}
                          {locked && pm && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: pm.bg, color: pm.color,
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
        <div style={{ margin: '0 10px 8px', flexShrink: 0, position: 'relative' }}>
          <button
            onClick={dismissCta}
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 1,
              width: 18, height: 18, borderRadius: 5,
              border: 'none', background: '#f1f5f9',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/billing" style={{
            display: 'block',
            background: 'linear-gradient(135deg,#f5f3ff,#eff6ff)',
            border: '1px solid #e0e7ff',
            borderRadius: 11, padding: '11px 13px',
            textDecoration: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, paddingRight: 16 }}>
              <Crown size={12} color="#7c3aed" />
              <span style={{ color: '#1e1b4b', fontSize: 12, fontWeight: 700 }}>
                {t('cta.title', "Pro'ya Geç")}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, margin: '0 0 6px' }}>
              {t('cta.desc', 'AI araçlar, gelişmiş reklam ve rakip izleme özelliklerini aç.')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 11, fontWeight: 600 }}>
              <Sparkle size={10} /> {t('cta.button', 'Planları İncele')} <ChevronRight size={10} />
            </div>
          </Link>
        </div>
      )}

      {/* ── AYARLAR + KULLANICI ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        <div style={{ padding: '6px 10px 0' }}>
          <Link href="/settings" style={itemStyle(pathname === '/settings')}>
            <Settings size={14} style={{ flexShrink: 0 }} />
            <span>{t('nav.settings', 'Ayarlar')}</span>
          </Link>
        </div>

        <div style={{
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 9,
          background: '#fafafa',
          marginTop: 6,
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
      </div>
    </aside>
  )
}
