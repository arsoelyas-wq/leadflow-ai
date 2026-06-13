# Hero Demo Light-Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/web/components/landing/LandingHeroDemo.tsx` so the autoplay
hero animation switches from its current dark mockup (`#060a14`) to the real
dashboard's light theme, adds a simulated cursor that "drives" each scene, and
adopts three Phenomenon-inspired polish patterns (delta badges, a donut chart,
colored status chips) — making the demo feel like a real screen recording of the
product.

**Architecture:** Single-file React component rewrite (matches existing codebase
convention of large, self-contained landing components). The existing 3-scene
state machine (`SCENES`, `SCENE_DURATION=4500`, `TICK=60`, story-progress bar,
`useReducedMotion`) is unchanged. New pieces: a `HeroCursor` sub-component driven
by per-scene waypoint arrays, a `DonutChart` SVG ring, a `DeltaBadge` pill, and a
`useCountUp` hook for animated numbers. Two new CSS keyframes
(`cursor-click`, `draw-stroke`) are added to `globals.css` alongside their
utility classes and `prefers-reduced-motion` entries.

**Tech Stack:** Next.js App Router, React (client component), Tailwind CSS +
inline styles (matches existing dashboard token usage), lucide-react icons, SVG.

---

## Design Decisions (resolving spec ambiguities)

The spec at `docs/superpowers/specs/2026-06-12-hero-demo-light-theme-design.md`
is the source of truth. Two places needed a concrete decision during planning:

1. **Campaign scene status chips (Section 3, Scene 2):** the spec describes a
   3-state "queued → sending → delivered" cycle, but Section 5 says the existing
   `status-out`/`status-in` keyframes (a 2-state opacity cross-fade) are kept
   **as-is**. A 3-state cycle would require a new keyframe, contradicting
   Section 5. **Decision:** keep the existing 2-state cross-fade
   ("Gönderiliyor" → "Teslim Edildi"), recolored to light tokens (amber
   `#fffbeb`/`#b45309` → emerald `#ecfdf5`/`#059669`). This matches the current
   code structure exactly and satisfies the "recolored status chips" intent.

