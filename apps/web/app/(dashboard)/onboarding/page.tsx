'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Package, Users, Mic2, MessageSquare, CheckCircle,
  ArrowRight, ArrowLeft, Globe, Sparkles, Plus, X, Loader2,
  Phone, ChevronDown, Star, Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import SovloLogo from '@/components/SovloLogo'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Company {
  name: string; sector: string; city: string
  website: string; phone: string; employee_count: string
}
interface Product {
  name: string; description: string; price_range: string
  delivery_time: string; advantages: string[]; target_result: string; guarantee: string
}
interface Target {
  sectors: string[]; company_size: string; decision_maker: string
  pain_points: string[]; geography: string
}
interface SalesStyle {
  tone: string; agent_name: string; language_style: string
  opening_line: string; avoid_words: string
}
interface FAQ { q: string; a: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, icon: Building2,     title: 'Şirket Profili',  desc: 'Temel bilgilerinizi girin' },
  { id: 2, icon: Package,       title: 'Ürün & Hizmet',   desc: 'Ne sattığınızı anlayalım' },
  { id: 3, icon: Users,         title: 'Hedef Müşteri',   desc: 'Kimi arıyorsunuz?' },
  { id: 4, icon: Mic2,          title: 'Satış Tarzı',     desc: 'Nasıl konuşuyorsunuz?' },
  { id: 5, icon: MessageSquare, title: 'SSS & İtirazlar', desc: 'Hazır cevaplar oluşturun' },
  { id: 6, icon: CheckCircle,   title: 'Hazır!',          desc: 'Sisteminiz kuruldu' },
]

const SECTORS = [
  'Teknoloji / Yazılım', 'İmalat / Üretim', 'İnşaat / Gayrimenkul',
  'Tekstil / Moda', 'Gıda / İçecek', 'Sağlık / İlaç', 'Eğitim',
  'Finans / Sigorta', 'Lojistik / Nakliye', 'Turizm / Otelcilik',
  'Perakende / E-ticaret', 'Danışmanlık / Hizmet', 'Diğer',
]

const TONES = [
  { key: 'professional', label: 'Profesyonel', desc: 'Resmi, kurumsal dil' },
  { key: 'friendly',     label: 'Samimi',      desc: 'Sıcak, rahat ton' },
  { key: 'consultative', label: 'Danışmancı',  desc: 'Soru sorar, dinler' },
  { key: 'direct',       label: 'Direkt',      desc: 'Net, kısa, öz' },
]

const DEFAULT_OBJECTIONS = [
  'Fiyat çok yüksek',
  'Şu an bütçemiz yok',
  'Zaten başka bir çözümüm var',
  'Düşüneyim, sonra döneceğim',
  'Meşgulüm, şimdi konuşamam',
]

const EMPTY_COMPANY: Company  = { name: '', sector: '', city: '', website: '', phone: '', employee_count: '' }
const EMPTY_PRODUCT: Product  = { name: '', description: '', price_range: '', delivery_time: '', advantages: ['', '', ''], target_result: '', guarantee: '' }
const EMPTY_TARGET: Target    = { sectors: [], company_size: '', decision_maker: '', pain_points: ['', '', ''], geography: '' }
const EMPTY_STYLE: SalesStyle = { tone: 'friendly', agent_name: '', language_style: 'formal', opening_line: '', avoid_words: '' }

