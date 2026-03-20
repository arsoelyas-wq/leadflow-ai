'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Box, Upload, Send, RefreshCw, QrCode, Trash2, Eye, Smartphone, BarChart3, Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

export default function ARPage() {
  const [models, setModels] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [expandedAnalytics, setExpandedAnalytics] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Record<string, any>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [tab, setTab] = useState<'upload' | 'models'>('models')

  // Upload form
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('furniture')
  const fileRef = useRef<HTMLInputElement>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [m, l, s] = await Promise.allSettled([
        api.get('/api/ar/models'),
        api.get('/api/leads?limit=100'),
        api.get('/api/ar/stats'),
      ])
      if (m.status === 'fulfilled') setModels(m.value.models || [])
      if (l.status === 'fulfilled') setLeads((l.value.leads || []).filter((l: any) => l.phone))
      if (s.status === 'fulfilled') setStats(s.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const uploadModel = async (file: File) => {
    if (!productName) { showMsg('error', 'Ürün adı zorunlu'); return }
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('model', file)
      formData.append('productName', productName)
      formData.append('description', description)
      formData.append('category', category)

      const response = await fetch('https://leadflow-ai-production.up.railway.app/api/ar/upload-model', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      showMsg('success', data.message)
      setProductName(''); setDescription('')
      setTab('models')
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setUploading(false) }
  }

  const sendAR = async (modelId: string, batch = false) => {
    if (!batch && !selectedLead) { showMsg('error', 'Lead seçin'); return }
    if (batch && !selectedLeads.length) { showMsg('error', 'Lead seçin'); return }
    setSending(modelId)
    try {
      const endpoint = batch ? `/api/ar/send-batch/${modelId}` : `/api/ar/send/${modelId}`
      const body = batch ? { leadIds: selectedLeads } : { leadId: selectedLead }
      const data = await api.post(endpoint, body)
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSending(null) }
  }

  const loadAnalytics = async (modelId: string) => {
    if (expandedAnalytics === modelId) { setExpandedAnalytics(null); return }
    try {
      const data = await api.get(`/api/ar/analytics/${modelId}`)
      setAnalytics(prev => ({ ...prev, [modelId]: data }))
      setExpandedAnalytics(modelId)
    } catch {}
  }

  const deleteModel = async (id: string) => {
    if (!confirm('Modeli silmek istediğinizden emin misiniz?')) return
    try {
      await api.delete(`/api/ar/models/${id}`)
      showMsg('success', 'Model silindi')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const CATEGORIES = [
    { value: 'furniture', label: '🛋️ Mobilya' },
    { value: 'decoration', label: '🏺 Dekorasyon' },
    { value: 'product', label: '📦 Ürün' },
    { value: 'industrial', label: '🏭 Endüstriyel' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Box size={24} className="text-pink-400" /> AR Ürün Deneyimi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">3D modellerinizi müşterinin mekanında gösterin — artırılmış gerçeklik ile satış</p>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Nasıl çalışır */}
      <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-5">
        <div className="grid grid-cols-4 gap-3 text-xs text-center">
          {[
            { icon: '📦', title: '3D Model Yükle', desc: '.glb veya .usdz' },
            { icon: '🔗', title: 'AR Link + QR', desc: 'Otomatik oluşur' },
            { icon: '📱', title: 'WhatsApp Gönder', desc: '1 tıkla ilet' },
            { icon: '🏠', title: 'Ürün Odasında', desc: 'Müşteri AR ile görür' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-white font-medium">{title}</p>
              <p className="text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '3D Model', value: stats.totalModels, color: 'text-pink-400' },
            { label: 'Toplam Görüntüleme', value: stats.totalViews, color: 'text-blue-400' },
            { label: 'Gönderilen', value: stats.totalSent, color: 'text-green-400' },
            { label: 'AR Oturumu', value: stats.totalARSessions, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'models', label: `🎯 Modellerim (${models.length})` },
          { id: 'upload', label: '➕ Model Yükle' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* UPLOAD TAB */}
      {tab === 'upload' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">3D Model Yükle</h2>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Ürün Adı *</label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="örn: Modern Koltuk Takımı"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Kategori</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`py-2 rounded-lg border text-xs transition ${category === c.value ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Açıklama (opsiyonel)</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ürün açıklaması..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500" />
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading || !productName}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-pink-500/40 hover:border-pink-500/70 text-pink-300 rounded-xl transition disabled:opacity-40">
              {uploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? 'Yükleniyor...' : '.glb veya .usdz dosyası seçin'}
            </button>
            <input ref={fileRef} type="file" accept=".glb,.gltf,.usdz" className="hidden"
              onChange={e => e.target.files?.[0] && uploadModel(e.target.files[0])} />
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-medium mb-3">📱 Desteklenen Formatlar</h3>
              <div className="space-y-3 text-sm">
                {[
                  { ext: '.glb', desc: 'Android + Web AR (önerilen)', color: 'text-emerald-400' },
                  { ext: '.usdz', desc: 'iOS/iPhone AR', color: 'text-blue-400' },
                  { ext: '.gltf', desc: 'Web 3D görüntüleme', color: 'text-yellow-400' },
                ].map(({ ext, desc, color }) => (
                  <div key={ext} className="flex items-center gap-3">
                    <span className={`font-mono font-bold ${color}`}>{ext}</span>
                    <span className="text-slate-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-medium mb-3">🆓 Ücretsiz 3D Model Kaynakları</h3>
              <div className="space-y-2">
                {[
                  { name: 'Sketchfab', url: 'sketchfab.com', desc: 'En büyük 3D kütüphane' },
                  { name: 'Google Poly', url: 'poly.pizza', desc: 'Basit 3D modeller' },
                  { name: 'TurboSquid', url: 'turbosquid.com', desc: 'Profesyonel modeller' },
                ].map(({ name, url, desc }) => (
                  <a key={name} href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition">
                    <div>
                      <p className="text-white text-sm">{name}</p>
                      <p className="text-slate-500 text-xs">{desc}</p>
                    </div>
                    <ExternalLink size={14} className="text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODELS TAB */}
      {tab === 'models' && (
        <div className="space-y-4">
          {/* Lead Seçim */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Tek Lead Seç</label>
                <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500">
                  <option value="">Lead seçin</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Toplu Lead ({selectedLeads.length} seçili)</label>
                <div className="max-h-24 overflow-y-auto bg-slate-900 rounded-lg p-2 space-y-1">
                  {leads.slice(0, 20).map(l => (
                    <label key={l.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">
                      <input type="checkbox" checked={selectedLeads.includes(l.id)}
                        onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                        className="accent-pink-500" />
                      <span className="text-white text-xs truncate">{l.company_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center h-32 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div>
          ) : models.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <Box size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-3">Henüz model yok</p>
              <button onClick={() => setTab('upload')} className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm rounded-lg transition">
                İlk Modeli Yükle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {models.map(model => (
                <div key={model.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl flex items-center justify-center shrink-0 border border-pink-500/20">
                      <Box size={22} className="text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{model.product_name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{CATEGORIES.find(c => c.value === model.category)?.label || model.category}</span>
                        <span>👁️ {model.view_count || 0} görüntüleme</span>
                        <span>📱 {model.ar_session_count || 0} AR</span>
                        <span>📤 {model.send_count || 0} gönderim</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a href={model.ar_viewer_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition" title="AR Önizle">
                        <Eye size={14} />
                      </a>
                      <button onClick={() => setShowQR(showQR === model.id ? null : model.id)}
                        className={`p-2 rounded-lg transition ${showQR === model.id ? 'bg-pink-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`} title="QR Kod">
                        <QrCode size={14} />
                      </button>
                      <button onClick={() => loadAnalytics(model.id)}
                        className={`p-2 rounded-lg transition ${expandedAnalytics === model.id ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`} title="Analitik">
                        <BarChart3 size={14} />
                      </button>
                      <button onClick={() => sendAR(model.id, false)} disabled={sending === model.id || !selectedLead}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                        {sending === model.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                        Gönder
                      </button>
                      {selectedLeads.length > 0 && (
                        <button onClick={() => sendAR(model.id, true)} disabled={sending === model.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                          <Users size={12} /> {selectedLeads.length}
                        </button>
                      )}
                      <button onClick={() => deleteModel(model.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* QR Panel */}
                  {showQR === model.id && (
                    <div className="px-5 pb-4 flex items-start gap-6 border-t border-slate-700 pt-4">
                      <div className="bg-white rounded-xl p-2">
                        <img src={model.qr_url} alt="QR" className="w-32 h-32" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <p className="text-white text-sm font-medium">AR Linki & QR Kod</p>
                        <p className="text-slate-400 text-xs">Müşteri QR'ı okutunca AR deneyimi açılır</p>
                        <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg">
                          <p className="text-slate-300 text-xs truncate flex-1">{model.ar_viewer_url}</p>
                          <button onClick={() => navigator.clipboard.writeText(model.ar_viewer_url)}
                            className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded shrink-0">Kopyala</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analytics Panel */}
                  {expandedAnalytics === model.id && analytics[model.id] && (
                    <div className="px-5 pb-4 border-t border-slate-700 pt-4">
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { label: 'Görüntüleme', value: analytics[model.id].views, color: 'text-blue-400' },
                          { label: 'AR Oturumu', value: analytics[model.id].arSessions, color: 'text-pink-400' },
                          { label: 'Ort. Süre', value: `${analytics[model.id].avgDuration}s`, color: 'text-yellow-400' },
                          { label: 'Mobil', value: analytics[model.id].mobileViews, color: 'text-green-400' },
                          { label: 'AR Dönüşüm', value: `%${analytics[model.id].conversionRate}`, color: 'text-purple-400' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                            <p className={`text-lg font-bold ${color}`}>{value}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}