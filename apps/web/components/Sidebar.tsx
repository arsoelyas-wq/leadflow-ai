'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard, Users, Megaphone, BarChart3,
  MessageSquare, Settings, CreditCard, LogOut, Zap,
  Activity, Target, DollarSign, Crosshair
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leadler', icon: Users },
  { href: '/campaigns', label: 'Kampanyalar', icon: Megaphone },
  { href: '/messages', label: 'Mesajlar', icon: MessageSquare },
  { href: '/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/revenue', label: 'Gelir Tahmini', icon: DollarSign },
  { href: '/competitor', label: 'Rakip Hijack', icon: Target },
  { href: '/decision-maker', label: 'Karar Verici', icon: Crosshair },
  { href: '/monitoring', label: 'Monitör', icon: Activity },
  { href: '/billing', label: 'Abonelik', icon: CreditCard },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

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
            <span className="text-xs text-blue-400 font-semibold">
              {user.creditsTotal - user.creditsUsed} / {user.creditsTotal}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.max(0, ((user.creditsTotal - user.creditsUsed) / user.creditsTotal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <Icon size={18} />
              {label}
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
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition w-full">
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}