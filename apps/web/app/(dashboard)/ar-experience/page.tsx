'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Upload, Send, RefreshCw, QrCode, Trash2, Eye, BarChart3,
  Users, Sparkles, Zap, Globe, ChevronRight,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

// ── 3D CSS Cube ───────────────────────────────────────────────────────────────
function Cube3D({ size = 64 }: { size?: number }) {
  const h = size / 2
  return (
    <div style={{ perspective: `${size * 5}px`, width: size, height: size }}>
      <div className="cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }}>
        {[
          { transform: `translateZ(${h}px)`,                  bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.4)' },
          { transform: `translateZ(-${h}px) rotateY(180deg)`, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)' },
          { transform: `translateX(-${h}px) rotateY(-90deg)`, bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
          { transform: `translateX(${h}px) rotateY(90deg)`,   bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.4)' },
          { transform: `translateY(-${h}px) rotateX(90deg)`,  bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
          { transform: `translateY(${h}px) rotateX(-90deg)`,  bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)'  },
        ].map((f, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: f.transform, background: f.bg, border: `1px solid ${f.border}` }} />
        ))}
      </div>
    </div>
  )
}

function FloatCube({ size = 20, delay = '0s', color = '#ec4899' }: { size?: number; delay?: string; color?: string }) {
  const h = size / 2
  return (
    <div className="float-cube" style={{ animationDelay: delay, width: size, height: size }}>
      <div className="cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', perspective: `${size * 8}px` }}>
        {[
          `translateZ(${h}px)`, `translateZ(-${h}px) rotateY(180deg)`,
          `translateX(-${h}px) rotateY(-90deg)`, `translateX(${h}px) rotateY(90deg)`,
          `translateY(-${h}px) rotateX(90deg)`, `translateY(${h}px) rotateX(-90deg)`,
        ].map((t, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: t, background: `${color}18`, border: `1px solid ${color}55` }} />
        ))}
      </div>
    </div>
  )
}

