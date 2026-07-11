'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}/api/admin${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}`, ...opts.headers } })
  return r.json()
}

type FlagStatus = 'active' | 'disabled' | 'coming_soon'

interface FlagDef {
  key: string
  label: string
  desc: string
  category: string
  emoji: string
}

const FLAG_CATEGORIES: { id: string; label: string; flags: FlagDef[] }[] = [
  {
    id: 'core', label: 'Temel',
    flags: [
      { key: 'dashboard',       label: 'Dashboard',         desc: 'Ana gösterge paneli',           category: 'core',    emoji: '📊' },
      { key: 'leads',           label: 'Leads',             desc: 'Lead listesi ve yönetimi',      category: 'core',    emoji: '👥' },
      { key: 'pipeline',        label: 'Pipeline',          desc: 'Satış hattı (Kanban)',          category: 'core',    emoji: '🗂' },
      { key: 'inbox',           label: 'Inbox',             desc: 'Mesaj kutusu',                  category: 'core',    emoji: '📥' },
      { key: 'automations',     label: 'Automasyonlar',     desc: 'Otomasyon kuralları ve Zapier', category: 'core',    emoji: '⚡' },
      { key: 'lead_machine',    label: 'Lead Machine',      desc: 'AI destekli lead bulma',        category: 'core',    emoji: '🤖' },
    ],
  },
  {
    id: 'discovery', label: 'Keşif',
    flags: [
      { key: 'lead_hunter',     label: 'Lead Hunter',       desc: 'Otomatik lead arama',           category: 'discovery', emoji: '🎯' },
      { key: 'decision_maker',  label: 'Karar Verici',      desc: 'Şirkette yetkili bulma',        category: 'discovery', emoji: '👤' },
      { key: 'trade_fair',      label: 'Fuar & Etkinlik',   desc: 'Fuar ve etkinlik takvimi',      category: 'discovery', emoji: '🎪' },
      { key: 'referral',        label: 'Referans',          desc: 'Referans programı',             category: 'discovery', emoji: '🔗' },
    ],
  },
  {
    id: 'sales', label: 'Satış',
    flags: [
      { key: 'proposals',       label: 'Teklifler',         desc: 'Teklif oluşturma ve takibi',   category: 'sales',   emoji: '📄' },
      { key: 'products',        label: 'Ürünler',           desc: 'Ürün kataloğu',                category: 'sales',   emoji: '📦' },
      { key: 'digital_tools',   label: 'Dijital Araçlar',   desc: 'Dijital araç önerileri',       category: 'sales',   emoji: '🛠' },
      { key: 'agent',           label: 'AI Satış Ajanı',    desc: '7/24 otonom lead araştırma',   category: 'sales',   emoji: '🤖' },
      { key: 'tenders',         label: 'İhaleler',          desc: 'İhale takibi ve bildirimleri', category: 'sales',   emoji: '📜' },
      { key: 'export',          label: 'İhracat Zekası',    desc: 'Global alıcı bulma',           category: 'sales',   emoji: '🌍' },
    ],
  },
  {
    id: 'outreach', label: 'Kampanyalar',
    flags: [
      { key: 'voice_outreach',  label: 'Sesli Arama',       desc: 'ElevenLabs AI arama',          category: 'outreach', emoji: '📞' },
      { key: 'video_outreach',  label: 'Video Outreach',    desc: 'Kişiselleştirilmiş video',     category: 'outreach', emoji: '🎬' },
      { key: 'sms_campaigns',   label: 'SMS Kampanyaları',  desc: 'Toplu SMS gönderimi',          category: 'outreach', emoji: '💬' },
      { key: 'email_campaigns', label: 'E-posta Kampanyaları', desc: 'E-posta kampanyaları',      category: 'outreach', emoji: '📧' },
      { key: 'wa_numbers',      label: 'WhatsApp Numaraları', desc: 'WA numarası yönetimi',       category: 'outreach', emoji: '📱' },
    ],
  },
  {
    id: 'marketing', label: 'Pazarlama',
    flags: [
      { key: 'ads',             label: 'Reklam Yönetimi',   desc: 'Meta/sosyal medya reklamları', category: 'marketing', emoji: '📢' },
      { key: 'google_ads',      label: 'Google Ads',        desc: 'Google reklam kampanyaları',   category: 'marketing', emoji: '🔍' },
    ],
  },
  {
    id: 'intelligence', label: 'Pazar Zekası',
    flags: [
      { key: 'competitor',      label: 'Rakip Analizi',     desc: 'Rakip izleme ve analiz',       category: 'intelligence', emoji: '⚔️' },
      { key: 'shadow',          label: 'Shadow',            desc: 'Piyasa izleme',                category: 'intelligence', emoji: '👁' },
      { key: 'price_tracker',   label: 'Fiyat Takipçisi',   desc: 'Rakip fiyat izleme',           category: 'intelligence', emoji: '🏷' },
      { key: 'visual_trends',   label: 'Görsel Trendler',   desc: 'Görsel trend analizi',         category: 'intelligence', emoji: '📈' },
      { key: 'cultural',        label: 'Kültürel Analiz',   desc: 'Uluslararası kültür rehberi',  category: 'intelligence', emoji: '🌐' },
    ],
  },
  {
    id: 'analytics', label: 'Analitik',
    flags: [
      { key: 'analytics',       label: 'Analitik',          desc: 'Performans raporları',         category: 'analytics', emoji: '📊' },
      { key: 'financial',       label: 'Finansal',          desc: 'Gelir ve gider takibi',        category: 'analytics', emoji: '💰' },
      { key: 'monitoring',      label: 'İzleme',            desc: 'Sistem sağlık izleme',         category: 'analytics', emoji: '🔍' },
    ],
  },
  {
    id: 'system', label: 'Sistem',
    flags: [
      { key: 'team',            label: 'Takım',             desc: 'Takım üyesi yönetimi',         category: 'system', emoji: '👥' },
      { key: 'webhooks',        label: 'Webhooks',          desc: 'Webhook yönetimi',             category: 'system', emoji: '🔗' },
      { key: 'developer',       label: 'Geliştirici',       desc: 'API anahtarları ve dökümanlar', category: 'system', emoji: '💻' },
      { key: 'whitelabel',      label: 'White-label',       desc: 'Özel marka ve domain',         category: 'system', emoji: '🏢' },
      { key: 'settings',        label: 'Ayarlar',           desc: 'Hesap ve uygulama ayarları',   category: 'system', emoji: '⚙️' },
      { key: 'billing',         label: 'Faturalama',        desc: 'Plan ve kredi yönetimi',       category: 'system', emoji: '💳' },
    ],
  },
]