2. **`useCountUp` signature (Section 4):** the spec signature is
   `useCountUp(target, active, duration)`. Because `ResultsScene` is wrapped in
   `key={scene}` (it fully remounts each time scene 2 begins), an `active` flag
   is redundant — the count-up effect already restarts on every mount.
   **Decision:** `useCountUp(target: number, reduced: boolean, duration = 1200)`.
   `reduced` is the only gate needed (Section 6: "when reduced-motion is true,
   returns target immediately").

3. **Recent-leads status chip colors (Section 3, Scene 3):** the spec's generic
   reference palette is "active=emerald, paused=amber, completed=blue,
   draft=gray" (from the Phenomenon reference, a different status vocabulary).
   Our actual statuses are "Kazanıldı / Aktif / İletişim". **Decision:** map
   Kazanıldı→emerald (`#ecfdf5`/`#059669`), Aktif→blue (`#eff6ff`/`#2563eb`),
   İletişim→amber (`#fffbeb`/`#b45309`) — same three-color polish pattern,
   applied to our real status labels.

4. **Donut/chart "stroke-dashoffset animation" (Section 5):** the line chart
   uses the new `draw-stroke` keyframe (a one-shot CSS animation via the SVG
   `pathLength={1}` trick, so no path-length math is needed). The donut's ring
   is driven by `useCountUp`'s per-frame value via `requestAnimationFrame`,
   recomputing `stroke-dashoffset` directly — simpler than a CSS keyframe for a
   value-driven animation, and still satisfies "animates `stroke-dashoffset`
   from full to `value`%".

---

## File Structure

- **Modify:** `apps/web/app/globals.css` — add `cursor-click` and `draw-stroke`
  keyframes + `.animate-cursor-click` / `.animate-draw-stroke` utility classes +
  `prefers-reduced-motion` entries.
- **Modify (full rewrite):** `apps/web/components/landing/LandingHeroDemo.tsx` —
  light-theme tokens, `HeroCursor`, `DonutChart`, `DeltaBadge`, `useCountUp`,
  restyled `ScrapeScene`/`CampaignScene`/`ResultsScene`, restyled frame (dark
  title bar + light sidebar + light content area).
- **No change expected:** `apps/web/components/landing/LandingHero.tsx` — the
  panel already sits on a white page background; verified visually in Task 3.

---

## Task 1: `globals.css` — add `cursor-click` and `draw-stroke` keyframes

**Files:**
- Modify: `apps/web/app/globals.css:138-142` (insert after `ring-pulse` keyframe)
- Modify: `apps/web/app/globals.css:220-222` (insert after `.animate-ring-pulse`)
- Modify: `apps/web/app/globals.css:507-517` (reduced-motion selector list)

- [ ] **Step 1: Add the two new `@keyframes` blocks after `ring-pulse`**

Current content at lines 138-142:

```css
@keyframes ring-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}
```

Replace with:

```css
@keyframes ring-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}

@keyframes cursor-click {
  0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(15,23,42,0.25); }
  50%  { transform: scale(0.82); box-shadow: 0 0 0 6px rgba(15,23,42,0.12); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(15,23,42,0); }
}

@keyframes draw-stroke {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
```

- [ ] **Step 2: Add the two new utility classes after `.animate-ring-pulse`**

Current content at lines 220-222:

```css
.animate-ring-pulse {
  animation: ring-pulse 1.5s ease-out infinite;
}
```

Replace with:

```css
.animate-ring-pulse {
  animation: ring-pulse 1.5s ease-out infinite;
}

.animate-cursor-click {
  animation: cursor-click 0.25s ease-out;
}

.animate-draw-stroke {
  animation: draw-stroke 1.2s ease-out both;
}
```

- [ ] **Step 3: Add the new classes to the `prefers-reduced-motion` block**

Current content at lines 507-517:

```css
  .animate-channel-active,
  .animate-status-out,
  .animate-status-in,
  .animate-ring-pulse {
    animation: none !important;
  }
```

Replace with:

```css
  .animate-channel-active,
  .animate-status-out,
  .animate-status-in,
  .animate-ring-pulse,
  .animate-cursor-click,
  .animate-draw-stroke {
    animation: none !important;
  }
```

- [ ] **Step 4: Sanity check — no syntax errors**

Run: `cd apps/web && npx tsc --noEmit`
Expected: same result as before this edit (CSS isn't typechecked by `tsc`, but
this confirms the edit didn't accidentally break a co-located file). A visual
check is enough here — re-open `apps/web/app/globals.css` and confirm braces
balance around the three edited regions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat: hero demo icin cursor-click ve draw-stroke keyframe ekle"
```

---

## Task 2: Rewrite `LandingHeroDemo.tsx` — light theme, cursor, donut, delta badges

**Files:**
- Modify (full rewrite): `apps/web/components/landing/LandingHeroDemo.tsx`

- [ ] **Step 1: Replace the entire file content**

Replace the full contents of `apps/web/components/landing/LandingHeroDemo.tsx`
with:

```tsx
'use client'
import { useEffect, useState } from 'react'
import {
  Zap, TrendingUp, Users, Search, MapPin, MessageCircle, Mail, Phone,
  CheckCircle2, Loader2, LayoutDashboard, Send, BarChart3, Settings,
} from 'lucide-react'

const SCENES = ['scrape', 'campaign', 'results'] as const
const SCENE_TITLES = ['Lead Taranıyor', 'Kampanya Gönderiliyor', 'Sonuçlar Güncelleniyor']
const SCENE_DURATION = 4500
const TICK = 60

// Light-theme tokens (mirrors apps/web/app/(dashboard)/dashboard/page.tsx)
const tx1 = '#0f172a'
const tx2 = '#64748b'
const tx3 = '#94a3b8'
const surf = '#f8fafc'
const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const LEADS = [
  { name: 'Türk Tekstil A.Ş.', sector: 'Tekstil', score: 95 },
  { name: 'Metro Yapı Ltd.', sector: 'İnşaat', score: 78 },
  { name: 'Digital GmbH', sector: 'Yazılım', score: 62 },
  { name: 'SaaS Startup TR', sector: 'Teknoloji', score: 45 },
]

const CHANNELS = [
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: Mail, label: 'Email' },
  { icon: Phone, label: 'Arama' },
]

const TOASTS = [
  {
    top: { icon: Search, title: '4 firma bulundu', sub: 'İstanbul · Tekstil' },
    bottom: { icon: MapPin, title: 'Google Maps taranıyor...', sub: 'Yeni firmalar ekleniyor' },
  },
  {
    top: { icon: Phone, title: 'Arama bağlandı', sub: 'Metro Yapı Ltd.' },
    bottom: { icon: Users, title: '147 mesaj gönderildi', sub: 'Son 24 saatte · %91 teslim' },
  },
  {
    top: { icon: TrendingUp, title: 'Yeni Lead!', sub: 'Metro Yapı Ltd. — Tekstil' },
    bottom: { icon: Users, title: '147 mesaj gönderildi', sub: 'Son 24 saatte · %91 teslim' },
  },
]

const MAP_PINS = [
  { top: '18%', left: '28%' },
  { top: '48%', left: '60%' },
  { top: '68%', left: '22%' },
  { top: '32%', left: '78%' },
]

const SIDEBAR_ICONS = [LayoutDashboard, Send, BarChart3, Settings]

const STAT_CARDS: { label: string; value: number; prefix?: string; suffix?: string; color: string; trend: number }[] = [
  { label: 'Pipeline', value: 874, prefix: '₺', suffix: 'K', color: '#10b981', trend: 8 },
  { label: 'Dönüşüm', value: 87, suffix: '%', color: '#8b5cf6', trend: 15 },
  { label: 'Kredi', value: 4203, color: '#f59e0b', trend: 5 },
]

const CHART_DATA = [3, 5, 4, 6, 5, 8, 7, 9, 8, 11, 9, 12, 11, 14]

const FUNNEL = [
  { label: 'Yeni', pct: 100, color: '#3b82f6' },
  { label: 'İletişim', pct: 72, color: '#8b5cf6' },
  { label: 'Teklif', pct: 48, color: '#f59e0b' },
  { label: 'Kapandı', pct: 28, color: '#10b981' },
]

const RECENT_LEADS = [
  { name: 'Türk Tekstil A.Ş.', status: 'Kazanıldı', color: '#059669', bg: '#ecfdf5', score: 95 },
  { name: 'Metro Yapı Ltd.', status: 'Aktif', color: '#2563eb', bg: '#eff6ff', score: 78 },
  { name: 'Digital GmbH', status: 'İletişim', color: '#b45309', bg: '#fffbeb', score: 62 },
]

type CursorWaypoint = { atProgress: number; x: number; y: number; click?: boolean }

const CURSOR_WAYPOINTS: CursorWaypoint[][] = [
  // Scene 0 — Scrape: search bar -> map pins -> lead list
  [
    { atProgress: 0, x: 110, y: 60 },
    { atProgress: 8, x: 110, y: 60, click: true },
    { atProgress: 18, x: 50, y: 130 },
    { atProgress: 26, x: 95, y: 178, click: true },
    { atProgress: 45, x: 340, y: 120 },
    { atProgress: 60, x: 340, y: 195, click: true },
    { atProgress: 85, x: 340, y: 235 },
  ],
  // Scene 1 — Campaign: channel selector -> call row
  [
    { atProgress: 0, x: 60, y: 60 },
    { atProgress: 8, x: 60, y: 60, click: true },
    { atProgress: 25, x: 180, y: 60 },
    { atProgress: 33, x: 180, y: 60, click: true },
    { atProgress: 50, x: 300, y: 60 },
    { atProgress: 58, x: 300, y: 60, click: true },
    { atProgress: 75, x: 460, y: 250 },
    { atProgress: 83, x: 460, y: 250, click: true },
  ],
  // Scene 2 — Results: stat cards -> chart -> recent leads
  [
    { atProgress: 0, x: 470, y: 60 },
    { atProgress: 15, x: 470, y: 60, click: true },
    { atProgress: 35, x: 250, y: 180 },
    { atProgress: 55, x: 430, y: 180, click: true },
    { atProgress: 75, x: 250, y: 320 },
    { atProgress: 90, x: 250, y: 320, click: true },
  ],
]

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

function useCountUp(target: number, reduced: boolean, duration = 1200) {
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const pct = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * pct))
      if (pct < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, target, duration])

  return value
}

