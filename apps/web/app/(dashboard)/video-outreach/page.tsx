'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Video, Play, Square, RefreshCw, Send, CheckCircle,
  AlertTriangle, Zap, Search, ChevronLeft, ChevronRight,
  Mic, Volume2, ArrowRight, ArrowLeft, Users, Globe2,
  BarChart2, Clock, Eye, RotateCcw, CreditCard, TrendingUp, Star, Timer
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const MAX_CAMPAIGN = 20

const LANG_MAP: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'İngilizce', flag: '🇬🇧' },
  de: { name: 'Almanca', flag: '🇩🇪' },
  fr: { name: 'Fransızca', flag: '🇫🇷' },
  ar: { name: 'Arapça', flag: '🇸🇦' },
  ru: { name: 'Rusça', flag: '🇷🇺' },
  it: { name: 'İtalyanca', flag: '🇮🇹' },
  es: { name: 'İspanyolca', flag: '🇪🇸' },
  nl: { name: 'Hollandaca', flag: '🇳🇱' },
}

let globalAudio: HTMLAudioElement | null = null

const STEPS = [
  { id: 1, label: 'Avatar', icon: '🎭' },
  { id: 2, label: 'Ses', icon: '🎤' },
  { id: 3, label: 'Lead', icon: '👤' },
  { id: 4, label: 'Script', icon: '✍️' },
  { id: 5, label: 'Önizleme', icon: '👁' },
  { id: 6, label: 'Gönder', icon: '🚀' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${current === step.id ? 'bg-purple-600 text-white' : current > step.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            <span className="text-base">{current > step.id ? '✓' : step.icon}</span>
            <span className="text-xs font-medium hidden sm:block">{step.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${current > step.id ? 'bg-emerald-500' : 'bg-slate-700'}`}/>
          )}
        </div>
      ))}
    </div>
  )
}

const STYLE_LABELS: Record<string, string> = {
  professional: 'Profesyonel', casual: 'Rahat', energetic: 'Enerjik', warm: 'Sıcak', executive: 'Yönetici',
}
const LANG_FLAGS_VO: Record<string, string> = {
  tr: '🇹🇷', en: '🇬🇧', de: '🇩🇪', ar: '🇸🇦', fr: '🇫🇷', ru: '🇷🇺', es: '🇪🇸',
}

// ADIM 1: Avatar Seç
function StepAvatar({ selected, onSelect }: any) {
  const [tab, setTab] = useState<'library' | 'heygen'>('library')

  // Stock library state
  const [stockAvatars, setStockAvatars] = useState<any[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockFilter, setStockFilter] = useState('')

  // HeyGen state
  const [avatars, setAvatars] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)

  useEffect(() => { if (tab === 'library') loadStock(); else load() }, [tab])
  useEffect(() => { if (tab === 'heygen') load() }, [page, filterGender])

  async function loadStock() {
    setStockLoading(true)
    try {
      const r = await fetch(`${API}/api/avatar-library`, { headers: authH() })
      const d = await r.json()
      setStockAvatars(d.avatars || [])
    } catch {}
    setStockLoading(false)
  }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), gender: filterGender })
      if (search) params.set('search', search)
      const r = await fetch(`${API}/api/video-outreach/avatars?${params}`, { headers: authH() })
      const d = await r.json()
      setAvatars(d.avatars || [])
      setTotalPages(d.pages || 1)
      setTotal(d.total || 0)
    } catch {}
    setLoading(false)
  }

  const filteredStock = stockAvatars.filter(a =>
    !stockFilter || a.display_name.toLowerCase().includes(stockFilter.toLowerCase()) ||
    a.style.includes(stockFilter) || a.gender.includes(stockFilter)
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Avatar Seç</h2>
        <p className="text-slate-400 text-sm">Videonuzda görünecek avatar karakteri seçin.</p>
      </div>

      {selected && (
        <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-purple-400 shrink-0"/>
          <span className="text-purple-300 text-sm font-medium">Seçili: {selected.display_name || selected.name}</span>
          {selected._source === 'stock' && <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">Hazır Avatar</span>}
          <button onClick={() => onSelect(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">Değiştir</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-fit">
        <button
          onClick={() => setTab('library')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'library' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          ✨ Hazır Kütüphane
          <span className="text-[10px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-bold">YENİ</span>
        </button>
        <button
          onClick={() => setTab('heygen')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'heygen' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          HeyGen ({total || '1281'}+)
        </button>
      </div>

      {/* ── STOCK LIBRARY TAB ── */}
      {tab === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-emerald-400 text-sm">✓</span>
            <p className="text-emerald-300 text-xs">Hazır avatarlar <strong>HeyGen kredisi gerektirmez</strong> — D-ID motoru ile çalışır (~₺2/video)</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
            <input
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              placeholder="Avatar ara..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          {stockLoading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-violet-400"/></div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredStock.map((avatar: any) => {
                const isSelected = selected?._source === 'stock' && selected?.id === avatar.id
                return (
                  <div
                    key={avatar.id}
                    onClick={() => onSelect({ ...avatar, _source: 'stock' })}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group ${isSelected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-transparent hover:border-slate-600'}`}
                  >
                    {avatar.thumbnail_url ? (
                      <img src={avatar.thumbnail_url} alt={avatar.display_name} className="w-full aspect-[3/4] object-cover object-top group-hover:scale-105 transition-transform duration-300"/>
                    ) : (
                      <div className="w-full aspect-[3/4] bg-slate-800 flex items-center justify-center text-4xl">
                        {avatar.gender === 'female' ? '👩‍💼' : avatar.gender === 'male' ? '👨‍💼' : '🧑‍💼'}
                      </div>
                    )}
                    {avatar.is_featured && (
                      <div className="absolute top-2 left-2 bg-violet-600/90 rounded-full px-1.5 py-0.5 text-[9px] text-white font-bold">★ ÖNERILEN</div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-violet-600 rounded-full p-1">
                        <CheckCircle className="w-3 h-3 text-white"/>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="text-white text-xs font-medium truncate">{avatar.display_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-slate-400 text-[10px]">{STYLE_LABELS[avatar.style]}</span>
                        <span className="text-slate-600 text-[10px]">·</span>
                        <span className="text-[10px]">{avatar.languages?.slice(0, 3).map((l: string) => LANG_FLAGS_VO[l] || l).join(' ')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {filteredStock.length === 0 && !stockLoading && (
            <p className="text-center text-slate-500 text-sm py-8">Avatar bulunamadı</p>
          )}
        </div>
      )}

      {/* ── HEYGEN TAB ── */}
      {tab === 'heygen' && (
      <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Avatar ara... (Enter ile ara)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"/>
        </div>
        <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tümü</option>
          <option value="male">Erkek</option>
          <option value="female">Kadın</option>
        </select>
        <button onClick={() => { setPage(1); load() }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium">Ara</button>
      </div>

      {previewVideo && (
        <div className="relative rounded-2xl overflow-hidden bg-black max-h-48 flex items-center justify-center">
          <video src={previewVideo} autoPlay loop muted className="max-h-48 rounded-2xl"/>
          <button onClick={() => setPreviewVideo(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-lg px-2 py-1 text-xs">Kapat</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-purple-400"/></div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {avatars.map((avatar: any) => (
            <div key={avatar.avatar_id}
              onClick={() => onSelect({ ...avatar, _source: 'heygen' })}
              className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group ${selected?.avatar_id === avatar.avatar_id ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-transparent hover:border-slate-600'}`}>
              {avatar.preview_image ? (
                <img src={avatar.preview_image} alt={avatar.name} className="w-full aspect-[3/4] object-cover"/>
              ) : (
                <div className="w-full aspect-[3/4] bg-slate-700 flex items-center justify-center text-5xl">
                  {avatar.gender === 'female' ? '👩' : '👨'}
                </div>
              )}
              {selected?.avatar_id === avatar.avatar_id && (
                <div className="absolute top-2 right-2 bg-purple-500 rounded-full p-1">
                  <CheckCircle className="w-3 h-3 text-white"/>
                </div>
              )}
              {avatar.preview_video && (
                <button onClick={e => { e.stopPropagation(); setPreviewVideo(avatar.preview_video) }}
                  className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-1 text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                  <Play className="w-3 h-3"/> İzle
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate leading-tight">{avatar.name}</p>
                {avatar.gender && <p className="text-slate-400 text-xs">{avatar.gender === 'female' ? 'Kadın' : 'Erkek'}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl text-sm text-white disabled:opacity-30">
          <ChevronLeft className="w-4 h-4"/> Önceki
        </button>
        <span className="text-slate-500 text-sm">Sayfa {page} / {totalPages} · {total} avatar</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl text-sm text-white disabled:opacity-30">
          Sonraki <ChevronRight className="w-4 h-4"/>
        </button>
      </div>
      </div>
      )}
    </div>
  )
}

// ADIM 2: Ses Seç
function StepVoice({ selected, onSelect }: any) {
  const [voices, setVoices] = useState<any[]>([])
  const [myVoices, setMyVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [voiceLang, setVoiceLang] = useState('tr')
  const [search, setSearch] = useState('')

  useEffect(() => { load(voiceLang) }, [voiceLang])

  async function load(lang: string) {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/eleven-voices?language=${lang}`, { headers: authH() })
      const d = await r.json()
      setVoices(d.language || [])
      setMyVoices(d.my || [])
    } catch {}
    setLoading(false)
  }

  function play(voiceId: string, previewUrl?: string) {
    if (playing === voiceId) { globalAudio?.pause(); globalAudio = null; setPlaying(null); return }
    if (globalAudio) { globalAudio.pause(); globalAudio = null }
    if (!previewUrl) return
    setPlaying(voiceId)
    const audio = new Audio(previewUrl)
    globalAudio = audio
    audio.onended = () => { setPlaying(null); globalAudio = null }
    audio.onerror = () => { setPlaying(null); globalAudio = null }
    audio.play().catch(() => { setPlaying(null); globalAudio = null })
  }

  const filtered = voices.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">ElevenLabs Sesi Seç</h2>
        <p className="text-slate-400 text-sm">Videonuzda kullanılacak sesi seçin. Her ses dinlenebilir.</p>
      </div>

      {selected && (
        <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0"/>
          <span className="text-teal-300 text-sm font-medium">Seçili: {selected.name}</span>
          <button onClick={() => onSelect(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">Değiştir</button>
        </div>
      )}

      {myVoices.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium">SESLERİM</p>
          <div className="flex gap-2 flex-wrap">
            {myVoices.slice(0, 6).map((v: any) => (
              <button key={v.voice_id} onClick={() => onSelect(v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${selected?.voice_id === v.voice_id ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                🎤 {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium">DİLE GÖRE SES ARA</p>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(LANG_MAP).map(([code, lang]) => (
            <button key={code} onClick={() => setVoiceLang(code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${voiceLang === code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ses ara..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-teal-400"/></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((voice: any) => (
            <div key={voice.voice_id} onClick={() => onSelect(voice)}
              className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selected?.voice_id === voice.voice_id ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {voice.gender === 'female' ? '👩' : '👨'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{voice.name}</p>
                <p className="text-slate-500 text-xs">{voice.gender === 'female' ? 'Kadın' : 'Erkek'} {voice.accent && `· ${voice.accent}`}</p>
              </div>
              {selected?.voice_id === voice.voice_id && <CheckCircle className="w-4 h-4 text-teal-400 shrink-0"/>}
              <button onClick={e => { e.stopPropagation(); play(voice.voice_id, voice.preview_url) }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 ${playing === voice.voice_id ? 'bg-red-500 opacity-100' : 'bg-slate-700 hover:bg-teal-600 opacity-0 group-hover:opacity-100'}`}>
                {playing === voice.voice_id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ADIM 3: Lead Seç
function StepLead({ selected, onSelect, leads, language, onLanguageChange, aspectRatio, onAspectChange, autoSend, onAutoSendChange, duplicates }: any) {
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const leadsWithPhone = leads.filter((l: any) => l.phone)
  const countries = [...new Set(leadsWithPhone.map((l: any) => l.country).filter(Boolean))]
  const filtered = leadsWithPhone.filter((l: any) => {
    if (filterCountry && l.country !== filterCountry) return false
    if (search && !l.company_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const overLimit = selected.length > MAX_CAMPAIGN
  const duplicateIds = new Set((duplicates || []).map((d: any) => d.lead_id))
  const duplicatesInSelected = selected.filter((l: any) => duplicateIds.has(l.id))

  function toggleLead(lead: any) {
    const isSelected = selected.some((l: any) => l.id === lead.id)
    if (isSelected) {
      onSelect(selected.filter((l: any) => l.id !== lead.id))
    } else {
      onSelect([...selected, lead])
    }
  }

  function selectAll() { onSelect(filtered.slice(0, MAX_CAMPAIGN)) }
  function clearAll() { onSelect([]) }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Lead ve Ayarlar</h2>
        <p className="text-slate-400 text-sm">Video gönderilecek leadleri seçin. Her birine ayrı kişisel video oluşturulur.</p>
      </div>

      {selected.length > 0 && (
        <div className={`flex items-center gap-3 p-3 border rounded-xl ${overLimit ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
          {overLimit ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0"/> : <CheckCircle className="w-4 h-4 text-blue-400 shrink-0"/>}
          <div className="flex-1">
            <p className={`text-sm font-medium ${overLimit ? 'text-amber-300' : 'text-blue-300'}`}>
              {selected.length} lead seçildi {overLimit && `— maksimum ${MAX_CAMPAIGN}, ilk ${MAX_CAMPAIGN} kullanılacak`}
            </p>
            <p className="text-blue-400/60 text-xs">{selected.map((l: any) => l.company_name).slice(0,3).join(', ')}{selected.length > 3 ? ` +${selected.length-3} daha` : ''}</p>
          </div>
          <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-400">Temizle</button>
        </div>
      )}

      {duplicatesInSelected.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-orange-300 text-sm font-medium">Daha önce video gönderilmiş leadler var</p>
            <p className="text-orange-400/70 text-xs mt-0.5">{duplicatesInSelected.map((l: any) => l.company_name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Kredi tahmini */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl">
          <CreditCard className="w-4 h-4 text-slate-400"/>
          <span className="text-slate-400 text-xs">Tahmini kullanım: <span className="text-white font-medium">{Math.min(selected.length, MAX_CAMPAIGN)} HeyGen kredisi</span></span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lead listesi */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">LEAD SEÇ ({selected.length}/{filtered.length})</p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-teal-400 hover:text-teal-300">Tümünü Seç (max {MAX_CAMPAIGN})</button>
              <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-300">Temizle</button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Lead ara..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-sm text-white focus:outline-none"/>
            </div>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none">
              <option value="">Tüm Ülkeler</option>
              {countries.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {filtered.map((l: any) => {
              const isSelected = selected.some((s: any) => s.id === l.id)
              const isDuplicate = duplicateIds.has(l.id)
              return (
                <div key={l.id} onClick={() => toggleLead(l)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                    {isSelected && <CheckCircle className="w-3 h-3 text-white"/>}
                  </div>
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center text-xs flex-shrink-0">
                    {l.company_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-sm truncate">{l.company_name}</p>
                      {isDuplicate && <span className="text-xs text-orange-400 shrink-0">• daha önce gönderildi</span>}
                    </div>
                    <p className="text-slate-500 text-xs">{l.phone} {l.country && `· ${l.country}`}</p>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="text-slate-600 text-sm text-center py-4">Lead bulunamadı</p>}
          </div>
        </div>

        {/* Ayarlar */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">VİDEO FORMATI</p>
            <div className="grid grid-cols-3 gap-2">
              {[['9:16','📱 Dikey'],['16:9','🖥 Yatay'],['1:1','⬜ Kare']].map(([r,l]) => (
                <button key={r} onClick={() => onAspectChange(r)}
                  className={`py-2.5 rounded-xl border text-xs transition ${aspectRatio === r ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">SCRIPT DİLİ</p>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(LANG_MAP).map(([code, lang]) => (
                <button key={code} onClick={() => onLanguageChange(code)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs transition ${language === code ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl">
            <div>
              <p className="text-white text-sm font-medium">Otomatik Gönder</p>
              <p className="text-slate-500 text-xs">Video hazır olunca WhatsApp'a gönder</p>
            </div>
            <button onClick={() => onAutoSendChange(!autoSend)}
              className={`relative w-11 h-6 rounded-full transition-all ${autoSend ? 'bg-teal-600' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSend ? 'left-6' : 'left-1'}`}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ADIM 4: Script Önizleme
function StepScript({ leads, avatar, voice, language, scripts, onScriptsChange }: any) {
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  async function generateScripts() {
    if (!leads?.length || !avatar || !voice) return
    setLoading(true)
    try {
      const results: any[] = []
      for (const lead of leads.slice(0, 5)) {
        const r = await fetch(`${API}/api/video-outreach/preview-script`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({ leadId: lead.id, language, avatarName: avatar.name }),
        })
        const d = await r.json()
        const script = d.script || ''
        if (!script && d.error) {
          console.error('[Script preview] API error:', d.error)
        }
        results.push({
          leadId: lead.id,
          leadName: lead.company_name,
          script,
          edited: false,
          quality: d.quality,
          researchError: d.researchError,
        })
      }
      onScriptsChange(results)
      setGenerated(true)
    } catch (err: any) {
      console.error('[Script preview] Network error:', err.message)
    }
    setLoading(false)
  }

  function updateScript(idx: number, newScript: string) {
    const updated = [...scripts]
    updated[idx] = { ...updated[idx], script: newScript, edited: true }
    onScriptsChange(updated)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Script Önizleme</h2>
        <p className="text-slate-400 text-sm">Claude her lead için kişisel script yazacak. Görmek ve düzenlemek ister misiniz?</p>
      </div>

      {!generated ? (
        <div className="space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-700 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-xl shrink-0">✍️</div>
              <div>
                <p className="text-white font-medium">Claude scriptleri otomatik yazar</p>
                <p className="text-slate-400 text-sm mt-1">Her lead için sektöre, ülkeye ve şirket bilgisine göre özel script üretilir. İsterseniz gözden geçirip düzenleyebilirsiniz.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: '🎯', title: 'Kişisel', desc: 'Her lead için farklı' },
                { icon: '🌍', title: 'Çok Dilli', desc: 'Ülkeye göre dil' },
                { icon: '⏱', title: '30 Saniye', desc: 'Optimal uzunluk' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-3 bg-slate-800 rounded-xl text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="text-white text-xs font-medium">{title}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={generateScripts} disabled={loading}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin"/> Scriptler yazılıyor...</> : <>✍️ Scriptleri Önizle ve Düzenle</>}
            </button>
            <button onClick={() => { onScriptsChange([]); setGenerated(true) }}
              className="px-5 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-700">
              Atla →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.length === 0 ? (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-center">
              <p className="text-slate-400 text-sm">Script önizleme atlandı. Claude otomatik yazacak.</p>
            </div>
          ) : (
            scripts.map((s: any, idx: number) => (
              <div key={s.leadId} className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-700 rounded-lg flex items-center justify-center text-xs">{s.leadName?.[0]}</div>
                    <span className="text-white text-sm font-medium">{s.leadName}</span>
                    {s.edited && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">Düzenlendi</span>}
                  </div>
                  <button onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                    className="text-xs text-teal-400 hover:text-teal-300">
                    {editingIdx === idx ? 'Kapat' : 'Düzenle'}
                  </button>
                </div>
                {editingIdx === idx ? (
                  <textarea value={s.script} onChange={e => updateScript(idx, e.target.value)}
                    rows={4}
                    className="w-full bg-slate-900 px-4 py-3 text-white text-sm resize-none focus:outline-none border-0"/>
                ) : (
                  <p className="px-4 py-3 text-slate-300 text-sm leading-relaxed">{s.script}</p>
                )}
                <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-600">{s.script?.split(' ').filter(Boolean).length || 0} kelime · ~{Math.round((s.script?.split(' ').filter(Boolean).length || 0) / 2.5)} saniye</span>
                  {s.quality === 'web_search' && <span className="text-xs text-emerald-500">🌐 Web araştırması</span>}
                  {s.quality === 'website'    && <span className="text-xs text-blue-400">🔗 Web sitesi</span>}
                  {s.quality === 'sector'     && <span className="text-xs text-amber-400">📊 Sektör bazlı</span>}
                  {s.quality === 'fallback'   && <span className="text-xs text-orange-400">⚠️ Araştırma yapılamadı</span>}
                  {s.researchError            && <span className="text-xs text-red-400" title={s.researchError}>⚠️ Araştırma hatası</span>}
                </div>
              </div>
            ))
          )}
          <button onClick={() => { setGenerated(false); setLoading(false) }}
            className="text-xs text-slate-500 hover:text-slate-300">Yeniden üret</button>
        </div>
      )}
    </div>
  )
}

// ADIM 5: Önizleme
function StepPreview({ avatar, voice, leads, scripts, language, aspectRatio, autoSend }: any) {
  const effectiveCount = Math.min(leads?.length || 0, MAX_CAMPAIGN)
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Önizleme</h2>
        <p className="text-slate-400 text-sm">Seçimlerinizi kontrol edin ve video oluşturun.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avatar önizleme */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          {avatar?.preview_image ? (
            <img src={avatar.preview_image} alt={avatar.name} className="w-full aspect-video object-cover"/>
          ) : (
            <div className="w-full aspect-video bg-slate-900 flex items-center justify-center text-6xl">🎭</div>
          )}
          <div className="p-3">
            <p className="text-white text-sm font-medium">{avatar?.name || 'Avatar seçilmedi'}</p>
            <p className="text-slate-500 text-xs">{avatar?.gender === 'female' ? 'Kadın' : 'Erkek'} avatar</p>
          </div>
        </div>

        {/* Özet */}
        <div className="space-y-3">
          {[
            { label: 'Avatar', value: avatar?.name, icon: '🎭', ok: !!avatar },
            { label: 'Ses', value: voice?.name, icon: '🎤', ok: !!voice },
            { label: leads?.length === 1 ? 'Lead' : 'Leadler', value: leads?.length === 1 ? leads[0]?.company_name : `${leads?.length} lead seçildi${leads?.length > MAX_CAMPAIGN ? ` (${MAX_CAMPAIGN} kullanılacak)` : ''}`, icon: '👤', ok: leads?.length > 0 },
            { label: 'Script', value: scripts?.length > 0 ? `${scripts.length} script hazır (${scripts.filter((s:any)=>s.edited).length} düzenlendi)` : 'Otomatik yazılacak', icon: '✍️', ok: true },
            { label: 'Dil', value: `${LANG_MAP[language]?.flag} ${LANG_MAP[language]?.name}`, icon: '🌍', ok: true },
            { label: 'Format', value: aspectRatio, icon: '📐', ok: true },
            { label: 'Otomatik Gönder', value: autoSend ? 'Evet — WhatsApp' : 'Hayır', icon: '📤', ok: true },
          ].map(({ label, value, icon, ok }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${ok && value ? 'bg-slate-800 border-slate-700' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-xl shrink-0">{icon}</span>
              <div className="flex-1">
                <p className="text-slate-500 text-xs">{label}</p>
                <p className={`text-sm font-medium ${ok && value ? 'text-white' : 'text-red-400'}`}>{value || 'Seçilmedi!'}</p>
              </div>
              {ok && value ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0"/> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0"/>}
            </div>
          ))}
        </div>
      </div>

      {/* Maliyet tahmini */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
        <CreditCard className="w-5 h-5 text-purple-400 shrink-0"/>
        <div>
          <p className="text-purple-300 text-sm font-medium">{effectiveCount} × ~1 HeyGen kredisi = ~{effectiveCount} kredi</p>
          <p className="text-purple-400/60 text-xs">ElevenLabs karakter sayısı da kullanılacak</p>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-amber-300 text-sm font-medium mb-1">Video Oluşturma Süreci</p>
        <div className="space-y-1 text-xs text-amber-400/70">
          <p>1. Claude sizin için kişisel script yazacak</p>
          <p>2. ElevenLabs seçtiğiniz sesle seslendirme yapacak</p>
          <p>3. HeyGen seçtiğiniz avatarla video oluşturacak</p>
          <p>4. {autoSend ? 'Video hazır olunca otomatik WhatsApp mesajı gönderilecek' : 'Video hazır olunca Videolar sekmesinden gönderebilirsiniz'}</p>
        </div>
      </div>
    </div>
  )
}

const STATUS_MESSAGES: Record<string, { label: string; desc: string; color: string }> = {
  researching: { label: 'Araştırılıyor', desc: 'Web sitesi, sosyal medya ve müşteri yorumları analiz ediliyor...', color: 'text-amber-400' },
  generating:  { label: 'Script Yazılıyor', desc: 'Claude PAS çerçevesinde kişisel script yazıyor...', color: 'text-blue-400' },
  processing:  { label: 'Video Oluşturuluyor', desc: 'AI video motoru render ediyor...', color: 'text-purple-400' },
}

// ADIM 6: Sonuç — single video
function StepResultSingle({ videoId, onReset }: { videoId: string; onReset: () => void }) {
  const [status, setStatus] = useState('researching')
  const [videoUrl, setVideoUrl] = useState('')
  const [research, setResearch] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [checking, setChecking] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    checkStatus()
    const interval = setInterval(() => {
      setStatus(s => {
        if (s === 'completed' || s === 'failed') return s
        checkStatus()
        return s
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [videoId])

  async function checkStatus() {
    if (!videoId) return
    setChecking(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/status/${videoId}`, { headers: authH() })
      const d = await r.json()
      if (d.status) setStatus(d.status)
      if (d.video_url) setVideoUrl(d.video_url)
      if (d.research_data) setResearch(d.research_data)
      if (d.error_message) setErrorMsg(d.error_message)
    } catch {}
    setChecking(false)
  }

  async function retryVideo() {
    setRetrying(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/retry/${videoId}`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.ok) { setStatus('researching'); setErrorMsg('') }
    } catch {}
    setRetrying(false)
  }

  const statusInfo = STATUS_MESSAGES[status]

  return (
    <div className="space-y-5 text-center">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Video Hazırlanıyor</h2>
        <p className="text-slate-400 text-sm">Her aşama tamamlandıkça güncelleniyor.</p>
      </div>

      {/* Phase progress */}
      <div className="flex items-center justify-center gap-2">
        {['researching', 'generating', 'processing'].map((s, i) => {
          const phases = ['researching', 'generating', 'processing', 'completed']
          const currentIdx = phases.indexOf(status)
          const stepIdx = i
          const done = currentIdx > stepIdx
          const active = currentIdx === stepIdx
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                {done ? '✓' : active ? <RefreshCw className="w-3 h-3 animate-spin inline"/> : '○'}
                <span className="ml-1">{STATUS_MESSAGES[s]?.label}</span>
              </div>
              {i < 2 && <div className={`w-4 h-0.5 ${done ? 'bg-emerald-500' : 'bg-slate-700'}`}/>}
            </div>
          )
        })}
      </div>

      {(status === 'researching' || status === 'generating' || status === 'processing') ? (
        <div className="py-8 space-y-4">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin"/>
          </div>
          <p className={`font-medium ${statusInfo?.color || 'text-slate-400'}`}>{statusInfo?.desc}</p>

          {/* Show research findings when available */}
          {research && research.pains?.length > 0 && (
            <div className="max-w-sm mx-auto p-4 bg-slate-900 border border-slate-700 rounded-2xl text-left space-y-2">
              <p className="text-xs text-slate-500 font-medium">ARAŞTIRMA SONUÇLARI</p>
              <p className="text-white text-sm font-medium">{research.brandName}</p>
              {research.pains.slice(0,3).map((pain: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-orange-400 text-xs mt-0.5">●</span>
                  <p className="text-slate-400 text-xs">{pain}</p>
                </div>
              ))}
              {research.hookLine && (
                <div className="pt-1 border-t border-slate-800">
                  <p className="text-xs text-slate-500">Hook:</p>
                  <p className="text-purple-300 text-xs italic">"{research.hookLine}"</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
          </div>
        </div>
      ) : status === 'completed' && videoUrl ? (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400"/>
          </div>
          <p className="text-emerald-400 font-medium">Video hazır!</p>
          <a href={videoUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium">
            <Play className="w-4 h-4"/> Videoyu İzle
          </a>
        </div>
      ) : status === 'failed' ? (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-400"/>
          </div>
          <p className="text-red-400 font-medium">Video oluşturulamadı</p>
          {errorMsg && (
            <div className="max-w-sm mx-auto px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-300 text-xs">{errorMsg}</p>
            </div>
          )}
          {(errorMsg?.toLowerCase().includes('heygen') || errorMsg?.toLowerCase().includes('kredi') || errorMsg?.toLowerCase().includes('credit')) && (
            <div className="max-w-sm mx-auto p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left space-y-2">
              <p className="text-amber-300 text-sm font-semibold">HeyGen kredisi bitti</p>
              <p className="text-amber-400/80 text-xs">Kendi AI replikasını oluşturarak HeyGen'e gerek kalmadan video üretebilirsin.</p>
              <a href="/replica" className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-xs font-medium transition-colors">
                AI Replika Oluştur →
              </a>
            </div>
          )}
          <button onClick={retryVideo} disabled={retrying}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`}/>
            {retrying ? 'Yeniden deneniyor...' : 'Yeniden Dene'}
          </button>
        </div>
      ) : null}

      <div className="flex justify-center gap-3 pt-4">
        <button onClick={checkStatus} disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}/> Durumu Kontrol Et
        </button>
        <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm">
          Yeni Video Oluştur
        </button>
      </div>
    </div>
  )
}

// ADIM 6: Kampanya ilerleme
function StepResultCampaign({ campaignId, onReset }: { campaignId: string; onReset: () => void }) {
  const [data, setData] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [campaignId])

  async function load() {
    if (!campaignId) return
    setChecking(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/campaign/${campaignId}`, { headers: authH() })
      const d = await r.json()
      setData(d)
    } catch {}
    setChecking(false)
  }

  const progress = data?.progress
  const campaign = data?.campaign
  const videos: any[] = data?.videos || []
  const isDone = campaign?.status === 'completed'

  function videoStatusLabel(status: string) {
    if (status === 'completed') return { label: 'Hazır', cls: 'bg-emerald-500/15 text-emerald-400' }
    if (status === 'researching') return { label: 'Araştırılıyor', cls: 'bg-amber-500/15 text-amber-400' }
    if (status === 'generating') return { label: 'Script', cls: 'bg-blue-500/15 text-blue-400' }
    if (status === 'processing') return { label: 'Video', cls: 'bg-purple-500/15 text-purple-400' }
    return { label: 'Başarısız', cls: 'bg-red-500/15 text-red-400' }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">
          {isDone ? 'Kampanya Tamamlandı ✓' : 'Kampanya Oluşturuluyor...'}
        </h2>
        <p className="text-slate-400 text-sm">{campaign?.name || 'Video kampanyası'}</p>
      </div>

      {progress && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-400">İlerleme</span>
            <span className="text-white font-medium">{progress.completed} / {progress.total} tamamlandı</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}/>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Toplam', value: progress.total, color: 'text-white' },
              { label: 'Tamamlandı', value: progress.completed, color: 'text-emerald-400' },
              { label: 'İşleniyor', value: progress.processing, color: 'text-blue-400' },
              { label: 'Başarısız', value: progress.failed, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video listesi */}
      {videos.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {videos.map((v: any) => {
            const { label, cls } = videoStatusLabel(v.status)
            const isLoading = ['researching', 'generating', 'processing'].includes(v.status)
            const research = v.research_data
            return (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                <div className="w-10 h-8 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover"/> :
                    <div className="w-full h-full flex items-center justify-center">
                      {isLoading ? <RefreshCw className="w-3 h-3 animate-spin text-slate-500"/> : <Video className="w-3 h-3 text-slate-600"/>}
                    </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{research?.brandName || v.leads?.company_name}</p>
                  {research?.pains?.[0] && (
                    <p className="text-orange-400/70 text-xs truncate">● {research.pains[0]}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cls}`}>{label}</span>
                {v.video_url && (
                  <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 bg-slate-700 hover:bg-purple-600 rounded-lg transition shrink-0">
                    <Play className="w-3 h-3 text-white"/>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <button onClick={load} disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}/> Yenile
        </button>
        <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm">
          Yeni Kampanya
        </button>
      </div>
    </div>
  )
}

export default function VideoOutreachPage() {
  const [step, setStep] = useState(1)
  const [leads, setLeads] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [createdVideoId, setCreatedVideoId] = useState('')
  const [createdCampaignId, setCreatedCampaignId] = useState('')
  const [isCampaign, setIsCampaign] = useState(false)
  const [scripts, setScripts] = useState<any[]>([])
  const [showVideos, setShowVideos] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [duplicates, setDuplicates] = useState<any[]>([])

  // Wizard state
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null)
  const [selectedVoice, setSelectedVoice] = useState<any>(null)
  const [selectedLead, setSelectedLead] = useState<any[]>([])
  const [language, setLanguage] = useState('tr')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [autoSend, setAutoSend] = useState(false)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

  // Duplicate check when leads change
  useEffect(() => {
    if (selectedLead.length === 0) { setDuplicates([]); return }
    const ids = selectedLead.map((l: any) => l.id).join(',')
    fetch(`${API}/api/video-outreach/check-duplicates?leadIds=${ids}`, { headers: authH() })
      .then(r => r.json()).then(d => setDuplicates(d.existing || [])).catch(() => {})
  }, [selectedLead.length])

  async function loadAll() {
    try {
      const [l, v, s] = await Promise.allSettled([
        api.get('/api/leads?limit=200'),
        fetch(`${API}/api/video-outreach/videos?limit=20`, { headers: authH() }),
        fetch(`${API}/api/video-outreach/stats`, { headers: authH() }),
      ])
      if (l.status === 'fulfilled') setLeads((l.value as any).leads || [])
      if (v.status === 'fulfilled') { const d = await (v.value as any).json(); setVideos(d.videos || []) }
      if (s.status === 'fulfilled') { const d = await (s.value as any).json(); setStats(d) }
    } catch {}
  }

  async function loadAnalytics() {
    try {
      const r = await fetch(`${API}/api/video-outreach/analytics`, { headers: authH() })
      const d = await r.json()
      setAnalytics(d)
    } catch {}
  }

  function canNext() {
    if (step === 1) return !!selectedAvatar
    if (step === 2) return !!selectedVoice
    if (step === 3) return selectedLead.length > 0
    if (step === 4) return true
    if (step === 5) return true
    return false
  }

  async function generate() {
    setGenerating(true)
    try {
      if (selectedLead.length === 1) {
        const leadScript = scripts.find((s: any) => s.leadId === selectedLead[0].id)
        const r = await fetch(`${API}/api/video-outreach/generate/single`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({
            leadId: selectedLead[0].id,
            avatarId: selectedAvatar.avatar_id,
            voiceId: selectedVoice.voice_id,
            aspectRatio, language, autoSend,
            customScript: leadScript?.script || null,
          }),
        })
        const d = await r.json()
        if (d.ok) { setCreatedVideoId(d.videoId); setIsCampaign(false); setStep(6) }
        else showMsg('error', d.error)
      } else {
        const r = await fetch(`${API}/api/video-outreach/generate/campaign`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({
            leadIds: selectedLead.map((l: any) => l.id),
            avatarId: selectedAvatar.avatar_id,
            voiceId: selectedVoice.voice_id,
            aspectRatio, language: language || undefined, autoSend,
            campaignName: `Video — ${new Date().toLocaleDateString('tr-TR')}`,
          }),
        })
        const d = await r.json()
        if (d.ok) { setCreatedCampaignId(d.campaignId); setIsCampaign(true); setStep(6) }
        else showMsg('error', d.error)
      }
    } catch (e: any) { showMsg('error', e.message) }
    setGenerating(false)
  }

  async function sendVideo(videoId: string) {
    try {
      const r = await fetch(`${API}/api/video-outreach/send`, {
        method: 'POST', headers: authH(), body: JSON.stringify({ videoId }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Video WhatsApp ile gönderildi!'); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
  }

  async function retryVideo(videoId: string) {
    try {
      const r = await fetch(`${API}/api/video-outreach/retry/${videoId}`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Video yeniden oluşturuluyor...'); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
  }

  function reset() {
    setStep(1)
    setSelectedAvatar(null)
    setSelectedVoice(null)
    setSelectedLead([])
    setCreatedVideoId('')
    setCreatedCampaignId('')
    setIsCampaign(false)
    setScripts([])
    setDuplicates([])
    loadAll()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4"/>
            </div>
            AI Video Outreach
          </h1>
          <p className="text-slate-400 text-sm mt-1">HeyGen + ElevenLabs · 1281 avatar · Kişisel video mesajları</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="text-emerald-400 font-medium">{stats.completed} hazır</span>
              <span>{stats.viewed} izlendi</span>
              <span>{stats.total} toplam</span>
            </div>
          )}
          <button onClick={() => { setShowAnalytics(!showAnalytics); if (!showAnalytics) loadAnalytics() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${showAnalytics ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
            <TrendingUp className="w-4 h-4"/> Analitik
          </button>
          <button onClick={() => { setShowVideos(!showVideos); if (!showVideos) loadAll() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${showVideos ? 'bg-purple-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
            <Eye className="w-4 h-4"/> Videolar ({videos.length})
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400"/> Performans Matrisi</h3>
            <button onClick={loadAnalytics} className="p-1.5 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
          </div>
          {analytics ? (
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Avg script score */}
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Script Kalitesi</p>
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-bold text-white">{analytics.avg_script_score || '—'}</div>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <div key={n} className={`w-3 h-5 rounded-sm ${n <= (analytics.avg_script_score || 0) ? 'bg-purple-500' : 'bg-slate-700'}`}/>
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{analytics.total_analyzed} video analiz edildi</p>
                  </div>
                </div>
                {analytics.by_hook && Object.keys(analytics.by_hook).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500">Hook A/B Karşılaştırması</p>
                    {Object.entries(analytics.by_hook).map(([hook, stats]: [string, any]) => (
                      <div key={hook} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-14">Hook {hook.toUpperCase()}</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.avgWatch}%` }}/>
                        </div>
                        <span className="text-xs text-white w-10 text-right">%{stats.avgWatch}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top sectors */}
              <div className="md:col-span-2 space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sektöre Göre İzlenme</p>
                {analytics.by_sector?.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.by_sector.slice(0, 6).map((s: any) => (
                      <div key={s.sector} className="flex items-center gap-3">
                        <span className="text-xs text-slate-300 w-32 truncate">{s.sector || 'Bilinmiyor'}</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-2.5">
                          <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all"
                            style={{ width: `${s.avgWatch}%` }}/>
                        </div>
                        <span className="text-xs text-white w-8 text-right">%{s.avgWatch}</span>
                        <span className="text-xs text-slate-600 w-10 text-right">{s.count} video</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm py-4">Henüz yeterli veri yok. Videolar izlendikçe burada görünecek.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-blue-400"/></div>
          )}
        </div>
      )}

      {/* Video listesi */}
      {showVideos && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Son Videolar</h3>
            <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
          </div>
          <div className="divide-y divide-slate-700/50">
            {videos.map(v => {
              const watchPct = v.max_watch_percent || 0
              const watchColor = watchPct >= 90 ? 'bg-emerald-500' : watchPct >= 60 ? 'bg-blue-500' : watchPct >= 20 ? 'bg-amber-500' : 'bg-slate-600'
              return (
              <div key={v.id} className="p-4 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 bg-slate-900 rounded-xl overflow-hidden flex-shrink-0">
                    {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover"/> :
                      <div className="w-full h-full flex items-center justify-center">
                        {['processing','generating','researching'].includes(v.status) ? <RefreshCw className="w-4 h-4 animate-spin text-slate-500"/> : <Video className="w-4 h-4 text-slate-600"/>}
                      </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{v.research_data?.brandName || v.leads?.company_name}</p>
                      {v.research_quality === 'web_search' && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded shrink-0">🔍 Araştırıldı</span>
                      )}
                      {v.script_score > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-purple-400 shrink-0">
                          <Star className="w-3 h-3"/> {v.script_score}/10
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-slate-500 text-xs">{LANG_MAP[v.language]?.flag} {v.aspect_ratio}</p>
                      {v.research_data?.pains?.[0] && (
                        <p className="text-orange-400/60 text-xs truncate max-w-[180px]">● {v.research_data.pains[0]}</p>
                      )}
                      {(v.view_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Eye className="w-3 h-3"/> {v.view_count}x izlendi
                        </span>
                      )}
                      {v.sent_at && <span className="text-xs text-teal-400">Gönderildi ✓</span>}
                      {!v.sent_at && v.optimal_send_at && v.status === 'completed' && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <Timer className="w-3 h-3"/> {new Date(v.optimal_send_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'de gönder
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${v.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : v.status === 'researching' ? 'bg-amber-500/15 text-amber-400' : ['processing','generating'].includes(v.status) ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400'}`}>
                      {v.status === 'completed' ? 'Hazır' : v.status === 'researching' ? 'Araştırılıyor' : ['processing','generating'].includes(v.status) ? 'İşleniyor' : 'Başarısız'}
                    </span>
                    {v.video_url && <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-700 hover:bg-purple-600 rounded-lg transition"><Play className="w-3.5 h-3.5 text-white"/></a>}
                    {v.status === 'completed' && !v.sent_at && v.leads?.phone && (
                      <button onClick={() => sendVideo(v.id)} className="p-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg">
                        <Send className="w-3.5 h-3.5 text-white"/>
                      </button>
                    )}
                    {v.status === 'failed' && (
                      <button onClick={() => retryVideo(v.id)} title="Yeniden dene" className="p-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg">
                        <RotateCcw className="w-3.5 h-3.5 text-white"/>
                      </button>
                    )}
                  </div>
                </div>
                {/* Watch percent bar */}
                {watchPct > 0 && (
                  <div className="flex items-center gap-2 ml-20">
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${watchColor}`} style={{ width: `${watchPct}%` }}/>
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">%{watchPct} izlendi</span>
                  </div>
                )}
              </div>
            )})}
            {videos.length === 0 && <div className="text-center py-8 text-slate-600 text-sm">Henüz video yok</div>}
          </div>
        </div>
      )}

      {/* Wizard */}
      {step < 6 && <StepIndicator current={step}/>}

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        {step === 1 && <StepAvatar selected={selectedAvatar} onSelect={setSelectedAvatar}/>}
        {step === 2 && <StepVoice selected={selectedVoice} onSelect={setSelectedVoice}/>}
        {step === 3 && <StepLead selected={selectedLead} onSelect={setSelectedLead} leads={leads} language={language} onLanguageChange={setLanguage} aspectRatio={aspectRatio} onAspectChange={setAspectRatio} autoSend={autoSend} onAutoSendChange={setAutoSend} duplicates={duplicates}/>}
        {step === 4 && <StepScript leads={selectedLead} avatar={selectedAvatar} voice={selectedVoice} language={language} scripts={scripts} onScriptsChange={setScripts}/>}
        {step === 5 && <StepPreview avatar={selectedAvatar} voice={selectedVoice} leads={selectedLead} scripts={scripts} language={language} aspectRatio={aspectRatio} autoSend={autoSend}/>}
        {step === 6 && !isCampaign && <StepResultSingle videoId={createdVideoId} onReset={reset}/>}
        {step === 6 && isCampaign && <StepResultCampaign campaignId={createdCampaignId} onReset={reset}/>}

        {step < 6 && (
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-700">
            <button onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white rounded-xl font-medium text-sm">
              <ArrowLeft className="w-4 h-4"/> Geri
            </button>

            <div className="flex items-center gap-2">
              {STEPS.map(s => (
                <div key={s.id} className={`w-2 h-2 rounded-full transition-all ${step === s.id ? 'bg-purple-500 w-6' : step > s.id ? 'bg-emerald-500' : 'bg-slate-700'}`}/>
              ))}
            </div>

            {step < 5 ? (
              <button onClick={() => setStep(s => s+1)} disabled={!canNext()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl font-medium text-sm">
                Devam <ArrowRight className="w-4 h-4"/>
              </button>
            ) : (
              <button onClick={generate} disabled={generating || !canNext()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm">
                {generating ? <><RefreshCw className="w-4 h-4 animate-spin"/> Oluşturuluyor...</> : <><Zap className="w-4 h-4"/> Video Oluştur</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
