'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Trophy, RefreshCw, Star } from 'lucide-react'

const TIER_COLORS: Record<string,string> = {
  platinum: 'text-purple-400 bg-purple-500/20',
  gold: 'text-yellow-400 bg-yellow-500/20',
  silver: 'text-slate-300 bg-slate-500/20',
  bronze: 'text-orange-400 bg-orange-500/20',
}
const TIER_ICONS: Record<string,string> = { platinum:'💎', gold:'🥇', silver:'🥈', bronze:'🥉' }

export default function LoyaltyPage() {
  const [scores, setScores] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    setLoading(true)
    Promise.allSettled([api.get('/api/loyalty/scores'), api.get('/api/loyalty/stats')])
      .then(([s, st])=>{
        if (s.status==='fulfilled') setScores(s.value.scores||[])
        if (st.status==='fulfilled') setStats(st.value)
      }).finally(()=>setLoading(false))
  },[])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy size={24} className="text-yellow-400"/> Müşteri Sadakat Puanı
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Müşteri değerini ölç — Bronze, Silver, Gold, Platinum</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {['platinum','gold','silver','bronze'].map(tier=>(
          <div key={tier} className={`border rounded-xl p-3 text-center ${TIER_COLORS[tier].split(' ')[1]} border-slate-700`}>
            <p className="text-2xl">{TIER_ICONS[tier]}</p>
            <p className={`text-lg font-bold mt-1 ${TIER_COLORS[tier].split(' ')[0]}`}>
              {scores.filter(s=>s.tier===tier).length}
            </p>
            <p className="text-slate-400 text-xs capitalize">{tier}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center h-32 items-center"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
      : scores.length===0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
          <Trophy size={36} className="text-slate-600 mx-auto mb-2"/>
          <p className="text-slate-400">Henüz lead bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((s:any, i:number)=>(
            <div key={s.lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3 flex items-center gap-4">
              <span className="text-slate-500 text-sm w-6">{i+1}</span>
              <span className="text-xl">{TIER_ICONS[s.tier]}</span>
              <div className="flex-1">
                <p className="text-white font-medium">{s.lead.company_name}</p>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{s.msgCount} mesaj</span>
                  {s.totalPaid > 0 && <span className="text-emerald-400">₺{s.totalPaid.toLocaleString('tr-TR')} ödeme</span>}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${TIER_COLORS[s.tier].split(' ')[0]}`}>{s.points} puan</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[s.tier]}`}>{s.tier}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}