import React from 'react'

// ── Sovlo AI — Spark Mark Logo ────────────────────────────────────────────────
// Konsept 2: Daire içinde çift yukarı chevron, gradient mavi-violet

interface SovloLogoProps {
  variant?: 'horizontal' | 'icon' | 'stacked'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  theme?: 'light' | 'dark'
  className?: string
}

const SIZES = {
  sm: { icon: 28, fontSize: 14.5, aiSize: 10, gap: 8 },
  md: { icon: 36, fontSize: 18,   aiSize: 12, gap: 10 },
  lg: { icon: 48, fontSize: 24,   aiSize: 14, gap: 12 },
  xl: { icon: 64, fontSize: 32,   aiSize: 18, gap: 16 },
}

export function SparkIcon({ size = 36, style }: { size?: number; style?: React.CSSProperties }) {
  const r = size / 2
  // chevron control points scaled to icon size
  const pad   = size * 0.27
  const mid   = size * 0.50
  const top1  = size * 0.28
  const top2  = size * 0.44
  const bot1  = size * 0.50
  const bot2  = size * 0.66

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={style}
    >
      <defs>
        <linearGradient id={`spark-g-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      {/* Circle background */}
      <circle cx={r} cy={r} r={r} fill={`url(#spark-g-${size})`} />
      {/* Top chevron */}
      <polyline
        points={`${pad},${bot1} ${mid},${top1} ${size - pad},${bot1}`}
        fill="none"
        stroke="white"
        strokeWidth={size * 0.115}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom chevron (faded) */}
      <polyline
        points={`${pad},${bot2} ${mid},${top2} ${size - pad},${bot2}`}
        fill="none"
        stroke="rgba(255,255,255,0.38)"
        strokeWidth={size * 0.115}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function SovloLogo({
  variant = 'horizontal',
  size = 'md',
  theme = 'light',
  className = '',
}: SovloLogoProps) {
  const s = SIZES[size]
  const wordColor  = theme === 'dark' ? '#f8fafc' : '#0f172a'
  const aiColor    = '#0EA5E9'

  if (variant === 'icon') {
    return <SparkIcon size={s.icon} />
  }

  if (variant === 'stacked') {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s.gap * 0.6 }}>
        <SparkIcon size={s.icon * 1.4} />
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: wordColor, fontWeight: 800, fontSize: s.fontSize * 1.1, letterSpacing: '-0.02em', fontFamily: 'inherit' }}>
            Sovlo
          </span>
          <span style={{ color: aiColor, fontWeight: 800, fontSize: s.fontSize * 1.1, letterSpacing: '-0.02em', marginLeft: 4, fontFamily: 'inherit' }}>
            AI
          </span>
        </div>
      </div>
    )
  }

  // horizontal (default)
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <SparkIcon size={s.icon} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ color: wordColor, fontWeight: 800, fontSize: s.fontSize, letterSpacing: '-0.02em', fontFamily: 'inherit' }}>
          Sovlo
        </span>
        <span style={{ color: aiColor, fontWeight: 800, fontSize: s.fontSize, letterSpacing: '-0.02em', fontFamily: 'inherit' }}>
          AI
        </span>
      </div>
    </div>
  )
}
