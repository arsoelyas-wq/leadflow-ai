'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Send, RefreshCw, MessageSquare, Search, X, Phone, Mail, MapPin,
  TrendingUp, MessageCircle, CheckCheck, Check, Smile, Paperclip,
  ChevronDown, ExternalLink, Globe, Star, Clock,
} from 'lucide-react'
import Link from 'next/link'

const CHANNEL_CFG: Record<string, { Icon: any; label: string; color: string; bg: string }> = {
  whatsapp:  { Icon: MessageCircle, label: 'WhatsApp',  color: 'text-emerald-600', bg: 'bg-emerald-50'  },
  email:     { Icon: Mail,          label: 'Email',     color: 'text-blue-600',    bg: 'bg-blue-50'     },
  sms:       { Icon: Phone,         label: 'SMS',       color: 'text-purple-600',  bg: 'bg-purple-50'   },
  instagram: { Icon: Globe,         label: 'Instagram', color: 'text-pink-600',    bg: 'bg-pink-50'     },
  facebook:  { Icon: Globe,         label: 'Facebook',  color: 'text-blue-700',    bg: 'bg-blue-50'     },
}

const AVATAR_COLORS = ['#0ea5e9', '#8b5cf6', '#059669', '#d97706', '#e11d48', '#0891b2', '#be185d', '#4f46e5']

