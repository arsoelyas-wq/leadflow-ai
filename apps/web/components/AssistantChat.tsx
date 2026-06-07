'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, Sparkles, ArrowRight, ExternalLink, ChevronRight } from 'lucide-react'

export interface AssistantLeadResult {
  source: string
  sourceLabel: string
  city: string
  added: number
  found: number
}

export interface AssistantToolSuggestion {
  label: string
  path: string
}

export interface AssistantMessage {
  role: 'assistant' | 'user'
  text: string
  quickReplies?: string[]
  leadResults?: AssistantLeadResult[]
  toolSuggestion?: AssistantToolSuggestion
}

interface AssistantChatProps {
  messages: AssistantMessage[]
  loading?: boolean
  onSend: (text: string) => void
  placeholder?: string
}

function LoadingDots() {
  return (
    <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 w-fit">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

function LeadResultCard({ results }: { results: AssistantLeadResult[] }) {
  const totalAdded = results.reduce((a, r) => a + r.added, 0)
  const totalFound = results.reduce((a, r) => a + r.found, 0)
  return (
    <div className="bg-slate-800/70 border border-emerald-500/20 rounded-xl p-3.5 mt-2 max-w-[85%]">
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="text-center p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-xl font-bold text-emerald-400">{totalAdded}</p>
          <p className="text-slate-400 text-[11px]">Lead Eklendi</p>
        </div>
        <div className="text-center p-2.5 bg-slate-900 rounded-lg">
          <p className="text-xl font-bold text-slate-300">{totalFound}</p>
          <p className="text-slate-400 text-[11px]">Toplam Bulundu</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-900 rounded-lg text-xs">
            <span className="text-slate-300">{r.sourceLabel} / {r.city}</span>
            <div className="flex gap-3">
              <span className="text-emerald-400">{r.added} eklendi</span>
              <span className="text-slate-500">{r.found} bulundu</span>
            </div>
          </div>
        ))}
      </div>
      {totalAdded > 0 && (
        <Link href="/leads"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition mt-3">
          <ExternalLink size={13} /> Lead'leri Görüntüle ({totalAdded} yeni) <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}

function ToolSuggestionCard({ tool }: { tool: AssistantToolSuggestion }) {
  return (
    <Link href={tool.path}
      className="group flex items-center justify-between gap-3 mt-2 px-4 py-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 rounded-xl transition max-w-[85%]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{tool.label}</p>
          <p className="text-slate-500 text-[11px]">Aç ve devam et</p>
        </div>
      </div>
      <ChevronRight size={15} className="text-slate-600 group-hover:text-emerald-400 transition flex-shrink-0" />
    </Link>
  )
}

export default function AssistantChat({ messages, loading, onSend, placeholder }: AssistantChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    onSend(text)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mesaj akışı */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                {msg.text}
              </div>
            ) : (
              <>
                <div className="max-w-[85%] bg-slate-800 text-slate-200 border border-slate-700/60 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
                {msg.leadResults && msg.leadResults.length > 0 && (
                  <LeadResultCard results={msg.leadResults} />
                )}
                {msg.toolSuggestion && (
                  <ToolSuggestionCard tool={msg.toolSuggestion} />
                )}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5 max-w-[85%]">
                    {msg.quickReplies.map(opt => (
                      <button
                        key={opt}
                        onClick={() => onSend(opt)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-slate-800/80 hover:bg-emerald-600/15 border border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white rounded-full text-xs transition disabled:opacity-40"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {loading && <LoadingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-700/50 p-3.5">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-emerald-500/50 transition">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={placeholder || 'Örn: "İstanbul\'da mobilya üreticileri bul, Instagram\'dan"'}
            disabled={loading}
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 rounded-lg transition flex-shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
