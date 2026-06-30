'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}/api/admin${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}`, ...opts.headers } })
  return r.json()
}

const SCENE_OPTIONS = [
  { value: 'studio',  label: 'Stüdyo',    icon: '🎬' },
  { value: 'office',  label: 'Ofis',      icon: '🏢' },
  { value: 'home',    label: 'Ev',        icon: '🏠' },
  { value: 'field',   label: 'Saha',      icon: '👔' },
  { value: 'outdoor', label: 'Dış Mekan', icon: '🌳' },
]
const STYLE_OPTIONS = ['professional', 'casual', 'energetic', 'warm', 'executive']
const LANG_OPTIONS = ['tr', 'en', 'de', 'fr', 'ar', 'ru', 'es']

interface StockAvatar {
  id: string
  name: string
  display_name: string
  character_group: string
  gender: string
  age_group: string
  style: string
  languages: string[]
  scene_type: string
  thumbnail_url?: string
  latentsync_video_url?: string
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

export default function AdminAvatarLibraryPage() {
  const [groups, setGroups] = useState<Record<string, StockAvatar[]>>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StockAvatar | null>(null)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [characterGroup, setCharacterGroup] = useState('')
  const [gender, setGender] = useState('female')
  const [style, setStyle] = useState('professional')
  const [sceneType, setSceneType] = useState('studio')
  const [languages, setLanguages] = useState<string[]>(['tr', 'en'])
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [seedVideoUrl, setSeedVideoUrl] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [seedFile, setSeedFile] = useState<File | null>(null)

  const card: React.CSSProperties = { background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18 }

  const load = async () => {
    setLoading(true)
    try {
      const d = await req('/avatar-library')
      setGroups(d.groups || {})
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setEditing(null)
    setName(''); setDisplayName(''); setCharacterGroup('')
    setGender('female'); setStyle('professional'); setSceneType('studio')
    setLanguages(['tr', 'en']); setThumbnailUrl(''); setSeedVideoUrl('')
    setIsFeatured(false); setSeedFile(null)
  }

  function startEdit(avatar: StockAvatar) {
    setEditing(avatar)
    setName(avatar.name); setDisplayName(avatar.display_name); setCharacterGroup(avatar.character_group)
    setGender(avatar.gender); setStyle(avatar.style); setSceneType(avatar.scene_type)
    setLanguages(avatar.languages || ['tr', 'en']); setThumbnailUrl(avatar.thumbnail_url || '')
    setSeedVideoUrl(avatar.latentsync_video_url || ''); setIsFeatured(avatar.is_featured)
    setShowForm(true)
  }

  function startNewScene(characterGroupKey: string, sample: StockAvatar) {
    resetForm()
    setCharacterGroup(characterGroupKey)
    setDisplayName(sample.display_name)
    setGender(sample.gender); setStyle(sample.style); setLanguages(sample.languages || ['tr', 'en'])
    setName(`${sample.name}_${Date.now()}`)
    setShowForm(true)
  }

  async function uploadSeedVideo() {
    if (!seedFile) return
    setUploading(true)
    try {
      const signRes = await req('/avatar-library/upload-url', { method: 'POST', body: JSON.stringify({ filename: seedFile.name }) })
      if (!signRes.uploadUrl) throw new Error('Upload URL alınamadı')
      const upRes = await fetch(signRes.uploadUrl, { method: 'PUT', body: seedFile, headers: { 'Content-Type': seedFile.type } })
      if (!upRes.ok) throw new Error('Video yüklenemedi')
      setSeedVideoUrl(signRes.publicUrl)
      setMsg('✅ Seed video yüklendi')
      setTimeout(() => setMsg(''), 3000)
    } catch (e: any) {
      setMsg('❌ ' + e.message)
    } finally { setUploading(false) }
  }

  async function save() {
    if (!name.trim() || !displayName.trim()) { setMsg('❌ Kod adı ve görünen isim zorunlu'); return }
    try {
      const payload = {
        id: editing?.id,
        name: name.trim(),
        display_name: displayName.trim(),
        character_group: characterGroup.trim() || name.trim(),
        gender, age_group: 'adult', style, languages, scene_type: sceneType,
        thumbnail_url: thumbnailUrl || undefined,
        latentsync_video_url: seedVideoUrl || undefined,
        is_featured: isFeatured, is_active: true,
      }
      const d = await req('/avatar-library/upsert', { method: 'POST', body: JSON.stringify(payload) })
      if (d.ok) {
        setMsg(editing ? '✅ Güncellendi' : '✅ Yeni avatar/sahne eklendi')
        setShowForm(false); resetForm(); load()
      } else setMsg('❌ ' + d.error)
      setTimeout(() => setMsg(''), 4000)
    } catch (e: any) { setMsg('❌ ' + e.message) }
  }

  async function remove(id: string) {
    if (!confirm('Bu avatar/sahneyi silmek istediğinizden emin misiniz?')) return
    await req(`/avatar-library/${id}`, { method: 'DELETE' })
    load()
  }

  const groupEntries = Object.entries(groups)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>🎭 Avatar Kütüphanesi</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Yeni Karakter Ekle
        </button>
      </div>
      <p style={{ color: '#334155', fontSize: 13, margin: '0 0 24px' }}>
        Stok video avatarları yönetin. Her karakter birden fazla sahne (ofis/stüdyo/ev/saha/dış mekan) ile çekilebilir — kullanıcılar ortam seçebilir.
      </p>

      <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 12, color: '#c4b5fd', lineHeight: 1.6 }}>
        💡 <strong>Seed video gereksinimleri:</strong> Kişi kameraya dönük, doğal konuşma (10-30sn), düz/sabit kamera, iyi ışık, min 1080p MP4.
        Pexels veya kendi çekiminiz olabilir (royalty-free). Aynı karakteri farklı ortamlarda çekip <strong>aynı "Kişi Grubu"</strong> ile kaydedin — kullanıcı seçim ekranında sahne olarak görür.
      </div>

