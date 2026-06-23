'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import {
  LayoutDashboard, Users, Megaphone,
  Settings, LogOut, Zap, Wallet, Package,
  FileText, Globe2, Workflow, ScrollText,
  Inbox, Kanban,
  ChevronDown, UsersRound, Crown, Sparkle, ChevronRight,
  Sparkles, Crosshair, UserCheck, Activity, Share2,
  Bot, ListOrdered, Mail,
  MessageCircle, Phone, Video,
  CalendarDays, Image, Search, Rocket, Brain,
  Swords, Eye, Tag, LineChart, Languages, PieChart,
  Banknote, Award, FileSpreadsheet,
  ClipboardList, GraduationCap, Cog, Webhook, Code,
  CreditCard, Shield, Box, X, Command, Mic,
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
  { href: '/dashboard',    label: 'nav.dashboard',    icon: LayoutDashboard },
  { href: '/lead-machine', label: 'nav.lead_machine', icon: Sparkles, badge: 'AI' },
  { href: '/leads',        label: 'nav.leads',        icon: Users },
  { href: '/pipeline',     label: 'nav.pipeline',     icon: Kanban },
  { href: '/automations', label: 'nav.automations', icon: Megaphone, badge: 'AI' },
  { href: '/inbox',     label: 'nav.inbox',     icon: Inbox },
]

const GROUPS: NavGroup[] = [
  {
    id: 'discovery', label: 'nav.group_discovery',
    items: [
      { href: '/lead-hunter',    label: 'nav.lead_hunter',    icon: Crosshair },
      { href: '/decision-maker', label: 'nav.decision_maker', icon: UserCheck },
      { href: '/trade-fair',     label: 'nav.trade_fair',     icon: CalendarDays },
      { href: '/referral',       label: 'nav.referral',       icon: Share2 },
    ],
  },
  {
    id: 'sales', label: 'nav.sales',
    items: [
      { href: '/proposals', label: 'nav.proposals', icon: FileText },
      { href: '/products',  label: 'nav.products',  icon: Package,  badge: 'AI' },
      { href: '/digital-tools', label: 'nav.digital_tools', icon: Box, badge: 'AI' },
      { href: '/agent',     label: 'nav.agent',     icon: Bot },
    ],
  },
  {
    id: 'marketing', label: 'nav.marketing',
    items: [
      { href: '/ads',          label: 'nav.ads',          icon: Image },
      { href: '/google-ads',   label: 'nav.google_ads',   icon: Search },
      { href: '/ads-advanced', label: 'nav.ads_advanced', icon: Rocket,  plan: 'pro', badge: 'AI' },
    ],
  },
  {
    id: 'market-intel', label: 'nav.group_market_intel',
    items: [
      { href: '/shadow',        label: 'nav.shadow',        icon: Eye },
      { href: '/price-tracker', label: 'nav.price_tracker', icon: Tag },
      { href: '/visual-trends', label: 'nav.visual_trends', icon: LineChart },
      { href: '/cultural',      label: 'nav.cultural',      icon: Languages },
    ],
  },
  {
    id: 'analytics', label: 'nav.group_analytics',
    items: [
      { href: '/analytics', label: 'nav.analytics', icon: PieChart, badge: 'AI' },
    ],
  },
  {
    id: 'customer', label: 'nav.group_customer',
    items: [
      { href: '/loyalty',        label: 'nav.loyalty',        icon: Award },
      { href: '/invoices',       label: 'nav.invoices',       icon: FileSpreadsheet },
    ],
  },
  {
    id: 'team', label: 'nav.group_team',
    items: [
      { href: '/team-intelligence',   label: 'nav.team_intelligence',   icon: Brain },
      { href: '/team-reports',        label: 'nav.team_reports',        icon: ClipboardList },
      { href: '/sales-coach',         label: 'nav.sales_coach',         icon: GraduationCap },
    ],
  },
  {
    id: 'automation', label: 'nav.group_automation',
    items: [
      { href: '/automations', label: 'nav.automations', icon: Cog },
      { href: '/webhooks',    label: 'nav.webhooks',    icon: Webhook },
      { href: '/developer',   label: 'nav.developer',   icon: Code },
      { href: '/wa-numbers',  label: 'nav.wa_numbers',  icon: Phone },
    ],
  },
  {
    id: 'system', label: 'nav.system',
    items: [
      { href: '/whitelabel', label: 'nav.whitelabel', icon: Crown,      badge: 'ENT' },
      { href: '/billing',    label: 'nav.billing',    icon: CreditCard },
      { href: '/export',     label: 'nav.export',     icon: Globe2,     badge: 'ENT' },
      { href: '/kvkk',       label: 'nav.kvkk',       icon: Shield },
      { href: '/monitoring', label: 'nav.monitoring', icon: Activity },
    ],
  },
]

