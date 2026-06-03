'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const EMPTY = { code:'', type:'credits', value:0, max_uses:'', expires_at:'', is_active:true }
const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit' }

export default function AdminPromoPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({...EMPTY})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = async () => { setLoading(true); const d = await adminApi.promoCodes().catch(()=>({codes:[]})); setCodes(d.codes||[]); setLoading(false) }
  useEffect(()=>{ load() },[])
  const showMsg = (t:string) => { setMsg(t); setTimeout(()=>setMsg(''),3000) }

  const save = async (e:React.FormEvent) => {
    e.preventDefault(); if(!form.code||!form.value) return showMsg('❌ Kod ve değer zorunlu')
    setSaving(true)
    try { await adminApi.createPromo({...form,value:parseInt(form.value),max_uses:form.max_uses?parseInt(form.max_uses):null}); showMsg('✅ Promo kodu oluşturuldu!'); setForm({...EMPTY}); setShowForm(false); load() }
    catch(e:any) { showMsg('❌ '+e.message) } finally { setSaving(false) }
  }

  const toggle = async (c:any) => { await adminApi.updatePromo(c.id,{is_active:!c.is_active}); load() }
  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:18,marginBottom:10 }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div><h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 4px',letterSpacing:'-0.02em'}}>🎁 Promo Kodları</h1><p style={{color:'#334155',fontSize:13,margin:0}}>Kredi ve indirim kodları oluşturun</p></div>
        <button onClick={()=>setShowForm(!showForm)} style={{padding:'10px 18px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#f59e0b,#f97316)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>+ Yeni Kod</button>
      </div>

      {msg && <div style={{padding:'11px 16px',borderRadius:10,marginBottom:16,background:msg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,color:msg.startsWith('✅')?'#34d399':'#f87171',fontSize:13}}>{msg}</div>}

      {showForm && (
        <form onSubmit={save} style={{...card,border:'1px solid rgba(245,158,11,0.2)',marginBottom:20,padding:24}}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>Yeni Promo Kodu</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
            <div><label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Kod</label><input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="LAUNCH50" style={inp} /></div>
            <div><label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Tip</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                <option value="credits">Kredi Ekle</option>
                <option value="discount_percent">% İndirim</option>
              </select>
            </div>
            <div><label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Değer</label><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="100" style={inp} /></div>
            <div><label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Max Kullanım</label><input type="number" value={form.max_uses} onChange={e=>setForm({...form,max_uses:e.target.value})} placeholder="Sınırsız" style={inp} /></div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button type="submit" disabled={saving} style={{padding:'9px 20px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#f59e0b,#f97316)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>{saving?'Oluşturuluyor...':'Kod Oluştur'}</button>
            <button type="button" onClick={()=>setShowForm(false)} style={{padding:'9px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>İptal</button>
          </div>
        </form>
      )}

      {loading?<div style={{color:'#475569'}}>Yükleniyor...</div>:
        codes.length===0?<div style={{...card,textAlign:'center',padding:40,color:'#334155'}}>Henüz promo kodu yok</div>:
        codes.map(c=>(
          <div key={c.id} style={{...card,opacity:c.is_active?1:0.5}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <code style={{color:'#fbbf24',fontSize:15,fontWeight:800,letterSpacing:'0.05em'}}>{c.code}</code>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,fontWeight:700,background:c.is_active?'rgba(16,185,129,0.15)':'rgba(100,116,139,0.15)',color:c.is_active?'#34d399':'#64748b'}}>{c.is_active?'Aktif':'Pasif'}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(245,158,11,0.15)',color:'#fbbf24'}}>{c.type==='credits'?`+${c.value} Kredi`:`%${c.value} İndirim`}</span>
                </div>
                <div style={{color:'#475569',fontSize:12}}>{c.uses_count||0} / {c.max_uses||'∞'} kullanım · {c.created_by||'admin'} tarafından oluşturuldu</div>
              </div>
              <button onClick={()=>toggle(c)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:c.is_active?'#fbbf24':'#34d399',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
                {c.is_active?'Deaktive Et':'Aktive Et'}
              </button>
            </div>
          </div>
        ))
      }
    </div>
  )
}
