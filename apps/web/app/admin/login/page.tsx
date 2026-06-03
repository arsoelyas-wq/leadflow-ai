'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin-api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await adminApi.login(email, password)
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_email', data.email)
      router.push('/admin')
    } catch (err: any) { setError(err.message || 'Giriş başarısız') }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '13px 16px', color: '#e2e8f0', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }
  const label: React.CSSProperties = { display: 'block', color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 8 }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(239,68,68,0.12) 0%, transparent 55%), #020712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26, fontWeight: 900, color: '#fff', boxShadow: '0 12px 35px rgba(239,68,68,0.4)' }}>A</div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Admin Girişi</h1>
          <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>LeadFlow AI — Sistem Yönetimi</p>
        </div>

        <form onSubmit={login} style={{ background: 'linear-gradient(135deg,rgba(10,18,45,0.95),rgba(5,10,28,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={label}>Admin E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@leadflow.ai" style={inp} />
          </div>

          <div style={{ marginBottom: 28, position: 'relative' }}>
            <label style={label}>Şifre</label>
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••" style={{ ...inp, paddingRight: 46 }} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: 14, top: 36, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? 'rgba(239,68,68,0.5)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 20px rgba(239,68,68,0.35)', transition: 'all 0.2s', fontFamily: 'inherit' }}>
            {loading ? '⏳ Giriş yapılıyor...' : '🔐 Admin Girişi Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 12, marginTop: 20 }}>
          Bu panel yalnızca sistem yöneticileri içindir.
        </p>
      </div>
    </div>
  )
}
