'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  ChevronLeft, FileText, ClipboardCheck, PenLine, Sparkles, Wallet,
  ShieldAlert, TrendingUp, ExternalLink, RefreshCw, Copy, CheckCircle,
  Clock, Calendar, AlertTriangle, Users, FileCheck, Zap,
} from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Aktif',       color: '#047857', bg: 'rgba(16,185,129,0.12)' },
  applied:   { label: 'Başvuruldu',  color: '#2563eb', bg: 'rgba(59,130,246,0.12)' },
  won:       { label: 'Kazanıldı',   color: '#9333ea', bg: 'rgba(139,92,246,0.12)' },
  lost:      { label: 'Kaybedildi',  color: '#dc2626', bg: 'rgba(239,68,68,0.12)'  },
  dismissed: { label: 'Reddedildi',  color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

function scoreColor(s: number) { return s >= 80 ? '#059669' : s >= 65 ? '#b45309' : '#dc2626' }
function riskColor(r: string) { return r === 'Düşük' ? '#059669' : r === 'Orta' ? '#b45309' : '#dc2626' }

function DaysLeft({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 864e5)
  const wrap = (Icon: any, color: string, text: string, pulse?: boolean) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontSize: 11, fontWeight: 700, animation: pulse ? 'tpulse 1s ease-in-out infinite' : undefined }}>
      <Icon size={11} /> {text}
    </span>
  )
  if (days < 0) return wrap(Clock, '#dc2626', 'Süresi doldu')
  if (days <= 3) return wrap(AlertTriangle, '#dc2626', `${days} gün kaldı!`, true)
  if (days <= 7) return wrap(Clock, '#b45309', `${days} gün`)
  return wrap(Calendar, '#64748b', `${days} gün`)
}