// ─── Sector Templates ─────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { product: Partial<Product>; target: Partial<Target>; salesStyle: Partial<SalesStyle>; faq: FAQ[]; obj_answers: string[] }> = {
  'Teknoloji / Yazılım': {
    product: { name: 'SaaS Yazılım Platformu', description: 'İşletmelerin satış, operasyon ve müşteri yönetimi süreçlerini dijitalleştiren bulut tabanlı yazılım. Entegre raporlama ve otomasyon özellikleriyle ekipleriniz daha az manuel iş yaparak daha fazla sonuç alıyor.', price_range: '500-5.000 TL/ay', delivery_time: '1-3 iş günü', advantages: ['%40 daha az manuel iş ve hata', '24 saat içinde kurulum ve eğitim', '7/24 teknik destek dahil'], target_result: 'İlk 3 ayda %30 verimlilik artışı', guarantee: '30 gün ücretsiz deneme, sözleşme yok' },
    target: { sectors: ['Teknoloji / Yazılım', 'Danışmanlık / Hizmet', 'Perakende / E-ticaret'], company_size: '11-50 kişi', decision_maker: 'CEO, CTO, Operasyon Müdürü', pain_points: ['Manuel süreçler çok zaman alıyor', 'Ekipler arası koordinasyon zor', 'Raporlama ve görünürlük yetersiz'], geography: 'Tüm Türkiye' },
    salesStyle: { tone: 'consultative', language_style: 'formal', opening_line: "Merhaba, [AD] [ŞİRKET]'den arıyorum. Şirketinizin operasyon süreçlerini iyileştirmeye yönelik bir çözümümüz var — kısa bir bilgi verebilir miyim?", avoid_words: 'yapay zeka, robot, veri toplama' },
    faq: [{ q: 'Kurulum ne kadar sürer?', a: '24-72 saat içinde sisteminizi kuruyoruz, verilerinizi aktarıyor ve ekibinizi eğitiyoruz.' }, { q: 'Mevcut sistemlerimizle entegre olur mu?', a: 'Yaygın ERP ve CRM sistemleriyle API entegrasyonu sağlıyoruz. Özel entegrasyon da yapıyoruz.' }, { q: 'Güvenlik nasıl sağlanıyor?', a: 'Verileriniz şifrelenmiş Türkiye sunucularında saklanıyor, KVKK uyumluyuz.' }],
    obj_answers: ["Müşterilerimizin %87'si ilk 3 ayda yatırımını geri alıyor. Detaylı ROI hesabı yapabilir miyim?", 'Ücretsiz denemeyle başlayın, bütçe açıldığında zaten sistemi kurmuş olursunuz.', 'Mevcut çözümünüzle karşılaştırmalı bir demo yapalım, karar tamamen size kalır.', 'Sizi bekleyeceğim — ne zaman tekrar aramalıyım?', 'Anlıyorum, size özet bir e-posta atayım, uygun zamanda incelersiniz.'],
  },
  'İnşaat / Gayrimenkul': {
    product: { name: 'İnşaat & Proje Hizmetleri', description: 'Konut, ticari yapı ve endüstriyel tesis inşaatında anahtar teslim çözümler. Proje yönetiminden tadilata, yapı denetiminden restorasyon çalışmalarına kadar geniş hizmet yelpazemizle yanınızdayız.', price_range: 'Projeye özel teklif', delivery_time: 'Projeye göre değişir', advantages: ['Zamanında teslim garantisi ve ceza koşulları', 'TSE/ISO sertifikalı A sınıfı malzeme', 'Şeffaf maliyet takibi ve haftalık raporlama'], target_result: 'Projeler ortalama %15 tasarrufla ve zamanında teslim ediliyor', guarantee: 'Yapı garantisi 10 yıl, işçilik 2 yıl' },
    target: { sectors: ['İnşaat / Gayrimenkul', 'İmalat / Üretim'], company_size: '11-200 kişi', decision_maker: 'Müteahhit, Yatırımcı, Proje Müdürü', pain_points: ['Proje gecikmesi ve maliyet aşımı', 'Alt yüklenici kalite sorunları', 'Ruhsat ve teknik belge süreçleri'], geography: 'İstanbul, Ankara, İzmir' },
    salesStyle: { tone: 'professional', language_style: 'formal', opening_line: "Merhaba, [AD] [ŞİRKET]'den arıyorum. Bölgenizde aktif inşaat projelerine destek veriyoruz. Şu an devam eden veya planlanan bir projeniz var mı?", avoid_words: 'ucuz, hızlı, sorun olmaz' },
    faq: [{ q: 'Teslim tarihi garantili mi?', a: 'Sözleşmede belirlenen tarihi garanti ediyoruz. Gecikme olursa günlük ceza koşulu devreye giriyor.' }, { q: 'Referanslarınız var mı?', a: '50+ tamamlanmış projeyi ziyaret edebilirsiniz. Referans listesi gönderebilirim.' }],
    obj_answers: ['Kaliteli malzeme ve garantili teslimla uzun vadede çok daha ekonomik. Kıyaslamalı bir hesap yapalım mı?', 'Planlama aşamasında fiyat almanız faydalı. Bütçe hazırlarken rakamlarınız netleşir.', 'Mevcut firmanıza ek kapasite sağlayabiliriz. Hangi aşamaları bize devretmek istersiniz?', 'Tabii, proje hazır olduğunda görüşelim. Ne zaman karar sürecine gireceksiniz?', 'Anladım, kısa bir teknik bilgi notu göndereyim — uygun zamanda incelersiniz.'],
  },
  'Tekstil / Moda': {
    product: { name: 'Tekstil Üretim Hizmetleri', description: 'Hazır giyim, kumaş ve tekstil aksesuarları üretimi yapıyoruz. Küçük seriden büyük partilere, özel tasarımdan standart üretime esnek çözümler sunuyoruz.', price_range: 'Ürüne ve adete göre değişir', delivery_time: '2-6 hafta', advantages: ['50 adetten küçük parti üretimi yapıyoruz', 'OEM ve özel etiket üretimi mümkün', 'OEKO-TEX sertifikalı, ihracata uygun'], target_result: 'Üretim maliyetini %20-30 düşürüyoruz', guarantee: 'Hatalı ürün iade garantisi' },
    target: { sectors: ['Tekstil / Moda', 'Perakende / E-ticaret'], company_size: '1-200 kişi', decision_maker: 'Satın Alma Müdürü, İşletme Sahibi', pain_points: ['Minimum sipariş miktarı çok yüksek', 'Teslim süreleri tutarsız', 'Kalite kontrolü yetersiz'], geography: 'Türkiye geneli + ihracat' },
    salesStyle: { tone: 'friendly', language_style: 'informal', opening_line: "Merhaba, [AD] [ŞİRKET]'den arıyorum. Tekstil üretiminde size uygun fiyatlı ve kaliteli alternatif sunabiliriz. Şu an üretim yapıyor musunuz?", avoid_words: 'en ucuz, piyasanın altında' },
    faq: [{ q: 'Minimum sipariş miktarı nedir?', a: '50 adetten başlayan siparişler alıyoruz. Numune için 5-10 adet üretebiliyoruz.' }, { q: 'Kendi modelimizi üretebilir misiniz?', a: 'Evet, teknik çiziminizi veya numunenizi verin, birebir üretelim.' }],
    obj_answers: ['Kalite-fiyat dengesini görmeden karar vermeyin. Numune gönderelim, sonra karar verin.', 'Küçük bütçeyle başlayın. 50 adet numune siparişiyle test edebilirsiniz.', 'Mevcut tedarikçinizle kıyaslayın — numune gönderirsek farkı görürsünüz.', 'Tabii düşünün, numune kataloğu gönderelim.', 'Anladım, numune ve fiyat listesi atayım — uygun zamanda bakarsınız.'],
  },
  'Danışmanlık / Hizmet': {
    product: { name: 'Profesyonel Danışmanlık', description: 'İşletmelere strateji, süreç iyileştirme ve büyüme danışmanlığı veriyoruz. Her müşteriye özel aksiyon planı ve uygulama desteği sağlıyoruz.', price_range: '5.000-50.000 TL/proje', delivery_time: '4-12 hafta', advantages: ['10+ yıl sektör deneyimi', 'Somut aksiyon planı, teorik değil', 'Uygulama sürecinde yanınızdayız'], target_result: 'Müşterilerimiz 6 ayda ortalama %25 büyüyor', guarantee: 'İlk danışmanlık seansı ücretsiz ve bağlayıcı değil' },
    target: { sectors: ['Danışmanlık / Hizmet', 'Teknoloji / Yazılım'], company_size: '11-200 kişi', decision_maker: 'CEO, Genel Müdür, Kurucu', pain_points: ['Büyüme yavaşladı, ne yapacağımızı bilmiyoruz', 'Süreçler karmaşık, verimlilik düşük', 'Doğru strateji belirleyemiyoruz'], geography: 'Tüm Türkiye' },
    salesStyle: { tone: 'consultative', language_style: 'formal', opening_line: "Merhaba, [AD] [ŞİRKET]'den arıyorum. Benzer sektördeki firmalara büyüme danışmanlığı veriyoruz — kısa bir değerlendirme görüşmesi ayarlayabilir miyiz?", avoid_words: 'garantili sonuç, %100 kesin' },
    faq: [{ q: 'Süreç nasıl işliyor?', a: 'Önce ücretsiz ihtiyaç analizi yapıyoruz. Sonra özel aksiyon planı hazırlıyoruz. Haftalık takip toplantılarımız var.' }, { q: 'Sonuçları ne kadar sürede görürüz?', a: 'İlk iyileştirmeler 4-6 haftada görünür. Büyük dönüşümler 3-6 ay sürebilir.' }],
    obj_answers: ['Danışmanlık yatırım, masraf değil. Ortalama 4x ROI var. İlk seansı ücretsiz yapalım?', 'Sıfır risk — ücretsiz ilk seans, sonra karar verin.', 'Metodolojimizi ve referanslarımızı görün, sonra karar verin.', 'Acele etmeyin — ne zaman müsait olursunuz?', 'Anladım, vaka çalışmalarımızı atayım, incelersiniz.'],
  },
}

