'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, Mic, Upload, Play, Square,
  CheckCircle, AlertTriangle, RefreshCw, Zap, Volume2,
  Globe2, Search, Settings, Sparkles, Trash2, User, StopCircle
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const LANG_MAP: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Türkçe', flag: '🇹🇷' }, en: { name: 'İngilizce', flag: '🇬🇧' },
  de: { name: 'Almanca', flag: '🇩🇪' }, fr: { name: 'Fransızca', flag: '🇫🇷' },
  ar: { name: 'Arapça', flag: '🇸🇦' }, ru: { name: 'Rusça', flag: '🇷🇺' },
  az: { name: 'Azerbaycanca', flag: '🇦🇿' }, it: { name: 'İtalyanca', flag: '🇮🇹' },
  es: { name: 'İspanyolca', flag: '🇪🇸' }, nl: { name: 'Hollandaca', flag: '🇳🇱' },
  zh: { name: 'Çince', flag: '🇨🇳' }, ja: { name: 'Japonca', flag: '🇯🇵' },
  ko: { name: 'Korece', flag: '🇰🇷' }, hi: { name: 'Hintçe', flag: '🇮🇳' },
  pt: { name: 'Portekizce', flag: '🇵🇹' }, pl: { name: 'Lehçe', flag: '🇵🇱' },
}
const VOICE_LANGS = Object.entries(LANG_MAP).map(([code, v]) => ({ code, ...v }))

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:   { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
    calling:     { label: 'Arıyor', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20 animate-pulse' },
    initiating:  { label: 'Başlatılıyor', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
    'no-answer': { label: 'Cevap Yok', cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
    failed:      { label: 'Başarısız', cls: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

let globalAudio: HTMLAudioElement | null = null

// ─── WAVEFORM CANVAS ──────────────────────────────────────────────────────────
function WaveformCanvas({ isRecording, analyser }: { isRecording: boolean; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const bars = 48

    function draw() {
      ctx.clearRect(0, 0, W, H)
      if (isRecording && analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        for (let i = 0; i < bars; i++) {
          const idx = Math.floor((i / bars) * data.length)
          const v = data[idx] / 255
          const barH = Math.max(3, v * H * 0.9)
          const x = (i / bars) * W + (W / bars) * 0.15
          const bw = (W / bars) * 0.7
          const y = (H - barH) / 2
          const alpha = 0.4 + v * 0.6
          ctx.fillStyle = `rgba(20,184,166,${alpha})`
          const r = bw / 2
          ctx.beginPath()
          ctx.roundRect(x, y, bw, barH, r)
          ctx.fill()
        }
      } else {
        const t = Date.now() / 1000
        for (let i = 0; i < bars; i++) {
          const v = (Math.sin(t * 1.5 + i * 0.4) * 0.3 + 0.35) * (isRecording ? 1 : 0.35)
          const barH = Math.max(3, v * H)
          const x = (i / bars) * W + (W / bars) * 0.15
          const bw = (W / bars) * 0.7
          const y = (H - barH) / 2
          ctx.fillStyle = `rgba(71,85,105,0.6)`
          const r = bw / 2
          ctx.beginPath()
          ctx.roundRect(x, y, bw, barH, r)
          ctx.fill()
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isRecording, analyser])

  return <canvas ref={canvasRef} width={480} height={80} className="w-full h-20 rounded-xl"/>
}

// ─── 3D ORB ───────────────────────────────────────────────────────────────────
function AudioOrb({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <style>{`
        @keyframes orbRing1 { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(360deg); } }
        @keyframes orbRing2 { from { transform: rotateX(70deg) rotateZ(120deg); } to { transform: rotateX(70deg) rotateZ(480deg); } }
        @keyframes orbRing3 { from { transform: rotateX(70deg) rotateZ(240deg); } to { transform: rotateX(70deg) rotateZ(600deg); } }
        @keyframes orbPulse { 0%,100% { transform: scale(1); opacity:0.6; } 50% { transform: scale(1.15); opacity:1; } }
        @keyframes ripple { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(2.2); opacity:0; } }
        @keyframes gradFlow { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes scanLine { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes statGlow { 0%,100% { box-shadow:0 0 0 0 rgba(20,184,166,0); } 50% { box-shadow:0 0 20px 2px rgba(20,184,166,0.15); } }
        .orb-ring { position:absolute; inset:0; border-radius:50%; border:1.5px solid; animation-timing-function:linear; animation-iteration-count:infinite; }
        .tilt-card { transition: transform 0.2s ease; transform-style: preserve-3d; }
        .tilt-card:hover { transform: perspective(600px) rotateX(2deg) rotateY(4deg) scale(1.02); }
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.07); }
        .grad-border { position:relative; }
        .grad-border::before { content:''; position:absolute; inset:-1px; border-radius:inherit; padding:1px; background:linear-gradient(135deg,rgba(20,184,166,0.4),rgba(139,92,246,0.4),rgba(59,130,246,0.3)); -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
        .active-grad-border::before { background:linear-gradient(135deg,rgba(20,184,166,0.8),rgba(139,92,246,0.8)); animation: gradFlow 3s ease infinite; background-size:200% 200%; }
        .record-btn { background: conic-gradient(from 0deg, #14b8a6, #8b5cf6, #3b82f6, #14b8a6); animation: orbRing1 4s linear infinite; }
        .record-btn-active { background: conic-gradient(from 0deg, #ef4444, #f97316, #ef4444); animation: orbRing1 1s linear infinite; }
        .fade-in-up { animation: fadeInUp 0.4s ease forwards; }
      `}</style>

      {/* Ripple rings — recording durumunda */}
      {isRecording && [1,2,3].map(i => (
        <div key={i} className="absolute inset-0 rounded-full border border-red-500/30"
          style={{ animation: `ripple ${1.5 + i * 0.5}s ease-out ${i * 0.4}s infinite` }}/>
      ))}

      {/* Orbiting rings */}
      <div className="orb-ring" style={{
        borderColor: isRecording ? 'rgba(239,68,68,0.5)' : 'rgba(20,184,166,0.4)',
        animation: `orbRing1 ${isRecording ? '1.5s' : '4s'} linear infinite`,
      }}/>
      <div className="orb-ring" style={{
        borderColor: isRecording ? 'rgba(249,115,22,0.4)' : 'rgba(139,92,246,0.3)',
        animation: `orbRing2 ${isRecording ? '2s' : '6s'} linear infinite`,
      }}/>
      <div className="orb-ring" style={{
        borderColor: isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.25)',
        animation: `orbRing3 ${isRecording ? '2.5s' : '8s'} linear infinite`,
      }}/>

      {/* Core button */}
      <button onClick={onClick}
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl"
        style={{
          background: isRecording
            ? 'radial-gradient(circle at 35% 35%, #f97316, #ef4444)'
            : 'radial-gradient(circle at 35% 35%, #2dd4bf, #14b8a6, #0d9488)',
          boxShadow: isRecording
            ? '0 0 40px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 0 40px rgba(20,184,166,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          animation: isRecording ? 'orbPulse 1s ease-in-out infinite' : 'float 3s ease-in-out infinite',
        }}>
        {/* Shine */}
        <div className="absolute inset-0 rounded-full" style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)'
        }}/>
        {isRecording
          ? <StopCircle className="w-8 h-8 text-white relative z-10 drop-shadow"/>
          : <Mic className="w-8 h-8 text-white relative z-10 drop-shadow"/>}
      </button>
    </div>
  )
}

// ─── KENDİ SESİM TAB ──────────────────────────────────────────────────────────
function MyVoicesTab({ selectedId, selectedType, onSelect, onMsg }: any) {
  const [voices, setVoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'record'>('record')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

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
      const actx = new AudioContext()
      audioCtxRef.current = actx
      const src = actx.createMediaStreamSource(stream)
      const an = actx.createAnalyser()
      an.fftSize = 256
      src.connect(an)
      setAnalyser(an)
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        setRecordedUrl(URL.createObjectURL(blob))
        streamRef.current?.getTracks().forEach(t => t.stop())
        audioCtxRef.current?.close()
        setAnalyser(null)
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
    } catch { onMsg('error', 'Mikrofon erişimi reddedildi') }
  }

  function stopRecording(silent = false) {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }

  function clearRecording() { setRecordedBlob(null); setRecordedUrl(null); setRecordingTime(0) }

  function fmtTime(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

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
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
      })
      const d = await r.json()
      if (d.ok) {
        onMsg('success', 'Sesiniz sisteme kaydedildi!')
        setVoiceName(''); setFileName('')
        if (fileRef.current) fileRef.current.value = ''
        clearRecording(); await loadVoices()
        onSelect(d.voiceId, d.voiceName, 'cloned')
      } else onMsg('error', d.error || 'Kaydetme başarısız')
    } catch (e: any) { onMsg('error', e.message) }
    setCloning(false)
  }

  function handleTilt(e: React.MouseEvent<HTMLDivElement>, el: HTMLDivElement) {
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`
  }
  function resetTilt(el: HTMLDivElement) { el.style.transform = '' }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex bg-black/30 rounded-2xl p-1 gap-1 border border-white/5">
        {[
          { id: 'record', icon: <Mic className="w-4 h-4"/>, label: 'Canlı Kayıt' },
          { id: 'upload', icon: <Upload className="w-4 h-4"/>, label: 'Dosya Yükle' },
        ].map(m => (
          <button key={m.id} onClick={() => { setInputMode(m.id as any); clearRecording() }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
              inputMode === m.id
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* İsim input */}
      <div className="relative">
        <input value={voiceName} onChange={e => setVoiceName(e.target.value)}
          placeholder="Ses ismi (örn: Ahmet'in Sesi)"
          className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all placeholder-slate-600"/>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
          <Mic className="w-4 h-4"/>
        </div>
      </div>

      {inputMode === 'record' ? (
        <div className="space-y-4">
          {/* Orb + Waveform */}
          <div className="glass-card rounded-3xl p-6 flex flex-col items-center gap-5"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.05), transparent 60%)' }}>
            <AudioOrb isRecording={isRecording} onClick={isRecording ? () => stopRecording(false) : startRecording}/>
            <WaveformCanvas isRecording={isRecording} analyser={analyser}/>
            {isRecording ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'orbPulse 1s ease infinite' }}/>
                <span className="font-mono text-2xl font-bold text-white tracking-wider">{fmtTime(recordingTime)}</span>
                <span className="text-xs text-slate-500">/ 3:00</span>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center">
                {recordedUrl ? '✓ Kayıt hazır — kaydetmek için aşağıdaki butona basın' : 'Kayıt başlatmak için orb\'a tıklayın'}
              </p>
            )}
          </div>

          {/* Kayıt önizleme */}
          {recordedUrl && !isRecording && (
            <div className="fade-in-up glass-card rounded-2xl p-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400"/>
              <span className="text-emerald-400 text-sm font-medium">{fmtTime(recordingTime)} kayıt</span>
              <audio controls src={recordedUrl} className="flex-1 h-8" style={{ colorScheme: 'dark' }}/>
              <button onClick={clearRecording} className="text-slate-600 hover:text-red-400 transition p-1">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="glass-card rounded-3xl p-10 text-center cursor-pointer border-2 border-dashed border-white/10 hover:border-teal-500/40 transition-all duration-300 group"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(20,184,166,0.04), transparent 60%)' }}>
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7 text-teal-400"/>
          </div>
          <p className="text-white font-medium mb-1">{fileName || 'Ses dosyası seçin'}</p>
          <p className="text-slate-500 text-xs">MP3, WAV, M4A — maks 25MB</p>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden"
            onChange={e => setFileName(e.target.files?.[0]?.name || '')}/>
        </div>
      )}

      {/* Kaydet butonu */}
      <button onClick={cloneVoice}
        disabled={cloning || (inputMode === 'record' && !recordedBlob) || (inputMode === 'upload' && !fileName)}
        className="relative w-full py-3.5 rounded-2xl font-semibold text-white overflow-hidden group transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)' }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #0d9488, #7c3aed)' }}/>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: cloning ? 'none' : 'shimmer 3s ease-in-out infinite',
        }}/>
        <span className="relative flex items-center justify-center gap-2">
          {cloning ? <><RefreshCw className="w-4 h-4 animate-spin"/>Sisteme Kaydediliyor...</> : <><Mic className="w-4 h-4"/>Sesi Sisteme Kaydet</>}
        </span>
      </button>

      {/* Kayıtlı sesler */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400"/> Kayıtlı Seslerim
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs">{voices.length}</span>
          </h4>
          <button onClick={loadVoices} className="text-slate-500 hover:text-white transition p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-600 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin"/>Yükleniyor...
          </div>
        ) : voices.length === 0 ? (
          <div className="text-center py-10 glass-card rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Mic className="w-6 h-6 text-slate-600"/>
            </div>
            <p className="text-slate-500 text-sm">Henüz ses eklenmedi</p>
            <p className="text-slate-700 text-xs mt-1">Kendi sesinizle kişiselleştirilmiş aramalar yapın</p>
          </div>
        ) : (
          <div className="space-y-2">
            {voices.map((v: any) => (
              <div key={v.id}
                onMouseMove={e => handleTilt(e, e.currentTarget)}
                onMouseLeave={e => resetTilt(e.currentTarget)}
                onClick={() => onSelect(v.id, v.name, 'cloned')}
                style={{ transition: 'transform 0.2s ease', transformStyle: 'preserve-3d' }}
                className={`group relative flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer overflow-hidden ${
                  selectedId === v.id && selectedType === 'cloned'
                    ? 'grad-border active-grad-border'
                    : 'glass-card hover:border-white/15'
                }`}>
                {selectedId === v.id && selectedType === 'cloned' && (
                  <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(20,184,166,0.1), transparent 60%)' }}/>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 relative ${
                  selectedId === v.id && selectedType === 'cloned' ? 'bg-teal-500/20' : 'bg-white/5'
                }`}>🎙️</div>
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{v.name}</span>
                    {selectedId === v.id && selectedType === 'cloned' && (
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0"/>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{new Date(v.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition relative">
                  <button onClick={e => {
                    e.stopPropagation()
                    if (playing === v.id) { globalAudio?.pause(); globalAudio = null; setPlaying(null); return }
                    globalAudio?.pause(); globalAudio = null; setPlaying(v.id)
                    const a = new Audio(v.sample_url); globalAudio = a
                    a.onended = () => { setPlaying(null); globalAudio = null }
                    a.play().catch(() => setPlaying(null))
                  }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${playing === v.id ? 'bg-red-500' : 'bg-white/10 hover:bg-teal-500/30'}`}>
                    {playing === v.id ? <Square className="w-3 h-3 text-white"/> : <Play className="w-3 h-3 text-slate-300"/>}
                  </button>
                  <button onClick={async e => {
                    e.stopPropagation()
                    await fetch(`${API}/api/voice/my-voices/${v.id}`, { method: 'DELETE', headers: authH() })
                    await loadVoices()
                    if (selectedId === v.id) onSelect('', '', 'library')
                  }} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-red-500/30 transition">
                    <Trash2 className="w-3 h-3 text-slate-400"/>
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
    setLoading(true); setVoices([])
    try {
      const r = await fetch(`${API}/api/voice/library-voices?language=${l}&limit=80`, { headers: authH() })
      const d = await r.json(); setVoices(d.voices || [])
    } catch {} setLoading(false)
  }

  async function playPreview(voice: any) {
    if (playing === voice.id) { globalAudio?.pause(); globalAudio = null; setPlaying(null); return }
    globalAudio?.pause(); globalAudio = null
    if (!voice.previewUrl) return
    setPlaying(voice.id)
    const a = new Audio(voice.previewUrl); globalAudio = a
    a.onended = () => { setPlaying(null); globalAudio = null }
    a.onerror = () => { setPlaying(null); globalAudio = null }
    a.play().catch(() => setPlaying(null))
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              lang === l.code
                ? 'bg-gradient-to-r from-teal-600/80 to-cyan-600/80 text-white shadow-md shadow-teal-500/20 border border-teal-500/40'
                : 'glass-card text-slate-400 hover:text-white'
            }`}>
            <span>{l.flag}</span><span>{l.name}</span>
          </button>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ses ara..."
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 placeholder-slate-600 transition-all"/>
        </div>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Tümü</option>
          <option value="male">Erkek</option>
          <option value="female">Kadın</option>
        </select>
      </div>

      <p className="text-xs text-slate-600">{LANG_MAP[lang]?.flag} {LANG_MAP[lang]?.name} — {filtered.length} ses</p>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
          <div className="w-6 h-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"/>
          Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 glass-card rounded-2xl">
          <Volume2 className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50"/>
          <p className="text-slate-500 text-sm">Ses bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
          {filtered.map((v: any) => (
            <div key={v.id}
              onClick={() => onSelect(v.id, v.name, 'library')}
              className={`group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                selectedId === v.id && selectedType === 'library'
                  ? 'grad-border active-grad-border'
                  : 'glass-card hover:border-white/15'
              }`}>
              {selectedId === v.id && selectedType === 'library' && (
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(20,184,166,0.08), transparent 60%)' }}/>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                selectedId === v.id && selectedType === 'library' ? 'bg-teal-500/20' : 'bg-white/5'
              }`}>
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
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 ${
                    playing === v.id ? 'bg-red-500 opacity-100' : 'bg-white/10 hover:bg-teal-500/30 opacity-0 group-hover:opacity-100'
                  }`}>
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
        const d = await (s.value as any).json(); const sv = d.settings || {}
        setSettings(sv); setSelectedVoiceId(sv.elevenlabs_voice_id || '')
        setSelectedVoiceName(sv.voice_name || '')
        setSelectedVoiceType(sv.voice_provider === 'cloned' ? 'cloned' : 'library')
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
      const r = await fetch(`${API}/api/voice/call/single`, { method: 'POST', headers: authH(), body: JSON.stringify({ leadId: selectedLead, language: selectedLanguage }) })
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
      const r = await fetch(`${API}/api/voice/call/campaign`, { method: 'POST', headers: authH(), body: JSON.stringify({ leadIds: selectedLeads, campaignName, delayMinutes, language: selectedLanguage || undefined }) })
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

  const TABS = [['voice','🎙️','Sesler'],['dial','📞','Tek Arama'],['campaign','⚡','Kampanya'],['calls','📋','Aramalar'],['settings','⚙️','Ayarlar']]
  const STATS_DATA = stats ? [
    { label: 'Toplam', value: stats.total, color: '#ffffff', glow: 'rgba(255,255,255,0.1)' },
    { label: 'Tamamlandı', value: stats.completed, color: '#34d399', glow: 'rgba(52,211,153,0.15)' },
    { label: 'Olumlu', value: stats.positive, color: '#2dd4bf', glow: 'rgba(45,212,191,0.15)' },
    { label: 'Cevap Yok', value: stats.no_answer, color: '#94a3b8', glow: 'rgba(148,163,184,0.1)' },
    { label: 'Dakika', value: stats.totalMinutes, color: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
    { label: 'Dil', value: Object.keys(stats.byLanguage || {}).length, color: '#c084fc', glow: 'rgba(192,132,252,0.15)' },
  ] : []

  return (
    <div className="space-y-6 pb-10">
      <style>{`
        @keyframes orbPulse { 0%,100% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.15); opacity:1; } }
        @keyframes ripple { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(2.2); opacity:0; } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes gradFlow { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes orbRing1 { from{transform:rotateX(70deg) rotateZ(0deg)}to{transform:rotateX(70deg) rotateZ(360deg)} }
        @keyframes orbRing2 { from{transform:rotateX(70deg) rotateZ(120deg)}to{transform:rotateX(70deg) rotateZ(480deg)} }
        @keyframes orbRing3 { from{transform:rotateX(70deg) rotateZ(240deg)}to{transform:rotateX(70deg) rotateZ(600deg)} }
        @keyframes bgGlow { 0%,100%{opacity:0.4}50%{opacity:0.7} }
        @keyframes tabIn { from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)} }
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.07); }
        .grad-border { position:relative; }
        .grad-border::before { content:''; position:absolute; inset:-1px; border-radius:inherit; padding:1px; background:linear-gradient(135deg,rgba(20,184,166,0.5),rgba(139,92,246,0.5)); -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; }
        .active-grad-border::before { animation: gradFlow 3s ease infinite; background-size:200% 200%; }
        .orb-ring { position:absolute; inset:0; border-radius:50%; border:1.5px solid; animation-timing-function:linear; animation-iteration-count:infinite; }
        .fade-in-up { animation: fadeInUp 0.4s ease forwards; }
        .tab-content { animation: tabIn 0.3s ease forwards; }
        .custom-scroll::-webkit-scrollbar { width:4px; }
        .custom-scroll::-webkit-scrollbar-track { background:transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(139,92,246,0.05), rgba(0,0,0,0))' }}>
        {/* Ambient background blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12), transparent 70%)', animation: 'bgGlow 4s ease infinite' }}/>
        <div className="absolute -bottom-10 left-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)', animation: 'bgGlow 5s ease 1s infinite' }}/>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)', boxShadow: '0 8px 32px rgba(20,184,166,0.3)' }}>
                <Phone className="w-6 h-6 text-white"/>
              </div>
              <div className="absolute -inset-0.5 rounded-2xl -z-10" style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)', filter: 'blur(8px)', opacity: 0.4 }}/>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Sesli Arama</h1>
              <p className="text-slate-400 text-sm mt-0.5">Kendi sesiniz · 16 dil · Kişiselleştirilmiş AI açılış</p>
            </div>
          </div>

          {selectedVoiceName ? (
            <button onClick={() => setTab('voice')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all hover:scale-105 ${
                selectedVoiceType === 'cloned' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-teal-500/10 border-teal-500/30'
              }`}
              style={{ backdropFilter: 'blur(12px)' }}>
              <div className={`w-2 h-2 rounded-full ${selectedVoiceType === 'cloned' ? 'bg-purple-400' : 'bg-teal-400'}`}
                style={{ boxShadow: selectedVoiceType === 'cloned' ? '0 0 8px rgba(192,132,252,0.8)' : '0 0 8px rgba(20,184,166,0.8)' }}/>
              <span className={`text-sm font-semibold ${selectedVoiceType === 'cloned' ? 'text-purple-300' : 'text-teal-300'}`}>
                {selectedVoiceName}
              </span>
              <span className="text-xs text-slate-500">
                {selectedVoiceType === 'cloned' ? '🎙️ Kendi sesim' : '🎵 Hazır ses'}
              </span>
            </button>
          ) : (
            <button onClick={() => setTab('voice')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl text-sm hover:bg-amber-500/15 transition-all">
              <AlertTriangle className="w-4 h-4"/> Ses Seç
            </button>
          )}
        </div>
      </div>

      {/* ── MESAJ ──────────────────────────────────────────────────────────────── */}
      {msg && (
        <div className={`fade-in-up px-5 py-3.5 rounded-2xl border text-sm flex items-center gap-3 ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}/>
          {msg.text}
        </div>
      )}

      {/* ── İSTATİSTİKLER ──────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STATS_DATA.map(({ label, value, color, glow }) => (
            <div key={label}
              className="glass-card rounded-2xl p-4 text-center relative overflow-hidden group hover:scale-105 transition-transform duration-200">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(ellipse at 50% 100%, ${glow}, transparent 70%)` }}/>
              <div className="text-2xl font-bold relative" style={{ color }}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5 relative">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB BAR ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 glass-card rounded-2xl p-1 w-fit flex-wrap">
        {TABS.map(([t, icon, l]) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab === t
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            <span>{icon}</span>{l}
          </button>
        ))}
      </div>

      {/* ── SESLER ─────────────────────────────────────────────────────────────── */}
      {tab === 'voice' && (
        <div className="tab-content grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass-card rounded-3xl p-6">
            {/* Sub-tab */}
            <div className="flex gap-1.5 mb-6 bg-black/30 rounded-2xl p-1">
              {[
                { id: 'mine', icon: '🎙️', label: 'Kendi Sesim', color: 'from-violet-600 to-purple-600', glow: 'shadow-violet-500/20' },
                { id: 'library', icon: '🎵', label: 'Ses Kütüphanesi', color: 'from-teal-600 to-cyan-600', glow: 'shadow-teal-500/20' },
              ].map(s => (
                <button key={s.id} onClick={() => setVoiceSubTab(s.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    voiceSubTab === s.id
                      ? `bg-gradient-to-r ${s.color} text-white shadow-lg ${s.glow}`
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <span>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>

            <div className="tab-content" key={voiceSubTab}>
              {voiceSubTab === 'mine'
                ? <MyVoicesTab selectedId={selectedVoiceId} selectedType={selectedVoiceType} onSelect={selectVoice} onMsg={showMsg}/>
                : <LibraryTab selectedId={selectedVoiceId} selectedType={selectedVoiceType} onSelect={selectVoice}/>}
            </div>
          </div>

          {/* Sağ panel */}
          <div className="space-y-4">
            {selectedVoiceName && (
              <div className="fade-in-up grad-border active-grad-border rounded-3xl p-5 relative overflow-hidden"
                style={{ background: selectedVoiceType === 'cloned' ? 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12), rgba(0,0,0,0) 60%)' : 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12), rgba(0,0,0,0) 60%)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${selectedVoiceType === 'cloned' ? 'bg-purple-400' : 'bg-teal-400'}`}
                    style={{ boxShadow: selectedVoiceType === 'cloned' ? '0 0 8px rgba(192,132,252,1)' : '0 0 8px rgba(20,184,166,1)', animation: 'orbPulse 2s ease infinite' }}/>
                  <span className={`text-xs font-semibold tracking-wider uppercase ${selectedVoiceType === 'cloned' ? 'text-purple-400' : 'text-teal-400'}`}>
                    Aktif Ses
                  </span>
                </div>
                <p className="text-white font-semibold text-lg">{selectedVoiceName}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedVoiceType === 'cloned' ? '🎙️ Kendi sesinizle arama yapılacak' : '🎵 Hazır ses ile arama yapılacak'}
                </p>
              </div>
            )}

            <div className="glass-card rounded-3xl p-5 space-y-3">
              <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400"/> İki Arama Yolu
              </h4>
              {[
                { icon: '🎙️', title: 'Kendi Sesim', desc: 'Sesinizi yükleyin veya kaydedin. Aramalar kendi sesinizle yapılır.', color: 'rgba(139,92,246,0.1)' },
                { icon: '🎵', title: 'Ses Kütüphanesi', desc: 'Hazır profesyonel seslerden seçin. Anında kullanıma hazır.', color: 'rgba(20,184,166,0.1)' },
              ].map(p => (
                <div key={p.title} className="p-3.5 rounded-2xl transition-all hover:scale-[1.02]"
                  style={{ background: p.color, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-white text-sm font-medium">{p.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-3xl p-5">
              <h4 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400"/> Desteklenen Diller
              </h4>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                {VOICE_LANGS.map(l => (
                  <div key={l.code} className="flex items-center gap-2 text-xs">
                    <span>{l.flag}</span>
                    <span className="text-slate-400">{l.name}</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto flex-shrink-0"/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEK ARAMA ──────────────────────────────────────────────────────────── */}
      {tab === 'dial' && (
        <div className="tab-content grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-card rounded-3xl p-6 space-y-5">
            <h3 className="font-semibold text-white flex items-center gap-2.5 text-lg">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <PhoneCall className="w-4 h-4 text-teal-400"/>
              </div>
              Tek Lead Ara
            </h3>

            {selectedVoiceName ? (
              <div className={`flex items-center gap-3 p-3.5 rounded-2xl ${selectedVoiceType === 'cloned' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-teal-500/10 border border-teal-500/20'}`}>
                <div className={`w-2 h-2 rounded-full ${selectedVoiceType === 'cloned' ? 'bg-purple-400' : 'bg-teal-400'}`}
                  style={{ animation: 'orbPulse 2s ease infinite', boxShadow: selectedVoiceType === 'cloned' ? '0 0 6px rgba(192,132,252,0.8)' : '0 0 6px rgba(20,184,166,0.8)' }}/>
                <span className={`text-sm font-medium ${selectedVoiceType === 'cloned' ? 'text-purple-300' : 'text-teal-300'}`}>{selectedVoiceName}</span>
                <span className="text-slate-500 text-xs ml-auto">{selectedVoiceType === 'cloned' ? 'Kendi sesim' : 'Hazır ses'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4"/> Önce "Sesler" sekmesinden ses seçin
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium tracking-wide uppercase">Arama Dili</label>
              <div className="grid grid-cols-4 gap-1.5">
                {VOICE_LANGS.slice(0, 12).map(l => (
                  <button key={l.code} onClick={() => setSelectedLanguage(l.code)}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      selectedLanguage === l.code
                        ? 'bg-teal-500/20 border-teal-500/40 text-teal-300 shadow-md shadow-teal-500/10'
                        : 'glass-card text-slate-400 hover:text-white'
                    }`}>
                    <div className="text-xl mb-1">{l.flag}</div>
                    <div className="truncate text-[10px]">{l.name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium tracking-wide uppercase">Lead Seç</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/40 transition-all">
                <option value="">Lead seçin ({leadsWithPhone.length} telefon numaralı)</option>
                {leadsWithPhone.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} {l.country ? `(${l.country})` : ''} — {l.phone}</option>
                ))}
              </select>
            </div>

            <button onClick={makeSingleCall} disabled={calling || !selectedLead || !selectedVoiceName}
              className="relative w-full py-4 rounded-2xl font-semibold text-white overflow-hidden disabled:opacity-40 group transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0e7490)' }}/>
              <span className="relative flex items-center justify-center gap-2.5 text-base">
                {calling ? <><RefreshCw className="w-5 h-5 animate-spin"/>Aranıyor...</> : <><Phone className="w-5 h-5"/>Şimdi Ara</>}
              </span>
            </button>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2.5 text-lg">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400"/>
              </div>
              Nasıl Çalışır?
            </h3>
            <div className="space-y-4">
              {[
                { n:'1', t:'Ses Seç', d:'Kendi sesiniz veya hazır ses kütüphanesinden seçin', c:'#14b8a6' },
                { n:'2', t:'AI Araştırması', d:'Yapay zeka şirketi araştırır, ilgi alanlarını tespit eder', c:'#3b82f6' },
                { n:'3', t:'Kişisel Açılış', d:'Her lead için özel, doğal açılış cümlesi üretilir', c:'#8b5cf6' },
                { n:'4', t:'Arama Yapılır', d:'Seçtiğiniz sesle gerçekçi, doğal konuşma', c:'#f59e0b' },
                { n:'5', t:'Analiz & CRM', d:'Transkript, ilgi skoru ve not otomatik kaydedilir', c:'#10b981' },
              ].map((s, i) => (
                <div key={s.n} className="flex items-start gap-4 group" style={{ animation: `fadeInUp 0.4s ease ${i * 0.08}s both` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${s.c}20`, color: s.c, border: `1px solid ${s.c}30` }}>
                    {s.n}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{s.t}</div>
                    <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KAMPANYA ───────────────────────────────────────────────────────────── */}
      {tab === 'campaign' && (
        <div className="tab-content grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-5">
            <h3 className="font-semibold text-white flex items-center gap-2.5 text-lg">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400"/>
              </div>
              Toplu Arama Kampanyası
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-2 block font-medium uppercase tracking-wide">Kampanya Adı</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Mayıs 2026 Kampanyası"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/40 transition-all placeholder-slate-600"/>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block font-medium uppercase tracking-wide">Aramalar Arası Bekleme</label>
                <select value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none">
                  {[2,5,10,15,30].map(m => <option key={m} value={m}>{m} dakika</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium uppercase tracking-wide">Dil</label>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setSelectedLanguage('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!selectedLanguage ? 'bg-teal-600 text-white' : 'glass-card text-slate-400 hover:text-white'}`}>
                  Otomatik
                </button>
                {VOICE_LANGS.map(l => (
                  <button key={l.code} onClick={() => setSelectedLanguage(l.code)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${selectedLanguage === l.code ? 'bg-teal-600 text-white' : 'glass-card text-slate-400 hover:text-white'}`}>
                    {l.flag} {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500 shrink-0">Ülke:</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">Tüm Ülkeler</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500">
                  <span className="text-white font-semibold">{selectedLeads.length}</span> / {filteredLeads.length} lead seçili
                </label>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))} className="text-xs text-teal-400 hover:text-teal-300 transition">Tümünü Seç</button>
                  <button onClick={() => setSelectedLeads([])} className="text-xs text-slate-500 hover:text-white transition">Temizle</button>
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto bg-black/30 rounded-2xl p-2 space-y-1 custom-scroll border border-white/5">
                {filteredLeads.map(l => (
                  <label key={l.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                      className="accent-teal-500 w-4 h-4"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{l.company_name}</div>
                      <div className="text-slate-500 text-xs">{l.phone}{l.country ? ` · ${l.country}` : ''}</div>
                    </div>
                  </label>
                ))}
                {filteredLeads.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Telefon numarası olan lead yok</p>}
              </div>
            </div>

            <button onClick={startCampaign} disabled={campaignRunning || !selectedLeads.length || !selectedVoiceName}
              className="relative w-full py-4 rounded-2xl font-semibold text-white overflow-hidden disabled:opacity-40 group transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}/>
              <span className="relative flex items-center justify-center gap-2.5 text-base">
                {campaignRunning ? <><RefreshCw className="w-5 h-5 animate-spin"/>Çalışıyor...</> : <><Zap className="w-5 h-5"/>{selectedLeads.length} Lead'i Ara</>}
              </span>
            </button>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Geçmiş Kampanyalar</h3>
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="p-4 glass-card rounded-2xl hover:border-white/15 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-xs font-medium truncate pr-2">{c.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${c.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {c.status === 'completed' ? 'Bitti' : 'Devam'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">{c.calls_made}/{c.total_leads} arama</div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${c.total_leads ? (c.calls_made/c.total_leads)*100 : 0}%`,
                      background: 'linear-gradient(90deg, #14b8a6, #8b5cf6)'
                    }}/>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                  <p className="text-xs">Kampanya yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ARAMALAR ───────────────────────────────────────────────────────────── */}
      {tab === 'calls' && (
        <div className="tab-content glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400"/> Arama Geçmişi
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs">{calls.length}</span>
            </h3>
            <button onClick={loadAll} className="p-2 text-slate-500 hover:text-white transition rounded-xl hover:bg-white/5">
              <RefreshCw className="w-4 h-4"/>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Lead</th>
                  <th className="text-left px-5 py-3 font-medium">Numara</th>
                  <th className="text-center px-5 py-3 font-medium">Dil</th>
                  <th className="text-center px-5 py-3 font-medium">Durum</th>
                  <th className="text-center px-5 py-3 font-medium">Sonuç</th>
                  <th className="text-right px-5 py-3 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="text-white text-xs font-medium">{c.leads?.company_name || '—'}</div>
                      <div className="text-slate-500 text-xs">{c.leads?.country || ''}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{c.callee_number}</td>
                    <td className="px-5 py-3.5 text-center text-xl">{LANG_MAP[c.language]?.flag || '🌍'}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={c.status}/></td>
                    <td className="px-5 py-3.5 text-center">
                      {c.outcome === 'positive' ? <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Olumlu</span>
                        : c.outcome === 'negative' ? <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">Olumsuz</span>
                        : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calls.length === 0 && (
              <div className="text-center py-16 text-slate-600">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-7 h-7 opacity-30"/>
                </div>
                <p className="text-sm font-medium">Henüz arama yapılmamış</p>
                <p className="text-xs mt-1">İlk aramayı başlatmak için Tek Arama veya Kampanya sekmesine gidin</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AYARLAR ────────────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="tab-content glass-card rounded-3xl p-6 space-y-5 max-w-lg">
          <h3 className="font-semibold text-white flex items-center gap-2.5 text-lg">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-blue-400"/>
            </div>
            Temsilci Profili
          </h3>
          {[
            { key: 'agent_name', label: 'Temsilci Adı', ph: 'Ahmet' },
            { key: 'company_name', label: 'Şirket Adı', ph: 'Şirketiniz' },
            { key: 'product_description', label: 'Ürün / Hizmet', ph: 'Ne sattığınızı kısaca açıklayın' },
            { key: 'transfer_number', label: 'Transfer Numarası', ph: 'İnsan temsilciye bağlantı' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 mb-2 block font-medium tracking-wide uppercase">{label}</label>
              <input value={settings[key] || ''} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/40 transition-all placeholder-slate-600"/>
            </div>
          ))}
          <button onClick={saveSettings}
            className="relative w-full py-3.5 rounded-2xl font-semibold text-white overflow-hidden group hover:scale-[1.02] transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}/>
            <span className="relative">Kaydet</span>
          </button>
        </div>
      )}
    </div>
  )
}
