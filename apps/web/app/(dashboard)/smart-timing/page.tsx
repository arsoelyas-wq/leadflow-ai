'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Clock, RefreshCw, Calendar, Zap, Send, Trash2, TrendingUp } from 'lucide-react'

export default function SmartTimingPage() {
  const [analysis, setAnalysis] = useState<any>(null)
  const [scheduled, setScheduled] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Schedule form
  const [schedLead, setSchedLead] = useState('')
  const [schedMessage, setSchedMessage] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [scheduling, setScheduling] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [a, s, l] = await Promise.allSettled([
        api.get('/api/smart-timing/analyze'),
        api.get('/api/smart-timing/scheduled'),
        api.get('/api/leads?limit=100'),
      ])
      if (a.status === 'fulfilled') setAnalysis(a.value)
      if (s.status === 'fulfilled') setScheduled(s.value.scheduled || [])
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const getBestTime = async () => {
    try {
      const data = await api.post('/api/smart-timing/best-time-campaign', {})
      const dt = new Date(data.recommendedTime)
      setSchedTime(dt.toISOString().slice(0, 16))
      showMsg('success', `Önerilen zaman: ${dt.toLocaleString('tr-TR')} — ${data.reason}`)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const schedule = async () => {
    if (!schedLead || !schedMessage || !schedTime) return
    setScheduling(true)
    try {
      const data = await api.post('/api/smart-timing/schedule', {
        leadId: schedLead,
        message: schedMessage,
        scheduledAt: new Date(schedTime).toISOString(),
      })
      showMsg('success', data.message)
      setSchedLead(''); setSchedMessage(''); setSchedTime('')
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setScheduling(false) }
  }

  const cancel = async (id: string) => {
    try {
      await api.delete(`/api/smart-timing/scheduled/${id}`)
      showMsg('success', 'İptal edildi')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const maxCount = analysis?.hourlyChart
    ? Math.max(...analysis.hourlyChart.map((h: any) => h.count), 1)
    : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock size={24} className="text-blue-400" />
          Akıllı Gönderim Zamanlaması
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Veriye dayalı en iyi gönderim saati + otomatik zamanlama</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Analiz */}
          {analysis && (
            <div className="grid lg:grid-cols-3 gap-5">
              {/* En iyi saatler */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-yellow-400" /> En İyi Saatler
                </h2>
                <div className="space-y-3">
                  {analysis.bestHours.map((h: number, i: number) => (
                    <div key={h} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-500 text-white' : 'bg-orange-700 text-white'
                      }`}>{i + 1}</span>
                      <span className="text-white font-medium">{String(h).padStart(2, '0')}:00</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.max(20, ((analysis.hourlyChart?.[h]?.count || 1) / maxCount) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-3">{analysis.totalReplies} cevap verisine göre</p>
              </div>

              {/* En iyi günler */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-green-400" /> En İyi Günler
                </h2>
                <div className="space-y-3">
                  {analysis.bestDays.map((day: string, i: number) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-green-500 text-black' : 'bg-slate-600 text-white'
                      }`}>{i + 1}</span>
                      <span className="text-white">{day}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 text-xs mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  💡 {analysis.recommendation}
                </p>
              </div>

              {/* Saatlik dağılım grafiği */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-400" /> Saatlik Dağılım
                </h2>
                <div className="flex items-end gap-0.5 h-24">
                  {(analysis.hourlyChart || []).filter((_: any, i: number) => i >= 7 && i <= 21).map((item: any) => (
                    <div key={item.hour} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t transition-all ${
                          analysis.bestHours.includes(item.hour) ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                        style={{ height: `${Math.max(item.count > 0 ? 8 : 2, (item.count / maxCount) * 80)}px` }}
                      />
                      {item.hour % 3 === 0 && (
                        <span className="text-slate-600 text-xs mt-1">{item.hour}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mesaj Zamanlama */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">📅 Mesaj Zamanla</h2>
              <select value={schedLead} onChange={e => setSchedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Lead seçin</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} {l.contact_name ? `— ${l.contact_name}` : ''}</option>)}
              </select>
              <textarea value={schedMessage} onChange={e => setSchedMessage(e.target.value)} rows={3}
                placeholder="Gönderilecek mesaj..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              <div className="flex gap-2">
                <input type="datetime-local" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={getBestTime}
                  className="px-3 py-2 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 text-xs rounded-lg transition whitespace-nowrap">
                  🎯 AI Öner
                </button>
              </div>
              <button onClick={schedule} disabled={scheduling || !schedLead || !schedMessage || !schedTime}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                {scheduling ? <RefreshCw size={14} className="animate-spin" /> : <Clock size={14} />}
                {scheduling ? 'Zamanlanıyor...' : 'Mesajı Zamanla'}
              </button>
            </div>

            {/* Zamanlanmış mesajlar */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">⏳ Zamanlanmış Mesajlar ({scheduled.length})</h2>
              {scheduled.length === 0 ? (
                <div className="text-center py-8">
                  <Clock size={32} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Zamanlanmış mesaj yok</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scheduled.map(s => (
                    <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      s.status === 'sent' ? 'bg-emerald-500/5 border-emerald-500/20' :
                      s.status === 'pending' ? 'bg-slate-900/50 border-slate-700' :
                      'bg-red-500/5 border-red-500/20'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{s.leads?.company_name}</p>
                        <p className="text-slate-400 text-xs truncate">{s.message?.slice(0, 50)}...</p>
                        <p className="text-blue-400 text-xs mt-1">
                          📅 {new Date(s.scheduled_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${
                          s.status === 'sent' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          s.status === 'pending' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}>
                          {s.status === 'sent' ? '✓' : s.status === 'pending' ? '⏳' : '✗'}
                        </span>
                        {s.status === 'pending' && (
                          <button onClick={() => cancel(s.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}