function HeroCursor({ waypoints, progress }: { waypoints: CursorWaypoint[]; progress: number }) {
  let current = waypoints[0]
  for (const wp of waypoints) {
    if (progress >= wp.atProgress) current = wp
  }
  const sincePoint = progress - current.atProgress
  const clickWindow = (250 / SCENE_DURATION) * 100
  const clicking = !!current.click && sincePoint >= 0 && sincePoint <= clickWindow

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: current.x,
        top: current.y,
        width: 14,
        height: 14,
        transition: 'left 0.5s ease-in-out, top 0.5s ease-in-out',
      }}
    >
      <div
        className={clicking ? 'animate-cursor-click' : ''}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#ffffff',
          border: `2px solid ${tx1}`,
          boxShadow: '0 2px 6px rgba(15,23,42,0.25)',
        }}
      />
    </div>
  )
}

function DeltaBadge({ trend }: { trend: number }) {
  const positive = trend >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
      style={{
        background: positive ? '#ecfdf5' : '#fef2f2',
        color: positive ? '#059669' : '#dc2626',
      }}
    >
      {positive ? '▲' : '▼'} {positive ? '+' : ''}{trend}%
    </span>
  )
}

function DonutChart({ value, label, color, reduced }: { value: number; label: string; color: string; reduced: boolean }) {
  const display = useCountUp(value, reduced)
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (display / 100) * c

  return (
    <div className="flex items-center gap-2.5">
      <svg width={60} height={60} viewBox="0 0 64 64" className="-rotate-90 flex-shrink-0">
        <circle cx={32} cy={32} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
        <circle
          cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        />
      </svg>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: tx1, lineHeight: 1 }}>%{display}</div>
        <div style={{ fontSize: 10, color: tx2, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, prefix, suffix, color, trend, reduced }: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  color: string
  trend: number
  reduced: boolean
}) {
  const display = useCountUp(value, reduced)
  return (
    <div className="flex flex-col justify-between p-2.5 rounded-xl" style={cardStyle}>
      <div className="flex items-center justify-between gap-1">
        <div style={{ fontSize: 10, color: tx2, fontWeight: 600 }}>{label}</div>
        <DeltaBadge trend={trend} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>
        {prefix}{display.toLocaleString('tr-TR')}{suffix}
      </div>
    </div>
  )
}

