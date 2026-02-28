'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 300, color: '#f5f0e8', marginBottom: 8 }}>
            Lead<span style={{ color: '#B8892A' }}>Flow</span> AI
          </div>
          <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14 }}>Hesabınıza giriş yapın</p>
        </div>

        <div style={{ background: '#15151f', border: '1px solid rgba(255,255,255,0.07)', padding: 40 }}>
          {error && (
            <div style={{ background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: '#e05555', padding: '12px 16px', fontSize: 13, marginBottom: 24 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', marginBottom: 8 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="ornek@firma.com"
              style={{ width: '100%', background: '#1c1c2a', border: '1px solid rgba(255,255,255,0.07)', color: '#f5f0e8', padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', marginBottom: 8 }}>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{ width: '100%', background: '#1c1c2a', border: '1px solid rgba(255,255,255,0.07)', color: '#f5f0e8', padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(184,137,42,0.5)' : '#B8892A', color: '#0a0a0f', border: 'none', padding: '14px', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(245,240,232,0.3)' }}>
          Hesabınız yok mu?{' '}
          <a href="/register" style={{ color: '#B8892A', textDecoration: 'none' }}>Kayıt olun</a>
        </p>
      </div>
    </main>
  );
}