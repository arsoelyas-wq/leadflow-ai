'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme-context'
import {
  LayoutDashboard, Users, Megaphone, BarChart3,
  Settings, CreditCard, LogOut, Zap, Activity,
  Bot, Smartphone, Eye, Package,
  TrendingUp, Sparkles, Video, FileText,
  Code, Building2, Phone, Globe, Globe2,
  Workflow, ScrollText, Gift, TrendingDown,
  Inbox, Kanban, QrCode, FileBarChart, Brain,
  ChevronDown, Star, DollarSign, Wallet,
  Crown, Rocket, UsersRound,
  BarChart2, Network, Crosshair, Heart, Target,
  Map, Mic, ShieldCheck, LineChart, MessageSquare,
  ChevronRight, Sparkle, Users2
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
  growth:     { label: 'Growth', color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)'  },
  pro:        { label: 'Pro',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  enterprise: { label: 'Ent',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)'  },
}

const groups: NavGroup[] = [
  {
    id: 'customers', label: 'nav.customers', icon: Users, defaultOpen: false,
    items: [
      { href: '/leads',          label: 'nav.leads',          icon: Users },
      { href: '/lead-machine',   label: 'nav.lead_machine',   icon: Target },
      { href: '/decision-maker', label: 'nav.decision_maker', icon: Crosshair, plan: 'pro' },
      { href: '/network',        label: 'nav.network',        icon: Network },
      { href: '/health-scores',  label: 'nav.health_scores',  icon: Heart,     plan: 'pro' },
    ],
  },
  {
    id: 'sales', label: 'nav.sales', icon: Kanban, defaultOpen: false,
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
  const { theme } = useTheme()
  const isDark = theme === 'dark'

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

  const creditsLeft = (user?.creditsTotal ?? 0) - (user?.creditsUsed ?? 0)
  const creditsPct  = user?.creditsTotal ? Math.max(0, (creditsLeft / user.creditsTotal) * 100) : 0
  const creditColor = creditsPct > 40 ? '#3b82f6' : creditsPct > 15 ? '#f59e0b' : '#ef4444'
  const isActiveGroup = (g: NavGroup) => g.items.some(i => pathname === i.href)

  // ── THEME COLOR SYSTEM ──────────────────────────────────────────
  const c = {
    sidebarBg:      isDark ? 'linear-gradient(180deg,#07090f 0%,#060a14 100%)' : '#ffffff',
    sidebarBorder:  isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
    logoBorder:     isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9',
    text1:          isDark ? '#f1f5f9' : '#0f172a',
    text2:          isDark ? '#94a3b8' : '#64748b',
    text3:          isDark ? '#475569' : '#94a3b8',
    text4:          isDark ? '#334155' : '#cbd5e1',
    surface:        isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    surfaceBorder:  isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9',
    divider:        isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
    activeNavBg:    isDark ? 'linear-gradient(135deg,rgba(59,130,246,0.22),rgba(37,99,235,0.12))' : '#eff6ff',
    activeNavText:  isDark ? '#93c5fd' : '#1d4ed8',
    activeNavBdr:   isDark ? '1px solid rgba(59,130,246,0.2)' : '1px solid #bfdbfe',
    inactiveText:   isDark ? '#64748b' : '#64748b',
    hoverBg:        isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
    hoverText:      isDark ? '#cbd5e1' : '#334155',
    groupLabel:     isDark ? '#334155' : '#9ca3af',
    sectionLabel:   isDark ? '#1e293b' : '#9ca3af',
    subBorder:      isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
    bottomBorder:   isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9',
    ctaBg:          isDark ? 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))' : 'linear-gradient(135deg,#f5f3ff,#eff6ff)',
    ctaBorder:      isDark ? '1px solid rgba(124,58,237,0.2)' : '1px solid #ddd6fe',
    ctaText:        isDark ? '#475569' : '#64748b',
    creditBar:      isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    upgradeBtn:     isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    upgradeBtnText: isDark ? '#475569' : '#94a3b8',
    logoutHoverBg:  isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
  }

  return (
    <aside style={{
      width: 248,
      background: c.sidebarBg,
      borderRight: c.sidebarBorder,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
      transition: 'background 0.2s, border-color 0.2s',
    }}>

      {/* ── LOGO ── */}
      <div style={{ padding: '16px 16px', borderBottom: c.logoBorder, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.35)', flexShrink: 0 }}>
          <Zap size={15} color="white" fill="white" />
        </div>
        <div>
          <span style={{ color: c.text1, fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>LeadFlow</span>
          <span style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: 15 }}> AI</span>
        </div>
      </div>

      {/* ── KREDİ ÇUBUĞU ── */}
      {user && (
        <div style={{ margin: '10px 10px 0', padding: '10px 12px', background: c.surface, borderRadius: 12, border: c.surfaceBorder, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: c.text3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={11} /> {t('billing.credits_remaining', 'Kalan Kredi')}
            </span>
            <span style={{ color: creditColor, fontSize: 11, fontWeight: 700 }}>
              {creditsLeft.toLocaleString('tr-TR')} / {user.creditsTotal?.toLocaleString('tr-TR')}
            </span>
          </div>
          <div style={{ height: 3, background: c.creditBar, borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${creditsPct}%`, background: creditColor, borderRadius: 2, transition: 'width 0.5s', boxShadow: `0 0 6px ${creditColor}60` }} />
          </div>
          {creditsPct < 20 && (
            <Link href="/billing" style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: 11, textDecoration: 'none' }}>
              <Zap size={10} /> {t('billing.buy_credits', 'Kredi satın al')}
            </Link>
          )}
        </div>
      )}

      {/* ── NAVİGASYON ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', scrollbarWidth: 'none' }}>

        {/* Dashboard ana sayfa */}
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
          borderRadius: 9, marginBottom: 6, textDecoration: 'none', fontSize: 13,
          fontWeight: 600, transition: 'all 0.15s',
          background: pathname === '/dashboard' ? c.activeNavBg : 'transparent',
          color: pathname === '/dashboard' ? c.activeNavText : c.inactiveText,
          border: pathname === '/dashboard' ? c.activeNavBdr : '1px solid transparent',
        }}>
          <LayoutDashboard size={15} />
          {t('nav.dashboard', 'Ana Sayfa')}
        </Link>

        {/* Özel Araçlar */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ color: c.sectionLabel, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 6 }}>
            {t('nav.special_tools', 'ÖZEL ARAÇLAR')}
          </p>
          {[
            { href: '/tenders', label: 'nav.tenders', subKey: 'nav.tenders_sub', icon: ScrollText, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',  border: isDark ? 'rgba(245,158,11,0.15)' : '#fde68a',  active: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7', badge: 'PRO' },
            { href: '/export',  label: 'nav.export',  subKey: 'nav.export_sub',  icon: Globe2,     color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.08)' : '#ecfdf5',   border: isDark ? 'rgba(16,185,129,0.15)' : '#a7f3d0',  active: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5', badge: 'ENT' },
            { href: '/team',    label: 'nav.team',    subKey: 'nav.team_sub',    icon: UsersRound, color: '#60a5fa', bg: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',   border: isDark ? 'rgba(59,130,246,0.15)' : '#bfdbfe',  active: isDark ? 'rgba(59,130,246,0.18)' : '#dbeafe', badge: 'PRO' },
          ].map(item => {
            const isActive = pathname === item.href || (item.href === '/team' && pathname === '/team-intelligence')
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                borderRadius: 11, marginBottom: 5, textDecoration: 'none', transition: 'all 0.15s',
                background: isActive ? item.active : item.bg,
                border: `1px solid ${isActive ? item.color + '50' : item.border}`,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: isActive ? `${item.color}22` : `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={item.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: isActive ? (isDark ? '#fff' : item.color) : item.color, fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{t(item.label, item.label)}</p>
                  <p style={{ color: `${item.color}80`, fontSize: 10, margin: '2px 0 0', lineHeight: 1 }}>{t(item.subKey, '')}</p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 5, background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}25`, flexShrink: 0 }}>{item.badge}</span>
              </Link>
            )
          })}
        </div>

        <div style={{ height: 1, background: c.divider, margin: '4px 0 8px' }} />

        {/* ── GRUPLAR ── */}
        {groups.map(group => {
          const isOpen = openGroups[group.id]
          const hasActive = isActiveGroup(group)
          const GroupIcon = group.icon

          return (
            <div key={group.id} style={{ marginBottom: 2 }}>
              <button
                onClick={() => toggle(group.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                  background: hasActive && !isOpen ? (isDark ? 'rgba(59,130,246,0.07)' : 'rgba(37,99,235,0.04)') : 'transparent',
                  color: hasActive ? c.text2 : c.groupLabel,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <GroupIcon size={12} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {t(group.label, group.label)}
                  </span>
                </div>
                <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
              </button>

              {isOpen && (
                <div style={{ marginLeft: 6, marginTop: 2, paddingLeft: 10, borderLeft: c.subBorder, paddingBottom: 4 }}>
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
                          padding: '6px 8px', borderRadius: 8, marginBottom: 1, textDecoration: 'none',
                          transition: 'all 0.12s',
                          background: active ? (isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff') : 'transparent',
                          border: active ? (isDark ? '1px solid rgba(59,130,246,0.22)' : '1px solid #bfdbfe') : '1px solid transparent',
                          color: active ? c.activeNavText : locked ? c.text4 : c.inactiveText,
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = c.hoverBg
                            ;(e.currentTarget as HTMLElement).style.color = locked ? c.text4 : c.hoverText
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = active ? c.activeNavText : locked ? c.text4 : c.inactiveText
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <Icon size={13} style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t(label, label)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                          {badge && !active && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.18)' }}>
                              {badge}
                            </span>
                          )}
                          {locked && pm && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: pm.bg, color: pm.color, border: `1px solid ${pm.border}` }}>
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
              position: 'absolute', top: 8, right: 8, zIndex: 1, width: 20, height: 20,
              borderRadius: 6, border: 'none', background: c.upgradeBtn,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: c.upgradeBtnText, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/billing" style={{
            display: 'block', background: c.ctaBg, border: c.ctaBorder,
            borderRadius: 14, padding: '12px 14px', textDecoration: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, paddingRight: 16 }}>
              <Crown size={13} color="#a78bfa" />
              <span style={{ color: isDark ? '#fff' : '#1e1b4b', fontSize: 12, fontWeight: 700 }}>
                {t('cta.title', "Pro'ya Geç")}
              </span>
            </div>
            <p style={{ color: c.ctaText, fontSize: 11, lineHeight: 1.5, margin: '0 0 8px' }}>
              {t('cta.desc', 'AI araçlar, gelişmiş reklam ve rakip izleme özelliklerini aç.')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a78bfa', fontSize: 11, fontWeight: 600 }}>
              <Sparkle size={10} /> {t('cta.button', 'Planları İncele')} <ChevronRight size={10} />
            </div>
          </Link>
        </div>
      )}

      {/* ── KULLANICI ── */}
      <div style={{ padding: '10px 12px', borderTop: c.bottomBorder, display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: c.text1, fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </p>
          <p style={{ color: c.text3, fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={() => { logout(); router.push('/login') }}
          title={t('nav.logout', 'Çıkış Yap')}
          style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: c.text3, borderRadius: 7, transition: 'all 0.15s', flexShrink: 0, fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = c.logoutHoverBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text3; (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  )
}
