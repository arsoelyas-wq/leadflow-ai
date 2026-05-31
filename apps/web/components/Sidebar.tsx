'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
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
  accent?: string
}

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  growth:     { label: 'Growth',     color: '#10b981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)'  },
  pro:        { label: 'Pro',        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)' },
  enterprise: { label: 'Ent',        color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.2)'  },
}

const groups: NavGroup[] = [
  // ── MÜŞTERİLER ──────────────────────────────────────────────────────────────
  {
    id: 'customers',
    label: 'Müşteriler',
    icon: Users,
    defaultOpen: false,
    items: [
      { href: '/leads',           label: 'Müşterilerim',         icon: Users },
      { href: '/lead-machine',    label: 'Yeni Müşteri Bul',     icon: Target },
      { href: '/decision-maker',  label: 'Karar Vericiler',      icon: Crosshair,  plan: 'pro' },   // "Nasıl ulaşılır?" merakı
      { href: '/network',         label: 'Bağlantı Ağım',        icon: Network },
      { href: '/health-scores',   label: 'Müşteri Sinyali',      icon: Heart,      plan: 'pro' },   // Sinyal = kritik bilgi, merak
    ],
  },
  // ── SATIŞ ────────────────────────────────────────────────────────────────────
  {
    id: 'sales',
    label: 'Satış',
    icon: Kanban,
    defaultOpen: false,
    items: [
      { href: '/pipeline',   label: 'Satış Akışım',         icon: Kanban },
      { href: '/proposals',  label: 'Tekliflerim',           icon: FileText },
      { href: '/products',   label: 'Ürün Listem',           icon: Package,   badge: 'AI' },
      { href: '/microsites', label: 'Dijital Vitrinim',      icon: Globe },
      { href: '/qr-codes',   label: 'QR Araçları',           icon: QrCode },
      { href: '/workflow',   label: 'Oto-Pilot',             icon: Workflow,  plan: 'growth', badge: 'Yeni' }, // "Ne otomatik çalışıyor?" merakı
      { href: '/agent',      label: 'Satış Ajanım',          icon: Bot,       plan: 'pro',    badge: 'AI' },   // "Benim ajanım?" sahiplik + merak
    ],
  },
  // ── İLETİŞİM ─────────────────────────────────────────────────────────────────
  {
    id: 'communication',
    label: 'İletişim',
    icon: MessageSquare,
    items: [
      { href: '/inbox',            label: 'Mesaj Merkezim',      icon: Inbox },
      { href: '/campaigns',        label: 'WhatsApp Yayını',     icon: Megaphone },
      { href: '/email-campaigns',  label: 'E-posta Yayını',      icon: Megaphone },
      { href: '/sms-campaigns',    label: 'SMS Yayını',          icon: Smartphone },
      { href: '/voice-outreach',   label: 'Sesli Ajan',          icon: Phone,       plan: 'pro',    badge: 'AI' }, // "Ajan ne yapıyor?" merakı
      { href: '/video-outreach',   label: 'Video Klonum',        icon: Video,       plan: 'growth', badge: 'AI' }, // "Klonum?" çok güçlü merak
    ],
  },
  // ── PAZARLAMA ─────────────────────────────────────────────────────────────────
  {
    id: 'marketing',
    label: 'Pazarlama',
    icon: Target,
    items: [
      { href: '/ads',           label: 'Meta Reklamlarım',      icon: BarChart2 },
      { href: '/google-ads',    label: 'Google Reklamlarım',    icon: BarChart2 },
      { href: '/ads-advanced',  label: 'Reklam Otopilotu',      icon: Brain,    plan: 'pro', badge: 'AI' }, // Otopilot = merak
      { href: '/meta-intent',   label: 'Akıllı Kitle',          icon: Users2,   plan: 'pro', badge: 'AI' }, // "Nasıl akıllı?" merakı
    ],
  },
  // ── PAZAR ANALİZİ ─────────────────────────────────────────────────────────────
  {
    id: 'market',
    label: 'Pazar Analizi',
    icon: TrendingUp,
    items: [
      { href: '/competitor',    label: 'Rakip Radarım',        icon: Target,      plan: 'growth' }, // Radar = istihbarat, merak
      { href: '/shadow',        label: 'Rakip İzleme',         icon: ShieldCheck, plan: 'pro' },    // Sessiz gözetleme hissi
      { href: '/price-tracker', label: 'Fiyat Alarmı',         icon: TrendingDown },                // Alarm = aciliyet + değer
      { href: '/visual-trends', label: 'Trend Alarmı',         icon: Sparkles,    plan: 'growth' }, // "Hangi trend?" merakı
      { href: '/cultural',      label: 'Yerel Uyum',           icon: Globe,       plan: 'pro' },    // Kısa + net + uluslararası his
    ],
  },
  // ── BÜYÜME & FİNANS ───────────────────────────────────────────────────────────
  {
    id: 'growth',
    label: 'Büyüme & Finans',
    icon: LineChart,
    items: [
      { href: '/analytics',     label: 'Analizlerim',          icon: BarChart3 },
      { href: '/reports',       label: 'Raporlarım',           icon: FileBarChart },
      { href: '/revenue',       label: 'Gelir Öngörüsü',       icon: DollarSign,  plan: 'growth' }, // Öngörü = bilge/güçlü
      { href: '/financial',     label: 'Para Akışım',          icon: TrendingUp,  plan: 'pro', badge: 'AI' }, // Paranın gidişi = merak
      { href: '/loyalty',       label: 'Sadakat Puanım',       icon: Star },
      { href: '/referral',      label: 'Tavsiye Ağım',         icon: Gift },
      { href: '/debt-collector',label: 'Alacaklarım',          icon: FileText },  // Sahiplik + net + aciliyet
    ],
  },
  // ── SİSTEM ────────────────────────────────────────────────────────────────────
  {
    id: 'system',
    label: 'Sistem',
    icon: Settings,
    items: [
      { href: '/automations', label: 'Otomasyon Merkezim',   icon: Zap },
      { href: '/wa-numbers',  label: 'WhatsApp Hatlarım',    icon: Smartphone },
      { href: '/developer',   label: 'API Erişimim',         icon: Code,      plan: 'pro' },
      { href: '/whitelabel',  label: 'White-Label',          icon: Building2, plan: 'enterprise' },
      { href: '/monitoring',  label: 'Sistem Monitörüm',     icon: Activity },
      { href: '/billing',     label: 'Aboneliğim',           icon: CreditCard },
      { href: '/settings',    label: 'Ayarlarım',            icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

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

  const S = {
    sidebar: {
      width: 248,
      background: 'linear-gradient(180deg,#07090f 0%,#060a14 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100vh',
      position: 'fixed' as const,
      left: 0,
      top: 0,
      zIndex: 40,
    },
    logo: {
      padding: '18px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    },
    logoIcon: {
      width: 32,
      height: 32,
      background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
      borderRadius: 9,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
      flexShrink: 0,
    },
    logoText: {
      color: '#fff',
      fontWeight: 700,
      fontSize: 15,
      letterSpacing: '-0.3px',
    },
    nav: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '10px 10px',
      scrollbarWidth: 'none' as const,
    },
  }

  return (
    <aside style={S.sidebar}>

      {/* ── LOGO ── */}
      <div style={S.logo}>
        <div style={S.logoIcon}>
          <Zap size={15} color="white" />
        </div>
        <span style={S.logoText}>LeadFlow AI</span>
      </div>

      {/* ── KREDİ ÇUBUĞU ── */}
      {user && (
        <div style={{ margin: '10px 10px 0', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#475569', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={11} /> Kalan Kredi
            </span>
            <span style={{ color: creditColor, fontSize: 11, fontWeight: 700 }}>
              {creditsLeft.toLocaleString('tr-TR')} / {user.creditsTotal?.toLocaleString('tr-TR')}
            </span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${creditsPct}%`, background: creditColor, borderRadius: 2, transition: 'width 0.5s', boxShadow: `0 0 6px ${creditColor}60` }} />
          </div>
          {creditsPct < 20 && (
            <Link href="/billing" style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: 11, textDecoration: 'none' }}>
              <Zap size={10} /> Kredi satın al
            </Link>
          )}
        </div>
      )}

      {/* ── NAVİGASYON ── */}
      <nav style={S.nav}>

        {/* Dashboard */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, marginBottom: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
          background: pathname === '/dashboard' ? 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(37,99,235,0.15))' : 'transparent',
          color: pathname === '/dashboard' ? '#93c5fd' : '#64748b',
          border: pathname === '/dashboard' ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
        }}>
          <LayoutDashboard size={15} />
          Ana Sayfa
        </Link>

        {/* Özel Araçlar */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ color: '#1e293b', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', padding: '0 10px', marginBottom: 6 }}>ÖZEL ARAÇLAR</p>

          {[
            { href: '/tenders', label: 'İhale Radarım',  sub: 'Devlet & özel ihaleler',   icon: ScrollText, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)',  active: 'rgba(245,158,11,0.18)',  badge: 'PRO' },
            { href: '/export',  label: 'İhracat Zekam',  sub: 'Küresel alıcılara ulaş',   icon: Globe2,     color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.15)',  active: 'rgba(16,185,129,0.18)',  badge: 'ENT' },
            { href: '/team',    label: 'Ekip Merkezim',  sub: 'Performans & koçluk',      icon: UsersRound, color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.15)',  active: 'rgba(59,130,246,0.18)',  badge: 'PRO' },
          ].map(item => {
            const isActive = pathname === item.href || (item.href === '/team' && pathname === '/team-intelligence')
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 11, marginBottom: 5, textDecoration: 'none', transition: 'all 0.15s',
                background: isActive ? item.active : item.bg,
                border: `1px solid ${isActive ? item.color + '35' : item.border}`,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: isActive ? `${item.color}22` : `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={item.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: isActive ? '#fff' : item.color, fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{item.label}</p>
                  <p style={{ color: isActive ? `${item.color}90` : `${item.color}60`, fontSize: 10, margin: '2px 0 0', lineHeight: 1 }}>{item.sub}</p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 5, background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}25`, flexShrink: 0 }}>{item.badge}</span>
              </Link>
            )
          })}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 0 8px' }} />

        {/* ── GRUPLAR ── */}
        {groups.map(group => {
          const isOpen = openGroups[group.id]
          const hasActive = isActiveGroup(group)
          const GroupIcon = group.icon

          return (
            <div key={group.id} style={{ marginBottom: 2 }}>
              <button onClick={() => toggle(group.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: hasActive && !isOpen ? 'rgba(59,130,246,0.07)' : 'transparent',
                  color: hasActive ? '#94a3b8' : '#334155',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <GroupIcon size={12} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{group.label}</span>
                </div>
                <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
              </button>

              {isOpen && (
                <div style={{ marginLeft: 6, marginTop: 2, paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
                  {group.items.map(({ href, label, icon: Icon, plan, badge }) => {
                    const active = pathname === href
                    const locked = plan && (
                      (plan === 'enterprise' && !['enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'pro'        && !['pro','enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'growth'     && !['growth','pro','enterprise'].includes(user?.planType ?? ''))
                    )
                    const pm = plan ? PLAN_META[plan] : null

                    return (
                      <Link key={href} href={href}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, marginBottom: 1, textDecoration: 'none', transition: 'all 0.12s',
                          background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                          border: active ? '1px solid rgba(59,130,246,0.22)' : '1px solid transparent',
                          color: active ? '#93c5fd' : locked ? '#1e293b' : '#64748b',
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = locked ? '#1e293b' : '#cbd5e1' }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = active ? '#93c5fd' : locked ? '#1e293b' : '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <Icon size={13} style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                          {badge && !active && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.18)' }}>{badge}</span>
                          )}
                          {locked && pm && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: pm.bg, color: pm.color, border: `1px solid ${pm.border}` }}>{pm.label}</span>
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
          {/* X butonu */}
          <button onClick={dismissCta}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#475569' }}
            title="Kapat">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/billing" style={{ display: 'block', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '12px 14px', textDecoration: 'none', transition: 'border-color 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, paddingRight: 16 }}>
              <Crown size={13} color="#a78bfa" />
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Pro'ya Geç</span>
            </div>
            <p style={{ color: '#475569', fontSize: 11, lineHeight: 1.5, margin: '0 0 8px' }}>AI araçlar, gelişmiş reklam ve rakip izleme özelliklerini aç.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a78bfa', fontSize: 11, fontWeight: 600 }}>
              <Sparkle size={10} /> Planları İncele <ChevronRight size={10} />
            </div>
          </Link>
        </div>
      )}

      {/* ── KULLANICI ── */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
          <p style={{ color: '#334155', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
        </div>
        <button onClick={() => { logout(); router.push('/login') }} title="Çıkış Yap"
          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#334155', borderRadius: 7, transition: 'all 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155'; (e.currentTarget as HTMLElement).style.background = 'none' }}>
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  )
}
