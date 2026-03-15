'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw, Smartphone, Wifi, WifiOff, Star, QrCode, Settings2 } from 'lucide-react'

export default function WANumbersPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [displayName, setDisplayName] = useState('')
  const [dailyLimit, setDailyLimit] = useState(100)
  const [showAdd, setShowAdd] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/wa-numbers/stats')
      setStats(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const connectNumber = async () => {
    setConnecting(true)
    setQrCode(null)
    try {
      const data = await api.post('/api/wa-numbers/connect', { displayName, dailyLimit })
      if (data.qr) {
        setQrCode(data.qr)
        showMsg('success', 'QR kodu telefonunuzla okutun')
      } else {
        showMsg('success', 'Numara bağlandı!')
        setShowAdd(false)
        load()
      }
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setConnecting(false)
    }
  }

  const disconnectNumber = async (id: string) => {
    await api.post(`/api/wa-numbers/${id}/disconnect`, {})
    showMsg('success', 'Bağlantı kesildi')
    load()
  }

  const setPrimary = async (id: string) => {
    await api.patch(`/api/wa-numbers/${id}`, { isPrimary: true })
    showMsg('success', 'Birincil numara güncellendi')
    load()
  }

  const deleteNumber = async (id: string) => {
    if (!confirm('Numara silinsin mi?')) return
    await api.delete(`/api/wa-numbers/${id}`)
    showMsg('success', 'Silindi')
    load()
  }

  const updateLimit = async (id: string, limit: number) => {
    await api.patch(`/api/wa-numbers/${id}`, { dailyLimit: limit })
    setEditId(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone size={24} className="text-green-400" />
            WhatsApp Numaralar
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Birden fazla numara yönet, yük dağıt, ban riskini azalt</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Numara Ekle
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Özet */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Numara', value: stats.total, color: 'text-slate-300' },
            { label: 'Bağlı', value: stats.connected, color: 'text-green-400' },
            { label: 'Günlük Kapasite', value: stats.totalCapacity, color: 'text-blue-400' },
            { label: 'Bugün Gönderilen', value: stats.usedToday, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Numara Ekle Formu */}
      {showAdd && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Yeni Numara Bağla</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">İsim (opsiyonel)</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="örn: Satış Hattı, Destek"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Günlük Mesaj Limiti</label>
              <input type="number" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))}
                min="10" max="500"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>

          {qrCode ? (
            <div className="flex flex-col items-center gap-4 p-6 bg-slate-900/50 border border-slate-700 rounded-xl">
              <p className="text-white font-medium flex items-center gap-2">
                <QrCode size={16} className="text-green-400" /> WhatsApp ile QR'ı okutun
              </p>
              <img src={qrCode} alt="QR" className="w-52 h-52 rounded-xl border border-slate-600" />
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Bağlantı bekleniyor...
              </p>
            </div>
          ) : (
            <button onClick={connectNumber} disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-xl text-sm font-medium transition disabled:opacity-50">
              {connecting ? <RefreshCw size={15} className="animate-spin" /> : <QrCode size={15} />}
              {connecting ? 'QR oluşturuluyor...' : 'QR Oluştur & Bağla'}
            </button>
          )}
        </div>
      )}

      {/* Numara Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !stats?.numbers?.length ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Smartphone size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">Henüz numara yok</p>
          <p className="text-slate-500 text-sm">Numara ekleyerek ban riskini dağıtın</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.numbers.map((num: any) => (
            <div key={num.id} className={`bg-slate-800/50 border rounded-xl p-5 ${num.is_primary ? 'border-green-500/40' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    num.status === 'connected' ? 'bg-green-500/10' : 'bg-slate-700'
                  }`}>
                    <Smartphone size={18} className={num.status === 'connected' ? 'text-green-400' : 'text-slate-500'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{num.display_name}</p>
                      {num.is_primary && (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                          <Star size={10} /> Birincil
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {num.status === 'connected'
                        ? <><Wifi size={11} className="text-green-400" /><span className="text-green-400 text-xs">Bağlı</span></>
                        : <><WifiOff size={11} className="text-slate-500" /><span className="text-slate-500 text-xs">Bağlı Değil</span></>
                      }
                      {num.phone_number && <span className="text-slate-400 text-xs">· {num.phone_number}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!num.is_primary && num.status === 'connected' && (
                    <button onClick={() => setPrimary(num.id)}
                      className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg transition text-xs" title="Birincil Yap">
                      <Star size={13} />
                    </button>
                  )}
                  <button onClick={() => setEditId(editId === num.id ? null : num.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg transition">
                    <Settings2 size={13} />
                  </button>
                  {num.status === 'connected' ? (
                    <button onClick={() => disconnectNumber(num.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition text-xs">
                      <WifiOff size={13} />
                    </button>
                  ) : (
                    <button onClick={() => deleteNumber(num.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Günlük kullanım bar */}
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400 text-xs">Bugün</span>
                  <span className="text-slate-300 text-xs font-medium">{num.sent_today}/{num.daily_limit}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (num.sent_today / num.daily_limit) > 0.8 ? 'bg-red-500' :
                      (num.sent_today / num.daily_limit) > 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((num.sent_today / num.daily_limit) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Limit Düzenleme */}
              {editId === num.id && (
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-3">
                  <span className="text-slate-400 text-sm">Günlük limit:</span>
                  <input type="number" defaultValue={num.daily_limit} id={`limit-${num.id}`}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-500"
                    min="10" max="500" />
                  <button onClick={() => {
                    const input = document.getElementById(`limit-${num.id}`) as HTMLInputElement
                    updateLimit(num.id, parseInt(input.value))
                  }} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition">
                    Kaydet
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rehber */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">💡 Anti-Ban Stratejisi</h2>
        <div className="space-y-2 text-sm text-slate-400">
          <p>→ Numara başına günde <span className="text-white">max 100-150 mesaj</span> gönderin</p>
          <p>→ Mesajlar arasında <span className="text-white">10-30 saniye</span> bekleyin</p>
          <p>→ Kişiselleştirilmiş mesajlar toplu mesajlara göre <span className="text-white">3x daha güvenli</span></p>
          <p>→ Birden fazla numara kullanarak riski <span className="text-white">dağıtın</span></p>
        </div>
      </div>
    </div>
  )
}