// ─── Preview Generator ────────────────────────────────────────────────────────

function generatePreview(company: Company, product: Product, style: SalesStyle): string {
  const agent = style.agent_name || 'Temsilci'
  const co = company.name || 'Şirketimiz'
  const adv = (product.advantages || []).find(Boolean) || 'özel avantajlarımız var'
  const result = product.target_result || 'büyük fark yaşanıyor'
  if (style.opening_line) {
    return style.opening_line.replace('[AD]', agent).replace('[ŞİRKET]', co)
  }
  const variants: Record<string, string> = {
    professional: `Merhaba, ben ${agent}, ${co} adına iletişime geçiyorum. ${product.name || 'Ürünümüz'} konusunda size özel bir teklifimiz var — ${adv}. ${result}. Uygun bir zamanda görüşebilir miyiz?`,
    friendly:     `Merhaba! Ben ${agent}, ${co}'dan yazıyorum. ${product.name || 'Ürünümüz'} hakkında kısa bir bilgi vermek istedim — ${adv}. ${result}. 5 dakikan var mı?`,
    consultative: `Merhaba, ben ${agent}. ${co} olarak sektörünüzdeki firmalara ${product.name || 'çözümlerimizle'} destek veriyoruz. ${result}. Şu an bu alanda nasıl çalışıyorsunuz?`,
    direct:       `Merhaba, ${agent} — ${co}. ${product.name || 'Çözümümüz'}: ${adv}. ${result}. Görüşelim mi?`,
  }
  return variants[style.tone] || variants.friendly
}

// ─── Score ────────────────────────────────────────────────────────────────────

function calcScore(c: Company, p: Product, t: Target, s: SalesStyle, faq: FAQ[], obj: FAQ[]): number {
  let sc = 0
  if (c.name?.length > 1) sc += 10
  if (c.sector) sc += 10
  if (c.city) sc += 5
  if (c.website) sc += 5
  if (p.description?.length > 30) sc += 15
  if ((p.advantages || []).filter(Boolean).length >= 2) sc += 10
  if ((t.sectors || []).length > 0) sc += 10
  if (t.decision_maker) sc += 5
  if ((t.pain_points || []).filter(Boolean).length >= 2) sc += 10
  if (s.opening_line?.length > 20) sc += 10
  if (obj.filter(o => o.a).length >= 2) sc += 5
  if (faq.filter(f => f.q && f.a).length >= 1) sc += 5
  return Math.min(sc, 100)
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  bg:          '#070d1a',
  panel:       '#0c1323',
  panelBorder: 'rgba(255,255,255,0.06)',
  card:        'rgba(255,255,255,0.03)',
  cardBorder:  'rgba(255,255,255,0.07)',
  cardActive:  'rgba(59,130,246,0.04)',
  cardActiveBorder: 'rgba(59,130,246,0.18)',
  inputBg:     'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.1)',
  text:        '#e2e8f0',
  textMuted:   '#64748b',
  textLabel:   '#94a3b8',
  blue:        '#3b82f6',
  blueLight:   '#60a5fa',
  green:       '#10b981',
  purple:      '#8b5cf6',
  red:         '#ef4444',
}

