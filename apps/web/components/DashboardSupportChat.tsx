'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LifeBuoy, X, Send, Loader2, Plus, Zap, ChevronDown, MessageSquare, CheckCircle2, Star } from 'lucide-react'
import { api } from '@/lib/api'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Conversation {
  id: string
  title: string
  status: 'open' | 'resolved' | 'escalated'
  message_count: number
  updated_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  quick_replies: string[]
  created_at: string
}

interface Props {
  user: {
    id: string
    name?: string
    planType: string
    company?: string
    sector?: string
  }
  onClose: () => void
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400"
          style={{ animation: `dsc-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

export default function DashboardSupportChat({ user, onClose }: Props) {
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  // Load conversations
  useEffect(() => {
    api.get('/api/support/conversations')
      .then((d: any) => {
        const convs = d.conversations || []
        setConversations(convs)
        // Auto-select most recent open conversation
        const open = convs.find((c: Conversation) => c.status === 'open')
        if (open) setActiveConvId(open.id)
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) return
    setLoadingMsgs(true)
    setMessages([])
    api.get(`/api/support/conversations/${activeConvId}/messages`)
      .then((d: any) => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [activeConvId])

  // Supabase realtime
  useEffect(() => {
    if (!activeConvId) return
    const channel = supabase
      .channel(`dsc-${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'support_messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload: any) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConvId])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const createConversation = useCallback(async () => {
    try {
      const d: any = await api.post('/api/support/conversations', { title: 'Yeni Destek Talebi' })
      const conv = d.conversation as Conversation
      setConversations(prev => [conv, ...prev])
      setActiveConvId(conv.id)
      setMessages([])
      setShowConvList(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {}
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending || !user) return

    // Auto-create conversation if none active
    if (!activeConvId) {
      await createConversation()
      return
    }

    setInput('')
    setSending(true)

    const optId = `opt-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optId, role: 'user', content: trimmed,
      quick_replies: [], created_at: new Date().toISOString(),
    }])

    try {
      const d: any = await api.post(`/api/support/conversations/${activeConvId}/messages`, {
        content: trimmed,
        pageContext: 'Dashboard',
        userProfile: {
          name: user.name,
          planType: user.planType,
          company: user.company,
          sector: user.sector,
        },
      })
      setMessages(prev => {
        const without = prev.filter(m => m.id !== optId)
        return [...without, ...(d.userMessage ? [d.userMessage] : []), ...(d.aiMessage ? [d.aiMessage] : [])]
      })
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
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
    try {
      await api.patch(`/api/support/conversations/${activeConvId}`, { status: 'resolved', satisfaction_rating: r })
    } catch {}
    setShowRating(false)
  }, [activeConvId])

  return (
    <>
      <style>{`
        @keyframes dsc-bounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes dsc-slide { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl shadow-slate-900/15"
        style={{ width: 400, animation: 'dsc-slide 0.22s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
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

          {/* Conversation switcher */}
          <div className="relative">
            <button
              onClick={() => setShowConvList(v => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
              title="Konuşmalar"
            >
              <MessageSquare size={12} className="text-white" />
              <ChevronDown size={10} className="text-white/70" style={{ transform: showConvList ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>

            {showConvList && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-700">Geçmiş Konuşmalar</span>
                  <button
                    onClick={createConversation}
                    className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:text-blue-800 cursor-pointer"
                  >
                    <Plus size={11} /> Yeni
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {loadingConvs ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
                  ) : conversations.length === 0 ? (
                    <p className="text-[12px] text-slate-400 text-center py-4">Henüz konuşma yok</p>
                  ) : conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => { setActiveConvId(conv.id); setShowConvList(false) }}
                      className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${activeConvId === conv.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-medium text-slate-800 truncate flex-1">{conv.title}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          conv.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                          conv.status === 'escalated' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
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

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X size={13} className="text-white" />
          </button>
        </div>

        {/* Active conversation info */}
        {activeConv && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[12px] text-slate-600 font-medium truncate flex-1 mr-2">{activeConv.title}</span>
            {activeConv.status === 'open' && (
              <button
                onClick={resolveConversation}
                className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold hover:text-emerald-900 cursor-pointer flex-shrink-0"
              >
                <CheckCircle2 size={11} /> Çözüldü
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 bg-slate-50">
          {!activeConvId ? (
            /* No conversation selected */
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <LifeBuoy size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-900 mb-1">Nasıl yardımcı olabiliriz?</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">Sorunuzu yazın, yapay zeka destekli ekibimiz anında yanıtlasın.</p>
              </div>
              <button
                onClick={createConversation}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold hover:brightness-110 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Plus size={14} /> Yeni Konuşma
              </button>
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                {['WhatsApp nasıl bağlarım?', 'Lead scraper nasıl çalışır?', 'Plan yükseltmek istiyorum', 'Teknik sorun bildirmek istiyorum'].map(q => (
                  <button
                    key={q}
                    onClick={async () => { await createConversation(); }}
                    className="text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer text-[11px] text-slate-700 leading-tight"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : loadingMsgs ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <MessageSquare size={20} className="text-slate-300" />
              <p className="text-[12px] text-slate-400">Sorunuzu aşağıya yazın</p>
            </div>
          ) : (
            messages.map(msg => {
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
                    <div className={`px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                  <span className={`text-[10px] text-slate-400 ${isUser ? 'mr-1' : 'ml-9'}`}>{time}</span>
                  {!isUser && msg.quick_replies?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-9 mt-0.5">
                      {msg.quick_replies.map(qr => (
                        <button key={qr} onClick={() => sendMessage(qr)}
                          className="px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 text-[11px] font-medium hover:bg-blue-50 transition-colors cursor-pointer">
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {sending && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Zap size={11} className="text-white fill-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}

          {/* Rating */}
          {showRating && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
              <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-slate-900 mb-3">Bu deneyimi değerlendirin</p>
              <div className="flex justify-center gap-2 mb-3">
                {[1,2,3,4,5].map(n => (
                  <button key={n}
                    onMouseEnter={() => setRatingHover(n)}
                    onMouseLeave={() => setRatingHover(0)}
                    onClick={() => setRatingSelected(n)}
                    className="cursor-pointer hover:scale-110 transition-transform"
                  >
                    <Star size={26} className={n <= (ratingHover || ratingSelected) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowRating(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] cursor-pointer hover:bg-slate-50">Atla</button>
                <button onClick={() => ratingSelected > 0 && submitRating(ratingSelected)} disabled={ratingSelected === 0}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[12px] font-semibold disabled:opacity-40 cursor-pointer">
                  Gönder
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-3 py-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın... (Enter: gönder)"
              rows={1}
              disabled={sending}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition-colors max-h-28 overflow-y-auto leading-relaxed"
              style={{ scrollbarWidth: 'none' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 112) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            <a href="mailto:destek@sovlo.io" className="hover:text-slate-600">destek@sovlo.io</a> · Pzt–Cum 09:00–18:00
          </p>
        </div>
      </div>
    </>
  )
}
