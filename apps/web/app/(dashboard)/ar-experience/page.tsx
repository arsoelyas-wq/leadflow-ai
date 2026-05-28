'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Upload, Send, RefreshCw, QrCode, Trash2, Eye, BarChart3,
  Users, ExternalLink, Sparkles, Zap, Globe, ChevronRight,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

// ── 3D CSS Cube ───────────────────────────────────────────────────────────────
function Cube3D({ size = 64 }: { size?: number }) {
  const h = size / 2
  return (
    <div style={{ perspective: `${size * 5}px`, width: size, height: size }}>
      <div className="cube-spin" style={{
        width: size, height: size, position: 'relative',
        transformStyle: 'preserve-3d',
      }}>
        {[
          { transform: `translateZ(${h}px)`,               bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.4)' },
          { transform: `translateZ(-${h}px) rotateY(180deg)`, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)' },
          { transform: `translateX(-${h}px) rotateY(-90deg)`, bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
          { transform: `translateX(${h}px) rotateY(90deg)`,  bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.4)' },
          { transform: `translateY(-${h}px) rotateX(90deg)`, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
          { transform: `translateY(${h}px) rotateX(-90deg)`, bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)'  },
        ].map((f, i) => (
          <div key={i} style={{
            position: 'absolute', width: size, height: size,
            transform: f.transform,
            background: f.bg,
            border: `1px solid ${f.border}`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Floating mini cube decoration ────────────────────────────────────────────
function FloatCube({ size = 20, delay = '0s', color = '#ec4899' }: { size?: number; delay?: string; color?: string }) {
  return (
    <div className="float-cube" style={{ animationDelay: delay, width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', perspective: `${size * 8}px` }}>
      <div style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }} className="cube-spin">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{
            position: 'absolute', width: size, height: size,
            background: `${color}18`,
            border: `1px solid ${color}55`,
            transform: [
              `translateZ(${size/2}px)`, `translateZ(-${size/2}px) rotateY(180deg)`,
              `translateX(-${size/2}px) rotateY(-90deg)`, `translateX(${size/2}px) rotateY(90deg)`,
              `translateY(-${size/2}px) rotateX(90deg)`, `translateY(${size/2}px) rotateX(-90deg)`,
            ][i],
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Holographic Model Card ────────────────────────────────────────────────────
function ModelCard({
  model, CATEGORIES, selectedLead, selectedLeads,
  sending, onSend, onDelete, onQR, showQR, onAnalytics,
  expandedAnalytics, analyticsData,
}: any) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const x = ((e.clientY - cy) / (rect.height / 2)) * 4
    const y = (-(e.clientX - cx) / (rect.width / 2)) * 4
    setTilt({ x, y })
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }) }}
      onMouseMove={handleMouseMove}
      style={{
        transition: hovered ? 'transform 0.05s ease' : 'transform 0.3s ease',
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        position: 'relative',
      }}
    >
      {/* Holographic border */}
      <div style={{
        position: 'absolute', inset: -1.5, borderRadius: 18, zIndex: 0,
        background: hovered
          ? 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6, #14b8a6, #ec4899)'
          : 'linear-gradient(135deg, #ec489933, #8b5cf633)',
        backgroundSize: '300% 300%',
        animation: hovered ? 'holoBorder 2s linear infinite' : 'none',
        transition: 'opacity 0.3s',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'linear-gradient(135deg, rgba(15,15,30,0.95), rgba(10,10,20,0.98))',
        borderRadius: 17, overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          {/* 3D model icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(236,72,153,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: hovered ? '0 0 24px rgba(236,72,153,0.3)' : 'none',
            transition: 'box-shadow 0.3s',
          }}>
            {hovered
              ? <Cube3D size={36} />
              : <span style={{ fontSize: 24 }}>📦</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{model.product_name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(236,72,153,0.15)', color: '#f472b6',
                fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(236,72,153,0.2)',
              }}>
                {CATEGORIES.find((c: any) => c.value === model.category)?.label || model.category}
              </span>
              <span style={{ color: '#64748b', fontSize: 12 }}>👁️ {model.view_count || 0}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>📱 {model.ar_session_count || 0} AR</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>📤 {model.send_count || 0}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={model.ar_viewer_url} target="_blank" rel="noopener noreferrer"
              style={btnStyle('#334155', '#475569')} title="AR Önizle">
              <Eye size={13} />
            </a>
            <button onClick={() => onQR(model.id)}
              style={btnStyle(showQR === model.id ? '#9333ea' : '#334155', showQR === model.id ? '#a855f7' : '#475569')}
              title="QR Kod">
              <QrCode size={13} />
            </button>
            <button onClick={() => onAnalytics(model.id)}
              style={btnStyle(expandedAnalytics === model.id ? '#2563eb' : '#334155', expandedAnalytics === model.id ? '#3b82f6' : '#475569')}
              title="Analitik">
              <BarChart3 size={13} />
            </button>
            <button
              onClick={() => onSend(model.id, false)}
              disabled={sending === model.id || !selectedLead}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                opacity: (sending === model.id || !selectedLead) ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}>
              {sending === model.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              Gönder
            </button>
            {selectedLeads.length > 0 && (
              <button onClick={() => onSend(model.id, true)} disabled={sending === model.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  opacity: sending === model.id ? 0.4 : 1,
                }}>
                <Users size={12} /> {selectedLeads.length}
              </button>
            )}
            <button onClick={() => onDelete(model.id)}
              style={{ ...btnStyle('#7f1d1d', '#ef4444'), color: '#fca5a5' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* QR Panel */}
        {showQR === model.id && (
          <div style={{
            padding: '16px 20px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'flex-start', gap: 20,
            background: 'rgba(139,92,246,0.05)',
          }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
              <img src={model.qr_url} alt="QR" style={{ width: 120, height: 120, display: 'block' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 6px' }}>AR Linki & QR Kod</p>
              <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 10px' }}>Müşteri QR'ı okutunca AR deneyimi açılır</p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '8px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ color: '#94a3b8', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {model.ar_viewer_url}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(model.ar_viewer_url)}
                  style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  Kopyala
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {expandedAnalytics === model.id && analyticsData && (
          <div style={{
            padding: '16px 20px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(59,130,246,0.05)',
          }}>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 12px' }}>Analitik Özet</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[
                { label: 'Görüntüleme', value: analyticsData.views, color: '#3b82f6' },
                { label: 'AR Oturumu', value: analyticsData.arSessions, color: '#ec4899' },
                { label: 'Ort. Süre', value: `${analyticsData.avgDuration}s`, color: '#f59e0b' },
                { label: 'Mobil', value: analyticsData.mobileViews, color: '#10b981' },
                { label: 'AR Dönüşüm', value: `%${analyticsData.conversionRate}`, color: '#8b5cf6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 8px',
                  textAlign: 'center', border: `1px solid ${color}33`,
                }}>
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

function btnStyle(bg: string, hover: string) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: bg, color: '#94a3b8', transition: 'background 0.2s',
  } as React.CSSProperties
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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
  const [isDragging, setIsDragging] = useState(false)

  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('furniture')
  const fileRef = useRef<HTMLInputElement>(null)

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

  const uploadModel = async (file: File) => {
    if (!productName) { showMsg('error', 'Ürün adı zorunlu'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'gltf') {
      showMsg('error', '.gltf desteklenmiyor — .glb (binary) formatına dönüştürün. Blender veya online dönüştürücü kullanabilirsiniz.')
      return
    }
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('model', file)
      formData.append('productName', productName)
      formData.append('description', description)
      formData.append('category', category)

      const response = await fetch(`${API_URL}/api/ar/upload-model`, {
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

  const STAT_CONFIG = [
    { label: '3D Model', key: 'totalModels', color: '#ec4899', glow: 'rgba(236,72,153,0.3)', icon: '📦' },
    { label: 'Görüntüleme', key: 'totalViews', color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', icon: '👁️' },
    { label: 'Gönderildi', key: 'totalSent', color: '#10b981', glow: 'rgba(16,185,129,0.3)', icon: '📤' },
    { label: 'AR Oturumu', key: 'totalARSessions', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', icon: '🏠' },
  ]

  return (
    <div style={{ padding: 0 }}>
      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(15,5,35,0.98), rgba(5,5,20,0.98))',
        borderRadius: 20, padding: '32px 28px', marginBottom: 24,
        border: '1px solid rgba(236,72,153,0.15)',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(236,72,153,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: -40, right: 100, width: 250, height: 250, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', zIndex: 0 }} />

        {/* Floating mini cubes */}
        <div style={{ position: 'absolute', top: 20, right: 80, zIndex: 1, opacity: 0.6 }}><FloatCube size={18} delay="0s" color="#ec4899" /></div>
        <div style={{ position: 'absolute', top: 50, right: 140, zIndex: 1, opacity: 0.5 }}><FloatCube size={12} delay="0.8s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', bottom: 20, right: 60, zIndex: 1, opacity: 0.5 }}><FloatCube size={16} delay="1.6s" color="#3b82f6" /></div>
        <div style={{ position: 'absolute', top: 30, right: 220, zIndex: 1, opacity: 0.4 }}><FloatCube size={10} delay="2.4s" color="#14b8a6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Cube3D size={64} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
                AR Ürün Deneyimi
              </h1>
              <span style={{
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20,
                fontWeight: 700, letterSpacing: 1,
              }}>3D • AR</span>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, margin: 0, maxWidth: 480 }}>
              3D modellerinizi müşterinin mekanında gösterin — artırılmış gerçeklik ile satışı kapatın
            </p>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24,
        }}>
          {[
            { icon: '📦', title: '3D Model Yükle', desc: '.glb veya .usdz', color: '#ec4899' },
            { icon: '🔗', title: 'AR Link + QR', desc: 'Otomatik oluşur', color: '#8b5cf6' },
            { icon: '📱', title: 'WhatsApp\'tan İlet', desc: '1 tıkla gönder', color: '#3b82f6' },
            { icon: '🏠', title: 'Müşteri AR Görür', desc: 'Odada gerçek boyut', color: '#10b981' },
          ].map(({ icon, title, desc, color }, idx) => (
            <div key={title} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 12px',
              border: `1px solid ${color}22`, textAlign: 'center', position: 'relative',
            }}>
              {idx < 3 && (
                <ChevronRight size={14} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', color: '#334155', zIndex: 3 }} />
              )}
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>{title}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ──────────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{
          marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13,
          background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'success' ? '#34d399' : '#f87171',
        }}>{msg.text}</div>
      )}

      {/* ── STATS ──────────────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {STAT_CONFIG.map(({ label, key, color, glow, icon }) => (
            <div key={key} style={{
              background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.9))',
              border: `1px solid ${color}33`, borderRadius: 16, padding: '20px 16px',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
                width: 80, height: 80,
                background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
              }} />
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <p style={{ color, fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1 }}>{stats[key]}</p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ───────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)',
        padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { id: 'models', label: `🎯 Modellerim (${models.length})` },
          { id: 'upload', label: '➕ Model Yükle' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            background: tab === t.id ? 'linear-gradient(135deg, #be185d, #7c3aed)' : 'transparent',
            color: tab === t.id ? '#fff' : '#64748b',
            boxShadow: tab === t.id ? '0 4px 16px rgba(190,24,93,0.3)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── UPLOAD TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Form */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.9))',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Sparkles size={18} style={{ color: '#ec4899' }} />
              <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>3D Model Yükle</h2>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Ürün Adı *</label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="örn: Modern Koltuk Takımı"
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Kategori</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)} style={{
                    padding: '9px 8px', borderRadius: 10, border: `1px solid ${category === c.value ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: category === c.value ? 'rgba(236,72,153,0.15)' : 'rgba(0,0,0,0.3)',
                    color: category === c.value ? '#f472b6' : '#64748b',
                    fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                  }}>{c.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Açıklama (opsiyonel)</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ürün açıklaması..."
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }} />
            </div>

            {/* 3D Animated Upload Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault(); setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) uploadModel(file)
              }}
              onClick={() => !uploading && productName && fileRef.current?.click()}
              style={{
                position: 'relative', overflow: 'hidden',
                border: `2px dashed ${isDragging ? '#ec4899' : 'rgba(236,72,153,0.35)'}`,
                borderRadius: 14, padding: '28px 20px', textAlign: 'center',
                cursor: uploading || !productName ? 'not-allowed' : 'pointer',
                background: isDragging ? 'rgba(236,72,153,0.08)' : 'rgba(236,72,153,0.03)',
                transition: 'all 0.3s', opacity: !productName ? 0.5 : 1,
              }}>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                {uploading
                  ? <RefreshCw size={32} style={{ color: '#ec4899', animation: 'spin 1s linear infinite' }} />
                  : <div className="upload-float"><FloatCube size={40} color="#ec4899" /></div>
                }
              </div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>
                {uploading ? 'Yükleniyor...' : isDragging ? 'Bırakın!' : '.glb veya .usdz dosyasını sürükleyin'}
              </p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>veya tıklayın — maksimum 50MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".glb,.usdz" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadModel(e.target.files[0])} />
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.9))',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 20,
            }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={14} style={{ color: '#3b82f6' }} /> Desteklenen Formatlar
              </h3>
              {[
                { ext: '.glb', desc: 'Android + Web AR (önerilen)', color: '#10b981' },
                { ext: '.usdz', desc: 'iOS/iPhone AR', color: '#3b82f6' },
              ].map(({ ext, desc, color }) => (
                <div key={ext} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{
                    fontFamily: 'monospace', fontWeight: 700, color, fontSize: 13,
                    background: `${color}18`, padding: '3px 10px', borderRadius: 6,
                  }}>{ext}</span>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{desc}</span>
                </div>
              ))}
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 10, padding: '10px 12px', marginTop: 4,
              }}>
                <p style={{ color: '#fbbf24', fontSize: 12, margin: 0 }}>
                  ⚠️ .gltf desteklenmiyor — lütfen .glb formatını kullanın
                </p>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.9))',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 20,
            }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} style={{ color: '#f59e0b' }} /> Ücretsiz 3D Model Kaynakları
              </h3>
              {[
                { name: 'Sketchfab', url: 'sketchfab.com', desc: 'En büyük 3D kütüphane' },
                { name: 'Poly Pizza', url: 'poly.pizza', desc: 'Basit low-poly modeller' },
                { name: 'TurboSquid', url: 'turbosquid.com', desc: 'Profesyonel modeller' },
              ].map(({ name, url, desc }) => (
                <a key={name} href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                    marginBottom: 8, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{name}</p>
                    <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{desc}</p>
                  </div>
                  <ExternalLink size={13} style={{ color: '#475569' }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODELS TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lead Picker */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.9))',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 20,
          }}>
            <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, margin: '0 0 12px', letterSpacing: 1, textTransform: 'uppercase' }}>
              Lead Seç — AR gönderimi için
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>Tek Lead</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                    style={{
                      width: '100%', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13,
                      outline: 'none', appearance: 'none', cursor: 'pointer',
                    }}>
                    <option value="">Lead seçin ({leads.length} kişi)</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▾</span>
                </div>
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 6 }}>
                  Toplu Seçim ({selectedLeads.length} seçili)
                </label>
                <div style={{
                  maxHeight: 110, overflowY: 'auto', background: 'rgba(0,0,0,0.4)',
                  borderRadius: 10, padding: '8px 6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {leads.slice(0, 100).map(l => (
                    <label key={l.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', cursor: 'pointer', borderRadius: 6,
                    }}>
                      <input type="checkbox" checked={selectedLeads.includes(l.id)}
                        onChange={e => setSelectedLeads(prev =>
                          e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id)
                        )}
                        style={{ accentColor: '#ec4899' }} />
                      <span style={{ color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.company_name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Models List */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
              <RefreshCw size={24} style={{ color: '#475569', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : models.length === 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.9))',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 60,
              textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Cube3D size={56} /></div>
              <p style={{ color: '#475569', fontSize: 15, margin: '0 0 16px' }}>Henüz 3D model yok</p>
              <button onClick={() => setTab('upload')} style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #be185d, #7c3aed)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                boxShadow: '0 4px 16px rgba(190,24,93,0.3)',
              }}>
                İlk Modeli Yükle
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {models.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  CATEGORIES={CATEGORIES}
                  selectedLead={selectedLead}
                  selectedLeads={selectedLeads}
                  sending={sending}
                  onSend={sendAR}
                  onDelete={deleteModel}
                  onQR={(id: string) => setShowQR(showQR === id ? null : id)}
                  showQR={showQR}
                  onAnalytics={loadAnalytics}
                  expandedAnalytics={expandedAnalytics}
                  analyticsData={analytics[model.id]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CSS ANIMATIONS ─────────────────────────────────────────────────────── */}
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
