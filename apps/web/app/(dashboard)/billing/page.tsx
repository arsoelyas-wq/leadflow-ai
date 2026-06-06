'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useSearchParams } from 'next/navigation'
import { RefreshCw, CheckCircle, Zap, TrendingUp, Star, Download } from 'lucide-react'

// ── CREDIT ORB — energy sphere with plasma fill ───────────────────────────────
function CreditOrb({ size = 100, pct = 100 }: { size?: number; pct?: number }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), 50)
    return () => clearInterval(t)
  }, [mounted])
  if (!mounted) return <div style={{ width: size * 2.1, height: size * 2.1, flexShrink: 0 }} />

  const cx = size * 1.05, s = size
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444'
  const rot = tick * 0.6
  const fillY = cx + s * 0.38 - (pct / 100) * s * 0.76
  const wavePoints: string[] = []
  for (let i = 0; i <= 80; i++) {
    const x = cx - s * 0.38 + (i / 80) * s * 0.76
    const wave = Math.sin((i / 80) * Math.PI * 3 + tick * 0.15) * s * 0.025
    wavePoints.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(fillY + wave).toFixed(1)}`)
  }
  const particles = [0, 1, 2, 3].map(i => {
    const phase = (tick * 1.2 + i * 25) % 100
    return { x: cx - s * 0.22 + (i * s * 0.16), y: fillY + s * 0.38 - (phase / 100) * s * 0.72, op: Math.max(0, 1 - Math.abs(phase - 50) / 50) * 0.6 }
  })
  const credits = [0, 120, 240].map((deg) => {
    const a = (deg + rot) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.86, y: cx + Math.sin(a) * s * 0.86 }
  })

  return (
    <div style={{ width: s * 2.1, height: s * 2.1, flexShrink: 0 }}>
      <svg width={s * 2.1} height={s * 2.1}>
        <defs>
          <radialGradient id={`coGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${color}00`} />
            <stop offset="100%" stopColor={`${color}14`} />
          </radialGradient>
          <clipPath id={`coClip${s}`}>
            <circle cx={cx} cy={cx} r={s * 0.38} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#coGlow${s})`} />
        {[0.58, 0.78, 0.96].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke={`${color}12`} strokeWidth={0.8}
            strokeDasharray="4 7" style={{ animation: `co-ring ${8+i*3}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        <circle cx={cx} cy={cx} r={s * 0.38} fill="rgba(3,8,22,0.8)" stroke={`${color}50`} strokeWidth={2}
          style={{ filter: `drop-shadow(0 0 ${s*0.18}px ${color}80)` }} />
        <g clipPath={`url(#coClip${s})`}>
          <rect x={cx - s * 0.38} y={fillY} width={s * 0.76} height={cx + s * 0.38 - fillY} fill={`${color}30`} />
          <path d={[...wavePoints, `L${(cx + s * 0.38).toFixed(1)} ${(cx + s * 0.38).toFixed(1)}`, `L${(cx - s * 0.38).toFixed(1)} ${(cx + s * 0.38).toFixed(1)}`, 'Z'].join(' ')} fill={`${color}40`} />
          {particles.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} opacity={p.op} />)}
        </g>
        <text x={cx} y={cx - 3} fill="white" fontSize={s * 0.18} textAnchor="middle" dominantBaseline="middle" fontWeight="900">%{Math.round(pct)}</text>
        <text x={cx} y={cx + s * 0.13} fill={color} fontSize={s * 0.07} textAnchor="middle" fontWeight="700">KREDİ</text>
        {credits.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={10} fill={`${color}20`} stroke={`${color}50`} strokeWidth={1.5} />
            <text x={c.x} y={c.y} fill={color} fontSize={8} textAnchor="middle" dominantBaseline="middle" fontWeight="800">₺</text>
          </g>
        ))}
      </svg>
      <style>{`@keyframes co-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const PLANS = [
  { id:'starter', name:'Başlangıç', credits:100, price:'₺200', period:'ay', color:'#06b6d4', features:['100 lead kredisi','Google Maps scraping','WhatsApp gönderim','Email gönderim','7 gün destek'], popular:false, icon:'🚀' },
  { id:'growth', name:'Büyüme', credits:300, price:'₺450', period:'ay', color:'#8b5cf6', features:['300 lead kredisi','Tüm kaynaklar','AI analiz','A/B test','Öncelikli destek','Webhook entegrasyonu'], popular:true, icon:'⚡' },
  { id:'enterprise', name:'İşletme', credits:700, price:'₺800', period:'ay', color:'#f59e0b', features:['700 lead kredisi','Tüm özellikler','White-label','API erişimi','7/24 destek','Özel entegrasyon','Multi-numara'], popular:false, icon:'🏆' },
]

export default function BillingPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [credits, setCredits] = useState<{ total: number; used: number } | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'plans'|'usage'|'history'|'promo'>('plans')
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<{type:'ok'|'err';text:string}|null>(null)

  const redeemPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true); setPromoResult(null)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
      const token = localStorage.getItem('token') || ''
      const r = await fetch(`${API_URL}/api/admin/promo/redeem`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({code:promoCode.toUpperCase()})
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setPromoResult({type:'ok',text:d.message||'Promo kodu uygulandı!'})
      setPromoCode('')
      // Refresh credits
      setTimeout(() => window.location.reload(), 1500)
    } catch(e:any) { setPromoResult({type:'err',text:e.message}) }
    finally { setPromoLoading(false) }
  }

  useEffect(() => {
    const payment = searchParams.get('payment'), success = searchParams.get('success')
    if (payment === 'success' || success === 'true') setMsg({ type: 'success', text: 'Ödeme başarılı! Krediniz hesabınıza eklendi.' })
    else if (payment === 'cancelled') setMsg({ type: 'error', text: 'Ödeme iptal edildi.' })
    Promise.allSettled([api.get('/api/dashboard'), api.get('/api/payments/history').catch(() => ({ payments: [] }))]).then(([dash, hist]) => {
      if (dash.status === 'fulfilled') { const s = (dash.value as any).stats || {}; setCredits({ total: s.credits_total || s.credits || 0, used: s.credits_used || 0 }) }
      if (hist.status === 'fulfilled') setHistory((hist.value as any).payments || [])
    })
  }, [])

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId)
    try { const data = await api.post('/api/payments/topup', { packageId }); if ((data as any).url) window.location.href = (data as any).url } catch (err: any) { setMsg({ type: 'error', text: err.message || 'Ödeme sayfası açılamadı' }) }
    setLoading(null)
  }

  const creditsTotal = credits?.total ?? (user as any)?.creditsTotal ?? 50
  const creditsUsed = credits?.used ?? (user as any)?.creditsUsed ?? 0
  const creditsLeft = Math.max(0, creditsTotal - creditsUsed)
  const pct = creditsTotal > 0 ? Math.round((creditsLeft / creditsTotal) * 100) : 0
  const pctColor = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,12,5,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(16,185,129,0.18)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <CreditOrb size={90} pct={pct} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>{t('billing.title','Abonelik & Kredi')}</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>{t('billing.credits','Kredinizi yönetin, geçmişinizi takip edin, yeni paket satın alın')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[{l:t('billing.credits','Toplam Kredi'),v:creditsTotal,c:'#94a3b8'},{l:t('billing.credits_remaining','Kalan Kredi'),v:creditsLeft,c:pctColor},{l:t('billing.credits_used','Kullanılan'),v:creditsUsed,c:'#f59e0b'}].map(m => (
                <div key={m.l} style={{ textAlign:'center' }}>
                  <p style={{ color:m.c, fontSize:22, fontWeight:800, margin:0 }}>{m.v}</p>
                  <p style={{ color:'#475569', fontSize:11, margin:0 }}>{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, marginTop: 20, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 3, boxShadow: `0 0 10px ${pctColor}60`, transition: 'width 0.8s' }} />
        </div>
        {pct <= 20 && <p style={{ position: 'relative', zIndex: 2, color: '#f87171', fontSize: 12, margin: '8px 0 0' }}>{t('billing.krediniz_azaliyor_paket_s', '⚠️ Krediniz azalıyor — paket satın almayı düşünün!')}</p>}
      </div>

      {msg && <div style={{ marginBottom: 16, padding: '12px 18px', background: msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border: `1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius: 12 }}><p style={{ color: msg.type==='success'?'#34d399':'#f87171', fontSize: 13, margin: 0 }}>{msg.text}</p></div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#f1f5f9', padding:4, borderRadius:12, width:'fit-content', marginBottom:20, border:'1px solid #e2e8f0' }}>
        {[{id:'plans',label:'💎 Paketler'},{id:'usage',label:'📊 Kullanım'},{id:'history',label:'🧾 Geçmiş'},{id:'promo',label:'🎁 Promo Kodu'}].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id as any)}
            style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===t.id?'linear-gradient(135deg,#14532d,#10b981)':'transparent', color:activeTab===t.id?'#fff':'#64748b', boxShadow:activeTab===t.id?'0 3px 12px rgba(16,185,129,0.25)':'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'plans' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ position:'relative', background:'#ffffff', border:`1px solid ${plan.color}${plan.popular?'50':'20'}`, borderRadius:20, padding:24, overflow:'hidden' }}>
              {plan.popular && <>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${plan.color},transparent)` }} />
                <div style={{ position:'absolute', top:14, right:14, background:`${plan.color}20`, border:`1px solid ${plan.color}40`, color:plan.color, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                  <Star size={9} style={{ display:'inline', marginRight:3 }} />EN POPÜLER
                </div>
              </>}
              <div style={{ fontSize:28, marginBottom:8 }}>{plan.icon}</div>
              <h3 style={{ color:'#0f172a', fontSize:18, fontWeight:800, margin:'0 0 4px' }}>{plan.name}</h3>
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
                <span style={{ color:plan.color, fontSize:28, fontWeight:900 }}>{plan.price}</span>
                <span style={{ color:'#475569', fontSize:12 }}>/{plan.period}</span>
              </div>
              <p style={{ color:'#64748b', fontSize:12, margin:'0 0 16px' }}>{plan.credits} lead kredisi</p>
              <div style={{ marginBottom:20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                    <CheckCircle size={13} color={plan.color} />
                    <span style={{ color:'#94a3b8', fontSize:12 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>handlePurchase(plan.id)} disabled={loading===plan.id}
                style={{ width:'100%', padding:'11px', borderRadius:12, border:'none', background:plan.popular?`linear-gradient(135deg,${plan.color}cc,${plan.color})`:`${plan.color}15`, color:plan.popular?'#fff':plan.color, fontSize:13, fontWeight:700, cursor:loading===plan.id?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:plan.popular?`0 4px 16px ${plan.color}40`:'none' }}>
                {loading===plan.id?<RefreshCw size={14} style={{ animation:'bi-spin 1s linear infinite' }} />:<Zap size={14} />}
                {loading===plan.id?'Yönlendiriliyor...':'Satın Al'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'usage' && (
        <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:18, padding:24 }}>
          <h3 style={{ color:'#0f172a', fontSize:14, fontWeight:700, margin:'0 0 20px' }}>{t('billing.kredi_kullanim_dokumu', '📊 Kredi Kullanım Dökümü')}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            {[
              { label:'Lead Scraping', used:Math.round(creditsUsed*0.45), color:'#06b6d4', icon:'🔍' },
              { label:'WhatsApp Gönderim', used:Math.round(creditsUsed*0.28), color:'#10b981', icon:'💬' },
              { label:'AI Analiz', used:Math.round(creditsUsed*0.15), color:'#8b5cf6', icon:'🤖' },
              { label:'Email Gönderim', used:Math.round(creditsUsed*0.12), color:'#f59e0b', icon:'📧' },
            ].map(item => {
              const ip = creditsUsed > 0 ? Math.round((item.used/creditsUsed)*100) : 0
              return (
                <div key={item.label} style={{ padding:'14px 16px', background:`${item.color}08`, border:`1px solid ${item.color}18`, borderRadius:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span>{item.icon}</span><span style={{ color:'#94a3b8', fontSize:12 }}>{item.label}</span>
                    </div>
                    <span style={{ color:item.color, fontWeight:800, fontSize:14 }}>{item.used}</span>
                  </div>
                  <div style={{ height:5, background:'#f1f5f9', borderRadius:3 }}>
                    <div style={{ height:'100%', width:`${ip}%`, background:item.color, borderRadius:3 }} />
                  </div>
                  <p style={{ color:'#334155', fontSize:10, margin:'4px 0 0' }}>Toplam kullanımın %{ip}'i</p>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:10 }}>
            <p style={{ color:'#047857', fontSize:12, margin:0 }}>💡 <strong>Tavsiye:</strong> {pct<=30?'Krediniz azalıyor, Büyüme paketine geçerek %40 tasarruf edin.':'Krediniz yeterli. Daha fazla lead için paket yükseltebilirsiniz.'}</p>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:18, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ color:'#0f172a', fontSize:13, fontWeight:700, margin:0 }}>{t('billing.odeme_gecmisi', '🧾 Ödeme Geçmişi')}</h3>
            {history.length>0 && <button style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid rgba(16,185,129,0.25)', background:'rgba(16,185,129,0.06)', color:'#047857', fontSize:11, cursor:'pointer' }}><Download size={12} />{t('billing.csv_indir', 'CSV İndir')}</button>}
          </div>
          {history.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#475569' }}>
              <p style={{ fontSize:28, margin:'0 0 10px' }}>🧾</p>
              <p style={{ fontSize:13, margin:0 }}>{t('billing.henuz_odeme_gecmisi_yok', 'Henüz ödeme geçmişi yok')}</p>
            </div>
          ) : history.map((p: any, i: number) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <TrendingUp size={16} color="#10b981" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:0 }}>{p.package_name||'Kredi Paketi'}</p>
                <p style={{ color:'#475569', fontSize:11, margin:'2px 0 0' }}>{new Date(p.created_at).toLocaleDateString()} · {p.credits||0} kredi</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ color:'#10b981', fontWeight:800, fontSize:14, margin:0 }}>₺{p.amount}</p>
                <span style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#047857', fontSize:10, padding:'2px 7px', borderRadius:20 }}>{t('billing.tamamlandi', 'Tamamlandı')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'promo' && (
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 18, padding: '28px 24px', maxWidth: 500 }}>
          <h3 style={{ color:'#0f172a', fontSize:16, fontWeight:800, margin:'0 0 8px' }}>🎁 Promo Kodu Kullan</h3>
          <p style={{ color:'#64748b', fontSize:13, margin:'0 0 20px' }}>Promo kodunuzu girin ve kredinizi anında alın</p>

          {promoResult && (
            <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:16, background:promoResult.type==='ok'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${promoResult.type==='ok'?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`, color:promoResult.type==='ok'?'#34d399':'#f87171', fontSize:13 }}>
              {promoResult.text}
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH50, BONUS100..." maxLength={30}
              onKeyDown={e=>e.key==='Enter'&&redeemPromo()}
              style={{ flex:1, background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:12, padding:'13px 16px', color:'#fff', fontSize:15, outline:'none', fontFamily:'inherit', letterSpacing:'0.05em', fontWeight:600 }} />
            <button onClick={redeemPromo} disabled={promoLoading||!promoCode.trim()}
              style={{ padding:'13px 22px', borderRadius:12, border:'none', background:promoLoading?'rgba(245,158,11,0.4)':'linear-gradient(135deg,#f59e0b,#f97316)', color:'#fff', cursor:promoLoading||!promoCode.trim()?'not-allowed':'pointer', fontSize:14, fontWeight:700, fontFamily:'inherit', whiteSpace:'nowrap' as const }}>
              {promoLoading ? '⏳' : '✓ Uygula'}
            </button>
          </div>
          <p style={{ color:'#334155', fontSize:11, marginTop:12 }}>Promo kodları tek kullanımlık veya sınırlı kullanım hakkına sahip olabilir.</p>
        </div>
      )}

      <style>{`@keyframes bi-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
