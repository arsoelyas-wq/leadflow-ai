'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Search, Play, CheckCircle, RefreshCw, Upload,
  Star, Video, X, ChevronRight, Settings,
  AlertCircle, Zap
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const STYLE_LABELS: Record<string, string> = {
  professional: 'Profesyonel', casual: 'Rahat', energetic: 'Enerjik',
  warm: 'Sıcak', executive: 'Yönetici',
}
const GENDER_LABELS: Record<string, string> = { male: 'Erkek', female: 'Kadın', neutral: 'Nötr' }

// ─── AVATAR CARD ──────────────────────────────────────────────────────────────

function AvatarCard({ avatar, onSelect, onPreview, selected }: any) {
  const isSelected = selected?.id === avatar.id
  const hasSeed    = !!avatar.latentsync_video_url

  return (
    <div
      onClick={() => hasSeed && onSelect(avatar)}
      className={`relative rounded-2xl overflow-hidden border-2 transition-all group
        ${hasSeed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
        ${isSelected ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/10' : 'border-transparent hover:border-slate-600'}`}
    >
      {avatar.thumbnail_url ? (
        <img
          src={avatar.thumbnail_url}
          alt={avatar.display_name}
          className="w-full aspect-[3/4] object-cover object-top group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full aspect-[3/4] bg-slate-800 flex items-center justify-center text-5xl">
          {avatar.gender === 'female' ? '👩‍💼' : avatar.gender === 'male' ? '👨‍💼' : '🧑‍💼'}
        </div>
      )}

      {avatar.is_featured && (
        <div className="absolute top-2 left-2 bg-violet-600/90 backdrop-blur rounded-full px-2 py-0.5 text-[10px] text-white font-bold flex items-center gap-1">
          <Star className="w-2.5 h-2.5 fill-white"/> ÖNERİLEN
        </div>
      )}

      {!hasSeed && (
        <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur rounded-full px-2 py-0.5 text-[10px] text-white font-medium">
          Video Bekleniyor
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 bg-violet-600 rounded-full p-1 shadow-lg">
          <CheckCircle className="w-3.5 h-3.5 text-white"/>
        </div>
      )}

      {hasSeed && (
        <button
          onClick={e => { e.stopPropagation(); onPreview(avatar) }}
          className="absolute bottom-10 inset-x-2 bg-black/70 backdrop-blur rounded-lg py-1.5 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5"/> Önizle
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3">
        <p className="text-white text-sm font-semibold truncate leading-tight">{avatar.display_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-slate-400 text-[11px]">{STYLE_LABELS[avatar.style] || avatar.style}</span>
          <span className="text-slate-600 text-[11px]">·</span>
          <span className="text-slate-400 text-[11px]">{GENDER_LABELS[avatar.gender] || avatar.gender}</span>
        </div>
      </div>
    </div>
  )
}

// ─── PREVIEW MODAL ────────────────────────────────────────────────────────────

function PreviewModal({ avatar, onClose, onSelect }: any) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => { videoRef.current?.play().catch(() => {}) }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="text-white font-semibold">{avatar.display_name}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{STYLE_LABELS[avatar.style]} · LatentSync motoru</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="bg-black">
          {avatar.latentsync_video_url ? (
            <video ref={videoRef} src={avatar.latentsync_video_url} controls loop className="w-full max-h-80 object-contain"/>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Video className="w-8 h-8 mx-auto mb-2 opacity-40"/>
                <p className="text-sm">Seed video henüz yüklenmedi</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {avatar.languages?.map((l: string) => (
              <span key={l} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{l.toUpperCase()}</span>
            ))}
            {avatar.tags?.slice(0, 4).map((t: string) => (
              <span key={t} className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0"/>
            <p className="text-emerald-300 text-xs">HeyGen kredisi gerektirmez · LatentSync · ~$0.09/video</p>
          </div>

          <button
            onClick={() => { onSelect(avatar); onClose() }}
            disabled={!avatar.latentsync_video_url}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            Bu Avatar ile Video Oluştur <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

function AdminPanel({ avatars, onRefresh }: { avatars: any[]; onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState('')
  const [videoUrl, setVideoUrl]     = useState('')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const avatar = avatars.find(a => a.id === selectedId)

  async function handleUpload(file: File) {
    setUploading(true); setMsg('')
    try {
      const r = await fetch(`${API}/api/avatar-library/admin/upload-url`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      const { uploadUrl, publicUrl, error } = await r.json()
      if (error) throw new Error(error)
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      setVideoUrl(publicUrl)
      setMsg(`✓ Yüklendi: ${file.name}`)
    } catch (e: any) { setMsg(`Hata: ${e.message}`) }
    setUploading(false)
  }

  async function saveAvatar() {
    if (!selectedId || !videoUrl) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/avatar-library/admin/upsert`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ id: selectedId, latentsync_video_url: videoUrl }),
      })
      const d = await r.json()
      if (d.ok) { setMsg('✓ Avatar güncellendi!'); onRefresh() }
      else setMsg(`Hata: ${d.error}`)
    } catch (e: any) { setMsg(`Hata: ${e.message}`) }
    setSaving(false)
  }

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-amber-400"/>
        <h3 className="text-white font-semibold">Admin — Seed Video Yönetimi</h3>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 space-y-1.5">
        <p className="font-semibold">Seed video nasıl bulunur?</p>
        <p>LatentSync yüzü seed videodan alır, ElevenLabs sesini ekler → konuşan video üretir.</p>
        <p><strong>Pexels'tan ücretsiz:</strong> <span className="text-blue-400">pexels.com → Videos → "business person talking camera"</span></p>
        <p>İdeal: 15-60 sn, nötr ifade, kameraya bakıyor, iyi ışıklı ortam, MP4</p>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-2">Avatar Seç</label>
        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setVideoUrl('') }}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500">
          <option value="">— Seçin —</option>
          {avatars.map(a => (
            <option key={a.id} value={a.id}>
              {a.display_name} {a.latentsync_video_url ? '✓' : '⚠ video yok'}
            </option>
          ))}
        </select>
      </div>

      {selectedId && (
        <div className="space-y-3">
          {avatar?.latentsync_video_url && (
            <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0"/>
              <p className="text-emerald-300 text-xs truncate">Mevcut video var</p>
              <a href={avatar.latentsync_video_url} target="_blank" rel="noreferrer" className="ml-auto text-blue-400 text-xs hover:underline shrink-0">İzle</a>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-2">Video URL (Pexels CDN, Supabase veya herhangi MP4)</label>
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://videos.pexels.com/video-files/..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="text-center text-slate-500 text-xs">— veya —</div>

          <input ref={fileRef} type="file" accept="video/mp4,video/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}/>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full py-2.5 border-2 border-dashed border-slate-600 hover:border-amber-500/50 rounded-xl text-sm text-slate-400 hover:text-white transition flex items-center justify-center gap-2">
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
            {uploading ? 'Yükleniyor...' : 'MP4 Dosyası Yükle (Supabase Storage)'}
          </button>

          {msg && <p className={`text-xs text-center ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}

          <button onClick={saveAvatar} disabled={!videoUrl || saving}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AvatarLibraryPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [avatars, setAvatars]             = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [filterGender, setFilterGender]   = useState('')
  const [filterStyle, setFilterStyle]     = useState('')
  const [previewAvatar, setPreviewAvatar] = useState<any>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null)
  const [showAdmin, setShowAdmin]         = useState(false)

  useEffect(() => { loadAvatars() }, [])

  async function loadAvatars() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/avatar-library`, { headers: authH() })
      const d = await r.json()
      setAvatars(d.avatars || [])
    } catch {}
    setLoading(false)
  }

  const filtered = avatars.filter(a => {
    if (filterGender && a.gender !== filterGender) return false
    if (filterStyle  && a.style  !== filterStyle)  return false
    if (search) {
      const q = search.toLowerCase()
      return a.display_name.toLowerCase().includes(q) || a.tags?.some((t: string) => t.includes(q))
    }
    return true
  })

  const featured  = filtered.filter(a => a.is_featured)
  const rest      = filtered.filter(a => !a.is_featured)
  const seedCount = avatars.filter(a => a.latentsync_video_url).length

  function goToVideoOutreach() {
    if (!selectedAvatar) return
    router.push(`/video-outreach?stockAvatarId=${selectedAvatar.id}&avatarName=${encodeURIComponent(selectedAvatar.display_name)}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-32 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-violet-600/20 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400"/>
              </div>
              <h1 className="text-2xl font-bold">{t('avatar_library.avatar_kutuphanesi', 'Avatar Kütüphanesi')}</h1>
            </div>
            <p className="text-slate-400">{t('avatar_library.hazir_profesyonel_avatarl', 'Hazır profesyonel avatarlar — HeyGen kredisi gerektirmez')}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                <Zap className="w-4 h-4"/>
                <span>LatentSync motoru · ~$0.09/video</span>
              </div>
              <div className="text-slate-500 text-sm">{seedCount}/{avatars.length} avatar hazır</div>
            </div>
          </div>
          <button onClick={() => setShowAdmin(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${showAdmin ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            <Settings className="w-4 h-4"/> Admin
          </button>
        </div>

        {/* Engine comparison */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'HeyGen', cost: '~$0.80/video', quality: '⭐⭐⭐⭐⭐', note: 'En iyi, pahalı', color: 'bg-blue-500/10 border-blue-500/20 text-blue-300' },
            { name: 'LatentSync (Bizim)', cost: '~$0.09/video', quality: '⭐⭐⭐⭐', note: 'Çok iyi, çok ucuz', color: 'bg-violet-500/10 border-violet-500/20 text-violet-300' },
            { name: 'D-ID', cost: '~$0.12/video', quality: '⭐⭐⭐', note: 'Orta kalite', color: 'bg-slate-700/50 border-slate-600/30 text-slate-400' },
          ].map(e => (
            <div key={e.name} className={`border rounded-xl p-3 ${e.color}`}>
              <p className="text-sm font-semibold">{e.name}</p>
              <p className="text-xs mt-0.5">{e.quality}</p>
              <p className="text-xs mt-1 font-mono">{e.cost}</p>
              <p className="text-[11px] mt-1 opacity-70">{e.note}</p>
            </div>
          ))}
        </div>

        {showAdmin && <AdminPanel avatars={avatars} onRefresh={loadAvatars}/>}

        {seedCount < avatars.length && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-amber-300 text-sm font-medium">{avatars.length - seedCount} avatar için seed video eksik</p>
              <p className="text-amber-400/70 text-xs mt-0.5">{t('avatar_library.admin_panelini_acin_avata', 'Admin panelini açın → avatar seçin → Pexels URL yapıştırın veya dosya yükleyin')}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Avatar ara..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"/>
          </div>
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
            <option value="">{t('avatar_library.tum_cinsiyetler', 'Tüm Cinsiyetler')}</option>
            <option value="female">{t('avatar_library.kadin', 'Kadın')}</option>
            <option value="male">Erkek</option>
            <option value="neutral">{t('avatar_library.notr', 'Nötr')}</option>
          </select>
          <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
            <option value="">{t('avatar_library.tum_stiller', 'Tüm Stiller')}</option>
            <option value="professional">Profesyonel</option>
            <option value="executive">{t('avatar_library.yonetici', 'Yönetici')}</option>
            <option value="warm">{t('avatar_library.sicak', 'Sıcak')}</option>
            <option value="casual">Rahat</option>
            <option value="energetic">Enerjik</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-violet-400"/></div>
        ) : (
          <div className="space-y-8">
            {featured.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-violet-400"/>
                  <h2 className="text-white font-semibold">{t('avatar_library.onerilen_avatarlar', 'Önerilen Avatarlar')}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {featured.map(a => <AvatarCard key={a.id} avatar={a} selected={selectedAvatar} onSelect={setSelectedAvatar} onPreview={setPreviewAvatar}/>)}
                </div>
              </div>
            )}
            {rest.length > 0 && (
              <div>
                <h2 className="text-white font-semibold mb-4">{t('avatar_library.tum_avatarlar', 'Tüm Avatarlar')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {rest.map(a => <AvatarCard key={a.id} avatar={a} selected={selectedAvatar} onSelect={setSelectedAvatar} onPreview={setPreviewAvatar}/>)}
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                <p>{t('avatar_library.avatar_bulunamadi', 'Avatar bulunamadı')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {previewAvatar && <PreviewModal avatar={previewAvatar} onClose={() => setPreviewAvatar(null)} onSelect={setSelectedAvatar}/>}

      {selectedAvatar && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4 z-40">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            {selectedAvatar.thumbnail_url && (
              <img src={selectedAvatar.thumbnail_url} alt="" className="w-12 h-16 rounded-xl object-cover object-top"/>
            )}
            <div className="flex-1">
              <p className="text-white font-semibold">{selectedAvatar.display_name}</p>
              <p className="text-slate-400 text-sm">LatentSync · ~$0.09/video · HeyGen kredisi yok</p>
            </div>
            <button onClick={() => setSelectedAvatar(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">{t('avatar_library.iptal', 'İptal')}</button>
            <button onClick={goToVideoOutreach}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl flex items-center gap-2">
              Bu Avatar ile Video Oluştur <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
