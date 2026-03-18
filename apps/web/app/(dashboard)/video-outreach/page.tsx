'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Video, Play, RefreshCw, Send, CheckCircle, Clock, XCircle, Bot, Users, Zap, ToggleLeft, ToggleRight } from 'lucide-react'

export default function VideoOutreachPage() {
  const [avatars, setAvatars] = useState<any[]>([])
  const [voices, setVoices] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Seçimler
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [autoSend, setAutoSend] = useState(true)

  // Loading states
  const [creating, setCreating] = useState(false)
  const [batching, setBatching] = useState(false)
  const [checking, setChecking] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)

  // Preview
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
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

  const playVoicePreview = (voice: any) => {
    if (voice?.preview_audio) {
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(voice.preview_audio)
      audioRef.current.play().catch(() => {})
    }
  }

  const createSingle = async () => {
    setCreating(true)
    try {
      const data = await api.post('/api/video-outreach/create', {
        leadId: selectedLead,
        avatarId: selectedAvatar,
        voiceId: selectedVoice,
        aspectRatio,
        autoSend,
      })
      showMsg('success', `✅ Video oluşturuluyor! ${data.backgroundUsed ? '🖼️ Şirket arkaplanı eklendi' : ''}`)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setCreating(false) }
  }

  const createBatch = async () => {
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
      showMsg('success', data.message)
      setSelectedLeads([])
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setBatching(false) }
  }

  const checkAll = async () => {
    setChecking(true)
    try {
      const data = await api.post('/api/video-outreach/check-all', {})
      showMsg('success', data.message)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setChecking(false) }
  }

  const sendAll = async () => {
    if (!confirm('Tüm hazır videolar gönderilsin mi?')) return
    setSendingAll(true)
    try {
      const data = await api.post('/api/video-outreach/send-all', {})
      showMsg('success', data.message)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSendingAll(false) }
  }

  const sendSingle = async (id: string) => {
    try {
      const data = await api.post(`/api/video-outreach/send-whatsapp/${id}`, {})
      showMsg('success', data.message)
      loadAll()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const freeAvatars = avatars.filter((a: any) => !a.premium)
  const completedUnsent = videos.filter(v => v.status === 'completed' && !v.sent_at).length
  const processingCount = videos.filter(v => v.status === 'processing').length

  const selectedAvatarObj = avatars.find((a: any) => a.avatar_id === selectedAvatar)
  const selectedVoiceObj = voices.find((v: any) => v.voice_id === selectedVoice)

  const canCreate = selectedAvatar && selectedVoice && selectedLead
  const canBatch = selectedAvatar && selectedVoice

  const statusColor: Record<string, string> = {
    processing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video size={24} className="text-red-400" />
            AI Video Outreach
          </h1>
          <p className="text-slate-400 mt-1 text-sm">HeyGen ile kişiselleştirilmiş satış videoları → WhatsApp</p>
        </div>
        <div className="flex gap-2">
          {processingCount > 0 && (
            <button onClick={checkAll} disabled={checking}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm transition">
              <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
              {processingCount} kontrol et
            </button>
          )}
          {completedUnsent > 0 && (
            <button onClick={sendAll} disabled={sendingAll}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition">
              <Send size={13} /> {completedUnsent} gönder
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-slate-300' },
            { label: 'İşleniyor', value: stats.processing, color: 'text-yellow-400' },
            { label: 'Hazır', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Gönderildi', value: stats.sent, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* SOL: Ayarlar */}
        <div className="space-y-4">
          {/* ADIM 1: Avatar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="w-6 h-6 bg-red-600 rounded-full text-white text-xs font-bold flex items-center justify-center">1</span>
                Avatar Seç
              </h2>
              {selectedAvatarObj && (
                <div className="flex items-center gap-2">
                  <img src={selectedAvatarObj.preview_image_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-red-300 text-xs">✓ {selectedAvatarObj.avatar_name}</span>
                  {selectedAvatarObj.preview_video_url && (
                    <button onClick={() => setPreviewVideo(selectedAvatarObj.preview_video_url)}
                      className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600 transition">
                      ▶ İzle
                    </button>
                  )}
                </div>
              )}
            </div>
            <select value={selectedAvatar} onChange={e => setSelectedAvatar(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 mb-2">
              <option value="">— Avatar seçin ({freeAvatars.length} ücretsiz) —</option>
              {freeAvatars.map((a: any) => (
                <option key={a.avatar_id} value={a.avatar_id}>
                  {a.avatar_name} ({a.gender === 'male' ? '👨' : '👩'})
                </option>
              ))}
            </select>
            {/* Avatar grid önizleme - seçili olanın etrafı */}
            {selectedAvatarObj && (
              <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <img src={selectedAvatarObj.preview_image_url} alt={selectedAvatarObj.avatar_name}
                  className="w-12 h-12 rounded-xl object-cover border border-red-500/30" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{selectedAvatarObj.avatar_name}</p>
                  <p className="text-slate-400 text-xs">{selectedAvatarObj.gender === 'male' ? '👨 Erkek' : '👩 Kadın'}</p>
                </div>
                {selectedAvatarObj.preview_video_url && (
                  <button onClick={() => setPreviewVideo(selectedAvatarObj.preview_video_url)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition">
                    <Play size={11} /> Önizle
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ADIM 2: Ses */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="w-6 h-6 bg-red-600 rounded-full text-white text-xs font-bold flex items-center justify-center">2</span>
                Ses Seç
              </h2>
              {selectedVoiceObj && (
                <span className="text-red-300 text-xs">✓ {selectedVoiceObj.name}</span>
              )}
            </div>
            <select value={selectedVoice} onChange={e => {
              setSelectedVoice(e.target.value)
              const v = voices.find((v: any) => v.voice_id === e.target.value)
              playVoicePreview(v)
            }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
              <option value="">— Ses seçin (seçince oynar 🔊) —</option>
              {voices.slice(0, 100).map((v: any) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} — {v.language} {v.gender ? `(${v.gender})` : ''}
                </option>
              ))}
            </select>
            {selectedVoiceObj && (
              <div className="flex items-center justify-between mt-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div>
                  <p className="text-white text-sm">🎙️ {selectedVoiceObj.name}</p>
                  <p className="text-slate-400 text-xs">{selectedVoiceObj.language}</p>
                </div>
                <button onClick={() => playVoicePreview(selectedVoiceObj)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition">
                  ▶ Tekrar oynat
                </button>
              </div>
            )}
          </div>

          {/* ADIM 3: Ayarlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <span className="w-6 h-6 bg-red-600 rounded-full text-white text-xs font-bold flex items-center justify-center">3</span>
              Video Ayarları
            </h2>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Format</label>
              <div className="flex gap-2">
                {[
                  { r: '9:16', label: '📱 Dikey (WhatsApp)' },
                  { r: '16:9', label: '🖥️ Yatay' },
                  { r: '1:1', label: '⬜ Kare' },
                ].map(({ r, label }) => (
                  <button key={r} onClick={() => setAspectRatio(r)}
                    className={`flex-1 py-2 px-2 rounded-lg border text-xs transition ${
                      aspectRatio === r ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <div>
                <p className="text-white text-sm">Otomatik WhatsApp Gönder</p>
                <p className="text-slate-400 text-xs">Video hazırlanınca otomatik gönderilir</p>
              </div>
              <button onClick={() => setAutoSend(!autoSend)}>
                {autoSend ? <ToggleRight size={26} className="text-emerald-400" /> : <ToggleLeft size={26} className="text-slate-500" />}
              </button>
            </div>
          </div>
        </div>

        {/* SAĞ: Video Oluştur */}
        <div className="space-y-4">
          {/* Tek Video */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Video size={16} className="text-red-400" />
              Tek Lead İçin Video
            </h2>
            <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
              <option value="">Lead seçin</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company_name}{l.contact_name ? ` — ${l.contact_name}` : ''}
                </option>
              ))}
            </select>

            {/* Durum göstergesi */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`p-2 rounded-lg border ${selectedAvatar ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                {selectedAvatar ? '✓' : '○'} Avatar
              </div>
              <div className={`p-2 rounded-lg border ${selectedVoice ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                {selectedVoice ? '✓' : '○'} Ses
              </div>
              <div className={`p-2 rounded-lg border ${selectedLead ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                {selectedLead ? '✓' : '○'} Lead
              </div>
            </div>

            <button onClick={createSingle} disabled={creating || !canCreate}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                canCreate && !creating
                  ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}>
              {creating ? <RefreshCw size={15} className="animate-spin" /> : <Video size={15} />}
              {creating ? 'Video oluşturuluyor...' : canCreate ? '🎬 Video Oluştur' : 'Yukarıdan seçim yapın'}
            </button>
          </div>

          {/* Toplu Video */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={16} className="text-orange-400" />
              Toplu Video ({selectedLeads.length || leads.length} lead)
            </h2>

            <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-900 rounded-lg p-2">
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer border-b border-slate-700 mb-1">
                <input type="checkbox"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={e => setSelectedLeads(e.target.checked ? leads.map(l => l.id) : [])}
                  className="accent-red-500" />
                <span className="text-slate-300 text-xs font-medium">Tümünü Seç ({leads.length})</span>
              </label>
              {leads.map(lead => (
                <label key={lead.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer">
                  <input type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                    className="accent-red-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{lead.company_name}</p>
                    <p className="text-slate-500 text-xs">{lead.contact_name || lead.phone || ''}</p>
                  </div>
                </label>
              ))}
            </div>

            <button onClick={createBatch} disabled={batching || !canBatch}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                canBatch && !batching
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}>
              {batching ? <RefreshCw size={15} className="animate-spin" /> : <Bot size={15} />}
              {batching ? 'Oluşturuluyor...' : canBatch
                ? `🚀 ${selectedLeads.length || leads.length} Video Oluştur${autoSend ? ' + Gönder' : ''}`
                : 'Avatar ve ses seçin'}
            </button>
          </div>

          {/* Son Videolar özet */}
          {videos.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">Son Videolar</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {videos.slice(0, 8).map((video: any) => (
                  <div key={video.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {video.thumbnail_url
                        ? <img src={video.thumbnail_url} alt="" className="w-10 h-7 object-cover rounded border border-slate-700 shrink-0" />
                        : <div className="w-10 h-7 bg-slate-700 rounded shrink-0 flex items-center justify-center"><Video size={12} className="text-slate-500" /></div>
                      }
                      <p className="text-white text-xs truncate">{video.leads?.company_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${statusColor[video.status] || statusColor.processing}`}>
                        {video.status === 'processing' ? '⏳' : video.status === 'completed' ? '✓' : '✗'}
                      </span>
                      {video.status === 'completed' && video.video_url && (
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer"
                          className="p-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded transition">
                          <Play size={10} />
                        </a>
                      )}
                      {video.status === 'completed' && !video.sent_at && video.leads?.phone && (
                        <button onClick={() => sendSingle(video.id)}
                          className="px-2 py-0.5 bg-green-600 text-white text-xs rounded transition">
                          Gönder
                        </button>
                      )}
                      {video.sent_at && <span className="text-emerald-400 text-xs">✓ Gitti</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewVideo(null)}>
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <p className="text-white font-medium text-sm">Avatar Önizleme</p>
              <button onClick={() => setPreviewVideo(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <video src={previewVideo} autoPlay controls className="w-full" />
          </div>
        </div>
      )}
    </div>
  )
}