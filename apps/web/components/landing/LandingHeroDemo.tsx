'use client'
import { useEffect, useState } from 'react'
import {
  Zap, TrendingUp, Users, Search, MapPin, MessageCircle, Mail, Phone,
  CheckCircle2, Loader2,
} from 'lucide-react'

const SCENES = ['scrape', 'campaign', 'results'] as const
const SCENE_TITLES = ['Lead Taranıyor', 'Kampanya Gönderiliyor', 'Sonuçlar Güncelleniyor']
const SCENE_DURATION = 4500
const TICK = 60

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

function ScrapeScene() {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Search size={11} className="text-white/30 flex-shrink-0" />
        <span className="text-white/50 text-[10px] font-medium animate-typing">
          İstanbul · Tekstil firmaları ara...
        </span>
        <span
          className="animate-caret-blink flex-shrink-0"
          style={{ width: 2, height: 10, background: '#3b82f6', borderRadius: 1 }}
        />
      </div>

      {/* Map + lead list */}
      <div className="grid gap-2 flex-1 min-h-0" style={{ gridTemplateColumns: '120px 1fr' }}>
        {/* Map panel */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        >
          {MAP_PINS.map((pos, i) => (
            <div
              key={i}
              className="absolute animate-drop-pin"
              style={{ ...pos, animationDelay: `${0.3 + i * 0.35}s` }}
            >
              <MapPin size={14} className="text-blue-400 fill-blue-400/30" />
            </div>
          ))}
        </div>

        {/* Lead list */}
        <div
          className="rounded-xl p-2.5 flex flex-col gap-1.5 justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {LEADS.map((lead, i) => (
            <div
              key={lead.name}
              className="flex items-center justify-between animate-scene-in"
              style={{ animationDelay: `${0.4 + i * 0.3}s` }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-lg flex items-center justify-center text-[7px] font-bold text-blue-300 flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.15)' }}
                >
                  {lead.name[0]}
                </div>
                <div>
                  <div className="text-white/60 text-[9px] font-medium leading-tight">{lead.name}</div>
                  <div className="text-white/25 text-[7px]">{lead.sector}</div>
                </div>
              </div>
              <span
                className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold text-emerald-400 flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.12)' }}
              >
                Skor {lead.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-white/30 text-[8px] font-semibold">
        <Loader2 size={10} className="animate-spin text-blue-400" />
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
            style={{ border: '1px solid rgba(255,255,255,0.08)', animationDelay: `${i * 1.2}s` }}
          >
            <Icon size={11} className="text-white/50" />
            <span className="text-white/40 text-[9px] font-semibold">{label}</span>
          </div>
        ))}
      </div>

      {/* Lead rows with delivery status */}
      <div
        className="rounded-xl p-2.5 flex-1 min-h-0 flex flex-col gap-1.5 justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {LEADS.map((lead, i) => (
          <div key={lead.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-lg flex items-center justify-center text-[7px] font-bold text-blue-300 flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.15)' }}
              >
                {lead.name[0]}
              </div>
              <span className="text-white/50 text-[9px] font-medium">{lead.name}</span>
            </div>
            <div className="relative h-3" style={{ minWidth: 78 }}>
              <span
                className="absolute right-0 top-0 flex items-center gap-1 text-[8px] font-semibold text-amber-400 animate-status-out whitespace-nowrap"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <Loader2 size={9} className="animate-spin" /> Gönderiliyor
              </span>
              <span
                className="absolute right-0 top-0 flex items-center gap-1 text-[8px] font-semibold text-emerald-400 animate-status-in whitespace-nowrap"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <CheckCircle2 size={9} /> Teslim Edildi
              </span>
            </div>
          </div>
        ))}

        {/* Call row */}
        <div
          className="flex items-center justify-between mt-0.5 pt-1.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-lg flex items-center justify-center animate-ring-pulse flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <Phone size={9} className="text-emerald-400" />
            </div>
            <span className="text-white/50 text-[9px] font-medium">Metro Yapı Ltd. — Sesli Arama</span>
          </div>
          <div className="relative h-3" style={{ minWidth: 78 }}>
            <span className="absolute right-0 top-0 text-[8px] font-semibold text-blue-400 animate-status-out whitespace-nowrap">
              Bağlanıyor...
            </span>
            <span className="absolute right-0 top-0 text-[8px] font-semibold text-emerald-400 animate-status-in whitespace-nowrap">
              Görüşme 00:42
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-white/30 text-[8px] font-semibold">
        <CheckCircle2 size={10} className="text-emerald-400" />
        4/4 mesaj gönderildi · 1 arama aktif
      </div>
    </div>
  )
}

