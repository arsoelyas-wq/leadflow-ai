'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LifeBuoy, X, Send, Loader2, Plus, Zap, ChevronDown, MessageSquare,
  CheckCircle2, Star, Ticket, AlertTriangle, ImagePlus, Trash2, ChevronRight,
  Clock, CheckCheck, RefreshCw, ArrowLeft,
} from 'lucide-react'
import { api } from '@/lib/api'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string; title: string; status: 'open' | 'resolved' | 'escalated'
  message_count: number; updated_at: string
}
interface Message {
  id: string; role: 'user' | 'assistant'; content: string
  quick_replies: string[]; created_at: string
}
interface SupportTicket {
  id: string; ticket_number: number; category: string; title: string
  priority: string; status: string; admin_reply?: string; admin_name?: string
  admin_replied_at?: string; created_at: string; updated_at: string
}
interface AttachmentPreview { name: string; dataUrl: string; type: string }

interface Props {
  user: { id: string; name?: string; planType: string; company?: string; sector?: string }
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type View = 'chat' | 'new-ticket' | 'my-tickets'

const CATEGORIES = [
  { value: 'technical',  label: 'Teknik Sorun',      emoji: '🔧' },
  { value: 'billing',    label: 'Ödeme & Fatura',    emoji: '💳' },
  { value: 'feature',    label: 'Özellik İsteği',    emoji: '💡' },
  { value: 'account',   label: 'Hesap Sorunu',      emoji: '👤' },
  { value: 'general',   label: 'Genel',             emoji: '💬' },
]

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Açık',       color: '#2563eb', bg: '#dbeafe' },
  in_progress: { label: 'İşlemde',    color: '#d97706', bg: '#fef3c7' },
  waiting:     { label: 'Bekliyor',   color: '#7c3aed', bg: '#ede9fe' },
  resolved:    { label: 'Çözüldü',    color: '#059669', bg: '#d1fae5' },
  closed:      { label: 'Kapatıldı', color: '#64748b', bg: '#f1f5f9' },
}

