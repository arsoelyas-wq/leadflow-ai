'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Zap, TrendingUp, Users, Search, MapPin, MessageCircle, Mail, Phone,
  CheckCircle2, Loader2, LayoutDashboard, Send, BarChart3, Settings,
  Target, Building2, Sparkles,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────
const SCENE_DURATION = 5400
const TICK = 50
const SCENE_COUNT = 3

const tx1 = '#0f172a'
const tx2 = '#64748b'
const tx3 = '#94a3b8'
const surf = '#f8fafc'

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
}

const SCENE_META = [
  { title: 'Lead Keşfi', sub: 'Google Maps taranıyor', color: '#3b82f6' },
  { title: 'Kampanya Aktif', sub: '4 kanalda otomatik', color: '#8b5cf6' },
  { title: 'Sonuçlar Canlı', sub: 'Gerçek zamanlı analitik', color: '#10b981' },
]

const LEADS = [
  { name: 'Türk Tekstil A.Ş.', city: 'İstanbul', score: 95, c: '#10b981', bg: '#ecfdf5' },
  { name: 'Metro Yapı Ltd.',    city: 'Ankara',   score: 78, c: '#3b82f6', bg: '#eff6ff' },
  { name: 'Digital GmbH',      city: 'İzmir',    score: 62, c: '#f59e0b', bg: '#fef3c7' },
  { name: 'SaaS Startup TR',   city: 'Bursa',    score: 45, c: '#f43f5e', bg: '#fff1f2' },
]

const CHANNELS = [
  { icon: MessageCircle, label: 'WhatsApp', color: '#25D366' },
  { icon: Mail,          label: 'E-posta',  color: '#3b82f6' },
  { icon: Phone,         label: 'AI Arama', color: '#8b5cf6' },
]

const CHART_PTS = [2, 4, 3, 6, 5, 8, 6, 10, 8, 12, 10, 14, 12, 16]

const MAP_PINS = [
  { top: '22%', left: '30%', delay: 0.2 },
  { top: '52%', left: '62%', delay: 0.55 },
  { top: '70%', left: '20%', delay: 0.9 },
  { top: '30%', left: '75%', delay: 1.25 },
]

const FUNNEL = [
  { label: 'Yeni',      pct: 100, color: '#3b82f6' },
  { label: 'İletişim',  pct: 72,  color: '#8b5cf6' },
  { label: 'Teklif',    pct: 48,  color: '#f59e0b' },
  { label: 'Kapandı',   pct: 28,  color: '#10b981' },
]

const STATS = [
  { label: 'Toplam Lead', val: 2847, prefix: '',  suffix: '',  color: '#3b82f6', trend: 12 },
  { label: 'Pipeline',    val: 874,  prefix: '₺', suffix: 'K', color: '#10b981', trend: 8  },
  { label: 'Dönüşüm',    val: 87,   prefix: '',  suffix: '%', color: '#8b5cf6', trend: 15 },
  { label: 'Kredi',       val: 4203, prefix: '',  suffix: '',  color: '#f59e0b', trend: 5  },
]

const NOTIFS = [
  {
    tr: { icon: Target,       iconBg: '#eff6ff', iconC: '#3b82f6', title: '4 Lead Bulundu',      sub: 'İstanbul · Tekstil · 0.3s', accent: '#3b82f6' },
    bl: { icon: MapPin,       iconBg: '#ecfdf5', iconC: '#10b981', title: 'Maps Tarandı',         sub: '1.247 nokta analiz edildi', accent: '#10b981' },
  },
  {
    tr: { icon: CheckCircle2, iconBg: '#ecfdf5', iconC: '#10b981', title: '147 Mesaj Teslim',    sub: 'Son 24 saat · %91 başarı',  accent: '#10b981' },
    bl: { icon: Phone,        iconBg: '#fdf4ff', iconC: '#8b5cf6', title: 'Arama Bağlandı',      sub: 'Metro Yapı · 00:42',        accent: '#8b5cf6' },
  },
  {
    tr: { icon: TrendingUp,   iconBg: '#fef3c7', iconC: '#d97706', title: '₺48.000 Anlaşma!',   sub: 'Türk Tekstil · Kazanıldı',  accent: '#d97706' },
    bl: { icon: Users,        iconBg: '#eff6ff', iconC: '#3b82f6', title: 'Dönüşüm +15%',        sub: 'Bu ay vs geçen ay',         accent: '#3b82f6' },
  },
]

