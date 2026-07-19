'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import SovloLogo from '@/components/SovloLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

type Step = 'form' | 'otp'

export default function RegisterPage() {
  const { verifyOTP } = useAuth()

  const [step, setStep]               = useState<Step>('form')
  const [name, setName]               = useState('')
  const [company, setCompany]         = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [otp, setOtp]                 = useState(['', '', '', '', '', ''])
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    if (otp.every(d => d !== '') && step === 'otp') handleVerify()
  }, [otp])

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Tüm zorunlu alanları doldurun'); return
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır'); return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), company: company.trim(), email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kayıt başarısız')
      setMaskedEmail(data.masked_email || email)
      setStep('otp')
      setResendCooldown(60)
      setTimeout(() => otpRefs[0].current?.focus(), 100)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [name, company, email, password])

  const handleVerify = useCallback(async () => {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true); setError('')
    try {
      await verifyOTP(email.trim(), code)
    } catch (e: any) {
      setError(e.message || 'Kod hatalı')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs[0].current?.focus(), 50)
    }
    setLoading(false)
  }, [otp, email, verifyOTP])

  const handleResend = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), company: company.trim(), email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kod gönderilemedi')
      setOtp(['', '', '', '', '', ''])
      setResendCooldown(60)
      setTimeout(() => otpRefs[0].current?.focus(), 50)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [name, company, email, password])

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[i] === '' && i > 0) {
        const next = [...otp]; next[i - 1] = ''
        setOtp(next); otpRefs[i - 1].current?.focus()
      } else {
        const next = [...otp]; next[i] = ''; setOtp(next)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) otpRefs[i - 1].current?.focus()
    else if (e.key === 'ArrowRight' && i < 5) otpRefs[i + 1].current?.focus()
  }

  const handleOtpChange = (i: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('')
      if (digits.length === 6) { setOtp(digits); otpRefs[5].current?.focus(); return }
    }
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < 5) setTimeout(() => otpRefs[i + 1].current?.focus(), 0)
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        .ap{min-height:100vh;background:#050c1a;display:flex;align-items:center;justify-content:center;padding:24px 16px;position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
        .g1{position:fixed;top:-15%;left:10%;width:700px;height:700px;background:radial-gradient(circle,rgba(37,99,235,.10) 0%,transparent 65%);pointer-events:none;z-index:0;}
        .g2{position:fixed;bottom:-20%;right:0;width:600px;height:600px;background:radial-gradient(circle,rgba(99,102,241,.08) 0%,transparent 65%);pointer-events:none;z-index:0;}
        .gr{position:fixed;inset:0;background-image:radial-gradient(rgba(148,163,184,.04) 1px,transparent 1px);background-size:30px 30px;pointer-events:none;z-index:0;}
        .ac{position:relative;z-index:1;width:100%;max-width:420px;}
        .al{text-align:center;margin-bottom:32px;}
        .card{background:rgba(9,18,36,.9);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.06);border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px rgba(59,130,246,.06),0 24px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);}
        .bar{height:3px;background:linear-gradient(90deg,#1d4ed8,#6366f1,#1d4ed8);background-size:200% 100%;animation:sh 4s ease infinite;}
        @keyframes sh{0%{background-position:0% 0%}50%{background-position:100% 0%}100%{background-position:0% 0%}}
        .cb{padding:32px 36px 28px;}
        @media(max-width:480px){.cb{padding:24px 20px 20px;}}
        .h1{font-size:21px;font-weight:700;color:#f1f5f9;margin-bottom:5px;}
        .sub{font-size:13.5px;color:#64748b;margin-bottom:22px;}
        .lbl{display:block;font-size:12px;font-weight:500;color:#94a3b8;margin-bottom:6px;letter-spacing:.01em;}
        .req{color:#ef4444;margin-left:2px;}
        .iw{position:relative;margin-bottom:12px;}
        .ii{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#475569;pointer-events:none;}
        .inp{width:100%;background:rgba(20,32,55,.7);border:1px solid rgba(71,85,105,.5);border-radius:9px;padding:12px 13px 12px 40px;font-size:14px;color:#f1f5f9;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;}
        .inp::placeholder{color:#334155;}
        .inp:focus{border-color:rgba(59,130,246,.6);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
        .pw-toggle{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;color:#475569;cursor:pointer;padding:4px;transition:color .15s;}
        .pw-toggle:hover{color:#94a3b8;}
        .note{font-size:11px;color:#334155;margin-top:-6px;margin-bottom:12px;display:flex;align-items:center;gap:4px;}
        .btn{width:100%;padding:13px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb 0%,#6366f1 100%);color:#fff;font-size:14.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s,box-shadow .2s,transform .15s;box-shadow:0 4px 20px rgba(37,99,235,.3);font-family:inherit;margin-top:8px;}
        .btn:hover:not(:disabled){opacity:.92;box-shadow:0 6px 28px rgba(37,99,235,.4);transform:translateY(-1px);}
        .btn:active:not(:disabled){transform:translateY(0);}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .lr{text-align:center;font-size:13.5px;color:#475569;margin-top:18px;}
        .lnk{color:#60a5fa;text-decoration:none;font-weight:500;}
        .lnk:hover{color:#93c5fd;}
        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-bottom:12px;}
        .ib{background:rgba(30,41,59,.5);border:1px solid rgba(71,85,105,.3);border-radius:10px;padding:12px 15px;margin-bottom:18px;}
        .ir{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#94a3b8;}
        .otp-lbl{text-align:center;font-size:13px;color:#94a3b8;margin-bottom:14px;}
        .otp-boxes{display:flex;gap:9px;justify-content:center;margin-bottom:18px;}
        .obox{width:46px;height:54px;text-align:center;font-size:21px;font-weight:700;border-radius:10px;border:2px solid rgba(71,85,105,.5);background:rgba(20,32,55,.7);color:#f1f5f9;outline:none;transition:border-color .15s,box-shadow .15s,background .15s;font-family:'SF Mono','Fira Code',monospace;}
        .obox:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(37,99,235,.15);background:rgba(30,48,80,.7);}
        .obox.fl{border-color:rgba(59,130,246,.7);background:rgba(37,99,235,.08);color:#60a5fa;}
        .back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#64748b;font-size:13px;padding:0;margin-bottom:18px;transition:color .15s;font-family:inherit;}
        .back:hover{color:#94a3b8;}
        .tr{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:24px;}
        .ti{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#334155;}
        .sp{animation:spin .7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .rr{text-align:center;margin-top:12px;}
        .rb{background:none;border:none;cursor:pointer;color:#60a5fa;font-size:13px;font-family:inherit;padding:0;transition:color .15s;}
        .rb:hover{color:#93c5fd;}
        .rc{font-size:13px;color:#475569;}
        .divider{height:1px;background:rgba(71,85,105,.2);margin:4px 0 12px;}
      `}</style>

      <div className="ap">
        <div className="g1"/><div className="g2"/><div className="gr"/>

        <div className="ac">
          <div className="al"><SovloLogo size="lg" theme="dark"/></div>

          <div className="card">
            <div className="bar"/>
            <div className="cb">

              {/* ── STEP 1: Form ─────────────────────────────────────── */}
              {step === 'form' && (
                <>
                  <div className="h1">Hesap Oluştur</div>
                  <div className="sub">Ücretsiz başlayın — 50 lead hediye</div>

                  <form onSubmit={e => { e.preventDefault(); handleRegister() }}>
                    {error && <div className="err">{error}</div>}

                    <label className="lbl">Ad Soyad <span className="req">*</span></label>
                    <div className="iw">
                      <span className="ii">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
                        required autoFocus autoComplete="name" placeholder="Ahmet Yılmaz" className="inp"/>
                    </div>

                    <label className="lbl">Firma Adı</label>
                    <div className="iw">
                      <span className="ii">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                        </svg>
                      </span>
                      <input type="text" value={company} onChange={e => { setCompany(e.target.value); setError('') }}
                        autoComplete="organization" placeholder="Örnek Ticaret A.Ş." className="inp"/>
                    </div>

                    <label className="lbl">Kurumsal E-posta <span className="req">*</span></label>
                    <div className="iw" style={{ marginBottom: 4 }}>
                      <span className="ii">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                        required autoComplete="email" placeholder="siz@firma.com" className="inp"/>
                    </div>
                    <p className="note">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                      </svg>
                      Gmail, Hotmail vb. kabul edilmez · Bu adrese doğrulama kodu gönderilir
                    </p>

                    <label className="lbl">Şifre <span className="req">*</span></label>
                    <div className="iw">
                      <span className="ii">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <input type={showPw ? 'text' : 'password'} value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        required autoComplete="new-password" placeholder="En az 6 karakter" className="inp"/>
                      <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                        {showPw ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>

                    <button type="submit"
                      disabled={loading || !name.trim() || !email.trim() || !password}
                      className="btn">
                      {loading ? (
                        <>
                          <svg className="sp" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                          Hesap oluşturuluyor...
                        </>
                      ) : 'Kayıt Ol ve Kodu Al →'}
                    </button>
                  </form>

                  <div className="lr">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/login" className="lnk">Giriş Yap</Link>
                  </div>
                </>
              )}

              {/* ── STEP 2: OTP ──────────────────────────────────────── */}
              {step === 'otp' && (
                <>
                  <button onClick={() => { setStep('form'); setOtp(['','','','','','']); setError('') }} className="back">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
                    </svg>
                    Geri
                  </button>

                  <div className="h1">E-postanızı Doğrulayın</div>
                  <div className="sub">Hesabınız oluşturuldu</div>

                  <div className="ib">
                    <div className="ir">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                      <span style={{ flex: 1 }}>{maskedEmail}</span>
                      <span style={{ fontSize: 11, color: '#334155' }}>10 dk geçerli</span>
                    </div>
                  </div>

                  {error && <div className="err">{error}</div>}

                  <p className="otp-lbl">6 haneli kodu girin</p>
                  <div className="otp-boxes">
                    {otp.map((digit, i) => (
                      <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={6}
                        value={digit} onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        className={`obox${digit ? ' fl' : ''}`}/>
                    ))}
                  </div>

                  <button onClick={handleVerify} disabled={loading || otp.some(d => d === '')} className="btn">
                    {loading ? (
                      <>
                        <svg className="sp" width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Doğrulanıyor...
                      </>
                    ) : 'Doğrula ve Başla →'}
                  </button>

                  <div className="rr">
                    {resendCooldown > 0 ? (
                      <span className="rc">Tekrar gönder ({resendCooldown}s)</span>
                    ) : (
                      <button className="rb" onClick={handleResend} disabled={loading}>
                        Kod gelmedi? Tekrar gönder
                      </button>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>

          <div className="tr">
            <div className="ti">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              256-bit SSL
            </div>
            <div className="ti">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              KVKK Uyumlu
            </div>
            <div className="ti">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Ücretsiz Başla
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
