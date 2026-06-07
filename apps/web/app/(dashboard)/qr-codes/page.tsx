'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Trash2, Download, Copy, CheckCircle, Sparkles, ChevronRight, Globe, MessageCircle, FileText, Phone, Mail, Wifi, Camera, Grid3x3, Trophy, Target } from 'lucide-react'

const tx1 = '#0f172a', tx2 = '#475569', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'
const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const inp = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

// ── QR Scanner Frame 3D Animation ─────────────────────────────────────────────
// Unique to this page — looks like a real QR scanner
function QRScanFrame({ size = 120 }: { size?: number }) {
  const s = size
  const cell = s / 9
  // QR-like pixel pattern (1=dark, 0=light) — finder patterns + some data
  const PATTERN = [
    [1,1,1,1,1,1,1,0,1,],
    [1,0,0,0,0,0,1,0,0,],
    [1,0,1,1,1,0,1,0,1,],
    [1,0,1,1,1,0,1,0,0,],
    [1,0,1,1,1,0,1,0,1,],
    [1,0,0,0,0,0,1,0,0,],
    [1,1,1,1,1,1,1,0,1,],
    [0,0,0,0,0,0,0,0,0,],
    [1,0,1,0,1,0,1,0,1,],
  ]

  return (
    <div style={{ width: s * 1.6, height: s * 1.6, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)', animation: 'qrGlow 3s ease-in-out infinite' }} />

      {/* 3D-tilted QR frame */}
      <div style={{ width: s, height: s, position: 'relative', transform: 'perspective(400px) rotateY(-12deg) rotateX(6deg)', transformStyle: 'preserve-3d', animation: 'qrFloat 6s ease-in-out infinite' }}>

        {/* Pixel grid */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(9,1fr)`, gap: 2, padding: cell * 0.4 }}>
          {PATTERN.flat().map((px, i) => (
            <div key={i} style={{
              borderRadius: 2,
              background: px ? 'rgba(6,182,212,0.75)' : 'rgba(6,182,212,0.06)',
              boxShadow: px ? '0 0 4px rgba(6,182,212,0.5)' : 'none',
              animation: px && Math.random() > 0.7 ? `qrBlink ${1.5 + Math.random() * 2}s ease-in-out infinite` : 'none',
              animationDelay: `${Math.random() * 2}s`,
            }} />
          ))}
        </div>

        {/* Scanning line */}
        <div style={{ position: 'absolute', left: 4, right: 4, height: 2, background: 'linear-gradient(90deg,transparent,#06b6d4,#22d3ee,#06b6d4,transparent)', boxShadow: '0 0 12px rgba(6,182,212,0.8), 0 0 24px rgba(6,182,212,0.4)', animation: 'qrScan 2.5s ease-in-out infinite', zIndex: 4 }} />

        {/* Corner brackets */}
        {[
          { top: 0, left: 0, borderW: '3px 0 0 3px' },
          { top: 0, right: 0, borderW: '3px 3px 0 0' },
          { bottom: 0, left: 0, borderW: '0 0 3px 3px' },
          { bottom: 0, right: 0, borderW: '0 3px 3px 0' },
        ].map((pos, i) => (
          <div key={i} style={{ position: 'absolute', width: s * 0.22, height: s * 0.22, ...pos, border: `${pos.borderW} solid #06b6d4`, boxShadow: '0 0 8px rgba(6,182,212,0.6)', zIndex: 5 }} />
        ))}

        {/* Dark frame border */}
        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(6,182,212,0.2)', borderRadius: 4 }} />
      </div>

      {/* Floating mini pixels */}
      {[0,1,2,3].map(i => (
        <div key={i} className="qr-mini-px" style={{
          position: 'absolute',
          width: 5, height: 5, borderRadius: 1,
          background: '#06b6d4',
          boxShadow: '0 0 6px #06b6d4',
          opacity: 0.6,
          top: `${20 + i * 18}%`,
          left: i % 2 === 0 ? `${5 + i * 3}%` : `${85 - i * 3}%`,
          animationDelay: `${i * 0.7}s`,
        }} />
      ))}
    </div>
  )
}

