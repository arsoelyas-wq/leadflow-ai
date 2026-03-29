'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Inbox, Send, RefreshCw, MessageSquare, Mail, Phone, Instagram, Facebook } from 'lucide-react'

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: { icon: '💬', label: 'WhatsApp', color: 'text-emerald-400' },
  email: { icon: '📧', label: 'Email', color: 'text-blue-400' },
  instagram: { icon: '📸', label: 'Instagram', color: 'text-pink-400' },
  facebook: { icon: '📘', label: 'Facebook', color: 'text-blue-500' },
  sms: { icon: '📱', label: 'SMS', color: 'text-purple-400' },
}

export default function UnifiedInboxPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [filterChannel, setFilterChannel] = useState('all')
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),4000) }

  const load = async () => {
    setLoading(true)
    try {
      const [c, s] = await Promise.allSettled([
        api.get('/api/inbox/conversations'),
        api.get('/api/inbox/stats'),
      ])
      if (c.status==='fulfilled') setConversations(c.value.conversations||[])
      if (s.status==='fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  const loadMessages = async (lead: any) => {
    setSelectedLead(lead)
    try {
      const data = await api.get(`/api/inbox/messages?leadId=${lead.id}`)
      setMessages(data.messages||[])
      await api.patch(`/api/inbox/read/${lead.id}`, {})
      load()
    } catch {}
  }

  useEffect(()=>{ load() },[])

  const send = async () => {
    if (!newMessage.trim() || !selectedLead) return
    setSending(true)
    try {
      await api.post('/api/inbox/send', { leadId: selectedLead.id, content: newMessage, channel })
      setNewMessage('')
      await loadMessages(selectedLead)
      showMsg('success', 'Gönderildi!')
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const filtered = filterChannel === 'all' ? conversations :
    conversations.filter(c => c.lastMessage?.channel === filterChannel)

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Sol — Konuşma listesi */}
      <div className="w-80 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-white font-bold flex items-center gap-2 mb-3">
            <Inbox size={18} className="text-blue-400"/> Gelen Kutusu
            {stats?.unread > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.unread}</span>}
          </h1>
          <div className="flex gap-1 flex-wrap">
            {['all','whatsapp','email','instagram'].map(ch=>(
              <button key={ch} onClick={()=>setFilterChannel(ch)}
                className={`px-2 py-1 text-xs rounded-lg border transition ${filterChannel===ch?'bg-slate-700 border-slate-500 text-white':'border-slate-700 text-slate-400 hover:text-white'}`}>
                {ch==='all'?'Tümü':CHANNEL_ICONS[ch]?.icon+' '+CHANNEL_ICONS[ch]?.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center p-8"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
          : filtered.length===0 ? <p className="text-slate-400 text-sm text-center p-8">Konuşma yok</p>
          : filtered.map(conv=>(
            <div key={conv.lead.id} onClick={()=>loadMessages(conv.lead)}
              className={`px-4 py-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition ${selectedLead?.id===conv.lead.id?'bg-slate-800':''}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {conv.lead.company_name?.[0]?.toUpperCase()||'?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-white text-xs font-medium truncate">{conv.lead.company_name}</p>
                    {conv.unreadCount > 0 && <span className="bg-blue-500 text-white text-xs px-1.5 rounded-full ml-auto flex-shrink-0">{conv.unreadCount}</span>}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-slate-400 text-xs truncate">
                      <span className="mr-1">{CHANNEL_ICONS[conv.lastMessage.channel]?.icon}</span>
                      {conv.lastMessage.direction==='out'?'Sen: ':''}{conv.lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sağ — Mesajlar */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {selectedLead.company_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{selectedLead.company_name}</p>
              <p className="text-slate-400 text-xs">{selectedLead.phone}</p>
            </div>
          </div>

          {/* Mesajlar */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length===0 ? <p className="text-slate-400 text-sm text-center mt-8">Mesaj yok</p>
            : messages.map(m=>(
              <div key={m.id} className={`flex ${m.direction==='out'?'justify-end':'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm ${m.direction==='out'?'bg-blue-600 text-white':'bg-slate-700 text-white'}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs opacity-60">{CHANNEL_ICONS[m.channel]?.icon}</span>
                  </div>
                  <p>{m.content}</p>
                  <p className="text-xs opacity-60 mt-1">{new Date(m.sent_at).toLocaleString('tr-TR')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mesaj gönder */}
          <div className="p-4 border-t border-slate-700">
            {msg && <div className={`mb-2 px-3 py-2 rounded-lg text-xs ${msg.type==='success'?'bg-emerald-500/10 text-emerald-300':'bg-red-500/10 text-red-300'}`}>{msg.text}</div>}
            <div className="flex gap-2 mb-2">
              {Object.entries(CHANNEL_ICONS).map(([ch, info])=>(
                <button key={ch} onClick={()=>setChannel(ch)}
                  className={`px-2 py-1 text-xs rounded-lg border transition ${channel===ch?'bg-slate-700 border-slate-500 text-white':'border-slate-700 text-slate-400'}`}>
                  {info.icon} {info.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={newMessage} onChange={e=>setNewMessage(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
                placeholder="Mesaj yaz... (Enter: Gönder)"
                rows={2}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"/>
              <button onClick={send} disabled={sending||!newMessage.trim()}
                className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition flex items-center">
                {sending?<RefreshCw size={16} className="animate-spin"/>:<Send size={16}/>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={48} className="text-slate-600 mx-auto mb-3"/>
            <p className="text-slate-400">Konuşma seçin</p>
          </div>
        </div>
      )}
    </div>
  )
}