'use client';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      window.location.href = '/login';
      return;
    }
    setUser(JSON.parse(userData));
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const mockLeads = [
    { id: 1, company_name: 'Özdemir Ev Tekstil A.Ş.', city: 'İstanbul', source: 'Google Maps', status: 'new', score: 92 },
    { id: 2, company_name: '@dekorcity_toptan', city: 'Ankara', source: 'Instagram', status: 'contacted', score: 78 },
    { id: 3, company_name: 'Mavi Aksesuar Ltd.', city: 'İzmir', source: 'LinkedIn', status: 'replied', score: 85 },
    { id: 4, company_name: 'Anadolu Toptancı', city: 'Bursa', source: 'Google Maps', status: 'new', score: 71 },
    { id: 5, company_name: 'Star Dekorasyon', city: 'İstanbul', source: 'Facebook', status: 'new', score: 66 },
  ];

  const statusColor: any = { new: '#4aad7f', contacted: '#B8892A', replied: '#4a7fa5', converted: '#7c4dff' };
  const statusLabel: any = { new: 'Yeni', contacted: 'Mesaj Gönderildi', replied: 'Yanıt Verdi', converted: 'Müşteri Oldu' };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B8892A', fontFamily: 'DM Sans, sans-serif' }}>Yükleniyor...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: '#f5f0e8' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* SIDEBAR */}
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, background: '#10101a', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
        <div style={{ padding: '28px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 300 }}>
            Lead<span style={{ color: '#B8892A' }}>Flow</span> AI
          </div>
          <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', marginTop: 4, letterSpacing: '0.08em' }}>DASHBOARD</div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {[
            { id: 'overview', icon: '◈', label: 'Genel Bakış' },
            { id: 'leads', icon: '⬡', label: 'Leadler' },
            { id: 'campaigns', icon: '◎', label: 'Kampanyalar' },
            { id: 'messages', icon: '◷', label: 'Mesajlar' },
            { id: 'ai', icon: '✦', label: 'AI Asistan' },
            { id: 'settings', icon: '◉', label: 'Ayarlar' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: activeTab === item.id ? 'rgba(184,137,42,0.1)' : 'transparent', border: 'none', borderLeft: activeTab === item.id ? '2px solid #B8892A' : '2px solid transparent', color: activeTab === item.id ? '#B8892A' : 'rgba(245,240,232,0.4)', fontSize: 13, fontWeight: activeTab === item.id ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', marginBottom: 4 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.25)', marginBottom: 16 }}>{user?.email}</div>
          <div style={{ background: 'rgba(184,137,42,0.1)', border: '1px solid rgba(184,137,42,0.2)', padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#B8892A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Starter Plan</div>
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)' }}>{user?.credits_used || 0} / {user?.credits_total || 50} lead</div>
            <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.07)', marginTop: 6, borderRadius: 2 }}>
              <div style={{ width: `${((user?.credits_used || 0) / (user?.credits_total || 50)) * 100}%`, height: '100%', background: '#B8892A', borderRadius: 2 }} />
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,240,232,0.3)', padding: '8px', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: 240, padding: 40, minHeight: '100vh' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 300 }}>
              Hoş geldiniz, <span style={{ color: '#B8892A' }}>{user?.name?.split(' ')[0]}</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', marginTop: 4 }}>
              Sisteminiz aktif — leadler toplanıyor
            </p>
          </div>
          <button style={{ background: '#B8892A', color: '#0a0a0f', border: 'none', padding: '12px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em' }}>
            + Kampanya Başlat
          </button>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 32 }}>
          {[
            { label: 'Toplam Lead', value: '247', change: '+34 bu hafta', color: '#4aad7f' },
            { label: 'Gönderilen Mesaj', value: '89', change: '+12 bugün', color: '#B8892A' },
            { label: 'Yanıt Oranı', value: '%11.2', change: 'Sektör ort: %8', color: '#4a7fa5' },
            { label: 'Aktif Kampanya', value: '3', change: '2 devam ediyor', color: '#7c4dff' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#15151f', padding: '28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', marginBottom: 12 }}>{stat.label}</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 44, fontWeight: 300, color: stat.color, lineHeight: 1, marginBottom: 8 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>{stat.change}</div>
            </div>
          ))}
        </div>

        {/* LEADS TABLE */}
        <div style={{ background: '#15151f', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.5)' }}>Son Leadler</div>
            <a href="#" style={{ fontSize: 12, color: '#B8892A', textDecoration: 'none' }}>Tümünü gör →</a>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Firma', 'Şehir', 'Kaynak', 'Skor', 'Durum', 'İşlem'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.25)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockLeads.map((lead, i) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 500 }}>{lead.company_name}</td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: 'rgba(245,240,232,0.5)' }}>{lead.city}</td>
                  <td style={{ padding: '16px 20px', fontSize: 12, color: 'rgba(245,240,232,0.4)' }}>{lead.source}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                        <div style={{ width: `${lead.score}%`, height: '100%', background: lead.score > 80 ? '#4aad7f' : '#B8892A', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)' }}>{lead.score}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', background: `${statusColor[lead.status]}15`, color: statusColor[lead.status], border: `1px solid ${statusColor[lead.status]}30` }}>
                      {statusLabel[lead.status]}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <button style={{ background: 'transparent', border: '1px solid rgba(184,137,42,0.3)', color: '#B8892A', padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em' }}>
                      Mesaj Gönder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}