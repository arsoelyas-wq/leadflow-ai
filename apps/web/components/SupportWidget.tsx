'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, MessageCircle, Zap, LifeBuoy, Loader2, ChevronDown } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  quickReplies?: string[]
  timestamp: Date
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Merhaba! Sovlo AI destek hattına hoş geldiniz. Size nasıl yardımcı olabilirim?',
  quickReplies: [
    'Nasıl çalışıyor?',
    'Fiyatlar nedir?',
    'WhatsApp kampanya kurulumu',
  ],
  timestamp: new Date(),
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400"
          style={{
            animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

interface BubbleProps {
  msg: Message
  onQuickReply: (text: string) => void
}

function Bubble({ msg, onQuickReply }: BubbleProps) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Avatar + bubble */}
      <div className={`flex items-end gap-2 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* AI avatar */}
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-1">
            <Zap size={12} className="text-white fill-white" />
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {msg.content}
        </div>
      </div>

      {/* Timestamp */}
      <span className={`text-[10px] text-slate-400 ${isUser ? 'mr-2' : 'ml-9'}`}>
        {formatTime(msg.timestamp)}
      </span>

      {/* Quick replies */}
      {!isUser && msg.quickReplies && msg.quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-9 mt-1">
          {msg.quickReplies.map(qr => (
            <button
              key={qr}
              onClick={() => onQuickReply(qr)}
              className="px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 text-[12px] font-medium hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer"
            >
              {qr}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(1)
  const [pageContext] = useState(() => {
    if (typeof window === 'undefined') return ''
    return document.title || window.location.pathname
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build history for context
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${API_URL}/api/support/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.length > 0 ? history : [{ role: 'user', content: trimmed }],
          pageContext,
        }),
      })

      if (!res.ok) throw new Error('Servis hatası')

      const data = await res.json()

      const aiMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.message || 'Bir hata oluştu, lütfen tekrar deneyin.',
        quickReplies: data.quickReplies || [],
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Üzgünüm, şu an bağlanamıyorum. Lütfen destek@sovlo.io adresinden bize yazın.',
          quickReplies: [],
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, pageContext])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes widgetSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes widgetPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
        }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Destek"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        style={{ animation: 'widgetPulse 3s ease-in-out infinite' }}
      >
        {open ? (
          <ChevronDown size={22} strokeWidth={2.5} />
        ) : (
          <>
            <LifeBuoy size={22} strokeWidth={2} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/20 border border-slate-200/60"
          style={{ animation: 'widgetSlideUp 0.25s cubic-bezier(0.16,1,0.3,1)', height: 'min(540px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[14px] font-bold leading-tight">Sovlo AI Destek</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-blue-100 text-[11px]">Ort. yanıt: &lt;30 saniye</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 flex flex-col gap-4">
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} onQuickReply={(t) => sendMessage(t)} />
            ))}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Zap size={12} className="text-white fill-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="bg-white border-t border-slate-200 px-3 py-3 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesajınızı yazın... (Enter ile gönder)"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition-colors max-h-28 overflow-y-auto leading-relaxed"
                style={{ scrollbarWidth: 'none' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 112) + 'px'
                }}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                aria-label="Gönder"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} strokeWidth={2.5} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Sovlo AI · <a href="mailto:destek@sovlo.io" className="hover:text-slate-600">destek@sovlo.io</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
