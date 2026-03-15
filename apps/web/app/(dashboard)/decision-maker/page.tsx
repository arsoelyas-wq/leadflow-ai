'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Search, Users, Linkedin, Globe, RefreshCw, Mail, User, CheckCircle, XCircle, Database, Crosshair, ChevronDown, ChevronUp } from 'lucide-react'

export default function PersonsPage() {
  const [tab, setTab] = useState<'find' | 'database' | 'leads'>('find')
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [verifyEmails, setVerifyEmails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [dbPersons, setDbPersons] = useState<any[]>([])
  const [dbSearch, setDbSearch] = useState('')
  const [leads, setLeads] = useState<any[]>([])
  const [findingId, setFindingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Email verify
  const [emailToVerify, setEmailToVerify] = useState('')
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [verifying, setVerifying] = useState(false)

  // Email generate
  const [genFirst, setGenFirst] = useState('')
  const [genLast, setGenLast] = useState('')
  const [genDomain, setGenDomain] = useState('')
  const [genResult, setGenResult] = useState<any>(null)
  const [generating, setGenerating] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const loadStats = async () => {
    const data = await api.get('/api/persons/stats').catch(() => null)
    if (data) setStats(data)
  }

  const loadDatabase = async () => {
    const data = await api.get(`/api/persons/database?limit=50${dbSearch ? `&search=${dbSearch}` : ''}`).catch(() => null)
    if (data) setDbPersons(data.persons || [])
  }

  const loadLeads = async () => {
    const data = await api.get('/api/leads?limit=50').catch(() => null)
    if (data) setLeads(data.leads || [])
  }

  useEffect(() => { loadStats(); loadLeads() }, [])
  useEffect(() => { if (tab === 'database') loadDatabase() }, [tab, dbSearch])

  const handleFind = async () => {
    if (!companyName) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/api/persons/find', { companyName, website, city, verifyEmails })
      setResult(data)
      showMsg('success', `${data.found} kişi bulundu!`)
      loadStats()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    setBatchLoading(true)
    try {
      const data = await api.post('/api/persons/batch', { maxLeads: 5 })
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
      const data = await api.post('/api/persons/find', {
        companyName: lead.company_name,
        website: lead.website || '',
        city: lead.city || '',
        leadId: lead.id,
      })
      showMsg('success', `${lead.company_name}: ${data.found} kişi bulundu`)
      loadLeads()
      loadStats()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setFindingId(null)
    }
  }

  const handleVerify = async () => {
    if (!emailToVerify) return
    setVerifying(true)
    try {
      const data = await api.post('/api/persons/verify-email', { email: emailToVerify })
      setVerifyResult(data)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleGenerate = async () => {
    if (!genFirst || !genLast || !genDomain) return
    setGenerating(true)
    try {
      const data = await api.post('/api/persons/generate-emails', {
        firstName: genFirst, lastName: genLast, domain: genDomain
      })
      setGenResult(data)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setGenerating(false)
    }
  }

  const confidenceColor = (c: number) => {
    if (c >= 80) return 'text-emerald-400'
    if (c >= 60) return 'text-yellow-400'
    return 'text-slate-400'
  }

  const leadsWithContact = leads.filter(l => l.contact_name)
  const leadsWithoutContact = leads.filter(l => !l.contact_name)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crosshair size={24} className="text-purple-400" />
          Karar Verici Avı
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Web sitesi + LinkedIn + Email pattern engine ile profesyonel kişi bulma</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Kişi DB', value: stats.totalPersons, color: 'text-purple-400' },
            { label: 'Doğrulanan Email', value: stats.verifiedEmails, color: 'text-green-400' },
            { label: 'LinkedIn\'li', value: stats.withLinkedIn, color: 'text-blue-400' },
            { label: 'Lead', value: stats.totalLeads, color: 'text-slate-300' },
            { label: 'Kapsama', value: `%${stats.coverageRate}`, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'find', label: 'Kişi Bul' },
          { id: 'database', label: `Veritabanı (${stats?.totalPersons || 0})` },
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

      {/* KİŞİ BUL */}
      {tab === 'find' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Tek Firma */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold">Firma Araştır</h2>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Firma adı *"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              <div className="grid grid-cols-2 gap-3">
                <input value={website} onChange={e => setWebsite(e.target.value)}
                  placeholder="Website (önerilir)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Şehir"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={verifyEmails} onChange={e => setVerifyEmails(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-700 peer-checked:bg-green-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-slate-400 text-xs">Email doğrulama yap (yavaş ama güvenilir)</span>
              </div>
              <button onClick={handleFind} disabled={loading || !companyName}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                {loading ? 'Araştırılıyor...' : 'Kişi Bul'}
              </button>
            </div>

            {/* Araçlar */}
            <div className="space-y-4">
              {/* Email Doğrula */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-medium mb-3 text-sm">Email Doğrula</h3>
                <div className="flex gap-2">
                  <input value={emailToVerify} onChange={e => setEmailToVerify(e.target.value)}
                    placeholder="email@firma.com"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                  <button onClick={handleVerify} disabled={verifying || !emailToVerify}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                    {verifying ? <RefreshCw size={13} className="animate-spin" /> : 'Doğrula'}
                  </button>
                </div>
                {verifyResult && (
                  <div className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${verifyResult.valid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {verifyResult.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {verifyResult.valid ? 'Geçerli' : 'Geçersiz'} — %{verifyResult.confidence} güven — {verifyResult.reason}
                  </div>
                )}
              </div>

              {/* Email Pattern */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-medium mb-3 text-sm">Email Pattern Üret</h3>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input value={genFirst} onChange={e => setGenFirst(e.target.value)}
                    placeholder="Ad" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" />
                  <input value={genLast} onChange={e => setGenLast(e.target.value)}
                    placeholder="Soyad" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" />
                  <input value={genDomain} onChange={e => setGenDomain(e.target.value)}
                    placeholder="domain.com" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" />
                </div>
                <button onClick={handleGenerate} disabled={generating || !genFirst || !genLast || !genDomain}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                  {generating ? 'Üretiliyor...' : 'Email Pattern Üret + Doğrula'}
                </button>
                {genResult && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {genResult.patterns?.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between text-xs p-1.5 rounded ${p.valid ? 'bg-green-500/5' : 'bg-slate-900'}`}>
                        <span className={p.valid ? 'text-green-300' : 'text-slate-400'}>{p.email}</span>
                        <span className={confidenceColor(p.confidence)}>%{p.confidence}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toplu Tara */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-medium mb-2 text-sm">Toplu Lead Tara</h3>
                <p className="text-slate-500 text-xs mb-3">Website'i olan 5 leadi otomatik tara</p>
                <button onClick={handleBatch} disabled={batchLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg transition">
                  {batchLoading ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
                  {batchLoading ? 'Taranıyor...' : '5 Lead Tara'}
                </button>
              </div>
            </div>
          </div>

          {/* Sonuçlar */}
          {result && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
                <User size={15} className="text-purple-400" />
                <h2 className="text-white font-semibold">{result.company} — {result.found} Kişi Bulundu</h2>
              </div>
              {result.found === 0 ? (
                <div className="p-12 text-center">
                  <Users size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Kişi bulunamadı — website ekleyerek tekrar deneyin</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {result.persons?.map((p: any, i: number) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                            {p.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white text-sm font-medium">{p.full_name}</p>
                              <span className={`text-xs font-bold ${confidenceColor(p.confidence)}`}>%{p.confidence}</span>
                            </div>
                            <p className="text-slate-400 text-xs">{p.title} · {p.source}</p>
                            {p.email && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Mail size={11} className={p.email_verified ? 'text-green-400' : 'text-blue-400'} />
                                <span className={`text-xs ${p.email_verified ? 'text-green-300' : 'text-blue-300'}`}>{p.email}</span>
                                {p.email_verified && <CheckCircle size={10} className="text-green-400" />}
                                {p.email_confidence && <span className="text-slate-500 text-xs">%{p.email_confidence}</span>}
                              </div>
                            )}
                            {p.email_patterns && (
                              <div className="mt-1">
                                <p className="text-slate-500 text-xs">Olası: {p.email_patterns.slice(0,3).join(', ')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {p.linkedin_url && (
                          <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition">
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
      )}

      {/* VERİTABANI */}
      {tab === 'database' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
            <Database size={15} className="text-purple-400" />
            <h2 className="text-white font-semibold">Kişi Veritabanı</h2>
            <div className="ml-auto flex-1 max-w-xs relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={dbSearch} onChange={e => setDbSearch(e.target.value)}
                placeholder="İsim ara..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          {!dbPersons.length ? (
            <div className="p-12 text-center">
              <Database size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Henüz kişi yok — firma araştırınca burada birikir</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
              {dbPersons.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-300 text-xs font-bold">
                      {p.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.full_name}</p>
                      <p className="text-slate-400 text-xs">{p.title} · {p.company_name}</p>
                      {p.email && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {p.email_verified ? <CheckCircle size={10} className="text-green-400" /> : <Mail size={10} className="text-slate-500" />}
                          <span className="text-xs text-slate-400">{p.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${confidenceColor(p.confidence)}`}>%{p.confidence}</span>
                    {p.linkedin_url && (
                      <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 transition">
                        <Linkedin size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEAD LİSTESİ */}
      {tab === 'leads' && (
        <div className="space-y-4">
          {leadsWithContact.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <h3 className="text-white font-medium text-sm">Kişi Bulunanlar ({leadsWithContact.length})</h3>
              </div>
              <div className="divide-y divide-slate-700/50 max-h-48 overflow-y-auto">
                {leadsWithContact.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-white text-sm">{lead.company_name}</p>
                      <p className="text-purple-300 text-xs">{lead.contact_name} {lead.email && `· ${lead.email}`}</p>
                    </div>
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                <h3 className="text-white font-medium text-sm">Kişi Bulunamayanlar ({leadsWithoutContact.length})</h3>
              </div>
              <button onClick={handleBatch} disabled={batchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition">
                {batchLoading ? <RefreshCw size={12} className="animate-spin" /> : <Crosshair size={12} />}
                {batchLoading ? 'Taranıyor...' : '5 Lead Otomatik Tara'}
              </button>
            </div>
            <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
              {leadsWithoutContact.map(lead => (
                <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 text-xs font-bold">
                      {lead.company_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm">{lead.company_name}</p>
                      <p className="text-slate-500 text-xs">{lead.city} · {lead.website ? '🌐 website var' : 'website yok'}</p>
                    </div>
                  </div>
                  <button onClick={() => findForLead(lead)} disabled={findingId === lead.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs rounded-lg transition disabled:opacity-50">
                    {findingId === lead.id ? <RefreshCw size={11} className="animate-spin" /> : <Crosshair size={11} />}
                    {findingId === lead.id ? 'Aranıyor...' : 'Bul'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}