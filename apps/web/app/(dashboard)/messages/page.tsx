'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MessageSquare, Mail, Instagram, Search, RefreshCw, Send } from 'lucide-react'

interface Message {
  id: string
  lead_id: string
  channel: string
  direction: string
  content: string
  status: string
  sent_at: string
  leads?: { company_name: string; city?: string }
}

const channelIcon: Record<string, any> = {
  whatsapp: ({ size }: any) => <MessageSquare size={size} className="text-green-400" />,
  email: ({ size }: any) => <Mail size={size} className="text-blue-400" />,
  instagram: ({ size }: any) => <Instagram size={size} className="text-pink-400" />,
}
const channelLabel: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email', instagram: 'Instagram' }
const statusLabel: Record<string, string> = { read: 'Okundu', unread: 'Okunmadı', delivered: 'İletildi', opened: 'Açıldı', sent: 'Gönderildi', failed: 'Başarısız' }
const statusColor: Record<string, string> = {
  unread: 'bg-blue-500/20 text-blue-300',
  read: 'bg-slate-700 text-slate-400',
  delivered: 'bg-slate-700 text-slate-400',
  opened: 'bg-green-500/20 text-green-300',
  sent: 'bg-slate-700 text-slate-400',
  failed: 'bg-red-500/20 text-red-400',
}

export default function MessagesPage() {
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
      // Supabase'den messages tablosunu çek (leads join ile)
      const data = await api.get('/api/messages')
      setMessages(data.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = messages.filter(m => {
    const companyName = m.leads?.company_name || ''
    if (search && !companyName.toLowerCase().includes(search.toLowerCase())) return false
    if (channel && m.channel !== channel) return false
    if (direction && m.direction !== direction) return false
    return true
  })

  const unreadCount = messages.filter(m => m.status === 'unread').length

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
      if (selected.channel === 'whatsapp') {
        await api.post('/api/whatsapp/send', {
          phone: '', // lead'den gelecek
          message: reply,
          leadId: selected.lead_id
        })
      } else if (selected.channel === 'email') {
        await api.post('/api/email/send', {
          to: '',
          subject: 'Re: LeadFlow AI',
          body: reply,
          leadId: selected.lead_id
        })
      }
      setReply('')
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesajlar</h1>
          <p className="text-slate-400 mt-1">
            {unreadCount > 0
              ? <span className="text-blue-400">{unreadCount} okunmamış mesaj</span>
              : `${messages.length} mesaj`}
          </p>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Firma ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <select value={channel} onChange={e => setChannel(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">Tüm Kanallar</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="instagram">Instagram</option>
        </select>
        <select value={direction} onChange={e => setDirection(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">Tümü</option>
          <option value="inbound">Gelen</option>
          <option value="outbound">Giden</option>
        </select>
      </div>

      {/* Message List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              {messages.length === 0 ? 'Henüz mesaj yok. Kampanya başlatınca mesajlar burada görünür.' : 'Mesaj bulunamadı'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filtered.map(msg => {
              const Icon = channelIcon[msg.channel] || channelIcon.whatsapp
              const company = msg.leads?.company_name || 'Bilinmeyen'
              return (
                <div key={msg.id}
                  onClick={() => setSelected(selected?.id === msg.id ? null : msg)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${
                    selected?.id === msg.id ? 'bg-blue-600/10' : 'hover:bg-slate-700/30'
                  } ${msg.status === 'unread' ? 'border-l-2 border-blue-500' : ''}`}>
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {company[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-medium text-sm ${msg.status === 'unread' ? 'text-white' : 'text-slate-300'}`}>
                        {company}
                      </p>
                      <span className="text-slate-500 text-xs">·</span>
                      <div className="flex items-center gap-1">
                        <Icon size={11} />
                        <span className="text-slate-400 text-xs">{channelLabel[msg.channel]}</span>
                      </div>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-slate-500 text-xs">{msg.direction === 'inbound' ? '↓ Gelen' : '↑ Giden'}</span>
                    </div>
                    <p className={`text-sm truncate ${msg.status === 'unread' ? 'text-slate-200' : 'text-slate-400'}`}>
                      {msg.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500 text-xs">{formatTime(msg.sent_at)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[msg.status] || 'bg-slate-700 text-slate-400'}`}>
                      {statusLabel[msg.status] || msg.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Message Detail Panel */}
      {selected && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">
                {(selected.leads?.company_name || 'B')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium">{selected.leads?.company_name || 'Bilinmeyen'}</p>
                <p className="text-slate-400 text-sm">{channelLabel[selected.channel]} · {formatTime(selected.sent_at)}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-sm">✕</button>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 mb-4">
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
          </div>
          {selected.direction === 'inbound' && (
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                placeholder="Cevap yaz..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition flex items-center gap-1.5"
              >
                <Send size={14} />
                {sending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        💡 Mesajlar WhatsApp, Email webhook'larından otomatik güncellenir. Kampanya başlatınca mesajlar burada görünür.
      </div>
    </div>
  )
}