'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Play, Plus, Gift, Users, TrendingUp, CheckCircle, Eye } from 'lucide-react'

// ── NETWORK WEB — expanding referral network ──────────────────────────────────
function NetworkWeb({ size = 110, expanding = false }: { size?: number; expanding?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), expanding ? 25 : 60)
    return () => clearInterval(t)
  }, [mounted, expanding])

  if (!mounted) return <div style={{ width: size * 2, height: size * 2, flexShrink: 0 }} />

  const cx = size, s = size
  const rot = tick * (expanding ? 0.8 : 0.3)

  // Customer nodes (ring 1)
  const customers = [0,72,144,216,288].map((deg, i) => {
    const a = (deg + rot) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.52, y: cx + Math.sin(a) * s * 0.52, deg, i }
  })

  // Referral nodes (ring 2)
  const referrals = [36,108,180,252,324].map((deg, i) => {
    const a = (deg - rot * 0.7) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.82, y: cx + Math.sin(a) * s * 0.82, deg, i }
  })

  const dashOffset = -tick * (expanding ? 1.5 : 0.4)

  return (
    <div style={{ width: s * 2, height: s * 2, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2} height={s * 2}>
        <defs>
          <radialGradient id={`nwGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(217,119,6,0)" />
            <stop offset="100%" stopColor="rgba(217,119,6,0.12)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#nwGlow${s})`} />
        {/* Connections: customer → referral */}
        {customers.map((c, i) => (
          <line key={i} x1={c.x} y1={c.y} x2={referrals[i].x} y2={referrals[i].y}
            stroke="#d9770640" strokeWidth={1.2} strokeDasharray="4 5" strokeDashoffset={dashOffset} />
        ))}
        {/* Connections: center → customer */}
        {customers.map((c, i) => (
          <line key={`c${i}`} x1={cx} y1={cx} x2={c.x} y2={c.y}
            stroke="#06b6d450" strokeWidth={1.5} strokeDasharray="5 4" strokeDashoffset={-dashOffset} />
        ))}
        {/* Referral nodes (outer) */}
        {referrals.map((r, i) => (
          <g key={i}>
            <circle cx={r.x} cy={r.y} r={9} fill="#8b5cf6" opacity={0.7} style={{ filter:'drop-shadow(0 0 5px #8b5cf6)' }} />
            <circle cx={r.x} cy={r.y} r={14} fill="none" stroke="#8b5cf640" strokeWidth={1} />
          </g>
        ))}
        {/* Customer nodes (middle ring) */}
        {customers.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={12} fill="#06b6d4" opacity={0.8} style={{ filter:'drop-shadow(0 0 6px #06b6d4)' }} />
            <text x={c.x} y={c.y} fill="white" fontSize={7} textAnchor="middle" dominantBaseline="middle" fontWeight="800">MŞ</text>
          </g>
        ))}
        {/* Center hub (your business) */}
        <circle cx={cx} cy={cx} r={22} fill="#d97706" style={{ filter:'drop-shadow(0 0 12px #d97706cc)' }} />
        <text x={cx} y={cx} fill="white" fontSize={9} textAnchor="middle" dominantBaseline="middle" fontWeight="900">SEN</text>
        {/* Outer ring */}
        <circle cx={cx} cy={cx} r={s-2} fill="none" stroke="rgba(217,119,6,0.15)" strokeWidth={1.5} strokeDasharray="6 4" />
      </svg>
    </div>
  )
}

