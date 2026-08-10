'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw, Star, QrCode, Wifi, WifiOff, Settings2, ShieldCheck, Phone, MessageCircle, CheckCircle, ExternalLink, Copy, ChevronRight, AlertCircle } from 'lucide-react'

const card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as const
const tx1 = '#0f172a', tx2 = '#64748b', tx3 = '#94a3b8'
const accentGreen = '#22c55e'
const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', color: tx1, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

function getHealthColor(sentToday: number, limit: number) {
  const pct = sentToday / limit
  if (pct > 0.85) return '#ef4444'
  if (pct > 0.55) return '#f59e0b'
  return '#10b981'
}
function getBanRisk(sentToday: number, limit: number) {
  const pct = sentToday / limit
  if (pct > 0.85) return { label: 'Yüksek Risk', color: '#ef4444', bg: '#fef2f2' }
  if (pct > 0.55) return { label: 'Orta Risk', color: '#f59e0b', bg: '#fffbeb' }
  return { label: 'Güvenli', color: '#10b981', bg: '#ecfdf5' }
}

const STEPS = [
  {
    num: 1,
    title: 'green-api.com\'a Kayıt Ol',
    desc: 'Ücretsiz hesap oluştur (sadece e-posta + şifre)',
    action: { label: 'green-api.com\'a Git →', url: 'https://console.green-api.com/instanceList' },
  },
  {
    num: 2,
    title: 'Instance Oluştur',
    desc: 'Kayıt sonrası sol menü → "Instances" → yeşil "+" butonuna tıkla → WhatsApp seç',
    action: null,
  },
  {
    num: 3,
    title: 'Instance Bilgilerini Kopyala',
    desc: 'Instance sayfasında: idInstance (sayı) ve apiTokenInstance (uzun kod) görünür — ikisini kopyala',
    action: null,
  },
]

