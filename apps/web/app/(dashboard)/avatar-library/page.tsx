'use client'
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Filter, Search, Star, Users, Zap, Briefcase, Heart, ChevronDown, Check, Video } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

interface Avatar {
  id: string
  name: string
  display_name: string
  gender: 'male' | 'female' | 'neutral'
  age_group: 'young' | 'adult' | 'senior'
  style: 'professional' | 'casual' | 'energetic' | 'warm' | 'executive'
  languages: string[]
  thumbnail_url?: string
  preview_video_url?: string
  did_presenter_id?: string
  heygen_avatar_id?: string
  tags: string[]
  is_featured: boolean
}

const STYLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  professional: { label: 'Profesyonel', icon: Briefcase, color: 'text-blue-400 bg-blue-500/10' },
  casual:       { label: 'Rahat',       icon: Users,     color: 'text-green-400 bg-green-500/10' },
  energetic:    { label: 'Enerjik',     icon: Zap,       color: 'text-amber-400 bg-amber-500/10' },
  warm:         { label: 'Sıcak',       icon: Heart,     color: 'text-pink-400 bg-pink-500/10' },
  executive:    { label: 'Yönetici',    icon: Star,      color: 'text-purple-400 bg-purple-500/10' },
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Erkek', female: 'Kadın', neutral: 'Nötr',
}

const LANG_FLAGS: Record<string, string> = {
  tr: '🇹🇷', en: '🇬🇧', de: '🇩🇪', ar: '🇸🇦', fr: '🇫🇷', ru: '🇷🇺', es: '🇪🇸',
}

function AvatarCard({ avatar, selected, onSelect, onPreview, previewing }: {
  avatar: Avatar
  selected: boolean
  onSelect: (a: Avatar) => void
  onPreview: (id: string) => void
  previewing: string | null
}) {
  const [imgError, setImgError] = useState(false)
  const styleConf = STYLE_CONFIG[avatar.style]
  const StyleIcon = styleConf?.icon || Briefcase

  return (
    <div
      onClick={() => onSelect(avatar)}
      className={`relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
        selected
          ? 'border-violet-500 ring-2 ring-violet-500/30'
          : 'border-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden">
        {!imgError && avatar.thumbnail_url ? (
          <img
            src={avatar.thumbnail_url}
            alt={avatar.display_name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="text-5xl">
              {avatar.gender === 'female' ? '👩‍💼' : avatar.gender === 'male' ? '👨‍💼' : '🧑‍💼'}
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

        {/* Featured badge */}
        {avatar.is_featured && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-violet-600/90 backdrop-blur rounded-full px-2 py-0.5">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
            <span className="text-white text-[10px] font-bold">ÖNERILEN</span>
          </div>
        )}

        {/* Selected check */}
        {selected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Preview button */}
        {(avatar.did_presenter_id || avatar.preview_video_url) && (
          <button
            onClick={e => { e.stopPropagation(); onPreview(avatar.id) }}
            className="absolute bottom-2 right-2 w-9 h-9 bg-black/60 backdrop-blur hover:bg-black/80 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          >
            {previewing === avatar.id
              ? <Pause className="w-4 h-4 text-white" />
              : <Play className="w-4 h-4 text-white fill-white" />
            }
          </button>
        )}

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-semibold text-sm leading-tight">{avatar.display_name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${styleConf?.color}`}>
              <StyleIcon className="w-2.5 h-2.5" />
              {styleConf?.label}
            </span>
            <span className="text-slate-400 text-[10px]">{GENDER_LABELS[avatar.gender]}</span>
          </div>
        </div>
      </div>

      {/* Language flags */}
      <div className="px-3 py-2 bg-slate-900 flex items-center gap-1 flex-wrap">
        {avatar.languages.slice(0, 5).map(l => (
          <span key={l} title={l.toUpperCase()} className="text-sm">{LANG_FLAGS[l] || l.toUpperCase()}</span>
        ))}
        {avatar.languages.length > 5 && (
          <span className="text-slate-500 text-[10px]">+{avatar.languages.length - 5}</span>
        )}
      </div>
    </div>
  )
}

// ─── VIDEO PREVIEW MODAL ─────────────────────────────────────────────────────

