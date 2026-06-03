'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

const PLANS = ['starter','growth','pro','enterprise']
const PLAN_COLOR: Record<string,string> = { starter:'#64748b', growth:'#3b82f6', pro:'#8b5cf6', enterprise:'#f59e0b' }

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{type:'ok'|'err';text:string}|null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [creditAmt, setCreditAmt] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [tab, setTab] = useState<'leads'|'campaigns'|'messages'>('leads')
  const [tabData, setTabData] = useState<any>(null)
  const [tabLoading, setTabLoading] = useState(false)
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    adminApi.user(id as string).then(d => { setData(d); setEditPlan(d.user.plan_type) })
      .catch(console.error).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setTabLoading(true); setTabData(null)
    adminApi.userData(id as string, tab).then(setTabData).catch(() => {}).finally(() => setTabLoading(false))
  }, [id, tab])

  const showMsg = (type: 'ok'|'err', text: string) => { setMsg({type,text}); setTimeout(() => setMsg(null), 4000) }

  const savePlan = async () => {
    setSaving(true)
    try { await adminApi.updateUser(id as string, {plan_type:editPlan}); setData((d:any) => ({...d,user:{...d.user,plan_type:editPlan}})); showMsg('ok','Plan güncellendi!') }
    catch(e:any) { showMsg('err',e.message) } finally { setSaving(false) }
  }

  const adjustCredits = async (sign:1|-1) => {
    if (!creditAmt || !creditReason) return showMsg('err','Miktar ve sebep zorunlu')
    setSaving(true)
    try {
      const r = await adminApi.addCredits(id as string, parseInt(creditAmt)*sign, creditReason)
      setData((d:any) => ({...d,user:{...d.user,credits_total:r.new_total}}))
      showMsg('ok',`Kredi güncellendi! Yeni toplam: ${r.new_total}`)
      setCreditAmt(''); setCreditReason('')
    } catch(e:any) { showMsg('err',e.message) } finally { setSaving(false) }
  }

  const impersonate = async () => {
    setImpersonating(true)
    try {
      const r = await adminApi.impersonate(id as string)
      window.open(`/?impersonate_token=${r.token}`, '_blank')
      showMsg('ok',`${r.user.email} olarak giriş yapıldı — yeni sekme açıldı`)
    } catch(e:any) { showMsg('err',e.message) } finally { setImpersonating(false) }
  }

  const suspend = async () => {
    if (!confirm(data?.user?.is_suspended ? 'Hesabı aktive et?' : 'Hesabı askıya al?')) return
    const newVal = !data?.user?.is_suspended
    await adminApi.updateUser(id as string, {is_suspended:newVal})
    setData((d:any) => ({...d,user:{...d.user,is_suspended:newVal}}))
    showMsg('ok', newVal ? 'Hesap askıya alındı' : 'Hesap aktive edildi')
  }

  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit' }
  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20,marginBottom:16 }
  const labelS: React.CSSProperties = { display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8 }

  if (loading) return <div style={{color:'#475569',padding:40,textAlign:'center'}}>Yükleniyor...</div>
  if (!data) return <div style={{color:'#ef4444',padding:40}}>Kullanıcı bulunamadı</div>
  const { user, stats, credit_history } = data

  return (
    <div style={{maxWidth:960}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:28,flexWrap:'wrap',rowGap:10}}>
        <Link href="/admin/users" style={{color:'#475569',textDecoration:'none',fontSize:13,display:'flex',alignItems:'center',gap:4}}>← Geri</Link>
        <div style={{flex:1}}>
          <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 3px',letterSpacing:'-0.02em'}}>{user.name || user.email}</h1>
          <div style={{color:'#475569',fontSize:13}}>{user.email} · {user.company||'Şirket yok'} · {user.country_code||'—'}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={suspend} style={{padding:'9px 16px',borderRadius:9,border:`1px solid ${user.is_suspended?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,background:user.is_suspended?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',color:user.is_suspended?'#34d399':'#f87171',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>
            {user.is_suspended?'✅ Aktive Et':'⛔ Askıya Al'}
          </button>
          <button onClick={impersonate} disabled={impersonating} style={{padding:'9px 18px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#8b5cf6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
            {impersonating?'⏳':'👁'} Kullanıcı Olarak Gir
          </button>
        </div>
      </div>

      {msg && <div style={{padding:'11px 16px',borderRadius:10,marginBottom:16,background:msg.type==='ok'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.type==='ok'?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,color:msg.type==='ok'?'#34d399':'#f87171',fontSize:13}}>{msg.text}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Stats */}
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>📊 Kullanım İstatistikleri</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[['Lead',stats.leads],['Kampanya',stats.campaigns],['Mesaj',stats.messages]].map(([l,v]) => (
              <div key={l as string} style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:12,textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{(v as number).toLocaleString()}</div>
                <div style={{fontSize:11,color:'#475569',marginTop:2}}>{l as string}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:'#475569',lineHeight:1.8}}>
            <div>Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}</div>
            <div>Onboarding: {user.onboarding_done?'✅':'❌'} · Dil: {user.language_code||'—'}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
              <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,background:`${PLAN_COLOR[user.plan_type]||'#64748b'}20`,color:PLAN_COLOR[user.plan_type]||'#64748b'}}>
                {user.plan_type}
              </span>
              {user.is_suspended && <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,background:'rgba(239,68,68,0.15)',color:'#f87171'}}>ASKIDA</span>}
            </div>
          </div>
        </div>

        {/* Plan */}
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>💳 Plan Değiştir</h3>
          <label style={labelS}>Plan</label>
          <select value={editPlan} onChange={e => setEditPlan(e.target.value)} style={{...inp,marginBottom:12}}>
            {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
          <button onClick={savePlan} disabled={saving} style={{padding:'9px 18px',borderRadius:9,background:'rgba(59,130,246,0.2)',color:'#60a5fa',cursor:'pointer',fontSize:13,fontWeight:600,border:'1px solid rgba(59,130,246,0.3)',fontFamily:'inherit'}}>
            💾 Planı Güncelle
          </button>
          <div style={{marginTop:16,padding:12,background:'rgba(255,255,255,0.02)',borderRadius:10}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Kalan Kredi</div>
            <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>{((user.credits_total||0)-(user.credits_used||0)).toLocaleString()}</div>
            <div style={{fontSize:11,color:'#334155'}}>{user.credits_total} toplam · {user.credits_used} kullanıldı</div>
          </div>
        </div>

        {/* Credits */}
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>⚡ Kredi Düzenle</h3>
          <label style={labelS}>Miktar</label>
          <input type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} placeholder="100" style={{...inp,marginBottom:12}} />
          <label style={labelS}>Sebep</label>
          <input value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Bonus, hata telafisi, kampanya..." style={{...inp,marginBottom:14}} />
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => adjustCredits(1)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:'rgba(16,185,129,0.2)',color:'#34d399',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>+ Kredi Ekle</button>
            <button onClick={() => adjustCredits(-1)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:'rgba(239,68,68,0.15)',color:'#f87171',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>− Kredi Çıkar</button>
          </div>
        </div>

        {/* Credit history */}
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 14px'}}>📜 Kredi Geçmişi</h3>
          <div style={{maxHeight:220,overflowY:'auto'}}>
            {credit_history.length===0 ? <p style={{color:'#334155',fontSize:13}}>Kayıt yok</p> :
              credit_history.map((c:any,i:number) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:12}}>
                  <span style={{color:'#94a3b8',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.action}</span>
                  <span style={{color:c.amount>0?'#34d399':'#f87171',fontWeight:700,marginLeft:8,flexShrink:0}}>{c.amount>0?'+':''}{c.amount}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* User data tabs */}
      <div style={{...card,marginTop:0}}>
        <div style={{display:'flex',gap:4,marginBottom:18}}>
          {(['leads','campaigns','messages'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:tab===t?'rgba(59,130,246,0.2)':'transparent',color:tab===t?'#60a5fa':'#64748b',fontFamily:'inherit'}}>
              {t==='leads'?'🎯 Leads':t==='campaigns'?'📢 Kampanyalar':'💬 Mesajlar'} {tabData && tab===t?`(${tabData.total})`:'' }
            </button>
          ))}
        </div>
        {tabLoading ? <div style={{color:'#334155',padding:16}}>Yükleniyor...</div> :
          tabData?.items?.length===0 ? <div style={{color:'#334155',padding:16}}>Kayıt yok</div> :
          <div style={{fontSize:12}}>
            {tabData?.items?.slice(0,20).map((item:any,i:number) => (
              <div key={i} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',alignItems:'center'}}>
                {tab==='leads' && <>
                  <span style={{color:'#fff',flex:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.company_name}</span>
                  <span style={{color:'#64748b',flex:1}}>{item.city}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(255,255,255,0.05)',color:'#94a3b8'}}>{item.status}</span>
                  <span style={{color:'#60a5fa',fontWeight:700}}>⭐{item.score}</span>
                </>}
                {tab==='campaigns' && <>
                  <span style={{color:'#fff',flex:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(255,255,255,0.05)',color:'#94a3b8'}}>{item.status}</span>
                  <span style={{color:'#34d399'}}>{item.total_sent||0} gönderildi</span>
                </>}
                {tab==='messages' && <>
                  <span style={{color:item.direction==='out'?'#60a5fa':'#34d399',flex:0,flexShrink:0}}>{item.direction==='out'?'↑':'↓'}</span>
                  <span style={{color:'#94a3b8',flex:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.content}</span>
                  <span style={{color:'#475569',flexShrink:0}}>{item.channel}</span>
                </>}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}
