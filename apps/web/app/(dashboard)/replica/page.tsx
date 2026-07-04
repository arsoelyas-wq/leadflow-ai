'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Video, Upload, Mic, Play, Trash2, Star, CheckCircle,
  AlertTriangle, Camera, StopCircle, Loader2,
  Brain, Clock, ChevronRight, Info, Sparkles, Zap, Plus
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

// ── Light theme tokens ─────────────────────────────────────────────────────────
const card  = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as const
const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8'
const surf  = '#f8fafc'
const purple = '#7c3aed'
const purpleLight = '#f5f3ff'
const purpleBorder = '#ddd6fe'

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Replica {
  id: string; name: string; language: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  engine: string; elevenlabs_voice_id?: string
  gaussian_model_url?: string; preview_video_url?: string
  seed_video_url?: string; is_default: boolean; error_message?: string
  created_at: string; scene_type?: string; character_group?: string
}

const SCENE_OPTIONS = [
  { value: 'studio',  label: 'Stüdyo',    icon: '🎬', tip: 'Düz arka plan, kontrollü ışık' },
  { value: 'office',  label: 'Ofis',      icon: '🏢', tip: 'Masa/toplantı odası arka planı' },
  { value: 'home',    label: 'Ev',        icon: '🏠', tip: 'Samimi, rahat ortam' },
  { value: 'field',   label: 'Saha',      icon: '👔', tip: 'Saha/müşteri ziyareti havası' },
  { value: 'outdoor', label: 'Dış Mekan', icon: '🌳', tip: 'Açık alan, doğal ışık' },
]

const LANGUAGES = [
  ['tr','Türkçe'],['en','İngilizce'],['de','Almanca'],
  ['ar','Arapça'],['ru','Rusça'],['fr','Fransızca'],
]

