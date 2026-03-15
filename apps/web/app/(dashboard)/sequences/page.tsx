'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Play, Pause, Trash2, Users, RefreshCw, Zap, MessageSquare, Clock, ChevronDown, ChevronUp, Bot } from 'lucide-react'

const STEP_TEMPLATES = [
  {
    label: 'İlk Mesaj',
    type: 'message',
    delay_hours: 0,
    channel: 'whatsapp',
    message: 'Merhaba [FIRMA_ADI], [SEKTOR] alanında işletmenize özel çözümler sunuyoruz. Görüşmek ister misiniz?',
    condition: 'any',
  },
  {
    label: '1 Gün Sonra Takip',
    type: 'message',
    delay_hours: 24,
    channel: 'whatsapp',
    message: 'Merhaba [AD], dünkü mesajımı gördünüz mü? Kısa bir görüşme için uygun bir zaman var mı?',
    condition: 'not_replied',
  },
  {
    label: 'AI Takip Mesajı',
    type: 'ai_reply',
    delay_hours: 48,
    channel: 'whatsapp',
    ai_prompt: 'Müşteriye 2 gün önce mesaj attık, henüz cevap vermedi. Nazik ama ikna edici bir takip mesajı yaz. Max 2 cümle.',
    condition: 'not_replied',
  },
  {
    label: '3 Gün Sonra Son Deneme',
    type: 'message',
    delay_hours: 72,
    channel: 'whatsapp',
    message: 'Son olarak ulaşmak istedim [AD]. İlgileniyorsanız bir mesaj yeterli! 🙏',
    condition: 'not_replied',
  },
]

