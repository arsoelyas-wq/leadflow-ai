'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Crosshair, Search, RefreshCw, Zap, Users, Mail,
  Globe, Linkedin, CheckCircle, AlertCircle, Phone,
  Building2, MapPin, Star, Copy, ExternalLink,
  UserCheck, BarChart3, Square, CheckSquare, X,
} from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  website?: string
  city?: string
  contact_name?: string
  email?: string
  phone?: string
  score: number
}

interface DecisionMaker {
  name:          string | null
  title:         string | null
  email?:        string | null
  phone?:        string | null
  linkedinUrl?:  string | null
  source:        string
  confidence:    'high' | 'medium' | 'low'
  isDecisionMaker: boolean
  emailStatus?:  'valid' | 'accept-all' | 'invalid' | 'unknown'
}

interface SearchResult {
  company:        string
  found:          number
  decisionMakers: DecisionMaker[]
}

interface Stats {
  totalLeads:  number
  withContact: number
  withEmail:   number
  withPhone:   number
  coverageRate: number
}

const CONF_CFG = {
  high:   { label: 'Yüksek', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  medium: { label: 'Orta',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  low:    { label: 'Düşük',  color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
}

function getSourceInfo(source: string) {
  if (source.includes('LinkedIn')) return { icon: Linkedin, color: 'text-blue-400',   label: 'LinkedIn' }
  if (source.includes('Website'))  return { icon: Globe,    color: 'text-purple-400', label: 'Website'  }
  if (source.includes('RDAP'))     return { icon: Globe,    color: 'text-slate-400',  label: 'RDAP'     }
  if (source === 'Email')          return { icon: Mail,     color: 'text-amber-400',  label: 'Email'    }
  return                                  { icon: Search,   color: 'text-amber-400',  label: 'Google'   }
}

export default function DecisionMakerPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Single search
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  // Batch scan
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchSearch, setBatchSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; company: string } | null>(null)
  const [scanResults, setScanResults] = useState<any[]>([])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.allSettled([
        api.get('/api/leads?limit=500'),
        api.get('/api/decision-maker/stats'),
      ])
      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.leads || [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const leadsWithoutContact = leads.filter(l => !l.contact_name)
  const leadsWithContact    = leads.filter(l =>  l.contact_name)
  const selectedLead        = leads.find(l => l.id === selectedLeadId)

  // ── Single search ──────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!selectedLeadId || !selectedLead) return
    setSearching(true)
    setSearchResult(null)
    try {
      const data = await api.post('/api/decision-maker/find', {
        companyName: selectedLead.company_name,
        website:     selectedLead.website,
        city:        selectedLead.city,
        leadId:      selectedLeadId,
      })
      setSearchResult(data)
      if (data.found > 0) showMsg('success', `${data.found} kişi bulundu!`)
      else                showMsg('error',   'Bu şirket için kimse bulunamadı.')
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSearching(false)
    }
  }

  const saveDM = async (dm: DecisionMaker, key: string) => {
    if (!selectedLeadId) return
    setSaving(key)
    try {
      const body: any = {}
      if (dm.name)  body.contact_name = dm.name
      if (dm.email) body.email        = dm.email
      if (dm.phone) body.phone        = dm.phone
      await api.patch(`/api/leads/${selectedLeadId}`, body)
      setSavedKeys(prev => new Set([...prev, key]))
      showMsg('success', `${dm.name || dm.email || dm.phone} lead'e kaydedildi!`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSaving(null)
    }
  }

  const copy = (text: string, k: string) => {
    navigator.clipboard.writeText(text)
    setCopied(k)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Batch multi-select scan ────────────────────────────────────────────────

  const filteredBatch = leadsWithoutContact.filter(l =>
    !batchSearch || l.company_name.toLowerCase().includes(batchSearch.toLowerCase()) ||
    (l.city || '').toLowerCase().includes(batchSearch.toLowerCase())
  )

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll  = () => setSelectedIds(new Set(filteredBatch.map(l => l.id)))
  const clearAll   = () => setSelectedIds(new Set())

  const runBatchScan = async () => {
    const toScan = leadsWithoutContact.filter(l => selectedIds.has(l.id))
    if (!toScan.length) return
    setScanning(true)
    setScanResults([])

    for (let i = 0; i < toScan.length; i++) {
      const lead = toScan[i]
      setScanProgress({ current: i + 1, total: toScan.length, company: lead.company_name })
      try {
        const data = await api.post('/api/decision-maker/find', {
          companyName: lead.company_name,
          website:     lead.website,
          city:        lead.city,
          leadId:      lead.id,
        })
        if (data.found > 0) {
          const best = data.decisionMakers.find((d: DecisionMaker) => d.isDecisionMaker && d.name)
                    || data.decisionMakers.find((d: DecisionMaker) => d.name)
                    || data.decisionMakers[0]
          setScanResults(prev => [...prev, {
            id:      lead.id,
            company: lead.company_name,
            found:   data.found,
            name:    best?.name,
            title:   best?.title,
            email:   best?.email,
            phone:   best?.phone,
            source:  best?.source,
          }])
        }
      } catch {}
    }

    setScanning(false)
    setScanProgress(null)
    setSelectedIds(new Set())
    load()
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function DMCard({ dm, idx }: { dm: DecisionMaker; idx: number }) {
    const conf = CONF_CFG[dm.confidence] || CONF_CFG.low
    const src  = getSourceInfo(dm.source)
    const key  = `${selectedLeadId}-${idx}`
    const saved = savedKeys.has(key)
    const hasContact = dm.name || dm.email || dm.phone

    return (
      <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3.5 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-9 h-9 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-300 font-bold text-sm flex-shrink-0 mt-0.5">
          {dm.name?.[0]?.toUpperCase() || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {dm.name && <p className="text-white text-sm font-semibold">{dm.name}</p>}
            {dm.isDecisionMaker && (
              <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-md font-medium">
                Karar Verici
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${conf.bg} ${conf.color} font-medium`}>
              {conf.label}
            </span>
            <span className={`text-[10px] flex items-center gap-1 ${src.color}`}>
              <src.icon size={9} /> {src.label}
            </span>
            {dm.emailStatus === 'valid' && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle size={9} /> Doğrulandı
              </span>
            )}
          </div>
          {dm.title && <p className="text-slate-400 text-xs mt-0.5">{dm.title}</p>}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {dm.email && (
              <button onClick={() => copy(dm.email!, `em-${idx}`)}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition">
                <Mail size={10} /> {dm.email}
                {copied === `em-${idx}` ? <CheckCircle size={9} /> : <Copy size={9} />}
              </button>
            )}
            {dm.phone && (
              <button onClick={() => copy(dm.phone!, `ph-${idx}`)}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition">
                <Phone size={10} /> {dm.phone}
                {copied === `ph-${idx}` ? <CheckCircle size={9} /> : <Copy size={9} />}
              </button>
            )}
            {dm.linkedinUrl && (
              <a href={dm.linkedinUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition">
                <Linkedin size={9} /> LinkedIn <ExternalLink size={8} />
              </a>
            )}
          </div>
        </div>

        {/* Save button */}
        {hasContact && (
          <button onClick={() => saveDM(dm, key)}
            disabled={saving === key || saved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-violet-600/80 hover:bg-violet-600 text-white disabled:opacity-50'
            }`}>
            {saving === key
              ? <RefreshCw size={11} className="animate-spin" />
              : saved
              ? <><CheckCircle size={11} /> Kaydedildi</>
              : <><UserCheck size={11} /> Lead'e Ekle</>}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
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

      {/* Message */}
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
            { label: 'Toplam Lead',     value: stats.totalLeads,         icon: Users,     color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
            { label: 'Yetkili Bulunan', value: stats.withContact,        icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Email Bulunan',   value: stats.withEmail,          icon: Mail,      color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
            { label: 'Kapsama Oranı',   value: `%${stats.coverageRate}`, icon: BarChart3, color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700 w-fit">
        {[
          { id: 'single', label: 'Tek Şirket Ara' },
          { id: 'batch',  label: `Çoklu Seçim${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}` },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Single tab ── */}
      {activeTab === 'single' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            Şirket Seç ve Çalışanları Bul
          </h2>

          <select
            value={selectedLeadId}
            onChange={e => { setSelectedLeadId(e.target.value); setSearchResult(null) }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition"
          >
            <option value="">— Şirket seçin —</option>
            {leadsWithoutContact.length > 0 && (
              <>
                <option disabled>── Yetkili bulunmayanlar ({leadsWithoutContact.length}) ──</option>
                {leadsWithoutContact.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.company_name}{l.city ? ` · ${l.city}` : ''} · Puan: {l.score}
                  </option>
                ))}
              </>
            )}
            {leadsWithContact.length > 0 && (
              <>
                <option disabled>── Yetkili bulunanlar ({leadsWithContact.length}) ──</option>
                {leadsWithContact.map(l => (
                  <option key={l.id} value={l.id}>
                    ✓ {l.company_name} · {l.contact_name}
                  </option>
                ))}
              </>
            )}
          </select>

          {/* Selected lead info + search button */}
          {selectedLead && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700">
              <Building2 size={14} className="text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{selectedLead.company_name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {selectedLead.city && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{selectedLead.city}</span>}
                  {selectedLead.website && <span className="text-xs text-slate-500 flex items-center gap-1"><Globe size={10} />{selectedLead.website}</span>}
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Star size={10} />Puan: {selectedLead.score}</span>
                  {selectedLead.contact_name && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={10} />{selectedLead.contact_name}</span>}
                </div>
              </div>
              <button onClick={handleSearch} disabled={searching}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex-shrink-0">
                {searching
                  ? <><RefreshCw size={14} className="animate-spin" /> Taranıyor...</>
                  : <><Search size={14} /> Çalışanları Bul</>}
              </button>
            </div>
          )}

          {/* Searching loader */}
          {searching && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <RefreshCw size={28} className="animate-spin text-violet-400" />
              <p className="text-slate-400 text-sm">LinkedIn, Google ve web sitesi taranıyor...</p>
              <div className="flex gap-2 mt-1">
                {['LinkedIn', 'Google', 'Website'].map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-400 rounded-full animate-pulse">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {searchResult && !searching && (() => {
            const dms      = searchResult.decisionMakers.filter(d => d.isDecisionMaker && d.name)
            const others   = searchResult.decisionMakers.filter(d => !d.isDecisionMaker && d.name)
            const contacts = searchResult.decisionMakers.filter(d => !d.name && (d.phone || d.email))

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">
                    <span className="text-violet-400">{searchResult.found}</span> kişi bulundu
                    <span className="text-slate-500 font-normal ml-2">— {searchResult.company}</span>
                  </p>
                  <div className="flex gap-2 text-xs text-slate-500">
                    {dms.length > 0 && <span className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full">{dms.length} karar verici</span>}
                    {others.length > 0 && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-full">{others.length} çalışan</span>}
                  </div>
                </div>

                {searchResult.found === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Bu şirket için kimse bulunamadı. Web sitesi veya şehir bilgisi ekleyin.
                  </div>
                )}

                {/* Decision makers */}
                {dms.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Crosshair size={11} /> Karar Vericiler ({dms.length})
                    </p>
                    {dms.map((dm, i) => <DMCard key={i} dm={dm} idx={i} />)}
                  </div>
                )}

                {/* Other employees */}
                {others.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={11} /> Diğer Çalışanlar ({others.length})
                    </p>
                    {others.map((dm, i) => <DMCard key={`o${i}`} dm={dm} idx={dms.length + i} />)}
                  </div>
                )}

                {/* Contact-only records */}
                {contacts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={11} /> İletişim Bilgileri ({contacts.length})
                    </p>
                    {contacts.map((dm, i) => <DMCard key={`c${i}`} dm={dm} idx={dms.length + others.length + i} />)}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Batch multi-select tab ── */}
      {activeTab === 'batch' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Çoklu Lead Tarama
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                İstediğiniz leadleri seçin, LinkedIn ve tüm kaynaklardan çalışanlar ve karar vericiler otomatik bulunur.
              </p>
            </div>
            <button onClick={runBatchScan}
              disabled={scanning || selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex-shrink-0">
              {scanning
                ? <><RefreshCw size={14} className="animate-spin" /> Taranıyor...</>
                : <><Zap size={14} /> {selectedIds.size > 0 ? `${selectedIds.size} Lead'i Tara` : 'Lead Seçin'}</>}
            </button>
          </div>

          {/* Search + select controls */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={batchSearch}
                onChange={e => setBatchSearch(e.target.value)}
                placeholder="Şirket veya şehir ara..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              {batchSearch && (
                <button onClick={() => setBatchSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition">
              <CheckSquare size={13} /> Tümünü Seç
            </button>
            {selectedIds.size > 0 && (
              <button onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition">
                <Square size={13} /> Temizle
              </button>
            )}
          </div>

          {/* Lead list */}
          {!scanning && (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {leadsWithoutContact.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Tüm leadlerde karar verici bulunmuş!
                </div>
              ) : filteredBatch.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Arama sonucu bulunamadı.
                </div>
              ) : filteredBatch.map(lead => {
                const sel = selectedIds.has(lead.id)
                return (
                  <button key={lead.id} onClick={() => toggleId(lead.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition border ${
                      sel
                        ? 'bg-violet-600/10 border-violet-500/30 text-white'
                        : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600 text-slate-300'
                    }`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                      sel ? 'bg-violet-600 border-violet-600' : 'border-slate-600'
                    }`}>
                      {sel && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                      {lead.company_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.company_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.city && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={9} />{lead.city}</span>}
                        {lead.website && <span className="text-xs text-slate-500 flex items-center gap-1"><Globe size={9} />{lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">Puan: {lead.score}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Progress bar while scanning */}
          {scanning && scanProgress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <p className="text-slate-300">
                  <span className="text-amber-400 font-medium">{scanProgress.current}</span>/{scanProgress.total} taranıyor
                </p>
                <p className="text-slate-500 text-xs truncate max-w-xs">{scanProgress.company}</p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs text-center">
                Her şirket için LinkedIn + Google + Website taranıyor... Sayfayı kapatmayın.
              </p>
            </div>
          )}

          {/* Live scan results */}
          {scanResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Bulunanlar ({scanResults.length})
              </p>
              {scanResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-xl border border-emerald-500/20">
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.company}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {r.name && <span className="text-xs text-emerald-300">{r.name}</span>}
                      {r.title && <span className="text-xs text-slate-500">{r.title}</span>}
                      {r.email && <span className="text-xs text-blue-400 flex items-center gap-1"><Mail size={9} />{r.email}</span>}
                      {r.phone && <span className="text-xs text-emerald-400 flex items-center gap-1"><Phone size={9} />{r.phone}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{r.found} kişi</span>
                </div>
              ))}
            </div>
          )}

          {/* Final summary */}
          {!scanning && scanResults.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 font-medium text-sm">
                Tarama tamamlandı — {scanResults.length} lead güncellendi
              </p>
            </div>
          )}
        </div>
      )}

      {/* Leads with contact summary */}
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
            {leadsWithContact.slice(0, 10).map(lead => (
              <div key={lead.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-900/40 rounded-xl">
                <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {lead.company_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{lead.company_name}</p>
                  <p className="text-slate-400 text-xs">{lead.contact_name}</p>
                </div>
                {lead.email && (
                  <button onClick={() => copy(lead.email!, `ld-${lead.id}`)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition">
                    <Mail size={11} />
                    {copied === `ld-${lead.id}` ? 'Kopyalandı!' : lead.email}
                  </button>
                )}
                <span className="text-xs text-emerald-400 flex items-center gap-1 flex-shrink-0">
                  <CheckCircle size={11} /> Hazır
                </span>
              </div>
            ))}
            {leadsWithContact.length > 10 && (
              <p className="text-center text-slate-500 text-xs pt-1">+{leadsWithContact.length - 10} lead daha</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
