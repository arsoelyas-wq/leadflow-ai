'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Search, RefreshCw, MessageSquare, Mail, CheckCircle, X, Copy, Play, ArrowRight, Zap, ExternalLink, TrendingUp, Clock, ChevronRight, Star } from 'lucide-react'

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
    <div style={{ width: size, height: h, borderRadius: 4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
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
const REGIONS = ['Tümü', 'Avrupa', 'Körfez', 'Amerika', 'Orta Asya', 'Asya', 'Afrika']
const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#10b981' },
  { key: 'email',    label: 'E-posta',  icon: Mail,          color: '#3b82f6' },
  { key: 'linkedin', label: 'Mesaj',    icon: ExternalLink,  color: '#8b5cf6' },
]

function riskColor(s: number) {
  if (s >= 85) return '#10b981'; if (s >= 70) return '#34d399'
  if (s >= 55) return '#f59e0b'; if (s >= 40) return '#f97316'; return '#ef4444'
}
function riskLabel(s: number) {
  if (s >= 85) return 'Çok Güvenli'; if (s >= 70) return 'Güvenli'
  if (s >= 55) return 'Orta'; if (s >= 40) return 'Dikkatli'; return 'Riskli'
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
  const [step, setStep] = useState('Başlatılıyor...')
  const [status, setStatus] = useState('running')
  const [found, setFound] = useState(0)
  const STEPS: Record<string, string> = {
    starting: '⚡ Başlatılıyor...', hs_codes: '📋 Ürün kategorileri belirleniyor...',
    market_data: '📊 Pazar büyüklüğü analiz ediliyor...', market_intelligence: '📊 Pazar analizi...',
    merging_results: '🔀 Sonuçlar derleniyor...', finding_importers: '🔍 Potansiyel alıcılar taranıyor...',
    enriching_contacts: '📋 Şirket profilleri oluşturuluyor...', researching_companies: '🔬 Alıcılar doğrulanıyor...',
    saving_results: '💾 Alıcı listesi kaydediliyor...', done: '✅ Tamamlandı!',
  }
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const d: any = await api.get(`/api/export/search-session/${sessionId}/status`)
        setProgress(d.progress || 0); setStep(STEPS[d.step] || d.step || '...'); setStatus(d.status); setFound(d.importersFound || 0)
        if (d.status === 'completed' || d.status === 'failed') { clearInterval(iv); if (d.status === 'completed') setTimeout(() => onComplete(d), 800) }
      } catch { clearInterval(iv) }
    }, 2800)
    return () => clearInterval(iv)
  }, [sessionId])

  if (status === 'completed') return (
    <div style={{ padding: '14px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <CheckCircle size={16} color="#10b981" />
      <p style={{ color: '#34d399', fontSize: 13, margin: 0, fontWeight: 600 }}>✅ {found} yeni alıcı bulundu — liste güncelleniyor...</p>
    </div>
  )
  if (status === 'failed') return (
    <div style={{ padding: '12px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12 }}>
      <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>❌ Arama tamamlanamadı — lütfen tekrar deneyin</p>
    </div>
  )
  return (
    <div style={{ padding: '16px 20px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={13} color="#10b981" style={{ animation: 'exp-spin 1s linear infinite' }} />
          <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>{step}</span>
        </div>
        <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>{progress}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 2, transition: 'width 0.5s', boxShadow: '0 0 8px rgba(16,185,129,0.4)' }} />
      </div>
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
            { l: 'Toplam Pazar', v: fmtUSD(marketIntel.marketSizeUSD), c: '#8b5cf6' },
            { l: 'TR İhracatı', v: fmtUSD(marketIntel.turkeyExportsUSD), c: '#f59e0b' },
            { l: 'TR Pazar Payı', v: `%${marketIntel.turkeySharePct}`, c: marketIntel.turkeySharePct > 5 ? '#10b981' : '#f97316' },
            { l: 'Yıllık Değişim', v: marketIntel.yoyGrowthPct >= 0 ? `+%${marketIntel.yoyGrowthPct}` : `%${marketIntel.yoyGrowthPct}`, c: marketIntel.yoyGrowthPct >= 0 ? '#10b981' : '#ef4444' },
          ].map(m => (
            <div key={m.l} style={{ background: 'rgba(3,8,22,0.97)', border: `1px solid ${m.c}18`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ color: m.c, fontSize: 18, fontWeight: 800, margin: 0 }}>{m.v}</p>
              <p style={{ color: '#475569', fontSize: 10, margin: '3px 0 0' }}>{m.l}</p>
            </div>
          ))}
        </div>
      )}
      {marketIntel?.hsCodes?.length > 0 && (
        <div style={{ background: 'rgba(3,8,22,0.97)', border: '1px solid rgba(139,92,246,0.14)', borderRadius: 12, padding: '12px 16px' }}>
          <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Ürün Sınıflandırması</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {marketIntel.hsCodes.map((code: string, i: number) => (
              <span key={code} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)', color: '#a78bfa', fontSize: 11, padding: '4px 10px', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700 }}>
                {code}{marketIntel.hsCodeNames?.[i] && <span style={{ fontFamily: 'inherit', color: '#64748b', fontWeight: 400 }}> — {marketIntel.hsCodeNames[i]}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {paymentRisk && (
          <div style={{ background: 'rgba(3,8,22,0.97)', border: `1px solid ${riskColor(paymentRisk.score)}18`, borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Tahsilat Güvenilirliği</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${riskColor(paymentRisk.score)}15`, border: `2px solid ${riskColor(paymentRisk.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: riskColor(paymentRisk.score), fontWeight: 900, fontSize: 15 }}>{paymentRisk.score}</span>
              </div>
              <div>
                <p style={{ color: riskColor(paymentRisk.score), fontWeight: 700, fontSize: 13, margin: 0 }}>{paymentRisk.label} Risk</p>
                <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Ort. tahsilat: {paymentRisk.dso} gün</p>
                <p style={{ color: '#334155', fontSize: 10, margin: '3px 0 0', lineHeight: 1.4 }}>{paymentRisk.notes}</p>
              </div>
            </div>
          </div>
        )}
        {culturalIntel && (
          <div style={{ background: 'rgba(3,8,22,0.97)', border: '1px solid rgba(245,158,11,0.14)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>İş Yapma Rehberi</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 5px' }}>⏰ {culturalIntel.timing}</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>💡 {culturalIntel.tip}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ANA SAYFA ─────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const [tab, setTab] = useState<'find' | 'leads' | 'campaigns' | 'messages' | 'analytics'>('find')
  const [countries, setCountries] = useState<any[]>([])
  const [exportLeads, setExportLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<any>(null)
  const [selectedRegion, setSelectedRegion] = useState('Tümü')
  const [sector, setSector] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedChannel, setSelectedChannel] = useState('whatsapp')
  const [campaignName, setCampaignName] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [lastIntel, setLastIntel] = useState<any>(null)
  const [generatingMsg, setGeneratingMsg] = useState<string | null>(null)
  const [inlineMessages, setInlineMessages] = useState<Record<string, any>>({})
  const [filterCountry, setFilterCountry] = useState('')
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

  const filteredLeads = filterCountry ? exportLeads.filter(l => l.country_code === filterCountry) : exportLeads
  const card = { background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 } as const
  const inp = { background: '#060a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,14,6,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '26px 28px', marginBottom: 18, border: '1px solid rgba(16,185,129,0.18)', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.018) 1px,transparent 1px)', backgroundSize: '42px 42px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 22 }}>
          <GlobeOrb size={84} scanning={!!activeSessionId} countryCode={selectedCountry?.code || ''} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 23, fontWeight: 800, margin: '0 0 5px' }}>İhracat Zekası</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>Hedef pazarda doğrulanmış alıcılar · Karar verici isim ve iletişim · Yerel dilde kişiselleştirilmiş mesaj</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {[
                { l: 'Alıcı', v: exportLeads.length, c: '#10b981' },
                { l: 'Kampanya', v: campaigns.length, c: '#8b5cf6' },
                { l: 'İletişim', v: messages.length, c: '#06b6d4' },
                { l: 'Hedef Pazar', v: countries.length, c: '#f59e0b' },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <p style={{ color: m.c, fontSize: 20, fontWeight: 800, margin: 0 }}>{m.v}</p>
                  <p style={{ color: '#334155', fontSize: 10, margin: 0 }}>{m.l}</p>
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
          <p style={{ color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: 12, margin: 0 }}>{msg.text}</p>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.32)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 18, border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        {[
          { id: 'find', label: '🌍 Alıcı Keşfi' },
          { id: 'leads', label: `👥 Alıcı Listesi (${exportLeads.length})` },
          { id: 'campaigns', label: `🚀 Kampanyalar (${campaigns.length})` },
          { id: 'messages', label: `💬 İletişimler (${messages.length})` },
          { id: 'analytics', label: '📊 Analitik' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === t.id ? 'linear-gradient(135deg,#065f46,#10b981)' : 'transparent', color: tab === t.id ? '#fff' : '#64748b', boxShadow: tab === t.id ? '0 3px 12px rgba(16,185,129,0.28)' : 'none', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ALICI KEŞFİ ── */}
      {tab === 'find' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {REGIONS.map(r => (
                <button key={r} onClick={() => setSelectedRegion(r)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${selectedRegion === r ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.07)'}`, background: selectedRegion === r ? 'rgba(16,185,129,0.14)' : 'transparent', color: selectedRegion === r ? '#34d399' : '#64748b', fontSize: 12, fontWeight: selectedRegion === r ? 700 : 400, cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                placeholder="Ülke ara..."
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
                    border: `1px solid ${isSelected ? 'rgba(16,185,129,0.55)' : 'rgba(255,255,255,0.07)'}`,
                    background: isSelected
                      ? 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,78,59,0.15))'
                      : 'linear-gradient(135deg,rgba(4,10,26,0.9),rgba(5,8,20,0.95))',
                    cursor: 'pointer', textAlign: 'left', position: 'relative',
                    transition: 'all 0.18s', boxShadow: isSelected ? '0 0 0 1px rgba(16,185,129,0.3)' : 'none',
                  }}>

                  {/* Top bar: flag + lead badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', flexShrink: 0 }}>
                      <FlagImg code={country.code} size={40} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {leadCount > 0 && (
                        <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                          {leadCount} alıcı
                        </span>
                      )}
                      {/* Risk dot */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor(risk?.score || 60) }} />
                        <span style={{ color: riskColor(risk?.score || 60), fontSize: 9, fontWeight: 600 }}>{riskLabel(risk?.score || 60)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Country name + currency */}
                  <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{country.name}</p>
                  <p style={{ color: '#475569', fontSize: 11, margin: '0 0 10px' }}>{country.currency} · {country.region}</p>

                  {/* Opportunity bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#334155', fontSize: 9 }}>Fırsat Skoru</span>
                      <span style={{ color: oppScore >= 75 ? '#10b981' : oppScore >= 55 ? '#f59e0b' : '#ef4444', fontSize: 9, fontWeight: 700 }}>{oppScore}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${oppScore}%`, background: oppScore >= 75 ? 'linear-gradient(90deg,#10b981,#34d399)' : oppScore >= 55 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: 2, transition: 'width 0.6s' }} />
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, color: '#34d399' }}>
                      <CheckCircle size={11} />
                      <span style={{ fontSize: 10, fontWeight: 600 }}>Seçildi</span>
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
                <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', flexShrink: 0 }}>
                  <FlagImg code={selectedCountry.code} size={52} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>{selectedCountry.name}'de Alıcı Bul</h3>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {countryIntel?.paymentRisk && (
                      <span style={{ fontSize: 11, color: riskColor(countryIntel.paymentRisk.score) }}>
                        ● {countryIntel.paymentRisk.label} ödeme riski ({countryIntel.paymentRisk.dso} gün)
                      </span>
                    )}
                    {countryIntel?.totalExportsUSD > 0 && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>· TR→{selectedCountry.name}: {fmtUSD(countryIntel.totalExportsUSD)}/yıl</span>
                    )}
                    {loadingIntel && <RefreshCw size={11} color="#334155" style={{ animation: 'exp-spin 1s linear infinite' }} />}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input value={sector} onChange={e => setSector(e.target.value)} onKeyDown={e => e.key === 'Enter' && startSearch()}
                  placeholder={`${selectedCountry.name}'de hangi sektörde alıcı arıyorsunuz?`}
                  style={{ ...inp, flex: 1 }} />
                <button onClick={startSearch} disabled={!!activeSessionId || !sector.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: !!activeSessionId || !sector.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)', flexShrink: 0, opacity: !!activeSessionId || !sector.trim() ? 0.6 : 1 }}>
                  <Search size={14} /> Alıcı Bul
                </button>
              </div>

              {/* Search history */}
              {searchHistory.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: '#334155', fontSize: 10, alignSelf: 'center' }}>Son aramalar:</span>
                  {searchHistory.map(h => (
                    <button key={h} onClick={() => setSector(h.split(' — ')[0])}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>
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
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Mevcut Alıcı Dağılımı</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {Object.entries(leadsByCountry).slice(0, 8).map(([code, count]: any) => {
                  const c = countries.find(x => x.code === code)
                  return (
                    <button key={code} onClick={() => { setFilterCountry(code === filterCountry ? '' : code); setTab('leads') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', textAlign: 'left' }}>
                      <FlagImg code={code} size={24} />
                      <div><p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{count}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{c?.name || code}</p></div>
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
            <button onClick={loadAll} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.08)', color:'#34d399', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
              <RefreshCw size={12} style={{ animation:loading?'exp-spin 1s linear infinite':'none' }} /> Yenile
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
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${selectedChannel === ch.key ? ch.color + '50' : 'rgba(255,255,255,0.08)'}`, background: selectedChannel === ch.key ? `${ch.color}14` : 'transparent', color: selectedChannel === ch.key ? ch.color : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <ch.icon size={12} /> {ch.label}
                </button>
              ))}
            </div>
            {selectedLeads.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>{selectedLeads.length} seçili</span>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Kampanya adı" style={{ ...inp, width: 180, height: 36, fontSize: 12 }} />
                <button onClick={createCampaign}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <Zap size={12} /> Kampanya Oluştur
                </button>
              </div>
            )}
          </div>

          {filteredLeads.length === 0 ? (
            <div style={{ ...card, padding: 52, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🌍</div>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Alıcı listesi boş</h3>
              <p style={{ color: '#475569', fontSize: 13, margin: '0 0 20px' }}>Hedef pazarı ve sektörü seçerek alıcı aramasını başlatın</p>
              <button onClick={() => setTab('find')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
                  <div key={lead.id} style={{ ...card, padding: '14px 16px', border: `1px solid ${isSel ? 'rgba(16,185,129,0.32)' : 'rgba(255,255,255,0.06)'}`, background: isSel ? 'rgba(16,185,129,0.04)' : 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div onClick={() => setSelectedLeads(p => isSel ? p.filter(x => x !== lead.id) : [...p, lead.id])}
                        style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSel ? '#10b981' : 'rgba(255,255,255,0.15)'}`, background: isSel ? 'rgba(16,185,129,0.18)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSel && <CheckCircle size={12} color="#10b981" />}
                      </div>

                      {/* Score circle */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `rgba(${score >= 60 ? '16,185,129' : score >= 35 ? '245,158,11' : '239,68,68'},0.1)`, border: `1px solid rgba(${score >= 60 ? '16,185,129' : score >= 35 ? '245,158,11' : '239,68,68'},0.25)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: score >= 60 ? '#10b981' : score >= 35 ? '#f59e0b' : '#ef4444', fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{score}</span>
                        <span style={{ color: '#334155', fontSize: 7, lineHeight: 1 }}>skor</span>
                      </div>

                      {/* Flag */}
                      <div style={{ flexShrink: 0 }}>
                        <FlagImg code={lead.country_code || 'TR'} size={28} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
                          {lead.verified_importer && <span style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#34d399', fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>✅ Doğrulandı</span>}
                          {lead.decision_maker_name && <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)', color: '#a78bfa', fontSize: 9, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>👤 KV Bulundu</span>}
                          {(hasMsg || existingMsg) && <span style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.22)', color: '#22d3ee', fontSize: 9, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>💬 Hazır</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#475569', flexWrap: 'wrap' }}>
                          <span>{country?.name || lead.country}</span>
                          {lead.sector && <span>· {lead.sector}</span>}
                          {lead.phone && <span style={{ color: '#10b981' }}>· 📞 {lead.phone}</span>}
                          {lead.email && <span style={{ color: '#3b82f6' }}>· ✉️ {lead.email}</span>}
                          {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: '#334155', textDecoration: 'none' }}>· 🔗 Site</a>}
                          {lead.decision_maker_name && <span style={{ color: '#8b5cf6' }}>· 👤 {lead.decision_maker_name}{lead.decision_maker_title ? ` (${lead.decision_maker_title})` : ''}</span>}
                          {lead.decision_maker_linkedin && <a href={lead.decision_maker_linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: 10 }}>LinkedIn ↗</a>}
                        </div>
                      </div>

                      <button onClick={() => generateMessage(lead.id)} disabled={generatingMsg === lead.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.22)', background: 'rgba(16,185,129,0.07)', color: '#34d399', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                        {generatingMsg === lead.id ? <RefreshCw size={11} style={{ animation: 'exp-spin 1s linear infinite' }} /> : <MessageSquare size={11} />}
                        Mesaj Yaz
                      </button>
                    </div>

                    {(hasMsg || existingMsg) && (
                      <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                        {(hasMsg || existingMsg)?.subject && <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 5px' }}>Konu: <span style={{ color: '#94a3b8' }}>{(hasMsg || existingMsg).subject}</span></p>}
                        <p style={{ color: '#e2e8f0', fontSize: 12, margin: 0, lineHeight: 1.7 }}>{(hasMsg || existingMsg)?.body}</p>
                        <button onClick={() => navigator.clipboard?.writeText((hasMsg || existingMsg)?.body || '')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>
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
              <div style={{ fontSize: 36, marginBottom: 14 }}>🚀</div>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 8px' }}>Kampanya yok</p>
              <p style={{ color: '#475569', fontSize: 12, margin: '0 0 18px' }}>Alıcılar sekmesinden alıcıları seçip kampanya oluşturun</p>
              <button onClick={() => setTab('leads')} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Alıcı Listesi
              </button>
            </div>
          ) : campaigns.map(camp => {
            const country = countries.find(x => x.code === camp.country_code)
            const ch = CHANNELS.find(x => x.key === camp.channel)
            const sColors: Record<string, string> = { completed: '#10b981', running: '#3b82f6', draft: '#64748b', failed: '#ef4444' }
            const sLabels: Record<string, string> = { completed: 'Tamamlandı', running: 'Gönderiliyor', draft: 'Taslak', failed: 'Hata' }
            return (
              <div key={camp.id} style={{ ...card, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flexShrink: 0 }}><FlagImg code={camp.country_code || 'TR'} size={36} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{camp.name}</h3>
                      <span style={{ background: `${sColors[camp.status] || '#64748b'}16`, border: `1px solid ${sColors[camp.status] || '#64748b'}30`, color: sColors[camp.status] || '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {sLabels[camp.status] || camp.status}
                      </span>
                      {ch && <span style={{ background: `${ch.color}14`, border: `1px solid ${ch.color}22`, color: ch.color, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{ch.label}</span>}
                    </div>
                    <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{country?.name} · {camp.lead_count} alıcı{camp.sent_count ? ` · ${camp.sent_count} gönderildi` : ''} · {new Date(camp.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {camp.status === 'draft' && (
                    <button onClick={() => sendCampaign(camp.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      <Play size={13} /> Gönder
                    </button>
                  )}
                  {camp.status === 'running' && <div style={{ color: '#3b82f6', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} style={{ animation: 'exp-spin 1s linear infinite' }} /> Gönderiliyor...</div>}
                </div>
                {camp.status === 'running' && camp.lead_count > 0 && (
                  <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
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
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#475569' }}>
              <MessageSquare size={28} style={{ margin: '0 auto 12px', display: 'block', color: '#334155' }} />
              <p style={{ fontSize: 13, margin: '0 0 6px', color: '#94a3b8' }}>Hazır iletişim yok</p>
              <p style={{ fontSize: 11, margin: 0 }}>Alıcılar sekmesinde "Mesaj Yaz" butonunu kullanın</p>
            </div>
          ) : messages.map(m => {
            const country = countries.find(c => c.code === m.country_code)
            const ch = CHANNELS.find(c => c.key === m.channel)
            const sColors: Record<string, string> = { sent: '#10b981', draft: '#64748b', failed: '#ef4444' }
            return (
              <div key={m.id} style={{ ...card, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: m.body ? 10 : 0 }}>
                  <div style={{ flexShrink: 0 }}><FlagImg code={m.country_code || 'TR'} size={28} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{m.leads?.company_name || '—'}</p>
                      {ch && <span style={{ color: ch.color, fontSize: 10 }}>{ch.label}</span>}
                      <span style={{ background: `${sColors[m.status] || '#64748b'}14`, color: sColors[m.status] || '#64748b', fontSize: 10, padding: '2px 6px', borderRadius: 20 }}>
                        {m.status === 'sent' ? '✅ Gönderildi' : m.status === 'draft' ? '📝 Hazır' : '❌ Hata'}
                      </span>
                    </div>
                    {m.subject && <p style={{ color: '#64748b', fontSize: 11, margin: '3px 0 0' }}>Konu: <span style={{ color: '#94a3b8' }}>{m.subject}</span></p>}
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(m.body || '')}
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
                    <Copy size={12} />
                  </button>
                </div>
                {m.body && <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>{m.body.substring(0, 320)}{m.body.length > 320 ? '...' : ''}</p>}
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
              { l: 'Toplam Alıcı', v: analytics?.totalLeads || 0, c: '#10b981', icon: '👥' },
              { l: 'Kampanya', v: analytics?.totalCampaigns || 0, c: '#8b5cf6', icon: '🚀' },
              { l: 'Hazır İletişim', v: analytics?.totalMessages || 0, c: '#06b6d4', icon: '💬' },
              { l: 'Gönderilen', v: analytics?.sentMessages || 0, c: '#f59e0b', icon: '📤' },
            ].map(m => (
              <div key={m.l} style={{ ...card, padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                <p style={{ color: m.c, fontSize: 26, fontWeight: 900, margin: 0 }}>{m.v}</p>
                <p style={{ color: '#475569', fontSize: 11, margin: '4px 0 0' }}>{m.l}</p>
              </div>
            ))}
          </div>

          {analytics?.byCountry?.length > 0 && (
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 16px' }}>Pazar Dağılımı</h3>
              {analytics.byCountry.map((r: any) => {
                const c = countries.find(x => x.code === r.country_code)
                const pct = analytics.totalLeads > 0 ? Math.round((r.leads / analytics.totalLeads) * 100) : 0
                return (
                  <div key={r.country} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlagImg code={r.country_code || 'TR'} size={20} />
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{r.country}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ color: '#64748b', fontSize: 11 }}>{r.leads} alıcı</span>
                        {r.converted > 0 && <span style={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}>%{r.convRate} dönüşüm</span>}
                      </div>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Platform Kapsamı</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { label: 'Hedef Pazar', value: `${countries.length} ülke`, icon: '🌍', c: '#10b981' },
                { label: 'Arama Kapasitesi', value: 'Sınırsız', icon: '🔍', c: '#8b5cf6' },
                { label: 'Dil Desteği', value: '11 dil', icon: '🌐', c: '#06b6d4' },
                { label: 'Kişisel Mesaj', value: 'AI Destekli', icon: '✍️', c: '#f59e0b' },
              ].map(item => (
                <div key={item.label} style={{ background: `${item.c}07`, border: `1px solid ${item.c}18`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div>
                    <p style={{ color: item.c, fontWeight: 700, fontSize: 14, margin: 0 }}>{item.value}</p>
                    <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>{item.label}</p>
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
