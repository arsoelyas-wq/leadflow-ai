'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Search, RefreshCw, MessageSquare, Mail, CheckCircle, X, Copy, Play, ArrowRight, Zap, ExternalLink, TrendingUp, Clock, ChevronRight, Star, ClipboardList, BarChart2, Shuffle, Microscope, Save, XCircle, Lightbulb, Globe, Globe2, Users, Rocket, MessageCircle, Send, Phone, Link2, User, UserCheck, FileEdit, PenLine } from 'lucide-react'

// ── LIGHT THEME TOKENS ────────────────────────────────────────────────────────
const tx1 = '#0f172a', tx2 = '#475569', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'
const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const inp = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', color: tx1, fontSize: 13, outline: 'none' }

// ── GLOBE ORB ─────────────────────────────────────────────────────────────────
function GlobeOrb({ size = 100, scanning = false, countryCode = '' }: { size?: number; scanning?: boolean; countryCode?: string }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 18 : 50)
    return () => clearInterval(t)
  }, [mounted, scanning])
  if (!mounted) return <div style={{ width: size * 2.1, height: size * 2.1, flexShrink: 0 }} />

  const cx = size * 1.05, s = size
  const rot = tick * (scanning ? 0.9 : 0.3)
  const meridians = [0, 60, 120, 180].map(deg => {
    const a = (deg + rot * 0.35) * Math.PI / 180
    const pts: string[] = []
    for (let lat = -80; lat <= 80; lat += 15) {
      const r2 = Math.cos(lat * Math.PI / 180)
      pts.push(`${(cx + Math.cos(a) * s * 0.42 * r2).toFixed(1)},${(cx + Math.sin(lat * Math.PI / 180) * s * 0.42).toFixed(1)}`)
    }
    return pts.join(' ')
  })
  const parallels = [-40, 0, 40].map(lat => {
    const r2 = Math.cos(lat * Math.PI / 180)
    return { rx: s * 0.42 * r2, ry: s * 0.11 * r2, cy: cx + Math.sin(lat * Math.PI / 180) * s * 0.42 }
  })
  const trAngle = (rot + 35) * Math.PI / 180
  const trLat = 39 * Math.PI / 180
  const trx = cx + Math.cos(trAngle) * s * 0.42 * Math.cos(trLat)
  const try2 = cx - Math.sin(trLat) * s * 0.42
  const scanA = (rot * 5) * Math.PI / 180

  return (
    <div style={{ width: s * 2.1, height: s * 2.1, flexShrink: 0, position: 'relative' }}>
      <svg width={s * 2.1} height={s * 2.1}>
        <defs>
          <radialGradient id={`glo${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" /><stop offset="100%" stopColor="rgba(16,185,129,0.18)" />
          </radialGradient>
          <radialGradient id={`gsph${s}`} cx="32%" cy="26%" r="68%">
            <stop offset="0%" stopColor="#6ee7b7" /><stop offset="32%" stopColor="#10b981" /><stop offset="68%" stopColor="#064e3b" /><stop offset="100%" stopColor="#001a0e" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#glo${s})`} />
        {[0.62, 0.8, 0.97].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(16,185,129,0.09)" strokeWidth={0.8} strokeDasharray="5 8"
            style={{ animation: `glo-ring ${9+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {meridians.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth={0.7} />)}
        {parallels.map((p, i) => <ellipse key={i} cx={cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth={0.7} />)}
        <circle cx={cx} cy={cx} r={s * 0.42} fill={`url(#gsph${s})`} style={{ filter: `drop-shadow(0 0 ${s * 0.2}px #10b98199)` }} />
        <ellipse cx={cx - s * 0.1} cy={cx - s * 0.18} rx={s * 0.1} ry={s * 0.06} fill="rgba(255,255,255,0.2)" style={{ filter: 'blur(3px)' }} />
        <circle cx={trx} cy={try2} r={5} fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 7px #f59e0b)' }} />
        <text x={trx} y={try2 - 9} fill="#fbbf24" fontSize={8} textAnchor="middle" fontWeight="900">TR</text>
        {scanning && (
          <line x1={trx} y1={try2} x2={cx + Math.cos(scanA) * s * 0.42} y2={cx + Math.sin(scanA) * s * 0.16}
            stroke="#f59e0b" strokeWidth={1.5} opacity={0.5} strokeDasharray="3 4" style={{ filter: 'drop-shadow(0 0 4px #f59e0b)' }} />
        )}
      </svg>
      {/* Flag image overlay when country selected */}
      {countryCode && (
        <div style={{ position: 'absolute', bottom: s * 0.3, right: s * 0.3, width: 28, height: 20, borderRadius: 4, overflow: 'hidden', border: '2px solid rgba(16,185,129,0.5)', boxShadow: '0 0 10px rgba(16,185,129,0.4)' }}>
          <img src={`https://flagcdn.com/28x21/${countryCode.toLowerCase()}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      <style>{`@keyframes glo-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── FLAG IMAGE ────────────────────────────────────────────────────────────────
function FlagImg({ code, size = 32 }: { code: string; size?: number }) {
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.75)
  if (err) return (
    <div style={{ width: size, height: h, borderRadius: 4, background: surf, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: tx2, flexShrink: 0 }}>
      {code}
    </div>
  )
  return (
    <img src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`} alt={code} width={size} height={h}
      style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0, display: 'block' }}
      onError={() => setErr(true)} />
  )
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const REGIONS_TR = ['Tümü', 'Avrupa', 'Körfez', 'Amerika', 'Orta Asya', 'Asya', 'Afrika']

const EXPORT_REGIONS: Record<string, string[]> = {
  tr: ['Tümü', 'Avrupa', 'Körfez', 'Amerika', 'Orta Asya', 'Asya', 'Afrika'],
  de: ['Alle', 'Europa', 'Golf-Region', 'Amerika', 'Zentralasien', 'Asien', 'Afrika'],
  ru: ['Все', 'Европа', 'Залив', 'Америка', 'Центральная Азия', 'Азия', 'Африка'],
  en: ['All', 'Europe', 'Gulf', 'Americas', 'Central Asia', 'Asia', 'Africa'],
  fr: ['Tous', 'Europe', 'Golfe', 'Amériques', 'Asie centrale', 'Asie', 'Afrique'],
  ar: ['الكل', 'أوروبا', 'الخليج', 'الأمريكتان', 'آسيا الوسطى', 'آسيا', 'أفريقيا'],
}

const EXPORT_REGION_MAP: Record<string, Record<string, string>> = {
  de: { 'Tümü':'Alle','Avrupa':'Europa','Körfez':'Golf-Region','Amerika':'Amerika','Orta Asya':'Zentralasien','Asya':'Asien','Afrika':'Afrika' },
  ru: { 'Tümü':'Все','Avrupa':'Европа','Körfez':'Залив','Amerika':'Америка','Orta Asya':'Центральная Азия','Asya':'Азия','Afrika':'Африка' },
  en: { 'Tümü':'All','Avrupa':'Europe','Körfez':'Gulf','Amerika':'Americas','Orta Asya':'Central Asia','Asya':'Asia','Afrika':'Africa' },
  fr: { 'Tümü':'Tous','Avrupa':'Europe','Körfez':'Golfe','Amerika':'Amériques','Orta Asya':'Asie centrale','Asya':'Asie','Afrika':'Afrique' },
  ar: { 'Tümü':'الكل','Avrupa':'أوروبا','Körfez':'الخليج','Amerika':'الأمريكتان','Orta Asya':'آسيا الوسطى','Asya':'آسيا','Afrika':'أفريقيا' },
}

const EXPORT_TRUST: Record<string, Record<string, string>> = {
  tr: { very:'Çok Güvenli', trust:'Güvenli', mid:'Orta', careful:'Dikkatli', risky:'Riskli' },
  de: { very:'Sehr vertrauenswürdig', trust:'Vertrauenswürdig', mid:'Mittel', careful:'Vorsicht', risky:'Riskant' },
  ru: { very:'Очень надёжный', trust:'Надёжный', mid:'Средний', careful:'Осторожно', risky:'Рискованный' },
  en: { very:'Very Trusted', trust:'Trusted', mid:'Medium', careful:'Careful', risky:'Risky' },
  fr: { very:'Très fiable', trust:'Fiable', mid:'Moyen', careful:'Prudent', risky:'Risqué' },
  ar: { very:'موثوق جداً', trust:'موثوق', mid:'متوسط', careful:'بحذر', risky:'محفوف بالمخاطر' },
}

const EXPORT_TEXT: Record<string, Record<string, string>> = {
  tr: { subtitle:'Hedef pazarda doğrulanmış alıcılar · Karar verici isim ve iletişim · Yerel dilde kişiselleştirilmiş mesaj', search_country:'Ülke ara...', country_search:'Ülke ara...' },
  de: { subtitle:'Verifizierte Käufer auf Zielmärkten · Name und Kontakt der Entscheidungsträger · Personalisierte Nachrichten auf Landessprache', search_country:'Land suchen...', country_search:'Land suchen...' },
  ru: { subtitle:'Проверенные покупатели на целевых рынках · Имена и контакты ЛПР · Персонализированные сообщения на местном языке', search_country:'Поиск страны...', country_search:'Поиск страны...' },
  en: { subtitle:'Verified buyers in target markets · Decision maker names and contacts · Personalized messages in local language', search_country:'Search country...', country_search:'Search country...' },
  fr: { subtitle:'Acheteurs vérifiés sur les marchés cibles · Noms et contacts des décideurs · Messages personnalisés en langue locale', search_country:'Rechercher un pays...', country_search:'Rechercher...' },
  ar: { subtitle:'مشترون موثقون في الأسواق المستهدفة · أسماء وجهات اتصال صانعي القرار · رسائل مخصصة باللغة المحلية', search_country:'البحث عن دولة...', country_search:'بحث...' },
}
const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: accentEmerald },
  { key: 'email',    label: 'E-posta',  icon: Mail,          color: '#2563eb' },
  { key: 'linkedin', label: 'Mesaj',    icon: ExternalLink,  color: '#7c3aed' },
]

function riskColor(s: number) {
  if (s >= 85) return accentEmerald; if (s >= 70) return accentTeal
  if (s >= 55) return '#b45309'; if (s >= 40) return '#c2410c'; return '#dc2626'
}
function riskLabel(s: number, trust: Record<string,string>) {
  if (s >= 85) return trust.very; if (s >= 70) return trust.trust
  if (s >= 55) return trust.mid; if (s >= 40) return trust.careful; return trust.risky
}
function fmtUSD(n: number) {
  if (!n) return '—'; if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`; return `$${n}`
}
function opportunityScore(country: any, leadCount: number): number {
  const risk = country.paymentRisk?.score || 60
  const hasLeads = leadCount > 0 ? 20 : 0
  return Math.min(100, Math.round(risk * 0.7 + hasLeads + (country.region === 'Avrupa' ? 10 : 0)))
}

// ── SEARCH PROGRESS ───────────────────────────────────────────────────────────
function SearchProgress({ sessionId, onComplete }: { sessionId: string; onComplete: (r: any) => void }) {
  const [progress, setProgress] = useState(5)
  const [step, setStep] = useState<{ icon: any; text: string }>({ icon: Zap, text: 'Başlatılıyor...' })
  const [status, setStatus] = useState('running')
  const [found, setFound] = useState(0)
  const STEPS: Record<string, { icon: any; text: string }> = {
    starting: { icon: Zap, text: 'Başlatılıyor...' }, hs_codes: { icon: ClipboardList, text: 'Ürün kategorileri belirleniyor...' },
    market_data: { icon: BarChart2, text: 'Pazar büyüklüğü analiz ediliyor...' }, market_intelligence: { icon: BarChart2, text: 'Pazar analizi...' },
    merging_results: { icon: Shuffle, text: 'Sonuçlar derleniyor...' }, finding_importers: { icon: Search, text: 'Potansiyel alıcılar taranıyor...' },
    enriching_contacts: { icon: ClipboardList, text: 'Şirket profilleri oluşturuluyor...' }, researching_companies: { icon: Microscope, text: 'Alıcılar doğrulanıyor...' },
    saving_results: { icon: Save, text: 'Alıcı listesi kaydediliyor...' }, done: { icon: CheckCircle, text: 'Tamamlandı!' },
  }
  const isTemp = sessionId.startsWith('temp-')
  // Temp session: don't poll DB, just show animated progress
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isTemp) return
    const iv = setInterval(() => setElapsed(p => p + 1), 1000)
    return () => clearInterval(iv)
  }, [isTemp])

  useEffect(() => {
    if (isTemp) return // Skip DB polling for temp sessions
    const iv = setInterval(async () => {
      try {
        const d: any = await api.get(`/api/export/search-session/${sessionId}/status`)
        setProgress(d.progress || 0); setStep(STEPS[d.step] || { icon: Search, text: d.step || '...' }); setStatus(d.status); setFound(d.importersFound || 0)
        if (d.status === 'completed' || d.status === 'failed') { clearInterval(iv); if (d.status === 'completed') setTimeout(() => onComplete(d), 800) }
      } catch(e) { /* silent — keep polling */ }
    }, 3000)
    return () => clearInterval(iv)
  }, [sessionId, isTemp])

  // Temp session: estimated progress based on elapsed time (~90s typical)
  const tempProgress = isTemp ? Math.min(95, Math.round((elapsed / 90) * 100)) : progress
  const tempStep = isTemp ? (
    elapsed < 10 ? STEPS['hs_codes'] :
    elapsed < 25 ? STEPS['market_data'] :
    elapsed < 45 ? STEPS['finding_importers'] :
    elapsed < 70 ? STEPS['enriching_contacts'] :
    STEPS['saving_results']
  ) : step

  if (status === 'completed') return (
    <div style={{ padding: '14px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <CheckCircle size={16} color={accentEmerald} />
      <p style={{ color: accentEmerald, fontSize: 13, margin: 0, fontWeight: 600 }}>{found} yeni alıcı bulundu — Alıcı Listesi sekmesini açın</p>
    </div>
  )
  if (!isTemp && status === 'failed') return (
    <div style={{ padding: '12px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <XCircle size={16} color="#dc2626" />
      <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>Arama tamamlanamadı — lütfen tekrar deneyin</p>
    </div>
  )
  return (
    <div style={{ padding: '16px 20px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={13} color={accentEmerald} style={{ animation: 'exp-spin 1s linear infinite' }} />
          <tempStep.icon size={13} color={accentEmerald} />
          <span style={{ color: accentEmerald, fontSize: 13, fontWeight: 600 }}>{tempStep.text}</span>
        </div>
        <span style={{ color: accentEmerald, fontSize: 12, fontWeight: 700 }}>{tempProgress}%{isTemp?' (tahmini)':''}</span>
      </div>
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${tempProgress}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 2, transition: 'width 0.8s', boxShadow: '0 0 8px rgba(16,185,129,0.4)' }} />
      </div>
      {isTemp && elapsed > 80 && (
        <p style={{ color: accentEmerald, fontSize: 11, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}><Search size={11} /> Arama bitiyor — <strong>Alıcı Listesi</strong> sekmesini kontrol edin veya Yenile butonuna basın</p>
      )}
      {!isTemp && <p style={{ color: tx2, fontSize: 10, margin: '6px 0 0' }}>Arama arka planda devam ediyor...</p>}
    </div>
  )
}

// ── PAZAR ZEKA PANELİ ─────────────────────────────────────────────────────────
function MarketPanel({ intel, country }: { intel: any; country: any }) {
  if (!intel) return null
  const { marketIntel, paymentRisk, culturalIntel } = intel
  if (!marketIntel && !paymentRisk && !culturalIntel) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
      {marketIntel?.marketSizeUSD > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { l: 'Toplam Pazar', v: fmtUSD(marketIntel.marketSizeUSD), c: '#7c3aed' },
            { l: 'TR İhracatı', v: fmtUSD(marketIntel.turkeyExportsUSD), c: '#b45309' },
            { l: 'TR Pazar Payı', v: `%${marketIntel.turkeySharePct}`, c: marketIntel.turkeySharePct > 5 ? accentEmerald : '#c2410c' },
            { l: 'Yıllık Değişim', v: marketIntel.yoyGrowthPct >= 0 ? `+%${marketIntel.yoyGrowthPct}` : `%${marketIntel.yoyGrowthPct}`, c: marketIntel.yoyGrowthPct >= 0 ? accentEmerald : '#dc2626' },
          ].map(m => (
            <div key={m.l} style={{ ...card, border: `1px solid ${m.c}28`, padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ color: m.c, fontSize: 18, fontWeight: 800, margin: 0 }}>{m.v}</p>
              <p style={{ color: tx2, fontSize: 10, margin: '3px 0 0' }}>{m.l}</p>
            </div>
          ))}
        </div>
      )}
      {marketIntel?.hsCodes?.length > 0 && (
        <div style={{ ...card, border: '1px solid #ede9fe', padding: '12px 16px' }}>
          <p style={{ color: tx2, fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Ürün Sınıflandırması</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {marketIntel.hsCodes.map((code: string, i: number) => (
              <span key={code} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed', fontSize: 11, padding: '4px 10px', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700 }}>
                {code}{marketIntel.hsCodeNames?.[i] && <span style={{ fontFamily: 'inherit', color: tx2, fontWeight: 400 }}> — {marketIntel.hsCodeNames[i]}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {paymentRisk && (
          <div style={{ ...card, border: `1px solid ${riskColor(paymentRisk.score)}28`, padding: '14px 16px' }}>
            <p style={{ color: tx2, fontSize: 10, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Tahsilat Güvenilirliği</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${riskColor(paymentRisk.score)}15`, border: `2px solid ${riskColor(paymentRisk.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: riskColor(paymentRisk.score), fontWeight: 900, fontSize: 15 }}>{paymentRisk.score}</span>
              </div>
              <div>
                <p style={{ color: riskColor(paymentRisk.score), fontWeight: 700, fontSize: 13, margin: 0 }}>{paymentRisk.label} Risk</p>
                <p style={{ color: tx2, fontSize: 11, margin: '2px 0 0' }}>Ort. tahsilat: {paymentRisk.dso} gün</p>
                <p style={{ color: tx2, fontSize: 10, margin: '3px 0 0', lineHeight: 1.4 }}>{paymentRisk.notes}</p>
              </div>
            </div>
          </div>
        )}
        {culturalIntel && (
          <div style={{ ...card, border: '1px solid #fef3c7', padding: '14px 16px' }}>
            <p style={{ color: tx2, fontSize: 10, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>İş Yapma Rehberi</p>
            <p style={{ color: tx2, fontSize: 11, margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} /> {culturalIntel.timing}</p>
            <p style={{ color: tx2, fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}><Lightbulb size={11} /> {culturalIntel.tip}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ANA SAYFA ─────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const { t, lang } = useI18n()
  const ET = EXPORT_TEXT[lang] || EXPORT_TEXT.tr
  const TRUST = EXPORT_TRUST[lang] || EXPORT_TRUST.tr
  const router = useRouter()
  const [tab, setTab] = useState<'find' | 'leads' | 'campaigns' | 'messages' | 'analytics'>('find')
  const [countries, setCountries] = useState<any[]>([])
  const [exportLeads, setExportLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<any>(null)
  const [selectedRegion, setSelectedRegion] = useState('Tümü')
  const REGIONS = EXPORT_REGIONS[lang] || EXPORT_REGIONS.tr
  const [sector, setSector] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedChannel, setSelectedChannel] = useState('whatsapp')
  const [campaignName, setCampaignName] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [lastIntel, setLastIntel] = useState<any>(null)
  const [generatingMsg, setGeneratingMsg] = useState<string | null>(null)
  const [inlineMessages, setInlineMessages] = useState<Record<string, any>>({})
  const [filterCountry, setFilterCountry] = useState('')
  const [onlyWithContact, setOnlyWithContact] = useState(true) // Default: show only with contact
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [countryIntel, setCountryIntel] = useState<any>(null)
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [countrySearch, setCountrySearch] = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  // loadLeads — sadece lead listesini güncelle (hızlı)
  const loadLeads = useCallback(async () => {
    try {
      const d: any = await api.get(`/api/export/export-leads?limit=500${filterCountry ? `&countryCode=${filterCountry}` : ''}`)
      if (d?.leads) setExportLeads(d.leads)
    } catch(e:any) { console.error('loadLeads error:', e.message) }
  }, [filterCountry])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [c, l, ca, m, an] = await Promise.allSettled([
      api.get('/api/export/countries'),
      api.get(`/api/export/export-leads?limit=500${filterCountry ? `&countryCode=${filterCountry}` : ''}`),
      api.get('/api/export/campaigns'),
      api.get('/api/export/messages'),
      api.get('/api/export/analytics'),
    ])
    if (c.status === 'fulfilled') setCountries((c.value as any).countries || [])
    if (l.status === 'fulfilled') {
      const leads = (l.value as any).leads
      if (leads !== undefined) setExportLeads(leads || [])
    } else {
      console.error('export-leads failed:', (l as any).reason?.message)
    }
    if (ca.status === 'fulfilled') setCampaigns((ca.value as any).campaigns || [])
    if (m.status === 'fulfilled') setMessages((m.value as any).messages || [])
    if (an.status === 'fulfilled') setAnalytics(an.value)
    setLoading(false)
  }, [filterCountry])

  useEffect(() => { loadAll() }, [loadAll])

  // Auto-poll leads every 15s when a search might be running
  useEffect(() => {
    if (!activeSessionId) return
    const iv = setInterval(() => { loadLeads() }, 5000)
    return () => clearInterval(iv)
  }, [activeSessionId, loadLeads])

  const loadCountryIntel = async (country: any) => {
    setLoadingIntel(true); setCountryIntel(null)
    try { const d: any = await api.get(`/api/export/market-intel/${country.code}`); setCountryIntel(d.country) } catch {}
    setLoadingIntel(false)
  }

  const startSearch = async () => {
    if (!selectedCountry || !sector.trim()) return showMsg('error', 'Ülke seçin ve sektör girin')
    // Add to history
    const key = `${sector} — ${selectedCountry.name}`
    setSearchHistory(prev => [key, ...prev.filter(h => h !== key)].slice(0, 5))
    try {
      const d: any = await api.post('/api/export/start-search', { countryCode: selectedCountry.code, sector })
      setActiveSessionId(d.sessionId || null)
      if (!d.sessionId) showMsg('error', 'Oturum başlatılamadı')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const generateMessage = async (leadId: string) => {
    setGeneratingMsg(leadId)
    try {
      const d: any = await api.post('/api/export/generate-message', { leadId, channel: selectedChannel })
      setInlineMessages(prev => ({ ...prev, [leadId]: d.message }))
    } catch (e: any) { showMsg('error', e.message) }
    setGeneratingMsg(null)
  }

  const createCampaign = async () => {
    if (!selectedLeads.length) return showMsg('error', 'En az 1 alıcı seçin')
    const cc = filterCountry || selectedCountry?.code
    if (!cc) return showMsg('error', 'Ülke seçin')
    try {
      await api.post('/api/export/create-campaign', { name: campaignName, countryCode: cc, leadIds: selectedLeads, channel: selectedChannel })
      showMsg('success', 'Kampanya oluşturuldu!'); loadAll(); setTab('campaigns'); setSelectedLeads([])
    } catch (e: any) { showMsg('error', e.message) }
  }

  const sendCampaign = async (id: string) => {
    try { await api.post(`/api/export/campaigns/${id}/send`, {}); showMsg('success', 'Kampanya başlatıldı!'); loadAll() }
    catch (e: any) { showMsg('error', e.message) }
  }

  // Lead count per country
  const leadsByCountry = exportLeads.reduce((acc: any, l) => {
    acc[l.country_code] = (acc[l.country_code] || 0) + 1; return acc
  }, {})

  const filteredCountries = countries.filter(c => {
    const matchRegion = selectedRegion === 'Tümü' || c.region === selectedRegion
    const matchSearch = !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase())
    return matchRegion && matchSearch
  })

  const leadsWithContact = exportLeads.filter(l => l.email || l.phone)
  const filteredLeads = exportLeads
    .filter(l => !filterCountry || l.country_code === filterCountry)
    .filter(l => !onlyWithContact || (l.email || l.phone))
    .sort((a, b) => ((b.company_score||0) - (a.company_score||0)))

  return (
    <div style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#f0fdf4 65%,#ffffff)', borderRadius: 20, padding: '26px 28px', marginBottom: 18, border: '1px solid #d1fae5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)', backgroundSize: '42px 42px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 22 }}>
          <GlobeOrb size={84} scanning={!!activeSessionId} countryCode={selectedCountry?.code || ''} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: tx1, fontSize: 23, fontWeight: 800, margin: '0 0 5px' }}>{t('export.ihracat_zekasi', 'İhracat Zekası')}</h1>
            <p style={{ color: tx2, fontSize: 13, margin: '0 0 14px' }}>{ET.subtitle}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {[
                { l: t('export.buyers_with_contact','İletişimli Alıcı'), v: leadsWithContact.length, c: accentEmerald },
                { l: t('export.total_buyers','Toplam Alıcı'), v: exportLeads.length, c: tx2 },
                { l: t('export.campaign','Kampanya'), v: campaigns.length, c: '#7c3aed' },
                { l: t('export.target_market','Hedef Pazar'), v: countries.length, c: '#b45309' },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <p style={{ color: m.c, fontSize: 20, fontWeight: 800, margin: 0 }}>{m.v}</p>
                  <p style={{ color: tx2, fontSize: 10, margin: 0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scan progress */}
      {activeSessionId && (
        <div style={{ marginBottom: 14, flexShrink: 0 }}>
          <SearchProgress sessionId={activeSessionId} onComplete={r => { setLastIntel(r); setActiveSessionId(null); loadAll() }} />
        </div>
      )}

      {msg && (
        <div style={{ marginBottom: 12, padding: '10px 16px', background: msg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)'}`, borderRadius: 10, flexShrink: 0 }}>
          <p style={{ color: msg.type === 'success' ? accentEmerald : '#dc2626', fontSize: 12, margin: 0 }}>{msg.text}</p>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: 3, background: surf, padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 18, border: '1px solid #e2e8f0', flexShrink: 0 }}>
        {[
          { id: 'find', label: t('export.buyer_discovery','Alıcı Keşfi'), Icon: Globe },
          { id: 'leads', label: `${t('export.buyers','Alıcı')} (${leadsWithContact.length}📞 / ${exportLeads.length})`, Icon: Users },
          { id: 'campaigns', label: `${t('export.campaigns_tab','Kampanyalar')} (${campaigns.length})`, Icon: Rocket },
          { id: 'messages', label: `${t('export.messages_tab','İletişimler')} (${messages.length})`, Icon: MessageSquare },
          { id: 'analytics', label: t('export.analytics_tab','Analitik'), Icon: BarChart2 },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === tb.id ? `linear-gradient(135deg,${accentTeal},${accentEmerald})` : 'transparent', color: tab === tb.id ? '#fff' : tx2, boxShadow: tab === tb.id ? '0 3px 12px rgba(13,148,136,0.28)' : 'none', whiteSpace: 'nowrap' }}>
            <tb.Icon size={13} />
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── ALICI KEŞFİ ── */}
      {tab === 'find' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {REGIONS.map((r, i) => {
                const trKey = REGIONS_TR[i]  // always compare with Turkish DB value
                const active = selectedRegion === trKey
                return (
                  <button key={r} onClick={() => setSelectedRegion(trKey)}
                    style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? 'rgba(16,185,129,0.45)' : '#e2e8f0'}`, background: active ? 'rgba(16,185,129,0.12)' : 'transparent', color: active ? accentEmerald : tx2, fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
                    {r}
                  </button>
                )
              })}
            </div>
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                placeholder={ET.search_country}
                style={{ ...inp, width: 160, padding: '7px 12px', fontSize: 12, height: 34 }} />
            </div>
          </div>

          {/* ── COUNTRY GRID — Professional Design ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {filteredCountries.map(country => {
              const risk = country.paymentRisk
              const isSelected = selectedCountry?.code === country.code
              const leadCount = leadsByCountry[country.code] || 0
              const oppScore = opportunityScore(country, leadCount)

              return (
                <button key={country.code}
                  onClick={() => { setSelectedCountry(isSelected ? null : country); setLastIntel(null); if (!isSelected) loadCountryIntel(country) }}
                  style={{
                    padding: '16px 16px', borderRadius: 16,
                    border: `1px solid ${isSelected ? 'rgba(16,185,129,0.5)' : '#e2e8f0'}`,
                    background: isSelected
                      ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)'
                      : '#ffffff',
                    cursor: 'pointer', textAlign: 'left', position: 'relative',
                    transition: 'all 0.18s', boxShadow: isSelected ? '0 0 0 1px rgba(16,185,129,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}>

                  {/* Top bar: flag + lead badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', flexShrink: 0 }}>
                      <FlagImg code={country.code} size={40} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {leadCount > 0 && (
                        <span style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', color: accentEmerald, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                          {leadCount} alıcı
                        </span>
                      )}
                      {/* Risk dot */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor(risk?.score || 60) }} />
                        <span style={{ color: riskColor(risk?.score || 60), fontSize: 9, fontWeight: 600 }}>{riskLabel(risk?.score || 60, TRUST)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Country name + currency */}
                  <p style={{ color: tx1, fontSize: 14, fontWeight: 700, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{country.name}</p>
                  <p style={{ color: tx2, fontSize: 11, margin: '0 0 10px' }}>{country.currency} · {country.region}</p>

                  {/* Opportunity bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: tx2, fontSize: 9 }}>{t('export.opportunity_score','Fırsat Skoru')}</span>
                      <span style={{ color: oppScore >= 75 ? accentEmerald : oppScore >= 55 ? '#b45309' : '#dc2626', fontSize: 9, fontWeight: 700 }}>{oppScore}</span>
                    </div>
                    <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${oppScore}%`, background: oppScore >= 75 ? 'linear-gradient(90deg,#10b981,#34d399)' : oppScore >= 55 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: 2, transition: 'width 0.6s' }} />
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, color: accentEmerald }}>
                      <CheckCircle size={11} />
                      <span style={{ fontSize: 10, fontWeight: 600 }}>{t('export.secildi', 'Seçildi')}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search form */}
          {selectedCountry && !activeSessionId && (
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', flexShrink: 0 }}>
                  <FlagImg code={selectedCountry.code} size={52} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: tx1, fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>{selectedCountry.name}'de Alıcı Bul</h3>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {countryIntel?.paymentRisk && (
                      <span style={{ fontSize: 11, color: riskColor(countryIntel.paymentRisk.score) }}>
                        ● {countryIntel.paymentRisk.label} ödeme riski ({countryIntel.paymentRisk.dso} gün)
                      </span>
                    )}
                    {countryIntel?.totalExportsUSD > 0 && (
                      <span style={{ fontSize: 11, color: tx2 }}>· TR→{selectedCountry.name}: {fmtUSD(countryIntel.totalExportsUSD)}/yıl</span>
                    )}
                    {loadingIntel && <RefreshCw size={11} color={tx2} style={{ animation: 'exp-spin 1s linear infinite' }} />}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input value={sector} onChange={e => setSector(e.target.value)} onKeyDown={e => e.key === 'Enter' && startSearch()}
                  placeholder={`${selectedCountry.name}'de hangi sektörde alıcı arıyorsunuz?`}
                  style={{ ...inp, flex: 1 }} />
                <button onClick={startSearch} disabled={!!activeSessionId || !sector.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${accentTeal},${accentEmerald})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: !!activeSessionId || !sector.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(13,148,136,0.25)', flexShrink: 0, opacity: !!activeSessionId || !sector.trim() ? 0.6 : 1 }}>
                  <Search size={14} /> Alıcı Bul
                </button>
              </div>

              {/* Search history */}
              {searchHistory.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: tx2, fontSize: 10, alignSelf: 'center' }}>Son aramalar:</span>
                  {searchHistory.map(h => (
                    <button key={h} onClick={() => setSector(h.split(' — ')[0])}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, border: '1px solid #e2e8f0', background: surf, color: tx2, fontSize: 10, cursor: 'pointer' }}>
                      <Clock size={9} /> {h.split(' — ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Market intel from last search */}
          {lastIntel && selectedCountry && <MarketPanel intel={lastIntel} country={selectedCountry} />}

          {/* Country stats quick view */}
          {exportLeads.length > 0 && !selectedCountry && (
            <div style={{ ...card, padding: '16px 18px' }}>
              <p style={{ color: tx2, fontSize: 11, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{t('export.mevcut_alici_dagilimi', 'Mevcut Alıcı Dağılımı')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {Object.entries(leadsByCountry).slice(0, 8).map(([code, count]: any) => {
                  const c = countries.find(x => x.code === code)
                  return (
                    <button key={code} onClick={() => { setFilterCountry(code === filterCountry ? '' : code); setTab('leads') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: surf, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left' }}>
                      <FlagImg code={code} size={24} />
                      <div><p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0 }}>{count}</p><p style={{ color: tx2, fontSize: 10, margin: 0 }}>{c?.name || code}</p></div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALICI LİSTESİ ── */}
      {tab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={loadAll} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'1px solid rgba(5,150,105,0.3)', background:'rgba(5,150,105,0.08)', color:accentEmerald, fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
              <RefreshCw size={12} style={{ animation:loading?'exp-spin 1s linear infinite':'none' }} /> Yenile
            </button>
            {/* Contact filter toggle */}
            <button onClick={() => setOnlyWithContact(!onlyWithContact)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:`1px solid ${onlyWithContact?'rgba(5,150,105,0.45)':'#e2e8f0'}`, background:onlyWithContact?'rgba(5,150,105,0.12)':'transparent', color:onlyWithContact?accentEmerald:tx2, fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
              <Phone size={11} /> {onlyWithContact ? `${t('export.buyers_contact','İletişimli')} (${leadsWithContact.filter(l=>!filterCountry||l.country_code===filterCountry).length})` : 'Tümü'}
            </button>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ ...inp, height: 40, cursor: 'pointer' }}>
              <option value="">Tüm Pazarlar ({exportLeads.length})</option>
              {[...new Set(exportLeads.map(l => l.country_code))].map(code => {
                const c = countries.find(x => x.code === code)
                const count = exportLeads.filter(l => l.country_code === code).length
                return <option key={code} value={code}>{c?.name || code} ({count})</option>
              })}
            </select>
            <div style={{ display: 'flex', gap: 5 }}>
              {CHANNELS.map(ch => (
                <button key={ch.key} onClick={() => setSelectedChannel(ch.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${selectedChannel === ch.key ? ch.color + '50' : '#e2e8f0'}`, background: selectedChannel === ch.key ? `${ch.color}14` : 'transparent', color: selectedChannel === ch.key ? ch.color : tx2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <ch.icon size={12} /> {ch.label}
                </button>
              ))}
            </div>
            {selectedLeads.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                <span style={{ color: tx2, fontSize: 12 }}>{selectedLeads.length} seçili</span>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder={t('export.kampanya_adi', 'Kampanya adı')} style={{ ...inp, width: 180, height: 36, fontSize: 12 }} />
                <button onClick={createCampaign}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${accentTeal},${accentEmerald})`, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <Zap size={12} /> Kampanya Oluştur
                </button>
              </div>
            )}
          </div>

          {filteredLeads.length === 0 ? (
            <div style={{ ...card, padding: 52, textAlign: 'center' }}>
              <Globe size={40} color={tx3} style={{ marginBottom: 14 }} />
              <h3 style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>{t('export.alici_listesi_bos', 'Alıcı listesi boş')}</h3>
              <p style={{ color: tx2, fontSize: 13, margin: '0 0 20px' }}>{t('export.hedef_pazari_ve_sektoru_s', 'Hedef pazarı ve sektörü seçerek alıcı aramasını başlatın')}</p>
              <button onClick={() => setTab('find')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${accentTeal},${accentEmerald})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Alıcı Bul <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredLeads.map(lead => {
                const country = countries.find(c => c.code === lead.country_code)
                const isSel = selectedLeads.includes(lead.id)
                const hasMsg = inlineMessages[lead.id]
                const existingMsg = messages.find(m => m.lead_id === lead.id && m.channel === selectedChannel)
                const score = lead.company_score || 0

                return (
                  <div key={lead.id} style={{ ...card, padding: '14px 16px', border: `1px solid ${isSel ? 'rgba(5,150,105,0.32)' : '#e2e8f0'}`, background: isSel ? 'linear-gradient(135deg,#ecfdf5,#ffffff)' : '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div role="checkbox" aria-checked={isSel} tabIndex={0}
                        onClick={() => setSelectedLeads(p => isSel ? p.filter(x => x !== lead.id) : [...p, lead.id])}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLeads(p => isSel ? p.filter(x => x !== lead.id) : [...p, lead.id]) } }}
                        style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSel ? accentEmerald : '#cbd5e1'}`, background: isSel ? 'rgba(5,150,105,0.18)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSel && <CheckCircle size={12} color={accentEmerald} />}
                      </div>

                      {/* Score circle */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `rgba(${score >= 60 ? '5,150,105' : score >= 35 ? '180,83,9' : '220,38,38'},0.1)`, border: `1px solid rgba(${score >= 60 ? '5,150,105' : score >= 35 ? '180,83,9' : '220,38,38'},0.25)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: score >= 60 ? accentEmerald : score >= 35 ? '#b45309' : '#dc2626', fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{score}</span>
                        <span style={{ color: tx3, fontSize: 7, lineHeight: 1 }}>skor</span>
                      </div>

                      {/* Flag */}
                      <div style={{ flexShrink: 0 }}>
                        <FlagImg code={lead.country_code || 'TR'} size={28} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                          <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
                          {lead.verified_importer && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.28)', color: accentEmerald, fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}><CheckCircle size={9} /> {t('export.dogrulandi', 'Doğrulandı')}</span>}
                          {lead.decision_maker_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.22)', color: '#7c3aed', fontSize: 9, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}><UserCheck size={9} /> KV Bulundu</span>}
                          {(hasMsg || existingMsg) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.22)', color: accentTeal, fontSize: 9, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}><MessageCircle size={9} /> {t('export.hazir', 'Hazır')}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: tx2 }}>{country?.name || lead.country}</span>
                          {lead.sector && <span style={{ color: tx2 }}>· {lead.sector}</span>}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} style={{ display:'flex', alignItems:'center', gap:3, color: accentEmerald, textDecoration:'none', fontWeight:600, background:'rgba(5,150,105,0.1)', padding:'2px 7px', borderRadius:6 }}>
                              <Phone size={10} /> {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} style={{ display:'flex', alignItems:'center', gap:3, color:'#2563eb', textDecoration:'none', fontWeight:600, background:'rgba(37,99,235,0.1)', padding:'2px 7px', borderRadius:6 }}>
                              <Mail size={10} /> {lead.email}
                            </a>
                          )}
                          {lead.website && <a href={lead.website.startsWith('http')?lead.website:`https://${lead.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: tx2, textDecoration:'none', fontSize:10 }}><Link2 size={10} /> Site ↗</a>}
                          {!lead.phone && !lead.email && <span style={{ color: tx3, fontSize:10 }}>{t('export.iletisim_bilgisi_yok', 'İletişim bilgisi yok')}</span>}
                        </div>
                        {lead.decision_maker_name && (
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color:'#7c3aed', fontSize:10, background:'rgba(124,58,237,0.1)', padding:'2px 7px', borderRadius:6 }}>
                              <User size={10} /> {lead.decision_maker_name}{lead.decision_maker_title?` — ${lead.decision_maker_title}`:''}
                            </span>
                            {lead.decision_maker_linkedin && <a href={lead.decision_maker_linkedin} target="_blank" rel="noopener noreferrer" style={{ color:'#0284c7', textDecoration:'none', fontSize:10 }}>LinkedIn ↗</a>}
                          </div>
                        )}
                      </div>

                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        {/* Lead detail page — router.push to avoid auth redirect */}
                        <button onClick={() => router.push(`/leads/${lead.id}`)}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, border:'1px solid #e2e8f0', background: surf, color: tx2, fontSize:11, cursor:'pointer' }}
                          title={t('export.lead_detayini_ac', 'Lead detayını aç')}>
                          <ExternalLink size={11} />
                        </button>
                        <button onClick={() => generateMessage(lead.id)} disabled={generatingMsg === lead.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(5,150,105,0.22)', background: 'rgba(5,150,105,0.07)', color: accentEmerald, fontSize: 11, cursor: 'pointer' }}>
                          {generatingMsg === lead.id ? <RefreshCw size={11} style={{ animation: 'exp-spin 1s linear infinite' }} /> : <MessageSquare size={11} />}
                          Mesaj Yaz
                        </button>
                      </div>
                    </div>

                    {(hasMsg || existingMsg) && (
                      <div style={{ marginTop: 10, padding: '12px 14px', background: surf, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                        {(hasMsg || existingMsg)?.subject && <p style={{ color: tx2, fontSize: 11, margin: '0 0 5px' }}>Konu: <span style={{ color: tx2 }}>{(hasMsg || existingMsg).subject}</span></p>}
                        <p style={{ color: tx1, fontSize: 12, margin: 0, lineHeight: 1.7 }}>{(hasMsg || existingMsg)?.body}</p>
                        <button onClick={() => navigator.clipboard?.writeText((hasMsg || existingMsg)?.body || '')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: tx2, fontSize: 10, cursor: 'pointer' }}>
                          <Copy size={10} /> Kopyala
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── KAMPANYALAR ── */}
      {tab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {campaigns.length === 0 ? (
            <div style={{ ...card, padding: 52, textAlign: 'center' }}>
              <Rocket size={36} color={tx3} style={{ marginBottom: 14 }} />
              <p style={{ color: tx2, fontSize: 14, margin: '0 0 8px' }}>Kampanya yok</p>
              <p style={{ color: tx2, fontSize: 12, margin: '0 0 18px' }}>{t('export.alicilar_sekmesinden_alic', 'Alıcılar sekmesinden alıcıları seçip kampanya oluşturun')}</p>
              <button onClick={() => setTab('leads')} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${accentTeal},${accentEmerald})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Alıcı Listesi
              </button>
            </div>
          ) : campaigns.map(camp => {
            const country = countries.find(x => x.code === camp.country_code)
            const ch = CHANNELS.find(x => x.key === camp.channel)
            const sColors: Record<string, string> = { completed: accentEmerald, running: '#2563eb', draft: tx2, failed: '#dc2626' }
            const sLabels: Record<string, string> = { completed: 'Tamamlandı', running: 'Gönderiliyor', draft: 'Taslak', failed: 'Hata' }
            return (
              <div key={camp.id} style={{ ...card, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flexShrink: 0 }}><FlagImg code={camp.country_code || 'TR'} size={36} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <h3 style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0 }}>{camp.name}</h3>
                      <span style={{ background: `${sColors[camp.status] || tx2}16`, border: `1px solid ${sColors[camp.status] || tx2}30`, color: sColors[camp.status] || tx2, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {sLabels[camp.status] || camp.status}
                      </span>
                      {ch && <span style={{ background: `${ch.color}14`, border: `1px solid ${ch.color}22`, color: ch.color, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{ch.label}</span>}
                    </div>
                    <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{country?.name} · {camp.lead_count} alıcı{camp.sent_count ? ` · ${camp.sent_count} gönderildi` : ''} · {new Date(camp.created_at).toLocaleDateString()}</p>
                  </div>
                  {camp.status === 'draft' && (
                    <button onClick={() => sendCampaign(camp.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${accentTeal},${accentEmerald})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      <Play size={13} /> Gönder
                    </button>
                  )}
                  {camp.status === 'running' && <div style={{ color: '#2563eb', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} style={{ animation: 'exp-spin 1s linear infinite' }} />{t('export.gonderiliyor', 'Gönderiliyor...')}</div>}
                </div>
                {camp.status === 'running' && camp.lead_count > 0 && (
                  <div style={{ marginTop: 12, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.round((camp.sent_count || 0) / camp.lead_count * 100)}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 2 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── İLETİŞİMLER ── */}
      {tab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: tx2 }}>
              <MessageSquare size={28} style={{ margin: '0 auto 12px', display: 'block', color: tx3 }} />
              <p style={{ fontSize: 13, margin: '0 0 6px', color: tx2 }}>{t('export.hazir_iletisim_yok', 'Hazır iletişim yok')}</p>
              <p style={{ fontSize: 11, margin: 0 }}>{t('export.alicilar_sekmesinde_mesaj', 'Alıcılar sekmesinde "Mesaj Yaz" butonunu kullanın')}</p>
            </div>
          ) : messages.map(m => {
            const country = countries.find(c => c.code === m.country_code)
            const ch = CHANNELS.find(c => c.key === m.channel)
            const sColors: Record<string, string> = { sent: accentEmerald, draft: tx2, failed: '#dc2626' }
            const sIcons: Record<string, any> = { sent: CheckCircle, draft: FileEdit, failed: XCircle }
            const sLabels: Record<string, string> = { sent: 'Gönderildi', draft: 'Hazır', failed: 'Hata' }
            const SIcon = sIcons[m.status] || FileEdit
            return (
              <div key={m.id} style={{ ...card, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: m.body ? 10 : 0 }}>
                  <div style={{ flexShrink: 0 }}><FlagImg code={m.country_code || 'TR'} size={28} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: 0 }}>{m.leads?.company_name || '—'}</p>
                      {ch && <span style={{ color: ch.color, fontSize: 10 }}>{ch.label}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${sColors[m.status] || tx2}14`, color: sColors[m.status] || tx2, fontSize: 10, padding: '2px 6px', borderRadius: 20 }}>
                        <SIcon size={10} /> {sLabels[m.status] || m.status}
                      </span>
                    </div>
                    {m.subject && <p style={{ color: tx2, fontSize: 11, margin: '3px 0 0' }}>Konu: <span style={{ color: tx2 }}>{m.subject}</span></p>}
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(m.body || '')}
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'transparent', color: tx2, cursor: 'pointer', flexShrink: 0 }}>
                    <Copy size={12} />
                  </button>
                </div>
                {m.body && <p style={{ color: tx2, fontSize: 12, margin: 0, lineHeight: 1.7, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>{m.body.substring(0, 320)}{m.body.length > 320 ? '...' : ''}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── ANALİTİK ── */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { l: t('export.total_buyers','Toplam Alıcı'), v: analytics?.totalLeads || 0, c: accentEmerald, Icon: Users },
              { l: 'Kampanya', v: analytics?.totalCampaigns || 0, c: '#7c3aed', Icon: Rocket },
              { l: 'Hazır İletişim', v: analytics?.totalMessages || 0, c: accentTeal, Icon: MessageCircle },
              { l: 'Gönderilen', v: analytics?.sentMessages || 0, c: '#b45309', Icon: Send },
            ].map(m => (
              <div key={m.l} style={{ ...card, padding: '18px 16px', textAlign: 'center' }}>
                <m.Icon size={22} color={m.c} style={{ marginBottom: 6 }} />
                <p style={{ color: m.c, fontSize: 26, fontWeight: 900, margin: 0 }}>{m.v}</p>
                <p style={{ color: tx2, fontSize: 11, margin: '4px 0 0' }}>{m.l}</p>
              </div>
            ))}
          </div>

          {analytics?.byCountry?.length > 0 && (
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ color: tx1, fontSize: 13, fontWeight: 700, margin: '0 0 16px' }}>{t('export.pazar_dagilimi', 'Pazar Dağılımı')}</h3>
              {analytics.byCountry.map((r: any) => {
                const c = countries.find(x => x.code === r.country_code)
                const pct = analytics.totalLeads > 0 ? Math.round((r.leads / analytics.totalLeads) * 100) : 0
                return (
                  <div key={r.country} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlagImg code={r.country_code || 'TR'} size={20} />
                        <span style={{ color: tx2, fontSize: 12 }}>{r.country}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ color: tx2, fontSize: 11 }}>{r.leads} alıcı</span>
                        {r.converted > 0 && <span style={{ color: accentEmerald, fontSize: 11, fontWeight: 700 }}>%{r.convRate} dönüşüm</span>}
                      </div>
                    </div>
                    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ color: tx1, fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>{t('export.platform_kapsami', 'Platform Kapsamı')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { label: t('export.target_market','Hedef Pazar'), value: `${countries.length} ülke`, Icon: Globe, c: accentEmerald },
                { label: 'Arama Kapasitesi', value: 'Sınırsız', Icon: Search, c: '#7c3aed' },
                { label: t('Dil Desteği','Dil Desteği'), value: '11 dil', Icon: Globe2, c: accentTeal },
                { label: t('Kişisel Mesaj','Kişisel Mesaj'), value: 'AI Destekli', Icon: PenLine, c: '#b45309' },
              ].map(item => (
                <div key={item.label} style={{ background: `${item.c}0d`, border: `1px solid ${item.c}28`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <item.Icon size={22} color={item.c} />
                  <div>
                    <p style={{ color: item.c, fontWeight: 700, fontSize: 14, margin: 0 }}>{item.value}</p>
                    <p style={{ color: tx2, fontSize: 11, margin: '2px 0 0' }}>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes exp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