function ScrapeScene() {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={cardStyle}>
        <Search size={12} style={{ color: tx3 }} className="flex-shrink-0" />
        <span style={{ fontSize: 11, color: tx1, fontWeight: 500 }} className="animate-typing">
          İstanbul · Tekstil firmaları ara...
        </span>
        <span
          className="animate-caret-blink flex-shrink-0"
          style={{ width: 2, height: 12, background: '#2563eb', borderRadius: 1 }}
        />
      </div>

      {/* Map + lead list */}
      <div className="grid gap-2 flex-1 min-h-0" style={{ gridTemplateColumns: '120px 1fr' }}>
        {/* Map panel */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: surf,
            border: '1px solid #e2e8f0',
            backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        >
          {MAP_PINS.map((pos, i) => (
            <div
              key={i}
              className="absolute animate-drop-pin"
              style={{ ...pos, animationDelay: `${0.3 + i * 0.35}s` }}
            >
              <MapPin size={14} style={{ color: '#2563eb', fill: '#dbeafe' }} />
            </div>
          ))}
        </div>

        {/* Lead list */}
        <div className="rounded-xl p-2.5 flex flex-col gap-1.5 justify-center" style={cardStyle}>
          {LEADS.map((lead, i) => (
            <div
              key={lead.name}
              className="flex items-center justify-between animate-scene-in"
              style={{ animationDelay: `${0.4 + i * 0.3}s` }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: '#dbeafe', color: '#2563eb' }}
                >
                  {lead.name[0]}
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: 11, fontWeight: 600, color: tx1 }} className="leading-tight truncate">{lead.name}</div>
                  <div style={{ fontSize: 9, color: tx3 }}>{lead.sector}</div>
                </div>
              </div>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{ background: '#eff6ff', color: '#2563eb' }}
              >
                Skor {lead.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2" style={{ color: tx2, fontSize: 11, fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" style={{ color: '#2563eb' }} />
        4/4 lead bulundu
      </div>
    </div>
  )
}