// ── Waypoints (scene 0/1/2) ────────────────────────────────────────
type WP = { p: number; x: number; y: number; click?: true }
const WAYPOINTS: WP[][] = [
  [
    { p:  0, x: 108, y: 60 },
    { p:  8, x: 108, y: 60, click: true },
    { p: 22, x:  48, y: 132 },
    { p: 34, x:  88, y: 178, click: true },
    { p: 52, x: 342, y: 118 },
    { p: 66, x: 342, y: 192, click: true },
    { p: 86, x: 342, y: 235 },
  ],
  [
    { p:  0, x:  62, y: 60 },
    { p:  8, x:  62, y: 60, click: true },
    { p: 22, x: 180, y: 60 },
    { p: 30, x: 180, y: 60, click: true },
    { p: 48, x: 298, y: 60 },
    { p: 56, x: 298, y: 60, click: true },
    { p: 74, x: 458, y: 248 },
    { p: 82, x: 458, y: 248, click: true },
  ],
  [
    { p:  0, x: 468, y: 58 },
    { p: 14, x: 468, y: 58, click: true },
    { p: 34, x: 252, y: 180 },
    { p: 52, x: 430, y: 180, click: true },
    { p: 70, x: 252, y: 322 },
    { p: 88, x: 252, y: 322, click: true },
  ],
]

// ── Helpers ────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function easeInOut(t: number) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2 }

function getCursorPos(wps: WP[], progress: number) {
  let lo = wps[0], hi = wps[wps.length - 1]
  for (let i = 0; i < wps.length - 1; i++) {
    if (progress >= wps[i].p && progress <= wps[i+1].p) { lo = wps[i]; hi = wps[i+1]; break }
  }
  const span = hi.p - lo.p
  const t = span <= 0 ? 1 : easeInOut(Math.min(1, (progress - lo.p) / span))
  const clickPct = (250 / SCENE_DURATION) * 100
  return {
    x: lerp(lo.x, hi.x, t),
    y: lerp(lo.y, hi.y, t),
    clicking: !!lo.click && (progress - lo.p) >= 0 && (progress - lo.p) <= clickPct,
  }
}

function useReducedMotion() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setV(mq.matches)
    const h = (e: MediaQueryListEvent) => setV(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return v
}

function useCountUp(target: number, reduced: boolean, duration = 900) {
  const [v, setV] = useState(reduced ? target : 0)
  useEffect(() => {
    if (reduced) { setV(target); return }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setV(Math.round(target * ease))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, reduced, duration])
  return v
}

// ── Sub-components ─────────────────────────────────────────────────
function HeroCursor({ wps, progress }: { wps: WP[]; progress: number }) {
  const { x, y, clicking } = getCursorPos(wps, progress)
  return (
    <div className="absolute z-10 pointer-events-none" style={{ left: x - 4, top: y - 2 }}>
      {clicking && (
        <div className="absolute -inset-2 rounded-full animate-ping"
          style={{ background: 'rgba(59,130,246,0.18)', animationDuration: '0.4s' }} />
      )}
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', transform: clicking ? 'scale(0.88)' : 'scale(1)', transition: 'transform 0.12s' }}>
        <path d="M0 0L0 15.5L4 11.5L6.8 18L8.5 17.2L5.8 10.5L11 10.5L0 0Z" fill="#1e293b" />
        <path d="M0 0L0 15.5L4 11.5L6.8 18L8.5 17.2L5.8 10.5L11 10.5L0 0Z" fill="none" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function DeltaBadge({ trend }: { trend: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex-shrink-0"
      style={{ background: '#ecfdf5', color: '#059669' }}>
      ▲ +{trend}%
    </span>
  )
}

function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
    </div>
  )
}

