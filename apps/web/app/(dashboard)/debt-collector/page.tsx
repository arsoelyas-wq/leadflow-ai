'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { DollarSign, Plus, RefreshCw, CheckCircle, AlertTriangle, Send, TrendingDown } from 'lucide-react'

export default function DebtPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [collecting, setCollecting] = useState<string|null>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ lead_id:'', invoice_no:'', amount:'', currency:'TL', due_date:'', description:'' })

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [inv, st, l] = await Promise.allSettled([
        api.get('/api/debt/invoices'),
        api.get('/api/debt/stats'),
        api.get('/api/leads?limit=100'),
      ])
      if (inv.status==='fulfilled') setInvoices(inv.value.invoices||[])
      if (st.status==='fulfilled') setStats(st.value)
      if (l.status==='fulfilled') setLeads(l.value.leads||[])
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const addInvoice = async () => {
    if (!form.lead_id||!form.amount||!form.due_date) return
    try {
      await api.post('/api/debt/invoices', form)
      showMsg('success','Fatura eklendi!')
      setShowAdd(false)
      setForm({lead_id:'',invoice_no:'',amount:'',currency:'TL',due_date:'',description:''})
      load()
    } catch (e:any) { showMsg('error',e.message) }
  }

  const markPaid = async (id:string) => {
    try {
      await api.patch(`/api/debt/invoices/${id}/paid`, {})
      showMsg('success','Ödendi olarak işaretlendi!')
      load()
    } catch (e:any) { showMsg('error',e.message) }
  }

  const collect = async (id?:string) => {
    setCollecting(id||'all')
    try {
      await api.post('/api/debt/collect-now', id?{invoiceId:id}:{})
      showMsg('success','Tahsilat mesajı gönderildi!')
      setTimeout(load, 2000)
    } catch (e:any) { showMsg('error',e.message) }
    finally { setCollecting(null) }
  }

  const filtered = filter==='all' ? invoices : invoices.filter(i=>i.status===filter)

  const statusColor: Record<string,string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    overdue: 'bg-red-500/20 text-red-300',
    paid: 'bg-emerald-500/20 text-emerald-300',
    final_notice: 'bg-orange-500/20 text-orange-300',
  }

  const statusLabel: Record<string,string> = {
    pending: 'Bekliyor', overdue: 'Vadesi Geçti', paid: 'Ödendi', final_notice: 'Son Uyarı'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingDown size={24} className="text-red-400"/> AI Tahsilat Takibi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Vadesi geçen faturaları otomatik takip et — WhatsApp ile tahsilat yap</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>collect()} disabled={collecting==='all'}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {collecting==='all'?<RefreshCw size={14} className="animate-spin"/>:<Send size={14}/>}
            {collecting==='all'?'Gönderiliyor...':'Toplu Tahsilat'}
          </button>
          <button onClick={()=>setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
            <Plus size={14}/> Fatura Ekle
          </button>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {label:'Toplam Fatura',value:stats.total,color:'text-white'},
            {label:'Vadesi Geçen',value:stats.overdue,color:'text-red-400'},
            {label:'Ödendi',value:stats.paid,color:'text-emerald-400'},
            {label:'Vadesi Geçen Tutar',value:`₺${stats.overdueAmount?.toLocaleString('tr-TR')}`,color:'text-red-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fatura Ekle */}
      {showAdd && (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold">➕ Yeni Fatura</h2>
          <div className="grid lg:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Müşteri *</label>
              <select value={form.lead_id} onChange={e=>setForm(p=>({...p,lead_id:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Seçin</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </div>
            {[
              {key:'invoice_no',label:'Fatura No',ph:'INV-001'},
              {key:'amount',label:'Tutar *',ph:'5000'},
              {key:'currency',label:'Para Birimi',ph:'TL'},
              {key:'due_date',label:'Vade Tarihi *',ph:'',type:'date'},
              {key:'description',label:'Açıklama',ph:'Mobilya teslimatı'},
            ].map(({key,label,ph,type})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input type={type||'text'} value={(form as any)[key]}
                  onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addInvoice} disabled={!form.lead_id||!form.amount||!form.due_date}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition">Ekle</button>
            <button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-2">
        {['all','pending','overdue','paid'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${filter===f?'bg-slate-700 border-slate-500 text-white':'border-slate-700 text-slate-400 hover:text-white'}`}>
            {f==='all'?'Tümü':statusLabel[f]}
          </button>
        ))}
      </div>

      {/* Fatura Listesi */}
      {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
      : filtered.length===0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
          <DollarSign size={36} className="text-slate-600 mx-auto mb-2"/>
          <p className="text-slate-400">Fatura bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv=>(
            <div key={inv.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{inv.leads?.company_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[inv.status]||'bg-slate-700 text-slate-400'}`}>
                    {statusLabel[inv.status]||inv.status}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{inv.invoice_no}</span>
                  <span>Vade: {inv.due_date}</span>
                  {inv.collection_attempts > 0 && <span className="text-orange-400">{inv.collection_attempts}. hatırlatma</span>}
                </div>
              </div>
              <p className="text-white font-bold text-lg">₺{parseFloat(inv.amount).toLocaleString('tr-TR')}</p>
              <div className="flex gap-2">
                {inv.status !== 'paid' && (
                  <>
                    <button onClick={()=>collect(inv.id)} disabled={collecting===inv.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg transition">
                      {collecting===inv.id?<RefreshCw size={11} className="animate-spin"/>:<Send size={11}/>}
                      Tahsilat
                    </button>
                    <button onClick={()=>markPaid(inv.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-lg transition">
                      <CheckCircle size={11}/> Ödendi
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}