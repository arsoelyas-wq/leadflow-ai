'use client'
import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Crosshair, Search, RefreshCw, Users, Mail,
  Globe, Linkedin, CheckCircle, AlertCircle, Phone,
  Building2, MapPin, UserCheck, BarChart3, X,
  ChevronDown, ChevronUp, ExternalLink, Copy,
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

interface Employee {
  name:        string | null
  title:       string | null
  email?:      string | null
  phone?:      string | null
  linkedinUrl?: string | null
  source:      string
  confidence:  'high' | 'medium' | 'low'
  isDecisionMaker: boolean
}

interface ScanResult {
  leadId:    string
  company:   string
  employees: Employee[]
  done:      boolean
  error?:    string
}

interface Stats {
  totalLeads:  number
  withContact: number
  withEmail:   number
  coverageRate: number
}

const CONF = {
  high:   { label: 'Yüksek', color: 'text-emerald-400', ring: 'border-emerald-500/30 bg-emerald-500/10' },
  medium: { label: 'Orta',   color: 'text-amber-400',   ring: 'border-amber-500/30 bg-amber-500/10'   },
  low:    { label: 'Düşük',  color: 'text-slate-400',   ring: 'border-slate-500/30 bg-slate-700/50'   },
}

type Filter = 'all' | 'no-contact' | 'has-contact'

