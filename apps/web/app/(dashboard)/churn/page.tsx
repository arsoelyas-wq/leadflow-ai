'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { TrendingDown, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react'

const RISK_COLORS: Record<string,string> = {
  high: 'bg-red-500/20 border-red-500/30 text-red-300',
  medium: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
  low: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
}
const RISK_ICONS: Record<string,string> = { high:'🚨', medium:'⚠️', low:'✅' }

export default function ChurnPage() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    setLoading(true)
    Promise.allSettled([api.get('/api/churn/predictions'), api.get('/api/churn/stats')])
      .then(([p, s])=>{
        if (p.status==='fulfilled') setPredictions(p.value.predictions||[])
        if (s.status==='fulfilled') setStats(s.value)
      }).finally(()=>setLoading(false))
  },[])

  const highRisk = predictions.filter(p=>p.risk==='high')
  const mediumRisk = predictions.filter(p=>p.risk==='medium')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingDown size={24} className="text-red-400"/> Predictive Churn Engine
        </h1>
        <p className="text-slate-400 mt-1 text-sm">AI ile müşteri kaybını önceden tahmin edin ve önlem alın</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {label:'Yüksek Risk', value:highRisk.length, color:'text-red-400', bg:'bg-red-500/10 border-red-500/20'},
          {label:'Orta Risk', value:mediumRisk.length, color:'text-yellow-400', bg:'bg-yellow-500/10 border-yellow-500/20'},
          {label:'Düşük Risk', value:predictions.filter(p=>p.risk==='low').length, color:'text-emerald-400', bg:'bg-emerald-500/10 border-emerald-500/20'},
        ].map(({label,value,color,bg})=>(
          <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {highRisk.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <h2 className="text-red-300 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16}/> Acil Aksiyon Gereken Müşteriler
          </h2>
          <div className="space-y-2">
            {highRisk.slice(0,3).map((p:any)=>(
              <div key={p.lead.id} className="flex items-center gap-3 bg-slate-900 rounded-lg px-4 py-2.5">
                <span className="text-xl">🚨</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{p.lead.company_name}</p>
                  <p className="text-red-300 text-xs">{p.daysSinceContact === 999 ? 'Hiç iletişim yok' : `${p.daysSinceContact} gündür iletişim yok`}</p>
                </div>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">
                  <MessageSquare size={11}/> Mesaj Gönder
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-32 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
      ) : predictions.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
          <TrendingDown size={40} className="text-slate-600 mx-auto mb-2"/>
          <p className="text-slate-400">Kazanılmış müşteri bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-white font-semibold">Tüm Müşteri Risk Analizi</h2>
          {predictions.map((p:any)=>(
            <div key={p.lead.id} className={`border rounded-xl px-5 py-3 flex items-center gap-4 ${RISK_COLORS[p.risk]}`}>
              <span className="text-xl flex-shrink-0">{RISK_ICONS[p.risk]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{p.lead.company_name}</p>
                <div className="flex gap-3 text-xs opacity-80 mt-0.5">
                  <span>{p.daysSinceContact === 999 ? 'İletişim yok' : `${p.daysSinceContact}g iletişimsiz`}</span>
                  {p.msgCount > 0 && <span>{p.msgCount} mesaj</span>}
                  {p.lastInvoiceStatus === 'overdue' && <span>⚠️ Gecikmiş ödeme</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold">{p.churnScore}</p>
                <p className="text-xs opacity-70">risk skoru</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}