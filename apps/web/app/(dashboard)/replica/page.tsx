'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Video, Upload, Mic, Play, Trash2, Star, CheckCircle,
  AlertTriangle, RefreshCw, Camera, StopCircle, Loader2,
  Cpu, Brain, Sparkles, Clock, ChevronRight, Info
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }
function authHForm() { return { Authorization: `Bearer ${getToken()}` } }

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Replica {
  id: string
  name: string
  language: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  engine: 'latentsync' | 'gaussian' | 'heygen' | 'elevenlabs'
  elevenlabs_voice_id?: string
  gaussian_model_url?: string
  preview_video_url?: string
  seed_video_url?: string
  is_default: boolean
  error_message?: string
  created_at: string
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Replica['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'Bekliyor',   cls: 'bg-slate-500/15 text-slate-400' },
    processing: { label: 'Eğitiliyor', cls: 'bg-violet-500/15 text-violet-400 animate-pulse' },
    ready:      { label: 'Hazır',      cls: 'bg-emerald-500/15 text-emerald-400' },
    failed:     { label: 'Hatalı',     cls: 'bg-red-500/15 text-red-400' },
  }
  const { label, cls } = map[status] || map.pending
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

function EngineTag({ engine }: { engine: Replica['engine'] }) {
  const map: Record<string, { label: string; color: string }> = {
    latentsync:  { label: 'LatentSync', color: 'text-cyan-400 bg-cyan-500/10' },
    gaussian:    { label: '3D Gaussian', color: 'text-purple-400 bg-purple-500/10' },
    heygen:      { label: 'HeyGen',     color: 'text-blue-400 bg-blue-500/10' },
    elevenlabs:  { label: 'ElevenLabs', color: 'text-orange-400 bg-orange-500/10' },
  }
  const { label, color } = map[engine] || { label: engine, color: 'text-slate-400 bg-slate-500/10' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      <Cpu className="w-2.5 h-2.5" />{label}
    </span>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ReplicaPage() {
  const { t } = useI18n()
  const [replicas, setReplicas]     = useState<Replica[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'list' | 'create'>('list')

  // Create form state
  const [name, setName]             = useState('')
  const [language, setLanguage]     = useState('tr')
  const [engine, setEngine]         = useState<'latentsync' | 'gaussian'>('latentsync')
  const [recordMode, setRecordMode] = useState<'upload' | 'camera'>('upload')
  const [videoFile, setVideoFile]   = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [recording, setRecording]   = useState(false)
  const [creating, setCreating]     = useState(false)
  const [createStep, setCreateStep] = useState<string>('')
  const [createError, setCreateError] = useState('')

  // Camera/recorder refs
  const videoRef      = useRef<HTMLVideoElement>(null)
  const mediaRef      = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const streamRef     = useRef<MediaStream | null>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  // Test video state
  const [testingId, setTestingId]   = useState<string | null>(null)
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/replica`, { headers: authH() })
      const d = await r.json()
      setReplicas(d.replicas || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Poll replicas that are processing
  useEffect(() => {
    if (!replicas.some(r => r.status === 'processing')) return
    const iv = setInterval(async () => {
      const updated = await Promise.all(
        replicas.map(async r => {
          if (r.status !== 'processing') return r
          const res = await fetch(`${API}/api/replica/${r.id}/status`, { headers: authH() })
          const d = await res.json()
          return { ...r, ...d }
        })
      )
      setReplicas(updated)
    }, 8000)
    return () => clearInterval(iv)
  }, [replicas])

  // ─── CAMERA ───────────────────────────────────────────────────────────────

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    } catch { alert('Kamera erişimi reddedildi') }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' })
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(blob))
      stopCamera()
    }
    mediaRef.current = mr
    mr.start(1000)
    setRecording(true)
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  useEffect(() => {
    if (recordMode === 'camera') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [recordMode])

  // ─── FILE UPLOAD ───────────────────────────────────────────────────────────

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  // ─── TRAIN ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!name.trim() || !videoFile) { setCreateError('İsim ve video gerekli'); return }
    setCreating(true)
    setCreateError('')
    try {
      // Step 1: Get signed upload URL
      setCreateStep('Video yükleniyor...')
      const signRes = await fetch(`${API}/api/replica/upload-seed`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ filename: videoFile.name, contentType: videoFile.type }),
      })
      const { signedUrl, path } = await signRes.json()
      if (!signedUrl) throw new Error('Upload URL alınamadı')

      // Step 2: Upload directly to Supabase Storage
      const upRes = await fetch(signedUrl, { method: 'PUT', body: videoFile, headers: { 'Content-Type': videoFile.type } })
      if (!upRes.ok) throw new Error('Video yüklenemedi')

      // Step 3: Start training
      setCreateStep('Eğitim başlatılıyor...')
      const trainRes = await fetch(`${API}/api/replica/train`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ name: name.trim(), language, engine, seedVideoPath: path, cloneVoice: true }),
      })
      const trainData = await trainRes.json()
      if (!trainRes.ok) throw new Error(trainData.error || 'Eğitim başlatılamadı')

      // Reset form
      setName('')
      setVideoFile(null)
      setVideoPreview(null)
      setTab('list')
      load()
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
      setCreateStep('')
    }
  }

  // ─── SET DEFAULT ───────────────────────────────────────────────────────────

  async function setDefault(id: string) {
    await fetch(`${API}/api/replica/${id}/set-default`, { method: 'POST', headers: authH() })
    load()
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────

  async function deleteReplica(id: string) {
    if (!confirm('Bu replikayı silmek istediğinizden emin misiniz?')) return
    await fetch(`${API}/api/replica/${id}`, { method: 'DELETE', headers: authH() })
    setReplicas(prev => prev.filter(r => r.id !== id))
  }

  // ─── TEST VIDEO ────────────────────────────────────────────────────────────

  async function generateTest(id: string) {
    setTestingId(id)
    setTestVideoUrl(null)
    try {
      const r = await fetch(`${API}/api/replica/${id}/test-video`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.videoUrl) setTestVideoUrl(d.videoUrl)
    } finally { setTestingId(null) }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="ml-64 p-8 min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('replica.ai_video_replikasi', 'AI Video Replikası')}</h1>
            <p className="text-slate-400 text-sm">{t('replica.kendi_sesiniz_ve_yuzunuzl', 'Kendi sesiniz ve yüzünüzle kişiselleştirilmiş videolar')}</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-4 flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
          <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-violet-200 text-sm leading-relaxed">
            <strong>{t('replica.nasil_calisir', 'Nasıl çalışır:')}</strong> 3-5 dakikalık bir video kaydedin veya yükleyin. Sistem sesinizi klonlar
            ve yüz hareketlerinizi öğrenir. Artık her video mesajı sizin sesinizle, sizin yüzünüzle oluşturulur.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['list', 'Replikalarım'], ['create', 'Yeni Replika Oluştur']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : replicas.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">{t('replica.henuz_replika_yok', 'Henüz replika yok')}</p>
              <p className="text-sm mb-6">{t('replica.ilk_video_replikasini_olu', 'İlk video replikasını oluşturun')}</p>
              <button
                onClick={() => setTab('create')}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-colors"
              >
                Replika Oluştur
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {replicas.map(replica => (
                <div key={replica.id} className={`bg-slate-900 border rounded-xl p-5 transition-colors ${replica.is_default ? 'border-violet-500/50' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Thumbnail / preview */}
                      <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {replica.preview_video_url ? (
                          <video src={replica.preview_video_url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <Brain className="w-8 h-8 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold truncate">{replica.name}</h3>
                          {replica.is_default && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold uppercase">
                              <Star className="w-2.5 h-2.5" />Varsayılan
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <StatusBadge status={replica.status} />
                          <EngineTag engine={replica.engine} />
                          <span className="text-slate-500 text-xs">{replica.language.toUpperCase()}</span>
                        </div>
                        {replica.status === 'processing' && (
                          <div className="flex items-center gap-2 text-violet-400 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Ses klonlanıyor ve model eğitiliyor...
                          </div>
                        )}
                        {replica.status === 'failed' && replica.error_message && (
                          <p className="text-red-400 text-xs">{replica.error_message}</p>
                        )}
                        {replica.status === 'ready' && (
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {replica.elevenlabs_voice_id && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle className="w-3 h-3" />Ses klonlandı
                              </span>
                            )}
                            {replica.gaussian_model_url && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle className="w-3 h-3" />Model hazır
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {replica.status === 'ready' && (
                        <>
                          <button
                            onClick={() => generateTest(replica.id)}
                            disabled={testingId === replica.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
                          >
                            {testingId === replica.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            Test Video
                          </button>
                          {!replica.is_default && (
                            <button
                              onClick={() => setDefault(replica.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 rounded-lg text-xs font-medium text-violet-300 transition-colors"
                            >
                              <Star className="w-3 h-3" />Varsayılan Yap
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => deleteReplica(replica.id)}
                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Test video result */}
                  {testVideoUrl && testingId === null && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <p className="text-xs text-slate-400 mb-2">Test video:</p>
                      <video src={testVideoUrl} controls className="w-full max-w-sm rounded-lg" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <div className="max-w-2xl">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('replica.replika_adi', 'Replika Adı')}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('replica.orn_ana_satis_replikasi', 'Örn: Ana Satış Replikası')}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dil</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                {[['tr','Turkce'],['en','Ingilizce'],['de','Almanca'],['ar','Arapca'],['ru','Rusca'],['fr','Fransizca']].map(([c,l]) => (
                  <option key={c} value={c}>{l}</option>
                ))}
              </select>
            </div>

            {/* Engine */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Video Motoru</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'latentsync', label: 'LatentSync', sub: 'Hızlı · $0.09/video · Çok yüksek kalite', color: 'cyan', icon: Cpu },
                  { value: 'gaussian',   label: '3D Gaussian', sub: 'Ultra yüksek · Kendi altyapın gerekli', color: 'purple', icon: Sparkles },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEngine(opt.value)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      engine === opt.value
                        ? opt.color === 'cyan'
                          ? 'border-cyan-500/60 bg-cyan-500/10'
                          : 'border-purple-500/60 bg-purple-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <opt.icon className={`w-5 h-5 mb-2 ${opt.color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`} />
                    <p className="text-white text-sm font-semibold mb-0.5">{opt.label}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Video source */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">{t('replica.kaynak_video_35_dakika_on', 'Kaynak Video (3-5 dakika önerilir)')}</label>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                {([['upload','Dosya Yükle',Upload],['camera','Kamera ile Kaydet',Camera]] as any[]).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    onClick={() => setRecordMode(m)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      recordMode === m ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              {/* Upload mode */}
              {recordMode === 'upload' && (
                <div>
                  <input ref={fileInputRef} type="file" accept="video/*" onChange={onFileSelect} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl text-slate-400 hover:text-slate-300 transition-colors flex flex-col items-center gap-3"
                  >
                    <Upload className="w-8 h-8 opacity-60" />
                    <span className="text-sm">{t('replica.mp4_webm_veya_mov_secin', 'MP4, WebM veya MOV seçin')}</span>
                    <span className="text-xs text-slate-600">Maks 500 MB</span>
                  </button>
                </div>
              )}

              {/* Camera mode */}
              {recordMode === 'camera' && !videoPreview && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    {recording && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-bold">KAYIT</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                      recording ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'
                    }`}
                  >
                    {recording ? <><StopCircle className="w-4 h-4" />{t('replica.kaydi_durdur', 'Kaydı Durdur')}</> : <><Mic className="w-4 h-4" />{t('replica.kaydi_baslat', 'Kaydı Başlat')}</>}
                  </button>
                </div>
              )}

              {/* Video preview */}
              {videoPreview && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                    <video src={videoPreview} controls className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>{videoFile?.name || 'Video hazır'}</span>
                    </div>
                    <button
                      onClick={() => { setVideoFile(null); setVideoPreview(null) }}
                      className="text-slate-400 hover:text-slate-300 text-xs"
                    >
                      Değiştir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
              <p className="text-slate-300 text-xs font-semibold mb-1">{t('replica.en_iyi_kalite_icin', 'En iyi kalite için:')}</p>
              {[
                'Düz arka plan, iyi aydınlatma',
                'Yüzünüz kameraya tam karşı, göz hizasında',
                'Doğal konuşun — kısa duraksamalar, el hareketleri',
                'MP4 format, min 1080p çözünürlük',
              ].map(tip => (
                <div key={tip} className="flex items-start gap-2 text-slate-400 text-xs">
                  <ChevronRight className="w-3 h-3 mt-0.5 text-violet-400 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            {/* Error */}
            {createError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !videoFile}
              className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{createStep || 'Oluşturuluyor...'}</>
              ) : (
                <><Brain className="w-4 h-4" />{t('replica.replikayi_olustur', 'Replikayı Oluştur')}</>
              )}
            </button>

            {creating && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-violet-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Eğitim 2-10 dakika sürebilir
                </div>
                <p className="text-slate-500 text-xs">{t('replica.bu_sayfayi_kapatabilirsin', 'Bu sayfayı kapatabilirsiniz, işlem arka planda devam eder')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
