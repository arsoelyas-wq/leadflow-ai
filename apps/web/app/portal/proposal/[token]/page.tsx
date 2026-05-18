'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  CheckCircle, XCircle, Download, Building2, Clock,
  ChevronRight, Pen, RefreshCw,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ProposalData {
  id: string; status: string; items: any[]; total_price: number;
  subtotal: number; discount: number; tax: number; total: number;
  discount_percent: number; tax_rate: number; payment_terms: string | null;
  iban: string | null; bank_name: string | null; company_address: string | null;
  company_phone: string | null; company_email: string | null; sender_company: string | null;
  company_logo_url: string | null; valid_until: string | null; currency: string;
  notes: string | null; view_token: string; accepted_at: string | null;
  accepted_by: string | null; rejected_at: string | null; rejection_reason: string | null;
}

interface LeadData { company_name: string; contact_name: string | null; city: string | null }

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ProposalPortalPage() {
  const params = useParams()
  const token  = params?.token as string

  const [proposal, setProposal]       = useState<ProposalData | null>(null)
  const [lead, setLead]               = useState<LeadData | null>(null)
  const [items, setItems]             = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [modal, setModal]             = useState<'accept' | 'reject' | null>(null)
  const [sigMode, setSigMode]         = useState<'draw' | 'type'>('draw')
  const [sigName, setSigName]         = useState('')
  const [sigTitle, setSigTitle]       = useState('')
  const [typedSig, setTypedSig]       = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState<'accepted' | 'rejected' | null>(null)
  const [isDrawing, setIsDrawing]     = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos   = useRef<{ x: number; y: number } | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/proposals/portal/${token}`)
      if (!r.ok) { setError('Teklif bulunamadı veya süresi dolmuş.'); return }
      const data = await r.json()
      setProposal(data.proposal)
      setLead(data.lead)
      setItems(data.items || [])
    } catch {
      setError('Teklif yüklenirken bir hata oluştu.')
    }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  // Canvas drawing
  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e: any) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current; if (!canvas) return
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e: any) => {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e, canvasRef.current)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getSignatureData = (): string => {
    if (sigMode === 'type') return `text:${typedSig}`
    return canvasRef.current?.toDataURL('image/png') || ''
  }

  const handleAccept = async () => {
    if (!sigName.trim()) return
    setSubmitting(true)
    try {
      const r = await fetch(`${API_URL}/api/proposals/portal/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sigName, title: sigTitle, signatureData: getSignatureData() }),
      })
      if (!r.ok) throw new Error('İşlem başarısız')
      setDone('accepted'); setModal(null)
    } catch (e: any) { alert(e.message) }
    setSubmitting(false)
  }

  const handleReject = async () => {
    setSubmitting(true)
    try {
      await fetch(`${API_URL}/api/proposals/portal/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      setDone('rejected'); setModal(null)
    } catch {}
    setSubmitting(false)
  }

  const sym = (cur: string) => cur === 'TRY' ? '₺' : cur === 'USD' ? '$' : '€'
  const fmt = (n: number) => `${sym(proposal?.currency || 'TRY')}${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`

  // ── LOADING ──
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center p-8">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">{error}</p>
      </div>
    </div>
  )

  if (!proposal) return null

  const alreadyClosed = !!proposal.accepted_at || !!proposal.rejected_at

  // ── DONE STATE ──
  if (done === 'accepted') return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl p-10">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Teklif Kabul Edildi!</h1>
        <p className="text-slate-500">İmzanız alındı. Satış ekibimiz en kısa sürede sizinle iletişime geçecek.</p>
        <p className="mt-4 text-sm text-slate-400">Teklif No: TKL-{proposal.id.slice(-6).toUpperCase()}</p>
      </div>
    </div>
  )

  if (done === 'rejected') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl p-10">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-9 h-9 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Geri Bildiriminiz Alındı</h1>
        <p className="text-slate-500">Geri bildiriminiz için teşekkür ederiz. İlerleyen süreçte tekrar görüşmek üzere.</p>
      </div>
    </div>
  )

  // Already accepted/rejected
  if (proposal.status === 'accepted') return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl p-10">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Bu Teklif Kabul Edilmiş</h1>
        <p className="text-slate-500">Kabul eden: <strong>{proposal.accepted_by}</strong></p>
      </div>
    </div>
  )

  // ── MAIN PORTAL ──
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between text-sm sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold">
            {(proposal.sender_company || 'LF').substring(0, 2).toUpperCase()}
          </div>
          <span className="font-semibold">{proposal.sender_company || 'LeadFlow AI'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Geçerli: {proposal.valid_until || '30 gün'}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Proposal header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-6 text-white flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Profesyonel Teklif</p>
              <h1 className="text-2xl font-bold">TKL-{proposal.id.slice(-6).toUpperCase()}</h1>
              <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            <a href={`${API_URL}/api/proposals/portal/${token}/pdf`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
              <Download className="w-4 h-4" /> PDF
            </a>
          </div>

          {/* Client info */}
          <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{lead?.company_name}</p>
              {lead?.contact_name && <p className="text-sm text-slate-500">{lead.contact_name}</p>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Teklif Kalemleri</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((it: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{it.name}</p>
                  <p className="text-sm text-slate-400">{it.qty} {it.unit || 'adet'} × {fmt(it.price)}</p>
                </div>
                <p className="font-semibold text-slate-800">{fmt((it.qty || 1) * (it.price || 0))}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Ara Toplam</span><span>{fmt(proposal.subtotal)}</span>
            </div>
            {(proposal.discount_percent || 0) > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>İskonto (%{proposal.discount_percent})</span><span>-{fmt(proposal.discount)}</span>
              </div>
            )}
            {(proposal.tax_rate ?? 18) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>KDV (%{proposal.tax_rate ?? 18})</span><span>{fmt(proposal.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-200">
              <span>Genel Toplam</span><span className="text-blue-600">{fmt(proposal.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        {(proposal.payment_terms || proposal.iban) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4 grid sm:grid-cols-2 gap-4">
            {proposal.payment_terms && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ödeme Koşulları</p>
                <p className="font-medium text-slate-700">{proposal.payment_terms}</p>
              </div>
            )}
            {proposal.bank_name && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Banka</p>
                <p className="font-medium text-slate-700">{proposal.bank_name}</p>
              </div>
            )}
            {proposal.iban && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">IBAN</p>
                <p className="font-mono font-medium text-slate-700">{proposal.iban}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {proposal.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notlar</p>
            <p className="text-sm text-amber-800">{proposal.notes}</p>
          </div>
        )}

        {/* CTA Buttons */}
        {!alreadyClosed && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-6 text-center space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">Bu Teklifi Yanıtlayın</h2>
            <p className="text-sm text-slate-500">Teklifi kabul veya red edebilirsiniz. Kararınız anında satış ekibimize iletilecek.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setModal('accept')}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-md shadow-emerald-500/20">
                <CheckCircle className="w-4 h-4" /> Teklifi Kabul Et
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setModal('reject')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition">
                <XCircle className="w-4 h-4" /> Reddet
              </button>
            </div>
          </div>
        )}

        {alreadyClosed && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-5 text-center">
            {proposal.status === 'accepted'
              ? <p className="text-emerald-600 font-semibold">✓ Bu teklif kabul edilmiştir — {proposal.accepted_by}</p>
              : <p className="text-slate-500">Bu teklif yanıtlanmıştır.</p>}
          </div>
        )}

        <p className="text-center text-xs text-slate-400">Powered by <span className="font-semibold">LeadFlow AI</span></p>
      </div>

      {/* ── ACCEPT MODAL ── */}
      {modal === 'accept' && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Teklifi İmzala & Kabul Et</h2>
              <p className="text-sm text-slate-500 mt-1">İmzanız yasal olarak bağlayıcıdır.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Ad Soyad *</label>
                  <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Ahmet Yılmaz"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Unvan</label>
                  <input value={sigTitle} onChange={e => setSigTitle(e.target.value)} placeholder="Genel Müdür"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-500">İmza</label>
                  <div className="flex gap-1">
                    {(['draw', 'type'] as const).map(m => (
                      <button key={m} onClick={() => setSigMode(m)}
                        className={`px-2 py-1 text-xs rounded ${sigMode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {m === 'draw' ? 'Çiz' : 'Yaz'}
                      </button>
                    ))}
                  </div>
                </div>

                {sigMode === 'draw' ? (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                    <canvas ref={canvasRef} width={380} height={120} className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                    <button onClick={clearCanvas}
                      className="absolute top-2 right-2 text-xs text-slate-400 hover:text-slate-600 bg-white rounded px-2 py-0.5 shadow-sm">
                      Temizle
                    </button>
                    <p className="absolute bottom-2 left-3 text-xs text-slate-400 pointer-events-none flex items-center gap-1">
                      <Pen className="w-3 h-3" /> İmzanızı çizin
                    </p>
                  </div>
                ) : (
                  <input value={typedSig} onChange={e => setTypedSig(e.target.value)}
                    placeholder="İmza olarak kullanılacak metin"
                    className="w-full border border-slate-300 rounded-lg px-3 py-3 text-lg italic focus:outline-none focus:border-blue-500" style={{ fontFamily: 'cursive' }} />
                )}
              </div>

              <p className="text-xs text-slate-400">Bu teklifi kabul ederek tüm koşulları okuduğunuzu ve kabul ettiğinizi onaylıyorsunuz.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium">
                İptal
              </button>
              <button onClick={handleAccept} disabled={!sigName.trim() || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Kabul Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {modal === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Teklifi Reddet</h2>
              <p className="text-sm text-slate-500 mt-1">Geri bildiriminiz bize çok değerli.</p>
            </div>
            <div className="p-6 space-y-3">
              <label className="text-xs text-slate-500 block">Red Nedeni (isteğe bağlı)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="Fiyat yüksek, bütçe yok, başka firmayı seçtik..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none" />
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium">
                İptal
              </button>
              <button onClick={handleReject} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-medium transition">
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
