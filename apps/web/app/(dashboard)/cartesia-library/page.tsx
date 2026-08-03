'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Play, Square, RefreshCw, Mic, Globe2, ChevronDown, ChevronUp } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH(): Record<string, string> { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const LANG_NAMES: Record<string, string> = {
  tr:'Türkçe', en:'İngilizce', de:'Almanca', fr:'Fransızca', es:'İspanyolca',
  it:'İtalyanca', pt:'Portekizce', ru:'Rusça', ar:'Arapça', ja:'Japonca',
  ko:'Korece', zh:'Çince', nl:'Hollandaca', pl:'Lehçe', hi:'Hintçe',
  sv:'İsveççe', da:'Danca', fi:'Fince', el:'Yunanca', cs:'Çekçe',
  uk:'Ukraynaca', ro:'Rumence', hu:'Macarca', id:'Endonezce',
}
const LANG_FLAGS: Record<string, string> = {
  tr:'🇹🇷', en:'🇬🇧', de:'🇩🇪', fr:'🇫🇷', es:'🇪🇸', it:'🇮🇹', pt:'🇧🇷', ru:'🇷🇺',
  ar:'🇸🇦', ja:'🇯🇵', ko:'🇰🇷', zh:'🇨🇳', nl:'🇳🇱', pl:'🇵🇱', hi:'🇮🇳',
  sv:'🇸🇪', da:'🇩🇰', fi:'🇫🇮', el:'🇬🇷', cs:'🇨🇿', uk:'🇺🇦', ro:'🇷🇴',
  hu:'🇭🇺', id:'🇮🇩',
}
const GENDER_TR: Record<string, string> = { male:'Erkek', female:'Kadın', neutral:'Nötr', '':'Bilinmiyor' }

const PREVIEW_TEXTS: Record<string, string> = {
  tr: 'Merhaba! Size kısa bir bilgi vermek istiyorum, uygun musunuz?',
  en: 'Hello! I have something important to share with you today.',
  de: 'Guten Tag! Ich möchte Ihnen etwas Wichtiges mitteilen.',
  fr: "Bonjour! J'ai quelque chose d'important à vous dire.",
  es: '¡Hola! Tengo algo importante que compartir con usted hoy.',
  it: 'Ciao! Ho qualcosa di importante da condividere con te oggi.',
  pt: 'Olá! Tenho algo importante para compartilhar com você.',
  ru: 'Здравствуйте! Хочу поделиться с вами важной информацией.',
  ar: 'مرحباً! لدي شيء مهم أريد مشاركته معك اليوم.',
  ja: 'こんにちは！大切なことをお伝えしたいと思います。',
  ko: '안녕하세요! 중요한 정보를 공유하고 싶습니다.',
  zh: '你好！今天我有重要的事情想和您分享。',
  nl: 'Hallo! Ik heb iets belangrijks met u te bespreken.',
  pl: 'Dzień dobry! Mam coś ważnego do omówienia z Panem/Panią.',
}

interface Voice {
  id: string
  name: string
  description?: string
  language?: string
  gender?: string
  is_public?: boolean
  supported_languages?: string[]
  embedding?: number[]
}

interface GroupedVoices {
  [lang: string]: Voice[]
}

// ─── VOICE CARD ──────────────────────────────────────────────────────────────

