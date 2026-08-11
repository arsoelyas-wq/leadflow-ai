'use client'
import { useEffect, useState, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''

function redirectLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
  }
}

// ── Styles ──────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#e2e8f0',fontSize:13,padding:'9px 12px',outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',resize:'none' }
const lbl: React.CSSProperties = { display:'block',color:'#64748b',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }
const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,marginBottom:12 }
const addBtn: React.CSSProperties = { padding:'6px 14px',borderRadius:7,border:'1px dashed rgba(139,92,246,0.4)',background:'rgba(139,92,246,0.07)',color:'#a78bfa',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6 }
const delBtn: React.CSSProperties = { padding:'4px 10px',borderRadius:6,border:'1px solid rgba(248,113,113,0.3)',background:'rgba(248,113,113,0.07)',color:'#f87171',fontSize:11,cursor:'pointer',fontFamily:'inherit' }

// ── Field helpers ─────────────────────────────────────────────────────────
function F({ label, children, error }: { label:string; children:React.ReactNode; error?:string }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={lbl}>{label}</label>
      {children}
      {error && <p style={{color:'#f87171',fontSize:11,margin:'4px 0 0'}}>{error}</p>}
    </div>
  )
}
function G2({ children }: { children:React.ReactNode }) {
  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{children}</div>
}
function G3({ children }: { children:React.ReactNode }) {
  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>{children}</div>
}

