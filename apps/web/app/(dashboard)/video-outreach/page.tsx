'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Video, Play, RefreshCw, Send, CheckCircle, Clock,
  XCircle, Bot, Users, Zap, Eye, Download,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp
} from 'lucide-react'

export default function VideoOutreachPage() {
  const [tab, setTab] = useState<'setup' | 'batch' | 'videos'>('setup')
  const [avatars, setAvatars] = useState<any[]>([])
  const [voices, setVoices] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Avatar & Voice seçimi (kalıcı)
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16') // Dikey — WhatsApp için ideal

  // Batch settings
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [autoSend, setAutoSend] = useState(true)
  const [batching, setBatching] = useState(false)
  const [batchProgress, setBatchProgress] = useState<any>(null)

  // Tek video
  const [singleLead, setSingleLead] = useState('')
  const [creating, setCreating] = useState(false)

  // Status check
  const [checking, setChecking] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
  const [previewAudio, setPreviewAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [avatarData, voiceData, leadData, videoData, statsData] = await Promise.allSettled([
        api.get('/api/video-outreach/avatars'),
        api.get('/api/video-outreach/voices'),
        api.get('/api/leads?limit=100'),
        api.get('/api/video-outreach/list'),
        api.get('/api/video-outreach/stats'),
      ])
      if (avatarData.status === 'fulfilled') setAvatars(avatarData.value.avatars || [])
      if (voiceData.status === 'fulfilled') setVoices(voiceData.value.voices || [])
      if (leadData.status === 'fulfilled') setLeads(leadData.value.leads || [])
      if (videoData.status === 'fulfilled') setVideos(videoData.value.videos || [])
      if (statsData.status === 'fulfilled') setStats(statsData.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([])
      setSelectAll(false)
    } else {
      setSelectedLeads(leads.map(l => l.id))
      setSelectAll(true)
    }
  }

  const batchCreate = async () => {
    if (!selectedAvatar || !selectedVoice) {
      showMsg('error', 'Avatar ve ses seçin')
      return
    }
    setBatching(true)
    try {
      const data = await api.post('/api/video-outreach/batch', {
        leadIds: selectedLeads.length ? selectedLeads : undefined,
        avatarId: selectedAvatar,
        voiceId: selectedVoice,
        aspectRatio,
        autoSend,
        maxLeads: selectedLeads.length || 50,
      })
      setBatchProgress(data)
      showMsg('success', data.message)
      setTab('videos')
      setTimeout(loadAll, 3000)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setBatching(false)
    }
  }

  const createSingle = async () => {
    if (!singleLead || !selectedAvatar || !selectedVoice) {
      showMsg('error', 'Lead, avatar ve ses seçin')
      return
    }
    setCreating(true)
    try {
      const data = await api.post('/api/video-outreach/create', {
        leadId: singleLead,
        avatarId: selectedAvatar,
        voiceId: selectedVoice,
        aspectRatio,
        autoSend,
      })
      showMsg('success', `Video oluşturuluyor! ${data.backgroundUsed ? '🖼️ Şirket arkaplanı eklendi' : ''}`)
      setTab('videos')
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setCreating(false)
    }
  }

  const checkAll = async () => {
    setChecking(true)
    try {
      const data = await api.post('/api/video-outreach/check-all', {})
      showMsg('success', data.message)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setChecking(false)
    }
  }

  const sendAll = async () => {
    if (!confirm('Tüm hazır videolar WhatsApp\'tan gönderilsin mi?')) return
    setSendingAll(true)
    try {
      const data = await api.post('/api/video-outreach/send-all', {})
      showMsg('success', data.message)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSendingAll(false)
    }
  }

  const sendSingle = async (recordId: string) => {
    try {
      const data = await api.post(`/api/video-outreach/send-whatsapp/${recordId}`, {})
      showMsg('success', data.message)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  const statusColor: Record<string, string> = {
    processing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  const completedCount = videos.filter(v => v.status === 'completed' && !v.sent_at).length
  const processingCount = videos.filter(v => v.status === 'processing').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video size={24} className="text-red-400" />
            AI Video Outreach
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            HeyGen ile kişiye özel satış videosu — her lead için otomatik script + şirket arkaplanı + WhatsApp gönderim
          </p>
        </div>
        <div className="flex gap-2">
          {processingCount > 0 && (
            <button onClick={checkAll} disabled={checking}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm transition">
              {checking ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {processingCount} video kontrol et
            </button>
          )}
          {completedCount > 0 && (
            <button onClick={sendAll} disabled={sendingAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition">
              {sendingAll ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {completedCount} video gönder
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Video', value: stats.total, color: 'text-slate-300', icon: Video },
            { label: 'İşleniyor', value: stats.processing, color: 'text-yellow-400', icon: Clock },
            { label: 'Hazır', value: stats.completed, color: 'text-emerald-400', icon: CheckCircle },
            { label: 'Gönderildi', value: stats.sent, color: 'text-blue-400', icon: Send },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <Icon size={18} className={`${color} mb-2`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'setup', label: '⚙️ Kurulum' },
          { id: 'batch', label: `🚀 Toplu Oluştur (${leads.length} lead)` },
          { id: 'videos', label: `🎬 Videolar (${videos.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* KURULUM */}
      {tab === 'setup' && (
        <div className="space-y-6">
          {/* Nasıl çalışır */}
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap size={16} className="text-red-400" /> Nasıl Çalışır?
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Lead Seç', desc: 'Tüm leadleri veya seçili olanları hedefle', icon: '👥' },
                { step: '2', title: 'AI Script', desc: 'Claude her lead için kişisel script üretir', icon: '🤖' },
                { step: '3', title: 'Video Üret', desc: 'HeyGen avatarın + şirket arkaplanı ile video yapar', icon: '🎬' },
                { step: '4', title: 'Otomatik Gönder', desc: 'Hazır olunca WhatsApp\'tan gönderilir', icon: '📱' },
              ].map(({ step, title, desc, icon }) => (
                <div key={step} className="text-center">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-2">{step}</div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-slate-400 text-xs mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Avatar Seç */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Avatar Seç</h2>
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <RefreshCw size={20} className="animate-spin text-slate-400" />
              </div>
            ) : avatars.length === 0 ? (
              <p className="text-slate-400 text-sm">Avatar bulunamadı — HeyGen API key'ini kontrol edin</p>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
                {avatars.slice(0, 10).map((avatar: any) => (
                  <div key={avatar.avatar_id} className="relative group">
                    <button onClick={() => setSelectedAvatar(avatar.avatar_id)}
                      className={`w-full p-3 rounded-xl border transition text-center ${
                        selectedAvatar === avatar.avatar_id
                          ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}>
                      {avatar.preview_image_url ? (
                        <img src={avatar.preview_image_url} alt={avatar.avatar_name}
                          className="w-12 h-12 rounded-full mx-auto mb-1 object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-700 rounded-full mx-auto mb-1 flex items-center justify-center">
                          <Video size={16} className="text-slate-500" />
                        </div>
                      )}
                      <p className="text-xs truncate">{avatar.avatar_name}</p>
                      {selectedAvatar === avatar.avatar_id && <p className="text-xs text-red-400 mt-0.5">✓ Seçildi</p>}
                    </button>
                    {avatar.preview_video_url && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewVideo(avatar.preview_video_url) }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Play size={9} className="text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ses Seç */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Ses Seç</h2>
            <select value={selectedVoice} onChange={e => {
              setSelectedVoice(e.target.value)
              const voice = voices.find((v: any) => v.voice_id === e.target.value)
              if (voice?.preview_audio) {
                if (audioRef.current) { audioRef.current.pause() }
                audioRef.current = new Audio(voice.preview_audio)
                audioRef.current.play().catch(() => {})
              }
            }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
              <option value="">Ses seçin — seçince otomatik oynar 🔊</option>
              {voices.slice(0, 80).map((v: any) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} — {v.language} {v.gender ? `(${v.gender})` : ''}
                </option>
              ))}
            </select>
            {selectedVoice && (
              <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                🔊 {voices.find((v: any) => v.voice_id === selectedVoice)?.name} seçildi
                <button onClick={() => {
                  const voice = voices.find((v: any) => v.voice_id === selectedVoice)
                  if (voice?.preview_audio) {
                    if (audioRef.current) audioRef.current.pause()
                    audioRef.current = new Audio(voice.preview_audio)
                    audioRef.current.play().catch(() => {})
                  }
                }} className="text-blue-400 hover:text-blue-300 ml-1">▶ Tekrar oynat</button>
              </p>
            )}
          </div>

          {/* Video Ayarları */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Video Ayarları</h2>
            <div>
              <label className="text-slate-400 text-xs mb-2 block">Aspect Ratio</label>
              <div className="flex gap-2">
                {[
                  { ratio: '9:16', label: '9:16', desc: 'Dikey (WhatsApp/Reels)' },
                  { ratio: '16:9', label: '16:9', desc: 'Yatay (Email/Web)' },
                  { ratio: '1:1', label: '1:1', desc: 'Kare (Instagram)' },
                ].map(({ ratio, label, desc }) => (
                  <button key={ratio} onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-center transition ${
                      aspectRatio === ratio ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-xs opacity-70">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
              <div>
                <p className="text-white text-sm font-medium">Otomatik WhatsApp Gönder</p>
                <p className="text-slate-400 text-xs">Video hazır olunca anında gönderilir</p>
              </div>
              <button onClick={() => setAutoSend(!autoSend)}>
                {autoSend
                  ? <ToggleRight size={28} className="text-emerald-400" />
                  : <ToggleLeft size={28} className="text-slate-500" />}
              </button>
            </div>
          </div>

          {/* Tek Video */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Tek Lead İçin Video</h2>
            {(!selectedAvatar || !selectedVoice) && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-xs">⚠️ Yukarıdan avatar ve ses seçin</p>
              </div>
            )}
            <select value={singleLead} onChange={e => setSingleLead(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
              <option value="">Lead seçin</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company_name} {l.contact_name ? `— ${l.contact_name}` : ''}
                </option>
              ))}
            </select>
            <button onClick={createSingle} disabled={creating || !singleLead || !selectedAvatar || !selectedVoice}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition">
              {creating ? <RefreshCw size={14} className="animate-spin" /> : <Video size={14} />}
              {creating ? 'Oluşturuluyor...' : 'Tek Video Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* TOPLU OLUŞTUR */}
      {tab === 'batch' && (
        <div className="space-y-4">
          {/* Inline Avatar & Voice seçimi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <label className="text-slate-400 text-xs mb-2 block">Avatar Seç *</label>
              <select value={selectedAvatar} onChange={e => setSelectedAvatar(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500">
                <option value="">Avatar seçin</option>
                {avatars.filter((a: any) => !a.premium).map((a: any) => (
                  <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name} ({a.gender})</option>
                ))}
              </select>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <label className="text-slate-400 text-xs mb-2 block">Ses Seç *</label>
              <select value={selectedVoice} onChange={e => {
                setSelectedVoice(e.target.value)
                const voice = voices.find((v: any) => v.voice_id === e.target.value)
                if (voice?.preview_audio) {
                  if (audioRef.current) audioRef.current.pause()
                  audioRef.current = new Audio(voice.preview_audio)
                  audioRef.current.play().catch(() => {})
                }
              }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500">
                <option value="">Ses seçin 🔊</option>
                {voices.slice(0, 80).map((v: any) => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name} — {v.language}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Lead Seç</h2>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">{selectedLeads.length} seçili</span>
                <button onClick={toggleSelectAll}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                    selectAll ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-slate-700 border-slate-600 text-slate-300'
                  }`}>
                  {selectAll ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 bg-slate-900 rounded-xl p-2">
              {leads.map(lead => {
                const hasVideo = videos.find(v => v.lead_id === lead.id)
                return (
                  <label key={lead.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                    selectedLeads.includes(lead.id) ? 'bg-red-500/10' : 'hover:bg-slate-800'
                  }`}>
                    <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                      className="accent-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{lead.company_name}</p>
                      <p className="text-slate-500 text-xs">{lead.contact_name || ''} {lead.city ? `· ${lead.city}` : ''}</p>
                    </div>
                    {hasVideo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[hasVideo.status] || statusColor.processing}`}>
                        {hasVideo.status === 'completed' ? 'Hazır' : hasVideo.status === 'processing' ? 'İşleniyor' : 'Hata'}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Özet */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Özet</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Lead sayısı</span><span className="text-white font-bold">{selectedLeads.length || leads.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Avatar</span><span className="text-white">{avatars.find(a => a.avatar_id === selectedAvatar)?.avatar_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tahmini süre</span><span className="text-yellow-400">{Math.ceil((selectedLeads.length || leads.length) * 3)} dakika</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Otomatik gönder</span><span className={autoSend ? 'text-emerald-400' : 'text-slate-500'}>{autoSend ? '✓ Aktif' : 'Kapalı'}</span></div>
            </div>
          </div>

          <button onClick={batchCreate}
            disabled={batching || !selectedAvatar || !selectedVoice}
            className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-40 text-white font-bold rounded-xl transition text-lg">
            {batching ? <RefreshCw size={20} className="animate-spin" /> : <Bot size={20} />}
            {batching
              ? 'Video makinesi çalışıyor...'
              : `${selectedLeads.length || leads.length} Lead için Video Oluştur${autoSend ? ' + Gönder' : ''}`}
          </button>

          {batchProgress && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-300 font-medium">{batchProgress.message}</p>
              <p className="text-slate-400 text-sm mt-1">Tahmini tamamlanma: ~{batchProgress.estimatedMinutes} dakika</p>
            </div>
          )}
        </div>
      )}

      {/* VİDEOLAR */}
      {tab === 'videos' && (
        <div className="space-y-3">
          {videos.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <Video size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz video yok</p>
              <button onClick={() => setTab('batch')} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition">
                Video Oluşturmaya Başla
              </button>
            </div>
          ) : (
            videos.map((video: any) => (
              <div key={video.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                {/* Thumbnail */}
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt="thumb"
                    className="w-20 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
                ) : (
                  <div className="w-20 h-12 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                    <Video size={18} className="text-slate-500" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{video.leads?.company_name}</p>
                  <p className="text-slate-400 text-xs">{video.leads?.contact_name || ''}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{video.script?.slice(0, 70)}...</p>
                </div>

                {/* Status */}
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border shrink-0 ${statusColor[video.status] || statusColor.processing}`}>
                  {video.status === 'processing' && <Clock size={11} className="animate-spin" />}
                  {video.status === 'completed' && <CheckCircle size={11} />}
                  {video.status === 'failed' && <XCircle size={11} />}
                  {video.status === 'processing' ? 'İşleniyor' : video.status === 'completed' ? 'Hazır' : 'Hata'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {video.status === 'completed' && video.video_url && (
                    <a href={video.video_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition" title="İzle">
                      <Play size={13} />
                    </a>
                  )}
                  {video.status === 'completed' && !video.sent_at && video.leads?.phone && (
                    <button onClick={() => sendSingle(video.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition">
                      <Send size={12} /> Gönder
                    </button>
                  )}
                  {video.sent_at && (
                    <span className="text-emerald-400 text-xs flex items-center gap-1">
                      <CheckCircle size={11} /> Gönderildi
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    {/* Avatar Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewVideo(null)}>
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <p className="text-white font-medium text-sm">Avatar Önizleme</p>
              <button onClick={() => setPreviewVideo(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>
            <video src={previewVideo} autoPlay controls className="w-full" />
          </div>
        </div>
      )}
    </div>
  )
}