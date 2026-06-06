'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Building2, Plus, RefreshCw, BarChart3, Globe, Copy, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'

// ── BRAND GALAXY — orbital brand nodes around central hub ─────────────────────
function BrandGalaxy({ size = 100, brandCount = 0 }: { size?: number; brandCount?: number }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), 40)
    return () => clearInterval(t)
  }, [mounted])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const rot = tick * 0.45
  const nodeCount = Math.max(brandCount, 5)
  const colors = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899']

  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const ring = i < 3 ? 0.56 : 0.82
    const degOffset = i < 3 ? rot : -rot * 0.7
    const a = (i * (360 / nodeCount) + degOffset) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * ring, y: cx + Math.sin(a) * s * ring, color: colors[i % colors.length], active: i < brandCount }
  })

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`bgGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.14)" />
          </radialGradient>
          <radialGradient id={`bgCore${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="40%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#bgGlow${s})`} />
        {[0.52, 0.72, 0.9].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth={0.8}
            strokeDasharray="5 7" style={{ animation: `bg-ring ${9+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {nodes.map((node, i) => (
          <g key={i}>
            <line x1={cx} y1={cx} x2={node.x} y2={node.y} stroke={`${node.color}${node.active?'30':'18'}`} strokeWidth={0.8} strokeDasharray="3 5" />
            <circle cx={node.x} cy={node.y} r={node.active ? 13 : 9}
              fill={`${node.color}${node.active?'25':'12'}`} stroke={`${node.color}${node.active?'55':'25'}`} strokeWidth={1.5}
              style={{ filter: node.active ? `drop-shadow(0 0 5px ${node.color}80)` : 'none' }} />
            {node.active && <text x={node.x} y={node.y} fill={node.color} fontSize={8} textAnchor="middle" dominantBaseline="middle" fontWeight="800">B</text>}
          </g>
        ))}
        <circle cx={cx} cy={cx} r={s * 0.38} fill={`url(#bgCore${s})`}
          style={{ filter: 'drop-shadow(0 0 16px #8b5cf6bb)' }} />
        <text x={cx} y={cx - 4} fill="white" fontSize={s * 0.12} textAnchor="middle" dominantBaseline="middle" fontWeight="900">WL</text>
        <text x={cx} y={cx + s * 0.14} fill="rgba(255,255,255,0.5)" fontSize={s * 0.065} textAnchor="middle">BAYI</text>
      </svg>
      <style>{`@keyframes bg-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function WhitelabelPage() {
  const { t } = useI18n()
  const [brands, setBrands] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [brandStats, setBrandStats] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newBrandResult, setNewBrandResult] = useState<any>(null)
  const [form, setForm] = useState({ name: '', domain: '', logo_url: '', primary_color: '#3b82f6', secondary_color: '#1e293b', plan_type: 'pro', revenue_share: 20 })

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    const [b, s] = await Promise.allSettled([api.get('/api/whitelabel/brands'), api.get('/api/whitelabel/summary')])
    if (b.status === 'fulfilled') setBrands((b.value as any).brands || [])
    if (s.status === 'fulfilled') setSummary(s.value)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const createBrand = async () => {
    if (!form.name) return
    setCreating(true)
    try {
      const data = await api.post('/api/whitelabel/brands', form)
      setNewBrandResult(data)
      showMsg('success', `${(data as any).brand?.name} bayisi oluşturuldu!`)
      setShowForm(false)
      setForm({ name:'', domain:'', logo_url:'', primary_color:'#3b82f6', secondary_color:'#1e293b', plan_type:'pro', revenue_share:20 })
      load()
    } catch (e: any) { showMsg('error', e.message) }
    setCreating(false)
  }

  const loadBrandStats = async (id: string) => {
    if (selectedBrand === id) { setSelectedBrand(null); return }
    setSelectedBrand(id)
    try { const data = await api.get(`/api/whitelabel/brands/${id}/stats`); setBrandStats(data) } catch {}
  }

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/api/whitelabel/brands/${id}`, { status }); showMsg('success', 'Güncellendi'); load() } catch (e: any) { showMsg('error', e.message) }
  }

  const copy = (text: string) => navigator.clipboard?.writeText(text)
  const inputStyle = { width: '100%', background: '#060a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
  const planColors: Record<string, string> = { basic:'#64748b', pro:'#06b6d4', enterprise:'#8b5cf6' }

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(8,0,20,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(139,92,246,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(139,92,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <BrandGalaxy size={88} brandCount={brands.length} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>White-Label / Bayi Sistemi</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>{t('whitelabel.kendi_markanizla_bayiler', 'Kendi markanızla bayiler oluşturun — özel domain, logo, renk ve gelir paylaşımı')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[{l:'Toplam Bayi',v:summary?.totalBrands||0,c:'#8b5cf6'},{l:'Aktif Bayi',v:summary?.activeBrands||0,c:'#10b981'},{l:'Aylık Gelir',v:`₺${(summary?.estimatedMonthlyRevenue||0).toLocaleString()}`,c:'#f59e0b'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:18, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={()=>setShowForm(!showForm)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#3b0764,#8b5cf6)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            <Plus size={15} /> Yeni Bayi
          </button>
        </div>
      </div>

      {/* Enterprise warning */}
      <div style={{ marginBottom:16, padding:'12px 18px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
        <AlertTriangle size={15} color="#f59e0b" />
        <p style={{ color:'#fbbf24', fontSize:12, margin:0 }}><strong>{t('whitelabel.enterprise_ozelligi', 'Enterprise özelliği:')}</strong>{t('whitelabel.her_bayinin_kendi_izole_o', 'Her bayinin kendi izole ortamı vardır. Domain DNS kaydını bayiye ait sunucuya yönlendirmeniz gerekir.')}</p>
      </div>

      {msg && <div style={{ marginBottom:14, padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10 }}><p style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, margin:0 }}>{msg.text}</p></div>}

      {/* New brand form */}
      {showForm && (
        <div style={{ background:'#ffffff', border:'1px solid rgba(139,92,246,0.25)', borderRadius:18, padding:24, marginBottom:20 }}>
          <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 18px' }}>{t('whitelabel.yeni_bayi_olustur', '🏢 Yeni Bayi Oluştur')}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>{t('whitelabel.marka_adi', 'Marka Adı *')}</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t('whitelabel.orn_abc_crm', 'örn: ABC CRM')} style={inputStyle} /></div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Domain (opsiyonel)</label><input value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})} placeholder="crm.firmam.com" style={inputStyle} /></div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Logo URL</label><input value={form.logo_url} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="https://..." style={inputStyle} /></div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Plan</label>
              <select value={form.plan_type} onChange={e=>setForm({...form,plan_type:e.target.value})} style={{ ...inputStyle, height:44 }}>
                <option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Ana Renk</label>
              <div style={{ display:'flex', gap:8 }}>
                <input type="color" value={form.primary_color} onChange={e=>setForm({...form,primary_color:e.target.value})} style={{ width:44, height:44, borderRadius:8, border:'1px solid #e2e8f0', background:'transparent', cursor:'pointer' }} />
                <input value={form.primary_color} onChange={e=>setForm({...form,primary_color:e.target.value})} style={{ ...inputStyle, flex:1 }} />
              </div>
            </div>
            <div><label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>{t('whitelabel.gelir_payi', 'Gelir Payı (%)')}</label><input type="number" min={0} max={50} value={form.revenue_share} onChange={e=>setForm({...form,revenue_share:parseInt(e.target.value)})} style={inputStyle} /></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={createBrand} disabled={creating||!form.name}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#3b0764,#8b5cf6)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {creating?<RefreshCw size={13} style={{ animation:'bg-spin 1s linear infinite' }} />:<Building2 size={13} />} {creating?'Oluşturuluyor...':'Bayi Oluştur'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{ padding:'10px 18px', borderRadius:11, border:'1px solid #e2e8f0', background:'transparent', color:'#64748b', fontSize:13, cursor:'pointer' }}>{t('whitelabel.iptal', 'İptal')}</button>
          </div>
        </div>
      )}

      {/* New brand credentials */}
      {newBrandResult && (
        <div style={{ marginBottom:16, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14, padding:20 }}>
          <h3 style={{ color:'#047857', fontWeight:700, fontSize:14, margin:'0 0 12px' }}>{t('whitelabel.bayi_olusturuldu', '✅ Bayi Oluşturuldu!')}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[{l:'Admin Email',v:newBrandResult.adminEmail},{l:'Geçici Şifre',v:newBrandResult.tempPassword}].map(f => (
              <div key={f.l} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
                <p style={{ color:'#64748b', fontSize:11, margin:'0 0 4px' }}>{f.l}</p>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <code style={{ color:'#fff', fontSize:12, fontFamily:'monospace', flex:1 }}>{f.v}</code>
                  <button onClick={()=>copy(f.v||'')} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:2 }}><Copy size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color:'#f59e0b', fontSize:11, margin:'10px 0 0' }}>{t('whitelabel.bu_bilgileri_kaydedin_sif', '⚠️ Bu bilgileri kaydedin — şifre bir daha gösterilmeyecek!')}</p>
        </div>
      )}

      {/* Brand list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', height:80, alignItems:'center' }}><RefreshCw size={20} style={{ color:'#475569', animation:'bg-spin 1s linear infinite' }} /></div>
      ) : brands.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:'#475569' }}>
          <p style={{ fontSize:36, margin:'0 0 12px' }}>🏢</p>
          <p style={{ fontSize:14, margin:0 }}>{t('whitelabel.henuz_bayi_yok_yeni_bayi', 'Henüz bayi yok — yeni bayi oluşturarak gelir paylaşımı başlatın')}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {brands.map(brand => (
            <div key={brand.id} style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:16, padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:44, height:44, borderRadius:11, border:'1px solid #e2e8f0', background:brand.primary_color||'#3b82f6', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {brand.logo_url ? <img src={brand.logo_url} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:'cover' }} /> : <span style={{ color:'#fff', fontSize:16, fontWeight:800 }}>{brand.name?.[0]}</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <p style={{ color:'#0f172a', fontWeight:700, fontSize:14, margin:0 }}>{brand.name}</p>
                    <span style={{ background:`${planColors[brand.plan_type]||'#64748b'}18`, border:`1px solid ${planColors[brand.plan_type]||'#64748b'}30`, color:planColors[brand.plan_type]||'#64748b', fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:600 }}>{brand.plan_type}</span>
                    <span style={{ background:brand.status==='active'?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.1)', border:`1px solid ${brand.status==='active'?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.2)'}`, color:brand.status==='active'?'#34d399':'#f87171', fontSize:10, padding:'2px 7px', borderRadius:20 }}>
                      {brand.status==='active'?'Aktif':'Pasif'}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569', flexWrap:'wrap' }}>
                    {brand.domain && <span><Globe size={10} style={{ display:'inline', marginRight:3 }} />{brand.domain}</span>}
                    <span><DollarSign size={10} style={{ display:'inline', marginRight:2 }} />%{brand.revenue_share} gelir payı</span>
                    <span>{new Date(brand.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={()=>loadBrandStats(brand.id)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#94a3b8', fontSize:11, cursor:'pointer' }}>
                    <BarChart3 size={12} /> İstatistik
                  </button>
                  <button onClick={()=>updateStatus(brand.id,brand.status==='active'?'inactive':'active')}
                    style={{ padding:'6px 12px', borderRadius:9, border:`1px solid ${brand.status==='active'?'rgba(239,68,68,0.2)':'rgba(16,185,129,0.2)'}`, background:brand.status==='active'?'rgba(239,68,68,0.06)':'rgba(16,185,129,0.06)', color:brand.status==='active'?'#f87171':'#34d399', fontSize:11, cursor:'pointer' }}>
                    {brand.status==='active'?'Durdur':'Aktifleştir'}
                  </button>
                </div>
              </div>
              {selectedBrand === brand.id && brandStats && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.05)', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
                  {[{l:'Kullanıcı',v:brandStats.stats?.totalUsers},{l:'Lead',v:brandStats.stats?.totalLeads},{l:'Mesaj',v:brandStats.stats?.totalMessages},{l:'Video',v:brandStats.stats?.totalVideos},{l:'Aylık Gelir',v:`₺${(brandStats.stats?.monthlyRevenue||0).toLocaleString()}`}].map(st => (
                    <div key={st.l} style={{ textAlign:'center', padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:9 }}>
                      <p style={{ color:'#0f172a', fontWeight:800, fontSize:14, margin:0 }}>{st.v}</p>
                      <p style={{ color:'#475569', fontSize:10, margin:0 }}>{st.l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes bg-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