const AI_CLONE_ITEMS = [
  { href: '/voice-outreach', label: 'nav.voice', icon: Phone },
  { href: '/video-outreach', label: 'nav.video', icon: Video },
]

const SPECIAL_TOOLS = [
  { href: '/competitor',     label: 'nav.competitor', icon: Swords,     color: '#e11d48', badge: 'AI' },
  { href: '/tenders', label: 'nav.tenders', icon: ScrollText,  color: '#d97706', badge: 'PRO' },
  { href: '/team',    label: 'nav.team',    icon: UsersRound,  color: '#2563eb', badge: 'PRO' },
]

// Komut paleti için düzleştirilmiş arama indeksi — tüm öğeler tek listede
const ALL_NAV_ITEMS: { href: string; label: string; icon: any; groupLabel?: string }[] = [
  ...CORE_ITEMS.map(i => ({ href: i.href, label: i.label, icon: i.icon })),
  ...AI_CLONE_ITEMS.map(i => ({ href: i.href, label: i.label, icon: i.icon, groupLabel: 'AI Klonum' })),
  ...SPECIAL_TOOLS.map(i => ({ href: i.href, label: i.label, icon: i.icon })),
  ...GROUPS.flatMap(g => g.items.map(i => ({ href: i.href, label: i.label, icon: i.icon, groupLabel: g.label }))),
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { t } = useI18n()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [ctaDismissed, setCtaDismissed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCtaDismissed(localStorage.getItem('cta_dismissed') === '1')
    }
  }, [])

  // Ctrl/Cmd+K — komut paletini aç/kapat; Esc — kapat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      } else if (e.key === 'Escape') {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      const id = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [paletteOpen])

  const goTo = (href: string) => {
    setPaletteOpen(false)
    router.push(href)
  }

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

  const searchResults = query.trim()
    ? ALL_NAV_ITEMS.filter(i => t(i.label, i.label).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : []

  return (
    <>
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
            Sovlo
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

      {/* ── ARAMA / KOMUT PALETİ TETİKLEYİCİ ── */}
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
        <button
          onClick={() => setPaletteOpen(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#f8fafc',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            color: '#94a3b8', fontSize: 12,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'
            ;(e.currentTarget as HTMLElement).style.background = '#f1f5f9'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'
            ;(e.currentTarget as HTMLElement).style.background = '#f8fafc'
          }}
        >
          <Search size={13} />
          <span style={{ flex: 1, textAlign: 'left' }}>{t('nav.search_placeholder', 'Özellik ara...')}</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 2,
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
            background: '#fff', border: '1px solid #e2e8f0', color: '#94a3b8',
          }}>
            <Command size={9} />K
          </span>
        </button>
      </div>

      {/* ── NAVİGASYON ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', scrollbarWidth: 'none' }}>

        {/* CORE — her zaman görünür */}
        {CORE_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={itemStyle(active)}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t(label, label)}
              </span>
              {badge && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                  background: '#ecfdf5', color: '#10b981', flexShrink: 0,
                }}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

        <div style={{ height: 1, background: '#f1f5f9', margin: '8px 2px' }} />

        {/* AI KLONUM — collapsible */}
        {(() => {
          const cloneActive = AI_CLONE_ITEMS.some(i => pathname === i.href)
          const cloneColor = '#7c3aed'
          return (
            <>
              <button onClick={() => {
                const el = document.getElementById('ai-clone-sub')
                if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none'
              }} style={{
                ...itemStyle(cloneActive, cloneColor),
                cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
              }}>
                <div style={{ width: 21, height: 21, borderRadius: 6, background: `${cloneColor}16`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mic size={11} color={cloneColor} />
                </div>
                <span style={{ flex: 1 }}>{t('nav.ai_clone', 'AI Klonum')}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${cloneColor}14`, color: cloneColor, flexShrink: 0 }}>AI</span>
              </button>
              <div id="ai-clone-sub" style={{ display: cloneActive ? 'flex' : 'none', flexDirection: 'column', gap: 1, paddingLeft: 12 }}>
                {AI_CLONE_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link key={href} href={href} style={{
                      ...itemStyle(active, cloneColor),
                      padding: '5px 8px', fontSize: 11,
                    }}>
                      <Icon size={12} style={{ color: active ? cloneColor : '#94a3b8', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{t(label, label)}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )
        })()}

        {/* ÖZEL ARAÇLAR — kompakt pill */}
        {SPECIAL_TOOLS.map(({ href, label, icon: Icon, color, badge }) => {
          const active = pathname === href
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
                  justifyContent: 'space-between', gap: 8,
                  padding: '6px 10px 6px 9px', borderRadius: 7, border: 'none',
                  cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'inherit',
                  background: 'transparent',
                  color: hasActive ? '#475569' : '#94a3b8',
                }}
              >
                <span style={{
                  fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, minWidth: 0, textAlign: 'left',
                }}>
                  {t(group.label, group.label)}
                </span>
                <ChevronDown
                  size={11}
                  style={{
                    flexShrink: 0,
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

    {/* ── KOMUT PALETİ (Ctrl/Cmd+K) — 70+ özellik arasında anında arama ── */}
    {paletteOpen && (
      <div
        onClick={() => setPaletteOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: '12vh',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 480, margin: '0 16px',
            background: '#fff', borderRadius: 14,
            boxShadow: '0 20px 60px rgba(15,23,42,0.35)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <Search size={15} color="#94a3b8" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('nav.search_input_placeholder', 'Özellik ara… (örn. video, rakip, fatura)')}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 14,
                color: '#0f172a', fontFamily: 'inherit', background: 'transparent',
              }}
            />
            <button onClick={() => setPaletteOpen(false)} style={{
              border: 'none', background: '#f1f5f9', borderRadius: 6,
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8', flexShrink: 0,
            }}>
              <X size={12} />
            </button>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
            {query.trim() === '' && (
              <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '24px 12px', margin: 0 }}>
                {t('nav.search_hint', 'Özellik ara — modül adı veya işlev yazmanız yeterli')}
              </p>
            )}
            {query.trim() !== '' && searchResults.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '24px 12px', margin: 0 }}>
                {t('nav.search_empty', 'Sonuç bulunamadı — farklı bir kelime deneyin')}
              </p>
            )}
            {searchResults.map(({ href, label, icon: Icon, groupLabel }) => (
              <button
                key={href}
                onClick={() => goTo(href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9, border: 'none',
                  background: pathname === href ? '#f0f6ff' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (pathname !== href) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                onMouseLeave={e => { if (pathname !== href) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={14} color="#2563eb" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t(label, label)}
                  </p>
                  {groupLabel && (
                    <p style={{ margin: 0, fontSize: 10.5, color: '#94a3b8' }}>
                      {t(groupLabel, groupLabel)}
                    </p>
                  )}
                </div>
                <ChevronRight size={13} color="#cbd5e1" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
