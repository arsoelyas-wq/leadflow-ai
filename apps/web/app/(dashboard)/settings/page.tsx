'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import {
  User, Building2, Key, Bell, Shield, Save, MessageSquare,
  Mail, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff,
  Send, Eye, EyeOff, Smartphone
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
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [waConnecting, setWaConnecting] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [waStatus, setWaStatus] = useState('disconnected')
  const [showPass, setShowPass] = useState(false)
  const [emailPass, setEmailPass] = useState('')
  const pollRef = useRef<any>(null)

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
    setWaConnecting(true)
    setQrCode(null)
    try {
      const data = await api.post('/api/settings/whatsapp/connect', {})
      if (data.qr) setQrCode(data.qr)
      setWaStatus(data.status)
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.get('/api/settings/whatsapp/status')
          setWaStatus(s.status)
          if (s.qr) setQrCode(s.qr)
          if (s.status === 'connected') {
            setQrCode(null)
            setWaConnecting(false)
            clearInterval(pollRef.current)
            showMsg('success', 'WhatsApp başarıyla bağlandı!')
            loadSettings()
          }
        } catch {}
      }, 2000)
    } catch (e: any) { showMsg('error', e.message); setWaConnecting(false) }
  }

  const disconnectWhatsApp = async () => {
    try {
      await api.post('/api/settings/whatsapp/disconnect', {})
      setWaStatus('disconnected')
      setQrCode(null)
      clearInterval(pollRef.current)
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
                      <h2 className="text-white font-semibold">WhatsApp</h2>
                      <p className="text-slate-400 text-xs">Telefonunuzu QR kod ile bağlayın</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    waStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : waStatus === 'qr_ready' || waStatus === 'connecting' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-700 border-slate-600 text-slate-400'
                  }`}>
                    {waStatus === 'connected' ? <Wifi size={11} /> :
                     waStatus === 'connecting' || waStatus === 'qr_ready' ? <RefreshCw size={11} className="animate-spin" /> :
                     <WifiOff size={11} />}
                    {waStatus === 'connected' ? 'Bağlı' : waStatus === 'connecting' ? 'Bağlanıyor...' :
                     waStatus === 'qr_ready' ? 'QR Hazır' : 'Bağlı Değil'}
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
                ) : qrCode ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <p className="text-slate-300 text-sm text-center">
                      WhatsApp'ı açın → <span className="text-white font-medium">⋮ Menü → Bağlantılı Cihazlar → Cihaz Bağla</span>
                    </p>
                    <div className="p-3 bg-white rounded-2xl">
                      <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-slate-500 text-xs">QR kodu okutunca otomatik bağlanacak</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-400 text-xs font-bold">1</span>
                      </div>
                      <p className="text-slate-300 text-sm">Aşağıdaki butona tıklayın ve QR kodu bekleyin (~10 saniye)</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-400 text-xs font-bold">2</span>
                      </div>
                      <p className="text-slate-300 text-sm">WhatsApp → Menü (⋮) → Bağlantılı Cihazlar → QR kodu okutun</p>
                    </div>
                    <button onClick={connectWhatsApp} disabled={waConnecting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-xl text-sm font-medium transition disabled:opacity-50">
                      {waConnecting ? <RefreshCw size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                      {waConnecting ? 'QR Hazırlanıyor...' : 'WhatsApp Bağla'}
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                        placeholder="587" />
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
                    <div className="w-10 h-5 bg-slate-700 peer-checked:bg-blue-600 rounded-full transition peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
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