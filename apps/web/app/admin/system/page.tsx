'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

export default function AdminSystemPage() {
  const [config, setConfig] = useState<any>(null)
  const [errors, setErrors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.systemConfig(), adminApi.systemErrors()])
      .then(([c,e]) => { setConfig(c); setErrors(e.errors||[]) })
      .catch(console.error).finally(() => setLoading(false))
  },[])

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  if (loading) return <div style={{color:'#475569',padding:40}}>Yükleniyor...</div>

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>⚙️ Sistem & Konfigürasyon</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>API key durumları, plan limitleri, hata logları</p>

      {/* API Keys */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>🔑 API Key Durumları</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {Object.entries(config?.api_keys||{}).map(([k,v]:any) => (
            <div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'rgba(255,255,255,0.02)',borderRadius:9,border:`1px solid ${v?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`}}>
              <span style={{fontSize:16}}>{v?'✅':'❌'}</span>
              <span style={{fontSize:12,color:v?'#e2e8f0':'#64748b',textTransform:'capitalize' as const}}>{k.replace(/_/g,' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>💳 Plan Limitleri & Fiyatları</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {Object.entries(config?.plans||{}).map(([p,info]:any) => (
            <div key={p} style={{padding:16,background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{color:'#fff',fontSize:13,fontWeight:700,textTransform:'capitalize' as const,marginBottom:8}}>{p}</div>
              <div style={{color:'#3b82f6',fontSize:22,fontWeight:900}}>{info.credits===-1?'∞':info.credits.toLocaleString()}</div>
              <div style={{color:'#475569',fontSize:11}}>kredi/ay</div>
              <div style={{color:'#10b981',fontSize:14,fontWeight:700,marginTop:6}}>₺{info.price}/ay</div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit packages */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 14px'}}>📦 Kredi Paketleri</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {Object.entries(config?.credit_packages||{}).map(([k,v]:any) => (
            <div key={k} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{color:'#fff',fontSize:13,fontWeight:600,textTransform:'capitalize' as const,marginBottom:6}}>{k} Paket</div>
              <div style={{color:'#f59e0b',fontSize:20,fontWeight:800}}>{v.credits} kredi</div>
              <div style={{color:'#64748b',fontSize:12}}>₺{v.amount_try}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Error logs */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>
          ⚠️ Son 24 Saatte <span style={{color:'#ef4444'}}>{config?.errors_24h||0}</span> Hata
        </h3>
        <div style={{maxHeight:320,overflowY:'auto'}}>
          {errors.length===0 ? (
            <div style={{color:'#34d399',fontSize:13}}>✅ Son 24 saatte hata tespit edilmedi!</div>
          ) : errors.slice(0,50).map((e:any,i:number) => (
            <div key={i} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
              <div style={{color:'#f87171',fontSize:12,fontWeight:600,marginBottom:3}}>{e.endpoint||e.path||'—'}</div>
              <div style={{color:'#64748b',fontSize:11}}>{e.message?.slice(0,120)||'No message'}</div>
              <div style={{color:'#334155',fontSize:10,marginTop:2}}>{e.created_at?new Date(e.created_at).toLocaleString('tr-TR'):''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
