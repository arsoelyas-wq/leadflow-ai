'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { MARKET_SLUGS } from '@/lib/market-pages'
import {
  Upload, Send, RefreshCw, QrCode, Trash2, Eye, BarChart3,
  Users, Sparkles, Zap, Globe, Globe2, ChevronRight,
  Package, Smartphone, Search, Hammer, Palette, Home,
  Target, Plus, Folder, Camera, Square, RotateCw, Lightbulb, Ruler,
  CheckCircle, PartyPopper, ExternalLink, Copy, ToggleLeft, ToggleRight,
  Bot, Link2, Bell, BarChart2, Flame, Thermometer, Snowflake, MapPin, PenLine,
  Download, MessageCircle, FileText, Phone, Mail, Wifi, Grid3x3, Trophy,
  Edit3, Box, LayoutTemplate,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
const APP_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '').replace('https://leadflow-ai-production.up.railway.app', 'https://leadflow-ai-web-kappa.vercel.app')
  : 'https://leadflow-ai-web-kappa.vercel.app'
const CATALOG_BASE = `${APP_URL}/catalog/`

const tx1 = '#0f172a', tx2 = '#475569', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'
const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const inp = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

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

// ── 3D CSS Cube (AR) ────────────────────────────────────────────────────────
function Cube3D({ size = 64 }: { size?: number }) {
  const h = size / 2
  return (
    <div style={{ perspective: `${size * 5}px`, width: size, height: size }}>
      <div className="cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }}>
        {[
          { transform: `translateZ(${h}px)`,                  bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.4)' },
          { transform: `translateZ(-${h}px) rotateY(180deg)`, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)' },
          { transform: `translateX(-${h}px) rotateY(-90deg)`, bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
          { transform: `translateX(${h}px) rotateY(90deg)`,   bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.4)' },
          { transform: `translateY(-${h}px) rotateX(90deg)`,  bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
          { transform: `translateY(${h}px) rotateX(-90deg)`,  bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)'  },
        ].map((f, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: f.transform, background: f.bg, border: `1px solid ${f.border}` }} />
        ))}
      </div>
    </div>
  )
}

function FloatCube({ size = 20, delay = '0s', color = '#ec4899' }: { size?: number; delay?: string; color?: string }) {
  const h = size / 2
  return (
    <div className="float-cube" style={{ animationDelay: delay, width: size, height: size }}>
      <div className="cube-spin" style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', perspective: `${size * 8}px` }}>
        {[
          `translateZ(${h}px)`, `translateZ(-${h}px) rotateY(180deg)`,
          `translateX(-${h}px) rotateY(-90deg)`, `translateX(${h}px) rotateY(90deg)`,
          `translateY(-${h}px) rotateX(90deg)`, `translateY(${h}px) rotateX(-90deg)`,
        ].map((t, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, transform: t, background: `${color}18`, border: `1px solid ${color}55` }} />
        ))}
      </div>
    </div>
  )
}

