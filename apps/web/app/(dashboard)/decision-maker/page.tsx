'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Search, Users, Linkedin, Globe, CheckCircle, AlertCircle, RefreshCw, Target, Mail, User } from 'lucide-react'

export default function DecisionMakerPage() {
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [batchResult, setBatchResult] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => {
    api.get('/api/decision-maker/stats').then(setStats).catch(() => {})
  }, [])

  const handleFind = async () => {
    if (!companyName) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/api/decision-maker/find', { companyName, website, city })
      setResult(data)
      showMsg('success', `${data.found} karar verici bulundu!`)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    setBatchLoading(true)
    setBatchResult(null)
    try {
      const data = await api.post('/api/decision-maker/batch', { maxLeads: 10 })
      setBatchResult(data)
      showMsg('success', data.message)
      const statsData = await api.get('/api/decision-maker/stats')
      setStats(statsData)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const confidenceColor: Record<string, string> = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    low: 'bg-slate-700 text-slate-400 border-slate-600',
  }
  const confidenceLabel: Record<string, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' }

  const sourceIcon: Record<string, any> = {
    LinkedIn: <Linkedin size={12} className="text-blue-400" />,
    Website: <Globe size={12} className="text-green-400" />,
    Google: <Search size={12} className="text-orange-400" />,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target size={24} className="text-purple-400" />
          Karar Verici Avı
        </h1>
        <p className="text-slate-400 mt-1 text-sm">LinkedIn, web sitesi ve Google'dan CEO, Müdür ve satın alma sorumlularını bul</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <AlertCircle size={16} />{msg.text}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Toplam Lead', value: stats.totalLeads, color: 'blue' },
            { label: 'Karar Verici Bulundu', value: stats.withContact, color: 'purple' },
            { label: 'Email Var', value: stats.withEmail, color: 'green' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color === 'blue' ? 'text-blue-400' : color === 'purple' ? 'text-purple-400' : 'text-green-400'}`}>{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tek Firma Ara */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Tek Firma Ara</h2>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)}
            placeholder="Firma adı *"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-2 gap-3">
            <input value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="Website (opsiyonel)"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="Şehir"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <button onClick={handleFind} disabled={loading || !companyName}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Aranıyor...' : 'Karar Verici Bul'}
          </button>
        </div>

        {/* Toplu Tarama */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Toplu Lead Tarama</h2>
          <p className="text-slate-400 text-sm">Karar vericisi henüz bulunmamış leadlerinizi otomatik tarar ve günceller.</p>

          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
            <p className="text-purple-300 text-sm font-medium">Ne yapılır?</p>
            <div className="space-y-1 text-xs text-slate-400">
              <p>→ Her lead için LinkedIn'de CEO/Müdür arar</p>
              <p>→ Web sitesinden iletişim bilgisi çeker</p>
              <p>→ Lead kaydını günceller (+15 puan)</p>
              <p>→ Her seferinde max 10 lead tarar</p>
            </div>
          </div>

          {batchResult && (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-400 text-sm font-medium">{batchResult.message}</p>
              {batchResult.results?.slice(0, 3).map((r: any, i: number) => (
                <p key={i} className="text-slate-400 text-xs mt-1">• {r.company} → {r.found} ({r.title})</p>
              ))}
            </div>
          )}

          <button onClick={handleBatch} disabled={batchLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">
            {batchLoading ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
            {batchLoading ? 'Taranıyor...' : '10 Lead Tara'}
          </button>
        </div>
      </div>

      {/* Sonuçlar */}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <User size={15} className="text-purple-400" />
              {result.company} — Karar Vericiler
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                {result.found}
              </span>
            </h2>
          </div>

          {result.found === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Bu firma için karar verici bulunamadı</p>
              <p className="text-slate-500 text-xs mt-1">Web sitesi ekleyerek tekrar deneyin</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {result.decisionMakers?.map((dm: any, i: number) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-300 font-bold text-sm">
                      {dm.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white text-sm font-medium">{dm.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${confidenceColor[dm.confidence] || confidenceColor.low}`}>
                          {confidenceLabel[dm.confidence] || 'Düşük'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {sourceIcon[dm.source]}
                        <span>{dm.title}</span>
                        {dm.email && (
                          <>
                            <span>·</span>
                            <Mail size={11} className="text-blue-400" />
                            <span className="text-blue-400">{dm.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dm.linkedinUrl && (
                      <a href={dm.linkedinUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition text-xs">
                        <Linkedin size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}