'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, Mic, Upload, Play, Square,
  CheckCircle, AlertTriangle, RefreshCw, Zap, Volume2,
  Globe2, Search, Settings, ArrowRight, Sparkles
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const LANGUAGES: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Turkce', flag: '🇹🇷' },
  en: { name: 'Ingilizce', flag: '🇬🇧' },
  de: { name: 'Almanca', flag: '🇩🇪' },
  fr: { name: 'Fransizca', flag: '🇫🇷' },
  ar: { name: 'Arapca', flag: '🇸🇦' },
  ru: { name: 'Rusca', flag: '🇷🇺' },
  az: { name: 'Azerbaycanca', flag: '🇦🇿' },
  it: { name: 'Italyanca', flag: '🇮🇹' },
  es: { name: 'Ispanyolca', flag: '🇪🇸' },
  nl: { name: 'Hollandaca', flag: '🇳🇱' },
  zh: { name: 'Cince', flag: '🇨🇳' },
  ja: { name: 'Japonca', flag: '🇯🇵' },
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Tamamlandi', cls: 'bg-emerald-500/15 text-emerald-400' },
    calling: { label: 'Ariyor', cls: 'bg-blue-500/15 text-blue-400 animate-pulse' },
    initiating: { label: 'Baslatiliyor', cls: 'bg-amber-500/15 text-amber-400' },
    'no-answer': { label: 'Cevap Yok', cls: 'bg-slate-500/15 text-slate-400' },
    failed: { label: 'Basarisiz', cls: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

function VoiceCard({ voice, selected, onSelect, onPreview, playing }: any) {
  const isPlaying = playing === voice.voice_id
  const emoji = voice.category === 'cloned' ? '🎤' : voice.gender === 'female' ? '👩' : '👨'
  return (
    <div onClick={() => onSelect(voice.voice_id, voice.name, voice.preview_url)}
      className={`group flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selected ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${selected ? 'bg-teal-500/20' : 'bg-slate-700/50'}`}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">{voice.name}</span>
          {selected && <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {voice.gender && <span className="text-xs text-slate-500">{voice.gender === 'female' ? 'Kadin' : 'Erkek'}</span>}
          {voice.accent && <span className="text-xs text-slate-600">· {voice.accent}</span>}
          {voice.use_case && <span className="text-xs text-slate-600">· {voice.use_case}</span>}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onPreview(voice.voice_id, voice.preview_url) }}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-teal-600' : 'bg-slate-700 hover:bg-teal-600/50 opacity-0 group-hover:opacity-100'}`}>
        {isPlaying ? <Square className="w-3.5 h-3.5 text-white"/> : <Play className="w-3.5 h-3.5 text-slate-300"/>}
      </button>
    </div>
  )
}

const VOICE_LANGUAGES = [
  { code: 'tr', name: 'Turkce', flag: '🇹🇷' },
  { code: 'en', name: 'Ingilizce', flag: '🇬🇧' },
  { code: 'de', name: 'Almanca', flag: '🇩🇪' },
  { code: 'ar', name: 'Arapca', flag: '🇸🇦' },
  { code: 'fr', name: 'Fransizca', flag: '🇫🇷' },
  { code: 'es', name: 'Ispanyolca', flag: '🇪🇸' },
  { code: 'pt', name: 'Portekizce', flag: '🇵🇹' },
  { code: 'it', name: 'Italyanca', flag: '🇮🇹' },
  { code: 'ru', name: 'Rusca', flag: '🇷🇺' },
  { code: 'nl', name: 'Hollandaca', flag: '🇳🇱' },
  { code: 'zh', name: 'Cince', flag: '🇨🇳' },
  { code: 'ja', name: 'Japonca', flag: '🇯🇵' },
  { code: 'ko', name: 'Korece', flag: '🇰🇷' },
  { code: 'hi', name: 'Hintce', flag: '🇮🇳' },
  { code: 'pl', name: 'Lehce', flag: '🇵🇱' },
  { code: 'uk', name: 'Ukraynaca', flag: '🇺🇦' },
]