export default function ReferralPage() {
  const [settings, setSettings] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(0)
  const [runResults, setRunResults] = useState<any[]>([])
  const [delay, setDelay] = useState(7)
  const [reward, setReward] = useState('%10 indirim veya ücretsiz hizmet')
  const [activeTab, setActiveTab] = useState<'main'|'leaderboard'|'rewards'>('main')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    Promise.allSettled([api.get('/api/referral/settings'), api.get('/api/referral/stats')]).then(([s, st]) => {
      if (s.status === 'fulfilled') { setSettings(s.value.settings); setDelay(s.value.settings?.delayDays||7); setReward(s.value.settings?.rewardOffer||'%10 indirim') }
      if (st.status === 'fulfilled') setStats(st.value)
      setLoading(false)
    })
  }, [])

  const saveSettings = async () => {
    try { await api.post('/api/referral/settings', { delayDays: delay, rewardOffer: reward, autoRun: settings?.autoRun }) } catch {}
  }

  const runCampaign = async () => {
    setRunning(true); setRunProgress(0); setRunResults([])
    // Animate progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 80))
      setRunProgress(i)
    }
    try {
      const d = await api.post('/api/referral/run-now', {})
      setStats((prev: any) => ({ ...prev, ...d }))
    } catch {}
    setRunning(false); setRunProgress(0)
  }

  const previewMsg = `Merhaba! Hizmetimizden memnun kaldığınız için teşekkürler 😊 Size özel ${reward} kazanmak ister misiniz? Bizi bir iş arkadaşınıza tavsiye edin!`

  return (
    <div style={{ padding:0 }}>
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(5,4,2,0.98),rgba(3,8,22,0.99))', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid rgba(217,119,6,0.2)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(217,119,6,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(217,119,6,0.02) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:24 }}>
          <NetworkWeb size={95} expanding={running} />
          <div style={{ flex:1 }}>
            <h1 style={{ color:'#fff', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>Referral Loop</h1>
            <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>Kazanılan müşterilerden otomatik referans kampanyası</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[{label:'Gönderilen',value:stats?.sent||0,color:'#06b6d4'},{label:'Referans',value:stats?.referrals||0,color:'#d97706'},{label:'Kazanılan',value:stats?.won||0,color:'#10b981'}].map(m => (
                <div key={m.label} style={{ textAlign:'center' }}>
                  <p style={{ color:m.color, fontSize:20, fontWeight:800, margin:0 }}>{m.value}</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={runCampaign} disabled={running}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 22px', borderRadius:12, border:'none', cursor:running?'not-allowed':'pointer', background:'linear-gradient(135deg,#78350f,#d97706)', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }}>
            {running ? <RefreshCw size={15} style={{ animation:'rf-spin 1s linear infinite' }} /> : <Play size={15} />}
            {running ? `${runProgress}%` : 'Kampanya Başlat'}
          </button>
        </div>
        {running && (
          <div style={{ position:'relative', zIndex:2, marginTop:16, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${runProgress}%`, background:'linear-gradient(90deg,#d97706,#10b981)', borderRadius:2, transition:'width 0.1s' }} />
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.3)', padding:4, borderRadius:12, width:'fit-content', marginBottom:20, border:'1px solid rgba(255,255,255,0.05)' }}>
        {[{id:'main',label:'⚙️ Ayarlar'},{id:'leaderboard',label:'🏆 Liderlik'},{id:'rewards',label:'🎁 Ödüller'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===t.id?'linear-gradient(135deg,#78350f,#d97706)':'transparent', color:activeTab===t.id?'#fff':'#64748b', boxShadow:activeTab===t.id?'0 3px 12px rgba(217,119,6,0.3)':'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'main' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(217,119,6,0.2)', borderRadius:18, padding:22 }}>
            <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>⚙️ Kampanya Ayarları</h3>
            <div style={{ marginBottom:14 }}>
              <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Satış Sonrası Bekleme: {delay} gün</label>
              <input type="range" min={1} max={30} value={delay} onChange={e=>setDelay(Number(e.target.value))} style={{ width:'100%', accentColor:'#d97706' }} />
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#334155', fontSize:10 }}>1 gün</span><span style={{ color:'#334155', fontSize:10 }}>30 gün</span></div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Ödül Teklifi</label>
              <input value={reward} onChange={e=>setReward(e.target.value)} style={{ width:'100%', background:'#060a1c', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={saveSettings} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#78350f,#d97706)', color:'#fff', fontSize:12, fontWeight:700 }}>Kaydet</button>
              <button onClick={() => setPreview(!preview)} style={{ padding:'9px 14px', borderRadius:9, border:'1px solid rgba(217,119,6,0.3)', background:'rgba(217,119,6,0.08)', color:'#fbbf24', fontSize:12, cursor:'pointer' }}>
                <Eye size={12} style={{ display:'inline', marginRight:4 }} />Önizle
              </button>
            </div>
          </div>

          {preview ? (
            <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(37,211,102,0.2)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>💬 WhatsApp Önizleme</h3>
              <div style={{ background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:14, padding:16 }}>
                <p style={{ color:'#e2e8f0', fontSize:13, lineHeight:1.6, margin:0 }}>{previewMsg}</p>
              </div>
              <p style={{ color:'#334155', fontSize:11, margin:'10px 0 0' }}>Gönderilecek müşteri: satış sonrası {delay}. günde</p>
            </div>
          ) : (
            <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(16,185,129,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📊 Performans</h3>
              {[
                { label:'Referans Dönüşüm', value:`%${stats?.referrals&&stats?.sent?Math.round((stats.referrals/stats.sent)*100):0}`, color:'#d97706' },
                { label:'Normal Dönüşüm', value:'%22', color:'#94a3b8' },
                { label:'Kazanılan Referanslar', value:stats?.won||0, color:'#10b981' },
              ].map(m => (
                <div key={m.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color:'#94a3b8', fontSize:12 }}>{m.label}</span>
                  <span style={{ color:m.color, fontWeight:700, fontSize:13 }}>{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(217,119,6,0.18)', borderRadius:18, padding:22 }}>
          <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🏆 En Çok Tavsiye Edenler</h3>
          <p style={{ color:'#475569', fontSize:13, textAlign:'center', padding:24 }}>Referans kampanyası başlatıldıkça liderlik tablosu oluşacak</p>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div style={{ background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(139,92,246,0.18)', borderRadius:18, padding:22 }}>
          <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🎁 Ödül Takibi</h3>
          <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:12, padding:16 }}>
            <p style={{ color:'#a78bfa', fontSize:12, margin:0 }}>💡 Mevcut ödül: <strong>{reward}</strong></p>
            <p style={{ color:'#475569', fontSize:11, margin:'6px 0 0' }}>Ödül vaat edilen müşterileri buradan takip edin ve yerine getirin</p>
          </div>
        </div>
      )}

      <style>{`@keyframes rf-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
