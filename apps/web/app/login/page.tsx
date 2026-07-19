'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import SovloLogo from '@/components/SovloLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

type Step = 'identifier' | 'otp'

export default function LoginPage() {
  const { verifyOTP } = useAuth()

  const [step, setStep]                   = useState<Step>('identifier')
  const [identifier, setIdentifier]       = useState('')
  const [otp, setOtp]                     = useState(['', '', '', '', '', ''])
  const [maskedEmail, setMaskedEmail]     = useState('')
  const [maskedPhone, setMaskedPhone]     = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
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

  const sendOTP = useCallback(async (id = identifier) => {
    if (!id.trim()) { setError('E-posta veya telefon numarası giriniz'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kod gönderilemedi')
      setMaskedEmail(data.masked_email || '')
      setMaskedPhone(data.masked_phone || null)
      setStep('otp')
      setResendCooldown(60)
      setTimeout(() => otpRefs[0].current?.focus(), 100)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [identifier])

  const handleVerify = useCallback(async () => {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true); setError('')
    try {
      await verifyOTP(identifier.trim(), code)
    } catch (e: any) {
      setError(e.message || 'Kod hatalı')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs[0].current?.focus(), 50)
    }
    setLoading(false)
  }, [otp, identifier, verifyOTP])

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

  const isPhone = identifier.trim() && !identifier.includes('@')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .auth-page {
          min-height: 100vh;
          background: #050c1a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .auth-glow-1 {
          position: fixed; top: -15%; left: 10%; width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }
        .auth-glow-2 {
          position: fixed; bottom: -20%; right: 0%; width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }
        .auth-grid {
          position: fixed; inset: 0;
          background-image: radial-gradient(rgba(148,163,184,0.04) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none; z-index: 0;
        }
        .auth-content { position: relative; z-index: 1; width: 100%; max-width: 440px; }
        .auth-logo { text-align: center; margin-bottom: 32px; }
        .auth-card {
          background: rgba(9, 18, 36, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(59,130,246,0.06),
            0 24px 80px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .auth-card-accent {
          height: 3px;
          background: linear-gradient(90deg, #1d4ed8, #6366f1, #1d4ed8);
          background-size: 200% 100%;
          animation: auth-shimmer 4s ease infinite;
        }
        @keyframes auth-shimmer {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 0%; }
          100% { background-position: 0% 0%; }
        }
        .auth-card-body { padding: 36px 36px 32px; }
        @media (max-width: 480px) { .auth-card-body { padding: 28px 24px 24px; } }
        .auth-heading { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px; }
        .auth-sub { font-size: 14px; color: #64748b; margin-bottom: 28px; }
        .auth-label { display: block; font-size: 12.5px; font-weight: 500; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.01em; }
        .auth-input-wrap { position: relative; margin-bottom: 16px; }
        .auth-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #475569; pointer-events: none;
        }
        .auth-input {
          width: 100%;
          background: rgba(20, 32, 55, 0.7);
          border: 1px solid rgba(71,85,105,0.5);
          border-radius: 10px;
          padding: 13px 14px 13px 42px;
          font-size: 14.5px;
          color: #f1f5f9;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .auth-input::placeholder { color: #334155; }
        .auth-input:focus {
          border-color: rgba(59,130,246,0.6);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .auth-hint { font-size: 12px; color: #475569; margin-top: 6px; }
        .auth-btn {
          width: 100%;
          padding: 13px 20px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
          color: #fff;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(37,99,235,0.3);
          font-family: inherit;
          margin-top: 8px;
        }
        .auth-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 28px rgba(37,99,235,0.4);
          transform: translateY(-1px);
        }
        .auth-btn:active:not(:disabled) { transform: translateY(0); }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-link-row { text-align: center; font-size: 13.5px; color: #475569; margin-top: 20px; }
        .auth-link { color: #60a5fa; text-decoration: none; font-weight: 500; }
        .auth-link:hover { color: #93c5fd; }
        .auth-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 16px;
        }
        .auth-info-box {
          background: rgba(30,41,59,0.5);
          border: 1px solid rgba(71,85,105,0.3);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }
        .auth-info-title { font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .auth-info-row { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #94a3b8; }
        .auth-info-row + .auth-info-row { margin-top: 6px; }
        .otp-label { text-align: center; font-size: 13.5px; color: #94a3b8; margin-bottom: 16px; }
        .otp-boxes { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
        .otp-box {
          width: 48px; height: 56px;
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          border-radius: 10px;
          border: 2px solid rgba(71,85,105,0.5);
          background: rgba(20,32,55,0.7);
          color: #f1f5f9;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .otp-box:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
          background: rgba(30,48,80,0.7);
        }
        .otp-box.filled {
          border-color: rgba(59,130,246,0.7);
          background: rgba(37,99,235,0.08);
          color: #60a5fa;
        }
        .auth-back-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          color: #64748b; font-size: 13px; padding: 0;
          margin-bottom: 20px; transition: color 0.15s;
          font-family: inherit;
        }
        .auth-back-btn:hover { color: #94a3b8; }
        .auth-trust { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 24px; }
        .auth-trust-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: #334155; }
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .resend-row { text-align: center; margin-top: 4px; }
        .resend-btn { background: none; border: none; cursor: pointer; color: #60a5fa; font-size: 13px; font-family: inherit; padding: 0; transition: color 0.15s; }
        .resend-btn:hover { color: #93c5fd; }
        .resend-countdown { font-size: 13px; color: #475569; }
      `}</style>

      <div className="auth-page">
        <div className="auth-glow-1" />
        <div className="auth-glow-2" />
        <div className="auth-grid" />

        <div className="auth-content">
          {/* Logo */}
          <div className="auth-logo">
            <SovloLogo size="lg" theme="dark" />
          </div>

          <div className="auth-card">
            <div className="auth-card-accent" />
            <div className="auth-card-body">

              {/* ── STEP 1: Identifier ───────────────────────────────── */}
              {step === 'identifier' && (
                <>
                  <div className="auth-heading">Giriş Yap</div>
                  <div className="auth-sub">E-posta veya telefon numaranızı girin</div>

                  <form onSubmit={e => { e.preventDefault(); sendOTP() }}>
                    {error && <div className="auth-error">{error}</div>}

                    <label className="auth-label">E-posta veya Telefon</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={identifier}
                        onChange={e => { setIdentifier(e.target.value); setError('') }}
                        autoFocus
                        autoComplete="email tel"
                        placeholder="ornek@firma.com veya +90 555 000 0000"
                        className="auth-input"
                      />
                    </div>
                    <p className="auth-hint">
                      {isPhone
                        ? 'Telefon numaranıza SMS kodu gönderilecek'
                        : 'E-posta adresinize doğrulama kodu gönderilecek'}
                    </p>

                    <button type="submit" disabled={loading || !identifier.trim()} className="auth-btn">
                      {loading ? (
                        <>
                          <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                          Kod gönderiliyor...
                        </>
                      ) : 'Doğrulama Kodu Gönder →'}
                    </button>
                  </form>

                  <div className="auth-link-row">
                    Hesabınız yok mu?{' '}
                    <Link href="/register" className="auth-link">Kayıt Ol</Link>
                  </div>
                </>
              )}

              {/* ── STEP 2: OTP ──────────────────────────────────────── */}
              {step === 'otp' && (
                <>
                  <button
                    onClick={() => { setStep('identifier'); setOtp(['','','','','','']); setError('') }}
                    className="auth-back-btn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
                    </svg>
                    Geri
                  </button>

                  <div className="auth-heading">Kodu Girin</div>
                  <div className="auth-sub" style={{ marginBottom: 20 }}>Doğrulama kodu gönderildi</div>

                  <div className="auth-info-box">
                    {maskedEmail && (
                      <div className="auth-info-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                        {maskedEmail}
                      </div>
                    )}
                    {maskedPhone && (
                      <div className="auth-info-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2"/>
                          <line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                        {maskedPhone}
                      </div>
                    )}
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <p className="otp-label">6 haneli kodu girin</p>
                  <div className="otp-boxes">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={otpRefs[i]}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        className={`otp-box${digit ? ' filled' : ''}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={loading || otp.some(d => d === '')}
                    className="auth-btn"
                  >
                    {loading ? (
                      <>
                        <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Doğrulanıyor...
                      </>
                    ) : 'Giriş Yap'}
                  </button>

                  <div className="resend-row" style={{ marginTop: 16 }}>
                    {resendCooldown > 0 ? (
                      <span className="resend-countdown">Tekrar gönder ({resendCooldown}s)</span>
                    ) : (
                      <button
                        className="resend-btn"
                        onClick={() => { setOtp(['','','','','','']); sendOTP() }}
                      >
                        Kod gelmedi? Tekrar gönder
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Trust row */}
          <div className="auth-trust">
            <div className="auth-trust-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              256-bit SSL
            </div>
            <div className="auth-trust-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              KVKK Uyumlu
            </div>
            <div className="auth-trust-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              7/24 Destek
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