// ── DEFAULT CONFIG (prefill when DB has no data) ──────────────────────────
const DEFAULT: Record<string,any> = {
  // Menü
  nav_logo_name:'Sovlo', nav_logo_suffix:'AI',
  nav_cta_text:'Ücretsiz Başla', nav_cta_url:'/register',
  nav_login_text:'Giriş Yap', nav_login_url:'/login',
  nav_links:[
    {label:'Özellikler',href:'#ozellikler'},
    {label:'Nasıl Çalışır',href:'#nasil-calisir'},
    {label:'Fiyatlar',href:'#fiyatlar'},
    {label:'Entegrasyonlar',href:'#entegrasyonlar'},
    {label:'İletişim',href:'/contact'},
  ],

  // Hero
  hero_badge:'Yapay Zeka Destekli B2B Lead Platformu',
  hero_headline:'Doğru Müşteriye,',
  hero_headline_gradient:'Doğru Anda',
  hero_headline_suffix:'Ulaş',
  hero_subheadline:'Google Maps\'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. {firmCount} firma Sovlo AI ile satışlarını otomatize ediyor.',
  hero_firm_count:'2,000+',
  hero_cta_primary_text:'3 Gün Ücretsiz Başla',
  hero_cta_primary_url:'/register',
  hero_cta_secondary_text:'Demo İzle',
  hero_cta_secondary_url:'#demo',
  hero_trust_bullets:['Kredi kartı gerekmez','2,000+ aktif firma','İstediğin an iptal'],

  // Stats
  stats:[
    {value:'2847',suffix:'+',label:'Aktif Firma',sub:'platformu kullanan işletme'},
    {value:'87',suffix:'%',label:'Dönüşüm Artışı',sub:'ortalama kampanya iyileşmesi'},
    {value:'50',suffix:'+',label:'Lead Kaynağı',sub:'Google Maps, Instagram ve daha fazlası'},
    {value:'14',suffix:'',label:'Desteklenen Ülke',sub:'Türkiye, AB, Körfez ve daha fazlası'},
  ],

  // Features
  features_headline:'Her Satış Kanalı, Tek Platformda',
  features_subheadline:'Lead bulmadan anlaşma kapamaya kadar tüm süreç AI ile otomatikleşir.',
  features:[
    {icon:'🎯',title:'Akıllı Lead Toplama',desc:'Google Maps, Instagram ve 50+ kaynaktan hedef sektöre göre günde 1,000+ firma otomatik toplanır.',tags:['Lead Bulma']},
    {icon:'🤖',title:'AI Kişiselleştirme',desc:'Gelişmiş yapay zeka ile her müşteriye özel, doğal görünen mesajlar.',tags:['AI Araçlar','İletişim']},
    {icon:'💬',title:'WhatsApp & Email',desc:'WhatsApp Business API, email ve LinkedIn\'den aynı anda kampanya yürüt.',tags:['İletişim']},
    {icon:'📊',title:'Pipeline & CRM',desc:'Tüm satış aşamalarını takip et. Sıcak leadleri anında gör.',tags:['Analitik']},
    {icon:'🎯',title:'Karar Verici Bulma',desc:'AI ile CEO, Satış Direktörü ve karar vericileri bul.',tags:['Lead Bulma','AI Araçlar']},
    {icon:'📈',title:'Gerçek Zamanlı Analitik',desc:'Canlı dashboard\'da cevapları, dönüşümleri ve ROI\'yi takip et.',tags:['Analitik']},
  ],

  // Problem vs Solution
  problem_headline:'Satışta Kaybolan Zamanı Geri Al',
  problem_subtitle:'Ortalama satışçı zamanının %73\'ünü satış yapmak yerine bu sorunlarla geçiriyor.',
  problems:[
    'Günde 8+ saat manuel lead araması',
    'Kişiselleştirilmemiş, spam görünen mesajlar',
    'Excel/sheet ile dağınık lead takibi',
    'Pahalı SDR ekibi veya freelance gideri',
    'Hangi kanalın işe yaradığını bilememek',
    'Kampanya sonuçlarını takip edememek',
  ],
  solutions:[
    '7/24 otomatik lead toplama — siz uyurken bile',
    'Gelişmiş yapay zeka ile her müşteriye özel, doğal mesajlar',
    'Pipeline, skor ve durum takibi tek ekranda',
    'SDR maliyetinin onda biri ile aynı sonuç',
    'WhatsApp, Email, SMS — tek platformdan',
    'Canlı analitik, ROI ve dönüşüm raporu',
  ],

  // How it works
  how_headline:'3 Adımda Satışa Başla',
  how_subheadline:'Kurulum 8 dakika, ilk leadler aynı gün.',
  how_steps:[
    {step:'01',title:'Hedef Sektör & Lokasyon Seç',desc:'Hangi sektör, hangi şehir, hangi büyüklükte firma istediğinizi belirleyin. Sovlo geri kalanını halleder.',details:['Google Maps scraping','Instagram firma tespiti','50+ veri kaynağı','AI kalite skoru']},
    {step:'02',title:'AI Kampanya Oluşturur',desc:'Yapay zeka, her lead\'e özel mesaj yazar. Spam değil, gerçek bir iş teklifiymiş gibi görünen kişisel iletişim.',details:['Kişiselleştirilmiş mesaj','WhatsApp Business API','Email + LinkedIn','Otomatik takip sekansı']},
    {step:'03',title:'Sonuçları İzle & Büyü',desc:'Canlı dashboard\'da cevapları, dönüşümleri ve ROI\'yi takip et. Hangi mesaj işe yarıyor, hemen gör.',details:['Gerçek zamanlı analitik','Pipeline takibi','A/B test desteği','ROI raporu']},
  ],

  // Testimonials
  testimonials_headline:'2,000+ Firma Güveniyor',
  testimonials:[
    {name:'Mehmet A.',role:'CEO & Kurucu',company:'Tekstil Üreticisi',country:'İstanbul',avatar:'MA',quote:'Sovlo ile aylık lead sayımız 8 kattan arttı. Satış ekibimiz artık bulma değil, kapatmaya odaklanıyor.',result:'8x daha fazla lead/ay',stars:5},
    {name:'Sarah M.',role:'Managing Director',company:'Dijital Ajans',country:'Berlin, Almanya',avatar:'SM',quote:'The German market expansion was seamless with Sovlo. Our pipeline grew significantly in 3 months.',result:'Pipeline 3 ayda 4x büyüdü',stars:5},
    {name:'Ahmet K.',role:'Co-Founder',company:'B2B SaaS',country:'Ankara',avatar:'AK',quote:'Rakiplerimizin müşterilerine ulaşmak için kullandığımız tek platform. ROI açısından tartışmasız en iyi yatırım.',result:'İlk ayda 15 yeni müşteri',stars:5},
  ],

  // Pricing
  pricing_headline:'Basit, Şeffaf Fiyatlandırma',
  pricing_subheadline:'İhtiyacınıza göre planı seçin. İstediğiniz zaman yükseltin veya iptal edin.',
  pricing_annual_badge:'Yıllık ödemede %20 indirim',
  plans:[
    {id:'starter',name:'Starter',desc:'Küçük ekipler için',monthly_price:49,annual_price:39,credits:'1,000',popular:false,cta_text:'Ücretsiz Başla',cta_url:'/register?plan=starter',features:[{text:'1.000 kredi/ay (1 ay rollover)',inc:true},{text:'Lead Arama — 1 kr/lead',inc:true},{text:'WhatsApp & E-posta — 1 kr/gönderim',inc:true},{text:'AI Mesaj Üretimi — 3 kr',inc:true},{text:'Ses Klonlama & Video — kredi ile',inc:true},{text:'Pipeline CRM + Teklif/Fatura',inc:true},{text:'Ekip Yönetimi',inc:false}]},
    {id:'growth',name:'Growth',desc:'Büyüyen ekipler için',monthly_price:149,annual_price:119,credits:'5,000',popular:true,cta_text:'Ücretsiz Başla',cta_url:'/register?plan=growth',features:[{text:'5.000 kredi/ay (2 ay rollover)',inc:true},{text:'WhatsApp — 3 numara',inc:true},{text:'Ses Klonlama (3) + Video (2 avatar)',inc:true},{text:'Sequence & Workflow Otomasyon',inc:true},{text:'A/B Test & Akıllı Zamanlama',inc:true},{text:'Ekip — 5 koltuk',inc:true},{text:'API Erişimi',inc:false}]},
    {id:'scale',name:'Scale',desc:'Kurumsal ekipler için',monthly_price:399,annual_price:319,credits:'20,000',popular:false,cta_text:'Teklif Al',cta_url:'/register?plan=scale',features:[{text:'20.000 kredi/ay (3 ay rollover)',inc:true},{text:'WhatsApp — 15 numara',inc:true},{text:'Ses Klonlama (10) + Video (5 avatar)',inc:true},{text:'Sınırsız Sequence & Workflow',inc:true},{text:'AI Satış Koçu & Ekip Analizi',inc:true},{text:'API Erişimi (10K/gün)',inc:true},{text:'SLA Garantisi',inc:false}]},
  ],

  // FAQ
  faq_headline:'Sıkça Sorulan Sorular',
  faqs:[
    {q:'Deneme süresi için kredi kartı gerekiyor mu?',a:'Hayır. 3 günlük ücretsiz deneme süresinde kredi kartı bilgisi istenmez.'},
    {q:'WhatsApp mesajları spam olarak işaretlenir mi?',a:'Sovlo, resmi WhatsApp Business API (WABA) üzerinden çalışır. Meta onaylı kanallardan kişiselleştirilmiş mesajlar gönderildiğinde spam riski minimum düzeydedir.'},
    {q:'KVKK ve GDPR\'a uyumlu mu?',a:'Evet. Sovlo Türk KVKK mevzuatı ve AB GDPR\'ına tam uyumlu olacak şekilde tasarlanmıştır.'},
    {q:'Günde kaç lead toplayabilirim?',a:'Plana ve kullandığınız kredie göre değişir: Starter planında günde ~50-150, Growth planında ~300-500.'},
    {q:'İptal etmek ne kadar kolay?',a:'Hesap ayarlarından tek tıkla iptal edebilirsiniz.'},
  ],

  // CTA Section
  cta_headline:'Satışlarınızı Bugün Otomatize Edin',
  cta_subheadline:'3 gün ücretsiz deneyin. Kurulum 8 dakika.',
  cta_primary_text:'Ücretsiz Başla',
  cta_primary_url:'/register',
  cta_secondary_text:'Demo İzle',
  cta_secondary_url:'#demo',
  cta_trust_points:['3 gün ücretsiz deneme','Kredi kartı gerekmez','İstediğin an iptal','Ortalama kurulum: 8 dk'],

  // Footer
  footer_company_desc:'AI destekli B2B satış platformu. Google Maps\'ten lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt.',
  footer_contact_email:'destek@sovlo.io',
  footer_contact_whatsapp:'905XXXXXXXXXX',
  footer_linkedin_url:'https://linkedin.com/company/sovlo-ai',
  footer_twitter_url:'https://twitter.com/sovloai',
  footer_copyright:'Sovlo AI. Tüm hakları saklıdır.',

  // SEO
  meta_title:'Sovlo AI — Yapay Zeka Destekli B2B Lead Intelligence Platformu',
  meta_description:'Google Maps\'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt. 2,000+ firma ile satışlarınızı otomatize edin.',
  meta_keywords:'B2B lead, satış otomasyonu, WhatsApp kampanya, lead scraper, AI satış, CRM Türkiye',

  // Enterprise Card (Fiyatlar tab)
  enterprise:{
    title:'Enterprise',
    desc:'Büyük ekipler için özel çözüm',
    price_label:'Özel Fiyat',
    color:'#ec4899',
    features:['Sınırsız kredi & ekip','White-Label & API','SLA %99.9 garantisi','Dedicated Account Manager'],
    cta_text:'Bizimle İletişime Geçin',
    cta_url:'mailto:enterprise@sovlo.io',
  },

  // Karşılaştırma (Fiyatlar tab)
  comparison:{
    title:'Neden Sovlo?',
    items:[
      {label:'Apollo Pro + Smartlead + WA aracı',price:'≈ ₺10.500/ay',icon:'🔴'},
      {label:'Sovlo Growth — hepsi tek pakette',price:'₺2.990/ay',icon:'🟢'},
      {label:'Kredi rollover (rakipler sıfırlıyor)',price:'2 ay taşınır',icon:'✅'},
      {label:'WhatsApp mesajı (rakipler +₺0.50/msj)',price:'Sınırsız ücretsiz',icon:'✅'},
    ],
  },

  // Demo & Popup
  demo_video_id:'',
  demo_headline:'Ürünü canlı görün',
  exit_popup_enabled:true,
  exit_popup_title:'Ayrılmadan önce —',
  exit_popup_offer:'Sektörünüzdeki ilk 50 lead\'i ücretsiz görmek ister misiniz? Email adresinizi bırakın, hemen hazırlayalım.',
  exit_popup_cta_url:'/register?ref=exit-intent',
}

