'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { User, Building2, Key, Bell, Shield, Save } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'profile' | 'integrations' | 'notifications' | 'security'>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState({
    name: user?.name || '',
    company: user?.company || '',
    sector: user?.sector || '',
  })

  const [integrations, setIntegrations] = useState({
    wati_key: '',
    resend_key: '',
    apify_token: '',
  })

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.patch('/api/auth/profile', profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert('Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'integrations', label: 'Entegrasyonlar', icon: Key },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-slate-400 mt-1">Hesap ve uygulama ayarları</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  tab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6">

          {/* Profil */}
          {tab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold text-lg">Profil Bilgileri</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-slate-400 text-sm">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                    {user?.planType === 'starter' ? 'Starter Plan' : user?.planType}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6 grid gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Ad Soyad</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Firma Adı</label>
                  <input value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Sektör</label>
                  <select value={profile.sector} onChange={e => setProfile(p => ({ ...p, sector: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Seçiniz</option>
                    {['Dekorasyon', 'Tekstil', 'Gıda', 'Teknoloji', 'Hizmet', 'İnşaat', 'Diğer'].map(s => (
                      <option key={s} value={s.toLowerCase()}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Email</label>
                  <input value={user?.email || ''} disabled
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-500 text-sm cursor-not-allowed" />
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                <Save size={15} />
                {saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
              </button>
            </div>
          )}

          {/* Entegrasyonlar */}
          {tab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold text-lg">API Entegrasyonları</h2>
              <p className="text-slate-400 text-sm">Bu anahtarlar şifreli olarak saklanır. Sadece aktif oturumunuzda görünür.</p>

              {[
                { key: 'wati_key', label: 'WATI.io API Key', placeholder: 'wati_...', desc: 'WhatsApp mesaj gönderimi için' },
                { key: 'resend_key', label: 'Resend API Key', placeholder: 're_...', desc: 'Email gönderimi için' },
                { key: 'apify_token', label: 'Apify Token', placeholder: 'apify_api_...', desc: 'Web scraping için' },
              ].map(({ key, label, placeholder, desc }) => (
                <div key={key}>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">{label}</label>
                  <p className="text-slate-500 text-xs mb-2">{desc}</p>
                  <input
                    type="password"
                    value={(integrations as any)[key]}
                    onChange={e => setIntegrations(i => ({ ...i, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
                </div>
              ))}

              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                <Save size={15} /> Kaydet
              </button>
            </div>
          )}

          {/* Bildirimler */}
          {tab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold text-lg">Bildirim Ayarları</h2>
              {[
                { label: 'Yeni lead geldiğinde', desc: 'Scraping tamamlandığında bildirim al', defaultOn: true },
                { label: 'Lead cevap verdiğinde', desc: 'WhatsApp veya email cevabı geldiğinde', defaultOn: true },
                { label: 'Kampanya tamamlandığında', desc: 'Tüm adımlar bittiğinde', defaultOn: false },
                { label: 'Kredi azaldığında', desc: '10 kredi altına düştüğünde uyar', defaultOn: true },
              ].map(({ label, desc, defaultOn }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={defaultOn} className="sr-only peer" />
                    <div className="w-10 h-5 bg-slate-700 peer-checked:bg-blue-600 rounded-full transition peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Güvenlik */}
          {tab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold text-lg">Güvenlik</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Mevcut Şifre</label>
                  <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Yeni Şifre</label>
                  <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Yeni Şifre (Tekrar)</label>
                  <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                  <Shield size={15} /> Şifreyi Güncelle
                </button>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-red-400 font-medium mb-2">Tehlikeli Bölge</h3>
                <p className="text-slate-400 text-sm mb-4">Hesabınızı kalıcı olarak silmek tüm verilerinizi siler.</p>
                <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg border border-red-500/30 transition">
                  Hesabı Sil
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}