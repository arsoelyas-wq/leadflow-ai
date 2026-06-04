'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string) {
  const r = await fetch(`${API}/api/admin${path}`, { headers: { Authorization: `Bearer ${getAdminToken()}` } })
  return r.json()
}

const CATEGORY_COLOR: Record<string,string> = { core:'#3b82f6', sales:'#10b981', marketing:'#f59e0b', advanced:'#8b5cf6', analytics:'#06b6d4' }
const CATEGORY_LABEL: Record<string,string> = { core:'⭐ Temel', sales:'💼 Satış', marketing:'📣 Pazarlama', advanced:'🚀 Gelişmiş', analytics:'📊 Analitik' }

export default function AdminUsagePage() {
  const [features, setFeatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    req('/usage-map').then(d=>setFeatures(d.features||[])).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const maxCount = features.reduce((m,f)=>Math.max(m,f.count),1)

  const byCategory = features.reduce((acc:any, f:any) => {
    if (!acc[f.category]) acc[f.category] = []
    acc[f.category].push(f)
    return acc
  }, {})

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🗺️ Özellik Kullanım Haritası</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Hangi özellikler ne kadar kullanılıyor — ürün kararları için</p>

      {/* Top features bar chart */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 20px'}}>📊 Tüm Özellikler — Kullanım Sıralaması</h3>
        {loading ? <div style={{color:'#334155'}}>Yükleniyor...</div> :
          features.map((f:any, i:number) => {
            const pct = Math.round((f.count / maxCount) * 100)
            const color = CATEGORY_COLOR[f.category] || '#64748b'
            return (
              <div key={f.key} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:'#e2e8f0',fontWeight:600}}>{f.name}</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{padding:'1px 7px',borderRadius:20,fontSize:10,background:`${color}20`,color}}>{CATEGORY_LABEL[f.category]}</span>
                    <span style={{color,fontWeight:700,fontFamily:'monospace'}}>{f.count.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.max(2,pct)}%`,background:color,borderRadius:4,transition:'width 0.6s ease',boxShadow:`0 0 8px ${color}60`}}/>
                </div>
              </div>
            )
          })
        }
      </div>

      {/* By category */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {Object.entries(byCategory).map(([cat, items]:any) => (
          <div key={cat} style={card}>
            <h3 style={{color:'#fff',fontSize:13,fontWeight:700,margin:'0 0 14px',display:'flex',alignItems:'center',gap:7}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:CATEGORY_COLOR[cat]||'#64748b',display:'inline-block'}}/>
              {CATEGORY_LABEL[cat]||cat}
            </h3>
            {(items as any[]).map((f:any) => (
              <div key={f.key} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:12}}>
                <span style={{color:'#94a3b8'}}>{f.name}</span>
                <span style={{color:CATEGORY_COLOR[f.category]||'#64748b',fontWeight:700}}>{f.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{...card,background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.12)',marginTop:0}}>
        <p style={{color:'#475569',fontSize:12,margin:0,lineHeight:1.7}}>
          💡 <strong style={{color:'#94a3b8'}}>Okuma kılavuzu:</strong> Yüksek sayı = çok kullanılan özellik. Düşük sayı = ya kullanıcılar o özelliği bilmiyor, ya da değer görmüyor. Düşük kullanımlı özellikleri duyuru & onboarding ile öne çıkarın.
        </p>
      </div>
    </div>
  )
}
