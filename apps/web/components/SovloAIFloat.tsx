'use client'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import Link from 'next/link'

interface Message {
  role: 'assistant' | 'user'
  text: string
  quickReplies?: string[]
  leadResults?: { source: string; sourceLabel: string; city: string; added: number; found: number }[]
  toolSuggestion?: { label: string; path: string }
}

const SOURCES: Record<string, string> = {
  google_maps: 'Google Maps', instagram: 'Instagram',
  facebook: 'Facebook', tiktok: 'TikTok',
}

export default function SovloAIFloat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [unread, setUnread] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Profil yükle + karşılama mesajı
  useEffect(() => {
    api.get('/api/settings/business-profile')
      .then(d => setProfile(d?.profile || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (messages.length) return
    const sector = profile?.company?.sector || profile?.target?.sectors?.[0]
    const city = profile?.company?.city
    const name = profile?.company?.name
    const greeting = name
      ? `Merhaba ${name}! Ben Sovlo Asistanı. Hangi sektörde, hangi şehirde yeni müşteri arayalım?`
      : `Merhaba! Ben Sovlo Asistanı. Doğal dille anlat — örn. "İstanbul'da mobilya üreticileri bul".`
    const quickReplies = sector
      ? [`${sector} sektöründe ${city || 'İstanbul'}'da müşteri bul`, `${sector} için rakip analizi`, 'Bana uygun araç öner']
      : ['Mobilya üreticileri bul', 'İstanbul\'da restoranlar', 'Bana bir araç öner']
    setMessages([{ role: 'assistant', text: greeting, quickReplies }])
  }, [profile])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (!open && messages.length > 1) setUnread(true)
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    const next: Message[] = [...messages, { role: 'user', text }]
    setMessages(next)
    setLoading(true)
    try {
      const history = next.filter(m => m.text).map(m => ({ role: m.role, content: m.text }))
      const data = await api.post('/api/ai/discover', { messages: history, businessProfile: profile })

      if (data.action === 'search' && data.searchParams) {
        const { sector, city, keyword, sources, limit } = data.searchParams
        const kw = keyword || sector || ''
        const srcs: string[] = sources?.length ? sources : ['google_maps']
        const cities: string[] = city ? [city] : ['Istanbul']
        const lmt = limit || 15
        const results: Message['leadResults'] = []
        for (const src of srcs) {
          for (const c of cities) {
            const r = await api.post('/api/sources/scrape', { source: src, keyword: kw, city: c, limit: lmt })
            results.push({ source: src, sourceLabel: SOURCES[src] || src, city: c, added: r.added || 0, found: r.found || 0 })
          }
        }
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, leadResults: results }])
      } else if (data.action === 'suggest_tool' && data.suggestedTool) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, toolSuggestion: data.suggestedTool }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Üzgünüm, bir sorun oluştu. Tekrar dene.' }])
    } finally { setLoading(false) }
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }

  return (
    <>
      {/* ── Floating Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 20, zIndex: 300,
          width: 360, maxWidth: 'calc(100vw - 32px)',
          height: 520, maxHeight: 'calc(100vh - 120px)',
          background: '#ffffff',
          borderRadius: 18,
          boxShadow: '0 8px 40px rgba(15,23,42,0.18), 0 2px 10px rgba(15,23,42,0.08)',
          border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'floatUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
              }}>
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, margin: 0 }}>Sovlo Asistanı</p>
                <p style={{ color: '#94a3b8', fontSize: 10, margin: 0 }}>AI • Hep burada</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link href="/lead-machine"
                title="Tam sayfada aç"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8', textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
              >
                <ExternalLink size={12} />
              </Link>
              <button onClick={() => setOpen(false)} style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#94a3b8',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
                {/* Bubble */}
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 12px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  fontSize: 12.5, lineHeight: 1.5,
                  boxShadow: m.role === 'user' ? '0 2px 8px rgba(37,99,235,0.2)' : 'none',
                }}>
                  {m.text}
                </div>

                {/* Lead Results */}
                {m.leadResults && m.leadResults.length > 0 && (
                  <div style={{ maxWidth: '90%', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 10, padding: '8px 10px', fontSize: 11 }}>
                    {m.leadResults.map((r, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: j < m.leadResults!.length - 1 ? '1px solid #d1fae5' : 'none' }}>
                        <span style={{ color: '#065f46', fontWeight: 600 }}>{r.sourceLabel} — {r.city}</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>+{r.added} lead</span>
                      </div>
                    ))}
                    <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#059669', fontSize: 10, marginTop: 5, textDecoration: 'none', fontWeight: 600 }}>
                      Leadleri Gör <ChevronRight size={10} />
                    </Link>
                  </div>
                )}

                {/* Tool Suggestion */}
                {m.toolSuggestion && (
                  <Link href={m.toolSuggestion.path} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, textDecoration: 'none', fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>
                    {m.toolSuggestion.label} <ChevronRight size={10} />
                  </Link>
                )}

                {/* Quick Replies */}
                {m.quickReplies && m.role === 'assistant' && i === messages.length - 1 && !loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                    {m.quickReplies.map((qr, j) => (
                      <button key={j} onClick={() => send(qr)} style={{
                        padding: '6px 10px', borderRadius: 8,
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: '#374151', fontSize: 11, cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.12s', fontFamily: 'inherit',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.background = '#eff6ff'; (e.currentTarget as HTMLElement).style.color = '#1d4ed8' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#374151' }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: '#f1f5f9', borderRadius: '14px 14px 14px 4px', width: 'fit-content' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', animation: 'floatBounce 1s ease infinite', animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '6px 8px 6px 12px', transition: 'border-color 0.15s' }}
              onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'}
              onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Mesajınızı yazın..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: '#0f172a', fontFamily: 'inherit' }}
              />
              <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{
                width: 30, height: 30, borderRadius: 9, border: 'none',
                background: input.trim() && !loading ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#e2e8f0',
                color: input.trim() && !loading ? '#fff' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                {loading ? <RefreshCw size={13} style={{ animation: 'floatSpin 1s linear infinite' }} /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Sovlo Asistanı"
        style={{
          position: 'fixed', bottom: 24, right: 20, zIndex: 301,
          width: 52, height: 52, borderRadius: 16,
          background: open
            ? '#0f172a'
            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open
            ? '0 4px 16px rgba(15,23,42,0.25)'
            : '0 4px 20px rgba(16,185,129,0.4), 0 2px 8px rgba(16,185,129,0.2)',
          transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        {open
          ? <X size={20} color="#fff" />
          : <Sparkles size={21} color="#fff" />
        }
        {/* Unread badge */}
        {unread && !open && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 12, height: 12, borderRadius: '50%',
            background: '#ef4444',
            border: '2px solid #fff',
          }} />
        )}
      </button>

      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-5px); }
        }
        @keyframes floatSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
