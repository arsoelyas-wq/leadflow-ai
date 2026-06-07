'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Play, Plus, Gift, Users, TrendingUp, CheckCircle, Eye, Settings, Trophy, MessageCircle, BarChart2, Lightbulb } from 'lucide-react'

const tx2 = '#475569'
const accentTeal = '#0d9488', accentEmerald = '#059669'

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
  const { t } = useI18n()
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
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg,#ffffff,#fffbeb 65%,#ffffff)', borderRadius:20, padding:'32px 28px', marginBottom:24, border:'1px solid #fde68a' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(217,119,6,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(217,119,6,0.02) 1px,transparent 1px)', backgroundSize:'36px 36px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:24 }}>
          <NetworkWeb size={95} expanding={running} />
          <div style={{ flex:1 }}>
            <h1 style={{ color:'#0f172a', fontSize:26, fontWeight:800, margin:'0 0 6px' }}>Referral Loop</h1>
            <p style={{ color:'#64748b', fontSize:14, margin:'0 0 14px' }}>{t('referral.kazanilan_musterilerden_o', 'Kazanılan müşterilerden otomatik referans kampanyası')}</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[{label: t('Gönderilen','Gönderilen'),value:stats?.sent||0,color:accentTeal},{label:'Referans',value:stats?.referralsReceived||0,color:'#d97706'},{label: t('Kazanılan','Kazanılan'),value:stats?.referralsWon||0,color:accentEmerald}].map(m => (
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
          <div style={{ position:'relative', zIndex:2, marginTop:16, height:4, background:'#e2e8f0', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${runProgress}%`, background:'linear-gradient(90deg,#d97706,#10b981)', borderRadius:2, transition:'width 0.1s' }} />
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'#f1f5f9', padding:4, borderRadius:12, width:'fit-content', marginBottom:20, border:'1px solid #e2e8f0' }}>
        {[{id:'main',label:'Ayarlar',Icon:Settings},{id:'leaderboard',label:'Liderlik',Icon:Trophy},{id:'rewards',label:'Ödüller',Icon:Gift}].map(tb => (
          <button key={tb.id} onClick={() => setActiveTab(tb.id as any)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===tb.id?'linear-gradient(135deg,#78350f,#d97706)':'transparent', color:activeTab===tb.id?'#fff':tx2, boxShadow:activeTab===tb.id?'0 3px 12px rgba(217,119,6,0.3)':'none' }}>
            <tb.Icon size={14} />
            {tb.label}
          </button>
        ))}
      </div>

      {activeTab === 'main' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ background:'#ffffff', border:'1px solid rgba(217,119,6,0.2)', borderRadius:18, padding:22 }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:7, color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px' }}><Settings size={15} />{t('referral.kampanya_ayarlari', 'Kampanya Ayarları')}</h3>
            <div style={{ marginBottom:14 }}>
              <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>Satış Sonrası Bekleme: {delay} gün</label>
              <input type="range" min={1} max={30} value={delay} onChange={e=>setDelay(Number(e.target.value))} style={{ width:'100%', accentColor:'#d97706' }} />
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#334155', fontSize:10 }}>{t('referral.1_gun', '1 gün')}</span><span style={{ color:'#334155', fontSize:10 }}>{t('referral.30_gun', '30 gün')}</span></div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ color:'#64748b', fontSize:11, display:'block', marginBottom:5 }}>{t('referral.odul_teklifi', 'Ödül Teklifi')}</label>
              <input value={reward} onChange={e=>setReward(e.target.value)} style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:9, padding:'9px 12px', color:'#0f172a', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={saveSettings} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#78350f,#d97706)', color:'#fff', fontSize:12, fontWeight:700 }}>Kaydet</button>
              <button onClick={() => setPreview(!preview)} style={{ padding:'9px 14px', borderRadius:9, border:'1px solid rgba(217,119,6,0.3)', background:'rgba(217,119,6,0.08)', color:'#b45309', fontSize:12, cursor:'pointer' }}>
                <Eye size={12} style={{ display:'inline', marginRight:4 }} />Önizle
              </button>
            </div>
          </div>

          {preview ? (
            <div style={{ background:'#ffffff', border:'1px solid rgba(37,211,102,0.2)', borderRadius:18, padding:22 }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:7, color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px' }}><MessageCircle size={15} />{t('referral.whatsapp_onizleme', 'WhatsApp Önizleme')}</h3>
              <div style={{ background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:14, padding:16 }}>
                <p style={{ color:'#334155', fontSize:13, lineHeight:1.6, margin:0 }}>{previewMsg}</p>
              </div>
              <p style={{ color:'#334155', fontSize:11, margin:'10px 0 0' }}>Gönderilecek müşteri: satış sonrası {delay}. günde</p>
            </div>
          ) : (
            <div style={{ background:'#ffffff', border:'1px solid rgba(16,185,129,0.18)', borderRadius:18, padding:22 }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:7, color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px' }}><BarChart2 size={15} />Performans</h3>
              {[
                { label: t('Referans Dönüşüm','Referans Dönüşüm'), value:`%${stats?.referralsReceived&&stats?.sent?Math.round((stats.referralsReceived/stats.sent)*100):0}`, color:'#d97706' },
                { label: t('Normal Dönüşüm','Normal Dönüşüm'), value:'%22', color:tx2 },
                { label: t('Kazanılan Referanslar','Kazanılan Referanslar'), value:stats?.referralsWon||0, color:accentEmerald },
              ].map(m => (
                <div key={m.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <span style={{ color:tx2, fontSize:12 }}>{m.label}</span>
                  <span style={{ color:m.color, fontWeight:700, fontSize:13 }}>{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div style={{ background:'#ffffff', border:'1px solid rgba(217,119,6,0.18)', borderRadius:18, padding:22 }}>
          <h3 style={{ display:'flex', alignItems:'center', gap:7, color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px' }}><Trophy size={15} />{t('referral.en_cok_tavsiye_edenler', 'En Çok Tavsiye Edenler')}</h3>
          <p style={{ color:'#475569', fontSize:13, textAlign:'center', padding:24 }}>{t('referral.referans_kampanyasi_basla', 'Referans kampanyası başlatıldıkça liderlik tablosu oluşacak')}</p>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div style={{ background:'#ffffff', border:'1px solid rgba(139,92,246,0.18)', borderRadius:18, padding:22 }}>
          <h3 style={{ display:'flex', alignItems:'center', gap:7, color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 16px' }}><Gift size={15} />{t('referral.odul_takibi', 'Ödül Takibi')}</h3>
          <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:12, padding:16 }}>
            <p style={{ display:'flex', alignItems:'center', gap:6, color:'#7c3aed', fontSize:12, margin:0 }}><Lightbulb size={13} />{t('referral.mevcut_odul', 'Mevcut ödül:')} <strong>{reward}</strong></p>
            <p style={{ color:tx2, fontSize:11, margin:'6px 0 0' }}>{t('referral.odul_vaat_edilen_musteril', 'Ödül vaat edilen müşterileri buradan takip edin ve yerine getirin')}</p>
          </div>
        </div>
      )}

      <style>{`@keyframes rf-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
