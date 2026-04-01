'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { TrendingDown, Plus, RefreshCw, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react'

export default function PriceTrackerPage() {
  const [trackers, setTrackers] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ url:'', name:'', competitorName:'', targetPrice:'' })
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [t, a, s] = await Promise.allSettled([
        api.get('/api/price-tracker/list'),
        api.get('/api/price-tracker/alerts'),
        api.get('/api/price-tracker/stats'),
      ])
      if (t.status==='fulfilled') setTrackers(t.value.trackers||[])
      if (a.status==='fulfilled') setAlerts(a.value.alerts||[])
      if (s.status==='fulfilled') setStats(s.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const addTracker = async () => {
    if (!form.url) return
    setAdding(true)
    try {
      const d = await api.post('/api/price-tracker/add', form)
      showMsg('success', d.message)
      setShowAdd(false)
      setForm({url:'',name:'',competitorName:'',targetPrice:''})
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setAdding(false) }
  }

  const checkAll = async () => {
    setChecking(true)
    try {
      await api.post('/api/price-tracker/check-all', {})
      showMsg('success', 'Fiyatlar kontrol ediliyor...')
      setTimeout(load, 10000)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setChecking(false) }
  }

  const checkOne = async (id: string) => {
    try {
      const d = await api.post(`/api/price-tracker/check/${id}`, {})
      showMsg(d.changed ? 'success' : 'success', d.message)
      load()
    } catch (e:any) { showMsg('error', e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingDown size={24} className="text-red-400"/> Rakip Fiyat Takibi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Rakiplerin fiyatlarını 7/24 izle — fiyat düşünce anında bildirim al</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkAll} disabled={checking}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {checking?<RefreshCw size={14} className="animate-spin"/>:<RefreshCw size={14}/>}
            {checking?'Kontrol ediliyor...':'Tümünü Kontrol Et'}
          </button>
          <button onClick={()=>setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-xl transition">
            <Plus size={14}/> URL Ekle
          </button>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Takip Edilen',value:stats.total,color:'text-white'},
            {label:'Fiyat Düşüşü',value:stats.priceDrops,color:'text-emerald-400'},
            {label:'Fiyat Artışı',value:stats.priceRises,color:'text-red-400'},
          ].map(({label,value,color})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ekle */}
      {showAdd && (
        <div className="bg-slate-800/50 border border-red-500/30 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold">🔗 Yeni Fiyat Takibi</h2>
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="lg:col-span-2">
              <label className="text-slate-400 text-xs mb-1 block">Ürün URL * (Trendyol, Hepsiburada, rakip site...)</label>
              <input value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))}
                placeholder="https://www.trendyol.com/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"/>
            </div>
            {[
              {k:'name',l:'Ürün Adı',p:'iPhone 15 Pro'},
              {k:'competitorName',l:'Rakip Adı',p:'Trendyol'},
              {k:'targetPrice',l:'Hedef Fiyat (Alarm)',p:'15000'},
            ].map(({k,l,p})=>(
              <div key={k}>
                <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                <input value={(form as any)[k]} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))}
                  placeholder={p} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"/>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addTracker} disabled={adding||!form.url}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
              {adding?'Ekleniyor...':'Takibe Ekle'}
            </button>
            <button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Trackers */}
      {loading ? <div className="flex justify-center h-20 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
      : trackers.length===0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
          <TrendingDown size={40} className="text-slate-600 mx-auto mb-2"/>
          <p className="text-slate-400">Henüz fiyat takibi yok</p>
          <p className="text-slate-500 text-sm mt-1">Rakip ürün URL'si ekleyin — fiyat değişince haber veririz</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trackers.map(t=>(
            <div key={t.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{t.name}</p>
                  <span className="text-xs text-slate-500 flex-shrink-0">{t.competitor_name}</span>
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  {t.initial_price && t.current_price && t.initial_price !== t.current_price && (
                    <span className={t.current_price < t.initial_price ? 'text-emerald-400' : 'text-red-400'}>
                      {t.current_price < t.initial_price ? '↓' : '↑'} {t.initial_price} → {t.current_price}
                    </span>
                  )}
                  {t.target_price && <span className="text-yellow-400">Hedef: {t.target_price} {t.currency}</span>}
                  {t.last_checked && <span>Son: {new Date(t.last_checked).toLocaleString('tr-TR')}</span>}
                </div>
              </div>
              <p className="text-white font-bold text-lg flex-shrink-0">
                {t.current_price ? `${t.current_price.toLocaleString('tr-TR')} ${t.currency}` : '—'}
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={()=>checkOne(t.id)}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                  <RefreshCw size={13}/>
                </button>
                <a href={t.url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                  <ExternalLink size={13}/>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-400"/> Son Fiyat Değişiklikleri
          </h2>
          {alerts.slice(0,5).map((a:any,i:number)=>(
            <div key={i} className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${a.direction==='down'?'bg-emerald-500/10 border-emerald-500/20':'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-xl">{a.direction==='down'?'📉':'📈'}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{a.price_trackers?.name}</p>
                <p className={`text-xs ${a.direction==='down'?'text-emerald-300':'text-red-300'}`}>
                  {a.old_price} → {a.new_price} {a.direction==='down'?'(Düştü!)':'(Yükseldi)'}
                </p>
              </div>
              <span className="text-slate-400 text-xs">{new Date(a.checked_at).toLocaleDateString('tr-TR')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}