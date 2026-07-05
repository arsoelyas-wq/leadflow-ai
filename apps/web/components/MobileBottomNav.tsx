'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { LayoutDashboard, Users, Megaphone, Inbox, MoreHorizontal } from 'lucide-react'

const BOTTOM_NAV = [
  { href: '/dashboard',   labelKey: 'nav.dashboard',   fallback: 'Panel',     icon: LayoutDashboard },
  { href: '/leads',       labelKey: 'nav.leads',        fallback: 'Leadler',   icon: Users },
  { href: '/automations', labelKey: 'nav.automations',  fallback: 'Otomasyon', icon: Megaphone },
  { href: '/inbox',       labelKey: 'nav.inbox',        fallback: 'Gelen',     icon: Inbox },
]

interface MobileBottomNavProps {
  onMenuOpen: () => void
}

export default function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav className="mobile-bottom-nav">
      {BOTTOM_NAV.map(({ href, labelKey, fallback, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '10px 4px 8px',
              textDecoration: 'none',
              color: active ? '#2563eb' : '#94a3b8',
              transition: 'color 0.15s',
              minHeight: 56,
              position: 'relative',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 24,
                height: 2.5,
                background: '#2563eb',
                borderRadius: '0 0 3px 3px',
              }} />
            )}
            <Icon
              size={21}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span style={{
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
              lineHeight: 1.2,
            }}>
              {t(labelKey, fallback)}
            </span>
          </Link>
        )
      })}

      {/* Daha Fazla / Menü butonu */}
      <button
        onClick={onMenuOpen}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          padding: '10px 4px 8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94a3b8',
          fontFamily: 'inherit',
          minHeight: 56,
        }}
      >
        <MoreHorizontal size={21} strokeWidth={1.8} />
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.01em',
          lineHeight: 1.2,
        }}>
          Menü
        </span>
      </button>
    </nav>
  )
}
