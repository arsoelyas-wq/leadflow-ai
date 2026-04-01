'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { FileBarChart, RefreshCw, TrendingUp, Users, MessageSquare, DollarSign } from 'lucide-react'

export default function ReportsPage() {
  const [weekly, setWeekly] = useState<any>(null)
  const [monthly, setMonthly] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'weekly'|'monthly'>('weekly')

  useEffect(()=>{
    setLoading(true)
    Promise.allSettled([api.get('/api/reports/weekly'), api.get('/api/reports/monthly')])
      .then(([w, m])=>{
        if (w.status==='fulfilled') setWeekly(w.value)
        if (m.status==='fulfilled') setMonthly(m.value)
      }).finally(()=>setLoading(false))
  },[])

  const data = tab==='weekly' ? weekly : monthly

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileBarChart size={24} className="text-orange-400"/> Raporlar
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Haftalık ve aylık performans özeti</p>
      </div>

      <div className="flex gap-2">
        {(['weekly','monthly'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 text-sm rounded-xl border transition ${tab===t?'bg-orange-600 border-orange-500 text-white':'border-slate-700 text-slate-400 hover:text-white'}`}>
            {t==='weekly'?'7 Günlük':'30 Günlük'}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center h-32 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
      : !data ? <p className="text-slate-400">Veri yok</p>
      : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'Yeni Lead',value:data.newLeads,color:'text-blue-400',icon:Users},
              {label:'Kazanılan',value:data.wonLeads,color:'text-emerald-400',icon:TrendingUp},
              {label:'Gönderilen Mesaj',value:data.sentMessages,color:'text-purple-400',icon:MessageSquare},
              {label:'Gelir',value:`₺${(data.totalRevenue||0).toLocaleString('tr-TR')}`,color:'text-yellow-400',icon:DollarSign},
            ].map(({label,value,color,icon:Icon})=>(
              <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={color}/>
                  <p className="text-slate-400 text-xs">{label}</p>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {data.conversionRate !== undefined && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">📊 Dönüşüm Oranı</h2>
              <div className="flex items-center gap-4">
                <p className="text-4xl font-bold text-emerald-400">%{data.conversionRate}</p>
                <div>
                  <p className="text-slate-300 text-sm">{data.newLeads} yeni lead → {data.wonLeads} satış</p>
                  {data.topSource && <p className="text-slate-400 text-xs mt-1">En iyi kaynak: <span className="text-blue-400">{data.topSource}</span></p>}
                </div>
              </div>
            </div>
          )}

          {data.sourceCounts && Object.keys(data.sourceCounts).length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">📡 Kaynak Dağılımı</h2>
              <div className="space-y-2">
                {Object.entries(data.sourceCounts).sort((a:any,b:any)=>b[1]-a[1]).map(([source, count]:any)=>(
                  <div key={source} className="flex items-center gap-3">
                    <p className="text-slate-300 text-sm w-32 truncate">{source}</p>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width:`${Math.min(100,(count/data.newLeads)*100)}%`}}/>
                    </div>
                    <p className="text-white text-sm w-8 text-right">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}