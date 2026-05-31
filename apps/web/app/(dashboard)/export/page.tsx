'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Globe2, Search, RefreshCw, MessageSquare, Mail, Phone, CheckCircle, X, Copy, Play, Trash2, BarChart2, AlertTriangle, ArrowRight, Zap, Shield, Clock, TrendingUp, Star, ExternalLink, ChevronRight } from 'lucide-react'

// ── GLOBAL TRADE ORB — globe with Turkey→target trade routes ──────────────────
function GlobalTradeOrb({ size = 110, activeCountry = '', scanning = false }: { size?: number; activeCountry?: string; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 20 : 50)
    return () => clearInterval(t)
  }, [mounted, scanning])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const rot = tick * (scanning ? 1.0 : 0.35)

  // Globe grid lines
  const meridians = [0, 45, 90, 135].map(deg => {
    const a = (deg + rot * 0.4) * Math.PI / 180
    const pts: string[] = []
    for (let lat = -85; lat <= 85; lat += 12) {
      const r2 = Math.cos(lat * Math.PI / 180)
      const x = cx + Math.cos(a) * s * 0.4 * r2
      const y = cx + Math.sin(lat * Math.PI / 180) * s * 0.4
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  })
  const parallels = [-50, -25, 0, 25, 50].map(lat => {
    const r2 = Math.cos(lat * Math.PI / 180)
    return { rx: s * 0.4 * r2, ry: s * 0.1 * r2, cy: cx + Math.sin(lat * Math.PI / 180) * s * 0.4 }
  })

  // Turkey position on globe (approx 39°N, 35°E)
  const turkeyAngle = (rot + 35) * Math.PI / 180
  const turkeyLat = 39 * Math.PI / 180
  const trx = cx + Math.cos(turkeyAngle) * s * 0.4 * Math.cos(turkeyLat)
  const try2 = cx - Math.sin(turkeyLat) * s * 0.4

  // Scan ring
  const scanA = (rot * 4) * Math.PI / 180
  const scanX = cx + Math.cos(scanA) * s * 0.4
  const scanY = cx + Math.sin(scanA) * s * 0.15

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`gtoGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.16)" />
          </radialGradient>
          <radialGradient id={`gtoSphere${s}`} cx="32%" cy="25%" r="68%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="30%" stopColor="#10b981" />
            <stop offset="65%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#001a0e" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#gtoGlow${s})`} />
        {[0.6, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(16,185,129,0.09)" strokeWidth={0.8}
            strokeDasharray="5 8" style={{ animation: `gto-ring ${9+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin:`${cx}px ${cx}px` }} />
        ))}
        {meridians.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth={0.8} />
        ))}
        {parallels.map((p, i) => (
          <ellipse key={i} cx={cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth={0.8} />
        ))}
        <circle cx={cx} cy={cx} r={s * 0.4} fill={`url(#gtoSphere${s})`}
          style={{ filter: `drop-shadow(0 0 ${s * 0.2}px #10b98199)` }} />
        <ellipse cx={cx - s * 0.1} cy={cx - s * 0.18} rx={s * 0.1} ry={s * 0.06} fill="rgba(255,255,255,0.2)" style={{ filter: 'blur(3px)' }} />
        {/* Turkey marker */}
        <circle cx={trx} cy={try2} r={5} fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 6px #f59e0b)' }} />
        <text x={trx} y={try2 - 9} fill="#fbbf24" fontSize={8} textAnchor="middle" fontWeight="900">TR</text>
        {/* Scan line */}
        {scanning && (
          <line x1={trx} y1={try2} x2={scanX} y2={scanY} stroke="#f59e0b" strokeWidth={1.5} opacity={0.6}
            strokeDasharray="4 3" style={{ filter: 'drop-shadow(0 0 4px #f59e0b)' }} />
        )}
        {/* Active country indicator */}
        {activeCountry && (
          <text x={cx} y={cx + s * 0.55} fill="#10b981" fontSize={s * 0.075} textAnchor="middle" fontWeight="700">{activeCountry}</text>
        )}
        {!activeCountry && (
          <text x={cx} y={cx} fill="rgba(255,255,255,0.6)" fontSize={s * 0.09} textAnchor="middle" dominantBaseline="middle">🌍</text>
        )}
      </svg>
      <style>{`@keyframes gto-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const REGIONS = ['Tümü', 'Avrupa', 'Körfez', 'Amerika', 'Orta Asya', 'Asya', 'Afrika']
const CHANNELS = [
  { key:'whatsapp', label:'WhatsApp', icon:MessageSquare, color:'#10b981' },
  { key:'email',    label:'Email',    icon:Mail,          color:'#3b82f6' },
  { key:'linkedin', label:'LinkedIn', icon:ExternalLink,  color:'#0ea5e9' },
]

function riskColor(score: number) {
  if (score >= 85) return '#10b981'
  if (score >= 70) return '#34d399'
  if (score >= 55) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function formatUSD(n: number) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

// ── SEARCH PROGRESS ───────────────────────────────────────────────────────────
function SearchProgress({ sessionId, onComplete }: { sessionId: string; onComplete: (result: any) => void }) {
  const [progress, setProgress] = useState(5)
  const [step, setStep] = useState('Başlatılıyor...')
  const [status, setStatus] = useState('running')
  const [found, setFound] = useState(0)

  const stepLabels: Record<string, string> = {
    starting: '⚡ Başlatılıyor...',
    hs_codes: '🏷️ HS Kodları eşleştiriliyor...',
    market_data: '📊 UN Comtrade pazar verisi çekiliyor...',
    finding_importers: '🔍 Exa.ai ile ithalatçılar aranıyor...',
    researching_companies: '🔬 Şirketler araştırılıyor (Tavily)...',
    saving_results: '💾 Sonuçlar kaydediliyor...',
    done: '✅ Tamamlandı!',
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data: any = await api.get(`/api/export/search-session/${sessionId}/status`)
        setProgress(data.progress || 0)
        setStep(stepLabels[data.step] || data.step)
        setStatus(data.status)
        setFound(data.importersFound || 0)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
          if (data.status === 'completed') setTimeout(() => onComplete(data), 1200)
        }
      } catch { clearInterval(interval) }
    }, 3500)
    return () => clearInterval(interval)
  }, [sessionId])

  if (status === 'completed') return (
    <div style={{ padding:'14px 20px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
      <CheckCircle size={16} color="#10b981" />
      <p style={{ color:'#34d399', fontSize:13, margin:0, fontWeight:600 }}>✅ Arama tamamlandı — {found} doğrulanmış ithalatçı bulundu! Yenileniyor...</p>
    </div>
  )
  if (status === 'failed') return (
    <div style={{ padding:'12px 18px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12 }}>
      <p style={{ color:'#f87171', fontSize:13, margin:0 }}>❌ Arama başarısız — API anahtarlarını kontrol edin</p>
    </div>
  )

  return (
    <div style={{ padding:'16px 20px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <RefreshCw size={14} color="#10b981" style={{ animation:'exp-spin 1s linear infinite' }} />
          <p style={{ color:'#34d399', fontSize:13, margin:0, fontWeight:600 }}>{step}</p>
        </div>
        <span style={{ color:'#10b981', fontSize:12, fontWeight:700 }}>{progress}%</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#10b981,#34d399)', borderRadius:3, transition:'width 0.5s', boxShadow:'0 0 10px rgba(16,185,129,0.4)' }} />
      </div>
      <p style={{ color:'#475569', fontSize:11, margin:'8px 0 0' }}>HS Kodu · UN Comtrade · Exa.ai · Tavily · Claude AI — gerçek B2B ithalatçı araması</p>
    </div>
  )
}

// ── MARKET INTELLIGENCE PANEL ─────────────────────────────────────────────────
function MarketIntelPanel({ intel, country }: { intel: any; country: any }) {
  if (!intel) return null
  const { marketIntel, paymentRisk, culturalIntel } = intel

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:16 }}>
      {/* Market Size */}
      {marketIntel?.marketSizeUSD > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { l:'Toplam Pazar', v:formatUSD(marketIntel.marketSizeUSD), c:'#8b5cf6', icon:'📊' },
            { l:'TR İhracatı', v:formatUSD(marketIntel.turkeyExportsUSD), c:'#f59e0b', icon:'🇹🇷' },
            { l:'TR Pazar Payı', v:`%${marketIntel.turkeySharePct}`, c:marketIntel.turkeySharePct>5?'#10b981':'#ef4444', icon:'📈' },
            { l:'Yıllık Büyüme', v:marketIntel.yoyGrowthPct>=0?`+%${marketIntel.yoyGrowthPct}`:`%${marketIntel.yoyGrowthPct}`, c:marketIntel.yoyGrowthPct>=0?'#10b981':'#ef4444', icon:'📉' },
          ].map(m => (
            <div key={m.l} style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:`1px solid ${m.c}18`, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{m.icon}</div>
              <p style={{ color:m.c, fontSize:16, fontWeight:800, margin:0 }}>{m.v}</p>
              <p style={{ color:'#475569', fontSize:10, margin:'2px 0 0' }}>{m.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* HS Codes */}
      {marketIntel?.hsCodes?.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(139,92,246,0.15)', borderRadius:12, padding:'12px 16px' }}>
          <p style={{ color:'#a78bfa', fontSize:11, fontWeight:700, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:1 }}>🏷️ HS Kodları</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {marketIntel.hsCodes.map((code: string, i: number) => (
              <span key={code} style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', color:'#a78bfa', fontSize:12, padding:'4px 10px', borderRadius:8, fontFamily:'monospace', fontWeight:700 }}>
                {code} {marketIntel.hsCodeNames?.[i] && <span style={{ fontFamily:'inherit', fontWeight:400, color:'#64748b' }}>— {marketIntel.hsCodeNames[i]}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Payment Risk */}
        {paymentRisk && (
          <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:`1px solid ${riskColor(paymentRisk.score)}20`, borderRadius:12, padding:'14px 16px' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:700, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:1 }}>💳 Ödeme Riski</p>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:`${riskColor(paymentRisk.score)}15`, border:`2px solid ${riskColor(paymentRisk.score)}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:riskColor(paymentRisk.score), fontWeight:900, fontSize:14 }}>{paymentRisk.score}</span>
              </div>
              <div>
                <p style={{ color:riskColor(paymentRisk.score), fontWeight:700, fontSize:13, margin:0 }}>{paymentRisk.label}</p>
                <p style={{ color:'#475569', fontSize:11, margin:'2px 0 0' }}>Ort. ödeme: {paymentRisk.dso} gün</p>
                <p style={{ color:'#334155', fontSize:10, margin:'3px 0 0', lineHeight:1.4 }}>{paymentRisk.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cultural Intel */}
        {culturalIntel && (
          <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(245,158,11,0.15)', borderRadius:12, padding:'14px 16px' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:700, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:1 }}>🌐 Kültürel Zeka</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { icon:'👋', label:'Selamlama', v:culturalIntel.greeting },
                { icon:'⏰', label:'Zamanlama', v:culturalIntel.timing },
                { icon:'💡', label:'İpucu', v:culturalIntel.tip },
              ].map(item => (
                <div key={item.label}>
                  <span style={{ color:'#64748b', fontSize:10 }}>{item.icon} {item.label}: </span>
                  <span style={{ color:'#94a3b8', fontSize:10 }}>{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const [tab, setTab] = useState<'find'|'leads'|'campaigns'|'messages'|'analytics'>('find')
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
  const [activeSessionId, setActiveSessionId] = useState<string|null>(null)
  const [lastIntel, setLastIntel] = useState<any>(null)
  const [generatingMsg, setGeneratingMsg] = useState<string|null>(null)
  const [inlineMessages, setInlineMessages] = useState<Record<string, any>>({})
  const [filterCountry, setFilterCountry] = useState('')
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [countryIntel, setCountryIntel] = useState<any>(null)
  const [loadingIntel, setLoadingIntel] = useState(false)

  const showMsg = (type: 'success'|'error', text: string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [c, l, ca, m, an] = await Promise.allSettled([
      api.get('/api/export/countries'),
      api.get(`/api/export/export-leads?limit=100${filterCountry?`&countryCode=${filterCountry}`:''}`),
      api.get('/api/export/campaigns'),
      api.get('/api/export/messages'),
      api.get('/api/export/analytics'),
    ])
    if (c.status==='fulfilled') setCountries((c.value as any).countries||[])
    if (l.status==='fulfilled') setExportLeads((l.value as any).leads||[])
    if (ca.status==='fulfilled') setCampaigns((ca.value as any).campaigns||[])
    if (m.status==='fulfilled') setMessages((m.value as any).messages||[])
    if (an.status==='fulfilled') setAnalytics(an.value)
    setLoading(false)
  }, [filterCountry])

  useEffect(() => { loadAll() }, [loadAll])

  const loadCountryIntel = async (country: any) => {
    if (!country) return
    setLoadingIntel(true)
    try {
      const d: any = await api.get(`/api/export/market-intel/${country.code}`)
      setCountryIntel(d.country)
    } catch {}
    setLoadingIntel(false)
  }

  const startSearch = async () => {
    if (!selectedCountry || !sector.trim()) return showMsg('error', 'Ülke ve sektör girin')
    try {
      const data: any = await api.post('/api/export/start-search', { countryCode: selectedCountry.code, sector })
      setActiveSessionId(data.sessionId || null)
      showMsg('success', data.message)
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

  const bulkGenerateMessages = async () => {
    if (!selectedLeads.length) return showMsg('error', 'Lead seçin')
    const countryCodeToUse = filterCountry || selectedCountry?.code
    if (!countryCodeToUse) return showMsg('error', 'Ülke filtresi seçin')
    try {
      await api.post('/api/export/bulk-messages', { countryCode: countryCodeToUse, leadIds: selectedLeads, channel: selectedChannel })
      showMsg('success', `${selectedLeads.length} lead için mesaj oluşturuluyor...`)
      setTimeout(() => { loadAll(); setTab('messages') }, 8000)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const createCampaign = async () => {
    if (!selectedLeads.length) return showMsg('error', 'En az 1 lead seçin')
    const cc = filterCountry || selectedCountry?.code
    if (!cc) return showMsg('error', 'Ülke seçin')
    try {
      await api.post('/api/export/create-campaign', { name: campaignName, countryCode: cc, leadIds: selectedLeads, channel: selectedChannel })
      showMsg('success', 'Kampanya oluşturuldu!')
      loadAll(); setTab('campaigns'); setSelectedLeads([])
    } catch (e: any) { showMsg('error', e.message) }
  }

  const sendCampaign = async (id: string) => {
    try {
      await api.post(`/api/export/campaigns/${id}/send`, {})
      showMsg('success', 'Kampanya başlatıldı!')
      loadAll()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const filteredCountries = selectedRegion==='Tümü' ? countries : countries.filter(c => c.region===selectedRegion)
  const filteredLeads = filterCountry ? exportLeads.filter(l => l.country_code===filterCountry) : exportLeads

  const card = { background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16 } as const
  const inp = { background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }

  const totalExports = analytics?.totalLeads || 0
  const totalCampaigns = analytics?.totalCampaigns || 0
  const sentMsgs = analytics?.sentMessages || 0

  return (
    <div style={{ padding:0, display:'flex', flexDirection:'column', gap:0 }}>
      {/* Hero */}
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(0,14,6,0.98),rgba(3,8,22,0.99))', borderRadius:20, padding:'28px 28px', marginBottom:20, border:'1px solid rgba(16,185,129,0.2)', flexShrink:0 }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.02) 1px,transparent 1px)', backgroundSize:'40px 40px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:22 }}>
          <GlobalTradeOrb size={88} activeCountry={selectedCountry?.flag||''} scanning={!!activeSessionId} />
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
              <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:0 }}>İhracat Zekası</h1>
              <span style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>Vujis Teknolojisi</span>
            </div>
            <p style={{ color:'#64748b', fontSize:13, margin:'0 0 14px' }}>HS Kod Eşleştirici · UN Comtrade Pazar Verisi · Exa.ai İthalatçı Keşfi · Ödeme Risk Skoru · Kültürel Zeka</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
              {[{l:'İhracat Leadi',v:totalExports,c:'#10b981'},{l:'Kampanya',v:totalCampaigns,c:'#8b5cf6'},{l:'Gönderilen Mesaj',v:sentMsgs,c:'#06b6d4'},{l:'Kapsanan Ülke',v:countries.length,c:'#f59e0b'},{l:'Veri Kaynağı',v:'4',c:'#ef4444'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:17, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#334155', fontSize:10, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scan progress */}
      {activeSessionId && (
        <div style={{ marginBottom:16, flexShrink:0 }}>
          <SearchProgress sessionId={activeSessionId} onComplete={result => { setLastIntel(result); setActiveSessionId(null); loadAll() }} />
        </div>
      )}

      {msg && <div style={{ marginBottom:12, padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10, flexShrink:0 }}><p style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, margin:0 }}>{msg.text}</p></div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.3)', padding:4, borderRadius:12, width:'fit-content', marginBottom:18, border:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        {[{id:'find',label:'🌍 Pazar Keşfi'},{id:'leads',label:`👥 Leadler (${exportLeads.length})`},{id:'campaigns',label:`🚀 Kampanyalar (${campaigns.length})`},{id:'messages',label:`💬 Mesajlar (${messages.length})`},{id:'analytics',label:'📊 Analitik'}].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{ padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:tab===t.id?'linear-gradient(135deg,#065f46,#10b981)':'transparent', color:tab===t.id?'#fff':'#64748b', boxShadow:tab===t.id?'0 3px 12px rgba(16,185,129,0.3)':'none', whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PAZAR KEŞFİ ── */}
      {tab === 'find' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
          {/* Region filter */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 }}>
            {REGIONS.map(r => (
              <button key={r} onClick={()=>setSelectedRegion(r)}
                style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${selectedRegion===r?'rgba(16,185,129,0.5)':'rgba(255,255,255,0.06)'}`, background:selectedRegion===r?'rgba(16,185,129,0.15)':'transparent', color:selectedRegion===r?'#34d399':'#64748b', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {r}
              </button>
            ))}
          </div>

          {/* Country grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
            {filteredCountries.map(country => {
              const risk = country.paymentRisk
              const isSelected = selectedCountry?.code === country.code
              const leadCount = exportLeads.filter(l => l.country_code === country.code).length
              return (
                <button key={country.code} onClick={() => { setSelectedCountry(isSelected?null:country); if (!isSelected) loadCountryIntel(country) }}
                  style={{ padding:'12px 10px', borderRadius:16, border:`1px solid ${isSelected?'rgba(16,185,129,0.5)':'rgba(255,255,255,0.06)'}`, background:isSelected?'rgba(16,185,129,0.12)':'linear-gradient(135deg,rgba(3,8,22,0.8),rgba(5,6,18,0.9))', cursor:'pointer', textAlign:'left', position:'relative', transition:'all 0.15s' }}>
                  {/* Risk dot */}
                  <div style={{ position:'absolute', top:8, right:8, width:7, height:7, borderRadius:'50%', background:riskColor(risk?.score||60) }} title={risk?.label} />
                  {leadCount > 0 && (
                    <div style={{ position:'absolute', top:7, left:7, background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.4)', color:'#34d399', fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:6 }}>{leadCount}</div>
                  )}
                  <div style={{ fontSize:22, marginBottom:6 }}>{country.flag}</div>
                  <div style={{ color:'#fff', fontSize:11, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{country.name}</div>
                  <div style={{ color:'#475569', fontSize:10 }}>{country.currency}</div>
                  {isSelected && <CheckCircle size={12} color="#10b981" style={{ marginTop:4 }} />}
                </button>
              )
            })}
          </div>

          {/* Country intel quick view (before search) */}
          {selectedCountry && !activeSessionId && (
            <div style={{ ...card, padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                <span style={{ fontSize:36 }}>{selectedCountry.flag}</span>
                <div style={{ flex:1 }}>
                  <h3 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:'0 0 4px' }}>{selectedCountry.name}'de İthalatçı Bul</h3>
                  <p style={{ color:'#64748b', fontSize:12, margin:0 }}>
                    Dil: {selectedCountry.language.toUpperCase()} · Para: {selectedCountry.currency}
                    {countryIntel?.paymentRisk && ` · Ödeme Riski: `}
                    {countryIntel?.paymentRisk && <span style={{ color:riskColor(countryIntel.paymentRisk.score), fontWeight:700 }}>{countryIntel.paymentRisk.label}</span>}
                  </p>
                </div>
                {loadingIntel && <RefreshCw size={14} color="#475569" style={{ animation:'exp-spin 1s linear infinite' }} />}
              </div>

              <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                <input value={sector} onChange={e=>setSector(e.target.value)} onKeyDown={e=>e.key==='Enter'&&startSearch()}
                  placeholder="Sektör girin: mobilya, tekstil, inşaat malzemeleri, elektronik..."
                  style={{ ...inp, flex:1 }} />
                <button onClick={startSearch} disabled={!!activeSessionId || !sector.trim()}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:13, fontWeight:700, cursor:!!activeSessionId||!sector.trim()?'not-allowed':'pointer', boxShadow:'0 4px 16px rgba(16,185,129,0.35)', flexShrink:0 }}>
                  <Search size={14} /> Exa.ai + Comtrade
                </button>
              </div>

              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:10, padding:'10px 14px' }}>
                <p style={{ color:'#34d399', fontSize:11, margin:0, lineHeight:1.7 }}>
                  ⚡ <strong>HS Kod Eşleştirme</strong> → <strong>UN Comtrade pazar büyüklüğü</strong> → <strong>Exa.ai ile gerçek ithalatçı</strong> → <strong>Tavily şirket araştırması</strong> → Doğrulanmış lead listesi
                </p>
              </div>
            </div>
          )}

          {/* Last search result intel */}
          {lastIntel && selectedCountry && <MarketIntelPanel intel={lastIntel} country={selectedCountry} />}

          {/* Country stats */}
          {exportLeads.length > 0 && (
            <div style={{ ...card, padding:'16px 18px' }}>
              <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>📊 Ülke Bazlı Lead Dağılımı</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {Object.entries(exportLeads.reduce((acc: any, l) => { acc[l.country]=(acc[l.country]||0)+1; return acc }, {})).slice(0,8).map(([country, count]: any) => {
                  const c = countries.find(x => x.name===country)
                  return (
                    <div key={country} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
                      <span style={{ fontSize:20 }}>{c?.flag||'🌍'}</span>
                      <div><p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>{count}</p><p style={{ color:'#475569', fontSize:10, margin:0 }}>{country}</p></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEADLER ── */}
      {tab === 'leads' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          {/* Filters + actions */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
            <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)} style={{ ...inp, height:40 }}>
              <option value="">Tüm Ülkeler ({exportLeads.length})</option>
              {[...new Set(exportLeads.map(l=>l.country_code))].map(code => {
                const c = countries.find(x=>x.code===code)
                const count = exportLeads.filter(l=>l.country_code===code).length
                return <option key={code} value={code}>{c?.flag} {c?.name||code} ({count})</option>
              })}
            </select>
            <div style={{ display:'flex', gap:5 }}>
              {CHANNELS.map(ch => (
                <button key={ch.key} onClick={()=>setSelectedChannel(ch.key)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:`1px solid ${selectedChannel===ch.key?ch.color+'50':'rgba(255,255,255,0.08)'}`, background:selectedChannel===ch.key?`${ch.color}15`:'transparent', color:selectedChannel===ch.key?ch.color:'#64748b', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  <ch.icon size={12} /> {ch.label}
                </button>
              ))}
            </div>
            {selectedLeads.length > 0 && (
              <div style={{ display:'flex', gap:8, marginLeft:'auto', alignItems:'center' }}>
                <span style={{ color:'#64748b', fontSize:12 }}>{selectedLeads.length} seçili</span>
                <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Kampanya adı" style={{ ...inp, width:140, height:36, fontSize:12 }} />
                <button onClick={bulkGenerateMessages} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid rgba(139,92,246,0.3)', background:'rgba(139,92,246,0.1)', color:'#a78bfa', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  💬 Toplu Mesaj
                </button>
                <button onClick={createCampaign} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  <Zap size={12} /> Kampanya Oluştur
                </button>
              </div>
            )}
          </div>

          {/* Lead list */}
          {filteredLeads.length === 0 ? (
            <div style={{ ...card, padding:48, textAlign:'center' }}>
              <Globe2 size={36} color="#334155" style={{ margin:'0 auto 12px', display:'block' }} />
              <p style={{ color:'#94a3b8', fontSize:14, margin:'0 0 8px' }}>Henüz ihracat leadi yok</p>
              <button onClick={()=>setTab('find')} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', margin:'0 auto' }}>
                Pazar Keşfi <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredLeads.map(lead => {
                const country = countries.find(c=>c.code===lead.country_code)
                const hasInlineMsg = inlineMessages[lead.id]
                const existingMsg = messages.find(m=>m.lead_id===lead.id && m.channel===selectedChannel)
                const isSelected = selectedLeads.includes(lead.id)
                return (
                  <div key={lead.id} style={{ ...card, padding:'14px 16px', border:`1px solid ${isSelected?'rgba(16,185,129,0.35)':'rgba(255,255,255,0.06)'}`, background:isSelected?'rgba(16,185,129,0.05)':'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      {/* Checkbox */}
                      <div onClick={()=>setSelectedLeads(p=>isSelected?p.filter(x=>x!==lead.id):[...p,lead.id])}
                        style={{ width:20, height:20, borderRadius:5, border:`2px solid ${isSelected?'#10b981':'rgba(255,255,255,0.15)'}`, background:isSelected?'rgba(16,185,129,0.2)':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {isSelected && <CheckCircle size={12} color="#10b981" />}
                      </div>
                      <span style={{ fontSize:24, flexShrink:0 }}>{country?.flag||'🌍'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.company_name}</p>
                          {lead.verified_importer && (
                            <span style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399', fontSize:9, padding:'2px 6px', borderRadius:20, fontWeight:700, flexShrink:0 }}>✅ Doğrulanmış İthalatçı</span>
                          )}
                          {existingMsg && <span style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', color:'#a78bfa', fontSize:9, padding:'2px 6px', borderRadius:20, flexShrink:0 }}>💬 Mesaj Hazır</span>}
                        </div>
                        <div style={{ display:'flex', gap:10, fontSize:11, color:'#475569', flexWrap:'wrap' }}>
                          <span>{country?.name||lead.country}</span>
                          {lead.sector && <span>· {lead.sector}</span>}
                          {lead.phone && <span style={{ color:'#10b981' }}>· 📞 {lead.phone}</span>}
                          {lead.email && <span style={{ color:'#3b82f6' }}>· ✉️ {lead.email}</span>}
                          {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color:'#64748b', textDecoration:'none' }}>· 🔗 Website</a>}
                          {lead.hs_codes && <span style={{ color:'#8b5cf6' }}>· HS: {JSON.parse(lead.hs_codes||'[]').join(', ')}</span>}
                        </div>
                      </div>
                      <button onClick={()=>generateMessage(lead.id)} disabled={generatingMsg===lead.id}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid rgba(16,185,129,0.25)', background:'rgba(16,185,129,0.08)', color:'#34d399', fontSize:11, cursor:'pointer', flexShrink:0 }}>
                        {generatingMsg===lead.id ? <RefreshCw size={11} style={{ animation:'exp-spin 1s linear infinite' }} /> : <MessageSquare size={11} />}
                        Mesaj Üret
                      </button>
                    </div>
                    {/* Inline message display */}
                    {(hasInlineMsg || existingMsg) && (
                      <div style={{ marginTop:10, padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10 }}>
                        {(hasInlineMsg||existingMsg)?.subject && (
                          <p style={{ color:'#64748b', fontSize:11, margin:'0 0 6px' }}>Konu: <span style={{ color:'#94a3b8' }}>{(hasInlineMsg||existingMsg).subject}</span></p>
                        )}
                        <p style={{ color:'#e2e8f0', fontSize:12, margin:0, lineHeight:1.7 }}>{(hasInlineMsg||existingMsg)?.body}</p>
                        <button onClick={()=>navigator.clipboard?.writeText((hasInlineMsg||existingMsg)?.body||'')}
                          style={{ display:'flex', alignItems:'center', gap:4, marginTop:6, padding:'4px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', fontSize:10, cursor:'pointer' }}>
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
        <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
          {campaigns.length === 0 ? (
            <div style={{ ...card, padding:48, textAlign:'center' }}>
              <Zap size={32} color="#334155" style={{ margin:'0 auto 12px', display:'block' }} />
              <p style={{ color:'#94a3b8', fontSize:14, margin:'0 0 16px' }}>Kampanya yok — lead seçip "Kampanya Oluştur" butonuna tıklayın</p>
              <button onClick={()=>setTab('leads')} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Leadlere Git
              </button>
            </div>
          ) : campaigns.map(camp => {
            const country = countries.find(x=>x.code===camp.country_code)
            const ch = CHANNELS.find(x=>x.key===camp.channel)
            const statusColors: Record<string, string> = { completed:'#10b981', running:'#3b82f6', draft:'#64748b', failed:'#ef4444' }
            const statusLabels: Record<string, string> = { completed:'Tamamlandı', running:'Çalışıyor', draft:'Taslak', failed:'Başarısız' }
            return (
              <div key={camp.id} style={{ ...card, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:32 }}>{country?.flag||'🌍'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <h3 style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>{camp.name}</h3>
                      <span style={{ background:`${statusColors[camp.status]||'#64748b'}18`, border:`1px solid ${statusColors[camp.status]||'#64748b'}30`, color:statusColors[camp.status]||'#64748b', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{statusLabels[camp.status]||camp.status}</span>
                      {ch && <span style={{ background:`${ch.color}15`, border:`1px solid ${ch.color}25`, color:ch.color, fontSize:10, padding:'2px 8px', borderRadius:20 }}>{ch.label}</span>}
                    </div>
                    <p style={{ color:'#475569', fontSize:11, margin:0 }}>{country?.name} · {camp.lead_count} lead · {camp.sent_count||0} gönderildi · {new Date(camp.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {camp.status === 'draft' && (
                    <button onClick={()=>sendCampaign(camp.id)}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                      <Play size={13} /> Gönder
                    </button>
                  )}
                  {camp.status === 'running' && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, color:'#3b82f6', fontSize:12 }}>
                      <RefreshCw size={13} style={{ animation:'exp-spin 1s linear infinite' }} /> Gönderiliyor...
                    </div>
                  )}
                </div>
                {camp.status === 'running' && (
                  <div style={{ marginTop:12, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${Math.round((camp.sent_count||0)/camp.lead_count*100)}%`, background:'linear-gradient(90deg,#10b981,#34d399)', borderRadius:2 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MESAJLAR ── */}
      {tab === 'messages' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>
          {messages.length === 0 ? (
            <div style={{ ...card, padding:40, textAlign:'center', color:'#475569' }}>
              <MessageSquare size={30} style={{ margin:'0 auto 12px', display:'block', color:'#334155' }} />
              <p style={{ fontSize:13, margin:'0 0 8px', color:'#94a3b8' }}>Henüz mesaj yok</p>
              <p style={{ fontSize:11, margin:0 }}>Lead seç → "Mesaj Üret" → Mesajlar burada görünür</p>
            </div>
          ) : messages.map(m => {
            const country = countries.find(c=>c.code===m.country_code)
            const ch = CHANNELS.find(c=>c.key===m.channel)
            const statusColors: Record<string, string> = { sent:'#10b981', draft:'#64748b', failed:'#ef4444' }
            return (
              <div key={m.id} style={{ ...card, padding:'14px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:m.body?10:0 }}>
                  <span style={{ fontSize:20 }}>{country?.flag||'🌍'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0 }}>{m.leads?.company_name||'Bilinmeyen'}</p>
                      {ch && <span style={{ color:ch.color, fontSize:10 }}>{ch.label}</span>}
                      <span style={{ background:`${statusColors[m.status]||'#64748b'}15`, color:statusColors[m.status]||'#64748b', fontSize:10, padding:'2px 6px', borderRadius:20 }}>
                        {m.status==='sent'?'✅ Gönderildi':m.status==='draft'?'📝 Taslak':'❌ Başarısız'}
                      </span>
                    </div>
                    {m.subject && <p style={{ color:'#64748b', fontSize:11, margin:'2px 0 0' }}>Konu: {m.subject}</p>}
                  </div>
                  <button onClick={()=>navigator.clipboard?.writeText(m.body||'')} style={{ padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', cursor:'pointer' }}>
                    <Copy size={12} />
                  </button>
                </div>
                {m.body && <p style={{ color:'#94a3b8', fontSize:12, margin:0, lineHeight:1.7, borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:10 }}>{m.body.substring(0,300)}{m.body.length>300?'...':''}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── ANALİTİK ── */}
      {tab === 'analytics' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              {l:'Toplam İhracat Leadi',v:analytics?.totalLeads||0,c:'#10b981',icon:'👥'},
              {l:'Toplam Kampanya',v:analytics?.totalCampaigns||0,c:'#8b5cf6',icon:'🚀'},
              {l:'Üretilen Mesaj',v:analytics?.totalMessages||0,c:'#06b6d4',icon:'💬'},
              {l:'Gönderilen',v:analytics?.sentMessages||0,c:'#f59e0b',icon:'📤'},
            ].map(m => (
              <div key={m.l} style={{ ...card, padding:'18px 16px', textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{m.icon}</div>
                <p style={{ color:m.c, fontSize:26, fontWeight:900, margin:0 }}>{m.v}</p>
                <p style={{ color:'#475569', fontSize:11, margin:'4px 0 0' }}>{m.l}</p>
              </div>
            ))}
          </div>

          {analytics?.byCountry?.length > 0 && (
            <div style={{ ...card, padding:22 }}>
              <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🌍 Ülke Bazlı Lead Dağılımı</h3>
              {analytics.byCountry.map((r: any) => {
                const c = countries.find(x=>x.code===r.country_code)
                return (
                  <div key={r.country} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:'#94a3b8', fontSize:12 }}>{c?.flag} {r.country}</span>
                      <div style={{ display:'flex', gap:12 }}>
                        <span style={{ color:'#64748b', fontSize:11 }}>{r.leads} lead</span>
                        {r.converted > 0 && <span style={{ color:'#10b981', fontSize:11, fontWeight:700 }}>{r.convRate}% dönüşüm</span>}
                      </div>
                    </div>
                    <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${Math.min(100,(r.leads/((analytics?.totalLeads||1))*100))}%`, background:`linear-gradient(90deg,#10b981,#34d399)`, borderRadius:3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Data sources info */}
          <div style={{ ...card, padding:20 }}>
            <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>🔌 Kullanılan Veri Kaynakları</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {[
                { name:'UN Comtrade', desc:'4B+ sevkiyat kaydı, 195 ülke pazar istatistiği', color:'#06b6d4', status:'Aktif' },
                { name:'Exa.ai', desc:'1B+ web sayfası, doğrulanmış ithalatçı araması', color:'#8b5cf6', status:'Aktif' },
                { name:'Tavily', desc:'Şirket araştırması, iletişim bilgisi keşfi', color:'#f59e0b', status:'Aktif' },
                { name:'Claude AI', desc:'HS kod eşleştirme, kültürel outreach mesajı', color:'#f97316', status:'Aktif' },
              ].map(src => (
                <div key={src.name} style={{ background:`${src.color}08`, border:`1px solid ${src.color}18`, borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <p style={{ color:src.color, fontWeight:700, fontSize:13, margin:0 }}>{src.name}</p>
                    <span style={{ background:`${src.color}15`, color:src.color, fontSize:9, padding:'2px 6px', borderRadius:20, fontWeight:700 }}>● {src.status}</span>
                  </div>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{src.desc}</p>
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
