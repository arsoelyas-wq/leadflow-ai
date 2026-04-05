'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Zap, TrendingUp, RefreshCw, CheckCircle, BarChart3 } from 'lucide-react'

const PLANS = [
  { key:'starter', name:'Starter', credits:500, price:99, color:'border-slate-500', badge:'', features:['500 Kredi/ay','WhatsApp Kampanya','Lead Scraper','AI Analiz'] },
  { key:'growth', name:'Growth', credits:2000, price:299, color:'border-blue-500', badge:'Popüler', features:['2000 Kredi/ay','Tüm Starter özellikler','Email & SMS','Reklam Yönetimi'] },
  { key:'pro', name:'Pro', credits:10000, price:799, color:'border-purple-500', badge:'Tavsiye', features:['10000 Kredi/ay','Tüm Growth özellikler','White-Label','API Erişimi'] },
  { key:'enterprise', name:'Enterprise', credits:999999, price:0, color:'border-yellow-500', badge:'Kurumsal', features:['Sınırsız Kredi','Özel entegrasyon','SLA garantisi','Dedicated destek'] },
]

const CREDIT_COSTS = [
  { action:'WhatsApp Mesaj', cost:1, icon:'💬' },
  { action:'Email Gönder', cost:1, icon:'📧' },
  { action:'SMS Gönder', cost:2, icon:'📱' },
  { action:'Lead Scrape', cost:5, icon:'🔍' },
  { action:'AI Analiz', cost:3, icon:'🤖' },
  { action:'AI Video', cost:20, icon:'🎬' },
  { action:'Sesli Arama', cost:15, icon:'📞' },
]

export default function CreditsPage() {
  const [balance, setBalance] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [upgrading, setUpgrading] = useState('')
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  useEffect(()=>{
    Promise.allSettled([api.get('/api/credits/balance'), api.get('/api/credits/stats')])
      .then(([b, s])=>{
        if (b.status==='fulfilled') setBalance(b.value)
        if (s.status==='fulfilled') setStats(s.value)
      })
  },[])

  const upgrade = async (plan: string) => {
    if (plan === 'enterprise') return showMsg('error', 'Enterprise için iletişime geçin')
    setUpgrading(plan)
    try {
      const d = await api.post('/api/credits/upgrade', { plan })
      showMsg('success', d.message)
      const b = await api.get('/api/credits/balance')
      setBalance(b)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setUpgrading('') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={24} className="text-yellow-400"/> Kredi Sistemi
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Kullanım bazlı fiyatlandırma — ne kadar kullanırsanız o kadar ödersiniz</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Bakiye */}
      {balance && (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Kalan Kredi</p>
              <p className="text-4xl font-bold text-white mt-1">{balance.remaining?.toLocaleString()}</p>
              <p className="text-slate-400 text-sm mt-1">/ {balance.total?.toLocaleString()} toplam • Plan: <span className="text-blue-400 capitalize">{balance.plan}</span></p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Kullanım</p>
              <p className="text-2xl font-bold text-yellow-400">%{balance.usagePercent}</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-700 rounded-full h-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
              style={{width:`${100 - (balance.usagePercent||0)}%`}}/>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.totalSpent}</p>
            <p className="text-slate-400 text-xs mt-1">Harcanan Kredi</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-white capitalize">{stats.topAction || '-'}</p>
            <p className="text-slate-400 text-xs mt-1">En Çok Kullanılan</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{balance?.remaining || 0}</p>
            <p className="text-slate-400 text-xs mt-1">Kalan Kredi</p>
          </div>
        </div>
      )}

      {/* Kredi Maliyetleri */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart3 size={16}/> Kredi Maliyetleri</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CREDIT_COSTS.map(c=>(
            <div key={c.action} className="bg-slate-900 rounded-xl p-3 text-center">
              <p className="text-2xl mb-1">{c.icon}</p>
              <p className="text-white text-xs font-medium">{c.action}</p>
              <p className="text-yellow-400 text-sm font-bold mt-1">{c.cost} kredi</p>
            </div>
          ))}
        </div>
      </div>

      {/* Planlar */}
      <div>
        <h2 className="text-white font-semibold mb-4">📦 Planlar</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan=>(
            <div key={plan.key} className={`border rounded-2xl p-5 relative ${plan.color} bg-slate-800/50`}>
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs rounded-full">{plan.badge}</span>
              )}
              <h3 className="text-white font-bold text-lg">{plan.name}</h3>
              <p className="text-3xl font-bold text-white mt-2">
                {plan.price === 0 ? 'Özel' : `₺${plan.price}`}
                {plan.price > 0 && <span className="text-slate-400 text-sm font-normal">/ay</span>}
              </p>
              <p className="text-yellow-400 text-sm mt-1">{plan.credits === 999999 ? 'Sınırsız' : plan.credits.toLocaleString()} kredi</p>
              <ul className="mt-4 space-y-1.5">
                {plan.features.map(f=>(
                  <li key={f} className="flex items-center gap-2 text-slate-300 text-xs">
                    <CheckCircle size={12} className="text-emerald-400 flex-shrink-0"/>{f}
                  </li>
                ))}
              </ul>
              <button onClick={()=>upgrade(plan.key)} disabled={upgrading===plan.key || balance?.plan===plan.key}
                className={`w-full mt-4 py-2.5 text-sm rounded-xl font-medium transition ${balance?.plan===plan.key?'bg-emerald-600/20 text-emerald-400 cursor-default':'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40'}`}>
                {balance?.plan===plan.key ? '✅ Mevcut Plan' : upgrading===plan.key ? 'Geçiliyor...' : plan.price===0 ? 'İletişime Geç' : 'Planı Seç'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}