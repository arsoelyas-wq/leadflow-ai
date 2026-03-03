'use client'
import { useState } from 'react'
import { MessageSquare, Mail, Instagram, Search, Filter } from 'lucide-react'

// Şimdilik mock data — backend messages route eklenince gerçek API'ye bağlanır
const MOCK_MESSAGES = [
  { id: '1', company: 'Özdemir Dekorasyon', channel: 'whatsapp', direction: 'inbound', content: 'Merhaba, ürünleriniz hakkında bilgi almak istiyorum.', time: '14:32', status: 'read', avatar: 'Ö' },
  { id: '2', company: 'Yıldız Tekstil', channel: 'email', direction: 'inbound', content: 'Kataloğunuzu aldım, fiyat teklifinizi bekliyorum.', time: '11:15', status: 'unread', avatar: 'Y' },
  { id: '3', company: 'Kaya Mobilya', channel: 'instagram', direction: 'inbound', content: 'DM attım, cevap bekliyorum.', time: 'Dün', status: 'read', avatar: 'K' },
  { id: '4', company: 'Demir İnşaat', channel: 'whatsapp', direction: 'outbound', content: 'Merhaba, size özel bir teklifimiz var...', time: 'Dün', status: 'delivered', avatar: 'D' },
  { id: '5', company: 'Akar Gıda', channel: 'email', direction: 'outbound', content: 'Ürün kataloğumuzu incelemenizi öneririz.', time: '2 gün önce', status: 'opened', avatar: 'A' },
]

const channelIcon: Record<string, any> = {
  whatsapp: ({ size }: any) => <MessageSquare size={size} className="text-green-400" />,
  email: ({ size }: any) => <Mail size={size} className="text-blue-400" />,
  instagram: ({ size }: any) => <Instagram size={size} className="text-pink-400" />,
}
const channelLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', email: 'Email', instagram: 'Instagram'
}
const statusLabel: Record<string, string> = {
  read: 'Okundu', unread: 'Okunmadı', delivered: 'İletildi', opened: 'Açıldı', sent: 'Gönderildi'
}
const statusColor: Record<string, string> = {
  unread: 'bg-blue-500/20 text-blue-300',
  read: 'bg-slate-700 text-slate-400',
  delivered: 'bg-slate-700 text-slate-400',
  opened: 'bg-green-500/20 text-green-300',
  sent: 'bg-slate-700 text-slate-400',
}

export default function MessagesPage() {
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [direction, setDirection] = useState('')
  const [selected, setSelected] = useState<(typeof MOCK_MESSAGES)[0] | null>(null)

  const filtered = MOCK_MESSAGES.filter(m => {
    if (search && !m.company.toLowerCase().includes(search.toLowerCase())) return false
    if (channel && m.channel !== channel) return false
    if (direction && m.direction !== direction) return false
    return true
  })

  const unreadCount = MOCK_MESSAGES.filter(m => m.status === 'unread').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesajlar</h1>
          <p className="text-slate-400 mt-1">
            {unreadCount > 0 ? (
              <span className="text-blue-400">{unreadCount} okunmamış mesaj</span>
            ) : 'Tüm mesajlar okundu'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
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
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Mesaj bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filtered.map(msg => {
              const Icon = channelIcon[msg.channel]
              return (
                <div key={msg.id}
                  onClick={() => setSelected(selected?.id === msg.id ? null : msg)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${
                    selected?.id === msg.id ? 'bg-blue-600/10' : 'hover:bg-slate-700/30'
                  } ${msg.status === 'unread' ? 'border-l-2 border-blue-500' : ''}`}>
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-medium text-sm ${msg.status === 'unread' ? 'text-white' : 'text-slate-300'}`}>
                        {msg.company}
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
                    <span className="text-slate-500 text-xs">{msg.time}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[msg.status]}`}>
                      {statusLabel[msg.status]}
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
                {selected.avatar}
              </div>
              <div>
                <p className="text-white font-medium">{selected.company}</p>
                <p className="text-slate-400 text-sm">{channelLabel[selected.channel]} · {selected.time}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-sm">✕</button>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <p className="text-slate-200 text-sm leading-relaxed">{selected.content}</p>
          </div>
          {selected.direction === 'inbound' && (
            <div className="mt-4 flex gap-2">
              <input placeholder="Cevap yaz..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                Gönder
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        💡 Mesajlar WhatsApp, Email ve Instagram webhook'larından otomatik güncellenir. Lead'e cevap geldiğinde burada görünür.
      </div>
    </div>
  )
}