const TABS = ['Menü','Hero','İstatistik','Özellikler','Nasıl Çalışır','Yorumlar','Fiyatlar','SSS','CTA & Footer','SEO','Problem','Demo & Popup']

export default function AdminLandingPage() {
  const [cfg, setCfg]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{type:'ok'|'err';text:string}|null>(null)
  const [tab, setTab]         = useState(0)
  const [dirty, setDirty]     = useState(false)
  const [errors, setErrors]   = useState<Record<string,string>>({})

  useEffect(() => {
    fetch(`${API}/api/admin/landing-config`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(async r => {
        if (r.status === 401 || r.status === 403) { redirectLogin(); return }
        const d = await r.json()
        setCfg(d.config && Object.keys(d.config).length > 0 ? { ...DEFAULT, ...d.config } : { ...DEFAULT })
      })
      .catch(() => setCfg({ ...DEFAULT }))
      .finally(() => setLoading(false))
  }, [])

  // Unsaved changes protection
  useEffect(()=>{
    const handler=(e:BeforeUnloadEvent)=>{ if(dirty){ e.preventDefault(); e.returnValue='' } }
    window.addEventListener('beforeunload',handler)
    return ()=>window.removeEventListener('beforeunload',handler)
  },[dirty])

  const set = useCallback((key: string, val: any) => {
    setCfg((c: any) => ({ ...c, [key]: val }))
    setDirty(true)
  }, [])

  const validate = () => {
    const errs: Record<string,string> = {}
    if (!cfg?.nav_logo_name?.trim()) errs.nav_logo_name = 'Logo adı boş bırakılamaz'
    if (!cfg?.hero_headline?.trim()) errs.hero_headline = 'Hero başlık boş bırakılamaz'
    if ((cfg?.meta_title||'').length > 60) errs.meta_title = 'Meta başlık 60 karakteri geçmemeli'
    if ((cfg?.meta_description||'').length > 160) errs.meta_description = 'Meta açıklama 160 karakteri geçmemeli'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const resetDefaults = () => {
    if (!confirm('Tüm landing page ayarlarını varsayılana döndürmek istediğinizden emin misiniz?')) return
    setCfg({ ...DEFAULT })
    setDirty(true)
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    setDirty(false)
    try {
      const r = await fetch(`${API}/api/admin/landing-config`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify(cfg),
      })
      if (r.status === 401 || r.status === 403) { redirectLogin(); return }
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Kayıt başarısız')
      // Cache bust
      try { await fetch('/api/revalidate',{method:'POST',headers:{'x-revalidate-secret':'sovlo-revalidate-2026'}}) } catch {}
      setMsg({ type:'ok', text:'✅ Kaydedildi! Ana sayfa anında güncellendi.' })
    } catch(e:any) { setDirty(true); setMsg({ type:'err', text:'❌ '+e.message }) }
    finally { setSaving(false); setTimeout(()=>setMsg(null),5000) }
  }

  // Array helpers
  const arrAdd = (key: string, item: any) => { set(key, [...(cfg[key]||[]), item]) }
  const arrDel = (key: string, i: number) => { set(key, (cfg[key]||[]).filter((_:any, j:number) => j !== i)) }
  const arrSet = (key: string, i: number, patch: any) => {
    const arr = [...(cfg[key]||[])]
    arr[i] = { ...arr[i], ...patch }
    set(key, arr)
  }

  if (loading) return <div style={{color:'#475569',padding:60,textAlign:'center',fontSize:14}}>Yükleniyor...</div>
  if (!cfg) return null

  const h4: React.CSSProperties = { color:'#94a3b8',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',margin:'0 0 12px',paddingBottom:8,borderBottom:'1px solid rgba(255,255,255,0.06)' }

  return (
    <div>
      {/* Top header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{color:'#fff',fontSize:21,fontWeight:900,margin:'0 0 3px',letterSpacing:'-0.02em'}}>Landing Page Editörü — Tam Kontrol</h1>
          <p style={{color:'#475569',fontSize:12,margin:0}}>Her bölümü düzenleyin · Kaydet & Yayınla ile anında yayına girer</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {dirty && <span style={{fontSize:11,color:'#fb923c',background:'rgba(251,146,60,0.1)',border:'1px solid rgba(251,146,60,0.2)',borderRadius:6,padding:'4px 10px'}}>Kaydedilmemiş değişiklik</span>}
          <a href="/" target="_blank" rel="noreferrer" style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#64748b',textDecoration:'none',fontSize:12,whiteSpace:'nowrap'}}>Önizle</a>
          <button onClick={resetDefaults} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.06)',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:12,fontFamily:'inherit',whiteSpace:'nowrap'}}>Sıfırla</button>
          <button onClick={save} disabled={saving} style={{padding:'10px 22px',borderRadius:10,border:'none',background:saving?'rgba(59,130,246,0.4)':'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {saving ? 'Kaydediliyor...' : 'Kaydet & Yayınla'}
          </button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:9,marginBottom:16,background:msg.type==='ok'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.type==='ok'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,color:msg.type==='ok'?'#34d399':'#f87171',fontSize:13}}>{msg.text}</div>}
      {Object.keys(errors).length>0 && <div style={{padding:'10px 16px',borderRadius:9,marginBottom:16,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',fontSize:13}}>Hata: {Object.values(errors).join(' · ')}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:3,overflowX:'auto',marginBottom:20,paddingBottom:4,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{padding:'8px 14px',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap',fontFamily:'inherit',transition:'all 0.15s',background:tab===i?'rgba(99,102,241,0.15)':'transparent',color:tab===i?'#a5b4fc':'#475569',borderBottom:tab===i?'2px solid #6366f1':'2px solid transparent'}}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB 0: MENÜ & MARKA ═══════════ */}
      {tab===0 && (
        <div>
          <div style={card}>
            <p style={h4}>Logo & Marka</p>
            <G2>
              <F label="Logo Adı (beyaz kısım)"><input value={cfg.nav_logo_name||''} onChange={e=>set('nav_logo_name',e.target.value)} style={inp} /></F>
              <F label="Logo Eki (renkli kısım)"><input value={cfg.nav_logo_suffix||''} onChange={e=>set('nav_logo_suffix',e.target.value)} style={inp} /></F>
            </G2>
          </div>

          <div style={card}>
            <p style={h4}>Giriş & Kayıt Butonları</p>
            <G2>
              <F label="Giriş Yap Metni"><input value={cfg.nav_login_text||''} onChange={e=>set('nav_login_text',e.target.value)} style={inp} /></F>
              <F label="Giriş Yap URL"><input value={cfg.nav_login_url||''} onChange={e=>set('nav_login_url',e.target.value)} style={inp} /></F>
              <F label="CTA Buton Metni"><input value={cfg.nav_cta_text||''} onChange={e=>set('nav_cta_text',e.target.value)} style={inp} /></F>
              <F label="CTA Buton URL"><input value={cfg.nav_cta_url||''} onChange={e=>set('nav_cta_url',e.target.value)} style={inp} /></F>
            </G2>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Menü Linkleri</p>
              <button onClick={()=>arrAdd('nav_links',{label:'Yeni Link',href:'#'})} style={addBtn}>+ Link Ekle</button>
            </div>
            {(cfg.nav_links||[]).map((link:any,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,marginBottom:10,alignItems:'center'}}>
                <input value={link.label||''} onChange={e=>arrSet('nav_links',i,{label:e.target.value})} style={inp} placeholder="Menü adı" />
                <input value={link.href||''} onChange={e=>arrSet('nav_links',i,{href:e.target.value})} style={inp} placeholder="/sayfa veya #anchor" />
                <button onClick={()=>arrDel('nav_links',i)} style={delBtn}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 1: HERO ═══════════ */}
      {tab===1 && (
        <div>
          <div style={card}>
            <p style={h4}>Üst Etiket (Badge)</p>
            <F label="Badge Metni"><input value={cfg.hero_badge||''} onChange={e=>set('hero_badge',e.target.value)} style={inp} /></F>
          </div>

          <div style={card}>
            <p style={h4}>Ana Başlık</p>
            <G3>
              <F label="1. Satır (siyah)"><input value={cfg.hero_headline||''} onChange={e=>set('hero_headline',e.target.value)} style={inp} placeholder="Doğru Müşteriye," /></F>
              <F label="2. Satır (gradient mavi)"><input value={cfg.hero_headline_gradient||''} onChange={e=>set('hero_headline_gradient',e.target.value)} style={inp} placeholder="Doğru Anda" /></F>
              <F label="3. Satır (siyah)"><input value={cfg.hero_headline_suffix||''} onChange={e=>set('hero_headline_suffix',e.target.value)} style={inp} placeholder="Ulaş" /></F>
            </G3>
          </div>

          <div style={card}>
            <p style={h4}>Alt Başlık & Firma Sayısı</p>
            <F label="Alt Başlık ({firmCount} yerine sayı gelir)">
              <textarea value={cfg.hero_subheadline||''} onChange={e=>set('hero_subheadline',e.target.value)} rows={3} style={inp} />
            </F>
            <F label="Firma Sayısı (ör: 2,000+)"><input value={cfg.hero_firm_count||''} onChange={e=>set('hero_firm_count',e.target.value)} style={inp} /></F>
          </div>

          <div style={card}>
            <p style={h4}>CTA Butonları</p>
            <G2>
              <F label="Ana Buton Metni"><input value={cfg.hero_cta_primary_text||''} onChange={e=>set('hero_cta_primary_text',e.target.value)} style={inp} /></F>
              <F label="Ana Buton URL"><input value={cfg.hero_cta_primary_url||''} onChange={e=>set('hero_cta_primary_url',e.target.value)} style={inp} /></F>
              <F label="İkincil Buton Metni"><input value={cfg.hero_cta_secondary_text||''} onChange={e=>set('hero_cta_secondary_text',e.target.value)} style={inp} /></F>
              <F label="İkincil Buton URL"><input value={cfg.hero_cta_secondary_url||''} onChange={e=>set('hero_cta_secondary_url',e.target.value)} style={inp} /></F>
            </G2>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Güven İfadeleri (yeşil tik li)</p>
              <button onClick={()=>arrAdd('hero_trust_bullets','Yeni Madde')} style={addBtn}>+ Ekle</button>
            </div>
            {(cfg.hero_trust_bullets||[]).map((b:string,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                <input value={b} onChange={e=>{ const a=[...(cfg.hero_trust_bullets||[])];a[i]=e.target.value;set('hero_trust_bullets',a) }} style={inp} />
                <button onClick={()=>arrDel('hero_trust_bullets',i)} style={delBtn}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 2: İSTATİSTİKLER ═══════════ */}
      {tab===2 && (
        <div style={card}>
          <p style={h4}>4 Rakamsal İstatistik (Hero altı)</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
            {(cfg.stats||[]).map((s:any,i:number)=>(
              <div key={i} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)'}}>
                <p style={{...h4,marginBottom:10}}>İstatistik #{i+1}</p>
                <G2>
                  <F label="Değer (sayı)"><input value={s.value||''} onChange={e=>arrSet('stats',i,{value:e.target.value})} style={inp} placeholder="2847" /></F>
                  <F label="Ek (+ veya %)"><input value={s.suffix||''} onChange={e=>arrSet('stats',i,{suffix:e.target.value})} style={inp} placeholder="+" /></F>
                </G2>
                <F label="Etiket"><input value={s.label||''} onChange={e=>arrSet('stats',i,{label:e.target.value})} style={inp} placeholder="Aktif Firma" /></F>
                <F label="Alt yazı"><input value={s.sub||''} onChange={e=>arrSet('stats',i,{sub:e.target.value})} style={inp} placeholder="platformu kullanan işletme" /></F>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 3: ÖZELLİKLER ═══════════ */}
      {tab===3 && (
        <div>
          <div style={card}>
            <p style={h4}>Bölüm Başlığı</p>
            <G2>
              <F label="Ana Başlık"><input value={cfg.features_headline||''} onChange={e=>set('features_headline',e.target.value)} style={inp} /></F>
              <F label="Alt Başlık"><input value={cfg.features_subheadline||''} onChange={e=>set('features_subheadline',e.target.value)} style={inp} /></F>
            </G2>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Özellik Kartları</p>
              <button onClick={()=>arrAdd('features',{icon:'⭐',title:'Yeni Özellik',desc:'Açıklama girin.',tags:[]})} style={addBtn}>+ Kart Ekle</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {(cfg.features||[]).map((f:any,i:number)=>(
                <div key={i} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{color:'#64748b',fontSize:11,fontWeight:700}}>Özellik #{i+1}</span>
                    <button onClick={()=>arrDel('features',i)} style={delBtn}>✕ Sil</button>
                  </div>
                  <G2>
                    <F label="İkon (emoji)"><input value={f.icon||''} onChange={e=>arrSet('features',i,{icon:e.target.value})} style={inp} placeholder="🎯" /></F>
                    <F label="Başlık"><input value={f.title||''} onChange={e=>arrSet('features',i,{title:e.target.value})} style={inp} /></F>
                  </G2>
                  <F label="Açıklama"><textarea value={f.desc||''} onChange={e=>arrSet('features',i,{desc:e.target.value})} rows={2} style={inp} /></F>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 4: NASIL ÇALIŞIR ═══════════ */}
      {tab===4 && (
        <div>
          <div style={card}>
            <p style={h4}>Bölüm Başlığı</p>
            <G2>
              <F label="Ana Başlık"><input value={cfg.how_headline||''} onChange={e=>set('how_headline',e.target.value)} style={inp} /></F>
              <F label="Alt Başlık"><input value={cfg.how_subheadline||''} onChange={e=>set('how_subheadline',e.target.value)} style={inp} /></F>
            </G2>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Adımlar</p>
              <button onClick={()=>arrAdd('how_steps',{step:'0'+((cfg.how_steps||[]).length+1),title:'Yeni Adım',desc:'Açıklama.',details:[]})} style={addBtn}>+ Adım Ekle</button>
            </div>
            {(cfg.how_steps||[]).map((s:any,i:number)=>(
              <div key={i} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)',marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{color:'#64748b',fontSize:11,fontWeight:700}}>Adım #{i+1}</span>
                  <button onClick={()=>arrDel('how_steps',i)} style={delBtn}>✕ Sil</button>
                </div>
                <G2>
                  <F label="Adım No (ör: 01)"><input value={s.step||''} onChange={e=>arrSet('how_steps',i,{step:e.target.value})} style={inp} /></F>
                  <F label="Başlık"><input value={s.title||''} onChange={e=>arrSet('how_steps',i,{title:e.target.value})} style={inp} /></F>
                </G2>
                <F label="Açıklama"><textarea value={s.desc||''} onChange={e=>arrSet('how_steps',i,{desc:e.target.value})} rows={2} style={inp} /></F>
                <F label="Detaylar (her satır bir madde, virgülle ayırın)">
                  <input value={(s.details||[]).join(', ')} onChange={e=>arrSet('how_steps',i,{details:e.target.value.split(',').map((x:string)=>x.trim()).filter(Boolean)})} style={inp} placeholder="Madde 1, Madde 2, Madde 3" />
                </F>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 5: YORUMLAR ═══════════ */}
      {tab===5 && (
        <div>
          <div style={card}>
            <F label="Bölüm Başlığı"><input value={cfg.testimonials_headline||''} onChange={e=>set('testimonials_headline',e.target.value)} style={inp} /></F>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Müşteri Yorumları</p>
              <button onClick={()=>arrAdd('testimonials',{name:'Ad Soyad',role:'Unvan',company:'Firma',country:'Şehir',avatar:'AS',quote:'Yorum metni...',result:'Sonuç',stars:5})} style={addBtn}>+ Yorum Ekle</button>
            </div>
            {(cfg.testimonials||[]).map((t:any,i:number)=>(
              <div key={i} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)',marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{color:'#64748b',fontSize:11,fontWeight:700}}>Yorum #{i+1}</span>
                  <button onClick={()=>arrDel('testimonials',i)} style={delBtn}>✕ Sil</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
                  <F label="Ad"><input value={t.name||''} onChange={e=>arrSet('testimonials',i,{name:e.target.value})} style={inp} /></F>
                  <F label="Unvan"><input value={t.role||''} onChange={e=>arrSet('testimonials',i,{role:e.target.value})} style={inp} /></F>
                  <F label="Firma"><input value={t.company||''} onChange={e=>arrSet('testimonials',i,{company:e.target.value})} style={inp} /></F>
                  <F label="Şehir"><input value={t.country||''} onChange={e=>arrSet('testimonials',i,{country:e.target.value})} style={inp} /></F>
                </div>
                <F label="Yorum Metni"><textarea value={t.quote||''} onChange={e=>arrSet('testimonials',i,{quote:e.target.value})} rows={3} style={inp} /></F>
                <G2>
                  <F label="Sonuç (ör: 8x daha fazla lead/ay)"><input value={t.result||''} onChange={e=>arrSet('testimonials',i,{result:e.target.value})} style={inp} /></F>
                  <F label="Yıldız (1-5)"><input type="number" min={1} max={5} value={t.stars||5} onChange={e=>arrSet('testimonials',i,{stars:parseInt(e.target.value)||5})} style={inp} /></F>
                </G2>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 6: FİYATLAR ═══════════ */}
      {tab===6 && (
        <div>
          <div style={card}>
            <p style={h4}>Başlıklar</p>
            <G2>
              <F label="Ana Başlık"><input value={cfg.pricing_headline||''} onChange={e=>set('pricing_headline',e.target.value)} style={inp} /></F>
              <F label="Alt Başlık"><input value={cfg.pricing_subheadline||''} onChange={e=>set('pricing_subheadline',e.target.value)} style={inp} /></F>
            </G2>
            <F label="Yıllık İndirim Etiketi (ör: Yıllık ödemede %20 indirim)">
              <input value={cfg.pricing_annual_badge||''} onChange={e=>set('pricing_annual_badge',e.target.value)} style={inp} />
            </F>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Planlar</p>
              <button onClick={()=>arrAdd('plans',{id:'new',name:'Yeni Plan',desc:'Açıklama',monthly_price:0,annual_price:0,credits:'0',popular:false,cta_text:'Başla',cta_url:'/register',features:[{text:'Özellik 1',inc:true}]})} style={addBtn}>+ Plan Ekle</button>
            </div>
            {(cfg.plans||[]).map((p:any,pi:number)=>(
              <div key={pi} style={{padding:16,background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                  <span style={{color:'#e2e8f0',fontWeight:700}}>{p.name || 'Plan'}</span>
                  <button onClick={()=>arrDel('plans',pi)} style={delBtn}>✕ Sil</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
                  <F label="Plan Adı"><input value={p.name||''} onChange={e=>arrSet('plans',pi,{name:e.target.value})} style={inp} /></F>
                  <F label="Aylık Fiyat ($)"><input type="number" value={p.monthly_price||0} onChange={e=>arrSet('plans',pi,{monthly_price:parseInt(e.target.value)||0})} style={inp} /></F>
                  <F label="Yıllık Fiyat ($/ay)"><input type="number" value={p.annual_price||0} onChange={e=>arrSet('plans',pi,{annual_price:parseInt(e.target.value)||0})} style={inp} /></F>
                  <F label="Kredi/Ay"><input value={p.credits||''} onChange={e=>arrSet('plans',pi,{credits:e.target.value})} style={inp} /></F>
                </div>
                <G2>
                  <F label="Açıklama"><input value={p.desc||''} onChange={e=>arrSet('plans',pi,{desc:e.target.value})} style={inp} /></F>
                  <F label="CTA Metni"><input value={p.cta_text||''} onChange={e=>arrSet('plans',pi,{cta_text:e.target.value})} style={inp} /></F>
                  <F label="CTA URL"><input value={p.cta_url||''} onChange={e=>arrSet('plans',pi,{cta_url:e.target.value})} style={inp} /></F>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,marginTop:22}}>
                    <input type="checkbox" checked={p.popular||false} onChange={e=>arrSet('plans',pi,{popular:e.target.checked})} id={`popular-${pi}`} />
                    <label htmlFor={`popular-${pi}`} style={{color:'#94a3b8',fontSize:12,cursor:'pointer'}}>Popüler / Öne Çıkan</label>
                  </div>
                </G2>
                <p style={{color:'#475569',fontSize:11,fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Özellik Listesi</p>
                {(p.features||[]).map((f:any,fi:number)=>(
                  <div key={fi} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:8,marginBottom:7,alignItems:'center'}}>
                    <input type="checkbox" checked={f.inc!==false} onChange={e=>{ const pls=[...(cfg.plans||[])];const fts=[...(pls[pi].features||[])];fts[fi]={...fts[fi],inc:e.target.checked};pls[pi]={...pls[pi],features:fts};set('plans',pls) }} />
                    <input value={f.text||''} onChange={e=>{ const pls=[...(cfg.plans||[])];const fts=[...(pls[pi].features||[])];fts[fi]={...fts[fi],text:e.target.value};pls[pi]={...pls[pi],features:fts};set('plans',pls) }} style={{...inp,marginBottom:0}} placeholder="Özellik açıklaması" />
                    <button onClick={()=>{ const pls=[...(cfg.plans||[])];pls[pi]={...pls[pi],features:pls[pi].features.filter((_:any,j:number)=>j!==fi)};set('plans',pls) }} style={delBtn}>✕</button>
                  </div>
                ))}
                <button onClick={()=>{ const pls=[...(cfg.plans||[])];pls[pi]={...pls[pi],features:[...(pls[pi].features||[]),{text:'Yeni özellik',inc:true}]};set('plans',pls) }} style={{...addBtn,marginTop:8}}>+ Özellik</button>
              </div>
            ))}
          </div>

          {/* Enterprise card editor */}
          <div style={card}>
            <p style={h4}>Enterprise Kartı (Billing sayfasında görünür)</p>
            <G2>
              <F label="Başlık"><input value={cfg.enterprise?.title||''} onChange={e=>set('enterprise',{...(cfg.enterprise||{}),title:e.target.value})} style={inp} /></F>
              <F label="Açıklama"><input value={cfg.enterprise?.desc||''} onChange={e=>set('enterprise',{...(cfg.enterprise||{}),desc:e.target.value})} style={inp} /></F>
              <F label="Fiyat Etiketi (ör: Özel Fiyat)"><input value={cfg.enterprise?.price_label||''} onChange={e=>set('enterprise',{...(cfg.enterprise||{}),price_label:e.target.value})} style={inp} /></F>
              <F label="Renk (hex)"><input value={cfg.enterprise?.color||'#ec4899'} onChange={e=>set('enterprise',{...(cfg.enterprise||{}),color:e.target.value})} style={inp} /></F>
              <F label="CTA Metni"><input value={cfg.enterprise?.cta_text||''} onChange={e=>set('enterprise',{...(cfg.enterprise||{}),cta_text:e.target.value})} style={inp} /></F>
              <F label="CTA URL"><input value={cfg.enterprise?.cta_url||''} onChange={e=>set('enterprise',{...(cfg.enterprise||{}),cta_url:e.target.value})} style={inp} /></F>
            </G2>
            <p style={{color:'#475569',fontSize:11,fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Özellikler</p>
            {(cfg.enterprise?.features||[]).map((f:string,fi:number)=>(
              <div key={fi} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:7}}>
                <input value={f} onChange={e=>{ const ent={...(cfg.enterprise||{})};const fts=[...(ent.features||[])];fts[fi]=e.target.value;set('enterprise',{...ent,features:fts}) }} style={{...inp,marginBottom:0}} />
                <button onClick={()=>{ const ent={...(cfg.enterprise||{})};set('enterprise',{...ent,features:(ent.features||[]).filter((_:string,j:number)=>j!==fi)}) }} style={delBtn}>✕</button>
              </div>
            ))}
            <button onClick={()=>{ const ent={...(cfg.enterprise||{})};set('enterprise',{...ent,features:[...(ent.features||[]),'Yeni özellik']}) }} style={{...addBtn,marginTop:8}}>+ Özellik</button>
          </div>

          {/* Competitor comparison editor */}
          <div style={card}>
            <p style={h4}>Karşılaştırma Bölümü (Billing sayfasında görünür)</p>
            <F label="Bölüm Başlığı"><input value={cfg.comparison?.title||''} onChange={e=>set('comparison',{...(cfg.comparison||{}),title:e.target.value})} style={inp} /></F>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <p style={{color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',margin:0}}>Karşılaştırma Satırları</p>
              <button onClick={()=>{ const cmp={...(cfg.comparison||{})};set('comparison',{...cmp,items:[...(cmp.items||[]),{label:'Yeni satır',price:'₺0/ay',icon:'✅'}]}) }} style={addBtn}>+ Satır</button>
            </div>
            {(cfg.comparison?.items||[]).map((c:any,ci:number)=>(
              <div key={ci} style={{display:'grid',gridTemplateColumns:'60px 1fr 1fr auto',gap:8,marginBottom:8,alignItems:'center'}}>
                <F label="İkon"><input value={c.icon||''} onChange={e=>{ const cmp={...(cfg.comparison||{})};const its=[...(cmp.items||[])];its[ci]={...its[ci],icon:e.target.value};set('comparison',{...cmp,items:its}) }} style={{...inp,marginBottom:0}} /></F>
                <F label="Açıklama"><input value={c.label||''} onChange={e=>{ const cmp={...(cfg.comparison||{})};const its=[...(cmp.items||[])];its[ci]={...its[ci],label:e.target.value};set('comparison',{...cmp,items:its}) }} style={{...inp,marginBottom:0}} /></F>
                <F label="Fiyat/Değer"><input value={c.price||''} onChange={e=>{ const cmp={...(cfg.comparison||{})};const its=[...(cmp.items||[])];its[ci]={...its[ci],price:e.target.value};set('comparison',{...cmp,items:its}) }} style={{...inp,marginBottom:0}} /></F>
                <button onClick={()=>{ const cmp={...(cfg.comparison||{})};set('comparison',{...cmp,items:(cmp.items||[]).filter((_:any,j:number)=>j!==ci)}) }} style={{...delBtn,marginTop:16}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 7: SSS ═══════════ */}
      {tab===7 && (
        <div>
          <div style={card}>
            <F label="Bölüm Başlığı"><input value={cfg.faq_headline||''} onChange={e=>set('faq_headline',e.target.value)} style={inp} /></F>
          </div>

          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <p style={{...h4,margin:0,border:'none',padding:0}}>Soru - Cevap Çiftleri</p>
              <button onClick={()=>arrAdd('faqs',{q:'Yeni Soru?',a:'Cevap metni...'})} style={addBtn}>+ Soru Ekle</button>
            </div>
            {(cfg.faqs||[]).map((f:any,i:number)=>(
              <div key={i} style={{padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)',marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{color:'#64748b',fontSize:11,fontWeight:700}}>Soru #{i+1}</span>
                  <button onClick={()=>arrDel('faqs',i)} style={delBtn}>✕ Sil</button>
                </div>
                <F label="Soru"><input value={f.q||''} onChange={e=>arrSet('faqs',i,{q:e.target.value})} style={inp} /></F>
                <F label="Cevap"><textarea value={f.a||''} onChange={e=>arrSet('faqs',i,{a:e.target.value})} rows={3} style={inp} /></F>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 8: CTA & FOOTER ═══════════ */}
      {tab===8 && (
        <div>
          <div style={card}>
            <p style={h4}>Son CTA Bölümü (Koyu arkaplan)</p>
            <G2>
              <F label="Ana Başlık"><input value={cfg.cta_headline||''} onChange={e=>set('cta_headline',e.target.value)} style={inp} /></F>
              <F label="Alt Başlık"><input value={cfg.cta_subheadline||''} onChange={e=>set('cta_subheadline',e.target.value)} style={inp} /></F>
              <F label="Ana Buton Metni"><input value={cfg.cta_primary_text||''} onChange={e=>set('cta_primary_text',e.target.value)} style={inp} /></F>
              <F label="Ana Buton URL"><input value={cfg.cta_primary_url||''} onChange={e=>set('cta_primary_url',e.target.value)} style={inp} /></F>
            </G2>
            <p style={{...h4,marginTop:14}}>Güven İfadeleri</p>
            {(cfg.cta_trust_points||[]).map((tp:string,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                <input value={tp} onChange={e=>{ const a=[...(cfg.cta_trust_points||[])];a[i]=e.target.value;set('cta_trust_points',a) }} style={inp} />
                <button onClick={()=>{ const a=[...(cfg.cta_trust_points||[])];a.splice(i,1);set('cta_trust_points',a) }} style={delBtn}>✕</button>
              </div>
            ))}
            <button onClick={()=>set('cta_trust_points',[...(cfg.cta_trust_points||[]),'Yeni madde'])} style={{...addBtn,marginTop:6}}>+ Ekle</button>
          </div>

          <div style={card}>
            <p style={h4}>Footer — İletişim & Marka</p>
            <F label="Şirket Açıklaması (footer sol)"><textarea value={cfg.footer_company_desc||''} onChange={e=>set('footer_company_desc',e.target.value)} rows={2} style={inp} /></F>
            <G2>
              <F label="Email"><input value={cfg.footer_contact_email||''} onChange={e=>set('footer_contact_email',e.target.value)} style={inp} /></F>
              <F label="WhatsApp Numarası (başında +90)"><input value={cfg.footer_contact_whatsapp||''} onChange={e=>set('footer_contact_whatsapp',e.target.value)} style={inp} /></F>
              <F label="LinkedIn URL"><input value={cfg.footer_linkedin_url||''} onChange={e=>set('footer_linkedin_url',e.target.value)} style={inp} /></F>
              <F label="Twitter/X URL"><input value={cfg.footer_twitter_url||''} onChange={e=>set('footer_twitter_url',e.target.value)} style={inp} /></F>
              <F label="Copyright Metni"><input value={cfg.footer_copyright||''} onChange={e=>set('footer_copyright',e.target.value)} style={inp} /></F>
            </G2>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 9: SEO ═══════════ */}
      {tab===9 && (
        <div style={card}>
          <p style={h4}>SEO & Meta Etiketleri</p>
          <F label="Meta Başlık (tarayıcı sekmesi — max 60 karakter)">
            <input value={cfg.meta_title||''} onChange={e=>set('meta_title',e.target.value)} style={inp} />
            <p style={{color:(cfg.meta_title||'').length>60?'#f87171':'#475569',fontSize:11,margin:'4px 0 0'}}>{(cfg.meta_title||'').length}/60 karakter</p>
          </F>
          <F label="Meta Açıklama (arama sonuçları — max 160 karakter)">
            <textarea value={cfg.meta_description||''} onChange={e=>set('meta_description',e.target.value)} rows={3} style={inp} />
            <p style={{color:(cfg.meta_description||'').length>160?'#f87171':'#475569',fontSize:11,margin:'4px 0 0'}}>{(cfg.meta_description||'').length}/160 karakter</p>
          </F>
          <F label="Anahtar Kelimeler (virgülle ayırın)">
            <textarea value={cfg.meta_keywords||''} onChange={e=>set('meta_keywords',e.target.value)} rows={2} style={inp} />
          </F>
          <G2>
            <F label="OG / Social Başlık"><input value={cfg.meta_og_title||cfg.meta_title||''} onChange={e=>set('meta_og_title',e.target.value)} style={inp} /></F>
            <F label="OG / Social Açıklama"><input value={cfg.meta_og_description||cfg.meta_description||''} onChange={e=>set('meta_og_description',e.target.value)} style={inp} /></F>
          </G2>
        </div>
      )}

      {/* ═══════════ TAB 10: PROBLEM & ÇÖZÜM ═══════════ */}
      {tab===10 && (
        <div>
          <div style={card}>
            <p style={h4}>Bölüm Başlığı & Alt Başlık</p>
            <F label="Ana Başlık"><input value={cfg.problem_headline||''} onChange={e=>set('problem_headline',e.target.value)} style={inp} /></F>
            <F label="Alt Başlık"><textarea value={cfg.problem_subtitle||''} onChange={e=>set('problem_subtitle',e.target.value)} rows={2} style={inp} /></F>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {/* Problems */}
            <div style={card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <p style={{...h4,margin:0,border:'none',padding:0}}>❌ Eski Yol (Sorunlar)</p>
                <button onClick={()=>arrAdd('problems','Yeni sorun...')} style={addBtn}>+ Ekle</button>
              </div>
              {(cfg.problems||[]).map((p:any,i:number)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                  <input value={typeof p==='string'?p:(p.title||p.desc||'')} onChange={e=>{const a=[...(cfg.problems||[])];a[i]=e.target.value;set('problems',a)}} style={inp} placeholder="Manuel lead araması..." />
                  <button onClick={()=>arrDel('problems',i)} style={delBtn}>✕</button>
                </div>
              ))}
            </div>

            {/* Solutions */}
            <div style={card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <p style={{...h4,margin:0,border:'none',padding:0}}>✅ Sovlo AI ile (Çözümler)</p>
                <button onClick={()=>arrAdd('solutions','Yeni çözüm...')} style={addBtn}>+ Ekle</button>
              </div>
              {(cfg.solutions||[]).map((s:any,i:number)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                  <input value={typeof s==='string'?s:(s.title||s.desc||'')} onChange={e=>{const a=[...(cfg.solutions||[])];a[i]=e.target.value;set('solutions',a)}} style={inp} placeholder="Otomatik lead toplama..." />
                  <button onClick={()=>arrDel('solutions',i)} style={delBtn}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 11: DEMO & POPUP ═══════════ */}
      {tab===11 && (
        <div>
          <div style={card}>
            <p style={h4}>Demo Video</p>
            <F label="YouTube Video ID (URL'deki ?v= değeri)">
              <input value={cfg.demo_video_id||''} onChange={e=>set('demo_video_id',e.target.value)} style={inp} placeholder="dQw4w9WgXcQ" />
              <p style={{color:'#475569',fontSize:11,marginTop:4}}>Örnek URL: youtube.com/watch?v=dQw4w9WgXcQ — sadece ID kısmını girin</p>
            </F>
            <F label="Demo Bölüm Başlığı"><input value={cfg.demo_headline||''} onChange={e=>set('demo_headline',e.target.value)} style={inp} placeholder="Ürünü canlı görün"/></F>
          </div>

          <div style={card}>
            <p style={h4}>Çıkış Niyeti Popup (Exit Intent)</p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div>
                <p style={{color:'#e2e8f0',fontSize:13,fontWeight:600,margin:0}}>Popup Aktif</p>
                <p style={{color:'#475569',fontSize:11,margin:'2px 0 0'}}>Ziyaretçi sayfadan ayrılmaya çalışınca gösterilir</p>
              </div>
              <button onClick={()=>set('exit_popup_enabled',!cfg.exit_popup_enabled)}
                style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',padding:2,background:cfg.exit_popup_enabled!==false?'#22c55e':'rgba(255,255,255,0.1)',transition:'background 0.2s',display:'flex',alignItems:'center',justifyContent:cfg.exit_popup_enabled!==false?'flex-end':'flex-start'}}>
                <div style={{width:20,height:20,borderRadius:10,background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
              </button>
            </div>
            <F label="Popup Başlığı"><input value={cfg.exit_popup_title||''} onChange={e=>set('exit_popup_title',e.target.value)} style={inp} placeholder="Ayrılmadan önce —"/></F>
            <F label="Teklif Metni"><textarea value={cfg.exit_popup_offer||''} onChange={e=>set('exit_popup_offer',e.target.value)} rows={3} style={inp} placeholder="Sektörünüzdeki ilk 50 lead'i ücretsiz..."/></F>
            <F label="CTA URL (kayıt sonrası yönlendirme)"><input value={cfg.exit_popup_cta_url||''} onChange={e=>set('exit_popup_cta_url',e.target.value)} style={inp} placeholder="/register?ref=exit-intent"/></F>
          </div>
        </div>
      )}

      {/* Sticky save */}
      <div style={{position:'sticky',bottom:16,background:'rgba(5,10,25,0.97)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:20,boxShadow:'0 20px 60px rgba(0,0,0,0.8)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {dirty && <span style={{fontSize:11,color:'#fb923c',background:'rgba(251,146,60,0.1)',border:'1px solid rgba(251,146,60,0.2)',borderRadius:6,padding:'4px 10px'}}>Kaydedilmemiş değişiklik var</span>}
          {!dirty && <span style={{color:'#334155',fontSize:12}}>Değişiklikler kaydedilince ana sayfa anında güncellenir</span>}
        </div>
        <button onClick={save} disabled={saving} style={{padding:'10px 28px',borderRadius:9,border:'none',background:saving?'rgba(99,102,241,0.4)':'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',cursor:saving?'not-allowed':'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
          {saving?'Kaydediliyor...':'Kaydet & Yayınla'}
        </button>
      </div>
    </div>
  )
}
