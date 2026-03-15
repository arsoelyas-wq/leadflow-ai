'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Search, Users, Linkedin, Globe, RefreshCw, Target, Mail, User, Crosshair, ChevronRight } from 'lucide-react'

export default function DecisionMakerPage() {
  const [tab, setTab] = useState<'search' | 'leads'>('search')
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [batchResult, setBatchResult] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [findingId, setFindingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const loadStats = async () => {
    const data = await api.get('/api/decision-maker/stats').catch(() => null)
    if (data) setStats(data)
  }

  const loadLeads = async () => {
    setLeadsLoading(true)
    try {
      const data = await api.get('/api/leads?limit=50')
      setLeads(data.leads || [])
    } catch {}
    finally { setLeadsLoading(false) }
  }

  useEffect(() => {
    loadStats()
    loadLeads()
  }, [])

  const handleFind = async () => {
    if (!companyName) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/api/decision-maker/find', { companyName, website, city })
      setResult(data)
      showMsg('success', `${data.found} karar verici bulundu!`)
      loadStats()
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
      loadStats()
      loadLeads()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const findForLead = async (lead: any) => {
    setFindingId(lead.id)
    try {
      const data = await api.post('/api/decision-maker/find', {
        companyName: lead.company_name,
        website: lead.website || '',
        city: lead.city || '',
        leadId: lead.id,
      })
      showMsg('success', `${lead.company_name}: ${data.found} karar verici bulundu`)
      loadLeads()
      loadStats()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setFindingId(null)
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

  const leadsWithDM = leads.filter(l => l.contact_name)
  const leadsWithoutDM = leads.filter(l => !l.contact_name)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crosshair size={24} className="text-purple-400" />
          Karar Verici Avı
        </h1>
        <p className="text-slate-400 mt-1 text-sm">LinkedIn, web sitesi ve Google'dan CEO, Müdür ve satın alma sorumlularını bul</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Toplam Lead', value: stats.totalLeads, color: 'text-blue-400' },
            { label: 'Karar Verici Bulundu', value: stats.withContact, color: 'text-purple-400' },
            { label: 'Email Var', value: stats.withEmail, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'search', label: 'Tek Firma Ara' },
          { id: 'leads', label: `Lead Listesi (${leads.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TEK FİRMA ARA */}
      {tab === 'search' && (
        <div className="grid lg:grid-cols-2 gap-6">
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

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Toplu Lead Tarama</h2>
            <p className="text-slate-400 text-sm">Karar vericisi bulunmamış leadlerinizi otomatik tarar.</p>
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-1.5 text-xs text-slate-400">
              <p>→ LinkedIn'de CEO/Müdür arar</p>
              <p>→ Web sitesinden iletişim çeker</p>
              <p>→ Lead kaydını günceller (+15 puan)</p>
              <p>→ Her seferinde max 10 lead</p>
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

          {/* Arama Sonuçları */}
          {result && (
            <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
                <User size={15} className="text-purple-400" />
                <h2 className="text-white font-semibold">{result.company} — {result.found} Karar Verici</h2>
              </div>
              {result.found === 0 ? (
                <div className="p-12 text-center">
                  <Users size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Karar verici bulunamadı</p>
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
                            {dm.email && <><span>·</span><Mail size={11} className="text-blue-400" /><span className="text-blue-400">{dm.email}</span></>}
                          </div>
                        </div>
                      </div>
                      {dm.linkedinUrl && (
                        <a href={dm.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition">
                          <Linkedin size={13} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LEAD LİSTESİ */}
      {tab === 'leads' && (
        <div className="space-y-4">
          {/* Karar vericisi olan leadler */}
          {leadsWithDM.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <h3 className="text-white font-medium text-sm">Karar Vericisi Bulunanlar ({leadsWithDM.length})</h3>
              </div>
              <div className="divide-y divide-slate-700/50 max-h-64 overflow-y-auto">
                {leadsWithDM.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-300 text-xs font-bold">
                        {lead.company_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm">{lead.company_name}</p>
                        <p className="text-purple-300 text-xs">{lead.contact_name} {lead.email && `· ${lead.email}`}</p>
                      </div>
                    </div>
                    <span className="text-emerald-400 text-xs">✓ Bulundu</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Karar vericisi olmayan leadler */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                <h3 className="text-white font-medium text-sm">Karar Vericisi Bulunamayanlar ({leadsWithoutDM.length})</h3>
              </div>
              <button onClick={handleBatch} disabled={batchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition">
                {batchLoading ? <RefreshCw size={12} className="animate-spin" /> : <Target size={12} />}
                {batchLoading ? 'Taranıyor...' : '10 Lead Otomatik Tara'}
              </button>
            </div>
            {leadsLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Yükleniyor...</div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                {leadsWithoutDM.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 text-xs font-bold">
                        {lead.company_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm">{lead.company_name}</p>
                        <p className="text-slate-500 text-xs">{lead.city} · {lead.source}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => findForLead(lead)}
                      disabled={findingId === lead.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs rounded-lg transition disabled:opacity-50"
                    >
                      {findingId === lead.id
                        ? <RefreshCw size={11} className="animate-spin" />
                        : <Crosshair size={11} />}
                      {findingId === lead.id ? 'Aranıyor...' : 'Bul'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}