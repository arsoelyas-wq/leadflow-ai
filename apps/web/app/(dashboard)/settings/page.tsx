'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import {
  User, Key, Bell, Shield, Save, MessageSquare,
  Mail, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff,
  Send, Eye, EyeOff, Smartphone, QrCode, Bot, Linkedin, Video,
  Lock, Globe, Sheet
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'profile' | 'channels' | 'notifications' | 'security' | '2fa' | 'sheets'>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({ name: user?.name || '', company: user?.company || '' })
  const [settings, setSettings] = useState<any>({})
  const [waStatus, setWaStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [waConnecting, setWaConnecting] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [emailPass, setEmailPass] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const pollRef = useRef<any>(null)

  // LinkedIn
  const [linkedinStatus, setLinkedinStatus] = useState('disconnected')
  const [linkedinEmail, setLinkedinEmail] = useState('')
  const [linkedinPassword, setLinkedinPassword] = useState('')
  const [linkedinConnecting, setLinkedinConnecting] = useState(false)
  const [showLinkedinPass, setShowLinkedinPass] = useState(false)
  const [linkedinConnectedEmail, setLinkedinConnectedEmail] = useState('')

  // Avatar & Voice
  const [avatarStatus, setAvatarStatus] = useState<any>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [voiceName, setVoiceName] = useState('Kişisel Sesim')
  const avatarVideoRef = useRef<HTMLInputElement>(null)
  const avatarPhotoRef = useRef<HTMLInputElement>(null)
  const voiceRef = useRef<HTMLInputElement>(null)

  // 2FA
  const [twoFAStatus, setTwoFAStatus] = useState(false)
  const [twoFASetup, setTwoFASetup] = useState<any>(null)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFALoading, setTwoFALoading] = useState(false)

  // Google Sheets
  const [sheetsId, setSheetsId] = useState('')
  const [sheetsSaving, setSheetsSaving] = useState(false)

  // Bildirimler
  const [notifSupported, setNotifSupported] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const loadSettings = async () => {
    try {
      const data = await api.get('/api/settings')
      setSettings(data.settings || {})
      setWaStatus(data.settings?.whatsapp_status || 'disconnected')
    } catch {}
  }

  const loadLinkedInStatus = async () => {
    try {
      const data = await api.get('/api/linkedin/status')
      setLinkedinStatus(data.connected ? 'connected' : 'disconnected')
      setLinkedinConnectedEmail(data.email || '')
    } catch {}
  }

  const loadAvatarStatus = async () => {
    try {
      const data = await api.get('/api/avatar/avatar-status')
      setAvatarStatus(data)
    } catch {}
  }

  useEffect(() => {
    if (tab === 'channels') {
      loadSettings()
      loadLinkedInStatus()
      loadAvatarStatus()
    }
    if (tab === '2fa') {
      api.get('/api/2fa/status').then(d => setTwoFAStatus(d.enabled)).catch(() => {})
    }
    if (tab === 'sheets') {
      api.get('/api/sheets/settings').then(d => {
        if (d.settings?.sheet_id) setSheetsId(d.settings.sheet_id)
      }).catch(() => {})
    }
    if (typeof window !== 'undefined') setNotifSupported('Notification' in window)
  }, [tab])

  const uploadAvatar = async (file: File, type: 'video' | 'photo') => {
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append(type === 'video' ? 'video' : 'photo', file)
      const endpoint = type === 'video' ? '/api/avatar/upload-avatar' : '/api/avatar/upload-photo-avatar'
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      showMsg('success', data.message)
      loadAvatarStatus()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const uploadVoice = async (file: File) => {
    setUploadingVoice(true)
    try {
      const formData = new FormData()
      formData.append('audio', file)
      formData.append('voiceName', voiceName)
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'}/api/avatar/upload-voice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      showMsg('success', data.message)
      loadAvatarStatus()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setUploadingVoice(false)
    }
  }

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.get('/api/settings/whatsapp/status')
        setWaStatus(data.status)
        if (data.qr) setQrCode(data.qr)
        if (data.status === 'connected') {
          setQrCode(null)
          setWaConnecting(false)
          stopPolling()
          showMsg('success', 'WhatsApp bağlandı!')
          loadSettings()
        }
      } catch {}
    }, 2000)
  }

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  const connectWhatsApp = async () => {
    setWaConnecting(true); setQrCode(null)
    try {
      const data = await api.post('/api/settings/whatsapp/connect', {})
      if (data.qr) { setQrCode(data.qr); startPolling() }
      else if (data.status === 'connected') { setWaStatus('connected'); setWaConnecting(false); showMsg('success', 'WhatsApp bağlandı!') }
    } catch (e: any) { showMsg('error', e.message); setWaConnecting(false) }
  }

  const disconnectWhatsApp = async () => {
    stopPolling()
    try {
      await api.post('/api/settings/whatsapp/disconnect', {})
      setWaStatus('disconnected'); setQrCode(null)
      showMsg('success', 'WhatsApp bağlantısı kesildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.patch('/api/auth/profile', profile)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
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

  const toggleAutoReply = async (enabled: boolean) => {
    setSettings((s: any) => ({ ...s, auto_reply_enabled: enabled }))
    try {
      await api.post('/api/settings', { ...settings, auto_reply_enabled: enabled })
      showMsg('success', enabled ? 'AI otomatik yanıt açıldı 🤖' : 'AI otomatik yanıt kapatıldı')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const testEmail = async () => {
    setEmailTesting(true)
    try {
      const data = await api.post('/api/settings/email/test', {
        email_host: settings.email_host, email_port: settings.email_port,
        email_user: settings.email_user, email_pass: emailPass, email_from: settings.email_from,
      })
      showMsg('success', data.message)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setEmailTesting(false) }
  }

  const connectLinkedIn = async () => {
    setLinkedinConnecting(true)
    try {
      const data = await api.post('/api/linkedin/connect', { email: linkedinEmail, password: linkedinPassword })
      showMsg('success', data.message)
      setLinkedinStatus('connected')
      setLinkedinConnectedEmail(linkedinEmail)
      setLinkedinPassword('')
    } catch (e: any) { showMsg('error', e.message) }
    finally { setLinkedinConnecting(false) }
  }

  const disconnectLinkedIn = async () => {
    try {
      await api.post('/api/linkedin/disconnect', {})
      setLinkedinStatus('disconnected')
      setLinkedinConnectedEmail('')
      showMsg('success', 'LinkedIn bağlantısı kesildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const setup2FA = async () => {
    setTwoFALoading(true)
    try {
      const d = await api.post('/api/2fa/setup', {})
      setTwoFASetup(d)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setTwoFALoading(false) }
  }

  const verify2FA = async () => {
    try {
      await api.post('/api/2fa/verify', { code: twoFACode })
      setTwoFAStatus(true)
      setTwoFASetup(null)
      setTwoFACode('')
      showMsg('success', '2FA aktif edildi!')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const disable2FA = async () => {
    try {
      await api.post('/api/2fa/disable', { code: twoFACode })
      setTwoFAStatus(false)
      setTwoFACode('')
      showMsg('success', '2FA devre dışı bırakıldı')
    } catch (e: any) { showMsg('error', e.message) }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'channels', label: 'Kanallar', icon: Key },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: '2fa', label: '2FA', icon: Lock },
    { id: 'sheets', label: 'Google Sheets', icon: Globe },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-slate-400 mt-1">Hesap ve uygulama ayarları</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
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
                <Icon size={16} />{label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 space-y-6">

          {/* PROFIL */}
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
                </div>
              </div>
              <div className="border-t border-slate-700 pt-6 grid gap-4">
                {[{ label: 'Ad Soyad', key: 'name' }, { label: 'Firma Adı', key: 'company' }].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-slate-400 text-sm mb-1.5 block">{label}</label>
                    <input value={(profile as any)[key] || ''}
                      onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                <Save size={15} />{saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
              </button>
            </div>
          )}

          {/* KANALLAR */}
          {tab === 'channels' && (
            <>
              {/* WhatsApp */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <MessageSquare size={18} className="text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">WhatsApp</h2>
                      <p className="text-slate-400 text-xs">QR kod ile bağlayın</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    waStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-700 border-slate-600 text-slate-400'
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
                        <p className="text-slate-400 text-xs">WhatsApp aktif</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Bot size={16} className="text-purple-400" />
                        <div>
                          <p className="text-white text-sm font-medium">AI Otomatik Yanıt</p>
                          <p className="text-slate-400 text-xs">Claude ile otomatik cevap</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.auto_reply_enabled || false}
                          onChange={e => toggleAutoReply(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-700 peer-checked:bg-purple-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </div>
                    <button onClick={disconnectWhatsApp}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm transition">
                      Bağlantıyı Kes
                    </button>
                  </div>
                ) : qrCode ? (
                  <div className="flex flex-col items-center gap-4 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                    <p className="text-white text-sm font-medium flex items-center gap-2">
                      <QrCode size={16} className="text-green-400" /> QR kodu WhatsApp ile okutun
                    </p>
                    <img src={qrCode} alt="WA QR" className="w-52 h-52 rounded-xl border border-slate-600" />
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" /> Bağlantı bekleniyor...
                    </p>
                    <button onClick={() => { stopPolling(); setQrCode(null); setWaConnecting(false) }}
                      className="text-slate-400 text-sm hover:text-white">İptal</button>
                  </div>
                ) : (
                  <button onClick={connectWhatsApp} disabled={waConnecting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-xl text-sm font-medium transition disabled:opacity-50">
                    {waConnecting ? <RefreshCw size={15} className="animate-spin" /> : <QrCode size={15} />}
                    {waConnecting ? 'QR oluşturuluyor...' : 'WhatsApp Bağla'}
                  </button>
                )}
              </div>

              {/* AI Video Avatar */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Video size={18} className="text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">AI Video Avatar</h2>
                      <p className="text-slate-400 text-xs">Kendi yüzünüz ve sesinizle kişiselleştirilmiş satış videoları</p>
                    </div>
                  </div>
                  {avatarStatus?.hasAvatar && (
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      avatarStatus.avatarStatus === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                    }`}>
                      {avatarStatus.avatarStatus === 'completed' ? '✓ Avatar Hazır' : '⏳ İşleniyor'}
                    </span>
                  )}
                </div>

                {avatarStatus?.hasAvatar && avatarStatus.avatarStatus === 'completed' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                          <Video size={20} className="text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Kişisel Avatar Aktif ✅</p>
                          <p className="text-slate-400 text-xs">
                            {avatarStatus.avatarType === 'photo' ? '📸 Fotoğraf Avatar' : '📹 Video Avatar'}
                          </p>
                        </div>
                      </div>
                      {avatarStatus.hasVoice && (
                        <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg mt-2">
                          <span className="text-green-400">🎙️</span>
                          <p className="text-white text-sm">{avatarStatus.voiceName} — Ses klonu aktif</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => avatarVideoRef.current?.click()}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
                        Avatar Değiştir
                      </button>
                      <button onClick={async () => {
                        await api.delete('/api/avatar/avatar')
                        setAvatarStatus({ hasAvatar: false })
                        showMsg('success', 'Avatar silindi')
                      }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm transition">
                        Sil
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                        <p className="text-white text-sm font-medium mb-1">📹 Video Avatar</p>
                        <p className="text-slate-400 text-xs mb-2">2-5 dk video yükle → AI klonlar</p>
                        <p className="text-emerald-400 text-xs mb-3">En gerçekçi sonuç</p>
                        <button onClick={() => avatarVideoRef.current?.click()} disabled={uploadingAvatar}
                          className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded-lg transition flex items-center justify-center gap-1">
                          {uploadingAvatar ? <RefreshCw size={11} className="animate-spin" /> : null}
                          {uploadingAvatar ? 'Yükleniyor...' : 'Video Yükle'}
                        </button>
                      </div>
                      <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                        <p className="text-white text-sm font-medium mb-1">📸 Fotoğraf Avatar</p>
                        <p className="text-slate-400 text-xs mb-2">Fotoğraf yükle → AI animasyon</p>
                        <p className="text-yellow-400 text-xs mb-3">Hızlı & ücretsiz</p>
                        <button onClick={() => avatarPhotoRef.current?.click()} disabled={uploadingAvatar}
                          className="w-full py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-xs rounded-lg transition flex items-center justify-center gap-1">
                          {uploadingAvatar ? <RefreshCw size={11} className="animate-spin" /> : null}
                          {uploadingAvatar ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                      <p className="text-white text-sm font-medium mb-1">🎙️ Ses Klonlama</p>
                      <p className="text-slate-400 text-xs mb-3">30sn - 3dk ses kaydı → AI sesinizi klonlar</p>
                      <div className="flex gap-2">
                        <input value={voiceName} onChange={e => setVoiceName(e.target.value)} placeholder="Ses adı"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500" />
                        <button onClick={() => voiceRef.current?.click()} disabled={uploadingVoice}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg transition flex items-center gap-1">
                          {uploadingVoice ? <RefreshCw size={11} className="animate-spin" /> : null}
                          {uploadingVoice ? 'Yükleniyor...' : 'Ses Yükle'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <input ref={avatarVideoRef} type="file" accept="video/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0], 'video')} />
                <input ref={avatarPhotoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0], 'photo')} />
                <input ref={voiceRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadVoice(e.target.files[0])} />
              </div>

              {/* LinkedIn */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                      <Linkedin size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">LinkedIn</h2>
                      <p className="text-slate-400 text-xs">Karar verici araması için bağlayın</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    linkedinStatus === 'connected' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-700 border-slate-600 text-slate-400'
                  }`}>
                    {linkedinStatus === 'connected' ? '✓ Bağlı' : 'Bağlı Değil'}
                  </span>
                </div>

                {linkedinStatus === 'connected' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {linkedinConnectedEmail?.[0]?.toUpperCase() || 'L'}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{linkedinConnectedEmail}</p>
                        <p className="text-slate-400 text-xs">LinkedIn bağlı</p>
                      </div>
                    </div>
                    <button onClick={disconnectLinkedIn}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm transition">
                      Bağlantıyı Kes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input value={linkedinEmail} onChange={e => setLinkedinEmail(e.target.value)} placeholder="LinkedIn email"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    <div className="relative">
                      <input type={showLinkedinPass ? 'text' : 'password'} value={linkedinPassword}
                        onChange={e => setLinkedinPassword(e.target.value)} placeholder="LinkedIn şifre"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 pr-10" />
                      <button onClick={() => setShowLinkedinPass(!showLinkedinPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showLinkedinPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button onClick={connectLinkedIn} disabled={linkedinConnecting || !linkedinEmail || !linkedinPassword}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
                      {linkedinConnecting ? <RefreshCw size={14} className="animate-spin" /> : <Linkedin size={14} />}
                      {linkedinConnecting ? 'Bağlanıyor...' : 'LinkedIn Bağla'}
                    </button>
                  </div>
                )}
              </div>

              {/* Email SMTP */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Mail size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">Email (SMTP)</h2>
                    <p className="text-slate-400 text-xs">Gmail veya SMTP sunucunuzu bağlayın</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">SMTP Sunucu</label>
                      <input value={settings.email_host || 'smtp.gmail.com'}
                        onChange={e => setSettings({ ...settings, email_host: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">Port</label>
                      <input type="number" value={settings.email_port || 587}
                        onChange={e => setSettings({ ...settings, email_port: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <input value={settings.email_user || ''} onChange={e => setSettings({ ...settings, email_user: e.target.value })}
                    placeholder="email@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={emailPass}
                      onChange={e => setEmailPass(e.target.value)} placeholder="Şifre / Uygulama Şifresi"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 pr-10" />
                    <button onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={testEmail} disabled={emailTesting || !settings.email_user || !emailPass}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 rounded-lg text-sm transition disabled:opacity-40">
                      {emailTesting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      Test Et
                    </button>
                    <button onClick={saveSettings} disabled={settingsSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition">
                      {settingsSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* BİLDİRİMLER */}
          {tab === 'notifications' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold text-lg">Bildirim Ayarları</h2>
              {[
                { label: 'Yeni lead geldiğinde', defaultOn: true },
                { label: 'Lead cevap verdiğinde', defaultOn: true },
                { label: 'Video hazır olduğunda', defaultOn: true },
                { label: 'Kampanya tamamlandığında', defaultOn: false },
                { label: 'Kredi azaldığında', defaultOn: true },
                { label: 'Reklam uyarısı', defaultOn: true },
                { label: 'Fiyat değişikliği', defaultOn: true },
              ].map(({ label, defaultOn }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <p className="text-white text-sm">{label}</p>
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
                {['Mevcut Şifre', 'Yeni Şifre', 'Yeni Şifre (Tekrar)'].map(label => (
                  <div key={label}>
                    <label className="text-slate-400 text-sm mb-1.5 block">{label}</label>
                    <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                  <Shield size={15} /> Şifreyi Güncelle
                </button>
              </div>
            </div>
          )}

          {/* 2FA */}
          {tab === '2fa' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-white font-semibold text-lg">İki Faktörlü Doğrulama (2FA)</h2>
                <p className="text-slate-400 text-sm mt-1">Google Authenticator ile hesabınızı koruyun</p>
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-xl border ${twoFAStatus ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-700'}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${twoFAStatus ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                <p className="text-white text-sm">{twoFAStatus ? '✅ 2FA Aktif — Hesabınız korunuyor' : '❌ 2FA Pasif — Hesabınız korumasız'}</p>
              </div>

              {!twoFAStatus ? (
                <div className="space-y-4">
                  {!twoFASetup ? (
                    <button onClick={setup2FA} disabled={twoFALoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl">
                      {twoFALoading ? <RefreshCw size={14} className="animate-spin"/> : <Shield size={14}/>}
                      2FA Kurulumunu Başlat
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-900 rounded-xl p-5 text-center">
                        <p className="text-slate-400 text-sm mb-3">Google Authenticator ile bu QR kodu okutun</p>
                        <img src={twoFASetup.qrImageUrl} alt="2FA QR" className="mx-auto w-40 h-40 rounded-xl bg-white p-2"/>
                        <p className="text-slate-500 text-xs mt-3">Manuel giriş: <code className="text-white bg-slate-800 px-2 py-0.5 rounded">{twoFASetup.secret}</code></p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Doğrulama Kodu (6 haneli)</label>
                        <div className="flex gap-2">
                          <input value={twoFACode} onChange={e=>setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                            placeholder="000000" maxLength={6}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 tracking-widest text-center"/>
                          <button onClick={verify2FA} disabled={twoFACode.length !== 6}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-lg">
                            Doğrula & Aktif Et
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">2FA'yı devre dışı bırakmak için kodunuzu girin:</p>
                  <div className="flex gap-2">
                    <input value={twoFACode} onChange={e=>setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000" maxLength={6}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none tracking-widest text-center"/>
                    <button onClick={disable2FA} disabled={twoFACode.length !== 6}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm rounded-lg">
                      Devre Dışı Bırak
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GOOGLE SHEETS */}
          {tab === 'sheets' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-white font-semibold text-lg">Google Sheets Sync</h2>
                <p className="text-slate-400 text-sm mt-1">Leadlerinizi otomatik olarak Google Sheets'e aktarın</p>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 space-y-2">
                <p className="text-slate-300 text-sm font-medium">📋 Nasıl Kullanılır?</p>
                <ol className="text-slate-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Google Sheets'te yeni bir sayfa oluşturun</li>
                  <li>URL'den Spreadsheet ID'yi kopyalayın</li>
                  <li className="text-slate-500">docs.google.com/spreadsheets/d/<span className="text-white font-mono">ID_BURADA</span>/edit</li>
                  <li>Aşağıya yapıştırın ve Kaydet'e tıklayın</li>
                  <li>"Şimdi Aktar" ile leadleri aktarın</li>
                </ol>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Google Sheets ID</label>
                <input value={sheetsId} onChange={e=>setSheetsId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"/>
              </div>

              <div className="flex gap-3">
                <button onClick={async () => {
                  setSheetsSaving(true)
                  try {
                    await api.post('/api/sheets/settings', { sheetId: sheetsId })
                    showMsg('success', 'Google Sheets ayarları kaydedildi')
                  } catch (e:any) { showMsg('error', e.message) }
                  finally { setSheetsSaving(false) }
                }} disabled={sheetsSaving || !sheetsId}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                  {sheetsSaving ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                  Kaydet
                </button>
                <button onClick={async () => {
                  try {
                    const d = await api.post('/api/sheets/export-leads', { sheetId: sheetsId, sheetName: 'Leadler' })
                    showMsg('success', d.message)
                  } catch (e:any) { showMsg('error', e.message) }
                }} disabled={!sheetsId}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                  📤 Şimdi Aktar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}