'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { QrCode, Plus, RefreshCw, Copy, ExternalLink } from 'lucide-react'

const QR_TYPES = [
  { key:'url', label:'Web Sitesi', icon:'🌐' },
  { key:'whatsapp', label:'WhatsApp', icon:'💬' },
  { key:'microsite', label:'Kişisel Katalog', icon:'📄' },
  { key:'phone', label:'Telefon', icon:'📞' },
]

export default function QRPage() {
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [type, setType] = useState('url')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    const [q, s] = await Promise.allSettled([api.get('/api/qr/list'), api.get('/api/qr/stats')])
    if (q.status==='fulfilled') setQrCodes(q.value.qrCodes||[])
    if (s.status==='fulfilled') setStats(s.value)
  }

  useEffect(()=>{ load() },[])

  const create = async () => {
    if (!url) return
    setCreating(true)
    try {
      await api.post('/api/qr/generate', { url, label, type })
      showMsg('success', 'QR kod oluşturuldu!')
      setUrl(''); setLabel('')
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <QrCode size={24} className="text-cyan-400"/> QR Kod Üretici
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Microsite, WhatsApp, web sitesi için QR kod oluşturun</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{stats?.total||0}</p>
          <p className="text-slate-400 text-xs mt-1">Toplam QR</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats?.totalScans||0}</p>
          <p className="text-slate-400 text-xs mt-1">Toplam Tarama</p>
        </div>
      </div>

      {/* Oluştur */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">➕ Yeni QR Kod</h2>
        <div className="flex gap-2 flex-wrap">
          {QR_TYPES.map(t=>(
            <button key={t.key} onClick={()=>setType(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${type===t.key?'bg-cyan-600 border-cyan-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">URL / Link *</label>
            <input value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"/>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Etiket</label>
            <input value={label} onChange={e=>setLabel(e.target.value)}
              placeholder="Ana Sayfa QR, WhatsApp QR..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"/>
          </div>
        </div>
        <button onClick={create} disabled={creating||!url}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {creating?<RefreshCw size={14} className="animate-spin"/>:<QrCode size={14}/>}
          {creating?'Oluşturuluyor...':'QR Kod Oluştur'}
        </button>
      </div>

      {/* QR Listesi */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {qrCodes.map((qr:any)=>(
          <div key={qr.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <img src={qr.qr_image_url} alt={qr.label} className="w-32 h-32 mx-auto mb-3 rounded-lg bg-white p-1"/>
            <p className="text-white text-sm font-medium truncate">{qr.label}</p>
            <p className="text-slate-400 text-xs mt-0.5">{qr.scans} tarama</p>
            <div className="flex gap-2 mt-3 justify-center">
              <a href={qr.qr_image_url} download={`${qr.label}.png`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-600/20 text-cyan-300 text-xs rounded-lg hover:bg-cyan-600/30 transition">
                <ExternalLink size={10}/> İndir
              </a>
              <button onClick={()=>navigator.clipboard.writeText(qr.url)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition">
                <Copy size={10}/> Kopyala
              </button>
            </div>
          </div>
        ))}
        {qrCodes.length===0 && (
          <div className="col-span-3 text-center py-10 text-slate-400">
            <QrCode size={40} className="mx-auto mb-2 text-slate-600"/>
            <p>Henüz QR kod yok</p>
          </div>
        )}
      </div>
    </div>
  )
}