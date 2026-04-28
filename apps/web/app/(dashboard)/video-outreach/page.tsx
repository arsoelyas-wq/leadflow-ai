'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Video, Play, Square, RefreshCw, Send, CheckCircle,
  AlertTriangle, Zap, Search, ChevronLeft, ChevronRight,
  Mic, Volume2, ArrowRight, ArrowLeft, Users, Globe2,
  BarChart2, Clock, Eye
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const LANG_MAP: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Turkce', flag: '🇹🇷' },
  en: { name: 'Ingilizce', flag: '🇬🇧' },
  de: { name: 'Almanca', flag: '🇩🇪' },
  fr: { name: 'Fransizca', flag: '🇫🇷' },
  ar: { name: 'Arapca', flag: '🇸🇦' },
  ru: { name: 'Rusca', flag: '🇷🇺' },
  it: { name: 'Italyanca', flag: '🇮🇹' },
  es: { name: 'Ispanyolca', flag: '🇪🇸' },
  nl: { name: 'Hollandaca', flag: '🇳🇱' },
}

let globalAudio: HTMLAudioElement | null = null

const STEPS = [
  { id: 1, label: 'Avatar', icon: '🎭' },
  { id: 2, label: 'Ses', icon: '🎤' },
  { id: 3, label: 'Lead', icon: '👤' },
  { id: 4, label: 'Onizleme', icon: '👁' },
  { id: 5, label: 'Gonder', icon: '🚀' },
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

// ADIM 1: Avatar Sec
function StepAvatar({ selected, onSelect }: any) {
  const [avatars, setAvatars] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)

  useEffect(() => { load() }, [page, filterGender])

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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Avatar Sec</h2>
        <p className="text-slate-400 text-sm">Videonuzda gorunecek avatar karakteri secin. {total} avatar mevcut.</p>
      </div>

      {selected && (
        <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-purple-400 shrink-0"/>
          <span className="text-purple-300 text-sm font-medium">Secili: {selected.name}</span>
          <button onClick={() => onSelect(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">Degistir</button>
        </div>
      )}

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
          <option value="">Tum</option>
          <option value="male">Erkek</option>
          <option value="female">Kadin</option>
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
              onClick={() => onSelect(avatar)}
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
                  <Play className="w-3 h-3"/> Izle
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate leading-tight">{avatar.name}</p>
                {avatar.gender && <p className="text-slate-400 text-xs">{avatar.gender === 'female' ? 'Kadin' : 'Erkek'}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl text-sm text-white disabled:opacity-30">
          <ChevronLeft className="w-4 h-4"/> Onceki
        </button>
        <span className="text-slate-500 text-sm">Sayfa {page} / {totalPages} · {total} avatar</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl text-sm text-white disabled:opacity-30">
          Sonraki <ChevronRight className="w-4 h-4"/>
        </button>
      </div>
    </div>
  )
}

// ADIM 2: Ses Sec
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
        <h2 className="text-xl font-bold text-white mb-1">ElevenLabs Sesi Sec</h2>
        <p className="text-slate-400 text-sm">Videonuzda kullanilacak sesi secin. Her ses dinlenebilir.</p>
      </div>

      {selected && (
        <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0"/>
          <span className="text-teal-300 text-sm font-medium">Secili: {selected.name}</span>
          <button onClick={() => onSelect(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">Degistir</button>
        </div>
      )}

      {myVoices.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium">SESLERIM</p>
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
        <p className="text-xs text-slate-500 mb-2 font-medium">DILE GORE SES ARA</p>
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
                <p className="text-slate-500 text-xs">{voice.gender === 'female' ? 'Kadin' : 'Erkek'} {voice.accent && `· ${voice.accent}`}</p>
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

// ADIM 3: Lead Sec (coklu)
function StepLead({ selected, onSelect, leads, language, onLanguageChange, aspectRatio, onAspectChange, autoSend, onAutoSendChange }: any) {
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const leadsWithPhone = leads.filter((l: any) => l.phone)
  const countries = [...new Set(leadsWithPhone.map((l: any) => l.country).filter(Boolean))]
  const filtered = leadsWithPhone.filter((l: any) => {
    if (filterCountry && l.country !== filterCountry) return false
    if (search && !l.company_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggleLead(lead: any) {
    const isSelected = selected.some((l: any) => l.id === lead.id)
    if (isSelected) {
      onSelect(selected.filter((l: any) => l.id !== lead.id))
    } else {
      onSelect([...selected, lead])
    }
  }

  function selectAll() { onSelect(filtered) }
  function clearAll() { onSelect([]) }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Lead ve Ayarlar</h2>
        <p className="text-slate-400 text-sm">Video gonderilecek leadleri secin. Her birine ayri kisisel video olusturulur.</p>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-blue-400 shrink-0"/>
          <div className="flex-1">
            <p className="text-blue-300 text-sm font-medium">{selected.length} lead secildi</p>
            <p className="text-blue-400/60 text-xs">{selected.map((l: any) => l.company_name).slice(0,3).join(', ')}{selected.length > 3 ? ` +${selected.length-3} daha` : ''}</p>
          </div>
          <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-400">Temizle</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lead listesi */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">LEAD SEC ({selected.length}/{filtered.length})</p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-teal-400 hover:text-teal-300">Tumunu Sec</button>
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
              <option value="">Tum Ulkeler</option>
              {countries.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {filtered.map((l: any) => {
              const isSelected = selected.some((s: any) => s.id === l.id)
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
                    <p className="text-white text-sm truncate">{l.company_name}</p>
                    <p className="text-slate-500 text-xs">{l.phone} {l.country && `· ${l.country}`}</p>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="text-slate-600 text-sm text-center py-4">Lead bulunamadi</p>}
          </div>
        </div>

        {/* Ayarlar */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">VIDEO FORMATI</p>
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
            <p className="text-xs text-slate-500 font-medium mb-2">SCRIPT DILI</p>
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
              <p className="text-white text-sm font-medium">Otomatik Gonder</p>
              <p className="text-slate-500 text-xs">Video hazir olunca WhatsApp'a gonder</p>
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

// ADIM 4: Onizleme
function StepPreview({ avatar, voice, leads, language, aspectRatio, autoSend }: any) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Onizleme</h2>
        <p className="text-slate-400 text-sm">Secimlerinizi kontrol edin ve video olusturun.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avatar onizleme */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          {avatar?.preview_image ? (
            <img src={avatar.preview_image} alt={avatar.name} className="w-full aspect-video object-cover"/>
          ) : (
            <div className="w-full aspect-video bg-slate-900 flex items-center justify-center text-6xl">🎭</div>
          )}
          <div className="p-3">
            <p className="text-white text-sm font-medium">{avatar?.name || 'Avatar secilmedi'}</p>
            <p className="text-slate-500 text-xs">{avatar?.gender === 'female' ? 'Kadin' : 'Erkek'} avatar</p>
          </div>
        </div>

        {/* Ozet */}
        <div className="space-y-3">
          {[
            { label: 'Avatar', value: avatar?.name, icon: '🎭', ok: !!avatar },
            { label: 'Ses', value: voice?.name, icon: '🎤', ok: !!voice },
            { label: leads?.length === 1 ? 'Lead' : 'Leadler', value: leads?.length === 1 ? leads[0]?.company_name : `${leads?.length} lead secildi`, icon: '👤', ok: leads?.length > 0 },
            { label: 'Dil', value: `${LANG_MAP[language]?.flag} ${LANG_MAP[language]?.name}`, icon: '🌍', ok: true },
            { label: 'Format', value: aspectRatio, icon: '📐', ok: true },
            { label: 'Otomatik Gonder', value: autoSend ? 'Evet - WhatsApp' : 'Hayir', icon: '📤', ok: true },
          ].map(({ label, value, icon, ok }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${ok && value ? 'bg-slate-800 border-slate-700' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-xl shrink-0">{icon}</span>
              <div className="flex-1">
                <p className="text-slate-500 text-xs">{label}</p>
                <p className={`text-sm font-medium ${ok && value ? 'text-white' : 'text-red-400'}`}>{value || 'Secilmedi!'}</p>
              </div>
              {ok && value ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0"/> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0"/>}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-amber-300 text-sm font-medium mb-1">Video Olusturma Sureci</p>
        <div className="space-y-1 text-xs text-amber-400/70">
          <p>1. Claude sizin icin kisisel script yazacak</p>
          <p>2. ElevenLabs sectiginiz sesle seslendirme yapacak</p>
          <p>3. HeyGen sectiginiz avatarla video olusturacak</p>
          <p>4. {autoSend ? 'Video hazir olunca otomatik WhatsApp mesaji gonderilecek' : 'Video hazir olunca Videolar sekmesinden gonderebilirsiniz'}</p>
        </div>
      </div>
    </div>
  )
}

// ADIM 5: Sonuc
function StepResult({ videoId, onReset }: any) {
  const [status, setStatus] = useState('generating')
  const [videoUrl, setVideoUrl] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [videoId])

  async function checkStatus() {
    if (!videoId || status === 'completed' || status === 'failed') return
    setChecking(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/videos?limit=1`, { headers: authH() })
      const d = await r.json()
      const video = d.videos?.find((v: any) => v.id === videoId)
      if (video) {
        setStatus(video.status)
        if (video.video_url) setVideoUrl(video.video_url)
      }
    } catch {}
    setChecking(false)
  }

  return (
    <div className="space-y-5 text-center">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Video Olusturuluyor</h2>
        <p className="text-slate-400 text-sm">Videonuz hazirlanıyor. Bu birkaç dakika surebilir.</p>
      </div>

      {status === 'generating' || status === 'processing' ? (
        <div className="py-12 space-y-4">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin"/>
          </div>
          <p className="text-slate-400">Script yaziliyor, ses uretiliyor, video olusturuluyor...</p>
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
          <p className="text-emerald-400 font-medium">Video hazir!</p>
          <a href={videoUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium">
            <Play className="w-4 h-4"/> Videoyu Izle
          </a>
        </div>
      ) : status === 'failed' ? (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-400"/>
          </div>
          <p className="text-red-400">Video olusturulamadi. HeyGen kredisi gerekiyor.</p>
        </div>
      ) : null}

      <div className="flex justify-center gap-3 pt-4">
        <button onClick={checkStatus} disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}/> Durumu Kontrol Et
        </button>
        <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm">
          Yeni Video Olustur
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
  const [showVideos, setShowVideos] = useState(false)

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

  async function loadAll() {
    try {
      const [l, v, s] = await Promise.allSettled([
        api.get('/api/leads?limit=200'),
        fetch(`${API}/api/video-outreach/videos?limit=10`, { headers: authH() }),
        fetch(`${API}/api/video-outreach/stats`, { headers: authH() }),
      ])
      if (l.status === 'fulfilled') setLeads((l.value as any).leads || [])
      if (v.status === 'fulfilled') { const d = await (v.value as any).json(); setVideos(d.videos || []) }
      if (s.status === 'fulfilled') { const d = await (s.value as any).json(); setStats(d) }
    } catch {}
  }

  function canNext() {
    if (step === 1) return !!selectedAvatar
    if (step === 2) return !!selectedVoice
    if (step === 3) return selectedLead.length > 0
    if (step === 4) return true
    return false
  }

  async function generate() {
    setGenerating(true)
    try {
      if (selectedLead.length === 1) {
        // Tek lead - single endpoint
        const r = await fetch(`${API}/api/video-outreach/generate/single`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({
            leadId: selectedLead[0].id,
            avatarId: selectedAvatar.avatar_id,
            voiceId: selectedVoice.voice_id,
            aspectRatio, language, autoSend,
          }),
        })
        const d = await r.json()
        if (d.ok) { setCreatedVideoId(d.videoId); setStep(5) }
        else showMsg('error', d.error)
      } else {
        // Coklu lead - kampanya endpoint
        const r = await fetch(`${API}/api/video-outreach/generate/campaign`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({
            leadIds: selectedLead.map((l: any) => l.id),
            avatarId: selectedAvatar.avatar_id,
            voiceId: selectedVoice.voice_id,
            aspectRatio, language: language || undefined, autoSend,
            campaignName: `Video - ${new Date().toLocaleDateString('tr-TR')}`,
          }),
        })
        const d = await r.json()
        if (d.ok) { showMsg('success', d.message); setStep(5) }
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
      if (d.ok) { showMsg('success', 'Video WhatsApp ile gonderildi!'); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
  }

  function reset() {
    setStep(1)
    setSelectedAvatar(null)
    setSelectedVoice(null)
    setSelectedLead([])
    setCreatedVideoId('')
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
          <p className="text-slate-400 text-sm mt-1">HeyGen + ElevenLabs · 1281 avatar · Kisisel video mesajlari</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="text-emerald-400 font-medium">{stats.completed} hazir</span>
              <span>{stats.total} toplam</span>
            </div>
          )}
          <button onClick={() => setShowVideos(!showVideos)}
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

      {/* Video listesi */}
      {showVideos && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Son Videolar</h3>
            <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
          </div>
          <div className="divide-y divide-slate-700/50">
            {videos.map(v => (
              <div key={v.id} className="flex items-center gap-4 p-4">
                <div className="w-16 h-12 bg-slate-900 rounded-xl overflow-hidden flex-shrink-0">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover"/> :
                    <div className="w-full h-full flex items-center justify-center">
                      {v.status === 'processing' || v.status === 'generating' ? <RefreshCw className="w-4 h-4 animate-spin text-slate-500"/> : <Video className="w-4 h-4 text-slate-600"/>}
                    </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{v.leads?.company_name}</p>
                  <p className="text-slate-500 text-xs">{LANG_MAP[v.language]?.flag} {v.aspect_ratio}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : v.status === 'processing' || v.status === 'generating' ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400'}`}>
                    {v.status === 'completed' ? 'Hazir' : v.status === 'processing' || v.status === 'generating' ? 'Isleniyor' : 'Basarisiz'}
                  </span>
                  {v.video_url && <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-700 hover:bg-purple-600 rounded-lg transition"><Play className="w-3.5 h-3.5 text-white"/></a>}
                  {v.status === 'completed' && !v.sent_at && v.leads?.phone && <button onClick={() => sendVideo(v.id)} className="p-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg"><Send className="w-3.5 h-3.5 text-white"/></button>}
                </div>
              </div>
            ))}
            {videos.length === 0 && <div className="text-center py-8 text-slate-600 text-sm">Henuz video yok</div>}
          </div>
        </div>
      )}

      {/* Wizard */}
      {step < 5 && <StepIndicator current={step}/>}

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        {step === 1 && <StepAvatar selected={selectedAvatar} onSelect={setSelectedAvatar}/>}
        {step === 2 && <StepVoice selected={selectedVoice} onSelect={setSelectedVoice}/>}
        {step === 3 && <StepLead selected={selectedLead} onSelect={setSelectedLead} leads={leads} language={language} onLanguageChange={setLanguage} aspectRatio={aspectRatio} onAspectChange={setAspectRatio} autoSend={autoSend} onAutoSendChange={setAutoSend}/>}
        {step === 4 && <StepPreview avatar={selectedAvatar} voice={selectedVoice} leads={selectedLead} language={language} aspectRatio={aspectRatio} autoSend={autoSend}/>}
        {step === 5 && <StepResult videoId={createdVideoId} onReset={reset}/>}

        {step < 5 && (
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

            {step < 4 ? (
              <button onClick={() => setStep(s => s+1)} disabled={!canNext()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl font-medium text-sm">
                Devam <ArrowRight className="w-4 h-4"/>
              </button>
            ) : (
              <button onClick={generate} disabled={generating || !canNext()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm">
                {generating ? <><RefreshCw className="w-4 h-4 animate-spin"/> Olusturuluyor...</> : <><Zap className="w-4 h-4"/> Video Olustur</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}