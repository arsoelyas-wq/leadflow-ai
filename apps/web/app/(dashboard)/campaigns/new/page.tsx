'use client'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  ArrowLeft, Users, ChevronRight, Check, Search, X,
  MessageCircle, Mail, Phone, Layers, Zap, Calendar,
  Clock, AlertTriangle, Star, MapPin, Send, Eye,
  Sparkles, FileText, CheckCircle2, Globe,
} from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  company_name: string
  city?: string
  phone?: string
  email?: string
  website?: string
  score?: number
  status: string
}

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp',    Icon: MessageCircle, desc: 'Kişisel ve samimi, yüksek açılma oranı',   color: 'emerald', maxChars: 4096 },
  { id: 'email',    label: 'Email',       Icon: Mail,          desc: 'Profesyonel, katalog ve detaylı teklif',    color: 'blue',    maxChars: 0     },
  { id: 'sms',      label: 'SMS',         Icon: Phone,         desc: 'Hızlı ve doğrudan, yüksek okunma oranı',   color: 'purple',  maxChars: 160   },
  { id: 'multi',    label: 'Çoklu Kanal', Icon: Layers,        desc: 'WhatsApp + Email kombinasyonu',             color: 'amber',   maxChars: 4096  },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    text: 'text-blue-400',    iconBg: 'bg-blue-500/15'    },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/40',  text: 'text-purple-400',  iconBg: 'bg-purple-500/15'  },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/40',  text: 'text-amber-400',   iconBg: 'bg-amber-500/15'   },
}

const TEMPLATES: Record<string, Array<{ id: string; label: string; text: string }>> = {
  whatsapp: [
    { id: 't1', label: 'Tanışma', text: 'Merhaba {{firma}}, Google\'da sizi gördüm. {{sehir}}\'de faaliyet gösterdiğinizi fark ettim.\n\nBiz dekorasyon ürünleri üretiyoruz, toptancılara özel fiyatlarımız var. Kataloğumuzu paylaşabilir miyim?' },
    { id: 't2', label: 'Takip', text: 'Merhaba {{firma}}, geçen hafta mesaj atmıştım. Merak ettiğiniz bir şey var mı? Size özel kampanyamız hakkında bilgi vermek isterim.' },
    { id: 't3', label: 'Kampanya', text: '{{firma}} için özel fiyat!\n\nBu ay toptancılara %15 indirim uyguluyoruz. Stoklar sınırlı. Detaylar için hemen yazın!' },
  ],
  email: [
    { id: 'e1', label: 'Tanışma', text: 'Merhaba,\n\n{{firma}} firmasını araştırırken sizi keşfettim ve iş birliği potansiyeli gördüm.\n\nBiz {{sektor}} sektöründe faaliyet gösteren bir üretici firmayız. Toptancılara özel fiyat listesi ve katalog paylaşmak istiyoruz.\n\nBir görüşme ayarlayabilir miyiz?\n\nSaygılarımla' },
    { id: 'e2', label: 'Teklif', text: 'Sayın {{firma}} Yetkilileri,\n\nÖnceki görüşmemiz sonrasında size özel fiyat teklifimizi hazırladık.\n\nEk\'te ürün kataloğumuzu ve fiyat listemizi bulabilirsiniz.\n\nSaygılarımla' },
  ],
  sms: [
    { id: 's1', label: 'Tanışma', text: 'Merhaba {{firma}}! {{sehir}} bölgesinde toptancılara özel teklifimiz var. Detaylar için bize ulaşın.' },
    { id: 's2', label: 'Kampanya', text: '{{firma}} için özel fiyat! Bu ay %15 indirim. Sınırlı stok. Detay: 0850 XXX XX XX' },
  ],
  multi: [
    { id: 'm1', label: 'Çoklu Tanışma', text: 'Merhaba {{firma}}, Google\'da sizi gördüm.\n\nBiz {{sehir}} bölgesinde toptancılara hizmet veriyoruz. Kataloğumuzu görmek ister misiniz?' },
  ],
}

const STATUS_LABELS: Record<string, string> = {
  all: 'Tümü', new: 'Yeni', contacted: 'İletişim Kuruldu', qualified: 'Nitelikli', proposal: 'Teklif',
}

const VARIABLES = [
  { key: '{{firma}}',  label: 'Firma adı' },
  { key: '{{sehir}}',  label: 'Şehir'     },
  { key: '{{sektor}}', label: 'Sektör'    },
  { key: '{{isim}}',   label: 'Kişi adı'  },
]

