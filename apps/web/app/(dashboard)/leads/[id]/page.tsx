'use client'
import { useI18n } from '@/lib/i18n'
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  ArrowLeft, Phone, Mail, Instagram, Globe, MapPin,
  Star, Edit2, Save, X, MessageSquare, Send, RefreshCw, Link2,
  Crosshair, TrendingUp, Zap, ChevronDown, ChevronUp, Copy, CheckCircle,
  Target, AlertTriangle, BarChart3, Lightbulb, DollarSign, ShieldAlert,
  Flame, Clock, Swords, Users, Activity, Building2, Network, Eye, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface ScoringData {
  breakdown?:      Record<string, number>
  strengths?:      string[]
  weaknesses?:     string[]
  recommendation?: string
  estimatedValue?: string
}

interface Lead {
  id:                 string
  company_name:       string
  contact_name?:      string
  phone?:             string
  email?:             string
  instagram?:         string
  website?:           string
  city?:              string
  sector?:            string
  source:             string
  score:              number
  status:             string
  notes?:             string
  created_at:         string
  ai_grade?:          string
  ai_priority?:       string
  scoringData?:       ScoringData
  hot_score?:         number
  ai_summary?:        string
  country?:           string
  company_size?:      string
  revenue_estimate?:  string
  enrichment_status?:  string
  vision_analysis?:    string
  vision_analyzed_at?: string
}

interface Activity {
  id:         string
  event_type: string
  metadata:   any
  created_at: string
}

interface BattleCard {
  openingLine?: string
  painPoints?:  string[]
  valueProps?:  string[]
  objections?:  { objection: string; response: string }[]
  closingAsk?:  string
  redFlags?:    string[]
  confidence?:  string
}

interface Timing {
  dayLabel:   string
  timeLabel:  string
  isoDate:    string
  confidence: string
  reasoning:  string
}

const ACTIVITY_ICON: Record<string, string> = {
  email_open:      '📬',
  email_click:     '🔗',
  site_visit:      '👁️',
  whatsapp_reply:  '💬',
  call_made:       '📞',
  call_missed:     '📵',
  status_change:   '🔄',
  score_change:    '⭐',
  dm_found:        '🎯',
  enriched:        '✨',
  note_added:      '📝',
}

const ACTIVITY_LABEL: Record<string, string> = {
  email_open:      'Email açıldı',
  email_click:     'Link tıklandı',
  site_visit:      'Siteyi ziyaret etti',
  whatsapp_reply:  'WhatsApp yanıtladı',
  call_made:       'Arama yapıldı',
  call_missed:     'Arama cevaplanmadı',
  status_change:   'Durum güncellendi',
  score_change:    'Skor güncellendi',
  dm_found:        'Karar verici bulundu',
  enriched:        'Lead zenginleştirildi',
  note_added:      'Not eklendi',
}

const STATUS_OPTS = [
  { value: 'new',       label: 'Yeni',                color: 'bg-blue-500/20 text-blue-300'    },
  { value: 'contacted', label: 'İletişime Geçildi',   color: 'bg-yellow-500/20 text-yellow-300'},
  { value: 'replied',   label: 'Cevap Verdi',         color: 'bg-green-500/20 text-green-300'  },
  { value: 'offered',   label: 'Teklif Verildi',      color: 'bg-purple-500/20 text-purple-300'},
  { value: 'won',       label: 'Kazanıldı',           color: 'bg-emerald-500/20 text-emerald-300'},
  { value: 'lost',      label: 'Kaybedildi',          color: 'bg-red-500/20 text-red-300'      },
]

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  B: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  C: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  D: 'bg-red-500/20 text-red-300 border-red-500/40',
}

const PRIORITY_LABEL: Record<string, string> = {
  yuksek: '🔥 Yüksek', orta: '⚡ Orta', dusuk: '💤 Düşük',
}

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-blue-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400'

const SCORE_BAR = (s: number) =>
  s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-blue-500' : s >= 40 ? 'bg-yellow-500' : 'bg-red-500'

const BREAKDOWN_LABELS: Record<string, string> = {
  contactInfo:    'İletişim Bilgisi',
  engagement:     'Etkileşim',
  companyProfile: 'Firma Profili',
  location:       'Konum',
  potential:      'Potansiyel',
}

