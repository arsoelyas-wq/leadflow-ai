# Landing Page Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/web/app/page.tsx` and its section components feel like a premium,
corporate B2B SaaS product showcase — more professional than Apollo — by tightening the
value proposition, moving social proof and trust signals close to the CTAs, softening
the "AI demo" tone, and reducing the page from 13 sections to 10 (8 substantive + 2
lightweight connector strips).

**Architecture:** No new pages, routes, or dependencies. All changes are content/structure
edits to existing `apps/web/components/landing/*.tsx` files plus `apps/web/app/page.tsx`
(composition) and `apps/web/components/landing/LandingNavbar.tsx` (nav links). Two files
are deleted outright (`LandingDemo.tsx`, `LandingUseCases.tsx`). One file's responsibility
grows slightly (`LandingLogoBar.tsx` absorbs a trimmed stats row, `LandingStats.tsx` is
deleted). All existing design tokens (`gradient-text-blue`, `btn-glow`, `card-hover`,
`dot-grid`, `animate-marquee`, `Reveal`) are reused as-is — no new CSS is required.

**Tech Stack:** Next.js App Router, React (client components where needed), Tailwind CSS,
lucide-react icons. Verification via `tsc --noEmit` and Playwright (desktop 1440×900 +
mobile 375×800 + `prefers-reduced-motion: reduce`).

---

## Design Rationale — how this satisfies the 5 principles

1. **Crystal-clear value proposition (Hero, Task 2):** Badge drops the "AI-first" framing
   and leads with category/audience ("B2B Satış Ekipleri İçin Otomasyon Platformu"). The
   subheadline is rewritten to state in one sentence: *what* it does (finds companies,
   sends personalized WhatsApp/email campaigns, shows results on one dashboard), *who*
   it's for (B2B teams), and *why it's better* (minutes instead of days, with the
   2,847+ proof number). The secondary hero CTA is repointed from a dead `#demo` anchor
   to `#nasil-calisir` so both hero CTAs lead somewhere real.

2. **Social proof near the CTA (Tasks 3 & 7):** The logo marquee gets a slim "scale"
   stat row (2,847+ firms / 87% conversion lift / 14 countries) directly under the hero —
   proof appears before the user has scrolled past the fold. Separately, the testimonials
   section is trimmed to 3 strong, sector-diverse stories, converted from a busy masonry
   grid to a calm 3-column grid, and moved to sit immediately before Pricing — the exact
   "decision moment" principle 2 calls out.

3. **Visible trust signals (Task 7):** A new row of compliance/security pills (KVKK,
   GDPR, "data stored in Europe/Frankfurt", 99.9% uptime SLA) is added to the
   proof-and-testimonials section — right before the pricing decision, not buried in the
   footer (footer compliance badges stay as a secondary reinforcement).

4. **Soften the AI vibe (Tasks 2 & 5):** The hero badge and the Features section header
   no longer lead with "Yapay Zeka" as the headline word — copy leads with outcomes
   ("otomasyon", "kişiselleştirilmiş mesajlaşma"). The already-polished light-theme hero
   demo is left untouched (it reads as "the product working", not "an AI gimmick").
   "AI Kişiselleştirme" is renamed to "Kişiselleştirilmiş Mesajlaşma" with copy that
   describes the *outcome* (natural-sounding, 1:1 messages) rather than the mechanism.

