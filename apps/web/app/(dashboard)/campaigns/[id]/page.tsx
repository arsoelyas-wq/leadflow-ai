'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  ArrowLeft, Play, Pause, Trash2, MessageSquare,
  Mail, Users, TrendingUp, CheckCircle2, XCircle,
  Clock, Zap, BarChart2, Send, RefreshCw, Building2,
  Phone, MapPin, CheckCheck, AlertTriangle, Hourglass,
} from 'lucide-react'

interface Campaign {
  id: string; name: string; channel: string; status: string
  totalSent: number; totalReplied: number; createdAt: string
  messageTemplate: string; leadIds: string[]
}

interface LeadStatus {
  id: string; company_name: string; phone?: string; city?: string; sector?: string
  sent: number; replied: number; failed: number
  status: 'pending' | 'sent' | 'replied' | 'failed'
  lastMessage?: { content: string; sent_at: string; direction: string } | null
}

interface Message {
  id: string; lead_id: string; direction: string
  content: string; status: string; sent_at: string
}

const channelCfg: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  email:    { label: 'Email',    icon: Mail,          color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25'    },
}

const statusCfg: Record<string, { label: string; color: string; dotCls: string; cardCls: string }> = {
  draft:     { label: 'Taslak',       color: 'text-slate-400',   dotCls: 'bg-slate-400',   cardCls: 'bg-slate-700/60 text-slate-300 border-slate-600'              },
  active:    { label: 'Aktif',        color: 'text-emerald-400', dotCls: 'bg-emerald-400 animate-pulse', cardCls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  paused:    { label: 'Duraklatıldı', color: 'text-amber-400',   dotCls: 'bg-amber-400',   cardCls: 'bg-amber-500/15 text-amber-300 border-amber-500/30'            },
  completed: { label: 'Tamamlandı',   color: 'text-blue-400',    dotCls: 'bg-blue-400',    cardCls: 'bg-blue-500/15 text-blue-300 border-blue-500/30'              },
  scheduled: { label: 'Zamanlandı',   color: 'text-violet-400',  dotCls: 'bg-violet-400 animate-pulse', cardCls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
}

const leadStatusCfg: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  pending:  { label: 'Bekliyor', Icon: Hourglass,    color: 'text-slate-400',   bg: 'bg-slate-700/40' },
  sent:     { label: 'Gönderildi', Icon: CheckCircle2, color: 'text-blue-400',  bg: 'bg-blue-500/10'  },
  replied:  { label: 'Cevapladı',  Icon: CheckCheck,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed:   { label: 'Başarısız',  Icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-500/10'   },
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}dk önce`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}sa önce`
  return new Date(d).toLocaleDateString('tr-TR')
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const isMobile = useIsMobile()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [leadStatus, setLeadStatus] = useState<LeadStatus[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success'|'error'; text: string } | null>(null)
  const [leadFilter, setLeadFilter] = useState<'all'|'sent'|'replied'|'failed'|'pending'>('all')

  const showToast = (type: 'success'|'error', text: string) => {
    setToast({ type, text }); setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [campData, statusData] = await Promise.all([
        api.get(`/api/campaigns/${id}`),
        api.get(`/api/campaigns/${id}/leads-status`).catch(() => ({ leadStatus: [], messages: [] })),
      ])
      setCampaign(campData.campaign)
      setLeadStatus(statusData.leadStatus || [])
      setMessages(statusData.messages || [])
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
      let ep: string
      if (campaign.status === 'active') ep = `/api/campaigns/${id}/pause`
      else if (campaign.status === 'paused') ep = `/api/campaigns/${id}/resume`
      else ep = `/api/campaigns/${id}/start`
      const res = await api.post(ep, {})
      showToast('success', res.message || 'İşlem tamamlandı')
      await load()
    } catch (e: any) { showToast('error', e.message) }
    setActing(false)
  }

  const deleteCampaign = async () => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    try { await api.delete(`/api/campaigns/${id}`); router.push('/campaigns') }
    catch (e: any) { showToast('error', e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={18} className="animate-spin text-slate-500" />
    </div>
  )
  if (!campaign) return null

  const totalLeads   = campaign.leadIds?.length || leadStatus.length || 0
  const failedCount  = leadStatus.filter(l => l.status === 'failed').length
  const sentCount    = leadStatus.filter(l => l.status === 'sent').length
  const repliedCount = leadStatus.filter(l => l.status === 'replied').length
  const pendingCount = leadStatus.filter(l => l.status === 'pending').length
  const replyRate    = campaign.totalSent > 0 ? Math.round((repliedCount / campaign.totalSent) * 100) : 0

  const ch = channelCfg[campaign.channel] || channelCfg.whatsapp
  const st = statusCfg[campaign.status] || statusCfg.draft
  const ChIcon = ch.icon

  const filteredLeads = leadStatus.filter(l => leadFilter === 'all' || l.status === leadFilter)
  const outMessages = messages.filter(m => m.direction === 'out')
  const inMessages  = messages.filter(m => m.direction === 'in')

  return (
    <div className={`space-y-5 max-w-5xl ${isMobile ? 'pb-24' : ''}`}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{toast.text}</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/campaigns"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ch.bg} ${ch.color} ${ch.border}`}>
                <ChIcon size={11} />{ch.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.cardCls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />{st.label}
              </span>
            </div>
            <p className="text-slate-500 text-sm ml-0.5">
              {new Date(campaign.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!['completed', 'scheduled'].includes(campaign.status) && (
            <button onClick={toggleStatus} disabled={acting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 border ${
                campaign.status === 'active'
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
              }`}>
              {acting ? <RefreshCw size={14} className="animate-spin" /> :
                campaign.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
              {campaign.status === 'active' ? 'Duraklat' : campaign.status === 'paused' ? 'Devam Et' : 'Başlat'}
            </button>
          )}
          <button onClick={() => load()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition border border-slate-700"
            title="Yenile">
            <RefreshCw size={15} />
          </button>
          <button onClick={deleteCampaign}
            className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition border border-slate-700 hover:border-red-500/30">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Gönderilen', value: campaign.totalSent, sub: `${totalLeads} hedef`, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Cevaplayan', value: repliedCount, sub: `%${replyRate} oran`, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Başarısız', value: failedCount, sub: `${sentCount} başarılı`, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Lead Sayısı', value: totalLeads, sub: `${pendingCount} bekliyor`, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs">{s.label}</span>
                <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={14} className={s.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-600 text-xs mt-0.5">{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
            <TrendingUp size={15} className="text-blue-400" />
            Kampanya Performansı
          </h3>
          <span className="text-slate-400 text-sm font-medium">%{replyRate} dönüşüm</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Gönderildi', value: campaign.totalSent, max: Math.max(totalLeads, 1), color: 'from-blue-600 to-blue-400' },
            { label: 'Cevap Aldı', value: repliedCount, max: Math.max(totalLeads, 1), color: 'from-emerald-600 to-emerald-400' },
            { label: 'Başarısız', value: failedCount, max: Math.max(totalLeads, 1), color: 'from-red-600 to-red-400' },
          ].map((bar, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">{bar.label}</span>
                <span className="text-white font-medium">{bar.value} / {bar.max}</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                <div className={`bg-gradient-to-r ${bar.color} h-1.5 rounded-full transition-all duration-700`}
                  style={{ width: `${Math.min(100, (bar.value / bar.max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Listesi */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
          <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
            <Users size={15} className="text-amber-400" />
            Lead Listesi
            <span className="text-slate-500 font-normal">({totalLeads})</span>
          </h3>
          {/* Filtre butonları */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'replied', 'sent', 'pending', 'failed'] as const).map(f => {
              const labels: Record<string, string> = { all: 'Tümü', replied: 'Cevapladı', sent: 'Gönderildi', pending: 'Bekliyor', failed: 'Başarısız' }
              const counts: Record<string, number> = {
                all: totalLeads, replied: repliedCount, sent: sentCount, pending: pendingCount, failed: failedCount,
              }
              return (
                <button key={f} onClick={() => setLeadFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    leadFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}>
                  {labels[f]} {counts[f] > 0 && <span className="opacity-70">({counts[f]})</span>}
                </button>
              )
            })}
          </div>
        </div>

        {leadStatus.length === 0 ? (
          <div className="text-center py-10">
            <Users size={28} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Lead bilgisi yüklenemedi</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Bu filtreye uygun lead yok</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {filteredLeads.map(lead => {
              const lsCfg = leadStatusCfg[lead.status]
              const LsIcon = lsCfg.Icon
              return (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/20 transition">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0 text-slate-400 font-bold text-sm">
                    {(lead.company_name || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-medium truncate">{lead.company_name}</p>
                      {lead.city && (
                        <span className="flex items-center gap-0.5 text-slate-600 text-xs shrink-0">
                          <MapPin size={9} />{lead.city}
                        </span>
                      )}
                    </div>
                    {lead.lastMessage ? (
                      <p className="text-slate-500 text-xs truncate max-w-xs">{lead.lastMessage.content}</p>
                    ) : (
                      <p className="text-slate-600 text-xs">{lead.phone || 'Telefon yok'}</p>
                    )}
                  </div>

                  {/* Mesaj sayaçları */}
                  <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
                    {lead.sent > 0 && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Send size={10} />{lead.sent}
                      </span>
                    )}
                    {lead.replied > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <MessageSquare size={10} />{lead.replied}
                      </span>
                    )}
                    {lead.failed > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle size={10} />{lead.failed}
                      </span>
                    )}
                  </div>

                  {/* Durum badge */}
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${lsCfg.bg} ${lsCfg.color}`}>
                    <LsIcon size={10} />
                    <span className="hidden sm:inline">{lsCfg.label}</span>
                  </div>

                  {/* Zaman */}
                  {lead.lastMessage && (
                    <span className="text-slate-600 text-xs shrink-0 hidden md:block">
                      {timeAgo(lead.lastMessage.sent_at)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Mesaj Şablonu */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
            <BarChart2 size={15} className="text-slate-400" />
            Mesaj Şablonu
          </h3>
          <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {campaign.messageTemplate || 'Şablon bulunamadı'}
            </p>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {['{{firma}}','{{sektor}}','{{sehir}}','[FIRMA_ADI]','[SEHIR]'].map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Son Mesajlar */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
              <MessageSquare size={15} className="text-slate-400" />
              Son Aktivite
            </h3>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Send size={9} className="text-blue-400" />{outMessages.length} gönderildi</span>
              <span className="flex items-center gap-1"><MessageSquare size={9} className="text-emerald-400" />{inMessages.length} cevap</span>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Henüz mesaj yok</p>
              <p className="text-slate-600 text-xs mt-1">Kampanyayı başlatınca mesajlar burada görünür</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {messages.slice(0, 15).map(msg => (
                <div key={msg.id} className="flex items-start gap-2.5 p-3 bg-slate-900/50 rounded-xl">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    msg.direction === 'in' ? 'bg-emerald-400' : msg.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        msg.direction === 'in' ? 'bg-emerald-500/10 text-emerald-400'
                        : msg.status === 'failed' ? 'bg-red-500/10 text-red-400'
                        : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {msg.direction === 'in' ? '↓ Gelen' : msg.status === 'failed' ? '✗ Başarısız' : '↑ Giden'}
                      </span>
                      <span className="text-slate-600 text-xs">{timeAgo(msg.sent_at)}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Özet alt bar */}
      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pb-1">
        <span className="flex items-center gap-1.5"><Send size={10} className="text-blue-400" /> Giden mesaj: {outMessages.length}</span>
        <span className="flex items-center gap-1.5"><MessageSquare size={10} className="text-emerald-400" /> Gelen cevap: {inMessages.length}</span>
        <span className="flex items-center gap-1.5"><XCircle size={10} className="text-red-400" /> Başarısız: {failedCount}</span>
        <span className="flex items-center gap-1.5"><Users size={10} className="text-amber-400" /> Toplam lead: {totalLeads}</span>
      </div>

    </div>
  )
}
