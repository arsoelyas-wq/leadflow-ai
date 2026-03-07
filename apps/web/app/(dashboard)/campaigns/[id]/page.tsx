'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  ArrowLeft, Play, Pause, Trash2, MessageSquare,
  Mail, Users, TrendingUp, CheckCircle, XCircle,
  Clock, Zap, BarChart2, Send, RefreshCw
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  totalSent: number
  totalReplied: number
  createdAt: string
  messageTemplate: string
  leadIds: string[]
}

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

const channelConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  multi: { label: 'Çoklu Kanal', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: 'Taslak', color: 'text-slate-400', dot: 'bg-slate-400' },
  active: { label: 'Aktif', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  paused: { label: 'Duraklatıldı', color: 'text-amber-400', dot: 'bg-amber-400' },
  completed: { label: 'Tamamlandı', color: 'text-blue-400', dot: 'bg-blue-400' },
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'Tarih yok'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Tarih yok'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [campData, msgData] = await Promise.all([
        api.get(`/api/campaigns/${id}`),
        api.get(`/api/messages/lead/${id}`).catch(() => ({ messages: [] }))
      ])
      setCampaign(campData.campaign)
      setMessages(msgData.messages || [])
    } catch {
      router.push('/campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])

  const toggleStatus = async () => {
    if (!campaign) return
    setActing(true)
    try {
      const endpoint = campaign.status === 'active'
        ? `/api/campaigns/${id}/pause`
        : `/api/campaigns/${id}/start`
      await api.post(endpoint, {})
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActing(false)
    }
  }

  const deleteCampaign = async () => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    try {
      await api.delete(`/api/campaigns/${id}`)
      router.push('/campaigns')
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500 flex items-center gap-2">
        <RefreshCw size={16} className="animate-spin" />
        Yükleniyor...
      </div>
    </div>
  )

  if (!campaign) return null

  const totalLeads = campaign.leadIds?.length || 0
  const replyRate = campaign.totalSent > 0
    ? Math.round((campaign.totalReplied / campaign.totalSent) * 100)
    : 0
  const deliveryRate = campaign.totalSent > 0 ? 100 : 0
  const progressMax = Math.max(totalLeads, campaign.totalSent || 0, 1)

  const ch = channelConfig[campaign.channel] || channelConfig.whatsapp
  const st = statusConfig[campaign.status] || statusConfig.draft
  const ChIcon = ch.icon

  const outbound = messages.filter(m => m.direction === 'outbound')
  const inbound = messages.filter(m => m.direction === 'inbound')
  const failed = messages.filter(m => m.status === 'failed')

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${ch.bg} ${ch.color}`}>
                <ChIcon size={11} />
                {ch.label}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${st.dot} ${campaign.status === 'active' ? 'animate-pulse' : ''}`} />
              <span className={`text-sm ${st.color}`}>{st.label}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500 text-sm">{formatDate(campaign.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status !== 'completed' && (
            <button onClick={toggleStatus} disabled={acting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                campaign.status === 'active'
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
              }`}>
              {acting ? <RefreshCw size={14} className="animate-spin" /> :
                campaign.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
              {campaign.status === 'active' ? 'Duraklat' : 'Başlat'}
            </button>
          )}
          <button onClick={deleteCampaign}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition border border-slate-700 hover:border-red-500/30">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Gönderilen',
            value: campaign.totalSent,
            icon: Send,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            sub: `${totalLeads} hedef`
          },
          {
            label: 'Cevaplanan',
            value: campaign.totalReplied,
            icon: MessageSquare,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            sub: `%${replyRate} oran`
          },
          {
            label: 'İletim Oranı',
            value: `%${deliveryRate}`,
            icon: CheckCircle,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            sub: `${failed.length} başarısız`
          },
          {
            label: 'Lead Sayısı',
            value: totalLeads,
            icon: Users,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            sub: 'hedef'
          },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">{stat.label}</span>
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={15} className={stat.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            Kampanya Performansı
          </h3>
          <span className="text-slate-400 text-sm">%{replyRate} dönüşüm</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Gönderildi', value: campaign.totalSent, max: progressMax, color: 'bg-blue-500' },
            { label: 'Cevap Aldı', value: campaign.totalReplied, max: progressMax, color: 'bg-emerald-500' },
          ].map((bar, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-400">{bar.label}</span>
                <span className="text-white font-medium">{bar.value}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`${bar.color} h-2 rounded-full transition-all duration-700`}
                  style={{ width: `${bar.max > 0 ? Math.min(100, (bar.value / bar.max) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Mesaj Şablonu */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-slate-400" />
            Mesaj Şablonu
          </h3>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {campaign.messageTemplate || 'Şablon bulunamadı'}
            </p>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {['[FIRMA_ADI]', '[SEHIR]', '[SEKTOR]'].map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Son Mesajlar */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-400" />
            Son Aktivite
            <span className="ml-auto text-slate-500 text-xs font-normal">{messages.length} mesaj</span>
          </h3>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Henüz mesaj yok</p>
              <p className="text-slate-600 text-xs mt-1">Kampanyayı başlatınca mesajlar burada görünür</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.slice(0, 10).map(msg => (
                <div key={msg.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    msg.direction === 'inbound' ? 'bg-emerald-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-xs font-medium truncate">
                        {msg.leads?.company_name || 'Bilinmeyen'}
                      </span>
                      <span className={`text-xs flex-shrink-0 ${
                        msg.direction === 'inbound' ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        {msg.direction === 'inbound' ? '↓ Gelen' : '↑ Giden'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{msg.content}</p>
                  </div>
                  <span className="text-slate-600 text-xs flex-shrink-0">
                    {new Date(msg.sent_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Giden Mesaj', value: outbound.length, icon: Send, color: 'text-blue-400' },
          { label: 'Gelen Cevap', value: inbound.length, icon: MessageSquare, color: 'text-emerald-400' },
          { label: 'Başarısız', value: failed.length, icon: XCircle, color: 'text-red-400' },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
              <Icon size={18} className={item.color} />
              <div>
                <p className="text-white font-bold text-lg">{item.value}</p>
                <p className="text-slate-500 text-xs">{item.label}</p>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}