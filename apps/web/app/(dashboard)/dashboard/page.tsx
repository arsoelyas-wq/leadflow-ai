'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Megaphone, MessageSquare, Zap,
  TrendingUp, ArrowRight, BarChart2,
  Bell, CheckCircle, Wifi, WifiOff
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DashboardData {
  stats: {
    totalLeads: number
    weekLeads: number
    activeCampaigns: number
    totalCampaigns: number
    totalSent: number
    replyRate: number
    credits: number
    planType: string
  }
  recentLeads: any[]
  recentCampaigns: any[]
  dailyStats: { date: string; sent: number }[]
}

interface Notification {
  id: string
  text: string
  type: 'message' | 'lead' | 'campaign'
  time: Date
}

const statusColor: any = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  draft: 'bg-slate-600/30 text-slate-400 border-slate-600/30',
}
const statusLabel: any = {
  active: 'Aktif', paused: 'Duraklatıldı', completed: 'Tamamlandı', draft: 'Taslak'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)

  const fetchData = useCallback(() => {
    api.get('/api/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  // Supabase Realtime
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`dashboard-${user.id}`)

      // Yeni gelen mesaj
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const msg = payload.new
        if (msg.direction === 'in') {
          const notif: Notification = {
            id: msg.id,
            text: `Yeni mesaj: "${(msg.content || '').slice(0, 50)}${msg.content?.length > 50 ? '...' : ''}"`,
            type: 'message',
            time: new Date(),
          }
          setNotifications(prev => [notif, ...prev].slice(0, 10))
          setNewMessageCount(c => c + 1)
          fetchData() // Stats güncelle
        }
      })

      // Yeni lead
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const lead = payload.new
        const notif: Notification = {
          id: lead.id,
          text: `Yeni lead: ${lead.company_name || lead.phone}`,
          type: 'lead',
          time: new Date(),
        }
        setNotifications(prev => [notif, ...prev].slice(0, 10))
        fetchData()
      })

      // Kampanya güncellendi
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'campaigns',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const camp = payload.new
        if (camp.status === 'completed') {
          const notif: Notification = {
            id: camp.id,
            text: `Kampanya tamamlandı: "${camp.name}" — ${camp.total_sent} gönderildi`,
            type: 'campaign',
            time: new Date(),
          }
          setNotifications(prev => [notif, ...prev].slice(0, 10))
          fetchData()
        }
      })

      .subscribe((status: string) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const stats = data?.stats
  const maxSent = Math.max(...(data?.dailyStats?.map(d => d.sent) || [1]), 1)

  const notifIcon: any = { message: '💬', lead: '👤', campaign: '🚀' }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hoş geldin, {user?.name?.split(' ')[0]} 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-400 text-sm">İşte bugünkü özet</p>
            <div className={`flex items-center gap-1 text-xs ${realtimeConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
              {realtimeConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {realtimeConnected ? 'Canlı' : 'Bağlanıyor...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Bildirim zili */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setNewMessageCount(0) }}
              className="relative w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center hover:border-slate-600 transition"
            >
              <Bell size={16} className="text-slate-400" />
              {newMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {newMessageCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-white font-medium text-sm">Bildirimler</span>
                  <button onClick={() => setNotifications([])} className="text-slate-500 hover:text-slate-300 text-xs">Temizle</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-slate-500 text-sm">Henüz bildirim yok</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                    {notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-800/50 transition">
                        <div className="flex items-start gap-2">
                          <span className="text-base">{notifIcon[n.type]}</span>
                          <div>
                            <p className="text-slate-200 text-xs leading-relaxed">{n.text}</p>
                            <p className="text-slate-600 text-xs mt-0.5">
                              {n.time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link href="/campaigns/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
            <Zap size={15} />
            Yeni Kampanya
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Lead', value: stats?.totalLeads || 0, sub: `+${stats?.weekLeads || 0} bu hafta`, icon: Users, color: 'blue' },
          { label: 'Aktif Kampanya', value: stats?.activeCampaigns || 0, sub: `${stats?.totalCampaigns || 0} toplam`, icon: Megaphone, color: 'green' },
          { label: 'Cevap Oranı', value: `%${stats?.replyRate || 0}`, sub: `${stats?.totalSent || 0} gönderildi`, icon: TrendingUp, color: 'purple' },
          { label: 'Kalan Kredi', value: stats?.credits || 0, sub: stats?.planType || 'starter', icon: Zap, color: 'orange' },
        ].map(({ label, value, sub, icon: Icon, color }) => {
          const colors: any = {
            blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/10' },
            green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/10' },
            purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/10' },
            orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/10' },
          }
          const c = colors[color]
          return (
            <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">{label}</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg} border ${c.border}`}>
                  <Icon size={17} className={c.text} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-slate-500 text-xs mt-1">{sub}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold">Mesaj Gönderim Trendi</h2>
            <span className="text-slate-500 text-xs">Son 7 gün</span>
          </div>
          {data?.dailyStats && data.dailyStats.some(d => d.sent > 0) ? (
            <div className="flex items-end gap-2 h-32">
              {data.dailyStats.map(({ date, sent }) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
                    <div
                      className="w-full bg-blue-500/30 hover:bg-blue-500/50 rounded-t transition-all"
                      style={{ height: `${Math.max((sent / maxSent) * 100, sent > 0 ? 8 : 2)}%` }}
                    />
                  </div>
                  <span className="text-slate-500 text-xs">{date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2">
              <BarChart2 size={32} className="text-slate-700" />
              <p className="text-slate-500 text-sm">Henüz mesaj gönderilmedi</p>
              <Link href="/campaigns/new" className="text-blue-400 text-xs hover:text-blue-300">
                İlk kampanyayı başlat →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Kampanyalar</h2>
            <Link href="/campaigns" className="text-blue-400 text-xs hover:text-blue-300">Tümü →</Link>
          </div>
          {data?.recentCampaigns?.length ? (
            <div className="space-y-3">
              {data.recentCampaigns.map((c: any) => (
                <Link key={c.id} href={`/campaigns/${c.id}`}
                  className="block p-3 bg-slate-900/50 hover:bg-slate-900 rounded-lg transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white text-sm font-medium truncate">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[c.status] || statusColor.draft}`}>
                      {statusLabel[c.status] || c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} />
                      {c.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </span>
                    <span>{c.total_sent || 0} gönderildi</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Megaphone size={28} className="text-slate-700" />
              <p className="text-slate-500 text-sm">Kampanya yok</p>
              <Link href="/campaigns/new" className="text-blue-400 text-xs hover:text-blue-300">Oluştur →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Son Leadler</h2>
          <Link href="/leads" className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1">
            Tümünü gör <ArrowRight size={12} />
          </Link>
        </div>
        {data?.recentLeads?.length ? (
          <div className="space-y-2">
            {data.recentLeads.map((lead: any) => (
              <div key={lead.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-300 text-xs font-bold">
                    {(lead.company_name || lead.contact_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{lead.company_name || lead.contact_name}</p>
                    <p className="text-slate-500 text-xs">{lead.city} · {lead.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-white text-sm font-semibold">{lead.score}/100</div>
                    <div className="text-slate-500 text-xs">Puan</div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                    Yeni
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <Users size={28} className="text-slate-700" />
            <p className="text-slate-500 text-sm">Henüz lead yok</p>
          </div>
        )}
      </div>
    </div>
  )
}