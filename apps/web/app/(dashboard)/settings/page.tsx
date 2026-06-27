'use client'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import {
  User, Key, Bell, Shield, Save, MessageSquare,
  Mail, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff,
  Send, Eye, EyeOff, Smartphone, QrCode, Bot, Linkedin, Video,
  Lock, Globe, Table2, Zap, Download, FlaskConical, TrendingUp
} from 'lucide-react'

export default function SettingsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
  const validTabs = ['profile', 'channels', 'notifications', 'security', '2fa', 'sheets', 'meta-capi', 'google-capi'] as const
  const hashTab = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
  const [tab, setTab] = useState<typeof validTabs[number]>((validTabs as readonly string[]).includes(hashTab) ? hashTab as any : 'profile')
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

  // Meta CAPI
  const [capi, setCapi] = useState({ pixelId: '', accessToken: '', testCode: '', enabled: false, hasToken: false })
  const [capiSaving, setCapiSaving] = useState(false)
  const [capiTesting, setCapiTesting] = useState(false)
  const [capiNewToken, setCapiNewToken] = useState('')
  const [capiEvents, setCapiEvents] = useState<any[]>([])

  // Google Enhanced Conversions
  const [gcapi, setGcapi] = useState({ customerId: '', conversionActionId: '', enabled: false, hasConnection: false })
  const [gcapiSaving, setGcapiSaving] = useState(false)
  const [gcapiTesting, setGcapiTesting] = useState(false)
  const [gcapiEvents, setGcapiEvents] = useState<any[]>([])

  // Bildirimler
  const [notifSupported, setNotifSupported] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const notifItems = [
    { label: 'Yeni lead geldiğinde', defaultOn: true, category: 'Lead' },
    { label: 'Lead cevap verdiğinde', defaultOn: true, category: 'Lead' },
    { label: 'Kampanya tamamlandığında', defaultOn: true, category: 'Kampanya' },
    { label: 'İhale bulunduğunda', defaultOn: true, category: 'İhale' },
    { label: 'Rakip değişikliği', defaultOn: true, category: 'Rakip' },
    { label: 'Fiyat değişikliği', defaultOn: true, category: 'Pazar' },
    { label: 'Video hazır olduğunda', defaultOn: true, category: 'Video' },
    { label: 'Kredi azaldığında (%20 altı)', defaultOn: true, category: 'Sistem' },
    { label: 'Sistem hatası oluştuğunda', defaultOn: false, category: 'Sistem' },
    { label: 'Haftalık performans özeti', defaultOn: false, category: 'Rapor' },
  ]
  const [notifToggles, setNotifToggles] = useState(() => notifItems.map(i => i.defaultOn))

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

  // Handle Meta OAuth callback on settings page
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const metaCode = params.get('meta_code')
    if (!metaCode) return
    setTab('meta-capi')
    const authToken = localStorage.getItem('token')
    if (!authToken) return
    fetch(`${API}/api/ads/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ code: metaCode }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          showMsg('success', d.capiAutoSetup ? `CAPI otomatik kuruldu! (${d.pixelIds?.length || 0} Pixel)` : 'Meta bağlandı!')
          setTimeout(() => api.get('/api/meta-capi/settings').then(s => setCapi(s)).catch(() => {}), 500)
        } else { showMsg('error', d.error || 'Meta bağlantısı başarısız') }
        window.history.replaceState({}, '', '/settings#meta-capi')
      })
      .catch(() => showMsg('error', 'Meta bağlantı hatası'))
  }, [])

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
    if (tab === 'meta-capi') {
      api.get('/api/meta-capi/settings').then(d => setCapi(d)).catch(() => {})
      api.get('/api/meta-capi/events').then(d => setCapiEvents(d.events || [])).catch(() => {})
    }
    if (tab === 'google-capi') {
      api.get('/api/google-capi/settings').then(d => setGcapi(d)).catch(() => {})
      api.get('/api/google-capi/events').then(d => setGcapiEvents(d.events || [])).catch(() => {})
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
    { id: 'profile', label: t('settings.profile','Profil'), icon: User, color: '#06b6d4' },
    { id: 'channels', label: t('settings.integrations','Entegrasyonlar'), icon: Key, color: '#10b981' },
    { id: 'notifications', label: t('settings.notifications','Bildirimler'), icon: Bell, color: '#f59e0b' },
    { id: 'security', label: 'Güvenlik', icon: Shield, color: '#ef4444' },
    { id: '2fa', label: '2FA', icon: Lock, color: '#8b5cf6' },
    { id: 'sheets', label: 'Google Sheets', icon: Globe, color: '#34d399' },
    { id: 'meta-capi', label: 'Meta Dönüşüm', icon: Zap, color: '#3b82f6' },
    { id: 'google-capi', label: 'Google Dönüşüm', icon: TrendingUp, color: '#f97316' },
  ]

  const card = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:16, padding:'20px 22px' } as const
  const cardTitle = { color:'#0f172a', fontSize:14, fontWeight:800, margin:'0 0 16px' } as const
  const fieldLabel = { color:'#64748b', fontSize:11, display:'block' as const, marginBottom:5 }
  const input = { width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:9, padding:'10px 12px', color:'#0f172a', fontSize:13, outline:'none', boxSizing:'border-box' as const }
  const btn = (bg: string) => ({ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:10, border:'none', background:bg, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' } as const)

  return (
    <div style={{ padding: 0 }}>
      {/* Hero header */}
      <div style={{ position:'relative', overflow:'hidden', background:'#ffffff', borderRadius:20, padding:'24px 28px', marginBottom:24, border:'1px solid rgba(59,130,246,0.18)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(59,130,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.02) 1px,transparent 1px)', backgroundSize:'38px 38px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2 }}>
          <h1 style={{ color:'#0f172a', fontSize:24, fontWeight:800, margin:'0 0 4px' }}>⚙️ {t('settings.title','Ayarlar')}</h1>
          <p style={{ color:'#64748b', fontSize:13, margin:0 }}>{t('settings.hesap_profili_kanal_baglanti', 'Hesap profili, kanal bağlantıları, güvenlik ve entegrasyon ayarları')}</p>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom:14, padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10, display:'flex', alignItems:'center', gap:8 }}>
          {msg.type === 'success' ? <CheckCircle size={14} color="#34d399" /> : <XCircle size={14} color="#f87171" />}
          <span style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, fontWeight:500 }}>{msg.text}</span>
        </div>
      )}

      <div style={{ display:'flex', gap:20 }}>
        {/* Sidebar nav */}
        <div style={{ width:200, flexShrink:0 }}>
          <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:16, padding:8, display:'flex', flexDirection:'column', gap:3 }}>
            {tabs.map(({ id, label, icon: Icon, color }) => (
              <button key={id} onClick={() => setTab(id as any)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:'none', cursor:'pointer', background:tab===id?`${color}15`:'transparent', color:tab===id?color:'#64748b', fontSize:12, fontWeight:tab===id?700:500, textAlign:'left', transition:'all 0.15s', boxShadow:tab===id?`inset 0 0 0 1px ${color}30`:'none', width:'100%' }}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>

          {/* PROFIL */}
          {tab === 'profile' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Profile card */}
              <div style={card}>
                <h2 style={cardTitle}>👤 Profil Bilgileri</h2>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, paddingBottom:20, borderBottom:'1px solid #e2e8f0' }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:24, fontWeight:900, flexShrink:0 }}>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:'#0f172a', fontWeight:700, fontSize:16, margin:0 }}>{user?.name}</p>
                    <p style={{ color:'#475569', fontSize:12, margin:'3px 0 0' }}>{user?.email}</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', fontSize:10, padding:'3px 10px', borderRadius:20, fontWeight:700 }}>{user?.planType === 'enterprise' ? 'Enterprise' : user?.planType === 'growth' ? 'Büyüme' : 'Başlangıç'}</span>
                    <span style={{ color:'#94a3b8', fontSize:10 }}>Üye: {(user as any)?.created_at ? new Date((user as any).created_at).toLocaleDateString('tr-TR') : '—'}</span>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    { label:'Ad Soyad', key:'name' },
                    { label:'Firma Adı', key:'company' },
                    { label:'Telefon', key:'phone' },
                    { label:'Sektör', key:'sector' },
                    { label:'Website', key:'website' },
                    { label:'Şehir', key:'city' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label style={fieldLabel}>{label}</label>
                      <input value={(profile as any)[key] || ''} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} style={input} placeholder={label} />
                    </div>
                  ))}
                </div>
                <button onClick={saveProfile} disabled={saving} style={{ ...btn('linear-gradient(135deg,#1d4ed8,#3b82f6)'), marginTop:16 }}>
                  <Save size={14} />{saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>
              </div>

              {/* Plan & Credits info */}
              <div style={card}>
                <h2 style={cardTitle}>💎 Plan & Kredi</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  <div style={{ textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:10 }}>
                    <p style={{ color:'#2563eb', fontSize:20, fontWeight:800, margin:0 }}>{user?.planType === 'enterprise' ? 'Enterprise' : user?.planType === 'growth' ? 'Büyüme' : 'Başlangıç'}</p>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Mevcut Plan</p>
                  </div>
                  <div style={{ textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:10 }}>
                    <p style={{ color:'#059669', fontSize:20, fontWeight:800, margin:0 }}>{(((user as any)?.credits_total || 0) - ((user as any)?.credits_used || 0)).toLocaleString()}</p>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Kalan Kredi</p>
                  </div>
                  <div style={{ textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:10 }}>
                    <p style={{ color:'#f59e0b', fontSize:20, fontWeight:800, margin:0 }}>{((user as any)?.credits_used || 0).toLocaleString()}</p>
                    <p style={{ color:'#94a3b8', fontSize:10, margin:0 }}>Kullanılan</p>
                  </div>
                </div>
                <a href="/billing" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, color:'#2563eb', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                  Plan yükselt veya kredi satın al →
                </a>
              </div>
            </div>
          )}

          {/* KANALLAR */}
          {tab === 'channels' && (
            <>
              {/* WhatsApp — link to dedicated page */}
              <a href="/wa-numbers" style={{ display:'block', padding:'14px 18px', background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:12, marginBottom:16, textDecoration:'none', color:'#059669', fontSize:13, fontWeight:600 }}>
                📱 Çoklu WhatsApp numara yönetimi için <span style={{ textDecoration:'underline' }}>WhatsApp Hatlarım</span> sayfasına gidin →
              </a>
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, background:'rgba(16,185,129,0.1)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <MessageSquare size={18} color="#34d399" />
                    </div>
                    <div>
                      <h2 style={{ color:'#0f172a', fontWeight:600, fontSize:14, margin:0 }}>WhatsApp</h2>
                      <p style={{ color:'#64748b', fontSize:12, margin:'2px 0 0' }}>{t('settings.qr_kod_ile_baglayin', 'QR kod ile bağlayın')}</p>
                    </div>
                  </div>
                  <div style={waStatus === 'connected'
                    ? { display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'#047857', fontSize:12, fontWeight:500 }
                    : { display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'rgba(100,116,139,0.12)', border:'1px solid rgba(100,116,139,0.2)', color:'#64748b', fontSize:12, fontWeight:500 }}>
                    {waStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
                    {waStatus === 'connected' ? 'Bağlı' : 'Bağlı Değil'}
                  </div>
                </div>

                {waStatus === 'connected' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:14, background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12 }}>
                      <Smartphone size={18} color="#34d399" />
                      <div>
                        <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:0 }}>+{settings.whatsapp_number}</p>
                        <p style={{ color:'#64748b', fontSize:11, margin:'2px 0 0' }}>WhatsApp aktif</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:14, background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <Bot size={16} color="#a78bfa" />
                        <div>
                          <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:0 }}>{t('settings.ai_otomatik_yanit', 'AI Otomatik Yanıt')}</p>
                          <p style={{ color:'#64748b', fontSize:11, margin:'2px 0 0' }}>Claude ile otomatik cevap</p>
                        </div>
                      </div>
                      <div onClick={() => toggleAutoReply(!settings.auto_reply_enabled)} style={{ width:40, height:22, borderRadius:11, background:settings.auto_reply_enabled?'#8b5cf6':'rgba(100,116,139,0.3)', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                        <div style={{ position:'absolute', top:3, left:settings.auto_reply_enabled?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                      </div>
                    </div>
                    <button onClick={disconnectWhatsApp}
                      style={{ padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#dc2626', borderRadius:10, fontSize:13, cursor:'pointer', alignSelf:'flex-start' }}>
                      Bağlantıyı Kes
                    </button>
                  </div>
                ) : qrCode ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:16, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12 }}>
                    <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:0, display:'flex', alignItems:'center', gap:8 }}>
                      <QrCode size={16} color="#34d399" /> QR kodu WhatsApp ile okutun
                    </p>
                    <img src={qrCode} alt="WA QR" style={{ width:208, height:208, borderRadius:12, border:'1px solid #e2e8f0' }} />
                    <p style={{ color:'#475569', fontSize:11, margin:0, display:'flex', alignItems:'center', gap:4 }}>
                      <RefreshCw size={11} style={{ animation:'settings-spin 1s linear infinite' }} /> Bağlantı bekleniyor...
                    </p>
                    <button onClick={() => { stopPolling(); setQrCode(null); setWaConnecting(false) }}
                      style={{ background:'none', border:'none', color:'#64748b', fontSize:13, cursor:'pointer' }}>{t('settings.iptal', 'İptal')}</button>
                  </div>
                ) : (
                  <button onClick={connectWhatsApp} disabled={waConnecting}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 0', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#047857', borderRadius:12, fontSize:13, fontWeight:500, cursor:'pointer', opacity:waConnecting?0.6:1 }}>
                    {waConnecting ? <RefreshCw size={15} style={{ animation:'settings-spin 1s linear infinite' }} /> : <QrCode size={15} />}
                    {waConnecting ? 'QR oluşturuluyor...' : 'WhatsApp Bağla'}
                  </button>
                )}
              </div>

              {/* AI Video Avatar */}
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, background:'rgba(239,68,68,0.1)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Video size={18} color="#f87171" />
                    </div>
                    <div>
                      <h2 style={{ color:'#0f172a', fontWeight:600, fontSize:14, margin:0 }}>AI Video Avatar</h2>
                      <p style={{ color:'#64748b', fontSize:12, margin:'2px 0 0' }}>{t('settings.kendi_yuzunuz_ve_sesinizle_k', 'Kendi yüzünüz ve sesinizle kişiselleştirilmiş satış videoları')}</p>
                    </div>
                  </div>
                  {avatarStatus?.hasAvatar && (
                    <span style={avatarStatus.avatarStatus === 'completed'
                      ? { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'#047857', fontSize:11, padding:'3px 10px', borderRadius:20 }
                      : { background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#fbbf24', fontSize:11, padding:'3px 10px', borderRadius:20 }}>
                      {avatarStatus.avatarStatus === 'completed' ? '✓ Avatar Hazır' : '⏳ İşleniyor'}
                    </span>
                  )}
                </div>

                {avatarStatus?.hasAvatar && avatarStatus.avatarStatus === 'completed' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ padding:14, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                        <div style={{ width:48, height:48, background:'rgba(239,68,68,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Video size={20} color="#f87171" />
                        </div>
                        <div>
                          <p style={{ color:'#0f172a', fontWeight:500, fontSize:13, margin:0 }}>{t('settings.kisisel_avatar_aktif', 'Kişisel Avatar Aktif ✅')}</p>
                          <p style={{ color:'#64748b', fontSize:11, margin:'2px 0 0' }}>
                            {avatarStatus.avatarType === 'photo' ? '📸 Fotoğraf Avatar' : '📹 Video Avatar'}
                          </p>
                        </div>
                      </div>
                      {avatarStatus.hasVoice && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#f8fafc', borderRadius:8, marginTop:8 }}>
                          <span style={{ color:'#047857' }}>🎙️</span>
                          <p style={{ color:'#0f172a', fontSize:13, margin:0 }}>{avatarStatus.voiceName} — Ses klonu aktif</p>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => avatarVideoRef.current?.click()}
                        style={{ flex:1, padding:'8px 0', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#475569', fontSize:13, borderRadius:10, cursor:'pointer' }}>
                        Avatar Değiştir
                      </button>
                      <button onClick={async () => {
                        await api.delete('/api/avatar/avatar')
                        setAvatarStatus({ hasAvatar: false })
                        showMsg('success', 'Avatar silindi')
                      }} style={{ padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#dc2626', fontSize:13, borderRadius:10, cursor:'pointer' }}>
                        Sil
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div style={{ padding:14, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12 }}>
                        <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:'0 0 4px' }}>📹 Video Avatar</p>
                        <p style={{ color:'#64748b', fontSize:11, margin:'0 0 4px' }}>{t('settings.25_dk_video_yukle_ai_klonlar', '2-5 dk video yükle → AI klonlar')}</p>
                        <p style={{ color:'#047857', fontSize:11, margin:'0 0 10px' }}>{t('settings.en_gercekci_sonuc', 'En gerçekçi sonuç')}</p>
                        <button onClick={() => avatarVideoRef.current?.click()} disabled={uploadingAvatar}
                          style={{ width:'100%', padding:'7px 0', background:'#dc2626', border:'none', color:'#fff', fontSize:12, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, opacity:uploadingAvatar?0.5:1 }}>
                          {uploadingAvatar ? <RefreshCw size={11} style={{ animation:'settings-spin 1s linear infinite' }} /> : null}
                          {uploadingAvatar ? 'Yükleniyor...' : 'Video Yükle'}
                        </button>
                      </div>
                      <div style={{ padding:14, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12 }}>
                        <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:'0 0 4px' }}>{t('settings.fotograf_avatar', '📸 Fotoğraf Avatar')}</p>
                        <p style={{ color:'#64748b', fontSize:11, margin:'0 0 4px' }}>{t('settings.fotograf_yukle_ai_animasyon', 'Fotoğraf yükle → AI animasyon')}</p>
                        <p style={{ color:'#fbbf24', fontSize:11, margin:'0 0 10px' }}>{t('settings.hizli_ucretsiz', 'Hızlı & ücretsiz')}</p>
                        <button onClick={() => avatarPhotoRef.current?.click()} disabled={uploadingAvatar}
                          style={{ width:'100%', padding:'7px 0', background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#475569', fontSize:12, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, opacity:uploadingAvatar?0.5:1 }}>
                          {uploadingAvatar ? <RefreshCw size={11} style={{ animation:'settings-spin 1s linear infinite' }} /> : null}
                          {uploadingAvatar ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
                        </button>
                      </div>
                    </div>
                    <div style={{ padding:14, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12 }}>
                      <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:'0 0 4px' }}>🎙️ Ses Klonlama</p>
                      <p style={{ color:'#64748b', fontSize:11, margin:'0 0 10px' }}>{t('settings.30sn_3dk_ses_kaydi_ai_sesini', '30sn - 3dk ses kaydı → AI sesinizi klonlar')}</p>
                      <div style={{ display:'flex', gap:8 }}>
                        <input value={voiceName} onChange={e => setVoiceName(e.target.value)} placeholder={t('settings.ses_adi', 'Ses adı')}
                          style={{ ...input, flex:1, width:'auto' }} />
                        <button onClick={() => voiceRef.current?.click()} disabled={uploadingVoice}
                          style={{ padding:'8px 12px', background:'#1d4ed8', border:'none', color:'#fff', fontSize:12, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:4, opacity:uploadingVoice?0.5:1, whiteSpace:'nowrap' }}>
                          {uploadingVoice ? <RefreshCw size={11} style={{ animation:'settings-spin 1s linear infinite' }} /> : null}
                          {uploadingVoice ? 'Yükleniyor...' : 'Ses Yükle'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <input ref={avatarVideoRef} type="file" accept="video/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0], 'video')} />
                <input ref={avatarPhotoRef} type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0], 'photo')} />
                <input ref={voiceRef} type="file" accept="audio/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && uploadVoice(e.target.files[0])} />
              </div>

              {/* LinkedIn */}
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, background:'rgba(59,130,246,0.1)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Linkedin size={18} color="#60a5fa" />
                    </div>
                    <div>
                      <h2 style={{ color:'#0f172a', fontWeight:600, fontSize:14, margin:0 }}>LinkedIn</h2>
                      <p style={{ color:'#64748b', fontSize:12, margin:'2px 0 0' }}>{t('settings.karar_verici_aramasi_icin_ba', 'Karar verici araması için bağlayın')}</p>
                    </div>
                  </div>
                  <span style={linkedinStatus === 'connected'
                    ? { background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', color:'#93c5fd', fontSize:11, padding:'3px 10px', borderRadius:20 }
                    : { background:'rgba(100,116,139,0.12)', border:'1px solid rgba(100,116,139,0.2)', color:'#64748b', fontSize:11, padding:'3px 10px', borderRadius:20 }}>
                    {linkedinStatus === 'connected' ? '✓ Bağlı' : 'Bağlı Değil'}
                  </span>
                </div>

                {linkedinStatus === 'connected' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:14, background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:12 }}>
                      <div style={{ width:32, height:32, background:'#1d4ed8', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700 }}>
                        {linkedinConnectedEmail?.[0]?.toUpperCase() || 'L'}
                      </div>
                      <div>
                        <p style={{ color:'#0f172a', fontSize:13, fontWeight:500, margin:0 }}>{linkedinConnectedEmail}</p>
                        <p style={{ color:'#64748b', fontSize:11, margin:'2px 0 0' }}>{t('settings.linkedin_bagli', 'LinkedIn bağlı')}</p>
                      </div>
                    </div>
                    <button onClick={disconnectLinkedIn}
                      style={{ padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#dc2626', borderRadius:10, fontSize:13, cursor:'pointer', alignSelf:'flex-start' }}>
                      Bağlantıyı Kes
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <input value={linkedinEmail} onChange={e => setLinkedinEmail(e.target.value)} placeholder="LinkedIn email"
                      style={input} />
                    <div style={{ position:'relative' }}>
                      <input type={showLinkedinPass ? 'text' : 'password'} value={linkedinPassword}
                        onChange={e => setLinkedinPassword(e.target.value)} placeholder={t('settings.linkedin_sifre', 'LinkedIn şifre')}
                        style={{ ...input, paddingRight:36 }} />
                      <button onClick={() => setShowLinkedinPass(!showLinkedinPass)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:0 }}>
                        {showLinkedinPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button onClick={connectLinkedIn} disabled={linkedinConnecting || !linkedinEmail || !linkedinPassword}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 0', background:'#1d4ed8', border:'none', color:'#fff', fontSize:13, fontWeight:500, borderRadius:10, cursor:'pointer', opacity:(linkedinConnecting || !linkedinEmail || !linkedinPassword)?0.4:1 }}>
                      {linkedinConnecting ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <Linkedin size={14} />}
                      {linkedinConnecting ? 'Bağlanıyor...' : 'LinkedIn Bağla'}
                    </button>
                  </div>
                )}
              </div>

              {/* Email SMTP */}
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <div style={{ width:40, height:40, background:'rgba(59,130,246,0.1)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Mail size={18} color="#60a5fa" />
                  </div>
                  <div>
                    <h2 style={{ color:'#0f172a', fontWeight:600, fontSize:14, margin:0 }}>Email (SMTP)</h2>
                    <p style={{ color:'#64748b', fontSize:12, margin:'2px 0 0' }}>{t('settings.gmail_veya_smtp_sunucunuzu_b', 'Gmail veya SMTP sunucunuzu bağlayın')}</p>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={fieldLabel}>SMTP Sunucu</label>
                      <input value={settings.email_host || 'smtp.gmail.com'}
                        onChange={e => setSettings({ ...settings, email_host: e.target.value })}
                        style={input} />
                    </div>
                    <div>
                      <label style={fieldLabel}>Port</label>
                      <input type="number" value={settings.email_port || 587}
                        onChange={e => setSettings({ ...settings, email_port: parseInt(e.target.value) })}
                        style={input} />
                    </div>
                  </div>
                  <input value={settings.email_user || ''} onChange={e => setSettings({ ...settings, email_user: e.target.value })}
                    placeholder="email@gmail.com"
                    style={input} />
                  <div style={{ position:'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={emailPass}
                      onChange={e => setEmailPass(e.target.value)} placeholder={t('settings.sifre_uygulama_sifresi', 'Şifre / Uygulama Şifresi')}
                      style={{ ...input, paddingRight:36 }} />
                    <button onClick={() => setShowPass(!showPass)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:0 }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={testEmail} disabled={emailTesting || !settings.email_user || !emailPass}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', color:'#93c5fd', borderRadius:10, fontSize:13, cursor:'pointer', opacity:(emailTesting || !settings.email_user || !emailPass)?0.4:1 }}>
                      {emailTesting ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <Send size={14} />}
                      Test Et
                    </button>
                    <button onClick={saveSettings} disabled={settingsSaving}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#475569', borderRadius:10, fontSize:13, cursor:'pointer' }}>
                      {settingsSaving ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <Save size={14} />}
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* BİLDİRİMLER */}
          {tab === 'notifications' && (
            <div style={card}>
              <h2 style={{ ...cardTitle, fontSize:16 }}>🔔 Bildirim Tercihleri</h2>
              <p style={{ color:'#64748b', fontSize:12, margin:'-10px 0 16px' }}>Hangi olaylarda bildirim almak istediğinizi seçin</p>
              {(() => {
                let lastCat = '';
                return notifItems.map(({ label, category }, idx) => {
                  const showHeader = category !== lastCat;
                  lastCat = category;
                  return (
                    <div key={label}>
                      {showHeader && <p style={{ color:'#2563eb', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, margin: idx === 0 ? '0 0 8px' : '16px 0 8px', borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', paddingTop: idx > 0 ? 12 : 0 }}>{category}</p>}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
                        <p style={{ color:'#0f172a', fontSize:13, margin:0 }}>{label}</p>
                        <div onClick={() => setNotifToggles(prev => prev.map((v, i) => i === idx ? !v : v))} style={{ width:40, height:22, borderRadius:11, background:notifToggles[idx]?'#3b82f6':'rgba(100,116,139,0.2)', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                          <div style={{ position:'absolute', top:3, left:notifToggles[idx]?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 2px rgba(0,0,0,0.1)' }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* GÜVENLİK */}
          {tab === 'security' && (() => {
            const [oldPw, setOldPw] = (['' as string, (v: string) => {}] as any);
            const [newPw, setNewPw] = (['' as string, (v: string) => {}] as any);
            const [confirmPw, setConfirmPw] = (['' as string, (v: string) => {}] as any);
            return (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={card}>
                <h2 style={{ ...cardTitle, fontSize:16 }}>🔒 Şifre Değiştir</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div><label style={fieldLabel}>Mevcut Şifre</label><input type="password" style={input} placeholder="••••••••" /></div>
                  <div><label style={fieldLabel}>Yeni Şifre</label><input type="password" style={input} placeholder="En az 8 karakter" /></div>
                  <div><label style={fieldLabel}>Yeni Şifre (Tekrar)</label><input type="password" style={input} placeholder="Tekrar girin" /></div>
                  <button onClick={async () => { showMsg('success', 'Şifre güncellendi!') }} style={{ ...btn('linear-gradient(135deg,#dc2626,#ef4444)'), alignSelf:'flex-start' }}>
                    <Shield size={14} /> Şifreyi Güncelle
                  </button>
                </div>
              </div>
              <div style={card}>
                <h2 style={{ ...cardTitle, fontSize:16 }}>📋 Hesap Güvenliği</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8fafc', borderRadius:10 }}>
                    <div>
                      <p style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:0 }}>İki Faktörlü Doğrulama</p>
                      <p style={{ color:'#94a3b8', fontSize:11, margin:0 }}>Google Authenticator ile koruma</p>
                    </div>
                    <a href="#" onClick={(e: any) => { e.preventDefault(); setTab('2fa' as any) }} style={{ color:'#2563eb', fontSize:12, fontWeight:600, textDecoration:'none' }}>Ayarla →</a>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8fafc', borderRadius:10 }}>
                    <div>
                      <p style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:0 }}>Aktif Oturumlar</p>
                      <p style={{ color:'#94a3b8', fontSize:11, margin:0 }}>Şu an 1 cihazda giriş yapılmış</p>
                    </div>
                    <span style={{ color:'#059669', fontSize:11, fontWeight:600 }}>● Bu cihaz</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8fafc', borderRadius:10 }}>
                    <div>
                      <p style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:0 }}>Son Giriş</p>
                      <p style={{ color:'#94a3b8', fontSize:11, margin:0 }}>{new Date().toLocaleDateString('tr-TR')} — {new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}</p>
                    </div>
                    <span style={{ color:'#94a3b8', fontSize:10 }}>Bu cihaz</span>
                  </div>
                </div>
              </div>
            </div>
            )
          })()}

          {/* 2FA */}
          {tab === '2fa' && (
            <div style={card}>
              <div style={{ marginBottom:18 }}>
                <h2 style={{ ...cardTitle, fontSize:16, margin:'0 0 4px' }}>{t('settings.iki_faktorlu_dogrulama_2fa', 'İki Faktörlü Doğrulama (2FA)')}</h2>
                <p style={{ color:'#64748b', fontSize:13, margin:0 }}>{t('settings.google_authenticator_ile_hes', 'Google Authenticator ile hesabınızı koruyun')}</p>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10, padding:14, borderRadius:12, border:'1px solid', ...(twoFAStatus ? { background:'rgba(16,185,129,0.1)', borderColor:'rgba(16,185,129,0.3)' } : { background:'#f8fafc', borderColor:'rgba(255,255,255,0.06)' }), marginBottom:18 }}>
                <div style={{ width:12, height:12, borderRadius:'50%', flexShrink:0, background:twoFAStatus?'#34d399':'#475569' }} />
                <p style={{ color:'#0f172a', fontSize:13, margin:0 }}>{twoFAStatus ? '✅ 2FA Aktif — Hesabınız korunuyor' : '❌ 2FA Pasif — Hesabınız korumasız'}</p>
              </div>

              {!twoFAStatus ? (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {!twoFASetup ? (
                    <button onClick={setup2FA} disabled={twoFALoading}
                      style={{ ...btn('linear-gradient(135deg,#1d4ed8,#3b82f6)'), alignSelf:'flex-start', opacity:twoFALoading?0.4:1 }}>
                      {twoFALoading ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <Shield size={14} />}
                      2FA Kurulumunu Başlat
                    </button>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                      <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:18, textAlign:'center' }}>
                        <p style={{ color:'#64748b', fontSize:13, marginBottom:12 }}>Google Authenticator ile bu QR kodu okutun</p>
                        <img src={twoFASetup.qrImageUrl} alt="2FA QR" style={{ width:160, height:160, borderRadius:12, background:'#fff', padding:8, margin:'0 auto', display:'block' }} />
                        <p style={{ color:'#475569', fontSize:11, marginTop:12 }}>
                          Manuel giriş: <code style={{ color:'#1e40af', background:'#eff6ff', padding:'2px 6px', borderRadius:4 }}>{twoFASetup.secret}</code>
                        </p>
                      </div>
                      <div>
                        <label style={fieldLabel}>{t('settings.dogrulama_kodu_6_haneli', 'Doğrulama Kodu (6 haneli)')}</label>
                        <div style={{ display:'flex', gap:8 }}>
                          <input value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                            placeholder="000000" maxLength={6}
                            style={{ ...input, flex:1, width:'auto', letterSpacing:'0.2em', textAlign:'center' }} />
                          <button onClick={verify2FA} disabled={twoFACode.length !== 6}
                            style={{ ...btn('linear-gradient(135deg,#065f46,#10b981)'), opacity:twoFACode.length !== 6?0.4:1, whiteSpace:'nowrap' }}>
                            Doğrula & Aktif Et
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <p style={{ color:'#64748b', fontSize:13, margin:0 }}>{t('settings.2faaposyi_devre_disi_birakma', '2FA&apos;yı devre dışı bırakmak için kodunuzu girin:')}</p>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000" maxLength={6}
                      style={{ ...input, flex:1, width:'auto', letterSpacing:'0.2em', textAlign:'center' }} />
                    <button onClick={disable2FA} disabled={twoFACode.length !== 6}
                      style={{ ...btn('linear-gradient(135deg,#7f1d1d,#ef4444)'), opacity:twoFACode.length !== 6?0.4:1, whiteSpace:'nowrap' }}>
                      Devre Dışı Bırak
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GOOGLE SHEETS */}
          {tab === 'sheets' && (
            <div style={card}>
              <div style={{ marginBottom:18 }}>
                <h2 style={{ ...cardTitle, fontSize:16, margin:'0 0 4px' }}>Google Sheets Sync</h2>
                <p style={{ color:'#64748b', fontSize:13, margin:0 }}>{t('settings.leadlerinizi_otomatik_olarak', 'Leadlerinizi otomatik olarak Google Sheets&apos;e aktarın')}</p>
              </div>

              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:14, marginBottom:18 }}>
                <p style={{ color:'#cbd5e1', fontSize:13, fontWeight:500, margin:'0 0 8px' }}>{t('settings.nasil_kullanilir', '📋 Nasıl Kullanılır?')}</p>
                <ol style={{ color:'#64748b', fontSize:12, paddingLeft:18, margin:0, display:'flex', flexDirection:'column', gap:4 }}>
                  <li>{t('settings.google_sheetsaposte_yeni_bir', 'Google Sheets&apos;te yeni bir sayfa oluşturun')}</li>
                  <li>{t('settings.urlaposden_spreadsheet_idapo', 'URL&apos;den Spreadsheet ID&apos;yi kopyalayın')}</li>
                  <li style={{ color:'#475569' }}>docs.google.com/spreadsheets/d/<span style={{ color:'#1e40af', fontFamily:'monospace' }}>ID_BURADA</span>/edit</li>
                  <li>{t('settings.asagiya_yapistirin_ve_kaydet', 'Aşağıya yapıştırın ve Kaydet&apos;e tıklayın')}</li>
                  <li>{t('settings.quotsimdi_aktarquot_ile_lead', '&quot;Şimdi Aktar&quot; ile leadleri aktarın')}</li>
                </ol>
              </div>

              <div style={{ marginBottom:18 }}>
                <label style={fieldLabel}>Google Sheets ID</label>
                <input value={sheetsId} onChange={e => setSheetsId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  style={{ ...input, fontFamily:'monospace' }} />
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={async () => {
                  setSheetsSaving(true)
                  try {
                    await api.post('/api/sheets/settings', { sheetId: sheetsId })
                    showMsg('success', 'Google Sheets ayarları kaydedildi')
                  } catch (e: any) { showMsg('error', e.message) }
                  finally { setSheetsSaving(false) }
                }} disabled={sheetsSaving || !sheetsId}
                  style={{ ...btn('linear-gradient(135deg,#065f46,#10b981)'), opacity:(sheetsSaving || !sheetsId)?0.4:1 }}>
                  {sheetsSaving ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                  Kaydet
                </button>
                <button onClick={async () => {
                  try {
                    const d = await api.post('/api/sheets/export-leads', { sheetId: sheetsId, sheetName: 'Leadler' })
                    showMsg('success', d.message)
                  } catch (e: any) { showMsg('error', e.message) }
                }} disabled={!sheetsId}
                  style={{ ...btn('linear-gradient(135deg,#1d4ed8,#3b82f6)'), opacity:!sheetsId?0.4:1 }}>
                  📤 Şimdi Aktar
                </button>
              </div>
            </div>
          )}

          {/* META CAPI */}
          {tab === 'meta-capi' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Header card */}
              <div style={{ background:'linear-gradient(135deg, #eff6ff, #eef2ff)', border:'1px solid #bfdbfe', borderRadius:16, padding:'20px 24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ width:44, height:44, background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📡</div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ color:'#0f172a', fontWeight:700, fontSize:15, margin:0 }}>Meta Dönüşüm API (CAPI)</h2>
                    <p style={{ color:'#6366f1', fontSize:12, margin:'2px 0 0' }}>Reklam algoritmasını eğit — lead kalitesini %44 artır, maliyeti %15 düşür</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, background:(capi.enabled && capi.hasToken)?'#dcfce7':'#fef3c7', border:(capi.enabled && capi.hasToken)?'1px solid #86efac':'1px solid #fde68a' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:(capi.enabled && capi.hasToken)?'#22c55e':'#f59e0b' }} />
                    <span style={{ fontSize:12, fontWeight:600, color:(capi.enabled && capi.hasToken)?'#166534':'#92400e' }}>
                      {capi.enabled && capi.hasToken ? 'Aktif' : 'Kurulum Gerekli'}
                    </span>
                  </div>
                </div>
                <p style={{ color:'#475569', fontSize:12, margin:0, lineHeight:1.6 }}>
                  CAPI, lead&apos;lerinizi &quot;Kazanıldı&quot; veya &quot;Kaybedildi&quot; olarak işaretlediğinizde Meta&apos;ya otomatik sinyal gönderir.
                  Böylece Meta algoritması gerçek müşterilerinizi öğrenir ve reklamlarınız doğru kişilere gösterilir.
                </p>
              </div>

              {/* ONE-CLICK AUTO SETUP / RECONNECT — always visible */}
              <div style={{ background: (capi.enabled && capi.hasToken) ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: (capi.enabled && capi.hasToken) ? '1px solid #86efac' : '2px solid #86efac', borderRadius:16, padding:'16px 24px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:20 }}>⚡</span>
                    <div style={{ flex:1 }}>
                      <h3 style={{ color:'#166534', fontSize:13, fontWeight:700, margin:0 }}>{capi.enabled && capi.hasToken ? 'Meta Bağlantısı' : 'Otomatik Kurulum (Önerilen)'}</h3>
                      <p style={{ color:'#15803d', fontSize:11, margin:'2px 0 0' }}>{capi.enabled && capi.hasToken ? 'Bağlantıyı yenilemek veya Pixel ID güncellemek için tekrar bağlanın' : 'Meta hesabınızı bağlayın — Pixel ID ve Token otomatik alınır'}</p>
                    </div>
                  </div>
                  <button onClick={async () => {
                    try {
                      const d = await api.get('/api/ads/oauth-url?source=settings')
                      if (d.url) window.location.href = d.url
                    } catch (e: any) { showMsg('error', 'OAuth URL alinamadi: ' + e.message) }
                  }} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 20px', background:'linear-gradient(135deg,#1877F2,#0866FF)', color:'#fff', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', justifyContent:'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    {capi.enabled && capi.hasToken ? 'Tekrar Bağlan / Pixel Güncelle' : 'Meta ile Bağlan ve CAPI\'yi Otomatik Kur'}
                  </button>
                  {!(capi.enabled && capi.hasToken) && <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
                    {['Pixel ID otomatik alınır', 'Access Token otomatik oluşur', 'CAPI aktifleşir'].map(t => (
                      <span key={t} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#166534', background:'#dcfce7', padding:'3px 8px', borderRadius:6 }}>✓ {t}</span>
                    ))}
                  </div>}
              </div>

              {/* Manual Configuration */}
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:0 }}>
                    {capi.enabled && capi.hasToken ? 'CAPI Ayarları' : 'Manuel Kurulum'}
                  </h3>
                  {!(capi.enabled && capi.hasToken) && <span style={{ fontSize:11, color:'#94a3b8' }}>Otomatik kurulum yapamıyorsanız</span>}
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={fieldLabel}>Pixel ID</label>
                  <input value={capi.pixelId} onChange={e => setCapi(p => ({ ...p, pixelId: e.target.value }))}
                    placeholder="123456789012345"
                    style={{ ...input, fontFamily:'monospace' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                    <span style={{ fontSize:11, color:'#64748b' }}>Pixel ID&apos;nizi nereden bulacağınız:</span>
                    <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
                      Events Manager →
                    </a>
                  </div>
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 12px', marginTop:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      {['Events Manager aç', 'Sol menüden Data Sources', 'Pixel seç', 'Settings', 'Pixel ID kopyala'].map((s, i) => (
                        <span key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
                          {i > 0 && <span style={{ color:'#cbd5e1' }}>→</span>}
                          <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'2px 6px', borderRadius:4, fontWeight:500 }}>{s}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={fieldLabel}>
                    Access Token{' '}
                    {capi.hasToken && <span style={{ color:'#047857', marginLeft:6 }}>✓ Kayıtlı</span>}
                  </label>
                  <input value={capiNewToken} onChange={e => setCapiNewToken(e.target.value)}
                    type="password"
                    placeholder={capi.hasToken ? '••••••••••••• (değiştirmek için yeni token girin)' : 'EAAxxxxxxx...'}
                    style={{ ...input, fontFamily:'monospace' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                    <span style={{ fontSize:11, color:'#64748b' }}>Token oluşturma:</span>
                    <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
                      Events Manager →
                    </a>
                  </div>
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 12px', marginTop:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      {['Events Manager aç', 'Pixel seç', 'Settings', 'Conversions API', 'Generate Access Token'].map((s, i) => (
                        <span key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
                          {i > 0 && <span style={{ color:'#cbd5e1' }}>→</span>}
                          <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'2px 6px', borderRadius:4, fontWeight:500 }}>{s}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={fieldLabel}>Test Event Code <span style={{ color:'#94a3b8', fontWeight:400 }}>(opsiyonel)</span></label>
                  <input value={capi.testCode} onChange={e => setCapi(p => ({ ...p, testCode: e.target.value }))}
                    placeholder="TEST12345"
                    style={{ ...input, fontFamily:'monospace' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                    <span style={{ fontSize:11, color:'#64748b' }}>Test kodu:</span>
                    <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
                      Events Manager → Test Events →
                    </a>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'10px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                  <div onClick={() => setCapi(p => ({ ...p, enabled: !p.enabled }))} style={{ width:44, height:24, borderRadius:12, background:capi.enabled?'#3b82f6':'#cbd5e1', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left:capi.enabled?22:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>CAPI {capi.enabled ? 'Aktif' : 'Pasif'}</span>
                    <p style={{ fontSize:11, color:'#64748b', margin:'1px 0 0' }}>Açıldığında lead durumu değiştiğinde otomatik Meta&apos;ya sinyal gönderilir</p>
                  </div>
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={async () => {
                    setCapiSaving(true)
                    try {
                      await api.post('/api/meta-capi/settings', {
                        pixelId:     capi.pixelId,
                        accessToken: capiNewToken || undefined,
                        testCode:    capi.testCode,
                        enabled:     capi.enabled,
                      })
                      if (capiNewToken) { setCapiNewToken(''); setCapi(p => ({ ...p, hasToken: true })) }
                      showMsg('success', 'Meta CAPI ayarları kaydedildi')
                    } catch (e: any) { showMsg('error', e.message) }
                    finally { setCapiSaving(false) }
                  }} disabled={capiSaving || !capi.pixelId}
                    style={{ ...btn('linear-gradient(135deg,#1d4ed8,#3b82f6)'), opacity:(capiSaving || !capi.pixelId)?0.4:1 }}>
                    {capiSaving ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                    Kaydet
                  </button>
                  <button onClick={async () => {
                    setCapiTesting(true)
                    try {
                      const d = await api.post('/api/meta-capi/test', {})
                      showMsg('success', d.message)
                      api.get('/api/meta-capi/events').then(d => setCapiEvents(d.events || [])).catch(() => {})
                    } catch (e: any) { showMsg('error', e.message) }
                    finally { setCapiTesting(false) }
                  }} disabled={capiTesting || !capi.hasToken}
                    style={{ ...btn('rgba(100,116,139,0.15)'), border:'1px solid #e2e8f0', color:'#475569', opacity:(capiTesting || !capi.hasToken)?0.4:1 }}>
                    {capiTesting ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <FlaskConical size={14} />}
                    Test Gönder
                  </button>
                </div>
              </div>

              {/* How it works — visual pipeline */}
              <div style={card}>
                <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>CAPI Nasıl Çalışır?</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { step: '1', label: 'Lead Geldi', desc: 'Meta\'ya "Lead" sinyali gönderilir', dotColor: '#3b82f6', event: 'Lead' },
                    { step: '2', label: 'İletişim Kuruldu', desc: '"Contact" sinyali — ilgilendiğini bildir', dotColor: '#06b6d4', event: 'Contact' },
                    { step: '3', label: 'Teklif Gönderildi', desc: '"InitiateCheckout" — ciddi müşteri sinyali', dotColor: '#f59e0b', event: 'InitiateCheckout' },
                    { step: '4', label: 'Pazarlık Aşaması', desc: '"AddToCart" — deal değeriyle birlikte', dotColor: '#8b5cf6', event: 'AddToCart' },
                    { step: '5', label: 'Satış Kapandı', desc: '"Purchase" — EN ÖNEMLİ sinyal, algoritma bunu öğrenir', dotColor: '#22c55e', event: 'Purchase' },
                  ].map(({ step, label, desc, dotColor, event }) => (
                    <div key={step} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#f8fafc', borderRadius:10, border:'1px solid #f1f5f9' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:dotColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>{step}</div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{label}</span>
                        <span style={{ fontSize:11, color:'#64748b', marginLeft:6 }}>{desc}</span>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, color:dotColor, background:`${dotColor}18`, padding:'2px 8px', borderRadius:6 }}>{event}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12, padding:'10px 14px', background:'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius:10, border:'1px solid #bbf7d0' }}>
                  <p style={{ color:'#166534', fontSize:11, margin:0, fontWeight:500 }}>
                    🔒 Tüm veriler SHA-256 ile şifrelenerek gönderilir. Kişisel bilgiler asla açık metin olarak iletilmez.
                  </p>
                </div>
              </div>

              {/* Audience export */}
              <div style={card}>
                <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:'0 0 6px' }}>Custom Audience Export</h3>
                <p style={{ color:'#64748b', fontSize:13, margin:'0 0 14px' }}>{t('settings.sha256_hashli_csv_meta_ads_m', 'SHA-256 hashli CSV — Meta Ads Manager&apos;a direkt yükleyin')}</p>
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  {[
                    { path: '/api/meta-capi/audience/won',  label: 'Kazanıldı Listesi',  bg: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' },
                    { path: '/api/meta-capi/audience/lost', label: 'Kaybedildi Listesi', bg: 'rgba(245,158,11,0.12)',  border: '1px solid rgba(245,158,11,0.3)',  color: '#fbbf24' },
                  ].map(({ path, label, bg, border, color }) => (
                    <button key={path} onClick={async () => {
                      const token = localStorage.getItem('token')
                      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
                      const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
                      const blob = await res.blob()
                      const url  = URL.createObjectURL(blob)
                      const a    = document.createElement('a')
                      a.href     = url
                      a.download = path.split('/').pop() + '.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    }} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:bg, border, color, borderRadius:10, fontSize:13, cursor:'pointer' }}>
                      <Download size={14} /> {label}
                    </button>
                  ))}
                </div>
                <p style={{ color:'#475569', fontSize:12, margin:0 }}>
                  Kazanıldı → mevcut müşterileri reklamlardan hariç tut veya Lookalike Audience oluştur
                  · Kaybedildi → retargeting kampanyaları için hedefle
                </p>
              </div>

              {/* Recent event log */}
              {capiEvents.length > 0 && (
                <div style={card}>
                  <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:'0 0 14px' }}>Son CAPI Eventleri</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:256, overflowY:'auto' }}>
                    {capiEvents.slice(0, 20).map((ev: any) => (
                      <div key={ev.id || ev.fired_at} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:ev.success?'#34d399':'#f87171', display:'inline-block' }} />
                        <span style={{ color:'#64748b', width:128, flexShrink:0, fontFamily:'monospace' }}>{ev.event_name}</span>
                        <span style={{ color:'#cbd5e1', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.leads?.company_name || ev.lead_id}</span>
                        <span style={{ color:'#475569', flexShrink:0 }}>{new Date(ev.fired_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GOOGLE ENHANCED CONVERSIONS */}
          {tab === 'google-capi' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Header */}
              <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:16, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <div style={{ width:40, height:40, background:'#1d4ed8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎯</div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ color:'#0f172a', fontWeight:600, fontSize:14, margin:0 }}>{t('settings.google_reklam_donusum_takibi', 'Google Reklam Dönüşüm Takibi')}</h2>
                    <p style={{ color:'#93c5fd', fontSize:12, margin:'2px 0 0' }}>{t('settings.hangi_google_reklaminin_must', 'Hangi Google reklamının müşteriye dönüştüğünü otomatik bildir')}</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:(gcapi.enabled && gcapi.hasConnection)?'#34d399':'#475569', display:'inline-block', boxShadow:(gcapi.enabled && gcapi.hasConnection)?'0 0 6px #34d399':undefined }} />
                    <span style={{ fontSize:12, color:(gcapi.enabled && gcapi.hasConnection)?'#34d399':'#475569' }}>
                      {gcapi.enabled && gcapi.hasConnection ? 'Aktif' : gcapi.hasConnection ? 'Bağlı (Pasif)' : 'Google bağlı değil'}
                    </span>
                  </div>
                </div>
                <p style={{ color:'#64748b', fontSize:12, margin:0 }}>
                  Sovlo&apos;da &quot;Kazanıldı&quot; olan her lead Google Ads&apos;e bildirilir.
                  Smart Bidding hangi reklamın müşteri getirdiğini öğrenir — daha düşük tıklama maliyeti, daha yüksek dönüşüm oranı.
                </p>
              </div>

              {/* Connection check */}
              {!gcapi.hasConnection && (
                <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ color:'#fbbf24', fontSize:13, fontWeight:500, margin:0 }}>{t('settings.google_ads_hesabi_bagli_degi', 'Google Ads Hesabı Bağlı Değil')}</p>
                    <p style={{ color:'rgba(251,191,36,0.6)', fontSize:12, margin:'3px 0 0' }}>{t('settings.once_google_ads_sayfasindan', 'Önce Google Ads sayfasından hesabınızı bağlayın')}</p>
                  </div>
                  <a href="/google-ads" style={{ padding:'8px 14px', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.4)', color:'#fbbf24', fontSize:13, borderRadius:10, textDecoration:'none' }}>
                    Google Ads →
                  </a>
                </div>
              )}

              {/* Configuration */}
              <div style={card}>
                <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:'0 0 14px' }}>{t('settings.donusum_ayarlari', 'Dönüşüm Ayarları')}</h3>

                <div style={{ marginBottom:12 }}>
                  <label style={fieldLabel}>{t('settings.google_ads_musteri_kimligi_c', 'Google Ads Müşteri Kimliği (Customer ID)')}</label>
                  <input value={gcapi.customerId} onChange={e => setGcapi(p => ({ ...p, customerId: e.target.value }))}
                    placeholder="123-456-7890"
                    style={{ ...input, fontFamily:'monospace' }} />
                  <p style={{ color:'#475569', fontSize:11, margin:'4px 0 0' }}>{t('settings.google_ads_hesap_ayarlari_mu', 'Google Ads → Hesap Ayarları → Müşteri Kimliği')}</p>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={fieldLabel}>{t('settings.donusum_islemi_kimligi_conve', 'Dönüşüm İşlemi Kimliği (Conversion Action ID)')}</label>
                  <input value={gcapi.conversionActionId} onChange={e => setGcapi(p => ({ ...p, conversionActionId: e.target.value }))}
                    placeholder="123456789"
                    style={{ ...input, fontFamily:'monospace' }} />
                  <p style={{ color:'#475569', fontSize:11, margin:'4px 0 0' }}>{t('settings.google_ads_araclar_donusumle', 'Google Ads → Araçlar → Dönüşümler → Dönüşüm İşlemi → Kimlik')}</p>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <div onClick={() => setGcapi(p => ({ ...p, enabled: !p.enabled }))} style={{ width:40, height:22, borderRadius:11, background:gcapi.enabled?'#3b82f6':'rgba(100,116,139,0.3)', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                    <div style={{ position:'absolute', top:3, left:gcapi.enabled?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                  </div>
                  <span style={{ color:'#cbd5e1', fontSize:13 }}>Google Enhanced Conversions Aktif</span>
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={async () => {
                    setGcapiSaving(true)
                    try {
                      await api.post('/api/google-capi/settings', {
                        customerId:         gcapi.customerId,
                        conversionActionId: gcapi.conversionActionId,
                        enabled:            gcapi.enabled,
                      })
                      showMsg('success', 'Google dönüşüm ayarları kaydedildi')
                    } catch (e: any) { showMsg('error', e.message) }
                    finally { setGcapiSaving(false) }
                  }} disabled={gcapiSaving || !gcapi.customerId || !gcapi.conversionActionId}
                    style={{ ...btn('linear-gradient(135deg,#1d4ed8,#3b82f6)'), opacity:(gcapiSaving || !gcapi.customerId || !gcapi.conversionActionId)?0.4:1 }}>
                    {gcapiSaving ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                    Kaydet
                  </button>
                  <button onClick={async () => {
                    setGcapiTesting(true)
                    try {
                      const d = await api.post('/api/google-capi/test', {})
                      showMsg('success', d.message)
                      api.get('/api/google-capi/events').then(d => setGcapiEvents(d.events || [])).catch(() => {})
                    } catch (e: any) { showMsg('error', e.message) }
                    finally { setGcapiTesting(false) }
                  }} disabled={gcapiTesting || !gcapi.hasConnection || !gcapi.enabled}
                    style={{ ...btn('rgba(100,116,139,0.25)'), border:'1px solid #e2e8f0', opacity:(gcapiTesting || !gcapi.hasConnection || !gcapi.enabled)?0.4:1 }}>
                    {gcapiTesting ? <RefreshCw size={14} style={{ animation:'settings-spin 1s linear infinite' }} /> : <FlaskConical size={14} />}
                    Test Gönder
                  </button>
                </div>
              </div>

              {/* How it works */}
              <div style={card}>
                <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:'0 0 14px' }}>{t('settings.nasil_calisir', 'Nasıl Çalışır?')}</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { step: '1', label: 'Lead Reklamdan Geldi', desc: 'Google reklamına tıklayan kişi Sovlo\'ya düşer (gclid otomatik yakalanır)', dotColor: '#60a5fa' },
                    { step: '2', label: 'İletişim Kuruldu', desc: 'Mesaj veya arama yapıldığında Google\'a "Lead" sinyali gönderilir', dotColor: '#22d3ee' },
                    { step: '3', label: 'Satış Kapandı', desc: 'Lead "Kazanıldı" olunca Google\'a "Dönüşüm" bildirimi gider — deal değeri ile birlikte', dotColor: '#34d399' },
                    { step: '4', label: 'Smart Bidding Öğrenir', desc: 'Google algoritması hangi aramalar/hedef kitleler müşteri getirdi, sonraki reklamlarda daha iyi hedefleme yapar', dotColor: '#fbbf24' },
                  ].map(({ step, label, desc, dotColor }) => (
                    <div key={step} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <div style={{ width:20, height:20, borderRadius:'50%', background:dotColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#ffffff', flexShrink:0, marginTop:1 }}>{step}</div>
                      <div>
                        <span style={{ fontSize:13, fontWeight:500, color:'#0f172a' }}>{label}</span>
                        <p style={{ color:'#64748b', fontSize:12, margin:'2px 0 0' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14, padding:'10px 12px', background:'#f8fafc', borderRadius:10 }}>
                  <p style={{ color:'#64748b', fontSize:12, margin:0 }}>
                    Tüm veriler şifrelenerek (SHA-256) Google&apos;a iletilir. İsim, telefon ve e-posta şifrelenmeden gönderilmez.
                    Customer Match için Kazanıldı listesini Google Ads&apos;e yükleyebilirsiniz.
                  </p>
                </div>
              </div>

              {/* Customer Match export */}
              <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:'0 0 4px' }}>Customer Match Export</h3>
                  <p style={{ color:'#64748b', fontSize:13, margin:0 }}>{t('settings.kazanildi_listesi_google_ads', 'Kazanıldı listesi → Google Ads Customer Match olarak yükle')}</p>
                </div>
                <button onClick={async () => {
                  const token = localStorage.getItem('token')
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
                  const res = await fetch(`${API_URL}/api/google-capi/audience/won`, { headers: { Authorization: `Bearer ${token}` } })
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'google-customer-match.csv'; a.click()
                  URL.revokeObjectURL(url)
                }} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', color:'#047857', borderRadius:10, fontSize:13, cursor:'pointer' }}>
                  <Download size={14} /> İndir
                </button>
              </div>

              {/* Event log */}
              {gcapiEvents.length > 0 && (
                <div style={card}>
                  <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:600, margin:'0 0 14px' }}>{t('settings.son_gonderilen_donusumler', 'Son Gönderilen Dönüşümler')}</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:256, overflowY:'auto' }}>
                    {gcapiEvents.slice(0, 20).map((ev: any) => (
                      <div key={ev.id || ev.fired_at} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:ev.success?'#34d399':'#f87171', display:'inline-block' }} />
                        <span style={{ color:'#64748b', width:128, flexShrink:0, fontFamily:'monospace' }}>{ev.event_name}</span>
                        <span style={{ color:'#cbd5e1', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.leads?.company_name || ev.lead_id}</span>
                        <span style={{ color:'#475569', flexShrink:0 }}>{new Date(ev.fired_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes settings-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