function FloatPixel({ size = 8, color = '#06b6d4', delay = '0s', style = {} }: any) {
  return (
    <div className="qr-mini-px" style={{ width: size, height: size, borderRadius: 2, background: color, boxShadow: `0 0 ${size}px ${color}99`, opacity: 0.5, animationDelay: delay, ...style }} />
  )
}

// ── QR Type config ────────────────────────────────────────────────────────────
const QR_TYPES = [
  { key: 'url',       label: 'Web Sitesi',      Icon: Globe,         color: '#0d9488', placeholder: 'https://siteadresiniz.com', hint: '' },
  { key: 'whatsapp',  label: 'WhatsApp',        Icon: MessageCircle, color: '#059669', placeholder: '905xxxxxxxxx', hint: 'Ülke kodu dahil numara (905xxxxxxxx)' },
  { key: 'microsite', label: 'Kişisel Katalog', Icon: FileText,      color: '#7c3aed', placeholder: 'https://leadflow-ai-web-kappa.vercel.app/catalog/...', hint: 'Katalog linkini yapıştırın' },
  { key: 'phone',     label: 'Telefon',         Icon: Phone,         color: '#b45309', placeholder: '905xxxxxxxxx', hint: 'Ülke kodu dahil numara' },
  { key: 'email',     label: 'E-Posta',         Icon: Mail,          color: '#db2777', placeholder: 'ornek@email.com', hint: '' },
  { key: 'wifi',      label: 'WiFi',            Icon: Wifi,          color: '#0d9488', placeholder: 'WiFi Ağ Adı', hint: 'SSID sonraki alana, şifre bunun yanına' },
]

const QR_COLORS = [
  { label: 'Turkuaz',  value: '06b6d4' },
  { label: 'Mor',      value: '8b5cf6' },
  { label: 'Yeşil',    value: '10b981' },
  { label: 'Pembe',    value: 'ec4899' },
  { label: 'Turuncu',  value: 'f59e0b' },
  { label: 'Siyah',    value: '1e293b' },
]

function buildQRUrl(type: string, input: string, extra = ''): string {
  if (!input) return ''
  switch (type) {
    case 'whatsapp': return `https://wa.me/${input.replace(/\D/g, '')}`
    case 'phone':    return `tel:+${input.replace(/\D/g, '')}`
    case 'email':    return `mailto:${input}`
    case 'wifi':     return `WIFI:T:WPA;S:${input};P:${extra};;`
    default:         return input.startsWith('http') ? input : `https://${input}`
  }
}