5. **Controlled visual rhythm — fewer, stronger sections (Tasks 1, 4, 5, 6, 8, 9):**
   - Removed entirely: `LandingDemo` (a non-functional "Video yükleniyor…" placeholder —
     actively undermines "premium") and `LandingUseCases` (5-tab persona switcher; its
     sector diversity is already carried by the testimonials' company/sector tags).
   - Merged: `LandingStats`'s 4 big cards collapse into a 3-stat inline row inside
     `LandingLogoBar`.
   - Rewritten: `LandingProblem`'s two 6-row comparison cards become one editorial
     4-row "before → after" list.
   - Trimmed: `LandingFeatures` 12 cards / 5 tabs → 6 cards, no tabs.
     `LandingIntegrations` 11 cards / 2 marquee rows / big header → 8 cards / 1 row /
     small label, repositioned as a lightweight connector strip.
     `LandingPricing` drops the "✗ not included" rows (cards get shorter as you go up,
     which itself communicates upgrade value).
     `LandingFAQ` 10 → 6 questions, reordered so compliance/data-residency questions
     come right after the trial question.
   - Net result: 13 sections → 10 (Hero, LogoBar-with-stats, Problem, Features,
     HowItWorks, Integrations, Testimonials/Proof, Pricing, FAQ, CTA), with 2 of those
     10 being intentionally lightweight (LogoBar, Integrations).

---

## Final Section Order (after all tasks)

1. `LandingHero` — value prop + demo (unchanged structurally)
2. `LandingLogoBar` — logos + 3 scale stats (merged)
3. `LandingProblem` — editorial before/after (rewritten)
4. `LandingFeatures` — 6 capability cards, no tabs (trimmed)
5. `LandingHowItWorks` — 3 steps (unchanged)
6. `LandingIntegrations` — single-row strip (trimmed)
7. `LandingTestimonials` — 3 testimonials + trust signals (trimmed, near pricing)
8. `LandingPricing` — 3 plans, cleaner feature lists (trimmed)
9. `LandingFAQ` — 6 questions (trimmed)
10. `LandingCTA` — closing CTA (unchanged)

---

### Task 1: Remove fake-demo and use-cases sections; restructure composition & nav

**Files:**
- Delete: `apps/web/components/landing/LandingDemo.tsx`
- Delete: `apps/web/components/landing/LandingUseCases.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/landing/LandingNavbar.tsx`

- [ ] **Step 1: Delete the two files**

Delete `apps/web/components/landing/LandingDemo.tsx` and
`apps/web/components/landing/LandingUseCases.tsx` entirely.

- [ ] **Step 2: Update `apps/web/app/page.tsx` composition**

This is a **targeted edit, not a full-file rewrite**. Do NOT touch the `Metadata` export
or the JSON-LD `<script>` block — they stay exactly as currently written. Only:
1. Remove the `LandingDemo` and `LandingUseCases` import lines.
2. Remove the `<LandingDemo />` and `<LandingUseCases />` lines (and their preceding
   section comments) from inside `<main>`.
3. Renumber the remaining section comments 1-11 (the final count drops to 10 once
   `LandingStats` is also removed in Task 3).

The full file should end up matching this structure (the lines marked
`// ...unchanged...` represent your existing `Metadata` export and JSON-LD script —
keep their real content, do not replace them with this comment):

```tsx
import type { Metadata } from 'next'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingHero from '@/components/landing/LandingHero'
import LandingLogoBar from '@/components/landing/LandingLogoBar'
import LandingStats from '@/components/landing/LandingStats'
import LandingProblem from '@/components/landing/LandingProblem'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingTestimonials from '@/components/landing/LandingTestimonials'
import LandingIntegrations from '@/components/landing/LandingIntegrations'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFAQ from '@/components/landing/LandingFAQ'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingFooter from '@/components/landing/LandingFooter'
import ChatWidget from '@/components/ChatWidget'

// ...unchanged... (keep your existing `export const metadata: Metadata = { ... }` here)

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* ...unchanged... (keep your existing JSON-LD <script type="application/ld+json"> here) */}

      <LandingNavbar />

      <main>
        {/* 1. Hero — değer önerisi, tek bakışta ne/kime/neden */}
        <LandingHero />

        {/* 2. Logo Bar — sosyal kanıt, hero'ya yakın */}
        <LandingLogoBar />

        {/* 3. Stats — büyüme rakamları (Task 3'te LogoBar'a taşınacak, sonra silinecek) */}
        <LandingStats />

        {/* 4. Problem → Solution — kısa, editoryal karşılaştırma */}
        <LandingProblem />

        {/* 5. Capabilities — küratörlü özellik seti */}
        <LandingFeatures />

        {/* 6. How It Works — 3 adım, net akış */}
        <LandingHowItWorks />

        {/* 7. Integrations — mevcut araçlarla uyum (hafif şerit) */}
        <LandingIntegrations />

        {/* 8. Proof & Trust — testimonial + güven sinyalleri, fiyatlandırmaya yakın */}
        <LandingTestimonials />

        {/* 9. Pricing — şeffaf, 3 plan */}
        <LandingPricing />

        {/* 10. FAQ — kalan tereddütleri kaldır */}
        <LandingFAQ />

        {/* 11. Final CTA — kapanış */}
        <LandingCTA />
      </main>

      <LandingFooter />
      <ChatWidget />
    </div>
  )
}
```

Note: `LandingStats` is still rendered here (position 3) — Task 3 removes it once its
content has been merged into `LandingLogoBar`. Leaving it in place for this task keeps
the page in a working, visually-complete state after this commit.

- [ ] **Step 3: Trim `LandingNavbar.tsx` nav links**

In `apps/web/components/landing/LandingNavbar.tsx:6-11`, remove the "Entegrasyonlar"
entry (the Integrations section becomes a lightweight strip, not a primary nav
destination):

```tsx
const NAV_LINKS = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'Fiyatlar', href: '#fiyatlar' },
]
```

- [ ] **Step 4: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/app/page.tsx apps/web/components/landing/LandingNavbar.tsx
git rm apps/web/components/landing/LandingDemo.tsx apps/web/components/landing/LandingUseCases.tsx
git commit -m "feat: landing sayfasinda sahte demo ve use-cases bolumlerini kaldir"
```

---

### Task 2: Hero — sharpen value proposition, soften AI framing

**Files:**
- Modify: `apps/web/components/landing/LandingHero.tsx`

- [ ] **Step 1: Update the badge (line 26-29)**

Replace the AI-first badge text with an outcome/category-first one:

```tsx
{/* Badge */}
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8">
  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
  <span className="text-blue-700 text-[13px] font-semibold">B2B Satış Ekipleri İçin Otomasyon Platformu</span>
</div>
```

- [ ] **Step 2: Rewrite the subheadline (line 38-42)**

Keep the H1 unchanged. Replace the subheadline paragraph so it states what/who/why in
one sentence:

```tsx
{/* Subheadline */}
<p className="text-[17px] lg:text-[18px] text-slate-500 leading-[1.7] mb-8 max-w-lg">
  LeadFlow AI, hedef sektörünüzdeki şirketleri otomatik bulur; WhatsApp ve e-postada
  kişiye özel kampanyalarla ulaşır, sonuçları tek panelden gösterir.{' '}
  <strong className="text-slate-700 font-semibold">2,847+ B2B ekibi</strong>, satış
  sürecini günler değil dakikalar içinde kurdu.
</p>
```

- [ ] **Step 3: Fix the secondary CTA (line 54-62) and update imports (line 3)**

The "Demo İzle" button currently points to `#demo`, which no longer exists after Task 1.
Repoint it to the "How It Works" section and drop the now-unused `Play` icon:

```tsx
import { ArrowRight, CheckCircle } from 'lucide-react'
```

```tsx
<a
  href="#nasil-calisir"
  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-semibold hover:bg-slate-200 transition-colors"
>
  Nasıl Çalışır?
  <ArrowRight size={16} />
</a>
```

- [ ] **Step 4: Add a compliance trust chip (line 66-77)**

Replace `'2,847+ aktif firma'` with a compliance signal — the 2,847+ number is now
covered by the LogoBar proof stats (Task 3), so this slot is freed up for principle 3
(trust signals near the CTA):

```tsx
{/* Trust indicators */}
<div className="flex flex-wrap items-center gap-4">
  {[
    'Kredi kartı gerekmez',
    'KVKK & GDPR uyumlu',
    'İstediğin an iptal',
  ].map(t => (
    <div key={t} className="flex items-center gap-1.5">
      <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
      <span className="text-[13px] text-slate-500 font-medium">{t}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingHero.tsx
git commit -m "feat: hero degeri onerisini netlestir, AI vurgusunu yumusat"
```

---

### Task 3: Merge growth stats into the social-proof bar, delete LandingStats

**Files:**
- Modify: `apps/web/components/landing/LandingLogoBar.tsx`
- Delete: `apps/web/components/landing/LandingStats.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'

const LOGOS = [
  'Türk Tekstil A.Ş.', 'Metro Yapı Ltd.', 'Digital GmbH',
  'SaaS Startup TR', 'E-Ticaret Pro', 'Fintexco Ltd.',
  'Pazarlama360', 'TechSoft A.Ş.', 'GlobalTrade TR',
  'Ankara Dijital', 'İstanbul SaaS', 'EuroAgency GmbH',
]

const PROOF_STATS = [
  { target: 2847, prefix: '', suffix: '+', label: 'Aktif Firma' },
  { target: 87, prefix: '%', suffix: '', label: 'Dönüşüm Artışı' },
  { target: 14, prefix: '', suffix: '', label: 'Ülkede Aktif' },
]

function Counter({ target, prefix = '', suffix = '', duration = 1500 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      const steps = Math.max(1, Math.round(duration / 16))
      const increment = target / steps
      let current = 0
      const tick = () => {
        current += increment
        if (current >= target) {
          setValue(target)
          return
        }
        setValue(Math.floor(current))
        requestAnimationFrame(tick)
      }
      tick()
      observer.disconnect()
    }, { threshold: 0.4 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span ref={ref}>
      {prefix}{value.toLocaleString('tr-TR')}{suffix}
    </span>
  )
}

function LogoItem({ name }: { name: string }) {
  const colors = [
    'text-blue-700 bg-blue-50 border-blue-100',
    'text-violet-700 bg-violet-50 border-violet-100',
    'text-emerald-700 bg-emerald-50 border-emerald-100',
    'text-slate-700 bg-slate-50 border-slate-200',
    'text-rose-700 bg-rose-50 border-rose-100',
    'text-amber-700 bg-amber-50 border-amber-100',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className={`flex-shrink-0 px-5 py-2.5 rounded-xl border text-[13px] font-semibold tracking-tight whitespace-nowrap ${colors[idx]}`}>
      {name}
    </div>
  )
}

export default function LandingLogoBar() {
  const doubled = [...LOGOS, ...LOGOS]

  return (
    <section className="py-14 border-y border-slate-100 bg-slate-50/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-x-10 sm:gap-x-16 gap-y-4 flex-wrap text-center mb-10">
          {PROOF_STATS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-x-10 sm:gap-x-16">
              <div>
                <div className="text-[28px] sm:text-[32px] font-black text-slate-900 leading-none">
                  <Counter target={s.target} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="text-[13px] text-slate-500 font-medium mt-1">{s.label}</div>
              </div>
              {i < PROOF_STATS.length - 1 && (
                <div className="hidden sm:block w-px h-10 bg-slate-200" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgb(248,250,252), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgb(248,250,252), transparent)' }} />

        {/* Marquee */}
        <div className="flex animate-marquee will-change-transform gap-3 w-max">
          {doubled.map((name, i) => (
            <LogoItem key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Delete `LandingStats.tsx` and remove it from `page.tsx`**

Delete `apps/web/components/landing/LandingStats.tsx`. In `apps/web/app/page.tsx`,
remove the `LandingStats` import and its `<main>` entry (previously section 3), and
renumber the remaining section comments 1-10:

```tsx
{/* 1. Hero — değer önerisi, tek bakışta ne/kime/neden */}
<LandingHero />

{/* 2. Logo Bar — sosyal kanıt + büyüme rakamları */}
<LandingLogoBar />

{/* 3. Problem → Solution — kısa, editoryal karşılaştırma */}
<LandingProblem />

{/* 4. Capabilities — küratörlü özellik seti */}
<LandingFeatures />

{/* 5. How It Works — 3 adım, net akış */}
<LandingHowItWorks />

{/* 6. Integrations — mevcut araçlarla uyum (hafif şerit) */}
<LandingIntegrations />

{/* 7. Proof & Trust — testimonial + güven sinyalleri, fiyatlandırmaya yakın */}
<LandingTestimonials />

{/* 8. Pricing — şeffaf, 3 plan */}
<LandingPricing />

{/* 9. FAQ — kalan tereddütleri kaldır */}
<LandingFAQ />

{/* 10. Final CTA — kapanış */}
<LandingCTA />
```

- [ ] **Step 3: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingLogoBar.tsx apps/web/app/page.tsx
git rm apps/web/components/landing/LandingStats.tsx
git commit -m "feat: buyume rakamlarini logo seridine tasi, ayri stats bolumunu kaldir"
```

---

### Task 4: Problem → Solution — replace two-card comparison with editorial block

**Files:**
- Modify: `apps/web/components/landing/LandingProblem.tsx`

- [ ] **Step 1: Replace imports (line 1-4)**

```tsx
'use client'
import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'
```

- [ ] **Step 2: Replace `PROBLEMS`/`SOLUTIONS` (line 6-22) with a single `COMPARISON` array**

```tsx
const COMPARISON = [
  {
    before: 'Günde saatlerce manuel lead araması',
    after: '7/24 otomatik, sürekli güncellenen lead akışı',
  },
  {
    before: 'Herkese giden, spam görünen şablon mesajlar',
    after: 'Her lead\'e özel, doğal görünen mesajlar',
  },
  {
    before: 'Excel\'de dağınık takip, kaçan fırsatlar',
    after: 'Tek ekranda canlı pipeline ve otomatik hatırlatma',
  },
  {
    before: 'Pahalı SDR ekibi veya ajans gideri',
    after: 'SDR maliyetinin onda biriyle aynı sonuç',
  },
]
```

- [ ] **Step 3: Replace the section body (line 24-109)**

```tsx
export default function LandingProblem() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[13px] font-semibold mb-6">
              Neden Değiştirmelisiniz?
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Manuel satış artık{' '}
              <span className="gradient-text-blue">rekabetçi değil</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Eski yöntem zaman ve fırsat kaybettiriyor. Fark, ilk haftadan görülüyor.
            </p>
          </div>
        </Reveal>

        {/* Comparison */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {COMPARISON.map((row, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-6 items-center px-6 sm:px-8 py-6">
                <p className="text-[15px] text-slate-400 line-through">{row.before}</p>
                <ArrowRight className="hidden sm:block text-slate-300 flex-shrink-0" size={18} />
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-emerald-600" strokeWidth={3} />
                  </div>
                  <p className="text-[15px] font-semibold text-slate-900">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
          >
            14 Gün Ücretsiz Başla
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingProblem.tsx
git commit -m "feat: problem bolumunu tek editoryal karsilastirma blogu olarak yeniden yaz"
```

---

### Task 5: Capabilities — trim feature grid from 12 to 6, remove tab filter

**Files:**
- Modify: `apps/web/components/landing/LandingFeatures.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
import {
  Target, Bot, MessageSquare, BarChart3,
  TrendingUp, ShieldCheck, Zap
} from 'lucide-react'
import Reveal from './Reveal'

const FEATURES = [
  {
    icon: Target,
    title: 'Akıllı Lead Toplama',
    desc: 'Google Maps, Instagram ve 50+ kaynaktan hedef sektöre göre günde yüzlerce firma otomatik tespit edilir.',
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp & Email Kampanyaları',
    desc: 'WhatsApp Business API, email ve LinkedIn\'den aynı anda kampanya yürütün. Tek platform, çoklu kanal.',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Bot,
    title: 'Kişiselleştirilmiş Mesajlaşma',
    desc: 'Her müşteriye özel, doğal görünen mesajlar. Şablon değil — gerçek bir teklif gibi okunur.',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    icon: BarChart3,
    title: 'Pipeline & CRM',
    desc: 'Tüm satış aşamalarını tek ekranda takip edin. Sıcak leadleri anında görün, fırsat kaçırmayın.',
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: TrendingUp,
    title: 'Gelişmiş Analitik',
    desc: 'Kampanya performansı, dönüşüm oranları ve ROI takibi. Hangi kanalın işe yaradığını net görün.',
    color: '#0891b2',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
  {
    icon: ShieldCheck,
    title: 'KVKK & GDPR Uyumlu',
    desc: 'Türk ve AB veri mevzuatına tam uyumlu altyapı. Veri güvenliği ve şeffaflık her adımda ön planda.',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
]

export default function LandingFeatures() {
  return (
    <section id="ozellikler" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-[13px] font-semibold mb-6">
              <Zap size={13} />
              Özellikler
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Satışın her adımı{' '}
              <span className="gradient-text-blue">otomatik</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Lead bulmaktan kapatmaya, tüm süreç tek platformda işler. Rakipleriniz
              manuel çalışırken siz büyüyün.
            </p>
          </div>
        </Reveal>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm card-hover group"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="text-[16px] font-bold text-slate-900 mb-2 leading-snug">{title}</h3>
              <p className="text-[14px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

Note: `'use client'` and `useState` are dropped — the component no longer has any
interactive state, so it can be a plain server component (`Reveal` remains its own
client component and works fine inside).

- [ ] **Step 2: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingFeatures.tsx
git commit -m "feat: ozellikler bolumunu 6 karta indir, tab filtresini kaldir"
```

---

### Task 6: Integrations — shrink to a single-row trust strip

**Files:**
- Modify: `apps/web/components/landing/LandingIntegrations.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
const INTEGRATIONS = [
  { name: 'Google Maps', color: '#4285F4' },
  { name: 'WhatsApp Business', color: '#25D366' },
  { name: 'Meta / Facebook', color: '#1877F2' },
  { name: 'Instagram', color: '#E4405F' },
  { name: 'LinkedIn', color: '#0A66C2' },
  { name: 'Gmail / Google', color: '#EA4335' },
  { name: 'HubSpot CRM', color: '#FF7A59' },
  { name: 'Zapier', color: '#FF4A00' },
] as const

function IntegrationCard({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap">
        {name}
      </span>
    </div>
  )
}

export default function LandingIntegrations() {
  return (
    <section id="entegrasyonlar" className="py-14 bg-white overflow-hidden border-t border-slate-100">
      <p className="text-center text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-8">
        Mevcut Araçlarınızla Entegre Çalışır
      </p>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="flex animate-marquee will-change-transform gap-3 w-max px-3">
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
            <IntegrationCard key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

This drops the `'use client'` directive (no longer needed — no `Reveal`/state), the
`Puzzle` icon, the badge/h2/p header block, the second marquee row, and the closing
"Zapier" paragraph (Zapier is now part of the single row). It also replaces the emoji
icons with small colored dots, which is more in line with a premium, controlled visual
system.

- [ ] **Step 2: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingIntegrations.tsx
git commit -m "feat: entegrasyonlar bolumunu tek satirlik hafif seride indir"
```

---

### Task 7: Proof & Trust — trim testimonials to 3, add compliance signal row

**Files:**
- Modify: `apps/web/components/landing/LandingTestimonials.tsx`

- [ ] **Step 1: Update imports (line 1-3)**

```tsx
'use client'
import { Star, Quote, ShieldCheck, Lock, Server, Activity } from 'lucide-react'
import Reveal from './Reveal'
```

- [ ] **Step 2: Trim `TESTIMONIALS` to 3 entries (line 5-84)**

Keep only Mehmet Arslan (Türk Tekstil A.Ş.), Sarah Mueller (Digital Solutions GmbH), and
Ahmet Kaya (SaaS Startup TR) — remove the Fatma Yılmaz, Burak Şahin, and Elif Demirtaş
entries:

```tsx
const TESTIMONIALS = [
  {
    name: 'Mehmet Arslan',
    role: 'CEO',
    company: 'Türk Tekstil A.Ş.',
    sector: 'Tekstil & Konfeksiyon',
    country: 'İstanbul',
    avatar: 'MA',
    color: '#2563eb',
    bg: 'bg-blue-100',
    quote: 'LeadFlow AI sayesinde aylık 3,000+ lead topluyoruz ve %40 dönüşüm sağladık. Satış ekibimizin verimliliği 3 kat arttı. Gerçekten oyun değiştirici.',
    result: '3,000+ lead/ay',
    stars: 5,
  },
  {
    name: 'Sarah Mueller',
    role: 'Managing Director',
    company: 'Digital Solutions GmbH',
    sector: 'Dijital Ajans',
    country: 'Berlin, Almanya',
    avatar: 'SM',
    color: '#7c3aed',
    bg: 'bg-violet-100',
    quote: 'The German market expansion was seamless with LeadFlow. We found decision-makers we never could have reached manually. Our pipeline grew 280% in 3 months.',
    result: '%280 pipeline artışı',
    stars: 5,
  },
  {
    name: 'Ahmet Kaya',
    role: 'Co-Founder',
    company: 'SaaS Startup TR',
    sector: 'B2B SaaS',
    country: 'Ankara',
    avatar: 'AK',
    color: '#059669',
    bg: 'bg-emerald-100',
    quote: 'İlk 2 haftada 50 demo aldık. Daha önce SDR tutmayı düşünüyorduk ama LeadFlow tamamen o ihtiyacı karşıladı. Maliyetimiz %80 düştü.',
    result: '50 demo / ilk 2 hafta',
    stars: 5,
  },
]
```

- [ ] **Step 3: Add `TRUST_SIGNALS` array (after `TESTIMONIALS`, before `Stars`)**

```tsx
const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: 'KVKK Uyumlu' },
  { icon: Lock, label: 'GDPR Uyumlu' },
  { icon: Server, label: 'Veriler Avrupa\'da (Frankfurt) saklanır' },
  { icon: Activity, label: '%99.9 Uptime SLA' },
] as const
```

- [ ] **Step 4: Insert the trust-signals row after the header (after line 115)**

Right after the closing `</Reveal>` of the header block and before the testimonial
grid, add:

```tsx
<Reveal>
  <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
    {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
      <div key={label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-[13px] font-semibold text-slate-700">
        <Icon size={14} className="text-emerald-600" />
        {label}
      </div>
    ))}
  </div>
</Reveal>
```

- [ ] **Step 5: Convert the masonry grid to a calm 3-column grid (line 117-161)**

Replace `columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5` with
`grid sm:grid-cols-2 lg:grid-cols-3 gap-6`, and drop `break-inside-avoid` from each card
(everything else inside each card stays the same):

```tsx
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {TESTIMONIALS.map((t) => (
    <div
      key={t.name}
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm card-hover"
    >
      {/* ...unchanged inner content (Quote icon, Stars, quote, result badge, author)... */}
    </div>
  ))}
</div>
```

- [ ] **Step 6: Trim the bottom trust strip to 2 items (line 163-185)**

The "2,847+ Aktif firma" and "14 Ülke" stats now live in `LandingLogoBar` (Task 3) —
remove those two entries and their dividers, keeping only the rating and
recommendation-rate stats:

```tsx
{/* Trust strip */}
<div className="mt-12 flex flex-wrap items-center justify-center gap-8">
  <div className="text-center">
    <div className="text-[28px] font-black text-slate-900">4.9 / 5</div>
    <div className="flex justify-center mb-1"><Stars count={5} /></div>
    <div className="text-[12px] text-slate-400">Ortalama puan</div>
  </div>
  <div className="w-px h-12 bg-slate-200 hidden sm:block" />
  <div className="text-center">
    <div className="text-[28px] font-black text-slate-900">%98</div>
    <div className="text-[12px] text-slate-400">Tavsiye oranı</div>
  </div>
</div>
```

- [ ] **Step 7: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingTestimonials.tsx
git commit -m "feat: testimonial bolumunu 3 hikayeye indir, guven sinyalleri ekle"
```

---

### Task 8: Pricing — remove "not included" rows for cleaner cards

**Files:**
- Modify: `apps/web/components/landing/LandingPricing.tsx`

- [ ] **Step 1: Update imports (line 4)**

Remove the now-unused `X` icon:

```tsx
import { CheckCircle, ArrowRight, Zap, TrendingUp, Crown } from 'lucide-react'
```

- [ ] **Step 2: Change each plan's `features` to a plain string array of only the included items**

In `PLANS` (line 9-91), replace each plan's `features: [{ text, included }]` array with
`features: string[]` containing only the previously `included: true` items, in the same
order:

```tsx
// Starter
features: [
  '500 kredi / ay',
  'WhatsApp kampanya',
  'Email kampanya',
  'Lead scraper (Google Maps)',
  'AI mesaj kişiselleştirme',
  'Pipeline yönetimi',
  'Temel analitik',
],

// Growth
features: [
  '2,000 kredi / ay',
  'WhatsApp kampanya',
  'Email & SMS kampanya',
  'Lead scraper (50+ kaynak)',
  'AI mesaj kişiselleştirme',
  'Pipeline + CRM',
  'Gelişmiş analitik & ROI',
  'Video outreach (AI avatar)',
  'API erişimi',
],

// Pro
features: [
  '10,000 kredi / ay',
  'WhatsApp kampanya',
  'Email, SMS & LinkedIn',
  'Lead scraper (sınırsız)',
  'AI + karar verici bulma',
  'Pipeline + Tam CRM',
  'Gelişmiş analitik & raporlama',
  'Video outreach (AI avatar)',
  'AI sesli arama',
  'Whitelabel',
  'API + Webhook erişimi',
],
```

- [ ] **Step 3: Simplify the features render (line 209-222)**

Replace the `included`-ternary render with a single CheckCircle row for every item:

```tsx
<div className="flex flex-col gap-2.5">
  {plan.features.map((f, i) => (
    <div key={i} className="flex items-center gap-2.5">
      <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
      <span className="text-[13px] text-slate-700">{f}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingPricing.tsx
git commit -m "feat: fiyatlandirma kartlarinda dahil olmayan satirlari kaldir"
```

---

### Task 9: FAQ — trim to 6 highest-trust questions

**Files:**
- Modify: `apps/web/components/landing/LandingFAQ.tsx`

- [ ] **Step 1: Replace `FAQS` (line 6-47) with 6 entries, reordered for trust**

Keep the trial, compliance, data-residency, spam, integration, and cancellation
questions (drop the lead-volume, channel-list, support-contact, and multi-user
questions — their content is covered elsewhere on the page):

```tsx
const FAQS = [
  {
    q: 'Deneme süresi için kredi kartı gerekiyor mu?',
    a: 'Hayır. 14 günlük ücretsiz deneme süresinde kredi kartı bilgisi istenmez. Süre sonunda isterseniz ücretli plana geçersiniz, istemezseniz hesabınız otomatik olarak ücretsiz katmana alınır.',
  },
  {
    q: 'KVKK ve GDPR\'a uyumlu mu?',
    a: 'Evet. LeadFlow Türk KVKK mevzuatı ve AB GDPR\'ına tam uyumlu olacak şekilde tasarlanmıştır. Kişisel veri işleme, silme ve ihraç talepleri platforma entegredir. Ayrıca veritabanınızı temizlemek için KVKK modülümüz mevcuttur.',
  },
  {
    q: 'Verilerim nerede saklanıyor?',
    a: 'Verileriniz Avrupa\'da (Frankfurt) konumlu Supabase sunucularında şifreli olarak saklanır. Yedekler günlük alınır, veri ihracı için CSV/Excel dışa aktarma mevcuttur.',
  },
  {
    q: 'WhatsApp mesajları spam olarak işaretlenir mi?',
    a: 'LeadFlow, resmi WhatsApp Business API (WABA) üzerinden çalışır. Meta onaylı kanallardan kişiselleştirilmiş mesajlar gönderildiğinde spam riski minimum düzeydedir. Ayrıca AI kişiselleştirmesi sayesinde mesajlar organik görünür.',
  },
  {
    q: 'Mevcut CRM sistemimle entegre olabilir mi?',
    a: 'Evet. HubSpot, Pipedrive ve Zapier entegrasyonları mevcuttur. API ve Webhook desteği ile özel sistemlere bağlantı kurabilirsiniz (Growth ve Pro planlarda).',
  },
  {
    q: 'İptal etmek ne kadar kolay?',
    a: 'Hesap ayarlarından tek tıkla iptal edebilirsiniz. İptal sonrası mevcut döneminiz tamamlanır, veri silinmez. Yeniden başlamak istediğinizde aynı hesabınıza devam edersiniz.',
  },
]
```

The rest of the file (header, accordion rendering, contact prompt) is unchanged.

- [ ] **Step 2: Verify and commit**

Run `cd apps/web && npx tsc --noEmit` — zero errors. Commit:

```bash
git add apps/web/components/landing/LandingFAQ.tsx
git commit -m "feat: SSS bolumunu en kritik 6 soruya indir"
```

---

### Task 10: Final verification — type-check, Playwright pass, push

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Start dev server and check desktop (1440×900)**

Navigate to `/` and confirm:
- Hero: new badge ("B2B Satış Ekipleri İçin Otomasyon Platformu"), new subheadline, and
  the "Nasıl Çalışır?" secondary button scrolls to the How It Works section (no dead
  `#demo` link). Trust chips read "Kredi kartı gerekmez / KVKK & GDPR uyumlu / İstediğin
  an iptal".
- LogoBar: the 3-stat row (2,847+ / %87 / 14) renders above the logo marquee, count-up
  animates once on scroll into view.
- Problem: single white card with 4 before/after rows (no two-column "Eski Yol / Yeni
  Yol" cards).
- Features ("Özellikler"): exactly 6 cards, no tab buttons above the grid.
- How It Works: unchanged 3-step layout.
- Integrations: single marquee row of 8 small pills with colored dots (no emojis, no
  big header).
- Testimonials/Proof: 3 cards in an even grid (not masonry), a row of 4 trust pills
  (KVKK / GDPR / Frankfurt / 99.9% uptime) above the grid, and a 2-item trust strip
  (4.9/5, %98) below it.
- Pricing: each plan card shows only checkmarked features (no greyed-out ✗ rows).
- FAQ: exactly 6 questions, first one open by default.
- Final CTA: unchanged dark closing section.
- No new console errors (the existing `/icons/icon-144x144.png` 404 is pre-existing and
  expected).

- [ ] **Step 3: Check mobile (375×800)**

Confirm the same sections stack correctly with no horizontal scroll, the Problem
comparison rows collapse to a single column with visible arrows hidden (per
`hidden sm:block`), and the Integrations/LogoBar marquees still scroll within their
fade masks.

- [ ] **Step 4: Check `prefers-reduced-motion: reduce`**

Emulate reduced motion and confirm: `Reveal`-wrapped sections render fully visible
immediately, the LogoBar `Counter` values render at their final numbers (no count-up
needed to "finish" — acceptable either way since `IntersectionObserver` fires once), and
no marquee/animation classes are mid-transition in a jarring way.

- [ ] **Step 5: Clean up and push**

Remove any screenshots or `.playwright-mcp/` artifacts created during verification.
Push the accumulated commits from Tasks 1-9 to `master`:

```bash
git push origin master
```
