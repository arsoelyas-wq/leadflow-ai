'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard, Users, Megaphone, BarChart3, MessageSquare,
  Settings, CreditCard, LogOut, Zap, Activity, Target, DollarSign,
  Crosshair, Bot, FlaskConical, Webhook, Smartphone, Eye,
  TrendingUp, Sparkles, Video, RefreshCw, FileText, Star,
  Clock, Heart, Code, Building2, Phone, Globe, Globe2, Box,
  Workflow, MapPin, ScrollText, Gift, TrendingDown,
  GraduationCap, Inbox, Kanban, Radar, UserCog, Mail,
  QrCode, Trophy, FileBarChart, TrendingDown as PriceIcon
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  // ── LEAD KAYNAKLARI ──
  { href: '/leads', label: 'Leadler', icon: Users },
  { href: '/lead-machine', label: 'Lead Makinesi', icon: Target },
  { href: '/lead-hunter', label: '7/24 Lead Avcısı', icon: Bot },
  { href: '/workflow', label: 'Workflow Engine', icon: Workflow },
  { href: '/pipeline', label: 'Pipeline & Kanban', icon: Kanban },
  { href: '/trade-fair', label: 'Fuar Asistanı', icon: MapPin },
  { href: '/tenders', label: 'İhale Avcısı', icon: ScrollText },
  { href: '/lead-quality', label: 'Lead Kalite AI', icon: Star },
  { href: '/health-scores', label: 'Müşteri Sağlığı', icon: Heart },
  { href: '/decision-maker', label: 'Karar Verici', icon: Crosshair },

  // ── KAMPANYA & MESAJ ──
  { href: '/inbox', label: 'Unified Inbox', icon: Inbox },
  { href: '/campaigns', label: 'WA Kampanyalar', icon: Megaphone },
  { href: '/email-campaigns', label: 'Email Kampanya', icon: Mail },
  { href: '/sms-campaigns', label: 'SMS Kampanya', icon: Smartphone },
  { href: '/sequences', label: 'AI Sekanslar', icon: Bot },
  { href: '/ab-testing', label: 'A/B Test', icon: FlaskConical },
  { href: '/messages', label: 'Mesajlar', icon: MessageSquare },
  { href: '/smart-timing', label: 'Akıllı Zamanlama', icon: Clock },
  { href: '/retargeting', label: 'Retargeting', icon: RefreshCw },
  { href: '/emotional-iq', label: 'Duygusal Zeka', icon: Heart },

  // ── REKLAMLAR ──
  { href: '/ads', label: 'Meta & Google Reklam', icon: Megaphone },

  // ── AI ARAÇLAR ──
  { href: '/video-outreach', label: 'AI Video', icon: Video },
  { href: '/voice-outreach', label: 'AI Sesli Arama', icon: Phone },
  { href: '/ar-experience', label: 'AR Deneyimi', icon: Box },
  { href: '/vision', label: 'Vision AI', icon: Eye },
  { href: '/proposals', label: 'Teklif & Pazarlık', icon: FileText },
  { href: '/microsites', label: 'Kişisel Katalog', icon: Globe },
  { href: '/qr-codes', label: 'QR Kod Üretici', icon: QrCode },
  { href: '/sales-coach', label: 'Satış Koçu', icon: GraduationCap },

  // ── SATIŞ & GELİR ──
  { href: '/loyalty', label: 'Sadakat Puanı', icon: Trophy },
  { href: '/referral', label: 'Referral Loop', icon: Gift },
  { href: '/debt-collector', label: 'Tahsilat Takibi', icon: TrendingDown },
  { href: '/crisis-radar', label: 'Kriz & Fırsat Radar', icon: Radar },
  { href: '/reports', label: 'Raporlar', icon: FileBarChart },
  { href: '/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/revenue', label: 'Gelir Tahmini', icon: DollarSign },
  { href: '/financial', label: 'Büyüme Zekası', icon: TrendingUp },

  // ── PAZAR & RAKİP ──
  { href: '/price-tracker', label: 'Fiyat Takibi', icon: PriceIcon },
  { href: '/visual-trends', label: 'Trend Catcher', icon: Sparkles },
  { href: '/competitor', label: 'Rakip Hijack', icon: Target },
  { href: '/shadow', label: 'Rakip İzleme', icon: Eye },
  { href: '/cultural', label: 'Kültürel Uyum', icon: Globe },
  { href: '/export', label: 'İhracat Zekası', icon: Globe2 },
  { href: '/meta-intent', label: 'Meta Intent', icon: Target },

  // ── ENTEGRASYON ──
  { href: '/automations', label: 'Otomasyon (Zapier)', icon: Zap },

  // ── SİSTEM ──
  { href: '/team', label: 'Ekip Yönetimi', icon: UserCog },
  { href: '/wa-numbers', label: 'WA Numaralar', icon: Smartphone },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/whitelabel', label: 'White-Label', icon: Building2 },
  { href: '/developer', label: 'API Erişimi', icon: Code },
  { href: '/monitoring', label: 'Monitör', icon: Activity },
  { href: '/billing', label: 'Abonelik', icon: CreditCard },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">LeadFlow AI</span>
        </div>
      </div>
      {user && (
        <div className="mx-4 mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Kalan Kredi</span>
            <span className="text-xs text-blue-400 font-semibold">{user.creditsTotal - user.creditsUsed} / {user.creditsTotal}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.max(0, ((user.creditsTotal - user.creditsUsed) / user.creditsTotal) * 100)}%` }} />
          </div>
        </div>
      )}
      <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Icon size={18} />{label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={() => { logout(); router.push('/login') }}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition w-full">
          <LogOut size={16} /> Çıkış Yap
        </button>
      </div>
    </aside>
  )
}