function VoiceCard({ voice, onPreview, playingId }: {
  voice: Voice
  onPreview: (v: Voice) => void
  playingId: string | null
}) {
  const isPlaying = playingId === voice.id
  const lang = voice.language || (voice.supported_languages?.[0] ?? 'en')
  const flag = LANG_FLAGS[lang] || '🌐'
  const langName = LANG_NAMES[lang] || lang.toUpperCase()
  const genderLabel = GENDER_TR[voice.gender || ''] || 'Nötr'
  const genderColor = voice.gender === 'male' ? '#3b82f6' : voice.gender === 'female' ? '#ec4899' : '#8b5cf6'

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'box-shadow .15s, border-color .15s',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.10)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#bfdbfe'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${genderColor}22, ${genderColor}44)`,
        border: `2px solid ${genderColor}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {voice.gender === 'female' ? '👩' : voice.gender === 'male' ? '👨' : '🎙️'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {voice.name}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>{flag} {langName}</span>
          <span style={{ fontSize: 11, color: genderColor, background: `${genderColor}11`, padding: '1px 7px', borderRadius: 999 }}>
            {genderLabel}
          </span>
          {voice.is_public && (
            <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '1px 7px', borderRadius: 999 }}>
              Genel
            </span>
          )}
        </div>
        {voice.description && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {voice.description}
          </div>
        )}
      </div>

      {/* ID */}
      <div style={{ fontSize: 10, color: '#cbd5e1', fontFamily: 'monospace', flexShrink: 0, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {voice.id.slice(0, 8)}…
      </div>

      {/* Preview button */}
      <button
        onClick={() => onPreview(voice)}
        style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
          background: isPlaying ? '#fee2e2' : '#eff6ff',
          border: `1.5px solid ${isPlaying ? '#fca5a5' : '#bfdbfe'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}
        title="Önizle"
      >
        {isPlaying
          ? <Square size={14} color="#ef4444" />
          : <Play size={14} color="#3b82f6" />
        }
      </button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function CartesiaLibraryPage() {
  const [voices, setVoices]         = useState<Voice[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [filterLang, setFilterLang] = useState('all')
  const [filterGender, setFilterGender] = useState('all')
  const [playingId, setPlayingId]   = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/engine/cartesia-voices`, { headers: authH() })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Yüklenemedi')
      setVoices(d.voices || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async (voice: Voice) => {
    if (playingId === voice.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    setPreviewLoading(voice.id)
    try {
      const lang = voice.language || voice.supported_languages?.[0] || 'en'
      const text = PREVIEW_TEXTS[lang] || PREVIEW_TEXTS['en']
      const r = await fetch(
        `${API}/api/voice-library/preview?voiceId=${voice.id}&provider=cartesia&lang=${lang}&text=${encodeURIComponent(text)}`,
        { headers: authH() }
      )
      if (!r.ok) throw new Error('Önizleme alınamadı')
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      setPlayingId(voice.id)
      audio.onended = () => setPlayingId(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPreviewLoading(null)
    }
  }

  // Filtreleme
  const filtered = voices.filter(v => {
    const lang = v.language || v.supported_languages?.[0] || ''
    if (filterLang !== 'all' && lang !== filterLang) return false
    if (filterGender !== 'all' && v.gender !== filterGender) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        v.name.toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q) ||
        lang.includes(q) ||
        (LANG_NAMES[lang] || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Dile göre grupla
  const grouped: GroupedVoices = {}
  for (const v of filtered) {
    const lang = v.language || v.supported_languages?.[0] || 'other'
    if (!grouped[lang]) grouped[lang] = []
    grouped[lang].push(v)
  }

  // Türkçeyi üste al, sonra alfabetik
  const sortedLangs = Object.keys(grouped).sort((a, b) => {
    if (a === 'tr') return -1
    if (b === 'tr') return 1
    return a.localeCompare(b)
  })

  // Benzersiz diller (filtre için)
  const allLangs = Array.from(new Set(voices.map(v => v.language || v.supported_languages?.[0] || ''))).filter(Boolean).sort((a, b) => {
    if (a === 'tr') return -1; if (b === 'tr') return 1; return a.localeCompare(b)
  })

  const totalByGender = {
    male:    voices.filter(v => v.gender === 'male').length,
    female:  voices.filter(v => v.gender === 'female').length,
    neutral: voices.filter(v => !v.gender || v.gender === 'neutral').length,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Mic size={22} color="#8b5cf6" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Cartesia Ses Kütüphanesi</h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          Cartesia hesabınızdaki tüm sesler — genel ve özel. Her sesi önizleyebilirsiniz.
        </p>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Toplam Ses', value: voices.length, color: '#8b5cf6' },
            { label: 'Dil', value: allLangs.length, color: '#3b82f6' },
            { label: 'Erkek', value: totalByGender.male, color: '#3b82f6' },
            { label: 'Kadın', value: totalByGender.female, color: '#ec4899' },
            { label: 'Nötr', value: totalByGender.neutral, color: '#64748b' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '10px 18px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim veya dil ara..."
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13,
              background: '#fff', color: '#0f172a', outline: 'none',
            }}
          />
        </div>

        {/* Language filter */}
        <select
          value={filterLang}
          onChange={e => setFilterLang(e.target.value)}
          style={{
            padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10,
            fontSize: 13, background: '#fff', color: '#0f172a', cursor: 'pointer',
          }}
        >
          <option value="all">Tüm Diller</option>
          {allLangs.map(l => (
            <option key={l} value={l}>{LANG_FLAGS[l] || '🌐'} {LANG_NAMES[l] || l.toUpperCase()}</option>
          ))}
        </select>

        {/* Gender filter */}
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          style={{
            padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10,
            fontSize: 13, background: '#fff', color: '#0f172a', cursor: 'pointer',
          }}
        >
          <option value="all">Tüm Cinsiyetler</option>
          <option value="male">👨 Erkek</option>
          <option value="female">👩 Kadın</option>
          <option value="neutral">🎙️ Nötr</option>
        </select>

        {/* Refresh */}
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 10,
            fontSize: 13, background: '#fff', color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Result count */}
      {!loading && !error && (
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
          {filtered.length} ses gösteriliyor {filtered.length !== voices.length ? `(toplam ${voices.length} içinden)` : ''}
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw size={28} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div style={{ fontSize: 14 }}>Cartesia ses kataloğu yükleniyor...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 20, color: '#dc2626', fontSize: 14 }}>
          Hata: {error}
        </div>
      )}

      {/* Voice groups */}
      {!loading && !error && sortedLangs.map(lang => {
        const langVoices = grouped[lang]
        const flag = LANG_FLAGS[lang] || '🌐'
        const langName = LANG_NAMES[lang] || lang.toUpperCase()
        const isCollapsed = collapsed[lang]

        return (
          <div key={lang} style={{ marginBottom: 20 }}>
            {/* Group header */}
            <button
              onClick={() => setCollapsed(c => ({ ...c, [lang]: !c[lang] }))}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 0', marginBottom: isCollapsed ? 0 : 12,
              }}
            >
              <span style={{ fontSize: 20 }}>{flag}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{langName}</span>
              <span style={{
                fontSize: 12, color: '#8b5cf6', background: '#f3e8ff',
                padding: '2px 9px', borderRadius: 999, fontWeight: 600,
              }}>
                {langVoices.length} ses
              </span>
              <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </span>
            </button>

            {/* Cards grid */}
            {!isCollapsed && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 10,
              }}>
                {langVoices.map(v => (
                  <VoiceCard
                    key={v.id}
                    voice={v}
                    onPreview={handlePreview}
                    playingId={previewLoading === v.id ? v.id : playingId}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <Globe2 size={40} style={{ marginBottom: 12, opacity: .4 }} />
          <div style={{ fontSize: 14 }}>Sonuç bulunamadı. Filtreleri değiştirin.</div>
        </div>
      )}
    </div>
  )
}