// ── Holographic Model Card ────────────────────────────────────────────────────
function ModelCard({ model, CATEGORIES, selectedLead, selectedLeads, sending, onSend, onDelete, onQR, showQR, onAnalytics, expandedAnalytics, analyticsData }: any) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 4
    const y = (-(e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4
    setTilt({ x, y })
  }

  return (
    <div ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }) }}
      onMouseMove={handleMouseMove}
      style={{ transition: hovered ? 'transform 0.05s ease' : 'transform 0.3s ease', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 18, zIndex: 0, background: hovered ? 'linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6,#14b8a6,#ec4899)' : 'linear-gradient(135deg,#ec489933,#8b5cf633)', backgroundSize: '300% 300%', animation: hovered ? 'holoBorder 2s linear infinite' : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg,rgba(15,15,30,0.95),rgba(10,10,20,0.98))', borderRadius: 17, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.15))', border: '1px solid rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 0 24px rgba(236,72,153,0.3)' : 'none', transition: 'box-shadow 0.3s' }}>
            {hovered ? <Cube3D size={36} /> : <span style={{ fontSize: 24 }}>📦</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{model.product_name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(236,72,153,0.2)' }}>
                {CATEGORIES.find((c: any) => c.value === model.category)?.label || model.category}
              </span>
              <span style={{ color: '#64748b', fontSize: 12 }}>👁️ {model.view_count || 0}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>📱 {model.ar_session_count || 0} AR</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>📤 {model.send_count || 0}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={model.ar_viewer_url} target="_blank" rel="noopener noreferrer" style={btnStyle('#334155')} title="AR Önizle"><Eye size={13} /></a>
            <button onClick={() => onQR(model.id)} style={btnStyle(showQR === model.id ? '#9333ea' : '#334155')} title="QR Kod"><QrCode size={13} /></button>
            <button onClick={() => onAnalytics(model.id)} style={btnStyle(expandedAnalytics === model.id ? '#2563eb' : '#334155')} title="Analitik"><BarChart3 size={13} /></button>
            <button onClick={() => onSend(model.id, false)} disabled={sending === model.id || !selectedLead}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: (sending === model.id || !selectedLead) ? 0.4 : 1 }}>
              {sending === model.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />} Gönder
            </button>
            {selectedLeads.length > 0 && (
              <button onClick={() => onSend(model.id, true)} disabled={sending === model.id}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: sending === model.id ? 0.4 : 1 }}>
                <Users size={12} /> {selectedLeads.length}
              </button>
            )}
            <button onClick={() => onDelete(model.id)} style={{ ...btnStyle('#7f1d1d'), color: '#fca5a5' }}><Trash2 size={13} /></button>
          </div>
        </div>
        {showQR === model.id && (
          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', gap: 20, background: 'rgba(139,92,246,0.05)' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}><img src={model.qr_url} alt="QR" style={{ width: 120, height: 120, display: 'block' }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 6px' }}>AR Linki & QR Kod</p>
              <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 10px' }}>Müşteri QR&apos;ı okutunca AR deneyimi açılır</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: '#94a3b8', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{model.ar_viewer_url}</p>
                <button onClick={() => navigator.clipboard.writeText(model.ar_viewer_url)} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', flexShrink: 0 }}>Kopyala</button>
              </div>
            </div>
          </div>
        )}
        {expandedAnalytics === model.id && analyticsData && (
          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.05)' }}>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 12px' }}>Analitik Özet</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[
                { label: 'Görüntüleme', value: analyticsData.views, color: '#3b82f6' },
                { label: 'AR Oturumu', value: analyticsData.arSessions, color: '#ec4899' },
                { label: 'Ort. Süre', value: `${analyticsData.avgDuration}s`, color: '#f59e0b' },
                { label: 'Mobil', value: analyticsData.mobileViews, color: '#10b981' },
                { label: 'AR Dönüşüm', value: `%${analyticsData.conversionRate}`, color: '#8b5cf6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: `1px solid ${color}33` }}>
                  <p style={{ color, fontSize: 18, fontWeight: 700, margin: 0 }}>{value}</p>
                  <p style={{ color: '#475569', fontSize: 10, marginTop: 3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: bg, color: '#94a3b8' }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ARPage() {
  const { t } = useI18n()
  // ── Core state
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
  const [isDragging, setIsDragging] = useState(false)
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('furniture')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── AI generation state
  const [uploadMode, setUploadMode] = useState<'file' | 'ai'>('file')
  const [aiPhotos, setAiPhotos] = useState<(File | null)[]>(Array(6).fill(null))
  const [aiPreviews, setAiPreviews] = useState<(string | null)[]>(Array(6).fill(null))
  const [aiScreen, setAiScreen] = useState<'upload' | 'generating' | 'preview'>('upload')
  const [aiTaskId, setAiTaskId] = useState<string | null>(null)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiTripoStatus, setAiTripoStatus] = useState<string>('queued')
  const [aiModelUrl, setAiModelUrl] = useState<string | null>(null)
  const [aiSaving, setAiSaving] = useState(false)
  const [mvLoaded, setMvLoaded] = useState(false)
  const [dotCount, setDotCount] = useState(0)
  const slotRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [m, l, s] = await Promise.allSettled([
        api.get('/api/ar/models'),
        api.get('/api/leads/with-phone'),
        api.get('/api/ar/stats'),
      ])
      if (m.status === 'fulfilled') setModels(m.value.models || [])
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
      if (s.status === 'fulfilled') setStats(s.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Animate dots while generating
  useEffect(() => {
    if (aiScreen !== 'generating') return
    const t = setInterval(() => setDotCount(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [aiScreen])

  // Poll Tripo3D task status every 3s
  useEffect(() => {
    if (!aiTaskId || aiScreen !== 'generating') return
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/api/ar/generate-3d/status/${aiTaskId}`)
        setAiProgress(data.progress || 0)
        setAiTripoStatus(data.status)
        if (data.status === 'success' && data.modelUrl) {
          setAiModelUrl(data.modelUrl)
          setAiScreen('preview')
          clearInterval(interval)
          if (!document.querySelector('script[src*="model-viewer"]')) {
            const s = document.createElement('script')
            s.type = 'module'
            s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
            s.onload = () => setMvLoaded(true)
            document.head.appendChild(s)
          } else {
            setMvLoaded(true)
          }
        } else if (data.status === 'failed') {
          showMsg('error', 'AI modeli oluşturulamadı. Fotoğrafları kontrol edip tekrar deneyin.')
          setAiScreen('upload')
          clearInterval(interval)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [aiTaskId, aiScreen])

  const uploadModel = async (file: File) => {
    if (!productName) { showMsg('error', 'Ürün adı zorunlu'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'gltf') { showMsg('error', '.gltf desteklenmiyor — .glb formatına dönüştürün.'); return }
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('model', file)
      formData.append('productName', productName)
      formData.append('description', description)
      formData.append('category', category)
      const response = await fetch(`${API_URL}/api/ar/upload-model`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
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
      const data = await api.post(batch ? `/api/ar/send-batch/${modelId}` : `/api/ar/send/${modelId}`, batch ? { leadIds: selectedLeads } : { leadId: selectedLead })
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
    try { await api.delete(`/api/ar/models/${id}`); showMsg('success', 'Model silindi'); load() }
    catch (e: any) { showMsg('error', e.message) }
  }

  // ── AI helpers
  const addAiPhoto = (index: number, file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      showMsg('error', 'Desteklenmeyen format. JPG, PNG veya WebP kullanın.'); return
    }
    const reader = new FileReader()
    reader.onload = e => setAiPreviews(prev => { const n = [...prev]; n[index] = e.target?.result as string; return n })
    reader.readAsDataURL(file)
    setAiPhotos(prev => { const n = [...prev]; n[index] = file; return n })
  }

  const removeAiPhoto = (index: number) => {
    setAiPhotos(prev => { const n = [...prev]; n[index] = null; return n })
    setAiPreviews(prev => { const n = [...prev]; n[index] = null; return n })
  }

  const startGeneration = async () => {
    const files = aiPhotos.filter(Boolean) as File[]
    if (!files.length) { showMsg('error', 'En az 1 fotoğraf ekleyin'); return }
    if (!productName) { showMsg('error', 'Ürün adı zorunlu'); return }
    setAiScreen('generating')
    setAiProgress(0)
    setAiTripoStatus('queued')
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      files.forEach((f, i) => formData.append(`image_${i}`, f))
      formData.append('productName', productName)
      formData.append('category', category)
      formData.append('description', description)
      const res = await fetch(`${API_URL}/api/ar/generate-3d`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiTaskId(data.taskId)
    } catch (e: any) {
      showMsg('error', e.message)
      setAiScreen('upload')
    }
  }

  const saveGenerated = async () => {
    if (!aiModelUrl) return
    setAiSaving(true)
    try {
      const data = await api.post('/api/ar/save-generated', { tripoModelUrl: aiModelUrl, productName, category, description })
      showMsg('success', data.message)
      setAiScreen('upload'); setAiTaskId(null); setAiModelUrl(null)
      setAiPhotos(Array(6).fill(null)); setAiPreviews(Array(6).fill(null))
      setProductName(''); setDescription('')
      setTab('models'); load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAiSaving(false) }
  }

  const CATEGORIES = [
    { value: 'furniture',    label: '🛋️ Mobilya' },
    { value: 'decoration',   label: '🏺 Dekorasyon' },
    { value: 'lighting',     label: t('💡 Aydınlatma','💡 Aydınlatma') },
    { value: 'electronics',  label: '📱 Elektronik' },
    { value: 'kitchen',      label: '🍳 Mutfak & Ev Aletleri' },
    { value: 'garden',       label: t('🌿 Bahçe & Dış Mekan','🌿 Bahçe & Dış Mekan') },
    { value: 'office',       label: t('🖥️ Ofis & İş','🖥️ Ofis & İş') },
    { value: 'sports',       label: '⚽ Spor & Outdoor' },
    { value: 'automotive',   label: '🚗 Otomotiv' },
    { value: 'health',       label: t('💊 Sağlık & Güzellik','💊 Sağlık & Güzellik') },
    { value: 'art',          label: '🎨 Sanat & Koleksiyon' },
    { value: 'construction', label: t('🏗️ Yapı & İnşaat','🏗️ Yapı & İnşaat') },
    { value: 'toy',          label: '🧸 Oyun & Hobi' },
    { value: 'clothing',     label: '👗 Giyim & Aksesuar' },
    { value: 'product',      label: t('📦 Genel Ürün','📦 Genel Ürün') },
    { value: 'industrial',   label: t('🏭 Endüstriyel','🏭 Endüstriyel') },
  ]

  const STAT_CONFIG = [
    { label: '3D Model', key: 'totalModels', color: '#ec4899', glow: 'rgba(236,72,153,0.3)', icon: '📦' },
    { label: t('Görüntüleme','Görüntüleme'), key: 'totalViews', color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', icon: '👁️' },
    { label: t('Gönderildi','Gönderildi'), key: 'totalSent', color: '#10b981', glow: 'rgba(16,185,129,0.3)', icon: '📤' },
    { label: 'AR Oturumu', key: 'totalARSessions', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', icon: '🏠' },
  ]

  // Progress stages mapped to Tripo3D progress values
  const AI_STAGES = [
    { label: t('Fotoğraflar yükleniyor','Fotoğraflar yükleniyor'), icon: '📤', from: 0,  to: 10  },
    { label: 'AI analiz ediyor',       icon: '🔍', from: 10, to: 40  },
    { label: t('3D mesh oluşturuluyor','3D mesh oluşturuluyor'),  icon: '🔨', from: 40, to: 75  },
    { label: 'Texture & renk ekleniyor', icon: '🎨', from: 75, to: 100 },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(15,5,35,0.98),rgba(5,5,20,0.98))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(236,72,153,0.15)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(236,72,153,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, background: 'radial-gradient(circle,rgba(236,72,153,0.12) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 80, zIndex: 1, opacity: 0.6 }}><FloatCube size={18} delay="0s" color="#ec4899" /></div>
        <div style={{ position: 'absolute', top: 50, right: 140, zIndex: 1, opacity: 0.5 }}><FloatCube size={12} delay="0.8s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', bottom: 20, right: 60, zIndex: 1, opacity: 0.5 }}><FloatCube size={16} delay="1.6s" color="#3b82f6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <Cube3D size={64} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{t('ar_experience.ar_urun_deneyimi', 'AR Ürün Deneyimi')}</h1>
              <span style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>3D • AR</span>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, margin: 0, maxWidth: 480 }}>{t('ar_experience.3d_modellerinizi_musterin', '3D modellerinizi müşterinin mekanında gösterin — artırılmış gerçeklik ile satışı kapatın')}</p>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { icon: '📦', title: t('3D Model Yükle','3D Model Yükle'), desc: '.glb / .usdz / AI ile', color: '#ec4899' },
            { icon: '🔗', title: 'AR Link + QR', desc: t('Otomatik oluşur','Otomatik oluşur'), color: '#8b5cf6' },
            { icon: '📱', title: 'WhatsApp\'tan İlet', desc: t('1 tıkla gönder','1 tıkla gönder'), color: '#3b82f6' },
            { icon: '🏠', title: t('Müşteri AR Görür','Müşteri AR Görür'), desc: t('Odada gerçek boyut','Odada gerçek boyut'), color: '#10b981' },
          ].map(({ icon, title, desc, color }, idx) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative' }}>
              {idx < 3 && <ChevronRight size={14} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', color: '#334155', zIndex: 3 }} />}
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>{title}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#34d399' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {STAT_CONFIG.map(({ label, key, color, glow, icon }) => (
            <div key={key} style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: `1px solid ${color}33`, borderRadius: 16, padding: '20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: `radial-gradient(circle,${glow} 0%,transparent 70%)` }} />
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <p style={{ color, fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1 }}>{stats[key]}</p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN TABS ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        {[{ id: 'models', label: `🎯 Modellerim (${models.length})` }, { id: 'upload', label: t('➕ Model Yükle','➕ Model Yükle') }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: tab === t.id ? 'linear-gradient(135deg,#be185d,#7c3aed)' : 'transparent', color: tab === t.id ? '#fff' : '#64748b', boxShadow: tab === t.id ? '0 4px 16px rgba(190,24,93,0.3)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── UPLOAD TAB ────────────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div>
          {/* Sub-tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'file', label: t('📁 Dosya Yükle','📁 Dosya Yükle'), sub: '.glb / .usdz' },
              { id: 'ai',   label: t('✨ AI ile Oluştur','✨ AI ile Oluştur'), sub: t('Fotoğraftan 3D','Fotoğraftan 3D') },
            ].map(m => (
              <button key={m.id} onClick={() => setUploadMode(m.id as any)} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, lineHeight: 1.4, transition: 'all 0.2s', background: uploadMode === m.id ? (m.id === 'ai' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'linear-gradient(135deg,#be185d,#7c3aed)') : 'transparent', color: uploadMode === m.id ? '#fff' : '#64748b', boxShadow: uploadMode === m.id ? '0 4px 16px rgba(124,58,237,0.3)' : 'none' }}>
                {m.label}<br /><span style={{ fontSize: 10, opacity: 0.7 }}>{m.sub}</span>
              </button>
            ))}
          </div>

          {/* ── FILE UPLOAD (existing) ── */}
          {uploadMode === 'file' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Sparkles size={18} style={{ color: '#ec4899' }} />
                  <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{t('ar_experience.3d_model_yukle', '3D Model Yükle')}</h2>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>{t('ar_experience.urun_adi', 'Ürün Adı *')}</label>
                  <input value={productName} onChange={e => setProductName(e.target.value)} placeholder={t('ar_experience.orn_modern_koltuk_takimi', 'örn: Modern Koltuk Takımı')}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Kategori</label>
                  <div style={{ position: 'relative' }}>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      style={{ width: '100%', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>{t('ar_experience.aciklama_opsiyonel', 'Açıklama (opsiyonel)')}</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t('ar_experience.urun_aciklamasi', 'Ürün açıklaması...')}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div onDragOver={e => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) uploadModel(f) }}
                  style={{ border: `2px dashed ${isDragging ? '#ec4899' : 'rgba(236,72,153,0.35)'}`, borderRadius: 14, padding: '24px 20px', textAlign: 'center', background: isDragging ? 'rgba(236,72,153,0.08)' : 'rgba(236,72,153,0.03)' }}>
                  <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                    {uploading ? <RefreshCw size={32} style={{ color: '#ec4899', animation: 'spin 1s linear infinite' }} /> : <div className="upload-float"><FloatCube size={36} color="#ec4899" /></div>}
                  </div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{uploading ? 'Yükleniyor...' : isDragging ? 'Bırakın!' : '.glb veya .usdz dosyasını buraya sürükleyin'}</p>
                  <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>Maksimum 50MB</p>
                </div>
                <button onClick={() => !uploading && fileRef.current?.click()} disabled={uploading}
                  style={{ width: '100%', marginTop: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.35)', cursor: uploading ? 'not-allowed' : 'pointer', background: 'rgba(236,72,153,0.1)', color: '#f472b6', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
                  <Upload size={14} /> Bilgisayardan Seç
                </button>
                <input ref={fileRef} type="file" accept=".glb,.usdz" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadModel(e.target.files[0])} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 20 }}>
                  <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={14} style={{ color: '#3b82f6' }} /> Desteklenen Formatlar</h3>
                  {[{ ext: '.glb', desc: t('Android + Web AR (önerilen)','Android + Web AR (önerilen)'), color: '#10b981' }, { ext: '.usdz', desc: 'iOS/iPhone AR', color: '#3b82f6' }].map(({ ext, desc, color }) => (
                    <div key={ext} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color, fontSize: 13, background: `${color}18`, padding: '3px 10px', borderRadius: 6 }}>{ext}</span>
                      <span style={{ color: '#64748b', fontSize: 13 }}>{desc}</span>
                    </div>
                  ))}
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ color: '#fbbf24', fontSize: 12, margin: 0 }}>{t('ar_experience.gltf_desteklenmiyor_lutfe', '⚠️ .gltf desteklenmiyor — lütfen .glb formatını kullanın')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AI GENERATION ── */}
          {uploadMode === 'ai' && (
            <div>
              {/* UPLOAD GRID */}
              {aiScreen === 'upload' && (
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
                  <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 18, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <Sparkles size={18} style={{ color: '#a78bfa' }} />
                      <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{t('ar_experience.fotograftan_3d_model_olus', 'Fotoğraftan 3D Model Oluştur')}</h2>
                      <span style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>AI</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 5 }}>{t('ar_experience.urun_adi', 'Ürün Adı *')}</label>
                        <input value={productName} onChange={e => setProductName(e.target.value)} placeholder={t('ar_experience.orn_ahsap_sehpa', 'örn: Ahşap Sehpa')}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 5 }}>Kategori</label>
                        <div style={{ position: 'relative' }}>
                          <select value={category} onChange={e => setCategory(e.target.value)}
                            style={{ width: '100%', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
                        </div>
                      </div>
                    </div>

                    <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 10 }}>{t('ar_experience.urun_fotograflari_16_daha', 'Ürün Fotoğrafları (1-6) — daha fazla açı = daha iyi kalite')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                      {[0, 1, 2, 3, 4, 5].map(i => {
                        const isFirst = i === 0
                        const hasPhoto = !!aiPhotos[i]
                        return (
                          <div key={i}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) addAiPhoto(i, f) }}
                            onClick={() => !hasPhoto && slotRefs.current[i]?.click()}
                            style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, border: `2px ${hasPhoto ? 'solid' : 'dashed'} ${isFirst ? (hasPhoto ? '#8b5cf6' : 'rgba(139,92,246,0.5)') : (hasPhoto ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)')}`, background: hasPhoto ? 'transparent' : 'rgba(0,0,0,0.3)', cursor: hasPhoto ? 'default' : 'pointer', overflow: 'hidden' }}>
                            {hasPhoto ? (
                              <>
                                <img src={aiPreviews[i]!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button onClick={e => { e.stopPropagation(); removeAiPhoto(i) }}
                                  style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </>
                            ) : (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <span style={{ fontSize: 20 }}>{isFirst ? '📸' : '➕'}</span>
                                <span style={{ color: isFirst ? '#a78bfa' : '#334155', fontSize: 10, textAlign: 'center', padding: '0 4px' }}>{isFirst ? 'Ön Cephe ★' : `Açı ${i + 1}`}</span>
                              </div>
                            )}
                            <input ref={el => { slotRefs.current[i] = el }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                              onChange={e => { const f = e.target.files?.[0]; if (f) addAiPhoto(i, f) }} />
                          </div>
                        )
                      })}
                    </div>

                    <button onClick={startGeneration} disabled={!aiPhotos[0] || !productName}
                      style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: !aiPhotos[0] || !productName ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 15, fontWeight: 700, opacity: !aiPhotos[0] || !productName ? 0.4 : 1, boxShadow: aiPhotos[0] && productName ? '0 6px 24px rgba(124,58,237,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Sparkles size={18} /> 3D Model Oluştur — AI ile
                    </button>
                    {(!aiPhotos[0] || !productName) && (
                      <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{!productName ? 'Ürün adı yazın ve ' : ''}ön cephe fotoğrafı ekleyin</p>
                    )}
                  </div>

                  {/* Tips + info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(79,70,229,0.08))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 18, padding: 20 }}>
                      <h3 style={{ color: '#a78bfa', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>{t('ar_experience.en_iyi_sonuc_icin', '💡 En İyi Sonuç İçin')}</h3>
                      {[
                        { icon: '⬜', text: t('Beyaz veya açık arka plan kullan','Beyaz veya açık arka plan kullan') },
                        { icon: '🎯', text: t('Ürünü ortaya al, kesilme olmasın','Ürünü ortaya al, kesilme olmasın') },
                        { icon: '🔄', text: t('Ön, yan, arka — farklı açılardan çek','Ön, yan, arka — farklı açılardan çek') },
                        { icon: '💡', text: t('İyi aydınlatma, gölge az olsun','İyi aydınlatma, gölge az olsun') },
                        { icon: '📐', text: t('Min. 512×512 piksel çözünürlük','Min. 512×512 piksel çözünürlük') },
                        { icon: '📱', text: t('Telefon veya DSLR fotoğraf tamam','Telefon veya DSLR fotoğraf tamam') },
                      ].map(({ icon, text }) => (
                        <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                          <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.4 }}>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 18 }}>
                      <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('ar_experience.beklenen_sure', 'Beklenen Süre')}</p>
                      <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>~45 saniye</p>
                      <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{t('ar_experience.1_fotograf_icin_6_fotogra', '1 fotoğraf için • 6 fotoğraf ~90 sn')}</p>
                      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
                        <p style={{ color: '#34d399', fontSize: 11, margin: 0 }}>{t('ar_experience.cikti_ar_destekli_glb_for', '✅ Çıktı: AR destekli .glb formatı')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GENERATING SCREEN */}
              {aiScreen === 'generating' && (
                <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.98),rgba(15,5,40,0.98))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 18, padding: '48px 32px', textAlign: 'center', minHeight: 360 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}><Cube3D size={72} /></div>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{t('ar_experience.ai_3d_model_olusturuyor', 'AI 3D Model Oluşturuyor...')}</h2>
                  <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 32px' }}>{t('ar_experience.lutfen_bekleyin_yaklasik', 'Lütfen bekleyin — yaklaşık 45-90 saniye')}</p>

                  <div style={{ maxWidth: 480, margin: '0 auto 28px', textAlign: 'left' }}>
                    {AI_STAGES.map(({ label, icon, from, to }, idx) => {
                      const isDone   = aiProgress >= to
                      const isActive = aiProgress >= from && aiProgress < to
                      return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isDone ? 'rgba(16,185,129,0.5)' : isActive ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.08)'}`, animation: isActive ? 'pulse3d 1.5s ease-in-out infinite' : 'none' }}>
                            {isDone ? '✅' : icon}
                          </div>
                          <p style={{ color: isDone ? '#34d399' : isActive ? '#a78bfa' : '#334155', fontSize: 13, fontWeight: isActive ? 600 : 400, margin: 0 }}>
                            {label}{isActive && <span style={{ color: '#a78bfa' }}>{'.'.repeat(dotCount)}</span>}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ maxWidth: 480, margin: '0 auto', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, transition: 'width 0.5s ease', width: `${Math.max(5, aiProgress)}%`, background: 'linear-gradient(90deg,#7c3aed,#ec4899)', boxShadow: '0 0 12px rgba(124,58,237,0.6)' }} />
                  </div>
                  <p style={{ color: '#475569', fontSize: 12, marginTop: 10 }}>{aiProgress}% tamamlandı</p>
                </div>
              )}

              {/* PREVIEW SCREEN */}
              {aiScreen === 'preview' && aiModelUrl && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.98),rgba(15,5,40,0.98))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 18, overflow: 'hidden', height: 420, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#34d399', fontWeight: 600 }}>{t('ar_experience.3d_model_hazir', '✅ 3D Model Hazır')}</div>
                    {mvLoaded ? (
                      // @ts-ignore
                      <model-viewer src={aiModelUrl} camera-controls auto-rotate auto-rotate-delay="500" rotation-per-second="25deg" shadow-intensity="1" environment-image="neutral" exposure="1.1" style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                        <RefreshCw size={28} style={{ color: '#475569', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: '#475569', fontSize: 13 }}>{t('ar_experience.3d_onizleme_yukleniyor', '3D önizleme yükleniyor...')}</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 18, padding: 24 }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                      <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{t('ar_experience.3d_model_olusturuldu', '3D Model Oluşturuldu!')}</h2>
                      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>{t('ar_experience.ai_fotograflarinizdan_yuk', 'AI fotoğraflarınızdan yüksek kaliteli bir 3D model oluşturdu. Önizleyin, beğendiyseniz kaydedin.')}</p>
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 4px' }}>{t('ar_experience.urun_adi', 'Ürün adı')}</p>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>{productName || 'AI Oluşturuldu'}</p>
                      </div>
                      <button onClick={saveGenerated} disabled={aiSaving}
                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: aiSaving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 24px rgba(16,185,129,0.35)', opacity: aiSaving ? 0.7 : 1 }}>
                        {aiSaving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
                        {aiSaving ? 'Kaydediliyor...' : 'Kaydet & AR Linki Oluştur'}
                      </button>
                      <button onClick={() => { setAiScreen('upload'); setAiTaskId(null); setAiModelUrl(null) }}
                        style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 14 }}>
                        Yeniden Oluştur
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODELS TAB ────────────────────────────────────────────────────── */}
      {tab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 20 }}>
            <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, margin: '0 0 12px', letterSpacing: 1, textTransform: 'uppercase' }}>{t('ar_experience.lead_sec_ar_gonderimi_ici', 'Lead Seç — AR gönderimi için')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Tek Lead</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                    style={{ width: '100%', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                    <option value="">Lead seçin ({leads.length} kişi)</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
                </div>
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Toplu Seçim ({selectedLeads.length} seçili)</label>
                <div style={{ maxHeight: 110, overflowY: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '8px 6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {leads.slice(0, 100).map(l => (
                    <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', borderRadius: 6 }}>
                      <input type="checkbox" checked={selectedLeads.includes(l.id)} onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))} style={{ accentColor: '#ec4899' }} />
                      <span style={{ color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
              <RefreshCw size={24} style={{ color: '#475569', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : models.length === 0 ? (
            <div style={{ background: 'linear-gradient(135deg,rgba(10,10,20,0.95),rgba(15,15,30,0.9))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 60, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Cube3D size={56} /></div>
              <p style={{ color: '#475569', fontSize: 15, margin: '0 0 16px' }}>{t('ar_experience.henuz_3d_model_yok', 'Henüz 3D model yok')}</p>
              <button onClick={() => setTab('upload')} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#be185d,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 16px rgba(190,24,93,0.3)' }}>
                İlk Modeli Yükle
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {models.map(model => (
                <ModelCard key={model.id} model={model} CATEGORIES={CATEGORIES} selectedLead={selectedLead} selectedLeads={selectedLeads} sending={sending} onSend={sendAR} onDelete={deleteModel} onQR={(id: string) => setShowQR(showQR === id ? null : id)} showQR={showQR} onAnalytics={loadAnalytics} expandedAnalytics={expandedAnalytics} analyticsData={analytics[model.id]} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes cube3dSpin {
          0%   { transform: rotateX(15deg) rotateY(0deg); }
          100% { transform: rotateX(15deg) rotateY(360deg); }
        }
        .cube-spin { animation: cube3dSpin 10s linear infinite; }

        @keyframes floatUp {
          0%, 100% { transform: translateY(0px) rotateX(15deg) rotateY(0deg); }
          50%       { transform: translateY(-10px) rotateX(15deg) rotateY(180deg); }
        }
        .float-cube { animation: floatUp 4s ease-in-out infinite; }

        @keyframes holoBorder {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes pulse3d {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(124,58,237,0); }
        }
      `}</style>
    </div>
  )
}
