'use client';
import { useState } from 'react';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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

  const inputStyle = { width: '100%', background: '#1c1c2a', border: '1px solid rgba(255,255,255,0.07)', color: '#f5f0e8', padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,0.4)', marginBottom: 8 };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>

      <div style={{ width: '100%', maxWidth: 460, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 300, color: '#f5f0e8', marginBottom: 8 }}>
            Lead<span style={{ color: '#B8892A' }}>Flow</span> AI
          </div>
          <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14 }}>Ücretsiz hesap oluşturun — 50 lead hediye</p>
        </div>

        <div style={{ background: '#15151f', border: '1px solid rgba(255,255,255,0.07)', padding: 40 }}>
          {error && (
            <div style={{ background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: '#e05555', padding: '12px 16px', fontSize: 13, marginBottom: 24 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Ad Soyad</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ahmet Yılmaz" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Şirket</label>
              <input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Firma A.Ş." style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="ornek@firma.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>Şifre</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="En az 6 karakter" style={inputStyle} />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(184,137,42,0.5)' : '#B8892A', color: '#0a0a0f', border: 'none', padding: '14px', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            {loading ? 'Hesap oluşturuluyor...' : 'Ücretsiz Başla →'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(245,240,232,0.2)', lineHeight: 1.6 }}>
            Kayıt olarak kullanım şartlarını kabul etmiş olursunuz.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(245,240,232,0.3)' }}>
          Zaten hesabınız var mı?{' '}
          <a href="/login" style={{ color: '#B8892A', textDecoration: 'none' }}>Giriş yapın</a>
        </p>
      </div>
    </main>
  );
}