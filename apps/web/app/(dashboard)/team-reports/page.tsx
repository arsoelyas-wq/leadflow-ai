'use client'
import { useState, useEffect } from 'react'
import {
  BarChart2, TrendingUp, TrendingDown, Mail, Bell, Settings,
  RefreshCw, Send, Eye, CheckCircle, AlertTriangle, Award,
  Target, Zap, ChevronUp, ChevronDown, Minus, Star, Activity
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const METRIC_LABELS: Record<string, string> = {
  overall: 'Genel Skor',
  professionalism: 'Profesyonellik',
  sales_technique: 'Satış Tekniği',
  empathy: 'Empati',
  closing: 'Kapanış',
  communication: 'İletişim',
}

function MiniBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}

function TrendDot({ diff }: { diff: number }) {
  if (diff > 5) return <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold"><ChevronUp className="w-3 h-3"/>{diff}</span>
  if (diff < -5) return <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold"><ChevronDown className="w-3 h-3"/>{Math.abs(diff)}</span>
  return <span className="flex items-center gap-0.5 text-slate-400 text-xs"><Minus className="w-3 h-3"/>0</span>
}

export default function TeamReportsPage() {
  const [tab, setTab] = useState<'trend' | 'benchmark' | 'settings'>('trend')
  const [trend, setTrend] = useState<any>(null)
  const [benchmark, setBenchmark] = useState<any>(null)
  const [settings, setSettings] = useState<any>({ weekly_enabled: true, alert_enabled: true, alert_threshold: 50 })
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [alertSending, setAlertSending] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadTrend() }, [days, selectedMember])

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [bRes, sRes, mRes] = await Promise.allSettled([
        fetch(`${API}/api/ti-reports/benchmark`, { headers: authH() }),
        fetch(`${API}/api/ti-reports/settings`, { headers: authH() }),
        fetch(`${API}/api/team-intelligence/members`, { headers: authH() }),
      ])
      if (bRes.status === 'fulfilled') setBenchmark(await (bRes.value as any).json())
      if (sRes.status === 'fulfilled') {
        const s = await (sRes.value as any).json()
        setSettings(s.settings || s)
      }
      if (mRes.status === 'fulfilled') {
        const m = await (mRes.value as any).json()
        setMembers(m.members || [])
      }
    } catch {}
    setLoading(false)
  }

  async function loadTrend() {
    try {
      const params = new URLSearchParams({ days: String(days) })
      if (selectedMember) params.set('memberId', selectedMember)
      const r = await fetch(`${API}/api/ti-reports/trend?${params}`, { headers: authH() })
      setTrend(await r.json())
    } catch {}
  }

  async function sendWeeklyReport() {
    setSending(true)
    try {
      const r = await fetch(`${API}/api/ti-reports/send-weekly`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.ok) showMsg('success', d.message)
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setSending(false)
  }

  async function sendAlert() {
    setAlertSending(true)
    try {
      const r = await fetch(`${API}/api/ti-reports/alert`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ threshold: settings.alert_threshold })
      })
      const d = await r.json()
      showMsg(d.ok ? 'success' : 'error', d.message || d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setAlertSending(false)
  }

  async function saveSettings() {
    try {
      await fetch(`${API}/api/ti-reports/settings`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify(settings)
      })
      showMsg('success', 'Ayarlar kaydedildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  // Trend grafiği için basit SVG
  function TrendChart() {
    if (!trend?.trend?.length) return (
      <div className="flex items-center justify-center h-40 text-slate-600">
        <BarChart2 className="w-8 h-8 mr-2 opacity-30"/> Veri yok
      </div>
    )

    const points = trend.trend.filter((p: any) => p.overall !== null)
    if (!points.length) return (
      <div className="flex items-center justify-center h-40 text-slate-600">
        <BarChart2 className="w-8 h-8 mr-2 opacity-30"/> Henüz analiz yok
      </div>
    )

    const W = 560; const H = 160; const PAD = 20
    const minV = Math.max(0, Math.min(...points.map((p: any) => p.overall)) - 10)
    const maxV = Math.min(100, Math.max(...points.map((p: any) => p.overall)) + 10)
    const range = maxV - minV || 1

    const toX = (i: number) => PAD + (i / (points.length - 1 || 1)) * (W - PAD * 2)
    const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2)

    const overallPath = points.map((p: any, i: number) =>
      `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(p.overall)}`).join(' ')
    const salesPath = points.filter((p: any) => p.sales_technique !== null).map((p: any, i: number) =>
      `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(p.sales_technique)}`).join(' ')

    // Benchmark çizgisi
    const benchY = toY(trend.benchmarks?.overall || 68)

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
        {/* Grid */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = toY(Math.min(maxV, Math.max(minV, v)))
          if (y < PAD || y > H - PAD) return null
          return <line key={v} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#1e293b" strokeWidth="1"/>
        })}
        {/* Benchmark */}
        {benchY >= PAD && benchY <= H - PAD && (
          <>
            <line x1={PAD} y1={benchY} x2={W - PAD} y2={benchY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
            <text x={W - PAD + 2} y={benchY + 4} fill="#f59e0b" fontSize="9" opacity="0.7">Ref</text>
          </>
        )}
        {/* Satış Tekniği */}
        {salesPath && <path d={salesPath} fill="none" stroke="#14b8a6" strokeWidth="1.5" opacity="0.5" strokeDasharray="4 2"/>}
        {/* Genel skor */}
        <path d={overallPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Noktalar */}
        {points.map((p: any, i: number) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.overall)} r="4" fill="#8b5cf6" stroke="#0f172a" strokeWidth="2"/>
            {p.count > 0 && (
              <text x={toX(i)} y={toY(p.overall) - 8} textAnchor="middle" fill="#c4b5fd" fontSize="9">{p.overall}</text>
            )}
          </g>
        ))}
        {/* X ekseni tarihleri */}
        {points.filter((_: any, i: number) => i % Math.ceil(points.length / 4) === 0).map((p: any, i: number, arr: any[]) => {
          const origIdx = points.indexOf(p)
          return (
            <text key={i} x={toX(origIdx)} y={H - 2} textAnchor="middle" fill="#475569" fontSize="9">
              {p.date.slice(5)}
            </text>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-4 h-4"/>
            </div>
            Ekip Raporları
          </h1>
          <p className="text-slate-400 text-sm mt-1">Haftalık rapor, trend analizi ve sektör karşılaştırması</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sendWeeklyReport} disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl disabled:opacity-50">
            {sending ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
            Rapor Gönder
          </button>
          <button onClick={() => window.open(`${API}/api/ti-reports/preview`, '_blank')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl">
            <Eye className="w-4 h-4"/> Önizle
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit">
        {[['trend','📈 Trend'],['benchmark','🏆 Benchmark'],['settings','⚙️ Ayarlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* TREND */}
      {tab === 'trend' && (
        <div className="space-y-5">
          {/* Filtreler */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
            <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value="">Tüm Ekip</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={loadTrend} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl">
              <RefreshCw className="w-4 h-4 text-slate-300"/>
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-500 ml-2">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block rounded"/> Genel Skor</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-teal-500 inline-block rounded"/> Satış</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block rounded opacity-60"/> Benchmark</span>
            </div>
          </div>

          {/* Grafik */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400"/> Skor Trendi
            </h3>
            <TrendChart/>
          </div>

          {/* Tablo */}
          {trend?.trend?.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h3 className="font-semibold text-white text-sm">Dönem Detayları</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-500 text-xs">
                      <th className="text-left px-4 py-3">Tarih</th>
                      <th className="text-center px-4 py-3">Genel</th>
                      <th className="text-center px-4 py-3">Satış</th>
                      <th className="text-center px-4 py-3">Empati</th>
                      <th className="text-center px-4 py-3">Kapanış</th>
                      <th className="text-center px-4 py-3">Analiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.trend.filter((p: any) => p.overall).map((p: any, i: number) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3 text-slate-300 text-xs">{p.date}</td>
                        {['overall','sales_technique','empathy','closing'].map(k => (
                          <td key={k} className="px-4 py-3 text-center">
                            {p[k] ? (
                              <span className={`text-xs font-bold ${p[k] >= 80 ? 'text-emerald-400' : p[k] >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {p[k]}
                              </span>
                            ) : <span className="text-slate-600 text-xs">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center text-xs text-slate-500">{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BENCHMARK */}
      {tab === 'benchmark' && (
        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2"/> Yükleniyor...
            </div>
          ) : benchmark ? (
            <>
              {/* Özet */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center md:col-span-2">
                  <div className={`text-4xl font-black ${benchmark.user_scores?.overall >= benchmark.benchmarks?.overall ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {benchmark.user_scores?.overall || '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Genel Ortalamanız</div>
                  <div className={`text-xs mt-2 font-medium ${benchmark.user_scores?.overall >= benchmark.benchmarks?.overall ? 'text-emerald-400' : 'text-red-400'}`}>
                    {benchmark.user_scores?.overall >= benchmark.benchmarks?.overall
                      ? `✓ Sektör ortalamasının ${benchmark.user_scores?.overall - benchmark.benchmarks?.overall} puan üstünde`
                      : `↓ Sektör ortalamasının ${benchmark.benchmarks?.overall - benchmark.user_scores?.overall} puan altında`}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-amber-400">{benchmark.benchmarks?.overall}</div>
                  <div className="text-xs text-slate-500 mt-1">Sektör Ortalaması</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{benchmark.total_analyses}</div>
                  <div className="text-xs text-slate-500 mt-1">Toplam Analiz</div>
                </div>
              </div>

              {/* Detaylı karşılaştırma */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400"/> Metrik Karşılaştırması
                </h3>
                {(benchmark.comparison || []).map((c: any) => (
                  <div key={c.metric} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{METRIC_LABELS[c.metric] || c.metric}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Sektör: <strong className="text-amber-400">{c.benchmark}</strong></span>
                        <span className={`text-sm font-bold ${c.user >= c.benchmark ? 'text-emerald-400' : 'text-red-400'}`}>{c.user || '—'}</span>
                        <TrendDot diff={c.diff}/>
                      </div>
                    </div>
                    <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                      {/* Benchmark çizgisi */}
                      <div className="absolute top-0 h-full w-0.5 bg-amber-400/50 z-10"
                        style={{ left: `${c.benchmark}%` }}/>
                      {/* Kullanıcı skoru */}
                      <div className={`h-full rounded-full transition-all duration-700 ${c.status === 'above' ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${c.user || 0}%` }}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Güçlü / zayıf metrikler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4"/> Güçlü Alanlar
                  </h4>
                  {(benchmark.comparison || []).filter((c: any) => c.status === 'above').map((c: any) => (
                    <div key={c.metric} className="flex items-center justify-between py-1.5 border-b border-emerald-500/10 last:border-0">
                      <span className="text-xs text-slate-300">{METRIC_LABELS[c.metric]}</span>
                      <span className="text-xs text-emerald-400 font-bold">+{c.diff} puan</span>
                    </div>
                  ))}
                  {!(benchmark.comparison || []).some((c: any) => c.status === 'above') && (
                    <p className="text-xs text-slate-600">Henüz sektör ortalaması aşılmamış</p>
                  )}
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4"/> Geliştirilecek Alanlar
                  </h4>
                  {(benchmark.comparison || []).filter((c: any) => c.status === 'below').map((c: any) => (
                    <div key={c.metric} className="flex items-center justify-between py-1.5 border-b border-red-500/10 last:border-0">
                      <span className="text-xs text-slate-300">{METRIC_LABELS[c.metric]}</span>
                      <span className="text-xs text-red-400 font-bold">{c.diff} puan</span>
                    </div>
                  ))}
                  {!(benchmark.comparison || []).some((c: any) => c.status === 'below') && (
                    <p className="text-xs text-slate-600 text-center py-2">Tüm metriklerde sektör ortalaması aşılmış! 🎉</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-600">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Benchmark için önce analiz yapılması gerekiyor</p>
            </div>
          )}
        </div>
      )}

      {/* AYARLAR */}
      {tab === 'settings' && (
        <div className="space-y-5 max-w-xl">
          {/* Haftalık Rapor */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400"/> Haftalık Email Raporu
                </h3>
                <p className="text-xs text-slate-500 mt-1">Her Pazartesi sabahı 09:00'da otomatik gönderilir</p>
              </div>
              <button onClick={() => setSettings((s: any) => ({...s, weekly_enabled: !s.weekly_enabled}))}
                className={`w-12 h-6 rounded-full transition-all ${settings.weekly_enabled ? 'bg-purple-600' : 'bg-slate-600'} relative`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.weekly_enabled ? 'left-6' : 'left-0.5'}`}/>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={sendWeeklyReport} disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 text-sm rounded-xl disabled:opacity-50">
                {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
                Şimdi Gönder
              </button>
              <button onClick={() => window.open(`${API}/api/ti-reports/preview`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl">
                <Eye className="w-3.5 h-3.5"/> Önizle
              </button>
            </div>
          </div>

          {/* Düşük Skor Uyarısı */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400"/> Düşük Skor Uyarısı
                </h3>
                <p className="text-xs text-slate-500 mt-1">Belirlenen skorun altındaki konuşmalar için email uyarısı</p>
              </div>
              <button onClick={() => setSettings((s: any) => ({...s, alert_enabled: !s.alert_enabled}))}
                className={`w-12 h-6 rounded-full transition-all ${settings.alert_enabled ? 'bg-amber-600' : 'bg-slate-600'} relative`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.alert_enabled ? 'left-6' : 'left-0.5'}`}/>
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Uyarı Eşiği: <strong className="text-white">{settings.alert_threshold}</strong></label>
              <input type="range" min="30" max="70" value={settings.alert_threshold}
                onChange={e => setSettings((s: any) => ({...s, alert_threshold: Number(e.target.value)}))}
                className="w-full accent-amber-500"/>
              <div className="flex justify-between text-xs text-slate-600">
                <span>30 (Çok hassas)</span>
                <span>70 (Az hassas)</span>
              </div>
            </div>
            <button onClick={sendAlert} disabled={alertSending}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-sm rounded-xl disabled:opacity-50">
              {alertSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
              Şimdi Kontrol Et
            </button>
          </div>

          {/* Kaydet */}
          <button onClick={saveSettings}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-medium w-full justify-center">
            <CheckCircle className="w-4 h-4"/> Ayarları Kaydet
          </button>
        </div>
      )}
    </div>
  )
}