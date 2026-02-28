'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [activeSection, setActiveSection] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Merhaba! 👋 Ben LeadFlow AI asistanınım. Sektörünüzü seçin, size özel sistemi kuralım.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [convoStep, setConvoStep] = useState(0);
  const [showLeads, setShowLeads] = useState(false);

  const sectors = [
    { id: 'dekorasyon', label: 'Dekorasyon', icon: '🏺' },
    { id: 'tekstil', label: 'Tekstil', icon: '🧵' },
    { id: 'gida', label: 'Gıda & İçecek', icon: '🫙' },
    { id: 'kozmetik', label: 'Kozmetik', icon: '✨' },
    { id: 'elektronik', label: 'Elektronik', icon: '💡' },
    { id: 'mobilya', label: 'Mobilya', icon: '🪑' },
    { id: 'hediyelik', label: 'Hediyelik', icon: '🎁' },
    { id: 'diger', label: 'Diğer...', icon: '⊕' },
  ];

  const conversations = {
    dekorasyon: [
      { text: 'Harika! Dekorasyon sektörünü seçtiniz. 🏺\n\nHangi tür ürünler üretiyorsunuz?', replies: ['El yapımı seramik', 'Modern ev aksesuarı', 'Vintage & retro'] },
      { text: 'Ürünlerinizin fiyat segmenti nerede?', replies: ['Ekonomik (₺50–200)', 'Orta (₺200–800)', 'Premium (₺800+)'] },
      { text: 'Hangi şehirlerdeki toptancılara ulaşmak istiyorsunuz?', replies: ['Önce İstanbul', 'Tüm Türkiye', 'İhracat da dahil'] },
      { text: '✅ Analiziniz tamamlandı!\n\n🎯 Hedef: Premium dekorasyon toptancıları\n📍 Tahmini lead: 2.847 firma\n📊 Önerilen kanal: Instagram DM + WhatsApp\n\nSistem lead toplamaya başlıyor...', replies: [] },
    ],
    tekstil: [
      { text: 'Tekstil sektörünü seçtiniz! 🧵\n\nNe tür tekstil ürünleri üretiyorsunuz?', replies: ['Ev tekstili', 'Kumaş & ham madde', 'Giyim aksesuar'] },
      { text: 'Üretiminiz hangi şehirde?', replies: ['Bursa', 'İstanbul', 'Diğer şehir'] },
      { text: '✅ Tekstil profili hazırlandı!\n\n🎯 2.100+ aktif toptancı bulundu\n📊 WhatsApp + Email dizisi önerildi\n\nLead toplama başlıyor...', replies: [] },
    ],
    default: [
      { text: 'Bu sektör için analiz yapıyorum... 🔍\n\nKaç yıldır bu sektördesiniz?', replies: ['1-3 yıl', '3-10 yıl', '10+ yıl'] },
      { text: '✅ Profiliniz oluşturuldu!\n\n🎯 Sektörünüze özel lead tarama başladı\n📊 Tüm kanallar aktive edildi', replies: [] },
    ],
  };

  const fakeLeads = [
    { name: 'Özdemir Ev Tekstil A.Ş.', detail: 'İstanbul • Google Maps • ⭐ 4.7', tag: 'Sıcak', tagColor: '#e05555' },
    { name: '@dekorcity_toptan', detail: 'Instagram • 8.2K takipçi • Aktif', tag: 'İlgili', tagColor: '#B8892A' },
    { name: 'Mavi Aksesuar Ltd.', detail: 'Ankara • LinkedIn • Satın Alma Md.', tag: 'Yeni', tagColor: '#1A6B42' },
  ];

  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);
    setConvoStep(0);
    setShowLeads(false);

    const sectorLabel = sectors.find(s => s.id === sectorId)?.label || sectorId;
    const newMessages = [
      { role: 'ai', text: 'Merhaba! 👋 Ben LeadFlow AI asistanınım. Sektörünüzü seçin, size özel sistemi kuralım.' },
      { role: 'user', text: sectorLabel + ' sektöründeyim' },
    ];
    setChatMessages(newMessages);

    const convo = conversations[sectorId as keyof typeof conversations] || conversations.default;

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages([...newMessages, { role: 'ai', text: convo[0].text }]);
      setConvoStep(1);
      setTimeout(() => setShowLeads(true), 800);
    }, 1000);
  };

  const handleReply = (reply: string) => {
    const convo = conversations[selectedSector as keyof typeof conversations] || conversations.default;
    const newMessages = [...chatMessages, { role: 'user', text: reply }];
    setChatMessages(newMessages);

    if (convoStep < convo.length) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setChatMessages([...newMessages, { role: 'ai', text: convo[convoStep].text }]);
        setConvoStep(convoStep + 1);
      }, 1000);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const convo = conversations[selectedSector as keyof typeof conversations] || conversations.default;
    const newMessages = [...chatMessages, { role: 'user', text: inputValue }];
    setChatMessages(newMessages);
    setInputValue('');

    if (convoStep < convo.length) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setChatMessages([...newMessages, { role: 'ai', text: convo[convoStep].text }]);
        setConvoStep(convoStep + 1);
      }, 1000);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setChatMessages([...newMessages, { role: 'ai', text: 'Sisteminiz hazır! Dashboard\'a giriş yaparak tüm leadlerinizi yönetebilirsiniz. 🚀' }]);
      }, 1000);
    }
  };

  const currentConvo = conversations[selectedSector as keyof typeof conversations] || conversations.default;
  const currentReplies = convoStep > 0 && convoStep <= currentConvo.length
    ? currentConvo[convoStep - 1].replies
    : [];

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: '#0a0a0f', color: '#f5f0e8', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* GOOGLE FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: rgba(184,137,42,0.4); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); opacity:0.4; } 30% { transform:translateY(-6px); opacity:1; } }
        @keyframes msgIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .msg-new { animation: msgIn 0.3s ease both; }
        .sector-btn:hover { border-color: #B8892A !important; color: #f5f0e8 !important; background: rgba(184,137,42,0.08) !important; }
        .sector-btn.active { border-color: #B8892A !important; color: #B8892A !important; background: rgba(184,137,42,0.15) !important; }
        .btn-primary:hover { background: #d4a843 !important; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(184,137,42,0.3) !important; }
        .btn-ghost:hover { color: #f5f0e8 !important; border-color: rgba(255,255,255,0.3) !important; }
        .feature-card:hover { background: #1c1c2a !important; }
        .feature-card:hover .feat-icon { border-color: rgba(184,137,42,0.5) !important; }
        .reply-btn:hover { background: rgba(184,137,42,0.15) !important; }
        .send-btn:hover { background: #d4a843 !important; }
        .plan-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '18px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, letterSpacing: '0.05em' }}>
          Lead<span style={{ color: '#B8892A' }}>Flow</span> AI
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Nasıl Çalışır', 'Demo', 'Fiyatlar'].map(item => (
            <a key={item} href="#" style={{ color: 'rgba(245,240,232,0.5)', textDecoration: 'none', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = '#f5f0e8'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(245,240,232,0.5)'}
            >{item}</a>
          ))}
        </div>
        <button className="btn-primary" style={{ background: '#B8892A', color: '#0a0a0f', border: 'none', padding: '10px 24px', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.2s' }}>
          Ücretsiz Başla
        </button>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 48px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(184,137,42,0.05)', top: -100, left: -200, filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(74,127,165,0.07)', bottom: -100, right: -150, filter: 'blur(120px)', pointerEvents: 'none' }} />

        <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(184,137,42,0.35)', padding: '6px 16px', fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#B8892A', marginBottom: 40 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B8892A', animation: 'pulse 2s infinite', display: 'inline-block' }} />
          Yapay Zeka Destekli Satış Otomasyonu
        </div>

        <h1 className="fade-up" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(52px, 8vw, 88px)', fontWeight: 300, lineHeight: 1.05, marginBottom: 28, animationDelay: '0.1s' }}>
          Sektörünü söyle,<br /><em style={{ fontStyle: 'italic', color: '#B8892A' }}>gerisini biz halledelim</em>
        </h1>

        <p className="fade-up" style={{ fontSize: 17, fontWeight: 300, color: 'rgba(245,240,232,0.5)', maxWidth: 540, lineHeight: 1.75, marginBottom: 52, animationDelay: '0.2s' }}>
          Google Maps, Instagram, Facebook ve LinkedIn'den toptancıları otomatik bulur, kişiselleştirilmiş mesajlar üretir, WhatsApp + Email + Instagram'dan gönderir.
        </p>

        <div className="fade-up" style={{ display: 'flex', gap: 16, animationDelay: '0.3s' }}>
          <button className="btn-primary" style={{ background: '#B8892A', color: '#0a0a0f', border: 'none', padding: '16px 36px', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.25s' }}>
            Canlı Demo Gör →
          </button>
          <button className="btn-ghost" style={{ background: 'transparent', color: 'rgba(245,240,232,0.5)', border: '1px solid rgba(255,255,255,0.12)', padding: '16px 36px', fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
            Nasıl Çalışır?
          </button>
        </div>

        <div className="fade-up" style={{ display: 'flex', gap: 64, marginTop: 80, paddingTop: 48, borderTop: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.4s' }}>
          {[['47+', 'Sektör Desteği'], ['12K', 'Aylık Lead'], ['3.4×', 'Daha Fazla Cevap'], ['7/24', 'Otonom Çalışma']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: '#B8892A', lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.25)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section style={{ padding: '100px 48px', background: '#10101a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8892A', marginBottom: 12 }}>Sistem Mimarisi</div>
          <div style={{ width: 48, height: 1, background: '#B8892A', marginBottom: 20 }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, marginBottom: 60 }}>4 adımda tam otomasyon</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              ['01', 'AI Onboarding', 'Sektörünüzü seçin, ürünlerinizi anlatın. AI hedef kitlenizi öğrenir ve stratejinizi kişiselleştirir.'],
              ['02', 'Lead Toplama', 'Google Maps, Instagram, Facebook ve LinkedIn\'den hedef toptancılar saniyeler içinde listelenir.'],
              ['03', 'Mesaj Üretimi', 'Her lead için profiline özel, GPT destekli kişiselleştirilmiş mesajlar otomatik üretilir.'],
              ['04', 'Çoklu Kanal', 'WhatsApp, Email ve Instagram\'dan otomatik dizi başlatılır. Cevap gelince anında bildirim.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="feature-card" style={{ background: '#15151f', padding: '40px 28px', transition: 'background 0.3s', cursor: 'default' }}>
                <div style={{ width: 52, height: 52, border: '1px solid rgba(184,137,42,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'rgba(184,137,42,0.5)', marginBottom: 20 }}>{num}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: '#f5f0e8' }}>{title}</div>
                <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section style={{ padding: '100px 48px', background: '#0a0a0f' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8892A', marginBottom: 12 }}>Canlı Demo</div>
          <div style={{ width: 48, height: 1, background: '#B8892A', marginBottom: 20 }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, marginBottom: 12 }}>Şimdi deneyin</h2>
          <p style={{ fontSize: 15, color: 'rgba(245,240,232,0.45)', marginBottom: 48 }}>Sektörünüzü seçin, AI asistanımızın nasıl çalıştığını görün.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 580 }}>

            {/* SOL: SEKTÖR SEÇİCİ */}
            <div style={{ background: '#15151f', padding: 40, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#B8892A', marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                ⬡ Sektörünüzü Seçin
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                {sectors.map(sector => (
                  <button
                    key={sector.id}
                    className={`sector-btn ${selectedSector === sector.id ? 'active' : ''}`}
                    onClick={() => handleSectorSelect(sector.id)}
                    style={{ background: '#1c1c2a', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,240,232,0.5)', padding: '12px 14px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span style={{ fontSize: 16 }}>{sector.icon}</span>
                    {sector.label}
                  </button>
                ))}
              </div>

              {/* LEAD ÖNİZLEME */}
              {showLeads && (
                <div style={{ background: '#1c1c2a', border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', animation: 'msgIn 0.4s ease' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8892A', marginBottom: 12 }}>Bulunan Leadler (Anlık)</div>
                  {fakeLeads.map((lead, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < fakeLeads.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f5f0e8' }}>{lead.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)' }}>{lead.detail}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', background: `${lead.tagColor}20`, color: lead.tagColor, border: `1px solid ${lead.tagColor}40` }}>{lead.tag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SAĞ: AI CHAT */}
            <div style={{ background: '#1c1c2a', display: 'flex', flexDirection: 'column' }}>
              {/* Chat Header */}
              <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, background: '#15151f' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #B8892A, #7a5a18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0a0a0f', flexShrink: 0 }}>LF</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>LeadFlow Asistan</div>
                  <div style={{ fontSize: 11, color: '#4aad7f', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4aad7f', animation: 'pulse 2s infinite', display: 'inline-block' }} />
                    Çevrimiçi
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(245,240,232,0.3)', fontFamily: 'monospace' }}>claude-sonnet-4</div>
              </div>

              {/* Mesajlar */}
              <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 360 }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className="msg-new" style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.role === 'ai' ? 'linear-gradient(135deg, #B8892A, #7a5a18)' : '#4a7fa5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: msg.role === 'ai' ? '#0a0a0f' : 'white', flexShrink: 0 }}>
                      {msg.role === 'ai' ? 'LF' : 'SZ'}
                    </div>
                    <div style={{ maxWidth: '75%', padding: '10px 14px', fontSize: 13, lineHeight: 1.65, background: msg.role === 'ai' ? '#15151f' : '#B8892A', color: msg.role === 'ai' ? '#f5f0e8' : '#0a0a0f', fontWeight: msg.role === 'user' ? 500 : 400, border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.07)' : 'none', borderRadius: msg.role === 'ai' ? '0 8px 8px 8px' : '8px 0 8px 8px', whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #B8892A, #7a5a18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0a0a0f' }}>LF</div>
                    <div style={{ display: 'flex', gap: 4, padding: '12px 16px', background: '#15151f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 8px 8px 8px' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(245,240,232,0.4)', animation: `bounce 1.2s infinite ${i * 0.15}s`, display: 'inline-block' }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick replies */}
                {!isTyping && currentReplies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {currentReplies.map((reply, i) => (
                      <button key={i} className="reply-btn" onClick={() => handleReply(reply)}
                        style={{ background: 'transparent', border: '1px solid rgba(184,137,42,0.4)', color: '#B8892A', padding: '5px 12px', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'DM Sans' }}>
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, background: '#15151f' }}>
                <input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Mesajınızı yazın..."
                  style={{ flex: 1, background: '#1c1c2a', border: '1px solid rgba(255,255,255,0.07)', color: '#f5f0e8', padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
                />
                <button className="send-btn" onClick={handleSend}
                  style={{ background: '#B8892A', border: 'none', color: '#0a0a0f', padding: '10px 18px', fontSize: 14, cursor: 'pointer', transition: 'background 0.2s', fontWeight: 700 }}>
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FİYATLAR */}
      <section style={{ padding: '100px 48px', background: '#10101a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8892A', marginBottom: 12 }}>Fiyatlandırma</div>
          <div style={{ width: 48, height: 1, background: '#B8892A', marginBottom: 20 }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, marginBottom: 12 }}>Kullandığınız kadar ödeyin</h2>
          <p style={{ fontSize: 15, color: 'rgba(245,240,232,0.45)', marginBottom: 48 }}>Sabit aylık abonelik yok. Her işlem için küçük bir ücret.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { name: 'Starter', price: '₺0', sub: 'Kayıt ücretsiz', badge: null, features: ['AI onboarding (sınırsız)', 'İlk 50 lead ücretsiz', 'Manuel mesaj gönderim', 'Temel CRM dashboard', 'Email kanalı dahil'], cta: 'Ücretsiz Başla', primary: false },
              { name: 'Professional', price: '₺2', sub: 'Lead başına / Mesaj ₺0.5', badge: 'En Popüler', features: ['Sınırsız lead toplama', 'Tüm kanallar (WA+Email+IG)', 'GPT-4o mesaj üretimi', 'Otomatik takip dizileri', 'A/B test & analitik', 'Öncelikli destek'], cta: 'Hemen Başla →', primary: true },
              { name: 'Enterprise', price: 'Özel', sub: 'Hacime göre fiyat', badge: null, features: ['White-label çözüm', 'Özel API entegrasyonları', 'Dedicated sunucu', 'Kendi markanızla sat', 'SLA %99.9 garantisi', 'Özel onboarding ekibi'], cta: 'İletişime Geç', primary: false },
            ].map((plan) => (
              <div key={plan.name} className="plan-card" style={{ background: plan.primary ? '#1c1c2a' : '#15151f', padding: '44px 36px', transition: 'transform 0.2s', border: plan.primary ? '1px solid rgba(184,137,42,0.3)' : 'none', position: 'relative', zIndex: plan.primary ? 1 : 0, margin: plan.primary ? -1 : 0 }}>
                {plan.badge && <div style={{ display: 'inline-block', background: '#B8892A', color: '#0a0a0f', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px', marginBottom: 16 }}>{plan.badge}</div>}
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, marginBottom: 6 }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)', marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 300, color: '#f5f0e8', display: 'block', lineHeight: 1, marginBottom: 4 }}>{plan.price}</span>
                  {plan.sub}
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: 13, color: 'rgba(245,240,232,0.55)', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                      <span style={{ color: '#B8892A', fontSize: 10, flexShrink: 0, marginTop: 3 }}>✦</span>{f}
                    </li>
                  ))}
                </ul>
                <button style={{ width: '100%', background: plan.primary ? '#B8892A' : 'transparent', color: plan.primary ? '#0a0a0f' : 'rgba(245,240,232,0.6)', border: plan.primary ? 'none' : '1px solid rgba(255,255,255,0.15)', padding: '14px', fontFamily: 'DM Sans', fontSize: 14, fontWeight: plan.primary ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '120px 48px', background: '#0a0a0f', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,137,42,0.05) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 300, lineHeight: 1.1, marginBottom: 20 }}>
          Satış fabrikasını<br /><em style={{ color: '#B8892A' }}>bugün kurun</em>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(245,240,232,0.5)', marginBottom: 44, lineHeight: 1.7 }}>İlk 50 lead ücretsiz. Kredi kartı gerekmez.<br />15 dakikada sisteminiz devrede.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn-primary" style={{ background: '#B8892A', color: '#0a0a0f', border: 'none', padding: '18px 48px', fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s' }}>Ücretsiz Başla →</button>
          <button className="btn-ghost" style={{ background: 'transparent', color: 'rgba(245,240,232,0.5)', border: '1px solid rgba(255,255,255,0.12)', padding: '18px 48px', fontFamily: 'DM Sans', fontSize: 15, cursor: 'pointer', transition: 'all 0.2s' }}>Demo Talep Et</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0a0a0f', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: 'rgba(245,240,232,0.4)' }}>
          Lead<span style={{ color: '#B8892A' }}>Flow</span> AI
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.2)' }}>© 2026 LeadFlow AI · Tüm hakları saklıdır</div>
      </footer>

    </main>
  );
}