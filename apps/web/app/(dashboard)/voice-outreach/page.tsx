'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, Mic, Upload, Play, Square, ArrowRight, ArrowLeft,
  CheckCircle, AlertTriangle, RefreshCw, Zap, Volume2, Users,
  Globe2, Search, Settings, Sparkles, Trash2, User, StopCircle, ChevronRight
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const LANG_MAP: Record<string, { name: string; flag: string }> = {
  tr:{name:'Türkçe',flag:'🇹🇷'},en:{name:'İngilizce',flag:'🇬🇧'},de:{name:'Almanca',flag:'🇩🇪'},
  fr:{name:'Fransızca',flag:'🇫🇷'},ar:{name:'Arapça',flag:'🇸🇦'},ru:{name:'Rusça',flag:'🇷🇺'},
  az:{name:'Azerbaycanca',flag:'🇦🇿'},it:{name:'İtalyanca',flag:'🇮🇹'},es:{name:'İspanyolca',flag:'🇪🇸'},
  nl:{name:'Hollandaca',flag:'🇳🇱'},zh:{name:'Çince',flag:'🇨🇳'},ja:{name:'Japonca',flag:'🇯🇵'},
  ko:{name:'Korece',flag:'🇰🇷'},hi:{name:'Hintçe',flag:'🇮🇳'},pt:{name:'Portekizce',flag:'🇵🇹'},pl:{name:'Lehçe',flag:'🇵🇱'},
}
const VOICE_LANGS = Object.entries(LANG_MAP).map(([code, v]) => ({ code, ...v }))