function VoiceLibrary({ selectedId, selectedName, onSelect, previewLang }: any) {
  const [voices, setVoices] = useState<any>({ my: [], cloned: [], turkish: [], language: [], all: [], professional: [] })
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [activeTab, setActiveTab] = useState<'language' | 'turkish' | 'professional' | 'my' | 'cloned'>('language')
  const [selectedVoiceLang, setSelectedVoiceLang] = useState('tr')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { loadVoices(selectedVoiceLang) }, [selectedVoiceLang])

  async function loadVoices(lang: string) {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/voice/eleven-voices?language=${lang}`, { headers: authH() })
      const d = await r.json()
      setVoices(d.categories || {})
    } catch {}
    setLoading(false)
  }

  async function previewVoice(voiceId: string, previewUrl?: string) {
    if (playing === voiceId) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    setPlaying(voiceId)
    try {
      // Direkt ElevenLabs CDN'den cal - en hizli
      if (previewUrl) {
        const audio = new Audio(previewUrl)
        audio.onended = () => setPlaying(null)
        audio.onerror = () => setPlaying(null)
        await audio.play()
        if (audioRef.current) {
          audioRef.current.src = previewUrl
        }
        return
      }
      // preview_url yoksa backend'den
      const r = await fetch(`${API}/api/voice/preview-voice`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ voiceId, language: previewLang }),
      })
      if (!r.ok) { setPlaying(null); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => setPlaying(null)
      audio.play()
    } catch { setPlaying(null) }
  }

  const selectedLangInfo = VOICE_LANGUAGES.find(l => l.code === selectedVoiceLang)
  const tabs = [
    { key: 'language', label: `${selectedLangInfo?.flag || '🌍'} ${selectedLangInfo?.name || 'Dil'} (${voices.language?.length || 0})`, count: undefined },
    { key: 'professional', label: '💼 Profesyonel', count: voices.professional?.length },
    { key: 'my', label: '⭐ Seslerim', count: voices.my?.length },
    { key: 'cloned', label: '🎤 Klonlanmis', count: voices.cloned?.length },
  ]

  const currentList = (voices[activeTab] || []).filter((v: any) => {
    if (search && !v.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterGender && v.gender !== filterGender) return false
    return true
  })

  const tabCls = (t: string) => `px-3 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === t ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`

  return (
    <div className="space-y-4">
      <audio ref={audioRef} className="hidden"/>
      {selectedName && (
        <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0"/>
          <span className="text-teal-300 text-sm font-medium">Secili: {selectedName}</span>
          <span className="ml-auto text-xs text-teal-500">Aktif</span>
        </div>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} className={tabCls(t.key)}>
            {t.label} {t.count !== undefined && <span className="ml-1 text-xs opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ses ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
        </div>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tum</option>
          <option value="male">Erkek</option>
          <option value="female">Kadin</option>
        </select>
      </div>
      {loading ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-400"/>
          <p className="text-slate-500 text-sm">Ses kutuphanesi yukleniyor...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <Volume2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
          <p className="text-sm">{activeTab === 'cloned' ? 'Klonlanmis ses yok.' : 'Ses bulunamadi'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {currentList.map((voice: any) => (
            <VoiceCard key={voice.voice_id} voice={voice}
              selected={selectedId === voice.voice_id}
              onSelect={onSelect} onPreview={previewVoice} playing={playing}/>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VoicePage() {
  const [tab, setTab] = useState<'voice' | 'dial' | 'campaign' | 'calls' | 'settings'>('voice')
  const [leads, setLeads] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [previewLang, setPreviewLang] = useState('tr')
  const [calling, setCalling] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [cloning, setCloning] = useState(false)
  const [cloningName, setCloningName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
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
        setSettings(d.settings || {})
        setSelectedVoiceId(d.settings?.elevenlabs_voice_id || '')
        setSelectedVoiceName(d.settings?.voice_name || '')
      }
      if (st.status === 'fulfilled') { const d = await (st.value as any).json(); setStats(d) }
    } catch {}
  }

  async function selectVoice(voiceId: string, voiceName: string, previewUrl?: string) {
    setSelectedVoiceId(voiceId); setSelectedVoiceName(voiceName)
    await fetch(`${API}/api/voice/set-voice`, {
      method: 'POST', headers: authH(),
      body: JSON.stringify({ voiceId, voiceName }),
    })
    showMsg('success', `${voiceName} sesi secildi`)
  }

  async function cloneVoice() {
    if (!fileRef.current?.files?.[0]) return showMsg('error', 'Ses dosyasi secin')
    setCloning(true)
    try {
      const form = new FormData()
      form.append('audio', fileRef.current.files[0])
      form.append('name', cloningName || 'Sesim')
      const r = await fetch(`${API}/api/voice/clone`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Sesiniz klonlandi!'); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCloning(false)
  }

  async function makeSingleCall() {
    if (!selectedLead) return showMsg('error', 'Lead secin')
    setCalling(true)
    try {
      const r = await fetch(`${API}/api/voice/call/single`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadId: selectedLead, language: selectedLanguage }),
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Arama ElevenLabs uzerinden basladi!'); setTimeout(loadAll, 3000) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCalling(false)
  }

  async function startCampaign() {
    if (!selectedLeads.length) return showMsg('error', 'En az 1 lead secin')
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

  const leadsWithPhone = leads.filter(l => l.phone)
  const countries = [...new Set(leadsWithPhone.map(l => l.country).filter(Boolean))]
  const filteredLeads = filterCountry ? leadsWithPhone.filter(l => l.country === filterCountry) : leadsWithPhone
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4"/>
            </div>
            AI Sesli Arama
          </h1>
          <p className="text-slate-400 text-sm mt-1">ElevenLabs + Claude Sonnet · %100 insan sesi · 12 dil</p>
        </div>
        {selectedVoiceName ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl cursor-pointer" onClick={() => setTab('voice')}>
            <Volume2 className="w-4 h-4 text-teal-400"/>
            <span className="text-teal-400 text-sm font-medium">{selectedVoiceName}</span>
            <span className="text-teal-600 text-xs">degistir</span>
          </div>
        ) : (
          <button onClick={() => setTab('voice')} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4"/> Ses Sec
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

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

      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit flex-wrap">
        {[['voice','🎤 Sesler'],['dial','📞 Tek Arama'],['campaign','🚀 Kampanya'],['calls','📋 Aramalar'],['settings','⚙️ Ayarlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {tab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal-400"/> Ses Kutuphanesi
              </h3>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-slate-500">Onizleme dili:</span>
                <select value={previewLang} onChange={e => setPreviewLang(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                  {Object.entries(LANGUAGES).map(([code, l]) => (
                    <option key={code} value={code}>{l.flag} {l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <VoiceLibrary selectedId={selectedVoiceId} selectedName={selectedVoiceName} onSelect={selectVoice} previewLang={previewLang}/>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400"/> Kendi Sesini Klonla
              </h3>
              <p className="text-slate-400 text-sm">30 saniye - 3 dakika ses kaydi yukleyin.</p>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Ses Ismi</label>
                <input value={cloningName} onChange={e => setCloningName(e.target.value)}
                  placeholder="Ahmetin Sesi"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"/>
              </div>
              <div className="border-2 border-dashed border-slate-700 hover:border-purple-500/50 rounded-xl p-6 text-center transition cursor-pointer"
                onClick={() => fileRef.current?.click()}>
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">Ses dosyasi secin</p>
                <p className="text-slate-600 text-xs mt-1">MP3, WAV, M4A max 10MB</p>
                <input ref={fileRef} type="file" accept="audio/*" className="hidden"/>
              </div>
              <button onClick={cloneVoice} disabled={cloning}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                {cloning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Klonlaniyor...</> : <><Mic className="w-4 h-4"/> Sesimi Klonla</>}
              </button>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400"/> Desteklenen Diller
              </h4>
              <div className="space-y-1.5">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span className="text-base">{lang.flag}</span>
                    <span className="text-slate-400">{lang.name}</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto"/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'dial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-teal-400"/> Tek Lead Ara
            </h3>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Arama Dili</label>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button key={code} onClick={() => setSelectedLanguage(code)}
                    className={`p-2 rounded-xl border text-xs transition-all ${selectedLanguage === code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <div className="text-base mb-0.5">{lang.flag}</div>
                    <div className="truncate">{lang.name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Lead Sec</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="">Lead secin (telefonu olanlar)</option>
                {leadsWithPhone.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} {l.country ? `(${l.country})` : ''} — {l.phone}</option>
                ))}
              </select>
            </div>
            <button onClick={makeSingleCall} disabled={calling || !selectedLead}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {calling ? <><RefreshCw className="w-4 h-4 animate-spin"/> Araniyor...</> : <><Phone className="w-4 h-4"/> Simdi Ara</>}
            </button>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400"/> Nasil Calisir?
            </h3>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Ses Sec', desc: 'ElevenLabs kutuphanesinden ses sec veya kendi sesini klonla', color: 'bg-teal-500/20 text-teal-400' },
                { step: '2', title: 'Lead & Dil', desc: 'Aranacak leadi ve konusma dilini sec', color: 'bg-blue-500/20 text-blue-400' },
                { step: '3', title: 'Arama Baslar', desc: 'ElevenLabs AI secilen sesle musteri arar', color: 'bg-purple-500/20 text-purple-400' },
                { step: '4', title: 'Claude Yonetir', desc: 'Konusmayi Claude Sonnet yonetir, satis yapar', color: 'bg-amber-500/20 text-amber-400' },
                { step: '5', title: 'Analiz Gelir', desc: 'Arama bittikten sonra transcript ve analiz gelir', color: 'bg-emerald-500/20 text-emerald-400' },
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

      {tab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400"/> Toplu Arama Kampanyasi
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Kampanya Adi</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  placeholder="Nisan 2026 Ihracat"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Bekleme Suresi</label>
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
                  🌍 Otomatik
                </button>
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button key={code} onClick={() => setSelectedLanguage(code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${selectedLanguage === code ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 shrink-0">Ulke filtresi:</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">Tum Ulkeler</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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
                      className="accent-teal-500"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{l.company_name}</div>
                      <div className="text-slate-500 text-xs">{l.phone} {l.country && `· ${l.country}`}</div>
                    </div>
                  </label>
                ))}
                {filteredLeads.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Telefon numarasi olan lead yok</p>}
              </div>
            </div>
            <button onClick={startCampaign} disabled={campaignRunning || !selectedLeads.length}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {campaignRunning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Calisiyor...</> : <><Zap className="w-4 h-4"/> {selectedLeads.length} Leadi Ara</>}
            </button>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">Gecmis Kampanyalar</h3>
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

      {tab === 'calls' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Arama Gecmisi</h3>
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
                  <th className="text-center px-4 py-3">Sonuc</th>
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
                    <td className="px-4 py-3 text-center text-lg">{LANGUAGES[c.language]?.flag || '🌍'}</td>
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
                <p className="text-sm">Henuz arama yapilmamis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400"/> Temsilci Profili
          </h3>
          {[
            { key: 'agent_name', label: 'Temsilci Adi', ph: 'Ahmet' },
            { key: 'company_name', label: 'Sirket Adi', ph: 'Sirketiniz' },
            { key: 'product_description', label: 'Urun/Hizmet', ph: 'Ne sattiginizi kisaca aciklayin' },
            { key: 'transfer_number', label: 'Transfer Numarasi', ph: 'Insan temsilciye baglanti' },
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