const S = {
  card: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 14,
    padding: '22px 24px',
    marginBottom: 16,
  } as React.CSSProperties,

  cardHighlight: {
    background: C.cardActive,
    border: `1px solid ${C.cardActiveBorder}`,
    borderRadius: 14,
    padding: '22px 24px',
    marginBottom: 16,
  } as React.CSSProperties,

  label: {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: C.textLabel, marginBottom: 8,
    letterSpacing: 0.6, textTransform: 'uppercase' as const,
  },

  input: {
    width: '100%', padding: '11px 14px',
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: 10, color: C.text, fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },

  textarea: {
    width: '100%', padding: '11px 14px',
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: 10, color: C.text, fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
    resize: 'vertical' as const, minHeight: 90,
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },

  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,

  btn: {
    padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
  } as React.CSSProperties,

  btnPrimary: {
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#fff', border: 'none',
    boxShadow: '0 0 0 0 rgba(59,130,246,0)',
  } as React.CSSProperties,

  btnGhost: {
    background: 'rgba(255,255,255,0.04)',
    color: C.textLabel,
    border: `1px solid ${C.cardBorder}`,
  } as React.CSSProperties,

  errBox: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, padding: '12px 16px',
    marginBottom: 16, color: '#f87171', fontSize: 13,
  } as React.CSSProperties,
}

