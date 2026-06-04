'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import Link from 'next/link'

export default function AdminSupportPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [msg, setMsg] = useState({ title:'', body:'', href:'/dashboard' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    adminApi.users({limit:'200'}).then(d=>setUsers(d.users||[])).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const filtered = search ? users.filter(u=>u.email?.includes(search)||u.name?.includes(search)||u.company?.includes(search)) : users.slice(0,20)

  const sendDM = async () => {
    if (!selected || !msg.title || !msg.body) return
    setSending(true)
    try {
      const r = await adminApi.broadcast({ ...msg, target_plan: 'all', _user_ids: [selected.id] })
      setResult(`✅ ${selected.email} kullanıcısına mesaj gönderildi`)
      setMsg({ title:'', body:'', href:'/dashboard' })
    } catch(e:any) { setResult('❌ '+e.message) }
    finally { setSending(false) }
  }

  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit' }
  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🎧 Destek & Kullanıcı İletişimi</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Kullanıcılara direkt mesaj gönder, kredi ekle, sorunlarını çöz</p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* User selector */}
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 14px'}}>👤 Kullanıcı Seç</h3>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Email, isim veya şirket ara..." style={{...inp,marginBottom:12}} />
          <div style={{maxHeight:300,overflowY:'auto'}}>
            {filtered.map(u => (
              <div key={u.id} onClick={() => setSelected(u)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:9,cursor:'pointer',marginBottom:3,background:selected?.id===u.id?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.02)',border:`1px solid ${selected?.id===u.id?'rgba(59,130,246,0.3)':'transparent'}`}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
                  {(u.name||u.email||'?')[0].toUpperCase()}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{color:'#fff',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name||'—'}</div>
                  <div style={{color:'#475569',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                </div>
                <div style={{flexShrink:0}}>
                  <span style={{padding:'2px 6px',borderRadius:20,fontSize:9,fontWeight:700,background:'rgba(139,92,246,0.15)',color:'#c084fc'}}>{u.plan_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message + actions */}
        <div>
          <div style={card}>
            <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 14px'}}>
              💬 {selected ? `${selected.name||selected.email}'e Mesaj` : 'Kullanıcı Seçin'}
            </h3>
            {selected ? (
              <>
                {result && <div style={{padding:'10px 14px',borderRadius:9,marginBottom:12,background:result.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',color:result.startsWith('✅')?'#34d399':'#f87171',fontSize:12}}>{result}</div>}
                <div style={{marginBottom:12}}><label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Başlık</label>
                  <input value={msg.title} onChange={e=>setMsg({...msg,title:e.target.value})} placeholder="Mesaj başlığı" style={inp} /></div>
                <div style={{marginBottom:12}}><label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Mesaj</label>
                  <textarea value={msg.body} onChange={e=>setMsg({...msg,body:e.target.value})} placeholder="Kullanıcıya gönderilecek mesaj..." rows={4} style={{...inp,resize:'vertical' as const}} /></div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={sendDM} disabled={sending} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
                    {sending?'Gönderiliyor...':'💬 Bildirim Gönder'}
                  </button>
                  <Link href={`/admin/users/${selected.id}`} style={{padding:'10px 16px',borderRadius:9,background:'rgba(139,92,246,0.2)',color:'#c084fc',textDecoration:'none',fontSize:13,fontWeight:600,display:'flex',alignItems:'center'}}>
                    👤 Profil
                  </Link>
                </div>
              </>
            ) : (
              <div style={{color:'#334155',fontSize:13,padding:20,textAlign:'center'}}>Sol taraftan bir kullanıcı seçin</div>
            )}
          </div>

          {selected && (
            <div style={card}>
              <h3 style={{color:'#fff',fontSize:13,fontWeight:700,margin:'0 0 12px'}}>⚡ Hızlı Aksiyonlar</h3>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Link href={`/admin/users/${selected.id}`} style={{padding:'8px 14px',borderRadius:8,background:'rgba(59,130,246,0.15)',color:'#60a5fa',textDecoration:'none',fontSize:12,fontWeight:600}}>
                  🔍 Detay Görüntüle
                </Link>
                <Link href={`/admin/users/${selected.id}`} style={{padding:'8px 14px',borderRadius:8,background:'rgba(16,185,129,0.15)',color:'#34d399',textDecoration:'none',fontSize:12,fontWeight:600}}>
                  👁️ Kullanıcı Olarak Gir
                </Link>
                <Link href={`/admin/users/${selected.id}`} style={{padding:'8px 14px',borderRadius:8,background:'rgba(245,158,11,0.15)',color:'#fbbf24',textDecoration:'none',fontSize:12,fontWeight:600}}>
                  ⚡ Kredi Düzenle
                </Link>
              </div>
              <div style={{marginTop:12,fontSize:12,color:'#475569',lineHeight:1.8}}>
                <div>Kredi: <strong style={{color:'#fff'}}>{((selected.credits_total||0)-(selected.credits_used||0))} kalan</strong> / {selected.credits_total} toplam</div>
                <div>Plan: <strong style={{color:'#c084fc'}}>{selected.plan_type}</strong></div>
                <div>Kayıt: {new Date(selected.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
