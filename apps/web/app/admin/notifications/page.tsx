'use client'
import { useState } from 'react'
import { adminApi } from '@/lib/admin-api'

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({ title:'', message:'', target_plan:'all', href:'/dashboard' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title||!form.message) return setError('Başlık ve mesaj zorunlu')
    setSending(true); setError(''); setResult(null)
    try { const d = await adminApi.broadcast(form); setResult(d); setForm({title:'',message:'',target_plan:'all',href:'/dashboard'}) }
    catch(e:any) { setError(e.message) } finally { setSending(false) }
  }

  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:14,padding:'12px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit' }
  const label_: React.CSSProperties = { display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8 }

  return (
    <div style={{maxWidth:620}}>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>📢 Duyuru Gönder</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Tüm kullanıcılara veya belirli plana anlık bildirim gönder</p>

      {result && (
        <div style={{padding:16,borderRadius:12,marginBottom:20,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{color:'#34d399',fontWeight:700,fontSize:15}}>✅ Başarıyla Gönderildi!</div>
          <div style={{color:'#6ee7b7',fontSize:13,marginTop:4}}>{result.sent} kullanıcıya bildirim gönderildi.</div>
        </div>
      )}
      {error && <div style={{padding:12,borderRadius:10,marginBottom:16,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',fontSize:13}}>{error}</div>}

      <form onSubmit={send} style={{background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:32}}>
        <div style={{marginBottom:18}}>
          <label style={label_}>Hedef Kitle</label>
          <select value={form.target_plan} onChange={e=>setForm({...form,target_plan:e.target.value})} style={inp}>
            <option value="all">🌍 Tüm Kullanıcılar</option>
            <option value="starter">Starter Plan</option>
            <option value="growth">Growth Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>
        </div>
        <div style={{marginBottom:18}}>
          <label style={label_}>Başlık</label>
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Yeni özellik yayında! 🎉" style={inp} />
        </div>
        <div style={{marginBottom:18}}>
          <label style={label_}>Mesaj</label>
          <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Bildirim mesajı..." rows={4} style={{...inp,resize:'vertical' as const}} />
        </div>
        <div style={{marginBottom:28}}>
          <label style={label_}>Tıklama URL'si</label>
          <input value={form.href} onChange={e=>setForm({...form,href:e.target.value})} placeholder="/dashboard, /billing, /campaigns..." style={inp} />
        </div>
        <button type="submit" disabled={sending} style={{padding:'13px 28px',borderRadius:12,border:'none',background:sending?'rgba(59,130,246,0.4)':'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:sending?'not-allowed':'pointer',fontSize:15,fontWeight:700,fontFamily:'inherit',boxShadow:sending?'none':'0 4px 15px rgba(59,130,246,0.3)',transition:'all 0.2s'}}>
          {sending?'⏳ Gönderiliyor...':'📤 Bildirimi Gönder'}
        </button>
      </form>
    </div>
  )
}
