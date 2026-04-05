'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard, Users, Megaphone, BarChart3,
  Settings, CreditCard, LogOut, Zap, Activity, Target,
  Bot, FlaskConical, Webhook, Smartphone, Eye,
  TrendingUp, Sparkles, Video, FileText,
  Clock, Heart, Code, Building2, Phone, Globe, Globe2, Box,
  Workflow, MapPin, ScrollText, Gift, TrendingDown,
  GraduationCap, Inbox, Kanban, Radar, UserCog, Mail,
  QrCode, Trophy, FileBarChart, Brain, ChevronDown,
  Crosshair, Star, RefreshCw, DollarSign, Wallet,
  ChevronRight, Crown, Sparkle, Flame, Rocket, UsersRound
} from 'lucide-react'

type PlanGate = 'all' | 'growth' | 'pro' | 'enterprise'

interface NavItem {
  href: string
  label: string
  icon: any
  plan?: PlanGate
  badge?: string
}

interface NavGroup {
  id: string
  label: string
  icon: any
  items: NavItem[]
  defaultOpen?: boolean
}

const groups: NavGroup[] = [
  {
    id: 'leads',
    label: 'Lead Yönetimi',
    icon: Users,
    defaultOpen: true,
    items: [
      { href: '/leads',          label: 'Leadler',          icon: Users },
      { href: '/lead-machine',   label: 'Lead Makinesi',    icon: Target },
      { href: '/lead-hunter',    label: '7/24 Lead Avcısı', icon: Bot,    plan: 'growth', badge: 'AI' },
      { href: '/lead-quality',   label: 'Lead Kalite AI',   icon: Star,   plan: 'growth', badge: 'AI' },
      { href: '/decision-maker', label: 'Karar Verici',     icon: Crosshair, plan: 'pro' },
      { href: '/health-scores',  label: 'Müşteri Sağlığı',  icon: Heart,  plan: 'pro' },
      { href: '/trade-fair',     label: 'Fuar Asistanı',    icon: MapPin, plan: 'pro' },
    ],
  },
  {
    id: 'sales',
    label: 'Satış & Pipeline',
    icon: Kanban,
    defaultOpen: true,
    items: [
      { href: '/pipeline',      label: 'Pipeline & Kanban',  icon: Kanban },
      { href: '/workflow',      label: 'Workflow Engine',    icon: Workflow, plan: 'growth' },
      { href: '/proposals',     label: 'Teklif & Pazarlık',  icon: FileText },
      { href: '/sales-coach',   label: 'AI Satış Koçu',      icon: GraduationCap, plan: 'growth', badge: 'AI' },
      { href: '/smart-timing',  label: 'Akıllı Zamanlama',   icon: Clock,   plan: 'growth' },
      { href: '/crisis-radar',  label: 'Kriz & Fırsat',      icon: Radar,   plan: 'pro' },
      { href: '/emotional-iq',  label: 'Duygusal Zeka',      icon: Brain,   plan: 'pro', badge: 'AI' },
    ],
  },
  {
    id: 'outreach',
    label: 'Kampanya & Mesaj',
    icon: Megaphone,
    items: [
      { href: '/inbox',           label: 'Unified Inbox',    icon: Inbox },
      { href: '/campaigns',       label: 'WA Kampanya',      icon: Megaphone },
      { href: '/email-campaigns', label: 'Email Kampanya',   icon: Mail },
      { href: '/sms-campaigns',   label: 'SMS Kampanya',     icon: Smartphone },
      { href: '/sequences',       label: 'AI Sekanslar',     icon: Bot,    plan: 'growth', badge: 'AI' },
      { href: '/ab-testing',      label: 'A/B Test',         icon: FlaskConical, plan: 'growth' },
      { href: '/retargeting',     label: 'Retargeting',      icon: RefreshCw,    plan: 'pro' },
    ],
  },
  {
    id: 'ads',
    label: 'Reklam Yönetimi',
    icon: Target,
    items: [
      { href: '/ads',          label: 'Meta & Google Ads',  icon: Megaphone },
      { href: '/ads-advanced', label: 'Gelişmiş Reklam AI', icon: Brain,   plan: 'pro', badge: 'AI' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Araçlar',
    icon: Sparkles,
    items: [
      { href: '/video-outreach', label: 'AI Video Satış',   icon: Video,  plan: 'growth', badge: 'AI' },
      { href: '/voice-outreach', label: 'AI Sesli Arama',   icon: Phone,  plan: 'pro',    badge: 'AI' },
      { href: '/vision',         label: 'Vision AI',        icon: Eye,    plan: 'pro',    badge: 'AI' },
      { href: '/ar-experience',  label: 'AR Deneyimi',      icon: Box,    plan: 'enterprise', badge: 'BETA' },
      { href: '/microsites',     label: 'Dijital Katalog',  icon: Globe },
      { href: '/qr-codes',       label: 'QR Kod Üretici',   icon: QrCode },
    ],
  },
  {
    id: 'market',
    label: 'Pazar & Rakip',
    icon: TrendingUp,
    items: [
      { href: '/competitor',     label: 'Rakip Hijack',    icon: Target,   plan: 'growth' },
      { href: '/shadow',         label: 'Gizli Rakip İzle', icon: Eye,    plan: 'pro' },
      { href: '/price-tracker',  label: 'Fiyat Takibi',    icon: TrendingDown },
      { href: '/visual-trends',  label: 'Trend Catcher',   icon: Sparkles, plan: 'growth' },
      { href: '/cultural',       label: 'Kültürel Uyum',   icon: Globe,    plan: 'pro' },
      { href: '/meta-intent',    label: 'Meta Intent',     icon: Target,   plan: 'pro' },
    ],
  },
  {
    id: 'growth',
    label: 'Büyüme & Gelir',
    icon: DollarSign,
    items: [
      { href: '/analytics',  label: 'Analitik',         icon: BarChart3 },
      { href: '/reports',    label: 'Raporlar',         icon: FileBarChart },
      { href: '/revenue',    label: 'Gelir Tahmini',    icon: DollarSign, plan: 'growth' },
      { href: '/financial',  label: 'Büyüme Zekası',    icon: TrendingUp, plan: 'pro', badge: 'AI' },
      { href: '/loyalty',    label: 'Sadakat Puanı',    icon: Trophy },
      { href: '/referral',   label: 'Referral Loop',    icon: Gift },
      { href: '/debt-collector', label: 'Tahsilat',     icon: TrendingDown },
    ],
  },
  {
    id: 'system',
    label: 'Sistem & Ayarlar',
    icon: Settings,
    items: [
      { href: '/automations', label: 'Otomasyonlar',   icon: Zap },
      { href: '/wa-numbers',  label: 'WA Numaralar',   icon: Smartphone },
      { href: '/webhooks',    label: 'Webhooks',       icon: Webhook },
      { href: '/developer',   label: 'API Erişimi',    icon: Code,       plan: 'pro' },
      { href: '/whitelabel',  label: 'White-Label',    icon: Building2,  plan: 'enterprise' },
      { href: '/monitoring',  label: 'Monitör',        icon: Activity },
      { href: '/billing',     label: 'Abonelik',       icon: CreditCard },
      { href: '/settings',    label: 'Ayarlar',        icon: Settings },
    ],
  },
]

const planColors: Record<string, string> = {
  growth:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  pro:        'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  enterprise: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
}

const planLabels: Record<string, string> = {
  growth: 'Growth', pro: 'Pro', enterprise: 'Enterprise',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(g => [g.id, g.defaultOpen ?? false]))
  )

  const toggle = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))

  const creditsLeft = (user?.creditsTotal ?? 0) - (user?.creditsUsed ?? 0)
  const creditsPct  = user?.creditsTotal
    ? Math.max(0, (creditsLeft / user.creditsTotal) * 100)
    : 0
  const creditColor = creditsPct > 40 ? 'bg-blue-500' : creditsPct > 15 ? 'bg-amber-500' : 'bg-red-500'

  const isActiveGroup = (g: NavGroup) => g.items.some(i => pathname === i.href)

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-40">

      {/* ── Logo ── */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Zap size={15} className="text-white" />
        </div>
        <span className="text-white font-bold text-base tracking-tight">LeadFlow AI</span>
      </div>

      {/* ── Kredi Bar ── */}
      {user && (
        <div className="mx-4 mt-3 mb-1 bg-slate-800/60 rounded-xl p-3 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Wallet size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">Kalan Kredi</span>
            </div>
            <span className={`text-xs font-semibold ${creditsPct > 40 ? 'text-blue-400' : creditsPct > 15 ? 'text-amber-400' : 'text-red-400'}`}>
              {creditsLeft} / {user.creditsTotal}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className={`${creditColor} h-1.5 rounded-full transition-all duration-500`}
              style={{ width: `${creditsPct}%` }} />
          </div>
          {creditsPct < 20 && (
            <Link href="/billing"
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition">
              <Zap size={10} /> Kredi satın al
            </Link>
          )}
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide">

        {/* Dashboard — tek item, grup dışı */}
        <Link href="/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition mb-1 ${
            pathname === '/dashboard'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}>
          <LayoutDashboard size={16} />
          Dashboard
        </Link>

        {/* ── Öne Çıkan Özellikler ── */}
        <div className="mb-3 mt-1 space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Güçlü Araçlar</p>

          {/* İhale Avcısı */}
          <Link href="/tenders"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition group relative overflow-hidden ${
              pathname === '/tenders'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-amber-500/5 border-amber-500/15 text-amber-400/80 hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-300'
            }`}>
            <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <ScrollText size={14} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">İhale Avcısı</p>
              <p className="text-[10px] text-amber-500/60 leading-tight mt-0.5">Devlet ihalelerini yakala</p>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/25 flex-shrink-0">PRO</span>
          </Link>

          {/* İhracat Zekası */}
          <Link href="/export"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition group relative overflow-hidden ${
              pathname === '/export'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400/80 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300'
            }`}>
            <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe2 size={14} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">İhracat Zekası</p>
              <p className="text-[10px] text-emerald-500/60 leading-tight mt-0.5">Global pazarlara aç</p>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 flex-shrink-0">ENT</span>
          </Link>

          {/* Ekip Yönetimi */}
          <Link href="/team"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition group relative overflow-hidden ${
              pathname === '/team'
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-blue-500/5 border-blue-500/15 text-blue-400/80 hover:bg-blue-500/15 hover:border-blue-500/30 hover:text-blue-300'
            }`}>
            <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <UsersRound size={14} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Ekip Yönetimi</p>
              <p className="text-[10px] text-blue-500/60 leading-tight mt-0.5">Takımını birlikte yönet</p>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/25 flex-shrink-0">PRO</span>
          </Link>
        </div>

        <div className="border-t border-slate-800/80 mb-2" />

        {/* Gruplar */}
        {groups.map(group => {
          const isOpen   = openGroups[group.id]
          const hasActive = isActiveGroup(group)
          const GroupIcon = group.icon

          return (
            <div key={group.id} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggle(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition group ${
                  hasActive && !isOpen
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GroupIcon size={13} />
                  {group.label}
                </div>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>

              {/* Group items */}
              {isOpen && (
                <div className="ml-2 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
                  {group.items.map(({ href, label, icon: Icon, plan, badge }) => {
                    const active = pathname === href
                    const locked = plan && plan !== 'all' && (
                      (plan === 'enterprise' && !['enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'pro'        && !['pro','enterprise'].includes(user?.planType ?? '')) ||
                      (plan === 'growth'     && !['growth','pro','enterprise'].includes(user?.planType ?? ''))
                    )

                    return (
                      <Link key={href} href={href}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition group/item ${
                          active
                            ? 'bg-blue-600 text-white'
                            : locked
                            ? 'text-slate-600 hover:text-slate-500 cursor-default'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={14} className="flex-shrink-0" />
                          <span className="truncate">{label}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          {badge && !active && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20 leading-none">
                              {badge}
                            </span>
                          )}
                          {locked && plan && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md leading-none ${planColors[plan]}`}>
                              {planLabels[plan]}
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

      {/* ── Upgrade CTA ── */}
      {user?.planType === 'starter' && (
        <div className="mx-3 mb-3 flex-shrink-0">
          <Link href="/billing"
            className="block bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/20 rounded-xl p-3.5 hover:border-violet-500/40 transition group">
            <div className="flex items-center gap-2 mb-1.5">
              <Crown size={14} className="text-violet-400" />
              <span className="text-xs font-semibold text-white">Pro'ya Geç</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
              AI araçlar, gelişmiş reklam ve rakip izleme özelliklerini aç.
            </p>
            <div className="flex items-center gap-1.5 text-violet-400 text-xs font-medium group-hover:gap-2.5 transition-all">
              <Sparkle size={11} />
              Planları incele
              <ChevronRight size={11} />
            </div>
          </Link>
        </div>
      )}

      {/* ── User footer ── */}
      <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/login') }}
            title="Çıkış Yap"
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition flex-shrink-0">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}