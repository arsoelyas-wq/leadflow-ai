'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { ArrowLeft, Users, ChevronRight, Check, Search, X } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  company_name: string
  city?: string
  phone?: string
  email?: string
  status: string
}

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', desc: 'Kişisel ve samimi, yüksek açılma oranı', color: 'emerald' },
  { id: 'email', label: 'Email', icon: '📧', desc: 'Profesyonel, katalog ve detaylı teklif', color: 'blue' },
  { id: 'sms', label: 'SMS', icon: '📱', desc: 'Hızlı ve doğrudan, yüksek okunma oranı', color: 'purple' },
  { id: 'multi', label: 'Çoklu Kanal', icon: '🔀', desc: 'WhatsApp + Email kombinasyonu', color: 'amber' },
]

const TEMPLATES: Record<string, Array<{ id: string; label: string; text: string }>> = {
  whatsapp: [
    { id: 't1', label: 'Tanışma', text: 'Merhaba {{firma}}, Google\'da sizi gördüm. {{sehir}}\'de faaliyet gösterdiğinizi fark ettim.\n\nBiz dekorasyon ürünleri üretiyoruz, toptancılara özel fiyatlarımız var. Kataloğumuzu paylaşabilir miyim? 🙏' },
    { id: 't2', label: 'Takip', text: 'Merhaba {{firma}}, geçen hafta mesaj atmıştım. Merak ettiğiniz bir şey var mı? Size özel kampanyamız hakkında bilgi vermek isterim.' },
    { id: 't3', label: 'Kampanya', text: '🎯 {{firma}} için özel fiyat!\n\nBu ay toptancılara %15 indirim uyguluyoruz. Stoklar sınırlı. Detaylar için hemen yazın!' },
  ],
  email: [
    { id: 'e1', label: 'Tanışma Emaili', text: 'Merhaba,\n\n{{firma}} firmasını araştırırken sizi keşfettim ve iş birliği potansiyeli gördüm.\n\nBiz {{sektor}} sektöründe faaliyet gösteren bir üretici firmayız. Toptancılara özel fiyat listesi ve katalog paylaşmak istiyoruz.\n\nBir görüşme ayarlayabilir miyiz?\n\nSaygılarımla' },
    { id: 'e2', label: 'Teklif Emaili', text: 'Sayın {{firma}} Yetkilileri,\n\nÖnceki görüşmemiz sonrasında size özel fiyat teklifimizi hazırladık.\n\nEk\'te ürün kataloğumuzu ve fiyat listemizi bulabilirsiniz.\n\nSaygılarımla' },
  ],
  sms: [
    { id: 's1', label: 'Tanışma', text: 'Merhaba {{firma}}! {{sehir}} bölgesinde toptancılara özel teklifimiz var. Detaylar için bize ulaşın.' },
    { id: 's2', label: 'Kampanya', text: '{{firma}} için özel fiyat! Bu ay %15 indirim. Sınırlı stok. Detay için hemen yazın.' },
  ],
  multi: [
    { id: 'm1', label: 'Çoklu Tanışma', text: 'Merhaba {{firma}}, Google\'da sizi gördüm.\n\nBiz {{sehir}} bölgesinde toptancılara hizmet veriyoruz. Kataloğumuzu görmek ister misiniz? 🙏' },
  ],
}

const STATUS_LABELS: Record<string, string> = {
  all: 'Tümü',
  new: 'Yeni',
  contacted: 'İletişim Kuruldu',
  qualified: 'Nitelikli',
  demo: 'Demo',
  proposal: 'Teklif',
}

