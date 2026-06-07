'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw, Upload, FileSpreadsheet, Sparkles, Edit3, ToggleLeft, ToggleRight, Package, Brain, CheckCircle, X, Image as ImageIcon, Tag, Bot, Star, AlertTriangle, XCircle, ClipboardList } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

const CATEGORIES = ['Mobilya','Dekorasyon','Aydınlatma','Elektronik','Mutfak','Bahçe','Ofis','Spor','Otomotiv','Sağlık','Tekstil','İnşaat','Gıda','Diğer']

const tx1 = '#0f172a', tx2 = '#475569', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'
const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const inp = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

function QuantumOrb({ size = 48 }: { size?: number }) {
  const s = size, h = s / 2
  return (
    <div style={{ width: s * 2, height: s * 2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: s * 1.8, height: s * 1.8, borderRadius: '50%', border: '1.5px solid rgba(99,102,241,0.5)', animation: 'prodRing1 4s linear infinite', transformStyle: 'preserve-3d' }}><div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} /></div>
      <div style={{ position: 'absolute', width: s * 1.4, height: s * 1.4, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.45)', animation: 'prodRing2 6s linear infinite', transformStyle: 'preserve-3d' }}><div style={{ position: 'absolute', top: -2.5, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} /></div>
      <div style={{ width: s, height: s, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, #c7d2fe, #6366f1 40%, #1e1b4b 75%)', boxShadow: `0 0 ${s * 0.4}px rgba(99,102,241,0.7), 0 0 ${s * 0.8}px rgba(99,102,241,0.2)`, animation: 'prodBreath 4s ease-in-out infinite', position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: '18%', left: '22%', width: '28%', height: '18%', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', filter: 'blur(3px)', transform: 'rotate(-30deg)' }} />
      </div>
    </div>
  )
}

type Product = { id: string; name: string; description: string; price: string; category: string; specs: string; images: string[]; is_active: boolean; created_at: string }

function ProductCard({ p, onDelete, onToggle, onEdit }: { p: Product; onDelete: (id: string) => void; onToggle: (id: string, v: boolean) => void; onEdit: (p: Product) => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div style={{ ...card, border: `1px solid ${p.is_active ? '#e0e7ff' : '#e2e8f0'}`, overflow: 'hidden', opacity: p.is_active ? 1 : 0.55, transition: 'opacity 0.2s' }}>
      {/* Image */}
      <div style={{ height: 120, background: surf, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {p.images && p.images[0] ? (
          <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={36} style={{ color: tx3 }} />
        )}
        {p.images && p.images[1] && (
          <img src={p.images[1]} alt="" style={{ position: 'absolute', bottom: 4, right: 4, width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
        )}
        {p.category && (
          <span style={{ position: 'absolute', top: 6, left: 6, background: surf, border: '1px solid #e2e8f0', color: '#4f46e5', fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{p.category}</span>
        )}
      </div>
      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
        {p.price && <p style={{ color: '#4f46e5', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>{p.price}</p>}
        {p.description && <p style={{ color: tx2, fontSize: 11, margin: '0 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{p.description}</p>}
        {p.specs && <p style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 10, margin: '0 0 10px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><ClipboardList size={11} /> {p.specs}</p>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => onEdit(p)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(79,70,229,0.1)', color: '#4f46e5', fontSize: 11 }}><Edit3 size={11} /> Düzenle</button>
          <button onClick={() => onToggle(p.id, p.is_active)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: p.is_active ? 'rgba(5,150,105,0.1)' : '#f1f5f9', color: p.is_active ? accentEmerald : tx2, fontSize: 11 }}>{p.is_active ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}</button>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: 11 }}><Trash2 size={11} /></button>
          ) : (
            <button onClick={() => onDelete(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.18)', color: '#dc2626', fontSize: 11, fontWeight: 700 }}>Sil?</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductForm({ initial, onClose, onSaved, token }: { initial?: Product | null; onClose: () => void; onSaved: () => void; token: string }) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [price, setPrice] = useState(initial?.price || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [specs, setSpecs] = useState(initial?.specs || '')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(initial?.images || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef0 = useRef<HTMLInputElement>(null)
  const fileRef1 = useRef<HTMLInputElement>(null)

  const addImage = (file: File, slot: number) => {
    const reader = new FileReader()
    reader.onload = e => setPreviews(p => { const n = [...p]; n[slot] = e.target?.result as string; return n })
    reader.readAsDataURL(file)
    setImages(p => { const n = [...p]; n[slot] = file; return n })
  }

  const removeImage = (slot: number) => {
    setImages(p => { const n = [...p]; n[slot] = undefined as any; return n })
    setPreviews(p => { const n = [...p]; n[slot] = initial?.images?.[slot] || ''; return n })
  }

  const submit = async () => {
    if (!name) { setError('Ürün adı zorunlu'); return }
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('name', name); fd.append('description', description)
      fd.append('price', price); fd.append('category', category); fd.append('specs', specs)
      if (initial) {
        previews.filter(Boolean).forEach(url => { if (url.startsWith('http')) fd.append('existingImages', url) })
      }
      images.forEach((f, i) => { if (f) fd.append(`image_${i}`, f) })

      const url = initial ? `${API_URL}/api/products/${initial.id}` : `${API_URL}/api/products/create`
      const method = initial ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...card, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{initial ? <Edit3 size={16} /> : <Plus size={16} />} {initial ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2e8f0', background: surf, color: tx2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        {/* Images */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          {[0, 1].map(i => (
            <div key={i}>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 6 }}>{i === 0 ? 'Ana Görsel *' : 'İkinci Görsel (opsiyonel)'}</label>
              {previews[i] ? (
                <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden' }}>
                  <img src={previews[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✕</button>
                </div>
              ) : (
                <div onClick={() => (i === 0 ? fileRef0 : fileRef1).current?.click()}
                  style={{ height: 110, borderRadius: 10, border: '1.5px dashed #c7d2fe', background: surf, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6 }}>
                  <ImageIcon size={20} style={{ color: tx3 }} />
                  <span style={{ color: tx3, fontSize: 11 }}>Görsel yükle</span>
                </div>
              )}
              <input ref={i === 0 ? fileRef0 : fileRef1} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) addImage(e.target.files[0], i) }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Ürün Adı *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="örn: Compact LED Masa Lambası"
              style={{ ...inp, width: '100%', border: `1px solid ${name ? '#c7d2fe' : '#e2e8f0'}` }} />
          </div>
          <div>
            <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Fiyat</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="₺499 / $25 / Teklif"
              style={{ ...inp, width: '100%' }} />
          </div>
          <div>
            <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Kategori</label>
            <div style={{ position: 'relative' }}>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ ...inp, width: '100%', color: category ? tx1 : tx3, appearance: 'none', cursor: 'pointer' }}>
                <option value="">Kategori seç</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: tx3, pointerEvents: 'none' }}>▾</span>
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Ürün hakkında detaylı açıklama — AI bu bilgiyi kullanarak müşterilere yanıt verir"
              style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Teknik Özellikler</label>
            <input value={specs} onChange={e => setSpecs(e.target.value)} placeholder="örn: 40W, 220V, IP65, 3000K sıcak beyaz, A++ enerji"
              style={{ ...inp, width: '100%' }} />
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 12px', background: 'rgba(220,38,38,0.08)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={submit} disabled={saving}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'prodSpin 1s linear infinite' }} /> : <CheckCircle size={14} />}
            {saving ? 'Kaydediliyor...' : initial ? 'Güncelle' : 'Ürünü Kaydet'}
          </button>
          <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: tx2, fontSize: 14, cursor: 'pointer' }}>İptal</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [aiContext, setAiContext] = useState<{ context: string; productCount: number } | null>(null)
  const [showAI, setShowAI] = useState(false)
  const excelRef = useRef<HTMLInputElement>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/products/list')
      setProducts(data.products || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const onSaved = () => { setShowForm(false); setEditProduct(null); load(); showMsg('success', 'Ürün kaydedildi!') }

  const deleteProduct = async (id: string) => {
    try { await api.delete(`/api/products/${id}`); setProducts(p => p.filter(x => x.id !== id)); showMsg('success', 'Ürün silindi') }
    catch (e: any) { showMsg('error', e.message) }
  }

  const toggleProduct = async (id: string, current: boolean) => {
    try {
      await api.patch(`/api/products/${id}/toggle`, {})
      setProducts(p => p.map(x => x.id === id ? { ...x, is_active: !current } : x))
    } catch (e: any) { showMsg('error', e.message) }
  }

  const importExcel = async (file: File) => {
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`${API_URL}/api/products/bulk-excel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const loadAiContext = async () => {
    try {
      const data = await api.get('/api/products/ai-context')
      setAiContext(data); setShowAI(true)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    const matchCat = !filterCat || p.category === filterCat
    return matchSearch && matchCat
  })

  const activeCount = products.filter(p => p.is_active).length
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#eef2ff 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #e0e7ff' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, background: 'radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <QuantumOrb size={56} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: tx1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{t('products.urun_katalogu', 'Ürün Kataloğu')}</h1>
                <span style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>AI</span>
              </div>
              <p style={{ color: tx2, fontSize: 14, margin: 0, maxWidth: 540 }}>{t('products.urunlerinizi_ekleyin_ai_t', 'Ürünlerinizi ekleyin — AI tüm kampanya, WhatsApp ve çağrılarda bunları öğrenip müşterilere özel teklifler sunar')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <a href={`${API_URL}/api/products/excel-template`} download
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: '1px solid rgba(5,150,105,0.25)', cursor: 'pointer', background: 'rgba(5,150,105,0.07)', color: accentEmerald, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}>
              <Upload size={15} style={{ transform: 'rotate(180deg)' }} /> Şablon İndir
            </a>
            <button onClick={() => excelRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: '1px solid rgba(79,70,229,0.25)', cursor: 'pointer', background: 'rgba(79,70,229,0.06)', color: '#4f46e5', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              <FileSpreadsheet size={15} /> Excel İçe Aktar
            </button>
            <button onClick={() => { setEditProduct(null); setShowForm(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 6px 20px rgba(79,70,229,0.3)', whiteSpace: 'nowrap' }}>
              <Plus size={15} /> Ürün Ekle
            </button>
          </div>
        </div>
        <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) importExcel(e.target.files[0]); e.target.value = '' }} />

        {/* Stats row */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: t('Toplam Ürün','Toplam Ürün'), value: products.length, color: '#4f46e5', Icon: Package },
            { label: 'Aktif', value: activeCount, color: accentEmerald, Icon: CheckCircle },
            { label: 'Kategori', value: cats.length, color: '#7c3aed', Icon: Tag },
            { label: 'AI Bilgi Skoru', value: products.length >= 5 ? 'Yüksek' : products.length >= 1 ? 'Orta' : 'Yok', color: products.length >= 5 ? '#b45309' : '#dc2626', Icon: products.length >= 5 ? Star : products.length >= 1 ? AlertTriangle : XCircle },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ background: surf, borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon size={20} style={{ color }} /></div>
              <p style={{ color, fontSize: typeof value === 'number' ? 24 : 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${msg.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      {/* ── AI CONTEXT PANEL ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={loadAiContext}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 11, border: '1px solid rgba(124,58,237,0.25)', cursor: 'pointer', background: 'rgba(124,58,237,0.06)', color: '#7c3aed', fontSize: 13, fontWeight: 600 }}>
          <Brain size={15} /> AI Bilgi Bankasını Görüntüle
        </button>
        {showAI && aiContext && (
          <div style={{ marginTop: 12, ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontSize: 13, fontWeight: 600, margin: 0 }}><Bot size={14} /> AI'nın ürün bilgisi ({aiContext.productCount} ürün)</p>
              <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', color: tx2, cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <pre style={{ color: tx2, fontSize: 11, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{aiContext.context || 'Henüz ürün eklenmemiş — ürün ekledikten sonra AI bu bilgileri kullanacak.'}</pre>
          </div>
        )}
      </div>

      {/* ── EXCEL TEMPLATE INFO ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 12, fontSize: 12, color: tx2, display: 'flex', alignItems: 'center', gap: 12 }}>
        <FileSpreadsheet size={14} style={{ color: accentEmerald, flexShrink: 0 }} />
        <span>{t('products.toplu_yukleme_icin_once', 'Toplu yükleme için önce')}<a href={`${API_URL}/api/products/excel-template`} download style={{ color: accentEmerald, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>{t('products.excel_sablonunu_indirin', 'Excel şablonunu indirin')}</a>{t('products.doldurun_ve_excel_ice_akt', ', doldurun ve "Excel İçe Aktar" ile yükleyin. Maksimum 500 ürün.')}</span>
      </div>

      {/* ── SEARCH + FILTER ───────────────────────────────────────────────── */}
      {products.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('products.urun_ara', 'Ürün ara...')}
            style={{ ...inp, flex: 1, minWidth: 200, padding: '9px 14px' }} />
          <div style={{ position: 'relative' }}>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ ...inp, padding: '9px 32px 9px 14px', color: filterCat ? tx1 : tx3, appearance: 'none', cursor: 'pointer', minWidth: 160 }}>
              <option value="">{t('products.tum_kategoriler', 'Tüm kategoriler')}</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: tx3, pointerEvents: 'none' }}>▾</span>
          </div>
          {(search || filterCat) && (
            <button onClick={() => { setSearch(''); setFilterCat('') }} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: tx2, fontSize: 12, cursor: 'pointer' }}>Temizle</button>
          )}
        </div>
      )}

      {/* ── PRODUCT GRID ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
          <RefreshCw size={24} style={{ color: tx2, animation: 'prodSpin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><QuantumOrb size={52} /></div>
          <p style={{ color: tx2, fontSize: 15, margin: '0 0 6px' }}>{products.length === 0 ? 'Henüz ürün yok' : 'Arama sonucu bulunamadı'}</p>
          <p style={{ color: tx2, fontSize: 13, margin: '0 0 20px' }}>{t('products.urun_ekledikce_ai_tum_kon', 'Ürün ekledikçe AI tüm konuşmalarda bunları kullanır')}</p>
          {products.length === 0 && (
            <button onClick={() => setShowForm(true)}
              style={{ padding: '11px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(79,70,229,0.3)' }}>
              İlk Ürünü Ekle
            </button>
          )}
        </div>
      ) : (
        <div>
          <p style={{ color: tx2, fontSize: 12, margin: '0 0 14px' }}>{filtered.length} ürün{search || filterCat ? ` (${products.length} toplam)` : ''}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} p={p} onDelete={deleteProduct} onToggle={toggleProduct} onEdit={prod => { setEditProduct(prod); setShowForm(true) }} />
            ))}
          </div>
        </div>
      )}

      {/* ── FORM MODAL ────────────────────────────────────────────────────── */}
      {showForm && (
        <ProductForm initial={editProduct} onClose={() => { setShowForm(false); setEditProduct(null) }} onSaved={onSaved} token={token} />
      )}

      <style>{`
        @keyframes prodRing1 {
          from { transform: rotateX(75deg) rotateZ(0deg); }
          to   { transform: rotateX(75deg) rotateZ(360deg); }
        }
        @keyframes prodRing2 {
          from { transform: rotateX(30deg) rotateY(60deg) rotateZ(0deg); }
          to   { transform: rotateX(30deg) rotateY(60deg) rotateZ(360deg); }
        }
        @keyframes prodBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 28px rgba(99,102,241,0.7), 0 0 56px rgba(99,102,241,0.2); }
          50%       { transform: scale(1.07); box-shadow: 0 0 44px rgba(99,102,241,0.9), 0 0 80px rgba(99,102,241,0.3); }
        }
        @keyframes prodSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
