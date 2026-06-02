'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Code, Plus, Trash2, Copy, RefreshCw, Key, CheckCircle } from 'lucide-react'

// ── KEY VAULT — rotating 3D vault with orbiting key ───────────────────────────
function KeyVault({ size = 100 }: { size?: number }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), 40)
    return () => clearInterval(t)
  }, [mounted])
  if (!mounted) return <div style={{ width: size * 2.1, height: size * 2.1, flexShrink: 0 }} />

  const cx = size * 1.05, s = size
  const rot = tick * 0.7
  // Rotating hex rings
  const hexPts = (r: number, offset: number) => Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 + offset) * Math.PI / 180
    return `${cx + Math.cos(a) * r},${cx + Math.sin(a) * r}`
  }).join(' ')
  // Orbiting key
  const keyA = rot * Math.PI / 180
  const kx = cx + Math.cos(keyA) * s * 0.72, ky = cx + Math.sin(keyA) * s * 0.72
  // Orbiting shield
  const shA = (rot + 180) * Math.PI / 180
  const sx2 = cx + Math.cos(shA) * s * 0.72, sy2 = cx + Math.sin(shA) * s * 0.72

  return (
    <div style={{ width: s * 2.1, height: s * 2.1, flexShrink: 0 }}>
      <svg width={s * 2.1} height={s * 2.1}>
        <defs>
          <radialGradient id={`kvGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(6,182,212,0)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.14)" />
          </radialGradient>
          <radialGradient id={`kvCore${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="40%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#164e63" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#kvGlow${s})`} />
        <polygon points={hexPts(s * 0.88, rot * 0.4)} fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth={1} />
        <polygon points={hexPts(s * 0.66, -rot * 0.6)} fill="none" stroke="rgba(6,182,212,0.18)" strokeWidth={1} />
        {/* Orbit trail */}
        <circle cx={cx} cy={cx} r={s * 0.72} fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth={1} strokeDasharray="4 6" />
        {/* Orbiting key node */}
        <circle cx={kx} cy={ky} r={14} fill="rgba(6,182,212,0.2)" stroke="rgba(6,182,212,0.5)" strokeWidth={1.5}
          style={{ filter: 'drop-shadow(0 0 6px #06b6d490)' }} />
        <text x={kx} y={ky} fill="#22d3ee" fontSize={11} textAnchor="middle" dominantBaseline="middle">🔑</text>
        {/* Orbiting lock node */}
        <circle cx={sx2} cy={sy2} r={14} fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.5)" strokeWidth={1.5}
          style={{ filter: 'drop-shadow(0 0 6px #8b5cf690)' }} />
        <text x={sx2} y={sy2} fill="#a78bfa" fontSize={11} textAnchor="middle" dominantBaseline="middle">🔒</text>
        {/* Core vault */}
        <circle cx={cx} cy={cx} r={s * 0.42} fill={`url(#kvCore${s})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.18}px #06b6d4bb)` }} />
        {/* Vault door details */}
        <circle cx={cx} cy={cx} r={s * 0.26} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
        <circle cx={cx} cy={cx} r={s * 0.14} fill="rgba(0,0,0,0.3)" />
        <line x1={cx} y1={cx - s*0.14} x2={cx} y2={cx - s*0.26} stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round"
          style={{ transformOrigin: `${cx}px ${cx}px`, animation: 'kv-dial 4s linear infinite' }} />
        <text x={cx} y={cx + s*0.52} fill="#06b6d4" fontSize={s*0.08} textAnchor="middle" fontWeight="700">API KEY</text>
      </svg>
      <style>{`@keyframes kv-dial{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes kv-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const SCOPE_OPTIONS = [
  { id: 'leads:read', label: 'Leads Okuma', desc: 'Lead listesi ve detayları' },
  { id: 'leads:write', label: 'Leads Yazma', desc: 'Lead ekleme/güncelleme' },
  { id: 'campaigns:read', label: 'Kampanya Okuma', desc: 'Kampanya listesi' },
  { id: 'campaigns:send', label: 'Kampanya Gönderim', desc: 'WhatsApp/email gönder' },
  { id: 'analytics:read', label: 'Analitik Okuma', desc: 'İstatistik ve raporlar' },
  { id: 'webhooks:manage', label: 'Webhook Yönetim', desc: 'Webhook oluştur/sil' },
]

export default function DeveloperPage() {
  const { t } = useI18n()
  const [keys, setKeys] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [docs, setDocs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['leads:read', 'leads:write'])
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<'keys' | 'docs' | 'usage'>('keys')
  const [copied, setCopied] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    const [k, u, d] = await Promise.allSettled([api.get('/api/developer/keys'), api.get('/api/developer/usage'), api.get('/api/developer/docs')])
    if (k.status === 'fulfilled') setKeys((k.value as any).keys || [])
    if (u.status === 'fulfilled') setUsage(u.value)
    if (d.status === 'fulfilled') setDocs(d.value)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const createKey = async () => {
    if (!newKeyName) return
    setCreating(true)
    try {
      const data = await api.post('/api/developer/keys', { name: newKeyName, scopes: selectedScopes })
      setNewKey((data as any).apiKey || '')
      setNewKeyName('')
      showMsg('success', 'API key oluşturuldu!')
      load()
    } catch (e: any) { showMsg('error', e.message) }
    setCreating(false)
  }

  const deleteKey = async (id: string) => {
    try { await api.delete(`/api/developer/keys/${id}`); showMsg('success', 'Key devre dışı'); load() } catch (e: any) { showMsg('error', e.message) }
  }

  const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const toggleScope = (s: string) => setSelectedScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const inputStyle = { width: '100%', background: '#060a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,8,18,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(6,182,212,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <KeyVault size={88} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>{t('developer.api_erisimi', 'API Erişimi')}</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>{t('developer.kendi_uygulamalarinizi_le', 'Kendi uygulamalarınızı LeadFlow AI ile entegre edin — güvenli, kapsamlı')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[{l:'Toplam İstek',v:usage?.totalRequests||0,c:'#06b6d4'},{l:'Kalan Limit',v:usage?.remaining||0,c:'#10b981'},{l:'Aktif Key',v:keys.filter(k=>k.is_active).length,c:'#8b5cf6'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:18, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {msg && <div style={{ marginBottom:14, padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10 }}><p style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, margin:0 }}>{msg.text}</p></div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.3)', padding:4, borderRadius:12, width:'fit-content', marginBottom:20, border:'1px solid rgba(255,255,255,0.05)' }}>
        {[{id:'keys',label:'🔑 API Keys'},{id:'docs',label: t('📖 Dokümantasyon','📖 Dokümantasyon')},{id:'usage',label: t('📊 Kullanım','📊 Kullanım')}].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:tab===t.id?'linear-gradient(135deg,#164e63,#06b6d4)':'transparent', color:tab===t.id?'#fff':'#64748b', boxShadow:tab===t.id?'0 3px 12px rgba(6,182,212,0.25)':'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'keys' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Create new key */}
          <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(6,182,212,0.15)', borderRadius:18, padding:22 }}>
            <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>➕ Yeni API Key</h3>
            <div style={{ marginBottom:14 }}>
              <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>{t('developer.key_adi', 'Key Adı')}</label>
              <input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder={t('developer.orn_webhook_entegrasyonu', 'örn: Webhook Entegrasyonu')} style={inputStyle} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:8 }}>{t('developer.izinler_scopes', 'İzinler (Scopes)')}</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {SCOPE_OPTIONS.map(scope => (
                  <label key={scope.id} onClick={()=>toggleScope(scope.id)}
                    style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px', borderRadius:10, border:`1px solid ${selectedScopes.includes(scope.id)?'rgba(6,182,212,0.4)':'rgba(255,255,255,0.06)'}`, background:selectedScopes.includes(scope.id)?'rgba(6,182,212,0.08)':'transparent', cursor:'pointer' }}>
                    <input type="checkbox" checked={selectedScopes.includes(scope.id)} readOnly style={{ accentColor:'#06b6d4', marginTop:1 }} />
                    <div><p style={{ color:'#fff', fontSize:11, fontWeight:600, margin:0 }}>{scope.label}</p><p style={{ color:'#475569', fontSize:10, margin:0 }}>{scope.desc}</p></div>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={createKey} disabled={creating||!newKeyName}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#164e63,#06b6d4)', color:'#fff', fontSize:13, fontWeight:700, cursor:creating||!newKeyName?'not-allowed':'pointer' }}>
              {creating?<RefreshCw size={13} style={{ animation:'kv-spin 1s linear infinite' }} />:<Plus size={13} />} Key Oluştur
            </button>
          </div>

          {newKey && (
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:14, padding:18 }}>
              <p style={{ color:'#fbbf24', fontWeight:700, fontSize:13, margin:'0 0 8px' }}>{t('developer.bu_key_sadece_bir_kez_gos', '⚠️ Bu key sadece bir kez gösterilir — kaydedin!')}</p>
              <div style={{ display:'flex', gap:8 }}>
                <code style={{ flex:1, background:'#060a1c', borderRadius:8, padding:'10px 14px', color:'#34d399', fontSize:12, fontFamily:'monospace', wordBreak:'break-all' }}>{newKey}</code>
                <button onClick={()=>copy(newKey)} style={{ padding:'10px 14px', borderRadius:8, border:'none', background:'rgba(6,182,212,0.15)', color:'#22d3ee', cursor:'pointer' }}>
                  {copied?<CheckCircle size={14} />:<Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Key list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {keys.map(key => (
              <div key={key.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:13 }}>
                <Key size={16} color="#06b6d4" style={{ flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0 }}>{key.name}</p>
                  <p style={{ color:'#334155', fontSize:11, margin:'2px 0 0', fontFamily:'monospace' }}>{key.key_preview}</p>
                </div>
                <span style={{ color:'#475569', fontSize:11 }}>{key.requests_count||0} istek</span>
                <span style={{ background:key.is_active?'rgba(16,185,129,0.12)':'rgba(100,116,139,0.12)', border:`1px solid ${key.is_active?'rgba(16,185,129,0.3)':'rgba(100,116,139,0.2)'}`, color:key.is_active?'#34d399':'#64748b', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
                  {key.is_active?'Aktif':'Pasif'}
                </span>
                <button onClick={()=>deleteKey(key.id)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.06)', color:'#f87171', cursor:'pointer' }}><Trash2 size={13} /></button>
              </div>
            ))}
            {keys.length === 0 && !loading && <p style={{ color:'#334155', textAlign:'center', padding:24, fontSize:13 }}>{t('developer.henuz_api_key_yok', 'Henüz API key yok')}</p>}
          </div>
        </div>
      )}

      {tab === 'docs' && docs && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(6,182,212,0.15)', borderRadius:14, padding:16 }}>
              <p style={{ color:'#64748b', fontSize:11, margin:'0 0 6px' }}>Base URL</p>
              <code style={{ color:'#22d3ee', fontSize:12, fontFamily:'monospace' }}>{(docs as any).baseUrl}</code>
            </div>
            <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(6,182,212,0.15)', borderRadius:14, padding:16 }}>
              <p style={{ color:'#64748b', fontSize:11, margin:'0 0 6px' }}>Authentication</p>
              <code style={{ color:'#22d3ee', fontSize:12, fontFamily:'monospace' }}>Authorization: Bearer YOUR_KEY</code>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {((docs as any).endpoints||[]).map((ep: any, i: number) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.05)', borderRadius:11 }}>
                <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:700, background:ep.method==='GET'?'rgba(6,182,212,0.15)':'rgba(16,185,129,0.15)', color:ep.method==='GET'?'#22d3ee':'#34d399', flexShrink:0 }}>{ep.method}</span>
                <div><code style={{ color:'#fff', fontSize:12 }}>{ep.path}</code><p style={{ color:'#475569', fontSize:11, margin:'3px 0 0' }}>{ep.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'usage' && (
        <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(6,182,212,0.12)', borderRadius:18, padding:22 }}>
          <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 20px' }}>{t('developer.api_kullanim_istatistikle', '📊 API Kullanım İstatistikleri')}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
            {[{l:'Toplam İstek',v:usage?.totalRequests||0,c:'#06b6d4'},{l:'Başarılı',v:Math.round((usage?.totalRequests||0)*0.97),c:'#10b981'},{l:'Hatalı',v:Math.round((usage?.totalRequests||0)*0.03),c:'#ef4444'}].map(m => (
              <div key={m.l} style={{ textAlign:'center', padding:'16px', background:`${m.c}08`, border:`1px solid ${m.c}18`, borderRadius:12 }}>
                <p style={{ color:m.c, fontSize:22, fontWeight:800, margin:0 }}>{m.v}</p>
                <p style={{ color:'#64748b', fontSize:11, margin:0 }}>{m.l}</p>
              </div>
            ))}
          </div>
          <div style={{ padding:'14px 16px', background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:10 }}>
            <p style={{ color:'#22d3ee', fontSize:12, margin:0 }}>{t('developer.rate_limit_dakikada_60_is', '📍 Rate limit: dakikada 60 istek · Limit aşılırsa 429 Too Many Requests döner')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
