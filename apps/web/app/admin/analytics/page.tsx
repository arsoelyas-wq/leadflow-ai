'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { adminApi.analytics().then(setData).catch(console.error).finally(()=>setLoading(false)) },[])
  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>📊 Platform Analitiği</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Kullanıcı kayıt trendleri, ülke dağılımı, dil tercihleri</p>
      {loading?<div style={{color:'#475569'}}>Yükleniyor...</div>:<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={card}>
            <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>🌍 Ülke Dağılımı (Top 10)</h3>
            {(data?.by_country||[]).slice(0,10).map((c:any,i:number)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:13}}>
                <span style={{color:'#e2e8f0'}}>{c.country||'Bilinmiyor'}</span>
                <span style={{color:'#60a5fa',fontWeight:600}}>{c.count}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>📈 Aylık Kayıt Trendi</h3>
            {(data?.signups_by_month||[]).slice(-12).reverse().map((m:any,i:number)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:13}}>
                <span style={{color:'#94a3b8'}}>{m.month}</span>
                <span style={{color:'#10b981',fontWeight:600}}>+{m.count}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>🗣️ Dil Dağılımı</h3>
            {Object.entries(data?.by_language||{}).map(([lang,count]:any)=>(
              <div key={lang} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:13}}>
                <span style={{color:'#e2e8f0',textTransform:'uppercase' as const}}>{lang}</span>
                <span style={{color:'#8b5cf6',fontWeight:600}}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </>}
    </div>
  )
}