export default function DecisionMakerPage() {
  const [leads, setLeads]   = useState<Lead[]>([])
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter / search
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<Filter>('no-contact')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Scanning
  const [scanning, setScanning]     = useState(false)
  const [results, setResults]       = useState<ScanResult[]>([])
  const [collapsed, setCollapsed]   = useState<Set<string>>(new Set())

  // Per-card save state
  const [saving, setSaving]       = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [copied, setCopied]       = useState<string | null>(null)
  const [msg, setMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [lr, sr] = await Promise.allSettled([
        api.get('/api/leads?limit=500'),
        api.get('/api/decision-maker/stats'),
      ])
      if (lr.status === 'fulfilled') setLeads(lr.value.leads || [])
      if (sr.status === 'fulfilled') setStats(sr.value)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ── Filtered lead list ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filter === 'no-contact'  && l.contact_name) return false
      if (filter === 'has-contact' && !l.contact_name) return false
      if (search) {
        const q = search.toLowerCase()
        return l.company_name.toLowerCase().includes(q) || (l.city || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [leads, filter, search])

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const selectAll  = () => setSelectedIds(new Set(filtered.map(l => l.id)))
  const clearAll   = () => setSelectedIds(new Set())

  // ── Scan via LinkdAPI chain ───────────────────────────────────────────────

  const runScan = async () => {
    const toScan = leads.filter(l => selectedIds.has(l.id))
    if (!toScan.length) return

    setScanning(true)
    setResults(toScan.map(l => ({ leadId: l.id, company: l.company_name, employees: [], done: false })))
    setCollapsed(new Set())

    for (const lead of toScan) {
      try {
        const data = await api.post('/api/decision-maker-finder/find', { leadId: lead.id })

        // Map DMResult → Employee shape used by the UI
        const employees: Employee[] = (data.decisionMakers || []).map((dm: any) => ({
          name:            dm.fullName || `${dm.firstName || ''} ${dm.lastName || ''}`.trim() || null,
          title:           dm.title || null,
          email:           dm.email || null,
          phone:           dm.phone || null,
          linkedinUrl:     dm.linkedinUrl || null,
          source:          dm.source || 'LinkdAPI',
          confidence:      dm.confidence >= 70 ? 'high' : dm.confidence >= 40 ? 'medium' : 'low',
          isDecisionMaker: true,
        }))

        setResults(prev => prev.map(r =>
          r.leadId === lead.id ? { ...r, employees, done: true } : r
        ))
      } catch (e: any) {
        setResults(prev => prev.map(r =>
          r.leadId === lead.id ? { ...r, done: true, error: e.message } : r
        ))
      }
    }

    setScanning(false)
    setSelectedIds(new Set())
    load()
  }

  // ── Save employee to lead ─────────────────────────────────────────────────

  const saveEmployee = async (leadId: string, emp: Employee, key: string) => {
    setSaving(key)
    try {
      const body: any = {}
      if (emp.name)  body.contact_name = emp.name
      if (emp.email) body.email        = emp.email
      if (emp.phone) body.phone        = emp.phone
      await api.patch(`/api/leads/${leadId}`, body)
      setSavedKeys(prev => new Set([...prev, key]))
      showMsg('success', `${emp.name || 'Kişi'} lead'e kaydedildi!`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSaving(null) }
  }

  const copy = (text: string, k: string) => {
    navigator.clipboard.writeText(text)
    setCopied(k)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const doneCount = results.filter(r => r.done).length
  const foundTotal = results.reduce((s, r) => s + r.employees.length, 0)

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <Crosshair size={18} className="text-violet-400" />
          </div>
          Karar Verici Bulucu
        </h1>
        <p className="text-slate-400 mt-1 text-sm flex items-center gap-1.5">
          <Crosshair size={13} className="text-violet-400" />
          LinkdAPI + Claude AI ile karar vericileri otomatik bul ve kaydet
        </p>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
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

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Şirket veya şehir ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {([
            { id: 'all',         label: 'Tümü' },
            { id: 'no-contact',  label: 'Yetkili Yok' },
            { id: 'has-contact', label: 'Yetkili Var' },
          ] as { id: Filter; label: string }[]).map(f => (
            <button key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Select all / clear */}
        {filtered.length > 0 && (
          <button onClick={selectedIds.size === filtered.length ? clearAll : selectAll}
            className="px-3 py-2.5 text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl transition">
            {selectedIds.size === filtered.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
          </button>
        )}

        {/* Scan button */}
        <button onClick={runScan}
          disabled={scanning || selectedIds.size === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
            selectedIds.size > 0 && !scanning
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}>
          <Crosshair size={14} />
          {scanning
            ? `${doneCount}/${results.length} Taranıyor...`
            : selectedIds.size > 0
            ? `${selectedIds.size} Şirketi Tara`
            : 'Lead Seçin'}
        </button>
      </div>

      {/* Lead grid */}
      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            {search ? 'Arama sonucu bulunamadı.' : 'Gösterilecek lead yok.'}
          </div>
        ) : filtered.map(lead => {
          const sel = selectedIds.has(lead.id)
          const res = results.find(r => r.leadId === lead.id)
          return (
            <button key={lead.id} onClick={() => toggle(lead.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition border ${
                sel
                  ? 'bg-blue-600/10 border-blue-500/30'
                  : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
              }`}>
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                sel ? 'bg-blue-600 border-blue-600' : 'border-slate-600'
              }`}>
                {sel && <CheckCircle size={12} className="text-white" />}
              </div>

              {/* Company initial */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                lead.contact_name ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
              }`}>
                {lead.company_name[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${sel ? 'text-white' : 'text-slate-200'}`}>
                  {lead.company_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {lead.city && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={9} /> {lead.city}
                    </span>
                  )}
                  {lead.website && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Globe size={9} /> {lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </span>
                  )}
                  {lead.contact_name && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={9} /> {lead.contact_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {res && !res.done && (
                  <RefreshCw size={13} className="animate-spin text-blue-400" />
                )}
                {res?.done && res.employees.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                    {res.employees.length} kişi
                  </span>
                )}
                {res?.done && res.employees.length === 0 && !res.error && (
                  <span className="text-xs text-slate-500">Bulunamadı</span>
                )}
                <span className="text-xs text-slate-600">Puan: {lead.score}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <p className="text-white font-medium">
              Sonuçlar
              {!scanning && (
                <span className="text-slate-400 font-normal ml-2 text-sm">
                  — {results.length} şirket, {foundTotal} kişi bulundu
                </span>
              )}
            </p>
            {!scanning && results.length > 0 && (
              <button onClick={() => setResults([])}
                className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
                <X size={12} /> Temizle
              </button>
            )}
          </div>

          {results.map(r => {
            const isCollapsed = collapsed.has(r.leadId)
            const dms    = r.employees.filter(e => e.isDecisionMaker && e.name)
            const others = r.employees.filter(e => !e.isDecisionMaker && e.name)

            return (
              <div key={r.leadId} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Company header */}
                <button
                  onClick={() => setCollapsed(prev => {
                    const n = new Set(prev)
                    n.has(r.leadId) ? n.delete(r.leadId) : n.add(r.leadId)
                    return n
                  })}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-700/30 transition"
                >
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Linkedin size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{r.company}</p>
                    {!r.done
                      ? <p className="text-blue-400 text-xs flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> LinkedIn taranıyor...</p>
                      : r.error
                      ? <p className="text-red-400 text-xs">{r.error}</p>
                      : r.employees.length === 0
                      ? <p className="text-slate-500 text-xs">LinkedIn'de çalışan bulunamadı</p>
                      : <p className="text-slate-400 text-xs">
                          {r.employees.length} çalışan
                          {dms.length > 0 && <span className="text-violet-400 ml-1">· {dms.length} karar verici</span>}
                        </p>
                    }
                  </div>
                  {r.employees.length > 0 && (
                    isCollapsed ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />
                  )}
                </button>

                {/* Employees */}
                {!isCollapsed && r.employees.length > 0 && (
                  <div className="border-t border-slate-700 divide-y divide-slate-700/50">

                    {/* Decision makers */}
                    {dms.length > 0 && (
                      <>
                        <div className="px-5 py-2 bg-violet-500/5">
                          <p className="text-xs text-violet-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <Crosshair size={10} /> Karar Vericiler ({dms.length})
                          </p>
                        </div>
                        {dms.map((emp, i) => (
                          <EmployeeRow key={i} emp={emp} leadId={r.leadId} rowKey={`${r.leadId}-dm-${i}`}
                            saving={saving} savedKeys={savedKeys} copied={copied}
                            onSave={saveEmployee} onCopy={copy} />
                        ))}
                      </>
                    )}

                    {/* Other employees */}
                    {others.length > 0 && (
                      <>
                        <div className="px-5 py-2 bg-slate-800/30">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={10} /> Diğer Çalışanlar ({others.length})
                          </p>
                        </div>
                        {others.map((emp, i) => (
                          <EmployeeRow key={i} emp={emp} leadId={r.leadId} rowKey={`${r.leadId}-ot-${i}`}
                            saving={saving} savedKeys={savedKeys} copied={copied}
                            onSave={saveEmployee} onCopy={copy} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Employee row component ─────────────────────────────────────────────────────

function EmployeeRow({ emp, leadId, rowKey, saving, savedKeys, copied, onSave, onCopy }: {
  emp:       Employee
  leadId:    string
  rowKey:    string
  saving:    string | null
  savedKeys: Set<string>
  copied:    string | null
  onSave:    (leadId: string, emp: Employee, key: string) => void
  onCopy:    (text: string, k: string) => void
}) {
  const conf  = (CONF as any)[emp.confidence] || CONF.low
  const saved = savedKeys.has(rowKey)

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-slate-700/20 transition">
      {/* Avatar */}
      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold text-xs flex-shrink-0">
        {emp.name?.[0]?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {emp.name && <p className="text-white text-sm font-medium">{emp.name}</p>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${conf.ring} ${conf.color}`}>
            {conf.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {emp.title && <span className="text-xs text-slate-400">{emp.title}</span>}
          {emp.linkedinUrl && (
            <a href={emp.linkedinUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition">
              <Linkedin size={9} /> Profil <ExternalLink size={8} />
            </a>
          )}
          {emp.email && (
            <button onClick={() => onCopy(emp.email!, `em-${rowKey}`)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition">
              <Mail size={9} /> {emp.email}
              {copied === `em-${rowKey}` ? <CheckCircle size={8} className="text-emerald-400" /> : null}
            </button>
          )}
          {emp.phone && (
            <button onClick={() => onCopy(emp.phone!, `ph-${rowKey}`)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition">
              <Phone size={9} /> {emp.phone}
              {copied === `ph-${rowKey}` ? <CheckCircle size={8} className="text-emerald-400" /> : null}
            </button>
          )}
        </div>
      </div>

      {/* Save button */}
      <button onClick={() => onSave(leadId, emp, rowKey)}
        disabled={saving === rowKey || saved}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
            : 'bg-violet-600/80 hover:bg-violet-600 text-white disabled:opacity-50'
        }`}>
        {saving === rowKey
          ? <RefreshCw size={11} className="animate-spin" />
          : saved
          ? <><CheckCircle size={11} /> Kaydedildi</>
          : <><UserCheck size={11} /> Lead'e Ekle</>}
      </button>
    </div>
  )
}
