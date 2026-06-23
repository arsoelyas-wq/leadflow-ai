'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Zap, Megaphone, Bot, Workflow, Plus, Play, Pause, Trash2, Users, RefreshCw,
  MessageSquare, Clock, ChevronRight, Send, Mail, MessageCircle, Phone,
  CheckCircle, BarChart2, Target, ArrowRight, Sparkles, Settings,
  ListOrdered, Globe2, Filter,
} from 'lucide-react'

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8', surf = '#f8fafc'
const accentBlue = '#2563eb', accentEmerald = '#059669', accentViolet = '#7c3aed'
const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

const MODES = [
  { id: 'broadcast', label: 'Toplu Mesaj', desc: 'Seçili leadlere anında mesaj gönder', Icon: Megaphone, color: accentBlue, bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'sequence', label: 'Takip Sekansı', desc: 'Günler boyunca AI ile adım adım takip', Icon: Bot, color: accentEmerald, bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'workflow', label: 'Akıllı Otomasyon', desc: 'Koşul bazlı gelişmiş otomasyon', Icon: Workflow, color: accentViolet, bg: '#faf5ff', border: '#e9d5ff', pro: true },
] as const

type Mode = 'broadcast' | 'sequence' | 'workflow'

const STEP_TEMPLATES = [
  { label: 'İlk Mesaj', type: 'message', delay_hours: 0, channel: 'whatsapp', message: 'Merhaba [FIRMA_ADI], [SEKTOR] alaninda isletmenize ozel cozumler sunuyoruz. Gorusmek ister misiniz?', condition: 'any' },
  { label: '1 Gun Sonra', type: 'message', delay_hours: 24, channel: 'whatsapp', message: 'Merhaba [AD], dunku mesajimi gordunuz mu? Kisa bir gorusme icin uygun bir zaman var mi?', condition: 'not_replied' },
  { label: 'AI Takip', type: 'ai_reply', delay_hours: 48, channel: 'whatsapp', ai_prompt: 'Musteriye 2 gun once mesaj attik, henuz cevap vermedi. Nazik ama ikna edici bir takip mesaji yaz.', condition: 'not_replied' },
  { label: 'Son Deneme', type: 'message', delay_hours: 72, channel: 'whatsapp', message: 'Son olarak ulasmak istedim [AD]. Ilgileniyorsaniz bir mesaj yeterli!', condition: 'not_replied' },
]

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#ecfdf5', color: accentEmerald, label: 'Aktif' },
  draft: { bg: '#f8fafc', color: tx3, label: 'Taslak' },
  paused: { bg: '#fffbeb', color: '#b45309', label: 'Durduruldu' },
  completed: { bg: '#eff6ff', color: accentBlue, label: 'Tamamlandi' },
}