function ResultsScene() {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { v: '2,847', l: 'Lead', c: '#3b82f6' },
          { v: '₺874K', l: 'Pipeline', c: '#10b981' },
          { v: '%87', l: 'Dönüşüm', c: '#8b5cf6' },
          { v: '4,203', l: 'Kredi', c: '#f59e0b' },
        ].map(s => (
          <div key={s.l} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[11px] font-extrabold" style={{ color: s.c }}>{s.v}</div>
            <div className="text-white/25 text-[8px] mt-0.5">{s.l}</div>
            <div className="mt-1.5 flex items-end gap-px h-5">
              {[3,5,4,7,5,8,6,9].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 8}%`, background: `${s.c}50` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Funnel */}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 100px' }}>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white/30 text-[8px] mb-2 font-semibold">Mesaj Trendi — Son 14 gün</div>
          <div className="flex items-end gap-0.5 h-10">
            {[3,5,4,6,5,8,7,9,8,11,9,12,11,14].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h * 6}%`,
                  background: i >= 12 ? 'rgba(59,130,246,0.9)' : i >= 10 ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.25)',
                }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white/30 text-[8px] mb-2 font-semibold">Pipeline</div>
          {[
            { l: 'Yeni', p: 100, c: '#3b82f6' },
            { l: 'İletişim', p: 72, c: '#8b5cf6' },
            { l: 'Teklif', p: 48, c: '#f59e0b' },
            { l: 'Kapandı', p: 28, c: '#10b981' },
          ].map(s => (
            <div key={s.l} className="mb-1">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-white/25 text-[7px]">{s.l}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.p}%`, background: s.c }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead list */}
      <div className="rounded-xl p-3 flex-1 min-h-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white/30 text-[8px] mb-2 font-semibold">Son Leadler</div>
        <div className="flex flex-col gap-1">
          {[
            { n: 'Türk Tekstil A.Ş.', s: 'Kazanıldı', c: '#10b981', sc: 95 },
            { n: 'Metro Yapı Ltd.', s: 'Aktif', c: '#3b82f6', sc: 78 },
            { n: 'Digital GmbH', s: 'İletişim', c: '#f59e0b', sc: 62 },
          ].map(lead => (
            <div key={lead.n} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-lg flex items-center justify-center text-[7px] font-bold text-blue-300" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  {lead.n[0]}
                </div>
                <span className="text-white/50 text-[8px]">{lead.n}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-8 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${lead.sc}%`, background: lead.c }} />
                </div>
                <span className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${lead.c}20`, color: lead.c }}>{lead.s}</span>
              </div>
            </div>
          ))}
        </div>
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
      {/* Browser chrome */}
      <div className="bg-slate-200 rounded-t-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 bg-slate-100 rounded-lg py-1.5 px-3">
          <p className="text-slate-400 text-[11px] text-center font-medium">app.leadflow.ai/dashboard</p>
        </div>
      </div>

      {/* Dashboard UI */}
      <div className="rounded-b-2xl overflow-hidden shadow-2xl" style={{ background: '#060a14', height: 400 }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div
            className="flex-shrink-0 flex flex-col items-center py-4 gap-3"
            style={{ width: 54, background: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Zap size={14} className="text-white fill-white" />
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20 mt-2" />
            {[0,1,2,3,4,5,6,7].map(i => (
              <div
                key={i}
                className={`w-7 h-1.5 rounded-full transition-colors ${i === 0 ? 'bg-blue-500' : 'bg-white/10'}`}
                style={{ width: i === 0 ? 28 : 20 }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-2">
            {/* Story progress bar */}
            <div className="flex gap-1">
              {SCENES.map((s, i) => (
                <div key={s} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                      width: i < scene ? '100%' : i === scene ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Scene header */}
            <div className="flex items-center justify-between">
              <div className="text-white text-[12px] font-bold">{SCENE_TITLES[scene]}</div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                <span className="text-emerald-400 text-[8px] font-semibold">Canlı</span>
              </div>
            </div>

            {/* Scene content */}
            <div key={scene} className="flex-1 min-h-0 animate-scene-in">
              {scene === 0 && <ScrapeScene />}
              {scene === 1 && <CampaignScene />}
              {scene === 2 && <ResultsScene />}
            </div>
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

      {/* Glow effect behind mockup */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-3xl"
        style={{ background: 'radial-gradient(circle at 50% 50%, #3b82f6, #7c3aed)' }}
      />
    </div>
  )
}
