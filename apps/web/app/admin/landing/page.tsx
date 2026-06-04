'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }

const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit',resize:'none' as const }
const label_: React.CSSProperties = { display:'block',color:'#94a3b8',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8 }
const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

function Section({ title, emoji, children }: { title:string;emoji:string;children:React.ReactNode }) {
  return <div style={card}><h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 18px',display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>{emoji}</span>{title}</h3>{children}</div>
}

function Field({ label, children }: { label:string;children:React.ReactNode }) {
  return <div style={{marginBottom:14}}><label style={label_}>{label}</label>{children}</div>
}

export default function AdminLandingPage() {
  const [cfg, setCfg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{type:'ok'|'err';text:string}|null>(null)

  useEffect(() => {
    // Fetch current home config
    fetch(`${API}/api/market-pages/public/home`)
      .then(r => r.json())
      .then(d => { if (d.page) setCfg(d.page) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showMsg = (type:'ok'|'err', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),4000) }

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/admin/market-pages/home`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getAdminToken()}` },
        body: JSON.stringify({ ...cfg, updated_at: new Date().toISOString() })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      showMsg('ok', '✅ Ana sayfa güncellendi! Birkaç saniye içinde yayında.')
    } catch(e:any) { showMsg('err', '❌ '+e.message) }
    finally { setSaving(false) }
  }

  const updateStats = (i:number, key:string, val:string) => {
    const s = [...(cfg.stats||[])]
    s[i] = {...s[i],[key]:val}
    setCfg({...cfg,stats:s})
  }

  const updateFeature = (i:number, key:string, val:string) => {
    const f = [...(cfg.features||[])]
    f[i] = {...f[i],[key]:val}
    setCfg({...cfg,features:f})
  }

  const updatePriceFeature = (i:number, val:string) => {
    const f = [...(cfg.price_features||[])]
    f[i] = val
    setCfg({...cfg,price_features:f})
  }

  if (loading) return <div style={{color:'#475569',padding:40,textAlign:'center'}}>Yükleniyor...</div>

  return (
    <div style={{maxWidth:900}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 4px',letterSpacing:'-0.02em'}}>🏠 Ana Landing Page Editörü</h1>
          <p style={{color:'#475569',fontSize:13,margin:0}}>Ana sayfa içeriğini buradan düzenleyin — değişiklikler anında yayına girer</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <a href="/" target="_blank" rel="noreferrer" style={{padding:'9px 16px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#94a3b8',textDecoration:'none',fontSize:13}}>👁 Önizle</a>
          <button onClick={save} disabled={saving} style={{padding:'10px 22px',borderRadius:10,border:'none',background:saving?'rgba(59,130,246,0.4)':'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:'0 4px 15px rgba(59,130,246,0.3)'}}>
            {saving?'Kaydediliyor...':'💾 Kaydet & Yayınla'}
          </button>
        </div>
      </div>

      {msg && <div style={{padding:'11px 16px',borderRadius:10,marginBottom:18,background:msg.type==='ok'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.type==='ok'?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,color:msg.type==='ok'?'#34d399':'#f87171',fontSize:13}}>{msg.text}</div>}

      {cfg && <>
        {/* Hero */}
        <Section title="Hero Bölümü" emoji="🦸">
          <Field label="Badge (üst etiket)">
            <input value={cfg.hero_badge||''} onChange={e=>setCfg({...cfg,hero_badge:e.target.value})} style={inp} placeholder="Yapay Zeka Destekli..." />
          </Field>
          <Field label="Ana Başlık (satır başına \n ile ayırın)">
            <textarea value={cfg.hero_headline||''} onChange={e=>setCfg({...cfg,hero_headline:e.target.value})} rows={2} style={inp} placeholder="Doğru Müşteriye\nDoğru Anda Ulaş" />
          </Field>
          <Field label="Alt Başlık">
            <textarea value={cfg.hero_subheadline||''} onChange={e=>setCfg({...cfg,hero_subheadline:e.target.value})} rows={3} style={inp} />
          </Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="CTA Butonu Metni"><input value={cfg.hero_cta_primary_text||''} onChange={e=>setCfg({...cfg,hero_cta_primary_text:e.target.value})} style={inp} /></Field>
            <Field label="CTA URL"><input value={cfg.hero_cta_primary_url||''} onChange={e=>setCfg({...cfg,hero_cta_primary_url:e.target.value})} style={inp} /></Field>
            <Field label="İkincil CTA Metni"><input value={cfg.hero_cta_secondary_text||''} onChange={e=>setCfg({...cfg,hero_cta_secondary_text:e.target.value})} style={inp} /></Field>
            <Field label="İkincil CTA URL"><input value={cfg.hero_cta_secondary_url||''} onChange={e=>setCfg({...cfg,hero_cta_secondary_url:e.target.value})} style={inp} /></Field>
          </div>
        </Section>

        {/* Stats */}
        <Section title="İstatistikler (Hero altındaki 4 rakam)" emoji="📊">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {(cfg.stats||[]).map((s:any,i:number)=>(
              <div key={i}>
                <label style={label_}>Değer #{i+1}</label>
                <input value={s.value||''} onChange={e=>updateStats(i,'value',e.target.value)} style={{...inp,marginBottom:6}} placeholder="2.847+" />
                <label style={label_}>Etiket #{i+1}</label>
                <input value={s.label||''} onChange={e=>updateStats(i,'label',e.target.value)} style={inp} placeholder="Aktif Kullanıcı" />
              </div>
            ))}
          </div>
        </Section>

        {/* Features */}
        <Section title="Özellikler (6 kart)" emoji="🎯">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {(cfg.features||[]).map((f:any,i:number)=>(
              <div key={i} style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:10}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <div><label style={label_}>İkon #{i+1}</label><input value={f.icon||''} onChange={e=>updateFeature(i,'icon',e.target.value)} style={inp} placeholder="🎯" /></div>
                  <div><label style={label_}>Başlık #{i+1}</label><input value={f.title||''} onChange={e=>updateFeature(i,'title',e.target.value)} style={inp} /></div>
                </div>
                <label style={label_}>Açıklama #{i+1}</label>
                <textarea value={f.desc||''} onChange={e=>updateFeature(i,'desc',e.target.value)} rows={2} style={inp} />
              </div>
            ))}
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Fiyatlandırma" emoji="💰">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            <Field label="Aylık Fiyat (₺)"><input type="number" value={cfg.price_monthly||''} onChange={e=>setCfg({...cfg,price_monthly:parseInt(e.target.value)||0})} style={inp} /></Field>
            <Field label="Yıllık Fiyat (₺/ay)"><input type="number" value={cfg.price_annual||''} onChange={e=>setCfg({...cfg,price_annual:parseInt(e.target.value)||0})} style={inp} /></Field>
          </div>
          <Field label="CTA Butonu Metni">
            <input value={cfg.price_cta||''} onChange={e=>setCfg({...cfg,price_cta:e.target.value})} style={inp} />
          </Field>
          <label style={label_}>Dahil Özellikler (her satır bir madde)</label>
          {(cfg.price_features||[]).map((f:string,i:number)=>(
            <input key={i} value={f} onChange={e=>updatePriceFeature(i,e.target.value)} style={{...inp,marginBottom:8}} placeholder={`Özellik ${i+1}`} />
          ))}
        </Section>

        {/* SEO */}
        <Section title="SEO & Meta" emoji="🔍">
          <Field label="Meta Başlık (tarayıcı sekmesi)">
            <input value={cfg.meta_title||''} onChange={e=>setCfg({...cfg,meta_title:e.target.value})} style={inp} />
          </Field>
          <Field label="Meta Açıklama">
            <textarea value={cfg.meta_description||''} onChange={e=>setCfg({...cfg,meta_description:e.target.value})} rows={3} style={inp} />
          </Field>
        </Section>

        {/* Bottom save */}
        <div style={{position:'sticky',bottom:16,background:'rgba(5,10,25,0.97)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 20px 60px rgba(0,0,0,0.8)'}}>
          <span style={{color:'#475569',fontSize:13}}>💡 Kaydettiğinizde ana sayfa otomatik güncellenir</span>
          <button onClick={save} disabled={saving} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
            {saving?'⏳ Kaydediliyor...':'💾 Kaydet & Yayınla'}
          </button>
        </div>
      </>}
    </div>
  )
}
