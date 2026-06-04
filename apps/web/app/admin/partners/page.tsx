'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getAdminToken()}` } })
  return r.json().catch(() => ({}))
}

export default function AdminPartnersPage() {
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [whitelabels, setWhitelabels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'affiliate'|'whitelabel'>('affiliate')

  useEffect(() => {
    // These use user auth, not admin auth
    Promise.all([
      req('/api/affiliate/links').catch(()=>({links:[]})),
      req('/api/whitelabel/brands').catch(()=>({brands:[]})),
    ]).then(([a, w]) => {
      setAffiliates(a.links||[])
      setWhitelabels(w.brands||[])
    }).finally(() => setLoading(false))
  }, [])

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:18,marginBottom:10 }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🤝 İş Ortakları</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Affiliate linkler, white-label/reseller hesapları ve komisyon takibi</p>

      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {(['affiliate','whitelabel'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,background:tab===t?'rgba(245,158,11,0.2)':'transparent',color:tab===t?'#fbbf24':'#64748b',fontFamily:'inherit'}}>
            {t==='affiliate'?'🤝 Affiliate Linkler':'🏢 White-label Markalar'}
          </button>
        ))}
      </div>

      {tab==='affiliate' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {[
              {label:'Toplam Link',value:affiliates.length,color:'#f59e0b'},
              {label:'Toplam Tıklama',value:affiliates.reduce((s:number,a:any)=>s+(a.clicks||0),0).toLocaleString(),color:'#3b82f6'},
              {label:'Toplam Kayıt',value:affiliates.reduce((s:number,a:any)=>s+(a.signups||0),0),color:'#10b981'},
            ].map(s=>(
              <div key={s.label} style={{...card,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:900,color:s.color}}>{loading?'—':s.value}</div>
                <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          {affiliates.length===0&&!loading?<div style={{...card,textAlign:'center',padding:40,color:'#334155'}}>Henüz affiliate linki yok</div>:
            affiliates.map((a:any,i:number)=>(
              <div key={i} style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <code style={{color:'#fbbf24',fontSize:12}}>{a.code}</code>
                    <div style={{color:'#64748b',fontSize:11,marginTop:2}}>Kullanıcı: {a.user_email||a.user_id}</div>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:12}}>
                    <span style={{color:'#3b82f6'}}>{a.clicks||0} tıklama</span>
                    <span style={{color:'#10b981'}}>{a.signups||0} kayıt</span>
                  </div>
                </div>
              </div>
            ))
          }
        </>
      )}

      {tab==='whitelabel' && (
        <>
          {whitelabels.length===0&&!loading?<div style={{...card,textAlign:'center',padding:40,color:'#334155'}}>Henüz white-label markası yok</div>:
            whitelabels.map((w:any,i:number)=>(
              <div key={i} style={card}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  {w.logo_url&&<img src={w.logo_url} alt={w.name} style={{width:40,height:40,objectFit:'contain',borderRadius:8,background:'rgba(255,255,255,0.05)'}}/>}
                  <div>
                    <div style={{color:'#fff',fontSize:14,fontWeight:700}}>{w.name}</div>
                    <div style={{color:'#64748b',fontSize:12}}>{w.domain||'Domain yok'}</div>
                  </div>
                  <div style={{marginLeft:'auto',fontSize:12,color:'#64748b'}}>
                    Kullanıcı: {w.user_id?.slice(0,8)}...
                  </div>
                </div>
              </div>
            ))
          }
        </>
      )}
    </div>
  )
}
