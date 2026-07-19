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
  { id: 1, icon: Building2,     title: 'Şirket',   fullTitle: 'Şirket Profili',  desc: 'Temel bilgilerinizi girin' },
  { id: 2, icon: Package,       title: 'Ürün',     fullTitle: 'Ürün & Hizmet',   desc: 'Ne sattığınızı anlayalım' },
  { id: 3, icon: Users,         title: 'Hedef',    fullTitle: 'Hedef Müşteri',   desc: 'Kimi arıyorsunuz?' },
  { id: 4, icon: Mic2,          title: 'Tarz',     fullTitle: 'Satış Tarzı',     desc: 'Nasıl konuşuyorsunuz?' },
  { id: 5, icon: MessageSquare, title: 'SSS',      fullTitle: 'SSS & İtirazlar', desc: 'Hazır cevaplar oluşturun' },
  { id: 6, icon: CheckCircle,   title: 'Hazır',    fullTitle: 'Tamamlandı',      desc: 'Sisteminiz kuruldu' },
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
    faq: [{ q: 'Kurulum ne kadar sürer?', a: '24-72 saat içinde sisteminizi kuruyoruz, verilerinizi aktarıyor ve ekibinizi eğitiyoruz.' }, { q: 'Mevcut sistemlerimizle entegre olur mu?', a: 'Yaygın ERP ve CRM sistemleriyle API entegrasyonu sağlıyoruz. Özel entegrasyon da yapıyoruz.' }],
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePreview(company: Company, product: Product, style: SalesStyle): string {
  const agent = style.agent_name || 'Temsilci'
  const co    = company.name || 'Şirketimiz'
  const adv   = (product.advantages || []).find(Boolean) || 'özel avantajlarımız var'
  const result= product.target_result || 'büyük fark yaşanıyor'
  if (style.opening_line) return style.opening_line.replace('[AD]', agent).replace('[ŞİRKET]', co)
  const v: Record<string, string> = {
    professional: `Merhaba, ben ${agent}, ${co} adına iletişime geçiyorum. ${product.name || 'Ürünümüz'} konusunda size özel bir teklifimiz var — ${adv}. ${result}. Uygun bir zamanda görüşebilir miyiz?`,
    friendly:     `Merhaba! Ben ${agent}, ${co}'dan yazıyorum. ${product.name || 'Ürünümüz'} hakkında kısa bir bilgi vermek istedim — ${adv}. ${result}. 5 dakikan var mı?`,
    consultative: `Merhaba, ben ${agent}. ${co} olarak sektörünüzdeki firmalara ${product.name || 'çözümlerimizle'} destek veriyoruz. ${result}. Şu an bu alanda nasıl çalışıyorsunuz?`,
    direct:       `Merhaba, ${agent} — ${co}. ${product.name || 'Çözümümüz'}: ${adv}. ${result}. Görüşelim mi?`,
  }
  return v[style.tone] || v.friendly
}

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

// ─── Design Tokens (Light) ────────────────────────────────────────────────────

const T = {
  pageBg:       '#f1f5f9',
  headerBg:     '#ffffff',
  cardBg:       '#ffffff',
  inputBg:      '#f8fafc',
  border:       '#e2e8f0',
  borderFocus:  '#2563eb',
  primary:      '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#eff6ff',
  primaryBorder:'#bfdbfe',
  text:         '#0f172a',
  textMuted:    '#64748b',
  textLabel:    '#475569',
  success:      '#059669',
  successLight: '#ecfdf5',
  successBorder:'#a7f3d0',
  warning:      '#d97706',
  error:        '#dc2626',
  errorLight:   '#fef2f2',
  purple:       '#7c3aed',
  purpleLight:  '#faf5ff',
  purpleBorder: '#e9d5ff',
}

// ─── Shared Sub-Components ────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="ob-field">
      <label className="ob-label">
        {label}{required && <span style={{ color: T.error, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <div className="ob-hint">{hint}</div>}
    </div>
  )
}

function Inp(props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      className="ob-input"
      type={props.type || 'text'}
      value={props.value}
      placeholder={props.placeholder || ''}
      onChange={e => props.onChange(e.target.value)}
    />
  )
}

