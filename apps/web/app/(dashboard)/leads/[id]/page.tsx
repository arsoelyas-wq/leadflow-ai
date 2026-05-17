'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  ArrowLeft, Phone, Mail, Instagram, Globe, MapPin,
  Star, Edit2, Save, X, MessageSquare, Send, RefreshCw, Link2,
  Crosshair, TrendingUp, Zap, ChevronDown, ChevronUp, Copy, CheckCircle,
  Target, AlertTriangle, BarChart3, Lightbulb, DollarSign, ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'

interface ScoringData {
  breakdown?:      Record<string, number>
  strengths?:      string[]
  weaknesses?:     string[]
  recommendation?: string
  estimatedValue?: string
}

interface Lead {
  id:            string
  company_name:  string
  contact_name?: string
  phone?:        string
  email?:        string
  instagram?:    string
  website?:      string
  city?:         string
  sector?:       string
  source:        string
  score:         number
  status:        string
  notes?:        string
  created_at:    string
  ai_grade?:     string
  ai_priority?:  string
  scoringData?:  ScoringData
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
        // Auto-analyze if not yet scored
        if (!data.lead.ai_grade) {
          triggerAIAnalysis(data.lead.id)
        }
      })
      .catch(() => router.push('/leads'))
      .finally(() => setLoading(false))
  }, [id])

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
            {lead.source} · {new Date(lead.created_at).toLocaleDateString('tr-TR')}
            {lead.sector && <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 text-xs rounded">{lead.sector}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            <h2 className="text-white font-semibold mb-4 text-sm">İletişim Bilgileri</h2>
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
                        <DollarSign size={10} /> Tahmini değer: <span className="text-white capitalize">{scoring.estimatedValue}</span>
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
                    <h3 className="text-amber-400 text-xs font-semibold mb-2">⚠️ Müşteri Şikayetleri</h3>
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
                        <h3 className="text-green-400 text-xs font-semibold">💬 Önerilen WhatsApp</h3>
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
                {lead.notes || <span className="text-slate-500 italic">Not eklenmemiş.</span>}
              </p>
            )}
          </div>
        </div>

        {/* ── Sağ Kolon ── */}
        <div className="space-y-4">

          {/* Puan + Grade */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs">AI Puanı</h3>
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
            <h3 className="text-slate-400 text-xs mb-3">Durumu Güncelle</h3>
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

          {/* Hızlı Aksiyonlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-slate-400 text-xs mb-3">Hızlı Aksiyon</h3>
            <div className="space-y-2">
              {lead.phone && (
                <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded-lg transition">
                  <MessageSquare size={14} /> WhatsApp Gönder
                </a>
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
                  <p className="text-orange-300 text-xs font-medium mb-1">📋 Kopyalandı!</p>
                  <code className="text-white text-xs break-all">{portalUrl}</code>
                </div>
              )}
            </div>
          </div>
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
