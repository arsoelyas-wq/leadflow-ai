'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Bot, Play, Pause, RefreshCw, Plus, Trash2, Clock, Target, Zap } from 'lucide-react'

const SECTORS = ['Restoran','Kafe','Mobilya','Dekorasyon','Tadilat','İnşaat','Tekstil',
  'Güzellik Salonu','Spor Salonu','Otel','Otomotiv','Elektronik','Muhasebe','Sağlık',
  'Eğitim','Temizlik','Nakliyat','Çiçekçi','Fırın','Market']

const CITIES = ['Istanbul','Ankara','Izmir','Bursa','Antalya','Adana',
  'Gaziantep','Konya','Kayseri','Mersin','Eskişehir','Trabzon','Diyarbakır','Samsun']

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps', icon: '🗺️' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
]

export default function HunterSettingsPage() {
  const [config, setConfig] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const [keywords, setKeywords] = useState<string[]>(['Restoran','Kafe'])
  const [cities, setCities] = useState<string[]>(['Istanbul'])
  const [sources, setSources] = useState<string[]>(['google_maps'])
  const [active, setActive] = useState(true)
  const [interval, setInterval2] = useState(6)
  const [maxLeads, setMaxLeads] = useState(50)
  const [autoWorkflow, setAutoWorkflow] = useState(true)
  const [customKeyword, setCustomKeyword] = useState('')

  const showMsg = (type:'success'|'error', text:string) => {
    setMsg({type,text}); setTimeout(()=>setMsg(null),5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [c, l] = await Promise.allSettled([
        api.get('/api/hunter/config'),
        api.get('/api/hunter/logs'),
      ])
      if (c.status==='fulfilled' && c.value.config) {
        const cfg = c.value.config
        setConfig(cfg)
        setKeywords(cfg.keywords || ['Restoran'])
        setCities(cfg.cities || ['Istanbul'])
        setSources(cfg.sources || ['google_maps'])
        setActive(cfg.active ?? true)
        setInterval2(cfg.run_interval_hours || 6)
        setMaxLeads(cfg.max_leads_per_run || 50)
        setAutoWorkflow(cfg.auto_start_workflow ?? true)
      }
      if (l.status==='fulfilled') setLogs(l.value.logs || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/hunter/config', {
        keywords, cities, sources,
        active, run_interval_hours: interval,
        max_leads_per_run: maxLeads,
        auto_start_workflow: autoWorkflow,
      })
      showMsg('success', 'Ayarlar kaydedildi! Hunter ' + (active ? 'aktif' : 'durduruldu'))
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const runNow = async () => {
    try {
      await api.post('/api/hunter/run-now', {})
      showMsg('success', 'Hunter şimdi çalıştırılıyor... Birkaç dakika bekleyin.')
      setTimeout(load, 30000)
    } catch (e:any) { showMsg('error', e.message) }
  }

  const toggleKeyword = (k: string) => setKeywords(p => p.includes(k) ? p.filter(x=>x!==k) : [...p, k])
  const toggleCity = (c: string) => setCities(p => p.includes(c) ? p.filter(x=>x!==c) : [...p, c])
  const toggleSource = (s: string) => setSources(p => p.includes(s) ? p.filter(x=>x!==s) : [...p, s])

  const addCustomKeyword = () => {
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim())) {
      setKeywords(p => [...p, customKeyword.trim()])
      setCustomKeyword('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot size={24} className="text-emerald-400"/> 7/24 Otomatik Lead Avcısı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Sistemi kur — arka planda sürekli yeni lead bulsun</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runNow}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-xl transition">
            <Zap size={14}/> Şimdi Çalıştır
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {saving?<RefreshCw size={14} className="animate-spin"/>:<Play size={14}/>}
            {saving?'Kaydediliyor...':'Kaydet & Başlat'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Durum */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Durum', value: active ? '✅ Aktif' : '⏸️ Durduruldu', color: active ? 'text-emerald-400' : 'text-slate-400' },
          { label: 'Tarama Aralığı', value: `Her ${interval} saat`, color: 'text-blue-400' },
          { label: 'Kaynak Sayısı', value: sources.length + ' kaynak', color: 'text-purple-400' },
          { label: 'Toplam Log', value: logs.length + ' tarama', color: 'text-yellow-400' },
        ].map(({label,value,color}) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sol */}
        <div className="space-y-4">
          {/* Aktif/Pasif */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Otomatik Tarama</p>
              <p className="text-slate-400 text-xs mt-0.5">Hunter'ı aktif/pasif yap</p>
            </div>
            <button onClick={()=>setActive(!active)}
              className={`w-12 h-6 rounded-full transition-colors relative ${active?'bg-emerald-500':'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${active?'translate-x-6':'translate-x-0.5'}`}/>
            </button>
          </div>

          {/* Kaynaklar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-white font-medium mb-3">📡 Lead Kaynakları</p>
            <div className="space-y-2">
              {SOURCES.map(s => (
                <label key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition ${sources.includes(s.id)?'bg-slate-700 border-slate-500':'border-transparent hover:bg-slate-800'}`}>
                  <input type="checkbox" checked={sources.includes(s.id)} onChange={()=>toggleSource(s.id)} className="accent-emerald-500"/>
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-white text-sm">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ayarlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
            <p className="text-white font-medium">⚙️ Tarama Ayarları</p>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-400">Tarama aralığı</span>
                <span className="text-white font-medium">Her {interval} saat</span>
              </div>
              <input type="range" min={2} max={24} value={interval} onChange={e=>setInterval2(parseInt(e.target.value))} className="w-full accent-emerald-500"/>
              <div className="flex justify-between text-xs text-slate-500 mt-1"><span>2 saat</span><span>24 saat</span></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-400">Tarama başına max lead</span>
                <span className="text-white font-medium">{maxLeads}</span>
              </div>
              <input type="range" min={10} max={200} step={10} value={maxLeads} onChange={e=>setMaxLeads(parseInt(e.target.value))} className="w-full accent-emerald-500"/>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoWorkflow} onChange={e=>setAutoWorkflow(e.target.checked)} className="accent-emerald-500"/>
              <div>
                <p className="text-white text-sm">Yeni lead'e otomatik workflow başlat</p>
                <p className="text-slate-500 text-xs">Bulunan her yeni lead'e cold_outreach başlar</p>
              </div>
            </label>
          </div>
        </div>

        {/* Sağ */}
        <div className="space-y-4">
          {/* Sektörler */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-white font-medium mb-3">🎯 Hedef Sektörler ({keywords.length} seçili)</p>
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
              {SECTORS.map(k => (
                <button key={k} onClick={()=>toggleKeyword(k)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${keywords.includes(k)?'bg-emerald-600 border-emerald-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {k}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customKeyword} onChange={e=>setCustomKeyword(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addCustomKeyword()}
                placeholder="Özel sektör ekle..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"/>
              <button onClick={addCustomKeyword} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition">
                <Plus size={12}/>
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map(k => (
                  <span key={k} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">
                    {k}
                    <button onClick={()=>toggleKeyword(k)} className="hover:text-red-400"><Trash2 size={10}/></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Şehirler */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-white font-medium mb-3">📍 Hedef Şehirler ({cities.length} seçili)</p>
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map(c => (
                <button key={c} onClick={()=>toggleCity(c)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${cities.includes(c)?'bg-blue-600 border-blue-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-white font-medium mb-3 flex items-center gap-2">
              <Clock size={14} className="text-slate-400"/> Son Taramalar
            </p>
            {logs.length === 0 ? (
              <p className="text-slate-500 text-sm">Henüz tarama yapılmadı</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{new Date(log.ran_at).toLocaleString('tr-TR')}</span>
                    <span className={`font-medium ${log.leads_found > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {log.leads_found} lead
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}