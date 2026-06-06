'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? (
        <Sun size={14} color="#94a3b8" />
      ) : (
        <Moon size={14} color="#64748b" />
      )}
    </button>
  )
}
