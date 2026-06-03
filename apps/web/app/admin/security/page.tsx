'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  useEffect(() => { adminApi.auditLog().then(d=>setLogs(d.logs||[])).catch(console.error).finally(()=>setLoading(false)) },[])

  const filtered = filter ? logs.filter(l=>l.action.includes(filter)||l.admin_email?.includes(filter)) : logs

  const ACTION_COLOR: Record<string,string> = { 'auth.login':'#10b981','user.update':'#3b82f6','user.impersonate':'#ef4444','user.credits_adjust':'#f59e0b','banner.create':'#8b5cf6','banner.update':'#06b6d4','notification.broadcast':'#f97316' }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🔐 Audit Log & Güvenlik</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 20px'}}>Tüm admin aksiyonlarının kaydı</p>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Action veya email filtrele..." style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',marginBottom:16,boxSizing:'border-box' as const,fontFamily:'inherit'}} />

      <div style={{background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
        {loading?<div style={{padding:40,color:'#475569',textAlign:'center'}}>Yükleniyor...</div>:
          filtered.length===0?<div style={{padding:40,color:'#334155',textAlign:'center'}}>Log bulunamadı</div>:
          filtered.slice(0,100).map((l:any,i:number) => (
            <div key={i} style={{display:'flex',gap:14,padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.025)',alignItems:'flex-start'}}>
              <div style={{flexShrink:0}}>
                <span style={{padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:`${ACTION_COLOR[l.action]||'#64748b'}18`,color:ACTION_COLOR[l.action]||'#64748b',whiteSpace:'nowrap' as const}}>{l.action}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'#94a3b8',fontSize:12}}>{l.admin_email}</div>
                {l.details&&Object.keys(l.details).length>0&&<div style={{color:'#334155',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{JSON.stringify(l.details)}</div>}
              </div>
              <div style={{color:'#334155',fontSize:11,flexShrink:0,whiteSpace:'nowrap' as const}}>{l.created_at?new Date(l.created_at).toLocaleString('tr-TR'):''}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
