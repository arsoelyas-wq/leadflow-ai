'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const TYPES = [
  { value:'dashboard', label:'🖥️ Dashboard — tüm sayfalarda görünür' },
  { value:'market_page', label:'🌍 Pazar Sayfası (/tr, /de, /ru...)' },
  { value:'sidebar', label:'📌 Sidebar Promo Kartı' },
  { value:'popup', label:'💬 Popup/Modal (giriş sonrası)' },
]
const EMPTY = { type:'dashboard', target_slug:'all', target_plan:'all', title:'', message:'', cta_text:'', cta_url:'', image_url:'', video_url:'', is_active:false }
const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'10px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit' }
const label_: React.CSSProperties = { display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8 }

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any|null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => { setLoading(true); const d = await adminApi.banners().catch(()=>({banners:[]})); setBanners(d.banners||[]); setLoading(false) }
  useEffect(() => { load() }, [])

  const showMsg = (t: string) => { setMsg(t); setTimeout(()=>setMsg(''),3000) }

  const save = async () => {
    setSaving(true)
    try {
      if (isNew) await adminApi.createBanner(editing)
      else await adminApi.updateBanner(editing.id, editing)
      showMsg('✅ Kaydedildi!'); setEditing(null); load()
    } catch(e:any) { showMsg('❌ '+e.message) } finally { setSaving(false) }
  }

  const toggle = async (b:any) => { await adminApi.updateBanner(b.id,{is_active:!b.is_active}); load() }
  const del = async (id:string) => { if(!confirm('Silinsin mi?')) return; await adminApi.deleteBanner(id); load() }

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:18,marginBottom:10 }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 4px',letterSpacing:'-0.02em'}}>🎬 Banner & Video Yöneticisi</h1>
          <p style={{color:'#334155',fontSize:13,margin:0}}>Dashboard, pazar sayfaları ve sidebar için içerik yönetimi</p>
        </div>
        <button onClick={()=>{setEditing({...EMPTY});setIsNew(true)}} style={{padding:'10px 18px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:'0 4px 15px rgba(59,130,246,0.3)'}}>
          + Yeni Banner
        </button>
      </div>

      {msg && <div style={{padding:'11px 16px',borderRadius:10,marginBottom:16,background:msg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,color:msg.startsWith('✅')?'#34d399':'#f87171',fontSize:13}}>{msg}</div>}

      {/* Editor */}
      {editing && (
        <div style={{background:'linear-gradient(135deg,rgba(5,10,25,0.97),rgba(8,15,35,0.98))',border:'1px solid rgba(59,130,246,0.2)',borderRadius:18,padding:28,marginBottom:24,boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
          <h3 style={{color:'#fff',fontSize:15,fontWeight:700,margin:'0 0 20px'}}>{isNew?'✨ Yeni Banner':'✏️ Banner Düzenle'}</h3>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={label_}>Banner Tipi</label>
              <select value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value})} style={inp}>
                {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><label style={label_}>Hedef Plan</label>
              <select value={editing.target_plan} onChange={e=>setEditing({...editing,target_plan:e.target.value})} style={inp}>
                <option value="all">Tüm Planlar</option>
                {['starter','growth','pro','enterprise'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {editing.type==='market_page' && (
            <div style={{marginBottom:14}}><label style={label_}>Pazar Sayfası Slug (tr, de, ru, all)</label>
              <input value={editing.target_slug} onChange={e=>setEditing({...editing,target_slug:e.target.value})} placeholder="tr" style={inp} />
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={label_}>Başlık</label><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} placeholder="Banner başlığı" style={inp} /></div>
            <div><label style={label_}>CTA Butonu</label><input value={editing.cta_text} onChange={e=>setEditing({...editing,cta_text:e.target.value})} placeholder="Daha Fazla Bilgi" style={inp} /></div>
          </div>

          <div style={{marginBottom:14}}><label style={label_}>Mesaj / Açıklama</label>
            <textarea value={editing.message} onChange={e=>setEditing({...editing,message:e.target.value})} placeholder="Banner metni..." rows={3} style={{...inp,resize:'vertical' as const}} />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={label_}>🖼️ Görsel URL</label><input value={editing.image_url} onChange={e=>setEditing({...editing,image_url:e.target.value})} placeholder="https://..." style={inp} /></div>
            <div><label style={label_}>🎬 Video URL (YouTube/Vimeo)</label><input value={editing.video_url} onChange={e=>setEditing({...editing,video_url:e.target.value})} placeholder="https://youtube.com/..." style={inp} /></div>
          </div>

          <div style={{marginBottom:20}}><label style={label_}>CTA Hedef URL</label><input value={editing.cta_url} onChange={e=>setEditing({...editing,cta_url:e.target.value})} placeholder="https://..." style={inp} /></div>

          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={save} disabled={saving} style={{padding:'10px 22px',borderRadius:10,border:'none',background:saving?'rgba(59,130,246,0.4)':'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
              {saving?'Kaydediliyor...':'💾 Kaydet'}
            </button>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'#94a3b8'}}>
              <input type="checkbox" checked={editing.is_active} onChange={e=>setEditing({...editing,is_active:e.target.checked})} />
              Yayında aktif
            </label>
            <button onClick={()=>setEditing(null)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>İptal</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <div style={{color:'#334155',padding:20}}>Yükleniyor...</div> :
        banners.length===0 ? (
          <div style={{...card,textAlign:'center',padding:40}}>
            <div style={{fontSize:36,marginBottom:12}}>🖼️</div>
            <p style={{color:'#334155',fontSize:13}}>Henüz banner yok. Yeni banner ekleyin.</p>
          </div>
        ) : banners.map(b => (
          <div key={b.id} style={{...card,opacity:b.is_active?1:0.6}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{color:'#fff',fontSize:13,fontWeight:700}}>{b.title||'Başlıksız Banner'}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,fontWeight:700,background:b.is_active?'rgba(16,185,129,0.15)':'rgba(100,116,139,0.15)',color:b.is_active?'#34d399':'#64748b'}}>{b.is_active?'● Aktif':'○ Pasif'}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(59,130,246,0.15)',color:'#60a5fa'}}>{b.type}</span>
                  {b.target_slug!=='all'&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(245,158,11,0.15)',color:'#fbbf24'}}>/{b.target_slug}</span>}
                  {b.target_plan!=='all'&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(139,92,246,0.15)',color:'#c084fc'}}>{b.target_plan}</span>}
                  {b.video_url&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(16,185,129,0.1)',color:'#34d399'}}>🎬 Video</span>}
                  {b.image_url&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:10,background:'rgba(6,182,212,0.1)',color:'#22d3ee'}}>🖼️ Görsel</span>}
                </div>
                <div style={{color:'#475569',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{b.message?.slice(0,90)||'Mesaj yok'}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>toggle(b)} title={b.is_active?'Deaktive et':'Aktive et'} style={{padding:'7px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:b.is_active?'#fbbf24':'#34d399',cursor:'pointer',fontSize:13}}>
                  {b.is_active?'🙈':'👁'}
                </button>
                <button onClick={()=>{setEditing({...b});setIsNew(false)}} style={{padding:'7px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#60a5fa',cursor:'pointer',fontSize:13}}>✏️</button>
                <button onClick={()=>del(b.id)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.08)',color:'#f87171',cursor:'pointer',fontSize:13}}>🗑️</button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )
}