function ScoreBadge({ score, c, bg }: { score: number; c: string; bg: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-bold flex-shrink-0 animate-hero-badge-pop"
      style={{ color: c, background: bg }}>
      {score}
    </span>
  )
}

function StatCard({ label, val, prefix, suffix, color, trend, reduced }: typeof STATS[0] & { reduced: boolean }) {
  const display = useCountUp(val, reduced)
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl" style={card}>
      <div className="flex items-center justify-between gap-1">
        <span style={{ fontSize: 9, color: tx2, fontWeight: 600 }}>{label}</span>
        <DeltaBadge trend={trend} />
      </div>
      <span style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>
        {prefix}{display.toLocaleString('tr-TR')}{suffix}
      </span>
      <div className="flex items-end gap-px" style={{ height: 10 }}>
        {[3,4,3,5,4,6,5,7].map((v, i) => (
          <div key={i} style={{ flex: 1, height: `${v * 1.3}px`, background: color, borderRadius: 1, opacity: 0.25 + i * 0.09 }} />
        ))}
      </div>
    </div>
  )
}

function DonutChart({ value, label, color, reduced }: { value: number; label: string; color: string; reduced: boolean }) {
  const display = useCountUp(value, reduced, 1100)
  const r = 24; const c = 2 * Math.PI * r
  const offset = c - (display / 100) * c
  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <svg width={56} height={56} viewBox="0 0 56 56" className="-rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ fontSize: 16, fontWeight: 800, color: tx1, marginTop: -40, pointerEvents: 'none', lineHeight: 1 }}>
        %{display}
      </div>
      <div style={{ marginTop: 24, fontSize: 9, color: tx2, fontWeight: 600, textAlign: 'center' }}>{label}</div>
    </div>
  )
}

// ── Scenes ─────────────────────────────────────────────────────────
function SceneDiscover() {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={card}>
        <Search size={12} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: tx1, fontWeight: 500 }} className="animate-typing flex-1 overflow-hidden whitespace-nowrap">
          İstanbul · Tekstil firmaları ara...
        </span>
        <span className="animate-caret-blink flex-shrink-0" style={{ width: 1.5, height: 11, background: '#3b82f6', borderRadius: 1 }} />
      </div>

      {/* Map + list */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Map */}
        <div className="relative rounded-xl overflow-hidden flex-shrink-0" style={{
          width: 118,
          background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
          border: '1px solid #e2e8f0',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 0.8px, transparent 0.8px)',
          backgroundSize: '10px 10px',
        }}>
          {/* Subtle city outline effect */}
          <div className="absolute inset-0 opacity-10"
            style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 70 Q40 30 80 40 Q60 60 70 80\' fill=\'none\' stroke=\'%233b82f6\' strokeWidth=\'2\'/%3E%3C/svg%3E") center/cover' }} />
          {MAP_PINS.map((pin, i) => (
            <div key={i} className="absolute animate-drop-pin"
              style={{ top: pin.top, left: pin.left, animationDelay: `${pin.delay}s` }}>
              <div className="relative">
                <MapPin size={16} style={{ color: '#3b82f6', filter: 'drop-shadow(0 2px 4px rgba(59,130,246,0.4))' }} fill="#dbeafe" />
                <div className="absolute inset-0 -m-1 rounded-full animate-ping opacity-40"
                  style={{ background: '#3b82f6', animationDuration: `${1.5 + i * 0.4}s`, animationDelay: `${pin.delay + 0.3}s` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Lead list */}
        <div className="flex-1 rounded-xl p-2.5 flex flex-col gap-1.5 justify-center" style={card}>
          {LEADS.map((lead, i) => (
            <div key={lead.name} className="flex items-center justify-between gap-2 animate-scene-in"
              style={{ animationDelay: `${0.3 + i * 0.22}s` }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: lead.bg, color: lead.c }}>
                  {lead.name[0]}
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: 10, fontWeight: 700, color: tx1 }} className="truncate">{lead.name}</div>
                  <div style={{ fontSize: 8, color: tx3 }}>{lead.city}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <MiniBar score={lead.score} color={lead.c} />
                <ScoreBadge score={lead.score} c={lead.c} bg={lead.bg} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
        style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={10} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 700 }}>AI Skorlama tamamlandı</span>
        </div>
        <div className="flex items-center gap-1">
          <Loader2 size={9} className="animate-spin" style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600 }}>4 lead · 0.3s</span>
        </div>
      </div>
    </div>
  )
}

