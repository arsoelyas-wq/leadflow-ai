'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RefreshCw, Users, AlertTriangle, CheckCircle, Link,
  Zap, Target, Bell, ChevronRight, BarChart2, Wifi,
  DollarSign, Eye, MousePointer, Activity, ChevronDown,
  ArrowUpRight, Send, Search, X, Check, Building2,
  Phone, Mail, Layers, TrendingUp, Sparkles, Settings,
  Clock, Database, Shield
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

export default function AdsPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [adAccounts, setAdAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [accountDropdown, setAccountDropdown] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [metaLeads, setMetaLeads] = useState<any[]>([])
  const [audiences, setAudiences] = useState<any[]>([])
  const [adSettings, setAdSettings] = useState<any>({ five_minute_rule: true, call_delay_minutes: 5 })
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [creatingLookalike, setCreatingLookalike] = useState(false)
  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [optimization, setOptimization] = useState<any>(null)
  const [tab, setTab] = useState<'overview' | 'campaigns' | 'leads' | 'alerts' | 'automation' | 'audiences'>('overview')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [exportSuccess, setExportSuccess] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && searchParams.get('state') === 'meta') exchangeToken(code)
    else loadAll()
  }, [])

  async function exchangeToken(code: string) {
    try {
      const r = await fetch(`${API}/api/ads/exchange-token`, { method: 'POST', headers: authH(), body: JSON.stringify({ code }) })
      const d = await r.json()
      if (d.success) { showMsg('success', 'Meta baglandi!'); window.history.replaceState({}, '', window.location.pathname); loadAll() }
    } catch {}
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [conn, camp, dash, settingsRes] = await Promise.allSettled([
        fetch(`${API}/api/ads/connection`, { headers: authH() }),
        fetch(`${API}/api/ads/my-campaigns`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/dashboard`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/ad-settings`, { headers: authH() }),
      ])
      if (conn.status === 'fulfilled') {
        const d = await (conn.value as any).json()
        setConnected(d.connected)
        if (d.adAccounts?.length) setAdAccounts(d.adAccounts)
        if (d.adAccount) setSelectedAccount(d.adAccount)
      }
      if (camp.status === 'fulfilled') { const d = await (camp.value as any).json(); setCampaigns(d.campaigns || []) }
      if (dash.status === 'fulfilled') {
        const d = await (dash.value as any).json()
        setStats(d.summary)
        setAlerts(d.alerts || [])
        setMetaLeads(d.recent_leads || [])
        setAudiences(d.audiences || [])
        if (d.settings) setAdSettings(d.settings)
      }
      if (settingsRes.status === 'fulfilled') { const d = await (settingsRes.value as any).json(); if (d.settings) setAdSettings(d.settings) }
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
        showMsg('success', `${d.new_leads} yeni lead eklendi!${adSettings.five_minute_rule && d.new_leads > 0 ? ' 5 dk icinde arama yapilacak.' : ''}`)
        setMetaLeads(d.leads || [])
        setTab('leads')
      } else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setExtracting(false)
  }

  async function saveSettings() {
    try {
      await fetch(`${API}/api/ads-intelligence/five-minute-settings`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ enabled: adSettings.five_minute_rule, delay_minutes: adSettings.call_delay_minutes }),
      })
      showMsg('success', 'Ayarlar kaydedildi')
    } catch {}
  }

  async function createLookalike() {
    setCreatingLookalike(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/create-lookalike`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.ok) { showMsg('success', `Lookalike audience olusturuldu: ${d.name}`); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCreatingLookalike(false)
  }

  async function optimizeCampaign(c: any) {
    setOptimizing(c.id)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/ai-optimize`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ campaignId: c.id, campaignName: c.name, metrics: { spend: c.spend, impressions: c.impressions, clicks: c.clicks, ctr: c.ctr, cpm: c.cpm, reach: c.reach } }),
      })
      const d = await r.json()
      if (d.ok) setOptimization({ ...d.analysis, campaignId: c.id })
    } catch {}
    setOptimizing(null)
  }

  async function exportToLeads() {
    const toExport = selectedLeads.length > 0
      ? filteredLeads.filter(l => selectedLeads.includes(l.meta_lead_id || l.id))
      : filteredLeads
    if (!toExport.length) return
    setExporting(true)
    let exported = 0
    for (const lead of toExport) {
      try {
        await fetch(`${API}/api/leads`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({ company_name: lead.company_name || lead.name || 'Meta Lead', contact_name: lead.contact_name || lead.name, email: lead.email, phone: lead.phone, source: lead.source || 'meta' }),
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

  async function sendLeadQuality(leadId: string, quality: string) {
    await fetch(`${API}/api/ads-intelligence/lead-quality`, {
      method: 'POST', headers: authH(), body: JSON.stringify({ leadId, quality }),
    })
    showMsg('success', 'Meta\'ya geri besleme gonderildi')
  }

  const filteredLeads = metaLeads.filter(l => {
    if (!leadSearch) return true
    const q = leadSearch.toLowerCase()
    return (l.company_name || l.name || '').toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.email || '').toLowerCase().includes(q)
  })

  function toggleLead(id: string) { setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }
  function toggleAll() { setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(l => l.meta_lead_id || l.id)) }

  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length

  const tabCls = (t: string) => `px-3.5 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-slate-600"/></div>

  return (
    <div className="space-y-5">
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
          <p className="text-sm text-slate-500 mt-0.5">Meta Ads — 5dk kural, CAPI, Lookalike, AI optimizasyon</p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <button onClick={() => setTab('alerts')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5"/> {alerts.length} uyari
            </button>
          )}
          <button onClick={loadAll} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {!connected ? (
        <div className="max-w-lg mx-auto pt-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 space-y-6">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/5 rounded-full"/>
            <div className="w-12 h-12 bg-blue-500/15 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <Link className="w-5 h-5 text-blue-400"/>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Meta Ads Bagla</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">Reklamlarinizi baglayin. 5 dakika kurali, CAPI tracking, Lookalike audience ve AI optimizasyon otomatik aktif olur.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Clock, label: '5 Dk Kurali', desc: 'Lead gelince otomatik arama' },
                { icon: Database, label: 'CAPI Tracking', desc: 'Server-side donusum takibi' },
                { icon: Users, label: 'Lookalike', desc: 'Benzer kitle otomasyonu' },
                { icon: Sparkles, label: 'AI Analiz', desc: 'Claude optimizasyon' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 bg-slate-800/80 rounded-xl">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
                  <div><p className="text-white text-xs font-medium">{label}</p><p className="text-slate-500 text-xs">{desc}</p></div>
                </div>
              ))}
            </div>
            <button onClick={connectMeta} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition text-sm">
              Meta Hesabimi Bagla
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Hesap + Durum */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <button onClick={() => setAccountDropdown(!accountDropdown)}
                className="flex items-center gap-2.5 pl-3 pr-2.5 py-2 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition">
                <div className="w-5 h-5 bg-blue-500/20 rounded flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-blue-400"/>
                </div>
                <span className="text-white text-sm font-medium max-w-[160px] truncate">{selectedAccount?.name || 'Hesap Sec'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition ${accountDropdown ? 'rotate-180' : ''}`}/>
              </button>
              {accountDropdown && adAccounts.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-30 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-slate-700">
                    <p className="text-xs text-slate-500 font-medium">REKLAM HESAPLARI</p>
                  </div>
                  {adAccounts.map((acc: any) => (
                    <button key={acc.id} onClick={() => { setSelectedAccount(acc); setAccountDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-700/50 transition text-left ${selectedAccount?.id === acc.id ? 'bg-slate-700/30' : ''}`}>
                      <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-blue-400"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{acc.name}</p>
                        <p className="text-slate-500 text-xs">{acc.id} · {acc.currency}</p>
                      </div>
                      {selectedAccount?.id === acc.id && <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-emerald-400"/></div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-emerald-400 text-xs font-medium">Bagli</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl">
              <Wifi className="w-3.5 h-3.5 text-slate-500"/>
              <span className="text-slate-500 text-xs">30 dk sync</span>
            </div>
            {adSettings.five_minute_rule && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/8 border border-purple-500/15 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-purple-400"/>
                <span className="text-purple-400 text-xs">5 Dk Kural Aktif</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={extractLeads} disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition">
                {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>}
                {extracting ? 'Cekiliyor...' : 'Leadleri Cek'}
              </button>
            </div>
          </div>

          {/* Metrikler */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: 'Harcama', value: `$${parseFloat(stats.spend||0).toFixed(2)}`, icon: DollarSign, c: 'text-amber-400', b: 'border-amber-500/15' },
                { label: 'Erisim', value: parseInt(stats.reach||0).toLocaleString(), icon: Eye, c: 'text-blue-400', b: 'border-blue-500/15' },
                { label: 'Gosterim', value: parseInt(stats.impressions||0).toLocaleString(), icon: Layers, c: 'text-purple-400', b: 'border-purple-500/15' },
                { label: 'Tiklama', value: parseInt(stats.clicks||0).toLocaleString(), icon: MousePointer, c: 'text-teal-400', b: 'border-teal-500/15' },
                { label: 'CTR', value: `%${parseFloat(stats.ctr||0).toFixed(2)}`, icon: Activity, c: parseFloat(stats.ctr) > 1 ? 'text-emerald-400' : 'text-red-400', b: 'border-slate-600/50' },
                { label: 'CPM', value: `$${parseFloat(stats.cpm||0).toFixed(2)}`, icon: TrendingUp, c: 'text-slate-300', b: 'border-slate-600/50' },
              ].map(({ label, value, icon: Icon, c, b }) => (
                <div key={label} className={`bg-slate-800/40 border ${b} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <Icon className={`w-3.5 h-3.5 ${c}`}/>
                  </div>
                  <p className={`text-xl font-semibold tracking-tight ${c}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 overflow-x-auto">
            {[
              ['overview','Genel Bakis'],
              ['campaigns',`Kampanyalar (${campaigns.length})`],
              ['leads',`Leadler (${metaLeads.length})`],
              ['audiences',`Kitleler (${audiences.length})`],
              ['alerts',`Uyarilar${alerts.length > 0 ? ` (${alerts.length})` : ''}`],
              ['automation','Otomasyon'],
            ].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
            ))}
          </div>

          {/* GENEL BAKIS */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/50">
                  <p className="text-sm font-medium text-white">Son Kampanyalar</p>
                  <button onClick={() => setTab('campaigns')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">Tumu <ChevronRight className="w-3 h-3"/></button>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {campaigns.slice(0, 4).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                      <p className="text-white text-sm flex-1 truncate">{c.name}</p>
                      <span className={`text-xs ${c.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'}`}>{c.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}</span>
                    </div>
                  ))}
                  {campaigns.length === 0 && <div className="px-4 py-8 text-center text-slate-600 text-sm">Kampanya yok</div>}
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/50">
                  <p className="text-sm font-medium text-white">Son Leadler</p>
                  <button onClick={() => setTab('leads')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">Tumu <ChevronRight className="w-3 h-3"/></button>
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
                      <span className="text-xs text-blue-400 bg-blue-500/8 px-2 py-0.5 rounded-md">Yeni</span>
                    </div>
                  ))}
                  {metaLeads.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <p className="text-slate-600 text-sm">Henuz lead yok</p>
                      <button onClick={extractLeads} className="mt-1.5 text-xs text-blue-400">Lead Cek →</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sistem durumu */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${adSettings.five_minute_rule ? 'bg-purple-500/8 border-purple-500/20' : 'bg-slate-800/40 border-slate-700/50'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${adSettings.five_minute_rule ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
                    <Clock className={`w-4 h-4 ${adSettings.five_minute_rule ? 'text-purple-400' : 'text-slate-500'}`}/>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">5 Dk Kurali</p>
                    <p className={`text-xs ${adSettings.five_minute_rule ? 'text-purple-400' : 'text-slate-500'}`}>{adSettings.five_minute_rule ? `${adSettings.call_delay_minutes} dk gecikme ile aktif` : 'Pasif'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-teal-500/8 border border-teal-500/20 rounded-xl">
                  <div className="w-9 h-9 bg-teal-500/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 text-teal-400"/>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">CAPI Aktif</p>
                    <p className="text-teal-400 text-xs">Server-side tracking</p>
                  </div>
                </div>
                <button onClick={() => setTab('audiences')} className="flex items-center gap-3 p-4 bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/30 rounded-xl transition group">
                  <div className="w-9 h-9 bg-slate-700 group-hover:bg-blue-500/15 rounded-xl flex items-center justify-center transition">
                    <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition"/>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Lookalike Kitleler</p>
                    <p className="text-slate-500 text-xs">{audiences.length} kitle olusturuldu</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 ml-auto transition"/>
                </button>
              </div>

              <button onClick={() => window.location.href = '/ads/intelligence'}
                className="md:col-span-2 flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/8 to-blue-500/8 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl transition group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400"/>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">AI Performans Analizi</p>
                    <p className="text-slate-500 text-xs">Kampanya optimizasyonu, uyarilar, alternatif reklam metinleri</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition"/>
              </button>
            </div>
          )}

          {/* KAMPANYALAR */}
          {tab === 'campaigns' && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/60">
                  <p className="text-sm font-medium text-white">{campaigns.length} Kampanya</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{activeCount} aktif</span>
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"/>{campaigns.length - activeCount} pasif</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {campaigns.map((c: any) => (
                    <div key={c.id} className="group">
                      <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{c.name}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{c.objective || 'Meta'} {c.daily_budget && `· $${(c.daily_budget/100).toFixed(0)}/gun`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => optimizeCampaign(c)} disabled={optimizing === c.id}
                            className="hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-400 rounded-lg text-xs transition">
                            {optimizing === c.id ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                            AI Analiz
                          </button>
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-700/50 border border-slate-600/50'}`}>
                            {c.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                      {optimization?.campaignId === c.id && (
                        <div className="mx-5 mb-4 p-4 bg-purple-500/8 border border-purple-500/20 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400"/>
                              <span className="text-purple-300 text-sm font-medium">AI Analiz</span>
                            </div>
                            <div className={`text-sm font-bold px-2 py-0.5 rounded-lg ${optimization.overall_score >= 7 ? 'text-emerald-400 bg-emerald-400/10' : optimization.overall_score >= 4 ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'}`}>
                              {optimization.overall_score}/10
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm">{optimization.summary}</p>
                          {optimization.quick_wins?.map((win: any, i: number) => (
                            <div key={i} className={`p-3 rounded-xl border text-xs ${win.impact === 'high' ? 'bg-red-500/8 border-red-500/20' : 'bg-slate-800 border-slate-700'}`}>
                              <p className="text-white font-medium">{win.action}</p>
                              <p className="text-slate-500 mt-0.5">Etki: {win.impact} · Efor: {win.effort}</p>
                            </div>
                          ))}
                          {optimization.ad_copy_alternatives?.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs text-slate-500 font-medium">ALTERNATIF REKLAM METINLERI:</p>
                              {optimization.ad_copy_alternatives.map((copy: string, i: number) => (
                                <div key={i} className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">{copy}</div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setOptimization(null)} className="text-xs text-slate-500 hover:text-slate-300">Kapat</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {campaigns.length === 0 && <div className="text-center py-12 text-slate-600 text-sm">Kampanya bulunamadi</div>}
                </div>
              </div>
            </div>
          )}

          {/* LEADLER */}
          {tab === 'leads' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                  <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Lead ara..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"/>
                </div>
                {selectedLeads.length > 0 && (
                  <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl">{selectedLeads.length} secildi</span>
                )}
                <button onClick={exportToLeads} disabled={exporting || filteredLeads.length === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${exportSuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'}`}>
                  {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : exportSuccess ? <CheckCircle className="w-3.5 h-3.5"/> : <Send className="w-3.5 h-3.5"/>}
                  {exporting ? 'Aktariliyor...' : exportSuccess ? 'Aktarildi!' : selectedLeads.length > 0 ? `${selectedLeads.length} Leadi Aktar` : 'Tumunu Aktar'}
                </button>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-700/50 bg-slate-800/60">
                  <button onClick={toggleAll} className={`w-4 h-4 rounded border transition flex items-center justify-center shrink-0 ${selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-600 hover:border-slate-500'}`}>
                    {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 && <Check className="w-2.5 h-2.5 text-white"/>}
                  </button>
                  <p className="text-xs font-medium text-slate-500 flex-1">LEAD</p>
                  <p className="text-xs font-medium text-slate-500 w-36 hidden md:block">ILETISIM</p>
                  <p className="text-xs font-medium text-slate-500 w-24 hidden md:block">KAYNAK</p>
                  <p className="text-xs font-medium text-slate-500 w-32 text-right">AKSIYONLAR</p>
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="text-center py-14">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-700"/>
                    <p className="text-slate-500 text-sm">Henuz lead yok</p>
                    <button onClick={extractLeads} disabled={extracting}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm mx-auto">
                      {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>} Leadleri Cek
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {filteredLeads.map((lead: any, i: number) => {
                      const lid = lead.meta_lead_id || lead.id || String(i)
                      const isSel = selectedLeads.includes(lid)
                      return (
                        <div key={lid} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/15 transition group ${isSel ? 'bg-blue-500/5' : ''}`}>
                          <button onClick={() => toggleLead(lid)} className={`w-4 h-4 rounded border transition flex items-center justify-center shrink-0 ${isSel ? 'bg-blue-500 border-blue-500' : 'border-slate-600 hover:border-slate-500'}`}>
                            {isSel && <Check className="w-2.5 h-2.5 text-white"/>}
                          </button>
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-sm font-medium text-slate-300 shrink-0">
                              {(lead.company_name || lead.name || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{lead.company_name || lead.name || 'Anonim Lead'}</p>
                              {lead.contact_name && <p className="text-slate-500 text-xs truncate">{lead.contact_name}</p>}
                            </div>
                          </div>
                          <div className="w-36 hidden md:block space-y-0.5">
                            {lead.phone && <div className="flex items-center gap-1.5 text-slate-400 text-xs"><Phone className="w-3 h-3 shrink-0"/><span className="truncate">{lead.phone}</span></div>}
                            {lead.email && <div className="flex items-center gap-1.5 text-slate-400 text-xs"><Mail className="w-3 h-3 shrink-0"/><span className="truncate">{lead.email}</span></div>}
                          </div>
                          <div className="w-24 hidden md:block">
                            <span className={`text-xs px-2 py-0.5 rounded-md ${lead.source === 'meta_lead_form' ? 'bg-blue-500/10 text-blue-400' : lead.source?.includes('messenger') ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                              {lead.source === 'meta_lead_form' ? 'Lead Form' : lead.source?.includes('messenger') ? 'Messenger' : 'Meta'}
                            </span>
                          </div>
                          <div className="w-32 flex items-center justify-end gap-1.5">
                            <button onClick={() => sendLeadQuality(lead.id, 'qualified')}
                              className="opacity-0 group-hover:opacity-100 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs transition">
                              Kaliteli
                            </button>
                            <button onClick={async () => {
                              try {
                                await fetch(`${API}/api/leads`, { method: 'POST', headers: authH(), body: JSON.stringify({ company_name: lead.company_name || lead.name || 'Meta Lead', contact_name: lead.contact_name || lead.name, email: lead.email, phone: lead.phone, source: lead.source || 'meta' }) })
                                showMsg('success', 'Lead aktarildi!')
                              } catch { showMsg('error', 'Hata') }
                            }} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-blue-600/30 border border-slate-600 hover:border-blue-500/40 rounded-lg text-xs text-slate-300 hover:text-white transition">
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
                    <p className="text-xs text-slate-500">{filteredLeads.length} lead · {selectedLeads.length > 0 ? `${selectedLeads.length} secildi` : 'Hic secilmedi'}</p>
                    <button onClick={exportToLeads} disabled={exporting}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
                      <Send className="w-3 h-3"/>
                      {selectedLeads.length > 0 ? `${selectedLeads.length} Seciliyi Aktar` : 'Tumunu Aktar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KİTLELER */}
          {tab === 'audiences' && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-400"/>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">Lookalike Audience Olustur</h3>
                  <p className="text-slate-400 text-sm mt-1">CRM'deki donusen musterilere benzer yeni hedef kitle olustur. Minimum 20 olumlu lead gerekli.</p>
                  <button onClick={createLookalike} disabled={creatingLookalike}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition">
                    {creatingLookalike ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Users className="w-3.5 h-3.5"/>}
                    {creatingLookalike ? 'Olusturuluyor...' : 'Lookalike Olustur'}
                  </button>
                </div>
              </div>

              {audiences.length > 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-700/50">
                    <p className="text-sm font-medium text-white">Olusturulan Kitleler</p>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {audiences.map((aud: any) => (
                      <div key={aud.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-400"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{aud.name}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{aud.size_estimate} kaynak · {new Date(aud.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-lg ${aud.type === 'lookalike' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                          {aud.type === 'lookalike' ? 'Lookalike' : 'Custom'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-slate-600">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40"/>
                  <p className="text-sm">Henuz kitle olusturulmamis</p>
                </div>
              )}
            </div>
          )}

          {/* UYARILAR */}
          {tab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-14 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-700"/>
                  <p className="text-white font-medium">Uyari yok</p>
                  <p className="text-slate-500 text-sm mt-1">Tum reklamlar iyi gidiyor</p>
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

          {/* OTOMASYON */}
          {tab === 'automation' && (
            <div className="space-y-4">
              {/* 5 Dakika Kurali */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${adSettings.five_minute_rule ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
                      <Clock className={`w-5 h-5 ${adSettings.five_minute_rule ? 'text-purple-400' : 'text-slate-500'}`}/>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">5 Dakika Kurali</h3>
                      <p className="text-slate-400 text-sm mt-0.5">Yeni lead geldikten sonra otomatik sesli arama baslat. Lead 9x daha fazla donusur.</p>
                    </div>
                  </div>
                  <button onClick={() => setAdSettings((s: any) => ({ ...s, five_minute_rule: !s.five_minute_rule }))}
                    className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${adSettings.five_minute_rule ? 'bg-purple-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${adSettings.five_minute_rule ? 'left-6' : 'left-1'}`}/>
                  </button>
                </div>
                {adSettings.five_minute_rule && (
                  <div className="pl-13 space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Arama Gecikmesi</label>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 3, 5, 10, 15].map(m => (
                          <button key={m} onClick={() => setAdSettings((s: any) => ({ ...s, call_delay_minutes: m }))}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${adSettings.call_delay_minutes === m ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            {m} dakika
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-purple-500/8 border border-purple-500/15 rounded-xl">
                      <p className="text-purple-300 text-xs">Lead gelince {adSettings.call_delay_minutes} dakika sonra ElevenLabs AI agent otomatik arama yapar.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* CAPI */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-teal-400"/>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">Conversions API (CAPI)</h3>
                    <p className="text-slate-400 text-sm mt-0.5">Server-side tracking ile iOS kisitilamalarindan etkilenmeden donusumleri Meta'ya gonder. Meta algoritmasi daha iyi lead bulur.</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400"/>
                    <span className="text-teal-400 text-xs">Aktif</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-13">
                  {[
                    { label: 'Lead', desc: 'Yeni lead gelince' },
                    { label: 'Purchase', desc: 'Satis kapaninca' },
                    { label: 'Qualify', desc: 'Lead kaliteli olunca' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-center">
                      <p className="text-white text-xs font-medium">{label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lookalike */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400"/>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Lookalike Audience Otomasyonu</h3>
                    <p className="text-slate-400 text-sm mt-0.5">CRM'deki en iyi musterilere benzer yeni hedef kitle olustur. Her hafta otomatik guncellenir.</p>
                  </div>
                </div>
                <button onClick={() => setTab('audiences')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm transition">
                  <Users className="w-3.5 h-3.5"/> Kitleleri Yonet →
                </button>
              </div>

              {/* Kaydet */}
              <button onClick={saveSettings}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2">
                <Settings className="w-4 h-4"/> Ayarlari Kaydet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}