function CampaignScene() {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Channel selector */}
      <div className="flex items-center gap-2">
        {CHANNELS.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 animate-channel-active"
            style={{ border: '1px solid #e2e8f0', animationDelay: `${i * 1.2}s` }}
          >
            <Icon size={13} style={{ color: tx2 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: tx1 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Lead rows with delivery status */}
      <div className="rounded-xl p-2.5 flex-1 min-h-0 flex flex-col gap-1.5 justify-center" style={cardStyle}>
        {LEADS.map((lead, i) => (
          <div key={lead.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: '#dbeafe', color: '#2563eb' }}
              >
                {lead.name[0]}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: tx1 }} className="truncate">{lead.name}</span>
            </div>
            <div className="relative h-4 flex-shrink-0" style={{ minWidth: 92 }}>
              <span
                className="absolute right-0 top-0 flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded-md animate-status-out"
                style={{ animationDelay: `${i * 0.4}s`, background: '#fffbeb', color: '#b45309', fontSize: 9, fontWeight: 700 }}
              >
                <Loader2 size={10} className="animate-spin" /> Gönderiliyor
              </span>
              <span
                className="absolute right-0 top-0 flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded-md animate-status-in"
                style={{ animationDelay: `${i * 0.4}s`, background: '#ecfdf5', color: '#059669', fontSize: 9, fontWeight: 700 }}
              >
                <CheckCircle2 size={10} /> Teslim Edildi
              </span>
            </div>
          </div>
        ))}

        {/* Call row */}
        <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center animate-ring-pulse flex-shrink-0"
              style={{ background: '#ecfdf5', color: '#059669' }}
            >
              <Phone size={11} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: tx1 }} className="truncate">Metro Yapı Ltd. — Sesli Arama</span>
          </div>
          <div className="relative h-4 flex-shrink-0" style={{ minWidth: 92 }}>
            <span
              className="absolute right-0 top-0 whitespace-nowrap px-1.5 py-0.5 rounded-md animate-status-out"
              style={{ background: '#ecfdf5', color: '#059669', fontSize: 9, fontWeight: 700 }}
            >
              Bağlanıyor...
            </span>
            <span
              className="absolute right-0 top-0 whitespace-nowrap px-1.5 py-0.5 rounded-md animate-status-in"
              style={{ background: '#ecfdf5', color: '#059669', fontSize: 9, fontWeight: 700 }}
            >
              Görüşme 00:42
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2" style={{ color: tx2, fontSize: 11, fontWeight: 600 }}>
        <CheckCircle2 size={12} style={{ color: '#059669' }} />
        4/4 mesaj gönderildi · 1 arama aktif
      </div>
    </div>
  )
}

