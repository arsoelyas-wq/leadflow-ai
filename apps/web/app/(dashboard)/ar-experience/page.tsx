'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Box, Upload, Send, RefreshCw, QrCode, Trash2, Eye, Smartphone } from 'lucide-react'

export default function ARPage() {
  const [models, setModels] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<any>(null)
  const [selectedLead, setSelectedLead] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showQR, setShowQR] = useState<string | null>(null)

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
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setUploading(false) }
  }

  const sendAR = async (modelId: string) => {
    if (!selectedLead) { showMsg('error', 'Lead seçin'); return }
    setSending(modelId)
    try {
      const data = await api.post(`/api/ar/send/${modelId}`, { leadId: selectedLead })
      showMsg('success', data.message)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSending(null) }
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
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Smartphone size={16} className="text-pink-400" /> Nasıl Çalışır?
        </h2>
        <div className="grid grid-cols-4 gap-3 text-xs text-center">
          {[
            { icon: '📦', title: '3D Model Yükle', desc: '.glb veya .usdz dosyası' },
            { icon: '🔗', title: 'AR Link Oluşur', desc: 'Otomatik QR kod + link' },
            { icon: '📱', title: 'WhatsApp\'tan Gönder', desc: 'Müşteriye link ilet' },
            { icon: '🏠', title: 'Müşteri Görür', desc: 'Ürün kendi odasında' },
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
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-pink-400">{stats.totalModels}</p>
            <p className="text-slate-400 text-xs mt-1">3D Model</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.totalSent}</p>
            <p className="text-slate-400 text-xs mt-1">AR Deneyimi Gönderildi</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Model Yükle */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Upload size={16} className="text-pink-400" /> 3D Model Yükle
          </h2>
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
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 text-pink-300 rounded-xl transition disabled:opacity-40">
            {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Yükleniyor...' : '.glb veya .usdz dosyası seçin'}
          </button>
          <input ref={fileRef} type="file" accept=".glb,.gltf,.usdz" className="hidden"
            onChange={e => e.target.files?.[0] && uploadModel(e.target.files[0])} />

          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-slate-400 space-y-1">
            <p>→ <strong className="text-white">.glb</strong> — Android + Web AR için (önerilen)</p>
            <p>→ <strong className="text-white">.usdz</strong> — iOS/iPhone AR için</p>
            <p>→ <strong className="text-white">Her ikisi</strong> — Tüm cihazlar için</p>
            <p>→ Ücretsiz 3D model: <a href="https://sketchfab.com" target="_blank" rel="noopener noreferrer" className="text-blue-400">sketchfab.com</a></p>
          </div>
        </div>

        {/* Gönder */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Send size={16} className="text-purple-400" /> AR Deneyimi Gönder
          </h2>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Lead Seç</label>
            <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              <option value="">Lead seçin</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>)}
            </select>
          </div>
          <p className="text-slate-400 text-xs">Model seçip gönder butonuna basın:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {models.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Henüz model yok</p>
            ) : models.map(model => (
              <div key={model.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <Box size={18} className="text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{model.product_name}</p>
                  <p className="text-slate-500 text-xs">{model.category} · {Math.round((model.file_size || 0) / 1024 / 1024 * 10) / 10}MB</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a href={model.ar_viewer_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition" title="Önizle">
                    <Eye size={13} />
                  </a>
                  <button onClick={() => setShowQR(showQR === model.id ? null : model.id)}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition" title="QR Kod">
                    <QrCode size={13} />
                  </button>
                  <button onClick={() => sendAR(model.id)} disabled={sending === model.id || !selectedLead}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                    {sending === model.id ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    Gönder
                  </button>
                  <button onClick={() => deleteModel(model.id)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                    <Trash2 size={13} />
                  </button>
                </div>
                {showQR === model.id && (
                  <div className="absolute bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-20 mt-32">
                    <img src={model.qr_url} alt="QR" className="w-40 h-40" />
                    <p className="text-slate-400 text-xs text-center mt-2">Telefonla okutun</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}