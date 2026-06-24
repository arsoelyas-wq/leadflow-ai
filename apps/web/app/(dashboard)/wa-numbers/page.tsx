'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw, Star, QrCode, Wifi, WifiOff, Settings2, ShieldCheck, Phone, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react'

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

export default function WANumbersPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [dailyLimit, setDailyLimit] = useState(100)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const qrPollRef = useRef<any>(null)

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    setLoading(true)
    try { const data = await api.get('/api/wa-numbers/stats'); setStats(data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load(); return () => { if (qrPollRef.current) clearInterval(qrPollRef.current) } }, [])

  const connectNumber = async () => {
    setConnecting(true); setQrCode(null)
    try {
      const data = await api.post('/api/wa-numbers/connect', { displayName, dailyLimit })
      if (data.qr) {
        setQrCode(data.qr)
        // Start QR polling every 5 seconds
        qrPollRef.current = setInterval(async () => {
          try {
            const status = await api.get('/api/wa-numbers/qr-status')
            if (status.connected) {
              clearInterval(qrPollRef.current)
              setQrCode(null); setShowAdd(false)
              showMsg('success', 'WhatsApp bağlandı!')
              load()
            } else if (status.qr && status.qr !== qrCode) {
              setQrCode(status.qr)
            }
          } catch {}
        }, 5000)
        // Stop polling after 2 minutes
        setTimeout(() => { if (qrPollRef.current) { clearInterval(qrPollRef.current); setQrCode(null); showMsg('error', 'QR süresi doldu — tekrar deneyin') } }, 120000)
      } else if (data.status === 'connected') {
        showMsg('success', 'Bağlandı!'); setShowAdd(false); load()
      } else {
        showMsg('error', 'QR oluşturulamadı — Ayarlar > WhatsApp bağlantısını kontrol edin')
      }
    } catch (e: any) { showMsg('error', e.message) }
    setConnecting(false)
  }

  const disconnectNumber = async (id: string) => {
    await api.post(`/api/wa-numbers/${id}/disconnect`, {}); showMsg('success', 'Bağlantı kesildi'); load()
  }
  const setPrimary = async (id: string) => {
    await api.patch(`/api/wa-numbers/${id}`, { isPrimary: true }); showMsg('success', 'Birincil numara ayarlandı'); load()
  }
  const deleteNumber = async (id: string) => {
    if (!confirm('Numara silinsin mi?')) return
    await api.delete(`/api/wa-numbers/${id}`); showMsg('success', 'Numara silindi'); load()
  }
  const updateLimit = async (id: string, limit: number) => {
    await api.patch(`/api/wa-numbers/${id}`, { dailyLimit: limit }); setEditId(null); showMsg('success', 'Limit güncellendi'); load()
  }

  const numbers = stats?.numbers || []
  const connected = numbers.filter((n: any) => n.status === 'connected').length
  const totalCapacity = stats?.totalCapacity || 0
  const usedToday = stats?.usedToday || 0

  return (
    <div style={{ padding: 0 }}>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '22px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={24} style={{ color: accentGreen }} />
          </div>
          <div>
            <h1 style={{ color: tx1, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>WhatsApp Numaralar</h1>
            <p style={{ color: tx2, fontSize: 12, margin: 0 }}>Çoklu numara yönetimi — ban riskini dağıt, kapasiteyi artır</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#14532d,#22c55e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={14} /> Numara Ekle
        </button>
      </div>

      {msg && <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 11, fontSize: 12, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: msg.type === 'success' ? '#059669' : '#dc2626' }}>{msg.text}</div>}

      {/* ── STATS ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Toplam', value: numbers.length, color: '#64748b', Icon: Phone },
          { label: 'Bağlı', value: connected, color: accentGreen, Icon: Wifi },
          { label: 'Günlük Kapasite', value: totalCapacity, color: '#2563eb', Icon: MessageCircle },
          { label: 'Bugün Gönderilen', value: usedToday, color: usedToday > totalCapacity * 0.8 ? '#ef4444' : '#f59e0b', Icon: CheckCircle },
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

      {/* ── ADD FORM ──────────────────────────────────────────── */}
      {showAdd && (
        <div style={{ ...card, padding: 20, marginBottom: 18 }}>
          <h3 style={{ color: tx1, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <QrCode size={16} style={{ color: accentGreen }} /> Yeni Numara Bağla
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>İsim (opsiyonel)</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="örn: Satış Hattı 1" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: tx2, fontSize: 11, display: 'block', marginBottom: 5 }}>Günlük Mesaj Limiti</label>
              <input type="number" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} min={10} max={500} style={inputStyle} />
            </div>
          </div>

          {qrCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, background: '#f0fdf4', borderRadius: 14, border: '1px solid #a7f3d0' }}>
              <p style={{ color: tx1, fontWeight: 700, fontSize: 14, margin: 0 }}>📱 WhatsApp ile QR'ı okutun</p>
              <img src={qrCode} alt="QR" style={{ width: 220, height: 220, borderRadius: 14, border: '4px solid #a7f3d0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} style={{ color: accentGreen, animation: 'waSpin 2s linear infinite' }} />
                <p style={{ color: accentGreen, fontSize: 12, fontWeight: 600, margin: 0 }}>Bağlantı bekleniyor... (otomatik kontrol her 5sn)</p>
              </div>
              <p style={{ color: tx3, fontSize: 10, margin: 0 }}>QR 2 dakika geçerlidir</p>
            </div>
          ) : (
            <button onClick={connectNumber} disabled={connecting}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 11, border: 'none', background: connecting ? '#f1f5f9' : 'linear-gradient(135deg,#14532d,#22c55e)', color: connecting ? tx3 : '#fff', fontSize: 13, fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer' }}>
              {connecting ? <RefreshCw size={14} style={{ animation: 'waSpin 1s linear infinite' }} /> : <QrCode size={14} />}
              {connecting ? 'QR oluşturuluyor...' : 'QR Oluştur & Bağla'}
            </button>
          )}
        </div>
      )}

      {/* ── NUMBERS LIST ──────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', height: 100, alignItems: 'center' }}><RefreshCw size={20} style={{ color: tx3, animation: 'waSpin 1s linear infinite' }} /></div>
      ) : numbers.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <Phone size={32} style={{ color: tx3, margin: '0 auto 12px' }} />
          <p style={{ color: tx2, fontSize: 13, margin: 0 }}>Henüz numara yok — "Numara Ekle" ile başlayın</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {numbers.map((num: any) => {
            const banRisk = getBanRisk(num.sent_today || 0, num.daily_limit || 100)
            const healthColor = getHealthColor(num.sent_today || 0, num.daily_limit || 100)
            const pct = Math.min(((num.sent_today || 0) / (num.daily_limit || 100)) * 100, 100)
            return (
              <div key={num.id} style={{ ...card, padding: '16px 18px', borderLeft: num.is_primary ? '4px solid #22c55e' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: num.status === 'connected' ? '#ecfdf5' : '#f8fafc', border: `1px solid ${num.status === 'connected' ? '#a7f3d0' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {num.status === 'connected' ? <Wifi size={18} color="#22c55e" /> : <WifiOff size={18} color="#94a3b8" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p style={{ color: tx1, fontWeight: 700, fontSize: 13, margin: 0 }}>{num.display_name || 'WhatsApp Hattı'}</p>
                      {num.is_primary && <span style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>⭐ Birincil</span>}
                      <span style={{ background: banRisk.bg, border: `1px solid ${banRisk.color}30`, color: banRisk.color, fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{banRisk.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: tx3 }}>
                      {num.phone_number && <span>{num.phone_number}</span>}
                      <span style={{ color: num.status === 'connected' ? '#059669' : tx3 }}>{num.status === 'connected' ? '● Bağlı' : '○ Bağlı Değil'}</span>
                    </div>
                  </div>
                  <div style={{ width: 110, flexShrink: 0 }}>
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
                      <button onClick={() => deleteNumber(num.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={12} /></button>
                    )}
                  </div>
                </div>
                {editId === num.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: tx2, fontSize: 11 }}>Günlük limit:</span>
                    <input type="number" defaultValue={num.daily_limit} id={`lim-${num.id}`} min={10} max={500} style={{ ...inputStyle, width: 70, padding: '6px 10px', fontSize: 12 }} />
                    <button onClick={() => { const el = document.getElementById(`lim-${num.id}`) as HTMLInputElement; updateLimit(num.id, parseInt(el.value)) }}
                      style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: accentGreen, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Kaydet</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── ANTI-BAN GUIDE ────────────────────────────────────── */}
      <div style={{ ...card, padding: '16px 18px', marginTop: 16 }}>
        <p style={{ color: tx1, fontSize: 13, fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} style={{ color: accentGreen }} /> Anti-Ban Stratejisi</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
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