      {msg && (
        <div style={{ padding: '11px 16px', borderRadius: 10, marginBottom: 16, background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: msg.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{editing ? `Düzenle: ${editing.display_name}` : 'Yeni Karakter / Sahne'}</h3>
            <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Kod Adı (benzersiz, boşluksuz) *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ayse_ofis"
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Görünen İsim *</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ayşe — Ofis"
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>
              Kişi Grubu <span style={{ color: '#475569' }}>(aynı kişinin farklı sahnelerini birbirine bağlar)</span>
            </label>
            <input value={characterGroup} onChange={e => setCharacterGroup(e.target.value)} placeholder="ayse (boş bırakılırsa kod addan otomatik)"
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            {groupEntries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {groupEntries.map(([g]) => (
                  <button key={g} onClick={() => setCharacterGroup(g)}
                    style={{ fontSize: 10, padding: '4px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, color: '#94a3b8', cursor: 'pointer' }}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>Sahne / Ortam</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {SCENE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSceneType(opt.value)}
                  style={{ padding: '10px 4px', borderRadius: 10, border: sceneType === opt.value ? '1px solid rgba(124,58,237,0.6)' : '1px solid rgba(255,255,255,0.08)', background: sceneType === opt.value ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)', color: sceneType === opt.value ? '#c4b5fd' : '#64748b', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 16 }}>{opt.icon}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, marginTop: 2 }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Cinsiyet</label>
              <select value={gender} onChange={e => setGender(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                <option value="female">Kadın</option><option value="male">Erkek</option><option value="neutral">Nötr</option>
              </select>
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Stil</label>
              <select value={style} onChange={e => setStyle(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>Diller</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LANG_OPTIONS.map(l => (
                <button key={l} onClick={() => setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: languages.includes(l) ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)', background: languages.includes(l) ? 'rgba(124,58,237,0.15)' : 'transparent', color: languages.includes(l) ? '#c4b5fd' : '#64748b', cursor: 'pointer' }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Thumbnail URL (galeri görseli)</label>
            <input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..."
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Seed Video (MuseTalk/LatentSync kaynak)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="file" accept="video/*" onChange={e => setSeedFile(e.target.files?.[0] || null)}
                style={{ flex: 1, fontSize: 12, color: '#94a3b8' }} />
              <button onClick={uploadSeedVideo} disabled={!seedFile || uploading}
                style={{ padding: '8px 16px', background: seedFile ? '#7c3aed' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: seedFile ? 'pointer' : 'not-allowed', opacity: uploading ? 0.5 : 1 }}>
                {uploading ? 'Yükleniyor...' : 'Yükle'}
              </button>
            </div>
            {seedVideoUrl && <p style={{ color: '#34d399', fontSize: 11, marginTop: 6, wordBreak: 'break-all' }}>✓ {seedVideoUrl}</p>}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>★ Önerilen olarak işaretle (galeri başında gösterilir)</span>
          </label>

          <button onClick={save}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {editing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Yükleniyor...</p>
      ) : groupEntries.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Henüz avatar yok</p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {groupEntries.map(([groupKey, avatars]) => (
            <div key={groupKey} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{avatars[0].display_name.split(' — ')[0] || avatars[0].display_name}</span>
                  <span style={{ fontSize: 10, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 20 }}>{avatars.length} sahne</span>
                  {avatars[0].is_featured && <span style={{ fontSize: 10, color: '#fbbf24' }}>★ Önerilen</span>}
                </div>
                <button onClick={() => startNewScene(groupKey, avatars[0])}
                  style={{ fontSize: 11, padding: '5px 12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, color: '#c4b5fd', cursor: 'pointer' }}>
                  + Yeni sahne ekle
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {avatars.map(a => (
                  <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '3/4', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {a.thumbnail_url ? <img src={a.thumbnail_url} alt={a.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🧑‍💼</span>}
                      {!a.latentsync_video_url && (
                        <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, background: 'rgba(239,68,68,0.85)', color: '#fff', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>SEED YOK</span>
                      )}
                    </div>
                    <div style={{ padding: 8 }}>
                      <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {SCENE_OPTIONS.find(s => s.value === a.scene_type)?.icon} {SCENE_OPTIONS.find(s => s.value === a.scene_type)?.label || a.scene_type}
                      </p>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => startEdit(a)} style={{ flex: 1, fontSize: 10, padding: '4px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>Düzenle</button>
                        <button onClick={() => remove(a.id)} style={{ fontSize: 10, padding: '4px 7px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, color: '#f87171', cursor: 'pointer' }}>Sil</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