export default function NewCampaignPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [leadsTotal, setLeadsTotal] = useState(0)

  useEffect(() => { if (step === 3) loadLeads() }, [step])

  const loadLeads = async () => {
    setLoadingLeads(true)
    try {
      const data = await api.get('/api/leads?limit=500&offset=0')
      setLeads(data.leads || [])
      if (data.total != null) setLeadsTotal(data.total)
    } catch { setLeads([]) }
    finally { setLoadingLeads(false) }
  }

  const toggleLead = (id: string) =>
    setSelectedLeads(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const filteredLeads = leads.filter(l => {
    const ms = !leadSearch || l.company_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.city || '').toLowerCase().includes(leadSearch.toLowerCase())
    const mst = leadStatusFilter === 'all' || l.status === leadStatusFilter
    const hasContact = channel === 'email' ? !!l.email : channel === 'sms' || channel === 'whatsapp' ? !!l.phone : true
    return ms && mst && hasContact
  })

  const incompatibleCount = leads.filter(l => {
    if (channel === 'email') return !l.email
    if (channel === 'sms' || channel === 'whatsapp') return !l.phone
    return false
  }).length

  const selectAll = () =>
    setSelectedLeads(filteredLeads.every(l => selectedLeads.includes(l.id)) && filteredLeads.length > 0
      ? selectedLeads.filter(id => !filteredLeads.some(l => l.id === id))
      : [...new Set([...selectedLeads, ...filteredLeads.map(l => l.id)])])

  const canNext = () => {
    if (step === 1) return name.trim().length > 0 && channel.length > 0 && (!isScheduled || scheduleAt.length > 0)
    if (step === 2) return customMessage.trim().length > 0
    if (step === 3) return selectedLeads.length > 0
    return false
  }

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      await api.post('/api/campaigns', {
        name, channel, messageTemplate: customMessage, leadIds: selectedLeads,
        ...(isScheduled && scheduleAt ? { scheduledAt: new Date(scheduleAt).toISOString() } : {}),
      })
      router.push('/campaigns')
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const previewMessage = customMessage
    .replace(/\{\{firma\}\}/g, 'Örnek Firma A.Ş.')
    .replace(/\{\{sehir\}\}/g, 'İstanbul')
    .replace(/\{\{sektor\}\}/g, 'Dekorasyon')
    .replace(/\{\{isim\}\}/g, 'Ahmet Bey')

  const channelCfg = CHANNELS.find(c => c.id === channel)
  const charLimit = channelCfg?.maxChars || 0
  const isOverLimit = charLimit > 0 && customMessage.length > charLimit
  const estimatedMinutes = Math.ceil(selectedLeads.length * 3 / 60) // ~3s per message

  const steps = [
    { label: 'Temel Bilgiler', Icon: FileText  },
    { label: 'Mesaj Şablonu',  Icon: Sparkles  },
    { label: 'Lead Seçimi',    Icon: Users     },
    { label: 'Özet',           Icon: Eye       },
  ]

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition group">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Yeni Kampanya</h1>
          <p className="text-slate-500 text-sm mt-0.5">Adım {step} / {steps.length}</p>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="flex gap-1">
        {steps.map((s, i) => {
          const StepIcon = s.Icon
          const done = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-700/60 text-slate-500'
              }`}>
                {done ? <Check size={14} /> : <StepIcon size={14} />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'}`}>{s.label}</span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-700/60'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step Content ── */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">

        {/* ═══ STEP 1: Temel Bilgiler ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-white font-semibold text-lg">Kampanya Bilgileri</h2>

            {/* Name */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">Kampanya Adı <span className="text-red-400">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="örn: Mayıs Dekorasyon Kampanyası"
                className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>

            {/* Channel */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-3">Kanal <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map(c => {
                  const CIcon = c.Icon
                  const clr = COLOR_MAP[c.color]
                  const sel = channel === c.id
                  return (
                    <button key={c.id} onClick={() => setChannel(c.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        sel ? `${clr.border} ${clr.bg}` : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
                      }`}>
                      <div className={`w-10 h-10 rounded-xl ${clr.iconBg} flex items-center justify-center mb-3`}>
                        <CIcon size={20} className={clr.text} />
                      </div>
                      <p className="text-white font-semibold text-sm">{c.label}</p>
                      <p className="text-slate-400 text-xs mt-1">{c.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-3">Gönderim Zamanı</label>
              <div className="flex gap-3">
                <button onClick={() => setIsScheduled(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition ${
                    !isScheduled ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  <Zap size={15} /> Hemen Gönder
                </button>
                <button onClick={() => setIsScheduled(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition ${
                    isScheduled ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  <Calendar size={15} /> Zamanla
                </button>
              </div>
              {isScheduled && (
                <div className="mt-3">
                  <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition" />
                  {scheduleAt && (
                    <p className="text-purple-400 text-xs mt-2 flex items-center gap-1.5">
                      <Calendar size={11} /> {new Date(scheduleAt).toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Mesaj Şablonu ═══ */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-white font-semibold text-lg">Mesaj Şablonu</h2>

            {/* Variables */}
            <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-900/40 rounded-xl border border-slate-700/50">
              <span className="text-slate-500 text-xs">Değişkenler:</span>
              {VARIABLES.map(v => (
                <button key={v.key} onClick={() => setCustomMessage(m => m + ' ' + v.key)}
                  className="bg-slate-700/60 hover:bg-slate-600 text-blue-300 text-xs px-2.5 py-1 rounded-lg font-mono transition" title={v.label}>
                  {v.key}
                </button>
              ))}
            </div>

            {/* Templates */}
            <div>
              <p className="text-slate-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Hazır Şablonlar</p>
              <div className="grid gap-2">
                {(TEMPLATES[channel] || TEMPLATES.whatsapp).map(tmpl => (
                  <button key={tmpl.id} onClick={() => setCustomMessage(tmpl.text)}
                    className={`p-3.5 rounded-xl border text-left transition group ${
                      customMessage === tmpl.text ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700/50 hover:border-slate-500 bg-slate-800/30'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={12} className={customMessage === tmpl.text ? 'text-blue-400' : 'text-slate-500'} />
                      <p className="text-white text-sm font-medium">{tmpl.label}</p>
                      {customMessage === tmpl.text && <CheckCircle2 size={13} className="text-blue-400 ml-auto" />}
                    </div>
                    <p className="text-slate-400 text-xs truncate">{tmpl.text.substring(0, 90)}...</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Message editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Mesaj İçeriği</p>
                {charLimit > 0 && (
                  <span className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}>
                    {customMessage.length} / {charLimit}
                  </span>
                )}
              </div>
              <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                rows={7} placeholder="Mesajınızı yazın veya yukarıdan şablon seçin..."
                className={`w-full bg-slate-900/60 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition resize-none ${
                  isOverLimit ? 'border-red-500 focus:border-red-400' : 'border-slate-600 focus:border-blue-500'
                }`} />
              {isOverLimit && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> {channelCfg?.label} karakter limiti aşıldı ({customMessage.length - charLimit} fazla)
                </p>
              )}
            </div>

            {/* Live preview */}
            {customMessage && (
              <div>
                <p className="text-slate-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Önizleme</p>
                {channel === 'whatsapp' || channel === 'multi' ? (
                  <div className="bg-[#0b141a] rounded-xl p-4 border border-slate-700/30">
                    <div className="max-w-[85%] ml-auto">
                      <div className="bg-[#005c4b] rounded-xl rounded-tr-sm px-3.5 py-2.5 shadow">
                        <p className="text-[#e9edef] text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                        <p className="text-[#ffffff80] text-[10px] text-right mt-1">14:30 ✓✓</p>
                      </div>
                    </div>
                  </div>
                ) : channel === 'email' ? (
                  <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <div className="border-b border-slate-200 pb-3 mb-3">
                      <p className="text-slate-500 text-xs">Kime: info@ornekfirma.com</p>
                      <p className="text-slate-800 text-sm font-medium mt-1">{name || 'Kampanya'}</p>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3: Lead Seçimi ═══ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Lead Seçimi</h2>
              <button onClick={selectAll} className="text-blue-400 text-sm hover:text-blue-300 transition font-medium">
                {filteredLeads.every(l => selectedLeads.includes(l.id)) && filteredLeads.length > 0
                  ? 'Seçimi Kaldır' : `Tümünü Seç (${filteredLeads.length})`}
              </button>
            </div>

            {/* Compatibility warning */}
            {incompatibleCount > 0 && (
              <div className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <p className="text-amber-400/80 text-xs">
                  {incompatibleCount} lead {channel === 'email' ? 'email adresi' : 'telefon numarası'} olmadığı için gizlendi
                </p>
              </div>
            )}

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Firma veya şehir ara..."
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
                {leadSearch && (
                  <button onClick={() => setLeadSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>
              <select value={leadStatusFilter} onChange={e => setLeadStatusFilter(e.target.value)}
                className="bg-slate-900/60 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Lead list */}
            {loadingLeads ? (
              <div className="text-center py-8 text-slate-500">Leadler yükleniyor...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">{leads.length === 0 ? 'Lead bulunamadı.' : 'Kriterlere uyan lead yok.'}</p>
                {leads.length === 0 && (
                  <Link href="/leads/scrape" className="text-blue-400 text-sm hover:underline mt-2 inline-block">Lead topla →</Link>
                )}
              </div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {filteredLeads.map(lead => {
                  const sel = selectedLeads.includes(lead.id)
                  return (
                    <div key={lead.id} onClick={() => toggleLead(lead.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        sel ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-700/40 hover:border-slate-600 bg-slate-800/20'
                      }`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                        sel ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                      }`}>
                        {sel && <Check size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{lead.company_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.city && <span className="flex items-center gap-0.5 text-slate-500 text-[10px]"><MapPin size={8} /> {lead.city}</span>}
                          {lead.score && <span className="text-[10px] text-slate-600">Skor: {lead.score}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {lead.phone && <span className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center"><Phone size={10} className="text-emerald-400" /></span>}
                        {lead.email && <span className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center"><Mail size={10} className="text-blue-400" /></span>}
                        {lead.website && <span className="w-5 h-5 rounded bg-slate-700/40 flex items-center justify-center"><Globe size={10} className="text-slate-400" /></span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Selection summary */}
            {selectedLeads.length > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Users size={15} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-blue-300 text-sm font-medium">{selectedLeads.length} lead seçildi</p>
                  <p className="text-blue-400/50 text-xs">{filteredLeads.length} uyumlu / {leads.length} toplam</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                  <Clock size={11} /> ~{estimatedMinutes < 1 ? '1' : estimatedMinutes} dk
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Özet ═══ */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-white font-semibold text-lg">Kampanya Özeti</h2>

            <div className="space-y-0">
              {[
                { label: 'Kampanya Adı',   value: name,                                           Icon: FileText },
                { label: 'Kanal',           value: channelCfg?.label || channel,                   Icon: channelCfg?.Icon || Send },
                { label: 'Alıcı Sayısı',   value: `${selectedLeads.length} lead`,                 Icon: Users },
                { label: 'Mesaj Uzunluğu',  value: `${customMessage.length} karakter`,             Icon: MessageCircle },
                { label: 'Tahmini Süre',    value: `~${estimatedMinutes < 1 ? '1' : estimatedMinutes} dakika`, Icon: Clock },
                { label: 'Gönderim',        value: isScheduled && scheduleAt ? new Date(scheduleAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Hemen', Icon: isScheduled ? Calendar : Zap },
              ].map(item => {
                const ItemIcon = item.Icon
                return (
                  <div key={item.label} className="flex items-center justify-between py-3.5 border-b border-slate-700/30">
                    <span className="flex items-center gap-2 text-slate-400 text-sm"><ItemIcon size={14} /> {item.label}</span>
                    <span className="text-white font-medium text-sm">{item.value}</span>
                  </div>
                )
              })}
            </div>

            {/* Message preview */}
            <div>
              <p className="text-slate-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Mesaj Önizlemesi</p>
              {channel === 'whatsapp' || channel === 'multi' ? (
                <div className="bg-[#0b141a] rounded-xl p-4 border border-slate-700/30">
                  <div className="max-w-[85%] ml-auto">
                    <div className="bg-[#005c4b] rounded-xl rounded-tr-sm px-3.5 py-2.5 shadow">
                      <p className="text-[#e9edef] text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                      <p className="text-[#ffffff80] text-[10px] text-right mt-1">14:30 ✓✓</p>
                    </div>
                  </div>
                </div>
              ) : channel === 'email' ? (
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <div className="border-b border-slate-200 pb-3 mb-3">
                    <p className="text-slate-500 text-xs">Kime: info@ornekfirma.com</p>
                    <p className="text-slate-800 text-sm font-medium mt-1">{name}</p>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                </div>
              ) : (
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex justify-between">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-sm transition">
          <ArrowLeft size={14} /> Geri
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition shadow-lg shadow-blue-600/20">
            Devam <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-600/20">
            {saving ? <><span className="animate-spin">⟳</span> Oluşturuluyor...</> : <><CheckCircle2 size={16} /> Kampanya Oluştur</>}
          </button>
        )}
      </div>
    </div>
  )
}
