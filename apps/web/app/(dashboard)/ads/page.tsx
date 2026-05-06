'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RefreshCw, Users, AlertTriangle, CheckCircle, Link,
  Zap, Target, TrendingUp, Bell, ChevronRight, BarChart2,
  Wifi, DollarSign, Eye, MousePointer, Activity, ChevronDown,
  ArrowUpRight, Plus, Send, Filter, Search, X, Check,
  Building2, Phone, Mail, Globe, Layers
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

export default function AdsPage() {
  const searchParams = useSearchParams()

  // Baglanti
  const [connected, setConnected] = useState(false)
  const [adAccounts, setAdAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [accountDropdown, setAccountDropdown] = useState(false)

  // Veri
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [metaLeads, setMetaLeads] = useState<any[]>([])

  // UI
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState<'overview' | 'campaigns' | 'leads' | 'alerts'>('overview')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

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
      if (d.success) {
        showMsg('success', 'Meta hesabi baglandi!')
        window.history.replaceState({}, '', window.location.pathname)
        loadAll()
      }
    } catch {}
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [conn, camp, alertsRes, statsRes, leadsRes] = await Promise.allSettled([
        fetch(`${API}/api/ads/connection`, { headers: authH() }),
        fetch(`${API}/api/ads/my-campaigns`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/alerts`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/dashboard`, { headers: authH() }),
        fetch(`${API}/api/leads?limit=100&source=meta`, { headers: authH() }),
      ])

      if (conn.status === 'fulfilled') {
        const d = await (conn.value as any).json()
        setConnected(d.connected)
        if (d.adAccounts) setAdAccounts(d.adAccounts)
        if (d.adAccount) setSelectedAccount(d.adAccount)
      }
      if (camp.status === 'fulfilled') {
        const d = await (camp.value as any).json()
        setCampaigns(d.campaigns || [])
      }
      if (alertsRes.status === 'fulfilled') {
        const d = await (alertsRes.value as any).json()
        setAlerts(d.alerts || [])
      }
      if (statsRes.status === 'fulfilled') {
        const d = await (statsRes.value as any).json()
        setStats(d.summary)
      }
      if (leadsRes.status === 'fulfilled') {
        const d = await (leadsRes.value as any).json()
        setMetaLeads((d.leads || []).filter((l: any) => l.source?.startsWith('meta')))
      }
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
      if (d.ok) {
        showMsg('success', `${d.new_leads} yeni lead CRM'e eklendi!`)
        setMetaLeads(d.leads || [])
        setTab('leads')
      } else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setExtracting(false)
  }

  async function exportToLeads() {
    const toExport = selectedLeads.length > 0
      ? filteredLeads.filter(l => selectedLeads.includes(l.meta_lead_id || l.id))
      : filteredLeads

    if (!toExport.length) return showMsg('error', 'Aktarilacak lead yok')
    setExporting(true)
    try {
      let exported = 0
      for (const lead of toExport) {
        try {
          await fetch(`${API}/api/leads`, {
            method: 'POST', headers: authH(),
            body: JSON.stringify({
              company_name: lead.company || lead.name || 'Meta Lead',
              contact_name: lead.name,
              email: lead.email,
              phone: lead.phone,
              source: lead.source || 'meta',
              notes: `Meta reklamdan aktarildi`,
            }),
          })
          exported++
        } catch {}
      }
      setExportSuccess(true)
      showMsg('success', `${exported} lead Leads sayfasina aktarildi!`)
      setTimeout(() => setExportSuccess(false), 3000)
      setSelectedLeads([])
    } catch (e: any) { showMsg('error', e.message) }
    setExporting(false)
  }

  const filteredLeads = metaLeads.filter(l => {
    if (!leadSearch) return true
    const q = leadSearch.toLowerCase()
    return (l.company_name || l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q) ||
      (l.email || '').toLowerCase().includes(q)
  })

  function toggleLead(id: string) {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (selectedLeads.length === filteredLeads.length) setSelectedLeads([])
    else setSelectedLeads(filteredLeads.map(l => l.meta_lead_id || l.id))
  }

  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-5 h-5 animate-spin text-slate-600"/>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-red-500/30 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Reklam Merkezi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Meta Ads — otomatik lead cekme, performans izleme</p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <button onClick={() => setTab('alerts')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium hover:bg-amber-500/15 transition">
              <AlertTriangle className="w-3.5 h-3.5"/>
              {alerts.length} uyari
            </button>
          )}
          <button onClick={loadAll} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {!connected ? (
        <div className="max-w-lg mx-auto pt-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"/>
            <div className="relative space-y-6">
              <div className="w-12 h-12 bg-blue-500/15 border border-blue-500/20 rounded-xl flex items-center justify-center">
                <Link className="w-5 h-5 text-blue-400"/>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Meta Ads Bagla</h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">Facebook ve Instagram reklamlarinizi baglayin. Tum reklam turlerinden otomatik lead toplama ve 7/24 performans izleme baslasin.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users, label: 'Otomatik Lead' },
                  { icon: Activity, label: 'Canli Izleme' },
                  { icon: Zap, label: 'AI Analiz' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-slate-800/80 rounded-xl">
                    <Icon className="w-4 h-4 text-slate-400"/>
                    <span className="text-slate-400 text-xs">{label}</span>
                  </div>
                ))}
              </div>
              <button onClick={connectMeta} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition text-sm">
                Meta Hesabimi Bagla
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Hesap Secici + Durum */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Hesap dropdown */}
            <div className="relative">
              <button onClick={() => setAccountDropdown(!accountDropdown)}
                className="flex items-center gap-2.5 pl-3 pr-2.5 py-2 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition">
                <div className="w-5 h-5 bg-blue-500/20 rounded flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-blue-400"/>
                </div>
                <span className="text-white text-sm font-medium max-w-[140px] truncate">
                  {selectedAccount?.name || 'Hesap Sec'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition ${accountDropdown ? 'rotate-180' : ''}`}/>
              </button>
              {accountDropdown && adAccounts.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {adAccounts.map((acc: any) => (
                    <button key={acc.id} onClick={() => { setSelectedAccount(acc); setAccountDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 transition text-left ${selectedAccount?.id === acc.id ? 'bg-slate-700' : ''}`}>
                      <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-blue-400"/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{acc.name}</p>
                        <p className="text-slate-500 text-xs">{acc.id}</p>
                      </div>
                      {selectedAccount?.id === acc.id && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0"/>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Durum badges */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-emerald-400 text-xs font-medium">Bagli</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl">
              <Wifi className="w-3.5 h-3.5 text-slate-500"/>
              <span className="text-slate-500 text-xs">30 dk sync</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl">
              <Activity className="w-3.5 h-3.5 text-slate-500"/>
              <span className="text-slate-500 text-xs">{activeCount} aktif kampanya</span>
            </div>

            <button onClick={extractLeads} disabled={extracting}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition">
              {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>}
              {extracting ? 'Cekiliyor...' : 'Leadleri Cek'}
            </button>
          </div>

          {/* Metrikler */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Toplam Harcama', value: `$${parseFloat(stats.spend || 0).toFixed(2)}`, icon: DollarSign, color: 'text-amber-400', border: 'border-amber-500/15', bg: 'bg-amber-500/8' },
                { label: 'Erisim', value: parseInt(stats.reach || 0).toLocaleString(), icon: Eye, color: 'text-blue-400', border: 'border-blue-500/15', bg: 'bg-blue-500/8' },
                { label: 'Tiklamalar', value: parseInt(stats.clicks || 0).toLocaleString(), icon: MousePointer, color: 'text-teal-400', border: 'border-teal-500/15', bg: 'bg-teal-500/8' },
                { label: 'CTR', value: `%${parseFloat(stats.ctr || 0).toFixed(2)}`, icon: Activity, color: parseFloat(stats.ctr) > 1 ? 'text-emerald-400' : 'text-slate-300', border: 'border-slate-600/50', bg: 'bg-slate-700/30' },
              ].map(({ label, value, icon: Icon, color, border, bg }) => (
                <div key={label} className={`relative overflow-hidden bg-slate-800/40 border ${border} rounded-2xl p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`}/>
                    </div>
                  </div>
                  <p className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 w-fit">
            {[
              ['overview', 'Genel Bakis'],
              ['campaigns', `Kampanyalar (${campaigns.length})`],
              ['leads', `Leadler (${metaLeads.length})`],
              ['alerts', `Uyarilar ${alerts.length > 0 ? `(${alerts.length})` : ''}`],
            ].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
            ))}
          </div>

          {/* GENEL BAKIS */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Son Kampanyalar */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                  <p className="text-sm font-medium text-white">Son Kampanyalar</p>
                  <button onClick={() => setTab('campaigns')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    Tumu <ChevronRight className="w-3 h-3"/>
                  </button>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {campaigns.slice(0, 4).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                      <p className="text-white text-sm flex-1 truncate">{c.name}</p>
                      <span className={`text-xs font-medium ${c.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {c.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  ))}
                  {campaigns.length === 0 && <div className="px-4 py-8 text-center text-slate-600 text-sm">Kampanya yok</div>}
                </div>
              </div>

              {/* Son Leadler + Hizli Aktar */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                  <p className="text-sm font-medium text-white">Son Leadler</p>
                  <button onClick={() => setTab('leads')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    Tumu <ChevronRight className="w-3 h-3"/>
                  </button>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {metaLeads.slice(0, 4).map((lead: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center text-xs font-medium text-blue-400 shrink-0">
                        {(lead.company_name || lead.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{lead.company_name || lead.name || 'Anonim'}</p>
                        <p className="text-slate-500 text-xs">{lead.phone || lead.email || lead.source}</p>
                      </div>
                      <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">Yeni</span>
                    </div>
                  ))}
                  {metaLeads.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <p className="text-slate-600 text-sm">Henuz lead yok</p>
                      <button onClick={extractLeads} className="mt-2 text-xs text-blue-400 hover:text-blue-300">Lead Cek →</button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Analiz butonu */}
              <div className="md:col-span-2">
                <button onClick={() => window.location.href = '/ads/intelligence'}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/8 to-blue-500/8 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center">
                      <BarChart2 className="w-4 h-4 text-purple-400"/>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">AI Performans Analizi</p>
                      <p className="text-slate-500 text-xs">Kampanya optimizasyon onerileri, uyarilar, AI reklam metni</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition"/>
                </button>
              </div>
            </div>
          )}

          {/* KAMPANYALAR */}
          {tab === 'campaigns' && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700/50 flex items-center justify-between">
                <p className="text-sm font-medium text-white">{campaigns.length} Kampanya</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{activeCount} aktif</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"/>{campaigns.length - activeCount} pasif</span>
                </div>
              </div>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-40"/>
                  <p className="text-sm">Kampanya bulunamadi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/30">
                  {campaigns.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${c.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{c.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-slate-500 text-xs">{c.objective || 'Meta Kampanyasi'}</span>
                          {c.daily_budget && <span className="text-slate-600 text-xs">Butce: ${(c.daily_budget/100).toFixed(0)}/gun</span>}
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-700/50 border border-slate-600/50'}`}>
                        {c.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEADLER */}
          {tab === 'leads' && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                  <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                    placeholder="Lead ara..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"/>
                </div>

                {selectedLeads.length > 0 && (
                  <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl">
                    {selectedLeads.length} secildi
                  </span>
                )}

                <button onClick={exportToLeads} disabled={exporting || filteredLeads.length === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${exportSuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'}`}>
                  {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : exportSuccess ? <CheckCircle className="w-3.5 h-3.5"/> : <Send className="w-3.5 h-3.5"/>}
                  {exporting ? 'Aktariliyor...' : exportSuccess ? 'Aktarildi!' : selectedLeads.length > 0 ? `${selectedLeads.length} Leadi Aktar` : 'Tumunu Aktar'}
                </button>

                <button onClick={extractLeads} disabled={extracting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition">
                  {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5"/>}
                  Yenile
                </button>
              </div>

              {/* Lead tablosu */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Tablo header */}
                <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-700/50 bg-slate-800/60">
                  <div className="w-5 flex items-center justify-center">
                    <button onClick={toggleAll}
                      className={`w-4 h-4 rounded border transition ${selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-600 hover:border-slate-500'} flex items-center justify-center`}>
                      {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 && <Check className="w-2.5 h-2.5 text-white"/>}
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-500 flex-1">LEAD</p>
                  <p className="text-xs font-medium text-slate-500 w-32 hidden md:block">ILETISIM</p>
                  <p className="text-xs font-medium text-slate-500 w-28 hidden md:block">KAYNAK</p>
                  <p className="text-xs font-medium text-slate-500 w-20 text-right">AKTAR</p>
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="text-center py-14">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-700"/>
                    <p className="text-slate-500 text-sm font-medium">Henuz lead yok</p>
                    <p className="text-slate-600 text-xs mt-1">Leadleri Cek butonuna basin</p>
                    <button onClick={extractLeads} disabled={extracting}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm mx-auto">
                      {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>}
                      Leadleri Cek
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {filteredLeads.map((lead: any, i: number) => {
                      const lid = lead.meta_lead_id || lead.id || String(i)
                      const isSelected = selectedLeads.includes(lid)
                      return (
                        <div key={lid} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/20 transition ${isSelected ? 'bg-blue-500/5' : ''}`}>
                          <div className="w-5 flex items-center justify-center">
                            <button onClick={() => toggleLead(lid)}
                              className={`w-4 h-4 rounded border transition flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 hover:border-slate-500'}`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white"/>}
                            </button>
                          </div>

                          {/* Lead bilgisi */}
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-sm font-medium text-slate-300 shrink-0">
                              {(lead.company_name || lead.name || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{lead.company_name || lead.name || 'Anonim Lead'}</p>
                              {lead.contact_name && lead.contact_name !== lead.company_name && (
                                <p className="text-slate-500 text-xs truncate">{lead.contact_name}</p>
                              )}
                            </div>
                          </div>

                          {/* Iletisim */}
                          <div className="w-32 hidden md:block">
                            {lead.phone && (
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <Phone className="w-3 h-3 shrink-0"/>
                                <span className="truncate">{lead.phone}</span>
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                                <Mail className="w-3 h-3 shrink-0"/>
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Kaynak */}
                          <div className="w-28 hidden md:block">
                            <span className={`text-xs px-2 py-0.5 rounded-md ${lead.source === 'meta_lead_form' ? 'bg-blue-500/10 text-blue-400' : lead.source?.includes('messenger') ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                              {lead.source === 'meta_lead_form' ? 'Lead Form' : lead.source?.includes('messenger') ? 'Messenger' : 'Meta'}
                            </span>
                          </div>

                          {/* Tek aktar */}
                          <div className="w-20 flex justify-end">
                            <button onClick={async () => {
                              try {
                                await fetch(`${API}/api/leads`, {
                                  method: 'POST', headers: authH(),
                                  body: JSON.stringify({
                                    company_name: lead.company_name || lead.name || 'Meta Lead',
                                    contact_name: lead.contact_name || lead.name,
                                    email: lead.email, phone: lead.phone,
                                    source: lead.source || 'meta',
                                  }),
                                })
                                showMsg('success', 'Lead aktarildi!')
                              } catch { showMsg('error', 'Hata') }
                            }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-blue-600 border border-slate-600 hover:border-blue-500 rounded-lg text-xs text-slate-300 hover:text-white transition">
                              <Send className="w-3 h-3"/>
                              Aktar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Footer */}
                {filteredLeads.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50 bg-slate-800/40">
                    <p className="text-xs text-slate-500">{filteredLeads.length} lead</p>
                    <button onClick={exportToLeads} disabled={exporting}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
                      {exporting ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>}
                      {selectedLeads.length > 0 ? `${selectedLeads.length} Seciliyi Aktar` : 'Tumunu Aktar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UYARILAR */}
          {tab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-14 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-700"/>
                  <p className="text-white font-medium">Hicbir uyari yok</p>
                  <p className="text-slate-500 text-sm mt-1">Tum reklamlar iyi performans gosteriyor</p>
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
                        <div className="flex items-center gap-2 mt-2.5 p-2.5 bg-slate-800/60 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>
                          <p className="text-teal-400 text-xs">{alert.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}