function SceneCampaign() {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Channel pills */}
      <div className="flex gap-1.5">
        {CHANNELS.map(({ icon: Icon, label, color }, i) => (
          <div key={label} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl animate-channel-active cursor-pointer"
            style={{ border: '1px solid #e2e8f0', background: '#fff', animationDelay: `${i * 1.3}s` }}>
            <Icon size={12} style={{ color }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: tx1 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Delivery rows */}
      <div className="flex-1 rounded-xl p-2.5 flex flex-col gap-2" style={card}>
        <div style={{ fontSize: 9, color: tx3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gönderim Durumu</div>

        {LEADS.map((lead, i) => (
          <div key={lead.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: lead.bg, color: lead.c }}>
                {lead.name[0]}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: tx1 }} className="truncate">{lead.name}</span>
            </div>
            <div className="relative h-5 flex-shrink-0" style={{ minWidth: 90 }}>
              <span className="absolute right-0 top-0 flex items-center gap-1 px-1.5 py-0.5 rounded-lg animate-status-out"
                style={{ animationDelay: `${i * 0.45}s`, background: '#fffbeb', color: '#b45309', fontSize: 9, fontWeight: 700 }}>
                <Loader2 size={8} className="animate-spin" /> Gönderiliyor
              </span>
              <span className="absolute right-0 top-0 flex items-center gap-1 px-1.5 py-0.5 rounded-lg animate-status-in"
                style={{ animationDelay: `${i * 0.45}s`, background: '#ecfdf5', color: '#059669', fontSize: 9, fontWeight: 700 }}>
                <CheckCircle2 size={8} /> Teslim Edildi
              </span>
            </div>
          </div>
        ))}

        {/* Call row */}
        <div className="flex items-center justify-between gap-2 pt-1.5"
          style={{ borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center animate-ring-pulse flex-shrink-0"
              style={{ background: '#fdf4ff', color: '#8b5cf6' }}>
              <Phone size={10} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: tx1 }} className="truncate">Metro Yapı Ltd.</span>
          </div>
          <div className="relative h-5 flex-shrink-0" style={{ minWidth: 90 }}>
            <span className="absolute right-0 top-0 px-1.5 py-0.5 rounded-lg animate-status-out"
              style={{ background: '#fdf4ff', color: '#7c3aed', fontSize: 9, fontWeight: 700 }}>
              Bağlanıyor...
            </span>
            <span className="absolute right-0 top-0 px-1.5 py-0.5 rounded-lg animate-status-in"
              style={{ background: '#fdf4ff', color: '#7c3aed', fontSize: 9, fontWeight: 700 }}>
              ● Görüşme 00:42
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
        style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={10} style={{ color: '#10b981' }} />
          <span style={{ fontSize: 10, color: '#065f46', fontWeight: 700 }}>4/4 mesaj teslim · 1 arama aktif</span>
        </div>
        <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>%91 başarı</span>
      </div>
    </div>
  )
}

