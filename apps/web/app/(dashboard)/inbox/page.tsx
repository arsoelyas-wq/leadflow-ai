'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  Send, RefreshCw, MessageSquare, Search, X, Phone, Mail, MapPin,
  TrendingUp, MessageCircle, CheckCheck, Check, Smile, Paperclip,
  ChevronDown, ChevronLeft, ExternalLink, Globe, Star, Clock, Copy, Reply,
  Image, FileText, Mic, Plus, Trash2, Pin, Sparkles, ChevronRight,
  ZapIcon, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH(): Record<string, string> { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const CHANNEL_CFG: Record<string, { Icon: any; label: string; color: string; bg: string; dot: string }> = {
  whatsapp:  { Icon: MessageCircle, label: 'WhatsApp',  color: 'text-emerald-600', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  email:     { Icon: Mail,          label: 'Email',     color: 'text-blue-600',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  sms:       { Icon: Phone,         label: 'SMS',       color: 'text-purple-600',  bg: 'bg-purple-50',   dot: 'bg-purple-500' },
  instagram: { Icon: Globe,         label: 'Instagram', color: 'text-pink-600',    bg: 'bg-pink-50',     dot: 'bg-pink-500' },
  facebook:  { Icon: Globe,         label: 'Facebook',  color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-600' },
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  new:         { label: 'Yeni',        color: 'bg-blue-100 text-blue-700'       },
  contacted:   { label: 'İletişimde',  color: 'bg-amber-100 text-amber-700'     },
  qualified:   { label: 'Nitelikli',   color: 'bg-cyan-100 text-cyan-700'       },
  replied:     { label: 'Cevap Verdi', color: 'bg-emerald-100 text-emerald-700' },
  proposal:    { label: 'Teklif',      color: 'bg-purple-100 text-purple-700'   },
  negotiation: { label: 'Pazarlık',    color: 'bg-orange-100 text-orange-700'   },
  won:         { label: 'Kazanıldı',   color: 'bg-green-100 text-green-700'     },
  lost:        { label: 'Kaybedildi',  color: 'bg-red-100 text-red-700'         },
}

const AVATAR_COLORS = ['#0ea5e9','#8b5cf6','#059669','#d97706','#e11d48','#0891b2','#be185d','#4f46e5']
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + h * 31
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(name: string) {
  return (name || '?').split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime(), min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'; if (min < 60) return `${min}dk`
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}sa`
  const d = Math.floor(hr / 24); if (d < 7) return `${d}g`
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}
function dateLabel(dateStr: string) {
  const d = new Date(dateStr), now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Bugün'; if (diff === 1) return 'Dün'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// URL ve telefon numarasını tıklanabilir link yapan güvenli fonksiyon
function linkifyText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|(?:\+90|0)[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="underline opacity-80 hover:opacity-100 break-all">{part}</a>
    }
    if (/^(\+90|0)\d/.test(part.replace(/[\s\-]/g, ''))) {
      return <a key={i} href={`tel:${part.replace(/\s/g, '')}`} className="underline opacity-80 hover:opacity-100">{part}</a>
    }
    return <span key={i}>{part}</span>
  })
}

// Ardışık mesajları gönderenine göre grupla (60 saniye kuralı)
function buildMessageGroups(messages: any[]) {
  const dateGroups: { date: string; senderGroups: { direction: string; channel: string; messages: any[] }[] }[] = []

  for (const m of messages) {
    const dateStr = new Date(m.sent_at).toDateString()
    let dg = dateGroups.find(g => g.date === dateStr)
    if (!dg) { dg = { date: dateStr, senderGroups: [] }; dateGroups.push(dg) }

    const last = dg.senderGroups[dg.senderGroups.length - 1]
    const prevMsg = last?.messages[last.messages.length - 1]
    const timeDiff = prevMsg ? new Date(m.sent_at).getTime() - new Date(prevMsg.sent_at).getTime() : Infinity
    const sameGroup = last && last.direction === m.direction && last.channel === m.channel && timeDiff < 60000

    if (sameGroup) { last.messages.push(m) }
    else { dg.senderGroups.push({ direction: m.direction, channel: m.channel, messages: [m] }) }
  }
  return dateGroups
}

// Medya önizleme bileşeni
function MediaPreview({ media, isOut }: { media: any; isOut: boolean }) {
  if (!media) return null
  if (media.type === 'image') {
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer" className="block mb-1">
        <img src={media.url} alt={media.name || 'Görsel'} className="max-w-[240px] max-h-[180px] rounded-lg object-cover cursor-zoom-in" />
      </a>
    )
  }
  if (media.type === 'video') {
    return (
      <video controls className="max-w-[240px] rounded-lg mb-1">
        <source src={media.url} type={media.mime_type} />
      </video>
    )
  }
  return (
    <a href={media.url} target="_blank" download={media.name} rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm ${isOut ? 'bg-emerald-600/30' : 'bg-slate-100'}`}>
      <FileText size={16} className="shrink-0" />
      <span className="truncate max-w-[180px]">{media.name || 'Dosya'}</span>
    </a>
  )
}

export default function UnifiedInboxPage() {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
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
  const [showQR, setShowQR] = useState(false)
  const [quickReplies, setQuickReplies] = useState<any[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [loadingAi, setLoadingAi] = useState(false)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showNewQR, setShowNewQR] = useState(false)
  const [newQRTitle, setNewQRTitle] = useState('')
  const [newQRContent, setNewQRContent] = useState('')
  const [newQRCat, setNewQRCat] = useState('genel')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text }); setTimeout(() => setToast(null), 3500)
  }, [])

  // ─── API helpers ────────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/inbox/conversations`, { headers: authH() })
      const d = await r.json()
      setConversations(d.conversations || [])
    } catch {}
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/inbox/stats`, { headers: authH() })
      const d = await r.json()
      setStats(d)
    } catch {}
  }, [])

  const loadQuickReplies = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/quick-replies`, { headers: authH() })
      const d = await r.json()
      setQuickReplies(d.templates || [])
    } catch {}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([fetchConversations(), fetchStats(), loadQuickReplies()])
    setLoading(false)
  }, [fetchConversations, fetchStats, loadQuickReplies])

  const loadMessages = useCallback(async (lead: any) => {
    setSelectedLead(lead)
    setLeadDetail(null)
    setMessages([])
    setAiSuggestions([])
    setReplyTo(null)
    try {
      const [msgsR, detailR] = await Promise.allSettled([
        fetch(`${API}/api/inbox/messages?leadId=${lead.id}`, { headers: authH() }),
        fetch(`${API}/api/leads/${lead.id}`, { headers: authH() }),
      ])
      if (msgsR.status === 'fulfilled') {
        const d = await msgsR.value.json(); setMessages(d.messages || [])
        // Son mesaj gelen ise AI öneri yükle
        const msgs = d.messages || []
        if (msgs.length > 0 && msgs[msgs.length - 1].direction === 'in') {
          fetchAiSuggestions(lead.id)
        }
      }
      if (detailR.status === 'fulfilled') {
        const d = await detailR.value.json(); setLeadDetail(d.lead || d)
      }
      fetch(`${API}/api/inbox/read/${lead.id}`, { method: 'PATCH', headers: authH() })
      fetchConversations()
    } catch {}
  }, [fetchConversations])

  const fetchAiSuggestions = useCallback(async (leadId: string) => {
    setLoadingAi(true)
    setShowAiSuggestions(true)
    try {
      const r = await fetch(`${API}/api/inbox/ai-suggest/${leadId}`, { headers: authH() })
      const d = await r.json()
      setAiSuggestions(d.suggestions || [])
    } catch {}
    setLoadingAi(false)
  }, [])

  // ─── Polling ─────────────────────────────────────────────────────────────────
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(fetchConversations, 30000)
    return () => clearInterval(t)
  }, [fetchConversations])
  useEffect(() => {
    if (!selectedLead) return
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/inbox/messages?leadId=${selectedLead.id}`, { headers: authH() })
        const d = await r.json()
        const newMsgs: any[] = d.messages || []
        setMessages(prev => {
          if (newMsgs.length > prev.length) {
            const last = newMsgs[newMsgs.length - 1]
            if (last.direction === 'in') fetchAiSuggestions(selectedLead.id)
            fetchConversations()
          }
          return newMsgs
        })
      } catch {}
    }, 10000)
    return () => clearInterval(t)
  }, [selectedLead, fetchConversations, fetchAiSuggestions])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ─── Gönder ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!newMessage.trim() || !selectedLead || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    setReplyTo(null)
    setShowAiSuggestions(false)
    try {
      const r = await fetch(`${API}/api/inbox/send`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadId: selectedLead.id, content, channel, replyToId: replyTo?.id }),
      })
      const d = await r.json()
      if (!d.success && d.error) showToast('error', d.error)
      else {
        setMessages(prev => [...prev, d.message])
        fetchConversations()
      }
    } catch (e: any) { showToast('error', e.message) }
    setSending(false)
  }, [newMessage, selectedLead, sending, channel, replyTo, fetchConversations, showToast])

  // ─── Medya gönder ─────────────────────────────────────────────────────────
  const sendMedia = useCallback(async (file: File) => {
    if (!selectedLead) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('leadId', selectedLead.id)
    fd.append('channel', channel)
    try {
      const r = await fetch(`${API}/api/inbox/send-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      const d = await r.json()
      if (d.success) { setMessages(prev => [...prev, d.message]); fetchConversations() }
      else showToast('error', d.error || 'Dosya gönderilemedi')
    } catch (e: any) { showToast('error', e.message) }
  }, [selectedLead, channel, fetchConversations, showToast])

  // ─── Hızlı yanıt şablonu kaydet ──────────────────────────────────────────
  const saveNewQR = useCallback(async () => {
    if (!newQRTitle.trim() || !newQRContent.trim()) return
    try {
      const r = await fetch(`${API}/api/quick-replies`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ title: newQRTitle, content: newQRContent, category: newQRCat }),
      })
      if (r.ok) {
        setNewQRTitle(''); setNewQRContent(''); setShowNewQR(false)
        loadQuickReplies()
        showToast('success', 'Şablon kaydedildi')
      }
    } catch {}
  }, [newQRTitle, newQRContent, newQRCat, loadQuickReplies, showToast])

  // Mobilde lead seçilince chat görünümüne geç
  useEffect(() => {
    if (isMobile && selectedLead) setMobileView('chat')
  }, [selectedLead, isMobile])

  // ─── Mesaj gruplama (useMemo — her render'da yeniden hesaplamaz) ───────────
  const messageGroups = useMemo(() => buildMessageGroups(messages), [messages])

  // ─── Filtrelenmiş konuşmalar ──────────────────────────────────────────────
  const filtered = useMemo(() => conversations.filter(conv => {
    const mc = filterChannel === 'all' || conv.lastMessage?.channel === filterChannel
    const ms = !search || conv.lead.company_name?.toLowerCase().includes(search.toLowerCase())
                       || conv.lead.phone?.includes(search)
    return mc && ms
  }), [conversations, filterChannel, search])

  const totalUnread = useMemo(() => conversations.reduce((s, c) => s + (c.unreadCount || 0), 0), [conversations])

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${
      isMobile ? 'flex flex-col' : 'flex h-[calc(100vh-90px)]'
    }`} style={isMobile && mobileView === 'chat' ? { height: 'calc(100dvh - 176px)' } : undefined}>

      {/* ═══ LEFT PANEL — Konuşma Listesi ═══ */}
      <div className={`border-r border-slate-200 bg-white ${
        isMobile
          ? mobileView === 'list' ? 'flex flex-col w-full' : 'hidden'
          : 'flex flex-col w-[340px] shrink-0'
      }`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-slate-800 font-bold text-base flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600"/>
              Mesaj Merkezi
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </h1>
            <button onClick={load} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Arama */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara (isim, telefon...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:bg-white transition"/>
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12}/></button>}
          </div>

          {/* Kanal filtresi */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button onClick={() => setFilterChannel('all')}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition font-medium shrink-0 ${filterChannel==='all' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}>
              Tümü
            </button>
            {Object.entries(CHANNEL_CFG).slice(0,3).map(([ch, cfg]) => (
              <button key={ch} onClick={() => setFilterChannel(ch)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border transition font-medium shrink-0 ${filterChannel===ch ? `${cfg.bg} ${cfg.color} border-current/20` : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}>
                <cfg.Icon size={10}/>{cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
            {[
              { label: 'Toplam', value: stats.total, color: 'text-slate-700' },
              { label: 'Okunmamış', value: stats.unread, color: 'text-red-500' },
              { label: 'Bugün', value: stats.today, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="py-2 text-center border-r border-slate-100 last:border-0">
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Konuşma listesi */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              {search ? 'Sonuç bulunamadı' : 'Henüz konuşma yok'}
            </div>
          ) : (
            filtered.map(conv => {
              const { lead, lastMessage, unreadCount } = conv
              const isSelected = selectedLead?.id === lead.id
              const ch = CHANNEL_CFG[lastMessage?.channel || 'whatsapp']
              return (
                <button key={lead.id} onClick={() => loadMessages(lead)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-slate-50 transition hover:bg-slate-50 ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: avatarColor(lead.company_name || '') }}>
                      {initials(lead.company_name || '')}
                    </div>
                    {ch && <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${ch.dot}`}/>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-semibold truncate ${unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {lead.company_name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {lastMessage ? timeAgo(lastMessage.sent_at) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate flex-1 ${unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        {lastMessage
                          ? (lastMessage.direction === 'out' ? '✓ ' : '') + (lastMessage.content || '📎 Medya')
                          : lead.phone || lead.email || '—'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="ml-1 shrink-0 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    {lead.status && STAGE_LABELS[lead.status] && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block ${STAGE_LABELS[lead.status].color}`}>
                        {STAGE_LABELS[lead.status].label}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ═══ MIDDLE PANEL — Mesaj Alanı ═══ */}
      {selectedLead ? (
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile && mobileView !== 'chat' ? 'hidden' : ''}`}>

          {/* Chat header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-2">
            {/* Geri butonu — sadece mobil */}
            {isMobile && (
              <button onClick={() => { setMobileView('list'); setSelectedLead(null) }}
                className="p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition shrink-0">
                <ChevronLeft size={20}/>
              </button>
            )}
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0"
              style={{ backgroundColor: avatarColor(selectedLead.company_name || '') }}>
              {initials(selectedLead.company_name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-semibold text-sm leading-tight truncate">{selectedLead.company_name}</p>
              <p className="text-slate-400 text-xs truncate">{selectedLead.phone || selectedLead.email || '—'}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {selectedLead.phone && (
                <a href={`tel:${selectedLead.phone}`} title="Ara"
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                  <Phone size={15}/>
                </a>
              )}
              <button onClick={() => fetchAiSuggestions(selectedLead.id)} title="AI Yanıt Öner"
                className={`p-2 rounded-lg transition ${showAiSuggestions ? 'text-violet-600 bg-violet-50' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'}`}>
                <Sparkles size={15}/>
              </button>
              <Link href={`/leads/${selectedLead.id}`} title="Lead Detayı"
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition hidden sm:flex">
                <ExternalLink size={15}/>
              </Link>
              <button onClick={() => loadMessages(selectedLead)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition hidden sm:flex">
                <RefreshCw size={13}/>
              </button>
            </div>
          </div>

          {/* Mesaj alanı */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v5h5v5H0v5h20v-5h-5v-5h5v-.5z'/%3E%3C/g%3E%3C/svg%3E")` }}>

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white/90 rounded-2xl p-8 text-center shadow-sm backdrop-blur-sm">
                  <MessageSquare size={36} className="text-slate-200 mx-auto mb-3"/>
                  <p className="text-slate-500 text-sm font-medium">Henüz mesaj yok</p>
                  <p className="text-slate-400 text-xs mt-1">İlk mesajı aşağıdan gönderin</p>
                </div>
              </div>
            ) : (
              <>
                {messageGroups.map((dg, di) => (
                  <div key={di}>
                    {/* Tarih ayırıcı */}
                    <div className="flex items-center justify-center my-4">
                      <span className="bg-white/90 text-slate-500 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                        {dateLabel(dg.senderGroups[0]?.messages[0]?.sent_at || '')}
                      </span>
                    </div>

                    {/* Gönderen grupları */}
                    {dg.senderGroups.map((sg, si) => {
                      const isOut = sg.direction === 'out'
                      const ch = CHANNEL_CFG[sg.channel]
                      return (
                        <div key={si} className={`flex mb-3 gap-2 ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar (sadece gelen mesajlar için) */}
                          {!isOut && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-auto mb-1 shadow-sm"
                              style={{ backgroundColor: avatarColor(selectedLead.company_name || '') }}>
                              {initials(selectedLead.company_name || '')}
                            </div>
                          )}

                          {/* Balon grubu */}
                          <div className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} gap-0.5`}
                            style={{ maxWidth: 'min(72%, 420px)' }}>

                            {/* Kanal badge (sadece ilk mesajda) */}
                            {!isOut && ch && si === 0 && (
                              <div className={`flex items-center gap-1 mb-0.5 px-1.5 py-0.5 rounded-md ${ch.bg}`}>
                                <ch.Icon size={9} className={ch.color}/>
                                <span className={`text-[9px] font-semibold ${ch.color}`}>{ch.label}</span>
                              </div>
                            )}

                            {sg.messages.map((m: any, mi: number) => {
                              const isFirst = mi === 0
                              const isLast  = mi === sg.messages.length - 1
                              const hovered = hoveredMsg === m.id

                              const borderRadius = isOut
                                ? `${isFirst ? '14px' : '6px'} 2px ${isLast ? '14px' : '6px'} 14px`
                                : `2px ${isFirst ? '14px' : '6px'} 14px ${isLast ? '14px' : '6px'}`

                              return (
                                <div key={m.id} className="relative group"
                                  onMouseEnter={() => setHoveredMsg(m.id)}
                                  onMouseLeave={() => setHoveredMsg(null)}>

                                  {/* Hover aksiyon menüsü */}
                                  {hovered && (
                                    <div className={`absolute top-1 z-10 flex items-center gap-0.5 bg-white shadow-lg rounded-xl border border-slate-100 px-1.5 py-1 ${isOut ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                      <button onClick={() => { navigator.clipboard.writeText(m.content); setCopied(m.id); setTimeout(() => setCopied(null), 1500) }}
                                        title="Kopyala" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700">
                                        {copied === m.id ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                                      </button>
                                      <button onClick={() => { setReplyTo(m); inputRef.current?.focus() }}
                                        title="Yanıtla" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700">
                                        <Reply size={12}/>
                                      </button>
                                    </div>
                                  )}

                                  {/* Mesaj balonu */}
                                  <div className={`px-3 pt-2 pb-1.5 shadow-sm ${isOut ? 'bg-[#dcf8c6]' : 'bg-white'}`}
                                    style={{ borderRadius, wordBreak: 'break-word', overflowWrap: 'break-word' }}>

                                    {/* Reply-to göstergesi */}
                                    {m.reply_to_id && (
                                      <div className={`text-[11px] mb-1.5 px-2 py-1 rounded border-l-2 opacity-70 ${isOut ? 'border-emerald-500 bg-emerald-50' : 'border-blue-400 bg-blue-50'}`}>
                                        Yanıt
                                      </div>
                                    )}

                                    {/* Medya */}
                                    {m.media && <MediaPreview media={m.media} isOut={isOut}/>}

                                    {/* Metin — URL/tel linkify */}
                                    {m.content && (
                                      <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                                        {linkifyText(m.content)}
                                      </p>
                                    )}

                                    {/* Saat + okundu */}
                                    <div className={`flex items-center gap-1 mt-0.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
                                      <span className="text-[10px] text-slate-400">{formatTime(m.sent_at)}</span>
                                      {isOut && (
                                        m.status === 'read'
                                          ? <CheckCheck size={12} className="text-blue-500"/>
                                          : <CheckCheck size={12} className="text-slate-400"/>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef}/>
              </>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div className={`mx-4 mb-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {toast.type === 'error' && <AlertCircle size={12}/>}
              {toast.text}
            </div>
          )}

          {/* Reply-to göstergesi */}
          {replyTo && (
            <div className="mx-4 mb-1 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <Reply size={12}/>
                <span className="truncate max-w-[280px]">{replyTo.content?.slice(0, 60)}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-blue-400 hover:text-blue-600 ml-2"><X size={12}/></button>
            </div>
          )}

          {/* AI yanıt önerileri */}
          {showAiSuggestions && (
            <div className="mx-4 mb-2 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                  <Sparkles size={12}/>
                  AI Yanıt Önerileri
                </div>
                <button onClick={() => setShowAiSuggestions(false)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
              </div>
              {loadingAi ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <RefreshCw size={11} className="animate-spin"/>Hazırlanıyor...
                </div>
              ) : aiSuggestions.length > 0 ? (
                <div className="space-y-1">
                  {aiSuggestions.map((s, i) => (
                    <button key={i} onClick={() => { setNewMessage(s); setShowAiSuggestions(false); inputRef.current?.focus() }}
                      className="w-full text-left text-xs px-3 py-2 bg-white hover:bg-violet-50 rounded-lg text-slate-700 border border-violet-100 hover:border-violet-300 transition leading-relaxed">
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Öneri üretilemedi</p>
              )}
            </div>
          )}

          {/* Hızlı yanıt paneli */}
          {showQR && (
            <div className="mx-4 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Hızlı Yanıtlar</span>
                <div className="flex gap-1">
                  <button onClick={() => setShowNewQR(v => !v)}
                    className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                    + Yeni
                  </button>
                  <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
                </div>
              </div>

              {showNewQR && (
                <div className="p-3 border-b border-slate-100 space-y-2">
                  <input value={newQRTitle} onChange={e => setNewQRTitle(e.target.value)} placeholder="Başlık..."
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-300"/>
                  <textarea value={newQRContent} onChange={e => setNewQRContent(e.target.value)} placeholder="Şablon metni..."
                    rows={2} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-300 resize-none"/>
                  <div className="flex gap-2">
                    <select value={newQRCat} onChange={e => setNewQRCat(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                      {['genel','selamlama','itiraz','kapanış','takip','teklif'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={saveNewQR}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-medium">
                      Kaydet
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                {quickReplies.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">Henüz şablon yok</p>
                ) : (
                  quickReplies.map((qr: any) => (
                    <button key={qr.id} onClick={() => {
                      setNewMessage(qr.content); setShowQR(false); inputRef.current?.focus()
                      fetch(`${API}/api/quick-replies/${qr.id}/use`, { method: 'POST', headers: authH() })
                    }} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition flex items-center gap-2">
                      {qr.icon && <span>{qr.icon}</span>}
                      <span className="flex-1 truncate">{qr.title}</span>
                      {qr.pinned && <Pin size={10} className="text-amber-400 shrink-0"/>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Input alanı */}
          <div className="px-3 py-2.5 bg-white border-t border-slate-100">
            {/* Kanal seçici */}
            <div className="flex items-center gap-1 mb-2">
              {Object.entries(CHANNEL_CFG).slice(0,3).map(([ch, info]) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border transition font-medium ${
                    channel === ch ? `${info.bg} ${info.color} border-current/20` : 'border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}>
                  <info.Icon size={10}/>{info.label}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              {/* Hızlı yanıt */}
              <button onClick={() => setShowQR(v => !v)} title="Hızlı yanıt şablonları"
                className={`p-2 rounded-xl transition shrink-0 mb-0.5 ${showQR ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                <Smile size={18}/>
              </button>

              {/* Dosya yükle */}
              <button onClick={() => fileRef.current?.click()} title="Dosya/görsel ekle"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition shrink-0 mb-0.5">
                <Paperclip size={18}/>
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) sendMedia(f); e.target.value = '' }}/>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea ref={inputRef} value={newMessage} onChange={e => {
                    setNewMessage(e.target.value)
                    const ta = e.target; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Mesaj yazın... (Enter = gönder, Shift+Enter = yeni satır)"
                  rows={1}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:bg-white resize-none transition placeholder-slate-400"
                  style={{ maxHeight: '120px', overflow: 'hidden' }}/>
              </div>

              {/* Gönder */}
              <button onClick={send} disabled={sending || !newMessage.trim()}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition shrink-0 mb-0.5 shadow-sm active:scale-95">
                {sending ? <RefreshCw size={17} className="animate-spin"/> : <Send size={17}/>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        !isMobile && (
          <div className="flex-1 flex items-center justify-center"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v5h5v5H0v5h20v-5h-5v-5h5v-.5z'/%3E%3C/g%3E%3C/svg%3E")` }}>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-slate-300"/>
              </div>
              <p className="text-slate-600 font-semibold mb-1">Konuşma Seçin</p>
              <p className="text-slate-400 text-sm">Soldaki listeden bir konuşma seçin</p>
            </div>
          </div>
        )
      )}

      {/* ═══ RIGHT PANEL — Lead Detayı (sadece masaüstü) ═══ */}
      {selectedLead && !isMobile && (
        <div className="w-[260px] border-l border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm mx-auto mb-2"
              style={{ backgroundColor: avatarColor(selectedLead.company_name || '') }}>
              {initials(selectedLead.company_name || '')}
            </div>
            <p className="text-slate-800 font-bold text-sm text-center">{selectedLead.company_name}</p>
            {selectedLead.status && STAGE_LABELS[selectedLead.status] && (
              <div className="flex justify-center mt-1.5">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${STAGE_LABELS[selectedLead.status].color}`}>
                  {STAGE_LABELS[selectedLead.status].label}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">İletişim</div>
            {selectedLead.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone size={12} className="shrink-0 text-slate-400"/>{selectedLead.phone}
              </div>
            )}
            {selectedLead.email && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail size={12} className="shrink-0 text-slate-400"/>{selectedLead.email}
              </div>
            )}
            {(leadDetail || selectedLead).city && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin size={12} className="shrink-0 text-slate-400"/>{(leadDetail || selectedLead).city}
              </div>
            )}
            {(leadDetail || selectedLead).sector && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <TrendingUp size={12} className="shrink-0 text-slate-400"/>{(leadDetail || selectedLead).sector}
              </div>
            )}

            {(leadDetail || selectedLead).score != null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>Lead Skoru</span>
                  <span className="font-bold text-slate-700">{(leadDetail || selectedLead).score}</span>
                </div>
                <div className="bg-slate-200 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(leadDetail || selectedLead).score}%` }}/>
                </div>
              </div>
            )}

            <div className="pt-3 space-y-1.5">
              <a href={`tel:${selectedLead.phone}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                <Phone size={13}/> WhatsApp Aç
              </a>
              <Link href={`/leads/${selectedLead.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition">
                <ExternalLink size={13}/> Lead Detayı
              </Link>
              <Link href={`/leads/${selectedLead.id}?tab=pipeline`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition">
                <TrendingUp size={13}/> Pipeline
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
