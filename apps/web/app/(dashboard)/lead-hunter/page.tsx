'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  Bot, Play, Pause, RefreshCw, Plus, Trash2, Clock, Target, Zap, MapPin,
  Instagram, Facebook, Globe2, Search, CheckCircle, AlertTriangle,
  TrendingUp, BarChart3, Mail, Phone, Radar, Settings, ChevronRight,
} from 'lucide-react'

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8'
const surf = '#f8fafc'
const accentTeal = '#0d9488', accentEmerald = '#059669'
const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

const SECTORS = ['Restoran','Kafe','Mobilya','Dekorasyon','Tadilat','İnşaat','Tekstil',
  'Güzellik Salonu','Spor Salonu','Otel','Otomotiv','Elektronik','Muhasebe','Sağlık',
  'Eğitim','Temizlik','Nakliyat','Çiçekçi','Fırın','Market']

const CITIES = ['Istanbul','Ankara','Izmir','Bursa','Antalya','Adana',
  'Gaziantep','Konya','Kayseri','Mersin','Eskişehir','Trabzon','Diyarbakır','Samsun']

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps', Icon: MapPin, color: '#4285f4' },
  { id: 'instagram', label: 'Instagram', Icon: Instagram, color: '#e1306c' },
  { id: 'facebook', label: 'Facebook', Icon: Facebook, color: '#1877f2' },
]

// ── HUNTER ORB ANIMATION ─────────────────────────────────────────────────────
function HunterOrb({ size = 100, scanning = false }: { size?: number; scanning?: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 50)
    return () => clearInterval(t)
  }, [])
  const cx = size / 2
  const pulseR = scanning ? 6 + Math.sin(tick * 0.15) * 3 : 5
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size}>
        <defs>
          <radialGradient id="hg1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="70%" stopColor="rgba(16,185,129,0.06)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.15)" />
          </radialGradient>
          <radialGradient id="hcore" cx="35%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#064e3b" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={cx} fill="url(#hg1)" />
        {[0.3, 0.55, 0.8].map(r => (
          <circle key={r} cx={cx} cy={cx} r={cx * r} fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth={0.8} strokeDasharray="3 5" />
        ))}
        <circle cx={cx} cy={cx} r={cx * 0.32} fill="url(#hcore)"
          style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.6))' }} />
        {scanning && <circle cx={cx} cy={cx} r={pulseR} fill="none" stroke="#10b981" strokeWidth={1.5} opacity={0.6}
          style={{ transformOrigin: `${cx}px ${cx}px`, animation: 'hunterPulse 2s ease-out infinite' }} />}
        {[0, 72, 144, 216, 288].map((deg, i) => {
          const angle = ((deg + tick * 0.8) % 360) * Math.PI / 180
          const r = cx * 0.6
          const x = cx + Math.cos(angle) * r
          const y = cx + Math.sin(angle) * r
          const colors = ['#10b981', '#3b82f6', '#e1306c', '#f59e0b', '#8b5cf6']
          return <circle key={i} cx={x} cy={y} r={3.5} fill={colors[i]} opacity={0.7} />
        })}
      </svg>
    </div>
  )
}

