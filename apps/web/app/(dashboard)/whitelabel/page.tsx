'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Building2, Plus, RefreshCw, Settings, BarChart3, Globe, Copy, Eye, EyeOff, Palette, DollarSign } from 'lucide-react'

export default function WhitelabelPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  const [brandStats, setBrandStats] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [form, setForm] = useState({
    name: '', domain: '', logo_url: '',
    primary_color: '#3b82f6', secondary_color: '#1e293b',
    plan_type: 'basic', revenue_share: 20,
  })
  const [showForm, setShowForm] = useState(false)
  const [newBrandResult, setNewBrandResult] = useState<any>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [b, s] = await Promise.allSettled([
        api.get('/api/whitelabel/brands'),
        api.get('/api/whitelabel/summary'),
      ])
      if (b.status === 'fulfilled') setBrands(b.value.brands || [])
      if (s.status === 'fulfilled') setSummary(s.value)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadBrandStats = async (id: string) => {
    try {
      const data = await api.get(`/api/whitelabel/brands/${id}/stats`)
      setBrandStats(data)
      setSelectedBrand(data.brand)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const createBrand = async () => {
    if (!form.name) return
    setCreating(true)
    try {
      const data = await api.post('/api/whitelabel/brands', form)
      setNewBrandResult(data)
      showMsg('success', `${data.brand.name} bayisi oluşturuldu!`)
      setShowForm(false)
      setForm({ name: '', domain: '', logo_url: '', primary_color: '#3b82f6', secondary_color: '#1e293b', plan_type: 'basic', revenue_share: 20 })
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setCreating(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/whitelabel/brands/${id}`, { status })
      showMsg('success', `Bayi ${status === 'active' ? 'aktifleştirildi' : 'durduruldu'}`)
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const planColors: Record<string, string> = {
    basic: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    pro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    enterprise: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 size={24} className="text-violet-400" />
            White-Label / Bayi Sistemi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Kendi markanızla bayiler oluşturun — her bayi özel domain, logo ve renk</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition">
          <Plus size={15} /> Yeni Bayi
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Toplam Bayi', value: summary.totalBrands, color: 'text-violet-400' },
            { label: 'Aktif Bayi', value: summary.activeBrands, color: 'text-emerald-400' },
            { label: 'Tahmini Aylık Gelir', value: `₺${(summary.estimatedMonthlyRevenue || 0).toLocaleString('tr-TR')}`, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Bayi Formu */}
      {showForm && (
        <div className="bg-slate-800/50 border border-violet-500/30 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Yeni Bayi Oluştur</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Marka Adı *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="örn: Arsoelyas CRM"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Domain (opsiyonel)</label>
              <input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
                placeholder="crm.sirketime.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Logo URL</label>
              <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Plan</label>
              <select value={form.plan_type} onChange={e => setForm({ ...form, plan_type: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500">
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Ana Renk</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer" />
                <input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Gelir Paylaşımı (%)</label>
              <input type="number" min="0" max="50" value={form.revenue_share}
                onChange={e => setForm({ ...form, revenue_share: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createBrand} disabled={creating || !form.name}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              {creating ? <RefreshCw size={14} className="animate-spin" /> : <Building2 size={14} />}
              {creating ? 'Oluşturuluyor...' : 'Bayi Oluştur'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition">İptal</button>
          </div>
        </div>
      )}

      {/* Yeni Bayi Bilgileri */}
      {newBrandResult && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-3">
          <h3 className="text-emerald-300 font-semibold">✅ Bayi Oluşturuldu!</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-900 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Admin Email</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-xs">{newBrandResult.adminEmail}</p>
                <button onClick={() => navigator.clipboard.writeText(newBrandResult.adminEmail)}>
                  <Copy size={12} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Geçici Şifre</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-xs">{newBrandResult.tempPassword}</p>
                <button onClick={() => navigator.clipboard.writeText(newBrandResult.tempPassword)}>
                  <Copy size={12} className="text-slate-400" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-yellow-400 text-xs">⚠️ Bu bilgileri kaydedin — şifre bir daha gösterilmeyecek!</p>
        </div>
      )}

      {/* Bayi Listesi */}
      {loading ? (
        <div className="flex justify-center h-32 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div>
      ) : brands.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Building2 size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Henüz bayi yok</p>
          <p className="text-slate-500 text-sm mt-1">Yeni Bayi butonuyla bayinizi oluşturun</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map(brand => (
            <div key={brand.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-4">
                {/* Renk göstergesi */}
                <div className="w-10 h-10 rounded-xl shrink-0 border border-slate-700"
                  style={{ backgroundColor: brand.primary_color || '#3b82f6' }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold">{brand.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${planColors[brand.plan_type] || planColors.basic}`}>
                      {brand.plan_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${brand.status === 'active' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
                      {brand.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {brand.domain && <span className="flex items-center gap-1"><Globe size={11} /> {brand.domain}</span>}
                    <span className="flex items-center gap-1"><DollarSign size={11} /> %{brand.revenue_share} gelir payı</span>
                    <span>{new Date(brand.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => loadBrandStats(brand.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition">
                    <BarChart3 size={12} /> İstatistik
                  </button>
                  <button onClick={() => updateStatus(brand.id, brand.status === 'active' ? 'inactive' : 'active')}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${brand.status === 'active' ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'}`}>
                    {brand.status === 'active' ? 'Durdur' : 'Aktifleştir'}
                  </button>
                </div>
              </div>

              {/* Bayi İstatistikleri */}
              {selectedBrand?.id === brand.id && brandStats && (
                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-5 gap-3">
                  {[
                    { label: 'Kullanıcı', value: brandStats.stats.totalUsers },
                    { label: 'Lead', value: brandStats.stats.totalLeads },
                    { label: 'Mesaj', value: brandStats.stats.totalMessages },
                    { label: 'Video', value: brandStats.stats.totalVideos },
                    { label: 'Aylık Gelir', value: `₺${(brandStats.stats.monthlyRevenue || 0).toLocaleString('tr-TR')}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center bg-slate-900/50 rounded-lg p-3">
                      <p className="text-white font-bold">{value}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}