function SceneResults({ reduced }: { reduced: boolean }) {
  const max = Math.max(...CHART_PTS), min = Math.min(...CHART_PTS)
  const range = max - min || 1
  const W = 100, H = 38
  const pts = CHART_PTS.map((v, i) => ({
    x: (i / (CHART_PTS.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 6),
  }))
  const pathD = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`
  const areaD = `${pathD} L ${pts[pts.length-1].x},${H} L 0,${H} Z`
  const last = pts[pts.length - 1]

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-1.5">
        {STATS.map(s => <StatCard key={s.label} {...s} reduced={reduced} />)}
      </div>

      {/* Chart + donut + funnel */}
      <div className="flex-1 grid gap-1.5 min-h-0" style={{ gridTemplateColumns: '1fr 80px 84px' }}>
        {/* Area chart */}
        <div className="flex flex-col p-2.5 rounded-xl" style={card}>
          <div style={{ fontSize: 9, color: tx3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Mesaj Trendi — Son 14 gün
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="flex-1 w-full overflow-visible">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(t => (
              <line key={t} x1={0} y1={H * t} x2={W} y2={H * t}
                stroke="#f1f5f9" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
            ))}
            {/* Area fill */}
            <path d={areaD} fill="url(#chartGrad)" className="animate-hero-area-reveal" />
            {/* Line */}
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={1.8}
              vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray={1}
              className={reduced ? '' : 'animate-draw-stroke'} />
            {/* End dot */}
            <circle cx={last.x} cy={last.y} r={2} fill="#3b82f6" />
            <circle cx={last.x} cy={last.y} r={4} fill="#3b82f6" fillOpacity={0.2} />
          </svg>
        </div>

        {/* Donut */}
        <div className="flex items-center justify-center p-2 rounded-xl" style={card}>
          <DonutChart value={91} label="Yanıt Oranı" color="#10b981" reduced={reduced} />
        </div>

        {/* Funnel */}
        <div className="flex flex-col gap-1.5 justify-center p-2.5 rounded-xl" style={card}>
          {FUNNEL.map((stage, i) => (
            <div key={stage.label} className="animate-scene-in" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <div className="flex items-center justify-between" style={{ fontSize: 8, color: tx3, marginBottom: 2 }}>
                <span>{stage.label}</span><span style={{ fontWeight: 700, color: tx2 }}>{stage.pct}%</span>
              </div>
              <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${stage.pct}%`, height: '100%', borderRadius: 2, background: stage.color,
                  transition: reduced ? 'none' : 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent leads */}
      <div className="flex flex-col gap-1">
        {[
          { name: 'Türk Tekstil A.Ş.', status: 'Kazanıldı', c: '#059669', bg: '#ecfdf5', score: 95, bar: '#10b981' },
          { name: 'Metro Yapı Ltd.',   status: 'Teklif',    c: '#2563eb', bg: '#eff6ff', score: 78, bar: '#3b82f6' },
        ].map(lead => (
          <div key={lead.name} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl" style={card}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: lead.bg, color: lead.c }}>
                {lead.name[0]}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: tx1 }} className="truncate">{lead.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div style={{ width: 44, height: 3, background: '#f1f5f9', borderRadius: 2 }}>
                <div style={{ width: `${lead.score}%`, height: '100%', background: lead.bar, borderRadius: 2 }} />
              </div>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: lead.bg, color: lead.c }}>
                {lead.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Notification card ──────────────────────────────────────────────
function NotifCard({
  icon: Icon, iconBg, iconC, title, sub, accent, side, key: _k,
}: { icon: any; iconBg: string; iconC: string; title: string; sub: string; accent: string; side: 'right' | 'left'; key?: string }) {
  return (
    <div className={`relative flex items-center gap-3 px-3.5 py-3 rounded-2xl overflow-hidden min-w-[210px] max-w-[240px]
      ${side === 'right' ? 'animate-notif-right' : 'animate-notif-left'}`}
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.85)',
        boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
      }}>
      {/* Left accent */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: accent }} />
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconC }} />
      </div>
      {/* Text */}
      <div className="min-w-0">
        <p className="text-[12px] font-bold truncate" style={{ color: '#0f172a' }}>{title}</p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: '#64748b' }}>{sub}</p>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
const SIDEBAR_ICONS = [LayoutDashboard, Send, BarChart3, Settings]

