'use client'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Plus, Play, Pause, BarChart2, Search, Trash2, Send, Users,
  MessageSquare, Clock, CheckCircle2, AlertTriangle, Copy,
  ChevronRight, Zap, TrendingUp, Eye, XCircle, RefreshCw,
  Phone, Mail, MessageCircle, Instagram, Layers, Globe,
} from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  totalSent: number
  totalReplied: number
  totalDelivered?: number
  totalFailed?: number
  totalRead?: number
  leadCount?: number
  messageTemplate?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

const CHANNEL_CFG: Record<string, { Icon: any; label: string; color: string; bg: string; border: string; iconColor: string }> = {
  whatsapp:  { Icon: MessageCircle, label: 'WhatsApp',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', iconColor: 'text-emerald-400' },
  email:     { Icon: Mail,          label: 'Email',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25',    iconColor: 'text-blue-400'    },
  sms:       { Icon: Phone,         label: 'SMS',       color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/25',  iconColor: 'text-purple-400'  },
  instagram: { Icon: Instagram,     label: 'Instagram', color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/25',    iconColor: 'text-pink-400'    },
  multi:     { Icon: Layers,        label: 'Çoklu',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   iconColor: 'text-amber-400'   },
}

const STATUS_CFG: Record<string, { label: string; Icon: any; cls: string; dotCls: string }> = {
  draft:     { label: 'Taslak',        Icon: Clock,          cls: 'bg-slate-700/60 text-slate-300 border border-slate-600',             dotCls: 'bg-slate-400'   },
  active:    { label: 'Aktif',         Icon: Zap,            cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',    dotCls: 'bg-emerald-400' },
  paused:    { label: 'Duraklatıldı',  Icon: Pause,          cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',         dotCls: 'bg-amber-400'   },
  completed: { label: 'Tamamlandı',    Icon: CheckCircle2,   cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',            dotCls: 'bg-blue-400'    },
  failed:    { label: 'Hatalı',        Icon: AlertTriangle,  cls: 'bg-red-500/15 text-red-300 border border-red-500/30',               dotCls: 'bg-red-400'     },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}g önce`
  return new Date(dateStr).toLocaleDateString('tr-TR')
}

export default function CampaignsPage() {
  const { t } = useI18n()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const toast = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    api.get('/api/campaigns')
      .then(data => setCampaigns(data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const endpoint = currentStatus === 'active' ? `/api/campaigns/${id}/pause` : `/api/campaigns/${id}/start`
    try { await api.post(endpoint, {}); toast('success', currentStatus === 'active' ? 'Duraklatıldı' : 'Başlatıldı'); load() }
    catch (e: any) { toast('error', e.message) }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    try { await api.delete(`/api/campaigns/${id}`); toast('success', 'Kampanya silindi'); load() } catch {}
  }

  const duplicateCampaign = async (c: Campaign) => {
    try {
      await api.post('/api/campaigns', { name: `${c.name} (Kopya)`, channel: c.channel, messageTemplate: c.messageTemplate || '', leadIds: [] })
      toast('success', 'Kampanya kopyalandı')
      load()
    } catch (e: any) { toast('error', e.message) }
  }

  const totalSent = campaigns.reduce((s, c) => s + (c.totalSent || 0), 0)
  const totalReplied = campaigns.reduce((s, c) => s + (c.totalReplied || 0), 0)
  const totalDelivered = campaigns.reduce((s, c) => s + (c.totalDelivered || c.totalSent || 0), 0)
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0
  const activeCnt = campaigns.filter(c => c.status === 'active').length

  const filtered = campaigns.filter(c => {
    const ms = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const mc = filterChannel === 'all' || c.channel === filterChannel
    const mst = filterStatus === 'all' || c.status === filterStatus
    return ms && mc && mst
  })

  // Best performing campaign
  const bestCampaign = campaigns.filter(c => c.totalSent > 0).sort((a, b) => {
    const rateA = a.totalSent > 0 ? a.totalReplied / a.totalSent : 0
    const rateB = b.totalSent > 0 ? b.totalReplied / b.totalSent : 0
    return rateB - rateA
  })[0]

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-500/30 flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-400" />
            </div>
            {t('campaigns.title', 'Kampanyalar')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 ml-[42px]">
            {campaigns.length} kampanya · {activeCnt} aktif
          </p>
        </div>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/20">
          <Plus size={16} /> Yeni Kampanya
        </Link>
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium animate-[bounceIn_0.3s_ease-out] ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Kampanya', value: campaigns.length, Icon: BarChart2,   iconBg: 'bg-blue-500/15',    iconColor: 'text-blue-400'    },
          { label: 'Toplam Gönderim', value: totalSent,        Icon: Send,        iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
          { label: 'Toplam Yanıt',    value: totalReplied,     Icon: TrendingUp,  iconBg: 'bg-cyan-500/15',    iconColor: 'text-cyan-400'    },
          { label: 'Yanıt Oranı',     value: `${avgReplyRate}%`, Icon: Users,     iconBg: 'bg-purple-500/15',  iconColor: 'text-purple-400'  },
        ].map(({ label, value, Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 hover:border-slate-600 transition group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} group-hover:scale-105 transition-transform`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-white text-xl font-bold leading-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-slate-500 text-[11px]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Best campaign highlight ── */}
      {bestCampaign && bestCampaign.totalReplied > 0 && (
        <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-300 text-sm font-medium">En İyi Performans</p>
            <p className="text-emerald-400/60 text-xs">
              <span className="font-semibold text-emerald-400">{bestCampaign.name}</span> — %{Math.round((bestCampaign.totalReplied / bestCampaign.totalSent) * 100)} yanıt oranı
            </p>
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Kampanya ara..."
            className="w-full bg-slate-800/50 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg">×</button>
          )}
        </div>
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer">
          <option value="all">Tüm Kanallar</option>
          {Object.entries(CHANNEL_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer">
          <option value="all">Tüm Durumlar</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* ── Campaign List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-700/40 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-slate-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">
            {campaigns.length === 0 ? 'Henüz kampanya yok' : 'Sonuç bulunamadı'}
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            {campaigns.length === 0
              ? 'İlk kampanyanızı oluşturun ve leadlerinize otomatik mesaj gönderin'
              : 'Arama kriterlerinizi değiştirin'}
          </p>
          {campaigns.length === 0 && (
            <Link href="/campaigns/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition">
              <Plus size={16} /> Kampanya Oluştur
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => {
            const ch = CHANNEL_CFG[campaign.channel] || CHANNEL_CFG.multi
            const st = STATUS_CFG[campaign.status] || STATUS_CFG.draft
            const ChIcon = ch.Icon
            const StIcon = st.Icon
            const replyRate = campaign.totalSent > 0 ? Math.round((campaign.totalReplied / campaign.totalSent) * 100) : 0
            const delivered = campaign.totalDelivered || campaign.totalSent || 0
            const failed = campaign.totalFailed || 0
            const preview = campaign.messageTemplate ? campaign.messageTemplate.slice(0, 80) : null

            return (
              <div key={campaign.id}
                className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition group">

                {/* Active indicator stripe */}
                {campaign.status === 'active' && (
                  <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
                )}

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Channel icon */}
                    <div className={`w-11 h-11 ${ch.bg} border ${ch.border} rounded-xl flex items-center justify-center shrink-0`}>
                      <ChIcon size={20} className={ch.iconColor} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Name + badges */}
                      <div className="flex items-center flex-wrap gap-2 mb-1.5">
                        <Link href={`/campaigns/${campaign.id}`} className="text-white font-semibold hover:text-blue-400 transition truncate">
                          {campaign.name}
                        </Link>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>
                          <StIcon size={10} /> {st.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ch.bg} ${ch.color}`}>{ch.label}</span>
                      </div>

                      {/* Row 2: Message preview */}
                      {preview && (
                        <p className="text-slate-500 text-xs mb-2.5 truncate max-w-lg">
                          {preview}{campaign.messageTemplate && campaign.messageTemplate.length > 80 ? '...' : ''}
                        </p>
                      )}

                      {/* Row 3: Metrics */}
                      {campaign.totalSent > 0 ? (
                        <div className="space-y-2">
                          {/* Progress bar */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <div className="flex items-center gap-3 text-slate-400">
                                <span className="flex items-center gap-1"><Send size={10} className="text-blue-400" /> {campaign.totalSent} gönderildi</span>
                                {delivered > 0 && <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" /> {delivered} teslim</span>}
                                {failed > 0 && <span className="flex items-center gap-1"><XCircle size={10} className="text-red-400" /> {failed} hata</span>}
                              </div>
                              <span className={`font-semibold ${replyRate >= 10 ? 'text-emerald-400' : replyRate > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                                %{replyRate} yanıt
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.max(replyRate, campaign.totalSent > 0 ? 2 : 0)}%`,
                                  background: replyRate >= 10
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                }} />
                            </div>
                          </div>

                          {/* Delivery breakdown pills */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-700/30 px-2 py-0.5 rounded-md">
                              <MessageSquare size={9} /> {campaign.totalReplied} yanıt
                            </span>
                            {campaign.totalRead && campaign.totalRead > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                <Eye size={9} /> {campaign.totalRead} okundu
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] text-slate-600">
                              <Clock size={9} /> {timeAgo(campaign.createdAt)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(campaign.createdAt)}</span>
                          <span>Henüz gönderim yapılmadı</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition">
                      <Link href={`/campaigns/${campaign.id}`}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition" title="Detay">
                        <BarChart2 size={14} />
                      </Link>
                      <button onClick={() => duplicateCampaign(campaign)}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition" title="Kopyala">
                        <Copy size={14} />
                      </button>
                      {campaign.status !== 'completed' && (
                        <button onClick={() => toggleCampaign(campaign.id, campaign.status)}
                          className={`p-2 rounded-lg transition ${
                            campaign.status === 'active'
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`} title={campaign.status === 'active' ? 'Duraklat' : 'Başlat'}>
                          {campaign.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                      <button onClick={() => deleteCampaign(campaign.id)}
                        className="p-2 bg-red-500/5 hover:bg-red-500/15 rounded-lg text-red-400/60 hover:text-red-400 transition" title="Sil">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Footer info ── */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-5 text-[11px] text-slate-600 pb-1 flex-wrap">
          <span className="flex items-center gap-1.5"><Send size={11} className="text-blue-400" /> Gönderim</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400" /> Teslim edildi</span>
          <span className="flex items-center gap-1.5"><Eye size={11} className="text-blue-400" /> Okundu</span>
          <span className="flex items-center gap-1.5"><TrendingUp size={11} className="text-cyan-400" /> Yanıt oranı</span>
        </div>
      )}
    </div>
  )
}