const QUICK_REPLIES = [
  'Teşekkür ederiz, en kısa sürede dönüyoruz.',
  'Kataloğumuzu gönderdik, incelemenizi rica ederiz.',
  'Toplantı için uygun zamanınızı paylaşır mısınız?',
  'Teklifinizi hazırlıyoruz, yakında iletiyoruz.',
]

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  new:         { label: 'Yeni',        color: 'bg-blue-100 text-blue-700'    },
  contacted:   { label: 'İletişimde',  color: 'bg-amber-100 text-amber-700'  },
  qualified:   { label: 'Nitelikli',   color: 'bg-cyan-100 text-cyan-700'    },
  replied:     { label: 'Cevap Verdi', color: 'bg-emerald-100 text-emerald-700' },
  proposal:    { label: 'Teklif',      color: 'bg-purple-100 text-purple-700' },
  negotiation: { label: 'Pazarlık',    color: 'bg-orange-100 text-orange-700' },
  won:         { label: 'Kazanıldı',   color: 'bg-green-100 text-green-700'  },
  lost:        { label: 'Kaybedildi',  color: 'bg-red-100 text-red-700'      },
}

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + h * 31
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min}dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}g`
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Bugün'
  if (diff === 1) return 'Dün'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function UnifiedInboxPage() {
  const { t } = useI18n()
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [leadDetail, setLeadDetail] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [filterChannel, setFilterChannel] = useState('all')
  const [search, setSearch] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 3000)
  }

  const fetchConversations = async () => {
    try {
      const [c, s] = await Promise.allSettled([
        api.get('/api/inbox/conversations'),
        api.get('/api/inbox/stats'),
      ])
      if (c.status === 'fulfilled') setConversations(c.value.conversations || [])
      if (s.status === 'fulfilled') setStats(s.value)
    } catch {}
  }

  const load = async () => {
    setLoading(true)
    await fetchConversations()
    setLoading(false)
  }

  const loadMessages = async (lead: any) => {
    setSelectedLead(lead)
    setLeadDetail(null)
    try {
      const [msgs, detail] = await Promise.allSettled([
        api.get(`/api/inbox/messages?leadId=${lead.id}`),
        api.get(`/api/leads/${lead.id}`),
      ])
      if (msgs.status === 'fulfilled') setMessages(msgs.value.messages || [])
      if (detail.status === 'fulfilled') setLeadDetail(detail.value.lead || detail.value)
      await api.patch(`/api/inbox/read/${lead.id}`, {})
      fetchConversations()
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(() => fetchConversations(), 30000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!selectedLead) return
    const t = setInterval(async () => {
      try {
        const data = await api.get(`/api/inbox/messages?leadId=${selectedLead.id}`)
        setMessages(data.messages || [])
      } catch {}
    }, 15000)
    return () => clearInterval(t)
  }, [selectedLead])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!newMessage.trim() || !selectedLead) return
    setSending(true)
    try {
      await api.post('/api/inbox/send', { leadId: selectedLead.id, content: newMessage, channel })
      setNewMessage('')
      await loadMessages(selectedLead)
      showToast('success', 'Gönderildi')
    } catch (e: any) { showToast('error', e.message) }
    finally { setSending(false) }
  }

  const filtered = conversations.filter(conv => {
    const mc = filterChannel === 'all' || conv.lastMessage?.channel === filterChannel
    const ms = !search || conv.lead.company_name?.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: any[] }[]>((groups, m) => {
    const d = new Date(m.sent_at).toDateString()
    const last = groups[groups.length - 1]
    if (last && last.date === d) { last.msgs.push(m) }
    else { groups.push({ date: d, msgs: [m] }) }
    return groups
  }, [])

  return (
    <div className="flex h-[calc(100vh-90px)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

      {/* ═══ LEFT PANEL — Conversations ═══ */}
      <div className="w-[340px] border-r border-slate-200 flex flex-col shrink-0 bg-white">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-slate-800 font-bold text-base flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" />
              Mesajlar
            </h1>
            <div className="flex items-center gap-2">
              {stats?.unread > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                  {stats.unread}
                </span>
              )}
              <button onClick={load} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition placeholder-slate-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Channel tabs */}
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'Tümü', Icon: null },
              { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
              { key: 'email', label: 'Email', Icon: Mail },
              { key: 'sms', label: 'SMS', Icon: Phone },
            ].map(ch => (
              <button key={ch.key} onClick={() => setFilterChannel(ch.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition font-medium ${
                  filterChannel === ch.key
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}>
                {ch.Icon && <ch.Icon size={11} />}
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8">
              <MessageSquare size={36} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Konuşma yok</p>
            </div>
          ) : filtered.map(conv => {
            const ch = CHANNEL_CFG[conv.lastMessage?.channel]
            const ChIcon = ch?.Icon
            const isSelected = selectedLead?.id === conv.lead.id
            const hasUnread = conv.unreadCount > 0
            return (
              <div key={conv.lead.id} onClick={() => loadMessages(conv.lead)}
                className={`px-4 py-3 border-b border-slate-100/80 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50' : hasUnread ? 'bg-emerald-50/30 hover:bg-slate-50' : 'hover:bg-slate-50'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: avatarColor(conv.lead.company_name || '') }}>
                    {initials(conv.lead.company_name || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm truncate ${hasUnread ? 'text-slate-900 font-bold' : 'text-slate-800 font-semibold'}`}>
                        {conv.lead.company_name}
                      </p>
                      <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        {conv.lastMessage?.sent_at ? timeAgo(conv.lastMessage.sent_at) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate pr-2 ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                        {conv.lastMessage?.direction === 'out' && (
                          <CheckCheck size={12} className="inline mr-1 text-blue-500" />
                        )}
                        {conv.lastMessage?.content || 'Henüz mesaj yok'}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ChIcon && <ChIcon size={11} className={ch.color} />}
                        {hasUnread && (
                          <span className="bg-emerald-500 text-white text-[9px] font-bold w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ MIDDLE PANEL — Chat ═══ */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2]">

          {/* Chat header */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
              style={{ backgroundColor: avatarColor(selectedLead.company_name || '') }}>
              {initials(selectedLead.company_name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-semibold text-sm">{selectedLead.company_name}</p>
              <p className="text-slate-500 text-xs">{selectedLead.phone || selectedLead.email || '—'}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedLead.phone && (
                <a href={`tel:${selectedLead.phone}`}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                  <Phone size={16} />
                </a>
              )}
              <Link href={`/leads/${selectedLead.id}`}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <ExternalLink size={16} />
              </Link>
              <button onClick={() => loadMessages(selectedLead)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c8c0b4\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white/80 rounded-2xl p-8 text-center shadow-sm backdrop-blur-sm">
                  <MessageSquare size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">Henüz mesaj yok</p>
                  <p className="text-slate-400 text-xs mt-1">İlk mesajınızı aşağıdan gönderin</p>
                </div>
              </div>
            ) : (
              <>
                {groupedMessages.map((group, gi) => (
                  <div key={gi}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center my-3">
                      <span className="bg-white/90 text-slate-500 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm backdrop-blur-sm">
                        {dateLabel(group.msgs[0].sent_at)}
                      </span>
                    </div>

                    {/* Messages */}
                    {group.msgs.map(m => {
                      const isOut = m.direction === 'out'
                      const ch = CHANNEL_CFG[m.channel]
                      const ChIcon = ch?.Icon
                      return (
                        <div key={m.id} className={`flex mb-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <div className={`relative max-w-[65%] lg:max-w-[50%] px-3 py-2 rounded-xl shadow-sm ${
                            isOut
                              ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-sm'
                              : 'bg-white text-slate-800 rounded-tl-sm'
                          }`}>
                            {/* Channel indicator for incoming */}
                            {!isOut && ChIcon && (
                              <div className="flex items-center gap-1 mb-1">
                                <ChIcon size={10} className={ch.color} />
                                <span className={`text-[10px] font-medium ${ch.color}`}>{ch.label}</span>
                              </div>
                            )}
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                              <span className="text-[10px] text-slate-500">
                                {new Date(m.sent_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOut && <CheckCheck size={14} className="text-blue-500" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Toast */}
          {msg && (
            <div className={`mx-4 mb-1 px-3 py-2 rounded-lg text-xs font-medium ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>{msg.text}</div>
          )}

          {/* Quick replies */}
          {showQuickReplies && (
            <div className="mx-4 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 animate-[bounceIn_0.2s_ease-out]">
              {QUICK_REPLIES.map(qr => (
                <button key={qr} onClick={() => { setNewMessage(qr); setShowQuickReplies(false); inputRef.current?.focus() }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition truncate">
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Message input */}
          <div className="px-3 py-2.5 bg-white border-t border-slate-200">
            {/* Channel selector */}
            <div className="flex items-center gap-1 mb-2">
              {Object.entries(CHANNEL_CFG).slice(0, 3).map(([ch, info]) => {
                const ChIcon = info.Icon
                return (
                  <button key={ch} onClick={() => setChannel(ch)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border transition font-medium ${
                      channel === ch ? `${info.bg} ${info.color} border-current/20` : 'border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}>
                    <ChIcon size={11} /> {info.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-end gap-2">
              <button onClick={() => setShowQuickReplies(s => !s)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition shrink-0 mb-0.5" title="Hızlı yanıt">
                <Smile size={20} />
              </button>
              <div className="flex-1 relative">
                <textarea ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Mesaj yazın..."
                  rows={1}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:bg-white resize-none transition placeholder-slate-400"
                  style={{ maxHeight: '120px' }} />
              </div>
              <button onClick={send} disabled={sending || !newMessage.trim()}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white rounded-xl transition shrink-0 mb-0.5 shadow-sm">
                {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#f0ebe3]">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold mb-1">Konuşma Seçin</p>
            <p className="text-slate-400 text-sm">Soldaki listeden bir konuşma seçin</p>
          </div>
        </div>
      )}

      {/* ═══ RIGHT PANEL — Lead Info ═══ */}
      {selectedLead && leadDetail && (
        <div className="w-[260px] border-l border-slate-200 flex flex-col shrink-0 bg-white overflow-y-auto">
          {/* Lead avatar & name */}
          <div className="p-5 text-center border-b border-slate-100">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold mb-3 shadow-md"
              style={{ backgroundColor: avatarColor(leadDetail.company_name || '') }}>
              {initials(leadDetail.company_name || '')}
            </div>
            <p className="text-slate-800 font-bold text-sm">{leadDetail.company_name}</p>
            {leadDetail.sector && <p className="text-slate-400 text-xs mt-0.5">{leadDetail.sector}</p>}
            {leadDetail.city && (
              <p className="text-slate-500 text-xs mt-1 flex items-center justify-center gap-1">
                <MapPin size={10} /> {leadDetail.city}
              </p>
            )}
          </div>

          {/* Pipeline status */}
          {leadDetail.status && STAGE_LABELS[leadDetail.status] && (
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Pipeline</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${STAGE_LABELS[leadDetail.status].color}`}>
                {STAGE_LABELS[leadDetail.status].label}
              </span>
            </div>
          )}

          {/* Score */}
          {leadDetail.score != null && (
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Lead Skoru</p>
                <span className={`text-sm font-bold ${
                  leadDetail.score >= 70 ? 'text-emerald-600' : leadDetail.score >= 50 ? 'text-blue-600' : 'text-slate-500'
                }`}>{leadDetail.score}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, leadDetail.score)}%`,
                    background: leadDetail.score >= 70 ? '#059669' : leadDetail.score >= 50 ? '#2563eb' : '#94a3b8',
                  }} />
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="px-4 py-3 space-y-2.5 border-b border-slate-100">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">İletişim</p>
            {leadDetail.phone && (
              <a href={`tel:${leadDetail.phone}`} className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-emerald-600 transition group">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition">
                  <Phone size={12} className="text-emerald-600" />
                </div>
                <span className="truncate">{leadDetail.phone}</span>
              </a>
            )}
            {leadDetail.email && (
              <a href={`mailto:${leadDetail.email}`} className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-blue-600 transition group">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
                  <Mail size={12} className="text-blue-600" />
                </div>
                <span className="truncate">{leadDetail.email}</span>
              </a>
            )}
            {leadDetail.website && (
              <a href={leadDetail.website.startsWith('http') ? leadDetail.website : `https://${leadDetail.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-blue-600 transition group">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-slate-100 transition">
                  <Globe size={12} className="text-slate-500" />
                </div>
                <span className="truncate">{leadDetail.website.replace(/^https?:\/\//, '').split('/')[0]}</span>
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 space-y-2">
            {leadDetail.phone && (
              <a href={`https://wa.me/${leadDetail.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition">
                <MessageCircle size={13} /> WhatsApp Aç
              </a>
            )}
            <Link href={`/leads/${leadDetail.id}`}
              className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition">
              <ExternalLink size={12} /> Lead Detay
            </Link>
            <Link href="/pipeline"
              className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition">
              <TrendingUp size={12} /> Pipeline
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
