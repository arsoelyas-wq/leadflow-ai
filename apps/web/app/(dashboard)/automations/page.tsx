'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Plus, Trash2, Copy, CheckCircle, Play, ToggleLeft, ToggleRight, Zap, ChevronDown, Clock, X } from 'lucide-react'

// ── ZAP ORB ───────────────────────────────────────────────────────────────────
function ZapOrb({ size = 90, active = false }: { size?: number; active?: boolean }) {
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
  const bolts = [0, 120, 240].map((deg, i) => {
    const a = (deg + rot) * Math.PI / 180
    const mx = cx + Math.cos(a) * s * 0.28, my = cx + Math.sin(a) * s * 0.28
    const ex = cx + Math.cos(a) * s * 0.72, ey = cx + Math.sin(a) * s * 0.72
    const jag = Math.sin(tick * 0.3 + i) * s * 0.08
    const jx = cx + Math.cos(a + Math.PI / 2) * jag + Math.cos(a) * s * 0.5
    const jy = cx + Math.sin(a + Math.PI / 2) * jag + Math.sin(a) * s * 0.5
    return { mx, my, jx, jy, ex, ey, color: ['#f59e0b', '#fbbf24', '#fcd34d'][i] }
  })
  const satellites = ['Z', 'M', 'N'].map((label, i) => {
    const a = (i * 120 + rot * 0.6) * Math.PI / 180
    const colors = ['#ef4444', '#8b5cf6', '#10b981']
    return { x: cx + Math.cos(a) * s * 0.82, y: cx + Math.sin(a) * s * 0.82, label, color: colors[i] }
  })
  const pulseR = s * 0.38 + (active ? Math.sin(tick * 0.2) * s * 0.04 : 0)

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`zoG${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(245,158,11,0)" /><stop offset="100%" stopColor="rgba(245,158,11,0.15)" />
          </radialGradient>
          <radialGradient id={`zoC${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#fde68a" /><stop offset="40%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#78350f" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#zoG${s})`} />
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
        <circle cx={cx} cy={cx} r={pulseR} fill={`url(#zoC${s})`}
          style={{ filter: `drop-shadow(0 0 ${s * 0.18}px #f59e0bcc)` }} />
        <text x={cx} y={cx} fill="white" fontSize={s * 0.2} textAnchor="middle" dominantBaseline="middle" fontWeight="900">⚡</text>
      </svg>
      <style>{`@keyframes zo-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── TRIGGER & ACTION CONFIG ───────────────────────────────────────────────────
const TRIGGERS = [
  { value: 'no_reply', label: '📵 Lead cevap vermedi', desc: 'Son mesajdan bu kadar gün geçince', hasDays: true },
  { value: 'no_contact_7d', label: '⏰ 7 Gün İletişim Yok', desc: '7 gündür hiç iletişim kurulmadıysa', hasDays: false },
  { value: 'new_lead', label: '🆕 Yeni Lead Eklendi', desc: 'Son 1 saat içinde eklenen yeni leadler', hasDays: false },
  { value: 'deal_won', label: '🏆 Deal Kazanıldı', desc: 'Lead won durumuna geçince', hasDays: false },
]

const ACTIONS = [
  { value: 'send_whatsapp', label: '💬 WhatsApp Gönder', desc: 'Kişiselleştirilmiş mesaj gönder', hasMessage: true, hasValue: false, hasCampaign: false },
  { value: 'change_status', label: '🔄 Durumu Değiştir', desc: 'Lead durumunu güncelle', hasMessage: false, hasValue: true, hasCampaign: false },
  { value: 'add_note', label: '📝 Not Ekle', desc: 'Lead profiline otomatik not ekle', hasMessage: true, hasValue: false, hasCampaign: false },
  { value: 'add_to_campaign', label: '📢 Kampanyaya Ekle', desc: 'Seçili kampanyaya lead ekle', hasMessage: false, hasValue: false, hasCampaign: true },
]

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

const MESSAGE_VARIABLES = ['{ad}', '{firma}', '{telefon}']

// ── CREATE RULE MODAL ─────────────────────────────────────────────────────────
function CreateRuleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '', trigger: 'no_reply', trigger_days: '2',
    action: 'send_whatsapp', action_message: '', action_value: 'contacted', action_campaign_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/campaigns').then((d: any) => setCampaigns(d.campaigns || d || [])).catch(() => {})
  }, [])

  const submit = async () => {
    if (!form.name || !form.trigger || !form.action) { setError('Ad, tetikleyici ve aksiyon zorunlu'); return }
    setSaving(true); setError('')
    try {
      await api.post('/api/automations/rules', form)
      onCreated(); onClose()
    } catch (e: any) { setError(e.message || 'Hata oluştu') }
    setSaving(false)
  }

  const selectedTrigger = TRIGGERS.find(t => t.value === form.trigger)
  const selectedAction = ACTIONS.find(a => a.value === form.action)
  const inputStyle = { width: '100%', background: '#060a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0c14,#0d1120)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: 28, width: 520, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>⚡ Yeni Otomasyon Kuralı</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Kural Adı *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="örn: 2 Gün Cevap Vermeyene Hatırlatma" style={inputStyle} />
          </div>

          {/* Trigger */}
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 8 }}>🎯 Tetikleyici (EĞER)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TRIGGERS.map(t => (
                <button key={t.value} onClick={() => setForm(p => ({ ...p, trigger: t.value }))}
                  style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.trigger === t.value ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.06)'}`, background: form.trigger === t.value ? 'rgba(245,158,11,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0 }}>{t.label}</p>
                  <p style={{ color: '#475569', fontSize: 10, margin: '2px 0 0' }}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Days (if trigger supports it) */}
          {selectedTrigger?.hasDays && (
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Kaç Gün Sonra? ({form.trigger_days} gün)</label>
              <input type="range" min={1} max={14} value={form.trigger_days} onChange={e => setForm(p => ({ ...p, trigger_days: e.target.value }))} style={{ width: '100%', accentColor: '#f59e0b' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ color: '#334155', fontSize: 10 }}>1 gün</span><span style={{ color: '#334155', fontSize: 10 }}>14 gün</span>
              </div>
            </div>
          )}

          {/* Action */}
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 8 }}>⚡ Aksiyon (O ZAMAN)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ACTIONS.map(a => (
                <button key={a.value} onClick={() => setForm(p => ({ ...p, action: a.value }))}
                  style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.action === a.value ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.06)'}`, background: form.action === a.value ? 'rgba(16,185,129,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0 }}>{a.label}</p>
                  <p style={{ color: '#475569', fontSize: 10, margin: '2px 0 0' }}>{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action config */}
          {selectedAction?.hasMessage && (
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>
                Mesaj İçeriği
                <span style={{ color: '#334155', marginLeft: 8 }}>Değişkenler: {MESSAGE_VARIABLES.join(' ')}</span>
              </label>
              <textarea value={form.action_message} onChange={e => setForm(p => ({ ...p, action_message: e.target.value }))}
                placeholder="Merhaba {ad}, sizi aramak istedik. {firma} ile ilgili..."
                rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
            </div>
          )}

          {selectedAction?.hasValue && (
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Yeni Durum</label>
              <select value={form.action_value} onChange={e => setForm(p => ({ ...p, action_value: e.target.value }))} style={{ ...inputStyle, height: 42 }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {selectedAction?.hasCampaign && (
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>Kampanya Seç</label>
              <select value={form.action_campaign_id} onChange={e => setForm(p => ({ ...p, action_campaign_id: e.target.value }))} style={{ ...inputStyle, height: 42 }}>
                <option value="">Kampanya seçin...</option>
                {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

          <button onClick={submit} disabled={saving}
            style={{ padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#78350f,#f59e0b)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'za-spin 1s linear infinite' }} /> : <Zap size={14} />}
            {saving ? 'Kaydediliyor...' : 'Kural Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'rules' | 'logs' | 'integrations'>('rules')
  const [showCreate, setShowCreate] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandLog, setExpandLog] = useState<string | null>(null)
  const loadData = async () => {
    setLoading(true)
    const [r, l, s, w] = await Promise.allSettled([
      api.get('/api/automations/rules'),
      api.get('/api/automations/rules/logs'),
      api.get('/api/automations/stats'),
      api.get('/api/automations/webhook-url'),
    ])
    if (r.status === 'fulfilled') setRules((r.value as any).rules || [])
    if (l.status === 'fulfilled') setLogs((l.value as any).logs || [])
    if (s.status === 'fulfilled') setStats(s.value)
    if (w.status === 'fulfilled') setWebhookUrl((w.value as any).url || '')
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const toggleRule = async (id: string) => {
    const data: any = await api.patch(`/api/automations/rules/${id}/toggle`, {})
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: data.active } : r))
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Bu kural silinsin mi?')) return
    await api.delete(`/api/automations/rules/${id}`)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const testRule = async (id: string) => {
    setTesting(id)
    try { await api.post(`/api/automations/rules/${id}/run`, {}) } catch {}
    setTimeout(() => { setTesting(null); loadData() }, 3000)
  }

  const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const getTriggerLabel = (rule: any) => {
    const t = TRIGGERS.find(tr => tr.value === rule.trigger)
    if (!t) return rule.trigger
    return t.hasDays ? `${t.label} (${rule.trigger_days} gün)` : t.label
  }

  const getActionLabel = (rule: any) => {
    const a = ACTIONS.find(ac => ac.value === rule.action)
    return a?.label || rule.action
  }

  const totalRuns = rules.reduce((s, r) => s + (r.run_count || 0), 0)
  const activeCount = rules.filter(r => r.active).length

  return (
    <div style={{ padding: 0 }}>
      {showCreate && <CreateRuleModal onClose={() => setShowCreate(false)} onCreated={loadData} />}

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(20,12,0,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(245,158,11,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <ZapOrb size={88} active={activeCount > 0} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>Otomasyon Motoru</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>Zapier/Make olmadan kendi IF-THEN kurallarınızı oluşturun</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[{l:'Toplam Kural',v:rules.length,c:'#94a3b8'},{l:'Aktif',v:activeCount,c:'#10b981'},{l:'Toplam Çalışma',v:totalRuns,c:'#f59e0b'},{l:'Webhook Logu',v:stats?.incoming||0,c:'#06b6d4'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:18, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#78350f,#f59e0b)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            <Plus size={15} /> Yeni Kural
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.3)', padding:4, borderRadius:12, width:'fit-content', marginBottom:20, border:'1px solid rgba(255,255,255,0.05)' }}>
        {[{id:'rules',label:'🤖 Kurallar'},{id:'logs',label:'📋 Çalışma Logları'},{id:'integrations',label:'🔗 Entegrasyonlar'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===t.id?'linear-gradient(135deg,#78350f,#f59e0b)':'transparent', color:activeTab===t.id?'#fff':'#64748b', boxShadow:activeTab===t.id?'0 3px 12px rgba(245,158,11,0.3)':'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* RULES TAB */}
      {activeTab === 'rules' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', height:80, alignItems:'center' }}><RefreshCw size={20} style={{ color:'#475569', animation:'za-spin 1s linear infinite' }} /></div>
          ) : rules.length === 0 ? (
            <div style={{ textAlign:'center', padding:56, background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.05)', borderRadius:18 }}>
              <div style={{ fontSize:48, margin:'0 0 16px' }}>⚡</div>
              <h3 style={{ color:'#fff', fontSize:16, fontWeight:700, margin:'0 0 8px' }}>Henüz kural yok</h3>
              <p style={{ color:'#475569', fontSize:13, margin:'0 0 20px' }}>İlk IF-THEN kuralınızı oluşturun — Zapier'e gerek yok</p>
              <button onClick={() => setShowCreate(true)}
                style={{ padding:'11px 24px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#78350f,#f59e0b)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                <Plus size={14} style={{ display:'inline', marginRight:6 }} /> İlk Kuralı Oluştur
              </button>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:`1px solid ${rule.active?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)'}`, borderRadius:16, padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {/* Active indicator */}
                  <div style={{ width:10, height:10, borderRadius:'50%', background:rule.active?'#10b981':'#475569', flexShrink:0, boxShadow:rule.active?'0 0 8px #10b98166':'none' }} />

                  {/* Rule info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:'0 0 6px' }}>{rule.name}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#fbbf24', fontSize:11, padding:'3px 9px', borderRadius:20 }}>
                        EĞER: {getTriggerLabel(rule)}
                      </span>
                      <span style={{ color:'#334155', fontSize:11 }}>→</span>
                      <span style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#34d399', fontSize:11, padding:'3px 9px', borderRadius:20 }}>
                        O ZAMAN: {getActionLabel(rule)}
                      </span>
                    </div>
                    {rule.action_message && (
                      <p style={{ color:'#475569', fontSize:11, margin:'6px 0 0', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        "{rule.action_message}"
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <p style={{ color:'#f59e0b', fontWeight:800, fontSize:16, margin:0 }}>{rule.run_count||0}</p>
                    <p style={{ color:'#334155', fontSize:10, margin:0 }}>çalıştı</p>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => toggleRule(rule.id)}
                      style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${rule.active?'rgba(16,185,129,0.3)':'rgba(100,116,139,0.2)'}`, background:'transparent', color:rule.active?'#34d399':'#64748b', cursor:'pointer' }}>
                      {rule.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                    <button onClick={() => testRule(rule.id)} disabled={testing === rule.id}
                      title="Şimdi Çalıştır"
                      style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(6,182,212,0.3)', background:'rgba(6,182,212,0.08)', color:'#22d3ee', cursor:'pointer' }}>
                      {testing === rule.id ? <RefreshCw size={13} style={{ animation:'za-spin 1s linear infinite' }} /> : <Play size={13} />}
                    </button>
                    <button onClick={() => deleteRule(rule.id)}
                      style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.06)', color:'#f87171', cursor:'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Last run info */}
                {rule.last_run_at && (
                  <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
                    <Clock size={11} color="#334155" />
                    <span style={{ color:'#334155', fontSize:11 }}>Son çalışma: {new Date(rule.last_run_at).toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ color:'#fff', fontSize:13, fontWeight:700, margin:0 }}>📋 Kural Yürütme Logları</h3>
          </div>
          {logs.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#475569' }}>
              <p style={{ fontSize:24, margin:'0 0 10px' }}>📋</p>
              <p style={{ fontSize:13, margin:0 }}>Henüz log yok — kurallar çalıştıkça burada görünür</p>
            </div>
          ) : (
            <div>
              {logs.slice(0,30).map((log: any, i: number) => (
                <div key={i} style={{ padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ color:'#fff', fontSize:12, fontWeight:600, margin:0 }}>{log.source || 'Otomasyon'}</p>
                    <p style={{ color:'#475569', fontSize:11, margin:'2px 0 0' }}>{log.destination || 'Aksiyon gerçekleşti'}</p>
                  </div>
                  <span style={{ color:'#1e293b', fontSize:10 }}>{new Date(log.received_at).toLocaleString('tr-TR')}</span>
                  <button onClick={() => setExpandLog(expandLog === `${i}` ? null : `${i}`)} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', padding:2 }}>
                    <ChevronDown size={14} style={{ transform:expandLog===`${i}`?'rotate(180deg)':'none', transition:'transform 0.2s' }} />
                  </button>
                  {expandLog === `${i}` && log.payload && (
                    <code style={{ position:'absolute', marginTop:80, background:'#060a1c', borderRadius:8, padding:'8px 12px', color:'#94a3b8', fontSize:10, fontFamily:'monospace' }}>
                      {JSON.stringify(JSON.parse(log.payload), null, 2)}
                    </code>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INTEGRATIONS TAB */}
      {activeTab === 'integrations' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Incoming Webhook */}
          <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(245,158,11,0.15)', borderRadius:18, padding:22 }}>
            <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>📥 Gelen Webhook URL'niz</h3>
            <p style={{ color:'#64748b', fontSize:12, margin:'0 0 12px' }}>Bu URL'yi Zapier/Make/n8n'e yapıştırın — gelen veriler otomatik lead olarak eklenir</p>
            <div style={{ display:'flex', gap:8 }}>
              <code style={{ flex:1, background:'#060a1c', border:'1px solid rgba(245,158,11,0.2)', borderRadius:9, padding:'10px 14px', color:'#fbbf24', fontSize:11, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {webhookUrl || 'Yükleniyor...'}
              </code>
              <button onClick={() => copy(webhookUrl)} style={{ padding:'10px 14px', borderRadius:9, border:'none', background:'rgba(245,158,11,0.15)', color:'#f59e0b', cursor:'pointer' }}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:12 }}>
              {[{n:'Zapier',l:'Z',c:'#ef4444',d:'hooks.zapier.com'},{n:'Make',l:'M',c:'#8b5cf6',d:'hook.eu1.make.com'},{n:'n8n',l:'N',c:'#10b981',d:'n8n.io/webhook'}].map(p => (
                <div key={p.n} style={{ background:`${p.c}08`, border:`1px solid ${p.c}20`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:`${p.c}20`, border:`1px solid ${p.c}40`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:11, color:p.c, flexShrink:0 }}>{p.l}</div>
                  <div><p style={{ color:'#fff', fontSize:12, fontWeight:600, margin:0 }}>{p.n}</p><p style={{ color:'#334155', fontSize:10, margin:0 }}>{p.d}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Beklenen format */}
          <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, padding:22 }}>
            <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>📦 Beklenen Webhook Formatı</h3>
            <code style={{ display:'block', background:'#060a1c', borderRadius:10, padding:'14px 18px', color:'#34d399', fontSize:12, fontFamily:'monospace', lineHeight:1.8 }}>
              {`{\n  "name": "Mehmet Yılmaz",\n  "company": "ABC Ltd",\n  "phone": "+905551234567",\n  "email": "mehmet@abc.com",\n  "source": "zapier"\n}`}
            </code>
          </div>
        </div>
      )}

      <style>{`@keyframes za-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
