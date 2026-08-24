'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { api } from '@/lib/api'
import {
  Megaphone, RefreshCw, Send, Mail, MessageCircle, Phone,
  CheckCircle, BarChart2, Sparkles, ListOrdered, Filter,
  Clock, Users, ArrowLeft, Layers,
} from 'lucide-react'
import Link from 'next/link'

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8', surf = '#f8fafc'
const accentBlue = '#2563eb', accentEmerald = '#059669', accentViolet = '#7c3aed'
const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: '#ecfdf5', color: accentEmerald, label: 'Aktif' },
  draft:     { bg: '#f8fafc', color: tx3,           label: 'Taslak' },
  paused:    { bg: '#fffbeb', color: '#b45309',     label: 'Durduruldu' },
  completed: { bg: '#eff6ff', color: accentBlue,    label: 'Tamamlandı' },
}

export default function NewCampaignPage() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [allStats, setAllStats] = useState({ campaigns: 0, totalSent: 0, totalReplied: 0 })

  const [bcChannel, setBcChannel] = useState<'whatsapp' | 'email' | 'sms' | 'multi'>('whatsapp')
  const [bcMessage, setBcMessage] = useState('')
  const [bcName, setBcName] = useState('')
  const [bcSending, setBcSending] = useState(false)
  const [bcScheduled, setBcScheduled] = useState(false)
  const [bcScheduleAt, setBcScheduleAt] = useState('')

  const [templates, setTemplates] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [smartTiming, setSmartTiming] = useState<any>(null)
  const [segFilters, setSegFilters] = useState({ min_score: '', city: '', sector: '', source: '', has_phone: 'true' })
  const [segOptions, setSegOptions] = useState<any>({ cities: [], sectors: [], sources: [] })
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized] = useState<any>(null)
  const [goalInput, setGoalInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'compose' | 'templates' | 'analytics'>('compose')

  const [waConnected, setWaConnected] = useState<boolean | null>(null)
  const [lists, setLists] = useState<string[]>([])
  const [selectedList, setSelectedList] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [campaignFunnel, setCampaignFunnel] = useState<any>(null)
  const listMounted = useRef(false)
  const autoSelectOnLoad = useRef(false)

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const loadAll = async () => {
    try {
      const [campRes, leadsRes] = await Promise.allSettled([
        api.get('/api/campaigns'),
        api.get('/api/leads?limit=200'),
      ])
      const camps = campRes.status === 'fulfilled' ? campRes.value.campaigns || campRes.value.data || [] : []
      const lds = leadsRes.status === 'fulfilled' ? leadsRes.value.leads || leadsRes.value.data || [] : []
      setCampaigns(camps); setLeads(lds)
      setAllStats({
        campaigns: camps.length,
        totalSent: camps.reduce((s: number, c: any) => s + (c.total_sent || c.totalSent || 0), 0),
        totalReplied: camps.reduce((s: number, c: any) => s + (c.total_replied || c.totalReplied || 0), 0),
      })
    } catch {}
    api.get('/api/wa-numbers/qr-status').then((d: any) => setWaConnected(d.connected === true || d.status === 'connected')).catch(() => setWaConnected(false))
    api.get('/api/leads/lists').then((d: any) => setLists(d.lists || [])).catch(() => {})
    Promise.allSettled([
      api.get('/api/campaigns/templates'),
      api.get('/api/campaigns/analytics'),
      api.get('/api/campaigns/smart-timing'),
      api.get('/api/campaigns/segments?has_phone=true&limit=200'),
    ]).then(([tplRes, anlRes, timRes, segRes]) => {
      if (tplRes.status === 'fulfilled') setTemplates(tplRes.value.templates || [])
      if (anlRes.status === 'fulfilled') setAnalytics(anlRes.value)
      if (timRes.status === 'fulfilled') setSmartTiming(timRes.value)
      if (segRes.status === 'fulfilled') setSegOptions(segRes.value.filters || {})
    })
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const l = searchParams.get('list')
    if (l) { autoSelectOnLoad.current = true; setSelectedList(l); return }
    const fresh = parseInt(searchParams.get('fresh') || '0', 10)
    if (fresh > 0) {
      const n = Math.min(fresh, 500)
      api.get(`/api/leads?limit=${n}&sortBy=created_at&sortDir=desc`)
        .then((d: any) => {
          const loaded: any[] = d.leads || []
          setLeads(loaded)
          setSelectedLeads(loaded.filter((l: any) => l.phone || l.email).map((l: any) => l.id))
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!listMounted.current) { listMounted.current = true; return }
    const url = selectedList ? `/api/leads?limit=500&list=${encodeURIComponent(selectedList)}` : '/api/leads?limit=200'
    api.get(url).then((d: any) => {
      const loaded: any[] = d.leads || []
      setLeads(loaded)
      if (autoSelectOnLoad.current) {
        autoSelectOnLoad.current = false
        setSelectedLeads(loaded.filter((l: any) => l.phone || l.email).map((l: any) => l.id))
      } else { setSelectedLeads([]) }
    }).catch(() => {})
  }, [selectedList])

  const clientOptimize = (message: string, channel: string) => {
    const isWA = channel === 'whatsapp'
    const v1 = message.replace(/^Merhaba\b/, isWA ? 'Merhaba 👋' : 'Sayın')
      + (isWA && !message.includes('?') ? '\n\nBir dakikanız var mı? 📲' : '')
    const v2 = (isWA ? '⚡ ' : '') + message.trim()
      + (isWA ? '\n\n✅ Hızlı yanıt için bu mesajı yanıtlamanız yeterli!'
              : '\n\nEn kısa sürede size dönüş yapacağız. Saygılarımızla.')
    return {
      versions: [
        { message: v1.trim(), estimatedReplyRate: 26, reason: 'Daha samimi ton, emoji ile dikkat çekici' },
        { message: v2.trim(), estimatedReplyRate: 21, reason: 'Net CTA ile dönüşüm odaklı versiyon' },
      ],
      tips: [
        isWA ? "WhatsApp'ta kısa mesajlar daha yüksek yanıt oranı alır" : 'E-postada konu satırı açık oranını %50 belirler',
        '{{firma}} değişkeni kişiselleştirme ekler, yanıt oranını %30-40 artırır',
      ]
    }
  }

  const substituteVars = (template: string, lead: any) =>
    template
      .replace(/\{\{firma\}\}/gi, lead?.company_name || 'Firma Adı')
      .replace(/\{\{sektor\}\}/gi, lead?.sector || 'sektörünüz')
      .replace(/\{\{sehir\}\}/gi, lead?.city || 'şehriniz')
      .replace(/\{\{isim\}\}/gi, lead?.contact_name || lead?.company_name || 'Yetkili')

  const generateMessage = async () => {
    if (!goalInput.trim()) return
    setGenerating(true); setBcMessage(''); setOptimized(null)
    const previewLeads = selectedLeads.length
      ? leads.filter(l => selectedLeads.includes(l.id)).slice(0, 3)
      : leads.slice(0, 3)
    try {
      const data = await api.post('/api/campaigns/generate-message', { goal: goalInput, channel: bcChannel, leads: previewLeads })
      setBcMessage(data.message || '')
    } catch {
      const isWA = bcChannel === 'whatsapp'
      setBcMessage(isWA
        ? `Merhaba! 👋\n\n{{firma}} gibi {{sektor}} işletmeleri için ${goalInput} sunuyoruz. Kısa bir görüşme için uygun olduğunuzda yazabilirsiniz 🙏`
        : `İyi günler,\n\n{{firma}} için ${goalInput} konusunda özel hazırladığımız çözümü paylaşmak istedik.\n\nGörüşme için uygun bir zaman belirleyebilir miyiz?\n\nSaygılarımızla`)
    }
    setGenerating(false)
  }

  const optimizeMessage = async () => {
    if (!bcMessage) return
    setOptimizing(true); setOptimized(null)
    try {
      const data = await api.post('/api/campaigns/ai-optimize', { message: bcMessage, channel: bcChannel })
      setOptimized(data)
    } catch { setOptimized(clientOptimize(bcMessage, bcChannel)) }
    setOptimizing(false)
  }

  const applySegment = async () => {
    try {
      const params = new URLSearchParams()
      if (segFilters.min_score) params.set('min_score', segFilters.min_score)
      if (segFilters.city) params.set('city', segFilters.city)
      if (segFilters.sector) params.set('sector', segFilters.sector)
      if (segFilters.has_phone) params.set('has_phone', segFilters.has_phone)
      params.set('limit', '200')
      const data = await api.get(`/api/campaigns/segments?${params.toString()}`)
      setLeads(data.leads || [])
      setSegOptions(data.filters || segOptions)
      showMsg('success', `${data.total || 0} lead filtrelendi`)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const sendBroadcast = async () => {
    if (!bcName || !bcMessage || !selectedLeads.length) return showMsg('error', 'Kampanya adı, mesaj ve en az 1 lead seçimi zorunlu')
    if (bcScheduled && !bcScheduleAt) return showMsg('error', 'Gönderim zamanı seçin')
    setBcSending(true)
    try {
      const payload: any = { name: bcName, channel: bcChannel, messageTemplate: bcMessage, leadIds: selectedLeads }
      if (bcScheduled && bcScheduleAt) payload.scheduledAt = new Date(bcScheduleAt).toISOString()
      const created = await api.post('/api/campaigns', payload)
      if (!bcScheduled) {
        const started = await api.post(`/api/campaigns/${created.campaign.id}/start`, {})
        showMsg('success', started.message || `${selectedLeads.length} lead'e gönderim başlatıldı!`)
      } else {
        showMsg('success', `Kampanya zamanlandı! ${new Date(bcScheduleAt).toLocaleString('tr-TR')} tarihinde gönderilecek.`)
      }
      setTimeout(() => router.push(`/campaigns/${created.campaign.id}`), 1200)
    } catch (e: any) { showMsg('error', e.message) }
    setBcSending(false)
  }

  const toggleLead = (id: string) => setSelectedLeads(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const selectAll = () => {
    const valid = leads.filter(l => l.phone || l.email)
    setSelectedLeads(prev => prev.length === valid.length ? [] : valid.map(l => l.id))
  }

  const loadCampaignFunnel = async (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    try {
      const data = await api.get(`/api/campaigns/${campaignId}/funnel`)
      setCampaignFunnel(data)
    } catch {}
  }

  const LeadSelector = ({ maxHeight = 400 }: { maxHeight?: number }) => (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} style={{ color: accentBlue }} />
          <h3 style={{ color: tx1, fontSize: 13, fontWeight: 700, margin: 0 }}>Lead Seç ({selectedLeads.length})</h3>
        </div>
        <button onClick={selectAll} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: tx2, fontSize: 11, cursor: 'pointer' }}>
          {selectedLeads.length === leads.filter(l => l.phone || l.email).length ? 'Kaldır' : 'Tümünü Seç'}
        </button>
      </div>
      {lists.length > 0 && (
        <select value={selectedList} onChange={e => setSelectedList(e.target.value)}
          style={{ ...inputStyle, fontSize: 11, padding: '7px 10px', marginBottom: 10 }}>
          <option value="">📋 Tüm Leadler</option>
          {lists.map(l => <option key={l} value={l}>📁 {l}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight, overflowY: 'auto' }}>
        {leads.filter(l => l.phone || l.email).map(lead => (
          <div key={lead.id} onClick={() => toggleLead(lead.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1px solid ${selectedLeads.includes(lead.id) ? accentBlue + '55' : '#f1f5f9'}`, background: selectedLeads.includes(lead.id) ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selectedLeads.includes(lead.id) ? accentBlue : '#d1d5db'}`, background: selectedLeads.includes(lead.id) ? accentBlue : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {selectedLeads.includes(lead.id) && <CheckCircle size={9} style={{ color: '#fff' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: tx1, fontSize: 11, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
              <p style={{ color: tx3, fontSize: 9, margin: 0 }}>{lead.phone || lead.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ padding: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/campaigns" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: tx2, fontSize: 12, textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Geri
        </Link>
      </div>

      {/* ── HERO ── */}
      <div style={{ ...card, padding: '24px 24px 18px', marginBottom: 18, background: 'linear-gradient(135deg,#fff,#f0f9ff 60%,#faf5ff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ color: tx1, fontSize: 22, fontWeight: 800, margin: 0 }}>Satış Otomasyonu</h1>
          <span style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>AI</span>
        </div>
        <p style={{ color: tx2, fontSize: 12, margin: '0 0 14px' }}>Toplu mesaj, takip sekansı veya akıllı otomasyon — tek yerden yönet</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 8 }}>
          {[
            { label: 'Kampanya', value: allStats.campaigns, color: accentBlue,    Icon: Megaphone },
            { label: 'Gönderilen', value: allStats.totalSent,    color: '#b45309',   Icon: Send },
            { label: 'Cevaplanan', value: allStats.totalReplied, color: accentEmerald, Icon: CheckCircle },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ ...card, padding: '8px 10px', textAlign: 'center' }}>
              <Icon size={13} style={{ color, margin: '0 auto 3px' }} />
              <p style={{ color: tx1, fontSize: 16, fontWeight: 800, margin: 0 }}>{value}</p>
              <p style={{ color: tx3, fontSize: 9, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {msg && <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 11, fontSize: 12, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>{msg.text}</div>}

      {/* ── Sub-tabs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, marginBottom: 14, background: surf, padding: 3, borderRadius: 10, border: '1px solid #f1f5f9' }}>
        {[{ id: 'compose', label: 'Yaz & Gönder', Icon: Send }, { id: 'templates', label: 'Şablonlar', Icon: ListOrdered }, { id: 'analytics', label: 'Analitik', Icon: BarChart2 }].map(tb => (
          <button key={tb.id} onClick={() => setActiveSubTab(tb.id as any)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: isMobile ? 11 : 12, fontWeight: 600, background: activeSubTab === tb.id ? '#fff' : 'transparent', color: activeSubTab === tb.id ? accentBlue : tx3, boxShadow: activeSubTab === tb.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            <tb.Icon size={13} /> {tb.label}
          </button>
        ))}
      </div>

      {/* ── Compose Tab ── */}
      {activeSubTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Megaphone size={15} style={{ color: accentBlue }} />
                <h2 style={{ color: tx1, fontSize: 14, fontWeight: 700, margin: 0 }}>Kampanya Oluştur</h2>
                {smartTiming && <span style={{ marginLeft: 'auto', color: accentEmerald, fontSize: 10, background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>En iyi saat: {smartTiming.bestHour}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={bcName} onChange={e => setBcName(e.target.value)} placeholder="Kampanya adı *" style={inputStyle} />

                {/* Kanal Seçimi */}
                <div>
                  <p style={{ color: tx2, fontSize: 11, fontWeight: 600, margin: '0 0 7px' }}>Kanal</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {([
                      { id: 'whatsapp', label: 'WhatsApp',    icon: MessageCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', selBg: '#d1fae5', selBorder: '#059669' },
                      { id: 'email',    label: 'Email',        icon: Mail,          color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', selBg: '#dbeafe', selBorder: '#2563eb' },
                      { id: 'sms',      label: 'SMS',          icon: Phone,         color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', selBg: '#ede9fe', selBorder: '#7c3aed' },
                      { id: 'multi',    label: 'Çoklu Kanal',  icon: Layers,        color: '#d97706', bg: '#fffbeb', border: '#fde68a', selBg: '#fef3c7', selBorder: '#d97706' },
                    ] as const).map(ch => {
                      const sel = bcChannel === ch.id
                      return (
                        <button key={ch.id} onClick={() => setBcChannel(ch.id)}
                          style={{ padding: '10px 8px', borderRadius: 10, border: `2px solid ${sel ? ch.selBorder : ch.border}`, background: sel ? ch.selBg : ch.bg, color: sel ? ch.color : tx2, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                          <ch.icon size={18} style={{ color: ch.color }} />
                          {ch.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* AI Mesaj Oluşturma */}
                <div style={{ background: 'linear-gradient(135deg,#faf5ff,#eff6ff)', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ color: accentViolet, fontSize: 11, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}><Sparkles size={12} /> AI ile Mesaj Oluştur</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && generateMessage()}
                      placeholder="Ne sunmak istiyorsunuz? (ör: kozmetik salonlarına randevu sistemi)"
                      style={{ ...inputStyle, fontSize: 11, flex: 1 }}
                    />
                    <button onClick={generateMessage} disabled={generating || !goalInput.trim()}
                      style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: goalInput.trim() ? `linear-gradient(135deg,${accentViolet},#9333ea)` : '#e2e8f0', color: goalInput.trim() ? '#fff' : tx3, fontSize: 11, fontWeight: 700, cursor: generating || !goalInput.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      {generating ? <RefreshCw size={11} style={{ animation: 'autoSpin 1s linear infinite' }} /> : <Sparkles size={11} />}
                      {generating ? 'Yazıyor...' : 'Yaz'}
                    </button>
                  </div>
                  <p style={{ color: tx3, fontSize: 9, margin: '5px 0 0' }}>AI her firmaya özel mesaj şablonu oluşturur — siz sadece hedefi yazın</p>
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea value={bcMessage} onChange={e => { setBcMessage(e.target.value); setOptimized(null) }} rows={4}
                    placeholder="Ya da kendiniz yazın... ({{firma}}, {{sektor}}, {{sehir}}, {{isim}} değişkenlerini kullanabilirsiniz)"
                    style={{ ...inputStyle, resize: 'vertical' as const }} />
                  {generating && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: accentViolet, fontWeight: 600 }}>
                      <RefreshCw size={13} style={{ animation: 'autoSpin 1s linear infinite' }} /> AI mesajı hazırlıyor...
                    </div>
                  )}
                </div>

                {/* Kişiselleştirilmiş önizleme */}
                {bcMessage && selectedLeads.length > 0 && (() => {
                  const previewLead = leads.find(l => selectedLeads.includes(l.id))
                  if (!previewLead) return null
                  return (
                    <div style={{ padding: '10px 13px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9 }}>
                      <p style={{ color: accentEmerald, fontSize: 9, fontWeight: 700, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Önizleme — {previewLead.company_name}
                      </p>
                      <p style={{ color: '#166534', fontSize: 11, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {substituteVars(bcMessage, previewLead)}
                      </p>
                    </div>
                  )
                })()}

                {bcChannel === 'whatsapp' && waConnected === false && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MessageCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                      <p style={{ color: '#92400e', fontSize: 11, margin: 0 }}>WhatsApp bağlı değil — kampanya gönderilemez</p>
                    </div>
                    <a href="/wa-numbers?returnTo=/campaigns/new" style={{ padding: '5px 12px', borderRadius: 7, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      WA Bağla →
                    </a>
                  </div>
                )}

                {/* Gönderim Zamanı */}
                <div>
                  <p style={{ color: tx2, fontSize: 11, fontWeight: 600, margin: '0 0 7px', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} /> Gönderim Zamanı</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: bcScheduled ? 8 : 0 }}>
                    {[{ val: false, label: 'Hemen Gönder', icon: Send }, { val: true, label: 'Zamanla', icon: Clock }].map(opt => (
                      <button key={String(opt.val)} onClick={() => setBcScheduled(opt.val)}
                        style={{ padding: '10px 8px', borderRadius: 10, border: `2px solid ${bcScheduled === opt.val ? accentBlue : '#e2e8f0'}`, background: bcScheduled === opt.val ? '#dbeafe' : '#f8fafc', color: bcScheduled === opt.val ? accentBlue : tx2, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                        <opt.icon size={16} style={{ color: bcScheduled === opt.val ? accentBlue : tx3 }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {bcScheduled && (
                    <input type="datetime-local" value={bcScheduleAt} onChange={e => setBcScheduleAt(e.target.value)}
                      min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                      style={{ ...inputStyle, fontSize: 12 }} />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 6 }}>
                  <button onClick={optimizeMessage} disabled={optimizing || !bcMessage}
                    style={{ padding: '10px', borderRadius: 9, border: `1px solid ${accentViolet}40`, background: '#faf5ff', color: accentViolet, fontSize: 11, fontWeight: 600, cursor: optimizing || !bcMessage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 0 }}>
                    {optimizing ? <RefreshCw size={11} style={{ animation: 'autoSpin 1s linear infinite' }} /> : <Sparkles size={11} />}
                    AI Optimize Et
                  </button>
                  <button onClick={sendBroadcast} disabled={bcSending || !bcName || !bcMessage || !selectedLeads.length}
                    style={{ padding: '10px', borderRadius: 9, border: 'none', cursor: bcSending || !bcName || !bcMessage || !selectedLeads.length ? 'not-allowed' : 'pointer', background: selectedLeads.length && bcName && bcMessage ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : surf, color: selectedLeads.length && bcName && bcMessage ? '#fff' : tx3, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 0 }}>
                    {bcSending ? <RefreshCw size={11} style={{ animation: 'autoSpin 1s linear infinite' }} /> : bcScheduled ? <Clock size={11} /> : <Send size={11} />}
                    {bcSending ? 'İşleniyor...' : bcScheduled ? 'Zamanla' : `${selectedLeads.length} Lead'e Gönder`}
                  </button>
                </div>
              </div>

              {/* AI Optimize sonuçları */}
              {optimized?.versions?.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                  <p style={{ color: accentViolet, fontSize: 11, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}><Sparkles size={12} /> AI Öneriler</p>
                  {optimized.versions.map((v: any, i: number) => (
                    <div key={i} style={{ padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 9, marginBottom: 6, cursor: 'pointer' }} onClick={() => setBcMessage(v.message)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: accentViolet, fontSize: 10, fontWeight: 700 }}>Versiyon {i + 1}</span>
                        <span style={{ color: accentEmerald, fontSize: 10 }}>~%{v.estimatedReplyRate} cevap</span>
                      </div>
                      <p style={{ color: tx1, fontSize: 11, margin: '0 0 3px', lineHeight: 1.5 }}>{v.message}</p>
                      <p style={{ color: tx3, fontSize: 9, margin: 0 }}>{v.reason}</p>
                    </div>
                  ))}
                  {optimized.tips?.length > 0 && (
                    <div style={{ padding: '6px 10px', background: '#eff6ff', borderRadius: 7, marginTop: 6 }}>
                      {optimized.tips.map((t: string, i: number) => <p key={i} style={{ color: accentBlue, fontSize: 9, margin: '2px 0' }}>💡 {t}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lead Filtreleme */}
            <div style={{ ...card, padding: 16 }}>
              <p style={{ color: tx1, fontSize: 12, fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}><Filter size={12} style={{ color: accentBlue }} /> Lead Filtrele</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <select value={segFilters.min_score} onChange={e => setSegFilters(p => ({ ...p, min_score: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '6px 8px', minWidth: 0 }}>
                  <option value="">Tüm Skorlar</option><option value="40">40+</option><option value="60">60+</option><option value="80">80+</option>
                </select>
                <select value={segFilters.city} onChange={e => setSegFilters(p => ({ ...p, city: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '6px 8px', minWidth: 0 }}>
                  <option value="">Tüm Şehirler</option>
                  {(segOptions.cities || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={segFilters.sector} onChange={e => setSegFilters(p => ({ ...p, sector: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '6px 8px', minWidth: 0 }}>
                  <option value="">Tüm Sektörler</option>
                  {(segOptions.sectors || []).slice(0, 20).map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={applySegment} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: accentBlue, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', width: '100%' }}>Filtrele</button>
              </div>
            </div>
          </div>

          {/* Sağ — Lead Seçici */}
          <LeadSelector maxHeight={isMobile ? 300 : 520} />
        </div>
      )}

      {/* ── Şablonlar Tab ── */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
          {templates.filter(t => !bcChannel || t.channel === bcChannel || t.channel === 'whatsapp').map(tpl => (
            <div key={tpl.id} style={{ ...card, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => { setBcMessage(tpl.message); setActiveSubTab('compose'); showMsg('success', 'Şablon uygulandı') }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = accentBlue}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: tx1, fontSize: 12, fontWeight: 700 }}>{tpl.title}</span>
                <span style={{ color: accentEmerald, fontSize: 10, background: '#ecfdf5', padding: '1px 7px', borderRadius: 8 }}>~%{tpl.successRate}</span>
              </div>
              <span style={{ color: accentBlue, fontSize: 9, background: '#eff6ff', padding: '1px 6px', borderRadius: 6 }}>{tpl.category}</span>
              <p style={{ color: tx2, fontSize: 11, margin: '8px 0 0', lineHeight: 1.5 }}>{tpl.message.slice(0, 120)}...</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Analitik Tab ── */}
      {activeSubTab === 'analytics' && analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12 }}>
          <div style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ color: accentBlue, fontSize: 22, fontWeight: 800, margin: 0 }}>{analytics.totalSent}</p>
            <p style={{ color: tx3, fontSize: 10, margin: 0 }}>Gönderilen</p>
          </div>
          <div style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ color: accentEmerald, fontSize: 22, fontWeight: 800, margin: 0 }}>{analytics.totalReplied}</p>
            <p style={{ color: tx3, fontSize: 10, margin: 0 }}>Cevaplanan</p>
          </div>
          <div style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ color: accentViolet, fontSize: 22, fontWeight: 800, margin: 0 }}>%{analytics.replyRate}</p>
            <p style={{ color: tx3, fontSize: 10, margin: 0 }}>Cevap Oranı</p>
          </div>
          <div style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ color: '#b45309', fontSize: 22, fontWeight: 800, margin: 0 }}>{analytics.bestHour}</p>
            <p style={{ color: tx3, fontSize: 10, margin: 0 }}>En İyi Saat</p>
          </div>
          {analytics.byChannel?.length > 0 && (
            <div style={{ ...card, padding: '14px 16px', gridColumn: 'span 2' }}>
              <p style={{ color: tx1, fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>Kanal Performansı</p>
              {analytics.byChannel.map((ch: any) => (
                <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: tx1, fontSize: 11, fontWeight: 600 }}>{ch.channel}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: tx2 }}>
                    <span>{ch.sent} gönderildi</span><span>{ch.replied} cevap</span>
                    <span style={{ color: accentEmerald, fontWeight: 700 }}>%{ch.replyRate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="col-span-2" style={{ ...card, padding: '14px 16px' }}>
            <p style={{ color: tx1, fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>Kampanya Geçmişi</p>
            {(analytics.campaigns || []).slice(0, 8).map((c: any) => {
              const st = STATUS_COLORS[c.status] || STATUS_COLORS.draft
              const isSelected = selectedCampaignId === c.id
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <p style={{ color: tx1, fontSize: 11, fontWeight: 600, margin: 0 }}>{c.name}</p>
                      <p style={{ color: tx3, fontSize: 9, margin: 0 }}>{c.channel} · {new Date(c.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: tx2, fontSize: 10 }}>{c.total_sent} gönderildi</span>
                      <span style={{ color: accentEmerald, fontSize: 10, fontWeight: 700 }}>%{c.replyRate} cevap</span>
                      <span style={{ background: st.bg, color: st.color, fontSize: 8, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{st.label}</span>
                      <button onClick={() => { isSelected ? setSelectedCampaignId(null) : loadCampaignFunnel(c.id) }}
                        style={{ padding: '2px 7px', borderRadius: 5, border: '1px solid #bfdbfe', background: isSelected ? '#eff6ff' : '#fff', color: accentBlue, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Funnel</button>
                    </div>
                  </div>
                  {isSelected && campaignFunnel && (
                    <div className="fade-in" style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', borderRadius: 8, padding: '10px 12px', margin: '6px 0 2px', border: '1px solid #bfdbfe' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 6, marginBottom: 8 }}>
                        {[
                          { label: 'Gönderilen', val: campaignFunnel.funnel.sent,      color: accentBlue },
                          { label: 'Teslim',     val: campaignFunnel.funnel.delivered, color: accentViolet },
                          { label: 'Açıldı',     val: campaignFunnel.funnel.opened,    color: '#f59e0b' },
                          { label: 'Cevap',      val: campaignFunnel.funnel.replied,   color: accentEmerald },
                        ].map(f => (
                          <div key={f.label} style={{ textAlign: 'center', padding: '6px 4px', background: '#fff', borderRadius: 7, border: '1px solid #f1f5f9' }}>
                            <div style={{ color: f.color, fontSize: 14, fontWeight: 800 }}>{f.val}</div>
                            <div style={{ color: tx3, fontSize: 9 }}>{f.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ color: accentEmerald, fontSize: 10, fontWeight: 700 }}>Cevap oranı: %{campaignFunnel.replyRate}</span>
                        <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>Açılma: %{campaignFunnel.openRate}</span>
                        {campaignFunnel.bestHour && <span style={{ color: tx2, fontSize: 10 }}>En iyi saat: {campaignFunnel.bestHour}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes autoSpin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  )
}