const STATUS_CONFIG: Record<FlagStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  active:       { label: 'Aktif',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.3)',   dot: '#10b981' },
  coming_soon:  { label: 'Yakında',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)',   dot: '#f59e0b' },
  disabled:     { label: 'Kapalı',   color: '#64748b', bg: 'rgba(100,116,139,0.08)',  border: 'rgba(100,116,139,0.2)', dot: '#94a3b8' },
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Record<string, FlagStatus>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    req('/flags').then(d => {
      const map: Record<string, FlagStatus> = {}
      ;(d.flags || []).forEach((f: any) => {
        map[f.flag_key] = f.status || (f.is_enabled ? 'active' : 'disabled')
      })
      setFlags(map)
    }).catch(() => {})
  }, [])

  const setStatus = async (key: string, status: FlagStatus) => {
    setSaving(key)
    try {
      await req(`/flags/${key}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setFlags(prev => ({ ...prev, [key]: status }))
      const cfg = STATUS_CONFIG[status]
      setMsg(`${cfg.label}: "${key}" güncellendi`)
      setTimeout(() => setMsg(''), 3000)
    } catch (e: any) { setMsg('❌ Hata: ' + e.message) }
    finally { setSaving(null) }
  }

  const card: React.CSSProperties = {
    background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 8,
  }

  const allFlags = FLAG_CATEGORIES.flatMap(c => c.flags)
  const filteredCategories = activeCategory === 'all'
    ? FLAG_CATEGORIES
    : FLAG_CATEGORIES.filter(c => c.id === activeCategory)

  const totalActive   = allFlags.filter(f => (flags[f.key] || 'active') === 'active').length
  const totalComing   = allFlags.filter(f => flags[f.key] === 'coming_soon').length
  const totalDisabled = allFlags.filter(f => flags[f.key] === 'disabled').length

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>🚩 Feature Flags</h1>
      <p style={{ color: '#475569', fontSize: 13, margin: '0 0 20px' }}>
        Özellikleri tek tıkla aç, kapat veya &ldquo;yakında&rdquo; olarak işaretle
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Aktif',   value: totalActive,   color: '#10b981' },
          { label: 'Yakında', value: totalComing,   color: '#f59e0b' },
          { label: 'Kapalı', value: totalDisabled, color: '#64748b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px', minWidth: 90 }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex overflow-x-auto" style={{ gap: 6, marginBottom: 20, scrollbarWidth: 'none' }}>
        {[{ id: 'all', label: 'Tümü' }, ...FLAG_CATEGORIES].map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
              background: activeCategory === c.id ? '#2563eb' : 'rgba(255,255,255,0.06)',
              color: activeCategory === c.id ? '#fff' : '#64748b',
              transition: 'all 0.15s',
            }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Flag groups */}
      {filteredCategories.map(category => (
        <div key={category.id} style={{ marginBottom: 24 }}>
          <div style={{ color: '#94a3b8', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            {category.label}
          </div>
          {category.flags.map(flag => {
            const status: FlagStatus = flags[flag.key] || 'active'
            const isSaving = saving === flag.key
            const cfg = STATUS_CONFIG[status]

            return (
              <div key={flag.key} style={{ ...card, opacity: isSaving ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{flag.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{flag.label}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ color: '#475569', fontSize: 11.5 }}>{flag.desc}</div>
                    <code style={{ color: '#334155', fontSize: 10, marginTop: 3, display: 'block' }}>{flag.key}</code>
                  </div>
                  {/* 3-state control */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(['active', 'coming_soon', 'disabled'] as FlagStatus[]).map(s => {
                      const c2 = STATUS_CONFIG[s]
                      const isSelected = status === s
                      return (
                        <button key={s} onClick={() => !isSaving && setStatus(flag.key, s)}
                          disabled={isSaving}
                          title={c2.label}
                          style={{
                            padding: '4px 10px', borderRadius: 7,
                            border: isSelected ? `1px solid ${c2.color}` : '1px solid rgba(255,255,255,0.08)',
                            background: isSelected ? c2.bg : 'transparent',
                            color: isSelected ? c2.color : '#475569',
                            fontSize: 10.5, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}>
                          {s === 'active' ? '✓ Aktif' : s === 'coming_soon' ? '⏳ Yakında' : '✕ Kapalı'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ color: '#1e293b', fontSize: 11.5, textAlign: 'center', paddingTop: 8, paddingBottom: 16 }}>
        Değişiklikler anında yayına girer · Aktif = görünür · Yakında = sarı badge · Kapalı = gizlenmiş
      </div>
    </div>
  )
}
