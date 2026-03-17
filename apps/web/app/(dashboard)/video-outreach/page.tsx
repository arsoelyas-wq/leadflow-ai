'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Video, Play, RefreshCw, Plus, Send, CheckCircle, Clock, XCircle, Sparkles, Users, Bot } from 'lucide-react'

export default function VideoOutreachPage() {
  const [tab, setTab] = useState<'create' | 'list'>('create')
  const [avatars, setAvatars] = useState<any[]>([])
  const [voices, setVoices] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [script, setScript] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [useAI, setUseAI] = useState(true)
  const [aspectRatio, setAspectRatio] = useState('16:9')

  // Batch
  const [batchLeads, setBatchLeads] = useState<string[]>([])
  const [batching, setBatching] = useState(false)

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
        api.get('/api/leads?limit=50'),
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

  const createVideo = async () => {
    if (!selectedLead || !selectedAvatar || !selectedVoice) return
    setCreating(true)
    try {
      const data = await api.post('/api/video-outreach/create', {
        leadId: selectedLead,
        avatarId: selectedAvatar,
        voiceId: selectedVoice,
        script: useAI ? '' : script,
        customPrompt,
        aspectRatio,
      })
      showMsg('success', `Video oluşturuluyor! ID: ${data.videoId}`)
      setTab('list')
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setCreating(false) }
  }

  const batchCreate = async () => {
    if (!batchLeads.length || !selectedAvatar || !selectedVoice) return
    setBatching(true)
    try {
      const data = await api.post('/api/video-outreach/batch', {
        leadIds: batchLeads,
        avatarId: selectedAvatar,
        voiceId: selectedVoice,
        customPrompt,
      })
      showMsg('success', data.message)
      setBatchLeads([])
      setTab('list')
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setBatching(false) }
  }

  const checkStatus = async (videoId: string) => {
    try {
      const data = await api.get(`/api/video-outreach/status/${videoId}`)
      showMsg(data.status === 'completed' ? 'success' : 'error',
        data.status === 'completed' ? 'Video hazır!' : `Durum: ${data.status}`)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    }
  }

  const sendWhatsApp = async (recordId: string) => {
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
  const statusIcon: Record<string, any> = {
    processing: <Clock size={12} className="animate-spin" />,
    completed: <CheckCircle size={12} />,
    failed: <XCircle size={12} />,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video size={24} className="text-red-400" />
            AI Video Outreach
          </h1>
          <p className="text-slate-400 mt-1 text-sm">HeyGen ile kişiselleştirilmiş satış videoları oluştur ve WhatsApp'tan gönder</p>
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
            { label: 'Toplam Video', value: stats.total, color: 'text-slate-300' },
            { label: 'İşleniyor', value: stats.processing, color: 'text-yellow-400' },
            { label: 'Hazır', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Gönderildi', value: stats.sent, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[
          { id: 'create', label: 'Video Oluştur' },
          { id: 'list', label: `Videolar (${videos.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CREATE */}
      {tab === 'create' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tek Video */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Video size={16} className="text-red-400" /> Tek Video Oluştur
            </h2>

            {/* Lead Seç */}
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Lead *</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
                <option value="">Lead seçin</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} {l.contact_name ? `— ${l.contact_name}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Avatar Seç */}
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Avatar *</label>
              <select value={selectedAvatar} onChange={e => setSelectedAvatar(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
                <option value="">Avatar seçin</option>
                {avatars.map((a: any) => (
                  <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name}</option>
                ))}
              </select>
            </div>

            {/* Ses Seç */}
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Ses *</label>
              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500">
                <option value="">Ses seçin</option>
                {voices.slice(0, 30).map((v: any) => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.language})</option>
                ))}
              </select>
            </div>

            {/* Oran */}
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Video Oranı</label>
              <div className="flex gap-2">
                {['16:9', '9:16', '1:1'].map(ratio => (
                  <button key={ratio} onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      aspectRatio === ratio ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Script */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400 text-xs">Script</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-slate-400 text-xs">AI ile üret</span>
                  <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} className="accent-red-500" />
                </label>
              </div>
              {useAI ? (
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  rows={2} placeholder="AI prompt (opsiyonel): Hangi tarz video istiyorsunuz?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 resize-none" />
              ) : (
                <textarea value={script} onChange={e => setScript(e.target.value)}
                  rows={4} placeholder="Video scriptini yazın (max 100 kelime / ~45 saniye)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 resize-none" />
              )}
            </div>

            <button onClick={createVideo} disabled={creating || !selectedLead || !selectedAvatar || !selectedVoice}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition">
              {creating ? <RefreshCw size={15} className="animate-spin" /> : <Video size={15} />}
              {creating ? 'Video oluşturuluyor...' : 'Video Oluştur'}
            </button>
          </div>

          {/* Toplu Video */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={16} className="text-orange-400" /> Toplu Video ({batchLeads.length} seçili)
            </h2>
            <p className="text-slate-400 text-xs">Her lead için ayrı kişiselleştirilmiş video oluşturur</p>

            <div className="max-h-52 overflow-y-auto space-y-1.5 bg-slate-900 rounded-lg p-2">
              {leads.map(lead => (
                <label key={lead.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={batchLeads.includes(lead.id)}
                    onChange={e => setBatchLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                    className="accent-red-500" />
                  <div>
                    <p className="text-white text-xs">{lead.company_name}</p>
                    <p className="text-slate-500 text-xs">{lead.contact_name || lead.phone || ''}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg text-xs text-slate-400 space-y-1">
              <p>→ Avatar ve ses yukarıdan seçin</p>
              <p>→ Her lead için AI otomatik script üretir</p>
              <p>→ HeyGen API kredisi kullanır</p>
            </div>

            <button onClick={batchCreate} disabled={batching || !batchLeads.length || !selectedAvatar || !selectedVoice}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
              {batching ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
              {batching ? 'Oluşturuluyor...' : `${batchLeads.length} Video Oluştur`}
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      {tab === 'list' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          {videos.length === 0 ? (
            <div className="p-12 text-center">
              <Video size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz video yok — Video Oluştur'a tıklayın</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {videos.map((video: any) => (
                <div key={video.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="thumb"
                        className="w-16 h-10 object-cover rounded-lg border border-slate-700" />
                    ) : (
                      <div className="w-16 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Video size={16} className="text-slate-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{video.leads?.company_name}</p>
                      <p className="text-slate-400 text-xs truncate max-w-xs">{video.script?.slice(0, 60)}...</p>
                      <p className="text-slate-500 text-xs">{new Date(video.created_at).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${statusColor[video.status] || statusColor.processing}`}>
                      {statusIcon[video.status]}
                      {video.status === 'processing' ? 'İşleniyor' : video.status === 'completed' ? 'Hazır' : 'Hata'}
                    </span>

                    {video.status === 'processing' && (
                      <button onClick={() => checkStatus(video.heygen_video_id)}
                        className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg transition" title="Durumu Kontrol Et">
                        <RefreshCw size={13} />
                      </button>
                    )}

                    {video.status === 'completed' && video.video_url && (
                      <>
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition" title="Videoyu İzle">
                          <Play size={13} />
                        </a>
                        {!video.sent_at && video.leads?.phone && (
                          <button onClick={() => sendWhatsApp(video.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition">
                            <Send size={12} /> WhatsApp
                          </button>
                        )}
                        {video.sent_at && (
                          <span className="text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle size={12} /> Gönderildi
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}