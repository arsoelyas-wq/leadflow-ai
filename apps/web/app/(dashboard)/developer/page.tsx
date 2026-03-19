'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Code, Plus, Trash2, Copy, RefreshCw, Key, BookOpen, BarChart3 } from 'lucide-react'

export default function DeveloperPage() {
  const [keys, setKeys] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [docs, setDocs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<'keys' | 'docs'>('keys')

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    try {
      const [k, u, d] = await Promise.allSettled([
        api.get('/api/developer/keys'), api.get('/api/developer/usage'), api.get('/api/developer/docs')
      ])
      if (k.status === 'fulfilled') setKeys(k.value.keys || [])
      if (u.status === 'fulfilled') setUsage(u.value)
      if (d.status === 'fulfilled') setDocs(d.value)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createKey = async () => {
    if (!newKeyName) return
    setCreating(true)
    try {
      const data = await api.post('/api/developer/keys', { name: newKeyName })
      setNewKey(data.apiKey)
      setNewKeyName('')
      showMsg('success', data.message)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const deleteKey = async (id: string) => {
    try {
      await api.delete(`/api/developer/keys/${id}`)
      showMsg('success', 'Key devre dışı bırakıldı')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Code size={24} className="text-cyan-400" /> API Erişimi
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Kendi uygulamalarınızla LeadFlow AI'ı entegre edin</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {usage && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Toplam İstek', value: usage.totalRequests, color: 'text-cyan-400' },
            { label: 'Kalan Limit', value: usage.remaining, color: 'text-emerald-400' },
            { label: 'Aktif Key', value: keys.filter(k => k.is_active).length, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {[{ id: 'keys', label: '🔑 API Keys' }, { id: 'docs', label: '📖 Dokümantasyon' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'keys' && (
        <div className="space-y-4">
          {/* Yeni key */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex gap-3">
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              placeholder="API key adı (örn: Webhook Entegrasyonu)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
            <button onClick={createKey} disabled={creating || !newKeyName}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-sm transition">
              {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Oluştur
            </button>
          </div>

          {newKey && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-300 text-sm font-medium mb-2">⚠️ Bu key sadece bir kez gösterilir!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900 text-emerald-300 text-sm p-3 rounded-lg font-mono">{newKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey); showMsg('success', 'Kopyalandı!') }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"><Copy size={14} /></button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {keys.map(key => (
              <div key={key.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                <Key size={16} className="text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{key.name}</p>
                  <p className="text-slate-400 text-xs font-mono">{key.key_preview}</p>
                </div>
                <div className="text-xs text-slate-400">{key.requests_count || 0} istek</div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${key.is_active ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                  {key.is_active ? 'Aktif' : 'Pasif'}
                </span>
                <button onClick={() => deleteKey(key.id)} className="p-1.5 text-red-400 hover:text-red-300 transition"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'docs' && docs && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="p-3 bg-slate-900 rounded-lg">
            <p className="text-slate-400 text-xs mb-1">Base URL</p>
            <code className="text-cyan-300 text-sm">{docs.baseUrl}</code>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <p className="text-slate-400 text-xs mb-1">Authentication</p>
            <code className="text-cyan-300 text-sm">Authorization: Bearer YOUR_TOKEN</code>
          </div>
          <div className="space-y-2">
            {docs.endpoints?.map((ep: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                <span className={`text-xs px-2 py-0.5 rounded font-bold shrink-0 ${ep.method === 'GET' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                  {ep.method}
                </span>
                <div>
                  <code className="text-white text-sm">{ep.path}</code>
                  <p className="text-slate-400 text-xs mt-0.5">{ep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}