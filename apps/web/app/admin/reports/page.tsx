'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }

async function downloadCSV(endpoint: string, filename: string) {
  const r = await fetch(`${API}/api/admin/export/${endpoint}`, { headers: { Authorization: `Bearer ${getAdminToken()}` } })
  if (!r.ok) throw new Error('İndirme başarısız')
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `leadflow-${filename}-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportsPage() {
  const [revenue, setRevenue] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string|null>(null)
  const [emailReport, setEmailReport] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    Promise.all([adminApi.revenue(), adminApi.analytics()])
      .then(([r,a]) => { setRevenue(r); setAnalytics(a) })
      .finally(() => setLoading(false))
  }, [])

  const download = async (type: string, label: string) => {
    setDownloading(type)
    try { await downloadCSV(type, label) }
    catch(e:any) { alert('Hata: '+e.message) }
    finally { setDownloading(null) }
  }

  const downloadRevenueHTML = () => {
    if (!revenue) return
    const html = `<!DOCTYPE html><html lang="tr">
<head><meta charset="UTF-8"><title>LeadFlow Gelir Raporu</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0f1e;color:#e2e8f0;padding:40px;max-width:900px;margin:0 auto}
h1{font-size:28px;font-weight:900;color:#fff;margin-bottom:4px}
.sub{color:#64748b;font-size:14px;margin-bottom:32px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.stat{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px}
.val{font-size:32px;font-weight:900;margin:0 0 4px}
.lbl{color:#64748b;font-size:12px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 16px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06)}
th{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#475569}
</style></head>
<body>
<h1>💰 LeadFlow AI — Gelir Raporu</h1>
<p class="sub">Oluşturulma tarihi: ${new Date().toLocaleDateString('tr-TR', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
<div class="grid">
  <div class="stat"><p class="val" style="color:#10b981">₺${(revenue.mrr||0).toLocaleString()}</p><p class="lbl">Aylık Gelir (MRR)</p></div>
  <div class="stat"><p class="val" style="color:#3b82f6">₺${(revenue.arr||0).toLocaleString()}</p><p class="lbl">Yıllık Tahmin (ARR)</p></div>
  <div class="stat"><p class="val" style="color:#8b5cf6">${(revenue.total_credits_used||0).toLocaleString()}</p><p class="lbl">Toplam Kredi Kullanımı</p></div>
</div>
<h2 style="font-size:16px;margin-bottom:16px">Plan Bazında Gelir</h2>
<table>
  <tr>${['Plan','Aylık Gelir','Yıllık Tahmin'].map(h=>`<th>${h}</th>`).join('')}</tr>
  ${Object.entries(revenue.by_plan||{}).map(([plan,rev]:any)=>`<tr><td style="text-transform:capitalize">${plan}</td><td>₺${rev.toLocaleString()}</td><td>₺${(rev*12).toLocaleString()}</td></tr>`).join('')}
</table>
<p style="color:#334155;font-size:11px;margin-top:32px">Bu rapor LeadFlow Admin OS tarafından otomatik oluşturuldu.</p>
</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`leadflow-gelir-${new Date().toISOString().slice(0,10)}.html`; a.click()
    URL.revokeObjectURL(url)
  }

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }

  const EXPORTS = [
    { type:'users', label:'Kullanıcılar', desc:'Email, plan, kredi, kayıt tarihi, ülke', icon:'👥', color:'#3b82f6' },
  ]

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>📤 Raporlar & Dışa Aktarma</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Sistem verilerini indirin, gelir raporlarını PDF olarak alın</p>

      {/* Revenue summary */}
      {!loading && revenue && (
        <div style={{...card,border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:0}}>💰 Güncel Gelir Özeti</h3>
            <button onClick={downloadRevenueHTML} style={{padding:'8px 16px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#10b981,#06b6d4)',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
              ⬇️ HTML Rapor İndir
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {[
              {label:'MRR',value:`₺${(revenue.mrr||0).toLocaleString()}`,color:'#10b981'},
              {label:'ARR (Tahmin)',value:`₺${(revenue.arr||0).toLocaleString()}`,color:'#3b82f6'},
              {label:'Toplam Kredi',value:(revenue.total_credits_used||0).toLocaleString(),color:'#8b5cf6'},
            ].map(s=>(
              <div key={s.label} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10}}>
                <div style={{fontSize:22,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:'#475569',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Exports */}
      <div style={card}>
        <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>📊 CSV Dışa Aktarma</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {EXPORTS.map(e=>(
            <div key={e.type} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{fontSize:24}}>{e.icon}</span>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontSize:13,fontWeight:600}}>{e.label}</div>
                <div style={{color:'#475569',fontSize:11}}>{e.desc}</div>
              </div>
              <button onClick={()=>download(e.type,e.label.toLowerCase())} disabled={downloading===e.type}
                style={{padding:'9px 18px',borderRadius:9,background:`${e.color}25`,color:e.color,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit',border:`1px solid ${e.color}30`,flexShrink:0}}>
                {downloading===e.type?'⏳...':'⬇️ CSV İndir'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Geographic report */}
      {!loading && analytics && (
        <div style={card}>
          <h3 style={{color:'#fff',fontSize:14,fontWeight:700,margin:'0 0 16px'}}>🌍 Coğrafi Özet</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <div style={{color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>Ülke Dağılımı</div>
              {(analytics.by_country||[]).slice(0,8).map((c:any)=>(
                <div key={c.country} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:12,borderBottom:'1px solid rgba(255,255,255,0.025)'}}>
                  <span style={{color:'#94a3b8'}}>{c.country||'Bilinmiyor'}</span>
                  <span style={{color:'#60a5fa',fontWeight:600}}>{c.count}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>Aylık Kayıt Trendi</div>
              {(analytics.signups_by_month||[]).slice(-6).reverse().map((m:any)=>(
                <div key={m.month} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:12,borderBottom:'1px solid rgba(255,255,255,0.025)'}}>
                  <span style={{color:'#94a3b8'}}>{m.month}</span>
                  <span style={{color:'#10b981',fontWeight:600}}>+{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{...card,padding:16,opacity:0.5}}>
        <div style={{color:'#475569',fontSize:12}}>🔜 <strong style={{color:'#94a3b8'}}>Yakında:</strong> Zamanlanmış haftalık e-posta raporu, PDF gelir raporu, kampanya performans export, KVKK/GDPR uyum raporu</div>
      </div>
    </div>
  )
}
