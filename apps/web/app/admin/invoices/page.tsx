'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}/api/admin${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}`, ...opts.headers } })
  return r.json()
}

const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  pending:  {bg:'rgba(245,158,11,0.15)',color:'#fbbf24'},
  paid:     {bg:'rgba(16,185,129,0.15)',color:'#34d399'},
  cancelled:{bg:'rgba(100,116,139,0.15)',color:'#94a3b8'},
  overdue:  {bg:'rgba(239,68,68,0.15)',color:'#f87171'},
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [updating, setUpdating] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (statusFilter) params.set('status', statusFilter)
      const [inv, st] = await Promise.all([
        req(`/invoices?${params}`),
        req('/invoices/stats')
      ])
      setInvoices(inv.invoices || [])
      setTotal(inv.total || 0)
      setStats(st)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, statusFilter])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await req(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      load()
    } finally { setUpdating(null) }
  }

  const openInvoice = (id: string) => {
    window.open(`${API}/api/invoices/${id}/html?token=${getAdminToken()}`, '_blank')
  }

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:22,marginBottom:16 }
  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:13,padding:'9px 14px',outline:'none',fontFamily:'inherit' }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🧾 Fatura Yönetimi</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Tüm kullanıcıların faturaları, ödeme durumları ve gelir takibi</p>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:'Toplam Fatura',value:stats?.total||0,color:'#94a3b8'},
          {label:'Ödendi',value:stats?.paid||0,color:'#34d399'},
          {label:'Bekliyor',value:stats?.pending||0,color:'#fbbf24'},
          {label:'Toplam Gelir',value:`₺${((stats?.total_revenue||0)/100).toLocaleString()}`,color:'#10b981'},
        ].map(s=>(
          <div key={s.label} style={card}>
            <div style={{fontSize:22,fontWeight:900,color:s.color}}>{loading?'—':s.value}</div>
            <div style={{fontSize:11,color:'#475569',marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:14}}>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={inp}>
          <option value="">Tüm Durumlar</option>
          {['pending','paid','cancelled','overdue'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{color:'#475569',fontSize:13,alignSelf:'center'}}>{total} fatura</span>
      </div>

      {/* Table */}
      <div style={card}>
        {loading ? <div style={{color:'#334155',padding:20}}>Yükleniyor...</div> :
          invoices.length===0 ? <div style={{color:'#334155',padding:40,textAlign:'center'}}>Fatura bulunamadı</div> :
          <table style={{width:'100%',borderCollapse:'collapse' as const}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                {['Fatura No','Kullanıcı','Tutar','Durum','Tarih','İşlem'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left' as const,fontSize:10,fontWeight:700,color:'#334155',textTransform:'uppercase' as const,letterSpacing:'0.1em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv:any)=>(
                <tr key={inv.id} style={{borderBottom:'1px solid rgba(255,255,255,0.025)'}}>
                  <td style={{padding:'12px 14px',color:'#60a5fa',fontSize:12,fontFamily:'monospace'}}>{inv.invoice_number}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{color:'#fff',fontSize:12,fontWeight:600}}>{inv.users?.name||'—'}</div>
                    <div style={{color:'#475569',fontSize:11}}>{inv.users?.email}</div>
                  </td>
                  <td style={{padding:'12px 14px',color:'#10b981',fontSize:13,fontWeight:700}}>₺{((inv.total||0)/100).toFixed(2)}</td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,...(STATUS_STYLE[inv.status]||{bg:'rgba(100,116,139,0.15)',color:'#94a3b8'})}}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{padding:'12px 14px',color:'#64748b',fontSize:12}}>{new Date(inv.created_at).toLocaleDateString('tr-TR')}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>openInvoice(inv.id)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#60a5fa',cursor:'pointer',fontSize:11}}>HTML</button>
                      {inv.status==='pending' && (
                        <button onClick={()=>updateStatus(inv.id,'paid')} disabled={updating===inv.id}
                          style={{padding:'5px 10px',borderRadius:7,border:'none',background:'rgba(16,185,129,0.2)',color:'#34d399',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                          {updating===inv.id?'...':'Ödendi'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {total > 50 && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
          <span style={{color:'#475569',fontSize:13}}>{(page-1)*50+1}–{Math.min(page*50,total)} / {total}</span>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'#94a3b8',cursor:'pointer',fontSize:13,opacity:page===1?0.4:1,fontFamily:'inherit'}}>← Önceki</button>
            <button onClick={()=>setPage(p=>p+1)} disabled={page*50>=total} style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'#94a3b8',cursor:'pointer',fontSize:13,opacity:page*50>=total?0.4:1,fontFamily:'inherit'}}>Sonraki →</button>
          </div>
        </div>
      )}
    </div>
  )
}
