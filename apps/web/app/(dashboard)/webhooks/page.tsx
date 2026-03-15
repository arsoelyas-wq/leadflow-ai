'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw, Webhook, CheckCircle, XCircle, Play, ToggleLeft, ToggleRight, ChevronDown, Copy } from 'lucide-react'

const EVENT_OPTIONS = [
  { value: 'new_lead', label: '🆕 Yeni Lead', desc: 'Scraping ile yeni lead geldiğinde' },
  { value: 'lead_replied', label: '💬 Lead Cevap Verdi', desc: 'WhatsApp/email cevabı geldiğinde' },
  { value: 'lead_status_changed', label: '🔄 Lead Durumu Değişti', desc: 'Status güncellendiğinde' },
  { value: 'campaign_completed', label: '✅ Kampanya Tamamlandı', desc: 'Tüm mesajlar gönderildiğinde' },
  { value: 'sequence_completed', label: '🤖 Sekans Tamamlandı', desc: 'Lead sekansı bitirdiğinde' },
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedWh, setSelectedWh] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  // Form
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['new_lead', 'lead_replied'])
  const [saving, setSaving] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/webhooks')
      setWebhooks(data.webhooks || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createWebhook = async () => {
    if (!name || !url || !events.length) return
    setSaving(true)
    try {
      const data = await api.post('/api/webhooks', { name, url, events })
      setNewSecret(data.secret)
      showMsg('success', 'Webhook oluşturuldu! Secret key\'i kaydedin.')
      setShowCreate(false)
      setName('')
      setUrl('')
      setEvents(['new_lead', 'lead_replied'])
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSaving(false) }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Webhook silinsin mi?')) return
    await api.delete(`/api/webhooks/${id}`)
    setWebhooks(prev => prev.filter(w => w.id !== id))
    showMsg('success', 'Silindi')
  }

  const toggleWebhook = async (id: string) => {
    const data = await api.patch(`/api/webhooks/${id}/toggle`, {})
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: data.active } : w))
  }

  const testWebhook = async (id: string) => {
    setTesting(id)
    try {
      const data = await api.post(`/api/webhooks/${id}/test`, {})
      showMsg(data.success ? 'success' : 'error', data.message)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setTesting(null) }
  }

  const loadLogs = async (id: string) => {
    if (selectedWh === id) { setSelectedWh(null); return }
    setSelectedWh(id)
    const data = await api.get(`/api/webhooks/${id}/logs`)
    setLogs(data.logs || [])
  }

  const toggleEvent = (event: string) => {
    setEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Webhook size={24} className="text-orange-400" />
            Webhook Sistemi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">LeadFlow olaylarını dış sistemlere (CRM, Zapier, Make) ilet</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Yeni Webhook
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Secret Key Uyarısı */}
      {newSecret && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
          <p className="text-yellow-300 text-sm font-medium mb-2">⚠️ Secret Key — Sadece bir kez gösterilir!</p>
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3">
            <code className="text-emerald-300 text-sm flex-1 break-all">{newSecret}</code>
            <button onClick={() => { navigator.clipboard.writeText(newSecret); showMsg('success', 'Kopyalandı!') }}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 shrink-0">
              <Copy size={14} />
            </button>
          </div>
          <button onClick={() => setNewSecret(null)} className="mt-2 text-slate-500 text-xs hover:text-white">Kapat</button>
        </div>
      )}

      {/* Yeni Webhook Formu */}
      {showCreate && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold">Yeni Webhook</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Webhook Adı *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="örn: Zapier CRM Entegrasyonu"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Endpoint URL *</label>
              <input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-2 block">Tetikleyici Olaylar *</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  events.includes(opt.value)
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                }`}>
                  <input type="checkbox" checked={events.includes(opt.value)} onChange={() => toggleEvent(opt.value)} className="accent-orange-500 mt-0.5" />
                  <div>
                    <p className="text-white text-xs font-medium">{opt.label}</p>
                    <p className="text-slate-500 text-xs">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
            <p className="text-slate-400 text-xs">🔒 Her webhook için benzersiz secret key otomatik oluşturulur. İmza doğrulaması için kullanın: <code className="text-orange-300">X-LeadFlow-Signature</code> header</p>
          </div>

          <div className="flex gap-3">
            <button onClick={createWebhook} disabled={saving || !name || !url || !events.length}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition flex items-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">İptal</button>
          </div>
        </div>
      )}

      {/* Webhook Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Webhook size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-2">Henüz webhook yok</p>
          <p className="text-slate-500 text-sm">Zapier, Make veya özel CRM'inize bağlanın</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${wh.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div>
                    <p className="text-white font-medium">{wh.name}</p>
                    <p className="text-slate-500 text-xs truncate max-w-xs">{wh.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap max-w-xs">
                    {wh.events?.map((e: string) => (
                      <span key={e} className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                        {EVENT_OPTIONS.find(o => o.value === e)?.label?.split(' ')[0] || e}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => toggleWebhook(wh.id)}
                    className={`p-2 rounded-lg border transition ${wh.active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-500'}`}>
                    {wh.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                  </button>
                  <button onClick={() => testWebhook(wh.id)} disabled={testing === wh.id}
                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition" title="Test Gönder">
                    {testing === wh.id ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  </button>
                  <button onClick={() => loadLogs(wh.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg transition" title="Loglar">
                    <ChevronDown size={13} className={selectedWh === wh.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  <button onClick={() => deleteWebhook(wh.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Loglar */}
              {selectedWh === wh.id && (
                <div className="border-t border-slate-700 p-4">
                  <p className="text-white text-sm font-medium mb-3">Son Loglar</p>
                  {logs.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4">Henüz log yok</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg">
                          <div className="flex items-center gap-2">
                            {log.status === 'success'
                              ? <CheckCircle size={13} className="text-emerald-400" />
                              : <XCircle size={13} className="text-red-400" />}
                            <span className="text-slate-300 text-xs">{log.event}</span>
                            {log.error && <span className="text-red-400 text-xs">— {log.error}</span>}
                          </div>
                          <span className="text-slate-500 text-xs">
                            {new Date(log.created_at).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Entegrasyon Rehberi */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Popüler Entegrasyonlar</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Zapier', desc: '5000+ app ile bağlan', url: 'zapier.com', color: 'text-orange-400' },
            { name: 'Make (Integromat)', desc: 'Gelişmiş otomasyon', url: 'make.com', color: 'text-purple-400' },
            { name: 'n8n', desc: 'Self-hosted otomasyon', url: 'n8n.io', color: 'text-green-400' },
          ].map(({ name, desc, url, color }) => (
            <div key={name} className="p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
              <p className={`font-medium text-sm ${color}`}>{name}</p>
              <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              <p className="text-slate-600 text-xs mt-1">{url}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}