export default function HunterSettingsPage() {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const [config, setConfig] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const [keywords, setKeywords] = useState<string[]>(['Restoran','Kafe'])
  const [cities, setCities] = useState<string[]>(['Istanbul'])
  const [sources, setSources] = useState<string[]>(['google_maps'])
  const [active, setActive] = useState(true)
  const [interval, setInterval2] = useState(6)
  const [maxLeads, setMaxLeads] = useState(50)
  const [autoWorkflow, setAutoWorkflow] = useState(true)
  const [customKeyword, setCustomKeyword] = useState('')

  const [mobileTab, setMobileTab] = useState<'overview' | 'sources' | 'targets' | 'history'>('overview')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const load = async () => {
    setLoading(true)
    try {
      const [c, l, s] = await Promise.allSettled([
        api.get('/api/hunter/config'),
        api.get('/api/hunter/logs'),
        api.get('/api/hunter/stats'),
      ])
      if (c.status === 'fulfilled' && c.value.config) {
        const cfg = c.value.config
        setConfig(cfg)
        setKeywords(cfg.keywords || ['Restoran'])
        setCities(cfg.cities || ['Istanbul'])
        setSources(cfg.sources || ['google_maps'])
        setActive(cfg.active ?? true)
        setInterval2(cfg.run_interval_hours || 6)
        setMaxLeads(cfg.max_leads_per_run || 50)
        setAutoWorkflow(cfg.auto_start_workflow ?? true)
      }
      if (l.status === 'fulfilled') setLogs(l.value.logs || [])
      if (s.status === 'fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/hunter/config', {
        keywords, cities, sources, active,
        run_interval_hours: interval,
        max_leads_per_run: maxLeads,
        auto_start_workflow: autoWorkflow,
      })
      showMsg('success', 'Ayarlar kaydedildi! Hunter ' + (active ? 'aktif' : 'durduruldu'))
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const runNow = async () => {
    setRunning(true)
    try {
      await api.post('/api/hunter/run-now', {})
      showMsg('success', 'Hunter çalıştırılıyor... Birkaç dakika bekleyin.')
      setTimeout(load, 45000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setTimeout(() => setRunning(false), 3000) }
  }

  const toggleKeyword = (k: string) => setKeywords(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  const toggleCity = (c: string) => setCities(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  const toggleSource = (s: string) => setSources(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const addCustomKeyword = () => {
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim())) {
      setKeywords(p => [...p, customKeyword.trim()])
      setCustomKeyword('')
    }
  }

  const STATS_DATA = [
    { label: 'Toplam Lead', value: stats?.totalLeads || 0, color: accentEmerald, Icon: Target },
    { label: 'Tarama', value: stats?.totalRuns || logs.length || 0, color: '#2563eb', Icon: Radar },
    { label: 'Kaynak', value: sources.length + (stats?.sourceBreakdown ? `+${Object.keys(stats.sourceBreakdown).length - sources.length > 0 ? Object.keys(stats.sourceBreakdown).length - sources.length : 0}` : ''), color: '#7c3aed', Icon: Globe2 },
    { label: 'Durum', value: active ? 'Aktif' : 'Pasif', color: active ? accentEmerald : '#dc2626', Icon: active ? CheckCircle : Pause },
  ]

  return (
    <div style={{ padding: 0 }}>
      {isMobile ? (
        /* ════════════════════════════════════════════════════════════════════
           MOBILE LAYOUT — Facebook/LinkedIn kalitesi
           ════════════════════════════════════════════════════════════════════ */
        <div style={{ paddingBottom: 80 }}>

          {/* ── MOBILE HERO HEADER (always visible) ─────────────────────── */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 40%, #059669 100%)',
            borderRadius: 20, padding: '20px 18px 18px', marginBottom: 16,
            boxShadow: '0 8px 32px rgba(5,150,105,0.3)',
          }}>
            {/* grid texture */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', borderRadius: 20 }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Top row: orb + title + badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <HunterOrb size={64} scanning={running} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h1 style={{ color: '#ffffff', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>AI Lead Avcısı</h1>
                  </div>
                  {/* Status badge with pulsing dot */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: active ? 'rgba(255,255,255,0.15)' : 'rgba(220,38,38,0.3)', borderRadius: 20, padding: '4px 12px' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: active ? '#6ee7b7' : '#fca5a5',
                      animation: active ? 'mPulse 2s ease-in-out infinite' : 'none',
                      boxShadow: active ? '0 0 6px #6ee7b7' : 'none',
                    }} />
                    <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{active ? 'AKTIF' : 'PASİF'}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: '6px 0 0' }}>7/24 otonom lead tarama motoru</p>
                </div>
              </div>

              {/* 2×2 Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {STATS_DATA.map(({ label, value, color, Icon }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={13} style={{ color: '#ffffff' }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600 }}>{label}</span>
                    </div>
                    <p style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={runNow} disabled={running} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '12px 0', borderRadius: 12, border: 'none',
                  cursor: running ? 'not-allowed' : 'pointer',
                  background: 'rgba(245,158,11,0.9)',
                  color: '#ffffff', fontSize: 13, fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                }}>
                  {running ? <RefreshCw size={14} style={{ animation: 'hunterSpin 1s linear infinite' }} /> : <Zap size={14} />}
                  {running ? 'Taranıyor...' : 'Şimdi Çalıştır'}
                </button>
                <button onClick={() => setActive(!active)} style={{
                  width: 48, height: 48, borderRadius: 12, border: 'none',
                  cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.15)' : 'rgba(220,38,38,0.4)',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active ? <Pause size={18} /> : <Play size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* ── TOAST ─────────────────────────────────────────────────────── */}
          {msg && (
            <div style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>
              {msg.text}
            </div>
          )}

          {/* ── TAB BAR ───────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 14, marginBottom: 16 }}>
            {[
              { id: 'overview', label: '📊 Genel' },
              { id: 'sources', label: '🔗 Kaynaklar' },
              { id: 'targets', label: '🎯 Hedefler' },
              { id: 'history', label: '📋 Geçmiş' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id as 'overview' | 'sources' | 'targets' | 'history')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mobileTab === tab.id ? '#ffffff' : 'transparent',
                  color: mobileTab === tab.id ? '#0f172a' : '#64748b',
                  boxShadow: mobileTab === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: GENEL (overview) ────────────────────────────────────── */}
          {mobileTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Quick info card */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bot size={15} style={{ color: accentEmerald }} /> Genel Bakış
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: surf, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={13} style={{ color: tx3 }} />
                      <span style={{ color: tx2, fontSize: 12 }}>Tarama Aralığı</span>
                    </div>
                    <span style={{ color: tx1, fontSize: 13, fontWeight: 700 }}>Her {interval} saat</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: surf, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Target size={13} style={{ color: tx3 }} />
                      <span style={{ color: tx2, fontSize: 12 }}>Max Lead / Tarama</span>
                    </div>
                    <span style={{ color: tx1, fontSize: 13, fontWeight: 700 }}>{maxLeads}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: surf, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Globe2 size={13} style={{ color: tx3 }} />
                      <span style={{ color: tx2, fontSize: 12 }}>Aktif Kaynaklar</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {sources.map(s => {
                        const src = SOURCES.find(x => x.id === s)
                        return src ? (
                          <div key={s} style={{ width: 24, height: 24, borderRadius: 6, background: `${src.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <src.Icon size={12} style={{ color: src.color }} />
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: autoWorkflow ? '#ecfdf5' : surf, borderRadius: 10, border: `1px solid ${autoWorkflow ? '#a7f3d0' : '#f1f5f9'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={13} style={{ color: autoWorkflow ? accentEmerald : tx3 }} />
                      <span style={{ color: tx2, fontSize: 12 }}>Otomatik Workflow</span>
                    </div>
                    <span style={{ color: autoWorkflow ? accentEmerald : tx3, fontSize: 12, fontWeight: 700 }}>{autoWorkflow ? 'Açık' : 'Kapalı'}</span>
                  </div>
                </div>
              </div>

              {/* Active keywords preview */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={14} style={{ color: '#f59e0b' }} /> Hedef Sektörler
                  <span style={{ marginLeft: 'auto', color: tx3, fontSize: 11, fontWeight: 400 }}>{keywords.length} seçili</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {keywords.map(k => (
                    <span key={k} style={{ padding: '4px 10px', borderRadius: 20, background: '#ecfdf5', border: '1px solid #a7f3d0', color: accentEmerald, fontSize: 11, fontWeight: 600 }}>{k}</span>
                  ))}
                  {keywords.length === 0 && <span style={{ color: tx3, fontSize: 12 }}>Sektör seçilmedi</span>}
                </div>
              </div>

              {/* Active cities preview */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={14} style={{ color: '#dc2626' }} /> Hedef Şehirler
                  <span style={{ marginLeft: 'auto', color: tx3, fontSize: 11, fontWeight: 400 }}>{cities.length} seçili</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {cities.map(c => (
                    <span key={c} style={{ padding: '4px 10px', borderRadius: 20, background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb', fontSize: 11, fontWeight: 600 }}>{c}</span>
                  ))}
                  {cities.length === 0 && <span style={{ color: tx3, fontSize: 12 }}>Şehir seçilmedi</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: KAYNAKLAR (sources) ─────────────────────────────────── */}
          {mobileTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Master toggle */}
              <div style={{ ...card, padding: '18px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: tx1, fontWeight: 700, fontSize: 15, margin: '0 0 3px' }}>Otomatik Tarama</p>
                    <p style={{ color: tx3, fontSize: 12, margin: 0 }}>Hunter'i aktif veya pasif yap</p>
                  </div>
                  <div role="switch" aria-checked={active} tabIndex={0} onClick={() => setActive(!active)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(!active) } }}
                    style={{ width: 54, height: 30, borderRadius: 15, background: active ? 'linear-gradient(135deg,#0f766e,#10b981)' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 4, left: active ? 28 : 4, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
                {/* Status indicator below toggle */}
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: active ? '#ecfdf5' : '#fef2f2', border: `1px solid ${active ? '#a7f3d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? accentEmerald : '#ef4444', animation: active ? 'mPulse 2s ease-in-out infinite' : 'none' }} />
                  <span style={{ color: active ? accentEmerald : '#ef4444', fontSize: 12, fontWeight: 600 }}>
                    {active ? 'Hunter şu an aktif — lead arıyor' : 'Hunter durduruldu'}
                  </span>
                </div>
              </div>

              {/* Lead sources as large tappable rows */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe2 size={15} style={{ color: accentTeal }} /> Lead Kaynakları
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SOURCES.map(s => {
                    const isActive = sources.includes(s.id)
                    return (
                      <div key={s.id} onClick={() => toggleSource(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 16px', borderRadius: 12,
                          border: `1.5px solid ${isActive ? `${s.color}50` : '#f1f5f9'}`,
                          background: isActive ? `${s.color}08` : '#fafafa',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: isActive ? `${s.color}15` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <s.Icon size={20} style={{ color: isActive ? s.color : tx3 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: isActive ? tx1 : tx2, fontSize: 14, fontWeight: isActive ? 700 : 500, margin: '0 0 2px' }}>{s.label}</p>
                          <p style={{ color: tx3, fontSize: 11, margin: 0 }}>
                            {s.id === 'google_maps' ? 'İşletmeler, konumlar, yorumlar' : s.id === 'instagram' ? 'İşletme profilleri, hashtag tarama' : 'Sayfa ve grup analizi'}
                          </p>
                        </div>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${isActive ? s.color : '#d1d5db'}`, background: isActive ? s.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isActive && <CheckCircle size={13} style={{ color: '#ffffff' }} />}
                        </div>
                      </div>
                    )
                  })}
                  <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0', lineHeight: 1.5, paddingLeft: 2 }}>+ OSM, Yelp, Foursquare, HERE otomatik eklenir (API key varsa)</p>
                </div>
              </div>

              {/* Scan settings */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={15} style={{ color: '#7c3aed' }} /> Tarama Ayarları
                </p>

                {/* Interval slider */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ color: tx2, fontSize: 13, fontWeight: 500 }}>Tarama Aralığı</span>
                    <span style={{ color: accentTeal, fontSize: 16, fontWeight: 800 }}>Her {interval} saat</span>
                  </div>
                  <input type="range" min={1} max={24} value={interval} onChange={e => setInterval2(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: accentTeal, height: 6 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tx3, marginTop: 4 }}><span>1 saat</span><span>24 saat</span></div>
                </div>

                {/* Max leads slider */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ color: tx2, fontSize: 13, fontWeight: 500 }}>Max Lead / Tarama</span>
                    <span style={{ color: accentEmerald, fontSize: 16, fontWeight: 800 }}>{maxLeads}</span>
                  </div>
                  <input type="range" min={5} max={1000} step={5} value={maxLeads} onChange={e => setMaxLeads(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: accentEmerald, height: 6 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tx3, marginTop: 4 }}><span>5</span><span>1000</span></div>
                </div>

                {/* Auto workflow toggle row */}
                <div onClick={() => setAutoWorkflow(!autoWorkflow)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${autoWorkflow ? '#a7f3d0' : '#f1f5f9'}`, background: autoWorkflow ? '#ecfdf5' : '#fafafa', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: autoWorkflow ? '#d1fae5' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={18} style={{ color: autoWorkflow ? accentEmerald : tx3 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: tx1, fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>Otomatik Workflow</p>
                    <p style={{ color: tx3, fontSize: 11, margin: 0 }}>Her yeni lead'e cold_outreach başlat</p>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${autoWorkflow ? accentEmerald : '#d1d5db'}`, background: autoWorkflow ? accentEmerald : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {autoWorkflow && <CheckCircle size={13} style={{ color: '#ffffff' }} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: HEDEFLER (targets) ──────────────────────────────────── */}
          {mobileTab === 'targets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Sectors */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={15} style={{ color: '#f59e0b' }} /> Hedef Sektörler
                  <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid #fde68a' }}>{keywords.length} seçili</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {SECTORS.map(k => {
                    const sel = keywords.includes(k)
                    return (
                      <button key={k} onClick={() => toggleKeyword(k)}
                        style={{
                          padding: '7px 13px', borderRadius: 20, cursor: 'pointer',
                          border: `1.5px solid ${sel ? `${accentEmerald}60` : '#e2e8f0'}`,
                          background: sel ? '#ecfdf5' : '#ffffff',
                          color: sel ? accentEmerald : tx2,
                          fontSize: 12, fontWeight: sel ? 700 : 400,
                          transition: 'all 0.15s',
                        }}>
                        {sel && '✓ '}{k}
                      </button>
                    )
                  })}
                </div>

                {/* Custom keyword field */}
                <div style={{ display: 'flex', gap: 8, marginBottom: keywords.length > 0 ? 12 : 0 }}>
                  <input value={customKeyword} onChange={e => setCustomKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomKeyword()}
                    placeholder="Özel sektör ekle..." style={{ ...inputStyle, fontSize: 13, padding: '10px 14px' }} />
                  <button onClick={addCustomKeyword}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: tx2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                    <Plus size={14} /> Ekle
                  </button>
                </div>

                {/* Selected custom chips */}
                {keywords.filter(k => !SECTORS.includes(k)).length > 0 && (
                  <div>
                    <p style={{ color: tx3, fontSize: 11, margin: '0 0 6px', fontWeight: 600 }}>Özel sektörler:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {keywords.filter(k => !SECTORS.includes(k)).map(k => (
                        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: accentEmerald, fontSize: 11, borderRadius: 20, fontWeight: 600 }}>
                          {k}
                          <button onClick={() => toggleKeyword(k)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}><Trash2 size={10} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cities */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={15} style={{ color: '#dc2626' }} /> Hedef Şehirler
                  <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#2563eb', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid #bfdbfe' }}>{cities.length} seçili</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CITIES.map(c => {
                    const sel = cities.includes(c)
                    return (
                      <button key={c} onClick={() => toggleCity(c)}
                        style={{
                          padding: '7px 13px', borderRadius: 20, cursor: 'pointer',
                          border: `1.5px solid ${sel ? '#93c5fd' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#ffffff',
                          color: sel ? '#2563eb' : tx2,
                          fontSize: 12, fontWeight: sel ? 700 : 400,
                          transition: 'all 0.15s',
                        }}>
                        {sel && '✓ '}{c}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: GEÇMİŞ (history) ───────────────────────────────────── */}
          {mobileTab === 'history' && (
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={15} style={{ color: tx3 }} /> Tarama Geçmişi
                </p>
                <button onClick={load} style={{ background: 'none', border: 'none', color: tx3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                  <RefreshCw size={12} /> Yenile
                </button>
              </div>

              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Bot size={28} style={{ color: tx3 }} />
                  </div>
                  <p style={{ color: tx2, fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Henüz tarama yapılmadı</p>
                  <p style={{ color: tx3, fontSize: 12, margin: 0 }}>İlk taramayı başlatmak için "Şimdi Çalıştır" butonuna basın</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {logs.map((log: any, idx: number) => (
                    <div key={log.id} style={{ display: 'flex', gap: 14, paddingBottom: idx < logs.length - 1 ? 16 : 0, marginBottom: idx < logs.length - 1 ? 16 : 0, borderBottom: idx < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      {/* Timeline line + dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: log.leads_found > 0 ? accentEmerald : tx3, marginTop: 3 }} />
                        {idx < logs.length - 1 && <div style={{ width: 2, flex: 1, background: '#f1f5f9', marginTop: 4 }} />}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ color: tx3, fontSize: 11 }}>
                            {new Date(log.ran_at).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{
                            color: log.leads_found > 0 ? accentEmerald : tx3,
                            fontSize: 18, fontWeight: 800, lineHeight: 1,
                          }}>
                            {log.leads_found}
                            <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 3 }}>lead</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {(log.skipped || 0) > 0 && (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>{log.skipped} atlandı</span>
                          )}
                          {log.sources && typeof log.sources === 'object' && Object.keys(log.sources).length > 0 &&
                            Object.entries(log.sources).map(([s, c]) => (
                              <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                                {s.replace('google_maps', 'GM').replace('instagram', 'IG').replace('facebook', 'FB').replace('openstreetmap', 'OSM').replace('competitor_sniper', 'Rakip')}:{String(c)}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STICKY SAVE BUTTON ────────────────────────────────────────── */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            padding: '12px 16px 20px',
            background: 'linear-gradient(to top, #ffffff 70%, transparent)',
          }}>
            <button onClick={save} disabled={saving} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '15px 0', borderRadius: 16, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0f766e, #059669)',
              color: '#ffffff', fontSize: 15, fontWeight: 800,
              boxShadow: saving ? 'none' : '0 6px 24px rgba(5,150,105,0.4)',
              letterSpacing: 0.2,
              transition: 'all 0.2s',
            }}>
              {saving ? <RefreshCw size={16} style={{ animation: 'hunterSpin 1s linear infinite' }} /> : <Play size={16} />}
              {saving ? 'Kaydediliyor...' : 'Kaydet & Başlat'}
            </button>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════
           DESKTOP LAYOUT — unchanged
           ════════════════════════════════════════════════════════════════════ */
        <>
          {/* ── HERO ──────────────────────────────────────────────────────────── */}
          <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#ffffff,#ecfdf5 65%,#ffffff)', borderRadius: 20, padding: '28px 28px', marginBottom: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#064e3b,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                    <Target size={20} style={{ color: '#ffffff' }} />
                  </div>
                  <h1 style={{ color: tx1, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>7/24 Otonom Lead Avcısı</h1>
                  <span style={{ background: active ? 'linear-gradient(135deg,#059669,#10b981)' : '#94a3b8', color: '#ffffff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{active ? 'AKTIF' : 'PASIF'}</span>
                </div>
                <p style={{ color: tx2, fontSize: 13, margin: '0 0 10px' }}>AI destekli, 7 kaynaklı otonom lead bulma motoru. Google Maps, Instagram, Facebook, OSM, Yelp, Foursquare ve HERE'den sürekli lead arar.</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Google Maps', 'Instagram', 'Facebook', 'OSM', 'AI Expansion', 'Email Discovery'].map(f => (
                    <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: surf, border: '1px solid #f1f5f9', color: tx2, fontSize: 10, padding: '3px 8px', borderRadius: 20 }}>{f}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={runNow} disabled={running}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: running ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#b45309,#f59e0b)', color: '#ffffff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>
                  {running ? <RefreshCw size={14} style={{ animation: 'hunterSpin 1s linear infinite' }} /> : <Zap size={14} />}
                  {running ? 'Taranıyor...' : 'Şimdi Çalıştır'}
                </button>
                <button onClick={save} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#ffffff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}>
                  {saving ? <RefreshCw size={14} style={{ animation: 'hunterSpin 1s linear infinite' }} /> : <Play size={14} />}
                  {saving ? 'Kaydediliyor...' : 'Kaydet & Başlat'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4" style={{ position: 'relative', zIndex: 2, gap: 12, marginTop: 20 }}>
              {STATS_DATA.map(({ label, value, color, Icon }) => (
                <div key={label} style={{ ...card, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <p style={{ color: tx1, fontSize: 20, fontWeight: 800, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
                  <p style={{ color: tx3, fontSize: 10, margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── TOAST ──────────────────────────────────────────────────────────── */}
          {msg && (
            <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontSize: 13, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? accentEmerald : '#dc2626' }}>
              {msg.text}
            </div>
          )}

          {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 20 }}>

            {/* ── SOL: Ayarlar ────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Toggle */}
              <div style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: tx1, fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>Otomatik Tarama</p>
                  <p style={{ color: tx3, fontSize: 11, margin: 0 }}>Hunter'i aktif/pasif yap</p>
                </div>
                <div role="switch" aria-checked={active} tabIndex={0} onClick={() => setActive(!active)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(!active) } }}
                  style={{ width: 44, height: 24, borderRadius: 12, background: active ? 'linear-gradient(135deg,#0f766e,#10b981)' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* Kaynaklar */}
              <div style={{ ...card, padding: '16px 20px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe2 size={15} style={{ color: accentTeal }} /> Lead Kaynakları
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SOURCES.map(s => {
                    const activeSource = sources.includes(s.id)
                    return (
                      <div key={s.id} onClick={() => toggleSource(s.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${activeSource ? `${s.color}40` : '#f1f5f9'}`, background: activeSource ? `${s.color}08` : '#ffffff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, border: `2px solid ${activeSource ? s.color : '#d1d5db'}`, background: activeSource ? s.color : 'transparent' }} />
                        <s.Icon size={16} style={{ color: activeSource ? s.color : tx3 }} />
                        <span style={{ color: activeSource ? tx1 : tx2, fontSize: 13, fontWeight: activeSource ? 600 : 400 }}>{s.label}</span>
                        {activeSource && <CheckCircle size={12} style={{ color: s.color, marginLeft: 'auto' }} />}
                      </div>
                    )
                  })}
                  <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0', lineHeight: 1.5 }}>+ OSM, Yelp, Foursquare, HERE otomatik eklenir (API key varsa)</p>
                </div>
              </div>

              {/* Tarama Ayarları */}
              <div style={{ ...card, padding: '16px 20px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={15} style={{ color: '#7c3aed' }} /> Tarama Ayarları
                </p>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: tx2, fontSize: 12 }}>Tarama Aralığı</span>
                    <span style={{ color: tx1, fontSize: 12, fontWeight: 700 }}>Her {interval} saat</span>
                  </div>
                  <input type="range" min={1} max={24} value={interval} onChange={e => setInterval2(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: accentTeal }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tx3 }}><span>1 saat</span><span>24 saat</span></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: tx2, fontSize: 12 }}>Max Lead / Tarama</span>
                    <span style={{ color: tx1, fontSize: 12, fontWeight: 700 }}>{maxLeads}</span>
                  </div>
                  <input type="range" min={5} max={1000} step={5} value={maxLeads} onChange={e => setMaxLeads(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: accentTeal }} />
                </div>
                <div onClick={() => setAutoWorkflow(!autoWorkflow)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9', background: autoWorkflow ? '#ecfdf5' : '#ffffff', cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${autoWorkflow ? accentEmerald : '#d1d5db'}`, background: autoWorkflow ? accentEmerald : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {autoWorkflow && <CheckCircle size={10} style={{ color: '#fff' }} />}
                  </div>
                  <div>
                    <p style={{ color: tx1, fontSize: 12, fontWeight: 600, margin: 0 }}>Otomatik Workflow Başlat</p>
                    <p style={{ color: tx3, fontSize: 10, margin: 0 }}>Her yeni lead'e cold_outreach baslat</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SAG: Sektorler + Sehirler + Loglar ─────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Sektorler */}
              <div style={{ ...card, padding: '16px 20px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={15} style={{ color: '#f59e0b' }} /> Hedef Sektörler ({keywords.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, maxHeight: 110, overflowY: 'auto' }}>
                  {SECTORS.map(k => (
                    <button key={k} onClick={() => toggleKeyword(k)}
                      style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${keywords.includes(k) ? `${accentEmerald}50` : '#e2e8f0'}`, background: keywords.includes(k) ? '#ecfdf5' : '#ffffff', color: keywords.includes(k) ? accentEmerald : tx2, fontSize: 11, fontWeight: keywords.includes(k) ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {k}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={customKeyword} onChange={e => setCustomKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomKeyword()}
                    placeholder="Özel sektör ekle..." style={{ ...inputStyle, fontSize: 11, padding: '7px 10px' }} />
                  <button onClick={addCustomKeyword}
                    style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: tx2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Plus size={12} />
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {keywords.map(k => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: accentEmerald, fontSize: 10, borderRadius: 20, fontWeight: 600 }}>
                        {k}
                        <button onClick={() => toggleKeyword(k)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, display: 'flex' }}><Trash2 size={9} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sehirler */}
              <div style={{ ...card, padding: '16px 20px' }}>
                <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={15} style={{ color: '#dc2626' }} /> Hedef Şehirler ({cities.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {CITIES.map(c => (
                    <button key={c} onClick={() => toggleCity(c)}
                      style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${cities.includes(c) ? '#93c5fd' : '#e2e8f0'}`, background: cities.includes(c) ? '#eff6ff' : '#ffffff', color: cities.includes(c) ? '#2563eb' : tx2, fontSize: 11, fontWeight: cities.includes(c) ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loglar */}
              <div style={{ ...card, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={15} style={{ color: tx3 }} /> Tarama Geçmişi
                  </p>
                  <button onClick={load} style={{ background: 'none', border: 'none', color: tx3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <RefreshCw size={11} /> Yenile
                  </button>
                </div>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <Bot size={28} style={{ color: tx3, margin: '0 auto 8px' }} />
                    <p style={{ color: tx3, fontSize: 12, margin: 0 }}>Henüz tarama yapılmadı</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {logs.map((log: any) => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: surf, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                        <span style={{ color: tx3, fontSize: 10, flexShrink: 0 }}>
                          {new Date(log.ran_at).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ color: log.leads_found > 0 ? accentEmerald : tx3, fontSize: 12, fontWeight: 700 }}>
                          {log.leads_found} lead
                        </span>
                        {(log.skipped || 0) > 0 && <span style={{ color: '#b45309', fontSize: 10 }}>{log.skipped} atlandı</span>}
                        {log.sources && typeof log.sources === 'object' && Object.keys(log.sources).length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                            {Object.entries(log.sources).map(([s, c]) => (
                              <span key={s} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                                {s.replace('google_maps', 'GM').replace('instagram', 'IG').replace('facebook', 'FB').replace('openstreetmap', 'OSM').replace('competitor_sniper', 'Rakip')}:{String(c)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes hunterPulse { 0%{r:6;opacity:0.8}100%{r:40;opacity:0} }
        @keyframes hunterSpin { to{transform:rotate(360deg)} }
        @keyframes mPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
      `}</style>
    </div>
  )
}