function Txta(props: { value: string; onChange: (v: string) => void; placeholder?: string; minH?: number }) {
  return (
    <textarea
      className="ob-input ob-textarea"
      style={{ minHeight: props.minH || 96 }}
      value={props.value}
      placeholder={props.placeholder || ''}
      onChange={e => props.onChange(e.target.value)}
    />
  )
}

function Sel(props: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        className="ob-input ob-select"
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
      >
        <option value="">{props.placeholder || 'Seçin...'}</option>
        {props.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={15} className="ob-select-arrow" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
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

  useEffect(() => {
    try { localStorage.setItem('ob_data', JSON.stringify({ company, product, target, salesStyle, faq, objections, step })) } catch {}
  }, [company, product, target, salesStyle, faq, objections, step])

  function validate(): boolean {
    const errs: string[] = []
    if (step === 1) {
      if (!company.name.trim()) errs.push('Şirket adı zorunludur')
      if (!company.sector)      errs.push('Sektör seçimi zorunludur')
    }
    if (step === 2) {
      if (!product.name.trim())          errs.push('Ürün / hizmet adı zorunludur')
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
      const d = res.data   // api.ts returns JSON body directly (not Axios wrapper)
      if (d.company_name && !company.name.trim()) setCompany(p => ({ ...p, name: d.company_name }))
      if (d.sector && SECTORS.includes(d.sector)) setCompany(p => ({ ...p, sector: d.sector }))
      if (d.city && !company.city.trim())          setCompany(p => ({ ...p, city: d.city }))
      if (d.product_name)        setProduct(p => ({ ...p, name: d.product_name }))
      if (d.product_description) setProduct(p => ({ ...p, description: d.product_description }))
      if (d.advantages?.length)  setProduct(p => ({ ...p, advantages: [...d.advantages.slice(0, 3), ...p.advantages].slice(0, 3) }))
      if (d.target_result)       setProduct(p => ({ ...p, target_result: d.target_result }))
    } catch (e: any) {
      setAnalyzeErr(e?.message || 'Website analiz edilemedi.')
    }
    setAnalyzing(false)
  }

  function applyTemplate() {
    const t = TEMPLATES[company.sector]
    if (!t) return
    setProduct(p => ({ ...p, ...t.product }))
    setTarget(p => ({ ...p, ...t.target }))
    setSalesStyle(p => ({ ...p, ...t.salesStyle }))
    setFaq(t.faq)
    setObjections(DEFAULT_OBJECTIONS.map((q, i) => ({ q, a: t.obj_answers[i] || '' })))
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
        company_name: company.name, sector: company.sector,
        city: company.city, website: company.website,
        onboarding_done: true,
      })
      localStorage.removeItem('ob_data')
      await new Promise(r => setTimeout(r, 300))
      window.location.href = '/dashboard'
    } catch { setSaving(false) }
  }

  const score    = calcScore(company, product, target, salesStyle, faq, objections)
  const preview  = generatePreview(company, product, salesStyle)
  const progress = ((step - 1) / (STEPS.length - 1)) * 100
  const current  = STEPS[step - 1]

  return (
    <div className="ob-page">

      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <header className="ob-header">
        <div className="ob-header-inner">
          <SovloLogo size="sm" theme="light" />
          <div className="ob-header-right">
            <span className="ob-step-badge">Adım {step}/{STEPS.length}</span>
          </div>
        </div>
      </header>

      {/* ── Step Bar (desktop) ────────────────────────────────────────────── */}
      <div className="ob-stepbar-wrap">
        <div className="ob-stepbar">
          {STEPS.map((s, i) => {
            const done   = step > s.id
            const active = step === s.id
            const Icon   = s.icon
            return (
              <div key={s.id} className={`ob-step-item ${active ? 'ob-step-active' : done ? 'ob-step-done' : 'ob-step-pending'}`}>
                {/* Connector line (before each step except first) */}
                {i > 0 && (
                  <div className={`ob-step-line ${done || active ? 'ob-step-line-filled' : ''}`} />
                )}
                {/* Circle */}
                <div className="ob-step-circle">
                  {done
                    ? <Check size={13} strokeWidth={2.5} />
                    : active
                      ? <Icon size={13} />
                      : <span className="ob-step-num">{s.id}</span>
                  }
                </div>
                {/* Label */}
                <span className="ob-step-label">{s.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile progress bar (shown instead of step circles on small screens) */}
      <div className="ob-mobile-progress">
        <div className="ob-mobile-progress-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(() => { const Icon = current.icon; return <Icon size={15} color={T.primary} /> })()}
            <span className="ob-mobile-step-title">{current.fullTitle}</span>
          </div>
          <span className="ob-mobile-step-count">{step} / {STEPS.length}</span>
        </div>
        <div className="ob-mobile-bar-track">
          <div className="ob-mobile-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Form Content ─────────────────────────────────────────────────── */}
      <main className="ob-main">
        {/* Step heading */}
        <div className="ob-step-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(() => { const Icon = current.icon; return <Icon size={20} color={T.primary} /> })()}
            <h1 className="ob-step-title-text">{current.fullTitle}</h1>
          </div>
          <p className="ob-step-desc">{current.desc}</p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="ob-error-box">
            {errors.map((e, i) => <div key={i} className="ob-error-item">• {e}</div>)}
          </div>
        )}

        {/* Step content */}
        {step === 1 && <Step1Company company={company} setCompany={setCompany} analyzing={analyzing} analyzeErr={analyzeErr} onAnalyze={analyzeWebsite} onTemplate={applyTemplate} profileLoaded={profileLoaded} />}
        {step === 2 && <Step2Product product={product} setProduct={setProduct} />}
        {step === 3 && <Step3Target  target={target}   setTarget={setTarget} />}
        {step === 4 && <Step4Style   salesStyle={salesStyle} setSalesStyle={setSalesStyle} preview={preview} />}
        {step === 5 && <Step5FAQ     faq={faq} setFaq={setFaq} objections={objections} setObjections={setObjections} />}
        {step === 6 && <Step6Done    company={company} product={product} salesStyle={salesStyle} score={score} saving={saving} onFinish={finish} />}

        {/* Navigation */}
        {step < 6 && (
          <div className="ob-nav">
            <div>
              {step > 1 && (
                <button className="ob-btn ob-btn-ghost" onClick={goBack}>
                  <ArrowLeft size={15} /> Geri
                </button>
              )}
            </div>
            <button className="ob-btn ob-btn-primary" onClick={goNext}>
              {step === 5 ? 'Profili Kaydet' : 'Devam Et'} <ArrowRight size={15} />
            </button>
          </div>
        )}
      </main>

      {/* ── Styles ───────────────────────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; }

        .ob-page {
          min-height: 100vh;
          background: ${T.pageBg};
          color: ${T.text};
          font-family: inherit;
        }

        /* Header */
        .ob-header {
          position: sticky; top: 0; z-index: 50;
          background: ${T.headerBg};
          border-bottom: 1px solid ${T.border};
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .ob-header-inner {
          max-width: 860px; margin: 0 auto;
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ob-header-right { display: flex; align-items: center; gap: 12; }
        .ob-step-badge {
          font-size: 12px; font-weight: 600;
          color: ${T.textMuted};
          background: ${T.pageBg};
          border: 1px solid ${T.border};
          border-radius: 20px; padding: 3px 10px;
        }

        /* Step bar (desktop) */
        .ob-stepbar-wrap {
          background: ${T.headerBg};
          border-bottom: 1px solid ${T.border};
          padding: 0 24px;
        }
        .ob-stepbar {
          max-width: 860px; margin: 0 auto;
          display: flex; align-items: center;
          padding: 16px 0;
          position: relative;
        }
        .ob-step-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; flex: 1; position: relative;
          cursor: default;
        }
        .ob-step-line {
          position: absolute; top: 16px;
          right: 50%; width: 100%;
          height: 2px; background: ${T.border};
          z-index: 0;
          transition: background 0.3s;
        }
        .ob-step-line-filled { background: ${T.primary}; }

        .ob-step-circle {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          position: relative; z-index: 1;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .ob-step-active .ob-step-circle {
          background: ${T.primary}; color: #fff;
          box-shadow: 0 0 0 4px ${T.primaryLight};
        }
        .ob-step-done .ob-step-circle {
          background: ${T.success}; color: #fff;
        }
        .ob-step-pending .ob-step-circle {
          background: ${T.headerBg}; color: ${T.textMuted};
          border: 2px solid ${T.border};
        }

        .ob-step-label {
          font-size: 11px; font-weight: 500;
          white-space: nowrap;
          transition: color 0.2s;
        }
        .ob-step-active  .ob-step-label { color: ${T.primary}; font-weight: 700; }
        .ob-step-done    .ob-step-label { color: ${T.success}; }
        .ob-step-pending .ob-step-label { color: ${T.textMuted}; }
        .ob-step-num { font-size: 12px; font-weight: 700; }

        /* Mobile progress (hidden on desktop) */
        .ob-mobile-progress { display: none; }

        /* Main content */
        .ob-main {
          max-width: 720px; margin: 0 auto;
          padding: 32px 24px 80px;
        }
        .ob-step-heading { margin-bottom: 24px; }
        .ob-step-title-text {
          font-size: 22px; font-weight: 700;
          color: ${T.text}; margin: 0;
          letter-spacing: -0.3px;
        }
        .ob-step-desc {
          margin: 6px 0 0; font-size: 14px; color: ${T.textMuted};
        }

        /* Cards */
        .ob-card {
          background: ${T.cardBg};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 22px 22px;
          margin-bottom: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .ob-card-blue {
          background: ${T.primaryLight};
          border: 1px solid ${T.primaryBorder};
          border-radius: 12px;
          padding: 20px 22px;
          margin-bottom: 16px;
        }
        .ob-card-green {
          background: ${T.successLight};
          border: 1px solid ${T.successBorder};
          border-radius: 12px;
          padding: 20px 22px;
          margin-bottom: 16px;
        }
        .ob-card-purple {
          background: ${T.purpleLight};
          border: 1px solid ${T.purpleBorder};
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 18px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }

        /* Fields */
        .ob-field { margin-bottom: 18px; }
        .ob-field:last-child { margin-bottom: 0; }
        .ob-label {
          display: block;
          font-size: 12px; font-weight: 600;
          color: ${T.textLabel};
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }
        .ob-hint {
          font-size: 11.5px; color: ${T.textMuted};
          margin-top: 5px; line-height: 1.4;
        }

        /* Inputs */
        .ob-input {
          width: 100%; padding: 10px 13px;
          background: ${T.inputBg};
          border: 1.5px solid ${T.border};
          border-radius: 8px;
          color: ${T.text}; font-size: 14px;
          font-family: inherit; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          display: block;
        }
        .ob-input:focus {
          border-color: ${T.borderFocus};
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
          background: #fff;
        }
        .ob-input::placeholder { color: #b0bec5; }
        .ob-textarea { resize: vertical; min-height: 96px; }
        .ob-select { appearance: none; cursor: pointer; padding-right: 36px; }
        .ob-select option { background: #fff; color: ${T.text}; }
        .ob-select-arrow {
          position: absolute; right: 11px; top: 50%;
          transform: translateY(-50%);
          color: ${T.textMuted}; pointer-events: none;
        }

        /* Row 2 grid */
        .ob-row2 {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }

        /* Section label */
        .ob-section-label {
          font-size: 11px; font-weight: 700;
          color: ${T.textLabel}; letter-spacing: 0.5px;
          text-transform: uppercase; margin-bottom: 14px;
        }

        /* Buttons */
        .ob-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 8px;
          font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          border: none; transition: all 0.15s;
          white-space: nowrap;
        }
        .ob-btn-primary {
          background: ${T.primary}; color: #fff;
          box-shadow: 0 1px 3px rgba(37,99,235,0.25);
        }
        .ob-btn-primary:hover:not(:disabled) {
          background: ${T.primaryHover};
          box-shadow: 0 4px 12px rgba(37,99,235,0.35);
          transform: translateY(-1px);
        }
        .ob-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ob-btn-ghost {
          background: #fff; color: ${T.textMuted};
          border: 1.5px solid ${T.border};
        }
        .ob-btn-ghost:hover {
          background: ${T.pageBg};
          border-color: #cbd5e1;
          color: ${T.text};
        }
        .ob-btn-sm {
          padding: 7px 14px; font-size: 12px; border-radius: 7px;
        }
        .ob-btn-purple {
          background: ${T.purpleLight}; color: ${T.purple};
          border: 1.5px solid ${T.purpleBorder};
        }
        .ob-btn-purple:hover { background: #f3e8ff; }

        /* Errors */
        .ob-error-box {
          background: ${T.errorLight};
          border: 1px solid #fecaca;
          border-radius: 8px; padding: 12px 16px;
          margin-bottom: 18px;
        }
        .ob-error-item { color: ${T.error}; font-size: 13px; margin-bottom: 2px; }

        /* Success banner */
        .ob-success-banner {
          background: ${T.successLight};
          border: 1px solid ${T.successBorder};
          border-radius: 8px; padding: 10px 14px;
          margin-bottom: 16px; color: #065f46;
          font-size: 13px; display: flex; align-items: center; gap: 7px;
        }

        /* Navigation */
        .ob-nav {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 28px; padding-top: 20px;
          border-top: 1px solid ${T.border};
        }

        /* Tags (sector chips etc.) */
        .ob-tag {
          display: inline-block; padding: 6px 14px;
          border-radius: 20px; cursor: pointer;
          font-size: 12.5px; font-family: inherit;
          border: 1.5px solid ${T.border};
          background: #fff; color: ${T.textMuted};
          transition: all 0.15s; font-weight: 400;
        }
        .ob-tag:hover { border-color: #93c5fd; color: ${T.primary}; }
        .ob-tag.ob-tag-sel {
          background: ${T.primaryLight}; color: ${T.primary};
          border-color: ${T.primaryBorder}; font-weight: 600;
        }

        /* Tone cards */
        .ob-tone-card {
          padding: 14px; border-radius: 10px; cursor: pointer;
          background: #f8fafc; border: 1.5px solid ${T.border};
          color: ${T.textMuted}; text-align: left;
          font-family: inherit; transition: all 0.15s;
        }
        .ob-tone-card:hover { border-color: #93c5fd; }
        .ob-tone-card.ob-tone-sel {
          background: ${T.primaryLight};
          border-color: ${T.primary}; color: ${T.primary};
        }

        /* Number badge */
        .ob-num-badge {
          width: 26px; height: 26px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .ob-num-blue { background: #dbeafe; color: ${T.primary}; }
        .ob-num-red  { background: #fee2e2; color: ${T.error}; }

        /* Completion score circle */
        .ob-score-ring { display: flex; flex-direction: column; align-items: center; }

        /* WA preview */
        .ob-wa-preview {
          background: #ece5dd;
          border-radius: 12px; padding: 16px;
          border: 1px solid #d4c9c0;
        }
        .ob-wa-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px; padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .ob-wa-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg,#25d366,#128c7e);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .ob-wa-bubble {
          background: #dcf8c6;
          border-radius: 2px 14px 14px 14px;
          padding: 12px 14px; max-width: 88%;
          font-size: 13px; color: #111;
          line-height: 1.6;
        }
        .ob-wa-time { font-size: 11px; color: #888; margin-top: 6px; }

        /* ── Mobile ────────────────────────────────────────────────────── */
        @media (max-width: 640px) {
          /* Hide step bar on mobile */
          .ob-stepbar-wrap { display: none; }

          /* Show mobile progress */
          .ob-mobile-progress {
            display: block;
            background: ${T.headerBg};
            border-bottom: 1px solid ${T.border};
            padding: 12px 16px;
          }
          .ob-mobile-progress-info {
            display: flex; justify-content: space-between;
            align-items: center; margin-bottom: 8px;
          }
          .ob-mobile-step-title {
            font-size: 13px; font-weight: 600; color: ${T.text};
          }
          .ob-mobile-step-count {
            font-size: 12px; color: ${T.textMuted};
          }
          .ob-mobile-bar-track {
            height: 4px; background: ${T.border}; border-radius: 2px;
          }
          .ob-mobile-bar-fill {
            height: 100%; background: ${T.primary};
            border-radius: 2px; transition: width 0.4s ease;
          }

          /* Main padding */
          .ob-main { padding: 20px 16px 80px; }
          .ob-step-title-text { font-size: 19px; }
          .ob-header-inner { padding: 12px 16px; }

          /* Row2 → single column */
          .ob-row2 { grid-template-columns: 1fr !important; gap: 0; }

          /* Tone grid → 1 col on narrow */
          .ob-tone-grid { grid-template-columns: 1fr 1fr !important; gap: 8px; }

          /* Card padding */
          .ob-card, .ob-card-blue, .ob-card-green { padding: 16px; }

          /* Nav buttons full width on mobile */
          .ob-nav { flex-direction: column-reverse; gap: 10px; }
          .ob-nav > div, .ob-btn-primary { width: 100%; justify-content: center; }
          .ob-btn-ghost { width: 100%; justify-content: center; }
        }

        @keyframes ob-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1Company({ company, setCompany, analyzing, analyzeErr, onAnalyze, onTemplate, profileLoaded }: {
  company: Company; setCompany: React.Dispatch<React.SetStateAction<Company>>
  analyzing: boolean; analyzeErr: string; onAnalyze: () => void; onTemplate: () => void; profileLoaded: boolean
}) {
  const set = (k: keyof Company) => (v: string) => setCompany(p => ({ ...p, [k]: v }))
  const tmpl = !!TEMPLATES[company.sector]

  return (
    <div>
      {profileLoaded && (
        <div className="ob-success-banner">
          <Check size={15} /> Mevcut profiliniz yüklendi. Düzenleyip devam edebilirsiniz.
        </div>
      )}

      {/* AI fill */}
      <div className="ob-card-blue">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <Sparkles size={14} color="#2563eb" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', letterSpacing: 0.4, textTransform: 'uppercase' as const }}>
            AI ile Otomatik Doldur
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#3b5bdb', margin: '0 0 12px' }}>
          Web sitenizi girin — AI şirket adı, sektör, ürün bilgilerini otomatik analiz eder.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          <input
            className="ob-input"
            style={{ flex: '1 1 180px', minWidth: 0, background: '#fff' }}
            placeholder="https://sirketiniz.com"
            value={company.website}
            onChange={e => setCompany(p => ({ ...p, website: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onAnalyze()}
          />
          <button
            className="ob-btn ob-btn-primary"
            onClick={onAnalyze}
            disabled={analyzing || !company.website.trim()}
            style={{ flexShrink: 0 }}
          >
            {analyzing
              ? <><Loader2 size={14} style={{ animation: 'ob-spin 1s linear infinite' }} /> Analiz ediliyor...</>
              : <><Globe size={14} /> Analiz Et</>
            }
          </button>
        </div>
        {analyzeErr && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{analyzeErr}</div>}
      </div>

      <div className="ob-card">
        <Field label="Şirket Adı" required>
          <Inp value={company.name} onChange={set('name')} placeholder="Örn: Özkan Tekstil A.Ş." />
        </Field>

        <Field label="Sektör" required>
          <Sel value={company.sector} onChange={set('sector')} options={SECTORS} placeholder="Sektör seçin..." />
        </Field>

        {tmpl && (
          <div className="ob-card-purple">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>Hazır şablon mevcut</div>
              <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>{company.sector} sektörü için tüm adımları dolduracak</div>
            </div>
            <button className="ob-btn ob-btn-purple ob-btn-sm" onClick={onTemplate}>
              <Star size={12} fill="currentColor" /> Şablon Yükle
            </button>
          </div>
        )}

        <div className="ob-row2">
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

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2Product({ product, setProduct }: { product: Product; setProduct: React.Dispatch<React.SetStateAction<Product>> }) {
  const set = (k: keyof Product) => (v: any) => setProduct(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="ob-card">
        <Field label="Ürün / Hizmet Adı" required>
          <Inp value={product.name} onChange={set('name')} placeholder="Örn: CRM Yazılımı, İnşaat Hizmetleri, Toptan Tekstil..." />
        </Field>
        <Field label="Açıklama" required hint={`${product.description.length} karakter — AI sisteminiz bu metni kullanarak müşterilerle konuşacak`}>
          <Txta value={product.description} onChange={set('description')} minH={110}
            placeholder="Ne iş yapıyorsunuz? Müşterilerinize ne sağlıyorsunuz? Net ve ikna edici yazın." />
        </Field>
        <div className="ob-row2">
          <Field label="Fiyat Aralığı">
            <Inp value={product.price_range} onChange={set('price_range')} placeholder="2.000-10.000 TL/ay" />
          </Field>
          <Field label="Teslimat Süresi">
            <Inp value={product.delivery_time} onChange={set('delivery_time')} placeholder="1-3 iş günü" />
          </Field>
        </div>
      </div>

      <div className="ob-card">
        <div className="ob-section-label">3 Temel Avantaj</div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div className="ob-num-badge ob-num-blue">{i + 1}</div>
            <input
              className="ob-input"
              style={{ flex: 1 }}
              placeholder={['%40 daha az manuel iş', '24 saatte kurulum ve eğitim', '7/24 teknik destek'][i]}
              value={product.advantages[i] || ''}
              onChange={e => {
                const adv = [...product.advantages]; adv[i] = e.target.value; set('advantages')(adv)
              }}
            />
          </div>
        ))}
      </div>

      <div className="ob-card">
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

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3Target({ target, setTarget }: { target: Target; setTarget: React.Dispatch<React.SetStateAction<Target>> }) {
  const set = (k: keyof Target) => (v: any) => setTarget(p => ({ ...p, [k]: v }))
  const toggle = (s: string) => {
    const cur = target.sectors || []
    setTarget(p => ({ ...p, sectors: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] }))
  }

  return (
    <div>
      <div className="ob-card">
        <div className="ob-section-label">Hedef Sektörler</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SECTORS.map(s => {
            const sel = (target.sectors || []).includes(s)
            return <button key={s} className={`ob-tag${sel ? ' ob-tag-sel' : ''}`} onClick={() => toggle(s)}>{s}</button>
          })}
        </div>
      </div>

      <div className="ob-card">
        <div className="ob-row2">
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

      <div className="ob-card">
        <div className="ob-section-label">Hedef Müşterinin 3 Temel Sorunu</div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14, marginTop: -4 }}>
          AI sisteminiz bu sorunları vurgulayarak konuşma açacak.
        </p>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div className="ob-num-badge ob-num-red">{i + 1}</div>
            <input
              className="ob-input"
              style={{ flex: 1 }}
              placeholder={['Manuel süreçler çok zaman alıyor', 'Proje gecikmesi ve maliyet aşımı', 'Müşteri takibi yetersiz'][i]}
              value={target.pain_points[i] || ''}
              onChange={e => {
                const pts = [...(target.pain_points || ['', '', ''])]; pts[i] = e.target.value; set('pain_points')(pts)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

function Step4Style({ salesStyle, setSalesStyle, preview }: { salesStyle: SalesStyle; setSalesStyle: React.Dispatch<React.SetStateAction<SalesStyle>>; preview: string }) {
  const set = (k: keyof SalesStyle) => (v: string) => setSalesStyle(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="ob-card">
        <Field label="AI Temsilci Adı" hint="Müşteriye bu isimle tanışacak">
          <Inp value={salesStyle.agent_name} onChange={set('agent_name')} placeholder="Örn: Ayşe, Mert, Alex" />
        </Field>
      </div>

      <div className="ob-card">
        <div className="ob-section-label">Konuşma Tonu</div>
        <div className="ob-tone-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {TONES.map(t => (
            <button key={t.key} className={`ob-tone-card${salesStyle.tone === t.key ? ' ob-tone-sel' : ''}`} onClick={() => set('tone')(t.key)}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="ob-card">
        <Field label="Konuşma Açılış Cümlesi" hint="[AD] → temsilci adı, [ŞİRKET] → şirket adınız">
          <Txta value={salesStyle.opening_line} onChange={set('opening_line')} minH={88}
            placeholder="Merhaba, [AD] [ŞİRKET]'den arıyorum. Kısa bir bilgi verebilir miyim?" />
        </Field>
        <Field label="Kullanılmayacak Kelimeler">
          <Inp value={salesStyle.avoid_words} onChange={set('avoid_words')} placeholder="yapay zeka, robot, veri toplama (virgülle ayırın)" />
        </Field>
      </div>

      {/* WA Preview */}
      <div className="ob-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Phone size={14} color="#25d366" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
            Örnek WhatsApp Mesajı
          </span>
        </div>
        <div className="ob-wa-preview">
          <div className="ob-wa-header">
            <div className="ob-wa-avatar">
              {salesStyle.agent_name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{salesStyle.agent_name || 'AI Temsilci'}</div>
              <div style={{ fontSize: 11, color: '#25d366' }}>Çevrimiçi</div>
            </div>
          </div>
          <div className="ob-wa-bubble">
            {preview || 'Ton seçin veya açılış cümlesi yazın...'}
          </div>
          <div className="ob-wa-time">
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 5 ───────────────────────────────────────────────────────────────────

function Step5FAQ({ faq, setFaq, objections, setObjections }: { faq: FAQ[]; setFaq: React.Dispatch<React.SetStateAction<FAQ[]>>; objections: FAQ[]; setObjections: React.Dispatch<React.SetStateAction<FAQ[]>> }) {
  return (
    <div>
      <div className="ob-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="ob-section-label" style={{ margin: 0 }}>Sık Sorulan Sorular</div>
          <button className="ob-btn ob-btn-ghost ob-btn-sm" onClick={() => setFaq(f => [...f, { q: '', a: '' }])}>
            <Plus size={13} /> Ekle
          </button>
        </div>
        {faq.map((f, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>Soru {i + 1}</span>
              {faq.length > 1 && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }} onClick={() => setFaq(f => f.filter((_, j) => j !== i))}><X size={14} /></button>}
            </div>
            <input className="ob-input" style={{ marginBottom: 8, background: '#fff' }} placeholder="Müşteri ne soruyor?" value={f.q} onChange={e => setFaq(faq => faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
            <textarea className="ob-input ob-textarea" style={{ minHeight: 64, background: '#fff' }} placeholder="AI temsilci ne cevap vermeli?" value={f.a} onChange={e => setFaq(faq => faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
          </div>
        ))}
      </div>

      <div className="ob-card">
        <div className="ob-section-label" style={{ marginBottom: 6 }}>İtiraz Karşılama</div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, marginTop: 0 }}>
          Müşteri bu itirazları dile getirdiğinde AI temsilci ne söyleyecek?
        </p>
        {objections.map((obj, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>"{obj.q}"</div>
            <textarea className="ob-input ob-textarea" style={{ minHeight: 64, background: '#fff' }} placeholder="AI temsilci bunu duyduğunda ne söylemeli?" value={obj.a} onChange={e => setObjections(o => o.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 6 ───────────────────────────────────────────────────────────────────

function Step6Done({ company, product, salesStyle, score, saving, onFinish }: {
  company: Company; product: Product; salesStyle: SalesStyle
  score: number; saving: boolean; onFinish: () => void
}) {
  const agent = salesStyle.agent_name || 'AI Temsilci'
  const co    = company.name || 'Şirketiniz'
  const scoreColor = score >= 80 ? '#059669' : score >= 55 ? '#d97706' : '#dc2626'
  const scoreLabel = score >= 80 ? 'Mükemmel profil' : score >= 55 ? 'İyi — biraz daha doldurun' : 'Eksik — profili tamamlayın'

  return (
    <div>
      {/* Score */}
      <div className="ob-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 14 }}>
            <svg viewBox="0 0 96 96" width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="7" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>/100</span>
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>{scoreLabel}</div>
        </div>
        <p style={{ margin: '0', fontSize: 14, color: '#64748b', lineHeight: 1.8 }}>
          <strong style={{ color: '#0f172a' }}>{agent}</strong> artık{' '}
          <strong style={{ color: '#0f172a' }}>{co}</strong> adına<br />
          profesyonel satış görüşmeleri yapacak.
        </p>
      </div>

      {/* Summary */}
      <div className="ob-card">
        <div className="ob-section-label">Kurulum Özeti</div>
        {[
          { label: 'Şirket', value: co },
          { label: 'Sektör', value: company.sector || '—' },
          { label: 'Şehir', value: company.city || '—' },
          { label: 'Ürün/Hizmet', value: product.name || '—' },
          { label: 'AI Temsilci', value: agent },
          { label: 'Satış Tonu', value: { professional: 'Profesyonel', friendly: 'Samimi', consultative: 'Danışmancı', direct: 'Direkt' }[salesStyle.tone] || salesStyle.tone },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* What's ready */}
      <div className="ob-card-green">
        <div className="ob-section-label" style={{ color: '#065f46', marginBottom: 14 }}>Sisteminiz Hazır</div>
        {[
          'AI Satış Temsilciniz aktif ve eğitildi',
          'WhatsApp & Arama kampanyaları açılabilir',
          'Lead scraping sonuçları kişiselleştirilecek',
          'Rakip analizi sektörünüze göre yapılacak',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #bbf7d0' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={11} color="#059669" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, color: '#065f46' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="ob-btn ob-btn-primary"
        onClick={onFinish}
        disabled={saving}
        style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, borderRadius: 10, marginTop: 8 }}
      >
        {saving
          ? <><Loader2 size={16} style={{ animation: 'ob-spin 1s linear infinite' }} /> Dashboard açılıyor...</>
          : <>Dashboard&apos;a Git <ArrowRight size={16} /></>
        }
      </button>
    </div>
  )
}
