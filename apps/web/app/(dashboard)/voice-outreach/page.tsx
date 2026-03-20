'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Phone, PhoneCall, PhoneOff, RefreshCw, Play, Mic, Users, Clock, CheckCircle, Volume2, Zap, Bot } from 'lucide-react'

export default function VoicePage() {
  const [voices, setVoices] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  const [batchCalling, setBatchCalling] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [delayMinutes, setDelayMinutes] = useState(5)
  const [previewText, setPreviewText] = useState('Merhaba, nasılsınız? Size kısa bir bilgi vermek istiyorum.')
  const [previewing, setPreviewing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [v, l, c, s] = await Promise.allSettled([
        api.get('/api/voice/voices'),
        api.get('/api/leads?limit=100'),
        api.get('/api/voice/calls'),
        api.get('/api/voice/stats'),
      ])
      if (v.status === 'fulfilled') setVoices(v.value.voices || [])
      if (l.status === 'fulfilled') setLeads((l.value.leads || []).filter((l: any) => l.phone))
      if (c.status === 'fulfilled') setCalls(c.value.calls || [])
      if (s.status === 'fulfilled') setStats(s.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const previewVoice = async () => {
    if (!selectedVoice || !previewText) return
    setPreviewing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'}/api/voice/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: previewText, voiceId: selectedVoice }),
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(url)
      audioRef.current.play()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setPreviewing(false) }
  }

  const makeCall = async () => {
    if (!selectedLead) return
    setCalling(true)
    try {
      const data = await api.post('/api/voice/call', {
        leadId: selectedLead,
        voiceId: selectedVoice || undefined,
      })
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCalling(false) }
  }

  const makeBatchCalls = async () => {
    if (!selectedLeads.length) return
    setBatchCalling(true)
    try {
      const data = await api.post('/api/voice/call-batch', {
        leadIds: selectedLeads,
        voiceId: selectedVoice || undefined,
        delayMinutes,
      })
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setBatchCalling(false) }
  }

  const loadRecording = async (callId: string) => {
    try {
      const data = await api.get(`/api/voice/calls/${callId}/recording`)
      if (data.recordingUrl) {
        if (audioRef.current) audioRef.current.pause()
        audioRef.current = new Audio(data.recordingUrl)
        audioRef.current.play()
        showMsg('success', 'Kayıt oynatılıyor...')
      } else if (data.transcript) {
        alert(`Transkript:\n\n${data.transcript}`)
      } else {
        showMsg('error', 'Kayıt henüz hazır değil')
      }
    } catch (e: any) { showMsg('error', e.message) }
  }

  const statusColor: Record<string, string> = {
    initiated: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    'no-answer': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Phone size={24} className="text-green-400" />
            AI Voice Outreach
          </h1>
          <p className="text-slate-400 mt-1 text-sm">ElevenLabs + Vapi ile insan sesi — müşteri AI olduğunu anlamaz</p>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Nasıl çalışır */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Bot size={16} className="text-green-400" /> Neden Kimse AI Olduğunu Anlamaz?
        </h2>
        <div className="grid grid-cols-4 gap-3 text-xs text-center">
          {[
            { icon: '🎙️', title: 'Gerçek Ses', desc: 'ElevenLabs en doğal TTS' },
            { icon: '🏢', title: 'Ofis Sesi', desc: 'Arka planda ofis gürültüsü' },
            { icon: '🤔', title: 'Doğal Dur.', desc: '"Şey", "yani", duraksamalar' },
            { icon: '🧠', title: 'Claude AI', desc: 'Anlık itiraz karşılama' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-white font-medium">{title}</p>
              <p className="text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Arama', value: stats.total, color: 'text-slate-300' },
            { label: 'Tamamlanan', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Bekleyen', value: stats.initiated, color: 'text-blue-400' },
            { label: 'Toplam Süre', value: `${stats.totalMinutes} dk`, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sol: Ses & Ayarlar */}
        <div className="space-y-4">
          {/* Ses Seç */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Volume2 size={16} className="text-green-400" /> Ses Seç
            </h2>
            <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
              <option value="">Otomatik (en iyi Türkçe ses)</option>
              {voices.slice(0, 30).map((v: any) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} {v.labels?.gender ? `(${v.labels.gender})` : ''}
                </option>
              ))}
            </select>

            {/* Ses Önizleme */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs">Önizleme metni</label>
              <textarea value={previewText} onChange={e => setPreviewText(e.target.value)} rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none" />
              <button onClick={previewVoice} disabled={previewing || !selectedVoice}
                className="w-full flex items-center justify-center gap-2 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 rounded-lg text-sm transition disabled:opacity-40">
                {previewing ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                {previewing ? 'Üretiliyor...' : 'Sesi Dinle'}
              </button>
            </div>
          </div>

          {/* Tek Arama */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <PhoneCall size={16} className="text-blue-400" /> Tek Lead'i Ara
            </h2>
            <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Lead seçin (telefon numarası olanlar)</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company_name} — {l.phone} {l.contact_name ? `(${l.contact_name})` : ''}
                </option>
              ))}
            </select>
            <button onClick={makeCall} disabled={calling || !selectedLead}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                selectedLead && !calling ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}>
              {calling ? <RefreshCw size={15} className="animate-spin" /> : <Phone size={15} />}
              {calling ? 'Arama başlatılıyor...' : '📞 Şimdi Ara'}
            </button>
          </div>
        </div>

        {/* Sağ: Toplu Arama */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={16} className="text-orange-400" /> Toplu Arama ({selectedLeads.length} seçili)
            </h2>

            <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-900 rounded-lg p-2">
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer border-b border-slate-700 mb-1">
                <input type="checkbox"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={e => setSelectedLeads(e.target.checked ? leads.map(l => l.id) : [])}
                  className="accent-green-500" />
                <span className="text-slate-300 text-xs font-medium">Tümünü Seç ({leads.length} lead)</span>
              </label>
              {leads.map(lead => (
                <label key={lead.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                    onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                    className="accent-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{lead.company_name}</p>
                    <p className="text-slate-500 text-xs">{lead.phone} {lead.contact_name ? `· ${lead.contact_name}` : ''}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Aramalar arası bekleme (dakika)</label>
              <select value={delayMinutes} onChange={e => setDelayMinutes(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {[3, 5, 10, 15, 30].map(v => <option key={v} value={v}>{v} dakika</option>)}
              </select>
            </div>

            <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs text-slate-400">
              → Her lead için Claude otomatik script üretir<br />
              → Aramalar arası {delayMinutes} dk beklenir (doğal görünmek için)<br />
              → Tahmini süre: {Math.round(selectedLeads.length * delayMinutes)} dakika
            </div>

            <button onClick={makeBatchCalls} disabled={batchCalling || !selectedLeads.length}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                selectedLeads.length && !batchCalling ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}>
              {batchCalling ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
              {batchCalling ? 'Aramalar başlatılıyor...' : `🚀 ${selectedLeads.length} Lead'i Ara`}
            </button>
          </div>

          {/* Son Aramalar */}
          {calls.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">📋 Son Aramalar</h2>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {calls.slice(0, 10).map((call: any) => (
                  <div key={call.id} className="flex items-center gap-3 p-2.5 bg-slate-900/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">{call.leads?.company_name}</p>
                      <p className="text-slate-500 text-xs">{call.phone} · {new Date(call.created_at).toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {call.duration_seconds && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Clock size={10} /> {Math.round(call.duration_seconds / 60)}dk
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${statusColor[call.status] || statusColor.initiated}`}>
                        {call.status === 'initiated' ? '📞' : call.status === 'completed' ? '✓' : '✗'}
                      </span>
                      {call.status === 'completed' && (
                        <button onClick={() => loadRecording(call.id)}
                          className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition">
                          <Play size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}