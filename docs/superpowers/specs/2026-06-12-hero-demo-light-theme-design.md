# Hero Demo Redesign — Light-Theme "Living Product" Animation

**Goal:** Rebuild `LandingHeroDemo.tsx` so the autoplay hero animation feels like a real
screen recording of the actual product (Dribbble/Phenomenon-style "real video" feel),
without using actual video assets. Switch the mockup from its current dark theme
(`#060a14`) to the real dashboard's light theme, add a simulated cursor that "drives"
each scene, replace one-shot fade-ins with continuous micro-motion, and adopt three
polish patterns from a reference SaaS dashboard mockup (delta badges, donut/gauge
chart, colored status chips).

---

## Context / Research

- User asked for the hero animation to look like a "real autoplay video," referencing
  `https://dribbble.com/` and `https://phenomenonstudio.com/` (+ `/contact-us/`).
- Both reference sites use a single real `<video autoplay loop muted>` inside a
  rounded media frame in the hero — not CSS/React animation. Phenomenon's contact-us
  page also shows a polished SaaS dashboard mockup ("Influmo") with: per-card
  delta badges (▲/▼ %), a donut/gauge "88% Success" chart, and two status tables
  with colored chips (amber/gray/green).
- `ffmpeg` is **not installed** on this machine, ruling out a real-video-recording
  pipeline (Approaches A/C from the discussion) without extra tooling setup.
- The real dashboard (`apps/web/app/(dashboard)/dashboard/page.tsx`) is **light
  themed**: white cards (`#ffffff`, `1px solid #e2e8f0`, `border-radius:12px`,
  `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`), text tokens `#0f172a` / `#64748b` /
  `#94a3b8` / `#cbd5e1`, accent colors blue `#3b82f6`/`#2563eb`, violet
  `#8b5cf6`/`#7c3aed`, emerald `#10b981`/`#059669`, amber `#f59e0b`/`#b45309`.
  The current hero mockup is dark and does **not** match this — a secondary
  authenticity gap this redesign also fixes.
- **Decision: Approach B** — rebuild the demo in CSS/React using the real light
  theme, add a simulated cursor + continuous motion, and fold in the three
  Phenomenon polish patterns. No new assets, no extra tooling, fully responsive,
  easy to keep in sync with the real product.

---

## 1. Frame & Theme

Keep the existing outer structure from Part 2 (`animate-float` wrapper, background
glow, `animate-float-delayed` toast cards) — only the **inner panel** changes:

- **Title bar** (top ~36px strip): stays dark (`#1e293b`/`#0f172a`) with the
  3 traffic-light dots + `app.leadflow.ai/dashboard` url pill. This keeps a
  defined "window frame" against the white page background (mirrors how real
  screenshots of light apps are usually framed).
- **Sidebar** (54px): switches from dark to light — `#ffffff` background,
  `1px solid #e2e8f0` right border, nav icons in `#94a3b8`, active item gets
  `#eff6ff` bg + `#2563eb` icon.
- **Content area**: switches from `#060a14` to `#f8fafc` background. Cards
  inside use the exact `card` style from the real dashboard (`#ffffff`,
  `1px solid #e2e8f0`, `border-radius:12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`).
