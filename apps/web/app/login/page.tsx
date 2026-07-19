'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import SovloLogo from '@/components/SovloLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

type Step = 'identifier' | 'otp'

export default function LoginPage() {
  const { verifyOTP } = useAuth()

  const [step, setStep]             = useState<Step>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp]               = useState(['', '', '', '', '', ''])
  const [maskedEmail, setMaskedEmail]   = useState('')
  const [maskedPhone, setMaskedPhone]   = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.every(d => d !== '') && step === 'otp') {
      handleVerify()
    }
  }, [otp])

  const sendOTP = useCallback(async (id = identifier) => {
    if (!id.trim()) {
      setError('Email veya telefon numarası giriniz')
      return
    }
    setLoading(true)
    setError('')
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
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [identifier])

  const handleVerify = useCallback(async () => {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      await verifyOTP(identifier.trim(), code)
      // verifyOTP redirects internally
    } catch (e: any) {
      setError(e.message || 'Kod hatalı')
      // Clear OTP fields on error
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs[0].current?.focus(), 50)
    }
    setLoading(false)
  }, [otp, identifier, verifyOTP])

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[i] === '' && i > 0) {
        const next = [...otp]; next[i - 1] = ''
        setOtp(next)
        otpRefs[i - 1].current?.focus()
      } else {
        const next = [...otp]; next[i] = ''
        setOtp(next)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      otpRefs[i - 1].current?.focus()
    } else if (e.key === 'ArrowRight' && i < 5) {
      otpRefs[i + 1].current?.focus()
    }
  }

  const handleOtpChange = (i: number, val: string) => {
    // Handle paste (e.g. pasting full 6-digit code)
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('')
      if (digits.length === 6) {
        setOtp(digits)
        otpRefs[5].current?.focus()
        return
      }
    }
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit
    setOtp(next)
    if (digit && i < 5) {
      setTimeout(() => otpRefs[i + 1].current?.focus(), 0)
    }
  }

  const isPhone = identifier.trim() && !identifier.includes('@')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <SovloLogo size="lg" theme="dark" />
          </div>
          <p className="text-slate-400 text-sm">
            {step === 'identifier' ? 'Business email veya telefon numaranızı girin' : 'Gelen doğrulama kodunu girin'}
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">

          {/* ── STEP 1: Identifier ─────────────────────────────────────── */}
          {step === 'identifier' && (
            <form onSubmit={e => { e.preventDefault(); sendOTP() }} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Business Email veya Telefon
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError('') }}
                  autoFocus
                  autoComplete="email tel"
                  placeholder="ornek@firma.com veya +90 555 000 0000"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
                />
                <p className="text-slate-500 text-xs mt-2">
                  {isPhone
                    ? 'Telefon numaranıza SMS kodu gönderilecek'
                    : 'Email adresinize ve telefon numaranıza kod gönderilecek'
                  }
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Kod gönderiliyor...
                  </>
                ) : 'Doğrulama Kodu Gönder →'}
              </button>

              <p className="text-center text-slate-400 text-sm">
                Hesabınız yok mu?{' '}
                <Link href="/register" className="text-blue-400 hover:text-blue-300 transition">
                  Kayıt Ol
                </Link>
              </p>
            </form>
          )}

          {/* ── STEP 2: OTP ────────────────────────────────────────────── */}
          {step === 'otp' && (
            <div className="space-y-6">
              {/* Back button */}
              <button
                onClick={() => { setStep('identifier'); setOtp(['','','','','','']); setError('') }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
                </svg>
                Geri
              </button>

              {/* Where code was sent */}
              <div className="bg-slate-700/40 rounded-xl p-4 space-y-2">
                <p className="text-slate-300 text-sm font-medium">Kod gönderildi:</p>
                {maskedEmail && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <span>{maskedEmail}</span>
                  </div>
                )}
                {maskedPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2"/>
                      <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    <span>{maskedPhone}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
              )}

              {/* 6-digit OTP boxes */}
              <div>
                <p className="text-slate-300 text-sm mb-4 text-center">6 haneli kodu girin</p>
                <div className="flex gap-3 justify-center">
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
                      className={`
                        w-12 h-14 text-center text-xl font-bold rounded-xl border-2
                        bg-slate-700/60 text-white
                        focus:outline-none transition
                        ${digit ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 focus:border-blue-500'}
                      `}
                    />
                  ))}
                </div>
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={loading || otp.some(d => d === '')}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Doğrulanıyor...
                  </>
                ) : 'Giriş Yap'}
              </button>

              {/* Resend */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-slate-500 text-sm">
                    Kodu tekrar gönder ({resendCooldown}s)
                  </p>
                ) : (
                  <button
                    onClick={() => { setOtp(['','','','','','']); sendOTP() }}
                    className="text-blue-400 hover:text-blue-300 text-sm transition"
                  >
                    Kod gelmedi? Tekrar gönder
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
