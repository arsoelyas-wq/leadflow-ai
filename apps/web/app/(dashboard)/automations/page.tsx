'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Plus, Trash2, Copy, CheckCircle, Play, ToggleLeft, ToggleRight, Zap, ChevronDown } from 'lucide-react'

// ── ZAP ORB — lightning sphere with satellite nodes ───────────────────────────
function ZapOrb({ size = 100, active = false }: { size?: number; active?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), active ? 20 : 40)
    return () => clearInterval(t)
  }, [mounted, active])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const rot = tick * (active ? 1.2 : 0.5)

  // Lightning bolt paths emanating from center
  const bolts = [0, 120, 240].map((deg, i) => {
    const a = (deg + rot) * Math.PI / 180
    const mx = cx + Math.cos(a) * s * 0.28, my = cx + Math.sin(a) * s * 0.28
    const ex = cx + Math.cos(a) * s * 0.72, ey = cx + Math.sin(a) * s * 0.72
    const jag = (Math.sin(tick * 0.3 + i) * s * 0.08)
    const jx = cx + Math.cos(a + Math.PI/2) * jag + Math.cos(a) * s * 0.5
    const jy = cx + Math.sin(a + Math.PI/2) * jag + Math.sin(a) * s * 0.5
    return { mx, my, jx, jy, ex, ey, color: ['#f59e0b','#fbbf24','#fcd34d'][i] }
  })

  // Satellite nodes (Zapier, Make, n8n)
  const satellites = ['Z','M','N'].map((label, i) => {
    const a = (i * 120 + rot * 0.6) * Math.PI / 180
    const colors = ['#ef4444','#8b5cf6','#10b981']
    return { x: cx + Math.cos(a) * s * 0.82, y: cx + Math.sin(a) * s * 0.82, label, color: colors[i] }
  })

  const pulseR = s * 0.38 + (active ? Math.sin(tick * 0.2) * s * 0.04 : 0)

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`zoGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(245,158,11,0)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.15)" />
          </radialGradient>
          <radialGradient id={`zoCore${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#zoGlow${s})`} />
        {[0.58, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth={0.8}
            strokeDasharray="5 6" style={{ animation: `zo-ring ${7+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {bolts.map((b, i) => (
          <polyline key={i} points={`${b.mx},${b.my} ${b.jx},${b.jy} ${b.ex},${b.ey}`}
            fill="none" stroke={b.color} strokeWidth={active ? 2 : 1.2} opacity={0.7}
            style={{ filter: `drop-shadow(0 0 4px ${b.color})` }} />
        ))}
        {satellites.map((sat, i) => (
          <g key={i}>
            <line x1={cx} y1={cx} x2={sat.x} y2={sat.y} stroke={`${sat.color}30`} strokeWidth={0.8} strokeDasharray="3 5" />
            <circle cx={sat.x} cy={sat.y} r={14} fill={`${sat.color}20`} stroke={`${sat.color}60`} strokeWidth={1.5} />
            <text x={sat.x} y={sat.y} fill={sat.color} fontSize={9} textAnchor="middle" dominantBaseline="middle" fontWeight="900">{sat.label}</text>
          </g>
        ))}
        <circle cx={cx} cy={cx} r={pulseR} fill={`url(#zoCore${s})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.18}px #f59e0bcc)` }} />
        <text x={cx} y={cx} fill="white" fontSize={s*0.2} textAnchor="middle" dominantBaseline="middle" fontWeight="900">⚡</text>
      </svg>
      <style>{`@keyframes zo-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const EVENT_OPTIONS = [
  { value: 'new_lead', label: '🆕 Yeni Lead', desc: 'Scraping ile yeni lead geldiğinde' },
  { value: 'lead_replied', label: '💬 Lead Cevap Verdi', desc: 'WhatsApp/email cevabı geldiğinde' },
  { value: 'lead_status_changed', label: '🔄 Lead Durumu Değişti', desc: 'Status güncellendiğinde' },
  { value: 'campaign_completed', label: '✅ Kampanya Tamamlandı', desc: 'Mesajlar gönderildiğinde' },
  { value: 'deal_won', label: '🏆 Deal Kazanıldı', desc: 'Lead won durumuna geçtiğinde' },
]

const RULE_TRIGGERS = ['Yeni lead eklenince', 'Lead 2 gün cevap vermeyince', 'Deal kazanılınca', 'Lead kaybolunca']
const RULE_ACTIONS = ['WhatsApp mesaj gönder', 'Email gönder', 'Kampanyaya ekle', 'Webhook tetikle', 'Slack bildirim gönder']

export default function AutomationsPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'rules'|'webhooks'|'logs'>('rules')
  const [copied, setCopied] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [testing, setTesting] = useState<string|null>(null)
  const [newSecret, setNewSecret] = useState<string|null>(null)
  const [expandedLog, setExpandedLog] = useState<string|null>(null)

  // Webhook form
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['new_lead'])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/automations/webhook-url'),
      api.get('/api/webhooks'),
      api.get('/api/automations/logs'),
      api.get('/api/automations/stats'),
    ]).then(([w, wh, l, st]) => {
      if (w.status === 'fulfilled') setWebhookUrl(w.value.url || '')
      if (wh.status === 'fulfilled') setWebhooks(wh.value.webhooks || [])
      if (l.status === 'fulfilled') setLogs(l.value.logs || [])
      if (st.status === 'fulfilled') setStats(st.value)
      setLoading(false)
    })
  }, [])

  const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const createWebhook = async () => {
    if (!name || !url) return
    setSaving(true)
    try {
      const data = await api.post('/api/webhooks', { name, url, events })
      setNewSecret(data.secret)
      setWebhooks(prev => [...prev, data.webhook || {}])
      setShowCreate(false); setName(''); setUrl('')
    } catch {}
    setSaving(false)
  }

  const toggleWebhook = async (id: string) => {
    const data = await api.patch(`/api/webhooks/${id}/toggle`, {})
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: data.active } : w))
  }

  const testWebhook = async (id: string) => {
    setTesting(id)
    try { await api.post(`/api/webhooks/${id}/test`, {}) } catch {}
    setTesting(null)
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Silinsin mi?')) return
    await api.delete(`/api/webhooks/${id}`)
    setWebhooks(prev => prev.filter(w => w.id !== id))
  }

  const toggleEvent = (e: string) => setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])

  const inputStyle = { width: '100%', background: '#060a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(20,12,0,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(245,158,11,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <ZapOrb size={90} active={loading} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>Otomasyon Merkezi</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>IF-THEN kuralları, webhook entegrasyonları ve Zapier/Make/n8n bağlantısı</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[{l:'Toplam İşlem',v:stats?.total||0,c:'#f59e0b'},{l:'Gelen',v:stats?.incoming||0,c:'#06b6d4'},{l:'Giden',v:stats?.outgoing||0,c:'#10b981'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:20, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Incoming webhook URL */}
          <div style={{ flexShrink: 0, maxWidth: 280 }}>
            <p style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Gelen Webhook URL'niz</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <code style={{ flex: 1, background: '#060a1c', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '7px 10px', color: '#fbbf24', fontSize: 9, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {webhookUrl || 'Yükleniyor...'}
              </code>
              <button onClick={() => copy(webhookUrl)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>
                {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
        {[{id:'rules',label:'🤖 IF-THEN Kuralları'},{id:'webhooks',label:'🔗 Webhooks'},{id:'logs',label:'📋 Loglar'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeTab===t.id ? 'linear-gradient(135deg,#78350f,#f59e0b)' : 'transparent', color: activeTab===t.id ? '#fff' : '#64748b', boxShadow: activeTab===t.id ? '0 3px 12px rgba(245,158,11,0.3)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Integrations */}
          <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 18, padding: 22 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>🔌 Platform Entegrasyonları</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { name: 'Zapier', label: 'Z', color: '#ef4444', desc: '7000+ uygulama', field: 'zapierUrl', placeholder: 'https://hooks.zapier.com/...' },
                { name: 'Make', label: 'M', color: '#8b5cf6', desc: 'Görsel otomasyon', field: 'makeUrl', placeholder: 'https://hook.eu1.make.com/...' },
                { name: 'n8n', label: 'N', color: '#10b981', desc: 'Açık kaynak', field: 'n8nUrl', placeholder: 'https://n8n.io/webhook/...' },
              ].map(p => (
                <div key={p.name} style={{ background: `${p.color}08`, border: `1px solid ${p.color}25`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${p.color}20`, border: `1px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: p.color }}>{p.label}</div>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{p.name}</p>
                      <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{p.desc}</p>
                    </div>
                  </div>
                  <input placeholder={p.placeholder} style={{ ...inputStyle, fontSize: 10 }} />
                </div>
              ))}
            </div>
          </div>

          {/* IF-THEN Rules */}
          <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 18, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>🤖 Otomasyon Kuralları</h3>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4c1d95,#8b5cf6)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={12} /> Kural Ekle
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { trigger: 'Lead 2 gün cevap vermeyince', action: 'WhatsApp hatırlatma gönder', active: true, runs: 47 },
                { trigger: 'Deal kazanılınca', action: 'Zapier → CRM güncelle', active: true, runs: 12 },
                { trigger: 'Yeni lead eklenince', action: 'Slack bildirim gönder', active: false, runs: 0 },
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 11 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: rule.active ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', border: `1px solid ${rule.active ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={15} color={rule.active ? '#10b981' : '#475569'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>EĞER</span>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{rule.trigger}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>O ZAMAN</span>
                      <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>{rule.action}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: rule.active ? '#10b981' : '#475569', fontSize: 11, margin: '0 0 2px' }}>{rule.runs} çalıştı</p>
                    <button style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${rule.active ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`, background: rule.active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: rule.active ? '#34d399' : '#64748b', fontSize: 10, cursor: 'pointer' }}>
                      {rule.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ color: '#334155', fontSize: 11, margin: '12px 0 0', textAlign: 'center' }}>Kurallar yakında aktif olacak — şu an önizleme modunda</p>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {newSecret && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: 18 }}>
              <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13, margin: '0 0 8px' }}>⚠️ Secret Key — Sadece bir kez görünür!</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <code style={{ flex: 1, background: '#060a1c', borderRadius: 8, padding: '8px 12px', color: '#34d399', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>{newSecret}</code>
                <button onClick={() => copy(newSecret)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'pointer' }}><Copy size={14} /></button>
              </div>
            </div>
          )}

          <button onClick={() => setShowCreate(!showCreate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#78350f,#f59e0b)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
            <Plus size={14} /> Yeni Webhook
          </button>

          {showCreate && (
            <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 18, padding: 22 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Yeni Webhook</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div><label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Webhook Adı *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="CRM Entegrasyonu" style={inputStyle} /></div>
                <div><label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Endpoint URL *</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inputStyle} /></div>
              </div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 8 }}>Tetikleyici Olaylar</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {EVENT_OPTIONS.map(opt => (
                  <label key={opt.value} onClick={() => toggleEvent(opt.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${events.includes(opt.value) ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)'}`, background: events.includes(opt.value) ? 'rgba(245,158,11,0.08)' : 'transparent', cursor: 'pointer' }}>
                    <input type="checkbox" checked={events.includes(opt.value)} readOnly style={{ accentColor: '#f59e0b', marginTop: 2 }} />
                    <div><p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0 }}>{opt.label}</p><p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{opt.desc}</p></div>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={createWebhook} disabled={saving || !name || !url}
                  style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#78350f,#f59e0b)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? <RefreshCw size={13} style={{ animation: 'za-spin 1s linear infinite', display: 'inline' }} /> : 'Oluştur'}
                </button>
                <button onClick={() => setShowCreate(false)} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>İptal</button>
              </div>
            </div>
          )}

          {webhooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
              <p style={{ fontSize: 32, margin: '0 0 10px' }}>🔗</p>
              <p>Henüz webhook yok</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {webhooks.map(wh => (
                <div key={wh.id} style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: wh.active ? '#10b981' : '#475569', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{wh.name}</p>
                      <p style={{ color: '#334155', fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>{wh.url}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleWebhook(wh.id)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${wh.active ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`, background: 'transparent', color: wh.active ? '#34d399' : '#64748b', fontSize: 11, cursor: 'pointer' }}>
                        {wh.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => testWebhook(wh.id)} disabled={testing === wh.id} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: '#22d3ee', fontSize: 11, cursor: 'pointer' }}>
                        {testing === wh.id ? <RefreshCw size={12} style={{ animation: 'za-spin 1s linear infinite' }} /> : <Play size={12} />}
                      </button>
                      <button onClick={() => deleteWebhook(wh.id)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>📋 Son İşlemler</h3>
          {logs.length === 0 ? (
            <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Henüz log yok</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.slice(0, 15).map((log: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 9 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: log.type === 'incoming' ? 'rgba(6,182,212,0.15)' : 'rgba(16,185,129,0.15)', color: log.type === 'incoming' ? '#22d3ee' : '#34d399', border: `1px solid ${log.type === 'incoming' ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                    {log.type === 'incoming' ? 'Gelen' : 'Giden'}
                  </span>
                  <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, flex: 1 }}>{log.source || log.destination || 'Bilinmeyen'}</p>
                  <p style={{ color: '#334155', fontSize: 11, margin: 0 }}>{new Date(log.received_at || log.sent_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes za-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
