'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Video, Play, Square, RefreshCw, Send, CheckCircle,
  Clock, AlertTriangle, Zap, Search, Filter, Globe2,
  Users, BarChart2, ChevronLeft, ChevronRight, Mic, Volume2
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

const VOICE_LANGS = Object.entries(LANG_MAP).map(([code, v]) => ({ code, ...v }))

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Hazir', cls: 'bg-emerald-500/15 text-emerald-400' },
    processing: { label: 'Olusturuluyor', cls: 'bg-blue-500/15 text-blue-400 animate-pulse' },
    generating: { label: 'Baslatiliyor', cls: 'bg-amber-500/15 text-amber-400 animate-pulse' },
    failed: { label: 'Basarisiz', cls: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

let globalAudio: HTMLAudioElement | null = null

// Avatar Galerisi
function AvatarGallery({ selectedId, onSelect }: any) {
  const [avatars, setAvatars] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)

  useEffect(() => { loadAvatars() }, [page, filterGender])

  async function loadAvatars() {
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
      {/* Filtreler */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadAvatars()}
            placeholder="Avatar ara... (Enter'a bas)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
        </div>
        <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tum</option>
          <option value="male">Erkek</option>
          <option value="female">Kadin</option>
        </select>
        <button onClick={() => { setPage(1); loadAvatars() }}
          className="px-3 py-2 bg-teal-600 text-white rounded-xl text-sm">Ara</button>
      </div>

      <p className="text-xs text-slate-500">{total} avatar · Sayfa {page}/{totalPages}</p>

      {/* Preview video */}
      {previewVideo && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-40">
          <video src={previewVideo} autoPlay loop muted className="w-full h-full object-cover"/>
          <button onClick={() => setPreviewVideo(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-lg p-1">
            <Square className="w-3 h-3"/>
          </button>
        </div>
      )}

      {/* Avatar grid */}
      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-teal-400"/></div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
          {avatars.map((avatar: any) => (
            <div key={avatar.avatar_id} onClick={() => onSelect(avatar.avatar_id, avatar.name)}
              className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedId === avatar.avatar_id ? 'border-teal-500' : 'border-transparent hover:border-slate-600'}`}>
              {avatar.preview_image ? (
                <img src={avatar.preview_image} alt={avatar.name} className="w-full aspect-square object-cover"/>
              ) : (
                <div className="w-full aspect-square bg-slate-700 flex items-center justify-center text-4xl">
                  {avatar.gender === 'female' ? '👩' : '👨'}
                </div>
              )}
              {selectedId === avatar.avatar_id && (
                <div className="absolute top-1 right-1 bg-teal-500 rounded-full p-0.5">
                  <CheckCircle className="w-3 h-3 text-white"/>
                </div>
              )}
              {avatar.preview_video && (
                <button onClick={e => { e.stopPropagation(); setPreviewVideo(avatar.preview_video) }}
                  className="absolute bottom-1 left-1 bg-black/60 rounded-lg p-1 opacity-0 group-hover:opacity-100">
                  <Play className="w-3 h-3 text-white"/>
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1">
                <p className="text-white text-xs truncate">{avatar.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sayfalama */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
          className="p-2 bg-slate-800 rounded-xl disabled:opacity-30 text-white">
          <ChevronLeft className="w-4 h-4"/>
        </button>
        <span className="text-slate-500 text-xs">{page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
          className="p-2 bg-slate-800 rounded-xl disabled:opacity-30 text-white">
          <ChevronRight className="w-4 h-4"/>
        </button>
      </div>
    </div>
  )
}

// Ses Galerisi
function VoiceGallery({ selectedId, onSelect }: any) {
  const [voices, setVoices] = useState<any[]>([])
  const [myVoices, setMyVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [voiceLang, setVoiceLang] = useState('tr')
  const [search, setSearch] = useState('')

  useEffect(() => { loadVoices(voiceLang) }, [voiceLang])

  async function loadVoices(lang: string) {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/eleven-voices?language=${lang}`, { headers: authH() })
      const d = await r.json()
      setVoices(d.language || [])
      setMyVoices(d.my || [])
    } catch {}
    setLoading(false)
  }

  function playVoice(voiceId: string, previewUrl?: string) {
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
    <div className="space-y-3">
      {/* Seslerim */}
      {myVoices.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Seslerim:</p>
          <div className="flex gap-1.5 flex-wrap">
            {myVoices.slice(0, 5).map((v: any) => (
              <button key={v.voice_id} onClick={() => onSelect(v.voice_id, v.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition ${selectedId === v.voice_id ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                🎤 {v.name.split(' ')[0]}
                {selectedId === v.voice_id && <CheckCircle className="w-3 h-3 text-teal-400"/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dil secimi */}
      <div className="flex gap-1.5 flex-wrap">
        {VOICE_LANGS.map(lang => (
          <button key={lang.code} onClick={() => setVoiceLang(lang.code)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition border ${voiceLang === lang.code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {lang.flag} {lang.name}
          </button>
        ))}
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ses ara..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-sm text-white focus:outline-none"/>
      </div>

      {/* Ses listesi */}
      {loading ? (
        <div className="flex justify-center py-4"><RefreshCw className="w-5 h-5 animate-spin text-teal-400"/></div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {filtered.map((voice: any) => (
            <div key={voice.voice_id} onClick={() => onSelect(voice.voice_id, voice.name)}
              className={`group flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${selectedId === voice.voice_id ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-base flex-shrink-0">
                {voice.gender === 'female' ? '👩' : '👨'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{voice.name}</p>
                <p className="text-slate-500 text-xs">{voice.gender === 'female' ? 'Kadin' : 'Erkek'} {voice.accent && `· ${voice.accent}`}</p>
              </div>
              {selectedId === voice.voice_id && <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>}
              <button onClick={e => { e.stopPropagation(); playVoice(voice.voice_id, voice.preview_url) }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${playing === voice.voice_id ? 'bg-red-500 opacity-100' : 'bg-slate-700 opacity-0 group-hover:opacity-100 hover:bg-teal-600'}`}>
                {playing === voice.voice_id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VideoOutreachPage() {
  const [tab, setTab] = useState<'create' | 'campaign' | 'videos' | 'stats'>('create')
  const [leads, setLeads] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Secimler
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [selectedAvatarName, setSelectedAvatarName] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [language, setLanguage] = useState('tr')
  const [autoSend, setAutoSend] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [generating, setGenerating] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

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

  async function generateSingle() {
    if (!selectedLead || !selectedAvatar || !selectedVoice) return showMsg('error', 'Lead, avatar ve ses secin')
    setGenerating(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/generate/single`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadId: selectedLead, avatarId: selectedAvatar, voiceId: selectedVoice, aspectRatio, language, autoSend }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Video olusturuluyor! Birkaç dakika sürer.'); setTimeout(loadAll, 3000) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setGenerating(false)
  }

  async function generateCampaign() {
    if (!selectedLeads.length || !selectedAvatar || !selectedVoice) return showMsg('error', 'Lead listesi, avatar ve ses secin')
    setCampaignRunning(true)
    try {
      const r = await fetch(`${API}/api/video-outreach/generate/campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadIds: selectedLeads, avatarId: selectedAvatar, voiceId: selectedVoice, aspectRatio, language: language || undefined, autoSend, campaignName }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message); setSelectedLeads([]) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCampaignRunning(false)
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

  const leadsWithPhone = leads.filter(l => l.phone)
  const countries = [...new Set(leadsWithPhone.map(l => l.country).filter(Boolean))]
  const filteredLeads = filterCountry ? leadsWithPhone.filter(l => l.country === filterCountry) : leadsWithPhone
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4"/>
            </div>
            AI Video Outreach
          </h1>
          <p className="text-slate-400 text-sm mt-1">HeyGen + ElevenLabs · 1281 avatar · 9 dil · Kisisel video mesajlari</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAvatarName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
              <Video className="w-3 h-3"/> {selectedAvatarName}
            </div>
          )}
          {selectedVoiceName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs text-teal-300">
              <Mic className="w-3 h-3"/> {selectedVoiceName}
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-white' },
            { label: 'Hazir', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Isleniyor', value: stats.processing, color: 'text-blue-400' },
            { label: 'Gonderildi', value: stats.sent, color: 'text-teal-400' },
            { label: 'Basarisiz', value: stats.failed, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit flex-wrap">
        {[['create','Tek Video'],['campaign','Kampanya'],['videos','Videolar'],['stats','Istatistik']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* TEK VIDEO */}
      {tab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Avatar + Ses Secimi */}
          <div className="lg:col-span-2 space-y-5">
            {/* Avatar */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Video className="w-4 h-4 text-purple-400"/> Avatar Sec (1281 avatar)
              </h3>
              {selectedAvatarName && (
                <div className="flex items-center gap-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-3">
                  <CheckCircle className="w-4 h-4 text-purple-400"/>
                  <span className="text-purple-300 text-sm">Secili: {selectedAvatarName}</span>
                </div>
              )}
              <AvatarGallery selectedId={selectedAvatar} onSelect={(id: string, name: string) => { setSelectedAvatar(id); setSelectedAvatarName(name) }}/>
            </div>

            {/* Ses */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4 text-teal-400"/> ElevenLabs Sesi Sec
              </h3>
              {selectedVoiceName && (
                <div className="flex items-center gap-2 p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl mb-3">
                  <CheckCircle className="w-4 h-4 text-teal-400"/>
                  <span className="text-teal-300 text-sm">Secili: {selectedVoiceName}</span>
                </div>
              )}
              <VoiceGallery selectedId={selectedVoice} onSelect={(id: string, name: string) => { setSelectedVoice(id); setSelectedVoiceName(name) }}/>
            </div>
          </div>

          {/* Ayarlar + Gonder */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white">Video Ayarlari</h3>

              {/* Lead */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Lead Sec</label>
                <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                  <option value="">Lead secin</option>
                  {leadsWithPhone.map(l => (
                    <option key={l.id} value={l.id}>{l.company_name} {l.country ? `(${l.country})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Video Formati</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['9:16','Dikey (Telefon)'],['16:9','Yatay (Web)'],['1:1','Kare']].map(([r,l]) => (
                    <button key={r} onClick={() => setAspectRatio(r)}
                      className={`py-2 rounded-xl border text-xs transition ${aspectRatio === r ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dil */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Script Dili</label>
                <div className="flex gap-1.5 flex-wrap">
                  {VOICE_LANGS.map(lang => (
                    <button key={lang.code} onClick={() => setLanguage(lang.code)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${language === lang.code ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Otomatik Gonder */}
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">Otomatik Gonder</p>
                  <p className="text-slate-500 text-xs">Video hazir oldugunda WhatsApp'a gonder</p>
                </div>
                <button onClick={() => setAutoSend(!autoSend)}
                  className={`w-10 h-6 rounded-full transition-all ${autoSend ? 'bg-teal-600' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all mx-1 ${autoSend ? 'translate-x-4' : ''}`}/>
                </button>
              </div>

              <button onClick={generateSingle} disabled={generating || !selectedLead || !selectedAvatar || !selectedVoice}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                {generating ? <><RefreshCw className="w-4 h-4 animate-spin"/> Olusturuluyor...</> : <><Zap className="w-4 h-4"/> Video Olustur</>}
              </button>
            </div>

            {/* Nasil calisir */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <h4 className="text-white text-sm font-semibold mb-3">Nasil Calisir?</h4>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Avatar ve ses sec', color: 'bg-purple-500/20 text-purple-400' },
                  { step: '2', text: 'Claude kisisel script yazar', color: 'bg-blue-500/20 text-blue-400' },
                  { step: '3', text: 'ElevenLabs sesi uretir', color: 'bg-teal-500/20 text-teal-400' },
                  { step: '4', text: 'HeyGen avatarla video olusturur', color: 'bg-amber-500/20 text-amber-400' },
                  { step: '5', text: 'WhatsApp ile gonderilir', color: 'bg-emerald-500/20 text-emerald-400' },
                ].map(s => (
                  <div key={s.step} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${s.color}`}>{s.step}</div>
                    <span className="text-slate-400 text-xs">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KAMPANYA */}
      {tab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Avatar + Ses secimi ozet */}
            {(!selectedAvatar || !selectedVoice) && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0"/>
                <div>
                  <p className="text-amber-300 text-sm font-medium">Once Tek Video sekmesinden avatar ve ses sec</p>
                  <p className="text-amber-400/60 text-xs">Kampanya icin secimler oradan gelir</p>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400"/> Toplu Video Kampanyasi
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Kampanya Adi</label>
                  <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                    placeholder="Nisan 2026 Ihracat"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Ulke Filtresi</label>
                  <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm">
                    <option value="">Tum Ulkeler</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Dil</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setLanguage('')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${!language ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Otomatik
                  </button>
                  {VOICE_LANGS.map(lang => (
                    <button key={lang.code} onClick={() => setLanguage(lang.code)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${language === lang.code ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead listesi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">{selectedLeads.length} / {filteredLeads.length} secili</label>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))} className="text-xs text-teal-400">Tumunu Sec</button>
                    <button onClick={() => setSelectedLeads([])} className="text-xs text-slate-500">Temizle</button>
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto bg-slate-900 rounded-xl p-2 space-y-1">
                  {filteredLeads.map(l => (
                    <label key={l.id} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-800 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={selectedLeads.includes(l.id)}
                        onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                        className="accent-purple-500"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{l.company_name}</p>
                        <p className="text-slate-500 text-xs">{l.phone} {l.country && `· ${l.country}`}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">Otomatik Gonder</p>
                  <p className="text-slate-500 text-xs">Hazir oldugunda WhatsApp'a gonder</p>
                </div>
                <button onClick={() => setAutoSend(!autoSend)}
                  className={`w-10 h-6 rounded-full transition-all ${autoSend ? 'bg-teal-600' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all mx-1 ${autoSend ? 'translate-x-4' : ''}`}/>
                </button>
              </div>

              <button onClick={generateCampaign} disabled={campaignRunning || !selectedLeads.length || !selectedAvatar || !selectedVoice}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                {campaignRunning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Olusturuluyor...</> : <><Zap className="w-4 h-4"/> {selectedLeads.length} Kisisel Video Olustur</>}
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">Secilen Ayarlar</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Avatar</p>
                <p className="text-white text-sm">{selectedAvatarName || 'Secilmedi'}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Ses</p>
                <p className="text-white text-sm">{selectedVoiceName || 'Secilmedi'}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Format</p>
                <p className="text-white text-sm">{aspectRatio}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Tahmini Sure</p>
                <p className="text-white text-sm">~{selectedLeads.length * 3} dakika</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIDEOLAR */}
      {tab === 'videos' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Video Listesi</h3>
            <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
          </div>
          <div className="divide-y divide-slate-700/50">
            {videos.map(v => (
              <div key={v.id} className="flex items-center gap-4 p-4 hover:bg-slate-700/20">
                {/* Thumbnail */}
                <div className="w-20 h-14 bg-slate-900 rounded-xl overflow-hidden flex-shrink-0">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {v.status === 'processing' || v.status === 'generating' ? <RefreshCw className="w-5 h-5 animate-spin text-slate-500"/> : <Video className="w-5 h-5 text-slate-600"/>}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{v.leads?.company_name || 'Lead'}</p>
                  <p className="text-slate-500 text-xs">{v.leads?.country || ''} · {LANG_MAP[v.language]?.flag || '🌍'} {LANG_MAP[v.language]?.name || v.language}</p>
                  {v.script && <p className="text-slate-600 text-xs mt-0.5 truncate">{v.script.substring(0, 60)}...</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={v.status}/>
                  {v.sent_at && <span className="text-xs text-emerald-400">Gonderildi</span>}
                  {v.video_url && (
                    <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 bg-slate-700 hover:bg-purple-600 rounded-lg transition">
                      <Play className="w-3.5 h-3.5 text-white"/>
                    </a>
                  )}
                  {v.status === 'completed' && !v.sent_at && v.leads?.phone && (
                    <button onClick={() => sendVideo(v.id)} className="p-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg">
                      <Send className="w-3.5 h-3.5 text-white"/>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                <Video className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Henuz video olusturulmamis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ISTATISTIK */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400"/> Video Ozeti
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Toplam Video', value: stats.total, color: 'text-white' },
                { label: 'Hazir', value: stats.completed, color: 'text-emerald-400' },
                { label: 'Isleniyor', value: stats.processing, color: 'text-blue-400' },
                { label: 'Gonderildi', value: stats.sent, color: 'text-teal-400' },
                { label: 'Basarisiz', value: stats.failed, color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4">Sistem Bilgisi</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Avatarlar</span><span className="text-white">1281</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Sesler</span><span className="text-white">1600+</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Video Motor</span><span className="text-white">HeyGen</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Ses Motor</span><span className="text-white">ElevenLabs</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Script Motor</span><span className="text-white">Claude Sonnet</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Desteklenen Diller</span><span className="text-white">9 dil</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}