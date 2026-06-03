'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const PLAN_COLOR: Record<string,string> = { starter:'#64748b', growth:'#3b82f6', pro:'#8b5cf6', enterprise:'#f59e0b' }

export default function AdminRevenuePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { adminApi.revenue().then(setData).catch(console.error).finally(()=>setLoading(false)) },[])
  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>💰 Gelir & Finans</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>MRR/ARR, plan bazında gelir dağılımı</p>
      {loading?<div style={{color:'#475569'}}>Yükleniyor...</div>:<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16}}>
          {[
            {label:'Aylık Gelir (MRR)',value:`₺${(data?.mrr||0).toLocaleString()}`,color:'#10b981',icon:'📈'},
            {label:'Yıllık Tahmin (ARR)',value:`₺${(data?.arr||0).toLocaleString()}`,color:'#3b82f6',icon:'🏦'},
            {label:'Toplam Kredi Kullanımı',value:(data?.total_credits_used||0).toLocaleString(),color:'#8b5cf6',icon:'⚡'},
          ].map(s=>(
            <div key={s.label} style={card}>
              <div style={{fontSize:22,marginBottom:10}}>{s.icon}</div>
              <div style={{fontSize:28,fontWeight:900,color:s.color,letterSpacing:'-0.02em',margin:'0 0 4px'}}>{s.value}</div>
              <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>Plan Bazında Gelir</h3>
          {Object.entries(data?.by_plan||{}).map(([plan,revenue]:any)=>(
            <div key={plan} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                <span style={{color:'#e2e8f0',fontWeight:600,textTransform:'capitalize' as const}}>{plan}</span>
                <span style={{color:PLAN_COLOR[plan]||'#64748b',fontWeight:700}}>₺{revenue.toLocaleString()}/ay</span>
              </div>
              <div style={{height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${data.mrr?Math.min(100,Math.round((revenue/data.mrr)*100)):0}%`,background:PLAN_COLOR[plan]||'#64748b',borderRadius:3,transition:'width 0.6s ease'}}/>
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}
