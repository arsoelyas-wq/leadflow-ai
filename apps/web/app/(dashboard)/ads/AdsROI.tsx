'use client'
import { useState, useEffect } from 'react'
import {
  RefreshCw, TrendingUp, DollarSign, Users, Target,
  AlertTriangle, CheckCircle, Zap, BarChart2, ArrowUpRight, Sparkles,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

interface Props { connected: boolean }

export default function AdsROI({ connected }: Props) {
  const [roi, setRoi] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [roiRes, alertsRes] = await Promise.allSettled([
        fetch(`${API}/api/ads-automation/combined-roi`, { headers: authH() }),
        fetch(`${API}/api/ads-automation/smart-alerts`, { headers: authH() }),
      ])
      if (roiRes.status === 'fulfilled') {
        try { const d = await roiRes.value.json(); setRoi(d) } catch {}
      }
      if (alertsRes.status === 'fulfilled') {
        try { const d = await alertsRes.value.json(); setAlerts(d.alerts || d || []) } catch {}
      }
    } catch {}
    setLoading(false)
  }

  async function scoreAllLeads() {
    setScoring(true)
    try {
      const r = await fetch(`${API}/api/ads-automation/score-all-leads`, {
        method: 'POST',
        headers: authH(),
      })
      const d = await r.json()
      if (d.ok || d.scored !== undefined) {
        setScoreResult(d)
        showMsg('success', `${d.scored ?? d.count ?? 0} lead skorlandı`)
      } else {
        showMsg('error', d.error || 'Skorlama başarısız')
      }
    } catch {
      showMsg('error', 'Skorlama başarısız')
    }
    setScoring(false)
  }

  useEffect(() => { loadAll() }, [])

  if (!connected) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-10 text-center space-y-3">
        <BarChart2 className="w-10 h-10 mx-auto text-slate-600" />
        <p className="text-white font-medium">ROI Dashboard</p>
        <p className="text-slate-400 text-sm">Meta veya Google Ads hesabı bağlayın</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
      </div>
    )
  }

  // Derived numbers
  const meta = roi?.meta || {}
  const google = roi?.google || {}

  const metaLeads30 = meta.leads30d ?? meta.leads ?? 0
  const googleLeads30 = google.leads30d ?? google.leads ?? 0
  const totalLeads = metaLeads30 + googleLeads30

  const metaSpend = meta.spend30d ?? meta.spend ?? 0
  const googleSpend = google.spend30d ?? google.spend ?? 0
  const totalSpend = metaSpend + googleSpend

  const metaCPL7 = meta.cpl7d ?? meta.cpl ?? 0
  const googleCPL7 = google.cpl7d ?? google.cpl ?? 0
  const avgCPL = totalLeads > 0
    ? totalSpend / totalLeads
    : (metaCPL7 + googleCPL7) / 2

  function bestChannel() {
    if (metaLeads30 > 0 && googleLeads30 === 0) return 'Meta'
    if (googleLeads30 > 0 && metaLeads30 === 0) return 'Google'
    if (metaLeads30 === 0 && googleLeads30 === 0) return 'Birleşik'
    return metaLeads30 >= googleLeads30 ? 'Meta' : 'Google'
  }

  const metaSharePct = totalLeads > 0 ? Math.round((metaLeads30 / totalLeads) * 100) : 50
  const googleSharePct = 100 - metaSharePct

  return (
    <div className="space-y-5">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${msg.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-red-500/30 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">Birleşik ROI Dashboard</span>
          <span className="text-xs text-slate-500">— Son güncelleme: şimdi</span>
        </div>
        <button
          onClick={loadAll}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Section 1: Combined summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Toplam Lead',
            value: totalLeads.toLocaleString(),
            sub: 'Son 30 gün',
            icon: <Users className="w-3.5 h-3.5 text-blue-400" />,
            accent: 'text-blue-400',
          },
          {
            label: 'Toplam Harcama',
            value: `$${totalSpend.toFixed(2)}`,
            sub: 'Meta + Google',
            icon: <DollarSign className="w-3.5 h-3.5 text-amber-400" />,
            accent: 'text-amber-400',
          },
          {
            label: 'Ort. CPL',
            value: `$${avgCPL.toFixed(2)}`,
            sub: 'Maliyet / Lead',
            icon: <Target className="w-3.5 h-3.5 text-purple-400" />,
            accent: 'text-purple-400',
          },
          {
            label: 'En İyi Kanal',
            value: bestChannel(),
            sub: 'Lead hacmine göre',
            icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
            accent: 'text-emerald-400',
          },
        ].map(card => (
          <div key={card.label} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{card.label}</span>
              {card.icon}
            </div>
            <div className={`text-xl font-semibold tracking-tight ${card.accent}`}>{card.value}</div>
            <div className="text-xs text-slate-600">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Section 2: Side-by-side platform comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">f</span>
            </div>
            <span className="font-semibold text-white">Meta Ads</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 ml-auto" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Lead 7g', value: meta.leads7d ?? '—' },
              { label: 'Lead 30g', value: metaLeads30 || '—' },
              { label: 'CPL 7g', value: metaCPL7 ? `$${Number(metaCPL7).toFixed(2)}` : '—' },
            ].map(m => (
              <div key={m.label} className="bg-slate-900/40 rounded-lg p-2.5 text-center">
                <div className="text-slate-400">{m.label}</div>
                <div className="text-white font-semibold mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Harcama 30g</span>
              <span className="text-white">${Number(metaSpend).toFixed(2)}</span>
            </div>
            <div className="h-1.5 bg-slate-900/60 rounded-full overflow-hidden">
              <div
                style={{ width: `${metaSharePct}%` }}
                className="h-1.5 bg-blue-500 rounded-full transition-all"
              />
            </div>
            <div className="text-xs text-slate-500">Lead payı: %{metaSharePct}</div>
          </div>
        </div>

        {/* Google */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-400">G</span>
            </div>
            <span className="font-semibold text-white">Google Ads</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 ml-auto" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Lead 7g', value: google.leads7d ?? '—' },
              { label: 'Lead 30g', value: googleLeads30 || '—' },
              { label: 'CPL 7g', value: googleCPL7 ? `$${Number(googleCPL7).toFixed(2)}` : '—' },
            ].map(m => (
              <div key={m.label} className="bg-slate-900/40 rounded-lg p-2.5 text-center">
                <div className="text-slate-400">{m.label}</div>
                <div className="text-white font-semibold mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Harcama 30g</span>
              <span className="text-white">${Number(googleSpend).toFixed(2)}</span>
            </div>
            <div className="h-1.5 bg-slate-900/60 rounded-full overflow-hidden">
              <div
                style={{ width: `${googleSharePct}%` }}
                className="h-1.5 bg-indigo-500 rounded-full transition-all"
              />
            </div>
            <div className="text-xs text-slate-500">Lead payı: %{googleSharePct}</div>
          </div>
        </div>
      </div>

      {/* Section 3: Lead Scoring */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-white">Lead Skorlama</span>
          </div>
          <button
            onClick={scoreAllLeads}
            disabled={scoring}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
          >
            {scoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {scoring ? 'Skorlanıyor...' : 'Tüm Leadleri Skorla'}
          </button>
        </div>

        {scoreResult && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 text-sm font-medium">
              {scoreResult.scored ?? scoreResult.count ?? 0} lead skorlandı
              {scoreResult.avgScore != null && ` — Ortalama: ${Number(scoreResult.avgScore).toFixed(0)}/100`}
            </span>
          </div>
        )}

        <p className="text-xs text-slate-500 leading-relaxed">
          Leadler phone (+30), email (+20), kaynak (+20), tazelik (+10) puanına göre 0-100 skorlanır.
        </p>
      </div>

      {/* Section 4: Smart Alerts */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-white">Akıllı Uyarılar</span>
          {alerts.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium border border-amber-500/20">
              {alerts.length}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 py-5 justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-slate-400 text-sm">Uyarı yok, her şey iyi görünüyor</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert: any, i: number) => {
              const sev = alert.severity || 'info'
              const badge =
                sev === 'critical'
                  ? 'bg-red-500/15 text-red-400 border-red-500/25'
                  : sev === 'warning'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                  : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
              const label =
                sev === 'critical' ? 'Kritik' : sev === 'warning' ? 'Uyarı' : 'Bilgi'

              return (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-900/40 rounded-xl border border-slate-700/40">
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-md border ${badge}`}>
                    {label}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-white text-sm">{alert.message || alert.title || String(alert)}</p>
                    {(alert.action || alert.recommendation) && (
                      <p className="text-xs text-slate-400">{alert.action || alert.recommendation}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
