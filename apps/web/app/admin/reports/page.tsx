'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }

export default function AdminReportsPage() {
  const [downloading, setDownloading] = useState<string|null>(null)

  const download = async (type: string, label: string) => {
    setDownloading(type)
    try {
      const r = await fetch(`${API}/api/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` }
      })
      if (!r.ok) throw new Error('İndirme başarısız')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `leadflow-${type}-${new Date().toISOString().slice(0,10)}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch(e:any) { alert('Hata: '+e.message) }
    finally { setDownloading(null) }
  }

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  const EXPORTS = [
    { type:'users', label:'👥 Kullanıcılar', desc:'Tüm kullanıcılar: email, plan, kredi, kayıt tarihi, ülke', icon:'👥' },
  ]

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>📤 Raporlar & Dışa Aktarma</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Sistem verilerini CSV olarak indirin</p>

      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>📊 Mevcut Raporlar</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>
          {EXPORTS.map(e=>(
            <div key={e.type} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{fontSize:28,flexShrink:0}}>{e.icon}</span>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontSize:13,fontWeight:600}}>{e.label}</div>
                <div style={{color:'#475569',fontSize:12,marginTop:2}}>{e.desc}</div>
              </div>
              <button onClick={()=>download(e.type,e.label)} disabled={downloading===e.type}
                style={{padding:'9px 18px',borderRadius:9,border:'none',background:downloading===e.type?'rgba(16,185,129,0.3)':'linear-gradient(135deg,#10b981,#06b6d4)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',flexShrink:0}}>
                {downloading===e.type?'⏳ İndiriliyor...':'⬇️ CSV İndir'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 14px'}}>🗺️ Çok Yakında</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {icon:'🎯',label:'Lead Raporu',desc:'Tüm lead verisi + kaynak + durum'},
            {icon:'📢',label:'Kampanya Raporu',desc:'Kampanya performansları'},
            {icon:'💰',label:'Gelir Raporu PDF',desc:'Aylık gelir ve MRR özeti'},
            {icon:'📊',label:'Analitik Özet',desc:'Kullanım trendleri ve öngörüler'},
          ].map(item=>(
            <div key={item.label} style={{padding:14,background:'rgba(255,255,255,0.01)',borderRadius:10,border:'1px dashed rgba(255,255,255,0.06)',opacity:0.5}}>
              <span style={{fontSize:20}}>{item.icon}</span>
              <div style={{color:'#94a3b8',fontSize:12,fontWeight:600,marginTop:6}}>{item.label}</div>
              <div style={{color:'#334155',fontSize:11,marginTop:2}}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
