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
  // ─── Yeni özellikler ────────────────────────────────────────────────────────
  const [internalNotes, setInternalNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [msgSearch, setMsgSearch] = useState('')
  const [msgSearchResults, setMsgSearchResults] = useState<any[]>([])
  const [searchingMsg, setSearchingMsg] = useState(false)
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')
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

  const mergeduplicates = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/wa-dedup`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.success) {
        showToast('success', `${d.deleted} yinelenen sohbet birleştirildi`)
        await fetchConversations()
      } else {
        showToast('error', d.error || 'Birleştirme başarısız')
      }
    } catch { showToast('error', 'Ağ hatası') }
  }, [fetchConversations, showToast])

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

  // ─── SSE gerçek zamanlı stream (polling'in yerini alır) ──────────────────────
  const selectedLeadRef = useRef<any>(null)
  useEffect(() => { selectedLeadRef.current = selectedLead }, [selectedLead])

  useEffect(() => {
    load()
    // Sayfa açılınca yinelenen sohbetleri birleştir
    fetch(`${API}/api/wa-dedup`, { method: 'POST', headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success && d.deleted > 0) fetchConversations() })
      .catch(() => {})

    const token = getToken()
    if (!token || typeof EventSource === 'undefined') {
      // SSE yoksa hafif fallback polling
      const t = setInterval(fetchConversations, 15000)
      return () => clearInterval(t)
    }

    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout>
    let retries = 0

    function connect() {
      es = new EventSource(`${API}/api/inbox/stream?token=${encodeURIComponent(token)}`)

      es.addEventListener('new_message', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          fetchConversations()
          const active = selectedLeadRef.current
          if (active && data.leadId === active.id) {
            // Aktif sohbete gelen mesajı doğrudan ekle
            setMessages(prev => {
              const already = prev.some((m: any) => m.id && m.id === data.id)
              if (already) return prev
              const newMsg = {
                id: data.id || `tmp-${Date.now()}`,
                content: data.content, direction: data.direction,
                channel: data.channel, sent_at: data.sentAt, read: false,
              }
              if (data.direction === 'in') {
                fetchAiSuggestions(active.id)
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(`Yeni mesaj: ${active.company_name || active.contact_name}`, {
                    body: data.content?.slice(0, 80), icon: '/favicon.ico',
                  })
                }
              }
              return [...prev, newMsg]
            })
            fetch(`${API}/api/inbox/read/${active.id}`, { method: 'PATCH', headers: authH() }).catch(() => {})
          }
        } catch {}
      })

      es.addEventListener('lead_update', () => { fetchConversations() })

      es.onerror = () => {
        es?.close()
        // Üstel geri-çekilme: 2s, 4s, 8s, max 30s
        retries = Math.min(retries + 1, 4)
        const delay = Math.min(2000 * Math.pow(2, retries - 1), 30000)
        retryTimeout = setTimeout(connect, delay)
      }

      es.addEventListener('open', () => { retries = 0 })
    }

    connect()

    // SSE yokken 60s dedup
    const dedupT = setInterval(() => {
      fetch(`${API}/api/wa-dedup`, { method: 'POST', headers: authH() })
        .then(r => r.json()).then(d => { if (d.success && d.deleted > 0) fetchConversations() }).catch(() => {})
    }, 60000)

    return () => {
      es?.close()
      clearTimeout(retryTimeout)
      clearInterval(dedupT)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── Pin / unpin ──────────────────────────────────────────────────────────
  const togglePin = useCallback(async (leadId: string, pinned: boolean) => {
    try {
      await fetch(`${API}/api/inbox/pin/${leadId}`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify({ pinned }),
      })
      setConversations(prev => prev.map(c =>
        c.lead.id === leadId ? { ...c, lead: { ...c.lead, pinned } } : c
      ))
      showToast('success', pinned ? 'Konuşma sabitlendi' : 'Sabitleme kaldırıldı')
    } catch { showToast('error', 'İşlem başarısız') }
  }, [showToast])

  // ─── Labels ───────────────────────────────────────────────────────────────
  const toggleLabel = useCallback(async (leadId: string, label: string, currentLabels: string[]) => {
    const labels = currentLabels.includes(label)
      ? currentLabels.filter(l => l !== label)
      : [...currentLabels, label]
    try {
      await fetch(`${API}/api/inbox/labels/${leadId}`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify({ labels }),
      })
      setConversations(prev => prev.map(c =>
        c.lead.id === leadId ? { ...c, lead: { ...c.lead, labels } } : c
      ))
      if (selectedLead?.id === leadId) setSelectedLead((s: any) => ({ ...s, labels }))
    } catch { showToast('error', 'Etiket güncellenemedi') }
  }, [selectedLead, showToast])

  // ─── Auto-reply toggle ────────────────────────────────────────────────────
  const toggleAutoReply = useCallback(async (leadId: string, enabled: boolean) => {
    try {
      await fetch(`${API}/api/inbox/auto-reply/${leadId}`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify({ enabled }),
      })
      setConversations(prev => prev.map(c =>
        c.lead.id === leadId ? { ...c, lead: { ...c.lead, auto_reply_enabled: enabled } } : c
      ))
      if (selectedLead?.id === leadId) setSelectedLead((s: any) => ({ ...s, auto_reply_enabled: enabled }))
      showToast('success', enabled ? 'Otomatik yanıt açık' : 'Otomatik yanıt kapalı')
    } catch { showToast('error', 'Ayar değiştirilemedi') }
  }, [selectedLead, showToast])

  // ─── Internal notes ───────────────────────────────────────────────────────
  const loadNotes = useCallback(async (leadId: string) => {
    try {
      const r = await fetch(`${API}/api/inbox/notes/${leadId}`, { headers: authH() })
      const d = await r.json()
      setInternalNotes(d.notes || [])
    } catch {}
  }, [])

  const saveNote = useCallback(async () => {
    if (!newNote.trim() || !selectedLead) return
    setSavingNote(true)
    try {
      const r = await fetch(`${API}/api/inbox/notes/${selectedLead.id}`, {
        method: 'POST', headers: authH(), body: JSON.stringify({ content: newNote.trim() }),
      })
      const d = await r.json()
      if (d.success) {
        setInternalNotes(prev => [...prev, d.note])
        setNewNote('')
        showToast('success', 'Not kaydedildi')
      }
    } catch { showToast('error', 'Not kaydedilemedi') }
    setSavingNote(false)
  }, [newNote, selectedLead, showToast])

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await fetch(`${API}/api/inbox/notes/${noteId}`, { method: 'DELETE', headers: authH() })
      setInternalNotes(prev => prev.filter(n => n.id !== noteId))
    } catch { showToast('error', 'Not silinemedi') }
  }, [showToast])

  // ─── Mark all read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${API}/api/inbox/read-all`, { method: 'PATCH', headers: authH() })
      setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })))
      showToast('success', 'Tümü okundu işaretlendi')
    } catch { showToast('error', 'İşlem başarısız') }
  }, [showToast])

  // ─── Message search ───────────────────────────────────────────────────────
  const searchMessages = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setMsgSearchResults([]); return }
    setSearchingMsg(true)
    try {
      const r = await fetch(`${API}/api/inbox/search?q=${encodeURIComponent(q)}`, { headers: authH() })
      const d = await r.json()
      setMsgSearchResults(d.results || [])
    } catch {}
    setSearchingMsg(false)
  }, [])

  // ─── WA status check ──────────────────────────────────────────────────────
  const checkWaStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/wa-status`)
      if (!r.ok) { setWaStatus('disconnected'); return }
      const d = await r.json()
      const hasConnected = Array.isArray(d.instances)
        ? d.instances.some((i: any) => i.status === 'connected')
        : d.status === 'connected'
      setWaStatus(hasConnected ? 'connected' : 'disconnected')
    } catch { setWaStatus('disconnected') }
  }, [])

  useEffect(() => {
    checkWaStatus()
    const t = setInterval(checkWaStatus, 30000)
    return () => clearInterval(t)
  }, [checkWaStatus])

  // ─── Notes load when lead changes ─────────────────────────────────────────
  useEffect(() => {
    if (selectedLead) { loadNotes(selectedLead.id); setShowNotes(false) }
    else { setInternalNotes([]) }
  }, [selectedLead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
            <div className="flex items-center gap-1">
              {/* WA Durum göstergesi */}
              <div title={`WhatsApp: ${waStatus === 'connected' ? 'Bağlı' : waStatus === 'disconnected' ? 'Bağlı Değil' : 'Bilinmiyor'}`}
                className={`w-2 h-2 rounded-full ${waStatus === 'connected' ? 'bg-emerald-500' : waStatus === 'disconnected' ? 'bg-red-400' : 'bg-slate-300'}`}/>
              {totalUnread > 0 && (
                <button onClick={markAllRead} title="Tümünü okundu işaretle"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                  <CheckCheck size={14}/>
                </button>
              )}
              <button onClick={mergeduplicates} title="Yinelenen sohbetleri birleştir"
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 6H5a2 2 0 0 0-2 2v3"/><path d="M8 18H5a2 2 0 0 1-2-2v-3"/>
                  <path d="M16 6h3a2 2 0 0 1 2 2v3"/><path d="M16 18h3a2 2 0 0 0 2-2v-3"/>
                  <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 10.93l2.83 2.83"/><path d="M16.24 10.93l-2.83 2.83"/>
                </svg>
              </button>
              <button onClick={load} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Arama */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara (isim, telefon...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-20 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:bg-white transition"/>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {search && <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>}
              <button onClick={() => setShowMsgSearch(v => !v)} title="Mesaj içeriği ara"
                className={`p-0.5 rounded transition ${showMsgSearch ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <MessageSquare size={11}/>
              </button>
            </div>
          </div>

          {/* Mesaj içeriği arama */}
          {showMsgSearch && (
            <div className="mb-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  value={msgSearch}
                  onChange={e => { setMsgSearch(e.target.value); searchMessages(e.target.value) }}
                  placeholder="Mesaj metni ara..."
                  className="w-full bg-white border border-blue-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition"/>
              </div>
              {searchingMsg && <p className="text-[10px] text-slate-400 mt-1 pl-1">Aranıyor...</p>}
              {!searchingMsg && msgSearch && msgSearchResults.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1 pl-1">Sonuç bulunamadı</p>
              )}
              {msgSearchResults.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                  {msgSearchResults.slice(0, 8).map((r: any) => (
                    <button key={r.id} onClick={() => {
                      const conv = conversations.find(c => c.lead.id === r.lead_id)
                      if (conv) { loadMessages(conv.lead); setShowMsgSearch(false); setMsgSearch('') }
                    }} className="w-full text-left px-2 py-1.5 bg-slate-50 hover:bg-blue-50 rounded-lg transition">
                      <p className="text-[10px] font-medium text-slate-700 truncate">{r.lead?.company_name || r.lead_id}</p>
                      <p className="text-[10px] text-slate-400 truncate">{r.content?.slice(0, 60)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                <div key={lead.id}
                  className={`group relative w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-slate-50 transition hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''} ${lead.pinned ? 'bg-amber-50/50' : ''}`}
                  onClick={() => loadMessages(lead)}>

                  {/* Pin göstergesi */}
                  {lead.pinned && (
                    <Pin size={9} className="absolute top-2 right-2 text-amber-400 opacity-70 rotate-45"/>
                  )}

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
                      <span className={`text-sm font-semibold truncate pr-4 ${unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {lead.company_name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
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
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {lead.status && STAGE_LABELS[lead.status] && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${STAGE_LABELS[lead.status].color}`}>
                          {STAGE_LABELS[lead.status].label}
                        </span>
                      )}
                      {(lead.labels || []).slice(0, 2).map((lbl: string) => (
                        <span key={lbl} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hover aksiyon: pin */}
                  <button
                    onClick={e => { e.stopPropagation(); togglePin(lead.id, !lead.pinned) }}
                    title={lead.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                    className={`absolute bottom-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition ${lead.pinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}>
                    <Pin size={10} className="rotate-45"/>
                  </button>
                </div>
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
              <span className="flex-1">{toast.text}</span>
              {toast.type === 'error' && toast.text?.includes('SMTP') && (
                <Link href="/settings#channels" className="underline font-semibold text-red-700 hover:text-red-900 whitespace-nowrap ml-1">
                  SMTP Ayarla →
                </Link>
              )}
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
                <select
                  value={selectedLead.status}
                  onChange={async e => {
                    const newStatus = e.target.value
                    await fetch(`${API}/api/leads/${selectedLead.id}`, {
                      method: 'PATCH', headers: authH(), body: JSON.stringify({ status: newStatus }),
                    })
                    setSelectedLead((s: any) => ({ ...s, status: newStatus }))
                    fetchConversations()
                    showToast('success', 'Durum güncellendi')
                  }}
                  className={`text-[11px] px-2 py-1 rounded-full font-semibold border-0 focus:outline-none cursor-pointer ${STAGE_LABELS[selectedLead.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                  {Object.entries(STAGE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
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

            {/* Otomatik yanıt toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ZapIcon size={11} className="text-amber-500"/>
                Otomatik Yanıt
              </span>
              <button
                onClick={() => toggleAutoReply(selectedLead.id, !selectedLead.auto_reply_enabled)}
                className={`relative w-8 h-4 rounded-full transition-colors ${selectedLead.auto_reply_enabled !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${selectedLead.auto_reply_enabled !== false ? 'translate-x-4' : 'translate-x-0.5'}`}/>
              </button>
            </div>

            {/* Etiketler */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Etiketler</div>
              <div className="flex flex-wrap gap-1">
                {(['VIP', 'Sıcak', 'Takip', 'Teklif', 'Demo'].map(lbl => {
                  const active = (selectedLead.labels || []).includes(lbl)
                  return (
                    <button key={lbl} onClick={() => toggleLabel(selectedLead.id, lbl, selectedLead.labels || [])}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition border ${active ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-200 hover:text-blue-500'}`}>
                      {lbl}
                    </button>
                  )
                }))}
              </div>
            </div>

            <div className="pt-1 space-y-1.5">
              {selectedLead.phone && (
                <a href={`https://wa.me/${selectedLead.phone}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition shadow-sm">
                  <Phone size={13}/> WhatsApp Aç
                </a>
              )}
              <Link href={`/leads/${selectedLead.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition">
                <ExternalLink size={13}/> Lead Detayı
              </Link>
              <Link href={`/leads/${selectedLead.id}?tab=pipeline`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition">
                <TrendingUp size={13}/> Pipeline
              </Link>
            </div>

            {/* İç notlar */}
            <div className="pt-2 border-t border-slate-200">
              <button onClick={() => setShowNotes(v => !v)}
                className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition mb-2">
                <span className="flex items-center gap-1">
                  <FileText size={10}/>
                  İç Notlar {internalNotes.length > 0 && `(${internalNotes.length})`}
                </span>
                <ChevronDown size={10} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`}/>
              </button>
              {showNotes && (
                <div className="space-y-2">
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {internalNotes.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">Henüz not yok</p>
                    ) : internalNotes.map(note => (
                      <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg p-2 group relative">
                        <p className="text-[11px] text-slate-700 leading-relaxed pr-5">{note.content}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{timeAgo(note.created_at)}</p>
                        <button onClick={() => deleteNote(note.id)}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition">
                          <Trash2 size={10}/>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input value={newNote} onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() } }}
                      placeholder="Not ekle..."
                      className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-300 bg-white"/>
                    <button onClick={saveNote} disabled={savingNote || !newNote.trim()}
                      className="px-2 py-1.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg transition">
                      {savingNote ? <RefreshCw size={10} className="animate-spin"/> : <Plus size={10}/>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
