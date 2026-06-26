'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import MetaOptimizer from './MetaOptimizer'
import AdsROI from './AdsROI'
import {
  RefreshCw, Users, CheckCircle, Link, Target, BarChart2,
  ArrowUpRight, X, ChevronRight, ChevronDown, Sparkles,
  AlertTriangle, Activity, Zap, TrendingUp, DollarSign, Download, Brain,
  Megaphone, Globe, ShoppingCart, Radio, Code2,
  Copy, Send, User, Phone, Eye, FileText, XCircle
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const GOALS = [
  { id: 'LEADS', label: 'Lead Toplama', desc: 'WhatsApp/form ile potansiyel müşteri topla', detail: 'Meta Lead Form veya Messenger ile müşteri adayı bilgilerini toplar. AI otomatik lead çekme + 5dk kuralı ile anında arama.', Icon: Users, color: '#2563eb', estimate: '₺15-40 / lead' },
  { id: 'AWARENESS', label: 'Marka Bilinirliği', desc: 'Binlerce kişiye markanı göster', detail: 'Hedef kitlenin feed ve hikayelerinde markanız görünür. Erişim ve frekans optimizasyonu yapılır.', Icon: Megaphone, color: '#7c3aed', estimate: '₺2-8 / 1000 gösterim' },
  { id: 'TRAFFIC', label: 'Web Trafiği', desc: 'Siteye veya kataloğa trafik çek', detail: 'Landing page, ürün sayfası veya online kataloğunuza tıklama optimizasyonu. Link tıklama bazlı faturalandırma.', Icon: Globe, color: '#059669', estimate: '₺1-5 / tıklama' },
  { id: 'SALES', label: 'Satış & Dönüşüm', desc: 'Doğrudan satış veya teklif oluştur', detail: 'Satın alma veya teklif formu doldurma hedefli. CAPI ile dönüşüm takibi + değer bazlı optimizasyon.', Icon: ShoppingCart, color: '#dc2626', estimate: '₺30-100 / dönüşüm' },
]

const AI_MSGS = [
  'Türk pazarını analiz ediyorum...',
  'Hedef kitle belirliyorum...',
  'Reklam metinleri yazıyorum...',
  'Bütçe optimizasyonu yapıyorum...',
  'Kampanya planı hazırlanıyor...',
]

interface AdResult {
  campaign: string; source: string; leads: number
  won: number; revenue: number; winRate: number; avgDeal: number
}

const EVENT_LABELS: Record<string, string> = {
  Lead: 'Yeni Lead', Contact: 'İletişim', InitiateCheckout: 'Teklif', Purchase: 'Satış', ViewContent: 'Görüntüleme',
}

function AlgorithmTrainingBanner({ platform, eventsToday, eventsTotal, lastAt, eventTypes }: {
  platform: 'meta' | 'google'
  eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[]
}) {
  const isMeta = platform === 'meta'
  const isActive = eventsTotal > 0

  function relativeTime(iso: string | null) {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Az önce'
    if (m < 60) return `${m} dk önce`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} saat önce`
    return `${Math.floor(h / 24)} gün önce`
  }

  const STEPS = isMeta
    ? ['Lead', 'Contact', 'InitiateCheckout', 'Purchase']
    : ['Lead', 'Contact', 'Purchase']

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${isActive ? 'bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/8 to-blue-600/5 animate-pulse pointer-events-none" />
      )}
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: status */}
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Brain size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-slate-900 font-semibold text-sm">
                {isMeta ? 'Meta' : 'Google'} Algoritması Eğitiliyor
              </h3>
              {isActive ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  AKTİF
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  BEKLEMEDE
                </span>
              )}
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {isActive
                ? 'Her müşteri kazandığınızda veriler otomatik iletiliyor — reklamlarınız zamanla daha ucuz ve etkili hale geliyor'
                : 'Ayarlar > Meta Dönüşüm bölümünden sistemi aktifleştirin — her satış algoritmayı eğitecek'}
            </p>
            {/* Event type pills */}
            {isActive && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-slate-500 text-[10px]">Öğrenilen:</span>
                {STEPS.map(step => {
                  const done = eventTypes.includes(step)
                  return (
                    <span key={step} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${done ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {done && <span className="w-1 h-1 bg-blue-500 rounded-full" />}
                      {EVENT_LABELS[step] || step}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {/* Right: counters */}
        {isActive && (
          <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0 pl-12 sm:pl-0">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{eventsToday}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Bugün</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-600">{eventsTotal}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Toplam</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">{relativeTime(lastAt)}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Son eğitim</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── META SIGNAL ORB — Behavioral data flowing to Meta ────────────────────────
// Theme: data signals, behavioral targeting, Facebook blue → electric
function MetaSignalOrb({ size = 110, sending = false, configured = false }: { size?: number; sending?: boolean; configured?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [angle, setAngle] = useState(0)
  const [signals, setSignals] = useState<Array<{ x: number; y: number; tx: number; ty: number; age: number; id: number; color: string }>>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setAngle(a => (a + 0.6) % 360), 16)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!sending || !mounted) return
    const t = setInterval(() => {
      // Signal flies from center outward (data being sent to Meta)
      const startAngle = Math.random() * Math.PI * 2
      const colors = ['#1877f2', '#42a5f5', '#00c6ff', '#7c3aed', '#a78bfa']
      const color = colors[Math.floor(Math.random() * colors.length)]
      const dist = 0.35 + Math.random() * 0.15
      setSignals(prev => [...prev.slice(-10), {
        x: Math.cos(startAngle) * dist, y: Math.sin(startAngle) * dist,
        tx: Math.cos(startAngle) * 1.2, ty: Math.sin(startAngle) * 1.2,
        age: 0, id: Date.now() + Math.random(), color,
      }])
    }, 300)
    const fade = setInterval(() => setSignals(prev =>
      prev.map(s => ({ ...s, age: s.age + 1 })).filter(s => s.age < 8)
    ), 200)
    return () => { clearInterval(t); clearInterval(fade) }
  }, [sending, mounted])

  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const metaBlue = configured ? '#1877f2' : '#334155'
  const accentBlue = configured ? '#42a5f5' : '#475569'
  const glowColor = configured ? 'rgba(24,119,242,' : 'rgba(71,85,105,'

  // "f" letter on sphere (Meta's logo representation)
  const fPath = `M ${cx-s*0.1} ${cx-s*0.18} L ${cx+s*0.08} ${cx-s*0.18} M ${cx-s*0.1} ${cx-s*0.06} L ${cx+s*0.05} ${cx-s*0.06} M ${cx-s*0.1} ${cx-s*0.18} L ${cx-s*0.1} ${cx+s*0.18}`

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`msGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${glowColor}0)`} />
            <stop offset="55%" stopColor={`${glowColor}0.07)`} />
            <stop offset="100%" stopColor={`${glowColor}0.2)`} />
          </radialGradient>
          <radialGradient id={`msSphere${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor={configured ? '#93c5fd' : '#475569'} />
            <stop offset="30%" stopColor={configured ? '#3b82f6' : '#374151'} />
            <stop offset="65%" stopColor={configured ? '#1d4ed8' : '#1f2937'} />
            <stop offset="100%" stopColor={configured ? '#1e3a8a' : '#111827'} />
          </radialGradient>
          {/* Signal trail gradient */}
          <linearGradient id={`msTrail${s}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={metaBlue} stopOpacity={0.8} />
            <stop offset="100%" stopColor={metaBlue} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#msGlow${s})`} />

        {/* Outer data rings (3 concentric) */}
        {[0.88, 0.72, 0.58].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r}
            fill="none"
            stroke={`rgba(${configured ? '24,119,242' : '71,85,105'},${0.15 - i * 0.04})`}
            strokeWidth={1}
            strokeDasharray={`${Math.PI * 2 * s * r / 20} ${Math.PI * 2 * s * r / 40}`}
            style={{ animation: `ms-ring-${i} ${8 + i * 3}s linear ${i % 2 ? 'reverse' : ''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}

        {/* Rotating data scan arc */}
        <path
          d={`M ${cx} ${cx} L ${cx + Math.cos(angle * Math.PI / 180) * s * 0.82} ${cx + Math.sin(angle * Math.PI / 180) * s * 0.82}`}
          stroke={configured ? 'rgba(66,165,245,0.7)' : 'rgba(100,116,139,0.5)'}
          strokeWidth={1.5}
          style={{ filter: configured ? 'drop-shadow(0 0 4px #42a5f5)' : 'none' }} />

        {/* Sweep sector */}
        <path
          d={`M ${cx} ${cx} L ${cx + Math.cos((angle - 40) * Math.PI / 180) * s * 0.82} ${cx + Math.sin((angle - 40) * Math.PI / 180) * s * 0.82} A ${s * 0.82} ${s * 0.82} 0 0 1 ${cx + Math.cos(angle * Math.PI / 180) * s * 0.82} ${cx + Math.sin(angle * Math.PI / 180) * s * 0.82} Z`}
          fill={configured ? 'rgba(24,119,242,0.1)' : 'rgba(71,85,105,0.08)'} />

        {/* Outgoing signal trails */}
        {signals.map(sig => {
          const progress = sig.age / 8
          const x = cx + (sig.x + (sig.tx - sig.x) * progress) * s
          const y = cx + (sig.y + (sig.ty - sig.y) * progress) * s
          const opacity = Math.max(0, 0.9 - progress * 0.9)
          const r = 3 * (1 - progress * 0.5)
          return (
            <g key={sig.id}>
              {/* Trail */}
              <line
                x1={cx + sig.x * s} y1={cx + sig.y * s}
                x2={x} y2={y}
                stroke={sig.color} strokeWidth={1.2} opacity={opacity * 0.5} />
              {/* Signal dot */}
              <circle cx={x} cy={y} r={r} fill={sig.color} opacity={opacity}
                style={{ filter: `drop-shadow(0 0 ${r * 2}px ${sig.color})` }} />
            </g>
          )
        })}

        {/* Core Meta sphere */}
        <circle cx={cx} cy={cx - s * 0.02} r={s * 0.4}
          fill={`url(#msSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${configured ? s * 0.25 : s * 0.1}px ${configured ? '#1877f299' : '#374151'})` }} />

        {/* "f" logo on sphere */}
        <path d={fPath}
          stroke={configured ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)'}
          strokeWidth={s * 0.045} strokeLinecap="round" fill="none" />

        {/* Specular */}
        <ellipse cx={cx - s * 0.1} cy={cx - s * 0.16}
          rx={s * 0.09} ry={s * 0.06}
          fill="rgba(255,255,255,0.2)" style={{ filter: 'blur(3px)' }} />

        {/* Scan tip dot */}
        <circle cx={cx + Math.cos(angle * Math.PI / 180) * s * 0.82}
          cy={cx + Math.sin(angle * Math.PI / 180) * s * 0.82}
          r={4} fill={accentBlue}
          style={{ filter: configured ? `drop-shadow(0 0 6px ${accentBlue})` : 'none' }} />

        {/* Corner brackets */}
        {([[6,6,1,1],[s*2.2-6,6,-1,1],[6,s*2.2-6,1,-1],[s*2.2-6,s*2.2-6,-1,-1]] as number[][])
          .map(([x,y,dx,dy],i) => {
            const len = s * 0.1
            return <g key={i}>
              <line x1={x} y1={y} x2={x+dx*len} y2={y} stroke={configured ? 'rgba(24,119,242,0.5)' : 'rgba(71,85,105,0.4)'} strokeWidth={1.8} />
              <line x1={x} y1={y} x2={x} y2={y+dy*len} stroke={configured ? 'rgba(24,119,242,0.5)' : 'rgba(71,85,105,0.4)'} strokeWidth={1.8} />
            </g>
          })}

        {/* Outer ring */}
        <circle cx={cx} cy={cx} r={s * 1.0}
          fill="none"
          stroke={configured ? 'rgba(24,119,242,0.18)' : 'rgba(71,85,105,0.15)'}
          strokeWidth={1.5} strokeDasharray="6 4" />

        {/* Status indicator */}
        <circle cx={cx + s * 0.3} cy={cx - s * 0.3} r={8}
          fill={configured ? '#10b981' : '#ef4444'}
          style={{ filter: `drop-shadow(0 0 6px ${configured ? '#10b981' : '#ef4444'})` }} />
        <circle cx={cx + s * 0.3} cy={cx - s * 0.3} r={13}
          fill="none" stroke={configured ? '#10b981' : '#ef4444'}
          strokeWidth={1} opacity={0.4}
          style={{ animation: 'ms-ping 2s ease-in-out infinite' }} />
      </svg>
    </div>
  )
}

// ── META EVENT TYPE CONFIG ────────────────────────────────────────────────────
const META_EVENT_TYPES = [
  { value: 'Lead',                  label: 'Lead',            Icon: User, color: '#2563eb', desc: 'Yeni lead bildirimi' },
  { value: 'Contact',               label: 'İletişim',        Icon: Phone, color: '#059669', desc: 'İletişim kuruldu' },
  { value: 'ViewContent',           label: 'İçerik Görüntüleme', Icon: Eye, color: '#7c3aed', desc: 'Katalog/içerik görüntülendi' },
  { value: 'InitiateCheckout',      label: 'Teklif Başladı',  Icon: FileText, color: '#b45309', desc: 'Teklif süreci başladı' },
  { value: 'Purchase',              label: 'Satış',           Icon: ShoppingCart, color: '#dc2626', desc: 'Satış gerçekleşti' },
  { value: 'CompleteRegistration',  label: 'Kayıt Tamamlandı',Icon: CheckCircle, color: '#0d9488', desc: 'Müşteri kaydı tamamlandı' },
]

const META_LEAD_STATUSES = ['Tüm leadler', 'new', 'contacted', 'replied', 'won', 'lost']
const META_SECTORS = ['Tüm sektörler', 'mobilya', 'dekorasyon', 'inşaat', 'tekstil', 'elektronik']

// ── META STAT CARD ────────────────────────────────────────────────────────────
function MetaStatCard({ label, value, color, Icon }: any) {
  return (
    <div style={{ background: '#ffffff', border: `1px solid ${color}33`, borderRadius: 14, padding: '16px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, background: `radial-gradient(circle,${color}18 0%,transparent 70%)` }} />
      <Icon size={20} style={{ color, marginBottom: 4 }} />
      <p style={{ color, fontSize: 22, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
      <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{label}</p>
    </div>
  )
}

export default function AdsPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'campaigns' | 'meta-intent'>('campaigns')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [leadsToday, setLeadsToday] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Ad results (attribution)
  const [adResults, setAdResults] = useState<AdResult[]>([])
  const [adSummary, setAdSummary] = useState<any>(null)

  // Meta CAPI algorithm training status
  const [capiStatus, setCapiStatus] = useState<{ eventsToday: number; eventsTotal: number; lastAt: string | null; eventTypes: string[] }>({ eventsToday: 0, eventsTotal: 0, lastAt: null, eventTypes: [] })

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [desc, setDesc] = useState('')
  const [goal, setGoal] = useState('LEADS')
  const [budget, setBudget] = useState('200')
  const [avgDeal, setAvgDeal] = useState('')
  const [draft, setDraft] = useState<any>(null)
  const [aiMsgIdx, setAiMsgIdx] = useState(0)
  const [launching, setLaunching] = useState(false)
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Meta Behavioral Intent tab state ──
  const [metaLoaded, setMetaLoaded] = useState(false)
  const [metaStats, setMetaStats] = useState<any>(null)
  const [metaSending, setMetaSending] = useState(false)
  const [metaCreating, setMetaCreating] = useState(false)
  const [metaMsg, setMetaMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [metaCopied, setMetaCopied] = useState(false)
  const [metaEventName, setMetaEventName] = useState('Lead')
  const [metaStatusFilter, setMetaStatusFilter] = useState('')
  const [metaSectorFilter, setMetaSectorFilter] = useState('')
  const [metaTestCode, setMetaTestCode] = useState('')
  const [metaBatchLimit, setMetaBatchLimit] = useState(500)
  const [metaSendResult, setMetaSendResult] = useState<any>(null)
  const [metaAudienceName, setMetaAudienceName] = useState('')
  const [metaAudienceResult, setMetaAudienceResult] = useState<any>(null)
  const [metaPixelCode, setMetaPixelCode] = useState<any>(null)
  const [metaShowPixel, setMetaShowPixel] = useState(false)
  const [metaEventHistory, setMetaEventHistory] = useState<any[]>([])

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && searchParams.get('state') === 'meta') exchangeToken(code)
    else loadAll()
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/ads/exchange-token`, { method: 'POST', headers: authH(), body: JSON.stringify({ code }) })
      const d = await r.json()
      if (d.success) { showMsg('success', 'Meta bağlandı!'); window.history.replaceState({}, '', window.location.pathname); loadAll() }
    } catch {}
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [connRes, campRes, actRes, attrRes, capiEvRes] = await Promise.allSettled([
        fetch(`${API}/api/ads/connection`, { headers: authH() }),
        fetch(`${API}/api/ads/my-campaigns`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/activity`, { headers: authH() }),
        fetch(`${API}/api/meta-capi/attribution`, { headers: authH() }),
        fetch(`${API}/api/meta-capi/events`, { headers: authH() }),
      ])
      if (connRes.status === 'fulfilled') { const d = await connRes.value.json(); setConnected(d.connected) }
      if (campRes.status === 'fulfilled') { const d = await campRes.value.json(); setCampaigns(d.campaigns || []) }
      if (actRes.status === 'fulfilled') { const d = await actRes.value.json(); setActivities(d.activities || []); setLeadsToday(d.leads_today || 0) }
      if (attrRes.status === 'fulfilled') { const d = await attrRes.value.json(); setAdResults(d.rows || []); setAdSummary(d.summary || null) }
      if (capiEvRes.status === 'fulfilled') {
        const d = await capiEvRes.value.json()
        const events: any[] = d.events || (Array.isArray(d) ? d : [])
        const todayStr = new Date().toDateString()
        const eventsToday = events.filter((e: any) => new Date(e.fired_at).toDateString() === todayStr && e.success).length
        const eventTypes = [...new Set(events.filter((e: any) => e.success).map((e: any) => e.event_name))] as string[]
        setCapiStatus({ eventsTotal: events.filter((e: any) => e.success).length, eventsToday, lastAt: events[0]?.fired_at || null, eventTypes })
      }
    } catch {}
    setLoading(false)
  }

  function openWizard() {
    setWizardOpen(true); setStep(1); setDesc(''); setGoal('LEADS')
    setBudget('200'); setAvgDeal(''); setDraft(null); setAiMsgIdx(0)
  }
  function closeWizard() {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current)
    setWizardOpen(false)
  }

  async function extractLeads() {
    setExtracting(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/extract-leads`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.ok || d.saved !== undefined) { showMsg('success', `${d.saved ?? 0} yeni lead eklendi`); loadAll() }
      else showMsg('error', d.error || 'Lead çekim başarısız')
    } catch { showMsg('error', 'Lead çekim başarısız') }
    setExtracting(false)
  }

  async function runAiStep() {
    setStep(4); setAiMsgIdx(0)
    let idx = 0
    animIntervalRef.current = setInterval(() => {
      idx++
      if (idx < AI_MSGS.length) setAiMsgIdx(idx)
      else { if (animIntervalRef.current) clearInterval(animIntervalRef.current) }
    }, 1600)

    let apiDone = false
    let animDone = false
    let draftData: any = null

    const advanceIfBoth = () => { if (apiDone && animDone && draftData) setStep(5) }

    setTimeout(() => { animDone = true; advanceIfBoth() }, AI_MSGS.length * 1600)

    try {
      const r = await fetch(`${API}/api/ads-intelligence/ai-create-campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ businessDescription: desc, goal, dailyBudget: Number(budget), currency: 'TRY', avgDealValue: avgDeal ? Number(avgDeal) : 0 }),
      })
      const d = await r.json()
      if (d.ok && d.draft) { draftData = d.draft; setDraft(d.draft); apiDone = true; advanceIfBoth() }
      else { showMsg('error', d.error || 'AI kampanya planı oluşturulamadı'); closeWizard() }
    } catch { showMsg('error', 'Bağlantı hatası'); closeWizard() }
  }

  async function launchCampaign() {
    if (!draft || !connected) { showMsg('error', 'Meta hesabınızı bağlayın'); return }
    setLaunching(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/launch-campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ draftId: draft.id, campaignPlan: draft }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message || 'Kampanya başlatıldı!'); closeWizard(); loadAll() }
      else showMsg('error', d.error || 'Kampanya başlatılamadı')
    } catch { showMsg('error', 'Bağlantı hatası') }
    setLaunching(false)
  }

  function connectMeta() {
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID || ''
    const redirect = encodeURIComponent(`${window.location.origin}/ads`)
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirect}&scope=ads_read,leads_retrieval,ads_management&state=meta&response_type=code`
  }

  // ── Meta Behavioral Intent tab logic ──
  useEffect(() => {
    if (tab === 'meta-intent' && !metaLoaded) loadMeta()
  }, [tab, metaLoaded])

  const showMetaMsg = (type: 'success' | 'error' | 'warning', text: string) => {
    setMetaMsg({ type, text }); setTimeout(() => setMetaMsg(null), 8000)
  }

  const loadMeta = async () => {
    setMetaLoaded(true)
    try {
      const [s, h] = await Promise.allSettled([
        api.get('/api/meta/stats'),
        api.get('/api/meta/event-history'),
      ])
      if (s.status === 'fulfilled') setMetaStats(s.value)
      if (h.status === 'fulfilled') setMetaEventHistory(h.value.events || [])
    } catch {}
  }

  const metaTrackBatch = async () => {
    setMetaSending(true); setMetaSendResult(null)
    try {
      const data = await api.post('/api/meta/track-batch', {
        eventName: metaEventName,
        status: metaStatusFilter || undefined,
        sector: metaSectorFilter || undefined,
        limit: metaBatchLimit,
        testCode: metaTestCode || undefined,
      })
      setMetaSendResult(data)
      if (data.errors?.length > 0) {
        showMetaMsg('warning', `${data.message} — ${data.errors[0]}`)
      } else {
        showMetaMsg('success', data.message)
      }
      loadMeta()
    } catch (e: any) { showMetaMsg('error', e.message) }
    finally { setMetaSending(false) }
  }

  const metaCreateAudience = async () => {
    if (!metaAudienceName) return
    setMetaCreating(true); setMetaAudienceResult(null)
    try {
      const data = await api.post('/api/meta/custom-audience', {
        name: metaAudienceName,
        status: metaStatusFilter || undefined,
        sector: metaSectorFilter || undefined,
      })
      setMetaAudienceResult(data)
      showMetaMsg(data.metaAudienceId ? 'success' : data.metaError ? 'warning' : 'warning', data.message)
    } catch (e: any) { showMetaMsg('error', e.message) }
    finally { setMetaCreating(false) }
  }

  const loadMetaPixelCode = async () => {
    try { const d = await api.get('/api/meta/pixel-code'); setMetaPixelCode(d); setMetaShowPixel(true) } catch {}
  }

  const metaConfigured = metaStats?.configured ?? false
  const metaMsgColors = { success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' }, error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }, warning: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' } }
  const metaInp = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: '#0f172a' as const, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white">
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-white border-emerald-200 text-emerald-600' : 'bg-white border-red-200 text-red-600'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900">Meta Ads</h1>
                {connected ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-semibold"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Bağlı</span>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-[10px] font-medium">Bağlı Değil</span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-0.5">AI kampanya oluşturma, CAPI algoritma eğitimi, lead otomasyonu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!connected && (
              <button onClick={connectMeta} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/25">
                <Link className="w-4 h-4" /> Meta Bağla
              </button>
            )}
            <button onClick={loadAll} className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100">
          <button onClick={() => setTab('campaigns')}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition ${tab === 'campaigns' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            Kampanyalar
          </button>
          <button onClick={() => setTab('meta-intent')}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg transition ${tab === 'meta-intent' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <Target className="w-3 h-3" /> CAPI & Kitleler
          </button>
        </div>

      {tab === 'campaigns' && (
        <>
        {/* Algorithm Training Banner */}
        <AlgorithmTrainingBanner
          platform="meta"
          eventsToday={capiStatus.eventsToday}
          eventsTotal={capiStatus.eventsTotal}
          lastAt={capiStatus.lastAt}
          eventTypes={capiStatus.eventTypes}
        />

        {/* 3 Action Cards — Premium Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={openWizard}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/15 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-slate-900 font-bold text-base">AI Kampanya</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">İşletmeni anlat, AI kampanya oluştursun</p>
              <div className="mt-4 flex items-center gap-1.5 text-blue-600 text-xs font-bold group-hover:gap-3 transition-all">
                Oluştur <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>

          <button onClick={extractLeads} disabled={extracting || !connected}
            className="group relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/15 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
                {extracting ? <RefreshCw className="w-5 h-5 text-white animate-spin" /> : <Users className="w-5 h-5 text-white" />}
              </div>
              <h3 className="text-slate-900 font-bold text-base">Lead Çek</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                {extracting ? "Meta'dan çekiliyor..." : "Reklam formlarından otomatik al"}
              </p>
              {leadsToday > 0 && !extracting && (
                <div className="mt-4 flex items-center gap-1.5 text-purple-600 text-xs font-bold">
                  Bugün {leadsToday} lead <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </button>

          <button onClick={() => setShowAdvanced(true)}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-300 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-slate-900 font-bold text-base">Performans</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">ROI analizi, uyarılar ve optimizasyon</p>
              <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-xs font-bold group-hover:gap-3 transition-all">
                İncele <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        </div>

        {/* ── META CAPI & HEDEFLEME ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Meta CAPI & Hedefleme</span>
                <p className="text-xs text-slate-500">{t('ads.conversion_api_ile_leadle', 'Conversion API ile leadleri hedef kitleye dönüştür')}</p>
              </div>
            </div>
            <button onClick={() => setTab('meta-intent')}
              className="flex items-center gap-1 text-blue-600 text-xs font-medium hover:text-blue-700 transition">
              Tam Ekran <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setTab('meta-intent')}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-3 transition group block w-full text-left">
              <Radio className="w-5 h-5 mb-1 text-blue-600" />
              <p className="text-slate-900 text-xs font-semibold">{t('ads.event_gonder', 'Event Gönder')}</p>
              <p className="text-slate-500 text-xs">Leadleri CAPI ile bildir</p>
            </button>
            <button onClick={() => setTab('meta-intent')}
              className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-3 transition group block w-full text-left">
              <Target className="w-5 h-5 mb-1 text-purple-600" />
              <p className="text-slate-900 text-xs font-semibold">Custom Audience</p>
              <p className="text-slate-500 text-xs">{t('ads.lead_listenden_kitle_olus', 'Lead listenden kitle oluştur')}</p>
            </button>
            <button onClick={() => setTab('meta-intent')}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl p-3 transition group block w-full text-left">
              <Code2 className="w-5 h-5 mb-1 text-emerald-600" />
              <p className="text-slate-900 text-xs font-semibold">Pixel Kodu</p>
              <p className="text-slate-500 text-xs">Site takip kodunu al</p>
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        {activities.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">Son Aktiviteler</span>
            </div>
            <div className="space-y-0">
              {activities.slice(0, 5).map((act: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${act.severity === 'critical' ? 'bg-red-500' : act.type === 'new_leads' ? 'bg-emerald-500' : act.type === 'campaign_launched' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                  <span className="text-sm text-slate-700 flex-1">{act.message}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{act.time_ago}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign List */}
        {campaigns.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">Aktif Kampanyalar</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">{campaigns.length}</span>
            </div>
            <div className="space-y-0">
              {campaigns.slice(0, 5).map((camp: any) => {
                const spend = Number(camp.insights?.data?.[0]?.spend || 0)
                const hasRoi = camp.roi_percent !== null && camp.roi_percent !== undefined
                return (
                  <div key={camp.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{camp.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {camp.status === 'ACTIVE' ? 'Aktif' : camp.status || 'Taslak'}{camp.objective ? ` · ${camp.objective}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {spend > 0 && (
                        <div className="text-right text-xs hidden sm:block">
                          <div className="text-slate-900">${spend.toFixed(0)}</div>
                          <div className="text-slate-500">harcama</div>
                        </div>
                      )}
                      {hasRoi && (
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${camp.roi_percent >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          {camp.roi_percent >= 0 ? '+' : ''}{camp.roi_percent}% ROI
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ad Results — plain Turkish, no tech jargon */}
        {adSummary && (adSummary.totalLeads > 0 || adResults.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{t('ads.reklam_sonuclarim', 'Reklam Sonuçlarım')}</h2>
              <span className="text-xs text-slate-500">{t('ads.reklamlardan_gelen_leadle', 'Reklamlardan gelen leadlerin satışa dönüşüm takibi')}</span>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{adSummary.totalLeads}</p>
                <p className="text-xs text-slate-600 mt-1">Reklamdan Gelen Lead</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{adSummary.totalWon}</p>
                <p className="text-xs text-slate-600 mt-1">{t('ads.musteriye_donen', 'Müşteriye Dönen')}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {adSummary.totalRevenue > 0 ? `₺${adSummary.totalRevenue.toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-slate-600 mt-1">{t('ads.toplam_kazanc', 'Toplam Kazanç')}</p>
              </div>
            </div>

            {/* Per-campaign breakdown */}
            {adResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{t('ads.kampanya_bazinda', 'Kampanya Bazında')}</span>
                  <button onClick={async () => {
                    const res = await fetch(`${API}/api/meta-capi/audience/won`, { headers: authH() })
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'musteri-listesi.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition">
                    <Download className="w-3.5 h-3.5" /> Müşteri Listesini İndir
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {adResults.slice(0, 8).map((row, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {row.campaign !== '—' ? row.campaign : row.source}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.leads} lead geldi</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {row.won > 0 && (
                          <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {row.won} müşteri
                          </div>
                        )}
                        {row.revenue > 0 && (
                          <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
                            ₺{row.revenue.toLocaleString()}
                          </div>
                        )}
                        {row.won === 0 && (
                          <span className="text-xs text-slate-400">{t('ads.henuz_musteri_yok', 'Henüz müşteri yok')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced section toggle */}
        <div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition py-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Gelişmiş Araçlar (Optimizer & ROI Dashboard)
          </button>
          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <MetaOptimizer connected={connected} />
              <AdsROI connected={connected} />
            </div>
          )}
        </div>
        </>
      )}

      {tab === 'meta-intent' && (
        <div style={{ padding: 0 }}>

          {/* ── HERO ──────────────────────────────────────────────────────────── */}
          <div style={{ position: 'relative', overflow: 'hidden', background: metaConfigured ? 'linear-gradient(135deg,#ffffff,#eff6ff 65%,#ffffff)' : 'linear-gradient(135deg,#ffffff,#f8fafc 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: `1px solid ${metaConfigured ? '#dbeafe' : '#e2e8f0'}` }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `linear-gradient(${metaConfigured ? 'rgba(37,99,235,0.025)' : 'rgba(71,85,105,0.02)'} 1px,transparent 1px),linear-gradient(90deg,${metaConfigured ? 'rgba(37,99,235,0.02)' : 'rgba(71,85,105,0.015)'} 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />
            <div style={{ position: 'absolute', top: -60, right: -20, width: 280, height: 280, background: `radial-gradient(circle,${metaConfigured ? 'rgba(37,99,235,0.08)' : 'rgba(71,85,105,0.05)'} 0%,transparent 70%)`, zIndex: 0 }} />

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 28 }}>
              <MetaSignalOrb size={100} sending={metaSending} configured={metaConfigured} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h1 style={{ color: '#0f172a', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Meta Behavioral Intent</h1>
                  <span style={{ background: metaConfigured ? 'linear-gradient(135deg,#1877f2,#42a5f5)' : '#e2e8f0', color: metaConfigured ? '#fff' : '#475569', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                    {metaConfigured ? '✓ BAĞLI' : '⚠ YAPILANDIRILMAMIS'}
                  </span>
                </div>
                <p style={{ color: '#475569', fontSize: 14, margin: '0 0 14px' }}>
                  Meta Conversions API ile leadleri Facebook hedef kitlesine dönüştür
                </p>
                {/* Config warning */}
                {!metaConfigured && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#b45309' }}>
                    ⚠️ <strong>Railway'e ekle:</strong> META_PIXEL_ID (Facebook Pixel ID) + META_CAPI_TOKEN (System User Token)
                  </div>
                )}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {['📡 CAPI v19', '🔒 SHA-256 Hash', '🎯 Custom Audience', '📊 Event Dedup', metaConfigured ? '✅ Bağlı' : '⚙️ Yapılandır'].map(f => (
                    <span key={f} style={{ background: metaConfigured ? '#eff6ff' : '#f8fafc', border: `1px solid ${metaConfigured ? '#dbeafe' : '#e2e8f0'}`, color: '#475569', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            {metaStats && (
              <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 22 }}>
                <MetaStatCard label="30 Gün Event" value={metaStats.total} color="#2563eb" Icon={Radio} />
                <MetaStatCard label="Başarılı" value={metaStats.totalSuccess || 0} color="#059669" Icon={CheckCircle} />
                <MetaStatCard label="Başarısız" value={metaStats.totalFailed || 0} color="#dc2626" Icon={XCircle} />
                <MetaStatCard label="Pixel ID" value={metaStats.pixelId || '—'} color="#7c3aed" Icon={Target} />
              </div>
            )}
          </div>

          {/* ── TOAST ─────────────────────────────────────────────────────────── */}
          {metaMsg && (
            <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: metaMsgColors[metaMsg.type].bg, border: `1px solid ${metaMsgColors[metaMsg.type].border}`, color: metaMsgColors[metaMsg.type].text }}>
              {metaMsg.text}
            </div>
          )}

          {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* LEFT: Event Sender */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Send size={16} style={{ color: '#2563eb' }} />
                <h2 style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>{t('meta_intent.conversion_event_gonder', 'Conversion Event Gönder')}</h2>
              </div>

              {/* Event type selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 7 }}>Event Tipi</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
                  {META_EVENT_TYPES.map(et => (
                    <button key={et.value} onClick={() => setMetaEventName(et.value)}
                      title={et.desc}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 6px', borderRadius: 10, border: `1px solid ${metaEventName === et.value ? `${et.color}60` : '#e2e8f0'}`, background: metaEventName === et.value ? `${et.color}15` : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <et.Icon size={18} style={{ color: metaEventName === et.value ? et.color : '#94a3b8' }} />
                      <span style={{ color: metaEventName === et.value ? et.color : '#64748b', fontSize: 10, fontWeight: metaEventName === et.value ? 700 : 400 }}>{et.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>Lead Status</label>
                  <div style={{ position: 'relative' }}>
                    <select value={metaStatusFilter} onChange={e => setMetaStatusFilter(e.target.value)} style={{ ...metaInp, appearance: 'none', paddingRight: 28 }}>
                      {META_LEAD_STATUSES.map(s => <option key={s} value={s === 'Tüm leadler' ? '' : s}>{s}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.sektor', 'Sektör')}</label>
                  <div style={{ position: 'relative' }}>
                    <select value={metaSectorFilter} onChange={e => setMetaSectorFilter(e.target.value)} style={{ ...metaInp, appearance: 'none', paddingRight: 28 }}>
                      {META_SECTORS.map(s => <option key={s} value={s === 'Tüm sektörler' ? '' : s}>{s}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
                  </div>
                </div>
              </div>

              {/* Advanced */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.gonderilecek_limit', 'Gönderilecek Limit')}</label>
                  <input type="number" value={metaBatchLimit} onChange={e => setMetaBatchLimit(Number(e.target.value))} min={1} max={2000}
                    style={metaInp} />
                </div>
                <div>
                  <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>Test Kodu (opsiyonel)</label>
                  <input value={metaTestCode} onChange={e => setMetaTestCode(e.target.value)} placeholder="TEST12345"
                    style={metaInp} />
                </div>
              </div>

              <button onClick={metaTrackBatch} disabled={metaSending}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px', borderRadius: 12, border: 'none', cursor: metaSending ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1877f2,#42a5f5)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(24,119,242,0.3)', opacity: metaSending ? 0.8 : 1 }}>
                {metaSending ? <RefreshCw size={16} style={{ animation: 'ms-spin 1s linear infinite' }} /> : <Zap size={16} />}
                {metaSending ? 'Event Gönderiliyor...' : `${metaEventName} Event Toplu Gönder`}
              </button>

              {/* Send result */}
              {metaSendResult && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: metaSendResult.errors?.length > 0 ? '#fffbeb' : '#eff6ff', border: `1px solid ${metaSendResult.errors?.length > 0 ? '#fde68a' : '#dbeafe'}`, borderRadius: 11 }}>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {[
                      { l: 'Toplam Lead', v: metaSendResult.total, c: '#475569' },
                      { l: 'Başarılı', v: metaSendResult.success, c: '#059669' },
                      { l: 'Başarısız', v: metaSendResult.failed, c: '#dc2626' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <p style={{ color: c, fontSize: 20, fontWeight: 800, margin: 0 }}>{v}</p>
                        <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{l}</p>
                      </div>
                    ))}
                    {metaSendResult.testMode && <span style={{ background: '#f5f3ff', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 20, alignSelf: 'center' }}>TEST MODE</span>}
                  </div>
                  {metaSendResult.errors?.length > 0 && (
                    <p style={{ color: '#b45309', fontSize: 11, margin: '8px 0 0' }}>⚠️ {metaSendResult.errors[0]}</p>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Custom Audience */}
            <div style={{ background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Users size={16} style={{ color: '#7c3aed' }} />
                <h2 style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>{t('meta_intent.custom_audience_olustur', 'Custom Audience Oluştur')}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div>
                  <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.kitle_adi', 'Kitle Adı *')}</label>
                  <input value={metaAudienceName} onChange={e => setMetaAudienceName(e.target.value)} placeholder={t('meta_intent.sicak_leadler_2026_q2', 'Sıcak Leadler 2026 Q2')}
                    style={{ ...metaInp, border: `1px solid ${metaAudienceName ? '#c4b5fd' : '#e2e8f0'}` }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>Status Filtre</label>
                    <div style={{ position: 'relative' }}>
                      <select value={metaStatusFilter} onChange={e => setMetaStatusFilter(e.target.value)} style={{ ...metaInp, appearance: 'none', paddingRight: 28 }}>
                        {META_LEAD_STATUSES.map(s => <option key={s} value={s === 'Tüm leadler' ? '' : s}>{s}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#475569', fontSize: 11, display: 'block', marginBottom: 4 }}>{t('meta_intent.sektor_filtre', 'Sektör Filtre')}</label>
                    <div style={{ position: 'relative' }}>
                      <select value={metaSectorFilter} onChange={e => setMetaSectorFilter(e.target.value)} style={{ ...metaInp, appearance: 'none', paddingRight: 28 }}>
                        {META_SECTORS.map(s => <option key={s} value={s === 'Tüm sektörler' ? '' : s}>{s}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', fontSize: 12 }}>▾</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 9, fontSize: 12, color: '#475569' }}>
                  {metaConfigured
                    ? '✅ META_CAPI_TOKEN + META_AD_ACCOUNT_ID varsa kitle otomatik oluşturulur'
                    : '⚠️ API yapılandırılmamış — veriler hazırlanır, manuel yükleme gerekir'}
                </div>

                <button onClick={metaCreateAudience} disabled={metaCreating || !metaAudienceName}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', borderRadius: 12, border: 'none', cursor: metaCreating || !metaAudienceName ? 'not-allowed' : 'pointer', background: metaAudienceName ? 'linear-gradient(135deg,#6d28d9,#7c3aed)' : '#e2e8f0', color: metaAudienceName ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, opacity: !metaAudienceName ? 0.7 : 1, boxShadow: metaAudienceName ? '0 6px 20px rgba(124,58,237,0.25)' : 'none', marginTop: 'auto' }}>
                  {metaCreating ? <RefreshCw size={15} style={{ animation: 'ms-spin 1s linear infinite' }} /> : <Target size={15} />}
                  {metaCreating ? 'Kitle Oluşturuluyor...' : 'Kitle Oluştur'}
                </button>
              </div>

              {/* Audience result */}
              {metaAudienceResult && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: metaAudienceResult.metaAudienceId ? '#ecfdf5' : '#fffbeb', border: `1px solid ${metaAudienceResult.metaAudienceId ? '#a7f3d0' : '#fde68a'}`, borderRadius: 11 }}>
                  <p style={{ color: metaAudienceResult.metaAudienceId ? '#047857' : '#b45309', fontSize: 12, margin: '0 0 8px', fontWeight: 600 }}>
                    {metaAudienceResult.metaAudienceId ? '✅ Kitle Oluşturuldu!' : '📋 Veriler Hazır'}
                  </p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div><p style={{ color: '#0f172a', fontSize: 16, fontWeight: 700, margin: 0 }}>{metaAudienceResult.totalContacts}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{t('meta_intent.kisi', 'Kişi')}</p></div>
                    <div><p style={{ color: '#2563eb', fontSize: 16, fontWeight: 700, margin: 0 }}>{metaAudienceResult.phones}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>Telefon</p></div>
                    <div><p style={{ color: '#059669', fontSize: 16, fontWeight: 700, margin: 0 }}>{metaAudienceResult.emails}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>E-posta</p></div>
                  </div>
                  {metaAudienceResult.metaAudienceId && (
                    <p style={{ color: '#64748b', fontSize: 10, margin: '6px 0 0', fontFamily: 'monospace' }}>ID: {metaAudienceResult.metaAudienceId}</p>
                  )}
                  {metaAudienceResult.metaError && (
                    <p style={{ color: '#b45309', fontSize: 11, margin: '6px 0 0' }}>⚠️ {metaAudienceResult.metaError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── EVENT HISTORY ─────────────────────────────────────────────────── */}
          {metaEventHistory.length > 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 22, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 style={{ color: '#475569', fontSize: 12, fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>{t('meta_intent.son_event_gecmisi', '📊 Son Event Geçmişi')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {metaEventHistory.slice(0, 8).map((e: any, i: number) => {
                  const EvIcon = META_EVENT_TYPES.find(et => et.value === e.event_name)?.Icon || Radio
                  return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: e.success ? '#eff6ff' : '#fef2f2', border: `1px solid ${e.success ? '#dbeafe' : '#fecaca'}`, borderRadius: 10 }}>
                    <EvIcon size={16} style={{ color: e.success ? '#2563eb' : '#dc2626', flexShrink: 0 }} />
                    <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 600 }}>{e.event_name}</span>
                    <span style={{ color: '#64748b', fontSize: 11, flex: 1 }}>{e.lead_id ? `Lead: ${e.lead_id.slice(0, 8)}...` : ''}</span>
                    <span style={{ color: e.success ? '#059669' : '#dc2626', fontSize: 10 }}>{e.success ? '✅ Başarılı' : '❌ Başarısız'}</span>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>{new Date(e.sent_at).toLocaleString()}</span>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── PIXEL CODE ────────────────────────────────────────────────────── */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: metaShowPixel ? 16 : 0 }}>
              <h3 style={{ color: '#475569', fontSize: 13, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><Code2 size={14} style={{ color: '#475569' }} /> Meta Pixel Kodu</h3>
              <button onClick={metaShowPixel ? () => setMetaShowPixel(false) : loadMetaPixelCode}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, border: '1px solid #dbeafe', background: '#eff6ff', color: '#2563eb', fontSize: 12, cursor: 'pointer' }}>
                <ChevronDown size={13} style={{ transform: metaShowPixel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                {metaShowPixel ? 'Gizle' : 'Kodu Göster'}
              </button>
            </div>
            {metaShowPixel && metaPixelCode && (
              <div style={{ position: 'relative' }}>
                <pre style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '14px 16px', color: '#475569', fontSize: 11, lineHeight: 1.6, overflowX: 'auto', margin: 0 }}>
                  {metaPixelCode.code}
                </pre>
                <button onClick={() => { navigator.clipboard.writeText(metaPixelCode.code); setMetaCopied(true); setTimeout(() => setMetaCopied(false), 2000) }}
                  style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: '1px solid #dbeafe', background: '#ffffff', color: metaCopied ? '#059669' : '#2563eb', fontSize: 11, cursor: 'pointer' }}>
                  {metaCopied ? <CheckCircle size={11} /> : <Copy size={11} />} {metaCopied ? 'Kopyalandı' : 'Kopyala'}
                </button>
                {!metaPixelCode.configured && (
                  <p style={{ color: '#dc2626', fontSize: 11, marginTop: 8 }}>
                    ⚠️ META_PIXEL_ID yapılandırılmamış — gerçek Pixel ID'nizi Railway'e ekleyin
                  </p>
                )}
              </div>
            )}
          </div>

          <style>{`
            @keyframes ms-spin { to { transform: rotate(360deg); } }
            @keyframes ms-ping { 0%{transform:scale(1);opacity:0.6}100%{transform:scale(2);opacity:0} }
            @keyframes ms-ring-0 { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
            @keyframes ms-ring-1 { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
            @keyframes ms-ring-2 { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
          `}</style>
        </div>
      )}
      </div>

      {/* Campaign Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-900">{t('ads.ai_kampanya_olustur', 'AI Kampanya Oluştur')}</span>
              </div>
              <button onClick={closeWizard} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1.5 px-6 pt-4">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-500 ${s <= step ? 'bg-blue-500' : 'bg-slate-200'}`} />
              ))}
            </div>

            <div className="p-6">
              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('ads.isletmeni_anlat', 'İşletmeni Anlat')}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('ads.ne_sattigini_ve_kime_satt', 'Ne sattığını ve kime sattığını kısaca yaz')}</p>
                  </div>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder={t('ads.orn_istanbulda_mutfak_dol', 'Örn: İstanbul\'da mutfak dolabı satan bir firmayız. 30-55 yaş ev yenileyen müşterilere ulaşmak istiyoruz. Ortalama sipariş değerimiz 15.000 TL...')}
                    className="w-full h-36 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm resize-none focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    onClick={() => setStep(2)}
                    disabled={desc.trim().length < 20}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition"
                  >
                    Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 2 — Kampanya Tipi */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Kampanya Tipi Seçin</h2>
                    <p className="text-sm text-slate-500 mt-1">Hedefinize göre en uygun kampanya tipini seçin</p>
                  </div>
                  <div className="space-y-2.5">
                    {GOALS.map(g => (
                      <button key={g.id} onClick={() => setGoal(g.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${goal === g.id ? 'border-blue-400 bg-blue-50/50 shadow-md shadow-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${g.color}15` }}>
                            <g.Icon className="w-5 h-5" style={{ color: g.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{g.label}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${g.color}12`, color: g.color }}>{g.estimate}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{g.desc}</p>
                            {goal === g.id && (
                              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">{g.detail}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${goal === g.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                            {goal === g.id && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep(3)} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/25">
                    Devam <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('ads.butce_ve_deger', 'Bütçe ve Değer')}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('ads.gunluk_reklam_butceni_bel', 'Günlük reklam bütçeni belirle')}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-600 mb-2 block">{t('ads.gunluk_butce_try', 'Günlük Bütçe (TRY)')}</label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {['100', '200', '500', '1000'].map(v => (
                          <button
                            key={v}
                            onClick={() => setBudget(v)}
                            className={`py-2 text-sm rounded-lg border transition ${budget === v ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                          >
                            ₺{v}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition"
                        placeholder={t('ads.ozel_tutar_girebilirsin', 'Özel tutar girebilirsin...')}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-2 block">
                        Ortalama Müşteri Değeri (TRY) <span className="text-slate-400">{t('ads.roi_hesabi_icin', '— ROI hesabı için')}</span>
                      </label>
                      <input
                        type="number"
                        value={avgDeal}
                        onChange={e => setAvgDeal(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition"
                        placeholder={t('ads.orn_5000', 'Örn: 5000')}
                      />
                    </div>
                  </div>
                  <button
                    onClick={runAiStep}
                    disabled={!budget || Number(budget) < 10}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> AI ile Oluştur
                  </button>
                </div>
              )}

              {/* Step 4: AI Animation */}
              {step === 4 && (
                <div className="py-10 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-lg">{t('ads.kampanya_hazirlaniyor', 'Kampanya Hazırlanıyor')}</p>
                    <p className="text-blue-600 text-sm mt-2 min-h-[20px]">{AI_MSGS[aiMsgIdx]}</p>
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {AI_MSGS.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= aiMsgIdx ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Preview & Launch */}
              {step === 5 && draft && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('ads.kampanya_onizleme', 'Kampanya Önizleme')}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('ads.ai_planini_incele_ve_yayi', 'AI planını incele ve yayınla')}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 max-h-60 overflow-y-auto">
                    <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                      <span className="text-slate-500">{t('ads.kampanya_adi', 'Kampanya Adı')}</span>
                      <span className="text-slate-900 font-medium truncate ml-4 max-w-[60%] text-right">{draft.campaign_name || 'AI Kampanya'}</span>
                    </div>
                    {draft.target_audience && (
                      <div className="flex justify-between items-start px-4 py-2.5 text-xs">
                        <span className="text-slate-500 shrink-0">Hedef Kitle</span>
                        <span className="text-slate-900 ml-4 text-right max-w-[65%]">
                          {typeof draft.target_audience === 'object'
                            ? (draft.target_audience.description || draft.target_audience.age_range || JSON.stringify(draft.target_audience))
                            : draft.target_audience}
                        </span>
                      </div>
                    )}
                    {draft.budget && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                        <span className="text-slate-500">{t('ads.gunluk_butce', 'Günlük Bütçe')}</span>
                        <span className="text-slate-900">{typeof draft.budget === 'object' ? `₺${draft.budget.daily_budget || draft.budget.amount}` : `₺${draft.budget}`}</span>
                      </div>
                    )}
                    {draft.ad_copies?.[0] && (
                      <div className="px-4 py-3 space-y-2">
                        <p className="text-xs text-slate-500">{t('ads.reklam_metni_onizleme', 'Reklam Metni Önizleme')}</p>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-slate-900 leading-snug">
                            {(draft.ad_copies[0].headline || draft.ad_copies[0].title || '').slice(0, 40)}
                          </p>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            {(draft.ad_copies[0].primary_text || draft.ad_copies[0].body || '').slice(0, 125)}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-slate-400">
                            <span>Başlık: {(draft.ad_copies[0].headline || draft.ad_copies[0].title || '').length}/40</span>
                            <span>Metin: {(draft.ad_copies[0].primary_text || draft.ad_copies[0].body || '').length}/125</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!connected && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-amber-700 text-xs">{t('ads.yayinlamak_icin_meta_hesa', 'Yayınlamak için Meta hesabınızı bağlayın')}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={closeWizard} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">
                      Kaydet & Kapat
                    </button>
                    <button
                      onClick={launchCampaign}
                      disabled={!connected || launching}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {launching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {launching ? 'Yayınlanıyor...' : 'Yayınla'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
