'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import {
  LifeBuoy, Plus, Send, Loader2, MessageSquare,
  CheckCircle2, AlertCircle, Clock, Star,
  Zap, ChevronRight, X,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  title: string
  status: 'open' | 'resolved' | 'escalated'
  category?: string
  message_count: number
  satisfaction_rating?: number
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  quick_replies: string[]
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: Conversation['status']) {
  const map = {
    open:      { label: 'Açık',         cls: 'bg-emerald-100 text-emerald-700' },
    resolved:  { label: 'Çözüldü',      cls: 'bg-slate-100 text-slate-500' },
    escalated: { label: 'Aktarıldı',    cls: 'bg-amber-100 text-amber-700' },
  }
  const { label, cls } = map[status] || map.open
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'şimdi'
  if (m < 60) return `${m}d önce`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}s önce`
  return `${Math.floor(h / 24)}g önce`
}

function planLabel(planType: string) {
  const map: Record<string, string> = {
    starter: 'Starter', growth: 'Growth', pro: 'Pro', enterprise: 'Enterprise',
  }
  return map[planType] || planType
}

// ─── Typing dots ─────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MsgBubble({
  msg, onQuickReply,
}: {
  msg: Message
  onQuickReply: (t: string) => void
}) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-1">
            <Zap size={13} className="text-white fill-white" />
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {msg.content}
        </div>
      </div>
      <span className={`text-[11px] text-slate-400 ${isUser ? 'mr-2' : 'ml-10'}`}>{time}</span>
      {!isUser && msg.quick_replies && msg.quick_replies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-10 mt-1">
          {msg.quick_replies.map(qr => (
            <button
              key={qr}
              onClick={() => onQuickReply(qr)}
              className="px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 text-[12px] font-medium hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer"
            >
              {qr}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Rating modal ─────────────────────────────────────────────────────────────

function RatingModal({
  onRate, onClose,
}: {
  onRate: (r: number) => void
  onClose: () => void
}) {
  const [hover, setHover] = useState(0)
  const [selected, setSelected] = useState(0)

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-r-2xl p-6">
      <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
      <h3 className="text-[16px] font-bold text-slate-900 mb-1">Konuşma Çözüldü</h3>
      <p className="text-[13px] text-slate-500 mb-6 text-center">Bu destek deneyimini değerlendirin</p>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setSelected(n)}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <Star
              size={32}
              className={n <= (hover || selected) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-[13px] hover:bg-slate-50 cursor-pointer"
        >
          Atla
        </button>
        <button
          onClick={() => selected > 0 && onRate(selected)}
          disabled={selected === 0}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:brightness-110"
        >
          Gönder
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  // Load conversations
  useEffect(() => {
    if (!user) return
    api.get('/api/support/conversations')
      .then((d: any) => setConversations(d.conversations || []))
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [user])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return
    setLoadingMsgs(true)
    api.get(`/api/support/conversations/${activeConvId}/messages`)
      .then((d: any) => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [activeConvId])

  // Supabase realtime for new messages
  useEffect(() => {
    if (!activeConvId || !user) return

    const channel = supabase
      .channel(`support-msg-${activeConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload: any) => {
          const incoming = payload.new as Message
          setMessages(prev => {
            // avoid duplicates
            if (prev.find(m => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvId, user])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const createConversation = useCallback(async () => {
    try {
      const d: any = await api.post('/api/support/conversations', {
        title: 'Yeni Destek Talebi',
      })
      const conv = d.conversation as Conversation
      setConversations(prev => [conv, ...prev])
      setActiveConvId(conv.id)
      setMessages([])
    } catch {}
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending || !activeConvId || !user) return

    setInput('')
    setSending(true)

    // Optimistically add user message
    const optimisticId = `opt-${Date.now()}`
    const optimisticMsg: Message = {
      id: optimisticId,
      role: 'user',
      content: trimmed,
      quick_replies: [],
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const d: any = await api.post(`/api/support/conversations/${activeConvId}/messages`, {
        content: trimmed,
        pageContext: 'Dashboard — Destek Sayfası',
        userProfile: {
          name: user.name,
          planType: user.planType,
          company: user.company,
          sector: user.sector,
        },
      })

      // Replace optimistic with real, add AI response
      setMessages(prev => {
        const without = prev.filter(m => m.id !== optimisticId)
        const msgs: Message[] = [...without]
        if (d.userMessage) msgs.push(d.userMessage)
        if (d.aiMessage) msgs.push(d.aiMessage)
        return msgs
      })

      // Update conversation in list
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConvId
            ? { ...c, updated_at: new Date().toISOString(), message_count: c.message_count + 2 }
            : c
        )
      )
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [sending, activeConvId, user])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const resolveConversation = useCallback(async () => {
    if (!activeConvId) return
    try {
      await api.patch(`/api/support/conversations/${activeConvId}`, { status: 'resolved' })
      setConversations(prev =>
        prev.map(c => c.id === activeConvId ? { ...c, status: 'resolved' } : c)
      )
      setShowRating(true)
    } catch {}
  }, [activeConvId])

  const submitRating = useCallback(async (rating: number) => {
    if (!activeConvId) return
    try {
      await api.patch(`/api/support/conversations/${activeConvId}`, {
        status: 'resolved',
        satisfaction_rating: rating,
      })
      setConversations(prev =>
        prev.map(c => c.id === activeConvId ? { ...c, satisfaction_rating: rating } : c)
      )
    } catch {}
    setShowRating(false)
  }, [activeConvId])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div className="flex h-[calc(100vh-64px)] bg-slate-50">

        {/* ── Left: conversation list ───────────────────────────────────────── */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} className="text-blue-600" />
                <span className="text-[15px] font-bold text-slate-900">Destek</span>
              </div>
              <button
                onClick={createConversation}
                className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer"
                title="Yeni Konuşma"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* User context card */}
            {user && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[12px] font-semibold text-slate-700 truncate">{user.name || user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {planLabel(user.planType)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {user.creditsUsed}/{user.creditsTotal} kredi
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-[13px] text-slate-400">Henüz konuşma yok</p>
                <button
                  onClick={createConversation}
                  className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  İlk soruyu sor
                </button>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setShowRating(false) }}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                    activeConvId === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-slate-800 leading-tight truncate flex-1">
                      {conv.title}
                    </span>
                    {statusBadge(conv.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {relativeTime(conv.updated_at)}
                    </span>
                    {conv.satisfaction_rating && (
                      <span className="flex items-center gap-0.5 text-amber-400 text-[11px]">
                        <Star size={10} className="fill-amber-400" />
                        {conv.satisfaction_rating}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer help */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-400 text-center">
              E-posta: <a href="mailto:destek@sovlo.io" className="text-blue-600 hover:underline">destek@sovlo.io</a>
            </p>
            <p className="text-[11px] text-slate-400 text-center">Pzt–Cum 09:00–18:00</p>
          </div>
        </div>

        {/* ── Right: message thread ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {!activeConvId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <LifeBuoy size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-slate-900 mb-2">Nasıl yardımcı olabiliriz?</h2>
                <p className="text-[14px] text-slate-500 max-w-xs leading-relaxed">
                  Bir sorunuz mu var? Yeni bir konuşma başlatın, yapay zeka destekli destek ekibimiz anında yanıtlasın.
                </p>
              </div>
              <button
                onClick={createConversation}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[14px] font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                Yeni Konuşma Başlat
              </button>
              <div className="grid grid-cols-3 gap-3 mt-4 w-full max-w-sm">
                {[
                  { icon: Zap, label: 'Özellikler', text: 'Platform özelliklerini öğren' },
                  { icon: AlertCircle, label: 'Sorun', text: 'Teknik sorun bildir' },
                  { icon: CheckCircle2, label: 'Rehber', text: 'Kurulum yardımı al' },
                ].map(({ icon: Icon, label, text }) => (
                  <button
                    key={label}
                    onClick={async () => {
                      await createConversation()
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer text-center"
                  >
                    <Icon size={18} className="text-blue-600" />
                    <span className="text-[12px] font-semibold text-slate-700">{label}</span>
                    <span className="text-[11px] text-slate-400 leading-tight">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <Zap size={15} className="text-white fill-white" />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-slate-900 leading-tight">
                      {activeConv?.title || 'Destek Talebi'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activeConv && statusBadge(activeConv.status)}
                      <span className="text-[11px] text-slate-400">
                        {activeConv?.message_count || 0} mesaj
                      </span>
                    </div>
                  </div>
                </div>

                {activeConv?.status === 'open' && (
                  <button
                    onClick={resolveConversation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-[12px] font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    Çözüldü
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 bg-slate-50">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={22} className="animate-spin text-slate-300" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare size={24} className="text-slate-300 mb-2" />
                    <p className="text-[13px] text-slate-400">Sorunuzu yazın, size hemen yardımcı olalım.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MsgBubble key={msg.id} msg={msg} onQuickReply={t => sendMessage(t)} />
                  ))
                )}
                {sending && (
                  <div className="flex items-end gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                      <Zap size={13} className="text-white fill-white" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              {activeConv?.status !== 'resolved' && (
                <div className="bg-white border-t border-slate-200 px-4 py-3 flex-shrink-0">
                  {/* Escalation banner */}
                  {activeConv?.status === 'escalated' && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
                      <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                      <p className="text-[12px] text-amber-800">
                        Bu talep insan desteğine aktarıldı.{' '}
                        <a href="mailto:destek@sovlo.io" className="font-semibold underline">
                          destek@sovlo.io
                        </a>{' '}
                        adresinden de ulaşabilirsiniz.
                      </p>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Sorunuzu veya mesajınızı yazın... (Enter: gönder)"
                      rows={1}
                      disabled={sending}
                      className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition-colors max-h-32 overflow-y-auto leading-relaxed"
                      style={{ scrollbarWidth: 'none' }}
                      onInput={e => {
                        const el = e.currentTarget
                        el.style.height = 'auto'
                        el.style.height = Math.min(el.scrollHeight, 128) + 'px'
                      }}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || sending}
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                      aria-label="Gönder"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Rating overlay */}
              {showRating && (
                <RatingModal
                  onRate={submitRating}
                  onClose={() => setShowRating(false)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