const WIZARD_STEPS = [
  { id: 1, label: 'Ses Seç',   icon: '🎙️', color: '#14b8a6', glow: 'rgba(20,184,166,0.4)'  },
  { id: 2, label: 'Lead Seç',  icon: '👤',  color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
  { id: 3, label: 'Hazırla',   icon: '⚙️',  color: '#f59e0b', glow: 'rgba(251,191,36,0.4)' },
  { id: 4, label: 'Ara',       icon: '🚀',  color: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:  { label:'Tamamlandı', cls:'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
    calling:    { label:'Arıyor',     cls:'bg-blue-500/15 text-blue-400 border border-blue-500/20 animate-pulse' },
    initiating: { label:'Başlatılıyor', cls:'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
    'no-answer':{ label:'Cevap Yok',  cls:'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
    failed:     { label:'Başarısız',  cls:'bg-red-500/15 text-red-400 border border-red-500/20' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

let globalAudio: HTMLAudioElement | null = null

// ─── WAVEFORM ─────────────────────────────────────────────────────────────────
function WaveformCanvas({ isRecording, analyser }: { isRecording: boolean; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height, bars = 52
    function draw() {
      ctx.clearRect(0, 0, W, H)
      if (isRecording && analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        for (let i = 0; i < bars; i++) {
          const v = data[Math.floor((i / bars) * data.length)] / 255
          const barH = Math.max(4, v * H * 0.88)
          const x = (i / bars) * W + (W / bars) * 0.1, bw = (W / bars) * 0.8
          const grd = ctx.createLinearGradient(0, (H - barH) / 2, 0, (H + barH) / 2)
          grd.addColorStop(0, `rgba(20,184,166,${0.3 + v * 0.7})`)
          grd.addColorStop(1, `rgba(139,92,246,${0.2 + v * 0.5})`)
          ctx.fillStyle = grd; ctx.beginPath()
          ctx.roundRect(x, (H - barH) / 2, bw, barH, bw / 2); ctx.fill()
        }
      } else {
        const t = Date.now() / 1000
        for (let i = 0; i < bars; i++) {
          const v = (Math.sin(t * 1.2 + i * 0.35) * 0.5 + 0.5) * 0.22
          const barH = Math.max(3, v * H)
          const x = (i / bars) * W + (W / bars) * 0.1, bw = (W / bars) * 0.8
          ctx.fillStyle = 'rgba(71,85,105,0.5)'; ctx.beginPath()
          ctx.roundRect(x, (H - barH) / 2, bw, barH, bw / 2); ctx.fill()
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isRecording, analyser])
  return <canvas ref={canvasRef} width={520} height={72} className="w-full rounded-2xl"/>
}

// ─── LUXURY ORB ───────────────────────────────────────────────────────────────
function AudioOrb({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{
        background: isRecording
          ? 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)',
        animation: 'bgGlow 3s ease infinite',
      }}/>
      {/* Ripple rings when recording */}
      {isRecording && [1,2,3,4].map(i => (
        <div key={i} className="absolute inset-0 rounded-full border border-red-500/25" style={{ animation: `ripple ${1.2 + i * 0.5}s ease-out ${i * 0.35}s infinite` }}/>
      ))}
      {/* Orbiting rings */}
      {[
        { color: isRecording ? 'rgba(239,68,68,0.55)' : 'rgba(20,184,166,0.5)',   dur: isRecording ? '1.2s':'3.5s', anim:'orbRing1' },
        { color: isRecording ? 'rgba(249,115,22,0.45)' : 'rgba(139,92,246,0.4)',  dur: isRecording ? '1.8s':'5s',   anim:'orbRing2' },
        { color: isRecording ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.3)',   dur: isRecording ? '2.4s':'7s',   anim:'orbRing3' },
        { color: isRecording ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.2)',   dur: isRecording ? '3s':  '9s',   anim:'orbRing4' },
      ].map((ring, i) => (
        <div key={i} className="absolute rounded-full border-[1.5px] pointer-events-none" style={{
          inset: `${i * 6}px`, borderColor: ring.color,
          animation: `${ring.anim} ${ring.dur} linear infinite`,
        }}/>
      ))}
      {/* Core button */}
      <button onClick={onClick} className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: isRecording
            ? 'radial-gradient(circle at 35% 30%, #fb923c, #ef4444 60%, #b91c1c)'
            : 'radial-gradient(circle at 35% 30%, #5eead4, #14b8a6 50%, #0d9488)',
          boxShadow: isRecording
            ? '0 0 60px rgba(239,68,68,0.6), 0 0 120px rgba(239,68,68,0.2), inset 0 2px 0 rgba(255,255,255,0.25)'
            : '0 0 60px rgba(20,184,166,0.5), 0 0 120px rgba(20,184,166,0.15), inset 0 2px 0 rgba(255,255,255,0.25)',
          animation: isRecording ? 'orbPulse 0.9s ease-in-out infinite' : 'float 3s ease-in-out infinite',
        }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 28% 28%, rgba(255,255,255,0.3), transparent 55%)' }}/>
        {isRecording
          ? <StopCircle className="w-9 h-9 text-white relative z-10 drop-shadow-lg"/>
          : <Mic className="w-9 h-9 text-white relative z-10 drop-shadow-lg"/>}
      </button>
    </div>
  )
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-2">
      {WIZARD_STEPS.map((step, idx) => {
        const done = current > step.id, active = current === step.id
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-500" style={{
                background: done ? `linear-gradient(135deg, ${step.color}, ${step.color}cc)` : active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: active ? `1.5px solid ${step.color}` : done ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                boxShadow: active ? `0 0 20px ${step.glow}, 0 0 40px ${step.glow.replace('0.4','0.15')}` : done ? `0 0 12px ${step.glow}` : 'none',
              }}>
                {done
                  ? <CheckCircle className="w-5 h-5 text-white"/>
                  : <span className="text-base leading-none" style={{ filter: active ? 'none' : 'grayscale(0.7) opacity(0.5)' }}>{step.icon}</span>}
                {active && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: step.color, opacity: 0.12 }}/>}
              </div>
              <span className="text-[10px] font-semibold tracking-wider" style={{ color: done ? step.color : active ? '#ffffff' : 'rgba(148,163,184,0.6)', transition: 'color 0.3s' }}>
                {step.label}
              </span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className="w-16 h-px mb-5 mx-1 relative overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{
                  width: current > step.id ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${step.color}, ${WIZARD_STEPS[idx+1].color})`,
                  boxShadow: current > step.id ? `0 0 6px ${step.glow}` : 'none',
                }}/>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── STEP 1: SES SEÇ ─────────────────────────────────────────────────────────
function StepVoice({ selectedId, selectedType, onSelect, onMsg }: any) {
  const [voiceSubTab, setVoiceSubTab] = useState<'mine' | 'library'>('mine')
  const [voices, setVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [fileName, setFileName] = useState('')
  const [libVoices, setLibVoices] = useState<any[]>([])
  const [libLoading, setLibLoading] = useState(false)
  const [libSearch, setLibSearch] = useState('')
  const [libGender, setLibGender] = useState('')
  const [libLang, setLibLang] = useState('tr')
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => { loadVoices() }, [])
  useEffect(() => { if (voiceSubTab === 'library') loadLib(libLang) }, [voiceSubTab, libLang])
  useEffect(() => () => stopRec(true), [])

  async function loadVoices() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/voice/my-voices`, { headers: authH() }); const d = await r.json(); setVoices(d.voices || []) }
    catch {} setLoading(false)
  }
  async function loadLib(l: string) {
    setLibLoading(true); setLibVoices([])
    try { const r = await fetch(`${API}/api/voice/library-voices?language=${l}&limit=80`, { headers: authH() }); const d = await r.json(); setLibVoices(d.voices || []) }
    catch {} setLibLoading(false)
  }
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const actx = new AudioContext(); audioCtxRef.current = actx
      const src = actx.createMediaStreamSource(stream)
      const an = actx.createAnalyser(); an.fftSize = 256
      src.connect(an); setAnalyser(an)
      chunksRef.current = []
      const mr = new MediaRecorder(stream); mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob); setRecordedUrl(URL.createObjectURL(blob))
        streamRef.current?.getTracks().forEach(t => t.stop()); audioCtxRef.current?.close(); setAnalyser(null)
      }
      mr.start(250); setIsRecording(true); setRecordingTime(0); setRecordedBlob(null); setRecordedUrl(null)
      timerRef.current = setInterval(() => setRecordingTime(t => { if (t >= 179) { stopRec(false); return 180 } return t + 1 }), 1000)
    } catch { onMsg('error', 'Mikrofon erişimi reddedildi') }
  }
  function stopRec(silent = false) {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop()); setIsRecording(false)
  }
  function clearRec() { setRecordedBlob(null); setRecordedUrl(null); setRecordingTime(0) }
  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

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
      const r = await fetch(`${API}/api/voice/clone`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form })
      const d = await r.json()
      if (d.ok) { onMsg('success', 'Sesiniz kaydedildi!'); setVoiceName(''); setFileName(''); clearRec(); await loadVoices(); onSelect(d.voiceId, d.voiceName, 'cloned') }
      else onMsg('error', d.error || 'Kaydetme başarısız')
    } catch (e: any) { onMsg('error', e.message) }
    setCloning(false)
  }

  async function playLib(voice: any) {
    if (playing === voice.id) { globalAudio?.pause(); globalAudio = null; setPlaying(null); return }
    globalAudio?.pause(); globalAudio = null
    if (!voice.previewUrl) return
    setPlaying(voice.id)
    const a = new Audio(voice.previewUrl); globalAudio = a
    a.onended = () => { setPlaying(null); globalAudio = null }
    a.onerror = () => { setPlaying(null); globalAudio = null }
    a.play().catch(() => setPlaying(null))
  }

  const filteredLib = libVoices.filter(v => {
    if (libSearch && !v.name?.toLowerCase().includes(libSearch.toLowerCase())) return false
    if (libGender && v.gender !== libGender) return false
    return true
  })

  return (
    <div className="step-slide">
      {/* Sub-tab toggle */}
      <div className="flex gap-1.5 mb-6 p-1.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'mine',    label: 'Kendi Sesim',    icon: '🎙️', color: 'from-violet-600 to-purple-700' },
          { id: 'library', label: 'Ses Kütüphanesi', icon: '🎵', color: 'from-teal-600 to-cyan-700' },
        ].map(s => (
          <button key={s.id} onClick={() => setVoiceSubTab(s.id as any)}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              voiceSubTab === s.id ? `bg-gradient-to-r ${s.color} text-white shadow-lg` : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            <span className="text-base">{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {voiceSubTab === 'mine' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: recorder */}
          <div className="lg:col-span-3 space-y-4">
            {/* Input mode */}
            <div className="flex gap-2">
              {[{id:'record',icon:<Mic className="w-3.5 h-3.5"/>,label:'Canlı Kayıt'},{id:'upload',icon:<Upload className="w-3.5 h-3.5"/>,label:'Dosya Yükle'}].map(m => (
                <button key={m.id} onClick={() => { setInputMode(m.id as any); clearRec() }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${inputMode===m.id ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' : 'text-slate-500 hover:text-white glass-card'}`}>
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
            {/* Name input */}
            <input value={voiceName} onChange={e => setVoiceName(e.target.value)} placeholder="Ses ismi (örn: Ahmet'in Sesi)"
              className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', '--tw-ring-color': 'rgba(139,92,246,0.4)' } as any}
              onFocus={e => (e.target.style.borderColor='rgba(139,92,246,0.5)')}
              onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.08)')}/>

            {inputMode === 'record' ? (
              <div className="rounded-3xl p-6 flex flex-col items-center gap-4" style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08), rgba(0,0,0,0.4) 70%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <AudioOrb isRecording={isRecording} onClick={isRecording ? () => stopRec(false) : startRec}/>
                <WaveformCanvas isRecording={isRecording} analyser={analyser}/>
                {isRecording
                  ? <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'orbPulse 0.8s ease infinite' }}/>
                      <span className="font-mono text-3xl font-bold text-white tracking-widest">{fmt(recordingTime)}</span>
                      <span className="text-xs text-slate-600">/ 3:00</span>
                    </div>
                  : <p className="text-slate-500 text-sm text-center">{recordedUrl ? '✓ Kayıt hazır' : 'Orb\'a tıklayarak kayda başlayın'}</p>}
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                className="rounded-3xl p-10 text-center cursor-pointer border-2 border-dashed group transition-all duration-300 hover:scale-[1.01]"
                style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(139,92,246,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.1)')}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Upload className="w-7 h-7 text-violet-400"/>
                </div>
                <p className="text-white font-medium mb-1">{fileName || 'Ses dosyası seçin'}</p>
                <p className="text-slate-500 text-xs">MP3, WAV, M4A — maks 25 MB</p>
                <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name || '')}/>
              </div>
            )}

            {recordedUrl && !isRecording && (
              <div className="flex items-center gap-3 p-4 rounded-2xl fade-in-up" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"/>
                <span className="text-emerald-400 text-xs font-semibold">{fmt(recordingTime)} kayıt</span>
                <audio controls src={recordedUrl} className="flex-1 h-8" style={{ colorScheme: 'dark' }}/>
                <button onClick={clearRec} className="text-slate-600 hover:text-red-400 transition p-1"><Trash2 className="w-4 h-4"/></button>
              </div>
            )}

            <button onClick={cloneVoice}
              disabled={cloning || (inputMode === 'record' && !recordedBlob) || (inputMode === 'upload' && !fileName)}
              className="lux-btn w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden">
              <span className="relative flex items-center justify-center gap-2">
                {cloning ? <><RefreshCw className="w-4 h-4 animate-spin"/>Kaydediliyor...</> : <><Mic className="w-4 h-4"/>Sesi Sisteme Kaydet</>}
              </span>
            </button>
          </div>

          {/* Right: saved voices */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-violet-400"/>Kayıtlı Seslerim
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{voices.length}</span>
              </h4>
              <button onClick={loadVoices} className="text-slate-500 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/>
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-500 text-sm">
                <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"/>Yükleniyor
              </div>
            ) : voices.length === 0 ? (
              <div className="text-center py-10 rounded-2xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Mic className="w-10 h-10 mx-auto mb-2 text-slate-700"/>
                <p className="text-slate-500 text-sm">Henüz ses eklenmedi</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5 custom-scroll">
                {voices.map((v: any) => {
                  const active = selectedId === v.id
                  return (
                    <div key={v.id} onClick={() => onSelect(v.id, v.name, 'cloned')}
                      className={`group relative flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden voice-card ${active ? 'active' : ''}`}
                      style={{
                        background: active ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.025)',
                        border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: active ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
                      }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)' }}>🎙️</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-medium truncate">{v.name}</span>
                          {active && <CheckCircle className="w-3.5 h-3.5 text-violet-400 shrink-0"/>}
                        </div>
                        <span className="text-xs text-slate-500">{new Date(v.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={e => { e.stopPropagation(); if (playing===v.id){globalAudio?.pause();globalAudio=null;setPlaying(null);return} globalAudio?.pause();globalAudio=null;setPlaying(v.id);const a=new Audio(v.sample_url);globalAudio=a;a.onended=()=>{setPlaying(null);globalAudio=null};a.play().catch(()=>setPlaying(null)) }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:scale-110"
                          style={{ background: playing===v.id ? '#ef4444' : 'rgba(255,255,255,0.08)' }}>
                          {playing === v.id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
                        </button>
                        <button onClick={async e => { e.stopPropagation(); await fetch(`${API}/api/voice/my-voices/${v.id}`, { method:'DELETE', headers:authH() }); await loadVoices(); if (selectedId===v.id) onSelect('','','library') }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/20 transition hover:scale-110" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <Trash2 className="w-3 h-3 text-slate-400"/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Library */
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {VOICE_LANGS.map(l => (
              <button key={l.code} onClick={() => setLibLang(l.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${libLang===l.code ? 'text-white shadow-md' : 'text-slate-400 hover:text-white glass-card'}`}
                style={libLang===l.code ? { background: 'linear-gradient(135deg, rgba(20,184,166,0.8), rgba(6,182,212,0.8))', border: '1px solid rgba(20,184,166,0.4)' } : {}}>
                <span>{l.flag}</span><span>{l.name}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Ses ara..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-all glass-card"/>
            </div>
            <div className="relative">
              <select value={libGender} onChange={e => setLibGender(e.target.value)}
                className="px-3 pr-8 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', appearance: 'none', WebkitAppearance: 'none' }}>
                <option value="" style={{ background: '#0a0a14' }}>Tümü</option>
                <option value="male" style={{ background: '#0a0a14' }}>Erkek</option>
                <option value="female" style={{ background: '#0a0a14' }}>Kadın</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▾</div>
            </div>
          </div>
          <p className="text-xs text-slate-600">{LANG_MAP[libLang]?.flag} {LANG_MAP[libLang]?.name} — {filteredLib.length} ses</p>
          {libLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
              <div className="w-5 h-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"/>Yükleniyor...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scroll">
              {filteredLib.map((v: any) => {
                const active = selectedId === v.id && selectedType === 'library'
                return (
                  <div key={v.id} onClick={() => onSelect(v.id, v.name, 'library')}
                    className="group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 voice-card"
                    style={{ background: active ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.025)', border: active ? '1px solid rgba(20,184,166,0.35)' : '1px solid rgba(255,255,255,0.06)', boxShadow: active ? '0 0 16px rgba(20,184,166,0.12)' : 'none' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: active ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.05)' }}>
                      {v.gender === 'female' ? '👩' : '👨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{v.name}</span>
                        {active && <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>}
                      </div>
                      <span className="text-xs text-slate-500">{v.gender==='female'?'Kadın':'Erkek'}{v.accent?` · ${v.accent}`:''}</span>
                    </div>
                    {v.previewUrl && (
                      <button onClick={e => { e.stopPropagation(); playLib(v) }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:scale-110"
                        style={{ background: playing===v.id ? '#ef4444' : 'rgba(255,255,255,0.08)' }}>
                        {playing===v.id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── STEP 2: LEAD SEÇ ────────────────────────────────────────────────────────
function StepLead({ leads, callMode, setCallMode, selectedLead, setSelectedLead, selectedLeads, setSelectedLeads, campaignName, setCampaignName, filterCountry, setFilterCountry }: any) {
  const leadsWithPhone = leads.filter((l: any) => l.phone)
  const countries = [...new Set(leadsWithPhone.map((l: any) => l.country).filter(Boolean))] as string[]
  const filtered = filterCountry ? leadsWithPhone.filter((l: any) => l.country === filterCountry) : leadsWithPhone

  return (
    <div className="step-slide space-y-5">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'single',   icon: <PhoneCall className="w-5 h-5"/>,  label: 'Tek Arama',  desc: '1 kişiyi ara',     color: '#14b8a6', glow: 'rgba(20,184,166,0.3)'  },
          { id: 'campaign', icon: <Users className="w-5 h-5"/>,       label: 'Kampanya',   desc: 'Toplu arama yap', color: '#f59e0b', glow: 'rgba(251,191,36,0.3)' },
        ].map(m => {
          const active = callMode === m.id
          return (
            <button key={m.id} onClick={() => setCallMode(m.id)}
              className="relative p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden group"
              style={{ background: active ? `rgba(${m.id==='single'?'20,184,166':'251,191,36'},0.1)` : 'rgba(0,0,0,0.3)', border: `1.5px solid ${active ? m.color+'60' : 'rgba(255,255,255,0.07)'}`, boxShadow: active ? `0 0 24px ${m.glow}` : 'none' }}>
              {active && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 0% 0%, ${m.glow}, transparent 60%)` }}/>}
              <div className="relative flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}20`, color: m.color }}>
                  {m.icon}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{m.label}</div>
                  <div className="text-slate-500 text-xs">{m.desc}</div>
                </div>
                {active && <CheckCircle className="w-4 h-4 ml-auto" style={{ color: m.color }}/>}
              </div>
            </button>
          )
        })}
      </div>

      {callMode === 'campaign' && (
        <div className="grid grid-cols-2 gap-3 fade-in-up">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Kampanya Adı</label>
            <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Mayıs 2026 Kampanyası"
              className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-slate-600 glass-card focus:outline-none transition-all"
              onFocus={e => (e.target.style.borderColor='rgba(251,191,36,0.5)')}
              onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.07)')}/>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Ülke Filtresi</label>
            <div className="relative">
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-2xl text-sm text-white focus:outline-none"
                style={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', appearance: 'none', WebkitAppearance: 'none' }}>
                <option value="" style={{ background: '#0a0a14' }}>Tüm Ülkeler ({leadsWithPhone.length})</option>
                {countries.map(c => <option key={c} value={c} style={{ background: '#0a0a14' }}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {callMode==='campaign' ? (
              <><span className="text-white font-bold">{selectedLeads.length}</span> / {filtered.length} lead seçili</>
            ) : 'Lead Seç'}
          </label>
          {callMode==='campaign' && (
            <div className="flex gap-3">
              <button onClick={() => setSelectedLeads(filtered.map((l: any) => l.id))} className="text-xs font-semibold transition" style={{ color: '#f59e0b' }}>Tümünü Seç</button>
              <button onClick={() => setSelectedLeads([])} className="text-xs text-slate-500 hover:text-white transition">Temizle</button>
            </div>
          )}
        </div>

        {callMode === 'single' ? (
          <div className="relative">
            <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
              className="w-full px-4 py-3.5 pr-10 rounded-2xl text-white text-sm focus:outline-none transition-all"
              style={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', appearance: 'none', WebkitAppearance: 'none' }}
              onFocus={e => (e.target.style.borderColor='rgba(20,184,166,0.5)')}
              onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.1)')}>
              <option value="" style={{ background: '#0a0a14' }}>Lead seçin ({leadsWithPhone.length} telefon numaralı)</option>
              {leadsWithPhone.map((l: any) => (
                <option key={l.id} value={l.id} style={{ background: '#0a0a14' }}>{l.company_name}{l.country?` (${l.country})`:''} — {l.phone}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto rounded-2xl custom-scroll space-y-0.5 p-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filtered.map((l: any) => {
              const checked = selectedLeads.includes(l.id)
              return (
                <label key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group"
                  style={{ background: checked ? 'rgba(251,191,36,0.06)' : 'transparent' }}
                  onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background='transparent' }}>
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <input type="checkbox" checked={checked}
                      onChange={ev => setSelectedLeads((prev: string[]) => ev.target.checked ? [...prev, l.id] : prev.filter((id: string) => id !== l.id))}
                      className="sr-only"/>
                    <div className="w-4 h-4 rounded-[4px] flex items-center justify-center transition-all" style={{ background: checked ? '#f59e0b' : 'rgba(255,255,255,0.08)', border: checked ? 'none' : '1px solid rgba(255,255,255,0.2)' }}>
                      {checked && <CheckCircle className="w-3 h-3 text-white"/>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">{l.company_name}</div>
                    <div className="text-slate-500 text-xs">{l.phone}{l.country?` · ${l.country}`:''}</div>
                  </div>
                </label>
              )
            })}
            {filtered.length === 0 && <p className="text-slate-600 text-xs text-center py-6">Telefon numarası olan lead yok</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── STEP 3: HAZIRLA ─────────────────────────────────────────────────────────
function StepConfig({ selectedLanguage, setSelectedLanguage, callMode, delayMinutes, setDelayMinutes, settings, setSettings }: any) {
  return (
    <div className="step-slide space-y-6">
      <div>
        <label className="text-xs text-slate-500 mb-3 block font-bold uppercase tracking-widest">Arama Dili</label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {VOICE_LANGS.map(l => {
            const active = selectedLanguage === l.code
            return (
              <button key={l.code} onClick={() => setSelectedLanguage(l.code)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs transition-all duration-200 hover:scale-105"
                style={{ background: active ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)', border: active ? '1.5px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.07)', boxShadow: active ? '0 0 16px rgba(251,191,36,0.2)' : 'none' }}>
                <span className="text-2xl">{l.flag}</span>
                <span className="text-[10px] font-semibold" style={{ color: active ? '#fbbf24' : '#94a3b8' }}>{l.name.split(' ')[0]}</span>
              </button>
            )
          })}
          <button onClick={() => setSelectedLanguage('')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs transition-all duration-200 hover:scale-105"
            style={{ background: !selectedLanguage ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.03)', border: !selectedLanguage ? '1.5px solid rgba(20,184,166,0.5)' : '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-2xl">🌍</span>
            <span className="text-[10px] font-semibold" style={{ color: !selectedLanguage ? '#14b8a6' : '#94a3b8' }}>Otomatik</span>
          </button>
        </div>
      </div>

      {callMode === 'campaign' && (
        <div className="fade-in-up">
          <label className="text-xs text-slate-500 mb-3 block font-bold uppercase tracking-widest">Aramalar Arası Bekleme</label>
          <div className="flex gap-2 flex-wrap">
            {[2,5,10,15,30].map(m => (
              <button key={m} onClick={() => setDelayMinutes(m)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{ background: delayMinutes===m ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', border: delayMinutes===m ? '1.5px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.07)', color: delayMinutes===m ? '#fbbf24' : '#94a3b8' }}>
                {m} dk
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-500 mb-3 block font-bold uppercase tracking-widest">Temsilci Profili</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key:'agent_name',          label:'Temsilci Adı',  ph:'Ahmet'               },
            { key:'company_name',         label:'Şirket Adı',    ph:'Şirketiniz'          },
            { key:'product_description',  label:'Ürün / Hizmet', ph:'Ne sattığınızı açıklayın' },
            { key:'transfer_number',      label:'Transfer No',   ph:'İnsan temsilci'      },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-[11px] text-slate-600 mb-1.5 block font-semibold uppercase tracking-wider">{label}</label>
              <input value={settings[key]||''} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))} placeholder={ph}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 glass-card focus:outline-none transition-all"
                onFocus={ev => (ev.target.style.borderColor='rgba(59,130,246,0.5)')}
                onBlur={ev => (ev.target.style.borderColor='rgba(255,255,255,0.07)')}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 4: BAŞLAT ───────────────────────────────────────────────────────────
function StepLaunch({ selectedVoiceName, selectedVoiceType, callMode, selectedLead, selectedLeads, selectedLanguage, leads, calling, campaignRunning, onCall, onCampaign }: any) {
  const [launched, setLaunched] = useState(false)
  const [pipeStep, setPipeStep] = useState(0)
  const lead = leads.find((l: any) => l.id === selectedLead)
  const isRunning = calling || campaignRunning

  const PIPE = [
    { label: 'AI Araştırması',   desc: 'Şirket bilgileri taranıyor…',       color: '#3b82f6', dur: 1200 },
    { label: 'Script Üretimi',   desc: 'Kişiselleştirilmiş açılış hazırlanıyor…', color: '#8b5cf6', dur: 900  },
    { label: 'Ses Klonlama',     desc: 'Sesiniz sentezleniyor…',             color: '#14b8a6', dur: 800  },
    { label: 'Bağlantı',         desc: 'Telefon açılıyor…',                  color: '#10b981', dur: 600  },
  ]

  async function handleLaunch() {
    setLaunched(true); setPipeStep(0)
    let delay = 0
    for (let i = 0; i < PIPE.length; i++) {
      delay += PIPE[i].dur
      setTimeout(() => setPipeStep(i + 1), delay)
    }
    if (callMode === 'single') await onCall()
    else await onCampaign()
  }

  return (
    <div className="step-slide">
      {!launched ? (
        <div className="flex flex-col items-center gap-8 py-4">
          {/* Summary card */}
          <div className="w-full max-w-md rounded-3xl p-6 space-y-3" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { icon: '🎙️', label: 'Ses',    value: selectedVoiceName || '—', color: selectedVoiceType==='cloned' ? '#8b5cf6' : '#14b8a6' },
              { icon: '👤',  label: 'Hedef',  value: callMode==='single' ? (lead?.company_name || '—') : `${selectedLeads.length} lead`, color: '#f59e0b' },
              { icon: '🌍',  label: 'Dil',    value: selectedLanguage ? LANG_MAP[selectedLanguage]?.name || selectedLanguage : 'Otomatik', color: '#3b82f6' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xl w-8 text-center">{row.icon}</span>
                <span className="text-slate-500 text-xs w-12">{row.label}</span>
                <span className="font-semibold text-sm" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Giant launch button */}
          <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)', animation: 'bgGlow 3s ease infinite' }}/>
            {[1,2,3].map(i => (
              <div key={i} className="absolute rounded-full border" style={{ inset: `${(i-1)*18}px`, borderColor: `rgba(59,130,246,${0.12-i*0.03})`, animation: `orbRing${i} ${6+i*2}s linear infinite` }}/>
            ))}
            <button onClick={handleLaunch} disabled={isRunning || (!selectedVoiceName) || (callMode==='single' && !selectedLead) || (callMode==='campaign' && !selectedLeads.length)}
              className="relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-300 disabled:opacity-40 active:scale-95"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #93c5fd, #3b82f6 50%, #1d4ed8)',
                boxShadow: '0 0 80px rgba(59,130,246,0.5), 0 0 160px rgba(59,130,246,0.15), inset 0 2px 0 rgba(255,255,255,0.3)',
                animation: 'float 3s ease-in-out infinite',
              }}>
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.3), transparent 55%)' }}/>
              <Phone className="w-8 h-8 text-white relative z-10 drop-shadow-lg"/>
              <span className="text-white text-xs font-bold relative z-10 tracking-wide">
                {callMode === 'single' ? 'ARA' : `${selectedLeads.length} ARA`}
              </span>
            </button>
          </div>
          <p className="text-slate-500 text-sm text-center">AI araştırma → Kişisel script → Ses klonlama → Arama</p>
        </div>
      ) : (
        /* Pipeline progress */
        <div className="flex flex-col items-center gap-6 py-8 fade-in-up">
          <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)', animation: 'bgGlow 2s ease infinite' }}/>
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(20,184,166,0.2))', border: '1.5px solid rgba(16,185,129,0.4)' }}>
              {pipeStep >= PIPE.length
                ? <CheckCircle className="w-9 h-9 text-emerald-400"/>
                : <div className="w-7 h-7 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"/>}
            </div>
          </div>
          <div className="w-full max-w-md space-y-3">
            {PIPE.map((p, i) => {
              const done = pipeStep > i, active = pipeStep === i
              return (
                <div key={p.label} className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-500"
                  style={{ background: done ? `rgba(${p.color==='#10b981'?'16,185,129':p.color==='#14b8a6'?'20,184,166':p.color==='#8b5cf6'?'139,92,246':'59,130,246'},0.08)` : active ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)', border: done ? `1px solid ${p.color}30` : active ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: done || active ? `${p.color}20` : 'rgba(255,255,255,0.04)' }}>
                    {done ? <CheckCircle className="w-4 h-4" style={{ color: p.color }}/> : active ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: p.color, borderTopColor: 'transparent' }}/> : <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(148,163,184,0.3)' }}/>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: done ? p.color : active ? '#ffffff' : 'rgba(148,163,184,0.5)' }}>{p.label}</div>
                    {(active || done) && <div className="text-xs mt-0.5" style={{ color: done ? 'rgba(148,163,184,0.6)' : 'rgba(148,163,184,0.8)' }}>{p.desc}</div>}
                  </div>
                </div>
              )
            })}
          </div>
          {pipeStep >= PIPE.length && (
            <div className="text-center fade-in-up">
              <p className="text-emerald-400 font-bold text-lg">Arama Başlatıldı!</p>
              <p className="text-slate-500 text-sm mt-1">Aramalar sekmesinden takip edebilirsiniz</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function VoicePage() {
  const { t } = useI18n()
  const [step, setStep] = useState(1)
  const [callMode, setCallMode] = useState<'single' | 'campaign'>('single')
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
  const [showCalls, setShowCalls] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [l, c, ca, s, st] = await Promise.allSettled([
        fetch(`${API}/api/leads/with-phone`, { headers: authH() }),
        fetch(`${API}/api/voice/calls?limit=30`, { headers: authH() }),
        fetch(`${API}/api/voice/campaigns`, { headers: authH() }),
        fetch(`${API}/api/voice/settings`, { headers: authH() }),
        fetch(`${API}/api/voice/stats`, { headers: authH() }),
      ])
      if (l.status === 'fulfilled') { const d = await (l.value as any).json(); setLeads(d.leads || []) }
      if (c.status === 'fulfilled') { const d = await (c.value as any).json(); setCalls(d.calls || []) }
      if (ca.status === 'fulfilled') { const d = await (ca.value as any).json(); setCampaigns(d.campaigns || []) }
      if (s.status === 'fulfilled') {
        const d = await (s.value as any).json(); const sv = d.settings || {}
        setSettings(sv); setSelectedVoiceId(sv.elevenlabs_voice_id || '')
        setSelectedVoiceName(sv.voice_name || ''); setSelectedVoiceType(sv.voice_provider === 'cloned' ? 'cloned' : 'library')
      }
      if (st.status === 'fulfilled') { const d = await (st.value as any).json(); setStats(d) }
    } catch {}
  }

  async function selectVoice(voiceId: string, voiceName: string, voiceType: 'cloned' | 'library') {
    setSelectedVoiceId(voiceId); setSelectedVoiceName(voiceName); setSelectedVoiceType(voiceType)
    if (voiceId) {
      await fetch(`${API}/api/voice/set-voice`, { method: 'POST', headers: authH(), body: JSON.stringify({ voiceId, voiceName, voiceType }) })
      showMsg('success', `${voiceName} aktif edildi`)
    }
  }

  async function makeSingleCall() {
    if (!selectedLead) return showMsg('error', 'Lead seçin')
    setCalling(true)
    try {
      const r = await fetch(`${API}/api/voice/call/single`, { method:'POST', headers:authH(), body:JSON.stringify({ leadId:selectedLead, language:selectedLanguage }) })
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
      const r = await fetch(`${API}/api/voice/call/campaign`, { method:'POST', headers:authH(), body:JSON.stringify({ leadIds:selectedLeads, campaignName, delayMinutes, language:selectedLanguage||undefined }) })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message); loadAll(); setSelectedLeads([]) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCampaignRunning(false)
  }

  async function saveSettings() {
    try { await fetch(`${API}/api/voice/settings`, { method:'PATCH', headers:authH(), body:JSON.stringify(settings) }); showMsg('success', 'Kaydedildi') }
    catch (e: any) { showMsg('error', e.message) }
  }

  const canNext: Record<number, boolean> = {
    1: !!selectedVoiceId,
    2: callMode==='single' ? !!selectedLead : selectedLeads.length > 0,
    3: true,
    4: false,
  }

  const STATS_DATA = stats ? [
    { label:'Toplam',    value:stats.total,       color:'#ffffff',  glow:'rgba(255,255,255,0.1)'  },
    { label:'Bitti',     value:stats.completed,   color:'#34d399',  glow:'rgba(52,211,153,0.15)'  },
    { label:'Olumlu',    value:stats.positive,    color:'#2dd4bf',  glow:'rgba(45,212,191,0.15)'  },
    { label:'Cevap Yok', value:stats.no_answer,   color:'#94a3b8',  glow:'rgba(148,163,184,0.1)'  },
    { label:'Dakika',    value:stats.totalMinutes,color:'#fbbf24',  glow:'rgba(251,191,36,0.15)'  },
    { label:'Dil',       value:Object.keys(stats.byLanguage||{}).length,color:'#c084fc',glow:'rgba(192,132,252,0.15)'},
  ] : []

  return (
    <div className="space-y-5 pb-12">
      <style>{`
        @keyframes orbPulse { 0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.14);opacity:1} }
        @keyframes ripple { 0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.6);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }
        @keyframes bgGlow { 0%,100%{opacity:0.4}50%{opacity:0.8} }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        @keyframes gradFlow { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
        @keyframes orbRing1 { from{transform:rotateX(68deg) rotateZ(0deg)}to{transform:rotateX(68deg) rotateZ(360deg)} }
        @keyframes orbRing2 { from{transform:rotateX(68deg) rotateZ(120deg)}to{transform:rotateX(68deg) rotateZ(480deg)} }
        @keyframes orbRing3 { from{transform:rotateX(68deg) rotateZ(240deg)}to{transform:rotateX(68deg) rotateZ(600deg)} }
        @keyframes orbRing4 { from{transform:rotateX(45deg) rotateZ(60deg)}to{transform:rotateX(45deg) rotateZ(420deg)} }
        @keyframes stepSlide { from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)} }
        @keyframes scanLine { 0%{transform:translateY(-100%)}100%{transform:translateY(300%)} }
        .step-slide { animation: stepSlide 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fade-in-up { animation: fadeInUp 0.35s ease forwards; }
        .glass-card { background:rgba(255,255,255,0.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.07); }
        .lux-btn { background:linear-gradient(135deg,#8b5cf6,#7c3aed,#6d28d9);box-shadow:0 4px 24px rgba(139,92,246,0.3),inset 0 1px 0 rgba(255,255,255,0.15);transition:all 0.2s; }
        .lux-btn:not(:disabled):hover { transform:translateY(-1px);box-shadow:0 8px 32px rgba(139,92,246,0.4),inset 0 1px 0 rgba(255,255,255,0.2); }
        .lux-btn::before { content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.08) 50%,transparent 60%);background-size:200% 100%;animation:shimmer 3s ease-in-out infinite; }
        .voice-card:hover { transform:translateY(-1px) scale(1.005); }
        .custom-scroll::-webkit-scrollbar{width:3px}
        .custom-scroll::-webkit-scrollbar-track{background:transparent}
        .custom-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        select{background-color:#0a0a14!important;color:#fff!important;border-color:rgba(255,255,255,0.07)!important;-webkit-appearance:none;appearance:none}
        select option{background-color:#0a0a14;color:#fff}
        select:focus{outline:none}
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8" style={{
        background: 'linear-gradient(135deg, rgba(20,184,166,0.07), rgba(139,92,246,0.05), rgba(0,0,0,0))',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
      }}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.1), transparent 70%)', animation: 'bgGlow 4s ease infinite' }}/>
        <div className="absolute -bottom-12 left-8 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent 70%)', animation: 'bgGlow 5s ease 1.5s infinite' }}/>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)', boxShadow: '0 8px 32px rgba(20,184,166,0.3)' }}>
                <Phone className="w-6 h-6 text-white"/>
              </div>
              <div className="absolute -inset-0.5 rounded-2xl -z-10" style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)', filter: 'blur(10px)', opacity: 0.4 }}/>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Sesli Arama</h1>
              <p className="text-slate-400 text-sm mt-0.5">{t('voice_outreach.kendi_sesiniz_16_dil_kisi', 'Kendi sesiniz · 16 dil · Kişiselleştirilmiş AI açılış')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedVoiceName && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl" style={{ background: selectedVoiceType==='cloned'?'rgba(139,92,246,0.12)':'rgba(20,184,166,0.12)', border: `1px solid ${selectedVoiceType==='cloned'?'rgba(139,92,246,0.35)':'rgba(20,184,166,0.35)'}` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: selectedVoiceType==='cloned'?'#c084fc':'#2dd4bf', boxShadow: selectedVoiceType==='cloned'?'0 0 8px rgba(192,132,252,0.8)':'0 0 8px rgba(45,212,191,0.8)', animation: 'orbPulse 2s ease infinite' }}/>
                <span className="text-sm font-bold" style={{ color: selectedVoiceType==='cloned'?'#c084fc':'#2dd4bf' }}>{selectedVoiceName}</span>
              </div>
            )}
            <button onClick={() => setShowCalls(v=>!v)} className={`p-2.5 rounded-xl transition-all ${showCalls?'text-white':'text-slate-500 hover:text-white'} hover:bg-white/5`}>
              <Phone className="w-4 h-4"/>
            </button>
            <button onClick={() => setShowSettings(v=>!v)} className={`p-2.5 rounded-xl transition-all ${showSettings?'text-white':'text-slate-500 hover:text-white'} hover:bg-white/5`}>
              <Settings className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      {/* ── MESAJ ─────────────────────────────────────────────────────────────── */}
      {msg && (
        <div className={`fade-in-up px-5 py-3.5 rounded-2xl border text-sm flex items-center gap-3 ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-300':'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.type==='success'?'bg-emerald-400':'bg-red-400'}`}/>{msg.text}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
          {STATS_DATA.map(({ label, value, color, glow }) => (
            <div key={label} className="glass-card rounded-2xl p-4 text-center relative overflow-hidden group hover:scale-[1.04] transition-transform duration-200 cursor-default">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(ellipse at 50% 120%, ${glow}, transparent 65%)` }}/>
              <div className="text-2xl font-bold relative" style={{ color }}>{value}</div>
              <div className="text-xs text-slate-600 mt-0.5 relative">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── WIZARD CARD ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8" style={{
        background: 'rgba(4,4,12,0.7)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Ambient glow that changes per step */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-1000" style={{
          background: step===1 ? 'radial-gradient(ellipse at 80% 0%, rgba(139,92,246,0.06), transparent 60%)' :
                      step===2 ? 'radial-gradient(ellipse at 80% 0%, rgba(251,191,36,0.06), transparent 60%)' :
                      step===3 ? 'radial-gradient(ellipse at 80% 0%, rgba(251,191,36,0.05), transparent 60%)' :
                                 'radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.08), transparent 60%)',
        }}/>

        <div className="relative">
          <StepIndicator current={step}/>

          {/* Step title */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-white">{
              step===1?'Arama sesini seç':
              step===2?'Kimi arayacaksın?':
              step===3?'Aramayı hazırla':
              'Aramayı başlat'
            }</h2>
            <p className="text-slate-500 text-sm mt-0.5">{
              step===1?'Kendi sesinle veya hazır sesten birini seç':
              step===2?'Tek kişi ya da toplu kampanya seç':
              step===3?'Dil ve temsilci profilini ayarla':
              'Her şey hazır — başla!'
            }</p>
          </div>

          {/* Step content */}
          <div key={step}>
            {step===1 && <StepVoice selectedId={selectedVoiceId} selectedType={selectedVoiceType} onSelect={selectVoice} onMsg={showMsg}/>}
            {step===2 && <StepLead leads={leads} callMode={callMode} setCallMode={setCallMode} selectedLead={selectedLead} setSelectedLead={setSelectedLead} selectedLeads={selectedLeads} setSelectedLeads={setSelectedLeads} campaignName={campaignName} setCampaignName={setCampaignName} filterCountry={filterCountry} setFilterCountry={setFilterCountry}/>}
            {step===3 && <StepConfig selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage} callMode={callMode} delayMinutes={delayMinutes} setDelayMinutes={setDelayMinutes} settings={settings} setSettings={setSettings}/>}
            {step===4 && <StepLaunch selectedVoiceName={selectedVoiceName} selectedVoiceType={selectedVoiceType} callMode={callMode} selectedLead={selectedLead} selectedLeads={selectedLeads} selectedLanguage={selectedLanguage} leads={leads} calling={calling} campaignRunning={campaignRunning} onCall={makeSingleCall} onCampaign={startCampaign}/>}
          </div>

          {/* Navigation */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step===1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4"/> Geri
              </button>

              <div className="flex items-center gap-2">
                {WIZARD_STEPS.map(s => (
                  <div key={s.id} className="w-1.5 h-1.5 rounded-full transition-all duration-300" style={{ background: step===s.id ? s.color : step>s.id ? s.color+'80' : 'rgba(255,255,255,0.15)', transform: step===s.id ? 'scale(1.4)' : 'scale(1)' }}/>
                ))}
              </div>

              <button onClick={() => { if (step === 3) { saveSettings() }; setStep(s => Math.min(4, s + 1)) }} disabled={!canNext[step]}
                className="relative flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold text-white overflow-hidden disabled:opacity-35 disabled:cursor-not-allowed transition-all hover:scale-[1.03] active:scale-100"
                style={{
                  background: canNext[step] ? `linear-gradient(135deg, ${WIZARD_STEPS[step-1].color}, ${WIZARD_STEPS[step].color})` : 'rgba(255,255,255,0.05)',
                  boxShadow: canNext[step] ? `0 4px 20px ${WIZARD_STEPS[step-1].glow}` : 'none',
                }}>
                <span className="relative">Devam Et</span>
                <ArrowRight className="w-4 h-4 relative"/>
                {canNext[step] && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s ease-in-out infinite' }}/>}
              </button>
            </div>
          )}
          {step === 4 && (
            <div className="flex justify-start mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setStep(3)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4"/> Geri
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ARAMALAR (collapsible) ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <button onClick={() => setShowCalls(v => !v)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/3 transition-colors">
          <h3 className="font-bold text-white flex items-center gap-2.5 text-sm">
            <div className="w-7 h-7 rounded-xl bg-blue-500/15 flex items-center justify-center"><Phone className="w-3.5 h-3.5 text-blue-400"/></div>
            Arama Geçmişi
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{calls.length}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); loadAll() }} className="p-1.5 text-slate-500 hover:text-white transition rounded-lg hover:bg-white/5">
              <RefreshCw className="w-3.5 h-3.5"/>
            </button>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${showCalls ? 'rotate-90' : ''}`}/>
          </div>
        </button>
        {showCalls && (
          <div className="overflow-x-auto fade-in-up" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Lead','Numara','Dil','Durum','Sonuç','Tarih'].map(h => (
                    <th key={h} className={`px-5 py-3 font-semibold ${h==='Lead'||h==='Numara'?'text-left':'text-center'} last:text-right`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-3.5">
                      <div className="text-white text-xs font-semibold">{c.leads?.company_name||'—'}</div>
                      <div className="text-slate-600 text-xs">{c.leads?.country||''}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{c.callee_number}</td>
                    <td className="px-5 py-3.5 text-center text-lg">{LANG_MAP[c.language]?.flag||'🌍'}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={c.status}/></td>
                    <td className="px-5 py-3.5 text-center">
                      {c.outcome==='positive'?<span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Olumlu</span>:c.outcome==='negative'?<span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">Olumsuz</span>:<span className="text-slate-700 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calls.length===0 && (
              <div className="text-center py-14 text-slate-600">
                <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-3"><Phone className="w-6 h-6 opacity-30"/></div>
                <p className="text-sm font-medium">{t('voice_outreach.henuz_arama_yapilmamis', 'Henüz arama yapılmamış')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AYARLAR (collapsible) ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <button onClick={() => setShowSettings(v => !v)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/3 transition-colors">
          <h3 className="font-bold text-white flex items-center gap-2.5 text-sm">
            <div className="w-7 h-7 rounded-xl bg-blue-500/15 flex items-center justify-center"><Settings className="w-3.5 h-3.5 text-blue-400"/></div>
            Temsilci Ayarları
          </h3>
          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`}/>
        </button>
        {showSettings && (
          <div className="px-6 pb-6 pt-2 fade-in-up" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                { key:'agent_name',label:'Temsilci Adı',ph:'Ahmet' },
                { key:'company_name',label:'Şirket Adı',ph:'Şirketiniz' },
                { key:'product_description',label:'Ürün / Hizmet',ph:'Ne sattığınızı açıklayın' },
                { key:'transfer_number',label:'Transfer Numarası',ph:'İnsan temsilci no' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">{label}</label>
                  <input value={settings[key]||''} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))} placeholder={ph}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 glass-card focus:outline-none transition-all"
                    onFocus={ev => (ev.target.style.borderColor='rgba(59,130,246,0.5)')}
                    onBlur={ev => (ev.target.style.borderColor='rgba(255,255,255,0.07)')}/>
                </div>
              ))}
            </div>
            <button onClick={saveSettings} className="lux-btn relative px-8 py-3 rounded-2xl font-bold text-white text-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              <span className="relative">Kaydet</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