function PreviewModal({ avatar, onClose }: { avatar: Avatar; onClose: () => void }) {
  const [loading, setLoading] = useState(!avatar.preview_video_url)
  const [videoUrl, setVideoUrl] = useState(avatar.preview_video_url || '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (avatar.preview_video_url) return
    setLoading(true)
    fetch(`${API}/api/avatar-library/${avatar.id}/preview`, { method: 'POST', headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.videoUrl) setVideoUrl(d.videoUrl)
        else setError(d.error || 'Önizleme yüklenemedi')
      })
      .catch(() => setError('Bağlantı hatası'))
      .finally(() => setLoading(false))
  }, [avatar.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">{avatar.display_name}</p>
            <p className="text-slate-400 text-xs">{STYLE_CONFIG[avatar.style]?.label} · {GENDER_LABELS[avatar.gender]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">✕</button>
        </div>

        <div className="aspect-[9/16] bg-black flex items-center justify-center">
          {loading ? (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">Önizleme oluşturuluyor...</p>
              <p className="text-slate-600 text-xs">5-15 saniye</p>
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm px-4 text-center">{error}</p>
          ) : videoUrl ? (
            <video src={videoUrl} autoPlay controls loop className="w-full h-full object-cover" />
          ) : null}
        </div>

        <div className="p-4">
          <p className="text-slate-400 text-xs text-center">
            Diller: {avatar.languages.map(l => LANG_FLAGS[l] || l).join(' ')}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AvatarLibraryPage() {
  const [avatars, setAvatars]   = useState<Avatar[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterStyle, setFilterStyle]   = useState('')
  const [filterLang, setFilterLang]     = useState('')
  const [selected, setSelected] = useState<Avatar | null>(null)
  const [previewing, setPreviewing] = useState<Avatar | null>(null)

  useEffect(() => {
    loadAvatars()
  }, [filterGender, filterStyle, filterLang])

  async function loadAvatars() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterGender) params.append('gender', filterGender)
      if (filterStyle)  params.append('style', filterStyle)
      if (filterLang)   params.append('language', filterLang)
      const r = await fetch(`${API}/api/avatar-library?${params}`, { headers: authH() })
      const d = await r.json()
      setAvatars(d.avatars || [])
    } finally { setLoading(false) }
  }

  const filtered = avatars.filter(a =>
    !search || a.display_name.toLowerCase().includes(search.toLowerCase()) ||
    a.tags.some(t => t.includes(search.toLowerCase()))
  )

  const featured  = filtered.filter(a => a.is_featured)
  const rest      = filtered.filter(a => !a.is_featured)

  return (
    <div className="ml-64 p-8 min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Hazır Avatar Kütüphanesi</h1>
            <p className="text-slate-400 text-sm">Kendi videonuz olmadan profesyonel avatarlarla video oluşturun</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <span className="text-slate-400">{avatars.length} avatar mevcut</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">AI ses sentezi dahil</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">7 dil desteği</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Avatar ara..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Gender filter */}
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Tüm Cinsiyetler</option>
          <option value="female">Kadın</option>
          <option value="male">Erkek</option>
          <option value="neutral">Nötr</option>
        </select>

        {/* Style filter */}
        <select
          value={filterStyle}
          onChange={e => setFilterStyle(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Tüm Stiller</option>
          {Object.entries(STYLE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Language filter */}
        <select
          value={filterLang}
          onChange={e => setFilterLang(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Tüm Diller</option>
          {Object.entries(LANG_FLAGS).map(([code, flag]) => (
            <option key={code} value={code}>{flag} {code.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-900 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Avatar bulunamadı</p>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-violet-400" />Önerilen Avatarlar
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {featured.map(a => (
                  <AvatarCard
                    key={a.id}
                    avatar={a}
                    selected={selected?.id === a.id}
                    onSelect={setSelected}
                    onPreview={id => setPreviewing(avatars.find(av => av.id === id) || null)}
                    previewing={previewing?.id || null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div>
              {featured.length > 0 && (
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Tüm Avatarlar
                </h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {rest.map(a => (
                  <AvatarCard
                    key={a.id}
                    avatar={a}
                    selected={selected?.id === a.id}
                    onSelect={setSelected}
                    onPreview={id => setPreviewing(avatars.find(av => av.id === id) || null)}
                    previewing={previewing?.id || null}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sticky selected bar */}
      {selected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-slate-900 border border-violet-500/50 rounded-2xl px-6 py-4 shadow-2xl shadow-violet-500/10">
          <div className="flex items-center gap-3">
            {selected.thumbnail_url ? (
              <img src={selected.thumbnail_url} alt="" className="w-10 h-10 rounded-xl object-cover object-top" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
                {selected.gender === 'female' ? '👩‍💼' : '👨‍💼'}
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm">{selected.display_name} seçildi</p>
              <p className="text-slate-400 text-xs">{STYLE_CONFIG[selected.style]?.label}</p>
            </div>
          </div>
          <a
            href={`/video-outreach?avatarId=${selected.id}&avatarSource=stock`}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold transition-colors"
          >
            Bu Avatar ile Video Oluştur →
          </a>
          <button
            onClick={() => setSelected(null)}
            className="text-slate-500 hover:text-slate-300 text-sm"
          >
            İptal
          </button>
        </div>
      )}

      {/* Preview modal */}
      {previewing && (
        <PreviewModal avatar={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  )
}
