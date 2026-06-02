'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Plus, Send, RefreshCw, CheckCircle,
  Zap, TrendingUp, Download, Link, Eye, Copy, Trash2,
  ChevronDown, ChevronUp, Building2, AlertCircle, Image,
} from 'lucide-react'
import { api } from '@/lib/api'

const PROFILE_KEY = 'lf_company_profile'

interface CompanyProfile {
  senderCompany: string
  companyLogoUrl: string
  companyAddress: string
  iban: string
  bankName: string
  companyPhone: string
  companyEmail: string
  paymentTerms: string
}

function loadProfile(): Partial<CompanyProfile> {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') } catch { return {} }
}
function saveProfile(p: CompanyProfile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch {}
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Item { name: string; unit: string; qty: number; price: number }

interface Proposal {
  id: string
  status: 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected'
  total_price: number
  discount_percent: number
  tax_rate: number
  currency: string
  valid_until: string
  view_token: string | null
  view_count: number
  viewed_at: string | null
  first_viewed_at: string | null
  accepted_at: string | null
  accepted_by: string | null
  rejected_at: string | null
  created_at: string
  portal_link: string | null
  leads: { company_name: string; contact_name: string | null; phone: string | null } | null
}

const STATUS_STYLE: Record<string, string> = {
  draft:       'bg-slate-500/15 text-slate-300 border-slate-500/25',
  sent:        'bg-blue-500/15 text-blue-300 border-blue-500/25',
  negotiating: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  accepted:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  rejected:    'bg-red-500/15 text-red-300 border-red-500/25',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Taslak', sent: 'Gönderildi', negotiating: 'Pazarlıkta',
  accepted: 'Kabul Edildi', rejected: 'Reddedildi',
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const { t } = useI18n()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [stats, setStats]         = useState<any>(null)
  const [leads, setLeads]         = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'list' | 'create' | 'negotiate'>('list')
  const [msg, setMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sending, setSending]     = useState<string | null>(null)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [creating, setCreating]   = useState(false)
  const [createdResult, setCreatedResult] = useState<any>(null)

  // Create form
  const [selectedLead, setSelectedLead]       = useState('')
  const [senderCompany, setSenderCompany]     = useState('')
  const [companyLogoUrl, setCompanyLogoUrl]   = useState('')
  const [companyAddress, setCompanyAddress]   = useState('')
  const [validUntil, setValidUntil]           = useState('30 gün')
  const [notes, setNotes]                     = useState('')
  const [taxRate, setTaxRate]                 = useState(18)
  const [discountPct, setDiscountPct]         = useState(0)
  const [paymentTerms, setPaymentTerms]       = useState('30 gün net')
  const [iban, setIban]                       = useState('')
  const [bankName, setBankName]               = useState('')
  const [companyPhone, setCompanyPhone]       = useState('')
  const [companyEmail, setCompanyEmail]       = useState('')
  const [currency, setCurrency]               = useState('TRY')
  const [showCompanyProfile, setShowCompanyProfile] = useState(false)
  const [logoError, setLogoError]             = useState(false)
  const [items, setItems]                     = useState<Item[]>([{ name: '', unit: 'adet', qty: 1, price: 0 }])
  const profileSaveRef = useRef(false)

  // Negotiate
  const [negMsg, setNegMsg]         = useState('')
  const [negProposalId, setNegProposalId] = useState('')
  const [negLeadId, setNegLeadId]   = useState('')
  const [negotiating, setNegotiating] = useState(false)
  const [negResult, setNegResult]   = useState<any>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s, l] = await Promise.allSettled([
        api.get('/api/proposals/list'),
        api.get('/api/proposals/stats'),
        api.get('/api/leads?limit=200'),
      ])
      if (p.status === 'fulfilled') setProposals(p.value.proposals || [])
      if (s.status === 'fulfilled') setStats(s.value)
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Load saved company profile on mount
  useEffect(() => {
    const p = loadProfile()
    if (p.senderCompany)   setSenderCompany(p.senderCompany)
    if (p.companyLogoUrl)  setCompanyLogoUrl(p.companyLogoUrl)
    if (p.companyAddress)  setCompanyAddress(p.companyAddress)
    if (p.iban)            setIban(p.iban)
    if (p.bankName)        setBankName(p.bankName)
    if (p.companyPhone)    setCompanyPhone(p.companyPhone)
    if (p.companyEmail)    setCompanyEmail(p.companyEmail)
    if (p.paymentTerms)    setPaymentTerms(p.paymentTerms)
    profileSaveRef.current = true
  }, [])

  // Auto-save profile whenever any company field changes
  useEffect(() => {
    if (!profileSaveRef.current) return
    saveProfile({ senderCompany, companyLogoUrl, companyAddress, iban, bankName, companyPhone, companyEmail, paymentTerms })
  }, [senderCompany, companyLogoUrl, companyAddress, iban, bankName, companyPhone, companyEmail, paymentTerms])

  const addItem = () => setItems(prev => [...prev, { name: '', unit: 'adet', qty: 1, price: 0 }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, k: keyof Item, v: any) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const subtotal = items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0)
  const discountAmt = subtotal * (discountPct / 100)
  const taxAmt = (subtotal - discountAmt) * (taxRate / 100)
  const total = subtotal - discountAmt + taxAmt

  const symOf = (cur: string) => cur === 'TRY' ? '₺' : cur === 'USD' ? '$' : '€'
  const fmt = (n: number) => `${symOf(currency)}${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const createProposal = async () => {
    if (!selectedLead || !items[0].name) return
    setCreating(true); setCreatedResult(null)
    try {
      const data = await api.post('/api/proposals/create', {
        leadId: selectedLead, items, notes, validUntil, senderCompany,
        taxRate, discountPercent: discountPct, paymentTerms,
        iban: iban || undefined, bankName: bankName || undefined,
        companyPhone: companyPhone || undefined, companyEmail: companyEmail || undefined,
        companyAddress: companyAddress || undefined,
        companyLogoUrl: companyLogoUrl || undefined,
        currency,
      })
      setCreatedResult(data)
      showMsg('success', `Teklif oluşturuldu! Toplam: ${symOf(currency)}${data.totalPrice?.toLocaleString()}`)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    setCreating(false)
  }

  const downloadPDF = (b64: string) => {
    const a = document.createElement('a')
    a.href = `data:application/pdf;base64,${b64}`
    a.download = `teklif-${Date.now()}.pdf`
    a.click()
  }

  const sendProposal = async (proposalId: string) => {
    setSending(proposalId)
    try {
      const data = await api.post(`/api/proposals/send/${proposalId}`, {})
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    setSending(null)
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => showMsg('success', 'Portal linki kopyalandı! 🔗'))
  }

  const deleteProposal = async (id: string) => {
    if (!confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return
    await api.delete(`/api/proposals/${id}`).catch(() => {})
    load()
  }

  const negotiate = async () => {
    if (!negLeadId || !negMsg || !negProposalId) return
    setNegotiating(true)
    try {
      const data = await api.post('/api/proposals/negotiate', {
        leadId: negLeadId, message: negMsg, proposalId: negProposalId,
      })
      setNegResult(data)
    } catch (e: any) { showMsg('error', e.message) }
    setNegotiating(false)
  }

  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : '—'
  const fmtTime = (iso: string | null) => {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}dk önce`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}sa önce`
    return new Date(iso).toLocaleDateString()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> Teklif & Pazarlık
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('proposals.online_portal_dijital_kab', 'Online portal, dijital kabul, PDF, WhatsApp gönderimi')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setTab('create'); setCreatedResult(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Yeni Teklif
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('Pipeline Değeri','Pipeline Değeri'), value: `₺${(stats.totalPipeline || 0).toLocaleString()}`, color: 'text-white', sub: `${stats.total} teklif` },
            { label: 'Kabul Edilen', value: `₺${(stats.totalValue || 0).toLocaleString()}`, color: 'text-emerald-400', sub: `${stats.accepted} teklif` },
            { label: t('Görüntülenme','Görüntülenme'), value: stats.totalViews || 0, color: 'text-blue-400', sub: t('toplam açılma','toplam açılma') },
            { label: t('Dönüşüm','Dönüşüm'), value: stats.total ? `%${Math.round((stats.accepted / stats.total) * 100)}` : '%0', color: 'text-violet-400', sub: `${stats.sent} gönderildi` },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-500">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 w-fit">
        {[
          { id: 'list',      label: `Teklifler (${proposals.length})` },
          { id: 'create',    label: 'Yeni Teklif' },
          { id: 'negotiate', label: t('Pazarlık AI','Pazarlık AI') },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LIST ── */}
      {tab === 'list' && (
        <div className="space-y-2">
          {proposals.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p>{t('proposals.henuz_teklif_yok', 'Henüz teklif yok')}</p>
              <button onClick={() => setTab('create')} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition">
                İlk Teklifi Oluştur
              </button>
            </div>
          ) : proposals.map(p => (
            <div key={p.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
              <div className="p-4 flex items-start gap-3">
                {/* Status indicator */}
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${p.status === 'accepted' ? 'bg-emerald-400' : p.status === 'sent' ? 'bg-blue-400 animate-pulse' : p.status === 'rejected' ? 'bg-red-400' : 'bg-slate-500'}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{p.leads?.company_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[p.status]}`}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                    {p.viewed_at && (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <Eye className="w-3 h-3" /> {p.view_count}x · {fmtTime(p.first_viewed_at)}
                      </span>
                    )}
                    {p.accepted_by && (
                      <span className="text-xs text-emerald-400">✓ {p.accepted_by}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span className="text-emerald-400 font-bold text-sm">₺{Number(p.total_price).toLocaleString()}</span>
                    {p.leads?.contact_name && <span>{p.leads.contact_name}</span>}
                    <span>{fmtDate(p.created_at)}</span>
                    {p.valid_until && <span>Geçerli: {p.valid_until}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.portal_link && (
                    <button onClick={() => copyLink(p.portal_link!)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition" title="Portal linkini kopyala">
                      <Link className="w-4 h-4" />
                    </button>
                  )}
                  {p.portal_link && (
                    <a href={`/portal/proposal/${p.view_token}`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition" title={t('proposals.portali_onizle', 'Portali önizle')}>
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  {['draft', 'negotiating'].includes(p.status) && (
                    <button onClick={() => sendProposal(p.id)} disabled={sending === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition">
                      {sending === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Gönder
                    </button>
                  )}
                  {['sent', 'negotiating'].includes(p.status) && (
                    <button onClick={() => { setNegProposalId(p.id); setNegLeadId(p.leads ? (proposals.find(pr => pr.id === p.id) as any)?.lead_id || '' : ''); setTab('negotiate') }}
                      className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs rounded-lg transition">
                      Pazarlık
                    </button>
                  )}
                  {['sent', 'negotiating'].includes(p.status) && (
                    <button onClick={() => api.patch(`/api/proposals/${p.id}/status`, { status: 'accepted' }).then(load)}
                      className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg transition">
                      ✓ Kabul
                    </button>
                  )}
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
                    {expanded === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteProposal(p.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded row */}
              {expanded === p.id && (
                <div className="border-t border-slate-700/50 px-5 py-3 bg-slate-900/30">
                  <div className="flex flex-wrap gap-4 text-xs">
                    {p.portal_link && (
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-500 mb-1">Portal Linki</div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 truncate text-xs">{p.portal_link}</span>
                          <button onClick={() => copyLink(p.portal_link!)} className="shrink-0 text-slate-400 hover:text-white">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-slate-500 mb-1">{t('proposals.goruntuleme', 'Görüntüleme')}</div>
                      <div className="text-white">{p.view_count}x {p.first_viewed_at ? `(ilk: ${fmtTime(p.first_viewed_at)})` : '(henüz açılmadı)'}</div>
                    </div>
                    {p.accepted_at && (
                      <div>
                        <div className="text-slate-500 mb-1">Kabul</div>
                        <div className="text-emerald-400">{p.accepted_by} · {fmtDate(p.accepted_at)}</div>
                      </div>
                    )}
                    <div>
                      <a href={`/api/proposals/${p.id}/pdf`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition">
                        <Download className="w-3.5 h-3.5" /> PDF İndir
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE ── */}
      {tab === 'create' && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: proposal details */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-white">Teklif Bilgileri</h2>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wide">{t('proposals.musteri', 'Müşteri *')}</label>
                <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">{t('proposals.lead_secin', 'Lead seçin...')}</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}{l.contact_name ? ` — ${l.contact_name}` : ''}</option>)}
                </select>
              </div>

              {/* Company profile row with logo preview */}
              <div className="flex items-start gap-3">
                {/* Logo preview */}
                <div className="shrink-0 mt-4">
                  {companyLogoUrl && !logoError ? (
                    <img src={companyLogoUrl} alt="logo"
                      onError={() => setLogoError(true)}
                      onLoad={() => setLogoError(false)}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-600/50" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-700 border border-slate-600/50 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-300">{senderCompany ? senderCompany.substring(0, 2).toUpperCase() : 'LF'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wide">{t('proposals.gonderen_sirket', 'Gönderen Şirket')}</label>
                    <input value={senderCompany} onChange={e => setSenderCompany(e.target.value)}
                      placeholder={t('proposals.sirketiniz', 'Şirketiniz')} className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase tracking-wide">{t('proposals.gecerlilik', 'Geçerlilik')}</label>
                    <select value={validUntil} onChange={e => setValidUntil(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                      {['7 gün', '15 gün', '30 gün', '45 gün', '60 gün'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Logo URL */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Image className="w-3 h-3" /> Logo URL (PDF ve portalde görünür)
                </label>
                <input value={companyLogoUrl} onChange={e => { setCompanyLogoUrl(e.target.value); setLogoError(false) }}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" />
                {companyLogoUrl && logoError && (
                  <p className="text-xs text-red-400">{t('proposals.logo_yuklenemedi_urlyi_ko', 'Logo yüklenemedi — URL\'yi kontrol edin')}</p>
                )}
                {companyLogoUrl && !logoError && (
                  <p className="text-xs text-emerald-400">{t('proposals.logo_hazir', 'Logo hazır ✓')}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Para Birimi</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value="TRY">₺ TL</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase tracking-wide">{t('proposals.iskonto', 'İskonto %')}</label>
                  <input type="number" min={0} max={99} value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))}
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase tracking-wide">KDV %</label>
                  <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value={0}>%0</option>
                    <option value={10}>%10</option>
                    <option value={18}>%18</option>
                    <option value={20}>%20</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wide">{t('proposals.odeme_kosullari', 'Ödeme Koşulları')}</label>
                <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                  placeholder={t('proposals.30_gun_net', '30 gün net')} className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wide">Notlar</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder={t('proposals.ozel_sartlar_teslim_sures', 'Özel şartlar, teslim süresi, garanti bilgisi...')}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
              </div>

              {/* Company profile toggle */}
              <button onClick={() => setShowCompanyProfile(!showCompanyProfile)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
                {showCompanyProfile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <Building2 className="w-3.5 h-3.5" />
                Şirket Profili (Banka, İletişim, Adres)
                <span className="text-xs text-emerald-500/70">otomatik kaydedilir</span>
              </button>
              {showCompanyProfile && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-400">{t('proposals.sirket_adresi', 'Şirket Adresi')}</label>
                    <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                      placeholder={t('proposals.ataturk_cad_no1_istanbul', 'Atatürk Cad. No:1, İstanbul')} className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('proposals.banka_adi', 'Banka Adı')}</label>
                    <input value={bankName} onChange={e => setBankName(e.target.value)}
                      placeholder={t('proposals.garanti_bankasi', 'Garanti Bankası')} className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">IBAN</label>
                    <input value={iban} onChange={e => setIban(e.target.value)}
                      placeholder="TR12 0006..." className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Telefon</label>
                    <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)}
                      placeholder="+90 212 000 00 00" className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Email</label>
                    <input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)}
                      placeholder="info@sirket.com" className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Right: items */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">{t('proposals.urun_hizmetler', 'Ürün / Hizmetler')}</h2>
                <button onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg hover:bg-emerald-500/20 transition">
                  <Plus className="w-3 h-3" /> Satır Ekle
                </button>
              </div>

              {/* Header */}
              <div className="grid grid-cols-12 gap-1 text-xs text-slate-500 px-1">
                <span className="col-span-5">{t('proposals.urunhizmet', 'Ürün/Hizmet')}</span>
                <span className="col-span-2">Birim</span>
                <span className="col-span-1 text-center">Adet</span>
                <span className="col-span-3 text-right">Fiyat</span>
                <span />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1">
                    <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)}
                      placeholder={t('proposals.urun_adi', 'Ürün adı')} className="col-span-5 bg-slate-900/60 border border-slate-600/40 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
                    <select value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                      className="col-span-2 bg-slate-900/60 border border-slate-600/40 rounded-lg px-1.5 py-2 text-white text-xs focus:outline-none">
                      {['adet', 'm²', 'm³', 'kg', 'ton', 'lt', 'saat', 'gün', 'ay'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} min={1}
                      className="col-span-1 bg-slate-900/60 border border-slate-600/40 rounded-lg px-1.5 py-2 text-white text-xs text-center focus:outline-none" />
                    <input type="number" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} placeholder="0"
                      className="col-span-3 bg-slate-900/60 border border-slate-600/40 rounded-lg px-2 py-2 text-white text-xs text-right focus:outline-none focus:border-emerald-500" />
                    <button onClick={() => removeItem(i)} className="col-span-1 text-slate-500 hover:text-red-400 text-center transition" disabled={items.length === 1}>
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-slate-700/50 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Ara Toplam</span><span>{fmt(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-xs text-red-400">
                    <span>İskonto (%{discountPct})</span><span>-{fmt(discountAmt)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>KDV (%{taxRate})</span><span>+{fmt(taxAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-700/50">
                  <span className="text-white">TOPLAM</span>
                  <span className="text-emerald-400">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={createProposal} disabled={creating || !selectedLead || !items[0].name}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl transition">
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {creating ? 'Oluşturuluyor...' : 'Teklif Oluştur'}
          </button>

          {createdResult && (
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle className="w-5 h-5" /> Teklif Hazır!
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => downloadPDF(createdResult.pdfBase64)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                  <Download className="w-3.5 h-3.5" /> PDF İndir
                </button>
                <button onClick={() => copyLink(createdResult.portalLink)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition">
                  <Copy className="w-3.5 h-3.5" /> Portal Linkini Kopyala
                </button>
                <button onClick={() => sendProposal(createdResult.proposalId)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition">
                  <Send className="w-3.5 h-3.5" /> WhatsApp'tan Gönder
                </button>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <Link className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs text-blue-300 break-all">{createdResult.portalLink}</span>
              </div>
              <p className="text-xs text-slate-500">{t('proposals.bu_linki_musteriye_gonder', 'Bu linki müşteriye gönderin. Müşteri linke tıklayıp teklifi görebilir, dijital olarak imzalayıp kabul/red edebilir. Siz her görüntüleme anında bildirim alırsınız.')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── NEGOTIATE ── */}
      {tab === 'negotiate' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" /> Pazarlık Stratejisi
            </h2>
            <select value={negLeadId} onChange={e => setNegLeadId(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500">
              <option value="">{t('proposals.lead_secin', 'Lead seçin')}</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
            </select>
            <select value={negProposalId} onChange={e => setNegProposalId(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500">
              <option value="">{t('proposals.teklif_secin', 'Teklif seçin')}</option>
              {proposals.filter(p => ['sent', 'negotiating', 'draft'].includes(p.status)).map(p => (
                <option key={p.id} value={p.id}>{p.leads?.company_name} — ₺{Number(p.total_price).toLocaleString()}</option>
              ))}
            </select>
            <textarea value={negMsg} onChange={e => setNegMsg(e.target.value)} rows={3}
              placeholder={t('proposals.musterinin_pazarlik_mesaj', 'Müşterinin pazarlık mesajını buraya yapıştırın...')}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none" />
            <button onClick={negotiate} disabled={negotiating || !negLeadId || !negMsg || !negProposalId}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {negotiating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {negotiating ? 'Strateji üretiliyor...' : 'Pazarlık Stratejisi Üret'}
            </button>

            {negResult?.negotiation && (
              <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Taktik:</span> <span className="text-violet-300 font-medium">{negResult.negotiation.tactic}</span></div>
                  <div><span className="text-slate-400">{t('proposals.indirim', 'İndirim:')}</span> <span className="text-amber-300 font-medium">%{negResult.negotiation.discountPercent}</span></div>
                  {negResult.negotiation.newPrice > 0 && (
                    <div className="col-span-2"><span className="text-slate-400">Yeni fiyat:</span> <span className="text-emerald-400 font-bold">₺{negResult.negotiation.newPrice?.toLocaleString()}</span></div>
                  )}
                </div>
                {negResult.negotiation.counterMessage && (
                  <div className="p-3 bg-slate-900/60 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">{t('proposals.onerilen_yanit_mesaji', 'Önerilen yanıt mesajı:')}</p>
                    <p className="text-sm text-white">{negResult.negotiation.counterMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-5 flex items-center justify-center text-center text-slate-500">
            <div>
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('proposals.musterinin_yaniti_gelince', 'Müşterinin yanıtı gelince AI size en iyi pazarlık stratejisini gösterir.')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