export default function TenderDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [tender, setTender] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'requirements' | 'proposal' | 'coach'>('info')
  const [generating, setGenerating] = useState(false)
  const [proposal, setProposal] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState('')
  const [copied, setCopied] = useState(false)
  const [coaching, setCoaching] = useState<any>(null)
  const [coachLoading, setCoachLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchTender = async () => {
      try {
        const data: any = await api.get('/api/tenders/' + id)
        setTender(data.tender)
        setProposal(data.tender?.proposal_draft || null)
      } catch {}
      setLoading(false)
    }
    fetchTender()
  }, [id])

  const updateStatus = async (tenderId: string, status: string) => {
    try {
      await api.patch('/api/tenders/' + tenderId, { status })
      setTender((p: any) => ({ ...p, status }))
      setMsg({ type: 'success', text: 'Durum güncellendi' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const loadCoaching = async () => {
    if (coaching || !tender) return
    setCoachLoading(true)
    try {
      const data: any = await api.post('/api/tenders/' + tender.id + '/coaching', {})
      setCoaching(data.coaching)
    } catch {}
    setCoachLoading(false)
  }

  const generateProposal = async () => {
    if (!companyInfo.trim() || !tender) return
    setGenerating(true); setProposal(null)
    try {
      const data: any = await api.post('/api/tenders/' + tender.id + '/proposal', { company_info: companyInfo })
      setProposal(data.proposal)
    } catch {}
    setGenerating(false)
  }

  const copyProposal = () => {
    if (proposal) { navigator.clipboard?.writeText(proposal); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const inp = { width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', color: '#0f172a', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <RefreshCw size={24} style={{ color: '#7c3aed', animation: 'tspin 1s linear infinite' }} />
      <style>{`@keyframes tspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!tender) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
      <p style={{ fontSize: 14, margin: '0 0 16px' }}>İhale bulunamadı</p>
      <button onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#475569', fontSize: 13 }}>Geri Dön</button>
    </div>
  )

  const sc = tender.ai_score || 60
  const statusMeta = STATUS_META[tender.status] || STATUS_META.active

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`@keyframes tspin{to{transform:rotate(360deg)}} @keyframes tpulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Back button */}
      <button onClick={() => router.back()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 0', marginBottom: 12, background: 'none', border: 'none', color: '#7c3aed', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> İhaleler
      </button>

      {msg && (
        <div style={{ marginBottom: 12, padding: '10px 16px', background: msg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10 }}>
          <p style={{ color: msg.type === 'success' ? '#059669' : '#dc2626', fontSize: 12, margin: 0 }}>{msg.text}</p>
        </div>
      )}

      {/* Detail card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${scoreColor(sc)}20`, border: `1px solid ${scoreColor(sc)}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: scoreColor(sc), fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{sc}</span>
              <span style={{ color: '#334155', fontSize: 8 }}>puan</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 15, margin: '0 0 4px', lineHeight: 1.4 }}>{tender.title}</p>
              <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{tender.institution}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <span style={{ background: statusMeta.bg, border: `1px solid ${statusMeta.color}30`, color: statusMeta.color, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{statusMeta.label}</span>
            <span style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{tender.source}</span>
            <span style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', color: '#0f766e', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{tender.country}</span>
            {tender.budget_text && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(180,83,9,0.12)', border: '1px solid rgba(180,83,9,0.25)', color: '#b45309', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                <Wallet size={10} /> {tender.budget_text}
              </span>
            )}
            {tender.deadline && (
              <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                <DaysLeft deadline={tender.deadline} />
              </span>
            )}
            {tender.risk_level && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${riskColor(tender.risk_level)}12`, border: `1px solid ${riskColor(tender.risk_level)}30`, color: riskColor(tender.risk_level), fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                <ShieldAlert size={10} /> Risk: {tender.risk_level}
              </span>
            )}
            {tender.win_probability > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                <TrendingUp size={10} /> %{tender.win_probability} Kazanma
              </span>
            )}
          </div>

          {/* Pipeline steps */}
          {tender.pipeline_step && (
            <div style={{ display: 'flex', gap: 2, marginTop: 12, alignItems: 'center' }}>
              {['discovered', 'reviewing', 'docs_preparing', 'guarantee', 'submitted', 'evaluation', 'won'].map((step, i) => {
                const steps = ['discovered', 'reviewing', 'docs_preparing', 'guarantee', 'submitted', 'evaluation', 'won']
                const currentIdx = steps.indexOf(tender.pipeline_step || 'discovered')
                const isActive = i <= currentIdx
                const isCurrent = i === currentIdx
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <div onClick={() => updateStatus(tender.id, step === 'won' ? 'won' : step === 'submitted' ? 'applied' : tender.status)}
                      style={{ flex: 1, height: 4, borderRadius: 2, background: isActive ? '#7c3aed' : '#e2e8f0', cursor: 'pointer', position: 'relative' }}>
                      {isCurrent && <div style={{ position: 'absolute', top: -2, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', border: '2px solid white', boxShadow: '0 0 4px rgba(124,58,237,0.5)' }} />}
                    </div>
                    {i < 6 && <div style={{ width: 1, height: 8, background: '#e2e8f0' }} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status actions */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['applied', 'won', 'lost', 'dismissed'].map(s => (
            <button key={s} onClick={() => updateStatus(tender.id, s)} disabled={tender.status === s}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${STATUS_META[s]?.color}30`, background: tender.status === s ? `${STATUS_META[s]?.color}20` : 'transparent', color: STATUS_META[s]?.color, fontSize: 10, fontWeight: 600, cursor: tender.status === s ? 'default' : 'pointer', opacity: tender.status === s ? 1 : 0.7 }}>
              {STATUS_META[s]?.label}
            </button>
          ))}
          {tender.source_url && (
            <a href={tender.source_url} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(13,148,136,0.3)', color: '#0f766e', fontSize: 10, textDecoration: 'none' }}>
              <ExternalLink size={11} /> Kaynağa Git
            </a>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '10px 16px 0', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'info', label: 'Bilgi', Icon: FileText },
            { id: 'requirements', label: 'Şartlar', Icon: ClipboardCheck },
            { id: 'coach', label: 'AI Koç', Icon: Sparkles },
            { id: 'proposal', label: 'Teklif', Icon: PenLine },
          ].map(tb => (
            <button key={tb.id} onClick={() => { setActiveTab(tb.id as any); if (tb.id === 'coach') loadCoaching() }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: activeTab === tb.id ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === tb.id ? '#7c3aed' : '#64748b', borderBottom: activeTab === tb.id ? '2px solid #7c3aed' : '2px solid transparent', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <tb.Icon size={12} /> {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '16px' }}>

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tender.ai_summary && (
                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 11, padding: '12px 14px' }}>
                  <p style={{ color: '#7c3aed', fontSize: 11, fontWeight: 700, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 1 }}>AI Özet</p>
                  <p style={{ color: '#334155', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{tender.ai_summary}</p>
                </div>
              )}
              {tender.ai_recommendation && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                  <p style={{ color: '#047857', fontSize: 11, fontWeight: 700, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 1 }}>Öneri</p>
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{tender.ai_recommendation}</p>
                </div>
              )}
              {tender.match_reason && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                  <p style={{ color: '#b45309', fontSize: 11, fontWeight: 700, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 1 }}>Firma Uyumu</p>
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{tender.match_reason}</p>
                </div>
              )}
              {tender.competitor_insight && (
                <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626', fontSize: 11, fontWeight: 700, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 1 }}><Users size={11} /> Rekabet Analizi</p>
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{tender.competitor_insight}</p>
                </div>
              )}
              {(tender.action_steps?.length > 0 || tender.missing_docs?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                  {tender.action_steps?.length > 0 && (
                    <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                      <p style={{ color: '#2563eb', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>Yapılması Gerekenler</p>
                      {tender.action_steps.map((s: string, i: number) => (
                        <p key={i} style={{ color: '#475569', fontSize: 11, margin: '0 0 4px', display: 'flex', gap: 5 }}>
                          <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {s}
                        </p>
                      ))}
                    </div>
                  )}
                  {tender.missing_docs?.length > 0 && (
                    <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                      <p style={{ color: '#dc2626', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>Eksik Belgeler</p>
                      {tender.missing_docs.map((d: string, i: number) => (
                        <p key={i} style={{ color: '#475569', fontSize: 11, margin: '0 0 4px', display: 'flex', gap: 5 }}>
                          <span style={{ color: '#dc2626' }}>!</span> {d}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tender.notes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '12px 14px' }}>
                  <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, margin: '0 0 5px' }}>NOTLAR</p>
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{tender.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* REQUIREMENTS TAB */}
          {activeTab === 'requirements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { title: 'Katılım Şartları', content: tender.requirements, color: '#0f766e', Icon: FileText },
                { title: 'Kimler Başvurabilir', content: tender.eligibility, color: '#059669', Icon: Users },
                { title: 'Gerekli Belgeler', content: tender.documents, color: '#b45309', Icon: FileCheck },
              ].filter(s => s.content).map(section => (
                <div key={section.title} style={{ background: `${section.color}08`, border: `1px solid ${section.color}20`, borderRadius: 11, padding: '12px 14px' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: section.color, fontSize: 11, fontWeight: 700, margin: '0 0 6px' }}><section.Icon size={12} /> {section.title}</p>
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.7 }}>{section.content}</p>
                </div>
              ))}
              {!tender.requirements && !tender.eligibility && !tender.documents && (
                <p style={{ color: '#334155', textAlign: 'center', padding: 24, fontSize: 13 }}>AI analizi henüz yapılmadı</p>
              )}
            </div>
          )}

          {/* COACH TAB */}
          {activeTab === 'coach' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!coaching && !coachLoading && (
                <button onClick={loadCoaching}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 14px rgba(124,58,237,0.35)' }}>
                  <Sparkles size={14} /> AI İhale Kocu Başlat
                </button>
              )}
              {coachLoading && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <RefreshCw size={20} style={{ color: '#7c3aed', animation: 'tspin 1s linear infinite' }} />
                  <p style={{ color: '#7c3aed', fontSize: 13, marginTop: 10 }}>AI strateji oluşturuyor...</p>
                </div>
              )}
              {coaching && (
                <>
                  {coaching.strategy && (
                    <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(139,92,246,0.04))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 13, padding: '16px 18px' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}><Sparkles size={13} /> Kazanma Stratejisi</p>
                      <p style={{ color: '#334155', fontSize: 13, margin: 0, lineHeight: 1.7 }}>{coaching.strategy}</p>
                    </div>
                  )}
                  {coaching.pricing_hint && (
                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 11, padding: '12px 14px' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontSize: 11, fontWeight: 700, margin: '0 0 5px' }}><Wallet size={12} /> Fiyat Stratejisi</p>
                      <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{coaching.pricing_hint}</p>
                    </div>
                  )}
                  {coaching.timeline?.length > 0 && (
                    <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 11, padding: '14px 16px' }}>
                      <p style={{ color: '#2563eb', fontSize: 11, fontWeight: 700, margin: '0 0 10px' }}>Zaman Planı</p>
                      {coaching.timeline.map((t: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                          <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{t}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                    {coaching.strengths_to_highlight?.length > 0 && (
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                        <p style={{ color: '#059669', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>Vurgula</p>
                        {coaching.strengths_to_highlight.map((s: string, i: number) => (
                          <p key={i} style={{ color: '#475569', fontSize: 11, margin: '0 0 4px' }}>+ {s}</p>
                        ))}
                      </div>
                    )}
                    {coaching.risks_to_mitigate?.length > 0 && (
                      <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 11, padding: '12px 14px' }}>
                        <p style={{ color: '#dc2626', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>Riskleri Azalt</p>
                        {coaching.risks_to_mitigate.map((r: string, i: number) => (
                          <p key={i} style={{ color: '#475569', fontSize: 11, margin: '0 0 4px' }}>! {r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PROPOSAL TAB */}
          {activeTab === 'proposal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!proposal ? (
                <>
                  <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 11, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Sparkles size={14} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ color: '#7c3aed', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                      Claude Opus ile profesyonel ihale teklif mektubu oluşturun. Firma bilgilerinizi girin, teklif hazır olsun.
                    </p>
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Firma Bilgileri</label>
                    <textarea value={companyInfo} onChange={e => setCompanyInfo(e.target.value)}
                      placeholder="Firma adı, sektör, kapasite, AB sertifikaları, referanslar, ihracat deneyimi..."
                      rows={4} style={{ ...inp, resize: 'vertical' as const }} />
                  </div>
                  <button onClick={generateProposal} disabled={generating || !companyInfo.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: generating || !companyInfo.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 3px 14px rgba(124,58,237,0.35)' }}>
                    {generating ? <RefreshCw size={14} style={{ animation: 'tspin 1s linear infinite' }} /> : <Zap size={14} />}
                    {generating ? 'Teklif Yazılıyor...' : 'Teklif Taslağı Oluştur'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button onClick={copyProposal} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#047857', fontSize: 11, cursor: 'pointer' }}>
                      {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                    <button onClick={() => setProposal(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Yeniden Yaz</button>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '16px 18px' }}>
                    <pre style={{ color: '#334155', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'inherit' }}>{proposal}</pre>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
