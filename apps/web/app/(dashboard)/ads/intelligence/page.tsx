'use client'
import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  RefreshCw, Zap, Users, Eye, MousePointer, DollarSign,
  Bell, ArrowRight, BarChart2, Target, Sparkles, Play
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

function AlertBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  }
  const labels: Record<string, string> = { critical: 'Kritik', warning: 'Uyari', info: 'Bilgi' }
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[severity] || map.info}`}>{labels[severity] || severity}</span>
}

function MetricCard({ label, value, sub, trend, color }: any) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

export default function AdsIntelligencePage() {
  const [tab, setTab] = useState<'dashboard' | 'leads' | 'alerts' | 'optimize'>('dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [d, a, p] = await Promise.allSettled([
        fetch(`${API}/api/ads-intelligence/dashboard`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/alerts`, { headers: authH() }),
        fetch(`${API}/api/ads-intelligence/performance`, { headers: authH() }),
      ])
      if (d.status === 'fulfilled') { const r = await (d.value as any).json(); setDashboard(r) }
      if (a.status === 'fulfilled') { const r = await (a.value as any).json(); setAlerts(r.alerts || []) }
      if (p.status === 'fulfilled') { const r = await (p.value as any).json(); setCampaigns(r.campaigns || []); if (r.alerts?.length) setAlerts(prev => [...prev, ...r.alerts]) }
    } catch {}
    setLoading(false)
  }

  async function extractLeads() {
    setExtracting(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/extract-leads`, { headers: authH() })
      const d = await r.json()
      if (d.ok) {
        showMsg('success', `${d.new_leads} yeni lead CRM'e eklendi! (${d.total_found} toplam bulundu)`)
        setLeads(d.leads || [])
        loadAll()
      } else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setExtracting(false)
  }

  async function analyzePerformance() {
    setAnalyzing(true)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/performance`, { headers: authH() })
      const d = await r.json()
      if (d.ok) {
        setCampaigns(d.campaigns || [])
        setAlerts(d.alerts || [])
        showMsg('success', `${d.total_alerts} uyari tespit edildi`)
      }
    } catch (e: any) { showMsg('error', e.message) }
    setAnalyzing(false)
  }

  async function optimizeCampaign(campaign: any) {
    setOptimizing(campaign.id)
    try {
      const r = await fetch(`${API}/api/ads-intelligence/ai-optimize`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          campaignId: campaign.id,
          campaignName: campaign.name,
          metrics: {
            spend: campaign.spend,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            ctr: campaign.ctr,
            cpm: campaign.cpm,
            reach: campaign.reach,
          },
        }),
      })
      const d = await r.json()
      if (d.ok) setOptimizationResult(d.analysis)
    } catch (e: any) { showMsg('error', e.message) }
    setOptimizing(null)
  }

  async function readAlert(id: string) {
    await fetch(`${API}/api/ads-intelligence/alerts/${id}/read`, { method: 'PATCH', headers: authH() })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const s = dashboard?.summary
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4"/>
            </div>
            Reklam Zekasi
          </h1>
          <p className="text-slate-400 text-sm mt-1">Meta Ads · 7/24 lead cekme · Performans izleme · AI optimizasyon</p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <Bell className="w-4 h-4 text-red-400"/>
              <span className="text-red-400 text-sm font-medium">{alerts.length} uyari</span>
            </div>
          )}
          <button onClick={loadAll} className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Ana Metrikler */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <MetricCard label="Toplam Harcama" value={`$${s.spend?.toFixed(2)}`} color="text-amber-400"/>
          <MetricCard label="Erisim" value={s.reach?.toLocaleString()} color="text-blue-400"/>
          <MetricCard label="Gosterim" value={s.impressions?.toLocaleString()} color="text-purple-400"/>
          <MetricCard label="Tiklama" value={s.clicks?.toLocaleString()} color="text-teal-400"/>
          <MetricCard label="CTR" value={`%${s.ctr?.toFixed(2)}`} color={s.ctr > 1 ? 'text-emerald-400' : 'text-red-400'}/>
          <MetricCard label="CPM" value={`$${s.cpm?.toFixed(2)}`} color={s.cpm < 20 ? 'text-emerald-400' : 'text-amber-400'}/>
        </div>
      )}

      {/* Aksiyon Butonlari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={extractLeads} disabled={extracting}
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl hover:border-blue-500/60 transition group">
          <div className="w-10 h-10 bg-blue-600/30 rounded-xl flex items-center justify-center shrink-0">
            {extracting ? <RefreshCw className="w-5 h-5 text-blue-400 animate-spin"/> : <Users className="w-5 h-5 text-blue-400"/>}
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{extracting ? 'Leadler cekiliyor...' : 'Leadleri Simdi Cek'}</p>
            <p className="text-slate-400 text-xs">Tum reklam turlerinden CRM'e aktar</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto group-hover:text-blue-400 transition"/>
        </button>

        <button onClick={analyzePerformance} disabled={analyzing}
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl hover:border-amber-500/60 transition group">
          <div className="w-10 h-10 bg-amber-600/30 rounded-xl flex items-center justify-center shrink-0">
            {analyzing ? <RefreshCw className="w-5 h-5 text-amber-400 animate-spin"/> : <BarChart2 className="w-5 h-5 text-amber-400"/>}
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{analyzing ? 'Analiz yapiliyor...' : 'Performans Analizi'}</p>
            <p className="text-slate-400 text-xs">Uyarilari ve sorunlari tespit et</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto group-hover:text-amber-400 transition"/>
        </button>

        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl">
          <div className="w-10 h-10 bg-emerald-600/30 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-emerald-400"/>
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">Otomatik Sistem Aktif</p>
            <p className="text-slate-400 text-xs">Her 30 dakikada lead cekiliyor</p>
          </div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse ml-auto"/>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit flex-wrap">
        {[['dashboard','📊 Dashboard'],['leads','👥 Leadler'],['alerts','🔔 Uyarilar'],['optimize','🤖 AI Optimize']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>
            {l} {t === 'alerts' && alerts.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{alerts.length}</span>}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Son Leadler */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400"/> Son Meta Leadleri
            </h3>
            <div className="space-y-2">
              {(dashboard?.recent_leads || []).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-700"/>
                  <p className="text-slate-500 text-sm">Henuz lead yok</p>
                  <button onClick={extractLeads} className="mt-3 text-xs text-blue-400 hover:text-blue-300">Lead Cek →</button>
                </div>
              ) : (
                (dashboard?.recent_leads || []).map((lead: any) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-sm shrink-0">
                      {lead.company_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{lead.company_name || lead.contact_name}</p>
                      <p className="text-slate-500 text-xs">{lead.phone || lead.email || lead.source}</p>
                    </div>
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Yeni</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Son Uyarilar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400"/> Son Uyarilar
            </h3>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-700"/>
                  <p className="text-slate-500 text-sm">Sorun yok, reklamlar iyi gidiyor!</p>
                </div>
              ) : (
                alerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id || alert.type} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <AlertBadge severity={alert.severity}/>
                      <button onClick={() => alert.id && readAlert(alert.id)} className="text-xs text-slate-600 hover:text-slate-400">Kapat</button>
                    </div>
                    <p className="text-white text-xs font-medium mt-1">{alert.campaign_name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-teal-400 text-xs mt-1">→ {alert.recommendation}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEADLER */}
      {tab === 'leads' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Meta'dan Cekilen Leadler</h3>
            <button onClick={extractLeads} disabled={extracting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
              {extracting ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Users className="w-4 h-4"/>}
              {extracting ? 'Cekiliyor...' : 'Simdi Cek'}
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-700"/>
              <p className="text-slate-500">Leadleri cekmek icin yukardaki butona basin</p>
              <p className="text-slate-600 text-xs mt-1">Lead Form, Messenger, ve tum reklam etkilesimleri taranir</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {leads.map((lead: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 hover:bg-slate-700/20">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-lg shrink-0">
                    {lead.source === 'lead_form' ? '📋' : lead.source === 'messenger' ? '💬' : '👆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{lead.name || lead.company || 'Anonim'}</p>
                    <p className="text-slate-500 text-xs">{lead.phone || lead.email || lead.last_message?.substring(0, 50)}</p>
                    {lead.ad_name && <p className="text-slate-600 text-xs mt-0.5">Reklam: {lead.ad_name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${lead.source === 'lead_form' ? 'bg-emerald-500/15 text-emerald-400' : lead.source === 'messenger' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                      {lead.source === 'lead_form' ? 'Lead Form' : lead.source === 'messenger' ? 'Messenger' : 'Etkilesim'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* UYARILAR */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/50 border border-slate-700 rounded-2xl">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-600"/>
              <p className="text-white font-medium">Hicbir uyari yok</p>
              <p className="text-slate-500 text-sm mt-1">Tum reklamlariniz iyi performans gosteriyor</p>
              <button onClick={analyzePerformance} disabled={analyzing}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-sm mx-auto">
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <BarChart2 className="w-4 h-4"/>}
                Yeniden Analiz Et
              </button>
            </div>
          ) : (
            alerts.map((alert: any, idx: number) => (
              <div key={alert.id || idx} className={`p-5 rounded-2xl border ${alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}/>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertBadge severity={alert.severity}/>
                        <span className="text-white text-sm font-medium">{alert.campaign_name}</span>
                      </div>
                      <p className="text-slate-300 text-sm">{alert.message}</p>
                      {alert.recommendation && (
                        <p className="text-teal-400 text-sm mt-2">✓ Oneri: {alert.recommendation}</p>
                      )}
                    </div>
                  </div>
                  {alert.id && (
                    <button onClick={() => readAlert(alert.id)} className="text-xs text-slate-500 hover:text-slate-300 shrink-0">Kapat</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* AI OPTİMİZASYON */}
      {tab === 'optimize' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-2xl">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-700"/>
                <p className="text-slate-500">Kampanya verisi yok</p>
                <button onClick={analyzePerformance} className="mt-3 text-blue-400 text-sm">Analiz Et →</button>
              </div>
            ) : (
              campaigns.map((c: any) => (
                <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${c.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                        {c.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <button onClick={() => optimizeCampaign(c)} disabled={optimizing === c.id}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                      {optimizing === c.id ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                      {optimizing === c.id ? 'Analiz ediliyor...' : 'AI ile Optimize Et'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {[
                      { l: 'Harcama', v: `$${parseFloat(c.spend||'0').toFixed(2)}` },
                      { l: 'Erisim', v: parseInt(c.reach||'0').toLocaleString() },
                      { l: 'Gosterim', v: parseInt(c.impressions||'0').toLocaleString() },
                      { l: 'Tiklama', v: parseInt(c.clicks||'0').toLocaleString() },
                      { l: 'CTR', v: `%${parseFloat(c.ctr||'0').toFixed(2)}` },
                      { l: 'CPM', v: `$${parseFloat(c.cpm||'0').toFixed(2)}` },
                    ].map(({ l, v }) => (
                      <div key={l} className="bg-slate-900 rounded-xl p-2 text-center">
                        <p className="text-slate-500 text-xs">{l}</p>
                        <p className="text-white text-sm font-medium">{v}</p>
                      </div>
                    ))}
                  </div>

                  {optimizationResult && optimizing === null && (
                    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400"/>
                        <span className="text-purple-300 font-medium text-sm">AI Analiz Sonucu</span>
                        <span className={`ml-auto text-sm font-bold ${optimizationResult.overall_score >= 7 ? 'text-emerald-400' : optimizationResult.overall_score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                          {optimizationResult.overall_score}/10
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{optimizationResult.summary}</p>
                      {optimizationResult.recommendations?.map((rec: any, i: number) => (
                        <div key={i} className={`p-3 rounded-xl border text-xs ${rec.priority === 'high' ? 'bg-red-500/10 border-red-500/20' : rec.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800 border-slate-700'}`}>
                          <p className="text-white font-medium">{rec.action}</p>
                          <p className="text-slate-400 mt-0.5">Beklenen: {rec.expected_result}</p>
                        </div>
                      ))}
                      {optimizationResult.new_copy_suggestion && (
                        <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                          <p className="text-xs text-slate-500 mb-1">Yeni Reklam Metni Onerisi:</p>
                          <p className="text-white text-sm">{optimizationResult.new_copy_suggestion}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}