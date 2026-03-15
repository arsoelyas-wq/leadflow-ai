'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Play, Trash2, RefreshCw, FlaskConical, Trophy, TrendingUp, MessageSquare } from 'lucide-react'

export default function ABTestingPage() {
  const [tests, setTests] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [variantA, setVariantA] = useState('Merhaba [FIRMA_ADI], ürünlerimiz hakkında bilgi vermek istiyorum. Müsait misiniz?')
  const [variantB, setVariantB] = useState('Merhaba [AD] 👋 [SEKTOR] sektöründe maliyetlerinizi %30 düşürebilecek bir çözümümüz var. İlgilenir misiniz?')
  const [saving, setSaving] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [testsData, leadsData] = await Promise.all([
        api.get('/api/abtests'),
        api.get('/api/leads?limit=100'),
      ])
      setTests(testsData.tests || [])
      setLeads((leadsData.leads || []).filter((l: any) => l.phone || l.email))
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createTest = async () => {
    if (!name || !variantA || !variantB) return
    setSaving(true)
    try {
      await api.post('/api/abtests', { name, channel, variant_a: variantA, variant_b: variantB })
      showMsg('success', 'A/B test oluşturuldu!')
      setShowCreate(false)
      setName('')
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSaving(false) }
  }

  const runTest = async (testId: string) => {
    if (!selectedLeads.length) return
    setRunning(testId)
    try {
      const data = await api.post(`/api/abtests/${testId}/run`, { leadIds: selectedLeads })
      showMsg('success', data.message)
      setSelectedLeads([])
      setSelectedTest(null)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setRunning(null) }
  }

  const syncTest = async (testId: string) => {
    setSyncing(testId)
    try {
      const data = await api.post(`/api/abtests/${testId}/sync`, {})
      showMsg('success', `Güncellendi! Kazanan: ${data.winner ? `Varyant ${data.winner}` : 'Henüz belirsiz'}`)
      load()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally { setSyncing(null) }
  }

  const deleteTest = async (id: string) => {
    if (!confirm('Test silinsin mi?')) return
    await api.delete(`/api/abtests/${id}`)
    setTests(prev => prev.filter(t => t.id !== id))
    showMsg('success', 'Silindi')
  }

  const statusColor: Record<string, string> = {
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    running: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical size={24} className="text-purple-400" />
            A/B Mesaj Testi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Hangi mesaj daha fazla cevap alıyor? Test et, kazan.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Yeni Test
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* Yeni Test Formu */}
      {showCreate && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold">Yeni A/B Test</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Test Adı *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="örn: Kişisel vs Genel Mesaj"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Kanal</label>
              <select value={channel} onChange={e => setChannel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">A</span>
                Varyant A
              </label>
              <textarea value={variantA} onChange={e => setVariantA(e.target.value)}
                rows={4} placeholder="[FIRMA_ADI], [AD], [SEHIR], [SEKTOR] kullanabilirsin"
                className="w-full bg-slate-900 border border-blue-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              <p className="text-slate-500 text-xs mt-1">{variantA.length} karakter</p>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block flex items-center gap-2">
                <span className="w-5 h-5 bg-purple-600 rounded text-white text-xs font-bold flex items-center justify-center">B</span>
                Varyant B
              </label>
              <textarea value={variantB} onChange={e => setVariantB(e.target.value)}
                rows={4} placeholder="[FIRMA_ADI], [AD], [SEHIR], [SEKTOR] kullanabilirsin"
                className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
              <p className="text-slate-500 text-xs mt-1">{variantB.length} karakter</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
            <p className="text-slate-400 text-xs">💡 Kullanılabilir değişkenler: <span className="text-blue-300">[FIRMA_ADI]</span> <span className="text-blue-300">[AD]</span> <span className="text-blue-300">[SEHIR]</span> <span className="text-blue-300">[SEKTOR]</span></p>
          </div>

          <div className="flex gap-3">
            <button onClick={createTest} disabled={saving || !name || !variantA || !variantB}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition flex items-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Kaydediliyor...' : 'Test Oluştur'}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Test Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <FlaskConical size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Henüz test yok — "Yeni Test" ile başlayın</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => {
            const rateA = test.sent_a > 0 ? Math.round((test.replied_a / test.sent_a) * 100) : 0
            const rateB = test.sent_b > 0 ? Math.round((test.replied_b / test.sent_b) * 100) : 0
            const maxRate = Math.max(rateA, rateB, 1)

            return (
              <div key={test.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <FlaskConical size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{test.name}</p>
                        {test.winner && (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs">
                            <Trophy size={12} /> Kazanan: Varyant {test.winner}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-slate-400 text-xs">{test.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[test.status] || statusColor.active}`}>
                          {test.status === 'active' ? 'Hazır' : test.status === 'running' ? 'Çalışıyor' : 'Tamamlandı'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => syncTest(test.id)} disabled={syncing === test.id}
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition" title="Sonuçları Güncelle">
                      <RefreshCw size={13} className={syncing === test.id ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
                      className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg transition" title="Test Başlat">
                      <Play size={13} />
                    </button>
                    <button onClick={() => deleteTest(test.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Sonuçlar */}
                <div className="px-5 pb-4 grid grid-cols-2 gap-4">
                  {/* Varyant A */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">A</span>
                        <span className="text-slate-300 text-xs truncate max-w-48">{test.variant_a.slice(0, 60)}...</span>
                      </div>
                      {test.winner === 'A' && <Trophy size={14} className="text-yellow-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${maxRate > 0 ? (rateA / maxRate) * 100 : 0}%` }} />
                      </div>
                      <span className="text-blue-400 text-sm font-bold w-10 text-right">%{rateA}</span>
                    </div>
                    <p className="text-slate-500 text-xs">{test.sent_a} gönderildi · {test.replied_a} cevap</p>
                  </div>

                  {/* Varyant B */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-purple-600 rounded text-white text-xs font-bold flex items-center justify-center">B</span>
                        <span className="text-slate-300 text-xs truncate max-w-48">{test.variant_b.slice(0, 60)}...</span>
                      </div>
                      {test.winner === 'B' && <Trophy size={14} className="text-yellow-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${maxRate > 0 ? (rateB / maxRate) * 100 : 0}%` }} />
                      </div>
                      <span className="text-purple-400 text-sm font-bold w-10 text-right">%{rateB}</span>
                    </div>
                    <p className="text-slate-500 text-xs">{test.sent_b} gönderildi · {test.replied_b} cevap</p>
                  </div>
                </div>

                {/* Lead Seç Paneli */}
                {selectedTest === test.id && (
                  <div className="border-t border-slate-700 p-5 space-y-4">
                    <p className="text-white text-sm font-medium">Lead Seç ({selectedLeads.length} seçili)</p>
                    <p className="text-slate-400 text-xs">Seçilen leadler ikiye bölünür: yarısına A, yarısına B gönderilir.</p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-900 rounded-lg p-2">
                      {leads.filter(l => !l.notes?.startsWith('AB_TEST')).map(lead => (
                        <label key={lead.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                          <input type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                            className="accent-purple-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs truncate">{lead.company_name}</p>
                            <p className="text-slate-500 text-xs">{lead.phone || lead.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => runTest(test.id)} disabled={!selectedLeads.length || running === test.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                        {running === test.id ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                        {running === test.id ? 'Gönderiliyor...' : `${selectedLeads.length} Lead'e Gönder`}
                      </button>
                      <button onClick={() => { setSelectedTest(null); setSelectedLeads([]) }}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}