'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Crosshair, Search, RefreshCw, Zap, Users, Mail,
  Globe, Linkedin, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Phone, Building2, MapPin, Star, TrendingUp,
  Copy, ExternalLink, UserCheck, BarChart3
} from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  website?: string
  city?: string
  contact_name?: string
  email?: string
  score: number
}

interface DecisionMaker {
  name: string
  title: string
  company: string
  email?: string
  phone?: string
  linkedinUrl?: string
  source: string
  sourceUrl?: string
  confidence: 'high' | 'medium' | 'low'
}

interface SearchResult {
  company: string
  found: number
  decisionMakers: DecisionMaker[]
}

interface Stats {
  totalLeads: number
  withContact: number
  withEmail: number
  coverageRate: number
}

const confidenceConfig = {
  high:   { label: 'Yüksek',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  medium: { label: 'Orta',    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400' },
  low:    { label: 'Düşük',   color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',     dot: 'bg-slate-400' },
}

const sourceConfig: Record<string, { icon: any; color: string; label: string }> = {
  LinkedIn: { icon: Linkedin,  color: 'text-blue-400',   label: 'LinkedIn' },
  Website:  { icon: Globe,     color: 'text-purple-400', label: 'Website'  },
  Google:   { icon: Search,    color: 'text-amber-400',  label: 'Google'   },
}

export default function DecisionMakerPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [searching, setSearching] = useState(false)
  const [batchSearching, setBatchSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')
  const [batchResult, setBatchResult] = useState<any>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.allSettled([
        api.get('/api/leads?limit=200'),
        api.get('/api/decision-maker/stats'),
      ])
      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.leads || [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Seçili lead objesi
  const selectedLead = leads.find(l => l.id === selectedLeadId)

  // Tek şirket ara
  const handleSearch = async () => {
    if (!selectedLeadId || !selectedLead) return
    setSearching(true)
    setSearchResult(null)
    try {
      const data = await api.post('/api/decision-maker/find', {
        companyName: selectedLead.company_name,
        website: selectedLead.website,
        city: selectedLead.city,
        leadId: selectedLeadId,
      })
      setSearchResult(data)
      if (data.found > 0) {
        showMsg('success', `${data.found} karar verici bulundu!`)
      } else {
        showMsg('error', 'Bu şirket için karar verici bulunamadı.')
      }
      load() // stats güncelle
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSearching(false)
    }
  }

  // Toplu tarama
  const handleBatch = async () => {
    setBatchSearching(true)
    setBatchResult(null)
    try {
      const data = await api.post('/api/decision-maker/batch', { maxLeads: 20 })
      setBatchResult(data)
      showMsg('success', data.message)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setBatchSearching(false)
    }
  }

  // Karar vericiyi lead'e kaydet
  const saveTolead = async (dm: DecisionMaker, index: number) => {
    if (!selectedLeadId) return
    const key = `${selectedLeadId}-${index}`
    setSaving(key)
    try {
      await api.patch(`/api/leads/${selectedLeadId}`, {
        contact_name: dm.name,
        ...(dm.email ? { email: dm.email } : {}),
        ...(dm.phone ? { phone: dm.phone } : {}),
      })
      setSavedIds(prev => new Set([...prev, key]))
      showMsg('success', `${dm.name} lead'e kaydedildi!`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSaving(null)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // Karar verici bulunmamış leadler (öncelikli)
  const leadsWithoutContact = leads.filter(l => !l.contact_name)
  const leadsWithContact    = leads.filter(l => l.contact_name)

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Crosshair size={18} className="text-violet-400" />
            </div>
            Karar Verici Bulucu
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Şirketlerin CEO, satın alma müdürü ve yetkililerini LinkedIn, Google ve web sitelerinden otomatik bul
          </p>
        </div>
      </div>

      {/* Mesaj */}
      {msg && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Lead',       value: stats.totalLeads,   icon: Users,     color: 'text-blue-400',    bg: 'bg-blue-500/10' },
            { label: 'Yetkili Bulunan',   value: stats.withContact,  icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Email Bulunan',     value: stats.withEmail,    icon: Mail,      color: 'text-purple-400',  bg: 'bg-purple-500/10' },
            { label: 'Kapsama Oranı',     value: `%${stats.coverageRate}`, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon size={15} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab seçici */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700 w-fit">
        {[
          { id: 'single', label: 'Tek Şirket Ara' },
          { id: 'batch',  label: 'Toplu Tarama (20 Lead)' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tek şirket arama */}
      {activeTab === 'single' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            Şirket Seç ve Karar Vericiyi Bul
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {/* Yetkili bulunmayanlar önce */}
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">
                Henüz yetkili bulunamayanlar ({leadsWithoutContact.length})
              </p>
              <select
                value={selectedLeadId}
                onChange={e => { setSelectedLeadId(e.target.value); setSearchResult(null) }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition"
              >
                <option value="">— Şirket seçin —</option>
                {leadsWithoutContact.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.company_name}{l.city ? ` · ${l.city}` : ''} · Puan: {l.score}
                  </option>
                ))}
                {leadsWithContact.length > 0 && (
                  <>
                    <option disabled>── Yetkili bulunanlar ──</option>
                    {leadsWithContact.map(l => (
                      <option key={l.id} value={l.id}>
                        ✓ {l.company_name} · {l.contact_name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Seçili lead bilgisi */}
            {selectedLead && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700">
                <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{selectedLead.company_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {selectedLead.city && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> {selectedLead.city}
                      </span>
                    )}
                    {selectedLead.website && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Globe size={10} /> {selectedLead.website}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Star size={10} /> Puan: {selectedLead.score}
                    </span>
                    {selectedLead.contact_name && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={10} /> {selectedLead.contact_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex-shrink-0"
                >
                  {searching
                    ? <><RefreshCw size={14} className="animate-spin" /> Aranıyor...</>
                    : <><Search size={14} /> Karar Vericiyi Bul</>
                  }
                </button>
              </div>
            )}

            {!selectedLead && (
              <button
                onClick={handleSearch}
                disabled={!selectedLeadId || searching}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition"
              >
                {searching
                  ? <><RefreshCw size={14} className="animate-spin" /> Aranıyor...</>
                  : <><Search size={14} /> Karar Vericiyi Bul</>
                }
              </button>
            )}
          </div>

          {/* Arama sonuçları */}
          {searching && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <RefreshCw size={28} className="animate-spin text-violet-400" />
              <p className="text-slate-400 text-sm">LinkedIn, Google ve web sitesi taranıyor...</p>
              <div className="flex gap-2 mt-1">
                {['LinkedIn', 'Google', 'Website'].map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-400 rounded-full animate-pulse">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {searchResult && !searching && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">
                  <span className="text-violet-400">{searchResult.found}</span> karar verici bulundu
                  <span className="text-slate-500 font-normal ml-2">— {searchResult.company}</span>
                </p>
                <div className="flex gap-2">
                  {Object.entries(
                    searchResult.decisionMakers.reduce((acc: Record<string,number>, dm) => {
                      acc[dm.source] = (acc[dm.source] || 0) + 1; return acc
                    }, {})
                  ).map(([src, count]) => {
                    const cfg = sourceConfig[src]
                    if (!cfg) return null
                    return (
                      <span key={src} className={`text-xs px-2 py-1 bg-slate-700 rounded-full flex items-center gap-1 ${cfg.color}`}>
                        <cfg.icon size={10} /> {src}: {count}
                      </span>
                    )
                  })}
                </div>
              </div>

              {searchResult.decisionMakers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Bu şirket için karar verici bulunamadı. Web sitesi veya şehir bilgisi eklemeyi deneyin.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResult.decisionMakers.map((dm, i) => {
                    const conf  = confidenceConfig[dm.confidence] || confidenceConfig.low
                    const src   = sourceConfig[dm.source] || sourceConfig.Google
                    const key   = `${selectedLeadId}-${i}`
                    const saved = savedIds.has(key)

                    return (
                      <div key={i} className="bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-4 px-4 py-3.5">
                          {/* Avatar */}
                          <div className="w-9 h-9 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-300 font-bold text-sm flex-shrink-0">
                            {dm.name?.[0]?.toUpperCase() || '?'}
                          </div>

                          {/* Bilgi */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white text-sm font-semibold">{dm.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${conf.bg} ${conf.color} font-medium`}>
                                {conf.label} güven
                              </span>
                              <span className={`text-[10px] flex items-center gap-1 ${src.color}`}>
                                <src.icon size={9} /> {src.label}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">{dm.title}{dm.company ? ` · ${dm.company}` : ''}</p>

                            {/* İletişim bilgileri */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {dm.email && (
                                <button
                                  onClick={() => copyToClipboard(dm.email!, `email-${i}`)}
                                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition"
                                >
                                  <Mail size={10} />
                                  {dm.email}
                                  {copied === `email-${i}` ? <CheckCircle size={9} /> : <Copy size={9} />}
                                </button>
                              )}
                              {dm.phone && (
                                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                                  <Phone size={10} /> {dm.phone}
                                </span>
                              )}
                              {dm.linkedinUrl && (
                                <a href={dm.linkedinUrl} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition">
                                  <Linkedin size={9} /> Profil
                                  <ExternalLink size={8} />
                                </a>
                              )}
                              {dm.sourceUrl && !dm.linkedinUrl && (
                                <a href={dm.sourceUrl} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition">
                                  <ExternalLink size={9} /> Kaynak
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Kaydet butonu */}
                          <button
                            onClick={() => saveTolead(dm, i)}
                            disabled={saving === key || saved}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                              saved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                                : 'bg-violet-600/80 hover:bg-violet-600 text-white disabled:opacity-50'
                            }`}
                          >
                            {saving === key
                              ? <RefreshCw size={11} className="animate-spin" />
                              : saved
                              ? <><CheckCircle size={11} /> Kaydedildi</>
                              : <><UserCheck size={11} /> Lead'e Kaydet</>
                            }
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toplu tarama */}
      {activeTab === 'batch' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Toplu Otomatik Tarama
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Henüz yetkili bulunamayan ilk <span className="text-white">20 lead</span>'i otomatik tarar.
                Her şirket için LinkedIn, Google ve web sitesi kontrol edilir.
              </p>
            </div>
            <button
              onClick={handleBatch}
              disabled={batchSearching}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex-shrink-0"
            >
              {batchSearching
                ? <><RefreshCw size={14} className="animate-spin" /> Taranıyor...</>
                : <><Zap size={14} /> Toplu Tara</>
              }
            </button>
          </div>

          {/* Bilgi kartları */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Linkedin, color: 'text-blue-400',   bg: 'bg-blue-500/10',   title: 'LinkedIn',  desc: 'CEO, direktör ve yönetici profilleri' },
              { icon: Search,   color: 'text-amber-400',  bg: 'bg-amber-500/10',  title: 'Google',    desc: 'Web araması ile yetkili tespiti' },
              { icon: Globe,    color: 'text-purple-400', bg: 'bg-purple-500/10', title: 'Website',   desc: 'İletişim ve hakkımızda sayfaları' },
            ].map(s => (
              <div key={s.title} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <div className={`w-7 h-7 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <s.icon size={13} className={s.color} />
                </div>
                <p className="text-white text-sm font-medium">{s.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Tarama durumu */}
          {batchSearching && (
            <div className="flex flex-col items-center py-8 gap-3">
              <RefreshCw size={28} className="animate-spin text-amber-400" />
              <p className="text-slate-300 text-sm font-medium">20 şirket taranıyor...</p>
              <p className="text-slate-500 text-xs">Bu işlem 2-3 dakika sürebilir. Sayfayı kapatmayın.</p>
              <div className="w-48 bg-slate-700 rounded-full h-1.5 mt-2">
                <div className="bg-amber-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Toplu sonuçlar */}
          {batchResult && !batchSearching && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-emerald-300 font-medium text-sm">{batchResult.message}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Lead'lerin iletişim bilgileri güncellendi</p>
                </div>
              </div>

              {batchResult.results?.length > 0 && (
                <div className="space-y-2">
                  {batchResult.results.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                      <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={12} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{r.company}</p>
                        <p className="text-slate-400 text-xs">{r.found} · {r.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Taranacak lead yok */}
          {!batchSearching && !batchResult && stats && stats.withContact >= stats.totalLeads && (
            <div className="text-center py-8">
              <TrendingUp size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-medium">Tüm leadlerde yetkili bulunmuş!</p>
              <p className="text-slate-400 text-sm mt-1">Yeni lead eklendiğinde tekrar tarayabilirsiniz.</p>
            </div>
          )}
        </div>
      )}

      {/* Yetkili bulunan leadler özeti */}
      {leadsWithContact.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-400" />
              Yetkili Bulunan Leadler
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                {leadsWithContact.length}
              </span>
            </h2>
          </div>
          <div className="space-y-2">
            {leadsWithContact.slice(0, 8).map(lead => (
              <div key={lead.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-900/40 rounded-xl">
                <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {lead.company_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{lead.company_name}</p>
                  <p className="text-slate-400 text-xs">{lead.contact_name}</p>
                </div>
                {lead.email && (
                  <button
                    onClick={() => copyToClipboard(lead.email!, `lead-${lead.id}`)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    <Mail size={11} />
                    {copied === `lead-${lead.id}` ? 'Kopyalandı!' : lead.email}
                  </button>
                )}
                <span className="text-xs text-emerald-400 flex items-center gap-1 flex-shrink-0">
                  <CheckCircle size={11} /> Hazır
                </span>
              </div>
            ))}
            {leadsWithContact.length > 8 && (
              <p className="text-center text-slate-500 text-xs pt-1">
                +{leadsWithContact.length - 8} lead daha
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}