export default function LandingHeroDemo() {
  const reduced = useReducedMotion()
  const [scene, setScene] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reduced) { setScene(2); setProgress(100); return }
    const iv = setInterval(() => {
      setProgress(p => {
        const next = p + (TICK / SCENE_DURATION) * 100
        if (next >= 100) { setScene(s => (s + 1) % SCENE_COUNT); return 0 }
        return next
      })
    }, TICK)
    return () => clearInterval(iv)
  }, [reduced])

  const notif = NOTIFS[scene]
  const meta = SCENE_META[scene]

  return (
    <div className="relative w-full max-w-[620px] mx-auto">

      {/* Ambient glow */}
      <div className="absolute -inset-8 -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.14) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)', filter: 'blur(20px)' }} />

      {/* Float wrapper */}
      <div className="animate-float">

        {/* ── Browser window ─────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(15,23,42,0.2),0_8px_24px_rgba(15,23,42,0.12)]">

          {/* Title bar */}
          <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: '#0f172a' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                <p className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>app.sovlo.io/dashboard</p>
              </div>
            </div>
          </div>

          {/* Dashboard body */}
          <div className="flex" style={{ height: 408 }}>

            {/* Sidebar */}
            <div className="flex-shrink-0 flex flex-col items-center py-4 gap-2"
              style={{ width: 52, background: '#ffffff', borderRight: '1px solid #f1f5f9' }}>
              {/* Logo */}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                <Zap size={14} className="text-white fill-white" />
              </div>
              {SIDEBAR_ICONS.map((Icon, i) => (
                <div key={i} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    background: i === 0 ? 'linear-gradient(135deg,#eff6ff,#e0e7ff)' : 'transparent',
                    color: i === 0 ? '#4f46e5' : '#cbd5e1',
                  }}>
                  <Icon size={14} />
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="relative flex-1 p-3.5 overflow-hidden flex flex-col gap-2.5" style={{ background: surf }}>

              {/* Scene progress pills */}
              <div className="flex items-center gap-2">
                {SCENE_META.map((m, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-500 ${i === scene ? 'flex-1' : ''}`}
                    style={{
                      background: i === scene ? `${m.color}14` : '#f1f5f9',
                      border: `1px solid ${i === scene ? `${m.color}30` : 'transparent'}`,
                    }}>
                    {i === scene && (
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: m.color }} />
                    )}
                    {i < scene && (
                      <CheckCircle2 size={10} style={{ color: m.color, flexShrink: 0 }} />
                    )}
                    {i === scene ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: 9, fontWeight: 700, color: m.color }} className="truncate">{m.title}</div>
                        </div>
                        {/* Slim progress within the pill */}
                        <div className="flex-shrink-0" style={{ width: 28, height: 2, background: `${m.color}20`, borderRadius: 1 }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: m.color, borderRadius: 1, transition: 'none' }} />
                        </div>
                      </>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: i < scene ? m.color : '#cbd5e1', flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Scene content (keyed → remounts on change) */}
              <div key={scene} className="flex-1 min-h-0 animate-scene-in">
                {scene === 0 && <SceneDiscover />}
                {scene === 1 && <SceneCampaign />}
                {scene === 2 && <SceneResults reduced={reduced} />}
              </div>

              {/* Cursor */}
              {!reduced && <HeroCursor wps={WAYPOINTS[scene]} progress={progress} />}
            </div>
          </div>
        </div>

        {/* ── Top-right notification ────────────────────── */}
        <div className="absolute -top-5 -right-5 lg:-right-10 z-20">
          <NotifCard key={`tr-${scene}`} side="right" icon={notif.tr.icon}
            iconBg={notif.tr.iconBg} iconC={notif.tr.iconC}
            title={notif.tr.title} sub={notif.tr.sub} accent={notif.tr.accent} />
        </div>

        {/* ── Bottom-left notification ──────────────────── */}
        <div className="absolute -bottom-5 -left-4 lg:-left-10 z-20">
          <NotifCard key={`bl-${scene}`} side="left" icon={notif.bl.icon}
            iconBg={notif.bl.iconBg} iconC={notif.bl.iconC}
            title={notif.bl.title} sub={notif.bl.sub} accent={notif.bl.accent} />
        </div>

      </div>{/* /animate-float */}
    </div>
  )
}
