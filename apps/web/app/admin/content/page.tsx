'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'
import { MARKET_SLUGS } from '@/lib/market-pages'

export default function AdminContentPage() {
  const [pages, setPages] = useState<any[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      // Get market pages via regular api (admin can see all)
      fetch(process.env.NEXT_PUBLIC_API_URL+'/api/market-pages/public/tr').then(r=>r.json()).catch(()=>null),
      adminApi.banners()
    ]).then(([_tr, b]) => {
      setBanners(b.banners || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }
  const activeBanners = banners.filter(b=>b.is_active).length

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🌍 İçerik & Pazar Sayfaları</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Pazar sayfaları, banner yönetimi ve UI kontrol merkezi</p>

      {/* Market Pages */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 18px'}}>🗺️ Aktif Pazar Sayfaları</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
          {Object.entries(MARKET_SLUGS).map(([slug, m]) => (
            <div key={slug} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.05)',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>{m.flag}</div>
              <div style={{color:'#fff',fontSize:12,fontWeight:600}}>{m.name}</div>
              <code style={{color:'#475569',fontSize:10}}>/{slug}</code>
              <div style={{marginTop:8,display:'flex',gap:4,justifyContent:'center'}}>
                <a href={`/${slug}`} target="_blank" rel="noreferrer"
                  style={{padding:'3px 8px',borderRadius:6,fontSize:10,background:'rgba(59,130,246,0.15)',color:'#60a5fa',textDecoration:'none'}}>Önizle</a>
                <Link href={`/market-pages/${slug}`}
                  style={{padding:'3px 8px',borderRadius:6,fontSize:10,background:'rgba(16,185,129,0.15)',color:'#34d399',textDecoration:'none'}}>Düzenle</Link>
              </div>
            </div>
          ))}
        </div>
        <p style={{color:'#334155',fontSize:12}}>💡 Pazar sayfalarını düzenlemek için dashboard'da <strong style={{color:'#60a5fa'}}>/market-pages</strong> sayfasını kullanın.</p>
      </div>

      {/* Banners summary */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:0}}>🎬 Banner & Video Yönetimi</h3>
          <Link href="/admin/content/banners" style={{padding:'8px 16px',borderRadius:9,background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>
            Yönet →
          </Link>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[
            {label:'Toplam Banner',value:banners.length,color:'#94a3b8'},
            {label:'Aktif',value:activeBanners,color:'#34d399'},
            {label:'Pasif',value:banners.length-activeBanners,color:'#64748b'},
            {label:'Video Banner',value:banners.filter(b=>b.video_url).length,color:'#8b5cf6'},
          ].map(s=>(
            <div key={s.label} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:900,color:s.color}}>{loading?'—':s.value}</div>
              <div style={{fontSize:11,color:'#475569',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
        {!loading && banners.length > 0 && (
          <div style={{marginTop:12}}>
            {banners.slice(0,3).map(b=>(
              <div key={b.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:12}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:b.is_active?'#34d399':'#64748b',flexShrink:0}}/>
                <span style={{color:'#e2e8f0',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title||'Başlıksız'}</span>
                <span style={{padding:'2px 6px',borderRadius:20,fontSize:10,background:'rgba(59,130,246,0.15)',color:'#60a5fa'}}>{b.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
