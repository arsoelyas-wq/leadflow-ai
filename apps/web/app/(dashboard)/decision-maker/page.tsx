'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useMemo } from 'react'

const DM: Record<string, Record<string, string>> = {
  tr: {
    title:'Karar Verici Bulucu', subtitle:'LinkdAPI + Claude AI ile karar vericileri otomatik bul ve kaydet',
    total_lead:'Toplam Lead', with_contact:'Yetkili Bulunan', with_email:'Email Bulunan', coverage:'Kapsama Oranı',
    search:'Şirket veya şehir ara...', all:'Hepsi', no_contact:'Yetkili Yok', has_contact:'Yetkili Var',
    select_all:'Tümünü Seç', deselect_all:'Seçimi Kaldır', select_lead:'Lead Seçin', score:'Puan',
  },
  de: {
    title:'Entscheidungsträger-Finder', subtitle:'Entscheidungsträger automatisch finden und speichern mit LinkdAPI + Claude AI',
    total_lead:'Leads gesamt', with_contact:'Entscheider gefunden', with_email:'E-Mail gefunden', coverage:'Abdeckungsrate',
    search:'Unternehmen oder Stadt suchen...', all:'Alle', no_contact:'Kein Entscheider', has_contact:'Entscheider vorhanden',
    select_all:'Alle auswählen', deselect_all:'Auswahl aufheben', select_lead:'Lead auswählen', score:'Punkte',
  },
  ru: {
    title:'Поиск ЛПР', subtitle:'Автоматически находите и сохраняйте ЛПР с LinkdAPI + Claude AI',
    total_lead:'Всего лидов', with_contact:'ЛПР найдено', with_email:'Email найден', coverage:'Охват',
    search:'Поиск по компании или городу...', all:'Все', no_contact:'Нет ЛПР', has_contact:'Есть ЛПР',
    select_all:'Выбрать всё', deselect_all:'Снять выбор', select_lead:'Выбрать лид', score:'Балл',
  },
  en: {
    title:'Decision Maker Finder', subtitle:'Automatically find and save decision makers with LinkdAPI + Claude AI',
    total_lead:'Total Leads', with_contact:'Decision Maker Found', with_email:'Email Found', coverage:'Coverage Rate',
    search:'Search company or city...', all:'All', no_contact:'No Decision Maker', has_contact:'Has Decision Maker',
    select_all:'Select All', deselect_all:'Deselect All', select_lead:'Select Lead', score:'Score',
  },
  fr: {
    title:'Finder de Décideurs', subtitle:'Trouver et sauvegarder automatiquement des décideurs avec LinkdAPI + Claude AI',
    total_lead:'Leads totaux', with_contact:'Décideur trouvé', with_email:'E-mail trouvé', coverage:'Taux de couverture',
    search:'Rechercher par entreprise ou ville...', all:'Tous', no_contact:'Pas de décideur', has_contact:'Décideur présent',
    select_all:'Tout sélectionner', deselect_all:'Désélectionner', select_lead:'Sélectionner lead', score:'Score',
  },
  ar: {
    title:'الباحث عن صانعي القرار', subtitle:'إيجاد وحفظ صانعي القرار تلقائياً مع LinkdAPI + Claude AI',
    total_lead:'إجمالي العملاء', with_contact:'صانع القرار موجود', with_email:'Email موجود', coverage:'نسبة التغطية',
    search:'البحث بالشركة أو المدينة...', all:'الكل', no_contact:'لا يوجد صانع قرار', has_contact:'يوجد صانع قرار',
    select_all:'اختيار الكل', deselect_all:'إلغاء التحديد', select_lead:'اختر عميلاً', score:'النقاط',
  },
}
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
  const { lang } = useI18n()
  const L = DM[lang] || DM.tr
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

  const crd = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
  const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8'

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#f5f3ff 65%,#ffffff)', borderRadius: 20, padding: '28px', marginBottom: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.03) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', flexShrink: 0 }}>
              <Crosshair size={28} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1 style={{ color: tx1, fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>{L.title}</h1>
              <p style={{ color: tx2, fontSize: 13, margin: 0, maxWidth: 420 }}>Lead'leriniz için karar vericileri otomatik bulun — isim, ünvan, email ve telefon bilgilerini keşfedin</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={async () => {
              try {
                const data = await api.post('/api/decision-maker-finder/auto-enrich', { limit: 20 })
                showMsg('success', data.message || `${data.total} lead zenginleştiriliyor...`)
                if (data.jobId) {
                  const poll = setInterval(async () => {
                    try {
                      const j = await api.get(`/api/decision-maker-finder/job/${data.jobId}`)
                      if (j.status === 'done') { clearInterval(poll); showMsg('success', `${j.results?.filter((r:any)=>r.found).length || 0} karar verici bulundu!`); load() }
                    } catch { clearInterval(poll) }
                  }, 5000)
                }
              } catch (e: any) { showMsg('error', e.message) }
            }} disabled={scanning}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
              <Crosshair size={14} /> Otomatik Zenginleştir
            </button>
            <button onClick={() => load()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: tx2, fontSize: 12, cursor: 'pointer' }}>
              <RefreshCw size={12} /> Yenile
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20 }}>
            {[
              { label: L.total_lead, value: stats.totalLeads, color: '#2563eb', Icon: Users },
              { label: L.with_contact, value: stats.withContact, color: '#059669', Icon: UserCheck },
              { label: L.with_email, value: stats.withEmail, color: '#7c3aed', Icon: Mail },
              { label: L.coverage, value: `%${stats.coverageRate}`, color: '#b45309', Icon: BarChart3 },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} style={{ ...crd, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <p style={{ color: tx1, fontSize: 20, fontWeight: 800, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
                <p style={{ color: tx3, fontSize: 10, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TOAST ──────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* ── CONTROLS ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: tx3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.search}
            style={{ width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 32px 9px 34px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: tx3, cursor: 'pointer' }}><X size={13} /></button>}
        </div>

        <div style={{ display: 'flex', gap: 2, background: '#f8fafc', padding: 3, borderRadius: 10, border: '1px solid #f1f5f9' }}>
          {([{ id: 'all', label: L.all }, { id: 'no-contact', label: L.no_contact }, { id: 'has-contact', label: L.has_contact }] as { id: Filter; label: string }[]).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === f.id ? '#ffffff' : 'transparent', color: filter === f.id ? tx1 : tx3, boxShadow: filter === f.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <button onClick={selectedIds.size === filtered.length ? clearAll : selectAll}
            style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: tx2, fontSize: 12, cursor: 'pointer' }}>
            {selectedIds.size === filtered.length ? L.deselect_all : L.select_all}
          </button>
        )}

        <button onClick={runScan} disabled={scanning || selectedIds.size === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: selectedIds.size > 0 && !scanning ? 'pointer' : 'not-allowed', background: selectedIds.size > 0 ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : '#f1f5f9', color: selectedIds.size > 0 ? '#fff' : tx3, fontSize: 13, fontWeight: 600, boxShadow: selectedIds.size > 0 ? '0 4px 14px rgba(37,99,235,0.25)' : 'none' }}>
          <Crosshair size={13} />
          {scanning ? `${doneCount}/${results.length} Taranıyor...` : selectedIds.size > 0 ? `${selectedIds.size} Şirketi Tara` : L.select_lead}
        </button>
      </div>

      {/* ── LEAD GRID ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 450, overflowY: 'auto' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Crosshair size={28} style={{ color: tx3, margin: '0 auto 8px' }} />
            <p style={{ color: tx3, fontSize: 13 }}>{search ? 'Arama sonucu bulunamadı.' : 'Gösterilecek lead yok.'}</p>
          </div>
        ) : filtered.map(lead => {
          const sel = selectedIds.has(lead.id)
          const res = results.find(r => r.leadId === lead.id)
          return (
            <div key={lead.id} onClick={() => toggle(lead.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 11, border: `1px solid ${sel ? '#93c5fd' : '#f1f5f9'}`, background: sel ? '#eff6ff' : '#ffffff', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${sel ? '#2563eb' : '#d1d5db'}`, background: sel ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sel && <CheckCircle size={12} style={{ color: '#fff' }} />}
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: lead.contact_name ? '#ecfdf5' : '#f8fafc', border: `1px solid ${lead.contact_name ? '#a7f3d0' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: lead.contact_name ? '#059669' : tx2, flexShrink: 0 }}>
                {lead.company_name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: tx1, fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  {lead.city && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: tx3, fontSize: 11 }}><MapPin size={9} /> {lead.city}</span>}
                  {lead.website && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: tx3, fontSize: 11 }}><Globe size={9} /> {lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>}
                  {lead.contact_name && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#059669', fontSize: 11, fontWeight: 600 }}><CheckCircle size={9} /> {lead.contact_name}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {res && !res.done && <RefreshCw size={13} style={{ color: '#2563eb', animation: 'dmSpin 1s linear infinite' }} />}
                {res?.done && res.employees.length > 0 && <span style={{ fontSize: 11, padding: '2px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, fontWeight: 600 }}>{res.employees.length} kişi</span>}
                {res?.done && res.employees.length === 0 && !res.error && <span style={{ fontSize: 11, color: tx3 }}>Bulunamadı</span>}
                <span style={{ fontSize: 11, color: tx3 }}>{L.score}: {lead.score}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0 }}>
              Sonuçlar {!scanning && <span style={{ color: tx3, fontWeight: 400, fontSize: 12 }}>— {results.length} şirket, {foundTotal} kişi</span>}
            </p>
            {!scanning && <button onClick={() => setResults([])} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: tx3, fontSize: 11, cursor: 'pointer' }}><X size={11} /> Temizle</button>}
          </div>

          {results.map(r => {
            const isCollapsed = collapsed.has(r.leadId)
            const dms = r.employees.filter(e => e.isDecisionMaker && e.name)
            const others = r.employees.filter(e => !e.isDecisionMaker && e.name)
            return (
              <div key={r.leadId} style={{ ...crd, overflow: 'hidden' }}>
                <div onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(r.leadId) ? n.delete(r.leadId) : n.add(r.leadId); return n })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Linkedin size={14} style={{ color: '#2563eb' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: 0 }}>{r.company}</p>
                    {!r.done ? <p style={{ color: '#2563eb', fontSize: 11, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={10} style={{ animation: 'dmSpin 1s linear infinite' }} /> Taranıyor...</p>
                      : r.error ? <p style={{ color: '#dc2626', fontSize: 11, margin: '2px 0 0' }}>{r.error}</p>
                      : r.employees.length === 0 ? <p style={{ color: tx3, fontSize: 11, margin: '2px 0 0' }}>Bulunamadı</p>
                      : <p style={{ color: tx2, fontSize: 11, margin: '2px 0 0' }}>{r.employees.length} kişi {dms.length > 0 && <span style={{ color: '#7c3aed' }}>· {dms.length} karar verici</span>}</p>}
                  </div>
                  {r.employees.length > 0 && (isCollapsed ? <ChevronDown size={14} style={{ color: tx3 }} /> : <ChevronUp size={14} style={{ color: tx3 }} />)}
                </div>

                {!isCollapsed && r.employees.length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f5f9' }}>
                    {dms.length > 0 && (
                      <>
                        <div style={{ padding: '6px 18px', background: '#faf5ff' }}>
                          <p style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}><Crosshair size={10} /> Karar Vericiler ({dms.length})</p>
                        </div>
                        {dms.map((emp, i) => <EmployeeRow key={i} emp={emp} leadId={r.leadId} rowKey={`${r.leadId}-dm-${i}`} saving={saving} savedKeys={savedKeys} copied={copied} onSave={saveEmployee} onCopy={copy} />)}
                      </>
                    )}
                    {others.length > 0 && (
                      <>
                        <div style={{ padding: '6px 18px', background: '#f8fafc' }}>
                          <p style={{ color: tx3, fontSize: 10, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}><Users size={10} /> Diğer ({others.length})</p>
                        </div>
                        {others.map((emp, i) => <EmployeeRow key={i} emp={emp} leadId={r.leadId} rowKey={`${r.leadId}-ot-${i}`} saving={saving} savedKeys={savedKeys} copied={copied} onSave={saveEmployee} onCopy={copy} />)}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes dmSpin { to { transform: rotate(360deg) } }`}</style>
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

  const confStyle: Record<string, { bg: string; color: string; border: string; label: string }> = {
    high:   { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Yüksek' },
    medium: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Orta' },
    low:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Düşük' },
  }
  const cs = confStyle[emp.confidence] || confStyle.low

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
        {emp.name?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {emp.name && <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, margin: 0 }}>{emp.name}</p>}
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`, fontWeight: 700 }}>{cs.label}</span>
          {emp.source && <span style={{ fontSize: 9, color: '#94a3b8' }}>{emp.source}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          {emp.title && <span style={{ fontSize: 11, color: '#64748b' }}>{emp.title}</span>}
          {emp.linkedinUrl && <a href={emp.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#2563eb', textDecoration: 'none' }}><Linkedin size={9} /> Profil</a>}
          {emp.email && <button onClick={() => onCopy(emp.email!, `em-${rowKey}`)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Mail size={9} /> {emp.email} {copied === `em-${rowKey}` && <CheckCircle size={8} style={{ color: '#059669' }} />}</button>}
          {emp.phone && <button onClick={() => onCopy(emp.phone!, `ph-${rowKey}`)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Phone size={9} /> {emp.phone} {copied === `ph-${rowKey}` && <CheckCircle size={8} style={{ color: '#059669' }} />}</button>}
        </div>
      </div>
      <button onClick={() => onSave(leadId, emp, rowKey)} disabled={saving === rowKey || saved}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: saved ? '1px solid #a7f3d0' : 'none', background: saved ? '#ecfdf5' : 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: saved ? '#059669' : '#fff', fontSize: 11, fontWeight: 600, cursor: saved ? 'default' : 'pointer', flexShrink: 0 }}>
        {saving === rowKey ? <RefreshCw size={10} style={{ animation: 'dmSpin 1s linear infinite' }} />
          : saved ? <><CheckCircle size={10} /> Kaydedildi</>
          : <><UserCheck size={10} /> Kaydet</>}
      </button>
    </div>
  )
}