export default function WANumbersPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const returnTo = searchParams.get('returnTo')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [step, setStep] = useState<'guide' | 'form' | 'qr'>('guide')
  const [instanceId, setInstanceId] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [dailyLimit, setDailyLimit] = useState(100)
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [reconnectQr, setReconnectQr] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const qrPollRef = useRef<any>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 6000)
  }

  const load = async () => {
    setLoading(true)
    try { const data = await api.get('/api/wa-numbers/stats'); setStats(data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load(); return () => { if (qrPollRef.current) clearInterval(qrPollRef.current) } }, [])

  const startPolling = (onSuccess: () => void) => {
    if (qrPollRef.current) clearInterval(qrPollRef.current)
    qrPollRef.current = setInterval(async () => {
      try {
        const status = await api.get('/api/wa-numbers/qr-status')
        if (status.connected) {
          clearInterval(qrPollRef.current)
          setQrCode(null); setReconnectQr(null); setShowAdd(false); setStep('guide')
          if (returnTo) {
            showMsg('success', 'WhatsApp bağlandı! Yönlendiriliyor...')
            setTimeout(() => router.push(returnTo), 1500)
          } else {
            showMsg('success', '✅ WhatsApp başarıyla bağlandı!')
            load()
          }
          onSuccess()
        } else if (status.qr) {
          setQrCode(status.qr)
        }
      } catch {}
    }, 5000)
    setTimeout(() => {
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current)
        setQrCode(null)
        showMsg('error', 'QR süresi doldu — tekrar deneyin')
      }
    }, 120000)
  }

  const connectManual = async () => {
    if (!instanceId.trim() || !apiToken.trim()) {
      showMsg('error', 'Instance ID ve API Token zorunlu'); return
    }
    setConnecting(true); setQrCode(null)
    try {
      const data = await api.post('/api/wa-numbers/connect-manual', {
        instanceId: instanceId.trim(),
        apiToken: apiToken.trim(),
        displayName: displayName.trim() || undefined,
        dailyLimit,
      })
      if (data.status === 'connected') {
        setShowAdd(false); setStep('guide')
        showMsg('success', `✅ Bağlandı! Numara: ${data.phone || ''}`)
        load()
      } else if (data.qr) {
        setQrCode(data.qr)
        setStep('qr')
        startPolling(() => {})
      } else {
        setStep('qr')
        startPolling(() => {})
        showMsg('success', 'Bağlantı kuruldu, QR bekleniyor...')
      }
    } catch (e: any) {
      showMsg('error', e.message || 'Bağlantı kurulamadı — Instance ID ve Token\'ı kontrol edin')
    }
    setConnecting(false)
  }

  const reconnectNumber = async (id: string) => {
    setReconnectingId(id); setReconnectQr(null)
    try {
      const data = await api.post(`/api/wa-numbers/${id}/reconnect`, {})
      if (data.qr) {
        setReconnectQr(data.qr)
        startPolling(() => setReconnectQr(null))
      } else {
        showMsg('error', 'QR oluşturulamadı — numarayı yeniden bağlamayı deneyin')
      }
    } catch (e: any) { showMsg('error', e.message) }
    setReconnectingId(null)
  }

  const disconnectNumber = async (id: string) => {
    await api.post(`/api/wa-numbers/${id}/disconnect`, {})
    showMsg('success', 'Bağlantı kesildi'); load()
  }
  const setPrimary = async (id: string) => {
    await api.patch(`/api/wa-numbers/${id}`, { isPrimary: true })
    showMsg('success', 'Birincil numara ayarlandı'); load()
  }
  const deleteNumber = async (id: string) => {
    if (!confirm('Numara silinsin mi?')) return
    await api.delete(`/api/wa-numbers/${id}`)
    showMsg('success', 'Numara silindi'); load()
  }
  const updateLimit = async (id: string, limit: number) => {
    await api.patch(`/api/wa-numbers/${id}`, { dailyLimit: limit })
    setEditId(null); showMsg('success', 'Limit güncellendi'); load()
  }

  const numbers = stats?.numbers || []
  const connected = numbers.filter((n: any) => n.status === 'connected').length

  return (
    <div style={{ padding: 0 }}>
      {/* HERO */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ ...card, padding: '22px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={24} style={{ color: accentGreen }} />
          </div>
          <div>
            <h1 style={{ color: tx1, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>WhatsApp Numaralar</h1>
            <p style={{ color: tx2, fontSize: 12, margin: 0 }}>Kendi WhatsApp numaranızı bağlayın — ücretsiz</p>
          </div>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setStep('guide'); setQrCode(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#14532d,#22c55e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> Numara Ekle
        </button>
      </div>

      {returnTo && (
        <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 11, fontSize: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={13} /> WhatsApp numaranızı bağladıktan sonra otomatik olarak önceki sayfaya yönlendirileceksiniz.
        </div>
      )}
      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 11, fontSize: 12, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {msg.text}
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Toplam Numara', value: numbers.length, color: '#64748b', Icon: Phone },
          { label: 'Bağlı', value: connected, color: accentGreen, Icon: Wifi },
          { label: 'Bugün Gönderilen', value: stats?.usedToday || 0, color: '#2563eb', Icon: MessageCircle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p style={{ color: tx1, fontSize: 20, fontWeight: 800, margin: 0 }}>{value}</p>
              <p style={{ color: tx3, fontSize: 10, margin: 0 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* RECONNECT QR */}
      {reconnectQr && (
        <div style={{ ...card, padding: 20, marginBottom: 18, background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
          <h3 style={{ color: tx1, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <QrCode size={16} style={{ color: accentGreen }} /> WhatsApp ile QR'ı Okutun
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src={reconnectQr} alt="QR" style={{ width: 220, height: 220, borderRadius: 14, border: '4px solid #a7f3d0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={12} style={{ color: accentGreen, animation: 'waSpin 2s linear infinite' }} />
              <p style={{ color: accentGreen, fontSize: 12, fontWeight: 600, margin: 0 }}>Bekleniyor... (her 5sn kontrol)</p>
            </div>
          </div>
        </div>
      )}

      {/* ADD FLOW */}
      {showAdd && (
        <div style={{ ...card, padding: 24, marginBottom: 18 }}>

          {/* STEP: GUIDE */}
          {step === 'guide' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={20} style={{ color: accentGreen }} />
                </div>
                <div>
                  <h3 style={{ color: tx1, fontSize: 15, fontWeight: 800, margin: 0 }}>WhatsApp Numaranı Bağla</h3>
                  <p style={{ color: tx2, fontSize: 11, margin: 0 }}>Kendi numaranı ücretsiz olarak ekle — 3 kolay adım</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {STEPS.map((s, i) => (
                  <div key={s.num} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, color: accentGreen, fontSize: 14 }}>
                      {s.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: '0 0 3px' }}>{s.title}</p>
                      <p style={{ color: tx2, fontSize: 11, margin: s.action ? '0 0 8px' : 0, lineHeight: 1.5 }}>{s.desc}</p>
                      {s.action && (
                        <a href={s.action.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: accentGreen, color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                          <ExternalLink size={11} /> {s.action.label}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 11, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#92400e', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
                  Green API ücretsiz hesapta <strong>1 numara</strong> bağlayabilirsiniz. Birden fazla numara için ücretli plana geçmeniz gerekir (~$10/ay).
                </p>
              </div>

              <button onClick={() => setStep('form')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#14532d,#22c55e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Bilgileri Girdim, Devam Et <ChevronRight size={14} />
              </button>
            </>
          )}

          {/* STEP: FORM */}
          {step === 'form' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button onClick={() => setStep('guide')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: tx2, cursor: 'pointer', fontSize: 12 }}>← Geri</button>
                <h3 style={{ color: tx1, fontSize: 15, fontWeight: 800, margin: 0 }}>Instance Bilgilerini Gir</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ color: tx2, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                    Instance ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    value={instanceId}
                    onChange={e => setInstanceId(e.target.value)}
                    placeholder="örn: 710722705416"
                    style={inputStyle}
                  />
                  <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0' }}>green-api.com → Instance sayfası → "idInstance" alanı</p>
                </div>
                <div>
                  <label style={{ color: tx2, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                    API Token <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    value={apiToken}
                    onChange={e => setApiToken(e.target.value)}
                    placeholder="örn: abc123def456..."
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }}
                  />
                  <p style={{ color: tx3, fontSize: 10, margin: '4px 0 0' }}>Instance sayfası → "apiTokenInstance" alanı</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
                  <div>
                    <label style={{ color: tx2, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Numara Adı (opsiyonel)</label>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="örn: Satış Hattı" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: tx2, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Günlük Mesaj Limiti</label>
                    <input type="number" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} min={10} max={500} style={inputStyle} />
                  </div>
                </div>
              </div>

              <button onClick={connectManual} disabled={connecting}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, border: 'none', background: connecting ? '#f1f5f9' : 'linear-gradient(135deg,#14532d,#22c55e)', color: connecting ? tx3 : '#fff', fontSize: 13, fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer' }}>
                {connecting ? <RefreshCw size={14} style={{ animation: 'waSpin 1s linear infinite' }} /> : <QrCode size={14} />}
                {connecting ? 'Bağlanıyor...' : 'Bağla & QR Göster'}
              </button>
            </>
          )}

          {/* STEP: QR */}
          {step === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
              <h3 style={{ color: tx1, fontSize: 15, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={18} style={{ color: accentGreen }} /> WhatsApp ile QR'ı Okutun
              </h3>
              {qrCode ? (
                <img src={qrCode} alt="QR" style={{ width: 240, height: 240, borderRadius: 16, border: '4px solid #a7f3d0' }} />
              ) : (
                <div style={{ width: 240, height: 240, borderRadius: 16, border: '2px dashed #a7f3d0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f0fdf4' }}>
                  <RefreshCw size={24} style={{ color: accentGreen, animation: 'waSpin 2s linear infinite' }} />
                  <p style={{ color: accentGreen, fontSize: 12, margin: 0 }}>QR yükleniyor...</p>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} style={{ color: accentGreen, animation: 'waSpin 2s linear infinite' }} />
                <p style={{ color: accentGreen, fontSize: 12, fontWeight: 600, margin: 0 }}>Bağlantı bekleniyor... (her 5sn otomatik kontrol)</p>
              </div>
              <p style={{ color: tx3, fontSize: 10, margin: 0 }}>WhatsApp → Bağlı Cihazlar → Cihaz Ekle → QR tara</p>
              <p style={{ color: tx3, fontSize: 10, margin: 0 }}>QR 2 dakika geçerlidir</p>
            </div>
          )}
        </div>
      )}

      {/* NUMBERS LIST */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', height: 100, alignItems: 'center' }}>
          <RefreshCw size={20} style={{ color: tx3, animation: 'waSpin 1s linear infinite' }} />
        </div>
      ) : numbers.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <Phone size={32} style={{ color: tx3, margin: '0 auto 12px' }} />
          <p style={{ color: tx1, fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Henüz numara yok</p>
          <p style={{ color: tx2, fontSize: 12, margin: '0 0 16px' }}>Yukarıdaki "Numara Ekle" butonuyla WhatsApp hattınızı bağlayın</p>
          <button onClick={() => { setShowAdd(true); setStep('guide') }}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#14532d,#22c55e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Numara Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {numbers.map((num: any) => {
            const banRisk = getBanRisk(num.sent_today || 0, num.daily_limit || 100)
            const healthColor = getHealthColor(num.sent_today || 0, num.daily_limit || 100)
            const pct = Math.min(((num.sent_today || 0) / (num.daily_limit || 100)) * 100, 100)
            return (
              <div key={num.id} style={{ ...card, padding: '16px 18px', borderLeft: num.is_primary ? '4px solid #22c55e' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: num.status === 'connected' ? '#ecfdf5' : '#f8fafc', border: `1px solid ${num.status === 'connected' ? '#a7f3d0' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {num.status === 'connected' ? <Wifi size={18} color="#22c55e" /> : <WifiOff size={18} color="#94a3b8" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: 0 }}>{num.display_name || 'WhatsApp Hattı'}</p>
                      {num.is_primary && <span style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>⭐ Birincil</span>}
                      <span style={{ background: banRisk.bg, border: `1px solid ${banRisk.color}30`, color: banRisk.color, fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{banRisk.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: tx3, flexWrap: 'wrap' }}>
                      {num.phone_number && <span>📱 {num.phone_number}</span>}
                      <span style={{ color: num.status === 'connected' ? '#059669' : tx3 }}>{num.status === 'connected' ? '● Bağlı' : '○ Bağlı Değil'}</span>
                    </div>
                  </div>
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: tx3, fontSize: 9 }}>Bugün</span>
                      <span style={{ color: healthColor, fontSize: 9, fontWeight: 700 }}>{num.sent_today || 0}/{num.daily_limit || 100}</span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: healthColor, borderRadius: 3, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!num.is_primary && num.status === 'connected' && (
                      <button onClick={() => setPrimary(num.id)} title="Birincil Yap" style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', cursor: 'pointer' }}><Star size={12} /></button>
                    )}
                    <button onClick={() => setEditId(editId === num.id ? null : num.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: tx2, cursor: 'pointer' }}><Settings2 size={12} /></button>
                    {num.status === 'connected' ? (
                      <button onClick={() => disconnectNumber(num.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}><WifiOff size={12} /></button>
                    ) : (
                      <>
                        <button onClick={() => reconnectNumber(num.id)} disabled={reconnectingId === num.id}
                          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#059669', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {reconnectingId === num.id ? <RefreshCw size={11} style={{ animation: 'waSpin 1s linear infinite' }} /> : <Wifi size={11} />}
                          Bağla
                        </button>
                        <button onClick={() => deleteNumber(num.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
                {editId === num.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: tx2, fontSize: 11 }}>Günlük limit:</span>
                    <input type="number" defaultValue={num.daily_limit} id={`lim-${num.id}`} min={10} max={500}
                      style={{ ...inputStyle, width: 70, padding: '6px 10px', fontSize: 12 }} />
                    <button onClick={() => { const el = document.getElementById(`lim-${num.id}`) as HTMLInputElement; updateLimit(num.id, parseInt(el.value)) }}
                      style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: accentGreen, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Kaydet</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ANTI-BAN GUIDE */}
      <div style={{ ...card, padding: '16px 18px', marginTop: 16 }}>
        <p style={{ color: tx1, fontSize: 13, fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} style={{ color: accentGreen }} /> Anti-Ban Stratejisi
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 8 }}>
          {[
            { icon: '📊', text: 'Numara başına günde max 100-150 mesaj', color: '#0d9488' },
            { icon: '⏱️', text: 'Mesajlar arası 15-45sn otomatik bekleme', color: '#059669' },
            { icon: '🔄', text: 'Çoklu numara arasında akıllı rotasyon', color: '#7c3aed' },
            { icon: '🕐', text: '09:00-20:00 dışında gönderim engelli', color: '#2563eb' },
          ].map(tip => (
            <div key={tip.text} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: `${tip.color}06`, border: `1px solid ${tip.color}15`, borderRadius: 9 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{tip.icon}</span>
              <p style={{ color: tx1, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes waSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
