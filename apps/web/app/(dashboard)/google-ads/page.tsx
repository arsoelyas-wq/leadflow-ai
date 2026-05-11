﻿﻿﻿'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import CampaignWizard from './CampaignWizard'
import {
  RefreshCw, Users, AlertTriangle, CheckCircle, Link,
  Zap, Target, Bell, ChevronRight, BarChart2, Wifi,
  DollarSign, Eye, MousePointer, Activity, ArrowUpRight,
  Send, Search, Check, Clock, Database, Shield,
  Sparkles, Settings, TrendingUp, TrendingDown, X
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

export default function GoogleAdsPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [connection, setConnection] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [optimization, setOptimization] = useState<any>(null)
  const [tab, setTab] = useState<'overview' | 'campaigns' | 'leads' | 'alerts'>('overview')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [exportSuccess, setExportSuccess] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [adSettings, setAdSettings] = useState<any>({ five_minute_rule: true, call_delay_minutes: 5 })
  const [showWizard, setShowWizard] = useState(false)
  const [createdCampaigns, setCreatedCampaigns] = useState<any[]>([])
  const [businessProfile, setBusinessProfile] = useState<any>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    // window.location.search is always accurate; useSearchParams() can be empty
    // on static pages before Next.js hydration completes
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const gcode = params.get('gcode')
    const googleSuccess = params.get('google_success')
    const errorParam = params.get('error')

    if (errorParam) {
      const msg = errorParam === 'denied' ? 'Google Ads baglantisi iptal edildi.' : decodeURIComponent(errorParam)
      showMsg('error', msg)
      window.history.replaceState({}, '', '/google-ads')
      loadAll()
    } else if (code) {
      exchangeToken(code)
    } else if (gcode) {
      exchangeToken(gcode)
    } else if (googleSuccess) {
      const t = params.get('_t')
      if (t) localStorage.setItem('token', decodeURIComponent(t))
      showMsg('success', 'Google Ads baglandi!')
      window.history.replaceState({}, '', '/google-ads')
      loadAll()
    } else {
      loadAll()
    }
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/google-ads/exchange-token`, {
        method: 'POST', headers: authH(), body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (d.success) {
        showMsg('success', 'Google Ads baglandi!')
        window.history.replaceState({}, '', window.location.pathname)
      } else {
        showMsg('error', d.error || 'Baglanti hatasi')
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch (e: any) {
      showMsg('error', 'Baglanti saglanamadi: ' + e.message)
    } finally {
      loadAll()
    }
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [conn, camp, dash, settingsRes, createdRes, profileRes] = await Promise.allSettled([
        fetch(`${API}/api/google-intelligence/connection`, { headers: authH() }),
        fetch(`${API}/api/google-intelligence/campaigns`, { headers: authH() }),
        fetch(`${API}/api/google-intelligence/dashboard`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/ad-settings`, { headers: authH() }),
        fetch(`${API}/api/google-campaign/list`, { headers: authH() }),
        fetch(`${API}/api/settings/business-profile`, { headers: authH() }),
      ])
      if (conn.status === 'fulfilled') {
        const d = await (conn.value as any).json()
        setConnected(d.connected)
        setConnection(d.connection)
      }
      if (camp.status === 'fulfilled') { const d = await (camp.value as any).json(); setCampaigns(d.campaigns || []) }
      if (dash.status === 'fulfilled') {
        const d = await (dash.value as any).json()
        setStats(d.summary)
        setAlerts(d.alerts || [])
        setLeads(d.recent_leads || [])
      }
      if (settingsRes.status === 'fulfilled') { const d = await (settingsRes.value as any).json(); if (d.settings) setAdSettings(d.settings) }
      if (createdRes.status === 'fulfilled') { const d = await (createdRes.value as any).json(); setCreatedCampaigns(d.campaigns || []) }
      if (profileRes.status === 'fulfilled') { const d = await (profileRes.value as any).json(); if (d.profile || d.business_profile) setBusinessProfile(d.profile || d.business_profile) }
    } catch {}
    setLoading(false)
  }

  async function connectGoogle() {
    try {
      const r = await fetch(`${API}/api/google-ads/oauth-url`, { headers: authH() })
      const d = await r.json()
      window.location.href = d.url
    } catch (e: any) { showMsg('error', e.message) }
  }

  async function extractLeads() {
    setExtracting(true)
    try {
      const r = await fetch(`${API}/api/google-intelligence/extract-leads`, { headers: authH() })
      const d = await r.json()
      if (d.ok) {
        showMsg('success', `${d.new_leads} yeni lead eklendi!${adSettings.five_minute_rule && d.new_leads > 0 ? ' 5 dk icinde arama yapilacak.' : ''}`)
        setLeads(d.leads || [])
        setTab('leads')
      } else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setExtracting(false)
  }

  async function analyzePerformance() {
    try {
      const r = await fetch(`${API}/api/google-intelligence/performance`, { headers: authH() })
      const d = await r.json()
      if (d.ok) { setAlerts(d.alerts || []); showMsg('success', `${d.total_alerts} uyari tespit edildi`) }
    } catch {}
  }

  async function optimizeCampaign(c: any) {
    setOptimizing(c.id)
    try {
      const r = await fetch(`${API}/api/google-intelligence/ai-optimize`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          campaignId: c.id, campaignName: c.name,
          metrics: { spend: c.spend, impressions: c.impressions, clicks: c.clicks, ctr: c.ctr, avg_cpc: c.avg_cpc, conversions: c.conversions, cost_per_conversion: c.cost_per_conversion },
        }),
      })
      const d = await r.json()
      if (d.ok) setOptimization({ ...d.analysis, campaignId: c.id })
    } catch {}
    setOptimizing(null)
  }

  async function exportToLeads() {
    const toExport = selectedLeads.length > 0
      ? filteredLeads.filter(l => selectedLeads.includes(l.id))
      : filteredLeads
    if (!toExport.length) return
    setExporting(true)
    let exported = 0
    for (const lead of toExport) {
      try {
        await fetch(`${API}/api/leads`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({ company_name: lead.company_name || lead.name || 'Google Lead', contact_name: lead.contact_name || lead.name, email: lead.email, phone: lead.phone, source: lead.source || 'google' }),
        })
        exported++
      } catch {}
    }
    setExportSuccess(true)
    showMsg('success', `${exported} lead aktarildi!`)
    setTimeout(() => setExportSuccess(false), 3000)
    setSelectedLeads([])
    setExporting(false)
  }

  const filteredLeads = leads.filter(l => {
    if (!leadSearch) return true
    const q = leadSearch.toLowerCase()
    return (l.company_name || l.name || '').toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.email || '').toLowerCase().includes(q)
  })

  function toggleLead(id: string) { setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }
  function toggleAll() { setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(l => l.id)) }

  const activeCount = campaigns.filter(c => c.status === 'ENABLED').length
  const tabCls = (t: string) => `px-3.5 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`
  const metricCols = [
    { label: 'Harcama',  value: stats ? `$${parseFloat(stats.spend||0).toFixed(2)}`         : '--', color: 'text-amber-400',   border: 'border-amber-500/15' },
    { label: 'Gosterim', value: stats ? parseInt(stats.impressions||0).toLocaleString()       : '--', color: 'text-blue-400',    border: 'border-blue-500/15' },
    { label: 'Tiklama',  value: stats ? parseInt(stats.clicks||0).toLocaleString()            : '--', color: 'text-teal-400',    border: 'border-teal-500/15' },
    { label: 'CTR',      value: stats ? `%${parseFloat(stats.ctr||0).toFixed(2)}`            : '--', color: stats && parseFloat(stats.ctr) > 2 ? 'text-emerald-400' : 'text-slate-400', border: 'border-slate-600/50' },
    { label: 'Ort. CPC', value: stats ? `$${parseFloat(stats.avg_cpc||0).toFixed(2)}`        : '--', color: 'text-slate-300',   border: 'border-slate-600/50' },
    { label: 'Donusum',  value: stats ? parseInt(stats.conversions||0).toString()             : '--', color: 'text-purple-400',  border: 'border-purple-500/15' },
  ]

  return (
    <div className="space-y-5">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-red-500/30 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
          {msg.text}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span className="text-amber-400 font-bold text-sm">G</span>
            </div>
            Google Ads
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Arama, Display &amp; YouTube - AI analiz, 5dk kural, otomatik lead</p>
        </div>
        <div className="flex items-center gap-2">
          {connected && alerts.length > 0 && (
            <button onClick={() => setTab('alerts')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5"/> {alerts.length} uyari
            </button>
          )}
          {connected && (
            <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-900/20">
              <Sparkles className="w-3.5 h-3.5"/> Yeni Kampanya
            </button>
          )}
          <button onClick={loadAll} disabled={loading} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
      </div>

      {/* ── BAGLANTI KARTI (her zaman uste) ── */}
      {!connected ? (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 via-slate-800/60 to-slate-800/40 p-5">
          <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-amber-500/4 to-transparent pointer-events-none"/>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-amber-400"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white font-semibold text-sm">Google Ads Bagli Degil</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 border border-slate-600">Bekliyor</span>
              </div>
              <p className="text-slate-400 text-xs">Hesabinizi baglayin - reklam verileriniz otomatik senkronize edilsin</p>
              <div className="flex items-center gap-3 mt-2">
                {[
                  { icon: Users, label: 'Lead Form' },
                  { icon: Activity, label: 'Performans' },
                  { icon: Sparkles, label: 'AI Analiz' },
                  { icon: Clock, label: '5 Dk Kurali' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 text-xs text-slate-500">
                    <Icon className="w-3 h-3 text-slate-600"/> {label}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={connectGoogle}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition shrink-0 shadow-lg shadow-amber-900/20">
              <Link className="w-4 h-4"/> Google Ads Bagla
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-emerald-400 text-sm font-semibold">Bagli</span>
            </div>
            {connection?.google_email && (
              <span className="text-slate-400 text-xs px-2.5 py-1 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                {connection.google_email}
              </span>
            )}
            {connection?.customer_name && (
              <span className="text-slate-300 text-xs px-2.5 py-1 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                {connection.customer_name}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Wifi className="w-3 h-3"/> Her 30 dk sync
            </div>
            {adSettings.five_minute_rule && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Clock className="w-3 h-3 text-amber-400"/>
                <span className="text-amber-400 text-xs font-medium">5 Dk Kural Aktif</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={analyzePerformance}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition">
                <BarChart2 className="w-3.5 h-3.5"/> Analiz Et
              </button>
              <button onClick={extractLeads} disabled={extracting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition">
                {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>}
                {extracting ? 'Cekiliyor...' : 'Leadleri Cek'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── METRIK GRID (her zaman gorunur) ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {metricCols.map(({ label, value, color, border }) => (
          <div key={label} className={`bg-slate-800/40 border ${border} rounded-2xl p-4 ${!connected ? 'opacity-50' : ''}`}>
            <p className="text-xs text-slate-500 mb-2">{label}</p>
            <p className={`text-xl font-semibold tracking-tight ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 overflow-x-auto w-fit">
        {([
          ['overview',   'Genel Bakis'],
          ['campaigns',  `Kampanyalar${campaigns.length ? ` (${campaigns.length})` : ''}`],
          ['leads',      `Leadler${leads.length ? ` (${leads.length})` : ''}`],
          ['alerts',     `Uyarilar${alerts.length ? ` (${alerts.length})` : ''}`],
        ] as [string, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* ── GENEL BAKIS ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kampanyalar */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/50">
              <p className="text-sm font-medium text-white">Son Kampanyalar</p>
              <button onClick={() => setTab('campaigns')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">Tumu <ChevronRight className="w-3 h-3"/></button>
            </div>
            <div className="divide-y divide-slate-700/30">
              {campaigns.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === 'ENABLED' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{c.name}</p>
                    <p className="text-slate-500 text-xs">CTR: %{c.ctr} - CPC: ${c.avg_cpc}</p>
                  </div>
                  <span className={`text-xs ${c.status === 'ENABLED' ? 'text-emerald-400' : 'text-slate-500'}`}>{c.status === 'ENABLED' ? 'Aktif' : 'Pasif'}</span>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 text-slate-700"/>
                  <p className="text-slate-600 text-sm">{connected ? 'Kampanya bulunamadi' : 'Google Ads baglayinca kampanyalariniz gorunecek'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Leadler */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/50">
              <p className="text-sm font-medium text-white">Son Leadler</p>
              <button onClick={() => setTab('leads')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">Tumu <ChevronRight className="w-3 h-3"/></button>
            </div>
            <div className="divide-y divide-slate-700/30">
              {leads.slice(0, 5).map((lead: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 bg-amber-500/15 rounded-lg flex items-center justify-center text-xs font-medium text-amber-400 shrink-0">
                    {(lead.company_name || lead.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{lead.company_name || lead.name || 'Google Lead'}</p>
                    <p className="text-slate-500 text-xs">{lead.phone || lead.email || lead.source}</p>
                  </div>
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Yeni</span>
                </div>
              ))}
              {leads.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-700"/>
                  <p className="text-slate-600 text-sm">{connected ? 'Henuz lead yok' : 'Google Ads baglayinca leadleriniz gorunecek'}</p>
                  {connected && <button onClick={extractLeads} className="mt-1.5 text-xs text-amber-400 hover:text-amber-300">Lead Cek</button>}
                </div>
              )}
            </div>
          </div>

          {/* Sistem durumu */}
          <div className="md:col-span-2 grid grid-cols-3 gap-3">
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${adSettings.five_minute_rule ? 'bg-amber-500/8 border-amber-500/20' : 'bg-slate-800/40 border-slate-700/50'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${adSettings.five_minute_rule ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
                <Clock className={`w-4 h-4 ${adSettings.five_minute_rule ? 'text-amber-400' : 'text-slate-500'}`}/>
              </div>
              <div>
                <p className="text-white text-sm font-medium">5 Dk Kurali</p>
                <p className={`text-xs ${adSettings.five_minute_rule ? 'text-amber-400' : 'text-slate-500'}`}>{adSettings.five_minute_rule ? 'Aktif' : 'Pasif'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-teal-500/8 border border-teal-500/20 rounded-xl">
              <div className="w-9 h-9 bg-teal-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 text-teal-400"/>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Conversion Tracking</p>
                <p className="text-teal-400 text-xs">Server-side aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center">
                <Zap className={`w-4 h-4 ${connected ? 'text-emerald-400' : 'text-slate-500'}`}/>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Otomatik Sync</p>
                <p className="text-slate-500 text-xs">Her 30 dakika</p>
                {connected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-1"/>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KAMPANYALAR ── */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          {/* AI ile oluşturulan kampanyalar */}
          {createdCampaigns.length > 0 && (
            <div className="bg-slate-800/40 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700/50 bg-amber-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400"/>
                  <p className="text-sm font-medium text-white">AI ile Oluşturulan Kampanyalar</p>
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">{createdCampaigns.length}</span>
                </div>
                <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition">
                  <Sparkles className="w-3 h-3"/> Yeni Ekle
                </button>
              </div>
              <div className="divide-y divide-slate-700/30">
                {createdCampaigns.map((c: any) => {
                  const statusColors: Record<string, string> = {
                    active: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
                    draft: 'text-slate-400 bg-slate-700/50 border-slate-600/50',
                    pending_api: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  }
                  const statusLabels: Record<string, string> = { active: 'Aktif', draft: 'Taslak', pending_api: 'Bekliyor' }
                  const statusDots: Record<string, string> = { active: 'bg-emerald-400', draft: 'bg-slate-600', pending_api: 'bg-amber-400' }
                  const plan = typeof c.campaign_plan === 'string' ? (() => { try { return JSON.parse(c.campaign_plan) } catch { return {} } })() : (c.campaign_plan || {})
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${statusDots[c.status] || 'bg-slate-600'}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{c.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                          <span>Bütçe: ${c.daily_budget}/gün</span>
                          {c.goal && <span>Hedef: {c.goal}</span>}
                          {plan.ad_groups?.length > 0 && <span>{plan.ad_groups.length} reklam grubu</span>}
                          {plan.keywords?.length > 0 && <span>{plan.keywords.length} anahtar kelime</span>}
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium border shrink-0 ${statusColors[c.status] || 'text-slate-400 bg-slate-700/50 border-slate-600/50'}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Google Ads API'dan gelen kampanyalar */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/60 flex items-center justify-between">
            <p className="text-sm font-medium text-white">{campaigns.length > 0 ? `${campaigns.length} Google Ads Kampanyası` : 'Google Ads Kampanyaları'}</p>
            {campaigns.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{activeCount} aktif</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"/>{campaigns.length - activeCount} pasif</span>
              </div>
            )}
          </div>
          <div className="divide-y divide-slate-700/30">
            {campaigns.map((c: any) => (
              <div key={c.id} className="group">
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'ENABLED' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span>Harcama: ${parseFloat(c.spend||0).toFixed(2)}</span>
                      <span>CTR: %{c.ctr}</span>
                      <span>CPC: ${c.avg_cpc}</span>
                      <span>Donusum: {c.conversions}</span>
                      {parseFloat(c.cost_per_conversion) > 0 && <span>CPA: ${parseFloat(c.cost_per_conversion).toFixed(2)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => optimizeCampaign(c)} disabled={optimizing === c.id}
                      className="hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-400 rounded-lg text-xs transition">
                      {optimizing === c.id ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                      AI Analiz
                    </button>
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 ${c.status === 'ENABLED' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-700/50 border border-slate-600/50'}`}>
                      {c.status === 'ENABLED' ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
                {optimization?.campaignId === c.id && (
                  <div className="mx-5 mb-4 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400"/>
                        <span className="text-amber-300 text-sm font-medium">AI Analiz Sonucu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${optimization.overall_score >= 7 ? 'text-emerald-400 bg-emerald-400/10' : optimization.overall_score >= 4 ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {optimization.overall_score}/10
                        </span>
                        <button onClick={() => setOptimization(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4"/></button>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm">{optimization.summary}</p>
                    {optimization.quick_wins?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 font-medium">HIZLI KAZANIMLAR:</p>
                        {optimization.quick_wins.map((win: any, i: number) => (
                          <div key={i} className={`p-3 rounded-xl border text-xs ${win.impact === 'high' ? 'bg-red-500/8 border-red-500/20' : 'bg-slate-800 border-slate-700'}`}>
                            <p className="text-white font-medium">{win.action}</p>
                            <p className="text-slate-500 mt-0.5">Etki: {win.impact}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {optimization.keyword_suggestions?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-1.5">ANAHTAR KELIME ONERILERI:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {optimization.keyword_suggestions.map((kw: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {optimization.negative_keywords?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-1.5">NEGATIF KELIMELER:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {optimization.negative_keywords.map((kw: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {optimization.ad_copy_alternatives?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-1.5">ALTERNATIF REKLAM METINLERI:</p>
                        {optimization.ad_copy_alternatives.map((copy: string, i: number) => (
                          <div key={i} className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 mb-1.5">{copy}</div>
                        ))}
                      </div>
                    )}
                    {optimization.bidding_suggestion && (
                      <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Teklif Stratejisi Onerisi:</p>
                        <p className="text-white text-sm">{optimization.bidding_suggestion}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="text-center py-14">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-700"/>
                <p className="text-slate-500 text-sm">{connected ? 'Kampanya bulunamadi' : 'Google Ads hesabinizi baglayin'}</p>
                {!connected && <button onClick={connectGoogle} className="mt-3 text-xs text-amber-400 hover:text-amber-300">Bagla</button>}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ── LEADLER ── */}
      {tab === 'leads' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
              <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Lead ara..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"/>
            </div>
            {selectedLeads.length > 0 && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">{selectedLeads.length} secildi</span>
            )}
            <button onClick={exportToLeads} disabled={exporting || filteredLeads.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${exportSuccess ? 'bg-emerald-600 text-white' : 'bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white'}`}>
              {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : exportSuccess ? <CheckCircle className="w-3.5 h-3.5"/> : <Send className="w-3.5 h-3.5"/>}
              {exporting ? 'Aktariliyor...' : exportSuccess ? 'Aktarildi!' : selectedLeads.length > 0 ? `${selectedLeads.length} Leadi Aktar` : 'Tumunu Aktar'}
            </button>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-700/50 bg-slate-800/60">
              <button onClick={toggleAll} className={`w-4 h-4 rounded border transition flex items-center justify-center shrink-0 ${selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? 'bg-amber-500 border-amber-500' : 'border-slate-600 hover:border-slate-500'}`}>
                {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 && <Check className="w-2.5 h-2.5 text-white"/>}
              </button>
              <p className="text-xs font-medium text-slate-500 flex-1">LEAD</p>
              <p className="text-xs font-medium text-slate-500 w-36 hidden md:block">ILETISIM</p>
              <p className="text-xs font-medium text-slate-500 w-24 hidden md:block">KAYNAK</p>
              <p className="text-xs font-medium text-slate-500 w-20 text-right">AKTAR</p>
            </div>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-14">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-700"/>
                <p className="text-slate-500 text-sm">{connected ? 'Henuz lead yok' : 'Google Ads hesabinizi baglayin'}</p>
                {connected && (
                  <button onClick={extractLeads} disabled={extracting}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm mx-auto">
                    {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>} Leadleri Cek
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-700/30">
                {filteredLeads.map((lead: any, i: number) => {
                  const lid = lead.id || String(i)
                  const isSel = selectedLeads.includes(lid)
                  return (
                    <div key={lid} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/15 transition group ${isSel ? 'bg-amber-500/5' : ''}`}>
                      <button onClick={() => toggleLead(lid)} className={`w-4 h-4 rounded border transition flex items-center justify-center shrink-0 ${isSel ? 'bg-amber-500 border-amber-500' : 'border-slate-600 hover:border-slate-500'}`}>
                        {isSel && <Check className="w-2.5 h-2.5 text-white"/>}
                      </button>
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-sm font-medium text-slate-300 shrink-0">
                          {(lead.company_name || lead.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{lead.company_name || lead.name || 'Google Lead'}</p>
                          {lead.contact_name && <p className="text-slate-500 text-xs truncate">{lead.contact_name}</p>}
                        </div>
                      </div>
                      <div className="w-36 hidden md:block space-y-0.5">
                        {lead.phone && <p className="text-slate-400 text-xs truncate">{lead.phone}</p>}
                        {lead.email && <p className="text-slate-400 text-xs truncate">{lead.email}</p>}
                      </div>
                      <div className="w-24 hidden md:block">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400">
                          {lead.source === 'google_lead_form' ? 'Lead Form' : lead.source === 'google_conversion' ? 'Conversion' : 'Google'}
                        </span>
                      </div>
                      <div className="w-20 flex justify-end">
                        <button onClick={async () => {
                          try {
                            await fetch(`${API}/api/leads`, { method: 'POST', headers: authH(), body: JSON.stringify({ company_name: lead.company_name || lead.name || 'Google Lead', contact_name: lead.contact_name || lead.name, email: lead.email, phone: lead.phone, source: lead.source || 'google' }) })
                            showMsg('success', 'Lead aktarildi!')
                          } catch { showMsg('error', 'Hata') }
                        }} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-amber-600/30 border border-slate-600 hover:border-amber-500/40 rounded-lg text-xs text-slate-300 hover:text-white transition">
                          <Send className="w-3 h-3"/> Aktar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {filteredLeads.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50 bg-slate-800/40">
                <p className="text-xs text-slate-500">{filteredLeads.length} lead</p>
                <button onClick={exportToLeads} disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
                  <Send className="w-3 h-3"/>
                  {selectedLeads.length > 0 ? `${selectedLeads.length} Seciliyi Aktar` : 'Tumunu Aktar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UYARILAR ── */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-14 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-700"/>
              <p className="text-white font-medium">{connected ? 'Uyari yok' : 'Baglanmadan uyari kontrolu yapilmaz'}</p>
              <p className="text-slate-500 text-sm mt-1">{connected ? 'Tum Google reklamlari iyi gidiyor' : 'Lutfen once Google Ads hesabinizi baglayin'}</p>
              {connected && (
                <button onClick={analyzePerformance} className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-sm mx-auto">
                  <BarChart2 className="w-4 h-4"/> Yeniden Analiz
                </button>
              )}
            </div>
          ) : (
            alerts.map((alert: any, i: number) => (
              <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl border ${alert.severity === 'critical' ? 'bg-red-500/6 border-red-500/20' : 'bg-amber-500/6 border-amber-500/20'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'critical' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                  <AlertTriangle className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}/>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${alert.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {alert.severity === 'critical' ? 'Kritik' : 'Uyari'}
                    </span>
                    <span className="text-white text-sm font-medium">{alert.campaign_name}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{alert.message}</p>
                  {alert.recommendation && (
                    <div className="flex items-start gap-2 mt-2.5 p-2.5 bg-slate-800/60 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5"/>
                      <p className="text-teal-400 text-xs">{alert.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── CAMPAIGN WIZARD ── */}
      {showWizard && (
        <CampaignWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(campaign) => {
            setCreatedCampaigns(prev => [campaign, ...prev.filter(c => c?.id !== campaign?.id)])
            showMsg('success', 'Kampanya oluşturuldu!')
            setTab('campaigns')
          }}
          businessProfile={businessProfile}
        />
      )}
    </div>
  )
}