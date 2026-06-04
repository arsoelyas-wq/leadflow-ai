'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}/api/admin${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}`, ...opts.headers } })
  return r.json()
}

export default function AdminChurnPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bulkPlan, setBulkPlan] = useState('starter')
  const [bulkCredits, setBulkCredits] = useState('50')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkResult, setBulkResult] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => { req('/churn').then(setData).catch(()=>{}).finally(()=>setLoading(false)) }, [])

  const runBulk = async () => {
    if (!bulkCredits || !bulkReason) return
    setBulkLoading(true); setBulkResult('')
    try {
      const r = await req('/users/bulk', { method:'POST', body:JSON.stringify({ plan_filter:bulkPlan, action:'add_credits', value:parseInt(bulkCredits), reason:bulkReason }) })
      setBulkResult(`✅ ${r.updated} kullanıcıya ${bulkCredits} kredi eklendi!`)
    } catch(e:any) { setBulkResult('❌ '+e.message) } finally { setBulkLoading(false) }
  }

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }
  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',fontFamily:'inherit' }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>📉 Churn Analizi & Toplu İşlemler</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Kredi biten kullanıcılar, churn riski, toplu kredi operasyonları</p>

      {/* Churn stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16}}>
        {[
          {label:'Yüksek Risk',desc:'Kredisi %10 altı',value:data?.high_risk?.length||0,color:'#ef4444'},
          {label:'Orta Risk',desc:'Kredisi %10-30',value:data?.medium_risk?.length||0,color:'#f59e0b'},
          {label:'Güvenli',desc:'Kredisi yeterli',value:Math.max(0,(data?.total||0)-(data?.high_risk?.length||0)-(data?.medium_risk?.length||0)),color:'#10b981'},
        ].map(s=>(
          <div key={s.label} style={card}>
            <div style={{fontSize:28,fontWeight:900,color:s.color}}>{loading?'—':s.value}</div>
            <div style={{color:'#fff',fontSize:13,fontWeight:600,marginTop:4}}>{s.label}</div>
            <div style={{color:'#475569',fontSize:11,marginTop:2}}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* High risk users */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px',display:'flex',alignItems:'center',gap:8}}>
          🚨 Yüksek Churn Riski ({loading?'...':data?.high_risk?.length||0} kullanıcı)
          <span style={{fontSize:11,color:'#475569',fontWeight:400}}>Kredi %10 altı — müdahale önerilir</span>
        </h3>
        {loading?<div style={{color:'#334155'}}>Yükleniyor...</div>:
          (data?.high_risk||[]).slice(0,10).map((u:any)=>{
            const left = (u.credits_total||0)-(u.credits_used||0)
            const pct = u.credits_total?Math.round((left/u.credits_total)*100):0
            return (
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:'#fff',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name||u.email}</div>
                  <div style={{color:'#64748b',fontSize:11}}>{u.email} · {u.plan_type}</div>
                </div>
                <div style={{fontSize:12,color:'#ef4444',fontWeight:700,flexShrink:0}}>{left} kredi (%{pct})</div>
                <Link href={`/admin/users/${u.id}`} style={{padding:'5px 10px',borderRadius:7,background:'rgba(239,68,68,0.15)',color:'#f87171',textDecoration:'none',fontSize:11,flexShrink:0}}>Detay</Link>
              </div>
            )
          })
        }
      </div>

      {/* Bulk operations */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>⚡ Toplu Kredi İşlemi</h3>
        <p style={{color:'#475569',fontSize:12,marginBottom:16}}>Belirli plandaki tüm kullanıcılara kredi ekle (örn: tüm starter'lara +50 bonus kredi)</p>

        {bulkResult&&<div style={{padding:'11px 16px',borderRadius:10,marginBottom:14,background:bulkResult.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',color:bulkResult.startsWith('✅')?'#34d399':'#f87171',fontSize:13}}>{bulkResult}</div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr',gap:12,marginBottom:14}}>
          <div>
            <label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Plan</label>
            <select value={bulkPlan} onChange={e=>setBulkPlan(e.target.value)} style={{...inp,width:'100%',boxSizing:'border-box' as const}}>
              <option value="all">Tüm Planlar</option>
              {['starter','growth','pro','enterprise'].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Kredi Miktarı</label>
            <input type="number" value={bulkCredits} onChange={e=>setBulkCredits(e.target.value)} placeholder="50" style={{...inp,width:'100%',boxSizing:'border-box' as const}} />
          </div>
          <div>
            <label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Sebep / Açıklama</label>
            <input value={bulkReason} onChange={e=>setBulkReason(e.target.value)} placeholder="Lansman kampanyası, hatırlatma, bonus..." style={{...inp,width:'100%',boxSizing:'border-box' as const}} />
          </div>
        </div>
        <button onClick={runBulk} disabled={bulkLoading} style={{padding:'10px 24px',borderRadius:10,border:'none',background:bulkLoading?'rgba(245,158,11,0.4)':'linear-gradient(135deg,#f59e0b,#f97316)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
          {bulkLoading?'⏳ İşleniyor...':'⚡ Toplu Kredi Ekle'}
        </button>
      </div>
    </div>
  )
}
