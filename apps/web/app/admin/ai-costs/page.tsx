'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

// Approximate costs per unit (2026 pricing)
const AI_PRICES = {
  anthropic: { per_1k_tokens: 0.003, currency: 'USD' },  // ~Claude Sonnet
  elevenlabs: { per_minute: 0.30, currency: 'USD' },      // ~ElevenLabs standard
  perplexity: { per_search: 0.005, currency: 'USD' },     // ~Perplexity online model
}

export default function AdminAICostsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.users({ limit: '500', sort: 'credits_used' }).catch(()=>({users:[]})),
      adminApi.systemConfig().catch(()=>({}))
    ]).then(([u, c]) => {
      setUsers(u.users || [])
      setConfig(c)
    }).finally(() => setLoading(false))
  }, [])

  const totalCreditsUsed = users.reduce((s, u) => s + (u.credits_used || 0), 0)
  const estimatedUSD = totalCreditsUsed * 0.002  // rough estimate: 1 credit ≈ $0.002 AI cost
  const topUsers = [...users].sort((a,b)=>(b.credits_used||0)-(a.credits_used||0)).slice(0,10)

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🤖 AI Maliyet Merkezi</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Anthropic Claude, ElevenLabs, Perplexity kullanım ve maliyet takibi</p>

      {/* API Status */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>🔑 AI Servis Durumları</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[
            {name:'Anthropic Claude',key:'anthropic',icon:'🧠',desc:'Metin üretimi, analiz, satış koçluğu',price:'~$0.003/1K token'},
            {name:'ElevenLabs',key:'elevenlabs',icon:'🎙️',desc:'Ses klonlama, video seslendirme, telefon',price:'~$0.30/dakika'},
            {name:'Perplexity AI',key:'perplexity',icon:'🔍',desc:'Web arama, haber takibi, piyasa araştırması',price:'~$0.005/arama'},
            {name:'Google Places',key:'google_places',icon:'📍',desc:'Lead toplama, konum bazlı arama',price:'~$0.017/istek'},
            {name:'Resend Email',key:'resend',icon:'📧',desc:'E-posta kampanyaları ve bildirimler',price:'$20/ay'},
            {name:'Stripe',key:'stripe',icon:'💳',desc:'Ödeme işlemleri',price:'%2.9+$0.30/işlem'},
          ].map(s=>(
            <div key={s.key} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:12,border:`1px solid ${config?.api_keys?.[s.key]?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:18}}>{s.icon}</span>
                <span style={{color:config?.api_keys?.[s.key]?'#34d399':'#f87171',fontSize:12,fontWeight:700}}>{config?.api_keys?.[s.key]?'✅ Aktif':'❌ Eksik'}</span>
              </div>
              <div style={{color:'#fff',fontSize:12,fontWeight:600,marginBottom:3}}>{s.name}</div>
              <div style={{color:'#475569',fontSize:11,marginBottom:4}}>{s.desc}</div>
              <div style={{color:'#334155',fontSize:10,fontFamily:'monospace'}}>{s.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit usage = AI cost proxy */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>⚡ Kredi Kullanım Özeti</h3>
          <div style={{fontSize:36,fontWeight:900,color:'#8b5cf6',margin:'0 0 8px'}}>{loading?'—':totalCreditsUsed.toLocaleString()}</div>
          <div style={{color:'#64748b',fontSize:12}}>Toplam kullanılan kredi</div>
          <div style={{marginTop:12,padding:10,background:'rgba(139,92,246,0.08)',borderRadius:10,border:'1px solid rgba(139,92,246,0.2)'}}>
            <div style={{color:'#c084fc',fontSize:11,fontWeight:700}}>Tahmini AI Maliyeti</div>
            <div style={{color:'#fff',fontSize:20,fontWeight:800,marginTop:4}}>~${estimatedUSD.toFixed(2)}</div>
            <div style={{color:'#475569',fontSize:10,marginTop:2}}>1 kredi ≈ $0.002 AI işlem maliyeti</div>
          </div>
        </div>

        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>📊 Kredi Dağılımı</h3>
          {loading ? <div style={{color:'#334155'}}>Yükleniyor...</div> : (
            <>
              <div style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:'#94a3b8'}}>Kullanılan</span>
                  <span style={{color:'#ef4444',fontWeight:600}}>{totalCreditsUsed.toLocaleString()}</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'linear-gradient(90deg,#ef4444,#f97316)',borderRadius:3,width:`${Math.min(100,Math.round(totalCreditsUsed/(totalCreditsUsed+users.reduce((s,u)=>s+(u.credits_total-u.credits_used||0),0))*100))}%`}}/>
                </div>
              </div>
              <div style={{color:'#475569',fontSize:12,marginTop:12}}>
                <div>Toplam dağıtılan: {users.reduce((s,u)=>s+(u.credits_total||0),0).toLocaleString()} kredi</div>
                <div style={{marginTop:4}}>Kalan: {users.reduce((s,u)=>s+Math.max(0,(u.credits_total||0)-(u.credits_used||0)),0).toLocaleString()} kredi</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top AI users */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>👑 En Fazla Kredi Kullanan Kullanıcılar (AI = Maliyet)</h3>
        {loading ? <div style={{color:'#334155'}}>Yükleniyor...</div> : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                {['Kullanıcı','Plan','Kullanılan Kredi','Kalan Kredi','Tahmini AI $'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#334155',textTransform:'uppercase',letterSpacing:'0.1em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u,i) => {
                const used = u.credits_used || 0
                const left = (u.credits_total||0) - used
                return (
                  <tr key={u.id} style={{borderBottom:'1px solid rgba(255,255,255,0.025)'}}>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{color:'#fff',fontSize:12,fontWeight:600}}>{u.name||u.email}</div>
                      <div style={{color:'#475569',fontSize:11}}>{u.email}</div>
                    </td>
                    <td style={{padding:'10px 12px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(139,92,246,0.15)',color:'#c084fc'}}>{u.plan_type}</span></td>
                    <td style={{padding:'10px 12px',color:'#f87171',fontSize:13,fontWeight:700}}>{used.toLocaleString()}</td>
                    <td style={{padding:'10px 12px',color:left<50?'#ef4444':'#64748b',fontSize:12}}>{left.toLocaleString()}</td>
                    <td style={{padding:'10px 12px',color:'#fbbf24',fontSize:12,fontWeight:600}}>${(used*0.002).toFixed(3)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