function ResultsScene({ reduced }: { reduced: boolean }) {
  const totalLeads = useCountUp(2847, reduced)

  const max = Math.max(...CHART_DATA)
  const min = Math.min(...CHART_DATA)
  const range = max - min || 1
  const points = CHART_DATA.map((v, i) => ({
    x: (i / (CHART_DATA.length - 1)) * 100,
    y: 38 - ((v - min) / range) * 34,
  }))
  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
  const last = points[points.length - 1]

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col justify-between p-2.5 rounded-xl" style={cardStyle}>
          <div style={{ fontSize: 10, color: tx2, fontWeight: 600 }}>Toplam Lead</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{totalLeads.toLocaleString('tr-TR')}</div>
          <div className="flex items-end gap-0.5" style={{ height: 14 }}>
            {[3, 5, 4, 7, 5, 8, 6, 9].map((v, i) => (
              <div key={i} style={{ width: 3, height: `${v * 1.4}px`, background: '#3b82f6', borderRadius: 1, opacity: 0.4 + i / 16 }} />
            ))}
          </div>
        </div>
        {STAT_CARDS.map(card => (
          <StatCard key={card.label} {...card} reduced={reduced} />
        ))}
      </div>

      {/* Chart + donut + funnel */}
      <div className="flex-1 grid gap-2 min-h-0" style={{ gridTemplateColumns: '1fr 96px 96px' }}>
        {/* Line chart */}
        <div className="flex flex-col p-2.5 rounded-xl" style={cardStyle}>
          <div style={{ fontSize: 10, color: tx2, fontWeight: 600, marginBottom: 4 }}>Mesaj Trendi — Son 14 gün</div>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="flex-1 w-full">
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={reduced ? 0 : undefined}
              className={reduced ? '' : 'animate-draw-stroke'}
            />
            <circle cx={last.x} cy={last.y} r={2.5} fill="#3b82f6" />
          </svg>
        </div>

        {/* Donut */}
        <div className="flex items-center justify-center p-2 rounded-xl" style={cardStyle}>
          <DonutChart value={91} label="Yanıt Oranı" color="#10b981" reduced={reduced} />
        </div>

        {/* Funnel */}
        <div className="flex flex-col gap-1.5 justify-center p-2.5 rounded-xl" style={cardStyle}>
          {FUNNEL.map(stage => (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-0.5" style={{ fontSize: 9, color: tx2 }}>
                <span>{stage.label}</span><span>{stage.pct}%</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: '#e2e8f0' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${stage.pct}%`, background: stage.color, transition: reduced ? 'none' : 'width 1s ease-out' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent leads */}
      <div className="flex flex-col gap-1.5">
        {RECENT_LEADS.map(lead => (
          <div key={lead.name} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl" style={cardStyle}>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: '#dbeafe', color: '#2563eb' }}
              >
                {lead.name[0]}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx1 }} className="truncate">{lead.name}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div style={{ width: 50, height: 4, borderRadius: 2, background: '#e2e8f0' }}>
                <div style={{ width: `${lead.score}%`, height: '100%', borderRadius: 2, background: lead.color }} />
              </div>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: lead.bg, color: lead.color }}>{lead.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingHeroDemo() {
  const reduced = useReducedMotion()
  const [scene, setScene] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reduced) {
      setScene(2)
      setProgress(100)
      return
    }

    const timer = setInterval(() => {
      setProgress(p => {
        const next = p + (TICK / SCENE_DURATION) * 100
        if (next >= 100) {
          setScene(s => (s + 1) % SCENES.length)
          return 0
        }
        return next
      })
    }, TICK)

    return () => clearInterval(timer)
  }, [reduced])

  const toast = TOASTS[scene]
  const TopIcon = toast.top.icon
  const BottomIcon = toast.bottom.icon

  return (
    <div className="relative w-full max-w-[600px] mx-auto animate-float">
      {/* Glow effect behind mockup */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-3xl"
        style={{ background: 'radial-gradient(circle at 50% 50%, #3b82f6, #7c3aed)' }}
      />

      {/* Window frame */}
      <div className="rounded-2xl overflow-hidden shadow-2xl">
        {/* Title bar */}
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: '#1e293b' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] text-center font-medium" style={{ color: '#94a3b8' }}>app.leadflow.ai/dashboard</p>
            </div>
          </div>
        </div>

        {/* Dashboard body */}
        <div className="flex" style={{ height: 400 }}>
          {/* Sidebar */}
          <div
            className="flex-shrink-0 flex flex-col items-center py-4 gap-2"
            style={{ width: 54, background: '#ffffff', borderRight: '1px solid #e2e8f0' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
              <Zap size={14} className="text-white fill-white" />
            </div>
            {SIDEBAR_ICONS.map((Icon, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: i === 0 ? '#eff6ff' : 'transparent', color: i === 0 ? '#2563eb' : '#94a3b8' }}
              >
                <Icon size={15} />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="relative flex-1 p-4 overflow-hidden flex flex-col gap-2" style={{ background: surf }}>
            {/* Story progress bar */}
            <div className="flex gap-1.5">
              {SCENES.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                      width: i < scene ? '100%' : i === scene ? `${progress}%` : '0%',
                      transition: i === scene ? 'none' : 'width .3s ease',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Scene header */}
            <div className="flex items-center justify-between">
              <div style={{ fontSize: 13, fontWeight: 700, color: tx1 }}>{SCENE_TITLES[scene]}</div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: '#ecfdf5' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>Canlı</span>
              </div>
            </div>

            {/* Scene content */}
            <div key={scene} className="flex-1 min-h-0 animate-scene-in">
              {scene === 0 && <ScrapeScene />}
              {scene === 1 && <CampaignScene />}
              {scene === 2 && <ResultsScene reduced={reduced} />}
            </div>

            {!reduced && <HeroCursor waypoints={CURSOR_WAYPOINTS[scene]} progress={progress} />}
          </div>
        </div>
      </div>

      {/* Floating notification — top right */}
      <div className="absolute -top-4 -right-4 lg:-right-8 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2.5 border border-slate-100 animate-float-delayed z-10 overflow-hidden">
        <div key={`top-${scene}`} className="flex items-center gap-2.5 animate-toast-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <TopIcon size={14} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 whitespace-nowrap">{toast.top.title}</p>
            <p className="text-[9px] text-slate-400 whitespace-nowrap">{toast.top.sub}</p>
          </div>
        </div>
      </div>

      {/* Floating stat — bottom left */}
      <div className="absolute -bottom-4 -left-4 lg:-left-6 bg-white rounded-2xl shadow-xl p-3 border border-slate-100 z-10 overflow-hidden">
        <div key={`bottom-${scene}`} className="flex items-center gap-2 animate-toast-in">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <BottomIcon size={14} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 whitespace-nowrap">{toast.bottom.title}</p>
            <p className="text-[9px] text-slate-400 whitespace-nowrap">{toast.bottom.sub}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/landing/LandingHeroDemo.tsx
git commit -m "feat: hero demo'yu gercek dashboard acik temasina ve simule cursor'a tasi"
```

---

## Task 3: Verify, screenshot-check, cleanup, deploy

**Files:**
- Verify only: `apps/web/components/landing/LandingHero.tsx` (no edits expected)

- [ ] **Step 1: Type-check the whole web app**

Run: `cd apps/web && npx tsc --noEmit`
Expected: zero errors (confirms Task 1 + Task 2 together).

- [ ] **Step 2: Desktop screenshot pass (1440x900)**

Using the Playwright MCP tools:
1. `browser_navigate` to `http://localhost:3000/`
2. `browser_resize` to width 1440, height 900
3. `browser_take_screenshot` (save as `hero-desktop-scene-a.png`) — capture
   whichever scene is currently showing
4. Wait ~5 seconds (`browser_wait_for` with `time: 5`), then
   `browser_take_screenshot` (save as `hero-desktop-scene-b.png`) — confirm the
   scene has advanced and the cursor has moved
5. Wait ~5 more seconds, `browser_take_screenshot` (save as
   `hero-desktop-scene-c.png`) — confirm a third distinct scene
6. Visually confirm: light panel (`#f8fafc` content area, white sidebar with
   one active blue item, dark `#1e293b` title bar), story-progress bar filling,
   small circular cursor visible and in a different position across the three
   screenshots, donut chart + delta badges + count-up numbers visible when the
   Results scene is shown.

- [ ] **Step 3: Mobile screenshot pass (375x800)**

1. `browser_resize` to width 375, height 800
2. `browser_take_screenshot` (save as `hero-mobile.png`)
3. Confirm the panel remains legible and the floating toast cards don't overflow
   the viewport.

- [ ] **Step 4: Reduced-motion emulation**

1. Use `browser_run_code_unsafe` to run:
   ```js
   await page.emulateMedia({ reducedMotion: 'reduce' })
   await page.reload()
   ```
2. `browser_take_screenshot` (save as `hero-reduced-motion.png`)
3. Confirm: Results scene is shown (story bar full, no scene-cycling), no
   cursor visible, stat numbers/donut/funnel render at final values
   immediately (2.847, %91, full-width funnel bars), chart line fully drawn.

- [ ] **Step 5: Console error check**

Run `browser_console_messages` and confirm no new errors beyond the known
`/icons/icon-144x144.png` 404.

- [ ] **Step 6: Clean up screenshots**

Run:
```bash
cd /c/leadflow-ai && git status --porcelain
```
If any `.playwright-mcp/` files or stray screenshot files were created in the
repo, remove them:
```bash
rm -rf .playwright-mcp
```
(Screenshots saved outside the repo working tree need no cleanup.)

- [ ] **Step 7: Commit and push**

```bash
cd /c/leadflow-ai && git status
git push origin master
```

(Tasks 1 and 2 already created their commits; this step only pushes — per the
standing "deploy et her zaman" instruction. If `git status` shows anything
unexpected/uncommitted at this point, stop and investigate before pushing.)
