'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, Mic, Upload, Play, Square,
  CheckCircle, AlertTriangle, RefreshCw, Zap, Volume2,
  Globe2, Search, Settings, Sparkles, Shield, Star
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

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  azure:    { label: 'Azure Neural', color: 'bg-blue-500/20 text-blue-300' },
  cartesia: { label: 'Cartesia Sonic', color: 'bg-purple-500/20 text-purple-300' },
  elevenlabs: { label: 'ElevenLabs', color: 'bg-amber-500/20 text-amber-300' },
}

const CATEGORY_LABELS: Record<string, string> = {
  professional: '💼 Profesyonel',
  warm:         '😊 Sıcak',
  energetic:    '⚡ Enerjik',
  news:         '📰 Haber',
  general:      '🎙️ Genel',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:  { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-400' },
    calling:    { label: 'Arıyor', cls: 'bg-blue-500/15 text-blue-400 animate-pulse' },
    initiating: { label: 'Başlatılıyor', cls: 'bg-amber-500/15 text-amber-400' },
    'no-answer':{ label: 'Cevap Yok', cls: 'bg-slate-500/15 text-slate-400' },
    failed:     { label: 'Başarısız', cls: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

let globalAudio: HTMLAudioElement | null = null

function VoiceCard({ voice, selected, onSelect, playing, onPlay }: any) {
  const isPlaying = playing === voice.voice_id
  const providerInfo = PROVIDER_LABELS[voice.provider] || { label: voice.provider, color: 'bg-slate-500/20 text-slate-300' }
  const emoji = voice.gender === 'female' ? '👩' : voice.gender === 'male' ? '👨' : '🎙️'

  async function handlePlay(e: React.MouseEvent) {
    e.stopPropagation()
    if (playing === voice.voice_id) {
      if (globalAudio) { globalAudio.pause(); globalAudio = null }
      onPlay(null)
      return
    }
    if (globalAudio) { globalAudio.pause(); globalAudio = null }
    onPlay(voice.voice_id)

    try {
      const previewUrl = `${API}/api/voice-library/preview?voiceId=${encodeURIComponent(voice.voice_id)}&lang=${voice.language}&provider=${voice.provider}`
      const audio = new Audio(previewUrl)
      // Need auth header — fetch blob first
      const resp = await fetch(previewUrl, { headers: { Authorization: `Bearer ${getToken()}` } })
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = new Audio(blobUrl)
      globalAudio = a
      a.onended = () => { onPlay(null); globalAudio = null; URL.revokeObjectURL(blobUrl) }
      a.onerror = () => { onPlay(null); globalAudio = null }
      a.play().catch(() => { onPlay(null); globalAudio = null })
    } catch { onPlay(null) }
  }

  return (
    <div onClick={() => onSelect(voice.voice_id, voice.name, voice.provider)}
      className={`group flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selected ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${selected ? 'bg-teal-500/20' : 'bg-slate-700/50'}`}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-sm font-medium truncate">{voice.name}</span>
          {selected && <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 flex gap-1.5 flex-wrap">
          {voice.gender && <span>{voice.gender === 'female' ? 'Kadın' : voice.gender === 'male' ? 'Erkek' : 'Nötr'}</span>}
          {voice.category && <span>· {CATEGORY_LABELS[voice.category] || voice.category}</span>}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${providerInfo.color}`}>{providerInfo.label}</span>
        </div>
      </div>
      <button onClick={handlePlay}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-red-500 opacity-100' : 'bg-slate-700 hover:bg-teal-600 opacity-0 group-hover:opacity-100'}`}>
        {isPlaying ? <Square className="w-3.5 h-3.5 text-white"/> : <Play className="w-3.5 h-3.5 text-slate-300"/>}
      </button>
    </div>
  )
}

function VoiceLibrary({ selectedId, selectedName, onSelect }: any) {
  const [voices, setVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [voiceLang, setVoiceLang] = useState('tr')
  const [providerStats, setProviderStats] = useState<any>(null)

  useEffect(() => { loadVoices(voiceLang) }, [voiceLang])

  async function loadVoices(lang: string) {
    setLoading(true)
    setVoices([])
    try {
      const r = await fetch(`${API}/api/voice-library/voices/${lang}`, { headers: authH() })
      const d = await r.json()
      setVoices(d.voices || [])
      if (d.providers) setProviderStats(d.providers)
    } catch {}
    setLoading(false)
  }

  async function loadAllVoices() {
    setLoading(true)
    setVoices([])
    try {
      const params = new URLSearchParams({ limit: '300' })
      if (filterGender) params.set('gender', filterGender)
      if (filterProvider) params.set('provider', filterProvider)
      if (filterCategory) params.set('category', filterCategory)
      if (search) params.set('search', search)
      const r = await fetch(`${API}/api/voice-library/voices?${params}`, { headers: authH() })
      const d = await r.json()
      setVoices(d.voices || [])
      if (d.providers) setProviderStats(d.providers)
    } catch {}
    setLoading(false)
  }

  const filtered = voices.filter(v => {
    if (search && !v.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterGender && v.gender !== filterGender) return false
    if (filterProvider && v.provider !== filterProvider) return false
    if (filterCategory && v.category !== filterCategory) return false
    return true
  })

  return (
    <div className="space-y-4">
      {selectedName && (
        <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0"/>
          <span className="text-teal-300 text-sm font-medium">Seçili: {selectedName}</span>
          <span className="ml-auto text-xs text-teal-500">Aktif</span>
        </div>
      )}

      {providerStats && (
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            <Shield className="w-3 h-3"/> Azure Neural: {providerStats.azure}+
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
            <Star className="w-3 h-3"/> Cartesia: {providerStats.cartesia}
          </div>
        </div>
      )}

      {/* Dil seçimi */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Dile göre ses ara:</p>
        <div className="flex gap-1.5 flex-wrap">
          {VOICE_LANGS.map(lang => (
            <button key={lang.code} onClick={() => setVoiceLang(lang.code)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${voiceLang === lang.code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Arama ve filtreler */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ses ara..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
        </div>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tüm Cinsiyet</option>
          <option value="male">Erkek</option>
          <option value="female">Kadın</option>
          <option value="neutral">Nötr</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tüm Kategori</option>
          <option value="professional">💼 Profesyonel</option>
          <option value="warm">😊 Sıcak</option>
          <option value="energetic">⚡ Enerjik</option>
          <option value="news">📰 Haber</option>
          <option value="general">🎙️ Genel</option>
        </select>
        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tüm Provider</option>
          <option value="azure">Azure Neural</option>
          <option value="cartesia">Cartesia Sonic</option>
        </select>
      </div>

      {/* Ses listesi */}
      <div>
        <p className="text-xs text-slate-500 mb-2">
          {LANG_MAP[voiceLang]?.flag} {LANG_MAP[voiceLang]?.name} Sesleri ({filtered.length})
        </p>
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-400"/>
            <p className="text-slate-500 text-sm">Sesler yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <Volume2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Ses bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-[450px] overflow-y-auto pr-1">
            {filtered.map((voice: any) => (
              <VoiceCard key={voice.voice_id} voice={voice}
                selected={selectedId === voice.voice_id}
                onSelect={onSelect} playing={playing} onPlay={setPlaying}/>
            ))}
          </div>
        )}
      </div>
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
  const [calling, setCalling] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(5)
  const [selectedLanguage, setSelectedLanguage] = useState('tr')
  const [filterCountry, setFilterCountry] = useState('')
  const [providerStatus, setProviderStatus] = useState<any>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [l, c, ca, s, st, ps] = await Promise.allSettled([
        api.get('/api/leads?limit=200'),
        fetch(`${API}/api/voice/calls?limit=30`, { headers: authH() }),
        fetch(`${API}/api/voice/campaigns`, { headers: authH() }),
        fetch(`${API}/api/voice/settings`, { headers: authH() }),
        fetch(`${API}/api/voice/stats`, { headers: authH() }),
        fetch(`${API}/api/voice/provider-status`, { headers: authH() }),
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
      if (ps.status === 'fulfilled') { const d = await (ps.value as any).json(); setProviderStatus(d) }
    } catch {}
  }

  async function selectVoice(voiceId: string, voiceName: string) {
    setSelectedVoiceId(voiceId); setSelectedVoiceName(voiceName)
    await fetch(`${API}/api/voice/set-voice`, {
      method: 'POST', headers: authH(),
      body: JSON.stringify({ voiceId, voiceName }),
    })
    showMsg('success', `${voiceName} sesi seçildi`)
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
          <p className="text-slate-400 text-sm mt-1">
            Azure Neural TTS · Cartesia Sonic · Vapi.ai · %100 insan sesi · 16 dil · 400+ ses
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {providerStatus && (
            <div className="flex gap-2">
              {providerStatus.vapi && (
                <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-lg flex items-center gap-1">
                  <Shield className="w-3 h-3"/> Vapi
                </span>
              )}
              {providerStatus.azure && (
                <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-lg flex items-center gap-1">
                  <Shield className="w-3 h-3"/> Azure Neural
                </span>
              )}
            </div>
          )}
          {selectedVoiceName ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl cursor-pointer" onClick={() => setTab('voice')}>
              <Volume2 className="w-4 h-4 text-teal-400"/>
              <span className="text-teal-400 text-sm font-medium">{selectedVoiceName}</span>
              <span className="text-teal-600 text-xs ml-1">değiştir</span>
            </div>
          ) : (
            <button onClick={() => setTab('voice')} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4"/> Ses Seç
            </button>
          )}
        </div>
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
        {[['voice','Sesler'],['dial','Tek Arama'],['campaign','Kampanya'],['calls','Aramalar'],['settings','Ayarlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {tab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Volume2 className="w-4 h-4 text-teal-400"/> Ses Kütüphanesi (400+ Azure Neural · 8 Cartesia Sonic)
            </h3>
            <VoiceLibrary selectedId={selectedVoiceId} selectedName={selectedVoiceName} onSelect={selectVoice}/>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400"/> Provider Karşılaştırma
              </h3>
              {[
                { name: 'Azure Neural', desc: 'Video & kampanya için — 400+ ses, 140 dil, ElevenLabs kalitesi', color: 'border-blue-500/30 bg-blue-500/5', badge: '💼 Video' },
                { name: 'Cartesia Sonic', desc: 'Gerçek zamanlı aramalar için — 90ms gecikme, Vapi entegrasyonu', color: 'border-purple-500/30 bg-purple-500/5', badge: '📞 Canlı' },
              ].map(p => (
                <div key={p.name} className={`p-3 rounded-xl border ${p.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{p.badge}</span>
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
                {VOICE_LANGS.map(lang => (
                  <div key={lang.code} className="flex items-center gap-2 text-xs">
                    <span>{lang.flag}</span>
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
                {VOICE_LANGS.slice(0, 12).map(lang => (
                  <button key={lang.code} onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-2 rounded-xl border text-xs transition-all ${selectedLanguage === lang.code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <div className="text-base mb-0.5">{lang.flag}</div>
                    <div className="truncate">{lang.name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Lead Seç</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="">Lead seçin (telefonu olanlar)</option>
                {leadsWithPhone.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} {l.country ? `(${l.country})` : ''} — {l.phone}</option>
                ))}
              </select>
            </div>
            <button onClick={makeSingleCall} disabled={calling || !selectedLead}
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
                { step: '1', title: 'Araştırma', desc: 'Claude şirketi Perplexity ile araştırır', color: 'bg-blue-500/20 text-blue-400' },
                { step: '2', title: 'Kişiselleştirilmiş Açılış', desc: 'Claude Haiku lead\'e özel açılış cümlesi üretir', color: 'bg-teal-500/20 text-teal-400' },
                { step: '3', title: 'Vapi Arar', desc: 'Cartesia Sonic (90ms) ile gerçekçi ses', color: 'bg-purple-500/20 text-purple-400' },
                { step: '4', title: 'Claude Yönetir', desc: 'Doğal konuşma akışı, backchanneling', color: 'bg-amber-500/20 text-amber-400' },
                { step: '5', title: 'AI Analiz', desc: 'Transcript, ilgi skoru ve CRM notu otomatik', color: 'bg-emerald-500/20 text-emerald-400' },
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
              <Zap className="w-4 h-4 text-amber-400"/> Toplu Arama Kampanyası
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Kampanya Adı</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  placeholder="Nisan 2026 İhracat"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Bekleme</label>
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
                {VOICE_LANGS.map(lang => (
                  <button key={lang.code} onClick={() => setSelectedLanguage(lang.code)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${selectedLanguage === lang.code ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 shrink-0">Ülke filtresi:</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
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
            <button onClick={startCampaign} disabled={campaignRunning || !selectedLeads.length}
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

      {tab === 'settings' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400"/> Temsilci Profili
          </h3>
          {[
            { key: 'agent_name', label: 'Temsilci Adı', ph: 'Ahmet' },
            { key: 'company_name', label: 'Şirket Adı', ph: 'Şirketiniz' },
            { key: 'product_description', label: 'Ürün/Hizmet', ph: 'Ne sattığınızı kısaca açıklayın' },
            { key: 'transfer_number', label: 'Transfer Numarası', ph: 'İnsan temsilciye bağlantı' },
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
