'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''

function redirectLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
  }
}

const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#e2e8f0',fontSize:13,padding:'9px 12px',outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit' }
const lbl: React.CSSProperties = { display:'block',color:'#64748b',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }
const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:20,marginBottom:14 }
const sec: React.CSSProperties = { color:'#94a3b8',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14,display:'block' }

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={lbl}>{label}</label>{children}</div>
}
function G2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}

// Color themes for statuses
const COLOR_PRESETS: Record<string, { bg: string; text: string; dot: string; ring: string; name: string }> = {
  blue:    { name: 'Mavi',       bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', ring: '#BFDBFE' },
  yellow:  { name: 'Sarı',       bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B', ring: '#FDE68A' },
  cyan:    { name: 'Camgöbeği',  bg: '#ECFEFF', text: '#155E75', dot: '#06B6D4', ring: '#A5F3FC' },
  emerald: { name: 'Açık Yeşil', bg: '#F0FDF4', text: '#15803D', dot: '#22C55E', ring: '#BBF7D0' },
  purple:  { name: 'Mor',        bg: '#FDF4FF', text: '#7E22CE', dot: '#A855F7', ring: '#E9D5FF' },
  green:   { name: 'Koyu Yeşil', bg: '#DCFCE7', text: '#14532D', dot: '#16A34A', ring: '#86EFAC' },
  red:     { name: 'Kırmızı',    bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', ring: '#FECACA' },
  gray:    { name: 'Gri',        bg: '#F8FAFC', text: '#64748B', dot: '#94A3B8', ring: '#E2E8F0' },
}

const DEFAULT_STATUSES = [
  { key: 'new',       label: 'Yeni',           color: 'blue' },
  { key: 'contacted', label: 'İletişimde',      color: 'yellow' },
  { key: 'qualified', label: 'Nitelikli',       color: 'cyan' },
  { key: 'replied',   label: 'Cevap Verdi',     color: 'emerald' },
  { key: 'offered',   label: 'Teklif Verildi',  color: 'purple' },
  { key: 'won',       label: 'Kazanıldı',       color: 'green' },
  { key: 'lost',      label: 'Kaybedildi',      color: 'red' },
]

const DEFAULT: Record<string, any> = {
  page_title:       'Lead Veritabanı',
  stat_today_label: 'Bugün Eklenen',
  stat_won_label:   'Kazanılan',
  stat_hot_label:   'Sıcak Lead',
  statuses:         DEFAULT_STATUSES,
  score_high:       75,
  score_medium:     50,
  score_low:        30,
  hot_threshold:    75,
  default_page_size: 20,
  feature_kv_bul:   true,
  feature_import:   true,
  feature_export:   true,
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 2,
        background: value ? '#22c55e' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: value ? 'flex-end' : 'flex-start',
      }}>
      <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}/>
    </button>
  )
}

