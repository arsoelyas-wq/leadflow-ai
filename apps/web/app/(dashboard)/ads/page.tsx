'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import {
  RefreshCw, Users, AlertTriangle, CheckCircle,
  Link, Zap, Target, TrendingUp, Bell, ArrowUpRight,
  Activity, DollarSign, Eye, MousePointer, ChevronRight,
  BarChart2, Wifi
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

export default function AdsPage() {
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [adAccount, setAdAccount] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [extracting, setExtracting] = useState(false)
  const [leadsExtracted, setLeadsExtracted] = useState(0)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (code && state === 'meta') exchangeToken(code)
    else loadAll()
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/ads/exchange-token`, {
        method: 'POST', headers: authH(), body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (d.success) { showMsg('success', 'Meta hesabi baglandi!'); window.history.replaceState({}, '', window.location.pathname); loadAll() }
    } catch {}
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [conn, camp, alertsRes, statsRes] = await Promise.allSettled([
        fetch(`${API}/api/ads/connection`, { headers: authH() }),
        fetch(`${API}/api/ads/my-campaigns`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/alerts`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/dashboard`, { headers: authH() }),
      ])
      if (conn.status === 'fulfilled') { const d = await (conn.value as any).json(); setConnected(d.connected); setAdAccount(d.adAccount) }
      if (camp.status === 'fulfilled') { const d = await (camp.value as any).json(); setCampaigns(d.campaigns || []) }
      if (alertsRes.status === 'fulfilled') { const d = await (alertsRes.value as any).json(); setAlerts(d.alerts || []) }
      if (statsRes.status === 'fulfilled') { const d = await (statsRes.value as any).json(); setStats(d.summary) }
    } catch {}
    setLoading(false)
  }

  async function connectMeta() {
    try {
      const r = await fetch(`${API}/api/ads/oauth-url`, { headers: authH() })
      const d = await r.json()
      window.location.href = d.url + '&state=meta'
    } catch (e: any) { showMsg('error', e.message) }
  }

  async function extractLeads() {
    setExtracting(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/extract-leads`, { headers: authH() })
      const d = await r.json()
      if (d.ok) { setLeadsExtracted(d.new_leads); showMsg('success', `${d.new_leads} yeni lead eklendi`) }
    } catch (e: any) { showMsg('error', e.message) }
    setExtracting(false)
  }

  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-5 h-5 animate-spin text-slate-600"/>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${msg.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reklam Merkezi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Meta Ads — otomatik lead cekme ve performans izleme</p>
        </div>
        <button onClick={loadAll} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
          <RefreshCw className="w-4 h-4"/>
        </button>
      </div>

      {!connected ? (
        /* Baglanmamis */
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto">
              <Link className="w-6 h-6 text-blue-400"/>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Meta Ads Bagla</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">Facebook ve Instagram reklamlarinizi baglayarak otomatik lead cekme ve performans izleme ozelliklerini aktif edin.</p>
            </div>
            <button onClick={connectMeta}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition text-sm">
              Meta Hesabimi Bagla
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Durum Bari */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-emerald-400 text-xs font-medium">Bagli</span>
            </div>
            <div className="w-px h-4 bg-slate-700"/>
            <span className="text-slate-400 text-xs">{adAccount?.name || 'Meta Ads'}</span>
            <div className="w-px h-4 bg-slate-700"/>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-slate-500"/>
              <span className="text-slate-500 text-xs">Her 30 dk otomatik sync</span>
            </div>
            {alerts.length > 0 && (
              <>
                <div className="w-px h-4 bg-slate-700"/>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400"/>
                  <span className="text-amber-400 text-xs">{alerts.length} uyari</span>
                </div>
              </>
            )}
          </div>

          {/* Metrik Kartlari */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Toplam Harcama', value: `$${parseFloat(stats.spend || 0).toFixed(2)}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/8' },
                { label: 'Erisim', value: parseInt(stats.reach || 0).toLocaleString(), icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/8' },
                { label: 'Tiklama', value: parseInt(stats.clicks || 0).toLocaleString(), icon: MousePointer, color: 'text-teal-400', bg: 'bg-teal-400/8' },
                { label: 'CTR', value: `%${parseFloat(stats.ctr || 0).toFixed(2)}`, icon: Activity, color: parseFloat(stats.ctr) > 1 ? 'text-emerald-400' : 'text-red-400', bg: 'bg-slate-700/40' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500">{label}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`}/>
                    </div>
                  </div>
                  <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ana Aksiyonlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Lead Cek */}
            <button onClick={extractLeads} disabled={extracting}
              className="group flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/40 rounded-2xl transition-all text-left">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${extracting ? 'bg-blue-500/20' : 'bg-slate-700/60 group-hover:bg-blue-500/15'}`}>
                {extracting ? <RefreshCw className="w-4 h-4 text-blue-400 animate-spin"/> : <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition"/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{extracting ? 'Cekiliyor...' : 'Leadleri Cek'}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {leadsExtracted > 0 ? `Son: ${leadsExtracted} lead eklendi` : 'Tum reklamlardan CRM\'e aktar'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition shrink-0"/>
            </button>

            {/* Performans */}
            <button onClick={() => window.location.href = '/ads/intelligence'}
              className="group flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/40 rounded-2xl transition-all text-left">
              <div className="w-10 h-10 bg-slate-700/60 group-hover:bg-purple-500/15 rounded-xl flex items-center justify-center shrink-0 transition">
                <BarChart2 className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">AI Analiz</p>
                <p className="text-slate-500 text-xs mt-0.5">Performans & optimizasyon</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition shrink-0"/>
            </button>

            {/* Otomatik Sistem */}
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-emerald-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">7/24 Aktif</p>
                <p className="text-slate-500 text-xs mt-0.5">Otomatik lead & izleme</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"/>
            </div>
          </div>

          {/* Uyarilar */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Uyarilar</p>
              {alerts.slice(0, 3).map((alert: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${alert.severity === 'critical' ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{alert.campaign_name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-teal-400 text-xs mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3"/> {alert.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Kampanya Listesi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kampanyalar</p>
              <span className="text-xs text-slate-600">{activeCount} aktif / {campaigns.length} toplam</span>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
              {campaigns.length === 0 ? (
                <div className="text-center py-10">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 text-slate-700"/>
                  <p className="text-slate-600 text-sm">Kampanya bulunamadi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/30">
                  {campaigns.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-700/20 transition group">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{c.name}</p>
                        <p className="text-slate-600 text-xs mt-0.5">{c.objective || 'Meta Kampanyasi'}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-700/50'}`}>
                        {c.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}