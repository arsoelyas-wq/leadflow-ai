'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, Mic, Upload, Play, Square,
  CheckCircle, AlertTriangle, RefreshCw, Zap, Volume2,
  Globe2, Search, Settings, Sparkles, Trash2, User
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const LANG_MAP: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'İngilizce', flag: '🇬🇧' },
  de: { name: 'Almanca', flag: '🇩🇪' },
  fr: { name: 'Fransızca', flag: '🇫🇷' },
  ar: { name: 'Arapça', flag: '🇸🇦' },
  ru: { name: 'Rusça', flag: '🇷🇺' },
  az: { name: 'Azerbaycanca', flag: '🇦🇿' },
  it: { name: 'İtalyanca', flag: '🇮🇹' },
  es: { name: 'İspanyolca', flag: '🇪🇸' },
  nl: { name: 'Hollandaca', flag: '🇳🇱' },
  zh: { name: 'Çince', flag: '🇨🇳' },
  ja: { name: 'Japonca', flag: '🇯🇵' },
  ko: { name: 'Korece', flag: '🇰🇷' },
  hi: { name: 'Hintçe', flag: '🇮🇳' },
  pt: { name: 'Portekizce', flag: '🇵🇹' },
  pl: { name: 'Lehçe', flag: '🇵🇱' },
}
const VOICE_LANGS = Object.entries(LANG_MAP).map(([code, v]) => ({ code, ...v }))

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:   { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-400' },
    calling:     { label: 'Arıyor', cls: 'bg-blue-500/15 text-blue-400 animate-pulse' },
    initiating:  { label: 'Başlatılıyor', cls: 'bg-amber-500/15 text-amber-400' },
    'no-answer': { label: 'Cevap Yok', cls: 'bg-slate-500/15 text-slate-400' },
    failed:      { label: 'Başarısız', cls: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

let globalAudio: HTMLAudioElement | null = null

// ─── KENDİ SESİM TAB ──────────────────────────────────────────────────────────

function MyVoicesTab({ selectedId, selectedType, onSelect, onMsg }: any) {
  const [voices, setVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'record'>('upload')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => { loadVoices() }, [])
  useEffect(() => { return () => { stopRecording(true) } }, [])

  async function loadVoices() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/voice/my-voices`, { headers: authH() })
      const d = await r.json()
      setVoices(d.voices || [])
    } catch {}
    setLoading(false)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        setRecordedUrl(URL.createObjectURL(blob))
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
      mr.start(250)
      setIsRecording(true)
      setRecordingTime(0)
      setRecordedBlob(null)
      setRecordedUrl(null)
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 179) { stopRecording(false); return 180 }
          return t + 1
        })
      }, 1000)
    } catch {
      onMsg('error', 'Mikrofon erişimi reddedildi')
    }
  }

  function stopRecording(silent = false) {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }

  function clearRecording() {
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingTime(0)
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  async function cloneVoice() {
    const file = inputMode === 'upload' ? fileRef.current?.files?.[0] : null
    const blob = inputMode === 'record' ? recordedBlob : null
    if (!file && !blob) return onMsg('error', inputMode === 'upload' ? 'Ses dosyası seçin' : 'Önce ses kaydedin')
    setCloning(true)
    try {
      const form = new FormData()
      if (file) form.append('audio', file)
      else if (blob) form.append('audio', blob, 'recording.webm')
      form.append('name', voiceName || 'Sesim')
      const r = await fetch(`${API}/api/voice/clone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const d = await r.json()
      if (d.ok) {
        onMsg('success', 'Sesiniz kaydedildi!')
        setVoiceName('')
        if (fileRef.current) fileRef.current.value = ''
        clearRecording()
        await loadVoices()
        onSelect(d.voiceId, d.voiceName, 'cloned')
      } else {
        onMsg('error', d.error || 'Kaydetme başarısız')
      }
    } catch (e: any) { onMsg('error', e.message) }
    setCloning(false)
  }

  async function deleteVoice(id: string) {
    try {
      await fetch(`${API}/api/voice/my-voices/${id}`, { method: 'DELETE', headers: authH() })
      await loadVoices()
      if (selectedId === id) onSelect('', '', 'library')
    } catch (e: any) { onMsg('error', e.message) }
  }

  function playPreview(voice: any) {
    if (playing === voice.id) {
      if (globalAudio) { globalAudio.pause(); globalAudio = null }
      setPlaying(null)
      return
    }
    if (globalAudio) { globalAudio.pause(); globalAudio = null }
    setPlaying(voice.id)
    const a = new Audio(voice.sample_url)
    globalAudio = a
    a.onended = () => { setPlaying(null); globalAudio = null }
    a.onerror = () => { setPlaying(null); globalAudio = null }
    a.play().catch(() => { setPlaying(null); globalAudio = null })
  }

  return (
    <div className="space-y-5">
      {/* Yükleme kutusu */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
        <h4 className="text-white font-medium flex items-center gap-2">
          <Mic className="w-4 h-4 text-teal-400"/> Yeni Ses Ekle
        </h4>

        {/* Toggle */}
        <div className="flex bg-slate-900 rounded-xl p-1 gap-1">
          <button onClick={() => { setInputMode('upload'); clearRecording() }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${inputMode === 'upload' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Upload className="w-3.5 h-3.5"/> Dosya Yükle
          </button>
          <button onClick={() => setInputMode('record')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${inputMode === 'record' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Mic className="w-3.5 h-3.5"/> Canlı Kayıt
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Ses İsmi</label>
          <input value={voiceName} onChange={e => setVoiceName(e.target.value)}
            placeholder="Ahmet'in Sesi"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"/>
        </div>

        {inputMode === 'upload' ? (
          <>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-teal-500/50 rounded-xl p-6 text-center cursor-pointer transition">
              <Upload className="w-7 h-7 text-slate-500 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm">
                {fileRef.current?.files?.[0]?.name || 'Ses dosyası seçin'}
              </p>
              <p className="text-slate-600 text-xs mt-1">MP3, WAV, M4A — maks 25MB</p>
              <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                onChange={() => setVoiceName(v => v)}/>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">30 saniye – 3 dakika arası kayıt yapın.</p>

            {/* Kayıt butonu */}
            <div className="flex flex-col items-center gap-3 py-4">
              <button
                onClick={isRecording ? () => stopRecording(false) : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-500 animate-pulse scale-110'
                    : 'bg-teal-600 hover:bg-teal-500'
                }`}>
                {isRecording
                  ? <Square className="w-7 h-7 text-white"/>
                  : <Mic className="w-7 h-7 text-white"/>}
              </button>
              {isRecording && (
                <div className="flex items-center gap-2 text-red-400 font-mono text-lg font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                  {fmtTime(recordingTime)}
                  <span className="text-xs text-slate-500 font-normal">/ 3:00</span>
                </div>
              )}
              {!isRecording && recordingTime === 0 && (
                <p className="text-slate-500 text-sm">Kayıt başlatmak için tıklayın</p>
              )}
            </div>

            {/* Kaydedilen önizleme */}
            {recordedUrl && !isRecording && (
              <div className="bg-slate-900 rounded-xl p-3 flex items-center gap-3">
                <div className="text-teal-400 text-sm font-medium">
                  ✓ {fmtTime(recordingTime)} kayıt hazır
                </div>
                <audio controls src={recordedUrl} className="flex-1 h-8" style={{ colorScheme: 'dark' }}/>
                <button onClick={clearRecording} className="text-slate-500 hover:text-red-400 transition">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            )}
          </div>
        )}

        <button onClick={cloneVoice} disabled={cloning || (inputMode === 'record' && !recordedBlob && !isRecording)}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition">
          {cloning
            ? <><RefreshCw className="w-4 h-4 animate-spin"/> Kaydediliyor...</>
            : <><Mic className="w-4 h-4"/> Sesi Kaydet</>}
        </button>
      </div>

      {/* Kaydedilmiş sesler */}
      <div>
        <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400"/> Kayıtlı Seslerim ({voices.length})
        </h4>
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin"/> Yükleniyor...
          </div>
        ) : voices.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <Mic className="w-9 h-9 mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Henüz ses eklenmedi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {voices.map((v: any) => (
              <div key={v.id}
                onClick={() => onSelect(v.id, v.name, 'cloned')}
                className={`group flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedId === v.id && selectedType === 'cloned' ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${selectedId === v.id && selectedType === 'cloned' ? 'bg-teal-500/20' : 'bg-slate-700/50'}`}>
                  🎙️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{v.name}</span>
                    {selectedId === v.id && selectedType === 'cloned' && (
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(v.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={e => { e.stopPropagation(); playPreview(v) }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${playing === v.id ? 'bg-red-500' : 'bg-slate-700 hover:bg-teal-600'}`}>
                    {playing === v.id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteVoice(v.id) }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-700 hover:bg-red-600 transition">
                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-white"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SES KÜTÜPHANESİ TAB ─────────────────────────────────────────────────────

function LibraryTab({ selectedId, selectedType, onSelect }: any) {
  const [voices, setVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [lang, setLang] = useState('tr')

  useEffect(() => { loadVoices(lang) }, [lang])

  async function loadVoices(l: string) {
    setLoading(true)
    setVoices([])
    try {
      const r = await fetch(`${API}/api/voice/library-voices?language=${l}&limit=80`, { headers: authH() })
      const d = await r.json()
      setVoices(d.voices || [])
    } catch {}
    setLoading(false)
  }

  async function playPreview(voice: any) {
    if (playing === voice.id) {
      if (globalAudio) { globalAudio.pause(); globalAudio = null }
      setPlaying(null)
      return
    }
    if (globalAudio) { globalAudio.pause(); globalAudio = null }
    if (!voice.previewUrl) { setPlaying(null); return }

    setPlaying(voice.id)
    const a = new Audio(voice.previewUrl)
    globalAudio = a
    a.onended = () => { setPlaying(null); globalAudio = null }
    a.onerror = () => { setPlaying(null); globalAudio = null }
    a.play().catch(() => { setPlaying(null); globalAudio = null })
  }

  const filtered = voices.filter(v => {
    if (search && !v.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterGender && v.gender !== filterGender) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Dil seçimi */}
      <div className="flex gap-1.5 flex-wrap">
        {VOICE_LANGS.map(l => (
          <button key={l.code} onClick={() => setLang(l.code)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${lang === l.code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            <span>{l.flag}</span><span>{l.name}</span>
          </button>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ses ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
        </div>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tümü</option>
          <option value="male">Erkek</option>
          <option value="female">Kadın</option>
        </select>
      </div>

      {/* Liste */}
      <p className="text-xs text-slate-500">{LANG_MAP[lang]?.flag} {LANG_MAP[lang]?.name} — {filtered.length} ses</p>
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin"/> Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-600">
          <Volume2 className="w-9 h-9 mx-auto mb-2 opacity-30"/>
          <p className="text-sm">Ses bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((v: any) => (
            <div key={v.id}
              onClick={() => onSelect(v.id, v.name, 'library')}
              className={`group flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedId === v.id && selectedType === 'library' ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${selectedId === v.id && selectedType === 'library' ? 'bg-teal-500/20' : 'bg-slate-700/50'}`}>
                {v.gender === 'female' ? '👩' : '👨'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{v.name}</span>
                  {selectedId === v.id && selectedType === 'library' && (
                    <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {v.gender === 'female' ? 'Kadın' : 'Erkek'}{v.accent ? ` · ${v.accent}` : ''}
                </span>
              </div>
              {v.previewUrl && (
                <button onClick={e => { e.stopPropagation(); playPreview(v) }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 ${playing === v.id ? 'bg-red-500 opacity-100' : 'bg-slate-700 hover:bg-teal-600 opacity-0 group-hover:opacity-100'}`}>
                  {playing === v.id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────

export default function VoicePage() {
  const [tab, setTab] = useState<'voice' | 'dial' | 'campaign' | 'calls' | 'settings'>('voice')
  const [voiceSubTab, setVoiceSubTab] = useState<'mine' | 'library'>('mine')
  const [leads, setLeads] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [selectedVoiceType, setSelectedVoiceType] = useState<'cloned' | 'library'>('library')
  const [calling, setCalling] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(5)
  const [selectedLanguage, setSelectedLanguage] = useState('tr')
  const [filterCountry, setFilterCountry] = useState('')

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [l, c, ca, s, st] = await Promise.allSettled([
        api.get('/api/leads?limit=200'),
        fetch(`${API}/api/voice/calls?limit=30`, { headers: authH() }),
        fetch(`${API}/api/voice/campaigns`, { headers: authH() }),
        fetch(`${API}/api/voice/settings`, { headers: authH() }),
        fetch(`${API}/api/voice/stats`, { headers: authH() }),
      ])
      if (l.status === 'fulfilled') setLeads((l.value as any).leads || [])
      if (c.status === 'fulfilled') { const d = await (c.value as any).json(); setCalls(d.calls || []) }
      if (ca.status === 'fulfilled') { const d = await (ca.value as any).json(); setCampaigns(d.campaigns || []) }
      if (s.status === 'fulfilled') {
        const d = await (s.value as any).json()
        const sv = d.settings || {}
        setSettings(sv)
        setSelectedVoiceId(sv.elevenlabs_voice_id || '')
        setSelectedVoiceName(sv.voice_name || '')
        setSelectedVoiceType(sv.voice_provider === 'cloned' ? 'cloned' : 'library')
      }
      if (st.status === 'fulfilled') { const d = await (st.value as any).json(); setStats(d) }
    } catch {}
  }

  async function selectVoice(voiceId: string, voiceName: string, voiceType: 'cloned' | 'library') {
    setSelectedVoiceId(voiceId)
    setSelectedVoiceName(voiceName)
    setSelectedVoiceType(voiceType)
    if (voiceId) {
      await fetch(`${API}/api/voice/set-voice`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ voiceId, voiceName, voiceType }),
      })
      showMsg('success', `${voiceName} seçildi`)
    }
  }

  async function makeSingleCall() {
    if (!selectedLead) return showMsg('error', 'Lead seçin')
    setCalling(true)
    try {
      const r = await fetch(`${API}/api/voice/call/single`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadId: selectedLead, language: selectedLanguage }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Arama başladı!'); setTimeout(loadAll, 3000) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCalling(false)
  }

  async function startCampaign() {
    if (!selectedLeads.length) return showMsg('error', 'En az 1 lead seçin')
    setCampaignRunning(true)
    try {
      const r = await fetch(`${API}/api/voice/call/campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadIds: selectedLeads, campaignName, delayMinutes, language: selectedLanguage || undefined }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message); loadAll(); setSelectedLeads([]) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCampaignRunning(false)
  }

  async function saveSettings() {
    try {
      await fetch(`${API}/api/voice/settings`, { method: 'PATCH', headers: authH(), body: JSON.stringify(settings) })
      showMsg('success', 'Ayarlar kaydedildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const leadsWithPhone  = leads.filter(l => l.phone)
  const countries       = [...new Set(leadsWithPhone.map(l => l.country).filter(Boolean))]
  const filteredLeads   = filterCountry ? leadsWithPhone.filter(l => l.country === filterCountry) : leadsWithPhone
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4"/>
            </div>
            AI Sesli Arama
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Kendi sesiniz veya hazır sesler · 16 dil · Kişiselleştirilmiş açılış
          </p>
        </div>

        {selectedVoiceName ? (
          <div
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition ${selectedVoiceType === 'cloned' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-teal-500/10 border-teal-500/20'}`}
            onClick={() => setTab('voice')}>
            <Volume2 className={`w-4 h-4 ${selectedVoiceType === 'cloned' ? 'text-purple-400' : 'text-teal-400'}`}/>
            <span className={`text-sm font-medium ${selectedVoiceType === 'cloned' ? 'text-purple-300' : 'text-teal-300'}`}>
              {selectedVoiceName}
            </span>
            <span className={`text-xs ml-1 ${selectedVoiceType === 'cloned' ? 'text-purple-600' : 'text-teal-600'}`}>
              {selectedVoiceType === 'cloned' ? '🎙️ Kendi sesim' : '🎵 Hazır ses'}
            </span>
          </div>
        ) : (
          <button onClick={() => setTab('voice')} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4"/> Ses Seç
          </button>
        )}
      </div>

      {/* Mesaj */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-white' },
            { label: 'Tamamlanan', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Olumlu', value: stats.positive, color: 'text-teal-400' },
            { label: 'Cevap Yok', value: stats.no_answer, color: 'text-slate-400' },
            { label: 'Dakika', value: stats.totalMinutes, color: 'text-amber-400' },
            { label: 'Dil', value: Object.keys(stats.byLanguage || {}).length, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit flex-wrap">
        {[['voice','Sesler'],['dial','Tek Arama'],['campaign','Kampanya'],['calls','Aramalar'],['settings','Ayarlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* ── SESLER TAB ───────────────────────────────────────────────────────── */}
      {tab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            {/* Alt tab: Kendi Sesim / Ses Kütüphanesi */}
            <div className="flex gap-1.5 mb-5">
              <button
                onClick={() => setVoiceSubTab('mine')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${voiceSubTab === 'mine' ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                <Mic className="w-4 h-4"/> Kendi Sesim
              </button>
              <button
                onClick={() => setVoiceSubTab('library')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${voiceSubTab === 'library' ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                <Volume2 className="w-4 h-4"/> Ses Kütüphanesi
              </button>
            </div>

            {voiceSubTab === 'mine' ? (
              <MyVoicesTab
                selectedId={selectedVoiceId}
                selectedType={selectedVoiceType}
                onSelect={selectVoice}
                onMsg={showMsg}
              />
            ) : (
              <LibraryTab
                selectedId={selectedVoiceId}
                selectedType={selectedVoiceType}
                onSelect={selectVoice}
              />
            )}
          </div>

          {/* Sağ panel: bilgi */}
          <div className="space-y-4">
            {selectedVoiceName && (
              <div className={`p-4 border rounded-2xl ${selectedVoiceType === 'cloned' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-teal-500/10 border-teal-500/20'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className={`w-4 h-4 ${selectedVoiceType === 'cloned' ? 'text-purple-400' : 'text-teal-400'}`}/>
                  <span className={`text-sm font-semibold ${selectedVoiceType === 'cloned' ? 'text-purple-300' : 'text-teal-300'}`}>
                    Aktif Ses
                  </span>
                </div>
                <p className="text-white font-medium">{selectedVoiceName}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedVoiceType === 'cloned'
                    ? 'Kendi sesinizle arama yapılacak'
                    : 'Hazır ses ile arama yapılacak'}
                </p>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
              <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400"/> İki Arama Yolu
              </h4>
              {[
                { icon: '🎙️', title: 'Kendi Sesim', desc: 'Sesinizi yükleyin, sisteme kaydedin. Aramalar kendi sesinizle yapılır.' },
                { icon: '🎵', title: 'Ses Kütüphanesi', desc: 'Hazır profesyonel seslerden seçin. Anında kullanıma hazır.' },
              ].map(p => (
                <div key={p.title} className="p-3 bg-slate-900 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{p.icon}</span>
                    <span className="text-white text-sm font-medium">{p.title}</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400"/> Desteklenen Diller
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {VOICE_LANGS.map(l => (
                  <div key={l.code} className="flex items-center gap-2 text-xs">
                    <span>{l.flag}</span>
                    <span className="text-slate-400">{l.name}</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto"/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEK ARAMA TAB ─────────────────────────────────────────────────────── */}
      {tab === 'dial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-teal-400"/> Tek Lead Ara
            </h3>
            {selectedVoiceName ? (
              <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${selectedVoiceType === 'cloned' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-teal-500/10 border-teal-500/20 text-teal-300'}`}>
                <Volume2 className="w-3.5 h-3.5"/>
                {selectedVoiceName}
                <span className="text-slate-500 ml-auto">{selectedVoiceType === 'cloned' ? 'Kendi sesim' : 'Hazır ses'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5"/> Önce "Sesler" tabından ses seçin
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Arama Dili</label>
              <div className="grid grid-cols-4 gap-1.5">
                {VOICE_LANGS.slice(0, 12).map(l => (
                  <button key={l.code} onClick={() => setSelectedLanguage(l.code)}
                    className={`p-2 rounded-xl border text-xs transition-all ${selectedLanguage === l.code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <div className="text-base mb-0.5">{l.flag}</div>
                    <div className="truncate">{l.name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Lead Seç</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="">Lead seçin</option>
                {leadsWithPhone.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} {l.country ? `(${l.country})` : ''} — {l.phone}</option>
                ))}
              </select>
            </div>
            <button onClick={makeSingleCall} disabled={calling || !selectedLead || !selectedVoiceName}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {calling ? <><RefreshCw className="w-4 h-4 animate-spin"/> Arınıyor...</> : <><Phone className="w-4 h-4"/> Şimdi Ara</>}
            </button>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400"/> Nasıl Çalışır?
            </h3>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Ses Seç', desc: 'Kendi sesiniz veya hazır ses kütüphanesinden seçim yapın', color: 'bg-teal-500/20 text-teal-400' },
                { step: '2', title: 'Araştırma', desc: 'Yapay zeka şirketi araştırır, ilgi alanlarını tespit eder', color: 'bg-blue-500/20 text-blue-400' },
                { step: '3', title: 'Kişisel Açılış', desc: 'Her lead için özel, doğal açılış cümlesi üretilir', color: 'bg-purple-500/20 text-purple-400' },
                { step: '4', title: 'Arama Yapılır', desc: 'Seçtiğiniz sesle gerçekçi, doğal konuşma', color: 'bg-amber-500/20 text-amber-400' },
                { step: '5', title: 'Analiz & CRM', desc: 'Transkript, ilgi skoru ve not otomatik kaydedilir', color: 'bg-emerald-500/20 text-emerald-400' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${s.color}`}>{s.step}</div>
                  <div>
                    <div className="text-white text-sm font-medium">{s.title}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KAMPANYA TAB ─────────────────────────────────────────────────────── */}
      {tab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400"/> Toplu Arama Kampanyası
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Kampanya Adı</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  placeholder="Mayıs 2026 Kampanyası"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Aramalar Arası Bekleme</label>
                <select value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm">
                  {[2,5,10,15,30].map(m => <option key={m} value={m}>{m} dakika</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Dil</label>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setSelectedLanguage('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!selectedLanguage ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  Otomatik (ülkeye göre)
                </button>
                {VOICE_LANGS.map(l => (
                  <button key={l.code} onClick={() => setSelectedLanguage(l.code)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${selectedLanguage === l.code ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {l.flag} {l.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 shrink-0">Ülke filtresi:</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
                <option value="">Tüm Ülkeler</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">{selectedLeads.length} / {filteredLeads.length} seçili</label>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))} className="text-xs text-teal-400">Tümünü Seç</button>
                  <button onClick={() => setSelectedLeads([])} className="text-xs text-slate-500">Temizle</button>
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto bg-slate-900 rounded-xl p-2 space-y-1">
                {filteredLeads.map(l => (
                  <label key={l.id} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-800 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                      className="accent-teal-500"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{l.company_name}</div>
                      <div className="text-slate-500 text-xs">{l.phone} {l.country && `· ${l.country}`}</div>
                    </div>
                  </label>
                ))}
                {filteredLeads.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Telefon numarası olan lead yok</p>}
              </div>
            </div>
            <button onClick={startCampaign} disabled={campaignRunning || !selectedLeads.length || !selectedVoiceName}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {campaignRunning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Çalışıyor...</> : <><Zap className="w-4 h-4"/> {selectedLeads.length} Leadi Ara</>}
            </button>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">Geçmiş Kampanyalar</h3>
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="p-3 bg-slate-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-xs font-medium truncate">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {c.status === 'completed' ? 'Bitti' : 'Devam'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{c.calls_made}/{c.total_leads} arama</div>
                  <div className="mt-1.5 h-1 bg-slate-700 rounded-full">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.total_leads ? (c.calls_made/c.total_leads)*100 : 0}%` }}/>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Kampanya yok</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── ARAMALAR TAB ──────────────────────────────────────────────────────── */}
      {tab === 'calls' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Arama Geçmişi</h3>
            <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500 text-xs">
                  <th className="text-left px-4 py-3">Lead</th>
                  <th className="text-left px-4 py-3">Numara</th>
                  <th className="text-center px-4 py-3">Dil</th>
                  <th className="text-center px-4 py-3">Durum</th>
                  <th className="text-center px-4 py-3">Sonuç</th>
                  <th className="text-right px-4 py-3">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="text-white text-xs font-medium">{c.leads?.company_name || '—'}</div>
                      <div className="text-slate-500 text-xs">{c.leads?.country || ''}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.callee_number}</td>
                    <td className="px-4 py-3 text-center text-lg">{LANG_MAP[c.language]?.flag || '🌍'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={c.status}/></td>
                    <td className="px-4 py-3 text-center">
                      {c.outcome === 'positive' ? <span className="text-emerald-400 text-xs">Olumlu</span>
                        : c.outcome === 'negative' ? <span className="text-red-400 text-xs">Olumsuz</span>
                        : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calls.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                <Phone className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Henüz arama yapılmamış</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AYARLAR TAB ───────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400"/> Temsilci Profili
          </h3>
          {[
            { key: 'agent_name',          label: 'Temsilci Adı',    ph: 'Ahmet' },
            { key: 'company_name',        label: 'Şirket Adı',      ph: 'Şirketiniz' },
            { key: 'product_description', label: 'Ürün / Hizmet',   ph: 'Ne sattığınızı kısaca açıklayın' },
            { key: 'transfer_number',     label: 'Transfer Numarası', ph: 'İnsan temsilciye bağlantı' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
              <input value={settings[key] || ''} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
            </div>
          ))}
          <button onClick={saveSettings} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium">
            Kaydet
          </button>
        </div>
      )}
    </div>
  )
}