function buildPreviewSrc(finalUrl: string, color: string): string {
  if (!finalUrl) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalUrl)}&format=png&margin=12&color=${color}&bgcolor=ffffff`
}

// ── QR Card ───────────────────────────────────────────────────────────────────
function QRCard({ qr, onDelete, showMsg }: any) {
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const typeConf = QR_TYPES.find(qt => qt.key === qr.type) || QR_TYPES[0]

  const copyLink = () => {
    navigator.clipboard.writeText(qr.url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = async () => {
    setDownloading(true)
    try {
      const r = await fetch(qr.qr_image_url)
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${qr.label || 'qr'}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { showMsg('error', 'İndirme başarısız') }
    setDownloading(false)
  }

  return (
    <div style={{ position: 'relative', ...card, border: `1px solid ${typeConf.color}30`, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px ${typeConf.color}18` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}>
      {/* Type badge */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: `${typeConf.color}14`, border: `1px solid ${typeConf.color}30`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: typeConf.color, fontWeight: 600, zIndex: 2 }}>
        <typeConf.Icon size={12} /> {typeConf.label}
      </div>

      {/* QR Image */}
      <div style={{ padding: '48px 24px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 130, height: 130 }}>
          <div style={{ position: 'absolute', inset: -6, borderRadius: 16, background: `radial-gradient(circle,${typeConf.color}18 0%,transparent 70%)` }} />
          <div style={{ width: 130, height: 130, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 6, boxShadow: `0 4px 20px ${typeConf.color}1f` }}>
            <img src={qr.qr_image_url} alt={qr.label} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6 }} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '0 18px 18px' }}>
        <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qr.label}</p>
        <p style={{ color: tx3, fontSize: 11, margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qr.url}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 11 }}>
            <Camera size={11} /> {qr.scans} tarama
          </div>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: tx3 }} />
          <span style={{ color: tx3, fontSize: 11 }}>{new Date(qr.created_at).toLocaleDateString()}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={downloadQR} disabled={downloading}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `${typeConf.color}15`, color: typeConf.color, fontSize: 11, fontWeight: 600 }}>
            {downloading ? <RefreshCw size={11} style={{ animation: 'qrSpin 1s linear infinite' }} /> : <Download size={11} />} İndir
          </button>
          <button onClick={copyLink}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied ? 'rgba(5,150,105,0.12)' : surf, color: copied ? accentEmerald : tx2, fontSize: 11 }}>
            {copied ? <CheckCircle size={11} /> : <Copy size={11} />} {copied ? 'Kopyalandı' : 'Link Kopyala'}
          </button>
          {!confirm ? (
            <button onClick={() => setConfirm(true)}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={11} />
            </button>
          ) : (
            <button onClick={() => onDelete(qr.id)}
              style={{ padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.18)', color: '#dc2626', fontSize: 11, fontWeight: 700 }}>
              Sil?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QRPage() {
  const { t } = useI18n()
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [type, setType]     = useState('url')
  const [input, setInput]   = useState('')
  const [extra, setExtra]   = useState('')   // WiFi password
  const [label, setLabel]   = useState('')
  const [color, setColor]   = useState('06b6d4')
  const [creating, setCreating] = useState(false)

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = async () => {
    setLoading(true)
    const [q, s] = await Promise.allSettled([api.get('/api/qr/list'), api.get('/api/qr/stats')])
    if (q.status === 'fulfilled') setQrCodes(q.value.qrCodes || [])
    if (s.status === 'fulfilled') setStats(s.value)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const finalUrl   = buildQRUrl(type, input, extra)
  const previewSrc = buildPreviewSrc(finalUrl, color)
  const typeConf   = QR_TYPES.find(qt => qt.key === type)!

  const create = async () => {
    if (!input) return
    setCreating(true)
    try {
      const res = await api.post('/api/qr/generate', { url: finalUrl, label: label || input, type, color })
      if (!res?.qr) throw new Error(res?.error || 'QR kaydedilemedi')
      showMsg('success', 'QR kod oluşturuldu!')
      setInput(''); setLabel(''); setExtra('')
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const deleteQR = async (id: string) => {
    try {
      await api.delete(`/api/qr/${id}`)
      setQrCodes(prev => prev.filter(q => q.id !== id))
      showMsg('success', 'QR silindi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const filtered = filter ? qrCodes.filter(q => q.type === filter) : qrCodes

  const STAT_CONFIG = [
    { label: 'Toplam QR',   value: stats?.total || 0,      color: accentTeal, Icon: Grid3x3 },
    { label: 'Toplam Scan', value: stats?.totalScans || 0, color: accentEmerald, Icon: Camera },
    { label: t('En Çok Tip','En Çok Tip'),  value: stats?.topType || '-',  color: '#7c3aed', Icon: Trophy },
    { label: t('Aktif Tür','Aktif Tür'),   value: [...new Set(qrCodes.map(q => q.type))].length || 0, color: '#b45309', Icon: Target },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#ecfeff 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #cffafe' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div style={{ position: 'absolute', top: -60, right: -20, width: 260, height: 260, background: 'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)', zIndex: 0 }} />

        {/* Floating pixels */}
        <div style={{ position: 'absolute', top: 18, right: 220, zIndex: 1 }}><FloatPixel size={9} delay="0s" /></div>
        <div style={{ position: 'absolute', top: 60, right: 170, zIndex: 1 }}><FloatPixel size={6} color="#8b5cf6" delay="1.2s" /></div>
        <div style={{ position: 'absolute', bottom: 24, right: 230, zIndex: 1 }}><FloatPixel size={7} color="#10b981" delay="0.5s" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <QRScanFrame size={100} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: tx1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{t('qr_codes.qr_kod_uretici', 'QR Kod Üretici')}</h1>
                <span style={{ background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>PRO</span>
              </div>
              <p style={{ color: tx2, fontSize: 14, margin: '0 0 14px', maxWidth: 480 }}>{t('qr_codes.microsite_whatsapp_web_si', 'Microsite, WhatsApp, web sitesi, WiFi — anında QR oluştur, tarama sayısını takip et')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[{ Icon: Globe, l: 'Web' }, { Icon: MessageCircle, l: 'WhatsApp' }, { Icon: Phone, l: 'Telefon' }, { Icon: Wifi, l: 'WiFi' }, { Icon: Mail, l: 'E-Posta' }].map(({ Icon, l }) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(13,148,136,0.06)', border: '1px solid #cffafe', color: tx2, fontSize: 11, padding: '3px 10px', borderRadius: 20 }}><Icon size={11} /> {l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {STAT_CONFIG.map(({ label, value, color, Icon }) => (
            <div key={label} style={{ background: surf, borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon size={20} style={{ color }} /></div>
              <p style={{ color, fontSize: typeof value === 'number' ? 24 : 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${msg.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      {/* ── CREATE SECTION ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, marginBottom: 28 }}>
        {/* Form */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Sparkles size={16} style={{ color: accentTeal }} />
            <h2 style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0 }}>{t('qr_codes.yeni_qr_kod_olustur', 'Yeni QR Kod Oluştur')}</h2>
          </div>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {QR_TYPES.map(qt => (
              <button key={qt.key} onClick={() => { setType(qt.key); setInput(''); setExtra('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 10, border: `1px solid ${type === qt.key ? qt.color : '#e2e8f0'}`, background: type === qt.key ? `${qt.color}18` : surf, color: type === qt.key ? qt.color : tx2, fontSize: 12, fontWeight: type === qt.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                <qt.Icon size={13} /> {qt.label}
              </button>
            ))}
          </div>

          {/* Input fields */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'wifi' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>
                {type === 'wifi' ? 'WiFi Ağ Adı (SSID) *' : type === 'whatsapp' || type === 'phone' ? 'Telefon Numarası *' : type === 'email' ? 'E-Posta Adresi *' : 'URL / Link *'}
              </label>
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={typeConf.placeholder}
                style={{ ...inp, width: '100%', border: `1px solid ${input ? `${typeConf.color}60` : '#e2e8f0'}` }} />
              {typeConf.hint && <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0' }}>{typeConf.hint}</p>}
            </div>
            {type === 'wifi' && (
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>{t('qr_codes.wifi_sifresi', 'WiFi Şifresi')}</label>
                <input value={extra} onChange={e => setExtra(e.target.value)} placeholder={t('qr_codes.sifre_bos_birakilabilir', 'Şifre (boş bırakılabilir)')}
                  style={{ ...inp, width: '100%' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 18, alignItems: 'flex-end' }}>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Etiket (opsiyonel)</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ana Sayfa QR, WhatsApp QR..."
                style={{ ...inp, width: '100%' }} />
            </div>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Renk</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {QR_COLORS.map(c => (
                  <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                    style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${color === c.value ? tx1 : 'transparent'}`, background: `#${c.value}`, cursor: 'pointer', transition: 'border 0.15s' }} />
                ))}
              </div>
            </div>
          </div>

          {/* URL preview */}
          {finalUrl && (
            <div style={{ padding: '8px 12px', background: surf, borderRadius: 8, marginBottom: 14, border: '1px solid #e2e8f0' }}>
              <p style={{ color: tx3, fontSize: 10, margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('qr_codes.olusturulacak_link', 'Oluşturulacak link')}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finalUrl}</p>
            </div>
          )}

          <button onClick={create} disabled={creating || !input}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: creating || !input ? 'not-allowed' : 'pointer', background: input ? `linear-gradient(135deg,#0891b2,${typeConf.color === '#0d9488' ? '#7c3aed' : typeConf.color})` : '#e2e8f0', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !input ? 0.5 : 1, boxShadow: input ? `0 6px 20px ${typeConf.color}35` : 'none', transition: 'all 0.2s' }}>
            {creating ? <RefreshCw size={16} style={{ animation: 'qrSpin 1s linear infinite' }} /> : <Grid3x3 size={16} />}
            {creating ? 'Oluşturuluyor...' : 'QR Kod Oluştur'}
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ ...card, border: `1px solid ${previewSrc ? `${typeConf.color}40` : '#e2e8f0'}`, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s' }}>
          <p style={{ color: tx3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px', textAlign: 'center' }}>{t('qr_codes.canli_onizleme', 'Canlı Önizleme')}</p>
          {previewSrc ? (
            <>
              <div style={{ width: 160, height: 160, background: '#fff', borderRadius: 14, padding: 8, boxShadow: `0 8px 32px ${typeConf.color}30`, margin: '0 0 12px', border: '1px solid #e2e8f0' }}>
                <img key={previewSrc} src={previewSrc} alt="QR" style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6 }} />
              </div>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: typeConf.color, fontSize: 12, fontWeight: 600, margin: 0, textAlign: 'center' }}><typeConf.Icon size={14} /> {typeConf.label}</p>
              <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0', textAlign: 'center' }}>{t('qr_codes.siyah_kutu_tiklanabilir', 'Siyah kutu tıklanabilir')}</p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <QRScanFrame size={80} />
              <p style={{ color: tx3, fontSize: 12, marginTop: 12 }}>{t('qr_codes.link_yazinca', 'Link yazınca')}<br/>{t('qr_codes.onizleme_cikar', 'önizleme çıkar')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── QR GALLERY ────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: 0 }}>QR Kodlarım {qrCodes.length > 0 && <span style={{ color: tx3, fontWeight: 400, fontSize: 13 }}>({qrCodes.length})</span>}</h2>
          {qrCodes.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setFilter('')} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${!filter ? 'rgba(13,148,136,0.4)' : '#e2e8f0'}`, background: !filter ? 'rgba(13,148,136,0.08)' : 'transparent', color: !filter ? accentTeal : tx2, fontSize: 11, cursor: 'pointer' }}>{t('qr_codes.tumu', 'Tümü')}</button>
              {QR_TYPES.filter(qt => qrCodes.some(q => q.type === qt.key)).map(qt => (
                <button key={qt.key} onClick={() => setFilter(filter === qt.key ? '' : qt.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${filter === qt.key ? `${qt.color}50` : '#e2e8f0'}`, background: filter === qt.key ? `${qt.color}15` : 'transparent', color: filter === qt.key ? qt.color : tx2, fontSize: 11, cursor: 'pointer' }}>
                  <qt.Icon size={11} /> {qt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', height: 100, alignItems: 'center' }}>
            <RefreshCw size={22} style={{ color: tx2, animation: 'qrSpin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
            <QRScanFrame size={72} />
            <p style={{ color: tx2, fontSize: 14, margin: '16px 0 6px' }}>{filter ? 'Bu tipte QR kod yok' : 'Henüz QR kod oluşturmadınız'}</p>
            <p style={{ color: tx3, fontSize: 12, margin: 0 }}>{t('qr_codes.yukaridaki_formdan_ilk_qr', 'Yukarıdaki formdan ilk QR kodunuzu oluşturun')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {filtered.map(qr => (
              <QRCard key={qr.id} qr={qr} onDelete={deleteQR} showMsg={showMsg} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes qrScan {
          0%   { top: 8px; }
          50%  { top: calc(100% - 10px); }
          100% { top: 8px; }
        }
        @keyframes qrGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.04); }
        }
        @keyframes qrFloat {
          0%, 100% { transform: perspective(400px) rotateY(-12deg) rotateX(6deg) translateY(0px); }
          50%       { transform: perspective(400px) rotateY(-12deg) rotateX(6deg) translateY(-8px); }
        }
        @keyframes qrBlink {
          0%, 100% { opacity: 0.75; }
          50%       { opacity: 0.25; }
        }
        .qr-mini-px { animation: qrMiniFloat 4s ease-in-out infinite; }
        @keyframes qrMiniFloat {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-8px); opacity: 0.8; }
        }
        @keyframes qrSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