async function compressImage(file: File): Promise<AttachmentPreview> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 1200
        let w = img.width, h = img.height
        if (w > maxDim || h > maxDim) {
          const ratio = maxDim / Math.max(w, h)
          w = Math.round(w * ratio); h = Math.round(h * ratio)
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        let q = 0.8, dataUrl = canvas.toDataURL('image/jpeg', q)
        // target ≤ 300KB base64
        while (dataUrl.length > 300 * 1024 * 1.37 && q > 0.3) {
          q -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', q)
        }
        resolve({ name: file.name, dataUrl, type: 'image/jpeg' })
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400"
          style={{ animation: `dsc-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardSupportChat({ user, onClose }: Props) {
  // Chat state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [showConvList, setShowConvList] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingSelected, setRatingSelected] = useState(0)
  const [hasEscalation, setHasEscalation] = useState(false)

  // Ticket state
  const [view, setView] = useState<View>('chat')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    category: 'technical', title: '', description: '', priority: 'normal',
  })
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [ticketSuccess, setTicketSuccess] = useState<SupportTicket | null>(null)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeConv = conversations.find(c => c.id === activeConvId)

  // Load conversations
  useEffect(() => {
    api.get('/api/support/conversations')
      .then((d: any) => {
        const convs = d.conversations || []
        setConversations(convs)
        const open = convs.find((c: Conversation) => c.status === 'open')
        if (open) setActiveConvId(open.id)
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [])

  // Load messages
  useEffect(() => {
    if (!activeConvId) return
    setLoadingMsgs(true); setMessages([])
    api.get(`/api/support/conversations/${activeConvId}/messages`)
      .then((d: any) => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [activeConvId])

  // Supabase realtime
  useEffect(() => {
    if (!activeConvId) return
    const ch = supabase.channel(`dsc-${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload: any) => setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeConvId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  // Load tickets when switching to my-tickets view
  useEffect(() => {
    if (view !== 'my-tickets') return
    setLoadingTickets(true)
    api.get('/api/support/tickets')
      .then((d: any) => setTickets(d.tickets || []))
      .catch(() => {})
      .finally(() => setLoadingTickets(false))
  }, [view])

  // Pre-fill ticket title from active conversation
  useEffect(() => {
    if (view === 'new-ticket' && activeConv) {
      setTicketForm(f => ({ ...f, title: activeConv.title !== 'Yeni Destek Talebi' ? activeConv.title : f.title }))
    }
  }, [view, activeConv])

  const createConversation = useCallback(async () => {
    try {
      const d: any = await api.post('/api/support/conversations', { title: 'Yeni Destek Talebi' })
      const conv = d.conversation as Conversation
      setConversations(prev => [conv, ...prev])
      setActiveConvId(conv.id)
      setMessages([]); setShowConvList(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {}
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    if (!activeConvId) { await createConversation(); return }

    setInput(''); setSending(true)
    const optId = `opt-${Date.now()}`
    setMessages(prev => [...prev, { id: optId, role: 'user', content: trimmed, quick_replies: [], created_at: new Date().toISOString() }])

    try {
      const d: any = await api.post(`/api/support/conversations/${activeConvId}/messages`, {
        content: trimmed, pageContext: 'Dashboard',
        userProfile: { name: user.name, planType: user.planType, company: user.company, sector: user.sector },
      })
      setMessages(prev => {
        const without = prev.filter(m => m.id !== optId)
        return [...without, ...(d.userMessage ? [d.userMessage] : []), ...(d.aiMessage ? [d.aiMessage] : [])]
      })
      if (d.needsEscalation) setHasEscalation(true)
      if (d.aiMessage?.content) {
        setConversations(prev => prev.map(c =>
          c.id === activeConvId ? { ...c, updated_at: new Date().toISOString(), message_count: c.message_count + 2 } : c
        ))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optId))
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [sending, activeConvId, user, createConversation])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const resolveConversation = useCallback(async () => {
    if (!activeConvId) return
    try {
      await api.patch(`/api/support/conversations/${activeConvId}`, { status: 'resolved' })
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, status: 'resolved' } : c))
      setShowRating(true)
    } catch {}
  }, [activeConvId])

  const submitRating = useCallback(async (r: number) => {
    if (!activeConvId) return
    try { await api.patch(`/api/support/conversations/${activeConvId}`, { status: 'resolved', satisfaction_rating: r }) } catch {}
    setShowRating(false)
  }, [activeConvId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 3 - attachments.length)
    if (!files.length) return
    setUploadingFiles(true)
    try {
      const compressed = await Promise.all(files.map(compressImage))
      setAttachments(prev => [...prev, ...compressed].slice(0, 3))
    } catch {}
    setUploadingFiles(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submitTicket = async () => {
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) return
    setSubmittingTicket(true)
    try {
      const d: any = await api.post('/api/support/tickets', {
        ...ticketForm,
        attachments,
        conversationId: activeConvId,
      })
      setTicketSuccess(d.ticket)
      setTicketForm({ category: 'technical', title: '', description: '', priority: 'normal' })
      setAttachments([])
    } catch {}
    setSubmittingTicket(false)
  }

  const openNewTicket = () => {
    setTicketSuccess(null)
    setAttachments([])
    setView('new-ticket')
  }

  // ── Render Helpers ──────────────────────────────────────────────────────────

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
      <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
        <Zap size={14} className="text-white fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-[13.5px] font-bold">Sovlo AI Destek</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-blue-100 text-[11px]">Yapay zeka destekli</span>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button onClick={() => setView('chat')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${view === 'chat' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
          <MessageSquare size={11} className="inline mr-1" />Chat
        </button>
        <button onClick={() => setView('my-tickets')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${view === 'my-tickets' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
          <Ticket size={11} className="inline mr-1" />Taleplerim
        </button>
      </div>

      {/* Conversation switcher (chat only) */}
      {view === 'chat' && (
        <div className="relative">
          <button onClick={() => setShowConvList(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer">
            <MessageSquare size={12} className="text-white" />
            <ChevronDown size={10} className="text-white/70" style={{ transform: showConvList ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {showConvList && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-700">Geçmiş Konuşmalar</span>
                <button onClick={createConversation} className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:text-blue-800 cursor-pointer">
                  <Plus size={11} /> Yeni
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {loadingConvs ? (
                  <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
                ) : conversations.length === 0 ? (
                  <p className="text-[12px] text-slate-400 text-center py-4">Henüz konuşma yok</p>
                ) : conversations.map(conv => (
                  <button key={conv.id} onClick={() => { setActiveConvId(conv.id); setShowConvList(false) }}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${activeConvId === conv.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-800 truncate flex-1">{conv.title}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${conv.status === 'open' ? 'bg-emerald-100 text-emerald-700' : conv.status === 'escalated' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {conv.status === 'open' ? 'Açık' : conv.status === 'resolved' ? 'Çözüldü' : 'Aktarıldı'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{conv.message_count} mesaj</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer" aria-label="Kapat">
        <X size={13} className="text-white" />
      </button>
    </div>
  )

  const renderChat = () => (
    <>
      {/* Active conv info */}
      {activeConv && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <span className="text-[12px] text-slate-600 font-medium truncate flex-1 mr-2">{activeConv.title}</span>
          {activeConv.status === 'open' && (
            <button onClick={resolveConversation} className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold hover:text-emerald-900 cursor-pointer flex-shrink-0">
              <CheckCircle2 size={11} /> Çözüldü
            </button>
          )}
        </div>
      )}

      {/* Escalation banner */}
      {hasEscalation && (
        <div className="mx-3 mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-2.5 flex-shrink-0">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-amber-800">Sorunu çözemedik mi?</p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">Ekibimize detaylı bir destek talebi oluşturabilirsiniz. Fotoğraf ekleyebilirsiniz.</p>
          </div>
          <button onClick={openNewTicket} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors cursor-pointer whitespace-nowrap">
            Ticket Aç
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 bg-slate-50">
        {!activeConvId ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <LifeBuoy size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900 mb-1">Nasıl yardımcı olabiliriz?</p>
              <p className="text-[12px] text-slate-500 leading-relaxed">Sorunuzu yazın, yapay zeka destekli ekibimiz anında yanıtlasın.</p>
            </div>
            <button onClick={createConversation} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold hover:brightness-110 transition-all shadow-md shadow-blue-500/20 cursor-pointer">
              <Plus size={14} /> Yeni Konuşma
            </button>
            <div className="grid grid-cols-2 gap-2 w-full mt-2">
              {['WhatsApp nasıl bağlarım?', 'Lead scraper nasıl çalışır?', 'Plan yükseltmek istiyorum', 'Teknik sorun bildirmek istiyorum'].map(q => (
                <button key={q} onClick={() => createConversation()}
                  className="text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer text-[11px] text-slate-700 leading-tight">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : loadingMsgs ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageSquare size={20} className="text-slate-300" />
            <p className="text-[12px] text-slate-400">Sorunuzu aşağıya yazın</p>
          </div>
        ) : messages.map(msg => {
          const isUser = msg.role === 'user'
          const time = new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={msg.id} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-2 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-1">
                    <Zap size={11} className="text-white fill-white" />
                  </div>
                )}
                <div className={`px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                  {msg.content}
                </div>
              </div>
              <span className={`text-[10px] text-slate-400 ${isUser ? 'mr-1' : 'ml-9'}`}>{time}</span>
              {!isUser && msg.quick_replies?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-9 mt-0.5">
                  {msg.quick_replies.map(qr => (
                    <button key={qr} onClick={() => sendMessage(qr)} className="px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 text-[11px] font-medium hover:bg-blue-50 transition-colors cursor-pointer">{qr}</button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {sending && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Zap size={11} className="text-white fill-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm"><TypingDots /></div>
          </div>
        )}

        {showRating && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-slate-900 mb-3">Bu deneyimi değerlendirin</p>
            <div className="flex justify-center gap-2 mb-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onMouseEnter={() => setRatingHover(n)} onMouseLeave={() => setRatingHover(0)} onClick={() => setRatingSelected(n)} className="cursor-pointer hover:scale-110 transition-transform">
                  <Star size={26} className={n <= (ratingHover || ratingSelected) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowRating(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] cursor-pointer hover:bg-slate-50">Atla</button>
              <button onClick={() => ratingSelected > 0 && submitRating(ratingSelected)} disabled={ratingSelected === 0}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[12px] font-semibold disabled:opacity-40 cursor-pointer">Gönder</button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Mesajınızı yazın... (Enter: gönder)" rows={1} disabled={sending}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition-colors max-h-28 overflow-y-auto leading-relaxed"
            style={{ scrollbarWidth: 'none' }}
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 112) + 'px' }}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          <a href="mailto:destek@sovlo.io" className="hover:text-slate-600">destek@sovlo.io</a> · Pzt–Cum 09:00–18:00
        </p>
      </div>
    </>
  )

  const renderNewTicket = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {ticketSuccess ? (
        /* Success state */
        <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <CheckCheck size={28} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-900">Talebiniz Alındı!</p>
            <p className="text-[12px] text-slate-500 mt-1">Ticket #{ticketSuccess.ticket_number}</p>
          </div>
          <div className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left">
            <p className="text-[12px] text-slate-500 mb-1">Konu</p>
            <p className="text-[13px] font-semibold text-slate-800">{ticketSuccess.title}</p>
            <div className="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Ekibimiz en kısa sürede inceleyecek ve <strong>destek@sovlo.io</strong> üzerinden yanıt verecek. Taleplerinizi "Taleplerim" sekmesinden takip edebilirsiniz.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={() => { setView('chat'); setTicketSuccess(null) }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
              Chat'e Dön
            </button>
            <button onClick={() => { setView('my-tickets'); setTicketSuccess(null) }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-semibold hover:brightness-110 transition-all cursor-pointer">
              Taleplerim
            </button>
          </div>
        </div>
      ) : (
        /* Ticket form */
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('chat')} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer">
              <ArrowLeft size={13} className="text-slate-600" />
            </button>
            <div>
              <p className="text-[13px] font-bold text-slate-900">Destek Talebi Oluştur</p>
              <p className="text-[11px] text-slate-500">Ekibimiz inceleyip size özel yanıt verecek</p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Kategori</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setTicketForm(f => ({ ...f, category: cat.value }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all cursor-pointer ${ticketForm.category === cat.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Konu Başlığı *</label>
            <input type="text" value={ticketForm.title} onChange={e => setTicketForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Sorununuzu kısaca özetleyin"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 transition-colors" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Detaylı Açıklama *</label>
            <textarea value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Sorununuzu detaylı anlatın. Hangi adımları denediğiniz, hata mesajları, ne zaman başladığı..."
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 transition-colors leading-relaxed" />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Öncelik</label>
            <div className="flex gap-2">
              {[{ v: 'low', l: 'Düşük', c: 'text-slate-600' }, { v: 'normal', l: 'Normal', c: 'text-blue-600' }, { v: 'high', l: 'Yüksek', c: 'text-orange-600' }, { v: 'urgent', l: 'Acil', c: 'text-red-600' }].map(p => (
                <button key={p.v} onClick={() => setTicketForm(f => ({ ...f, priority: p.v }))}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${ticketForm.priority === p.v ? `border-current ${p.c} bg-current/5` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Ekran Görüntüsü / Fotoğraf <span className="text-slate-400 font-normal normal-case">(max 3)</span>
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

            {/* Previews */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    <img src={att.dataUrl} alt={att.name} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length < 3 && (
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer text-[12px] text-slate-500 hover:text-blue-600 w-full justify-center">
                {uploadingFiles ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploadingFiles ? 'Yükleniyor...' : 'Fotoğraf Ekle'}
              </button>
            )}
          </div>

          {/* Submit */}
          <button onClick={submitTicket} disabled={submittingTicket || !ticketForm.title.trim() || !ticketForm.description.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submittingTicket ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor...</> : <><Ticket size={14} /> Destek Talebi Gönder</>}
          </button>
        </div>
      )}
    </div>
  )

  const renderMyTickets = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="p-3 flex items-center justify-between border-b border-slate-200 bg-white flex-shrink-0">
        <p className="text-[13px] font-bold text-slate-900">Destek Taleplerim</p>
        <button onClick={openNewTicket}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[11px] font-bold hover:brightness-110 transition-all cursor-pointer">
          <Plus size={11} /> Yeni Talep
        </button>
      </div>

      {loadingTickets ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-6">
          <Ticket size={28} className="text-slate-300" />
          <p className="text-[13px] font-semibold text-slate-500">Henüz destek talebiniz yok</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">AI destekle çözülemeyen sorunlar için ticket oluşturabilirsiniz.</p>
          <button onClick={openNewTicket} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[12px] font-bold cursor-pointer hover:brightness-110">
            <Plus size={13} /> Talep Oluştur
          </button>
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-2">
          {tickets.map(ticket => {
            const st = STATUS_LABELS[ticket.status] || STATUS_LABELS.open
            const isExpanded = expandedTicket === ticket.id
            return (
              <div key={ticket.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <button onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                  className="w-full text-left p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] text-slate-400 font-mono">#{ticket.ticket_number}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                        {ticket.admin_reply && <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">Yanıt Var</span>}
                      </div>
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{ticket.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-1 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-3 bg-slate-50">
                    {/* Category + priority */}
                    <div className="flex gap-2 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {CATEGORIES.find(c => c.value === ticket.category)?.emoji} {CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                        {ticket.priority === 'urgent' ? '🔴 Acil' : ticket.priority === 'high' ? '🟠 Yüksek' : ticket.priority === 'low' ? '⚪ Düşük' : '🔵 Normal'}
                      </span>
                    </div>

                    {/* Admin reply */}
                    {ticket.admin_reply && (
                      <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                            <Zap size={9} className="text-white fill-white" />
                          </div>
                          <span className="text-[11px] font-bold text-blue-800">Sovlo Destek</span>
                          {ticket.admin_replied_at && (
                            <span className="text-[10px] text-blue-400">{new Date(ticket.admin_replied_at).toLocaleDateString('tr-TR')}</span>
                          )}
                        </div>
                        <p className="text-[12px] text-blue-900 leading-relaxed whitespace-pre-wrap">{ticket.admin_reply}</p>
                      </div>
                    )}

                    {!ticket.admin_reply && (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-50 border border-amber-100">
                        <RefreshCw size={11} className="text-amber-500 animate-spin" />
                        <p className="text-[11px] text-amber-700">Talebiniz inceleniyor, en kısa sürede yanıt verilecek.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Main Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes dsc-bounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes dsc-slide { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:none} }
      `}</style>

      <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl shadow-slate-900/15"
        style={{ width: 420, animation: 'dsc-slide 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

        {renderHeader()}

        {view === 'chat' && renderChat()}
        {view === 'new-ticket' && renderNewTicket()}
        {view === 'my-tickets' && renderMyTickets()}
      </div>
    </>
  )
}
