'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { FileText, Plus, Send, RefreshCw, CheckCircle, Clock, XCircle, Zap, DollarSign, TrendingUp, Download } from 'lucide-react'

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'create' | 'negotiate'>('list')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Create form
  const [selectedLead, setSelectedLead] = useState('')
  const [senderCompany, setSenderCompany] = useState('')
  const [validUntil, setValidUntil] = useState('30 gün')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1, price: 0 }])
  const [creating, setCreating] = useState(false)
  const [createdProposal, setCreatedProposal] = useState<any>(null)

  // Negotiate
  const [negotiateMessage, setNegotiateMessage] = useState('')
  const [negotiateProposalId, setNegotiateProposalId] = useState('')
  const [negotiateLeadId, setNegotiateLeadId] = useState('')
  const [negotiating, setNegotiating] = useState(false)
  const [negotiationResult, setNegotiationResult] = useState<any>(null)

  // Analyze
  const [analyzeMsg, setAnalyzeMsg] = useState('')
  const [analyzeLeadId, setAnalyzeLeadId] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const [sending, setSending] = useState<string | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [p, s, l] = await Promise.allSettled([
        api.get('/api/proposals/list'),
        api.get('/api/proposals/stats'),
        api.get('/api/leads?limit=100'),
      ])
      if (p.status === 'fulfilled') setProposals(p.value.proposals || [])
      if (s.status === 'fulfilled') setStats(s.value)
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const addItem = () => setItems([...items, { name: '', qty: 1, price: 0 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, key: string, value: any) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [key]: value }
    setItems(updated)
  }

  const totalPrice = items.reduce((sum, item) => sum + (item.qty || 1) * (item.price || 0), 0)

  const createProposal = async () => {
    if (!selectedLead || !items[0].name) return
    setCreating(true)
    try {
      const data = await api.post('/api/proposals/create', {
        leadId: selectedLead, items, notes, validUntil, senderCompany,
      })
      setCreatedProposal(data)
      showMsg('success', `Teklif oluşturuldu! Toplam: ₺${data.totalPrice?.toLocaleString('tr-TR')}`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setCreating(false) }
  }

  const downloadPDF = (base64: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${base64}`
    link.download = filename
    link.click()
  }

  const sendProposal = async (proposalId: string) => {
    setSending(proposalId)
    try {
      const data = await api.post(`/api/proposals/send/${proposalId}`, {})
      showMsg('success', data.message)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSending(null) }
  }

  const analyze = async () => {
    if (!analyzeLeadId || !analyzeMsg) return
    setAnalyzing(true)
    try {
      const data = await api.post('/api/proposals/analyze', { leadId: analyzeLeadId, message: analyzeMsg })
      setAnalysisResult(data.analysis)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setAnalyzing(false) }
  }

  const negotiate = async () => {
    if (!negotiateLeadId || !negotiateMessage || !negotiateProposalId) return
    setNegotiating(true)
    try {
      const data = await api.post('/api/proposals/negotiate', {
        leadId: negotiateLeadId, message: negotiateMessage, proposalId: negotiateProposalId,
      })
      setNegotiationResult(data)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setNegotiating(false) }
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    negotiating: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  const statusLabel: Record<string, string> = {
    draft: 'Taslak', sent: 'Gönderildi', negotiating: 'Pazarlıkta',
    accepted: 'Kabul Edildi', rejected: 'Reddedildi',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText size={24} className="text-emerald-400" />
            Teklif & Pazarlık
          </h1>
          <p className="text-slate-400 mt-1 text-sm">AI ile otomatik teklif hazırla, pazarlık yap, PDF oluştur, WhatsApp'tan gönder</p>
        </div>
        <button onClick={() => setTab('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
          <Plus size={15} /> Yeni Teklif
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Teklif', value: stats.total, color: 'text-slate-300' },
            { label: 'Gönderilen', value: stats.sent, color: 'text-blue-400' },
            { label: 'Kabul Edilen', value: stats.accepted, color: 'text-emerald-400' },
            { label: 'Toplam Değer', value: `₺${(stats.totalValue || 0).toLocaleString('tr-TR')}`, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'list', label: `📋 Teklifler (${proposals.length})` },
          { id: 'create', label: '➕ Yeni Teklif' },
          { id: 'negotiate', label: '🤝 Pazarlık AI' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TEKLİF LİSTESİ */}
      {tab === 'list' && (
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <FileText size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz teklif yok</p>
              <button onClick={() => setTab('create')} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition">
                İlk Teklifi Oluştur
              </button>
            </div>
          ) : (
            proposals.map(p => (
              <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold">{p.leads?.company_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[p.status] || statusColor.draft}`}>
                      {statusLabel[p.status] || p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="text-emerald-400 font-bold text-sm">₺{Number(p.total_price || 0).toLocaleString('tr-TR')}</span>
                    <span>{p.leads?.contact_name || ''}</span>
                    <span>{new Date(p.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === 'draft' || p.status === 'negotiating' ? (
                    <button onClick={() => sendProposal(p.id)} disabled={sending === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition">
                      {sending === p.id ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                      Gönder
                    </button>
                  ) : null}
                  {['sent', 'negotiating'].includes(p.status) && (
                    <button onClick={() => {
                      setNegotiateProposalId(p.id)
                      setNegotiateLeadId(p.lead_id)
                      setTab('negotiate')
                    }} className="px-3 py-1.5 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 text-xs rounded-lg transition">
                      Pazarlık
                    </button>
                  )}
                  {['sent', 'negotiating'].includes(p.status) && (
                    <button onClick={() => api.patch(`/api/proposals/${p.id}/status`, { status: 'accepted' }).then(load)}
                      className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg transition">
                      ✓ Kabul
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TEKLİF OLUŞTUR */}
      {tab === 'create' && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-4 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold">Teklif Bilgileri</h2>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Lead *</label>
                <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Lead seçin</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} {l.contact_name ? `— ${l.contact_name}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Gönderen Şirket</label>
                <input value={senderCompany} onChange={e => setSenderCompany(e.target.value)}
                  placeholder="Şirketinizin adı"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Geçerlilik Süresi</label>
                <select value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  {['7 gün', '15 gün', '30 gün', '60 gün'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Notlar</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Özel şartlar, kdv dahil/hariç vb."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold">Ürün / Hizmetler</h2>
                <button onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg transition">
                  <Plus size={12} /> Ekle
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)}
                      placeholder="Ürün/Hizmet adı"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
                    <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', parseInt(e.target.value))}
                      className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none" />
                    <input type="number" value={item.price} onChange={e => updateItem(i, 'price', parseFloat(e.target.value))}
                      placeholder="₺"
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <span className="text-slate-300 font-medium">Toplam</span>
                <span className="text-emerald-400 text-xl font-bold">₺{totalPrice.toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>

          <button onClick={createProposal} disabled={creating || !selectedLead || !items[0].name}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl transition">
            {creating ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
            {creating ? 'PDF Oluşturuluyor...' : 'Teklif Oluştur + PDF İndir'}
          </button>

          {createdProposal && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-emerald-300 font-medium">✅ Teklif hazır!</p>
                <p className="text-slate-400 text-sm">Toplam: ₺{createdProposal.totalPrice?.toLocaleString('tr-TR')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadPDF(createdProposal.pdfBase64, `teklif-${Date.now()}.pdf`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                  <Download size={14} /> PDF İndir
                </button>
                <button onClick={() => sendProposal(createdProposal.proposalId)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition">
                  <Send size={14} /> WhatsApp Gönder
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAZARLIK AI */}
      {tab === 'negotiate' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Mesaj Analiz */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Lead Mesajı Analiz Et
            </h2>
            <select value={analyzeLeadId} onChange={e => setAnalyzeLeadId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500">
              <option value="">Lead seçin</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
            </select>
            <textarea value={analyzeMsg} onChange={e => setAnalyzeMsg(e.target.value)} rows={3}
              placeholder="Lead'den gelen mesajı buraya yapıştırın..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 resize-none" />
            <button onClick={analyze} disabled={analyzing || !analyzeLeadId || !analyzeMsg}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              {analyzing ? 'Analiz ediliyor...' : 'Analiz Et'}
            </button>
            {analysisResult && (
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Niyet:</span> <span className="text-yellow-300 font-medium">{analysisResult.intent}</span></div>
                  <div><span className="text-slate-400">Aciliyet:</span> <span className="text-yellow-300 font-medium">{analysisResult.urgency}</span></div>
                  <div><span className="text-slate-400">Duygu:</span> <span className="text-yellow-300 font-medium">{analysisResult.sentiment}</span></div>
                  <div><span className="text-slate-400">Aksiyon:</span> <span className="text-emerald-300 font-medium">{analysisResult.suggestedAction}</span></div>
                </div>
                {analysisResult.response && (
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <p className="text-slate-400 text-xs mb-1">💬 Önerilen cevap:</p>
                    <p className="text-white text-sm">{analysisResult.response}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pazarlık */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-400" /> Pazarlık Yanıtı Üret
            </h2>
            <select value={negotiateLeadId} onChange={e => setNegotiateLeadId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              <option value="">Lead seçin</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
            </select>
            <select value={negotiateProposalId} onChange={e => setNegotiateProposalId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              <option value="">Teklif seçin</option>
              {proposals.filter(p => ['sent', 'negotiating'].includes(p.status)).map(p => (
                <option key={p.id} value={p.id}>{p.leads?.company_name} — ₺{Number(p.total_price).toLocaleString('tr-TR')}</option>
              ))}
            </select>
            <textarea value={negotiateMessage} onChange={e => setNegotiateMessage(e.target.value)} rows={3}
              placeholder="Karşı tarafın pazarlık mesajı..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
            <button onClick={negotiate} disabled={negotiating || !negotiateLeadId || !negotiateMessage || !negotiateProposalId}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {negotiating ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
              {negotiating ? 'Strateji üretiliyor...' : 'Pazarlık Stratejisi Üret'}
            </button>
            {negotiationResult && (
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Taktik:</span> <span className="text-purple-300 font-medium">{negotiationResult.negotiation?.tactic}</span></div>
                  <div><span className="text-slate-400">İndirim:</span> <span className="text-yellow-300 font-medium">%{negotiationResult.negotiation?.discountPercent}</span></div>
                  {negotiationResult.negotiation?.newPrice > 0 && (
                    <div className="col-span-2"><span className="text-slate-400">Yeni fiyat:</span> <span className="text-emerald-300 font-bold">₺{negotiationResult.negotiation.newPrice?.toLocaleString('tr-TR')}</span></div>
                  )}
                </div>
                {negotiationResult.negotiation?.counterMessage && (
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <p className="text-slate-400 text-xs mb-1">💬 Yanıt mesajı:</p>
                    <p className="text-white text-sm">{negotiationResult.negotiation.counterMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}