// ─── Shared Sub-Components ────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={S.label}>
        {label}
        {required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

function Inp({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input className="ob-input" style={S.input} type={type} value={value} placeholder={placeholder || ''} onChange={e => onChange(e.target.value)} />
}

function Txta({ value, onChange, placeholder, minH = 90 }: { value: string; onChange: (v: string) => void; placeholder?: string; minH?: number }) {
  return <textarea className="ob-input" style={{ ...S.textarea, minHeight: minH }} value={value} placeholder={placeholder || ''} onChange={e => onChange(e.target.value)} />
}

function Sel({ value, onChange, options, placeholder = 'Seçin...' }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <select className="ob-input" style={{ ...S.input, appearance: 'none', cursor: 'pointer', paddingRight: 36 }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none' }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep]           = useState(1)
  const [errors, setErrors]       = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeErr, setAnalyzeErr] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  const [company,    setCompany]    = useState<Company>(EMPTY_COMPANY)
  const [product,    setProduct]    = useState<Product>(EMPTY_PRODUCT)
  const [target,     setTarget]     = useState<Target>(EMPTY_TARGET)
  const [salesStyle, setSalesStyle] = useState<SalesStyle>(EMPTY_STYLE)
  const [faq,        setFaq]        = useState<FAQ[]>([{ q: '', a: '' }, { q: '', a: '' }])
  const [objections, setObjections] = useState<FAQ[]>(DEFAULT_OBJECTIONS.map(q => ({ q, a: '' })))

  // Load saved profile
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/settings/business-profile')
        if (res.data?.profile) {
          const p = res.data.profile
          if (p.company)     setCompany({ ...EMPTY_COMPANY, ...p.company })
          if (p.product)     setProduct({ ...EMPTY_PRODUCT, ...p.product })
          if (p.target)      setTarget({ ...EMPTY_TARGET, ...p.target })
          if (p.sales_style) setSalesStyle({ ...EMPTY_STYLE, ...p.sales_style })
          if (p.faq?.length) setFaq(p.faq)
          if (p.objections?.length) setObjections(p.objections)
          setProfileLoaded(true)
          return
        }
      } catch {}
      try {
        const saved = localStorage.getItem('ob_data')
        if (saved) {
          const d = JSON.parse(saved)
          if (d.company)    setCompany({ ...EMPTY_COMPANY, ...d.company })
          if (d.product)    setProduct({ ...EMPTY_PRODUCT, ...d.product })
          if (d.target)     setTarget({ ...EMPTY_TARGET, ...d.target })
          if (d.salesStyle) setSalesStyle({ ...EMPTY_STYLE, ...d.salesStyle })
          if (d.faq)        setFaq(d.faq)
          if (d.objections) setObjections(d.objections)
          if (d.step > 1)   setStep(d.step)
        }
      } catch {}
    }
    load()
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ob_data', JSON.stringify({ company, product, target, salesStyle, faq, objections, step }))
    } catch {}
  }, [company, product, target, salesStyle, faq, objections, step])

  function validate(): boolean {
    const errs: string[] = []
    if (step === 1) {
      if (!company.name.trim()) errs.push('Şirket adı zorunludur')
      if (!company.sector) errs.push('Sektör seçimi zorunludur')
    }
    if (step === 2) {
      if (!product.name.trim()) errs.push('Ürün / hizmet adı zorunludur')
      if (product.description.length < 20) errs.push('Ürün açıklaması en az 20 karakter olmalıdır')
    }
    setErrors(errs)
    return errs.length === 0
  }

  async function analyzeWebsite() {
    if (!company.website.trim()) return
    setAnalyzing(true); setAnalyzeErr('')
    try {
      const res = await api.post('/api/settings/business-profile/analyze-website', { url: company.website.trim() })
      const d = res.data.data
      if (d.company_name && !company.name.trim()) setCompany(prev => ({ ...prev, name: d.company_name }))
      if (d.sector && SECTORS.includes(d.sector)) setCompany(prev => ({ ...prev, sector: d.sector }))
      if (d.city && !company.city.trim()) setCompany(prev => ({ ...prev, city: d.city }))
      if (d.product_name)       setProduct(prev => ({ ...prev, name: d.product_name }))
      if (d.product_description) setProduct(prev => ({ ...prev, description: d.product_description }))
      if (d.advantages?.length)  setProduct(prev => ({ ...prev, advantages: [...d.advantages.slice(0, 3), ...prev.advantages].slice(0, 3) }))
      if (d.target_result)       setProduct(prev => ({ ...prev, target_result: d.target_result }))
    } catch (e: any) {
      setAnalyzeErr(e?.response?.data?.error || 'Website analiz edilemedi. Lütfen manuel doldurun.')
    }
    setAnalyzing(false)
  }

  function applyTemplate() {
    const tmpl = TEMPLATES[company.sector]
    if (!tmpl) return
    setProduct(prev => ({ ...prev, ...tmpl.product }))
    setTarget(prev => ({ ...prev, ...tmpl.target }))
    setSalesStyle(prev => ({ ...prev, ...tmpl.salesStyle }))
    setFaq(tmpl.faq)
    setObjections(DEFAULT_OBJECTIONS.map((q, i) => ({ q, a: tmpl.obj_answers[i] || '' })))
  }

  async function goNext() {
    if (!validate()) return
    try { await api.patch('/api/settings', { onboarding_step: step }) } catch {}
    setErrors([])
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setErrors([])
    setStep(s => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function finish() {
    setSaving(true)
    try {
      await api.post('/api/settings/business-profile', {
        company, product, target, salesStyle,
        faq: faq.filter(f => f.q?.trim() && f.a?.trim()),
        objections: objections.filter(o => o.a?.trim()),
      })
      await api.patch('/api/settings', {
        company_name: company.name,
        sector: company.sector,
        city: company.city,
        website: company.website,
        onboarding_done: true,
      })
      localStorage.removeItem('ob_data')
      await new Promise(r => setTimeout(r, 400))
      window.location.href = '/dashboard'
    } catch {
      setSaving(false)
    }
  }

  const score    = calcScore(company, product, target, salesStyle, faq, objections)
  const preview  = generatePreview(company, product, salesStyle)
  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'inherit', display: 'flex' }}>

      {/* ── Left Panel ────────────────────────────────────────────────────── */}
      <div id="ob-left-panel" style={{
        width: 260, flexShrink: 0,
        background: C.panel,
        borderRight: `1px solid ${C.panelBorder}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px 24px', borderBottom: `1px solid ${C.panelBorder}` }}>
          <SovloLogo size="md" theme="dark" />
        </div>

        {/* Steps */}
        <div style={{ padding: '20px 16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', padding: '0 8px', marginBottom: 12 }}>
            Kurulum Adımları
          </div>
          {STEPS.map(s => {
            const done   = step > s.id
            const active = step === s.id
            const Icon   = s.icon
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: active ? '1px solid rgba(59,130,246,0.22)' : '1px solid transparent',
                transition: 'all 0.2s',
              }}>
                {/* Circle indicator */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done
                    ? 'rgba(16,185,129,0.15)'
                    : active
                      ? 'rgba(59,130,246,0.2)'
                      : 'rgba(255,255,255,0.04)',
                  border: done
                    ? '1.5px solid rgba(16,185,129,0.35)'
                    : active
                      ? '1.5px solid rgba(59,130,246,0.45)'
                      : `1.5px solid ${C.panelBorder}`,
                  transition: 'all 0.2s',
                }}>
                  {done
                    ? <Check size={13} color={C.green} strokeWidth={2.5} />
                    : <Icon size={13} color={active ? C.blueLight : C.textMuted} />
                  }
                </div>
                {/* Label */}
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    color: active ? C.text : done ? '#6b7f9a' : C.textMuted,
                    lineHeight: 1.2,
                  }}>
                    {s.title}
                  </div>
                  {active && (
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.desc}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom progress */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.panelBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>İlerleme</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.blueLight }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #2563eb, #8b5cf6)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Adım {step} / {STEPS.length}</div>
        </div>
      </div>

      {/* ── Right Content ─────────────────────────────────────────────────── */}
      <div id="ob-right-panel" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Mobile top bar (hidden on desktop) */}
        <div id="ob-mobile-top" style={{ display: 'none' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.panelBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <SovloLogo size="sm" theme="dark" />
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{STEPS.length}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#2563eb,#8b5cf6)', transition: 'width 0.4s' }} />
          </div>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, padding: '40px 48px 60px', maxWidth: 720, width: '100%' }} id="ob-form-area">

          {/* Step header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {(() => { const Icon = STEPS[step - 1].icon; return <Icon size={22} color={C.blue} /> })()}
              <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.3 }}>
                {STEPS[step - 1].title}
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: C.textMuted, lineHeight: 1.5 }}>
              {STEPS[step - 1].desc}
            </p>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={S.errBox}>
              {errors.map((e, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ opacity: 0.7 }}>•</span> {e}</div>)}
            </div>
          )}

          {/* Step content */}
          {step === 1 && <Step1Company company={company} setCompany={setCompany} analyzing={analyzing} analyzeErr={analyzeErr} onAnalyze={analyzeWebsite} onTemplate={applyTemplate} profileLoaded={profileLoaded} />}
          {step === 2 && <Step2Product product={product} setProduct={setProduct} />}
          {step === 3 && <Step3Target target={target} setTarget={setTarget} />}
          {step === 4 && <Step4Style salesStyle={salesStyle} setSalesStyle={setSalesStyle} preview={preview} />}
          {step === 5 && <Step5FAQ faq={faq} setFaq={setFaq} objections={objections} setObjections={setObjections} />}
          {step === 6 && <Step6Done company={company} product={product} salesStyle={salesStyle} score={score} saving={saving} onFinish={finish} />}

          {/* Navigation */}
          {step < 6 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 32, paddingTop: 24,
              borderTop: `1px solid ${C.panelBorder}`,
            }}>
              {step > 1
                ? (
                  <button className="ob-btn-ghost" style={{ ...S.btn, ...S.btnGhost }} onClick={goBack}>
                    <ArrowLeft size={15} /> Geri
                  </button>
                )
                : <div />
              }
              <button className="ob-btn-primary" style={{ ...S.btn, ...S.btnPrimary }} onClick={goNext}>
                {step === 5 ? 'Profili Kaydet' : 'Devam Et'} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes ob-spin { to { transform: rotate(360deg) } }
        @keyframes ob-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        .ob-input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
          background: rgba(59,130,246,0.04) !important;
        }
        .ob-input::placeholder { color: rgba(100,116,139,0.7); }
        .ob-input option { background: #1e293b; color: #e2e8f0; }

        .ob-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
          box-shadow: 0 4px 16px rgba(59,130,246,0.35) !important;
          transform: translateY(-1px);
        }
        .ob-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .ob-btn-ghost:hover {
          background: rgba(255,255,255,0.07) !important;
          color: #e2e8f0 !important;
        }
        .ob-tag:hover { opacity: 0.85; }

        @media (max-width: 768px) {
          #ob-left-panel { display: none !important; }
          #ob-mobile-top { display: block !important; }
          #ob-form-area { padding: 24px 20px 80px !important; max-width: 100% !important; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          #ob-left-panel { width: 220px !important; }
          #ob-form-area { padding: 32px 32px 60px !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Step 1: Şirket Profili ───────────────────────────────────────────────────

function Step1Company({ company, setCompany, analyzing, analyzeErr, onAnalyze, onTemplate, profileLoaded }: {
  company: Company; setCompany: React.Dispatch<React.SetStateAction<Company>>
  analyzing: boolean; analyzeErr: string; onAnalyze: () => void; onTemplate: () => void; profileLoaded: boolean
}) {
  const set = (k: keyof Company) => (v: string) => setCompany(p => ({ ...p, [k]: v }))
  const tmplAvail = !!TEMPLATES[company.sector]

  return (
    <div>
      {profileLoaded && (
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#34d399', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={14} /> Mevcut profiliniz yüklendi. Düzenleyip devam edebilirsiniz.
        </div>
      )}

      {/* AI auto-fill */}
      <div style={S.cardHighlight}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.blueLight, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          <Sparkles size={13} /> AI ile Otomatik Doldur
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
          Web sitenizi girin — AI şirket adı, sektör, ürün bilgilerini otomatik analiz edip doldurur.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="ob-input"
            style={{ ...S.input, flex: '1 1 180px', minWidth: 0 }}
            placeholder="https://sirketiniz.com"
            value={company.website}
            onChange={e => setCompany(p => ({ ...p, website: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onAnalyze()}
          />
          <button
            className="ob-btn-primary"
            style={{ ...S.btn, ...S.btnPrimary, flexShrink: 0, opacity: analyzing || !company.website.trim() ? 0.55 : 1 }}
            onClick={onAnalyze}
            disabled={analyzing || !company.website.trim()}
          >
            {analyzing
              ? <><Loader2 size={14} style={{ animation: 'ob-spin 1s linear infinite' }} /> Analiz ediliyor...</>
              : <><Globe size={14} /> Analiz Et</>
            }
          </button>
        </div>
        {analyzeErr && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{analyzeErr}</div>}
      </div>

      <div style={S.card}>
        <Field label="Şirket Adı" required>
          <Inp value={company.name} onChange={set('name')} placeholder="Örn: Özkan Tekstil A.Ş." />
        </Field>

        <Field label="Sektör" required>
          <Sel value={company.sector} onChange={set('sector')} options={SECTORS} placeholder="Sektör seçin..." />
        </Field>

        {/* Template suggestion */}
        {tmplAvail && (
          <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, color: '#c4b5fd', fontWeight: 500 }}>Hazır şablon mevcut</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{company.sector} sektörü için tüm adımları dolduracak</div>
            </div>
            <button
              className="ob-tag"
              style={{ ...S.btn, padding: '7px 14px', fontSize: 12, background: 'rgba(139,92,246,0.14)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.28)', flexShrink: 0 }}
              onClick={onTemplate}
            >
              <Star size={12} fill="currentColor" /> Şablon Yükle
            </button>
          </div>
        )}

        <div style={S.row2}>
          <Field label="Şehir">
            <Inp value={company.city} onChange={set('city')} placeholder="İstanbul" />
          </Field>
          <Field label="Çalışan Sayısı">
            <Sel value={company.employee_count} onChange={set('employee_count')} options={['1-10 kişi', '11-50 kişi', '51-200 kişi', '201-500 kişi', '500+ kişi']} />
          </Field>
        </div>

        <Field label="Şirket Telefonu">
          <Inp value={company.phone} onChange={set('phone')} placeholder="+90 555 000 0000" type="tel" />
        </Field>
      </div>
    </div>
  )
}

// ─── Step 2: Ürün & Hizmet ───────────────────────────────────────────────────

function Step2Product({ product, setProduct }: { product: Product; setProduct: React.Dispatch<React.SetStateAction<Product>> }) {
  const set = (k: keyof Product) => (v: any) => setProduct(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div style={S.card}>
        <Field label="Ürün / Hizmet Adı" required>
          <Inp value={product.name} onChange={set('name')} placeholder="Örn: CRM Yazılımı, İnşaat Hizmetleri, Toptan Tekstil..." />
        </Field>
        <Field label="Açıklama" required hint={`${product.description.length} karakter — AI sisteminiz bu metni kullanacak, net ve ikna edici yazın`}>
          <Txta value={product.description} onChange={set('description')} minH={120}
            placeholder="Ne iş yapıyorsunuz? Müşterilerinize ne sağlıyorsunuz? AI sisteminiz bu metni kullanarak müşterilerle konuşacak — net ve ikna edici yazın." />
        </Field>
        <div style={S.row2}>
          <Field label="Fiyat Aralığı">
            <Inp value={product.price_range} onChange={set('price_range')} placeholder="2.000-10.000 TL/ay" />
          </Field>
          <Field label="Teslimat Süresi">
            <Inp value={product.delivery_time} onChange={set('delivery_time')} placeholder="1-3 iş günü" />
          </Field>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 14 }}>
          3 Temel Avantaj
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blueLight, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {i + 1}
            </div>
            <input
              className="ob-input"
              style={{ ...S.input, flex: 1 }}
              placeholder={['%40 daha az manuel iş', '24 saatte kurulum ve eğitim', '7/24 teknik destek'][i]}
              value={product.advantages[i] || ''}
              onChange={e => {
                const adv = [...product.advantages]
                adv[i] = e.target.value
                set('advantages')(adv)
              }}
            />
          </div>
        ))}
      </div>

      <div style={S.card}>
        <Field label="Müşteriye Sağlanan Kazanım">
          <Inp value={product.target_result} onChange={set('target_result')} placeholder="Müşterilerimiz ilk 3 ayda %30 verimlilik artışı yaşıyor" />
        </Field>
        <Field label="Garanti / Taahhüt">
          <Inp value={product.guarantee} onChange={set('guarantee')} placeholder="30 gün ücretsiz deneme, sözleşme yok" />
        </Field>
      </div>
    </div>
  )
}

// ─── Step 3: Hedef Müşteri ────────────────────────────────────────────────────

function Step3Target({ target, setTarget }: { target: Target; setTarget: React.Dispatch<React.SetStateAction<Target>> }) {
  const set = (k: keyof Target) => (v: any) => setTarget(p => ({ ...p, [k]: v }))

  const toggleSector = (s: string) => {
    const cur = target.sectors || []
    setTarget(p => ({ ...p, sectors: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] }))
  }

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 14 }}>
          Hedef Sektörler
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SECTORS.map(s => {
            const sel = (target.sectors || []).includes(s)
            return (
              <button key={s} className="ob-tag" onClick={() => toggleSector(s)} style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit',
                background: sel ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                border: sel ? '1px solid rgba(59,130,246,0.4)' : `1px solid ${C.cardBorder}`,
                color: sel ? C.blueLight : C.textMuted, transition: 'all 0.15s', fontWeight: sel ? 600 : 400,
              }}>{s}</button>
            )
          })}
        </div>
      </div>

      <div style={S.card}>
        <div style={S.row2}>
          <Field label="Şirket Büyüklüğü">
            <Sel value={target.company_size} onChange={set('company_size')} options={['1-10 kişi', '11-50 kişi', '51-200 kişi', '201-500 kişi', '500+ kişi']} />
          </Field>
          <Field label="Hedef Şehir / Bölge">
            <Inp value={target.geography} onChange={set('geography')} placeholder="İstanbul, Ankara, Tüm TR" />
          </Field>
        </div>
        <Field label="Karar Verici Unvan">
          <Inp value={target.decision_maker} onChange={set('decision_maker')} placeholder="CEO, Satın Alma Müdürü, Genel Müdür" />
        </Field>
      </div>

      <div style={S.card}>
        <Field label="Hedef Müşterinin 3 Temel Sorunu" hint="AI sisteminiz bu sorunları vurgulayarak konuşma açacak">
          <div />
        </Field>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <input
              className="ob-input"
              style={{ ...S.input, flex: 1 }}
              placeholder={['Manuel süreçler çok zaman alıyor', 'Proje gecikmesi ve maliyet aşımı', 'Müşteri takibi yetersiz'][i]}
              value={target.pain_points[i] || ''}
              onChange={e => {
                const pts = [...(target.pain_points || ['', '', ''])]
                pts[i] = e.target.value
                set('pain_points')(pts)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 4: Satış Tarzı ─────────────────────────────────────────────────────

function Step4Style({ salesStyle, setSalesStyle, preview }: { salesStyle: SalesStyle; setSalesStyle: React.Dispatch<React.SetStateAction<SalesStyle>>; preview: string }) {
  const set = (k: keyof SalesStyle) => (v: string) => setSalesStyle(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div style={S.card}>
        <Field label="AI Temsilci Adı" hint="Müşteriye bu isimle tanışacak (Örn: Ayşe, Mert, Alex)">
          <Inp value={salesStyle.agent_name} onChange={set('agent_name')} placeholder="Örn: Ayşe, Mert, Alex" />
        </Field>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 14 }}>
          Konuşma Tonu
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {TONES.map(t => {
            const sel = salesStyle.tone === t.key
            return (
              <button key={t.key} className="ob-tag" onClick={() => set('tone')(t.key)} style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: sel ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                border: sel ? '1.5px solid rgba(59,130,246,0.4)' : `1px solid ${C.cardBorder}`,
                color: sel ? '#93c5fd' : C.textMuted, textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{t.label}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{t.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={S.card}>
        <Field label="Konuşma Açılış Cümlesi" hint="[AD] → temsilci adı, [ŞİRKET] → şirket adınız">
          <Txta value={salesStyle.opening_line} onChange={set('opening_line')} minH={90}
            placeholder="Merhaba, [AD] [ŞİRKET]'den arıyorum. Şirketinizin süreçlerini iyileştirmeye yönelik bir çözümümüz var — kısa bir bilgi verebilir miyim?" />
        </Field>
        <Field label="Kullanılmayacak Kelimeler">
          <Inp value={salesStyle.avoid_words} onChange={set('avoid_words')} placeholder="yapay zeka, robot, veri toplama (virgülle ayırın)" />
        </Field>
      </div>

      {/* WhatsApp Preview */}
      <div style={{ ...S.card, background: 'rgba(37,211,102,0.03)', border: '1px solid rgba(37,211,102,0.12)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.6, textTransform: 'uppercase' as const }}>
          <Phone size={13} /> Örnek WhatsApp Mesajı
        </div>
        <div style={{ background: '#0a1221', borderRadius: 14, padding: '16px', border: `1px solid ${C.panelBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.panelBorder}` }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#25d366,#128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {salesStyle.agent_name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{salesStyle.agent_name || 'AI Temsilci'}</div>
              <div style={{ fontSize: 11, color: '#25d366' }}>Çevrimiçi</div>
            </div>
          </div>
          <div style={{ background: '#25d366', borderRadius: '2px 14px 14px 14px', padding: '12px 14px', maxWidth: '88%', fontSize: 13, color: '#000', lineHeight: 1.6 }}>
            {preview || 'Ton seçin veya açılış cümlesi yazın...'}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 5: SSS & İtirazlar ─────────────────────────────────────────────────

function Step5FAQ({ faq, setFaq, objections, setObjections }: { faq: FAQ[]; setFaq: React.Dispatch<React.SetStateAction<FAQ[]>>; objections: FAQ[]; setObjections: React.Dispatch<React.SetStateAction<FAQ[]>> }) {
  return (
    <div>
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const }}>
            Sık Sorulan Sorular
          </div>
          <button className="ob-btn-ghost" style={{ ...S.btn, ...S.btnGhost, padding: '6px 12px', fontSize: 12 }} onClick={() => setFaq(f => [...f, { q: '', a: '' }])}>
            <Plus size={13} /> Ekle
          </button>
        </div>
        {faq.map((f, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Soru {i + 1}</span>
              {faq.length > 1 && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, lineHeight: 1 }} onClick={() => setFaq(f => f.filter((_, j) => j !== i))}><X size={14} /></button>}
            </div>
            <input className="ob-input" style={{ ...S.input, marginBottom: 8 }} placeholder="Müşteri ne soruyor?" value={f.q} onChange={e => setFaq(faq => faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
            <textarea className="ob-input" style={{ ...S.textarea, minHeight: 64 }} placeholder="AI temsilci ne cevap vermeli?" value={f.a} onChange={e => setFaq(faq => faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 6 }}>
          İtiraz Karşılama
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Müşteri bu itirazları dile getirdiğinde AI temsilci ne söyleyecek?</div>
        {objections.map((obj, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '14px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 10 }}>"{obj.q}"</div>
            <textarea className="ob-input" style={{ ...S.textarea, minHeight: 64 }} placeholder="AI temsilci bunu duyduğunda ne söylemeli?" value={obj.a} onChange={e => setObjections(objs => objs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 6: Tamamlandı ───────────────────────────────────────────────────────

function Step6Done({ company, product, salesStyle, score, saving, onFinish }: {
  company: Company; product: Product; salesStyle: SalesStyle
  score: number; saving: boolean; onFinish: () => void
}) {
  const agent = salesStyle.agent_name || 'AI Temsilci'
  const co    = company.name || 'Şirketiniz'
  const scoreColor = score >= 80 ? C.green : score >= 55 ? '#f59e0b' : C.red
  const scoreLabel = score >= 80 ? 'Mükemmel profil' : score >= 55 ? 'İyi — biraz daha detay ekleyin' : 'Eksik — profili tamamlayın'

  return (
    <div>
      {/* Score card */}
      <div style={{ ...S.card, textAlign: 'center', padding: '36px 28px' }}>
        {/* Circular score */}
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 16 }}>
            <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>/ 100</span>
            </div>
          </div>
          <div style={{ fontSize: 15, color: scoreColor, fontWeight: 700, marginBottom: 4 }}>{scoreLabel}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>Profil Tamamlanma Puanı</div>
        </div>

        <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.8 }}>
          <strong style={{ color: C.text }}>{agent}</strong> artık{' '}
          <strong style={{ color: C.text }}>{co}</strong> adına<br />
          profesyonel satış görüşmeleri yapacak.
        </div>
      </div>

      {/* Summary */}
      <div style={S.card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 16 }}>
          Kurulum Özeti
        </div>
        {[
          { label: 'Şirket', value: co },
          { label: 'Sektör', value: company.sector || '—' },
          { label: 'Şehir', value: company.city || '—' },
          { label: 'Ürün/Hizmet', value: product.name || '—' },
          { label: 'AI Temsilci', value: agent },
          { label: 'Satış Tonu', value: { professional: 'Profesyonel', friendly: 'Samimi', consultative: 'Danışmancı', direct: 'Direkt' }[salesStyle.tone] || salesStyle.tone },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
            <span style={{ color: C.textMuted, fontSize: 13 }}>{row.label}</span>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* What's ready */}
      <div style={S.card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLabel, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 16 }}>
          Sisteminiz Hazır
        </div>
        {[
          'AI Satış Temsilciniz aktif ve eğitildi',
          'WhatsApp & Arama kampanyaları açılabilir',
          'Lead scraping sonuçları kişiselleştirilecek',
          'Rakip analizi sektörünüze göre yapılacak',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={11} color={C.green} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, color: C.textMuted }}>{item}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="ob-btn-primary"
        onClick={onFinish}
        disabled={saving}
        style={{
          ...S.btn, ...S.btnPrimary,
          width: '100%', justifyContent: 'center',
          padding: '14px 28px', fontSize: 15, borderRadius: 12,
          marginTop: 8,
        }}
      >
        {saving
          ? <><Loader2 size={16} style={{ animation: 'ob-spin 1s linear infinite' }} /> Dashboard açılıyor...</>
          : <>Dashboard&apos;a Git <ArrowRight size={16} /></>
        }
      </button>
    </div>
  )
}
