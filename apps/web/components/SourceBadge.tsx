// apps/web/components/SourceBadge.tsx
// Her lead'in kaynağını logo+renk ile gösterir

export function SourceBadge({ source }: { source: string }) {
  const sources: Record<string, { icon: string; label: string; bg: string; text: string }> = {
    google_maps: { icon: '🗺️', label: 'Google Maps', bg: 'bg-green-500/20', text: 'text-green-300' },
    instagram:   { icon: '📸', label: 'Instagram',   bg: 'bg-pink-500/20',  text: 'text-pink-300' },
    facebook:    { icon: '📘', label: 'Facebook',    bg: 'bg-blue-500/20',  text: 'text-blue-300' },
    tiktok:      { icon: '🎵', label: 'TikTok',      bg: 'bg-slate-500/20', text: 'text-slate-300' },
    referral:    { icon: '🤝', label: 'Referans',    bg: 'bg-purple-500/20',text: 'text-purple-300' },
    trade_fair:  { icon: '🏛️', label: 'Fuar',        bg: 'bg-cyan-500/20',  text: 'text-cyan-300' },
    manual:      { icon: '✍️', label: 'Manuel',      bg: 'bg-slate-700',    text: 'text-slate-400' },
    web:         { icon: '🌐', label: 'Web',          bg: 'bg-blue-500/20',  text: 'text-blue-300' },
    'Web/LinkedIn': { icon: '💼', label: 'LinkedIn',  bg: 'bg-blue-600/20',  text: 'text-blue-400' },
  }

  const s = sources[source] || { icon: '📍', label: source || 'Kaynak', bg: 'bg-slate-700', text: 'text-slate-400' }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  )
}