export default function NewCampaignPage() {
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

  useEffect(() => {
    if (step === 3) loadLeads()
  }, [step])

  const loadLeads = async () => {
    setLoadingLeads(true)
    try {
      const all: Lead[] = []
      let offset = 0
      const pageSize = 200
      while (true) {
        const data = await api.get(`/api/leads?limit=${pageSize}&offset=${offset}`)
        const batch: Lead[] = data.leads || []
        all.push(...batch)
        if (data.total != null) setLeadsTotal(data.total)
        if (batch.length < pageSize) break
        offset += pageSize
      }
      setLeads(all)
    } catch {
      setLeads([])
    } finally {
      setLoadingLeads(false)
    }
  }

  const selectTemplate = (text: string) => setCustomMessage(text)

  const toggleLead = (id: string) =>
    setSelectedLeads(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const filteredLeads = leads.filter(l => {
    const ms = !leadSearch || l.company_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.city || '').toLowerCase().includes(leadSearch.toLowerCase())
    const mst = leadStatusFilter === 'all' || l.status === leadStatusFilter
    return ms && mst
  })

  const selectAll = () =>
    setSelectedLeads(filteredLeads.length === selectedLeads.filter(id => filteredLeads.some(l => l.id === id)).length
      ? selectedLeads.filter(id => !filteredLeads.some(l => l.id === id))
      : [...new Set([...selectedLeads, ...filteredLeads.map(l => l.id)])])

  const canNext = () => {
    if (step === 1) return name.trim().length > 0 && channel.length > 0 && (!isScheduled || scheduleAt.length > 0)
    if (step === 2) return customMessage.trim().length > 0
    if (step === 3) return selectedLeads.length > 0
    return false
  }

  const handleCreate = async () => {
    setSaving(true)
    setError('')
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

  const steps = ['Temel Bilgiler', 'Mesaj Şablonu', 'Lead Seçimi', 'Özet']

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Yeni Kampanya</h1>
          <p className="text-slate-400 text-sm mt-0.5">Adım {step} / {steps.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${i + 1 < step ? 'bg-emerald-500 text-white' : i + 1 === step ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {i + 1 < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i + 1 === step ? 'text-white' : 'text-slate-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i + 1 < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-white font-semibold text-lg">Kampanya Bilgileri</h2>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">Kampanya Adı *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="örn: Mayıs Dekorasyon Kampanyası"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-3">Kanal *</label>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map(c => (
                  <button key={c.id} onClick={() => setChannel(c.id)}
                    className={`p-4 rounded-xl border-2 text-left transition ${channel === c.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                    <div className="text-2xl mb-2">{c.icon}</div>
                    <p className="text-white font-medium text-sm">{c.label}</p>
                    <p className="text-slate-400 text-xs mt-1">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Zamanlama */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-3">Gönderim Zamanı</label>
              <div className="flex gap-3">
                <button onClick={() => setIsScheduled(false)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition ${!isScheduled ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  ⚡ Hemen Gönder
                </button>
                <button onClick={() => setIsScheduled(true)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition ${isScheduled ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  🗓 Zamanla
                </button>
              </div>
              {isScheduled && (
                <div className="mt-3">
                  <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition" />
                  {scheduleAt && (
                    <p className="text-purple-400 text-xs mt-1.5">
                      {new Date(scheduleAt).toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'short' })} tarihinde gönderilecek
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-white font-semibold text-lg">Mesaj Şablonu</h2>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700 text-xs text-slate-400">
              <span>Kişiselleştirme değişkenleri:</span>
              {['{{firma}}', '{{sehir}}', '{{sektor}}', '{{isim}}'].map(v => (
                <button key={v} onClick={() => setCustomMessage(m => m + v)}
                  className="bg-slate-700 hover:bg-slate-600 text-blue-300 px-2 py-0.5 rounded font-mono transition">
                  {v}
                </button>
              ))}
            </div>

            <div>
              <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Hazır Şablonlar</p>
              <div className="grid gap-2">
                {(TEMPLATES[channel as keyof typeof TEMPLATES] || TEMPLATES.whatsapp).map(t => (
                  <button key={t.id} onClick={() => selectTemplate(t.text)}
                    className={`p-3 rounded-xl border text-left transition ${customMessage === t.text ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                    <p className="text-white text-sm font-medium">{t.label}</p>
                    <p className="text-slate-400 text-xs mt-1 truncate">{t.text.substring(0, 80)}...</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Mesaj İçeriği</p>
              <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                rows={7} placeholder="Mesajınızı yazın veya yukarıdan şablon seçin..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
              <p className="text-slate-500 text-xs mt-1">{customMessage.length} karakter</p>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Lead Seç</h2>
              <button onClick={selectAll} className="text-blue-400 text-sm hover:text-blue-300 transition">
                {filteredLeads.every(l => selectedLeads.includes(l.id)) && filteredLeads.length > 0
                  ? 'Seçimi Kaldır' : `Tümünü Seç (${filteredLeads.length})`}
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Firma veya şehir ara..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
                {leadSearch && (
                  <button onClick={() => setLeadSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>
              <select value={leadStatusFilter} onChange={e => setLeadStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {loadingLeads ? (
              <div className="text-center py-8 text-slate-500">Leadler yükleniyor...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">{leads.length === 0 ? 'Lead bulunamadı.' : 'Arama kriterinize uyan lead yok.'}</p>
                {leads.length === 0 && (
                  <Link href="/leads/scrape" className="text-blue-400 text-sm hover:underline mt-2 inline-block">Lead topla →</Link>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {filteredLeads.map(lead => (
                  <div key={lead.id} onClick={() => toggleLead(lead.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedLeads.includes(lead.id) ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${selectedLeads.includes(lead.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                      {selectedLeads.includes(lead.id) && <Check size={11} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{lead.company_name}</p>
                      <p className="text-slate-400 text-xs">{lead.city || '—'}</p>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-500">
                      {lead.phone && <span className="text-emerald-400">📱</span>}
                      {lead.email && <span className="text-blue-400">✉️</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              {selectedLeads.length > 0 ? (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-blue-300 text-sm flex-1">
                  <Users size={14} className="inline mr-1.5" />
                  {selectedLeads.length} lead seçildi · {filteredLeads.length} filtrede / {leads.length} yüklendi
                  {leadsTotal > leads.length && <span className="text-slate-400"> / {leadsTotal} toplam</span>}
                </div>
              ) : (
                <div className="text-slate-500 text-xs">
                  {leads.length} lead yüklendi{leadsTotal > leads.length ? ` (toplam ${leadsTotal})` : ' (tümü)'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-white font-semibold text-lg">Kampanya Özeti</h2>
            <div className="space-y-3">
              {[
                { label: 'Kampanya Adı', value: name },
                { label: 'Kanal', value: CHANNELS.find(c => c.id === channel)?.label },
                { label: 'Lead Sayısı', value: `${selectedLeads.length} lead` },
                { label: 'Mesaj Uzunluğu', value: `${customMessage.length} karakter` },
                { label: 'Gönderim', value: isScheduled && scheduleAt ? new Date(scheduleAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Hemen' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-slate-700/50">
                  <span className="text-slate-400 text-sm">{item.label}</span>
                  <span className="text-white font-medium text-sm">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Mesaj Önizlemesi (örnek lead ile)</p>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl transition">
          ← Geri
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition">
            Devam <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-medium transition">
            {saving ? 'Oluşturuluyor...' : '✓ Kampanya Oluştur'}
          </button>
        )}
      </div>
    </div>
  )
}
