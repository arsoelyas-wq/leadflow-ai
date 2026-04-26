'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, Mic, MicOff, Upload, Play, Square,
  CheckCircle, AlertTriangle, RefreshCw, Plus, Settings,
  Users, Clock, TrendingUp, X, Zap, Volume2, Globe,
  BarChart2, Activity, Star, ArrowRight, ChevronRight,
  Search, Filter, Globe2
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH(json = true) {
  const h: any = { Authorization: `Bearer ${getToken()}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

const LANGUAGES: Record<string, { name: string; flag: string }> = {
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
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-400' },
    calling: { label: 'Arıyor', cls: 'bg-blue-500/15 text-blue-400 animate-pulse' },
    initiating: { label: 'Başlatılıyor', cls: 'bg-amber-500/15 text-amber-400' },
    'no-answer': { label: 'Cevap Yok', cls: 'bg-slate-500/15 text-slate-400' },
    failed: { label: 'Başarısız', cls: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

// ── SES SEÇİM SAYFASI ─────────────────────────────────────
function VoiceSelector({ onSelect, selectedId }: { onSelect: (id: string, name: string) => void; selectedId?: string }) {
  const [voices, setVoices] = useState<any>({ cloned: [], turkish: [], professional: [], all: [] })
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'turkish' | 'professional' | 'cloned' | 'all'>('turkish')
  const [previewLang, setPreviewLang] = useState('tr')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(`${API}/api/voice/eleven-voices`, { headers: authH() })
      .then(r => r.json())
      .then(d => setVoices(d.voices || {}))
      .finally(() => setLoading(false))
  }, [])

  async function previewVoice(voiceId: string) {
    if (playing === voiceId) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    setPlaying(voiceId)
    try {
      const r = await fetch(`${API}/api/voice/preview-voice`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ voiceId, language: previewLang }),
      })
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.onended = () => setPlaying(null)
        audioRef.current.play()
      }
    } catch { setPlaying(null) }
  }

  const currentVoices = (voices[activeTab] || []).filter((v: any) =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase())
  )

  const tabCls = (t: string) => `px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`

  return (
    <div className="space-y-4">
      <audio ref={audioRef} className="hidden"/>

      {/* Önizleme dili */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">Önizleme dili:</span>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(LANGUAGES).slice(0, 6).map(([code, lang]) => (
            <button key={code} onClick={() => setPreviewLang(code)}
              className={`px-2 py-1 text-xs rounded-lg transition ${previewLang === code ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        <button className={tabCls('turkish')} onClick={() => setActiveTab('turkish')}>🇹🇷 Türkçe Sesler</button>
        <button className={tabCls('professional')} onClick={() => setActiveTab('professional')}>💼 Profesyonel</button>
        <button className={tabCls('cloned')} onClick={() => setActiveTab('cloned')}>🎤 Klonlanmış</button>
        <button className={tabCls('all')} onClick={() => setActiveTab('all')}>🌍 Tüm Sesler</button>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Ses ara..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
      </div>

      {/* Ses listesi */}
      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-slate-500"/></div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
          {currentVoices.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-sm">
              {activeTab === 'cloned' ? 'Henüz klonlanmış ses yok. Aşağıdan kendi sesinizi ekleyin.' : 'Ses bulunamadı'}
            </div>
          )}
          {currentVoices.map((voice: any) => (
            <div key={voice.voice_id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedId === voice.voice_id ? 'bg-teal-600/20 border-teal-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
              onClick={() => onSelect(voice.voice_id, voice.name)}>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                {voice.category === 'cloned' ? '🎤' : voice.labels?.gender === 'female' ? '👩' : '👨'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{voice.name}</div>
                <div className="text-slate-500 text-xs flex items-center gap-2 mt-0.5">
                  {voice.labels?.gender && <span>{voice.labels.gender === 'female' ? 'Kadın' : 'Erkek'}</span>}
                  {voice.labels?.accent && <span>· {voice.labels.accent}</span>}
                  {voice.labels?.use_case && <span>· {voice.labels.use_case}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedId === voice.voice_id && <CheckCircle className="w-4 h-4 text-teal-400"/>}
                <button onClick={e => { e.stopPropagation(); previewVoice(voice.voice_id) }}
                  className="p-2 bg-slate-700 hover:bg-teal-600 rounded-lg transition">
                  {playing === voice.voice_id
                    ? <Square className="w-3.5 h-3.5 text-white"/>
                    : <Play className="w-3.5 h-3.5 text-slate-300"/>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ANA SAYFA ─────────────────────────────────────────────
export default function VoicePage() {
  const [tab, setTab] = useState<'dial' | 'campaign' | 'calls' | 'voice' | 'settings'>('dial')
  const [leads, setLeads] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [cloning, setCloning] = useState(false)

  // Form
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
    setLoading(true)
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
      if (s.status === 'fulfilled') { const d = await (s.value as any).json(); setSettings(d.settings || {}); setSelectedVoiceId(d.settings?.elevenlabs_voice_id || ''); setSelectedVoiceName(d.settings?.voice_name || '') }
      if (st.status === 'fulfilled') { const d = await (st.value as any).json(); setStats(d) }
    } catch {}
    setLoading(false)
  }

  async function selectVoice(voiceId: string, voiceName: string) {
    setSelectedVoiceId(voiceId)
    setSelectedVoiceName(voiceName)
    await fetch(`${API}/api/voice/set-voice`, {
      method: 'POST', headers: authH(),
      body: JSON.stringify({ voiceId, voiceName }),
    })
    showMsg('success', `${voiceName} sesi seçildi`)
  }

  async function cloneVoice() {
    if (!fileRef.current?.files?.[0]) return showMsg('error', 'Ses dosyası seçin')
    setCloning(true)
    try {
      const form = new FormData()
      form.append('audio', fileRef.current.files[0])
      form.append('name', settings.agent_name || 'Sesim')
      const r = await fetch(`${API}/api/voice/clone`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Sesiniz klonlandı!'); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCloning(false)
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
      if (d.ok) { showMsg('success', 'Arama ElevenLabs üzerinden başlatıldı! 📞'); setTimeout(loadAll, 3000) }
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
      await fetch(`${API}/api/voice/settings`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify(settings),
      })
      showMsg('success', 'Ayarlar kaydedildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const leadsWithPhone = leads.filter(l => l.phone)
  const filteredLeads = filterCountry ? leadsWithPhone.filter(l => l.country_code === filterCountry || l.country === filterCountry) : leadsWithPhone
  const countries = [...new Set(leadsWithPhone.map(l => l.country).filter(Boolean))]
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4"/>
            </div>
            AI Sesli Arama
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ElevenLabs + Claude · %100 insan sesi · 70+ dil · Türkiye & İhracat
          </p>
        </div>
        {selectedVoiceName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
            <Volume2 className="w-4 h-4 text-teal-400"/>
            <span className="text-teal-400 text-sm font-medium">{selectedVoiceName}</span>
            <button onClick={() => setTab('voice')} className="text-teal-500 hover:text-teal-300 text-xs">değiştir</button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-white' },
            { label: 'Tamamlanan', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Olumlu', value: stats.positive, color: 'text-teal-400' },
            { label: 'Cevap Yok', value: stats.no_answer, color: 'text-slate-400' },
            { label: 'Toplam Süre', value: `${stats.totalMinutes}dk`, color: 'text-amber-400' },
            { label: 'Diller', value: Object.keys(stats.byLanguage || {}).length, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ses seçilmedi uyarısı */}
      {!selectedVoiceName && tab !== 'voice' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0"/>
          <div className="flex-1">
            <p className="text-amber-300 text-sm font-medium">Henüz ses seçilmemiş</p>
            <p className="text-amber-400/60 text-xs">Aramalar için bir ses seçin veya kendi sesinizi klonlayın</p>
          </div>
          <button onClick={() => setTab('voice')} className="px-4 py-2 bg-amber-500/20 text-amber-400 text-sm rounded-xl font-medium">
            Ses Seç →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit flex-wrap">
        {[['dial','📞 Tek Arama'],['campaign','🚀 Kampanya'],['calls','📋 Aramalar'],['voice','🎤 Ses Seç'],['settings','⚙️ Ayarlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* TEK ARAMA */}
      {tab === 'dial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-teal-400"/> Tek Lead Ara
            </h3>

            {/* Dil seçimi */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Arama Dili</label>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button key={code} onClick={() => setSelectedLanguage(code)}
                    className={`p-2 rounded-xl border text-xs transition-all ${selectedLanguage === code ? 'bg-teal-600/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    <div className="text-base mb-0.5">{lang.flag}</div>
                    <div className="truncate">{lang.name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Lead Seç (telefonu olanlar)</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="">Lead seçin</option>
                {leadsWithPhone.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.company_name} {l.country ? `(${l.country})` : ''} — {l.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <p>→ ElevenLabs AI Agent araması yapacak</p>
              <p>→ Seçilen dilde ({LANGUAGES[selectedLanguage]?.flag} {LANGUAGES[selectedLanguage]?.name}) konuşacak</p>
              <p>→ Arama bittikten sonra analiz gelecek</p>
            </div>

            <button onClick={makeSingleCall} disabled={calling || !selectedLead}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {calling ? <><RefreshCw className="w-4 h-4 animate-spin"/> Aranıyor...</> : <><Phone className="w-4 h-4"/> Şimdi Ara</>}
            </button>
          </div>

          {/* Dil bilgisi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-purple-400"/> Desteklenen Diller
            </h3>
            <div className="space-y-2">
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <div key={code} className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-xl">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-white text-sm">{lang.name}</span>
                  <span className="ml-auto text-xs text-slate-500 font-mono">{code.toUpperCase()}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400"/>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Lead ülkesine göre dil otomatik seçilir</p>
          </div>
        </div>
      )}

      {/* KAMPANYA */}
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
                  placeholder="Nisan 2026 İhracat Kampanyası"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Bekleme Süresi</label>
                <select value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm">
                  {[2,5,10,15,30].map(m => <option key={m} value={m}>{m} dakika</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Dil Seçimi</label>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedLanguage('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!selectedLanguage ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  🌍 Otomatik (ülkeye göre)
                </button>
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button key={code} onClick={() => setSelectedLanguage(code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${selectedLanguage === code ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Ülke filtresi */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Ülke filtresi:</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">Tüm Ülkeler</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Lead listesi */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">{selectedLeads.length} / {filteredLeads.length} lead seçili</label>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))}
                    className="text-xs text-teal-400 hover:text-teal-300">Tümünü Seç</button>
                  <button onClick={() => setSelectedLeads([])}
                    className="text-xs text-slate-500 hover:text-slate-300">Temizle</button>
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
                      <div className="text-slate-500 text-xs flex gap-1.5">
                        <span className="font-mono">{l.phone}</span>
                        {l.country && <span>· {l.country}</span>}
                      </div>
                    </div>
                    {l.country_code && <span className="text-xs text-slate-600">{l.country_code}</span>}
                  </label>
                ))}
                {filteredLeads.length === 0 && (
                  <p className="text-slate-600 text-xs text-center py-4">Telefon numarası olan lead bulunamadı</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <p>→ Her lead için dil otomatik belirlenir (ülkeye göre)</p>
              <p>→ ElevenLabs Agent her aramayı yönetir</p>
              <p>→ Tahmini süre: ~{Math.round(selectedLeads.length * (delayMinutes + 3))} dakika</p>
            </div>

            <button onClick={startCampaign} disabled={campaignRunning || !selectedLeads.length}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {campaignRunning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Çalışıyor...</> : <><Zap className="w-4 h-4"/> {selectedLeads.length} Lead'i Ara</>}
            </button>
          </div>

          {/* Kampanya listesi */}
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
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.total_leads ? (c.calls_made/c.total_leads)*100 : 0}%`}}/>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Kampanya yok</p>}
            </div>
          </div>
        </div>
      )}

      {/* ARAMALAR */}
      {tab === 'calls' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Arama Geçmişi</h3>
            <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-white">
              <RefreshCw className="w-4 h-4"/>
            </button>
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
                    <td className="px-4 py-3 text-center text-lg">
                      {LANGUAGES[c.language]?.flag || '🌍'}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={c.status}/></td>
                    <td className="px-4 py-3 text-center">
                      {c.outcome === 'positive' ? <span className="text-emerald-400 text-xs">✓ Olumlu</span>
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

      {/* SES SEÇ */}
      {tab === 'voice' && (
        <div className="space-y-5">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-teal-400"/> Ses Kütüphanesi
            </h3>
            {selectedVoiceName && (
              <div className="mb-4 flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                <CheckCircle className="w-4 h-4 text-teal-400"/>
                <span className="text-teal-300 text-sm font-medium">Seçili: {selectedVoiceName}</span>
              </div>
            )}
            <VoiceSelector onSelect={selectVoice} selectedId={selectedVoiceId}/>
          </div>

          {/* Ses Klonlama */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400"/> Kendi Sesini Klonla
            </h3>
            <p className="text-slate-400 text-sm">30 saniye - 3 dakika ses kaydı yükleyin. Sistem sizin sesinizle arama yapar.</p>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-purple-500/50 transition cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm">Ses dosyası seçin</p>
              <p className="text-slate-600 text-xs mt-1">MP3, WAV, M4A — max 10MB</p>
              <input ref={fileRef} type="file" accept="audio/*" className="hidden"/>
            </div>
            <button onClick={cloneVoice} disabled={cloning}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              {cloning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Klonlanıyor...</> : <><Mic className="w-4 h-4"/> Klonla</>}
            </button>
          </div>
        </div>
      )}

      {/* AYARLAR */}
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
          <button onClick={saveSettings}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium">
            Kaydet
          </button>
        </div>
      )}
    </div>
  )
}