- **Text tokens**: `tx1 #0f172a`, `tx2 #64748b`, `tx3 #94a3b8`, `tx4 #cbd5e1`
  (copied from the real dashboard's local constants).
- **Toast cards** (floating, outside the frame): restyle to light — white bg,
  `#e2e8f0` border, colored icon chip — content per scene unchanged from the
  Part 2 plan (scrape/campaign/results variants).

---

## 2. Simulated Cursor

New `HeroCursor` sub-component: a small circle (~14px, white fill, `#0f172a`
ring, soft drop-shadow) absolutely positioned inside the content area.

- Each scene defines a small array of waypoints:
  `{ atProgress: number /* 0-100 */, x: number, y: number, click?: boolean }`.
- On every tick, find the current waypoint for `progress` and set
  `left`/`top` via inline style; CSS `transition: left .5s ease, top .5s ease`
  produces smooth movement between points.
- `click: true` waypoints add a `.cursor-click` class for ~250ms, triggering a
  new `cursor-click` keyframe (ring scale-down + opacity pulse).
- Cursor movement is **synced** with existing per-scene animations — e.g. in
  the scrape scene the cursor reaches each map pin right as that pin's
  `drop-pin` animation fires; in the campaign scene it clicks each channel
  icon right as that channel gets the "active" treatment.
- Hidden entirely when `useReducedMotion()` is true.

---

## 3. Scene-by-Scene Redesign

Scene state machine (`SCENES`, `SCENE_DURATION=4500`, `TICK=60`, story-progress
bar, `useReducedMotion`) is unchanged from Part 2 — only the **content/visuals**
of each scene change.

### Scene 1 — Scrape (lead taranıyor)
- Search bar with typewriter effect (existing `animate-typing`/`animate-caret-blink`),
  now on a light input (`#ffffff` bg, `#e2e8f0` border).
- Map panel restyled light (`#f8fafc` bg, light grid lines); 4 pins drop in with
  `animate-drop-pin`, each timed to a cursor "click" waypoint.
- 4 lead rows (same names as Part 2: Türk Tekstil A.Ş., Metro Yapı Ltd., Digital
  GmbH, SaaS Startup TR) on light cards, AI-score shown as a small blue pill
  (`#eff6ff` bg, `#2563eb` text).
- Footer status: "4/4 lead bulundu" with spinner → check.

### Scene 2 — Campaign (mesaj & arama kampanyası)
- Channel selector row (WhatsApp / Email / Phone icons). Cursor clicks each
  in sequence; active channel gets a light tinted background (emerald/blue/violet
  at ~10% opacity) replacing the dark `channel-active` keyframe's colors.
- Each lead row's status chip cycles **queued** (gray `#f1f5f9`/`#64748b`) →
  **sending** (amber `#fffbeb`/`#b45309`, spinner) → **delivered** (emerald
  `#ecfdf5`/`#059669`, check) via the existing `status-out`/`status-in`
  keyframes, recolored.
- One row (Metro Yapı Ltd.) additionally shows a `Phone` icon with
  `animate-ring-pulse` recolored to emerald-on-light, text "Bağlanıyor..." →
  "Görüşme 00:42".
- Footer status: "4/4 mesaj gönderildi · 1 arama aktif".

### Scene 3 — Results (sonuçlar) — also the reduced-motion static state
- Stat row: hero card (Toplam Lead, animated count-up + sparkline) + 3
  secondary cards. **Each secondary card now gets a `DeltaBadge`** (small
  pill `▲ +N%`/`▼ -N%`, green/red) — Phenomenon polish #1.
- **New `DonutChart` component**: circular `stroke-dasharray` progress ring
  (e.g. "%87 Yanıt Oranı"), placed beside the area chart — Phenomenon polish #2.
- Area chart: line draws in via `stroke-dashoffset` animation on scene entry.
- Funnel bars: width transitions from 0 → target on scene entry.
- Recent-leads list (3 rows, trimmed from Part 2's mockup to fit 400px):
  light cards with **colored status chips** (active=emerald, paused=amber,
  completed=blue, draft=gray) — Phenomenon polish #3.
- All numeric values (stat counts, donut %, chart) animate from 0 → target via
  a small `useCountUp(target, active)` hook driven by `progress` when the
  scene becomes active.

---

## 4. New / Modified Sub-components in `LandingHeroDemo.tsx`

- `HeroCursor` — cursor dot + click-pulse, per-scene waypoints (described above).
- `DonutChart` — small SVG ring component, props `{ value: number; label: string;
  color: string }`, animates `stroke-dashoffset` from full to `value`%.
- `DeltaBadge` — small pill `{ trend: number }` → `▲ +N%` (emerald) or
  `▼ -N%` (rose).
- `useCountUp(target, active, duration)` — returns interpolated integer for
  animated stat numbers; when `active` is false or reduced-motion is true,
  returns `target` immediately.

---

## 5. `globals.css` Changes

- New `@keyframes cursor-click` (ring scale-down + opacity pulse, ~250ms).
- New `@keyframes donut-fill` / chart draw-in via `stroke-dashoffset`
  (can reuse a single generic `@keyframes draw-stroke { from { stroke-dashoffset: <full> } to { stroke-dashoffset: <value> } }`
  applied with inline custom properties per chart).
- Existing Part 2 keyframes (`scene-in`, `toast-in`, `drop-pin`, `typing`,
  `caret-blink`, `channel-active`, `status-out`, `status-in`, `ring-pulse`)
  are **kept as-is** (timing/structure unchanged); only the *colors* applied
  via inline styles/Tailwind classes change to light-theme tokens.
- New keyframes added to the existing `prefers-reduced-motion: reduce` block
  alongside the Part 2 entries.

---

## 6. Reduced Motion Behavior

Unchanged mechanism (`useReducedMotion()` via `matchMedia`). When true:
- Scene fixed at `results` (no scene-cycling, no story-bar animation).
- `HeroCursor` not rendered.
- `useCountUp` returns final values immediately (no count-up).
- Donut ring, area chart, and funnel bars render at final state (no draw-in).

---

## 7. Files Affected

- `apps/web/components/landing/LandingHeroDemo.tsx` — major rewrite (light
  theme tokens, `HeroCursor`, `DonutChart`, `DeltaBadge`, `useCountUp`,
  restyled scenes/toasts, cursor choreography per scene).
- `apps/web/app/globals.css` — add `cursor-click` and `draw-stroke` keyframes
  + reduced-motion entries; recolor where needed (most Part 2 keyframes are
  structure-only and don't need changes).
- `apps/web/components/landing/LandingHero.tsx` — verify outer glow/background
  colors still read well against the new light inner panel; adjust only if
  needed (likely minimal — the panel already sits on a white page).

---

## 8. Verification Plan

- `cd apps/web && npx tsc --noEmit` — zero errors.
- Playwright at 1440×900 and 375×800:
  - Observe a full ~13.5s cycle (3 × 4.5s): scrape → campaign → results,
    confirm light theme throughout, cursor visible and moving/clicking in
    scrape & campaign scenes, donut chart + delta badges + count-up visible
    in results scene.
  - `prefers-reduced-motion: reduce` emulation: scene stays on results,
    no cursor, numbers/chart/donut render at final values immediately, no
    animation classes active.
  - No new console errors (besides the known `/icons/icon-144x144.png` 404).
- Clean up any screenshots / `.playwright-mcp/` artifacts before committing.
- Commit + push to `master` (per standing "deploy et her zaman" instruction).
