'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Inbox, Send, RefreshCw, MessageSquare, Search, X, Phone, Mail, MapPin, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const CHANNEL_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  whatsapp: { icon: '💬', label: 'WhatsApp', color: 'text-emerald-400' },
  email: { icon: '📧', label: 'Email', color: 'text-blue-400' },
  instagram: { icon: '📸', label: 'Instagram', color: 'text-pink-400' },
  facebook: { icon: '📘', label: 'Facebook', color: 'text-blue-500' },
  sms: { icon: '📱', label: 'SMS', color: 'text-purple-400' },
}

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d']

const QUICK_REPLIES = [
  'Teşekkür ederiz, en kısa sürede geri dönüyoruz.',
  'Kataloğumuzu gönderdik, incelemenizi rica ederiz.',
  'Toplantı için uygun zamanınızı paylaşır mısınız?',
  'Teklifinizi hazırlıyoruz, yakında iletiyoruz.',
  'Şu an müsait değilim, sizi sonra arayacağım.',
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + h * 31
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
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

const STAGE_LABELS: Record<string, string> = {
  new: 'Yeni Lead',
  contacted: 'İletişim Kuruldu',
  qualified: 'Nitelikli',
  demo: 'Demo',
  proposal: 'Teklif',
  negotiation: 'Müzakere',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
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
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
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

  // Konuşma listesini 30 saniyede bir sessizce güncelle (spinner olmadan)
  useEffect(() => {
    const t = setInterval(() => fetchConversations(), 30000)
    return () => clearInterval(t)
  }, [])

  // Açık konuşmanın mesajlarını 15 saniyede bir güncelle
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
      showMsg('success', 'Gönderildi!')
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const filtered = conversations.filter(conv => {
    const mc = filterChannel === 'all' || conv.lastMessage?.channel === filterChannel
    const ms = !search || conv.lead.company_name?.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* LEFT — Conversations */}
      <div className="w-72 border-r border-slate-700 flex flex-col flex-shrink-0">
        <div className="px-4 pt-4 pb-3 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-bold text-sm flex items-center gap-2">
              <Inbox size={15} className="text-blue-400" /> {t('messages.inbox','Gelen Kutusu')}
            </h1>
            {stats?.unread > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.unread}</span>
            )}
          </div>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('page.search','Ara...')}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-8 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {['all', 'whatsapp', 'email', 'sms'].map(ch => (
              <button key={ch} onClick={() => setFilterChannel(ch)}
                className={`px-2 py-1 text-xs rounded-lg border transition ${filterChannel === ch ? 'bg-slate-700 border-slate-500 text-white' : 'border-slate-700/50 text-slate-500 hover:text-white'}`}>
                {ch === 'all' ? 'Tümü' : CHANNEL_CONFIG[ch]?.icon + ' ' + CHANNEL_CONFIG[ch]?.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw size={18} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8">
              <MessageSquare size={32} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">Konuşma yok</p>
            </div>
          ) : filtered.map(conv => {
            const initials = (conv.lead.company_name || '?').substring(0, 2).toUpperCase()
            const color = avatarColor(conv.lead.company_name || '')
            const ch = CHANNEL_CONFIG[conv.lastMessage?.channel]
            const isSelected = selectedLead?.id === conv.lead.id
            return (
              <div key={conv.lead.id} onClick={() => loadMessages(conv.lead)}
                className={`px-3 py-3 border-b border-slate-800/50 cursor-pointer transition ${isSelected ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-slate-800/50'}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: color }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-white text-xs font-semibold truncate">{conv.lead.company_name}</p>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {conv.lastMessage?.sent_at && (
                          <span className="text-slate-500 text-xs">{timeAgo(conv.lastMessage.sent_at)}</span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-slate-400 text-xs truncate">
                        {ch && <span className="mr-1">{ch.icon}</span>}
                        {conv.lastMessage.direction === 'out' ? 'Sen: ' : ''}{conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MIDDLE — Messages */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: avatarColor(selectedLead.company_name || '') }}>
              {(selectedLead.company_name || '?').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{selectedLead.company_name}</p>
              <p className="text-slate-400 text-xs">{selectedLead.phone || selectedLead.email || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Canlı
              </span>
              <button onClick={() => loadMessages(selectedLead)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare size={40} className="text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Henüz mesaj yok</p>
              </div>
            ) : messages.map(m => {
              const ch = CHANNEL_CONFIG[m.channel]
              const isOut = m.direction === 'out'
              return (
                <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm ${isOut ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-700 text-white rounded-bl-md'}`}>
                    {ch && <span className="text-xs opacity-60 block mb-1">{ch.icon} {ch.label}</span>}
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-50">
                        {new Date(m.sent_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOut && <span className="text-xs opacity-60">✓✓</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-700">
            {msg && (
              <div className={`mb-2 px-3 py-2 rounded-lg text-xs ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                {msg.text}
              </div>
            )}
            {/* Hızlı yanıtlar */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_REPLIES.map(qr => (
                <button key={qr} onClick={() => setNewMessage(qr)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500 transition whitespace-nowrap flex-shrink-0">
                  {qr.substring(0, 28)}…
                </button>
              ))}
            </div>
            <div className="flex gap-1 mb-2 flex-wrap">
              {Object.entries(CHANNEL_CONFIG).map(([ch, info]) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${channel === ch ? 'bg-slate-700 border-slate-500 text-white' : 'border-slate-700/50 text-slate-500 hover:text-slate-300'}`}>
                  {info.icon} {info.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Mesaj yaz... (Enter: Gönder, Shift+Enter: Satır)"
                rows={2}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none transition" />
              <button onClick={send} disabled={sending || !newMessage.trim()}
                className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition flex items-center">
                {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={48} className="text-slate-700 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Konuşma Seçin</p>
            <p className="text-slate-500 text-sm">Soldaki listeden bir konuşma seçin</p>
          </div>
        </div>
      )}

      {/* RIGHT — Lead Info */}
      {selectedLead && (
        <div className="w-60 border-l border-slate-700 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Lead Bilgisi</p>
          </div>
          {leadDetail ? (
            <div className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center text-white text-lg font-bold mb-2"
                  style={{ backgroundColor: avatarColor(leadDetail.company_name || '') }}>
                  {(leadDetail.company_name || '?').substring(0, 2).toUpperCase()}
                </div>
                <p className="text-white font-semibold text-sm">{leadDetail.company_name}</p>
                {leadDetail.city && <p className="text-slate-400 text-xs mt-0.5">{leadDetail.city}</p>}
              </div>

              {leadDetail.status && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-1">Pipeline Aşaması</p>
                  <p className="text-white text-sm font-medium">{STAGE_LABELS[leadDetail.status] || leadDetail.status}</p>
                </div>
              )}

              {leadDetail.score != null && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-slate-500 text-xs">Lead Puanı</p>
                    <span className="text-white text-sm font-bold">{leadDetail.score}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, leadDetail.score)}%` }} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {leadDetail.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Phone size={12} className="text-slate-500 flex-shrink-0" />
                    <a href={`tel:${leadDetail.phone}`} className="hover:text-white truncate">{leadDetail.phone}</a>
                  </div>
                )}
                {leadDetail.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Mail size={12} className="text-slate-500 flex-shrink-0" />
                    <a href={`mailto:${leadDetail.email}`} className="hover:text-white truncate">{leadDetail.email}</a>
                  </div>
                )}
                {leadDetail.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MapPin size={12} className="text-slate-500 flex-shrink-0" />
                    <span>{leadDetail.city}</span>
                  </div>
                )}
              </div>

              <Link href="/pipeline"
                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs rounded-lg transition">
                <TrendingUp size={12} /> Pipeline&apos;da Gör
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <RefreshCw size={16} className="animate-spin text-slate-500" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
