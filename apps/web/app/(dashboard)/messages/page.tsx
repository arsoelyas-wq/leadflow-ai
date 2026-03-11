'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { createClient } from '@supabase/supabase-js'
import { MessageSquare, Mail, Search, RefreshCw, Send, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  lead_id: string
  channel: string
  direction: 'in' | 'out'
  content: string
  status: string
  sent_at: string
  leads?: { company_name: string; phone?: string; email?: string; city?: string }
}

const channelIcon: Record<string, any> = {
  whatsapp: ({ size }: any) => <MessageSquare size={size} className="text-green-400" />,
  email: ({ size }: any) => <Mail size={size} className="text-blue-400" />,
}
const channelLabel: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email' }

export default function MessagesPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [direction, setDirection] = useState('')
  const [selected, setSelected] = useState<Message | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/messages')
      setMessages(data.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Realtime — yeni mesaj gelince otomatik güncelle
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${user.id}`,
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const filtered = messages.filter(m => {
    const name = m.leads?.company_name || m.leads?.phone || ''
    if (search && !name.toLowerCase().includes(search.toLowerCase()) &&
        !m.content.toLowerCase().includes(search.toLowerCase())) return false
    if (channel && m.channel !== channel) return false
    if (direction && m.direction !== direction) return false
    return true
  })

  const incomingCount = messages.filter(m => m.direction === 'in').length

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    if (diff < 172800000) return 'Dün'
    return d.toLocaleDateString('tr-TR')
  }

  const sendReply = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const lead = selected.leads
      if (selected.channel === 'whatsapp') {
        await api.post('/api/whatsapp/send', {
          phone: lead?.phone || '',
          message: reply,
          leadId: selected.lead_id,
        })
      } else if (selected.channel === 'email') {
        await api.post('/api/email/send', {
          to: lead?.email || '',
          subject: 'Re: LeadFlow AI',
          body: reply,
          leadId: selected.lead_id,
        })
      }
      setReply('')
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  // Seçili mesajın konuşma geçmişi
  const conversation = selected
    ? messages
        .filter(m => m.lead_id === selected.lead_id && m.channel === selected.channel)
        .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesajlar</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {incomingCount > 0
              ? <span className="text-green-400">{incomingCount} gelen mesaj</span>
              : `${messages.length} mesaj`}
          </p>
        </div>
        <button onClick={load}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Firma veya mesaj ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <select value={channel} onChange={e => setChannel(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">Tüm Kanallar</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>
        <select value={direction} onChange={e => setDirection(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">Tümü</option>
          <option value="in">Gelen</option>
          <option value="out">Giden</option>
        </select>
      </div>

      <div className={`grid gap-4 ${selected ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Message List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                {messages.length === 0 ? 'Henüz mesaj yok. Kampanya başlatınca mesajlar burada görünür.' : 'Mesaj bulunamadı'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
              {filtered.map(msg => {
                const Icon = channelIcon[msg.channel] || channelIcon.whatsapp
                const name = msg.leads?.company_name || msg.leads?.phone || 'Bilinmeyen'
                const isSelected = selected?.lead_id === msg.lead_id && selected?.channel === msg.channel
                return (
                  <div key={msg.id}
                    onClick={() => setSelected(isSelected ? null : msg)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition ${
                      isSelected ? 'bg-blue-600/10 border-l-2 border-blue-500' : 'hover:bg-slate-700/30'
                    } ${msg.direction === 'in' && msg.status !== 'read' ? 'border-l-2 border-green-500' : ''}`}>
                    <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-medium text-sm text-white truncate">{name}</p>
                        <Icon size={11} />
                        {msg.direction === 'in'
                          ? <ArrowDownLeft size={11} className="text-green-400" />
                          : <ArrowUpRight size={11} className="text-slate-500" />}
                      </div>
                      <p className="text-slate-400 text-xs truncate">{msg.content}</p>
                    </div>
                    <span className="text-slate-500 text-xs shrink-0">{formatTime(msg.sent_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Conversation Panel */}
        {selected && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-300 font-bold text-sm">
                  {(selected.leads?.company_name || selected.leads?.phone || 'B')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {selected.leads?.company_name || selected.leads?.phone || 'Bilinmeyen'}
                  </p>
                  <p className="text-slate-500 text-xs">{channelLabel[selected.channel]}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
              {conversation.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                    msg.direction === 'out'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'out' ? 'text-blue-200' : 'text-slate-500'}`}>
                      {formatTime(msg.sent_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                  placeholder={`${channelLabel[selected.channel]} ile yanıtla...`}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition flex items-center gap-1.5">
                  <Send size={14} />
                  {sending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}