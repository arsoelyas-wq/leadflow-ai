'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Send, RefreshCw, ChevronRight, ExternalLink, Sparkles } from 'lucide-react'
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

  useEffect(() => {
    api.get('/api/settings/business-profile').then(d => setProfile(d?.profile || null)).catch(() => {})
  }, [])

  useEffect(() => {
    if (messages.length) return
    const sector = profile?.company?.sector || profile?.target?.sectors?.[0]
    const city   = profile?.company?.city
    const name   = profile?.company?.name
    const greeting = name
      ? `Merhaba ${name}! Ben Sovlo Asistanı — işinizi büyütmek için buradayım. Hangi sektörde yeni müşteri arayalım?`
      : `Merhaba! Ben Sovlo Asistanı. Doğal dille anlat — örn. "İstanbul'da mobilya üreticileri bul, Google Maps'ten".`
    const quickReplies = sector
      ? [`${sector} sektöründe ${city || 'İstanbul'}'da müşteri bul`, `${sector} için rakip analizi`, 'Bana uygun araç öner']
      : ["Mobilya üreticileri bul", "İstanbul'da restoranlar", "Bana bir araç öner"]
    setMessages([{ role: 'assistant', text: greeting, quickReplies }])
  }, [profile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (!open && messages.length > 1) setUnread(true)
  }, [messages])

  useEffect(() => {
    if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 200) }
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
        const results: Message['leadResults'] = []
        for (const src of srcs) for (const c of cities) {
          const r = await api.post('/api/sources/scrape', { source: src, keyword: kw, city: c, limit: limit || 15 })
          results.push({ source: src, sourceLabel: SOURCES[src] || src, city: c, added: r.added || 0, found: r.found || 0 })
        }
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, leadResults: results }])
      } else if (data.action === 'suggest_tool' && data.suggestedTool) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, toolSuggestion: data.suggestedTool }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Bir sorun oluştu, lütfen tekrar dene.' }])
    } finally { setLoading(false) }
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }
  const canSend = input.trim().length > 0 && !loading

  return (
    <>
      {/* ────────────────────── CHAT PANEL ────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 88, right: 20, zIndex: 300,
        width: 384, maxWidth: 'calc(100vw - 24px)',
        height: 556, maxHeight: 'calc(100vh - 110px)',
        borderRadius: 22,
        background: '#ffffff',
        boxShadow: '0 24px 64px rgba(10,14,30,0.22), 0 4px 16px rgba(10,14,30,0.10)',
        border: '1px solid rgba(99,102,241,0.15)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transformOrigin: 'bottom right',
        transition: 'transform 0.28s cubic-bezier(0.34,1.38,0.64,1), opacity 0.22s ease',
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(24px)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(145deg, #0D1117 0%, #131929 55%, #1a1040 100%)',
          padding: '18px 18px 16px',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* decorative glow orbs */}
          <div style={{ position: 'absolute', top: -28, right: -28, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 40, width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* AI avatar orb */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #10B981 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 3px rgba(99,102,241,0.25), 0 0 20px rgba(99,102,241,0.3)',
                }}>
                  <Sparkles size={19} color="#fff" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />
                </div>
                {/* Online dot */}
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 11, height: 11, borderRadius: '50%',
                  background: '#10B981',
                  border: '2px solid #0D1117',
                  boxShadow: '0 0 6px rgba(16,185,129,0.6)',
                  animation: 'sovloOnlinePulse 2.4s ease infinite',
                }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>Sovlo Asistanı</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  Çevrimiçi · AI destekli
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link href="/lead-machine" title="Tam sayfada aç" onClick={() => setOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94A3B8', textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' }}
              >
                <ExternalLink size={12} />
              </Link>
              <button onClick={() => setOpen(false)} style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#94A3B8', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.color = '#FCA5A5'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Thin gradient divider ── */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)', flexShrink: 0 }} />

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 14px 8px',
          display: 'flex', flexDirection: 'column', gap: 12,
          scrollbarWidth: 'thin', scrollbarColor: '#E2E8F0 transparent',
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 7 }}>
              {/* Bubble */}
              <div style={{
                maxWidth: '80%',
                padding: m.role === 'user' ? '9px 14px' : '10px 13px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                  : '#F8FAFC',
                color: m.role === 'user' ? '#fff' : '#1E293B',
                fontSize: 13, lineHeight: 1.55, fontWeight: m.role === 'user' ? 500 : 400,
                boxShadow: m.role === 'user'
                  ? '0 4px 14px rgba(79,70,229,0.28)'
                  : '0 1px 4px rgba(15,23,42,0.06)',
                borderLeft: m.role === 'assistant' ? '2.5px solid #6366F1' : 'none',
                letterSpacing: '-0.01em',
              }}>
                {m.text}
              </div>

              {/* Lead Results */}
              {m.leadResults && m.leadResults.length > 0 && (
                <div style={{
                  maxWidth: '88%', width: '88%',
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                  border: '1px solid #A7F3D0',
                  borderRadius: 12, padding: '10px 12px',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
                }}>
                  <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bulunan Leadler</p>
                  {m.leadResults.map((r, j) => (
                    <div key={j} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: j < m.leadResults!.length - 1 ? '1px solid #D1FAE5' : 'none',
                    }}>
                      <span style={{ color: '#047857', fontSize: 11, fontWeight: 500 }}>{r.sourceLabel} · {r.city}</span>
                      <span style={{
                        background: '#10B981', color: '#fff',
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      }}>+{r.added}</span>
                    </div>
                  ))}
                  <Link href="/leads" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 8, color: '#059669', fontSize: 11, fontWeight: 600,
                    textDecoration: 'none',
                  }}>
                    Leadleri Gör <ChevronRight size={11} />
                  </Link>
                </div>
              )}

              {/* Tool Suggestion */}
              {m.toolSuggestion && (
                <Link href={m.toolSuggestion.path} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 13px',
                  background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                  border: '1px solid #C7D2FE',
                  borderRadius: 10, textDecoration: 'none',
                  fontSize: 12, color: '#3730A3', fontWeight: 600,
                  boxShadow: '0 1px 4px rgba(79,70,229,0.1)',
                  transition: 'all 0.15s',
                }}>
                  {m.toolSuggestion.label}
                  <ChevronRight size={12} />
                </Link>
              )}

              {/* Quick Replies */}
              {m.quickReplies && m.role === 'assistant' && i === messages.length - 1 && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '92%' }}>
                  {m.quickReplies.map((qr, j) => (
                    <button key={j} onClick={() => send(qr)} style={{
                      padding: '7px 12px', borderRadius: 9,
                      border: '1px solid #E2E8F0',
                      background: '#fff',
                      color: '#475569', fontSize: 11.5, cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                    }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.borderColor = '#6366F1'
                        el.style.background = '#EEF2FF'
                        el.style.color = '#4338CA'
                        el.style.transform = 'translateX(3px)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.borderColor = '#E2E8F0'
                        el.style.background = '#fff'
                        el.style.color = '#475569'
                        el.style.transform = 'translateX(0)'
                      }}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', background: '#F8FAFC', borderRadius: '4px 16px 16px 16px', width: 'fit-content', borderLeft: '2.5px solid #6366F1' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, background: '#6366F1', borderRadius: '50%', animation: 'sovloBounce 1.1s ease infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div style={{
          padding: '10px 12px 12px',
          background: '#fff',
          borderTop: '1px solid #F1F5F9',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#F8FAFC',
            borderRadius: 14,
            border: '1.5px solid #E2E8F0',
            padding: '7px 7px 7px 14px',
            transition: 'border-color 0.18s, box-shadow 0.18s',
          }}
            onFocusCapture={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#6366F1'
              el.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
            }}
            onBlurCapture={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#E2E8F0'
              el.style.boxShadow = 'none'
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Mesajınızı yazın..."
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent',
                fontSize: 13, color: '#1E293B', fontFamily: 'inherit',
              }}
            />
            <button onClick={() => send(input)} disabled={!canSend} style={{
              width: 34, height: 34, borderRadius: 10, border: 'none',
              background: canSend
                ? 'linear-gradient(135deg, #4F46E5, #6366F1)'
                : '#E2E8F0',
              color: canSend ? '#fff' : '#94A3B8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canSend ? 'pointer' : 'not-allowed',
              boxShadow: canSend ? '0 3px 10px rgba(79,70,229,0.3)' : 'none',
              transition: 'all 0.18s', flexShrink: 0,
            }}
              onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
              onMouseLeave={e => { if (canSend) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              {loading
                ? <RefreshCw size={14} style={{ animation: 'sovloSpin 1s linear infinite' }} />
                : <Send size={14} style={{ marginLeft: 1 }} />
              }
            </button>
          </div>
          <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 10, color: '#CBD5E1', letterSpacing: '0.01em' }}>
            Sovlo AI · Verileriniz güvende
          </p>
        </div>
      </div>

      {/* ────────────────────── FLOATING BUTTON ────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Sovlo Asistanı"
        style={{
          position: 'fixed', bottom: 24, right: 20, zIndex: 301,
          width: 56, height: 56,
          borderRadius: 18,
          background: open
            ? 'linear-gradient(135deg, #1E293B, #0D1117)'
            : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #7C3AED 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open
            ? '0 6px 20px rgba(15,23,42,0.35)'
            : '0 6px 24px rgba(79,70,229,0.45), 0 2px 8px rgba(79,70,229,0.2)',
          transition: 'all 0.24s cubic-bezier(0.34,1.4,0.64,1)',
          transform: open ? 'scale(0.9) rotate(0deg)' : 'scale(1) rotate(0deg)',
        }}
        onMouseEnter={e => {
          if (!open) {
            const el = e.currentTarget as HTMLElement
            el.style.transform = 'scale(1.1)'
            el.style.boxShadow = '0 8px 30px rgba(79,70,229,0.55), 0 2px 8px rgba(79,70,229,0.25)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            const el = e.currentTarget as HTMLElement
            el.style.transform = 'scale(1)'
            el.style.boxShadow = '0 6px 24px rgba(79,70,229,0.45), 0 2px 8px rgba(79,70,229,0.2)'
          }
        }}
      >
        {/* Pulse ring — only when closed */}
        {!open && (
          <div style={{
            position: 'absolute', inset: -6,
            borderRadius: 24,
            border: '1.5px solid rgba(99,102,241,0.35)',
            animation: 'sovloPulse 2.8s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ transition: 'transform 0.22s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          {open
            ? <X size={22} color="#fff" />
            : <Sparkles size={22} color="#fff" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' }} />
          }
        </div>

        {/* Unread badge */}
        {unread && !open && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 14, height: 14, borderRadius: '50%',
            background: '#EF4444',
            border: '2.5px solid #fff',
            boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
            animation: 'sovloUnread 0.4s cubic-bezier(0.34,1.6,0.64,1)',
          }} />
        )}
      </button>

      <style>{`
        @keyframes sovloOnlinePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50%       { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
        }
        @keyframes sovloPulse {
          0%   { transform: scale(1);    opacity: 0.7; }
          60%  { transform: scale(1.22); opacity: 0; }
          100% { transform: scale(1.22); opacity: 0; }
        }
        @keyframes sovloBounce {
          0%, 80%, 100% { transform: translateY(0);   opacity: 0.5; }
          40%           { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes sovloSpin  { to { transform: rotate(360deg); } }
        @keyframes sovloUnread {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }
      `}</style>
    </>
  )
}
