'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw, Star, QrCode, Wifi, WifiOff, Settings2, ShieldCheck } from 'lucide-react'

// ── PHONE CONSTELLATION — rotating phone nodes in orbit ───────────────────────
function PhoneConstellation({ size = 100, connected = 0, total = 0 }: { size?: number; connected?: number; total?: number }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), 45)
    return () => clearInterval(t)
  }, [mounted])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const rot = tick * 0.5
  const nodes = Math.max(total, 3)
  const phoneNodes = Array.from({ length: nodes }, (_, i) => {
    const a = (i * (360 / nodes) + rot) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.7, y: cx + Math.sin(a) * s * 0.7, connected: i < connected }
  })

  // Signal rings from connected nodes
  const signalR = s * 0.12 + Math.sin(tick * 0.15) * s * 0.03

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`pcGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,197,94,0)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0.14)" />
          </radialGradient>
          <radialGradient id={`pcHub${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="40%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#14532d" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#pcGlow${s})`} />
        {[0.52, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke="rgba(34,197,94,0.1)" strokeWidth={0.8}
            strokeDasharray="4 7" style={{ animation: `pc-ring ${9+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        {phoneNodes.map((node, i) => (
          <g key={i}>
            <line x1={cx} y1={cx} x2={node.x} y2={node.y} stroke={node.connected ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.15)'} strokeWidth={1} strokeDasharray="3 5" />
            {node.connected && (
              <circle cx={node.x} cy={node.y} r={signalR} fill="none" stroke="rgba(34,197,94,0.3)" strokeWidth={1} />
            )}
            <rect x={node.x - 9} y={node.y - 13} width={18} height={26} rx={4}
              fill={node.connected ? '#22c55e' : '#1e293b'} stroke={node.connected ? 'rgba(34,197,94,0.5)' : 'rgba(100,116,139,0.3)'} strokeWidth={1.5}
              style={{ filter: node.connected ? 'drop-shadow(0 0 6px #22c55e99)' : 'none' }} />
            {node.connected && <circle cx={node.x} cy={node.y + 8} r={2} fill="rgba(255,255,255,0.6)" />}
          </g>
        ))}
        <circle cx={cx} cy={cx} r={s * 0.36} fill={`url(#pcHub${s})`} style={{ filter: 'drop-shadow(0 0 14px #22c55e99)' }} />
        <text x={cx} y={cx - 4} fill="white" fontSize={s * 0.18} textAnchor="middle" dominantBaseline="middle" fontWeight="900">{connected}</text>
        <text x={cx} y={cx + s * 0.14} fill="rgba(255,255,255,0.6)" fontSize={s * 0.07} textAnchor="middle">BAĞLI</text>
      </svg>
      <style>{`@keyframes pc-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Health score for a number
function getHealthColor(sentToday: number, limit: number) {
  const pct = sentToday / limit
  if (pct > 0.85) return '#ef4444'
  if (pct > 0.55) return '#f59e0b'
  return '#10b981'
}

function getBanRisk(sentToday: number, limit: number) {
  const pct = sentToday / limit
  if (pct > 0.85) return { label: 'Yüksek Risk', color: '#ef4444' }
  if (pct > 0.55) return { label: 'Orta Risk', color: '#f59e0b' }
  return { label: 'Güvenli', color: '#10b981' }
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

  const load = async () => {
    setLoading(true)
    try { const data = await api.get('/api/wa-numbers/stats'); setStats(data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const connectNumber = async () => {
    setConnecting(true); setQrCode(null)
    try {
      const data = await api.post('/api/wa-numbers/connect', { displayName, dailyLimit })
      if (data.qr) setQrCode(data.qr)
      else { setShowAdd(false); load() }
    } catch {}
    setConnecting(false)
  }

  const disconnectNumber = async (id: string) => {
    await api.post(`/api/wa-numbers/${id}/disconnect`, {}); load()
  }

  const setPrimary = async (id: string) => {
    await api.patch(`/api/wa-numbers/${id}`, { isPrimary: true }); load()
  }

  const deleteNumber = async (id: string) => {
    if (!confirm('Numara silinsin mi?')) return
    await api.delete(`/api/wa-numbers/${id}`); load()
  }

  const updateLimit = async (id: string, limit: number) => {
    await api.patch(`/api/wa-numbers/${id}`, { dailyLimit: limit })
    setEditId(null); load()
  }

  const numbers = stats?.numbers || []
  const connected = numbers.filter((n: any) => n.status === 'connected').length
  const inputStyle = { background: '#060a1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,14,5,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(34,197,94,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,197,94,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <PhoneConstellation size={90} connected={connected} total={numbers.length} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>WhatsApp Numaralar</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>{t('wa_numbers.coklu_numara_yonetimi_ban', 'Çoklu numara yönetimi — ban riskini dağıt, kapasiteyi artır')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[{l:'Toplam',v:numbers.length,c:'#94a3b8'},{l:'Bağlı',v:connected,c:'#22c55e'},{l:'Günlük Kapasite',v:stats?.totalCapacity||0,c:'#06b6d4'},{l:'Bugün Gönderilen',v:stats?.usedToday||0,c:'#f59e0b'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:18, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#475569', fontSize:10, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#14532d,#22c55e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={15} /> Numara Ekle
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 18, padding: 22, marginBottom: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>{t('wa_numbers.yeni_numara_bagla', '➕ Yeni Numara Bağla')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('wa_numbers.isim_opsiyonel', 'İsim (opsiyonel)')}</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('wa_numbers.orn_satis_hatti_1', 'örn: Satış Hattı 1')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 5 }}>{t('wa_numbers.gunluk_mesaj_limiti', 'Günlük Mesaj Limiti')}</label>
              <input type="number" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} min={10} max={500} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
          </div>
          {qrCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(34,197,94,0.15)' }}>
              <p style={{ color: '#fff', fontWeight: 700, margin: 0 }}>{t('wa_numbers.whatsapp_ile_qri_okutun', '📱 WhatsApp ile QR\'ı okutun')}</p>
              <img src={qrCode} alt="QR" style={{ width: 200, height: 200, borderRadius: 12 }} />
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{t('wa_numbers.baglanti_bekleniyor', 'Bağlantı bekleniyor...')}</p>
            </div>
          ) : (
            <button onClick={connectNumber} disabled={connecting}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 11, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#4ade80', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {connecting ? <RefreshCw size={14} style={{ animation: 'wa-spin 1s linear infinite' }} /> : <QrCode size={14} />}
              {connecting ? 'QR oluşturuluyor...' : 'QR Oluştur & Bağla'}
            </button>
          )}
        </div>
      )}

      {/* Numbers List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', height: 100, alignItems: 'center' }}><RefreshCw size={22} style={{ color: '#475569', animation: 'wa-spin 1s linear infinite' }} /></div>
      ) : numbers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📱</p>
          <p style={{ fontSize: 14, margin: 0 }}>{t('wa_numbers.henuz_numara_yok_antiban', 'Henüz numara yok — anti-ban için birden fazla numara ekleyin')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {numbers.map((num: any) => {
            const banRisk = getBanRisk(num.sent_today || 0, num.daily_limit || 100)
            const healthColor = getHealthColor(num.sent_today || 0, num.daily_limit || 100)
            const pct = Math.min(((num.sent_today || 0) / (num.daily_limit || 100)) * 100, 100)
            return (
              <div key={num.id} style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: `1px solid ${num.is_primary ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Status indicator */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: num.status === 'connected' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', border: `1px solid ${num.status === 'connected' ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {num.status === 'connected' ? <Wifi size={20} color="#22c55e" /> : <WifiOff size={20} color="#64748b" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{num.display_name || 'WhatsApp Hattı'}</p>
                      {num.is_primary && <span style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>⭐ Birincil</span>}
                      <span style={{ background: `${banRisk.color}12`, border: `1px solid ${banRisk.color}30`, color: banRisk.color, fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
                        <ShieldCheck size={9} style={{ display: 'inline', marginRight: 3 }} />{banRisk.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569' }}>
                      {num.phone_number && <span>{num.phone_number}</span>}
                      <span style={{ color: num.status === 'connected' ? '#4ade80' : '#64748b' }}>{num.status === 'connected' ? '🟢 Bağlı' : '⚫ Bağlı Değil'}</span>
                    </div>
                  </div>
                  {/* Usage bar */}
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#475569', fontSize: 10 }}>{t('wa_numbers.bugun', 'Bugün')}</span>
                      <span style={{ color: healthColor, fontSize: 10, fontWeight: 700 }}>{num.sent_today || 0}/{num.daily_limit || 100}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: healthColor, borderRadius: 3, boxShadow: `0 0 6px ${healthColor}60`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!num.is_primary && num.status === 'connected' && (
                      <button onClick={() => setPrimary(num.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.08)', color: '#fbbf24', cursor: 'pointer' }} title="Birincil Yap">
                        <Star size={13} />
                      </button>
                    )}
                    <button onClick={() => setEditId(editId === num.id ? null : num.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer' }}>
                      <Settings2 size={13} />
                    </button>
                    {num.status === 'connected' ? (
                      <button onClick={() => disconnectNumber(num.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer' }}>
                        <WifiOff size={13} />
                      </button>
                    ) : (
                      <button onClick={() => deleteNumber(num.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Edit limit */}
                {editId === num.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{t('wa_numbers.gunluk_limit', 'Günlük limit:')}</span>
                    <input type="number" defaultValue={num.daily_limit} id={`lim-${num.id}`} min={10} max={500}
                      style={{ width: 80, ...inputStyle }} />
                    <button onClick={() => { const el = document.getElementById(`lim-${num.id}`) as HTMLInputElement; updateLimit(num.id, parseInt(el.value)) }}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#14532d,#22c55e)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Kaydet
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Anti-ban guide */}
      <div style={{ marginTop: 20, background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 18, padding: 20 }}>
        <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>🛡️ Anti-Ban Stratejisi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { icon: '📊', text: t('Numara başına günde max 100-150 mesaj gönderin','Numara başına günde max 100-150 mesaj gönderin'), color: '#06b6d4' },
            { icon: '⏱️', text: t('Mesajlar arasında 10-30 saniye bekleme aktif','Mesajlar arasında 10-30 saniye bekleme aktif'), color: '#10b981' },
            { icon: '🔄', text: t('Sistem otomatik round-robin rotasyon yapıyor','Sistem otomatik round-robin rotasyon yapıyor'), color: '#8b5cf6' },
            { icon: '🎯', text: t('Kişiselleştirilmiş mesajlar toplu mesajdan 3x güvenli','Kişiselleştirilmiş mesajlar toplu mesajdan 3x güvenli'), color: '#f59e0b' },
          ].map(tip => (
            <div key={tip.text} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: `${tip.color}08`, border: `1px solid ${tip.color}18`, borderRadius: 10 }}>
              <span style={{ fontSize: 16 }}>{tip.icon}</span>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes wa-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