export default function SequencesPage() {
  const [sequences, setSequences] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSeq, setSelectedSeq] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Yeni sequence form
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [steps, setSteps] = useState<any[]>([...STEP_TEMPLATES.slice(0, 2)])
  const [saving, setSaving] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [seqData, statsData, leadsData] = await Promise.all([
        api.get('/api/sequences'),
        api.get('/api/sequences/stats/overview'),
        api.get('/api/leads?limit=50'),
      ])
      setSequences(seqData.sequences || [])
      setStats(statsData)
      setLeads(leadsData.leads || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadEnrollments = async (seqId: string) => {
    const data = await api.get(`/api/sequences/${seqId}/enrollments`)
    setEnrollments(data.enrollments || [])
  }

  const createSequence = async () => {
    if (!name || steps.length === 0) return
    setSaving(true)
    try {
      await api.post('/api/sequences', { name, channel, steps })
      showMsg('success', 'Sequence oluşturuldu!')
      setShowCreate(false)
      setName('')
      setSteps([...STEP_TEMPLATES.slice(0, 2)])
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteSequence = async (id: string) => {
    if (!confirm('Sequence silinsin mi?')) return
    await api.delete(`/api/sequences/${id}`)
    setSequences(prev => prev.filter(s => s.id !== id))
    showMsg('success', 'Silindi')
  }

  const pauseSequence = async (id: string) => {
    await api.post(`/api/sequences/${id}/pause`, {})
    load()
    showMsg('success', 'Duraklatıldı')
  }

  const enrollLeads = async (seqId: string) => {
    if (!selectedLeads.length) return
    try {
      const data = await api.post(`/api/sequences/${seqId}/enroll`, { leadIds: selectedLeads })
      showMsg('success', data.message)
      setSelectedLeads([])
      loadEnrollments(seqId)
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  const updateStep = (idx: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const addStep = (template: any) => {
    setSteps(prev => [...prev, { ...template }])
  }

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx))
  }

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300',
    paused: 'bg-yellow-500/20 text-yellow-300',
    completed: 'bg-blue-500/20 text-blue-300',
    stopped: 'bg-red-500/20 text-red-300',
  }
  const statusLabel: Record<string, string> = {
    active: 'Aktif', paused: 'Duraklatıldı', completed: 'Tamamlandı', stopped: 'Durduruldu'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot size={24} className="text-blue-400" />
            AI Satış Sekansları
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Otomatik çok adımlı satış süreci — lead'e ilk mesajdan kapanışa kadar</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Yeni Sekans
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Toplam Enrollment', value: stats.total, color: 'text-slate-300' },
            { label: 'Aktif', value: stats.active, color: 'text-emerald-400' },
            { label: 'Tamamlanan', value: stats.completed, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Sekans Formu */}
      {showCreate && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold">Yeni Sekans Oluştur</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Sekans Adı *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="örn: 5 Günlük WhatsApp Takip"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Kanal</label>
              <select value={channel} onChange={e => setChannel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {/* Adımlar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 text-xs">Adımlar ({steps.length})</label>
              <div className="flex gap-2">
                {STEP_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => addStep(t)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition">
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{idx + 1}</span>
                    <select value={step.type} onChange={e => updateStep(idx, 'type', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none">
                      <option value="message">Sabit Mesaj</option>
                      <option value="ai_reply">AI Mesaj</option>
                    </select>
                    <select value={step.condition} onChange={e => updateStep(idx, 'condition', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none">
                      <option value="any">Her zaman</option>
                      <option value="not_replied">Cevap vermemişse</option>
                      <option value="replied">Cevap vermişse</option>
                    </select>
                  </div>
                  <button onClick={() => removeStep(idx)} className="text-slate-600 hover:text-red-400 transition">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={13} className="text-slate-500 shrink-0" />
                  <input type="number" value={step.delay_hours} onChange={e => updateStep(idx, 'delay_hours', Number(e.target.value))}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                    min="0" />
                  <span className="text-slate-500 text-xs">saat sonra gönder</span>
                </div>

                {step.type === 'message' ? (
                  <textarea value={step.message} onChange={e => updateStep(idx, 'message', e.target.value)}
                    rows={2} placeholder="Mesaj şablonu... [FIRMA_ADI], [AD], [SEHIR] kullanabilirsin"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 resize-none" />
                ) : (
                  <textarea value={step.ai_prompt} onChange={e => updateStep(idx, 'ai_prompt', e.target.value)}
                    rows={2} placeholder="AI prompt... (ne tür mesaj üretsin?)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 resize-none" />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={createSequence} disabled={saving || !name || !steps.length}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition flex items-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Kaydediliyor...' : 'Oluştur'}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Sekans Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sequences.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Bot size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Henüz sekans yok — "Yeni Sekans" ile başlayın</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map(seq => (
            <div key={seq.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Zap size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{seq.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-slate-400 text-xs">{seq.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}</span>
                      <span className="text-slate-400 text-xs">{seq.steps?.length || 0} adım</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[seq.status] || statusColor.active}`}>
                        {statusLabel[seq.status] || seq.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    setSelectedSeq(selectedSeq?.id === seq.id ? null : seq)
                    if (selectedSeq?.id !== seq.id) loadEnrollments(seq.id)
                  }}
                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition text-xs flex items-center gap-1">
                    <Users size={13} /> Lead Ekle
                  </button>
                  <button onClick={() => pauseSequence(seq.id)}
                    className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg transition">
                    <Pause size={13} />
                  </button>
                  <button onClick={() => deleteSequence(seq.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Adım gösterimi */}
              <div className="px-5 pb-4 flex items-center gap-2 overflow-x-auto">
                {(seq.steps || []).map((step: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && <div className="w-6 h-px bg-slate-600" />}
                    <div className={`px-2 py-1 rounded-lg text-xs border ${
                      step.type === 'ai_reply' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-slate-700 border-slate-600 text-slate-300'
                    }`}>
                      {step.type === 'ai_reply' ? '🤖 AI' : '💬'} {step.delay_hours}s
                    </div>
                  </div>
                ))}
              </div>

              {/* Lead Ekleme Paneli */}
              {selectedSeq?.id === seq.id && (
                <div className="border-t border-slate-700 p-5 space-y-4">
                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Lead Seç */}
                    <div>
                      <p className="text-white text-sm font-medium mb-3">Lead Seç ({selectedLeads.length} seçili)</p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-900 rounded-lg p-2">
                        {leads.filter(l => l.phone || l.email).map(lead => (
                          <label key={lead.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                            <input type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                              className="accent-blue-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs truncate">{lead.company_name}</p>
                              <p className="text-slate-500 text-xs">{lead.phone || lead.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <button onClick={() => enrollLeads(seq.id)} disabled={!selectedLeads.length}
                        className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition flex items-center justify-center gap-2">
                        <Play size={13} /> {selectedLeads.length} Lead'i Başlat
                      </button>
                    </div>

                    {/* Enrollment Durumu */}
                    <div>
                      <p className="text-white text-sm font-medium mb-3">Aktif Leadler ({enrollments.length})</p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {enrollments.length === 0 ? (
                          <p className="text-slate-500 text-xs text-center py-4">Henüz lead eklenmedi</p>
                        ) : enrollments.map(enr => (
                          <div key={enr.id} className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg">
                            <div>
                              <p className="text-white text-xs">{enr.leads?.company_name}</p>
                              <p className="text-slate-500 text-xs">Adım {enr.current_step + 1}/{seq.steps?.length}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[enr.status] || statusColor.active}`}>
                              {statusLabel[enr.status] || enr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
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