export default function AutomationsPage() {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [bcChannel, setBcChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [bcMessage, setBcMessage] = useState('')
  const [bcName, setBcName] = useState('')
  const [bcSending, setBcSending] = useState(false)

  const [sequences, setSequences] = useState<any[]>([])
  const [seqStats, setSeqStats] = useState<any>(null)
  const [seqName, setSeqName] = useState('')
  const [seqChannel, setSeqChannel] = useState('whatsapp')
  const [seqSteps, setSeqSteps] = useState<any[]>([...STEP_TEMPLATES.slice(0, 2)])
  const [seqSaving, setSeqSaving] = useState(false)
  const [showSeqCreate, setShowSeqCreate] = useState(false)
  const [selectedSeq, setSelectedSeq] = useState<any>(null)

  const [workflows, setWorkflows] = useState<any[]>([])
  const [allStats, setAllStats] = useState({ campaigns: 0, sequences: 0, workflows: 0, totalSent: 0, totalReplied: 0 })

  // New feature states
  const [templates, setTemplates] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [smartTiming, setSmartTiming] = useState<any>(null)
  const [segFilters, setSegFilters] = useState({ min_score: '', city: '', sector: '', source: '', has_phone: 'true' })
  const [segOptions, setSegOptions] = useState<any>({ cities: [], sectors: [], sources: [] })
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized] = useState<any>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'compose' | 'templates' | 'analytics'>('compose')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [campRes, seqRes, seqStatsRes, wfRes, leadsRes] = await Promise.allSettled([
        api.get('/api/campaigns'), api.get('/api/sequences'),
        api.get('/api/sequences/stats/overview'), api.get('/api/workflow-v2'),
        api.get('/api/leads?limit=200'),
      ])
      const camps = campRes.status === 'fulfilled' ? campRes.value.campaigns || campRes.value.data || [] : []
      const seqs = seqRes.status === 'fulfilled' ? seqRes.value.sequences || [] : []
      const wfs = wfRes.status === 'fulfilled' ? wfRes.value.workflows || [] : []
      const lds = leadsRes.status === 'fulfilled' ? leadsRes.value.leads || leadsRes.value.data || [] : []
      setCampaigns(camps); setSequences(seqs); setWorkflows(wfs); setLeads(lds)
      if (seqStatsRes.status === 'fulfilled') setSeqStats(seqStatsRes.value)
      setAllStats({
        campaigns: camps.length, sequences: seqs.length, workflows: wfs.length,
        totalSent: camps.reduce((s: number, c: any) => s + (c.total_sent || c.totalSent || 0), 0),
        totalReplied: camps.reduce((s: number, c: any) => s + (c.total_replied || c.totalReplied || 0), 0),
      })
    } catch {} finally { setLoading(false) }
    // Load templates + analytics in parallel
    Promise.allSettled([
      api.get('/api/campaigns/templates'),
      api.get('/api/campaigns/analytics'),
      api.get('/api/campaigns/smart-timing'),
      api.get('/api/campaigns/segments?has_phone=true&limit=200'),
    ]).then(([tplRes, anlRes, timRes, segRes]) => {
      if (tplRes.status === 'fulfilled') setTemplates(tplRes.value.templates || [])
      if (anlRes.status === 'fulfilled') setAnalytics(anlRes.value)
      if (timRes.status === 'fulfilled') setSmartTiming(timRes.value)
      if (segRes.status === 'fulfilled') {
        setSegOptions(segRes.value.filters || {})
      }
    })
  }
  useEffect(() => { loadAll() }, [])

  const optimizeMessage = async () => {
    if (!bcMessage) return
    setOptimizing(true); setOptimized(null)
    try {
      const data = await api.post('/api/campaigns/ai-optimize', { message: bcMessage, channel: bcChannel })
      setOptimized(data)
    } catch (e: any) { showMsg('error', e.message) }
    setOptimizing(false)
  }

  const applySegment = async () => {
    try {
      const params = new URLSearchParams()
      if (segFilters.min_score) params.set('min_score', segFilters.min_score)
      if (segFilters.city) params.set('city', segFilters.city)
      if (segFilters.sector) params.set('sector', segFilters.sector)
      if (segFilters.source) params.set('source', segFilters.source)
      if (segFilters.has_phone) params.set('has_phone', segFilters.has_phone)
      params.set('limit', '200')
      const data = await api.get(`/api/campaigns/segments?${params.toString()}`)
      setLeads(data.leads || [])
      setSegOptions(data.filters || segOptions)
      showMsg('success', `${data.total || 0} lead filtrelendi`)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const sendBroadcast = async () => {
    if (!bcName || !bcMessage || !selectedLeads.length) return showMsg('error', 'Isim, mesaj ve lead secimi zorunlu')
    setBcSending(true)
    try {
      await api.post('/api/campaigns', { name: bcName, channel: bcChannel, message_template: bcMessage, lead_ids: selectedLeads, status: 'active' })
      showMsg('success', `${selectedLeads.length} lead'e ${bcChannel} kampanyasi baslatildi!`)
      setBcName(''); setBcMessage(''); setSelectedLeads([]); loadAll()
    } catch (e: any) { showMsg('error', e.message) }
    setBcSending(false)
  }

  const createSequence = async () => {
    if (!seqName || seqSteps.length === 0) return
    setSeqSaving(true)
    try {
      await api.post('/api/sequences', { name: seqName, channel: seqChannel, steps: seqSteps })
      showMsg('success', 'Sekans olusturuldu!'); setShowSeqCreate(false); setSeqName(''); setSeqSteps([...STEP_TEMPLATES.slice(0, 2)]); loadAll()
    } catch (e: any) { showMsg('error', e.message) }
    setSeqSaving(false)
  }

  const enrollLeads = async (seqId: string) => {
    if (!selectedLeads.length) return showMsg('error', 'Lead secin')
    try {
      const data = await api.post(`/api/sequences/${seqId}/enroll`, { leadIds: selectedLeads })
      showMsg('success', data.message || `${selectedLeads.length} lead eklendi`); setSelectedLeads([]); loadAll()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const toggleLead = (id: string) => setSelectedLeads(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const selectAll = () => {
    const valid = leads.filter(l => l.phone || l.email)
    setSelectedLeads(prev => prev.length === valid.length ? [] : valid.map(l => l.id))
  }

  // ── LEAD SELECTOR (shared between broadcast & sequence) ────────────────────
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
    <div style={{ padding: 0 }}>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '24px 24px 18px', marginBottom: 18, background: 'linear-gradient(135deg,#fff,#f0f9ff 60%,#faf5ff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ color: tx1, fontSize: 22, fontWeight: 800, margin: 0 }}>Satış Otomasyonu</h1>
          <span style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>AI</span>
        </div>
        <p style={{ color: tx2, fontSize: 12, margin: '0 0 14px' }}>Toplu mesaj, takip sekansı veya akıllı otomasyon — tek yerden yönet</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {[
            { label: 'Kampanya', value: allStats.campaigns, color: accentBlue, Icon: Megaphone },
            { label: 'Sekans', value: allStats.sequences, color: accentEmerald, Icon: Bot },
            { label: 'Workflow', value: allStats.workflows, color: accentViolet, Icon: Workflow },
            { label: 'Gönderilen', value: allStats.totalSent, color: '#b45309', Icon: Send },
            { label: 'Cevaplanan', value: allStats.totalReplied, color: '#059669', Icon: CheckCircle },
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

      {/* ── MODE SELECTOR ────────────────────────────────────── */}
      {!mode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id as Mode)}
              style={{ ...card, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', border: '2px solid #e2e8f0' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = m.color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}>
              {'pro' in m && m.pro && <span style={{ position: 'absolute', top: 8, right: 8, background: accentViolet, color: '#fff', fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>PRO</span>}
              <div style={{ width: 52, height: 52, borderRadius: 14, background: m.bg, border: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <m.Icon size={22} style={{ color: m.color }} />
              </div>
              <p style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: '0 0 5px' }}>{m.label}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{m.desc}</p>
            </button>
          ))}
        </div>
      )}

      {mode && <button onClick={() => { setMode(null); setSelectedLeads([]) }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: tx2, fontSize: 12, cursor: 'pointer', marginBottom: 14 }}>← Geri</button>}

      {/* ═══════════ TOPLU MESAJ ═══════════ */}
      {mode === 'broadcast' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: surf, padding: 3, borderRadius: 10, width: 'fit-content', border: '1px solid #f1f5f9' }}>
            {[{ id: 'compose', label: 'Yaz & Gönder', Icon: Send }, { id: 'templates', label: 'Şablonlar', Icon: ListOrdered }, { id: 'analytics', label: 'Analitik', Icon: BarChart2 }].map(tb => (
              <button key={tb.id} onClick={() => setActiveSubTab(tb.id as any)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeSubTab === tb.id ? '#fff' : 'transparent', color: activeSubTab === tb.id ? accentBlue : tx3, boxShadow: activeSubTab === tb.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                <tb.Icon size={13} /> {tb.label}
              </button>
            ))}
          </div>

          {activeSubTab === 'compose' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Compose form */}
                <div style={{ ...card, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Megaphone size={15} style={{ color: accentBlue }} /><h2 style={{ color: tx1, fontSize: 14, fontWeight: 700, margin: 0 }}>Mesaj Oluştur</h2>
                    {smartTiming && <span style={{ marginLeft: 'auto', color: accentEmerald, fontSize: 10, background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>En iyi saat: {smartTiming.bestHour}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input value={bcName} onChange={e => setBcName(e.target.value)} placeholder="Kampanya adi *" style={inputStyle} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['whatsapp', 'email'] as const).map(ch => (
                        <button key={ch} onClick={() => setBcChannel(ch)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: `2px solid ${bcChannel === ch ? accentBlue : '#e2e8f0'}`, background: bcChannel === ch ? '#eff6ff' : '#fff', color: bcChannel === ch ? accentBlue : tx2, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {ch === 'whatsapp' ? <MessageCircle size={12} /> : <Mail size={12} />} {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </button>
                      ))}
                    </div>
                    <textarea value={bcMessage} onChange={e => { setBcMessage(e.target.value); setOptimized(null) }} rows={4} placeholder="Merhaba {{firma}}, {{sektor}} alaninda size ozel teklifimiz var..." style={{ ...inputStyle, resize: 'vertical' as const }} />
                    <p style={{ color: tx3, fontSize: 9, margin: '-6px 0 0' }}>Degiskenler: {'{{firma}} {{isim}} {{sehir}} {{sektor}}'}</p>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={optimizeMessage} disabled={optimizing || !bcMessage}
                        style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${accentViolet}40`, background: '#faf5ff', color: accentViolet, fontSize: 11, fontWeight: 600, cursor: optimizing || !bcMessage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {optimizing ? <RefreshCw size={11} style={{ animation: 'autoSpin 1s linear infinite' }} /> : <Sparkles size={11} />}
                        AI Optimize Et
                      </button>
                      <button onClick={sendBroadcast} disabled={bcSending || !bcName || !bcMessage || !selectedLeads.length}
                        style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', cursor: bcSending || !bcName || !bcMessage || !selectedLeads.length ? 'not-allowed' : 'pointer', background: selectedLeads.length && bcName && bcMessage ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : surf, color: selectedLeads.length && bcName && bcMessage ? '#fff' : tx3, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {bcSending ? <RefreshCw size={11} style={{ animation: 'autoSpin 1s linear infinite' }} /> : <Send size={11} />}
                        {bcSending ? 'Gönderiliyor...' : `${selectedLeads.length} Lead'e Gönder`}
                      </button>
                    </div>
                  </div>

                  {/* AI Optimized versions */}
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

                {/* Segmentation filters */}
                <div style={{ ...card, padding: 16 }}>
                  <p style={{ color: tx1, fontSize: 12, fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}><Filter size={12} style={{ color: accentBlue }} /> Lead Filtrele</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <select value={segFilters.min_score} onChange={e => setSegFilters(p => ({ ...p, min_score: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '6px 8px' }}>
                      <option value="">Tüm Skorlar</option><option value="40">40+</option><option value="60">60+</option><option value="80">80+</option>
                    </select>
                    <select value={segFilters.city} onChange={e => setSegFilters(p => ({ ...p, city: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '6px 8px' }}>
                      <option value="">Tüm Şehirler</option>
                      {(segOptions.cities || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={segFilters.sector} onChange={e => setSegFilters(p => ({ ...p, sector: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '6px 8px' }}>
                      <option value="">Tüm Sektörler</option>
                      {(segOptions.sectors || []).slice(0, 20).map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={applySegment} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: accentBlue, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Filtrele</button>
                  </div>
                </div>
              </div>

              {/* Right — Lead selector */}
              <LeadSelector maxHeight={520} />
            </div>
          )}

          {activeSubTab === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
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

          {activeSubTab === 'analytics' && analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
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
              {/* Kanal bazli */}
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
              {/* Kampanya listesi */}
              <div style={{ ...card, padding: '14px 16px', gridColumn: 'span 2' }}>
                <p style={{ color: tx1, fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>Kampanya Geçmişi</p>
                {(analytics.campaigns || []).slice(0, 8).map((c: any) => {
                  const st = STATUS_COLORS[c.status] || STATUS_COLORS.draft
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div><p style={{ color: tx1, fontSize: 11, fontWeight: 600, margin: 0 }}>{c.name}</p><p style={{ color: tx3, fontSize: 9, margin: 0 }}>{c.channel} · {new Date(c.created_at).toLocaleDateString('tr-TR')}</p></div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: tx2, fontSize: 10 }}>{c.total_sent} gönderildi</span>
                        <span style={{ color: accentEmerald, fontSize: 10, fontWeight: 700 }}>%{c.replyRate} cevap</span>
                        <span style={{ background: st.bg, color: st.color, fontSize: 8, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{st.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAKIP SEKANSI ═══════════ */}
      {mode === 'sequence' && (
        <div>
          {seqStats && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[{ label: 'Enrollment', value: seqStats.total || 0, color: tx1 }, { label: 'Aktif', value: seqStats.active || 0, color: accentEmerald }, { label: 'Tamamlanan', value: seqStats.completed || 0, color: accentBlue }].map(({ label, value, color }) => (
              <div key={label} style={{ ...card, padding: '10px 12px', textAlign: 'center' }}><p style={{ color, fontSize: 18, fontWeight: 800, margin: 0 }}>{value}</p><p style={{ color: tx3, fontSize: 10, margin: 0 }}>{label}</p></div>
            ))}
          </div>}
          <button onClick={() => setShowSeqCreate(!showSeqCreate)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#047857,#059669)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 14 }}><Plus size={13} /> Yeni Sekans</button>
          {showSeqCreate && (
            <div style={{ ...card, padding: 20, marginBottom: 14 }}>
              <h3 style={{ color: tx1, fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Yeni Sekans</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <input value={seqName} onChange={e => setSeqName(e.target.value)} placeholder="Sekans adi *" style={inputStyle} />
                <select value={seqChannel} onChange={e => setSeqChannel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {seqSteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: surf, borderRadius: 9, border: '1px solid #f1f5f9' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: step.type === 'ai_reply' ? accentViolet : accentBlue, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{idx + 1}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <select value={step.type} onChange={e => { const s = [...seqSteps]; s[idx].type = e.target.value; setSeqSteps(s) }} style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 10, color: tx1 }}><option value="message">Sabit</option><option value="ai_reply">AI</option></select>
                        <select value={step.condition} onChange={e => { const s = [...seqSteps]; s[idx].condition = e.target.value; setSeqSteps(s) }} style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 10, color: tx1 }}><option value="any">Her zaman</option><option value="not_replied">Cevap vermezse</option><option value="replied">Cevap verirse</option></select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} style={{ color: tx3 }} /><input type="number" value={step.delay_hours} min={0} onChange={e => { const s = [...seqSteps]; s[idx].delay_hours = Number(e.target.value); setSeqSteps(s) }} style={{ width: 40, padding: '3px 5px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 10, color: tx1 }} /><span style={{ color: tx3, fontSize: 9 }}>saat</span></div>
                      </div>
                      <textarea value={step.type === 'message' ? step.message : step.ai_prompt} onChange={e => { const s = [...seqSteps]; s[idx][step.type === 'message' ? 'message' : 'ai_prompt'] = e.target.value; setSeqSteps(s) }} rows={2} style={{ ...inputStyle, fontSize: 10, padding: '5px 8px' }} />
                    </div>
                    <button onClick={() => setSeqSteps(p => p.filter((_, i) => i !== idx))} style={{ color: tx3, cursor: 'pointer', background: 'none', border: 'none' }}><Trash2 size={11} /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 5 }}>{STEP_TEMPLATES.map((t, i) => (<button key={i} onClick={() => setSeqSteps(p => [...p, { ...t }])} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: tx2, fontSize: 9, cursor: 'pointer' }}>+ {t.label}</button>))}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={createSequence} disabled={seqSaving || !seqName} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: seqName ? 'linear-gradient(135deg,#047857,#059669)' : surf, color: seqName ? '#fff' : tx3, fontSize: 12, fontWeight: 700, cursor: seqSaving || !seqName ? 'not-allowed' : 'pointer' }}>{seqSaving ? 'Kaydediliyor...' : 'Oluştur'}</button>
                <button onClick={() => setShowSeqCreate(false)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: tx2, fontSize: 12, cursor: 'pointer' }}>İptal</button>
              </div>
            </div>
          )}
          {sequences.length === 0 && !showSeqCreate ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}><Bot size={28} style={{ color: tx3, margin: '0 auto 10px' }} /><p style={{ color: tx3, fontSize: 12 }}>Henüz sekans yok</p></div>
          ) : sequences.map(seq => { const st = STATUS_COLORS[seq.status] || STATUS_COLORS.active; return (
            <div key={seq.id} style={{ ...card, padding: '14px 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={14} style={{ color: accentEmerald }} /></div>
                  <div><p style={{ color: tx1, fontWeight: 700, fontSize: 12, margin: 0 }}>{seq.name}</p><div style={{ display: 'flex', gap: 6, marginTop: 2 }}><span style={{ color: tx3, fontSize: 9 }}>{seq.channel === 'whatsapp' ? 'WA' : 'Email'}</span><span style={{ color: tx3, fontSize: 9 }}>{seq.steps?.length || 0} adım</span><span style={{ background: st.bg, color: st.color, fontSize: 8, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{st.label}</span></div></div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => setSelectedSeq(selectedSeq?.id === seq.id ? null : seq)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 10px', borderRadius: 6, border: '1px solid #a7f3d0', background: '#ecfdf5', color: accentEmerald, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}><Users size={11} /> Lead</button>
                  <button onClick={async () => { await api.delete(`/api/sequences/${seq.id}`); loadAll() }} style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={11} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap' }}>{(seq.steps || []).map((step: any, i: number) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{i > 0 && <div style={{ width: 12, height: 1, background: '#e2e8f0' }} />}<span style={{ padding: '2px 6px', borderRadius: 5, fontSize: 9, background: step.type === 'ai_reply' ? '#faf5ff' : surf, border: `1px solid ${step.type === 'ai_reply' ? '#e9d5ff' : '#f1f5f9'}`, color: step.type === 'ai_reply' ? accentViolet : tx2 }}>{step.type === 'ai_reply' ? 'AI' : '💬'} {step.delay_hours}s</span></div>))}</div>
              {selectedSeq?.id === seq.id && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: surf, borderRadius: 9, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ color: tx2, fontSize: 11, fontWeight: 600, margin: 0 }}>Lead Seç ({selectedLeads.length})</p>
                    <button onClick={() => enrollLeads(seq.id)} disabled={!selectedLeads.length} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: selectedLeads.length ? accentEmerald : '#e2e8f0', color: selectedLeads.length ? '#fff' : tx3, fontSize: 10, fontWeight: 600, cursor: selectedLeads.length ? 'pointer' : 'not-allowed' }}>{selectedLeads.length} Lead Ekle</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto' }}>{leads.filter(l => l.phone).map(lead => (<button key={lead.id} onClick={() => toggleLead(lead.id)} style={{ padding: '3px 8px', borderRadius: 5, border: `1px solid ${selectedLeads.includes(lead.id) ? accentEmerald + '55' : '#e2e8f0'}`, background: selectedLeads.includes(lead.id) ? '#ecfdf5' : '#fff', color: selectedLeads.includes(lead.id) ? accentEmerald : tx2, fontSize: 9, cursor: 'pointer' }}>{lead.company_name?.slice(0, 18)}</button>))}</div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {/* ═══════════ AKILLI OTOMASYON ═══════════ */}
      {mode === 'workflow' && (
        <div>
          <div style={{ ...card, padding: 20, marginBottom: 14, borderLeft: `4px solid ${accentViolet}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Sparkles size={14} style={{ color: accentViolet }} /><h2 style={{ color: tx1, fontSize: 14, fontWeight: 700, margin: 0 }}>Akıllı Otomasyon</h2><span style={{ background: accentViolet, color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>PRO</span></div>
            <p style={{ color: tx2, fontSize: 11, margin: '0 0 12px' }}>Görsel akış editörü ile koşul bazlı otomasyonlar — A/B test, skor esigi, otomatik atama</p>
            <a href="/workflow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}><Workflow size={13} /> Workflow Editörü Aç</a>
          </div>
          {workflows.length > 0 ? workflows.map((wf: any) => { const st = STATUS_COLORS[wf.status] || STATUS_COLORS.draft; return (
            <div key={wf.id} style={{ ...card, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: '#faf5ff', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Workflow size={14} style={{ color: accentViolet }} /></div><div><p style={{ color: tx1, fontWeight: 600, fontSize: 12, margin: 0 }}>{wf.name}</p><p style={{ color: tx3, fontSize: 9, margin: 0 }}>{wf.nodes?.length || 0} node · {wf.trigger_type || 'manual'}</p></div></div>
              <span style={{ background: st.bg, color: st.color, fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{st.label}</span>
            </div>
          )}) : <div style={{ ...card, padding: 40, textAlign: 'center' }}><Workflow size={28} style={{ color: tx3, margin: '0 auto 10px' }} /><p style={{ color: tx3, fontSize: 12 }}>Henüz workflow yok</p><a href="/workflow" style={{ color: accentViolet, fontSize: 11 }}>Editöre git →</a></div>}
        </div>
      )}

      <style>{`@keyframes autoSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