function StatusRow({ s, idx, onChange }: { s: any; idx: number; onChange: (i: number, patch: any) => void }) {
  const preset = COLOR_PRESETS[s.color] || COLOR_PRESETS.gray
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 200px 80px', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 6 }}>
      {/* Key (readonly) */}
      <span style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>{s.key}</span>
      {/* Label */}
      <input value={s.label} onChange={e => onChange(idx, { label: e.target.value })} style={{ ...inp, padding: '7px 10px' }} placeholder="Durum adı" />
      {/* Color preset picker */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {Object.entries(COLOR_PRESETS).map(([key, p]) => (
          <button key={key} title={p.name} onClick={() => onChange(idx, { color: key })}
            style={{ width: 20, height: 20, borderRadius: '50%', background: p.dot, border: s.color === key ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', outline: 'none', transition: 'all 0.15s' }}/>
        ))}
      </div>
      {/* Preview pill */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: preset.bg, color: preset.text, fontSize: 11, fontWeight: 700, border: `1px solid ${preset.ring}`, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: preset.dot, flexShrink: 0 }}/>
        {s.label || 'Önizleme'}
      </span>
    </div>
  )
}

export default function AdminLeadsPage() {
  const [cfg, setCfg]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch(`${API}/api/admin/leads-config`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(async r => {
        if (r.status === 401 || r.status === 403) { redirectLogin(); return }
        const d = await r.json()
        setCfg(d.config && Object.keys(d.config).length > 0 ? { ...DEFAULT, ...d.config, statuses: d.config.statuses || DEFAULT.statuses } : { ...DEFAULT })
      })
      .catch(() => setCfg({ ...DEFAULT }))
      .finally(() => setLoading(false))
  }, [])

  const set = (key: string, val: any) => setCfg((c: any) => ({ ...c, [key]: val }))

  const setStatus = (idx: number, patch: any) =>
    setCfg((c: any) => ({ ...c, statuses: c.statuses.map((s: any, i: number) => i === idx ? { ...s, ...patch } : s) }))

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/admin/leads-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cfg),
      })
      if (r.status === 401 || r.status === 403) { redirectLogin(); return }
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Kayıt başarısız')
      setMsg({ type: 'ok', text: '✅ Kaydedildi! Lead sayfası güncellendi.' })
    } catch (e: any) { setMsg({ type: 'err', text: '❌ ' + e.message }) }
    finally { setSaving(false); setTimeout(() => setMsg(null), 4000) }
  }

  if (loading || !cfg) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#475569', fontSize: 14 }}>
      Yükleniyor...
    </div>
  )

  return (
    <div style={{ maxWidth: 860, fontFamily: '-apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: 0 }}>🎯 Lead Sayfası Editörü</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Durum etiketleri, puan eşikleri ve özellik kontrolleri</p>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
          {saving ? 'Kaydediliyor...' : '💾 Kaydet & Yayınla'}
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {/* ── BÖLÜM 1: Sayfa Başlığı & Etiketler ── */}
      <div style={card}>
        <span style={sec}>📝 Sayfa Başlığı & Stat Etiketleri</span>
        <F label="Sayfa Başlığı">
          <input value={cfg.page_title || ''} onChange={e => set('page_title', e.target.value)} style={inp} placeholder="Lead Veritabanı" />
        </F>
        <G2>
          <F label="Bugün Eklenen Etiketi"><input value={cfg.stat_today_label || ''} onChange={e => set('stat_today_label', e.target.value)} style={inp} placeholder="Bugün Eklenen"/></F>
          <F label="Kazanılan Etiketi"><input value={cfg.stat_won_label || ''} onChange={e => set('stat_won_label', e.target.value)} style={inp} placeholder="Kazanılan"/></F>
        </G2>
        <F label="Sıcak Lead Etiketi">
          <input value={cfg.stat_hot_label || ''} onChange={e => set('stat_hot_label', e.target.value)} style={inp} placeholder="Sıcak Lead" />
        </F>
      </div>

      {/* ── BÖLÜM 2: Durum Yönetimi ── */}
      <div style={card}>
        <span style={sec}>🏷️ Durum Etiketleri & Renkleri</span>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 200px 80px', gap: 10, padding: '0 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 8 }}>
          <span style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sistem Kodu</span>
          <span style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Görünen İsim</span>
          <span style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Renk Paleti</span>
          <span style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Önizleme</span>
        </div>
        {(cfg.statuses || DEFAULT_STATUSES).map((s: any, i: number) => (
          <StatusRow key={s.key} s={s} idx={i} onChange={setStatus} />
        ))}
      </div>

      {/* ── BÖLÜM 3: Puan Eşikleri ── */}
      <div style={card}>
        <span style={sec}>📊 Puan Eşikleri (Score Thresholds)</span>
        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '3px 10px', borderRadius: 6, background: '#DCFCE7', color: '#14532D', fontSize: 11, fontWeight: 700 }}>Yeşil (≥ Yüksek)</span>
          <span style={{ padding: '3px 10px', borderRadius: 6, background: '#EDE9FE', color: '#6D28D9', fontSize: 11, fontWeight: 700 }}>Mor (≥ Orta)</span>
          <span style={{ padding: '3px 10px', borderRadius: 6, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700 }}>Sarı (≥ Düşük)</span>
          <span style={{ padding: '3px 10px', borderRadius: 6, background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 700 }}>Kırmızı (Altı)</span>
        </div>
        <G2>
          <F label={`Yüksek Eşiği (şu an: ${cfg.score_high ?? 75})`}>
            <input type="number" min={0} max={100} value={cfg.score_high ?? 75} onChange={e => set('score_high', Number(e.target.value))} style={inp}/>
          </F>
          <F label={`Orta Eşiği (şu an: ${cfg.score_medium ?? 50})`}>
            <input type="number" min={0} max={100} value={cfg.score_medium ?? 50} onChange={e => set('score_medium', Number(e.target.value))} style={inp}/>
          </F>
        </G2>
        <F label={`Düşük Eşiği (şu an: ${cfg.score_low ?? 30})`}>
          <input type="number" min={0} max={100} value={cfg.score_low ?? 30} onChange={e => set('score_low', Number(e.target.value))} style={inp}/>
        </F>
      </div>

      {/* ── BÖLÜM 4: Sıcak Lead & Sayfa ── */}
      <div style={card}>
        <span style={sec}>🔥 Sıcak Lead & Sayfa Boyutu</span>
        <G2>
          <F label={`Sıcak Lead Eşiği (şu an: ${cfg.hot_threshold ?? 75})`}>
            <input type="number" min={0} max={100} value={cfg.hot_threshold ?? 75} onChange={e => set('hot_threshold', Number(e.target.value))} style={inp}/>
            <span style={{ color: '#475569', fontSize: 11, marginTop: 5, display: 'block' }}>Bu puanın üzeri "Sıcak Lead" sayılır</span>
          </F>
          <F label="Varsayılan Sayfa Boyutu">
            <select value={cfg.default_page_size ?? 20} onChange={e => set('default_page_size', Number(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} lead / sayfa</option>)}
            </select>
          </F>
        </G2>
      </div>

      {/* ── BÖLÜM 5: Özellik Kontrolleri ── */}
      <div style={card}>
        <span style={sec}>🔧 Özellik Kontrolleri (Feature Flags)</span>
        {[
          { key: 'feature_kv_bul', label: 'Karar Verici Bul (KV Bul)', desc: 'Leadler için AI ile karar verici bulma butonu' },
          { key: 'feature_import', label: 'Excel / CSV İçe Aktar', desc: 'Toplu lead yükleme özelliği' },
          { key: 'feature_export', label: 'Excel / CSV Dışa Aktar', desc: 'Leadleri Excel olarak indirme özelliği' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>{desc}</p>
            </div>
            <Toggle value={cfg[key] !== false} onChange={v => set(key, v)} />
          </div>
        ))}
      </div>

      {/* ── Alt Kaydet ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={save} disabled={saving} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
          {saving ? 'Kaydediliyor...' : '💾 Kaydet & Yayınla'}
        </button>
      </div>
    </div>
  )
}
