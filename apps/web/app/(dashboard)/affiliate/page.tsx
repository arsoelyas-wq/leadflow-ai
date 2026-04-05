'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Gift, Plus, Copy, CheckCircle, RefreshCw, ExternalLink, TrendingUp } from 'lucide-react'

export default function AffiliatePage() {
  const [links, setLinks] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState('')
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    Promise.allSettled([api.get('/api/affiliate/links'), api.get('/api/affiliate/stats')])
      .then(([l, s])=>{
        if (l.status==='fulfilled') setLinks(l.value.links||[])
        if (s.status==='fulfilled') setStats(s.value)
      })
  }

  useEffect(()=>{ load() },[])

  const createLink = async () => {
    setCreating(true)
    try {
      const d = await api.post('/api/affiliate/create-link', {})
      showMsg('success', 'Affiliate linki oluşturuldu!')
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const copy = (url: string, code: string) => {
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(()=>setCopied(''), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift size={24} className="text-pink-400"/> Affiliate Programı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Referans linki oluşturun — her kayıt için komisyon kazanın</p>
        </div>
        <button onClick={createLink} disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {creating?<RefreshCw size={14} className="animate-spin"/>:<Plus size={14}/>}
          {creating?'Oluşturuluyor...':'Yeni Link'}
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Toplam Tıklama', value:stats.totalClicks, color:'text-blue-400', icon:'👆'},
            {label:'Dönüşüm', value:stats.totalConversions, color:'text-emerald-400', icon:'✅'},
            {label:'Kazanç', value:`₺${stats.totalEarnings}`, color:'text-yellow-400', icon:'💰'},
          ].map(({label,value,color,icon})=>(
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{icon}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Komisyon Bilgisi */}
      <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-pink-400"/> Komisyon Yapısı</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'Kayıt Başına', value:'₺50', desc:'Referansınız kayıt olursa'},
            {label:'İlk Ödeme', value:'%20', desc:'İlk abonelik ödemesinden'},
            {label:'Aylık Recurring', value:'%10', desc:'Devam eden aboneliklerden'},
          ].map(({label,value,desc})=>(
            <div key={label} className="bg-slate-900 rounded-xl p-3 text-center">
              <p className="text-pink-400 text-xl font-bold">{value}</p>
              <p className="text-white text-xs font-medium mt-1">{label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Linkler */}
      {links.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
          <Gift size={40} className="text-slate-600 mx-auto mb-2"/>
          <p className="text-slate-400">Henüz affiliate linkiniz yok</p>
          <p className="text-slate-500 text-sm mt-1">Yeni Link butonuna tıklayarak oluşturun</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-white font-semibold">🔗 Linkleriniz</h2>
          {links.map((link:any)=>{
            const url = `https://leadflow-ai-web-kappa.vercel.app/register?ref=${link.code}`
            return (
              <div key={link.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <code className="text-emerald-400 text-xs bg-slate-900 px-2 py-1 rounded block truncate">{url}</code>
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    <span>Kod: <span className="text-white">{link.code}</span></span>
                    <span>Tıklama: <span className="text-blue-400">{link.clicks}</span></span>
                    <span>Dönüşüm: <span className="text-emerald-400">{link.conversions}</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>copy(url, link.code)}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition">
                    {copied===link.code?<CheckCircle size={12} className="text-emerald-400"/>:<Copy size={12}/>}
                    {copied===link.code?'Kopyalandı':'Kopyala'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}