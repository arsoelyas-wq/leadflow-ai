'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import SovloLogo from '@/components/SovloLogo'

export default function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      await login(email.trim(), password)
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız')
    }
    setLoading(false)
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
        .cb{padding:36px 36px 32px;}
        @media(max-width:480px){.cb{padding:28px 24px 24px;}}
        .h1{font-size:22px;font-weight:700;color:#f1f5f9;margin-bottom:6px;}
        .sub{font-size:14px;color:#64748b;margin-bottom:28px;}
        .lbl{display:block;font-size:12.5px;font-weight:500;color:#94a3b8;margin-bottom:7px;letter-spacing:.01em;}
        .iw{position:relative;margin-bottom:14px;}
        .ii{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#475569;pointer-events:none;}
        .inp{width:100%;background:rgba(20,32,55,.7);border:1px solid rgba(71,85,105,.5);border-radius:10px;padding:13px 14px 13px 42px;font-size:14.5px;color:#f1f5f9;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;}
        .inp::placeholder{color:#334155;}
        .inp:focus{border-color:rgba(59,130,246,.6);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
        .pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#475569;cursor:pointer;padding:4px;transition:color .15s;}
        .pw-toggle:hover{color:#94a3b8;}
        .hint{font-size:11.5px;color:#334155;margin-top:5px;margin-bottom:14px;display:flex;align-items:center;gap:4px;}
        .btn{width:100%;padding:13px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb 0%,#6366f1 100%);color:#fff;font-size:14.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s,box-shadow .2s,transform .15s;box-shadow:0 4px 20px rgba(37,99,235,.3);font-family:inherit;margin-top:8px;}
        .btn:hover:not(:disabled){opacity:.92;box-shadow:0 6px 28px rgba(37,99,235,.4);transform:translateY(-1px);}
        .btn:active:not(:disabled){transform:translateY(0);}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .lr{text-align:center;font-size:13.5px;color:#475569;margin-top:20px;}
        .lnk{color:#60a5fa;text-decoration:none;font-weight:500;}
        .lnk:hover{color:#93c5fd;}
        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-bottom:14px;}
        .tr{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:24px;}
        .ti{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#334155;}
        .sp{animation:spin .7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fp{text-align:right;margin-bottom:14px;}
        .fp a{font-size:12.5px;color:#475569;text-decoration:none;transition:color .15s;}
        .fp a:hover{color:#60a5fa;}
      `}</style>

      <div className="ap">
        <div className="g1"/><div className="g2"/><div className="gr"/>

        <div className="ac">
          <div className="al"><SovloLogo size="lg" theme="dark"/></div>

          <div className="card">
            <div className="bar"/>
            <div className="cb">
              <div className="h1">Giriş Yap</div>
              <div className="sub">Kurumsal e-posta ve şifrenizle giriş yapın</div>

              <form onSubmit={handleSubmit}>
                {error && <div className="err">{error}</div>}

                <label className="lbl">E-posta</label>
                <div className="iw">
                  <span className="ii">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    autoFocus
                    autoComplete="email"
                    placeholder="siz@firma.com"
                    className="inp"
                    required
                  />
                </div>

                <label className="lbl">Şifre</label>
                <div className="iw" style={{ marginBottom: 4 }}>
                  <span className="ii">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="inp"
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>

                <div className="fp">
                  <Link href="/reset-password">Şifremi unuttum</Link>
                </div>

                <button type="submit" disabled={loading || !email.trim() || !password} className="btn">
                  {loading ? (
                    <>
                      <svg className="sp" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Giriş yapılıyor...
                    </>
                  ) : 'Giriş Yap →'}
                </button>
              </form>

              <div className="lr">
                Hesabınız yok mu?{' '}
                <Link href="/register" className="lnk">Kayıt Ol</Link>
              </div>
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
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              7/24 Destek
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
