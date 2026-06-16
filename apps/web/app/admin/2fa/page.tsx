'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

export default function Admin2FAPage() {
  const [email, setEmail] = useState('')
  const [qrData, setQrData] = useState<{qr_url:string;secret:string}|null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [step, setStep] = useState<'setup'|'scan'|'verify'|'done'>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateQR = async () => {
    if (!email) return
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/api/admin/auth/2fa/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setQrData(d)
      setStep('scan')
    } catch(e:any) { setError(e.message) } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#e2e8f0',fontSize:14,padding:'12px 14px',outline:'none',width:'100%',boxSizing:'border-box' as const,fontFamily:'inherit' }

  return (
    <div style={{maxWidth:560}}>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🔒 İki Faktörlü Doğrulama (2FA)</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Google Authenticator veya Authy ile admin girişini güvenli hale getirin</p>

      <div style={{background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18,padding:28}}>

        {/* Step indicator */}
        <div style={{display:'flex',gap:8,marginBottom:24}}>
          {['1. Email','2. QR Kodu Tara','3. Doğrula','4. Aktif'].map((s,i)=>{
            const steps = ['setup','scan','verify','done']
            const current = steps.indexOf(step)
            const done = i < current
            const active = i === current
            return (
              <div key={s} style={{flex:1,textAlign:'center',fontSize:10,fontWeight:700,padding:'6px',borderRadius:8,
                background:done?'rgba(16,185,129,0.15)':active?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.03)',
                color:done?'#34d399':active?'#60a5fa':'#334155',
                border:`1px solid ${done?'rgba(16,185,129,0.25)':active?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.04)'}`
              }}>{done?'✓ ':''}{s}</div>
            )
          })}
        </div>

        {error && <div style={{padding:'11px 14px',borderRadius:9,marginBottom:16,background:'rgba(239,68,68,0.1)',color:'#f87171',fontSize:13}}>{error}</div>}

        {step === 'setup' && (
          <div>
            <p style={{color:'#94a3b8',fontSize:13,marginBottom:16}}>
              2FA, giriş sırasında telefon uygulamasından bir kod girmenizi gerektirir. Bu, yetkisiz girişleri engeller.
            </p>
            <label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>Admin E-posta</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@sovlo.io" style={{...inp,marginBottom:16}} />
            <button onClick={generateQR} disabled={loading||!email} style={{width:'100%',padding:'13px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
              {loading?'Hazırlanıyor...':'QR Kodu Oluştur →'}
            </button>
          </div>
        )}

        {step === 'scan' && qrData && (
          <div>
            <p style={{color:'#94a3b8',fontSize:13,marginBottom:20}}>
              Google Authenticator veya Authy uygulamasını açın ve aşağıdaki QR kodu tarayın:
            </p>
            <div style={{textAlign:'center',marginBottom:20}}>
              <img src={qrData.qr_url} alt="QR Code" style={{width:200,height:200,borderRadius:12,border:'4px solid rgba(255,255,255,0.08)',background:'#fff',padding:8}} />
            </div>
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 14px',marginBottom:20}}>
              <div style={{color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,marginBottom:4}}>Manuel Giriş Kodu</div>
              <code style={{color:'#fbbf24',fontSize:13,letterSpacing:'0.1em'}}>{qrData.secret}</code>
            </div>
            <button onClick={()=>setStep('verify')} style={{width:'100%',padding:'12px',borderRadius:11,border:'none',background:'linear-gradient(135deg,#10b981,#06b6d4)',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
              Taradım, Devam Et →
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <p style={{color:'#94a3b8',fontSize:13,marginBottom:16}}>
              Uygulamadaki 6 haneli kodu girin ve 2FA'yı aktive edin:
            </p>
            <label style={{display:'block',color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:8}}>6 Haneli Kod</label>
            <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6}
              style={{...inp,fontSize:24,textAlign:'center' as const,letterSpacing:'0.3em',marginBottom:16}} />
            <div style={{padding:'12px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,marginBottom:16}}>
              <p style={{color:'#fbbf24',fontSize:12,margin:0,lineHeight:1.6}}>
                ⚠️ <strong>ÖNEMLİ:</strong> Bu secret'ı Railway env var olarak kaydedin:<br/>
                <code style={{fontSize:11}}>ADMIN_2FA_SECRET={qrData?.secret}</code>
              </p>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep('done')} disabled={verifyCode.length!==6}
                style={{flex:1,padding:'12px',borderRadius:11,border:'none',background:verifyCode.length===6?'linear-gradient(135deg,#10b981,#06b6d4)':'rgba(100,116,139,0.3)',color:'#fff',cursor:verifyCode.length===6?'pointer':'not-allowed',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
                ✅ 2FA'yı Aktive Et
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:48,marginBottom:16}}>🎉</div>
            <h3 style={{color:'#34d399',fontSize:18,fontWeight:800,margin:'0 0 8px'}}>2FA Aktive Edildi!</h3>
            <p style={{color:'#64748b',fontSize:13,marginBottom:20,lineHeight:1.6}}>
              Artık her girişte Google Authenticator/Authy'den kod gerekecek.<br/>
              Railway'de <code style={{color:'#fbbf24'}}>ADMIN_2FA_SECRET</code> env var'ını set etmeyi unutmayın.
            </p>
            <a href="/admin" style={{display:'inline-block',padding:'12px 24px',borderRadius:11,background:'linear-gradient(135deg,#ef4444,#f97316)',color:'#fff',textDecoration:'none',fontSize:14,fontWeight:700}}>
              Admin'e Dön
            </a>
          </div>
        )}
      </div>

      <div style={{marginTop:16,padding:'14px 18px',background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:12}}>
        <p style={{color:'#60a5fa',fontSize:12,margin:0,lineHeight:1.7}}>
          📱 <strong>Desteklenen Uygulamalar:</strong> Google Authenticator, Authy, Microsoft Authenticator, 1Password<br/>
          🔒 <strong>Güvenlik notu:</strong> Secret'ı güvenli bir yerde saklayın. Kaybolursa 2FA'yı sıfırlamanız gerekir.
        </p>
      </div>
    </div>
  )
}
