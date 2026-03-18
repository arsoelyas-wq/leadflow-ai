'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Target, RefreshCw, Send, Zap, Clock, TrendingUp, Bot, Play, Eye } from 'lucide-react'

export default function RetargetingPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMessages, setEditMessages] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [unresponsive, statsData] = await Promise.allSettled([
        api.get('/api/retargeting/unresponsive'),
        api.get('/api/retargeting/stats'),
      ])
      if (unresponsive.status === 'fulfilled') setLeads(unresponsive.value.leads || [])
      if (statsData.status === 'fulfilled') setStats(statsData.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const sendOne = async (leadId: string, strategy: any, message: string) => {
    setSending(leadId)
    try {
      await api.post(`/api/retargeting/send/${leadId}`, { strategy, message })
      showMsg('success', 'Retargeting mesajı gönderildi!')
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSending(null) }
  }

  const runAll = async (dryRun = false) => {
    setRunning(true)
    try {
      const data = await api.post('/api/retargeting/run-all', { dryRun })
      showMsg('success', data.message)
      if (!dryRun) setTimeout(load, 3000)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setRunning(false) }
  }

  const strategyColors: Record<string, string> = {
    'değer_odaklı': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'merak_uyandırıcı': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'sosyal_kanıt': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'doğrudan': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'yumuşak_takip': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-purple-400" />
            Dynamic Retargeting
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Cevap vermeyen leadleri AI ile yeniden hedefle — doğru kanal, doğru mesaj, doğru zaman</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runAll(true)} disabled={running || !leads.length}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg text-sm transition disabled:opacity-40">
            <Eye size={14} /> Önizle
          </button>
          <button onClick={() => runAll(false)} disabled={running || !leads.length}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-40">
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {running ? 'Çalışıyor...' : `${leads.length} Lead'e Gönder`}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Bu Hafta Gönderilen', value: stats.total, color: 'text-purple-400' },
            { label: 'Değer Odaklı', value: stats.byStrategy?.['değer_odaklı'] || 0, color: 'text-blue-400' },
            { label: 'Merak Uyandırıcı', value: stats.byStrategy?.['merak_uyandırıcı'] || 0, color: 'text-pink-400' },
            { label: 'Bekleyen Lead', value: leads.length, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Nasıl çalışır */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Bot size={16} className="text-purple-400" /> Otomatik Retargeting Mantığı
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          {[
            { icon: '🎯', title: '3+ Gün Cevap Yok', desc: 'Lead tespit edilir' },
            { icon: '🧠', title: 'AI Analiz', desc: 'Davranış + geçmiş incelenir' },
            { icon: '✍️', title: 'Strateji Üretir', desc: 'Yeni mesaj + en iyi kanal' },
            { icon: '📱', title: 'Otomatik Gönder', desc: 'Doğru saatte iletilir' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-white font-medium">{title}</p>
              <p className="text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Target size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Retarget edilecek lead yok</p>
          <p className="text-slate-500 text-sm mt-1">3+ gündür cevap vermeyen leadler burada görünür</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(({ lead, behavior, strategy }: any) => (
            <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Lead info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold">{lead.company_name}</p>
                    {strategy?.strategy && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${strategyColors[strategy.strategy] || strategyColors['yumuşak_takip']}`}>
                        {strategy.strategy}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {behavior.daysSinceLastContact} gün önce
                    </span>
                    <span>{behavior.totalAttempts} deneme</span>
                    <span>📱 {lead.phone || 'Telefon yok'}</span>
                    {strategy?.channel && <span className="text-purple-400">→ {strategy.channel}</span>}
                    {strategy?.bestTime && <span className="text-blue-400">⏰ {strategy.bestTime}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition">
                    {expanded === lead.id ? 'Kapat' : 'Mesajı Düzenle'}
                  </button>
                  <button
                    onClick={() => sendOne(lead.id, strategy, editMessages[lead.id] || strategy?.message || '')}
                    disabled={sending === lead.id || !lead.phone}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                    {sending === lead.id ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    Gönder
                  </button>
                </div>
              </div>

              {/* Expanded - mesaj düzenle */}
              {expanded === lead.id && strategy && (
                <div className="px-5 pb-4 border-t border-slate-700 pt-4 space-y-3">
                  {/* AI reasoning */}
                  {strategy.reasoning && (
                    <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                      <p className="text-purple-300 text-xs font-medium mb-1">🧠 AI Stratejisi</p>
                      <p className="text-slate-400 text-xs">{strategy.reasoning}</p>
                    </div>
                  )}

                  {/* Mesaj düzenle */}
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">
                      Mesaj ({strategy.channel} — {strategy.tone} ton)
                    </label>
                    <textarea
                      value={editMessages[lead.id] ?? strategy.message ?? ''}
                      onChange={e => setEditMessages(prev => ({ ...prev, [lead.id]: e.target.value }))}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}