export default function LeadDetailPage() {
  const { t } = useI18n()
  const { id }  = useParams()
  const router  = useRouter()
  const [lead, setLead]           = useState<Lead | null>(null)
  const [loading, setLoading]     = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Müşteri Portalı
  const [portalUrl, setPortalUrl]         = useState('')
  const [creatingPortal, setCreatingPortal] = useState(false)

  // AI Kalite Analizi
  const [analyzing, setAnalyzing]     = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [copied, setCopied]           = useState<string | null>(null)

  // Rakip Analizi
  const [competitorData, setCompetitorData] = useState<any>(null)
  const [competitorLoading, setCompetitorLoading] = useState(false)
  const [competitorExpanded, setCompetitorExpanded] = useState(false)

  // Karar Verici
  const [findingDM, setFindingDM] = useState(false)
  const [dmResult, setDmResult]   = useState<any>(null)

  // Activity timeline
  const [activities, setActivities]             = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Battle Card
  const [battlecard, setBattlecard]             = useState<BattleCard | null>(null)
  const [bcLoading, setBcLoading]               = useState(false)
  const [bcExpanded, setBcExpanded]             = useState(false)

  // Right Moment timing
  const [timing, setTiming]                     = useState<Timing | null>(null)

  // Network connections
  const [connections, setConnections]           = useState<any[]>([])

  // Enrichment
  const [enriching, setEnriching]               = useState(false)

  // Community benchmarks
  const [community, setCommunity]               = useState<any>(null)

  // Vision AI
  const [visionData, setVisionData]             = useState<any>(null)
  const [visionLoading, setVisionLoading]       = useState(false)
  const [visionExpanded, setVisionExpanded]     = useState(false)
  const [visionCopied, setVisionCopied]         = useState(false)

  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<'contact'|'ai'|'actions'|'activity'>('contact')

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  useEffect(() => {
    api.get(`/api/leads/${id}`)
      .then(data => {
        setLead(data.lead)
        setNotes(data.lead.notes || '')
        if (!data.lead.ai_grade) triggerAIAnalysis(data.lead.id)
        // Parse existing vision analysis if available
        if (data.lead.vision_analysis) {
          try { setVisionData(JSON.parse(data.lead.vision_analysis)) } catch {}
        }
        // Load supporting data in parallel
        loadActivity(data.lead.id)
        loadTiming(data.lead.id)
        loadConnections(data.lead.id)
        if (data.lead.sector) loadCommunity(data.lead.sector)
      })
      .catch(() => router.push('/leads'))
      .finally(() => setLoading(false))
  }, [id])

  const loadActivity = async (leadId: string) => {
    setActivitiesLoading(true)
    try {
      const data = await api.get(`/api/activity/lead/${leadId}`)
      setActivities(data.activities || [])
    } catch {} finally { setActivitiesLoading(false) }
  }

  const loadTiming = async (leadId: string) => {
    try {
      const data = await api.get(`/api/battlecard/timing/${leadId}`)
      if (data.timing) setTiming(data.timing)
    } catch {}
  }

  const loadConnections = async (leadId: string) => {
    try {
      const data = await api.get(`/api/network/lead/${leadId}`)
      setConnections(data.connections || [])
    } catch {}
  }

  const loadCommunity = async (sector: string) => {
    try {
      const data = await api.get(`/api/battlecard/community/${encodeURIComponent(sector)}`)
      if (data.stats) setCommunity(data.stats)
    } catch {}
  }

  const analyzeVision = async (reanalyze = false) => {
    if (!lead?.website) return showMsg('error', 'Bu lead için website bilgisi yok')
    setVisionLoading(true)
    setVisionExpanded(true)
    try {
      const endpoint = reanalyze ? '/api/vision/reanalyze-lead' : '/api/vision/analyze-lead'
      const data = await api.post(endpoint, { leadId: lead.id })
      setVisionData(data.analysis)
      setLead(prev => prev ? { ...prev, vision_analyzed_at: new Date().toISOString() } : prev)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setVisionLoading(false) }
  }

  const generateBattleCard = async () => {
    if (!lead) return
    setBcLoading(true)
    setBcExpanded(true)
    try {
      const data = await api.post('/api/battlecard/generate', { leadId: lead.id })
      setBattlecard(data.battlecard)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setBcLoading(false) }
  }

  const triggerEnrichment = async () => {
    if (!lead) return
    setEnriching(true)
    try {
      await api.post(`/api/enrichment/trigger/${lead.id}`, {})
      showMsg('success', 'Zenginleştirme kuyruğa alındı, birkaç saniye sonra tamamlanır')
      setTimeout(async () => {
        const data = await api.get(`/api/enrichment/status/${lead.id}`)
        setLead(prev => prev ? { ...prev, ...data } : prev)
      }, 5000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setEnriching(false) }
  }

  const logCall = async () => {
    if (!lead) return
    try {
      await api.post('/api/activity/log', { leadId: lead.id, eventType: 'call_made', metadata: {} })
      showMsg('success', 'Arama kaydedildi')
      loadActivity(lead.id)
    } catch {}
  }

  const updateStatus = async (newStatus: string) => {
    if (!lead) return
    setSaving(true)
    try {
      const data = await api.patch(`/api/leads/${id}`, { status: newStatus })
      setLead(data.lead)
    } finally { setSaving(false) }
  }

  const saveNotes = async () => {
    setSaving(true)
    try {
      const data = await api.patch(`/api/leads/${id}`, { notes })
      setLead(data.lead)
      setEditingNotes(false)
    } finally { setSaving(false) }
  }

  const createPortalLink = async () => {
    if (!lead) return
    setCreatingPortal(true)
    try {
      const d = await api.post('/api/portal/create-link', { leadId: lead.id, expiresInDays: 30 })
      setPortalUrl(d.url)
      navigator.clipboard.writeText(d.url)
      showMsg('success', 'Müşteri portalı linki kopyalandı! 30 gün geçerli.')
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCreatingPortal(false) }
  }

  const triggerAIAnalysis = async (leadId?: string) => {
    const targetId = leadId || lead?.id
    if (!targetId) return
    setAnalyzing(true)
    try {
      const data = await api.post(`/api/quality-v2/score/${targetId}`, {})
      setLead(prev => prev ? {
        ...prev,
        score:       data.scoring?.score     ?? prev.score,
        ai_grade:    data.scoring?.grade     ?? prev.ai_grade,
        ai_priority: data.scoring?.priority  ?? prev.ai_priority,
        scoringData: data.scoring            ?? prev.scoringData,
      } : prev)
      showMsg('success', `AI Analizi tamamlandı — ${data.scoring?.grade} sınıfı`)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAnalyzing(false) }
  }

  const analyzeCompetitor = async () => {
    if (!lead) return
    setCompetitorLoading(true)
    setCompetitorExpanded(true)
    try {
      const data = await api.post('/api/competitor/analyze', {
        competitorName: lead.company_name,
        city: lead.city || '',
      })
      setCompetitorData(data)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCompetitorLoading(false) }
  }

  const findDecisionMaker = async () => {
    if (!lead) return
    setFindingDM(true)
    try {
      const data = await api.post('/api/decision-maker-finder/find', { leadId: lead.id })
      setDmResult(data)
      if (data.found > 0) {
        setLead(prev => prev ? {
          ...prev,
          contact_name: data.bestName  || prev.contact_name,
          email:        data.bestEmail || prev.email,
        } : prev)
        showMsg('success', `Karar verici bulundu: ${data.bestName}`)
      } else {
        showMsg('error', 'Karar verici bulunamadı')
      }
    } catch (e: any) { showMsg('error', e.message) }
    finally { setFindingDM(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={20} className="animate-spin text-slate-400" />
    </div>
  )
  if (!lead) return null

  const currentStatus = STATUS_OPTS.find(s => s.value === lead.status)
  const scoring = lead.scoringData as any

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    const gradeStyle: Record<string, React.CSSProperties> = {
      A: { background:'#d1fae5', color:'#065f46', border:'1px solid #a7f3d0' },
      B: { background:'#ede9fe', color:'#5b21b6', border:'1px solid #ddd6fe' },
      C: { background:'#fef3c7', color:'#92400e', border:'1px solid #fde68a' },
      D: { background:'#fee2e2', color:'#991b1b', border:'1px solid #fecaca' },
    }
    const scoreColor = lead.score >= 80 ? '#059669' : lead.score >= 60 ? '#2563eb' : lead.score >= 40 ? '#d97706' : '#dc2626'
    const scoreBarColor = lead.score >= 80 ? '#10b981' : lead.score >= 60 ? '#3b82f6' : lead.score >= 40 ? '#f59e0b' : '#ef4444'
    const card: React.CSSProperties = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px' }
    const rowBg: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#f8fafc', borderRadius:10, marginBottom:8 }
    const iconBox = (bg: string): React.CSSProperties => ({ width:30, height:30, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 })

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .7s linear infinite}`}</style>

        {/* ── Mobile Header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <Link href="/leads" style={{ width:38, height:38, borderRadius:10, background:'#f1f5f9', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, textDecoration:'none', color:'#475569' }}>
            <ArrowLeft size={16}/>
          </Link>
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ color:'#0f172a', fontSize:15, fontWeight:800, margin:0, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.company_name}</h1>
            <p style={{ color:'#94a3b8', fontSize:11, margin:'2px 0 0' }}>
              {lead.source} · {new Date(lead.created_at).toLocaleDateString('tr-TR')}
              {lead.sector && <span style={{ marginLeft:6, padding:'1px 6px', background:'#eff6ff', color:'#1d4ed8', borderRadius:4, fontSize:10 }}>{lead.sector}</span>}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {lead.ai_grade && (
              <span style={{ padding:'3px 8px', borderRadius:8, fontSize:13, fontWeight:800, ...(gradeStyle[lead.ai_grade]||{background:'#f1f5f9',color:'#475569',border:'1px solid #e2e8f0'}) }}>
                {lead.ai_grade}
              </span>
            )}
            <span style={{ padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:600, background: lead.status==='won'?'#d1fae5':lead.status==='new'?'#dbeafe':lead.status==='lost'?'#fee2e2':'#f1f5f9', color: lead.status==='won'?'#065f46':lead.status==='new'?'#1d4ed8':lead.status==='lost'?'#991b1b':'#475569' }}>
              {currentStatus?.label||lead.status}
            </span>
          </div>
        </div>

        {/* ── Toast ── */}
        {msg && (
          <div style={{ padding:'10px 14px', borderRadius:12, border:'1px solid', fontSize:13, display:'flex', alignItems:'center', gap:8, background: msg.type==='success'?'#f0fdf4':'#fef2f2', borderColor: msg.type==='success'?'#bbf7d0':'#fecaca', color: msg.type==='success'?'#15803d':'#991b1b' }}>
            {msg.type==='success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
            {msg.text}
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div style={{ display:'flex', gap:0, background:'#f1f5f9', borderRadius:13, padding:3 }}>
          {([
            { key:'contact',  label:'İletişim' },
            { key:'ai',       label:'AI Puan'  },
            { key:'actions',  label:'Aksiyonlar'},
            { key:'activity', label:'Aktivite' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ flex:1, padding:'8px 2px', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight: activeTab===tab.key ? 700 : 500, transition:'all 0.15s', background: activeTab===tab.key ? '#ffffff' : 'transparent', color: activeTab===tab.key ? '#0f172a' : '#64748b', boxShadow: activeTab===tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: İletişim ── */}
        {activeTab === 'contact' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={card}>
              <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:'0 0 10px' }}>İletişim Bilgileri</h3>

              {lead.phone ? (
                <div style={rowBg}>
                  <div style={iconBox('#dcfce7')}><Phone size={13} color="#16a34a"/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Telefon</p>
                    <a href={`tel:${lead.phone}`} style={{ color:'#0f172a', fontSize:13, fontWeight:600, textDecoration:'none' }}>{lead.phone}</a>
                  </div>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    style={{ padding:'6px 12px', background:'#16a34a', color:'#fff', borderRadius:8, fontSize:11, fontWeight:700, textDecoration:'none', flexShrink:0 }}>WA →</a>
                </div>
              ) : (
                <div style={{ ...rowBg, opacity:0.4 }}>
                  <div style={iconBox('#f1f5f9')}><Phone size={13} color="#94a3b8"/></div>
                  <p style={{ color:'#94a3b8', fontSize:13, margin:0 }}>Telefon yok</p>
                </div>
              )}

              {lead.email ? (
                <div style={rowBg}>
                  <div style={iconBox('#dbeafe')}><Mail size={13} color="#1d4ed8"/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Email</p>
                    <p style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.email}</p>
                  </div>
                  <button onClick={() => copyText(lead.email!, 'email')}
                    style={{ background:'none', border:'none', cursor:'pointer', color: copied==='email'?'#16a34a':'#94a3b8', padding:4 }}>
                    {copied==='email' ? <CheckCircle size={15}/> : <Copy size={15}/>}
                  </button>
                </div>
              ) : (
                <div style={{ ...rowBg, opacity:0.4 }}>
                  <div style={iconBox('#f1f5f9')}><Mail size={13} color="#94a3b8"/></div>
                  <p style={{ color:'#94a3b8', fontSize:13, margin:0 }}>Email yok</p>
                </div>
              )}

              {lead.website && (
                <div style={rowBg}>
                  <div style={iconBox('#faf5ff')}><Globe size={13} color="#7c3aed"/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Website</p>
                    <a href={lead.website.startsWith('http')?lead.website:`https://${lead.website}`} target="_blank" rel="noreferrer"
                      style={{ color:'#1d4ed8', fontSize:12, textDecoration:'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
                      {lead.website.replace(/^https?:\/\/(www\.)?/,'').slice(0,32)}
                    </a>
                  </div>
                </div>
              )}

              {lead.city && (
                <div style={{ ...rowBg, marginBottom:0 }}>
                  <div style={iconBox('#f1f5f9')}><MapPin size={13} color="#94a3b8"/></div>
                  <div>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Şehir</p>
                    <p style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:0 }}>{lead.city}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:0 }}>Notlar</h3>
                {!editingNotes ? (
                  <button onClick={() => setEditingNotes(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:12, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                    <Edit2 size={12}/> Düzenle
                  </button>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={saveNotes} disabled={saving} style={{ background:'none', border:'none', cursor:'pointer', color:'#16a34a', fontSize:12, fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}>
                      <Save size={12}/> {saving?'...':'Kaydet'}
                    </button>
                    <button onClick={() => { setEditingNotes(false); setNotes(lead.notes||'') }} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:12, fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}>
                      <X size={12}/> İptal
                    </button>
                  </div>
                )}
              </div>
              {editingNotes ? (
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 12px', color:'#0f172a', fontSize:13, outline:'none', resize:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
              ) : (
                <p style={{ color: lead.notes?'#334155':'#94a3b8', fontSize:13, margin:0, lineHeight:1.5, fontStyle: lead.notes?'normal':'italic' }}>
                  {lead.notes || 'Not eklenmemiş.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: AI Puan ── */}
        {activeTab === 'ai' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:6 }}>
                  <Star size={14} color="#f59e0b"/> AI Kalite Puanı
                </h3>
                <button onClick={() => triggerAIAnalysis()} disabled={analyzing}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, color:'#92400e', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:analyzing?0.7:1 }}>
                  {analyzing ? <RefreshCw size={11} className="animate-spin"/> : <Zap size={11}/>}
                  {analyzing ? 'Analiz...' : lead.ai_grade ? 'Yenile' : 'Analiz Et'}
                </button>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:42, fontWeight:800, color:scoreColor, lineHeight:1 }}>{lead.score}</div>
                  <div style={{ color:'#94a3b8', fontSize:11 }}>/ 100</div>
                </div>
                {lead.ai_grade && (
                  <div style={{ width:52, height:52, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, flexShrink:0, ...(gradeStyle[lead.ai_grade]||{background:'#f1f5f9',color:'#475569'}) }}>
                    {lead.ai_grade}
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ height:8, background:'#f1f5f9', borderRadius:4, marginBottom:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${lead.score}%`, background:scoreBarColor, borderRadius:4, transition:'width 0.8s' }}/>
                  </div>
                  {lead.ai_priority && <p style={{ color:'#64748b', fontSize:11, margin:0 }}>{PRIORITY_LABEL[lead.ai_priority]||lead.ai_priority} öncelik</p>}
                  {scoring?.estimatedValue && <p style={{ color:'#94a3b8', fontSize:10, margin:'2px 0 0' }}>Tahmini: <span style={{ color:'#0f172a', fontWeight:600 }}>{scoring.estimatedValue}</span></p>}
                </div>
              </div>
            </div>

            {scoring && (scoring.strengths?.length > 0 || scoring.weaknesses?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap:8 }}>
                {scoring.strengths?.length > 0 && (
                  <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'12px' }}>
                    <h4 style={{ color:'#15803d', fontSize:11, fontWeight:700, margin:'0 0 8px', display:'flex', alignItems:'center', gap:3 }}>
                      <CheckCircle size={10}/> Güçlü
                    </h4>
                    {scoring.strengths.slice(0,3).map((s: string, i: number) => (
                      <p key={i} style={{ color:'#166534', fontSize:10, margin:'0 0 3px', lineHeight:1.4 }}>• {s}</p>
                    ))}
                  </div>
                )}
                {scoring.weaknesses?.length > 0 && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px' }}>
                    <h4 style={{ color:'#991b1b', fontSize:11, fontWeight:700, margin:'0 0 8px', display:'flex', alignItems:'center', gap:3 }}>
                      <AlertTriangle size={10}/> Zayıf
                    </h4>
                    {scoring.weaknesses.slice(0,3).map((w: string, i: number) => (
                      <p key={i} style={{ color:'#7f1d1d', fontSize:10, margin:'0 0 3px', lineHeight:1.4 }}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scoring?.recommendation && (
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 14px' }}>
                <h4 style={{ color:'#92400e', fontSize:11, fontWeight:700, margin:'0 0 6px', display:'flex', alignItems:'center', gap:4 }}>
                  <Lightbulb size={10}/> AI Önerisi
                </h4>
                <p style={{ color:'#78350f', fontSize:12, margin:0, lineHeight:1.5 }}>{scoring.recommendation}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Aksiyonlar ── */}
        {activeTab === 'actions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Status update */}
            <div style={card}>
              <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:'0 0 10px' }}>Durumu Güncelle</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {STATUS_OPTS.map(opt => (
                  <button key={opt.value} onClick={() => updateStatus(opt.value)} disabled={saving || lead.status === opt.value}
                    style={{ padding:'9px 8px', borderRadius:10, border: lead.status===opt.value ? 'none' : '1px solid #e2e8f0', cursor: lead.status===opt.value ? 'default' : 'pointer', fontFamily:'inherit', fontSize:12, fontWeight: lead.status===opt.value ? 700 : 500, transition:'all 0.15s', background: lead.status===opt.value ? '#0f172a' : '#f8fafc', color: lead.status===opt.value ? '#ffffff' : '#475569' }}>
                    {lead.status===opt.value ? '✓ ' : ''}{opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={card}>
              <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:'0 0 10px' }}>Hızlı Aksiyonlar</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {lead.phone && (
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, textDecoration:'none' }}>
                    <MessageSquare size={16} color="#15803d"/>
                    <span style={{ color:'#15803d', fontSize:13, fontWeight:600 }}>WhatsApp Gönder</span>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, textDecoration:'none' }}>
                    <Send size={16} color="#1d4ed8"/>
                    <span style={{ color:'#1d4ed8', fontSize:13, fontWeight:600 }}>Email Gönder</span>
                  </a>
                )}
                <button onClick={findDecisionMaker} disabled={findingDM}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:12, cursor:'pointer', fontFamily:'inherit', width:'100%', textAlign:'left', opacity: findingDM?0.7:1 }}>
                  {findingDM ? <RefreshCw size={16} color="#7c3aed" className="animate-spin"/> : <Crosshair size={16} color="#7c3aed"/>}
                  <span style={{ color:'#7c3aed', fontSize:13, fontWeight:600 }}>{findingDM?'Aranıyor...':dmResult?.found>0?'KV Yenile':'Karar Verici Bul'}</span>
                </button>
                <button onClick={createPortalLink} disabled={creatingPortal}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, cursor:'pointer', fontFamily:'inherit', width:'100%', textAlign:'left', opacity:creatingPortal?0.7:1 }}>
                  {creatingPortal ? <RefreshCw size={16} color="#b45309" className="animate-spin"/> : <Link2 size={16} color="#b45309"/>}
                  <span style={{ color:'#b45309', fontSize:13, fontWeight:600 }}>{creatingPortal?'Oluşturuluyor...':'Müşteri Portalı'}</span>
                </button>
              </div>
            </div>

            {/* DM result */}
            {dmResult?.found > 0 && (
              <div style={{ background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:12, padding:'12px 14px' }}>
                <p style={{ color:'#7c3aed', fontSize:12, fontWeight:700, margin:'0 0 3px' }}>{dmResult.bestName}</p>
                {dmResult.bestTitle && <p style={{ color:'#94a3b8', fontSize:11, margin:'0 0 2px' }}>{dmResult.bestTitle}</p>}
                {dmResult.bestEmail && <p style={{ color:'#94a3b8', fontSize:11, margin:0 }}>{dmResult.bestEmail}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Aktivite ── */}
        {activeTab === 'activity' && (
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:6 }}>
                <Activity size={14} color="#0ea5e9"/> Aktivite Akışı
              </h3>
              <button onClick={() => logCall()}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, color:'#15803d', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                <Phone size={11}/> Arama Kaydet
              </button>
            </div>

            {activitiesLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'20px' }}>
                <RefreshCw size={18} color="#94a3b8" className="animate-spin"/>
              </div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <Activity size={28} color="#cbd5e1" style={{ margin:'0 auto 8px', display:'block' }}/>
                <p style={{ color:'#94a3b8', fontSize:13, margin:'0 0 4px' }}>Henüz aktivite kaydı yok</p>
                <p style={{ color:'#cbd5e1', fontSize:11, margin:0 }}>Email, arama veya WhatsApp sonrası otomatik kaydedilir</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column' }}>
                {activities.slice(0, 12).map((act, i) => (
                  <div key={act.id} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i < Math.min(activities.length,12)-1 ? '1px solid #f1f5f9' : 'none', alignItems:'flex-start' }}>
                    <span style={{ fontSize:15, lineHeight:1, marginTop:2, flexShrink:0 }}>{ACTIVITY_ICON[act.event_type]||'🔔'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:'#334155', fontSize:12, fontWeight:600, margin:'0 0 1px' }}>{ACTIVITY_LABEL[act.event_type]||act.event_type}</p>
                      {act.metadata?.message && (
                        <p style={{ color:'#94a3b8', fontSize:11, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{act.metadata.message}</p>
                      )}
                    </div>
                    <span style={{ color:'#cbd5e1', fontSize:10, flexShrink:0, marginTop:2 }}>
                      {new Date(act.created_at).toLocaleDateString('tr-TR', {day:'2-digit', month:'short'})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
  // ── END MOBILE LAYOUT ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{lead.company_name}</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {lead.source} · {new Date(lead.created_at).toLocaleDateString()}
            {lead.sector && <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 text-xs rounded">{lead.sector}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(lead.hot_score || 0) >= 30 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-xs rounded-lg font-semibold animate-pulse">
              <Flame size={12} /> Sıcak Lead
            </span>
          )}
          {lead.ai_grade && (
            <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${GRADE_STYLE[lead.ai_grade] || ''}`}>
              {lead.ai_grade}
            </span>
          )}
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${currentStatus?.color}`}>
            {currentStatus?.label}
          </span>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">

        {/* ── Sol Kolon (2/3) ── */}
        <div className="col-span-2 space-y-5">

          {/* İletişim Bilgileri */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4 text-sm">{t('leads.iletisim_bilgileri', 'İletişim Bilgileri')}</h2>
            <div className="space-y-3">
              {lead.contact_name && (
                <Row icon="👤" label="Yetkili" value={lead.contact_name} />
              )}
              {lead.phone ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-400 text-xs">Telefon</p>
                    <a href={`tel:${lead.phone}`} className="text-white text-sm hover:text-green-400 transition">{lead.phone}</a>
                  </div>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="px-3 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs rounded-lg transition">
                    WhatsApp →
                  </a>
                </div>
              ) : <EmptyRow icon={<Phone size={13} className="text-slate-500" />} label="Telefon yok" />}

              {lead.email ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Mail size={13} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-400 text-xs">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-white text-sm hover:text-blue-400 transition">{lead.email}</a>
                  </div>
                  <button onClick={() => copyText(lead.email!, 'email')}
                    className="p-1.5 text-slate-500 hover:text-white transition">
                    {copied === 'email' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              ) : <EmptyRow icon={<Mail size={13} className="text-slate-500" />} label="Email yok" />}

              {lead.instagram && (
                <Row icon={<Instagram size={13} className="text-pink-400" />} label="Instagram"
                  href={`https://instagram.com/${lead.instagram.replace('@','')}`} value={lead.instagram} />
              )}
              {lead.website && (
                <Row icon={<Globe size={13} className="text-purple-400" />} label="Website"
                  href={lead.website} value={lead.website} truncate />
              )}
              {lead.city && (
                <Row icon={<MapPin size={13} className="text-slate-400" />} label="Şehir" value={lead.city} />
              )}
            </div>
          </div>

          {/* ── AI Kalite Analizi ── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Star size={15} className="text-yellow-400" /> AI Kalite Analizi
              </h2>
              <div className="flex items-center gap-2">
                {lead.ai_priority && (
                  <span className="text-xs text-slate-400">{PRIORITY_LABEL[lead.ai_priority] || lead.ai_priority} öncelik</span>
                )}
                <button onClick={() => triggerAIAnalysis()} disabled={analyzing}
                  className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg transition disabled:opacity-50">
                  {analyzing ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                  {analyzing ? 'Analiz ediliyor...' : lead.ai_grade ? 'Yeniden Analiz' : 'AI ile Analiz Et'}
                </button>
              </div>
            </div>

            {scoring ? (
              <div className="space-y-4">
                {/* Score + Grade */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${SCORE_COLOR(lead.score)}`}>{lead.score}</div>
                    <div className="text-slate-500 text-xs">/ 100</div>
                  </div>
                  {lead.ai_grade && (
                    <span className={`text-2xl font-bold px-3 py-1 rounded-xl border ${GRADE_STYLE[lead.ai_grade] || ''}`}>
                      {lead.ai_grade}
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${SCORE_BAR(lead.score)}`} style={{ width: `${lead.score}%` }} />
                    </div>
                    {scoring.estimatedValue && (
                      <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1">
                        <DollarSign size={10} />{t('leads.tahmini_deger', 'Tahmini değer:')}<span className="text-white capitalize">{scoring.estimatedValue}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Breakdown toggle */}
                {scoring.breakdown && (
                  <div>
                    <button onClick={() => setShowBreakdown(v => !v)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition">
                      <BarChart3 size={11} /> Skor Dağılımı
                      {showBreakdown ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    {showBreakdown && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {Object.entries(scoring.breakdown).map(([k, v]: any) => (
                          <div key={k} className="flex justify-between items-center px-3 py-1.5 bg-slate-900/50 rounded-lg">
                            <span className="text-slate-400 text-xs">{BREAKDOWN_LABELS[k] || k}</span>
                            <span className="text-white text-xs font-semibold">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Güçlü / Zayıf */}
                <div className="grid grid-cols-2 gap-4">
                  {scoring.strengths?.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                      <h3 className="text-emerald-400 text-xs font-semibold mb-2 flex items-center gap-1">
                        <CheckCircle size={10} /> Güçlü Yönler
                      </h3>
                      {scoring.strengths.map((s: string, i: number) => (
                        <p key={i} className="text-slate-300 text-xs leading-relaxed">• {s}</p>
                      ))}
                    </div>
                  )}
                  {scoring.weaknesses?.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                      <h3 className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1">
                        <AlertTriangle size={10} /> Zayıf Yönler
                      </h3>
                      {scoring.weaknesses.map((w: string, i: number) => (
                        <p key={i} className="text-slate-300 text-xs leading-relaxed">• {w}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Önerisi */}
                {scoring.recommendation && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                    <h3 className="text-yellow-400 text-xs font-semibold mb-2 flex items-center gap-1">
                      <Lightbulb size={10} /> AI Önerisi
                    </h3>
                    <p className="text-slate-300 text-xs leading-relaxed">{scoring.recommendation}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Star size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">
                  {analyzing ? 'AI analizi yapılıyor...' : 'Bu lead henüz analiz edilmedi'}
                </p>
              </div>
            )}
          </div>

          {/* ── Rakip Analizi ── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => {
                if (!competitorData && !competitorLoading) analyzeCompetitor()
                else setCompetitorExpanded(v => !v)
              }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition"
            >
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Target size={15} className="text-orange-400" /> Rakip & Pazar Analizi
              </h2>
              <div className="flex items-center gap-2">
                {competitorLoading && <RefreshCw size={13} className="animate-spin text-orange-400" />}
                {!competitorData && !competitorLoading && (
                  <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">Analiz Et</span>
                )}
                {competitorData && (competitorExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />)}
              </div>
            </button>

            {competitorExpanded && competitorLoading && (
              <div className="px-5 pb-5 text-center py-8">
                <RefreshCw size={20} className="animate-spin text-orange-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Pazar verisi analiz ediliyor...</p>
              </div>
            )}

            {competitorExpanded && competitorData && (
              <div className="border-t border-slate-700 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Zayıflıklar */}
                  {competitorData.analysis?.weaknesses?.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                      <h3 className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1">
                        <ShieldAlert size={10} /> Rakip Zayıflıkları
                      </h3>
                      {competitorData.analysis.weaknesses.map((w: string, i: number) => (
                        <p key={i} className="text-slate-300 text-xs">• {w}</p>
                      ))}
                    </div>
                  )}
                  {/* Fırsatlar */}
                  {competitorData.analysis?.opportunities?.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                      <h3 className="text-emerald-400 text-xs font-semibold mb-2 flex items-center gap-1">
                        <TrendingUp size={10} /> Fırsatlar
                      </h3>
                      {competitorData.analysis.opportunities.map((o: string, i: number) => (
                        <p key={i} className="text-slate-300 text-xs">• {o}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Müşteri Şikayetleri */}
                {competitorData.analysis?.customerComplaints?.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <h3 className="text-amber-400 text-xs font-semibold mb-2">{t('leads.musteri_sikayetleri', '⚠️ Müşteri Şikayetleri')}</h3>
                    {competitorData.analysis.customerComplaints.map((c: string, i: number) => (
                      <p key={i} className="text-slate-300 text-xs">• {c}</p>
                    ))}
                  </div>
                )}

                {/* Önerilen Mesajlar */}
                <div className="grid grid-cols-2 gap-3">
                  {competitorData.analysis?.suggestedWhatsApp && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-green-400 text-xs font-semibold">{t('leads.onerilen_whatsapp', '💬 Önerilen WhatsApp')}</h3>
                        <button onClick={() => copyText(competitorData.analysis.suggestedWhatsApp, 'wa')}
                          className="text-slate-500 hover:text-white transition">
                          {copied === 'wa' ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{competitorData.analysis.suggestedWhatsApp}</p>
                    </div>
                  )}
                  {competitorData.analysis?.suggestedEmail && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-blue-400 text-xs font-semibold">📧 Email Konu</h3>
                        <button onClick={() => copyText(competitorData.analysis.suggestedEmail, 'em')}
                          className="text-slate-500 hover:text-white transition">
                          {copied === 'em' ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{competitorData.analysis.suggestedEmail}</p>
                    </div>
                  )}
                </div>

                <button onClick={analyzeCompetitor} disabled={competitorLoading}
                  className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1">
                  <RefreshCw size={10} /> Yenile
                </button>
              </div>
            )}
          </div>

          {/* ── AI Savaş Kartı (Battle Card) ── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => {
                if (!battlecard && !bcLoading) generateBattleCard()
                else setBcExpanded(v => !v)
              }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition"
            >
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Swords size={15} className="text-red-400" /> AI Savaş Kartı
                <span className="text-xs font-normal text-slate-500">{t('leads.satis_kocu', 'Satış koçu')}</span>
              </h2>
              <div className="flex items-center gap-2">
                {bcLoading && <RefreshCw size={13} className="animate-spin text-red-400" />}
                {!battlecard && !bcLoading && (
                  <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">{t('leads.olustur', 'Oluştur')}</span>
                )}
                {battlecard && (bcExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />)}
              </div>
            </button>

            {bcExpanded && bcLoading && (
              <div className="px-5 pb-5 text-center py-8">
                <Swords size={20} className="text-red-400 mx-auto mb-2 animate-pulse" />
                <p className="text-slate-400 text-sm">{t('leads.ai_savas_karti_hazirlaniy', 'AI savaş kartı hazırlanıyor...')}</p>
              </div>
            )}

            {bcExpanded && battlecard && (
              <div className="border-t border-slate-700 p-5 space-y-4">
                {/* Açılış Cümlesi */}
                {battlecard.openingLine && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-blue-400 text-xs font-semibold">{t('leads.acilis_cumlesi', '💬 Açılış Cümlesi')}</h3>
                      <button onClick={() => copyText(battlecard.openingLine!, 'bc_open')}
                        className="text-slate-500 hover:text-white transition">
                        {copied === 'bc_open' ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <p className="text-slate-200 text-sm font-medium leading-relaxed">"{battlecard.openingLine}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Acı Noktaları */}
                  {battlecard.painPoints?.length && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                      <h3 className="text-red-400 text-xs font-semibold mb-2">{t('leads.aci_noktalari', '🎯 Acı Noktaları')}</h3>
                      {battlecard.painPoints.map((p, i) => (
                        <p key={i} className="text-slate-300 text-xs">• {p}</p>
                      ))}
                    </div>
                  )}
                  {/* Değer Önerileri */}
                  {battlecard.valueProps?.length && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                      <h3 className="text-emerald-400 text-xs font-semibold mb-2">{t('leads.guclu_argumanlar', '✅ Güçlü Argümanlar')}</h3>
                      {battlecard.valueProps.map((v, i) => (
                        <p key={i} className="text-slate-300 text-xs">• {v}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* İtiraz Yönetimi */}
                {battlecard.objections?.length && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                    <h3 className="text-yellow-400 text-xs font-semibold mb-2">{t('leads.itiraz_karsi_cevap', '⚡ İtiraz → Karşı Cevap')}</h3>
                    <div className="space-y-2">
                      {battlecard.objections.map((o, i) => (
                        <div key={i} className="text-xs">
                          <span className="text-slate-400">"{o.objection}"</span>
                          <span className="text-emerald-400 ml-2">→ {o.response}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* Kapanış */}
                  {battlecard.closingAsk && (
                    <div className="flex-1 bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
                      <h3 className="text-violet-400 text-xs font-semibold mb-1">{t('leads.kapanis_sorusu', '🔒 Kapanış Sorusu')}</h3>
                      <p className="text-slate-300 text-xs">{battlecard.closingAsk}</p>
                    </div>
                  )}
                  {/* Kapanma İhtimali */}
                  {battlecard.confidence && (
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold text-emerald-400">%{battlecard.confidence}</div>
                      <div className="text-xs text-slate-500">kapanma</div>
                    </div>
                  )}
                </div>

                {/* Red Flags */}
                {battlecard.redFlags?.length && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <h3 className="text-red-400 text-xs font-semibold mb-1">🚩 Dikkat Et</h3>
                    {battlecard.redFlags.map((f, i) => (
                      <p key={i} className="text-slate-300 text-xs">• {f}</p>
                    ))}
                  </div>
                )}

                <button onClick={generateBattleCard} disabled={bcLoading}
                  className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1">
                  <RefreshCw size={10} /> Yenile
                </button>
              </div>
            )}
          </div>

          {/* ── Vision AI ── */}
          <div className={`rounded-xl border transition-all ${visionExpanded && visionData ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer select-none"
              onClick={() => { if (!visionExpanded && !visionData && lead?.website) analyzeVision(); else setVisionExpanded(v => !v) }}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${visionData ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>
                  <Eye size={14} className={visionData ? 'text-indigo-400' : 'text-slate-500'}/>
                </div>
                <div>
                  <span className="text-white font-semibold text-sm">Vision AI Analiz</span>
                  {lead?.vision_analyzed_at && (
                    <span className="ml-2 text-[10px] text-slate-500">
                      {new Date(lead.vision_analyzed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {visionData && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">✓ Analiz Edildi</span>}
                {!lead?.website && <span className="ml-2 text-[10px] text-slate-600">(website yok)</span>}
              </div>
              <div className="flex items-center gap-2">
                {visionLoading && <RefreshCw size={13} className="animate-spin text-indigo-400"/>}
                {!visionData && lead?.website && !visionLoading && (
                  <span className="text-[11px] text-indigo-400 font-semibold">Analiz Et →</span>
                )}
                {visionData && (
                  <>
                    <button onClick={e => { e.stopPropagation(); analyzeVision(true) }}
                      className="p-1 text-slate-500 hover:text-indigo-400 transition rounded"
                      title="Yeniden Analiz Et">
                      <RefreshCw size={12}/>
                    </button>
                    {visionExpanded ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
                  </>
                )}
              </div>
            </div>

            {visionLoading && !visionData && (
              <div className="px-4 pb-5 text-center">
                <div className="flex items-center justify-center gap-3 py-6">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
                  <div>
                    <p className="text-indigo-300 text-sm font-medium">Website analiz ediliyor…</p>
                    <p className="text-slate-500 text-xs mt-0.5">{t('leads.screenshot_claude_vision', 'Screenshot → Claude Vision → Kişisel mesaj')}</p>
                  </div>
                </div>
              </div>
            )}

            {visionExpanded && visionData && (
              <div className="px-4 pb-5 space-y-4 border-t border-indigo-500/15">
                {/* Site summary row */}
                <div className="flex flex-wrap gap-2 pt-4">
                  {[
                    { label: visionData.businessType, color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
                    { label: visionData.style,         color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
                    { label: visionData.quality,       color: visionData.quality==='premium'?'bg-amber-500/15 text-amber-300 border-amber-500/20':'bg-slate-500/15 text-slate-300 border-slate-500/20' },
                  ].filter(t => t.label).map((t, i) => (
                    <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${t.color}`}>{t.label}</span>
                  ))}
                  {visionData.primaryColors?.map((c: string, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">{c}</span>
                  ))}
                </div>

                {/* Target & product */}
                <div className="grid grid-cols-2 gap-3">
                  {visionData.targetAudience && (
                    <div className="bg-slate-800/60 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Hedef Kitle</p>
                      <p className="text-slate-200 text-xs leading-relaxed">{visionData.targetAudience}</p>
                    </div>
                  )}
                  {visionData.productService && (
                    <div className="bg-slate-800/60 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">{t('leads.urunhizmet', 'Ürün/Hizmet')}</p>
                      <p className="text-slate-200 text-xs leading-relaxed">{visionData.productService}</p>
                    </div>
                  )}
                </div>

                {/* Pain points */}
                {visionData.painPoints?.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                    <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-2">{t('leads.olasi_sorunlar', 'Olası Sorunlar')}</p>
                    {visionData.painPoints.map((p: string, i: number) => (
                      <p key={i} className="text-slate-300 text-xs mb-1">• {p}</p>
                    ))}
                  </div>
                )}

                {/* Icebreaker */}
                {visionData.icebreaker && (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1.5">{t('leads.buz_kirici', 'Buz Kırıcı')}</p>
                    <p className="text-slate-200 text-xs italic leading-relaxed">"{visionData.icebreaker}"</p>
                  </div>
                )}

                {/* Personalized message */}
                {visionData.personalizedMessage && (
                  <div className="bg-indigo-500/8 border border-indigo-500/25 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={10}/> Kişiselleştirilmiş Mesaj
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(visionData.personalizedMessage)
                          setVisionCopied(true)
                          setTimeout(() => setVisionCopied(false), 2000)
                        }}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400">
                        {visionCopied ? <><CheckCircle size={10}/>{t('leads.kopyalandi', 'Kopyalandı')}</> : <><Copy size={10}/> Kopyala</>}
                      </button>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">{visionData.personalizedMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Aktivite Akışı ── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Activity size={15} className="text-cyan-400" /> Aktivite Akışı
              </h2>
              <button onClick={() => logCall()}
                className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs rounded-lg transition">
                <Phone size={11} /> Arama Kaydet
              </button>
            </div>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw size={16} className="animate-spin text-slate-500" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-6">
                <Activity size={28} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">{t('leads.henuz_aktivite_kaydi_yok', 'Henüz aktivite kaydı yok')}</p>
                <p className="text-slate-600 text-xs mt-1">{t('leads.email_gonder_ara_veya_wha', 'Email gönder, ara veya WhatsApp mesajı at — otomatik kaydedilir')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 12).map(act => (
                  <div key={act.id} className="flex items-start gap-3">
                    <span className="text-base leading-none mt-0.5 shrink-0">{ACTIVITY_ICON[act.event_type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-medium">{ACTIVITY_LABEL[act.event_type] || act.event_type}</p>
                      {act.metadata?.message && (
                        <p className="text-slate-500 text-xs truncate">{act.metadata.message}</p>
                      )}
                    </div>
                    <span className="text-slate-600 text-xs shrink-0">
                      {new Date(act.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Notlar</h2>
              {!editingNotes ? (
                <button onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition">
                  <Edit2 size={12} /> Düzenle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveNotes} disabled={saving}
                    className="flex items-center gap-1 text-green-400 text-xs">
                    <Save size={12} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => { setEditingNotes(false); setNotes(lead.notes || '') }}
                    className="flex items-center gap-1 text-red-400 text-xs">
                    <X size={12} /> İptal
                  </button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
            ) : (
              <p className="text-slate-300 text-sm leading-relaxed">
                {lead.notes || <span className="text-slate-500 italic">{t('leads.not_eklenmemis', 'Not eklenmemiş.')}</span>}
              </p>
            )}
          </div>
        </div>

        {/* ── Sağ Kolon ── */}
        <div className="space-y-4">

          {/* ── Hot Score ── */}
          {(lead.hot_score || 0) > 0 && (
            <div className={`border rounded-xl p-4 ${(lead.hot_score || 0) >= 30 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 text-amber-300">
                  <Flame size={13} /> Sıcaklık Skoru
                </h3>
                <span className={`text-lg font-bold ${(lead.hot_score || 0) >= 50 ? 'text-red-400' : 'text-amber-400'}`}>
                  {lead.hot_score}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${(lead.hot_score || 0) >= 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min((lead.hot_score || 0), 100)}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{t('leads.son_7_gun_aktivite_bazli', 'Son 7 gün aktivite bazlı')}</p>
            </div>
          )}

          {/* ── Doğru An (Right Moment) ── */}
          {timing && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-slate-400 text-xs mb-3 flex items-center gap-1.5">
                <Clock size={13} /> En İyi Arama Zamanı
              </h3>
              <div className="text-center mb-2">
                <div className="text-xl font-bold text-cyan-400">{timing.timeLabel}</div>
                <div className="text-sm text-white font-medium">{timing.dayLabel}</div>
                <div className="text-xs text-slate-500 mt-0.5">{timing.isoDate}</div>
              </div>
              <div className={`text-center text-xs px-2 py-1 rounded-lg ${
                timing.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {timing.confidence === 'high' ? '✓ Veri bazlı' : '~ Sektör ortalaması'}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{timing.reasoning}</p>
            </div>
          )}

          {/* ── Şirket Bilgileri ── */}
          {(lead.ai_summary || lead.company_size || lead.revenue_estimate) && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Building2 size={13} /> Şirket Bilgileri
                </h3>
                <button onClick={triggerEnrichment} disabled={enriching}
                  className="text-slate-600 hover:text-slate-400 transition">
                  <RefreshCw size={11} className={enriching ? 'animate-spin' : ''} />
                </button>
              </div>
              {lead.company_size && (
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">{t('leads.calisan', 'Çalışan')}</span>
                  <span className="text-white font-medium">~{lead.company_size}</span>
                </div>
              )}
              {lead.revenue_estimate && (
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-500">Tahmini Ciro</span>
                  <span className="text-emerald-400 font-medium">{lead.revenue_estimate}</span>
                </div>
              )}
              {lead.ai_summary && (
                <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-700 pt-2 mt-2">
                  {lead.ai_summary}
                </p>
              )}
            </div>
          )}

          {/* Puan + Grade */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs">{t('leads.ai_puani', 'AI Puanı')}</h3>
              {lead.ai_grade && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${GRADE_STYLE[lead.ai_grade]}`}>
                  {lead.ai_grade} Sınıfı
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`text-4xl font-bold ${SCORE_COLOR(lead.score)}`}>{lead.score}</div>
              <div className="flex-1">
                <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                  <div className={`h-2 rounded-full ${SCORE_BAR(lead.score)}`} style={{ width: `${lead.score}%` }} />
                </div>
                <p className="text-slate-500 text-xs">/ 100</p>
              </div>
            </div>
            {lead.ai_priority && (
              <p className="text-xs text-slate-400">{PRIORITY_LABEL[lead.ai_priority] || lead.ai_priority} öncelik</p>
            )}
            {scoring?.estimatedValue && (
              <p className="text-xs text-slate-400 mt-1">Tahmini: <span className="text-white capitalize">{scoring.estimatedValue}</span></p>
            )}
          </div>

          {/* Durum */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-slate-400 text-xs mb-3">{t('leads.durumu_guncelle', 'Durumu Güncelle')}</h3>
            <div className="space-y-1.5">
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} onClick={() => updateStatus(opt.value)}
                  disabled={saving || lead.status === opt.value}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    lead.status === opt.value ? `${opt.color} font-semibold` : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  } disabled:cursor-default`}>
                  {lead.status === opt.value ? '✓ ' : ''}{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meta Kalite Sinyali */}
          <div className="bg-gradient-to-b from-blue-900/30 to-slate-800/50 border border-blue-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <h3 className="text-blue-300 text-xs font-bold">Meta Algoritma Sinyali</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">Bu lead kaliteli mi? Meta&apos;ya bildirin — algoritma benzer lead&apos;leri bulsun</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { q: 'qualified', label: 'Kaliteli Lead', icon: '✅', color: 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-700/50' },
                { q: 'meeting_booked', label: 'Toplantı Var', icon: '📅', color: 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-700/50' },
                { q: 'won', label: 'Satış Oldu', icon: '🏆', color: 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-700/50' },
                { q: 'unqualified', label: 'Kalitesiz', icon: '❌', color: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-700/50' },
              ].map(s => (
                <button key={s.q} onClick={async () => {
                  try {
                    const token = localStorage.getItem('token')
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
                    const r = await fetch(`${API_URL}/api/ads-intelligence/quality-signal`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ leadId: lead.id, quality: s.q }),
                    })
                    const d = await r.json()
                    if (d.ok) { showMsg('success', d.message || 'Meta\'ya sinyal gönderildi!'); if (s.q === 'won') updateStatus('won') }
                    else showMsg('error', d.error || 'Sinyal gönderilemedi')
                  } catch { showMsg('error', 'Bağlantı hatası') }
                }}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium border transition ${s.color}`}>
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 mt-2 text-center">Sinyal gönderince Meta benzer profilde reklam gösterir</p>
          </div>

          {/* Hızlı Aksiyonlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-slate-400 text-xs mb-3">{t('leads.hizli_aksiyon', 'Hızlı Aksiyon')}</h3>
            <div className="space-y-2">
              {lead.phone && (
                <>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded-lg transition">
                    <MessageSquare size={14} /> WhatsApp Gönder
                  </a>
                  {lead.country && lead.country !== 'TR' && (
                    <Link href={`/cultural?leadId=${lead.id}&country=${lead.country}`}
                      className="flex items-center gap-2 w-full px-3 py-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 text-sm rounded-lg transition">
                      <Globe size={14} /> WA — Kültürel Mesaj Oluştur
                    </Link>
                  )}
                </>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm rounded-lg transition">
                  <Send size={14} /> Email Gönder
                </a>
              )}
              <button onClick={findDecisionMaker} disabled={findingDM}
                className="flex items-center gap-2 w-full px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-sm rounded-lg transition disabled:opacity-50">
                {findingDM ? <RefreshCw size={14} className="animate-spin" /> : <Crosshair size={14} />}
                {findingDM ? 'Aranıyor...' : dmResult?.found > 0 ? 'KV Yenile' : 'Karar Verici Bul'}
              </button>
              <Link href={`/cultural?leadId=${lead.id}${lead.country ? `&country=${lead.country}` : ''}`}
                className="flex items-center gap-2 w-full px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-sm rounded-lg transition">
                <Globe size={14} /> Kültüre Uyarla
              </Link>
              <Link href="/campaigns"
                className="flex items-center gap-2 w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg transition">
                <Star size={14} /> Kampanyaya Ekle
              </Link>
              <button onClick={createPortalLink} disabled={creatingPortal}
                className="flex items-center gap-2 w-full px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-sm rounded-lg transition disabled:opacity-50">
                {creatingPortal ? <RefreshCw size={14} className="animate-spin" /> : <Link2 size={14} />}
                {creatingPortal ? 'Oluşturuluyor...' : 'Müşteri Portalı'}
              </button>

              {/* DM Result */}
              {dmResult?.found > 0 && (
                <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <p className="text-violet-300 text-xs font-medium">{dmResult.bestName}</p>
                  {dmResult.bestTitle && <p className="text-slate-400 text-xs">{dmResult.bestTitle}</p>}
                  {dmResult.bestEmail && <p className="text-slate-400 text-xs truncate">{dmResult.bestEmail}</p>}
                </div>
              )}

              {portalUrl && (
                <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-orange-300 text-xs font-medium mb-1">{t('leads.kopyalandi', '📋 Kopyalandı!')}</p>
                  <code className="text-white text-xs break-all">{portalUrl}</code>
                </div>
              )}
            </div>
          </div>
          {/* ── Bağlantılar (Network) ── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs flex items-center gap-1.5">
                <Network size={13} /> Ağ Bağlantıları
              </h3>
              <Link href="/network" className="text-slate-600 hover:text-slate-400 text-xs transition">
                Haritaya git →
              </Link>
            </div>
            {connections.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-3">
                Henüz bağlantı yok.<br />
                <Link href="/network" className="text-blue-500 hover:text-blue-400">{t('leads.ag_haritasindan_ekle', 'Ağ haritasından ekle →')}</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {connections.slice(0, 4).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 shrink-0">{c.direction === 'out' ? '→' : '←'}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/leads/${c.peer.id}`}
                        className="text-xs text-white hover:text-blue-400 transition truncate block font-medium">
                        {c.peer.company_name}
                      </Link>
                    </div>
                    <span className="text-xs text-slate-600 shrink-0 bg-slate-700 px-1.5 py-0.5 rounded">{c.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sektör Benchmark ── */}
          {community && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-slate-400 text-xs mb-3 flex items-center gap-1.5">
                <Users size={13} /> Sektör Benchmarkı
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-blue-400">%{community.replyRate}</div>
                  <div className="text-xs text-slate-500">{t('leads.cevap_orani', 'Cevap oranı')}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-emerald-400">%{community.winRate}</div>
                  <div className="text-xs text-slate-500">{t('leads.kazanma_orani', 'Kazanma oranı')}</div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-slate-500">Ort. Puan: <span className="text-white">{community.avgScore}</span></span>
                <span className="text-slate-500">{community.totalLeads} lead</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper Components ──────────────────────────────────────────────────────────

function Row({ icon, label, value, href, truncate }: {
  icon: any; label: string; value: string; href?: string; truncate?: boolean
}) {
  const content = href ? (
    <a href={href} target="_blank" rel="noreferrer"
      className={`text-white text-sm hover:text-blue-400 transition ${truncate ? 'truncate block max-w-xs' : ''}`}>
      {value}
    </a>
  ) : (
    <p className="text-white text-sm">{value}</p>
  )
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-slate-700/60 rounded-lg flex items-center justify-center shrink-0 text-sm">
        {typeof icon === 'string' ? icon : icon}
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs">{label}</p>
        {content}
      </div>
    </div>
  )
}

function EmptyRow({ icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-3 opacity-35">
      <div className="w-8 h-8 bg-slate-700/60 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
      <p className="text-slate-500 text-sm">{label}</p>
    </div>
  )
}
