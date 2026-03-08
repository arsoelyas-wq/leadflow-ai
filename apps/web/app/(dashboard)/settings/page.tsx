'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import {
  User, Building2, Key, Bell, Shield, Save, MessageSquare,
  Mail, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff,
  Send, Eye, EyeOff, Smartphone, Phone
} from 'lucide-react'

interface Settings {
  whatsapp_number?: string
  whatsapp_status?: string
  email_host?: string
  email_port?: number
  email_user?: string
  email_from?: string
  company_name?: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'profile' | 'channels' | 'notifications' | 'security'>('profile')

  // Profile
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.name || '',
    company: user?.company || '',
    sector: user?.sector || '',
  })

  // Channels
  const [settings, setSettings] = useState<Settings>({})
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [waConnecting, setWaConnecting] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [waStatus, setWaStatus] = useState('disconnected')
  const [waNumber, setWaNumber] = useState('')
  const [countryCode, setCountryCode] = useState('90')
  const [showPass, setShowPass] = useState(false)
  const [emailPass, setEmailPass] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadSettings = async () => {
    setSettingsLoading(true)
    try {
      const data = await api.get('/api/settings')
      setSettings(data.settings || {})
      setWaStatus(data.settings?.whatsapp_status || 'disconnected')
      setWaNumber(data.settings?.whatsapp_number || '')
    } catch {} finally { setSettingsLoading(false) }
  }

  useEffect(() => {
    if (tab === 'channels') loadSettings()
  }, [tab])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.patch('/api/auth/profile', profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { showMsg('error', 'Kayıt hatası') }
    finally { setSaving(false) }
  }

  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      await api.post('/api/settings', { ...settings, email_pass: emailPass || undefined })
      showMsg('success', 'Ayarlar kaydedildi!')
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSettingsSaving(false) }
  }

  const connectWhatsApp = async () => {
    if (!waNumber) return showMsg('error', 'Lütfen WhatsApp numaranızı girin')
    setWaConnecting(true)
    try {
      const data = await api.post('/api/settings/whatsapp/connect', { whatsapp_number: countryCode + waNumber.replace(/^0/, '') })
      setWaStatus('connected')
      showMsg('success', data.message || 'WhatsApp bağlandı!')
      loadSettings()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setWaConnecting(false) }
  }

  const disconnectWhatsApp = async () => {
    try {
      await api.post('/api/settings/whatsapp/disconnect', {})
      setWaStatus('disconnected')
      showMsg('success', 'WhatsApp bağlantısı kesildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const testEmail = async () => {
    setEmailTesting(true)
    try {
      const data = await api.post('/api/settings/email/test', {
        email_host: settings.email_host,
        email_port: settings.email_port,
        email_user: settings.email_user,
        email_pass: emailPass,
        email_from: settings.email_from,
      })
      showMsg('success', data.message)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setEmailTesting(false) }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'channels', label: 'Kanallar', icon: Key },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-slate-400 mt-1">Hesap ve uygulama ayarları</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {msg.text}
        </div>
      )}

      <div className="flex gap-6">
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

        <div className="flex-1">

          {/* PROFİL */}
          {tab === 'profile' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
              <h2 className="text-white font-semibold text-lg">Profil Bilgileri</h2>
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

          {/* KANALLAR */}
          {tab === 'channels' && (
            <div className="space-y-6">

              {/* WhatsApp */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <MessageSquare size={18} className="text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">WhatsApp Business</h2>
                      <p className="text-slate-400 text-xs">Meta Cloud API ile güvenli bağlantı</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    waStatus === 'connected'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-700 border-slate-600 text-slate-400'
                  }`}>
                    {waStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
                    {waStatus === 'connected' ? 'Bağlı' : 'Bağlı Değil'}
                  </div>
                </div>

                {waStatus === 'connected' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <Smartphone size={18} className="text-emerald-400" />
                      <div>
                        <p className="text-white text-sm font-medium">+{settings.whatsapp_number}</p>
                        <p className="text-slate-400 text-xs">WhatsApp aktif — kampanyalar bu numara üzerinden gönderilecek</p>
                      </div>
                    </div>
                    <button onClick={disconnectWhatsApp}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm transition">
                      Bağlantıyı Kes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <p className="text-blue-300 text-sm font-medium mb-1">📱 Meta Cloud API</p>
                      <p className="text-slate-400 text-xs">Numaranızı girin, sistem Meta'nın resmi altyapısı üzerinden mesaj gönderir. Güvenli ve kararlı bağlantı.</p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">WhatsApp Numaranız</label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={e => setCountryCode(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-green-500 w-32"
                        >
                          <option value="90">🇹🇷 +90</option>
                          <option value="1">🇺🇸 +1</option>
                          <option value="44">🇬🇧 +44</option>
                          <option value="49">🇩🇪 +49</option>
                          <option value="33">🇫🇷 +33</option>
                          <option value="39">🇮🇹 +39</option>
                          <option value="34">🇪🇸 +34</option>
                          <option value="31">🇳🇱 +31</option>
                          <option value="7">🇷🇺 +7</option>
                          <option value="380">🇺🇦 +380</option>
                          <option value="48">🇵🇱 +48</option>
                          <option value="40">🇷🇴 +40</option>
                          <option value="30">🇬🇷 +30</option>
                          <option value="966">🇸🇦 +966</option>
                          <option value="971">🇦🇪 +971</option>
                          <option value="90392">🇨🇾 +90392</option>
                          <option value="994">🇦🇿 +994</option>
                          <option value="993">🇹🇲 +993</option>
                          <option value="998">🇺🇿 +998</option>
                          <option value="77">🇰🇿 +77</option>
                          <option value="86">🇨🇳 +86</option>
                          <option value="81">🇯🇵 +81</option>
                          <option value="82">🇰🇷 +82</option>
                          <option value="91">🇮🇳 +91</option>
                          <option value="55">🇧🇷 +55</option>
                          <option value="52">🇲🇽 +52</option>
                          <option value="27">🇿🇦 +27</option>
                          <option value="20">🇪🇬 +20</option>
                          <option value="234">🇳🇬 +234</option>
                        </select>
                        <input
                          value={waNumber}
                          onChange={e => setWaNumber(e.target.value)}
                          placeholder="5XX XXX XX XX"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <button onClick={connectWhatsApp} disabled={waConnecting || !waNumber}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-xl text-sm font-medium transition disabled:opacity-50">
                      {waConnecting ? <RefreshCw size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                      {waConnecting ? 'Bağlanıyor...' : 'WhatsApp Bağla'}
                    </button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Mail size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">Email (SMTP)</h2>
                    <p className="text-slate-400 text-xs">Gmail veya özel SMTP sunucunuzu bağlayın</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">SMTP Sunucu</label>
                      <input value={settings.email_host || 'smtp.gmail.com'}
                        onChange={e => setSettings({ ...settings, email_host: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                        placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">Port</label>
                      <input type="number" value={settings.email_port || 587}
                        onChange={e => setSettings({ ...settings, email_port: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Email Adresi</label>
                    <input value={settings.email_user || ''}
                      onChange={e => setSettings({ ...settings, email_user: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="ornek@gmail.com" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">
                      Şifre / Uygulama Şifresi
                      <a href="https://myaccount.google.com/apppasswords" target="_blank"
                        className="ml-2 text-blue-400 hover:text-blue-300 text-xs">
                        Gmail uygulama şifresi al →
                      </a>
                    </label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={emailPass}
                        onChange={e => setEmailPass(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 pr-10"
                        placeholder="••••••••••••" />
                      <button onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Gönderen Adı (opsiyonel)</label>
                    <input value={settings.email_from || ''}
                      onChange={e => setSettings({ ...settings, email_from: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Şirket Adı <ornek@gmail.com>" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={testEmail} disabled={emailTesting || !settings.email_user || !emailPass}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition disabled:opacity-40">
                      {emailTesting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      {emailTesting ? 'Test Gönderiliyor...' : 'Test Emaili Gönder'}
                    </button>
                    <button onClick={saveSettings} disabled={settingsSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                      {settingsSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BİLDİRİMLER */}
          {tab === 'notifications' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
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
                    <div className="w-10 h-5 bg-slate-700 peer-checked:bg-blue-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* GÜVENLİK */}
          {tab === 'security' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
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