// ── Holographic Model Card (AR) ───────────────────────────────────────────────
function ModelCard({ model, CATEGORIES, selectedLead, selectedLeads, sending, onSend, onDelete, onQR, showQR, onAnalytics, expandedAnalytics, analyticsData }: any) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 4
    const y = (-(e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4
    setTilt({ x, y })
  }

  return (
    <div ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }) }}
      onMouseMove={handleMouseMove}
      style={{ transition: hovered ? 'transform 0.05s ease' : 'transform 0.3s ease', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 18, zIndex: 0, background: hovered ? 'linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6,#14b8a6,#ec4899)' : 'linear-gradient(135deg,#ec489933,#8b5cf633)', backgroundSize: '300% 300%', animation: hovered ? 'holoBorder 2s linear infinite' : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, ...card, borderRadius: 17, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg,rgba(236,72,153,0.12),rgba(139,92,246,0.12))', border: '1px solid #fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 0 24px rgba(236,72,153,0.2)' : 'none', transition: 'box-shadow 0.3s' }}>
            {hovered ? <Cube3D size={36} /> : <Package size={24} style={{ color: '#db2777' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: tx1, fontWeight: 700, fontSize: 15, margin: 0 }}>{model.product_name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(236,72,153,0.1)', color: '#db2777', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(236,72,153,0.2)' }}>
                {CATEGORIES.find((c: any) => c.value === model.category)?.label || model.category}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 12 }}><Eye size={12} /> {model.view_count || 0}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 12 }}><Smartphone size={12} /> {model.ar_session_count || 0} AR</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: tx2, fontSize: 12 }}><Send size={12} /> {model.send_count || 0}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={model.ar_viewer_url} target="_blank" rel="noopener noreferrer" style={btnStyle('#e2e8f0')} title="AR Önizle"><Eye size={13} /></a>
            <button onClick={() => onQR(model.id)} style={btnStyle(showQR === model.id ? '#ede9fe' : '#e2e8f0', showQR === model.id ? '#7c3aed' : tx2)} title="QR Kod"><QrCode size={13} /></button>
            <button onClick={() => onAnalytics(model.id)} style={btnStyle(expandedAnalytics === model.id ? '#dbeafe' : '#e2e8f0', expandedAnalytics === model.id ? '#2563eb' : tx2)} title="Analitik"><BarChart3 size={13} /></button>
            <button onClick={() => onSend(model.id, false)} disabled={sending === model.id || !selectedLead}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: (sending === model.id || !selectedLead) ? 0.4 : 1 }}>
              {sending === model.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />} Gönder
            </button>
            {selectedLeads.length > 0 && (
              <button onClick={() => onSend(model.id, true)} disabled={sending === model.id}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: sending === model.id ? 0.4 : 1 }}>
                <Users size={12} /> {selectedLeads.length}
              </button>
            )}
            <button onClick={() => onDelete(model.id)} style={{ ...btnStyle('#fee2e2'), color: '#dc2626' }}><Trash2 size={13} /></button>
          </div>
        </div>
        {showQR === model.id && (
          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 20, background: 'rgba(124,58,237,0.04)' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 8, border: '1px solid #e2e8f0' }}><img src={model.qr_url} alt="QR" style={{ width: 120, height: 120, display: 'block' }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: tx1, fontWeight: 600, fontSize: 14, margin: '0 0 6px' }}>AR Linki & QR Kod</p>
              <p style={{ color: tx2, fontSize: 12, margin: '0 0 10px' }}>Müşteri QR&apos;ı okutunca AR deneyimi açılır</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: surf, borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: tx2, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{model.ar_viewer_url}</p>
                <button onClick={() => navigator.clipboard.writeText(model.ar_viewer_url)} style={{ padding: '4px 10px', background: '#e2e8f0', color: tx2, fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', flexShrink: 0 }}>Kopyala</button>
              </div>
            </div>
          </div>
        )}
        {expandedAnalytics === model.id && analyticsData && (
          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #e2e8f0', background: 'rgba(37,99,235,0.04)' }}>
            <p style={{ color: tx2, fontSize: 12, margin: '0 0 12px' }}>Analitik Özet</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[
                { label: 'Görüntüleme', value: analyticsData.views, color: '#2563eb' },
                { label: 'AR Oturumu', value: analyticsData.arSessions, color: '#db2777' },
                { label: 'Ort. Süre', value: `${analyticsData.avgDuration}s`, color: '#b45309' },
                { label: 'Mobil', value: analyticsData.mobileViews, color: accentEmerald },
                { label: 'AR Dönüşüm', value: `%${analyticsData.conversionRate}`, color: '#7c3aed' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: surf, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: `1px solid ${color}33` }}>
                  <p style={{ color, fontSize: 18, fontWeight: 700, margin: 0 }}>{value}</p>
                  <p style={{ color: tx2, fontSize: 10, marginTop: 3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function btnStyle(bg: string, color: string = tx2): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: bg, color }
}

// ── Quantum Orbital Sphere (Microsites) ──────────────────────────────────────
function QuantumOrb({ size = 64 }: { size?: number }) {
  const s = size
  const ring = (extra: number) => s + extra * 2
  return (
    <div style={{ width: s * 2.2, height: s * 2.2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: s * 2.2, height: s * 2.2, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)', animation: 'msOrbGlow 3s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: ring(s * 0.55), height: ring(s * 0.55), borderRadius: '50%', border: '1.5px solid rgba(6,182,212,0.55)', animation: 'msRing1 4s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
      </div>
      <div style={{ position: 'absolute', width: ring(s * 0.4), height: ring(s * 0.4), borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.5)', animation: 'msRing2 6s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
      </div>
      <div style={{ position: 'absolute', width: ring(s * 0.28), height: ring(s * 0.28), borderRadius: '50%', border: '1px solid rgba(20,184,166,0.45)', animation: 'msRing3 9s linear infinite', transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: -2.5, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', boxShadow: '0 0 8px #14b8a6' }} />
      </div>
      <div style={{ width: s, height: s, borderRadius: '50%', position: 'relative', zIndex: 2, background: `radial-gradient(circle at 38% 32%, #a5f3fc, #0891b2 40%, #0c1a3a 75%)`, boxShadow: `0 0 ${s * 0.4}px rgba(6,182,212,0.6), 0 0 ${s * 0.8}px rgba(6,182,212,0.2)`, animation: 'msCoreBreath 4s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', top: '18%', left: '22%', width: '28%', height: '18%', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(3px)', transform: 'rotate(-30deg)' }} />
      </div>
    </div>
  )
}

function FloatOrb({ size = 20, delay = '0s', color = '#06b6d4' }: { size?: number; delay?: string; color?: string }) {
  return (
    <div className="ms-float-orb" style={{ animationDelay: delay, width: size * 1.8, height: size * 1.8, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: size * 1.8, height: size * 1.8, borderRadius: '50%', border: `1px solid ${color}50`, animation: `msRing1 ${3 + size / 10}s linear infinite` }} />
      <div style={{ width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color}44)`, boxShadow: `0 0 ${size * 0.5}px ${color}66` }} />
    </div>
  )
}

// ── Microsite Card ─────────────────────────────────────────────────────────────
function MicrositeCard({ ms, onCopy, onDelete, onToggle, onSend, copied }: any) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 3
    const y = (-(e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 3
    setTilt({ x, y })
  }

  const heat = ms.views >= 5 ? 'hot' : ms.views >= 2 ? 'warm' : 'cold'
  const heatColor = heat === 'hot' ? '#dc2626' : heat === 'warm' ? '#b45309' : tx2
  const HeatIcon = heat === 'hot' ? Flame : heat === 'warm' ? Thermometer : Snowflake
  const heatLabel = heat === 'hot' ? 'Sıcak' : heat === 'warm' ? 'Ilık' : 'Soğuk'

  const handleSend = async () => {
    setSending(true)
    await onSend(ms)
    setSending(false)
  }

  return (
    <div ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); setConfirmDelete(false) }}
      onMouseMove={handleMouseMove}
      style={{ transition: hovered ? 'transform 0.05s ease' : 'transform 0.3s ease', transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, position: 'relative' }}>
      {/* Holographic border */}
      <div style={{ position: 'absolute', inset: -1.5, borderRadius: 18, zIndex: 0, background: hovered ? 'linear-gradient(135deg,#06b6d4,#8b5cf6,#14b8a6,#3b82f6,#06b6d4)' : `linear-gradient(135deg,${heatColor}33,#8b5cf633)`, backgroundSize: '300% 300%', animation: hovered ? 'msBorder 2s linear infinite' : 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, ...card, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg,rgba(13,148,136,0.1),rgba(124,58,237,0.1))', border: '1px solid #cffafe', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 0 20px rgba(6,182,212,0.18)' : 'none', transition: 'box-shadow 0.3s' }}>
            {hovered ? <QuantumOrb size={32} /> : <Globe size={22} style={{ color: accentTeal }} />}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ color: tx1, fontWeight: 700, fontSize: 15, margin: 0 }}>{ms.leads?.company_name}</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: heatColor, background: `${heatColor}14`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${heatColor}33` }}><HeatIcon size={11} /> {heatLabel}</span>
              {!ms.active && <span style={{ fontSize: 10, color: tx2, background: surf, padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>Pasif</span>}
            </div>
            <p style={{ color: tx2, fontSize: 13, margin: '0 0 6px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.headline}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: tx2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={11} /> {ms.views} görüntüleme</span>
              {ms.leads?.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {ms.leads.city}</span>}
              <span>{new Date(ms.created_at).toLocaleDateString()}</span>
              <span style={{ color: tx3, fontFamily: 'monospace', fontSize: 11 }}>/{ms.slug.slice(0, 20)}{ms.slug.length > 20 ? '…' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={CATALOG_BASE + ms.slug} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e2e8f0', background: surf, color: tx2, fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>
              <ExternalLink size={12} /> Önizle
            </a>
            <button onClick={() => onCopy(CATALOG_BASE + ms.slug, ms.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied === ms.id ? 'rgba(5,150,105,0.12)' : 'rgba(13,148,136,0.1)', color: copied === ms.id ? accentEmerald : accentTeal, fontSize: 12 }}>
              {copied === ms.id ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied === ms.id ? 'Kopyalandı' : 'Link Kopyala'}
            </button>
            <button onClick={handleSend} disabled={sending || !ms.leads?.phone}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: !ms.leads?.phone ? 'not-allowed' : 'pointer', background: 'rgba(5,150,105,0.1)', color: accentEmerald, fontSize: 12, opacity: !ms.leads?.phone ? 0.4 : 1 }}>
              {sending ? <RefreshCw size={12} style={{ animation: 'msSpin 1s linear infinite' }} /> : <Send size={12} />}
              WA Gönder
            </button>
            <button onClick={() => onToggle(ms.id, ms.active)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: ms.active ? 'rgba(5,150,105,0.1)' : '#f1f5f9', color: ms.active ? accentEmerald : tx2, fontSize: 12 }}>
              {ms.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {ms.active ? 'Aktif' : 'Pasif'}
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                <Trash2 size={13} />
              </button>
            ) : (
              <button onClick={() => onDelete(ms.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.18)', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
                Sil?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QR Scanner Frame 3D Animation (QR) ────────────────────────────────────────
function QRScanFrame({ size = 120 }: { size?: number }) {
  const s = size
  const cell = s / 9
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

type PageSummary = {
  id: string
  slug: string
  locale: string
  is_published: boolean
  hero_headline: string
  updated_at: string
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DigitalToolsPage() {
  const { t } = useI18n()

  // ── Top-level tab state
  const [tab, setTab] = useState<'ar' | 'microsites' | 'qr' | 'markets'>('ar')
  const [arLoaded, setArLoaded] = useState(false)
  const [msLoaded, setMsLoaded] = useState(false)
  const [qrLoaded, setQrLoaded] = useState(false)
  const [mkLoaded, setMkLoaded] = useState(false)

  // ══ AR state ════════════════════════════════════════════════════════════════
  const [arModels, setArModels] = useState<any[]>([])
  const [arLeads, setArLeads] = useState<any[]>([])
  const [arStats, setArStats] = useState<any>(null)
  const [arLoading, setArLoading] = useState(true)
  const [arUploading, setArUploading] = useState(false)
  const [arSending, setArSending] = useState<string | null>(null)
  const [arSelectedLead, setArSelectedLead] = useState('')
  const [arSelectedLeads, setArSelectedLeads] = useState<string[]>([])
  const [arExpandedAnalytics, setArExpandedAnalytics] = useState<string | null>(null)
  const [arAnalytics, setArAnalytics] = useState<Record<string, any>>({})
  const [arMsg, setArMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [arShowQR, setArShowQR] = useState<string | null>(null)
  const [arTab, setArTab] = useState<'upload' | 'models'>('models')
  const [arIsDragging, setArIsDragging] = useState(false)
  const [arProductName, setArProductName] = useState('')
  const [arDescription, setArDescription] = useState('')
  const [arCategory, setArCategory] = useState('furniture')
  const arFileRef = useRef<HTMLInputElement>(null)

  // ── AR AI generation state
  const [arUploadMode, setArUploadMode] = useState<'file' | 'ai'>('file')
  const [arAiPhotos, setArAiPhotos] = useState<(File | null)[]>(Array(6).fill(null))
  const [arAiPreviews, setArAiPreviews] = useState<(string | null)[]>(Array(6).fill(null))
  const [arAiScreen, setArAiScreen] = useState<'upload' | 'generating' | 'preview'>('upload')
  const [arAiTaskId, setArAiTaskId] = useState<string | null>(null)
  const [arAiProgress, setArAiProgress] = useState(0)
  const [arAiTripoStatus, setArAiTripoStatus] = useState<string>('queued')
  const [arAiModelUrl, setArAiModelUrl] = useState<string | null>(null)
  const [arAiSaving, setArAiSaving] = useState(false)
  const [arMvLoaded, setArMvLoaded] = useState(false)
  const [arDotCount, setArDotCount] = useState(0)
  const arSlotRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])

  // ══ Microsites state ════════════════════════════════════════════════════════
  const [msMicrosites, setMsMicrosites] = useState<any[]>([])
  const [msStats, setMsStats] = useState<any>(null)
  const [msLeads, setMsLeads] = useState<any[]>([])
  const [msLoading, setMsLoading] = useState(true)
  const [msCreating, setMsCreating] = useState(false)
  const [msShowCreate, setMsShowCreate] = useState(false)
  const [msCopied, setMsCopied] = useState<string | null>(null)
  const [msForm, setMsForm] = useState({ leadId: '', customMessage: '' })
  const [msCatalogItems, setMsCatalogItems] = useState<{ emoji: string; name: string; price: string; desc: string }[]>([])
  const EMOJIS = ['📦','🛋️','💡','📱','🍳','🌿','🖥️','⚽','🚗','💊','🎨','🏗️','🧸','👗','💎','🔧','🪟','🛏️']
  const [msMsg, setMsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [msDotCount, setMsDotCount] = useState(0)
  const [msCreatingStage, setMsCreatingStage] = useState(0)

  // ══ QR state ════════════════════════════════════════════════════════════════
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [qrStats, setQrStats] = useState<any>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrType, setQrType] = useState('url')
  const [qrInput, setQrInput] = useState('')
  const [qrExtra, setQrExtra] = useState('')
  const [qrLabel, setQrLabel] = useState('')
  const [qrColor, setQrColor] = useState('06b6d4')
  const [qrCreating, setQrCreating] = useState(false)
  const [qrMsg, setQrMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [qrFilter, setQrFilter] = useState('')

  // ══ Markets state ═══════════════════════════════════════════════════════════
  const [mkPages, setMkPages] = useState<PageSummary[]>([])
  const [mkLoading, setMkLoading] = useState(true)
  const [mkCreating, setMkCreating] = useState(false)

  // ══ AR handlers ═════════════════════════════════════════════════════════════
  const arShowMsg = (type: 'success' | 'error', text: string) => {
    setArMsg({ type, text }); setTimeout(() => setArMsg(null), 6000)
  }

  const arLoad = async () => {
    setArLoading(true)
    try {
      const [m, l, s] = await Promise.allSettled([
        api.get('/api/ar/models'),
        api.get('/api/leads/with-phone'),
        api.get('/api/ar/stats'),
      ])
      if (m.status === 'fulfilled') setArModels(m.value.models || [])
      if (l.status === 'fulfilled') setArLeads(l.value.leads || [])
      if (s.status === 'fulfilled') setArStats(s.value)
    } catch {}
    finally { setArLoading(false) }
  }

  const arUploadModel = async (file: File) => {
    if (!arProductName) { arShowMsg('error', 'Ürün adı zorunlu'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'gltf') { arShowMsg('error', '.gltf desteklenmiyor — .glb formatına dönüştürün.'); return }
    setArUploading(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('model', file)
      formData.append('productName', arProductName)
      formData.append('description', arDescription)
      formData.append('category', arCategory)
      const response = await fetch(`${API_URL}/api/ar/upload-model`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      arShowMsg('success', data.message)
      setArProductName(''); setArDescription('')
      setArTab('models')
      arLoad()
    } catch (e: any) { arShowMsg('error', e.message) }
    finally { setArUploading(false) }
  }

  const arSendAR = async (modelId: string, batch = false) => {
    if (!batch && !arSelectedLead) { arShowMsg('error', 'Lead seçin'); return }
    if (batch && !arSelectedLeads.length) { arShowMsg('error', 'Lead seçin'); return }
    setArSending(modelId)
    try {
      const data = await api.post(batch ? `/api/ar/send-batch/${modelId}` : `/api/ar/send/${modelId}`, batch ? { leadIds: arSelectedLeads } : { leadId: arSelectedLead })
      arShowMsg('success', data.message)
      arLoad()
    } catch (e: any) { arShowMsg('error', e.message) }
    finally { setArSending(null) }
  }

  const arLoadAnalytics = async (modelId: string) => {
    if (arExpandedAnalytics === modelId) { setArExpandedAnalytics(null); return }
    try {
      const data = await api.get(`/api/ar/analytics/${modelId}`)
      setArAnalytics(prev => ({ ...prev, [modelId]: data }))
      setArExpandedAnalytics(modelId)
    } catch {}
  }

  const arDeleteModel = async (id: string) => {
    if (!confirm('Modeli silmek istediğinizden emin misiniz?')) return
    try { await api.delete(`/api/ar/models/${id}`); arShowMsg('success', 'Model silindi'); arLoad() }
    catch (e: any) { arShowMsg('error', e.message) }
  }

  // ── AR AI helpers
  const arAddAiPhoto = (index: number, file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      arShowMsg('error', 'Desteklenmeyen format. JPG, PNG veya WebP kullanın.'); return
    }
    const reader = new FileReader()
    reader.onload = e => setArAiPreviews(prev => { const n = [...prev]; n[index] = e.target?.result as string; return n })
    reader.readAsDataURL(file)
    setArAiPhotos(prev => { const n = [...prev]; n[index] = file; return n })
  }

  const arRemoveAiPhoto = (index: number) => {
    setArAiPhotos(prev => { const n = [...prev]; n[index] = null; return n })
    setArAiPreviews(prev => { const n = [...prev]; n[index] = null; return n })
  }

  const arStartGeneration = async () => {
    const files = arAiPhotos.filter(Boolean) as File[]
    if (!files.length) { arShowMsg('error', 'En az 1 fotoğraf ekleyin'); return }
    if (!arProductName) { arShowMsg('error', 'Ürün adı zorunlu'); return }
    setArAiScreen('generating')
    setArAiProgress(0)
    setArAiTripoStatus('queued')
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      files.forEach((f, i) => formData.append(`image_${i}`, f))
      formData.append('productName', arProductName)
      formData.append('category', arCategory)
      formData.append('description', arDescription)
      const res = await fetch(`${API_URL}/api/ar/generate-3d`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setArAiTaskId(data.taskId)
    } catch (e: any) {
      arShowMsg('error', e.message)
      setArAiScreen('upload')
    }
  }

  const arSaveGenerated = async () => {
    if (!arAiModelUrl) return
    setArAiSaving(true)
    try {
      const data = await api.post('/api/ar/save-generated', { tripoModelUrl: arAiModelUrl, productName: arProductName, category: arCategory, description: arDescription })
      arShowMsg('success', data.message)
      setArAiScreen('upload'); setArAiTaskId(null); setArAiModelUrl(null)
      setArAiPhotos(Array(6).fill(null)); setArAiPreviews(Array(6).fill(null))
      setArProductName(''); setArDescription('')
      setArTab('models'); arLoad()
    } catch (e: any) { arShowMsg('error', e.message) }
    finally { setArAiSaving(false) }
  }

  // ══ Microsites handlers ═════════════════════════════════════════════════════
  const msShowMsg = (type: 'success' | 'error', text: string) => {
    setMsMsg({ type, text }); setTimeout(() => setMsMsg(null), 6000)
  }

  const msLoad = async () => {
    setMsLoading(true)
    try {
      const [m, s, l] = await Promise.allSettled([
        api.get('/api/microsite/list'),
        api.get('/api/microsite/stats'),
        api.get('/api/leads?limit=200'),
      ])
      if (m.status === 'fulfilled') setMsMicrosites(m.value.microsites || [])
      if (s.status === 'fulfilled') setMsStats(s.value)
      if (l.status === 'fulfilled') setMsLeads(l.value.leads || [])
    } catch {} finally { setMsLoading(false) }
  }

  const msCreate = async () => {
    if (!msForm.leadId) return
    setMsCreating(true)
    try {
      const data = await api.post('/api/microsite/create', { ...msForm, catalogItems: msCatalogItems })
      msShowMsg('success', `Katalog oluşturuldu! Link: ${data.url}`)
      setMsShowCreate(false)
      setMsForm({ leadId: '', customMessage: '' })
      setMsCatalogItems([])
      msLoad()
    } catch (e: any) { msShowMsg('error', e.message) }
    finally { setMsCreating(false) }
  }

  const msCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setMsCopied(id)
    setTimeout(() => setMsCopied(null), 2500)
  }

  const msDeleteMs = async (id: string) => {
    try {
      await api.delete(`/api/microsite/${id}`)
      msShowMsg('success', 'Katalog silindi')
      setMsMicrosites(prev => prev.filter(m => m.id !== id))
      msLoad()
    } catch (e: any) { msShowMsg('error', e.message) }
  }

  const msToggleMs = async (id: string, current: boolean) => {
    try {
      await api.patch(`/api/microsite/${id}/toggle`, {})
      setMsMicrosites(prev => prev.map(m => m.id === id ? { ...m, active: !current } : m))
    } catch (e: any) { msShowMsg('error', e.message) }
  }

  const msSendWhatsApp = async (ms: any) => {
    try {
      const phone = ms.leads?.phone
      if (!phone) return msShowMsg('error', 'Lead telefon numarası yok')
      const url = `${CATALOG_BASE}${ms.slug}`
      const message = `Merhaba ${ms.leads?.contact_name || ms.leads?.company_name}! 🌟\n\nSizin için özel bir katalog sayfası hazırladık:\n${url}\n\nÜrünlerimizi incelemenizi rica ederiz.`
      await api.post('/api/whatsapp/send', { phone, message })
      msShowMsg('success', `WhatsApp gönderildi: ${phone}`)
    } catch (e: any) { msShowMsg('error', e.message) }
  }

  // ══ QR handlers ═════════════════════════════════════════════════════════════
  const qrShowMsg = (type: 'success' | 'error', text: string) => {
    setQrMsg({ type, text }); setTimeout(() => setQrMsg(null), 6000)
  }

  const qrLoad = async () => {
    setQrLoading(true)
    const [q, s] = await Promise.allSettled([api.get('/api/qr/list'), api.get('/api/qr/stats')])
    if (q.status === 'fulfilled') setQrCodes(q.value.qrCodes || [])
    if (s.status === 'fulfilled') setQrStats(s.value)
    setQrLoading(false)
  }

  const qrFinalUrl   = buildQRUrl(qrType, qrInput, qrExtra)
  const qrPreviewSrc = buildPreviewSrc(qrFinalUrl, qrColor)
  const qrTypeConf   = QR_TYPES.find(qt => qt.key === qrType)!

  const qrCreate = async () => {
    if (!qrInput) return
    setQrCreating(true)
    try {
      const res = await api.post('/api/qr/generate', { url: qrFinalUrl, label: qrLabel || qrInput, type: qrType, color: qrColor })
      if (!res?.qr) throw new Error(res?.error || 'QR kaydedilemedi')
      qrShowMsg('success', 'QR kod oluşturuldu!')
      setQrInput(''); setQrLabel(''); setQrExtra('')
      qrLoad()
    } catch (e: any) { qrShowMsg('error', e.message) }
    finally { setQrCreating(false) }
  }

  const qrDeleteQR = async (id: string) => {
    try {
      await api.delete(`/api/qr/${id}`)
      setQrCodes(prev => prev.filter(q => q.id !== id))
      qrShowMsg('success', 'QR silindi')
    } catch (e: any) { qrShowMsg('error', e.message) }
  }

  const qrFiltered = qrFilter ? qrCodes.filter(q => q.type === qrFilter) : qrCodes

  // ══ Markets handlers ════════════════════════════════════════════════════════
  const mkLoad = async () => {
    try {
      const data = await api.get('/api/market-pages')
      setMkPages(data.pages || [])
    } catch {
      setMkPages([])
    } finally {
      setMkLoading(false)
    }
  }

  const mkCreatePage = async (slug: string) => {
    if (mkCreating) return
    setMkCreating(true)
    try {
      const market = MARKET_SLUGS[slug]
      await api.post('/api/market-pages', { slug, locale: market.locale })
      mkLoad()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setMkCreating(false)
    }
  }

  const mkDeletePage = async (slug: string) => {
    if (!confirm(`/${slug} pazar sayfasını silmek istediğinize emin misiniz?`)) return
    try {
      await api.delete(`/api/market-pages/${slug}`)
      mkLoad()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const mkExistingSlugs = new Set(mkPages.map(p => p.slug))
  const mkAvailableMarkets = Object.entries(MARKET_SLUGS).filter(([slug]) => !mkExistingSlugs.has(slug))

  // ── Lazy-load: each tab's data fires only on first switch to it
  useEffect(() => { if (tab === 'ar' && !arLoaded) { setArLoaded(true); arLoad() } }, [tab, arLoaded])
  useEffect(() => { if (tab === 'microsites' && !msLoaded) { setMsLoaded(true); msLoad() } }, [tab, msLoaded])
  useEffect(() => { if (tab === 'qr' && !qrLoaded) { setQrLoaded(true); qrLoad() } }, [tab, qrLoaded])
  useEffect(() => { if (tab === 'markets' && !mkLoaded) { setMkLoaded(true); mkLoad() } }, [tab, mkLoaded])

  // Animate dots while AR AI generation in progress
  useEffect(() => {
    if (arAiScreen !== 'generating') return
    const t = setInterval(() => setArDotCount(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [arAiScreen])

  // Poll Tripo3D task status every 3s
  useEffect(() => {
    if (!arAiTaskId || arAiScreen !== 'generating') return
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/api/ar/generate-3d/status/${arAiTaskId}`)
        setArAiProgress(data.progress || 0)
        setArAiTripoStatus(data.status)
        if (data.status === 'success' && data.modelUrl) {
          setArAiModelUrl(data.modelUrl)
          setArAiScreen('preview')
          clearInterval(interval)
          if (!document.querySelector('script[src*="model-viewer"]')) {
            const s = document.createElement('script')
            s.type = 'module'
            s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
            s.onload = () => setArMvLoaded(true)
            document.head.appendChild(s)
          } else {
            setArMvLoaded(true)
          }
        } else if (data.status === 'failed') {
          arShowMsg('error', 'AI modeli oluşturulamadı. Fotoğrafları kontrol edip tekrar deneyin.')
          setArAiScreen('upload')
          clearInterval(interval)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [arAiTaskId, arAiScreen])

  // Dots animation during MS creation
  useEffect(() => {
    if (!msCreating) return
    const t = setInterval(() => setMsDotCount(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [msCreating])

  // Stage animation during MS creation
  useEffect(() => {
    if (!msCreating) { setMsCreatingStage(0); return }
    const stages = [0, 1, 2, 3]
    let idx = 0
    const t = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1)
      setMsCreatingStage(idx)
    }, 2000)
    return () => clearInterval(t)
  }, [msCreating])

  // ══ AR consts ═══════════════════════════════════════════════════════════════
  const CATEGORIES = [
    { value: 'furniture',    label: 'Mobilya' },
    { value: 'decoration',   label: 'Dekorasyon' },
    { value: 'lighting',     label: t('Aydınlatma','Aydınlatma') },
    { value: 'electronics',  label: 'Elektronik' },
    { value: 'kitchen',      label: 'Mutfak & Ev Aletleri' },
    { value: 'garden',       label: t('Bahçe & Dış Mekan','Bahçe & Dış Mekan') },
    { value: 'office',       label: t('Ofis & İş','Ofis & İş') },
    { value: 'sports',       label: 'Spor & Outdoor' },
    { value: 'automotive',   label: 'Otomotiv' },
    { value: 'health',       label: t('Sağlık & Güzellik','Sağlık & Güzellik') },
    { value: 'art',          label: 'Sanat & Koleksiyon' },
    { value: 'construction', label: t('Yapı & İnşaat','Yapı & İnşaat') },
    { value: 'toy',          label: 'Oyun & Hobi' },
    { value: 'clothing',     label: 'Giyim & Aksesuar' },
    { value: 'product',      label: t('Genel Ürün','Genel Ürün') },
    { value: 'industrial',   label: t('Endüstriyel','Endüstriyel') },
  ]

  const AR_STAT_CONFIG = [
    { label: '3D Model', key: 'totalModels', color: '#db2777', glow: 'rgba(236,72,153,0.18)', Icon: Package },
    { label: t('Görüntüleme','Görüntüleme'), key: 'totalViews', color: '#2563eb', glow: 'rgba(37,99,235,0.18)', Icon: Eye },
    { label: t('Gönderildi','Gönderildi'), key: 'totalSent', color: accentEmerald, glow: 'rgba(5,150,105,0.18)', Icon: Send },
    { label: 'AR Oturumu', key: 'totalARSessions', color: '#7c3aed', glow: 'rgba(124,58,237,0.18)', Icon: Home },
  ]

  // Progress stages mapped to Tripo3D progress values
  const AI_STAGES = [
    { label: t('Fotoğraflar yükleniyor','Fotoğraflar yükleniyor'), Icon: Upload, from: 0,  to: 10  },
    { label: 'AI analiz ediyor',       Icon: Search, from: 10, to: 40  },
    { label: t('3D mesh oluşturuluyor','3D mesh oluşturuluyor'),  Icon: Hammer, from: 40, to: 75  },
    { label: 'Texture & renk ekleniyor', Icon: Palette, from: 75, to: 100 },
  ]

  // ══ Microsites consts ═══════════════════════════════════════════════════════
  const CREATION_STAGES = [
    { Icon: Bot, label: 'AI içerik analiz ediyor' },
    { Icon: PenLine, label: 'Kişisel başlık yazılıyor' },
    { Icon: Palette, label: 'Sayfa tasarlanıyor' },
    { Icon: Link2, label: 'Link oluşturuluyor' },
  ]

  const MS_STAT_CONFIG = [
    { label: t('Toplam Katalog','Toplam Katalog'), key: 'total',      color: accentTeal, glow: 'rgba(13,148,136,0.18)',   Icon: Globe },
    { label: t('Aktif','Aktif'),                   key: 'active',     color: accentEmerald, glow: 'rgba(5,150,105,0.18)',  Icon: CheckCircle },
    { label: t('Toplam Görüntüleme','Toplam Görüntüleme'), key: 'totalViews', color: '#7c3aed', glow: 'rgba(124,58,237,0.18)', Icon: Eye },
    { label: t('Sıcak Lead','Sıcak Lead'),         key: 'hotLeads',   color: '#dc2626', glow: 'rgba(220,38,38,0.18)',   Icon: Flame },
  ]

  // ══ QR consts ═══════════════════════════════════════════════════════════════
  const QR_STAT_CONFIG = [
    { label: 'Toplam QR',   value: qrStats?.total || 0,      color: accentTeal, Icon: Grid3x3 },
    { label: 'Toplam Scan', value: qrStats?.totalScans || 0, color: accentEmerald, Icon: Camera },
    { label: t('En Çok Tip','En Çok Tip'),  value: qrStats?.topType || '-',  color: '#7c3aed', Icon: Trophy },
    { label: t('Aktif Tür','Aktif Tür'),   value: [...new Set(qrCodes.map(q => q.type))].length || 0, color: '#b45309', Icon: Target },
  ]

  return (
    <div style={{ padding: 0 }}>

      {/* ── TOP-LEVEL TAB BAR ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: surf, padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 24, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        {[
          { id: 'ar', label: t('digital_tools.tab_ar', 'AR Deneyimi'), Icon: Box },
          { id: 'microsites', label: t('digital_tools.tab_microsites', 'Mikrositeler'), Icon: LayoutTemplate },
          { id: 'qr', label: t('digital_tools.tab_qr', 'QR Kodlar'), Icon: QrCode },
          { id: 'markets', label: t('digital_tools.tab_markets', 'Pazar Sayfaları'), Icon: Globe2 },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: tab === tb.id ? '#ffffff' : 'transparent', color: tab === tb.id ? accentTeal : tx2, boxShadow: tab === tb.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            <tb.Icon size={14} />
            {tb.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          AR DENEYİMİ TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'ar' && (<>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#fdf2f8 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #fce7f3' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(236,72,153,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, background: 'radial-gradient(circle,rgba(236,72,153,0.12) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 80, zIndex: 1, opacity: 0.6 }}><FloatCube size={18} delay="0s" color="#ec4899" /></div>
        <div style={{ position: 'absolute', top: 50, right: 140, zIndex: 1, opacity: 0.5 }}><FloatCube size={12} delay="0.8s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', bottom: 20, right: 60, zIndex: 1, opacity: 0.5 }}><FloatCube size={16} delay="1.6s" color="#3b82f6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <Cube3D size={64} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: tx1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{t('ar_experience.ar_urun_deneyimi', 'AR Ürün Deneyimi')}</h1>
              <span style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>3D • AR</span>
            </div>
            <p style={{ color: tx2, fontSize: 14, margin: 0, maxWidth: 480 }}>{t('ar_experience.3d_modellerinizi_musterin', '3D modellerinizi müşterinin mekanında gösterin — artırılmış gerçeklik ile satışı kapatın')}</p>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { Icon: Package, title: t('3D Model Yükle','3D Model Yükle'), desc: '.glb / .usdz / AI ile', color: '#db2777' },
            { Icon: Globe, title: 'AR Link + QR', desc: t('Otomatik oluşur','Otomatik oluşur'), color: '#7c3aed' },
            { Icon: Smartphone, title: 'WhatsApp\'tan İlet', desc: t('1 tıkla gönder','1 tıkla gönder'), color: '#2563eb' },
            { Icon: Home, title: t('Müşteri AR Görür','Müşteri AR Görür'), desc: t('Odada gerçek boyut','Odada gerçek boyut'), color: accentEmerald },
          ].map(({ Icon, title, desc, color }, idx) => (
            <div key={title} style={{ background: surf, borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative' }}>
              {idx < 3 && <ChevronRight size={14} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', color: tx3, zIndex: 3 }} />}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon size={24} style={{ color }} /></div>
              <p style={{ color: tx1, fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>{title}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {arMsg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: arMsg.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${arMsg.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: arMsg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {arMsg.text}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      {arStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {AR_STAT_CONFIG.map(({ label, key, color, glow, Icon }) => (
            <div key={key} style={{ ...card, border: `1px solid ${color}33`, padding: '20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: `radial-gradient(circle,${glow} 0%,transparent 70%)` }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Icon size={22} style={{ color }} /></div>
              <p style={{ color, fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1 }}>{arStats[key]}</p>
              <p style={{ color: tx2, fontSize: 12, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AR SUB-TABS ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: surf, padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20, border: '1px solid #e2e8f0' }}>
        {[{ id: 'models', label: `Modellerim (${arModels.length})`, Icon: Target }, { id: 'upload', label: t('Model Yükle','Model Yükle'), Icon: Plus }].map(tb => (
          <button key={tb.id} onClick={() => setArTab(tb.id as any)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: arTab === tb.id ? 'linear-gradient(135deg,#be185d,#7c3aed)' : 'transparent', color: arTab === tb.id ? '#fff' : tx2, boxShadow: arTab === tb.id ? '0 4px 16px rgba(190,24,93,0.3)' : 'none' }}>
            <tb.Icon size={14} />
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── UPLOAD TAB ────────────────────────────────────────────────────── */}
      {arTab === 'upload' && (
        <div>
          {/* Sub-tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: surf, padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20, border: '1px solid #e2e8f0' }}>
            {[
              { id: 'file', label: t('Dosya Yükle','Dosya Yükle'), sub: '.glb / .usdz', Icon: Folder },
              { id: 'ai',   label: t('AI ile Oluştur','AI ile Oluştur'), sub: t('Fotoğraftan 3D','Fotoğraftan 3D'), Icon: Sparkles },
            ].map(m => (
              <button key={m.id} onClick={() => setArUploadMode(m.id as any)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, lineHeight: 1.4, transition: 'all 0.2s', background: arUploadMode === m.id ? (m.id === 'ai' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'linear-gradient(135deg,#be185d,#7c3aed)') : 'transparent', color: arUploadMode === m.id ? '#fff' : tx2, boxShadow: arUploadMode === m.id ? '0 4px 16px rgba(124,58,237,0.3)' : 'none' }}>
                <m.Icon size={15} />
                <span>{m.label}<br /><span style={{ fontSize: 10, opacity: 0.7 }}>{m.sub}</span></span>
              </button>
            ))}
          </div>

          {/* ── FILE UPLOAD (existing) ── */}
          {arUploadMode === 'file' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ ...card, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Sparkles size={18} style={{ color: '#db2777' }} />
                  <h2 style={{ color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{t('ar_experience.3d_model_yukle', '3D Model Yükle')}</h2>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>{t('ar_experience.urun_adi', 'Ürün Adı *')}</label>
                  <input value={arProductName} onChange={e => setArProductName(e.target.value)} placeholder={t('ar_experience.orn_modern_koltuk_takimi', 'örn: Modern Koltuk Takımı')}
                    style={{ ...inp, width: '100%', fontSize: 14 }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>Kategori</label>
                  <div style={{ position: 'relative' }}>
                    <select value={arCategory} onChange={e => setArCategory(e.target.value)}
                      style={{ ...inp, width: '100%', appearance: 'none', cursor: 'pointer' }}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: tx2, pointerEvents: 'none' }}>▾</span>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>{t('ar_experience.aciklama_opsiyonel', 'Açıklama (opsiyonel)')}</label>
                  <input value={arDescription} onChange={e => setArDescription(e.target.value)} placeholder={t('ar_experience.urun_aciklamasi', 'Ürün açıklaması...')}
                    style={{ ...inp, width: '100%', fontSize: 14 }} />
                </div>
                <div onDragOver={e => { e.preventDefault(); setArIsDragging(true) }} onDragLeave={() => setArIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setArIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) arUploadModel(f) }}
                  style={{ border: `2px dashed ${arIsDragging ? '#ec4899' : 'rgba(236,72,153,0.35)'}`, borderRadius: 14, padding: '24px 20px', textAlign: 'center', background: arIsDragging ? 'rgba(236,72,153,0.08)' : 'rgba(236,72,153,0.03)' }}>
                  <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                    {arUploading ? <RefreshCw size={32} style={{ color: '#ec4899', animation: 'spin 1s linear infinite' }} /> : <div className="upload-float"><FloatCube size={36} color="#ec4899" /></div>}
                  </div>
                  <p style={{ color: tx1, fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{arUploading ? 'Yükleniyor...' : arIsDragging ? 'Bırakın!' : '.glb veya .usdz dosyasını buraya sürükleyin'}</p>
                  <p style={{ color: tx2, fontSize: 12, margin: 0 }}>Maksimum 50MB</p>
                </div>
                <button onClick={() => !arUploading && arFileRef.current?.click()} disabled={arUploading}
                  style={{ width: '100%', marginTop: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.35)', cursor: arUploading ? 'not-allowed' : 'pointer', background: 'rgba(236,72,153,0.08)', color: '#db2777', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
                  <Upload size={14} /> Bilgisayardan Seç
                </button>
                <input ref={arFileRef} type="file" accept=".glb,.usdz" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && arUploadModel(e.target.files[0])} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ ...card, padding: 20 }}>
                  <h3 style={{ color: tx1, fontSize: 14, fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={14} style={{ color: '#2563eb' }} /> Desteklenen Formatlar</h3>
                  {[{ ext: '.glb', desc: t('Android + Web AR (önerilen)','Android + Web AR (önerilen)'), color: accentEmerald }, { ext: '.usdz', desc: 'iOS/iPhone AR', color: '#2563eb' }].map(({ ext, desc, color }) => (
                    <div key={ext} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color, fontSize: 13, background: `${color}18`, padding: '3px 10px', borderRadius: 6 }}>{ext}</span>
                      <span style={{ color: tx2, fontSize: 13 }}>{desc}</span>
                    </div>
                  ))}
                  <div style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ color: '#b45309', fontSize: 12, margin: 0 }}>{t('ar_experience.gltf_desteklenmiyor_lutfe', '.gltf desteklenmiyor — lütfen .glb formatını kullanın')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AI GENERATION ── */}
          {arUploadMode === 'ai' && (
            <div>
              {/* UPLOAD GRID */}
              {arAiScreen === 'upload' && (
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
                  <div style={{ ...card, border: '1px solid #ede9fe', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <Sparkles size={18} style={{ color: '#7c3aed' }} />
                      <h2 style={{ color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{t('ar_experience.fotograftan_3d_model_olus', 'Fotoğraftan 3D Model Oluştur')}</h2>
                      <span style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>AI</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 5 }}>{t('ar_experience.urun_adi', 'Ürün Adı *')}</label>
                        <input value={arProductName} onChange={e => setArProductName(e.target.value)} placeholder={t('ar_experience.orn_ahsap_sehpa', 'örn: Ahşap Sehpa')}
                          style={{ ...inp, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 5 }}>Kategori</label>
                        <div style={{ position: 'relative' }}>
                          <select value={arCategory} onChange={e => setArCategory(e.target.value)}
                            style={{ ...inp, width: '100%', appearance: 'none', cursor: 'pointer' }}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: tx2, pointerEvents: 'none' }}>▾</span>
                        </div>
                      </div>
                    </div>

                    <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 10 }}>{t('ar_experience.urun_fotograflari_16_daha', 'Ürün Fotoğrafları (1-6) — daha fazla açı = daha iyi kalite')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                      {[0, 1, 2, 3, 4, 5].map(i => {
                        const isFirst = i === 0
                        const hasPhoto = !!arAiPhotos[i]
                        return (
                          <div key={i}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) arAddAiPhoto(i, f) }}
                            onClick={() => !hasPhoto && arSlotRefs.current[i]?.click()}
                            style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, border: `2px ${hasPhoto ? 'solid' : 'dashed'} ${isFirst ? (hasPhoto ? '#8b5cf6' : 'rgba(139,92,246,0.5)') : (hasPhoto ? 'rgba(139,92,246,0.4)' : '#e2e8f0')}`, background: hasPhoto ? 'transparent' : surf, cursor: hasPhoto ? 'default' : 'pointer', overflow: 'hidden' }}>
                            {hasPhoto ? (
                              <>
                                <img src={arAiPreviews[i]!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button onClick={e => { e.stopPropagation(); arRemoveAiPhoto(i) }}
                                  style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </>
                            ) : (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                {isFirst ? <Camera size={20} style={{ color: '#7c3aed' }} /> : <Plus size={20} style={{ color: tx3 }} />}
                                <span style={{ color: isFirst ? '#7c3aed' : tx3, fontSize: 10, textAlign: 'center', padding: '0 4px' }}>{isFirst ? 'Ön Cephe ★' : `Açı ${i + 1}`}</span>
                              </div>
                            )}
                            <input ref={el => { arSlotRefs.current[i] = el }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                              onChange={e => { const f = e.target.files?.[0]; if (f) arAddAiPhoto(i, f) }} />
                          </div>
                        )
                      })}
                    </div>

                    <button onClick={arStartGeneration} disabled={!arAiPhotos[0] || !arProductName}
                      style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: !arAiPhotos[0] || !arProductName ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 15, fontWeight: 700, opacity: !arAiPhotos[0] || !arProductName ? 0.4 : 1, boxShadow: arAiPhotos[0] && arProductName ? '0 6px 24px rgba(124,58,237,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Sparkles size={18} /> 3D Model Oluştur — AI ile
                    </button>
                    {(!arAiPhotos[0] || !arProductName) && (
                      <p style={{ color: tx2, fontSize: 12, textAlign: 'center', marginTop: 8 }}>{!arProductName ? 'Ürün adı yazın ve ' : ''}ön cephe fotoğrafı ekleyin</p>
                    )}
                  </div>

                  {/* Tips + info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid #ede9fe', borderRadius: 18, padding: 20 }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#7c3aed', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}><Lightbulb size={15} />{t('ar_experience.en_iyi_sonuc_icin', 'En İyi Sonuç İçin')}</h3>
                      {[
                        { Icon: Square, text: t('Beyaz veya açık arka plan kullan','Beyaz veya açık arka plan kullan') },
                        { Icon: Target, text: t('Ürünü ortaya al, kesilme olmasın','Ürünü ortaya al, kesilme olmasın') },
                        { Icon: RotateCw, text: t('Ön, yan, arka — farklı açılardan çek','Ön, yan, arka — farklı açılardan çek') },
                        { Icon: Lightbulb, text: t('İyi aydınlatma, gölge az olsun','İyi aydınlatma, gölge az olsun') },
                        { Icon: Ruler, text: t('Min. 512×512 piksel çözünürlük','Min. 512×512 piksel çözünürlük') },
                        { Icon: Smartphone, text: t('Telefon veya DSLR fotoğraf tamam','Telefon veya DSLR fotoğraf tamam') },
                      ].map(({ Icon, text }) => (
                        <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                          <Icon size={15} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ color: tx2, fontSize: 13, lineHeight: 1.4 }}>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...card, padding: 18 }}>
                      <p style={{ color: tx2, fontSize: 12, margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('ar_experience.beklenen_sure', 'Beklenen Süre')}</p>
                      <p style={{ color: tx1, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>~45 saniye</p>
                      <p style={{ color: tx2, fontSize: 12, margin: 0 }}>{t('ar_experience.1_fotograf_icin_6_fotogra', '1 fotoğraf için • 6 fotoğraf ~90 sn')}</p>
                      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={13} style={{ color: accentEmerald }} />
                        <p style={{ color: accentEmerald, fontSize: 11, margin: 0 }}>{t('ar_experience.cikti_ar_destekli_glb_for', 'Çıktı: AR destekli .glb formatı')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GENERATING SCREEN */}
              {arAiScreen === 'generating' && (
                <div style={{ ...card, border: '1px solid #ede9fe', padding: '48px 32px', textAlign: 'center', minHeight: 360 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}><Cube3D size={72} /></div>
                  <h2 style={{ color: tx1, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{t('ar_experience.ai_3d_model_olusturuyor', 'AI 3D Model Oluşturuyor...')}</h2>
                  <p style={{ color: tx2, fontSize: 14, margin: '0 0 32px' }}>{t('ar_experience.lutfen_bekleyin_yaklasik', 'Lütfen bekleyin — yaklaşık 45-90 saniye')}</p>

                  <div style={{ maxWidth: 480, margin: '0 auto 28px', textAlign: 'left' }}>
                    {AI_STAGES.map(({ label, Icon, from, to }, idx) => {
                      const isDone   = arAiProgress >= to
                      const isActive = arAiProgress >= from && arAiProgress < to
                      return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? 'rgba(5,150,105,0.12)' : isActive ? 'rgba(124,58,237,0.12)' : surf, border: `1px solid ${isDone ? 'rgba(5,150,105,0.4)' : isActive ? 'rgba(124,58,237,0.4)' : '#e2e8f0'}`, animation: isActive ? 'pulse3d 1.5s ease-in-out infinite' : 'none' }}>
                            {isDone ? <CheckCircle size={17} style={{ color: accentEmerald }} /> : <Icon size={16} style={{ color: isActive ? '#7c3aed' : tx3 }} />}
                          </div>
                          <p style={{ color: isDone ? accentEmerald : isActive ? '#7c3aed' : tx3, fontSize: 13, fontWeight: isActive ? 600 : 400, margin: 0 }}>
                            {label}{isActive && <span style={{ color: '#7c3aed' }}>{'.'.repeat(arDotCount)}</span>}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ maxWidth: 480, margin: '0 auto', height: 6, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, transition: 'width 0.5s ease', width: `${Math.max(5, arAiProgress)}%`, background: 'linear-gradient(90deg,#7c3aed,#ec4899)', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }} />
                  </div>
                  <p style={{ color: tx2, fontSize: 12, marginTop: 10 }}>{arAiProgress}% tamamlandı</p>
                </div>
              )}

              {/* PREVIEW SCREEN */}
              {arAiScreen === 'preview' && arAiModelUrl && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ ...card, border: '1px solid rgba(5,150,105,0.25)', overflow: 'hidden', height: 420, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: accentEmerald, fontWeight: 600 }}><CheckCircle size={13} />{t('ar_experience.3d_model_hazir', '3D Model Hazır')}</div>
                    {arMvLoaded ? (
                      // @ts-ignore
                      <model-viewer src={arAiModelUrl} camera-controls auto-rotate auto-rotate-delay="500" rotation-per-second="25deg" shadow-intensity="1" environment-image="neutral" exposure="1.1" style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                        <RefreshCw size={28} style={{ color: tx3, animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: tx2, fontSize: 13 }}>{t('ar_experience.3d_onizleme_yukleniyor', '3D önizleme yükleniyor...')}</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ ...card, border: '1px solid rgba(5,150,105,0.2)', padding: 24 }}>
                      <div style={{ marginBottom: 12 }}><PartyPopper size={32} style={{ color: accentEmerald }} /></div>
                      <h2 style={{ color: tx1, fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{t('ar_experience.3d_model_olusturuldu', '3D Model Oluşturuldu!')}</h2>
                      <p style={{ color: tx2, fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>{t('ar_experience.ai_fotograflarinizdan_yuk', 'AI fotoğraflarınızdan yüksek kaliteli bir 3D model oluşturdu. Önizleyin, beğendiyseniz kaydedin.')}</p>
                      <div style={{ background: surf, borderRadius: 10, padding: '12px 14px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                        <p style={{ color: tx2, fontSize: 12, margin: '0 0 4px' }}>{t('ar_experience.urun_adi', 'Ürün adı')}</p>
                        <p style={{ color: tx1, fontSize: 14, fontWeight: 600, margin: 0 }}>{arProductName || 'AI Oluşturuldu'}</p>
                      </div>
                      <button onClick={arSaveGenerated} disabled={arAiSaving}
                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: arAiSaving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 24px rgba(16,185,129,0.35)', opacity: arAiSaving ? 0.7 : 1 }}>
                        {arAiSaving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
                        {arAiSaving ? 'Kaydediliyor...' : 'Kaydet & AR Linki Oluştur'}
                      </button>
                      <button onClick={() => { setArAiScreen('upload'); setArAiTaskId(null); setArAiModelUrl(null) }}
                        style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', cursor: 'pointer', background: 'transparent', color: tx2, fontSize: 14 }}>
                        Yeniden Oluştur
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODELS TAB ────────────────────────────────────────────────────── */}
      {arTab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <p style={{ color: tx2, fontSize: 12, fontWeight: 600, margin: '0 0 12px', letterSpacing: 1, textTransform: 'uppercase' }}>{t('ar_experience.lead_sec_ar_gonderimi_ici', 'Lead Seç — AR gönderimi için')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>Tek Lead</label>
                <div style={{ position: 'relative' }}>
                  <select value={arSelectedLead} onChange={e => setArSelectedLead(e.target.value)}
                    style={{ ...inp, width: '100%', appearance: 'none', cursor: 'pointer' }}>
                    <option value="">Lead seçin ({arLeads.length} kişi)</option>
                    {arLeads.map(l => <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: tx2, pointerEvents: 'none' }}>▾</span>
                </div>
              </div>
              <div>
                <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>Toplu Seçim ({arSelectedLeads.length} seçili)</label>
                <div style={{ maxHeight: 110, overflowY: 'auto', background: surf, borderRadius: 10, padding: '8px 6px', border: '1px solid #e2e8f0' }}>
                  {arLeads.slice(0, 100).map(l => (
                    <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', borderRadius: 6 }}>
                      <input type="checkbox" checked={arSelectedLeads.includes(l.id)} onChange={e => setArSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))} style={{ accentColor: '#ec4899' }} />
                      <span style={{ color: tx2, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {arLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
              <RefreshCw size={24} style={{ color: tx3, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : arModels.length === 0 ? (
            <div style={{ ...card, padding: 60, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Cube3D size={56} /></div>
              <p style={{ color: tx2, fontSize: 15, margin: '0 0 16px' }}>{t('ar_experience.henuz_3d_model_yok', 'Henüz 3D model yok')}</p>
              <button onClick={() => setArTab('upload')} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#be185d,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 16px rgba(190,24,93,0.3)' }}>
                İlk Modeli Yükle
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {arModels.map(model => (
                <ModelCard key={model.id} model={model} CATEGORIES={CATEGORIES} selectedLead={arSelectedLead} selectedLeads={arSelectedLeads} sending={arSending} onSend={arSendAR} onDelete={arDeleteModel} onQR={(id: string) => setArShowQR(arShowQR === id ? null : id)} showQR={arShowQR} onAnalytics={arLoadAnalytics} expandedAnalytics={arExpandedAnalytics} analyticsData={arAnalytics[model.id]} />
              ))}
            </div>
          )}
        </div>
      )}
      </>)}

      {/* ══════════════════════════════════════════════════════════════════
          MİKROSİTELER TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'microsites' && (<>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#ecfeff 65%,#ffffff)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid #cffafe' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 20, right: 100, zIndex: 1, opacity: 0.6 }}><FloatOrb size={18} delay="0s" color="#06b6d4" /></div>
        <div style={{ position: 'absolute', top: 50, right: 160, zIndex: 1, opacity: 0.5 }}><FloatOrb size={12} delay="1s" color="#8b5cf6" /></div>
        <div style={{ position: 'absolute', bottom: 20, right: 70, zIndex: 1, opacity: 0.5 }}><FloatOrb size={14} delay="2s" color="#14b8a6" /></div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <QuantumOrb size={64} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ color: tx1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{t('microsites.kisisel_katalog_sayfalari', 'Kişisel Katalog Sayfaları')}</h1>
                <span style={{ background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>AI</span>
              </div>
              <p style={{ color: tx2, fontSize: 14, margin: 0, maxWidth: 520 }}>{t('microsites.her_musteri_icin_ai_ile_k', 'Her müşteri için AI ile kişisel katalog sayfası — WhatsApp\'tan link gönder, açtığında haber al')}</p>
            </div>
          </div>
          <button onClick={() => setMsShowCreate(!msShowCreate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 24px rgba(8,145,178,0.3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Plus size={16} /> {t('Yeni Katalog','Yeni Katalog')}
          </button>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { Icon: Bot, title: t('AI İçerik','AI İçerik'), desc: t('Sektöre özel otomatik','Sektöre özel otomatik'), color: accentTeal },
            { Icon: Link2, title: t('Kişisel Link','Kişisel Link'), desc: t('Benzersiz slug oluşur','Benzersiz slug oluşur'), color: '#7c3aed' },
            { Icon: Bell, title: t('Anlık Bildirim','Anlık Bildirim'), desc: t('Lead açınca WA gelir','Lead açınca WA gelir'), color: accentEmerald },
            { Icon: BarChart2, title: t('Engagement Skoru','Engagement Skoru'), desc: t('3+ görüntüleme = sıcak','3+ görüntüleme = sıcak'), color: '#dc2626' },
          ].map(({ Icon, title, desc, color }, idx) => (
            <div key={title} style={{ background: surf, borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center', position: 'relative' }}>
              {idx < 3 && <ChevronRight size={14} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', color: tx3, zIndex: 3 }} />}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon size={24} style={{ color }} /></div>
              <p style={{ color: tx1, fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>{title}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {msMsg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msMsg.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${msMsg.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: msMsg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {msMsg.text}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      {msStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {MS_STAT_CONFIG.map(({ label, key, color, glow, Icon }) => (
            <div key={key} style={{ ...card, border: `1px solid ${color}33`, padding: '20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: `radial-gradient(circle,${glow} 0%,transparent 70%)` }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, position: 'relative' }}><Icon size={22} style={{ color }} /></div>
              <p style={{ color, fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1, position: 'relative' }}>{msStats[key]}</p>
              <p style={{ color: tx2, fontSize: 12, margin: 0, position: 'relative' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE FORM ───────────────────────────────────────────────────── */}
      {msShowCreate && (
        <div style={{ ...card, padding: 28, marginBottom: 24 }}>
          {msCreating ? (
            /* Creating animation */
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><QuantumOrb size={72} /></div>
              <h2 style={{ color: tx1, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>AI Katalog Oluşturuyor{'.'.repeat(msDotCount)}</h2>
              <p style={{ color: tx2, fontSize: 14, margin: '0 0 32px' }}>{t('microsites.musteriye_ozel_icerik_haz', 'Müşteriye özel içerik hazırlanıyor')}</p>
              <div style={{ maxWidth: 400, margin: '0 auto' }}>
                {CREATION_STAGES.map(({ Icon, label }, idx) => {
                  const isDone = idx < msCreatingStage
                  const isActive = idx === msCreatingStage
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? 'rgba(5,150,105,0.12)' : isActive ? 'rgba(6,182,212,0.14)' : surf, border: `1px solid ${isDone ? 'rgba(5,150,105,0.4)' : isActive ? 'rgba(6,182,212,0.4)' : '#e2e8f0'}`, animation: isActive ? 'msPulse 1.5s ease-in-out infinite' : 'none' }}>
                        {isDone ? <CheckCircle size={16} style={{ color: accentEmerald }} /> : <Icon size={16} style={{ color: isActive ? accentTeal : tx3 }} />}
                      </div>
                      <p style={{ color: isDone ? accentEmerald : isActive ? accentTeal : tx3, fontSize: 13, fontWeight: isActive ? 600 : 400, margin: 0 }}>
                        {label}{isActive && <span style={{ color: accentTeal }}>{'.'.repeat(msDotCount)}</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Create form */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <Sparkles size={18} style={{ color: accentTeal }} />
                <h2 style={{ color: tx1, fontSize: 16, fontWeight: 700, margin: 0 }}>{t('microsites.yeni_kisisel_katalog_olus', 'Yeni Kişisel Katalog Oluştur')}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>{t('microsites.musteri', 'Müşteri *')}</label>
                  <div style={{ position: 'relative' }}>
                    <select value={msForm.leadId} onChange={e => setMsForm(p => ({ ...p, leadId: e.target.value }))}
                      style={{ ...inp, width: '100%', border: `1px solid ${msForm.leadId ? '#99f6e4' : '#e2e8f0'}`, color: msForm.leadId ? tx1 : tx3, appearance: 'none', cursor: 'pointer' }}>
                      <option value="">Müşteri seçin ({msLeads.length} kişi)</option>
                      {msLeads.map(l => <option key={l.id} value={l.id}>{l.company_name}{l.city ? ` — ${l.city}` : ''}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: tx3, pointerEvents: 'none' }}>▾</span>
                  </div>
                </div>
                <div>
                  <label style={{ color: tx2, fontSize: 12, display: 'block', marginBottom: 6 }}>{t('microsites.ozel_mesaj_opsiyonel', 'Özel Mesaj (opsiyonel)')}</label>
                  <input value={msForm.customMessage} onChange={e => setMsForm(p => ({ ...p, customMessage: e.target.value }))}
                    placeholder={t('microsites.sizin_icin_ozel_fiyat_haz', 'Sizin için özel fiyat hazırladık...')}
                    style={{ ...inp, width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 10, marginBottom: 20, fontSize: 12, color: tx2 }}>
                <Lightbulb size={14} style={{ color: accentTeal, flexShrink: 0, marginTop: 1 }} />
                <span>AI müşterinin sektörüne ve şehrine göre otomatik kişisel başlık, alt başlık ve içerik oluşturur</span>
              </div>

              {/* ── ÜRÜN KATALOĞU ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ color: tx2, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={14} /> Ürün Kataloğu <span style={{ color: tx3, fontWeight: 400, fontSize: 11 }}>({msCatalogItems.length}/8 ürün)</span>
                  </label>
                  {msCatalogItems.length < 8 && (
                    <button onClick={() => setMsCatalogItems(p => [...p, { emoji: '📦', name: '', price: '', desc: '' }])}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(13,148,136,0.3)', background: 'rgba(13,148,136,0.08)', color: accentTeal, fontSize: 12, cursor: 'pointer' }}>
                      <Plus size={12} /> Ürün Ekle
                    </button>
                  )}
                </div>
                {msCatalogItems.length === 0 && (
                  <div style={{ padding: '20px', background: surf, border: '1px dashed #e2e8f0', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ color: tx2, fontSize: 13, margin: '0 0 10px' }}>{t('microsites.urun_katalogu_opsiyonel_e', 'Ürün kataloğu opsiyonel — eklemezseniz AI içerik oluşturur')}</p>
                    <button onClick={() => setMsCatalogItems([{ emoji: '📦', name: '', price: '', desc: '' }])}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(13,148,136,0.25)', background: 'rgba(13,148,136,0.06)', color: accentTeal, fontSize: 12, cursor: 'pointer' }}>
                      <Plus size={12} /> İlk Ürünü Ekle
                    </button>
                  </div>
                )}
                {msCatalogItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 1fr 32px', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                    {/* Emoji picker */}
                    <div style={{ position: 'relative' }}>
                      <select value={item.emoji} onChange={e => setMsCatalogItems(p => p.map((x, j) => j === i ? { ...x, emoji: e.target.value } : x))}
                        style={{ width: 44, height: 38, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: tx1, fontSize: 18, textAlign: 'center', outline: 'none', cursor: 'pointer', appearance: 'none', padding: '0 4px' }}>
                        {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    {/* Name */}
                    <input value={item.name} onChange={e => setMsCatalogItems(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder={t('microsites.urun_adi', 'Ürün adı *')}
                      style={{ ...inp, padding: '9px 12px', height: 38 }} />
                    {/* Price */}
                    <input value={item.price} onChange={e => setMsCatalogItems(p => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      placeholder="₺ Fiyat"
                      style={{ ...inp, padding: '9px 12px', height: 38 }} />
                    {/* Description */}
                    <input value={item.desc} onChange={e => setMsCatalogItems(p => p.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                      placeholder={t('microsites.kisa_aciklama', 'Kısa açıklama')}
                      style={{ ...inp, padding: '9px 12px', height: 38 }} />
                    {/* Remove */}
                    <button onClick={() => setMsCatalogItems(p => p.filter((_, j) => j !== i))}
                      style={{ width: 32, height: 38, borderRadius: 8, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={msCreate} disabled={!msForm.leadId}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12, border: 'none', cursor: !msForm.leadId ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !msForm.leadId ? 0.4 : 1, boxShadow: msForm.leadId ? '0 6px 20px rgba(8,145,178,0.3)' : 'none' }}>
                  <Zap size={15} /> AI ile Oluştur
                </button>
                <button onClick={() => setMsShowCreate(false)}
                  style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'transparent', color: tx2, fontSize: 14, cursor: 'pointer' }}>
                  İptal
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MICROSITE LIST ────────────────────────────────────────────────── */}
      {msLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
          <RefreshCw size={24} style={{ color: tx2, animation: 'msSpin 1s linear infinite' }} />
        </div>
      ) : msMicrosites.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><QuantumOrb size={56} /></div>
          <p style={{ color: tx2, fontSize: 15, margin: '0 0 20px' }}>{t('microsites.henuz_katalog_sayfasi_yok', 'Henüz katalog sayfası yok')}</p>
          <button onClick={() => setMsShowCreate(true)}
            style={{ padding: '11px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(8,145,178,0.3)' }}>
            İlk Kataloğu Oluştur
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msMicrosites.map(ms => (
            <MicrositeCard key={ms.id} ms={ms} copied={msCopied} onCopy={msCopy} onDelete={msDeleteMs} onToggle={msToggleMs} onSend={msSendWhatsApp} />
          ))}
        </div>
      )}
      </>)}

      {/* ══════════════════════════════════════════════════════════════════
          QR KODLAR TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'qr' && (<>
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
          {QR_STAT_CONFIG.map(({ label, value, color, Icon }) => (
            <div key={label} style={{ background: surf, borderRadius: 12, padding: '14px 12px', border: `1px solid ${color}22`, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon size={20} style={{ color }} /></div>
              <p style={{ color, fontSize: typeof value === 'number' ? 24 : 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {qrMsg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: qrMsg.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${qrMsg.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: qrMsg.type === 'success' ? accentEmerald : '#dc2626' }}>
          {qrMsg.text}
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
              <button key={qt.key} onClick={() => { setQrType(qt.key); setQrInput(''); setQrExtra('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 10, border: `1px solid ${qrType === qt.key ? qt.color : '#e2e8f0'}`, background: qrType === qt.key ? `${qt.color}18` : surf, color: qrType === qt.key ? qt.color : tx2, fontSize: 12, fontWeight: qrType === qt.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                <qt.Icon size={13} /> {qt.label}
              </button>
            ))}
          </div>

          {/* Input fields */}
          <div style={{ display: 'grid', gridTemplateColumns: qrType === 'wifi' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>
                {qrType === 'wifi' ? 'WiFi Ağ Adı (SSID) *' : qrType === 'whatsapp' || qrType === 'phone' ? 'Telefon Numarası *' : qrType === 'email' ? 'E-Posta Adresi *' : 'URL / Link *'}
              </label>
              <input value={qrInput} onChange={e => setQrInput(e.target.value)}
                placeholder={qrTypeConf.placeholder}
                style={{ ...inp, width: '100%', border: `1px solid ${qrInput ? `${qrTypeConf.color}60` : '#e2e8f0'}` }} />
              {qrTypeConf.hint && <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0' }}>{qrTypeConf.hint}</p>}
            </div>
            {qrType === 'wifi' && (
              <div>
                <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>{t('qr_codes.wifi_sifresi', 'WiFi Şifresi')}</label>
                <input value={qrExtra} onChange={e => setQrExtra(e.target.value)} placeholder={t('qr_codes.sifre_bos_birakilabilir', 'Şifre (boş bırakılabilir)')}
                  style={{ ...inp, width: '100%' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 18, alignItems: 'flex-end' }}>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Etiket (opsiyonel)</label>
              <input value={qrLabel} onChange={e => setQrLabel(e.target.value)} placeholder="Ana Sayfa QR, WhatsApp QR..."
                style={{ ...inp, width: '100%' }} />
            </div>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Renk</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {QR_COLORS.map(c => (
                  <button key={c.value} onClick={() => setQrColor(c.value)} title={c.label}
                    style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${qrColor === c.value ? tx1 : 'transparent'}`, background: `#${c.value}`, cursor: 'pointer', transition: 'border 0.15s' }} />
                ))}
              </div>
            </div>
          </div>

          {/* URL preview */}
          {qrFinalUrl && (
            <div style={{ padding: '8px 12px', background: surf, borderRadius: 8, marginBottom: 14, border: '1px solid #e2e8f0' }}>
              <p style={{ color: tx3, fontSize: 10, margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('qr_codes.olusturulacak_link', 'Oluşturulacak link')}</p>
              <p style={{ color: tx2, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qrFinalUrl}</p>
            </div>
          )}

          <button onClick={qrCreate} disabled={qrCreating || !qrInput}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: qrCreating || !qrInput ? 'not-allowed' : 'pointer', background: qrInput ? `linear-gradient(135deg,#0891b2,${qrTypeConf.color === '#0d9488' ? '#7c3aed' : qrTypeConf.color})` : '#e2e8f0', color: '#fff', fontSize: 14, fontWeight: 700, opacity: !qrInput ? 0.5 : 1, boxShadow: qrInput ? `0 6px 20px ${qrTypeConf.color}35` : 'none', transition: 'all 0.2s' }}>
            {qrCreating ? <RefreshCw size={16} style={{ animation: 'qrSpin 1s linear infinite' }} /> : <Grid3x3 size={16} />}
            {qrCreating ? 'Oluşturuluyor...' : 'QR Kod Oluştur'}
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ ...card, border: `1px solid ${qrPreviewSrc ? `${qrTypeConf.color}40` : '#e2e8f0'}`, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s' }}>
          <p style={{ color: tx3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px', textAlign: 'center' }}>{t('qr_codes.canli_onizleme', 'Canlı Önizleme')}</p>
          {qrPreviewSrc ? (
            <>
              <div style={{ width: 160, height: 160, background: '#fff', borderRadius: 14, padding: 8, boxShadow: `0 8px 32px ${qrTypeConf.color}30`, margin: '0 0 12px', border: '1px solid #e2e8f0' }}>
                <img key={qrPreviewSrc} src={qrPreviewSrc} alt="QR" style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6 }} />
              </div>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: qrTypeConf.color, fontSize: 12, fontWeight: 600, margin: 0, textAlign: 'center' }}><qrTypeConf.Icon size={14} /> {qrTypeConf.label}</p>
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
              <button onClick={() => setQrFilter('')} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${!qrFilter ? 'rgba(13,148,136,0.4)' : '#e2e8f0'}`, background: !qrFilter ? 'rgba(13,148,136,0.08)' : 'transparent', color: !qrFilter ? accentTeal : tx2, fontSize: 11, cursor: 'pointer' }}>{t('qr_codes.tumu', 'Tümü')}</button>
              {QR_TYPES.filter(qt => qrCodes.some(q => q.type === qt.key)).map(qt => (
                <button key={qt.key} onClick={() => setQrFilter(qrFilter === qt.key ? '' : qt.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${qrFilter === qt.key ? `${qt.color}50` : '#e2e8f0'}`, background: qrFilter === qt.key ? `${qt.color}15` : 'transparent', color: qrFilter === qt.key ? qt.color : tx2, fontSize: 11, cursor: 'pointer' }}>
                  <qt.Icon size={11} /> {qt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {qrLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', height: 100, alignItems: 'center' }}>
            <RefreshCw size={22} style={{ color: tx2, animation: 'qrSpin 1s linear infinite' }} />
          </div>
        ) : qrFiltered.length === 0 ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
            <QRScanFrame size={72} />
            <p style={{ color: tx2, fontSize: 14, margin: '16px 0 6px' }}>{qrFilter ? 'Bu tipte QR kod yok' : 'Henüz QR kod oluşturmadınız'}</p>
            <p style={{ color: tx3, fontSize: 12, margin: 0 }}>{t('qr_codes.yukaridaki_formdan_ilk_qr', 'Yukarıdaki formdan ilk QR kodunuzu oluşturun')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {qrFiltered.map(qr => (
              <QRCard key={qr.id} qr={qr} onDelete={qrDeleteQR} showMsg={qrShowMsg} />
            ))}
          </div>
        )}
      </div>
      </>)}

      {/* ══════════════════════════════════════════════════════════════════
          PAZAR SAYFALARI TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'markets' && (<>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Globe2 size={20} style={{ color: accentTeal }} />
        </div>
        <div>
          <h1 style={{ color: tx1, fontSize: 22, fontWeight: 800, margin: 0 }}>{t('digital_tools.pazar_sayfalari', 'Pazar Sayfaları')}</h1>
          <p style={{ color: tx2, fontSize: 13, margin: '4px 0 0' }}>{t('digital_tools.pazar_sayfalari_aciklama', 'Her ülke için ayrı pazarlama sayfası oluşturun. Her pazar farklı içerik, fiyat ve videoyla çalışır.')}</p>
        </div>
      </div>

      {/* Active pages */}
      {mkLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="mk-pulse" style={{ background: surf, border: '1px solid #e2e8f0', borderRadius: 14, height: 80 }} />
          ))}
        </div>
      ) : mkPages.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {mkPages.map(p => {
            const market = MARKET_SLUGS[p.slug]
            return (
              <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 20px' }}>
                {/* Market info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                  <span style={{ fontSize: 30, flexShrink: 0 }}>{market?.flag || '🌍'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: tx1, fontWeight: 700, fontSize: 14 }}>{market?.name || p.slug.toUpperCase()}</span>
                      <code style={{ color: tx3, fontSize: 11, background: surf, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>/{p.slug}</code>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.is_published ? 'rgba(5,150,105,0.1)' : surf, color: p.is_published ? accentEmerald : tx3, border: p.is_published ? '1px solid rgba(5,150,105,0.25)' : '1px solid #e2e8f0' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.is_published ? accentEmerald : '#94a3b8' }} />
                        {p.is_published ? 'Yayında' : 'Taslak'}
                      </span>
                    </div>
                    <p style={{ color: tx3, fontSize: 12, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.hero_headline || 'Henüz başlık eklenmedi'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {p.is_published && (
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer"
                      style={{ padding: 9, color: tx2, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', cursor: 'pointer' }}
                      title={`/${p.slug} sayfasını gör`}>
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button onClick={() => mkDeletePage(p.slug)}
                    style={{ padding: 9, color: '#dc2626', borderRadius: 10, border: '1px solid #fecaca', background: 'transparent', cursor: 'pointer', display: 'flex' }}
                    title="Sil">
                    <Trash2 size={15} />
                  </button>
                  <Link href={`/market-pages/${p.slug}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(13,148,136,0.08)', color: accentTeal, fontSize: 13, fontWeight: 700, borderRadius: 10, border: '1px solid rgba(13,148,136,0.2)', textDecoration: 'none' }}>
                    <Edit3 size={14} /> Düzenle
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ ...card, padding: '48px 24px', textAlign: 'center', marginBottom: 28 }}>
          <Globe2 size={36} style={{ color: tx3, margin: '0 auto 16px' }} />
          <h3 style={{ color: tx1, fontWeight: 700, margin: '0 0 8px', fontSize: 15 }}>{t('digital_tools.henuz_pazar_sayfasi_yok', 'Henüz pazar sayfası yok')}</h3>
          <p style={{ color: tx2, fontSize: 13, margin: 0 }}>{t('digital_tools.asagidan_ulke_secerek', 'Aşağıdan bir ülke seçerek ilk pazar sayfanızı oluşturun')}</p>
        </div>
      )}

      {/* Add new market */}
      {mkAvailableMarkets.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: tx3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 16px' }}>
            <Plus size={14} /> {t('digital_tools.yeni_pazar_ekle', 'Yeni Pazar Ekle')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
            {mkAvailableMarkets.map(([slug, market]) => (
              <button key={slug} onClick={() => mkCreatePage(slug)} disabled={mkCreating}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 12px', background: surf, border: '1px solid #e2e8f0', borderRadius: 14, cursor: mkCreating ? 'not-allowed' : 'pointer', opacity: mkCreating ? 0.5 : 1, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 30 }}>{market.flag}</span>
                <span style={{ color: tx1, fontSize: 13, fontWeight: 600 }}>{market.name}</span>
                <code style={{ color: tx3, fontSize: 11, fontFamily: 'monospace' }}>/{slug}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ background: 'rgba(13,148,136,0.04)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 14, padding: 24 }}>
        <h3 style={{ color: accentTeal, fontWeight: 700, margin: '0 0 14px', fontSize: 13 }}>{t('digital_tools.nasil_calisir', 'Nasıl Çalışır?')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, fontSize: 13, color: tx2 }}>
          <div><span style={{ color: tx1, fontWeight: 600, display: 'block', marginBottom: 4 }}>1. {t('digital_tools.pazar_olusturun', 'Pazar Oluşturun')}</span>{t('digital_tools.ulke_secin_hazirlayin', 'Ülke seçin ve sayfanızı hazırlayın')}</div>
          <div><span style={{ color: tx1, fontWeight: 600, display: 'block', marginBottom: 4 }}>2. {t('digital_tools.icerik_ekleyin', 'İçerik Ekleyin')}</span>{t('digital_tools.ulkeye_ozel_icerik', 'O ülkeye özel hero, video, fiyat, referanslar')}</div>
          <div><span style={{ color: tx1, fontWeight: 600, display: 'block', marginBottom: 4 }}>3. {t('digital_tools.yayinlayin', 'Yayınlayın')}</span>{t('digital_tools.linki_paylasin', 'Linki o ülkede paylaşın, her market izole çalışır')}</div>
        </div>
      </div>
      </>)}

      <style>{`
        @keyframes cube3dSpin {
          0%   { transform: rotateX(15deg) rotateY(0deg); }
          100% { transform: rotateX(15deg) rotateY(360deg); }
        }
        .cube-spin { animation: cube3dSpin 10s linear infinite; }

        @keyframes floatUp {
          0%, 100% { transform: translateY(0px) rotateX(15deg) rotateY(0deg); }
          50%       { transform: translateY(-10px) rotateX(15deg) rotateY(180deg); }
        }
        .float-cube { animation: floatUp 4s ease-in-out infinite; }

        @keyframes holoBorder {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes pulse3d {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(124,58,237,0); }
        }

        @keyframes msRing1 {
          from { transform: rotateX(75deg) rotateY(0deg) rotateZ(0deg); }
          to   { transform: rotateX(75deg) rotateY(0deg) rotateZ(360deg); }
        }
        @keyframes msRing2 {
          from { transform: rotateX(30deg) rotateY(60deg) rotateZ(0deg); }
          to   { transform: rotateX(30deg) rotateY(60deg) rotateZ(360deg); }
        }
        @keyframes msRing3 {
          from { transform: rotateX(-50deg) rotateY(20deg) rotateZ(0deg); }
          to   { transform: rotateX(-50deg) rotateY(20deg) rotateZ(360deg); }
        }
        @keyframes msCoreBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 32px rgba(6,182,212,0.6), 0 0 64px rgba(6,182,212,0.2); }
          50%       { transform: scale(1.07); box-shadow: 0 0 48px rgba(6,182,212,0.85), 0 0 96px rgba(6,182,212,0.3); }
        }
        @keyframes msOrbGlow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.05); }
        }
        .ms-float-orb { animation: msFloatAnim 4s ease-in-out infinite; }
        @keyframes msFloatAnim {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }

        @keyframes msBorder {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes msSpin { to { transform: rotate(360deg); } }

        @keyframes msPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(6,182,212,0); }
        }

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

        @keyframes mkPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        .mk-pulse { animation: mkPulse 1.5s ease-in-out infinite; }
      `}</style>

    </div>
  )
}