function StatusBadge({ status }: { status: Replica['status'] }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:    { label: 'Bekliyor',   color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
    processing: { label: 'Eğitiliyor', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    ready:      { label: 'Hazır',      color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    failed:     { label: 'Hatalı',     color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, color:s.color, background:s.bg, border:`1px solid ${s.border}` }}>
      {status === 'processing' && <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, display:'inline-block', animation:'pulse 1.5s ease-in-out infinite' }} />}
      {s.label}
    </span>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ReplicaPage() {
  const { t } = useI18n()
  const [replicas, setReplicas]   = useState<Replica[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'list' | 'create'>('list')

  // Create form
  const [name, setName]           = useState('')
  const [language, setLanguage]   = useState('tr')
  const [sceneType, setSceneType] = useState('studio')
  const [characterGroup, setCharacterGroup] = useState('')
  const [recordMode, setRecordMode] = useState<'upload' | 'camera'>('upload')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [createStep, setCreateStep] = useState('')
  const [createError, setCreateError] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const mediaRef     = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const streamRef    = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordedDurationRef = useRef<number>(0)

  const [countdown, setCountdown]     = useState<number | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [scriptIdx, setScriptIdx]     = useState(0)

  const MIN_SEC = 8, REC_SEC = 30, MAX_SEC = 180
  const SCRIPT = [
    'Merhaba, ben sizin AI video replikanız olacağım.',
    'Lütfen kameraya doğal bir şekilde bakın ve normal hızda konuşun.',
    'İşletmenizi, ürününüzü veya kendinizi birkaç cümleyle tanıtabilirsiniz.',
    'Ara sıra elinizi hareket ettirin, gülümseyin — bu doğallığı artırır.',
    'En az 30 saniye konuşmanız ses klonu kalitesini büyük ölçüde iyileştirir.',
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/replica`, { headers: authH() })
      const d = await r.json()
      setReplicas(d.replicas || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!replicas.some(r => r.status === 'processing')) return
    const iv = setInterval(async () => {
      const updated = await Promise.all(replicas.map(async r => {
        if (r.status !== 'processing') return r
        const res = await fetch(`${API}/api/replica/${r.id}/status`, { headers: authH() })
        return { ...r, ...await res.json() }
      }))
      setReplicas(updated)
    }, 8000)
    return () => clearInterval(iv)
  }, [replicas])

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

  function beginGuidedRecording() {
    if (!streamRef.current) return
    setScriptIdx(0); setCountdown(3)
    const cd = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) { clearInterval(cd); actuallyStartRecording(); return null }
        return prev - 1
      })
    }, 1000)
  }

  function actuallyStartRecording() {
    if (!streamRef.current) return
    chunksRef.current = []; recordedDurationRef.current = 0; setRecordSeconds(0)
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setVideoFile(new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' }))
      setVideoPreview(URL.createObjectURL(blob))
      setVideoDuration(recordedDurationRef.current)
      stopCamera()
    }
    mediaRef.current = mr; mr.start(1000); setRecording(true)
    timerRef.current = setInterval(() => {
      recordedDurationRef.current += 1
      setRecordSeconds(s => {
        const next = s + 1
        if (next % 6 === 0) setScriptIdx(i => Math.min(i + 1, SCRIPT.length - 1))
        if (next >= MAX_SEC) stopRecording()
        return next
      })
    }, 1000)
  }

  function stopRecording() {
    mediaRef.current?.stop(); setRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  useEffect(() => {
    if (recordMode === 'camera') startCamera(); else stopCamera()
    return () => stopCamera()
  }, [recordMode])

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setVideoFile(file); setVideoPreview(URL.createObjectURL(file)); setVideoDuration(null)
  }

  async function handleCreate() {
    if (!name.trim() || !videoFile) { setCreateError('İsim ve video gerekli'); return }
    if (videoDuration != null && videoDuration < MIN_SEC) {
      setCreateError(`Video çok kısa (${Math.round(videoDuration)}sn) — en az ${MIN_SEC}sn gerekli.`); return
    }
    setCreating(true); setCreateError('')
    try {
      setCreateStep('Video yükleniyor...')
      const signRes = await fetch(`${API}/api/replica/upload-seed`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ filename: videoFile.name, contentType: videoFile.type }),
      })
      const { signedUrl, path } = await signRes.json()
      if (!signedUrl) throw new Error('Upload URL alınamadı')
      const upRes = await fetch(signedUrl, { method: 'PUT', body: videoFile, headers: { 'Content-Type': videoFile.type } })
      if (!upRes.ok) throw new Error('Video yüklenemedi')
      setCreateStep('Eğitim başlatılıyor...')
      const trainRes = await fetch(`${API}/api/replica/train`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ name: name.trim(), language, engine: 'museTalk', seedVideoPath: path, cloneVoice: true, durationSec: videoDuration ?? undefined, sceneType, characterGroup: characterGroup.trim() || undefined }),
      })
      const trainData = await trainRes.json()
      if (!trainRes.ok) throw new Error(trainData.error || 'Eğitim başlatılamadı')
      setName(''); setVideoFile(null); setVideoPreview(null); setVideoDuration(null)
      setSceneType('studio'); setCharacterGroup(''); setTab('list'); load()
    } catch (e: any) { setCreateError(e.message)
    } finally { setCreating(false); setCreateStep('') }
  }

  async function setDefault(id: string) {
    await fetch(`${API}/api/replica/${id}/set-default`, { method: 'POST', headers: authH() }); load()
  }

  async function deleteReplica(id: string) {
    if (!confirm('Bu replikayı silmek istediğinizden emin misiniz?')) return
    await fetch(`${API}/api/replica/${id}`, { method: 'DELETE', headers: authH() })
    setReplicas(prev => prev.filter(r => r.id !== id))
  }

  async function generateTest(id: string) {
    setTestingId(id); setTestVideoUrl(null)
    try {
      const r = await fetch(`${API}/api/replica/${id}/test-video`, { method: 'POST', headers: authH() })
      const d = await r.json()
      if (d.videoUrl) setTestVideoUrl(d.videoUrl)
    } finally { setTestingId(null) }
  }

  // ── INPUT STYLES ─────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e2e8f0', background: '#fff',
    color: tx1, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff, #f5f3ff 60%, #ffffff)',
        borderRadius: 20, padding: '28px 28px 24px',
        marginBottom: 20, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* subtle grid */}
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:'linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)', backgroundSize:'36px 36px' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(124,58,237,0.30)', flexShrink:0 }}>
                <Brain size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ color:tx1, fontSize:22, fontWeight:800, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                  AI Video Replikası
                </h1>
                <p style={{ color:tx2, fontSize:13, margin:0 }}>
                  Kendi sesiniz ve yüzünüzle kişiselleştirilmiş videolar
                </p>
              </div>
            </div>
            <button
              onClick={() => setTab('create')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(124,58,237,0.30)', transition:'all 0.15s', whiteSpace:'nowrap' }}
            >
              <Plus size={15} /> Yeni Replika
            </button>
          </div>

          {/* Info banner */}
          <div style={{ marginTop:18, display:'flex', alignItems:'flex-start', gap:10, background:purpleLight, border:`1px solid ${purpleBorder}`, borderRadius:12, padding:'12px 16px' }}>
            <Info size={15} style={{ color:purple, flexShrink:0, marginTop:1 }} />
            <p style={{ color:'#4c1d95', fontSize:13, margin:0, lineHeight:1.6 }}>
              <strong>Nasıl çalışır:</strong> 3-5 dakikalık bir video kaydedin veya yükleyin.
              Sistem sesinizi klonlar ve yüz hareketlerinizi öğrenir.
              Artık her video mesajı sizin sesinizle, sizin yüzünüzle oluşturulur.
            </p>
          </div>
        </div>
      </div>

      {/* ── STATS ROW (only when replicas exist) ── */}
      {replicas.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Toplam Replika',   value: replicas.length,                                         color:'#7c3aed', Icon:Brain },
            { label:'Hazır',            value: replicas.filter(r=>r.status==='ready').length,            color:'#059669', Icon:CheckCircle },
            { label:'Eğitimde',         value: replicas.filter(r=>r.status==='processing').length,       color:'#d97706', Icon:Loader2 },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ ...card, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p style={{ color:tx2, fontSize:11, fontWeight:600, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                <p style={{ color:tx1, fontSize:22, fontWeight:800, margin:0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {([['list','Replikalarım'], ['create','Yeni Replika Oluştur']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.15s',
              background: tab === key ? purple : '#fff',
              color:      tab === key ? '#fff'  : tx2,
              boxShadow:  tab === key ? '0 2px 8px rgba(124,58,237,0.25)' : 'none',
              border:     tab === key ? 'none' : '1px solid #e2e8f0',
            } as React.CSSProperties}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
              <Loader2 size={28} style={{ color:purple, animation:'spin 1s linear infinite' }} />
            </div>
          ) : replicas.length === 0 ? (
            <div style={{ ...card, padding:'60px 24px', textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:purpleLight, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <Brain size={32} style={{ color:purple }} />
              </div>
              <p style={{ color:tx1, fontSize:16, fontWeight:700, margin:'0 0 6px' }}>Henüz replika yok</p>
              <p style={{ color:tx3, fontSize:13, margin:'0 0 24px' }}>İlk video replikasını oluşturmak için aşağıdaki butona tıklayın</p>
              <button
                onClick={() => setTab('create')}
                style={{ padding:'10px 24px', borderRadius:10, border:'none', background:purple, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(124,58,237,0.30)' }}
              >
                Replika Oluştur
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {replicas.map(replica => (
                <div
                  key={replica.id}
                  style={{ ...card, padding:'18px 20px', borderLeft: replica.is_default ? `3px solid ${purple}` : '1px solid #e2e8f0', borderRadius:14 }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    {/* Thumbnail */}
                    <div style={{ width:64, height:64, borderRadius:12, background:purpleLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden', border:`1px solid ${purpleBorder}` }}>
                      {replica.preview_video_url
                        ? <video src={replica.preview_video_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline />
                        : <Brain size={24} style={{ color:purple }} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ color:tx1, fontSize:14, fontWeight:700 }}>{replica.name}</span>
                        {replica.is_default && (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, color:'#b45309', background:'#fffbeb', border:'1px solid #fde68a', textTransform:'uppercase' }}>
                            <Star size={9} /> Varsayılan
                          </span>
                        )}
                        <StatusBadge status={replica.status} />
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        {replica.scene_type && (
                          <span style={{ fontSize:11, color:tx2, background:surf, padding:'2px 8px', borderRadius:8, border:'1px solid #f1f5f9' }}>
                            {SCENE_OPTIONS.find(s => s.value === replica.scene_type)?.icon}{' '}
                            {SCENE_OPTIONS.find(s => s.value === replica.scene_type)?.label}
                          </span>
                        )}
                        <span style={{ fontSize:11, color:tx3 }}>{replica.language?.toUpperCase()}</span>
                        {replica.status === 'processing' && (
                          <span style={{ fontSize:11, color:purple, display:'flex', alignItems:'center', gap:4 }}>
                            <Loader2 size={10} style={{ animation:'spin 1s linear infinite' }} />
                            Ses klonlanıyor ve model eğitiliyor...
                          </span>
                        )}
                        {replica.status === 'failed' && replica.error_message && (
                          <span style={{ fontSize:11, color:'#dc2626' }}>{replica.error_message}</span>
                        )}
                        {replica.status === 'ready' && (
                          <>
                            {replica.elevenlabs_voice_id && (
                              <span style={{ fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:3 }}>
                                <CheckCircle size={10} /> Ses klonlandı
                              </span>
                            )}
                            {replica.gaussian_model_url && (
                              <span style={{ fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:3 }}>
                                <CheckCircle size={10} /> Model hazır
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      {replica.status === 'ready' && (
                        <>
                          <button
                            onClick={() => generateTest(replica.id)}
                            disabled={testingId === replica.id}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'1px solid #e2e8f0', background:surf, color:tx2, fontSize:12, fontWeight:600, cursor:'pointer', opacity: testingId === replica.id ? 0.5 : 1 }}
                          >
                            {testingId === replica.id
                              ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} />
                              : <Play size={12} />}
                            Test Video
                          </button>
                          {!replica.is_default && (
                            <button
                              onClick={() => setDefault(replica.id)}
                              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:`1px solid ${purpleBorder}`, background:purpleLight, color:purple, fontSize:12, fontWeight:600, cursor:'pointer' }}
                            >
                              <Star size={12} /> Varsayılan Yap
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => deleteReplica(replica.id)}
                        style={{ padding:7, borderRadius:8, border:'1px solid #fee2e2', background:'#fef2f2', color:'#dc2626', cursor:'pointer', display:'flex' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Test video result */}
                  {testVideoUrl && testingId === null && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #f1f5f9' }}>
                      <p style={{ color:tx2, fontSize:12, marginBottom:8 }}>Test video:</p>
                      <video src={testVideoUrl} controls style={{ maxWidth:320, width:'100%', borderRadius:10, border:'1px solid #e2e8f0' }} />
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
        <div style={{ maxWidth:680 }}>
          <div style={{ ...card, padding:28, display:'flex', flexDirection:'column', gap:22 }}>

            {/* Replika Adı */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:tx1, marginBottom:8 }}>Replika Adı</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Örn: Ana Satış Replikası"
                style={inputStyle}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = purple}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Dil */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:tx1, marginBottom:8 }}>Dil</label>
              <select
                value={language} onChange={e => setLanguage(e.target.value)}
                style={{ ...inputStyle, appearance:'none', cursor:'pointer' }}
              >
                {LANGUAGES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </div>

            {/* Ortam */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:tx1, marginBottom:4 }}>Kayıt Ortamı</label>
              <p style={{ color:tx3, fontSize:12, margin:'0 0 10px' }}>Aynı kişiyi farklı ortamlarda kaydedip videolarda seçim yapabilirsiniz.</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                {SCENE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSceneType(opt.value)}
                    title={opt.tip}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      padding:'12px 4px', borderRadius:12, border:'none', cursor:'pointer', transition:'all 0.15s',
                      background: sceneType === opt.value ? purpleLight : surf,
                      outline: sceneType === opt.value ? `2px solid ${purple}` : '2px solid transparent',
                    }}
                  >
                    <span style={{ fontSize:20 }}>{opt.icon}</span>
                    <span style={{ fontSize:11, fontWeight:600, color: sceneType === opt.value ? purple : tx2 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kişi Grubu */}
            {replicas.length > 0 && (
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:tx1, marginBottom:4 }}>
                  Kişi Grubu <span style={{ color:tx3, fontWeight:400 }}>(opsiyonel)</span>
                </label>
                <input
                  value={characterGroup} onChange={e => setCharacterGroup(e.target.value)}
                  placeholder="Örn: ahmet (boş bırakılırsa otomatik oluşur)"
                  style={inputStyle}
                />
                {[...new Set(replicas.map(r => r.character_group).filter(Boolean))].length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                    {[...new Set(replicas.map(r => r.character_group).filter(Boolean))].map(g => (
                      <button key={g} onClick={() => setCharacterGroup(g!)}
                        style={{ padding:'3px 10px', borderRadius:20, border:'1px solid #e2e8f0', background:surf, color:tx2, fontSize:11, cursor:'pointer' }}>
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video Kaynağı */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:tx1, marginBottom:10 }}>
                Kaynak Video <span style={{ color:tx3, fontWeight:400 }}>(3-5 dakika önerilir)</span>
              </label>

              {/* Mode toggle */}
              <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                {([['upload','Dosya Yükle',Upload],['camera','Kamera ile Kaydet',Camera]] as any[]).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    onClick={() => setRecordMode(m)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                      background: recordMode === m ? purple : surf,
                      color:      recordMode === m ? '#fff' : tx2,
                    }}
                  >
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              {/* Upload */}
              {recordMode === 'upload' && !videoPreview && (
                <>
                  <input ref={fileInputRef} type="file" accept="video/*" onChange={onFileSelect} style={{ display:'none' }} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width:'100%', padding:'32px 24px', border:'2px dashed #e2e8f0', borderRadius:14, background:surf, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, transition:'all 0.15s', boxSizing:'border-box' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = purple; (e.currentTarget as HTMLButtonElement).style.background = purpleLight }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.background = surf }}
                  >
                    <Upload size={28} style={{ color:purple }} />
                    <span style={{ color:tx1, fontSize:13, fontWeight:600 }}>MP4, WebM veya MOV seçin</span>
                    <span style={{ color:tx3, fontSize:12 }}>Maks 500 MB</span>
                  </button>
                </>
              )}

              {/* Camera */}
              {recordMode === 'camera' && !videoPreview && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ position:'relative', background:'#000', borderRadius:14, overflow:'hidden', aspectRatio:'16/9' }}>
                    <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline />
                    {!recording && countdown === null && (
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                        <div style={{ width:'42%', aspectRatio:'3/4', borderRadius:'50%', border:'2px dashed rgba(255,255,255,0.4)' }} />
                      </div>
                    )}
                    {countdown !== null && (
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ color:'#fff', fontSize:80, fontWeight:900 }}>{countdown}</span>
                      </div>
                    )}
                    {recording && (
                      <>
                        <div style={{ position:'absolute', top:12, left:12, display:'flex', alignItems:'center', gap:6, background:'#dc2626', borderRadius:20, padding:'5px 12px' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff', animation:'pulse 1.5s ease-in-out infinite' }} />
                          <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>KAYIT</span>
                        </div>
                        <div style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.6)', borderRadius:20, padding:'5px 12px' }}>
                          <span style={{ color: recordSeconds >= REC_SEC ? '#34d399' : recordSeconds >= MIN_SEC ? '#fbbf24' : '#fff', fontSize:12, fontWeight:700 }}>
                            {Math.floor(recordSeconds/60)}:{String(recordSeconds%60).padStart(2,'0')}
                          </span>
                        </div>
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding:'20px 16px 16px' }}>
                          <p style={{ color:'#fff', fontSize:13, fontWeight:500, textAlign:'center', margin:0, textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>{SCRIPT[scriptIdx]}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {recording && (
                    <div>
                      <div style={{ height:6, background:'#f1f5f9', borderRadius:6, overflow:'hidden', marginBottom:6 }}>
                        <div style={{ height:'100%', borderRadius:6, transition:'all 0.5s',
                          width:`${Math.min(100, (recordSeconds/REC_SEC)*100)}%`,
                          background: recordSeconds >= REC_SEC ? '#059669' : recordSeconds >= MIN_SEC ? '#d97706' : '#7c3aed' }} />
                      </div>
                      <p style={{ color:tx3, fontSize:11, textAlign:'center', margin:0 }}>
                        {recordSeconds < MIN_SEC ? `En az ${MIN_SEC} saniye devam edin`
                          : recordSeconds < REC_SEC ? `İyi gidiyor — ${REC_SEC}sn'ye kadar devam edin`
                          : 'Kalite hedefine ulaşıldı'}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={recording ? stopRecording : beginGuidedRecording}
                    disabled={countdown !== null}
                    style={{ padding:'12px', borderRadius:12, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s',
                      background: recording ? '#dc2626' : purple, color:'#fff',
                      opacity: countdown !== null ? 0.6 : 1,
                    }}
                  >
                    {countdown !== null ? 'Hazırlanın...'
                      : recording ? <><StopCircle size={16} />Kaydı Durdur ({Math.floor(recordSeconds/60)}:{String(recordSeconds%60).padStart(2,'0')})</>
                      : <><Mic size={16} />Kayda Başla (3-2-1)</>}
                  </button>
                </div>
              )}

              {/* Preview */}
              {videoPreview && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ borderRadius:14, overflow:'hidden', aspectRatio:'16/9', background:'#000' }}>
                    <video src={videoPreview} controls style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      onLoadedMetadata={e => { const d=(e.target as HTMLVideoElement).duration; if(isFinite(d)) setVideoDuration(d) }} />
                  </div>
                  {videoDuration != null && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600,
                      color: videoDuration < MIN_SEC ? '#dc2626' : videoDuration < REC_SEC ? '#d97706' : '#059669',
                      background: videoDuration < MIN_SEC ? '#fef2f2' : videoDuration < REC_SEC ? '#fffbeb' : '#ecfdf5',
                      border: `1px solid ${videoDuration < MIN_SEC ? '#fecaca' : videoDuration < REC_SEC ? '#fde68a' : '#a7f3d0'}`,
                    }}>
                      {videoDuration < MIN_SEC ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
                      {Math.round(videoDuration)} saniye —{' '}
                      {videoDuration < MIN_SEC ? `çok kısa, en az ${MIN_SEC}sn gerekli`
                        : videoDuration < REC_SEC ? `kabul edilir, ${REC_SEC}sn+ daha iyi sonuç verir`
                        : 'kalite için yeterli'}
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, color:'#059669', display:'flex', alignItems:'center', gap:6 }}>
                      <CheckCircle size={14} /> {videoFile?.name || 'Video hazır'}
                    </span>
                    <button onClick={() => { setVideoFile(null); setVideoPreview(null); setVideoDuration(null) }}
                      style={{ fontSize:12, color:tx2, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                      Değiştir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div style={{ background:purpleLight, border:`1px solid ${purpleBorder}`, borderRadius:12, padding:'14px 16px' }}>
              <p style={{ color:purple, fontSize:12, fontWeight:700, margin:'0 0 8px' }}>En iyi kalite için:</p>
              {['Düz arka plan, iyi aydınlatma', 'Yüzünüz kameraya tam karşı, göz hizasında', 'Doğal konuşun — kısa duraksamalar, el hareketleri', 'MP4 format, min 1080p çözünürlük'].map(tip => (
                <div key={tip} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                  <ChevronRight size={12} style={{ color:purple, flexShrink:0, marginTop:2 }} />
                  <span style={{ color:'#4c1d95', fontSize:12 }}>{tip}</span>
                </div>
              ))}
            </div>

            {/* Error */}
            {createError && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:13 }}>
                <AlertTriangle size={15} /> {createError}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !videoFile || (videoDuration != null && videoDuration < MIN_SEC)}
              style={{ padding:'13px', borderRadius:12, border:'none', background:purple, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s', opacity: (creating || !name.trim() || !videoFile) ? 0.5 : 1, boxShadow:'0 4px 14px rgba(124,58,237,0.30)' }}
            >
              {creating
                ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} />{createStep || 'Oluşturuluyor...'}</>
                : <><Brain size={16} />Replikayı Oluştur</>}
            </button>

            {creating && (
              <div style={{ textAlign:'center', paddingTop:4 }}>
                <p style={{ color:purple, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6, margin:'0 0 4px' }}>
                  <Clock size={14} /> Eğitim 2-10 dakika sürebilir
                </p>
                <p style={{ color:tx3, fontSize:12, margin:0 }}>Bu sayfayı kapatabilirsiniz, işlem arka planda devam eder</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
