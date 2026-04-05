'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { FileText, Plus, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react'

const STATUS_COLORS: Record<string,string> = {
  draft: 'bg-slate-500/20 text-slate-300',
  sent: 'bg-blue-500/20 text-blue-300',
  paid: 'bg-emerald-500/20 text-emerald-300',
  overdue: 'bg-red-500/20 text-red-300',
}
const STATUS_LABELS: Record<string,string> = { draft:'Taslak', sent:'Gönderildi', paid:'Ödendi', overdue:'Gecikmiş' }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ leadId:'', dueDate:'', notes:'', items:[{name:'', qty:1, price:0}] })
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    Promise.allSettled([api.get('/api/invoices/list'), api.get('/api/invoices/stats'), api.get('/api/leads?limit=200')])
      .then(([i,s,l])=>{
        if (i.status==='fulfilled') setInvoices(i.value.invoices||[])
        if (s.status==='fulfilled') setStats(s.value)
        if (l.status==='fulfilled') setLeads(l.value.leads||[])
      })
  }

  useEffect(()=>{ load() },[])

  const createInvoice = async () => {
    if (!form.leadId || !form.items[0].name) return
    setCreating(true)
    try {
      const d = await api.post('/api/invoices/create', form)
      showMsg('success', d.message)
      setShowCreate(false)
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/invoices/${id}/status`, { status })
      showMsg('success', `Fatura ${STATUS_LABELS[status]} olarak güncellendi`)
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  const addItem = () => setForm(p=>({...p, items:[...p.items, {name:'', qty:1, price:0}]}))
  const updateItem = (i: number, field: string, value: any) => {
    const items = [...form.items]
    items[i] = {...items[i], [field]: value}
    setForm(p=>({...p, items}))
  }
  const total = form.items.reduce((s,i)=>s+(i.qty*i.price), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText size={24} className="text-orange-400"/> Fatura Yönetimi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Otomatik fatura oluşturun, takip edin, PDF olarak gönderin</p>
        </div>
        <button onClick={()=>setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-xl transition">
          <Plus size={14}/> Yeni Fatura
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:'Toplam', value:stats.total, color:'text-white'},
            {label:'Ödendi', value:stats.paid, color:'text-emerald-400'},
            {label:'Bekliyor', value:stats.pending, color:'text-blue-400'},
            {label:'Gecikmiş', value:stats.overdue, color:'text-red-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-slate-400 text-xs">Tahsil Edilen</p>
            <p className="text-emerald-400 text-2xl font-bold">₺{stats.totalRevenue?.toLocaleString('tr-TR')}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <p className="text-slate-400 text-xs">Bekleyen</p>
            <p className="text-yellow-400 text-2xl font-bold">₺{stats.pendingRevenue?.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      )}

      {/* Fatura Oluştur */}
      {showCreate && (
        <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">📄 Yeni Fatura</h2>
          <div className="grid lg:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Müşteri *</label>
              <select value={form.leadId} onChange={e=>setForm(p=>({...p,leadId:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Seçin...</option>
                {leads.map((l:any)=><option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Vade Tarihi</label>
              <input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"/>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Notlar</label>
              <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                placeholder="Ödeme koşulları..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-400 text-xs">Kalemler</label>
              <button onClick={addItem} className="text-blue-400 text-xs hover:underline">+ Ekle</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item,i)=>(
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input value={item.name} onChange={e=>updateItem(i,'name',e.target.value)} placeholder="Hizmet adı"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"/>
                  <input type="number" value={item.qty} onChange={e=>updateItem(i,'qty',parseInt(e.target.value)||1)} placeholder="Adet"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"/>
                  <input type="number" value={item.price} onChange={e=>updateItem(i,'price',parseFloat(e.target.value)||0)} placeholder="Fiyat (₺)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"/>
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-white font-medium">Toplam: ₺{(total*1.18).toLocaleString('tr-TR')} (KDV dahil)</div>
          </div>
          <div className="flex gap-2">
            <button onClick={createInvoice} disabled={creating||!form.leadId}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              {creating?'Oluşturuluyor...':'Fatura Oluştur'}
            </button>
            <button onClick={()=>setShowCreate(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Fatura Listesi */}
      <div className="space-y-2">
        {invoices.length===0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
            <FileText size={40} className="text-slate-600 mx-auto mb-2"/>
            <p className="text-slate-400">Henüz fatura yok</p>
          </div>
        ) : invoices.map((inv:any)=>(
          <div key={inv.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{inv.invoice_number}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]||'bg-slate-700 text-slate-400'}`}>
                  {STATUS_LABELS[inv.status]||inv.status}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">{inv.client_name} — {new Date(inv.created_at).toLocaleDateString('tr-TR')}</p>
            </div>
            <p className="text-white font-bold">₺{parseFloat(inv.total||0).toLocaleString('tr-TR')}</p>
            <div className="flex gap-2">
              {inv.status !== 'paid' && (
                <button onClick={()=>updateStatus(inv.id,'paid')}
                  className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded-lg transition">
                  ✅ Ödendi
                </button>
              )}
              <a href={`/api/invoices/${inv.id}/html`} target="_blank" rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition flex items-center gap-1">
                <ExternalLink size={10}/> PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}